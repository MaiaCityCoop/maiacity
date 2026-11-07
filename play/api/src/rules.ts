// Auto-accept rules (play/SPEC.md §4.12 "Auto-accept rules"; intent de24f1c5, Samuel 2026-11-07: "Rules that we set on
// allowed for specify specs intent types or proposal accept state intents, that can get auto accepted and need no HITL
// … only changeable via HITLs and also version controlled"). The rules are one document, `rules:<RULES>` of its own
// schema (`schema:<SCHEMA.rules>`, ../migrations/schemas/rules.json), kept in Postgres like every other: its Main is the
// rules in force, its v1 (made at migrate's end where absent) holds the first rule, and every later version is a
// person's Accept of an intent variant. Nothing here decides: matchRule only says which rule, if any, an intent meets
// at a gate, and ./intents.ts autoMove (beside the gate, mayMove) takes the move a person would, with that rule as who
// decided it.
//
// The rules are always a person's: matchRule gives null, whatever the rules say, for an intent whose work changes the
// rule set or its schema (or that declares it will), so no rule can open them.
import type { Db, Queryable } from "./pg";
import * as docs from "./docs";
import { COOP, RULE, RULES, SCHEMA } from "./ids";
import { kindOfWork } from "./versioned";

export const GATES = ["approve", "accept"] as const;
export type Gate = (typeof GATES)[number];

/** what a rule names, each field a condition that holds or doesn't (a list: any of its values); the accept fields are not looked at at approve */
export type Match = {
  kind?: string[]; via?: string[]; author?: string[]; work_kind?: string[];
  proposed_by?: string[]; proposed_via?: string[]; schemas?: string[]; code?: boolean; new_only?: boolean; max_documents?: number; max_edits?: number;
};
export type Rule = { id: string; label: string; gates: Gate[]; match: Match; reason: string };
/** the rule set in force: its Main's newest version, and that version's BLAKE3 content hash */
export type RuleSet = { rules: Rule[]; hash: string; number: number };
/** who decided, where a rule did: the rule (its UUID, its label only shown), the rule set's version and the rule's reason */
export type AutoBy = { rule: string; label: string; rules: string; reason: string };

/** the rule set's document, and its schema's */
export const RULES_DOC = `rules:${RULES}`;
export const RULES_SCHEMA_DOC = `schema:${SCHEMA.rules}`;

/** the first rule (Samuel 2026-11-07): an artifact added or corrected over MCP needs no tap */
export const FIRST_RULE: Rule = {
  id: RULE.artifacts,
  label: "Artifacts need no tap",
  gates: ["approve", "accept"],
  match: { via: ["mcp"], work_kind: [SCHEMA.artifact], schemas: [SCHEMA.artifact] },
  reason: "Samuel 2026-11-07: an artifact added or corrected over MCP needs no tap",
};
/** the rule set's v1, as migrate makes it */
export const RULES_V1 = {
  schema: "rules/1",
  label: "Auto-accept rules",
  note: "Which intents pass Approve spec or Accept with no person (play/SPEC.md §4.12). The first matching rule, in order, decides. Changed only by a person's Accept.",
  rules: [FIRST_RULE],
};

/** The end of migrate(), after ensureSchemas: the rule set's v1, made only where absent (one at a time: play-api and the import migrate at once on a deploy). */
export async function ensureRules(db: Db): Promise<boolean> {
  return db.transaction(async (q) => {
    await q.query(`SELECT pg_advisory_xact_lock(4711030)`);
    if ((await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [RULES_DOC])).rows.length) return false;
    await q.query(`INSERT INTO play.records (id, coop_id, kind, label, updated) VALUES ($1, $2, 'rules', $3, now()) ON CONFLICT (id) DO NOTHING`, [RULES, COOP, RULES_V1.label]);
    const note = "the first rule: artifacts need no tap (Samuel 2026-11-07)";
    await docs.createDoc(q, { id: RULES_DOC, schema: SCHEMA.rules, json: RULES_V1, author: { human: null, via: "import" }, message: `v1: ${note}`, version: note });
    return true;
  });
}

/** The rule set in force (its Main's newest version), or null where play holds none. */
export async function ruleSetOf(q: Queryable): Promise<RuleSet | null> {
  const versions = await docs.versionsOf(q, RULES_DOC);
  const last = versions.at(-1);
  if (!last) return null;
  const json = (await docs.readDoc(q, RULES_DOC)).json;
  return { rules: Array.isArray(json?.rules) ? json.rules : [], hash: last.contentHash, number: last.number };
}

/** what a rule is matched against: the intent, its declared work, and (at accept) the work it holds */
export type Facts = {
  kind: string; via: string; author: string | null; work_kind: string[] | null;
  proposed_by: string | null; proposed_via: string | null;
  /** its work is a pull request (no work of play's) */
  code: boolean;
  /** the documents its work changes, each by its id (`<prefix>:<uuid>`), and each one's schema */
  docs: string[]; schemas: string[];
  /** its work only makes new documents (none had a version before) */
  new_only: boolean;
  /** the edits of its intent variants */
  edits: number;
  /** it holds play's work and a pull request (intent 7c8986c5): no rule decides it, a person does */
  both?: boolean;
};

/** An intent's facts as matchRule reads them, from Postgres. */
export async function factsOf(q: Queryable, id: string): Promise<Facts> {
  const { rows: [i] } = await q.query<any>(
    `SELECT i.kind, i.via, i.author, to_jsonb(i)->'work_kind' AS work_kind, i.proposed_by, i.proposed_via, i.work, i.pull_request FROM play.intents i WHERE i.id = $1`,
    [id],
  );
  const { rows: held } = await q.query<{ doc_id: string; schema_id: string | null; edits: string; versions: string }>(
    `SELECT iv.doc_id, d.schema_id, (SELECT count(*) FROM play.doc_edits e WHERE e.variant = iv.variant_id) AS edits,
            (SELECT count(*) FROM play.doc_versions v WHERE v.doc_id = iv.doc_id AND v.created < COALESCE(dv.created, now())) AS versions
       FROM play.intent_variants iv JOIN play.docs d ON d.id = iv.doc_id LEFT JOIN play.doc_variants dv ON dv.id = iv.variant_id
      WHERE iv.intent_id = $1 ORDER BY iv.position`,
    [id],
  );
  const schemas = held.map((h) => h.schema_id ?? "");
  // work of play's held in no intent variant (an older kind's row): its kind's schema
  const own = i?.work ? kindOfWork(i.work)?.schema : undefined;
  if (i?.work && !held.length && own) schemas.push(own);
  return {
    kind: i?.kind, via: i?.via, author: i?.author ?? null, work_kind: Array.isArray(i?.work_kind) ? i.work_kind : null,
    proposed_by: i?.proposed_by ?? null, proposed_via: i?.proposed_via ?? null,
    code: !i?.work && !!i?.pull_request,
    docs: held.map((h) => h.doc_id), schemas,
    new_only: held.length > 0 && held.every((h) => Number(h.versions) === 0),
    edits: held.reduce((n, h) => n + Number(h.edits), 0),
    both: !!i?.work && !!i?.pull_request,
  };
}

/** whether the intent's work changes the rules, or it declares it will: then no rule decides it */
export function touchesRules(f: Pick<Facts, "docs" | "work_kind">): boolean {
  return f.docs.includes(RULES_DOC) || f.docs.includes(RULES_SCHEMA_DOC) || !!f.work_kind?.some((k) => k === SCHEMA.rules || k === SCHEMA.meta);
}

const among = (list: unknown[] | undefined, v: unknown) => list === undefined || list.includes(v as never);

/** whether `rule` holds for `f` at `gate`: every field it names for that gate */
function holds(rule: Rule, f: Facts, gate: Gate): boolean {
  const m = rule.match ?? {};
  if (!among(m.kind, f.kind) || !among(m.via, f.via) || !among(m.author, f.author)) return false;
  // every kind the intent declares is one of these; one that declares nothing is matched by no rule naming work_kind
  if (m.work_kind !== undefined && !(f.work_kind?.length && f.work_kind.every((k) => m.work_kind!.includes(k)))) return false;
  if (gate === "approve") return true;
  if (!among(m.proposed_by, f.proposed_by) || !among(m.proposed_via, f.proposed_via)) return false;
  if (m.schemas !== undefined && !(f.schemas.length && f.schemas.every((s) => m.schemas!.includes(s)))) return false;
  if (m.code !== undefined && m.code !== f.code) return false;
  if (m.new_only !== undefined && m.new_only !== f.new_only) return false;
  if (m.max_documents !== undefined && f.docs.length > m.max_documents) return false;
  if (m.max_edits !== undefined && f.edits > m.max_edits) return false;
  return true;
}

/**
 * The rule that decides intent `f` at `gate`: the first, in order, that names the gate and whose every field holds;
 * null where none does, and always null for an intent that touches the rules (they are always a person's) or holds
 * both code and play's work.
 */
export function matchRule(f: Facts, gate: Gate, set: Pick<RuleSet, "rules"> | null): Rule | null {
  if (!set || touchesRules(f) || f.both) return null;
  return set.rules.find((r) => r.gates?.includes(gate) && holds(r, f, gate)) ?? null;
}
