// A world shot's build (intent 90de96fb, ./world-build.ts): it fails saying why, never hangs, and tells how far it is.
// The engine here is a stand-in worker speaking the frozen engine's messages; scripts/world-shot.ts builds a real world
// through the real engine in avenBOX.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { serialize } from '../content/assets/box/serialize.js';
import { buildWorld, engineOf, parseRef, type Progress, type WorkerLike } from './world-build';

const H = (c: string) => c.repeat(64);
const [WORLD, CAR, HOUSE, ENGINE] = ['a', 'c', 'd', 'e'].map(H);
const card = (recipe: string, group: string) => ({ format: 'asset-card', v: 1, ref: `${group}/x@1`, recipe, group, id: 'x', version: 1, label: 'x', size: [1, 1, 1], triangles: 12 });

/** a box build's answer: a mesh, and where `uses` names guests, a node for each */
async function answer(recipe: string, group: string, uses: string[] = [], moves = false) {
	const root = new THREE.Group();
	root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
	uses.forEach((u, i) => {
		const n = new THREE.Object3D();
		n.name = `use:${u}`;
		n.position.set(i * 3, 0, 0);
		root.add(n);
	});
	return { ok: true, card: card(recipe, group), data: (await serialize(root, { view: moves ? { ticks: true } : undefined })).data };
}

type Say = (m: any) => void;
/** a stand-in for the frozen engine as a worker: `on` answers each ask (or nothing, or throws to crash it) */
function fake(on: (m: any, say: Say, crash: (why: string) => void) => void, log: string[] = []) {
	return (): WorkerLike => {
		const w: WorkerLike = {
			onmessage: null,
			onerror: null,
			postMessage(m: any) {
				log.push(m.op);
				const say: Say = (x) => setTimeout(() => w.onmessage?.({ data: [x] }), 0);
				on(m, say, (why) => setTimeout(() => w.onerror?.({ message: why }), 0));
			},
			terminate() {
				log.push('end');
			}
		};
		setTimeout(() => w.onmessage?.({ data: [{ op: 'ready' }] }), 0);
		return w;
	};
}
/** a world of a house and two cars, built right */
const world = (moves = false, guests: Record<string, (m: any) => Promise<any>> = {}) =>
	fake((m, say) => {
		if (m.op !== 'build') return say({ id: m.id, ok: false, error: 'no run here' });
		const h = m.recipe.hash;
		const got = guests[h] ?? (async () => (h === WORLD ? answer(WORLD, 'worlds', [`${HOUSE}?floors=3`, CAR, `${CAR}?colour=red`], moves) : answer(h, h === CAR ? 'machines' : 'buildings')));
		got(m).then((a) => say({ id: m.id, ...a }));
	});
const spec = { engine: { v: 5, hash: ENGINE }, recipe: WORLD, pieces: [], guests: { [CAR]: [], [HOUSE]: [] }, fps: 24, frames: 25 };
const code = (h: string) => `/* ${h} */`;

describe('a world shot build: failing, it says why', () => {
	it('failing: a ref without values is asked with no values (an engine refuses values for a recipe that takes none)', () => {
		expect(parseRef(CAR)).toEqual({ hash: CAR, given: undefined });
		expect(parseRef(`${HOUSE}?floors=3&seed=o%201`)).toEqual({ hash: HOUSE, given: { floors: '3', seed: 'o 1' } });
	});
	it('failing: a refused guest build fails the shot with its words', async () => {
		const asked: any[] = [];
		const w = world(false, { [CAR]: async (m) => (asked.push(m.given), { ok: false, error: 'machines/sedan@3:graphite takes no parameters' }) });
		await expect(buildWorld(spec, { code, worker: w })).rejects.toThrow(/takes no parameters/);
		expect(asked).toContain(undefined);
	});
	it('failing: a worker that crashes after it is ready fails every ask open in it', async () => {
		const e = engineOf({ hash: CAR, code: '' }, 5, fake((m, say, crash) => crash('out of memory')));
		await expect(e.build(undefined)).rejects.toThrow(/crashed: out of memory/);
		await expect(e.build(undefined)).rejects.toThrow(/crashed/);
	});
	it('failing: an ask unanswered past its time fails, and the worker is ended', async () => {
		const log: string[] = [];
		const e = engineOf({ hash: CAR, code: '' }, 5, fake(() => {}, log), 50);
		await expect(e.build(undefined)).rejects.toThrow(/took longer than 0.05 s/);
		expect(log).toContain('end');
		// an engine that never starts fails too
		const mute = (): WorkerLike => ({ onmessage: null, onerror: null, postMessage() {}, terminate() {} });
		await expect(engineOf({ hash: CAR, code: '' }, 5, mute, 50).build(undefined)).rejects.toThrow(/did not start/);
	});
	it('failing: a moving world whose run will not start fails saying so', async () => {
		await expect(buildWorld(spec, { code, worker: world(true) })).rejects.toThrow(/the world's run failed: the live of a+\.* failed: no run here|the world's run failed/);
	});
	it('failing: the runtime tells the player, and the player shows it', () => {
		const runtime = readFileSync(new URL('./live-runtime.ts', import.meta.url), 'utf8');
		expect(runtime).toMatch(/tell\(\{ op: 'failed', shot: id, error:/);
		expect(runtime).toContain('done.catch(failed(id, what));');
		expect(runtime).toContain("draw, 'a world shot');");
		const player = readFileSync(new URL('./StoryPlayer.svelte', import.meta.url), 'utf8');
		expect(player).toMatch(/m\.op === 'failed'\)[^\n]*film = 'failed'/);
		expect(player).toContain('The film could not be played: ${failure}');
	});
});

describe('a world shot build: progress', () => {
	it('progress: the world, its guests one by one, its frames, then ready; each recipe in its own worker, ended', async () => {
		const seen: Progress[] = [];
		const log: string[] = [];
		const w = world(false);
		const counted = () => {
			const x = w();
			const end = x.terminate;
			x.terminate = () => (log.push('end'), end());
			const post = x.postMessage;
			x.postMessage = (m: any) => (log.push(m.op), post(m));
			return x;
		};
		const got = await buildWorld(spec, { code, worker: counted, progress: (p) => seen.push(p) });
		expect(seen.map((p) => p.step)).toEqual(['world', 'guests', 'guests', 'guests', 'guests', 'frames', 'ready']);
		expect(seen.filter((p) => p.step === 'guests').map((p) => `${p.done}/${p.of}`)).toEqual(['0/3', '1/3', '2/3', '3/3']);
		expect(seen.at(-1)!.text).toBe('Ready');
		// the world's worker, and one for each guest recipe: every one ended
		expect(log.filter((x) => x === 'build').length).toBe(4);
		expect(log.filter((x) => x === 'end').length).toBe(3);
		expect(got.copies.length).toBe(3);
		expect(got.groups.sort()).toEqual(['buildings', 'machines', 'machines']);
		// a world that stands still: one frame
		expect(got.places.length).toBe(1);
	});
	it('progress: the runtime posts each step to the player, which shows it in its caption', () => {
		const runtime = readFileSync(new URL('./live-runtime.ts', import.meta.url), 'utf8');
		expect(runtime).toContain("progress: (p) => tell({ op: 'progress', shot: spec.shots[0]?.id, ...p })");
		const player = readFileSync(new URL('./StoryPlayer.svelte', import.meta.url), 'utf8');
		expect(player).toMatch(/m\.op === 'progress'\)/);
		expect(player).toContain('{loadingText}');
	});
});
