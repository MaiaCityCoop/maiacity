// A blind count is no bound (play/avenbox/vs-main.ts; intent 009e04d3): since the renderer switch the census counted 1
// triangle and 1 draw a view, the final screen quad, and "main 1 → head 1" passed on nothing. A census comparison where
// either side counts at most 1 draw in a view fails, naming the view and the side: as it is measured, and where only
// stored values are seen (compare's side files, --fold). A fake census here, no world, no network.
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "vsmain-"));
process.env.VS_MAIN_CACHE = join(TMP, "cache");
const VS_MAIN = resolve(import.meta.dir, "../../avenbox/vs-main.ts");
const vm = await import("../../avenbox/vs-main");

const CENSUS = { what: "census" as const, args: ["sandbox-1", "all", "tris"] };
const SHA = "0123456789abcdef0123456789abcdef01234567";
const SEEING = { "near tris": 900_000, "near draws": 2_000, "far tris": 400_000, "far draws": 1_500 };
const side = (which: "main" | "head", values: Record<string, number>, measure = { ...CENSUS, args: ["sandbox-1", "all", "tris,draws"] }) => ({
  side: which,
  sha: which === "main" ? SHA : null,
  measures: { [vm.measureId(measure)]: { measure, values } },
});
const put = (name: string, v: unknown) => {
  const f = join(TMP, name);
  writeFileSync(f, JSON.stringify(v));
  return f;
};
const compare = (main: string, head: string) => {
  const r = Bun.spawnSync(["bun", VS_MAIN, "compare", main, head, "--within", "3%"]);
  return { code: r.exitCode, out: `${r.stdout}${r.stderr}` };
};
/** a repository whose census answers `draws` draws in near and 2,000 in far, whatever is asked of it */
const repoCounting = (draws: number) => {
  const repo = mkdtempSync(join(TMP, "repo-"));
  mkdirSync(join(repo, "play/site/scripts"), { recursive: true });
  writeFileSync(
    join(repo, "play/site/scripts/census.ts"),
    `import { writeFileSync } from 'node:fs';
const a = process.argv.slice(2);
const v = (view, calls) => ({ view, settled: true, totals: { tris: calls * 400, calls, mainTris: calls * 300, mainCalls: calls } });
writeFileSync(a[a.indexOf('--json') + 1], JSON.stringify({ views: [v('near', ${draws}), v('far', 2000)] }));
`,
  );
  return repo;
};

test("a blind census is no bound", () => {
  const seeingMain = put("main.json", side("main", SEEING));
  const seeingHead = put("head.json", side("head", SEEING));

  // a seeing census keeps its bound
  const seen = compare(seeingMain, seeingHead);
  expect(seen.out).toMatch(/vs-main: within the bound of main 012345678/);
  expect(seen.code).toBe(0);

  // main blind in near: 1 → 1 is in every bound, and still fails, naming main and the view
  const blindMain = compare(put("main-blind.json", side("main", { ...SEEING, "near tris": 1, "near draws": 1 })), put("head-1.json", side("head", { ...SEEING, "near tris": 1, "near draws": 1, "far draws": 1_400 })));
  expect(blindMain.code).not.toBe(0);
  expect(blindMain.out).toMatch(/census of main 012345678: near is blind \(draws 1\)/);
  expect(blindMain.out).toMatch(/census of the head: near is blind/);
  expect(blindMain.out).not.toMatch(/far is blind/);
  expect(blindMain.out).toMatch(/vs-main: no bound of main 012345678: the census is blind/);
  expect(blindMain.out).not.toMatch(/within the bound/);

  // the head alone blind, in far, by its main pass: fewer draws than main, in the bound, and no bound
  const mainPass = { ...CENSUS, args: ["sandbox-1", "all", "mainTris,mainDraws"] };
  const blindHead = compare(put("main-pass.json", side("main", { "near mainDraws": 2_000, "far mainDraws": 1_500 }, mainPass)), put("head-blind.json", side("head", { "near mainDraws": 2_000, "far mainDraws": 0 }, mainPass)));
  expect(blindHead.code).not.toBe(0);
  expect(blindHead.out).toMatch(/census of the head: far is blind \(mainDraws 0\)/);
  expect(blindHead.out).not.toMatch(/census of main/);
  expect(blindHead.out).not.toMatch(/near is blind/);

  // the same by the functions: stored values of either side, and a deferred head folded into its check
  expect(vm.blind(SEEING, "the head")).toEqual([]);
  expect(vm.report(CENSUS, SEEING, SEEING, { kind: "within", pct: 3 }, SHA).ok).toBe(true);
  expect(vm.report(CENSUS, { ...SEEING, "far draws": 1 }, SEEING, { kind: "within", pct: 3 }, SHA).ok).toBe(false);
  const folded = vm.fold({ results: [{ check: "c5", pass: true, code: 0, evidence: "ran" }] }, side("main", SEEING), [{ check: "c5", call: ["census", "--within", "3%"], values: { ...SEEING, "near draws": 1 } }]);
  expect(folded.results[0]).toMatchObject({ pass: false, code: 1 });
  expect(folded.results[0].evidence).toMatch(/census of the head: near is blind/);
  // only a census: another measure's 1 is a number like any
  expect(vm.report({ what: "count", args: ["echo 1"] }, { count: 1 }, { count: 1 }, { kind: "within", pct: 0 }, SHA).ok).toBe(true);

  // as it is measured: the draws are read though only triangles were asked for, the head's and main's
  const blindRepo = repoCounting(1);
  expect(() => vm.measure(CENSUS, null, blindRepo)).toThrow(/census of the head: near is blind \(draws 1\): it counted the screen quad, not the scene/);
  expect(() => vm.measure(CENSUS, SHA, blindRepo)).toThrow(/census of main 012345678: near is blind \(draws 1\)/);
  expect(vm.measure(CENSUS, null, repoCounting(2_000))).toEqual({ "near tris": 800_000, "far tris": 800_000 });

  // and by the command, one side measured on its own: it exits non-zero and writes no values
  const out = join(TMP, "side.json");
  const cli = Bun.spawnSync(["bun", VS_MAIN, "census", "--of", "tris", "--side", "head", "--out", out, "--repo", blindRepo]);
  expect(cli.exitCode).not.toBe(0);
  expect(`${cli.stderr}`).toMatch(/census of the head: near is blind/);
  expect(() => readFileSync(out)).toThrow();
});
