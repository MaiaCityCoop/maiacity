// The folder store (src/blobs.ts): a file is held only when its bytes hash to its name, and a broken one (2026-11-05:
// empty files a full disk left under their hashes, which every later upload skipped) is written again by the next put.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { folderStore, keyOf } from "../src/blobs";
import { hashBytes } from "../src/hash";

describe("folder store", () => {
  const bytes = new TextEncoder().encode("a plant's data sheet");
  const hash = hashBytes(bytes);

  test("a put is read back and leaves no part file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "play-blobs-"));
    const store = folderStore(dir);
    expect(await store.has(hash)).toBe(false);
    expect(await store.put(hash, bytes, "text/markdown")).toBe(keyOf(hash));
    expect(await store.has(hash)).toBe(true);
    expect(await store.get(hash)).toEqual(bytes);
    expect(readdirSync(join(dir, "blobs", hash.slice(0, 2)))).toEqual([hash]);
  });

  test("a broken file is not held, and the next put mends it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "play-blobs-"));
    const store = folderStore(dir);
    for (const broken of [new Uint8Array(0), bytes.slice(0, 5)]) {
      mkdirSync(join(dir, "blobs", hash.slice(0, 2)), { recursive: true });
      writeFileSync(join(dir, keyOf(hash)), broken);
      expect(await store.has(hash)).toBe(false);
      await expect(store.get(hash)).rejects.toThrow("holds bytes hashing to");
      await store.put(hash, bytes, "text/markdown");
      expect(await store.has(hash)).toBe(true);
      expect(await store.get(hash)).toEqual(bytes);
    }
  });

  test("bytes that are not the hash are refused before anything is written", async () => {
    const dir = mkdtempSync(join(tmpdir(), "play-blobs-"));
    const store = folderStore(dir);
    await expect(store.put(hash, new TextEncoder().encode("something else"), "text/markdown")).rejects.toThrow("holds bytes hashing to");
    expect(await store.has(hash)).toBe(false);
  });
});
