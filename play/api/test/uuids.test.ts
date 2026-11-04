// Migration 0017-uuids (Samuel 2026-11-04: every reference is a UUID or a hash; a name is only shown): a database as
// production had it before, its coop, sandboxes and stories named by readable ids and its story documents by them, is
// moved onto UUIDs whole, every row that names one with it, and nothing of a story's kept history is lost.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MIGRATIONS, migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { COOP, SANDBOX } from "../src/ids";
import { UUID, uuidOf } from "../src/uuid";
import { storyVersionId } from "../src/versions";
import { commit, createDoc, history, readDoc } from "../src/docs";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const body = (line: string) => ({ schema: "story/1", format: "9:16", fps: 30, duration: 4, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 4, who: "MAIA", line }] }] });

suite("every reference a UUID (migration 0017)", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;

  beforeAll(async () => {
    name = `play_uuids_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
  });
  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("the ids play's code names are the ones the migration gives", () => {
    expect(COOP).toBe(uuidOf("coop:maia-city"));
    expect({ ...SANDBOX } as Record<string, string>).toEqual({ one: uuidOf("sandbox:sandbox-1"), two: uuidOf("sandbox:sandbox-2"), three: uuidOf("sandbox:sandbox-3"), factories: uuidOf("sandbox:factories") });
    for (const id of [COOP, ...Object.values(SANDBOX)]) expect(id).toMatch(UUID);
  });

  test("a database named by slugs is moved onto UUIDs whole, its stories' documents and history with it", async () => {
    // the database as production had it before 0017
    await db.exec(`CREATE SCHEMA IF NOT EXISTS play; CREATE TABLE IF NOT EXISTS play.migrations (id TEXT PRIMARY KEY, ran TIMESTAMPTZ NOT NULL DEFAULT now());`);
    for (const m of MIGRATIONS.filter((m) => m.id < "0017")) await db.transaction(async (tx) => (await tx.query(m.sql), await tx.query(`INSERT INTO play.migrations (id) VALUES ($1)`, [m.id])));
    const ada = { id: crypto.randomUUID() };
    await db.query(`INSERT INTO play.humans (id, name) VALUES ($1, 'ada')`, [ada.id]);
    await db.query(`INSERT INTO play.memberships (coop_id, human_id, level) VALUES ('maia-city', $1, 'admin')`, [ada.id]);
    const v1 = storyVersionId({ story: "old-film", parents: [], title: "Old film", body: body("first") });
    const c1 = storyVersionId({ story: "old-cut", parents: [], title: "Old cut", body: body("cut") });
    const p2 = storyVersionId({ story: "old-film", parents: [v1], title: "Old film", body: body("second") });
    await db.query(`INSERT INTO play.stories (id, coop_id, title) VALUES ('old-film', 'maia-city', 'Old film'), ('old-cut', 'maia-city', 'Old cut')`);
    await db.query(
      `INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note) VALUES
        ($1, 'old-film', 1, '{}', 'Old film', ($2::text)::jsonb, 'one'), ($3, 'old-cut', 1, '{}', 'Old cut', ($4::text)::jsonb, 'cut'),
        ($5, 'old-film', NULL, $6, 'Old film', ($7::text)::jsonb, 'two')`,
      [v1, JSON.stringify(body("first")), c1, JSON.stringify(body("cut")), p2, [v1], JSON.stringify(body("second"))],
    );
    await db.query(`UPDATE play.stories SET head = $1 WHERE id = 'old-film'`, [v1]);
    await db.query(`UPDATE play.stories SET head = $1, folded_into = 'old-film' WHERE id = 'old-cut'`, [c1]);
    const author = { human: ada.id, via: "mcp" as const };
    await createDoc(db, { id: "story:old-film", schema: "story/1", json: { title: "Old film", ...body("first") }, author, message: "v1", version: "one" });
    await commit(db, "story:old-film", { edits: [{ op: "set", path: ["tracks", 0, "clips", 0, "who"], value: "SAMUEL" }], message: "the speaker", author });
    const steps = (await history(db, "story:old-film")).length;
    const proposal = crypto.randomUUID(), change = crypto.randomUUID();
    await db.query(`INSERT INTO play.proposals (id, coop_id, kind, story_id, story_base, story_version, author, note, via) VALUES ($1, 'maia-city', 'story_version', 'old-film', $2, $3, $4, 'two', 'mcp')`, [proposal, v1, p2, ada.id]);
    await db.query(`INSERT INTO play.sandbox_configs (sandbox_id, name, data) VALUES ('sandbox-1', 'garden', '{"outside":{}}')`);
    await db.query(
      `INSERT INTO play.proposals (id, coop_id, kind, sandbox_id, sandbox_base, sandbox_change, author, note, via) VALUES ($1, 'maia-city', 'sandbox_change', 'sandbox-2', 'x', '[]', $2, 'n', 'mcp')`,
      [change, ada.id],
    );

    // 0017 runs, then whatever came after it
    expect((await migrate(db))[0]).toBe("0017-uuids");

    const film = uuidOf("story:old-film"), cut = uuidOf("story:old-cut");
    const q = async (text: string, args: unknown[] = []) => (await db.query<any>(text, args)).rows;
    expect(await q(`SELECT id, coop_id, folded_into FROM play.stories ORDER BY title`)).toEqual([
      { id: cut, coop_id: COOP, folded_into: film },
      { id: film, coop_id: COOP, folded_into: null },
    ]);
    expect((await q(`SELECT DISTINCT story_id FROM play.story_versions WHERE story_id = $1`, [film])).length).toBe(1);
    expect(await q(`SELECT id FROM play.story_versions WHERE story_id = $1 ORDER BY id`, [film])).toEqual([v1, p2].sort().map((id) => ({ id })));
    expect(await q(`SELECT story_id, coop_id FROM play.proposals WHERE id = $1`, [proposal])).toEqual([{ story_id: film, coop_id: COOP }]);
    expect(await q(`SELECT sandbox_id FROM play.proposals WHERE id = $1`, [change])).toEqual([{ sandbox_id: SANDBOX.two }]);
    expect(await q(`SELECT sandbox_id FROM play.sandbox_configs`)).toEqual([{ sandbox_id: SANDBOX.one }]);
    expect((await q(`SELECT id, title FROM play.sandboxes ORDER BY title`)).map((r) => r.id)).toEqual([SANDBOX.factories, SANDBOX.one, SANDBOX.two, SANDBOX.three]);
    expect(await q(`SELECT coop_id FROM play.memberships`)).toEqual([{ coop_id: COOP }]);
    expect((await q(`SELECT DISTINCT coop_id FROM play.level_rules`)).map((r) => r.coop_id)).toEqual([COOP]);
    // the story's document, renamed, its every step kept and still read back
    expect(await q(`SELECT id FROM play.docs`)).toEqual([{ id: `story:${film}` }]);
    expect((await history(db, `story:${film}`)).length).toBe(steps);
    expect((await readDoc(db, `story:${film}`)).json.tracks[0].clips[0].who).toBe("SAMUEL");
    // the history is append only again, and every foreign key holds
    await expect(db.query(`DELETE FROM play.doc_updates`)).rejects.toThrow(/append only/);
    await expect(db.query(`UPDATE play.proposals SET story_id = $1 WHERE id = $2`, [crypto.randomUUID(), proposal])).rejects.toThrow(/foreign key/);
    await expect(db.query(`INSERT INTO play.docs (id, type, schema) VALUES ('story:old-film', 'story', 'story/1')`)).rejects.toThrow(/docs_id_check/);
    // a new story or sandbox gets a random UUID; two assets may share a group and slug
    expect((await q(`INSERT INTO play.stories (coop_id, title) VALUES ($1, 'New') RETURNING id`, [COOP]))[0].id).toMatch(UUID);
    await db.query(`INSERT INTO play.assets (coop_id, grp, slug, label) VALUES ($1, 'plants', 'fern', 'Fern'), ($1, 'plants', 'fern', 'Another fern')`, [COOP]);
  });
});
