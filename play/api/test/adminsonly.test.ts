// Everything on play is admins' only by default (intent aa751ecb, check c2): every GET route of the API, called as a
// visitor, a traveler, a citizen and an admin. A read of play's data answers 401 to a visitor and 403 to a traveler or
// citizen (their rules give nothing: play.level_rules), and an admin as before; only the open routes (who one is,
// the version, the founders' count, an invite, the health check, the MCP server, which takes an admin's token itself)
// answer all. A level whose rule gives a route's right reads it, with no change to the code.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { type Db } from "../src/kit/pg";
import { type Api, appOn, type Fresh, freshDb, human, request, suite } from "./kit";

const OPEN = ["/api/health", "/api/version", "/api/founders", "/api/me", "/api/invites/:code", "/api/mcp"];
/** a route's path with its params filled: a UUID, a hash, a version, a table */
const filled = (path: string) =>
  path
    .replace(":hash", "a".repeat(64))
    .replace(":v", "1")
    .replace(":code", "no-such-invite")
    .replace(":name", "humans")
    .replace(/:[a-z]+/g, "0b6f2c1e-5f3a-4b7e-9a51-2d4c8e1f7a90");

suite("admins only by default", () => {
  let f: Fresh, db: Db, api: Api;
  const who: Record<string, { id: string; cookie: string }> = {};

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    api = appOn(db);
    for (const [n, level] of [["ada", "admin"], ["cit", "citizen"], ["trav", "traveler"]] as const) who[n] = await human(db, n, level);
  });
  afterAll(async () => {
    await f?.drop();
  });
  const get = (as: string | null, path: string) => request(api, { cookie: as ? who[as].cookie : null }, "GET", path);

  test("admins only by default: the traveler's and the citizen's rules give nothing, the admin's every right", async () => {
    const { rows } = await db.query<{ level: string; rule: object }>(`SELECT level, rule FROM play.level_rules ORDER BY level`);
    expect(Object.fromEntries(rows.map((r) => [r.level, r.rule]))).toEqual({
      admin: { read: ["*"], propose: ["*"], decide: ["*"], manage: ["members", "invites"] },
      citizen: {},
      traveler: {},
    });
  });

  test("admins only by default: every GET route names what it needs, open only where it must be", () => {
    const reads = api.reads();
    expect(reads.length).toBeGreaterThan(30);
    expect(reads.filter((r) => r.need === "open").map((r) => r.path).sort()).toEqual([...OPEN].sort());
    // the rights a level may be given: the asset library, the sandboxes, the stories; every other read an admin's
    expect([...new Set(reads.flatMap((r) => (typeof r.need === "object" ? [r.need.read] : [])))].sort()).toEqual(["assets", "sandboxes", "stories"]);
  });

  test("admins only by default: every data read is 401 to a visitor, 403 to a traveler and a citizen, as before to an admin", async () => {
    const reads = api.reads().filter((r) => r.need !== "open");
    for (const { path } of reads) {
      const p = filled(path);
      expect([p, (await get(null, p)).status]).toEqual([p, 401]);
      for (const as of ["trav", "cit"]) {
        const a = await get(as, p);
        expect([p, as, a.status]).toEqual([p, as, 403]);
        expect(a.data.error).toBeString();
      }
      const a = await get("ada", p);
      expect([p, [401, 403].includes(a.status)]).toEqual([p, false]);
    }
    // the lists an admin reads, whole
    for (const p of ["/api/assets", "/api/catalog", "/api/stories", "/api/docs", "/api/intents", "/api/members", "/api/tables", "/api/library", "/api/artifacts", "/api/authors", "/api/tokens"])
      expect([p, (await get("ada", p)).status]).toEqual([p, 200]);
  });

  test("admins only by default: signing in and up, signing out, who one is, the version and the founders stay open", async () => {
    for (const as of [null, "trav", "cit", "ada"]) {
      expect((await get(as, "/api/version")).status).toBe(200);
      expect((await get(as, "/api/founders")).status).toBe(200);
      expect((await get(as, "/api/health")).status).toBe(200);
      expect((await get(as, "/api/invites/no-such-invite")).data).toEqual({ open: false });
    }
    expect((await get(null, "/api/me")).status).toBe(401);
    for (const as of ["trav", "cit", "ada"]) expect((await get(as, "/api/me")).status).toBe(200);
    expect((await get("trav", "/api/me")).data.may).toEqual({});
    expect((await request(api, { cookie: who.trav.cookie }, "POST", "/api/me/name", { name: "Trav Two" })).status).toBe(200);
    expect((await request(api, {}, "POST", "/api/passkey/login/options")).status).toBe(200);
    expect((await request(api, {}, "POST", "/api/passkey/register/options", { name: "Newcomer", invite: "no-such-invite" })).status).toBe(400);
    expect((await request(api, { cookie: who.trav.cookie }, "POST", "/api/signout")).status).toBe(200);
  });

  test("admins only by default: a level reads what its rule gives it, with no change to the code", async () => {
    await db.query(`UPDATE play.level_rules SET rule = '{"read": ["assets", "stories"]}'::jsonb WHERE level = 'citizen'`);
    try {
      for (const p of ["/api/assets", "/api/catalog", "/api/stories"]) expect([p, (await get("cit", p)).status]).toEqual([p, 200]);
      for (const p of ["/api/sandboxes/0b6f2c1e-5f3a-4b7e-9a51-2d4c8e1f7a90/config", "/api/docs", "/api/tables"]) expect([p, (await get("cit", p)).status]).toEqual([p, 403]);
      expect((await get("trav", "/api/assets")).status).toBe(403);
    } finally {
      await db.query(`UPDATE play.level_rules SET rule = '{}'::jsonb WHERE level = 'citizen'`);
    }
  });
});
