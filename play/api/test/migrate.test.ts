// play's migrations run twice at once on a deploy: play-api migrates as it starts, and the import run beside it
// migrates too (2026-11-06: the second ran 0029-one-record again after the first had, and the deploy failed on
// "column work already exists"). Two migrate() calls at once on a fresh database: both finish, every migration ran
// exactly once, and a third finds nothing to run.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MIGRATIONS, migrate } from "../src/migrations";
import { fromBunSql } from "../src/pg";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

suite("migrate, twice at once", () => {
  let admin: Bun.SQL, a: Bun.SQL, b: Bun.SQL, name: string;
  beforeAll(async () => {
    name = `play_migrate_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    a = new Bun.SQL(u.toString());
    b = new Bun.SQL(u.toString());
  });
  afterAll(async () => {
    await a?.close();
    await b?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("both finish, each migration runs once", async () => {
    const [x, y] = await Promise.all([migrate(fromBunSql(a)), migrate(fromBunSql(b))]);
    expect([...x, ...y].sort()).toEqual(MIGRATIONS.map((m) => m.id).sort());
    const rows = await a.unsafe(`SELECT id FROM play.migrations ORDER BY id`);
    expect(rows.map((r: any) => r.id)).toEqual(MIGRATIONS.map((m) => m.id).sort());
    expect(await migrate(fromBunSql(a))).toEqual([]);
  }, 60_000);
});

// 0032-versioned (play/SPEC.md "Version control", intent 30dfa87a-b3c6-4af8-a3be-aac03907ff37, check c3): a database at
// 0031 holding work of every kind (a factory, a game config and a skill, at Proposal and accepted; an asset's and a
// story's at Proposal), migrated on: the store's tables take the words, every intent's work names its document and its
// variant and keeps its stage, the per-kind columns and tables are gone, and every intent is still reviewed and decided.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { Rate } from "../src/limits";
import { COOP } from "../src/ids";
import { levelling } from "../import/gameconfigs";
import { lifetracLine } from "../import/factories";
import { intents as intentsSkill } from "../import/skills";
import { branchOld, commitOld, createOldDoc, proposeOld } from "./olddocs";

suite("0032-versioned: every kind's work moved onto documents and variants", () => {
  let admin: Bun.SQL, sql: Bun.SQL, name: string;
  const db = () => fromBunSql(sql);
  beforeAll(async () => {
    name = `play_migrate32_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
  });
  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("from 0031, every intent keeps its stage and work, named by its document and variant, and is still reviewed and decided", async () => {
    const d = db();
    await migrate(d, { until: "0031-skills" });
    const q = async (text: string, args: unknown[] = []) => (await d.query<any>(text, args)).rows;
    const ada = crypto.randomUUID();
    await q(`INSERT INTO play.humans (id, name) VALUES ($1, 'ada')`, [ada]);
    await q(`INSERT INTO play.memberships (coop_id, human_id, level) VALUES ($1, $2, 'admin')`, [COOP, ada]);
    const author = { human: ada, via: "mcp" };
    const ids = { factory: crypto.randomUUID(), game: crypto.randomUUID(), skill: crypto.randomUUID(), asset: crypto.randomUUID(), story: crypto.randomUUID() };
    // a document of each kind, a variant proposed (and, for the factory, one accepted before)
    const made: Record<string, { variant: number; intent: string }> = {};
    const intentFor = async (work: string, cols: Record<string, unknown>, stage = "proposal") => {
      const id = crypto.randomUUID();
      const keys = Object.keys(cols);
      await q(
        `INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, work, work_note, proposed_by, proposed_via, proposed_at, ${keys.join(", ")})
         VALUES ($1, $2, 'improve', 'A change', '', $3, $4, 'mcp', $5, 'a change', $4, 'mcp', now(), ${keys.map((_, i) => `$${i + 6}`).join(", ")})`,
        [id, COOP, stage, ada, work, ...keys.map((k) => cols[k])],
      );
      return id;
    };
    const docWith = async (kind: string, uuid: string, schema: string, json: any, change: (j: any) => any, col: string, work: string, row: string, stage = "proposal") => {
      if (!(await q(`SELECT 1 FROM play.docs WHERE id = $1`, [`${kind}:${uuid}`])).length) {
        await createOldDoc(d, { id: `${kind}:${uuid}`, schema, json, author, message: "v1", version: "first" });
        await q(row, [uuid]);
      }
      const b = await branchOld(d, `${kind}:${uuid}`, { author, note: "a change" });
      await commitOld(d, `${kind}:${uuid}`, { branch: b, target: change(json), message: "a change", author });
      await proposeOld(d, b, "a change");
      const intent = await intentFor(work, { [col]: uuid, doc_branch: b }, stage);
      await q(`UPDATE play.doc_branches SET intent_id = $1${stage === "accepted" ? ", status = 'accepted'" : ""} WHERE id = $2`, [intent, b]);
      return { variant: b, intent };
    };
    const line = lifetracLine(), levels = levelling(), skill = intentsSkill();
    made.factoryDone = await docWith("factory", ids.factory, "factory/1", line, (j) => ({ ...j, note: "once" }), "factory_id", "factory_version", `INSERT INTO play.factories (id, coop_id, label) VALUES ($1, '${COOP}', 'LifeTrac line')`, "accepted");
    made.factory = await docWith("factory", ids.factory, "factory/1", line, (j) => ({ ...j, label: "The LifeTrac line" }), "factory_id", "factory_version", "");
    made.game = await docWith("game", ids.game, "levels/1", levels, (j) => ({ ...j, label: "Village levels" }), "game_config_id", "game_config_version", `INSERT INTO play.game_configs (id, coop_id, label) VALUES ($1, '${COOP}', 'Levelling')`);
    made.skill = await docWith("skill", ids.skill, "skill/1", skill, (j) => ({ ...j, note: "shorter" }), "skill_id", "skill_version", `INSERT INTO play.skills (id, coop_id, label, grp) VALUES ($1, '${COOP}', 'Intents', 'intents')`);
    // an asset's and a story's: their frozen versions beside their documents
    await q(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', 'fern', 'Fern')`, [ids.asset, COOP]);
    const av = "a".repeat(64);
    const recipe = "d".repeat(64);
    await q(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, 1, 'text/javascript', 'blobs/dd/x')`, [recipe]);
    await q(`INSERT INTO play.asset_versions (id, asset_id, recipe_hash, card) VALUES ($1, $2, $3, '{}')`, [av, ids.asset, recipe]);
    await createOldDoc(d, { id: `asset:${ids.asset}`, schema: "asset/1", json: { schema: "asset/1", label: "Fern", source: "" }, author, message: "a new asset" });
    const ab = await branchOld(d, `asset:${ids.asset}`, { author, note: "a fern" });
    await commitOld(d, `asset:${ids.asset}`, { branch: ab, target: { schema: "asset/1", label: "Fern", source: "module.exports.recipe = () => null;\n" }, message: "a fern", author });
    await proposeOld(d, ab, "a fern");
    made.asset = { variant: ab, intent: await intentFor("asset_version", { asset_id: ids.asset, version: av, doc_branch: ab }) };
    const body = (line: string) => ({ schema: "story/1", format: "9:16", fps: 30, duration: 2, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "a", at: 0, duration: 2, who: "MAIA", line }] }] });
    await q(`INSERT INTO play.stories (id, coop_id, title) VALUES ($1, $2, 'A film')`, [ids.story, COOP]);
    const s1 = "b".repeat(64), s2 = "c".repeat(64);
    await q(`INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note) VALUES ($1, $3, 1, '{}', 'A film', ($4::text)::jsonb, 'one'), ($2, $3, NULL, ARRAY[$1], 'A film', ($5::text)::jsonb, 'two')`, [s1, s2, ids.story, JSON.stringify(body("one")), JSON.stringify(body("two"))]);
    await q(`UPDATE play.stories SET head = $2 WHERE id = $1`, [ids.story, s1]);
    await createOldDoc(d, { id: `story:${ids.story}`, schema: "story/1", json: { title: "A film", ...body("one") }, author, message: "v1", version: "one" });
    const sb = await branchOld(d, `story:${ids.story}`, { author, note: "two" });
    await commitOld(d, `story:${ids.story}`, { branch: sb, target: { title: "A film", ...body("two") }, message: "two", author });
    await proposeOld(d, sb, "two");
    made.story = { variant: sb, intent: await intentFor("story_version", { story_id: ids.story, story_base: s1, story_version: s2, doc_branch: sb }) };

    // ---- 0032
    expect(await migrate(d)).toEqual(MIGRATIONS.filter((m) => m.id > "0031-skills").map((m) => m.id));
    expect((await q(`SELECT to_regclass('play.doc_branches') AS a, to_regclass('play.doc_updates') AS b, to_regclass('play.doc_variants') AS c, to_regclass('play.doc_edits') AS e, to_regclass('play.factories') AS f, to_regclass('play.game_configs') AS g, to_regclass('play.skills') AS s, to_regclass('play.proposal_ids') AS p`))[0])
      .toEqual({ a: null, b: null, c: "play.doc_variants", e: "play.doc_edits", f: null, g: null, s: null, p: null });
    for (const c of ["factory_id", "game_config_id", "skill_id", "doc_branch"]) expect((await q(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'play' AND table_name = 'intents' AND column_name = $1`, [c])).length).toBe(0);
    const docOf: Record<string, string> = { factoryDone: `factory:${ids.factory}`, factory: `factory:${ids.factory}`, game: `game:${ids.game}`, skill: `skill:${ids.skill}`, asset: `asset:${ids.asset}`, story: `story:${ids.story}` };
    for (const [k, m] of Object.entries(made)) {
      const [i] = await q(`SELECT stage, doc_id, doc_variant FROM play.intents WHERE id = $1`, [m.intent]);
      expect({ k, ...i }).toEqual({ k, stage: k === "factoryDone" ? "accepted" : "proposal", doc_id: docOf[k], doc_variant: String(m.variant) });
    }
    expect((await q(`SELECT label, grp FROM play.docs WHERE id = $1`, [`skill:${ids.skill}`]))[0]).toEqual({ label: "Intents", grp: "intents" });
    expect(Number((await q(`SELECT count(*) AS n FROM play.doc_edits WHERE doc_id = $1`, [`story:${ids.story}`]))[0].n)).toBe(2);

    // still reviewed and decided, through the API
    await initSessions(d);
    const api = app({ db: d, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    const call = async (method: string, path: string) => {
      const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers: { cookie: `play_session=${tokenFor(ada)}` } }));
      return { status: r.status, data: await r.json() };
    };
    for (const k of ["factory", "game", "skill", "asset", "story"]) {
      const r = await call("GET", `/api/intents/${made[k].intent}`);
      expect({ k, status: r.status }).toEqual({ k, status: 200 });
      expect(r.data.review.edits.length).toBeGreaterThan(0);
      expect(r.data.review.changes.length).toBeGreaterThan(0);
    }
    for (const k of ["factory", "game", "skill"]) expect((await call("POST", `/api/intents/${made[k].intent}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 2 } });
    expect((await call("GET", `/api/docs/${ids.factory}`)).data.json.label).toBe("The LifeTrac line");
    for (const k of ["asset", "story"]) expect((await call("POST", `/api/intents/${made[k].intent}/reject`)).data.stage).toBe("archived");
  }, 60_000);
});
