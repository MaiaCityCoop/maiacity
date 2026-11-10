// The ship watcher (play/SPEC.md §4.12 "Accept ships it"): every 10 s while play-api runs, one look at a time, its state
// in Postgres (`ship`, `pr_seen`) so a restarted play goes on. Each look follows every ship (./ship.ts), reads every open
// intent's pull request, lets a rule take one GitHub finds ready (./decide.ts autoMove), and merges main in (./mainmerge.ts).
import type { BlobStore } from "./blobs";
import type { Db } from "./kit/pg";
import { canonical } from "./kit/hash";
import { carried, mainMergeState, mergeMain, type MainMergeState } from "./mainmerge";
import { keepSeen, openPulls, quiet, readSeen, type GitHub } from "./github";
import { advance, reconcile, runningCommit, saveShip, startIfReady, type Ship } from "./ship";
import { autoMove } from "./decide";

/**
 * The ship watcher's one look: each intent in Ship advanced as GitHub has it (all green, ended; any red, back to
 * Proposal with its report); then, every look while one sits green in Ship, the reconcile against `commit` decides
 * whether it is Accepted (intent b3f83e0b: a look that failed is tried again on the next).
 */
export async function watchShips(db: Db, gh: GitHub, store: BlobStore, at = Date.now(), commit: string | null = runningCommit()) {
  const { rows } = await db.query<{ id: string; ship: Ship }>(`SELECT id, ship FROM play.intents WHERE stage = 'ship' AND ship IS NOT NULL ORDER BY decided_at, id`);
  // the reconcile, each look while any intent sits green in Ship (one compare each, none once decided against `commit`)
  const live = async (ids: string[]) => {
    if (commit && ids.length && !gh.says()?.until) await reconcile(db, gh, store, commit, ids).catch((e) => quiet(e) || console.warn(`ship: the reconcile missed a look: ${(e as Error).message}`));
  };
  await live(rows.filter((r) => r.ship.outcome === "green" && !r.ship.pending).map((r) => r.id));
  for (const { id, ship } of rows) {
    if (gh.says()?.until) break;
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
        // as it ends green, at once, so a ship waiting on it starts in this look
        else if (next.outcome === "green") await live([id]);
      }
    } catch (e) {
      if (!quiet(e)) console.warn(`ship: intent ${id} not looked at: ${(e as Error).message}`);
    }
  }
}

/** Every open intent's pull request read as GitHub has it, kept as pr_seen, so GET /api/intents asks GitHub nothing. */
export async function watchPulls(db: Db, gh: GitHub, store: BlobStore, at = Date.now()) {
  for (const { id, pull_request, pr_seen } of await openPulls(db)) {
    if (gh.says()?.until) break;
    try {
      // conditional (ETags kept in pr_seen): an unchanged pull request costs nothing against GitHub's limit
      await keepSeen(db, id, await carried(gh, pr_seen, await readSeen(gh, pull_request, pr_seen, at)));
    } catch (e) {
      if (!quiet(e)) console.warn(`ship: #${pull_request} of intent ${id} not read: ${(e as Error).message}`);
      continue;
    }
    // GitHub ready since it reached Proposal: an auto-accept rule may take it now (./decide.ts autoMove)
    await autoMove({ db, store }, id, { gh }).catch((e) => console.warn(`auto: intent ${id} not looked at: ${(e as Error).message}`));
  }
}

const MAIN_MERGE = mainMergeState();

/** One tick: the ships, the open pull requests read, then main merged into those behind it and conflicts shown (./mainmerge.ts). */
export async function watchTick(db: Db, gh: GitHub, store: BlobStore, at = Date.now(), commit: string | null = runningCommit(), merging: MainMergeState = MAIN_MERGE) {
  // GitHub's limit: no call until it allows them again, the board saying when (./substate.ts githubSays)
  if (gh.says()?.until) return;
  await watchShips(db, gh, store, at, commit);
  await watchPulls(db, gh, store, at);
  if (gh.says()?.until) return;
  await mergeMain(db, gh, merging, at).catch((e) => quiet(e) || console.warn(`ship: main not merged into the open pull requests: ${(e as Error).message}`));
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
