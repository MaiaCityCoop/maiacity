#!/usr/bin/env bun
// An intent's checks, run in avenBOX (play/SPEC.md §4.12, "Only the box's run is evidence"; Samuel 2026-11-06):
//
//   bun play/avenbox/intent.ts <intent-uuid> [--only c1,c3] [--no-up] [--timeout <seconds>]
//       runs the checks and prints them, recording nothing: how an agent tests itself while prototyping, anywhere.
//   bun play/avenbox/intent.ts <intent-uuid> --spec-out <file>
//       writes the intent's spec (its checks) to a file, running nothing: intents-pr.yml's spec job, main's own code.
//   bun play/avenbox/intent.ts --from <spec file> --results-out <file> [--root <dir>] [--where avenBOX|main]
//       runs that spec's checks from <dir>'s root (the repository's by default) with no token at all, and writes each
//       result with the commit it ran on, whether its work tree was clean (and if not, which files), PostgreSQL's
//       version and the run's link: intents-pr.yml's run job, on the pull request's head.
//   bun play/avenbox/intent.ts [<intent-uuid>] --record-from <results file> [--pr <number>] [--head <sha>]
//       records those results on the intent with check_intent (where, the commit, the run's link, pr), refusing them
//       if they are of another intent than the one named, or their commit is not --head: intents-pr.yml's record job, main's own code with avenBOX's token.
//   bun play/avenbox/intent.ts <intent-uuid> --record [--pr <number>] [--where avenBOX|main]
//       runs and records in one go, in a GitHub run only (GITHUB_ACTIONS: intents.yml on main); anywhere else it
//       refuses: the pull request's run records them.
//
// It reads the intent over play's MCP (get_intent; PLAY_MCP_URL, play.maia.city's by default, PLAY_MCP_TOKEN its
// Bearer: avenBOX's token in the GitHub runs, play takes a code intent's test and measure results from it alone). Each
// check's `run` runs in order with bash, under a timeout, from the root; it prints its id, must or nice, pass or fail
// (exit code 0 passes), the seconds it took and the tail of its output. A look is never marked passed: its run, if it
// has one, makes what is looked at, and it is listed to be judged by eye (and recorded by hand). It exits 1 while any
// must test or measure check fails. No check's command sees PLAY_MCP_TOKEN, nor GitHub's tokens.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{40}$/;
const TAIL = 40;
const EVIDENCE_MOST = 4000;
const DATABASE = "postgres://postgres:play@127.0.0.1:5432/postgres";
/** what no check's command may see: play's token and GitHub's */
const SECRETS = ["PLAY_MCP_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "ACTIONS_RUNTIME_TOKEN", "ACTIONS_ID_TOKEN_REQUEST_TOKEN", "ACTIONS_ID_TOKEN_REQUEST_URL"];
/** what the box says to a --record outside the GitHub run */
export const RUN_RECORDS =
  "--record runs only in the GitHub run: the pull request's run records them (.github/workflows/intents-pr.yml, as it is marked ready, and on each push to it). Here, run without --record: it runs and prints the checks, recording nothing.";

type Check = { id: string; check: string; how: "test" | "measure" | "look"; by: string; run?: string; must: boolean };
type SpecFile = { intent: { id: string; stage: string; title: string }; checks: Check[] };
type Result = { check: string; how: string; must: boolean; pass: boolean; code: number; evidence: string };
type ResultsFile = { intent: string; where: "avenBOX" | "main"; commit: string | null; dirty: string[]; postgres: string; link: string | null; results: Result[] };

const USAGE = `bun play/avenbox/intent.ts <intent-uuid> [--only c1,c3] [--no-up] [--timeout <seconds>]
bun play/avenbox/intent.ts <intent-uuid> --spec-out <file>
bun play/avenbox/intent.ts --from <spec file> --results-out <file> [--root <dir>] [--where avenBOX|main]
bun play/avenbox/intent.ts --record-from <results file> [--pr <number>] [--head <sha>]
bun play/avenbox/intent.ts <intent-uuid> --record [--pr <number>] [--where avenBOX|main]   (in a GitHub run only)`;
function usage(why: string): never {
  console.error(`${why}\n${USAGE}`);
  process.exit(2);
}

const argv = Bun.argv.slice(2);
const VALUED = ["--where", "--only", "--timeout", "--pr", "--spec-out", "--from", "--results-out", "--record-from", "--root", "--head"];
const flag = (name: string) => argv.includes(name);
const option = (name: string) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) usage(`${name} needs a value.`);
  return v;
};
const id = argv.find((a, i) => !a.startsWith("--") && !VALUED.includes(argv[i - 1] ?? ""));
const where = option("--where") ?? "avenBOX";
if (where !== "avenBOX" && where !== "main") usage("--where is avenBOX or main.");
const only = option("--only")?.split(",").map((s) => s.trim());
const timeout = Number(option("--timeout") ?? 600) * 1000;
const record = flag("--record");
const specOut = option("--spec-out");
const from = option("--from");
const resultsOut = option("--results-out");
const recordFrom = option("--record-from");
const head = option("--head");
if (head !== undefined && !SHA.test(head)) usage("--head is the pull request's head, a 40-character git hash.");
const ROOT = resolve(option("--root") ?? resolve(import.meta.dir, "../.."));
const prGiven = option("--pr");
const pr = prGiven === undefined ? undefined : Number(prGiven.replace(/^#/, ""));
if (pr !== undefined && (!Number.isInteger(pr) || pr < 1)) usage("--pr is the number of the intent's pull request into main.");
if (pr !== undefined && !record && !recordFrom) usage("--pr names the pull request as the checks are recorded: give it with --record-from.");
if ([specOut, from, recordFrom, record || undefined].filter((x) => x !== undefined).length > 1) usage("One of --spec-out, --from, --record-from and --record at a time.");
if (from !== undefined && !resultsOut) usage("--from writes its results: give --results-out <file>.");
if (resultsOut !== undefined && from === undefined) usage("--results-out goes with --from <spec file>.");
if (from === undefined && recordFrom === undefined && (!id || !UUID.test(id))) usage("Name the intent by its id, a UUID.");
if (id !== undefined && !UUID.test(id)) usage("Name the intent by its id, a UUID.");
// --record is the GitHub run's alone (Samuel 2026-11-06): only the box's run is evidence
if (record && process.env.GITHUB_ACTIONS !== "true") {
  console.error(RUN_RECORDS);
  process.exit(2);
}
const endpoint = process.env.PLAY_MCP_URL || "https://play.maia.city/api/mcp";
const token = process.env.PLAY_MCP_TOKEN;
if (from === undefined && !token) usage("PLAY_MCP_TOKEN is not set: an admin's play access token (play's profile page).");

let rpcId = 0;
/** a play MCP tool: its result as JSON, or it throws with the tool's own words */
async function tool(name: string, args: Record<string, unknown>) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!r.ok) throw new Error(`${name}: play answered ${r.status} ${await r.text()}`);
  const body = (await r.json()) as any;
  if (body.error) throw new Error(`${name}: ${body.error.message}`);
  const text = body.result?.content?.[0]?.text ?? "";
  if (body.result?.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
}

const sh = (cmd: string[], env?: Record<string, string | undefined>) => {
  const p = Bun.spawnSync(cmd, { cwd: ROOT, env: env ?? process.env, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode ?? 1, out: `${p.stdout}`.trim() };
};
const { GITHUB_SERVER_URL: gh, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: runId } = process.env;
const link = gh && repo && runId ? `${gh}/${repo}/actions/runs/${runId}` : null;

/** a check's command, from the root, its stderr with its stdout, killed at the timeout */
async function runOne(run: string, env: Record<string, string | undefined>) {
  const start = performance.now();
  const p = Bun.spawn(["bash", "-c", `exec 2>&1\n${run}`], { cwd: ROOT, env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    p.kill("SIGKILL");
  }, timeout);
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  clearTimeout(timer);
  const lines = out.replace(/\s+$/, "").split("\n");
  let tail = lines.slice(-TAIL).join("\n");
  if (timedOut) tail += `\n(killed after ${timeout / 1000} s)`;
  return { code: timedOut ? 124 : code, seconds: (performance.now() - start) / 1000, tail };
}

/** the spec's checks run in the box, printed; their results with where they ran (no token is needed or seen) */
async function runChecks(spec: SpecFile): Promise<ResultsFile> {
  const checks = spec.checks.filter((c) => !only || only.includes(c.id));
  console.log(`intent ${spec.intent.id} · ${spec.intent.stage} · ${spec.intent.title}`);
  if (!flag("--no-up")) {
    const up = Bun.spawnSync(["bash", `${ROOT}/play/avenbox/up.sh`], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
    if (up.exitCode !== 0) console.log("avenBOX: up.sh did not make the box ready; the checks that need Postgres will fail");
  }
  // every run's environment: the box's database, and no token
  const env: Record<string, string | undefined> = { ...process.env, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || DATABASE };
  for (const s of SECRETS) delete env[s];

  const rev = sh(["git", "rev-parse", "HEAD"]);
  const commit = rev.code === 0 && SHA.test(rev.out) ? rev.out : null;
  // a dirty run names the files that made it dirty (a per-user file, .claude/settings.local.json, is ignored: .gitignore)
  const status = Bun.spawnSync(["git", "status", "--porcelain"], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  const dirty = `${status.stdout}`.split("\n").filter((l) => l.trim()).map((l) => l.slice(3));
  const postgres = sh(["psql", env.TEST_DATABASE_URL!, "-tAc", "show server_version"], env);
  const pg = postgres.code === 0 ? postgres.out.split(" ")[0] : "not answering";
  const at = `${where}${link ? ` (${link})` : ""} · commit ${commit ?? "unknown"}${dirty.length ? `+dirty (${dirty.join(", ")})` : ""} · PostgreSQL ${pg}`;
  console.log(`running ${checks.length} check${checks.length === 1 ? "" : "s"} in ${at}\n`);

  const results: Result[] = [];
  const toJudge: Check[] = [];
  const unrun: Check[] = [];
  for (const c of checks) {
    const label = `${c.id} ${c.how} (${c.must ? "must" : "nice"})`;
    if (!c.run) {
      (c.how === "look" ? toJudge : unrun).push(c);
      continue;
    }
    const r = await runOne(c.run, env);
    if (c.how === "look") {
      console.log(`· ${label}: made in ${r.seconds.toFixed(1)} s (exit ${r.code}); judge it by eye: ${c.by}`);
      toJudge.push(c);
    } else {
      const top = `$ ${c.run}\nexit ${r.code} in ${r.seconds.toFixed(1)} s · ${at}\n`;
      const room = EVIDENCE_MOST - top.length - 2;
      const tail = r.tail.length > room ? `…${r.tail.slice(r.tail.length - room + 1)}` : r.tail;
      results.push({ check: c.id, how: c.how, must: c.must, pass: r.code === 0, code: r.code, evidence: `${top}${tail ? `\n${tail}` : ""}`.slice(0, EVIDENCE_MOST) });
      console.log(`${r.code === 0 ? "✓" : "✗"} ${label} · ${r.seconds.toFixed(1)} s · exit ${r.code} · ${c.check}`);
    }
    if (r.tail) console.log(r.tail.replace(/^/gm, "    "));
  }
  for (const c of toJudge.filter((c) => !c.run)) console.log(`· ${c.id} look (${c.must ? "must" : "nice"}): judge it by eye: ${c.by}`);
  for (const c of unrun) console.log(`· ${c.id} ${c.how} (${c.must ? "must" : "nice"}): no run (specified before runs existed): ${c.by}`);
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed${toJudge.length ? `, ${toJudge.length} to judge by eye` : ""}${unrun.length ? `, ${unrun.length} without a run` : ""}`);
  if (dirty.length) console.log(`the work tree was dirty: ${dirty.join(", ")}`);
  return { intent: spec.intent.id, where, commit, dirty, postgres: pg, link, results };
}

/** the results recorded on the intent with check_intent, where they ran, their commit and the run's link */
async function recordResults(file: ResultsFile) {
  if (!file.results.length) return;
  await tool("check_intent", {
    intent: file.intent,
    results: file.results.map((r) => ({ check: r.check, pass: r.pass, evidence: r.evidence, where: file.where, ...(file.commit ? { commit: file.commit } : {}), ...(file.link ? { link: file.link } : {}) })),
    ...(pr ? { pr } : {}),
  });
  console.log(`recorded ${file.results.map((r) => r.check).join(", ")} on intent ${file.intent} (where ${file.where}${file.commit ? `, commit ${file.commit}` : ""}${pr ? `, pull request #${pr}` : ""})`);
}

const specOf = async (intentId: string): Promise<SpecFile> => {
  const intent = await tool("get_intent", { intent: intentId }).catch((e) => usage(`${e.message}`));
  if (!intent.spec) usage("This intent has no spec yet: nothing to run.");
  return { intent: { id: intent.id, stage: intent.stage, title: intent.title }, checks: intent.spec.checks ?? [] };
};
const mustFailed = (file: ResultsFile) => file.results.some((r) => r.must && !r.pass);

if (specOut !== undefined) {
  const spec = await specOf(id!);
  writeFileSync(specOut, JSON.stringify(spec, null, 2));
  console.log(`the spec of intent ${spec.intent.id} (${spec.checks.length} checks) written to ${specOut}`);
  process.exit(0);
}

if (from !== undefined) {
  const spec = JSON.parse(readFileSync(from, "utf8")) as SpecFile;
  if (!UUID.test(spec?.intent?.id ?? "") || !Array.isArray(spec.checks)) usage(`${from} is not a spec --spec-out wrote.`);
  const file = await runChecks(spec);
  writeFileSync(resultsOut!, JSON.stringify(file, null, 2));
  console.log(`results written to ${resultsOut}`);
  process.exit(mustFailed(file) ? 1 : 0);
}

if (recordFrom !== undefined) {
  const file = JSON.parse(readFileSync(recordFrom, "utf8")) as ResultsFile;
  if (!UUID.test(file?.intent ?? "") || !Array.isArray(file.results)) usage(`${recordFrom} is not a results file --results-out wrote.`);
  if (id !== undefined && file.intent !== id) {
    console.log(`not recorded: the results are of intent ${file.intent}, not of ${id}`);
    process.exit(1);
  }
  if (head !== undefined && file.commit !== head) {
    console.log(`not recorded: the results ran on ${file.commit ?? "no commit"}, not on the pull request's head ${head}`);
    process.exit(1);
  }
  try {
    await recordResults(file);
  } catch (e) {
    console.log(`not recorded: ${(e as Error).message}`);
    process.exit(1);
  }
  const red = file.results.filter((r) => r.must && !r.pass).map((r) => r.check);
  console.log(red.length ? `must checks failed: ${red.join(", ")}` : "every must check with a run passed");
  process.exit(red.length ? 1 : 0);
}

// run (and, in a GitHub run, --record)
const file = await runChecks(await specOf(id!));
if (record && file.results.length) {
  try {
    await recordResults(file);
    if (file.dirty.length) console.log(`the work tree had changes not committed (${file.dirty.join(", ")}): the results are not of a commit alone`);
  } catch (e) {
    console.log(`not recorded: ${(e as Error).message}`);
    process.exit(1);
  }
}
process.exit(mustFailed(file) ? 1 : 0);
