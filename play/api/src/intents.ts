// Intents (play/SPEC.md §4.12, Samuel 2026-11-06): everything on the board is an intent, something Maia City wants made,
// fixed or improved, named by its UUID, its title only shown. One record: an intent and its proposal are the same thing
// ("not a proposal belongs to an intent: the intent has a state, proposal"), so the work it brings (an asset's or a
// story's, factory's, config's or skill's version, ./versioned.ts, or a sandbox's change: ./work.ts) is on the intent itself. It goes
//
//   Idea → Specify → Build → Proposal → (Ship →) Accepted (or Archived)
//
// Idea: as it came, added by an agent over MCP (no one types one in by hand). Specify: an agent writes its spec, a goal,
// a scope and its checks, each check one statement that passes or fails and how it is checked (test: a command that
// passes; measure: a value and its range from a named tool; look: judged by eye against a named reference), must or
// nice. Build: once an admin approves the spec, the whole round trip of building it, the agent recording each
// check's result with its evidence, its work perhaps in progress (a draft branch). Proposal: the moment every must check
// has passed, the intent moves there by itself (Samuel 2026-11-06), and proposing its work (every propose tool's
// `intent`) puts it there with that work, play taking it only once every must check has passed; so after the spec there
// is one gate with a person in it, the decision at Proposal: accepting applies its work (./versioned.ts decide), or, for
// work that is no work of play's (code, its pull request named with check_intent's `pr`), Accept ships it (./ship.ts,
// Samuel 2026-11-06): play merges the pull request into main that moment and the intent is in Ship, where play follows
// it to production step by step; all green, it is Accepted; any red, it is back at Proposal with the report. Work
// proposed with no intent named is a new intent at Proposal of its own, with no spec.
//
// Every check runs in avenBOX (play/SPEC.md §4.12, Samuel 2026-11-06): the cloud environment the agents build in,
// with Postgres up and TEST_DATABASE_URL set (play/avenbox/up.sh). A test or measure check carries its `run`, the exact
// command that decides it there, from the repository's root, as written: no placeholder in it. In Build,
// `bun play/avenbox/intent.ts <intent> --record` runs every check of a spec and records the results, with the commit
// they ran on: a code intent is accepted only when every must check with a run last passed on its pull request's head.
// Once merged, main runs the same checks in the same box (.github/workflows/intents.yml, the commits' `Intent: <uuid>`
// trailers) and records them as main's: a confirmation, whatever the stage.
import { Denied, COOP, type Me } from "./access";
import type { Db, Queryable } from "./pg";
import { NOTE_MOST } from "./notes";
import { briefOf } from "./skills";
import { newId, UUID } from "./uuid";
import { intentIdOf } from "./work";
import { workKinds, workSql } from "./versioned";

export class IntentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const INTENT_KINDS = ["idea", "fix", "improve"] as const;
export type IntentKind = (typeof INTENT_KINDS)[number];
export const INTENT_STAGES = ["idea", "specify", "build", "proposal", "ship", "accepted", "archived"] as const;
export type IntentStage = (typeof INTENT_STAGES)[number];
/** the intents still to be taken further: not yet done (Ship: accepted, on its way to production) */
export const OPEN_STAGES: IntentStage[] = ["idea", "specify", "build", "proposal", "ship"];
export const CHECK_HOWS = ["test", "measure", "look"] as const;
/** a spec's two steps, reduce first (what it takes away), then the MVP (Samuel 2026-11-06; play/SPEC.md §4.12) */
export const STEPS = ["reduce", "mvp"] as const;
/** run: the command that decides it in avenBOX (required for test and measure since 2026-11-06; specs from before have
 *  none); step: reduce or mvp (specs from before have none: mvp) */
export type Check = { id: string; check: string; how: (typeof CHECK_HOWS)[number]; by: string; run?: string; must: boolean; step?: (typeof STEPS)[number] };
/** nothing_to_reduce: why nothing is to be reduced, where no check is its reduce step */
export type Spec = { goal: string; scope: string; checks: Check[]; nothing_to_reduce?: string };
/** whether a spec has its reduce step: a reduce check, or why nothing is to be reduced */
const reduces = (spec: Spec | null) => !!spec && (spec.checks.some((c) => c.step === "reduce") || !!spec.nothing_to_reduce);
/** where a check's result was run: in avenBOX by the agent, or on main by .github/workflows/intents.yml after the merge */
export const WHERES = ["avenBOX", "main"] as const;
export type Where = (typeof WHERES)[number];
export type Result = { pass: boolean; evidence: string; by: string | null; at: string; where?: Where; commit?: string };
export const TITLE_MOST = 200;
export const CHECKS_MOST = 12;
const LINE_MOST = 600;
const RUN_MOST = 2000;
export type IntentVerdict = "approve" | "accept" | "reject" | "respecify" | "reopen";
const NO_REDUCE = "Its reduce step comes first: at least one check with step reduce (what it removes, simplifies or compacts), or nothing_to_reduce saying why nothing is.";

/** only Maia City's admins keep the intents, as they decide them */
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
 * its results name, and its step. Its reduce step comes first: a reduce check (every one a must), or nothing_to_reduce.
 */
export function specOf(body: { goal?: unknown; scope?: unknown; checks?: unknown; nothing_to_reduce?: unknown }): Spec {
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
    const step = c?.step ?? "mvp";
    if (!STEPS.includes(step)) throw new IntentError(`Check c${i + 1}'s step is reduce (what it takes away) or mvp.`);
    if (step === "reduce" && c?.must === false) throw new IntentError(`Check c${i + 1} is a reduction: every reduction is a must.`);
    return { id: `c${i + 1}`, check, how: c.how, by, ...(run ? { run } : {}), must: c?.must !== false, step };
  });
  if (!checks.some((c) => c.must)) throw new IntentError("At least one of an intent's checks is a must: what must hold before it is accepted.");
  const none = textOf(body?.nothing_to_reduce, "nothing_to_reduce", LINE_MOST);
  const spec: Spec = { goal, scope, checks, ...(none ? { nothing_to_reduce: none } : {}) };
  if (!reduces(spec)) throw new IntentError(NO_REDUCE);
  return spec;
}

/**
 * The intents with who wrote, specified, approved and decided them, and each one's work (null where it has none): its
 * kind, what it is of (an asset's group, slug and label, a story's or sandbox's title, a document's label), the version
 * it would be, how many changes a sandbox's makes, its note, who proposed it, how and when, and its status (its
 * intent's stage: waiting at Proposal, accepted, else archived).
 */
async function intentsWhere(db: Queryable, where: string, args: unknown[]) {
  // a document's label and group, by its kind, from ./versioned.ts's registry
  const kind = workSql();
  const { rows } = await db.query<any>(
    `SELECT i.id, i.kind, i.title, i.note, i.stage, i.via, i.created, i.spec, i.results, i.specified_at, i.approved_at, i.decided_at, i.came_with,
            i.pull_request, i.ship, ${EDGES("d.intent_id = i.id", "d.depends_on")} AS depends_on, ${EDGES("d.depends_on = i.id", "d.intent_id")} AS needed_by,
            au.name AS author, sp.name AS specified_by, ap.name AS approved_by, de.name AS decided_by,
            CASE WHEN i.work IS NULL THEN NULL ELSE json_build_object(
              'kind', i.work, 'status', CASE i.stage WHEN 'proposal' THEN 'proposal' WHEN 'accepted' THEN 'accepted' ELSE 'archived' END,
              'asset_id', i.asset_id, 'base', i.base, 'version', i.version, 'story_id', i.story_id, 'story_base', i.story_base, 'story_version', i.story_version,
              'sandbox_id', i.sandbox_id, 'doc_id', i.doc_id, 'doc', split_part(i.doc_id, ':', 2), 'doc_variant', i.doc_variant,
              'changes', jsonb_array_length(COALESCE(i.sandbox_diff, '[]'::jsonb)),
              'note', COALESCE(i.work_note, ''), 'author', pb.name, 'via', i.proposed_via, 'created', i.proposed_at, 'decided_by', de.name, 'decided_at', i.decided_at,
              'label', COALESCE(wa.label, sv.title, sx.title, ${kind.label}),
              'grp', COALESCE(wa.grp, CASE WHEN i.sandbox_id IS NOT NULL THEN 'sandboxes' END, ${kind.group}),
              'what', CASE WHEN i.sandbox_id IS NOT NULL THEN 'sandbox' ELSE ${kind.what} END,
              'slug', wa.slug, 'version_label', wv.card->'card'->>'label',
              'number', CASE WHEN i.sandbox_id IS NOT NULL THEN NULL
                 WHEN i.asset_id IS NOT NULL THEN COALESCE(wb.number, 0) + 1
                 WHEN i.story_id IS NOT NULL THEN COALESCE(sb.number, 0) + 1
                 ELSE COALESCE(dbv.number, (SELECT max(dv.number) FROM play.doc_versions dv WHERE dv.doc_id = i.doc_id) + 1) END
            ) END AS work
       FROM play.intents i
       LEFT JOIN play.humans au ON au.id = i.author
       LEFT JOIN play.humans sp ON sp.id = i.specified_by
       LEFT JOIN play.humans ap ON ap.id = i.approved_by
       LEFT JOIN play.humans de ON de.id = i.decided_by
       LEFT JOIN play.humans pb ON pb.id = i.proposed_by
       LEFT JOIN play.assets wa ON wa.id = i.asset_id
       LEFT JOIN play.asset_versions wv ON wv.id = i.version
       LEFT JOIN play.asset_versions wb ON wb.id = i.base
       LEFT JOIN play.story_versions sv ON sv.id = i.story_version
       LEFT JOIN play.story_versions sb ON sb.id = i.story_base
       LEFT JOIN play.sandboxes sx ON sx.id = i.sandbox_id
       LEFT JOIN play.doc_variants dbr ON dbr.id = i.doc_variant
       LEFT JOIN play.doc_versions dbv ON dbv.doc_id = dbr.doc_id AND dbv.number = dbr.version
      WHERE i.coop_id = $1 AND ${where}
      ORDER BY COALESCE(i.decided_at, i.proposed_at, i.created) DESC LIMIT 500`,
    [COOP, ...args],
  );
  return rows.map((r) => ({ ...r, held_by: r.depends_on.filter((d: Dep) => !shipped(d)) }));
}

// ---- dependencies (play/SPEC.md §4.12, Samuel 2026-11-06): an intent may depend on others, each by its UUID; while
// any of them is not shipped (Accepted: in Ship is not yet) it is held at every forward gate (mayMove). Read live, never stored.

/** a dependency as people read it: its UUID, title and stage */
export type Dep = { id: string; title: string; stage: IntentStage };
const shipped = (d: { stage: string }) => d.stage === "accepted";
/** the SQL of an intent's edges one way, as a JSON list of Dep (`d` the edge, `other` the intent at its far end) */
const EDGES = (where: string, other: string) =>
  `COALESCE((SELECT json_agg(json_build_object('id', o.id, 'title', o.title, 'stage', o.stage) ORDER BY d.at, o.id)
     FROM play.intent_depends d JOIN play.intents o ON o.id = ${other} WHERE ${where}), '[]'::json)`;

/** The intents `id` depends on that are not shipped, as people read them: what holds it (direct ones: each is held by its own). */
export async function heldBy(db: Queryable, id: string): Promise<Dep[]> {
  const { rows } = await db.query<Dep>(
    `SELECT o.id, o.title, o.stage FROM play.intent_depends d JOIN play.intents o ON o.id = d.depends_on WHERE d.intent_id = $1 ORDER BY d.at, o.id`,
    [id],
  );
  return rows.filter((d) => !shipped(d));
}
const named = (ds: Dep[]) => ds.map((d) => `${d.id} (${d.title}, at ${d.stage})`).join("; ");

/**
 * Edges added (or dropped) from intent `id` to each of `on`, in the caller's transaction: no edge to itself, and none
 * that closes a cycle (the chain from the one depended on walked back to `id`), so chains and diamonds of any depth hold.
 */
async function addEdges(q: Queryable, who: Me, id: string, on: unknown, drop = false) {
  const list = Array.isArray(on) ? on : [on];
  await q.query(`SELECT pg_advisory_xact_lock(4711031)`); // one edge at a time: two edges added at once could close a cycle
  for (const raw of list) {
    const o = idOf(raw);
    if (drop) {
      await q.query(`DELETE FROM play.intent_depends WHERE intent_id = $1 AND depends_on = $2`, [id, o]);
      continue;
    }
    if (o === id) throw new IntentError(`Intent ${id} cannot depend on itself.`);
    if (!(await intentIdOf(q, o))) throw new IntentError(`There is no intent ${o} to depend on.`, 404);
    const { rows } = await q.query(
      `WITH RECURSIVE up(x) AS (SELECT $2::uuid UNION SELECT d.depends_on FROM play.intent_depends d JOIN up ON d.intent_id = up.x) SELECT 1 FROM up WHERE x = $1::uuid`,
      [id, o],
    );
    if (rows.length) throw new IntentError(`Intent ${id} cannot depend on ${o}: ${o} depends on ${id} already (through its chain), and nothing waits on itself.`, 409);
    await q.query(`INSERT INTO play.intent_depends (intent_id, depends_on, by, at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING`, [id, o, who.id]);
  }
}

/** One edge added, or dropped (`drop`), over MCP by an admin's agent: intent `id` depends on intent `on`. */
export async function dependIntent(db: Db, me: Me | null, id: string, on: unknown, drop?: unknown) {
  const who = admin(me);
  const intent = await intentRow(db, id);
  await db.transaction((tx) => addEdges(tx, who, intent.id, idOf(on), drop === true));
  return intentRow(db, intent.id);
}

/** depends_on as given to add_intent and specify_intent: a list of UUIDs, or undefined (left as it is) */
const depsOf = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) throw new IntentError("depends_on is a list of intents' ids (UUIDs).");
  return v.map(idOf);
};

/** The intents at the given stages (every stage where none is given), the latest first; with `work`, only those holding work of that kind. */
export async function listIntents(db: Queryable, me: Me | null, stages?: string[], work?: string) {
  admin(me);
  for (const s of stages ?? []) if (!INTENT_STAGES.includes(s as IntentStage)) throw new IntentError(`An intent's stage is ${INTENT_STAGES.join(", ")}.`);
  if (work !== undefined && !workKinds().includes(work)) throw new IntentError(`An intent's work is ${workKinds().join(", ")}.`);
  return intentsWhere(db, `($2::text[] IS NULL OR i.stage = ANY($2::text[])) AND ($3::text IS NULL OR i.work = $3)`, [stages ?? null, work ?? null]);
}

async function intentRow(db: Queryable, id: string) {
  const [intent] = await intentsWhere(db, `i.id = $2`, [idOf(id)]);
  if (!intent) throw new IntentError("There is no such intent.", 404);
  return intent;
}

/** One intent as the board lists it (admins), by its id. */
export async function getIntent(db: Queryable, id: string) {
  return intentRow(db, (await intentIdOf(db, idOf(id))) ?? id);
}

/**
 * One intent, whole: as the board lists it, its work's review where it holds work (`review`: what it changes, as
 * people read it before they decide, ./versioned.ts reviewOf), and its `brief`: what an agent sent to it does at its
 * stage, the Intents skill's part for it (./skills.ts; null where it says nothing).
 */
export async function intentOf(db: Queryable, me: Me | null, id: string, reviewOf: (db: Queryable, id: string, shown: any) => Promise<unknown>) {
  admin(me);
  const intent = await getIntent(db, id);
  return { ...intent, brief: await briefOf(db, intent), review: intent.work ? await reviewOf(db, intent.id, intent.work) : null };
}

/** A new intent at the Idea stage, by an admin's agent over MCP (no one adds one by hand). */
export async function addIntent(db: Db, me: Me | null, body: { kind?: unknown; title?: unknown; note?: unknown; depends_on?: unknown }) {
  const who = admin(me);
  const id = newId();
  const deps = depsOf(body?.depends_on);
  await db.transaction(async (tx) => {
    await tx.query(`INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via) VALUES ($1, $2, $3, $4, $5, 'idea', $6, 'mcp')`, [
      id, COOP, kindOf(body?.kind), titleOf(body?.title), textOf(body?.note, "note", NOTE_MOST), who.id,
    ]);
    if (deps?.length) await addEdges(tx, who, id, deps);
  });
  return intentRow(db, id);
}

/**
 * An intent specified over MCP: its spec (specOf) and, where given, its title, kind or note made sharper. It moves to
 * Specify, where an admin approves it before it is built; specified again, its spec is replaced. One already approved
 * is sent back to Specify by an admin first.
 */
export async function specifyIntent(db: Db, me: Me | null, id: string, body: { goal?: unknown; scope?: unknown; checks?: unknown; nothing_to_reduce?: unknown; title?: unknown; kind?: unknown; note?: unknown; depends_on?: unknown }) {
  const who = admin(me);
  const intent = await intentRow(db, id);
  if (intent.stage !== "idea" && intent.stage !== "specify")
    throw new IntentError(`Intent ${intent.id} is at the ${intent.stage} stage: ${intent.stage === "build" ? "its spec is approved; an admin sends it back to Specify before it changes" : "it is specified no more"}.`, 409);
  const spec = specOf(body);
  const deps = depsOf(body?.depends_on);
  await db.transaction(async (tx) => {
    // depends_on given: the intents it depends on, replacing those before (specifying is never held)
    if (deps) {
      await tx.query(`DELETE FROM play.intent_depends WHERE intent_id = $1 AND NOT (depends_on = ANY($2::uuid[]))`, [intent.id, deps]);
      await addEdges(tx, who, intent.id, deps);
    }
    await tx.query(
      `UPDATE play.intents SET stage = 'specify', spec = ($2::text)::jsonb, results = NULL, specified_by = $3, specified_at = now(), kind = $4, title = $5, note = $6 WHERE id = $1`,
      [
        intent.id, JSON.stringify(spec), who.id,
        body?.kind === undefined ? intent.kind : kindOf(body.kind),
        body?.title === undefined ? intent.title : titleOf(body.title),
        body?.note === undefined ? intent.note : textOf(body.note, "note", NOTE_MOST),
      ],
    );
  });
  return intentRow(db, intent.id);
}

/** whether the intent's work waits for a decision at Proposal: then accepting applies it (./versioned.ts decide) */
const waiting = (intent: { stage: string; work: unknown }) => intent.stage === "proposal" && !!intent.work;

/** an intent's pull request into main, by its number (check_intent's `pr`), or undefined where none is given */
const prOf = (v: unknown) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new IntentError("pr is the number of the intent's pull request into main (#2096 is 2096).");
  return n;
};

/**
 * Checks' results recorded while an intent is being built (over MCP): each names its check, passes or fails, and says
 * its evidence (the command and what it printed, the value measured, what was compared with what), where it ran and the
 * commit. The latest result of a check stands; the gate to Proposal reads them. Once every must check has passed, the
 * intent moves to Proposal by itself, where an admin decides it (Samuel 2026-11-06); checked again there (its work not
 * waiting there), a must that fails takes it back to Build. Results run on main (after the merge,
 * .github/workflows/intents.yml) are a confirmation in any stage once its spec is approved: in Ship, Accepted or
 * Archived they are kept and move nothing. `pr` names the intent's pull request into main (its code), which Accept
 * merges (./ship.ts): named while it is being built or at Proposal, a newer one replacing it.
 */
export async function recordChecks(db: Queryable, me: Me | null, id: string, given: unknown, pr?: unknown) {
  const who = admin(me);
  const intent = await intentRow(db, id);
  const named = prOf(pr);
  const list = given === undefined || given === null ? [] : given;
  if (!Array.isArray(list) || (!list.length && named === undefined)) throw new IntentError("Give each check's result: { check: 'c1', pass: true | false, evidence }.");
  const moves = intent.stage === "build" || (intent.stage === "proposal" && intent.approved_at && !waiting(intent));
  const confirms = list.length > 0 && named === undefined && !!intent.approved_at && list.every((r: any) => r?.where === "main");
  if (!moves && !confirms)
    throw new IntentError(
      `Intent ${intent.id} is at the ${intent.stage} stage: checks are recorded while it is being built (its spec approved)${intent.stage === "proposal" ? ", or at Proposal while no work of it waits there" : ""}; main's results (where main) in any stage once its spec is approved.`,
      409,
    );
  if (named !== undefined && intent.work) throw new IntentError(`Intent ${intent.id} holds work of play's: it is accepted in play, with no pull request.`, 409);
  const ids = new Set((intent.spec?.checks ?? []).map((c: Check) => c.id));
  const results: Record<string, Result> = { ...(intent.results ?? {}) };
  const at = new Date().toISOString();
  for (const r of list as any[]) {
    if (!ids.has(r?.check)) throw new IntentError(`${r?.check} is not one of this intent's checks (${[...ids].join(", ")}).`);
    if (typeof r?.pass !== "boolean") throw new IntentError(`${r.check}: pass is true or false.`);
    const evidence = textOf(r?.evidence, `${r.check}'s evidence (the command and what it printed, the value measured, what was compared)`, 4000, true);
    const where = r?.where === undefined || r?.where === null || r?.where === "" ? "avenBOX" : r.where;
    if (!WHERES.includes(where)) throw new IntentError(`${r.check}: where is ${WHERES.join(" or ")} (where the check was run).`);
    const commit = r?.commit === undefined || r?.commit === null || r?.commit === "" ? undefined : `${r.commit}`;
    if (commit !== undefined && !/^[0-9a-f]{40}$/.test(commit)) throw new IntentError(`${r.check}: commit is the 40-character git hash it ran on.`);
    results[r.check] = { pass: r.pass, evidence, by: who.name, at, where, ...(commit ? { commit } : {}) };
  }
  // every must check passed: to Proposal, the one gate left; a must failing again: back to Build; main's results
  // after the merge (in Ship, Accepted, Archived) only kept
  // held (a dependency not shipped), it stays in Build, its results kept, and says why
  const refused = moves ? await gate.mayMove(db, { ...intent, results, pull_request: named ?? intent.pull_request }, "proposal") : null;
  const stage = !moves ? intent.stage : refused ? "build" : "proposal";
  await db.query(`UPDATE play.intents SET results = ($2::text)::jsonb, stage = $3, pull_request = COALESCE($4, pull_request) WHERE id = $1`, [
    intent.id, JSON.stringify(results), stage, named ?? null,
  ]);
  return { ...(await intentRow(db, intent.id)), ...(refused ? { refused: refused.why } : {}) };
}

/** the must checks of an intent that have not passed, as people read them, or none: the gate to Proposal and to accepting */
export function unmet(intent: { spec: Spec | null; results: Record<string, Result> | null }) {
  return (intent.spec?.checks ?? [])
    .filter((c) => c.must && intent.results?.[c.id]?.pass !== true)
    .map((c) => `${c.id} (${c.check}): ${intent.results?.[c.id] ? "failed" : "no result yet"}`);
}

/**
 * The gate a code intent's Accept adds (./ship.ts): every must check with a `run` last passed on `head`, its pull
 * request's head commit, so what is merged is what was checked; as people read them, or none.
 */
export function unmetOn(intent: { spec: Spec | null; results: Record<string, Result> | null }, head: string) {
  return (intent.spec?.checks ?? [])
    .filter((c) => c.must && c.run)
    .flatMap((c) => {
      const r = intent.results?.[c.id];
      if (r?.pass === true && r.commit === head) return [];
      return [`${c.id} (${c.check}): ${!r ? "no result yet" : !r.pass ? "failed" : r.commit ? `passed on ${r.commit.slice(0, 7)}, not on the head ${head.slice(0, 7)}` : "passed on no named commit"}`];
    });
}

/**
 * Every forward move of an intent: approve (Specify → Build), Build → Proposal on its checks, work proposed
 * for it, accepted at Proposal (no work, no pull request), its work accepted, Accept into Ship, and Ship's turn to merge.
 * Going back (respecify, reject, reopen, archive) is never one.
 */
export type Move = "build" | "proposal" | "work" | "accept" | "accept_work" | "ship" | "merge";
/** why a move is refused; `wait` where all that refuses it is a dependency still in Ship (Ship's turn waits for it) */
export type Refusal = { why: string; wait?: boolean };
type GateRow = { id: string; stage: string; spec: Spec | null; results: Record<string, Result> | null; work?: unknown; pull_request?: number | null; approved_at?: unknown };

/**
 * The one forward gate (play/SPEC.md §4.12): whether intent `intent` (its id, or its row as it would be) may make move
 * `to`; null where it may, else why not. The stage rules of each move, every must check passed where the move needs
 * it, and one rule more: held while any intent it depends on is not shipped (heldBy). Every forward path calls it, by
 * `gate.mayMove`, and none tests the stage on its own.
 */
async function mayMove(db: Queryable, intent: string | GateRow, to: Move): Promise<Refusal | null> {
  const i: GateRow = typeof intent === "string" ? await intentRow(db, intent) : intent;
  const at = i.stage;
  const no = (why: string): Refusal => ({ why });
  const stage = (): Refusal | null => {
    switch (to) {
      case "build":
        if (at !== "specify") return no(`Only a specified intent's spec is approved; this one is at the ${at} stage.`);
        return reduces(i.spec) ? null : no(`${NO_REDUCE} It is specified again first.`);
      case "proposal":
        return at === "build" || (at === "proposal" && i.approved_at) ? null : no(`Intent ${i.id} is at the ${at} stage: it moves to Proposal from Build.`);
      case "work":
        if (at === "idea" || at === "specify") return no(`Intent ${i.id} is at the ${at} stage: it is specified (specify_intent) and its spec approved by an admin before it is built and proposed.`);
        return at === "build" || at === "proposal" ? null : no(`Intent ${i.id} is ${at}: it takes no more work.`);
      case "accept":
        if (at === "build") return no("An intent in Build is not accepted: it moves to Proposal by itself once every must check passes, and is decided there.");
        if (at !== "proposal") return no(`An intent at the ${at} stage is decided already, or not yet built.`);
        if (i.work) return no("Its work waits for a decision: accepting applies it (./versioned.ts decide).");
        return i.pull_request ? no(`Its code is pull request #${i.pull_request}: Accept ships it (./ship.ts), merging it into main.`) : null;
      case "accept_work":
        return at === "proposal" ? null : no(`This intent is at the ${at} stage: only one at Proposal is decided.`);
      case "ship":
        if (at === "build") return no("An intent in Build is not accepted: it moves to Proposal by itself once every must check passes, and is decided there.");
        return at === "proposal" ? null : no(`Intent ${i.id} is at the ${at} stage now.`);
      case "merge":
        return at === "ship" ? null : no(`Intent ${i.id} is at the ${at} stage, not in Ship.`);
    }
  };
  const bad = stage();
  if (bad) return bad;
  if (to !== "accept_work" && to !== "merge" && to !== "build") {
    const missing = unmet(i);
    if (missing.length)
      return no(
        to === "work"
          ? `Intent ${i.id} is not ready to propose: every must check passes first (record them with check_intent). ${missing.join("; ")}.`
          : `Every must check passes before an intent is ${to === "proposal" ? "at Proposal" : "accepted"}: ${missing.join("; ")}.`,
      );
  }
  const held = await heldBy(db, i.id);
  if (!held.length) return null;
  // Accept into Ship: a dependency ahead of it in Ship is waited for there; one not in Ship at all refuses
  const out = to === "ship" ? held.filter((d) => d.stage !== "ship") : held;
  if (!out.length) return null;
  if (to === "merge" && out.every((d) => d.stage === "ship")) return { why: `Waits for ${named(out)} to ship first`, wait: true };
  return no(`Intent ${i.id} is held: it depends on intents not shipped yet: ${named(out)}.`);
}
/** the gate as every path calls it (a test may stand a stub in its place) */
export const gate = { mayMove };
/** the move made, or its refusal thrown */
export async function mustMove(db: Queryable, intent: string | GateRow, to: Move) {
  const r = await gate.mayMove(db, intent, to);
  if (r) throw new IntentError(r.why, 409);
}

/** The intent work is about to be proposed for, held to the gate (mayMove's work). Otherwise nothing is proposed and the agent is told why. */
export async function intentReady(db: Queryable, me: Me | null, id: unknown) {
  admin(me);
  const intent = await intentRow(db, `${id ?? ""}`);
  await mustMove(db, intent, "work");
  return intent;
}

/**
 * An admin's decision on the board: approve a spec (Specify → Build: the agent may build it), send an approved one
 * back to Specify, accept an intent at Proposal that holds no work of play's and names no pull request (every must check
 * passed: it moved there by itself; one that names its pull request is shipped instead, ./ship.ts), reject one (it ends
 * archived), or bring a decided one back (to Specify with its spec, else to Idea). Nothing is accepted from Build:
 * Proposal is the one gate after the spec; nothing is decided in Ship, where play follows it to production.
 */
export async function decideIntent(db: Queryable, me: Me | null, id: string, verdict: IntentVerdict) {
  const who = admin(me);
  const intent = await intentRow(db, id);
  const refuse = (why: string) => {
    throw new IntentError(why, 409);
  };
  switch (verdict) {
    case "approve":
      await mustMove(db, intent, "build");
      await db.query(`UPDATE play.intents SET stage = 'build', approved_by = $2, approved_at = now(), results = NULL WHERE id = $1`, [intent.id, who.id]);
      break;
    case "respecify":
      if (intent.stage === "proposal" && waiting(intent)) refuse("Its work waits for a decision at Proposal: decide it first.");
      if (intent.stage !== "build" && !(intent.stage === "proposal" && intent.approved_at))
        refuse(`Only an intent being built or at Proposal goes back to Specify; this one is at the ${intent.stage} stage.`);
      await db.query(`UPDATE play.intents SET stage = 'specify', approved_by = NULL, approved_at = NULL, results = NULL WHERE id = $1`, [intent.id]);
      break;
    case "accept":
      await mustMove(db, intent, "accept");
      await db.query(`UPDATE play.intents SET stage = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [intent.id, who.id]);
      break;
    case "reject":
      if (intent.stage === "proposal" && waiting(intent)) refuse("Its work waits for a decision: archiving it archives the intent.");
      if (!["idea", "specify", "build", "proposal"].includes(intent.stage)) refuse(`An intent at the ${intent.stage} stage is decided already.`);
      await db.query(`UPDATE play.intents SET stage = 'archived', decided_by = $2, decided_at = now() WHERE id = $1`, [intent.id, who.id]);
      break;
    case "reopen":
      if (intent.stage !== "accepted" && intent.stage !== "archived") refuse(`This intent is at the ${intent.stage} stage already.`);
      // accepted work is in: what comes after it is an intent of its own
      if (intent.stage === "accepted" && intent.work) refuse("Its work is in (accepted): what is wanted now is an intent of its own.");
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
