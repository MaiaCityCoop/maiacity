/*
 * A WORLD'S BUDGET (play/SPEC.md §4.16, intent 1f6a98dd): ./budgets.json read, and a world's counts held to it. Each
 * world is named there by its sandbox's UUID; `world` is only how the census calls it. A number has an aim (Samuel's,
 * absolute) and, where avenBOX can count it, a ceiling per view (today's count, rounded up): over its ceiling a world
 * fails; well under it (`LOWER`) the ceiling is to be lowered, so a budget only ever moves down. Seconds, memory and
 * milliseconds have an aim and no ceiling yet: they are reported as not held. ../budget.ts runs the census and asks.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** what a view is counted by: every pass's triangles and draws (the census), its WebGPU calls at rest and walking (--frame) */
export const COUNTED = ['tris', 'draws', 'calls', 'walkCalls'] as const;
export type Counted = (typeof COUNTED)[number];
/** a count this far under its ceiling asks for the ceiling to be lowered (run to run a count moves by under 4 %) */
export const LOWER = 0.15;

export type Budgets = {
	aims: Record<string, number>;
	held: Record<string, string>;
	units: Record<string, string>;
	asset: { finest: number; levels: string; held: string; exceptions: { asset: string; version: string; shown: string; triangles: number }[] };
	worlds: Record<string, { shown: string; world: string; simplified: number; views: Record<string, Partial<Record<Counted, number>>> }>;
};
/** one world's counts: per view, and what its load handed the simplifier */
export type Counts = { views: Record<string, Partial<Record<Counted, number>>>; simplified: number };
export type Row = { what: string; view: string | null; aim: number | null; ceiling: number | null; now: number | null; verdict: 'within' | 'over' | 'lower' | 'not held'; why?: string };

export const BUDGETS = join(import.meta.dir, 'budgets.json');
export const readBudgets = (file = BUDGETS): Budgets => JSON.parse(readFileSync(file, 'utf8'));

/** the world the census calls `world`, by its entry (its sandbox's UUID); refused if the budget holds none */
export function worldOf(b: Budgets, world: string) {
	const hit = Object.entries(b.worlds).find(([, w]) => w.world === world);
	if (!hit) throw new Error(`budget: no world ${world} in budgets.json (${Object.values(b.worlds).map((w) => w.world).join(', ')})`);
	return { id: hit[0], ...hit[1] };
}

const verdictOf = (now: number, ceiling: number): Row['verdict'] => (now > ceiling ? 'over' : now <= ceiling * (1 - LOWER) ? 'lower' : 'within');

/**
 * A world's counts against its budget: a row per number and view. `aim` names numbers held to their aim as well as their
 * ceiling (a world already inside it, Sandbox 3). Every view the budget names must have been counted, and every
 * number it names in it.
 */
export function compare(b: Budgets, world: string, counts: Counts, aim: string[] = []): Row[] {
	const w = worldOf(b, world);
	const rows: Row[] = [];
	for (const [view, ceilings] of Object.entries(w.views)) {
		for (const what of COUNTED) {
			const ceiling = ceilings[what];
			if (ceiling === undefined) continue;
			const now = counts.views[view]?.[what];
			if (now === undefined) {
				rows.push({ what, view, aim: b.aims[what === 'walkCalls' ? 'calls' : what] ?? null, ceiling, now: null, verdict: 'over', why: `${w.shown} ${view}: ${what} was not counted` });
				continue;
			}
			const target = b.aims[what === 'walkCalls' ? 'calls' : what] ?? null;
			let verdict = verdictOf(now, ceiling);
			let why: string | undefined;
			if (verdict === 'over') why = `${w.shown} ${view}: ${what} ${now} is over its ceiling ${ceiling}`;
			if (verdict === 'lower') why = `${w.shown} ${view}: ${what} ${now} is ${Math.round((1 - now / ceiling) * 100)} % under its ceiling ${ceiling}: lower it to ${ceilingFor(now)}`;
			if (aim.includes(what) && target !== null && now > target) (verdict = 'over'), (why = `${w.shown} ${view}: ${what} ${now} is over the aim ${target}`);
			rows.push({ what, view, aim: target, ceiling, now, verdict, why });
		}
	}
	const s = verdictOf(counts.simplified, w.simplified);
	rows.push({
		what: 'simplified', view: null, aim: b.aims.simplified ?? null, ceiling: w.simplified, now: counts.simplified, verdict: s,
		why: s === 'over' ? `${w.shown}: ${counts.simplified} triangles handed to the simplifier, over its ceiling ${w.simplified}` : s === 'lower' ? `${w.shown}: simplified ${counts.simplified} is well under its ceiling ${w.simplified}: lower it to ${ceilingFor(counts.simplified)}` : undefined,
	});
	for (const what of Object.keys(b.aims)) if (!(COUNTED as readonly string[]).includes(what) && what !== 'simplified') rows.push({ what, view: null, aim: b.aims[what], ceiling: null, now: null, verdict: 'not held', why: b.held[what] });
	return rows;
}

/** a ceiling for a count: 5 % over it, rounded up to three figures */
export function ceilingFor(n: number) {
	if (n <= 0) return 0;
	const x = n * 1.05, step = 10 ** Math.max(0, Math.floor(Math.log10(x)) - 2);
	return Math.ceil(x / step) * step;
}

/** whether the rows hold: none over; with `strict`, none asking for its ceiling to be lowered either */
export const holds = (rows: Row[], strict = false) => rows.every((r) => r.verdict !== 'over' && (!strict || r.verdict !== 'lower'));
