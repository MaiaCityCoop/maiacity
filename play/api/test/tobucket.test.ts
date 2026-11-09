// play's files from the server's folder into the bucket (../src/tobucket.ts, production.yml), run as the deploy runs it
// against a fake S3: every file play.files names that the bucket lacks is copied with its media type, one broken in the
// folder is named and not copied, and a second run copies nothing.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { folderStore, keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { keepFile } from "../src/owners";
import { fakeS3 } from "./fixtures/s3";
import { freshDb, suite, type Fresh } from "./kit";

suite("tobucket", () => {
  let f: Fresh, s3: ReturnType<typeof fakeS3>, dir: string;
  const files = ["one file", "another file", "a broken file"].map((t) => ({ text: t, hash: hashText(t) }));
  beforeAll(async () => {
    f = await freshDb();
    s3 = fakeS3();
    dir = mkdtempSync(join(tmpdir(), "play-blobs-"));
    const folder = folderStore(dir);
    for (const { text, hash } of files) {
      await folder.put(hash, new TextEncoder().encode(text), "text/plain");
      await keepFile(f.db, { hash, size: text.length, media_type: "text/plain", bucket_key: keyOf(hash) });
    }
    // a write cut short by a full disk
    writeFileSync(join(dir, keyOf(files[2].hash)), "a bro");
  });
  afterAll(async () => {
    s3?.stop();
    await f?.drop();
  });

  const run = async () => {
    const p = Bun.spawn(["bun", "src/tobucket.ts"], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, ...s3.env, DATABASE_URL: f.url, PLAY_BLOBS: dir },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [out, code] = await Promise.all([new Response(p.stdout).text(), p.exited]);
    return { code, report: JSON.parse(out.trim().split("\n").pop()!) };
  };

  test("copies what the bucket lacks, names what is broken, and copies nothing again", async () => {
    const first = await run();
    expect(first.code).toBe(0);
    expect(first.report).toMatchObject({ files: 3, alreadyInBucket: 0, copied: 2, brokenOrMissing: [files[2].hash] });
    for (const { text, hash } of files.slice(0, 2)) {
      const o = s3.objects.get(keyOf(hash))!;
      expect(new TextDecoder().decode(o.bytes)).toBe(text);
      expect(o.type).toStartWith("text/plain");
    }
    expect(s3.objects.has(keyOf(files[2].hash))).toBe(false);
    const again = await run();
    expect(again.report).toMatchObject({ files: 3, alreadyInBucket: 2, copied: 0, brokenOrMissing: [files[2].hash] });
  });
});
