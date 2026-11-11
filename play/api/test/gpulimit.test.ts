// The limit a check gets in avenBOX's runner (play/avenbox/intent.ts; intent d3f98bcc, play/SPEC.md §4.12): one measured
// on a real GPU (its run runs play/site/scripts/gpu.ts) gets GPU_LIMIT, time for two engines on GitHub's macOS runner,
// every other check LIMIT, and --timeout sets both by hand; a check killed there says so, and what it had measured.
// No GPU here: gpu.ts is stood in for by a script that prints what the real one prints for an engine it has finished.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const RUNNER = join(ROOT, "play/avenbox/intent.ts");
const source = readFileSync(RUNNER, "utf8");
const constant = (name: string) => Number(new RegExp(`^const ${name} = (\\d+);$`, "m").exec(source)?.[1]);
const ID = "d3f98bcc-f5b1-4092-9797-dd4b2ad6560e";
// run 42925494879's line for Sandbox 1 in Chromium, as gpu.ts printed it before the check was killed
const CHROMIUM = "✓ chromium 153.0.8010.12 · WebGPU apple · WebGL ANGLE (Apple) · drew with webgpu · world in 205.3 s, settled not · 115 frames in 10 s, 87.9 ms each (p95 200.1, CPU 54.1, GPU —) · 774 draws, 2240433 triangles · 0.95 painted";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "gpulimit-"));
  mkdirSync(join(dir, "play/site/scripts"), { recursive: true });
  // the stand-in: Chromium's line at once, then WebKit never comes (--quick: it ends at once)
  writeFileSync(join(dir, "play/site/scripts/gpu.ts"), `console.log(${JSON.stringify(CHROMIUM)});\nif (!process.argv.includes("--quick")) await Bun.sleep(60_000);\n`);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

type Check = { id: string; run: string };
async function run(checks: Check[], args: string[] = []) {
  const spec = { intent: { id: ID, stage: "build", title: "The limit" }, checks: checks.map((c) => ({ ...c, check: c.id, how: "measure", by: c.run, must: true })) };
  const at = join(dir, `spec-${crypto.randomUUID()}.json`);
  writeFileSync(at, JSON.stringify(spec));
  const p = Bun.spawn([process.execPath, RUNNER, "--from", at, "--results-out", `${at}.results`, "--root", dir, "--no-up", ...args], {
    env: { ...process.env, PLAY_MCP_TOKEN: undefined }, stdout: "pipe", stderr: "pipe",
  });
  const out = await new Response(p.stdout).text();
  await p.exited;
  return { out, results: JSON.parse(readFileSync(`${at}.results`, "utf8")).results as { check: string; pass: boolean; code: number; evidence: string }[] };
}

describe("a check's limit", () => {
  test("one named constant for a check on a real GPU, 600 s for every other, and the gpu job has time for three", () => {
    expect(constant("LIMIT")).toBe(600);
    const gpu = constant("GPU_LIMIT");
    // gpu.ts gives an engine 600 s to show the world, 60 s to settle, 10 s of frames and 10 s for its cover: two engines
    // end by gpu.ts's own limits, in its own words, before the runner kills the check
    const script = readFileSync(join(ROOT, "play/site/scripts/gpu.ts"), "utf8");
    expect(script).toContain("arg('--browser', 'chromium,webkit')");
    expect(script).toContain("arg('--timeout', '600')");
    expect(script).toContain("arg('--settle', '60')");
    expect(gpu).toBeGreaterThanOrEqual(2 * (600 + 60 + 10 + 10));
    // the number is written once: the limit is read from the constant, by the check's run alone
    expect(source).toContain("const limitOf = (c: { run?: string }) => (byHand !== undefined ? Number(byHand) : onGpu(c) ? GPU_LIMIT : LIMIT);");
    expect(source.match(/\b1500\b/g)).toHaveLength(1);
    // the job that runs them: three such checks at their limit, and ten minutes for its installs and build
    const job = (Bun.YAML.parse(readFileSync(join(ROOT, ".github/workflows/intents-pr.yml"), "utf8")) as any).jobs.gpu;
    expect(job["timeout-minutes"] * 60).toBeGreaterThanOrEqual(3 * gpu + 600);
    expect(job.steps.find((s: any) => s.run?.includes("--gpu")).run).not.toContain("--timeout");
  });

  test("the runner gives a check on a GPU the longer limit and says both; --timeout by hand overrides both", async () => {
    const checks = [{ id: "c1", run: "echo fine" }, { id: "c2", run: "bun play/site/scripts/gpu.ts --world /sandbox-1/ --quick" }];
    const plain = await run(checks);
    expect(plain.out).toContain(`a check is killed after 600 s, one measured on a real GPU after ${constant("GPU_LIMIT")} s\n`);
    expect(plain.results.map((r) => [r.check, r.code])).toEqual([["c1", 0], ["c2", 0]]);
    // by hand: 1 s for both, the plain check and the one on a GPU (each prints, then outlasts it)
    const hand = await run([{ id: "c1", run: "echo fine; exec sleep 60" }, { id: "c2", run: "bun play/site/scripts/gpu.ts --world /sandbox-1/" }], ["--timeout", "1"]);
    expect(hand.out).toContain("a check is killed after 1 s (--timeout)\n");
    expect(hand.results.map((r) => [r.check, r.code])).toEqual([["c1", 124], ["c2", 124]]);
  });

  test("killed at the limit: code 124, the evidence keeps what was printed and says it was killed, and on a GPU which engine had finished", async () => {
    const { results } = await run([
      { id: "c1", run: "echo measured so far; exec sleep 60" },
      { id: "c2", run: "bun play/site/scripts/gpu.ts --world /sandbox-1/ --steps" },
      { id: "c3", run: "bun play/site/scripts/gpu.ts --world /sandbox-1/ --browser webkit" },
    ], ["--timeout", "1"]);
    expect(results.map((r) => [r.check, r.pass, r.code])).toEqual([["c1", false, 124], ["c2", false, 124], ["c3", false, 124]]);
    expect(results[0].evidence).toMatch(/\nexit 124 in 1\.\d s · /);
    expect(results[0].evidence).toMatch(/\nmeasured so far\n\(killed after 1 s\)$/);
    expect(results[1].evidence).toContain(`\n${CHROMIUM}\n`);
    expect(results[1].evidence).toEndWith("\n(killed after 1 s: chromium had finished (world in 205.3 s, 115 frames in 10 s, 87.9 ms each); webkit had not finished)");
    // the engines are the run's own: asked for WebKit alone, Chromium's line is not a finished engine of it
    expect(results[2].evidence).toEndWith("\n(killed after 1 s: webkit had not finished)");
  }, 20_000);
});
