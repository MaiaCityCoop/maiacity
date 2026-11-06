#!/usr/bin/env bun
// An intent's checks, run in avenBOX (play/SPEC.md §4.12, "Checks run in avenBOX, and again on main"):
//
//   bun play/avenbox/intent.ts <intent-uuid> [--record] [--pr <number>] [--where avenBOX|main] [--only c1,c3] [--no-up]
//
// It reads the intent over play's MCP (get_intent; PLAY_MCP_URL, play.maia.city's by default, PLAY_MCP_TOKEN its
// Bearer), makes the box ready (up.sh, unless --no-up), then runs each check's `run` in order from the repository's
// root with bash, each under a timeout, and prints its id, must or nice, pass or fail (exit code 0 passes), the
// seconds it took and the tail of its output. A look is never marked passed: its run, if it has one, makes what is
// looked at, and it is listed to be judged by eye. It exits 1 while any must test or measure check fails.
//
// --record sends check_intent for every test and measure check it ran: pass as its exit code says, where it ran
// (avenBOX, or main on main's runner after the merge: .github/workflows/intents.yml), the commit, and the evidence:
// the command, the exit code, where (the Actions run's link on main), the commit, Postgres's version, the output's
// tail. --pr names the intent's pull request into main (check_intent's pr): Accept merges it, and only when every must
// check with a run last passed on its head, the commit recorded here (play/api/src/ship.ts). Only this process holds the
// token: no run sees PLAY_MCP_TOKEN, nor GitHub's tokens.
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TAIL = 40;
const EVIDENCE_MOST = 4000;
const DATABASE = "postgres://postgres:play@127.0.0.1:5432/postgres";
/** what no check's command may see: play's token and GitHub's */
const SECRETS = ["PLAY_MCP_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "ACTIONS_RUNTIME_TOKEN", "ACTIONS_ID_TOKEN_REQUEST_TOKEN", "ACTIONS_ID_TOKEN_REQUEST_URL"];

type Check = { id: string; check: string; how: "test" | "measure" | "look"; by: string; run?: string; must: boolean };
type Ran = { check: Check; code: number; seconds: number; tail: string };

function usage(why: string): never {
  console.error(`${why}\nbun play/avenbox/intent.ts <intent-uuid> [--record] [--pr <number>] [--where avenBOX|main] [--only c1,c3] [--no-up] [--timeout <seconds>]`);
  process.exit(2);
}

const argv = Bun.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const option = (name: string) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) usage(`${name} needs a value.`);
  return v;
};
const id = argv.find((a, i) => !a.startsWith("--") && !["--where", "--only", "--timeout", "--pr"].includes(argv[i - 1] ?? ""));
if (!id || !UUID.test(id)) usage("Name the intent by its id, a UUID.");
const where = option("--where") ?? "avenBOX";
if (where !== "avenBOX" && where !== "main") usage("--where is avenBOX or main.");
const only = option("--only")?.split(",").map((s) => s.trim());
const timeout = Number(option("--timeout") ?? 600) * 1000;
const record = flag("--record");
const prGiven = option("--pr");
const pr = prGiven === undefined ? undefined : Number(prGiven.replace(/^#/, ""));
if (pr !== undefined && (!Number.isInteger(pr) || pr < 1)) usage("--pr is the number of the intent's pull request into main.");
if (pr !== undefined && !record) usage("--pr names the pull request as the checks are recorded: give --record with it.");
const endpoint = process.env.PLAY_MCP_URL || "https://play.maia.city/api/mcp";
const token = process.env.PLAY_MCP_TOKEN;
if (!token) usage("PLAY_MCP_TOKEN is not set: an admin's play access token (play's profile page).");

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

/** a check's command, from the repository's root, its stderr with its stdout, killed at the timeout */
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

const intent = await tool("get_intent", { intent: id }).catch((e) => usage(`${e.message}`));
const checks: Check[] = (intent.spec?.checks ?? []).filter((c: Check) => !only || only.includes(c.id));
console.log(`intent ${intent.id} · ${intent.stage} · ${intent.title}`);
if (!intent.spec) usage("This intent has no spec yet: nothing to run.");

if (!flag("--no-up")) {
  const up = Bun.spawnSync(["bash", `${ROOT}/play/avenbox/up.sh`], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
  if (up.exitCode !== 0) console.log("avenBOX: up.sh did not make the box ready; the checks that need Postgres will fail");
}

// every run's environment: the box's database, and no token
const env: Record<string, string | undefined> = { ...process.env, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || DATABASE };
for (const s of SECRETS) delete env[s];

const head = sh(["git", "rev-parse", "HEAD"]);
const commit = head.code === 0 && /^[0-9a-f]{40}$/.test(head.out) ? head.out : undefined;
const dirty = sh(["git", "status", "--porcelain"]).out !== "";
const postgres = sh(["psql", env.TEST_DATABASE_URL!, "-tAc", "show server_version"], env);
const pg = postgres.code === 0 ? postgres.out.split(" ")[0] : "not answering";
const { GITHUB_SERVER_URL: gh, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: run } = process.env;
const link = gh && repo && run ? `${gh}/${repo}/actions/runs/${run}` : undefined;
const at = `${where}${link ? ` (${link})` : ""} · commit ${commit ?? "unknown"}${dirty ? "+dirty" : ""} · PostgreSQL ${pg}`;
console.log(`running ${checks.length} check${checks.length === 1 ? "" : "s"} in ${at}\n`);

const ran: Ran[] = [];
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
    ran.push({ check: c, ...r });
    console.log(`${r.code === 0 ? "✓" : "✗"} ${label} · ${r.seconds.toFixed(1)} s · exit ${r.code} · ${c.check}`);
  }
  if (r.tail) console.log(r.tail.replace(/^/gm, "    "));
}
for (const c of toJudge.filter((c) => !c.run)) console.log(`· ${c.id} look (${c.must ? "must" : "nice"}): judge it by eye: ${c.by}`);
for (const c of unrun) console.log(`· ${c.id} ${c.how} (${c.must ? "must" : "nice"}): no run (specified before runs existed): ${c.by}`);

const failed = ran.filter((r) => r.code !== 0);
const mustFailed = failed.filter((r) => r.check.must);
console.log(`\n${ran.length - failed.length} passed, ${failed.length} failed${toJudge.length ? `, ${toJudge.length} to judge by eye` : ""}${unrun.length ? `, ${unrun.length} without a run` : ""}`);

if (record && ran.length) {
  const evidenceOf = (r: Ran) => {
    const top = `$ ${r.check.run}\nexit ${r.code} in ${r.seconds.toFixed(1)} s · ${at}\n`;
    const room = EVIDENCE_MOST - top.length - 2;
    const tail = r.tail.length > room ? `…${r.tail.slice(r.tail.length - room + 1)}` : r.tail;
    return `${top}${tail ? `\n${tail}` : ""}`.slice(0, EVIDENCE_MOST);
  };
  try {
    await tool("check_intent", {
      intent: intent.id,
      results: ran.map((r) => ({ check: r.check.id, pass: r.code === 0, evidence: evidenceOf(r), where, ...(commit ? { commit } : {}) })),
      ...(pr ? { pr } : {}),
    });
    console.log(`recorded ${ran.map((r) => r.check.id).join(", ")} on intent ${intent.id} (where ${where}${pr ? `, pull request #${pr}` : ""})`);
    if (dirty) console.log("the work tree had changes not committed: commit, push and run again, so the results are of the pull request's head");
  } catch (e) {
    console.log(`not recorded: ${(e as Error).message}`);
    process.exit(1);
  }
}
process.exit(mustFailed.length ? 1 : 0);
