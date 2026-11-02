// play-api: one Bun process behind Caddy at play.maia.city/api (play/SPEC.md §2)
import { app } from "./app";
import { initSessions } from "./auth";
import { blobStore } from "./blobs";
import { migrate } from "./migrations";
import { connect } from "./pg";

const db = connect();
const ran = await migrate(db);
if (ran.length) console.log(`migrations: ${ran.join(", ")}`);
await initSessions(db);
const { fetch } = app({ db, store: blobStore() });
const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), maxRequestBodySize: 64 * 1024 * 1024, fetch });
console.log(`play-api on :${server.port}`);
