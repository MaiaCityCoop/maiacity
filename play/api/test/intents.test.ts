// Intents (src/intents.ts, play/SPEC.md §4.12) against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
// Everything on the board is an intent, Idea → Specify → Prototype → Proposal → Accepted or Archived: added and specified
// over MCP only, its spec (a goal, a scope, checks: test, measure or look, must or nice) approved by an admin before it
// is built, its checks' results recorded while it is prototyped, and a proposal for it taken only once every must check
// passes. Every proposal is an intent's: one made without an intent gets one of its own, and the intent follows its
// proposals as they are decided.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { migrate, MIGRATIONS } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { Rate } from "../src/limits";
import { UUID } from "../src/uuid";
import { placeholderIn } from "../src/intents";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";

suite("intents", () => {
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
    for (const n of ["ada", "bea", "cit"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = ANY($1)`, [[who.ada.id, who.bea.id]]);
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
  const rpc = async (method: string, params?: unknown) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }),
      }),
    );
    return (await r.json()).result;
  };
  /** a tool called over MCP by ada's token: its result as JSON, or its error's text */
  const tool = async (name: string, args: Record<string, unknown>) => {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };

  /** an intent added, specified with three checks (two musts, one nice) and, where asked, approved */
  const SPEC = {
    goal: "A shade fern stands in the north beds.",
    scope: "A new plant asset (group plants). Nothing else changes.",
    checks: [
      { check: "The recipe builds in the asset box", how: "test", by: "render.mjs builds it", run: "cd play/site && bun scripts/render.mjs --group plants --label 'Shade fern'" },
      { check: "Its height is 0.4–0.6 m", how: "measure", by: "the asset box's measured size, y, 0.4–0.6 m", run: "cd play/site && bun scripts/measure.mjs --axis y --min 0.4 --max 0.6" },
      { check: "Its silhouette matches the reference sheet", how: "look", by: "the reference sheet, side by side at 1 m", must: false },
    ],
  };
  const intentAt = async (title: string, stage: "idea" | "specify" | "prototype") => {
    const i = await tool("add_intent", { title, kind: "improve" });
    if (stage === "idea") return i;
    await tool("specify_intent", { intent: i.id, ...SPEC });
    if (stage === "specify") return i;
    expect((await call("ada", "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("prototype");
    return i;
  };

  test("only admins read the intents, and no one adds or edits one on the web", async () => {
    expect((await call(null, "GET", "/api/intents")).status).toBe(401);
    expect((await call("cit", "GET", "/api/intents")).status).toBe(403);
    expect((await call("ada", "GET", "/api/intents")).data).toEqual([]);
    // POST /api/intents proposes work (an asset's version): a title alone is no work, and makes no intent
    expect((await call("ada", "POST", "/api/intents", { title: "By hand" })).status).toBe(400);
    expect((await call("ada", "GET", "/api/intents")).data).toEqual([]);
    const i = await tool("add_intent", { title: "Something", note: "x" });
    expect(i).toMatchObject({ stage: "idea", kind: "idea", via: "mcp", author: "ada", spec: null, results: null, work: null });
    expect(i.id).toMatch(UUID);
    expect((await call("ada", "PATCH", `/api/intents/${i.id}`, { title: "Edited by hand" })).status).toBe(405);
    expect((await call("cit", "POST", `/api/intents/${i.id}/reject`)).status).toBe(403);
    expect((await call("ada", "POST", `/api/intents/${i.id}/reject`)).data.stage).toBe("archived");
    expect((await call("ada", "POST", `/api/intents/${i.id}/reopen`)).data.stage).toBe("idea");
    expect((await call("ada", "POST", `/api/intents/${i.id}/done`)).status).toBe(404);
  });

  test("a spec is a goal, a scope and checks, each one statement checked by a test, a measure or a look", async () => {
    const i = await tool("add_intent", { title: "To specify" });
    const bad = async (spec: object, says: string) => expect((await tool("specify_intent", { intent: i.id, ...SPEC, ...spec })).error).toContain(says);
    await bad({ goal: " " }, "goal");
    await bad({ scope: "" }, "scope");
    await bad({ checks: [] }, "1 to 12 checks");
    await bad({ checks: Array.from({ length: 13 }, () => SPEC.checks[0]) }, "1 to 12 checks");
    await bad({ checks: [{ check: "It is nice", how: "vibe", by: "x" }] }, "test (a command that passes), measure");
    await bad({ checks: [{ check: "It builds", how: "test", by: " " }] }, "the command or test that passes");
    await bad({ checks: [{ check: "Nice only", how: "look", by: "a photo", must: false }] }, "At least one of an intent's checks is a must");
    const s = await tool("specify_intent", { intent: i.id, ...SPEC, title: "A shade fern" });
    expect(s).toMatchObject({ stage: "specify", title: "A shade fern", specified_by: "ada", approved_at: null });
    expect(s.spec.checks.map((c: any) => [c.id, c.how, c.must])).toEqual([["c1", "test", true], ["c2", "measure", true], ["c3", "look", false]]);
    // specified again, its spec is replaced
    expect((await tool("specify_intent", { intent: i.id, ...SPEC, checks: SPEC.checks.slice(0, 2) })).spec.checks).toHaveLength(2);
  });

  test("a test or measure check carries its run, a command that runs as written in avenBOX: no placeholder in it", async () => {
    const i = await tool("add_intent", { title: "Runnable checks" });
    const spec = (run: string | undefined, how = "test") => tool("specify_intent", { intent: i.id, ...SPEC, checks: [{ check: "It holds", how, by: "the command passes", ...(run === undefined ? {} : { run }) }] });
    expect((await spec(undefined)).error).toContain("Check c1 (a test) needs its run");
    expect((await spec(" ", "measure")).error).toContain("Check c1 (a measure) needs its run");
    const second = await tool("specify_intent", { intent: i.id, ...SPEC, checks: [SPEC.checks[0], { check: "It is 1 m", how: "measure", by: "a ruler" }] });
    expect(second.error).toContain("Check c2 (a measure) needs its run");
    for (const run of [
      "TEST_DATABASE_URL=<a Postgres it may create databases on> bun test",
      "bun test test/<name>.test.ts",
      "cd play/api && bun test …",
      "cd play/api && bun test ...",
      "cd play/api && TEST_DATABASE_URL=postgres://x@127.0.0.1/y bun test",
    ])
      expect((await spec(run)).error).toContain("Check c1's run holds a placeholder");
    for (const run of [
      `grep -c '<div class="card">' play/site/build/index.html`,
      "bun test 2>&1 | tail -3",
      "cd play/api && bun test test/intents.test.ts",
      `grep -q "…" play/SPEC.md && sort < play/SPEC.md > /dev/null`,
      `psql "$TEST_DATABASE_URL" -tAc 'select 1'`,
    ]) {
      const ok = await spec(run);
      expect(ok.error).toBeUndefined();
      expect(ok.spec.checks[0].run).toBe(run);
    }
    // a look needs none; given one, it is kept (the command that makes what is looked at)
    const look = await tool("specify_intent", { intent: i.id, ...SPEC, checks: [SPEC.checks[0], { check: "It looks right", how: "look", by: "the sheet", must: false }] });
    expect(look.spec.checks[1].run).toBeUndefined();
    expect(placeholderIn("node shoot.mjs > out/<id>.png")).toBe("<id>");
    expect(placeholderIn("cat < in.txt > out.txt")).toBeNull();
    expect(placeholderIn("diff <(sort a) <(sort b)")).toBeNull();
  });

  test("a spec from before runs existed keeps its checks without one, and its intent still proposes", async () => {
    const i = await tool("add_intent", { title: "An old fern" });
    const old = { goal: "x", scope: "y", checks: [{ id: "c1", check: "It builds", how: "test", by: "bun run scripts/render.mjs --asset <its id>", must: true }] };
    await db.query(`UPDATE play.intents SET stage = 'prototype', spec = ($2::text)::jsonb, approved_by = $3, approved_at = now() WHERE id = $1`, [i.id, JSON.stringify(old), who.ada.id]);
    expect((await tool("get_intent", { intent: i.id })).spec.checks[0].run).toBeUndefined();
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "built" }] });
    const made = await tool("propose_asset", { group: "plants", label: "Old fern", source: SOURCE, note: "x", intent: i.id });
    expect(made.error).toBeUndefined();
    expect((await tool("get_intent", { intent: i.id })).stage).toBe("proposal");
  });

  test("the gates: approved before it is built, every must check passed before it is proposed", async () => {
    const i = await intentAt("A shade fern for the north beds", "idea");
    const fern = (intent: string, label = "Shade fern") => tool("propose_asset", { group: "plants", label, source: SOURCE, note: "made for the intent", intent });
    const before = (await call("ada", "GET", "/api/intents")).data.length;
    expect((await fern(i.id)).error).toContain("specified (specify_intent) and its spec approved");
    expect((await fern(crypto.randomUUID())).error).toContain("no such intent");
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await fern(i.id)).error).toContain("approved by an admin");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "built" }] })).error).toContain("prototyped");
    // the admin approves the spec: Specify → Prototype
    expect((await call("cit", "POST", `/api/intents/${i.id}/approve`)).status).toBe(403);
    const approved = (await call("ada", "POST", `/api/intents/${i.id}/approve`)).data;
    expect(approved).toMatchObject({ stage: "prototype", approved_by: "ada" });
    expect((await tool("specify_intent", { intent: i.id, ...SPEC })).error).toContain("its spec is approved");
    // no results yet: refused, each missing must named
    const none = (await fern(i.id)).error;
    expect(none).toContain("c1 (The recipe builds in the asset box): no result yet");
    expect(none).toContain("c2 (Its height is 0.4–0.6 m): no result yet");
    expect(none).not.toContain("c3 ("); // the nice check is not named (the bare "c3" can be in the intent's UUID)
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c9", pass: true, evidence: "x" }] })).error).toContain("not one of this intent's checks");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: " " }] })).error).toContain("evidence");
    const partly = await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "render.mjs: built in 1.2 s" }, { check: "c2", pass: false, evidence: "measured 0.72 m" }] });
    expect(partly.stage).toBe("prototype");
    expect((await fern(i.id)).error).toContain("c2 (Its height is 0.4–0.6 m): failed");
    expect((await call("ada", "GET", "/api/intents")).data.length).toBe(before);
    // every must passes (the nice one need not): the intent moves to Proposal by itself, and the proposal is taken
    const checked = await tool("check_intent", { intent: i.id, results: [{ check: "c2", pass: true, evidence: "measured 0.52 m" }] });
    expect(checked.results).toMatchObject({ c1: { pass: true, by: "ada" }, c2: { pass: true, evidence: "measured 0.52 m" } });
    expect(checked.stage).toBe("proposal");
    const made = await fern(i.id);
    expect(made.error).toBeUndefined();
    expect(made.intent).toBe(i.id);
    expect(made.stage).toBe("proposal");
    // one record: the intent holds its work, and no other intent was made for it
    const at = await tool("get_intent", { intent: i.id });
    expect(at).toMatchObject({ stage: "proposal", work: { kind: "asset_version", status: "proposal", label: "Shade fern", asset_id: made.asset, version: made.version } });
    expect(at.review.builds).toHaveLength(1);
    expect((await call("ada", "GET", "/api/intents")).data.length).toBe(before);
    // a citizen sees no intent
    expect((await call("cit", "GET", `/api/intents/${i.id}`)).status).toBe(403);
    // accepted, its work is applied: the asset's head is the version
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 1 } });
    expect((await call("ada", "GET", `/api/assets/${made.asset}`)).data.head).toBe(made.version);
    expect((await fern(i.id)).error).toContain("accepted: it takes no more work");
  });

  test("archived at Proposal, an intent ends archived; its work replaced, the earlier work's branch is closed; brought back, to Specify", async () => {
    const i = await intentAt("A taller fern", "prototype");
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "built" }, { check: "c2", pass: true, evidence: "0.5 m" }] });
    const made = await tool("propose_asset", { group: "plants", label: "Taller fern", source: SOURCE, note: "x", intent: i.id });
    expect((await tool("get_intent", { intent: i.id })).stage).toBe("proposal");
    // proposed again for the same intent: the new work replaces it, the earlier one's branch closed, kept in the history
    const again = await tool("propose_version", { asset: made.asset, source: SOURCE + "// taller\n", note: "taller still", intent: i.id });
    expect(again).toMatchObject({ intent: i.id, stage: "proposal" });
    const held = await tool("get_intent", { intent: i.id });
    expect(held.work).toMatchObject({ version: again.version, note: "taller still" });
    expect((await db.query<any>(`SELECT status, intent_id FROM play.doc_branches WHERE id = $1`, [made.branch])).rows[0]).toEqual({ status: "archived", intent_id: i.id });
    expect((await call("ada", "GET", "/api/intents")).data.filter((x: any) => x.title === i.title)).toHaveLength(1);
    // archived at Proposal: the intent is archived, its work's branch closed
    expect((await call("ada", "POST", `/api/intents/${i.id}/archive`)).data).toMatchObject({ stage: "archived", decision: { status: "archived" } });
    expect((await db.query<any>(`SELECT status FROM play.doc_branches WHERE id = $1`, [again.branch])).rows[0].status).toBe("archived");
    expect((await tool("propose_asset", { group: "plants", label: "Taller fern", source: SOURCE, note: "again", intent: i.id })).error).toContain("archived: it takes no more work");
    // brought back, to Specify with its spec; approved, prototyped and proposed anew
    expect((await call("ada", "POST", `/api/intents/${i.id}/reopen`)).data.stage).toBe("specify");
    expect((await call("ada", "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("prototype");
    expect((await tool("propose_asset", { group: "plants", label: "Taller fern", source: SOURCE, note: "again", intent: i.id })).error).toContain("no result yet");
    // sent back to Specify, its approval and results go; rejected, it is archived
    expect((await call("ada", "POST", `/api/intents/${i.id}/respecify`)).data).toMatchObject({ stage: "specify", approved_at: null });
    expect((await call("ada", "POST", `/api/intents/${i.id}/reject`)).data.stage).toBe("archived");
  });

  test("the final gate: an intent whose work goes through main moves to Proposal, and is accepted there on main's results", async () => {
    const i = await intentAt("Sources on play", "prototype");
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.error).toContain("moves to Proposal by itself");
    const sha = "0123456789abcdef0123456789abcdef01234567";
    // where a result ran: avenBOX by default, or main; a commit is a whole git hash
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "x", where: "laptop" }] })).error).toContain("where is avenBOX or main");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "x", commit: "abc123" }] })).error).toContain("40-character git hash");
    // every must passes in avenBOX: to Proposal by itself, while its pull request is reviewed and merged
    const boxed = await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "intent.ts: exit 0" }, { check: "c2", pass: true, evidence: "0.5", commit: sha }] });
    expect(boxed.stage).toBe("proposal");
    expect(boxed.results).toMatchObject({ c1: { pass: true, where: "avenBOX" }, c2: { pass: true, where: "avenBOX", commit: sha } });
    // passed in avenBOX alone: not yet accepted; each check named
    const refused = (await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.error;
    expect(refused).toContain("c1 (The recipe builds in the asset box): passed in avenBOX, not yet run on main");
    expect(refused).toContain("c2 (Its height is 0.4–0.6 m): passed in avenBOX, not yet run on main");
    // main runs them after the merge, recorded at Proposal: one fails there, and it goes back to Prototype
    const failed = await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "main", where: "main", commit: sha }, { check: "c2", pass: false, evidence: "0.7", where: "main", commit: sha }] });
    expect(failed.stage).toBe("prototype");
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.error).toContain("moves to Proposal by itself");
    // fixed and run on main again: to Proposal, and accepted on main's results
    const fixed = await tool("check_intent", { intent: i.id, results: [{ check: "c2", pass: true, evidence: "0.5 on main", where: "main", commit: sha }] });
    expect(fixed.stage).toBe("proposal");
    expect((await call("ada", "GET", `/api/intents/${i.id}`)).data.results.c2).toMatchObject({ where: "main", commit: sha, pass: true });
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data).toMatchObject({ stage: "accepted", decided_by: "ada" });
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).status).toBe(409);
  });

  test("an intent moves to Proposal by itself once every must check passes, and is accepted there, never from Prototype", async () => {
    const i = await intentAt("Artifacts on play", "prototype");
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.error).toContain("moves to Proposal by itself");
    const half = await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "PR #1 merged, tests green", where: "main" }, { check: "c2", pass: false, evidence: "0.7", where: "main" }] });
    expect(half.stage).toBe("prototype");
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).status).toBe(409);
    // the last must passes: Proposal, by itself (the nice check has no result and need not)
    const ready = await tool("check_intent", { intent: i.id, results: [{ check: "c2", pass: true, evidence: "0.5", where: "main" }] });
    expect(ready).toMatchObject({ stage: "proposal", work: null });
    // at Proposal, the one gate: an admin accepts it (a citizen may not)
    expect((await call("cit", "POST", `/api/intents/${i.id}/accept`)).status).toBe(403);
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data).toMatchObject({ stage: "accepted", decided_by: "ada" });
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).status).toBe(409);
  });

  test("a must check without a run (a look, a spec from before) is accepted on its result wherever it ran", async () => {
    const i = await tool("add_intent", { title: "A look only" });
    await tool("specify_intent", { intent: i.id, ...SPEC, checks: [{ check: "It looks like the sheet", how: "look", by: "the sheet at 1 m" }] });
    await call("ada", "POST", `/api/intents/${i.id}/approve`);
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "side by side: the same" }] });
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.stage).toBe("accepted");
  });

  test("the MCP teaches it: every check runs in avenBOX, intent.ts records them, main records them again", async () => {
    const tools = (await rpc("tools/list")).tools as { name: string; description: string; inputSchema: any }[];
    const of = (name: string) => tools.find((t) => t.name === name)!;
    const specify = of("specify_intent");
    for (const says of ["avenBOX", "run", "play/avenbox/intent.ts", "placeholder"]) expect(specify.description).toContain(says);
    expect(specify.inputSchema.properties.checks.items.properties.run.description).toContain("avenBOX");
    const check = of("check_intent");
    expect(check.inputSchema.properties.results.items.properties.where.enum).toEqual(["avenBOX", "main"]);
    for (const says of ["play/avenbox/intent.ts", "Intent: ", "main"]) expect(check.description).toContain(says);
    for (const says of ["avenBOX", "play/avenbox/intent.ts", "Intent: ", ".github/workflows/intents.yml", "main's results"]) expect(of("list_intents").description).toContain(says);
    const { instructions } = await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    for (const says of ["avenBOX", "play/avenbox/intent.ts", "Intent: ", "main's results"]) expect(instructions).toContain(says);
  });

  test("at Proposal: checked again, a failing must takes it back; it is rejected or sent back to Specify there; a waiting proposal decides it", async () => {
    const i = await intentAt("A fern at Proposal", "prototype");
    const all = [{ check: "c1", pass: true, evidence: "built" }, { check: "c2", pass: true, evidence: "0.5 m" }];
    expect((await tool("check_intent", { intent: i.id, results: all })).stage).toBe("proposal");
    // checked again while none of its proposals waits: a must that fails takes it back to Prototype, and passing again to Proposal
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c2", pass: false, evidence: "0.8 m after the change" }] })).stage).toBe("prototype");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c2", pass: true, evidence: "0.5 m again" }] })).stage).toBe("proposal");
    // sent back to Specify from Proposal, its approval and results go
    expect((await call("ada", "POST", `/api/intents/${i.id}/respecify`)).data).toMatchObject({ stage: "specify", approved_at: null, results: null });
    expect((await call("ada", "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("prototype");
    expect((await tool("check_intent", { intent: i.id, results: all })).stage).toBe("proposal");
    // with its work waiting, deciding it decides the work: it is neither sent back nor checked again
    const made = await tool("propose_asset", { group: "plants", label: "Fern at Proposal", source: SOURCE, note: "x", intent: i.id });
    expect(made.error).toBeUndefined();
    expect((await call("ada", "POST", `/api/intents/${i.id}/respecify`)).data.error).toContain("waits for a decision");
    expect((await tool("check_intent", { intent: i.id, results: all })).error).toContain("no work of it waits there");
    // other work made on the same base goes in first: its work is archived by itself, and an intent with an approved
    // spec goes back to Prototype, its results cleared, to be built on the new head
    const first = await tool("propose_version", { asset: made.asset, source: SOURCE + "// first\n", note: "first in" });
    expect((await call("ada", "POST", `/api/intents/${first.intent}/accept`)).data.stage).toBe("accepted");
    expect(await tool("get_intent", { intent: i.id })).toMatchObject({ stage: "prototype", results: null, decided_by: null, work: { status: "archived", version: made.version } });
    expect((await db.query<any>(`SELECT status FROM play.doc_branches WHERE id = $1`, [made.branch])).rows[0].status).toBe("archived");
    expect((await tool("check_intent", { intent: i.id, results: all })).stage).toBe("proposal");
    expect((await call("ada", "POST", `/api/intents/${i.id}/reject`)).data).toMatchObject({ stage: "archived", decided_by: "ada" });
  });

  test("migration 0028 moves an intent already in Prototype with every must check passed to Proposal", async () => {
    const m = MIGRATIONS.find((x) => x.id === "0028-intents-ready-propose")!;
    const at = async (title: string, results: Record<string, boolean>) => {
      const i = await intentAt(title, "prototype");
      const r = Object.fromEntries(Object.entries(results).map(([k, pass]) => [k, { pass, evidence: "x", by: "ada", at: new Date().toISOString() }]));
      await db.query(`UPDATE play.intents SET results = ($2::text)::jsonb, stage = 'prototype' WHERE id = $1`, [i.id, JSON.stringify(r)]);
      return i.id;
    };
    const ready = await at("Ready before 0028", { c1: true, c2: true });
    const failing = await at("A must failing before 0028", { c1: true, c2: false });
    const unchecked = await at("A must unchecked before 0028", { c1: true });
    await db.query(m.sql);
    const stage = async (id: string) => (await tool("get_intent", { intent: id })).stage;
    expect(await stage(ready)).toBe("proposal");
    expect(await stage(failing)).toBe("prototype");
    expect(await stage(unchecked)).toBe("prototype");
  });

  test("work proposed without an intent is a new intent at Proposal of its own", async () => {
    const plain = await tool("propose_asset", { group: "plants", label: "Plain fern", source: SOURCE, note: "no intent named\nmore lines" });
    expect(plain.error).toBeUndefined();
    expect(plain.intent).toMatch(UUID);
    const own = await tool("get_intent", { intent: plain.intent });
    expect(own).toMatchObject({ stage: "proposal", kind: "idea", title: "Plain fern v1", note: "no intent named\nmore lines", spec: null, author: "ada", via: "mcp" });
    expect(own.work).toMatchObject({ kind: "asset_version", grp: "plants", status: "proposal", note: "no intent named\nmore lines", author: "ada", via: "mcp" });
    // another version of it, on the same (still empty) head: an intent of its own too, a new thing while nothing is accepted
    const next = await tool("propose_version", { asset: plain.asset, source: SOURCE + "// v2\n", note: "darker" });
    const second = await tool("get_intent", { intent: next.intent });
    expect(second).toMatchObject({ stage: "proposal", kind: "idea", title: "Plain fern v1", note: "darker" });
    // accepted, it is; the other, made on the same base, is archived by itself
    expect((await call("ada", "POST", `/api/intents/${plain.intent}/accept`)).data.stage).toBe("accepted");
    expect((await tool("get_intent", { intent: second.id })).stage).toBe("archived");
    expect((await tool("list_intents", { stage: "accepted" })).map((x: any) => x.id)).toContain(own.id);
    expect((await tool("list_intents", { stage: "all", work: "asset_version" })).map((x: any) => x.id)).toEqual(expect.arrayContaining([own.id, second.id]));
    // a version on the accepted head is an improvement
    const v2 = await tool("propose_version", { asset: plain.asset, source: SOURCE + "// v2 again\n", note: "on v1" });
    expect(await tool("get_intent", { intent: v2.intent })).toMatchObject({ kind: "improve", title: "Plain fern v2" });
    // an agent archives its own at Proposal, made over MCP; not one proposed on the page
    expect(await tool("archive_intent", { intent: v2.intent })).toMatchObject({ intent: v2.intent, stage: "archived" });
    const web = await call("ada", "POST", "/api/intents", { asset: plain.asset, source: SOURCE + "// by the page\n", note: "on the page" });
    expect(web.status).toBe(201);
    expect((await tool("archive_intent", { intent: web.data.intent })).error).toContain("over MCP");
  });
});
