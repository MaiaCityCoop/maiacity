// Butler James (intent a6ae861e): Maia City's CRM table of leads, the firms we may sell to, each a document
// `lead:<uuid>` of the lead schema (SCHEMA.lead, ../migrations/schemas/lead.json): its contact as the firm publishes it,
// its website and where it stands in our pipeline (the schema's stages, changed by proposal). Every lead is named by
// its UUID; its company, email and website are only data. One firm is kept once (its website, else its email). Read and
// changed over MCP (./leadtools.ts) as an intent's work; with no intent named a change makes its own (./own.ts), which
// the rules decide ("Leads need no tap"). Admins only. Nothing here sends mail or calls (German UWG §7).
import { admin, type Me } from "./access";
import { urlOf } from "./artifacts";
import type { BlobStore } from "./blobs";
import * as docs from "./docs";
import { SCHEMA } from "./kit/ids";
import { HttpError } from "./kit/errors";
import type { Db, Queryable } from "./kit/pg";
import { UUID } from "./kit/uuid";
import { flat, ownIntent, type Own } from "./own";
import { proposeDocVersion } from "./versioned";

export const LEAD_ADMINS = "Only Maia City's admins open Butler James.";

/** a lead's text fields and their most characters (the schema holds the same; here so a refusal says it plainly) */
const TEXTS = { company: 160, contact: 160, email: 254, website: 2000, phone: 60, city: 120, region: 120, segment: 400, lost_reason: 400, next_step: 400, next_date: 10, notes: 20000, found_at: 2000 } as const;
/** the fields a caller gives (`operator` is play's: the admin who added it) */
export const LEAD_FIELDS = [...Object.keys(TEXTS), "firm", "source", "stage", "do_not_contact"] as const;
type Given = Partial<Record<(typeof LEAD_FIELDS)[number], unknown>>;
type Lead = Record<string, unknown> & { schema: "lead/1" };

// ---- a lead, held to its form (the schema checks again on every commit: its stages, firms and sources are its enums)

function formOf(cur: Lead, b: Given): Lead {
  const next: Lead = { ...cur };
  for (const [k, most] of Object.entries(TEXTS)) {
    const v = b[k as keyof Given];
    if (v === undefined) continue;
    if (v === null || v === "") {
      delete next[k];
      continue;
    }
    if (typeof v !== "string") throw new HttpError(`A lead's ${k} is text.`);
    const t = k === "notes" ? v.trim() : v.trim().replace(/\s+/g, " ");
    if (t.length > most) throw new HttpError(`A lead's ${k} is at most ${most} characters.`);
    next[k] = t;
  }
  if (typeof next.website === "string" && b.website !== undefined) next.website = urlOf(next.website);
  if (typeof next.found_at === "string" && b.found_at !== undefined) next.found_at = urlOf(next.found_at);
  if (typeof next.email === "string" && b.email !== undefined) {
    next.email = next.email.toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next.email as string)) throw new HttpError(`${next.email} is not an email address. Give it as the firm publishes it, or leave it out.`);
  }
  if (typeof next.next_date === "string" && b.next_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(next.next_date as string)) throw new HttpError("A lead's next_date is YYYY-MM-DD.");
  for (const k of ["firm", "source", "stage"] as const) {
    if (b[k] === undefined) continue;
    if (typeof b[k] !== "string") throw new HttpError(`A lead's ${k} is one of the lead schema's words (list_docs kind schema).`);
    next[k] = b[k];
  }
  if (b.do_not_contact !== undefined) {
    if (typeof b.do_not_contact !== "boolean") throw new HttpError("A lead's do_not_contact is true or false.");
    next.do_not_contact = b.do_not_contact;
  }
  const problems = leadCheck(next);
  if (problems.length) throw new HttpError(problems.join("; "));
  return next;
}

/** what the schema can't say (./allkinds.ts' lead kind): a kept lead has its company, source and stage; a lost one its reason */
export function leadCheck(doc: any): string[] {
  if (Object.keys(doc ?? {}).length <= 1) return [];
  const out = ["company", "source", "stage"].filter((f) => !doc[f]).map((f) => `$.${f}: a lead has its ${f}`);
  if (doc.stage === "lost" && !doc.lost_reason) out.push("$.lost_reason: a lost lead says why it was lost (lost_reason)");
  return out;
}

/** what makes one firm one lead: its website, else its email (a check, never a lookup key) */
const firmOf = (j: any): string | null => (j?.website ? `w:${j.website}` : j?.email ? `e:${j.email}` : null);

// ---- reading

type Row = { id: string; json: any; number: number; created: Date; updated: Date; intent: string | null };

/** every kept lead (an accepted version, not retired), each its Main and the intent of a change of it that waits */
async function leadsOf(db: Queryable): Promise<Row[]> {
  const { rows } = await db.query<{ id: string; number: number; created: Date; updated: Date; intent: string | null }>(
    `SELECT r.id::text AS id, r.created, (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = d.id) AS number,
            (SELECT max(created) FROM play.doc_versions v WHERE v.doc_id = d.id) AS updated,
            (SELECT iv.intent_id FROM play.intent_variants iv JOIN play.intents i ON i.id = iv.intent_id WHERE iv.doc_id = d.id AND i.stage IN ('build', 'proposal') LIMIT 1) AS intent
       FROM play.records r JOIN play.docs d ON d.id = 'lead:' || r.id::text
      WHERE r.kind = 'lead' AND d.retired_at IS NULL AND EXISTS (SELECT 1 FROM play.doc_versions v WHERE v.doc_id = d.id)
      ORDER BY r.created DESC, r.id`,
  );
  const out: Row[] = [];
  for (const r of rows) out.push({ ...r, number: Number(r.number), json: (await docs.readDoc(db, `lead:${r.id}`)).json });
  return out;
}

const shape = (r: Row) => {
  const { schema: _s, ...fields } = r.json;
  return { id: r.id, ...fields, do_not_contact: !!fields.do_not_contact, version: r.number, created: new Date(r.created).toISOString(), updated: new Date(r.updated).toISOString(), intent: r.intent };
};

const idOf = (v: unknown) => {
  const id = `${v ?? ""}`.toLowerCase();
  if (!UUID.test(id)) throw new HttpError("A lead is named by its id, a UUID (list_leads gives it).", 404);
  return id;
};

async function leadRow(db: Queryable, id: string) {
  const r = (await leadsOf(db)).find((x) => x.id === id);
  if (!r) throw new HttpError("No lead is kept by that id (list_leads).", 404);
  return r;
}

export type LeadQuery = { q?: string | null; stage?: string | null; firm?: string | null; source?: string | null; region?: string | null; offset?: number; limit?: number };

/** The leads, newest first, a page at a time, narrowed by stage, firm, source and region and by words in `q`. */
export async function listLeads(db: Queryable, me: Me | null, o: LeadQuery = {}) {
  admin(me, LEAD_ADMINS);
  const q = `${o.q ?? ""}`.trim().toLowerCase();
  const is = (v: unknown, want: string | null | undefined) => !want || `${v ?? ""}`.toLowerCase() === want.toLowerCase();
  const all = (await leadsOf(db)).filter(
    (r) =>
      is(r.json.stage, o.stage) && is(r.json.firm, o.firm) && is(r.json.source, o.source) && is(r.json.region, o.region) &&
      (!q || ["company", "contact", "email", "website", "city", "region", "notes", "segment"].some((k) => `${r.json[k] ?? ""}`.toLowerCase().includes(q))),
  );
  const offset = Math.max(0, Math.floor(Number(o.offset) || 0));
  const limit = Math.min(200, Math.max(1, Math.floor(Number(o.limit) || 50)));
  return { total: all.length, offset, limit, items: all.slice(offset, offset + limit).map(shape) };
}

/** One lead, whole. */
export async function leadOf(db: Queryable, me: Me | null, id: unknown) {
  admin(me, LEAD_ADMINS);
  return shape(await leadRow(db, idOf(id)));
}

// ---- changing: its next version proposed for the intent named, or for its own (no tap where the rules say so)

/** the lead a firm is kept as (accepted), or the intent whose work keeps it already (waiting) */
async function firmHeld(db: Queryable, key: string | null, not?: string): Promise<{ kept?: string; waiting?: string }> {
  if (!key) return {};
  const kept = (await leadsOf(db)).find((r) => r.id !== not && firmOf(r.json) === key);
  if (kept) return { kept: kept.id };
  const { rows } = await db.query<{ intent_id: string; doc_id: string; variant_id: string }>(
    `SELECT iv.intent_id, iv.doc_id, iv.variant_id FROM play.intent_variants iv JOIN play.intents i ON i.id = iv.intent_id
      WHERE iv.doc_id LIKE 'lead:%' AND i.stage IN ('build', 'proposal')`,
  );
  for (const o of rows) if (o.doc_id !== `lead:${not}` && firmOf((await docs.readDoc(db, o.doc_id, { variant: Number(o.variant_id) })).json) === key) return { waiting: o.intent_id };
  return {};
}

/** the lead's own intent: play's spec of it, one look recorded as passed with the form checks as its evidence */
const ownSpec = (o: { kind: "idea" | "improve"; title: string; goal: string; json: any }): Own => ({
  kind: o.kind, title: o.title, goal: o.goal, of: "the lead's", work: SCHEMA.lead,
  scope: "One lead of Butler James and its fields; nothing else changes.", nothing: "a lead kept or changed removes nothing",
  check: { check: "The lead holds to the leads' form (its company, source and stage, one firm once)", by: "the form checks add_lead and update_lead make, and the lead schema" },
  evidence: `play's form checks passed: ${o.json.company}, stage ${o.json.stage}, source ${o.json.source}${o.json.website ? `, website ${o.json.website}` : ""}${o.json.email ? `, email ${o.json.email}` : ""}.`,
});

/** Keep a lead (its first version proposed); a firm kept already answers with it (`kept`), one waiting with its intent. */
export async function addLead(db: Db, store: BlobStore, me: Me | null, b: Given, intent?: string) {
  admin(me, LEAD_ADMINS);
  if (intent) return addIn(db, store, me, b, intent);
  return db.transaction((tx) => addIn(flat(tx), store, me, b));
}

async function addIn(db: Db, store: BlobStore, me: Me | null, b: Given, intent?: string) {
  const who = admin(me, LEAD_ADMINS);
  const json = formOf({ schema: "lead/1" }, { ...b, stage: b?.stage ?? "researched" });
  json.operator = who.id;
  const held = await firmHeld(db, firmOf(json));
  if (held.kept) return { ...shape(await leadRow(db, held.kept)), kept: true };
  if (held.waiting) return { company: json.company, kept: false, waiting: true, intent: held.waiting, stage: "proposal" };
  const note = `Keep the lead ${json.company}`;
  const propose = (i: string) => proposeDocVersion({ db, store }, who, { kind: "lead", whole: json, note, intent: i });
  if (intent) {
    const r = await propose(intent);
    return { id: r.doc, company: json.company, kept: false, waiting: true, intent: r.intent, stage: r.stage };
  }
  const own = await ownIntent(db, store, who, ownSpec({ kind: "idea", title: `Keep the lead ${json.company}`, goal: `Butler James keeps the lead ${json.company}.`, json }), propose);
  if (own.stage === "accepted" && own.proposed) return { ...shape(await leadRow(db, own.proposed.doc)), kept: false, waiting: false, intent: own.intent, stage: own.stage, auto: own.auto };
  return { id: own.proposed?.doc ?? null, company: json.company, kept: false, waiting: true, intent: own.intent, stage: own.stage };
}

/** Change a kept lead (its next version proposed): any of its fields, each held to its form. With no intent named it makes its own. */
export async function updateLead(db: Db, store: BlobStore, me: Me | null, lead: unknown, b: Given, intent?: string) {
  admin(me, LEAD_ADMINS);
  if (intent) return updateIn(db, store, me, lead, b, intent);
  return db.transaction((tx) => updateIn(flat(tx), store, me, lead, b));
}

async function updateIn(db: Db, store: BlobStore, me: Me | null, lead: unknown, b: Given, intent?: string) {
  const who = admin(me, LEAD_ADMINS);
  const id = idOf(lead);
  const now = await leadRow(db, id);
  const fields = Object.keys(b ?? {}).filter((k) => b[k as keyof Given] !== undefined);
  if (!fields.length) throw new HttpError("Nothing to change: give the fields to change.");
  const next = formOf(now.json, b);
  const key = firmOf(next);
  if (key !== firmOf(now.json)) {
    const held = await firmHeld(db, key, id);
    if (held.kept || held.waiting) throw new HttpError(`That firm is kept already, as ${held.kept ? `lead ${held.kept}` : `intent ${held.waiting}'s work`}.`, 409);
  }
  const what = fields.map((k) => (k === "stage" ? `stage ${now.json.stage} → ${next.stage}` : k)).join(", ");
  const note = `Change the lead ${next.company}: ${what}`;
  const propose = (i: string) => proposeDocVersion({ db, store }, who, { doc: id, whole: next, note, intent: i });
  if (intent) {
    const r: any = await propose(intent);
    return { ...shape(now), waiting: true, intent: r.intent, stage: r.stage, number: r.number };
  }
  const own = await ownIntent(db, store, who, ownSpec({ kind: "improve", title: `Change the lead ${now.json.company}`, goal: `Butler James keeps the lead ${next.company} changed: ${what}.`, json: next }), propose);
  const r: any = own.proposed;
  if (own.stage === "accepted") return { ...shape(await leadRow(db, id)), waiting: false, intent: own.intent, stage: own.stage, auto: own.auto };
  return { ...shape(now), waiting: true, intent: own.intent, stage: own.stage, ...(r ? { number: r.number } : {}) };
}
