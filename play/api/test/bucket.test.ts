// play's files in the bucket (../src/blobs.ts bucketStore, blobStore) against a fake S3 (./fixtures/s3.ts): each file
// under <root>/<its hash's first two characters>/<its hash> with its media type, held to its hash both ways; the store
// play-api runs on chosen by the environment (the folder, the bucket, the bucket with its second copy).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blobStore, bucketStore, keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { fakeS3 } from "./fixtures/s3";

const bytesOf = (s: string) => new TextEncoder().encode(s);
const QUICK = { tries: 2, waitMs: 1, timeoutMs: 5_000 };

describe("the bucket store", () => {
  let s3: ReturnType<typeof fakeS3>;
  beforeAll(() => {
    s3 = fakeS3();
  });
  afterAll(() => s3?.stop());

  test("a file put is there by its hash, with its size and media type, under blobs/<2>/<hash>", async () => {
    const store = bucketStore(s3.env, "blobs", QUICK);
    const text = "a recipe's bytes";
    const h = hashText(text);
    expect(await store.has(h)).toBe(false);
    expect(await store.get(h)).toBeNull();
    expect(await store.size(h)).toBeNull();
    expect(await store.put(h, bytesOf(text), "text/javascript")).toBe(keyOf(h));
    expect([...s3.objects.keys()]).toContain(`blobs/${h.slice(0, 2)}/${h}`);
    expect(await store.has(h)).toBe(true);
    expect(new TextDecoder().decode((await store.get(h))!)).toBe(text);
    expect(await store.size(h)).toBe(text.length);
    expect(await store.typeOf!(h)).toStartWith("text/javascript");
    expect(store.url(h)).toContain(`blobs/${h.slice(0, 2)}/${h}`);
  });

  test("another root: the backups' store", async () => {
    const store = bucketStore(s3.env, "BACKUPS/play-files/blobs", QUICK);
    const h = hashText("kept twice");
    await store.put(h, bytesOf("kept twice"), "text/plain");
    expect(s3.objects.has(`BACKUPS/play-files/blobs/${h.slice(0, 2)}/${h}`)).toBe(true);
  });

  test("held to its hash: bytes not hashing to the name are never put nor handed back", async () => {
    const store = bucketStore(s3.env, "blobs", QUICK);
    const h = hashText("the real bytes");
    await expect(store.put(h, bytesOf("other bytes"), "text/plain")).rejects.toThrow("hashing to");
    expect(await store.has(h)).toBe(false);
    s3.objects.set(`blobs/${h.slice(0, 2)}/${h}`, { bytes: bytesOf("cut sh"), type: "text/plain" });
    await expect(store.get(h)).rejects.toThrow("hashing to");
  });

  test("a bucket setting missing is named", () => {
    const { PLAY_BUCKET_SECRET_KEY: _, ...env } = s3.env;
    expect(() => bucketStore(env)).toThrow("PLAY_BUCKET_SECRET_KEY is not set");
  });

  test("blobStore: the folder without PLAY_BUCKET, the bucket with it, every file kept twice with PLAY_MIRROR_ROOT", async () => {
    const dir = mkdtempSync(join(tmpdir(), "play-blobs-"));
    const folder = blobStore({ PLAY_BLOBS: dir });
    const a = hashText("in the folder");
    await folder.put(a, bytesOf("in the folder"), "text/plain");
    expect(await Bun.file(join(dir, keyOf(a))).text()).toBe("in the folder");
    expect(s3.objects.has(keyOf(a))).toBe(false);

    const both = blobStore({ ...s3.env, PLAY_MIRROR_ROOT: "BACKUPS/play-files/blobs", PLAY_CACHE_MB: "0" });
    const b = hashText("in the bucket, twice");
    await both.put(b, bytesOf("in the bucket, twice"), "text/plain");
    expect(s3.objects.has(keyOf(b))).toBe(true);
    expect(s3.objects.has(`BACKUPS/play-files/blobs/${b.slice(0, 2)}/${b}`)).toBe(true);
    // the first copy lost: handed back from the second, and put back
    s3.objects.delete(keyOf(b));
    const keep = console.warn;
    console.warn = () => {};
    try {
      expect(new TextDecoder().decode((await both.get(b))!)).toBe("in the bucket, twice");
    } finally {
      console.warn = keep;
    }
    expect(s3.objects.has(keyOf(b))).toBe(true);
  });
});
