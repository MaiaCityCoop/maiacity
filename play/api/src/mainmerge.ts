// Main merged into open intent pull requests by play (play/SPEC.md §4.12 "Accept ships it"; intent f28822d9, Samuel
// 2026-11-07: "This merging main conflicts steps should be also automated right?"). Ship's watcher runs it each tick,
// after it has read every open intent's pull request (./ship.ts watchPulls, the intents' pr_seen):
// - a pull request of an intent in Build or at Proposal, open into main, mergeable and behind main's head is updated
//   with GitHub's update-branch (main merged into its branch, `expected_head_sha` the head read), once per head and
//   main's head. It is a push made with SHIP_TOKEN, so GitHub runs the required checks and the box's run
//   (intents-pr.yml on `synchronize`) records the intent's checks on the new head: working until then, waiting after.
//   A builder's push in between makes GitHub refuse it (422): nothing is done, the next tick reads the new head first.
// - one in conflict (mergeable false) is failed, "conflicts with main: <files>" (the files both sides changed since
//   their merge base), and play posts the commit status 'Merges with main' (failure, that line) on its head, which
//   wakes its builder session subscribed to the pull request; success once it merges again. Not a required check.
// Never an intent in Ship, Accepted or Archived, never a pull request into another branch or naming no intent, never
// a merge into main or production.
import { COOP } from "./access";
import type { Db } from "./pg";
import { GitHubError, intentLink, type GitHub } from "./ship";
import { conflictWhy, type PrSeen } from "./substate";

/** the commit status play posts on an open intent pull request's head: failure while it conflicts with main */
export const MERGES_CONTEXT = "Merges with main";
/** GitHub's longest status description */
const DESCRIPTION_MOST = 140;

/** what the watcher keeps between ticks: main's head last seen, and each pull request's head looked at against it */
export type MainMergeState = { main: string | null; done: Map<string, string> };
export const mainMergeState = (): MainMergeState => ({ main: null, done: new Map() });

const short = (s: string) => s.slice(0, 7);
const fit = (s: string) => (s.length <= DESCRIPTION_MOST ? s : `${s.slice(0, DESCRIPTION_MOST - 1)}…`);

/**
 * A pull request read again (`seen`), with what play keeps of its main merge carried from the read before (`was`):
 * the merge play made (while the head is the one it merged from, or the first head after it), the conflict's files
 * (while the head is the same) and the status last posted.
 */
export function carrySeen(was: PrSeen | null | undefined, seen: PrSeen): PrSeen {
  if (!was || was.pr !== seen.pr) return seen;
  const out: PrSeen = { ...seen };
  const m = was.main_merged;
  if (m) {
    const to = m.to ?? (seen.head !== m.from ? seen.head : undefined);
    if (seen.head === m.from || seen.head === to) out.main_merged = { ...m, ...(to ? { to } : {}) };
  }
  if (was.conflicts?.head === seen.head) out.conflicts = was.conflicts;
  if (was.merges) out.merges = was.merges;
  if (was.main_merges) out.main_merges = was.main_merges;
  return out;
}

const keep = (q: Pick<Db, "query">, id: string, seen: PrSeen) => q.query(`UPDATE play.intents SET pr_seen = ($2::text)::jsonb WHERE id = $1`, [id, JSON.stringify(seen)]);

/** the files both the branch and main changed since their merge base: every file a conflict can be in */
async function conflictFiles(gh: GitHub, seen: PrSeen, main: string) {
  const base = (await gh.compare(main, seen.head)).merge_base_commit.sha;
  const onMain = new Set(((await gh.compare(base, main)).files ?? []).flatMap((f) => [f.filename, ...(f.previous_filename ? [f.previous_filename] : [])]));
  return [...new Set((await gh.pullFiles(seen.pr)).filter((f) => onMain.has(f)))].sort();
}

/**
 * One look: main's head read, then every intent in Build or at Proposal whose pull request (as watchPulls just read it)
 * is open into main: in conflict, failed with its files and 'Merges with main' failure on its head; mergeable again,
 * that status success; mergeable and behind main, main merged into it (update-branch) under the intent's row, so an
 * Accept pressed meanwhile waits and finds it moved.
 */
export async function mergeMain(db: Db, gh: GitHub, state: MainMergeState, at = Date.now()) {
  const main = await gh.branchHead("main");
  if (state.main !== main) {
    if (state.main) console.log(`ship: main moved to ${short(main)}: open intent pull requests behind it are updated`);
    state.main = main;
  }
  const { rows } = await db.query<{ id: string; pull_request: number; pr_seen: PrSeen | null }>(
    `SELECT id, pull_request, pr_seen FROM play.intents WHERE coop_id = $1 AND stage IN ('build', 'proposal') AND pull_request IS NOT NULL ORDER BY created, id`,
    [COOP],
  );
  for (const { id, pull_request, pr_seen } of rows) {
    const seen = pr_seen;
    if (!seen || seen.pr !== pull_request || seen.state !== "open" || seen.merged || seen.base !== "main") continue;
    try {
      if (seen.mergeable === false) await conflicted(db, gh, id, seen, main);
      else if (seen.mergeable === true) {
        if (seen.merges?.state === "failure") await post(db, gh, id, seen, "success", "merges with main again");
        await update(db, gh, state, id, seen, main, at);
      }
    } catch (e) {
      console.warn(`ship: main not merged into #${pull_request} of intent ${id}: ${(e as Error).message}`);
    }
  }
}

async function post(db: Db, gh: GitHub, id: string, seen: PrSeen, state: "success" | "failure", description: string) {
  const d = fit(description);
  if (seen.merges?.head === seen.head && seen.merges.state === state && seen.merges.description === d) return;
  await gh.status(seen.head, { state, description: d, target_url: intentLink(id), context: MERGES_CONTEXT });
  seen.merges = { head: seen.head, state, description: d };
  await keep(db, id, seen);
}

async function conflicted(db: Db, gh: GitHub, id: string, seen: PrSeen, main: string) {
  if (seen.conflicts?.head !== seen.head || seen.conflicts.main !== main) {
    const files = await conflictFiles(gh, seen, main).catch((e) => {
      console.warn(`ship: #${seen.pr}'s files in conflict not worked out: ${(e as Error).message}`);
      return null;
    });
    if (files) {
      seen.conflicts = { head: seen.head, main, files };
      await keep(db, id, seen);
    }
  }
  await post(db, gh, id, seen, "failure", conflictWhy(seen));
}

async function update(db: Db, gh: GitHub, state: MainMergeState, id: string, seen: PrSeen, main: string, at: number) {
  const key = `${seen.pr}:${seen.head}`;
  if (state.done.get(key) === main) return;
  // GitHub's compare of main against the head: main's head not in the branch is behind
  let behind: boolean;
  try {
    behind = (await gh.compare(main, seen.head)).behind_by > 0;
  } catch (e) {
    // a head GitHub can't compare (gone, or not of this repository) is not looked at again against this main
    if (e instanceof GitHubError && (e.status === 404 || e.status === 422)) {
      state.done.set(key, main);
      return;
    }
    throw e;
  }
  if (!behind) {
    state.done.set(key, main);
    return;
  }
  await db.transaction(async (tx) => {
    // under the intent's row: an Accept holds it while it decides, so it never merges a head play is moving
    const { rows: [row] } = await tx.query<{ stage: string; pr_seen: PrSeen | null }>(`SELECT stage, pr_seen FROM play.intents WHERE id = $1 FOR UPDATE`, [id]);
    if (!row || (row.stage !== "build" && row.stage !== "proposal") || row.pr_seen?.head !== seen.head) return;
    try {
      await gh.updateBranch(seen.pr, seen.head);
    } catch (e) {
      // the head moved (a builder's push): nothing done, the next tick reads the new head first
      if (e instanceof GitHubError && e.status === 422) {
        console.log(`ship: #${seen.pr} moved past ${short(seen.head)}: main is merged into it on a later look`);
        return;
      }
      throw e;
    }
    state.done.set(key, main);
    await keep(tx, id, { ...row.pr_seen!, main_merged: { from: seen.head, main, at: new Date(at).toISOString() }, main_merges: (row.pr_seen!.main_merges ?? 0) + 1 });
    console.log(`ship: main ${short(main)} merged into #${seen.pr} of intent ${id} (from ${short(seen.head)}): its checks run on the new head`);
  });
}
