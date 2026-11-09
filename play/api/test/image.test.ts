// play's image (play/Dockerfile) builds the site from what its first stage copies, not from the whole repository as CI
// does: a file outside play/site that the site's own code imports must be copied into that stage, or the deploy's image
// fails to build while every check on the pull request is green (intent 67f0404a, 2026-11-09: sandboxes.js re-exports
// play/api/src/ids.ts).
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

test("the image's site stage copies every file outside play/site the site's own code imports", () => {
  const copied = copiedBySite();
  const outside = new Set<string>();
  for (const file of sources(resolve(SITE, "src"))) {
    for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const target = relative(ROOT, resolve(dirname(file), m[1]));
      if (!target.startsWith("play/site/")) outside.add(target);
    }
  }
  expect(outside.size).toBeGreaterThan(0); // sandboxes.js's ids.ts: the test sees what it guards
  const missing = [...outside].filter((t) => !copied.some((c) => t === c || t.startsWith(c.replace(/\/?$/, "/"))));
  expect(missing).toEqual([]);
});
