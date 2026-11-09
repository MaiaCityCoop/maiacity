// What a change touched, for gate.sh (intent aa59f248): which of the gate's steps it needs, and which of play/api's
// tests. Only before a push: CI and main always run everything (play-checks.yml), and so does `gate.sh --all`.
//
//   bun play/avenbox/select.ts            # the plan, one line each: `step <name>`, `test <file>`, `why <reason>`
//   GATE_CHANGED="a b" bun …/select.ts    # for these paths (from the repository's root), not git's
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Plan = {
  steps: string[]; // in the gate's order: api-types, api-tests, site-build, website-check, website-build, deploy-tests, lint
  tests: string[] | "all"; // play/api's test files (relative to play/api), or every one
  why: string[];
};

const STEPS = ["api-types", "api-tests", "site-build", "website-check", "website-build", "deploy-tests", "lint"] as const;
const DEPLOY_TESTED = ["deploy/publish-site.py", "deploy/test_publish_site.py"];
const CODE = /\.(ts|js|mjs|cjs|tsx|jsx|json)$/;
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

function allTests(root: string): string[] {
  const dir = join(root, "play/api/test");
  return readdirSync(dir).filter((f) => f.endsWith(".test.ts")).map((f) => `test/${f}`).sort();
}

function resolveSpec(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(from), spec);
  for (const p of [base, `${base}.ts`, `${base}.js`, `${base}.mjs`, `${base}.json`, join(base, "index.ts"), join(base, "index.js")]) {
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  // a `.js` specifier written for its `.ts` file
  const ts = base.replace(/\.js$/, ".ts");
  return existsSync(ts) ? ts : null;
}

function closure(file: string, seen = new Map<string, string>()): Map<string, string> {
  if (seen.has(file)) return seen;
  const text = readFileSync(file, "utf8");
  seen.set(file, text);
  if (!CODE.test(file) || file.endsWith(".json")) return seen;
  for (const m of text.matchAll(IMPORT)) {
    const next = resolveSpec(file, m[1]);
    if (next) closure(next, seen);
  }
  return seen;
}

const isMd = (p: string) => p.endsWith(".md");
const everything = (p: string) =>
  /^play\/api\/(package\.json|bun\.lock|tsconfig[^/]*\.json)$/.test(p) || p.startsWith("play/api/migrations/") ||
  p.startsWith("play/api/test/fixtures/") || /^play\/api\/src\/migrations?[./]/.test(p);

export function plan(root: string, changed: string[] | null): Plan {
  if (changed === null) return { steps: [...STEPS], tests: "all", why: ["everything: --all, one part named, or no merge base to diff against"] };
  const why: string[] = [];
  const steps = new Set<string>();
  const files = [...new Set(changed.map((p) => p.trim()).filter(Boolean))];
  if (!files.length) return { steps: [], tests: [], why: ["nothing changed"] };

  let all = false;
  const picked = new Set<string>();
  const tests = allTests(root);
  const reach = new Map(tests.map((t) => [t, closure(join(root, "play/api", t))]));
  for (const f of files) {
    if (f.startsWith("website/")) steps.add("website-check").add("website-build");
    if (f.startsWith(".github/workflows/")) steps.add("lint");
    if (DEPLOY_TESTED.includes(f)) steps.add("deploy-tests");
    if (f.startsWith("play/site/") || f.startsWith("play/api/")) steps.add("site-build");
    if (f.startsWith("play/api/")) steps.add("api-types");
    if (everything(f)) {
      all = true;
      why.push(`every API test: ${f} is one everything there depends on`);
      continue;
    }
    const abs = join(root, f);
    const name = f.split("/").pop()!;
    // a whole file name with its extension, as a token: never a bare word
    const named = name.includes(".") ? new RegExp(`(^|[^\\w.-])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w-])`) : null;
    const hits = tests.filter((t) => reach.get(t)!.has(abs) || (named?.test(reach.get(t)!.get(join(root, "play/api", t))!) ?? false));
    hits.forEach((t) => picked.add(t));
    if (hits.length) why.push(`${f}: ${hits.length} test${hits.length > 1 ? "s" : ""}`);
    else if (isMd(f) || f.startsWith("play/site/") || f.startsWith("website/") || DEPLOY_TESTED.includes(f)) why.push(`${f}: no API test`);
    else {
      all = true;
      why.push(`every API test: no test placed against ${f}`);
    }
  }
  if (all || picked.size) steps.add("api-tests");
  if (all) steps.add("api-types");
  return { steps: STEPS.filter((s) => steps.has(s)), tests: all ? "all" : [...picked].sort(), why };
}

export function changedPaths(root: string): string[] | null {
  const given = process.env.GATE_CHANGED;
  if (given !== undefined) return given.split(/\s+/).filter(Boolean);
  const git = (...args: string[]) => {
    const r = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "ignore" });
    return r.exitCode === 0 ? r.stdout.toString() : null;
  };
  const base = git("merge-base", "origin/main", "HEAD")?.trim();
  if (!base) return null;
  const committed = git("diff", "--name-only", base, "HEAD") ?? "";
  const work = git("status", "--porcelain", "--untracked-files=all") ?? "";
  // porcelain: "XY path" or "XY old -> new"
  const touched = work.split("\n").filter(Boolean).flatMap((l) => l.slice(3).split(" -> "));
  return [...new Set([...committed.split("\n"), ...touched].map((p) => p.replace(/^"|"$/g, "")).filter(Boolean))];
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../..");
  const p = plan(root, process.argv.includes("--all") ? null : changedPaths(root));
  for (const s of p.steps) console.log(`step ${s}`);
  if (p.tests !== "all") for (const t of p.tests) console.log(`test ${t}`);
  for (const w of p.why) console.log(`why ${w}`);
}


