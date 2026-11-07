// The skills (src/skills.ts, play/SPEC.md §4.14) against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
// What play teaches its agents kept once: avenMAIA's and the Intents skill seeded as their v1, nothing lost from the texts
// they were moved from (./fixtures/instructions-before/, as main served them before), read by admins only and by id,
// changed only by proposal, and served from Postgres: initialize's instructions, an intent's brief, MCP's prompts.
// Intent c9113886-0803-4ab9-bc3c-8e73b6667484, checks c1–c6.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { Rate } from "../src/limits";
import { SKILL_STAGES } from "../src/skills";
import { INTENT_STAGES } from "../src/intents";
import { SKILL } from "../src/ids";
import { avenmaia, intents, seedSkills } from "../import/skills";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;
const BEFORE = join(import.meta.dir, "fixtures/instructions-before");

/** a text as compared: its whitespace one space, an intent's id as a stage's text names it */
const norm = (s: string) => s.replace(/<the intent's id>/g, "{intent}").replace(/\s+/g, " ").trim();
/** a text's sentences: split after . ! ? before a capital, a backtick or a quote */
const sentences = (s: string) => norm(s).split(/(?<=[.!?])\s+(?=[A-Z`"(])/).filter(Boolean);

suite("skills: what play teaches its agents, kept once", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";

  beforeAll(async () => {
    name = `play_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    for (const n of ["ada", "cit"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
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
  /** a JSON-RPC call to play's MCP by ada's token: its result, or its error */
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
  /** a tool called over MCP: its result as JSON, or its error's text */
  const tool = async (name: string, args: Record<string, unknown>) => {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };
  const initialize = async () => (await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } })) as any;

  /** an intent made over MCP and taken to `stage`: specified, approved, its must checks passed (to Proposal by itself) */
  const SPEC = {
    goal: "A skill says more.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "The Intents skill. Nothing else changes.",
    checks: [{ check: "Its build part names avenBOX", how: "test", by: "grep", run: "true" }],
  };
  async function intentAt(title: string, stage: "idea" | "specify" | "build" | "proposal") {
    const i = await tool("add_intent", { title });
    if (stage === "idea") return i;
    await tool("specify_intent", { intent: i.id, ...SPEC });
    if (stage === "specify") return i;
    expect((await call("ada", "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    if (stage === "build") return i;
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] })).stage).toBe("proposal");
    return i;
  }

  // ---- c1: seeded once, listed, read by id

  test("c1: the import seeds avenMAIA's and the Intents skill as v1 once; listed and read by id, by admins only", async () => {
    expect(await seedSkills(db)).toEqual({ seeded: [SKILL.avenmaia, SKILL.intents], present: [], errors: [] });
    expect(await seedSkills(db)).toEqual({ seeded: [], present: [SKILL.avenmaia, SKILL.intents], errors: [] });

    const list = await tool("list_docs", { kind: "skill" });
    expect(list).toEqual([
      expect.objectContaining({ id: SKILL.avenmaia, label: "avenMAIA", group: "agents", number: 1, versions: 1, stages: [] }),
      expect.objectContaining({ id: SKILL.intents, label: "Intents", group: "intents", number: 1, versions: 1, stages: ["idea", "specify", "build", "proposal", "ship"] }),
    ]);
    const s = await tool("doc_at", { doc: SKILL.intents });
    expect(s).toMatchObject({ id: SKILL.intents, number: 1, version: 1 });
    expect(s.json).toEqual(intents());
    expect(Object.keys(s.json.stages).sort()).toEqual([...INTENT_STAGES].sort());
    expect([...SKILL_STAGES]).toEqual([...INTENT_STAGES]);
    expect((await tool("doc_at", { doc: SKILL.avenmaia })).json).toEqual(avenmaia());

    // named by its id, never by its label or group
    for (const not of ["Intents", "intents", "skills/intents", "avenMAIA"]) expect((await tool("doc_at", { doc: not })).error).toContain("UUID");
    expect((await call("ada", "GET", "/api/docs/intents")).status).toBe(404);
    expect((await call("ada", "GET", `/api/docs/${SKILL.intents}`)).data.json.label).toBe("Intents");
    expect((await call("cit", "GET", "/api/docs?kind=skill")).status).toBe(403);
    expect((await call(null, "GET", `/api/docs/${SKILL.intents}`)).status).toBe(401);
  });

  // ---- c2: nothing lost in the move

  test("c2: every sentence of what main taught before is in the seeded skills", async () => {
    const taught = norm([avenmaia().system, intents().system, ...Object.values(intents().stages)].join("\n\n"));
    // the texts as main taught them before, with the stage Prototype named Build since (migration 0033-build)
    const before = (f: string) => readFileSync(join(BEFORE, f), "utf8").replace(/Prototype/g, "Build").replace(/prototype/g, "build");
    const files = ["initialize.txt", "list_intents.txt", "brief-prototype.txt", "brief-specify.txt"];
    let counted = 0;
    for (const f of files) {
      const was = before(f);
      expect(was.length).toBeGreaterThan(500);
      for (const s of sentences(was)) {
        counted++;
        if (!taught.includes(s)) throw new Error(`${f}: this sentence is in no skill: ${s}`);
      }
    }
    expect(counted).toBeGreaterThan(25);
    // the briefs whole, as the board gave them
    expect(norm(intents().stages.build)).toContain(norm(before("brief-prototype.txt")));
    expect(norm(intents().stages.idea)).toContain(norm(before("brief-specify.txt")));
    // Ship (intent d29933ff-3636-4148-8df7-c183c6065216)
    for (const says of ["never merge it, into main or production", "Accept here merges it and ships it to production, followed live in Ship", "back at Proposal with the report if one is red"])
      expect(taught).toContain(says);
  });

  // ---- c3: changed only by proposal

  test("c3: drafted step by step, refused before its intent's checks pass, proposed, reviewed field by field, accepted as v2", async () => {
    const one = await tool("doc_edit", { doc: SKILL.intents, message: "the build part names the gate", edits: [{ op: "text", path: ["stages", "build"], index: 0, insert: "Run bash play/avenbox/gate.sh before you push. " }] });
    expect(typeof one.variant).toBe("number");
    expect(one).toMatchObject({ changed: true, edits: 1, changes: 1 });
    const bad = await tool("doc_edit", { doc: SKILL.intents, variant: one.variant, message: "a stage that is none", edits: [{ op: "set", path: ["stages", "done"], value: "x" }] });
    expect(bad.error).toBeTruthy();
    const two = await tool("doc_edit", { doc: SKILL.intents, variant: one.variant, message: "the system part says skills", edits: [{ op: "text", path: ["system"], index: intents().system.length, insert: " Skills change by proposal too." }] });
    expect(two).toMatchObject({ variant: one.variant, edits: 2, changes: 2 });
    const history = await tool("doc_history", { doc: SKILL.intents, variant: one.variant });
    expect(history.edits.map((s: any) => s.message)).toEqual(["the build part names the gate", "the system part says skills"]);

    // for an intent, only once its must checks pass
    const i = await intentAt("The Intents skill names the gate", "build");
    expect((await tool("propose_doc_version", { doc: SKILL.intents, variant: one.variant, note: "the gate", intent: i.id })).error).toBeTruthy();
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] })).stage).toBe("proposal");
    const proposed = await tool("propose_doc_version", { doc: SKILL.intents, variant: one.variant, note: "the gate, and skills by proposal", intent: i.id });
    expect(proposed).toMatchObject({ intent: i.id, stage: "proposal", doc: SKILL.intents, number: 2, edits: 2, changes: 2 });

    const listed = (await call("ada", "GET", "/api/intents?stage=proposal")).data.find((x: any) => x.id === i.id);
    expect(listed).toMatchObject({ stage: "proposal", work: { kind: "skill_version", grp: "skills", label: "Intents", number: 2, via: "mcp" } });
    const review = (await call("ada", "GET", `/api/intents/${i.id}`)).data.review;
    expect(review).toMatchObject({ doc: { id: SKILL.intents, kind: "skill", label: "Intents", group: "intents" }, seedNumber: 1, moved: false });
    expect(review.changes.map((c: any) => c.path).sort()).toEqual(["$.stages.build", "$.system"]);
    expect(review.changes.find((c: any) => c.path === "$.system")).toMatchObject({ kind: "changed", from: intents().system, to: intents().system + " Skills change by proposal too." });
    expect(review.edits).toHaveLength(2);
    // still v1 until it is accepted
    expect((await tool("doc_at", { doc: SKILL.intents })).json.stages.build).toBe(intents().stages.build);
    expect((await tool("doc_at", { doc: SKILL.intents, intent: i.id })).json.stages.build).toStartWith("Run bash play/avenbox/gate.sh");

    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 2 } });
    const now = await tool("doc_at", { doc: SKILL.intents });
    expect(now).toMatchObject({ number: 2, version: 2 });
    expect(now.json.stages.build).toStartWith("Run bash play/avenbox/gate.sh before you push. Build Maia City's intent {intent}");
    expect((await tool("doc_at", { doc: SKILL.intents, version: 1 })).json).toEqual(intents());

    // archived, the skill stays as it was
    const p = await tool("propose_doc_version", { doc: SKILL.avenmaia, note: "a new label", edits: [{ op: "set", path: ["label"], value: "Maia" }] });
    expect((await call("ada", "POST", `/api/intents/${p.intent}/reject`)).data.stage).toBe("archived");
    expect((await tool("doc_at", { doc: SKILL.avenmaia })).json).toEqual(avenmaia());
    expect((await tool("doc_history", { doc: SKILL.avenmaia })).variants.find((v: any) => v.intent?.id === p.intent).status).toBe("archived");
  });

  // ---- c4: the system prompt, from Postgres on each request

  test("c4: initialize's instructions are avenMAIA's system part, then the Intents skill's, as accepted, on each request", async () => {
    const init = await initialize();
    const skillNow = (await tool("doc_at", { doc: SKILL.intents })).json;
    expect(init.instructions).toBe(`${avenmaia().system}\n\n${skillNow.system}`);
    expect(init.instructions).toStartWith("You are avenMAIA, Maia City's agent");
    // accepted in c3 a moment ago, no restart between
    expect(init.instructions).toEndWith("Skills change by proposal too.");

    const i = await intentAt("avenMAIA says hello", "build");
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] });
    await tool("propose_doc_version", { doc: SKILL.avenmaia, note: "a greeting", intent: i.id, edits: [{ op: "text", path: ["system"], index: 0, insert: "Hello. " }] });
    expect((await initialize()).instructions).toStartWith("You are avenMAIA");
    await call("ada", "POST", `/api/intents/${i.id}/accept`);
    expect((await initialize()).instructions).toStartWith("Hello. You are avenMAIA");
  });

  // ---- c5: an intent's brief

  test("c5: get_intent and GET /api/intents/<id> carry its brief: the Intents skill's text for its stage, filled; none once it is done", async () => {
    const skillNow = (await tool("doc_at", { doc: SKILL.intents })).json;
    const at: Record<string, any> = {};
    for (const s of ["idea", "specify", "build", "proposal"] as const) at[s] = await intentAt(`A brief at ${s}`, s);
    // Ship and after, as an Accept would leave them (./ship.test.ts takes one there for real)
    for (const [stage, title] of [["ship", "A brief in Ship"], ["accepted", "A brief once accepted"], ["archived", "A brief once archived"]]) {
      at[stage] = await intentAt(title, "proposal");
      await db.query(`UPDATE play.intents SET stage = $2 WHERE id = $1`, [at[stage].id, stage]);
    }

    for (const stage of INTENT_STAGES) {
      const i = at[stage];
      const viaMcp = await tool("get_intent", { intent: i.id });
      const viaApi = (await call("ada", "GET", `/api/intents/${i.id}`)).data;
      expect(viaMcp.stage).toBe(stage);
      expect(viaApi.brief).toBe(viaMcp.brief);
      if (stage === "accepted" || stage === "archived") {
        expect(viaMcp.brief).toBeNull();
        continue;
      }
      const want = skillNow.stages[stage].trim().replaceAll("{intent}", i.id).replaceAll("{title}", viaMcp.title);
      expect(viaMcp.brief).toBe(want);
      expect(viaMcp.brief).toContain(i.id);
      expect(viaMcp.brief).not.toContain("{intent}");
      expect(viaMcp.brief).not.toContain("{title}");
    }
    expect(at.build && (await tool("get_intent", { intent: at.build.id })).brief).toContain(`bun play/avenbox/intent.ts ${at.build.id} --record`);
    expect((await tool("get_intent", { intent: at.idea.id })).brief).toContain(`Specify Maia City's intent ${at.idea.id} on play ("A brief at idea")`);
    expect((await call("cit", "GET", `/api/intents/${at.idea.id}`)).status).toBe(403);
  });

  // ---- c6: MCP's prompts

  test("c6: prompts: one for each stage the Intents skill speaks to, each the same brief get_intent gives", async () => {
    expect((await initialize()).capabilities.prompts).toEqual({});
    const { prompts } = await rpc("prompts/list");
    expect(prompts.map((p: any) => p.name)).toEqual(["intent_idea", "intent_specify", "intent_build", "intent_proposal", "intent_ship"]);
    for (const p of prompts) expect(p.arguments).toEqual([expect.objectContaining({ name: "intent", required: true })]);
    const i = await intentAt("A prompt at Build", "build");
    const got = await rpc("prompts/get", { name: "intent_build", arguments: { intent: i.id } });
    expect(got.messages).toEqual([{ role: "user", content: { type: "text", text: (await tool("get_intent", { intent: i.id })).brief } }]);
    expect((await rpc("prompts/get", { name: "intent_accepted", arguments: { intent: i.id } })).error.message).toContain("says nothing");
    expect((await rpc("prompts/get", { name: "nope", arguments: { intent: i.id } })).error.message).toContain("no prompt");
    expect((await rpc("prompts/get", { name: "intent_build", arguments: { intent: "Intents" } })).error).toBeTruthy();
    // the stage named Prototype before (0033-build) has no prompt
    expect((await rpc("prompts/get", { name: "intent_prototype", arguments: { intent: i.id } })).error.message).toContain("no prompt");
  });
});
