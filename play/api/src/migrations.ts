// Runs play's migrations (../migrations: the schema's history, one file `<id>.sql` per migration, its SQL as it ran,
// kept outside the live code; play/SPEC.md "Migrations"). They run in name order, each once, in one transaction; a
// migration is never edited after it has shipped, only followed by another. `until` stops after that migration (a test
// builds a database as it stood then). What SQL can't write is ./seed.ts, run after it by every entry point.
//
// A new migration's id is `<UTC time YYYYMMDDHHMM>-<the intent's first 8 hex>-<slug>` (202611071200-e9afc2d5-files):
// it sorts after every numbered one, and two intents never pick the same, so adding one touches only its own new file.
// The numbered ids (0001-ownership … up to LAST_NUMBERED) are the ones shipped before, kept as play.migrations names them.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./kit/pg";
import { LOCK, lockSql } from "./kit/locks";

export type Migration = { id: string; sql: string };

/** the folder the migrations are read from */
export const MIGRATIONS_DIR = join(import.meta.dir, "..", "migrations");
/** the last hand-numbered migration (0037-intent-depends, landed in the old array beside this change): none after it */
const LAST_NUMBERED = 37;
const NUMBERED = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATED = /^(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])([0-5]\d)-[0-9a-f]{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Why a migration's id can't be, or null: a numbered one up to LAST_NUMBERED, else <YYYYMMDDHHMM>-<8 hex>-<slug>. */
export function badId(id: string): string | null {
  const n = NUMBERED.exec(id);
  if (n) return Number(n[1]) >= 1 && Number(n[1]) <= LAST_NUMBERED ? null : `a numbered id after ${String(LAST_NUMBERED).padStart(4, "0")}: a new migration is <YYYYMMDDHHMM>-<the intent's first 8 hex>-<slug>`;
  return DATED.test(id) ? null : "not <YYYYMMDDHHMM>-<the intent's first 8 hex>-<slug> (lowercase, e.g. 202611071200-e9afc2d5-files)";
}

/** Every migration in the folder, in name order; throws, naming the file, on a malformed or duplicate id. */
export function loadMigrations(dir = MIGRATIONS_DIR): Migration[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const seen = new Map<string, string>();
  return files.map((f) => {
    const id = f.slice(0, -4);
    const why = badId(id);
    if (why) throw new Error(`migration ${join(dir, f)}: ${why}`);
    // a numbered id's number, a dated one's whole id: each names one migration only (case folded, as macOS would)
    const key = NUMBERED.test(id) ? id.slice(0, 4) : id.toLowerCase();
    if (seen.has(key)) throw new Error(`migration ${join(dir, f)}: a duplicate id, as ${seen.get(key)}`);
    seen.set(key, f);
    return { id, sql: readFileSync(join(dir, f), "utf8") };
  });
}

/** play's migrations, as the folder holds them */
export const MIGRATIONS: Migration[] = loadMigrations();

/** Runs every migration not yet run, each in its own transaction. */
export async function migrate(db: Db, o: { until?: string; migrations?: Migration[] } = {}): Promise<string[]> {
  const all = o.migrations ?? MIGRATIONS;
  const last = o.until === undefined ? all.length - 1 : all.findIndex((x) => x.id === o.until);
  if (last < 0 && o.until !== undefined) throw new Error(`migrate: no migration ${o.until}`);
  // Two processes migrate the same database at once on a deploy (play-api as it starts, and the import beside it;
  // 2026-11-06 the second ran 0029 again after the first had, and failed on its ALTER). So every step takes one
  // advisory lock for its transaction and looks again whether its migration has run, under the lock.
  // In production the role play owns the schema but may not create one in the database (play/deploy/setup.sql makes
  // it), and CREATE SCHEMA IF NOT EXISTS checks that right even when the schema is there: so only create it if missing.
  await db.transaction(async (tx) => {
    await tx.query(lockSql(LOCK.migrations));
    await tx.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'play') THEN CREATE SCHEMA play; END IF;
      END $$`);
    await tx.query(`CREATE TABLE IF NOT EXISTS play.migrations (id TEXT PRIMARY KEY, ran TIMESTAMPTZ NOT NULL DEFAULT now())`);
  });
  const { rows } = await db.query<{ id: string }>("SELECT id FROM play.migrations");
  const done = new Set(rows.map((r) => r.id));
  const ran: string[] = [];
  for (const m of all.slice(0, last + 1)) {
    if (done.has(m.id)) continue;
    const did = await db.transaction(async (tx) => {
      await tx.query(lockSql(LOCK.migrations));
      if ((await tx.query("SELECT 1 FROM play.migrations WHERE id = $1", [m.id])).rows.length) return false;
      await tx.query(m.sql);
      await tx.query("INSERT INTO play.migrations (id) VALUES ($1)", [m.id]);
      return true;
    });
    if (did) ran.push(m.id);
  }
  return ran;
}
