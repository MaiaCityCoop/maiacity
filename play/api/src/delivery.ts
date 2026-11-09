// Delivery measured and budgeted (intent 2f19fe30-5490-4ad6-8ea4-9211e06770c5, Samuel 2026-11-07: delivery "alarmingly
// slow"): where an intent's time goes, read from what play already keeps on it, nothing written.
//
//   Idea      created → specified_at            an agent to specify it
//   Specify   specified_at → approved_at        a person: Approve spec
//   Build     approved_at → its must results     an agent building, its checks run (the last must result recorded in
//                                                avenBOX, never main's: when it reached Proposal, or re-recorded there)
//   Proposal  → decided_at                       a person: Accept
//   Ship      decided_at → ship.ended            CI: its turn and GitHub ("Ready to merge"), then each ship step
//
// Per day over a window (`days`, 7 by default, 1 to 30): the intents accepted, their median and longest Idea→Accepted
// and each stage's median. Each intent is held to the budgets (BUDGETS), an open stage counted to now. With play's
// GitHub (SHIP_TOKEN, ./ship.ts) and `ci`, each intent's CI: the runs of its pull request's branch and its ship's
// main, release and deploy runs, their minutes, the share cancelled, each run's three slowest steps, those over 10
// minutes flagged. Served as GET /api/delivery and the MCP tool delivery (admins only), shown on /delivery/.
import { admin, COOP, type Me } from "./access";
import { INTENT_ADMINS } from "./intents";
import { intentSeen } from "./owners";
import type { Queryable } from "./kit/pg";
import type { GitHub, Job, Run } from "./github";
import { type PrSeen } from "./substate";

const MIN = 60_000;
export const STAGES = ["idea", "specify", "build", "proposal", "ship"] as const;
export type Stage = (typeof STAGES)[number];
/** whose time a stage is: an agent's, a person's (a gate), or CI's (Ship) */
export const WHO: Record<Stage, "agent" | "person" | "ci"> = { idea: "agent", specify: "person", build: "agent", proposal: "person", ship: "ci" };

/** the budgets an intent is held to (Samuel 2026-10-27: every CI run in 10 minutes) */
export const BUDGETS = [
  { key: "specify", name: "Waiting for spec approval", ms: 30 * MIN },
  { key: "build", name: "Build", ms: 90 * MIN },
  { key: "proposal", name: "Waiting for Accept", ms: 30 * MIN },
  { key: "ship", name: "Ship", ms: 20 * MIN },
  { key: "lead", name: "Idea to Accepted", ms: 180 * MIN },
  { key: "run", name: "A CI run", ms: 10 * MIN },
] as const;
export type BudgetKey = (typeof BUDGETS)[number]["key"];
const BUDGET = Object.fromEntries(BUDGETS.map((b) => [b.key, b])) as Record<BudgetKey, (typeof BUDGETS)[number]>;

export type Segment = { stage: Stage; who: "agent" | "person" | "ci"; from: string; to: string | null; ms: number };
export type ShipPart = { key: string; name: string; state: string; ms: number | null };
export type Over = { budget: BudgetKey; name: string; budget_ms: number; ms: number; over_ms: number; run?: number };
export type SlowStep = { job: string; step: string; ms: number };
export type CiRun = { id: number; name: string | null; link: string; conclusion: string | null; ms: number; slowest: SlowStep[]; over: boolean };
export type CiOf = { minutes: number; runs: number; cancelled: number; cancelled_share: number; list: CiRun[] } | { error: string };
export type Timeline = {
  id: string;
  title: string;
  stage: string;
  created: string;
  accepted_at: string | null;
  /** Idea→Accepted, or Idea→now while it is open */
  lead_ms: number;
  segments: Segment[];
  /** each stage's time, summed */
  stage_ms: Partial<Record<Stage, number>>;
  ship: ShipPart[] | null;
  step_backs: number;
  /** how many times play merged main into its pull request (./mainmerge.ts) */
  main_merges: number;
  pull_request: number | null;
  over: Over[];
  ci?: CiOf;
};

/** an intent as delivery reads it */
export type Row = {
  id: string;
  title: string;
  stage: string;
  created: string | Date;
  specified_at: string | Date | null;
  approved_at: string | Date | null;
  decided_at: string | Date | null;
  results: Record<string, { pass: boolean; at?: string; where?: string }> | null;
  spec: { checks: { id: string; must?: boolean }[] } | null;
  ship: { steps?: { key: string; name: string; state: string; started?: string; finished?: string }[]; ended?: string; main_run?: number; release_run?: number; deploy_run?: number } | null;
  steps: unknown[] | null;
  pr_seen: PrSeen | null;
  pull_request: number | null;
};

const ms = (v: string | Date | null | undefined) => (v == null ? null : new Date(v).getTime());
const iso = (t: number) => new Date(t).toISOString();

/** when the intent was accepted: its ship ended green, else its decision (an intent without code) */
export function acceptedAt(r: Pick<Row, "stage" | "decided_at" | "ship">): number | null {
  if (r.stage !== "accepted") return null;
  return ms(r.ship?.ended) ?? ms(r.decided_at);
}

/** when Build ended: the last must result recorded (avenBOX's, never main's confirmation), never after the decision */
function buildEnd(r: Row): number | null {
  const musts = new Set((r.spec?.checks ?? []).filter((c) => c.must !== false).map((c) => c.id));
  const ats = Object.entries(r.results ?? {})
    .filter(([id, x]) => musts.has(id) && x?.pass && x.where !== "main" && x.at)
    .map(([, x]) => Date.parse(x.at!));
  const last = ats.length ? Math.max(...ats) : null;
  const decided = ms(r.decided_at);
  return last != null && decided != null ? Math.min(last, decided) : (last ?? decided);
}

/** One intent's timeline at `now`: its stages' segments (the one it is at open, to now), its ship steps and budgets. */
export function timeline(r: Row, now: number): Timeline {
  const at = STAGES.indexOf(r.stage as Stage);
  const accepted = acceptedAt(r);
  // each stage's end, in order; a stage it has not reached has none
  const ends: (number | null)[] = [ms(r.specified_at), ms(r.approved_at), buildEnd(r), ms(r.decided_at), accepted];
  const segments: Segment[] = [];
  let from = ms(r.created)!;
  const last = r.stage === "accepted" ? STAGES.length - 1 : at;
  for (let i = 0; i <= last && i >= 0; i++) {
    const open = r.stage !== "accepted" && i === at;
    const end = open ? null : ends[i];
    if (!open && end == null) continue; // a stage it went past without its time (an intent with no spec)
    const to = end ?? now;
    segments.push({ stage: STAGES[i], who: WHO[STAGES[i]], from: iso(from), to: end == null ? null : iso(end), ms: Math.max(0, to - from) });
    from = Math.max(from, to);
  }
  const stage_ms: Partial<Record<Stage, number>> = {};
  for (const s of segments) stage_ms[s.stage] = (stage_ms[s.stage] ?? 0) + s.ms;
  const lead_ms = Math.max(0, (accepted ?? now) - ms(r.created)!);
  const ship = r.ship?.steps
    ? r.ship.steps.map((s) => {
        const a = ms(s.started);
        const b = ms(s.finished) ?? (s.state === "running" ? now : null);
        return { key: s.key, name: s.name, state: s.state, ms: a != null && b != null ? Math.max(0, b - a) : null };
      })
    : null;
  const t: Timeline = {
    id: r.id,
    title: r.title,
    stage: r.stage,
    created: iso(ms(r.created)!),
    accepted_at: accepted == null ? null : iso(accepted),
    lead_ms,
    segments,
    stage_ms,
    ship,
    step_backs: Array.isArray(r.steps) ? r.steps.length : 0,
    main_merges: r.pr_seen?.main_merges ?? 0,
    pull_request: r.pull_request ?? null,
    over: [],
  };
  t.over = overOf(t);
  return t;
}

const over = (key: BudgetKey, took: number, run?: number): Over[] =>
  took > BUDGET[key].ms ? [{ budget: key, name: BUDGET[key].name, budget_ms: BUDGET[key].ms, ms: took, over_ms: took - BUDGET[key].ms, ...(run ? { run } : {}) }] : [];

/** the budgets an intent went over, each with by how much: its stages, Idea→Accepted, and each CI run once read */
export function overOf(t: Pick<Timeline, "stage_ms" | "lead_ms" | "ci">): Over[] {
  return [
    ...over("specify", t.stage_ms.specify ?? 0),
    ...over("build", t.stage_ms.build ?? 0),
    ...over("proposal", t.stage_ms.proposal ?? 0),
    ...over("ship", t.stage_ms.ship ?? 0),
    ...over("lead", t.lead_ms),
    ...(t.ci && "list" in t.ci ? t.ci.list.flatMap((r) => over("run", r.ms, r.id)) : []),
  ];
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
export type Day = { day: string; accepted: number; median_lead_ms: number | null; longest_lead_ms: number | null; median_stage_ms: Partial<Record<Stage, number>> };

/** each UTC day of the window, oldest first: the intents accepted that day, their lead times and stages' medians */
export function perDay(ts: Timeline[], days: number, now: number): Day[] {
  const today = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
  const out: Day[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = iso(today - d * 86_400_000).slice(0, 10);
    const them = ts.filter((t) => t.accepted_at?.slice(0, 10) === day);
    const median_stage_ms: Partial<Record<Stage, number>> = {};
    for (const s of STAGES) {
      const m = median(them.filter((t) => t.stage_ms[s] != null).map((t) => t.stage_ms[s]!));
      if (m != null) median_stage_ms[s] = m;
    }
    out.push({ day, accepted: them.length, median_lead_ms: median(them.map((t) => t.lead_ms)), longest_lead_ms: them.length ? Math.max(...them.map((t) => t.lead_ms)) : null, median_stage_ms });
  }
  return out;
}

/** a window's length in days: 7 unless given, held to 1..30 */
export function daysOf(v: unknown): number {
  const n = Math.floor(Number(v));
  return v == null || v === "" || !Number.isFinite(n) ? 7 : Math.max(1, Math.min(30, n));
}

// ---- CI, from GitHub: a completed run's jobs never change, so they are read once
const JOBS = new Map<number, Job[]>();
const RUNS_MOST = 40;

const runMs = (r: Run, now: number) => {
  const a = Date.parse(r.run_started_at ?? r.created_at);
  const b = r.status === "completed" && r.updated_at ? Date.parse(r.updated_at) : now;
  return Math.max(0, b - a);
};

/** a run's slowest steps (of all its jobs), at most `n` */
export function slowest(jobs: Job[], n = 3): SlowStep[] {
  return jobs
    .flatMap((j) => (j.steps ?? []).filter((s) => s.started_at && s.completed_at).map((s) => ({ job: j.name, step: s.name, ms: Math.max(0, Date.parse(s.completed_at!) - Date.parse(s.started_at!)) })))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, n);
}

/** one intent's CI: its pull request branch's runs and its ship's runs, each with its time and slowest steps */
export async function ciOf(gh: GitHub, r: Pick<Row, "pull_request" | "ship">, now: number): Promise<CiOf> {
  try {
    const runs = new Map<number, Run>();
    if (r.pull_request) {
      const pr = await gh.pull(r.pull_request);
      for (const run of await gh.branchRuns(pr.head.ref)) runs.set(run.id, run);
    }
    for (const id of [r.ship?.main_run, r.ship?.release_run, r.ship?.deploy_run]) if (id && !runs.has(id)) runs.set(id, await gh.run(id));
    const list: CiRun[] = [];
    for (const run of [...runs.values()].slice(0, RUNS_MOST)) {
      let jobs = JOBS.get(run.id);
      if (!jobs) {
        jobs = await gh.jobs(run.id);
        if (run.status === "completed") JOBS.set(run.id, jobs);
      }
      const took = runMs(run, now);
      list.push({ id: run.id, name: run.name ?? run.display_title ?? null, link: run.html_url, conclusion: run.conclusion, ms: took, slowest: slowest(jobs), over: took > BUDGET.run.ms });
    }
    const cancelled = list.filter((x) => x.conclusion === "cancelled").length;
    return {
      minutes: Math.round(list.reduce((a, x) => a + x.ms, 0) / 600) / 100,
      runs: list.length,
      cancelled,
      cancelled_share: list.length ? Math.round((cancelled / list.length) * 100) / 100 : 0,
      list: list.sort((a, b) => b.ms - a.ms),
    };
  } catch (e) {
    return { error: `GitHub: ${(e as Error).message}` };
  }
}

export const NO_GITHUB = "play has no GitHub token (SHIP_TOKEN): CI minutes are unavailable";

/**
 * Delivery over the last `days` (admins only): every intent open now or accepted in the window (never archived ones),
 * its timeline and the budgets it went over, each day's numbers, and with `ci` each intent's CI from GitHub.
 */
export async function delivery(db: Queryable, me: Me | null, gh: GitHub | null, o: { days?: unknown; ci?: unknown; now?: number } = {}) {
  admin(me, INTENT_ADMINS);
  const now = o.now ?? Date.now();
  const days = daysOf(o.days);
  const today = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
  const since = today - (days - 1) * 86_400_000;
  const { rows } = await db.query<Row>(
    `SELECT i.id, i.title, i.stage, i.created, i.specified_at, i.approved_at, i.decided_at, i.results, i.spec, i.ship, i.steps, i.pr_seen, i.pull_request
       FROM play.intents i
      WHERE i.coop_id = $1 AND ${intentSeen("i", "$2")} AND i.stage <> 'archived'
        AND (i.stage <> 'accepted' OR COALESCE(i.decided_at, i.created) >= $3::timestamptz - interval '2 days')
      ORDER BY i.created DESC, i.id`,
    [COOP, me!.id, iso(since)],
  );
  const ts = rows.map((r) => timeline(r, now)).filter((t) => t.stage !== "accepted" || Date.parse(t.accepted_at!) >= since);
  const wantCi = o.ci === true || o.ci === "1" || o.ci === "true";
  let ci: { available: boolean; why?: string; minutes?: number; runs?: number; cancelled_share?: number } | null = null;
  if (wantCi) {
    if (!gh) ci = { available: false, why: NO_GITHUB };
    else {
      const byId = new Map(rows.map((r) => [r.id, r]));
      await Promise.all(ts.map(async (t) => (t.ci = await ciOf(gh, byId.get(t.id)!, now))));
      for (const t of ts) t.over = overOf(t);
      const read = ts.map((t) => t.ci!).filter((c): c is Extract<CiOf, { list: CiRun[] }> => "list" in c);
      const runs = read.reduce((a, c) => a + c.runs, 0);
      const cancelled = read.reduce((a, c) => a + c.cancelled, 0);
      ci = { available: true, minutes: Math.round(read.reduce((a, c) => a + c.minutes, 0) * 100) / 100, runs, cancelled_share: runs ? Math.round((cancelled / runs) * 100) / 100 : 0 };
    }
  }
  ts.sort((a, b) => Date.parse(b.accepted_at ?? b.created) - Date.parse(a.accepted_at ?? a.created));
  return {
    now: iso(now),
    since: iso(since),
    days,
    budgets: BUDGETS.map((b) => ({ ...b })),
    per_day: perDay(ts, days, now),
    over: ts.filter((t) => t.over.length).length,
    ci,
    intents: ts,
  };
}
