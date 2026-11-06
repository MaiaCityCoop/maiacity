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
// Accept goes straight to Ship (Samuel 2026-11-06, intent 2f13976c-c85c-43fd-89eb-2e7651f657e1: "Accept proposal should
// directly go to ship and ship should self queue smartly"): Accept refuses at once only what can never ship as the pull
// request stands (1. above, but for what is only not yet); the intent is in Ship at once, its first step Ready to merge
// waiting, with its reason, for its turn (one ship at a time, in the order accepted) and for GitHub (mergeability
// worked out, the checks green). When both are there, play does 2. and 3. by itself (startIfReady, from Accept and the
// watcher). A red check, a moved head or a conflict while it waits, or 30 minutes waiting for GitHub, takes it back to
// Proposal with the report.
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
import { COOP, Denied, type Me } from "./access";
import type { Db } from "./pg";
import { getIntent, IntentError, unmet, unmetOn } from "./intents";

/** the checks main.yml runs on a pull request, required green on its head before Accept merges it */
export const REQUIRED_CHECKS = ["play / API and site", "website / build"];
/** the commit status play posts on the head it merges; main's ruleset requires it */
export const ACCEPTED_CONTEXT = "Intent accepted";
/** how long a step may wait for its run to appear before the ship is red */
export const START_WITHIN_MS = 15 * 60_000;
/** how long a ship first in line waits for its pull request's checks or for GitHub before it is red */
export const WAIT_MOST_MS = 30 * 60_000;
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
  /** what it does when its turn comes and GitHub is ready (null once done): merge the pull request at the checked
   *  head, or ship again (main's failed jobs run again, or the release) */
  pending?: Pending | null;
  /** when it was accepted (this round), and when it first stood first in line, from which it waits at most 30 minutes */
  accepted?: string;
  front?: string;
};
export type Pending = { kind: "merge"; head: string } | { kind: "main" } | { kind: "release" };

/** the way to production, in order: the merge, main's checks, the release, the deploy's jobs */
export const STEPS: { key: string; name: string; job?: string; step?: string }[] = [
  { key: "ready", name: "Ready to merge" },
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

/**
 * play's GitHub, where SHIP_TOKEN is set (the repository SHIP_REPO, MyAvenCEO/maiacity by default), else null;
 * SHIP_API names another GitHub API than api.github.com, for a play run against a stand-in (never set in production)
 */
export function shipGitHub(env: Record<string, string | undefined> = process.env): GitHub | null {
  const token = env.SHIP_TOKEN?.trim();
  return token ? gitHub({ token, repo: env.SHIP_REPO?.trim() || "MyAvenCEO/maiacity", api: env.SHIP_API?.trim() || undefined }) : null;
}

// ---- Accept and ship: Accept puts it in Ship at once; it starts when its turn comes and GitHub is ready

function refuse(why: string): never {
  throw new IntentError(why, 409);
}
const now = () => new Date().toISOString();
/** the intent on play's board, where the status 'Intent accepted' links to */
const intentLink = (id: string) => `https://play.maia.city/intents/#${id}`;
/** one start at a time: the queue's order is read and its head started under this lock */
const QUEUE_LOCK = 4_711_030;
/** the first step's name, by what it waits to do */
const READY: Record<Pending["kind"], string> = { merge: "Ready to merge", main: "Ready to run main's checks again", release: "Ready to release again" };

/** a new ship's steps: Ready to merge waiting, the rest to come */
function freshSteps(at: string): Step[] {
  return STEPS.map((s) => (s.key === "ready" ? { key: s.key, name: s.name, state: "running", started: at, note: "Accepted" } : { key: s.key, name: s.name, state: "queued" }));
}
/** a ship again's steps: what went before kept, its first step waiting again, from where it starts again on to come */
function againSteps(at: string, from: Step[], restart: "main" | "release"): Step[] {
  const i = STEPS.findIndex((s) => s.key === restart);
  return STEPS.map((s, j) =>
    s.key === "ready"
      ? { key: s.key, name: READY[restart], state: "running", started: at, note: "Accepted" }
      : j < i
        ? from.find((f) => f.key === s.key) ?? { key: s.key, name: s.name, state: "green" }
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
 * An admin's Accept on an intent at Proposal whose work is code (it names its pull request). Refused at once, nothing
 * posted or merged, only for what can never ship as the pull request stands: its head not the commit every must check
 * with a run last passed on, a required check red there, a conflict, closed, not into main or a draft (or no
 * SHIP_TOKEN, or no admin). Anything else puts it in Ship at once, its first step Ready to merge waiting with its
 * reason, and it starts at once if it may (startIfReady); its pull request merged already by an earlier ship of it,
 * it is shipped again the same way. Gives back the intent; null where the intent is no code intent at Proposal (it is
 * decided as before: ./intents.ts decideIntent, ./proposals.ts decide).
 */
export async function acceptAndShip(db: Db, gh: GitHub | null, me: Me | null, id: string) {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins keep the intents.");
  const first = await getIntent(db, id);
  if (first.stage !== "proposal" || first.work || !first.pull_request) return null;
  await db.transaction(async (tx) => {
    // one Accept at a time: a second press waits here, then finds it in Ship
    await tx.query(`SELECT 1 FROM play.intents WHERE id = $1 FOR UPDATE`, [first.id]);
    const intent = await getIntent(tx, first.id);
    if (intent.stage !== "proposal") refuse(`Intent ${intent.id} is at the ${intent.stage} stage now.`);
    if (!gh) refuse("play holds no SHIP_TOKEN, so it cannot merge: set the repository secret SHIP_TOKEN and deploy (deploy/README.md).");
    const missing = unmet(intent);
    if (missing.length) refuse(`Every must check passes before an intent is accepted: ${missing.join("; ")}.`);
    const pr = await gh!.pull(intent.pull_request).catch((e) => refuse(`Pull request #${intent.pull_request} could not be read: ${(e as Error).message}.`));
    const was: Ship | null = intent.ship ?? null;
    const at = now();
    let ship: Ship;
    if (pr.merged) {
      if (!was?.merge || was.pr !== pr.number || pr.merge_commit_sha !== was.merge)
        refuse(`Pull request #${pr.number} is merged already, and not by a ship of this intent: name the intent's open pull request (check_intent's pr).`);
      // shipped again: main's failed jobs run again (a red on main), else the release of the commit last merged
      const again = was!.again === "main" && was!.main_run ? "main" : "release";
      ship = {
        ...was!,
        by: me.name,
        round: was!.round + 1,
        accepted: at,
        front: undefined,
        started: at,
        steps: againSteps(at, was!.steps, again),
        report: null,
        ended: undefined,
        outcome: undefined,
        again: undefined,
        pending: { kind: again },
        main_after: again === "main" ? was!.main_attempt ?? 1 : undefined,
        past: [...(was!.past ?? []), ...[was!.release_run, was!.deploy_run].filter((r): r is number => !!r)],
        release_run: undefined,
        deploy_run: undefined,
      };
    } else {
      if (pr.state !== "open") refuse(`Pull request #${pr.number} is ${pr.state}: name the intent's open pull request (check_intent's pr).`);
      if (pr.base.ref !== "main") refuse(`Pull request #${pr.number} goes into ${pr.base.ref}: an intent's code goes into main.`);
      if (pr.draft) refuse(`Pull request #${pr.number} is a draft: it is marked ready (main's checks run then) before it is merged.`);
      const head = pr.head.sha;
      const stale = unmetOn(intent, head);
      if (stale.length)
        refuse(`What is merged is what was checked: every must check with a run passes on #${pr.number}'s head ${head.slice(0, 7)} first (bun play/avenbox/intent.ts ${intent.id} --record on it): ${stale.join("; ")}.`);
      if (pr.mergeable === false) refuse(`#${pr.number} does not merge into main as it is (a conflict): main is merged into its branch, and its checks run again on the new head.`);
      const runs = latestRuns(await gh!.checkRuns(head).catch((e) => refuse(`#${pr.number}'s checks could not be read: ${(e as Error).message}.`)));
      for (const name of REQUIRED_CHECKS) {
        const r = runs.get(name);
        if (r?.status === "completed" && r.conclusion !== "success") refuse(`'${name}' is ${r.conclusion} on #${pr.number}'s head ${head.slice(0, 7)}: it is green before it is merged.`);
      }
      ship = { pr: pr.number, head, merge: "", by: me.name, round: (was?.round ?? 0) + 1, accepted: at, started: at, steps: freshSteps(at), report: null, pending: { kind: "merge", head } };
    }
    await tx.query(`UPDATE play.intents SET stage = 'ship', ship = ($2::text)::jsonb, decided_by = $3, decided_at = now() WHERE id = $1`, [intent.id, JSON.stringify(ship), me.id]);
    console.log(`ship: intent ${intent.id} accepted by ${me.name}: in Ship (#${ship.pr}, ${ship.pending!.kind})`);
  });
  // its turn at once, where no ship is ahead of it and GitHub is ready; else the watcher starts it
  await startIfReady(db, gh!, first.id).catch((e) => console.warn(`ship: intent ${first.id} not started yet: ${(e as Error).message}`));
  return getIntent(db, first.id);
}

/**
 * A ship waiting in Ship (its `pending` set) started where it may: no other ship running (merged and not yet Accepted
 * or back at Proposal) and none waiting ahead of it (accepted earlier); and, for a merge, GitHub ready (mergeable
 * worked out, both required checks green on the checked head). Then 'Intent accepted' is posted on that head and the
 * pull request merged (or, shipped again, main's failed jobs run again or the release dispatched), and the watcher
 * follows it on. Waiting, its first step says why (queued behind whom, waiting for GitHub or for its checks); a red
 * check, a moved head, a conflict, a closed pull request, or 30 minutes first in line without GitHub or its checks
 * ready takes it back to Proposal with the report. One decision at a time, under the queue's lock.
 */
export async function startIfReady(db: Db, gh: GitHub, id: string, at = Date.now()) {
  return db.transaction(async (tx) => {
    await tx.query(`SELECT pg_advisory_xact_lock(${QUEUE_LOCK})`);
    const { rows: [row] } = await tx.query<any>(`SELECT id, title, ship, decided_at FROM play.intents WHERE id = $1 AND stage = 'ship' FOR UPDATE`, [id]);
    const was: Ship | undefined = row?.ship;
    if (!was?.pending) return;
    const ship: Ship = { ...was, steps: was.steps.map((s) => ({ ...s })) };
    const pending = was.pending;
    const ready = ship.steps.find((s) => s.key === "ready")!;
    const iso = new Date(at).toISOString();
    const save = (stage: "ship" | "proposal") =>
      tx.query(
        `UPDATE play.intents SET ship = ($2::text)::jsonb, stage = $3,
                decided_by = CASE WHEN $3 = 'proposal' THEN NULL ELSE decided_by END,
                decided_at = CASE WHEN $3 = 'proposal' THEN NULL ELSE decided_at END
          WHERE id = $1`,
        [id, JSON.stringify(ship), stage],
      );
    const red = async (why: string, link?: string) => {
      Object.assign(ready, { state: "red", finished: iso, note: why });
      ship.report = { step: ready.name, why, ...(link ? { link } : {}), log: "", at: iso };
      ship.outcome = "red";
      ship.ended = iso;
      ship.pending = null;
      ship.again = pending.kind === "merge" ? undefined : pending.kind;
      await save("proposal");
      console.log(`ship: intent ${id} is red before it started (${why}): back to Proposal`);
    };
    const wait = async (why: string, timed: boolean) => {
      if (timed && ship.front && at - Date.parse(ship.front) > WAIT_MOST_MS) return red(`${why}, for more than ${WAIT_MOST_MS / 60_000} minutes`);
      Object.assign(ready, { state: "running", note: why });
      if (stable(ship) !== stable(was)) await save("ship");
    };

    // its turn: no ship running, none waiting ahead of it
    const { rows: others } = await tx.query<any>(`SELECT id, title, ship, decided_at FROM play.intents WHERE stage = 'ship' AND id <> $1 AND coop_id = $2`, [id, COOP]);
    const time = (d: unknown) => new Date(d as any).getTime();
    const running = others.find((o) => o.ship && !o.ship.pending);
    const ahead = others
      .filter((o) => o.ship?.pending && (time(o.decided_at) < time(row.decided_at) || (time(o.decided_at) === time(row.decided_at) && o.id < id)))
      .sort((a, b) => time(b.decided_at) - time(a.decided_at))[0];
    // named for the one just before it: the last waiting ahead of it, else the one shipping
    const blocker = ahead ?? running;
    if (blocker) return wait(`Queued · behind ${blocker.title}`, false);
    if (!ship.front) ship.front = iso;

    if (pending.kind !== "merge") {
      try {
        if (pending.kind === "main") await gh.rerunFailed(ship.main_run!);
        else await gh.dispatch("release.yml", "main", { sha: ship.merge });
      } catch (e) {
        return red(`GitHub did not ${pending.kind === "main" ? "run main's failed jobs again" : "start the release again"}: ${(e as Error).message}`);
      }
      Object.assign(ready, { state: "green", finished: iso, note: pending.kind === "main" ? "main's failed jobs run again" : `the release of ${ship.merge.slice(0, 7)} started again` });
      ship.pending = null;
      ship.started = iso;
      await save("ship");
      console.log(`ship: intent ${id} shipped again (${pending.kind})`);
      return;
    }

    // a merge: GitHub ready, the head as checked, its checks green
    const pr = await gh.pull(ship.pr);
    if (pr.merged) return red(`#${pr.number} was merged while it waited, not by this ship`, pr.html_url);
    if (pr.state !== "open") return red(`#${pr.number} was closed while it waited`, pr.html_url);
    if (pr.draft) return red(`#${pr.number} was made a draft while it waited`, pr.html_url);
    if (pr.head.sha !== pending.head)
      return red(`#${pr.number}'s head moved from ${pending.head.slice(0, 7)} to ${pr.head.sha.slice(0, 7)} while it waited: its checks are recorded on the new head, then Accept again`, pr.html_url);
    if (pr.mergeable === false) return red(`#${pr.number} no longer merges into main (a conflict): main is merged into its branch, its checks run again, then Accept again`, pr.html_url);
    const runs = latestRuns(await gh.checkRuns(pending.head));
    const notYet: string[] = [];
    for (const name of REQUIRED_CHECKS) {
      const r = runs.get(name);
      if (r?.status === "completed" && r.conclusion !== "success") return red(`'${name}' is ${r.conclusion} on #${pr.number}'s head ${pending.head.slice(0, 7)}`, r.html_url);
      if (r?.status !== "completed") notYet.push(name);
    }
    if (notYet.length) return wait(`Waiting for #${pr.number}'s checks (${notYet.join(", ")})`, true);
    if (pr.mergeable === null) return wait(`Waiting for GitHub to work out whether #${pr.number} merges`, true);

    const by = ship.by;
    try {
      await gh.status(pending.head, { state: "success", description: `Accepted by ${by} on play`, target_url: intentLink(id) });
    } catch (e) {
      return red(`GitHub took no '${ACCEPTED_CONTEXT}' on #${pr.number}'s head: ${(e as Error).message}`, pr.html_url);
    }
    let merged: { sha: string };
    try {
      merged = await gh.merge(pr.number, pending.head, `${pr.title} (#${pr.number})`, `Accepted by ${by} on play: ${intentLink(id)}\n\nIntent: ${id}`);
    } catch (e) {
      await gh.status(pending.head, { state: "failure", description: "Accepted, but not merged: accept it again", target_url: intentLink(id) }).catch(() => {});
      return red(`GitHub did not merge #${pr.number}: ${(e as Error).message}`, pr.html_url);
    }
    Object.assign(ready, { state: "green", finished: iso, note: `#${pr.number} ready, its checks green` });
    Object.assign(ship.steps.find((s) => s.key === "merged")!, { state: "green", started: iso, finished: iso, link: pr.html_url, note: `#${pr.number} merged as ${merged.sha.slice(0, 7)}` });
    ship.merge = merged.sha;
    ship.pending = null;
    ship.started = iso;
    await save("ship");
    console.log(`ship: intent ${id}: #${pr.number} merged as ${merged.sha}`);
  });
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
  const { rows } = await db.query<{ id: string; ship: Ship }>(`SELECT id, ship FROM play.intents WHERE stage = 'ship' AND ship IS NOT NULL ORDER BY decided_at, id`);
  for (const { id, ship } of rows) {
    try {
      // waiting: its turn and GitHub (read again, as the ones before it may have moved on in this look)
      if (ship.pending) {
        await startIfReady(db, gh, id, at);
        continue;
      }
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
