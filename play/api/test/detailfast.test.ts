// An intent's detail opens fast and its Accept always answers (intent 2df30a21, Samuel 2026-11-07), against a real
// Postgres (TEST_DATABASE_URL, as for api.test.ts). 99b612ec's shape, 8 pieces in dependency order, several in two
// versions, with motion data, and 2 assets requiring them, all on one intent: its detail lists every document in brief
// and opens each one alone; its Accept through POST /api/intents/:id/accept answers in good time, every document kept;
// a refused Accept says why.
//
// c2 runs `-t "accept answers"`: every test of that check is named so, under its own describe.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore, type BlobStore } from "../src/blobs";
import { Rate } from "../src/limits";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { heavy, type Heavy } from "../scripts/heavy";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

/** a database of its own, migrated, with an admin and the API */
function fixture(tag: string) {
  const f = {} as { admin: Bun.SQL; sql: Bun.SQL; db: Db; name: string; store: BlobStore; ada: string; api: ReturnType<typeof app> };
  beforeAll(async () => {
    f.name = `play_detailfast_${tag}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    f.admin = new Bun.SQL(URL_!);
    await f.admin.unsafe(`CREATE DATABASE ${f.name}`);
    const u = new URL(URL_!);
    u.pathname = `/${f.name}`;
    f.sql = new Bun.SQL(u.toString());
    f.db = fromBunSql(f.sql);
    await migrate(f.db);
    await initSessions(f.db);
    f.store = folderStore(mkdtempSync(join(tmpdir(), "play-detailfast-")));
    f.ada = (await createHuman(f.db, "ada")).id;
    await f.db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [f.ada]);
    f.api = app({ db: f.db, store: f.store, rate: new Rate(0) });
  });
  afterAll(async () => {
    await f.sql?.close();
    await f.admin?.unsafe(`DROP DATABASE IF EXISTS ${f.name} WITH (FORCE)`);
    await f.admin?.close();
  });
  const call = async (method: string, path: string) => {
    const r = await f.api.fetch(new Request(`http://play.test${path}`, { method, headers: { cookie: `play_session=${tokenFor(f.ada)}` } }));
    const text = await r.text();
    return { status: r.status, bytes: text.length, data: text ? JSON.parse(text) : null };
  };
  /** 99b612ec's shape: 8 pieces in dependency order, 3 of them in two versions, and 2 assets requiring them */
  const like99 = (title: string) => heavy(f.db, f.store, f.ada, { title, pieces: 8, versions: 3, hosts: 2, kb: 40 });
  return { f, call, like99 };
}

suite("accept answers", () => {
  const { f, call, like99 } = fixture("accept");
  let h: Heavy;

  test("accept answers: 8 pieces in dependency order, several in two versions, and 2 assets requiring them, accepted through the API in good time, every document kept", async () => {
    h = await like99("People move like people, as a test");
    expect((await call("GET", `/api/intents/${h.intent}`)).data).toMatchObject({ stage: "proposal", sub: { state: "waiting" } });
    const t = performance.now();
    const r = await call("POST", `/api/intents/${h.intent}/accept`);
    const ms = performance.now() - t;
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ id: h.intent, stage: "accepted", decision: { status: "accepted" } });
    expect(ms).toBeLessThan(10_000);
    // every piece version kept, in order, and both hosts their version 1
    for (const p of h.pieces) {
      const { rows } = await f.db.query<{ number: number; hash: string }>(`SELECT number, hash FROM play.piece_versions WHERE piece_id = $1 ORDER BY number`, [p.doc]);
      expect(rows.map((x) => x.hash)).toEqual(p.hashes);
    }
    for (const x of h.hosts) expect((await f.db.query<any>(`SELECT number FROM play.asset_versions WHERE id = $1`, [x.version])).rows[0].number).toBe(1);
    expect((await call("GET", `/api/intents/${h.intent}`)).data).toMatchObject({ stage: "accepted", decided_by: "ada" });
  }, 120_000);

  test("accept answers: a refused Accept says why, and keeps nothing", async () => {
    // accepted already: nothing to accept again
    const again = await call("POST", `/api/intents/${h.intent}/accept`);
    expect(again.status).toBeGreaterThanOrEqual(400);
    expect(again.data.error).toMatch(/\S/);
    // one whose pieces' host moved on since it was made: archived whole, saying nothing of it went in
    const moved = await like99("A host moved on");
    await f.db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [moved.hosts[0].asset, moved.hosts[0].version]);
    const r = await call("POST", `/api/intents/${moved.intent}/accept`);
    expect(r.status).toBe(200);
    expect(r.data.decision.status).toBe("archived");
    expect(r.data.message).toMatch(/nothing of this intent went in/);
    for (const p of moved.pieces) expect((await f.db.query(`SELECT 1 FROM play.piece_versions WHERE piece_id = $1`, [p.doc])).rows).toEqual([]);
    // an intent still in Build: refused, why said
    const building = await call("POST", `/api/intents/${crypto.randomUUID()}/accept`);
    expect(building.status).toBe(404);
    expect(building.data.error).toMatch(/no such intent/);
  }, 120_000);
});

suite("the detail in brief", () => {
  const { call, like99 } = fixture("detail");

  test("detail: every document listed in brief, each opened alone with what it changes", async () => {
    const h = await like99("A detail in brief");
    const d = await call("GET", `/api/intents/${h.intent}`);
    expect(d.status).toBe(200);
    const docs = d.data.review.docs;
    // 8 pieces, 3 of them twice, and 2 hosts
    expect(docs.length).toBe(13);
    expect(JSON.stringify(docs)).not.toContain("module.exports");
    expect(docs[0]).toMatchObject({ doc: { kind: "piece", label: "Piece 1" }, seedNumber: null, status: "proposed", summary: { changes: expect.any(Number), fields: expect.arrayContaining(["source"]) } });
    expect(d.data.review.pieces.map((p: any) => [p.label, p.version])).toEqual(h.pieces.flatMap((p) => p.hashes.map((_, n) => [p.label, n + 1])));
    // the second version of Piece 1, opened alone: its source and what changed
    const piece = h.pieces[0];
    const v2 = docs.filter((x: any) => x.doc.id === piece.doc)[1].variant;
    const one = await call("GET", `/api/intents/${h.intent}/docs/${piece.doc}?variant=${v2}`);
    expect(one.status).toBe(200);
    expect(one.data).toMatchObject({ doc: { id: piece.doc, kind: "piece" }, variant: v2 });
    // read against the version before it in this intent: only its source changed
    expect(one.data.growsFrom).toEqual({ variant: docs.filter((x: any) => x.doc.id === piece.doc)[0].variant });
    expect(one.data.changes.map((c: any) => c.path)).toEqual(["$.source"]);
    expect(one.data.changes[0]).toMatchObject({ kind: "changed", from: expect.stringContaining("version 1"), to: expect.stringContaining("version 2") });
    // the first, new: the fields it brings
    const v1 = await call("GET", `/api/intents/${h.intent}/docs/${piece.doc}?variant=${docs[0].variant}`);
    expect(v1.data.changes.map((c: any) => c.path).sort()).toEqual(["$.label", "$.schema", "$.source"]);
    expect(one.bytes).toBeLessThan(d.bytes * 20);
    // a host opened alone carries its builds
    const host = await call("GET", `/api/intents/${h.intent}/docs/${h.hosts[0].asset}`);
    expect(host.data.builds?.length).toBeGreaterThan(0);
    // a document the intent doesn't change
    expect((await call("GET", `/api/intents/${h.intent}/docs/${crypto.randomUUID()}`)).status).toBe(404);
  }, 120_000);
});
