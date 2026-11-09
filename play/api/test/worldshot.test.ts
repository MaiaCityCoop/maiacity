// A world shot (intent 65d04790; ../src/stories.ts `worldOf`, `checkWorld`; play/SPEC.md §12): a story's shot that plays
// a whole world, an asset of the group `worlds` (§4.11) by its UUID and an accepted version's id, under its camera's
// keyframes, its hour, exposure and lights over the shot. Against a real Postgres (TEST_DATABASE_URL, as ./api.test.ts):
// proposed over MCP with propose_story and set_clip, kept as given (rounded), refused out of shape or for a world play
// doesn't have.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createHuman } from "../src/auth";
import { type Db } from "../src/kit/pg";
import { COOP } from "../src/access";
import { fakeGitHub } from "./fixtures/github";
import { type Api, appOn, cookieFor, type Fresh, freshDb, quiet, request, suite, tool as mcpTool } from "./kit";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const H = (c: string) => c.repeat(64);

suite("a world shot", () => {
  let f: Fresh, db: Db;
  let api: Api;
  let cookie = "", token = "";
  let restore = () => {};
  /** a world, its accepted and its proposed version; a plant and its accepted version */
  const world = randomUUID(), plant = randomUUID();
  const V = { world: H("a"), proposed: H("b"), plant: H("c") };

  beforeAll(async () => {
    restore = quiet();
    f = await freshDb();
    db = f.db;
    api = appOn(db, { github: fakeGitHub().gh });
    const h = await createHuman(db, "ada");
    cookie = cookieFor(h.id);
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [h.id]);
    token = (await call("POST", "/api/tokens", { name: "agent" })).data.token;
    // a world and a plant as play keeps them: their recipes among the files, their versions, one of the world's not accepted
    for (const [hash] of [[H("1")], [H("2")], [H("3")]]) await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, 1, 'text/javascript', $1)`, [hash]);
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $3, 'worlds', 'test-city', 'Test City'), ($2, $3, 'plants', 'test-fern', 'Test fern')`, [world, plant, COOP]);
    await db.query(
      `INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, engine) VALUES ($1, $4, 1, $6, 5), ($2, $4, NULL, $7, 5), ($3, $5, 1, $8, 5)`,
      [V.world, V.proposed, V.plant, world, plant, H("1"), H("2"), H("3")],
    );
  });

  afterAll(async () => {
    restore();
    await f?.drop();
  });

  const call = (method: string, path: string, body?: unknown) => request(api, { cookie: cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, token, name, args);
  const SPEC = { goal: "A world plays in a shot.", nothing_to_reduce: "A test fixture.", scope: "A story.", checks: [{ check: "It plays", how: "look", by: "the player" }] };
  const building = async (title: string) => {
    const i = await tool("add_intent", { title, kind: "improve" });
    await tool("specify_intent", { intent: i.id, ...SPEC });
    expect((await call("POST", `/api/intents/${i.id}/approve`)).data.stage).toBe("build");
    return i.id as string;
  };

  const camera = [
    { at: 0, eye: [0, 1.6, 40], target: [0, 1.2, 0], fov: 50 },
    { at: 6, eye: [0, 1.6, 10.1234567], target: [0, 1.2, -20], fov: 42.5, ease: "linear" },
  ];
  const shot = { asset: world, version: V.world, camera, hour: [[0, 18.5], [6, 19.25]], exposure: 0.5, lights: { sun: [[0, 1], [6, 0.5]], lamps: 2 } };

  test("kept as given (rounded), the still its poster; set_clip changes it; refused out of shape or for a world play doesn't have", async () => {
    const intent = await building("A world in a shot");
    const f = await tool("add_story_frame", { data: PNG, media_type: "image/png", label: "the Old City's still" });
    const frame: string = f.hash;
    const body = (w: unknown) => ({ format: "16:9", fps: 30, tracks: [{ id: "shots", kind: "shots", clips: [{ id: "s1", at: 0, duration: 6, frame, transition: "cut", world: w }] }] });
    const made = await tool("propose_story", { title: "A world shot", note: "its first cut", intent, body: body(shot) });
    expect(made.error).toBeUndefined();
    const story = made.story as string;
    const got = await tool("get_story", { story, intent });
    const clip = got.tracks[0].clips[0];
    expect(clip.frame).toBe(frame);
    expect(clip.world).toEqual({ ...shot, camera: [camera[0], { ...camera[1], eye: [0, 1.6, 10.123457] }] });

    // accepted, then changed by another intent's set_clip: an edit of the story, checked whole like any
    expect((await tool("check_intent", { intent, results: [{ check: "c1", pass: true, evidence: "seen" }] })).stage).toBe("proposal");
    expect((await call("POST", `/api/intents/${intent}/accept`)).data.stage).toBe("accepted");
    const next = await building("Move the world shot to the morning");
    const edit = (w: unknown) => tool("doc_edit", { doc: story, intent: next, edits: [{ op: "set_clip", track: "shots", clip: "s1", fields: { world: w } }], message: "the world shot" });
    const ok = await edit({ ...shot, hour: 6 });
    expect(ok.error).toBeUndefined();
    const at = await tool("doc_at", { doc: story, edit: ok.edit });
    expect(JSON.stringify(at)).toContain('"hour":6');

    // refused: each named for what is wrong
    const no = async (w: unknown, says: string) => expect((await edit(w)).error ?? "").toContain(says);
    await no({ ...shot, asset: "old-city" }, "world's UUID");
    await no({ ...shot, version: "v8" }, "accepted versions");
    await no({ ...shot, sky: "dusk" }, "has no field sky");
    await no({ ...shot, camera: [] }, "camera");
    await no({ ...shot, camera: [camera[1], camera[0]] }, "time order");
    await no({ ...shot, camera: [{ ...camera[0], at: 9 }] }, "a time in the shot");
    await no({ ...shot, hour: 25 }, "hour must be a number from 0 to 24");
    await no({ ...shot, hour: [[3, 18], [1, 19]] }, "time order");
    await no({ ...shot, hour: [[7, 18]] }, "a time in the shot");
    await no({ ...shot, exposure: -7 }, "exposure must be a number from -6 to 6");
    await no({ ...shot, lights: { sun: 9 } }, "lights.sun must be a number from 0 to 8");
    await no({ ...shot, lights: { moon: 1 } }, "no light moon");
    await no({ ...shot, version: V.proposed }, "not accepted");
    await no({ ...shot, version: H("f") }, "has no version");
    await no({ ...shot, asset: plant, version: V.plant }, "not a world");
    // a live asset or a world, not both
    const both = await tool("doc_edit", { doc: story, intent: next, edits: [{ op: "set_clip", track: "shots", clip: "s1", fields: { live: { asset: plant, version: V.plant, camera } } }], message: "both" });
    expect(both.error ?? "").toContain("not both");
  });
});
