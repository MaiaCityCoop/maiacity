// The site, served by play-api beside /api (play/SPEC.md §2): the static SvelteKit build in PLAY_SITE, its hashed
// chunks cached for good, every page that isn't a file answered by the app's fallback page (200.html). What a page
// loads as a file (its build under /_app/, a frozen engine under /engines/) and is not there is a 404, never the page
// (intent 8333276b: a tab open across a deploy asked for a chunk of the build before, got the page as text/html, and
// Safari refused it as a script).
import { join, normalize } from "node:path";

const TYPES: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml", ".wasm": "application/wasm" };

/** where only files live: hashed for good, and a path there that is no file is gone, not a page */
const FILES = ["/_app/", "/engines/"];

export function siteHandler(dir: string) {
  const root = normalize(dir);
  return async (req: Request): Promise<Response> => {
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    const path = decodeURIComponent(new URL(req.url).pathname);
    const candidates = path.endsWith("/") ? [join(path, "index.html")] : [path, join(path, "index.html")];
    for (const c of candidates) {
      const file = normalize(join(root, c));
      if (!file.startsWith(root)) break; // never outside the build
      const f = Bun.file(file);
      if (await f.exists()) {
        const ext = file.slice(file.lastIndexOf("."));
        const immutable = c.startsWith("/_app/immutable/") || c.startsWith("/engines/");
        return new Response(f, {
          headers: {
            "Content-Type": TYPES[ext] ?? f.type,
            "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }
    if (FILES.some((f) => path.startsWith(f)))
      return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    return new Response(Bun.file(join(root, "200.html")), { headers: { "Content-Type": TYPES[".html"], "Cache-Control": "no-cache" } });
  };
}
