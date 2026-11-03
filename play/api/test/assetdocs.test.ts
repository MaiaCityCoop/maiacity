// Assets as Loro documents (src/assetdocs.ts, play/SPEC.md §4.4) against a real Postgres: set TEST_DATABASE_URL, as for
// api.test.ts. Each asset's history made from its versions (sources byte for byte, ids, hashes and pins unchanged), the
// papaya's kept rounds between v1 and v2, proposals as branches (asset_edit drafts proposed with their steps), the
// recipe file at any step, and the code rule: a merge that met other edits needs its previewed hash.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore, keyOf, type BlobStore } from "../src/blobs";
import { meOf } from "../src/access";
import { catalogOf, pinsOf } from "../src/assets";
import { assetDocId, assetHistory, editAsset, ensureAssetDocs, HISTORY, recipeAtStep } from "../src/assetdocs";
import * as docs from "../src/docs";
import { hashText } from "../src/hash";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { decide, propose, proposalOf } from "../src/proposals";
import { RECIPE_HEAD, recipeTail } from "../src/recipes";
import { Rate } from "../src/limits";
import { makeToken } from "../src/tokens";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;
const COOP = "maia-city";
const src = (body: string) => `module.exports.recipe = function (id, v, variant) {\n  // ${body}\n  return { meta: {}, build() { return null; } };\n};\n`;

suite("assets as documents", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string, store: BlobStore, api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};
  const ids: Record<string, string> = {};
  /** the versions written here, by asset slug: number -> { id, source text, recipe hash } */
  const written: Record<string, Record<number, { id: string; source: string; recipe: string | null }>> = {};

  const put = async (text: string) => {
    const hash = hashText(text);
    const key = await store.put(hash, new TextEncoder().encode(text), "text/javascript");
    await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [hash, Buffer.byteLength(text), key]);
    return hash;
  };
  /** an asset with versions written as the legacy import writes them (or as accepted proposals left them) */
  async function writeAsset(grp: string, slug: string, versions: { n: number; source: string; variants?: Record<string, string>; author?: string; imported?: boolean; created?: string }[]) {
    const id = crypto.randomUUID();
    ids[slug] = id;
    written[slug] = {};
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, $3, $4, $5)`, [id, COOP, grp, slug, slug[0].toUpperCase() + slug.slice(1)]);
    let parent: string | null = null;
    for (const v of versions) {
      const vid = hashText(`${slug}|${v.n}|${v.source}`);
      const sourceHash = await put(v.source);
      const card = { kind: "recipe", card: { group: grp, id: slug, version: v.n, label: `${slug} v${v.n}`, params: [{ id: "stage", kind: "number" }] }, manifest: { libs: ["three"] } };
      if (v.variants) {
        await db.query(
          `INSERT INTO play.asset_versions (id, asset_id, parents, number, default_variant, card, engine, note, author, imported, created) VALUES ($1, $2, $3, $4, $5, ($6::text)::jsonb, 5, $7, $8, $9, COALESCE($10::timestamptz, now()))`,
          [vid, id, parent ? [parent] : [], v.n, Object.keys(v.variants)[0], JSON.stringify(card), `version ${v.n}`, v.author ?? null, v.imported === false ? null : JSON.stringify({ from: "avendb" }), v.created ?? null],
        );
        for (const [vn, vs] of Object.entries(v.variants)) {
          const s = await put(vs);
          const r = await put(RECIPE_HEAD + vs + recipeTail(slug, v.n, vn));
          await db.query(`INSERT INTO play.asset_variants (version_id, name, recipe_hash, source_hash, card) VALUES ($1, $2, $3, $4, ($5::text)::jsonb)`, [vid, vn, r, s, JSON.stringify({ ...card, card: { ...card.card, variant: vn, recipe: r } })]);
        }
        written[slug][v.n] = { id: vid, source: v.variants[Object.keys(v.variants)[0]], recipe: null };
      } else {
        const recipe = await put(RECIPE_HEAD + v.source + recipeTail(slug, v.n, null));
        await db.query(
          `INSERT INTO play.asset_versions (id, asset_id, parents, number, recipe_hash, source_hash, card, engine, note, author, imported, created) VALUES ($1, $2, $3, $4, $5, $6, ($7::text)::jsonb, 5, $8, $9, $10, COALESCE($11::timestamptz, now()))`,
          [vid, id, parent ? [parent] : [], v.n, recipe, sourceHash, JSON.stringify({ ...card, card: { ...card.card, recipe } }), `version ${v.n}`, v.author ?? null, v.imported === false ? null : JSON.stringify({ from: "avendb" }), v.created ?? null],
        );
        written[slug][v.n] = { id: vid, source: v.source, recipe };
      }
      parent = vid;
    }
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [id, parent]);
    return id;
  }

  beforeAll(async () => {
    name = `play_assetdocs_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    store = folderStore(mkdtempSync(join(tmpdir(), "play-assetdocs-")));
    api = app({ db, store, rate: new Rate(0) });
    for (const n of ["ada", "cit"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
  });
  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });
  const me = (n: string) => meOf(db, who[n].id);

  test("every asset's history is made from its versions: each version a step named its own number, its source byte for byte, nothing else changed", async () => {
    await writeAsset("plants", "fern", [{ n: 1, source: src("first") }, { n: 2, source: src("second, a frond more") }, { n: 4, source: src("fourth: legacy skipped a number") }]);
    await writeAsset("things", "lamp", [{ n: 1, source: src("lamp"), variants: { off: src("lamp"), on: src("lamp, lit") } }, { n: 2, source: src("one lamp") }]);
    await db.query(`INSERT INTO play.sandbox_pins (sandbox_id, slot, version_id) VALUES ('sandbox-1', 'fern', $1)`, [written.fern[2].id]);
    // a proposal decided before the documents: a branch of its own, closed as it was
    const rejected = hashText("fern|rejected");
    const rs = await put(src("a rejected fern"));
    const rr = await put(RECIPE_HEAD + src("a rejected fern") + recipeTail("fern", 5, null));
    await db.query(`INSERT INTO play.asset_versions (id, asset_id, parents, recipe_hash, source_hash, card, engine, author, note) VALUES ($1, $2, $3, $4, $5, '{"card":{}}', 5, $6, 'not this')`, [rejected, ids.fern, [written.fern[4].id], rr, rs, who.cit.id]);
    await db.query(`INSERT INTO play.proposals (id, coop_id, kind, asset_id, base, version, author, note, via, status) VALUES ($1, $2, 'asset_version', $3, $4, $5, $6, 'not this', 'web', 'rejected')`, [crypto.randomUUID(), COOP, ids.fern, written.fern[4].id, rejected, who.cit.id]);

    const before = { catalog: await catalogOf(db), pins: await pinsOf(db, "sandbox-1"), versions: (await db.query(`SELECT id, number, recipe_hash, source_hash FROM play.asset_versions ORDER BY id`)).rows };
    const r = await ensureAssetDocs(db, store);
    expect(r.errors).toEqual([]);
    expect(r.made).toBe(2);
    expect(r.branches).toBe(1);
    // the versions, the catalog and the pins are exactly as they were
    expect((await db.query(`SELECT id, number, recipe_hash, source_hash FROM play.asset_versions ORDER BY id`)).rows).toEqual(before.versions);
    expect(await catalogOf(db)).toEqual(before.catalog);
    expect(await pinsOf(db, "sandbox-1")).toEqual(before.pins);
    // each version's step holds its source byte for byte, under its own number (a gap kept)
    const fern = await docs.versionsOf(db, assetDocId(ids.fern));
    expect(fern.map((v) => v.number)).toEqual([1, 2, 4]);
    for (const n of [1, 2, 4]) expect((await docs.stateAt(db, assetDocId(ids.fern), { version: n })).source).toBe(written.fern[n].source);
    const lamp1 = await docs.stateAt(db, assetDocId(ids.lamp), { version: 1 });
    expect(lamp1.defaultVariant).toBe("off");
    expect(lamp1.variants.map((x: any) => [x.name, x.source ?? null])).toEqual([["off", null], ["on", src("lamp, lit")]]);
    expect((await docs.stateAt(db, assetDocId(ids.lamp), { version: 2 })).source).toBe(src("one lamp"));
    // the rejected proposal: a branch at v4, closed
    const { rows: br } = await db.query<any>(`SELECT b.status FROM play.proposals p JOIN play.doc_branches b ON b.id = p.doc_branch WHERE p.version = $1`, [rejected]);
    expect(br[0].status).toBe("rejected");
    // run again, nothing new
    const again = await ensureAssetDocs(db, store);
    expect([again.made, again.branches, again.errors.length]).toEqual([0, 0, 0]);
  });

  test("the papaya's nine kept rounds stand between v1 and v2, by Maia over MCP, and lead to v2 byte for byte", async () => {
    const v1 = readFileSync(join(import.meta.dir, "../import/legacy/sources/plants/papaya@963cc9dfc684.js"), "utf8");
    const v2 = readFileSync(join(HISTORY, "plants/papaya/v2.js"), "utf8");
    await writeAsset("plants", "papaya", [{ n: 1, source: v1, created: "2026-11-02T11:03:54Z" }, { n: 2, source: v2, author: who.ada.id, imported: false, created: "2026-11-03T08:52:33Z" }]);
    const r = await ensureAssetDocs(db, store);
    expect(r.errors).toEqual([]);
    expect(r.kept).toBe(9);
    const h = await assetHistory(db, store, await me("ada"), ids.papaya);
    expect(h.steps.map((s: any) => s.message.split(":")[0])).toEqual(["v1", ...Array.from({ length: 9 }, (_, i) => `round ${i + 1}`), "v2"]);
    expect(h.steps.filter((s: any) => s.message.startsWith("round")).every((s: any) => s.via === "mcp" && s.author === "ada")).toBe(true);
    expect(h.steps.map((s: any) => s.version)).toEqual([1, null, null, null, null, null, null, null, null, null, 2]);
    const index = JSON.parse(readFileSync(join(HISTORY, "plants/papaya/index.json"), "utf8"));
    for (const [i, s] of h.steps.slice(1, 10).entries()) expect(hashText((await docs.stateAt(db, assetDocId(ids.papaya), { step: s.seq })).source)).toBe(index.steps[i].hash);
    expect((await docs.stateAt(db, assetDocId(ids.papaya), { version: 2 })).source).toBe(v2);

    // the recipe file at a step: a version's own at its point, one made the same way at a round, kept by its hash
    const atV2 = await recipeAtStep(db, store, await me("ada"), ids.papaya, h.steps[10].seq);
    expect(atV2.hash).toBe(written.papaya[2].recipe!);
    expect(atV2.version).toBe(2);
    const r5 = readFileSync(join(HISTORY, "plants/papaya/round5.js"), "utf8");
    const at5 = await recipeAtStep(db, store, await me("ada"), ids.papaya, h.steps[5].seq);
    expect(at5.hash).toBe(hashText(RECIPE_HEAD + r5 + recipeTail("papaya", 2, null)));
    expect(at5.v).toBe(2);
    expect(at5.record.card.recipe).toBe(at5.hash);
    expect(new TextDecoder().decode((await store.get(at5.hash))!)).toBe(RECIPE_HEAD + r5 + recipeTail("papaya", 2, null));
    expect((await recipeAtStep(db, store, await me("ada"), ids.papaya, h.steps[5].seq)).hash).toBe(at5.hash);
    // admins only
    await expect(recipeAtStep(db, store, await me("cit"), ids.papaya, h.steps[5].seq)).rejects.toThrow();
    const http = await api.fetch(new Request(`http://play.test/api/assets/${ids.papaya}/history`, { headers: { cookie: who.cit.cookie } }));
    expect(http.status).toBe(403);
    const ok = await api.fetch(new Request(`http://play.test/api/assets/${ids.papaya}/steps/${h.steps[3].seq}/recipe`, { headers: { cookie: who.ada.cookie } }));
    expect(ok.status).toBe(200);
  });

  test("a proposal is a branch: a draft made step by step with asset_edit is proposed with its steps and accepted as the version", async () => {
    const ada = (await me("ada"))!;
    const s1 = await editAsset(db, store, ada, { asset: ids.fern, message: "a longer frond", edits: [{ op: "replace", find: "legacy skipped a number", replace: "a longer frond" }] });
    expect(s1.changed).toBe(true);
    const s2 = await editAsset(db, store, ada, { asset: ids.fern, branch: s1.branch, message: "and a curl", edits: [{ op: "replace", find: "a longer frond", replace: "a longer frond, curled at its tip" }] });
    expect(s2.steps).toBe(2);
    // a find that stands twice, or nowhere, is refused
    await expect(editAsset(db, store, ada, { asset: ids.fern, branch: s1.branch, message: "x", edits: [{ op: "replace", find: "nowhere at all", replace: "y" }] })).rejects.toThrow(/not in the source/);
    // the main line is untouched by a draft
    expect((await docs.readDoc(db, assetDocId(ids.fern))).json.source).toBe(written.fern[4].source);
    const p = await propose(db, store, ada, { asset: ids.fern, note: "a curled frond", branch: s1.branch }, "mcp");
    expect(p.branch).toBe(s1.branch);
    expect(p.number).toBe(5);
    expect(p.steps).toBeGreaterThanOrEqual(3);
    const review = await proposalOf(db, ada, p.id);
    expect(review.steps.map((s: any) => s.message).slice(0, 2)).toEqual(["a longer frond", "and a curl"]);
    const d = await decide(db, store, ada, p.id, "accept");
    expect(d).toMatchObject({ status: "accepted", number: 5 });
    const vs = await docs.versionsOf(db, assetDocId(ids.fern));
    expect(vs.map((v) => v.number)).toEqual([1, 2, 4, 5]);
    const head = (await docs.readDoc(db, assetDocId(ids.fern))).json;
    expect(head.source).toContain("a longer frond, curled at its tip");
    const { rows } = await db.query<any>(`SELECT v.source_hash, v.recipe_hash FROM play.asset_versions v WHERE v.asset_id = $1 AND v.number = 5`, [ids.fern]);
    expect(rows[0].source_hash).toBe(hashText(head.source));
    expect(rows[0].recipe_hash).toBe(hashText(RECIPE_HEAD + head.source + recipeTail("fern", 5, null)));
    // the history now holds the draft's steps where they were made, and v5
    const h = await assetHistory(db, store, ada, ids.fern);
    expect(h.steps.at(-1)?.version).toBe(5);
  });

  test("a draft made on an older head is refused when proposed; a proposal over the web gets a branch, withdrawn it is closed", async () => {
    const ada = (await me("ada"))!, cit = (await me("cit"))!;
    const old = await editAsset(db, store, ada, { asset: ids.lamp, message: "brighter", edits: [{ op: "replace", find: "one lamp", replace: "one bright lamp" }] });
    const web = await propose(db, store, cit, { asset: ids.lamp, note: "a dimmer lamp", source: src("one dim lamp") });
    expect(web.branch).toBeGreaterThan(0);
    await decide(db, store, ada, web.id, "accept");
    await expect(propose(db, store, ada, { asset: ids.lamp, note: "brighter", branch: old.branch }, "mcp")).rejects.toThrow(/newer version/);
    const again = await propose(db, store, cit, { asset: ids.lamp, note: "warmer", source: src("one warm lamp") });
    await decide(db, store, cit, again.id, "withdraw");
    const { rows } = await db.query<any>(`SELECT status FROM play.doc_branches WHERE id = $1`, [again.branch]);
    expect(rows[0].status).toBe("withdrawn");
    // a new asset's first version: its document starts empty, its proposal's branch fills it
    const fresh = await propose(db, store, cit, { new: { group: "things", slug: "stool", label: "Stool" }, note: "a stool", source: src("a stool") });
    await decide(db, store, ada, fresh.id, "accept");
    const stool = await docs.readDoc(db, assetDocId(fresh.asset));
    expect(stool.json.source).toBe(src("a stool"));
    expect(stool.versions.map((v) => v.number)).toEqual([1]);
  });

  test("code is never merged unseen: a branch whose merge met other edits is accepted only with its previewed hash", async () => {
    const id = assetDocId(ids.fern);
    const a: docs.Author = { human: who.ada.id, via: "mcp" };
    const b1 = await docs.branch(db, id, { author: a });
    const b2 = await docs.branch(db, id, { author: a });
    const cur = (await docs.readDoc(db, id)).json;
    await docs.commit(db, id, { branch: b1.id, target: { ...cur, note: "one" }, message: "one", author: a });
    await docs.commit(db, id, { branch: b2.id, target: { ...cur, source: cur.source + "// two\n" }, message: "two", author: a });
    await docs.propose(db, id, b1.id, { note: "one", author: a });
    await docs.propose(db, id, b2.id, { note: "two", author: a });
    await docs.accept(db, id, b1.id, { author: a });
    const err = await docs.accept(db, id, b2.id, { author: a }).catch((e) => e);
    expect(err.extra?.needsPreview).toBe(true);
    const preview = await docs.previewMerge(db, id, b2.id);
    const v = await docs.accept(db, id, b2.id, { author: a, mergedHash: preview.contentHash });
    expect(v.contentHash).toBe(preview.contentHash);
  });

  test("over MCP: asset_edit, asset_history and get_asset at a step", async () => {
    const ada = await me("ada");
    const { token } = await makeToken(db, ada, "test");
    const call = async (name: string, args: unknown) => {
      const r = await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) }));
      return (await r.json()).result;
    };
    const list = await (await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }))).json();
    expect(list.result.tools.map((t: any) => t.name)).toEqual(expect.arrayContaining(["asset_edit", "asset_history", "get_asset", "propose_version"]));
    const e = await call("asset_edit", { asset: ids.papaya, message: "a taller trunk", edits: [{ op: "set", path: ["note"], value: "taller" }] });
    expect(e.isError).toBeFalsy();
    expect(e.structuredContent.branch).toBeGreaterThan(0);
    const h = await call("asset_history", { asset: ids.papaya });
    expect(h.structuredContent.steps.length).toBe(11);
    const at = await call("get_asset", { asset: ids.papaya, step: h.structuredContent.steps[3].seq });
    expect(hashText(at.structuredContent.source)).toBe(at.structuredContent.sourceHash);
    const bad = await call("asset_edit", { asset: ids.papaya, message: "x", edits: [{ op: "set", path: ["schema"], value: "asset/2" }] });
    expect(bad.isError).toBe(true);
  });
});
