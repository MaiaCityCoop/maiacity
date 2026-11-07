// Every tool play's MCP lists has a valid JSON Schema as its inputSchema (src/mcp.ts; intent
// 8cb32651-1af3-43ce-8717-dfcb0efd98ca): strict clients such as Claude Code leave out a tool whose schema they refuse
// (specify_intent was, its depends_on items' `type` a description), so a new tool with a bad schema fails here.
// Against a real Postgres (TEST_DATABASE_URL), the tools listed for an admin's token.
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

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const TYPES = new Set(["string", "number", "integer", "boolean", "object", "array", "null"]);

// Every fault of one schema and the schemas inside it, each with its path.
function faults(schema: unknown, path: string, out: string[] = []): string[] {
  if (typeof schema === "boolean") return out;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    out.push(`${path}: not a schema`);
    return out;
  }
  const s = schema as Record<string, unknown>;
  if ("type" in s) {
    const ts = Array.isArray(s.type) ? s.type : [s.type];
    if (ts.length === 0) out.push(`${path}.type: empty`);
    for (const t of ts) if (typeof t !== "string" || !TYPES.has(t)) out.push(`${path}.type: ${JSON.stringify(t)} is no JSON Schema type`);
  }
  if ("enum" in s && (!Array.isArray(s.enum) || s.enum.length === 0)) out.push(`${path}.enum: not a non-empty array`);
  if ("properties" in s) {
    if (!s.properties || typeof s.properties !== "object" || Array.isArray(s.properties)) out.push(`${path}.properties: not an object`);
    else for (const [k, v] of Object.entries(s.properties)) faults(v, `${path}.properties.${k}`, out);
  }
  if ("required" in s) {
    const props = (s.properties ?? {}) as Record<string, unknown>;
    if (!Array.isArray(s.required)) out.push(`${path}.required: not an array`);
    else for (const r of s.required) if (typeof r !== "string" || !(r in props)) out.push(`${path}.required: ${JSON.stringify(r)} is no property`);
  }
  if ("items" in s) {
    if (Array.isArray(s.items)) s.items.forEach((v, i) => faults(v, `${path}.items[${i}]`, out));
    else faults(s.items, `${path}.items`, out);
  }
  if ("additionalProperties" in s && typeof s.additionalProperties !== "boolean") faults(s.additionalProperties, `${path}.additionalProperties`, out);
  for (const k of ["anyOf", "oneOf", "allOf"]) {
    if (!(k in s)) continue;
    const list = s[k];
    if (!Array.isArray(list) || list.length === 0) out.push(`${path}.${k}: not a non-empty array`);
    else list.forEach((v, i) => faults(v, `${path}.${k}[${i}]`, out));
  }
  if ("not" in s) faults(s.not, `${path}.not`, out);
  return out;
}

describe("the schema check", () => {
  test("finds what strict clients refuse", () => {
    expect(faults({ type: "object", properties: { a: { type: "array", items: { type: "string (a note)" } } } }, "t")).toEqual([
      't.properties.a.items.type: "string (a note)" is no JSON Schema type',
    ]);
    expect(faults({ type: "object", properties: { a: { enum: [] } }, required: ["a", "b"] }, "t")).toEqual(["t.properties.a.enum: not a non-empty array", 't.required: "b" is no property']);
    expect(faults({ type: ["string", "null"], anyOf: [{ type: "string" }] }, "t")).toEqual([]);
  });
});

suite("every MCP tool's inputSchema", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  let cookie = "";

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
    const h = await createHuman(db, "ada");
    cookie = `play_session=${tokenFor(h.id)}`;
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [h.id]);
  });

  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("is valid JSON Schema, an object at its top", async () => {
    const made = await api.fetch(new Request("http://play.test/api/tokens", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "agent" }) }));
    const token = ((await made.json()) as { token: string }).token;
    const r = await api.fetch(new Request("http://play.test/api/mcp", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }));
    const tools = ((await r.json()) as { result: { tools: { name: string; inputSchema: Record<string, unknown> }[] } }).result.tools;
    expect(tools.length).toBeGreaterThan(20);
    const bad: string[] = [];
    for (const t of tools) {
      if (t.inputSchema?.type !== "object") bad.push(`${t.name}: its top level is no object`);
      faults(t.inputSchema, t.name, bad);
    }
    expect(bad).toEqual([]);
    const spec = tools.find((t) => t.name === "specify_intent")!;
    expect((spec.inputSchema as any).properties.depends_on.items).toEqual({ type: "string" });
  });
});
