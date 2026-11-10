// The site served beside /api (../src/site.ts siteHandler): files of the build with their media types, hashed chunks
// cached for good and everything else revalidated, every page that isn't a file answered by 200.html, nothing read
// from outside the build, only GET and HEAD.
import { beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siteHandler } from "../src/site";

describe("the site", () => {
  let handle: (req: Request) => Promise<Response>;
  beforeAll(() => {
    const top = mkdtempSync(join(tmpdir(), "play-site-"));
    writeFileSync(join(top, "secret.txt"), "outside the build");
    const dir = join(top, "build");
    for (const d of ["_app/immutable/chunks", "engines", "assets"]) mkdirSync(join(dir, d), { recursive: true });
    writeFileSync(join(dir, "200.html"), "<p>fallback</p>");
    writeFileSync(join(dir, "index.html"), "<p>home</p>");
    writeFileSync(join(dir, "assets/index.html"), "<p>assets</p>");
    writeFileSync(join(dir, "_app/immutable/chunks/a1b2.js"), "export {}");
    writeFileSync(join(dir, "engines/box.wasm"), new Uint8Array([0, 97, 115, 109]));
    writeFileSync(join(dir, "favicon.svg"), "<svg/>");
    handle = siteHandler(dir);
  });
  const get = (path: string, method = "GET") => handle(new Request(`http://play.test${path}`, { method }));

  test("a page's index.html, revalidated each time", async () => {
    for (const p of ["/", "/assets", "/assets/"]) {
      const r = await get(p);
      expect(r.status).toBe(200);
      expect(r.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
      expect(r.headers.get("Cache-Control")).toBe("no-cache");
      expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
    expect(await (await get("/")).text()).toBe("<p>home</p>");
    expect(await (await get("/assets")).text()).toBe("<p>assets</p>");
  });

  test("hashed chunks and engines cached for good, with their media types", async () => {
    const js = await get("/_app/immutable/chunks/a1b2.js");
    expect(js.headers.get("Content-Type")).toBe("text/javascript");
    expect(js.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    const wasm = await get("/engines/box.wasm");
    expect(wasm.headers.get("Content-Type")).toBe("application/wasm");
    expect(wasm.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    const svg = await get("/favicon.svg");
    expect(svg.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(svg.headers.get("Cache-Control")).toBe("no-cache");
  });

  test("a page that is no file: the app's 200.html", async () => {
    const r = await get("/intents/0b9e8c4e-0000-4000-8000-000000000000/");
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(await r.text()).toBe("<p>fallback</p>");
  });

  test("never a file outside the build", async () => {
    const r = await get("/..%2fsecret.txt");
    expect(await r.text()).toBe("<p>fallback</p>");
  });

  test("only GET and HEAD", async () => {
    expect((await get("/", "HEAD")).status).toBe(200);
    expect((await get("/", "POST")).status).toBe(405);
  });
});
