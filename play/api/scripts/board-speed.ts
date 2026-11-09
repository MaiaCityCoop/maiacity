// How fast the intents' board's first answer is (intent 2cb70fb8-fbbf-4473-8ac1-b8d3bb078147, check c3): against
// avenBOX's Postgres (TEST_DATABASE_URL), a database of its own seeded with 600 accepted, 40 archived and 40 open
// intents, GET /api/intents for the open stages and the counts (the board's first request), five times. It prints the
// median (ms) and the answer's size (KB), and exits 0 only when both are under their most:
//   bun scripts/board-speed.ts --max-ms 300 --max-kb 400
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { Rate } from "../src/limits";
import { migrate } from "../src/migrations";
import { fromBunSql } from "../src/kit/pg";
import { OPEN, seedBoard } from "../test/fixtures/board";

const { values } = parseArgs({ options: { "max-ms": { type: "string", default: "300" }, "max-kb": { type: "string", default: "400" }, runs: { type: "string", default: "5" } } });
const maxMs = Number(values["max-ms"]);
const maxKb = Number(values["max-kb"]);
const runs = Number(values.runs);
const URL_ = process.env.TEST_DATABASE_URL;
if (!URL_) {
  console.error("board-speed: TEST_DATABASE_URL is not set (avenBOX's Postgres: play/avenbox/up.sh).");
  process.exit(2);
}

const name = `play_speed_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const admin = new Bun.SQL(URL_);
await admin.unsafe(`CREATE DATABASE ${name}`);
const u = new URL(URL_);
u.pathname = `/${name}`;
const sql = new Bun.SQL(u.toString());
let code = 1;
try {
  const db = fromBunSql(sql);
  await migrate(db);
  await initSessions(db);
  const api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0) });
  const ada = await createHuman(db, "ada");
  await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [ada.id]);
  await seedBoard(db, ada.id, { idea: 8, specify: 8, build: 8, proposal: 8, ship: 8, accepted: 600, archived: 40 });
  await db.query("ANALYZE"); // as a database in use has its statistics
  const cookie = `play_session=${tokenFor(ada.id)}`;
  const path = `/api/intents?stage=${OPEN.join(",")}&counts=1`;
  const once = async () => {
    const t = performance.now();
    const r = await api.fetch(new Request(`http://play.test${path}`, { headers: { cookie } }));
    const body = await r.arrayBuffer();
    if (r.status !== 200) throw new Error(`GET ${path}: HTTP ${r.status} ${new TextDecoder().decode(body).slice(0, 300)}`);
    return { ms: performance.now() - t, kb: body.byteLength / 1024, n: (JSON.parse(new TextDecoder().decode(body)).intents as unknown[]).length };
  };
  await once(); // warm: the first query plans
  const times: number[] = [];
  let last = { ms: 0, kb: 0, n: 0 };
  for (let i = 0; i < runs; i++) times.push((last = await once()).ms);
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const ok = median < maxMs && last.kb < maxKb && last.n === 40;
  console.log(`board-speed: GET ${path} (40 open of 680): median ${median.toFixed(1)} ms of ${runs} (most ${maxMs}), ${last.kb.toFixed(1)} KB (most ${maxKb}), ${last.n} intents: ${ok ? "pass" : "FAIL"}`);
  code = ok ? 0 : 1;
} finally {
  await sql.close();
  await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.close();
}
process.exit(code);
