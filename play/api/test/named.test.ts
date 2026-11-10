// No new source names an asset by group, slug and version (intent 5723e301-bb2d-4d0a-849b-9040ebad804b; play/SPEC.md
// §4.7: every reference is a UUID or a hash) against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
//
// The rule (../src/recipes.ts namedAssets) reads a source whole, its comments too. A new asset, a changed source and a
// new piece that hold such a name are refused, saying which; the same text naming a hash is taken; an asset accepted
// with such a name before keeps proposing while its source stays what was accepted (a card-only change).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { COOP } from "../src/kit/ids";
import { meOf } from "../src/access";
import { type BlobStore, keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { type Db } from "../src/kit/pg";
import { namedAssets, RECIPE_HEAD, recipeTail } from "../src/recipes";
import { newId } from "../src/kit/uuid";
import { proposeDocVersion } from "../src/versioned";
import { type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";

const HASH = "d263fb371f62595f0a2062bfdab1c70b3d5dc120a131d899cb7fbd0ef7befb67";
const SPEC = fx.spec("A cube is carried.", "One asset. Nothing else changes.");
const SOURCE = (line: string) => `module.exports.recipe = function (id, v, variant) {\n  ${line}\n  return { meta: { id, v, variant }, build: () => null };\n};\n`;
const REFUSED = /names (machines\/powercube@3|biomes\/cover@\$\{V\}:fern) by group, slug and version/;

describe("namedAssets", () => {
  test("finds a name with its version in code, in a string, in a template and in a comment", () => {
    expect(namedAssets('kit.carry(pc, { ref: "machines/powercube@3" });')).toEqual(["machines/powercube@3"]);
    expect(namedAssets("/* `ref` names the asset (`machines/powercube@3`, $lib/assets) */")).toEqual(["machines/powercube@3"]);
    expect(namedAssets("// a papaya's kinds (plants/papaya@3:male)\n// (plants/papaya@3:male) again")).toEqual(["plants/papaya@3:male"]);
    expect(namedAssets("ref: (kind) => `biomes/cover@${COVER_V}:${kind}?seed=1`")).toEqual(["biomes/cover@${COVER_V}"]);
    expect(namedAssets("worlds/tired-land@12 and characters/elder@1")).toEqual(["worlds/tired-land@12", "characters/elder@1"]);
  });
  test("finds none in a hash, a path, a group's own name or a mail address", () => {
    expect(namedAssets(`kit.carry(pc, { ref: "${HASH}?seed=a" });`)).toEqual([]);
    expect(namedAssets("//#region src/lib/biomes/cover.js\n// play's biomes/card.js, $lib/actors/batterypack.js")).toEqual([]);
    expect(namedAssets("throw new Error(`no asset plants/${id}`); // group `worlds`, things@maia.city")).toEqual([]);
  });
});

suite("named", () => {
  let f: Fresh, db: Db, store: BlobStore;
  let api: Api;
  let cookie = "";
  let token = "";
  let ada = "";

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);
  const readyIntent = (title: string) => fx.readyIntent({ tool, approve: (id) => call("POST", `/api/intents/${id}/approve`) }, title, { spec: SPEC, strict: true });
  const keep = async (text: string) => {
    const hash = hashText(text);
    await store.put(hash, new TextEncoder().encode(text), "text/javascript");
    await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [hash, Buffer.byteLength(text), keyOf(hash)]);
    return hash;
  };
  /** an asset accepted before the rule, as the legacy import wrote one: its source's comment names the Power Cube */
  const legacy = async (slug: string) => {
    const asset = newId();
    const source = SOURCE("// carried in from another (`machines/powercube@3`, $lib/assets)");
    const sourceHash = await keep(source);
    const recipe = await keep(RECIPE_HEAD + source + recipeTail(slug, 1, null));
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'machines', $3, $4)`, [asset, COOP, slug, `Legacy ${slug}`]);
    const id = hashText(`legacy ${asset}`);
    const card = { kind: "recipe", source: sourceHash, manifest: { libs: [], pieces: [] }, card: { group: "machines", id: slug, version: 1, v: 1, recipe } };
    await db.query(
      `INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, source_hash, card, note, imported) VALUES ($1, $2, 1, $3, $4, ($5::text)::jsonb, 'imported', '{"from":"legacy"}')`,
      [id, asset, recipe, sourceHash, JSON.stringify(card)],
    );
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [asset, id]);
    return asset;
  };

  beforeAll(async () => {
    f = await freshDb({ prefix: "play_named" });
    db = f.db;
    store = tempStore();
    api = appOn(db, { store });
    ({ cookie, id: ada } = await human(db, "ada"));
    token = (await call("POST", "/api/tokens", { name: "agent" })).data.token;
  });
  afterAll(async () => {
    await f?.drop();
  });

  test("a new asset naming another by group, slug and version is refused, in code and in a comment; by hash it is taken", async () => {
    const propose = async (label: string, line: string) =>
      tool("propose_asset", { lod: { levels: "derived" }, group: "machines", label, note: "new", source: SOURCE(line), intent: await readyIntent(label) });
    expect((await propose("A cube by name", 'const ref = "machines/powercube@3";')).error).toMatch(REFUSED);
    expect((await propose("A cube by a worked-out name", "const ref = (V) => `biomes/cover@${V}:fern`;")).error).toMatch(REFUSED);
    expect((await propose("A cube named in a comment", "// its guest (`machines/powercube@3`)")).error).toMatch(REFUSED);
    expect((await propose("A cube by hash", `const ref = "${HASH}"; // its guest, by its recipe's hash`)).error).toBeUndefined();
  });

  test("an asset accepted with such a name: its card alone still changes; its source changes only without the name", async () => {
    const asset = await legacy("cube-host");
    const card = await readyIntent("Its card alone");
    const e = await tool("doc_edit", { doc: asset, intent: card, message: "its level of detail", edits: [{ op: "set", path: ["card", "card", "lod"], value: { levels: "derived" } }] });
    expect(e.error).toBeUndefined();
    expect((await tool("propose_doc_version", { doc: asset, intent: card, variant: e.variant, note: "Its card alone." })).error).toBeUndefined();

    const kept = await readyIntent("Its source, the name kept");
    const k = await tool("doc_edit", { doc: asset, intent: kept, message: "another word", edits: [{ op: "replace", find: "carried in", replace: "brought in" }] });
    expect(k.error).toBeUndefined();
    expect((await tool("propose_doc_version", { doc: asset, intent: kept, variant: k.variant, note: "The name kept." })).error).toMatch(REFUSED);

    const gone = await readyIntent("Its source, by hash");
    const g = await tool("doc_edit", { doc: asset, intent: gone, message: "named by hash", edits: [{ op: "replace", find: "`machines/powercube@3`, $lib/assets", replace: `its recipe's hash, ${HASH.slice(0, 12)}…` }, { op: "set", path: ["card", "card", "lod"], value: { levels: "derived" } }] });
    expect(g.error).toBeUndefined();
    expect((await tool("propose_doc_version", { doc: asset, intent: gone, variant: g.variant, note: "By hash." })).error).toBeUndefined();
  });

  test("a new piece naming an asset by group, slug and version is refused; without the name it is taken", async () => {
    const me = () => meOf(db, ada);
    const piece = (line: string) => `// the kit's parts, as written\n${line}\nmodule.exports.parts = 4;\n`;
    const propose = async (label: string, line: string) => proposeDocVersion({ db, store }, await me(), { kind: "piece", whole: { schema: "piece/1", label, source: piece(line) }, note: `${label}, a piece`, intent: await readyIntent(label) });
    await expect(propose("Parts by name", "// `ref` names the asset at its version (`machines/powercube@3`)")).rejects.toThrow(REFUSED);
    expect((await propose("Parts by hash", "// `ref` names the asset by its recipe's hash")).doc).toBeTruthy();
  });
});
