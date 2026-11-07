// play's API (play/SPEC.md §7): one handler, `app({ db, store }).fetch(req)`, so the tests call it without a port.
// The site and the API share an origin (play.maia.city, /api behind Caddy), so there is no CORS. A visitor gets 401
// everywhere but the health check and the passkey ceremonies.
import type { BlobStore } from "./blobs";
import { HASH } from "./hash";
import { UUID } from "./uuid";
import type { Db } from "./pg";
import { admin, COOP, Denied, meOf, must } from "./access";
import { SANDBOX } from "./ids";
import { assetOf, catalogOf, configOf, listAssets, NotFound, versionOf } from "./assets";
import { fileFor, maskEdges, OwnerError } from "./owners";
import { mcp } from "./mcp";
import { adminByToken, listTokens, makeToken, markAvenbox, revokeToken } from "./tokens";
import { clearCookie, humanIdFrom, loginFinish, loginOptions, registerFinish, registerOptions, sessionCookie, tokenFor } from "./auth";
import { inviteOpen, listMembers, makeInvite, MemberError, removeMember, renameMember, renameSelf, setLevel } from "./members";
import { listTables, readTable, TableError } from "./tables";
import { layoutAt, proposedState, SandboxError } from "./sandboxes";
import { decideAny, docAt, docChanges, docHistory, listDocs, reviewOf, VersionError } from "./versioned";
import { runningCommit, shipWork, type GitHub } from "./ship";
import { NO_INTENT, WorkError } from "./work";
import { withdrawDoc } from "./withdraw";
import { INTENT_ADMINS, intentOf, IntentError, intentReady, listIntents, type IntentVerdict } from "./intents";
import { clientOf, perMinute, Rate, costly } from "./limits";
import { listStories, storyAt, storyOf, StoryError } from "./stories";
import { labelFile, listLibrary } from "./library";
import { AssetDocError, proposeAsset, recipeAt } from "./assetdocs";
import { SkillError } from "./skills";
import { authorOf, listAuthors, listArtifacts, ArtifactError, artifactOf } from "./artifacts";

type Handler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;
type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init);

/**
 * The read-only routes an admin's MCP token also opens (Samuel 2026-11-03), so an agent can load a sandbox in its own
 * browser and film it: who it is, the catalog, the files, a sandbox's config and the assets — what a traveler may read —
 * and the Library (Samuel 2026-11-07), where it finds a file by its label, still for admins only. Every other route
 * (members, tokens, intents, stories, the database, a Library label, anything that writes) still wants a session; the
 * MCP server takes the token as before.
 */
const READ_BY_TOKEN = [/^\/api\/me$/, /^\/api\/catalog$/, /^\/api\/files\/[0-9a-f]{64}$/, /^\/api\/sandboxes\/[0-9a-f-]{36}\/config$/, /^\/api\/assets(\/[^/]+){0,4}$/, /^\/api\/library$/];
async function body(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function app({ db, store, rate = new Rate(perMinute(process.env.API_RATE)), github = null, commit = runningCommit() }: { db: Db; store: BlobStore; rate?: Rate; github?: GitHub | null; commit?: string | null }) {
  // play's work held beside a pull request is accepted by the reconcile once its code is live (./ship.ts)
  shipWork.store = store;
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
  // the commit play runs (the image's PLAY_COMMIT, ./ship.ts runningCommit), public: what every code intent's stage is
  // held to (./ship.ts reconcile), and what play/avenbox/live-audit.ts reads; null where it was built without one
  on("GET", "/api/version", () => json({ commit }, { headers: { "Cache-Control": "no-store" } }));
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
    const m = must(await me(req), "read", "assets");
    return json(await listAssets(db, new URL(req.url).searchParams.get("group") ?? undefined, m));
  });
  on("GET", "/api/assets/:id", async (req, p) => {
    const m = must(await me(req), "read", "assets");
    if (!UUID.test(p.id)) throw new NotFound("An asset is named by its id, a UUID.");
    return json(await assetOf(db, p.id, m));
  });
  // the recipe file an asset builds at an edit of its history (?edit=<seq>) or at an intent's variant (?intent=<id>),
  // kept among play's files by its hash for the History tab: admins only (before /:id/:v, which it would match)
  on("GET", "/api/assets/:id/recipe", async (req, p) => {
    if (!UUID.test(p.id)) throw new NotFound("An asset is named by its id, a UUID.");
    const q = new URL(req.url).searchParams;
    return json(await recipeAt(db, store, await me(req), p.id, q.get("intent") ? { intent: q.get("intent")! } : { edit: Number(q.get("edit")) }));
  });
  on("GET", "/api/assets/:id/:v", async (req, p) => {
    const m = must(await me(req), "read", "assets");
    if (!UUID.test(p.id)) throw new NotFound("An asset is named by its id, a UUID.");
    const n = Number(p.v);
    if (!Number.isInteger(n) || n < 1) throw new NotFound(`${p.v} is not a version.`);
    return json(await versionOf(db, p.id, n, m));
  });
  on("GET", "/api/catalog", async (req) => {
    const m = must(await me(req), "read", "assets");
    return json(await catalogOf(db, m), { headers: { "Cache-Control": "private, max-age=60" } });
  });
  on("GET", "/api/files/:hash", async (req, p) => {
    const m = must(await me(req), "read", "assets");
    if (!HASH.test(p.hash)) throw new NotFound("That is not a file's hash.");
    // (another's private file is as one never kept: ./owners.ts)
    const f = await fileFor(db, m, p.hash);
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
    // as an intent's work at Proposal would make it (admins, ./sandboxes.ts), to walk it before deciding
    const q = new URL(req.url).searchParams;
    const intent = q.get("intent");
    if (intent) return json(await configOf(db, p.id, await proposedState(db, m, p.id, intent)));
    // at a version or an edit of its layout's history (admins, its History on /sandboxes/<uuid>/)
    const v = q.get("v"), edit = q.get("edit");
    if (v || edit) return json(await configOf(db, p.id, await layoutAt(db, m, p.id, v ? { version: Number(v) } : { edit: Number(edit) })));
    return json(await configOf(db, p.id));
  });

  // ---- intents (./intents.ts, ./work.ts): the one record on the board, Idea → Specify → Build → Proposal → (Ship →)
  // Accepted or Archived; added, specified and built by agents over MCP, its work (an asset's version here; the rest
  // over MCP) proposed by putting it at Proposal, decided by its admins here: a spec approved (Specify → Build) or
  // sent back, its work at Proposal accepted (applied) or archived, its code accepted and shipped (./ship.ts: its pull
  // request merged into main at once, followed to production in Ship), or brought back
  on("GET", "/api/intents", async (req) => {
    const q = new URL(req.url).searchParams;
    const s = q.get("stage");
    const m = await me(req);
    // (an edge to an intent another's private work keeps is shown as "a private intent": ./owners.ts)
    return json(await maskEdges(db, m, await listIntents(db, m, s ? s.split(",") : undefined, q.get("work") ?? undefined)));
  });
  on("GET", "/api/intents/:id", async (req, p) => {
    const m = await me(req);
    return json(await maskEdges(db, m, await intentOf(db, m, p.id, reviewOf)));
  });
  // to propose is to put an intent at Proposal: the one named, held to its gate (no work without an intent)
  on("POST", "/api/intents", async (req) => {
    const b = await body(req);
    const m = await me(req);
    // (who may propose first, then what: an admin's, for an intent)
    if (b?.intent === undefined || b?.intent === null || b?.intent === "") {
      admin(m, INTENT_ADMINS);
      throw new IntentError(NO_INTENT, 400);
    }
    b.intent = (await intentReady(db, m, b.intent)).id;
    return json(await proposeAsset(db, store, m, b), { status: 201 });
  });
  // one document taken out of its work by an admin on the board's review, with its reason (./withdraw.ts, intent ee0a7455)
  on("POST", "/api/intents/:id/withdraw", async (req, p) => {
    const b = await body(req);
    const m = await me(req);
    return json(await maskEdges(db, m, await withdrawDoc(db, m, p.id, b?.doc, b?.reason, "site")));
  });
  on("POST", "/api/intents/:id/:verdict", async (req, p) => {
    if (!["approve", "accept", "archive", "reject", "reopen"].includes(p.verdict)) throw new NotFound("No such decision.");
    const m = await me(req);
    return json(await maskEdges(db, m, await decideAny({ db, store }, m, p.id, p.verdict as IntentVerdict | "archive", github, commit)));
  });

  // one version control (./versioned.ts, play/SPEC.md "Version control"), admins only: every document play versions,
  // by its UUID, read at Main's newest version, a version (?v=2), an edit (?edit=7) or an intent's variant
  // (?intent=<id>); its history (edits, versions, variants; ?variant=<n> for one variant's own edits); and what an edit
  // or an intent variant changes against what it grew from (/changes?edit= or ?variant=). Changed only by proposal.
  on("GET", "/api/docs", async (req) => json(await listDocs(db, await me(req), new URL(req.url).searchParams.get("kind") ?? undefined)));
  on("GET", "/api/docs/:id", async (req, p) => {
    const q = new URL(req.url).searchParams;
    const num = (k: string) => (q.get(k) == null ? undefined : Number(q.get(k)));
    return json(await docAt({ db, store }, await me(req), p.id, { version: num("v"), edit: num("edit"), intent: q.get("intent") ?? undefined, breed: num("breed") }));
  });
  on("GET", "/api/docs/:id/history", async (req, p) => {
    const v = new URL(req.url).searchParams.get("variant");
    return json(await docHistory({ db, store }, await me(req), p.id, v == null ? {} : { variant: Number(v) }));
  });
  on("GET", "/api/docs/:id/changes", async (req, p) => {
    const q = new URL(req.url).searchParams;
    const num = (k: string) => (q.get(k) == null ? undefined : Number(q.get(k)));
    return json(await docChanges({ db, store }, await me(req), p.id, { edit: num("edit"), variant: num("variant") }));
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
  on("POST", "/api/tokens/:id/avenbox", async (req, p) => json(await markAvenbox(db, await me(req), p.id, (await body(req))?.avenbox)));
  on("DELETE", "/api/tokens/:id", async (req, p) => json(await revokeToken(db, await me(req), p.id)));
  const mcpServer = mcp({ db, store, github, commit });
  on("POST", "/api/mcp", (req) => mcpServer(req));
  on("GET", "/api/mcp", (req) => mcpServer(req));

  // the admins' window into play's Postgres, read only, secrets hidden (./tables.ts)
  const tablesAdmin = async (req: Request) => admin(await me(req), "Only Maia City's admins may look into the database.");
  on("GET", "/api/tables", async (req) => json(await listTables(db, await tablesAdmin(req))));
  on("GET", "/api/tables/:name", async (req, p) => {
    const m = await tablesAdmin(req);
    const q = new URL(req.url).searchParams;
    return json(await readTable(db, m, p.name, Number(q.get("offset") ?? 0), Number(q.get("limit") ?? 50)));
  });

  // The Library (./library.ts): every image, video and recording play keeps, its label and where stories use it; admins
  // only. A label is only shown, so an admin renames it here; a file is named by its hash.
  on("GET", "/api/library", async (req) => {
    const q = new URL(req.url).searchParams;
    return json(
      await listLibrary(db, await me(req), { kind: q.get("kind"), q: q.get("q"), offset: Number(q.get("offset") ?? 0), limit: Number(q.get("limit") ?? 60), library: q.get("library") ?? undefined }),
    );
  });
  on("POST", "/api/library/:hash/label", async (req, p) => {
    const b = await body(req);
    return json(await labelFile(db, await me(req), p.hash, b?.label, b?.library));
  });

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

  // Stories, the admins' timeline player (./stories.ts): read here with what they link, at their head, an accepted
  // version (?v=2), an edit (?edit=7) or an intent's variant (?intent=<id>); their history is /api/docs/<id>/history.
  // They change only by proposal, over MCP
  on("GET", "/api/stories", async (req) => json(await listStories(db, await me(req))));
  on("GET", "/api/stories/:id", async (req, p) => {
    const q = new URL(req.url).searchParams;
    const m = await me(req);
    if (q.get("intent")) return json(await storyAt(db, m, p.id, { intent: q.get("intent")! }));
    if (q.get("edit") != null) return json(await storyAt(db, m, p.id, { edit: Number(q.get("edit")) }));
    return json(await storyOf(db, m, p.id, q.get("v") == null ? undefined : Number(q.get("v"))));
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
        if (e instanceof Denied || e instanceof NotFound || e instanceof VersionError || e instanceof WorkError || e instanceof IntentError || e instanceof MemberError || e instanceof TableError || e instanceof StoryError || e instanceof AssetDocError || e instanceof SandboxError || e instanceof SkillError || e instanceof ArtifactError || e instanceof OwnerError)
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
