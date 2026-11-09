// play's sessions (../src/auth.ts): a session token names its human until it expires, signed so it can't be forged or
// moved to another human; its cookie's flags; and the app reading it (/api/me), and /api/founders counting members.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { COOKIE, humanIdFrom, sessionCookie, tokenFor } from "../src/auth";
import { appOn, freshDb, human, request, suite, type Api, type Fresh } from "./kit";

const DAY = 24 * 60 * 60 * 1000;
const withCookie = (cookie: string) => new Request("http://play.test/api/me", { headers: { cookie } });

suite("sessions", () => {
  let f: Fresh, api: Api;
  let ada: { id: string; cookie: string }, bo: { id: string; cookie: string };
  beforeAll(async () => {
    f = await freshDb();
    api = appOn(f.db);
    ada = await human(f.db, "ada");
    bo = await human(f.db, "bo", "traveler");
  });
  afterAll(() => f?.drop());

  test("a token names its human, among other cookies", () => {
    expect(humanIdFrom(withCookie(`a=1; ${COOKIE}=${tokenFor(ada.id)}; b=2`))).toBe(ada.id);
    expect(humanIdFrom(withCookie("a=1"))).toBeNull();
    expect(humanIdFrom(new Request("http://play.test/"))).toBeNull();
  });

  test("a token lives 30 days, then names nobody", () => {
    expect(humanIdFrom(withCookie(`${COOKIE}=${tokenFor(ada.id, Date.now() - 29 * DAY)}`))).toBe(ada.id);
    expect(humanIdFrom(withCookie(`${COOKIE}=${tokenFor(ada.id, Date.now() - 30 * DAY - 1000)}`))).toBeNull();
  });

  test("a token can't be forged: another human, a later expiry or another signature names nobody", () => {
    const [id, expiry, sig] = tokenFor(ada.id).split(".");
    expect(id).toBe(ada.id);
    const other = tokenFor(bo.id).split(".")[2];
    expect(humanIdFrom(withCookie(`${COOKIE}=${bo.id}.${expiry}.${sig}`))).toBeNull();
    expect(humanIdFrom(withCookie(`${COOKIE}=${id}.${Number(expiry) + DAY}.${sig}`))).toBeNull();
    expect(humanIdFrom(withCookie(`${COOKIE}=${id}.${expiry}.${other}`))).toBeNull();
    expect(humanIdFrom(withCookie(`${COOKIE}=${id}.${expiry}.${sig.slice(0, -2)}`))).toBeNull();
    expect(humanIdFrom(withCookie(`${COOKIE}=${id}.${expiry}`))).toBeNull();
    expect(humanIdFrom(withCookie(`${COOKIE}=`))).toBeNull();
  });

  test("the session cookie: HttpOnly, Lax, the whole site, 30 days, Secure off localhost", () => {
    const keep = process.env.RP_ID;
    try {
      delete process.env.RP_ID;
      expect(sessionCookie("t")).toBe(`${COOKIE}=t; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`);
      process.env.RP_ID = "play.maia.city";
      expect(sessionCookie("t")).toBe(`${COOKIE}=t; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly; Secure`);
    } finally {
      if (keep === undefined) delete process.env.RP_ID;
      else process.env.RP_ID = keep;
    }
  });

  test("the app: signed in with a live token, asked to sign in with an expired or forged one", async () => {
    expect((await request(api, { cookie: ada.cookie }, "GET", "/api/me")).data).toMatchObject({ id: ada.id, name: "ada", level: "admin" });
    const expired = `${COOKIE}=${tokenFor(ada.id, Date.now() - 31 * DAY)}`;
    expect((await request(api, { cookie: expired }, "GET", "/api/me")).status).toBe(401);
    const [, expiry, sig] = tokenFor(ada.id).split(".");
    expect((await request(api, { cookie: `${COOKIE}=${bo.id}.${expiry}.${sig}` }, "GET", "/api/me")).status).toBe(401);
  });

  test("/api/founders: how many are members, public, for maia.city", async () => {
    const r = await request(api, {}, "GET", "/api/founders");
    expect(r.status).toBe(200);
    const n = r.data.count;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe("https://maia.city");
    await human(f.db, "cy", "traveler");
    expect((await request(api, {}, "GET", "/api/founders")).data.count).toBe(n + 1);
  });
});
