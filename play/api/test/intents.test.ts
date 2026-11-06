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
import { migrate } from "../src/migrations";
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
    expect((await call("ada", "POST", "/api/intents", { title: "By hand" })).status).toBe(405);
    const i = await tool("add_intent", { title: "Something", note: "x" });
    expect(i).toMatchObject({ stage: "idea", kind: "idea", via: "mcp", author: "ada", spec: null, results: null, proposals: [] });
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
    const before = (await call("ada", "GET", "/api/proposals")).data.length;
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
    expect(none).not.toContain("c3");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c9", pass: true, evidence: "x" }] })).error).toContain("not one of this intent's checks");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: " " }] })).error).toContain("evidence");
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "render.mjs: built in 1.2 s" }, { check: "c2", pass: false, evidence: "measured 0.72 m" }] });
    expect((await fern(i.id)).error).toContain("c2 (Its height is 0.4–0.6 m): failed");
    expect((await call("ada", "GET", "/api/proposals")).data.length).toBe(before);
    // every must passes (the nice one need not): the proposal is taken, the intent is at the proposal stage
    const checked = await tool("check_intent", { intent: i.id, results: [{ check: "c2", pass: true, evidence: "measured 0.52 m" }] });
    expect(checked.results).toMatchObject({ c1: { pass: true, by: "ada" }, c2: { pass: true, evidence: "measured 0.52 m" } });
    const made = await fern(i.id);
    expect(made.error).toBeUndefined();
    expect(made.intent).toBe(i.id);
    const at = await tool("get_intent", { intent: i.id });
    expect(at.stage).toBe("proposal");
    expect(at.proposals).toHaveLength(1);
    expect(at.proposals[0]).toMatchObject({ id: made.id, status: "proposal", intent_id: i.id, intent_title: i.title, label: "Shade fern" });
    // a citizen sees the proposal, not the intent it is
    expect((await call("cit", "GET", `/api/proposals/${made.id}`)).data).toMatchObject({ intent_id: null, intent_title: null, intent_spec: null });
    // accepted: the intent follows
    expect((await call("ada", "POST", `/api/proposals/${made.id}/accept`)).data.status).toBe("accepted");
    expect((await tool("get_intent", { intent: i.id })).stage).toBe("accepted");
    expect((await fern(i.id)).error).toContain("accepted: it takes no more proposals");
  });

  test("rejected, an approved intent goes back to Prototype, its checks to be run again", async () => {
    const i = await intentAt("A taller fern", "prototype");
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "built" }, { check: "c2", pass: true, evidence: "0.5 m" }] });
    const made = await tool("propose_asset", { group: "plants", label: "Taller fern", source: SOURCE, note: "x", intent: i.id });
    expect((await tool("get_intent", { intent: i.id })).stage).toBe("proposal");
    expect((await call("ada", "POST", `/api/proposals/${made.id}/archive`)).data.status).toBe("archived");
    const back = await tool("get_intent", { intent: i.id });
    expect(back).toMatchObject({ stage: "prototype", results: null });
    expect((await tool("propose_asset", { group: "plants", label: "Taller fern", source: SOURCE, note: "again", intent: i.id })).error).toContain("no result yet");
    // sent back to Specify, its approval and results go; rejected, it is archived; brought back, to Specify with its spec
    expect((await call("ada", "POST", `/api/intents/${i.id}/respecify`)).data).toMatchObject({ stage: "specify", approved_at: null });
    expect((await call("ada", "POST", `/api/intents/${i.id}/reject`)).data.stage).toBe("archived");
    expect((await call("ada", "POST", `/api/intents/${i.id}/reopen`)).data.stage).toBe("specify");
  });

  test("the final gate: an intent whose work goes through main is accepted on main's results", async () => {
    const i = await intentAt("Sources on play", "prototype");
    expect((await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.error).toContain("Every must check passes");
    const sha = "0123456789abcdef0123456789abcdef01234567";
    // where a result ran: avenBOX by default, or main; a commit is a whole git hash
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "x", where: "laptop" }] })).error).toContain("where is avenBOX or main");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "x", commit: "abc123" }] })).error).toContain("40-character git hash");
    const boxed = await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "intent.ts: exit 0" }, { check: "c2", pass: true, evidence: "0.5", commit: sha }] });
    expect(boxed.results).toMatchObject({ c1: { pass: true, where: "avenBOX" }, c2: { pass: true, where: "avenBOX", commit: sha } });
    // passed in avenBOX alone: not yet; each check named
    const refused = (await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.error;
    expect(refused).toContain("c1 (The recipe builds in the asset box): passed in avenBOX, not yet run on main");
    expect(refused).toContain("c2 (Its height is 0.4–0.6 m): passed in avenBOX, not yet run on main");
    // main runs them after the merge: one fails there
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "main", where: "main", commit: sha }, { check: "c2", pass: false, evidence: "0.7", where: "main", commit: sha }] });
    const onMain = (await call("ada", "POST", `/api/intents/${i.id}/accept`)).data.error;
    expect(onMain).toContain("c2 (Its height is 0.4–0.6 m): failed on main");
    expect(onMain).not.toContain("c1");
    await tool("check_intent", { intent: i.id, results: [{ check: "c2", pass: true, evidence: "0.5 on main", where: "main", commit: sha }] });
    expect((await call("ada", "GET", `/api/intents/${i.id}`)).data.results.c2).toMatchObject({ where: "main", commit: sha, pass: true });
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

  test("every proposal is an intent's: one made without an intent gets one, which follows it", async () => {
    const plain = await tool("propose_asset", { group: "plants", label: "Plain fern", source: SOURCE, note: "no intent named\nmore lines" });
    expect(plain.error).toBeUndefined();
    const listed = (await call("ada", "GET", `/api/proposals/${plain.id}`)).data;
    expect(listed.intent_id).toMatch(UUID);
    const own = await tool("get_intent", { intent: listed.intent_id });
    expect(own).toMatchObject({ stage: "proposal", kind: "idea", title: "Plain fern v1", note: "no intent named\nmore lines", spec: null, author: "ada", via: "mcp" });
    // another version of it, on the same (still empty) head: an intent of its own too, a new thing while nothing is accepted
    const next = await tool("propose_version", { asset: plain.asset, source: SOURCE + "// v2\n", note: "darker" });
    const second = await tool("get_intent", { intent: (await call("ada", "GET", `/api/proposals/${next.id}`)).data.intent_id });
    expect(second).toMatchObject({ stage: "proposal", kind: "idea", title: "Plain fern v1", note: "darker" });
    // accepted, its intent is; the other, made on the same base, is archived with it, and so is its intent
    expect((await call("ada", "POST", `/api/proposals/${plain.id}/accept`)).data.status).toBe("accepted");
    expect((await tool("get_intent", { intent: own.id })).stage).toBe("accepted");
    expect((await tool("get_intent", { intent: second.id })).stage).toBe("archived");
    // the board lists them, each with its proposals' kind and group
    const board = (await call("ada", "GET", "/api/intents")).data.find((x: any) => x.id === own.id);
    expect(board.proposals).toEqual([{ id: plain.id, status: "accepted", kind: "asset_version", grp: "plants" }]);
    expect((await tool("list_intents", { stage: "accepted" })).map((x: any) => x.id)).toContain(own.id);
    // a version on the accepted head is an improvement
    const v2 = await tool("propose_version", { asset: plain.asset, source: SOURCE + "// v2 again\n", note: "on v1" });
    expect(await tool("get_intent", { intent: (await call("ada", "GET", `/api/proposals/${v2.id}`)).data.intent_id })).toMatchObject({ kind: "improve", title: "Plain fern v2" });
  });
});
