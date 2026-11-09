// One version control (play/SPEC.md "Version control", Samuel 2026-11-06): every versioned kind of play's (an asset, a
// story, a factory, a game config, a skill, and whatever comes next) is one entry of the registry below, and one module
// does the rest for each: list, read (at a version, an edit, or an intent's variant), history (edits, versions,
// variants), edit, propose, review and decide. The words are one set everywhere:
//
//   Edit            one change, kept with its author, message and time
//   Variant         a line of edits of one document
//   Main            the default variant: what is accepted
//   Intent variant  a variant that exists only inside an intent and goes through its stages; Accept merges it into
//                   Main, Archive closes it (kept in the history)
//   Seed            the version a variant grows from ("seeded from Main v3"); a document's first version is just v1
//   Version         a numbered state of Main, named on accept
//
// An entry holds its document prefix and its schema (a document of the meta-schema, named by its UUID: ./docs/schemas.ts),
// its row table, label and group (only shown), and hooks only where the kind really differs: edit helpers, what its
// schema can't say (a whole-document check, that it is code), its own
// propose (an asset's recipe built, a story's frozen row), its own decide, the fields its row keeps of an accepted
// version, its list item's extra fields. A kind is named by its document's UUID everywhere (MCP's list_docs, doc_at,
// doc_history, doc_edit, propose_doc_version; HTTP's /api/docs/<uuid>, /history, /changes; the board's review).
//
// A schema with no hooks needs no code (Samuel 2026-11-06): every accepted schema whose documents no entry here holds is
// a kind of its own (syncKinds), its rows in play.records, so a new type is a schema document and the intent that
// accepts it. A schema's new version is accepted only while every document on Main still validates against it.
import { admin, COOP, type Me } from "./access";
import * as docs from "./docs";
import { randomUUID } from "node:crypto";
import { hashText } from "./kit/hash";
import type { Db, Queryable } from "./kit/pg";
import { UUID } from "./kit/uuid";
import { HttpError } from "./kit/errors";
import { NOTE_MOST } from "./notes";
import { closeWork, NO_INTENT, putAtProposal, settle, stageAfter, WORK_OF, workOf } from "./work";
import { autoAfter, byOf, decideIntent, getIntent, gate, mustDecide, type IntentVerdict } from "./intents";
import type { AutoBy } from "./access";
import { acceptAndShip, acceptCode, runningCommit } from "./ship";
import type { GitHub } from "./github";
import { gistOf } from "./gist";
import { retireAccepted, retiredOf } from "./retire";
import { piecesOf } from "./pieces";
import { seesIntent } from "./owners";
import { authorOf, docRef, iso, kindNamed, kindOfDoc, kindOfWork, kinds, named, overlap, qi, resolveEdits, seen, syncKinds, versionAt, type Ctx, type Input, type Kind, type Verdict } from "./kinds";

const DOC_ADMINS = "A document's versions, edits and variants are for Maia City's admins, for now.";
function text(v: unknown, what: string, most: number): string {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(`${what} is missing.`);
  if (v.length > most) throw new HttpError(`${what} is longer than ${most} characters.`);
  return v.trim();
}

/** a document's versions, each with who accepted it and its note */
async function versionsNamed(db: Queryable, docId: string) {
  const versions = await docs.versionsOf(db, docId);
  const ids = [...new Set(versions.map((v) => v.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  return versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created), acceptedBy: v.author ? names.get(v.author) ?? null : null, contentHash: v.contentHash }));
}

/** an intent's variant of document `docId`, by the intent's id: the one it holds as its work, else the one it is making */
async function intentVariant(db: Queryable, docId: string, intent: unknown) {
  const s = `${intent ?? ""}`.toLowerCase();
  if (!UUID.test(s)) throw new HttpError("Name the intent by its id (a UUID).", 404);
  const { rows } = await db.query<{ id: string; doc_variant: string | null; status: string | null; stage: string; note: string; title: string }>(
    `SELECT w.id, w.doc_variant, dv.status, w.stage, w.note, w.title
       FROM (SELECT i.id, COALESCE((SELECT iv.variant_id FROM play.intent_variants iv WHERE iv.intent_id = i.id AND iv.doc_id = $3 ORDER BY iv.position DESC LIMIT 1),
                                   (SELECT max(v.id) FROM play.doc_variants v WHERE v.intent_id = i.id AND v.doc_id = $3)) AS doc_variant,
                    i.stage, COALESCE(i.work_note, '') AS note, i.title FROM play.intents i WHERE i.id = $1 AND i.coop_id = $2) w
       LEFT JOIN play.doc_variants dv ON dv.id = w.doc_variant AND dv.doc_id = $3`,
    [s, COOP, docId],
  );
  if (!rows[0]?.doc_variant || !rows[0].status) throw new HttpError(`${docId} has no variant of intent ${s}.`, 404);
  // the variant's own status (open, proposed, accepted, archived), as doc_history gives it
  return { id: rows[0].id, variant: Number(rows[0].doc_variant), stage: rows[0].stage, status: rows[0].status, note: rows[0].note, title: rows[0].title };
}

// ---- reading

/** every document of kind `kind` (every kind's where none is named): its UUID, kind, label, newest version, how many versions */
export async function listDocs(db: Queryable, me: Me | null, kind?: string) {
  const who = admin(me, DOC_ADMINS);
  await syncKinds(db);
  const ks = kind === undefined || kind === null || kind === "" ? kinds() : [kindNamed(`${kind}`)].filter((k): k is Kind => !!k);
  if (!ks.length) throw new HttpError(`A kind is one of ${kinds().map((k) => k.name).join(", ")}.`);
  const out: Record<string, unknown>[] = [];
  for (const k of ks) {
    const { rows } = await db.query<any>(
      `SELECT r.id::text AS id, r.${qi(k.labelColumn ?? "label")} AS label, d.id AS doc,
              (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = '${k.prefix}:' || r.id::text) AS number,
              (SELECT count(*) FROM play.doc_versions v WHERE v.doc_id = '${k.prefix}:' || r.id::text) AS versions,
              (SELECT max(created) FROM play.doc_versions v WHERE v.doc_id = '${k.prefix}:' || r.id::text) AS updated
         FROM ${qi(k.table)} r LEFT JOIN play.docs d ON d.id = '${k.prefix}:' || r.id::text
        WHERE ${[k.where, k.listed, seen(k, "$1"), "d.retired_at IS NULL"].filter(Boolean).join(" AND ")} ORDER BY r.created, r.id`,
      k.owned ? [who.id] : [],
    );
    for (const r of rows) {
      const extra = k.item && r.doc && r.number ? k.item((await docs.readDoc(db, r.doc)).json) : {};
      const more = k.more ? await k.more(db, r.id) : {};
      out.push({ id: r.id, kind: k.name, label: r.label, number: r.number ?? 0, versions: Number(r.versions), updated: r.updated ? iso(r.updated) : null, ...extra, ...more });
    }
  }
  return out;
}

export type DocAt = { version?: number; edit?: number; intent?: string; breed?: number };

/** One document, whole: at Main's newest version, at version `version`, at edit `edit`, or as intent `intent`'s variant would make it. With its versions. */
export async function docAt(ctx: Ctx, me: Me | null, id: unknown, at: DocAt = {}) {
  admin(me, DOC_ADMINS);
  const { kind, uuid, docId } = await (ctx.db as Db).transaction((q) => docRef(q, ctx, id, me));
  const db = ctx.db;
  const versions = await versionsNamed(db, docId);
  const number = versions.at(-1)?.number ?? 0;
  const retired = await retiredOf(db, docId);
  const base = { id: uuid, kind: kind.name, number, versions, ...(retired ? { retired } : {}) };
  const viewed = async <T extends { json: any }>(r: T) => (kind.view ? { ...r, ...(await kind.view(db, r.json, uuid)) } : r);
  if (at.breed !== undefined && at.breed !== null) {
    const b = (await docs.breedsOf(db, docId)).find((x) => x.id === at.breed);
    if (!b) throw new HttpError(`${uuid} has no breed ${at.breed} (doc_history's variants).`, 404);
    return { ...base, json: b.json, breed: { id: b.id, name: b.name, overrides: b.overrides.map((p) => p.join(".")) } };
  }
  if (at.intent !== undefined && at.intent !== null) {
    const iv = await intentVariant(db, docId, at.intent);
    return viewed({ ...base, json: (await docs.readDoc(db, docId, { variant: iv.variant })).json, intent: { id: iv.id, stage: iv.stage, status: iv.status, note: iv.note, title: iv.title, variant: iv.variant } });
  }
  if (at.edit !== undefined && at.edit !== null) {
    if (!Number.isInteger(at.edit) || at.edit < 1) throw new HttpError(`${at.edit} is not an edit.`, 404);
    return viewed({ ...base, json: await docs.stateAt(db, docId, { edit: at.edit }), edit: at.edit });
  }
  if (at.version !== undefined && at.version !== null) {
    if (!versions.some((v) => v.number === at.version)) throw new HttpError(`${uuid} has no version ${at.version}.`, 404);
    return viewed({ ...base, json: await docs.stateAt(db, docId, { version: at.version }), version: at.version });
  }
  return viewed({ ...base, json: (await docs.readDoc(db, docId)).json, version: number });
}

/**
 * A document's history: its edits, oldest first (Main's, with each accepted intent variant's where it was made; with
 * `variant`, that variant's own), its versions, and its variants (Main, then each intent variant with its intent, its
 * seed and how many edits it holds).
 */
export async function docHistory(ctx: Ctx, me: Me | null, id: unknown, o: { variant?: number } = {}) {
  admin(me, DOC_ADMINS);
  const { kind, uuid, docId } = await (ctx.db as Db).transaction((q) => docRef(q, ctx, id, me));
  const db = ctx.db;
  const versions = await docs.versionsOf(db, docId);
  if (o.variant !== undefined && !(Number.isInteger(o.variant) && o.variant >= 1)) throw new HttpError("A variant is named by its number (doc_history gives them).", 404);
  const edits = await named(db, await docs.history(db, docId, o.variant === undefined ? {} : { variant: o.variant }), versions);
  const vs = await docs.variantsOf(db, docId);
  const ids = [...new Set(vs.map((v) => v.created_by).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  const intents = new Map(
    (await db.query<{ id: string; stage: string; title: string }>(`SELECT id, stage, title FROM play.intents WHERE id = ANY($1::uuid[])`, [vs.map((v) => v.intent_id).filter(Boolean)])).rows.map((r) => [r.id, r]),
  );
  const retired = await retiredOf(db, docId);
  return {
    id: uuid,
    kind: kind.name,
    ...(retired ? { retired } : {}),
    edits,
    versions: (await versionsNamed(db, docId)).map((v, i) => ({ ...v, variant: versions[i].variant })),
    variants: vs.map((v) => ({
      id: v.id,
      type: v.type,
      ...(v.type === "breed" ? { name: v.name, overrides: v.overrides.map((p) => p.join(".")) } : {}),
      ...(v.breed !== null ? { breed: v.breed, breedName: vs.find((b) => b.id === v.breed)?.name ?? null } : {}),
      ...(v.makes !== null ? { makes: v.makes } : {}),
      status: v.status,
      note: v.note,
      at: iso(v.created),
      author: v.created_by ? names.get(v.created_by) ?? null : null,
      edits: v.edits,
      seed: v.type === "main" ? null : versionAt(versions, v.mainSeed ?? v.seed),
      intent: v.intent_id ? { id: v.intent_id, stage: intents.get(v.intent_id)?.stage ?? null, title: intents.get(v.intent_id)?.title ?? null } : null,
    })),
  };
}

/**
 * What an edit or an intent variant changes, against the version it grew from: with `edit`, the state before it and
 * after it; with `variant`, its seed and where it stands now. The changes field by field, and the edits that made them.
 */
export async function docChanges(ctx: Ctx, me: Me | null, id: unknown, o: { edit?: number; variant?: number }) {
  admin(me, DOC_ADMINS);
  const { kind, uuid, docId } = await (ctx.db as Db).transaction((q) => docRef(q, ctx, id, me));
  const db = ctx.db;
  const versions = await docs.versionsOf(db, docId);
  if (o.variant !== undefined && o.variant !== null) {
    const v = await docs.variantOf(db, docId, o.variant, { breeds: true });
    if (v.type === "breed") {
      // a breed: what it overrides, against Main as it is now, and its own edits (Main's merged into it among them)
      const now = (await docs.readDoc(db, docId, { breed: v.id })).json;
      return { id: uuid, kind: kind.name, variant: v.id, breed: v.name, seed: null, changes: docs.diff((await docs.readDoc(db, docId)).json, now), edits: await named(db, await docs.history(db, docId, { variant: v.id }), versions) };
    }
    const seed = await docs.seedOf(db, docId, o.variant);
    const now = (await docs.readDoc(db, docId, { variant: o.variant })).json;
    const extra = kind.shown ? await kind.shown(db, seed, now) : {};
    return { id: uuid, kind: kind.name, variant: v.id, seed: versionAt(versions, v.mainSeed ?? v.seed), changes: docs.diff(seed, now), edits: await named(db, await docs.history(db, docId, { variant: o.variant }), versions), ...extra };
  }
  if (o.edit === undefined || o.edit === null || !Number.isInteger(o.edit) || o.edit < 1) throw new HttpError("Name an edit (its seq) or an intent variant.", 404);
  const all = await docs.history(db, docId);
  const { rows } = await db.query<{ variant: string; type: string }>(`SELECT e.variant, v.type FROM play.doc_edits e JOIN play.doc_variants v ON v.id = e.variant WHERE e.doc_id = $1 AND e.seq = $2`, [docId, o.edit]);
  if (!rows[0]) throw new HttpError(`${uuid} has no edit ${o.edit}.`, 404);
  const line = rows[0].type !== "main" && !all.some((e) => e.seq === o.edit) ? await docs.history(db, docId, { variant: Number(rows[0].variant) }) : all;
  const i = line.findIndex((e) => e.seq === o.edit);
  const after = await docs.stateAt(db, docId, { edit: o.edit });
  const before = i > 0 ? await docs.stateAt(db, docId, { edit: line[i - 1].seq }) : line === all ? null : await docs.seedOf(db, docId, Number(rows[0].variant));
  const extra = kind.shown ? await kind.shown(db, before, after) : {};
  return { id: uuid, kind: kind.name, edit: o.edit, changes: docs.diff(before, after), edits: await named(db, [line[i]], versions), ...extra };
}

// ---- editing and proposing

/** an edit's write: the kind's own, else the edits resolved, or the whole state with its schema kept */
async function writeOf(q: Queryable, k: Kind, uuid: string, cur: any, input: Input): Promise<docs.Write> {
  if (k.write) return k.write(q, uuid, cur, input);
  if (input.whole !== undefined) {
    if (!input.whole || typeof input.whole !== "object" || Array.isArray(input.whole)) throw new HttpError(`A whole ${k.label} is an object (doc_at's \`json\`).`);
    return { target: { ...(input.whole as object), ...(cur && cur.schema !== undefined ? { schema: cur.schema } : {}) } };
  }
  return { edits: resolveEdits(cur, input.edits) };
}

/** an intent variant of the document still open for edits, and the intent it is the work of (null: none yet) */
async function openVariant(q: Queryable, docId: string, uuid: string, v: unknown): Promise<{ id: number; seed: docs.Frontiers; intent: string | null }> {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError("An intent variant is named by its number (doc_edit gives it).");
  const { rows } = await q.query<{ status: string; seed: docs.Frontiers; type: string; intent_id: string | null }>(`SELECT status, seed, type, intent_id FROM play.doc_variants WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0] || rows[0].type !== "intent") throw new HttpError(`${uuid} has no intent variant ${n}.`, 404);
  if (rows[0].status !== "open") throw new HttpError(`Variant ${n} of ${uuid} was ${rows[0].status === "proposed" ? "proposed already: it is decided as it was proposed. Start a new variant" : rows[0].status}.`, 409);
  return { id: n, seed: rows[0].seed, intent: rows[0].intent_id };
}

/** the intent an edit is made for (no edit without one): one that is being built or waits at Proposal */
async function editingIntent(q: Queryable, intent: unknown): Promise<string> {
  const s = `${intent ?? ""}`.toLowerCase();
  if (!s) throw new HttpError(NO_INTENT);
  if (!UUID.test(s)) throw new HttpError("Name the intent by its id (a UUID: list_intents gives it).", 404);
  const { rows } = await q.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1 AND coop_id = $2`, [s, COOP]);
  if (!rows[0]) throw new HttpError(`There is no intent ${s}.`, 404);
  if (rows[0].stage !== "build" && rows[0].stage !== "proposal")
    throw new HttpError(`Intent ${s} is at the ${rows[0].stage} stage: it is edited for once its spec is approved (Build), or while it waits at Proposal.`, 409);
  return s;
}

/** the variant an edit goes on: the one named (the intent's, or none's yet), else the intent's open one of this document, else a new one seeded from Main's newest version */
async function variantFor(q: Queryable, docId: string, uuid: string, intent: string | null, v: unknown, author: docs.Author, note: string, on: { kind: Kind; breed?: number | null; newBreed?: string | null }): Promise<number> {
  if (v != null) {
    const o = await openVariant(q, docId, uuid, v);
    if (o.intent && intent && o.intent !== intent) throw new HttpError(`Variant ${o.id} of ${uuid} is intent ${o.intent}'s, not ${intent}'s.`, 409);
    if (o.intent && !intent) throw new HttpError(`Variant ${o.id} of ${uuid} is intent ${o.intent}'s: name it (\`intent\`).`, 409);
    if (intent && !o.intent) await q.query(`UPDATE play.doc_variants SET intent_id = $2 WHERE id = $1`, [o.id, intent]);
    return o.id;
  }
  if (intent) {
    // the intent's open variant of this document: of Main, of the breed named, or the one making the breed named
    const { rows } = await q.query<{ id: string }>(
      `SELECT max(id) AS id FROM play.doc_variants WHERE doc_id = $1 AND intent_id = $2 AND status = 'open'
          AND breed IS NOT DISTINCT FROM $3::bigint AND makes IS NOT DISTINCT FROM $4::text`,
      [docId, intent, on.breed ?? null, on.newBreed ?? null],
    );
    if (rows[0]?.id) return Number(rows[0].id);
  }
  const made = await newVariant(q, on.kind, docId, uuid, on, author, note);
  if (intent) {
    await q.query(`UPDATE play.doc_variants SET intent_id = $2 WHERE id = $1`, [made, intent]);
    await growFromHeld(q, on.kind, docId, made, intent, author);
  }
  return made;
}

/**
 * A new piece variant of an intent that holds a version of that piece already (intent 02e3a85f): it grows from the
 * intent's last one, its first edit that version's state, so it is that version's next; else it grows from Main.
 */
async function growFromHeld(q: Queryable, k: Kind, docId: string, v: number, intent: string, author: docs.Author) {
  if (k.name !== "piece") return;
  const { rows } = await q.query<{ variant_id: string }>(
    `SELECT iv.variant_id FROM play.intent_variants iv JOIN play.doc_variants dv ON dv.id = iv.variant_id
      WHERE iv.intent_id = $1 AND iv.doc_id = $2 AND iv.variant_id <> $3 AND dv.status = 'proposed' ORDER BY iv.position DESC LIMIT 1`,
    [intent, docId, v],
  );
  if (!rows[0]) return;
  const before = (await docs.readDoc(q, docId, { variant: Number(rows[0].variant_id) })).json;
  await docs.commit(q, docId, { variant: v, target: before, message: `grows from variant ${rows[0].variant_id}, the version this intent proposed before`, author });
}

const BREED_NAME = /^[a-z0-9][a-z0-9-]{0,79}$/;
/** a new intent variant of document `docId`: of Main, of breed `breed` (to change it), or making breed `newBreed` (an asset's) */
async function newVariant(tx: Queryable, k: Kind, docId: string, uuid: string, p: { breed?: number | null; newBreed?: string | null }, author: docs.Author, note: string): Promise<number> {
  if (p.breed != null || p.newBreed != null) {
    if (!k.breeds) throw new HttpError(`A ${k.label} has no breeds: only an asset has.`);
    if (p.breed != null && p.newBreed != null) throw new HttpError("Change a breed or make a new one, not both.");
    if (p.newBreed != null && !BREED_NAME.test(`${p.newBreed}`)) throw new HttpError(`${p.newBreed} is not a breed's name (lowercase words joined by '-').`);
    if (p.breed != null) {
      const { rows } = await tx.query<{ status: string }>(`SELECT status FROM play.doc_variants WHERE id = $1 AND doc_id = $2 AND type = 'breed'`, [Number(p.breed), docId]);
      if (!rows[0]) throw new HttpError(`${uuid} has no breed ${p.breed} (doc_history's variants).`, 404);
    }
  }
  return (await docs.variant(tx, docId, { author, note, ...(p.breed != null ? { breed: Number(p.breed) } : {}), ...(p.newBreed != null ? { makes: `${p.newBreed}` } : {}) })).id;
}

/**
 * A new document of a kind that is a schema alone, or of a schema (`kind`), from its whole first state: its row, and its
 * Main born empty; its first state is an intent variant's, Main's only once a person accepts it (no bypass). A kind with a
 * table of its own makes its documents its own way (propose_asset, propose_story).
 */
async function newDocument(q: Queryable, who: Me, kindName: unknown, whole: unknown): Promise<string> {
  await syncKinds(q);
  const k = kindNamed(`${kindName ?? ""}`);
  if (!k) throw new HttpError(`A kind is one of ${kinds().map((x) => x.name).join(", ")}.`);
  if (k.table !== "play.records") throw new HttpError(`A new ${k.label} is made its own way (propose_asset, propose_story), not by propose_doc_version.`);
  if (!whole || typeof whole !== "object" || Array.isArray(whole)) throw new HttpError(`A new ${k.label} is its whole first state (\`whole\`).`);
  const uuid = randomUUID();
  const label = `${(whole as any).label ?? (whole as any).title ?? k.label}`.slice(0, 200) || k.label;
  await q.query(`INSERT INTO play.records (id, coop_id, kind, label) VALUES ($1, $2, $3, $4)`, [uuid, COOP, k.name, label]);
  await docs.createDoc(q, { id: `${k.prefix}:${uuid}`, schema: k.schema, empty: true, author: authorOf(who, "mcp"), message: `a new ${k.label}, not yet accepted` });
  return uuid;
}

export type DocEditBody = { doc?: unknown; kind?: unknown; intent?: unknown; variant?: number | null; breed?: number | null; newBreed?: string | null; edits?: unknown; whole?: unknown; message?: unknown };

/**
 * One edit of an intent variant, as the admin `me`, for intent `intent` (no edit without one: Main is written only by an
 * Accept): on variant `variant`, else on the intent's open variant of the document, else on a new one seeded from Main's
 * newest version; with `kind` and no `doc`, a new document of that kind, its whole first state the variant's first edit.
 */
export async function docEdit(ctx: Ctx, me: Me | null, p: DocEditBody, via: "web" | "mcp" = "mcp") {
  const who = admin(me, DOC_ADMINS);
  const message = text(p?.message, "The edit's message (what it does)", 500);
  if ((p.edits === undefined) === (p.whole === undefined)) throw new HttpError("An edit is edits or the whole document, one of them.");
  return ctx.db.transaction(async (tx) => {
    const intent = await editingIntent(tx, p.intent);
    // a new document and its first edit, one transaction: nothing of it is kept if the edit is refused
    if (p.doc == null && p.kind != null) p = { ...p, doc: await newDocument(tx, who, p.kind, p.whole), variant: null };
    const { kind, uuid, docId } = await docRef(tx, ctx, p.doc, who);
    const author = authorOf(who, via);
    const v = await variantFor(tx, docId, uuid, intent, p.variant, author, message, { kind, breed: p.breed, newBreed: p.newBreed });
    const cur = (await docs.readDoc(tx, docId, { variant: v })).json;
    const e = await docs.commit(tx, docId, { variant: v, ...(await writeOf(tx, kind, uuid, cur, p)), message, author });
    const changes = docs.diff(await docs.seedOf(tx, docId, v), (await docs.readDoc(tx, docId, { variant: v })).json);
    return { doc: uuid, kind: kind.name, intent, variant: v, edit: e?.seq ?? null, changed: !!e, edits: (await docs.history(tx, docId, { variant: v })).length, changes: changes.length };
  });
}

export type ProposeBody = { doc?: unknown; kind?: unknown; note?: unknown; variant?: number | null; breed?: number | null; newBreed?: string | null; edits?: unknown; whole?: unknown; intent?: string };

/** a variant made edit by edit is proposed for the intent it was made for, and only for it */
async function proposedFor(q: Queryable, docId: string, uuid: string, v: number, intent: string | undefined) {
  const o = await openVariant(q, docId, uuid, v);
  if (o.intent && o.intent !== intent) throw new HttpError(`Variant ${v} of ${uuid} is intent ${o.intent}'s: propose it naming that intent (\`intent\`).`, 409);
  return o;
}

/**
 * Propose the document's next version, as the admin `me`: an intent variant made edit by edit (its `variant`, perhaps
 * with one more edit), or edits (or the whole) at once. To propose is to put an intent at Proposal with the work: the
 * intent named (beside the other documents it changes): no work without an intent.
 */
export async function proposeDocVersion(ctx: Ctx, me: Me | null, p: ProposeBody, via: "web" | "mcp" = "mcp") {
  const who = admin(me, DOC_ADMINS);
  const note = text(p?.note, "The note (what changes and why)", NOTE_MOST);
  if (p.variant == null && (p.edits === undefined) === (p.whole === undefined)) throw new HttpError("Propose an intent variant (its number), edits, or the whole document.");
  if (p.edits !== undefined && p.whole !== undefined) throw new HttpError("Give edits or the whole document, not both.");
  // a new document (`kind`, no `doc`: a kind of play.records' alone, which proposes no way of its own) is made in the
  // proposal's own transaction, so nothing of it is kept if the proposal is refused
  const fresh = p.doc == null && p.kind != null;
  const ref = fresh ? null : await (ctx.db as Db).transaction((q) => docRef(q, ctx, p.doc, who));
  if (ref?.kind.propose) {
    const { kind, uuid, docId } = ref;
    // the kind's own propose (an asset's recipe files, a story's frozen row), on its intent variant as it stands
    let v = p.variant ?? null;
    if (v != null) await ctx.db.transaction((q) => proposedFor(q, docId, uuid, Number(v), p.intent));
    if (p.edits !== undefined || p.whole !== undefined) {
      const e = await docEdit(ctx, who, { doc: uuid, intent: p.intent, variant: v, breed: p.breed, newBreed: p.newBreed, edits: p.edits, whole: p.whole, message: note.split("\n")[0].slice(0, 500) }, via);
      if (!e.edits) throw new HttpError(`That is the ${kind.label} as it is: nothing changed.`);
      v = e.variant;
    }
    const out = await kind.propose!(ctx, who, { id: uuid, variant: Number(v), note, intent: p.intent }, via);
    const edits = (await docs.history(ctx.db, docId, { variant: Number(v) })).length;
    return { ...out, stage: await stageAfter(ctx.db, (out as any).intent), doc: uuid, kind: kind.name, variant: Number(v), edits };
  }
  return ctx.db.transaction(async (tx) => {
    const { kind, uuid, docId } = ref ?? (await docRef(tx, ctx, await newDocument(tx, who, p.kind, p.whole), who));
    return proposeIn(tx, who, kind, uuid, docId, fresh ? { ...p, variant: null } : p, note, via);
  });
}

/** a document's next version proposed, in the caller's transaction (proposeDocVersion, proposeNewDoc) */
async function proposeIn(tx: Queryable, who: Me, kind: Kind, uuid: string, docId: string, p: ProposeBody, note: string, via: "web" | "mcp") {
  const author = authorOf(who, via);
  let v: number;
  if (p.variant == null) {
    v = await newVariant(tx, kind, docId, uuid, p, author, note);
    if (p.intent && UUID.test(`${p.intent}`.toLowerCase())) await growFromHeld(tx, kind, docId, v, `${p.intent}`.toLowerCase(), author);
  } else v = (await proposedFor(tx, docId, uuid, p.variant, p.intent)).id;
  if (p.edits !== undefined || p.whole !== undefined) {
    const cur = (await docs.readDoc(tx, docId, { variant: v })).json;
    await docs.commit(tx, docId, { variant: v, ...(await writeOf(tx, kind, uuid, cur, p)), message: note, author });
  }
  const now = (await docs.readDoc(tx, docId, { variant: v })).json;
  const changes = docs.diff(await docs.seedOf(tx, docId, v), now);
  if (!changes.length) throw new HttpError(`That is the ${kind.label} as it is: nothing changed.`);
  if (kind.ready) await kind.ready(tx, now, p.intent ?? null);
  await docs.propose(tx, docId, v, { note, author });
  // every document goes in beside the others the intent holds (intent 7c8986c5)
  const intent = await putAtProposal(tx, who, { intent: p.intent, work: { kind: kind.work, doc_id: docId, doc_variant: v }, note, via: via === "mcp" ? "mcp" : "web" });
  const number = ((await docs.versionsOf(tx, docId)).at(-1)?.number ?? 0) + 1;
  return { intent, stage: await stageAfter(tx, intent), doc: uuid, kind: kind.name, number, variant: v, edits: (await docs.history(tx, docId, { variant: v })).length, changes: changes.length };
}

/**
 * A new document of kind `kindName` with a table of its own proposed (an artifact kept for the first time): its row
 * holding only its id until an Accept writes it, its Main born empty, its first state an intent variant proposed for
 * the intent named (no work without an intent). Nothing of it is Main's until it is accepted.
 */
export async function proposeNewDoc(ctx: Ctx, me: Me | null, kindName: string, o: { whole: Record<string, unknown>; note: string; intent?: string }, via: "web" | "mcp" = "mcp") {
  const who = admin(me, DOC_ADMINS);
  const kind = kindNamed(kindName);
  if (!kind) throw new HttpError(`There is no kind ${kindName}.`, 500);
  const note = text(o.note, "The note (what it is and why)", NOTE_MOST);
  const uuid = randomUUID();
  const docId = `${kind.prefix}:${uuid}`;
  return ctx.db.transaction(async (tx) => {
    await tx.query(`INSERT INTO ${qi(kind.table)} (id, coop_id) VALUES ($1, $2)`, [uuid, COOP]);
    await docs.createDoc(tx, { id: docId, schema: kind.schema, empty: true, author: authorOf(who, via), message: `a new ${kind.label}, not yet accepted` });
    return proposeIn(tx, who, kind, uuid, docId, { doc: uuid, whole: o.whole, intent: o.intent }, note, via);
  });
}

/** A document's first version, as a new document named v1 (the deploy's import): only when play holds none of its id. Gives back whether it was made. */
export async function seedDoc(db: Db, kindName: string, o: { id: string; json: any; note: string; at?: Date }): Promise<boolean> {
  const k = kindNamed(kindName);
  if (!k) throw new HttpError(`There is no kind ${kindName}.`);
  if (!UUID.test(o.id)) throw new HttpError(`A ${k.label} is named by its UUID, not ${o.id}.`);
  return db.transaction(async (q) => {
    const { rows } = await q.query(`SELECT 1 FROM ${qi(k.table)} WHERE id = $1`, [o.id]);
    if (rows.length) return false;
    const cols = { [k.labelColumn ?? "label"]: o.json.label, ...Object.fromEntries(Object.entries(k.row ?? {}).map(([c, f]) => [c, f(o.json)])) };
    const names = Object.keys(cols).map(qi);
    await q.query(`INSERT INTO ${qi(k.table)} (id, coop_id, ${names.join(", ")}) VALUES ($1, $2, ${names.map((_, i) => `$${i + 3}`).join(", ")})`, [o.id, COOP, ...Object.values(cols)]);
    await docs.createDoc(q, { id: `${k.prefix}:${o.id}`, schema: k.schema, json: o.json, author: { human: null, via: "import" }, message: `v1: ${o.note}`, ...(o.at ? { at: o.at } : {}), version: o.note });
    return true;
  });
}

// ---- reviewing and deciding

/** the documents an intent's work holds, each its document, its variant and what its version names (its refs), the first its work's own */
const heldOf = (p: any): ({ doc_id: string; doc_variant: number | null } & Record<string, any>)[] =>
  p.variants?.length ? p.variants : p.doc_id ? [{ doc_id: p.doc_id, doc_variant: p.doc_variant == null ? null : Number(p.doc_variant) }] : [];

/** the work `p` as one of its documents (`h`) is decided or reviewed by its own kind: its kind of work, its document and variant, its version's refs */
const asOne = (p: any, h: { doc_id: string; doc_variant: number | null } & Record<string, any>, k: Kind) => {
  const out: any = { ...p, kind: k.work, doc_id: h.doc_id, doc_variant: h.doc_variant };
  const isFirst = h.doc_id === (p.variants?.[0]?.doc_id ?? p.doc_id);
  for (const r of ["asset_id", "base", "version", "story_id", "story_base", "story_version"]) out[r] = h[r] ?? (isFirst ? p[r] : null) ?? null;
  return out;
};

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

/**
 * One document's intent variant as an intent's detail lists it (intent 2df30a21): its document, the version it grew
 * from, whether Main moved since, its status and what it changes in brief (how many fields, which), never its content:
 * that is read when the document is opened (reviewHeld). Its brief is kept on the variant (./gist.ts).
 */
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

/**
 * An intent's work on its documents as its detail shows it (intent 2df30a21: opened in about a second, whatever it
 * holds): its first document's kind's own extras (an asset's builds, a story's player, a layout's pins) and the edits
 * that made it, every document it changes listed in `docs` (listedVariant: in brief, without its content), and its
 * pieces. What one document changes, field by field, is read when it is opened: reviewHeld.
 */
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

/**
 * One document of an intent's work as people review it, read when it is opened (intent 2df30a21; GET
 * /api/intents/:id/docs/:doc): what it changes field by field against its seed, the edits that made it, whether Main
 * moved since, and its kind's own extras (an asset's builds, a story's player, a layout's pins). `doc` is its document's
 * UUID; a piece held in several versions is named by its `variant` too, its newest otherwise. Null where the intent
 * holds no such document.
 */
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

/**
 * The pieces an intent proposes as the board lists them (intent 02e3a85f): each its piece, label, variant, hash and the
 * version it is to be, which of the intent's pieces it requires and which of its documents require it; read from each
 * variant's brief (./gist.ts), not from the documents again.
 */
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

/** an accepted version's row: its label (or title) and the fields its kind's row keeps, in the caller's transaction */
async function writeRow(tx: Queryable, k: Kind, docId: string, json: any) {
  const cols = { [k.labelColumn ?? "label"]: json.label ?? json.title, ...Object.fromEntries(Object.entries(k.row ?? {}).map(([c, f]) => [c, f(json)])) };
  await tx.query(`UPDATE ${qi(k.table)} SET ${Object.keys(cols).map((c, i) => `${qi(c)} = $${i + 2}`).join(", ")} WHERE id = $1`, [docId.split(":")[1], ...Object.values(cols)]);
}

/**
 * Accept or archive an intent's work on its documents (`p`, its intent locked by the caller's transaction), as admin
 * `me`: every one of them in this one transaction, or none (intent 7c8986c5: any number, whatever their kind). Accepted,
 * each intent variant is merged into its Main and named its next version, its row keeping what the version says;
 * seeded from a version that is no longer Main's newest, it still goes in where the two changes touch different fields.
 * A kind's `before` holds each merge to what its schema can't say (a layout's pins, a schema's documents). A kind with
 * its own decide (an asset's, a story's frozen rows) decides its own documents, each with its own refs, once every other
 * one has been found to go in. Where one clashes (the same field changed), is no longer valid merged, no longer holds,
 * or its kind's decide does not take it, none goes in: the intent is archived whole (back to Build).
 */
export async function decideWork(tx: Queryable, ctx: Ctx, me: Me, p: any, verdict: Verdict) {
  const own = kindOfWork(p.kind)!;
  if (me.level !== "admin") throw new HttpError(`Only Maia City's admins decide on ${own.group}.`, 403);
  const author = authorOf(me, "web");
  const all = heldOf(p).filter((h) => h.doc_variant != null) as ({ doc_id: string; doc_variant: number } & Record<string, any>)[];
  // its retires (./retire.ts): no merge, no kind's decide; accepted, each document marked retired
  const retires = all.filter((h) => h.retire);
  const held = all.filter((h) => !h.retire);
  const several = all.length > 1;
  const archive = async (message?: string) => {
    await settle(tx, p.id, "archived", verdict === "archive" ? me.id : null);
    await closeWork(tx, me, p);
    return { id: p.id as string, status: "archived" as const, ...(message ? { message } : {}) };
  };
  const kindOf = (h: { doc_id: string }) => kindOfDoc(h.doc_id) ?? own;
  const hooked = held.filter((h) => !!kindOf(h).decide);
  // its pieces (intent 02e3a85f): kept first, in the order they require each other, each exactly as proposed
  const pieces = held.filter((h) => !hooked.includes(h) && kindOf(h).name === "piece");
  if (verdict === "archive") {
    if (!hooked.length) return archive();
    let first: any = null;
    for (const h of hooked) {
      const r = await kindOf(h).decide!(tx, ctx, me, asOne(p, h, kindOf(h)), verdict);
      first ??= r;
    }
    await closeWork(tx, me, p);
    return first;
  }
  for (const h of retires) if (await retiredOf(tx, h.doc_id)) return archive(`The ${kindOf(h).label} ${h.doc_id.split(":")[1]} is retired already${several ? " (nothing of this intent went in)" : ""}.`);
  // every document's merge worked out first: one that would not go in archives them all
  const merges: { h: { doc_id: string; doc_variant: number }; k: Kind; preview: Awaited<ReturnType<typeof docs.previewMerge>> }[] = [];
  for (const h of held.filter((x) => !hooked.includes(x) && !pieces.includes(x))) {
    const k = kindOf(h);
    const which = several ? ` (${k.label} ${h.doc_id.split(":")[1]}: nothing of this intent went in)` : "";
    const preview = await docs.previewMerge(tx, h.doc_id, h.doc_variant);
    if (preview.concurrent) {
      const was = await docs.seedOf(tx, h.doc_id, h.doc_variant);
      const now = (await docs.readDoc(tx, h.doc_id)).json, mine = (await docs.readDoc(tx, h.doc_id, { variant: h.doc_variant })).json;
      const clash = overlap(docs.diff(was, now).map((c) => c.path), docs.diff(was, mine).map((c) => c.path));
      if (clash.length) return archive(`The ${k.label} has a newer version than the one this was seeded from, and it changes what that changed too (${clash.slice(0, 3).map((c) => c.replace(/^\$\./, "")).join(", ")})${which}. Propose the change again on its newest version.`);
    }
    if (preview.problems.length) return archive(`Merged into the ${k.label} as it is now, this is no longer a valid ${k.label}: ${preview.problems.slice(0, 3).join("; ")}${which}. Propose it again on its newest version.`);
    const why = k.before ? await k.before(tx, h.doc_id, h.doc_variant, preview.json) : null;
    if (why) return archive(`${why}${which}`);
    merges.push({ h, k, preview });
  }
  // the order its pieces go in: each after the pieces of the intent it requires, and after its piece's earlier versions
  const ordered = await piecesInOrder(tx, pieces);
  if (typeof ordered === "string") return archive(ordered);
  // the kinds' own decides, each document with its own refs: one that does not take its document undoes them all
  if (several) await tx.query(`SAVEPOINT all_work`);
  let first: any = null;
  const numbers: number[] = [];
  for (const { h, json } of ordered) {
    const k = kindOf(h);
    const v = await docs.accept(tx, h.doc_id, h.doc_variant, { author, note: p.note, whole: { json } });
    if (k.accepted) await k.accepted(tx, ctx, h.doc_id, v.number, json, p.id);
    await writeRow(tx, k, h.doc_id, json);
    numbers.push(v.number);
  }
  for (const h of hooked) {
    const k = kindOf(h);
    const r = await k.decide!(tx, ctx, me, asOne(p, h, k), verdict);
    if (r?.status !== "accepted") {
      if (!several) {
        await closeWork(tx, me, p);
        return r;
      }
      await tx.query(`ROLLBACK TO SAVEPOINT all_work`);
      return archive(`${r?.message ?? `The ${k.label} ${h.doc_id.split(":")[1]} did not go in.`} (${k.label} ${h.doc_id.split(":")[1]}: nothing of this intent went in)`);
    }
    first ??= r;
    if (first !== r && typeof r.number === "number") numbers.push(r.number);
  }
  if (several) await tx.query(`RELEASE SAVEPOINT all_work`);
  for (const { h, k, preview } of merges) {
    const v = await docs.accept(tx, h.doc_id, h.doc_variant, { author, note: p.note });
    if (k.accepted) await k.accepted(tx, ctx, h.doc_id, v.number, preview.json);
    await writeRow(tx, k, h.doc_id, preview.json);
    numbers.push(v.number);
  }
  for (const h of retires) await retireAccepted(tx, me, p.id, h.doc_id, h.doc_variant);
  if (first) return { ...first, ...(numbers.length ? { numbers } : {}) };
  await settle(tx, p.id, "accepted", byOf(me));
  return { id: p.id as string, status: "accepted" as const, number: numbers[0], ...(numbers.length > 1 ? { numbers } : {}), ...(merges[0]?.preview.concurrent ? { merged: true } : {}), ...(retires.length ? { retired: retires.map((h) => h.doc_id.split(":")[1]) } : {}) };
}

/**
 * An intent's pieces in the order an Accept keeps them (intent 02e3a85f): each after the pieces of the intent its
 * source requires and after the earlier versions of its own piece the intent holds, else in the intent's order. Each
 * with its state as proposed. Pieces that require each other in a circle give why, to archive it.
 */
async function piecesInOrder(q: Queryable, pieces: { doc_id: string; doc_variant: number }[]): Promise<{ h: { doc_id: string; doc_variant: number }; json: any }[] | string> {
  const all = [];
  for (const h of pieces) {
    const json = (await docs.readDoc(q, h.doc_id, { variant: h.doc_variant })).json;
    const source = `${json?.source ?? ""}`;
    all.push({ h, json, hash: hashText(source), requires: piecesOf(source) });
  }
  const out: typeof all = [];
  const left = [...all];
  while (left.length) {
    const i = left.findIndex((x, n) =>
      !x.requires.some((r) => left.some((y) => y !== x && y.hash === r)) && !left.slice(0, n).some((y) => y.h.doc_id === x.h.doc_id));
    if (i < 0) return `Its pieces require each other in a circle (${left.map((x) => `${x.hash.slice(0, 12)}…`).join(", ")}): nothing of this intent went in.`;
    out.push(...left.splice(i, 1));
  }
  return out.map(({ h, json }) => ({ h, json }));
}

/**
 * An intent's work as people review it before they decide (`shown`: the intent's work as ./intents.ts lists it): for
 * a document's version, what it changes and the edits it was made in (./versioned.ts reviewDoc, with its kind's own
 * extras: an asset's builds, a story's player, a sandbox's pins before and after).
 */
export async function reviewOf(db: Queryable, id: string, shown: any) {
  const p = { ...(await workOf(db, id)), ...shown, id };
  if (!p.kind) return null;
  if (!kindOfWork(p.kind)) return { ...p };
  return { ...p, ...(await reviewDoc(db, p)) };
}

/** An intent's work archived by whoever proposed it: the intent archived, its intent variant closed, kept in the history. */
async function archiveAsAuthor(tx: Queryable, me: Me, p: any) {
  await settle(tx, p.id, "archived", me.id);
  await closeWork(tx, me, p);
  return { id: p.id as string, status: "archived" as const };
}

/**
 * An agent archives its own intent over MCP (Samuel 2026-11-04): one at Proposal whose work it no longer stands by.
 * Only an intent its admin put at Proposal over MCP (its work proposed so, or, with no work, added so), never anyone
 * else's and never one proposed on the page; accepting stays a person's, on the intents' board.
 */
export async function archiveOwn(db: Db, me: Me | null, id: string) {
  if (!me) throw new HttpError("Please sign in first.", 401);
  if (!UUID.test(id)) throw new HttpError("Name the intent by its id (list_intents gives it).");
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<any>(`SELECT ${WORK_OF}, i.author AS intent_author, i.via AS intent_via FROM play.intents i WHERE i.id = $1 AND i.coop_id = $2 FOR UPDATE`, [id, COOP]);
    const p = rows[0];
    // (an intent whose work is another's private asset is as one that never was: ./owners.ts)
    if (!p || !(await seesIntent(tx, me, p.id))) throw new HttpError("There is no such intent.", 404);
    const [by, via] = p.kind ? [p.author, p.via] : [p.intent_author, p.intent_via];
    if (by !== me.id || via !== "mcp") throw new HttpError("Only an intent you put at Proposal over MCP is yours to archive; the rest are decided on the intents' board.", 403);
    if (p.stage !== "proposal") throw new HttpError(`This intent is at the ${p.stage} stage: only one at Proposal is archived so.`, 409);
    return { ...(await archiveAsAuthor(tx, me, p)), intent: p.id as string, stage: "archived" as const };
  });
}

/**
 * Accept or archive an intent's work at Proposal (Samuel 2026-11-04: it ends accepted or archived, nothing else). An
 * admin decides any; whoever proposed it may archive their own. The answer says the stage the intent settled at.
 */
export async function decide(ctx: Ctx, me: Me | null, id: string, verdict: Verdict) {
  if (!me) throw new HttpError("Please sign in first.", 401);
  return ctx.db.transaction(async (tx) => {
    const p = await workOf(tx, id, true);
    if (!p) throw new HttpError("There is no such intent.", 404);
    if (!p.kind) throw new HttpError(`Intent ${p.id} holds no work of play's to decide.`, 409);
    // accepting is a forward move (./intents.ts mayMove: held while a dependency is not shipped); archiving goes back
    const no = verdict === "accept" ? await gate.mayMove(tx, p.id, "accept_work") : p.stage === "proposal" ? null : { why: `This intent is at the ${p.stage} stage: only one at Proposal is decided.` };
    if (no) throw new HttpError(no.why, 409);
    // a person decides only a waiting intent (./substate.ts)
    if (verdict === "accept") mustDecide(await getIntent(tx, p.id));
    let r: any;
    if (verdict === "archive" && p.author === me.id && me.level !== "admin") r = await archiveAsAuthor(tx, me, p);
    else {
      const k = kindOfWork(p.kind);
      if (!k) throw new HttpError(`play keeps no kind for ${p.kind}.`, 500);
      r = await decideWork(tx, ctx, me, p, verdict);
    }
    const { rows } = await tx.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1`, [p.id]);
    return { ...r, intent: p.id as string, stage: rows[0]?.stage };
  });
}

/**
 * An admin's decision on an intent, whatever its stage (the one place an intent is decided; play/SPEC.md §4.12): at
 * Proposal with work of play's, accepting applies it and archiving archives it (decide); anything else is the intent's
 * own decision (./intents.ts decideIntent), except that accepting an intent whose code is a pull request ships it
 * (./ship.ts acceptAndShip), and one whose code is on main by its trailer is the reconcile's (./ship.ts acceptCode,
 * Accepted once play runs it). Gives back the intent, with the decision's message where it has one.
 */
export async function decideAny(ctx: Ctx, me: Me | null, id: string, verdict: IntentVerdict | "archive", gh: GitHub | null = null, commit = runningCommit(), by?: AutoBy) {
  const db = ctx.db;
  const w = await workOf(db, id);
  // an intent whose work is another's private asset is decided by its owner alone, and to anyone else is as one that never was (./owners.ts)
  if (!w || (me && !(await seesIntent(db, me, w.id)))) throw new HttpError("There is no such intent.", 404);
  // a rule decides (./intents.ts autoMove): a person's path, the rule written as who decided
  if (by && me) me = { ...me, auto: by };
  const out = await decideOne(ctx, me, w, verdict, gh, commit);
  // a person's Accept: the intents it held are asked again (a rule may move them now); a rule's asks itself
  if (!by && out?.stage === "accepted" && w.stage !== "accepted") await autoAfter(ctx, w.id, { me, gh, commit });
  return out;
}

async function decideOne(ctx: Ctx, me: Me | null, w: any, verdict: IntentVerdict | "archive", gh: GitHub | null, commit: string | null) {
  const db = ctx.db;
  // code ships, with the work of play's it holds beside it accepted once it is live (intent 7c8986c5)
  if (verdict === "accept" && (!w.kind || w.pull_request)) {
    const shipped = (await acceptAndShip(db, gh, me, w.id)) ?? (await acceptCode(db, gh, me, w.id, commit));
    if (shipped) return shipped;
  }
  let decision: { status: string; number?: number; version?: string; merged?: boolean; message?: string } | undefined;
  if (w.kind && w.stage === "proposal" && (verdict === "accept" || verdict === "archive" || verdict === "reject")) {
    const { id: _id, intent: _i, stage: _s, why, ...r }: any = await decide(ctx, me, w.id, verdict === "accept" ? "accept" : "archive");
    decision = { ...r, ...(r.message ?? why ? { message: r.message ?? why } : {}) };
  } else await decideIntent(db, me, w.id, verdict === "archive" ? "reject" : verdict);
  const said = decision ? { decision, ...(decision.message ? { message: decision.message } : {}) } : {};
  if (me?.level !== "admin") return { id: w.id, stage: (await workOf(db, w.id))?.stage, ...said };
  return { ...(await getIntent(db, w.id)), ...said };
}


// kept for ./assetdocs.ts (held by other intents: intent-work/5884ade4/held.txt), which takes these from here: the
// registry's helpers are ./kinds.ts's, play's one error ./kit/errors.ts's, and a document's errors are HttpErrors already
export { named, versionAt, type Ctx, type Verdict };
export { HttpError as VersionError };
export function asVersionError<R>(run: () => Promise<R>): Promise<R> {
  return run();
}
