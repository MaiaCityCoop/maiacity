// avenBOX's runner (play/avenbox/intent.ts, play/SPEC.md §4.12 "Checks run in avenBOX, and again on main") against a
// real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts. It reads an intent over the API's MCP (served here over
// HTTP, as play.maia.city serves it), runs each check's run from the repository's root, prints each one's result,
// exits 1 while a must check fails, and with --record records the test and measure checks it ran, where they ran and
// on which commit; a look it leaves to be judged, and no run sees the token.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hashBytes } from "../src/kit/hash";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Db } from "../src/kit/pg";
import { agentToken, type Api, appOn, type Fresh, freshDb, human, suite, tool as mcpTool } from "./kit";

const RUNNER = resolve(import.meta.dir, "../../avenbox/intent.ts");

suite("avenBOX's runner", () => {
  let f: Fresh, db: Db, api: Api, server: ReturnType<typeof Bun.serve>;
  let token = "";
  let ada = { id: "", cookie: "" };

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    api = appOn(db);
    server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) => api.fetch(req) });
    ada = await human(db, "ada");
    token = (await agentToken(api, ada.cookie)).token;
  });

  afterAll(async () => {
    server?.stop(true);
    await f?.drop();
  });

  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);
  /** intent.ts as main's runner runs it: its token, GitHub's token and the Actions run in its environment (the same here
   *  as on GitHub's own runner, where these are GitHub's) */
  const ACTIONS = { GITHUB_ACTIONS: "true", GITHUB_SERVER_URL: "https://github.example", GITHUB_REPOSITORY: "maia/city", GITHUB_RUN_ID: "7" };
  const runner = async (...args: string[]) => {
    const p = Bun.spawn([process.execPath, RUNNER, ...args, "--no-up"], {
      env: { ...process.env, ...ACTIONS, PLAY_MCP_URL: `${server.url}api/mcp`, PLAY_MCP_TOKEN: token, GITHUB_TOKEN: "ghs_not_for_runs" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
    return { code: await p.exited, out };
  };

  test("runs each check's run in the box, prints its result, records the test and measure checks", async () => {
    const i = await tool("add_intent", { title: "The runner" });
    const spec = await tool("specify_intent", {
      intent: i.id,
      goal: "The runner runs every check.",
      scope: "play/avenbox/intent.ts",
      nothing_to_reduce: "A test fixture: nothing to reduce.",
      checks: [
        { check: "true passes", how: "test", by: "it exits 0", run: "true" },
        { check: "false fails", how: "test", by: "it exits 1", run: "false" },
        { check: "it measures 42", how: "measure", by: "echo, 42", run: "echo 42" },
        { check: "no run sees a token", how: "test", by: "both are empty", run: `test -z "$PLAY_MCP_TOKEN" && test -z "$GITHUB_TOKEN"` },
        { check: "it looks right", how: "look", by: "the sheet at 1 m", must: false },
      ],
    });
    expect(spec.error).toBeUndefined();
    // before its spec is approved it runs, but nothing is recorded
    const early = await runner(i.id, "--record");
    expect(early.out).toContain("not recorded");
    expect(early.out).toContain("being built");
    await fetch(`${server.url}api/intents/${i.id}/approve`, { method: "POST", headers: { cookie: ada.cookie } });

    const dry = await runner(i.id);
    expect(dry.code).toBe(1);
    expect(dry.out).toContain("✓ c1 test (must)");
    expect(dry.out).toContain("✗ c2 test (must) · ");
    expect(dry.out).toContain("exit 1 · false fails");
    expect(dry.out).toMatch(/✓ c3 measure \(must\)[^\n]*\n {4}42/);
    expect(dry.out).toContain("✓ c4 test (must)");
    expect(dry.out).toContain("· c5 look (nice): judge it by eye: the sheet at 1 m");
    expect(dry.out).toContain("3 passed, 1 failed, 1 to judge by eye");
    expect((await tool("get_intent", { intent: i.id })).results).toBeNull();

    // results on a commit are taken from avenBOX's token alone (the GitHub runs'): any other is refused
    const refused = await runner(i.id, "--record", "--where", "main");
    expect(refused.code).toBe(1);
    expect(refused.out).toContain("the pull request's run records them");
    const box = await fetch(`${server.url}api/tokens`, { headers: { cookie: ada.cookie } }).then((r) => r.json() as Promise<any[]>);
    await fetch(`${server.url}api/tokens/${box[0].id}/avenbox`, { method: "POST", headers: { cookie: ada.cookie, "content-type": "application/json" }, body: JSON.stringify({ avenbox: true }) });
    const recorded = await runner(i.id, "--record", "--where", "main");
    expect(recorded.code).toBe(1);
    expect(recorded.out).toContain(`recorded c1, c2, c3, c4 on intent ${i.id} (where main, commit `);
    const { results } = await tool("get_intent", { intent: i.id });
    expect(Object.keys(results).sort()).toEqual(["c1", "c2", "c3", "c4"]);
    expect(results.c1).toMatchObject({ pass: true, where: "main", box: true, link: "https://github.example/maia/city/actions/runs/7" });
    expect(results.c2).toMatchObject({ pass: false, where: "main" });
    expect(results.c3).toMatchObject({ pass: true, where: "main" });
    expect(results.c4).toMatchObject({ pass: true, where: "main" });
    expect(results.c1.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(results.c3.evidence).toContain("$ echo 42");
    expect(results.c3.evidence).toContain("exit 0 in ");
    expect(results.c3.evidence).toContain(`main (https://github.example/maia/city/actions/runs/7) · commit ${results.c3.commit}`);
    expect(results.c3.evidence).toMatch(/\n42$/);
    expect(results.c2.evidence).toContain("exit 1 in ");

    // --only runs the checks named; avenBOX is where by default
    const one = await runner(i.id, "--record", "--only", "c2");
    expect(one.out).toContain("0 passed, 1 failed");
    const after = (await tool("get_intent", { intent: i.id })).results;
    expect(after.c2.where).toBe("avenBOX");
    expect(after.c1.where).toBe("main");
  });

  test("names the intent by its UUID and needs the token", async () => {
    expect((await runner("not-an-id")).code).toBe(2);
    const p = Bun.spawn([process.execPath, RUNNER, crypto.randomUUID(), "--no-up"], { env: { ...process.env, PLAY_MCP_TOKEN: "" }, stdout: "pipe", stderr: "pipe" });
    expect(await p.exited).toBe(2);
    expect(await new Response(p.stderr).text()).toContain("PLAY_MCP_TOKEN is not set");
    const unknown = await runner(crypto.randomUUID());
    expect(unknown.code).toBe(2);
    expect(unknown.out).toContain("no such intent");
  });
});

// intent.ts's modes (play/SPEC.md §4.12, "Only the box's run is evidence"; Samuel 2026-11-06), against a fake MCP
// server: no Postgres of play's needed. --spec-out writes the spec (intents-pr.yml's spec job), --from runs it with no
// token and writes the results (its run job, on the head), --record-from records them (its record job); without
// --record it runs, prints and records nothing; --record outside the GitHub run refuses. A per-user file never marks a
// run dirty; a dirty run names its files.
describe("avenBOX's runner: its modes", () => {
  const ID = "4ea6b2ed-f96a-4bf6-83fd-4d165a793194";
  const calls: { name: string; args: any; auth: string }[] = [];
  const SPEC = {
    goal: "g",
    scope: "s",
    checks: [
      { id: "c1", check: "it passes", how: "test", by: "true", run: "true", must: true },
      { id: "c2", check: "no token", how: "test", by: "empty", run: `test -z "$PLAY_MCP_TOKEN" && test -z "$GITHUB_TOKEN" && echo clean`, must: true },
      { id: "c3", check: "it fails", how: "measure", by: "false", run: "false", must: false },
      { id: "c4", check: "it looks right", how: "look", by: "by eye", must: true },
    ],
  };
  const mcp = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const { params } = (await req.json()) as { params: { name: string; arguments: Record<string, unknown> } };
      calls.push({ name: params.name, args: params.arguments, auth: req.headers.get("authorization") ?? "" });
      const out = params.name === "get_intent" ? { id: ID, stage: "build", title: "The box", spec: SPEC } : { id: ID, stage: "build" };
      return Response.json({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: JSON.stringify(out) }] } });
    },
  });
  afterAll(() => mcp.stop(true));
  // a repository of its own to run in, its .gitignore the real one's
  const root = mkdtempSync(join(tmpdir(), "avenbox-root-"));
  const git = (...args: string[]) => Bun.spawnSync(["git", "-c", "user.email=box@maia.city", "-c", "user.name=box", ...args], { cwd: root, stdout: "pipe" });
  copyFileSync(resolve(import.meta.dir, "../../../.gitignore"), join(root, ".gitignore"));
  git("init", "-q");
  git("add", ".");
  git("commit", "-qm", "one");
  const sha = `${git("rev-parse", "HEAD").stdout}`.trim();
  const dir = mkdtempSync(join(tmpdir(), "avenbox-files-"));
  const run = async (args: string[], env: Record<string, string | undefined> = {}) => {
    const p = Bun.spawn([process.execPath, RUNNER, ...args, "--no-up"], {
      env: { ...process.env, PLAY_MCP_URL: `${mcp.url}api/mcp`, PLAY_MCP_TOKEN: "play_box_token_000000000000", GITHUB_TOKEN: "ghs_not_for_runs", GITHUB_ACTIONS: "", ...env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
    return { code: await p.exited, out };
  };

  test("--spec-out writes the spec, running nothing", async () => {
    calls.length = 0;
    const r = await run([ID, "--spec-out", join(dir, "spec.json")]);
    expect(r.code).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, "spec.json"), "utf8"))).toEqual({ intent: { id: ID, stage: "build", title: "The box" }, checks: SPEC.checks });
    expect(calls.map((c) => c.name)).toEqual(["get_intent"]);
  });

  test("--from runs it with no token and writes each result with the head's sha and PostgreSQL's version", async () => {
    calls.length = 0;
    const r = await run(["--from", join(dir, "spec.json"), "--results-out", join(dir, "results.json"), "--root", root], {
      PLAY_MCP_TOKEN: undefined, GITHUB_ACTIONS: "true", GITHUB_SERVER_URL: "https://github.example", GITHUB_REPOSITORY: "maia/city", GITHUB_RUN_ID: "42",
    });
    expect(r.code).toBe(0); // c3 fails, but it is nice
    expect(calls).toEqual([]);
    const file = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
    expect(file).toMatchObject({ intent: ID, where: "avenBOX", commit: sha, dirty: [], link: "https://github.example/maia/city/actions/runs/42" });
    expect(file.postgres).toMatch(/^\d+(\.\d+)?$/);
    expect(file.results.map((x: any) => [x.check, x.pass])).toEqual([["c1", true], ["c2", true], ["c3", false]]);
    expect(file.results[1].evidence).toContain(`avenBOX (https://github.example/maia/city/actions/runs/42) · commit ${sha} · PostgreSQL ${file.postgres}`);
    expect(file.results[1].evidence).toMatch(/\nclean$/);
    expect(r.out).toContain("· c4 look (must): judge it by eye: by eye");
  });

  test("--from without TEST_DATABASE_URL gives the checks the root's box.env database", async () => {
    const box = mkdtempSync(join(tmpdir(), "avenbox-env-"));
    mkdirSync(join(box, "play/avenbox"), { recursive: true });
    writeFileSync(join(box, "play/avenbox/box.env"), "PG_PORT=5999\nPG_PASSWORD=pw\nBOX_DATABASE_URL=postgres://postgres:$PG_PASSWORD@127.0.0.1:$PG_PORT/postgres\n");
    const spec = { intent: { id: ID, stage: "build", title: "The box" }, checks: [{ id: "c1", check: "its database", how: "test", by: "the URL", run: `echo "db=$TEST_DATABASE_URL"`, must: true }] };
    writeFileSync(join(dir, "db-spec.json"), JSON.stringify(spec));
    const r = await run(["--from", join(dir, "db-spec.json"), "--results-out", join(dir, "db.json"), "--root", box], { TEST_DATABASE_URL: undefined, PLAY_MCP_TOKEN: undefined });
    expect(r.code).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, "db.json"), "utf8")).results[0].evidence).toMatch(/\ndb=postgres:\/\/postgres:pw@127\.0\.0\.1:5999\/postgres$/);
  });

  test("--record-from sends check_intent with where avenBOX, the commit, the run's address and pr; only of the intent named, on the head", async () => {
    calls.length = 0;
    const results = join(dir, "results.json");
    const r = await run([ID, "--record-from", results, "--pr", "2110", "--head", sha]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("every must check with a run passed");
    expect(calls).toHaveLength(1);
    const [c] = calls;
    expect(c.name).toBe("check_intent");
    expect(c.auth).toBe("Bearer play_box_token_000000000000");
    expect(c.args.intent).toBe(ID);
    expect(c.args.pr).toBe(2110);
    expect(c.args.results).toHaveLength(3);
    for (const x of c.args.results) expect(x).toMatchObject({ where: "avenBOX", commit: sha, link: "https://github.example/maia/city/actions/runs/42" });
    // another head, or another intent: not recorded
    calls.length = 0;
    const late = await run([ID, "--record-from", results, "--pr", "2110", "--head", "f".repeat(40)]);
    expect(late.code).toBe(1);
    expect(late.out).toContain(`not on the pull request's head ${"f".repeat(40)}`);
    const other = await run([crypto.randomUUID(), "--record-from", results, "--pr", "2110"]);
    expect(other.code).toBe(1);
    expect(other.out).toContain("not recorded: the results are of intent");
    expect(calls).toEqual([]);
    // a red must: recorded, and it exits 1 (the intent then failed in Build, its pull request as it is)
    const red = JSON.parse(readFileSync(results, "utf8"));
    red.results[0].pass = false;
    writeFileSync(join(dir, "red.json"), JSON.stringify(red));
    const r2 = await run([ID, "--record-from", join(dir, "red.json"), "--pr", "2110", "--head", sha]);
    expect(r2.code).toBe(1);
    expect(r2.out).toContain("must checks failed: c1");
    expect(calls.map((x) => x.name)).toEqual(["check_intent"]);
  });

  test("without --record it runs and prints and records nothing; --record outside the GitHub run refuses", async () => {
    calls.length = 0;
    const dry = await run([ID, "--root", root]);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain("✓ c1 test (must)");
    expect(dry.out).toContain("✗ c3 measure (nice)");
    expect(calls.map((c) => c.name)).toEqual(["get_intent"]);
    calls.length = 0;
    const refused = await run([ID, "--record", "--root", root]);
    expect(refused.code).toBe(2);
    expect(refused.out).toContain("--record runs only in the GitHub run: the pull request's run records them");
    expect(calls).toEqual([]);
  });

  test("a per-user file never marks a run dirty; a dirty run names its files", async () => {
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude/settings.local.json"), "{}");
    const clean = await run(["--from", join(dir, "spec.json"), "--results-out", join(dir, "clean.json"), "--root", root, "--only", "c1"]);
    expect(clean.code).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, "clean.json"), "utf8")).dirty).toEqual([]);
    expect(clean.out).not.toContain("+dirty");
    writeFileSync(join(root, "stray.txt"), "x");
    writeFileSync(join(root, ".gitignore"), readFileSync(join(root, ".gitignore"), "utf8") + "\n# changed\n");
    const dirty = await run(["--from", join(dir, "spec.json"), "--results-out", join(dir, "dirty.json"), "--root", root, "--only", "c1"]);
    const file = JSON.parse(readFileSync(join(dir, "dirty.json"), "utf8"));
    expect(file.dirty.sort()).toEqual([".gitignore", "stray.txt"]);
    expect(file.results[0].evidence).toContain(`commit ${sha}+dirty (`);
    expect(dirty.out).toContain("the work tree was dirty: ");
    // and in this repository itself, the file is ignored
    expect(Bun.spawnSync(["git", "check-ignore", "-q", ".claude/settings.local.json"], { cwd: resolve(import.meta.dir, "../../..") }).exitCode).toBe(0);
  });
});

// The skills mirror (play/avenbox/skills.ts, play/SPEC.md §4.14): .claude/skills written from play's database, here from
// a fake MCP server holding two skills, one with a text and a file reference.
describe("the skills mirror", () => {
  const MIRROR = resolve(import.meta.dir, "../../avenbox/skills.ts");
  const png = new TextEncoder().encode("\x89PNG not really, but bytes");
  const PNG = hashBytes(png);
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  let skills: Record<string, any>;
  let served: Uint8Array<ArrayBuffer>;
  let server: ReturnType<typeof Bun.serve>;
  const base = () => ({
    [A]: {
      schema: "skill/1", label: "Plant skill", group: "asset", uses: [B],
      description: "How to build a plant: one cultivar, its numbers, its sheet.",
      frontmatter: { effort: "medium", "allowed-tools": ["Bash", "Read", "Grep"] },
      body: "# Plant skill\n\nGrow it from its sheet.",
      references: [{ path: "references/numbers.md", text: "# Numbers\n" }, { path: "sheets/avocado.png", file: PNG, type: "image/png" }],
    },
    [B]: { schema: "skill/1", label: "Intents", group: "intents", note: "The lifecycle.", system: "Everything is an intent.", stages: { build: "Build {intent}.", idea: "Specify {intent}." } },
  });

  beforeAll(() => {
    server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      async fetch(req) {
        const u = new URL(req.url);
        if (req.headers.get("authorization") !== "Bearer play_test") return new Response("no", { status: 401 });
        if (u.pathname === `/api/files/${PNG}`) return new Response(served);
        if (u.pathname !== "/api/mcp") return new Response("none", { status: 404 });
        const m = (await req.json()) as { id: number; params: { name: string; arguments: Record<string, string> } };
        const { name, arguments: a } = m.params;
        const result =
          name === "list_docs" ? Object.entries(skills).map(([id, s]) => ({ id, kind: "skill", label: s.label }))
          : name === "doc_at" ? { id: a.doc, kind: "skill", number: 3, json: skills[a.doc] }
          : null;
        return Response.json({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
      },
    });
  });
  afterAll(() => server?.stop(true));

  const mirror = async (out: string, token = "play_test") => {
    const p = Bun.spawn([process.execPath, MIRROR, "--out", out], { env: { ...process.env, PLAY_MCP_URL: `${server.url}api/mcp`, PLAY_MCP_TOKEN: token }, stdout: "pipe", stderr: "pipe" });
    const text = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
    return { code: await p.exited, out: text };
  };
  const read = (p: string) => readFileSync(p, "utf8");

  test("the skills mirror writes each skill's SKILL.md and its references, files fetched by hash and checked", async () => {
    skills = base();
    served = png;
    const out = join(mkdtempSync(join(tmpdir(), "skills-")), "skills");
    mkdirSync(join(out, "gone"), { recursive: true });
    const r = await mirror(out);
    expect(r.code).toBe(0);
    expect(r.out).toContain("2 skills written");
    const md = read(join(out, "plant-skill", "SKILL.md"));
    expect(md.startsWith("---\nname: plant-skill\ndescription: \"How to build a plant: one cultivar, its numbers, its sheet.\"\neffort: medium\nallowed-tools: Bash Read Grep\n---\n\n# Plant skill\n\nGrow it from its sheet.\n")).toBe(true);
    expect(md).toContain(`play skill ${A} v3`);
    expect(md).toContain("Uses: intents.");
    expect(read(join(out, "plant-skill", "references", "numbers.md"))).toBe("# Numbers\n");
    expect(new Uint8Array(readFileSync(join(out, "plant-skill", "sheets", "avocado.png")))).toEqual(png);
    // a skill with no body: its system, then its stages in their order
    const intents = read(join(out, "intents", "SKILL.md"));
    expect(intents).toContain("description: The lifecycle.");
    expect(intents).toMatch(/# Intents\n\nEverything is an intent\.\n\n## At idea\n\nSpecify \{intent\}\.\n\n## At build\n\nBuild \{intent\}\./);
    // the folder is replaced whole: nothing else is left in it
    expect(readdirSync(out).sort()).toEqual(["intents", "plant-skill"]);
  });

  test("the skills mirror refuses a reference with both a text and a file, or neither, and a file not its hash", async () => {
    const out = join(mkdtempSync(join(tmpdir(), "skills-")), "skills");
    for (const bad of [{ path: "x.md", text: "x", file: PNG }, { path: "x.md" }, { path: "../x.md", text: "x" }]) {
      skills = base();
      served = png;
      skills[A].references = [bad];
      const r = await mirror(out);
      expect(r.code).toBe(1);
      expect(r.out).toContain(`refused Plant skill (${A})`);
      expect(readdirSync(out)).toEqual(["intents"]);
    }
    skills = base();
    served = new TextEncoder().encode("other bytes");
    const r = await mirror(out);
    expect(r.code).toBe(1);
    expect(r.out).toContain(`file ${PNG}: its bytes hash to`);
  });

  test("the skills mirror writes nothing without PLAY_MCP_TOKEN, and exits 0", async () => {
    skills = base();
    const out = join(mkdtempSync(join(tmpdir(), "skills-")), "skills");
    const r = await mirror(out, "");
    expect(r.code).toBe(0);
    expect(r.out).toContain("no PLAY_MCP_TOKEN");
    expect(existsSync(out)).toBe(false);
  });
});
