// play-api: one Bun process behind Caddy at play.maia.city/api (play/SPEC.md §2)
import { app } from "./app";
import { initSessions } from "./auth";
import { blobStore } from "./blobs";
import { migrate } from "./migrations";
import { connect } from "./pg";
import { siteHandler } from "./site";
import { reconcile, runningCommit, shipGitHub, startShipWatcher } from "./ship";
import { syncKinds } from "./versioned";

const db = connect();
const ran = await migrate(db);
if (ran.length) console.log(`migrations: ${ran.join(", ")}`);
await initSessions(db);
// every accepted schema whose documents no kind of the code holds is a kind of its own (./versioned.ts)
await syncKinds(db);
// Accept ships it (./ship.ts): with SHIP_TOKEN, an admin's Accept puts an intent in Ship, and the ship watcher (every
// 10 s) merges its pull request when its turn comes and GitHub is ready, and follows it to production; without it, Accept on a code intent is refused and says why
const github = shipGitHub();
const stopWatcher = github ? startShipWatcher(db, github) : null;
// once as play starts (a deploy, a rollback, a deploy by hand all start it): every code intent's stage held to the
// commit it runs (./ship.ts reconcile), in the background
const commit = runningCommit();
if (github && commit) void reconcile(db, github, commit).then(
  (r) => console.log(`reconcile at ${commit.slice(0, 7)}: ${r.accepted.length} accepted, ${r.flagged.length} not live, ${r.cleared.length} live again`),
  (e) => console.warn(`reconcile: not done as play started: ${(e as Error).message}`),
);
else console.log(`reconcile: ${commit ? "no SHIP_TOKEN" : "no PLAY_COMMIT"}: code intents are not reconciled here`);
if (!github) console.log("ship: no SHIP_TOKEN: code intents are not shipped from here");
const { fetch } = app({ db, store: blobStore(), github });
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

// Stopped gracefully on SIGTERM (docker stop, the deploy's recreate) and SIGINT (intent 5ab64b8e): no new connection
// taken, the requests in flight answered, the pool closed, exit 0 — in about a second, not Docker's 10 s wait and its
// SIGKILL, which cut every request in flight at each deploy. One that hangs past STOP_MS is cut then.
const STOP_MS = 8000;
let stopping = false;
const stop = async (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(`play-api: ${signal}: stopping (the requests in flight answered first)`);
  stopWatcher?.();
  const cut = setTimeout(() => {
    console.warn(`play-api: requests still open after ${STOP_MS} ms: cut`);
    server.stop(true);
  }, STOP_MS);
  try {
    await server.stop();
    clearTimeout(cut);
    await db.close?.();
  } catch (e) {
    console.warn(`play-api: stopping: ${(e as Error).message}`);
  }
  process.exit(0);
};
process.on("SIGTERM", () => void stop("SIGTERM"));
process.on("SIGINT", () => void stop("SIGINT"));
