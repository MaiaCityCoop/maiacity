import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { folderStore, keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";

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

import { cachedStore, mirroredStore, steady, transient, type BlobStore } from "../src/blobs";

const quick = { waitMs: 1, timeoutMs: 200 };

test("a call held steady is asked again when it fails for a while, and gives up on what will never answer", async () => {
  // slow, then a 5xx, then an answer: asked three times, answered
  let n = 0;
  const flaky = () => {
    n++;
    if (n === 1) return new Promise<string>(() => {}); // never answers: its try times out
    if (n === 2) return Promise.reject(Object.assign(new Error("We encountered an internal error."), { code: "InternalError" }));
    return Promise.resolve("bytes");
  };
  expect(await steady("get", flaky, quick)).toBe("bytes");
  expect(n).toBe(3);
  // a missing key, refused access, or bytes not hashing to their name: asked once, never again
  for (const e of [Object.assign(new Error("no"), { code: "NoSuchKey" }), Object.assign(new Error("no"), { code: "AccessDenied" }), new Error("blob x holds bytes hashing to y")]) {
    let m = 0;
    await expect(steady("get", () => (m++, Promise.reject(e)), quick)).rejects.toBe(e);
    expect(m).toBe(1);
    expect(transient(e)).toBe(false);
  }
  // one that never stops failing: asked `tries` times, then its error
  let k = 0;
  await expect(steady("get", () => (k++, Promise.reject(new Error("The server did not respond in time."))), { ...quick, tries: 4 })).rejects.toThrow("did not respond");
  expect(k).toBe(4);
});

test("every file in two places: one the first store lacks or holds broken is read from the second and put back", async () => {
  const a = await mkdtemp(join(tmpdir(), "blobs-a-")), b = await mkdtemp(join(tmpdir(), "blobs-b-"));
  try {
    const said: string[] = [];
    const primary = folderStore(a), mirror = folderStore(b);
    const store = mirroredStore(primary, mirror, (s) => said.push(s));
    const text = "a file kept twice", h = hashText(text), bytes = new TextEncoder().encode(text);
    // written through to both
    await store.put(h, bytes, "text/plain");
    expect(await primary.has(h)).toBe(true);
    expect(await mirror.has(h)).toBe(true);
    expect(await store.size(h)).toBe(bytes.length);
    // gone from the first: read from the second, and the first holds it again
    await rm(join(a, keyOf(h)));
    expect(new TextDecoder().decode((await store.get(h))!)).toBe(text);
    expect(await primary.has(h)).toBe(true);
    // broken in the first (cut short): the same
    await writeFile(join(a, keyOf(h)), text.slice(0, 5));
    expect(new TextDecoder().decode((await store.get(h))!)).toBe(text);
    expect(await primary.has(h)).toBe(true);
    // gone from the first again: its size (what a deploy checks) puts it back too
    await rm(join(a, keyOf(h)));
    expect(await store.size(h)).toBe(bytes.length);
    expect(await primary.has(h)).toBe(true);
    expect(said.filter((s) => s.includes("put back from the mirror")).length).toBe(3);
    // in neither: missing, as from one store
    const other = hashText("never kept");
    expect(await store.get(other)).toBe(null);
    expect(await store.size(other)).toBe(null);
  } finally {
    await rm(a, { recursive: true, force: true });
    await rm(b, { recursive: true, force: true });
  }
});

test("files never change: one handed out is kept in memory, within its room", async () => {
  const dir = await mkdtemp(join(tmpdir(), "blobs-c-"));
  try {
    const inner = folderStore(dir);
    let reads = 0;
    const counted: BlobStore = { ...inner, get: (h) => (reads++, inner.get(h)) };
    const store = cachedStore(counted, 4096);
    const small = "kept", big = "x".repeat(2000);
    for (const t of [small, big]) await store.put(hashText(t), new TextEncoder().encode(t), "text/plain");
    await store.get(hashText(small));
    await store.get(hashText(small));
    expect(reads).toBe(1);
    // more than a quarter of the room: never kept
    await store.get(hashText(big));
    await store.get(hashText(big));
    expect(reads).toBe(3);
    expect(await store.size(hashText(big))).toBe(2000);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
