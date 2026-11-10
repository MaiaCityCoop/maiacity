// The tests' clock (intent a07e6773; play/SPEC.md §4.12, "Checks run in avenBOX"): every test, in every suite, runs at
// one pinned instant, so none passes today and fails tomorrow. Bun's suites are pinned by ./clock.bun.ts (each
// bunfig.toml's preload), vitest's by play/site/vitest.clock.ts (vite.config.ts's setupFiles); a test that needs
// another time sets it (setSystemTime(new Date(…)), vi.setSystemTime(…)) or hands one in, and starts pinned again.
// What is not pinned: time that passes (performance.now(), timers), Postgres's own now(), and a process a test starts.
// A test compares a time only with times from the same clock.
//
//   bun play/avenbox/clock.ts     # every test file that reaches past the pin, and every suite without it; exits 1 on any
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** the instant every test runs at: far ahead of every real time a test meets (Postgres's, a started process's) */
export const PINNED = Date.UTC(2100, 0, 1, 12);

/** what reaches the real clock past the pin, refused in every test file */
export const REFUSED: { what: RegExp; why: string }[] = [
  { what: /\buseRealTimers\b/, why: "puts the real clock back: set the time the test needs (vi.setSystemTime), each test starts pinned again" },
  { what: /\bsetSystemTime\(\s*\)/, why: "puts the real clock back: set the time the test needs (setSystemTime(new Date(…)))" },
  { what: /\bperformance\.timeOrigin\b|\bTemporal\.Now\b/, why: "a date the pin does not hold: read Date" },
  { what: /\bdatetime\.(now|utcnow|today)\(|\bdate\.today\(|\btime\.time\(/, why: "Python's real clock: hand the time in" },
];

/** the reads of the real clock that stay, each with its reason: { file, what (the line's text holds it), why } */
export const EXCEPTIONS: { file: string; what: string; why: string }[] = [];

/** the check's own test: it holds what is refused, as its samples */
const SAMPLES = "play/api/test/clock.test.ts";

/** a suite's files (by the start of their path, the longest first) and what pins each: [the config, what it must name] */
export const SUITES: { under: string; pins: [file: string, names: string][] }[] = [
  { under: "play/api/", pins: [["play/api/bunfig.toml", "../avenbox/clock.bun.ts"]] },
  { under: "play/site/", pins: [["play/site/bunfig.toml", "../avenbox/clock.bun.ts"], ["play/site/vite.config.ts", "./vitest.clock.ts"]] },
  { under: "", pins: [["bunfig.toml", "./play/avenbox/clock.bun.ts"]] },
];

export const isTest = (path: string) =>
  /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) || /(^|\/)test_[^/]*\.py$/.test(path) || /(^|\/)tests?\/.*\.([cm]?[jt]sx?|py|sh)$/.test(path);

/** every way the files given reach the real clock, or run in a suite nothing pins: one line each; none is the pass */
export function unpinned(files: string[], read: (path: string) => string | null, exceptions = EXCEPTIONS): string[] {
  const said: string[] = [];
  const tests = files.filter(isTest);
  for (const suite of SUITES.filter((s) => tests.some((f) => SUITES.find((x) => f.startsWith(x.under)) === s))) {
    for (const [config, names] of suite.pins) {
      if (!read(config)?.includes(names)) said.push(`${config}: does not name ${names}, so the tests under ${suite.under || "the repository's root"} run at the real clock`);
    }
  }
  for (const file of tests.filter((f) => f !== SAMPLES)) {
    (read(file) ?? "").split("\n").forEach((line, i) => {
      for (const r of REFUSED) {
        if (!r.what.test(line) || exceptions.some((e) => e.file === file && line.includes(e.what))) continue;
        said.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}\n    ${r.why}`);
      }
    });
  }
  for (const e of exceptions) {
    if (!(read(e.file) ?? "").includes(e.what)) said.push(`an exception nothing needs: ${e.file} holds no "${e.what}"`);
    if (!e.why.trim()) said.push(`an exception without its reason: ${e.file} "${e.what}"`);
  }
  return said;
}

/** the repository's own: every tracked file, and those not yet tracked */
export function repository(root: string): string[] {
  const out = Bun.spawnSync(["git", "ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, stdout: "pipe" }).stdout.toString();
  return out.split("\n").filter((f) => f && !f.includes("node_modules/"));
}
export const reader = (root: string) => (path: string) => {
  try {
    return readFileSync(join(root, path), "utf8");
  } catch {
    return null;
  }
};

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../..");
  const said = unpinned(repository(root), reader(root));
  for (const s of said) console.log(s);
  console.log(said.length ? `${said.length} past the tests' pinned clock (play/avenbox/clock.ts)` : `every test runs at the pinned clock (${new Date(PINNED).toISOString()})`);
  process.exit(said.length ? 1 : 0);
}
