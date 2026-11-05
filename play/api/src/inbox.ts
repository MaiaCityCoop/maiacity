// The Inbox (play/SPEC.md §4.12, Samuel 2026-11-05): the stage before a proposal on the Proposals board, an idea board
// of what Maia City wants made, fixed or improved, triaged by its admins and taken up by agents. An item is a note (its
// kind, title and text) named by its UUID; its title is only shown. A proposal made for an item names it (over MCP, any
// propose tool's `inbox`), and the item shows its proposals. It stays in the Inbox until an admin marks it done or
// archives it, and may be brought back; people decide, as with proposals: no tool marks an item done.
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
export const INBOX_STATUSES = ["inbox", "done", "archived"] as const;
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
const noteOf = (v: unknown) => {
  const n = `${v ?? ""}`.trim();
  if (n.length > NOTE_MOST) throw new InboxError(`An item's note is at most ${NOTE_MOST} characters.`);
  return n;
};
const idOf = (v: unknown) => {
  const id = `${v ?? ""}`;
  if (!UUID.test(id)) throw new InboxError("An Inbox item is named by its id, a UUID (list_inbox gives it).", 404);
  return id;
};

/** the items with who wrote and decided them, and each one's proposals (their ids and statuses), newest first */
async function itemsWhere(db: Queryable, where: string, args: unknown[]) {
  const { rows } = await db.query<any>(
    `SELECT i.id, i.kind, i.title, i.note, i.status, i.via, i.created, i.edited_at, i.decided_at,
            au.name AS author, ed.name AS edited_by, de.name AS decided_by,
            COALESCE((SELECT json_agg(json_build_object('id', p.id, 'status', p.status) ORDER BY p.created)
                        FROM play.proposals p WHERE p.inbox_id = i.id), '[]'::json) AS proposals
       FROM play.inbox i
       LEFT JOIN play.humans au ON au.id = i.author
       LEFT JOIN play.humans ed ON ed.id = i.edited_by
       LEFT JOIN play.humans de ON de.id = i.decided_by
      WHERE i.coop_id = $1 AND ${where}
      ORDER BY i.created DESC LIMIT 500`,
    [COOP, ...args],
  );
  return rows;
}

/** The Inbox's items, newest first: those still in the Inbox, done or archived (`status`), or all of them. */
export async function listInbox(db: Queryable, me: Me | null, status?: string) {
  admin(me);
  if (status !== undefined && !INBOX_STATUSES.includes(status as any)) throw new InboxError(`An item is ${INBOX_STATUSES.join(", ")}.`);
  return itemsWhere(db, `($2::text IS NULL OR i.status = $2)`, [status ?? null]);
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

/** A new item in the Inbox, by an admin on the board or by their agent over MCP. */
export async function addInbox(db: Queryable, me: Me | null, body: { kind?: unknown; title?: unknown; note?: unknown }, via: "web" | "mcp" = "web") {
  const who = admin(me);
  const id = newId();
  await db.query(`INSERT INTO play.inbox (id, coop_id, kind, title, note, author, via) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
    id, COOP, kindOf(body?.kind), titleOf(body?.title), noteOf(body?.note), who.id, via,
  ]);
  return itemRow(db, id);
}

/** An item's kind, title or note changed by an admin, whatever stage it is at: only what is given changes. */
export async function editInbox(db: Queryable, me: Me | null, id: string, body: { kind?: unknown; title?: unknown; note?: unknown }) {
  const who = admin(me);
  const item = await itemRow(db, id);
  const kind = body?.kind === undefined ? item.kind : kindOf(body.kind);
  const title = body?.title === undefined ? item.title : titleOf(body.title);
  const note = body?.note === undefined ? item.note : noteOf(body.note);
  if (kind === item.kind && title === item.title && note === item.note) return item;
  await db.query(`UPDATE play.inbox SET kind = $2, title = $3, note = $4, edited_by = $5, edited_at = now() WHERE id = $1`, [item.id, kind, title, note, who.id]);
  return itemRow(db, item.id);
}

/** An item marked done or archived by an admin, or brought back into the Inbox. */
export async function decideInbox(db: Queryable, me: Me | null, id: string, verdict: InboxVerdict) {
  const who = admin(me);
  const item = await itemRow(db, id);
  const status = verdict === "done" ? "done" : verdict === "archive" ? "archived" : "inbox";
  if (item.status === status) throw new InboxError(status === "inbox" ? "This item is in the Inbox already." : `This item is ${status} already.`, 409);
  if (status === "inbox") await db.query(`UPDATE play.inbox SET status = 'inbox', decided_by = NULL, decided_at = NULL WHERE id = $1`, [item.id]);
  else await db.query(`UPDATE play.inbox SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [item.id, status, who.id]);
  return itemRow(db, item.id);
}

/** The item a proposal is about to be made for: there, and still in the Inbox (one done or archived takes none). */
export async function inboxOpen(db: Queryable, me: Me | null, id: unknown) {
  admin(me);
  const item = await itemRow(db, `${id ?? ""}`);
  if (item.status !== "inbox") throw new InboxError(`Inbox item ${item.id} is ${item.status}: it takes no more proposals. Propose without it, or ask an admin to bring it back.`, 409);
  return item;
}

/** A proposal just made named as made for an item (checked with inboxOpen before it was made). */
export async function linkInbox(db: Queryable, item: string, proposal: string) {
  await db.query(`UPDATE play.proposals SET inbox_id = $1 WHERE id = $2`, [item, proposal]);
}
