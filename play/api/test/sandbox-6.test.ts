// Sandbox 6, one village at its real size (intent 67f0404a, c3) against a real Postgres: set TEST_DATABASE_URL, as for
// ./api.test.ts. Its row comes from its own migration (one new file, play/SPEC.md §3.1) under the random UUID ids.ts
// names; its layout is a document like every sandbox's (§4.6), its v1 the village and audit the deploy's import writes
// while it has none (../import/sandboxes.ts); its config is read at /api/sandboxes/<uuid>/config.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { initSessions } from "../src/auth";
import { SANDBOX } from "../src/kit/ids";
import { migrate } from "../src/migrations";
import { ensureLayoutDoc } from "../src/sandboxes";
import { seedSandboxLayouts } from "../import/sandboxes";
import village from "../import/sandboxes/sandbox-6/village.json";
import { appOn, freshDb, human, suite, type Api, type Fresh } from "./kit";

test("Sandbox 6's row comes from one migration of its own, under the UUID ids.ts names", () => {
  const mine = readdirSync(join(import.meta.dir, "../migrations")).filter((f) => /-67f0404a-/.test(f));
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatch(/^\d{12}-67f0404a-sandbox-6\.sql$/);
  expect(SANDBOX.six).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  // no other sandbox shares it
  expect(Object.values(SANDBOX).filter((id) => id === SANDBOX.six)).toHaveLength(1);
});

suite("Sandbox 6 in play", () => {
  let f: Fresh, api: Api;
  let cookie = "";

  // migrated without the seed: the deploy's import seeds the layouts, as below
  beforeAll(async () => {
    f = await freshDb({ prefix: "play_sandbox6", migrate: false });
    await migrate(f.db);
    await initSessions(f.db);
    api = appOn(f.db);
    cookie = (await human(f.db, "ada")).cookie;
  });
  afterAll(async () => {
    await f?.drop();
  });

  test("its row names it at /sandbox-6/", async () => {
    const { rows } = await f.db.query<any>(`SELECT title, route FROM play.sandboxes WHERE id = $1`, [SANDBOX.six]);
    expect(rows).toEqual([{ title: "Sandbox 6", route: "/sandbox-6/" }]);
  });

  test("its layout is a document, its v1 the village and audit the deploy's import writes once, with a history", async () => {
    expect(await seedSandboxLayouts(f.db)).toEqual({ seeded: [SANDBOX.six], present: [], errors: [] });
    expect(await seedSandboxLayouts(f.db)).toEqual({ seeded: [], present: [SANDBOX.six], errors: [] });
    expect(await ensureLayoutDoc(f.db, SANDBOX.six)).toBe(false);
    const { rows } = await f.db.query<any>(`SELECT id FROM play.docs WHERE id = $1`, [`sandbox:${SANDBOX.six}`]);
    expect(rows).toHaveLength(1);
    const { rows: ups } = await f.db.query<any>(`SELECT count(*)::int AS n FROM play.doc_versions WHERE doc_id = $1`, [`sandbox:${SANDBOX.six}`]);
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
