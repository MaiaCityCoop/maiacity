// The Factories on Loro (src/factories.ts, play/SPEC.md §4.7) against a real Postgres: set TEST_DATABASE_URL, as for
// ./api.test.ts. The LifeTrac line seeded as its v1, read by admins only, drafted step by step over MCP, proposed,
// reviewed field by field, accepted as v2; a proposal on an old version merged where it touches other fields and
// archived where it touches the same.
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
import { lifetracLine, seedFactories } from "../import/factories";
import { FACTORY } from "../src/ids";

const LT = FACTORY.lifetrac;

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

suite("the Factories on Loro", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";

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
    for (const n of ["ada", "cit"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [who.ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
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
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  let n = 0;
  /** a tool called over MCP by ada's token: its result as JSON, or its error's text */
  const tool = async (name: string, args: Record<string, unknown>) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method: "tools/call", params: { name, arguments: args } }),
      }),
    );
    const res = (await r.json()).result;
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };

  test("the LifeTrac line is seeded once as its v1, and a valid factory/1", async () => {
    const doc = lifetracLine();
    expect(doc.line.stations).toHaveLength(42);
    expect(doc.parts).toHaveLength(135);
    expect(doc.line.stations.every((s: any) => s.ct === undefined && s.note === undefined && typeof s.what === "string")).toBe(true);
    expect(await seedFactories(db)).toEqual({ seeded: [LT], present: [], errors: [] });
    expect(await seedFactories(db)).toEqual({ seeded: [], present: [LT], errors: [] });
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
  });

  test("admins read it, at its newest version; nobody else", async () => {
    expect((await call("cit", "GET", "/api/factories")).status).toBe(403);
    expect((await call(null, "GET", `/api/factories/${LT}`)).status).toBe(401);
    const list = await call("ada", "GET", "/api/factories");
    expect(list.data).toEqual([expect.objectContaining({ id: LT, label: "LifeTrac line", number: 1, versions: 1, stations: 42, parts: 135 })]);
    const f = await call("ada", "GET", `/api/factories/${LT}`);
    expect(f.data).toMatchObject({ id: LT, number: 1, version: 1 });
    expect(f.data.json).toEqual(lifetracLine());
    expect((await call("ada", "GET", "/api/factories/nope")).status).toBe(404);
  });

  test("an agent drafts a change step by step, each step checked whole, and proposes it", async () => {
    const names = (await tool("list_factories", {}))[0];
    expect(names.id).toBe(LT);
    // a second welding cell, by the station's id
    const one = await tool("factory_edit", { factory: LT, message: "a second welding cell", edits: [{ op: "set", path: ["line", "stations", { id: "weld" }, "servers"], value: 2 }] });
    // (bun's toMatchObject writes an asymmetric matcher's match over the field it matched: the branch checked apart)
    expect(typeof one.branch).toBe("number");
    expect(one).toMatchObject({ changed: true, steps: 1, changes: 1 });
    // a faster laser on one part
    const two = await tool("factory_edit", { factory: LT, branch: one.branch, message: "the floor cut faster", edits: [{ op: "set", path: ["parts", { id: "floor" }, "ops", 0, "s"], value: 10 }] });
    expect(two).toMatchObject({ branch: one.branch, steps: 2, changes: 2 });
    // a step that breaks the line is refused, and kept nowhere
    const bad = await tool("factory_edit", { factory: LT, branch: one.branch, message: "an op at no station", edits: [{ op: "set", path: ["parts", { id: "floor" }, "ops", 0, "at"], value: "nowhere" }] });
    expect(bad.error).toContain("no station of the line");
    expect((await tool("factory_edit", { factory: LT, branch: one.branch, message: "x", edits: [{ op: "set", path: ["parts", { id: "nope" }, "qty"], value: 1 }] })).error).toContain("no item nope");
    const proposed = await tool("propose_factory_version", { factory: LT, branch: one.branch, note: "a second weld cell and a faster floor cut: about 41 a day" });
    expect(proposed).toMatchObject({ factory: LT, number: 2, branch: one.branch, steps: 2, changes: 2 });
    // proposed, the draft takes no more steps
    expect((await tool("factory_edit", { factory: LT, branch: one.branch, message: "late", edits: [{ op: "set", path: ["label"], value: "x" }] })).error).toContain("proposed already");
    // nothing changed is no proposal
    expect((await tool("propose_factory_version", { factory: LT, note: "same", edits: [{ op: "set", path: ["label"], value: "LifeTrac line" }] })).error).toContain("nothing changed");

    // the Proposals page: listed under the factories, reviewed field by field, opened as it would be
    const listed = (await call("ada", "GET", "/api/proposals?status=open")).data.find((p: any) => p.id === proposed.id);
    expect(listed).toMatchObject({ kind: "factory_version", grp: "factories", label: "LifeTrac line", number: 2, via: "mcp" });
    const review = (await call("ada", "GET", `/api/proposals/${proposed.id}`)).data;
    expect(review.baseNumber).toBe(1);
    expect(review.moved).toBe(false);
    expect(review.steps.map((s: any) => s.message)).toEqual(["a second welding cell", "the floor cut faster"]);
    const weld = lifetracLine().line.stations.findIndex((s: any) => s.id === "weld");
    expect(review.changes).toEqual([
      { path: "$.line.stations[id=weld].servers", kind: "added", to: 2 },
      { path: "$.parts[id=floor].ops[0].s", kind: "changed", from: 111.2, to: 10 },
    ]);
    const asIf = (await call("ada", "GET", `/api/factories/${LT}?proposal=${proposed.id}`)).data;
    expect(asIf.json.line.stations[weld].servers).toBe(2);
    expect(asIf.proposal).toMatchObject({ id: proposed.id, status: "open" });
    // the factory itself is as it was until it is accepted
    expect((await call("ada", "GET", `/api/factories/${LT}`)).data.json.line.stations[weld].servers).toBeUndefined();

    // accepted: v2, the merge a step of its history, v1 still readable
    const decided = await call("ada", "POST", `/api/proposals/${proposed.id}/accept`);
    expect(decided.data).toMatchObject({ status: "accepted", number: 2 });
    const now = (await call("ada", "GET", `/api/factories/${LT}`)).data;
    expect(now).toMatchObject({ number: 2, version: 2 });
    expect(now.json.line.stations[weld].servers).toBe(2);
    expect(now.versions.map((v: any) => v.number)).toEqual([1, 2]);
    expect((await call("ada", "GET", `/api/factories/${LT}?v=1`)).data.json).toEqual(lifetracLine());
    const history = (await call("ada", "GET", `/api/factories/${LT}/history`)).data;
    expect(history.steps.map((s: any) => s.message)).toEqual(expect.arrayContaining(["a second welding cell", "the floor cut faster"]));
    expect(history.steps.at(-1).version).toBe(2);
  });

  test("made on an older version: merged where it touches other fields, archived where the same", async () => {
    const a = await tool("propose_factory_version", { factory: LT, note: "more demand", edits: [{ op: "set", path: ["line", "demand", "perDay"], value: 30 }] });
    const b = await tool("propose_factory_version", { factory: LT, note: "a bigger weld buffer", edits: [{ op: "set", path: ["line", "stations", { id: "weld" }, "buffer"], value: 4 }] });
    const c = await tool("propose_factory_version", { factory: LT, note: "even more demand", edits: [{ op: "set", path: ["line", "demand", "perDay"], value: 40 }] });
    expect((await call("ada", "POST", `/api/proposals/${a.id}/accept`)).data).toMatchObject({ status: "accepted", number: 3 });
    expect((await call("ada", "GET", `/api/proposals/${b.id}`)).data.moved).toBe(true);
    expect((await call("ada", "POST", `/api/proposals/${b.id}/accept`)).data).toMatchObject({ status: "accepted", number: 4, merged: true });
    const clash = (await call("ada", "POST", `/api/proposals/${c.id}/accept`)).data;
    expect(clash.status).toBe("archived");
    expect(clash.message).toContain("line.demand.perDay");
    const now = (await call("ada", "GET", `/api/factories/${LT}`)).data.json;
    expect(now.line.demand.perDay).toBe(30);
    expect(now.line.stations.find((s: any) => s.id === "weld").buffer).toBe(4);
  });

  test("an agent archives its own open factory proposal; a citizen sees none of them", async () => {
    const p = await tool("propose_factory_version", { factory: LT, note: "a new label", edits: [{ op: "set", path: ["label"], value: "The LifeTrac line" }] });
    expect((await call("cit", "GET", `/api/proposals/${p.id}`)).status).toBe(404);
    expect((await call("cit", "GET", "/api/proposals")).data.some((x: any) => x.kind === "factory_version")).toBe(false);
    expect(await tool("archive_proposal", { proposal: p.id })).toMatchObject({ status: "archived" });
    const branches = (await call("ada", "GET", `/api/factories/${LT}/history`)).data.drafts;
    expect(branches.find((d: any) => d.proposal === p.id).status).toBe("archived");
  });
});
