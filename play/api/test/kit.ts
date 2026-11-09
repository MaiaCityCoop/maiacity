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
import { prepare } from "../src/seed";
import { LOCK } from "../src/kit/locks";
import { fromBunSql, type Db } from "../src/kit/pg";
import { Rate } from "../src/limits";
import type { GitHub } from "../src/github";

export const DB_URL = process.env.TEST_DATABASE_URL ?? "";

export function suite(name: string, fn: () => void) {
  if (DB_URL) return describe(name, fn);
  describe(name, () => test("needs TEST_DATABASE_URL (a Postgres to make its database in)", () => {
    throw new Error("TEST_DATABASE_URL is not set: bash play/avenbox/gate.sh api runs these against the box's Postgres");
  }));
}

export type Fresh = { db: Db; sql: Bun.SQL; url: string; name: string; drop: () => Promise<void> };

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
 * is a file copy. On a fresh runner every file wants it at once: one makes it while the others wait on a session
 * advisory lock (CREATE DATABASE can't run in a transaction), then each copies it.
 */
export function templateDb(admin: Bun.SQL): Promise<string> {
  return (template ??= (async () => {
    const name = `play_tmpl_${codeHash()}`;
    const c = await admin.reserve();
    try {
      await c.unsafe(`SELECT pg_advisory_lock(${LOCK.testTemplate})`);
      const have = await c`SELECT 1 FROM pg_database WHERE datname = ${name}`;
      if (!have.length) {
        const making = `${name}_${process.pid}`;
        await c.unsafe(`DROP DATABASE IF EXISTS ${making} WITH (FORCE)`);
        await c.unsafe(`CREATE DATABASE ${making}`);
        const u = new URL(DB_URL);
        u.pathname = `/${making}`;
        const sql = new Bun.SQL(u.toString());
        await prepare(fromBunSql(sql));
        await sql.close();
        await c.unsafe(`ALTER DATABASE ${making} RENAME TO ${name}`);
      }
    } finally {
      await c.unsafe(`SELECT pg_advisory_unlock(${LOCK.testTemplate})`);
      c.release();
    }
    return name;
  })());
}

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

export const tempStore = (): BlobStore => folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));

export const appOn = (db: Db, o: { store?: BlobStore; github?: GitHub | null; commit?: string | null; rate?: Rate } = {}) =>
  app({ db, store: o.store ?? tempStore(), rate: o.rate ?? new Rate(0), github: o.github ?? null, ...(o.commit !== undefined ? { commit: o.commit } : {}) });

export type Api = ReturnType<typeof app>;

export const cookieFor = (humanId: string) => `${COOKIE}=${tokenFor(humanId)}`;

export async function human(db: Db, name: string, level: "admin" | "citizen" | "traveler" | null = "admin") {
  const h = await createHuman(db, name);
  if (level && level !== "traveler") await db.query(`UPDATE play.memberships SET level = $2 WHERE human_id = $1`, [h.id, level]);
  return { id: h.id, cookie: cookieFor(h.id) };
}

export type Answer = { status: number; data: any; headers: Headers; text: string };

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
  }
  return { status: r.status, json, response: r };
}

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

export async function until<T>(what: string, ok: () => T | null | false | Promise<T | null | false>, o: { withinMs?: number; everyMs?: number } = {}): Promise<T> {
  const end = Date.now() + (o.withinMs ?? 10_000);
  for (;;) {
    const got = await ok();
    if (got !== null && got !== false) return got;
    if (Date.now() > end) throw new Error(`${what}: not within ${o.withinMs ?? 10_000} ms`);
    await Bun.sleep(o.everyMs ?? 20);
  }
}

export const within = <T, L>(p: Promise<T>, ms: number, late: L): Promise<T | L> =>
  Promise.race([p, new Promise<L>((done) => setTimeout(() => done(late), ms))]);
