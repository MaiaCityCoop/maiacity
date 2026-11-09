// Pieces proposed together (play/SPEC.md §4.5; intent 02e3a85f) against a real Postgres: set TEST_DATABASE_URL, as for
// api.test.ts. A recipe or piece may require a piece version proposed in the same intent; one intent may carry several
// versions of one piece; Accept keeps the pieces first, in the order they require each other, then what requires them,
// in one transaction, or none of it.
//
// Its three parts are run on their own (intent 02e3a85f's checks: `-t same`, `-t versions`, `-t order`): each describe
// makes its own database, and every test's name matches exactly one of those words, its describe's.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { meOf } from "../src/access";
import { proposeAsset, recipeAt } from "../src/assetdocs";
import { createHuman } from "../src/auth";
import { folderStore, type BlobStore } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/kit/pg";
import { MOST_DEEP, PieceError, resolvePieces, type Known } from "../src/pieces";
import { decide, docAt, proposeDocVersion, reviewOf } from "../src/versioned";
import "../src/allkinds";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;
const COOP = "12f8d4e7-701f-8727-a327-de9b240ea867";

const pieceSource = (n: number) => `// a kit, as written\nmodule.exports.wheels = ${n};\n`;
const onTop = (below: string, n: number) => `// a layer on the one below\nconst below = require("${below}");\nmodule.exports.wheels = below.wheels + ${n};\n`;
const assetSource = (...pieces: string[]) =>
  `${pieces.map((p, i) => `const p${i} = require("${p}");\n`).join("")}module.exports.recipe = function (id, v, variant) {\n  return { meta: { id, v, variant }, build() { return ${pieces.length ? "p0.wheels" : "0"}; } };\n};\n`;

/** a database of its own for one describe, migrated, with an admin: what every part needs, under any `-t` filter */
function fixture(tag: string) {
  const f = {} as { admin: Bun.SQL; sql: Bun.SQL; db: Db; name: string; store: BlobStore; ada: string };
  beforeAll(async () => {
    f.name = `play_intentpieces_${tag}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    f.admin = new Bun.SQL(URL_!);
    await f.admin.unsafe(`CREATE DATABASE ${f.name}`);
    const u = new URL(URL_!);
    u.pathname = `/${f.name}`;
    f.sql = new Bun.SQL(u.toString());
    f.db = fromBunSql(f.sql);
    await migrate(f.db);
    f.store = folderStore(mkdtempSync(join(tmpdir(), "play-intentpieces-")));
    f.ada = (await createHuman(f.db, "ada")).id;
    await f.db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [f.ada]);
  });
  afterAll(async () => {
    await f.sql?.close();
    await f.admin?.unsafe(`DROP DATABASE IF EXISTS ${f.name} WITH (FORCE)`);
    await f.admin?.close();
  });
  const ctx = () => ({ db: f.db, store: f.store });
  const me = () => meOf(f.db, f.ada);
  /** an intent in Build, its spec approved and its one must check passed (no work without an intent) */
  const building = async (title: string) => {
    const id = crypto.randomUUID();
    const spec = { goal: "It changes.", scope: "A test fixture.", checks: [{ id: "c1", check: "It holds", how: "test", by: "true", run: "true", must: true, step: "mvp" }] };
    const results = { c1: { pass: true, evidence: "exit 0", by: null, at: new Date().toISOString() } };
    await f.db.query(
      `INSERT INTO play.intents (id, coop_id, kind, title, stage, author, via, spec, results, approved_by, approved_at) VALUES ($1, $2, 'improve', $3, 'build', $4, 'mcp', ($5::text)::jsonb, ($6::text)::jsonb, $4, now())`,
      [id, COOP, title, f.ada, JSON.stringify(spec), JSON.stringify(results)],
    );
    return id;
  };
  /** a new piece proposed in intent `intent`: its UUID and its source's hash */
  const piece = async (intent: string, label: string, source: string) => {
    const p = await proposeDocVersion(ctx(), await me(), { kind: "piece", whole: { schema: "piece/1", label, source }, note: `${label}, a piece`, intent });
    return { doc: p.doc as string, hash: hashText(source) };
  };
  /** a new asset proposed in intent `intent` on `source` */
  const host = async (intent: string, label: string, source: string) =>
    proposeAsset(f.db, f.store, await me(), { card: { lod: { levels: "derived" } }, new: { group: "machines", label }, note: `${label}, a host`, source, intent });
  const versionsOf = async (doc: string) =>
    (await f.db.query<{ number: number; hash: string }>(`SELECT number, hash FROM play.piece_versions WHERE piece_id = $1 ORDER BY number`, [doc])).rows;
  const manifest = async (version: string) => (await f.db.query<any>(`SELECT card FROM play.asset_versions WHERE id = $1`, [version])).rows[0].card.manifest;
  /** the documents' Accept merges (play.doc_edits' seq is one sequence), oldest first */
  const merged = async (docIds: string[]) =>
    (await f.db.query<{ doc_id: string }>(`SELECT doc_id FROM play.doc_edits WHERE doc_id = ANY($1::text[]) AND kind = 'merge' ORDER BY seq`, [docIds])).rows.map((r) => r.doc_id);
  return { f, ctx, me, building, piece, host, versionsOf, manifest, merged };
}

suite("pieces together: same", () => {
  const { f, ctx, me, building, piece, host, versionsOf, manifest, merged } = fixture("same");

  test("same intent: a recipe requires a piece proposed beside it; Accept keeps the piece, then the recipe", async () => {
    const intent = await building("A cart and its kit");
    const kit = await piece(intent, "The kit", pieceSource(4));
    const cart = await host(intent, "Cart", assetSource(kit.hash));
    expect(cart.intent).toBe(intent);
    expect((await manifest(cart.version)).pieces).toEqual([kit.hash]);
    // the review lists the intent's pieces, the version each is to be and what requires it
    const review: any = await reviewOf(f.db, intent, null);
    expect(review.pieces).toEqual([{ piece: kit.doc, label: "The kit", variant: expect.any(Number), hash: kit.hash, version: 1, requires: [], requiredBy: [{ doc: cart.asset, kind: "asset", variant: cart.variant }] }]);
    // the recipe's preview builds on the piece proposed beside it (no fallback: the one resolver)
    const preview = await recipeAt(f.db, f.store, await me(), cart.asset, { intent });
    expect(preview.record.manifest.pieces).toEqual([kit.hash]);
    const r = await decide(ctx(), await me(), intent, "accept");
    expect(r.status).toBe("accepted");
    expect(await versionsOf(kit.doc)).toEqual([{ number: 1, hash: kit.hash }]);
    expect(new TextDecoder().decode((await f.store.get(kit.hash))!)).toBe(pieceSource(4));
    expect((await f.db.query<any>(`SELECT number FROM play.asset_versions WHERE id = $1`, [cart.version])).rows[0].number).toBe(1);
    // the piece went in before the recipe that requires it, in the one Accept
    expect(await merged([`piece:${kit.doc}`, `asset:${cart.asset}`])).toEqual([`piece:${kit.doc}`, `asset:${cart.asset}`]);
  });

  test("same intent: a piece requires a piece proposed beside it, and a host both", async () => {
    const intent = await building("Two layers");
    const base = await piece(intent, "Base", pieceSource(1));
    const top = await piece(intent, "Top", onTop(base.hash, 1));
    const cart = await host(intent, "Wagon", assetSource(top.hash));
    expect((await manifest(cart.version)).pieces).toEqual([top.hash, base.hash]);
    expect((await decide(ctx(), await me(), intent, "accept")).status).toBe("accepted");
    const { rows } = await f.db.query<any>(`SELECT hash, depth, requires FROM play.piece_versions WHERE hash = ANY($1::text[]) ORDER BY depth`, [[base.hash, top.hash]]);
    expect(rows).toEqual([{ hash: base.hash, depth: 1, requires: [] }, { hash: top.hash, depth: 2, requires: [base.hash] }]);
  });

  test("same intent only: a hash neither accepted nor proposed in this intent is refused, saying which", async () => {
    const none = hashText("no piece at all");
    const intent = await building("A lost cart");
    await expect(host(intent, "Lost", assetSource(none))).rejects.toThrow(new RegExp(`${none.slice(0, 12)}.*no accepted version of a piece, nor one proposed in this intent`));
    // a piece proposed in another intent is not this one's
    const other = await building("Another kit");
    const kit = await piece(other, "Another kit", pieceSource(7));
    await expect(host(intent, "Borrowed", assetSource(kit.hash))).rejects.toThrow(/nor one proposed in this intent/);
    await expect(piece(intent, "Borrowing", onTop(kit.hash, 2))).rejects.toThrow(/nor one proposed in this intent/);
  });

  test("same intent: pieces that require each other in a circle are refused", async () => {
    const a = hashText("a"), b = hashText("b"), c = hashText("c");
    const known = new Map<string, Known>([[a, { requires: [b] }], [b, { requires: [c] }], [c, { requires: [a] }]]);
    const lookup = async (hs: string[]) => new Map(hs.filter((h) => known.has(h)).map((h) => [h, known.get(h)!]));
    await expect(resolvePieces(lookup, [a])).rejects.toThrow(PieceError);
    await expect(resolvePieces(lookup, [a])).rejects.toThrow(/circle/);
    // one requiring itself
    await expect(resolvePieces(async (hs) => new Map(hs.map((h) => [h, { requires: [h] }])), [a])).rejects.toThrow(/circle/);
    // and none: in order, as deep as they go
    known.set(c, { requires: [] });
    expect(await resolvePieces(lookup, [a])).toEqual({ all: [a, b, c], depth: 3 });
  });
});

suite("pieces together: versions", () => {
  const { f, ctx, me, building, piece, host, versionsOf, manifest, merged } = fixture("versions");

  test("versions: one intent carries a piece's v1 and v2, each pinned by its own host; Accept makes v1 then v2 and both hosts build", async () => {
    const intent = await building("A kit in two versions");
    const v1 = await piece(intent, "Kit", pieceSource(4));
    // v2 is the next version of the same piece, requiring v1
    const src2 = onTop(v1.hash, 2);
    const p2 = await proposeDocVersion(ctx(), await me(), { doc: v1.doc, edits: [{ op: "set", path: ["source"], value: src2 }], note: "Kit v2, on v1", intent });
    const v2 = hashText(src2);
    expect(p2.doc).toBe(v1.doc);
    // it grew from v1, the version this intent proposed before
    const held = (await f.db.query<any>(`SELECT variant_id FROM play.intent_variants WHERE intent_id = $1 AND doc_id = $2 ORDER BY position`, [intent, `piece:${v1.doc}`])).rows.map((r) => Number(r.variant_id));
    expect(held.length).toBe(2);
    expect(held[1]).toBe(p2.variant);
    const first = (await f.db.query<any>(`SELECT message FROM play.doc_edits WHERE variant = $1 ORDER BY seq LIMIT 1`, [p2.variant])).rows[0].message;
    expect(first).toContain(`grows from variant ${held[0]}`);
    // the same source again is no new version
    await expect(proposeDocVersion(ctx(), await me(), { doc: v1.doc, whole: { schema: "piece/1", label: "Kit", source: pieceSource(4) }, note: "Kit again", intent })).rejects.toThrow(/already/);
    const one = await host(intent, "Old cart", assetSource(v1.hash));
    const two = await host(intent, "New cart", assetSource(v2));
    expect((await manifest(two.version)).pieces).toEqual([v2, v1.hash]);
    const review: any = await reviewOf(f.db, intent, null);
    expect(review.pieces.map((x: any) => [x.hash, x.version, x.requires, x.requiredBy.map((r: any) => r.doc)])).toEqual([
      [v1.hash, 1, [], [v1.doc, one.asset]],
      [v2, 2, [v1.hash], [two.asset]],
    ]);
    expect((await decide(ctx(), await me(), intent, "accept")).status).toBe("accepted");
    expect(await versionsOf(v1.doc)).toEqual([{ number: 1, hash: v1.hash }, { number: 2, hash: v2 }]);
    // each version is the piece exactly as proposed
    expect((await docAt(ctx(), await me(), v1.doc, { version: 1 })).json.source).toBe(pieceSource(4));
    expect((await docAt(ctx(), await me(), v1.doc, { version: 2 })).json.source).toBe(src2);
    // both hosts build: each its accepted version, its recipe file and every piece it names among play's files
    for (const [h, pieces] of [[one, [v1.hash]], [two, [v2, v1.hash]]] as const) {
      const { rows } = await f.db.query<any>(`SELECT number, recipe_hash FROM play.asset_versions WHERE id = $1`, [h.version]);
      expect(rows[0].number).toBe(1);
      expect(new TextDecoder().decode((await f.store.get(rows[0].recipe_hash))!)).toContain(`require("${pieces[0]}")`);
      for (const p of pieces) expect(await f.store.get(p)).toBeTruthy();
      expect((await recipeAt(f.db, f.store, await me(), h.asset, { edit: (await f.db.query<any>(`SELECT max(seq)::int AS s FROM play.doc_edits WHERE doc_id = $1`, [`asset:${h.asset}`])).rows[0].s })).record.manifest.pieces).toEqual([...pieces]);
    }
    expect(await merged([v1.doc].map((d) => `piece:${d}`))).toEqual([`piece:${v1.doc}`, `piece:${v1.doc}`]);
  });

  test("versions: archiving the intent closes every one of them, nothing kept", async () => {
    const intent = await building("Two versions, archived");
    const v1 = await piece(intent, "Spare", pieceSource(8));
    await proposeDocVersion(ctx(), await me(), { doc: v1.doc, edits: [{ op: "set", path: ["source"], value: pieceSource(9) }], note: "Spare v2", intent });
    expect((await decide(ctx(), await me(), intent, "archive")).status).toBe("archived");
    expect(await versionsOf(v1.doc)).toEqual([]);
    const { rows } = await f.db.query<any>(`SELECT DISTINCT dv.status FROM play.doc_variants dv WHERE dv.doc_id = $1 AND dv.type = 'intent'`, [`piece:${v1.doc}`]);
    expect(rows.map((r) => r.status)).toEqual(["archived"]);
  });
});

suite("pieces together: order", () => {
  const { f, ctx, me, building, piece, host, versionsOf, manifest, merged } = fixture("order");

  /** four layers of pieces on one intent, each on the one below, and hosts on the top and the bottom */
  const layers = async (intent: string, tag: string) => {
    const out = [await piece(intent, `${tag} L1`, pieceSource(tag.length * 100))];
    for (let i = 2; i <= 4; i++) out.push(await piece(intent, `${tag} L${i}`, onTop(out.at(-1)!.hash, i)));
    const top = await host(intent, `${tag} top`, assetSource(out[3].hash));
    const bottom = await host(intent, `${tag} bottom`, assetSource(out[0].hash));
    return { pieces: out, top, bottom };
  };

  test("order: four layers of pieces and their hosts go through one Accept, each piece after what it requires", async () => {
    const intent = await building("Four layers");
    const { pieces, top, bottom } = await layers(intent, "Kit");
    expect((await manifest(top.version)).pieces).toEqual(pieces.map((p) => p.hash).reverse());
    // whatever the intent's own order, Accept keeps them as they require each other: put the top first
    const docIds = pieces.map((p) => `piece:${p.doc}`);
    for (const [i, d] of docIds.entries()) await f.db.query(`UPDATE play.intent_variants SET position = $3 WHERE intent_id = $1 AND doc_id = $2`, [intent, d, 100 - i]);
    expect((await decide(ctx(), await me(), intent, "accept")).status).toBe("accepted");
    for (const [i, p] of pieces.entries()) expect((await f.db.query<any>(`SELECT depth FROM play.piece_versions WHERE hash = $1`, [p.hash])).rows[0].depth).toBe(i + 1);
    const hosts = [`asset:${top.asset}`, `asset:${bottom.asset}`];
    const merges = await merged([...docIds, ...hosts]);
    expect(merges.slice(0, 4)).toEqual(docIds);
    expect(merges.slice(4).sort()).toEqual([...hosts].sort());
  });

  test("order: a failure in the last layer leaves nothing of the intent kept", async () => {
    const intent = await building("Four layers, one host moved");
    const { pieces, top, bottom } = await layers(intent, "Moved");
    // the top host's asset moved on since it was made (as if another version had gone in)
    await f.db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [top.asset, top.version]);
    const r = await decide(ctx(), await me(), intent, "accept");
    expect(r.status).toBe("archived");
    expect(r.message).toMatch(/nothing of this intent went in/);
    for (const p of pieces) expect(await versionsOf(p.doc)).toEqual([]);
    expect((await f.db.query(`SELECT 1 FROM play.piece_versions WHERE hash = ANY($1::text[])`, [pieces.map((p) => p.hash)])).rows).toEqual([]);
    expect((await f.db.query<any>(`SELECT number FROM play.asset_versions WHERE id = $1`, [bottom.version])).rows[0].number).toBeNull();
    expect(await merged([...pieces.map((p) => `piece:${p.doc}`), `asset:${bottom.asset}`])).toEqual([]);
  });

  test(`order: the depth limit, ${MOST_DEEP}, counts the intent's own pieces`, async () => {
    const intent = await building("Too deep together");
    const pieces = [await piece(intent, "D1", pieceSource(1000))];
    for (let i = 2; i <= MOST_DEEP; i++) pieces.push(await piece(intent, `D${i}`, onTop(pieces.at(-1)!.hash, i)));
    // a fifth layer is refused, the four below it all only proposed
    await expect(piece(intent, "D5", onTop(pieces.at(-1)!.hash, 5))).rejects.toThrow(/4 deep: a recipe.s pieces go at most 3 deep/);
    // a recipe on the top one goes, as deep as allowed
    const ok = await host(intent, "Deep cart", assetSource(pieces.at(-1)!.hash));
    expect((await manifest(ok.version)).pieces.length).toBe(MOST_DEEP);
  });
});
