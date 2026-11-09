// Sandbox 7, the hex planet (intent 8d683ad6, c3) against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
// Its row comes from its own migration (one new file, play/SPEC.md §3.1) under the random UUID ids.ts names; its layout
// is a document like every sandbox's (§4.6), its v1 the planet, biomes and sites the deploy's import writes while it has
// none (../import/sandboxes.ts); its config is read at /api/sandboxes/<uuid>/config. The maps its planet names are
// play's files by their hash: kept in play/media and found by the import (../import/run.ts mediaNamed).
import { afterAll, beforeAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { initSessions } from "../src/auth";
import { hashBytes } from "../src/kit/hash";
import { SANDBOX } from "../src/kit/ids";
import { migrate } from "../src/migrations";
import { ensureLayoutDoc } from "../src/sandboxes";
import { mediaNamed } from "../import/run";
import { seedSandboxLayouts } from "../import/sandboxes";
import planet from "../import/sandboxes/sandbox-7/planet.json";
import biomes from "../import/sandboxes/sandbox-7/biomes.json";
import sites from "../import/sandboxes/sandbox-7/sites.json";
import { appOn, freshDb, human, suite, type Api, type Fresh } from "./kit";

const MEDIA = join(import.meta.dir, "../../media");

test("Sandbox 7's row comes from one migration of its own, under the UUID ids.ts names", () => {
  const mine = readdirSync(join(import.meta.dir, "../migrations")).filter((f) => /-8d683ad6-/.test(f));
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatch(/^\d{12}-8d683ad6-sandbox-7\.sql$/);
  expect(SANDBOX.seven).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(Object.values(SANDBOX).filter((id) => id === SANDBOX.seven)).toHaveLength(1);
});

test("every map the planet names is among the media the import puts in play's files, its bytes held to its hash", () => {
  const named = new Set(mediaNamed().map((m) => `${m.hash}.${m.ending}`));
  const maps = Object.values(planet.maps);
  expect(maps).toHaveLength(4);
  for (const m of maps) {
    expect(m.file).toMatch(/^[0-9a-f]{64}\.json$/);
    expect(named.has(m.file)).toBe(true);
    const bytes = new Uint8Array(readFileSync(join(MEDIA, m.file)));
    expect(hashBytes(bytes)).toBe(m.file.slice(0, 64));
    // each says where it comes from, and its licence
    expect(m.source.length).toBeGreaterThan(10);
    expect(m.licence.length).toBeGreaterThan(5);
  }
});

suite("Sandbox 7 in play", () => {
  let f: Fresh, api: Api;
  let cookie = "";

  // migrated without the seed: the deploy's import seeds the layouts, as below
  beforeAll(async () => {
    f = await freshDb({ prefix: "play_sandbox7", migrate: false });
    await migrate(f.db);
    await initSessions(f.db);
    api = appOn(f.db);
    cookie = (await human(f.db, "ada")).cookie;
  });
  afterAll(async () => {
    await f?.drop();
  });

  test("its row names it at /sandbox-7/", async () => {
    const { rows } = await f.db.query<any>(`SELECT title, route FROM play.sandboxes WHERE id = $1`, [SANDBOX.seven]);
    expect(rows).toEqual([{ title: "Sandbox 7", route: "/sandbox-7/" }]);
  });

  test("its layout is a document, its v1 the planet, biomes and sites the deploy's import writes once, with a history", async () => {
    const first = await seedSandboxLayouts(f.db);
    expect(first.errors).toEqual([]);
    expect(first.seeded).toContain(SANDBOX.seven);
    const again = await seedSandboxLayouts(f.db);
    expect(again.seeded).toEqual([]);
    expect(again.present).toContain(SANDBOX.seven);
    expect(await ensureLayoutDoc(f.db, SANDBOX.seven)).toBe(false);
    const { rows } = await f.db.query<any>(`SELECT count(*)::int AS n FROM play.doc_versions WHERE doc_id = $1`, [`sandbox:${SANDBOX.seven}`]);
    expect(rows[0].n).toBeGreaterThan(0);
  });

  test("its config answers at /api/sandboxes/<uuid>/config", async () => {
    const r = await api.fetch(new Request(`http://play.test/api/sandboxes/${SANDBOX.seven}/config`, { headers: { cookie } }));
    expect(r.status).toBe(200);
    const config = await r.json();
    expect(config.planet).toEqual(planet);
    expect(config.biomes).toEqual(biomes);
    expect(config.sites).toEqual(sites);
  });
});
