// Play wakes each builder the moment it must act (play/SPEC.md §4.12; intent 40397205-b50d-4824-af33-df0bb5cc43e3): the
// status 'Intent' on its pull request's head (src/github.ts wake) as checks are recorded, a spec approved, an intent
// stepped back, Ship red or Accepted; never failing what play was doing; and a draft at Specify taken as its pull request.
// Against a real Postgres and a fake GitHub (./fixtures/github.ts).
import { afterAll, beforeAll, expect, test } from "bun:test";
import type { BlobStore } from "../src/blobs";
import { seedSkills } from "../import/skills";
import { type Db } from "../src/kit/pg";
import { watchShips, watchTick } from "../src/watcher";
import { mainMergeState } from "../src/mainmerge";
import { INTENT_CONTEXT, postAgain, type Pull } from "../src/github";
import { fakeGitHub, green, job, REPO, run, sha } from "./fixtures/github";
import { agentToken, type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";

const SPEC = {
  goal: "A change of play's code is shipped.",
  nothing_to_reduce: "A test fixture: nothing to reduce.",
  scope: "play/api/src: something small.",
  checks: [
    { check: "Its tests pass", how: "test", by: "bun test", run: "cd play/api && bun test" },
    { check: "It answers in 2 s", how: "measure", by: "at most 2 s", run: "echo 1.2" },
    { check: "It looks right", how: "look", by: "the board", must: false },
  ],
};

suite("Intent status", () => {
  let f: Fresh, db: Db, api: Api, store: BlobStore;
  let gh: ReturnType<typeof fakeGitHub>;
  let cookie = "";
  let token = "";

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    await seedSkills(db);
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
  let prs = 700;
  let commits = 7000;
  const openPull = (pr: number, head: string, title: string, more: Partial<Pull> = {}) => {
    gh.pulls.set(pr, {
      number: pr, state: "open", merged: false, merge_commit_sha: null, mergeable: true, base: { ref: "main" }, head: { sha: head, ref: `intent/${pr}` },
      html_url: `https://github.test/${REPO}/pull/${pr}`, title, ...more,
    });
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
  };
  const specified = async (title: string) => {
    const i = await tool("add_intent", { title, kind: "improve" });
    expect((await tool("specify_intent", { intent: i.id, ...SPEC })).stage).toBe("specify");
    return i.id as string;
  };
  const approve = async (id: string) => (await call("POST", `/api/intents/${id}/approve`)).data;
  /** an intent in Build, its pull request open on GitHub (not named to play yet) */
  const inBuild = async (title: string) => {
    const id = await specified(title);
    expect((await approve(id)).stage).toBe("build");
    const pr = ++prs;
    const head = sha(++commits);
    openPull(pr, head, title, { draft: true });
    return { id, pr, head };
  };
  /** the 'Intent' statuses posted since `from`: [head, state, description] */
  const posted = (from: number) =>
    gh.calls.slice(from).filter((c) => c.method === "POST" && c.path.startsWith("/statuses/") && c.body.context === INTENT_CONTEXT).map((c) => [c.path.split("/")[2], c.body.state, c.body.description]);
  const tried = (from: number) => gh.calls.slice(from).filter((c) => c.method === "POST" && c.path.startsWith("/statuses/") && c.body.context === INTENT_CONTEXT).length;
  const intent = async (id: string) => (await call("GET", `/api/intents/${id}`)).data;

  test("Intent status: checks: a failed must posts failure naming it with its first line of evidence (≤140) on the head, once per line; every must passing posts at Proposal", async () => {
    const c = await inBuild("Checks wake it");
    let from = gh.calls.length;
    const long = `${"x".repeat(200)}\nsecond line never shown`;
    const failed = await tool("check_intent", {
      intent: c.id, pr: c.pr,
      results: [{ check: "c1", pass: false, evidence: "bun test: 2 fail\n(the rest)", commit: c.head }, { check: "c2", pass: false, evidence: long, commit: c.head }],
    });
    expect(failed.stage).toBe("build");
    const [[head, state, line]] = posted(from);
    expect([head, state]).toEqual([c.head, "failure"]);
    expect(line.startsWith("c1 failed: bun test: 2 fail; c2 failed: xxx")).toBe(true);
    expect(line.length).toBeLessThanOrEqual(140);
    expect(line).not.toContain("second line");
    expect(posted(from)).toHaveLength(1);
    // the same line on the same head: once
    from = gh.calls.length;
    await tool("check_intent", { intent: c.id, results: [{ check: "c1", pass: false, evidence: "bun test: 2 fail\n(again)", commit: c.head }] });
    expect(posted(from)).toEqual([]);
    // every must passed: at Proposal, said once
    from = gh.calls.length;
    const at = await tool("check_intent", { intent: c.id, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: c.head }, { check: "c2", pass: true, evidence: "1.2 s", commit: c.head }] });
    expect(at.stage).toBe("proposal");
    expect(posted(from)).toEqual([[c.head, "success", "at Proposal: waits for Accept"]]);
    expect(gh.calls.slice(from).find((x) => x.body?.context === INTENT_CONTEXT)!.body.target_url).toBe(`https://play.maia.city/intents/#${c.id}`);
  });

  test("Intent status: approval: approval posts pending 'approved: build it' on the head of its draft; a step back posts failure 'stepped back to <stage>: <reason>'", async () => {
    const id = await specified("Approval wakes it");
    const pr = ++prs;
    const head = sha(++commits);
    openPull(pr, head, "Approval wakes it", { draft: true });
    await db.query(`UPDATE play.intents SET pull_request = $2 WHERE id = $1`, [id, pr]);
    let from = gh.calls.length;
    expect((await approve(id)).stage).toBe("build");
    expect(posted(from)).toEqual([[head, "pending", "approved: build it"]]);
    from = gh.calls.length;
    expect((await tool("step_back_intent", { intent: id, reason: "its scope misses the board" })).stage).toBe("specify");
    expect(posted(from)).toEqual([[head, "failure", "stepped back to specify: its scope misses the board"]]);
  });

  test("Intent status: ship: a red Ship step posts failure '<step> red: <report's first line>' on the shipped head; Accepted posts success 'Accepted: live'", async () => {
    await fx.clearShips(db);
    // red before the merge: GitHub refuses it
    const red = await inBuild("Ship goes red");
    await tool("check_intent", { intent: red.id, pr: red.pr, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: red.head }, { check: "c2", pass: true, evidence: "1 s", commit: red.head }] });
    gh.pulls.get(red.pr)!.draft = false;
    gh.merges.set(red.pr, sha(++commits));
    gh.refuseMerge("Base branch was modified");
    let from = gh.calls.length;
    await call("POST", `/api/intents/${red.id}/accept`);
    gh.refuseMerge(null);
    expect((await intent(red.id)).stage).toBe("proposal");
    const [[head, state, line]] = posted(from);
    expect([head, state]).toEqual([red.head, "failure"]);
    expect(line).toStartWith(`Ready to merge red: GitHub did not merge #${red.pr}`);

    // all green, live: Accepted
    await fx.clearShips(db);
    const ok = await inBuild("Ship goes live");
    await tool("check_intent", { intent: ok.id, pr: ok.pr, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: ok.head }, { check: "c2", pass: true, evidence: "1 s", commit: ok.head }] });
    gh.pulls.get(ok.pr)!.draft = false;
    const merge = sha(++commits);
    gh.merges.set(ok.pr, merge);
    expect((await call("POST", `/api/intents/${ok.id}/accept`)).data.stage).toBe("ship");
    gh.runs["main.yml"].push(run(9001, merge, { status: "completed", conclusion: "success" }));
    gh.runs["release.yml"].push(run(9002, merge, { display_title: `release ${merge}`, event: "workflow_run", status: "completed", conclusion: "success" }));
    gh.runs["production.yml"].push(run(9003, merge, { event: "workflow_dispatch", status: "completed", conclusion: "success" }));
    gh.jobs.set(9003, ["The image", "The backup", "The server", "The website"].map((n, k) => job(9030 + k, n, "completed", "success")));
    from = gh.calls.length;
    await watchShips(db, gh.gh, store, Date.now(), merge);
    expect((await intent(ok.id)).stage).toBe("accepted");
    expect(posted(from)).toEqual([[ok.head, "success", "Accepted: live"]]);
  });

  test("Intent status: GitHub error: with statuses refused, the record, the approval, the step back and the ship complete, and each status is posted on the next tick", async () => {
    await fx.clearShips(db);
    const rec = await inBuild("Recorded while GitHub is down");
    const app_ = await specified("Approved while GitHub is down");
    const pr = ++prs;
    const head = sha(++commits);
    openPull(pr, head, "Approved while GitHub is down", { draft: true });
    await db.query(`UPDATE play.intents SET pull_request = $2 WHERE id = $1`, [app_, pr]);
    const back = await inBuild("Stepped back while GitHub is down");
    await db.query(`UPDATE play.intents SET pull_request = $2 WHERE id = $1`, [back.id, back.pr]);
    const shipped = await inBuild("Shipped while GitHub is down");
    await tool("check_intent", { intent: shipped.id, pr: shipped.pr, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: shipped.head }, { check: "c2", pass: true, evidence: "1 s", commit: shipped.head }] });
    gh.pulls.get(shipped.pr)!.draft = false;
    gh.merges.set(shipped.pr, sha(++commits));

    gh.refuseStatus("GitHub is down");
    const from = gh.calls.length;
    expect((await tool("check_intent", { intent: rec.id, pr: rec.pr, results: [{ check: "c1", pass: false, evidence: "1 fail", commit: rec.head }] })).stage).toBe("build");
    expect((await intent(rec.id)).results.c1.pass).toBe(false);
    expect((await approve(app_)).stage).toBe("build");
    expect((await tool("step_back_intent", { intent: back.id, reason: "GitHub down, still stepped back" })).stage).toBe("specify");
    // Ship: its 'Intent accepted' refused too, so it is red, back at Proposal, and says so
    await call("POST", `/api/intents/${shipped.id}/accept`);
    expect((await intent(shipped.id)).stage).toBe("proposal");
    expect(tried(from)).toBe(4);
    expect(posted(from).length).toBe(4);

    gh.refuseStatus(null);
    const next = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, mainMergeState());
    const after = posted(next);
    expect(after).toContainEqual([rec.head, "failure", "c1 failed: 1 fail"]);
    expect(after).toContainEqual([head, "pending", "approved: build it"]);
    expect(after).toContainEqual([back.head, "failure", "stepped back to specify: GitHub down, still stepped back"]);
    expect(after.find(([h]) => h === shipped.head)?.[2]).toStartWith("Ready to merge red: GitHub took no 'Intent accepted'");
    // posted: the tick after posts nothing again
    const later = gh.calls.length;
    await postAgain(db, gh.gh);
    expect(posted(later)).toEqual([]);
  });

  test("Intent status: draft at Specify: Intent named takes a draft whose intent is at Specify and refuses it marked ready; play takes that draft as the intent's pull request, so approval posts on it", async () => {
    const { judge } = await import("../../avenbox/pr-intent");
    const id = await specified("A draft while the spec waits");
    const pr = ++prs;
    const head = sha(++commits);
    openPull(pr, head, `[${id.slice(0, 8)}] A draft while the spec waits`, { draft: true, body: `Its first commit.\n\nIntent: ${id}` });
    // Intent named, against GitHub and play stood in for
    const ghSrv = Bun.serve({
      port: 0, hostname: "127.0.0.1",
      fetch(req) {
        const m = /^\/repos\/maia\/city\/pulls\/(\d+)(\/commits)?$/.exec(new URL(req.url).pathname);
        const p = m && gh.pulls.get(Number(m[1]));
        if (!p) return new Response("not found", { status: 404 });
        if (m![2]) return Response.json([{ commit: { message: `first\n\nIntent: ${id}` } }]);
        return Response.json({ number: p.number, title: p.title, body: p.body, state: p.state, draft: !!p.draft });
      },
    });
    const playSrv = Bun.serve({
      port: 0, hostname: "127.0.0.1",
      async fetch(req) {
        const { params } = (await req.json()) as any;
        const it = await intent(params.arguments.intent);
        return Response.json({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: JSON.stringify({ id: it.id, stage: it.stage, pull_request: it.pull_request }) }] } });
      },
    });
    try {
      const env = { github: `${ghSrv.url}`, repo: "maia/city", play: `${playSrv.url}api/mcp` };
      const draft = await judge(pr, env);
      expect(draft).toMatchObject({ ok: true, intent: id });
      expect(draft.why).toContain("a draft while the spec");
      gh.pulls.get(pr)!.draft = false;
      const ready = await judge(pr, env);
      expect(ready.ok).toBe(false);
      expect(ready.why).toContain("at the specify stage");
      gh.pulls.get(pr)!.draft = true;
    } finally {
      ghSrv.stop(true);
      playSrv.stop(true);
    }
    // a ready pull request naming another intent at Specify is not taken
    const other = await specified("A ready one at Specify");
    const pr2 = ++prs;
    openPull(pr2, sha(++commits), "ready", { draft: false, body: `Intent: ${other}` });
    // play's tick takes the draft as its pull request, read
    await watchTick(db, gh.gh, store, Date.now(), null, mainMergeState());
    const it = await intent(id);
    expect(it).toMatchObject({ stage: "specify", pull_request: pr });
    expect(it.pr_seen).toMatchObject({ pr, head, draft: true });
    expect((await intent(other)).pull_request).toBeNull();
    const from = gh.calls.length;
    expect((await approve(id)).stage).toBe("build");
    expect(posted(from)).toEqual([[head, "pending", "approved: build it"]]);
  });
});
