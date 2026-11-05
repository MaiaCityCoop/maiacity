import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { folderStore, keyOf } from "../src/blobs";
import { hashText } from "../src/hash";

test("a folder store never takes a blob cut short for the blob: it writes it again", async () => {
  const dir = await mkdtemp(join(tmpdir(), "blobs-"));
  try {
    const store = folderStore(dir);
    const text = "module.exports.recipe = () => ({});";
    const h = hashText(text);
    const bytes = new TextEncoder().encode(text);
    expect(await store.has(h)).toBe(false);
    // what a write cut short by a full disk leaves: the name, with nothing (or part of it) in it
    await store.put(h, bytes, "text/javascript");
    await writeFile(join(dir, keyOf(h)), "");
    expect(await store.has(h)).toBe(false);
    await writeFile(join(dir, keyOf(h)), text.slice(0, 10));
    expect(await store.has(h)).toBe(false);
    await expect(store.get(h)).rejects.toThrow("hashing to");
    // put again, it is whole again, and nothing is left beside it
    await store.put(h, bytes, "text/javascript");
    expect(await store.has(h)).toBe(true);
    expect(new TextDecoder().decode((await store.get(h))!)).toBe(text);
    expect(await readdir(join(dir, "blobs", h.slice(0, 2)))).toEqual([h]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
