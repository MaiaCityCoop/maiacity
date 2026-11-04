// play's documents in Loro (src/docs, play/SPEC.md §4.4) against a real Postgres: set TEST_DATABASE_URL, as for
// api.test.ts. Every step kept with who, why and when; any step read back exactly; proposals as branches merged on
// accept; versions named with the hash of their content and never changed; code merged with other edits accepted only
// once its merged result was previewed.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHuman } from "../src/auth";
import { canonical } from "../src/hash";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import {
  accept, branch, close, commit, COMPACT_AFTER, contentHash, createDoc, diffBetween, DocError, history, nameVersion,
  previewMerge, propose, readDoc, SchemaError, sizeOf, stateAt, versionsOf, type Author,
} from "../src/docs";
import { EditError } from "../src/docs/core";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const same = (a: unknown, b: unknown) => expect(canonical(a)).toBe(canonical(b));

/** the documents made here, named as every document is: its type and its thing's UUID */
const DOC = "story:5eed7e57-0000-4000-8000-00000000a001";
const PAPAYA = "asset:e46e8e6f-cd69-5c1e-88c8-cea2032bf600";

const STORY = {
  schema: "story/1",
  title: "Test story",
  note: "A first draft.",
  format: "9:16",
  fps: 30,
  duration: 20,
  tracks: [
    { id: "voice", kind: "voice", clips: [
      { id: "a", at: 0, duration: 4, who: "SAMUEL", line: "This is our papaya…" },
      { id: "b", at: 4, duration: 3, who: "MAIA", line: "…almost black." },
      { id: "c", at: 7, duration: 5, who: "MAIA", line: "One line of code, and the green returns." },
    ] },
    { id: "notes", kind: "notes", clips: [{ id: "n1", at: 0, duration: 4, section: "HOOK", mood: "↑", extra: { kept: true } }] },
  ],
};

suite("documents in Loro", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let ada: Author, cit: Author, mcp: Author;

  beforeAll(async () => {
    name = `play_docs_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    const a = await createHuman(db, "ada"), c = await createHuman(db, "cit");
    ada = { human: a.id, via: "site" };
    mcp = { human: a.id, via: "mcp" };
    cit = { human: c.id, via: "site" };
  });
  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  test("a story is created as its first step and named v1 by the hash of its content", async () => {
    const r = await createDoc(db, { id: DOC, schema: "story/1", json: STORY, author: ada, message: "seeded", version: "the storyboard" });
    expect(r.version!.number).toBe(1);
    expect(r.version!.contentHash).toBe(contentHash(STORY));
    const d = await readDoc(db, DOC);
    same(d.json, STORY);
    expect(d.versions.map((v) => v.number)).toEqual([1]);
    await expect(createDoc(db, { id: DOC, schema: "story/1", json: STORY, author: ada })).rejects.toThrow(/there already/);
    await expect(createDoc(db, { id: "asset:x", schema: "story/1", json: STORY, author: ada })).rejects.toThrow(/starts with story:/);
  });

  test("every edit is a step with its author, message and time, and every step reads back exactly", async () => {
    const want: any[] = [clone(STORY)];
    const s1 = await commit(db, DOC, { edits: [{ op: "set", path: ["tracks", 0, "clips", 1, "duration"], value: 3.5 }], message: "retime b", author: mcp });
    let w = clone(want.at(-1)); w.tracks[0].clips[1].duration = 3.5; want.push(w);
    await commit(db, DOC, { edits: [{ op: "text", path: ["tracks", 0, "clips", 1, "line"], index: 1, delete: 0, insert: "very nearly " }], message: "reword b", author: mcp });
    w = clone(want.at(-1)); w.tracks[0].clips[1].line = "…very nearly almost black."; want.push(w);
    await commit(db, DOC, { edits: [{ op: "text", path: ["tracks", 0, "clips", 1, "line"], index: 13, delete: 7, insert: "" }], message: "tidy b", author: mcp });
    w = clone(want.at(-1)); w.tracks[0].clips[1].line = "…very nearly black."; want.push(w);
    await commit(db, DOC, { edits: [{ op: "insert", path: ["tracks", 0, "clips", 3], value: { id: "d", at: 12, duration: 6, who: "MAIA", line: "Ready to ship." } }], message: "add d", author: mcp });
    w = clone(want.at(-1)); w.tracks[0].clips.push({ id: "d", at: 12, duration: 6, who: "MAIA", line: "Ready to ship." }); want.push(w);
    await commit(db, DOC, { edits: [{ op: "move", path: ["tracks", 0, "clips", 3], to: 0 }], message: "d first", author: mcp });
    w = clone(want.at(-1)); w.tracks[0].clips.unshift(w.tracks[0].clips.pop()); want.push(w);
    await commit(db, DOC, { edits: [{ op: "delete", path: ["tracks", 0, "clips", 0] }, { op: "set", path: ["note"], value: "A second draft." }], message: "drop d, new note", author: ada });
    w = clone(want.at(-1)); w.tracks[0].clips.shift(); w.note = "A second draft."; want.push(w);
    expect(s1!.message).toBe("retime b");

    const h = await history(db, DOC);
    expect(h.map((s) => s.message)).toEqual(["seeded", "retime b", "reword b", "tidy b", "add d", "d first", "drop d, new note"]);
    expect(h[1].via).toBe("mcp");
    expect(h.at(-1)!.via).toBe("site");
    for (let i = 0; i < h.length; i++) same(await stateAt(db, DOC, { step: h[i].seq }), want[i]);
    // a whole body sent at once lands as the few edits it differs by
    const target = clone(want.at(-1)); target.tracks[1].clips[0].mood = "↓"; target.title = "Test story, cut 2";
    const s = await commit(db, DOC, { target, message: "a whole body", author: mcp });
    // two small changes: about as big as the explicit two-edit step before it, not a rewrite of the story
    const twoEdits = h.at(-1)!.bytes;
    expect(s!.bytes).toBeLessThan(twoEdits * 2);
    expect(s!.bytes).toBeLessThan(h[0].bytes / 2);
    same((await readDoc(db, DOC)).json, target);
    const changes = await diffBetween(db, DOC, { version: 1 }, { step: s!.seq });
    expect(changes.map((c) => c.path).sort()).toEqual(["$.note", "$.title", "$.tracks[id=notes].clips[id=n1].mood", "$.tracks[id=voice].clips[id=b].duration", "$.tracks[id=voice].clips[id=b].line"]);
    // the same body again changes nothing and is no step
    expect(await commit(db, DOC, { target, message: "nothing", author: mcp })).toBeNull();
  });

  test("a step that breaks the story's rules, or edits nothing that is there, is refused and leaves no trace", async () => {
    const before = (await history(db, DOC)).length;
    await expect(commit(db, DOC, { edits: [{ op: "set", path: ["tracks", 0, "clips", 0, "duration"], value: 99 }], message: "too long", author: mcp })).rejects.toThrow(SchemaError);
    await expect(commit(db, DOC, { edits: [{ op: "set", path: ["format"], value: "3:2" }], message: "odd format", author: mcp })).rejects.toThrow(/must be one of/);
    await expect(commit(db, DOC, { edits: [{ op: "insert", path: ["tracks", 0, "clips", 0], value: { id: "a", at: 0, duration: 1 } }], message: "dup", author: mcp })).rejects.toThrow(/taken twice/);
    await expect(commit(db, DOC, { edits: [{ op: "delete", path: ["tracks", 7] }], message: "nothing there", author: mcp })).rejects.toThrow(EditError);
    await expect(commit(db, DOC, { edits: [{ op: "text", path: ["title"], index: 0, insert: "x" }], message: "not a text", author: mcp })).rejects.toThrow(/not a text/);
    await expect(commit(db, DOC, { edits: [], message: " ", author: mcp })).rejects.toThrow(/message is empty/);
    expect((await history(db, DOC)).length).toBe(before);
  });

  test("a proposal is a branch: its own steps, merged and named the next version on accept", async () => {
    const b = await branch(db, DOC, { author: mcp });
    await commit(db, DOC, { branch: b.id, edits: [{ op: "set", path: ["tracks", 0, "clips", 0, "who"], value: "SAMUEL (VO)" }], message: "who is speaking", author: mcp });
    const s2 = await commit(db, DOC, { branch: b.id, edits: [{ op: "text", path: ["tracks", 0, "clips", 2, "line"], index: 0, delete: 0, insert: "Every colour, converted twice. " }], message: "the cause first", author: mcp });
    expect((await history(db, DOC, { branch: b.id })).map((s) => s.message)).toEqual(["who is speaking", "the cause first"]);
    // the main line hasn't moved
    expect((await readDoc(db, DOC)).json.tracks[0].clips[0].who).toBe("SAMUEL");
    expect((await readDoc(db, DOC, { branch: b.id })).json.tracks[0].clips[0].who).toBe("SAMUEL (VO)");
    await expect(accept(db, DOC, b.id, { author: ada })).rejects.toThrow(/not proposed yet/);
    await propose(db, DOC, b.id, { note: "tighter hook", author: mcp });
    const v = await accept(db, DOC, b.id, { author: ada });
    expect(v.number).toBe(2);
    const now = (await readDoc(db, DOC)).json;
    expect(now.tracks[0].clips[0].who).toBe("SAMUEL (VO)");
    expect(now.tracks[0].clips[2].line).toBe("Every colour, converted twice. One line of code, and the green returns.");
    expect(v.contentHash).toBe(contentHash(now));
    // the branch's steps are now part of the main line's history, and still read back as they were
    const h = await history(db, DOC);
    expect(h.map((s) => s.message)).toContain("the cause first");
    expect(h.at(-1)!.kind).toBe("merge");
    expect((await stateAt(db, DOC, { step: s2!.seq })).tracks[0].clips[2].line).toBe(now.tracks[0].clips[2].line);
    // a decided branch takes no more steps
    await expect(commit(db, DOC, { branch: b.id, edits: [{ op: "set", path: ["title"], value: "late" }], message: "late", author: mcp })).rejects.toThrow(/accepted/);
  });

  test("two proposals on the same base both go in: their edits merge as a CRDT, the result checked", async () => {
    const a = await branch(db, DOC, { author: mcp }), b = await branch(db, DOC, { author: cit });
    expect(a.base).toEqual(b.base);
    await commit(db, DOC, { branch: a.id, edits: [{ op: "set", path: ["tracks", 1, "clips", 0, "section"], value: "INTRO" }], message: "rename the section", author: mcp });
    await commit(db, DOC, { branch: b.id, edits: [{ op: "text", path: ["tracks", 0, "clips", 1, "line"], index: 0, delete: 1, insert: "— " }], message: "a dash", author: cit });
    await propose(db, DOC, a.id, { note: "section", author: mcp });
    await propose(db, DOC, b.id, { note: "dash", author: cit });
    expect((await previewMerge(db, DOC, b.id)).concurrent).toBe(false);
    await accept(db, DOC, a.id, { author: ada });
    const p = await previewMerge(db, DOC, b.id);
    expect(p.concurrent).toBe(true);
    const v = await accept(db, DOC, b.id, { author: ada });
    expect(v.number).toBe(4);
    expect(v.contentHash).toBe(p.contentHash);
    const now = (await readDoc(db, DOC)).json;
    expect(now.tracks[1].clips[0].section).toBe("INTRO");
    expect(now.tracks[0].clips[1].line.startsWith("— ")).toBe(true);
    // two branches never write as the same Loro peer
    const { rows } = await db.query<{ n: string }>(`SELECT count(DISTINCT peer) AS n FROM play.doc_peers WHERE doc_id = '${DOC}' AND branch IS NOT NULL`);
    expect(Number(rows[0].n)).toBeGreaterThanOrEqual(3);
  });

  test("an archived proposal stays on its side line: out of the main history, its steps still readable", async () => {
    const b = await branch(db, DOC, { author: mcp });
    const s = await commit(db, DOC, { branch: b.id, edits: [{ op: "set", path: ["title"], value: "A worse title" }], message: "worse", author: mcp });
    await propose(db, DOC, b.id, { note: "try", author: mcp });
    await close(db, DOC, b.id, { author: ada, status: "archived" });
    expect((await history(db, DOC)).map((x) => x.message)).not.toContain("worse");
    expect((await stateAt(db, DOC, { step: s!.seq })).title).toBe("A worse title");
    expect((await readDoc(db, DOC)).json.title).toBe("Test story, cut 2");
    await expect(accept(db, DOC, b.id, { author: ada })).rejects.toThrow(/archived/);
  });

  test("named versions and steps are never changed, and each version's hash is its content's", async () => {
    await expect(db.query(`UPDATE play.doc_versions SET note = 'x' WHERE doc_id = '${DOC}'`)).rejects.toThrow(/append only/);
    await expect(db.query(`DELETE FROM play.doc_updates WHERE doc_id = '${DOC}'`)).rejects.toThrow(/append only/);
    for (const v of await versionsOf(db, DOC)) expect(contentHash(await stateAt(db, DOC, { version: v.number }))).toBe(v.contentHash);
  });

  test("code (an asset's source) merged with other edits is accepted only once its merged result was previewed", async () => {
    const source = readFileSync(join(import.meta.dir, "../import/legacy/sources/plants/papaya@963cc9dfc684.js"), "utf8");
    await createDoc(db, { id: PAPAYA, schema: "asset/1", json: { schema: "asset/1", label: "Papaya", source, card: { triangles: 1 } }, author: { human: null, via: "import" }, message: "v1 from legacy", version: "v1" });
    const a = await branch(db, PAPAYA, { author: mcp }), b = await branch(db, PAPAYA, { author: cit });
    await commit(db, PAPAYA, { branch: a.id, edits: [{ op: "text", path: ["source"], index: 0, insert: "// a: leaf lobes\n" }], message: "a", author: mcp });
    const tail = source.length;
    await commit(db, PAPAYA, { branch: b.id, edits: [{ op: "text", path: ["source"], index: tail, insert: "\n// b: trunk scars\n" }], message: "b", author: cit });
    await propose(db, PAPAYA, a.id, { note: "lobes", author: mcp });
    await propose(db, PAPAYA, b.id, { note: "scars", author: cit });
    await accept(db, PAPAYA, a.id, { author: ada });
    let err: DocError | null = null;
    try {
      await accept(db, PAPAYA, b.id, { author: ada });
    } catch (e) {
      err = e as DocError;
    }
    expect(err?.extra.needsPreview).toBe(true);
    const p = await previewMerge(db, PAPAYA, b.id);
    expect(err?.extra.mergedHash).toBe(p.contentHash);
    const v = await accept(db, PAPAYA, b.id, { author: ada, mergedHash: p.contentHash });
    const now = (await readDoc(db, PAPAYA)).json.source as string;
    expect(now.startsWith("// a: leaf lobes\n")).toBe(true);
    expect(now.endsWith("\n// b: trunk scars\n")).toBe(true);
    expect(v.number).toBe(3);
  });

  test("a big source with many steps stays small, compacts, and reloads the same", async () => {
    const id = PAPAYA;
    let src = (await readDoc(db, id)).json.source as string;
    const t0 = performance.now();
    for (let i = 0; i < COMPACT_AFTER + 2; i++) {
      const at = Math.floor((src.length * (i + 1)) / (COMPACT_AFTER + 3));
      await commit(db, id, { edits: [{ op: "text", path: ["source"], index: at, insert: `/* step ${i} */` }], message: `step ${i}`, author: mcp });
      src = src.slice(0, at) + `/* step ${i} */` + src.slice(at);
    }
    const ms = performance.now() - t0;
    await nameVersion(db, id, { note: "after the steps", author: ada });
    const { rows } = await db.query<{ snapshot: Uint8Array | null; snapshot_seq: string }>(`SELECT snapshot, snapshot_seq FROM play.docs WHERE id = $1`, [id]);
    expect(rows[0].snapshot).not.toBeNull();
    expect(Number(rows[0].snapshot_seq)).toBeGreaterThan(0);
    expect((await readDoc(db, id)).json.source).toBe(src);
    const size = await sizeOf(db, id);
    // the whole history of ~40 steps of a 100 kB source in far less than 40 copies of it
    expect(size.full).toBeLessThan(src.length * 2);
    expect(ms / (COMPACT_AFTER + 2)).toBeLessThan(1000);
    console.log(`asset:papaya: ${size.steps} steps, source ${(src.length / 1024).toFixed(0)} kB, full snapshot ${(size.full / 1024).toFixed(1)} kB, state alone ${(size.shallow / 1024).toFixed(1)} kB, ${(ms / (COMPACT_AFTER + 2)).toFixed(0)} ms a step`);
  });
});
