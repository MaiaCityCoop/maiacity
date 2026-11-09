// Main merged into open intent pull requests by play (src/mainmerge.ts, play/SPEC.md §4.12 "Accept ships it"; intent
// f28822d9-6ef1-49d9-aa2c-e52f1897ee89) against a real Postgres (TEST_DATABASE_URL) and a fake GitHub
// (./fixtures/github.ts). Ship's watcher merges main into every open intent pull request that is mergeable and behind
// (GitHub's update-branch, expected_head_sha the head it read), once per head and main's head, never one in Ship or
// done, never a merge; a builder's push wins (422); the new head is working until its checks are recorded on it, then
// waiting; a conflict is failed with its files, the status 'Merges with main' failure on its head, success once it
// merges again.
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { seedSkills } from "../import/skills";
import { createHuman } from "../src/auth";
import { mainMergeState, mergeMain } from "../src/mainmerge";
import { type Db } from "../src/kit/pg";
import { watchPulls, watchTick } from "../src/watcher";
import { type Pull, MERGES_CONTEXT } from "../src/github";
import { fakeGitHub, green, REPO, sha } from "./fixtures/github";
import { type Api, appOn, cookieFor, type Fresh, freshDb, request, suite, tool as mcpTool } from "./kit";

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
  let gh: ReturnType<typeof fakeGitHub>;
  let cookie = "";
  let token = "";

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    await seedSkills(db);
    gh = fakeGitHub();
    api = appOn(db, { github: gh.gh });
    const h = await createHuman(db, "ada");
    cookie = cookieFor(h.id);
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [h.id]);
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
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(updates(from)).toEqual([]);
    // main moves: the two behind it are updated, each once, from the head read
    const behindToo = await codeAtProposal();
    mainMoves();
    // one opened after main moved is up to date
    const fresh = await codeAtProposal();
    from = gh.calls.length;
    await watchTick(db, gh.gh, Date.now(), null, state);
    const made = updates(from);
    expect(made.map((c) => c.path).sort()).toEqual([`/pulls/${atProposal.pr}/update-branch`, `/pulls/${inBuild.pr}/update-branch`, `/pulls/${behindToo.pr}/update-branch`].sort());
    for (const c of made) {
      const which = [atProposal, inBuild, behindToo].find((x) => c.path === `/pulls/${x.pr}/update-branch`)!;
      expect(c.body).toEqual({ expected_head_sha: which.head });
    }
    for (const pr of [...Object.values(others), closed.pr, merged.pr, elsewhere.pr, nameless, fresh.pr]) expect(made.some((c) => c.path === `/pulls/${pr}/update-branch`)).toBe(false);
    // looked at again, main where it was: nothing more
    from = gh.calls.length;
    await watchTick(db, gh.gh, Date.now(), null, state);
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(updates(from)).toEqual([]);
    // never a merge, never the status 'Intent accepted'
    expect(merges(0)).toEqual([]);
    expect(gh.calls.filter((c) => c.method === "POST" && c.path.startsWith("/statuses/") && c.body.context !== MERGES_CONTEXT)).toEqual([]);
    // main merged in: its head is GitHub's merge commit, main's head in it
    const pr = gh.pulls.get(atProposal.pr)!;
    expect(pr.head.sha).not.toBe(atProposal.head);
    expect(gh.graph.get(pr.head.sha)!.parents).toEqual([atProposal.head, gh.main.head]);
  });

  test("a builder's push wins: update-branch refused because the head moved (422) changes nothing on the intent, and the next tick reads the new head before anything else is done", async () => {
    const state = mainMergeState();
    const c = await codeAtProposal();
    await watchPulls(db, gh.gh);
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
    expect(after.pr_seen.main_merged).toBeUndefined();
    // the next tick: the pull request read first, then main merged into the head it read
    from = gh.calls.length;
    await watchTick(db, gh.gh, Date.now(), null, state);
    const mine = gh.calls.slice(from).filter((x) => x.path.startsWith(`/pulls/${c.pr}`));
    expect(mine[0]).toMatchObject({ method: "GET", path: `/pulls/${c.pr}` });
    expect(updates(from).map((x) => x.body)).toEqual([{ expected_head_sha: pushed }]);
    // any other refusal of GitHub's is not taken as done: it is tried again
    const d = await codeAtProposal();
    await watchPulls(db, gh.gh);
    mainMoves();
    gh.refuseUpdate({ status: 500, message: "GitHub is down" });
    from = gh.calls.length;
    await watchTick(db, gh.gh, Date.now(), null, state);
    gh.refuseUpdate(null);
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(updates(from).filter((x) => x.path === `/pulls/${d.pr}/update-branch`).length).toBe(2);
  });

  test("working, then waiting: after the update the intent is working, main merged in, until every must check is recorded on the new head, then waiting", async () => {
    const state = mainMergeState();
    const c = await codeAtProposal();
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect((await intent(c.id)).sub).toEqual({ state: "waiting", tag: "Accept and ship", why: "Accept and ship" });
    mainMoves();
    await watchTick(db, gh.gh, Date.now(), null, state);
    // GitHub has made the new head, read on the same tick's next look
    const head = gh.pulls.get(c.pr)!.head.sha;
    expect(head).not.toBe(c.head);
    // between the update and the read of the new head: working, never waiting (Accept takes no head play is moving)
    const { rows: [row] } = await db.query<any>(`SELECT pr_seen FROM play.intents WHERE id = $1`, [c.id]);
    expect(row.pr_seen.main_merged).toMatchObject({ from: c.head, main: gh.main.head });
    let s = (await intent(c.id)).sub;
    expect(s.state).toBe("working");
    expect(s.why).toContain("main merged in: its checks run on");
    const refused = await call("POST", `/api/intents/${c.id}/accept`);
    expect(refused.status).toBe(409);
    // the new head read: working, its checks run on it
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
    await watchTick(db, gh.gh, Date.now(), null, state);
    s = (await intent(c.id)).sub;
    expect(s.state).toBe("working");
    expect(s.why).toContain(`main merged in: its checks run on ${head.slice(0, 7)}`);
    expect((await intent(c.id)).stage).toBe("proposal");
    // the box's run records every must on the new head: waiting
    expect((await tool("check_intent", { intent: c.id, pr: c.pr, results: [{ check: "c1", pass: true, evidence: "0 fail", commit: head }] })).stage).toBe("proposal");
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect((await intent(c.id)).sub).toEqual({ state: "waiting", tag: "Accept and ship", why: "Accept and ship" });
    // and a builder's push after it is the head moved, as before (not main merged in)
    const pushed = gh.commit(sha(++commits), "the builder's push", [head], false);
    gh.pulls.get(c.pr)!.head.sha = pushed;
    gh.checks.set(pushed, [green("play / API and site"), green("website / build")]);
    await watchTick(db, gh.gh, Date.now(), null, state);
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
    await watchTick(db, gh.gh, Date.now(), null, state);
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
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(mergesStatuses(from)).toEqual([]);
    expect(updates(from)).toEqual([]);
    // its builder resolves it (main merged by hand, pushed): success on the new head, and nothing more to update
    const resolved = gh.commit(sha(++commits), "Merge main, conflicts resolved", [c.head, gh.main.head], false);
    Object.assign(gh.pulls.get(c.pr)!, { mergeable: true, head: { sha: resolved, ref: `claude/${c.pr}` } });
    gh.checks.set(resolved, [green("play / API and site"), green("website / build")]);
    from = gh.calls.length;
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(mergesStatuses(from).map((x) => [x.path, x.body.state])).toEqual([[`/statuses/${resolved}`, "success"]]);
    expect(updates(from)).toEqual([]);
    expect((await intent(c.id)).sub.state).toBe("working");
    // never a merge
    expect(merges(0)).toEqual([]);
  });
});
