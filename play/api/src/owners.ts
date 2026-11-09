// Owners (play/SPEC.md "Owners"; intent 732d8a38, the first slice of Ownership 8fc46819; Samuel 2026-11-07): every
// asset and every file belongs to an account, a person's own (their human's UUID) or the Maia City coop's (./kit/ids.ts
// COOP). What a person owns is private to its owner: to anyone else, another admin included, it answers exactly as
// what never was (404 with the same words, left out of every list). This is the one place that says so: whose library
// a file is in and who may see it (the only module that reads play.files for people), which assets a person sees, and
// which intents (one whose work is another's private asset is not shown to them).
//
// A file is named by its hash, so the same bytes may be in several libraries at once: each library holding it is a row
// of play.file_owners, with that library's own label (the coop's label stays play.files.label). A file is everyone's
// (every member reads it, as every file was) while the coop's library holds it or no library row names it; one only in
// personal libraries is seen by those persons alone. An asset has one owner (play.assets.owner); only one in group
// `characters` may be a person's for now.
import { COOP } from "./kit/ids";
import type { Me } from "./access";
import type { Queryable } from "./kit/pg";
import { HttpError } from "./kit/errors";

/** the libraries a person reads: the coop's (Maia City's, its admins'), or their own personal one */
export const LIBRARIES = ["coop", "personal"] as const;
export type Library = (typeof LIBRARIES)[number];
/** the only group whose assets may be private, for now (Samuel 2026-11-07: your own character) */
export const PRIVATE_GROUPS = ["characters"] as const;

export class OwnerError extends HttpError {}

/** the account library `library` is for `me`: the coop's, or their own; undefined or "" is the coop's */
export function libraryOf(me: Pick<Me, "id">, library: unknown): { library: Library; owner: string } {
  const l = library === undefined || library === null || library === "" ? "coop" : `${library}`;
  if (!(LIBRARIES as readonly string[]).includes(l)) throw new OwnerError(`A library is ${LIBRARIES.join(" or ")}.`);
  return l === "personal" ? { library: "personal", owner: me.id } : { library: "coop", owner: COOP };
}

// ---- the rule as SQL, for the queries that hand things out ($n: the human asking, a UUID, or NULL for no one)

/** an asset row `a` that `p` sees: the coop's, or their own */
export const assetSeen = (a: string, p: string) => `(${a}.owner = '${COOP}' OR ${a}.owner = ${p}::uuid)`;
/** a file by its hash `h` that `p` sees: in the coop's library, in theirs, or in none */
export const fileSeen = (h: string, p: string) =>
  `(EXISTS (SELECT 1 FROM play.file_owners fo WHERE fo.hash = ${h} AND (fo.owner = '${COOP}' OR fo.owner = ${p}::uuid)) OR NOT EXISTS (SELECT 1 FROM play.file_owners fo WHERE fo.hash = ${h}))`;
/**
 * an intent row `i` that `p` sees: none of its work is another's private asset (its frozen version's, or an intent
 * variant of its document).
 */
export const intentSeen = (i: string, p: string) =>
  `NOT EXISTS (SELECT 1 FROM play.assets pa WHERE pa.id IN (SELECT ${i}.asset_id
       UNION ALL SELECT split_part(px.doc_id, ':', 2)::uuid FROM play.intent_variants px WHERE px.intent_id = ${i}.id AND px.doc_id LIKE 'asset:%'
       UNION ALL SELECT split_part(px.doc_id, ':', 2)::uuid FROM play.doc_variants px WHERE px.intent_id = ${i}.id AND px.doc_id LIKE 'asset:%')
     AND pa.owner <> '${COOP}' AND pa.owner IS DISTINCT FROM ${p}::uuid)`;

const who = (me: Pick<Me, "id"> | null | undefined) => me?.id ?? null;

// ---- assets

/** whether `me` sees asset `id` (false too where there is none) */
export async function seesAsset(q: Queryable, me: Pick<Me, "id"> | null, id: string): Promise<boolean> {
  const { rows } = await q.query(`SELECT 1 FROM play.assets a WHERE a.id::text = $1 AND ${assetSeen("a", "$2")}`, [id, who(me)]);
  return rows.length > 0;
}

/** asset `id`'s owner and group, or null where there is none */
export async function assetOwner(q: Queryable, id: string): Promise<{ owner: string; grp: string; private: boolean } | null> {
  const { rows } = await q.query<{ owner: string; grp: string }>(`SELECT owner::text, grp FROM play.assets WHERE id::text = $1`, [id]);
  return rows[0] ? { ...rows[0], private: rows[0].owner !== COOP } : null;
}

/** the owner a new asset gets: the coop's, or, made private (only in a private group), its proposer's */
export function newAssetOwner(me: Pick<Me, "id">, grp: string, given: unknown): string {
  if (given === undefined || given === null || given === false) return COOP;
  if (given !== true) throw new OwnerError("`private` is true or false.");
  if (!(PRIVATE_GROUPS as readonly string[]).includes(grp)) throw new OwnerError(`Only an asset in ${PRIVATE_GROUPS.join(", ")} may be private, for now.`);
  return me.id;
}

// ---- intents

/** whether `me` sees intent `id` (an intent that does not exist is the caller's to say) */
export async function seesIntent(q: Queryable, me: Pick<Me, "id"> | null, id: string): Promise<boolean> {
  const { rows } = await q.query(`SELECT 1 FROM play.intents i WHERE i.id::text = $1 AND NOT (${intentSeen("i", "$2")})`, [`${id ?? ""}`.toLowerCase(), who(me)]);
  return rows.length === 0;
}

// ---- files: the one place play.files is read for people

export type FileRow = { hash: string; size: string; media_type: string };

/** file `hash` as `me` may have it served (its size and type), or null: none kept, or another's alone */
export async function fileFor(q: Queryable, me: Pick<Me, "id"> | null, hash: string): Promise<FileRow | null> {
  const { rows } = await q.query<FileRow>(`SELECT f.hash, f.size, f.media_type FROM play.files f WHERE f.hash = $1 AND ${fileSeen("f.hash", "$2")}`, [hash, who(me)]);
  return rows[0] ?? null;
}

/** whether play keeps file `hash` and it is not `me`'s to see (the bytes in the store are then never handed out) */
export async function fileHidden(q: Queryable, me: Pick<Me, "id"> | null, hash: string): Promise<boolean> {
  const { rows } = await q.query(`SELECT 1 FROM play.files f WHERE f.hash = $1 AND NOT ${fileSeen("f.hash", "$2")}`, [hash, who(me)]);
  return rows.length > 0;
}

/**
 * The media types of the files of `hashes` that `me` sees (`me` null: everyone's files alone, what a coop's story or
 * a public asset may name, so that no one is shown a file they can't open).
 */
export async function fileTypes(q: Queryable, hashes: string[], me: Pick<Me, "id"> | null = null): Promise<Map<string, string>> {
  if (!hashes.length) return new Map();
  const { rows } = await q.query<{ hash: string; media_type: string }>(`SELECT f.hash, f.media_type FROM play.files f WHERE f.hash = ANY($1) AND ${fileSeen("f.hash", "$2")}`, [hashes, who(me)]);
  return new Map(rows.map((r) => [r.hash, r.media_type]));
}

/**
 * A file kept among play's files (its bytes already in the store) and in `owner`'s library (the coop's where none is
 * named). The coop's label is play.files.label (a new one replacing the old where `relabel`, none keeping it); a
 * person's is their library row's. Bytes that were everyone's before stay everyone's.
 */
export async function keepFile(q: Queryable, f: { hash: string; size: number; media_type: string; bucket_key: string; label?: string | null }, o: { owner?: string; relabel?: boolean } = {}) {
  const owner = o.owner ?? COOP;
  const coop = owner === COOP;
  const label = f.label ?? null;
  const { rows: had } = await q.query(`SELECT 1 FROM play.files WHERE hash = $1`, [f.hash]);
  await q.query(
    `INSERT INTO play.files (hash, size, media_type, bucket_key, label) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (hash) DO ${coop && o.relabel ? "UPDATE SET label = COALESCE(EXCLUDED.label, play.files.label)" : "NOTHING"}`,
    [f.hash, f.size, f.media_type, f.bucket_key, coop ? label : null],
  );
  // a file kept before any library named it was everyone's: it stays the coop's too
  if (had.length && !coop)
    await q.query(`INSERT INTO play.file_owners (hash, owner) SELECT $1, '${COOP}' WHERE NOT EXISTS (SELECT 1 FROM play.file_owners WHERE hash = $1)`, [f.hash]);
  await q.query(
    `INSERT INTO play.file_owners (hash, owner, label) VALUES ($1, $2, $3) ON CONFLICT (hash, owner) DO UPDATE SET label = COALESCE(EXCLUDED.label, play.file_owners.label)`,
    [f.hash, owner, coop ? null : label],
  );
}

/** the kind a file is shown as in the Library, by its media type (a document is Markdown) */
const KIND = `(CASE WHEN f.media_type = 'text/markdown' THEN 'document' ELSE split_part(f.media_type, '/', 1) END)`;

/** one page of `owner`'s library: its files of `kinds` whose label or hash holds `q`, newest first; how many of each kind; how many in all */
export async function libraryPage(q: Queryable, owner: string, o: { kinds: string[]; all: string[]; q: string; limit: number; offset: number }) {
  const coop = owner === COOP;
  // the coop's: every file everyone sees, its label play.files'; a person's: their rows, each with its own label
  const from = coop ? `play.files f` : `play.file_owners o JOIN play.files f ON f.hash = o.hash`;
  const label = coop ? "f.label" : "o.label";
  const created = coop ? "f.created" : "o.created";
  // $1 the kinds, $2 the words, $3 the owner
  const where = `${coop ? `${fileSeen("f.hash", "NULL")} AND $3::uuid IS NOT NULL` : `o.owner = $3::uuid`} AND ${KIND} = ANY($1) AND ($2 = '' OR lower(coalesce(${label}, '')) LIKE '%' || $2 || '%' OR f.hash LIKE $2 || '%')`;
  const { rows } = await q.query<{ hash: string; size: string; media_type: string; created: Date; label: string | null }>(
    `SELECT f.hash, f.size, f.media_type, ${created} AS created, ${label} AS label FROM ${from} WHERE ${where} ORDER BY ${created} DESC, f.hash LIMIT $4 OFFSET $5`,
    [o.kinds, o.q, owner, o.limit, o.offset],
  );
  const counts = await q.query<{ kind: string; n: string }>(`SELECT ${KIND} AS kind, count(*) AS n FROM ${from} WHERE ${where} GROUP BY 1`, [o.all, o.q, owner]);
  const total = (await q.query<{ n: string }>(`SELECT count(*) AS n FROM ${from} WHERE ${where}`, [o.kinds, o.q, owner])).rows[0];
  return { rows, counts: counts.rows, total: Number(total?.n ?? 0) };
}

/** A file's label in `owner`'s library (the coop's: play.files.label); null where that library holds no such file. */
export async function relabel(q: Queryable, owner: string, hash: string, label: string | null): Promise<{ hash: string; label: string | null } | null> {
  if (owner === COOP) {
    const { rows } = await q.query<{ hash: string; label: string | null }>(`UPDATE play.files f SET label = $2 WHERE f.hash = $1 AND ${fileSeen("f.hash", "NULL")} RETURNING f.hash, f.label`, [hash, label]);
    return rows[0] ?? null;
  }
  const { rows } = await q.query<{ hash: string; label: string | null }>(`UPDATE play.file_owners SET label = $3 WHERE hash = $1 AND owner = $2::uuid RETURNING hash, label`, [hash, owner, label]);
  return rows[0] ?? null;
}

// ---- the admins' database window (./tables.ts): the rows of another's private things are left out there too

/** a document id `d` (`<kind>:<uuid>`) that `p` sees: none but an asset's may be private */
const docSeen = (d: string, p: string) => `NOT EXISTS (SELECT 1 FROM play.assets pa WHERE 'asset:' || pa.id::text = ${d} AND NOT ${assetSeen("pa", p)})`;
/** by table, the SQL of its rows (`t`) that `p` sees, where a row may be of another's private thing */
export const ROWS_SEEN: Record<string, (t: string, p: string) => string> = {
  assets: (t, p) => assetSeen(t, p),
  asset_versions: (t, p) => `EXISTS (SELECT 1 FROM play.assets pa WHERE pa.id = ${t}.asset_id AND ${assetSeen("pa", p)})`,
  asset_variants: (t, p) => `EXISTS (SELECT 1 FROM play.asset_versions pv JOIN play.assets pa ON pa.id = pv.asset_id WHERE pv.id = ${t}.version_id AND ${assetSeen("pa", p)})`,
  files: (t, p) => fileSeen(`${t}.hash`, p),
  file_owners: (t, p) => `(${t}.owner = '${COOP}' OR ${t}.owner = ${p}::uuid)`,
  docs: (t, p) => docSeen(`${t}.id`, p),
  doc_edits: (t, p) => docSeen(`${t}.doc_id`, p),
  doc_peers: (t, p) => docSeen(`${t}.doc_id`, p),
  doc_variants: (t, p) => docSeen(`${t}.doc_id`, p),
  doc_versions: (t, p) => docSeen(`${t}.doc_id`, p),
  intents: (t, p) => intentSeen(t, p),
  intent_variants: (t, p) => `EXISTS (SELECT 1 FROM play.intents pi WHERE pi.id = ${t}.intent_id AND ${intentSeen("pi", p)})`,
  intent_depends: (t, p) => `EXISTS (SELECT 1 FROM play.intents pi WHERE pi.id = ${t}.intent_id AND ${intentSeen("pi", p)})`,
};

// ---- the board's edges: an intent another can't see is shown on theirs as "a private intent", no id, no title

/** what an edge to an intent `me` can't see shows */
export const PRIVATE_INTENT = "a private intent";
const EDGE_KEYS = ["depends_on", "needed_by", "held_by"] as const;

/**
 * `out` (an intent, a list of them, or any answer holding them) as `me` may read it: every dependency edge to an
 * intent whose work is another's private asset shows "a private intent" with no id, its title gone from the sub-state's
 * reason too. Nothing else changes (how many hold it, their stages).
 */
export async function maskEdges<T>(q: Queryable, me: Pick<Me, "id"> | null, out: T): Promise<T> {
  const ids = new Set<string>();
  const walk = (x: any) => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    for (const k of EDGE_KEYS) if (Array.isArray(x[k])) for (const e of x[k]) if (typeof e?.id === "string") ids.add(e.id);
    Object.values(x).forEach(walk);
  };
  walk(out);
  if (!ids.size) return out;
  const { rows } = await q.query<{ id: string; title: string }>(`SELECT i.id::text, i.title FROM play.intents i WHERE i.id::text = ANY($1) AND NOT (${intentSeen("i", "$2")})`, [[...ids], who(me)]);
  if (!rows.length) return out;
  const hidden = new Map(rows.map((r) => [r.id, r.title]));
  const titles = [...new Set(rows.map((r) => r.title))].filter(Boolean).sort((a, b) => b.length - a.length);
  const mask = (x: any): any => {
    if (Array.isArray(x)) return x.map(mask);
    if (!x || typeof x !== "object" || x instanceof Date) return x;
    const o: any = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, mask(v)]));
    for (const k of EDGE_KEYS)
      if (Array.isArray(x[k])) o[k] = x[k].map((e: any) => (typeof e?.id === "string" && hidden.has(e.id) ? { id: null, title: PRIVATE_INTENT, stage: e.stage } : mask(e)));
    if (o.sub && typeof o.sub.why === "string") for (const t of titles) o.sub = { ...o.sub, why: o.sub.why.split(t).join(PRIVATE_INTENT) };
    return o;
  };
  return mask(out);
}
