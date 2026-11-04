// play-api: one Bun process behind Caddy at play.maia.city/api (play/SPEC.md §2)
import { app } from "./app";
import { initSessions } from "./auth";
import { blobStore } from "./blobs";
import { migrate } from "./migrations";
import { connect } from "./pg";
import { siteHandler } from "./site";

const db = connect();
const ran = await migrate(db);
if (ran.length) console.log(`migrations: ${ran.join(", ")}`);
await initSessions(db);
const { fetch } = app({ db, store: blobStore() });
// the site too, where PLAY_SITE names its build (the image's /app/site): everything outside /api
const site = process.env.PLAY_SITE ? siteHandler(process.env.PLAY_SITE) : null;
// a request that waits on the database longer than Bun's default 10 s was cut off, and Caddy answered 502 to the page
// (the asset viewer's "HTTP 502", 2026-11-04): it may take up to two minutes, and one that takes over two seconds says
// so in the log, with its path, so the next slow minute shows what was slow
const SLOW_MS = 2000;
const api = async (req: Request, srv: Parameters<typeof fetch>[1]) => {
  const t0 = performance.now();
  try {
    return await fetch(req, srv);
  } finally {
    const ms = performance.now() - t0;
    if (ms > SLOW_MS) console.warn(`slow: ${req.method} ${new URL(req.url).pathname} ${Math.round(ms)} ms`);
  }
};
const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  maxRequestBodySize: 64 * 1024 * 1024,
  idleTimeout: 120,
  fetch: (req, srv) => (site && !new URL(req.url).pathname.startsWith("/api/") ? site(req) : api(req, srv)),
});
console.log(`play-api on :${server.port}`);
