#!/usr/bin/env bun
// A database for a look at the intents' board (intent 2df30a21, check c5): migrated, an admin, and one intent shaped
// like 99b612ec at Proposal (8 pieces in dependency order, 3 in two versions, ~100 KB of motion data each, and 2 assets
// requiring them). Prints the database's URL, the admin's session cookie and the intent's id as JSON; the dev server
// is then run on it (DATABASE_URL, PLAY_BLOBS).
//
//   cd play/api && bun scripts/seed-look.ts <database name> <blobs folder>
import { initSessions, createHuman, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { migrate } from "../src/migrations";
import { fromBunSql } from "../src/pg";
import { heavy } from "./heavy";

const [name, blobs] = process.argv.slice(2);
if (!/^[a-z_][a-z0-9_]*$/.test(name ?? "") || !blobs) throw new Error("usage: bun scripts/seed-look.ts <database name> <blobs folder>");
const URL_ = process.env.TEST_DATABASE_URL || "postgres://postgres:play@127.0.0.1:5432/postgres";
const admin = new Bun.SQL(URL_);
await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
await admin.unsafe(`CREATE DATABASE ${name}`);
await admin.close();
const u = new URL(URL_);
u.pathname = `/${name}`;
const sql = new Bun.SQL(u.toString());
const db = fromBunSql(sql);
await migrate(db);
await initSessions(db);
const sam = (await createHuman(db, "Samuel")).id;
await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [sam]);
const h = await heavy(db, folderStore(blobs), sam, {
  title: "People move like people: an open standard skeleton, open-licensed motion capture, feet planted on the ground",
  pieces: 8, versions: 3, hosts: 2, kb: 100,
  labels: ["Person skeleton", "Person head", "Gait and reach", "Motion: a man's gait", "Motion: an elder's gait", "Motion: everyday actions", "Person body", "Person motion"],
  hostLabels: ["Stand-in", "Elder woman"],
});
await sql.close();
console.log(JSON.stringify({ database: u.toString(), cookie: `play_session=${tokenFor(sam)}`, intent: h.intent }));
