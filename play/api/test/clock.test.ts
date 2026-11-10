// No test reads the real clock (intent a07e6773; play/avenbox/clock.ts): every suite runs at one pinned instant, and
// nothing in a test file reaches past it. b3f83e0b's limit test fixed a time and held it against the real clock: green
// on its pull request before 10:00, red on main after. At a pinned clock it decides the same on any day.
import { expect, setSystemTime, test } from "bun:test";
import { resolve } from "node:path";
import { EXCEPTIONS, isTest, PINNED, reader, repository, unpinned } from "../../avenbox/clock";

const ROOT = resolve(import.meta.dir, "../../..");

test("this suite runs at the pinned instant, and Date stands still", async () => {
  expect(Date.now()).toBe(PINNED);
  await Bun.sleep(5);
  expect(new Date().toISOString()).toBe("2100-01-01T12:00:00.000Z");
  // a test that needs another time sets it …
  setSystemTime(new Date("2026-11-10T09:20:00Z"));
  expect(Date.now()).toBe(Date.parse("2026-11-10T09:20:00Z"));
});
test("… and the next test starts pinned again", () => {
  expect(Date.now()).toBe(PINNED);
});

test("no test file in the repository reaches past the pin, and every suite is pinned", () => {
  const files = repository(ROOT);
  expect(files.filter(isTest).length).toBeGreaterThan(150);
  expect(unpinned(files, reader(ROOT))).toEqual([]);
  for (const e of EXCEPTIONS) expect(e.why.length).toBeGreaterThan(20);
});

test("what the check refuses: the real clock put back, a date the pin does not hold, a suite nothing pins", () => {
  const pinned: Record<string, string> = {
    "play/api/bunfig.toml": `preload = ["../avenbox/clock.bun.ts"]`,
    "play/site/bunfig.toml": `preload = ["../avenbox/clock.bun.ts"]`,
    "play/site/vite.config.ts": `setupFiles: ['./vitest.clock.ts']`,
    "bunfig.toml": `preload = ["./play/avenbox/clock.bun.ts"]`,
  };
  const said = (files: Record<string, string>, exceptions: typeof EXCEPTIONS = [], configs = pinned) =>
    unpinned(Object.keys(files), (p) => files[p] ?? configs[p] ?? null, exceptions);
  // what a test may do: read the pinned Date, set a time, measure time that passes
  expect(said({ "play/api/test/a.test.ts": "const t0 = Date.now(); setSystemTime(new Date(0)); vi.setSystemTime(5); performance.now(); new Date();" })).toEqual([]);
  // the real clock put back, in each runner
  expect(said({ "play/site/src/a.test.ts": "x\nafterEach(() => vi.useRealTimers());" })[0]).toStartWith("play/site/src/a.test.ts:2: afterEach(() => vi.useRealTimers());");
  expect(said({ "play/api/test/a.test.ts": "setSystemTime();" }).length).toBe(1);
  expect(said({ "tools/sheet/sheet.test.ts": "const now = performance.timeOrigin + performance.now();" }).length).toBe(1);
  expect(said({ "deploy/test_publish_site.py": "stamp = datetime.now()" }).length).toBe(1);
  // a test's helpers count, what is no test does not
  expect(said({ "play/api/test/fixtures/github.ts": "jest.useRealTimers()" }).length).toBe(1);
  expect(said({ "play/api/src/watcher.ts": "useRealTimers" })).toEqual([]);
  // a suite whose config no longer names the pin: each of its runners named
  expect(said({ "play/api/test/a.test.ts": "" }, [], { ...pinned, "play/api/bunfig.toml": "" })).toEqual([
    "play/api/bunfig.toml: does not name ../avenbox/clock.bun.ts, so the tests under play/api/ run at the real clock",
  ]);
  expect(said({ "play/site/src/a.test.ts": "", "tools/x.test.ts": "" }, [], {}).map((s) => s.split(":")[0])).toEqual(["play/site/bunfig.toml", "play/site/vite.config.ts", "bunfig.toml"]);
  // an exception: by its file and text, with its reason; one nothing needs, or without a reason, is refused itself
  const file = { "play/api/test/a.test.ts": "setSystemTime(); // the real clock, once" };
  expect(said(file, [{ file: "play/api/test/a.test.ts", what: "setSystemTime();", why: "the one test of the pin itself reads the real clock to tell them apart" }])).toEqual([]);
  expect(said(file, [{ file: "play/api/test/a.test.ts", what: "setSystemTime();", why: " " }])).toEqual([`an exception without its reason: play/api/test/a.test.ts "setSystemTime();"`]);
  expect(said({ "play/api/test/a.test.ts": "" }, [{ file: "play/api/test/a.test.ts", what: "useRealTimers", why: "it once did, and no longer does" }])).toEqual([
    `an exception nothing needs: play/api/test/a.test.ts holds no "useRealTimers"`,
  ]);
});
