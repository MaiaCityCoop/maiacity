// A job that checks out part of the repository (`sparse-checkout`, main's code on pull_request_target) runs scripts
// that must find every file they import in that part: "Intent named" checked out play/avenbox alone while
// pr-intent.ts imported play/api/src/kit (intent 5884ade4's re-audit). Each such script is bundled from a copy of
// just what its job checks out.
import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const WORKFLOWS = join(ROOT, ".github/workflows");

type Step = { uses?: string; run?: string; with?: Record<string, unknown> };
const jobs: { file: string; job: string; paths: string[]; scripts: string[] }[] = [];
for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml"))) {
  const w = Bun.YAML.parse(readFileSync(join(WORKFLOWS, file), "utf8")) as { jobs?: Record<string, { steps?: Step[] }> };
  for (const [job, j] of Object.entries(w.jobs ?? {})) {
    const steps = j.steps ?? [];
    const sparse = steps.find((s) => s.uses?.startsWith("actions/checkout") && s.with?.["sparse-checkout"])?.with?.["sparse-checkout"];
    if (typeof sparse !== "string") continue;
    const scripts = steps.flatMap((s) => [...(s.run ?? "").matchAll(/\bbun (play\/[\w./-]+\.ts)\b/g)].map((m) => m[1]));
    if (scripts.length) jobs.push({ file, job, paths: sparse.split("\n").map((p) => p.trim()).filter(Boolean), scripts: [...new Set(scripts)] });
  }
}

describe("a job's sparse checkout holds what its scripts import", () => {
  test("there are such jobs to check", () => expect(jobs.length).toBeGreaterThan(0));
  for (const j of jobs)
    for (const script of j.scripts)
      test(`${j.file} ${j.job}: ${script}`, () => {
        const tree = mkdtempSync(join(tmpdir(), "sparse-"));
        for (const p of [...j.paths, ".bun-version"]) cpSync(join(ROOT, p), join(tree, p), { recursive: true });
        const out = Bun.spawnSync(["bun", "build", "--target=bun", "--outdir", join(tree, ".out"), join(tree, script)], { cwd: tree, stderr: "pipe" });
        expect(out.stderr.toString()).not.toContain("Could not resolve");
        expect(out.exitCode).toBe(0);
      });
});
