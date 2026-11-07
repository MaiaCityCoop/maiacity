// Migration 0033-build (intent 60f4f75c-666a-4eca-9bb2-4a29311afa6c, Samuel 2026-11-06): the intents' third stage,
// Prototype, is Build. A database as production has it (migrated below 0033-build, intents at 'prototype' in each kind
// of state, the Intents skill's v1 still speaking to `stages.prototype`) is migrated and read back: every intent that
// was at Prototype is at Build with nothing else changed, the stage 'prototype' is refused, and the skill's text moves
// to `stages.build` by proposal (doc_edit, propose_doc_version, accepted), after which an intent at Build has it
// as its brief. Checks c2 and c4.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { MIGRATIONS, migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { Rate } from "../src/limits";
import { SKILL_STAGES } from "../src/skills";
import { SKILL } from "../src/ids";
import { seedDoc } from "../src/versioned";
import { avenmaia, intents } from "../import/skills";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

/** the Intents skill as production holds it, its v1: the Build part under the stage's old name */
const productionV1 = () => {
  const s = intents();
  const { build, ...rest } = s.stages;
  return { ...s, stages: { ...rest, prototype: build.replace(/agents build in/g, "agents prototype in").replace(/At Build/g, "At Prototype") } };
};

suite("the stage Build (migration 0033-build)", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";
  const q = async (text: string, args: unknown[] = []) => (await db.query<any>(text, args)).rows;

  beforeAll(async () => {
    name = `play_build_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    // production's database: every migration but 0033-build (those after it too, so today's store writes its documents
    // and the token column 4ea6b2ed-avenbox-token adds is there to read)
    await db.exec(`CREATE SCHEMA IF NOT EXISTS play; CREATE TABLE IF NOT EXISTS play.migrations (id TEXT PRIMARY KEY, ran TIMESTAMPTZ NOT NULL DEFAULT now());`);
    for (const m of MIGRATIONS.filter((m) => m.id !== "0033-build"))
      await db.transaction(async (tx) => (await tx.query(m.sql), await tx.query(`INSERT INTO play.migrations (id) VALUES ($1)`, [m.id])));
    await initSessions(db);
    api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    for (const n of ["ada"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
    // the skills as production holds them: the Intents skill's v1 written when a stage was named prototype (the skill
    // schema's v1 still takes that part, migrations/schemas/skill.json)
    await seedDoc(db, "skill", { id: SKILL.avenmaia, json: avenmaia(), note: "First version" });
    await seedDoc(db, "skill", { id: SKILL.intents, json: productionV1(), note: "First version" });
  });

  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  const call = async (as: string | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    if (as) headers.cookie = who[as].cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  let n = 0;
  const rpc = async (method: string, params?: unknown) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }),
      }),
    );
    const out = await r.json();
    return out.error ? { error: out.error } : out.result;
  };
  const tool = async (name: string, args: Record<string, unknown>) => {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };

  const SPEC = {
    goal: "A fern grows taller.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "The fern. Nothing else changes.",
    checks: [
      { check: "it is taller", how: "test", by: "a test", run: "true" },
      { check: "it is greener", how: "test", by: "a test", run: "true" },
    ],
  };
  /** an intent specified over MCP, then put in Prototype as production's code did (its approval and what is given) */
  async function inPrototype(title: string, set: { results?: object; pull_request?: number } = {}) {
    const i = await tool("add_intent", { title, kind: "improve", note: `${title}, in Prototype` });
    expect((await tool("specify_intent", { intent: i.id, ...SPEC })).stage).toBe("specify");
    await db.query(
      `UPDATE play.intents SET stage = 'prototype', approved_by = $2, approved_at = now(), results = ($3::text)::jsonb, pull_request = $4 WHERE id = $1`,
      [i.id, who.ada.id, set.results ? JSON.stringify(set.results) : null, set.pull_request ?? null],
    );
    return i.id as string;
  }

  test("c2: every intent at prototype is at build, nothing else of it changed; afterwards the stage prototype is refused", async () => {
    const result = (pass: boolean) => ({ pass, evidence: pass ? "exit 0" : "exit 1", by: "ada", at: "2026-11-06T12:00:00.000Z", where: "avenbox", commit: "a".repeat(40) });
    // each kind of state an intent in Prototype is in
    const approved = await inPrototype("Just approved");
    const partly = await inPrototype("Partly checked, its pull request named", { results: { c1: result(true), c2: result(false) }, pull_request: 2107 });
    // back in Prototype with its work archived, as a moved base leaves it (./work.ts settle): its work proposed for it
    // (no work without an intent, 706ed873) while it waited at Proposal, every must passed
    const worked = await inPrototype("Its work proposed, then back in Prototype", { results: { c1: result(true), c2: result(true) } });
    await db.query(`UPDATE play.intents SET stage = 'proposal' WHERE id = $1`, [worked]);
    const p = await tool("propose_doc_version", { doc: SKILL.avenmaia, intent: worked, note: "a new label", edits: [{ op: "set", path: ["label"], value: "Maia" }] });
    expect(p).toMatchObject({ stage: "proposal", intent: worked });
    await db.query(`UPDATE play.intents SET stage = 'prototype' WHERE id = $1`, [p.intent]);
    const withWork = p.intent as string;
    // and intents at other stages, untouched
    const idea = (await tool("add_intent", { title: "Still an idea" })).id;
    const specify = (await tool("add_intent", { title: "Still at Specify" })).id;
    await tool("specify_intent", { intent: specify, ...SPEC });
    const prototyped = [approved, partly, withWork];

    const before = await q(`SELECT * FROM play.intents ORDER BY id`);
    expect(before.filter((r) => r.stage === "prototype").map((r) => r.id).sort()).toEqual([...prototyped].sort());
    expect(before.find((r) => r.id === withWork)).toMatchObject({ work: "skill_version" });
    expect(await q(`SELECT doc_id FROM play.intent_variants WHERE intent_id = $1`, [withWork])).toEqual([{ doc_id: `skill:${SKILL.avenmaia}` }]);

    expect(await migrate(db, { until: "0033-build" })).toEqual(["0033-build"]);
    expect(await migrate(db, { until: "0033-build" })).toEqual([]);

    const after = await q(`SELECT * FROM play.intents ORDER BY id`);
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
    for (const was of before) {
      const now = after.find((r) => r.id === was.id);
      expect(now).toEqual({ ...was, stage: was.stage === "prototype" ? "build" : was.stage });
    }
    expect(after.filter((r) => r.stage === "build").map((r) => r.id).sort()).toEqual([...prototyped].sort());
    expect(after.find((r) => r.id === idea).stage).toBe("idea");
    expect(after.find((r) => r.id === specify).stage).toBe("specify");
    expect(after.find((r) => r.id === partly)).toMatchObject({ pull_request: 2107, results: { c1: { pass: true }, c2: { pass: false } } });

    // the stage prototype is no more
    await expect(db.query(`UPDATE play.intents SET stage = 'prototype' WHERE id = $1`, [approved])).rejects.toThrow(/intents_stage_check/);
    // and build holds its rule: only an approved spec is in it (intents_spec_before_build, 0026)
    await expect(db.query(`UPDATE play.intents SET stage = 'build' WHERE id = $1`, [idea])).rejects.toThrow(/intents_spec_before_build/);

    // read back through MCP: at build, listed under build, the old name refused
    expect(await tool("get_intent", { intent: partly })).toMatchObject({ stage: "build", pull_request: 2107 });
    expect((await tool("list_intents", { stage: "build" })).map((i: any) => i.id).sort()).toEqual([...prototyped].sort());
    expect((await tool("list_intents", { stage: "prototype" })).error).toBeTruthy();
    // the board's REST too
    expect((await call("ada", "GET", "/api/intents?stage=build")).data.map((i: any) => i.id).sort()).toEqual([...prototyped].sort());

    // and on from Build as the flow goes: every must passing, to Proposal
    const done = await tool("check_intent", { intent: approved, results: [{ check: "c1", pass: true, evidence: "exit 0" }, { check: "c2", pass: true, evidence: "exit 0" }] });
    expect(done.stage).toBe("proposal");
  });

  test("c4: the Intents skill's prototype part moves to build by proposal; then an intent at build has it as its brief", async () => {
    expect([...SKILL_STAGES]).toEqual(["idea", "specify", "build", "proposal", "ship", "accepted", "archived"]);
    expect(Object.keys(intents().stages)).toContain("build");
    expect(Object.keys(intents().stages)).not.toContain("prototype");

    const at = await approvedToBuild("A brief at Build");
    // before the move: the skill as production holds it, nothing for build
    const v1 = await tool("doc_at", { doc: SKILL.intents });
    expect(v1.json.stages.prototype).toBe(productionV1().stages.prototype);
    expect(v1.json.stages.build).toBeUndefined();
    expect((await tool("get_intent", { intent: at })).brief).toBeNull();
    let { prompts } = await rpc("prompts/list");
    expect(prompts.map((p: any) => p.name)).toEqual(["intent_idea", "intent_specify", "intent_proposal", "intent_ship"]);
    expect((await rpc("prompts/get", { name: "intent_prototype", arguments: { intent: at } })).error.message).toContain("no prompt");

    // the move, drafted with doc_edit: the text under build, worded for Build, the prototype part gone
    const text = v1.json.stages.prototype.replace(/agents prototype in/g, "agents build in").replace(/At Prototype/g, "At Build");
    const { prototype: _, ...rest } = v1.json.stages;
    // every edit is an intent's (intent 847c5d38): the move's own, in Build with its check passed
    const move = await approvedToBuild("The stage Prototype is Build in the Intents skill");
    await tool("check_intent", { intent: move, results: SPEC.checks.map((_, i) => ({ check: `c${i + 1}`, pass: true, evidence: "exit 0" })) });
    const draft = await tool("doc_edit", { doc: SKILL.intents, intent: move, message: "the Prototype part is the Build part", whole: { ...v1.json, stages: { ...rest, build: text } } });
    expect(draft).toMatchObject({ changed: true, edits: 1 });
    const proposed = await tool("propose_doc_version", { doc: SKILL.intents, intent: move, variant: draft.variant, note: "The stage Prototype is Build (intent 60f4f75c-666a-4eca-9bb2-4a29311afa6c)" });
    expect(proposed).toMatchObject({ stage: "proposal", doc: SKILL.intents, number: 2 });
    const review = (await call("ada", "GET", `/api/intents/${proposed.intent}`)).data.review;
    expect(review.changes.map((c: any) => c.path).sort()).toEqual(["$.stages.build", "$.stages.prototype"]);
    expect((await call("ada", "POST", `/api/intents/${proposed.intent}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 2 } });

    // after: build has the text, prototype none, and an intent at build gets it as its brief
    const v2 = await tool("doc_at", { doc: SKILL.intents });
    expect(v2).toMatchObject({ number: 2 });
    expect(v2.json.stages.build).toBe(text);
    expect(v2.json.stages.prototype).toBeUndefined();
    const brief = (await tool("get_intent", { intent: at })).brief;
    expect(brief).toBe(text.trim().replace(/\{intent\}/g, at).replace(/\{title\}/g, "A brief at Build"));
    expect(brief).toContain(`bun play/avenbox/intent.ts ${at} --record`);
    ({ prompts } = await rpc("prompts/list"));
    expect(prompts.map((p: any) => p.name)).toEqual(["intent_idea", "intent_specify", "intent_build", "intent_proposal", "intent_ship"]);
    const got = await rpc("prompts/get", { name: "intent_build", arguments: { intent: at } });
    expect(got.messages).toEqual([{ role: "user", content: { type: "text", text: brief } }]);
  });

  /** an intent approved after the migration: Specify → Build */
  async function approvedToBuild(title: string) {
    const i = await tool("add_intent", { title });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("ada", "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    return i.id as string;
  }
});
