// The ship watcher (play/SPEC.md §4.12 "Accept ships it"): every 10 s while play-api runs, one look at a time, its
// state in Postgres (each intent's `ship` and `pr_seen`), so a restarted play goes on where it was. Each look follows
// every ship to production (./ship.ts), reads every open intent's pull request (so the board asks GitHub nothing) and
// lets an auto-accept rule take one GitHub now finds ready (./decide.ts autoMove), then merges main into those behind it
// (./mainmerge.ts).
import type { BlobStore } from "./blobs";
import type { Db } from "./kit/pg";
import { canonical } from "./kit/hash";
import { carrySeen, mainMergeState, mergeMain, type MainMergeState } from "./mainmerge";
import { keepSeen, openPulls, readPull, type GitHub } from "./github";
import { advance, reconcile, runningCommit, saveShip, startIfReady, type Ship } from "./ship";
import { autoMove } from "./decide";

/**
 * The ship watcher's one look: every intent in Ship advanced as GitHub has it now; all green, it stays in Ship, ended;
 * any red, back to Proposal with its report. Its state is the intents' `ship`, so a restarted play goes on where it was.
 * As one ends, the reconcile (against `commit`, the commit play runs) decides at once what is Accepted, so the ships
 * after it in this look see it.
 */
export async function watchShips(db: Db, gh: GitHub, store: BlobStore, at = Date.now(), commit: string | null = runningCommit()) {
  const { rows } = await db.query<{ id: string; ship: Ship }>(`SELECT id, ship FROM play.intents WHERE stage = 'ship' AND ship IS NOT NULL ORDER BY decided_at, id`);
  for (const { id, ship } of rows) {
    try {
      // waiting: its turn and GitHub (read again, as the ones before it may have moved on in this look)
      if (ship.pending) {
        await startIfReady(db, gh, id, at);
        continue;
      }
      if (ship.outcome) continue;
      const next = await advance(gh, ship, at);
      if (canonical(next) === canonical(ship)) continue;
      await saveShip(db, id, next, next.outcome === "red" ? "proposal" : "ship");
      if (next.outcome) {
        console.log(`ship: intent ${id} ${next.outcome === "green" ? "is green all the way: the reconcile decides once play runs it" : `is red at ${next.report?.step}: back to Proposal`}`);
        if (!commit) console.warn("ship: play knows no commit of its own (PLAY_COMMIT): nothing is reconciled");
        else await reconcile(db, gh, store, commit).catch((e) => console.warn(`ship: the reconcile missed a look: ${(e as Error).message}`));
      }
    } catch (e) {
      console.warn(`ship: intent ${id} not looked at: ${(e as Error).message}`);
    }
  }
}

/**
 * Every open intent's named pull request (Build or Proposal) read as GitHub has it now, kept as its pr_seen: what the
 * board's sub-state (./substate.ts) is told of GitHub, so GET /api/intents asks GitHub nothing.
 */
export async function watchPulls(db: Db, gh: GitHub, at = Date.now()) {
  for (const { id, pull_request, pr_seen } of await openPulls(db)) {
    try {
      await keepSeen(db, id, carrySeen(pr_seen, (await readPull(gh, pull_request, at)).seen));
    } catch (e) {
      console.warn(`ship: #${pull_request} of intent ${id} not read: ${(e as Error).message}`);
      continue;
    }
    // GitHub ready since it reached Proposal: an auto-accept rule may take it now (./decide.ts autoMove)
    await autoMove({ db }, id, { gh }).catch((e) => console.warn(`auto: intent ${id} not looked at: ${(e as Error).message}`));
  }
}

/** the watcher's own main merge state, kept while play-api runs */
const MAIN_MERGE = mainMergeState();

/**
 * One tick of the watcher: the ships, then the open intents' pull requests read, then main merged into those behind it
 * and conflicts shown (./mainmerge.ts).
 */
export async function watchTick(db: Db, gh: GitHub, store: BlobStore, at = Date.now(), commit: string | null = runningCommit(), merging: MainMergeState = MAIN_MERGE) {
  await watchShips(db, gh, store, at, commit);
  await watchPulls(db, gh, at);
  await mergeMain(db, gh, merging, at).catch((e) => console.warn(`ship: main not merged into the open pull requests: ${(e as Error).message}`));
}

/** The ship watcher, every `every` ms while play-api runs (one look at a time), against the commit play runs. */
export function startShipWatcher(db: Db, gh: GitHub, store: BlobStore, every = 10_000, commit: string | null = runningCommit()) {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await watchTick(db, gh, store, Date.now(), commit);
    } catch (e) {
      console.warn(`ship: the watcher missed a look: ${(e as Error).message}`);
    } finally {
      busy = false;
    }
  }, every);
  timer.unref?.();
  return () => clearInterval(timer);
}
