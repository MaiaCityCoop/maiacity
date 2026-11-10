// play's image (play/Dockerfile) builds the site from what its first stage copies, not from the whole repository as CI
// does: a file outside play/site that the site's own code imports must be copied into that stage, or the deploy's image
// fails to build while every check on the pull request is green (intent 67f0404a, 2026-11-09: sandboxes.js re-exports
// play/api/src/kit/ids.ts).
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const SITE = resolve(ROOT, "play/site");

/** the repository paths the Dockerfile's site stage copies */
function copiedBySite() {
  const lines = readFileSync(resolve(ROOT, "play/Dockerfile"), "utf8").split("\n");
  const from = lines.findIndex((l) => /^FROM .* AS site\b/.test(l));
  const to = lines.findIndex((l, i) => i > from && /^FROM /.test(l));
  return lines
    .slice(from, to)
    .filter((l) => /^COPY (?!--from)/.test(l))
    .flatMap((l) => l.replace(/^COPY\s+/, "").split(/\s+/).slice(0, -1));
}

/** the site's own sources: what its build bundles (tests and scripts are not built) */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : sources(p);
    return /\.(js|ts|svelte)$/.test(e.name) && !/\.test\.[jt]s$/.test(e.name) ? [p] : [];
  });
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
/** an import of a value through one of the site's aliases (svelte.config.js `kit.alias`); `import type` is erased */
const ALIASED = /^\s*(import|export)\s+(?!type\b)[^;]*?\bfrom\s*['"](\$[\w-]+)(\/[^'"]*)?['"]/gm;

/** svelte.config.js `kit.alias`: each alias and the file or folder it names, from play/site */
function aliases(): Map<string, string> {
  const config = readFileSync(resolve(SITE, "svelte.config.js"), "utf8");
  const body = config.match(/alias:\s*\{([^}]*)\}/)?.[1] ?? "";
  return new Map([...body.matchAll(/(\$[\w-]+)\s*:\s*['"]([^'"]+)['"]/g)].map((m) => [m[1], m[2]]));
}

test("the image's site stage copies every file outside play/site the site's own code imports", () => {
  const copied = copiedBySite();
  const alias = aliases();
  const outside = new Set<string>();
  for (const file of sources(resolve(SITE, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(IMPORT)) {
      const target = relative(ROOT, resolve(dirname(file), m[1]));
      if (!target.startsWith("play/site/")) outside.add(target);
    }
    // through an alias (intent 5884ade4's Ship: `$stages` was imported, its file never copied, the image's build failed)
    for (const m of text.matchAll(ALIASED)) {
      const to = alias.get(m[2]);
      if (!to) continue;
      const target = relative(ROOT, resolve(SITE, to + (m[3] ?? "")));
      if (!target.startsWith("play/site/")) outside.add(target);
    }
  }
  expect(outside.size).toBeGreaterThan(0); // sandboxes.js's ids.ts: the test sees what it guards
  expect([...outside]).toContain("play/api/src/kit/stages.ts"); // $stages, a value the skills page and the board use
  const missing = [...outside].filter((t) => !copied.some((c) => t === c || t.startsWith(c.replace(/\/?$/, "/"))));
  expect(missing).toEqual([]);
});
