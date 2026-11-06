// Migration 0029-one-record (Samuel 2026-11-06: "proposal and intent are the same!! not different, merge, DRY"): a
// database as production had it before, its work in play.proposals beside the intents, becomes one record, the intent,
// and nothing is lost. Seeded in the old shape (the proposals of before 0015 in their old statuses, then the shapes
// 0026 and its trigger left: an intent-less proposal turned 1:1, an intent with two proposals, a story proposal with
// its doc branch, one at each status), migrated, and read back.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MIGRATIONS, migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { COOP } from "../src/ids";
import { UUID } from "../src/uuid";
import { hashText } from "../src/hash";
import { storyVersionId } from "../src/versions";
import * as docs from "../src/docs";
import { app } from "../src/app";
import { initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { Rate } from "../src/limits";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const body = (line: string) => ({ schema: "story/1", format: "9:16", fps: 30, duration: 4, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 4, who: "MAIA", line }] }] });

suite("one record: the intent (migration 0029)", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  const ran = async (below: string) => {
    for (const m of MIGRATIONS.filter((m) => m.id < below)) {
      const { rows } = await db.query(`SELECT 1 FROM play.migrations WHERE id = $1`, [m.id]);
      if (!rows.length) await db.transaction(async (tx) => (await tx.query(m.sql), await tx.query(`INSERT INTO play.migrations (id) VALUES ($1)`, [m.id])));
    }
  };
  const q = async (text: string, args: unknown[] = []) => (await db.query<any>(text, args)).rows;

  beforeAll(async () => {
    name = `play_onerecord_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await db.exec(`CREATE SCHEMA IF NOT EXISTS play; CREATE TABLE IF NOT EXISTS play.migrations (id TEXT PRIMARY KEY, ran TIMESTAMPTZ NOT NULL DEFAULT now());`);
  });
  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("every proposal becomes an intent's work or an intent of its own; every old id still finds it; the table goes", async () => {
    const ada = crypto.randomUUID(), cit = crypto.randomUUID();
    const fern = crypto.randomUUID();
    const file = (s: string) => hashText(s);
    const version = (s: string) => hashText(`version:${s}`);
    let at = 0;
    const when = () => new Date(Date.UTC(2026, 9, 1, 0, at++)).toISOString();
    const assetProposal = async (id: string, v: string, status: string, extra: Record<string, unknown> = {}) => {
      await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, 1, 'text/javascript', $1) ON CONFLICT DO NOTHING`, [file(v)]);
      await db.query(`INSERT INTO play.asset_versions (id, asset_id, parents, recipe_hash, card, author, note) VALUES ($1, $2, $3, $4, '{}', $5, $6)`, [version(v), fern, [version("v1")], file(v), cit, v]);
      const { coop_id = "maia-city", ...more } = extra;
      const cols = ["id", "coop_id", "kind", "asset_id", "base", "version", "author", "note", "status", "created", ...Object.keys(more)];
      const vals = [id, coop_id, "asset_version", fern, version("v1"), version(v), cit, `the ${v}`, status, when(), ...Object.values(more)];
      await db.query(`INSERT INTO play.proposals (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`, vals);
    };

    // ---- before 0015: proposals in the statuses they had then
    await ran("0015");
    await db.query(`INSERT INTO play.humans (id, name) VALUES ($1, 'ada'), ($2, 'cit')`, [ada, cit]);
    await db.query(`INSERT INTO play.memberships (coop_id, human_id, level) VALUES ('maia-city', $1, 'admin'), ('maia-city', $2, 'citizen')`, [ada, cit]);
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, 'maia-city', 'plants', 'fern', 'Fern')`, [fern]);
    await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, 1, 'text/javascript', $1)`, [file("v1")]);
    await db.query(`INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, card, author, note) VALUES ($1, $2, 1, $3, '{}', $4, 'v1')`, [version("v1"), fern, file("v1"), ada]);
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [fern, version("v1")]);
    const old: Record<string, string> = { rejected: crypto.randomUUID(), withdrawn: crypto.randomUUID(), stale: crypto.randomUUID(), open: crypto.randomUUID() };
    for (const [status, id] of Object.entries(old)) await assetProposal(id, `old-${status}`, status);

    // ---- before 0029: what 0015, 0023, 0025 and 0026 (with its trigger) made of them, and the shapes since
    await ran("0029");
    expect(await q(`SELECT status, count(*)::int AS n FROM play.proposals GROUP BY status ORDER BY status`)).toEqual([{ status: "archived", n: 3 }, { status: "proposal", n: 1 }]);
    expect((await q(`SELECT decided_by FROM play.proposals WHERE id = $1`, [old.withdrawn]))[0].decided_by).toBe(cit);
    // 1:1: a proposal made without an intent, the trigger's intent made for it; accepted
    const lone = crypto.randomUUID();
    await assetProposal(lone, "lone", "accepted", { coop_id: COOP });
    const loneIntent = (await q(`SELECT intent_id FROM play.proposals WHERE id = $1`, [lone]))[0].intent_id;
    expect(loneIntent).toMatch(UUID);
    // an intent with an approved spec and two proposals: the first archived, the second waiting, which names the
    // intent's earlier proposal in its note
    const spec = { goal: "a shade fern", scope: "plants/fern", checks: [{ id: "c1", check: "it builds", how: "test", by: "the box", run: "true", must: true }] };
    const two = crypto.randomUUID(), twoA = crypto.randomUUID(), twoB = crypto.randomUUID();
    await db.query(
      `INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, spec, approved_by, approved_at, results)
       VALUES ($1, $2, 'improve', 'A shade fern', $3, 'prototype', $4, 'mcp', ($5::text)::jsonb, $4, now(), '{"c1":{"pass":true,"evidence":"ok","by":"ada","at":"2026-10-01"}}')`,
      [two, COOP, `tried first as ${twoA}`, ada, JSON.stringify(spec)],
    );
    await assetProposal(twoA, "two-a", "proposal", { coop_id: COOP, intent_id: two, via: "mcp" });
    await db.query(`UPDATE play.proposals SET status = 'archived', decided_by = $2, decided_at = now() WHERE id = $1`, [twoA, ada]); // the trigger: back to Prototype
    expect((await q(`SELECT stage FROM play.intents WHERE id = $1`, [two]))[0].stage).toBe("prototype");
    await assetProposal(twoB, "two-b", "proposal", { coop_id: COOP, intent_id: two, via: "mcp" }); // the trigger: to Proposal
    expect((await q(`SELECT stage FROM play.intents WHERE id = $1`, [two]))[0].stage).toBe("proposal");
    // an accepted intent with an accepted proposal and a newer archived one
    const three = crypto.randomUUID(), threeA = crypto.randomUUID(), threeB = crypto.randomUUID();
    await db.query(`INSERT INTO play.intents (id, coop_id, kind, title, stage, author, via) VALUES ($1, $2, 'fix', 'A fern fix', 'proposal', $3, 'mcp')`, [three, COOP, ada]);
    await db.query(`ALTER TABLE play.proposals DISABLE TRIGGER proposals_move_intent`);
    await assetProposal(threeA, "three-a", "accepted", { coop_id: COOP, intent_id: three, decided_by: ada });
    await assetProposal(threeB, "three-b", "archived", { coop_id: COOP, intent_id: three, decided_by: ada });
    await db.query(`ALTER TABLE play.proposals ENABLE TRIGGER proposals_move_intent`);
    await db.query(`UPDATE play.intents SET stage = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [three, ada]);
    // an intent back in Prototype (approved) whose only proposal was archived: its stage is not its proposal's
    const five = crypto.randomUUID(), fiveA = crypto.randomUUID();
    await db.query(`INSERT INTO play.intents (id, coop_id, kind, title, stage, author, via, spec, approved_by, approved_at) VALUES ($1, $2, 'idea', 'A fern again', 'prototype', $3, 'mcp', ($4::text)::jsonb, $3, now())`, [five, COOP, ada, JSON.stringify(spec)]);
    await assetProposal(fiveA, "five-a", "proposal", { coop_id: COOP, intent_id: five });
    await db.query(`UPDATE play.proposals SET status = 'archived', decided_by = $2, decided_at = now() WHERE id = $1`, [fiveA, ada]);
    expect((await q(`SELECT stage FROM play.intents WHERE id = $1`, [five]))[0].stage).toBe("prototype");
    // a story proposal waiting, with its branch of the story's document
    const story = crypto.randomUUID(), sp = crypto.randomUUID();
    const s1 = storyVersionId({ story, parents: [], title: "A film", body: body("one") });
    const s2 = storyVersionId({ story, parents: [s1], title: "A film", body: body("two") });
    await db.query(`INSERT INTO play.stories (id, coop_id, title) VALUES ($1, $2, 'A film')`, [story, COOP]);
    await db.query(
      `INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note) VALUES ($1, $3, 1, '{}', 'A film', ($4::text)::jsonb, 'one'), ($2, $3, NULL, $5, 'A film', ($6::text)::jsonb, 'two')`,
      [s1, s2, story, JSON.stringify(body("one")), [s1], JSON.stringify(body("two"))],
    );
    await db.query(`UPDATE play.stories SET head = $2 WHERE id = $1`, [story, s1]);
    const author = { human: ada, via: "mcp" as const };
    await docs.createDoc(db, { id: `story:${story}`, schema: "story/1", json: { title: "A film", ...body("one") }, author, message: "v1", version: "one" });
    const branch = (await docs.branch(db, `story:${story}`, { author, note: "two" })).id;
    await docs.commit(db, `story:${story}`, { branch, target: { title: "A film", ...body("two") }, message: "two", author });
    await docs.propose(db, `story:${story}`, branch, { note: `two (see ${sp})`, author });
    await db.query(
      `INSERT INTO play.proposals (id, coop_id, kind, story_id, story_base, story_version, author, note, via, doc_branch, created) VALUES ($1, $2, 'story_version', $3, $4, $5, $6, 'two', 'mcp', $7, $8)`,
      [sp, COOP, story, s1, s2, ada, branch, when()],
    );
    const storyIntent = (await q(`SELECT intent_id FROM play.proposals WHERE id = $1`, [sp]))[0].intent_id;
    const all = (await q(`SELECT id, intent_id, status FROM play.proposals`)) as { id: string; intent_id: string; status: string }[];

    // ---- 0029
    expect(await migrate(db)).toEqual(MIGRATIONS.filter((m) => m.id >= "0029").map((m) => m.id));
    expect((await q(`SELECT to_regclass('play.proposals') AS t`))[0].t).toBeNull();
    expect(await q(`SELECT proname FROM pg_proc WHERE proname IN ('intent_for', 'proposal_intent', 'intent_follows')`)).toEqual([]);
    // every proposal's id is kept, beside the intent it is now
    const ids = await q(`SELECT proposal_id, intent_id, how FROM play.proposal_ids`);
    expect(ids.map((r) => r.proposal_id).sort()).toEqual(all.map((p) => p.id).sort());
    const of = (p: string) => ids.find((r) => r.proposal_id === p)!;
    const intent = async (id: string) => (await q(`SELECT * FROM play.intents WHERE id = $1`, [id]))[0];

    // the old ones and the lone one: one intent each, the proposal's work on it
    for (const [status, id] of Object.entries(old)) {
      const m = of(id);
      expect(m.how).toBe("its");
      const i = await intent(m.intent_id);
      expect(i).toMatchObject({ work: "asset_version", asset_id: fern, base: version("v1"), version: version(`old-${status}`), work_note: `the old-${status}`, proposed_by: cit, stage: status === "open" ? "proposal" : "archived" });
    }
    expect(of(lone)).toEqual({ proposal_id: lone, intent_id: loneIntent, how: "its" });
    expect(await intent(loneIntent)).toMatchObject({ stage: "accepted", work: "asset_version", version: version("lone"), title: "Fern v2" });

    // two proposals: the intent keeps its waiting one; the archived one is an intent of its own, named by its id, come with it
    expect(of(twoB)).toEqual({ proposal_id: twoB, intent_id: two, how: "its" });
    expect(await intent(two)).toMatchObject({ stage: "proposal", work: "asset_version", version: version("two-b"), proposed_via: "mcp", came_with: null, spec, note: `tried first as ${twoA}` });
    expect(of(twoA)).toEqual({ proposal_id: twoA, intent_id: twoA, how: "own" });
    expect(await intent(twoA)).toMatchObject({ stage: "archived", work: "asset_version", version: version("two-a"), came_with: two, decided_by: ada, spec: null, title: "Fern v2" });
    // accepted, with a newer archived one: the accepted one is its work
    expect(of(threeA).intent_id).toBe(three);
    expect(await intent(three)).toMatchObject({ stage: "accepted", version: version("three-a") });
    expect(await intent(of(threeB).intent_id)).toMatchObject({ stage: "archived", version: version("three-b"), came_with: three });
    // a stage its proposal does not have: the proposal its own intent, the intent no work
    expect(of(fiveA).how).toBe("own");
    expect(await intent(five)).toMatchObject({ stage: "prototype", work: null });
    expect(await intent(fiveA)).toMatchObject({ stage: "archived", version: version("five-a"), came_with: five });

    // the story's: its work and branch on its intent, the branch naming the intent, the id in its note the intent's
    expect(of(sp).intent_id).toBe(storyIntent);
    expect(await intent(storyIntent)).toMatchObject({ stage: "proposal", work: "story_version", story_id: story, story_base: s1, story_version: s2, doc_branch: String(branch) });
    expect((await q(`SELECT intent_id, status, note FROM play.doc_branches WHERE id = $1`, [branch]))[0]).toEqual({ intent_id: storyIntent, status: "proposed", note: `two (see ${storyIntent})` });
    // a proposal id written in an intent's text is its intent's now (twoA is its own intent, so its id stands)
    expect((await intent(two)).note).toBe(`tried first as ${twoA}`);

    // what an intent's work names is held to its kind
    await expect(db.query(`UPDATE play.intents SET story_id = $2 WHERE id = $1`, [two, story])).rejects.toThrow(/intents_work_names_what/);

    // and through the API: an old proposal's address answers as its intent; the board lists the work on it
    await initSessions(db);
    const api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    const get = (path: string) => api.fetch(new Request(`http://play.test${path}`, { headers: { cookie: `play_session=${tokenFor(ada)}` }, redirect: "manual" }));
    const moved = await get(`/api/proposals/${twoB}`);
    expect(moved.status).toBe(308);
    expect(moved.headers.get("location")).toBe(`/api/intents/${two}`);
    expect((await get(`/api/proposals/${crypto.randomUUID()}`)).status).toBe(404);
    const byOld = await (await get(`/api/intents/${sp}`)).json();
    expect(byOld).toMatchObject({ id: storyIntent, stage: "proposal", work: { kind: "story_version", story_id: story, status: "proposal" } });
    expect(byOld.review.diff).toBeDefined();
    const board = await (await get(`/api/intents`)).json();
    // one intent for each proposal, and the one back in Prototype that kept none
    expect(board.length).toBe(all.length + 1);
    expect(board.find((i: any) => i.id === two).work).toMatchObject({ kind: "asset_version", status: "proposal", label: "Fern", number: 2, author: "cit" });
  });
});
