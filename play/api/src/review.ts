// An intent's work as people review it (play/SPEC.md §4.12, intent 2df30a21): its detail lists every document it changes
// in brief; one document's changes are read field by field when opened, with its kind's extras; the intent read whole
// with its review and its brief.
import type { Me } from "./access";
import * as docs from "./docs";
import { hashText } from "./kit/hash";
import type { Queryable } from "./kit/pg";
import { UUID } from "./kit/uuid";
import { HttpError } from "./kit/errors";
import { kindOfDoc, kindOfWork, named, versionAt } from "./kinds";
import { asOne, heldOf, workOf } from "./held";
import { gistOf } from "./gist";
import { intentFor } from "./intents";
import { briefOf } from "./skills";

/** what a held retire says on the board (./retire.ts): its reason, the document leaving every list once accepted */
const retiresOf = (h: Record<string, any>) => (h.retire ? { retires: `${h.retire}` } : {});

/** one document's intent variant as people review it: what changed, field by field, against its seed, the edits that made it, whether Main moved since */
async function reviewVariant(db: Queryable, p: any, h: { doc_id: string; doc_variant: number | null }) {
  const k = kindOfDoc(h.doc_id) ?? kindOfWork(p.kind)!;
  const docId = h.doc_id;
  const uuid = docId.split(":")[1];
  if (h.doc_variant == null) return { doc: { id: uuid, kind: k.name }, seedNumber: null, moved: false, changes: [], edits: [] };
  const v = Number(h.doc_variant);
  const versions = await docs.versionsOf(db, docId);
  const row = await docs.variantOf(db, docId, v);
  const seed = await docs.seedOf(db, docId, v);
  const next = (await docs.readDoc(db, docId, { variant: v })).json;
  const seedNumber = versionAt(versions, row.mainSeed ?? row.seed);
  const moved = p.status === "proposal" && seedNumber !== null && seedNumber !== versions.at(-1)?.number;
  const edits = await named(db, await docs.history(db, docId, { variant: v }));
  const open = k.open ? k.open.replace("{id}", encodeURIComponent(uuid)).replace("{intent}", encodeURIComponent(p.id)) : null;
  // the breed it changes, or the one it makes (play/SPEC.md "Breeds")
  const breed = row.breed !== null ? (await docs.variantsOf(db, docId)).find((b) => b.id === row.breed)?.name ?? null : row.makes;
  return { doc: { id: uuid, kind: k.name, what: k.label, label: next.label ?? next.title ?? k.label, ...(next.group ? { group: next.group } : {}), open, ...(breed ? { breed, newBreed: row.makes !== null } : {}) }, variant: v, seedNumber, moved, changes: docs.diff(seed, next), edits, ...retiresOf(h) };
}

/** One document's intent variant as an intent's detail lists it (intent 2df30a21): its document, seed version, whether
 * Main moved, status and a brief of what it changes, never its content (reviewHeld reads that; brief: ./gist.ts). */
async function listedVariant(db: Queryable, p: any, h: { doc_id: string; doc_variant: number | null }) {
  const k = kindOfDoc(h.doc_id) ?? kindOfWork(p.kind)!;
  const uuid = h.doc_id.split(":")[1];
  if (h.doc_variant == null) return { doc: { id: uuid, kind: k.name, what: k.label, label: k.label, open: null }, variant: null, seedNumber: null, moved: false, status: null, summary: { changes: 0, fields: [] } };
  const v = Number(h.doc_variant);
  const versions = await docs.versionsOf(db, h.doc_id);
  const row = await docs.variantOf(db, h.doc_id, v);
  const g = await gistOf(db, h.doc_id, v);
  const seedNumber = versionAt(versions, row.mainSeed ?? row.seed);
  const moved = p.status === "proposal" && seedNumber !== null && seedNumber !== versions.at(-1)?.number;
  const open = k.open ? k.open.replace("{id}", encodeURIComponent(uuid)).replace("{intent}", encodeURIComponent(p.id)) : null;
  const breed = row.breed !== null ? (await docs.variantsOf(db, h.doc_id)).find((b) => b.id === row.breed)?.name ?? null : row.makes;
  return {
    doc: { id: uuid, kind: k.name, what: k.label, label: g.label ?? k.label, ...(g.group ? { group: g.group } : {}), open, ...(breed ? { breed, newBreed: row.makes !== null } : {}) },
    variant: v, seedNumber, moved, status: row.status, summary: { changes: g.changes, fields: g.fields }, ...retiresOf(h),
  };
}

/** An intent's work as its detail shows it (intent 2df30a21: opened in about a second, whatever it holds): its first
 * document's kind's extras and edits, every document in `docs` (listedVariant, in brief), and its pieces. */
export async function reviewDoc(db: Queryable, p: any) {
  const k = kindOfWork(p.kind)!;
  const held = heldOf(p);
  // a retire changes nothing of its document: its kind's extras (a story's player of the version proposed) have nothing to show
  const extra = k.review && !held[0]?.retire ? await k.review(db, p) : {};
  const each: any[] = [];
  for (const h of held) each.push(await listedVariant(db, p, h));
  const first = each[0] ?? { doc: null, variant: null, seedNumber: null, moved: false };
  const edits = held[0]?.doc_variant != null ? await named(db, await docs.history(db, held[0].doc_id, { variant: Number(held[0].doc_variant) })) : [];
  const pieces = p.id && UUID.test(`${p.id}`) ? await piecesReviewed(db, p.id, held) : [];
  return { doc: first.doc, variant: first.variant, seedNumber: first.seedNumber, moved: first.moved, edits, ...extra, docs: each, ...(pieces.length ? { pieces } : {}) };
}

/** One document of an intent's work, read when opened (intent 2df30a21; GET /api/intents/:id/docs/:doc): its changes
 * field by field against its seed, its edits, whether Main moved, its kind's extras. A piece held in several versions
 * is named by `variant` too, else its newest. Null where the intent holds no such document. */
export async function reviewHeld(db: Queryable, id: string, doc: string, variant?: number | null) {
  const p = await workOf(db, id);
  if (!p?.kind || !kindOfWork(p.kind)) return null;
  const held = heldOf(p).filter((h) => h.doc_id.split(":")[1] === `${doc}`.toLowerCase() && (variant == null || h.doc_variant === Number(variant)));
  const h = held.at(-1);
  if (!h) return null;
  const r: any = await reviewVariant(db, p, h);
  // a piece's later version in the same intent is read against the one before it (intent 02e3a85f: it grows from it)
  const all = heldOf(p).filter((x) => x.doc_id === h.doc_id);
  const before = all[all.indexOf(h) - 1];
  if (before?.doc_variant != null && h.doc_variant != null) {
    r.changes = docs.diff((await docs.readDoc(db, h.doc_id, { variant: Number(before.doc_variant) })).json, (await docs.readDoc(db, h.doc_id, { variant: Number(h.doc_variant) })).json);
    r.growsFrom = { variant: Number(before.doc_variant) };
  }
  // a new document is one change of the whole: shown as the fields it brings, each as people read it
  const whole = r.changes.length === 1 && r.changes[0].path === "$" ? r.changes[0].to : null;
  if (whole && typeof whole === "object" && !Array.isArray(whole)) r.changes = Object.keys(whole).map((k) => ({ path: `$.${k}`, kind: "added", to: whole[k] }));
  const hk = kindOfDoc(h.doc_id);
  const extra = hk?.review && h.doc_variant != null && !h.retire ? await hk.review(db, asOne(p, h, hk)) : {};
  return { intent: p.id as string, status: p.status as string, ...r, ...extra, doc: r.doc, variant: r.variant };
}

/** The pieces an intent proposes (intent 02e3a85f): each its piece, label, variant, hash, version to be, which of the
 * intent's pieces it requires and which documents require it; read from each variant's brief (./gist.ts). */
async function piecesReviewed(db: Queryable, intent: string, held: { doc_id: string; doc_variant: number | null }[]) {
  const { rows } = await db.query<{ doc_id: string; variant_id: string }>(
    `SELECT iv.doc_id, iv.variant_id FROM play.intent_variants iv JOIN play.doc_variants dv ON dv.id = iv.variant_id
      WHERE iv.intent_id = $1 AND iv.doc_id LIKE 'piece:%' AND dv.status = 'proposed' ORDER BY iv.position`,
    [intent],
  );
  if (!rows.length) return [];
  // what every document the intent holds requires by hash (a piece's or a recipe's source, a breed's among them)
  const requires: { doc: string; variant: number; hashes: string[] }[] = [];
  for (const h of held) if (h.doc_variant != null) requires.push({ doc: h.doc_id, variant: Number(h.doc_variant), hashes: (await gistOf(db, h.doc_id, Number(h.doc_variant))).requires });
  const own: { doc_id: string; variant: number; hash: string; label: string | null; requires: string[] }[] = [];
  for (const r of rows) {
    const g = await gistOf(db, r.doc_id, Number(r.variant_id));
    own.push({ doc_id: r.doc_id, variant: Number(r.variant_id), hash: g.hash ?? hashText(""), label: g.label, requires: g.requires });
  }
  const before = new Map<string, number>();
  const out = [];
  for (const x of own) {
    const n = before.get(x.doc_id) ?? (await docs.versionsOf(db, x.doc_id)).length;
    before.set(x.doc_id, n + 1);
    out.push({
      piece: x.doc_id.split(":")[1], label: `${x.label ?? "A piece"}`, variant: x.variant, hash: x.hash, version: n + 1,
      requires: x.requires.filter((r) => own.some((y) => y.hash === r)),
      requiredBy: requires.filter((r) => r.hashes.includes(x.hash)).map((r) => ({ doc: r.doc.split(":")[1], kind: kindOfDoc(r.doc)?.name ?? null, variant: r.variant })),
    });
  }
  return out;
}

/** An intent's work as reviewed before deciding (`shown` as ./intents.ts lists it): each version's changes and edits (reviewDoc). */
export async function reviewOf(db: Queryable, id: string, shown: any) {
  const p = { ...(await workOf(db, id)), ...shown, id };
  if (!p.kind) return null;
  if (!kindOfWork(p.kind)) return { ...p };
  return { ...p, ...(await reviewDoc(db, p)) };
}

/** One intent whole: as the board lists it, its work's `review` (reviewOf), and its `brief`, the Intents skill's part
 * for its stage (./skills.ts; null where it says nothing). */
export async function intentOf(db: Queryable, me: Me | null, id: string) {
  const intent = await intentFor(db, me, id);
  // held (approved, its dependencies not shipped): nothing to do yet, its sub-state says why
  const held = intent.held_by.length > 0 && (intent.stage === "build" || intent.stage === "proposal");
  return { ...intent, brief: held ? null : await briefOf(db, intent), review: intent.work ? await reviewOf(db, intent.id, intent.work) : null };
}

/** One document of an intent's work, read when opened (reviewHeld), for whoever may open the intent; `variant` a piece's version. */
export async function intentDocOf(db: Queryable, me: Me | null, id: string, doc: string, variant: number | null) {
  const intent = await intentFor(db, me, id);
  const r = await reviewHeld(db, intent.id, doc, variant);
  if (!r) throw new HttpError("This intent changes no such document.", 404);
  return r;
}
