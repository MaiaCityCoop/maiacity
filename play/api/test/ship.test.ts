// Accept ships it (src/ship.ts, play/SPEC.md §4.12) against a real Postgres and a fake GitHub behind the real client, so
// every request play makes is seen. SHIP_TOKEN is sent to GitHub only.
import { afterAll, beforeAll, expect, test } from "bun:test";
import type { BlobStore } from "../src/blobs";
import { type Db } from "../src/kit/pg";
import { acceptGroups, NO_QUEUE, reconcile, runningCommit, tailOf } from "../src/ship";
import { startShipWatcher, watchPulls, watchShips } from "../src/watcher";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACCEPTED_CONTEXT, INTENT_CONTEXT, gitHub, shipGitHub, type Pull } from "../src/github";
import { fakeGitHub, green, job, REPO, run, sha, TOKEN } from "./fixtures/github";
import { agentToken, type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool, until } from "./kit";
import * as fx from "./fixtures/intents";

const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";

suite("accept ships it", () => {
  let f: Fresh, db: Db;
  let api: Api, bare: Api, store: BlobStore;
  let gh: ReturnType<typeof fakeGitHub>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";
  /** everything play logged while these tests ran: SHIP_TOKEN may not be in it */
  const said: string[] = [];
  const keep = { log: console.log, warn: console.warn, error: console.error };

  beforeAll(async () => {
    for (const k of ["log", "warn", "error"] as const) console[k] = (...a: unknown[]) => (said.push(a.map((x) => (x instanceof Error ? `${x.message}\n${x.stack}` : typeof x === "string" ? x : JSON.stringify(x))).join(" ")), keep[k](...a));
    f = await freshDb();
    db = f.db;
    gh = fakeGitHub();
    store = tempStore();
    api = appOn(db, { store, github: gh.gh });
    bare = appOn(db, { store });
    who.ada = await human(db, "ada");
    who.cit = await human(db, "cit", null);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
    // the GitHub runs' token (play/SPEC.md §4.12): what decides a code intent is recorded with it alone
    token = (await agentToken(api, who.ada.cookie, { avenbox: true })).token;
  });

  afterAll(async () => {
    Object.assign(console, keep);
    await f?.drop();
  });

  /** a request as `as`, to `through()` (play by default); GitHub's token is never in what play answers */
  const call = (as: string | null, method: string, path: string, body?: unknown, through = () => api) =>
    request(through(), { cookie: as ? who[as].cookie : null }, method, path, body).then((r) => {
      expect(r.text).not.toContain(TOKEN);
      return r;
    });
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);

  const SPEC = {
    goal: "A change of play's code is shipped.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "play/api/src: something small.",
    checks: [
      { check: "Its tests pass", how: "test", by: "bun test", run: "cd play/api && bun test" },
      { check: "It answers in 2 s", how: "measure", by: "the time it takes, at most 2 s", run: "echo 1.2" },
      { check: "It looks right", how: "look", by: "the board beside the sheet", must: false },
    ],
  };
  let prs = 100;
  let commits = 1000;
  /** an intent of code, its checks passed on its pull request's head, at Proposal; the pull request open, mergeable, its checks green */
  const codeAtProposal = async (title: string, more: Partial<Pull> = {}) => {
    const i = await tool("add_intent", { title, kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("ada", "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    const pr = ++prs;
    const head = sha(++commits);
    const at = await tool("check_intent", {
      intent: i.id,
      pr,
      results: [{ check: "c1", pass: true, evidence: "bun test: 0 fail", commit: head }, { check: "c2", pass: true, evidence: "1.2 s", commit: head }],
    });
    expect(at).toMatchObject({ stage: "proposal", pull_request: pr });
    gh.pulls.set(pr, {
      number: pr, state: "open", merged: false, merge_commit_sha: null, mergeable: true, base: { ref: "main" }, head: { sha: head, ref: `claude/${pr}` },
      html_url: `https://github.test/${REPO}/pull/${pr}`, title, ...more,
    });
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
    gh.merges.set(pr, sha(++commits));
    return { id: i.id as string, pr, head, merge: gh.merges.get(pr)! };
  };
  const intent = async (id: string) => (await call("ada", "GET", `/api/intents/${id}`)).data;
  // the status 'Intent' that wakes a builder is ./intentstatus.test.ts's
  const writesSince = (from: number) =>
    gh.calls.slice(from).filter((c) => c.method !== "GET" && c.body?.context !== INTENT_CONTEXT && !(c.path === "/graphql" && !`${c.body?.query}`.startsWith("mutation")));

  /** what is in Ship from an earlier case done with: the queue is one for the whole database */
  const clearShips = () => ((gh.queue.entries.length = 0), fx.clearShips(db));
  const shipOf = async (id: string) => (await intent(id)).ship;
  const stateOf = async (id: string) => Object.fromEntries((await shipOf(id)).steps.map((s: any) => [s.key, s.state]));
  /** its ship all the way through on GitHub: main's checks, the release, the deploy's jobs green */
  const allGreen = (merge: string, base: number) => {
    gh.runs["main.yml"].push(run(base + 1, merge, { status: "completed", conclusion: "success" }));
    gh.runs["release.yml"].push(run(base + 2, merge, { display_title: `release ${merge}`, event: "workflow_run", status: "completed", conclusion: "success" }));
    gh.runs["production.yml"].push(run(base + 3, merge, { event: "workflow_dispatch", status: "completed", conclusion: "success" }));
    gh.jobs.set(base + 3, [
      job(base + 32, "The image", "completed", "success"),
      job(base + 31, "The backup", "completed", "success"),
      job(base + 33, "The server", "completed", "success"),
      job(base + 34, "The website", "completed", "success"),
    ]);
  };

  const enqueues = (from: number) => gh.calls.slice(from).filter((c) => c.path === "/graphql" && `${c.body?.query}`.startsWith("mutation Enqueue"));
  const queued = () => gh.queue.entries.map((e) => e.pr);
  const queuedNote = async (id: string) => (await shipOf(id)).steps.find((s: any) => s.key === "queued").note as string;

  test("Accept enqueues: 'Intent accepted' on the checked head and enqueuePullRequest at that head, at once; three in a row, main moving, none refused; refused for a failed must, a conflict, a red required check, a head not the checked one", async () => {
    await clearShips();
    const c = await codeAtProposal("A small fix of play");
    const from = gh.calls.length;
    const r = await call("ada", "POST", `/api/intents/${c.id}/accept`);
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ stage: "ship", decided_by: "ada", pull_request: c.pr, ship: { pr: c.pr, head: c.head, merge: "", by: "ada", round: 1 } });
    const [q, ...rest] = r.data.ship.steps;
    expect(q).toMatchObject({ key: "queued", name: "In the merge queue", state: "running", note: "Queued by ada · 1st in the merge queue" });
    expect(rest.map((s: any) => [s.key, s.state])).toEqual([
      ["merged", "queued"], ["main", "queued"], ["release", "queued"], ["image", "queued"], ["backup", "queued"], ["server", "queued"], ["website", "queued"],
    ]);
    // the status on the head, then the pull request queued at that head, each with SHIP_TOKEN as Bearer; play merges nothing
    const writes = writesSince(from);
    expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual([`POST /statuses/${c.head}`, "POST /graphql"]);
    expect(writes[0].body).toMatchObject({ state: "success", context: ACCEPTED_CONTEXT, description: "Accepted by ada on play" });
    expect(writes[1].body.variables).toMatchObject({ pr: `PR_${c.pr}`, head: c.head });
    expect(gh.calls.slice(from).some((w) => w.path.endsWith("/merge") || w.path.includes("update-branch"))).toBe(false);
    for (const w of gh.calls.slice(from)) expect(w.auth).toBe(`Bearer ${TOKEN}`);
    expect(queued()).toEqual([c.pr]);
    // listed in Ship, an open stage; not decided again there
    expect((await call("ada", "GET", "/api/intents?stage=ship")).data.map((x: any) => x.id)).toContain(c.id);
    expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).status).toBe(409);
    expect((await call("ada", "POST", `/api/intents/${c.id}/reject`)).status).toBe(409);

    // three more in a row, main moving between them: each enqueued at once, none waiting for another
    const three = [await codeAtProposal("Second"), await codeAtProposal("Third"), await codeAtProposal("Fourth")];
    for (const [k, x] of three.entries()) {
      gh.commit(sha(++commits), "main moved", [gh.main.head], true);
      const at = gh.calls.length;
      const got = await call("ada", "POST", `/api/intents/${x.id}/accept`);
      expect(got.status).toBe(200);
      expect(got.data.stage).toBe("ship");
      expect(await queuedNote(x.id)).toBe(`Queued by ada · ${["2nd", "3rd", "4th"][k]} in the merge queue`);
      expect(enqueues(at).map((e) => e.body.variables.head)).toEqual([x.head]);
    }
    expect(queued()).toEqual([c.pr, ...three.map((x) => x.pr)]);

    // refused, nothing posted or queued, left at Proposal with the reason
    const refused = async (x: { id: string }, why: string, stage = "proposal") => {
      const at = gh.calls.length;
      const no = await call("ada", "POST", `/api/intents/${x.id}/accept`);
      expect(no.status).toBe(409);
      expect(no.data.error).toContain(why);
      expect(writesSince(at)).toEqual([]);
      expect((await intent(x.id)).stage).toBe(stage);
    };
    const failedMust = await codeAtProposal("A must failed");
    await tool("check_intent", { intent: failedMust.id, results: [{ check: "c1", pass: false, evidence: "1 fail", commit: failedMust.head }] });
    await refused(failedMust, "An intent in Build is not accepted", "build");
    await refused(await codeAtProposal("In conflict", { mergeable: false }), "conflicts with main");
    const red = await codeAtProposal("Red on its head");
    gh.checks.set(red.head, [{ ...green("play / API and site"), conclusion: "failure" }, green("website / build")]);
    await refused(red, "'play / API and site' is failure");
    const moved = await codeAtProposal("Head moved");
    const newer = sha(++commits);
    gh.pulls.get(moved.pr)!.head.sha = newer;
    gh.checks.set(newer, [green("play / API and site"), green("website / build")]);
    await refused(moved, "head moved past the checked commit");
    expect(queued()).toEqual([c.pr, ...three.map((x) => x.pr)]);
  });

  test("no merge queue yet: while main's ruleset has none, Accept is refused with deploy/README.md's line, nothing posted", async () => {
    await clearShips();
    const c = await codeAtProposal("Before the ruleset");
    gh.queue.on = false;
    try {
      const from = gh.calls.length;
      const no = await call("ada", "POST", `/api/intents/${c.id}/accept`);
      expect(no.status).toBe(409);
      expect(no.data.error).toBe(NO_QUEUE);
      expect(writesSince(from)).toEqual([]);
      expect((await intent(c.id)).stage).toBe("proposal");
      expect(readFileSync(resolve(import.meta.dir, "../../../deploy/README.md"), "utf8").split("\n")).toContain(NO_QUEUE);
    } finally {
      gh.queue.on = true;
    }
    expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");
  });

  test("play follows the queue: queued with its position and its group's checks, merged as its commit, main's checks, release and deploy; two merged by one push share one release and one deploy run; each Accepted by the reconcile once live", async () => {
    await clearShips();
    const a = await codeAtProposal("First of a batch");
    const b = await codeAtProposal("Second of a batch");
    for (const x of [a, b]) expect((await call("ada", "POST", `/api/intents/${x.id}/accept`)).data.stage).toBe("ship");
    // GitHub builds their groups: main + a, then main + a + b, their checks running
    gh.build(() => [{ ...green("play / API and site"), status: "in_progress", conclusion: null }, green("website / build")]);
    await watchShips(db, gh.gh, store);
    const [ga, gb] = gh.queue.entries.map((e) => e.group!);
    expect(await queuedNote(a.id)).toBe(`1st in the merge queue · its group ${ga.slice(0, 7)}: 1 of 2 checks done`);
    expect(await queuedNote(b.id)).toBe(`2nd in the merge queue · its group ${gb.slice(0, 7)}: 1 of 2 checks done`);
    expect((await intent(b.id)).sub).toMatchObject({ state: "working", tag: "in the merge queue" });
    // the batch lands as one push: main fast-forwarded to b's group, a's merge in it
    const landed = gh.land();
    expect(landed).toBe(b.merge);
    await watchShips(db, gh.gh, store);
    for (const x of [a, b]) {
      expect(await stateOf(x.id)).toMatchObject({ queued: "green", merged: "green", main: "queued" });
      expect(await shipOf(x.id)).toMatchObject({ merge: x.merge });
    }
    // one main run, one release, one deploy, for the push
    allGreen(landed, 5000);
    await watchShips(db, gh.gh, store, Date.now(), landed);
    for (const x of [a, b]) {
      const done = await intent(x.id);
      expect(done).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { outcome: "green", landed, main_run: 5001, release_run: 5002, deploy_run: 5003, live: true, commit: landed } });
      expect(done.ship.steps.every((s: any) => s.state === "green")).toBe(true);
    }
  });

  test("removed from the queue: the pull request GitHub removes returns its intent to Proposal, failed, with the failing check and its link; the others stay queued and ship", async () => {
    await clearShips();
    const [a, b, d] = [await codeAtProposal("Ahead of it"), await codeAtProposal("The culprit"), await codeAtProposal("Behind it")];
    for (const x of [a, b, d]) await call("ada", "POST", `/api/intents/${x.id}/accept`);
    gh.build((g) => [green("play / API and site"), green("website / build")].map((r) => ({ ...r, html_url: `https://github.test/checks/${g}` })));
    await watchShips(db, gh.gh, store);
    const gb = gh.queue.entries[1].group!;
    gh.checks.set(gb, [{ ...green("play / API and site"), conclusion: "failure", html_url: `https://github.test/${REPO}/runs/77` }, green("website / build")]);
    gh.dequeue(b.pr, "FAILED_CHECKS");
    await watchShips(db, gh.gh, store);
    const back = await intent(b.id);
    expect(back).toMatchObject({ stage: "proposal", decided_by: null, ship: { outcome: "red", merge: "", report: { step: "In the merge queue", link: `https://github.test/${REPO}/runs/77` } } });
    expect(back.ship.report.why).toBe(`GitHub removed #${b.pr} from the merge queue (failed checks): 'play / API and site' is failure on its group ${gb.slice(0, 7)}`);
    expect(back.ship.again).toBeUndefined();
    expect(back.sub).toMatchObject({ state: "failed", tag: "Ship red" });
    // its builder woken on its head
    expect(gh.calls.some((c) => c.path === `/statuses/${b.head}` && c.body?.context === INTENT_CONTEXT && c.body.state === "failure")).toBe(true);
    // the rest go on: rebuilt without it, they land
    for (const x of [a, d]) expect((await intent(x.id)).stage).toBe("ship");
    gh.build();
    await watchShips(db, gh.gh, store);
    expect(await queuedNote(d.id)).toContain("2nd in the merge queue");
    gh.land();
    await watchShips(db, gh.gh, store);
    for (const x of [a, d]) expect(await stateOf(x.id)).toMatchObject({ merged: "green" });
  });

  test("merge group accepted: 'Intent accepted' on each group's commit, green only when play accepted every pull request in it, else failure naming the one not accepted; each once", async () => {
    await clearShips();
    const a = await codeAtProposal("Accepted, first");
    const b = await codeAtProposal("Accepted, second");
    for (const x of [a, b]) await call("ada", "POST", `/api/intents/${x.id}/accept`);
    // a pull request queued without play's Accept (by hand on GitHub), and one accepted behind it
    const stray = ++prs;
    gh.pulls.set(stray, { ...gh.pulls.get(a.pr)!, number: stray, head: { sha: sha(++commits), ref: "stray" }, title: "Stray" });
    gh.queue.entries.push({ pr: stray, group: null, state: "QUEUED" });
    const d = await codeAtProposal("Accepted, behind the stray");
    await call("ada", "POST", `/api/intents/${d.id}/accept`);
    gh.build();
    const groups = gh.queue.entries.map((e) => e.group!);
    const posted = new Map<string, string>();
    const from = gh.calls.length;
    await acceptGroups(db, gh.gh, posted);
    const on = (g: string) => gh.calls.slice(from).filter((c) => c.path === `/statuses/${g}`).map((c) => [c.body.context, c.body.state, c.body.description]);
    expect(on(groups[0])).toEqual([[ACCEPTED_CONTEXT, "success", `Accepted on play: #${a.pr}`]]);
    expect(on(groups[1])).toEqual([[ACCEPTED_CONTEXT, "success", `Accepted on play: #${a.pr}, #${b.pr}`]]);
    expect(on(groups[2])).toEqual([[ACCEPTED_CONTEXT, "failure", `#${stray} is not accepted on play`]]);
    expect(on(groups[3])).toEqual([[ACCEPTED_CONTEXT, "failure", `#${stray} is not accepted on play`]]);
    // looked at again: nothing posted twice
    const again = gh.calls.length;
    await acceptGroups(db, gh.gh, posted);
    expect(gh.calls.slice(again).filter((c) => c.method === "POST" && c.path.startsWith("/statuses/"))).toEqual([]);
    gh.queue.entries.length = 0;
  });

  test("the ship watcher follows main's checks, the release and the deploy, step by step, to Accepted; it resumes after a restart", async () => {
    await clearShips();
    const c = await codeAtProposal("Shipped all the way");
    expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");
    const steps = () => stateOf(c.id);
    gh.land();
    // merged, nothing else on GitHub yet: all waits
    await watchShips(db, gh.gh, store);
    expect(await steps()).toMatchObject({ queued: "green", merged: "green", main: "queued", release: "queued" });
    // main's checks run, then pass
    const main = run(1101, c.merge, { status: "in_progress" });
    gh.runs["main.yml"].push(main);
    await watchShips(db, gh.gh, store);
    expect(await steps()).toMatchObject({ main: "running", release: "queued" });
    expect((await shipOf(c.id)).steps[2].link).toBe(main.html_url);
    Object.assign(main, { status: "completed", conclusion: "success" });
    // play restarts: a new client, the same database; it goes on where it was
    const again = gitHub({ token: TOKEN, repo: REPO, fetch: gh.fetch, api: "https://api.github.test" });
    const release = run(1201, sha(999), { display_title: `release ${c.merge}`, event: "workflow_run", status: "in_progress" });
    gh.runs["release.yml"].push(run(1200, sha(998), { display_title: `release ${sha(5)}`, status: "completed", conclusion: "failure" }), release);
    await watchShips(db, again, store);
    expect(await steps()).toMatchObject({ main: "green", release: "running", image: "queued" });
    Object.assign(release, { status: "completed", conclusion: "success" });
    // the deploy: production.yml dispatched on production at the commit that landed, its jobs
    const deploy = run(1301, c.merge, { event: "workflow_dispatch", status: "in_progress" });
    gh.runs["production.yml"].push(deploy);
    gh.jobs.set(1301, [
      job(2, "The image", "in_progress", null),
      job(1, "The backup", "queued", null),
      job(3, "The server", "queued", null),
      job(4, "The website", "completed", "success"),
    ]);
    await watchShips(db, again, store);
    expect(await steps()).toEqual({ queued: "green", merged: "green", main: "green", release: "green", image: "running", backup: "queued", server: "queued", website: "green" });
    expect((await intent(c.id)).stage).toBe("ship");
    gh.jobs.set(1301, [
      job(2, "The image", "completed", "success"),
      job(1, "The backup", "completed", "success"),
      job(3, "The server", "completed", "success"),
      job(4, "The website", "completed", "success"),
    ]);
    Object.assign(deploy, { status: "completed", conclusion: "success" });
    const stop = startShipWatcher(db, again, store, 20, c.merge);
    await until("the background watcher takes it out of Ship", async () => (await intent(c.id)).stage !== "ship", { withinMs: 2_000 });
    stop();
    const done = await intent(c.id);
    expect(done).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { outcome: "green", deploy_run: 1301, release_run: 1201, main_run: 1101 } });
    expect(done.ship.steps.find((s: any) => s.key === "server").link).toContain("/job/3");
  });

  test("a red step after the merge takes it back to Proposal with the report; Accept ships it again: the release, main's failed jobs, or a newer pull request", async () => {
    await clearShips();
    const c = await codeAtProposal("Red at the backup");
    await call("ada", "POST", `/api/intents/${c.id}/accept`);
    gh.land();
    gh.runs["main.yml"].push(run(2101, c.merge, { status: "completed", conclusion: "success" }));
    gh.runs["release.yml"].push(run(2201, c.merge, { display_title: `release ${c.merge}`, status: "completed", conclusion: "success" }));
    gh.runs["production.yml"].push(run(2301, c.merge, { event: "workflow_dispatch", status: "completed", conclusion: "failure" }));
    gh.jobs.set(2301, [
      job(22, "The image", "completed", "success"),
      job(23, "The backup", "completed", "failure", [{ name: "Back up play", status: "completed", conclusion: "failure" }]),
      job(21, "The server", "completed", "skipped"),
      job(24, "The website", "completed", "success"),
    ]);
    gh.logs.set(23, Array.from({ length: 100 }, (_, i) => `2026-11-06T12:00:${String(i % 60).padStart(2, "0")}.1234567Z line ${i + 1}`).join("\n") + "\n");
    await watchShips(db, gh.gh, store);
    const red = await intent(c.id);
    expect(red).toMatchObject({ stage: "proposal", decided_by: null, decided_at: null, ship: { outcome: "red", again: "release", report: { step: "Backup", link: `https://github.test/${REPO}/actions/runs/1/job/23` } } });
    const lines = red.ship.report.log.split("\n");
    expect([lines.length, lines[0], lines[59]]).toEqual([60, "line 41", "line 100"]);
    // the log is fetched from where GitHub points, without the token
    expect(gh.calls.find((x) => x.path === "/23")!.auth).toBeNull();
    expect(Object.fromEntries(red.ship.steps.map((s: any) => [s.key, s.state]))).toMatchObject({ backup: "red", server: "skipped", image: "green", website: "green" });

    // its pull request is merged: Accept runs the release again for the commit it landed in, at once
    let from = gh.calls.length;
    const again = (await call("ada", "POST", `/api/intents/${c.id}/accept`)).data;
    expect(writesSince(from)).toEqual([expect.objectContaining({ method: "POST", path: "/actions/workflows/release.yml/dispatches", body: { ref: "main", inputs: { sha: c.merge } } })]);
    expect(again).toMatchObject({ stage: "ship", ship: { round: 2, merge: c.merge, report: null } });
    expect(again.ship.steps.map((s: any) => s.state)).toEqual(["green", "green", "green", "queued", "queued", "queued", "queued", "queued"]);
    // the earlier round's runs are not this one's: nothing moves until a new release runs
    await watchShips(db, gh.gh, store);
    expect((await shipOf(c.id)).steps[3].state).toBe("queued");
    await clearShips();

    // a red on main: Accept runs main's failed jobs again
    const m = await codeAtProposal("Red on main");
    await call("ada", "POST", `/api/intents/${m.id}/accept`);
    gh.land();
    gh.runs["main.yml"].push(run(3101, m.merge, { status: "completed", conclusion: "failure" }));
    gh.jobs.set(3101, [job(31, "play / API and site", "completed", "failure"), job(32, "website / build", "completed", "success")]);
    gh.logs.set(31, "2026-11-06T12:00:00.0000000Z error: 1 fail\n");
    await watchShips(db, gh.gh, store);
    expect(await shipOf(m.id)).toMatchObject({ outcome: "red", again: "main", main_run: 3101, report: { step: "main's checks", log: "error: 1 fail" } });
    from = gh.calls.length;
    expect((await call("ada", "POST", `/api/intents/${m.id}/accept`)).data).toMatchObject({ stage: "ship", ship: { round: 2 } });
    expect(writesSince(from).map((w) => `${w.method} ${w.path}`)).toEqual(["POST /actions/runs/3101/rerun-failed-jobs"]);

    // a newer pull request of it, checked on its head: Accept queues that one
    await watchShips(db, gh.gh, store, Date.now() + 20 * 60_000);
    const late = await intent(m.id);
    expect(late).toMatchObject({ stage: "proposal", ship: { outcome: "red", report: { step: "main's checks" } } });
    expect(late.ship.report.why).toContain("within 15 minutes");
    const pr = ++prs;
    const head = sha(++commits);
    expect((await tool("check_intent", { intent: m.id, pr, results: [{ check: "c1", pass: true, evidence: "fixed", commit: head }, { check: "c2", pass: true, evidence: "1.1", commit: head }] })).pull_request).toBe(pr);
    gh.pulls.set(pr, { ...gh.pulls.get(m.pr)!, number: pr, state: "open", merged: false, merge_commit_sha: null, head: { sha: head, ref: "claude/fix" }, html_url: `https://github.test/${REPO}/pull/${pr}` });
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
    from = gh.calls.length;
    const third = (await call("ada", "POST", `/api/intents/${m.id}/accept`)).data;
    expect(third).toMatchObject({ stage: "ship", ship: { pr, head, merge: "", round: 3 } });
    expect(writesSince(from).map((w) => `${w.method} ${w.path}`)).toEqual([`POST /statuses/${head}`, "POST /graphql"]);
    // a pull request merged by no ship of it is not shipped
    const o = await codeAtProposal("Merged by hand");
    Object.assign(gh.pulls.get(o.pr)!, { state: "closed", merged: true, merge_commit_sha: sha(4242) });
    expect((await call("ada", "POST", `/api/intents/${o.id}/accept`)).data.error).toContain("merged already, and not by a ship of this intent");
    gh.queue.entries.length = 0;
  });

  // ---- the reconcile (intent 9876ef00): a code intent's stage agrees with the commit play runs

  /** an intent at Proposal on its checks, no pull request named: a decision, or code by its trailer on main */
  const decisionAtProposal = async (title: string) => {
    const i = await tool("add_intent", { title, kind: "fix" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    await call("ada", "POST", `/api/intents/${i.id}/approve`);
    expect(await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "ok" }, { check: "c2", pass: true, evidence: "1.0" }] })).toMatchObject({ stage: "proposal" });
    return i.id as string;
  };
  /** play as it runs `commit` (its PLAY_COMMIT) */
  const running = (commit: string | null) => appOn(db, { github: gh.gh, commit });
  /** a ship all the way green on GitHub, the watcher's look against `commit` */
  const shipped = async (title: string, commit: (merge: string) => string | null, base: number) => {
    await clearShips();
    const c = await codeAtProposal(title);
    expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");
    gh.land();
    allGreen(c.merge, base);
    await watchShips(db, gh.gh, store, Date.now(), commit(c.merge));
    return c;
  };

  test("one place makes a code intent Accepted: the reconcile, after Ship's watcher and for an Accept on code by its trailer", async () => {
    // Ship's watcher, all green: ended in Ship, Accepted only by the reconcile, once play runs its merge
    const before = gh.main.head;
    const c = await shipped("Green, then reconciled", () => null, 9000);
    expect(await intent(c.id)).toMatchObject({ stage: "ship", ship: { outcome: "green" } });
    // ended, it holds no one up: the next ship merges
    const next = await codeAtProposal("Ships behind a green one");
    expect((await call("ada", "POST", `/api/intents/${next.id}/accept`)).data.stage).toBe("ship");
    // play runs a commit before its merge: still in Ship, flagged not live
    const was = await reconcile(db, gh.gh, store, before);
    expect(was.flagged).toContain(c.id);
    expect(await intent(c.id)).toMatchObject({ stage: "ship", ship: { live: false, commit: before } });
    // play runs its merge: Accepted, by the reconcile, decided by the admin who accepted it
    const r = await reconcile(db, gh.gh, store, c.merge);
    expect(r.accepted).toContain(c.id);
    const done = await intent(c.id);
    expect(done).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { live: true, commit: c.merge, outcome: "green" } });
    expect(done.ship.note).toContain("Accepted by the reconcile");
    await clearShips();

    // an Accept on code named by its trailer on main, no pull request: the reconcile's, not a person's
    const t = await decisionAtProposal("Code by its trailer");
    const old = gh.main.head;
    const on = gh.commit(sha(++commits), `A fix\n\nIntent: ${t}`);
    const from = gh.calls.length;
    const notYet = await call("ada", "POST", `/api/intents/${t}/accept`, undefined, () => running(old));
    expect(notYet.status).toBe(409);
    expect(notYet.data.error).toContain(`Its code is on main (${on.slice(0, 7)}), not yet in what play runs (${old.slice(0, 7)})`);
    expect((await intent(t)).stage).toBe("proposal");
    expect(writesSince(from)).toEqual([]);
    const noCommit = await call("ada", "POST", `/api/intents/${t}/accept`, undefined, () => running(null));
    expect(noCommit.data.error).toContain("PLAY_COMMIT");
    const live = await call("ada", "POST", `/api/intents/${t}/accept`, undefined, () => running(on));
    expect(live.data).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { live: true, commit: on, merge: on } });
    expect(live.data.ship.note).toContain("Accepted by the reconcile");
    // a decision (no code anywhere) is accepted as before, straight
    const d = await decisionAtProposal("A decision only");
    expect((await call("ada", "POST", `/api/intents/${d}/accept`, undefined, () => running(on))).data).toMatchObject({ stage: "accepted", ship: null });
  });

  test("live intents are Accepted: merged and in what play runs, left at Proposal, Build or Archived, becomes Accepted with a note saying how", async () => {
    // Proposal: a red step after the merge (the website, once play runs it)
    await clearShips();
    const red = await codeAtProposal("Red at the website, live");
    await call("ada", "POST", `/api/intents/${red.id}/accept`);
    gh.land();
    gh.runs["main.yml"].push(run(9101, red.merge, { status: "completed", conclusion: "success" }));
    gh.runs["release.yml"].push(run(9102, red.merge, { display_title: `release ${red.merge}`, status: "completed", conclusion: "success" }));
    gh.runs["production.yml"].push(run(9103, red.merge, { event: "workflow_dispatch", status: "completed", conclusion: "failure" }));
    gh.jobs.set(9103, [job(91, "The image", "completed", "success"), job(92, "The backup", "completed", "success"), job(93, "The server", "completed", "success"), job(94, "The website", "completed", "failure")]);
    // the watcher's look against a play that does not run it yet: back to Proposal with the report
    await watchShips(db, gh.gh, store, Date.now(), sha(1));
    expect(await intent(red.id)).toMatchObject({ stage: "proposal", ship: { outcome: "red", report: { step: "The website" } } });

    // Build: its pull request merged by hand on GitHub, its checks gone red since
    const hand = await codeAtProposal("Merged by hand, in Build");
    await tool("check_intent", { intent: hand.id, results: [{ check: "c1", pass: false, evidence: "a flake", commit: hand.head }] });
    expect((await intent(hand.id)).stage).toBe("build");
    const pr = gh.pulls.get(hand.pr)!;
    const handMerge = gh.commit(sha(++commits), `Merge pull request #${hand.pr}`, [gh.main.head, hand.head]);
    Object.assign(pr, { state: "closed", merged: true, merge_commit_sha: handMerge });

    // Archived: shipped by hand, archived on the board
    const arch = await codeAtProposal("Archived, yet live");
    const archMerge = gh.commit(sha(++commits), `Merge pull request #${arch.pr}\n\nIntent: ${arch.id}`, [gh.main.head, arch.head]);
    Object.assign(gh.pulls.get(arch.pr)!, { state: "closed", merged: true, merge_commit_sha: archMerge });
    expect((await call("ada", "POST", `/api/intents/${arch.id}/reject`)).data.stage).toBe("archived");

    // not merged: left as it is
    const open = await codeAtProposal("Open still");

    const r = await reconcile(db, gh.gh, store, gh.main.head);
    expect(r.accepted).toEqual(expect.arrayContaining([red.id, hand.id, arch.id]));
    expect(r.accepted).not.toContain(open.id);
    for (const [id, merge] of [[red.id, red.merge], [hand.id, handMerge], [arch.id, archMerge]]) {
      const i = await intent(id);
      expect(i).toMatchObject({ stage: "accepted", ship: { live: true, commit: gh.main.head, merge } });
      expect(i.ship.note).toBe(`Live at ${gh.main.head.slice(0, 7)}, its merge ${merge.slice(0, 7)} in what play runs: Accepted by the reconcile`);
    }
    // the red ship's steps and report kept; an Archived one is decided by no one now
    expect((await intent(red.id)).ship.report.step).toBe("The website");
    expect((await intent(arch.id)).decided_by).toBeNull();
    expect((await intent(open.id)).stage).toBe("proposal");
    // once more: nothing to do
    const again = await reconcile(db, gh.gh, store, gh.main.head);
    expect(again.accepted).toEqual([]);
  });

  test("Accepted but not live is flagged: rolled back or closed unmerged, its stage unchanged; once production includes it again the flag clears", async () => {
    // Accepted by its ship, then production rolled back to the commit before its merge
    const before = gh.main.head;
    const c = await shipped("Rolled back", (m) => m, 9500);
    expect((await intent(c.id)).stage).toBe("accepted");
    // Accepted with its pull request closed unmerged (a decision made before ships, its code never in)
    const closed = await decisionAtProposal("Closed unmerged");
    await call("ada", "POST", `/api/intents/${closed}/accept`, undefined, () => running(null));
    const pr = ++prs;
    gh.pulls.set(pr, { number: pr, state: "closed", merged: false, merge_commit_sha: null, mergeable: null, base: { ref: "main" }, head: { sha: sha(++commits), ref: "x" }, html_url: `https://github.test/${REPO}/pull/${pr}`, title: "closed" });
    await db.query(`UPDATE play.intents SET pull_request = $2 WHERE id = $1`, [closed, pr]);
    expect((await intent(closed)).stage).toBe("accepted");

    const back = await reconcile(db, gh.gh, store, before);
    expect(back.flagged).toEqual(expect.arrayContaining([c.id, closed]));
    expect(await intent(c.id)).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { live: false, commit: before, merge: c.merge } });
    expect(await intent(closed)).toMatchObject({ stage: "accepted", ship: { live: false, commit: before, pr, steps: [] } });
    // flagged once for that commit: not again
    expect((await reconcile(db, gh.gh, store, before)).flagged).not.toContain(c.id);
    // the board's card says so
    const listed = (await call("ada", "GET", "/api/intents?stage=accepted")).data.find((x: any) => x.id === c.id);
    expect(listed.ship).toMatchObject({ live: false, commit: before });

    // production includes it again: the flag clears; the closed one stays flagged
    const fwd = await reconcile(db, gh.gh, store, gh.main.head);
    expect(fwd.cleared).toContain(c.id);
    expect(await intent(c.id)).toMatchObject({ stage: "accepted", ship: { live: true, commit: gh.main.head } });
    expect(fwd.flagged).toContain(closed);
    expect(await intent(closed)).toMatchObject({ stage: "accepted", ship: { live: false, commit: gh.main.head } });
    // the commit play runs is its PLAY_COMMIT, a full sha
    expect(runningCommit({ PLAY_COMMIT: ` ${c.merge.toUpperCase()} ` })).toBe(c.merge);
    expect(runningCommit({ PLAY_COMMIT: "abc1234" })).toBeNull();
    expect(runningCommit({})).toBeNull();
  });

  // ---- GitHub's limit (intent b3f83e0b): one compare per shipped intent, tried again each look until it lands

  /** three intents shipped green, in Ship, the watcher's look against a play that runs none of them */
  const threeGreen = async (base: number) => {
    await clearShips();
    const out: { id: string; merge: string }[] = [];
    for (let k = 0; k < 3; k++) {
      const c = await codeAtProposal(`Shipped ${base} ${k}`);
      expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");
      gh.land();
      allGreen(c.merge, base + k * 10);
      await watchShips(db, gh.gh, store, Date.now(), null);
      expect(await intent(c.id)).toMatchObject({ stage: "ship", ship: { outcome: "green" } });
      out.push(c);
    }
    return out;
  };

  test("reconcile: one compare per shipped intent, main's history never walked", async () => {
    const three = await threeGreen(9800);
    // the watcher's look as play runs main's head: the reconcile of the three green in Ship, one compare each
    let from = gh.calls.length;
    await watchShips(db, gh.gh, store, Date.now(), gh.main.head);
    // (the status 'Intent', "Accepted: live", one each as they are Accepted, is ./intentstatus.test.ts's)
    const asked = gh.calls.slice(from).filter((c) => c.body?.context !== INTENT_CONTEXT).map((c) => `${c.method} ${c.path.split("?")[0]}`);
    expect(asked.filter((c) => c.startsWith("GET /compare/")).length).toBeLessThanOrEqual(3);
    expect(asked.filter((c) => c === "GET /commits")).toEqual([]);
    expect(asked.length).toBeLessThanOrEqual(3);
    for (const c of three) expect(await intent(c.id)).toMatchObject({ stage: "accepted", ship: { live: true, commit: gh.main.head } });
    // the whole reconcile at a later commit: every Accepted intent live at the last one asked by one compare, not each
    const next = gh.commit(sha(++commits), "another commit on main");
    from = gh.calls.length;
    await reconcile(db, gh.gh, store, next);
    const compares = gh.calls.slice(from).filter((c) => c.path.startsWith("/compare/"));
    expect(compares.filter((c) => c.path === `/compare/${next}...${three[0].merge}`)).toEqual([]);
    expect(gh.calls.slice(from).filter((c) => c.path.startsWith("/commits?") && !c.path.includes("since="))).toEqual([]);
  });

  test("reconcile retries: a failed look as the ship ends leaves it in Ship; the next good look accepts it; no green in Ship, no reconcile", async () => {
    await clearShips();
    const c = await codeAtProposal("Live, its first look failed");
    await call("ada", "POST", `/api/intents/${c.id}/accept`);
    gh.land();
    allGreen(c.merge, 9900);
    // GitHub fails every compare as the ship ends green: still in Ship, green, going live
    gh.answerAll({ status: 502, message: "Server Error", only: /^\/compare\// });
    await watchShips(db, gh.gh, store, Date.now(), c.merge);
    expect(await intent(c.id)).toMatchObject({ stage: "ship", ship: { outcome: "green" }, sub: { tag: "green, going live" } });
    // the next look, GitHub answering: Accepted by the reconcile, no ship ending again
    gh.answerAll(null);
    await watchShips(db, gh.gh, store, Date.now(), c.merge);
    const done = await intent(c.id);
    expect(done).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { live: true, commit: c.merge } });
    expect(done.ship.note).toContain("Accepted by the reconcile");
    // nothing green in Ship: a look asks GitHub nothing for the reconcile
    const from = gh.calls.length;
    await watchShips(db, gh.gh, store, Date.now(), c.merge);
    expect(gh.calls.slice(from)).toEqual([]);
  });

  test("SHIP_TOKEN never leaves play's server: not in an answer, not in a log", async () => {
    expect(shipGitHub({})).toBeNull();
    expect(shipGitHub({ SHIP_TOKEN: "  " })).toBeNull();
    expect(shipGitHub({ SHIP_TOKEN: "x" })!.repo).toBe("MyAvenCEO/maiacity");
    // a stand-in GitHub only where SHIP_API names one: the token goes to api.github.com otherwise
    const asked: string[] = [];
    const seen = (async (u: string) => (asked.push(`${u}`), new Response(JSON.stringify({ number: 1 }), { status: 200 }))) as unknown as typeof fetch;
    await gitHub({ token: "x", repo: REPO, fetch: seen }).pull(1);
    expect(asked[0]).toBe(`https://api.github.com/repos/${REPO}/pulls/1`);
    expect(() => gitHub({ token: "x", repo: "not a repo" })).toThrow();
    // GitHub's errors name the request, never a header
    const broken = gitHub({ token: TOKEN, repo: REPO, api: "https://api.github.test", fetch: (async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 })) as unknown as typeof fetch });
    const e = (await broken.pull(1).catch((x) => x)) as Error;
    expect(e.message).toBe("GitHub answered 401 to GET /pulls/1: Bad credentials");
    // every answer the tests read was searched for it (call), and everything play logged
    for (const path of ["/api/intents", "/api/intents?stage=ship", "/api/me"]) expect(JSON.stringify((await call("ada", "GET", path)).data)).not.toContain(TOKEN);
    expect(said.length).toBeGreaterThan(0);
    expect(said.join("\n")).not.toContain(TOKEN);
    expect(said.join("\n")).toContain("ship: intent");
    expect(tailOf("2026-11-06T12:00:00.1Z a\n\x1b[31mb\x1b[0m\n\n", 5)).toBe("a\nb");
  });
});
