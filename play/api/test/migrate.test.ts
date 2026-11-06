// play's migrations run twice at once on a deploy: play-api migrates as it starts, and the import run beside it
// migrates too (2026-11-06: the second ran 0029-one-record again after the first had, and the deploy failed on
// "column work already exists"). Two migrate() calls at once on a fresh database: both finish, every migration ran
// exactly once, and a third finds nothing to run.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MIGRATIONS, migrate } from "../src/migrations";
import { fromBunSql } from "../src/pg";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

suite("migrate, twice at once", () => {
  let admin: Bun.SQL, a: Bun.SQL, b: Bun.SQL, name: string;
  beforeAll(async () => {
    name = `play_migrate_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    a = new Bun.SQL(u.toString());
    b = new Bun.SQL(u.toString());
  });
  afterAll(async () => {
    await a?.close();
    await b?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("both finish, each migration runs once", async () => {
    const [x, y] = await Promise.all([migrate(fromBunSql(a)), migrate(fromBunSql(b))]);
    expect([...x, ...y].sort()).toEqual(MIGRATIONS.map((m) => m.id).sort());
    const rows = await a.unsafe(`SELECT id FROM play.migrations ORDER BY id`);
    expect(rows.map((r: any) => r.id)).toEqual(MIGRATIONS.map((m) => m.id).sort());
    expect(await migrate(fromBunSql(a))).toEqual([]);
  }, 60_000);
});
