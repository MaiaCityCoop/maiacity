// Accept ships it (play/SPEC.md §4.12; Samuel 2026-11-06; intent f7721142): Accept puts the pull request in GitHub's
// merge queue at once, which tests main plus its batch once and moves main; Ship follows it (./watcher.ts) through main's
// checks, the release and the deploy to the reconcile (intent 9876ef00). SHIP_TOKEN never leaves this server.
import { admin, meOf, type Me } from "./access";
import { COOP, intentsIn } from "./kit/ids";
import type { Db, Queryable } from "./kit/pg";
import { ACCEPTED_CONTEXT, GitHubError, intentLink, quiet, keepSeen, keptFrom, postStatus, readPull, wake, type GitHub, type Job, type QueueEntry, type Run } from "./github";
import { INTENT_ADMINS, byOf, decisions, getIntent, mustMove } from "./intents";
import { decidable, short, sub } from "./substate";
import type { BlobStore } from "./blobs";
import { decideWork } from "./versioned";
import { closeWork, workOf } from "./held";
import { HttpError } from "./kit/errors";

/** how long a step may wait for its run to appear before the ship is red */
const START_WITHIN_MS = 15 * 60_000;
const LOG_LINES = 60;
const LOG_MOST = 12_000;
/** deploy/README.md's line, while main's ruleset has no merge queue */
export const NO_QUEUE = "Main's ruleset has no merge queue yet: an admin applies it with deploy/ruleset.sh (deploy/README.md), then Accept again.";

export type StepState = "queued" | "running" | "green" | "red" | "skipped";
export type Step = { key: string; name: string; state: StepState; started?: string; finished?: string; link?: string; note?: string };
export type Report = { step: string; why: string; link?: string; log: string; at: string };
export type Ship = {
  pr: number;
  head: string;
  /** its merge commit, made by the merge queue */
  merge: string;
  /** the commit main was pushed to with it: its batch's, whose main's checks, release and deploy it shares */
  landed?: string;
  /** its merge group's commit as last seen in the queue */
  group?: string;
  by: string;
  round: number;
  /** when this round began: the Accept that enqueued it, or shipped it again */
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
  /** what a failed round after its merge leaves for the next Accept: main's failed jobs run again, else the release */
  again?: "main" | "release";
  accepted?: string;
  /** the reconcile's word (reconcile): whether its merge commit is in what play runs, that commit, and how it was Accepted */
  live?: boolean;
  commit?: string;
  note?: string;
};

export const STEPS: { key: string; name: string; job?: string; step?: string }[] = [
  { key: "queued", name: "In the merge queue" },
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

// ---- Accept: into the merge queue at once (or, merged already and red after, shipped again)

function refuse(why: string): never {
  throw new HttpError(why, 409);
}
const now = () => new Date().toISOString();

/** the steps from `restart` on queued again, those before it kept */
const stepsFor = (from: Step[], restart: string): Step[] =>
  STEPS.map((s, j) => (j < STEPS.findIndex((x) => x.key === restart) ? from.find((f) => f.key === s.key) ?? { key: s.key, name: s.name, state: "green" } : { key: s.key, name: s.name, state: "queued" }));

/** a ship kept on its intent, in Ship still or back at Proposal (undecided); only the reconcile makes it Accepted */
export const saveShip = (q: Pick<Db, "query">, id: string, ship: Ship, stage: "ship" | "proposal") =>
  q.query(
    `UPDATE play.intents SET ship = ($2::text)::jsonb, stage = $3, decided_by = CASE WHEN $3 = 'proposal' THEN NULL ELSE decided_by END,
            decided_at = CASE WHEN $3 = 'proposal' THEN NULL ELSE decided_at END, auto = CASE WHEN $3 = 'proposal' THEN auto - 'accept' ELSE auto END
      WHERE id = $1 AND stage = 'ship'`,
    [id, JSON.stringify(ship), stage],
  );

/** An admin's Accept on a code intent: only a waiting one (./substate.ts), else refused; null for no code intent. */
export async function acceptAndShip(db: Db, gh: GitHub | null, who: Me | null, id: string) {
  // (one holding play's work beside its pull request too, intent 7c8986c5: its work waits on it in Ship, ./held.ts WORK_STATUS)
  const me = admin(who, INTENT_ADMINS);
  const who_ = me.auto ? `rule ${me.auto.label}` : me.name;
  const first = await getIntent(db, id);
  if (!first.pull_request) return null;
  await mustMove(db, first, "ship");
  if (!gh) refuse("play holds no SHIP_TOKEN, so it cannot ship: set the repository secret SHIP_TOKEN and deploy (deploy/README.md).");
  const read = await readPull(gh!, first.pull_request).catch((e) => refuse(`Pull request #${first.pull_request} could not be read: ${(e as Error).message}.`));
  const pr = read.pr, seen = keptFrom(first.pr_seen, read.seen);
  if (!pr.merged && !(await gh!.mergeQueue("main"))) refuse(NO_QUEUE);
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
      if (!was?.merge || was.pr !== pr.number) refuse(`Pull request #${pr.number} is merged already, and not by a ship of this intent: name the intent's open pull request (check_intent's pr).`);
      // shipped again: main's failed jobs run again (a red on main), else the release of the commit it landed in
      const again = was!.again === "main" && was!.main_run ? "main" : "release";
      try {
        if (again === "main") await gh!.rerunFailed(was!.main_run!);
        else await gh!.dispatch("release.yml", "main", { sha: was!.landed ?? was!.merge });
      } catch (e) {
        refuse(`GitHub did not ${again === "main" ? "run main's failed jobs again" : "start the release again"}: ${(e as Error).message}`);
      }
      ship = {
        ...was!, by: who_, round: was!.round + 1, accepted: at, started: at, steps: stepsFor(was!.steps, again), report: null, ended: undefined, outcome: undefined, again: undefined,
        main_after: again === "main" ? was!.main_attempt ?? 1 : undefined, release_run: undefined, deploy_run: undefined,
        past: [...(was!.past ?? []), ...[was!.release_run, was!.deploy_run].filter((r): r is number => !!r)],
      };
    } else {
      // the head checked, posted 'Intent accepted' (main's ruleset requires it on the head enqueued), then queued at that head
      const head = pr.head.sha;
      await postStatus(tx, gh!, intent.id, seen, ACCEPTED_CONTEXT, "success", `Accepted by ${who_} on play`, { head }).catch((e) =>
        refuse(`GitHub took no '${ACCEPTED_CONTEXT}' on #${pr.number}'s head: ${(e as Error).message}`));
      let entry: { position: number } | null;
      try {
        entry = await gh!.enqueue(pr.node_id ?? "", head);
      } catch (e) {
        await postStatus(tx, gh!, intent.id, seen, ACCEPTED_CONTEXT, "failure", "Accepted, but not queued: accept it again", { head }).catch(() => {});
        refuse(`GitHub did not queue #${pr.number}: ${(e as Error).message}`);
      }
      const steps = stepsFor([], "queued");
      Object.assign(steps[0], { state: "running", started: at, link: pr.html_url, note: `Queued by ${who_}${entry?.position ? ` · ${ordinal(entry.position)} in the merge queue` : ""}` });
      ship = { pr: pr.number, head, merge: "", by: who_, round: (was?.round ?? 0) + 1, accepted: at, started: at, steps, report: null };
    }
    // the one decision path (./intents.ts decided): a person's Accept, or a rule's
    await decisions.decided(tx, intent.id, "ship", byOf(me), { ship });
    console.log(`ship: intent ${intent.id} accepted by ${who_}: ${pr.merged ? "shipped again" : `#${ship.pr} in the merge queue`}`);
  });
  return getIntent(db, first.id);
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

/**
 * 'Intent accepted' on each merge group's commit (intent f7721142): success only when play accepted every pull request
 * in it (its entry and every one ahead of it), else failure naming the first not accepted; each line once per commit.
 */
export async function acceptGroups(db: Db, gh: GitHub, posted: Map<string, string>) {
  const entries = await gh.mergeQueue("main");
  if (!entries?.length) return;
  const { rows } = await db.query<{ id: string; pr: number }>(`SELECT id, (ship->>'pr')::int AS pr FROM play.intents WHERE coop_id = $1 AND stage = 'ship' AND ship->>'merge' = ''`, [COOP]);
  const by = new Map(rows.map((r) => [r.pr, r.id]));
  for (const [i, e] of entries.entries()) {
    if (!e.group) continue;
    const prs: number[] = entries.slice(0, i + 1).map((x: QueueEntry) => x.pr);
    const not = prs.find((n) => !by.has(n));
    const state = not === undefined ? "success" : "failure";
    const description = not === undefined ? `Accepted on play: ${prs.map((n) => `#${n}`).join(", ")}` : `#${not} is not accepted on play`;
    if (posted.get(e.group) === `${state} ${description}`) continue;
    await gh.status(e.group, { state, description, context: ACCEPTED_CONTEXT, ...(not === undefined ? { target_url: intentLink(by.get(e.pr)!) } : {}) });
    posted.set(e.group, `${state} ${description}`);
  }
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
const iso = (ms: number) => new Date(ms).toISOString();

/** the first push to main since `since` whose commit holds `merge`: the batch the queue landed it in */
async function landedIn(gh: GitHub, merge: string, since: number) {
  const runs = (await gh.runs("main.yml", { event: "push", created: `>=${iso(since).replace(/\.\d+Z$/, "Z")}` })).sort((a, b) => startOf(a) - startOf(b) || a.id - b.id);
  for (const r of runs) if (r.head_sha === merge || ["ahead", "identical"].includes((await gh.compare(merge, r.head_sha).catch(() => null))?.status ?? "")) return r.head_sha;
  return undefined;
}

export function tailOf(log: string, lines = LOG_LINES) {
  const all = log
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/^\uFEFF?\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z ?/, "").replace(/\x1b\[[0-9;]*m/g, ""));
  while (all.length && !all[all.length - 1].trim()) all.pop();
  const tail = all.slice(-lines).join("\n");
  return tail.length > LOG_MOST ? `…${tail.slice(tail.length - LOG_MOST + 1)}` : tail;
}

export async function advance(gh: GitHub, was: Ship, at = Date.now()): Promise<Ship> {
  const ship: Ship = { ...was, steps: was.steps.map((s) => ({ ...s })) };
  const step = (key: string) => ship.steps.find((s) => s.key === key)!;
  const since = Date.parse(ship.started) - 5_000;
  const set = (key: string, state: StepState, more: Partial<Step> = {}) => Object.assign(step(key), { state }, more);
  const late = (from: string | undefined) => at - Date.parse(from ?? ship.started) > START_WITHIN_MS;
  let failed: { key: string; why: string; link?: string; job?: number; run?: number } | null = null;
  // a ship begun before Ship was the merge queue and never merged: accepted again, it is queued
  if (!ship.merge && !ship.steps.some((s) => s.key === "queued"))
    return { ...ship, outcome: "red", ended: iso(at), report: { step: "Ready to merge", why: "Ship is GitHub's merge queue now: Accept it again", log: "", at: iso(at) } };

  // the merge queue: queued (its place, its group's checks), merged (its merge commit), or removed (back to Proposal)
  if (!ship.merge) {
    const q = await gh.queued(ship.pr);
    const checks = async (group: string | null | undefined) => (group ? await gh.checkRuns(group).catch(() => [] as any[]) : []);
    if (q.merged && q.merge) {
      set("queued", "green", { finished: iso(at) });
      set("merged", "green", { started: iso(at), finished: iso(at), note: `#${ship.pr} merged as ${short(q.merge)}` });
      ship.merge = q.merge;
    } else if (q.merged || (q.state === "OPEN" && !q.entry && !(q.removed && Date.parse(q.removed.at) >= since) && !late(ship.started))) {
      // merged and its commit not named yet, or just queued and not listed yet: the next look
    } else if (q.entry && q.state === "OPEN") {
      ship.group = q.entry.group ?? ship.group;
      const runs = await checks(q.entry.group);
      const ran = runs.filter((r) => r.status === "completed").length;
      const what = q.entry.group ? `its group ${short(q.entry.group)}: ${runs.length ? `${ran} of ${runs.length} checks done` : "its checks to start"}` : (q.entry.state ?? "").toLowerCase();
      set("queued", "running", { note: `${ordinal(q.entry.position)} in the merge queue · ${what}` });
    } else {
      // GitHub removed it (a red check on its group, a conflict, a timeout, by hand): only it goes back, the queue goes on
      const bad = (await checks(ship.group ?? q.removed?.group)).find((r) => r.status === "completed" && !["success", "neutral", "skipped"].includes(r.conclusion));
      const why = q.state !== "OPEN" ? `#${ship.pr} was ${q.state.toLowerCase()} while queued` : `GitHub removed #${ship.pr} from the merge queue${q.removed?.reason ? ` (${q.removed.reason.toLowerCase().replace(/_/g, " ")})` : ""}`;
      failed = { key: "queued", why: bad ? `${why}: '${bad.name}' is ${bad.conclusion} on its group ${short(ship.group ?? q.removed?.group ?? "")}` : why, link: bad?.html_url };
    }
  }
  // main's checks: main.yml's run for the push that landed it (its batch's; tested-tree.sh passes it at once)
  const main = step("main");
  if (!failed && ship.merge && !done(main.state)) {
    ship.landed ??= await landedIn(gh, ship.merge, since);
    const runs = !ship.landed ? [] : (await gh.runs("main.yml", { head_sha: ship.landed, event: "push" })).filter(
      (r) => (ship.main_after ? (r.run_attempt ?? 1) > ship.main_after : startOf(r) >= since),
    );
    const run = latest(runs);
    if (run) {
      ship.main_run = run.id;
      ship.main_attempt = run.run_attempt ?? 1;
      set("main", runState(run, "red"), { link: run.html_url, started: stamp(run.run_started_at ?? run.created_at), finished: run.status === "completed" ? stamp(run.updated_at) : undefined });
      if (main.state === "red") failed = { key: "main", why: `main's checks are ${run.conclusion} on ${short(ship.landed!)}`, link: run.html_url, run: run.id };
    } else if (late(step("merged").finished)) {
      set("main", "red");
      failed = { key: "main", why: `no run of main.yml for a push with ${short(ship.merge)} began within ${START_WITHIN_MS / 60_000} minutes` };
    }
  }
  // the release: release.yml's run named for the merge commit (after main is green, or dispatched again)
  const release = step("release");
  if (!failed && done(main.state) && !done(release.state)) {
    const created = new Date(since).toISOString().replace(/\.\d+Z$/, "Z");
    const runs = (await gh.runs("release.yml", { created: `>=${created}` })).filter(
      (r) => r.display_title === `release ${ship.landed ?? ship.merge}` && startOf(r) >= since && !ship.past?.includes(r.id),
    );
    const run = latest(runs);
    if (run) {
      ship.release_run = run.id;
      set("release", runState(run, "red"), { link: run.html_url, started: stamp(run.run_started_at ?? run.created_at), finished: run.status === "completed" ? stamp(run.updated_at) : undefined });
      if (release.state === "red") failed = { key: "release", why: `the release is ${run.conclusion}`, link: run.html_url, run: run.id };
    } else if (late(main.finished)) {
      set("release", "red");
      failed = { key: "release", why: `no release.yml run for ${short(ship.landed ?? ship.merge)} began within ${START_WITHIN_MS / 60_000} minutes of main's checks` };
    }
  }
  // the deploy: production.yml's run on production at the merge commit, and its jobs
  if (!failed && done(release.state) && DEPLOY.some((d) => !done(step(d.key).state))) {
    const run = latest(
      (await gh.runs("production.yml", { head_sha: ship.landed ?? ship.merge, event: "workflow_dispatch" })).filter((r) => startOf(r) >= since && !ship.past?.includes(r.id)),
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
      failed = { key: DEPLOY[0].key, why: `no production.yml run for ${short(ship.landed ?? ship.merge)} began within ${START_WITHIN_MS / 60_000} minutes of the release` };
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
    ship.again = failed.key === "queued" ? undefined : failed.key === "main" ? "main" : "release";
  } else if (ship.steps.every((s) => done(s.state) || !KEYS.has(s.key))) {
    // a step the way no longer has (a ship begun before it changed: Main is green, intent 5ab64b8e) waits for nothing
    ship.outcome = "green";
    ship.ended = new Date(at).toISOString();
  }
  return ship;
}

// ---- the reconcile: a code intent's stage agrees with what play runs (intent 9876ef00)

/** PLAY_COMMIT, built into its image (production.yml) */
export function runningCommit(env: Record<string, string | undefined> = process.env): string | null {
  const c = env.PLAY_COMMIT?.trim().toLowerCase();
  return c && /^[0-9a-f]{40}$/.test(c) ? c : null;
}

/** a merge is in what play runs where GitHub's compare of it against `commit` is behind or identical: one call each, kept */
function inCommit(gh: GitHub, commit: string) {
  const seen = new Map<string, Promise<boolean>>();
  return (sha: string) => {
    if (!seen.has(sha)) seen.set(sha, gh.compare(commit, sha).then((c) => c.status === "behind" || c.status === "identical", (e) => (e instanceof GitHubError && e.status === 404 ? false : Promise.reject(e))));
    return seen.get(sha)!;
  };
}

/** the commits on main whose trailer names one of `of`, main read back only to the oldest one's creation */
async function trailers(gh: GitHub, of: { id: string; created: string | Date }[]) {
  const by = new Map<string, string[]>(), want = new Set(of.map((i) => i.id));
  if (!of.length) return by;
  const since = new Date(Math.min(...of.map((i) => new Date(i.created).getTime()))).toISOString();
  for (let page = 1; ; page++) {
    const list = await gh.commits("main", page, since);
    for (const c of list) for (const id of intentsIn(c.commit?.message ?? "")) if (want.has(id)) by.set(id, [...(by.get(id) ?? []), c.sha]);
    if (list.length < 100) return by;
  }
}

type Reconciled = { commit: string; accepted: string[]; flagged: string[]; cleared: string[] };

/** The one place a code intent becomes Accepted: its merge in what play runs (intent 9876ef00), else flagged; `only` the watcher's (green in Ship) */
export async function reconcile(db: Db, gh: GitHub, store: BlobStore, commit: string, only?: string[]): Promise<Reconciled> {
  const { rows } = await db.query<{ id: string; stage: string; pull_request: number | null; ship: Ship | null; created: Date }>(
    `SELECT id, stage, pull_request, ship, created FROM play.intents
      WHERE coop_id = $1 AND stage IN ('build', 'proposal', 'ship', 'archived', 'accepted') AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))
        AND (pull_request IS NOT NULL OR (work IS NULL AND (stage IN ('build', 'proposal') OR (stage = 'accepted' AND ship->>'merge' <> '')))) ORDER BY created, id`,
    [COOP, only ?? null],
  );
  // on its way still (the watcher's), or decided against this commit already, it is not asked again
  const looked = rows.filter((i) => !(i.stage === "ship" && !i.ship?.outcome) && !(i.ship?.commit === commit && (i.ship.live === false || i.stage === "accepted")));
  const named = await trailers(gh, looked.filter((i) => !i.pull_request && i.stage !== "accepted"));
  const isIn = inCommit(gh, commit);
  const out: Reconciled = { commit, accepted: [], flagged: [], cleared: [] };
  for (const i of looked) {
    let merges: string[], isLive: boolean;
    try {
      if (i.pull_request) {
        const shipped = i.ship?.pr === i.pull_request && i.ship.merge ? i.ship.merge : null;
        const pr = shipped ? null : await gh.pull(i.pull_request);
        merges = [shipped ?? (pr?.merged ? pr.merge_commit_sha : null)].filter((m): m is string => !!m);
      } else merges = i.stage === "accepted" ? [i.ship!.merge] : named.get(i.id) ?? [];
      // live at a commit play runs now: one question for every intent live there
      const was = i.stage === "accepted" && i.ship?.live && i.ship.commit;
      isLive = merges.length > 0 && ((!!was && (await isIn(was))) || (await merges.reduce(async (a, m) => (await a) && isIn(m), Promise.resolve(true))));
    } catch (e) {
      if (!quiet(e)) console.warn(`reconcile: intent ${i.id} not looked at: ${(e as Error).message}`);
      continue;
    }
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
        return done.length ? (await acceptWorkLive(tx, store, i.id), done) : done;
      });
      if (done.length) {
        await wake(db, gh, i.id, "success", "Accepted: live", i.ship?.head);
        out.accepted.push(i.id);
        console.log(`reconcile: intent ${i.id} (${i.stage}) is live at ${short(commit)}: accepted`);
      }
    } else if (!isLive && (i.stage === "accepted" || i.stage === "ship")) {
      await db.query(
        `UPDATE play.intents SET ship = COALESCE(ship, jsonb_build_object('pr', pull_request, 'steps', '[]'::jsonb)) || ($3::text)::jsonb WHERE id = $1 AND stage = $2`,
        [i.id, i.stage, patch({ live: false, commit })],
      );
      out.flagged.push(i.id);
      console.warn(`reconcile: intent ${i.id} is ${i.stage} but not live: production runs ${short(commit)}`);
    } else if (isLive) {
      // Accepted and live: kept as live at this commit, so the next commit asks once for all of them
      await db.query(`UPDATE play.intents SET ship = COALESCE(ship, jsonb_build_object('pr', pull_request, 'steps', '[]'::jsonb)) || ($2::text)::jsonb WHERE id = $1 AND stage = 'accepted'`, [i.id, patch({ live: true, commit })]);
      if (i.ship?.live === false) out.cleared.push(i.id), console.log(`reconcile: intent ${i.id} is live again at ${short(commit)}`);
    }
  }
  return out;
}

/** Work of play's accepted as its code is seen live (intent 7c8986c5); where it does not go in, closed: a new intent proposes it again. */
async function acceptWorkLive(tx: Queryable, store: BlobStore, id: string) {
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
  await tx.query(`SAVEPOINT work_live`);
  const out: any = await decideWork(tx, { db: tx as Db, store }, me, p, "accept").catch((e) => ({ status: "failed", message: (e as Error).message }));
  if (out?.status === "accepted") {
    // its decision left it Accepted by whoever decided it; the reconcile's own note stands on its ship
    await tx.query(`RELEASE SAVEPOINT work_live`);
    return;
  }
  await tx.query(`ROLLBACK TO SAVEPOINT work_live`);
  await why(`its work of play's did not go in: ${out?.message ?? "refused"}`);
}

/** An Accept of an intent whose code is on main by its trailer: the reconcile's, not a person's; null where it names none. */
export async function acceptCode(db: Db, gh: GitHub | null, store: BlobStore, who: Me | null, id: string, commit: string | null = runningCommit()) {
  const me = admin(who, INTENT_ADMINS);
  const intent = await getIntent(db, id);
  if (intent.work || intent.pull_request || !gh) return null;
  await mustMove(db, intent, "accept");
  const on = (await trailers(gh, [intent])).get(intent.id);
  if (!on?.length) return null;
  if (!commit) refuse("Its code is on main, and play knows no commit of its own (PLAY_COMMIT) to find it in: it is Accepted once play runs it.");
  await reconcile(db, gh, store, commit!, [intent.id]);
  const now = await getIntent(db, intent.id);
  if (now.stage !== "accepted")
    refuse(`Its code is on main (${on.map((s) => s.slice(0, 7)).join(", ")}), not yet in what play runs (${commit!.slice(0, 7)}): it is Accepted by itself once production runs it.`);
  if (!me.auto) await db.query(`UPDATE play.intents SET decided_by = COALESCE(decided_by, $2) WHERE id = $1`, [intent.id, me.id]);
  return getIntent(db, intent.id);
}
