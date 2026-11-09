// The intents' board opens fast (intent 2cb70fb8-fbbf-4473-8ac1-b8d3bb078147) against a real Postgres
// (TEST_DATABASE_URL): the open stages always come back whole, no cap across the board; the closed stages (Accepted,
// Archived) come a page at a time, newest first, by `limit` and the cursor `before`; every stage's count beside them.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHuman } from "../src/auth";
import { type Db } from "../src/kit/pg";
import { OPEN, seedBoard } from "./fixtures/board";
import { type Api, appOn, cookieFor, type Fresh, freshDb, request, suite } from "./kit";

suite("board loads", () => {
  let f: Fresh, db: Db;
  let api: Api;
  let cookie = "";
  let citizen = "";

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    api = appOn(db);
    const ada = await createHuman(db, "ada");
    const cit = await createHuman(db, "cit");
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [ada.id]);
    await db.query(`UPDATE play.memberships SET level = 'citizen' WHERE human_id = $1`, [cit.id]);
    cookie = cookieFor(ada.id);
    citizen = cookieFor(cit.id);
    // 40 open (8 at each open stage), the oldest of them older than every decided one; 600 accepted, 40 archived
    await seedBoard(db, ada.id, { idea: 8, specify: 8, build: 8, proposal: 8, ship: 8, accepted: 600, archived: 40 });
  }, 60_000);

  afterAll(async () => {
    await f?.drop();
  });

  const get = (path: string, as = cookie) => request(api, { cookie: as }, "GET", path);

  test("the open stages come back whole, with every stage's count", async () => {
    const r = await get(`/api/intents?stage=${OPEN.join(",")}&counts=1`);
    expect(r.status).toBe(200);
    expect(r.data.intents).toHaveLength(40);
    expect(new Set(r.data.intents.map((i: any) => i.stage))).toEqual(new Set(OPEN));
    expect(r.data.next).toBeNull();
    expect(r.data.counts).toEqual({ idea: 8, specify: 8, build: 8, proposal: 8, ship: 8, accepted: 600, archived: 40 });
    // the old way, every stage at once, has no cap either: 680, not 500
    const all = await get("/api/intents");
    expect(all.data).toHaveLength(680);
    expect(all.data.filter((i: any) => OPEN.includes(i.stage))).toHaveLength(40);
  });

  test("the closed stages page by limit and before, newest first, nothing repeated or skipped", async () => {
    for (const [stage, n] of [["accepted", 600], ["archived", 40]] as const) {
      const seen: any[] = [];
      let before: string | null = null;
      let pages = 0;
      do {
        const r = await get(`/api/intents?stage=${stage}&limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`);
        expect(r.status).toBe(200);
        expect(r.data.intents.length).toBeLessThanOrEqual(50);
        seen.push(...r.data.intents);
        before = r.data.next;
        pages++;
      } while (before);
      expect(pages).toBe(Math.ceil(n / 50));
      expect(seen).toHaveLength(n);
      expect(new Set(seen.map((i) => i.id)).size).toBe(n);
      expect(seen.every((i) => i.stage === stage)).toBe(true);
      // newest first, ties (every tenth shares its time) by id
      const key = (i: any) => [Date.parse(i.decided_at), i.id] as const;
      for (let k = 1; k < seen.length; k++) {
        const [a, ai] = key(seen[k - 1]);
        const [b, bi] = key(seen[k]);
        expect(a > b || (a === b && ai > bi)).toBe(true);
      }
    }
  });

  test("a page asked badly is refused, and only admins read the board", async () => {
    expect((await get("/api/intents?stage=accepted&limit=0")).status).toBe(400);
    expect((await get("/api/intents?stage=accepted&limit=201")).status).toBe(400);
    expect((await get("/api/intents?stage=accepted&limit=5&before=yesterday")).status).toBe(400);
    expect((await get(`/api/intents?stage=${OPEN.join(",")}&counts=1`, citizen)).status).toBe(403);
  });
});
