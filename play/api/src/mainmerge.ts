// Conflicts with main shown (play/SPEC.md §4.12 "Accept ships it"; intents f28822d9, f7721142), each tick of Ship's
// watcher: an open intent pull request GitHub finds not mergeable is failed, the status 'Merges with main' posted on
// its head (failure, then success once it merges again). play never merges main into a pull request: one behind main
// is fine, GitHub's merge queue tests it with main as it lands, and main moving resets nothing.
import type { Db } from "./kit/pg";
import { MERGES_CONTEXT, openPulls, postStatus, quiet, type GitHub } from "./github";
import { conflictWhy, type PrSeen } from "./substate";

/** the files both the branch and main changed since their merge base: every file a conflict can be in */
async function conflictFiles(gh: GitHub, seen: PrSeen, main: string) {
  const base = (await gh.compare(main, seen.head)).merge_base_commit.sha;
  const onMain = new Set(((await gh.compare(base, main)).files ?? []).flatMap((f) => [f.filename, ...(f.previous_filename ? [f.previous_filename] : [])]));
  return [...new Set((await gh.pullFiles(seen.pr)).filter((f) => onMain.has(f)))].sort();
}

/** One look: each open intent pull request into main in conflict shown so, one that merges again cleared; no branch is changed. */
export async function mergeMain(db: Db, gh: GitHub) {
  let main: string | null = null;
  for (const { id, pull_request, pr_seen: seen } of await openPulls(db)) {
    if (gh.says()?.until) break;
    if (!seen || seen.pr !== pull_request || seen.state !== "open" || seen.merged || seen.base !== "main") continue;
    try {
      if (seen.mergeable === false) {
        main ??= await gh.branchHead("main");
        if (seen.conflicts?.head !== seen.head || seen.conflicts.main !== main) {
          const files = await conflictFiles(gh, seen, main).catch((e) => void console.warn(`ship: #${seen.pr}'s files in conflict not worked out: ${(e as Error).message}`));
          if (files) seen.conflicts = { head: seen.head, main, files };
        }
        await postStatus(db, gh, id, seen, MERGES_CONTEXT, "failure", conflictWhy(seen));
      } else if (seen.mergeable === true && seen.posted?.[MERGES_CONTEXT]?.state === "failure")
        await postStatus(db, gh, id, seen, MERGES_CONTEXT, "success", "merges with main again");
    } catch (e) {
      if (!quiet(e)) console.warn(`ship: #${pull_request} of intent ${id} not looked at against main: ${(e as Error).message}`);
    }
  }
}
