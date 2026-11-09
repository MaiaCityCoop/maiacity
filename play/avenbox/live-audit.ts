#!/usr/bin/env bun
// Whether every code intent's stage agrees with what play runs (intent 9876ef00; play/SPEC.md §4.12, *Accept ships
// it*), checked from outside, the same rule as play's reconcile (play/api/src/ship.ts reconcile):
//
//   bun play/avenbox/live-audit.ts [--commit <sha>]
//
// (--commit audits against a commit given instead of the one /api/version names: a play built before it answered one)
//
// It reads the commit play runs from GET /api/version (PLAY_URL, https://play.maia.city by default), every intent over
// play's MCP (list_intents, all; PLAY_MCP_URL and PLAY_MCP_TOKEN, an admin's token, as play/avenbox/intent.ts), and
// main's history from git (origin/main fetched). A code intent is one with no work of play's that names a pull request
// or whose trailer `Intent: <its UUID>` is on a commit of main; its merge commit is its ship's, else the commit that
// merged its pull request on main, else its commits on main. It is live when each is an ancestor of the running commit.
// It prints every mismatch (live and not Accepted, Accepted and not live), and exits 0 only with none.
import { resolve } from "node:path";
import { intentsIn } from "../api/src/kit/ids";
import { PLAY_SITE as site, tool as playTool } from "./play";

const ROOT = resolve(import.meta.dir, "../..");
const token = process.env.PLAY_MCP_TOKEN;
if (!token) {
  console.error("PLAY_MCP_TOKEN is not set: an admin's play access token (play's profile page).");
  process.exit(2);
}

const git = (...args: string[]) => {
  const p = Bun.spawnSync(["git", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode ?? 1, out: `${p.stdout}`.trim() };
};

const tool = (name: string, args: Record<string, unknown>) => playTool(name, args, { token });

const given = Bun.argv.indexOf("--commit");
const commit = given > 0 ? Bun.argv[given + 1] : ((await (await fetch(`${site}/api/version`)).json().catch(() => ({}))) as { commit?: string | null }).commit;
if (!commit) {
  console.error(`${site}/api/version names no commit: play was built without PLAY_COMMIT.`);
  process.exit(1);
}
if (!/^[0-9a-f]{40}$/.test(commit)) {
  console.error(`${commit} is no 40-character commit.`);
  process.exit(2);
}
console.log(`play runs ${commit} (${given > 0 ? "given" : `${site}/api/version`})`);

if (git("fetch", "-q", "origin", "main").code !== 0) console.warn("git fetch origin main failed: main as this clone has it");
if (git("cat-file", "-e", `${commit}^{commit}`).code !== 0 && git("fetch", "-q", "origin", commit).code !== 0) {
  console.error(`The running commit ${commit} is not in this clone, nor fetched.`);
  process.exit(1);
}

// main's commits, each its message: the trailers, and the merge commit of each pull request (a ship's title ends "(#N)")
const log = git("log", "origin/main", "--format=%H%x00%B%x01").out;
const trailers = new Map<string, string[]>();
const mergeOf = new Map<number, string>();
for (const entry of log.split("\x01")) {
  const [sha, message = ""] = entry.trim().split("\x00");
  if (!sha) continue;
  for (const id of intentsIn(message)) trailers.set(id, [...(trailers.get(id) ?? []), sha]);
  const pr = message.match(/^Merge pull request #(\d+) /) ?? message.split("\n")[0].match(/\(#(\d+)\)$/);
  if (pr && !mergeOf.has(+pr[1])) mergeOf.set(+pr[1], sha);
}
const ancestor = new Map<string, boolean>();
const inRunning = (sha: string) => {
  if (!ancestor.has(sha)) ancestor.set(sha, git("merge-base", "--is-ancestor", sha, commit).code === 0);
  return ancestor.get(sha)!;
};

const intents: any[] = await tool("list_intents", { stage: "all" });
let code = 0;
let mismatches = 0;
for (const i of intents) {
  if (i.work || !["build", "proposal", "ship", "archived", "accepted"].includes(i.stage)) continue;
  let merges: string[];
  if (i.pull_request) {
    const m = i.ship?.pr === i.pull_request && i.ship?.merge ? i.ship.merge : mergeOf.get(i.pull_request);
    merges = m ? [m] : [];
  } else merges = trailers.get(i.id) ?? [];
  if (!i.pull_request && !merges.length) continue;
  code++;
  const live = merges.length > 0 && merges.every(inRunning);
  // a ship still on its way is the watcher's
  if (i.stage === "ship" && !i.ship?.outcome) continue;
  const wrong = live ? i.stage !== "accepted" : i.stage === "accepted";
  if (!wrong) continue;
  mismatches++;
  console.log(
    `MISMATCH ${i.id} · ${i.stage} · ${live ? "live" : "not live"} · ${merges.map((m) => m.slice(0, 7)).join(", ") || `#${i.pull_request} not merged`} · ${i.title}`,
  );
}
console.log(`${code} code intents, ${mismatches} mismatch${mismatches === 1 ? "" : "es"} against ${commit.slice(0, 7)}`);
process.exit(mismatches ? 1 : 0);
