// A document retired by an intent (intent 08566782; ../src/retire.ts, play/SPEC.md §4.15 "Retire"), against a real
// Postgres (TEST_DATABASE_URL, as for ./api.test.ts): an accepted story proposed retired over MCP (retire_doc) or on the
// board's route (POST /api/intents/<id>/retire), with its reason; an admin's Accept takes it off every list (list_stories,
// GET /api/stories, list_docs, the Library's uses), its history kept by its UUID and marked retired, no new version, and
// nothing naming it by hash broken (a story linking its frozen version, its files); Archive leaves it as it was.
// Refused: no reason, a document never accepted, one retired already, an intent not in Build or at Proposal.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { type Db } from "../src/kit/pg";
import { fakeGitHub } from "./fixtures/github";
import { type Api, appOn, type Fresh, freshDb, human, quiet, request, suite, tool as mcpTool } from "./kit";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

suite("retire a document by an intent", () => {
  let f: Fresh, db: Db;
  let api: Api;
  const who: Record<string, { id: string; cookie: string }> = {};
  let token = "";
  let restore = () => {};

  beforeAll(async () => {
    restore = quiet();
    f = await freshDb();
    db = f.db;
    api = appOn(db, { github: fakeGitHub().gh });
    who.ada = await human(db, "ada");
    token = (await call("POST", "/api/tokens", { name: "agent" })).data.token;
  });

  afterAll(async () => {
    restore();
    await f?.drop();
  });

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: who.ada.cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);

  const SPEC = {
    goal: "A stray copy leaves the lists.",
    nothing_to_reduce: "A test fixture: nothing to reduce.",
    scope: "A story.",
    checks: [{ check: "It looks right", how: "look", by: "the board" }],
  };
  /** an intent in Build, approved, its one must not recorded yet */
  const building = async (title: string) => {
    const i = await tool("add_intent", { title, kind: "fix" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    return i.id as string;
  };
  const pass = async (id: string) => (await tool("check_intent", { intent: id, results: [{ check: "c1", pass: true, evidence: "seen" }] })).stage;
  /** a story accepted by an intent of its own, its shot's still a file of play's: its id and that file's hash */
  const film = async (title: string, tracks: unknown[] = []) => {
    const id = await building(`Make ${title}`);
    const f = await tool("add_story_frame", { data: PNG, media_type: "image/png", label: `${title}'s still` });
    const hash: string = f.hash ?? f.out?.hash;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    const body = { format: "9:16", fps: 30, tracks: [{ id: "shots", kind: "shots", clips: [{ id: "s1", at: 0, duration: 3, frame: hash, transition: "cut" }] }, ...tracks] };
    const s = await tool("propose_story", { title, note: "its first cut", intent: id, body });
    expect(s.error).toBeUndefined();
    expect(await pass(id)).toBe("proposal");
    expect((await call("POST", `/api/intents/${id}/accept`)).data.stage).toBe("accepted");
    return { story: s.story as string, hash };
  };
  const listed = async () => ({
    mcp: (await tool("list_stories", {})).map?.((s: any) => s.id) ?? [],
    api: (await call("GET", "/api/stories")).data.map((s: any) => s.id),
    docs: (await tool("list_docs", {})).map((d: any) => d.id),
    storyDocs: (await tool("list_docs", { kind: "story" })).map((d: any) => d.id),
  });
  const usedBy = async (hash: string) => ((await call("GET", "/api/library")).data.files.find((f: any) => f.hash === hash)?.used ?? []).map((u: any) => u.story);
  const retired = async (story: string) => (await db.query<any>(`SELECT retired_at, retired_by FROM play.docs WHERE id = $1`, [`story:${story}`])).rows[0];

  test("proposed: retire_doc and the board's route put the document on the intent's work, shown as a retire; refused without a reason, for a document never accepted, for an intent not built", async () => {
    const a = await film("Proposed: the stray copy");
    const b = await film("Proposed: another stray");
    const id = await building("Retire two stray copies");
    const r = await tool("retire_doc", { intent: id, doc: a.story, reason: "an identical stray copy" });
    expect(r.error).toBeUndefined();
    expect(r.stage).toBe("build");
    const web = await call("POST", `/api/intents/${id}/retire`, { doc: `story:${b.story}`, reason: "another stray copy" });
    expect(web.status).toBe(200);
    const got = await tool("get_intent", { intent: id });
    expect(got.review.docs.map((d: any) => [d.doc.id, d.retires])).toEqual([[a.story, "an identical stray copy"], [b.story, "another stray copy"]]);
    // its document opened on the board: a retire, nothing changed in it
    const one = await call("GET", `/api/intents/${id}/docs/${a.story}`);
    expect(one.status).toBe(200);
    expect([one.data.retires, one.data.changes]).toEqual(["an identical stray copy", []]);
    // to Proposal with its work, as any
    expect(await pass(id)).toBe("proposal");

    // refused: no reason; a document no intent ever accepted; an intent at Idea
    expect((await tool("retire_doc", { intent: id, doc: a.story, reason: " " })).error).toContain("needs its reason");
    const never = await building("A story never accepted");
    const draft = await tool("propose_story", { title: "Never accepted", note: "a cut", intent: never, body: { format: "9:16", fps: 30, tracks: [{ id: "voice", kind: "voice", clips: [{ id: "v1", at: 0, duration: 2, who: "MAIA", line: "One." }] }] } });
    expect(draft.error).toBeUndefined();
    expect((await tool("retire_doc", { intent: id, doc: draft.story, reason: "never on Main" })).error).toContain("no accepted version");
    const idea = (await tool("add_intent", { title: "Only an idea" })).id;
    expect((await tool("retire_doc", { intent: idea, doc: a.story, reason: "too soon" })).error).toContain("stage");
    // nothing retired before the Accept
    expect((await retired(a.story)).retired_at).toBeNull();
    expect((await listed()).api).toContain(a.story);
  });

  test("accepted: the retired story leaves list_stories, GET /api/stories, list_docs and the Library's uses; another stays; retired already is refused", async () => {
    const stray = await film("Accepted: the stray copy");
    const kept = await film("Accepted: the film");
    const before = await listed();
    for (const l of Object.values(before)) expect(l).toEqual(expect.arrayContaining([stray.story, kept.story]));
    expect(await usedBy(stray.hash)).toContain(stray.story);
    const id = await building("Retire the stray copy");
    expect((await tool("retire_doc", { intent: id, doc: stray.story, reason: "an identical stray copy" })).error).toBeUndefined();
    expect(await pass(id)).toBe("proposal");
    const acc = await call("POST", `/api/intents/${id}/accept`);
    expect(acc.data.stage).toBe("accepted");
    expect((await retired(stray.story)).retired_by).toBe(id);
    const after = await listed();
    for (const [k, l] of Object.entries(after)) {
      expect([k, l.includes(stray.story)]).toEqual([k, false]);
      expect([k, l.includes(kept.story)]).toEqual([k, true]);
    }
    expect(await usedBy(stray.hash)).not.toContain(stray.story);
    expect(await usedBy(kept.hash)).toContain(kept.story);
    // retired already: refused
    const again = await building("Retire it again");
    expect((await tool("retire_doc", { intent: again, doc: stray.story, reason: "again" })).error).toContain("retired already");
  });

  test("history: a retired story's history, versions and timeline still read by its UUID, marked retired, no new version made", async () => {
    const stray = await film("History: the stray copy");
    const was = await tool("doc_history", { doc: stray.story });
    const id = await building("Retire it, keep its history");
    await tool("retire_doc", { intent: id, doc: stray.story, reason: "a stray copy" });
    await pass(id);
    expect((await call("POST", `/api/intents/${id}/accept`)).data.stage).toBe("accepted");
    const h = await tool("doc_history", { doc: stray.story });
    expect(h.error).toBeUndefined();
    expect(h.retired).toMatchObject({ intent: id });
    expect(typeof h.retired.at).toBe("string");
    expect(h.edits.length).toBe(was.edits.length);
    expect(h.versions.map((v: any) => v.number)).toEqual(was.versions.map((v: any) => v.number));
    const at = await tool("doc_at", { doc: stray.story });
    expect([at.error, at.number, at.retired?.intent]).toEqual([undefined, 1, id]);
    const s = await tool("get_story", { story: stray.story });
    expect(s.error).toBeUndefined();
    expect(s.title).toBe("History: the stray copy");
    expect((await call("GET", `/api/stories/${stray.story}`)).status).toBe(200);
  });

  test("hashes: a film linking a retired story's frozen version still plays it, and its files are still served by hash", async () => {
    const trailer = await film("Hashes: the trailer");
    const version = (await tool("get_story", { story: trailer.story })).versions[0].id;
    const main = await film("Hashes: the film", [{ id: "trailer", kind: "story", clips: [{ id: "t1", at: 3, story: trailer.story, version }] }]);
    const id = await building("Retire the trailer");
    await tool("retire_doc", { intent: id, doc: trailer.story, reason: "replaced" });
    await pass(id);
    expect((await call("POST", `/api/intents/${id}/accept`)).data.stage).toBe("accepted");
    const s = await tool("get_story", { story: main.story });
    expect(s.error).toBeUndefined();
    expect(s.links[version]).toMatchObject({ id: trailer.story, number: 1, version });
    expect((await tool("get_story", { story: trailer.story, version: 1 })).error).toBeUndefined();
    const file = await api.fetch(new Request(`http://play.test/api/files/${trailer.hash}`, { headers: { cookie: who.ada.cookie } }));
    expect(file.status).toBe(200);
  });

  test("archive: an admin's Archive of a retire leaves the story listed, not retired, its versions as they were", async () => {
    const story = await film("Archive: a story kept");
    const was = await tool("doc_history", { doc: story.story });
    const id = await building("Retire it, then not");
    await tool("retire_doc", { intent: id, doc: story.story, reason: "on second thought, no" });
    await pass(id);
    expect((await call("POST", `/api/intents/${id}/archive`)).data.stage).toBe("archived");
    expect((await retired(story.story)).retired_at).toBeNull();
    expect((await listed()).api).toContain(story.story);
    const h = await tool("doc_history", { doc: story.story });
    expect(h.retired).toBeUndefined();
    expect(h.versions.length).toBe(was.versions.length);
    expect(h.variants.find((v: any) => v.intent?.id === id)?.status).toBe("archived");
  });
});
