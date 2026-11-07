// Artifacts (src/artifacts.ts, play/SPEC.md §4.13) against a real Postgres: set TEST_DATABASE_URL, as for ./api.test.ts.
// Every link Maia City keeps is an artifact, kept over MCP by avenMAIA (the one identity of every agent connected there)
// for the admin whose token was used, marked by where it came from (the operator pasted it, or avenMAIA found it in its
// own research), with a compact title, a two-sentence description, a summary of 500–1,500 words in its sections, and
// its authors (rows of their own, n:m with the artifacts). One link is one artifact. Admins only.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore, type BlobStore } from "../src/blobs";
import { migrate, MIGRATIONS } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { Rate } from "../src/limits";
import { UUID, uuidOf } from "../src/uuid";
import { AVENMAIA, COOP } from "../src/ids";
import { urlOf, wordsOf } from "../src/artifacts";
import { seedSkills } from "../import/skills";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

/** the tools play's MCP server had before the artifacts: every one must still be there */
const TOOLS_BEFORE = [
  "list_assets", "get_asset", "get_file", "propose_asset", "list_docs", "doc_at", "doc_history", "doc_edit", "propose_doc_version",
  "list_sandboxes", "get_sandbox", "list_stories", "get_story", "propose_story",
  "add_story_frame", "add_story_video", "add_document", "add_story_audio",
  "list_intents", "get_intent", "add_intent", "specify_intent", "check_intent", "archive_intent",
];
const ARTIFACT_TOOLS = ["add_artifact", "update_artifact", "list_artifacts", "get_artifact", "list_authors", "get_author"];

/** a summary of exactly `n` words in its three sections (the headings' 7 words counted), its key points as bullets */
function summaryOf(n: number, o: { sections?: string[]; bullets?: boolean; extra?: string } = {}) {
  const heads = o.sections ?? ["What it is", "Key points", "The topic"];
  const headWords = heads.reduce((k, h) => k + h.split(" ").length, 0);
  const left = n - headWords;
  const words = (k: number, w: string) => Array.from({ length: k }, () => w).join(" ");
  // the words shared among the sections, the last taking what is left over
  const share = heads.map((_, i) => (i < heads.length - 1 ? Math.floor(left / heads.length) : left - Math.floor(left / heads.length) * (heads.length - 1)));
  const bullets = (k: number) => {
    const out: string[] = [];
    while (k > 0) {
      const take = Math.min(10, k);
      out.push(`${o.bullets === false ? "" : "- "}${words(take, "point")}`);
      k -= take;
    }
    return out.join("\n");
  };
  const bodies = share.map((k, i) => (i === 1 ? bullets(k) : words(k, ["artifact", "", "topic", "city"][i] || "more")));
  return heads.map((h, i) => `## ${h}\n\n${bodies[i]}`).join("\n\n") + (o.extra ?? "");
}

const ARTIFACT = (over: Record<string, unknown> = {}) => ({
  url: "https://example.com/a",
  title: "A garden that feeds a city",
  description: "How a food forest feeds a city block. It says forests can yield more than fields.",
  summary: summaryOf(600),
  authors: [{ name: "Jane Doe", kind: "person" }],
  kind: "article",
  tags: ["Food forest", "cities"],
  published: "2025-04-01",
  origin: "human",
  ...over,
});

suite("artifacts", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  let store: BlobStore;
  const who: Record<string, { id: string; cookie: string }> = {};
  const tokens: Record<string, string> = {};

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
    await seedSkills(db); // what the MCP teaches is the skills'
    store = folderStore(mkdtempSync(join(tmpdir(), "play-blobs-")));
    api = app({ db, store, rate: new Rate(0) });
    for (const n of ["Samuel", "Bea", "cit", "trav"]) {
      const h = await createHuman(db, n);
      who[n] = { id: h.id, cookie: `play_session=${tokenFor(h.id)}` };
    }
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = ANY($1)`, [[who.Samuel.id, who.Bea.id]]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [who.cit.id]);
    tokens.Samuel = (await call("Samuel", "POST", "/api/tokens", { name: "agent" })).data.token;
    tokens.Bea = (await call("Bea", "POST", "/api/tokens", { name: "agent" })).data.token;
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
  const rpc = async (as: string, method: string, params?: unknown) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${tokens[as]}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }),
      }),
    );
    return (await r.json()).result;
  };
  /** a tool called over MCP by `as`'s token: its result as JSON, or its error's text */
  const tool = async (name: string, args: Record<string, unknown>, as = "Samuel"): Promise<any> => {
    // no work without an intent: an artifact added or corrected with no `intent` key is the work of an intent of its
    // own, made ready for it (`intent: undefined` sends none)
    if ((name === "add_artifact" || name === "update_artifact") && !("intent" in args)) args = { ...args, intent: await readyIntent(`Keep ${args.url ?? args.artifact}`, as) };
    const res = await rpc(as, "tools/call", { name, arguments: args });
    const text = res.content[0].text;
    return res.isError ? { error: text as string } : JSON.parse(text);
  };
  /** an intent in Build with every must check passed, ready to take work */
  const readyIntent = async (title: string, as = "Samuel") => {
    const i = await tool("add_intent", { title }, as);
    await tool("specify_intent", { intent: i.id, goal: "It is kept.", nothing_to_reduce: "A test fixture: nothing to reduce.", scope: "One link.", checks: [{ check: "It holds", how: "test", by: "true", run: "true" }] }, as);
    await call("Samuel", "POST", `/api/intents/${i.id}/approve`);
    await tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] }, as);
    return i.id as string;
  };
  const count = async () => Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM play.artifacts WHERE title IS NOT NULL`)).rows[0].n);
  /** an artifact's change accepted on the board by Samuel, an admin: its intent's work goes in like any other's */
  const accepted = async (r: any, id: unknown) => {
    if (r.error || r.kept) return r;
    const d = (await call("Samuel", "POST", `/api/intents/${r.intent}/accept`)).data;
    if (d?.decision?.status !== "accepted") return { error: `not accepted: ${JSON.stringify(d).slice(0, 300)}` };
    return { ...(await tool("get_artifact", { artifact: id })), kept: false, intent: r.intent };
  };
  /** an artifact added (its first version proposed) and kept (its intent accepted) */
  const keep = async (args: Record<string, unknown>, as = "Samuel") => {
    const r = await tool("add_artifact", args, as);
    return accepted(r, r.id);
  };
  /** an artifact corrected (its next version proposed) and the correction accepted */
  const correct = async (args: Record<string, unknown>, as = "Samuel") => accepted(await tool("update_artifact", args, as), args.artifact);

  // ---- c1: the tables, avenMAIA, the coop

  test("c1: the migration makes play.agents with avenMAIA, play.artifacts, play.authors and play.artifact_authors", async () => {
    expect(AVENMAIA).toBe(uuidOf("agent:avenmaia"));
    const { rows: agents } = await db.query(`SELECT id, coop_id, name FROM play.agents`);
    expect(agents).toEqual([{ id: AVENMAIA, coop_id: COOP, name: "avenMAIA" }]);
    const cols = async (t: string) =>
      (await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'play' AND table_name = $1`, [t])).rows
        .map((r) => r.column_name)
        .sort();
    expect(await cols("agents")).toEqual(["coop_id", "created", "id", "name"]);
    expect(await cols("artifacts")).toEqual(
      ["agent_id", "author_ids", "coop_id", "created", "description", "id", "kind", "operator_id", "origin", "published", "summary", "tags", "text_hash", "title", "token_id", "updated_at", "updated_by", "url"].sort(),
    );
    expect(await cols("authors")).toEqual(["agent_id", "coop_id", "created", "id", "kind", "name", "note", "operator_id", "url"].sort());
    expect(await cols("artifact_authors")).toEqual(["artifact_id", "author_id", "position"]);
  });

  test("c1: every artifact and author is named by a random UUID and is the Maia City coop's", async () => {
    const a = await keep(ARTIFACT({ url: "https://example.org/c1", authors: [{ name: "C One", kind: "person" }] }));
    const b = await keep(ARTIFACT({ url: "https://example.org/c1b", authors: [{ name: "C One", kind: "person" }] }));
    expect(a.id).toMatch(UUID);
    expect(b.id).toMatch(UUID);
    expect(a.id).not.toBe(b.id);
    const { rows } = await db.query(`SELECT coop_id FROM play.artifacts UNION ALL SELECT coop_id FROM play.authors`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r: any) => r.coop_id === COOP)).toBe(true);
    // a v4 UUID: random, not derived from the link
    expect(a.id[14]).toBe("4");
    expect(a.authors[0].id[14]).toBe("4");
  });

  test("c1: it runs on a database already migrated to 0026-intents, with what is in it kept", async () => {
    const other = `${name}_b`;
    await admin.unsafe(`CREATE DATABASE ${other}`);
    const u = new URL(URL_!);
    u.pathname = `/${other}`;
    const sql2 = new Bun.SQL(u.toString());
    const db2 = fromBunSql(sql2);
    try {
      await db2.exec(`CREATE SCHEMA play; CREATE TABLE play.migrations (id TEXT PRIMARY KEY, ran TIMESTAMPTZ NOT NULL DEFAULT now());`);
      for (const m of MIGRATIONS) {
        await db2.transaction(async (tx) => {
          await tx.query(m.sql);
          await tx.query("INSERT INTO play.migrations (id) VALUES ($1)", [m.id]);
        });
        if (m.id === "0026-intents") break;
      }
      const h = await createHuman(db2, "Old");
      await db2.query(`INSERT INTO play.intents (id, coop_id, title, author) VALUES (gen_random_uuid(), $1, 'An intent from before', $2)`, [COOP, h.id]);
      // the migrations after 0026 run, 0027-artifacts first among them (later ones may follow)
      expect((await migrate(db2))[0]).toBe("0027-artifacts");
      expect((await db2.query(`SELECT name FROM play.agents WHERE id = $1`, [AVENMAIA])).rows).toEqual([{ name: "avenMAIA" }]);
      expect((await db2.query(`SELECT title FROM play.intents`)).rows).toEqual([{ title: "An intent from before" }]);
      expect(await migrate(db2)).toEqual([]);
    } finally {
      await sql2.close();
      await admin.unsafe(`DROP DATABASE IF EXISTS ${other} WITH (FORCE)`);
    }
  });

  // ---- c2: the three texts, the authors, the origin, the link, held to their form

  test("c2: the word count counts headings', bullets' and links' words, not their marks or addresses", () => {
    expect(wordsOf("## What it is\n\n- one [two three](https://x.y/z) **four**")).toBe(7);
    expect(wordsOf("1,500 words, e.g. it's well-known")).toBe(5);
    for (const k of [499, 500, 1500, 1501]) expect(wordsOf(summaryOf(k))).toBe(k);
  });

  test("c2: add_artifact keeps an artifact at every bound", async () => {
    const s = await keep(ARTIFACT({
      url: "https://example.org/bounds",
      title: "t".repeat(70),
      description: "d".repeat(279) + ".",
      summary: summaryOf(500),
    }));
    expect(s.error).toBeUndefined();
    expect(s.kept).toBe(false);
    expect(s.title).toHaveLength(70);
    expect(s.description).toHaveLength(280);
    const t = await keep(ARTIFACT({ url: "https://example.org/bounds-top", summary: summaryOf(1500) }));
    expect(t.error).toBeUndefined();
    const f = await keep(ARTIFACT({ url: "https://example.org/four", summary: summaryOf(900, { sections: ["What it is", "Key points", "The topic", "For Maia City"] }) }));
    expect(f.error).toBeUndefined();
  });

  test("c2: add_artifact refuses each text out of its bounds, saying which", async () => {
    const before = await count();
    const refused: [Record<string, unknown>, RegExp][] = [
      [{ title: "t".repeat(71) }, /title.*at most 70 characters/],
      [{ title: "two\nlines" }, /title.*one line/],
      [{ title: "" }, /needs its title/],
      [{ title: undefined }, /needs its title/],
      [{ description: "d".repeat(281) }, /description.*at most 280 characters/],
      [{ description: "One.\nTwo." }, /description.*one line/],
      [{ description: "It says **this** loudly." }, /description is plain text: no Markdown/],
      [{ description: "It is [a link](https://x.y)." }, /no Markdown/],
      [{ description: undefined }, /needs its description/],
      [{ summary: summaryOf(499) }, /summary is 500–1500 words \(this one is 499\)/],
      [{ summary: summaryOf(1501) }, /summary is 500–1500 words \(this one is 1501\)/],
      [{ summary: undefined }, /needs its summary/],
      [{ summary: summaryOf(600, { sections: ["Key points", "What it is", "The topic"] }) }, /sections are ## What it is, ## Key points, ## The topic/],
      [{ summary: summaryOf(600, { sections: ["What it is", "Key points"] }) }, /sections are/],
      [{ summary: summaryOf(600, { sections: ["What it is", "Key points", "The topic", "Further reading"] }) }, /sections are/],
      [{ summary: "Intro first.\n\n" + summaryOf(600) }, /starts with ## What it is/],
      [{ summary: summaryOf(600, { bullets: false }) }, /Key points are bullets/],
      [{ summary: "# Title\n\n" + summaryOf(600) }, /level-2 headings/],
      [{ authors: [] }, /at least one author/],
      [{ authors: undefined }, /at least one author/],
      [{ authors: [{ name: "No Kind" }] }, /kind is person or organization/],
      [{ authors: [{ id: "not-a-uuid" }] }, /named by an author's id/],
      [{ authors: [{ id: "6c0a8f3e-3a37-4a6b-9b5e-2b1a0f0e9d11" }] }, /is not kept/],
      [{ origin: undefined }, /origin is 'human'.*or 'agent'/],
      [{ origin: "operator" }, /origin is 'human'.*or 'agent'/],
      [{ kind: "blog" }, /kind is one of/],
      [{ url: "ftp://example.com/file" }, /http\(s\) link/],
      [{ url: "javascript:alert(1)" }, /http\(s\) link/],
      [{ url: "example.com/no-scheme" }, /whole link/],
      [{ url: "https://user:pw@example.com/x" }, /user or a password/],
      [{ published: "April 2025" }, /YYYY-MM-DD/],
      [{ published: "2025-02-30" }, /YYYY-MM-DD/],
    ];
    for (const [over, why] of refused) {
      const r = await keep(ARTIFACT({ url: `https://example.org/refused/${Math.random()}`, ...over }));
      expect(r.error ?? `kept ${JSON.stringify(over).slice(0, 80)}`).toMatch(why);
    }
    expect(await count()).toBe(before);
  });

  test("c2: update_artifact is held to the same bounds", async () => {
    const s = await keep(ARTIFACT({ url: "https://example.org/update-bounds" }));
    for (const [over, why] of [
      [{ title: "t".repeat(71) }, /at most 70 characters/],
      [{ description: "d".repeat(281) }, /at most 280 characters/],
      [{ summary: summaryOf(499) }, /500–1500 words/],
      [{ summary: summaryOf(1501) }, /500–1500 words/],
      [{ authors: [] }, /at least one author/],
      [{ url: "ftp://example.com" }, /http\(s\)/],
    ] as [Record<string, unknown>, RegExp][]) {
      const r = await correct({ artifact: s.id, ...over });
      expect(r.error ?? "corrected").toMatch(why);
    }
    expect((await tool("get_artifact", { artifact: s.id })).title).toBe(ARTIFACT().title);
  });

  // ---- c3: avenMAIA's, its operator, its origin

  test("c3: every artifact is avenMAIA's, whichever admin's token, and names that admin; shown by its origin", async () => {
    const pasted = await keep(ARTIFACT({ url: "https://example.org/pasted", origin: "human" }), "Samuel");
    const found = await keep(ARTIFACT({ url: "https://example.org/found", origin: "agent" }), "Bea");
    expect(pasted.agent).toEqual({ id: AVENMAIA, name: "avenMAIA" });
    expect(found.agent).toEqual({ id: AVENMAIA, name: "avenMAIA" });
    expect(pasted.operator).toEqual({ id: who.Samuel.id, name: "Samuel" });
    expect(found.operator).toEqual({ id: who.Bea.id, name: "Bea" });
    expect(pasted.origin).toBe("human");
    expect(pasted.by).toBe("Added by Samuel");
    expect(found.origin).toBe("agent");
    expect(found.by).toBe("Sourced by avenMAIA");
    // the same on the page's route
    const page = await call("Samuel", "GET", `/api/artifacts/${pasted.id}`);
    expect(page.status).toBe(200);
    expect(page.data.by).toBe("Added by Samuel");
    expect((await call("Bea", "GET", `/api/artifacts/${found.id}`)).data.by).toBe("Sourced by avenMAIA");
    // and in the database: the agent, the operator and the token it came by
    const row = (await db.query(`SELECT s.agent_id, s.operator_id, s.origin, t.human_id FROM play.artifacts s JOIN play.api_tokens t ON t.id = s.token_id WHERE s.id = $1`, [found.id])).rows[0];
    expect(row).toEqual({ agent_id: AVENMAIA, operator_id: who.Bea.id, origin: "agent", human_id: who.Bea.id });
  });

  test("c3: update_artifact corrects an artifact, keeps who and when, and never changes who brought it", async () => {
    const s = await keep(ARTIFACT({ url: "https://example.org/correct-me", origin: "human" }), "Samuel");
    const kept = await tool("list_authors", { q: "jane doe" });
    const fixed = await correct({
      artifact: s.id,
      title: "A food forest that feeds a city",
      description: "A corrected description, plainly. In two sentences.",
      summary: summaryOf(700),
      kind: "paper",
      tags: ["agroforestry"],
      published: "2024-12-31",
      authors: [{ id: kept[0].id }, { name: "John Roe", kind: "person" }],
    }, "Bea");
    expect(fixed.error).toBeUndefined();
    expect(fixed.title).toBe("A food forest that feeds a city");
    expect(fixed.kind).toBe("paper");
    expect(fixed.tags).toEqual(["agroforestry"]);
    expect(fixed.published).toBe("2024-12-31");
    expect(wordsOf(fixed.summary)).toBe(700);
    expect(fixed.authors.map((a: any) => a.name)).toEqual(["Jane Doe", "John Roe"]);
    expect(fixed.updated_by).toBe("Bea");
    expect(Date.now() - new Date(fixed.updated_at).getTime()).toBeLessThan(60_000);
    expect(fixed.agent.id).toBe(AVENMAIA);
    expect(fixed.operator.id).toBe(who.Samuel.id);
    expect(fixed.origin).toBe("human");
    expect(fixed.by).toBe("Added by Samuel");
    expect((await correct({ artifact: s.id, origin: "agent" } as any)).error).toMatch(/additional|origin/i);
    const row = (await db.query(`SELECT origin, operator_id, agent_id FROM play.artifacts WHERE id = $1`, [s.id])).rows[0];
    expect(row).toEqual({ origin: "human", operator_id: who.Samuel.id, agent_id: AVENMAIA });
  });

  // ---- c4: authors, n:m

  test("c4: authors are rows of their own, n:m with the artifacts, in the order given; one name may be two authors", async () => {
    const s1 = await keep(ARTIFACT({
      url: "https://example.org/three-authors",
      authors: [{ name: "Ada Third", kind: "person" }, { name: "Ben Second", kind: "person", url: "https://ben.example/" }, { name: "Forest Lab", kind: "organization" }],
    }));
    expect(s1.authors.map((a: any) => a.name)).toEqual(["Ada Third", "Ben Second", "Forest Lab"]);
    expect(s1.authors[1].url).toBe("https://ben.example");
    const lab = s1.authors[2];
    expect(lab.kind).toBe("organization");
    const s2 = await keep(ARTIFACT({ url: "https://example.org/lab-again", authors: [{ id: lab.id }, { name: "Cy First", kind: "person" }] }));
    expect(s2.authors.map((a: any) => a.id)[0]).toBe(lab.id);
    const theirs = await tool("get_author", { author: lab.id });
    expect(theirs.name).toBe("Forest Lab");
    expect(theirs.artifacts.map((s: any) => s.id).sort()).toEqual([s1.id, s2.id].sort());
    const page = await call("Samuel", "GET", `/api/authors/${lab.id}`);
    expect(page.status).toBe(200);
    expect(page.data.artifacts).toHaveLength(2);
    // two new authors of one name stay two
    const a = await keep(ARTIFACT({ url: "https://example.org/same-name-1", authors: [{ name: "Sam Same", kind: "person" }] }));
    const b = await keep(ARTIFACT({ url: "https://example.org/same-name-2", authors: [{ name: "Sam Same", kind: "person" }] }));
    expect(a.authors[0].id).not.toBe(b.authors[0].id);
    expect((await db.query(`SELECT count(*)::int AS n FROM play.authors WHERE name = 'Sam Same'`)).rows[0].n).toBe(2);
    const listed = await tool("list_authors", { q: "sam same" });
    expect(listed).toHaveLength(2);
    expect(listed.every((x: any) => x.artifacts === 1)).toBe(true);
    // an author named twice in one artifact is refused
    expect((await keep(ARTIFACT({ url: "https://example.org/twice", authors: [{ id: lab.id }, { id: lab.id }] }))).error).toMatch(/named twice/);
  });

  // ---- c5: one link, one artifact

  test("c5: links are normalised so that one link is one artifact", () => {
    expect(urlOf("https://Example.com/a/?utm_source=x#top")).toBe("https://example.com/a");
    expect(urlOf("HTTPS://EXAMPLE.COM/A/")).toBe("https://example.com/A");
    expect(urlOf("https://example.com/")).toBe("https://example.com");
    expect(urlOf("https://example.com/p?id=3&utm_medium=m&fbclid=f&gclid=g&b=a%20b")).toBe("https://example.com/p?id=3&b=a%20b");
    expect(urlOf("https://youtu.be/dQw4w9WgXcQ?si=abc&t=10")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(urlOf("https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(urlOf("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(urlOf("https://example.com:8080/x")).toBe("https://example.com:8080/x");
  });

  test("c5: adding a link already kept answers with that artifact and writes no second row", async () => {
    const first = await keep(ARTIFACT({ url: "https://example.com/a" }));
    expect(first.kept).toBe(false);
    const before = await count();
    const again = await keep(ARTIFACT({ url: "https://Example.com/a/?utm_source=x#top", title: "Another title" }));
    expect(again.id).toBe(first.id);
    expect(again.kept).toBe(true);
    expect(again.title).toBe(first.title);
    expect(await count()).toBe(before);
    const v = await keep(ARTIFACT({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", kind: "video" }));
    const v2 = await keep(ARTIFACT({ url: "https://youtu.be/dQw4w9WgXcQ", kind: "video" }));
    expect(v2.id).toBe(v.id);
    expect(v2.kept).toBe(true);
    expect(await count()).toBe(before + 1);
    // a correction may not move an artifact onto a link another keeps
    expect((await correct({ artifact: v.id, url: "https://example.com/a/" })).error).toMatch(/kept already/);
  });

  // ---- c7: admins only

  test("c7: the artifacts' routes answer 401 to a visitor, 403 to a traveler and a citizen, 200 to an admin", async () => {
    const s = await keep(ARTIFACT({ url: "https://example.org/routes" }));
    const paths = ["/api/artifacts", `/api/artifacts/${s.id}`, "/api/authors", `/api/authors/${s.authors[0].id}`];
    for (const p of paths) {
      expect((await call(null, "GET", p)).status).toBe(401);
      expect((await call("trav", "GET", p)).status).toBe(403);
      expect((await call("cit", "GET", p)).status).toBe(403);
      expect((await call("Samuel", "GET", p)).status).toBe(200);
    }
    expect((await call("Samuel", "GET", "/api/artifacts/6c0a8f3e-3a37-4a6b-9b5e-2b1a0f0e9d11")).status).toBe(404);
    // nothing on the page writes one
    expect((await call("Samuel", "POST", "/api/artifacts", ARTIFACT({ url: "https://example.org/by-hand" }))).status).toBe(405);
  });

  // ---- c8: the MCP teaches it

  test("c8: tools/list holds the artifacts' tools beside every tool there before", async () => {
    const names = (await rpc("Samuel", "tools/list")).tools.map((t: any) => t.name);
    for (const t of [...TOOLS_BEFORE, ...ARTIFACT_TOOLS]) expect(names).toContain(t);
  });

  test("c8: initialize tells every agent it is avenMAIA, and it and add_artifact teach the origin rule and the three texts' form", async () => {
    const init = await rpc("Samuel", "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    const add = (await rpc("Bea", "tools/list")).tools.find((t: any) => t.name === "add_artifact");
    expect(init.instructions).toMatch(/^You are avenMAIA/);
    expect(init.instructions).toMatch(/every agent connected over MCP is avenMAIA/);
    // who it is is the system prompt's (avenMAIA's skill); add_artifact keeps the rule as its contract
    expect(add.description).toMatch(/kept as avenMAIA's/);
    for (const text of [init.instructions, add.description]) {
      expect(text).toMatch(/your operator pastes.*origin 'human'/);
      expect(text).toMatch(/find and use in your own research.*origin 'agent'/);
      expect(text).toMatch(/Sourced by avenMAIA/);
      expect(text).toMatch(/at most 70 characters/);
      expect(text).toMatch(/1–2 sentences/);
      expect(text).toMatch(/at most 280 characters/);
      expect(text).toMatch(/500–1500 words/);
      expect(text).toMatch(/## What it is.*## Key points.*## The topic/);
      expect(text).toMatch(/list_authors first/);
      expect(text).toMatch(/id \(a UUID\)|by their id/);
    }
    expect(init.serverInfo.title).toMatch(/avenMAIA/);
  });

  // ---- c9: finding them

  test("c9: list_artifacts and GET /api/artifacts answer newest first with the count; q, author, tag, kind and origin find them; offset and limit page them", async () => {
    const mk = (i: number, over: Record<string, unknown>) => keep(ARTIFACT({ url: `https://find.example/${i}`, title: `Find ${i}`, ...over }));
    const made = [
      await mk(1, { title: "Mycorrhizal networks under oaks", kind: "paper", tags: ["fungi"], authors: [{ name: "Fungus Author", kind: "person" }] }),
      await mk(2, { description: "A walk through a moss garden. Mosses hold water.", kind: "video", origin: "agent" }),
      await mk(3, { summary: summaryOf(520).replace("topic topic", "zeppelin topic"), tags: ["airships"] }),
      await mk(4, { url: "https://find.example/rare-path-word", kind: "post" }),
      await mk(5, { authors: [{ name: "Unique Writer", kind: "organization" }], origin: "agent" }),
    ];
    const all = await tool("list_artifacts", { limit: 200 });
    expect(all.total).toBe(await count());
    const order = all.artifacts.map((s: any) => s.created);
    expect([...order].sort().reverse()).toEqual(order);
    expect(all.artifacts[0].id).toBe(made[4].id);
    expect(all.artifacts[0].summary).toBeUndefined();
    const ids = async (args: Record<string, unknown>) => (await tool("list_artifacts", args)).artifacts.map((s: any) => s.id);
    expect(await ids({ q: "mycorrhizal" })).toEqual([made[0].id]); // title
    expect(await ids({ q: "moss garden" })).toEqual([made[1].id]); // description
    expect(await ids({ q: "zeppelin" })).toEqual([made[2].id]); // summary
    expect(await ids({ q: "rare-path-word" })).toEqual([made[3].id]); // link
    expect(await ids({ q: "unique writer" })).toEqual([made[4].id]); // an author's name
    expect(await ids({ author: made[0].authors[0].id })).toEqual([made[0].id]);
    expect(await ids({ tag: "airships" })).toEqual([made[2].id]);
    expect(await ids({ tag: "Fungi" })).toEqual([made[0].id]);
    expect(await ids({ kind: "post", q: "find.example" })).toEqual([made[3].id]);
    expect((await ids({ origin: "agent", q: "find.example" })).sort()).toEqual([made[1].id, made[4].id].sort());
    const page1 = await tool("list_artifacts", { q: "find.example", limit: 2 });
    const page2 = await tool("list_artifacts", { q: "find.example", limit: 2, offset: 2 });
    expect(page1.total).toBe(5);
    expect(page1.artifacts.map((s: any) => s.id)).toEqual([made[4].id, made[3].id]);
    expect(page2.artifacts.map((s: any) => s.id)).toEqual([made[2].id, made[1].id]);
    const route = await call("Samuel", "GET", "/api/artifacts?q=find.example&origin=agent&limit=1&offset=1");
    expect(route.status).toBe(200);
    expect(route.data.total).toBe(2);
    expect(route.data.artifacts.map((s: any) => s.id)).toEqual([made[1].id]);
    expect(route.data.tags.some((t: any) => t.tag === "airships")).toBe(true);
    const n = async (where: string) => Number((await db.query(`SELECT count(*) AS n FROM play.artifacts WHERE title IS NOT NULL ${where}`)).rows[0].n);
    expect(route.data.counts.all).toBe(await n(""));
    expect(route.data.counts.origin.agent).toBe(await n("AND origin = 'agent'"));
    expect(route.data.counts.kind.post).toBe(await n("AND kind = 'post'"));
  });

  // ---- c12: the page as it was

  test("c12: the page's readable text is kept among play's files by its hash, named by get_artifact", async () => {
    const text = "The page as it was fetched.\n\nEvery word of it, kept.";
    const s = await keep(ARTIFACT({ url: "https://example.org/with-text", text }));
    expect(s.text_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(new TextDecoder().decode((await store.get(s.text_hash))!)).toBe(text);
    const row = (await db.query(`SELECT media_type, size FROM play.files WHERE hash = $1`, [s.text_hash])).rows[0];
    expect(row).toEqual({ media_type: "text/plain", size: String(new TextEncoder().encode(text).length) });
    expect((await tool("get_artifact", { artifact: s.id })).text_hash).toBe(s.text_hash);
  });

  // ---- intent 847c5d38's c5: an artifact is a document like any other

  // (without an intent an artifact makes its own, which the first rule accepts: ./rules.test.ts, 'no tap for an artifact')
  test("as a document: added or corrected for an intent, kept only once that intent is accepted; naming an intent, held to its gate", async () => {
    const before = await count();
    const listed = async () => (await tool("list_artifacts", { q: "doc.example", limit: 200 })).artifacts;
    // added for an intent: it is at Proposal with the work and its spec; nothing kept until it is accepted
    const r = await tool("add_artifact", ARTIFACT({ url: "https://doc.example/one", title: "A page as a document" }));
    expect(r).toMatchObject({ kept: false, waiting: true, stage: "proposal" });
    const i = await tool("get_intent", { intent: r.intent });
    expect(i).toMatchObject({ stage: "proposal", work: { kind: "artifact_version", doc: r.id } });
    expect(i.spec).not.toBeNull();
    expect((await tool("get_artifact", { artifact: r.id })).error).toMatch(/No artifact is kept/);
    expect(await listed()).toEqual([]);
    expect(await count()).toBe(before);
    // the same link again answers with the intent that waits with it
    expect(await tool("add_artifact", ARTIFACT({ url: "https://doc.example/one/" }))).toMatchObject({ kept: false, waiting: true, intent: r.intent });
    // decided by the one Accept, as any other intent: then kept, its v1 in its history
    expect((await call("Samuel", "POST", `/api/intents/${r.intent}/accept`)).data).toMatchObject({ stage: "accepted", decision: { status: "accepted", number: 1 } });
    expect((await listed()).map((a: any) => [a.id, a.intent])).toEqual([[r.id, null]]);
    expect((await tool("doc_history", { doc: r.id })).versions.map((v: any) => v.number)).toEqual([1]);

    // corrected for an intent: its next version waits at Proposal; the artifact as it was, its open intent marked, until it is accepted
    const c = await tool("update_artifact", { artifact: r.id, title: "A page, corrected" }, "Bea");
    expect(c).toMatchObject({ waiting: true, stage: "proposal", number: 2, title: "A page as a document" });
    expect((await tool("get_intent", { intent: c.intent })).spec).not.toBeNull();
    expect((await tool("get_artifact", { artifact: r.id })).title).toBe("A page as a document");
    expect((await listed()).map((a: any) => a.intent)).toEqual([c.intent]);
    const review = (await call("Samuel", "GET", `/api/intents/${c.intent}`)).data.review;
    expect(review).toMatchObject({ doc: { id: r.id, kind: "artifact", label: "A page, corrected" }, seedNumber: 1, changes: [{ path: "$.title", kind: "changed", from: "A page as a document", to: "A page, corrected" }] });
    expect((await call("Samuel", "POST", `/api/intents/${c.intent}/accept`)).data.decision).toMatchObject({ status: "accepted", number: 2 });
    expect(await tool("get_artifact", { artifact: r.id })).toMatchObject({ title: "A page, corrected", updated_by: "Bea", intent: null });
    expect((await tool("doc_history", { doc: r.id })).versions.map((v: any) => v.number)).toEqual([1, 2]);
    // archived: the artifact as it was
    const no = await tool("update_artifact", { artifact: r.id, kind: "paper" });
    expect((await call("Samuel", "POST", `/api/intents/${no.intent}/archive`)).data.decision.status).toBe("archived");
    expect((await tool("get_artifact", { artifact: r.id })).kind).toBe(ARTIFACT().kind);

    // naming an intent: held to its gate like every propose tool, its work the intent's
    const idea = await tool("add_intent", { title: "Sources for the papaya" });
    expect((await tool("add_artifact", { ...ARTIFACT({ url: "https://doc.example/two" }), intent: idea.id })).error).toMatch(/idea stage/);
    await tool("specify_intent", { intent: idea.id, goal: "Its sources kept.", nothing_to_reduce: "A test fixture: nothing to reduce.", scope: "Two links.", checks: [{ check: "They are kept", how: "test", by: "true", run: "true" }] });
    await call("Samuel", "POST", `/api/intents/${idea.id}/approve`);
    expect((await tool("add_artifact", { ...ARTIFACT({ url: "https://doc.example/two" }), intent: idea.id })).error).toMatch(/not ready to propose/);
    await tool("check_intent", { intent: idea.id, results: [{ check: "c1", pass: true, evidence: "exit 0" }] });
    const two = await tool("add_artifact", { ...ARTIFACT({ url: "https://doc.example/two" }), intent: idea.id });
    const three = await tool("add_artifact", { ...ARTIFACT({ url: "https://doc.example/three" }), intent: idea.id });
    expect([two.intent, three.intent]).toEqual([idea.id, idea.id]);
    // one intent, two artifacts: reviewed with both, accepted together
    expect((await call("Samuel", "GET", `/api/intents/${idea.id}`)).data.review.docs.map((d: any) => d.doc.id)).toEqual([two.id, three.id]);
    expect((await call("Samuel", "POST", `/api/intents/${idea.id}/accept`)).data.decision).toMatchObject({ status: "accepted", numbers: [1, 1] });
    expect((await listed()).length).toBe(3);
  });
});
