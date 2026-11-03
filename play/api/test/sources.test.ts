// The imported versions' readable sources kept in the repo (import/legacy/sources): every file listed is there and is
// its hash, every recipe names a listed source and what it builds, and each source is a library that sets the recipe.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { hashText } from "../src/hash";
import { SOURCES, type SourceIndex } from "../import/sources";

const index: SourceIndex = JSON.parse(readFileSync(join(SOURCES, "index.json"), "utf8"));
const HASH = /^[0-9a-f]{64}$/;

describe("legacy sources", () => {
  test("every source file listed is there, is its hash, and sets the recipe its recipe files call", () => {
    for (const [hash, file] of Object.entries(index.sources)) {
      expect(hash).toMatch(HASH);
      const text = readFileSync(join(SOURCES, file), "utf8");
      expect(hashText(text)).toBe(hash);
      expect(text).toMatch(/\bexports\.recipe\s*=|exports,\s*["']?recipe/);
    }
  });

  test("every recipe file names a listed source and the asset, version and variant it builds", () => {
    const used = new Set<string>();
    for (const [hash, r] of Object.entries(index.recipes)) {
      expect(hash).toMatch(HASH);
      expect(index.sources[r.source]).toBeString();
      expect(r.asset).toMatch(/^(plants|things|machines|buildings|actors|biomes)\/[a-z0-9][a-z0-9-]*$/);
      expect(Number.isInteger(r.v) && r.v >= 1).toBe(true);
      expect(r.variant === null || /^[a-z0-9][a-z0-9-]*$/.test(r.variant)).toBe(true);
      used.add(r.source);
    }
    // no file kept that no recipe file was checked against
    expect(used.size).toBe(Object.keys(index.sources).length);
  });

  test("no file is kept here that the index does not list", () => {
    const listed = new Set(Object.values(index.sources));
    const files: string[] = [];
    for (const g of readdirSync(SOURCES)) if (statSync(join(SOURCES, g)).isDirectory()) for (const f of readdirSync(join(SOURCES, g))) files.push(`${g}/${f}`);
    expect(files.filter((f) => !listed.has(f))).toEqual([]);
  });
});
