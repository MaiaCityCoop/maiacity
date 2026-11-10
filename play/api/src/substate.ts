// Sub-states (play/SPEC.md §4.12 "Sub-states"; intent 2bf8af96, Samuel 2026-11-07), said by one pure function importing
// nothing of play's at run time (only .github/required-checks.json), so every path (intents, ship, versioned) asks it.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** the checks main.yml runs on a pull request, required green on its head before Accept merges it (.github/required-checks.json, copied under PLAY_REPO) */
const REQUIRED_CHECKS: string[] = Object.values(JSON.parse(readFileSync(resolve(process.env.PLAY_REPO ?? resolve(import.meta.dir, "../../.."), ".github/required-checks.json"), "utf8")));
const SEEN_MOST_MS = 60_000;

type SubState = "failed" | "waiting" | "working" | "idle";
/** `tag`: what it is, in at most 32 characters (the dialog's chip, "<State> · <tag>"); `why`: its reason, checks named by id only */
export type Sub = { state: SubState; tag: string; why: string };
const S = (state: SubState, tag: string, why: string): Sub => ({ state, tag, why });
/** a check as GitHub concluded it: neutral reads as success, skipped and cancelled as themselves, every other end as failure */
type CheckState = "queued" | "running" | "success" | "failure" | "skipped" | "cancelled";
export type PrSeen = {
  pr: number; head: string; draft: boolean; mergeable: boolean | null; state: string; merged: boolean; base: string; checks: Record<string, CheckState>; at: string;
  /** in conflict at `head` with main at `main`: the files both sides changed since their merge base */
  conflicts?: { head: string; main: string; files: string[] };
  /** the ETags of the pull request and of its head's check runs as last read, for conditional reads (./github.ts readSeen) */
  etags?: { pull?: string; head?: string; checks?: string };
  /** each status play last posted, by context (./github.ts postStatus) */
  posted?: Record<string, { head: string; state: string; description: string; sent?: false }>;
};

type Res = { pass: boolean; at?: string; commit?: string };
type Row = {
  stage: string;
  spec: { checks: { id: string; check: string; must: boolean; run?: string; step?: string }[]; nothing_to_reduce?: string } | null;
  results: Record<string, Res> | null;
  work?: { status?: unknown; docs?: unknown } | null;
  pull_request?: number | null;
  ship?: any;
  held_by?: { id: string; title: string; stage: string }[];
  pr_seen?: PrSeen | null;
};

export const short = (s: string) => s.slice(0, 7);
/** what play's GitHub says now (./github.ts shipGitHub sets it): its limit until a time, or its token refused; null while it answers */
export const githubSays: { now: { why: string; until?: number } | null } = { now: null };
/** a pull request not read lately: GitHub's limit or refusal named where it says so, else being read */
const reading = (pr: number, now: number): Sub => {
  const s = githubSays.now && !(githubSays.now.until && now >= githubSays.now.until) ? githubSays.now : null;
  return s ? S("working", s.until ? "GitHub's limit" : "GitHub refuses the token", s.why) : S("working", "reading GitHub", `reading #${pr} on GitHub`);
};
const heldWhy = (held: { title: string }[]) => `held: waits for ${held.map((d) => d.title).join(", ")}`;

/**
 * The must checks with a `run` that did not last pass on the head, by id, grouped by what they lack ("c1, c2 passed
 * on 233b24d, not yet on the head 7fbf99b", "c4 no result yet"). A pull request behind main is fine: the merge queue
 * tests it with main (play/SPEC.md §4.12).
 */
export function unmetOn(intent: Pick<Row, "spec" | "results">, seen: Pick<PrSeen, "head">) {
  const by = new Map<string, string[]>();
  for (const c of intent.spec?.checks ?? []) {
    if (!c.must || !c.run) continue;
    const r = intent.results?.[c.id];
    if (r?.pass === true && r.commit === seen.head) continue;
    const lack = !r ? "no result yet" : !r.pass ? "failed" : !r.commit ? "passed on no named commit" : `passed on ${short(r.commit)}, not yet on the head ${short(seen.head)}`;
    by.set(lack, [...(by.get(lack) ?? []), c.id]);
  }
  return [...by].map(([what, ids]) => `${ids.join(", ")} ${what}`);
}

/** what keeps an open pull request from being accepted into the merge queue now; null where nothing does */
export function prBlock(intent: Pick<Row, "spec" | "results">, seen: PrSeen): Sub | null {
  const n = `#${seen.pr}`;
  const name = "name the intent's open pull request (check_intent's pr)";
  const failed = (tag: string, why: string) => S("failed", tag, why);
  if (seen.merged) return failed("merged already", `${n} is merged already, and not by a ship of this intent: ${name}`);
  if (seen.state !== "open") return failed(seen.state, `${n} is ${seen.state}: ${name}`);
  if (seen.base !== "main") return failed("not into main", `${n} goes into ${seen.base}: an intent's code goes into main`);
  if (seen.draft) return failed("a draft", `${n} is a draft: it is marked ready (main's checks run then) before it is merged`);
  if (seen.mergeable === false) return failed("conflicts with main", conflictWhy(seen));
  // a cancelled required check blocks GitHub's queue as a red one does; a skipped one (a draft's run) is not green yet
  const red = REQUIRED_CHECKS.find((c) => seen.checks[c] === "failure" || seen.checks[c] === "cancelled");
  if (red) return failed("check red", `'${red}' is ${seen.checks[red]} on ${n}'s head ${short(seen.head)}`);
  const stale = unmetOn(intent, seen);
  if (stale.length)
    return S("working", "head moved", `${n}'s head moved past the checked commit (${stale.join("; ")}): every must check with a run passes on ${n}'s head ${short(seen.head)} first (mark it ready, or push to it)`);
  const running = REQUIRED_CHECKS.filter((c) => seen.checks[c] !== "success");
  if (running.length) return S("working", "checks running", `Waiting for ${n}'s checks (${running.join(", ")})`);
  if (seen.mergeable === null) return S("working", "reading GitHub", `Waiting for GitHub to work out whether ${n} merges`);
  return null;
}

/** a conflict with main is its builder's to resolve: a pull request merely behind main is fine, the merge queue tests it with main */
export function conflictWhy(seen: PrSeen) {
  const files = seen.conflicts?.head === seen.head ? seen.conflicts.files : null;
  return `conflicts with main: ${files?.length ? files.join(", ") : `#${seen.pr} does not merge into main as it is`}`;
}

/** a ship's step now: the first not yet green or skipped */
const stepNow = (ship: any) => (ship?.steps ?? []).find((s: any) => s.state !== "green" && s.state !== "skipped");

/** `seen` is the pull request as last read (the intent's pr_seen), older than 60 s working until read again */
export function subStateOf(intent: Row, seen: PrSeen | null | undefined = intent.pr_seen, now = Date.now()): Sub | null {
  const at = intent.stage;
  if (at === "accepted" || at === "archived") return null;
  const held = intent.held_by ?? [];
  const pr = intent.pull_request;
  const ship = intent.ship;
  const results = intent.results ?? {};

  // failed: Ship red (back at Proposal), unless the work went on since (checks recorded again, another pull request)
  if (at === "proposal" && ship?.outcome === "red" && ship.pr === pr) {
    const since = Object.values(results).some((r) => r.at && ship.report?.at && r.at > ship.report.at);
    if (ship.merge || !since) return S("failed", "Ship red", `Ship red at ${ship.report?.step ?? "a step"}: ${ship.report?.why ?? "see its report"}${ship.merge ? " (Accept ships it again)" : ""}`);
  }
  const failedMust = (intent.spec?.checks ?? []).find((c) => c.must && results[c.id]?.pass === false);
  if ((at === "build" || at === "proposal") && failedMust) return S("failed", `${failedMust.id} failed`.slice(0, 32), `${failedMust.id} failed`);

  if (at === "idea") return S("idle", "an idea", "an idea: no agent has specified it yet");
  if (at === "specify") {
    const reduces = !!intent.spec && (intent.spec.checks.some((c) => c.step === "reduce") || !!intent.spec.nothing_to_reduce);
    return reduces ? S("waiting", "Approve spec", "Approve spec") : S("working", "its reduce step", "specified again first: its reduce step");
  }
  if (at === "ship") {
    const q = ship?.steps?.find((s: any) => s.key === "queued");
    if (q && q.state !== "green") return S("working", "in the merge queue", `${q.note ?? "In GitHub's merge queue"}`);
    if (ship?.outcome === "green") return S("working", "green, going live", "green all the way: Accepted once play runs it");
    const s = stepNow(ship);
    return S("working", "shipping", s ? `${s.name}${s.note ? ` · ${s.note}` : ""}` : "on its way");
  }
  // code at Proposal waits in Ship for a dependency there (./intents.ts mayMove), so only one elsewhere holds it
  const holds = at === "proposal" && pr ? held.filter((d) => d.stage !== "ship") : held;
  if (holds.length) return S("idle", "held", heldWhy(holds));
  if (at === "build") {
    // a conflict with main is failed in Build too: its builder resolves it (woken by the status 'Merges with main')
    if (pr && seen && seen.pr === pr && seen.state === "open" && seen.mergeable === false && now - Date.parse(seen.at) <= SEEN_MOST_MS) return S("failed", "conflicts with main", conflictWhy(seen));
    // work of play's proposed in Build waits on it, not decidable: it moves to Proposal with it when its last must passes (intent 94061718)
    if (intent.work?.status === "proposal") {
      const n = Number(intent.work.docs) || 1;
      return S("working", "work proposed", `${n} document${n === 1 ? "" : "s"} proposed, its checks to pass`);
    }
    return S("working", "being built", "being built: its checks are recorded as they pass");
  }

  // code, with play's work beside it or not (intent 7c8986c5), is Accept and ship
  if (!pr) return S("waiting", "Accept", "Accept");
  if (!seen || seen.pr !== pr || now - Date.parse(seen.at) > SEEN_MOST_MS) return reading(pr, now);
  return prBlock(intent, seen) ?? S("waiting", "Accept and ship", "Accept and ship");
}

export const sub = { of: subStateOf };

/** whether a person may decide it now: waiting, or failed only by a red ship after its merge (Accept ships it again) */
export const decidable = (intent: Row, s: Sub | null) =>
  !!s && (s.state === "waiting" || (s.state === "failed" && intent.stage === "proposal" && !!intent.ship?.merge && intent.ship?.outcome === "red" && intent.ship.pr === intent.pull_request));

export function checksSeen(runs: any[]): Record<string, CheckState> {
  const by = new Map<string, any>();
  for (const r of runs) {
    const was = by.get(r.name);
    if (!was || `${r.started_at ?? ""}` > `${was.started_at ?? ""}` || (r.started_at === was.started_at && r.id > was.id)) by.set(r.name, r);
  }
  const out: Record<string, CheckState> = {};
  for (const [name, r] of by)
    out[name] = r.status !== "completed" ? (r.status === "in_progress" ? "running" : "queued") : concluded(r.conclusion);
  return out;
}

/** a completed check's conclusion as pr_seen keeps it: a skipped check (a draft's job) is never shown as failed */
function concluded(conclusion: string | null): CheckState {
  if (conclusion === "success" || conclusion === "neutral") return "success";
  if (conclusion === "skipped" || conclusion === "cancelled") return conclusion;
  return "failure";
}
