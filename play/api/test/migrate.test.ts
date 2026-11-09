// play's migrations against a real Postgres (set TEST_DATABASE_URL, as for ./api.test.ts).
//
// They run twice at once on a deploy: play-api migrates as it starts, and the import run beside it migrates too
// (2026-11-06: the second ran 0029-one-record again after the first had, and the deploy failed on "column work already
// exists"). Two migrate() calls at once on a fresh database: both finish, every migration ran exactly once, and a third
// finds nothing to run.
//
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MIGRATIONS, MIGRATIONS_DIR, badId, loadMigrations, migrate } from "../src/migrations";
import { fromBunSql } from "../src/kit/pg";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { Rate } from "../src/limits";
import { RECIPE_HEAD, recipeTail } from "../src/recipes";
import { storyVersionId } from "../src/versions";
import { oldAccept, oldBranch, oldCommit, oldCreate, oldPropose } from "./fixtures/olddocs";
import { problemsOf, readDoc, typeFor } from "../src/docs";
import { SCHEMA } from "../src/kit/ids";
import "../src/allkinds";

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
// stage, the columns per kind are gone, and every intent is still reviewed and decided. Then 202611070117-847c5d38-intent-variants
// (intent 847c5d38): every intent's document and variant a row of play.intent_variants, the intent's own columns gone,
// and an artifact kept before (its authors in order) its v1, read as a document like any other.
const COOP = "12f8d4e7-701f-8727-a327-de9b240ea867";
// every intent with work has a spec (no work without an intent, 706ed873: its migration archives one waiting without),
// so the intents a test seeds with work are specified and approved, as production's at Proposal were
const SPEC = JSON.stringify({ goal: "Its work is in.", scope: "A migration's fixture.", checks: [{ id: "c1", check: "It holds", how: "test", by: "a test", run: "true", must: true, step: "mvp" }] });

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
        `INSERT INTO play.intents (id, coop_id, kind, title, stage, author, via, work, ${cols.join(", ")}, work_note, proposed_by, proposed_via, proposed_at, decided_at, spec, approved_at)
         VALUES ($1, $2, 'improve', $3, $4, $5, 'mcp', $3, ${cols.map((_, i) => `$${i + 7}`).join(", ")}, 'the work', $5, 'mcp', now(), ${stage === "accepted" ? "now()" : "NULL"}, ($6::text)::jsonb, now())`,
        [id, COOP, work, stage, ada, SPEC, ...Object.values(refs)],
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

    // an artifact kept before artifacts were documents, its two authors in order
    const art = crypto.randomUUID(), by = [crypto.randomUUID(), crypto.randomUUID()];
    const agent = (await q(`SELECT id FROM play.agents LIMIT 1`))[0].id;
    for (const [i, a] of by.entries()) await db.query(`INSERT INTO play.authors (id, coop_id, name, kind, agent_id) VALUES ($1, $2, $3, 'person', $4)`, [a, COOP, `Author ${i}`, agent]);
    await db.query(
      `INSERT INTO play.artifacts (id, coop_id, url, title, description, summary, kind, tags, agent_id, origin, operator_id) VALUES ($1, $2, 'https://example.org/old', 'An old page', 'Kept before.', '## What it is', 'page', '{old}', $3, 'human', $4)`,
      [art, COOP, agent, ada],
    );
    for (const [i, a] of [by[1], by[0]].entries()) await db.query(`INSERT INTO play.artifact_authors (artifact_id, author_id, position) VALUES ($1, $2, $3)`, [art, a, i]);

    // ---- 0032
    expect(await migrate(db, { until: "0032-versioned" })).toEqual(["0032-versioned"]);
    for (const [t, there] of [["doc_variants", true], ["doc_edits", true], ["doc_branches", false], ["doc_updates", false], ["proposal_ids", false]] as const)
      expect(!!(await q(`SELECT to_regclass('play.${t}') AS t`))[0].t).toBe(there);
    const cols = (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'play' AND table_name = 'intents'`)).map((r) => r.column_name);
    for (const gone of ["factory_id", "game_config_id", "skill_id", "doc_branch"]) expect(cols).not.toContain(gone);
    for (const kept of ["doc_id", "doc_variant", "asset_id", "version", "base", "story_id", "story_version", "story_base"]) expect(cols).toContain(kept);
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

    // then every migration after 0032 (0033-build and 0034-schemas among them, this intent's intent-variants after them)
    const rest = MIGRATIONS.map((m) => m.id).slice(MIGRATIONS.findIndex((m) => m.id === "0032-versioned") + 1);
    expect(rest.slice(0, 2)).toEqual(["0033-build", "0034-schemas"]);
    expect(rest.some((id) => id.endsWith("-847c5d38-intent-variants"))).toBe(true);
    expect(await migrate(db)).toEqual(rest);
    // every schema a document, v1 from the seed; every document made before names its schema's UUID and version, and
    // is still valid against that schema as Postgres holds it (play/SPEC.md "Version control")
    const schemas = await q(`SELECT d.id, d.schema_id, (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = d.id) AS n FROM play.docs d WHERE d.id LIKE 'schema:%' ORDER BY d.id`);
    expect(schemas.map((r) => r.id.split(":")[1]).sort()).toEqual(Object.values(SCHEMA).sort());
    for (const r of schemas) expect([r.schema_id, r.n]).toEqual([SCHEMA.meta, 1]);
    const older = await q(`SELECT id, schema, schema_id, schema_version FROM play.docs WHERE id NOT LIKE 'schema:%' ORDER BY id`);
    expect(older.length).toBeGreaterThanOrEqual(5);
    const byName: Record<string, string> = { "story/1": SCHEMA.story, "asset/1": SCHEMA.asset, "factory/1": SCHEMA.factory, "levels/1": SCHEMA.levels, "skill/1": SCHEMA.skill, "rules/1": SCHEMA.rules };
    for (const d of older) {
      expect([d.id, d.schema_id, d.schema_version]).toEqual([d.id, byName[d.schema], 1]);
      expect([d.id, problemsOf(await typeFor(db, d.schema_id), (await readDoc(db, d.id)).json)]).toEqual([d.id, []]);
    }
    expect(await migrate(db)).toEqual([]);
    expect(Number((await q(`SELECT count(*) AS n FROM play.docs WHERE id LIKE 'schema:%'`))[0].n)).toBe(schemas.length);

    // ---- 847c5d38's migration: every intent's document and variant a row of play.intent_variants, in place of its own columns
    const after = (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'play' AND table_name = 'intents'`)).map((r) => r.column_name);
    for (const gone of ["doc_id", "doc_variant", "sandbox_change"]) expect(after).not.toContain(gone);
    for (const m of made) expect(await q(`SELECT doc_id, variant_id::int AS v FROM play.intent_variants WHERE intent_id = $1`, [m.id])).toEqual([{ doc_id: m.doc, v: m.branch }]);
    expect((await q(`SELECT author_ids::text[] AS a FROM play.artifacts WHERE id = $1`, [art]))[0].a).toEqual([by[1], by[0]]);
    expect(await q(`SELECT author_id::text AS a, position FROM play.artifact_authors WHERE artifact_id = $1 ORDER BY position`, [art])).toEqual([{ a: by[1], position: 0 }, { a: by[0], position: 1 }]);

    // and every one still reviewed and decided
    await initSessions(db);
    const api = app({ db, store, rate: new Rate(0) });
    const as = (method: string, path: string) => api.fetch(new Request(`http://play.test${path}`, { method, headers: { cookie: `play_session=${tokenFor(ada)}` } })).then(async (r) => ({ status: r.status, data: await r.json() }));
    for (const m of made) {
      const got = await as("GET", `/api/intents/${m.id}`);
      expect(got.status).toBe(200);
      expect(got.data).toMatchObject({ stage: m.stage, work: { kind: m.kind, doc_id: m.doc, doc_variant: m.branch } });
      expect(got.data.review.edits.length).toBeGreaterThanOrEqual(1);
      expect((await as("GET", `/api/intents/${m.id}/docs/${got.data.review.doc.id}`)).data.changes.length).toBeGreaterThanOrEqual(1);
      if (m.stage !== "proposal") continue;
      expect(got.data.review.moved).toBe(false);
      const decided = await as("POST", `/api/intents/${m.id}/accept`);
      expect(decided.data).toMatchObject({ stage: "accepted", decision: { status: "accepted" } });
    }
    // the artifact from before: its v1, as a document like any other; listed as it was
    const ah = await as("GET", `/api/docs/${art}/history`);
    expect(ah.status).toBe(200);
    expect(ah.data).toMatchObject({ kind: "artifact", versions: [{ number: 1 }] });
    const ad = await as("GET", `/api/docs/${art}`);
    expect(ad.data.json).toMatchObject({ schema: "artifact/1", url: "https://example.org/old", title: "An old page", tags: ["old"], origin: "human", operator: ada, authors: [by[1], by[0]] });
    expect((await as("GET", "/api/artifacts")).data.artifacts.map((a: any) => [a.id, a.authors.map((x: any) => x.id)])).toEqual([[art, [by[1], by[0]]]]);
    // their documents' histories read whole by today's store, each with its new version
    for (const doc of new Set(made.map((m) => m.doc))) {
      const h = await as("GET", `/api/docs/${doc.split(":")[1]}/history`);
      expect(h.status).toBe(200);
      expect(h.data.versions.at(-1).number).toBe(3);
      expect(h.data.edits.at(-1).kind).toBe("merge");
    }
  }, 60_000);
});

// Migration 202611070115-d2f50bf1-sandbox-layouts and ensureLayouts (play/SPEC.md §4.6): a database made at 0037 holding a sandbox's pins and configs and
// its changes as the intents' sandbox_* columns kept them (one accepted, one archived, one at Proposal that still
// holds, one that no longer does), migrated: the layout is sandbox:<uuid>, its v1 its pins and configs as they were;
// every change an intent variant of it, each intent keeping its stage; the columns gone; and the one waiting reviewed
// and accepted as the layout's v2, its rows written for the worlds.
suite("migration 202611070115-d2f50bf1-sandbox-layouts", () => {
  let admin: Bun.SQL, sql: Bun.SQL, name: string;
  beforeAll(async () => {
    name = `play_migrate33_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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

  test("every layout its v1, every sandbox change an intent variant, each intent's stage kept, the waiting one still decided", async () => {
    const db = fromBunSql(sql);
    expect((await migrate(db, { until: "0037-intent-depends" })).at(-1)).toBe("0037-intent-depends");
    const q = async (text: string, args: unknown[] = []) => (await db.query<any>(text, args)).rows;
    const ada = (await createHuman(db, "ada")).id;
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [ada]);
    const S2 = "7a7894a9-f37a-8181-9164-920389ee7675";

    // a plant of two accepted versions; Sandbox 2 pins it at v2 (an accepted change moved its gate from v1)
    const store = folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));
    const asset = crypto.randomUUID();
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', 'old-pawpaw', 'Old pawpaw')`, [asset, COOP]);
    const version = async (n: number, parents: string[]) => {
      const source = `module.exports.recipe = function (id, v) {\n  // ${n}\n  return { meta: { id, v } };\n};\n`, recipe = RECIPE_HEAD + source + recipeTail("old-pawpaw", n, null);
      for (const t of [source, recipe]) {
        await store.put(hashText(t), new TextEncoder().encode(t), "text/javascript");
        await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [hashText(t), t.length, `blobs/${hashText(t).slice(0, 2)}/${hashText(t)}`]);
      }
      const id = hashText(`old-pawpaw|${n}`);
      await db.query(`INSERT INTO play.asset_versions (id, asset_id, parents, number, recipe_hash, source_hash, card, engine, note) VALUES ($1, $2, $3, $4, $5, $6, '{"card":{}}', 5, 'v')`, [id, asset, parents, n, hashText(recipe), hashText(source)]);
      return id;
    };
    const v1 = await version(1, []), v2 = await version(2, [hashText("old-pawpaw|1")]);
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [asset, v2]);
    await db.query(`INSERT INTO play.sandbox_pins (sandbox_id, slot, version_id, params) VALUES ($1, 'grove/pawpaw', $2, '{"stage":"9"}'), ($1, 'gate', $2, NULL)`, [S2, v2]);
    await db.query(`INSERT INTO play.sandbox_configs (sandbox_id, name, data) VALUES ($1, 'grove', '{"trees":[{"id":"pawpaw","v":2,"slot":"grove/pawpaw","weight":2}]}')`, [S2]);
    const pin = (v: string) => ({ version: v, variant: null, params: null });
    /** an intent holding a sandbox change, as 0016-0032 wrote it */
    const change = async (stage: "proposal" | "accepted" | "archived", edits: unknown[], diff: unknown[] | null) => {
      const id = crypto.randomUUID();
      await db.query(
        `INSERT INTO play.intents (id, coop_id, kind, title, stage, author, via, work, sandbox_id, sandbox_base, sandbox_change, sandbox_diff, work_note, proposed_by, proposed_via, proposed_at, decided_by, decided_at, spec, approved_at)
         VALUES ($1, $2, 'improve', 'Sandbox 2: a change', $3, $4, 'mcp', 'sandbox_change', $5, 'base', ($6::text)::jsonb, ($7::text)::jsonb, 'the change', $4, 'mcp', now(), $8, $9, ($10::text)::jsonb, now())`,
        [id, COOP, stage, ada, S2, JSON.stringify(edits), diff ? JSON.stringify(diff) : null, stage === "proposal" ? null : ada, stage === "proposal" ? null : new Date(), SPEC],
      );
      return id;
    };
    const accepted = await change("accepted", [{ op: "pin_latest", asset }], [{ kind: "pin", slot: "gate", before: pin(v1), after: pin(v2) }]);
    const archived = await change("archived", [{ op: "unpin", slot: "gate" }], [{ kind: "pin", slot: "gate", before: pin(v2), after: null }]);
    const waits = await change("proposal", [{ op: "set", config: "grove", path: ["trees", 0, "weight"], value: 5 }], [{ kind: "config", config: "grove", path: ["trees", 0, "weight"], before: 2, after: 5 }]);
    const gone = await change("proposal", [{ op: "unpin", slot: "nowhere" }], [{ kind: "pin", slot: "nowhere", before: pin(v1), after: null }]);
    const wasPins = await q(`SELECT slot, version_id, variant, params FROM play.sandbox_pins WHERE sandbox_id = $1 ORDER BY slot`, [S2]);

    // ---- the migration, then ensureLayouts at the end of migrate()
    // (and every migration after it: 847c5d38's intent-variants holds each intent's documents)
    expect((await migrate(db))[0]).toEqual("202611070115-d2f50bf1-sandbox-layouts");
    expect(await q(`SELECT intent_id FROM play.sandbox_changes_kept WHERE NOT moved`)).toEqual([]);
    const cols = (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'play' AND table_name = 'intents'`)).map((r) => r.column_name);
    for (const gone of ["sandbox_id", "sandbox_base", "sandbox_change", "sandbox_diff"]) expect(cols).not.toContain(gone);
    // the layout's v1: its pins and configs as they were; the rows as they were
    const doc = `sandbox:${S2}`;
    const v1doc = await q(`SELECT number, note FROM play.doc_versions WHERE doc_id = $1 ORDER BY number`, [doc]);
    expect(v1doc.map((v) => v.number)).toEqual([1]);
    expect(await q(`SELECT slot, version_id, variant, params FROM play.sandbox_pins WHERE sandbox_id = $1 ORDER BY slot`, [S2])).toEqual(wasPins);
    // every change an intent variant of it, each intent's stage kept
    const variants = new Map((await q(`SELECT id::int AS id, status, intent_id, review FROM play.doc_variants WHERE doc_id = $1 AND type = 'intent'`, [doc])).map((v) => [v.intent_id, v]));
    for (const [id, stage, status] of [[accepted, "accepted", "accepted"], [archived, "archived", "archived"], [waits, "proposal", "proposed"], [gone, "proposal", "proposed"]] as const) {
      const i = (await q(`SELECT i.stage, i.work, iv.doc_id, iv.variant_id::int AS v FROM play.intents i JOIN play.intent_variants iv ON iv.intent_id = i.id WHERE i.id = $1`, [id]))[0];
      expect(i).toEqual({ stage, work: "sandbox_version", doc_id: doc, v: variants.get(id).id });
      expect(variants.get(id)).toMatchObject({ status, review: expect.objectContaining({ edits: expect.any(Array) }) });
    }

    // reviewed and decided as every document's work is
    await initSessions(db);
    const api = app({ db, store, rate: new Rate(0) });
    const as = (method: string, path: string) => api.fetch(new Request(`http://play.test${path}`, { method, headers: { cookie: `play_session=${tokenFor(ada)}` } })).then(async (r) => ({ status: r.status, data: await r.json() }));
    const old = (await as("GET", `/api/intents/${accepted}`)).data;
    expect(old).toMatchObject({ stage: "accepted", work: { kind: "sandbox_version", doc: S2 } });
    expect(old.review.pins).toEqual([{ slot: "gate", before: expect.objectContaining({ label: "Old pawpaw", number: 1 }), after: expect.objectContaining({ label: "Old pawpaw", number: 2 }) }]);
    const w = (await as("GET", `/api/intents/${waits}`)).data;
    expect(w.review).toMatchObject({ holds: true, moved: false, seedNumber: 1 });
    expect((await as("GET", `/api/intents/${waits}/docs/${w.review.doc.id}`)).data.changes).toEqual([expect.objectContaining({ path: "$.configs.grove.trees[id=pawpaw].weight", from: 2, to: 5 })]);
    expect((await as("GET", `/api/intents/${gone}`)).data.review).toMatchObject({ holds: false });
    // its work no longer holds: archived by itself, so its intent (specified, as every one with work) goes back to Build
    expect((await as("POST", `/api/intents/${gone}/accept`)).data).toMatchObject({ stage: "build", decision: { status: "archived" } });
    expect((await as("POST", `/api/intents/${waits}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 2 } });
    expect((await q(`SELECT data FROM play.sandbox_configs WHERE sandbox_id = $1 AND name = 'grove'`, [S2]))[0].data.trees[0].weight).toBe(5);
    const h = (await as("GET", `/api/docs/${S2}/history`)).data;
    expect(h.versions.map((v: any) => v.number)).toEqual([1, 2]);
    expect(h.variants.filter((v: any) => v.type === "intent").map((v: any) => v.status).sort()).toEqual(["accepted", "accepted", "archived", "archived"]);
  }, 60_000);
});

// One file per migration (play/SPEC.md "Migrations"): every shipped migration a file `<id>.sql` of
// play/api/migrations, its SQL byte for byte as it ran (the SHA-256 list frozen from main's array at b5d019e,
// ./fixtures/migrations.sha256.json); the runner reads the folder, runs each file once in name order, and refuses a
// duplicate or malformed id, naming the file.
describe("migrations, one file each", () => {
  const frozen: Record<string, string> = JSON.parse(readFileSync(join(import.meta.dir, "fixtures", "migrations.sha256.json"), "utf8"));
  const sha = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex");

  test("shipped migrations unchanged", () => {
    expect(Object.keys(frozen).length).toBe(34);
    const files = new Set(readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")));
    for (const [id, h] of Object.entries(frozen)) {
      expect(files.has(`${id}.sql`)).toBe(true);
      expect(sha(readFileSync(join(MIGRATIONS_DIR, `${id}.sql`), "utf8"))).toBe(h);
      expect(sha(MIGRATIONS.find((m) => m.id === id)!.sql)).toBe(h);
    }
    // every other migration is well named (0036-step-backs and 0037-intent-depends, numbered in the old array before it went, or a dated one)
    for (const m of MIGRATIONS) if (!(m.id in frozen)) expect(badId(m.id)).toBeNull();
    expect(MIGRATIONS.map((m) => m.id)).toEqual(MIGRATIONS.map((m) => m.id).sort());
  });

  /** a scratch folder holding every migration of play's and the files given */
  function folderWith(extra: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "play-migrations-"));
    for (const f of readdirSync(MIGRATIONS_DIR)) if (f.endsWith(".sql")) copyFileSync(join(MIGRATIONS_DIR, f), join(dir, f));
    for (const [f, sql] of Object.entries(extra)) writeFileSync(join(dir, f), sql);
    return dir;
  }

  test("refuses a duplicate or malformed id", () => {
    const bad = [
      "0038-late",                 // numbered after the last hand-numbered one (0037)
      "2026110712-e9afc2d5-short", // the time without its minutes
      "202611071200-e9afc2d-files", // seven hex
      "202611071200-E9AFC2D5-files", // upper case
      "202611071200-e9afc2d5-Files",
      "202611071200-e9afc2d5",      // no slug
      "202613071200-e9afc2d5-files", // no 13th month
      "files",
    ];
    for (const id of bad) {
      const dir = folderWith({ [`${id}.sql`]: "SELECT 1;" });
      expect(() => loadMigrations(dir)).toThrow(`${id}.sql`);
    }
    // a second file under a shipped number
    expect(() => loadMigrations(folderWith({ "0034-other.sql": "SELECT 1;" }))).toThrow("0034-other.sql");
    expect(() => loadMigrations(folderWith({ "0034-other.sql": "SELECT 1;" }))).toThrow("duplicate");
    // a well-formed new one loads, after 0034-schemas
    const ok = loadMigrations(folderWith({ "209901010000-e9afc2d5-files.sql": "SELECT 1;" }));
    expect(ok.at(-1)!.id).toBe("209901010000-e9afc2d5-files");
  });

  const suiteDb = URL_ ? test : test.skip;
  suiteDb("runs each file once, in name order", async () => {
    const admin = new Bun.SQL(URL_!);
    const names = [1, 2].map(() => `play_migfiles_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
    const conns: Bun.SQL[] = [];
    try {
      for (const n of names) await admin.unsafe(`CREATE DATABASE ${n}`);
      const at = (n: string) => { const u = new URL(URL_!); u.pathname = `/${n}`; const s = new Bun.SQL(u.toString()); conns.push(s); return fromBunSql(s); };
      const extra = {
        "209901010000-e9afc2d5-files.sql": "CREATE TABLE play.mig_probe (n INT); INSERT INTO play.mig_probe VALUES (1);",
        "209901010001-0badc0de-second.sql": "INSERT INTO play.mig_probe VALUES (2);",
      };
      const all = loadMigrations(folderWith(extra));
      const shipped = Object.keys(frozen);

      // as production stands: 0001–0034 applied; migrating with only the shipped ones runs nothing
      const prod = at(names[0]);
      expect(await migrate(prod, { migrations: MIGRATIONS.filter((m) => m.id in frozen) })).toEqual(shipped);
      expect(await migrate(prod, { migrations: MIGRATIONS.filter((m) => m.id in frozen) })).toEqual([]);
      // the rest then run (the ones landed since b5d019e and the new files), each once, in name order
      expect(await migrate(prod, { migrations: all })).toEqual(all.map((m) => m.id).filter((id) => !(id in frozen)));
      expect(await migrate(prod, { migrations: all })).toEqual([]);

      // a fresh one runs every file in name order, the new-style ids after 0034-schemas
      const fresh = at(names[1]);
      const ran = await migrate(fresh, { migrations: all });
      expect(ran).toEqual(all.map((m) => m.id));
      expect(ran).toEqual([...ran].sort());
      expect(ran.indexOf("209901010000-e9afc2d5-files")).toBeGreaterThan(ran.indexOf("0034-schemas"));
      expect(ran.slice(-2)).toEqual(Object.keys(extra).map((f) => f.slice(0, -4)));
      const { rows } = await fresh.query<{ n: number }>("SELECT n FROM play.mig_probe ORDER BY n");
      expect(rows.map((r) => r.n)).toEqual([1, 2]);
      expect(await migrate(fresh, { migrations: all })).toEqual([]);
    } finally {
      for (const c of conns) await c.close();
      for (const n of names) await admin.unsafe(`DROP DATABASE IF EXISTS ${n} WITH (FORCE)`);
      await admin.close();
    }
  }, 120_000);
});

// Migration 202611070120-7c8085db-breeds and the import after it (play/SPEC.md "Breeds"; intent 7c8085db, its check c3): a database made
// just before it holding assets of variants (a plant's kinds, each its own recipe in every frozen version), one with its
// document made already (its variants in Main) and one without, and a sandbox pinning a variant by its name. Migrated
// and imported: every asset's variants are breeds of its document with the same sources and cards (each breed built
// gives its variant's recipe hash of the newest version, byte for byte), Main holds none, and every frozen version, its
// variants' rows and the pin are as they were.
const BREEDS = "202611070120-7c8085db-breeds";
suite("migration 202611070120-7c8085db-breeds", () => {
  let admin: Bun.SQL, sql: Bun.SQL, name: string;
  beforeAll(async () => {
    name = `play_migrate34_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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

  test("every asset's variants become breeds with the same sources and cards; frozen versions and pins unchanged", async () => {
    const db = fromBunSql(sql);
    // the database as it stands before breeds: every migration before it, the schemas as documents
    const before_ = MIGRATIONS[MIGRATIONS.findIndex((m) => m.id === BREEDS) - 1].id;
    expect((await migrate(db, { until: before_ })).at(-1)).toBe(before_);
    await (await import("../src/docs/schemas")).ensureSchemas(db);
    const q = async (text: string, args: unknown[] = []) => (await db.query<any>(text, args)).rows;
    const store = folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));
    const keep = async (t: string) => {
      await store.put(hashText(t), new TextEncoder().encode(t), "text/javascript");
      await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT DO NOTHING`, [hashText(t), t.length, `blobs/${hashText(t).slice(0, 2)}/${hashText(t)}`]);
      return hashText(t);
    };
    const src = (line: string) => `module.exports.recipe = function (id, v, variant) {\n  // ${line}\n  return { meta: { id, v, variant } };\n};\n`;
    /** a frozen version of variants: each variant its source (or the version's first) built as its own recipe */
    const version = async (asset: string, slug: string, n: number, parents: string[], kinds: Record<string, string>) => {
      const id = hashText(`${slug}|v${n}`);
      await db.query(`INSERT INTO play.asset_versions (id, asset_id, parents, number, default_variant, card, engine, note) VALUES ($1, $2, $3, $4, 'female', ($5::text)::jsonb, 5, $6)`, [
        id, asset, parents, n, JSON.stringify({ card: { label: `${slug}: Female` }, variant: "female" }), `v${n}`,
      ]);
      for (const [kind, line] of Object.entries(kinds)) {
        const s = src(line);
        const recipe = await keep(RECIPE_HEAD + s + recipeTail(slug, n, kind));
        await db.query(`INSERT INTO play.asset_variants (version_id, name, recipe_hash, source_hash, card) VALUES ($1, $2, $3, $4, ($5::text)::jsonb)`, [
          id, kind, recipe, await keep(s), JSON.stringify({ card: { label: `${slug}: ${kind[0].toUpperCase()}${kind.slice(1)}` }, variant: kind, recipe, version: n }),
        ]);
      }
      return id;
    };
    // a papaya of two kinds over two versions, no document yet
    const papaya = crypto.randomUUID();
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', 'papaya', 'Papaya')`, [papaya, COOP]);
    const p1 = await version(papaya, "papaya", 1, [], { female: "a female papaya", male: "a male papaya" });
    const p2 = await version(papaya, "papaya", 2, [p1], { female: "a female papaya, taller", male: "a male papaya, taller" });
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [papaya, p2]);
    // a kiwi of two kinds sharing one source, its document made already (its variants in Main, as before)
    const kiwi = crypto.randomUUID();
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', 'kiwi', 'Kiwi')`, [kiwi, COOP]);
    const k1 = await version(kiwi, "kiwi", 1, [], { female: "a kiwi vine", male: "a kiwi vine" });
    await db.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [kiwi, k1]);
    const kv = await q(`SELECT name, card FROM play.asset_variants WHERE version_id = $1 ORDER BY name`, [k1]);
    const kjson = { schema: "asset/1", label: "Kiwi", source: src("a kiwi vine"), engine: 5, card: { card: { label: "kiwi: Female" }, variant: "female" }, defaultVariant: "female", variants: kv.map((x: any) => ({ name: x.name, card: x.card })) };
    // (written by the store before breeds, its variants in Main)
    const { createDoc } = await import("../src/docs");
    const { SCHEMA } = await import("../src/kit/ids");
    await createDoc(db, { id: `asset:${kiwi}`, schema: SCHEMA.asset, json: kjson, author: { human: null, via: "import" }, message: "v1", version: "v1", number: 1 });
    // a sandbox pinning a papaya by its variant's name
    await db.query(`INSERT INTO play.sandbox_pins (sandbox_id, slot, version_id, variant) SELECT id, 'papaya-tree', $1, 'male' FROM play.sandboxes ORDER BY id LIMIT 1`, [p2]);
    const frozen = async () => [
      await q(`SELECT id, asset_id, number, recipe_hash, source_hash, default_variant, card FROM play.asset_versions ORDER BY id`),
      await q(`SELECT version_id, name, recipe_hash, source_hash, card FROM play.asset_variants ORDER BY version_id, name`),
      await q(`SELECT sandbox_id, slot, version_id, variant FROM play.sandbox_pins ORDER BY sandbox_id, slot`),
    ];
    const before = await frozen();

    // ---- the breeds migration, then every one after it (the migrations that land after breeds run too: 4ea6b2ed's
    // avenBOX token column first), and the import's breeds
    const rest = MIGRATIONS.map((m) => m.id).slice(MIGRATIONS.findIndex((m) => m.id === BREEDS));
    expect(rest[0]).toBe(BREEDS);
    expect(await migrate(db)).toEqual(rest);
    const { ensureAssetDocs } = await import("../src/assetdocs");
    const docs = await import("../src/docs");
    const report = await ensureAssetDocs(db, store, mkdtempSync(join(tmpdir(), "play-history-")));
    expect(report.errors).toEqual([]);
    expect(report.breeds).toBe(4);
    for (const [asset, slug, head] of [[papaya, "papaya", p2], [kiwi, "kiwi", k1]] as const) {
      const doc = `asset:${asset}`;
      const main = (await docs.readDoc(db, doc)).json;
      expect(main.variants).toBeUndefined();
      expect(main.defaultVariant).toBe("female");
      const breeds = await docs.breedsOf(db, doc);
      expect(breeds.map((b) => b.name)).toEqual(["female", "male"]);
      const n = (await q(`SELECT number FROM play.asset_versions WHERE id = $1`, [head]))[0].number;
      for (const b of breeds) {
        const x = (await q(`SELECT recipe_hash, source_hash, card FROM play.asset_variants WHERE version_id = $1 AND name = $2`, [head, b.name]))[0];
        // the same source and card, and so the same recipe, byte for byte
        expect(hashText(b.json.source)).toBe(x.source_hash);
        expect(hashText(RECIPE_HEAD + b.json.source + recipeTail(slug, n, b.name))).toBe(x.recipe_hash);
        expect(b.json.card).toEqual(x.card);
      }
    }
    // a second import changes nothing
    expect((await ensureAssetDocs(db, store, mkdtempSync(join(tmpdir(), "play-history-")))).breeds).toBe(0);
    // every frozen version, its variants' rows and the pin as they were
    expect(await frozen()).toEqual(before);
  }, 60_000);
});

// Migration 202611070945-1d9995c3-skills-records (intent 1d9995c3): a skill's row is play.records' (kind 'skill'), as
// a schema's and a piece's are, so a new skill is made over MCP as any schema-alone document. Every play.skills row
// moves with its id, label and times; the table goes; avenMAIA and the Intents skill keep their documents, versions
// and history, and are served as before.
const SKILLS_RECORDS = "202611070945-1d9995c3-skills-records";
suite(`migration ${SKILLS_RECORDS}`, () => {
  let admin: Bun.SQL, sql: Bun.SQL, name: string;
  beforeAll(async () => {
    name = `play_migrate_skills_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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

  test("skills become records: every row moves with its id, label and times, play.skills goes, avenMAIA and Intents served as before", async () => {
    const db = fromBunSql(sql);
    const q = async (text: string, args: unknown[] = []) => (await db.query<any>(text, args)).rows;
    // the database as it stands before: every migration before it, the schemas as documents, the two skills as the
    // import wrote them then (each its play.skills row and its document's v1)
    const before_ = MIGRATIONS[MIGRATIONS.findIndex((m) => m.id === SKILLS_RECORDS) - 1].id;
    expect((await migrate(db, { until: before_ })).at(-1)).toBe(before_);
    await (await import("../src/docs/schemas")).ensureSchemas(db);
    const docs = await import("../src/docs");
    const { SKILL } = await import("../src/kit/ids");
    const { avenmaia, intents } = await import("../import/skills");
    const seeded = [
      { id: SKILL.avenmaia, json: avenmaia(), at: "2026-11-06T12:00:00Z" },
      { id: SKILL.intents, json: intents(), at: "2026-11-06T12:00:01Z" },
    ];
    for (const s of seeded) {
      await db.query(`INSERT INTO play.skills (id, coop_id, label, grp, created, updated) VALUES ($1, $2, $3, $4, $5, $5)`, [s.id, COOP, s.json.label, s.json.group, s.at]);
      await docs.createDoc(db, { id: `skill:${s.id}`, schema: SCHEMA.skill, json: s.json, author: { human: null, via: "import" }, message: "v1", version: "v1", number: 1 });
    }
    const rowsBefore = await q(`SELECT id::text, label, created, updated FROM play.skills ORDER BY id`);
    const docsBefore = await Promise.all(seeded.map(async (s) => [await docs.readDoc(db, `skill:${s.id}`), await docs.versionsOf(db, `skill:${s.id}`), await docs.history(db, `skill:${s.id}`)]));

    // ---- the migration, and every one after it
    const rest = MIGRATIONS.map((m) => m.id).slice(MIGRATIONS.findIndex((m) => m.id === SKILLS_RECORDS));
    expect(rest[0]).toBe(SKILLS_RECORDS);
    expect(await migrate(db)).toEqual(rest);
    expect((await q(`SELECT to_regclass('play.skills') AS t`))[0].t).toBeNull();
    expect(await q(`SELECT id::text, label, created, updated FROM play.records WHERE kind = 'skill' ORDER BY id`)).toEqual(rowsBefore);
    // their documents, versions and history as they were
    for (const [i, s] of seeded.entries())
      expect([await docs.readDoc(db, `skill:${s.id}`), await docs.versionsOf(db, `skill:${s.id}`), await docs.history(db, `skill:${s.id}`)]).toEqual(docsBefore[i]);
    // served as before: initialize's instructions, an intent's brief, listed by the doc tools as skills
    const skills = await import("../src/skills");
    expect(await skills.instructionsOf(db)).toBe(`${avenmaia().system.trim()}\n\n${intents().system.trim()}`);
    expect(await skills.briefOf(db, { id: "00000000-0000-4000-8000-000000000000", title: "A test", stage: "build" })).toContain("A test");
    const { listDocs } = await import("../src/versioned");
    const listed = await listDocs(db, { id: "x", name: "x", level: "admin", rule: {}, founder_number: null } as any, "skill");
    expect(listed.map((d: any) => [d.id, d.label, d.group])).toEqual(expect.arrayContaining([[SKILL.avenmaia, "avenMAIA", "agents"], [SKILL.intents, "Intents", "intents"]]));
    expect(await migrate(db)).toEqual([]);
  }, 60_000);
});
