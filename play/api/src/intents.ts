// Intents (play/SPEC.md §4.12, Samuel 2026-11-06): everything on the Proposals board is an intent, something Maia City
// wants made, fixed or improved, named by its UUID, its title only shown. An intent goes
//
//   Idea → Specify → Prototype → Proposal → Accepted (or Archived)
//
// Idea: as it came, added by an agent over MCP (no one types one in by hand). Specify: an agent writes its spec, a goal,
// a scope and its checks, each check one statement that passes or fails and how it is checked (test: a command that
// passes; measure: a value and its range from a named tool; look: judged by eye against a named reference), must or
// nice. Prototype: once an admin approves the spec, the whole round trip of building it, the agent recording each
// check's result with its evidence. Proposal: play takes a proposal for it only once every must check has passed (the
// gate is play's, not a promise in a note); then it follows its proposals as admins decide them (the database's
// triggers, ./migrations.ts 0026). A proposal made with no intent gets one of its own, so the history is intents too.
//
// Every check runs in avenBOX (play/SPEC.md §4.12, Samuel 2026-11-06): the cloud environment the agents prototype in,
// with Postgres up and TEST_DATABASE_URL set (play/avenbox/up.sh). A test or measure check carries its `run`, the exact
// command that decides it there, from the repository's root, as written: no placeholder in it. In Prototype,
// `bun play/avenbox/intent.ts <intent> --record` runs every check of a spec and records the results. Once the work is
// merged, main runs the same checks in the same box (.github/workflows/intents.yml, the commits' `Intent: <uuid>`
// trailers) and records them as main's: an intent whose work goes through main is accepted on main's results.
import { Denied, COOP, type Me } from "./access";
import type { Queryable } from "./pg";
import { NOTE_MOST } from "./notes";
import { newId, UUID } from "./uuid";

export class IntentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const INTENT_KINDS = ["idea", "fix", "improve"] as const;
export type IntentKind = (typeof INTENT_KINDS)[number];
export const INTENT_STAGES = ["idea", "specify", "prototype", "proposal", "accepted", "archived"] as const;
export type IntentStage = (typeof INTENT_STAGES)[number];
/** the intents still to be taken further: not yet decided */
export const OPEN_STAGES: IntentStage[] = ["idea", "specify", "prototype", "proposal"];
export const CHECK_HOWS = ["test", "measure", "look"] as const;
/** run: the command that decides it in avenBOX (required for test and measure since 2026-11-06; specs from before have none) */
export type Check = { id: string; check: string; how: (typeof CHECK_HOWS)[number]; by: string; run?: string; must: boolean };
export type Spec = { goal: string; scope: string; checks: Check[] };
/** where a check's result was run: in avenBOX by the agent, or on main by .github/workflows/intents.yml after the merge */
export const WHERES = ["avenBOX", "main"] as const;
export type Where = (typeof WHERES)[number];
export type Result = { pass: boolean; evidence: string; by: string | null; at: string; where?: Where; commit?: string };
export const TITLE_MOST = 200;
export const CHECKS_MOST = 12;
const LINE_MOST = 600;
const RUN_MOST = 2000;
export type IntentVerdict = "approve" | "accept" | "reject" | "respecify" | "reopen";

/** only Maia City's admins keep the intents, as they decide the proposals */
function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins keep the intents.");
  return me;
}

const kindOf = (v: unknown): IntentKind => {
  if (v === undefined || v === null || v === "") return "idea";
  if (!INTENT_KINDS.includes(v as IntentKind)) throw new IntentError(`An intent's kind is ${INTENT_KINDS.join(", ")}.`);
  return v as IntentKind;
};
const titleOf = (v: unknown) => {
  const t = `${v ?? ""}`.replace(/\s+/g, " ").trim();
  if (!t) throw new IntentError("An intent needs a title: what is to be made, fixed or improved, in a line.");
  if (t.length > TITLE_MOST) throw new IntentError(`An intent's title is at most ${TITLE_MOST} characters: say the rest in its note.`);
  return t;
};
const textOf = (v: unknown, what: string, most: number, need = false) => {
  const n = `${v ?? ""}`.trim();
  if (need && !n) throw new IntentError(`An intent's spec needs its ${what}.`);
  if (n.length > most) throw new IntentError(`An intent's ${what} is at most ${most} characters.`);
  return n;
};
const idOf = (v: unknown) => {
  const id = `${v ?? ""}`;
  if (!UUID.test(id)) throw new IntentError("An intent is named by its id, a UUID (list_intents gives it).", 404);
  return id;
};

/**
 * What in a check's `run` is a placeholder rather than a command, or null: a `run` runs as written in avenBOX, so
 * nothing in it is left for its reader to fill in. Outside quotes (where a `<div class="card">` or a "…" is only text
 * searched for): an ellipsis (`…`, or `...` as a word), a `<something>` (`<its id>`, `test/<name>.test.ts`; a
 * redirection such as `< in > out` or `2>&1` is none), or TEST_DATABASE_URL given a value (avenBOX sets it).
 */
export function placeholderIn(run: string): string | null {
  const bare = run.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
  if (bare.includes("…")) return "…";
  const dots = bare.match(/(?:^|\s)\.\.\.(?=\s|$)/);
  if (dots) return "...";
  const angle = bare.match(/<[^<>\s]([^<>]*[^<>\s])?>/);
  if (angle) return angle[0];
  if (/(?:^|[\s;&|(])TEST_DATABASE_URL=/.test(bare)) return "TEST_DATABASE_URL=";
  return null;
}

/**
 * A spec as given, held to its shape: a goal (what is true when it is done), a scope (what changes, named by UUIDs,
 * hashes or paths, and what stays as it is), and 1–12 checks, at least one of them a must, each one statement that
 * passes or fails and how it is checked, a test or a measure with its `run`; each check gets its id (c1, c2 …), which
 * its results name.
 */
export function specOf(body: { goal?: unknown; scope?: unknown; checks?: unknown }): Spec {
  const goal = textOf(body?.goal, "goal (what is true when it is done, in a sentence)", 1000, true);
  const scope = textOf(body?.scope, "scope (what changes, named by its ids or paths, and what stays as it is)", NOTE_MOST, true);
  const given = body?.checks;
  if (!Array.isArray(given) || given.length < 1 || given.length > CHECKS_MOST)
    throw new IntentError(`An intent's spec has 1 to ${CHECKS_MOST} checks: each one statement that passes or fails, and how it is checked.`);
  const checks: Check[] = given.map((c: any, i) => {
    const check = textOf(c?.check, `check ${i + 1}'s statement`, LINE_MOST, true);
    if (!CHECK_HOWS.includes(c?.how)) throw new IntentError(`Check ${i + 1} is checked by test (a command that passes), measure (a value and its range) or look (by eye against a named reference).`);
    const by = textOf(c?.by, `check ${i + 1}'s how (${c.how === "test" ? "the command or test that passes" : c.how === "measure" ? "the tool that measures it and the range it must fall in" : "the reference it is judged against"})`, LINE_MOST, true);
    const run = textOf(c?.run, `check ${i + 1}'s run`, RUN_MOST);
    if (!run && c.how !== "look")
      throw new IntentError(`Check c${i + 1} (a ${c.how}) needs its run: the command that decides it in avenBOX, from the repository's root, as written (${c.how === "test" ? "it passes when it exits 0" : "it prints the value it measures and exits 0 only when that is in its range"}).`);
    const hole = run && placeholderIn(run);
    if (hole) throw new IntentError(`Check c${i + 1}'s run holds a placeholder (${hole}): a run is a command that runs as written in avenBOX, nothing in it left to fill in.`);
    return { id: `c${i + 1}`, check, how: c.how, by, ...(run ? { run } : {}), must: c?.must !== false };
  });
  if (!checks.some((c) => c.must)) throw new IntentError("At least one of an intent's checks is a must: what must hold before it is accepted.");
  return { goal, scope, checks };
}

/** the intents with who wrote, specified, approved and decided them, and each one's proposals (id, status, kind, group) */
async function intentsWhere(db: Queryable, where: string, args: unknown[]) {
  const { rows } = await db.query<any>(
    `SELECT i.id, i.kind, i.title, i.note, i.stage, i.via, i.created, i.spec, i.results, i.specified_at, i.approved_at, i.decided_at,
            au.name AS author, sp.name AS specified_by, ap.name AS approved_by, de.name AS decided_by,
            COALESCE((SELECT json_agg(json_build_object('id', p.id, 'status', p.status, 'kind', p.kind, 'grp', a.grp) ORDER BY p.created)
                        FROM play.proposals p LEFT JOIN play.assets a ON a.id = p.asset_id WHERE p.intent_id = i.id), '[]'::json) AS proposals
       FROM play.intents i
       LEFT JOIN play.humans au ON au.id = i.author
       LEFT JOIN play.humans sp ON sp.id = i.specified_by
       LEFT JOIN play.humans ap ON ap.id = i.approved_by
       LEFT JOIN play.humans de ON de.id = i.decided_by
      WHERE i.coop_id = $1 AND ${where}
      ORDER BY COALESCE(i.decided_at, i.created) DESC LIMIT 500`,
    [COOP, ...args],
  );
  return rows;
}

/** The intents at the given stages (every stage where none is given), the latest first. */
export async function listIntents(db: Queryable, me: Me | null, stages?: string[]) {
  admin(me);
  for (const s of stages ?? []) if (!INTENT_STAGES.includes(s as IntentStage)) throw new IntentError(`An intent's stage is ${INTENT_STAGES.join(", ")}.`);
  return intentsWhere(db, `($2::text[] IS NULL OR i.stage = ANY($2::text[]))`, [stages ?? null]);
}

async function intentRow(db: Queryable, id: string) {
  const [intent] = await intentsWhere(db, `i.id = $2`, [idOf(id)]);
  if (!intent) throw new IntentError("There is no such intent.", 404);
  return intent;
}

/** One intent with its proposals as the board lists them (their labels, kinds and statuses), via ./proposals.ts. */
export async function intentOf(db: Queryable, me: Me | null, id: string, proposalsOf: (db: Queryable, intent: string) => Promise<unknown[]>) {
  admin(me);
  const intent = await intentRow(db, id);
  return { ...intent, proposals: await proposalsOf(db, intent.id) };
}

/** A new intent at the Idea stage, by an admin's agent over MCP (no one adds one by hand). */
export async function addIntent(db: Queryable, me: Me | null, body: { kind?: unknown; title?: unknown; note?: unknown }) {
  const who = admin(me);
  const id = newId();
  await db.query(`INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via) VALUES ($1, $2, $3, $4, $5, 'idea', $6, 'mcp')`, [
    id, COOP, kindOf(body?.kind), titleOf(body?.title), textOf(body?.note, "note", NOTE_MOST), who.id,
  ]);
  return intentRow(db, id);
}

/**
 * An intent specified over MCP: its spec (specOf) and, where given, its title, kind or note made sharper. It moves to
 * Specify, where an admin approves it before it is built; specified again, its spec is replaced. One already approved
 * is sent back to Specify by an admin first.
 */
export async function specifyIntent(db: Queryable, me: Me | null, id: string, body: { goal?: unknown; scope?: unknown; checks?: unknown; title?: unknown; kind?: unknown; note?: unknown }) {
  const who = admin(me);
  const intent = await intentRow(db, id);
  if (intent.stage !== "idea" && intent.stage !== "specify")
    throw new IntentError(`Intent ${intent.id} is at the ${intent.stage} stage: ${intent.stage === "prototype" ? "its spec is approved; an admin sends it back to Specify before it changes" : "it is specified no more"}.`, 409);
  const spec = specOf(body);
  await db.query(
    `UPDATE play.intents SET stage = 'specify', spec = ($2::text)::jsonb, results = NULL, specified_by = $3, specified_at = now(), kind = $4, title = $5, note = $6 WHERE id = $1`,
    [
      intent.id, JSON.stringify(spec), who.id,
      body?.kind === undefined ? intent.kind : kindOf(body.kind),
      body?.title === undefined ? intent.title : titleOf(body.title),
      body?.note === undefined ? intent.note : textOf(body.note, "note", NOTE_MOST),
    ],
  );
  return intentRow(db, intent.id);
}

/**
 * Checks' results recorded while an intent is prototyped (over MCP): each names its check, passes or fails, and says
 * its evidence (the command and what it printed, the value measured, what was compared with what). The latest result of
 * a check stands; the gate to a proposal reads them.
 */
export async function recordChecks(db: Queryable, me: Me | null, id: string, given: unknown) {
  const who = admin(me);
  const intent = await intentRow(db, id);
  if (intent.stage !== "prototype") throw new IntentError(`Intent ${intent.id} is at the ${intent.stage} stage: checks are recorded while it is prototyped (its spec approved).`, 409);
  const ids = new Set((intent.spec?.checks ?? []).map((c: Check) => c.id));
  if (!Array.isArray(given) || !given.length) throw new IntentError("Give each check's result: { check: 'c1', pass: true | false, evidence }.");
  const results: Record<string, Result> = { ...(intent.results ?? {}) };
  const at = new Date().toISOString();
  for (const r of given as any[]) {
    if (!ids.has(r?.check)) throw new IntentError(`${r?.check} is not one of this intent's checks (${[...ids].join(", ")}).`);
    if (typeof r?.pass !== "boolean") throw new IntentError(`${r.check}: pass is true or false.`);
    const evidence = textOf(r?.evidence, `${r.check}'s evidence (the command and what it printed, the value measured, what was compared)`, 4000, true);
    const where = r?.where === undefined || r?.where === null || r?.where === "" ? "avenBOX" : r.where;
    if (!WHERES.includes(where)) throw new IntentError(`${r.check}: where is ${WHERES.join(" or ")} (where the check was run).`);
    const commit = r?.commit === undefined || r?.commit === null || r?.commit === "" ? undefined : `${r.commit}`;
    if (commit !== undefined && !/^[0-9a-f]{40}$/.test(commit)) throw new IntentError(`${r.check}: commit is the 40-character git hash it ran on.`);
    results[r.check] = { pass: r.pass, evidence, by: who.name, at, where, ...(commit ? { commit } : {}) };
  }
  await db.query(`UPDATE play.intents SET results = ($2::text)::jsonb WHERE id = $1`, [intent.id, JSON.stringify(results)]);
  return intentRow(db, intent.id);
}

/** the must checks of an intent that have not passed, as people read them, or none: the gate to a proposal and to accepting */
export function unmet(intent: { spec: Spec | null; results: Record<string, Result> | null }) {
  return (intent.spec?.checks ?? [])
    .filter((c) => c.must && intent.results?.[c.id]?.pass !== true)
    .map((c) => `${c.id} (${c.check}): ${intent.results?.[c.id] ? "failed" : "no result yet"}`);
}

/**
 * The final gate, for an intent accepted from Prototype (its work merged into main, outside play's proposals): every
 * must check with a `run` has passed on main (its latest result recorded there by .github/workflows/intents.yml), a
 * pass in avenBOX alone is not enough; a must check without a run (a look, a spec from before) as unmet() reads it.
 */
export function unmetOnMain(intent: { spec: Spec | null; results: Record<string, Result> | null }) {
  return (intent.spec?.checks ?? [])
    .filter((c) => c.must)
    .flatMap((c) => {
      const r = intent.results?.[c.id];
      if (!c.run) return r?.pass === true ? [] : [`${c.id} (${c.check}): ${r ? "failed" : "no result yet"}`];
      if (r?.pass === true && r.where === "main") return [];
      return [`${c.id} (${c.check}): ${!r ? "no result yet" : r.where !== "main" ? `${r.pass ? "passed" : "failed"} in avenBOX, not yet run on main` : "failed on main"}`];
    });
}

/**
 * The intent a proposal is about to be made for, held to the gate: its spec approved (Prototype, or Proposal when it
 * takes another), and every must check passed. Otherwise nothing is proposed and the agent is told what is missing.
 */
export async function intentReady(db: Queryable, me: Me | null, id: unknown) {
  admin(me);
  const intent = await intentRow(db, `${id ?? ""}`);
  if (intent.stage === "idea" || intent.stage === "specify")
    throw new IntentError(`Intent ${intent.id} is at the ${intent.stage} stage: it is specified (specify_intent) and its spec approved by an admin before it is built and proposed.`, 409);
  if (intent.stage !== "prototype" && intent.stage !== "proposal") throw new IntentError(`Intent ${intent.id} is ${intent.stage}: it takes no more proposals.`, 409);
  const missing = unmet(intent);
  if (missing.length) throw new IntentError(`Intent ${intent.id} is not ready to propose: every must check passes first (record them with check_intent). ${missing.join("; ")}.`, 409);
  return intent;
}

/**
 * An admin's decision on the board: approve a spec (Specify → Prototype: the agent may build it), send an approved one
 * back to Specify, accept an intent whose work is not one of play's proposals (Prototype → Accepted, every must check
 * passed, on main where it has a run: unmetOnMain), reject one (it ends archived), or bring a decided one back (to Specify with its spec, else to Idea).
 */
export async function decideIntent(db: Queryable, me: Me | null, id: string, verdict: IntentVerdict) {
  const who = admin(me);
  const intent = await intentRow(db, id);
  const refuse = (why: string) => {
    throw new IntentError(why, 409);
  };
  switch (verdict) {
    case "approve":
      if (intent.stage !== "specify") refuse(`Only a specified intent's spec is approved; this one is at the ${intent.stage} stage.`);
      await db.query(`UPDATE play.intents SET stage = 'prototype', approved_by = $2, approved_at = now(), results = NULL WHERE id = $1`, [intent.id, who.id]);
      break;
    case "respecify":
      if (intent.stage !== "prototype") refuse(`Only an intent being prototyped goes back to Specify; this one is at the ${intent.stage} stage.`);
      await db.query(`UPDATE play.intents SET stage = 'specify', approved_by = NULL, approved_at = NULL, results = NULL WHERE id = $1`, [intent.id]);
      break;
    case "accept": {
      if (intent.stage !== "prototype") refuse(`An intent is accepted here from Prototype (its work outside play's proposals); one at the ${intent.stage} stage is decided by its proposals.`);
      const missing = unmetOnMain(intent);
      if (missing.length) refuse(`Every must check passes before an intent is accepted, each with a run on main once its work is merged (.github/workflows/intents.yml): ${missing.join("; ")}.`);
      await db.query(`UPDATE play.intents SET stage = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [intent.id, who.id]);
      break;
    }
    case "reject":
      if (!["idea", "specify", "prototype"].includes(intent.stage)) refuse(`An intent at the ${intent.stage} stage is decided by its proposals, or is decided already.`);
      await db.query(`UPDATE play.intents SET stage = 'archived', decided_by = $2, decided_at = now() WHERE id = $1`, [intent.id, who.id]);
      break;
    case "reopen":
      if (intent.stage !== "accepted" && intent.stage !== "archived") refuse(`This intent is at the ${intent.stage} stage already.`);
      if (intent.proposals.some((p: { status: string }) => p.status === "proposal")) refuse("This intent still has a proposal waiting for a decision.");
      await db.query(
        `UPDATE play.intents SET stage = CASE WHEN spec IS NULL OR jsonb_array_length(spec->'checks') = 0 THEN 'idea' ELSE 'specify' END,
                approved_by = NULL, approved_at = NULL, results = NULL, decided_by = NULL, decided_at = NULL WHERE id = $1`,
        [intent.id],
      );
      break;
    default:
      throw new IntentError("No such decision.", 404);
  }
  return intentRow(db, intent.id);
}
