// Sandbox 6, one village at its real size (intent 67f0404a, c3) against a real Postgres: set TEST_DATABASE_URL, as for
// ./api.test.ts. Its row comes from its own migration (one new file, play/SPEC.md §3.1) under the random UUID ids.ts
// names; its layout is a document like every sandbox's (§4.6), its v1 the village and audit the deploy's import writes
// while it has none (../import/sandboxes.ts); its config is read at /api/sandboxes/<uuid>/config.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { SANDBOX } from "../src/ids";
import { Rate } from "../src/limits";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { ensureLayoutDoc } from "../src/sandboxes";
import { seedSandboxLayouts } from "../import/sandboxes";
import village from "../import/sandboxes/sandbox-6/village.json";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

test("Sandbox 6's row comes from one migration of its own, under the UUID ids.ts names", () => {
  const mine = readdirSync(join(import.meta.dir, "../migrations")).filter((f) => /-67f0404a-/.test(f));
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatch(/^\d{12}-67f0404a-sandbox-6\.sql$/);
  expect(SANDBOX.six).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  // no other sandbox shares it
  expect(Object.values(SANDBOX).filter((id) => id === SANDBOX.six)).toHaveLength(1);
});

suite("Sandbox 6 in play", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  let cookie = "";

  beforeAll(async () => {
    name = `play_sandbox6_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [h.id]);
    cookie = `play_session=${tokenFor(h.id)}`;
  });
  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("its row names it at /sandbox-6/", async () => {
    const { rows } = await db.query<any>(`SELECT title, route FROM play.sandboxes WHERE id = $1`, [SANDBOX.six]);
    expect(rows).toEqual([{ title: "Sandbox 6", route: "/sandbox-6/" }]);
  });

  test("its layout is a document, its v1 the village and audit the deploy's import writes once, with a history", async () => {
    // (the other sandboxes' layouts kept in the repo are seeded beside it)
    const first = await seedSandboxLayouts(db);
    expect(first.errors).toEqual([]);
    expect(first.seeded).toContain(SANDBOX.six);
    const again = await seedSandboxLayouts(db);
    expect(again.seeded).toEqual([]);
    expect(again.present).toContain(SANDBOX.six);
    expect(await ensureLayoutDoc(db, SANDBOX.six)).toBe(false);
    const { rows } = await db.query<any>(`SELECT id FROM play.docs WHERE id = $1`, [`sandbox:${SANDBOX.six}`]);
    expect(rows).toHaveLength(1);
    const { rows: ups } = await db.query<any>(`SELECT count(*)::int AS n FROM play.doc_versions WHERE doc_id = $1`, [`sandbox:${SANDBOX.six}`]);
    expect(ups[0].n).toBeGreaterThan(0);
  });

  test("its config answers at /api/sandboxes/<uuid>/config", async () => {
    const r = await api.fetch(new Request(`http://play.test/api/sandboxes/${SANDBOX.six}/config`, { headers: { cookie } }));
    expect(r.status).toBe(200);
    const config = await r.json();
    expect(config.village).toEqual(village);
    expect(config.audit.inputs.budget.value).toBe(200_000_000);
  });
});
