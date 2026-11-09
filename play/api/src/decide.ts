// An admin's decision on an intent, whatever its stage, and a rule's in a person's place (play/SPEC.md §4.12): the one
// place an intent is decided. Work of play's at Proposal is accepted or archived by ./versioned.ts decide, code is
// shipped (./ship.ts), anything else is the intent's own decision (./intents.ts decideIntent); an auto-accept rule
// (./rules.ts) takes the same path, written as who decided, and every Accept asks the intents it held again.
import { meOf, type AutoBy, type Me } from "./access";
import type { BlobStore } from "./blobs";
import type { Db } from "./kit/pg";
import type { GitHub } from "./github";
import type { Ctx } from "./kinds";
import { workOf } from "./held";
import { decideIntent, gate, getIntent, intentRow, noSuchIntent, type IntentVerdict, type Move } from "./intents";
import { seesIntent } from "./owners";
import { factsOf, matchRule, ruleSetOf } from "./rules";
import { acceptAndShip, acceptCode, runningCommit } from "./ship";
import { decide } from "./versioned";
import { statusOf } from "./fault";

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
  if (!w || (me && !(await seesIntent(db, me, w.id)))) throw noSuchIntent();
  // a rule decides (./decide.ts autoMove): a person's path, the rule written as who decided
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

// ---- auto-accept rules (play/SPEC.md §4.12 "Auto-accept rules", ./rules.ts): a rule takes the move a person would

/** what autoMove did: the gate a rule decided at and the rule, or why the move it matched was refused */
type AutoMoved = { gate: "approve" | "accept"; rule: string; refused?: string };

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
    if (statusOf(e) !== null) return { gate: at, rule: rule.id, refused: (e as Error).message };
    throw e;
  }
  if ((await intentRow(db, intent.id)).stage === "accepted") await autoAfter(ctx, intent.id, o);
  return { gate: at, rule: rule.id };
}

/** once intent `id` is Accepted, every intent it held is asked again (autoMove): a rule may move it now */
async function autoAfter(ctx: { db: Db; store?: BlobStore }, id: string, o: { me?: Me | null; gh?: GitHub | null; commit?: string | null } = {}) {
  const { rows } = await ctx.db.query<{ intent_id: string }>(`SELECT intent_id FROM play.intent_depends WHERE depends_on = $1 ORDER BY at, intent_id`, [id]);
  for (const r of rows) await autoMove(ctx, r.intent_id, o).catch((e) => console.warn(`auto: intent ${r.intent_id} not looked at: ${(e as Error).message}`));
}
