// A document's intent variant in brief (intent 2df30a21): what an intent's detail lists of every document it changes,
// without its content. Reading a document's variant means loading it in Loro, a quarter of a second for one of
// 100 KB, so the brief is kept on the variant's row (play.doc_variants.gist) for the edits it holds, made when it is
// proposed (./held.ts holdVariant) and again whenever it has a newer edit. The whole of what it changes is read only
// when that one document is opened (./review.ts reviewHeld, GET /api/intents/:id/docs/:doc).
import * as docs from "./docs";
import { hashText } from "./kit/hash";
import type { Queryable } from "./kit/pg";
import { piecesOf } from "./pieces";

/** a variant in brief: its label and group, how many fields it changes against its seed and which (at most FIELDS), its source's hash and the pieces its sources require */
type Gist = { seq: string; label: string | null; group: string | null; changes: number; fields: string[]; hash: string | null; requires: string[] };

const FIELDS = 8;

/** the top field a change's path names: "$.tracks[2].clips" → "tracks" */
const topField = (path: string) => path.replace(/^\$\.?/, "").split(/[.[]/)[0] || "(the whole)";

/** variant `v` of document `docId` in brief: kept on its row, worked out again once it has a newer edit */
export async function gistOf(q: Queryable, docId: string, v: number): Promise<Gist> {
  const { rows } = await q.query<{ gist: Gist | null; seq: string | null }>(
    `SELECT v.gist, (SELECT max(seq) FROM play.doc_edits WHERE variant = $1)::text AS seq FROM play.doc_variants v WHERE v.id = $1`,
    [v],
  );
  const seq = rows[0]?.seq ?? "0";
  if (rows[0]?.gist && rows[0].gist.seq === seq) return rows[0].gist;
  const next = (await docs.readDoc(q, docId, { variant: v })).json;
  let changes = docs.diff(await docs.seedOf(q, docId, v), next);
  // a new document is one change of the whole: listed as the fields it brings
  if (changes.length === 1 && changes[0].path === "$" && next && typeof next === "object" && !Array.isArray(next))
    changes = Object.keys(next).map((k) => ({ path: `$.${k}`, kind: "added" as const, to: next[k] }));
  const sources = [next?.source, ...(Array.isArray(next?.variants) ? next.variants.map((x: any) => x?.source) : [])].filter((x): x is string => typeof x === "string");
  const label = next?.label ?? next?.title ?? null;
  const g: Gist = {
    seq,
    label: label == null ? null : `${label}`,
    group: typeof next?.group === "string" ? next.group : null,
    changes: changes.length,
    fields: [...new Set(changes.map((c) => topField(c.path)))].slice(0, FIELDS),
    hash: typeof next?.source === "string" ? hashText(next.source) : null,
    requires: [...new Set(sources.flatMap(piecesOf))],
  };
  if (rows[0]) await q.query(`UPDATE play.doc_variants SET gist = ($2::text)::jsonb WHERE id = $1`, [v, JSON.stringify(g)]);
  return g;
}
