// One intent holds all its work (intent 7c8986c5; play/SPEC.md §4.12 and §4.15), against a real Postgres
// (TEST_DATABASE_URL, as for ./api.test.ts) and a fake GitHub (./fixtures/github.ts):
// - documents: two assets' versions, a story's and a skill's proposed on one intent sit side by side, each its own intent
//   variant; get_intent lists all four; Accept freezes each document's next version in one transaction; archive closes
//   all of them; proposing one again replaces only that one;
// - ship: an intent naming a pull request and holding play's work goes Accept and ship; its work waits while it ships;
//   the reconcile seeing its merge commit live marks it Accepted and accepts its work in that step; a red step brings it
//   back to Proposal with its work still waiting.
import { afterAll, beforeAll, expect, test } from "bun:test";
import type { BlobStore } from "../src/blobs";
import { type Db } from "../src/kit/pg";
import { reconcile } from "../src/ship";
import { watchShips } from "../src/watcher";
import { type Pull } from "../src/github";
import type { Rule } from "../src/rules";
import { seedDoc } from "../src/versioned";
import { fakeGitHub, green, job, REPO, run, sha } from "./fixtures/github";
import { agentToken, type Api, appOn, type Fresh, freshDb, human, quiet, request, suite, tempStore, tool as mcpTool } from "./kit";

const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";

suite("one intent holds all its work", () => {
  let f: Fresh, db: Db;
  let api: Api;
  let store: BlobStore;
  let gh: ReturnType<typeof fakeGitHub>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";
  let restore = () => {};

  beforeAll(async () => {
    restore = quiet();
    f = await freshDb();
    db = f.db;
    gh = fakeGitHub();
    store = tempStore();
    api = appOn(db, { store, github: gh.gh });
    who.ada = await human(db, "ada");
    // the GitHub runs' token: a code intent's checks are recorded with it alone
    token = (await agentToken(api, who.ada.cookie, { avenbox: true })).token;
  });

  afterAll(async () => {
    restore();
    await f?.drop();
  });

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: who.ada.cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);

  const SPEC = {
    goal: "Two people and their film change together.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "Two assets, a story and a skill.",
    checks: [{ check: "It looks right", how: "look", by: "the board beside the sheet" }],
  };
  /** an intent at Proposal, its one must passed, ready to take work */
  const ready = async (title: string) => {
    const i = await tool("add_intent", { title, kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "seen" }] })).stage).toBe("proposal");
    return i.id as string;
  };
  const asset = (label: string, intent: string) => tool("propose_asset", { lod: { levels: "derived" }, group: "plants", label, source: SOURCE, note: `${label}, its first version`, intent });
  const story = (title: string, intent: string) =>
    tool("propose_story", { title, note: "its first cut", intent, body: { format: "9:16", fps: 30, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 4, who: "MAIA", line: "One." }] }] } });
  const variants = async (intent: string) =>
    (await db.query<{ doc_id: string; variant_id: string; status: string }>(
      `SELECT iv.doc_id, iv.variant_id, v.status FROM play.intent_variants iv JOIN play.doc_variants v ON v.id = iv.variant_id WHERE iv.intent_id = $1 ORDER BY iv.position`,
      [intent],
    )).rows;
  const statusOf = async (variant: string | number) => (await db.query<{ status: string }>(`SELECT status FROM play.doc_variants WHERE id = $1`, [variant])).rows[0]?.status;
  const headOf = async (a: string) => (await db.query<{ head: string | null }>(`SELECT head FROM play.assets WHERE id = $1`, [a])).rows[0]?.head ?? null;

  test("documents: two assets, a story and a skill on one intent, side by side; Accept takes them all in one transaction; archive closes them all; proposing one again replaces only that one", async () => {
    const skill = crypto.randomUUID();
    await seedDoc(db, "skill", { id: skill, json: { schema: "skill/1", label: "An all-work skill", group: "tests", system: "Say it once." }, note: "its first version" });
    const id = await ready("Stand-in and Elder woman, their film and their skill");
    const stand = await asset("Stand-in", id);
    const elder = await asset("Elder woman", id);
    const film = await story("Two people", id);
    for (const p of [stand, elder, film]) expect(p.error).toBeUndefined();
    const sk = await tool("propose_doc_version", { doc: skill, note: "the skill names them", edits: [{ op: "set", path: ["note"], value: "first" }], intent: id });
    expect(sk.error).toBeUndefined();
    // four documents, each its own intent variant, none closing another
    const held = await variants(id);
    expect(held.map((h) => h.doc_id)).toEqual([`asset:${stand.asset}`, `asset:${elder.asset}`, `story:${film.story}`, `skill:${skill}`]);
    expect(held.every((h) => h.status === "proposed")).toBe(true);
    // get_intent lists all four, in its review
    const got = await tool("get_intent", { intent: id });
    expect(got).toMatchObject({ stage: "proposal", work: { status: "proposal", docs: 4 } });
    expect(got.review.docs.map((d: any) => d.doc.id)).toEqual([stand.asset, elder.asset, film.story, skill]);
    expect(got.review.docs.map((d: any) => d.doc.kind)).toEqual(["asset", "asset", "story", "skill"]);

    // proposing one again replaces only that one: the skill's variant, the others as they were
    const again = await tool("propose_doc_version", { doc: skill, note: "the skill names them, better", edits: [{ op: "set", path: ["note"], value: "second" }], intent: id });
    expect(again.error).toBeUndefined();
    const now = await variants(id);
    expect(now.map((h) => h.doc_id)).toEqual(held.map((h) => h.doc_id));
    expect(now.slice(0, 3).map((h) => h.variant_id)).toEqual(held.slice(0, 3).map((h) => h.variant_id));
    expect(now[3].variant_id).not.toBe(held[3].variant_id);
    expect(await statusOf(held[3].variant_id)).toBe("archived");
    // an asset proposed again too: only that asset's variant is replaced
    const elder2 = await tool("propose_doc_version", { doc: elder.asset, note: "Elder woman, again", edits: [{ op: "set", path: ["source"], value: SOURCE + "// her second\n" }, { op: "set", path: ["card"], value: { card: { lod: { levels: "derived" } } } }], intent: id });
    expect(elder2.error).toBeUndefined();
    const after = await variants(id);
    expect(after.length).toBe(4);
    expect(after[0].variant_id).toBe(held[0].variant_id);
    expect(after[2].variant_id).toBe(held[2].variant_id);

    // Accept: every document's next version, in one transaction
    const was = (await tool("doc_at", { doc: skill })).number;
    const r = await call("POST", `/api/intents/${id}/accept`);
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ stage: "accepted", decided_by: "ada", decision: { status: "accepted" } });
    expect(await headOf(stand.asset)).toBe(stand.version);
    expect(await headOf(elder.asset)).not.toBeNull();
    expect((await tool("doc_at", { doc: elder.asset })).json.source).toContain("her second");
    expect((await call("GET", `/api/stories/${film.story}`)).status).toBe(200);
    expect((await tool("doc_at", { doc: skill })).json.note).toBe("second");
    expect((await tool("doc_at", { doc: skill })).number).toBe(was + 1);
    for (const h of await variants(id)) expect(h.status).toBe("accepted");

    // one that would not go in leaves them all out: a skill whose Main moved on the same field archives the whole
    const clash = await ready("Two more, one clashing");
    const a3 = await asset("Gardener", clash);
    const s3 = await tool("propose_doc_version", { doc: skill, note: "clash", edits: [{ op: "set", path: ["note"], value: "mine" }], intent: clash });
    expect(s3.error).toBeUndefined();
    const other = await ready("The skill, first");
    await tool("propose_doc_version", { doc: skill, note: "first in", edits: [{ op: "set", path: ["note"], value: "theirs" }], intent: other });
    expect((await call("POST", `/api/intents/${other}/accept`)).data.stage).toBe("accepted");
    const lost = await call("POST", `/api/intents/${clash}/accept`);
    expect(lost.data.decision).toMatchObject({ status: "archived" });
    expect(lost.data.decision.message).toContain("nothing of this intent went in");
    expect(await headOf(a3.asset)).toBeNull();

    // archive closes them all
    const gone = await ready("Two people, not wanted");
    const g1 = await asset("Passer-by", gone);
    const g2 = await asset("Cyclist", gone);
    await story("Not wanted", gone);
    expect([g1, g2].every((g) => !g.error)).toBe(true);
    expect((await variants(gone)).length).toBe(3);
    expect((await call("POST", `/api/intents/${gone}/reject`)).data).toMatchObject({ stage: "archived" });
    for (const h of await variants(gone)) expect(h.status).toBe("archived");
    expect(await headOf(g1.asset)).toBeNull();
    expect(await headOf(g2.asset)).toBeNull();
  });

  // ---- code beside play's work

  const CODE_SPEC = {
    goal: "The render bench's motion mode, and the two people that need it.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "play/site and two assets.",
    checks: [{ check: "Its tests pass", how: "test", by: "bun test", run: "cd play/api && bun test" }],
  };
  let prs = 300;
  let commits = 3000;
  /** an intent of code and two assets at Proposal: its pull request open, mergeable, its checks green */
  const codeAndWork = async (title: string) => {
    const i = await tool("add_intent", { title, kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...CODE_SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    const pr = ++prs;
    const head = sha(++commits);
    // the work proposed in Build waits on it
    const a = await asset(`${title}: Stand-in`, i.id);
    const b = await asset(`${title}: Elder woman`, i.id);
    expect([a.error, b.error]).toEqual([undefined, undefined]);
    expect(a.stage).toBe("build");
    // its run names its pull request and records its checks: to Proposal with its work
    const at = await tool("check_intent", { intent: i.id, pr, results: [{ check: "c1", pass: true, evidence: "bun test: 0 fail", commit: head }] });
    expect(at).toMatchObject({ stage: "proposal", pull_request: pr });
    gh.pulls.set(pr, {
      number: pr, state: "open", merged: false, merge_commit_sha: null, mergeable: true, base: { ref: "main" }, head: { sha: head, ref: `intent/${pr}` },
      html_url: `https://github.test/${REPO}/pull/${pr}`, title,
    } as Pull);
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
    gh.merges.set(pr, sha(++commits));
    return { id: i.id as string, pr, head, merge: gh.merges.get(pr)!, assets: [a, b] };
  };
  const clearShips = () => db.query(`UPDATE play.intents SET stage = 'archived' WHERE stage = 'ship'`);
  const intent = async (id: string) => (await call("GET", `/api/intents/${id}`)).data;

  test("ship: code and two assets go Accept and ship; the work waits while it ships; the reconcile seeing its merge live accepts it in that step", async () => {
    await clearShips();
    const c = await codeAndWork("Motion mode");
    const before = await intent(c.id);
    expect(before.work).toMatchObject({ status: "proposal", docs: 2 });
    expect(before.review.docs.length).toBe(2);
    // play's work alone is not accepted while code goes with it
    const { gate } = await import("../src/intents");
    expect((await gate.mayMove(db, c.id, "accept_work"))?.why).toContain("Accept and ship");
    // Accept and ship: in Ship, merged; its work waiting there
    const old = gh.main.head;
    const r = await call("POST", `/api/intents/${c.id}/accept`);
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ stage: "ship", ship: { pr: c.pr, merge: c.merge }, work: { status: "proposal" } });
    for (const a of c.assets) expect(await headOf(a.asset)).toBeNull();
    // all green on GitHub: ended in Ship, its work still waiting until play runs its merge
    gh.runs["main.yml"].push(run(31001, c.merge, { status: "completed", conclusion: "success" }));
    gh.runs["release.yml"].push(run(31002, c.merge, { display_title: `release ${c.merge}`, event: "workflow_run", status: "completed", conclusion: "success" }));
    gh.runs["production.yml"].push(run(31003, c.merge, { event: "workflow_dispatch", status: "completed", conclusion: "success" }));
    gh.jobs.set(31003, [job(311, "The image", "completed", "success"), job(312, "The backup", "completed", "success"), job(313, "The server", "completed", "success"), job(314, "The website", "completed", "success")]);
    await watchShips(db, gh.gh, store, Date.now(), null);
    expect(await intent(c.id)).toMatchObject({ stage: "ship", ship: { outcome: "green" }, work: { status: "proposal" } });
    await reconcile(db, gh.gh, store, old);
    for (const a of c.assets) expect(await headOf(a.asset)).toBeNull();
    // play runs its merge: Accepted, and its work accepted in that same step
    const done = await reconcile(db, gh.gh, store, c.merge);
    expect(done.accepted).toContain(c.id);
    const after = await intent(c.id);
    expect(after).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { live: true, commit: c.merge }, work: { status: "accepted" } });
    for (const a of c.assets) expect(await headOf(a.asset)).toBe(a.version);
    for (const h of await variants(c.id)) expect(h.status).toBe("accepted");
  });

  test("ship: a red step brings it back to Proposal with its report, its work still waiting; Accept ships it again", async () => {
    await clearShips();
    const c = await codeAndWork("Red at the backup");
    expect((await call("POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");
    gh.runs["main.yml"].push(run(32001, c.merge, { status: "completed", conclusion: "success" }));
    gh.runs["release.yml"].push(run(32002, c.merge, { display_title: `release ${c.merge}`, status: "completed", conclusion: "success" }));
    gh.runs["production.yml"].push(run(32003, c.merge, { event: "workflow_dispatch", status: "completed", conclusion: "failure" }));
    gh.jobs.set(32003, [
      job(321, "The image", "completed", "success"),
      job(322, "The backup", "completed", "failure", [{ name: "Back up play", status: "completed", conclusion: "failure" }]),
      job(323, "The server", "completed", "skipped"),
      job(324, "The website", "completed", "success"),
    ]);
    gh.logs.set(322, "line 1\n");
    await watchShips(db, gh.gh, store, Date.now(), null);
    const red = await intent(c.id);
    expect(red).toMatchObject({ stage: "proposal", ship: { outcome: "red", report: { step: "Backup" } }, work: { status: "proposal" } });
    for (const a of c.assets) expect(await headOf(a.asset)).toBeNull();
    for (const h of await variants(c.id)) expect(h.status).toBe("proposed");
    // its decision is Ship again, its work with it
    expect(red.sub).toMatchObject({ state: "failed" });
    const again = await call("POST", `/api/intents/${c.id}/accept`);
    expect(again.data).toMatchObject({ stage: "ship", work: { status: "proposal" } });
  });

  test("ship: an intent holding code and work is decided by no auto-accept rule, and its board's decision is Accept and ship", async () => {
    await clearShips();
    const c = await codeAndWork("No rule for both");
    const { factsOf, matchRule } = await import("../src/rules");
    const f = await factsOf(db, c.id);
    expect(f.both).toBe(true);
    expect(matchRule(f, "accept", { rules: [{ id: crypto.randomUUID(), label: "everything", gates: ["accept"], match: {}, reason: "test" } as Rule] })).toBeNull();
    // what the board reads of GitHub: Accept and ship once its pull request is read
    const { watchPulls } = await import("../src/watcher");
    await watchPulls(db, gh.gh);
    expect((await intent(c.id)).sub).toMatchObject({ state: "waiting", tag: "Accept and ship" });
  });
});
