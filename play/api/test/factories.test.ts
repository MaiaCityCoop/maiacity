// The Factories on Loro (src/factories.ts, play/SPEC.md §4.7) against a real Postgres: set TEST_DATABASE_URL, as for
// ./api.test.ts. The LifeTrac line seeded as its v1, read by admins only, drafted step by step over MCP, proposed,
// reviewed field by field, accepted as v2; a proposal on an old version merged where it touches other fields and
// archived where it touches the same.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { type Db } from "../src/kit/pg";
import { lifetracLine, seedFactories } from "../import/factories";
import { FACTORY } from "../src/kit/ids";
import { type Api, appOn, type Fresh, freshDb, human, request, suite, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";

const LT = FACTORY.lifetrac;

suite("the Factories on Loro", () => {
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

  test("the LifeTrac line is seeded once as its v1, and a valid factory/1", async () => {
    const doc = lifetracLine();
    expect(doc.line.stations).toHaveLength(42);
    expect(doc.parts).toHaveLength(135);
    expect(doc.line.stations.every((s: any) => s.ct === undefined && s.note === undefined && typeof s.what === "string")).toBe(true);
    expect(await seedFactories(db)).toEqual({ seeded: [LT], present: [], errors: [] });
    expect(await seedFactories(db)).toEqual({ seeded: [], present: [LT], errors: [] });
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
  });

  test("admins read it, at its newest version; nobody else", async () => {
    expect((await call("cit", "GET", "/api/docs?kind=factory")).status).toBe(403);
    expect((await call(null, "GET", `/api/docs/${LT}`)).status).toBe(401);
    const list = await call("ada", "GET", "/api/docs?kind=factory");
    expect(list.data).toEqual([expect.objectContaining({ id: LT, label: "LifeTrac line", number: 1, versions: 1, stations: 42, parts: 135 })]);
    const f = await call("ada", "GET", `/api/docs/${LT}`);
    expect(f.data).toMatchObject({ id: LT, number: 1, version: 1 });
    expect(f.data.json).toEqual(lifetracLine());
    expect((await call("ada", "GET", "/api/docs/nope")).status).toBe(404);
  });

  test("an agent drafts a change step by step, each step checked whole, and proposes it", async () => {
    const names = (await tool("list_docs", { kind: "factory" }))[0];
    expect(names.id).toBe(LT);
    // a second welding cell, by the station's id
    const ready = await readyIntent("LifeTrac line");
    const one = await tool("doc_edit", { doc: LT, intent: ready, message: "a second welding cell", edits: [{ op: "set", path: ["line", "stations", { id: "weld" }, "servers"], value: 2 }] });
    // (bun's toMatchObject writes an asymmetric matcher's match over the field it matched: the branch checked apart)
    expect(typeof one.variant).toBe("number");
    expect(one).toMatchObject({ changed: true, edits: 1, changes: 1 });
    // a faster laser on one part
    const two = await tool("doc_edit", { doc: LT, intent: ready, variant: one.variant, message: "the floor cut faster", edits: [{ op: "set", path: ["parts", { id: "floor" }, "ops", 0, "s"], value: 10 }] });
    expect(two).toMatchObject({ variant: one.variant, edits: 2, changes: 2 });
    // a step that breaks the line is refused, and kept nowhere
    const bad = await tool("doc_edit", { doc: LT, intent: ready, variant: one.variant, message: "an op at no station", edits: [{ op: "set", path: ["parts", { id: "floor" }, "ops", 0, "at"], value: "nowhere" }] });
    expect(bad.error).toContain("no station of the line");
    expect((await tool("doc_edit", { doc: LT, intent: ready, variant: one.variant, message: "x", edits: [{ op: "set", path: ["parts", { id: "nope" }, "qty"], value: 1 }] })).error).toContain("no item nope");
    const proposed = await tool("propose_doc_version", { doc: LT, intent: ready, variant: one.variant, note: "a second weld cell and a faster floor cut: about 41 a day" });
    expect(proposed).toMatchObject({ doc: LT, number: 2, variant: one.variant, edits: 2, changes: 2 });
    // proposed, the draft takes no more steps
    expect((await tool("doc_edit", { doc: LT, intent: ready, variant: one.variant, message: "late", edits: [{ op: "set", path: ["label"], value: "x" }] })).error).toContain("proposed already");
    // nothing changed is no proposal
    expect((await tool("propose_doc_version", { doc: LT, intent: await readyIntent("Nothing changed"), note: "same", edits: [{ op: "set", path: ["label"], value: "LifeTrac line" }] })).error).toContain("nothing changed");

    // the intents' board: an intent at Proposal holding the factory's work, reviewed field by field, opened as it would be
    const listed = (await call("ada", "GET", "/api/intents?stage=proposal")).data.find((i: any) => i.id === proposed.intent);
    expect(listed).toMatchObject({ stage: "proposal", title: "LifeTrac line", work: { kind: "factory_version", grp: "factories", label: "LifeTrac line", number: 2, via: "mcp", status: "proposal" } });
    const review = (await call("ada", "GET", `/api/intents/${proposed.intent}`)).data.review;
    expect(review.seedNumber).toBe(1);
    expect(review.moved).toBe(false);
    expect(review.edits.map((s: any) => s.message)).toEqual(["a second welding cell", "the floor cut faster"]);
    const weld = lifetracLine().line.stations.findIndex((s: any) => s.id === "weld");
    expect((await call("ada", "GET", `/api/intents/${proposed.intent}/docs/${review.doc.id}`)).data.changes).toEqual([
      { path: "$.line.stations[id=weld].servers", kind: "added", to: 2 },
      { path: "$.parts[id=floor].ops[0].s", kind: "changed", from: 111.2, to: 10 },
    ]);
    const asIf = (await call("ada", "GET", `/api/docs/${LT}?intent=${proposed.intent}`)).data;
    expect(asIf.json.line.stations[weld].servers).toBe(2);
    expect(asIf.intent).toMatchObject({ id: proposed.intent, status: "proposed" });
    // the factory itself is as it was until it is accepted
    expect((await call("ada", "GET", `/api/docs/${LT}`)).data.json.line.stations[weld].servers).toBeUndefined();

    // accepted: v2, the merge a step of its history, v1 still readable
    const decided = await call("ada", "POST", `/api/intents/${proposed.intent}/accept`);
    expect(decided.data).toMatchObject({ id: proposed.intent, stage: "accepted", decision: { status: "accepted", number: 2 } });
    const now = (await call("ada", "GET", `/api/docs/${LT}`)).data;
    expect(now).toMatchObject({ number: 2, version: 2 });
    expect(now.json.line.stations[weld].servers).toBe(2);
    expect(now.versions.map((v: any) => v.number)).toEqual([1, 2]);
    expect((await call("ada", "GET", `/api/docs/${LT}?v=1`)).data.json).toEqual(lifetracLine());
    const history = (await call("ada", "GET", `/api/docs/${LT}/history`)).data;
    expect(history.edits.map((s: any) => s.message)).toEqual(expect.arrayContaining(["a second welding cell", "the floor cut faster"]));
    expect(history.edits.at(-1).version).toBe(2);
  });

  test("made on an older version: merged where it touches other fields, archived where the same", async () => {
    const a = await tool("propose_doc_version", { doc: LT, intent: await readyIntent("More demand"), note: "more demand", edits: [{ op: "set", path: ["line", "demand", "perDay"], value: 30 }] });
    const b = await tool("propose_doc_version", { doc: LT, intent: await readyIntent("A bigger weld buffer"), note: "a bigger weld buffer", edits: [{ op: "set", path: ["line", "stations", { id: "weld" }, "buffer"], value: 4 }] });
    const c = await tool("propose_doc_version", { doc: LT, intent: await readyIntent("Even more demand"), note: "even more demand", edits: [{ op: "set", path: ["line", "demand", "perDay"], value: 40 }] });
    expect((await call("ada", "POST", `/api/intents/${a.intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 3 });
    expect((await call("ada", "GET", `/api/intents/${b.intent}`)).data.review.moved).toBe(true);
    expect((await call("ada", "POST", `/api/intents/${b.intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 4, merged: true });
    const clash = (await call("ada", "POST", `/api/intents/${c.intent}/accept`)).data;
    // its work archived by itself: the intent, specified, goes back to Build to be built again on the new head
    expect(clash.stage).toBe("build");
    expect(clash.message).toContain("line.demand.perDay");
    const now = (await call("ada", "GET", `/api/docs/${LT}`)).data.json;
    expect(now.line.demand.perDay).toBe(30);
    expect(now.line.stations.find((s: any) => s.id === "weld").buffer).toBe(4);
  });

  test("an agent archives its own intent at Proposal; a citizen sees none of them", async () => {
    const p = await tool("propose_doc_version", { doc: LT, intent: await readyIntent("A new label"), note: "a new label", edits: [{ op: "set", path: ["label"], value: "The LifeTrac line" }] });
    expect((await call("cit", "GET", `/api/intents/${p.intent}`)).status).toBe(403);
    expect((await call("cit", "GET", "/api/intents")).status).toBe(403);
    expect(await tool("archive_intent", { intent: p.intent })).toMatchObject({ intent: p.intent, stage: "archived" });
    const variants = (await call("ada", "GET", `/api/docs/${LT}/history`)).data.variants;
    expect(variants.find((v: any) => v.intent?.id === p.intent)).toMatchObject({ type: "intent", status: "archived", intent: { stage: "archived" } });
  });
});
