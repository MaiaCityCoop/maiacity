// The API against a real Postgres: set TEST_DATABASE_URL (a server where this may create and drop a database), e.g.
// postgres://postgres@127.0.0.1:5544/postgres. Without it these tests are skipped.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore, type BlobStore } from "../src/blobs";
import { importSources } from "../import/sources";
import { legacyRan, runImport } from "../import/run";
import { seedStories, STORIES } from "../import/stories";
import { storyVersionId } from "../src/versions";
import { foldStories } from "../src/stories";
import { hashText } from "../src/hash";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { RECIPE_HEAD } from "../src/recipes";
import { Rate } from "../src/limits";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const recipe = (id: string, v: number, variant: string | null = null, note = "") =>
  `${RECIPE_HEAD}module.exports.recipe = () => ({});${note}\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant)});\n});\n`;

suite("play API", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  let store: BlobStore;
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
    store = folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));
    api = app({ db, store, rate: new Rate(0) });
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
    expect((await call(null, "GET", "/api/sandboxes/sandbox-1/config")).status).toBe(401);
    expect((await call(null, "POST", "/api/proposals", {})).status).toBe(401);
  });

  test("a traveler reads sandboxes and assets, but proposes nothing", async () => {
    expect((await call("trav", "GET", "/api/me")).data.level).toBe("traveler");
    expect((await call("trav", "GET", "/api/sandboxes/sandbox-1/config")).status).toBe(200);
    expect((await call("trav", "GET", "/api/sandboxes")).status).toBe(404);
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
    await call("cit", "POST", `/api/proposals/${p.data.id}/archive`);
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
    expect(list.data.find((p: any) => p.id === a.data.id).status).toBe("archived");
    const chain = (await call("trav", "GET", `/api/assets/${ids.fern}`)).data.versions;
    expect(chain.map((v: any) => v.number)).toEqual([2, 1]);
    expect(chain[0].parents).toEqual([chain[1].id]);
    // a base the proposer saw that is no longer the head is refused at once
    expect((await call("cit", "POST", "/api/proposals", { asset: ids.fern, base: chain[1].id, recipe: recipe("fern", 3) })).status).toBe(409);
  });

  test("the legacy import runs once: after it, Postgres is the source of truth and a run writes none of it again", async () => {
    expect(await legacyRan(db)).toBeNull();
    await db.query(`INSERT INTO play.imports (name) VALUES ('legacy')`);
    expect(await legacyRan(db)).toBeString();
    // what play changed since: a label, a head set where play set it
    const first = (await db.query<{ id: string }>(`SELECT id FROM play.asset_versions WHERE asset_id = $1 AND number = 1`, [ids.fern])).rows[0].id;
    await db.query(`UPDATE play.assets SET label = 'Fern, renamed in play', head = $2 WHERE id = $1`, [ids.fern, first]);
    const before = (await db.query(`SELECT id, label, head, sound FROM play.assets ORDER BY id`)).rows;
    const members = (await db.query(`SELECT human_id, level FROM play.memberships ORDER BY human_id`)).rows;
    // a run (every deploy runs it) reads no feed, writes none of the legacy import, and changes none of it
    const report = await runImport(db, store, { cache: mkdtempSync(join(tmpdir(), "play-cache-")), founders: true, admins: [1], dry: false, media: false, log: () => {} });
    expect(report.legacy.skipped).toBe(true);
    expect(report.ok).toBe(true);
    expect(report.feed.recipes).toBe(0);
    expect(Object.values(report.written).every((n) => n === 0)).toBe(true);
    // …but it writes the repo's stories play doesn't hold yet (./stories), with every deploy
    expect(report.stories.seeded).toContain("papaya-v2-devlog");
    expect(report.stories.errors).toEqual([]);
    expect((await db.query(`SELECT id, label, head, sound FROM play.assets ORDER BY id`)).rows).toEqual(before);
    expect((await db.query(`SELECT human_id, level FROM play.memberships ORDER BY human_id`)).rows).toEqual(members);
    // play's own again, for the tests after this one
    const newest = (await db.query<{ id: string }>(`SELECT id FROM play.asset_versions WHERE asset_id = $1 AND number IS NOT NULL ORDER BY number DESC LIMIT 1`, [ids.fern])).rows[0].id;
    await db.query(`UPDATE play.assets SET label = 'Fern', head = $2 WHERE id = $1`, [ids.fern, newest]);
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

  test("an agent proposes a plant as a kind of variants over MCP: each its own recipe and label, the params its recipe declares", async () => {
    const t = (await call("ada", "POST", "/api/tokens", { name: "kinds" })).data.token;
    const src = "// a fern of three kinds\nmodule.exports.recipe = function (id, v, variant) {\n  return { meta: { id, v, variant }, build: () => null };\n};\n";
    const params = [
      { id: "stage", label: "Stage", type: "number", min: 0, max: 9, value: 9 },
      { id: "pollen", label: "Pollen", type: "integer", min: 0, max: 1, value: 1, names: ["None", "A male near"] },
    ];
    const head = (await call("trav", "GET", `/api/assets/${ids.fern}`)).data.head;
    const kinds = [{ name: "both", label: "Fern: Both" }, { name: "female", label: "Fern: Female" }, { name: "male", label: "Fern: Male" }];
    const r = await tool("propose_version", { asset: ids.fern, base: head, source: src, note: "its kinds", variants: kinds, default_variant: "both", params }, t);
    expect(r.error).toBeNull();
    const rows = (await db.query<any>(`SELECT name, card FROM play.asset_variants WHERE version_id = $1 ORDER BY name`, [r.out.version])).rows;
    expect(rows.map((x) => [x.name, x.card.card.label, x.card.card.variant])).toEqual([["both", "Fern: Both", "both"], ["female", "Fern: Female", "female"], ["male", "Fern: Male", "male"]]);
    for (const x of rows) expect(x.card.card.params).toEqual(params);
    expect(new Set(rows.map((x) => x.card.card.recipe)).size).toBe(3);
    const v = (await db.query<any>(`SELECT default_variant, recipe_hash FROM play.asset_versions WHERE id = $1`, [r.out.version])).rows[0];
    expect(v).toMatchObject({ default_variant: "both", recipe_hash: null });
    expect((await tool("propose_version", { asset: ids.fern, source: src, note: "bad", params: [{ id: "1x", type: "number", value: 1 }] }, t)).error).toContain("own id");
    expect((await tool("propose_version", { asset: ids.fern, source: src, note: "twice", variants: [{ name: "a" }, { name: "a" }] }, t)).error).toContain("name of its own");
    await call("ada", "POST", `/api/proposals/${r.out.id}/archive`);
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

  test("the Factories are the admins' alone", async () => {
    expect((await call(null, "GET", "/api/sandboxes/factories/config")).status).toBe(401);
    expect((await call("trav", "GET", "/api/sandboxes/factories/config")).status).toBe(403);
    expect((await call("cit", "GET", "/api/sandboxes/factories/config")).status).toBe(403);
    expect((await call("ada", "GET", "/api/sandboxes/factories/config")).status).toBe(200);
  });

  test("an asset is named by its UUID, and a slug can't be taken twice", async () => {
    expect((await call("trav", "GET", "/api/assets/plants/fern")).status).toBe(404);
    const again = await call("cit", "POST", "/api/proposals", { new: { group: "plants", slug: "fern", label: "Fern again" }, recipe: recipe("fern", 1, null, "/* twin */") });
    expect(again.status).toBe(409);
    expect((await call("cit", "POST", "/api/proposals", { asset: "plants/fern", recipe: recipe("fern", 3) })).status).toBe(400);
  });

  test("a proposal ends accepted or archived: archived by its author or by an admin", async () => {
    const a = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 3, null, "/* w */") });
    expect((await call("cit2", "POST", `/api/proposals/${a.data.id}/archive`)).status).toBe(403);
    expect((await call("cit", "POST", `/api/proposals/${a.data.id}/withdraw`)).status).toBe(404);
    expect((await call("cit", "POST", `/api/proposals/${a.data.id}/archive`)).data.status).toBe("archived");
    expect((await call("cit", "GET", `/api/proposals/${a.data.id}`)).data).toMatchObject({ status: "archived", decided_by: expect.any(String) });
    const b = await call("cit", "POST", "/api/proposals", { asset: ids.fern, recipe: recipe("fern", 3, null, "/* r */") });
    expect((await call("ada", "POST", `/api/proposals/${b.data.id}/archive`)).data.status).toBe("archived");
  });

  test("sign-up is by invite only: an invite makes a traveler, once", async () => {
    expect((await call("trav", "POST", "/api/invites")).status).toBe(403);
    const inv = await call("ada", "POST", "/api/invites");
    expect(inv.status).toBe(201);
    expect(inv.data.level).toBe("traveler");
    expect((await call(null, "GET", `/api/invites/${inv.data.code}`)).data.open).toBe(true);
    const none = await call(null, "POST", "/api/passkey/register/options", { name: "Newcomer" });
    expect(none.status).toBe(400);
    expect(none.data.error).toContain("invite-only");
    expect((await call(null, "POST", "/api/passkey/register/options", { name: "Newcomer", invite: "nope" })).status).toBe(400);
    expect((await call(null, "POST", "/api/passkey/register/options", { name: "Newcomer", invite: inv.data.code })).data.challenge).toBeTruthy();
    // the passkey made (no browser here): the human, a traveler let in by the admin who made the invite, the invite used
    const h = await createHuman(db, "Newcomer", undefined, inv.data.code);
    const { rows } = await db.query(`SELECT level, granted_by, via_invite FROM play.memberships WHERE human_id = $1`, [h.id]);
    expect(rows[0]).toMatchObject({ level: "traveler", granted_by: who.ada.id, via_invite: inv.data.code });
    expect((await call(null, "GET", `/api/invites/${inv.data.code}`)).data.open).toBe(false);
    await expect(createHuman(db, "Second", undefined, inv.data.code)).rejects.toThrow("used up");
    expect((await db.query(`SELECT 1 FROM play.humans WHERE name = 'Second'`)).rows.length).toBe(0);
    expect((await call("trav", "POST", `/api/invites/${inv.data.code}/claim`)).status).toBe(404);
  });

  test("an admin's agent proposes over MCP by their token; it decides nothing, and stops with the token or the admin", async () => {
    expect((await call("cit", "POST", "/api/tokens", { name: "laptop" })).status).toBe(403);
    const made = await call("ada", "POST", "/api/tokens", { name: "Claude laptop" });
    expect(made.status).toBe(201);
    expect(made.data.token).toMatch(/^play_/);
    expect((await call("ada", "GET", "/api/tokens")).data.map((t: any) => t.name)).toContain("Claude laptop");
    expect(JSON.stringify((await call("ada", "GET", "/api/tokens")).data)).not.toContain(made.data.token);
    let n = 0;
    const rpc = async (token: string | null, method: string, params?: unknown) => {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (token) headers.authorization = `Bearer ${token}`;
      const r = await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }) }));
      return { status: r.status, data: await r.json().catch(() => null) };
    };
    expect((await rpc(null, "initialize")).status).toBe(401);
    expect((await rpc("play_notarealtokenatallxxxxxxxx", "initialize")).status).toBe(401);
    const init = await rpc(made.data.token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    expect(init.data.result.protocolVersion).toBe("2025-06-18");
    const names = (await rpc(made.data.token, "tools/list")).data.result.tools.map((t: any) => t.name);
    expect(names).toEqual(expect.arrayContaining(["list_assets", "get_asset", "get_file", "propose_version", "propose_asset", "list_proposals"]));
    expect(names.some((x: string) => /accept|reject|decide/.test(x))).toBe(false);
    const listed = await rpc(made.data.token, "tools/call", { name: "list_assets", arguments: { group: "plants" } });
    expect(listed.data.result.isError).toBeUndefined();
    const proposed = await rpc(made.data.token, "tools/call", {
      name: "propose_asset",
      arguments: { group: "plants", slug: "mcp-fern", label: "MCP fern", source: "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n", note: "proposed by an agent" },
    });
    expect(proposed.data.result.isError).toBeUndefined();
    const open = (await call("ada", "GET", "/api/proposals?status=open")).data.find((p: any) => p.slug === "mcp-fern");
    expect(open).toMatchObject({ via: "mcp", author: "ada", status: "open" });
    const wrong = await rpc(made.data.token, "tools/call", {
      name: "propose_asset",
      arguments: { group: "plants", slug: "mcp-moss", label: "Moss", source: `module.exports.recipe=function(){return{a:${"1+".repeat(800)}1}};`, note: "minified" },
    });
    expect(wrong.data.result.isError).toBe(true);
    expect(wrong.data.result.content[0].text).toContain("not readable");
    const bundled = await rpc(made.data.token, "tools/call", { name: "propose_asset", arguments: { group: "plants", slug: "mcp-moss", label: "Moss", recipe: recipe("mcp-moss", 1), note: "no source" } });
    expect(bundled.data.result.isError).toBe(true);
    expect((await call("ada", "DELETE", `/api/tokens/${made.data.id}`)).data.revoked).toBe(true);
    expect((await rpc(made.data.token, "tools/list")).status).toBe(401);
    // a token opens nothing once its owner is no admin
    await call("ada", "POST", `/api/members/${who.cit.id}/level`, { level: "admin" });
    const theirs = await call("cit", "POST", "/api/tokens", { name: "theirs" });
    expect((await rpc(theirs.data.token, "ping")).status).toBe(200);
    await call("ada", "POST", `/api/members/${who.cit.id}/level`, { level: "citizen" });
    expect((await rpc(theirs.data.token, "ping")).status).toBe(401);
  });

  test("an admin's token opens the world's read-only routes, so an agent can film a sandbox; nothing else, and nothing that writes", async () => {
    const t = (await call("ada", "POST", "/api/tokens", { name: "camera" })).data;
    const get = async (path: string, method = "GET", token = t.token) =>
      (await api.fetch(new Request(`http://play.test${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(method === "GET" ? {} : { body: "{}" }) }))).status;
    expect(await get("/api/me")).toBe(200);
    expect(await get("/api/catalog")).toBe(200);
    expect(await get(`/api/assets/${ids.fern}`)).toBe(200);
    expect(await get("/api/sandboxes/sandbox-1/config")).toBe(200);
    for (const path of ["/api/members", "/api/tokens", "/api/proposals", "/api/stories", "/api/postgres/tables"]) expect(await get(path)).toBeGreaterThanOrEqual(401);
    expect(await get("/api/proposals", "POST")).toBe(401);
    expect(await get("/api/catalog", "GET", "play_notarealtokenatallxxxxxxxx")).toBe(401);
    await call("ada", "DELETE", `/api/tokens/${t.id}`);
    expect(await get("/api/catalog")).toBe(401);
  });

  test("a proposal brings its readable source: play wraps it into the recipe, keeps both, and serves them as text", async () => {
    const source = "// a fern, version 3\nconst THREE = require('three');\nmodule.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";
    const p = await call("cit", "POST", "/api/proposals", { asset: ids.fern, source, note: "readable" });
    expect(p.status).toBe(201);
    const r = (await call("ada", "GET", `/api/proposals/${p.data.id}`)).data;
    expect(r.source).toBe(hashText(source));
    expect(r.builds).toHaveLength(1);
    expect(r.builds[0]).toMatchObject({ hash: r.recipe, proposed: true, v: p.data.number });
    expect(r.builds[0].record.manifest.libs).toEqual(["three"]);
    expect(r.builds[0].record.engine.host).toBe("box");
    expect(r.builds[0].record.source).toBe(r.source);
    const file = await call("ada", "GET", `/api/files/${r.recipe}`);
    expect(file.data).toBe(`${RECIPE_HEAD}${source}\nreturn module.exports.recipe("fern", ${p.data.number}, null);\n});\n`);
    expect(file.headers.get("content-type")).toStartWith("text/plain");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
    expect(file.headers.get("content-security-policy")).toContain("sandbox");
    expect((await call("ada", "GET", `/api/files/${r.source}`)).data).toBe(source);
    await call("cit", "POST", `/api/proposals/${p.data.id}/archive`);
  });

  test("an imported version and its variants are given their readable source once, and nothing else of them changes", async () => {
    // two imported versions as the import writes them: their recipe files among play's files, no source
    const put = async (text: string) => {
      const h = hashText(text);
      const key = await store.put(h, new TextEncoder().encode(text), "text/javascript");
      await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [h, text.length, key]);
      return h;
    };
    const legacy = "module.exports.recipe = function (id, v, variant) {\n  return { meta: { id, v, variant }, build: () => null };\n};\n";
    const own = await put(recipe("thyme-old", 1)), hen = await put(recipe("hen-old", 1, "hen-red"));
    const thyme = "8a1e2b44-0000-4000-8000-000000000001", hens = "8a1e2b44-0000-4000-8000-000000000002";
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, 'maia-city', 'plants', 'thyme-old', 'Thyme'), ($2, 'maia-city', 'actors', 'hen-old', 'Hen')`, [thyme, hens]);
    await db.query(
      `INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, default_variant, card, engine, imported) VALUES
        ($1, $2, 1, $3, NULL, '{"card":{}}', 5, '{"from":"avendb"}'), ($4, $5, 1, NULL, 'hen-red', '{"card":{}}', 5, '{"from":"avendb"}')`,
      [hashText("thyme-old@1"), thyme, own, hashText("hen-old@1"), hens],
    );
    await db.query(`INSERT INTO play.asset_variants (version_id, name, recipe_hash, card) VALUES ($1, 'hen-red', $2, '{"card":{}}')`, [hashText("hen-old@1"), hen]);
    // the sources and their index, as legacy/sources keeps them
    const dir = mkdtempSync(join(tmpdir(), "play-sources-"));
    const index = (recipes: Record<string, any>, text = legacy) => {
      mkdirSync(join(dir, "plants"), { recursive: true });
      writeFileSync(join(dir, "plants/old.js"), text);
      writeFileSync(join(dir, "index.json"), JSON.stringify({ sources: { [hashText(legacy)]: "plants/old.js" }, recipes }));
    };
    const src = hashText(legacy);
    index({ [own]: { asset: "plants/thyme-old", v: 1, variant: null, source: src, commit: "c" }, [hen]: { asset: "actors/hen-old", v: 1, variant: "hen-red", source: src, commit: "c" } });
    const first = await importSources(db, store, dir);
    expect(first).toEqual({ files: 1, attached: 2, recipesAbsent: 0, errors: [] });
    const got = await call("trav", "GET", `/api/assets/${thyme}`);
    expect(got.data.versions[0].source).toBe(src);
    expect((await call("trav", "GET", `/api/assets/${hens}`)).data.versions[0].variants[0].source).toBe(src);
    expect((await call("trav", "GET", `/api/files/${src}`)).data).toBe(legacy);
    // run again, nothing more is written
    expect(await importSources(db, store, dir)).toEqual({ files: 0, attached: 0, recipesAbsent: 0, errors: [] });
    // a source is given once; the rest stays frozen
    await expect(db.query(`UPDATE play.asset_versions SET source_hash = $1 WHERE asset_id = $2`, [own, thyme])).rejects.toThrow(/given once/);
    await expect(db.query(`UPDATE play.asset_versions SET source_hash = NULL WHERE asset_id = $1`, [thyme])).rejects.toThrow(/given once/);
    await expect(db.query(`UPDATE play.asset_versions SET note = 'x' WHERE asset_id = $1`, [thyme])).rejects.toThrow(/frozen/);
    await expect(db.query(`UPDATE play.asset_variants SET source_hash = NULL WHERE recipe_hash = $1`, [hen])).rejects.toThrow(/never changed/);
    await expect(db.query(`UPDATE play.asset_variants SET card = '{}' WHERE recipe_hash = $1`, [hen])).rejects.toThrow(/never changed/);
    // an index that says the wrong version, or a source that is not its hash, is refused
    index({ [own]: { asset: "plants/thyme-old", v: 2, variant: null, source: src, commit: "c" } });
    expect((await importSources(db, store, dir)).errors[0]).toMatch(/builds thyme-old@1, not plants\/thyme-old@2/);
    index({}, legacy + "// changed\n");
    expect((await importSources(db, store, dir)).errors[0]).toMatch(/its text is not/);
  });

  test("minified code, a source that sets no recipe, and an engine that is not frozen are refused", async () => {
    const min = await call("cit", "POST", "/api/proposals", { asset: ids.fern, source: `module.exports.recipe=function(){return ${"[1,2,3],".repeat(200)}0};` });
    expect(min.status).toBe(400);
    expect(min.data.error).toContain("not readable");
    expect((await call("cit", "POST", "/api/proposals", { asset: ids.fern, source: "// nothing here\n" })).data.error).toContain("module.exports.recipe");
    const engine = await call("cit", "POST", "/api/proposals", { asset: ids.fern, source: "module.exports.recipe = () => ({});\n", record: { engine: { version: 99 } } });
    expect(engine.data.error).toContain("not one of the frozen engines");
  });

  test("admins run the members, and one admin always stays", async () => {
    expect((await call("cit", "GET", "/api/members")).status).toBe(403);
    expect((await call("ada", "GET", "/api/members")).data.length).toBe(5);
    expect((await call("ada", "POST", `/api/members/${who.ada.id}/level`, { level: "traveler" })).status).toBe(409);
    expect((await call("ada", "POST", `/api/members/${who.cit2.id}/level`, { level: "traveler" })).data.level).toBe("traveler");
  });

  test("an asset hands out its sound and the sound's gain", async () => {
    const list = (await call("trav", "GET", "/api/assets")).data as { id: string }[];
    const a = (await call("trav", "GET", `/api/assets/${list[0].id}`)).data;
    expect(a).toHaveProperty("sound", null);
    expect(a.sound_gain).toBe(1);
  });

  test("anyone signed in renames themselves", async () => {
    expect((await call(null, "POST", "/api/me/name", { name: "Nobody" })).status).toBe(401);
    expect((await call("cit", "POST", "/api/me/name", { name: "a" })).status).toBe(400);
    expect((await call("cit", "POST", "/api/me/name", { name: " Cita  Zen " })).data.name).toBe("Cita Zen");
    expect((await call("cit", "GET", "/api/me")).data.name).toBe("Cita Zen");
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


  // ---- Stories: films as timelines, versioned like the assets, changed only by proposal over MCP
  const frameOf = (n: string) => readFileSync(join(STORIES, "papaya-v2-devlog", "frames", n));
  let storyToken = "";
  let m = 1000;
  const tool = async (name: string, args: Record<string, unknown>, token = storyToken) => {
    const r = await api.fetch(new Request("http://play.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++m, method: "tools/call", params: { name, arguments: args } }),
    }));
    const data: any = await r.json();
    const res = data.result;
    return { error: res?.isError ? res.content[0].text as string : null, out: res?.isError ? null : res?.structuredContent };
  };
  const tracks = (frame: string, line = "Every papaya begins as a seed.") => [
    { id: "shots", kind: "shots", clips: [{ id: "s1", at: 0, duration: 3, frame, transition: "Match cut" }, { id: "s2", duration: 4, frame: null, transition: "" }] },
    { id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 3, who: "SAMUEL", line: "This is our papaya…" }, { id: "v2", at: 3, duration: 4, who: "MAIA", line }] },
    { id: "notes", kind: "notes", clips: [{ id: "n1", at: 0, duration: 7, section: "HOOK", camera: "Low angle", retention: "Payoff first", mood: "↑", custom: { kept: true } }] },
  ];

  test("only an admin reads the Stories, and no route writes one: a story changes only by proposal", async () => {
    expect((await call(null, "GET", "/api/stories")).status).toBe(401);
    expect((await call("cit", "GET", "/api/stories")).status).toBe(403);
    expect((await call("cit2", "GET", "/api/stories/papaya-v2-devlog")).status).toBe(403);
    expect((await call("ada", "PUT", "/api/stories/papaya-v2-devlog", { title: "x" })).status).toBe(405);
    expect((await call("ada", "POST", "/api/stories/frames", {})).status).toBe(405);
    // the papaya story, written by the deploy's import run above as its accepted v1, its frames kept as files
    const list = (await call("ada", "GET", "/api/stories")).data;
    expect(list.find((s: any) => s.id === "papaya-v2-devlog")).toMatchObject({ number: 1, versions: 1, shots: 25, tracks: 3 });
    const story = (await call("ada", "GET", "/api/stories/papaya-v2-devlog")).data;
    const given = JSON.parse(readFileSync(join(STORIES, "papaya-v2-devlog", "story.json"), "utf8"));
    expect(story).toMatchObject({ schema: "story/1", format: "9:16", fps: 30, number: 1, title: given.title });
    expect(story.tracks.map((t: any) => t.kind)).toEqual(["shots", "voice", "notes"]);
    expect(story.tracks[1].clips.map((c: any) => c.line)).toEqual(given.tracks[1].clips.map((c: any) => c.line));
    for (const c of story.tracks[0].clips) expect(c.frame).toMatch(/^[0-9a-f]{64}$/);
    const frame = await api.fetch(new Request(`http://play.test/api/files/${story.tracks[0].clips[0].frame}`, { headers: { cookie: who.ada.cookie } }));
    expect(frame.headers.get("content-type")).toBe("image/jpeg");
    // its id is its content's: the same primitive as an asset version's
    const { schema, format, fps, duration } = story;
    expect(storyVersionId({ story: "papaya-v2-devlog", parents: [], title: story.title, body: { schema, format, fps, duration, tracks: story.tracks } })).toBe(story.version);
  });

  test("an admin's agent adds frames and proposes a new story over MCP; an admin accepts it, and only then is it a story", async () => {
    storyToken = (await call("ada", "POST", "/api/tokens", { name: "stories" })).data.token;
    const names = (await (await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${storyToken}` }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }))).json()).result.tools.map((t: any) => t.name);
    expect(names).toEqual(expect.arrayContaining(["list_stories", "get_story", "propose_story", "propose_story_version", "add_story_frame"]));
    expect(names.some((x: string) => /accept|reject|decide/.test(x))).toBe(false);

    const added = await tool("add_story_frame", { data: frameOf("02.jpg").toString("base64"), media_type: "image/jpeg" });
    expect(added.error).toBeNull();
    expect(added.out.hash).toMatch(/^[0-9a-f]{64}$/);
    expect((await tool("add_story_frame", { data: frameOf("02.jpg").toString("base64"), media_type: "image/jpeg" })).out.hash).toBe(added.out.hash);
    expect((await tool("add_story_frame", { data: Buffer.from("<svg onload=alert(1)>").toString("base64"), media_type: "image/png" })).error).toContain("JPEG, PNG or WebP");
    expect((await tool("add_story_frame", { data: frameOf("02.jpg").toString("base64"), media_type: "image/png" })).error).toContain("not image/png");

    const proposed = await tool("propose_story", { story: "seed-to-fruit", title: "Seed to fruit", note: "a first cut", body: { format: "9:16", fps: 30, tracks: tracks(added.out.hash) } });
    expect(proposed.error).toBeNull();
    expect(proposed.out).toMatchObject({ story: "seed-to-fruit", number: 1, base: null, duration: 7 });
    expect((await call("ada", "GET", "/api/stories/seed-to-fruit")).status).toBe(404); // not a story until it is accepted
    const open = (await call("ada", "GET", "/api/proposals?status=open")).data.find((p: any) => p.id === proposed.out.id);
    expect(open).toMatchObject({ kind: "story_version", grp: "stories", slug: "seed-to-fruit", label: "Seed to fruit", number: 1, via: "mcp", author: "ada" });
    // a story's proposals are the admins' alone
    expect((await call("cit", "GET", "/api/proposals")).data.some((p: any) => p.kind === "story_version")).toBe(false);
    expect((await call("cit", "GET", `/api/proposals/${proposed.out.id}`)).status).toBe(404);
    const review = (await call("ada", "GET", `/api/proposals/${proposed.out.id}`)).data;
    expect(review.story.tracks[2].clips[0].custom).toEqual({ kept: true }); // a field no kind names is kept
    expect(review.baseStory).toBeNull();
    expect(review.diff.tracks.map((t: any) => t.state)).toEqual(["added", "added", "added"]);
    expect((await call("cit", "POST", `/api/proposals/${proposed.out.id}/accept`)).status).toBe(403);
    expect((await call("ada", "POST", `/api/proposals/${proposed.out.id}/accept`)).data).toMatchObject({ status: "accepted", number: 1 });
    const story = (await call("ada", "GET", "/api/stories/seed-to-fruit")).data;
    expect(story).toMatchObject({ title: "Seed to fruit", number: 1, duration: 7, note: "a first cut" });
    expect((await tool("propose_story", { story: "seed-to-fruit", title: "Again", note: "x", body: { tracks: tracks(added.out.hash) } })).error).toContain("propose a version");
  });

  test("every clip is editable by a proposed version, made as edits on the head; accepted, it is the new head and the old one stays", async () => {
    const head = (await tool("get_story", { story: "seed-to-fruit" })).out;
    const edited = await tool("propose_story_version", {
      story: "seed-to-fruit", base: head.version, note: "a sharper line, a longer hook, a callout track", title: "From seed to fruit",
      edits: [
        { op: "set_clip", track: "voice", clip: "v2", fields: { line: "Every papaya begins as a black seed in a coat of jelly." } },
        { op: "shift", from: 3, by: 1 },
        { op: "set_clip", track: "shots", clip: "s1", fields: { duration: 4 } },
        { op: "set_clip", track: "voice", clip: "v1", fields: { duration: 4 } },
        { op: "set_clip", track: "notes", clip: "n1", fields: { duration: 8, mood: "↑↑", custom: null } },
        { op: "add_track", track: { id: "callouts", kind: "callout", clips: [{ id: "c1", at: 1, duration: 2, text: "GIANT HERB", style: { y: 0.7 } }] } },
      ],
    });
    expect(edited.error).toBeNull();
    expect(edited.out).toMatchObject({ number: 2, base: head.version, duration: 8 });
    const review = (await call("ada", "GET", `/api/proposals/${edited.out.id}`)).data;
    expect(review.diff.title).toEqual({ from: "Seed to fruit", to: "From seed to fruit" });
    const voice = review.diff.tracks.find((t: any) => t.id === "voice");
    expect(voice.changed.find((c: any) => c.id === "v2").changes.map((x: any) => x.field).sort()).toEqual(["at", "line"]);
    expect(review.diff.tracks.find((t: any) => t.id === "callouts").state).toBe("added");
    expect(review.diff.tracks.find((t: any) => t.id === "notes").changed[0].changes.find((x: any) => x.field === "custom")).toEqual({ field: "custom", from: { kept: true }, to: null });
    expect((await call("ada", "POST", `/api/proposals/${edited.out.id}/accept`)).data).toMatchObject({ status: "accepted", number: 2 });
    const now = (await call("ada", "GET", "/api/stories/seed-to-fruit")).data;
    expect(now).toMatchObject({ number: 2, title: "From seed to fruit", duration: 8 });
    expect(now.versions.map((v: any) => v.number)).toEqual([2, 1]);
    expect(now.tracks.find((t: any) => t.id === "callouts").clips[0]).toEqual({ id: "c1", at: 1, duration: 2, text: "GIANT HERB", style: { y: 0.7 } });
    expect((await call("ada", "GET", "/api/stories/seed-to-fruit?v=1")).data).toMatchObject({ number: 1, title: "Seed to fruit", duration: 7 });
    expect((await call("ada", "GET", "/api/stories/seed-to-fruit?v=9")).status).toBe(404);
    // a version is written once, and history can't be changed under its id
    await expect(db.query(`UPDATE play.story_versions SET title = 'x' WHERE id = $1`, [now.version])).rejects.toThrow(/frozen/);
    await expect(db.query(`DELETE FROM play.story_versions WHERE id = $1`, [now.version])).rejects.toThrow(/never deleted/);
    // the whole timeline given instead of edits: removing a track and a clip
    const whole = await tool("propose_story_version", { story: "seed-to-fruit", base: now.version, note: "no notes", body: { format: "9:16", fps: 30, tracks: now.tracks.filter((t: any) => t.id !== "notes").map((t: any) => (t.id === "shots" ? { ...t, clips: t.clips.slice(0, 1) } : t)) } });
    expect(whole.error).toBeNull();
    const removed = (await call("ada", "GET", `/api/proposals/${whole.out.id}`)).data.diff.tracks;
    expect(removed.find((t: any) => t.id === "notes").state).toBe("removed");
    expect(removed.find((t: any) => t.id === "shots").removed.map((c: any) => c.id)).toEqual(["s2"]);
    // rejected, it stays as a side line in the history, and the head is as it was
    expect((await call("ada", "POST", `/api/proposals/${whole.out.id}/archive`)).data.status).toBe("archived");
    expect((await call("ada", "GET", "/api/stories/seed-to-fruit")).data.number).toBe(2);
    expect((await db.query(`SELECT number FROM play.story_versions WHERE id = $1`, [whole.out.version])).rows[0].number).toBeNull();
  });

  test("of two story proposals made on the same head, the second to be accepted is archived, as an asset's would", async () => {
    const head = (await tool("get_story", { story: "seed-to-fruit" })).out;
    const a = await tool("propose_story_version", { story: "seed-to-fruit", base: head.version, note: "A", edits: [{ op: "set_clip", track: "voice", clip: "v1", fields: { line: "A's line" } }] });
    const b = await tool("propose_story_version", { story: "seed-to-fruit", base: head.version, note: "B", edits: [{ op: "set_clip", track: "voice", clip: "v1", fields: { line: "B's line" } }] });
    expect(a.out.base).toBe(head.version);
    expect(b.out.base).toBe(head.version);
    expect((await call("ada", "POST", `/api/proposals/${a.out.id}/accept`)).data).toMatchObject({ status: "accepted", number: 3 });
    // B was made on a head that is no longer the head: accepting it is refused, and it is kept, archived
    const late = (await call("ada", "POST", `/api/proposals/${b.out.id}/accept`)).data;
    expect(late.status === "archived" || late.error).toBeTruthy();
    expect((await call("ada", "GET", `/api/proposals/${b.out.id}`)).data.status).toBe("archived");
    const now = (await call("ada", "GET", "/api/stories/seed-to-fruit")).data;
    expect(now.version).toBe(a.out.version);
    expect(now.tracks.find((t: any) => t.id === "voice").clips[0].line).toBe("A's line");
    // proposed on a head that moved on, it is refused at once
    expect((await tool("propose_story_version", { story: "seed-to-fruit", base: head.version, note: "late", edits: [{ op: "set_clip", track: "voice", clip: "v1", fields: { line: "C" } }] })).error).toContain("newest version");
  });

  test("a story sounds: an agent adds recordings, and any clip of any track plays one, with its trim, gain, fades, EQ and keys", async () => {
    // a tenth of a second of silence as a WAV, and an MP3's first bytes
    const wav = (n = 4800) => {
      const b = Buffer.alloc(44 + n * 2);
      b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
      b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(48000, 24); b.writeUInt32LE(96000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
      b.write("data", 36); b.writeUInt32LE(n * 2, 40);
      return b;
    };
    const take = await tool("add_story_audio", { data: wav().toString("base64"), media_type: "audio/wav" });
    expect(take.error).toBeNull();
    expect(take.out).toMatchObject({ media_type: "audio/wav", size: 44 + 9600 });
    expect((await tool("add_story_audio", { data: wav().toString("base64"), media_type: "audio/wav" })).out.hash).toBe(take.out.hash);
    const mp3 = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(200, 1)]);
    const cue = await tool("add_story_audio", { data: mp3.toString("base64"), media_type: "audio/mpeg" });
    expect(cue.out.media_type).toBe("audio/mpeg");
    expect((await tool("add_story_audio", { data: frameOf("02.jpg").toString("base64"), media_type: "audio/mpeg" })).error).toContain("MP3, WAV");
    expect((await tool("add_story_audio", { data: wav().toString("base64"), media_type: "audio/mpeg" })).error).toContain("not audio/mpeg");
    // served as audio, never sniffed
    const served = await api.fetch(new Request(`http://play.test/api/files/${take.out.hash}`, { headers: { cookie: who.ada.cookie } }));
    expect(served.headers.get("content-type")).toBe("audio/wav");

    const head = (await tool("get_story", { story: "seed-to-fruit" })).out;
    const frame = head.tracks.find((t: any) => t.id === "shots").clips[0].frame;
    const sounding = await tool("propose_story", {
      story: "seed-to-fruit-heard", title: "Seed to fruit, heard", note: "with its sound",
      body: {
        tracks: [
          ...tracks(frame),
          { id: "music", kind: "music", gain: -12, clips: [{ id: "m1", at: 0, duration: 7, audio: cue.out.hash, audio_in: 2.5, fade_in: 1.5, fade_out: 4, eq: [{ type: "highpass", f: 80 }, { type: "peaking", f: 3000, gain: -3, q: 1.2 }], keys: [[5, -6], [0, 0]] }] },
          { id: "sfx", kind: "sfx", mute: true, clips: [{ id: "x1", at: 1, duration: 1, audio: take.out.hash, gain: 3 }, { id: "x2", at: 1.5, duration: 1, audio: take.out.hash }] },
        ].map((t: any) => (t.id === "voice" ? { ...t, clips: t.clips.map((c: any) => ({ ...c, audio: take.out.hash })) } : t)),
      },
    });
    expect(sounding.error).toBeNull();
    const body = (await call("ada", "GET", `/api/proposals/${sounding.out.id}`)).data.story;
    const music = body.tracks.find((t: any) => t.id === "music");
    expect(music.gain).toBe(-12);
    expect(music.clips[0]).toMatchObject({ audio: cue.out.hash, audio_in: 2.5, fade_in: 1.5, fade_out: 4, keys: [[0, 0], [5, -6]] });
    expect(music.clips[0].eq).toEqual([{ type: "highpass", f: 80, gain: 0, q: 0.707 }, { type: "peaking", f: 3000, gain: -3, q: 1.2 }]);
    expect(body.tracks.find((t: any) => t.id === "sfx")).toMatchObject({ mute: true }); // sound clips may overlap
    expect(body.tracks.find((t: any) => t.id === "voice").clips.every((c: any) => c.audio === take.out.hash)).toBe(true);

    const bad = async (clip: Record<string, unknown>) =>
      (await tool("propose_story", { story: "seed-to-fruit-bad", title: "x", note: "x", body: { tracks: [{ id: "music", kind: "music", clips: [{ id: "m", at: 0, duration: 2, ...clip }] }] } })).error;
    expect(await bad({ audio: "f".repeat(64) })).toContain("add_story_audio first");
    expect(await bad({ audio: frame })).toContain("add_story_audio first"); // an image is no recording
    expect(await bad({ audio: "not-a-hash" })).toContain("recording's file hash");
    expect(await bad({ audio: take.out.hash, gain: 40 })).toContain("gain");
    expect(await bad({ audio: take.out.hash, eq: [{ type: "fuzz", f: 100 }] })).toContain("type is one of");
    expect(await bad({ audio: take.out.hash, eq: [{ type: "lowpass", f: 5 }] })).toContain("frequency");
    expect(await bad({ audio: take.out.hash, keys: [[1, 30]] })).toContain("gain (dB)");
  });

  test("a story proposal is checked whole: its format, its clips, its frames and its times", async () => {
    const head = (await tool("get_story", { story: "seed-to-fruit" })).out;
    const frame = head.tracks.find((t: any) => t.id === "shots").clips[0].frame;
    const edit = (edits: unknown[]) => tool("propose_story_version", { story: "seed-to-fruit", note: "bad", edits });
    expect((await edit([{ op: "set_clip", track: "voice", clip: "v2", fields: { at: 1 } }])).error).toContain("before clip");
    expect((await edit([{ op: "set_clip", track: "shots", clip: "s1", fields: { frame: "0".repeat(64) } }])).error).toContain("add_story_frame");
    expect((await edit([{ op: "set_clip", track: "shots", clip: "s1", fields: { frame: "not a hash" } }])).error).toContain("hash");
    expect((await edit([{ op: "set_clip", track: "voice", clip: "nope", fields: { line: "x" } }])).error).toContain("no clip nope");
    expect((await edit([{ op: "set_clip", track: "voice", clip: "v1", fields: { duration: -2 } }])).error).toContain("duration");
    expect((await edit([{ op: "add_clip", track: "voice", clip: { id: "v1", duration: 1 } }])).error).toContain("Two clips");
    expect((await edit([{ op: "set", fields: { fps: 29.97 } }])).error).toContain("frame rate");
    expect((await edit([{ op: "explode" }])).error).toContain("not an operation");
    expect((await edit([{ op: "set_clip", track: "voice", clip: "v1", fields: { line: head.tracks.find((t: any) => t.id === "voice").clips[0].line } }])).error).toContain("nothing changed");
    expect((await tool("propose_story_version", { story: "seed-to-fruit", note: "both", body: { tracks: [] }, edits: [] })).error).toContain("not both");
    expect((await tool("propose_story_version", { story: "no-such-story", note: "x", edits: [{ op: "set", fields: { fps: 25 } }] })).error).toContain("no story");
    expect((await tool("propose_story", { story: "Bad Name", title: "x", note: "x", body: { tracks: tracks(frame) } })).error).toContain("slug");
    expect((await tool("propose_story", { story: "empty-one", title: "x", note: "x", body: { tracks: [{ id: "voice", kind: "voice", clips: [] }] } })).error).toContain("at least one clip");
  });

  test("the repo's stories are written into Postgres once, as their accepted v1, and never over play's", async () => {
    const dir = mkdtempSync(join(tmpdir(), "play-stories-"));
    mkdirSync(join(dir, "seed-test", "frames"), { recursive: true });
    writeFileSync(join(dir, "seed-test", "frames", "a.jpg"), frameOf("03.jpg"));
    writeFileSync(join(dir, "seed-test", "story.json"), JSON.stringify({ id: "seed-test", title: "Seeded", note: "from the repo", schema: "story/1", tracks: [{ id: "shots", kind: "shots", clips: [{ id: "s1", duration: 2, frame: "a.jpg" }, { id: "s2", duration: 3 }] }] }));
    expect(await seedStories(db, store, dir)).toEqual({ seeded: ["seed-test"], present: [], errors: [], documents: [] });
    const seeded = (await call("ada", "GET", "/api/stories/seed-test")).data;
    expect(seeded).toMatchObject({ number: 1, duration: 5, title: "Seeded", note: "from the repo" });
    expect(await seedStories(db, store, dir)).toEqual({ seeded: [], present: ["seed-test"], errors: [], documents: [] });
    mkdirSync(join(dir, "Bad_Name"));
    expect((await seedStories(db, store, dir)).errors[0]).toMatch(/Bad_Name/);
  });

  // ---- every story is a Loro document too (play/SPEC.md §4.4): every step kept, drafts as branches, versions in step
  test("an agent drafts a change step by step over MCP; proposed and accepted, every step stays in the story's history", async () => {
    const tools = (await (await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${storyToken}` }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }))).json()).result.tools.map((t: any) => t.name);
    expect(tools).toEqual(expect.arrayContaining(["story_edit", "story_history"]));
    const head = (await tool("get_story", { story: "seed-to-fruit" })).out;
    const line = head.tracks.find((t: any) => t.id === "voice").clips[0].line as string;
    const first = await tool("story_edit", { story: "seed-to-fruit", message: "a word in the hook", edits: [{ op: "edit_text", track: "voice", clip: "v1", field: "line", index: 0, insert: "Look: " }] });
    expect(first.error).toBeNull();
    const draft = first.out.branch;
    expect(first.out).toMatchObject({ story: "seed-to-fruit", changed: true, steps: 1 });
    await tool("story_edit", { story: "seed-to-fruit", branch: draft, message: "a longer last shot", edits: [{ op: "set_clip", track: "notes", clip: "n1", fields: { retention: "Payoff first, then the question" } }] });
    const third = await tool("story_edit", { story: "seed-to-fruit", branch: draft, message: "a callout", edits: [{ op: "add_track", track: { id: "titles", kind: "callout", clips: [{ id: "t1", at: 0, duration: 2, text: "SEED" }] } }] });
    expect(third.out.steps).toBe(3);
    // a step that breaks the story is refused and leaves the draft as it was
    expect((await tool("story_edit", { story: "seed-to-fruit", branch: draft, message: "overlap", edits: [{ op: "set_clip", track: "voice", clip: "v1", fields: { duration: 30 } }] })).error).toContain("before clip");
    expect((await tool("story_edit", { story: "seed-to-fruit", branch: draft, message: "range", edits: [{ op: "edit_text", track: "voice", clip: "v1", field: "line", index: 999, insert: "x" }] })).error).toContain("outside");
    // nobody sees a draft as the story
    expect((await call("ada", "GET", "/api/stories/seed-to-fruit")).data.version).toBe(head.version);
    const own = (await tool("story_history", { story: "seed-to-fruit", draft })).out;
    expect(own.steps.map((s: any) => s.message)).toEqual(["a word in the hook", "a longer last shot", "a callout"]);
    expect(own.steps.every((s: any) => s.via === "mcp" && s.author === "ada")).toBe(true);
    // any step reads back as the story was then
    const atFirst = (await tool("get_story", { story: "seed-to-fruit", step: own.steps[0].seq })).out;
    expect(atFirst.tracks.find((t: any) => t.id === "voice").clips[0].line).toBe(`Look: ${line}`);
    expect(atFirst.tracks.some((t: any) => t.id === "titles")).toBe(false);
    // proposed: its steps go with it, to the admins deciding
    const proposed = await tool("propose_story_version", { story: "seed-to-fruit", branch: draft, note: "a sharper hook, drafted in three steps" });
    expect(proposed.error).toBeNull();
    expect(proposed.out).toMatchObject({ branch: draft, steps: 3, base: head.version });
    const review = (await call("ada", "GET", `/api/proposals/${proposed.out.id}`)).data;
    expect(review.steps.map((s: any) => s.message)).toEqual(["a word in the hook", "a longer last shot", "a callout"]);
    expect(review.diff.tracks.find((t: any) => t.id === "titles").state).toBe("added");
    // a proposed draft takes no more steps
    expect((await tool("story_edit", { story: "seed-to-fruit", branch: draft, message: "late", title: "x" })).error).toContain("proposed already");
    const accepted = (await call("ada", "POST", `/api/proposals/${proposed.out.id}/accept`)).data;
    expect(accepted).toMatchObject({ status: "accepted", number: head.number + 1 });
    const hist = (await call("ada", "GET", "/api/stories/seed-to-fruit/history")).data;
    const messages = hist.steps.map((s: any) => s.message);
    for (const m of ["a word in the hook", "a longer last shot", "a callout"]) expect(messages).toContain(m);
    expect(hist.steps.at(-1).kind).toBe("merge");
    expect(hist.steps.at(-1).version).toBe(head.number + 1);
    // the document's versions are the story's, number for number
    expect(hist.versions.map((v: any) => v.number)).toEqual((await call("ada", "GET", "/api/stories/seed-to-fruit")).data.versions.map((v: any) => v.number).reverse());
    expect(hist.drafts.find((d: any) => d.id === draft)).toMatchObject({ status: "accepted", proposal: proposed.out.id, steps: 3 });
    const step = (await call("ada", "GET", `/api/stories/seed-to-fruit/steps/${own.steps[1].seq}`)).data;
    expect(step.tracks.find((t: any) => t.id === "notes").clips[0].retention).toBe("Payoff first, then the question");
    expect((await call("cit", "GET", "/api/stories/seed-to-fruit/history")).status).toBe(403);
  });

  test("two story proposals on one head that touch different fields both go in: the second merged, its parents both", async () => {
    const head = (await tool("get_story", { story: "seed-to-fruit" })).out;
    const a = await tool("propose_story_version", { story: "seed-to-fruit", base: head.version, note: "A: the speaker", edits: [{ op: "set_clip", track: "voice", clip: "v1", fields: { who: "SAMUEL (VO)" } }] });
    const b = await tool("propose_story_version", { story: "seed-to-fruit", base: head.version, note: "B: the camera", edits: [{ op: "set_clip", track: "notes", clip: "n1", fields: { camera: "Low angle, 35 mm" } }] });
    expect((await call("ada", "POST", `/api/proposals/${a.out.id}/accept`)).data).toMatchObject({ status: "accepted", number: head.number + 1 });
    const late = (await call("ada", "POST", `/api/proposals/${b.out.id}/accept`)).data;
    expect(late).toMatchObject({ status: "accepted", number: head.number + 2, merged: true });
    const now = (await call("ada", "GET", "/api/stories/seed-to-fruit")).data;
    expect(now.tracks.find((t: any) => t.id === "voice").clips[0].who).toBe("SAMUEL (VO)");
    expect(now.tracks.find((t: any) => t.id === "notes").clips[0].camera).toBe("Low angle, 35 mm");
    const { rows } = await db.query<{ parents: string[] }>(`SELECT parents FROM play.story_versions WHERE id = $1`, [now.version]);
    expect(rows[0].parents).toEqual([a.out.version, b.out.version]);
    // its content and the document's agree
    const d = (await call("ada", "GET", "/api/stories/seed-to-fruit/history")).data;
    expect(d.versions.at(-1).number).toBe(now.number);
    // archived, a proposal's branch is closed and its step kept on its side line
    const c = await tool("propose_story_version", { story: "seed-to-fruit", note: "C", edits: [{ op: "set", fields: { fps: 25 } }] });
    expect((await call("ada", "POST", `/api/proposals/${c.out.id}/archive`)).data.status).toBe("archived");
    expect((await call("ada", "GET", "/api/stories/seed-to-fruit/history")).data.drafts.find((x: any) => x.id === c.out.branch).status).toBe("archived");
  });

  test("a story from before the documents gets one made from its history: each version a step at its date, an open proposal a branch", async () => {
    const body = (line: string) => ({ schema: "story/1", format: "9:16", fps: 30, duration: 4, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 4, who: "MAIA", line }] }] });
    const v1 = storyVersionId({ story: "old-story", parents: [], title: "Old", body: body("first") });
    const v2 = storyVersionId({ story: "old-story", parents: [v1], title: "Old", body: body("second") });
    const p3 = storyVersionId({ story: "old-story", parents: [v2], title: "Old", body: body("third") });
    await db.query(`INSERT INTO play.stories (id, coop_id, title) VALUES ('old-story', 'maia-city', 'Old')`);
    await db.query(`INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note, created) VALUES ($1, 'old-story', 1, '{}', 'Old', ($2::text)::jsonb, 'one', '2026-10-01T10:00:00Z')`, [v1, JSON.stringify(body("first"))]);
    await db.query(`INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note, created) VALUES ($1, 'old-story', 2, $2, 'Old', ($3::text)::jsonb, 'two', '2026-10-02T10:00:00Z')`, [v2, [v1], JSON.stringify(body("second"))]);
    await db.query(`INSERT INTO play.story_versions (id, story_id, parents, title, body, note, author) VALUES ($1, 'old-story', $2, 'Old', ($3::text)::jsonb, 'three', $4)`, [p3, [v2], JSON.stringify(body("third")), who.ada.id]);
    await db.query(`UPDATE play.stories SET head = $1 WHERE id = 'old-story'`, [v2]);
    const pid = crypto.randomUUID();
    await db.query(`INSERT INTO play.proposals (id, coop_id, kind, story_id, story_base, story_version, author, note, via) VALUES ($1, 'maia-city', 'story_version', 'old-story', $2, $3, $4, 'three', 'mcp')`, [pid, v2, p3, who.ada.id]);
    const h = (await call("ada", "GET", "/api/stories/old-story/history")).data;
    expect(h.steps.map((s: any) => s.message)).toEqual(["v1: one", "v2: two"]);
    expect(h.steps.map((s: any) => s.at.slice(0, 10))).toEqual(["2026-10-01", "2026-10-02"]);
    expect(h.versions.map((v: any) => v.number)).toEqual([1, 2]);
    expect(h.drafts).toHaveLength(1);
    expect((await call("ada", "GET", `/api/stories/old-story/steps/${h.steps[0].seq}`)).data.tracks[0].clips[0].line).toBe("first");
    // the old proposal is a branch now, and accepting it goes through the document like any other
    expect((await call("ada", "POST", `/api/proposals/${pid}/accept`)).data).toMatchObject({ status: "accepted", number: 3 });
    expect((await call("ada", "GET", "/api/stories/old-story")).data.tracks[0].clips[0].line).toBe("third");
    expect((await call("ada", "GET", "/api/stories/old-story/history")).data.versions.map((v: any) => v.number)).toEqual([1, 2, 3]);
  });

  test("stories folded into one: each its versions in turn as the timeline's next, its open proposal moved, then listed no more", async () => {
    const frame = (await tool("add_story_frame", { data: frameOf("02.jpg").toString("base64"), media_type: "image/jpeg" })).out.hash;
    const make = async (story: string, title: string, line: string) => {
      const p = await tool("propose_story", { story, title, note: `${story} v1`, body: { format: "9:16", fps: 30, tracks: tracks(frame, line) } });
      expect(p.error).toBeNull();
      await call("ada", "POST", `/api/proposals/${p.out.id}/accept`);
    };
    await make("fold-a", "Devlog", "one");
    await make("fold-b", "Day 1", "two");
    const b2 = await tool("propose_story_version", { story: "fold-b", note: "fold-b v2", edits: [{ op: "set_clip", track: "voice", clip: "v2", fields: { line: "three" } }] });
    expect(b2.error).toBeNull();
    await call("ada", "POST", `/api/proposals/${b2.out.id}/accept`);
    await make("fold-c", "Three seeds", "four");
    const c2 = await tool("propose_story_version", { story: "fold-c", note: "its voice", edits: [{ op: "set_clip", track: "voice", clip: "v2", fields: { line: "five" } }] });
    expect(c2.error).toBeNull();

    const r = await foldStories(db, [{ into: "fold-a", from: ["fold-b", "fold-c"] }]);
    expect(r).toEqual({ folded: ["fold-b", "fold-c"], present: [], errors: [] });
    const a = (await call("ada", "GET", "/api/stories/fold-a")).data;
    expect(a.versions.map((v: any) => v.number)).toEqual([4, 3, 2, 1]);
    expect(a).toMatchObject({ title: "Three seeds", number: 4 });
    expect(a.tracks.find((t: any) => t.id === "voice").clips[1].line).toBe("four");
    expect(a.versions[2].note).toContain("Brought from story fold-b, its v1");
    const lines = [];
    for (const n of [2, 3]) lines.push((await call("ada", "GET", `/api/stories/fold-a?v=${n}`)).data.tracks.find((t: any) => t.id === "voice").clips[1].line);
    expect(lines).toEqual(["two", "three"]);
    // the open proposal is on the one timeline now, its own archived
    const open = (await call("ada", "GET", "/api/proposals?status=open")).data.filter((p: any) => p.slug === "fold-a");
    expect(open.length).toBe(1);
    expect(open[0].note).toContain("Moved from story fold-c");
    expect((await call("ada", "GET", `/api/proposals/${c2.out.id}`)).data.status).toBe("archived");
    expect((await call("ada", "POST", `/api/proposals/${open[0].id}/accept`)).data).toMatchObject({ status: "accepted", number: 5 });
    // the folded stories are kept but listed no more, and take no proposal
    const listed = (await tool("list_stories", {})).out.items.map((x: any) => x.id);
    expect(listed).toContain("fold-a");
    expect(listed).not.toContain("fold-b");
    expect((await call("ada", "GET", "/api/stories/fold-b")).data.number).toBe(2);
    expect((await tool("propose_story_version", { story: "fold-b", note: "x", edits: [{ op: "set_clip", track: "voice", clip: "v2", fields: { line: "x" } }] })).error).toContain("part of story fold-a");
    // run again: nothing brought twice
    expect(await foldStories(db, [{ into: "fold-a", from: ["fold-b", "fold-c"] }])).toEqual({ folded: [], present: ["fold-b", "fold-c"], errors: [] });
    expect((await call("ada", "GET", "/api/stories/fold-a")).data.number).toBe(5);
  });
});
