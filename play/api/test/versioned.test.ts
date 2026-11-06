// One version control (src/versioned.ts, play/SPEC.md "Version control") against a real Postgres: set TEST_DATABASE_URL,
// as for ./api.test.ts. Intent 30dfa87a-b3c6-4af8-a3be-aac03907ff37, checks c1 and c2: a kind declared in one place
// (a test-only kind, registered here alone, works end to end over MCP, HTTP and the intents' board), and every kind
// play has (an asset, a story, a factory, a levels config, a skill) round-tripping through the one module: edited twice
// in an intent variant, proposed for an intent, reviewed field by field, accepted as Main's next version, archived, and
// a clash on a moved seed archived.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { TYPES } from "../src/docs/schema";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { Rate } from "../src/limits";
import { register, seedDoc } from "../src/versioned";
import { GAME_CONFIG, SKILL } from "../src/ids";
import { seedFactories, lifetracLine } from "../import/factories";
import { seedGameConfigs } from "../import/gameconfigs";
import { seedSkills } from "../import/skills";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;
const SOURCE = (body: string) => `module.exports.recipe = function (id, v) {\n  // ${body}\n  return { meta: { id, v } };\n};\n`;
const TALE = "1a2b3c4d-0000-4000-8000-0000000000aa";

// ---- a kind declared here alone: a tale, its type and its entry, nothing else anywhere
TYPES["tale/1"] = {
  name: "tale/1",
  type: "tale",
  schema: {
    type: "object",
    required: ["schema", "label", "lines"],
    properties: { schema: { const: "tale/1" }, label: { type: "string", minLength: 1 }, note: { type: "string", "x-loro": "text" }, lines: { type: "array", items: { type: "object", properties: { id: { type: "string" }, text: { type: "string", "x-loro": "text" } }, additionalProperties: true } } },
    additionalProperties: true,
  },
};
register({ kind: "tale", work: "tale_version", title: "Tale", grp: "tales", format: "A tale is { schema: 'tale/1', label, note?, lines: [{ id, text }] }.", listItem: (json) => ({ lines: json.lines.length }) });

suite("one version control", () => {
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
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
    await seedFactories(db);
    await seedGameConfigs(db);
    await seedSkills(db);
    await seedDoc(db, { kind: "tale", uuid: TALE, json: { schema: "tale/1", label: "A tale", lines: [{ id: "a", text: "Once." }, { id: "b", text: "The end." }] }, note: "the first telling" });
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
  const rpc = async (method: string, params?: unknown) => {
    const r = await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }) }));
    return (await r.json()).result;
  };
  const tool = async (name: string, args: Record<string, unknown>) => {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };
  /** an intent specified, approved and every must check passed: ready for its work */
  const ready = async (title: string) => {
    const i = await tool("add_intent", { title });
    await tool("specify_intent", { intent: i.id, goal: "A change.", scope: "One document.", checks: [{ check: "It holds", how: "test", by: "true", run: "true" }] });
    await call("ada", "POST", `/api/intents/${i.id}/approve`);
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] });
    return i.id as string;
  };
  /** two edits in a new intent variant, proposed for an intent: what proposing answered */
  const twoEditsProposed = async (doc: string, e1: unknown, e2: unknown, intent?: string, extra?: unknown) => {
    const one = await tool("doc_edit", { doc, message: "first", ...(e1 as object) });
    expect(one.error).toBeUndefined();
    const two = await tool("doc_edit", { doc, variant: one.variant, message: "second", ...(e2 as object) });
    expect(two).toMatchObject({ variant: one.variant, edits: 2 });
    return tool("propose_doc_version", { doc, variant: one.variant, note: "two edits", ...(intent ? { intent } : {}), ...(extra ? { extra } : {}) });
  };

  // ---- c1: a kind is one entry

  test("c1: a kind declared in one place, a tale, is listed, read, edited, proposed, reviewed and decided over MCP, HTTP and the board", async () => {
    const tools = (await rpc("tools/list")).tools;
    expect(tools.find((t: any) => t.name === "list_docs").inputSchema.properties.kind.enum).toContain("tale");
    expect(await tool("list_docs", { kind: "tale" })).toEqual([expect.objectContaining({ id: TALE, kind: "tale", label: "A tale", number: 1, versions: 1, lines: 2 })]);
    const intent = await ready("A tale told again");
    const p = await twoEditsProposed(TALE, { edits: [{ op: "set", path: ["lines", { id: "a" }, "text"], value: "Once upon a time." }] }, { fields: { label: "A tale, retold" } }, intent);
    expect(p).toMatchObject({ intent, stage: "proposal", doc: TALE, kind: "tale", number: 2, edits: 2, changes: 2 });
    // read at its intent's variant, Main still as it was
    expect((await tool("doc_at", { doc: TALE, intent })).json.label).toBe("A tale, retold");
    expect((await call("ada", "GET", `/api/docs/${TALE}`)).data.json.label).toBe("A tale");
    // its history: Main's v1, the open variant with its intent; an edit read back, and what it changed
    const h = (await call("ada", "GET", `/api/docs/${TALE}/history`)).data;
    expect(h.variants).toEqual([expect.objectContaining({ id: p.variant, type: "intent", status: "proposed", intent, intent_title: "A tale told again", edits: 2, seed: 1 })]);
    const own = (await call("ada", "GET", `/api/docs/${TALE}/history?variant=${p.variant}`)).data.edits;
    expect(own.map((e: any) => e.message)).toEqual(["first", "second"]);
    expect((await call("ada", "GET", `/api/docs/${TALE}?edit=${own[0].seq}`)).data.json.lines[0].text).toBe("Once upon a time.");
    expect((await call("ada", "GET", `/api/docs/${TALE}/changes?edit=${own[1].seq}`)).data.changes).toEqual([{ path: "$.label", kind: "changed", from: "A tale", to: "A tale, retold" }]);
    expect((await call("ada", "GET", `/api/docs/${TALE}/changes?variant=${p.variant}`)).data).toMatchObject({ against: { version: 1 }, changes: [expect.objectContaining({ path: "$.label" }), expect.objectContaining({ path: "$.lines[id=a].text" })] });
    // the board: listed under its kind's group, reviewed field by field
    const intentRead = (await call("ada", "GET", `/api/intents/${intent}`)).data;
    expect(intentRead.work).toMatchObject({ kind: "tale_version", grp: "tales", label: "A tale", number: 2, doc_id: `tale:${TALE}` });
    expect(intentRead.review).toMatchObject({ doc: { id: TALE, kind: "tale", label: "A tale, retold" }, seedNumber: 1, moved: false });
    expect(intentRead.review.changes.map((c: any) => c.path).sort()).toEqual(["$.label", "$.lines[id=a].text"]);
    expect(intentRead.review.edits.map((e: any) => e.message)).toEqual(["first", "second"]);
    // accepted: Main's v2, its label kept on the document
    expect((await call("ada", "POST", `/api/intents/${intent}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 2 } });
    expect((await tool("doc_at", { doc: TALE })).json).toMatchObject({ label: "A tale, retold", lines: [{ id: "a", text: "Once upon a time." }, { id: "b", text: "The end." }] });
    expect((await tool("list_docs", { kind: "tale" }))[0]).toMatchObject({ label: "A tale, retold", number: 2 });
    // archived: Main stays
    const q = await tool("propose_doc_version", { doc: TALE, note: "a third line", edits: [{ op: "insert", path: ["lines", 2], value: { id: "c", text: "And after." } }] });
    expect((await call("ada", "POST", `/api/intents/${q.intent}/reject`)).data.stage).toBe("archived");
    expect((await tool("doc_at", { doc: TALE })).json.lines).toHaveLength(2);
    // admins only; by its UUID only
    expect((await call("cit", "GET", `/api/docs/${TALE}`)).status).toBe(403);
    expect((await call(null, "GET", `/api/docs/${TALE}/history`)).status).toBe(401);
    expect((await tool("doc_at", { doc: "A tale" })).error).toContain("UUID");
  });

  // ---- c2: every kind play has, through the one module

  test("c2: a factory, a levels config and a skill: edited twice, proposed for an intent, reviewed, accepted; archived; a clash on a moved seed archived", async () => {
    const LT = (await tool("list_docs", { kind: "factory" }))[0].id as string;
    const cases = [
      { doc: LT, e1: { edits: [{ op: "set", path: ["line", "stations", { id: "weld" }, "buffer"], value: 5 }] }, e2: { edits: [{ op: "set", path: ["note"], value: "more buffer" }] }, same: ["line", "demand", "perDay"], values: [7, 8] },
      { doc: GAME_CONFIG.levelling, e1: { edits: [{ op: "set", path: ["levels", { id: "l16" }, "investor"], value: 9 }] }, e2: { fields: { label: "Village levels" } }, same: ["villager", "euros"], values: [7, 8] },
      { doc: SKILL.intents, e1: { edits: [{ op: "text", path: ["stages", "ship"], index: 0, insert: "Watch the deploy. " }] }, e2: { edits: [{ op: "set", path: ["note"], value: "watch it" }] }, same: ["stages", "accepted"], values: ["Done.", "Shipped."] },
    ];
    for (const c of cases) {
      const intent = await ready(`A change of ${c.doc}`);
      const p = await twoEditsProposed(c.doc, c.e1, c.e2, intent);
      expect(p).toMatchObject({ intent, stage: "proposal", number: 2, edits: 2, changes: 2 });
      const review = (await call("ada", "GET", `/api/intents/${intent}`)).data.review;
      expect(review).toMatchObject({ seedNumber: 1, moved: false });
      expect(review.changes).toHaveLength(2);
      expect(review.edits).toHaveLength(2);
      expect((await call("ada", "POST", `/api/intents/${intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 2 });
      expect((await tool("doc_history", { doc: c.doc })).versions.map((v: any) => v.number)).toEqual([1, 2]);
      // archived, nothing changes
      const a = await tool("propose_doc_version", { doc: c.doc, note: "never", edits: [{ op: "set", path: ["note"], value: "never" }] });
      expect((await call("ada", "POST", `/api/intents/${a.intent}/reject`)).data.stage).toBe("archived");
      expect((await tool("doc_at", { doc: c.doc })).number).toBe(2);
      // two made on v2 touching the same field: the first goes in, the second clashes and is archived
      const x = await tool("propose_doc_version", { doc: c.doc, note: "x", edits: [{ op: "set", path: c.same, value: c.values[0] }] });
      const y = await tool("propose_doc_version", { doc: c.doc, note: "y", edits: [{ op: "set", path: c.same, value: c.values[1] }] });
      expect((await call("ada", "POST", `/api/intents/${x.intent}/accept`)).data.decision.number).toBe(3);
      expect((await call("ada", "GET", `/api/intents/${y.intent}`)).data.review.moved).toBe(true);
      const clash = (await call("ada", "POST", `/api/intents/${y.intent}/accept`)).data;
      expect(clash.stage).toBe("archived");
      expect(clash.message).toContain(c.same.join("."));
    }
  });

  test("c2: an asset: edited twice in a variant, proposed as its next version (built, frozen), read at its intent's variant, accepted; a second on the old head archived", async () => {
    const made = await tool("propose_asset", { group: "plants", label: "Fern", source: SOURCE("a fern"), note: "a fern" });
    await call("ada", "POST", `/api/intents/${made.intent}/accept`);
    const asset = made.asset as string;
    const intent = await ready("A taller fern");
    const p = await twoEditsProposed(asset, { fields: { source: SOURCE("a taller fern") } }, { edits: [{ op: "replace", find: "a taller fern", replace: "a taller fern, curled" }] }, intent);
    expect(p).toMatchObject({ intent, stage: "proposal", asset, number: 2 });
    expect(typeof p.version).toBe("string");
    expect((await tool("get_asset", { asset, intent })).json.source).toContain("a taller fern, curled");
    const review = (await call("ada", "GET", `/api/intents/${intent}`)).data.review;
    expect(review.builds.length).toBe(1);
    expect(review.changes.map((c: any) => c.path)).toContain("$.source");
    expect(review.edits.map((e: any) => e.message).slice(0, 2)).toEqual(["first", "second"]);
    const other = await tool("propose_doc_version", { doc: asset, note: "another", fields: { source: SOURCE("another fern") } });
    expect((await call("ada", "POST", `/api/intents/${intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 2, version: p.version });
    const { rows } = await db.query<{ number: number; head: string }>(`SELECT v.number, a.head FROM play.asset_versions v JOIN play.assets a ON a.id = v.asset_id WHERE v.id = $1`, [p.version]);
    expect(rows[0]).toEqual({ number: 2, head: p.version });
    expect((await tool("doc_history", { doc: asset })).versions.map((v: any) => v.number)).toEqual([1, 2]);
    // made on v1, the other was archived as this went in: an asset goes in only on the head it was made on
    expect((await call("ada", "GET", `/api/intents/${other.intent}`)).data.stage).toBe("archived");
  });

  test("c2: a story: edited twice in a variant (its own edits), proposed as its next version (a frozen row), read at its intent's variant, accepted; a clash archived", async () => {
    const body = { format: "9:16", fps: 30, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "a", at: 0, duration: 2, who: "MAIA", line: "One." }, { id: "b", at: 2, duration: 2, who: "MAIA", line: "Two." }] }] };
    const made = await tool("propose_story", { title: "A film", body, note: "a film" });
    await call("ada", "POST", `/api/intents/${made.intent}/accept`);
    const story = made.story as string;
    const intent = await ready("A film, said better");
    const p = await twoEditsProposed(story, { edits: [{ op: "set_clip", track: "voice", clip: "a", fields: { line: "One, said better." } }] }, { fields: { title: "A better film" } }, intent);
    expect(p).toMatchObject({ intent, stage: "proposal", story, number: 2, edits: 2 });
    const asIf = await tool("get_story", { story, intent });
    expect(asIf.json).toMatchObject({ title: "A better film" });
    expect(asIf.links).toEqual({});
    const review = (await call("ada", "GET", `/api/intents/${intent}`)).data.review;
    expect(review.story.title).toBe("A better film");
    expect(review.changes.map((c: any) => c.path).sort()).toEqual(["$.title", "$.tracks[id=voice].clips[id=a].line"]);
    expect(review.edits).toHaveLength(2);
    // two more made on v1 touching the line: the first one accepted goes in, then this one clashes
    const x = await tool("propose_doc_version", { doc: story, note: "x", edits: [{ op: "set_clip", track: "voice", clip: "a", fields: { line: "One, x." } }] });
    expect((await call("ada", "POST", `/api/intents/${x.intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 2 });
    const clash = (await call("ada", "POST", `/api/intents/${intent}/accept`)).data;
    expect(clash.stage).toBe("prototype");
    expect(clash.message).toContain("tracks");
    const { rows } = await db.query<{ number: number }>(`SELECT number FROM play.story_versions WHERE story_id = $1 AND number IS NOT NULL ORDER BY number`, [story]);
    expect(rows.map((r) => r.number)).toEqual([1, 2]);
  });
});
