// Whether a play database and its files belong together (../src/verify.ts, the restore's check), run as restore.yml
// runs it: whole, it says ok and exits 0; a file missing from the store or not hashing to its name, or a version's
// recipe play doesn't keep, is a problem it names, and it exits 1.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { folderStore, keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import { keepFile } from "../src/owners";
import { freshDb, suite, type Fresh } from "./kit";

suite("verify", () => {
  let f: Fresh, dir: string;
  const files = ["one file", "another file"].map((t) => ({ text: t, hash: hashText(t) }));
  beforeAll(async () => {
    f = await freshDb();
    dir = mkdtempSync(join(tmpdir(), "play-blobs-"));
    const folder = folderStore(dir);
    for (const { text, hash } of files) {
      await folder.put(hash, new TextEncoder().encode(text), "text/plain");
      await keepFile(f.db, { hash, size: text.length, media_type: "text/plain", bucket_key: keyOf(hash) });
    }
  });
  afterAll(() => f?.drop());

  const run = async () => {
    const p = Bun.spawn(["bun", "src/verify.ts"], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, DATABASE_URL: f.url, PLAY_BLOBS: dir, PLAY_BUCKET: "" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [out, code] = await Promise.all([new Response(p.stdout).text(), p.exited]);
    return { code, report: JSON.parse(out) };
  };

  test("whole: ok", async () => {
    const { code, report } = await run();
    expect(code).toBe(0);
    expect(report).toMatchObject({ ok: true, files: 2, filesChecked: 2, problems: [] });
  });

  test("a file broken or missing: named, exit 1", async () => {
    writeFileSync(join(dir, keyOf(files[0].hash)), "cut sh");
    rmSync(join(dir, keyOf(files[1].hash)));
    const { code, report } = await run();
    expect(code).toBe(1);
    expect(report.ok).toBe(false);
    expect(report.filesChecked).toBe(0);
    expect(report.problems).toHaveLength(2);
    expect(report.problems).toContain(`file ${files[1].hash.slice(0, 12)}…: missing from the store`);
    expect(report.problems.find((p: string) => p.startsWith(`file ${files[0].hash.slice(0, 12)}…`))).toMatch(/hashing to/);
  });
});
