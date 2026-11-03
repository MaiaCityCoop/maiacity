// The API against a real Postgres: set TEST_DATABASE_URL (a server where this may create and drop a database), e.g.
// postgres://postgres@127.0.0.1:5544/postgres. Without it these tests are skipped.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore, type BlobStore } from "../src/blobs";
import { importSources } from "../import/sources";
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
    await call("cit", "POST", `/api/proposals/${p.data.id}/withdraw`);
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
});
