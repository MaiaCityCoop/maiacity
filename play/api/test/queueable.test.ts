// Accept is offered only where GitHub will queue the pull request (intent 33f81b80-798b-4c17-9d6f-df65bc20efbb;
// play/SPEC.md §4.12 "Sub-states"): the newest run of main.yml on the head decides each required check, and a refusal
// to queue for a check GitHub still expects is shown as waiting. A real Postgres, a fake GitHub (./fixtures/github.ts),
// every time a fixed one: the sub-state is said at the time the pull request was read.
import { afterAll, beforeAll, expect, test } from "bun:test";
import type { BlobStore } from "../src/blobs";
import { type Db } from "../src/kit/pg";
import { type Pull } from "../src/github";
import { subStateOf } from "../src/substate";
import { watchPulls } from "../src/watcher";
import { fakeGitHub, iso, REPO, run, sha } from "./fixtures/github";
import { agentToken, type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool } from "./kit";

const SPEC = {
  goal: "Something of play's is made.",
  nothing_to_reduce: "A test fixture: nothing to reduce.",
  scope: "play/api/src: something small.",
  checks: [{ check: "Its tests pass", how: "test", by: "bun test", run: "cd play/api && bun test" }],
};
const API = "play / API and site", WEB = "website / build";
const MIN = 60_000;
/** 2026-11-10 19:20 UTC, the evening of the three refusals */
const T0 = Date.UTC(2026, 10, 10, 19, 20);

suite("Accept only where GitHub will queue it", () => {
  let f: Fresh, db: Db, api: Api, store: BlobStore;
  let gh: ReturnType<typeof fakeGitHub>;
  let cookie = "", token = "";

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    gh = fakeGitHub();
    store = tempStore();
    api = appOn(db, { store, github: gh.gh });
    ({ cookie } = await human(db, "ada"));
    token = (await agentToken(api, cookie, { avenbox: true })).token;
  });
  afterAll(async () => {
    await f?.drop();
  });

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);
  let ids = 0, prs = 700, commits = 7000;
  /** a check run of the run whose check suite is `suite` */
  const check = (name: string, suite_: number, state: "success" | "skipped" | "in_progress", at: number) => ({
    id: ++ids, name, status: state === "in_progress" ? "in_progress" : "completed", conclusion: state === "in_progress" ? null : state, started_at: iso(at), check_suite: { id: suite_ },
  });
  /** a run of main.yml on `head`, its check suite `suite` */
  const mainRun = (id: number, head: string, suite_: number, at: number, status: string, conclusion: string | null = null) =>
    run(id, head, { event: "pull_request", check_suite_id: suite_, created_at: iso(at), run_started_at: iso(at), status, conclusion });
  /** a whole green run of main.yml: its jobs' checks and the two required ones */
  const greenRun = (suite_: number, at: number) => [check("play / API", suite_, "success", at), check("play / Site", suite_, "success", at), check(API, suite_, "success", at + 8 * MIN), check(WEB, suite_, "success", at + 2 * MIN)];
  /** an intent at Proposal, its check passed on its open, mergeable pull request's head; main.yml ran green on it once (suite 1) */
  const codeAtProposal = async () => {
    const i = await tool("add_intent", { title: `Intent ${prs + 1}`, kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    const pr = ++prs, head = sha(++commits);
    expect((await tool("check_intent", { intent: i.id, pr, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: head }] })).stage).toBe("proposal");
    const pull: Pull = { number: pr, state: "open", merged: false, merge_commit_sha: null, mergeable: true, base: { ref: "main" }, head: { sha: head, ref: `intent/${pr}` }, html_url: `https://github.test/${REPO}/pull/${pr}`, title: i.title };
    gh.pulls.set(pr, pull);
    gh.checks.set(head, greenRun(1, T0));
    gh.runs["main.yml"].push(mainRun(pr * 10 + 1, head, 1, T0, "completed", "success"));
    return { id: i.id as string, pr, head };
  };
  /** the pull request read at `at`, and the intent's sub-state as the board says it then */
  const subAt = async (id: string, at: number) => {
    await watchPulls(db, gh.gh, store, at);
    const i = (await call("GET", `/api/intents/${id}`)).data;
    return subStateOf(i, i.pr_seen, at + 1_000);
  };
  const WAITING = { state: "waiting", tag: "Accept and ship", why: "Accept and ship" };
  const writes = (from: number) => gh.calls.slice(from).filter((c) => c.method !== "GET" && !(c.path === "/graphql" && !`${c.body?.query}`.startsWith("mutation")) && c.body?.context !== "Intent");
  const enqueues = (from: number) => gh.calls.slice(from).filter((c) => c.path === "/graphql" && `${c.body?.query}`.startsWith("mutation Enqueue"));
  const runsAsked = (from: number, head: string) => gh.calls.slice(from).filter((c) => c.path.startsWith("/actions/workflows/main.yml/runs") && c.path.includes(head));

  test("a second run in progress after a green one: the board waits for the newest run's checks, Accept is refused and nothing posted or queued; green in the newest run, Accept queues it", async () => {
    const c = await codeAtProposal();
    expect(await subAt(c.id, T0 + 9 * MIN)).toEqual(WAITING);
    // marked ready again: a second run of main.yml on the same head, none of its jobs made yet (the check runs unchanged)
    const second = mainRun(c.pr * 10 + 2, c.head, 2, T0 + 17 * MIN, "queued");
    gh.runs["main.yml"].push(second);
    const working = { state: "working", tag: "checks running", why: `Waiting for #${c.pr}'s checks (${API}, ${WEB})` };
    expect(await subAt(c.id, T0 + 17 * MIN)).toEqual(working);
    // its first jobs run; the required check is still the first run's green one (#2250's head at 19:37)
    second.status = "in_progress";
    gh.checks.get(c.head)!.push(check("play / API", 2, "in_progress", T0 + 17 * MIN), check("play / Site", 2, "in_progress", T0 + 17 * MIN));
    expect(await subAt(c.id, T0 + 18 * MIN)).toEqual(working);
    const from = gh.calls.length;
    const refused = await call("POST", `/api/intents/${c.id}/accept`);
    expect(refused.status).toBe(409);
    expect(refused.data.error).toContain(working.why);
    expect(writes(from)).toEqual([]);
    // the newest run ends green: Accept is offered, and queues it
    Object.assign(second, { status: "completed", conclusion: "success" });
    gh.checks.set(c.head, [...greenRun(1, T0), ...greenRun(2, T0 + 17 * MIN)]);
    expect(await subAt(c.id, T0 + 26 * MIN)).toEqual(WAITING);
    const taken = await call("POST", `/api/intents/${c.id}/accept`);
    expect(taken.status).toBe(200);
    expect(taken.data.stage).toBe("ship");
    expect(enqueues(from).map((e) => e.body.variables.head)).toEqual([c.head]);
  });

  test("a later skipped run after a green one (a draft's run): the board waits and says the checks were skipped in the newest run, Accept is refused; a newer green run offers it again", async () => {
    const c = await codeAtProposal();
    expect(await subAt(c.id, T0 + 9 * MIN)).toEqual(WAITING);
    // #2243's head: a later run of main.yml whose jobs play and website were skipped
    gh.runs["main.yml"].push(mainRun(c.pr * 10 + 2, c.head, 2, T0 + 12 * MIN, "completed", "skipped"));
    gh.checks.get(c.head)!.push(check("play", 2, "skipped", T0 + 12 * MIN), check("website", 2, "skipped", T0 + 12 * MIN));
    const why = `Waiting for #${c.pr}'s checks (${API}: skipped in the newest run, ${WEB}: skipped in the newest run)`;
    expect(await subAt(c.id, T0 + 13 * MIN)).toEqual({ state: "working", tag: "checks running", why });
    const from = gh.calls.length;
    const refused = await call("POST", `/api/intents/${c.id}/accept`);
    expect(refused.status).toBe(409);
    expect(refused.data.error).toContain(why);
    expect(writes(from)).toEqual([]);
    gh.runs["main.yml"].push(mainRun(c.pr * 10 + 3, c.head, 3, T0 + 20 * MIN, "completed", "success"));
    gh.checks.get(c.head)!.push(...greenRun(3, T0 + 20 * MIN));
    expect(await subAt(c.id, T0 + 29 * MIN)).toEqual(WAITING);
  });

  test("GitHub refuses to queue for a check it still expects: Accept answers no error, the intent stays at Proposal working, the check named; offered again once the checks change or after two minutes; any other refusal is an error as before", async () => {
    const c = await codeAtProposal();
    expect(await subAt(c.id, T0 + 9 * MIN)).toEqual(WAITING);
    gh.queue.refuse = `Required status check "${API}" is expected.`;
    const from = gh.calls.length;
    const held = await call("POST", `/api/intents/${c.id}/accept`);
    expect(held.status).toBe(200);
    expect(held.data).toMatchObject({ stage: "proposal", decided_by: null });
    expect(held.data.message).toBeUndefined();
    expect(enqueues(from).length).toBe(1);
    const sub = { state: "working", tag: "GitHub waits for checks", why: `Waiting for #${c.pr}'s checks: GitHub does not queue it yet (Required status check "${API}" is expected)` };
    expect(held.data.sub).toEqual(sub);
    const at = Date.parse(held.data.pr_seen.unqueued.at);
    expect(held.data.pr_seen.unqueued).toEqual({ head: c.head, why: `Required status check "${API}" is expected`, at: expect.any(String) });
    // read again, its checks the same: still waiting for GitHub, and a second Accept asks GitHub for nothing
    expect(await subAt(c.id, at + 30_000)).toEqual(sub);
    const again = gh.calls.length;
    const second = await call("POST", `/api/intents/${c.id}/accept`);
    expect(second.status).toBe(409);
    expect(second.data.error).toContain(sub.why);
    expect(enqueues(again)).toEqual([]);
    // the expected check arrives (the checks read differently): Accept is offered again, and queues it
    gh.queue.refuse = null;
    gh.runs["main.yml"].push(mainRun(c.pr * 10 + 2, c.head, 2, T0 + 10 * MIN, "completed", "success"));
    gh.checks.get(c.head)!.push(...greenRun(2, T0 + 10 * MIN), check("intent / named", 9, "success", T0 + 10 * MIN));
    expect(await subAt(c.id, at + 40_000)).toEqual(WAITING);
    expect((await call("POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");

    // nothing changing, it is offered again after two minutes
    const d = await codeAtProposal();
    gh.queue.refuse = "Pull request 2 of 4 required status checks are expected.";
    const dHeld = await call("POST", `/api/intents/${d.id}/accept`);
    expect(dHeld.status).toBe(200);
    expect(dHeld.data.sub.why).toBe(`Waiting for #${d.pr}'s checks: GitHub does not queue it yet (Pull request 2 of 4 required status checks are expected)`);
    const dAt = Date.parse(dHeld.data.pr_seen.unqueued.at);
    expect((await subAt(d.id, dAt + 119_000)).state).toBe("working");
    expect(await subAt(d.id, dAt + 121_000)).toEqual(WAITING);

    // any other refusal: the error it was
    gh.queue.refuse = "The merge queue is locked";
    const other = await call("POST", `/api/intents/${d.id}/accept`);
    expect(other.status).toBe(409);
    expect(other.data.error).toBe(`GitHub did not queue #${d.pr}: GitHub's GraphQL answered: The merge queue is locked`);
    gh.queue.refuse = null;
  });

  test("no more calls against GitHub's limit: main.yml's runs are asked only while the required checks look green, conditionally; unchanged, every read is a 304", async () => {
    const c = await codeAtProposal();
    await watchPulls(db, gh.gh, store, T0 + 9 * MIN);
    const from = gh.calls.length;
    await watchPulls(db, gh.gh, store, T0 + 10 * MIN);
    const mine = gh.calls.slice(from).filter((x) => x.path === `/pulls/${c.pr}` || x.path.includes(c.head));
    expect(mine.map((x) => [x.path.split("?")[0], x.status])).toEqual([[`/pulls/${c.pr}`, 304], [`/commits/${c.head}/check-runs`, 304], ["/actions/workflows/main.yml/runs", 304]]);
    // a required check not green by the check runs themselves: the runs decide nothing, and are not asked
    gh.checks.get(c.head)!.push(check(API, 1, "in_progress", T0 + 11 * MIN));
    const then = gh.calls.length;
    expect((await subAt(c.id, T0 + 11 * MIN)).why).toBe(`Waiting for #${c.pr}'s checks (${API})`);
    await watchPulls(db, gh.gh, store, T0 + 12 * MIN);
    expect(runsAsked(then, c.head)).toEqual([]);
  });
});
