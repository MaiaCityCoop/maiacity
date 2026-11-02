// play's API (play/SPEC.md §7): one handler, `app({ db, store }).fetch(req)`, so the tests call it without a port.
// The site and the API share an origin (play.maia.city, /api behind Caddy), so there is no CORS. A visitor gets 401
// everywhere but the health check and the passkey ceremonies.
import type { BlobStore } from "./blobs";
import { HASH } from "./hash";
import { UUID } from "./uuid";
import type { Db } from "./pg";
import { Denied, meOf, must } from "./access";
import { assetOf, catalogOf, configOf, fileOf, listAssets, NotFound, pinsOf, versionOf } from "./assets";
import { clearCookie, humanIdFrom, loginFinish, loginOptions, registerFinish, registerOptions, sessionCookie, tokenFor } from "./auth";
import { claimInvite, inviteOpen, listMembers, makeInvite, MemberError, removeMember, renameMember, setLevel } from "./members";
import { listTables, readTable, TableError } from "./tables";
import { decide, listProposals, propose, ProposalError, type Verdict } from "./proposals";
import { clientOf, perMinute, Rate, costly } from "./limits";

type Handler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;
type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init);
async function body(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function app({ db, store, rate = new Rate(perMinute(process.env.API_RATE)) }: { db: Db; store: BlobStore; rate?: Rate }) {
  const routes: Route[] = [];
  const on = (method: string, path: string, handler: Handler) => {
    const keys: string[] = [];
    const pattern = new RegExp(`^${path.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), "([^/]+)"))}$`);
    routes.push({ method, pattern, keys, handler });
  };
  const me = (req: Request) => meOf(db, humanIdFrom(req));
  const signedIn = (h: { id: string; name: string }, extra: unknown = {}) =>
    json({ id: h.id, name: h.name, ...(extra as object) }, { headers: { "Set-Cookie": sessionCookie(tokenFor(h.id)) } });

  on("GET", "/api/health", () => json({ ok: true }));

  // ---- who
  on("POST", "/api/passkey/register/options", async (req) => {
    const r = await registerOptions((await body(req))?.name);
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
    const url = store.url(p.hash, 3600);
    if (/^https?:/.test(url)) return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=3000" } });
    const bytes = await store.get(p.hash);
    if (!bytes) throw new NotFound("The file's bytes are missing.");
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": f.media_type, "Cache-Control": "private, max-age=31536000, immutable", ETag: `"${p.hash}"` } });
  });

  // ---- sandboxes
  on("GET", "/api/sandboxes", async (req) => {
    must(await me(req), "read", "sandboxes");
    return json((await db.query(`SELECT id, title, route, note FROM play.sandboxes ORDER BY id`)).rows);
  });
  on("GET", "/api/sandboxes/:id/config", async (req, p) => {
    must(await me(req), "read", "sandboxes");
    return json(await configOf(db, p.id));
  });
  on("GET", "/api/sandboxes/:id/pins", async (req, p) => {
    must(await me(req), "read", "sandboxes");
    return json(await pinsOf(db, p.id));
  });

  // ---- proposals
  on("GET", "/api/proposals", async (req) => json(await listProposals(db, await me(req), new URL(req.url).searchParams.get("status") ?? undefined)));
  on("POST", "/api/proposals", async (req) => json(await propose(db, store, await me(req), await body(req)), { status: 201 }));
  on("POST", "/api/proposals/:id/:verdict", async (req, p) => {
    if (!["accept", "reject", "withdraw"].includes(p.verdict)) throw new NotFound("No such verdict.");
    return json(await decide(db, await me(req), p.id, p.verdict as Verdict));
  });

  // ---- the coop
  on("GET", "/api/members", async (req) => json(await listMembers(db, await me(req))));
  on("POST", "/api/members/:id/level", async (req, p) => json(await setLevel(db, await me(req), p.id, `${(await body(req))?.level ?? ""}`)));
  on("POST", "/api/members/:id/name", async (req, p) => json(await renameMember(db, await me(req), p.id, (await body(req))?.name)));
  on("DELETE", "/api/members/:id", async (req, p) => json(await removeMember(db, await me(req), p.id)));
  on("POST", "/api/invites", async (req) => json(await makeInvite(db, await me(req)), { status: 201 }));
  on("GET", "/api/invites/:code", async (req, p) => json({ open: await inviteOpen(db, p.code) }));
  on("POST", "/api/invites/:code/claim", async (req, p) => json(await claimInvite(db, await me(req), p.code)));

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
        if (e instanceof Denied || e instanceof NotFound || e instanceof ProposalError || e instanceof MemberError || e instanceof TableError)
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
