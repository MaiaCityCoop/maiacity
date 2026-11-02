// The API against a real Postgres: set TEST_DATABASE_URL (a server where this may create and drop a database), e.g.
// postgres://postgres@127.0.0.1:5544/postgres. Without it these tests are skipped.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { hashText } from "../src/hash";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { RECIPE_HEAD } from "../src/recipes";
import { Rate } from "../src/limits";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const recipe = (id: string, v: number, variant: string | null = null, lib = "module.exports.recipe = () => ({});") =>
  `${RECIPE_HEAD}${lib}\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant)});\n});\n`;

suite("play API", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};

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
    for (const n of ["ada", "cit", "cit2", "trav"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = ANY($1)`, [[who.cit.id, who.cit2.id]]);
  });

  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  const call = async (as: string | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    if (as) headers.cookie = who[as].cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    const text = await r.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {}
    return { status: r.status, data, headers: r.headers };
  };

  test("a visitor may do nothing but sign in", async () => {
    expect((await call(null, "GET", "/api/health")).status).toBe(200);
    expect((await call(null, "GET", "/api/assets")).status).toBe(401);
    expect((await call(null, "GET", "/api/sandboxes")).status).toBe(401);
    expect((await call(null, "POST", "/api/proposals", {})).status).toBe(401);
  });

  test("a traveler reads sandboxes and assets, but proposes nothing", async () => {
    expect((await call("trav", "GET", "/api/me")).data.level).toBe("traveler");
    expect((await call("trav", "GET", "/api/sandboxes")).data.map((s: any) => s.id)).toEqual(["sandbox-1", "sandbox-2", "sandbox-3"]);
    expect((await call("trav", "GET", "/api/assets")).status).toBe(200);
    const r = await call("trav", "POST", "/api/proposals", { asset: "plants/fern", label: "Fern", recipe: recipe("fern", 1) });
    expect(r.status).toBe(403);
  });

  test("a citizen proposes a new asset, an admin accepts it, everyone reads it", async () => {
    const p = await call("cit", "POST", "/api/proposals", { asset: "plants/fern", label: "Fern", note: "first", recipe: recipe("fern", 1), record: { card: { label: "Fern" } } });
    expect(p.status).toBe(201);
    expect(p.data.number).toBe(1);
    expect((await call("trav", "GET", "/api/assets")).data.find((a: any) => a.id === "plants/fern")).toBeUndefined();
    expect((await call("cit", "POST", `/api/proposals/${p.data.id}/accept`)).status).toBe(403);
    const ok = await call("ada", "POST", `/api/proposals/${p.data.id}/accept`);
    expect(ok.data).toMatchObject({ status: "accepted", number: 1 });
    const a = await call("trav", "GET", "/api/assets/plants/fern");
    expect(a.data.versions.map((v: any) => [v.number, v.author, v.approvedBy])).toEqual([[1, "cit", "ada"]]);
    const f = await call("trav", "GET", `/api/files/${a.data.versions[0].recipe}`);
    expect(f.status).toBe(200);
    expect(hashText(f.data)).toBe(a.data.versions[0].recipe);
    const r = await call("trav", "GET", `/api/resolve?ref=${encodeURIComponent("plants/fern@1?seed=x")}`);
    expect(r.data[0]).toMatchObject({ asset: "plants/fern", number: 1, hash: a.data.versions[0].recipe, params: { seed: "x" } });
  });

  test("a recipe file must name the version it is proposed for", async () => {
    const r = await call("cit", "POST", "/api/proposals", { asset: "plants/fern", recipe: recipe("fern", 1, null, "/* again */") });
    expect(r.status).toBe(400);
    expect(r.data.error).toContain("not fern@2");
  });

  test("of two proposals on one head, the second goes stale", async () => {
    const a = await call("cit", "POST", "/api/proposals", { asset: "plants/fern", recipe: recipe("fern", 2, null, "/* a */") });
    const b = await call("cit2", "POST", "/api/proposals", { asset: "plants/fern", recipe: recipe("fern", 2, null, "/* b */") });
    expect([a.status, b.status]).toEqual([201, 201]);
    expect((await call("ada", "POST", `/api/proposals/${b.data.id}/accept`)).data.status).toBe("accepted");
    expect((await call("ada", "POST", `/api/proposals/${a.data.id}/accept`)).status).toBe(409);
    const list = await call("trav", "GET", "/api/proposals");
    expect(list.data.find((p: any) => p.id === a.data.id).status).toBe("stale");
    const chain = (await call("trav", "GET", "/api/assets/plants/fern")).data.versions;
    expect(chain.map((v: any) => v.number)).toEqual([2, 1]);
    expect(chain[0].parents).toEqual([chain[1].id]);
    // a base the proposer saw that is no longer the head is refused at once
    expect((await call("cit", "POST", "/api/proposals", { asset: "plants/fern", base: chain[1].id, recipe: recipe("fern", 3) })).status).toBe(409);
  });

  test("an accepted version can't be changed", async () => {
    await expect(db.query(`UPDATE play.asset_versions SET note = 'x' WHERE asset_id = 'plants/fern' AND number = 1`)).rejects.toThrow(/frozen/);
    await expect(db.query(`DELETE FROM play.asset_versions WHERE asset_id = 'plants/fern'`)).rejects.toThrow(/never deleted/);
  });

  test("a kind of variants resolves to its default variant, or the one named", async () => {
    const p = await call("cit", "POST", "/api/proposals", {
      asset: "actors/goat", label: "Goat",
      variants: { "goat-saanen": { recipe: recipe("goat", 1, "goat-saanen"), record: { card: { label: "Goat: Saanen" } } }, "goat-pied": { recipe: recipe("goat", 1, "goat-pied") } },
      defaultVariant: "goat-saanen",
    });
    expect(p.status).toBe(201);
    await call("ada", "POST", `/api/proposals/${p.data.id}/accept`);
    const [plain, pied, none] = (await call("trav", "GET", "/api/resolve?ref=actors/goat@1&ref=actors/goat@1:goat-pied&ref=actors/goat@1:goat-nope")).data;
    expect(plain.variant).toBe("goat-saanen");
    expect(pied.variant).toBe("goat-pied");
    expect(plain.hash).not.toBe(pied.hash);
    expect(none.error).toContain("no variant goat-nope");
  });

  test("the author withdraws, an admin rejects", async () => {
    const a = await call("cit", "POST", "/api/proposals", { asset: "plants/fern", recipe: recipe("fern", 3, null, "/* w */") });
    expect((await call("cit2", "POST", `/api/proposals/${a.data.id}/withdraw`)).status).toBe(403);
    expect((await call("cit", "POST", `/api/proposals/${a.data.id}/withdraw`)).data.status).toBe("withdrawn");
    const b = await call("cit", "POST", "/api/proposals", { asset: "plants/fern", recipe: recipe("fern", 3, null, "/* r */") });
    expect((await call("ada", "POST", `/api/proposals/${b.data.id}/reject`)).data.status).toBe("rejected");
  });

  test("an invite makes a traveler a citizen, once", async () => {
    expect((await call("trav", "POST", "/api/invites")).status).toBe(403);
    const inv = await call("ada", "POST", "/api/invites");
    expect(inv.status).toBe(201);
    expect((await call(null, "GET", `/api/invites/${inv.data.code}`)).data.open).toBe(true);
    expect((await call("trav", "POST", `/api/invites/${inv.data.code}/claim`)).data.level).toBe("citizen");
    expect((await call("trav", "GET", "/api/me")).data.level).toBe("citizen");
    expect((await call("cit", "POST", `/api/invites/${inv.data.code}/claim`)).status).toBe(410);
  });

  test("admins run the members, and one admin always stays", async () => {
    expect((await call("cit", "GET", "/api/members")).status).toBe(403);
    expect((await call("ada", "GET", "/api/members")).data.length).toBe(4);
    expect((await call("ada", "POST", `/api/members/${who.ada.id}/level`, { level: "traveler" })).status).toBe(409);
    expect((await call("ada", "POST", `/api/members/${who.cit2.id}/level`, { level: "traveler" })).data.level).toBe("traveler");
  });
});
