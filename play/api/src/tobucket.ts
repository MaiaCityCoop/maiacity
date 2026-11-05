// bun src/tobucket.ts — play's files from the folder on the server's volume (PLAY_BLOBS) into the bucket (PLAY_BUCKET…),
// before play is run on the bucket (.github/workflows/production.yml). Every file the database names that the bucket
// lacks is copied with its media type, and only if its bytes hash to its name: a file broken in the folder (a write cut
// short by a full disk) is named, not copied (it was lost already; deploy/server-care.sh mends what a backup holds). Run
// again, it copies only what is still missing. Prints what it did as JSON; a copy that fails stops it (exit 1).
import { bucketStore, folderStore } from "./blobs";
import { connect } from "./pg";

const db = connect();
const folder = folderStore(process.env.PLAY_BLOBS || "blobs");
const bucket = bucketStore();
const { rows } = await db.query<{ hash: string; media_type: string }>(`SELECT hash, media_type FROM play.files ORDER BY hash`);
let copied = 0, there = 0, bytes = 0;
const broken: string[] = [];
let next = 0;
// a few at a time: the bucket answers each in a round trip
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let i = next++; i < rows.length; i = next++) {
    const { hash, media_type } = rows[i];
    if (await bucket.has(hash)) { there++; continue; }
    const b = await folder.get(hash).catch(() => undefined);
    if (!b) { broken.push(hash); continue; }
    await bucket.put(hash, b, media_type);
    copied++;
    bytes += b.length;
  }
}));
console.log(JSON.stringify({ files: rows.length, alreadyInBucket: there, copied, copiedMB: +(bytes / 1048576).toFixed(1), brokenOrMissing: broken }));
process.exit(0);
