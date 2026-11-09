// A version that keeps its accepted source proposes, even when that source has long lines (intent
// 80bbed15-4d7c-4bf1-a7cf-ae606fbfaaa8) against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
//
// c1: an asset accepted with a 46,925-character line in its source (as the legacy import wrote Stand-in and Elder woman,
// their meshes as base64); a doc_edit of its card's group alone proposes cleanly; an edit that also changes its source
// and keeps a long line is refused with the readable message; a new asset with a long line is refused. Both shapes
// the legacy people come in: a version with its own source, and a version of variants (breeds).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { COOP } from "../src/kit/ids";
import { type BlobStore, keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { type Db } from "../src/kit/pg";
import { RECIPE_HEAD, recipeTail } from "../src/recipes";
import { newId } from "../src/kit/uuid";
import { type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";

const SPEC = fx.spec("A person moves.", "One asset. Nothing else changes.");
/** a 46,925-character line, as Stand-in's embedded mesh is */
const MESH = "A".repeat(46925 - '  const MESH = "";'.length);
const LONG = (line: string) => `module.exports.recipe = function (id, v, variant) {\n  // ${line}\n  const MESH = "${MESH}";\n  return { meta: { id, v, variant }, build: () => null };\n};\n`;
const READABLE = (line: string) => `module.exports.recipe = function (id, v, variant) {\n  // ${line}\n  return { meta: { id, v, variant }, build: () => null };\n};\n`;
const LONG_REFUSED = /The source is not readable: a line of it is \d+ characters long/;

suite("readable", () => {
  let f: Fresh, db: Db, store: BlobStore;
  let api: Api;
  let cookie = "";
  let token = "";

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);
  const readyIntent = (title: string) => fx.readyIntent({ tool, approve: (id) => call("POST", `/api/intents/${id}/approve`) }, title, { spec: SPEC, strict: true });
  const accept = async (intent: string) => (await call("POST", `/api/intents/${intent}/accept`)).data;
  const groupOf = async (asset: string) => (await db.query<{ grp: string }>(`SELECT grp FROM play.assets WHERE id = $1`, [asset])).rows[0].grp;

  /** a file kept as play keeps it: in the store and in play.files */
  const keep = async (text: string) => {
    const hash = hashText(text);
    await store.put(hash, new TextEncoder().encode(text), "text/javascript");
    await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [hash, Buffer.byteLength(text), keyOf(hash)]);
    return hash;
  };
  const record = (slug: string, variant: string | null, recipe: string, source: string) => ({ kind: "recipe", source, manifest: { libs: [], pieces: [] }, card: { group: "actors", id: slug, version: 1, v: 1, ...(variant ? { variant } : {}), recipe } });
  /**
   * An asset accepted as the legacy import wrote one (no proposal: straight into play's tables), its source with a
   * 46,925-character line: its own source, or (`variants`) a version of variants, each its own recipe from that source.
   */
  const legacy = async (slug: string, variants: string[] | null) => {
    const asset = newId();
    const source = LONG(slug);
    const sourceHash = await keep(source);
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'actors', $3, $4)`, [asset, COOP, slug, `Legacy ${slug}`]);
    const id = hashText(`legacy ${asset}`);
    if (!variants) {
      const recipe = await keep(RECIPE_HEAD + source + recipeTail(slug, 1, null));
      await db.query(
        `INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, source_hash, card, note, imported) VALUES ($1, $2, 1, $3, $4, ($5::text)::jsonb, 'imported', '{"from":"legacy"}')`,
        [id, asset, recipe, sourceHash, JSON.stringify(record(slug, null, recipe, sourceHash))],
      );
    } else {
      const recipes = await Promise.all(variants.map((v) => keep(RECIPE_HEAD + source + recipeTail(slug, 1, v))));
      await db.query(
        `INSERT INTO play.asset_versions (id, asset_id, number, default_variant, card, note, imported) VALUES ($1, $2, 1, $3, ($4::text)::jsonb, 'imported', '{"from":"legacy"}')`,
        [id, asset, variants[0], JSON.stringify(record(slug, variants[0], recipes[0], sourceHash))],
      );
      for (const [i, v] of variants.entries())
        await db.query(`INSERT INTO play.asset_variants (version_id, name, recipe_hash, source_hash, card) VALUES ($1, $2, $3, $4, ($5::text)::jsonb)`, [id, v, recipes[i], sourceHash, JSON.stringify(record(slug, v, recipes[i], sourceHash))]);
    }
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [asset, id]);
    return asset;
  };

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    store = tempStore();
    api = appOn(db, { store });
    ({ cookie } = await human(db, "ada"));
    token = (await call("POST", "/api/tokens", { name: "agent" })).data.token;
  });
  afterAll(async () => {
    await f?.drop();
  });

  test("the fixture's source has a 46,925-character line", () => {
    expect(Math.max(...LONG("x").split("\n").map((l) => l.length))).toBe(46925);
  });

  for (const [shape, variants] of [["its own source", null], ["a version of variants (breeds)", ["elder", "younger"]]] as const) {
    describe(shape, () => {
      let asset = "";
      beforeAll(async () => {
        asset = await legacy(variants ? "breeds-person" : "own-person", variants ? [...variants] : null);
      });

      test("a card-only change (its group) proposes cleanly and is accepted", async () => {
        const intent = await readyIntent(`Move ${shape}`);
        const e = await tool("doc_edit", { doc: asset, intent, message: "to the characters", edits: [{ op: "set", path: ["card", "card", "group"], value: "characters" }, { op: "set", path: ["card", "card", "lod"], value: { levels: "derived" } }] });
        expect(e.error).toBeUndefined();
        expect(e.changed).toBe(true);
        const p = await tool("propose_doc_version", { doc: asset, intent, variant: e.variant, note: "A person: to the characters." });
        expect(p.error).toBeUndefined();
        expect((await accept(intent)).decision).toMatchObject({ status: "accepted", number: 2 });
        expect(await groupOf(asset)).toBe("characters");
      });

      test("a changed source that keeps a long line is still refused", async () => {
        const intent = await readyIntent(`Change ${shape}`);
        const e = await tool("doc_edit", { doc: asset, intent, message: "a changed comment, the long line kept", edits: [{ op: "replace", find: "// ", replace: "// changed: " }] });
        expect(e.error).toBeUndefined();
        const p = await tool("propose_doc_version", { doc: asset, intent, variant: e.variant, note: "A changed source." });
        expect(p.error).toMatch(LONG_REFUSED);
      });
    });
  }

  test("a new asset with a long line is refused", async () => {
    const made = await tool("propose_asset", { lod: { levels: "derived" }, group: "characters", label: "A new person", note: "new", source: LONG("new"), intent: await readyIntent("A new person") });
    expect(made.error).toMatch(LONG_REFUSED);
    const ok = await tool("propose_asset", { lod: { levels: "derived" }, group: "characters", label: "A readable person", note: "new", source: READABLE("new"), intent: await readyIntent("A readable person") });
    expect(ok.error).toBeUndefined();
  });
});
