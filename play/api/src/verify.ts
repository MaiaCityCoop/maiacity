// bun src/verify.ts — whether a play database and its files belong together, as a restore needs them to
// (.github/workflows/restore.yml): every file play.files names is in the store (PLAY_BLOBS or the bucket) and its bytes
// hash to its name; every asset's head is one of its versions; every version's recipe is a file play keeps. Prints what
// it counted and found as JSON, and exits 1 on any problem. Reads only.
import { connect } from "./pg";
import { blobStore } from "./blobs";

const db = connect();
const store = blobStore();
const problems: string[] = [];

const { rows: files } = await db.query<{ hash: string }>(`SELECT hash FROM play.files`);
let checked = 0;
for (const { hash } of files) {
  // the store checks the bytes against their hash as it reads them, and throws if they don't match
  const bytes = await store.get(hash).catch((e) => (problems.push(`file ${hash.slice(0, 12)}…: ${(e as Error).message}`), undefined));
  if (bytes === null) problems.push(`file ${hash.slice(0, 12)}…: missing from the store`);
  else if (bytes) checked++;
}
const { rows: heads } = await db.query<{ id: string }>(
  `SELECT a.id FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = a.head AND v.asset_id = a.id WHERE a.head IS NOT NULL AND v.id IS NULL`,
);
for (const h of heads) problems.push(`asset ${h.id}: its head is none of its versions`);
const { rows: recipes } = await db.query<{ id: string }>(
  `SELECT v.id FROM play.asset_versions v LEFT JOIN play.files f ON f.hash = v.recipe_hash WHERE v.recipe_hash IS NOT NULL AND f.hash IS NULL`,
);
for (const r of recipes) problems.push(`version ${r.id.slice(0, 12)}…: its recipe is no file play keeps`);
const count = async (t: string) => Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM play.${t}`)).rows[0].n);
const report = {
  ok: problems.length === 0,
  files: files.length,
  filesChecked: checked,
  assets: await count("assets"),
  versions: await count("asset_versions"),
  humans: await count("humans"),
  proposals: await count("proposals"),
  problems: problems.slice(0, 50),
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
