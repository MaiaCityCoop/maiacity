// The way to production (play/SPEC.md §4.12) as the workflows say it, read as YAML: release.yml fast-forwards production
// to a commit of main once main.yml is green for a push (or by hand, or Accept again, with a sha) with GITHUB_TOKEN and
// starts production.yml, which writes SHIP_TOKEN into play's environment; the compose file hands it to play-api.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const text = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const yaml = (path: string) => Bun.YAML.parse(text(path)) as any;

describe("the way to production", () => {
  test("release.yml: after main.yml is green for a push to main, or by hand with a sha; one at a time", () => {
    const r = yaml(".github/workflows/release.yml");
    expect(r.name).toBe("release");
    // play's ship watcher finds the run by its name
    expect(r["run-name"]).toBe("release ${{ github.event.workflow_run.head_sha || inputs.sha }}");
    expect(r.on.workflow_run).toEqual({ workflows: ["main"], types: ["completed"], branches: ["main"] });
    expect(yaml(".github/workflows/main.yml").name).toBe("main");
    expect(r.on.workflow_dispatch.inputs.sha.required).toBe(true);
    expect(Object.keys(r.on).sort()).toEqual(["workflow_dispatch", "workflow_run"]);
    expect(r.concurrency).toEqual({ group: "release", "cancel-in-progress": false });
    expect(r.permissions).toEqual({ contents: "write", actions: "write" });
    const job = r.jobs.release;
    expect(job.if).toBe("github.event_name == 'workflow_dispatch' || (github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push')");
  });

  test("release.yml: production moves fast-forward to the commit with GITHUB_TOKEN, and production.yml is started on it", () => {
    const steps = yaml(".github/workflows/release.yml").jobs.release.steps as any[];
    // blobless: the commits and trees the ancestry checks read, no file's contents
    expect(steps[0]).toEqual({ uses: "actions/checkout@v4", with: { "fetch-depth": 0, filter: "blob:none", "sparse-checkout": ".github/workflows/release.yml", "sparse-checkout-cone-mode": false } });
    const move = steps.find((s) => s.name?.startsWith("production moves"));
    expect(move.env.SHA).toBe("${{ github.event.workflow_run.head_sha || inputs.sha }}");
    expect(move.run).toContain(`git merge-base --is-ancestor "$SHA" origin/main`);
    expect(move.run).toContain(`git merge-base --is-ancestor "$PROD" "$SHA"`);
    expect(move.run).toContain(`git push origin "$SHA:refs/heads/production"`);
    expect(move.run).not.toContain("--force");
    expect(move.run).not.toMatch(/\bpush\b[^\n]*\s-f\b/);
    // only GITHUB_TOKEN: no secret is read here
    expect(text(".github/workflows/release.yml")).not.toContain("secrets.");
    const deploy = steps.find((s) => s.name === "production.yml deploys it");
    expect(deploy.env.GH_TOKEN).toBe("${{ github.token }}");
    expect(deploy.run).toBe(`gh workflow run production.yml --ref production --repo "$GITHUB_REPOSITORY"`);
  });

  test("production.yml: started by workflow_dispatch, every job reads main's checks on its own commit, and it writes SHIP_TOKEN into play.env", () => {
    const p = yaml(".github/workflows/production.yml");
    expect(Object.keys(p.on)).toContain("workflow_dispatch");
    // the jobs play's ship watcher follows, by their names
    const names = Object.values(p.jobs).map((j: any) => j.name);
    for (const n of ["The image", "The backup", "The server", "The website"]) expect(names).toContain(n);
    expect(p.jobs.backup.steps.map((s: any) => s.name)).toContain("Back up play");
    for (const job of Object.values(p.jobs) as any[]) {
      const gate = job.steps.find((s: any) => s.uses === "./.github/actions/main-green");
      expect(gate.with).toEqual({ token: "${{ github.token }}", sha: "${{ github.sha }}" });
      expect(job.permissions.checks).toBe("read");
    }
    const green = yaml(".github/actions/main-green/action.yml");
    expect(green.runs.steps[0].env.REQUIRED).toBe("${{ github.action_path }}/../../required-checks.json");
    expect(green.runs.steps[0].run).toContain("passed()");
    const start = p.jobs.server.steps.find((s: any) => s.name === "Start play-api, import, and answer play.maia.city");
    expect(start.env.SHIP_TOKEN).toBe("${{ secrets.SHIP_TOKEN }}");
    expect(start.env.SHIP_REPO).toBe("${{ github.repository }}");
    // the step hands its values and deploy/server-up.sh to the server over stdin; the script writes play.env
    expect(start.run).toContain("SHIP_TOKEN SHIP_REPO; do printf '%s=%q\\n' \"$v\" \"${!v}\"; done");
    expect(start.run).toContain("cat deploy/server-up.sh; } | ssh prod");
    const up = text("deploy/server-up.sh");
    const env = up.slice(up.indexOf("cat > play.env <<EOF2"), up.indexOf("\nEOF2", up.indexOf("cat > play.env")));
    expect(env).toContain("\nSHIP_TOKEN=$SHIP_TOKEN");
    expect(env).toContain("\nSHIP_REPO=$SHIP_REPO");
    // the token is never echoed
    expect(start.run).not.toMatch(/echo[^\n]*\$SHIP_TOKEN/);
  });

  test("play-api gets SHIP_TOKEN and SHIP_REPO from play.env", () => {
    const c = yaml("play/docker-compose.play.yml");
    expect(c.services["play-api"].environment).toMatchObject({ SHIP_TOKEN: "${SHIP_TOKEN:-}", SHIP_REPO: "${SHIP_REPO:-}" });
  });
});

// Every pull request names its one intent (play/SPEC.md §4.12, Samuel 2026-11-06): Intent named
// (play/avenbox/pr-intent.ts) against a fake GitHub and a fake play, and intents-pr.yml read as YAML.
describe("Intent named", async () => {
  const { judge } = await import("../../avenbox/pr-intent");
  const A = "4ea6b2ed-f96a-4bf6-83fd-4d165a793194";
  const B = "c9113886-0803-4ab9-bc3c-8e73b6667484";
  type Pull = { number: number; title: string; body: string; state: string; merged_at?: string | null; commits: string[] };
  const pulls = new Map<number, Pull>();
  const intents = new Map<string, { id: string; stage: string; pull_request: number | null }>();
  let gh: ReturnType<typeof Bun.serve>, play: ReturnType<typeof Bun.serve>;
  const seen: string[] = [];
  const start = () => {
    gh = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch(req) {
        seen.push(req.headers.get("authorization") ?? "");
        const m = /^\/repos\/maia\/city\/pulls\/(\d+)(\/commits)?$/.exec(new URL(req.url).pathname);
        const p = m && pulls.get(Number(m[1]));
        if (!p) return new Response("not found", { status: 404 });
        if (m![2]) return Response.json(Number(new URL(req.url).searchParams.get("page") ?? 1) > 1 ? [] : p.commits.map((message) => ({ commit: { message } })));
        return Response.json({ number: p.number, title: p.title, body: p.body, state: p.state, merged_at: p.merged_at ?? null });
      },
    });
    play = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      async fetch(req) {
        const { params } = (await req.json()) as any;
        const it = intents.get(params.arguments.intent);
        const result = it ? { content: [{ type: "text", text: JSON.stringify(it) }] } : { isError: true, content: [{ type: "text", text: "no such intent" }] };
        return Response.json({ jsonrpc: "2.0", id: 1, result });
      },
    });
  };
  start();
  const env = () => ({ github: `${gh.url}`, repo: "maia/city", ghToken: "ghs_read", play: `${play.url}api/mcp`, playToken: "play_box" });
  const pull = (number: number, body: string, commits: string[], more: Partial<Pull> = {}) => pulls.set(number, { number, title: `[${A.slice(0, 8)}] a fix`, body, state: "open", commits, ...more });

  test("green: one intent named by its full UUID in its body and commits, at Build, Proposal or Ship, its active pull request or none yet", async () => {
    for (const stage of ["build", "proposal", "ship"]) {
      intents.set(A, { id: A, stage, pull_request: null });
      pull(10, `A fix.\n\nIntent: ${A}`, [`one\n\nIntent: ${A}`, `two\n\nIntent: ${A.toUpperCase()}`]);
      const v = await judge(10, env());
      expect(v).toMatchObject({ ok: true, intent: A });
      expect(v.why).toContain("none named yet");
      expect(v.notes).toEqual([]);
    }
    intents.set(A, { id: A, stage: "build", pull_request: 10 });
    expect((await judge(10, env())).why).toContain("its active pull request");
    // the intent's earlier pull request is closed: this one may take its place
    pull(9, `Intent: ${A}`, [], { state: "closed" });
    intents.set(A, { id: A, stage: "proposal", pull_request: 9 });
    expect(await judge(10, env())).toMatchObject({ ok: true, notes: ["the intent's pull request was #9 (closed): its run names this one"] });
    // the title's short id is only shown: its lack is a note, never red
    intents.set(A, { id: A, stage: "proposal", pull_request: 10 });
    pull(10, `Intent: ${A}`, [`x\n\nIntent: ${A}`], { title: "no short id" });
    expect(await judge(10, env())).toMatchObject({ ok: true, notes: [`its title does not show [${A.slice(0, 8)}] (only shown)`] });
    expect(seen.every((a) => a === "Bearer ghs_read")).toBe(true);
  });

  test("red, saying why: none, two, another stage, or another open pull request of the same intent (consolidate into it or close this one)", async () => {
    intents.set(A, { id: A, stage: "build", pull_request: null });
    pull(11, "No intent here.", ["just a commit"]);
    expect(await judge(11, env())).toMatchObject({ ok: false });
    expect((await judge(11, env())).why).toContain("names no intent");
    // a bare UUID or a short id does not name one: only the line Intent: <uuid>
    pull(11, `about ${A}\n[${A.slice(0, 8)}]`, [`see ${A}`]);
    expect((await judge(11, env())).why).toContain("names no intent");
    pull(12, `Intent: ${A}`, [`x\n\nIntent: ${B}`]);
    const two = await judge(12, env());
    expect(two.ok).toBe(false);
    expect(two.why).toContain("names 2 intents");
    for (const stage of ["idea", "specify", "accepted", "archived"]) {
      intents.set(A, { id: A, stage, pull_request: null });
      pull(13, `Intent: ${A}`, []);
      const v = await judge(13, env());
      expect(v.ok).toBe(false);
      expect(v.why).toContain(`at the ${stage} stage`);
    }
    pull(14, `Intent: ${B}`, []);
    expect((await judge(14, env())).why).toContain("which play does not know");
    intents.set(A, { id: A, stage: "proposal", pull_request: 20 });
    pull(20, `Intent: ${A}`, [], { state: "open" });
    pull(21, `Intent: ${A}`, [`x\n\nIntent: ${A}`]);
    const second = await judge(21, env());
    expect(second.ok).toBe(false);
    expect(second.why).toContain("#20 is, and open. Consolidate this work into #20, or close this one.");
    // the CLI says it, red, as the check does
    const p = Bun.spawn([process.execPath, resolve(ROOT, "play/avenbox/pr-intent.ts"), "21"], {
      env: { ...process.env, GITHUB_API_URL: `${gh.url}`, GITHUB_REPOSITORY: "maia/city", GITHUB_TOKEN: "ghs_read", PLAY_MCP_URL: `${play.url}api/mcp`, PLAY_MCP_TOKEN: "play_box" },
      stdout: "pipe",
    });
    expect(await p.exited).toBe(1);
    expect(await new Response(p.stdout).text()).toContain("::error title=Intent named::#21 is not the active pull request");
    const id = Bun.spawn([process.execPath, resolve(ROOT, "play/avenbox/pr-intent.ts"), "20", "--id"], {
      env: { ...process.env, GITHUB_API_URL: `${gh.url}`, GITHUB_REPOSITORY: "maia/city", GITHUB_TOKEN: "ghs_read", PLAY_MCP_URL: `${play.url}api/mcp`, PLAY_MCP_TOKEN: "play_box" },
      stdout: "pipe",
    });
    expect(await id.exited).toBe(0);
    expect((await new Response(id.stdout).text()).trim()).toBe(A);
  });

  test("intent-named.yml: on pull_request_target, main's pr-intent.ts, the job Intent named; the pull request only read", () => {
    const w = yaml(".github/workflows/intent-named.yml");
    expect(w.on.pull_request_target).toEqual({ branches: ["main"], types: ["opened", "edited", "reopened", "synchronize", "ready_for_review"] });
    expect(Object.keys(w.on)).toEqual(["pull_request_target", "merge_group"]);
    expect(w.permissions).toEqual({ contents: "read", "pull-requests": "read" });
    const job = w.jobs.named;
    expect(job.name).toBe("Intent named");
    const checkout = job.steps.find((s: any) => s.uses === "actions/checkout@v4");
    expect(checkout.with.ref).toBe("${{ github.event.repository.default_branch }}");
    expect(checkout.with["persist-credentials"]).toBe(false);
    expect(job.steps.at(-1).run).toBe('bun play/avenbox/pr-intent.ts "$PR"');
    // main's file is read and the box's token handed only on pull_request_target
    expect(checkout.if).toBe("github.event_name == 'pull_request_target'");
    expect(job.steps.at(-1).if).toBe("github.event_name == 'pull_request_target'");
    expect(text(".github/workflows/intent-named.yml")).not.toContain("head.sha");
  });

  test("intents-pr.yml: ready runs the checks on the head in the box; spec and record are main's and alone see the box's token; a cancelled run records nothing and no run makes a draft", () => {
    const src = text(".github/workflows/intents-pr.yml");
    const w = yaml(".github/workflows/intents-pr.yml");
    // workflow_dispatch: a dry run of a branch's file, recording nothing (below)
    expect(Object.keys(w.on)).toEqual(["pull_request_target", "workflow_dispatch"]);
    expect(w.on.pull_request_target).toEqual({ branches: ["main"], types: ["opened", "reopened", "synchronize", "ready_for_review"] });
    expect(w.permissions).toEqual({});
    const { spec, main: measures, run, compare, record } = w.jobs;
    expect(Object.keys(w.jobs)).toEqual(["spec", "main", "run", "gpu", "compare", "record"]);
    // heads in this repository only, and never on a draft (ready_for_review comes with draft false)
    expect(spec.if).toBe("github.event_name == 'workflow_dispatch' || (github.event.pull_request.head.repo.full_name == github.repository && !github.event.pull_request.draft)");
    // main's measures (intents f63774a3, 006eb26a) and the comparison: no secret, after the spec
    expect(measures.needs).toBe("spec");
    expect(run.if).toBe("!cancelled() && needs.spec.result == 'success'");
    for (const job of [measures, compare]) {
      expect(JSON.stringify(job)).not.toContain("secrets.");
      expect(job.permissions).toEqual({ contents: "read" });
    }
    expect(record.needs).toEqual(["spec", "compare"]);
    // spec and record check out main and alone hold the box's token
    const main = "${{ github.event.repository.default_branch }}";
    for (const job of [spec, record]) {
      const co = job.steps.find((s: any) => s.uses === "actions/checkout@v4");
      expect(co.with.ref).toBe(main);
      expect(JSON.stringify(job)).toContain("${{ secrets.PLAY_MCP_TOKEN }}");
    }
    // main's and compare's code is main's (a dry run's: the dispatched branch's), never the head's
    const code = "${{ github.event_name == 'workflow_dispatch' && github.sha || github.event.repository.default_branch }}";
    expect(measures.steps.find((s: any) => s.uses === "actions/checkout@v4" && s.with.path === "code").with.ref).toBe(code);
    expect(compare.steps.find((s: any) => s.uses === "actions/checkout@v4").with.ref).toBe(code);
    expect(JSON.stringify([measures, compare])).not.toContain("head.sha");
    // the head is only named to GitHub's compare, never checked out there
    for (const job of [measures, compare]) for (const st of job.steps.filter((x: any) => x.uses === "actions/checkout@v4")) expect(st.with.ref).not.toContain("head");
    // run checks out the head with no credentials, sees no secret, its GITHUB_TOKEN read only, and runs main's intent.ts
    const co = run.steps.find((s: any) => s.uses === "actions/checkout@v4");
    expect(co.with).toEqual({ ref: "${{ needs.spec.outputs.head }}", "persist-credentials": false });
    expect(run.permissions).toEqual({ contents: "read" });
    expect(JSON.stringify(run)).not.toContain("secrets.");
    expect(JSON.stringify(run)).not.toContain("github.token");
    expect(src.match(/secrets\.[A-Z_]+/g)!.sort()).toEqual(["secrets.PLAY_MCP_TOKEN", "secrets.PLAY_MCP_TOKEN"]);
    expect(spec.steps.find((s: any) => s.id === "which").run).toContain('cp play/avenbox/intent.ts play/avenbox/play.ts play/avenbox/box.env "$RUNNER_TEMP/box/"');
    const box = run.steps.find((s: any) => s.name === "The intent's checks on the head (no token)");
    expect(box.run).toContain('bun "$RUNNER_TEMP/box/intent.ts" --from "$RUNNER_TEMP/box/spec.json" --results-out');
    expect(run.steps.find((s: any) => s.name?.startsWith("avenBOX")).run).toBe('sudo env "PATH=$PATH" bash play/avenbox/setup.sh');
    expect(run.steps.find((s: any) => s.uses === "oven-sh/setup-bun@v2").with["bun-version-file"]).toBe(".bun-version");
    // a newer head cancels the older head's run, whose record is then skipped (not red, nothing recorded)
    expect(w.concurrency).toEqual({ group: "intents-pr-${{ github.event.pull_request.number || inputs.pr }}", "cancel-in-progress": true });
    // and a dry run records nothing
    expect(record.if).toBe("github.event_name == 'pull_request_target' && !cancelled() && needs.spec.result == 'success'");
    // record: --record-from with --pr and the head; a red must leaves the pull request as it is (failed on the board)
    const rec = record.steps.find((s: any) => s.id === "recorded");
    expect(rec.run).toContain('bun play/avenbox/intent.ts "$INTENT" --record-from "$RUNNER_TEMP/results/results.json" --pr "$PR" --head "$HEAD"');
    expect(rec.env.PR).toBe("${{ github.event.pull_request.number }}");
    expect(rec.env.HEAD).toBe("${{ needs.spec.outputs.head }}");
    // the head is the pull request's own; a dry run asks GitHub for it, and hands over the branch's intent.ts unrun
    const which = spec.steps.find((s: any) => s.id === "which");
    expect(which.env.HEAD_SHA).toBe("${{ github.event.pull_request.head.sha }}");
    // a dry run may time another intent's spec on that head; on pull_request_target the intent is always the PR's own
    expect(which.env.OTHER).toBe("${{ inputs.intent }}");
    expect(which.run).toContain('if [ "$DRY" = true ] && [ -n "$OTHER" ]; then');
    expect(record.if.startsWith("github.event_name == 'pull_request_target'")).toBe(true);
    expect(which.run).toContain('[ "$DRY" != true ] || HEAD_SHA=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR" --jq .head.sha)');
    expect(which.run).toContain('git show "$GITHUB_SHA:play/avenbox/intent.ts" > "$RUNNER_TEMP/box/intent.ts"');
    expect(which.run).not.toMatch(/bun [^\n]*(\$GITHUB_SHA|\$RUNNER_TEMP\/box\/intent\.ts)/);
    expect(record.permissions).toEqual({ contents: "read" });
    expect(src).not.toContain("convertPullRequestToDraft");
    expect(src).not.toContain("pull-requests: write");
    // what stays as it is: main's run after the merge
    expect(text(".github/workflows/intents.yml")).toContain("bun play/avenbox/intent.ts \"$id\" --record --where main --no-gpu");
  });
});

// The box run in about 3 minutes (intent 006eb26a): main measured beside the head's checks, compared once both are in,
// main fetched shallow, and kept in GitHub's cache by what it reads.
// intent a3c81d24 (Samuel 2026-11-10: "use the same pg from GitHub"): apt.postgresql.org held a box run's setup for 15
// minutes; the box run starts the PostgreSQL CI runs, and setup.sh installs none when 17 already answers
describe("the box run's Postgres", () => {
  const steps = yaml(".github/workflows/intents-pr.yml").jobs.run.steps;
  const ci = yaml(".github/workflows/play-checks.yml").jobs.api.steps.find((s: any) => s.name === "Postgres");
  const lines = (s: any) => String(s.run).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  test("the box starts CI's Postgres container before setup.sh, from main's box.env", () => {
    const at = (f: (s: any) => boolean) => steps.findIndex(f);
    const pg = steps[at((s: any) => s.name === "Postgres (CI's container)")];
    expect(pg).toBeDefined();
    expect(at((s: any) => s.name === "Postgres (CI's container)")).toBeLessThan(at((s: any) => s.name?.startsWith("avenBOX")));
    expect(at((s: any) => s.uses === "actions/download-artifact@v4")).toBeLessThan(at((s: any) => s.name === "Postgres (CI's container)"));
    // the same container as CI's, its values main's (the spec job's copy), never the head's
    const run = lines(pg);
    expect(run[0]).toBe('. "$RUNNER_TEMP/box/box.env"');
    expect(run[1]).toBe(lines(ci).find((l) => l.startsWith("docker run"))!);
    expect(run.slice(2)).toEqual(['for i in $(seq 1 60); do docker exec postgres pg_isready -h 127.0.0.1 -U postgres > /dev/null && break; sleep 1; done', "docker exec postgres pg_isready -h 127.0.0.1 -U postgres"]);
  });
  test("setup.sh installs no Postgres when 17 already answers on its port", () => {
    const sh = text("play/avenbox/setup.sh");
    const served = sh.indexOf("SERVED=1;");
    expect(served).toBeGreaterThan(-1);
    expect(sh).toContain(`case "$(PGPASSWORD=$PG_PASSWORD timeout 10 psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc 'show server_version_num' postgres 2> /dev/null)" in`);
    // both the install and the cluster wait on it
    expect(sh).toContain('if [ $SERVED = 0 ] && [ ! -x "/usr/lib/postgresql/$PG/bin/postgres" ]; then');
    expect(sh).toContain("if [ $SERVED = 1 ]; then");
    expect(served).toBeLessThan(sh.indexOf("apt-get install"));
  });
});

describe("intents-pr.yml: main measured beside the head's checks", () => {
  const w = yaml(".github/workflows/intents-pr.yml");
  const steps = (job: string) => w.jobs[job].steps as any[];

  test("box run in parallel: the head's checks need only the spec, beside main's measures", () => {
    expect(w.jobs.run.needs).toBe("spec");
    expect(w.jobs.main.needs).toBe("spec");
    // the head's vs-main calls measure the head only, into a directory handed to compare; main's measures never reach it
    const checks = steps("run").find((s) => s.name === "The intent's checks on the head (no token)");
    expect(checks.env).toEqual({ VS_MAIN_HEAD_OUT: "${{ runner.temp }}/vs-head" });
    expect(steps("run").some((s) => s.uses?.startsWith("actions/download-artifact") && s.with?.name === "vs-main")).toBe(false);
    expect(steps("run").some((s) => s.uses?.startsWith("actions/cache"))).toBe(false);
    const up = steps("run").find((s) => s.uses?.startsWith("actions/upload-artifact") && s.with.name === "vs-head");
    expect(up.with.path).toBe("${{ runner.temp }}/vs-head");
    // main's intent.ts names each check to its command, so a deferred call is folded into its own check
    expect(text("play/avenbox/intent.ts")).toContain("runOne(c.run, { ...env, INTENT_CHECK: c.id })");
  });

  test("compared once both are measured: compare needs main and run, record needs compare and records its results", () => {
    const { compare, record } = w.jobs;
    expect(compare.needs).toEqual(["spec", "main", "run", "gpu"]);
    // a failed main still compares (the checks that needed it fail, saying so); a run that did not finish records nothing
    expect(compare.if).toBe("!cancelled() && needs.run.result == 'success'");
    const got = steps("compare").filter((s) => s.uses?.startsWith("actions/download-artifact")).map((s) => [s.with.name, !!s["continue-on-error"]]);
    expect(got).toEqual([["box-results", false], ["vs-head", false], ["vs-main", true], ["gpu-results", true]]);
    const fold = steps("compare").find((s) => s.run?.includes("--fold"));
    expect(fold.run).toBe('bun play/avenbox/vs-main.ts --fold "$RUNNER_TEMP/results/results.json" --main-values "$RUNNER_TEMP/vs-main/main.json" --heads "$RUNNER_TEMP/vs-head" --out "$RUNNER_TEMP/compared/results.json"');
    expect(steps("compare").find((s) => s.uses?.startsWith("actions/upload-artifact")).with).toMatchObject({ name: "box-compared", path: "${{ runner.temp }}/compared/results.json" });
    // record reads only the compared results, never the run's own
    expect(record.needs).toEqual(["spec", "compare"]);
    const dl = steps("record").filter((s) => s.uses?.startsWith("actions/download-artifact"));
    expect(dl.map((s) => [s.with.name, s.if])).toEqual([["box-compared", "needs.compare.result == 'success'"]]);
    expect(JSON.stringify(record)).not.toContain("box-results");
  });

  test("main fetched shallow: the merge base from GitHub's compare, checked out alone at depth 1, sparse; the cache keyed by what it reads", () => {
    const main = steps("main");
    expect(JSON.stringify(main)).not.toMatch(/fetch-depth"?:\s*0|"fetch-depth":0/);
    expect(JSON.stringify(main)).not.toContain("git merge-base");
    expect(JSON.stringify(main)).not.toContain("git fetch");
    const base = main.find((s) => s.id === "base");
    expect(base.run).toContain('gh api "repos/$GITHUB_REPOSITORY/compare/$MAIN...$HEAD_SHA" --jq .merge_base_commit.sha');
    expect(base.env.GH_TOKEN).toBe("${{ github.token }}");
    const co = main.filter((s) => s.uses === "actions/checkout@v4");
    for (const c of co) expect(c.with["fetch-depth"] ?? 1).toBe(1);
    const measured = co.find((c) => c.with.path === "base");
    expect(measured.with).toEqual({ ref: "${{ steps.base.outputs.base }}", path: "base", "fetch-depth": 1, "persist-credentials": false, "sparse-checkout": "play/site\nplay/api/src\n" });
    expect(co.find((c) => c.with.path === "code").with["sparse-checkout"]).toBe("play/avenbox\nplay/site/scripts/census\n");
    // keyed by what the calls read at main (vs-main.ts --key-of), not by main's commit: a main merge leaving it as it is hits
    const key = main.find((s) => s.id === "key");
    expect(key.run).toContain('bun code/play/avenbox/vs-main.ts --key-of "$RUNNER_TEMP/box/spec.json" --main "$BASE" --repo base');
    const cache = main.find((s) => s.uses?.startsWith("actions/cache"));
    expect(cache.with).toEqual({ path: "${{ runner.temp }}/vs-main-cache", key: "vs-main-${{ steps.key.outputs.key }}", "restore-keys": "vs-main-" });
    const measure = main.find((s) => s.run?.includes("--main-of"));
    expect(measure.run).toContain('bun code/play/avenbox/vs-main.ts --main-of "$RUNNER_TEMP/box/spec.json" --main "$BASE" --repo base --out "$RUNNER_TEMP/vs-main/main.json"');
    expect(measure.env.VS_MAIN_CACHE).toBe("${{ runner.temp }}/vs-main-cache");
  });
});

// intent ba948167: a check that measures a world on a real GPU (its run names play/site/scripts/gpu.ts) is run on GitHub's
// macOS runner beside the box's checks, as untrusted as they are, and its result takes the place of the box's refusal
describe("intents-pr.yml: the checks on a GPU", () => {
  const w = yaml(".github/workflows/intents-pr.yml");
  const { spec, gpu, run, compare } = w.jobs;
  const named = (job: any, name: string) => job.steps.find((s: any) => s.name === name);

  test("the gpu job runs only when the spec names gpu.ts, beside the box's checks, on a macOS runner", () => {
    expect(spec.outputs.gpu).toBe("${{ steps.which.outputs.gpu }}");
    // by the checks' runs alone, as main's intent.ts --gpu chooses them
    const asks = spec.steps.find((s: any) => s.id === "which").run.split("\n").find((l: string) => l.includes("gpu=true"))!.trim();
    expect(asks).toBe(String.raw`! jq -e '[.checks[].run // ""] | any(test("\\bbun\\s+(\\S*/)?scripts/gpu\\.ts\\b"))' "$RUNNER_TEMP/box/spec.json" > /dev/null || echo "gpu=true" >> "$GITHUB_OUTPUT"`);
    // run as the step runs it: a check whose run names the script asks for the job; one that only speaks of it does not
    const asked = (checks: object[]) => {
      const dir = mkdtempSync(join(tmpdir(), "gpu-asks-"));
      mkdirSync(join(dir, "box"));
      writeFileSync(join(dir, "box/spec.json"), JSON.stringify({ checks }));
      writeFileSync(join(dir, "out"), "");
      Bun.spawnSync(["bash", "-e", "-c", asks], { env: { PATH: process.env.PATH!, RUNNER_TEMP: dir, GITHUB_OUTPUT: join(dir, "out") } });
      return readFileSync(join(dir, "out"), "utf8");
    };
    expect(asked([{ id: "c1", run: "true" }, { id: "c2", run: "bun play/site/scripts/gpu.ts --world /sandbox-5/" }])).toBe("gpu=true\n");
    expect(asked([{ id: "c1", run: "true", by: "not play/site/scripts/gpu.ts" }, { id: "c2", how: "look" }, { id: "c3", run: "cd play/site/scripts && bun gpu.ts" }, { id: "c4", run: "grep -q 'scripts/gpu.ts' play/SPEC.md" }])).toBe("");
    expect(text("play/avenbox/intent.ts")).toContain(String.raw`const onGpu = (c: { run?: string }) => /\bbun\s+(\S*\/)?scripts\/gpu\.ts\b/.test(c.run ?? "");`);
    expect(gpu.needs).toBe("spec");
    expect(gpu.if).toBe("!cancelled() && needs.spec.result == 'success' && needs.spec.outputs.gpu == 'true'");
    expect(gpu["runs-on"]).toMatch(/^macos-\d+$/);
    // the box's own checks wait on nothing of it
    expect(run.needs).toBe("spec");
  });

  test("it is as untrusted as the box's run: the head without credentials, no secret, no token, main's intent.ts", () => {
    expect(gpu.steps.find((s: any) => s.uses === "actions/checkout@v4").with).toEqual({ ref: "${{ needs.spec.outputs.head }}", "persist-credentials": false });
    expect(gpu.permissions).toEqual({ contents: "read" });
    expect(JSON.stringify(gpu)).not.toContain("secrets.");
    expect(JSON.stringify(gpu)).not.toContain("github.token");
    const checks = named(gpu, "The intent's GPU checks on the head (no token)");
    expect(checks.run).toContain('bun "$RUNNER_TEMP/box/intent.ts" --from "$RUNNER_TEMP/box/spec.json" --gpu --no-up --results-out "$RUNNER_TEMP/gpu-results/results.json" --root "$GITHUB_WORKSPACE"');
    // the site as visitors get it and both browsers, from the lockfile's versions
    expect(named(gpu, "The site's dependencies, its browsers and its build").run.trim().split("\n").map((l: string) => l.trim())).toEqual(["bun install --frozen-lockfile", "bunx playwright install chromium webkit", "bun run build"]);
    // its results and its pictures are kept with the run
    expect(gpu.steps.filter((s: any) => s.uses?.startsWith("actions/upload-artifact")).map((s: any) => [s.with.name, s.with.path])).toEqual([["gpu-results", "${{ runner.temp }}/gpu-results/results.json"], ["gpu-pictures", "${{ runner.temp }}/gpu-pictures"]]);
    expect(checks.env).toEqual({ GPU_OUT: "${{ runner.temp }}/gpu-pictures" });
  });

  test("compare takes the runner's results before anything is recorded; without them the box's refusals stand", () => {
    const over = named(compare, "The GPU runner's results in place of the box's refusals (main's intent.ts, no token)");
    expect(over.run).toBe('bun play/avenbox/intent.ts --over "$RUNNER_TEMP/results/results.json" --with "$RUNNER_TEMP/gpu-results/results.json"');
    expect(over.if).toBe("needs.spec.outputs.gpu == 'true'");
    expect(compare.steps.indexOf(over)).toBeLessThan(compare.steps.findIndex((s: any) => s.run?.includes("--fold")));
    // a gpu job that failed or never ran still lets the box's results be compared and recorded
    expect(compare.if).toBe("!cancelled() && needs.run.result == 'success'");
  });
});

describe("the server's care", () => {
  const server = () => yaml(".github/workflows/server.yml");
  const step = () => server().jobs.care.steps.find((s: any) => s.name === "remove-dns");
  /** the step's script, run with no token: it stops before it reaches any DNS API */
  const run = (name: string) => {
    const p = Bun.spawnSync(["bash", "-e", "-c", step().run], { cwd: ROOT, env: { PATH: process.env.PATH!, ZONE: "maia.city", NAME: name, DNS_TOKEN: "", HCLOUD_TOKEN: "" } });
    return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
  };

  test("remove-dns: one name of maia.city, an input, through production.yml's Hetzner tokens; on its own, nothing on the server", () => {
    const s = server();
    expect(s.on.workflow_dispatch.inputs.mode.options).toEqual(["report", "clean", "remove-dns"]);
    expect(s.on.workflow_dispatch.inputs.record.required).toBe(false);
    expect(step().if).toBe("inputs.mode == 'remove-dns'");
    expect(step().env).toMatchObject({ DNS_TOKEN: "${{ secrets.HETZNER_DNS_TOKEN }}", HCLOUD_TOKEN: "${{ secrets.HETZNER_API_KEY }}", ZONE: "maia.city", NAME: "${{ inputs.record }}" });
    // the checkout (deploy/dns.sh) is the one other step remove-dns runs
    expect(s.jobs.care.steps[0]).toEqual({ uses: "actions/checkout@v4" });
    for (const other of s.jobs.care.steps.slice(1).filter((x: any) => x.name !== "remove-dns")) expect(other.if).toBe("inputs.mode != 'remove-dns'");
    // it names no record of its own: the name comes only from the input
    expect(step().run.match(/^NAME=.*$/gm)).toEqual([expect.stringMatching(/^NAME=\$\(tr 'A-Z' 'a-z' <<< "\$NAME"\)/)]);
  });

  test("remove-dns refuses play, api, www and the apex, and what is not a name", () => {
    for (const n of ["play", "API", "www", "www.maia.city", "@", "maia.city", "MAIA.CITY.", "", "a;b", "*", "x y"]) {
      const r = run(n);
      expect(r.code).not.toBe(0);
      expect(r.out).toMatch(/never removed here|is not a name/);
    }
    // a name it takes goes on to find the zone (here no token reaches it)
    const ok = run("old.maia.city");
    expect(ok.code).not.toBe(0);
    expect(ok.out).toContain("remove old.maia.city by hand");
  });
});

// intent aa59f248: the gate before a push may run only the tests a change touched (play/avenbox/gate.sh); CI and main
// never do. Every place the suite runs whole runs every file, in parallel, with room in Postgres for it.
describe("the whole suite on every pull request and on main", () => {
  /** every `bun test` command line in a workflow's run steps */
  const bunTests = (path: string) =>
    Object.values(yaml(path).jobs ?? {}).flatMap((j: any) => (j.steps ?? []).flatMap((s: any) => String(s.run ?? "").split("\n")))
      .map((l: string) => l.trim()).filter((l: string) => /\bbun test\b/.test(l));
  test("CI runs avenBOX's gate, each part whole: every file, nothing narrowed, Postgres with room for it", () => {
    const p = yaml(".github/workflows/play-checks.yml");
    const api = p.jobs.api.steps.find((s: any) => s.name === "The API");
    expect(api["working-directory"]).toBe("play/api");
    const gates = (path: string) => text(path).match(/\bbash \S*gate\.sh .*$/gm);
    expect(gates(".github/workflows/play-checks.yml")).toEqual(["bash ../avenbox/gate.sh api --no-up"]);
    expect(gates(".github/workflows/website-checks.yml")).toEqual(["bash ../play/avenbox/gate.sh website --no-up"]);
    // a part named runs it whole: the API's types and every test file
    const plan = Bun.spawnSync(["bash", resolve(ROOT, "play/avenbox/gate.sh"), "api", "--no-up", "--plan"], { cwd: ROOT, stdout: "pipe" }).stdout.toString();
    expect(plan).toContain("step api-types\n  step api-tests: every file");
    expect(bunTests(".github/workflows/play-checks.yml")).toEqual([]);
    expect(api.run).not.toMatch(/--changed|\s-t\s|--test-name-pattern|GATE_CHANGED|\.test\.ts/);
    expect(JSON.stringify(api.env ?? {})).not.toContain("GATE_CHANGED");
    const pg = p.jobs.api.steps.find((s: any) => s.name === "Postgres");
    expect(pg.run).toContain('-c "max_connections=$PG_MAX_CONNECTIONS"');
  });
  test("intents.yml and intents-pr.yml run no narrowed suite", () => {
    for (const f of [".github/workflows/intents.yml", ".github/workflows/intents-pr.yml"]) {
      expect([f, text(f)]).not.toEqual([f, expect.stringMatching(/--changed|GATE_CHANGED/)]);
      for (const l of bunTests(f)) expect(l).toBe("bun test --parallel");
    }
  });
  test("gate.sh --all and CI run the same whole suite: `bun test --parallel` with no file list", () => {
    const gate = text("play/avenbox/gate.sh");
    expect(gate).toContain('out=$(bun test --parallel "$@" 2>&1)');
    const plan = Bun.spawnSync(["bash", resolve(ROOT, "play/avenbox/gate.sh"), "--all", "--plan"], { cwd: ROOT, stdout: "pipe" }).stdout.toString();
    // every file: select.ts names none, so api_tests is called with no file list
    expect(plan).toContain("step api-tests: every file");
    expect(plan).not.toMatch(/^ {4}test\//m);
  });
});

// intent 417af727: the site's own tests gate every merge as play/api's do; 8823eb7c reached main with one of them red
// because CI only built the site. Each on a runner of its own (beside the API's on one they starved its 5 s timeouts):
// the API's tests alone, the site's build and fast suite (Sandbox 2's physics switched off, intent 94c11a28); the
// required check "API and site" needs both.
describe("the site's tests on every pull request and on main", () => {
  const p = yaml(".github/workflows/play-checks.yml");
  const lines = (s: any) => String(s.run).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const site = JSON.parse(text("play/site/package.json")).scripts;
  test("the site's tests: the fast suite is vitest without Sandbox 2's physics, then the *.bun.test.ts with Bun; the physics apart", () => {
    expect(site.test).toBe("bun run test:vitest && bun run test:bun");
    expect(site["test:vitest"]).toBe("vitest run --exclude 'src/lib/sandbox-2/tests/**'");
    expect(site["test:bun"]).toBe("bun test .bun.test.ts");
    expect(site["test:physics"]).toBe("vitest run src/lib/sandbox-2/tests");
    expect(text("play/site/vite.config.ts")).toContain("'src/**/*.bun.test.ts'");
  });
  test("the site's tests: the API's tests and the site each a job of their own; the required check needs the API and the site", () => {
    const { tested, api, site: web, checks } = p.jobs;
    expect(Object.keys(p.jobs).sort()).toEqual(["api", "checks", "site", "tested"]);
    for (const j of [tested, api, web, checks]) expect(j["runs-on"]).toBe("ubuntu-24.04");
    // the API's tests run alone on their runner: nothing of the site's there
    expect(api.name).toBe("API");
    expect(api.steps.map((s: any) => s.name ?? s.uses)).toEqual(["actions/checkout@v4", "Postgres", "oven-sh/setup-bun@v2", "The API"]);
    expect(JSON.stringify(api)).not.toMatch(/play\/site|bun run test|vitest/);
    // the site: its build, then its fast suite, never the physics
    expect(web.name).toBe("Site");
    expect(web.steps.map((s: any) => s.name ?? s.uses)).toEqual(["actions/checkout@v4", "oven-sh/setup-bun@v2", "The site", "The site's tests"]);
    expect(lines(web.steps[2])).toEqual(["bun install --frozen-lockfile", "bun run build"]);
    expect(web.steps[3]["working-directory"]).toBe("play/site");
    expect(web.steps[3].run).toBe("bun run test");
    expect(JSON.stringify(web)).not.toContain("test:physics");
    for (const j of [api, web]) expect([j.needs, j.if, j["timeout-minutes"]]).toEqual(["tested", "needs.tested.outputs.skip != 'true'", 20]);
    // the required check keeps its name, needs both, runs whatever they did, and is green only when both are
    expect(checks.name).toBe("API and site");
    expect(checks.needs).toEqual(["tested", "api", "site"]);
    expect(checks.if).toBe("always()");
    const gate = checks.steps[0];
    expect(gate.env).toEqual({ TESTED: "${{ needs.tested.result }}", SKIP: "${{ needs.tested.outputs.skip }}", API: "${{ needs.api.result }}", SITE: "${{ needs.site.result }}" });
    expect(lines(gate).slice(1)).toEqual([
      '[ "$TESTED" = success ] || exit 1',
      'if [ "$SKIP" = true ]; then [ "$API" = skipped ] && [ "$SITE" = skipped ] && exit 0; exit 1; fi',
      '[ "$API" = success ] && [ "$SITE" = success ]',
    ]);
    // the physics are not in it: on main they'd hold it past the 13 minutes production's Main is green waits
    expect(checks.needs).not.toContain("physics");
  });
  test("the site's tests: the required check's gate, run as a step: green only when the API and the site are, or both skipped for a tested tree", () => {
    const gate = lines(p.jobs.checks.steps[0]).slice(1).join("\n");
    const run = (TESTED: string, SKIP: string, API: string, SITE: string) =>
      Bun.spawnSync(["bash", "-c", gate], { env: { TESTED, SKIP, API, SITE } }).exitCode === 0;
    expect(run("success", "", "success", "success")).toBe(true);
    expect(run("success", "false", "success", "success")).toBe(true);
    expect(run("success", "true", "skipped", "skipped")).toBe(true);
    for (const [a, b] of [["failure", "success"], ["success", "failure"], ["cancelled", "success"], ["success", "skipped"], ["skipped", "skipped"]])
      expect([a, b, run("success", "", a, b)]).toEqual([a, b, false]);
    expect(run("failure", "", "skipped", "skipped")).toBe(false);
    expect(run("success", "true", "success", "failure")).toBe(false);
  });
  // intent 94c11a28 (Samuel 2026-11-09: "We don't care about sandbox 2 physics test so just switch them off all
  // together"): no workflow runs Sandbox 2's physics, so none holds a release or reds main; by hand they still run
  test("Sandbox 2's physics are switched off: no workflow runs them, and main's run is only the API, the site and the website", () => {
    const main = yaml(".github/workflows/main.yml");
    expect(Object.keys(main.jobs).sort()).toEqual(["play", "website"]);
    expect(existsSync(resolve(ROOT, ".github/workflows/physics.yml"))).toBe(false);
    for (const f of readdirSync(resolve(ROOT, ".github/workflows")).filter((f) => /\.ya?ml$/.test(f)).map((f) => `.github/workflows/${f}`)) {
      expect([f, text(f).includes("test:physics")]).toEqual([f, false]);
      for (const j of Object.values(yaml(f).jobs ?? {}) as any[]) expect([f, j?.name]).not.toEqual([f, "Sandbox 2's physics"]);
    }
    // release.yml waits only for main's run
    expect(yaml(".github/workflows/release.yml").on.workflow_run.workflows).toEqual(["main"]);
    expect(text(".github/actions/main-green/action.yml")).not.toContain("physics");
    // by hand, as before
    expect(site["test:physics"]).toBe("vitest run src/lib/sandbox-2/tests");
  });
  test("the site's tests: gate.sh site runs the fast suite after the build, and the physics only by name (gate.sh physics)", () => {
    const gate = text("play/avenbox/gate.sh");
    const build = gate.indexOf('has site-build && step "play/site build" play/site bun run build');
    const tests = gate.indexOf('has site-tests && step "play/site tests" play/site bun run test\n');
    const physics = gate.indexOf(`has site-physics && step "play/site Sandbox 2's physics" play/site bun run test:physics`);
    expect(build).toBeGreaterThan(-1);
    expect(tests).toBeGreaterThan(build);
    expect(physics).toBeGreaterThan(tests);
    const plan = (part: string, changed: string) =>
      Bun.spawnSync(["bash", resolve(ROOT, "play/avenbox/gate.sh"), part, "--plan"], { cwd: ROOT, stdout: "pipe", env: { ...process.env, GATE_CHANGED: changed } }).stdout.toString();
    const fast = plan("site", "play/site/src/lib/stories/live.ts");
    expect(fast).toContain("step site-build");
    expect(fast).toContain("step site-tests");
    expect(fast).not.toContain("step site-physics");
    expect(fast).not.toMatch(/step (api|website)-/);
    // a change to Sandbox 2's code no longer brings them, in a part or in --all
    expect(plan("site", "play/site/src/lib/sandbox-2/wind.ts")).not.toContain("step site-physics");
    expect(plan("all", "play/site/src/lib/sandbox-2/wind.ts")).not.toContain("step site-physics");
    expect(plan("all", "play/site/src/lib/stories/live.ts")).not.toContain("step site-physics");
    expect(plan("physics", "").trim().split("\n").slice(1)).toEqual(["  step site-physics"]);
  });
});

// intent 14dc8d5f: ghcr.io refused one push of e5ddf0b2's image (permission_denied, nothing changed) and the deploy died
describe("the image's push", () => {
  const step = () => yaml(".github/workflows/production.yml").jobs.image.steps.find((s: any) => s.name === "Build and push");
  /** the step's script run by bash -e (as GitHub runs it), with a docker that fails its first `fails` pushes */
  function run(fails: number) {
    const dir = mkdtempSync(join(tmpdir(), "push-"));
    const log = join(dir, "log");
    writeFileSync(join(dir, "docker"), `#!/usr/bin/env bash\necho "$*" >> "${log}"\nif [ "$1" = push ]; then n=$(grep -c '^push' "${log}"); [ "$n" -gt ${fails} ] || exit 1; fi\n`, { mode: 0o755 });
    writeFileSync(join(dir, "sleep"), "#!/usr/bin/env bash\n", { mode: 0o755 });
    const r = Bun.spawnSync(["bash", "-e", "-c", step().run], { env: { PATH: `${dir}:${process.env.PATH}`, IMAGE: "ghcr.io/x/y-play:abc", GITHUB_SHA: "abc" } });
    const calls = readFileSync(log, "utf8").trim().split("\n").map((l) => l.split(" ")[0]);
    return { code: r.exitCode, calls };
  }
  test("the image push is tried again: up to three times, the build once", () => {
    expect(step().env).toEqual({ IMAGE: "${{ steps.tag.outputs.image }}" });
    expect(run(0)).toEqual({ code: 0, calls: ["build", "push"] });
    expect(run(1)).toEqual({ code: 0, calls: ["build", "push", "push"] });
    expect(run(2)).toEqual({ code: 0, calls: ["build", "push", "push", "push"] });
    expect(run(3)).toEqual({ code: 1, calls: ["build", "push", "push", "push"] });
  });
});

// Ship is a merge queue (intent f7721142): GitHub's queue runs main.yml and Intent named on each merge group's commit
// (event merge_group) under the required names, and fast-forwards main to it; the push to main then passes its checks
// at once only when the queue's run passed on that very commit (tested-tree.sh, against a stand-in GitHub).
describe("merge queue: checks on merge_group", () => {
  const required = JSON.parse(text(".github/required-checks.json")) as Record<string, string>;

  test("main.yml runs on merge_group (checks_requested); play and website run there under the required names; no group is cancelled", () => {
    const main = yaml(".github/workflows/main.yml");
    expect(main.on.merge_group).toEqual({ types: ["checks_requested"] });
    expect(Object.keys(main.on).sort()).toEqual(["merge_group", "pull_request", "push"]);
    for (const [part, job, called, inner] of [["play", "play", ".github/workflows/play-checks.yml", "checks"], ["website", "website", ".github/workflows/website-checks.yml", "build"]] as const) {
      const j = main.jobs[job];
      // a draft pull request runs nothing; a merge group and a push always run
      expect(j.if).toBe("github.event_name != 'pull_request' || !github.event.pull_request.draft");
      expect(j.uses).toBe(`./${called}`);
      expect(`${j.name} / ${yaml(called).jobs[inner].name}`).toBe(required[part]);
    }
    // cancel only between a pull request's own runs: a merge group has a ref of its own and is never cancelled
    expect(main.concurrency["cancel-in-progress"]).toBe("${{ github.event_name == 'pull_request' }}");
    expect(main.concurrency.group).toContain("${{ github.ref }}");
    // the tested tree's step is only a push's: a merge group runs every check in full
    expect(yaml(".github/workflows/play-checks.yml").jobs.tested.steps.find((s: any) => s.id === "tested").if).toBe("github.event_name == 'push'");
    expect(yaml(".github/workflows/website-checks.yml").jobs.build.steps.find((s: any) => s.id === "tested").if).toBe("github.event_name == 'push'");
  });

  test("intent-named.yml runs on merge_group and passes there at once; its pull request's steps only on pull_request_target", () => {
    const w = yaml(".github/workflows/intent-named.yml");
    expect(w.on.merge_group).toEqual({ types: ["checks_requested"] });
    const job = w.jobs.named;
    expect(job.name).toBe("Intent named");
    expect(job.if).toBeUndefined();
    const queue = job.steps.filter((s: any) => s.if === "github.event_name == 'merge_group'");
    expect(queue).toHaveLength(1);
    expect(queue[0].run.startsWith("echo ")).toBe(true);
    expect(queue[0].run).not.toContain("exit 1");
    for (const s of job.steps.filter((s: any) => s !== queue[0])) expect(s.if.startsWith("github.event_name == 'pull_request_target'")).toBe(true);
    // a merge group never shares a group with another, nor is cancelled
    expect(w.concurrency).toEqual({ group: "intent-named-${{ github.event.pull_request.number || github.event.merge_group.head_sha }}", "cancel-in-progress": "${{ github.event_name == 'pull_request_target' }}" });
  });

  describe("tested-tree.sh: the queue's run on the pushed commit", () => {
    const SCRIPT = resolve(ROOT, ".github/workflows/tested-tree.sh");
    const REPO = "maia/city";
    const SHA = "a".repeat(40), OTHER = "d".repeat(40);
    type World = { runs?: any[]; jobs?: Record<number, any[]>; fail?: string };
    let world: World = {};
    let server: ReturnType<typeof Bun.serve>;
    beforeAll(() => {
      server = Bun.serve({
        port: 0,
        fetch(req) {
          const u = new URL(req.url);
          const p = u.pathname.replace(`/repos/${REPO}/`, "");
          if (req.headers.get("authorization") !== "Bearer t0ken") return new Response("no", { status: 401 });
          if (world.fail && p.startsWith(world.fail)) return new Response("down", { status: 500 });
          if (p === "actions/runs") {
            // the stand-in answers as GitHub would: only runs of the asked event and head
            const runs = (world.runs ?? []).filter((r) => r.event === u.searchParams.get("event") && r.head_sha === u.searchParams.get("head_sha"));
            return Response.json({ workflow_runs: runs });
          }
          const m = /^actions\/runs\/(\d+)\/jobs$/.exec(p);
          if (m) return Response.json({ jobs: world.jobs?.[Number(m[1])] ?? [] });
          return new Response("not found", { status: 404 });
        },
      });
    });
    afterAll(() => server?.stop(true));

    const groupRun = (id: number, more: any = {}) => ({ id, path: ".github/workflows/main.yml", event: "merge_group", head_sha: SHA, status: "completed", conclusion: "success", repository: { full_name: "Maia/City" }, ...more });
    const passed = (id: number, name: string) => ({ id, name, status: "completed", conclusion: "success" });
    /** the world where the queue's run 11 passed both required checks on SHA */
    const queued = (): World => ({ runs: [groupRun(11)], jobs: { 11: [passed(21, required.play), passed(22, required.website)] } });

    const decide = async (w: World, env: Record<string, string> = {}) => {
      world = w;
      const out = join(mkdtempSync(join(tmpdir(), "tested-")), "out");
      writeFileSync(out, "");
      const p = Bun.spawn(["bash", SCRIPT], {
        env: { PATH: process.env.PATH!, GITHUB_API_URL: `http://127.0.0.1:${server.port}`, GITHUB_OUTPUT: out, GH_TOKEN: "t0ken", EVENT: "push", REPO, SHA, PART: "play", ...env },
        stdout: "pipe",
        stderr: "pipe",
      });
      const said = await new Response(p.stdout).text();
      expect(await p.exited).toBe(0); // it never fails the job itself
      return { skip: readFileSync(out, "utf8").trim(), said };
    };

    test("merge queue: checks on merge_group: a successful merge_group run of the pushed sha counts as tested, for play and the website", async () => {
      for (const PART of ["play", "website"]) {
        const r = await decide(queued(), { PART });
        expect([PART, r.skip]).toEqual([PART, "skip=true"]);
        expect(r.said).toContain("not run again");
      }
      // the run still finishing, its required job passed: counted (the queue moves main as the checks pass)
      expect((await decide({ ...queued(), runs: [groupRun(11, { status: "in_progress", conclusion: null })] })).skip).toBe("skip=true");
      // an older failed group of the same commit does not stand in the way of a newer passed one
      expect((await decide({ runs: [groupRun(10, { conclusion: "failure" }), groupRun(11)], jobs: { 10: [], 11: [passed(21, required.play)] } })).skip).toBe("skip=true");
    });

    test("merge queue: checks on merge_group: a failed or cancelled run, its job not passed, another sha, event pull_request, another workflow or repository, an API error: the checks run", async () => {
      const cases: [string, World, Record<string, string>?][] = [
        ["the run failed", { ...queued(), runs: [groupRun(11, { conclusion: "failure" })] }],
        ["the run was cancelled", { ...queued(), runs: [groupRun(11, { conclusion: "cancelled" })] }],
        ["the run is still going, its job too", { ...queued(), runs: [groupRun(11, { status: "in_progress", conclusion: null })], jobs: { 11: [{ ...passed(21, required.play), status: "in_progress", conclusion: null }] } }],
        ["the group tested another sha", { ...queued(), runs: [groupRun(11, { head_sha: OTHER })] }],
        ["a pull_request run of this sha", { ...queued(), runs: [groupRun(11, { event: "pull_request" })] }],
        ["another workflow's run", { ...queued(), runs: [groupRun(11, { path: ".github/workflows/other.yml" })] }],
        ["a run of another repository", { ...queued(), runs: [groupRun(11, { repository: { full_name: "fork/city" } })] }],
        ["the required job failed", { ...queued(), jobs: { 11: [{ ...passed(21, required.play), conclusion: "failure" }, passed(22, required.website)] } }],
        ["the run has no such job", { ...queued(), jobs: { 11: [passed(22, required.website)] } }],
        ["no required check of that part", queued(), { PART: "nothing" }],
        ["no run at all", { runs: [] }],
        ["GitHub's API errs on the runs", { ...queued(), fail: "actions/runs" }],
        ["a wrong token", queued(), { GH_TOKEN: "nope" }],
        ["not a push", queued(), { EVENT: "merge_group" }],
        ["no commit", queued(), { SHA: "" }],
      ];
      for (const [why, w, env] of cases) {
        const r = await decide(w, env);
        expect([why, r.skip]).toEqual([why, "skip=false"]);
      }
    }, 120_000);
  });
});

// Main's ruleset as code (intent f7721142): deploy/rulesets/main.json, applied by deploy/ruleset.sh; play's refusal of
// Accept while it is not names the way, word for word in deploy/README.md.
describe("main's ruleset as code", () => {
  const ruleset = JSON.parse(text("deploy/rulesets/main.json"));
  const rule = (type: string) => ruleset.rules.find((r: any) => r.type === type);
  const REFUSAL = "Main's ruleset has no merge queue yet: an admin applies it with deploy/ruleset.sh (deploy/README.md), then Accept again.";

  test("main's ruleset as code: the default branch, active, no bypass; deletion, non_fast_forward, a pull request, the four checks, the merge queue", () => {
    expect(ruleset).toMatchObject({ name: "main", target: "branch", enforcement: "active", conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } }, bypass_actors: [] });
    expect(ruleset.rules.map((r: any) => r.type).sort()).toEqual(["deletion", "merge_queue", "non_fast_forward", "pull_request", "required_status_checks"]);
    expect(rule("pull_request").parameters).toMatchObject({ required_approving_review_count: 0, allowed_merge_methods: ["merge"] });
    for (const k of ["dismiss_stale_reviews_on_push", "require_code_owner_review", "require_last_push_approval", "required_review_thread_resolution"]) expect(rule("pull_request").parameters[k]).toBe(false);
    const checks = rule("required_status_checks").parameters;
    expect(checks.strict_required_status_checks_policy).toBe(false);
    const contexts = checks.required_status_checks.map((c: any) => c.context);
    expect(contexts.sort()).toEqual(["Intent accepted", "Intent named", "play / API and site", "website / build"]);
    // the required checks of main.yml are the ones named once in .github/required-checks.json, from GitHub Actions
    for (const name of Object.values(JSON.parse(text(".github/required-checks.json")))) expect(checks.required_status_checks).toContainEqual({ context: name, integration_id: 15368 });
    expect(checks.required_status_checks).toContainEqual({ context: "Intent accepted" });
    expect(rule("merge_queue").parameters).toEqual({
      merge_method: "MERGE", grouping_strategy: "ALLGREEN", max_entries_to_build: 5, max_entries_to_merge: 5,
      min_entries_to_merge: 1, min_entries_to_merge_wait_minutes: 0, check_response_timeout_minutes: 60,
    });
  });

  test("main's ruleset as code: ruleset.sh PUTs to the ruleset named main (else POSTs) and PATCHes the repository's merge commits; --dry-run sends nothing; the token never printed", async () => {
    const SCRIPT = resolve(ROOT, "deploy/ruleset.sh");
    let existing: any[] = [];
    const sent: { method: string; path: string; body: any }[] = [];
    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const u = new URL(req.url);
        if (req.headers.get("authorization") !== "Bearer s3cret-t0ken") return new Response("no", { status: 401 });
        if (req.method === "GET" && u.pathname === "/repos/maia/city/rulesets") return Response.json(existing);
        sent.push({ method: req.method, path: u.pathname, body: await req.json() });
        return Response.json({ id: 99, name: "main", enforcement: "active" });
      },
    });
    const run = async (...args: string[]) => {
      const p = Bun.spawn(["bash", SCRIPT, ...args], { env: { PATH: process.env.PATH!, GITHUB_API_URL: `http://127.0.0.1:${server.port}`, GH_TOKEN: "s3cret-t0ken" }, stdout: "pipe", stderr: "pipe" });
      const out = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
      expect([out, await p.exited]).toEqual([out, 0]);
      expect(out).not.toContain("s3cret-t0ken");
      return out;
    };
    try {
      existing = [{ id: 7, name: "production" }, { id: 26697743, name: "main" }];
      let out = await run("maia/city", "--dry-run");
      expect(out).toContain(`PUT http://127.0.0.1:${server.port}/repos/maia/city/rulesets/26697743`);
      expect(out).toContain(`PATCH http://127.0.0.1:${server.port}/repos/maia/city`);
      expect(out).toContain('"merge_commit_title": "PR_TITLE"');
      expect(sent).toEqual([]);
      existing = [{ id: 7, name: "production" }];
      out = await run("--dry-run", "maia/city");
      expect(out).toContain(`POST http://127.0.0.1:${server.port}/repos/maia/city/rulesets`);
      expect(sent).toEqual([]);
      // for real: the json as it is, then the repository's merge commits
      existing = [{ id: 26697743, name: "main" }];
      await run("maia/city");
      expect(sent).toEqual([
        { method: "PUT", path: "/repos/maia/city/rulesets/26697743", body: ruleset },
        { method: "PATCH", path: "/repos/maia/city", body: { merge_commit_title: "PR_TITLE", merge_commit_message: "PR_BODY" } },
      ]);
      sent.length = 0;
      existing = [];
      await run("maia/city");
      expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual(["POST /repos/maia/city/rulesets", "PATCH /repos/maia/city"]);
    } finally {
      server.stop(true);
    }
    // the default repository is Maia City's
    expect(text("deploy/ruleset.sh")).toContain("REPO=MyAvenCEO/maiacity");
  });

  test("main's ruleset as code: README holds Accept's refusal verbatim, on its own line, and the command that applies it", () => {
    const readme = text("deploy/README.md");
    expect(readme.split("\n")).toContain(REFUSAL);
    expect(readme).toContain("GH_TOKEN=<an admin's token> bash deploy/ruleset.sh");
  });
});
