/*
 * The worlds' budget (intent 1f6a98dd): ./budgets.json as Samuel's aims and tonight's counts set it, and the comparer
 * ../budget.ts holds a world by (./budget.ts).
 */
import { describe, expect, test } from 'bun:test';
import { ceilingFor, compare, holds, readBudgets, type Budgets, type Counts } from './budget';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH = /^[0-9a-f]{64}$/;

/**
 * the counts the ceilings were last set from: every pass's triangles and draws, calls at rest and walking. Sandbox 3 on
 * main eadbf2f7, 2026-11-10 (intent-work/1f6a98dd-audit); Sandbox 1 and 5 once their shadows were cast by stand-ins,
 * 2026-11-11 (intent 7313fb26; Sandbox 1's draws the most of several counts: they vary by some 8 % run to run). A
 * change that lowers a ceiling sets its count here with it.
 */
const TONIGHT: Record<string, { id: string; simplified: number; views: Record<string, Record<string, number>> }> = {
	'sandbox-1': {
		id: 'ec08b07d-6ec0-8f65-92b2-3efe7d91df5d',
		simplified: 16347750,
		views: {
			near: { tris: 5569104, draws: 1631, calls: 6626, walkCalls: 8202 },
			mid: { tris: 8966276, draws: 1609, calls: 7664, walkCalls: 9144 },
			far: { tris: 1949477, draws: 872, calls: 4591, walkCalls: 5464 },
		},
	},
	'sandbox-5': {
		id: 'ac154784-c938-47ee-ac74-d61fc91583b3',
		simplified: 9811200,
		views: {
			near: { tris: 6794825, draws: 1081, calls: 5442, walkCalls: 6667 },
			mid: { tris: 7245251, draws: 990, calls: 5679, walkCalls: 6671 },
			far: { tris: 2621936, draws: 708, calls: 3806, walkCalls: 4461 },
		},
	},
	'sandbox-3': { id: 'a2af9568-53c6-8917-a816-da88d3ff66ff', simplified: 274410, views: { open: { tris: 336610, draws: 297, calls: 1508 } } },
};

const b = readBudgets();
const countsOf = (world: string, scale = 1): Counts => ({
	views: Object.fromEntries(Object.entries(TONIGHT[world].views).map(([v, c]) => [v, Object.fromEntries(Object.entries(c).map(([k, x]) => [k, Math.round(x * scale)]))])),
	simplified: Math.round(TONIGHT[world].simplified * scale),
});

describe('budgets.json', () => {
	test("holds Samuel's aims", () => {
		expect(b.aims).toEqual({ shown_s: 10, again_s: 3, memory_mb: 2500, frame_ms: 16.7, tris: 1500000, draws: 600, calls: 2500, simplified: 0 });
		for (const what of Object.keys(b.aims)) expect(b.held[what]).toBeString();
	});

	test("holds an asset's own ceiling, its exceptions each by an asset's UUID and a version's hash", () => {
		expect(b.asset.finest).toBe(300000);
		expect(b.asset.levels).toBe('declared');
		expect(b.asset.exceptions.length).toBeGreaterThan(0);
		for (const e of b.asset.exceptions) {
			expect(e.asset).toMatch(UUID);
			expect(e.version).toMatch(HASH);
			expect(e.triangles).toBeGreaterThan(b.asset.finest);
		}
	});

	test('holds Sandbox 1, 3 and 5 by their UUIDs, each ceiling from tonight\'s count up to 10 % over it', () => {
		for (const [world, t] of Object.entries(TONIGHT)) {
			const w = b.worlds[t.id];
			expect(w?.world).toBe(world);
			expect(Object.keys(w.views).sort()).toEqual(Object.keys(t.views).sort());
			for (const [view, counts] of Object.entries(t.views))
				for (const [what, now] of Object.entries(counts)) {
					const ceiling = (w.views[view] as Record<string, number>)[what];
					expect(ceiling).toBeGreaterThanOrEqual(now);
					expect(ceiling).toBeLessThanOrEqual(now * 1.1);
				}
			expect(w.simplified).toBeGreaterThanOrEqual(t.simplified);
			expect(w.simplified).toBeLessThanOrEqual(t.simplified * 1.1);
		}
	});
});

describe('the comparer', () => {
	test("tonight's counts are within every world's ceilings", () => {
		for (const world of Object.keys(TONIGHT)) expect(holds(compare(b, world, countsOf(world)))).toBe(true);
	});

	test('a count over its ceiling fails, naming the world, the view and the number', () => {
		const counts = countsOf('sandbox-1');
		counts.views.mid.draws = 5000;
		const rows = compare(b, 'sandbox-1', counts);
		expect(holds(rows)).toBe(false);
		const over = rows.filter((r) => r.verdict === 'over');
		expect(over).toHaveLength(1);
		expect(over[0].why).toContain('Sandbox 1 mid: draws 5000 is over its ceiling');
	});

	test('a view not counted fails', () => {
		const counts = countsOf('sandbox-5');
		delete counts.views.far;
		expect(holds(compare(b, 'sandbox-5', counts))).toBe(false);
	});

	test('seconds, memory and a frame\'s milliseconds are reported, not held yet', () => {
		const rows = compare(b, 'sandbox-3', countsOf('sandbox-3'));
		for (const what of ['shown_s', 'again_s', 'memory_mb', 'frame_ms']) {
			const r = rows.find((x) => x.what === what)!;
			expect(r.verdict).toBe('not held');
			expect(r.aim).toBe(b.aims[what]);
			expect(r.why).toContain('not held yet');
		}
	});

	test('held to the aim as well, a world already inside it passes, and one over it fails', () => {
		expect(holds(compare(b, 'sandbox-3', countsOf('sandbox-3'), ['tris', 'draws', 'calls']))).toBe(true);
		expect(holds(compare(b, 'sandbox-1', countsOf('sandbox-1'), ['tris']))).toBe(false);
	});

	test('a world the budget does not hold is refused', () => {
		expect(() => compare(b, 'sandbox-9', countsOf('sandbox-3'))).toThrow(/no world sandbox-9/);
	});

	test('a ceiling only moves down', () => {
		const lighter = countsOf('sandbox-5', 0.8);
		const rows = compare(b, 'sandbox-5', lighter);
		// within its ceilings it is no failure by itself; strict, it is, until the ceilings are lowered
		expect(holds(rows)).toBe(true);
		expect(holds(rows, true)).toBe(false);
		const r = rows.find((x) => x.what === 'tris' && x.view === 'near')!;
		expect(r.verdict).toBe('lower');
		expect(r.why).toContain(`lower it to ${ceilingFor(r.now!)}`);
		const lowered: Budgets = JSON.parse(JSON.stringify(b));
		for (const row of rows) if (row.verdict === 'lower') {
			const w = lowered.worlds[TONIGHT['sandbox-5'].id];
			if (row.view) (w.views[row.view] as Record<string, number>)[row.what] = ceilingFor(row.now!);
			else w.simplified = ceilingFor(row.now!);
		}
		expect(holds(compare(lowered, 'sandbox-5', lighter), true)).toBe(true);
	});
});
