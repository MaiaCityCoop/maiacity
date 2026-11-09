// play/api's test kit: a fresh database per suite (made, migrated, seeded, dropped), the app on it, its humans and
// tokens made through the routes, and one way to call it over HTTP and over MCP. A suite that needs Postgres fails
// when TEST_DATABASE_URL is not set: none is skipped (avenBOX's box sets it; play/SPEC.md §4.12).
import { describe, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { app } from "../src/app";
import { COOKIE, createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore, type BlobStore } from "../src/blobs";
import { migrate } from "../src/migrations";
import { seed } from "../src/seed";
import { fromBunSql, type Db } from "../src/kit/pg";
import { Rate } from "../src/limits";
import type { GitHub } from "../src/github";

export const DB_URL = process.env.TEST_DATABASE_URL ?? "";

/** describe(), red when there is no database to run it on */
export function suite(name: string, fn: () => void) {
  if (DB_URL) return describe(name, fn);
  describe(name, () => test("needs TEST_DATABASE_URL (a Postgres to make its database in)", () => {
    throw new Error("TEST_DATABASE_URL is not set: bash play/avenbox/gate.sh api runs these against the box's Postgres");
  }));
}

export type Fresh = { db: Db; sql: Bun.SQL; url: string; name: string; drop: () => Promise<void> };

/** what a migrated and seeded database is made from: play/api's migrations and source, as one hash */
function codeHash(): string {
  const h = createHash("sha256");
  const walk = (dir: string) => {
    for (const e of readdirSync(dir).sort()) {
      const f = join(dir, e);
      if (statSync(f).isDirectory()) walk(f);
      else h.update(f).update(readFileSync(f));
    }
  };
  for (const d of ["../migrations", "../src"]) walk(resolve(import.meta.dir, d));
  return h.digest("hex").slice(0, 16);
}

let template: Promise<string> | null = null;
/**
 * The database every suite copies: migrated and seeded once per code, kept as `play_tmpl_<hash>`. Test files run in
 * parallel (intent aa59f248), and migrating and seeding a database each took past a hook's 5 s on a busy runner; a copy
 * is a file copy. Made under a name of its own and renamed into place: a rename can't win twice, so a file that loses
 * the race drops its own and copies the winner's.
 */
function templateDb(admin: Bun.SQL): Promise<string> {
  return (template ??= (async () => {
    const name = `play_tmpl_${codeHash()}`;
    const have = await admin`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (have.length) return name;
    const making = `${name}_${process.pid}_${Math.floor(Math.random() * 1e6)}`;
    await admin.unsafe(`CREATE DATABASE ${making}`);
    const u = new URL(DB_URL);
    u.pathname = `/${making}`;
    const sql = new Bun.SQL(u.toString());
    const db = fromBunSql(sql);
    await migrate(db, {});
    await seed(db);
    await sql.close();
    try {
      await admin.unsafe(`ALTER DATABASE ${making} RENAME TO ${name}`);
    } catch (e) {
      // 42P04: another file named its template first
      if ((e as { errno?: string }).errno !== "42P04") throw e;
      await admin.unsafe(`DROP DATABASE ${making} WITH (FORCE)`);
    }
    return name;
  })());
}

/**
 * A database of its own on TEST_DATABASE_URL's server, migrated and seeded as play-api starts (a copy of the code's
 * template; `migrate: false` leaves it empty, `until` stops at that migration, as an older play's database), sessions
 * signed; `drop()` closes and drops it.
 */
export async function freshDb(o: { prefix?: string; migrate?: boolean; until?: string } = {}): Promise<Fresh> {
  const name = `${o.prefix ?? "play_test"}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = new Bun.SQL(DB_URL);
  const copy = o.migrate !== false && !o.until;
  await admin.unsafe(copy ? `CREATE DATABASE ${name} TEMPLATE ${await templateDb(admin)}` : `CREATE DATABASE ${name}`);
  const u = new URL(DB_URL);
  u.pathname = `/${name}`;
  const sql = new Bun.SQL(u.toString());
  const db = fromBunSql(sql);
  if (copy) await initSessions(db);
  else if (o.migrate !== false) await migrate(db, { until: o.until });
  const drop = async () => {
    await sql.close();
    await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.close();
  };
  return { db, sql, url: u.toString(), name, drop };
}

/** a folder of its own for play's files */
export const tempStore = (): BlobStore => folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));

/** the app on `db`, with no rate limit, its files in a folder of its own */
export const appOn = (db: Db, o: { store?: BlobStore; github?: GitHub | null; commit?: string | null; rate?: Rate } = {}) =>
  app({ db, store: o.store ?? tempStore(), rate: o.rate ?? new Rate(0), github: o.github ?? null, ...(o.commit !== undefined ? { commit: o.commit } : {}) });

export type Api = ReturnType<typeof app>;

/** the session cookie play sets for a human */
export const cookieFor = (humanId: string) => `${COOKIE}=${tokenFor(humanId)}`;

/** a human (an admin unless `level` says otherwise) and their session cookie */
export async function human(db: Db, name: string, level: "admin" | "citizen" | "traveler" | null = "admin") {
  const h = await createHuman(db, name);
  if (level && level !== "traveler") await db.query(`UPDATE play.memberships SET level = $2 WHERE human_id = $1`, [h.id, level]);
  return { id: h.id, cookie: cookieFor(h.id) };
}

export type Answer = { status: number; data: any; headers: Headers; text: string };

/** One request to the app: `data` is the body's JSON, else its text, else null (an empty body). */
export async function request(api: Api, who: { cookie?: string | null; bearer?: string | null }, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Answer> {
  const h: Record<string, string> = { ...headers };
  if (who.cookie) h.cookie = who.cookie;
  if (who.bearer) h.authorization = `Bearer ${who.bearer}`;
  if (body !== undefined) h["content-type"] = "application/json";
  const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }));
  const text = await r.text();
  let data: any = text === "" ? null : text;
  try {
    data = text === "" ? null : JSON.parse(text);
  } catch {
    // not JSON: kept as its text
  }
  return { status: r.status, data, headers: r.headers, text };
}

/** an access token of the admin whose cookie it is, made on the profile's route; `avenbox` flags it as the GitHub runs' */
export async function agentToken(api: Api, cookie: string, o: { name?: string; avenbox?: boolean } = {}): Promise<{ id: string; token: string }> {
  const made = await request(api, { cookie }, "POST", "/api/tokens", { name: o.name ?? "agent" });
  if (made.status !== 201) throw new Error(`POST /api/tokens: ${made.status} ${JSON.stringify(made.data)}`);
  if (o.avenbox) {
    const r = await request(api, { cookie }, "POST", `/api/tokens/${made.data.id}/avenbox`, { avenbox: true });
    if (r.data?.avenbox !== true) throw new Error(`POST /api/tokens/:id/avenbox: ${r.status} ${JSON.stringify(r.data)}`);
  }
  return { id: made.data.id, token: made.data.token };
}

let rpcId = 0;
/** one JSON-RPC request to play's MCP server with `bearer`: the whole answer, its status and its JSON (null if none) */
export async function rpc(api: Api, bearer: string | null, method: string, params?: unknown) {
  const r = await api.fetch(
    new Request("http://play.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, ...(params === undefined ? {} : { params }) }),
    }),
  );
  const text = await r.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // not JSON: none
  }
  return { status: r.status, json, response: r };
}

/**
 * One MCP tool called with `bearer`: what it answered (its text read as JSON), or `{ error }`: the tool's error text,
 * the JSON-RPC error's message, or the HTTP status where the request itself was refused.
 */
export async function tool(api: Api, bearer: string | null, name: string, args: Record<string, unknown>): Promise<any> {
  const { status, json } = await rpc(api, bearer, "tools/call", { name, arguments: args });
  if (status !== 200) return { error: `${status}` };
  if (json?.error) return { error: json.error.message as string };
  const text = json.result.content[0].text;
  return json.result.isError ? { error: text as string } : JSON.parse(text);
}

/** console.log and console.warn silenced until `restore()` (the routes log what they do) */
export function quiet() {
  const keep = { log: console.log, warn: console.warn };
  console.log = () => {};
  console.warn = () => {};
  return () => Object.assign(console, keep);
}

/** Waits until `ok()` gives something other than null or false, asking every `everyMs`; throws after `withinMs`. */
export async function until<T>(what: string, ok: () => T | null | false | Promise<T | null | false>, o: { withinMs?: number; everyMs?: number } = {}): Promise<T> {
  const end = Date.now() + (o.withinMs ?? 10_000);
  for (;;) {
    const got = await ok();
    if (got !== null && got !== false) return got;
    if (Date.now() > end) throw new Error(`${what}: not within ${o.withinMs ?? 10_000} ms`);
    await Bun.sleep(o.everyMs ?? 20);
  }
}

/** `p`'s value, or `late` once `ms` have passed first */
export const within = <T, L>(p: Promise<T>, ms: number, late: L): Promise<T | L> =>
  Promise.race([p, new Promise<L>((done) => setTimeout(() => done(late), ms))]);
