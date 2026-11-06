// Accept ships it (play/SPEC.md §4.12, Samuel 2026-11-06): "only the manual accept should directly trigger the flow ...
// it should instantly start the merge into main and prod". An intent whose work is code names its pull request into
// main (check_intent's `pr`); an admin's Accept at Proposal is the one gate before anything lands, and it acts at once:
//
//   1. play reads the pull request with SHIP_TOKEN (a fine-grained token, the repository secret written into play.env):
//      open into main, mergeable, its head the commit every must check with a run last passed on, and main.yml's checks
//      (`play / API and site`, `website / build`) green there; otherwise Accept is refused, nothing is posted or merged,
//      and the intent stays at Proposal with the reason given;
//   2. it posts the commit status `Intent accepted` on that head (main's ruleset requires it: only play posts it);
//   3. it merges the pull request (a merge commit, that head's sha), and the intent is in Ship, its first step merged.
//
// While an intent is in Ship, the ship watcher (every 10 s, in play-api; its state is the intent's `ship` in Postgres,
// so it resumes after a restart) reads GitHub's Actions for the merge commit: main.yml's run (main's checks), then
// release.yml's (.github/workflows/release.yml: production moved to the commit once main is green), then production.yml's
// and its jobs (Main is green, The image, the backup inside The server, The server, The website). Each step is kept on the
// intent as it changes (queued, running, green, red; when; its link). All green: Accepted. Any red: back to Proposal,
// with the report (the step, its link, the failed job's last log lines), from where Accept ships it again: a newer
// pull request of it merged, or, its pull request merged already, main's failed jobs run again (a red on main) or the
// release run again for the commit last merged.
//
// play only calls GitHub's API: no proposed code runs on its server. SHIP_TOKEN stays here: it is sent to
// api.github.com only, never answered by a route, never written to a log.
import { Denied, type Me } from "./access";
import type { Db, Queryable } from "./pg";
import { getIntent, IntentError, unmet, unmetOn } from "./intents";

/** the checks main.yml runs on a pull request, required green on its head before Accept merges it */
export const REQUIRED_CHECKS = ["play / API and site", "website / build"];
/** the commit status play posts on the head it merges; main's ruleset requires it */
export const ACCEPTED_CONTEXT = "Intent accepted";
/** how long a step may wait for its run to appear before the ship is red */
export const START_WITHIN_MS = 15 * 60_000;
/** how many of the failed job's last log lines the report keeps */
export const LOG_LINES = 60;
const LOG_MOST = 12_000;
/** how long one call to GitHub may take */
const CALL_MS = 30_000;

export type StepState = "queued" | "running" | "green" | "red" | "skipped";
export type Step = { key: string; name: string; state: StepState; started?: string; finished?: string; link?: string; note?: string };
export type Report = { step: string; why: string; link?: string; log: string; at: string };
export type Ship = {
  pr: number;
  head: string;
  merge: string;
  by: string;
  round: number;
  /** when this round began: the merge, or the press that shipped it again */
  started: string;
  steps: Step[];
  report?: Report | null;
  ended?: string;
  outcome?: "green" | "red";
  main_run?: number;
  /** the attempt main's run was at when last looked at */
  main_attempt?: number;
  /** after main's failed jobs are run again: only a later attempt is this round's */
  main_after?: number;
  release_run?: number;
  deploy_run?: number;
  /** the release and deploy runs of earlier rounds, never this one's */
  past?: number[];
  /** what a failed round leaves for the next press: a red step's run on main, run again; else the release */
  again?: "main" | "release";
};

/** the way to production, in order: the merge, main's checks, the release, the deploy's jobs */
export const STEPS: { key: string; name: string; job?: string; step?: string }[] = [
  { key: "merged", name: "Merged into main" },
  { key: "main", name: "main's checks" },
  { key: "release", name: "Release" },
  { key: "main-green", name: "Main is green", job: "Main is green" },
  { key: "image", name: "The image", job: "The image" },
  { key: "backup", name: "Backup", job: "The server", step: "Back up play" },
  { key: "server", name: "The server", job: "The server" },
  { key: "website", name: "The website", job: "The website" },
];
const DEPLOY = STEPS.filter((s) => s.job);

// ---- GitHub, through its REST API with SHIP_TOKEN

export type Pull = {
  number: number;
  state: string;
  merged: boolean;
  merge_commit_sha: string | null;
  mergeable: boolean | null;
  draft?: boolean;
  base: { ref: string };
  head: { sha: string; ref: string };
  html_url: string;
  title: string;
};
export type Run = {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_sha: string;
  event: string;
  display_title?: string;
  created_at: string;
  run_started_at?: string;
  updated_at?: string;
  run_attempt?: number;
};
export type Job = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  started_at?: string | null;
  completed_at?: string | null;
  steps?: { name: string; status: string; conclusion: string | null; started_at?: string | null; completed_at?: string | null }[];
};

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type GitHub = ReturnType<typeof gitHub>;

/**
 * GitHub's REST API for one repository (`owner/name`) with a token (SHIP_TOKEN), `fetch` given in the tests. An answer
 * that is no 2xx throws GitHubError with GitHub's own message; neither the token nor any header is ever in it.
 */
export function gitHub({ token, repo, fetch: get = fetch, api = "https://api.github.com" }: { token: string; repo: string; fetch?: typeof fetch; api?: string }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`SHIP_REPO is owner/name: ${repo}`);
  const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "play.maia.city ship" };
  const call = async (method: string, path: string, body?: unknown, redirect: RequestRedirect = "follow") => {
    const r = await get(`${api}/repos/${repo}${path}`, {
      method,
      redirect,
      // an Accept holds its intent's row while it asks, and the watcher looks once at a time: no call hangs on
      signal: AbortSignal.timeout(CALL_MS),
      headers: body === undefined ? headers : { ...headers, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (redirect === "manual" && r.status >= 300 && r.status < 400) return r;
    if (!r.ok) {
      const said = await r.json().then((j: any) => j?.message, () => null).catch(() => null);
      throw new GitHubError(`GitHub answered ${r.status} to ${method} ${path.split("?")[0]}${said ? `: ${said}` : ""}`, r.status);
    }
    return r;
  };
  const json = async <T>(method: string, path: string, body?: unknown) => {
    const r = await call(method, path, body);
    return (r.status === 204 ? null : await r.json()) as T;
  };
  const q = (o: Record<string, string | number | undefined>) =>
    Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(`${v}`)}`)
      .join("&");
  return {
    repo,
    pull: (n: number) => json<Pull>("GET", `/pulls/${n}`),
    checkRuns: async (sha: string) => (await json<{ check_runs: any[] }>("GET", `/commits/${sha}/check-runs?per_page=100`)).check_runs,
    status: (sha: string, s: { state: "success" | "failure" | "error" | "pending"; description: string; target_url?: string }) =>
      json("POST", `/statuses/${sha}`, { ...s, context: ACCEPTED_CONTEXT }),
    merge: (n: number, sha: string, commit_title: string, commit_message: string) =>
      json<{ sha: string; merged: boolean }>("PUT", `/pulls/${n}/merge`, { merge_method: "merge", sha, commit_title, commit_message }),
    runs: async (workflow: string, filter: { head_sha?: string; event?: string; created?: string }) =>
      (await json<{ workflow_runs: Run[] }>("GET", `/actions/workflows/${workflow}/runs?${q({ ...filter, per_page: 30 })}`)).workflow_runs,
    jobs: async (run: number) => (await json<{ jobs: Job[] }>("GET", `/actions/runs/${run}/jobs?per_page=100`)).jobs,
    dispatch: (workflow: string, ref: string, inputs: Record<string, string>) => json("POST", `/actions/workflows/${workflow}/dispatches`, { ref, inputs }),
    rerunFailed: (run: number) => json("POST", `/actions/runs/${run}/rerun-failed-jobs`, {}),
    /** a job's log: GitHub answers with a signed address, fetched without the token */
    log: async (job: number) => {
      const r = await call("GET", `/actions/jobs/${job}/logs`, undefined, "manual");
      const at = r.headers.get("location");
      if (!at) return await r.text();
      const l = await get(at, { headers: { "user-agent": headers["user-agent"] }, signal: AbortSignal.timeout(CALL_MS) });
      if (!l.ok) throw new GitHubError(`the job's log answered ${l.status}`, l.status);
      return await l.text();
    },
  };
}

/** play's GitHub, where SHIP_TOKEN is set (the repository SHIP_REPO, MyAvenCEO/maiacity by default), else null */
export function shipGitHub(env: Record<string, string | undefined> = process.env): GitHub | null {
  const token = env.SHIP_TOKEN?.trim();
  return token ? gitHub({ token, repo: env.SHIP_REPO?.trim() || "MyAvenCEO/maiacity" }) : null;
}

// ---- Accept and ship

function refuse(why: string): never {
  throw new IntentError(why, 409);
}
const now = () => new Date().toISOString();
/** the intent on play's board, where the status 'Intent accepted' links to */
const intentLink = (id: string) => `https://play.maia.city/intents/#${id}`;

function steps(at: string, pr: Pull, merge: string, from: Step[] = [], restart: "main" | "release" | null = null): Step[] {
  if (restart) {
    const i = STEPS.findIndex((s) => s.key === restart);
    return STEPS.map((s, j) => (j < i ? from.find((f) => f.key === s.key) ?? { key: s.key, name: s.name, state: "green" } : { key: s.key, name: s.name, state: "queued" }));
  }
  return STEPS.map((s) =>
    s.key === "merged"
      ? { key: s.key, name: s.name, state: "green", started: at, finished: at, link: pr.html_url, note: `#${pr.number} merged as ${merge.slice(0, 7)}` }
      : { key: s.key, name: s.name, state: "queued" },
  );
}

/** the latest of the check runs of each name (a re-run after a red one) */
function latestRuns(runs: any[]) {
  const by = new Map<string, any>();
  for (const r of runs) {
    const was = by.get(r.name);
    if (!was || `${r.started_at ?? ""}` > `${was.started_at ?? ""}` || (r.started_at === was.started_at && r.id > was.id)) by.set(r.name, r);
  }
  return by;
}

/**
 * An admin's Accept on an intent at Proposal whose work is code (it names its pull request): checked, `Intent accepted`
 * posted on its head, merged into main, and the intent in Ship; or, its pull request merged already by an earlier ship
 * of it, shipped again. Gives back the intent; null where the intent is no code intent at Proposal (it is decided as
 * before: ./intents.ts decideIntent, ./proposals.ts decide).
 */
export async function acceptAndShip(db: Db, gh: GitHub | null, me: Me | null, id: string) {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins keep the intents.");
  const first = await getIntent(db, id);
  if (first.stage !== "proposal" || first.work || !first.pull_request) return null;
  return db.transaction(async (tx) => {
    // one Accept at a time: a second press waits here, then finds it shipped
    await tx.query(`SELECT 1 FROM play.intents WHERE id = $1 FOR UPDATE`, [first.id]);
    const intent = await getIntent(tx, first.id);
    if (intent.stage !== "proposal") refuse(`Intent ${intent.id} is at the ${intent.stage} stage now.`);
    if (!gh) refuse("play holds no SHIP_TOKEN, so it cannot merge: set the repository secret SHIP_TOKEN and deploy (deploy/README.md).");
    const missing = unmet(intent);
    if (missing.length) refuse(`Every must check passes before an intent is accepted: ${missing.join("; ")}.`);
    const pr = await gh!.pull(intent.pull_request).catch((e) => refuse(`Pull request #${intent.pull_request} could not be read: ${(e as Error).message}.`));
    const was: Ship | null = intent.ship ?? null;
    if (pr.merged) {
      if (!was?.merge || was.pr !== pr.number || pr.merge_commit_sha !== was.merge)
        refuse(`Pull request #${pr.number} is merged already, and not by a ship of this intent: name the intent's open pull request (check_intent's pr).`);
      return shipAgain(tx, gh!, me, intent, pr, was!);
    }
    if (pr.state !== "open") refuse(`Pull request #${pr.number} is ${pr.state}: name the intent's open pull request (check_intent's pr).`);
    if (pr.base.ref !== "main") refuse(`Pull request #${pr.number} goes into ${pr.base.ref}: an intent's code goes into main.`);
    if (pr.draft) refuse(`Pull request #${pr.number} is a draft: it is marked ready (main's checks run then) before it is merged.`);
    const head = pr.head.sha;
    const stale = unmetOn(intent, head);
    if (stale.length)
      refuse(`What is merged is what was checked: every must check with a run passes on #${pr.number}'s head ${head.slice(0, 7)} first (bun play/avenbox/intent.ts ${intent.id} --record on it): ${stale.join("; ")}.`);
    if (pr.mergeable === null) refuse(`GitHub is still working out whether #${pr.number} merges: try again in a moment.`);
    if (pr.mergeable === false) refuse(`#${pr.number} does not merge into main as it is (a conflict): main is merged into its branch, and its checks run again on the new head.`);
    const runs = latestRuns(await gh!.checkRuns(head).catch((e) => refuse(`#${pr.number}'s checks could not be read: ${(e as Error).message}.`)));
    for (const name of REQUIRED_CHECKS) {
      const r = runs.get(name);
      if (!r) refuse(`'${name}' has not run on #${pr.number}'s head ${head.slice(0, 7)} (a draft runs nothing: mark it ready).`);
      if (r.status !== "completed") refuse(`'${name}' is still running on #${pr.number}'s head: Accept once it is green.`);
      if (r.conclusion !== "success") refuse(`'${name}' is ${r.conclusion} on #${pr.number}'s head ${head.slice(0, 7)}: it is green before it is merged.`);
    }
    // the one moment: accepted on GitHub, merged, in Ship
    const at = now();
    await gh!.status(head, { state: "success", description: `Accepted by ${me.name} on play`, target_url: intentLink(intent.id) })
      .catch((e) => refuse(`GitHub took no '${ACCEPTED_CONTEXT}' on #${pr.number}'s head: ${(e as Error).message}.`));
    let merged: { sha: string };
    try {
      merged = await gh!.merge(pr.number, head, `${pr.title} (#${pr.number})`, `Accepted by ${me.name} on play: ${intentLink(intent.id)}\n\nIntent: ${intent.id}`);
    } catch (e) {
      await gh!.status(head, { state: "failure", description: "Accepted, but not merged: accept it again", target_url: intentLink(intent.id) }).catch(() => {});
      return refuse(`GitHub did not merge #${pr.number}: ${(e as Error).message}. Nothing is shipped; it stays at Proposal.`);
    }
    const ship: Ship = { pr: pr.number, head, merge: merged.sha, by: me.name, round: (was?.round ?? 0) + 1, started: at, steps: steps(at, pr, merged.sha), report: null };
    await tx.query(`UPDATE play.intents SET stage = 'ship', ship = ($2::text)::jsonb, decided_by = $3, decided_at = now() WHERE id = $1`, [intent.id, JSON.stringify(ship), me.id]);
    console.log(`ship: intent ${intent.id} accepted by ${me.name}: #${pr.number} merged as ${merged.sha}`);
    return getIntent(tx, intent.id);
  });
}

/** its pull request merged by an earlier ship that went red: main's failed jobs run again, else the release, and it is in Ship again */
async function shipAgain(tx: Queryable, gh: GitHub, me: Me, intent: any, pr: Pull, was: Ship) {
  const at = now();
  const again = was.again === "main" && was.main_run ? "main" : "release";
  try {
    if (again === "main") await gh.rerunFailed(was.main_run!);
    else await gh.dispatch("release.yml", "main", { sha: was.merge });
  } catch (e) {
    refuse(`GitHub did not ${again === "main" ? "run main's failed jobs again" : "start the release again"}: ${(e as Error).message}. It stays at Proposal.`);
  }
  const ship: Ship = {
    ...was,
    by: me.name,
    round: was.round + 1,
    started: at,
    steps: steps(at, pr, was.merge, was.steps, again),
    report: null,
    ended: undefined,
    outcome: undefined,
    again: undefined,
    main_after: again === "main" ? was.main_attempt ?? 1 : undefined,
    past: [...(was.past ?? []), ...[was.release_run, was.deploy_run].filter((r): r is number => !!r)],
    release_run: undefined,
    deploy_run: undefined,
  };
  await tx.query(`UPDATE play.intents SET stage = 'ship', ship = ($2::text)::jsonb, decided_by = $3, decided_at = now() WHERE id = $1`, [intent.id, JSON.stringify(ship), me.id]);
  console.log(`ship: intent ${intent.id} shipped again by ${me.name} (${again === "main" ? "main's failed jobs" : "the release"} of ${was.merge})`);
  return getIntent(tx, intent.id);
}

// ---- the ship watcher

const runState = (r: { status: string; conclusion: string | null }, skippedIs: StepState = "skipped"): StepState => {
  if (r.status !== "completed") return r.status === "in_progress" ? "running" : "queued";
  if (r.conclusion === "success" || r.conclusion === "neutral") return "green";
  if (r.conclusion === "skipped") return skippedIs;
  return "red";
};
const done = (s: StepState) => s === "green" || s === "skipped";
const stamp = (v: string | null | undefined) => v ?? undefined;
/** a run's start for this round: a re-run starts it again */
const startOf = (r: Run) => Date.parse(r.run_started_at ?? r.created_at);
const latest = (runs: Run[]) => runs.sort((a, b) => startOf(b) - startOf(a) || b.id - a.id)[0];

/** the last lines of a log, its timestamps taken off */
export function tailOf(log: string, lines = LOG_LINES) {
  const all = log
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/^\uFEFF?\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z ?/, "").replace(/\x1b\[[0-9;]*m/g, ""));
  while (all.length && !all[all.length - 1].trim()) all.pop();
  const tail = all.slice(-lines).join("\n");
  return tail.length > LOG_MOST ? `…${tail.slice(tail.length - LOG_MOST + 1)}` : tail;
}

/**
 * One look at an intent's way to production (its `ship`), as GitHub has it now: each step's state, when and its link.
 * Gives back the ship as it is now; its outcome once all are green (or skipped) or one is red, with the report.
 */
export async function advance(gh: GitHub, was: Ship, at = Date.now()): Promise<Ship> {
  const ship: Ship = { ...was, steps: was.steps.map((s) => ({ ...s })) };
  const step = (key: string) => ship.steps.find((s) => s.key === key)!;
  const since = Date.parse(ship.started) - 5_000;
  const set = (key: string, state: StepState, more: Partial<Step> = {}) => Object.assign(step(key), { state }, more);
  const late = (from: string | undefined) => at - Date.parse(from ?? ship.started) > START_WITHIN_MS;
  let failed: { key: string; why: string; link?: string; job?: number; run?: number } | null = null;

  // main's checks: main.yml's run for the merge commit, pushed to main
  const main = step("main");
  if (!done(main.state)) {
    const runs = (await gh.runs("main.yml", { head_sha: ship.merge, event: "push" })).filter(
      (r) => (ship.main_after ? (r.run_attempt ?? 1) > ship.main_after : startOf(r) >= since),
    );
    const run = latest(runs);
    if (run) {
      ship.main_run = run.id;
      ship.main_attempt = run.run_attempt ?? 1;
      set("main", runState(run, "red"), { link: run.html_url, started: stamp(run.run_started_at ?? run.created_at), finished: run.status === "completed" ? stamp(run.updated_at) : undefined });
      if (main.state === "red") failed = { key: "main", why: `main's checks are ${run.conclusion} on ${ship.merge.slice(0, 7)}`, link: run.html_url, run: run.id };
    } else if (late(ship.started)) {
      set("main", "red");
      failed = { key: "main", why: `no run of main.yml for ${ship.merge.slice(0, 7)} began within ${START_WITHIN_MS / 60_000} minutes` };
    }
  }
  // the release: release.yml's run named for the merge commit (after main is green, or dispatched again)
  const release = step("release");
  if (!failed && done(main.state) && !done(release.state)) {
    const created = new Date(since).toISOString().replace(/\.\d+Z$/, "Z");
    const runs = (await gh.runs("release.yml", { created: `>=${created}` })).filter(
      (r) => r.display_title === `release ${ship.merge}` && startOf(r) >= since && !ship.past?.includes(r.id),
    );
    const run = latest(runs);
    if (run) {
      ship.release_run = run.id;
      set("release", runState(run, "red"), { link: run.html_url, started: stamp(run.run_started_at ?? run.created_at), finished: run.status === "completed" ? stamp(run.updated_at) : undefined });
      if (release.state === "red") failed = { key: "release", why: `the release is ${run.conclusion}`, link: run.html_url, run: run.id };
    } else if (late(main.finished)) {
      set("release", "red");
      failed = { key: "release", why: `no release.yml run for ${ship.merge.slice(0, 7)} began within ${START_WITHIN_MS / 60_000} minutes of main's checks` };
    }
  }
  // the deploy: production.yml's run on production at the merge commit, and its jobs
  if (!failed && done(release.state) && DEPLOY.some((d) => !done(step(d.key).state))) {
    const run = latest(
      (await gh.runs("production.yml", { head_sha: ship.merge, event: "workflow_dispatch" })).filter((r) => startOf(r) >= since && !ship.past?.includes(r.id)),
    );
    if (run) {
      ship.deploy_run = run.id;
      const jobs = await gh.jobs(run.id);
      for (const d of DEPLOY) {
        const job = jobs.find((j) => j.name === d.job);
        if (!job) {
          if (run.status === "completed") set(d.key, run.conclusion === "success" ? "skipped" : "red", { link: run.html_url });
          continue;
        }
        if (d.step) {
          const s = job.steps?.find((x) => x.name === d.step);
          if (!s) {
            if (job.status === "completed") set(d.key, job.conclusion === "success" ? "skipped" : "red", { link: job.html_url, note: `no step '${d.step}'` });
            continue;
          }
          set(d.key, runState(s), { link: job.html_url, started: stamp(s.started_at), finished: s.status === "completed" ? stamp(s.completed_at) : undefined });
        } else set(d.key, runState(job), { link: job.html_url, started: stamp(job.started_at), finished: job.status === "completed" ? stamp(job.completed_at) : undefined });
        if (step(d.key).state === "red" && !failed) failed = { key: d.key, why: `${d.name} is ${d.step ? "red" : job.conclusion}`, link: job.html_url, job: job.id };
      }
      if (!failed && run.status === "completed" && run.conclusion !== "success" && DEPLOY.some((d) => !done(step(d.key).state)))
        failed = { key: DEPLOY.find((d) => !done(step(d.key).state))!.key, why: `the deploy is ${run.conclusion}`, link: run.html_url };
    } else if (late(release.finished)) {
      set(DEPLOY[0].key, "red");
      failed = { key: DEPLOY[0].key, why: `no production.yml run for ${ship.merge.slice(0, 7)} began within ${START_WITHIN_MS / 60_000} minutes of the release` };
    }
  }

  if (failed) {
    set(failed.key, "red");
    let job = failed.job;
    if (!job && failed.run) job = (await gh.jobs(failed.run).catch(() => [] as Job[])).find((j) => j.conclusion && !["success", "skipped", "neutral"].includes(j.conclusion))?.id;
    const log = job ? await gh.log(job).then((l) => tailOf(l), (e) => `(the log could not be read: ${(e as Error).message})`) : "";
    ship.report = { step: step(failed.key).name, why: failed.why, ...(failed.link ? { link: failed.link } : {}), log, at: new Date(at).toISOString() };
    ship.outcome = "red";
    ship.ended = new Date(at).toISOString();
    ship.again = failed.key === "main" ? "main" : "release";
  } else if (ship.steps.every((s) => done(s.state))) {
    ship.outcome = "green";
    ship.ended = new Date(at).toISOString();
  }
  return ship;
}

/** JSON with its keys in order: Postgres keeps a jsonb's keys in its own order */
const stable = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object"
    ? `{${Object.keys(v).filter((k) => (v as any)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(",")}}`
    : JSON.stringify(v);

/**
 * The ship watcher's one look: every intent in Ship advanced as GitHub has it now; all green, Accepted; any red, back
 * to Proposal with its report. Its state is the intents' `ship`, so a restarted play goes on where it was.
 */
export async function watchShips(db: Db, gh: GitHub, at = Date.now()) {
  const { rows } = await db.query<{ id: string; ship: Ship }>(`SELECT id, ship FROM play.intents WHERE stage = 'ship' AND ship IS NOT NULL ORDER BY decided_at`);
  for (const { id, ship } of rows) {
    try {
      const next = await advance(gh, ship, at);
      if (stable(next) === stable(ship)) continue;
      const stage = next.outcome === "green" ? "accepted" : next.outcome === "red" ? "proposal" : "ship";
      await db.query(
        `UPDATE play.intents SET ship = ($2::text)::jsonb, stage = $3,
                decided_by = CASE WHEN $3 = 'proposal' THEN NULL ELSE decided_by END,
                decided_at = CASE WHEN $3 = 'proposal' THEN NULL WHEN $3 = 'accepted' THEN now() ELSE decided_at END
          WHERE id = $1 AND stage = 'ship'`,
        [id, JSON.stringify(next), stage],
      );
      if (next.outcome) console.log(`ship: intent ${id} ${next.outcome === "green" ? "is in production: accepted" : `is red at ${next.report?.step}: back to Proposal`}`);
    } catch (e) {
      console.warn(`ship: intent ${id} not looked at: ${(e as Error).message}`);
    }
  }
}

/** The ship watcher, every `every` ms while play-api runs (one look at a time). */
export function startShipWatcher(db: Db, gh: GitHub, every = 10_000) {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await watchShips(db, gh);
    } catch (e) {
      console.warn(`ship: the watcher missed a look: ${(e as Error).message}`);
    } finally {
      busy = false;
    }
  }, every);
  (timer as any).unref?.();
  return () => clearInterval(timer);
}
