// The Inbox (src/inbox.ts, play/SPEC.md §4.12) against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
// Admins keep it on the Proposals board (add, edit, mark done, archive, bring back); an agent reads it and adds to it
// over MCP, and names the item it works on in what it proposes, the proposal then listed with the item and the item's
// title with the proposal. No tool marks an item done.
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
import { UUID } from "../src/uuid";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";

suite("the Inbox", () => {
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
    for (const n of ["ada", "bea", "cit"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = ANY($1)`, [[who.ada.id, who.bea.id]]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
    token = (await call("ada", "POST", "/api/tokens", { name: "agent" })).data.token;
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
  const rpc = async (method: string, params?: unknown) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }),
      }),
    );
    return (await r.json()).result;
  };
  /** a tool called over MCP by ada's token: its result as JSON, or its error's text */
  const tool = async (name: string, args: Record<string, unknown>) => {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };

  test("only admins keep the Inbox", async () => {
    expect((await call(null, "GET", "/api/inbox")).status).toBe(401);
    expect((await call("cit", "GET", "/api/inbox")).status).toBe(403);
    expect((await call("cit", "POST", "/api/inbox", { title: "A citizen's idea" })).status).toBe(403);
    expect((await call("ada", "GET", "/api/inbox")).data).toEqual([]);
  });

  test("an admin adds an item, edits it, marks it done, brings it back and archives it", async () => {
    expect((await call("ada", "POST", "/api/inbox", { title: "  " })).status).toBe(400);
    expect((await call("ada", "POST", "/api/inbox", { title: "x".repeat(201) })).status).toBe(400);
    expect((await call("ada", "POST", "/api/inbox", { title: "Wrong kind", kind: "chore" })).status).toBe(400);
    const made = await call("ada", "POST", "/api/inbox", { title: "The papaya's leaves  droop too early", note: "From v4 on." });
    expect(made.status).toBe(201);
    const item = made.data;
    expect(item.id).toMatch(UUID);
    expect(item).toMatchObject({ kind: "idea", title: "The papaya's leaves droop too early", note: "From v4 on.", status: "inbox", author: "ada", via: "web", proposals: [] });

    const edited = await call("bea", "PATCH", `/api/inbox/${item.id}`, { kind: "fix" });
    expect(edited.data).toMatchObject({ kind: "fix", title: item.title, note: item.note, edited_by: "bea" });
    expect((await call("bea", "PATCH", `/api/inbox/${item.id}`, { title: "" })).status).toBe(400);
    expect((await call("cit", "PATCH", `/api/inbox/${item.id}`, { kind: "idea" })).status).toBe(403);
    expect((await call("ada", "PATCH", `/api/inbox/not-a-uuid`, { kind: "idea" })).status).toBe(404);
    expect((await call("ada", "GET", `/api/inbox/${crypto.randomUUID()}`)).status).toBe(404);

    expect((await call("ada", "POST", `/api/inbox/${item.id}/accept`)).status).toBe(404);
    expect((await call("ada", "POST", `/api/inbox/${item.id}/reopen`)).status).toBe(409);
    const done = await call("bea", "POST", `/api/inbox/${item.id}/done`);
    expect(done.data).toMatchObject({ status: "done", decided_by: "bea" });
    expect((await call("bea", "POST", `/api/inbox/${item.id}/done`)).status).toBe(409);
    expect((await call("ada", "GET", "/api/inbox?status=inbox")).data).toEqual([]);
    expect((await call("ada", "GET", "/api/inbox?status=done")).data.map((i: any) => i.id)).toEqual([item.id]);
    expect((await call("ada", "GET", "/api/inbox?status=open")).status).toBe(400);
    const back = await call("ada", "POST", `/api/inbox/${item.id}/reopen`);
    expect(back.data).toMatchObject({ status: "inbox", decided_by: null, decided_at: null });
    expect((await call("ada", "POST", `/api/inbox/${item.id}/archive`)).data).toMatchObject({ status: "archived", decided_by: "ada" });
    // edited whatever stage it is at
    expect((await call("ada", "PATCH", `/api/inbox/${item.id}`, { note: "Dropped: v5 fixed it." })).data).toMatchObject({ status: "archived", note: "Dropped: v5 fixed it." });
  });

  test("an agent reads and adds to the Inbox over MCP, names the item in what it proposes, and marks nothing done", async () => {
    const names = (await rpc("tools/list")).tools.map((t: any) => t.name);
    expect(names).toEqual(expect.arrayContaining(["list_inbox", "get_inbox_item", "add_inbox_item"]));
    expect(names.some((x: string) => /done|decide|accept/.test(x))).toBe(false);
    // every propose tool takes the item it is made for
    for (const t of (await rpc("tools/list")).tools.filter((t: any) => t.name.startsWith("propose_"))) expect(t.inputSchema.properties.inbox).toBeTruthy();

    const item = (await call("ada", "POST", "/api/inbox", { kind: "improve", title: "A fern for the shade beds", note: "Sandbox 1's north side." })).data;
    const found = await tool("add_inbox_item", { title: "The hens walk through the fence", kind: "fix", note: "Seen in Sandbox 1 while filming." });
    expect(found).toMatchObject({ kind: "fix", status: "inbox", author: "ada", via: "mcp" });
    expect((await tool("add_inbox_item", { title: "Bad kind", kind: "chore" })).error).toContain("kind");
    expect((await tool("list_inbox", {})).map((i: any) => i.id)).toEqual([found.id, item.id]);
    expect((await tool("list_inbox", { status: "all" })).length).toBe(3);
    expect((await tool("get_inbox_item", { item: "fern" })).error).toContain("UUID");

    // proposed for the item: linked, listed with it, and its title shown with the proposal
    const proposed = await tool("propose_asset", { group: "plants", label: "Shade fern", source: SOURCE, note: "for the shade beds", inbox: item.id });
    expect(proposed.error).toBeUndefined();
    expect(proposed.inbox).toBe(item.id);
    const whole = await tool("get_inbox_item", { item: item.id });
    expect(whole.proposals).toHaveLength(1);
    expect(whole.proposals[0]).toMatchObject({ id: proposed.id, kind: "asset_version", label: "Shade fern", status: "proposed", inbox_id: item.id, inbox_title: item.title });
    expect((await call("ada", "GET", `/api/proposals/${proposed.id}`)).data).toMatchObject({ inbox_id: item.id, inbox_title: item.title });
    expect((await call("ada", "GET", "/api/inbox")).data.find((i: any) => i.id === item.id).proposals).toEqual([{ id: proposed.id, status: "proposed" }]);
    // a citizen sees the proposal, not the Inbox it was made for
    const seen = (await call("cit", "GET", "/api/proposals")).data.find((p: any) => p.id === proposed.id);
    expect(seen).toMatchObject({ inbox_id: null, inbox_title: null });
    expect((await call("cit", "GET", `/api/proposals/${proposed.id}`)).data).toMatchObject({ inbox_id: null, inbox_title: null });

    // a second version for it, on the asset now there
    const next = await tool("propose_version", { asset: proposed.asset, source: SOURCE + "// darker fronds\n", note: "darker", inbox: item.id });
    expect(next.error).toBeUndefined();
    expect((await tool("get_inbox_item", { item: item.id })).proposals.map((p: any) => p.id)).toEqual([next.id, proposed.id]);

    // an item not there, or no longer in the Inbox, takes no proposal, and nothing is proposed
    const before = (await call("ada", "GET", "/api/proposals")).data.length;
    expect((await tool("propose_asset", { group: "plants", label: "Nowhere", source: SOURCE, note: "x", inbox: crypto.randomUUID() })).error).toContain("no such item");
    await call("ada", "POST", `/api/inbox/${found.id}/archive`);
    expect((await tool("propose_asset", { group: "plants", label: "Late", source: SOURCE, note: "x", inbox: found.id })).error).toContain("archived");
    expect((await call("ada", "GET", "/api/proposals")).data.length).toBe(before);
    // and without an item, as before
    const plain = await tool("propose_asset", { group: "plants", label: "Plain", source: SOURCE, note: "no item" });
    expect(plain.error).toBeUndefined();
    expect((await call("ada", "GET", `/api/proposals/${plain.id}`)).data.inbox_id).toBeNull();

    // proposed is the status of what waits for a decision; accepting it leaves the item where it is, for an admin to mark done
    expect((await tool("list_proposals", { status: "proposed" })).map((p: any) => p.id)).toEqual(expect.arrayContaining([proposed.id, next.id, plain.id]));
    expect((await call("ada", "POST", `/api/proposals/${proposed.id}/accept`)).data.status).toBe("accepted");
    expect((await tool("get_inbox_item", { item: item.id })).status).toBe("inbox");
  });
});
