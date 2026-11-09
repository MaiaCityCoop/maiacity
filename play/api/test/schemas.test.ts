// Schemas as documents (src/docs/schemas.ts, play/SPEC.md "Version control") against a real Postgres: set
// TEST_DATABASE_URL, as for ./api.test.ts.
//
// c1: the meta-schema validates itself and every schema; every document names its schema's UUID and the version of
// it it was written against (test/migrate.test.ts: on a database made before them, every older document named and
// still valid).
// c2: a schema's new version, proposed as an intent variant, is refused at Accept while a document on Main fails it,
// naming that document, and accepted once none does; commits are checked against the new version from then on.
// c3: a test schema added as a document alone, with no code, is a kind: list_docs, doc_at, doc_history, doc_edit,
// propose_doc_version and Accept over MCP, and /api/docs/<uuid>.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { problemsOf, readDoc, typeFor } from "../src/docs";
import { SCHEMA } from "../src/kit/ids";
import { Rate } from "../src/limits";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/kit/pg";
import { seedDoc } from "../src/versioned";
import { unregister } from "../src/kinds";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

/** a kind that is a schema alone: nothing of it is written in play's code */
const NOTE_SCHEMA = {
  label: "Note",
  type: "note",
  name: "note/1",
  note: "A short note, a test's own type.",
  node: {
    type: "object",
    required: ["label", "text"],
    properties: {
      label: { type: "string", minLength: 1, maxLength: 100 },
      text: { type: "string", maxLength: 1000, "x-loro": "text" },
      stars: { type: "integer", minimum: 0, maximum: 5 },
    },
    additionalProperties: false,
  },
};

suite("schemas as documents", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";

  beforeAll(async () => {
    name = `play_schemas_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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
  });
  afterAll(async () => {
    unregister("note");
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
  const rpc = async (method: string, params?: unknown): Promise<any> =>
    (await (await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }) }))).json()).result;
  /** a tool called over MCP by ada's token: its result as JSON, or its error's text */
  const raw = async (name: string, args: Record<string, unknown>): Promise<any> => {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };
  /** every edit is an intent's (intent 847c5d38): a variant this test drafts is made for an intent of its own, in Build with
   * its one check passed, and proposed for it */
  const variantIntent = new Map<number, string>();
  const readyIntent = async (title: string) => {
    const i = await raw("add_intent", { title });
    await raw("specify_intent", { intent: i.id, goal: "It changes.", nothing_to_reduce: "A test fixture: nothing to reduce.", scope: "One document.", checks: [{ check: "It holds", how: "test", by: "true", run: "true" }] });
    await call("ada", "POST", `/api/intents/${i.id}/approve`);
    await raw("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] });
    return i.id as string;
  };
  const tool = async (name: string, args: Record<string, unknown>): Promise<any> => {
    if (name === "doc_edit" && args.intent === undefined) {
      const intent = (args.variant != null ? variantIntent.get(Number(args.variant)) : undefined) ?? (await readyIntent(`An edit: ${args.message}`));
      const r = await raw(name, { ...args, intent });
      if (r.variant != null) variantIntent.set(Number(r.variant), intent);
      return r;
    }
    if (name === "propose_doc_version" && args.intent === undefined && args.variant != null && variantIntent.has(Number(args.variant)))
      return raw(name, { ...args, intent: variantIntent.get(Number(args.variant)) });
    // no work without an intent (intent 706ed873): work proposed at once is an intent's of its own, ready for it
    if (name === "propose_doc_version" && args.intent === undefined && args.variant == null) return raw(name, { ...args, intent: await readyIntent(`A proposal: ${args.note}`) });
    return raw(name, args);
  };
  const accept = (intent: string) => call("ada", "POST", `/api/intents/${intent}/accept`);
  const q = async (s: string, p: unknown[] = []) => (await db.query<any>(s, p)).rows;

  // ---- c1

  test("c1: the meta-schema validates itself and every schema; every document names its schema's UUID and version", async () => {
    const meta = await typeFor(db, SCHEMA.meta);
    expect(meta.type).toBe("schema");
    const all = await q(`SELECT id, schema_id, schema_version FROM play.docs WHERE id LIKE 'schema:%' ORDER BY id`);
    expect(all.map((r) => r.id.split(":")[1]).sort()).toEqual(Object.values(SCHEMA).sort());
    for (const r of all) {
      // each a document of the meta-schema, the meta-schema too, at its v1
      expect([r.id, r.schema_id, r.schema_version]).toEqual([r.id, SCHEMA.meta, 1]);
      expect([r.id, problemsOf(meta, (await readDoc(db, r.id)).json)]).toEqual([r.id, []]);
    }
    // a node is checked as a node: a word the subset doesn't know, or a pattern that won't compile, is refused
    const bad = await tool("doc_edit", { doc: SCHEMA.factory, message: "a word no node knows", edits: [{ op: "set", path: ["node", "$ref"], value: "#/x" }] });
    expect(bad.error).toContain("is no word of a schema's node");
    const worse = await tool("doc_edit", { doc: SCHEMA.factory, message: "a pattern that won't compile", edits: [{ op: "set", path: ["node", "properties", "label", "pattern"], value: "([" }] });
    expect(worse.error).toContain("does not compile");
    // the schemas are listed as every kind is, each with its documents' prefix
    const listed = await tool("list_docs", { kind: "schema" });
    expect(listed.map((d: any) => d.type).sort()).toEqual(["artifact", "asset", "factory", "game", "piece", "rules", "sandbox", "schema", "skill", "story"]);
    // a document made now names its schema by its UUID, at the version in force
    const S = crypto.randomUUID();
    expect(await seedDoc(db, "skill", { id: S, json: { schema: "skill/1", label: "A test skill", group: "tests", system: "Be brief." }, note: "a test skill" })).toBe(true);
    expect(await q(`SELECT schema_id, schema_version FROM play.docs WHERE id = $1`, [`skill:${S}`])).toEqual([{ schema_id: SCHEMA.skill, schema_version: 1 }]);
  });

  // ---- c2

  test("c2: a schema's new version is refused at Accept while a document on Main fails it, naming it; accepted once none does, and commits are checked against it", async () => {
    const S = crypto.randomUUID();
    await seedDoc(db, "skill", { id: S, json: { schema: "skill/1", label: "A wordy skill", group: "tests", system: "Say everything there is to say, at length." }, note: "wordy" });
    // the skill schema's v2: a system part of at most 20 characters, proposed as an intent variant of the schema
    const p = await tool("propose_doc_version", { doc: SCHEMA.skill, note: "a skill's system part is short", edits: [{ op: "set", path: ["node", "properties", "system", "maxLength"], value: 20 }] });
    expect(p).toMatchObject({ stage: "proposal", kind: "schema", number: 2 });
    const review = (await call("ada", "GET", `/api/intents/${p.intent}`)).data;
    expect(JSON.stringify((await call("ada", "GET", `/api/intents/${p.intent}/docs/${review.review.doc.id}`)).data)).toContain("maxLength");
    // refused while the wordy skill fails it (and any other skill that would), naming it; the intent stays at Proposal
    const no = await accept(p.intent);
    expect(no.status).toBe(409);
    expect(no.data.error).toContain(S);
    expect(no.data.error).toContain("on Main");
    expect((await call("ada", "GET", `/api/intents/${p.intent}`)).data.stage).toBe("proposal");
    expect((await typeFor(db, SCHEMA.skill)).version).toBe(1);
    // every skill on Main made short, each its own accepted version; then the schema goes in
    for (const r of await q(`SELECT split_part(id, ':', 2) AS id FROM play.docs WHERE schema_id = $1`, [SCHEMA.skill])) {
      const doc = (await tool("doc_at", { doc: r.id })).json;
      if (`${doc.system}`.length <= 20) continue;
      const fix = await tool("propose_doc_version", { doc: r.id, note: "brief", edits: [{ op: "set", path: ["system"], value: "Be brief." }] });
      expect((await accept(fix.intent)).data.decision).toMatchObject({ status: "accepted" });
    }
    const yes = await accept(p.intent);
    expect(yes.status).toBe(200);
    expect(yes.data.decision).toMatchObject({ status: "accepted", number: 2 });
    const t = await typeFor(db, SCHEMA.skill);
    expect([t.version, (t.schema.properties as any).system.maxLength]).toEqual([2, 20]);
    // from then on every commit is checked against v2, and records it
    const long = await tool("doc_edit", { doc: S, message: "longer again", edits: [{ op: "set", path: ["system"], value: "This is far longer than twenty." }] });
    expect(long.error).toContain("must be at most 20 characters");
    const ok = await tool("doc_edit", { doc: S, message: "still short", edits: [{ op: "set", path: ["system"], value: "Be kind." }] });
    expect(ok.changed).toBe(true);
    expect(await q(`SELECT schema_id, schema_version FROM play.docs WHERE id = $1`, [`skill:${S}`])).toEqual([{ schema_id: SCHEMA.skill, schema_version: 2 }]);
    // a schema's documents keep their prefix
    const moved = await tool("propose_doc_version", { doc: SCHEMA.skill, note: "a new prefix", edits: [{ op: "set", path: ["type"], value: "lesson" }] });
    expect((await accept(moved.intent)).data.error).toContain("keep their prefix");
  });

  // ---- c3

  test("c3: a schema added as a document alone, with no code, is a kind: listed, read, edited, proposed and accepted over MCP and HTTP", async () => {
    // a new schema, proposed whole; its prefix is no other kind's
    const clash = await tool("propose_doc_version", { kind: "schema", note: "another story", whole: { ...NOTE_SCHEMA, type: "story" } });
    expect((await accept(clash.intent)).data.error).toContain("another kind's");
    const s = await tool("propose_doc_version", { kind: "schema", note: "notes: a short text with stars", whole: NOTE_SCHEMA });
    expect(s).toMatchObject({ stage: "proposal", kind: "schema" });
    // nothing of it is a kind until a person accepts it
    expect((await tool("list_docs", { kind: "note" })).error).toContain("A kind is one of");
    expect((await accept(s.intent)).data.decision).toMatchObject({ status: "accepted", number: 1 });
    const kinds = (await rpc("tools/list")).tools.find((t: any) => t.name === "list_docs").inputSchema.properties.kind.enum;
    expect(kinds).toContain("note");

    // a note, proposed new: its first version an intent variant, Main's once accepted
    const bad = await tool("propose_doc_version", { kind: "note", note: "a note too many fields", whole: { label: "Bad", text: "x", colour: "red" } });
    expect(bad.error).toContain("is not a field of this document");
    const first = await tool("propose_doc_version", { kind: "note", note: "the first note", whole: { label: "First note", text: "Hello.", stars: 3 } });
    expect(first).toMatchObject({ stage: "proposal", kind: "note" });
    const N = first.doc as string;
    expect((await tool("list_docs", { kind: "note" }))).toEqual([expect.objectContaining({ id: N, kind: "note", label: "First note", number: 0 })]);
    expect((await accept(first.intent)).data.decision).toMatchObject({ status: "accepted", number: 1 });
    expect(await tool("list_docs", { kind: "note" })).toEqual([expect.objectContaining({ id: N, kind: "note", label: "First note", number: 1, versions: 1 })]);
    expect((await tool("doc_at", { doc: N })).json).toEqual({ label: "First note", text: "Hello.", stars: 3 });
    expect(await q(`SELECT schema_id, schema_version FROM play.docs WHERE id = $1`, [`note:${N}`])).toEqual([{ schema_id: s.doc, schema_version: 1 }]);

    // edited edit by edit in an intent variant, each checked whole, and proposed
    const e1 = await tool("doc_edit", { doc: N, message: "a warmer hello", edits: [{ op: "text", path: ["text"], index: 0, delete: 5, insert: "Hello there" }] });
    expect(e1).toMatchObject({ kind: "note", changed: true });
    expect((await tool("doc_edit", { doc: N, variant: e1.variant, message: "six stars", edits: [{ op: "set", path: ["stars"], value: 6 }] })).error).toContain("must be at most 5");
    await tool("doc_edit", { doc: N, variant: e1.variant, message: "five stars", edits: [{ op: "set", path: ["stars"], value: 5 }] });
    const h = await tool("doc_history", { doc: N });
    expect(h.variants.map((v: any) => [v.type, v.edits])).toEqual([["main", 2], ["intent", 1], ["intent", 2]]);
    expect((await tool("doc_history", { doc: N, variant: e1.variant })).edits.map((e: any) => e.message)).toEqual(["a warmer hello", "five stars"]);
    const p = await tool("propose_doc_version", { doc: N, variant: e1.variant, note: "warmer, and five stars" });
    expect(p).toMatchObject({ stage: "proposal", kind: "note", number: 2, edits: 2 });
    expect((await tool("doc_at", { doc: N, intent: p.intent })).json).toEqual({ label: "First note", text: "Hello there.", stars: 5 });
    expect((await accept(p.intent)).data.decision).toMatchObject({ status: "accepted", number: 2 });

    // over HTTP, by its UUID, admins only
    expect((await call("ada", "GET", `/api/docs/${N}`)).data).toMatchObject({ id: N, kind: "note", number: 2, json: { text: "Hello there.", stars: 5 } });
    expect((await call("ada", "GET", `/api/docs/${N}?v=1`)).data.json.text).toBe("Hello.");
    expect((await call("ada", "GET", `/api/docs/${N}/history`)).data.versions.map((v: any) => v.number)).toEqual([1, 2]);
    const ch = (await call("ada", "GET", `/api/docs/${N}/changes?variant=${e1.variant}`)).data;
    expect(ch.changes.map((c: any) => c.path).sort()).toEqual(["$.stars", "$.text"]);
    expect((await call("cit", "GET", `/api/docs/${N}`)).status).toBe(403);
    // and the schema itself is a document as every other: its history, its versions
    expect((await call("ada", "GET", `/api/docs/${s.doc}/history`)).data.versions.map((v: any) => v.number)).toEqual([1]);
  });
});
