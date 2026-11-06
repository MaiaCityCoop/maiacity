// The way to production (play/SPEC.md §4.12, "Accept ships it"), as the workflows say it: release.yml moves production
// to a commit of main once main.yml is green for a push (or by hand, or play's Accept again, with a sha), fast-forward
// only, with GITHUB_TOKEN, and starts production.yml on it; production.yml writes SHIP_TOKEN into play's environment on
// the server; the compose file hands it to play-api. Read as YAML, so a change that breaks the way is seen here.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    expect(steps[0]).toEqual({ uses: "actions/checkout@v4", with: { "fetch-depth": 0 } });
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

  test("production.yml: started by workflow_dispatch, it reads main's checks on its own commit and writes SHIP_TOKEN into play.env", () => {
    const p = yaml(".github/workflows/production.yml");
    expect(Object.keys(p.on)).toContain("workflow_dispatch");
    // the jobs play's ship watcher follows, by their names
    const names = Object.values(p.jobs).map((j: any) => j.name);
    for (const n of ["Main is green", "The image", "The server", "The website"]) expect(names).toContain(n);
    expect(p.jobs.server.steps.map((s: any) => s.name)).toContain("Back up play");
    const green = p.jobs["main-green"].steps.find((s: any) => s.run?.includes("passed()"));
    expect(green.env.EVENT).toBe("${{ github.event_name }}");
    expect(green.run).toContain(`if [ -z "$sha" ] && [ "$EVENT" = workflow_dispatch ]; then sha=$(git rev-parse HEAD); fi`);
    const start = p.jobs.server.steps.find((s: any) => s.name === "Start play-api, import, and answer play.maia.city");
    expect(start.env.SHIP_TOKEN).toBe("${{ secrets.SHIP_TOKEN }}");
    expect(start.env.SHIP_REPO).toBe("${{ github.repository }}");
    const env = start.run.slice(start.run.indexOf("cat > play.env <<EOF2"), start.run.indexOf("\nEOF2", start.run.indexOf("cat > play.env")));
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

  test("green: one intent named by its full UUID in its body and commits, at Prototype, Proposal or Ship, its active pull request or none yet", async () => {
    for (const stage of ["prototype", "proposal", "ship"]) {
      intents.set(A, { id: A, stage, pull_request: null });
      pull(10, `A fix.\n\nIntent: ${A}`, [`one\n\nIntent: ${A}`, `two\n\nIntent: ${A.toUpperCase()}`]);
      const v = await judge(10, env());
      expect(v).toMatchObject({ ok: true, intent: A });
      expect(v.why).toContain("none named yet");
      expect(v.notes).toEqual([]);
    }
    intents.set(A, { id: A, stage: "prototype", pull_request: 10 });
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
    intents.set(A, { id: A, stage: "prototype", pull_request: null });
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
    expect(Object.keys(w.on)).toEqual(["pull_request_target"]);
    expect(w.permissions).toEqual({ contents: "read", "pull-requests": "read" });
    const job = w.jobs.named;
    expect(job.name).toBe("Intent named");
    const checkout = job.steps.find((s: any) => s.uses === "actions/checkout@v4");
    expect(checkout.with.ref).toBe("${{ github.event.repository.default_branch }}");
    expect(checkout.with["persist-credentials"]).toBe(false);
    expect(job.steps.at(-1).run).toBe('bun play/avenbox/pr-intent.ts "$PR"');
    expect(text(".github/workflows/intent-named.yml")).not.toContain("head.sha");
  });

  test("intents-pr.yml: ready runs the checks on the head in the box; spec and record are main's and alone see the box's token; a red run is a draft again", () => {
    const src = text(".github/workflows/intents-pr.yml");
    const w = yaml(".github/workflows/intents-pr.yml");
    expect(Object.keys(w.on)).toEqual(["pull_request_target"]);
    expect(w.on.pull_request_target).toEqual({ branches: ["main"], types: ["opened", "reopened", "synchronize", "ready_for_review"] });
    expect(w.permissions).toEqual({});
    const { spec, run, record } = w.jobs;
    expect(Object.keys(w.jobs)).toEqual(["spec", "run", "record"]);
    // heads in this repository only, and never on a draft (ready_for_review comes with draft false)
    expect(spec.if).toBe("github.event.pull_request.head.repo.full_name == github.repository && !github.event.pull_request.draft");
    expect(run.needs).toBe("spec");
    expect(record.needs).toEqual(["spec", "run"]);
    // spec and record check out main and alone hold the box's token
    const main = "${{ github.event.repository.default_branch }}";
    for (const job of [spec, record]) {
      const co = job.steps.find((s: any) => s.uses === "actions/checkout@v4");
      expect(co.with.ref).toBe(main);
      expect(JSON.stringify(job)).toContain("${{ secrets.PLAY_MCP_TOKEN }}");
    }
    // run checks out the head with no credentials, sees no secret, its GITHUB_TOKEN read only, and runs main's intent.ts
    const co = run.steps.find((s: any) => s.uses === "actions/checkout@v4");
    expect(co.with).toEqual({ ref: "${{ github.event.pull_request.head.sha }}", "persist-credentials": false });
    expect(run.permissions).toEqual({ contents: "read" });
    expect(JSON.stringify(run)).not.toContain("secrets.");
    expect(JSON.stringify(run)).not.toContain("github.token");
    expect(src.match(/secrets\.[A-Z_]+/g)!.sort()).toEqual(["secrets.PLAY_MCP_TOKEN", "secrets.PLAY_MCP_TOKEN"]);
    expect(spec.steps.find((s: any) => s.id === "which").run).toContain('cp play/avenbox/intent.ts "$RUNNER_TEMP/box/intent.ts"');
    const box = run.steps.find((s: any) => s.name === "The intent's checks on the head (no token)");
    expect(box.run).toContain('bun "$RUNNER_TEMP/box/intent.ts" --from "$RUNNER_TEMP/box/spec.json" --results-out');
    expect(run.steps.find((s: any) => s.name?.startsWith("avenBOX")).run).toBe('sudo env "PATH=$PATH" bash play/avenbox/setup.sh');
    expect(run.steps.find((s: any) => s.uses === "oven-sh/setup-bun@v2").with["bun-version"]).toBe("1.4.4");
    // record: --record-from with --pr and the head; a red run turns the pull request back into a draft
    const rec = record.steps.find((s: any) => s.id === "recorded");
    expect(rec.run).toContain('bun play/avenbox/intent.ts "$INTENT" --record-from "$RUNNER_TEMP/results/results.json" --pr "$PR" --head "$HEAD"');
    expect(rec.env.HEAD).toBe("${{ github.event.pull_request.head.sha }}");
    expect(record.permissions).toEqual({ contents: "read", "pull-requests": "write" });
    const draft = record.steps.find((s: any) => s.name === "A red run turns the pull request back into a draft");
    expect(draft.if).toBe("failure()");
    expect(draft.run).toContain("convertPullRequestToDraft");
    // what stays as it is: main's run after the merge
    expect(text(".github/workflows/intents.yml")).toContain("bun play/avenbox/intent.ts \"$id\" --record --where main");
  });
});
