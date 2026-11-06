// The Game editor's configs on Loro (src/gameconfigs.ts) against a real Postgres: set TEST_DATABASE_URL, as for
// ./api.test.ts. The levelling seeded as its v1, read by admins only, drafted step by step over MCP, each step checked
// whole, proposed, reviewed field by field, accepted as v2, v1 still readable.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { Rate } from "../src/limits";
import { levelling, seedGameConfigs } from "../import/gameconfigs";
import { GAME_CONFIG } from "../src/ids";

const LV = GAME_CONFIG.levelling;

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

suite("the Game editor's configs on Loro", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";

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
    api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    for (const n of ["ada", "cit"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
  });

  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  const call = async (as: string | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    if (as) headers.cookie = who[as].cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  let n = 0;
  /** a tool called over MCP by ada's token: its result as JSON, or its error's text */
  const tool = async (name: string, args: Record<string, unknown>) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method: "tools/call", params: { name, arguments: args } }),
      }),
    );
    const res = (await r.json()).result;
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };

  test("the levelling is seeded once as its v1, and a valid levels/1", async () => {
    const doc = levelling();
    expect(doc.levels).toHaveLength(16);
    expect(doc.levels.map((l) => l.villagers)).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]);
    expect(await seedGameConfigs(db)).toEqual({ seeded: [LV], present: [], errors: [] });
    expect(await seedGameConfigs(db)).toEqual({ seeded: [], present: [LV], errors: [] });
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
  });

  test("admins read it, at its newest version; nobody else", async () => {
    expect((await call("cit", "GET", "/api/docs?kind=game")).status).toBe(403);
    expect((await call(null, "GET", `/api/docs/${LV}`)).status).toBe(401);
    const list = await call("ada", "GET", "/api/docs?kind=game");
    expect(list.data).toEqual([expect.objectContaining({ id: LV, label: "Levelling", schema: "levels/1", number: 1, versions: 1 })]);
    const c = await call("ada", "GET", `/api/docs/${LV}`);
    expect(c.data).toMatchObject({ id: LV, number: 1, version: 1 });
    expect(c.data.json).toEqual(levelling());
    expect((await call("ada", "GET", "/api/docs/nope")).status).toBe(404);
  });

  test("an agent drafts a change step by step, each step checked whole, proposes it, and it is accepted as v2", async () => {
    expect((await tool("list_docs", { kind: "game" }))[0].id).toBe(LV);
    const one = await tool("doc_edit", { doc: LV, message: "a bigger investor at level 16", edits: [{ op: "set", path: ["levels", { id: "l16" }, "investor"], value: 10 }] });
    expect(typeof one.variant).toBe("number");
    expect(one).toMatchObject({ changed: true, edits: 1, changes: 1 });
    // levels must climb in villagers
    const bad = await tool("doc_edit", { doc: LV, variant: one.variant, message: "out of order", edits: [{ op: "set", path: ["levels", { id: "l3" }, "villagers"], value: 2 }] });
    expect(bad.error).toContain("not more than the level before");
    const two = await tool("doc_edit", { doc: LV, variant: one.variant, message: "the tent costs more", edits: [{ op: "set", path: ["levels", { id: "l1" }, "unlocks", 0, "cost"], value: 3000 }] });
    expect(two).toMatchObject({ variant: one.variant, edits: 2, changes: 2 });
    const proposed = await tool("propose_doc_version", { doc: LV, variant: one.variant, note: "a richer last investor, a dearer tent" });
    expect(proposed).toMatchObject({ doc: LV, number: 2, edits: 2, changes: 2 });

    const listed = (await call("ada", "GET", "/api/intents?stage=proposal")).data.find((i: any) => i.id === proposed.intent);
    expect(listed).toMatchObject({ stage: "proposal", work: { kind: "game_config_version", grp: "game", label: "Levelling", number: 2, via: "mcp" } });
    const review = (await call("ada", "GET", `/api/intents/${proposed.intent}`)).data.review;
    expect(review).toMatchObject({ doc: { id: LV, kind: "game", label: "Levelling" }, seedNumber: 1, moved: false });
    expect(review.changes).toEqual([
      { path: "$.levels[id=l1].unlocks[0].cost", kind: "changed", from: 2000, to: 3000 },
      { path: "$.levels[id=l16].investor", kind: "changed", from: 8, to: 10 },
    ]);
    expect((await call("ada", "GET", `/api/docs/${LV}?intent=${proposed.intent}`)).data.json.levels[15].investor).toBe(10);
    expect((await call("ada", "GET", `/api/docs/${LV}`)).data.json.levels[15].investor).toBe(8);

    expect((await call("ada", "POST", `/api/intents/${proposed.intent}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 2 } });
    const now = (await call("ada", "GET", `/api/docs/${LV}`)).data;
    expect(now).toMatchObject({ number: 2, version: 2 });
    expect(now.json.levels[15].investor).toBe(10);
    expect((await call("ada", "GET", `/api/docs/${LV}?v=1`)).data.json).toEqual(levelling());
    const history = (await call("ada", "GET", `/api/docs/${LV}/history`)).data;
    expect(history.edits.at(-1).version).toBe(2);
  });

  test("an agent archives its own intent at Proposal; a citizen sees none of them", async () => {
    const p = await tool("propose_doc_version", { doc: LV, note: "a new label", edits: [{ op: "set", path: ["label"], value: "Village levels" }] });
    expect((await call("cit", "GET", `/api/intents/${p.intent}`)).status).toBe(403);
    expect(await tool("archive_intent", { intent: p.intent })).toMatchObject({ stage: "archived" });
    expect((await call("ada", "GET", `/api/docs/${LV}/history`)).data.variants.find((d: any) => d.intent === p.intent).status).toBe("archived");
  });
});
