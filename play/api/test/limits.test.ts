// How often one address may ask play's costly routes (../src/limits.ts): the token bucket, API_RATE, which routes are
// costly, who asks (the last X-Forwarded-For address), and the app's 429 for an address past its rate.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { clientOf, costly, perMinute, Rate } from "../src/limits";
import { appOn, freshDb, suite, type Api, type Fresh } from "./kit";

describe("the rate", () => {
  test("an address asks perMinute times at once, then waits for its tokens to come back", () => {
    const r = new Rate(2);
    const t = 1_000_000;
    expect(r.allows("a", t)).toBe(true);
    expect(r.allows("a", t)).toBe(true);
    expect(r.allows("a", t)).toBe(false);
    expect(r.allows("b", t)).toBe(true);
    // half a minute gives one token back at 2 a minute
    expect(r.allows("a", t + 30_000)).toBe(true);
    expect(r.allows("a", t + 30_000)).toBe(false);
  });

  test("0 limits nobody", () => {
    const r = new Rate(0);
    for (let i = 0; i < 100; i++) expect(r.allows("a", 1)).toBe(true);
  });

  test("past `most` addresses it forgets the one heard from longest ago", () => {
    const r = new Rate(1, 2);
    expect(r.allows("a", 1)).toBe(true);
    expect(r.allows("b", 1)).toBe(true);
    expect(r.allows("c", 1)).toBe(true);
    expect(r.buckets.size).toBe(2);
    // a was forgotten: it asks afresh
    expect(r.allows("a", 1)).toBe(true);
    expect(r.allows("c", 1)).toBe(false);
  });

  test("API_RATE: 30 unless it says otherwise, 0 for no limit, never negative or not a number", () => {
    expect(perMinute(undefined)).toBe(30);
    expect(perMinute("  ")).toBe(30);
    expect(perMinute("0")).toBe(0);
    expect(perMinute("12")).toBe(12);
    expect(() => perMinute("-1")).toThrow(/API_RATE/);
    expect(() => perMinute("lots")).toThrow(/API_RATE/);
  });

  test("the costly routes: the passkey ceremonies, a proposal's upload and MCP", () => {
    const at = (method: string, path: string) => costly(new Request(`http://play.test${path}`, { method }));
    expect(at("POST", "/api/passkey/login/options")).toBe(true);
    expect(at("GET", "/api/passkey/anything")).toBe(true);
    expect(at("OPTIONS", "/api/passkey/login/options")).toBe(false);
    expect(at("POST", "/api/intents")).toBe(true);
    expect(at("GET", "/api/intents")).toBe(false);
    expect(at("POST", "/api/mcp")).toBe(true);
    expect(at("POST", "/api/tokens")).toBe(false);
    expect(at("GET", "/api/catalog")).toBe(false);
  });

  test("who asks: the last address X-Forwarded-For names, else the socket's, else unknown", () => {
    const req = (xff?: string) => new Request("http://play.test/", { headers: xff ? { "x-forwarded-for": xff } : {} });
    expect(clientOf(req("1.1.1.1, 2.2.2.2"))).toBe("2.2.2.2");
    expect(clientOf(req(" 3.3.3.3 "))).toBe("3.3.3.3");
    const server = { requestIP: () => ({ address: "9.9.9.9" }) };
    expect(clientOf(req(), server)).toBe("9.9.9.9");
    expect(clientOf(req("4.4.4.4"), server)).toBe("4.4.4.4");
    expect(clientOf(req())).toBe("unknown");
  });
});

suite("the app's rate", () => {
  let f: Fresh, api: Api;
  beforeAll(async () => {
    f = await freshDb();
    api = appOn(f.db, { rate: new Rate(1) });
  });
  afterAll(() => f?.drop());

  const ask = (method: string, path: string, xff: string) => api.fetch(new Request(`http://play.test${path}`, { method, headers: { "x-forwarded-for": xff } }));

  test("an address past its rate on a costly route gets 429 with Retry-After; another address and other routes don't", async () => {
    expect((await ask("POST", "/api/passkey/login/options", "10.0.0.1, 5.5.5.5")).status).toBe(200);
    const refused = await ask("POST", "/api/passkey/login/options", "10.0.0.2, 5.5.5.5");
    expect(refused.status).toBe(429);
    expect(refused.headers.get("Retry-After")).toBe("60");
    expect((await refused.json()).error).toMatch(/Too many requests/);
    // the address is the last the proxy names, not the first
    expect((await ask("POST", "/api/passkey/login/options", "5.5.5.5, 6.6.6.6")).status).toBe(200);
    // a route that isn't costly is never counted
    for (let i = 0; i < 3; i++) expect((await ask("GET", "/api/health", "5.5.5.5")).status).toBe(200);
  });
});
