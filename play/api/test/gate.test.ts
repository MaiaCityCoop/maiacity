// The gate before a push (play/avenbox/gate.sh, ./select.ts; intent aa59f248): only what a change touched — play/api's
// tests that import a changed file or name it, all of them when it can't tell — its plan shown without running, and the
// workflows' lint. CI and main always run everything (./workflows.test.ts holds that).
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { changedPaths, plan } from "../../avenbox/select";

const ROOT = resolve(import.meta.dir, "../../..");
const GATE = join(ROOT, "play/avenbox/gate.sh");

/** a small repository: a.test → src/a → src/b; c.test → src/c; d.test reads deploy/x.sh by name; e.test alone */
function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "gate-"));
  const put = (p: string, text: string) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), text);
  };
  put("play/api/src/a.ts", `import { b } from "./b";\nexport const a = () => b();\n`);
  put("play/api/src/b.ts", `export const b = () => 1;\n`);
  put("play/api/src/c.ts", `export const c = async () => (await import("./d.js")).d;\n`);
  put("play/api/src/d.ts", `export const d = 4;\n`);
  put("play/api/test/a.test.ts", `import { a } from "../src/a";\n`);
  put("play/api/test/c.test.ts", `import { c } from "../src/c";\n`);
  put("play/api/test/d.test.ts", `const text = readFileSync("../../deploy/x.sh");\n`);
  put("play/api/test/e.test.ts", `test("alone", () => {});\n`);
  return root;
}
const gate = (args: string[], changed?: string) =>
  Bun.spawnSync(["bash", GATE, ...args], { cwd: ROOT, env: { ...process.env, ...(changed !== undefined ? { GATE_CHANGED: changed } : {}) }, stdout: "pipe", stderr: "pipe" });

describe("the tests a change picks", () => {
  const root = tree();
  test("a test that imports the changed file, directly or through others, and no other", () => {
    expect(plan(root, ["play/api/src/b.ts"]).tests).toEqual(["test/a.test.ts"]);
    expect(plan(root, ["play/api/src/a.ts"]).tests).toEqual(["test/a.test.ts"]);
    // a dynamic import, written with .js for a .ts file
    expect(plan(root, ["play/api/src/d.ts"]).tests).toEqual(["test/c.test.ts"]);
  });
  test("a changed test picks itself", () => {
    expect(plan(root, ["play/api/test/e.test.ts"]).tests).toEqual(["test/e.test.ts"]);
  });
  test("a file a test names by its whole file name picks it; a bare word does not", () => {
    const p = plan(root, ["deploy/x.sh"]);
    expect(p.tests).toEqual(["test/d.test.ts"]);
    expect(p.steps).toEqual(["api-tests"]);
  });
  test("what everything depends on, or a file no test can be placed against, picks every test", () => {
    for (const f of ["play/api/package.json", "play/api/bun.lock", "play/api/tsconfig.json", "play/api/migrations/0099_x.sql", "play/api/test/fixtures/github.ts", "tools/nowhere/y.ts", "play/api/src/new.ts"]) {
      const p = plan(root, [f]);
      expect([f, p.tests]).toEqual([f, "all"]);
      expect(p.steps).toContain("api-types");
      expect(p.steps).toContain("api-tests");
    }
  });
  test("parts: the website only for the website, the site's build for the site and the API, nothing for an unread note", () => {
    expect(plan(root, ["website/src/app.html"])).toMatchObject({ steps: ["website-check", "website-build"], tests: [] });
    expect(plan(root, ["play/site/src/x.ts"])).toMatchObject({ steps: ["site-build", "site-tests"], tests: [] });
    expect(plan(root, ["play/api/src/b.ts"]).steps).toEqual(["api-types", "api-tests", "site-build", "site-tests"]);
    expect(plan(root, ["NOTES.md"])).toMatchObject({ steps: [], tests: [] });
  });
  test("everything with --all", () => {
    expect(plan(root, null)).toMatchObject({ steps: ["api-types", "api-tests", "site-build", "site-tests", "website-check", "website-build", "lint"], tests: "all" });
  });
  test("no merge base to diff against (no origin/main, as in a shallow checkout): everything", () => {
    const git = (...a: string[]) => Bun.spawnSync(["git", ...a], { cwd: root, stdout: "ignore", stderr: "ignore" });
    git("init", "-q");
    git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "x");
    const was = process.env.GATE_CHANGED;
    delete process.env.GATE_CHANGED;
    try {
      expect(changedPaths(root)).toBeNull();
    } finally {
      if (was !== undefined) process.env.GATE_CHANGED = was;
    }
  });
});

describe("the gate's plan", () => {
  test("a change to play's server: the API's types and its tests that use it, and the site's build; no website; nothing run", () => {
    const r = gate(["--plan"], "play/api/src/rules.ts");
    const out = r.stdout.toString();
    expect(r.exitCode).toBe(0);
    expect(out).toContain("step api-types");
    expect(out).toMatch(/step api-tests: \d+ files/);
    expect(out).toContain("test/rules.test.ts");
    expect(out).not.toContain("test/blobs.test.ts");
    expect(out).toContain("step site-build");
    expect(out).not.toContain("website");
    // a plan runs nothing: no step started
    expect(out).not.toContain("· ");
  });
  test("a change to the website: its check and build, nothing of play's", () => {
    // a file no test names (this one would, written whole)
    const out = gate(["--plan"], "website/src/zz-" + "page.html").stdout.toString();
    expect(out).toContain("step website-check");
    expect(out).toContain("step website-build");
    expect(out).not.toContain("step api-");
    expect(out).not.toContain("step site-");
  });
  test("--all: every step, every test file", () => {
    const out = gate(["--all", "--plan"]).stdout.toString();
    for (const s of ["api-types", "api-tests: every file", "site-build", "site-tests", "website-check", "website-build", "lint"]) expect(out).toContain(`step ${s}`);
  });
});

describe("the workflows' lint", () => {
  test("lint: today's workflows pass", () => {
    const r = gate(["lint"]);
    expect([r.exitCode, r.stdout.toString()]).toEqual([0, expect.stringContaining("✓ workflows' lint")]);
  }, 120_000);
  test("lint: a workflow with a broken expression fails it", () => {
    const dir = mkdtempSync(join(tmpdir(), "lint-"));
    const bad = join(dir, "bad.yml");
    writeFileSync(bad, "name: bad\non: push\njobs:\n  a:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: echo ${{ github.nope( }}\n");
    const r = gate(["lint", bad]);
    expect(r.exitCode).not.toBe(0);
    expect(r.stdout.toString()).toContain("✗ workflows' lint");
  }, 120_000);
  test("lint: the gate plans it when a workflow file changed, and not otherwise", () => {
    expect(gate(["--plan"], ".github/workflows/main.yml").stdout.toString()).toContain("step lint");
    expect(gate(["--plan"], "play/api/src/rules.ts").stdout.toString()).not.toContain("step lint");
  });
});
