// Sandbox 6's numbers are re-audited (intent 67f0404a, c7, c8, c9), from the audit config as proposed in its layout
// document (play/api/import/sandboxes/sandbox-6/audit.json): beds from the home blocks and sourced floor a resident; every input
// sourced (an artifact play keeps), decided (Samuel's, dated) or an estimate with its reason; and what it costs split
// into the village's part, checked against what villagers and investors raise, and each coop's own.
import { describe, expect, test } from 'bun:test';
import village from '../../../../../api/import/sandboxes/sandbox-6/village.json';
import audit from '../../../../../api/import/sandboxes/sandbox-6/audit.json';
import type { Village } from './geometry';
import { auditOf, standing, type Audit } from './audit';

const V = village as unknown as Village;
const A = audit as unknown as Audit;
const R = auditOf(V, A);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('beds', () => {
	test('each living hex holds about the 290 beds Samuel planned, worked out from its home domes', () => {
		console.log(`beds: a resident ${R.gfaPerson?.toFixed(1)} m² gross; ${Object.values(R.homes).map((h) => `${h.kind} ${h.beds}`).join(', ')}; a hex ${R.bedsHex}, the village ${R.bedsVillage}`);
		expect(R.bedsHex).not.toBeNull();
		expect(R.bedsPlanned).toBe(290);
		expect(Math.abs(R.bedsHex! - 290) / 290).toBeLessThanOrEqual(0.1);
		expect(R.bedsVillage).toBe(R.bedsHex! * 6);
	});
});

describe('sourced', () => {
	test('every input has its value and unit, and a source play keeps, a decision or an estimate with its reason', () => {
		for (const [id, i] of Object.entries(A.inputs)) {
			expect(`${id}: ${standing(i)}`).not.toMatch(/: (pending|unknown)$/);
			expect(i.unit.length).toBeGreaterThan(0);
			if (i.source) expect(i.source).toMatch(UUID);
			if (i.estimate) expect(i.estimate.length).toBeGreaterThan(20);
			if (i.decided) expect(i.decided).toMatch(/^Samuel \d{4}-\d{2}-\d{2}/);
		}
	});
	test('no number is the old page’s unless the input that gives it is sourced', () => {
		const derived: [string, number | null, string[]][] = [
			['dome40Beds', R.homes.dome40.beds, ['livingPerson', 'grossFactor']],
			['dome80Beds', R.homes.dome80.beds, ['livingPerson', 'grossFactor']],
			['hexBeds', R.bedsHex, ['livingPerson', 'grossFactor']],
			['villageBeds', R.bedsVillage, ['livingPerson', 'grossFactor']],
			['towerApartments', R.tower.rooms, ['hotelRoom']],
			['villageEuros', R.cost.village, A.costs.map((c) => c.input)]
		];
		for (const [key, value, inputs] of derived) {
			if (value === null || value !== A.old[key]) continue;
			for (const i of inputs) expect(`${key} from ${i}: ${standing(A.inputs[i])}`).toBe(`${key} from ${i}: sourced`);
		}
	});
});

describe('cost', () => {
	test('the village’s part by hex and by kind, against what villagers and investors raise; each coop’s own beside it', () => {
		expect(A.split.village.length).toBeGreaterThan(0);
		expect(A.split.coop.length).toBeGreaterThan(0);
		expect(A.inputs.budget.value).toBe(200_000_000);
		expect(A.costs.length).toBeGreaterThan(0);
		for (const c of A.costs) {
			expect(['village', 'coop']).toContain(c.payer);
			if (c.payer === 'coop') expect(c.coop).toBeTruthy();
			expect(standing(A.inputs[c.input])).not.toBe('pending');
		}
		// what the defaults say: homes and lines the village's; the tower's fit-out the tenants'; each energy plant its coop's
		const payerOf = (re: RegExp) => A.costs.filter((c) => re.test(c.label)).map((c) => c.payer);
		for (const p of payerOf(/home|heat network|power line|microgrid/i)) expect(p).toBe('village');
		for (const p of payerOf(/fit-out|solar field|biogas|geothermal/i)) expect(p).toBe('coop');
		for (const kind of ['dome40', 'dome80', 'dome120', 'tower180']) expect(A.costs.some((c) => c.payer === 'village' && c.kind === kind)).toBe(true);
		expect(R.cost.village).not.toBeNull();
		expect(R.cost.coop).not.toBeNull();
		expect(R.cost.headroom).toBe(R.cost.budget! - R.cost.village!);
		expect(JSON.stringify(A)).not.toMatch(/500[ ,.]?000[ ,.]?000|€500M/);
	});
});
