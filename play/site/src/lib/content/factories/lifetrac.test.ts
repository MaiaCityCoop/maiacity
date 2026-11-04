// The LifeTrac line held to the LifeTrac and to its own numbers: its first version as play's factory document
// (play/api/import/factories/lifetrac-line, play/api/src/factories.ts), drawn as this folder's lineOf draws it. Run:
// bunx vitest run src/lib/content/factories
import { describe, expect, test } from 'vitest';
import { lifetracLine, SPEC as FIRST } from '../../../../../api/import/factories/lifetrac-line/index.js';
import { lineOf } from './index.js';
import { forecast, plan } from './des.js';

const doc = lifetracLine();
const L = lineOf(doc);
const SPEC = L.spec;
const PARTS = L.parts as any[];
const STOCK = L.stock;
const EXTRA = doc.handling as Record<string, any[]>;
const contentOf = L.contentOf;
const totals = () => L.totals;
const stationsNamed = () => [...new Set([...PARTS.flatMap((p) => p.ops.map((o: any) => o.at)), ...Object.keys(EXTRA)])];

/** the catalog machines/lifetrac@1 (variant lifetrac-v25) carries on its card: every part's id and how many pieces it counts */
const CATALOG: [string, number][] = [
	['outer-left', 1], ['outer-right', 1], ['inner-left', 1], ['inner-right', 1], ['floor', 1], ['floor-angles', 30],
	['back-wall', 1], ['back-angles', 6], ['front-wall', 3], ['motor-plate-left', 1], ['motor-plate-right', 1],
	['cross-tubes', 2], ['cube-cradle', 2], ['bolts', 324], ['uwu-fl-motor', 1], ['uwu-fl-shaft', 1],
	['uwu-fl-coupling', 1], ['uwu-fl-bearings', 2], ['uwu-fl-hub', 1], ['uwu-fl-wheel', 1], ['uwu-fl-hoses', 2],
	['uwu-fr-motor', 1], ['uwu-fr-shaft', 1], ['uwu-fr-coupling', 1], ['uwu-fr-bearings', 2], ['uwu-fr-hub', 1],
	['uwu-fr-wheel', 1], ['uwu-fr-hoses', 2], ['uwu-rl-motor', 1], ['uwu-rl-shaft', 1], ['uwu-rl-coupling', 1],
	['uwu-rl-bearings', 2], ['uwu-rl-hub', 1], ['uwu-rl-wheel', 1], ['uwu-rl-hoses', 2], ['uwu-rr-motor', 1],
	['uwu-rr-shaft', 1], ['uwu-rr-coupling', 1], ['uwu-rr-bearings', 2], ['uwu-rr-hub', 1], ['uwu-rr-wheel', 1],
	['uwu-rr-hoses', 2], ['pc-skids', 2], ['pc-cage', 8], ['pc-quick-attach', 1], ['pc-lift-eyes', 2],
	['pc-engine-plate', 1], ['pc-crankcase', 1], ['pc-cyl-left', 1], ['pc-cyl-right', 1], ['pc-blower', 1],
	['pc-flywheel', 1], ['pc-air-cleaner', 1], ['pc-muffler', 1], ['pc-starter', 1], ['pc-coupling', 1],
	['pc-pump-mount', 1], ['pc-pump', 1], ['pc-reservoir', 1], ['pc-strainer', 1], ['pc-relief', 1], ['pc-gauge', 1],
	['pc-cooler', 1], ['pc-cooler-fan', 1], ['pc-filter', 1], ['pc-breather', 1], ['pc-couplers', 2],
	['pc-fuel-tank', 1], ['pc-battery', 1], ['pc-panel', 1], ['pressure-line', 1], ['efc', 1], ['manifold', 1],
	['valve-left', 1], ['coil-d1', 1], ['coil-d2', 1], ['valve-arms', 1], ['coil-d5', 1], ['coil-d6', 1],
	['valve-bucket', 1], ['coil-d7', 1], ['coil-d8', 1], ['valve-right', 1], ['coil-d3', 1], ['coil-d4', 1],
	['transducers', 2], ['return-line', 1], ['lift-hoses-left', 2], ['lift-hoses-right', 2], ['bucket-hoses', 4],
	['arm-plates-left', 2], ['arm-tube-left', 1], ['arm-pivot-left', 1], ['lift-bracket-left', 1],
	['arm-plates-right', 2], ['arm-tube-right', 1], ['arm-pivot-right', 1], ['lift-bracket-right', 1], ['cross-beam', 1],
	['cylinder-lugs', 2], ['lift-barrel-left', 1], ['lift-rod-left', 1], ['bucket-barrel-left', 1],
	['bucket-rod-left', 1], ['lift-barrel-right', 1], ['lift-rod-right', 1], ['bucket-barrel-right', 1],
	['bucket-rod-right', 1], ['bucket-shell', 1], ['cutting-edge', 1], ['bucket-pivots', 2], ['bucket-cyl-lugs', 2],
	['deck', 1], ['deck-frame', 4], ['deck-brackets', 1], ['node-box', 1], ['portenta-x8', 1], ['opta', 1],
	['efc-driver', 1], ['safety-relay', 1], ['fuses', 1], ['status-leds', 1], ['imu-gps', 1], ['harness', 1],
	['master-switch', 1], ['mast', 1], ['lora-antenna', 1], ['gps-antenna', 1], ['cameras', 2], ['beacon', 1],
	['beacon-light', 1], ['estop', 1], ['handheld', 1], ['stick-left', 1], ['stick-right', 1]
];

describe('the bill of process', () => {
	test('has every part of the LifeTrac, by its id, with its count, and nothing else', () => {
		expect(PARTS.map((p) => [p.id, p.qty])).toEqual(CATALOG);
		expect(totals()).toMatchObject({ parts: 135, pieces: 529 });
	});
	test('every part is made from stock the line buys, or says who it is bought from', () => {
		for (const p of PARTS) {
			if (p.raw.stock) expect(STOCK, p.id).toHaveProperty(p.raw.stock);
			else expect(p.raw.bought, p.id).toMatch(/^Bought: /);
			for (const a of p.raw.also ?? []) expect(STOCK, p.id).toHaveProperty(a);
		}
	});
	test('every operation is at a station of the line, and takes no negative time', () => {
		const ids = new Set(SPEC.stations.map((s: any) => s.id));
		for (const p of PARTS) for (const o of p.ops) {
			expect(ids.has(o.at), `${p.id} at ${o.at}`).toBe(true);
			expect(o.s).toBeGreaterThanOrEqual(0);
		}
		for (const st of stationsNamed()) expect(ids.has(st), st).toBe(true);
		for (const st of Object.keys(EXTRA)) expect(ids.has(st), st).toBe(true);
	});
	test('every station’s cycle time is the sum of what it does for one LifeTrac', () => {
		for (const s of SPEC.stations as any[]) {
			expect(s.ct, s.id).toBe(contentOf(s.id));
			expect(s.ct, s.id).toBeGreaterThan(0);
		}
	});
	test('drawn from the document, the line is the line as it was first made: every cycle time and note', () => {
		expect(SPEC.stations.map((s: any) => [s.id, s.ct, s.note])).toEqual(FIRST.stations.map((s: any) => [s.id, s.ct, s.note]));
	});
});

describe('the line', () => {
	test('is sized from the demand: one LifeTrac an hour, around the clock', () => {
		const p = plan(SPEC);
		expect(p.takt).toBe(3600);
		expect(p.daySec).toBe(86400);
		expect(p.sink).toBe('ship');
		expect(p.stations.length).toBe(42);
		expect(Object.fromEntries(p.stations.filter((s: any) => s.servers > 1).map((s: any) => [s.id, s.servers]))).toEqual({ frame: 2, cylturn: 2 });
		for (const s of p.stations as any[]) expect(s.operators, s.id).toBe(0);
	});
	test('five production days: 30 a day against 24, the welding cell the constraint', () => {
		const r: any = forecast(plan(SPEC), {}, { days: 5 });
		expect(r.perDay).toBeCloseTo(30.0, 1);
		expect(r.bottleneck).toBe('weld');
		expect(r.st.weld.busy + r.st.weld.down).toBeGreaterThan(0.95);
	});
	test('a second welding cell: 41 a day, and the plate laser becomes the constraint', () => {
		const r: any = forecast(plan(SPEC), { weld: { servers: 2 } }, { days: 5 });
		expect(r.perDay).toBeCloseTo(41.2, 1);
		expect(r.bottleneck).toBe('laser');
	});
});
