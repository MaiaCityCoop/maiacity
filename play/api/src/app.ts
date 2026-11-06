// play's API (play/SPEC.md §7): one handler, `app({ db, store }).fetch(req)`, so the tests call it without a port.
// The site and the API share an origin (play.maia.city, /api behind Caddy), so there is no CORS. A visitor gets 401
// everywhere but the health check and the passkey ceremonies.
import type { BlobStore } from "./blobs";
import { HASH } from "./hash";
import { UUID } from "./uuid";
import type { Db } from "./pg";
import { COOP, Denied, meOf, must } from "./access";
import { SANDBOX } from "./ids";
import { assetOf, catalogOf, configOf, fileOf, listAssets, NotFound, versionOf } from "./assets";
import { mcp } from "./mcp";
import { adminByToken, listTokens, makeToken, revokeToken } from "./tokens";
import { clearCookie, humanIdFrom, loginFinish, loginOptions, registerFinish, registerOptions, sessionCookie, tokenFor } from "./auth";
import { inviteOpen, listMembers, makeInvite, MemberError, removeMember, renameMember, renameSelf, setLevel } from "./members";
import { listTables, readTable, TableError } from "./tables";
import { proposedState, SandboxError } from "./sandboxes";
import { decideAny, propose, ProposalError, reviewOf } from "./proposals";
import type { GitHub } from "./ship";
import { intentIdOf, WorkError } from "./work";
import { intentOf, IntentError, intentReady, listIntents, type IntentVerdict } from "./intents";
import { clientOf, perMinute, Rate, costly } from "./limits";
import { listStories, storyAtStep, storyHistory, storyOf, StoryError } from "./stories";
import { labelFile, listLibrary } from "./library";
import { AssetDocError, assetHistory, recipeAtStep } from "./assetdocs";
import { factoryHistory, factoryOf, FactoryError, listFactories } from "./factories";
import { gameConfigHistory, gameConfigOf, GameConfigError, listGameConfigs } from "./gameconfigs";
import { authorOf, listAuthors, listArtifacts, ArtifactError, artifactOf } from "./artifacts";

type Handler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;
type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init);

/**
 * The read-only routes an admin's MCP token also opens (Samuel 2026-11-03), so an agent can load a sandbox in its own
 * browser and film it: who it is, the catalog, the files, a sandbox's config and the assets — what a traveler may read,
 * nothing more. Every other route (members, tokens, intents, stories, the database, anything that writes) still wants
 * a session; the MCP server takes the token as before.
 */
const READ_BY_TOKEN = [/^\/api\/me$/, /^\/api\/catalog$/, /^\/api\/files\/[0-9a-f]{64}$/, /^\/api\/sandboxes\/[0-9a-f-]{36}\/config$/, /^\/api\/assets(\/[^/]+){0,4}$/];
async function body(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function app({ db, store, rate = new Rate(perMinute(process.env.API_RATE)), github = null }: { db: Db; store: BlobStore; rate?: Rate; github?: GitHub | null }) {
  const routes: Route[] = [];
  const on = (method: string, path: string, handler: Handler) => {
    const keys: string[] = [];
    const pattern = new RegExp(`^${path.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), "([^/]+)"))}$`);
    routes.push({ method, pattern, keys, handler });
  };
  // who a request is: its session; or, on the world's read-only routes, an admin's MCP token (Samuel 2026-11-03: an
  // agent walks and films a sandbox in its own browser, as its admin, reading only what a traveler may read)
  const me = async (req: Request) => {
    const human = humanIdFrom(req);
    if (human || req.method !== "GET" || !READ_BY_TOKEN.some((r) => r.test(new URL(req.url).pathname))) return meOf(db, human);
    return adminByToken(db, req);
  };
  const signedIn = (h: { id: string; name: string }, extra: unknown = {}) =>
    json({ id: h.id, name: h.name, ...(extra as object) }, { headers: { "Set-Cookie": sessionCookie(tokenFor(h.id)) } });

  on("GET", "/api/health", () => json({ ok: true }));
  // how many build Maia City: the number alone, public, for the website's manifesto (maia.city, website/src/lib/FounderCounter.svelte)
  on("GET", "/api/founders", async () => {
    const { rows } = await db.query<{ n: string }>(`SELECT count(*) AS n FROM play.memberships WHERE coop_id = $1`, [COOP]);
    return json({ count: Number(rows[0].n) }, { headers: { "Access-Control-Allow-Origin": "https://maia.city", "Cache-Control": "public, max-age=30" } });
  });

  // ---- who
  on("POST", "/api/passkey/register/options", async (req) => {
    const b = await body(req);
    const r = await registerOptions(db, b?.name, b?.invite);
    return r.ok ? json(r.value) : json({ error: r.error }, { status: 400 });
  });
  on("POST", "/api/passkey/register/finish", async (req) => {
    const r = await registerFinish(db, await body(req));
    return r.ok ? signedIn(r.value, { level: "traveler" }) : json({ error: r.error }, { status: 400 });
  });
  on("POST", "/api/passkey/login/options", async () => json(await loginOptions()));
  on("POST", "/api/passkey/login/finish", async (req) => {
    const r = await loginFinish(db, await body(req));
    return r.ok ? signedIn(r.value) : json({ error: r.error }, { status: 400 });
  });
  on("POST", "/api/signout", () => json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } }));
  on("GET", "/api/me", async (req) => {
    const m = await me(req);
    if (!m) return json({ error: "Please sign in first." }, { status: 401 });
    return json({ id: m.id, name: m.name, level: m.level, may: m.rule, founder: m.founder_number == null ? null : Number(m.founder_number) });
  });

  // ---- assets
  on("GET", "/api/assets", async (req) => {
    must(await me(req), "read", "assets");
    return json(await listAssets(db, new URL(req.url).searchParams.get("group") ?? undefined));
  });
  on("GET", "/api/assets/:id", async (req, p) => {
    must(await me(req), "read", "assets");
    if (!UUID.test(p.id)) throw new NotFound("An asset is named by its id, a UUID.");
    return json(await assetOf(db, p.id));
  });
  // an asset's history, step by step (its Loro document, play/SPEC.md §4.4), and the recipe file it builds at any step,
  // kept among play's files by its hash for the asset viewer's history bar: admins only (before /:id/:v, which they'd match)
  on("GET", "/api/assets/:id/history", async (req, p) => {
    if (!UUID.test(p.id)) throw new NotFound("An asset is named by its id, a UUID.");
    const b = new URL(req.url).searchParams.get("draft");
    return json(await assetHistory(db, store, await me(req), p.id, b == null ? {} : { branch: Number(b) }));
  });
  on("GET", "/api/assets/:id/steps/:seq/recipe", async (req, p) => {
    if (!UUID.test(p.id)) throw new NotFound("An asset is named by its id, a UUID.");
    return json(await recipeAtStep(db, store, await me(req), p.id, Number(p.seq)));
  });
  on("GET", "/api/assets/:id/:v", async (req, p) => {
    must(await me(req), "read", "assets");
    if (!UUID.test(p.id)) throw new NotFound("An asset is named by its id, a UUID.");
    const n = Number(p.v);
    if (!Number.isInteger(n) || n < 1) throw new NotFound(`${p.v} is not a version.`);
    return json(await versionOf(db, p.id, n));
  });
  on("GET", "/api/catalog", async (req) => {
    must(await me(req), "read", "assets");
    return json(await catalogOf(db), { headers: { "Cache-Control": "private, max-age=60" } });
  });
  on("GET", "/api/files/:hash", async (req, p) => {
    must(await me(req), "read", "assets");
    if (!HASH.test(p.hash)) throw new NotFound("That is not a file's hash.");
    const f = await fileOf(db, p.hash);
    if (!f) throw new NotFound("There is no such file.");
    // served from here whether the store is the folder or the bucket: never a redirect to the bucket, so a file keeps
    // the headers below (code as plain text, nothing sniffed or run as a document) and needs no CORS on the bucket
    const bytes = await store.get(p.hash);
    if (!bytes) throw new NotFound("The file's bytes are missing.");
    // code (recipes and their sources, accepted or only proposed) is served as plain text, never as script the page's
    // origin could run: it runs only in the asset box, which gets its text by fetch, held to its hash. Media keep their
    // type (covers, sounds), and nothing served here is sniffed or may run as a document.
    const media = /^(image|audio|video)\//.test(f.media_type) ? f.media_type : "text/plain; charset=utf-8";
    const headers: Record<string, string> = {
      "Content-Type": media, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=31536000, immutable", ETag: `"${p.hash}"`, "Accept-Ranges": "bytes",
    };
    // a part of it, by its bytes: a sound starts playing where it is asked to (a loop begun anywhere in it) without the
    // whole recording coming down first
    const range = rangeOf(req.headers.get("range"), bytes.length);
    if (range === "unsatisfiable") return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
    if (range) {
      const [from, to] = range;
      return new Response(Buffer.from(bytes.subarray(from, to + 1)), { status: 206, headers: { ...headers, "Content-Range": `bytes ${from}-${to}/${bytes.length}` } });
    }
    return new Response(Buffer.from(bytes), { headers });
  });

  // ---- sandboxes
  on("GET", "/api/sandboxes/:id/config", async (req, p) => {
    const m = must(await me(req), "read", "sandboxes");
    // the Factories are Maia City's admins' alone for now (Samuel 2026-11-03)
    if (!UUID.test(p.id)) throw new NotFound("A sandbox is named by its id, a UUID.");
    if (p.id === SANDBOX.factories && m.level !== "admin") throw new Denied("Only Maia City's admins may open the Factories, for now.");
    // as an intent's work at Proposal would make it (admins, ./sandboxes.ts), to walk it before deciding; `proposal`, the
    // name it had before an intent and its proposal were one record, is read as the intent it is now
    const q = new URL(req.url).searchParams;
    const intent = q.get("intent") ?? q.get("proposal");
    if (intent) return json(await configOf(db, p.id, await proposedState(db, m, p.id, intent)));
    return json(await configOf(db, p.id));
  });

  // ---- intents (./intents.ts, ./work.ts): the one record on the board, Idea → Specify → Prototype → Proposal → (Ship →)
  // Accepted or Archived; added, specified and prototyped by agents over MCP, its work (an asset's version here; the rest
  // over MCP) proposed by putting it at Proposal, decided by its admins here: a spec approved (Specify → Prototype) or
  // sent back, its work at Proposal accepted (applied) or archived, its code accepted and shipped (./ship.ts: its pull
  // request merged into main at once, followed to production in Ship), or brought back
  on("GET", "/api/intents", async (req) => {
    const q = new URL(req.url).searchParams;
    const s = q.get("stage");
    return json(await listIntents(db, await me(req), s ? s.split(",") : undefined, q.get("work") ?? undefined));
  });
  on("GET", "/api/intents/:id", async (req, p) => json(await intentOf(db, await me(req), p.id, reviewOf)));
  // to propose is to put an intent at Proposal: the one named (held to its gate), or a new one of its own
  on("POST", "/api/intents", async (req) => {
    const b = await body(req);
    const m = await me(req);
    if (b?.intent !== undefined && b?.intent !== null && b?.intent !== "") b.intent = (await intentReady(db, m, b.intent)).id;
    return json(await propose(db, store, m, b), { status: 201 });
  });
  on("POST", "/api/intents/:id/:verdict", async (req, p) => {
    if (!["approve", "respecify", "accept", "archive", "reject", "reopen"].includes(p.verdict)) throw new NotFound("No such decision.");
    return json(await decideAny(db, store, await me(req), p.id, p.verdict as IntentVerdict | "archive", github));
  });
  // a proposal's old address: a proposal and its intent are one record now (migration 0029), so its id answers as the
  // intent it is (play.proposal_ids), and nothing else is served here
  on("GET", "/api/proposals/:id", async (_req, p) => {
    const id = await intentIdOf(db, p.id);
    if (!id) throw new NotFound("There is no such intent: a proposal is an intent now (/api/intents).");
    return new Response(null, { status: 308, headers: { location: `/api/intents/${id}` } });
  });

  // ---- the coop
  on("GET", "/api/members", async (req) => json(await listMembers(db, await me(req))));
  on("POST", "/api/members/:id/level", async (req, p) => json(await setLevel(db, await me(req), p.id, `${(await body(req))?.level ?? ""}`)));
  on("POST", "/api/me/name", async (req) => json(await renameSelf(db, await me(req), (await body(req))?.name)));
  on("POST", "/api/members/:id/name", async (req, p) => json(await renameMember(db, await me(req), p.id, (await body(req))?.name)));
  on("DELETE", "/api/members/:id", async (req, p) => json(await removeMember(db, await me(req), p.id)));
  on("POST", "/api/invites", async (req) => json(await makeInvite(db, await me(req)), { status: 201 }));
  on("GET", "/api/invites/:code", async (req, p) => json({ open: await inviteOpen(db, p.code) }));

  // an admin's access tokens, for an agent over MCP (./tokens.ts), and play's MCP server itself (./mcp.ts): it reads the
  // assets and proposes, as the token's admin; no tool decides a proposal
  on("GET", "/api/tokens", async (req) => json(await listTokens(db, await me(req))));
  on("POST", "/api/tokens", async (req) => json(await makeToken(db, await me(req), (await body(req))?.name), { status: 201 }));
  on("DELETE", "/api/tokens/:id", async (req, p) => json(await revokeToken(db, await me(req), p.id)));
  const mcpServer = mcp({ db, store });
  on("POST", "/api/mcp", (req) => mcpServer(req));
  on("GET", "/api/mcp", (req) => mcpServer(req));

  // the admins' window into play's Postgres, read only, secrets hidden (./tables.ts)
  const admin = async (req: Request) => {
    const m = await me(req);
    if (!m) throw new Denied("Please sign in first.", 401);
    if (m.level !== "admin") throw new Denied("Only Maia City's admins may look into the database.");
    return m;
  };
  on("GET", "/api/tables", async (req) => (await admin(req), json(await listTables(db))));
  on("GET", "/api/tables/:name", async (req, p) => {
    await admin(req);
    const q = new URL(req.url).searchParams;
    return json(await readTable(db, p.name, Number(q.get("offset") ?? 0), Number(q.get("limit") ?? 50)));
  });

  // The Library (./library.ts): every image, video and recording play keeps, its label and where stories use it; admins
  // only. A label is only shown, so an admin renames it here; a file is named by its hash.
  on("GET", "/api/library", async (req) => {
    const q = new URL(req.url).searchParams;
    return json(await listLibrary(db, await me(req), { kind: q.get("kind"), q: q.get("q"), offset: Number(q.get("offset") ?? 0), limit: Number(q.get("limit") ?? 60) }));
  });
  on("POST", "/api/library/:hash/label", async (req, p) => json(await labelFile(db, await me(req), p.hash, (await body(req))?.label)));

  // Artifacts (./artifacts.ts, play/SPEC.md §4.13): every link from the net Maia City keeps, its title, description,
  // summary and authors, kept over MCP by avenMAIA (nothing here adds or edits one); admins only, read here
  on("GET", "/api/artifacts", async (req) => {
    const q = new URL(req.url).searchParams;
    return json(
      await listArtifacts(db, await me(req), {
        q: q.get("q"), author: q.get("author"), tag: q.get("tag"), kind: q.get("kind"), origin: q.get("origin"),
        offset: Number(q.get("offset") ?? 0), limit: Number(q.get("limit") ?? 50),
      }),
    );
  });
  on("GET", "/api/artifacts/:id", async (req, p) => json(await artifactOf(db, await me(req), p.id)));
  on("GET", "/api/authors", async (req) => json(await listAuthors(db, await me(req), { q: new URL(req.url).searchParams.get("q") })));
  on("GET", "/api/authors/:id", async (req, p) => json(await authorOf(db, await me(req), p.id)));

  // Stories, the admins' timeline player (./stories.ts): read here, at their head or an accepted version (?v=2); they
  // change only by proposal, over MCP, decided on the intents' board
  on("GET", "/api/stories", async (req) => json(await listStories(db, await me(req))));
  on("GET", "/api/stories/:id", async (req, p) => {
    const v = new URL(req.url).searchParams.get("v");
    return json(await storyOf(db, await me(req), p.id, v == null ? undefined : Number(v)));
  });
  // every step of a story's history (its Loro document, play/SPEC.md §4.4), and the story as it was at one, as JSON
  on("GET", "/api/stories/:id/history", async (req, p) => {
    const b = new URL(req.url).searchParams.get("draft");
    return json(await storyHistory(db, await me(req), p.id, b == null ? {} : { branch: Number(b) }));
  });
  on("GET", "/api/stories/:id/steps/:seq", async (req, p) => json(await storyAtStep(db, await me(req), p.id, Number(p.seq))));

  // the Factories (./factories.ts), admins only: each line a Loro document, read at its newest version, a version (?v=2),
  // a step of its history (?step=7) or as an intent's work at Proposal would make it (?intent=<id>); changed only so
  on("GET", "/api/factories", async (req) => json(await listFactories(db, await me(req))));
  on("GET", "/api/factories/:id", async (req, p) => {
    const q = new URL(req.url).searchParams;
    const num = (k: string) => (q.get(k) == null ? undefined : Number(q.get(k)));
    return json(await factoryOf(db, await me(req), p.id, { version: num("v"), step: num("step"), intent: q.get("intent") ?? q.get("proposal") ?? undefined }));
  });
  on("GET", "/api/factories/:id/history", async (req, p) => {
    const b = new URL(req.url).searchParams.get("draft");
    return json(await factoryHistory(db, await me(req), p.id, b == null ? {} : { branch: Number(b) }));
  });

  // the Game editor (./gameconfigs.ts), admins only: each of the game's configs a Loro document, read at its newest
  // version, a version (?v=2), a step (?step=7) or as an intent's work at Proposal would make it (?intent=<id>); changed
  // only so
  on("GET", "/api/game/configs", async (req) => json(await listGameConfigs(db, await me(req))));
  on("GET", "/api/game/configs/:id", async (req, p) => {
    const q = new URL(req.url).searchParams;
    const num = (k: string) => (q.get(k) == null ? undefined : Number(q.get(k)));
    return json(await gameConfigOf(db, await me(req), p.id, { version: num("v"), step: num("step"), intent: q.get("intent") ?? q.get("proposal") ?? undefined }));
  });
  on("GET", "/api/game/configs/:id/history", async (req, p) => {
    const b = new URL(req.url).searchParams.get("draft");
    return json(await gameConfigHistory(db, await me(req), p.id, b == null ? {} : { branch: Number(b) }));
  });

  async function fetch(req: Request, server?: unknown): Promise<Response> {
    if (costly(req) && !rate.allows(clientOf(req, server as any)))
      return json({ error: "Too many requests: try again in a minute." }, { status: 429, headers: { "Retry-After": "60" } });
    const path = new URL(req.url).pathname;
    let allowed: string[] = [];
    for (const r of routes) {
      const m = r.pattern.exec(path);
      if (!m) continue;
      if (r.method !== req.method) {
        allowed.push(r.method);
        continue;
      }
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      try {
        return await r.handler(req, params);
      } catch (e) {
        if (e instanceof Denied || e instanceof NotFound || e instanceof ProposalError || e instanceof WorkError || e instanceof IntentError || e instanceof MemberError || e instanceof TableError || e instanceof StoryError || e instanceof AssetDocError || e instanceof SandboxError || e instanceof FactoryError || e instanceof GameConfigError || e instanceof ArtifactError)
          return json({ error: e.message }, { status: (e as any).status });
        console.error(e);
        return json({ error: "Something went wrong on our side." }, { status: 500 });
      }
    }
    if (allowed.length) return json({ error: "Method not allowed." }, { status: 405, headers: { Allow: allowed.join(", ") } });
    return json({ error: "Not found." }, { status: 404 });
  }
  return { fetch };
}

/** the one byte range a Range header asks of a file of `size` bytes (inclusive), null for the whole file (no header, or
 * one asking several ranges or another unit), "unsatisfiable" for one that starts past its end */
export function rangeOf(header: string | null, size: number): [number, number] | null | "unsatisfiable" {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") {
    const n = Math.min(Number(m[2]), size);
    return n > 0 ? [size - n, size - 1] : "unsatisfiable";
  }
  const from = Number(m[1]);
  if (from >= size) return "unsatisfiable";
  const to = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  return to < from ? null : [from, to];
}
