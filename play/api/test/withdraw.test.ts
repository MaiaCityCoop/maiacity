// A document withdrawn from an intent's work before it is decided (intent ee0a7455; ../src/withdraw.ts), against a real
// Postgres (TEST_DATABASE_URL, as for ./api.test.ts): two stories on one intent at Proposal, one withdrawn over MCP
// (withdraw_doc) or by an admin on the board's route, both through ../src/held.ts dropDoc; the intent back in Build with
// its results kept, the reason in its history; Accept then keeps only the other. Refused for a decided intent, a
// document not in its work, no reason, and an agent whose admin is an admin no more.
import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Db } from "../src/kit/pg";
import { fakeGitHub } from "./fixtures/github";
import { agentToken, appOn, freshDb, human, quiet, request, suite, tool as mcpTool, type Api, type Fresh } from "./kit";
import * as fx from "./fixtures/intents";

suite("withdraw a document from an intent's work", () => {
  let f: Fresh, db: Db, api: Api, restore: () => void;
  let gh: ReturnType<typeof fakeGitHub>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";

  beforeAll(async () => {
    restore = quiet();
    f = await freshDb();
    db = f.db;
    gh = fakeGitHub();
    api = appOn(db, { github: gh.gh });
    who.ada = await human(db, "ada");
    // the GitHub runs' token: a code intent's checks are recorded with it alone
    token = (await agentToken(api, who.ada.cookie, { avenbox: true })).token;
  });

  afterAll(async () => {
    restore?.();
    await f?.drop();
  });

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: who.ada.cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>) => mcpTool(api, token, name, args);
  const SPEC = {
    goal: "Two people and their film change together.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "Two assets, a story and a skill.",
    checks: [{ check: "It looks right", how: "look", by: "the board beside the sheet" }],
  };
  /** an intent at Proposal, its one must passed, ready to take work */
  const ready = (title: string) => fx.readyIntent({ tool, approve: (id) => call("POST", `/api/intents/${id}/approve`) }, title, { spec: SPEC, add: { kind: "improve" }, evidence: "seen", strict: true });
  const story = (title: string, intent: string) =>
    tool("propose_story", { title, note: "its first cut", intent, body: { format: "9:16", fps: 30, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 4, who: "MAIA", line: "One." }] }] } });
  const variants = async (intent: string) =>
    (await db.query<{ doc_id: string; variant_id: string; status: string }>(
      `SELECT iv.doc_id, iv.variant_id, v.status FROM play.intent_variants iv JOIN play.doc_variants v ON v.id = iv.variant_id WHERE iv.intent_id = $1 ORDER BY iv.position`,
      [intent],
    )).rows;

  const statusOf = async (variant: string | number) => (await db.query<{ status: string }>(`SELECT status FROM play.doc_variants WHERE id = $1`, [variant])).rows[0]?.status;
  const row = async (id: string) => (await db.query<any>(`SELECT stage, results, steps FROM play.intents WHERE id = $1`, [id])).rows[0];

  test("withdraw over MCP: two stories at Proposal, one withdrawn through dropDoc; back in Build, results kept, reason kept; Accept keeps only the other", async () => {
    const id = await ready("Two cuts of one film");
    const stray = await story("The stray first cut", id);
    const film = await story("The film it means", id);
    expect([stray.error, film.error]).toEqual([undefined, undefined]);
    const held = await variants(id);
    expect(held.map((h) => h.doc_id)).toEqual([`story:${stray.story}`, `story:${film.story}`]);
    const before = await row(id);
    expect(before.stage).toBe("proposal");

    const r = await tool("withdraw_doc", { intent: id, doc: stray.story, reason: "an old render, proposed by mistake" });
    expect(r.error).toBeUndefined();
    expect(r.stage).toBe("build");
    // the stray's variant closed, kept in the history; the film's as it was
    expect(await statusOf(held[0].variant_id)).toBe("archived");
    const now = await variants(id);
    expect(now.map((h) => h.doc_id)).toEqual([`story:${film.story}`]);
    expect(now[0].variant_id).toBe(held[1].variant_id);
    // its results kept, the reason in its history
    const after = await row(id);
    expect(after.results).toEqual(before.results);
    expect(after.steps.at(-1)).toMatchObject({ from: "proposal", to: "build", via: "mcp", doc: `story:${stray.story}`, reason: "an old render, proposed by mistake", by: "ada" });
    const got = await tool("get_intent", { intent: id });
    expect(got.work).toMatchObject({ docs: 1 });
    expect(got.review.docs.map((d: any) => d.doc.id)).toEqual([film.story]);
    // the stray is in the doc's history still
    expect((await tool("doc_history", { doc: stray.story })).error).toBeUndefined();

    // a document not in its work is refused, saying what it holds
    const not = await tool("withdraw_doc", { intent: id, doc: stray.story, reason: "again" });
    expect(not.error).toContain("has no open or proposed variant");
    expect(not.error).toContain(`story:${film.story}`);
    // no reason, refused
    expect((await tool("withdraw_doc", { intent: id, doc: film.story, reason: "  " })).error).toContain("needs its reason");

    // its checks recorded again: to Proposal, and Accept keeps only the film
    expect((await tool("check_intent", { intent: id, results: [{ check: "c1", pass: true, evidence: "seen again" }] })).stage).toBe("proposal");
    const acc = await call("POST", `/api/intents/${id}/accept`);
    expect(acc.data.stage).toBe("accepted");
    expect((await call("GET", `/api/stories/${film.story}`)).status).toBe(200);
    expect(await statusOf(held[0].variant_id)).toBe("archived");
    expect(await statusOf(held[1].variant_id)).toBe("accepted");

    // a decided intent is refused
    const done = await tool("withdraw_doc", { intent: id, doc: film.story, reason: "too late" });
    expect(done.error).toContain("accepted stage");
  });

  test("withdraw on the board's route: an admin takes one out (by kind:uuid) in Build, it stays in Build; anyone else is refused", async () => {
    // in Build, its must not passed yet: the stories wait on it there
    const i = await tool("add_intent", { title: "Two cuts, withdrawn on the board", kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    const id = i.id as string;
    const a = await story("Board: stray", id);
    const b2 = await story("Board: kept", id);
    expect([a.error, b2.error]).toEqual([undefined, undefined]);
    expect((await variants(id)).length).toBe(2);
    expect((await row(id)).stage).toBe("build");

    // a citizen on the board's route: refused
    const cit = await human(db, `cit${Date.now()}`, "citizen");
    expect((await request(api, { cookie: cit.cookie }, "POST", `/api/intents/${id}/withdraw`, { doc: a.story, reason: "not mine" })).status).toBe(403);

    // an admin on the board
    const r = await call("POST", `/api/intents/${id}/withdraw`, { doc: `story:${a.story}`, reason: "proposed by mistake" });
    expect(r.status).toBe(200);
    expect(r.data.stage).toBe("build");
    expect((await variants(id)).map((h) => h.doc_id)).toEqual([`story:${b2.story}`]);
    expect((await row(id)).steps.at(-1)).toMatchObject({ from: "build", to: "build", via: "site", doc: `story:${a.story}` });
    expect((await call("POST", `/api/intents/${id}/withdraw`, { doc: crypto.randomUUID(), reason: "none such" })).status).toBe(409);
  });

  test("withdraw its last document: the intent names no work of play's any more, its own columns all empty", async () => {
    const id = await ready("One cut, withdrawn");
    const a = await story("Last: the one cut", id);
    expect(a.error).toBeUndefined();
    const cols = `SELECT work, asset_id, base, version, story_id, story_base, story_version FROM play.intents WHERE id = $1`;
    expect((await db.query<any>(cols, [id])).rows[0]).toMatchObject({ work: expect.any(String), story_id: a.story });
    expect((await tool("withdraw_doc", { intent: id, doc: a.story, reason: "proposed by mistake" })).stage).toBe("build");
    expect(await variants(id)).toEqual([]);
    expect((await db.query<any>(cols, [id])).rows[0]).toEqual({ work: null, asset_id: null, base: null, version: null, story_id: null, story_base: null, story_version: null });
    expect((await call("GET", `/api/intents/${id}`)).data.work ?? null).toBeNull();
  });

  test("withdraw a stale draft: an asset's open variant seeded below its head closed, kept; the next doc_edit seeds from Main and proposes", async () => {
    const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";
    const first = await ready("A fern, its first version");
    const fern = await tool("propose_asset", { lod: { levels: "derived" }, group: "plants", label: "A draft fern", source: SOURCE, note: "v1", intent: first });
    expect(fern.error).toBeUndefined();
    expect((await call("POST", `/api/intents/${first}/accept`)).data.stage).toBe("accepted");
    // in Build, its must not passed: a draft made on v1
    const i = await tool("add_intent", { title: "The fern moves group", kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    const drafts = async () =>
      (await db.query<{ id: string; status: string; seed: string }>(`SELECT id, status, seed::text AS seed FROM play.doc_variants WHERE intent_id = $1 AND doc_id = $2 ORDER BY id`, [i.id, `asset:${fern.asset}`])).rows;
    expect((await tool("doc_edit", { doc: fern.asset, intent: i.id, message: "a draft on v1", edits: [{ op: "set", path: ["source"], value: SOURCE + "// on v1\n" }] })).error).toBeUndefined();
    const [stale] = await drafts();
    expect(stale.status).toBe("open");
    // Main moves on: v2, by another intent
    const other = await ready("The fern, its second version");
    expect((await tool("propose_doc_version", { doc: fern.asset, note: "v2", edits: [{ op: "set", path: ["source"], value: SOURCE + "// v2\n" }], intent: other })).error).toBeUndefined();
    expect((await call("POST", `/api/intents/${other}/accept`)).data.stage).toBe("accepted");
    // the draft withdrawn: closed, kept in the history; the intent still in Build
    const r = await tool("withdraw_doc", { intent: i.id, doc: fern.asset, reason: "its draft was seeded on v1, Main is v2" });
    expect(r.error).toBeUndefined();
    expect(r.stage).toBe("build");
    expect(await statusOf(stale.id)).toBe("archived");
    expect((await row(i.id)).steps.at(-1)).toMatchObject({ from: "build", to: "build", doc: `asset:${fern.asset}` });
    expect((await tool("doc_history", { doc: fern.asset })).variants.some((v: any) => `${v.id}` === stale.id)).toBe(true);
    // the next doc_edit seeds a new variant from Main (v2), and proposes
    expect((await tool("doc_edit", { doc: fern.asset, intent: i.id, message: "again, on v2", edits: [{ op: "set", path: ["label"], value: "A moved fern" }] })).error).toBeUndefined();
    const now = await drafts();
    expect(now.length).toBe(2);
    expect(now[1].status).toBe("open");
    expect(now[1].seed).not.toBe(stale.seed);
    expect((await tool("doc_at", { doc: fern.asset, intent: i.id })).json.source).toContain("// v2");
    const p = await tool("propose_doc_version", { doc: fern.asset, variant: Number(now[1].id), note: "the fern moved, on v2", intent: i.id });
    expect(p.error).toBeUndefined();
    // nothing left to withdraw twice
    await tool("withdraw_doc", { intent: i.id, doc: fern.asset, reason: "the proposal too" });
    expect((await tool("withdraw_doc", { intent: i.id, doc: fern.asset, reason: "again" })).error).toContain("has no open or proposed variant");
  });

  test("withdraw from another admin's agent whose owner is an admin no more: refused, nothing taken out", async () => {
    const id = await ready("Two cuts, a stale token");
    const a = await story("Stale: one", id);
    await story("Stale: two", id);
    const bob = await human(db, `bob${Date.now()}`);
    const bobs = (await agentToken(api, bob.cookie, { name: "bob's agent" })).token;
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [bob.id]);
    expect((await mcpTool(api, bobs, "withdraw_doc", { intent: id, doc: a.story, reason: "not his" })).error).toBeTruthy();
    expect((await variants(id)).length).toBe(2);
    expect((await row(id)).stage).toBe("proposal");
  });
});
