// Sub-states (play/SPEC.md §4.12 "Sub-states"; intent 2bf8af96, Samuel 2026-11-07): every open intent is failed,
// waiting, working or idle, with its reason, said by one pure function from what play keeps and what Ship's watcher
// last read from GitHub (`pr_seen`). failed and waiting need a person; working and idle don't. The board groups each
// column by it, and Approve spec and Accept take only a waiting intent (one red after its merge is shipped again too).
// It imports nothing of play's at run time, so every path (./intents.ts, ./ship.ts, ./versioned.ts) asks it.

/** the checks main.yml runs on a pull request, required green on its head before Accept merges it */
export const REQUIRED_CHECKS = ["play / API and site", "website / build"];
/** how old the watcher's read of a pull request may be before it is read again first */
export const SEEN_MOST_MS = 60_000;

export type SubState = "failed" | "waiting" | "working" | "idle";
export type Sub = { state: SubState; why: string };
export type CheckState = "queued" | "running" | "success" | "failure";
/** a pull request as Ship's watcher (or an Accept) last read it */
export type PrSeen = { pr: number; head: string; draft: boolean; mergeable: boolean | null; state: string; merged: boolean; base: string; checks: Record<string, CheckState>; at: string };

type Res = { pass: boolean; at?: string; commit?: string };
type Row = {
  stage: string;
  spec: { checks: { id: string; check: string; must: boolean; run?: string; step?: string }[]; nothing_to_reduce?: string } | null;
  results: Record<string, Res> | null;
  work?: unknown;
  pull_request?: number | null;
  ship?: any;
  held_by?: { id: string; title: string; stage: string }[];
  pr_seen?: PrSeen | null;
};

const short = (s: string) => s.slice(0, 7);
/** the text a hold is read by, on the board and in every refusal of a held intent's move */
export const heldWhy = (held: { title: string }[]) => `held: waits for ${held.map((d) => d.title).join(", ")}`;

/**
 * The must checks with a `run` that did not last pass on `head`, the pull request's head commit, as people read them:
 * what is merged is what was checked.
 */
export function unmetOn(intent: Pick<Row, "spec" | "results">, head: string) {
  return (intent.spec?.checks ?? [])
    .filter((c) => c.must && c.run)
    .flatMap((c) => {
      const r = intent.results?.[c.id];
      if (r?.pass === true && r.commit === head) return [];
      return [`${c.id} (${c.check}): ${!r ? "no result yet" : !r.pass ? "failed" : r.commit ? `passed on ${short(r.commit)}, not on the head ${short(head)}` : "passed on no named commit"}`];
    });
}

/**
 * Whether the pull request, as `seen`, may be merged at `head` now: null where it may (open into main, not a draft, the
 * head the checks passed on, mergeable, the required checks green), else its sub-state and why. Accept asks it through
 * subStateOf; Ship's turn (./ship.ts startIfReady) asks it again on what it reads then.
 */
export function prBlock(intent: Pick<Row, "spec" | "results">, seen: PrSeen, head?: string): Sub | null {
  const n = `#${seen.pr}`;
  // `head` given: Ship's turn, at the head it was accepted on, read again while it waited
  const w = head ? " while it waited" : "";
  const name = "name the intent's open pull request (check_intent's pr)";
  const failed = (why: string): Sub => ({ state: "failed", why });
  if (seen.merged) return failed(head ? `${n} was merged while it waited, not by this ship` : `${n} is merged already, and not by a ship of this intent: ${name}`);
  if (seen.state !== "open") return failed(head ? `${n} was ${seen.state}${w}` : `${n} is ${seen.state}: ${name}`);
  if (seen.base !== "main") return failed(`${n} goes into ${seen.base}: an intent's code goes into main`);
  if (seen.draft) return failed(head ? `${n} was made a draft${w}` : `${n} is a draft: it is marked ready (main's checks run then) before it is merged`);
  if (head && seen.head !== head) return failed(`${n}'s head moved from ${short(head)} to ${short(seen.head)}${w}: its checks are recorded on the new head, then Accept again`);
  const stale = unmetOn(intent, seen.head);
  if (stale.length)
    return { state: "working", why: `${n}'s head moved past the checked commit: every must check with a run passes on ${n}'s head ${short(seen.head)} first (its run in avenBOX on GitHub records them on it: mark the pull request ready, or push to it): ${stale.join("; ")}` };
  if (seen.mergeable === false)
    return failed(`conflicts with main: ${n} ${head ? "no longer merges into main" : "does not merge into main as it is"}; main is merged into its branch, its checks run again${head ? ", then Accept again" : ""}`);
  const red = REQUIRED_CHECKS.find((c) => seen.checks[c] === "failure");
  if (red) return failed(`'${red}' is failure on ${n}'s head ${short(seen.head)}`);
  const running = REQUIRED_CHECKS.filter((c) => seen.checks[c] !== "success");
  if (running.length) return { state: "working", why: `Waiting for ${n}'s checks (${running.join(", ")})` };
  if (seen.mergeable === null) return { state: "working", why: `Waiting for GitHub to work out whether ${n} merges` };
  return null;
}

/** a ship's step now: the first not yet green or skipped */
const stepNow = (ship: any) => (ship?.steps ?? []).find((s: any) => s.state !== "green" && s.state !== "skipped");

/**
 * An open intent's sub-state and why, null for one Accepted or Archived. First match wins: failed (a red ship, a must
 * failed, its pull request in conflict or red), waiting (a person's gate: Approve spec at Specify, Accept at Proposal),
 * working (an agent, GitHub or Ship busy), idle (held by a dependency, queued in Ship, an Idea no agent took yet).
 * `seen` is the pull request as last read (the intent's pr_seen), older than 60 s working until read again.
 */
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
    if (ship.merge || !since) return { state: "failed", why: `Ship red at ${ship.report?.step ?? "a step"}: ${ship.report?.why ?? "see its report"}${ship.merge ? " (Accept ships it again)" : ""}` };
  }
  const failedMust = (intent.spec?.checks ?? []).find((c) => c.must && results[c.id]?.pass === false);
  if ((at === "build" || at === "proposal") && failedMust) return { state: "failed", why: `${failedMust.id} failed: ${failedMust.check}` };

  if (at === "idea") return { state: "idle", why: "an idea: no agent has specified it yet" };
  if (at === "specify") {
    const reduces = !!intent.spec && (intent.spec.checks.some((c) => c.step === "reduce") || !!intent.spec.nothing_to_reduce);
    return reduces ? { state: "waiting", why: "Approve spec" } : { state: "working", why: "specified again first: its reduce step" };
  }
  if (at === "ship") {
    const step = ship?.steps?.find((s: any) => s.key === "ready");
    if (ship?.pending) {
      const note = `${step?.note ?? ""}`;
      return /^(Queued|Waits for)/.test(note) ? { state: "idle", why: note } : { state: "working", why: note || "ready to merge" };
    }
    if (ship?.outcome === "green") return { state: "working", why: "green all the way: Accepted once play runs it" };
    const s = stepNow(ship);
    return { state: "working", why: s ? `${s.name}${s.note ? ` · ${s.note}` : ""}` : "on its way" };
  }
  // code at Proposal waits in Ship for a dependency there (./intents.ts mayMove), so only one elsewhere holds it
  const holds = at === "proposal" && pr && !intent.work ? held.filter((d) => d.stage !== "ship") : held;
  if (holds.length) return { state: "idle", why: heldWhy(holds) };
  if (at === "build") return { state: "working", why: "being built: its checks are recorded as they pass" };

  // Proposal
  if (intent.work) return { state: "waiting", why: "Accept" };
  if (!pr) return { state: "waiting", why: "Accept" };
  if (!seen || seen.pr !== pr || now - Date.parse(seen.at) > SEEN_MOST_MS) return { state: "working", why: `reading #${pr} on GitHub` };
  return prBlock(intent, seen) ?? { state: "waiting", why: "Accept and ship" };
}

/** the sub-state as every path asks it (a test may stand a stub in its place) */
export const sub = { of: subStateOf };

/** whether a person may decide it now: waiting, or failed only by a red ship after its merge (Accept ships it again) */
export const decidable = (intent: Row, s: Sub | null) =>
  !!s && (s.state === "waiting" || (s.state === "failed" && intent.stage === "proposal" && !!intent.ship?.merge && intent.ship?.outcome === "red" && intent.ship.pr === intent.pull_request));

/** the checks of a commit as GitHub lists them (the latest of each name) as kept in pr_seen */
export function checksSeen(runs: any[]): Record<string, CheckState> {
  const by = new Map<string, any>();
  for (const r of runs) {
    const was = by.get(r.name);
    if (!was || `${r.started_at ?? ""}` > `${was.started_at ?? ""}` || (r.started_at === was.started_at && r.id > was.id)) by.set(r.name, r);
  }
  const out: Record<string, CheckState> = {};
  for (const [name, r] of by)
    out[name] = r.status !== "completed" ? (r.status === "in_progress" ? "running" : "queued") : r.conclusion === "success" ? "success" : "failure";
  return out;
}
