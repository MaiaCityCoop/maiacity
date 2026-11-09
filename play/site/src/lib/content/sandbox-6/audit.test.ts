// Sandbox 6's numbers are re-audited (intent 67f0404a, c7, c8, c9), from the audit config its layout document's v1
// holds (play/api/import/sandboxes/sandbox-6/audit.json): beds from the home blocks and the sourced floor a resident
// takes; every input sourced (an artifact play keeps), decided (Samuel's, dated) or an estimate with its reason, every
// cost row with its source and basis; and what it costs, self-built with the contractor price and the labour beside
// it, the village's part against what villagers and investors raise, each coop's own apart.
import { describe, expect, test } from 'bun:test';
import village from '../../../../../api/import/sandboxes/sandbox-6/village.json';
import audit from '../../../../../api/import/sandboxes/sandbox-6/audit.json';
import type { Village } from './geometry';
import { auditOf, standing, type Audit } from './audit';

const V = village as unknown as Village;
const A = audit as unknown as Audit;
const R = auditOf(V, A);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** the inputs only coops' own lines count in: one not yet known leaves that coop's line unaudited, shown so */
const coopOnly = new Set(A.costs.filter((c) => c.payer === 'coop' && c.qty.input).map((c) => c.qty.input!));
const M = (x: number) => `€${(x / 1e6).toFixed(1)}M`;

describe('beds', () => {
	test('each living hex holds 232 beds, the village 1,392, from its home domes and the sourced floor a resident takes', () => {
		expect(A.inputs.livingPerson).toMatchObject({ value: 49.2, source: '89a1fd17-5994-4f6a-bd50-0903c1fcaccd' });
		expect(A.inputs.grossFactor).toMatchObject({ value: 1.55, source: '33062cd9-f54c-45e6-ae3d-2d1eac62e540' });
		expect(R.homes.dome40.beds).toBe(8);
		expect(R.homes.dome80.beds).toBe(32);
		expect(R.bedsHex).toBe(232);
		expect(R.bedsVillage).toBe(1392);
		console.log(`beds: a resident ${R.gfaPerson!.toFixed(1)} m² gross; Dome40 ${R.homes.dome40.beds}, Dome80 ${R.homes.dome80.beds}; a living hex ${R.bedsHex}, the village ${R.bedsVillage}`);
	});
});

describe('sourced', () => {
	test('every input has its value and unit, and a source play keeps, a dated decision of Samuel’s or an estimate with its reason', () => {
		for (const [id, i] of Object.entries(A.inputs)) {
			expect(i.unit.length).toBeGreaterThan(0);
			const s = standing(i);
			if (s === 'pending') {
				// only a coop's own size may wait: its line is shown as unaudited, never the village's part
				expect(`${id}: ${coopOnly.has(id)}`).toBe(`${id}: true`);
				continue;
			}
			expect(`${id}: ${s}`).not.toMatch(/: unknown$/);
			if (i.source) expect(i.source).toMatch(UUID);
			if (i.estimate) expect(i.estimate.length).toBeGreaterThan(20);
			if (i.decided) expect(i.decided).toMatch(/^Samuel \d{4}-\d{2}-\d{2}/);
		}
	});
	test('every cost row names its source and basis, the research’s estimates and its limit said', () => {
		expect(A.research?.note).toMatch(/search-engine extracts/);
		for (const c of A.costs) {
			expect(c.source.length).toBeGreaterThan(3);
			expect(c.unit.length).toBeGreaterThan(0);
			for (const r of [c.self, c.contractor]) expect(r[0] <= r[1] && r[1] <= r[2]).toBe(true);
			expect(c.self[1]).toBeLessThanOrEqual(c.contractor[1]);
		}
		expect(A.costs.some((c) => c.estimate)).toBe(true);
	});
	test('no number is the old page’s unless the input that gives it is sourced', () => {
		const derived: [string, number | null, string[]][] = [
			['gfaPerson', R.gfaPerson, ['livingPerson', 'grossFactor']],
			['dome40Beds', R.homes.dome40.beds, ['livingPerson', 'grossFactor']],
			['dome80Beds', R.homes.dome80.beds, ['livingPerson', 'grossFactor']],
			['hexBeds', R.bedsHex, ['livingPerson', 'grossFactor']],
			['villageBeds', R.bedsVillage, ['livingPerson', 'grossFactor']],
			['villageEuros', R.cost.village ? Math.round(R.cost.village.self[1]) : null, []]
		];
		for (const [key, value, inputs] of derived) {
			if (value === null || value !== A.old[key]) continue;
			expect(inputs.length).toBeGreaterThan(0);
			for (const i of inputs) expect(`${key} from ${i}: ${standing(A.inputs[i])}`).toBe(`${key} from ${i}: sourced`);
		}
	});
});

describe('cost', () => {
	test('self-built with the contractor price and the labour beside it; the village’s part by hex and by kind against what is raised; each coop’s own apart', () => {
		for (const c of A.costs) {
			expect(['village', 'coop']).toContain(c.payer);
			if (c.payer === 'coop') expect(c.coop).toBeTruthy();
		}
		// the line between the two, the same list the levelling intent 1df683fd uses
		const payer = (id: string) => A.costs.find((c) => c.id === id)!.payer;
		for (const id of ['homes', 'heat', 'heat-connect', 'mv-cable', 'substations', 'water', 'wastewater', 'shell-40', 'shell-80', 'shell-120', 'tower', 'land', 'roads']) expect(`${id}: ${payer(id)}`).toBe(`${id}: village`);
		for (const id of ['pv', 'battery', 'biogas', 'geothermal']) expect(`${id}: ${payer(id)}`).toBe(`${id}: coop`);
		expect(A.split.coop.join(' ')).toMatch(/fit-out/);
		expect(A.split.village.join(' ')).toMatch(/panels built into the glazing/);
		// the tower at the tall-building rate, the same self-built and by a contractor
		const tower = A.costs.find((c) => c.qty.towerGfa)!;
		expect(tower.self).toEqual(tower.contractor);
		// every line of the village's part is audited, and so its total, by hex and by kind
		const v = R.cost.village!;
		expect(v).not.toBeNull();
		for (const i of [0, 1, 2]) expect(v.labour[i]).toBeCloseTo(v.contractor[i] - v.self[i], 0);
		const byHex = R.cost.byHex!, byGroup = R.cost.byGroup!;
		const sumOf = (o: Record<string, { self: number[] } | null>) => Object.values(o).reduce((x, t) => x + t!.self[1], 0);
		expect(sumOf(byHex)).toBeCloseTo(v.self[1], -3);
		expect(sumOf(byGroup)).toBeCloseTo(v.self[1], -3);
		for (const g of ['Dome40', 'Dome80', 'Dome120', 'the tower', 'works', 'roads and lines', 'land']) expect(Object.keys(byGroup)).toContain(g);
		expect(Object.keys(byHex).filter((h) => h !== 'village')).toHaveLength(7);
		// against what villagers and investors raise, the gap shown
		expect(R.cost.budget).toBe(200_000_000);
		expect(R.cost.headroom).toBeCloseTo(R.cost.budget! - v.self[1], 0);
		// the coops apart, never in the village's part
		expect(R.cost.coops.map((c) => c.coop).sort()).toEqual(['biogas coop', 'geothermal coop', 'solar coop']);
		// the smaller tower's saving against the old 180 m shape
		expect(R.cost.towerSaving![1]).toBeGreaterThan(0);
		expect(JSON.stringify(A)).not.toMatch(/500[ ,.]?000[ ,.]?000|€500M/);
		console.log(`cost: the village's part self-built ${v.self.map(M).join(' / ')}, by a contractor ${v.contractor.map(M).join(' / ')}, labour ${v.labour.map(M).join(' / ')}; against ${M(R.cost.budget!)}: ${R.cost.headroom! < 0 ? 'a gap of' : 'headroom'} ${M(Math.abs(R.cost.headroom!))}`);
		for (const [g, t] of Object.entries(byGroup)) console.log(`  ${g}: self-built ${M(t!.self[1])}, contractor ${M(t!.contractor[1])}`);
	});
});
