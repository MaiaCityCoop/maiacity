// Main merged into open intent pull requests by play (src/mainmerge.ts, play/SPEC.md §4.12; intent
// f28822d9-6ef1-49d9-aa2c-e52f1897ee89) against a real Postgres and a fake GitHub (./fixtures/github.ts).
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import type { BlobStore } from "../src/blobs";
import { seedSkills } from "../import/skills";
import { mainMergeState, mergeMain } from "../src/mainmerge";
import { type Db } from "../src/kit/pg";
import { watchPulls, watchTick } from "../src/watcher";
import { type Pull, INTENT_CONTEXT, MERGES_CONTEXT } from "../src/github";
import { githubSays } from "../src/substate";
import { fakeGitHub, green, REPO, sha } from "./fixtures/github";
import { type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool } from "./kit";

const SPEC = {
  goal: "Something of play's is made.",
  nothing_to_reduce: "A test fixture: nothing to reduce.",
  scope: "play/api/src: something small.",
  checks: [
    { check: "Its tests pass", how: "test", by: "bun test", run: "cd play/api && bun test" },
    { check: "It looks right", how: "look", by: "the board", must: false },
  ],
};

suite("main merged into open intent pull requests", () => {
  let f: Fresh, db: Db;
  let api: Api;
  let store: BlobStore;
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
    const made = (await call("POST", "/api/tokens", { name: "agent" })).data;
    token = made.token;
    await call("POST", `/api/tokens/${made.id}/avenbox`, { avenbox: true });
  });

  afterAll(async () => {
    await f?.drop();
  });

  // each test on its own: every intent of an earlier one is archived, and play's own pull requests forgotten
  beforeEach(async () => {
    await db.query(`UPDATE play.intents SET stage = 'archived' WHERE stage NOT IN ('accepted', 'archived')`);
    gh.pulls.clear();
    gh.refuseUpdate(null);
  });

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);
  const intent = async (id: string) => (await call("GET", `/api/intents/${id}`)).data;
  let k = 0;
  const built = async () => {
    const i = (await tool("add_intent", { title: `Intent ${++k}`, kind: "improve" })) as { id: string; title: string };
    expect((await tool("specify_intent", { intent: i.id, ...SPEC })).stage).toBe("specify");
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    return i;
  };
  let prs = 500;
  let commits = 5000;
  /** a branch off main's head as it is now, changing `files` */
  const branch = (files: string[] = []) => gh.commit(sha(++commits), "work on its branch", [gh.main.head], false, files);
  /** main moved on: a commit on main changing `files` */
  const mainMoves = (files: string[] = ["play/README.md"]) => gh.commit(sha(++commits), "another intent merged", [gh.main.head], true, files);
  const openPull = (pr: number, head: string, title: string, more: Partial<Pull> = {}) => {
    gh.pulls.set(pr, {
      number: pr, state: "open", merged: false, merge_commit_sha: null, mergeable: true, base: { ref: "main" }, head: { sha: head, ref: `claude/${pr}` },
      html_url: `https://github.test/${REPO}/pull/${pr}`, title, ...more,
    });
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
  };
  /** an intent at Proposal, its checks recorded by the box's run on its pull request's head, a branch off main */
  const codeAtProposal = async (more: Partial<Pull> = {}, files: string[] = []) => {
    const i = await built();
    const pr = ++prs;
    const head = branch(files);
    expect((await tool("check_intent", { intent: i.id, pr, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: head }] })).stage).toBe("proposal");
    openPull(pr, head, i.title, more);
    gh.merges.set(pr, sha(++commits));
    return { ...i, pr, head };
  };
  /** an intent in Build naming its pull request (a draft while it is built) */
  const codeInBuild = async (more: Partial<Pull> = {}, files: string[] = []) => {
    const i = await built();
    const pr = ++prs;
    const head = branch(files);
    await db.query(`UPDATE play.intents SET pull_request = $2 WHERE id = $1`, [i.id, pr]);
    openPull(pr, head, i.title, { draft: true, ...more });
    return { ...i, pr, head };
  };
  const updates = (from: number) => gh.calls.slice(from).filter((c) => c.method === "PUT" && c.path.includes("/update-branch"));
  const merges = (from: number) => gh.calls.slice(from).filter((c) => c.method === "PUT" && c.path.endsWith("/merge"));
  const mergesStatuses = (from: number) => gh.calls.slice(from).filter((c) => c.method === "POST" && c.path.startsWith("/statuses/") && c.body.context === MERGES_CONTEXT);

  test("main moved: update-branch once, with expected_head_sha, for each open intent pull request in Build or at Proposal that is mergeable and behind; none for one in Ship, Accepted or Archived, up to date, closed, merged, into another branch or naming no intent; never a merge", async () => {
    const state = mainMergeState();
    const atProposal = await codeAtProposal();
    const inBuild = await codeInBuild();
    const others: Record<string, number> = {};
    for (const stage of ["ship", "accepted", "archived"]) {
      const c = await codeAtProposal();
      await db.query(`UPDATE play.intents SET stage = $2 WHERE id = $1`, [c.id, stage]);
      others[stage] = c.pr;
    }
    const closed = await codeAtProposal({ state: "closed" });
    const merged = await codeAtProposal({ state: "closed", merged: true });
    const elsewhere = await codeAtProposal({ base: { ref: "release" } });
    const nameless = ++prs;
    openPull(nameless, branch(), "names no intent");
    // a first look: nothing is behind main yet
    let from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect(updates(from)).toEqual([]);
    // main moves: the two behind it are updated, each once, from the head read
    const behindToo = await codeAtProposal();
    mainMoves();
    // one opened after main moved is up to date
    const fresh = await codeAtProposal();
    from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    const made = updates(from);
    expect(made.map((c) => c.path).sort()).toEqual([`/pulls/${atProposal.pr}/update-branch`, `/pulls/${inBuild.pr}/update-branch`, `/pulls/${behindToo.pr}/update-branch`].sort());
    for (const c of made) {
      const which = [atProposal, inBuild, behindToo].find((x) => c.path === `/pulls/${x.pr}/update-branch`)!;
      expect(c.body).toEqual({ expected_head_sha: which.head });
    }
    for (const pr of [...Object.values(others), closed.pr, merged.pr, elsewhere.pr, nameless, fresh.pr]) expect(made.some((c) => c.path === `/pulls/${pr}/update-branch`)).toBe(false);
    // looked at again, main where it was: nothing more
    from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect(updates(from)).toEqual([]);
    expect(merges(0)).toEqual([]);
    expect(gh.calls.filter((c) => c.method === "POST" && c.path.startsWith("/statuses/") && c.body.context !== MERGES_CONTEXT && c.body.context !== INTENT_CONTEXT)).toEqual([]);
    // main merged in: its head is GitHub's merge commit, main's head in it
    const pr = gh.pulls.get(atProposal.pr)!;
    expect(pr.head.sha).not.toBe(atProposal.head);
    expect(gh.graph.get(pr.head.sha)!.parents).toEqual([atProposal.head, gh.main.head]);
  });

  test("a builder's push wins: update-branch refused because the head moved (422) changes nothing on the intent, and the next tick reads the new head before anything else is done", async () => {
    const state = mainMergeState();
    const c = await codeAtProposal();
    await watchPulls(db, gh.gh, store);
    mainMoves();
    // the builder pushes after the watcher read the head and before it updates
    const pushed = gh.commit(sha(++commits), "the builder's push", [c.head], false);
    gh.pulls.get(c.pr)!.head.sha = pushed;
    const { rows: [before] } = await db.query<any>(`SELECT stage, pr_seen, results, ship FROM play.intents WHERE id = $1`, [c.id]);
    let from = gh.calls.length;
    await mergeMain(db, gh.gh, state);
    const refused = updates(from);
    expect(refused.map((x) => x.body)).toEqual([{ expected_head_sha: c.head }]);
    const { rows: [after] } = await db.query<any>(`SELECT stage, pr_seen, results, ship FROM play.intents WHERE id = $1`, [c.id]);
    expect(after).toEqual(before);
    expect(after.pr_seen.merged_in).toBeUndefined();
    // the next tick: the pull request read first, then main merged into the head it read
    from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    const mine = gh.calls.slice(from).filter((x) => x.path.startsWith(`/pulls/${c.pr}`));
    expect(mine[0]).toMatchObject({ method: "GET", path: `/pulls/${c.pr}` });
    expect(updates(from).map((x) => x.body)).toEqual([{ expected_head_sha: pushed }]);
    // any other refusal of GitHub's is not taken as done: it is tried again
    const d = await codeAtProposal();
    await watchPulls(db, gh.gh, store);
    mainMoves();
    gh.refuseUpdate({ status: 500, message: "GitHub is down" });
    from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    gh.refuseUpdate(null);
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect(updates(from).filter((x) => x.path === `/pulls/${d.pr}/update-branch`).length).toBe(2);
  });

  test("working, then waiting: after the update the intent is working while GitHub makes the new head and its required checks run there, then waiting, its results kept across main's merge; the box's red on the new head is failed; a builder's push after it carries nothing", async () => {
    const state = mainMergeState();
    const c = await codeAtProposal();
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect((await intent(c.id)).sub).toEqual({ state: "waiting", tag: "Accept and ship", why: "Accept and ship" });
    mainMoves();
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    // GitHub has made the new head, not yet read by the watcher
    const head = gh.pulls.get(c.pr)!.head.sha;
    expect(head).not.toBe(c.head);
    // between the update and the read of the new head: working, never waiting (Accept takes no head play is moving)
    const { rows: [row] } = await db.query<any>(`SELECT pr_seen FROM play.intents WHERE id = $1`, [c.id]);
    expect(row.pr_seen.merged_in).toEqual([{ from: c.head, main: gh.main.head, at: expect.any(String) }]);
    let s = (await intent(c.id)).sub;
    expect(s).toMatchObject({ state: "working", tag: "main merged in", why: `main merged in: GitHub makes #${c.pr}'s new head` });
    const refused = await call("POST", `/api/intents/${c.id}/accept`);
    expect(refused.status).toBe(409);
    // the new head read, its required checks not run yet: working, c1 kept once they are green
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    const { rows: [read] } = await db.query<any>(`SELECT pr_seen FROM play.intents WHERE id = $1`, [c.id]);
    expect(read.pr_seen.merged_in).toEqual([{ from: c.head, main: gh.main.head, at: expect.any(String), to: head }]);
    s = (await intent(c.id)).sub;
    expect(s.state).toBe("working");
    expect(s.why).toContain(`c1 passed on ${c.head.slice(0, 7)}, kept across main's merge once the required checks are green on ${head.slice(0, 7)}`);
    // its required checks green: waiting, c1 kept
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    const kept = { state: "waiting", tag: "Accept and ship", why: `Accept and ship: c1 passed on ${c.head.slice(0, 7)}, kept across main's merge` };
    expect((await intent(c.id)).sub).toEqual(kept);
    expect((await intent(c.id)).stage).toBe("proposal");
    // the box's run records every must on the new head: waiting, nothing kept any more
    expect((await tool("check_intent", { intent: c.id, pr: c.pr, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: head }] })).stage).toBe("proposal");
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect((await intent(c.id)).sub).toEqual({ state: "waiting", tag: "Accept and ship", why: "Accept and ship" });
    // and a builder's push after it is the head moved, as before (not main merged in)
    const pushed = gh.commit(sha(++commits), "the builder's push", [head], false);
    gh.pulls.get(c.pr)!.head.sha = pushed;
    gh.checks.set(pushed, [green("play / API and site"), green("website / build")]);
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect((await intent(c.id)).sub.why).toContain("moved past the checked commit");
  });

  test("a conflict is failed: mergeable false gives failed, conflicts with main and the files both sides changed; Merges with main posted as failure on the head with that line, as success once it merges again; no update-branch is tried", async () => {
    const state = mainMergeState();
    const c = await codeAtProposal({}, ["play/api/src/ship.ts", "play/SPEC.md", "play/api/src/new.ts"]);
    const b = await codeInBuild({}, ["CLAUDE.md"]);
    gh.pullFiles.set(c.pr, ["play/api/src/ship.ts", "play/SPEC.md", "play/api/src/new.ts"]);
    gh.pullFiles.set(b.pr, ["CLAUDE.md"]);
    mainMoves(["play/SPEC.md", "play/api/src/ship.ts", "website/README.md"]);
    mainMoves(["CLAUDE.md"]);
    gh.pulls.get(c.pr)!.mergeable = false;
    gh.pulls.get(b.pr)!.mergeable = false;
    let from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect(updates(from)).toEqual([]);
    const line = "conflicts with main: play/SPEC.md, play/api/src/ship.ts";
    expect((await intent(c.id)).sub).toEqual({ state: "failed", tag: "conflicts with main", why: line });
    // in Build too: its builder resolves it
    expect((await intent(b.id)).sub).toEqual({ state: "failed", tag: "conflicts with main", why: "conflicts with main: CLAUDE.md" });
    const posted = mergesStatuses(from);
    expect(posted.map((x) => [x.path, x.body.state, x.body.description]).sort()).toEqual(
      [[`/statuses/${c.head}`, "failure", line], [`/statuses/${b.head}`, "failure", "conflicts with main: CLAUDE.md"]].sort(),
    );
    expect(posted.find((x) => x.path === `/statuses/${c.head}`)!.body.target_url).toBe(`https://play.maia.city/intents/#${c.id}`);
    // Accept refuses it with that line
    const refused = await call("POST", `/api/intents/${c.id}/accept`);
    expect(refused.status).toBe(409);
    expect(refused.data.error).toContain("conflicts with main");
    // read again, nothing changed: posted once
    from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect(mergesStatuses(from)).toEqual([]);
    expect(updates(from)).toEqual([]);
    // its builder resolves it (main merged by hand, pushed): success on the new head, and nothing more to update
    const resolved = gh.commit(sha(++commits), "Merge main, conflicts resolved", [c.head, gh.main.head], false);
    Object.assign(gh.pulls.get(c.pr)!, { mergeable: true, head: { sha: resolved, ref: `claude/${c.pr}` } });
    gh.checks.set(resolved, [green("play / API and site"), green("website / build")]);
    from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    expect(mergesStatuses(from).map((x) => [x.path, x.body.state])).toEqual([[`/statuses/${resolved}`, "success"]]);
    expect(updates(from)).toEqual([]);
    expect((await intent(c.id)).sub.state).toBe("working");
    expect(merges(0)).toEqual([]);
  });

  // ---- GitHub's limit (intent b3f83e0b): conditional reads, the limit obeyed and shown, a budget per tick

  test("conditional reads: an unchanged pull request and its check runs are asked with their ETags, answered 304, kept fresh; a changed one read as before", async () => {
    const c = await codeAtProposal();
    const t0 = Date.now();
    await watchPulls(db, gh.gh, store, t0);
    const first = (await db.query(`SELECT pr_seen FROM play.intents WHERE id = $1`, [c.id])).rows[0].pr_seen;
    expect(first.etags).toMatchObject({ pull: expect.any(String), head: c.head, checks: expect.any(String) });
    // read again, nothing changed: both asked with the ETags kept, both 304, pr_seen fresh and otherwise as it was
    const from = gh.calls.length;
    await watchPulls(db, gh.gh, store, t0 + 30_000);
    const again = gh.calls.slice(from).filter((x) => x.path === `/pulls/${c.pr}` || x.path.startsWith(`/commits/${c.head}/check-runs`));
    expect(again.map((x) => [x.etag, x.status])).toEqual([[first.etags.pull, 304], [first.etags.checks, 304]]);
    const kept = (await db.query(`SELECT pr_seen FROM play.intents WHERE id = $1`, [c.id])).rows[0].pr_seen;
    expect(kept.at).toBe(new Date(t0 + 30_000).toISOString());
    expect({ ...kept, at: first.at }).toEqual(first);
    // the pull request changed (GitHub works out it conflicts): read as before, its new ETag kept
    gh.pulls.get(c.pr)!.mergeable = false;
    const changed = gh.calls.length;
    await watchPulls(db, gh.gh, store, t0 + 60_000);
    expect(gh.calls.slice(changed).find((x) => x.path === `/pulls/${c.pr}`)!.status).toBe(200);
    const now = (await db.query(`SELECT pr_seen FROM play.intents WHERE id = $1`, [c.id])).rows[0].pr_seen;
    expect(now.mergeable).toBe(false);
    expect(now.etags.pull).not.toBe(first.etags.pull);
  });

  test("GitHub limit: a 403 with no calls left stops every call until its reset, the board saying when, the log once; a 429 with retry-after the same; a 401 names the token", async () => {
    const lim = fakeGitHub({ says: (x) => (githubSays.now = x) });
    const said: string[] = [];
    const warn = console.warn;
    console.warn = (...a: unknown[]) => (said.push(a.join(" ")), warn(...a));
    try {
      const c = await codeAtProposal();
      lim.pulls.set(c.pr, gh.pulls.get(c.pr)!);
      lim.checks.set(c.head, gh.checks.get(c.head)!);
      // ahead of the real clock, which the board reads its sub-state by (a fixed time passed breaks it on the day)
      const t0 = Math.ceil(Date.now() / 60_000) * 60_000 + 60 * 60_000;
      const at = (ms: number) => new Date(ms).toISOString().slice(11, 16);
      const reset = t0 + 40 * 60_000;
      lim.clock.at = t0;
      lim.answerAll({ status: 403, message: "API rate limit exceeded", headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": `${reset / 1000}` } });
      const state = mainMergeState();
      await watchTick(db, lim.gh, store, t0, null, state);
      expect(lim.calls.length).toBe(1);
      // until the reset: no call at all, look after look
      for (const m of [1, 10, 39]) {
        lim.clock.at = t0 + m * 60_000;
        await watchTick(db, lim.gh, store, lim.clock.at, null, state);
      }
      expect(lim.calls.length).toBe(1);
      expect((await intent(c.id)).sub).toEqual({ state: "working", tag: "GitHub's limit", why: `GitHub's limit: play reads again at ${at(reset)}` });
      expect(said.filter((l) => l.includes("GitHub's limit"))).toEqual([`ship: GitHub's limit: play reads again at ${at(reset)}`]);
      // the reset passed, GitHub answering: read again, the board as before
      lim.answerAll(null);
      lim.clock.at = reset + 1_000;
      await watchTick(db, lim.gh, store, lim.clock.at, null, state);
      expect(lim.calls.length).toBeGreaterThan(1);
      expect(lim.gh.says()).toBeNull();

      // a 429 with retry-after: none until it has passed
      await db.query(`UPDATE play.intents SET pr_seen = NULL WHERE id = $1`, [c.id]);
      const t1 = reset + 5 * 60_000;
      lim.clock.at = t1;
      lim.answerAll({ status: 429, message: "slow down", headers: { "retry-after": "120" } });
      const n = lim.calls.length;
      await watchTick(db, lim.gh, store, t1, null, state);
      lim.clock.at = t1 + 60_000;
      await watchTick(db, lim.gh, store, lim.clock.at, null, state);
      expect(lim.calls.length).toBe(n + 1);
      expect((await intent(c.id)).sub.why).toBe(`GitHub's limit: play reads again at ${at(t1 + 120_000)}`);

      // a refused token: named as such
      lim.clock.at = t1 + 3 * 60_000;
      lim.answerAll({ status: 401, message: "Bad credentials" });
      await watchTick(db, lim.gh, store, lim.clock.at, null, state);
      expect((await intent(c.id)).sub).toEqual({ state: "working", tag: "GitHub refuses the token", why: "GitHub refuses play's token (SHIP_TOKEN)" });
    } finally {
      console.warn = warn;
      githubSays.now = null;
    }
  });

  test("budget per tick: six open intent pull requests unchanged, a tick makes at most 7 calls GitHub counts", async () => {
    for (let k = 0; k < 6; k++) await codeAtProposal();
    const state = mainMergeState();
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    const from = gh.calls.length;
    await watchTick(db, gh.gh, store, Date.now(), null, state);
    const counted = gh.calls.slice(from).filter((x) => x.status !== 304);
    expect(counted.length).toBeLessThanOrEqual(7);
    expect(gh.calls.slice(from).filter((x) => x.status === 304).length).toBe(12);
  });
});
