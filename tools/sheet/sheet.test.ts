/**
 * The sheet tools call fal only with --allow <n> (intent eb7024df): fal is stubbed (test/stub-fal.ts, preloaded), no
 * key and no network; every request a run makes is logged, so "before any network call" is the log being empty.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = import.meta.dir;
function run(tool: "sheet.ts" | "sheet-edit.ts", args: string[], env: Record<string, string> = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "sheet-test-"));
  const log = join(tmp, "requests.log");
  writeFileSync(log, "");
  const brief = join(tmp, "brief.md"), fix = join(tmp, "fix.txt"), sheet = join(tmp, "sheet.jpg");
  writeFileSync(brief, "A lemon\nrow 1: the tree");
  writeFileSync(fix, "Keep the whole plate; redraw cell 1.");
  writeFileSync(sheet, "not really a jpeg");
  const base = tool === "sheet.ts"
    ? ["--kind", "plant", "--brief", brief, "--out", join(tmp, "out"), "--no-upload"]
    : ["--sheet", sheet, "--fix", fix, "--out", join(tmp, "out", "sheet-3"), "--no-upload"];
  const clean = { ...process.env } as Record<string, string>;
  delete clean.FAL_KEY; delete clean.FAL_API_KEY; delete clean.PLAY_MCP_TOKEN;
  const p = Bun.spawnSync(["bun", "--preload", join(dir, "test", "stub-fal.ts"), join(dir, tool), ...base, ...args], {
    env: { ...clean, STUB_LOG: log, ...env },
  });
  const requests = readFileSync(log, "utf8").split("\n").filter(Boolean);
  return { code: p.exitCode, err: p.stderr.toString(), out: p.stdout.toString(), requests, falPosts: requests.filter((r) => r.startsWith("POST https://queue.fal.run/")), tmp };
}

describe.each(["sheet.ts", "sheet-edit.ts"] as const)("%s", (tool) => {
  test("without --allow it exits non-zero before any network call", () => {
    const r = run(tool, []);
    expect(r.code).not.toBe(0);
    expect(r.err).toContain("--allow");
    expect(r.requests).toEqual([]);
  });

  test("a bad --allow is refused before any network call", () => {
    for (const a of ["0", "-1", "two"]) {
      const r = run(tool, ["--allow", a]);
      expect(r.code).not.toBe(0);
      expect(r.requests).toEqual([]);
    }
  });

  test("--dry-run needs no allowance and sends nothing to fal", () => {
    const r = run(tool, ["--dry-run"]);
    expect(r.code).toBe(0);
    expect(r.falPosts).toEqual([]);
    expect(r.requests).toEqual([]);
  });

  test("with --allow 1 it makes one call and prints the calls made", () => {
    const r = run(tool, ["--allow", "1"], { FAL_KEY: "stub" });
    expect(r.err).toContain("fal: 1 call made, 1 image asked (--allow 1).");
    expect(r.code).toBe(0);
    expect(r.falPosts.length).toBe(1);
  });
});

describe("sheet.ts counts the images asked", () => {
  test("with --allow 1, a run asking for 2 images is refused before any network call", () => {
    const r = run("sheet.ts", ["--n", "2", "--allow", "1"], { FAL_KEY: "stub" });
    expect(r.code).not.toBe(0);
    expect(r.err).toContain("2 images, --allow is 1");
    expect(r.requests).toEqual([]);
  });

  test("with --allow 2, a run asking for 2 images makes its one call and says so", () => {
    const r = run("sheet.ts", ["--n", "2", "--allow", "2"], { FAL_KEY: "stub" });
    expect(r.code).toBe(0);
    expect(r.falPosts.length).toBe(1);
    expect(r.err).toContain("fal: 1 call made, 2 images asked (--allow 2).");
    expect(existsSync(join(r.tmp, "out", "sheet-2.png"))).toBe(true);
  });
});

describe("the guard holds fetch to the allowance", () => {
  test("a second call past the allowance is refused, not sent, and the calls made are printed", () => {
    const tmp = mkdtempSync(join(tmpdir(), "sheet-test-"));
    const log = join(tmp, "requests.log");
    writeFileSync(log, "");
    const script = join(tmp, "retry.ts");
    // a run that tries again on its own: the second paid call must never leave
    writeFileSync(script, `import { allow } from ${JSON.stringify(join(dir, "allow.ts"))};
allow(1);
const post = () => fetch("https://queue.fal.run/fal-ai/nano-banana-pro", { method: "POST", body: JSON.stringify({ num_images: 1 }) });
await post();
await post();
console.log("not reached");
`);
    const p = Bun.spawnSync(["bun", "--preload", join(dir, "test", "stub-fal.ts"), script, "--allow", "1"], { env: { ...process.env, STUB_LOG: log } });
    const posts = readFileSync(log, "utf8").split("\n").filter((l) => l.startsWith("POST "));
    expect(p.exitCode).not.toBe(0);
    expect(posts.length).toBe(1);
    expect(p.stdout.toString()).not.toContain("not reached");
    expect(p.stderr.toString()).toContain("fal: 1 call made, 1 image asked (--allow 1).");
  });
});
