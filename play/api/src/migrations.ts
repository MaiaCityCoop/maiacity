// Runs play's migrations (../migrations: the schema's history, every migration's SQL as it ran, kept outside the live
// code). `until` stops after that migration (a test builds a database as it stood then).
import type { Db } from "./pg";
import { MIGRATIONS } from "../migrations";
import { ensureSchemas } from "./docs/schemas";
export { MIGRATIONS, type Migration } from "../migrations";

/** Runs every migration not yet run, each in its own transaction. */
/** The advisory lock every migration step holds: play-api and the import start together on a deploy, and both migrate. */
const MIGRATION_LOCK = 4_711_029;

export async function migrate(db: Db, o: { until?: string } = {}): Promise<string[]> {
  // Two processes migrate the same database at once on a deploy (play-api as it starts, and the import beside it;
  // 2026-11-06 the second ran 0029 again after the first had, and failed on its ALTER). So every step takes one
  // advisory lock for its transaction and looks again whether its migration has run, under the lock.
  // In production the role play owns the schema but may not create one in the database (play/deploy/setup.sql makes
  // it), and CREATE SCHEMA IF NOT EXISTS checks that right even when the schema is there: so only create it if missing.
  await db.transaction(async (tx) => {
    await tx.query(`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK})`);
    await tx.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'play') THEN CREATE SCHEMA play; END IF;
      END $$`);
    await tx.query(`CREATE TABLE IF NOT EXISTS play.migrations (id TEXT PRIMARY KEY, ran TIMESTAMPTZ NOT NULL DEFAULT now())`);
  });
  const { rows } = await db.query<{ id: string }>("SELECT id FROM play.migrations");
  const done = new Set(rows.map((r) => r.id));
  const ran: string[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    if (o.until !== undefined && MIGRATIONS.indexOf(m) > MIGRATIONS.findIndex((x) => x.id === o.until)) break;
    const did = await db.transaction(async (tx) => {
      await tx.query(`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK})`);
      if ((await tx.query("SELECT 1 FROM play.migrations WHERE id = $1", [m.id])).rows.length) return false;
      await tx.query(m.sql);
      await tx.query("INSERT INTO play.migrations (id) VALUES ($1)", [m.id]);
      return true;
    });
    if (did) ran.push(m.id);
  }
  // then the schemas, each a document of the meta-schema, made from the seed where absent (play/SPEC.md "Version
  // control"); a database built only up to an older migration stands as it stood then
  if (o.until === undefined) await ensureSchemas(db);
  return ran;
}
