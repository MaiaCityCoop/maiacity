// Intents (play/SPEC.md §4.12, which says it all; Samuel 2026-11-06): everything on the board is an intent, named by its
// UUID, its work on the intent itself (./work.ts). Idea → Specify → Build → Proposal → (Ship →) Accepted (or Archived).
// Agents add, specify and build it over MCP; an admin approves its spec and decides it at Proposal, where work of play's
// is applied (./versioned.ts decide) and code is shipped (./ship.ts). Every move forward is one gate, mayMove.
import { intentSeen, seesIntent } from "./owners";
import { admin, COOP, meOf, type Me } from "./access";
import type { BlobStore } from "./blobs";
import type { Db, Queryable } from "./kit/pg";
import { factsOf, matchRule, ruleSetOf, type AutoBy } from "./rules";
import type { GitHub } from "./ship";
import { NOTE_MOST } from "./notes";
import { briefOf } from "./skills";
import { newId, UUID } from "./kit/uuid";
import { closeWork, intentIdOf, WORK_STATUS } from "./work";
import { decideAny, workKinds, workSql } from "./versioned";
import { decidable, sub, unmetOn } from "./substate";
import { HttpError } from "./kit/errors";

export { unmetOn };

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
/** box: recorded by avenBOX's token (the GitHub run of the intent's checks: play/avenbox/intent.ts); link: that run */
export type Result = { pass: boolean; evidence: string; by: string | null; at: string; where?: Where; commit?: string; box?: true; link?: string };
/** what play says to a token that is not avenBOX's when it records what only the box's run may (play/SPEC.md §4.12) */
export const BOX_ONLY =
  "the pull request's run records them: a code intent's test and measure checks are recorded only by its run in avenBOX on GitHub (.github/workflows/intents-pr.yml, as the pull request is marked ready, and again on each push to it), with avenBOX's token";
export const TITLE_MOST = 200;
export const CHECKS_MOST = 12;
export const LINE_MOST = 600;
const RUN_MOST = 2000;
export type IntentVerdict = "approve" | "accept" | "reject" | "reopen";
const NO_REDUCE = "Its reduce step comes first: at least one check with step reduce (what it removes, simplifies or compacts), or nothing_to_reduce saying why nothing is.";

/** only Maia City's admins keep the intents, as they decide them */
export const INTENT_ADMINS = "Only Maia City's admins keep the intents.";

const kindOf = (v: unknown): IntentKind => {
  if (v === undefined || v === null || v === "") return "idea";
  if (!INTENT_KINDS.includes(v as IntentKind)) throw new HttpError(`An intent's kind is ${INTENT_KINDS.join(", ")}.`);
  return v as IntentKind;
};
const titleOf = (v: unknown) => {
  const t = `${v ?? ""}`.replace(/\s+/g, " ").trim();
  if (!t) throw new HttpError("An intent needs a title: what is to be made, fixed or improved, in a line.");
  if (t.length > TITLE_MOST) throw new HttpError(`An intent's title is at most ${TITLE_MOST} characters: say the rest in its note.`);
  return t;
};
const textOf = (v: unknown, what: string, most: number, need = false) => {
  const n = `${v ?? ""}`.trim();
  if (need && !n) throw new HttpError(`An intent's spec needs its ${what}.`);
  if (n.length > most) throw new HttpError(`An intent's ${what} is at most ${most} characters.`);
  return n;
};
const idOf = (v: unknown) => {
  const id = `${v ?? ""}`;
  if (!UUID.test(id)) throw new HttpError("An intent is named by its id, a UUID (list_intents gives it).", 404);
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
    throw new HttpError(`An intent's spec has 1 to ${CHECKS_MOST} checks: each one statement that passes or fails, and how it is checked.`);
  const checks: Check[] = given.map((c: any, i) => {
    const check = textOf(c?.check, `check ${i + 1}'s statement`, LINE_MOST, true);
    if (!CHECK_HOWS.includes(c?.how)) throw new HttpError(`Check ${i + 1} is checked by test (a command that passes), measure (a value and its range) or look (by eye against a named reference).`);
    const by = textOf(c?.by, `check ${i + 1}'s how (${c.how === "test" ? "the command or test that passes" : c.how === "measure" ? "the tool that measures it and the range it must fall in" : "the reference it is judged against"})`, LINE_MOST, true);
    const run = textOf(c?.run, `check ${i + 1}'s run`, RUN_MOST);
    if (!run && c.how !== "look")
      throw new HttpError(`Check c${i + 1} (a ${c.how}) needs its run: the command that decides it in avenBOX, from the repository's root, as written (${c.how === "test" ? "it passes when it exits 0" : "it prints the value it measures and exits 0 only when that is in its range"}).`);
    const hole = run && placeholderIn(run);
    if (hole) throw new HttpError(`Check c${i + 1}'s run holds a placeholder (${hole}): a run is a command that runs as written in avenBOX, nothing in it left to fill in.`);
    const step = c?.step ?? "mvp";
    if (!STEPS.includes(step)) throw new HttpError(`Check c${i + 1}'s step is reduce (what it takes away) or mvp.`);
    if (step === "reduce" && c?.must === false) throw new HttpError(`Check c${i + 1} is a reduction: every reduction is a must.`);
    return { id: `c${i + 1}`, check, how: c.how, by, ...(run ? { run } : {}), must: c?.must !== false, step };
  });
  if (!checks.some((c) => c.must)) throw new HttpError("At least one of an intent's checks is a must: what must hold before it is accepted.");
  const none = textOf(body?.nothing_to_reduce, "nothing_to_reduce", LINE_MOST);
  const spec: Spec = { goal, scope, checks, ...(none ? { nothing_to_reduce: none } : {}) };
  if (!reduces(spec)) throw new HttpError(NO_REDUCE);
  return spec;
}

/** each row's place in the board's order (CURSOR), by the row intentsWhere returned */
const cursors = new WeakMap<object, string>();

/** The intents as the board lists them: who wrote, specified, approved and decided each, its dependencies both ways, and its work (null where none). */
async function intentsWhere(db: Queryable, where: string, args: unknown[], limit?: number) {
  // a document's label and group, by its kind, from ./versioned.ts's registry
  const kind = workSql();
  // its steps back (./stepback.ts) by to_jsonb: a database migrated short of 0036 (a migration's test) reads too
  // the cards picked first, ordered and cut to the page, then built: each row's joins and subqueries only for those
  const { rows } = await db.query<any>(
    `WITH pick AS (SELECT i.id, ${WHEN} AS at FROM play.intents i WHERE i.coop_id = $1 AND ${where} ORDER BY at DESC, i.id DESC${limit ? ` LIMIT ${limit}` : ""})
     SELECT i.id, i.kind, i.title, i.note, i.stage, i.via, i.created, i.spec, i.results, i.specified_at, i.approved_at, i.decided_at, i.came_with,
            i.pull_request, i.ship, COALESCE(to_jsonb(i)->'steps', '[]') AS steps, to_jsonb(i)->'pr_seen' AS pr_seen,
            to_jsonb(i)->'work_kind' AS work_kind, COALESCE(to_jsonb(i)->'auto', '{}'::jsonb) AS auto,
            ${EDGES("d.intent_id = i.id", "d.depends_on")} AS depends_on, ${EDGES("d.depends_on = i.id", "d.intent_id")} AS needed_by,
            au.name AS author, sp.name AS specified_by, ap.name AS approved_by, de.name AS decided_by,
            CASE WHEN i.work IS NULL THEN NULL ELSE json_build_object(
              'kind', i.work, 'status', ${WORK_STATUS},
              'asset_id', i.asset_id, 'base', i.base, 'version', i.version, 'story_id', i.story_id, 'story_base', i.story_base, 'story_version', i.story_version,
              'doc_id', iv0.doc_id, 'doc', split_part(iv0.doc_id, ':', 2), 'doc_variant', iv0.variant_id, 'docs', (SELECT count(*) FROM play.intent_variants x WHERE x.intent_id = i.id),
              'note', COALESCE(i.work_note, ''), 'author', pb.name, 'via', i.proposed_via, 'created', i.proposed_at, 'decided_by', de.name, 'decided_at', i.decided_at,
              'label', COALESCE(wa.label, sv.title, ${kind.label}),
              'grp', COALESCE(wa.grp, ${kind.group}),
              'what', ${kind.what},
              'slug', wa.slug, 'version_label', wv.card->'card'->>'label',
              'number', CASE WHEN i.asset_id IS NOT NULL THEN COALESCE(wb.number, 0) + 1
                 WHEN i.story_id IS NOT NULL THEN COALESCE(sb.number, 0) + 1
                 ELSE COALESCE(dbv.number, (SELECT max(dv.number) FROM play.doc_versions dv WHERE dv.doc_id = iv0.doc_id) + 1) END
            ) END AS work,
            ${CURSOR} AS cursor
       FROM pick JOIN play.intents i ON i.id = pick.id
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
       LEFT JOIN LATERAL (SELECT x.doc_id, x.variant_id FROM play.intent_variants x WHERE x.intent_id = i.id ORDER BY x.position LIMIT 1) iv0 ON true
       LEFT JOIN play.doc_variants dbr ON dbr.id = iv0.variant_id
       LEFT JOIN play.doc_versions dbv ON dbv.doc_id = dbr.doc_id AND dbv.number = dbr.version
      ORDER BY pick.at DESC, i.id DESC`,
    [COOP, ...args],
  );
  // its sub-state (./substate.ts), from what play keeps: the board asks GitHub nothing
  return rows.map(({ cursor, ...r }) => {
    const row = { ...r, held_by: r.depends_on.filter((d: Dep) => d.stage !== "accepted") };
    const out = { ...row, sub: sub.of(row) };
    // its place in the order, a page's cursor (pageIntents), kept beside the row, not in it
    cursors.set(out, cursor);
    return out;
  });
}

// ---- dependencies: held at every forward gate (mayMove) while any intent it depends on is not shipped (Accepted)

/** a dependency as people read it */
export type Dep = { id: string; title: string; stage: IntentStage };
/** an intent's edges one way, as a JSON list of Dep (`d` the edge, `o` the intent at its far end) */
const EDGES = (where: string, o: string) =>
  `COALESCE((SELECT json_agg(json_build_object('id', o.id, 'title', o.title, 'stage', o.stage) ORDER BY d.at, o.id)
     FROM play.intent_depends d JOIN play.intents o ON o.id = ${o} WHERE ${where}), '[]'::json)`;

/** The intents `id` depends on directly that are not shipped, read live: what holds it. */
export const heldBy = async (db: Queryable, id: string): Promise<Dep[]> => (await intentRow(db, id)).held_by;
const named = (ds: Dep[]) => ds.map((d) => `${d.id} (${d.title}, at ${d.stage})`).join("; ");
/** the refusal of a held intent's forward move */
const heldText = (id: string, held: Dep[]) => `Intent ${id} is held: it depends on intents not shipped yet: ${named(held)}.`;

/** Edges from `id` to each of `on` added (or dropped), in the caller's transaction: none to itself, none closing a cycle. */
async function addEdges(q: Queryable, who: Me, id: string, on: string[], drop = false) {
  await q.query(`SELECT pg_advisory_xact_lock(4711031)`); // one at a time: two edges added at once could close a cycle
  for (const o of on) {
    if (drop) await q.query(`DELETE FROM play.intent_depends WHERE intent_id = $1 AND depends_on = $2`, [id, o]);
    else if (o === id) throw new HttpError(`Intent ${id} cannot depend on itself.`);
    else if (!(await intentIdOf(q, o))) throw new HttpError(`There is no intent ${o} to depend on.`, 404);
    else if ((await q.query(`WITH RECURSIVE up(x) AS (SELECT $2::uuid UNION SELECT d.depends_on FROM play.intent_depends d JOIN up ON d.intent_id = up.x) SELECT 1 FROM up WHERE x = $1::uuid`, [id, o])).rows.length)
      throw new HttpError(`Intent ${id} cannot depend on ${o}: ${o} depends on ${id} already, and nothing waits on itself.`, 409);
    else await q.query(`INSERT INTO play.intent_depends (intent_id, depends_on, by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [id, o, who.id]);
  }
}

/** One edge added, or dropped, by an admin's agent over MCP: intent `id` depends on intent `on`. */
export async function dependIntent(db: Db, me: Me | null, id: string, on: unknown, drop?: unknown) {
  const who = admin(me, INTENT_ADMINS);
  const { id: i } = await intentRow(db, id);
  await db.transaction((tx) => addEdges(tx, who, i, [idOf(on)], drop === true));
  return intentRow(db, i);
}

/** the kind of work that is code, beside the schemas' UUIDs, in an intent's work_kind */
export const CODE = "code";
/**
 * work_kind as given (add_intent, specify_intent): the kinds of work the intent will bring, each a schema's UUID (an
 * artifact, an asset, a story …: ./kit/ids.ts SCHEMA, or one accepted since) or `code`; undefined where not given (left as
 * it is), null for an empty list (it declares nothing: any kind, as before).
 */
async function workKindOf(q: Queryable, v: unknown): Promise<string[] | null | undefined> {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (!Array.isArray(v)) throw new HttpError("work_kind is a list: the kinds of work the intent will bring, each a schema's UUID (list_docs gives them) or code.");
  const out: string[] = [];
  for (const k of v) {
    const s = `${k ?? ""}`.toLowerCase();
    if (s !== CODE && !UUID.test(s)) throw new HttpError(`work_kind ${k}: each kind of work is a schema's UUID or code.`);
    if (s !== CODE && !(await q.query(`SELECT 1 FROM play.docs WHERE id = $1 AND EXISTS (SELECT 1 FROM play.doc_versions v WHERE v.doc_id = play.docs.id)`, [`schema:${s}`])).rows.length)
      throw new HttpError(`work_kind ${s}: play keeps no accepted schema of that UUID (list_docs kind schema).`, 404);
    if (!out.includes(s)) out.push(s);
  }
  return out.length ? out : null;
}
/** the kinds of work an intent declares, as people read them */
export const declaredText = (kinds: string[]) => kinds.join(", ");

/** depends_on as given: UUIDs, or undefined (left as it is) */
const depsOf = (v: unknown) => {
  if (v == null) return undefined;
  if (!Array.isArray(v)) throw new HttpError("depends_on is a list of intents' ids (UUIDs).");
  return v.map(idOf);
};

/** The intents at the given stages (every stage where none is given), the latest first; with `work`, only those holding work of that kind. */
export async function listIntents(db: Queryable, me: Me | null, stages?: string[], work?: string) {
  return (await pageIntents(db, me, stages, work)).intents;
}

/** the order of the board's cards, the latest first (those decided by when they were), ties by id */
const WHEN = `COALESCE(i.decided_at, i.proposed_at, i.created)`;
/** an intent's place in that order, a page's cursor: its time in microseconds since the epoch and its id */
const CURSOR = `floor(extract(epoch FROM ${WHEN}) * 1000000)::bigint::text || '_' || i.id`;
/** the most intents a page holds */
export const PAGE_MOST = 200;
/** A page asked for: how many (1–200) and after which card (a cursor, `next` of the page before). */
export type IntentPage = { limit?: unknown; before?: unknown };
const pageOf = (p: IntentPage | undefined) => {
  let limit: number | undefined;
  if (p?.limit !== undefined && p.limit !== null && p.limit !== "") {
    limit = Number(p.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_MOST) throw new HttpError(`A page of intents holds 1 to ${PAGE_MOST} (limit).`);
  }
  let before: [string, string] | null = null;
  if (p?.before !== undefined && p.before !== null && p.before !== "") {
    const m = /^(\d{1,19})_([0-9a-f-]{36})$/i.exec(`${p.before}`);
    if (!m || !UUID.test(m[2])) throw new HttpError("before is a page's cursor: the `next` of the page before.");
    before = [m[1], m[2].toLowerCase()];
  }
  return { limit, before };
};

/**
 * The intents at the given stages (every stage where none is given), the latest first; with `work`, only those
 * holding work of that kind. Whole where no limit is asked (no cap cuts across the board: intent 2cb70fb8); a page of
 * `limit` where one is, after the cursor `before`, with `next`, the cursor of the page after (null at the end).
 */
export async function pageIntents(db: Queryable, me: Me | null, stages?: string[], work?: string, page?: IntentPage) {
  admin(me, INTENT_ADMINS);
  for (const s of stages ?? []) if (!INTENT_STAGES.includes(s as IntentStage)) throw new HttpError(`An intent's stage is ${INTENT_STAGES.join(", ")}.`);
  if (work !== undefined && !workKinds().includes(work)) throw new HttpError(`An intent's work is ${workKinds().join(", ")}.`);
  const { limit, before } = pageOf(page);
  // (an intent whose work is another's private asset is left out: ./owners.ts)
  const rows = await intentsWhere(
    db,
    `($2::text[] IS NULL OR i.stage = ANY($2::text[])) AND ($3::text IS NULL OR i.work = $3) AND ${intentSeen("i", "$4")}
       AND ($5::bigint IS NULL OR (floor(extract(epoch FROM ${WHEN}) * 1000000)::bigint, i.id) < ($5::bigint, $6::uuid))`,
    [stages ?? null, work ?? null, me!.id, before?.[0] ?? null, before?.[1] ?? null],
    limit === undefined ? undefined : limit + 1,
  );
  if (limit === undefined || rows.length <= limit) return { intents: rows, next: null as string | null };
  const intents = rows.slice(0, limit);
  return { intents, next: cursors.get(intents[limit - 1]) ?? null };
}

/** How many intents each stage holds, as the board's columns count them (those another's private work keeps left out). */
export async function intentCounts(db: Queryable, me: Me | null): Promise<Record<IntentStage, number>> {
  admin(me, INTENT_ADMINS);
  const { rows } = await db.query<{ stage: IntentStage; n: number }>(
    `SELECT i.stage, count(*)::int AS n FROM play.intents i WHERE i.coop_id = $1 AND ${intentSeen("i", "$2")} GROUP BY i.stage`,
    [COOP, me!.id],
  );
  const out = Object.fromEntries(INTENT_STAGES.map((s) => [s, 0])) as Record<IntentStage, number>;
  for (const r of rows) out[r.stage] = Number(r.n);
  return out;
}

export async function intentRow(db: Queryable, id: string) {
  const [intent] = await intentsWhere(db, `i.id = $2`, [idOf(id)]);
  if (!intent) throw new HttpError("There is no such intent.", 404);
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
  const who = admin(me, INTENT_ADMINS);
  const intent = await getIntent(db, id);
  // one whose work is another's private asset is as one that never was (./owners.ts)
  if (!(await seesIntent(db, who, intent.id))) throw new HttpError("There is no such intent.", 404);
  // held (approved, its dependencies not shipped): nothing to do yet, its sub-state says why
  const held = intent.held_by.length > 0 && (intent.stage === "build" || intent.stage === "proposal");
  return { ...intent, brief: held ? null : await briefOf(db, intent), review: intent.work ? await reviewOf(db, intent.id, intent.work) : null };
}

/**
 * One document of an intent's work, read when it is opened (intent 2df30a21): what it changes, field by field, with its
 * kind's extras (./versioned.ts reviewHeld), for whoever may open the intent; `variant` names one of a piece's versions.
 */
export async function intentDocOf(db: Queryable, me: Me | null, id: string, doc: string, variant: number | null, reviewHeld: (db: Queryable, id: string, doc: string, variant?: number | null) => Promise<unknown>) {
  const who = admin(me, INTENT_ADMINS);
  const intent = await getIntent(db, id);
  if (!(await seesIntent(db, who, intent.id))) throw new HttpError("There is no such intent.", 404);
  const r = await reviewHeld(db, intent.id, doc, variant);
  if (!r) throw new HttpError("This intent changes no such document.", 404);
  return r;
}

/** A new intent at the Idea stage, by an admin's agent over MCP (no one adds one by hand). */
export async function addIntent(db: Db, me: Me | null, body: { kind?: unknown; title?: unknown; note?: unknown; depends_on?: unknown; work_kind?: unknown }) {
  const who = admin(me, INTENT_ADMINS);
  const id = newId();
  const deps = depsOf(body?.depends_on);
  const declared = (await workKindOf(db, body?.work_kind)) ?? null;
  await db.transaction(async (tx) => {
    await tx.query(`INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, work_kind) VALUES ($1, $2, $3, $4, $5, 'idea', $6, 'mcp', $7)`, [
      id, COOP, kindOf(body?.kind), titleOf(body?.title), textOf(body?.note, "note", NOTE_MOST), who.id, declared,
    ]);
    if (deps?.length) await addEdges(tx, who, id, deps);
  });
  return intentRow(db, id);
}

/**
 * An intent specified over MCP: its spec (specOf) and, where given, its title, kind or note made sharper. It moves to
 * Specify, where an admin approves it before it is built; specified again, its spec is replaced. One already approved
 * is sent back to Specify first, by its agent (step_back_intent, ./stepback.ts).
 */
export async function specifyIntent(db: Db, me: Me | null, id: string, body: { goal?: unknown; scope?: unknown; checks?: unknown; nothing_to_reduce?: unknown; title?: unknown; kind?: unknown; note?: unknown; depends_on?: unknown; work_kind?: unknown }) {
  const who = admin(me, INTENT_ADMINS);
  const intent = await intentRow(db, id);
  if (intent.stage !== "idea" && intent.stage !== "specify")
    throw new HttpError(`Intent ${intent.id} is at the ${intent.stage} stage: it is specified at Idea or Specify (step_back_intent sends it back).`, 409);
  const spec = specOf(body);
  const deps = depsOf(body?.depends_on);
  // its declared work changes only while it holds none
  const declared = await workKindOf(db, body?.work_kind);
  if (declared !== undefined && JSON.stringify(declared) !== JSON.stringify(intent.work_kind ?? null) && (intent.work || (await db.query(`SELECT 1 FROM play.intent_variants WHERE intent_id = $1`, [intent.id])).rows.length))
    throw new HttpError(`Intent ${intent.id} holds work already: its declared kinds of work (work_kind) change only while it holds none.`, 409);
  await db.transaction(async (tx) => {
    // depends_on given: the intents it depends on, replacing those before (specifying is never held)
    if (deps) {
      await tx.query(`DELETE FROM play.intent_depends WHERE intent_id = $1 AND NOT (depends_on = ANY($2::uuid[]))`, [intent.id, deps]);
      await addEdges(tx, who, intent.id, deps);
    }
    await tx.query(
      `UPDATE play.intents SET stage = 'specify', spec = ($2::text)::jsonb, results = NULL, specified_by = $3, specified_at = now(), kind = $4, title = $5, note = $6,
              work_kind = CASE WHEN $7::boolean THEN $8::text[] ELSE work_kind END WHERE id = $1`,
      [
        intent.id, JSON.stringify(spec), who.id,
        body?.kind === undefined ? intent.kind : kindOf(body.kind),
        body?.title === undefined ? intent.title : titleOf(body.title),
        body?.note === undefined ? intent.note : textOf(body.note, "note", NOTE_MOST),
        declared !== undefined, declared ?? null,
      ],
    );
  });
  return intentRow(db, intent.id);
}

/** whether the intent's work waits for a decision at Proposal: then accepting applies it (./versioned.ts decide) */
export const waiting = (intent: { stage: string; work: unknown }) => intent.stage === "proposal" && !!intent.work;

/** an intent's pull request into main, by its number (check_intent's `pr`), or undefined where none is given */
const prOf = (v: unknown) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError("pr is the number of the intent's pull request into main (#2096 is 2096).");
  return n;
};

/**
 * Checks' results recorded over MCP while an intent is built (or at Proposal, no work waiting), each with its evidence,
 * where it ran and its commit; the latest of each stands. Every must check passed (and the gate passed), it moves to
 * Proposal by itself; a must failing there takes it back to Build. main's results confirm in any stage once approved,
 * moving nothing. `pr` names its pull request into main, which Accept merges (./ship.ts).
 */
export async function recordChecks(db: Queryable, me: Me | null, id: string, given: unknown, pr?: unknown) {
  const who = admin(me, INTENT_ADMINS);
  const intent = await intentRow(db, id);
  const named = prOf(pr);
  const list = given === undefined || given === null ? [] : given;
  if (!Array.isArray(list) || (!list.length && named === undefined)) throw new HttpError("Give each check's result: { check: 'c1', pass: true | false, evidence }.");
  // (code beside play's work, intent 7c8986c5: its run records its checks at Proposal too, its work waiting with it)
  const moves = intent.stage === "build" || (intent.stage === "proposal" && intent.approved_at && (!waiting(intent) || !!intent.pull_request));
  const confirms = list.length > 0 && named === undefined && !!intent.approved_at && list.every((r: any) => r?.where === "main");
  if (!moves && !confirms)
    throw new HttpError(
      `Intent ${intent.id} is at the ${intent.stage} stage: checks are recorded while it is being built (its spec approved)${intent.stage === "proposal" ? ", or at Proposal while no work of it waits there" : ""}; main's results (where main) in any stage once its spec is approved.`,
      409,
    );
  // held: nothing is recorded until every intent it depends on is shipped (main's confirmations are still taken)
  if (moves && !confirms && intent.held_by.length) throw new HttpError(heldText(intent.id, intent.held_by), 409);
  // work of another kind than declared is refused: a pull request is code
  const undeclared = named !== undefined ? notDeclared(intent, { code: true }) : "";
  if (undeclared) throw new HttpError(undeclared, 409);
  // only the box's run is evidence (play/SPEC.md §4.12, Samuel 2026-11-06): what can decide a code intent (its pull
  // request named, a test or measure result on a commit or on main, or any once its pull request is named) is taken
  // from avenBOX's token alone; a look is still judged and recorded by hand
  const checkOf = new Map<string, Check>((intent.spec?.checks ?? []).map((c: Check) => [c.id, c]));
  if (!who.box) {
    if (named !== undefined) throw new HttpError(`Intent ${intent.id}: its pull request is named by its run, not by hand: ${BOX_ONLY}.`, 403);
    for (const r of list as any[]) {
      const c = checkOf.get(r?.check);
      if (!c || c.how === "look") continue;
      const code = !!intent.pull_request || (r?.commit !== undefined && r?.commit !== null && r?.commit !== "") || r?.where === "main";
      if (code) throw new HttpError(`${c.id} (${c.how}) of intent ${intent.id}: ${BOX_ONLY}.`, 403);
    }
  }
  const ids = new Set(checkOf.keys());
  const results: Record<string, Result> = { ...(intent.results ?? {}) };
  const at = new Date().toISOString();
  for (const r of list as any[]) {
    if (!ids.has(r?.check)) throw new HttpError(`${r?.check} is not one of this intent's checks (${[...ids].join(", ")}).`);
    if (typeof r?.pass !== "boolean") throw new HttpError(`${r.check}: pass is true or false.`);
    const evidence = textOf(r?.evidence, `${r.check}'s evidence (the command and what it printed, the value measured, what was compared)`, 4000, true);
    const where = r?.where === undefined || r?.where === null || r?.where === "" ? "avenBOX" : r.where;
    if (!WHERES.includes(where)) throw new HttpError(`${r.check}: where is ${WHERES.join(" or ")} (where the check was run).`);
    const commit = r?.commit === undefined || r?.commit === null || r?.commit === "" ? undefined : `${r.commit}`;
    if (commit !== undefined && !/^[0-9a-f]{40}$/.test(commit)) throw new HttpError(`${r.check}: commit is the 40-character git hash it ran on.`);
    const link = r?.link === undefined || r?.link === null || r?.link === "" ? undefined : `${r.link}`;
    if (link !== undefined && !/^https:\/\/[^\s]{1,300}$/.test(link)) throw new HttpError(`${r.check}: link is the https link of the run it was recorded by.`);
    results[r.check] = { pass: r.pass, evidence, by: who.name, at, where, ...(commit ? { commit } : {}), ...(who.box ? { box: true as const } : {}), ...(link ? { link } : {}) };
  }
  // to Proposal past the gate, else in Build, its results kept, saying why; main's results after the merge only kept
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

/** every forward move: approve (to Build), to Proposal on its checks, work proposed, accept, its work accepted, Accept into Ship, Ship's turn */
export type Move = "build" | "proposal" | "work" | "accept" | "accept_work" | "ship" | "merge";
/** why a move is refused; `wait` where only a dependency still in Ship refuses it (Ship's turn waits for it) */
export type Refusal = { why: string; wait?: boolean };
type GateRow = { id: string; stage: string; spec: Spec | null; results: Record<string, Result> | null; work?: unknown; pull_request?: number | null; approved_at?: unknown; held_by?: Dep[]; work_kind?: string[] | null };
/** the kind of work a move brings (mayMove's work): a document's schema (its UUID), or code */
export type WorkWhat = { schema?: string | null; code?: boolean };

/**
 * Why work of kind `what` is not the intent's to take, or "" where it is: an intent that declares its kinds of work
 * (work_kind) takes only those; one that declares nothing takes any.
 */
export function notDeclared(i: { id: string; work_kind?: string[] | null }, what: WorkWhat): string {
  const kinds = i.work_kind ?? [];
  if (!kinds.length) return "";
  const k = what.code ? CODE : what.schema ?? null;
  if (!k || kinds.includes(k)) return "";
  return `Intent ${i.id} declares its work as ${declaredText(kinds)} (work_kind): ${what.code ? "code (a pull request)" : `a document of schema ${k}`} is none of them. Its declared kinds change only by specify_intent, while it holds no work.`;
}
const NOT_IN_BUILD = "An intent in Build is not accepted: it moves to Proposal by itself once every must check passes, and is decided there.";

/**
 * The one forward gate: whether intent `intent` (its id, or its row as it would be) may make move `to`; null, else why
 * not. Each move's stage rules, its must checks, and held while any intent it depends on is not shipped. Every forward
 * path calls it (as gate.mayMove) and none tests the stage on its own; going back never does.
 */
async function mayMove(db: Queryable, intent: string | GateRow, to: Move, what?: WorkWhat): Promise<Refusal | null> {
  const i: GateRow = typeof intent === "string" ? await intentRow(db, intent) : intent;
  const at = i.stage;
  const no = (why: string): Refusal => ({ why });
  const stage = () => {
    switch (to) {
      case "build":
        return at !== "specify" ? `Only a specified intent's spec is approved; this one is at the ${at} stage.` : reduces(i.spec) ? "" : `${NO_REDUCE} It is specified again first.`;
      case "proposal":
        return at === "build" || (at === "proposal" && i.approved_at) ? "" : `Intent ${i.id} is at the ${at} stage: it moves to Proposal from Build.`;
      case "work":
        if (at === "idea" || at === "specify") return `Intent ${i.id} is at the ${at} stage: it is specified (specify_intent) and its spec approved by an admin before it is built and proposed.`;
        return at === "build" || at === "proposal" ? "" : `Intent ${i.id} is ${at}: it takes no more work.`;
      case "accept":
        if (at !== "proposal") return at === "build" ? NOT_IN_BUILD : `An intent at the ${at} stage is decided already, or not yet built.`;
        if (i.work) return "Its work waits for a decision: accepting applies it (./versioned.ts decide).";
        return i.pull_request ? `Its code is pull request #${i.pull_request}: Accept ships it (./ship.ts), merging it into main.` : "";
      case "accept_work":
        if (at !== "proposal") return `This intent is at the ${at} stage: only one at Proposal is decided.`;
        // play's work beside code is accepted once its code is live (intent 7c8986c5): Accept and ship takes both
        return i.pull_request ? `Its code is pull request #${i.pull_request}: Accept and ship ships it, and its work of play's is accepted once the code is live (./ship.ts).` : "";
      case "ship":
        return at === "proposal" ? "" : at === "build" ? NOT_IN_BUILD : `Intent ${i.id} is at the ${at} stage now.`;
      case "merge":
        return at === "ship" ? "" : `Intent ${i.id} is at the ${at} stage, not in Ship.`;
    }
  };
  const bad = stage();
  if (bad) return no(bad);
  // work of another kind than the intent declares is refused
  const undeclared = to === "work" && what ? notDeclared(i, what) : "";
  if (undeclared) return no(undeclared);
  // approving a spec is never held (Samuel 2026-11-07): it waits in Build, idle, until its dependencies are shipped
  // Accept into Ship waits there for a dependency ahead of it in Ship; one anywhere else refuses, before its checks
  const held = to === "build" ? [] : (i.held_by ?? (await heldBy(db, i.id))).filter((d) => to !== "ship" || d.stage !== "ship");
  if (held.length) {
    if (to === "merge" && held.every((d) => d.stage === "ship")) return { why: `Waits for ${named(held)} to ship first`, wait: true };
    return no(heldText(i.id, held));
  }
  // work proposed in Build waits on the intent (intent 94061718): the move to Proposal alone waits for every must
  const missing = to === "accept_work" || to === "merge" || to === "build" || to === "work" ? [] : unmet(i);
  if (missing.length) return no(`Every must check passes before an intent is ${to === "proposal" ? "at Proposal" : "accepted"}: ${missing.join("; ")}.`);
  return null;
}
/** the gate as every path calls it (a test may stand a stub in its place) */
export const gate = { mayMove };
/** the move's refusal thrown, if any */
export async function mustMove(db: Queryable, intent: string | GateRow, to: Move, what?: WorkWhat) {
  const r = await gate.mayMove(db, intent, to, what);
  if (r) throw new HttpError(r.why, 409);
}

/** The intent work is about to be proposed for, held to the gate (mayMove's work). Otherwise nothing is proposed and the agent is told why. */
export async function intentReady(db: Queryable, me: Me | null, id: unknown) {
  const who = admin(me, INTENT_ADMINS);
  const intent = await intentRow(db, `${id ?? ""}`);
  if (!(await seesIntent(db, who, intent.id))) throw new HttpError("There is no such intent.", 404);
  await mustMove(db, intent, "work");
  return intent;
}

// ---- the one decision path: every forward decision, a person's or a rule's, is written here

/** who decides: a person (a human's UUID) or a rule (./rules.ts) */
export type By = string | AutoBy;
/** who decides in `me`'s request: the rule it carries where a rule decides (autoMove), else `me` */
export const byOf = (me: Pick<Me, "id" | "auto">): By => me.auto ?? me.id;
/** the decisions written: a spec approved (Specify → Build), an intent accepted, its work accepted, Accept into Ship */
export type Decision = "approve" | "accept" | "accept_work" | "ship";



/** a person decides only a waiting intent (./substate.ts): refused with its sub-state's reason otherwise */
export function mustDecide(intent: any) {
  const s = sub.of(intent);
  if (!decidable(intent, s)) throw new HttpError(s ? `${s.why}.` : `Intent ${intent.id} is at the ${intent.stage} stage.`, 409);
}

/**
 * An admin's decision on the board: approve a spec (Specify → Build), accept an intent at Proposal with no work of
 * play's and no pull request (one with a pull request is shipped, ./ship.ts), reject it, or bring a decided one back
 * (to Specify with its spec, else to Idea). Steps back are an agent's (./stepback.ts).
 */
export async function decideIntent(db: Queryable, me: Me | null, id: string, verdict: IntentVerdict) {
  const who = admin(me, INTENT_ADMINS);
  const intent = await intentRow(db, id);
  const refuse = (why: string) => {
    throw new HttpError(why, 409);
  };
  switch (verdict) {
    case "approve":
      await mustMove(db, intent, "build");
      mustDecide(intent);
      await decisions.decided(db, intent.id, "approve", byOf(who));
      break;
    case "accept":
      await mustMove(db, intent, "accept");
      mustDecide(intent);
      await decisions.decided(db, intent.id, "accept", byOf(who));
      break;
    case "reject":
      if (intent.stage === "proposal" && waiting(intent)) refuse("Its work waits for a decision: archiving it archives the intent.");
      if (!["idea", "specify", "build", "proposal"].includes(intent.stage)) refuse(`An intent at the ${intent.stage} stage is decided already.`);
      // a reject undoes what a rule decided before it
      await db.query(`UPDATE play.intents SET stage = 'archived', decided_by = $2, decided_at = now(), auto = '{}'::jsonb WHERE id = $1`, [intent.id, who.id]);
      // work proposed in Build that waited on it is archived with it, kept in the history
      if (intent.work) await closeWork(db, who, { id: intent.id });
      break;
    case "reopen":
      if (intent.stage !== "accepted" && intent.stage !== "archived") refuse(`This intent is at the ${intent.stage} stage already.`);
      // accepted work is in: what comes after it is an intent of its own
      if (intent.stage === "accepted" && intent.work) refuse("Its work is in (accepted): what is wanted now is an intent of its own.");
      await db.query(
        `UPDATE play.intents SET stage = CASE WHEN spec IS NULL OR jsonb_array_length(spec->'checks') = 0 THEN 'idea' ELSE 'specify' END,
                approved_by = NULL, approved_at = NULL, results = NULL, decided_by = NULL, decided_at = NULL, auto = '{}'::jsonb WHERE id = $1`,
        [intent.id],
      );
      break;
    default:
      throw new HttpError("No such decision.", 404);
  }
  return intentRow(db, intent.id);
}

/**
 * The decision `move` on intent `id`, by `by`, written in the caller's transaction (the one place it is): approve takes
 * it to Build (approved_by, approved_at, its results cleared), accept and accept_work to Accepted (decided_by,
 * decided_at), ship into Ship with its ship (`o.ship`). A person is its approved_by or decided_by; a rule leaves those
 * null and is kept in `auto` (its approve or accept entry: the rule's UUID and label, the rule set's version hash, its
 * reason, when). The gate (mayMove) and who may decide are the caller's, asked before.
 */
async function decided(q: Queryable, id: string, move: Decision, by: By, o: { ship?: unknown } = {}): Promise<void> {
  const human = typeof by === "string" ? by : null;
  const rule = typeof by === "string" ? null : JSON.stringify({ rule: by.rule, label: by.label, rules: by.rules, reason: by.reason, at: new Date().toISOString() });
  // its auto entry for the gate: the rule's, or none (a person's)
  const entry = (key: string) => `auto = (auto - '${key}') || CASE WHEN $3::text IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('${key}', ($3::text)::jsonb) END`;
  if (move === "approve")
    await q.query(`UPDATE play.intents SET stage = 'build', approved_by = $2, approved_at = now(), results = NULL, ${entry("approve")} WHERE id = $1`, [id, human, rule]);
  else if (move === "ship")
    await q.query(`UPDATE play.intents SET stage = 'ship', ship = ($4::text)::jsonb, decided_by = $2, decided_at = now(), ${entry("accept")} WHERE id = $1`, [id, human, rule, JSON.stringify(o.ship ?? null)]);
  else await q.query(`UPDATE play.intents SET stage = 'accepted', decided_by = $2, decided_at = now(), ${entry("accept")} WHERE id = $1`, [id, human, rule]);
}
/** the one decision path as every path calls it (a test may stand a stub in its place) */
export const decisions = { decided };

// ---- auto-accept rules (play/SPEC.md §4.12 "Auto-accept rules", ./rules.ts): a rule takes the move a person would

/** what autoMove did: the gate a rule decided at and the rule, or why the move it matched was refused */
export type AutoMoved = { gate: "approve" | "accept"; rule: string; refused?: string };

/**
 * Intent `id` decided by a rule where one matches: at Specify its spec approved (Approve spec), at Proposal accepted
 * (its work accepted and applied, its code into Ship, else Accepted), exactly by a person's path (./versioned.ts
 * decideAny) with the rule as who decided. Only where the gate (mayMove) allows the move (its stage, its reduce step,
 * its must checks, held by its dependencies) and matchRule gives a rule; a refusal on that path (a pull request not
 * ready) leaves it where it is, saying why. Accepted, the intents it held are asked again. `me` is the admin whose
 * request it is (else the intent's author, an admin); `gh` Ship's GitHub for code. Null where no rule decides.
 */
export async function autoMove(ctx: { db: Db; store?: BlobStore }, id: string, o: { me?: Me | null; gh?: GitHub | null; commit?: string | null } = {}): Promise<AutoMoved | null> {
  const db = ctx.db;
  const intent = await intentRow(db, id);
  const at = intent.stage === "specify" ? ("approve" as const) : intent.stage === "proposal" ? ("accept" as const) : null;
  if (!at) return null;
  const move: Move = at === "approve" ? "build" : intent.pull_request ? "ship" : intent.work ? "accept_work" : "accept";
  if (await gate.mayMove(db, intent, move)) return null;
  const set = await ruleSetOf(db);
  const facts = await factsOf(db, intent.id);
  const rule = matchRule(facts, at, set);
  if (!rule || !set) return null;
  const actor = o.me?.level === "admin" ? o.me : await meOf(db, facts.author);
  if (actor?.level !== "admin") return null;
  const by: AutoBy = { rule: rule.id, label: rule.label, rules: set.hash, reason: rule.reason };
  try {
    await decideAny({ db, store: ctx.store as BlobStore }, actor, intent.id, at, o.gh ?? null, o.commit === undefined ? undefined : o.commit, by);
  } catch (e) {
    if ((e as any)?.status) return { gate: at, rule: rule.id, refused: (e as Error).message };
    throw e;
  }
  if ((await intentRow(db, intent.id)).stage === "accepted") await autoAfter(ctx, intent.id, o);
  return { gate: at, rule: rule.id };
}

/** once intent `id` is Accepted, every intent it held is asked again (autoMove): a rule may move it now */
export async function autoAfter(ctx: { db: Db; store?: BlobStore }, id: string, o: { me?: Me | null; gh?: GitHub | null; commit?: string | null } = {}) {
  const { rows } = await ctx.db.query<{ intent_id: string }>(`SELECT intent_id FROM play.intent_depends WHERE depends_on = $1 ORDER BY at, intent_id`, [id]);
  for (const r of rows) await autoMove(ctx, r.intent_id, o).catch((e) => console.warn(`auto: intent ${r.intent_id} not looked at: ${(e as Error).message}`));
}
