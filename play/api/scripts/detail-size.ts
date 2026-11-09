#!/usr/bin/env bun
// The size of an intent's detail (intent 2df30a21, check c1): a database of its own on avenBOX's Postgres
// (TEST_DATABASE_URL, else the box's), migrated, with an intent like 873c6ef2 (31 documents: pieces, several in two
// versions, with motion data, and the hosts requiring them) at Proposal; GET /api/intents/:id as an admin. Prints its
// KB and the time it took, and exits 0 only under --max-kb (150 by default).
//
//   cd play/api && bun scripts/detail-size.ts [--max-kb 150]
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { Rate } from "../src/limits";
import { migrate } from "../src/migrations";
import { fromBunSql } from "../src/kit/pg";
import { heavy } from "./heavy";

const args = process.argv.slice(2);
const at = args.indexOf("--max-kb");
const MAX = at >= 0 ? Number(args[at + 1]) : 150;
const URL_ = process.env.TEST_DATABASE_URL || "postgres://postgres:play@127.0.0.1:5432/postgres";

const name = `play_detailsize_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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
  const store = folderStore(mkdtempSync(join(tmpdir(), "play-detailsize-")));
  const ada = (await createHuman(db, "ada")).id;
  await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [ada]);
  // 873c6ef2's shape: 31 documents (13 pieces, 8 of them in two versions, and 10 hosts), about 100 KB each
  const h = await heavy(db, store, ada, { title: "A heavy intent, like 873c6ef2", pieces: 13, versions: 8, hosts: 10, kb: 100 });
  const held = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM play.intent_variants WHERE intent_id = $1`, [h.intent])).rows[0].n;
  const stage = (await db.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1`, [h.intent])).rows[0].stage;
  const api = app({ db, store, rate: new Rate(0) });
  const t = performance.now();
  const r = await api.fetch(new Request(`http://play.test/api/intents/${h.intent}`, { headers: { cookie: `play_session=${tokenFor(ada)}` } }));
  const body = await r.arrayBuffer();
  const ms = Math.round(performance.now() - t);
  const kb = Math.round(body.byteLength / 102.4) / 10;
  const docs = r.ok ? (JSON.parse(new TextDecoder().decode(body)).review?.docs?.length ?? 0) : 0;
  console.log(`an intent of ${held} documents at ${stage}: GET /api/intents/:id answered ${r.status}, ${kb} KB in ${ms} ms (${docs} documents listed); at most ${MAX} KB`);
  code = r.ok && docs === held && kb < MAX ? 0 : 1;
  if (r.ok && docs !== held) console.log(`its review lists ${docs} documents, not the ${held} it holds`);
} finally {
  await sql.close();
  await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.close();
}
process.exit(code);
