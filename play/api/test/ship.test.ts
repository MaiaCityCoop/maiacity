// Accept ships it (src/ship.ts, play/SPEC.md §4.12) against a real Postgres (TEST_DATABASE_URL, as for ./api.test.ts) and
// a fake GitHub: GitHub's REST API answered here, behind the real client, so every request play makes (its path, its
// body, its Bearer) is seen. An admin's Accept on a code intent at Proposal posts 'Intent accepted' on its pull
// request's head and merges it at once, the intent in Ship; the ship watcher follows main's checks, the release and the
// deploy's jobs, each a step on the intent; all green, Accepted; a red one, back to Proposal with the report, from
// where Accept ships it again. SHIP_TOKEN is sent to GitHub only.
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
import { ACCEPTED_CONTEXT, gitHub, shipGitHub, startShipWatcher, tailOf, watchShips, type Job, type Pull, type Run } from "../src/ship";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const TOKEN = "github_pat_SHIPTOKEN_not_to_be_seen_0123456789";
const REPO = "MyAvenCEO/maiacity";
const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";
const sha = (n: number) => n.toString(16).padStart(40, "0");

type Call = { method: string; path: string; auth: string | null; body: any };

/** GitHub's REST API for one repository, as play reads and writes it; `calls` is every request it got */
function fakeGitHub() {
  const pulls = new Map<number, Pull>();
  const checks = new Map<string, any[]>();
  const runs: Record<string, Run[]> = { "main.yml": [], "release.yml": [], "production.yml": [] };
  const jobs = new Map<number, Job[]>();
  const logs = new Map<number, string>();
  const calls: Call[] = [];
  const merges = new Map<number, string>();
  let mergeRefused: string | null = null;
  const reply = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(`${input}`);
    const headers = new Headers(init?.headers);
    if (url.host === "logs.github.test") {
      calls.push({ method: "GET", path: url.pathname, auth: headers.get("authorization"), body: null });
      return new Response(logs.get(Number(url.pathname.slice(1))) ?? "", { status: 200 });
    }
    const method = init?.method ?? "GET";
    const path = url.pathname.replace(`/repos/${REPO}`, "") + url.search;
    const body = init?.body ? JSON.parse(`${init.body}`) : null;
    calls.push({ method, path, auth: headers.get("authorization"), body });
    const p = url.pathname.replace(`/repos/${REPO}`, "");
    const q = url.searchParams;
    let m: RegExpMatchArray | null;
    if (method === "GET" && (m = p.match(/^\/pulls\/(\d+)$/))) return pulls.has(+m[1]) ? reply(200, pulls.get(+m[1])) : reply(404, { message: "Not Found" });
    if (method === "GET" && (m = p.match(/^\/commits\/([0-9a-f]{40})\/check-runs$/))) return reply(200, { check_runs: checks.get(m[1]) ?? [] });
    if (method === "POST" && p.startsWith("/statuses/")) return reply(201, { id: 1, ...body });
    if (method === "PUT" && (m = p.match(/^\/pulls\/(\d+)\/merge$/))) {
      if (mergeRefused) return reply(405, { message: mergeRefused });
      const pr = pulls.get(+m[1])!;
      if (body.sha !== pr.head.sha) return reply(409, { message: "Head branch was modified. Review and try the merge again." });
      const made = merges.get(pr.number)!;
      Object.assign(pr, { state: "closed", merged: true, merge_commit_sha: made });
      return reply(200, { sha: made, merged: true, message: "Pull Request successfully merged" });
    }
    if (method === "GET" && (m = p.match(/^\/actions\/workflows\/([\w.]+)\/runs$/))) {
      const created = q.get("created")?.replace(/^>=/, "");
      const list = (runs[m[1]] ?? []).filter(
        (r) => (!q.get("head_sha") || r.head_sha === q.get("head_sha")) && (!q.get("event") || r.event === q.get("event")) && (!created || r.created_at >= created),
      );
      return reply(200, { total_count: list.length, workflow_runs: list });
    }
    if (method === "GET" && (m = p.match(/^\/actions\/runs\/(\d+)\/jobs$/))) return reply(200, { jobs: jobs.get(+m[1]) ?? [] });
    if (method === "POST" && p.match(/^\/actions\/workflows\/[\w.]+\/dispatches$/)) return reply(204);
    if (method === "POST" && p.match(/^\/actions\/runs\/\d+\/rerun-failed-jobs$/)) return reply(201, {});
    if (method === "GET" && (m = p.match(/^\/actions\/jobs\/(\d+)\/logs$/))) return reply(302, undefined, { location: `https://logs.github.test/${m[1]}` });
    return reply(404, { message: `no route ${method} ${p}` });
  }) as typeof globalThis.fetch;
  return {
    pulls, checks, runs, jobs, logs, calls, merges,
    refuseMerge: (why: string | null) => (mergeRefused = why),
    gh: gitHub({ token: TOKEN, repo: REPO, fetch, api: "https://api.github.test" }),
    fetch,
    /** what play wrote to GitHub: statuses posted, merges, dispatches, re-runs */
    writes: () => calls.filter((c) => c.method !== "GET"),
  };
}

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
const green = (name: string, at = Date.now()) => ({ id: Math.floor(Math.random() * 1e9), name, status: "completed", conclusion: "success", started_at: iso(at), html_url: `https://github.test/checks/${name}` });
const run = (id: number, merge: string, more: Partial<Run> = {}): Run => ({
  id, status: "queued", conclusion: null, html_url: `https://github.test/${REPO}/actions/runs/${id}`, head_sha: merge, event: "push",
  created_at: iso(Date.now()), run_started_at: iso(Date.now()), updated_at: iso(Date.now()), run_attempt: 1, ...more,
});
const job = (id: number, name: string, status: string, conclusion: string | null, steps?: Job["steps"]): Job => ({
  id, name, status, conclusion, html_url: `https://github.test/${REPO}/actions/runs/1/job/${id}`, started_at: iso(Date.now()), completed_at: conclusion ? iso(Date.now()) : null, ...(steps ? { steps } : {}),
});

suite("accept ships it", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>, bare: ReturnType<typeof app>;
  let gh: ReturnType<typeof fakeGitHub>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";
  /** everything play logged while these tests ran: SHIP_TOKEN may not be in it */
  const said: string[] = [];
  const keep = { log: console.log, warn: console.warn, error: console.error };

  beforeAll(async () => {
    for (const k of ["log", "warn", "error"] as const) (console as any)[k] = (...a: unknown[]) => (said.push(a.map((x) => (x instanceof Error ? `${x.message}\n${x.stack}` : typeof x === "string" ? x : JSON.stringify(x))).join(" ")), (keep as any)[k](...a));
    name = `play_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    gh = fakeGitHub();
    const store = folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));
    api = app({ db, store, rate: new Rate(0), github: gh.gh });
    bare = app({ db, store, rate: new Rate(0) });
    for (const n of ["ada", "cit"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
  });

  afterAll(async () => {
    Object.assign(console, keep);
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  const call = async (as: string | null, method: string, path: string, body?: unknown, through = () => api) => {
    const headers: Record<string, string> = {};
    if (as) headers.cookie = who[as].cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await through().fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    const text = await r.text();
    expect(text).not.toContain(TOKEN);
    return { status: r.status, data: text ? JSON.parse(text) : null };
  };
  let n = 0;
  const tool = async (name: string, args: Record<string, unknown>) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method: "tools/call", params: { name, arguments: args } }),
      }),
    );
    const res = (await r.json()).result;
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };

  const SPEC = {
    goal: "A change of play's code is shipped.",
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
    expect((await call("ada", "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("prototype");
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
  const writesSince = (from: number) => gh.calls.slice(from).filter((c) => c.method !== "GET");

  test("Accept and ship: 'Intent accepted' on the head, merged as a merge commit at once, in Ship; play's own work is accepted straight", async () => {
    const c = await codeAtProposal("A small fix of play");
    const from = gh.calls.length;
    const r = await call("ada", "POST", `/api/intents/${c.id}/accept`);
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ stage: "ship", decided_by: "ada", pull_request: c.pr, ship: { pr: c.pr, head: c.head, merge: c.merge, by: "ada", round: 1 } });
    const [merged, ...rest] = r.data.ship.steps;
    expect(merged).toMatchObject({ key: "merged", state: "green", link: `https://github.test/${REPO}/pull/${c.pr}` });
    expect(rest.map((s: any) => [s.key, s.state])).toEqual([
      ["main", "queued"], ["release", "queued"], ["main-green", "queued"], ["image", "queued"], ["backup", "queued"], ["server", "queued"], ["website", "queued"],
    ]);
    // in that one request: the status on the head, then the merge of that head, each with SHIP_TOKEN as Bearer
    const writes = writesSince(from);
    expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual([`POST /statuses/${c.head}`, `PUT /pulls/${c.pr}/merge`]);
    expect(writes[0].body).toMatchObject({ state: "success", context: ACCEPTED_CONTEXT, description: "Accepted by ada on play" });
    expect(writes[1].body).toMatchObject({ merge_method: "merge", sha: c.head });
    expect(writes[1].body.commit_message).toContain(`Intent: ${c.id}`);
    for (const w of gh.calls.slice(from)) expect(w.auth).toBe(`Bearer ${TOKEN}`);
    // listed in Ship, an open stage; not decided again there
    expect((await call("ada", "GET", "/api/intents?stage=ship")).data.map((x: any) => x.id)).toContain(c.id);
    expect((await tool("list_intents", {})).map((x: any) => x.id)).toContain(c.id);
    expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).status).toBe(409);
    expect((await call("ada", "POST", `/api/intents/${c.id}/reject`)).status).toBe(409);

    // play's own work: accepted in play, straight to Accepted, nothing asked of GitHub
    const w = await tool("add_intent", { title: "A fern", kind: "improve" });
    await tool("specify_intent", { intent: w.id, ...SPEC });
    await call("ada", "POST", `/api/intents/${w.id}/approve`);
    await tool("check_intent", { intent: w.id, results: [{ check: "c1", pass: true, evidence: "ok" }, { check: "c2", pass: true, evidence: "1.0" }] });
    const made = await tool("propose_asset", { group: "plants", label: "Ship fern", source: SOURCE, note: "x", intent: w.id });
    expect(made.error).toBeUndefined();
    expect((await tool("check_intent", { intent: w.id, pr: 8 })).error).toBeDefined();
    const before = gh.calls.length;
    expect((await call("ada", "POST", `/api/intents/${w.id}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted" } });
    expect(gh.calls.length).toBe(before);
  });

  test("Accept is refused, nothing posted or merged, the intent left at Proposal with the reason", async () => {
    const refused = async (id: string, says: string, as = "ada", through = () => api) => {
      const from = gh.calls.length;
      const r = await call(as, "POST", `/api/intents/${id}/accept`, undefined, through);
      expect(r.status).toBe(as === "ada" ? 409 : 403);
      expect(r.data.error).toContain(says);
      expect(writesSince(from)).toEqual([]);
      expect((await intent(id)).stage).toBe("proposal");
    };
    const c = await codeAtProposal("Refused, each way");
    const pr = gh.pulls.get(c.pr)!;
    // the head is not the commit its must checks last passed on
    pr.head.sha = sha(++commits);
    gh.checks.set(pr.head.sha, [green("play / API and site"), green("website / build")]);
    await refused(c.id, `passes on #${c.pr}'s head ${pr.head.sha.slice(0, 7)} first`);
    await refused(c.id, `c1 (Its tests pass): passed on ${c.head.slice(0, 7)}, not on the head`);
    pr.head.sha = c.head;
    // main.yml's checks: red, still running, not run
    gh.checks.set(c.head, [{ ...green("play / API and site"), conclusion: "failure" }, green("website / build")]);
    await refused(c.id, "'play / API and site' is failure");
    gh.checks.set(c.head, [green("play / API and site"), { ...green("website / build"), status: "in_progress", conclusion: null }]);
    await refused(c.id, "'website / build' is still running");
    gh.checks.set(c.head, [green("play / API and site")]);
    await refused(c.id, "'website / build' has not run");
    // a red run, then a green re-run of it: the latest stands
    gh.checks.set(c.head, [{ ...green("play / API and site", Date.now() - 60_000), conclusion: "failure" }, green("play / API and site"), green("website / build")]);
    // not mergeable, or GitHub not yet sure
    pr.mergeable = false;
    await refused(c.id, "does not merge into main as it is");
    pr.mergeable = null;
    await refused(c.id, "still working out whether");
    pr.mergeable = true;
    // not open into main
    pr.base.ref = "production";
    await refused(c.id, "goes into production");
    pr.base.ref = "main";
    pr.state = "closed";
    await refused(c.id, "is closed");
    pr.state = "open";
    pr.draft = true;
    await refused(c.id, "is a draft");
    pr.draft = false;
    // a citizen; and a play with no SHIP_TOKEN
    await refused(c.id, "admins", "cit");
    await refused(c.id, "SHIP_TOKEN", "ada", () => bare);
    // GitHub refuses the merge: the status is taken back, and it stays at Proposal
    gh.refuseMerge("Repository rule violations found");
    const from = gh.calls.length;
    const r = await call("ada", "POST", `/api/intents/${c.id}/accept`);
    expect(r.status).toBe(409);
    expect(r.data.error).toContain("GitHub did not merge");
    expect(r.data.error).toContain("Repository rule violations found");
    expect(writesSince(from).map((w) => [w.path.split("/")[1], w.body.state])).toEqual([["statuses", "success"], ["pulls", undefined], ["statuses", "failure"]]);
    expect((await intent(c.id)).stage).toBe("proposal");
    gh.refuseMerge(null);
    // everything in order now: it ships
    expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");
  });

  test("the ship watcher follows main's checks, the release and the deploy, step by step, to Accepted; it resumes after a restart", async () => {
    const c = await codeAtProposal("Shipped all the way");
    expect((await call("ada", "POST", `/api/intents/${c.id}/accept`)).data.stage).toBe("ship");
    const steps = async () => Object.fromEntries((await intent(c.id)).ship.steps.map((s: any) => [s.key, s.state]));
    // nothing on GitHub yet: all waits
    await watchShips(db, gh.gh);
    expect(await steps()).toMatchObject({ merged: "green", main: "queued", release: "queued" });
    // main's checks run, then pass
    const main = run(1101, c.merge, { status: "in_progress" });
    gh.runs["main.yml"].push(main);
    await watchShips(db, gh.gh);
    expect(await steps()).toMatchObject({ main: "running", release: "queued" });
    expect((await intent(c.id)).ship.steps[1].link).toBe(main.html_url);
    Object.assign(main, { status: "completed", conclusion: "success" });
    // play restarts: a new client, the same database; it goes on where it was
    const again = gitHub({ token: TOKEN, repo: REPO, fetch: gh.fetch, api: "https://api.github.test" });
    const release = run(1201, sha(999), { display_title: `release ${c.merge}`, event: "workflow_run", status: "in_progress" });
    gh.runs["release.yml"].push(run(1200, sha(998), { display_title: `release ${sha(5)}`, status: "completed", conclusion: "failure" }), release);
    await watchShips(db, again);
    expect(await steps()).toMatchObject({ main: "green", release: "running", "main-green": "queued" });
    Object.assign(release, { status: "completed", conclusion: "success" });
    // the deploy: production.yml dispatched on production at the merge commit, its jobs
    const deploy = run(1301, c.merge, { event: "workflow_dispatch", status: "in_progress" });
    gh.runs["production.yml"].push(deploy);
    const backup = { name: "Back up play", status: "queued", conclusion: null };
    gh.jobs.set(1301, [
      job(1, "Main is green", "completed", "success"),
      job(2, "The image", "in_progress", null),
      job(3, "The server", "queued", null, [{ name: "Copy play's files", status: "queued", conclusion: null }, backup]),
      job(4, "The website", "completed", "success"),
    ]);
    await watchShips(db, again);
    expect(await steps()).toEqual({ merged: "green", main: "green", release: "green", "main-green": "green", image: "running", backup: "queued", server: "queued", website: "green" });
    expect((await intent(c.id)).stage).toBe("ship");
    // the image is built, the server backs up and starts play
    gh.jobs.set(1301, [
      job(1, "Main is green", "completed", "success"),
      job(2, "The image", "completed", "success"),
      job(3, "The server", "in_progress", null, [{ name: "Back up play", status: "in_progress", conclusion: null, started_at: iso(Date.now()) }]),
      job(4, "The website", "completed", "success"),
    ]);
    await watchShips(db, again);
    expect(await steps()).toMatchObject({ image: "green", backup: "running", server: "running" });
    // the background watcher takes the last look itself
    gh.jobs.set(1301, [
      job(1, "Main is green", "completed", "success"),
      job(2, "The image", "completed", "success"),
      job(3, "The server", "completed", "success", [{ name: "Back up play", status: "completed", conclusion: "success" }]),
      job(4, "The website", "completed", "success"),
    ]);
    Object.assign(deploy, { status: "completed", conclusion: "success" });
    const stop = startShipWatcher(db, again, 20);
    for (let t = 0; t < 100 && (await intent(c.id)).stage === "ship"; t++) await Bun.sleep(20);
    stop();
    const done = await intent(c.id);
    expect(done).toMatchObject({ stage: "accepted", decided_by: "ada", ship: { outcome: "green", deploy_run: 1301, release_run: 1201, main_run: 1101 } });
    expect(done.ship.steps.every((s: any) => s.state === "green")).toBe(true);
    expect(done.ship.steps.find((s: any) => s.key === "server").link).toContain("/job/3");
  });

  test("a red step takes it back to Proposal with the report; Accept ships it again: the release, main's failed jobs, or a newer pull request", async () => {
    const c = await codeAtProposal("Red at the backup");
    await call("ada", "POST", `/api/intents/${c.id}/accept`);
    gh.runs["main.yml"].push(run(2101, c.merge, { status: "completed", conclusion: "success" }));
    gh.runs["release.yml"].push(run(2201, c.merge, { display_title: `release ${c.merge}`, status: "completed", conclusion: "success" }));
    gh.runs["production.yml"].push(run(2301, c.merge, { event: "workflow_dispatch", status: "completed", conclusion: "failure" }));
    gh.jobs.set(2301, [
      job(21, "Main is green", "completed", "success"),
      job(22, "The image", "completed", "success"),
      job(23, "The server", "completed", "failure", [{ name: "Back up play", status: "completed", conclusion: "failure" }, { name: "Start play-api, import, and answer play.maia.city", status: "completed", conclusion: "skipped" }]),
      job(24, "The website", "completed", "success"),
    ]);
    gh.logs.set(23, Array.from({ length: 100 }, (_, i) => `2026-11-06T12:00:${String(i % 60).padStart(2, "0")}.1234567Z line ${i + 1}`).join("\n") + "\n");
    await watchShips(db, gh.gh);
    const red = await intent(c.id);
    expect(red).toMatchObject({ stage: "proposal", decided_by: null, decided_at: null, ship: { outcome: "red", again: "release", report: { step: "Backup", link: `https://github.test/${REPO}/actions/runs/1/job/23` } } });
    expect(red.ship.report.why).toContain("Backup");
    const lines = red.ship.report.log.split("\n");
    expect(lines.length).toBe(60);
    expect(lines[0]).toBe("line 41");
    expect(lines[59]).toBe("line 100");
    // the log is fetched from where GitHub points, without the token
    expect(gh.calls.find((x) => x.path === "/23")!.auth).toBeNull();
    expect(Object.fromEntries(red.ship.steps.map((s: any) => [s.key, s.state]))).toMatchObject({ backup: "red", server: "red", image: "green", website: "green" });

    // its pull request is merged: Accept runs the release again for that commit, in Ship again
    let from = gh.calls.length;
    const again = (await call("ada", "POST", `/api/intents/${c.id}/accept`)).data;
    expect(writesSince(from)).toEqual([expect.objectContaining({ method: "POST", path: "/actions/workflows/release.yml/dispatches", body: { ref: "main", inputs: { sha: c.merge } } })]);
    expect(again).toMatchObject({ stage: "ship", ship: { round: 2, merge: c.merge, report: null } });
    expect(again.ship.steps.map((s: any) => s.state)).toEqual(["green", "green", "queued", "queued", "queued", "queued", "queued", "queued"]);
    // the earlier round's runs are not this one's: nothing moves until a new release runs
    await watchShips(db, gh.gh);
    expect((await intent(c.id)).ship.steps[2].state).toBe("queued");

    // a red on main: Accept runs main's failed jobs again
    const m = await codeAtProposal("Red on main");
    await call("ada", "POST", `/api/intents/${m.id}/accept`);
    gh.runs["main.yml"].push(run(3101, m.merge, { status: "completed", conclusion: "failure" }));
    gh.jobs.set(3101, [job(31, "play / API and site", "completed", "failure"), job(32, "website / build", "completed", "success")]);
    gh.logs.set(31, "2026-11-06T12:00:00.0000000Z error: 1 fail\n");
    await watchShips(db, gh.gh);
    expect((await intent(m.id)).ship).toMatchObject({ outcome: "red", again: "main", main_run: 3101, report: { step: "main's checks", log: "error: 1 fail" } });
    from = gh.calls.length;
    expect((await call("ada", "POST", `/api/intents/${m.id}/accept`)).data).toMatchObject({ stage: "ship", ship: { round: 2 } });
    expect(writesSince(from).map((w) => `${w.method} ${w.path}`)).toEqual(["POST /actions/runs/3101/rerun-failed-jobs"]);

    // a newer pull request of it, checked on its head: Accept merges that one
    await watchShips(db, gh.gh, Date.now() + 20 * 60_000);
    const late = await intent(m.id);
    expect(late).toMatchObject({ stage: "proposal", ship: { outcome: "red", report: { step: "main's checks" } } });
    expect(late.ship.report.why).toContain("within 15 minutes");
    const pr = ++prs;
    const head = sha(++commits);
    expect((await tool("check_intent", { intent: m.id, pr, results: [{ check: "c1", pass: true, evidence: "fixed", commit: head }, { check: "c2", pass: true, evidence: "1.1", commit: head }] })).pull_request).toBe(pr);
    gh.pulls.set(pr, { ...gh.pulls.get(m.pr)!, number: pr, state: "open", merged: false, merge_commit_sha: null, head: { sha: head, ref: "claude/fix" }, html_url: `https://github.test/${REPO}/pull/${pr}` });
    gh.checks.set(head, [green("play / API and site"), green("website / build")]);
    gh.merges.set(pr, sha(++commits));
    from = gh.calls.length;
    const third = (await call("ada", "POST", `/api/intents/${m.id}/accept`)).data;
    expect(third).toMatchObject({ stage: "ship", ship: { pr, head, merge: gh.merges.get(pr), round: 3 } });
    expect(writesSince(from).map((w) => `${w.method} ${w.path}`)).toEqual([`POST /statuses/${head}`, `PUT /pulls/${pr}/merge`]);
    // a pull request merged by no ship of it is not shipped
    const o = await codeAtProposal("Merged by hand");
    Object.assign(gh.pulls.get(o.pr)!, { state: "closed", merged: true, merge_commit_sha: sha(4242) });
    const hand = await call("ada", "POST", `/api/intents/${o.id}/accept`);
    expect(hand.data.error).toContain("merged already, and not by a ship of this intent");
  });

  test("SHIP_TOKEN never leaves play's server: not in an answer, not in a log", async () => {
    expect(shipGitHub({})).toBeNull();
    expect(shipGitHub({ SHIP_TOKEN: "  " })).toBeNull();
    expect(shipGitHub({ SHIP_TOKEN: "x" })!.repo).toBe("MyAvenCEO/maiacity");
    expect(() => gitHub({ token: "x", repo: "not a repo" })).toThrow();
    // GitHub's errors name the request, never a header
    const broken = gitHub({ token: TOKEN, repo: REPO, api: "https://api.github.test", fetch: (async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 })) as any });
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
