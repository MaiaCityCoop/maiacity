// HOW THE INTENTS' BOARD LOADS (intent 2cb70fb8-fbbf-4473-8ac1-b8d3bb078147): on open, one request, the open columns
// (Idea, Specify, Build, Proposal, Ship) whole and every column's count; Accepted and Archived, most of the board, are
// fetched only when unfolded, newest first, a page at a time ("more" asks for the next page by its cursor). Plain
// functions over the cards the board holds, so ./board.test.ts can follow what is asked of play.

import { CLOSED_STAGES, OPEN_STAGES } from '$stages';

/** the columns always loaded whole */
export const OPEN = OPEN_STAGES;
/** the columns loaded only when unfolded, a page at a time */
export const CLOSED = CLOSED_STAGES;
export type ClosedStage = (typeof CLOSED)[number];
/** a closed column's page */
export const PAGE = 50;

export const isClosed = (s: string): s is ClosedStage => (CLOSED as readonly string[]).includes(s);
/** what is asked of play on open: the open columns and every column's count */
const openPath = () => `/intents?stage=${OPEN.join(',')}&counts=1`;
/** a closed column's page, the first or the one after `before` */
const pagePath = (stage: ClosedStage, before?: string | null) => `/intents?stage=${stage}&limit=${PAGE}${before ? `&before=${encodeURIComponent(before)}` : ''}`;

type Card = { id: string; stage: string };
export type Answer<T> = { intents: T[]; next: string | null; counts?: Record<string, number> };
export type Get = <A>(path: string) => Promise<A>;
/** a closed column as far as it is loaded: loaded at all, and the cursor of its next page (null at its end) */
export type Paged = { loaded: boolean; next: string | null };

/**
 * The open columns read again (on open, while one ships, after a decision): the cards of the open columns replaced,
 * the closed columns' loaded cards kept (one just decided among them, at the top of its column), and the counts.
 */
export async function loadOpen<T extends Card>(get: Get, cards: T[]): Promise<{ cards: T[]; counts: Record<string, number> }> {
	const a = await get<Answer<T>>(openPath());
	const fresh = new Set(a.intents.map((i) => i.id));
	return { cards: [...a.intents, ...cards.filter((i) => isClosed(i.stage) && !fresh.has(i.id))], counts: a.counts ?? {} };
}

/**
 * A closed column's next page (its first where `from` is null), added under the cards it holds of that column; one
 * already held (decided while the board was open) is not added twice. With `fresh`, its first page again, those not
 * yet held put on top (decided elsewhere since).
 */
export async function loadPage<T extends Card>(get: Get, cards: T[], stage: ClosedStage, from: Paged | null, fresh = false): Promise<{ cards: T[]; paged: Paged }> {
	const a = await get<Answer<T>>(pagePath(stage, fresh ? null : from?.next));
	const held = new Set(cards.map((i) => i.id));
	const added = a.intents.filter((i) => !held.has(i.id));
	if (fresh) {
		const firstOpen = cards.findIndex((i) => i.stage === stage);
		const at = firstOpen < 0 ? cards.length : firstOpen;
		return { cards: [...cards.slice(0, at), ...added, ...cards.slice(at)], paged: from?.loaded ? from : { loaded: true, next: a.next } };
	}
	return { cards: [...cards, ...added], paged: { loaded: true, next: a.next } };
}

/** a column's cards: the intents at its stage as play lists them; Ship is a queue, the one shipping, then the rest in
 *  the order accepted, first in line on top */
export const columnOf = <T extends Card & { decided_at?: string | null; created: string }>(cards: T[], stage: string): T[] => {
	const at = cards.filter((i) => i.stage === stage);
	return stage === 'ship' ? [...at].sort((a, b) => Date.parse(a.decided_at ?? a.created) - Date.parse(b.decided_at ?? b.created)) : at;
};

/** the sub-states a column's cards are grouped under (play/api/src/substate.ts), in this order */
const SUBS = [['failed', 'Failed'], ['waiting', 'Waiting'], ['working', 'Working'], ['idle', 'Idle']] as const;
/** a column's cards under their dividers, Failed, Waiting, Working, Idle, then those with none; empty ones left out */
export const bySub = <T extends { sub?: { state: string } | null }>(cards: T[]) =>
	[...SUBS.map(([k, name]) => ({ k, name, cards: cards.filter((i) => i.sub?.state === k) })), { k: '', name: '', cards: cards.filter((i) => !i.sub) }].filter((g) => g.cards.length);

/** what an empty column says */
export const EMPTY: Record<string, string> = {
	idea: 'None. Agents add intents over MCP.',
	specify: 'None. Agents specify an intent over MCP.',
	build: 'None. An approved spec is built here.',
	ship: 'None. Accepted code is shipped here.'
};
