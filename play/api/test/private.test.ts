// Personal accounts own things (intent 732d8a38-d929-41a6-b096-8b72accb964d; play/SPEC.md "Owners"): the first slice of
// Ownership (8fc46819). Against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
//
// Two admins, A and B, and a traveler T. What is private to its owner answers to anyone else exactly as what never was:
// 404 with the same words as a hash or a UUID play never kept, and left out of every list.
//
// -t library   c2: a file added to A's personal library (add_story_frame, library "personal") is served and listed for A
//              alone: /api/files/<hash>, get_file, /api/library, list_library; the coop's library as before
// -t character c3: an asset in group characters proposed private by A is A's alone on every path that hands an asset
//              out (list_assets, get_asset, the catalog, /api/assets…, list_docs, doc_at, doc_history, its files); a
//              sandbox can't pin it; only group characters may be private
// -t board     c4: an intent whose work is a private character is shown to and decided by its owner alone
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { SANDBOX } from "../src/ids";
import { Rate } from "../src/limits";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const SPEC = {
  goal: "A private thing of one person's.",
  nothing_to_reduce: "A test fixture: nothing to reduce.",
  scope: "One asset. Nothing else changes.",
  checks: [{ check: "It holds", how: "test", by: "true", run: "true" }],
};
const SOURCE = (line: string) => `module.exports.recipe = function (id, v, variant) {\n  // ${line}\n  return { meta: { id, v, variant }, build: () => null };\n};\n`;
// a 1×1 PNG, and bytes after its end so that every image here is a file of its own
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const image = () => Buffer.concat([Buffer.from(PNG, "base64"), Buffer.from(randomUUID())]).toString("base64");
const NEVER = "0".repeat(63) + "1";

type Who = { id: string; cookie: string; token: string };

suite("private to its owner", () => {
  let root: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  let A: Who, B: Who, T: Who;
  let n = 0;

  const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = who ? { cookie: who.cookie } : {};
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  /** a read-only route by an admin's token, as an agent's browser reads it */
  const byToken = async (who: Who, path: string) => {
    const r = await api.fetch(new Request(`http://play.test${path}`, { headers: { authorization: `Bearer ${who.token}` } }));
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  /** a tool called over MCP by `who`'s token: its result as JSON, or its error's text */
  const tool = async (who: Who, name: string, args: Record<string, unknown>): Promise<any> => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${who.token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method: "tools/call", params: { name, arguments: args } }),
      }),
    );
    const j = await r.json();
    if (j.error) return { error: j.error.message as string };
    const res = j.result;
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };
  /** an intent of `who`'s in Build, its spec approved by them, its one must check passed: ready to take work */
  const readyIntent = async (who: Who, title: string) => {
    const i = await tool(who, "add_intent", { title });
    await tool(who, "specify_intent", { intent: i.id, ...SPEC });
    expect((await call(who, "POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    expect((await tool(who, "check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] })).stage).toBe("proposal");
    return i.id as string;
  };
  /** a private character of A's, proposed and, where `accept`, accepted by A */
  const character = async (label: string, accept = true) => {
    const intent = await readyIntent(A, label);
    const made = await tool(A, "propose_asset", { group: "characters", label, note: "its first version", source: SOURCE(label), intent, private: true });
    expect(made.error).toBeUndefined();
    if (accept) expect((await call(A, "POST", `/api/intents/${intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 1 });
    return { asset: made.asset as string, intent };
  };
  const human = async (nm: string, level: "admin" | "traveler"): Promise<Who> => {
    const h = await createHuman(db, nm);
    await db.query(`UPDATE play.memberships SET level = $2 WHERE human_id = $1`, [h.id, level]);
    const who = { id: h.id, cookie: `play_session=${tokenFor(h.id)}`, token: "" };
    if (level === "admin") who.token = (await call(who, "POST", "/api/tokens", { name: `${nm}'s agent` })).data.token;
    return who;
  };

  beforeAll(async () => {
    name = `play_private_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    root = new Bun.SQL(URL_!);
    await root.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
    A = await human("ada", "admin");
    B = await human("bo", "admin");
    T = await human("tim", "traveler");
  });
  afterAll(async () => {
    await sql?.close();
    await root?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await root?.close();
  });

  describe("library", () => {
    test("library: a file in A's personal library is served to A alone, and to everyone else as one that never was", async () => {
      const kept = await tool(A, "add_story_frame", { data: image(), media_type: "image/png", label: "Ada's face, front", library: "personal" });
      expect(kept.error).toBeUndefined();
      const h = kept.hash as string;
      // A: the route (session and token) and get_file
      expect((await api.fetch(new Request(`http://play.test/api/files/${h}`, { headers: { cookie: A.cookie } }))).status).toBe(200);
      expect((await api.fetch(new Request(`http://play.test/api/files/${h}`, { headers: { authorization: `Bearer ${A.token}` } }))).status).toBe(200);
      expect((await tool(A, "get_file", { hash: h })).hash).toBe(h);
      // B, T and a visitor's token-less read: exactly as for a hash play never kept
      const never = await call(B, "GET", `/api/files/${NEVER}`);
      expect(never.status).toBe(404);
      for (const who of [B, T]) expect(await call(who, "GET", `/api/files/${h}`)).toEqual(never);
      expect(await byToken(B, `/api/files/${h}`)).toEqual(await byToken(B, `/api/files/${NEVER}`));
      expect(await tool(B, "get_file", { hash: h })).toEqual(await tool(B, "get_file", { hash: NEVER }));
    });

    test("library: A's personal library lists it for A alone; the coop's library and B's never do", async () => {
      const kept = await tool(A, "add_story_frame", { data: image(), media_type: "image/png", label: "Ada's face, side", library: "personal" });
      const h = kept.hash as string;
      const hashes = (page: any) => (page?.files ?? []).map((f: any) => f.hash);
      // A acting as themselves: their personal library, the owner named
      const mine = await call(A, "GET", "/api/library?library=personal");
      expect(mine.status).toBe(200);
      expect(hashes(mine.data)).toContain(h);
      expect(mine.data.owner).toMatchObject({ id: A.id, name: "ada", library: "personal" });
      expect(mine.data.files.find((f: any) => f.hash === h).label).toBe("Ada's face, side");
      expect(hashes(await tool(A, "list_library", { library: "personal" }))).toContain(h);
      expect(hashes((await byToken(A, "/api/library?library=personal")).data)).toContain(h);
      // the coop's library (A's, B's) never lists it; B's personal library is B's own
      for (const who of [A, B]) {
        expect(hashes((await call(who, "GET", "/api/library")).data)).not.toContain(h);
        expect(hashes(await tool(who, "list_library", {}))).not.toContain(h);
        expect(hashes(await tool(who, "list_library", { q: h.slice(0, 12) }))).not.toContain(h);
      }
      expect(hashes((await call(B, "GET", "/api/library?library=personal")).data)).not.toContain(h);
      expect(hashes(await tool(B, "list_library", { library: "personal", q: h.slice(0, 12) }))).not.toContain(h);
      expect((await call(B, "GET", `/api/library?library=personal&q=${h.slice(0, 12)}`)).data.total).toBe(0);
      // a traveler opens no Library (it stays an admin's app for now)
      expect((await call(T, "GET", "/api/library?library=personal")).status).toBe(403);
      // B can't relabel it: as for a file never kept
      expect((await call(B, "POST", `/api/library/${h}/label`, { label: "mine now", library: "personal" })).status).toBe(404);
      expect((await call(B, "POST", `/api/library/${h}/label`, { label: "mine now" })).status).toBe(404);
      // A relabels it in their own library
      expect((await call(A, "POST", `/api/library/${h}/label`, { label: "Ada, side, 2", library: "personal" })).data.label).toBe("Ada, side, 2");
    });

    test("library: the coop's library lists the coop's files for its admins as before", async () => {
      const kept = await tool(A, "add_story_frame", { data: image(), media_type: "image/png", label: "A meadow" });
      const h = kept.hash as string;
      const hashes = (page: any) => (page?.files ?? []).map((f: any) => f.hash);
      for (const who of [A, B]) {
        const page = await call(who, "GET", "/api/library");
        expect(hashes(page.data)).toContain(h);
        expect(page.data.owner).toMatchObject({ library: "coop", name: "Maia City" });
        expect(hashes(await tool(who, "list_library", { library: "coop" }))).toContain(h);
      }
      // not in anyone's personal library, and served to every member as before
      expect(hashes((await call(A, "GET", "/api/library?library=personal")).data)).not.toContain(h);
      expect((await api.fetch(new Request(`http://play.test/api/files/${h}`, { headers: { cookie: T.cookie } }))).status).toBe(200);
    });

    test("library: the same bytes added to the coop's library are the coop's too; added to another's personal library, they stay out of the coop's", async () => {
      const data = image();
      const h = (await tool(A, "add_story_frame", { data, media_type: "image/png", label: "Ada's", library: "personal" })).hash as string;
      // B adds the same bytes to B's own library: B has them, and still nobody else lists them
      expect((await tool(B, "add_story_frame", { data, media_type: "image/png", label: "Bo's", library: "personal" })).hash).toBe(h);
      const hashes = (page: any) => (page?.files ?? []).map((f: any) => f.hash);
      expect(hashes((await call(A, "GET", "/api/library")).data)).not.toContain(h);
      expect((await call(B, "GET", "/api/library?library=personal")).data.files.find((f: any) => f.hash === h).label).toBe("Bo's");
      expect((await call(A, "GET", "/api/library?library=personal")).data.files.find((f: any) => f.hash === h).label).toBe("Ada's");
      expect((await call(T, "GET", `/api/files/${h}`)).status).toBe(404);
      // the coop keeps them too: they are the coop's, for everyone
      await tool(A, "add_story_frame", { data, media_type: "image/png", label: "Shared" });
      expect(hashes((await call(B, "GET", "/api/library")).data)).toContain(h);
      expect((await api.fetch(new Request(`http://play.test/api/files/${h}`, { headers: { cookie: T.cookie } }))).status).toBe(200);
    });

    test("library: a library is personal or coop", async () => {
      expect((await tool(A, "add_story_frame", { data: image(), media_type: "image/png", library: "everyone" })).error).toBeDefined();
      expect((await call(A, "GET", "/api/library?library=everyone")).status).toBe(400);
    });
  });

  describe("character", () => {
    test("character: a private character is A's on every path, and to B and a traveler as one that never was", async () => {
      const { asset } = await character("Ada, as herself");
      const never = randomUUID();
      const ids = (list: any) => (Array.isArray(list) ? list : []).map((a: any) => a.id ?? a.asset);
      // A: every read
      expect(ids(await tool(A, "list_assets", {}))).toContain(asset);
      expect(ids(await tool(A, "list_assets", { group: "characters" }))).toContain(asset);
      const got = await tool(A, "get_asset", { asset });
      expect(got.id).toBe(asset);
      expect(ids((await call(A, "GET", "/api/catalog")).data)).toContain(asset);
      expect(ids((await call(A, "GET", "/api/assets")).data)).toContain(asset);
      expect((await call(A, "GET", `/api/assets/${asset}`)).status).toBe(200);
      expect((await call(A, "GET", `/api/assets/${asset}/1`)).status).toBe(200);
      expect(ids(await tool(A, "list_docs", { kind: "asset" }))).toContain(asset);
      expect((await tool(A, "doc_at", { doc: asset })).id).toBe(asset);
      expect((await tool(A, "doc_history", { doc: asset })).id).toBe(asset);
      const recipe = got.versions[0].recipe as string, source = got.versions[0].source as string;
      expect((await tool(A, "get_file", { hash: recipe })).hash).toBe(recipe);
      expect((await call(A, "GET", `/api/files/${source}`)).status).toBe(200);

      // B and the traveler: left out of every list, and each read answered as for an asset that never was
      for (const who of [B, T]) {
        expect(ids((await call(who, "GET", "/api/catalog")).data)).not.toContain(asset);
        expect(ids((await call(who, "GET", "/api/assets")).data)).not.toContain(asset);
        expect(ids((await call(who, "GET", "/api/assets?group=characters")).data)).not.toContain(asset);
        expect(await call(who, "GET", `/api/assets/${asset}`)).toEqual(await call(who, "GET", `/api/assets/${never}`).then((r) => ({ ...r, data: { error: r.data.error.replace(never, asset) } })));
        expect((await call(who, "GET", `/api/assets/${asset}/1`)).status).toBe(404);
        expect((await call(who, "GET", `/api/files/${recipe}`)).status).toBe(404);
        expect((await call(who, "GET", `/api/files/${source}`)).status).toBe(404);
      }
      expect(ids((await byToken(B, "/api/catalog")).data)).not.toContain(asset);
      expect((await byToken(B, `/api/assets/${asset}`)).status).toBe(404);
      expect(ids(await tool(B, "list_assets", {}))).not.toContain(asset);
      expect(ids(await tool(B, "list_assets", { group: "characters" }))).not.toContain(asset);
      const asNever = async (t: string, args: (id: string) => Record<string, unknown>) =>
        expect((await tool(B, t, args(asset))).error).toBe((await tool(B, t, args(never))).error?.replace(never, asset));
      await asNever("get_asset", (id) => ({ asset: id }));
      await asNever("doc_at", (id) => ({ doc: id }));
      await asNever("doc_history", (id) => ({ doc: id }));
      expect(ids(await tool(B, "list_docs", {}))).not.toContain(asset);
      expect(ids(await tool(B, "list_docs", { kind: "asset" }))).not.toContain(asset);
      expect(await tool(B, "get_file", { hash: recipe })).toEqual(await tool(B, "get_file", { hash: NEVER }));
      // nor may B change it: an edit of it is refused as of a document that never was
      const bi = await readyIntent(B, "Bo edits Ada");
      const e = await tool(B, "doc_edit", { doc: asset, intent: bi, message: "mine", edits: [{ op: "set", path: ["note"], value: "Bo's" }] });
      expect(e.error).toBe((await tool(B, "doc_edit", { doc: never, intent: bi, message: "mine", edits: [{ op: "set", path: ["note"], value: "Bo's" }] })).error?.replace(never, asset));
      const p = await tool(B, "propose_asset", { asset, note: "mine", source: SOURCE("Bo's"), intent: bi });
      expect(p.error).toBeDefined();
      expect(p.error).toBe((await tool(B, "propose_asset", { asset: never, note: "mine", source: SOURCE("Bo's"), intent: bi })).error);
    });

    test("character: a sandbox can't pin a private character", async () => {
      const { asset } = await character("Ada, to be pinned");
      const intent = await readyIntent(A, "Ada in Sandbox 1");
      const e = await tool(A, "doc_edit", { doc: SANDBOX.one, intent, message: "Ada stands in the garden", edits: [{ op: "pin", slot: "ada", asset }] });
      expect(e.error).toMatch(/private/);
    });

    test("character: only group characters may be private", async () => {
      const intent = await readyIntent(A, "A private goat");
      const made = await tool(A, "propose_asset", { group: "actors", label: "A private goat", note: "no", source: SOURCE("a goat"), intent, private: true });
      expect(made.error).toMatch(/characters/);
      // nor may a private character move to another group
      const { asset } = await character("Ada, moving");
      const move = await readyIntent(A, "Ada among the actors");
      const e = await tool(A, "doc_edit", { doc: asset, intent: move, message: "to the actors", edits: [{ op: "set", path: ["card", "card", "group"], value: "actors" }] });
      expect(e.error).toBeUndefined();
      const p = await tool(A, "propose_doc_version", { doc: asset, intent: move, variant: e.variant, note: "Ada to the actors." });
      expect(p.error).toMatch(/characters/);
    });

    test("character: a character not made private is everyone's, as before", async () => {
      const intent = await readyIntent(A, "A settler");
      const made = await tool(A, "propose_asset", { group: "characters", label: "A settler", note: "public", source: SOURCE("a settler"), intent });
      expect((await call(A, "POST", `/api/intents/${intent}/accept`)).data.decision).toMatchObject({ status: "accepted" });
      expect((await call(B, "GET", `/api/assets/${made.asset}`)).status).toBe(200);
      expect((await call(T, "GET", "/api/catalog")).data.map((c: any) => c.asset)).toContain(made.asset);
    });
  });

  describe("board", () => {
    test("board: an intent whose work is a private character is shown to and decided by its owner alone", async () => {
      const { asset, intent } = await character("Ada, for the board", false);
      const ids = (list: any) => (Array.isArray(list) ? list : []).map((i: any) => i.id);
      // A sees it, its work and its review
      expect(ids(await tool(A, "list_intents", { stage: "all" }))).toContain(intent);
      const mine = await tool(A, "get_intent", { intent });
      expect(mine.work.asset_id).toBe(asset);
      expect(mine.review).not.toBeNull();
      expect(ids((await call(A, "GET", "/api/intents")).data)).toContain(intent);
      expect((await call(A, "GET", `/api/intents/${intent}`)).status).toBe(200);
      // B sees nothing of it: not listed, not found, as an intent that never was
      const never = randomUUID();
      expect(ids(await tool(B, "list_intents", { stage: "all" }))).not.toContain(intent);
      expect(ids(await tool(B, "list_intents", {}))).not.toContain(intent);
      expect(ids((await call(B, "GET", "/api/intents")).data)).not.toContain(intent);
      expect(ids((await call(B, "GET", "/api/intents?stage=proposal")).data)).not.toContain(intent);
      expect((await tool(B, "get_intent", { intent })).error).toBe((await tool(B, "get_intent", { intent: never })).error);
      expect(await call(B, "GET", `/api/intents/${intent}`)).toEqual(await call(B, "GET", `/api/intents/${never}`));
      // B may neither accept nor archive it: refused as for an intent that never was, and it waits as it was
      for (const verdict of ["accept", "archive", "reject"]) {
        const r = await call(B, "POST", `/api/intents/${intent}/${verdict}`);
        expect(r).toEqual(await call(B, "POST", `/api/intents/${never}/${verdict}`));
      }
      expect((await tool(B, "archive_intent", { intent })).error).toBe((await tool(B, "archive_intent", { intent: never })).error);
      expect((await tool(A, "get_intent", { intent })).stage).toBe("proposal");
      // A accepts it, and the character stays private
      expect((await call(A, "POST", `/api/intents/${intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 1 });
      expect((await tool(A, "get_intent", { intent })).stage).toBe("accepted");
      expect((await call(B, "GET", `/api/assets/${asset}`)).status).toBe(404);
      expect(ids(await tool(B, "list_intents", { stage: "accepted" }))).not.toContain(intent);
      expect((await call(A, "GET", `/api/assets/${asset}`)).status).toBe(200);
    });

    test("board: the Library's uses never name another's private character", async () => {
      const sheet = (await tool(A, "add_story_frame", { data: image(), media_type: "image/png", label: "A coop sheet" })).hash as string;
      const intent = await readyIntent(A, "Ada, with a coop sheet");
      const made = await tool(A, "propose_asset", { group: "characters", label: "Ada, sheet", note: "v1", source: SOURCE("ada sheet"), intent, private: true, sheet });
      expect(made.error).toBeUndefined();
      const uses = async (who: Who) => ((await call(who, "GET", `/api/library?q=${sheet.slice(0, 16)}`)).data.files.find((f: any) => f.hash === sheet)?.used ?? []).map((u: any) => u.asset);
      expect(await uses(A)).toContain(made.asset);
      expect(await uses(B)).not.toContain(made.asset);
    });
  });
});
