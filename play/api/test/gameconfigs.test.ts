// The Game editor's configs on Loro (src/allkinds.ts' game_config, import/gameconfigs.ts) against a real Postgres: set TEST_DATABASE_URL, as for
// ./api.test.ts. The levelling seeded as its v1, read by admins only, drafted step by step over MCP, each step checked
// whole, proposed, reviewed field by field, accepted as v2, v1 still readable.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { type Db } from "../src/kit/pg";
import { levelling, seedGameConfigs } from "../import/gameconfigs";
import { GAME_CONFIG } from "../src/kit/ids";
import { type Api, appOn, type Fresh, freshDb, human, request, suite, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";

const LV = GAME_CONFIG.levelling;

suite("the Game editor's configs on Loro", () => {
  let f: Fresh, db: Db;
  let api: Api;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    api = appOn(db);
    who.ada = await human(db, "ada");
    who.cit = await human(db, "cit", null);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
  });

  afterAll(async () => {
    await f?.drop();
  });

  const call = (as: string | null, method: string, path: string, body?: unknown) => request(api, { cookie: as ? who[as].cookie : null }, method, path, body);
  /** a tool called over MCP by ada's token: its result as JSON, or its error's text */
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);

  /** an intent in Prototype, its spec approved, its one must check passed (at Proposal by itself): every edit is an intent's */
  const readyIntent = (title: string) => fx.readyIntent({ tool, approve: (id) => call("ada", "POST", `/api/intents/${id}/approve`) }, title, { spec: fx.spec("It changes.", "One document.") });

  test("the levelling is seeded once as its v1, and a valid levels/1", async () => {
    const doc = levelling();
    expect(doc.levels).toHaveLength(16);
    expect(doc.levels.map((l) => l.villagers)).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]);
    expect(await seedGameConfigs(db)).toEqual({ seeded: [LV], present: [], errors: [] });
    expect(await seedGameConfigs(db)).toEqual({ seeded: [], present: [LV], errors: [] });
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
  });

  test("admins read it, at its newest version; nobody else", async () => {
    expect((await call("cit", "GET", "/api/docs?kind=game_config")).status).toBe(403);
    expect((await call(null, "GET", `/api/docs/${LV}`)).status).toBe(401);
    const list = await call("ada", "GET", "/api/docs?kind=game_config");
    expect(list.data).toEqual([expect.objectContaining({ id: LV, label: "Levelling", schema: "levels/1", number: 1, versions: 1 })]);
    const c = await call("ada", "GET", `/api/docs/${LV}`);
    expect(c.data).toMatchObject({ id: LV, number: 1, version: 1 });
    expect(c.data.json).toEqual(levelling());
    expect((await call("ada", "GET", "/api/docs/nope")).status).toBe(404);
  });

  test("an agent drafts a change step by step, each step checked whole, proposes it, and it is accepted as v2", async () => {
    expect((await tool("list_docs", { kind: "game_config" }))[0].id).toBe(LV);
    const ready = await readyIntent("Levelling");
    const one = await tool("doc_edit", { doc: LV, intent: ready, message: "a bigger investor at level 16", edits: [{ op: "set", path: ["levels", { id: "l16" }, "investor"], value: 10 }] });
    expect(typeof one.variant).toBe("number");
    expect(one).toMatchObject({ changed: true, edits: 1, changes: 1 });
    // levels must climb in villagers
    const bad = await tool("doc_edit", { doc: LV, intent: ready, variant: one.variant, message: "out of order", edits: [{ op: "set", path: ["levels", { id: "l3" }, "villagers"], value: 2 }] });
    expect(bad.error).toContain("not more than the level before");
    const two = await tool("doc_edit", { doc: LV, intent: ready, variant: one.variant, message: "the tent costs more", edits: [{ op: "set", path: ["levels", { id: "l1" }, "unlocks", 0, "cost"], value: 3000 }] });
    expect(two).toMatchObject({ variant: one.variant, edits: 2, changes: 2 });
    const proposed = await tool("propose_doc_version", { doc: LV, intent: ready, variant: one.variant, note: "a richer last investor, a dearer tent" });
    expect(proposed).toMatchObject({ doc: LV, number: 2, edits: 2, changes: 2 });

    const listed = (await call("ada", "GET", "/api/intents?stage=proposal")).data.find((i: any) => i.id === proposed.intent);
    expect(listed).toMatchObject({ stage: "proposal", work: { kind: "game_config_version", grp: "game", label: "Levelling", number: 2, via: "mcp" } });
    const review = (await call("ada", "GET", `/api/intents/${proposed.intent}`)).data.review;
    expect(review).toMatchObject({ doc: { id: LV, kind: "game_config", label: "Levelling" }, seedNumber: 1, moved: false });
    expect((await call("ada", "GET", `/api/intents/${proposed.intent}/docs/${LV}`)).data.changes).toEqual([
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
    const p = await tool("propose_doc_version", { doc: LV, intent: await readyIntent("A new label"), note: "a new label", edits: [{ op: "set", path: ["label"], value: "Village levels" }] });
    expect((await call("cit", "GET", `/api/intents/${p.intent}`)).status).toBe(403);
    expect(await tool("archive_intent", { intent: p.intent })).toMatchObject({ stage: "archived" });
    expect((await call("ada", "GET", `/api/docs/${LV}/history`)).data.variants.find((v: any) => v.intent?.id === p.intent).status).toBe("archived");
  });
});
