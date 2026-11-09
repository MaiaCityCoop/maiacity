// A document withdrawn from an intent's work before it is decided (intent ee0a7455; ../src/withdraw.ts), against a real
// Postgres (TEST_DATABASE_URL, as for ./api.test.ts): two stories on one intent at Proposal, one withdrawn over MCP
// (withdraw_doc) or by an admin on the board's route, both through ../src/held.ts dropDoc; the intent back in Build with
// its results kept, the reason in its history; Accept then keeps only the other. Refused for a decided intent, a
// document not in its work, no reason, and an agent whose admin is an admin no more.
import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/kit/pg";
import { Rate } from "../src/limits";
import * as heldSql from "../src/held";
import { fakeGitHub } from "./fixtures/github";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

suite("withdraw a document from an intent's work", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  let gh: ReturnType<typeof fakeGitHub>;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";
  const keep = { log: console.log, warn: console.warn };

  beforeAll(async () => {
    console.log = () => {};
    console.warn = () => {};
    name = `play_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    gh = fakeGitHub();
    api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0), github: gh.gh });
    const h = await createHuman(db, "ada");
    who.ada = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [h.id]);
    const made = (await call("POST", "/api/tokens", { name: "agent" })).data;
    token = made.token;
    // the GitHub runs' token: a code intent's checks are recorded with it alone
    expect((await call("POST", `/api/tokens/${made.id}/avenbox`, { avenbox: true })).data.avenbox).toBe(true);
  });

  afterAll(async () => {
    Object.assign(console, keep);
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = { cookie: who.ada.cookie };
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    const text = await r.text();
    return { status: r.status, data: text ? JSON.parse(text) : null };
  };
  let n = 0;
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

  const SPEC = {
    goal: "Two people and their film change together.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "Two assets, a story and a skill.",
    checks: [{ check: "It looks right", how: "look", by: "the board beside the sheet" }],
  };
  /** an intent at Proposal, its one must passed, ready to take work */
  const ready = async (title: string) => {
    const i = await tool("add_intent", { title, kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    expect((await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "seen" }] })).stage).toBe("proposal");
    return i.id as string;
  };
  const story = (title: string, intent: string) =>
    tool("propose_story", { title, note: "its first cut", intent, body: { format: "9:16", fps: 30, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 4, who: "MAIA", line: "One." }] }] } });
  const variants = async (intent: string) =>
    (await db.query<{ doc_id: string; variant_id: string; status: string }>(
      `SELECT iv.doc_id, iv.variant_id, v.status FROM play.intent_variants iv JOIN play.doc_variants v ON v.id = iv.variant_id WHERE iv.intent_id = $1 ORDER BY iv.position`,
      [intent],
    )).rows;


  const statusOf = async (variant: string | number) => (await db.query<{ status: string }>(`SELECT status FROM play.doc_variants WHERE id = $1`, [variant])).rows[0]?.status;
  const row = async (id: string) => (await db.query<any>(`SELECT stage, results, steps FROM play.intents WHERE id = $1`, [id])).rows[0];

  test("withdraw over MCP: two stories at Proposal, one withdrawn through dropDoc; back in Build, results kept, reason kept; Accept keeps only the other", async () => {
    const drop = spyOn(heldSql, "dropDoc");
    const id = await ready("Two cuts of one film");
    const stray = await story("The stray first cut", id);
    const film = await story("The film it means", id);
    expect([stray.error, film.error]).toEqual([undefined, undefined]);
    const held = await variants(id);
    expect(held.map((h) => h.doc_id)).toEqual([`story:${stray.story}`, `story:${film.story}`]);
    const before = await row(id);
    expect(before.stage).toBe("proposal");

    const r = await tool("withdraw_doc", { intent: id, doc: stray.story, reason: "an old render, proposed by mistake" });
    expect(r.error).toBeUndefined();
    expect(r.stage).toBe("build");
    expect(drop).toHaveBeenCalledTimes(1);
    drop.mockRestore();
    // the stray's variant closed, kept in the history; the film's as it was
    expect(await statusOf(held[0].variant_id)).toBe("archived");
    const now = await variants(id);
    expect(now.map((h) => h.doc_id)).toEqual([`story:${film.story}`]);
    expect(now[0].variant_id).toBe(held[1].variant_id);
    // its results kept, the reason in its history
    const after = await row(id);
    expect(after.results).toEqual(before.results);
    expect(after.steps.at(-1)).toMatchObject({ from: "proposal", to: "build", via: "mcp", doc: `story:${stray.story}`, reason: "an old render, proposed by mistake", by: "ada" });
    const got = await tool("get_intent", { intent: id });
    expect(got.work).toMatchObject({ docs: 1 });
    expect(got.review.docs.map((d: any) => d.doc.id)).toEqual([film.story]);
    // the stray is in the doc's history still
    expect((await tool("doc_history", { doc: stray.story })).error).toBeUndefined();

    // a document not in its work is refused, saying what it holds
    const not = await tool("withdraw_doc", { intent: id, doc: stray.story, reason: "again" });
    expect(not.error).toContain("has no open or proposed variant");
    expect(not.error).toContain(`story:${film.story}`);
    // no reason, refused
    expect((await tool("withdraw_doc", { intent: id, doc: film.story, reason: "  " })).error).toContain("needs its reason");

    // its checks recorded again: to Proposal, and Accept keeps only the film
    expect((await tool("check_intent", { intent: id, results: [{ check: "c1", pass: true, evidence: "seen again" }] })).stage).toBe("proposal");
    const acc = await call("POST", `/api/intents/${id}/accept`);
    expect(acc.data.stage).toBe("accepted");
    expect((await call("GET", `/api/stories/${film.story}`)).status).toBe(200);
    expect(await statusOf(held[0].variant_id)).toBe("archived");
    expect(await statusOf(held[1].variant_id)).toBe("accepted");

    // a decided intent is refused
    const done = await tool("withdraw_doc", { intent: id, doc: film.story, reason: "too late" });
    expect(done.error).toContain("accepted stage");
  });

  test("withdraw on the board's route: an admin takes one out (by kind:uuid) in Build, it stays in Build; anyone else is refused", async () => {
    // in Build, its must not passed yet: the stories wait on it there
    const i = await tool("add_intent", { title: "Two cuts, withdrawn on the board", kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    const id = i.id as string;
    const a = await story("Board: stray", id);
    const b2 = await story("Board: kept", id);
    expect([a.error, b2.error]).toEqual([undefined, undefined]);
    expect((await variants(id)).length).toBe(2);
    expect((await row(id)).stage).toBe("build");

    // a citizen on the board's route: refused
    const cit = await createHuman(db, `cit${Date.now()}`);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [cit.id]);
    const as = async (cookie: string, path: string, body: unknown) => {
      const r = await api.fetch(new Request(`http://play.test${path}`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) }));
      return { status: r.status, data: await r.json() };
    };
    expect((await as(`play_session=${tokenFor(cit.id)}`, `/api/intents/${id}/withdraw`, { doc: a.story, reason: "not mine" })).status).toBe(403);

    // an admin on the board
    const r = await call("POST", `/api/intents/${id}/withdraw`, { doc: `story:${a.story}`, reason: "proposed by mistake" });
    expect(r.status).toBe(200);
    expect(r.data.stage).toBe("build");
    expect((await variants(id)).map((h) => h.doc_id)).toEqual([`story:${b2.story}`]);
    expect((await row(id)).steps.at(-1)).toMatchObject({ from: "build", to: "build", via: "site", doc: `story:${a.story}` });
    expect((await call("POST", `/api/intents/${id}/withdraw`, { doc: crypto.randomUUID(), reason: "none such" })).status).toBe(409);
  });

  test("withdraw a stale draft: an asset's open variant seeded below its head closed, kept; the next doc_edit seeds from Main and proposes", async () => {
    const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";
    const first = await ready("A fern, its first version");
    const fern = await tool("propose_asset", { lod: { levels: "derived" }, group: "plants", label: "A draft fern", source: SOURCE, note: "v1", intent: first });
    expect(fern.error).toBeUndefined();
    expect((await call("POST", `/api/intents/${first}/accept`)).data.stage).toBe("accepted");
    // in Build, its must not passed: a draft made on v1
    const i = await tool("add_intent", { title: "The fern moves group", kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    const drafts = async () =>
      (await db.query<{ id: string; status: string; seed: string }>(`SELECT id, status, seed::text AS seed FROM play.doc_variants WHERE intent_id = $1 AND doc_id = $2 ORDER BY id`, [i.id, `asset:${fern.asset}`])).rows;
    expect((await tool("doc_edit", { doc: fern.asset, intent: i.id, message: "a draft on v1", edits: [{ op: "set", path: ["source"], value: SOURCE + "// on v1\n" }] })).error).toBeUndefined();
    const [stale] = await drafts();
    expect(stale.status).toBe("open");
    // Main moves on: v2, by another intent
    const other = await ready("The fern, its second version");
    expect((await tool("propose_doc_version", { doc: fern.asset, note: "v2", edits: [{ op: "set", path: ["source"], value: SOURCE + "// v2\n" }], intent: other })).error).toBeUndefined();
    expect((await call("POST", `/api/intents/${other}/accept`)).data.stage).toBe("accepted");
    // the draft withdrawn: closed, kept in the history; the intent still in Build
    const r = await tool("withdraw_doc", { intent: i.id, doc: fern.asset, reason: "its draft was seeded on v1, Main is v2" });
    expect(r.error).toBeUndefined();
    expect(r.stage).toBe("build");
    expect(await statusOf(stale.id)).toBe("archived");
    expect((await row(i.id)).steps.at(-1)).toMatchObject({ from: "build", to: "build", doc: `asset:${fern.asset}` });
    expect((await tool("doc_history", { doc: fern.asset })).variants.some((v: any) => `${v.id}` === stale.id)).toBe(true);
    // the next doc_edit seeds a new variant from Main (v2), and proposes
    expect((await tool("doc_edit", { doc: fern.asset, intent: i.id, message: "again, on v2", edits: [{ op: "set", path: ["label"], value: "A moved fern" }] })).error).toBeUndefined();
    const now = await drafts();
    expect(now.length).toBe(2);
    expect(now[1].status).toBe("open");
    expect(now[1].seed).not.toBe(stale.seed);
    expect((await tool("doc_at", { doc: fern.asset, intent: i.id })).json.source).toContain("// v2");
    const p = await tool("propose_doc_version", { doc: fern.asset, variant: Number(now[1].id), note: "the fern moved, on v2", intent: i.id });
    expect(p.error).toBeUndefined();
    // nothing left to withdraw twice
    await tool("withdraw_doc", { intent: i.id, doc: fern.asset, reason: "the proposal too" });
    expect((await tool("withdraw_doc", { intent: i.id, doc: fern.asset, reason: "again" })).error).toContain("has no open or proposed variant");
  });

  test("withdraw from another admin's agent whose owner is an admin no more: refused, nothing taken out", async () => {
    const id = await ready("Two cuts, a stale token");
    const a = await story("Stale: one", id);
    await story("Stale: two", id);
    const bob = await createHuman(db, `bob${Date.now()}`);
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [bob.id]);
    const r = await api.fetch(new Request("http://play.test/api/tokens", { method: "POST", headers: { cookie: `play_session=${tokenFor(bob.id)}`, "content-type": "application/json" }, body: JSON.stringify({ name: "bob's agent" }) }));
    const bobs = (await r.json()).token;
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [bob.id]);
    const res = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${bobs}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "withdraw_doc", arguments: { intent: id, doc: a.story, reason: "not his" } } }),
      }),
    );
    const out = await res.json();
    expect(out.error ?? out.result?.isError).toBeTruthy();
    expect((await variants(id)).length).toBe(2);
    expect((await row(id)).stage).toBe("proposal");
  });
});
