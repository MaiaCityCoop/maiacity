// Accept ships it (play/SPEC.md §4.12 says it all; Samuel 2026-11-06). A code intent names its pull request into main;
// an admin's Accept at Proposal takes only a waiting intent (./substate.ts: the pull request as read then, its head the
// checked one, mergeable, its required checks green), puts it in Ship, where it waits its turn (one ship at a time, in
// the order accepted), then play reads GitHub again, posts 'Intent accepted' on the head and merges it (startIfReady).
// The ship watcher (./watcher.ts, every 10 s; its state the intent's `ship` in Postgres) follows main's checks, the release and the
// deploy's jobs as steps; any red, back to Proposal with the report; ended either way, it asks the reconcile. It also
// reads every open intent's pull request into its `pr_seen` (watchPulls), so the board asks GitHub nothing, and merges
// main into those behind it, a conflict shown failed (./mainmerge.ts, intent f28822d9). The reconcile (intent 9876ef00) is the one place a code intent becomes Accepted: play knows the commit
// it runs (PLAY_COMMIT, built into its image), and a code intent is Accepted exactly when its merge commit is in it; an
// Accepted one whose commit is not is flagged (ship.live false), its stage left alone. It runs once when play starts
// (every deploy, a rollback, a deploy by hand restarts play) and as each ship ends. An intent holding play's work beside
// its pull request (intent 7c8986c5) ships the same way, its work waiting while it does: the reconcile accepts its work
// (./versioned.ts decideWork, every document in one transaction) in the very step that marks it Accepted, so documents
// that need the new code land only once it runs; a red step brings it back to Proposal with its work still waiting.
// play only calls GitHub's API with SHIP_TOKEN, which never leaves this server.
import { admin, COOP, meOf, type Me } from "./access";
import type { Db, Queryable } from "./kit/pg";
import { canonical } from "./kit/hash";
import { ACCEPTED_CONTEXT, intentLink, keepSeen, readPull, type GitHub, type Job, type Pull, type Run } from "./github";
import { INTENT_ADMINS, byOf, decisions, gate, getIntent, mustMove } from "./intents";
import { carrySeen } from "./mainmerge";
import { decidable, prBlock, short, sub } from "./substate";
import type { BlobStore } from "./blobs";
import { decideWork } from "./versioned";
import { closeWork, workOf } from "./held";
import { HttpError } from "./kit/errors";
import { LOCK, lockSql } from "./kit/locks";

/** the store play's work is accepted with when the reconcile sees its code live (set by ./app.ts) */
export const shipWork: { store?: BlobStore } = {};

/** how long a step may wait for its run to appear before the ship is red */
const START_WITHIN_MS = 15 * 60_000;
/** how long a ship first in line waits for its pull request's checks or for GitHub before it is red */
const WAIT_MOST_MS = 30 * 60_000;
/** how many of the failed job's last log lines the report keeps */
const LOG_LINES = 60;
const LOG_MOST = 12_000;

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
  /** the reconcile's word (reconcile): whether its merge commit is in what play runs, that commit, and how it was Accepted */
  live?: boolean;
  commit?: string;
  note?: string;
};
type Pending = { kind: "merge"; head: string } | { kind: "main" } | { kind: "release" };

/** the way to production, in order: the merge, main's checks, the release, the deploy's jobs */
export const STEPS: { key: string; name: string; job?: string; step?: string }[] = [
  { key: "ready", name: "Ready to merge" },
  { key: "merged", name: "Merged into main" },
  { key: "main", name: "main's checks" },
  { key: "release", name: "Release" },
  { key: "image", name: "The image", job: "The image" },
  { key: "backup", name: "Backup", job: "The backup" },
  { key: "server", name: "The server", job: "The server" },
  { key: "website", name: "The website", job: "The website" },
];
const DEPLOY = STEPS.filter((s) => s.job);
const KEYS = new Set(STEPS.map((s) => s.key));

// ---- Accept and ship: Accept puts it in Ship at once; it starts when its turn comes and GitHub is ready

function refuse(why: string): never {
  throw new HttpError(why, 409);
}
const now = () => new Date().toISOString();
/** the first step's name, by what it waits to do */
const READY: Record<Pending["kind"], string> = { merge: "Ready to merge", main: "Ready to run main's checks again", release: "Ready to release again" };

/** a ship's steps: its first step waiting to do `restart`, what went before it kept (none for a merge), the rest to come */
function stepsFor(at: string, from: Step[], restart: Pending["kind"]): Step[] {
  const i = restart === "merge" ? 1 : STEPS.findIndex((s) => s.key === restart);
  return STEPS.map((s, j) =>
    s.key === "ready"
      ? { key: s.key, name: READY[restart], state: "running", started: at, note: "Accepted" }
      : j < i
        ? from.find((f) => f.key === s.key) ?? { key: s.key, name: s.name, state: "green" }
        : { key: s.key, name: s.name, state: "queued" },
  );
}

/** a ship kept on its intent, in Ship still or back at Proposal (undecided); only the reconcile makes it Accepted */
export const saveShip = (q: Pick<Db, "query">, id: string, ship: Ship, stage: "ship" | "proposal") =>
  q.query(
    `UPDATE play.intents SET ship = ($2::text)::jsonb, stage = $3, decided_by = CASE WHEN $3 = 'proposal' THEN NULL ELSE decided_by END,
            decided_at = CASE WHEN $3 = 'proposal' THEN NULL ELSE decided_at END, auto = CASE WHEN $3 = 'proposal' THEN auto - 'accept' ELSE auto END
      WHERE id = $1 AND stage = 'ship'`,
    [id, JSON.stringify(ship), stage],
  );

/**
 * An admin's Accept on an intent at Proposal whose work is code (it names its pull request). Its pull request is read
 * first (kept as its pr_seen), and only a waiting intent is taken (./substate.ts: open into main, not a draft, its head
 * the commit every must check with a run last passed on, mergeable, the required checks green; or red after its merge,
 * shipped again), else refused with why, nothing posted or merged (or no SHIP_TOKEN, or no admin). Taken, it is in Ship
 * at once, its first step Ready to merge, and starts at once if its turn has come (startIfReady); its pull request
 * merged already by an earlier ship of it, it is shipped again the same way. Gives back the intent; null where the
 * intent is no code intent at Proposal (it is decided as before: ./intents.ts decideIntent, ./versioned.ts decide).
 */
export async function acceptAndShip(db: Db, gh: GitHub | null, who: Me | null, id: string) {
  // (one holding play's work beside its pull request too, intent 7c8986c5: its work waits on it in Ship, ./held.ts WORK_STATUS)
  const me = admin(who, INTENT_ADMINS);
  // who Accepted, as the ship shows it: a person, or a rule (./rules.ts)
  const who_ = me.auto ? `rule ${me.auto.label}` : me.name;
  const first = await getIntent(db, id);
  if (!first.pull_request) return null;
  await mustMove(db, first, "ship");
  if (!gh) refuse("play holds no SHIP_TOKEN, so it cannot merge: set the repository secret SHIP_TOKEN and deploy (deploy/README.md).");
  const read = await readPull(gh!, first.pull_request).catch((e) => refuse(`Pull request #${first.pull_request} could not be read: ${(e as Error).message}.`));
  const pr = read.pr;
  // what play keeps of its main merge goes on (./mainmerge.ts): main merged in and GitHub not done yet is working
  const seen = carrySeen((first as any).pr_seen, read.seen);
  await keepSeen(db, first.id, seen);
  await db.transaction(async (tx) => {
    // one Accept at a time: a second press waits here, then finds it in Ship
    await tx.query(`SELECT 1 FROM play.intents WHERE id = $1 FOR UPDATE`, [first.id]);
    const intent = await getIntent(tx, first.id);
    await mustMove(tx, intent, "ship");
    const s = sub.of({ ...intent, pr_seen: seen }, seen);
    if (!decidable(intent, s)) refuse(s ? `${s.why}.` : `Intent ${intent.id} is at the ${intent.stage} stage now.`);
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
        by: who_,
        round: was!.round + 1,
        accepted: at,
        front: undefined,
        started: at,
        steps: stepsFor(at, was!.steps, again),
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
      const head = pr.head.sha;
      ship = { pr: pr.number, head, merge: "", by: who_, round: (was?.round ?? 0) + 1, accepted: at, started: at, steps: stepsFor(at, [], "merge"), report: null, pending: { kind: "merge", head } };
    }
    // the one decision path (./intents.ts decided): a person's Accept, or a rule's
    await decisions.decided(tx, intent.id, "ship", byOf(me), { ship });
    console.log(`ship: intent ${intent.id} accepted by ${who_}: in Ship (#${ship.pr}, ${ship.pending!.kind})`);
  });
  // its turn at once, where no ship is ahead of it; else the watcher starts it
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
    await tx.query(lockSql(LOCK.shipQueue));
    const { rows: [row] } = await tx.query<any>(`SELECT id, title, ship, decided_at, spec, results FROM play.intents WHERE id = $1 AND stage = 'ship' FOR UPDATE`, [id]);
    const was: Ship | undefined = row?.ship;
    if (!was?.pending) return;
    const ship: Ship = { ...was, steps: was.steps.map((s) => ({ ...s })) };
    const pending = was.pending;
    const ready = ship.steps.find((s) => s.key === "ready")!;
    const iso = new Date(at).toISOString();
    const save = (stage: "ship" | "proposal") => saveShip(tx, id, ship, stage);
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
      if (canonical(ship) !== canonical(was)) await save("ship");
    };

    // the gate (./intents.ts mayMove): a dependency ahead of it in Ship is waited for; one gone back takes it back too
    const no = await gate.mayMove(tx, id, "merge");
    if (no) return no.wait ? wait(no.why, false) : red(no.why);

    // its turn: no ship running, none waiting ahead of it
    const { rows: others } = await tx.query<any>(`SELECT id, title, ship, decided_at FROM play.intents WHERE stage = 'ship' AND id <> $1 AND coop_id = $2`, [id, COOP]);
    const time = (d: unknown) => new Date(d as any).getTime();
    // one ended (green, waiting for the reconcile to find it live) runs no more
    const running = others.find((o) => o.ship && !o.ship.pending && !o.ship.outcome);
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

    // a merge: GitHub ready, the head as checked, its checks green (./substate.ts prBlock, at the head it was accepted on)
    const { pr, seen, runs } = await readPull(gh, ship.pr, at);
    await keepSeen(tx, id, seen);
    const block = prBlock(row, seen, pending.head);
    if (block?.state === "failed") return red(block.why, (block.why.startsWith("'") && runs.get(block.why.split("'")[1])?.html_url) || pr.html_url);
    if (block) return wait(block.why, true);

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
      await gh.status(pending.head, { state: "failure", description: "Accepted, but not merged: accept it again", target_url: intentLink(id) }).catch((e) => console.warn(`ship: intent ${id}: not merged, and its head not marked so: ${(e as Error).message}`));
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

// ---- one look at a ship on its way (./watcher.ts looks every 10 s)

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
  } else if (ship.steps.every((s) => done(s.state) || !KEYS.has(s.key))) {
    // a step the way no longer has (a ship begun before it changed: Main is green, intent 5ab64b8e) waits for nothing
    ship.outcome = "green";
    ship.ended = new Date(at).toISOString();
  }
  return ship;
}

// ---- the reconcile: a code intent's stage agrees with what play runs (intent 9876ef00)

/** the commit play runs: PLAY_COMMIT, built into its image (production.yml), a 40-character sha; else null */
export function runningCommit(env: Record<string, string | undefined> = process.env): string | null {
  const c = env.PLAY_COMMIT?.trim().toLowerCase();
  return c && /^[0-9a-f]{40}$/.test(c) ? c : null;
}

/** how many pages of 100 commits a walk of history reads at most */
const HISTORY_PAGES = 200;
const UUID = /^Intent:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/gim;

/** every commit `ref` reaches, itself included, with its message */
async function history(gh: GitHub, ref: string) {
  const all = new Map<string, string>();
  for (let page = 1; page <= HISTORY_PAGES; page++) {
    const list = await gh.commits(ref, page);
    for (const c of list) all.set(c.sha, c.commit?.message ?? "");
    if (list.length < 100) return all;
  }
  throw new Error(`the history of ${ref.slice(0, 12)} is longer than ${HISTORY_PAGES * 100} commits`);
}

/** the commits of main naming each intent by its trailer `Intent: <UUID>` */
function trailersOf(main: Map<string, string>) {
  const by = new Map<string, string[]>();
  for (const [sha, message] of main) for (const m of message.matchAll(UUID)) by.set(m[1].toLowerCase(), [...(by.get(m[1].toLowerCase()) ?? []), sha]);
  return by;
}

type Reconciled = { commit: string; accepted: string[]; flagged: string[]; cleared: string[] };

/**
 * The one place a code intent becomes Accepted. A code intent is one that names a pull request (with play's work beside
 * it or not, intent 7c8986c5), or one with no work of play's whose trailer `Intent: <its UUID>` is on a commit of main; its merge commit is its pull request's (the ship's, or
 * GitHub's for one merged by hand), else its commits on main. Against `commit`, the commit play runs:
 * - its merge commit in it (an ancestor, or itself) and it at Build, Proposal, Archived, or in Ship with its ship ended
 *   → **Accepted**, its ship saying how (live at the commit, by the reconcile), and the work of play's it holds accepted
 *   in that same transaction (acceptWorkLive);
 * - Accepted (or ended in Ship) and its merge commit not in it (rolled back, closed unmerged, never deployed) → flagged,
 *   `ship.live` false with the running commit, its stage left alone; once play runs it again the flag clears.
 * A ship still on its way (waiting or running) is the watcher's, and asks the reconcile as it ends.
 */
export async function reconcile(db: Db, gh: GitHub, commit: string): Promise<Reconciled> {
  const live = await history(gh, commit);
  const trailers = trailersOf(await history(gh, "main"));
  const { rows } = await db.query<{ id: string; stage: string; pull_request: number | null; ship: Ship | null }>(
    `SELECT id, stage, pull_request, ship FROM play.intents
      WHERE coop_id = $1 AND stage IN ('build', 'proposal', 'ship', 'archived', 'accepted')
        AND (pull_request IS NOT NULL OR (work IS NULL AND id = ANY($2::uuid[]))) ORDER BY created, id`,
    [COOP, [...trailers.keys()]],
  );
  const out: Reconciled = { commit, accepted: [], flagged: [], cleared: [] };
  for (const i of rows) {
    // on its way still: the watcher's, which asks again as it ends
    if (i.stage === "ship" && (i.ship?.pending || !i.ship?.outcome)) continue;
    let merges: string[];
    try {
      if (i.pull_request) {
        const shipped = i.ship?.pr === i.pull_request && i.ship.merge ? i.ship.merge : null;
        const pr = shipped ? null : await gh.pull(i.pull_request);
        const merge = shipped ?? (pr?.merged ? pr.merge_commit_sha : null);
        merges = merge ? [merge] : [];
      } else merges = trailers.get(i.id) ?? [];
    } catch (e) {
      console.warn(`reconcile: intent ${i.id} not looked at: ${(e as Error).message}`);
      continue;
    }
    const isLive = merges.length > 0 && merges.every((m) => live.has(m));
    const merge = merges[0] ?? null;
    const patch = (p: Partial<Ship>) => JSON.stringify({ ...p, merge: i.ship?.merge || merge || "" });
    if (isLive && i.stage !== "accepted") {
      const note = `Live at ${short(commit)}, ${merges.length > 1 ? `its ${merges.length} commits on main` : `its merge ${short(merge!)}`} in what play runs: Accepted by the reconcile`;
      const done = await db.transaction(async (tx) => {
        const { rows: done } = await tx.query(
          `UPDATE play.intents SET stage = 'accepted', decided_at = now(), decided_by = CASE WHEN stage = 'ship' THEN decided_by END,
                  ship = COALESCE(ship, jsonb_build_object('pr', pull_request, 'steps', '[]'::jsonb)) || ($3::text)::jsonb
            WHERE id = $1 AND stage = $2 RETURNING id`,
          [i.id, i.stage, patch({ live: true, commit, note })],
        );
        if (done.length) await acceptWorkLive(tx, i.id);
        return done;
      });
      if (done.length) {
        out.accepted.push(i.id);
        console.log(`reconcile: intent ${i.id} (${i.stage}) is live at ${short(commit)}: accepted`);
      }
    } else if (!isLive && (i.stage === "accepted" || i.stage === "ship") && (i.ship?.live !== false || i.ship.commit !== commit)) {
      await db.query(
        `UPDATE play.intents SET ship = COALESCE(ship, jsonb_build_object('pr', pull_request, 'steps', '[]'::jsonb)) || ($3::text)::jsonb WHERE id = $1 AND stage = $2`,
        [i.id, i.stage, patch({ live: false, commit })],
      );
      out.flagged.push(i.id);
      console.warn(`reconcile: intent ${i.id} is ${i.stage} but not live: production runs ${short(commit)}`);
    } else if (isLive && i.ship?.live === false) {
      await db.query(`UPDATE play.intents SET ship = ship || ($2::text)::jsonb WHERE id = $1 AND stage = 'accepted'`, [i.id, JSON.stringify({ live: true, commit })]);
      out.cleared.push(i.id);
      console.log(`reconcile: intent ${i.id} is live again at ${short(commit)}`);
    }
  }
  return out;
}

/**
 * The work of play's intent `id` holds, accepted in the reconcile's transaction as its code is seen live (intent
 * 7c8986c5): every document in one step (./versioned.ts decideWork), by whoever Accepted it (its decided_by, else the
 * rule kept in its auto, as its author). Where it does not go in (a document's Main moved on and clashes, no admin to
 * decide it, no store), its code stays Accepted, live as it is, and its work is closed, kept in the history, the ship's
 * note saying why: a new intent proposes it again.
 */
async function acceptWorkLive(tx: Queryable, id: string) {
  const p = await workOf(tx, id, true);
  if (!p?.kind || !p.variants?.some((v: any) => v.doc_variant != null)) return;
  const { rows: open } = await tx.query(`SELECT 1 FROM play.intent_variants iv JOIN play.doc_variants v ON v.id = iv.variant_id WHERE iv.intent_id = $1 AND v.status IN ('open', 'proposed')`, [id]);
  if (!open.length) return;
  const { rows: [r] } = await tx.query<{ decided_by: string | null; author: string | null; proposed_by: string | null; auto: any }>(
    `SELECT decided_by, author, proposed_by, COALESCE(i.auto, '{}'::jsonb) AS auto FROM play.intents i WHERE id = $1`, [id],
  );
  const rule = r?.auto?.accept ?? null;
  let me = await meOf(tx, r?.decided_by ?? r?.author ?? r?.proposed_by ?? null);
  if (me && !r?.decided_by && rule) me = { ...me, auto: { rule: rule.rule, label: rule.label, rules: rule.rules, reason: rule.reason } };
  const why = async (text: string) => {
    await closeWork(tx, me, { id });
    await tx.query(`UPDATE play.intents SET ship = COALESCE(ship, '{}'::jsonb) || jsonb_build_object('work', ($2::text)) WHERE id = $1`, [id, text]);
    console.warn(`reconcile: intent ${id}'s work of play's not accepted: ${text}`);
  };
  if (me?.level !== "admin") return why("no admin to accept its work of play's: its code is live, propose its work again in an intent of its own");
  if (!shipWork.store) return why("play holds no store to accept its work with");
  await tx.query(`SAVEPOINT work_live`);
  const out: any = await decideWork(tx, { db: tx as any, store: shipWork.store }, me, p, "accept").catch((e) => ({ status: "failed", message: (e as Error).message }));
  if (out?.status === "accepted") {
    // its decision left it Accepted by whoever decided it; the reconcile's own note stands on its ship
    await tx.query(`RELEASE SAVEPOINT work_live`);
    return;
  }
  await tx.query(`ROLLBACK TO SAVEPOINT work_live`);
  await why(`its work of play's did not go in: ${out?.message ?? "refused"}`);
}

/**
 * An admin's Accept on an intent at Proposal with no work of play's and no pull request named: one whose code is on
 * main (its trailer on a commit of main) is no decision of a person's but the reconcile's, Accepted once play runs it,
 * else refused with why; null where it names no code (./intents.ts decideIntent accepts it as before). Without GitHub
 * (no SHIP_TOKEN) play cannot tell code from a decision: null too.
 */
export async function acceptCode(db: Db, gh: GitHub | null, who: Me | null, id: string, commit: string | null = runningCommit()) {
  const me = admin(who, INTENT_ADMINS);
  const intent = await getIntent(db, id);
  if (intent.work || intent.pull_request || !gh) return null;
  await mustMove(db, intent, "accept");
  const on = trailersOf(await history(gh, "main")).get(intent.id);
  if (!on?.length) return null;
  if (!commit) refuse("Its code is on main, and play knows no commit of its own (PLAY_COMMIT) to find it in: it is Accepted once play runs it.");
  await reconcile(db, gh, commit!);
  const now = await getIntent(db, intent.id);
  if (now.stage !== "accepted")
    refuse(`Its code is on main (${on.map((s) => s.slice(0, 7)).join(", ")}), not yet in what play runs (${commit!.slice(0, 7)}): it is Accepted by itself once production runs it.`);
  if (!me.auto) await db.query(`UPDATE play.intents SET decided_by = COALESCE(decided_by, $2) WHERE id = $1`, [intent.id, me.id]);
  return getIntent(db, intent.id);
}
