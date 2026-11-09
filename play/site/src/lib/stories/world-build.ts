// A WORLD SHOT'S BUILD (intent 90de96fb; ./live-runtime.ts draws it, scripts/world-shot.ts checks it on the CPU): the
// world, its guests and every frame's places, made once for all of a world's shots before they are ready (intent
// 4f7a2178), by the frozen box engine started as workers. No DOM, no WebGL: the same code runs in the composition's frame and in Bun in avenBOX, only the worker it is
// handed differs. Drawn by time, never by a clock: no step here reads a clock, chance or the environment.
//
// - A build asks its engine with no `given` where its ref holds no values (an engine refuses values for a recipe that
//   takes none).
// - The guests are built by recipe, FEW at a time, each recipe in its own worker (one recipe a worker, as the asset box
//   keeps them), ended as soon as its builds are made.
// - Every ask fails, never hangs: on its worker's crash, and after the box's job time (BUDGETS.job). A moving world whose
//   run won't start, or whose steps stop, fails saying so.
// - What it does is told as it goes (`progress`), for the player's caption.
import * as THREE from 'three';
import { withPieces } from '../content/assets/box/pieces.js';
import { rebuild } from '../content/assets/box/rebuild.js';
import { checkCard } from '../content/assets/schemas/index.js';
import { heroOf } from '../content/assets/hero.js';
import { worldOf as worldInfo } from '../content/worlds/contract.js';
import { plantingsOf, shownIn } from '../content/assets/uses.js';
import { BUDGETS } from '../kernel/sandbox/policy.js';

export type WorkerLike = { postMessage(m: unknown): void; terminate(): void; onmessage: ((e: { data: any }) => void) | null; onerror: ((e: { message?: string; preventDefault?: () => void }) => void) | null };
/** a worker of the code named `hash`, its blob: URL made once and kept: WebKit fails a worker's importScripts(blob:),
 *  how the engine runs each recipe, once the worker's own URL is revoked ("Load failed", intent 4f7a2178) */
const urls = new Map<string, string>();
export const blobWorker = (hash: string, code: () => string) => (): WorkerLike => {
	if (!urls.has(hash)) urls.set(hash, URL.createObjectURL(new Blob([code()], { type: 'text/javascript' })));
	return new Worker(urls.get(hash)!) as unknown as WorkerLike;
};
const FEW = 4;
/** a step of the build, for the player: what it is doing, and how far along */
export type Progress = { step: 'world' | 'guests' | 'frames' | 'ready'; done: number; of: number; text: string };
export type Engine = ReturnType<typeof engineOf>;

/** the frozen engine as a worker, for one recipe (its code with its pieces joined in): its asks one after another,
 *  each failing on the worker's crash or after `timeout` ms */
export function engineOf(recipe: { hash: string; code: string }, engine: number, make: () => WorkerLike, timeout: number = BUDGETS.job) {
	const worker = make();
	const asks = new Map<number, { ok: (m: any) => void; no: (e: Error) => void }>();
	let next = 1, dead: Error | null = null;
	const die = (e: Error) => {
		if (dead) return;
		dead = e;
		for (const a of asks.values()) a.no(e);
		asks.clear();
		worker.terminate();
	};
	const ready = new Promise<void>((ok, no) => {
		const late = setTimeout(() => die(new Error(`the engine did not start within ${timeout / 1000} s`)), timeout);
		worker.onerror = (e) => {
			e.preventDefault?.();
			die(new Error(`the engine for ${recipe.hash.slice(0, 8)} crashed: ${e.message ?? 'no reason given'}`));
			clearTimeout(late), no(dead);
		};
		worker.onmessage = (e) => {
			const [m] = e.data ?? [];
			if (m?.op === 'ready') return clearTimeout(late), ok();
			const a = asks.get(m?.id);
			if (a) asks.delete(m.id), a.ok(m);
		};
		// a start that timed out
		asks.set(0, { ok: () => {}, no: (e) => (clearTimeout(late), no(e)) });
	});
	ready.then(() => asks.delete(0), () => {});
	const ask = async (op: string, payload: Record<string, unknown>) => {
		await ready;
		if (dead) throw dead;
		const id = next++;
		const m: any = await new Promise((ok, no) => {
			const late = setTimeout(() => die(new Error(`the ${op} of ${recipe.hash.slice(0, 8)} took longer than ${timeout / 1000} s`)), timeout);
			asks.set(id, { ok: (m) => (clearTimeout(late), ok(m)), no: (e) => (clearTimeout(late), no(e)) });
			worker.postMessage({ id, op, ...payload });
		});
		if (!m.ok) throw new Error(`the ${op} of ${recipe.hash.slice(0, 8)} failed: ${m.error}`);
		return m;
	};
	return {
		build: (given: Record<string, string> | undefined) => ask('build', { recipe, given, args: [], engine }),
		/** kept running, as ../content/assets/hero.js `runner` starts it in the page's box */
		start: async (given: Record<string, string> | undefined, nodes: number) => {
			const { session } = await ask('live', { recipe, given, nodes });
			// ending a session on a worker that already went has nothing to end (as the page's box, host.js `end`)
			return { tick: (a: unknown) => ask('tick', { session, ask: a }), breakIt: async () => {}, end: () => ask('end', { session }).catch(() => {}) };
		},
		end: () => die(new Error('ended'))
	};
}

/** a build from the box, checked and made into three.js objects by the asset library's own code */
export function built(m: any, recipe: string) {
	const verdict = checkCard(m.card);
	if (!verdict.ok) throw new Error(`refused: its card does not fit: ${verdict.errors.slice(0, 3).join('; ')}`);
	if (m.card.recipe !== recipe) throw new Error('refused: its card names another recipe');
	return { obj: rebuild(m.data), card: m.card, data: m.data };
}

/** a build's name, `<recipe hash>?its=values`, as the recipe and its values (none where it names none) */
export const parseRef = (ref: string) => {
	const [hash, q = ''] = ref.split('?');
	const pairs = q.split('&').filter(Boolean).map((kv) => kv.split('=').map(decodeURIComponent) as [string, string]);
	return { hash, given: pairs.length ? Object.fromEntries(pairs) : undefined };
};

/** what a world shot builds: the frozen engine, the world's recipe and pieces, its guests' pieces by recipe, its frames */
export type WorldBuildSpec = { engine: { v: number; hash: string }; recipe: string; pieces: string[]; guests: Record<string, string[]>; fps: number; frames: number };
/** where its code and its workers come from: a file by hash (held to it by the caller), a worker of the engine */
export type Host = { code: (hash: string) => string; worker: () => WorkerLike; progress?: (p: Progress) => void; timeout?: number; few?: number };

/**
 * A world made whole, once for every shot of it in a composition: its world (its own copy, run in its own worker where
 * it moves), its guests' copies where each stands, and every frame's places for them (16 numbers each, a scale of 0
 * where one is not shown), the world brought to each frame's moment in turn by its own seeded steps. Throws why it can't.
 */
export async function buildWorld(spec: WorldBuildSpec, host: Host) {
	const say = host.progress ?? (() => {});
	const recipeOf = (hash: string, pieces: string[]) => ({ hash, code: withPieces(host.code(hash), pieces.map((p) => ({ hash: p, code: host.code(p) }))) });
	const world = recipeOf(spec.recipe, spec.pieces);
	say({ step: 'world', done: 0, of: 1, text: 'Building the world' });
	const once = engineOf(world, spec.engine.v, host.worker, host.timeout);
	let got: ReturnType<typeof built>;
	try {
		got = built(await once.build(undefined), spec.recipe);
	} finally {
		once.end();
	}
	// its guests: each build it names made once, each recipe in its own worker, FEW recipes at a time
	const refs = [...new Set(plantingsOf(got.obj).map((u: { ref: string }) => u.ref).filter((r: string) => Object.hasOwn(spec.guests, r.slice(0, 64))))].sort() as string[];
	const byRecipe = new Map<string, string[]>();
	for (const r of refs) byRecipe.set(r.slice(0, 64), [...(byRecipe.get(r.slice(0, 64)) ?? []), r]);
	const queue = [...byRecipe.entries()];
	const guests = new Map<string, { obj: THREE.Object3D; group: string }>();
	let done = 0;
	say({ step: 'guests', done, of: refs.length, text: `Building its guests: 0 of ${refs.length}` });
	await Promise.all(
		Array.from({ length: Math.min(host.few ?? FEW, queue.length) }, async () => {
			for (let job; (job = queue.shift()); ) {
				const [hash, mine] = job;
				const e = engineOf(recipeOf(hash, spec.guests[hash]), spec.engine.v, host.worker, host.timeout);
				try {
					for (const ref of mine) {
						const g = built(await e.build(parseRef(ref).given), hash);
						guests.set(ref, { obj: g.obj, group: g.card.group });
						say({ step: 'guests', done: ++done, of: refs.length, text: `Building its guests: ${done} of ${refs.length}` });
					}
				} finally {
					e.end();
				}
			}
		})
	);
	const info = worldInfo(got.obj);
	const uses = plantingsOf(got.obj).filter((u: { ref: string }) => guests.has(u.ref));
	const copies = uses.map((u: { ref: string }) => {
		const c = guests.get(u.ref)!.obj.clone();
		c.matrixAutoUpdate = false;
		return c;
	});

	// where it moves, its run kept in a worker of its own; a run that won't start, or whose steps fail, fails the shot
	let engine: Engine | null = null, broke: Error | null = null;
	const keep = (e: any) => ((broke ??= e instanceof Error ? e : new Error(String(e))), Promise.reject(e));
	const hero = info.moves
		? heroOf(got, {
				exact: true,
				start: async (nodes: number) => {
					engine = engineOf(world, spec.engine.v, host.worker, host.timeout);
					const r = await engine.start(undefined, nodes).catch(keep);
					return { ...r, tick: (a: unknown) => r.tick(a).catch(keep) };
				}
			})
		: null;
	try {
		const settle = async () => {
			for (let n = 0; hero && (hero.starting || (hero.live && hero.busy)); n++) {
				hero.tick(0, {});
				if (hero.pending) await hero.pending;
				else await new Promise((r) => setTimeout(r, 4));
				if (n > 100_000) throw new Error('the world stopped answering');
			}
			if (hero && !hero.live) throw new Error(`the world's run ${broke ? `failed: ${broke.message}` : 'could not be started'}`);
		};
		const placesNow = () => {
			got.obj.updateMatrixWorld(true);
			const out = new Float32Array(uses.length * 16);
			uses.forEach((u: any, i: number) => (shownIn(u.node) ? u.node.matrixWorld : AWAY).toArray(out, i * 16));
			return out;
		};
		const frames = hero ? spec.frames : 1;
		say({ step: 'frames', done: 0, of: frames, text: `Running the world: frame 0 of ${frames}` });
		await settle();
		const places = [placesNow()];
		for (let f = 1; f < frames; f++) {
			hero!.tick(1 / spec.fps, {});
			await settle();
			places.push(placesNow());
			if (f % 12 === 0 || f === frames - 1) say({ step: 'frames', done: f + 1, of: frames, text: `Running the world: frame ${f + 1} of ${frames}` });
		}
		say({ step: 'ready', done: 1, of: 1, text: 'Ready' });
		return { obj: got.obj, info, uses, copies, places, groups: uses.map((u: { ref: string }) => guests.get(u.ref)!.group) };
	} finally {
		hero?.dispose();
		(engine as Engine | null)?.end();
	}
}

const AWAY = new THREE.Matrix4().makeScale(0, 0, 0);
