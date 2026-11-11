// A change's own intent (play/SPEC.md §4.12 "Auto-accept rules", intents de24f1c5 and a6ae861e): a propose tool called
// with no intent named (add_artifact, update_artifact, add_lead, update_lead) makes the intent its change is the work
// of, through the intent flow's own functions, in the caller's one transaction, and the rules decide it at Approve spec
// and at Accept; where no rule decides it, it waits for a person.
import type { Me } from "./access";
import type { BlobStore } from "./blobs";
import { autoMove } from "./decide";
import { addIntent, intentRow, recordChecks, specifyIntent } from "./intents";
import type { Db, Queryable } from "./kit/pg";

/** the caller's transaction as a Db: every transaction asked of it is that one (the whole request is one) */
export const flat = (tx: Queryable): Db => ({ query: (t, p) => tx.query(t, p), exec: async (t) => void (await tx.query(t)), transaction: (fn) => fn(tx) });

/** the intent a change makes for itself: what it is, its spec (play's own) and the evidence of its one check */
export type Own = {
  kind: "idea" | "improve";
  title: string;
  /** what it changes, in a word (the intent's note): "the artifact's", "the lead's" */
  of: string;
  /** the schema of the documents it brings (its declared work_kind) */
  work: string;
  goal: string;
  scope: string;
  /** why nothing is reduced (its spec's nothing_to_reduce) */
  nothing: string;
  /** its one check: a look play records as passed, the form checks just made its evidence */
  check: { check: string; by: string };
  evidence: string;
};

/**
 * An intent of the change's own, specified with play's spec and asked of the rules at Approve spec and at Accept;
 * where no rule decides it, it waits for a person. Gives back its id, stage and what `propose` gave.
 */
export async function ownIntent<R>(db: Db, store: BlobStore, who: Me, o: Own, propose: (intent: string) => Promise<R>): Promise<{ intent: string; stage: string; auto: unknown; proposed: R | null }> {
  const i = await addIntent(db, who, { kind: o.kind, title: o.title, note: `Made by play for ${o.of} change, with no intent named (play/SPEC.md §4.12, Auto-accept rules).`, work_kind: [o.work] });
  await specifyIntent(db, who, i.id, { goal: o.goal, scope: o.scope, nothing_to_reduce: o.nothing, checks: [{ ...o.check, how: "look", must: true }] });
  await autoMove({ db, store }, i.id, { me: who });
  if ((await intentRow(db, i.id)).stage !== "build") return { intent: i.id, ...(await stageOf(db, i.id)), proposed: null };
  await recordChecks(db, who, i.id, [{ check: "c1", pass: true, evidence: o.evidence }]);
  const proposed = await propose(i.id);
  await autoMove({ db, store }, i.id, { me: who });
  return { intent: i.id, ...(await stageOf(db, i.id)), proposed };
}

const stageOf = async (db: Db, id: string) => {
  const r = await intentRow(db, id);
  return { stage: r.stage as string, auto: r.auto };
};
