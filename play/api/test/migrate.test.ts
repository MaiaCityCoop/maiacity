// play's migrations against a real Postgres (set TEST_DATABASE_URL, as for ./api.test.ts).
//
// They run twice at once on a deploy: play-api migrates as it starts, and the import run beside it migrates too
// (2026-11-06: the second ran 0029-one-record again after the first had, and the deploy failed on "column work already
// exists"). Two migrate() calls at once on a fresh database: both finish, every migration ran exactly once, and a third
// finds nothing to run.
//
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MIGRATIONS, migrate } from "../src/migrations";
import { fromBunSql } from "../src/pg";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { hashText } from "../src/hash";
import { Rate } from "../src/limits";
import { RECIPE_HEAD, recipeTail } from "../src/recipes";
import { storyVersionId } from "../src/versions";
import { oldAccept, oldBranch, oldCommit, oldCreate, oldPropose } from "./fixtures/olddocs";
import { problemsOf, readDoc, typeFor } from "../src/docs";
import { SCHEMA } from "../src/ids";
import "../src/versioned";

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

// Migration 0032-versioned (play/SPEC.md "Version control"): a database made at 0031 holding work of every kind at
// Proposal and accepted (an asset's, a story's, a factory's, a config's, a skill's), migrated: doc_variants and
// doc_edits replace doc_branches and doc_updates, every intent's work names its doc_id and doc_variant and keeps its
// stage, the columns per kind are gone, and every intent is still reviewed and decided.
const COOP = "12f8d4e7-701f-8727-a327-de9b240ea867";

suite("migration 0032-versioned", () => {
  let admin: Bun.SQL, sql: Bun.SQL, name: string;
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

  test("work of every kind at Proposal and accepted: its document's variant named on the intent, its stage kept, still reviewed and decided", async () => {
    const db = fromBunSql(sql);
    expect((await migrate(db, { until: "0031-skills" })).at(-1)).toBe("0031-skills");
    const q = async (text: string, args: unknown[] = []) => (await db.query<any>(text, args)).rows;
    const ada = (await createHuman(db, "ada")).id;
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [ada]);
    const author = { human: ada, via: "mcp" };
    /** an intent holding work, as 0029-0031 wrote it */
    const intent = async (stage: "proposal" | "accepted", work: string, refs: Record<string, unknown>) => {
      const id = crypto.randomUUID();
      const cols = Object.keys(refs);
      await db.query(
        `INSERT INTO play.intents (id, coop_id, kind, title, stage, author, via, work, ${cols.join(", ")}, work_note, proposed_by, proposed_via, proposed_at, decided_at)
         VALUES ($1, $2, 'improve', $3, $4, $5, 'mcp', $3, ${cols.map((_, i) => `$${i + 6}`).join(", ")}, 'the work', $5, 'mcp', now(), ${stage === "accepted" ? "now()" : "NULL"})`,
        [id, COOP, work, stage, ada, ...Object.values(refs)],
      );
      return id;
    };
    const made: { id: string; kind: string; stage: string; doc: string; branch: number }[] = [];

    // a factory, a config and a skill: each a document, one branch accepted and one at Proposal
    const docKinds = [
      { kind: "factory_version", col: "factory_id", table: "play.factories", prefix: "factory", schema: "factory/1",
        json: { schema: "factory/1", label: "Old line", line: { product: { name: "a cog" }, demand: { perDay: 10 }, calendar: {}, stations: [{ id: "cut", name: "Cut", machine: "laser" }] }, parts: [] },
        a: { path: ["line", "demand", "perDay"], value: 12 }, b: { path: ["line", "stations", 0, "buffer"], value: 3 } },
      { kind: "game_config_version", col: "game_config_id", table: "play.game_configs", prefix: "game", schema: "levels/1",
        json: { schema: "levels/1", label: "Old levels", villager: { euros: 1, hearts: 1 }, minds: { heartsPerMind: 1, step: 1, heartsPerEuro: 1 }, levels: [{ id: "l1", villagers: 1, phase: "tents", investor: 0, unlocks: [] }] },
        a: { path: ["villager", "euros"], value: 2 }, b: { path: ["levels", 0, "phase"], value: "domes" } },
      { kind: "skill_version", col: "skill_id", table: "play.skills", prefix: "skill", schema: "skill/1",
        json: { schema: "skill/1", label: "Old skill", group: "tests", system: "Say it." },
        a: { path: ["note"], value: "noted" }, b: { path: ["system"], value: "Say it twice." } },
    ];
    for (const k of docKinds) {
      const id = crypto.randomUUID(), doc = `${k.prefix}:${id}`;
      await db.query(`INSERT INTO ${k.table} (id, coop_id, label${k.prefix === "skill" ? ", grp" : ""}) VALUES ($1, $2, $3${k.prefix === "skill" ? ", 'tests'" : ""})`, [id, COOP, k.json.label]);
      await oldCreate(db, { id: doc, schema: k.schema, json: k.json, author, message: "v1", version: "its first" });
      const won = await oldBranch(db, doc, { author, note: "accepted" });
      await oldCommit(db, doc, { branch: won, edits: [{ op: "set", ...k.a } as any], message: "the accepted edit", author });
      await oldPropose(db, won, "accepted");
      await oldAccept(db, doc, won, author, "accepted");
      made.push({ id: await intent("accepted", k.kind, { [k.col]: id, doc_branch: won }), kind: k.kind, stage: "accepted", doc, branch: won });
      const waits = await oldBranch(db, doc, { author, note: "waiting" });
      await oldCommit(db, doc, { branch: waits, edits: [{ op: "set", ...k.b } as any], message: "the waiting edit", author });
      await oldPropose(db, waits, "waiting");
      made.push({ id: await intent("proposal", k.kind, { [k.col]: id, doc_branch: waits }), kind: k.kind, stage: "proposal", doc, branch: waits });
    }

    // a story: v2 accepted through a branch, v3 waiting on one
    const story = crypto.randomUUID(), sdoc = `story:${story}`;
    const body = (line: string) => ({ schema: "story/1", format: "9:16", fps: 30, duration: 4, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 4, who: "MAIA", line }] }] });
    const s1 = storyVersionId({ story, parents: [], title: "Old film", body: body("one") });
    const s2 = storyVersionId({ story, parents: [s1], title: "Old film", body: body("two") });
    const s3 = storyVersionId({ story, parents: [s2], title: "Old film", body: body("three") });
    await db.query(`INSERT INTO play.stories (id, coop_id, title) VALUES ($1, $2, 'Old film')`, [story, COOP]);
    await db.query(
      `INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note) VALUES ($1, $4, 1, '{}', 'Old film', ($5::text)::jsonb, 'one'), ($2, $4, 2, $7, 'Old film', ($6::text)::jsonb, 'two'), ($3, $4, NULL, $9, 'Old film', ($8::text)::jsonb, 'three')`,
      [s1, s2, s3, story, JSON.stringify(body("one")), JSON.stringify(body("two")), [s1], JSON.stringify(body("three")), [s2]],
    );
    await db.query(`UPDATE play.stories SET head = $2 WHERE id = $1`, [story, s2]);
    await oldCreate(db, { id: sdoc, schema: "story/1", json: { title: "Old film", ...body("one") }, author, message: "v1", version: "one" });
    const sWon = await oldBranch(db, sdoc, { author });
    await oldCommit(db, sdoc, { branch: sWon, target: { title: "Old film", ...body("two") }, message: "two", author });
    await oldPropose(db, sWon, "two");
    await oldAccept(db, sdoc, sWon, author, "two");
    made.push({ id: await intent("accepted", "story_version", { story_id: story, story_base: s1, story_version: s2, doc_branch: sWon }), kind: "story_version", stage: "accepted", doc: sdoc, branch: sWon });
    const sWaits = await oldBranch(db, sdoc, { author });
    await oldCommit(db, sdoc, { branch: sWaits, target: { title: "Old film", ...body("three") }, message: "three", author });
    await oldPropose(db, sWaits, "three");
    made.push({ id: await intent("proposal", "story_version", { story_id: story, story_base: s2, story_version: s3, doc_branch: sWaits }), kind: "story_version", stage: "proposal", doc: sdoc, branch: sWaits });

    // an asset: v2 accepted through a branch, v3 waiting on one
    const store = folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));
    const asset = crypto.randomUUID(), adoc = `asset:${asset}`;
    const src = (line: string) => `module.exports.recipe = function (id, v) {\n  // ${line}\n  return { meta: { id, v } };\n};\n`;
    const version = async (n: number | null, line: string, parents: string[]) => {
      const source = src(line), recipe = RECIPE_HEAD + source + recipeTail("old-fern", n ?? 3, null);
      for (const t of [source, recipe]) {
        await store.put(hashText(t), new TextEncoder().encode(t), "text/javascript");
        await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [hashText(t), t.length, `blobs/${hashText(t).slice(0, 2)}/${hashText(t)}`]);
      }
      const id = hashText(`old-fern|${line}`);
      await db.query(`INSERT INTO play.asset_versions (id, asset_id, parents, number, recipe_hash, source_hash, card, engine, note) VALUES ($1, $2, $3, $4, $5, $6, '{"card":{}}', 5, $7)`, [id, asset, parents, n, hashText(recipe), hashText(source), line]);
      return { id, source };
    };
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', 'old-fern', 'Old fern')`, [asset, COOP]);
    const a1 = await version(1, "one", []), a2 = await version(2, "two", [hashText("old-fern|one")]), a3 = await version(null, "three", [hashText("old-fern|two")]);
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [asset, a2.id]);
    const ajson = (source: string) => ({ schema: "asset/1", label: "Old fern", source, engine: 5, card: { card: {} } });
    await oldCreate(db, { id: adoc, schema: "asset/1", json: ajson(a1.source), author, message: "v1", version: "one" });
    const aWon = await oldBranch(db, adoc, { author });
    await oldCommit(db, adoc, { branch: aWon, target: ajson(a2.source), message: "two", author });
    await oldPropose(db, aWon, "two");
    await oldAccept(db, adoc, aWon, author, "two");
    made.push({ id: await intent("accepted", "asset_version", { asset_id: asset, base: a1.id, version: a2.id, doc_branch: aWon }), kind: "asset_version", stage: "accepted", doc: adoc, branch: aWon });
    const aWaits = await oldBranch(db, adoc, { author });
    await oldCommit(db, adoc, { branch: aWaits, target: ajson(a3.source), message: "three", author });
    await oldPropose(db, aWaits, "three");
    made.push({ id: await intent("proposal", "asset_version", { asset_id: asset, base: a2.id, version: a3.id, doc_branch: aWaits }), kind: "asset_version", stage: "proposal", doc: adoc, branch: aWaits });
    for (const m of made) await db.query(`UPDATE play.doc_branches SET intent_id = $2 WHERE id = $1`, [m.branch, m.id]);
    const edits = Number((await q(`SELECT count(*) AS n FROM play.doc_updates`))[0].n);

    // ---- 0032, then the rest: 0033-build and 0034-schemas with ensureSchemas, every schema a document of the meta-schema
    expect(await migrate(db, { until: "0032-versioned" })).toEqual(["0032-versioned"]);
    expect(await migrate(db)).toEqual(["0033-build", "0034-schemas"]);
    // every schema a document, v1 from the seed; every document made before names its schema's UUID and version, and
    // is still valid against that schema as Postgres holds it (play/SPEC.md "Version control")
    const schemas = await q(`SELECT d.id, d.schema_id, (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = d.id) AS n FROM play.docs d WHERE d.id LIKE 'schema:%' ORDER BY d.id`);
    expect(schemas.map((r) => r.id.split(":")[1]).sort()).toEqual(Object.values(SCHEMA).sort());
    for (const r of schemas) expect([r.schema_id, r.n]).toEqual([SCHEMA.meta, 1]);
    const older = await q(`SELECT id, schema, schema_id, schema_version FROM play.docs WHERE id NOT LIKE 'schema:%' ORDER BY id`);
    expect(older.length).toBeGreaterThanOrEqual(5);
    const byName: Record<string, string> = { "story/1": SCHEMA.story, "asset/1": SCHEMA.asset, "factory/1": SCHEMA.factory, "levels/1": SCHEMA.levels, "skill/1": SCHEMA.skill };
    for (const d of older) {
      expect([d.id, d.schema_id, d.schema_version]).toEqual([d.id, byName[d.schema], 1]);
      expect([d.id, problemsOf(await typeFor(db, d.schema_id), (await readDoc(db, d.id)).json)]).toEqual([d.id, []]);
    }
    expect(await migrate(db)).toEqual([]);
    expect(Number((await q(`SELECT count(*) AS n FROM play.docs WHERE id LIKE 'schema:%'`))[0].n)).toBe(schemas.length);
    for (const [t, there] of [["doc_variants", true], ["doc_edits", true], ["doc_branches", false], ["doc_updates", false], ["proposal_ids", false]] as const)
      expect(!!(await q(`SELECT to_regclass('play.${t}') AS t`))[0].t).toBe(there);
    const cols = (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'play' AND table_name = 'intents'`)).map((r) => r.column_name);
    for (const gone of ["factory_id", "game_config_id", "skill_id", "doc_branch"]) expect(cols).not.toContain(gone);
    for (const kept of ["doc_id", "doc_variant", "asset_id", "version", "base", "story_id", "story_version", "story_base", "sandbox_change"]) expect(cols).toContain(kept);
    // every edit kept, each on a variant; one Main for each document, every edit not on an intent variant on it
    expect(Number((await q(`SELECT count(*) AS n FROM play.doc_edits WHERE doc_id NOT LIKE 'schema:%'`))[0].n)).toBe(edits);
    expect(await q(`SELECT doc_id FROM play.doc_variants WHERE type = 'main' GROUP BY doc_id HAVING count(*) <> 1`)).toEqual([]);
    expect(Number((await q(`SELECT count(*) AS n FROM play.docs d WHERE NOT EXISTS (SELECT 1 FROM play.doc_variants v WHERE v.doc_id = d.id AND v.type = 'main')`))[0].n)).toBe(0);
    // every intent's work names its document and variant, its stage as it was
    for (const m of made)
      expect((await q(`SELECT stage, work, doc_id, doc_variant::int AS v FROM play.intents WHERE id = $1`, [m.id]))[0]).toEqual({ stage: m.stage, work: m.kind, doc_id: m.doc, v: m.branch });
    expect((await q(`SELECT type, intent_id FROM play.doc_variants WHERE id = $1`, [made[0].branch]))[0]).toEqual({ type: "intent", intent_id: made[0].id });
    // what an intent's work names is one rule
    await expect(db.query(`UPDATE play.intents SET doc_id = NULL WHERE id = $1`, [made[0].id])).rejects.toThrow(/intents_work_names_what/);

    // and every one still reviewed and decided
    await initSessions(db);
    const api = app({ db, store, rate: new Rate(0) });
    const as = (method: string, path: string) => api.fetch(new Request(`http://play.test${path}`, { method, headers: { cookie: `play_session=${tokenFor(ada)}` } })).then(async (r) => ({ status: r.status, data: await r.json() }));
    for (const m of made) {
      const got = await as("GET", `/api/intents/${m.id}`);
      expect(got.status).toBe(200);
      expect(got.data).toMatchObject({ stage: m.stage, work: { kind: m.kind, doc_id: m.doc, doc_variant: m.branch } });
      expect(got.data.review.edits.length).toBeGreaterThanOrEqual(1);
      expect(got.data.review.changes.length).toBeGreaterThanOrEqual(1);
      if (m.stage !== "proposal") continue;
      expect(got.data.review.moved).toBe(false);
      const decided = await as("POST", `/api/intents/${m.id}/accept`);
      expect(decided.data).toMatchObject({ stage: "accepted", decision: { status: "accepted" } });
    }
    // their documents' histories read whole by today's store, each with its new version
    for (const doc of new Set(made.map((m) => m.doc))) {
      const h = await as("GET", `/api/docs/${doc.split(":")[1]}/history`);
      expect(h.status).toBe(200);
      expect(h.data.versions.at(-1).number).toBe(3);
      expect(h.data.edits.at(-1).kind).toBe("merge");
    }
  }, 60_000);
});
