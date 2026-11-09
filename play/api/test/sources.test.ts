// The imported versions' readable sources kept in the repo (import/legacy/sources): every file listed is there and,
// rebuilt from its pieces, is its hash, every recipe names a listed source and what it builds, and each source is a
// library that sets the recipe.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { hashText } from "../src/kit/hash";
import { pieceFile, piecesIn, readSource, SOURCES, type SourceIndex } from "../import/sources";

const index: SourceIndex = JSON.parse(readFileSync(join(SOURCES, "index.json"), "utf8"));
const HASH = /^[0-9a-f]{64}$/;

describe("legacy sources", () => {
  test("every source file listed is there, rebuilt from its pieces is its hash, and sets the recipe its recipe files call", () => {
    for (const [hash, file] of Object.entries(index.sources)) {
      expect(hash).toMatch(HASH);
      const text = readSource(file);
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

  test("every piece listed is its hash and named by a source or a piece, and each is shared", () => {
    const pieces = index.pieces ?? [];
    const named = new Map<string, number>();
    const kept = [...Object.values(index.sources), ...pieces.map(pieceFile)];
    for (const file of kept) for (const p of piecesIn(readFileSync(join(SOURCES, file), "utf8"))) named.set(p, (named.get(p) ?? 0) + 1);
    for (const p of pieces) {
      expect(p).toMatch(HASH);
      expect(hashText(readSource(pieceFile(p)))).toBe(p);
      expect(named.get(p) ?? 0).toBeGreaterThanOrEqual(2);
    }
    expect([...named.keys()].filter((p) => !pieces.includes(p))).toEqual([]);
  });

  test("no file is kept here that the index does not list", () => {
    const listed = new Set([...Object.values(index.sources), ...(index.pieces ?? []).map(pieceFile)]);
    const files: string[] = [];
    for (const g of readdirSync(SOURCES)) if (statSync(join(SOURCES, g)).isDirectory()) for (const f of readdirSync(join(SOURCES, g))) files.push(`${g}/${f}`);
    expect(files.filter((f) => !listed.has(f))).toEqual([]);
  });
});
