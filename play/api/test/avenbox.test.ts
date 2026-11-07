// avenBOX's runner (play/avenbox/intent.ts, play/SPEC.md §4.12 "Checks run in avenBOX, and again on main") against a
// real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts. It reads an intent over the API's MCP (served here over
// HTTP, as play.maia.city serves it), runs each check's run from the repository's root, prints each one's result,
// exits 1 while a must check fails, and with --record records the test and measure checks it ran, where they ran and
// on which commit; a look it leaves to be judged, and no run sees the token.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { Rate } from "../src/limits";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;
const RUNNER = resolve(import.meta.dir, "../../avenbox/intent.ts");

suite("avenBOX's runner", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string, server: ReturnType<typeof Bun.serve>;
  let token = "";
  let ada = { id: "", cookie: "" };

  beforeAll(async () => {
    name = `play_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    const api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) => api.fetch(req) });
    const h = await createHuman(db, "ada");
    ada = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [ada.id]);
    const r = await fetch(`${server.url}api/tokens`, { method: "POST", headers: { cookie: ada.cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "agent" }) });
    token = ((await r.json()) as any).token;
  });

  afterAll(async () => {
    server?.stop(true);
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  const tool = async (name: string, args: Record<string, unknown>) => {
    const r = await fetch(`${server.url}api/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    });
    const res = ((await r.json()) as any).result;
    return res.isError ? { error: res.content[0].text } : JSON.parse(res.content[0].text);
  };
  /** intent.ts as main's runner runs it: its token, GitHub's token and the Actions run in its environment (the same here
   *  as on GitHub's own runner, where these are GitHub's) */
  const ACTIONS = { GITHUB_SERVER_URL: "https://github.example", GITHUB_REPOSITORY: "maia/city", GITHUB_RUN_ID: "7" };
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

    const recorded = await runner(i.id, "--record", "--where", "main");
    expect(recorded.code).toBe(1);
    expect(recorded.out).toContain(`recorded c1, c2, c3, c4 on intent ${i.id} (where main)`);
    const { results } = await tool("get_intent", { intent: i.id });
    expect(Object.keys(results).sort()).toEqual(["c1", "c2", "c3", "c4"]);
    expect(results.c1).toMatchObject({ pass: true, where: "main" });
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
