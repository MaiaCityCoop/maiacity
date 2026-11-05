// The world contract v1 (play/SPEC.md §4.11): what a world's nodes say, read as the page reads them, and the stand-in
// test world run as the box runs it (its recipe, its live tick): its cars move, queue at red and its states switch.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// @ts-ignore — plain JS
import { lightOf, litNow, moodOf, soundOf, stateOf, statesOf, worldOf } from './contract.js';
// @ts-ignore — plain JS
import { plantingsOf, shownIn } from '../assets/plantings.js';
// @ts-ignore — plain JS
import { CARD, checkCard } from '../assets/schemas/index.js';
// @ts-ignore — plain JS
import { heroOf, STEP } from '../assets/hero.js';

const HASH = 'f'.repeat(64);

/** a readable source run as the box runs it: CommonJS, `require('three')` its only module */
function recipeOf(file: string, id: string) {
	const code = readFileSync(fileURLToPath(new URL(`./test/${file}`, import.meta.url)), 'utf8');
	const module = { exports: {} as any };
	new Function('require', 'module', 'exports', code)((m: string) => (m === 'three' ? THREE : null), module, module.exports);
	return { ...module.exports.recipe(id, 1, null), exports: module.exports };
}

describe('the world contract', () => {
	it('reads a mood over its preset, and falls back for one it does not know', () => {
		const m = moodOf('mood:smog-dusk?sun=4&fog=0.006&haze=8a8478&lamps=1');
		expect(m).toMatchObject({ preset: 'smog-dusk', sun: 4, fog: 0.006, haze: '8a8478', lamps: true });
		expect(moodOf('mood:smog-dusk?fog=9').fog).toBe(0.05);
		expect(moodOf('mood:nonsense').preset).toBe('overcast');
		expect(moodOf('mood:night?haze=zzz').haze).toBe('20232a');
		expect(moodOf('mood:indoor')).toMatchObject({ indoor: true, fog: 0, lamps: true, shadows: false });
		expect(moodOf('mood:smog-dusk').indoor).toBe(false);
	});
	it('reads sounds by their hash and what they are for', () => {
		expect(soundOf(`sound:${HASH}?for=horn&gain=0.8`)).toEqual({ hash: HASH, for: 'horn', gain: 0.8, once: true });
		expect(soundOf(`sound:${HASH}`)).toMatchObject({ for: 'bed', gain: 1, once: false });
		expect(soundOf('sound:abc?for=bed')).toBeNull();
	});
	it('reads states, signal heads and the lights a guest names', () => {
		expect(stateOf('state:brake')).toEqual({ name: 'brake', head: -1 });
		expect(stateOf('state:1:red')).toEqual({ name: 'red', head: 1 });
		expect(stateOf('use:x')).toBeNull();
		expect(lightOf('light:beacon-blue')).toEqual({ light: 'beacon-blue', state: 'beacon' });
		expect(lightOf('lamp:amber')).toEqual({ lamp: 'amber' });
		expect(lightOf('light:laser')).toBeNull();
		for (const n of ['beacon-amber', 'reverse', 'window', 'sign']) expect(lightOf(`light:${n}`)).not.toBeNull();
		expect(lightOf('lamp:purple')).toBeNull();
	});
	it('lights by state, else by the mood; blinks indicators and turns beacons about', () => {
		const node = new THREE.Group();
		for (const [n, v] of [['brake', true], ['indicator-l', true], ['beacon', true], ['0:red', true], ['red', false]] as const) {
			const o = new THREE.Object3D();
			o.name = `state:${n}`;
			o.visible = v;
			node.add(o);
		}
		const s = statesOf(node);
		const dusk = { lamps: true }, day = { lamps: false };
		expect(litNow({ light: 'brake', state: 'brake' }, s, day, 0)).toBe(true);
		expect(litNow({ light: 'head', state: 'head' }, s, dusk, 0)).toBe(true);
		expect(litNow({ light: 'head', state: 'head' }, s, day, 0)).toBe(false);
		expect(litNow({ light: 'indicator-l', state: 'indicator-l' }, s, day, 0)).not.toBe(litNow({ light: 'indicator-l', state: 'indicator-l' }, s, day, 1 / 3));
		const t = 0.1;
		expect(litNow({ light: 'beacon-blue', state: 'beacon' }, s, day, t)).not.toBe(litNow({ light: 'beacon-red', state: 'beacon' }, s, day, t));
		expect(litNow({ lamp: 'red', head: 0 }, s, day, 0)).toBe(true);
		// an amber work beacon flashes with the blue; reversing lamps only by their state; windows lit at dusk, some sets dark
		expect(litNow({ light: 'beacon-amber', state: 'beacon' }, s, day, t)).toBe(litNow({ light: 'beacon-blue', state: 'beacon' }, s, day, t));
		expect(litNow({ light: 'reverse', state: 'reverse' }, s, dusk, 0)).toBe(false);
		// a shop's sign is lit by day as by night
		expect(litNow({ light: 'sign', state: 'sign' }, s, day, 0)).toBe(true);
		expect([0, 1, 2, 3].some((set) => litNow({ light: 'window', state: 'window', set }, s, day, 0))).toBe(false);
		const lit = [0, 1, 2, 3].flatMap((set) => [0.1, 0.3, 0.7].map((ph) => litNow({ light: 'window', state: 'window', set }, s, dusk, 0, ph)));
		expect(lit).toContain(true);
		expect(lit).toContain(false);
		expect(litNow({ lamp: 'red', head: 1 }, s, day, 0)).toBe(false);
	});
});

describe('a world under the film camera', () => {
	it('is named by a shot by its asset UUID and recipe hash, and its film page says so', async () => {
		// @ts-ignore — plain JS
		const { normalize } = await import('../game/film/shot.js');
		// @ts-ignore — plain JS
		const { filmPath, worldOfPath, isWorld } = await import('../game/film/worlds.js');
		expect(isWorld('worlds')).toBe(true);
		const asset = '60f6da00-979d-89e4-b1e5-53667ba41fe4';
		const shot = (world: any) => normalize({ world: { sandbox: 'worlds', stand: [0, 0], ...world }, camera: { kind: 'orbit', centre: [0, 0], a0: 0, a1: 1, r0: 20, r1: 20, y0: 8, y1: 8, aim: [0, 0, 0] }, time: { hour: 17.5 }, seconds: 6 });
		const ok = shot({ asset, recipe: HASH });
		expect(ok.world).toMatchObject({ sandbox: 'worlds', asset, recipe: HASH });
		expect(() => shot({ asset: 'old-city', recipe: HASH })).toThrow(/UUID/);
		expect(() => shot({ asset, recipe: 'v1' })).toThrow(/recipe/);
		const path = filmPath(ok.world);
		expect(path).toBe(`/worlds/?film&asset=${asset}&recipe=${HASH}`);
		expect(worldOfPath(path)).toEqual({ sandbox: 'worlds', asset, recipe: HASH });
	});
});

describe('card schema v2', () => {
	it('takes a world, and a catalog part named by its build hash as well as by a readable ref', () => {
		expect(CARD.properties.group.enum).toContain('worlds');
		const ref = CARD.properties.catalog.properties.parts.items.properties.ref;
		const ok = (x: string) => ref.anyOf.some((d: any) => new RegExp(CARD.$defs[d.$ref.split('/').at(-1)].pattern).test(x));
		expect(ok(`${HASH}?seed=7101`)).toBe(true);
		expect(ok('plants/fern@2:male?stage=3')).toBe(true);
		expect(ok('https://example.com/x')).toBe(false);
		expect(checkCard({}).ok).toBe(false);
	});
});

describe('the stand-in test world', () => {
	const car = recipeOf('test-car.js', 'test-car');
	const signal = recipeOf('test-signal.js', 'test-signal');
	const world = recipeOf('test-world.js', 'test-world');

	it('is a world, its guests things, each named as the contract names them', () => {
		expect(world.meta.group).toBe('worlds');
		const amb = car.build(1);
		const names = new Set<string>();
		amb.traverse((o: THREE.Object3D) => names.add(o.name));
		for (const n of ['light:head', 'light:tail', 'light:brake', 'light:indicator-l', 'light:indicator-r', 'light:beacon-blue', 'light:beacon-red']) expect(names).toContain(n);
		const lamps: string[] = [];
		signal.build().traverse((o: THREE.Object3D) => lightOf(o.name)?.lamp && lamps.push(o.name));
		expect(lamps).toEqual(['lamp:red', 'lamp:amber', 'lamp:green']);
		// real size: a small car, front toward +z, on the ground
		const box = new THREE.Box3().setFromObject(car.build(0));
		expect(box.min.y).toBeCloseTo(0, 2);
		expect(box.max.z - box.min.z).toBeGreaterThan(4.15);
		expect(box.max.z - box.min.z).toBeLessThan(4.35);
	});

	it('says its mood, its sounds, its views; plants its guests', () => {
		const root = world.build(10);
		root.userData.view = { ticks: typeof root.userData.tick === 'function' };
		const info = worldOf(root);
		expect(info).toMatchObject({ moves: true, mood: { preset: 'smog-dusk', lamps: true, haze: '8e9396' } });
		expect(info.sounds.map((s: any) => s.for).sort()).toEqual(['bed', 'horn', 'siren']);
		const planted = plantingsOf(root);
		// 2 lanes of 10 cars, an ambulance, 2 signals
		expect(planted.length).toBe(23);
		for (const p of planted) expect(p.node.name.length).toBeLessThanOrEqual(120);
	});

	it('moves its cars each step, stops them at red and switches its signals', () => {
		const root = world.build(12);
		const cars = plantingsOf(root).filter((p: any) => p.ref.endsWith('kind=0')).map((p: any) => p.node);
		const signals = plantingsOf(root).filter((p: any) => !p.ref.includes('kind')).map((p: any) => p.node);
		const at = cars.map((c: THREE.Object3D) => c.position.x);
		const seen = new Set<string>();
		let braking = 0, queued = 0;
		for (let i = 0; i < 400; i++) {
			const before = cars.map((c: THREE.Object3D) => c.position.x);
			root.userData.tick((i + 1) * 0.25);
			for (const s of signals) seen.add(s.children.find((c: THREE.Object3D) => c.visible)?.name ?? 'none');
			braking += cars.filter((c: THREE.Object3D) => c.children.find((x) => x.name === 'state:brake')!.visible).length;
			// the first way's signal red: cars standing (all but still) in the 60 m before its stop line, at x = -8
			if (signals[0].children.find((c: THREE.Object3D) => c.name === 'state:red')!.visible)
				queued += cars.filter((c: THREE.Object3D, j: number) => c.position.z > 0 && c.position.x > -70 && c.position.x < -8 && Math.abs(c.position.x - before[j]) < 0.02).length;
			// none drives through the red: no car of the first way is just past its line while it is red and was before it
			for (const [j, c] of cars.entries()) if (c.position.z > 0 && signals[0].children.find((x: THREE.Object3D) => x.name === 'state:red')!.visible && before[j] < -9 && c.position.x > -6) throw new Error('a car ran the red');
		}
		expect(cars.some((c: THREE.Object3D, i: number) => c.position.x !== at[i])).toBe(true);
		expect([...seen].sort()).toEqual(['state:amber', 'state:green', 'state:red']);
		expect(braking).toBeGreaterThan(0);
		// every signal shows exactly one lamp at a time
		for (const s of signals) expect(s.children.filter((c: THREE.Object3D) => c.visible).length).toBe(1);
		// the ambulance is hidden off the road part of each minute: its guest is put away
		const amb = plantingsOf(root).find((p: any) => p.ref.endsWith('kind=1'))!.node;
		let hidden = false;
		for (let i = 0; i < 240 && !hidden; i++) (root.userData.tick(100 + i * 0.25), (hidden = !shownIn(amb)));
		expect(hidden).toBe(true);
		expect(queued).toBeGreaterThan(0);
	});

	it('is the same every run (seeded) at the same time, however it got there (the box hands it its time t)', () => {
		const a = world.build(8), b = world.build(8);
		for (let i = 1; i <= 40; i++) a.userData.tick(i * 0.25);
		for (const t of [0.25, 3.3, 7.3, 10]) b.userData.tick(t);
		const pos = (r: THREE.Object3D) => plantingsOf(r).map((p: any) => p.node.position.toArray().join());
		expect(pos(a)).toEqual(pos(b));
	});
});

describe('a world brought far ahead under the film camera', () => {
	it('is asked every second of a long jump, STEP at a time, each step awaited as the box answers it', async () => {
		// a box that answers each step a little later, and moves nothing (what it moves is the world's own business)
		const asked: number[] = [];
		const box = {
			tick: (ask: { dt: number }) =>
				new Promise((done) => {
					asked.push(ask.dt);
					setTimeout(() => done({ nodes: new Uint32Array(0), trs: new Float32Array(0), visible: new Uint8Array(0) }), 1);
				}),
			breakIt: () => {},
			end: () => {}
		};
		const root = new THREE.Group();
		root.userData.view = { ticks: true };
		const hero = heroOf({ obj: root, card: {} }, { start: async () => box, exact: true });
		while (!hero.live) await new Promise((r) => setTimeout(r, 1));
		// the film jumps 30 s ahead in one call, then waits as view.js settle() does: each step in flight awaited
		hero.tick(30, {});
		expect(hero.owed).toBeGreaterThan(29);
		let rounds = 0;
		while (hero.busy && rounds++ < 1000) {
			hero.tick(0, {});
			if (hero.pending) await hero.pending;
		}
		expect(hero.busy).toBe(false);
		expect(hero.owed).toBe(0);
		expect(Math.max(...asked)).toBeLessThanOrEqual(STEP);
		expect(asked.reduce((a, b) => a + b, 0)).toBeCloseTo(30, 6);
		expect(asked.length).toBe(Math.ceil(30 / STEP));
	});
});
