// The Library (Samuel 2026-11-04): every image, video and recording play keeps among its files (play.files, the bytes in
// the bucket), newest first, each with its label and where the newest version of every story uses it (a shot's still or
// video, a clip's recording), and which asset versions name it as their reference sheet (a plant's plate, Samuel
// 2026-11-05). Admins only. A file is named by its BLAKE3 hash; its label is only shown, and an admin may
// rename it here.

import type { Queryable } from "./pg";
import { admin, type Me } from "./access";
import { HASH } from "./hash";
import { fileLabel, StoryError, type StoryBody } from "./stories";

// a document is Markdown (text/markdown: a plant's data sheet, its sheet's brief); recipe sources (text/javascript) are not shown
export const LIBRARY_KINDS = ["image", "video", "audio", "document"] as const;
type Kind = (typeof LIBRARY_KINDS)[number];

export type StoryUse = { story: string; title: string; number: number | null; track: string; clip: string; as: "frame" | "video" | "audio"; at: number };
/** an asset version whose record names the file as its reference sheet: accepted (a version of the asset) or proposed */
export type SheetUse = { asset: string; label: string; group: string; number: number | null; version: string; as: "sheet" | "datasheet" | "brief"; accepted: boolean };
export type Use = StoryUse | SheetUse;
export type LibraryFile = { hash: string; size: number; media_type: string; created: string; label: string | null; used: Use[] };

const LIBRARY_ADMINS = "Only Maia City's admins open the Library.";

/** where the newest version of every story uses each file: a shot's frame or video, any clip's recording */
async function usesOf(db: Queryable): Promise<Map<string, Use[]>> {
  const { rows } = await db.query<{ id: string; title: string; number: number | null; body: StoryBody }>(
    `SELECT s.id, s.title, v.number, v.body FROM play.stories s JOIN play.story_versions v ON v.id = s.head WHERE s.folded_into IS NULL`,
  );
  const out = new Map<string, Use[]>();
  const add = (hash: unknown, use: Use) => {
    if (typeof hash !== "string" || !HASH.test(hash)) return;
    const list = out.get(hash) ?? [];
    list.push(use);
    out.set(hash, list);
  };
  // every asset version naming its documents (its reference sheet, data sheet, brief): the accepted ones, and those an
  // intent at Proposal would make
  const { rows: docs } = await db.query<{ asset: string; label: string; grp: string; number: number | null; version: string; sheet: string | null; datasheet: string | null; brief: string | null; accepted: boolean }>(
    `SELECT a.id AS asset, a.label, a.grp, v.number, v.id AS version, v.card->>'sheet' AS sheet, v.card->>'datasheet' AS datasheet,
            v.card->>'brief' AS brief, v.number IS NOT NULL AS accepted
       FROM play.asset_versions v JOIN play.assets a ON a.id = v.asset_id
      WHERE (v.card ? 'sheet' OR v.card ? 'datasheet' OR v.card ? 'brief')
        AND (v.number IS NOT NULL OR EXISTS (SELECT 1 FROM play.intents i WHERE i.version = v.id AND i.stage = 'proposal'))
      ORDER BY a.label, v.number NULLS LAST`,
  );
  for (const d of docs)
    for (const as of ["sheet", "datasheet", "brief"] as const)
      if (d[as]) add(d[as], { asset: d.asset, label: d.label, group: d.grp, number: d.number, version: d.version, as, accepted: d.accepted });
  for (const r of rows)
    for (const t of r.body?.tracks ?? [])
      for (const c of t.clips ?? []) {
        const base = { story: r.id, title: r.title, number: r.number, track: t.id, clip: c.id, at: c.at };
        if (t.kind === "shots") {
          add(c.frame, { ...base, as: "frame" });
          add((c as { video?: unknown }).video, { ...base, as: "video" });
        }
        add((c as { audio?: unknown }).audio, { ...base, as: "audio" });
      }
  return out;
}

/** The Library's files, newest first: of one kind or every kind, those whose label or hash holds `q`, a page at a time */
export async function listLibrary(db: Queryable, me: Me | null, o: { kind?: string | null; q?: string | null; offset?: number; limit?: number } = {}) {
  admin(me, LIBRARY_ADMINS);
  const kinds: Kind[] = o.kind ? [o.kind as Kind] : [...LIBRARY_KINDS];
  if (!kinds.every((k) => (LIBRARY_KINDS as readonly string[]).includes(k))) throw new StoryError(`A kind is one of ${LIBRARY_KINDS.join(", ")}.`);
  const limit = Math.max(1, Math.min(200, Math.floor(o.limit ?? 60)));
  const offset = Math.max(0, Math.floor(o.offset ?? 0));
  const q = (o.q ?? "").trim().toLowerCase();
  const where = `(CASE WHEN media_type = 'text/markdown' THEN 'document' ELSE split_part(media_type, '/', 1) END) = ANY($1) AND ($2 = '' OR lower(coalesce(label, '')) LIKE '%' || $2 || '%' OR hash LIKE $2 || '%')`;
  const { rows } = await db.query<{ hash: string; size: string; media_type: string; created: Date; label: string | null }>(
    `SELECT hash, size, media_type, created, label FROM play.files WHERE ${where} ORDER BY created DESC, hash LIMIT $3 OFFSET $4`,
    [kinds, q, limit, offset],
  );
  const counts = await db.query<{ kind: string; n: string }>(
    `SELECT (CASE WHEN media_type = 'text/markdown' THEN 'document' ELSE split_part(media_type, '/', 1) END) AS kind, count(*) AS n FROM play.files WHERE ${where} GROUP BY 1`,
    [LIBRARY_KINDS as unknown as string[], q],
  );
  const total = (await db.query<{ n: string }>(`SELECT count(*) AS n FROM play.files WHERE ${where}`, [kinds, q])).rows[0];
  const uses = await usesOf(db);
  return {
    total: Number(total?.n ?? 0),
    offset,
    limit,
    counts: Object.fromEntries(LIBRARY_KINDS.map((k) => [k, Number(counts.rows.find((c) => c.kind === k)?.n ?? 0)])),
    files: rows.map(
      (r): LibraryFile => ({ hash: r.hash, size: Number(r.size), media_type: r.media_type, created: new Date(r.created).toISOString(), label: r.label, used: uses.get(r.hash) ?? [] }),
    ),
  };
}

/** Rename a file in the Library (its label only; the file stays named by its hash). An empty label removes it. */
export async function labelFile(db: Queryable, me: Me | null, hash: string, label: unknown) {
  admin(me, LIBRARY_ADMINS);
  if (!HASH.test(hash)) throw new StoryError("A file is named by its hash.");
  const l = fileLabel(label) ?? null;
  const { rows } = await db.query<{ hash: string; label: string | null }>(`UPDATE play.files SET label = $2 WHERE hash = $1 RETURNING hash, label`, [hash, l]);
  if (!rows.length) throw new StoryError("No file is kept by that hash.", 404);
  return rows[0];
}
