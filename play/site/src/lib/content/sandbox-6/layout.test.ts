// Sandbox 6's village keeps the old layout (intent 67f0404a, c5 and c6), read from the village config as proposed in
// its layout document (play/api/import/sandboxes/sandbox-6/village.json): seven hexes of one size, the living hexes laid out as
// Samuel's layout B, the centre hex with the tower, its ring road, its eight works and the village centre, no homes.
import { describe, expect, test } from 'vitest';
import village from '../../../../../api/import/sandboxes/sandbox-6/village.json';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import audit from '../../../../../api/import/sandboxes/sandbox-6/audit.json';
import { auditOf, type Audit } from './audit';
import { capOf, edgeDistance, hexOf, type Village } from './geometry';
import { landOf } from './land';

const V = village as unknown as Village;
const H = hexOf(V.hex.flats);
const living = V.plans.living, tower = V.plans.tower;
const of = (plan: typeof living, kind: string) => plan.sites.filter((s) => s.kind === kind);

describe('the village', () => {
	test('seven hexes of one size: 665.6 m across the flats, 768.6 m corner to corner, 38.4 ha', () => {
		expect(V.hexes).toHaveLength(7);
		expect(H.w).toBeCloseTo(665.6, 1);
		expect(2 * H.s).toBeCloseTo(768.6, 0);
		expect(H.area / 1e4).toBeCloseTo(38.4, 1);
		// one plan for the centre and one for all six living hexes: the centre is the same hex
		expect(V.hexes.filter((h) => h.plan === 'tower').map((h) => [h.x, h.z])).toEqual([[0, 0]]);
		const around = V.hexes.filter((h) => h.plan === 'living');
		expect(around).toHaveLength(6);
		for (const h of around) expect(Math.hypot(h.x, h.z)).toBeCloseTo(V.hex.flats, 0);
	});

	test('the living hex is layout B: the green and its ring road in the north half, the tall domes north, the Dome40s south', () => {
		expect(living.ring.r).toBe(64);
		expect(living.ring.z).toBeLessThan(0);
		const d120 = of(living, 'dome120'), d80 = of(living, 'dome80'), d40 = of(living, 'dome40');
		expect([d120.length, d80.length, d40.length]).toEqual([3, 5, 9]);
		for (const s of d120) expect(s.z).toBeLessThan(living.ring.z);
		for (const s of d40) expect(s.z).toBeGreaterThan(0);
		// each Dome40 south of every Dome120, so nothing tall stands in a home's winter sun
		expect(Math.min(...d40.map((s) => s.z))).toBeGreaterThan(Math.max(...d120.map((s) => s.z)));
	});

	test('the tower hex: Tower180 at its middle, its ring road, eight works round it', () => {
		const t = of(tower, 'tower180');
		expect(t).toHaveLength(1);
		expect([t[0].x, t[0].z]).toEqual([0, 0]);
		expect(tower.ring.r).toBeGreaterThan(V.kinds.tower180.D / 2);
		expect(tower.sites.filter((s) => s.use === 'works')).toHaveLength(8);
	});

	test('every dome stands inside its hex, none on another or on a road ring', () => {
		for (const plan of [living, tower]) {
			const sites = plan.sites;
			for (const s of sites) expect(edgeDistance(H.w, s.x, s.z)).toBeGreaterThan(V.kinds[s.kind].D / 2);
			for (let i = 0; i < sites.length; i++)
				for (let j = i + 1; j < sites.length; j++) {
					const a = sites[i], b = sites[j];
					expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan((V.kinds[a.kind].D + V.kinds[b.kind].D) / 2);
				}
			for (const s of sites) {
				if (s.kind === 'tower180') continue;
				const d = Math.hypot(s.x - plan.ring.x, s.z - plan.ring.z);
				expect(Math.abs(d - plan.ring.r)).toBeGreaterThan(V.kinds[s.kind].D / 2);
			}
		}
	});

	test('the 2 m raster counts every hex to its area within 1 %', () => {
		for (const key of ['living', 'tower']) {
			const land = landOf(V, key);
			expect(Math.abs(land.area - H.area) / H.area).toBeLessThan(0.01);
			// under the glass, the cells add up to the domes' floors within 3 %
			const sites = V.plans[key].sites.filter((s) => s.kind !== 'tower180');
			const floors = sites.reduce((a, s) => a + capOf(V.kinds[s.kind].D).floor, 0);
			const glass = land.m2.home + land.m2.garden + land.m2.pond + land.m2.food + land.m2.utilities + land.m2.works + land.m2.civic;
			expect(Math.abs(glass - floors) / floors).toBeLessThan(0.03);
		}
	});
});

describe('centre hex', () => {
	const A = auditOf(V, audit as unknown as Audit);
	test('it holds no homes', () => {
		expect(tower.sites.filter((s) => s.use === 'home')).toEqual([]);
		expect(landOf(A.sized, 'tower').m2.home).toBe(0);
	});
	test('the village centre’s school, clinic and town hall stand there, outside the tower', () => {
		const civic = tower.sites.filter((s) => s.use === 'civic').map((s) => s.name.toLowerCase());
		for (const hall of ['town hall', 'school', 'clinic']) expect(civic.some((n) => n.includes(hall))).toBe(true);
		for (const s of tower.sites.filter((s) => s.use === 'civic')) expect(Math.hypot(s.x, s.z)).toBeGreaterThan(A.sized.kinds.tower180.D / 2 + V.kinds[s.kind].D / 2);
	});
	test('the tower is sized from its programme: mostly communal, one floor of co-working, tens of guest rooms, no flats', () => {
		const T = A.tower;
		expect(T.need.length).toBeGreaterThan(0);
		for (const u of T.need) expect(['communal', 'commercial', 'tourist', 'factory']).toContain(u.use);
		for (const u of T.need) expect(u.label.toLowerCase()).not.toMatch(/apartment|flat|home|resident/);
		expect(T.gfa).not.toBeNull();
		const by = (use: string) => T.need.filter((u) => u.use === use).reduce((x, u) => x + u.m2!, 0);
		expect(by('communal')).toBeGreaterThan(Math.max(by('commercial'), by('tourist'), by('factory')));
		const storey = Math.max(...T.storeys!.map((s) => s.m2));
		expect(T.need.find((u) => u.id === 'cowork')!.m2!).toBeLessThanOrEqual(storey);
		expect(T.need.find((u) => u.id === 'guests')!.rooms!).toBeLessThanOrEqual(100);
		const held = T.storeys!.reduce((x, s) => x + s.m2, 0);
		expect(Math.abs(held - T.gfa!) / T.gfa!).toBeLessThan(0.15);
		expect(T.gfa!).toBeLessThanOrEqual(327_000 / 5);
		console.log(`the tower: ${Math.round(T.gfa!)} m² gross, ${Math.round(T.shape!.D)} m at its foot, ${Math.round(T.shape!.H)} m high, ${T.storeys!.length} storeys (the old shape: ${Math.round(T.full)} m²)`);
	});
	test('the page never calls it Tower180', () => {
		const shown = JSON.stringify(V.plans.tower.sites.map((s) => s.name)) + JSON.stringify(V.plans.tower.programme);
		expect(shown).not.toContain('Tower180');
		const dir = join(dirname(fileURLToPath(import.meta.url)));
		for (const f of readdirSync(dir).filter((f) => !f.endsWith('.test.ts'))) expect(`${f}: ${readFileSync(join(dir, f), 'utf8').includes('Tower180')}`).toBe(`${f}: false`);
	});
});
