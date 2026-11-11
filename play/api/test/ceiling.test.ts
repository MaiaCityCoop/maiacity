// A new asset, or a version whose source changed, carries its own levels of detail and the triangles of its finest
// shape, within the ceiling (intent a7507347; ../src/lod.ts `heldLod`, `CEILING`; play/SPEC.md §4.5) against a real
// Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
//
// The rule is held where a version is proposed, whichever way it comes: propose_asset (a new asset), propose_doc_version
// (its edits at once) and doc_edit followed by propose_doc_version with its `variant`. A touched source is refused with
// its levels derived, without `lod.tris`, or with more than the ceiling, saying the count, the ceiling and what is
// missing, and nothing is written; declared and within the ceiling it is taken, its card holding its levels' values
// beside its count. A version that changes its card alone (the source its head was accepted with) is held as before.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { COOP } from "../src/kit/ids";
import { type BlobStore, keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { type Db } from "../src/kit/pg";
import { CEILING, ceilingOf, heldLod, LodError } from "../src/lod";
import { RECIPE_HEAD, recipeTail } from "../src/recipes";
import { newId } from "../src/kit/uuid";
import { type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";
import { DETAIL, LEVELS, VALUES } from "./fixtures/lod";

const SPEC = fx.spec("A shrub is lighter.", "One asset. Nothing else changes.");
/** a source as one was written before the rule: it exports no levels of its own */
const BARE = (line: string) => `module.exports.recipe = function (id, v, variant) {\n  // ${line}\n  return { meta: { id, v, variant }, build: () => null };\n};\n`;
const END = "build: () => null };\n};\n";
const SOURCE = (line: string) => BARE(line) + LEVELS;
const n = (count: number) => count.toLocaleString("en-US");
/** a count far over the ceiling (a papaya's, before it was made lighter) */
const HEAVY = 1_989_351;
const PARAMS = ["detail"];

describe("heldLod", () => {
  const held = (lod: unknown, source: string, touched: boolean) => heldLod(lod, source, PARAMS, "A new asset version", { touched, group: "plants" });
  const refusal = (lod: unknown, source: string, touched = true): string => {
    try {
      held(lod, source, touched);
    } catch (e) {
      expect(e).toBeInstanceOf(LodError);
      return (e as Error).message;
    }
    throw new Error("it was taken");
  };

  test("the ceiling is 300,000 triangles, for every group", () => {
    expect(CEILING).toBe(300_000);
    for (const g of [undefined, "plants", "worlds", "machines"]) expect(ceilingOf(g)).toBe(CEILING);
  });

  test("touched: derived, without its count or over the ceiling it is refused, saying the count, the ceiling and what is missing", () => {
    // derived, its source exporting none: both are missing
    const both = refusal({ levels: "derived" }, BARE("a shrub"));
    expect(both).toContain(`stays within ${n(CEILING)} triangles`);
    expect(both).toContain("Missing: its own lighter levels");
    expect(both).toContain("lod.tris");
    // derived with its count: only its levels are missing; declared on the card alone, its source exporting none, too
    expect(refusal({ levels: "derived", tris: 1200 }, BARE("a shrub"))).toContain("Missing: its own lighter levels");
    expect(refusal({ levels: "derived", tris: 1200 }, BARE("a shrub"))).not.toContain("lod.tris, at most");
    expect(refusal({ levels: "declared", tris: 1200 }, BARE("a shrub"))).toContain("Missing: its own lighter levels");
    expect(refusal({ levels: "derived", tris: 1200 }, SOURCE("a shrub"))).toContain("Missing: its own lighter levels");
    // declared, its count missing
    const count = refusal({ levels: "declared" }, SOURCE("a shrub"));
    expect(count).toContain(`lod.tris, at most ${n(CEILING)}`);
    expect(count).not.toContain("its own lighter levels");
    // over the ceiling: its count, the ceiling, and by how many
    const over = refusal({ levels: "declared", tris: HEAVY }, SOURCE("a shrub"));
    expect(over).toContain(`${n(HEAVY)} triangles`);
    expect(over).toContain(n(CEILING));
    expect(over).toContain(`${n(HEAVY - CEILING)} over`);
    expect(over).not.toContain("Missing");
    expect(refusal({ levels: "declared", tris: CEILING + 1 }, SOURCE("a shrub"))).toContain("1 over");
    // over and derived: each is said
    const all = refusal({ levels: "derived", tris: HEAVY }, BARE("a shrub"));
    expect(all).toContain(n(HEAVY));
    expect(all).toContain("Missing: its own lighter levels");
    // no lod at all is refused as it always was
    expect(refusal(undefined, SOURCE("a shrub"))).toContain("names its levels of detail on its card");
  });

  test("touched: declared and within the ceiling it is taken, its levels' values read from its source", () => {
    expect(held({ levels: "declared", tris: 1200 }, SOURCE("a shrub"), true)).toEqual({ levels: "declared", tris: 1200, values: VALUES });
    expect(held({ levels: "declared", tris: CEILING }, SOURCE("a shrub"), true)).toEqual({ levels: "declared", tris: CEILING, values: VALUES });
    expect(held({ levels: "declared", tris: 1, budgets: [4000, 1200, 320] }, SOURCE("a shrub"), true)).toEqual({ levels: "declared", tris: 1, budgets: [4000, 1200, 320], values: VALUES });
  });

  test("untouched (its card alone): held as before, derived and a count over the ceiling let be", () => {
    expect(held({ levels: "derived" }, BARE("a shrub"), false)).toEqual({ levels: "derived" });
    expect(held({ levels: "derived", budgets: [4000, 1200, 320] }, BARE("a shrub"), false)).toEqual({ levels: "derived", budgets: [4000, 1200, 320] });
    expect(held({ levels: "declared" }, SOURCE("a shrub"), false)).toEqual({ levels: "declared", values: VALUES });
    expect(held({ levels: "declared", tris: HEAVY }, SOURCE("a shrub"), false)).toEqual({ levels: "declared", tris: HEAVY, values: VALUES });
    // (untouched is what it is when nothing says otherwise)
    expect(heldLod({ levels: "derived" }, BARE("a shrub"), PARAMS)).toEqual({ levels: "derived" });
    // and still held to its source
    expect(refusal({ levels: "derived" }, SOURCE("a shrub"), false)).toContain("name them with lod.levels 'declared'");
    expect(refusal({ levels: "declared" }, BARE("a shrub"), false)).toContain("declares none");
  });
});

suite("ceiling", () => {
  let f: Fresh, db: Db, store: BlobStore;
  let api: Api;
  let cookie = "";
  let token = "";

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);
  const readyIntent = (title: string) => fx.readyIntent({ tool, approve: (id) => call("POST", `/api/intents/${id}/approve`) }, title, { spec: SPEC, strict: true });
  const accept = async (intent: string) => (await call("POST", `/api/intents/${intent}/accept`)).data;
  const versions = async () => (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM play.asset_versions`)).rows[0].n;
  const lodOf = async (version: string) => (await db.query<any>(`SELECT card FROM play.asset_versions WHERE id = $1`, [version])).rows[0].card.card.lod;
  const keep = async (text: string) => {
    const hash = hashText(text);
    await store.put(hash, new TextEncoder().encode(text), "text/javascript");
    await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [hash, Buffer.byteLength(text), keyOf(hash)]);
    return hash;
  };
  /**
   * An asset accepted before the rule, written straight into play's tables (it can no longer be proposed): its source
   * exports no levels, its card says derived and carries no count.
   */
  const legacy = async (slug: string) => {
    const asset = newId();
    const source = BARE(`${slug}, from before the ceiling`);
    const sourceHash = await keep(source);
    const recipe = await keep(RECIPE_HEAD + source + recipeTail(slug, 1, null));
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', $3, $4)`, [asset, COOP, slug, `Legacy ${slug}`]);
    const id = hashText(`legacy ${asset}`);
    const card = { kind: "recipe", source: sourceHash, manifest: { libs: [], pieces: [] }, card: { group: "plants", id: slug, version: 1, v: 1, recipe, lod: { levels: "derived" } } };
    await db.query(
      `INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, source_hash, card, note, imported) VALUES ($1, $2, 1, $3, $4, ($5::text)::jsonb, 'imported', '{"from":"legacy"}')`,
      [id, asset, recipe, sourceHash, JSON.stringify(card)],
    );
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [asset, id]);
    return asset;
  };
  /** the refusals of a touched source, each checked for what it says; `propose(lod)` proposes it with that `lod` */
  const refusals = async (propose: (lod: Record<string, unknown>, own: boolean) => Promise<any>) => {
    const before = await versions();
    // its levels derived (its source exporting none): refused, both missing
    const derived = (await propose({ levels: "derived" }, false)).error as string;
    expect(derived).toContain(`stays within ${n(CEILING)} triangles`);
    expect(derived).toContain("Missing: its own lighter levels");
    expect(derived).toContain("lod.tris");
    // derived with a count within the ceiling: still refused, its own levels missing
    expect((await propose({ levels: "derived", tris: 1200 }, false)).error).toContain("Missing: its own lighter levels");
    // declared, exported by its source, without its count
    const count = (await propose({ levels: "declared" }, true)).error as string;
    expect(count).toContain(`Missing: its finest shape's triangle count on its card (lod.tris, at most ${n(CEILING)}`);
    expect(count).not.toContain("its own lighter levels");
    // over the ceiling: the count, the ceiling
    const over = (await propose({ levels: "declared", tris: HEAVY }, true)).error as string;
    expect(over).toContain(n(HEAVY));
    expect(over).toContain("1,989,351");
    expect(over).toContain("300,000");
    expect(over).toContain(`${n(HEAVY - CEILING)} over`);
    expect((await propose({ levels: "declared", tris: CEILING + 1 }, true)).error).toContain(`${n(CEILING + 1)} triangles, 1 over`);
    // over and derived: the count, the ceiling and what is missing, in one refusal
    const all = (await propose({ levels: "derived", tris: HEAVY }, false)).error as string;
    expect(all).toContain("1,989,351");
    expect(all).toContain("300,000");
    expect(all).toContain("Missing: its own lighter levels");
    // nothing was written
    expect(await versions()).toBe(before);
  };

  beforeAll(async () => {
    f = await freshDb({ prefix: "play_ceiling" });
    db = f.db;
    store = tempStore();
    api = appOn(db, { store });
    ({ cookie } = await human(db, "ada"));
    token = (await call("POST", "/api/tokens", { name: "agent" })).data.token;
  });
  afterAll(async () => {
    await f?.drop();
  });

  test("propose_asset: a new asset is refused derived, without its count or over the ceiling; declared and within it, it is taken", async () => {
    let k = 0;
    const propose = async (lod: Record<string, unknown>, own: boolean, label = `A shrub ${++k}`) =>
      tool("propose_asset", { group: "plants", label, note: "new", source: (own ? SOURCE : BARE)(label), lod, params: DETAIL, intent: await readyIntent(label) });
    await refusals(propose);
    // without any lod it is refused as it always was
    expect((await tool("propose_asset", { group: "plants", label: "No lod", note: "new", source: SOURCE("no lod"), params: DETAIL, intent: await readyIntent("No lod") })).error).toContain("names its levels of detail on its card");
    // taken: within the ceiling, and at the ceiling itself
    const before = await versions();
    const light = await propose({ levels: "declared", tris: 1200 }, true, "A light shrub");
    expect(light.error).toBeUndefined();
    expect(await lodOf(light.version)).toEqual({ levels: "declared", tris: 1200, values: VALUES });
    const most = await propose({ levels: "declared", tris: CEILING }, true, "A shrub at the ceiling");
    expect(most.error).toBeUndefined();
    expect(await lodOf(most.version)).toEqual({ levels: "declared", tris: CEILING, values: VALUES });
    expect(await versions()).toBe(before + 2);
  });

  test("propose_doc_version: a changed source is held to the rule, its head's card carried on or its own; its card alone is held as before", async () => {
    // a head accepted under the rule
    const first = await tool("propose_asset", { group: "plants", label: "A hedge", note: "new", source: SOURCE("a hedge"), lod: { levels: "declared", tris: 1200 }, params: DETAIL, intent: await readyIntent("A hedge") });
    expect(first.error).toBeUndefined();
    expect((await accept(first.intent)).decision).toMatchObject({ status: "accepted", number: 1 });
    let k = 0;
    const propose = async (lod: Record<string, unknown> | null, own: boolean, source = (own ? SOURCE : BARE)(`a hedge, cut ${++k}`)) =>
      tool("propose_doc_version", { doc: first.asset, note: "A hedge, cut.", edits: [{ op: "set", path: ["source"], value: source }, ...(lod ? [{ op: "set", path: ["card", "card", "lod"], value: lod }] : [])], intent: await readyIntent(`A hedge, cut ${k}`) });
    await refusals(propose);
    // a source that drops its levels is refused though its head's card, carried on, is declared with its count
    const before = await versions();
    expect((await propose(null, false)).error).toContain("Missing: its own lighter levels");
    expect(await versions()).toBe(before);
    // taken: its head's card carried on (declared, 1,200), and its own count at the ceiling itself
    const carried = await propose(null, true);
    expect(carried.error).toBeUndefined();
    expect(await lodOf(carried.version)).toEqual({ levels: "declared", tris: 1200, values: VALUES });
    const most = await propose({ levels: "declared", tris: CEILING }, true);
    expect(most.error).toBeUndefined();
    expect(await lodOf(most.version)).toEqual({ levels: "declared", tris: CEILING, values: VALUES });
    expect(await versions()).toBe(before + 2);

    // a head from before the rule (derived, no count): its card alone still changes, at once
    const old = await legacy("old-hedge");
    const card = await tool("propose_doc_version", { doc: old, note: "Its budgets.", edits: [{ op: "set", path: ["card", "card", "lod"], value: { levels: "derived", budgets: [4000, 1200, 320] } }], intent: await readyIntent("An old hedge's budgets") });
    expect(card.error).toBeUndefined();
    expect(await lodOf(card.version)).toEqual({ levels: "derived", budgets: [4000, 1200, 320] });
    // its source changed with it, the same card is refused
    const after = await versions();
    const changed = await tool("propose_doc_version", { doc: old, note: "Taller.", edits: [{ op: "set", path: ["source"], value: BARE("old-hedge, taller") }, { op: "set", path: ["card", "card", "lod"], value: { levels: "derived", budgets: [4000, 1200, 320] } }], intent: await readyIntent("An old hedge, taller") });
    expect(changed.error).toContain("changes its source, so it carries its own levels of detail");
    expect(changed.error).toContain("Missing: its own lighter levels");
    expect(changed.error).toContain("lod.tris");
    expect(await versions()).toBe(after);
    // four proposals and a doc version each against Postgres: under 1 s alone, past bun's 5 s while the whole suite runs
    // in parallel on CI's runner (twice on #2261)
  }, 30_000);

  test("doc_edit, then propose_doc_version with its variant: its card alone is taken from a derived head; its source changed, it is held to the rule edit by edit", async () => {
    const asset = await legacy("old-shrub");
    // its card alone (a derived head with no count): taken and accepted, the head still derived
    const alone = await readyIntent("An old shrub's budgets");
    const c = await tool("doc_edit", { doc: asset, intent: alone, message: "its budgets", edits: [{ op: "set", path: ["card", "card", "lod"], value: { levels: "derived", budgets: [4000, 1200, 320] } }] });
    expect(c.error).toBeUndefined();
    const cp = await tool("propose_doc_version", { doc: asset, intent: alone, variant: c.variant, note: "Its budgets." });
    expect(cp.error).toBeUndefined();
    expect(await lodOf(cp.version)).toEqual({ levels: "derived", budgets: [4000, 1200, 320] });
    expect((await accept(alone)).decision).toMatchObject({ status: "accepted", number: 2 });

    // its source changed: one intent variant, edited until it holds
    const intent = await readyIntent("An old shrub, lighter");
    const before = await versions();
    const edit = async (message: string, edits: unknown[], variant?: number) => {
      const e = await tool("doc_edit", { doc: asset, intent, message, edits, ...(variant === undefined ? {} : { variant }) });
      expect(e.error).toBeUndefined();
      return e.variant as number;
    };
    const propose = (variant: number) => tool("propose_doc_version", { doc: asset, intent, variant, note: "An old shrub, lighter." });
    const lod = (value: Record<string, unknown>) => ({ op: "set", path: ["card", "card", "lod"], value });
    // derived as its head is, its source exporting none: refused, both missing
    const variant = await edit("a word in its comment", [{ op: "replace", find: "from before the ceiling", replace: "made lighter" }]);
    const derived = (await propose(variant)).error as string;
    expect(derived).toContain(`stays within ${n(CEILING)} triangles`);
    expect(derived).toContain("Missing: its own lighter levels");
    expect(derived).toContain("lod.tris");
    // its source exports its levels, its card still derived: refused
    await edit("its own levels", [{ op: "replace", find: END, replace: END + LEVELS }, { op: "set", path: ["card", "card", "params"], value: DETAIL }], variant);
    expect((await propose(variant)).error).toContain("Missing: its own lighter levels");
    // declared, without its count: refused
    await edit("declared", [lod({ levels: "declared" })], variant);
    const count = (await propose(variant)).error as string;
    expect(count).toContain("lod.tris");
    expect(count).not.toContain("its own lighter levels");
    // its count over the ceiling: refused, saying the count and the ceiling
    await edit("its count", [lod({ levels: "declared", tris: HEAVY })], variant);
    const over = (await propose(variant)).error as string;
    expect(over).toContain("1,989,351");
    expect(over).toContain("300,000");
    expect(over).toContain(`${n(HEAVY - CEILING)} over`);
    // over and derived again: the count, the ceiling and what is missing
    await edit("derived again", [lod({ levels: "derived", tris: HEAVY })], variant);
    const all = (await propose(variant)).error as string;
    expect(all).toContain("1,989,351");
    expect(all).toContain("300,000");
    expect(all).toContain("Missing: its own lighter levels");
    // nothing was written by any of them
    expect(await versions()).toBe(before);
    // at the ceiling itself: taken, its card holding its levels' values beside its count, and accepted
    await edit("made lighter", [lod({ levels: "declared", tris: CEILING })], variant);
    const taken = await propose(variant);
    expect(taken.error).toBeUndefined();
    expect(await lodOf(taken.version)).toEqual({ levels: "declared", tris: CEILING, values: VALUES });
    expect(await versions()).toBe(before + 1);
    expect((await accept(intent)).decision).toMatchObject({ status: "accepted", number: 3 });
  });
});
