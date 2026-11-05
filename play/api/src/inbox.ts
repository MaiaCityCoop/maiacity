// The Inbox and Specify (play/SPEC.md §4.12, Samuel 2026-11-05): the stages before a proposal on the Proposals board.
// What Maia City wants made, fixed or improved comes into the Inbox over MCP only (an agent's add_inbox_item: no one
// types into it by hand), each item a note (its kind, title and text) named by its UUID, its title only shown. It is
// then specified, over MCP too (specify_inbox_item): its definition, what is to be made, precisely, and its metric,
// what good is, how a proposal for it is judged. Only a specified item takes proposals (any propose tool's `inbox`),
// and it shows them. Admins decide on the board: an item is archived, or marked done once what it asked is in, or
// brought back; no tool marks an item done.
import { Denied, COOP, type Me } from "./access";
import type { Queryable } from "./pg";
import { NOTE_MOST } from "./notes";
import { newId, UUID } from "./uuid";

export class InboxError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const INBOX_KINDS = ["idea", "fix", "improve"] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];
/** an item's stages: as it came, specified, done (shown with what was accepted) or archived */
export const INBOX_STATUSES = ["inbox", "specify", "done", "archived"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];
/** the items still to be taken up: in the Inbox or being specified */
export const OPEN_ITEMS: InboxStatus[] = ["inbox", "specify"];
export const TITLE_MOST = 200;
export type InboxVerdict = "done" | "archive" | "reopen";

/** only Maia City's admins keep the Inbox, as they decide the proposals */
function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins keep the Inbox.");
  return me;
}

const kindOf = (v: unknown): InboxKind => {
  if (v === undefined || v === null || v === "") return "idea";
  if (!INBOX_KINDS.includes(v as InboxKind)) throw new InboxError(`An item's kind is ${INBOX_KINDS.join(", ")}.`);
  return v as InboxKind;
};
const titleOf = (v: unknown) => {
  const t = `${v ?? ""}`.replace(/\s+/g, " ").trim();
  if (!t) throw new InboxError("An item needs a title: what is to be made, fixed or improved, in a line.");
  if (t.length > TITLE_MOST) throw new InboxError(`An item's title is at most ${TITLE_MOST} characters: say the rest in its note.`);
  return t;
};
const textOf = (v: unknown, what: string, need = false) => {
  const n = `${v ?? ""}`.trim();
  if (need && !n) throw new InboxError(`An item's spec needs its ${what}.`);
  if (n.length > NOTE_MOST) throw new InboxError(`An item's ${what} is at most ${NOTE_MOST} characters.`);
  return n;
};
const idOf = (v: unknown) => {
  const id = `${v ?? ""}`;
  if (!UUID.test(id)) throw new InboxError("An Inbox item is named by its id, a UUID (list_inbox gives it).", 404);
  return id;
};

/** the items with who wrote, specified and decided them, and each one's proposals (their ids and statuses), newest first */
async function itemsWhere(db: Queryable, where: string, args: unknown[]) {
  const { rows } = await db.query<any>(
    `SELECT i.id, i.kind, i.title, i.note, i.status, i.via, i.created, i.definition, i.metric, i.specified_at, i.decided_at,
            au.name AS author, sp.name AS specified_by, de.name AS decided_by,
            COALESCE((SELECT json_agg(json_build_object('id', p.id, 'status', p.status) ORDER BY p.created)
                        FROM play.proposals p WHERE p.inbox_id = i.id), '[]'::json) AS proposals
       FROM play.inbox i
       LEFT JOIN play.humans au ON au.id = i.author
       LEFT JOIN play.humans sp ON sp.id = i.specified_by
       LEFT JOIN play.humans de ON de.id = i.decided_by
      WHERE i.coop_id = $1 AND ${where}
      ORDER BY i.created DESC LIMIT 500`,
    [COOP, ...args],
  );
  return rows;
}

/** The items at the given stages (every stage where none is given), newest first. */
export async function listInbox(db: Queryable, me: Me | null, statuses?: string[]) {
  admin(me);
  for (const s of statuses ?? []) if (!INBOX_STATUSES.includes(s as InboxStatus)) throw new InboxError(`An item is ${INBOX_STATUSES.join(", ")}.`);
  return itemsWhere(db, `($2::text[] IS NULL OR i.status = ANY($2::text[]))`, [statuses ?? null]);
}

async function itemRow(db: Queryable, id: string) {
  const [item] = await itemsWhere(db, `i.id = $2`, [idOf(id)]);
  if (!item) throw new InboxError("There is no such item in the Inbox.", 404);
  return item;
}

/** One item with its proposals as the board lists them (their labels, kinds and statuses), via ./proposals.ts. */
export async function inboxItem(db: Queryable, me: Me | null, id: string, proposalsOf: (db: Queryable, item: string) => Promise<unknown[]>) {
  admin(me);
  const item = await itemRow(db, id);
  return { ...item, proposals: await proposalsOf(db, item.id) };
}

/** A new item in the Inbox, by an admin's agent over MCP (no one adds one by hand). */
export async function addInbox(db: Queryable, me: Me | null, body: { kind?: unknown; title?: unknown; note?: unknown }) {
  const who = admin(me);
  const id = newId();
  await db.query(`INSERT INTO play.inbox (id, coop_id, kind, title, note, author, via) VALUES ($1, $2, $3, $4, $5, $6, 'mcp')`, [
    id, COOP, kindOf(body?.kind), titleOf(body?.title), textOf(body?.note, "note"), who.id,
  ]);
  return itemRow(db, id);
}

/**
 * An item specified, over MCP: its definition (what is to be made, precisely) and its metric (what good is, how a
 * proposal for it is judged), and, where given, its title, kind or note made sharper. It moves to Specify; specified
 * again, its spec is replaced. One done or archived is brought back by an admin first.
 */
export async function specifyInbox(db: Queryable, me: Me | null, id: string, body: { definition?: unknown; metric?: unknown; title?: unknown; kind?: unknown; note?: unknown }) {
  const who = admin(me);
  const item = await itemRow(db, id);
  if (!OPEN_ITEMS.includes(item.status)) throw new InboxError(`Inbox item ${item.id} is ${item.status}: an admin brings it back before it is specified again.`, 409);
  const definition = textOf(body?.definition, "definition (what is to be made, precisely)", true);
  const metric = textOf(body?.metric, "metric (what good is: how a proposal for it is judged)", true);
  await db.query(
    `UPDATE play.inbox SET status = 'specify', definition = $2, metric = $3, specified_by = $4, specified_at = now(), kind = $5, title = $6, note = $7 WHERE id = $1`,
    [
      item.id, definition, metric, who.id,
      body?.kind === undefined ? item.kind : kindOf(body.kind),
      body?.title === undefined ? item.title : titleOf(body.title),
      body?.note === undefined ? item.note : textOf(body.note, "note"),
    ],
  );
  return itemRow(db, item.id);
}

/**
 * An admin's decision on the board: an item archived (from the Inbox or Specify), marked done (once specified: what it
 * asked is in), or brought back (to Specify if it has its spec, else to the Inbox).
 */
export async function decideInbox(db: Queryable, me: Me | null, id: string, verdict: InboxVerdict) {
  const who = admin(me);
  const item = await itemRow(db, id);
  if (verdict === "reopen") {
    if (OPEN_ITEMS.includes(item.status)) throw new InboxError(`This item is in ${item.status === "inbox" ? "the Inbox" : "Specify"} already.`, 409);
    await db.query(`UPDATE play.inbox SET status = CASE WHEN definition IS NULL THEN 'inbox' ELSE 'specify' END, decided_by = NULL, decided_at = NULL WHERE id = $1`, [item.id]);
    return itemRow(db, item.id);
  }
  if (!OPEN_ITEMS.includes(item.status)) throw new InboxError(`This item is ${item.status} already.`, 409);
  if (verdict === "done" && item.status !== "specify") throw new InboxError("An item is done once it has been specified and made: this one has no spec yet.", 409);
  await db.query(`UPDATE play.inbox SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [item.id, verdict === "done" ? "done" : "archived", who.id]);
  return itemRow(db, item.id);
}

/** The item a proposal is about to be made for: there, and specified (one still in the Inbox, done or archived takes none). */
export async function inboxOpen(db: Queryable, me: Me | null, id: unknown) {
  admin(me);
  const item = await itemRow(db, `${id ?? ""}`);
  if (item.status === "inbox")
    throw new InboxError(`Inbox item ${item.id} has no spec yet: specify it first (specify_inbox_item: its definition and its metric of what is good), then make it and propose it.`, 409);
  if (item.status !== "specify") throw new InboxError(`Inbox item ${item.id} is ${item.status}: it takes no more proposals. Propose without it, or ask an admin to bring it back.`, 409);
  return item;
}

/** A proposal just made named as made for an item (checked with inboxOpen before it was made). */
export async function linkInbox(db: Queryable, item: string, proposal: string) {
  await db.query(`UPDATE play.proposals SET inbox_id = $1 WHERE id = $2`, [item, proposal]);
}
