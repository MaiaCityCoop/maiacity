// The Inbox and Specify (src/inbox.ts, play/SPEC.md §4.12) against a real Postgres: set TEST_DATABASE_URL, as for
// ./api.test.ts. Items come in and are specified over MCP only (nothing on the web adds or edits one); a proposal names
// an item only once it is specified, and is then listed with it, the item's title with the proposal. Admins decide on
// the board: archive, done (once specified), back. No tool marks an item done.
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

  test("only admins read the Inbox, and no one adds to it or edits it on the web", async () => {
    expect((await call(null, "GET", "/api/inbox")).status).toBe(401);
    expect((await call("cit", "GET", "/api/inbox")).status).toBe(403);
    expect((await call("ada", "GET", "/api/inbox")).data).toEqual([]);
    // inboxing is over MCP only: the web has no way to add an item or edit one
    expect((await call("ada", "POST", "/api/inbox", { title: "By hand" })).status).toBe(405);
    const item = await tool("add_inbox_item", { title: "Something", note: "x" });
    expect((await call("ada", "PATCH", `/api/inbox/${item.id}`, { title: "Edited by hand" })).status).toBe(405);
    expect((await call("ada", "GET", `/api/inbox/${item.id}`)).data.title).toBe("Something");
    expect((await call("ada", "POST", `/api/inbox/${item.id}/archive`)).data.status).toBe("archived");
  });

  test("an item comes in over MCP, is specified, proposed for, and decided on the board", async () => {
    const names = (await rpc("tools/list")).tools.map((t: any) => t.name);
    expect(names).toEqual(expect.arrayContaining(["list_inbox", "get_inbox_item", "add_inbox_item", "specify_inbox_item"]));
    expect(names.some((x: string) => /done|decide|accept/.test(x))).toBe(false);
    // every propose tool takes the item it is made for
    for (const t of (await rpc("tools/list")).tools.filter((t: any) => t.name.startsWith("propose_"))) expect(t.inputSchema.properties.inbox).toBeTruthy();

    expect((await tool("add_inbox_item", { title: "  " })).error).toContain("title");
    expect((await tool("add_inbox_item", { title: "x".repeat(201) })).error).toContain("200");
    expect((await tool("add_inbox_item", { title: "Bad kind", kind: "chore" })).error).toContain("kind");
    const item = await tool("add_inbox_item", { kind: "improve", title: "A fern for the  shade beds", note: "Sandbox 1's north side." });
    expect(item.id).toMatch(UUID);
    expect(item).toMatchObject({ kind: "improve", title: "A fern for the shade beds", status: "inbox", author: "ada", via: "mcp", definition: null, metric: null, proposals: [] });
    const hens = await tool("add_inbox_item", { title: "The hens walk through the fence", kind: "fix" });
    expect((await tool("list_inbox", {})).map((i: any) => i.id)).toEqual([hens.id, item.id]);
    expect((await tool("get_inbox_item", { item: "fern" })).error).toContain("UUID");

    // not specified: it takes no proposal, and nothing is proposed
    const before = (await call("ada", "GET", "/api/proposals")).data.length;
    expect((await tool("propose_asset", { group: "plants", label: "Too soon", source: SOURCE, note: "x", inbox: item.id })).error).toContain("no spec yet");
    expect((await tool("propose_asset", { group: "plants", label: "Nowhere", source: SOURCE, note: "x", inbox: crypto.randomUUID() })).error).toContain("no such item");
    expect((await call("ada", "GET", "/api/proposals")).data.length).toBe(before);
    // nor is it done before it is specified
    expect((await call("ada", "POST", `/api/inbox/${item.id}/done`)).status).toBe(409);

    // specified: its definition and its metric of what is good, both needed; it moves to Specify
    expect((await tool("specify_inbox_item", { item: item.id, definition: "A fern", metric: " " })).error).toContain("metric");
    const spec = { definition: "A shade fern for the north beds: fronds 40–60 cm, evergreen.", metric: "- Frond length within 40–60 cm\n- Matches the reference sheet's silhouette" };
    const specified = await tool("specify_inbox_item", { item: item.id, ...spec, title: "A shade fern for the north beds" });
    expect(specified).toMatchObject({ status: "specify", ...spec, title: "A shade fern for the north beds", kind: "improve", note: "Sandbox 1's north side.", specified_by: "ada" });
    expect((await tool("list_inbox", { status: "specify" })).map((i: any) => i.id)).toEqual([item.id]);

    // proposed for it: linked, listed with it, and its title shown with the proposal
    const proposed = await tool("propose_asset", { group: "plants", label: "Shade fern", source: SOURCE, note: "meets the metric", inbox: item.id });
    expect(proposed.error).toBeUndefined();
    expect(proposed.inbox).toBe(item.id);
    const whole = await tool("get_inbox_item", { item: item.id });
    expect(whole.proposals).toHaveLength(1);
    expect(whole.proposals[0]).toMatchObject({ id: proposed.id, kind: "asset_version", label: "Shade fern", status: "proposed", inbox_id: item.id, inbox_title: specified.title });
    expect((await call("ada", "GET", `/api/proposals/${proposed.id}`)).data).toMatchObject({ inbox_id: item.id, inbox_title: specified.title });
    expect((await call("ada", "GET", "/api/inbox")).data.find((i: any) => i.id === item.id).proposals).toEqual([{ id: proposed.id, status: "proposed" }]);
    // a citizen sees the proposal, not the Inbox it was made for
    expect((await call("cit", "GET", "/api/proposals")).data.find((p: any) => p.id === proposed.id)).toMatchObject({ inbox_id: null, inbox_title: null });
    expect((await call("cit", "GET", `/api/proposals/${proposed.id}`)).data).toMatchObject({ inbox_id: null, inbox_title: null });
    // a second version for it, on the asset now there; and one with no item, as before
    const next = await tool("propose_version", { asset: proposed.asset, source: SOURCE + "// darker fronds\n", note: "darker", inbox: item.id });
    expect(next.error).toBeUndefined();
    expect((await tool("get_inbox_item", { item: item.id })).proposals.map((p: any) => p.id)).toEqual([next.id, proposed.id]);
    const plain = await tool("propose_asset", { group: "plants", label: "Plain", source: SOURCE, note: "no item" });
    expect((await call("ada", "GET", `/api/proposals/${plain.id}`)).data.inbox_id).toBeNull();

    // accepting a proposal leaves the item where it is: an admin marks it done, and it takes no more proposals
    expect((await tool("list_proposals", { status: "proposed" })).map((p: any) => p.id)).toEqual(expect.arrayContaining([proposed.id, next.id, plain.id]));
    expect((await call("ada", "POST", `/api/proposals/${proposed.id}/accept`)).data.status).toBe("accepted");
    expect((await tool("get_inbox_item", { item: item.id })).status).toBe("specify");
    expect((await call("cit", "POST", `/api/inbox/${item.id}/done`)).status).toBe(403);
    expect((await call("ada", "POST", `/api/inbox/${item.id}/accept`)).status).toBe(404);
    expect((await call("bea", "POST", `/api/inbox/${item.id}/done`)).data).toMatchObject({ status: "done", decided_by: "bea" });
    expect((await call("bea", "POST", `/api/inbox/${item.id}/done`)).status).toBe(409);
    expect((await tool("propose_asset", { group: "plants", label: "Late", source: SOURCE, note: "x", inbox: item.id })).error).toContain("done");
    expect((await tool("specify_inbox_item", { item: item.id, ...spec })).error).toContain("brings it back");
    expect((await tool("list_inbox", {})).map((i: any) => i.id)).toEqual([hens.id]);
    expect((await tool("list_inbox", { status: "done" })).map((i: any) => i.id)).toEqual([item.id]);
    expect((await call("ada", "GET", "/api/inbox?status=done,archived")).data.length).toBe(2);
    expect((await call("ada", "GET", "/api/inbox?status=open")).status).toBe(400);

    // brought back: to Specify, as it has its spec; one with none, to the Inbox
    expect((await call("ada", "POST", `/api/inbox/${item.id}/reopen`)).data).toMatchObject({ status: "specify", decided_by: null, decided_at: null });
    expect((await call("ada", "POST", `/api/inbox/${item.id}/reopen`)).status).toBe(409);
    await call("ada", "POST", `/api/inbox/${hens.id}/archive`);
    expect((await call("ada", "POST", `/api/inbox/${hens.id}/reopen`)).data.status).toBe("inbox");
  });
});
