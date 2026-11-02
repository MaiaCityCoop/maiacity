// The API against a real Postgres: set TEST_DATABASE_URL (a server where this may create and drop a database), e.g.
// postgres://postgres@127.0.0.1:5544/postgres. Without it these tests are skipped.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { hashText } from "../src/hash";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { RECIPE_HEAD } from "../src/recipes";
import { Rate } from "../src/limits";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const recipe = (id: string, v: number, variant: string | null = null, lib = "module.exports.recipe = () => ({});") =>
  `${RECIPE_HEAD}${lib}\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant)});\n});\n`;

suite("play API", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};
  /** each asset made here, by its slug: its UUID */
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    name = `play_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    for (const n of ["ada", "cit", "cit2", "trav"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = ANY($1)`, [[who.cit.id, who.cit2.id]]);
  });

  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  const call = async (as: string | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    if (as) headers.cookie = who[as].cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    const text = await r.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {}
    return { status: r.status, data, headers: r.headers };
  };

  test("a visitor may do nothing but sign in", async () => {
    expect((await call(null, "GET", "/api/health")).status).toBe(200);
    expect((await call(null, "GET", "/api/assets")).status).toBe(401);
    expect((await call(null, "GET", "/api/sandboxes")).status).toBe(401);
    expect((await call(null, "POST", "/api/proposals", {})).status).toBe(401);
  });

  test("a traveler reads sandboxes and assets, but proposes nothing", async () => {
    expect((await call("trav", "GET", "/api/me")).data.level).toBe("traveler");
    expect((await call("trav", "GET", "/api/sandboxes")).data.map((s: any) => s.id)).toEqual(["sandbox-1", "sandbox-2", "sandbox-3"]);
    expect((await call("trav", "GET", "/api/assets")).status).toBe(200);
    const r = await call("trav", "POST", "/api/proposals", { new: { group: "plants", slug: "fern", label: "Fern" }, recipe: recipe("fern", 1) });
    expect(r.status).toBe(403);
  });

  test("a citizen proposes a new asset, an admin accepts it, everyone reads it", async () => {
    const p = await call("cit", "POST", "/api/proposals", { new: { group: "plants", slug: "fern", label: "Fern" }, note: "first", recipe: recipe("fern", 1), record: { card: { label: "Fern" } } });
    expect(p.status).toBe(201);
    expect(p.data.number).toBe(1);
    expect(p.data.asset).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    ids.fern = p.data.asset;
    expect((await call("trav", "GET", "/api/assets")).data.find((a: any) => a.id === ids.fern)).toBeUndefined();
    expect((await call("cit", "POST", `/api/proposals/${p.data.id}/accept`)).status).toBe(403);
    const ok = await call("ada", "POST", `/api/proposals/${p.data.id}/accept`);
    expect(ok.data).toMatchObject({ status: "accepted", number: 1 });
    const a = await call("trav", "GET", `/api/assets/${ids.fern}`);
    expect(a.data.versions.map((v: any) => [v.number, v.author, v.approvedBy])).toEqual([[1, "cit", "ada"]]);
    const f = await call("trav", "GET", `/api/files/${a.data.versions[0].recipe}`);
    expect(f.status).toBe(200);
    expect(hashText(f.data)).toBe(a.data.versions[0].recipe);
    const cat = (await call("trav", "GET", "/api/catalog")).data;
    expect(cat.find((r: any) => r.hash === a.data.versions[0].recipe)).toMatchObject({ asset: ids.fern, v: 1, variant: null });
  });

  test("a version proposed without a record takes its head's, with its own recipe and number", async () => {
    const head = (await call("trav", "GET", `/api/assets/${ids.fern}/1`)).data;
    expect(head.card.card.label).toBe("Fern");
    const p = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 2, null, "/* bare */") });
    const v = (await db.query<any>(`SELECT card FROM play.asset_versions WHERE id = $1`, [p.data.version])).rows[0].card;
    expect(v.card).toMatchObject({ label: "Fern", version: 2, id: "fern", group: "plants" });
    expect(v.card.recipe).not.toBe(head.card.card.recipe);
    await call("cit", "POST", `/api/proposals/${p.data.id}/withdraw`);
  });

  test("a recipe file must name the version it is proposed for", async () => {
    const r = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 1, null, "/* again */") });
    expect(r.status).toBe(400);
    expect(r.data.error).toContain("not fern@2");
  });

  test("of two proposals on one head, the second goes stale", async () => {
    const a = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 2, null, "/* a */") });
    const b = await call("cit2", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 2, null, "/* b */") });
    expect([a.status, b.status]).toEqual([201, 201]);
    expect((await call("ada", "POST", `/api/proposals/${b.data.id}/accept`)).data.status).toBe("accepted");
    expect((await call("ada", "POST", `/api/proposals/${a.data.id}/accept`)).status).toBe(409);
    const list = await call("trav", "GET", "/api/proposals");
    expect(list.data.find((p: any) => p.id === a.data.id).status).toBe("stale");
    const chain = (await call("trav", "GET", `/api/assets/${ids.fern}`)).data.versions;
    expect(chain.map((v: any) => v.number)).toEqual([2, 1]);
    expect(chain[0].parents).toEqual([chain[1].id]);
    // a base the proposer saw that is no longer the head is refused at once
    expect((await call("cit", "POST", "/api/proposals", { asset: ids.fern, base: chain[1].id, recipe: recipe("fern", 3) })).status).toBe(409);
  });

  test("an accepted version can't be changed", async () => {
    await expect(db.query(`UPDATE play.asset_versions SET note = 'x' WHERE asset_id = $1 AND number = 1`, [ids.fern])).rejects.toThrow(/frozen/);
    await expect(db.query(`DELETE FROM play.asset_versions WHERE asset_id = $1`, [ids.fern])).rejects.toThrow(/never deleted/);
  });

  test("a kind of variants: each variant its own hash in the catalog, its default marked", async () => {
    const p = await call("cit", "POST", "/api/proposals", {
      new: { group: "actors", slug: "goat", label: "Goat" },
      variants: { "goat-saanen": { recipe: recipe("goat", 1, "goat-saanen"), record: { card: { label: "Goat: Saanen" } } }, "goat-pied": { recipe: recipe("goat", 1, "goat-pied") } },
      defaultVariant: "goat-saanen",
    });
    expect(p.status).toBe(201);
    ids.goat = p.data.asset;
    await call("ada", "POST", `/api/proposals/${p.data.id}/accept`);
    const goats = (await call("trav", "GET", "/api/catalog")).data.filter((r: any) => r.asset === ids.goat);
    expect(goats.map((g: any) => [g.variant, g.first])).toEqual([["goat-pied", false], ["goat-saanen", true]]);
    expect(goats[0].hash).not.toBe(goats[1].hash);
  });

  test("a proposal naming another asset by a readable ref is refused", async () => {
    const r = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 3, null, "/* r */"), record: { card: { label: "Fern", parts: [{ ref: "actors/goat@1" }] } } });
    expect(r.status).toBe(400);
    expect(r.data.error).toContain("by their hash");
  });

  test("a sandbox's config hands every slot out as the build it pins", async () => {
    const v = (await db.query<any>(`SELECT id, recipe_hash FROM play.asset_versions WHERE asset_id = $1 AND number = 1`, [ids.fern])).rows[0];
    await db.query(`INSERT INTO play.sandbox_pins (sandbox_id, slot, version_id, params) VALUES ('sandbox-1', 'fern', $1, '{"stage":"9","seed":"a"}')`, [v.id]);
    await db.query(`INSERT INTO play.sandbox_configs (sandbox_id, name, data) VALUES ('sandbox-1', 'garden', '{"outside":{"trees":[{"id":"fern","v":1,"slot":"fern"}]}}')`);
    const c = (await call("trav", "GET", "/api/sandboxes/sandbox-1/config")).data;
    expect(c.assets.fern).toBe(`${v.recipe_hash}?seed=a&stage=9`);
    expect(c.garden.outside.trees[0].asset).toBe(c.assets.fern);
    expect((await call(null, "GET", "/api/sandboxes/sandbox-1/config")).status).toBe(401);
  });

  test("an asset is named by its UUID, and a slug can't be taken twice", async () => {
    expect((await call("trav", "GET", "/api/assets/plants/fern")).status).toBe(404);
    const again = await call("cit", "POST", "/api/proposals", { new: { group: "plants", slug: "fern", label: "Fern again" }, recipe: recipe("fern", 1, null, "/* twin */") });
    expect(again.status).toBe(409);
    expect((await call("cit", "POST", "/api/proposals", { asset: "plants/fern", recipe: recipe("fern", 3) })).status).toBe(400);
  });

  test("the author withdraws, an admin rejects", async () => {
    const a = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 3, null, "/* w */") });
    expect((await call("cit2", "POST", `/api/proposals/${a.data.id}/withdraw`)).status).toBe(403);
    expect((await call("cit", "POST", `/api/proposals/${a.data.id}/withdraw`)).data.status).toBe("withdrawn");
    const b = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 3, null, "/* r */") });
    expect((await call("ada", "POST", `/api/proposals/${b.data.id}/reject`)).data.status).toBe("rejected");
  });

  test("an invite makes a traveler a citizen, once", async () => {
    expect((await call("trav", "POST", "/api/invites")).status).toBe(403);
    const inv = await call("ada", "POST", "/api/invites");
    expect(inv.status).toBe(201);
    expect((await call(null, "GET", `/api/invites/${inv.data.code}`)).data.open).toBe(true);
    expect((await call("trav", "POST", `/api/invites/${inv.data.code}/claim`)).data.level).toBe("citizen");
    expect((await call("trav", "GET", "/api/me")).data.level).toBe("citizen");
    expect((await call("cit", "POST", `/api/invites/${inv.data.code}/claim`)).status).toBe(410);
  });

  test("admins run the members, and one admin always stays", async () => {
    expect((await call("cit", "GET", "/api/members")).status).toBe(403);
    expect((await call("ada", "GET", "/api/members")).data.length).toBe(4);
    expect((await call("ada", "POST", `/api/members/${who.ada.id}/level`, { level: "traveler" })).status).toBe(409);
    expect((await call("ada", "POST", `/api/members/${who.cit2.id}/level`, { level: "traveler" })).data.level).toBe("traveler");
  });

  test("an admin renames and removes a member, never themselves or the history's names", async () => {
    expect((await call("cit", "POST", `/api/members/${who.trav.id}/name`, { name: "Wanda" })).status).toBe(403);
    expect((await call("ada", "POST", `/api/members/${who.trav.id}/name`, { name: " x " })).status).toBe(400);
    expect((await call("ada", "POST", `/api/members/${who.trav.id}/name`, { name: "  Wanda   Walker " })).data.name).toBe("Wanda Walker");
    expect((await call("ada", "DELETE", `/api/members/${who.ada.id}`)).status).toBe(409);
    expect((await call("cit", "DELETE", `/api/members/${who.trav.id}`)).status).toBe(403);
    // the citizen made a version above: kept, with their name on it
    const kept = await call("ada", "DELETE", `/api/members/${who.cit.id}`);
    expect(kept.status).toBe(409);
    expect(kept.data.error).toContain("asset version");
    const before = (await call("ada", "GET", "/api/members")).data.length;
    expect((await call("ada", "DELETE", `/api/members/${who.trav.id}`)).data.removed).toBe(true);
    expect((await call("ada", "GET", "/api/members")).data.length).toBe(before - 1);
    expect((await call("ada", "DELETE", `/api/members/${who.trav.id}`)).status).toBe(404);
    expect((await call("trav", "GET", "/api/me")).status).toBe(401);
  });

  test("only an admin looks into the database, read only, its secrets never sent", async () => {
    expect((await call(null, "GET", "/api/tables")).status).toBe(401);
    expect((await call("cit", "GET", "/api/tables")).status).toBe(403);
    const tables = (await call("ada", "GET", "/api/tables")).data as { name: string; rows: number; columns: { name: string; hidden: boolean }[] }[];
    expect(tables.map((t) => t.name)).toContain("asset_versions");
    expect(tables.find((t) => t.name === "secrets")!.columns.find((c) => c.name === "value")!.hidden).toBe(true);
    const secrets = (await call("ada", "GET", "/api/tables/secrets")).data;
    expect(secrets.rows.length).toBeGreaterThan(0);
    for (const r of secrets.rows) expect(r.value).toEqual({ hidden: true });
    const humans = (await call("ada", "GET", "/api/tables/humans?limit=2&offset=1")).data;
    expect(humans.rows.length).toBe(2);
    expect(humans.total).toBeGreaterThanOrEqual(3);
    expect((await call("ada", "GET", "/api/tables/pg_user")).status).toBe(404);
    expect((await call("ada", "GET", `/api/tables/${encodeURIComponent('humans"; DROP TABLE play.humans; --')}`)).status).toBe(404);
  });
});
