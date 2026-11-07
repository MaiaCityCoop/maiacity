// THE LIVE SHOT'S RUNTIME (intent f270269e; ./live.ts): what draws a live shot inside a story's composition. It is not
// a second engine: the asset is built by the asset box's own frozen engine (kernel/sandbox/engines.json, kind `box`, the
// file every asset viewer runs, its bytes held to its BLAKE3 hash), started here as a worker of the composition's frame,
// which loads nothing (its policy: no connection; workers only from blob:). Its recipe and pieces are play's files by
// hash, laid into the frame by the page (compose.ts `seal`/`feed`) or by the renderer (compose.ts `laid`), each held to
// its hash again here, and joined as the asset library joins them (content/assets/box/pieces.js `withPieces`). What the
// engine hands back is plain data, checked and made into three.js objects by the asset library's own code
// (content/assets/box/rebuild.js, its card by the card schema) and shown on the asset library's own stage
// (content/assets/stage.js, under the sky, as every asset viewer shows it). This file is bundled into one script,
// scripts/live-runtime.ts, kept among play's files by its hash (compose.ts VENDOR.live).
//
// Drawn by time, never by a clock: each build the shot needs is made once, before the composition is ready (the
// poster still shown until then, HyperFrames' `__hf.buildReady` holding the player and the renderer), and every seek
// to t draws the build of t's step from t's camera, synchronously, from a tween's setter on the story's timeline.
import * as THREE from 'three';
import { hashText } from '../content/game/hash.js';
import { withPieces } from '../content/assets/box/pieces.js';
import { rebuild } from '../content/assets/box/rebuild.js';
import { checkCard } from '../content/assets/schemas/index.js';
import { heroOf } from '../content/assets/hero.js';
import { Stage } from '../content/assets/stage.js';
import { createRenderer } from '../content/render/core.js';
import { createSky } from '../content/worlds/sky.js';
import { worldOf as worldInfo } from '../content/worlds/contract.js';
import { plantingsOf, shownIn } from '../content/assets/uses.js';
import { cameraAt, stepAt, worldAt, type CameraKey, type World } from './live';

/** what compose.ts hands a live shot: its engine, recipe and pieces by hash, a build's values per step, its camera */
type Spec = { engine: { v: number; hash: string }; recipe: string; pieces: string[]; builds: Record<string, string>[]; times: number[]; camera: CameraKey[]; size: [number, number]; at: number; duration: number };
type Shown = { obj: THREE.Object3D; hero: any };

const W = window as any;
/** code laid into the frame by hash (compose.ts BRIDGE or `laid`) */
const code = (hash: string): string => {
	const text = W.__playCode?.[hash];
	if (typeof text !== 'string') throw new Error(`live: file ${hash.slice(0, 12)}… was not laid in`);
	if (hashText(text) !== hash) throw new Error(`refused: live: file ${hash.slice(0, 12)}… does not hash to its name`);
	return text;
};

/** the frozen engine as a worker of this frame, for one recipe (its pieces joined in): its builds asked one after
 *  another, and a build kept running (a world that moves: `live`, then a `tick` a step) */
function engineOf(spec: { engine: { v: number; hash: string }; recipe: string; pieces: string[] }) {
	const url = URL.createObjectURL(new Blob([code(spec.engine.hash)], { type: 'text/javascript' }));
	const worker = new Worker(url);
	URL.revokeObjectURL(url);
	const asks = new Map<number, (m: any) => void>();
	let next = 1;
	const ready = new Promise<void>((ok, no) => {
		worker.onerror = (e) => no(new Error(`live: the engine failed: ${e.message}`));
		worker.onmessage = (e) => {
			const [m] = e.data ?? [];
			if (m?.op === 'ready') return ok();
			asks.get(m?.id)?.(m), asks.delete(m?.id);
		};
	});
	const recipe = { hash: spec.recipe, code: withPieces(code(spec.recipe), spec.pieces.map((hash) => ({ hash, code: code(hash) }))) };
	const ask = async (op: string, payload: Record<string, unknown>) => {
		await ready;
		const id = next++;
		const m: any = await new Promise((ok) => (asks.set(id, ok), worker.postMessage({ id, op, ...payload })));
		if (!m.ok) throw new Error(`live: the ${op} failed: ${m.error}`);
		return m;
	};
	return {
		build: (given: Record<string, string>) => ask('build', { recipe, given, args: [], engine: spec.engine.v }),
		/** kept running, as ../content/assets/hero.js `runner` starts it in the page's box */
		start: async (given: Record<string, string> | undefined, nodes: number) => {
			const { session } = await ask('live', { recipe, given, nodes });
			return { tick: (a: unknown) => ask('tick', { session, ask: a }), breakIt: async () => {}, end: () => ask('end', { session }).catch(() => {}) };
		},
		end: () => worker.terminate()
	};
}

/** a build from the box, checked and made into three.js objects by the asset library's own code */
function built(m: any, recipe: string) {
	const verdict = checkCard(m.card);
	if (!verdict.ok) throw new Error(`refused: its card does not fit: ${verdict.errors.slice(0, 3).join('; ')}`);
	if (m.card.recipe !== recipe) throw new Error('refused: its card names another recipe');
	return { obj: rebuild(m.data), card: m.card, data: m.data };
}

/** one live shot on the story's timeline `tl`: its element `id` (a poster and a canvas in it) */
function shot(tl: any, id: string, spec: Spec) {
	const el = document.getElementById(id)!;
	const canvas = el.querySelector('canvas') as HTMLCanvasElement;
	const poster = el.querySelector('img');
	const [w, h] = spec.size;
	let shown: Shown[] | null = null, on = -1, t = 0, drawn = NaN;
	let stage: Stage, camera: THREE.PerspectiveCamera;

	const draw = () => {
		// drawn once a moment: the timeline sets t again on every seek to it
		if (!shown || t === drawn) return;
		drawn = t;
		const k = stepAt(spec.times, t);
		if (k !== on) {
			stage.clear();
			// on its ground at 0, as a world plants it (a plant's roots under the floor)
			stage.show(shown[k].obj, { asset: shown[k].hero, keep: on >= 0, ground: 0 });
			stage.built = 1;
			// its materials glossed now, not on the stage's own count of frames: a moment never depends on what was
			// drawn before it
			(stage as any)._gloss();
			on = k;
		}
		shown[k].hero.pose?.(0, 1);
		const c = cameraAt(spec.camera, t);
		camera.position.set(...c.eye);
		camera.fov = c.fov;
		camera.aspect = w / h;
		camera.near = 0.05, camera.far = 2000;
		camera.updateProjectionMatrix();
		camera.lookAt(...c.target);
		stage.time = t;
		stage.render();
	};

	// made once: every step's build, in order, before the composition is ready
	const made = (async () => {
		const engine = engineOf(spec);
		try {
			const builds: Shown[] = [];
			for (const given of spec.builds) {
				const got = built(await engine.build(given), spec.recipe);
				builds.push({ obj: got.obj, hero: heroOf(got) });
			}
			const renderer = createRenderer({ canvas, pixelRatio: 1, shadows: 'pcf', preserve: true });
			renderer.setSize(w, h, false);
			camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 2000);
			stage = new Stage(renderer, camera, { sky: true });
			stage.resize(w, h);
			shown = builds;
			draw();
			canvas.style.visibility = 'visible';
			if (poster) poster.style.visibility = 'hidden';
		} finally {
			engine.end();
		}
	})();
	made.catch((e) => console.error(id, e));
	(W.__hf ??= {}).buildReady ??= {};
	W.__hf.buildReady[id] = made;
	// t on the story's timeline: a setter a tween drives, so every seek (played, scrubbed or rendered) draws it
	const at = { set t(v: number) { t = v; draw(); }, get t() { return t; } };
	tl.fromTo(at, { t: 0 }, { t: spec.duration, duration: spec.duration, ease: 'none', immediateRender: false }, spec.at);
}

/** what compose.ts hands a world shot: its engine, the world's recipe and pieces, its guests' recipes and pieces by
 *  hash, its camera, hour, exposure and lights (./live.ts World), its frames at the story's fps */
type WorldSpec = Pick<World, 'camera' | 'hour' | 'exposure' | 'lights'> & { engine: { v: number; hash: string }; recipe: string; pieces: string[]; guests: Record<string, string[]>; fps: number; frames: number; size: [number, number]; at: number; duration: number };

/** a build's name, `<recipe hash>?its=values`, as the recipe and its values */
const parseRef = (ref: string) => {
	const [hash, q = ''] = ref.split('?');
	return { hash, given: Object.fromEntries(q.split('&').filter(Boolean).map((kv) => kv.split('=').map(decodeURIComponent) as [string, string])) };
};

/** one world shot on the story's timeline `tl`: its element `id` (a poster and a canvas in it) */
function world(tl: any, id: string, spec: WorldSpec) {
	const el = document.getElementById(id)!;
	const canvas = el.querySelector('canvas') as HTMLCanvasElement;
	const poster = el.querySelector('img');
	const [w, h] = spec.size;
	let ready = false, t = 0, drawn = NaN;
	let renderer: any, scene: THREE.Scene, camera: THREE.PerspectiveCamera, sky: ReturnType<typeof createSky>;
	/** the guests' copies, and every frame's places for them: 16 numbers each, a scale of 0 where one is not shown */
	let copies: THREE.Object3D[] = [];
	let places: Float32Array[] = [];
	let mood: any, base = { sun: 0, hemi: 0, exposure: 1 };
	const lamps: { light: THREE.Light; k: number }[] = [];

	const draw = () => {
		if (!ready || t === drawn) return;
		drawn = t;
		const at = worldAt(spec, t, spec.fps, spec.frames);
		const m = places[Math.min(at.frame, places.length - 1)];
		copies.forEach((c, i) => c.matrix.fromArray(m, i * 16));
		// the hour's sun over the world's mood, then each light scaled by the shot and the exposure in stops
		sky.apply(at.sun ? { ...mood, sun: at.sun.sun, az: at.sun.az } : mood);
		sky.sun.intensity *= at.lights.sun;
		sky.hemi.intensity *= at.lights.sky;
		for (const l of lamps) l.light.intensity = l.k * at.lights.lamps;
		renderer.toneMappingExposure *= 2 ** at.exposure;
		camera.position.set(...at.camera.eye);
		camera.fov = at.camera.fov;
		camera.updateProjectionMatrix();
		camera.lookAt(...at.camera.target);
		sky.place(camera, new THREE.Vector3(...at.camera.target));
		renderer.render(scene, camera);
	};

	const made = (async () => {
		const engines = new Map<string, ReturnType<typeof engineOf>>();
		const engineFor = (recipe: string, pieces: string[]) => {
			if (!engines.has(recipe)) engines.set(recipe, engineOf({ engine: spec.engine, recipe, pieces }));
			return engines.get(recipe)!;
		};
		try {
			// the world, built and, where it moves, kept running in its own worker
			const got = built(await engineFor(spec.recipe, spec.pieces).build({}), spec.recipe);
			const info = worldInfo(got.obj);
			mood = info.mood;
			const hero = info.moves ? heroOf(got, { start: (nodes: number) => engineFor(spec.recipe, spec.pieces).start(undefined, nodes), exact: true }) : null;
			scene = new THREE.Scene();
			got.obj.traverse((x: any) => {
				if (x.isMesh) x.receiveShadow = x.castShadow = true;
			});
			scene.add(got.obj);
			// its guests: each build it names made once, in its recipe's own worker, and copied where each stands
			const uses = plantingsOf(got.obj).filter((u) => Object.hasOwn(spec.guests, u.ref.slice(0, 64)));
			const kinds = new Map<string, THREE.Object3D>();
			for (const ref of [...new Set(uses.map((u) => u.ref))].sort()) {
				const { hash, given } = parseRef(ref);
				kinds.set(ref, built(await engineFor(hash, spec.guests[hash]).build(given), hash).obj);
			}
			copies = uses.map((u) => {
				const c = kinds.get(u.ref)!.clone();
				c.matrixAutoUpdate = false;
				scene.add(c);
				return c;
			});
			// every frame's places, the world brought to each frame's moment in turn (its own seeded steps)
			const placesNow = () => {
				got.obj.updateMatrixWorld(true);
				const m = new Float32Array(uses.length * 16);
				uses.forEach((u, i) => (shownIn(u.node) ? u.node.matrixWorld : AWAY).toArray(m, i * 16));
				return m;
			};
			const settle = async () => {
				for (let n = 0; hero && (hero.starting || (hero.live && hero.busy)); n++) {
					hero.tick(0, {});
					if (hero.pending) await hero.pending;
					else await new Promise((r) => setTimeout(r, 4));
					if (n > 100_000) throw new Error('live: the world stopped answering');
				}
			};
			await settle();
			places = [placesNow()];
			for (let f = 1; f < (hero ? spec.frames : 1); f++) {
				hero!.tick(1 / spec.fps, {});
				await settle();
				places.push(placesNow());
			}
			scene.traverse((x: any) => {
				if (x.isLight && !x.isDirectionalLight && !x.isHemisphereLight) lamps.push({ light: x, k: x.intensity });
			});
			renderer = createRenderer({ canvas, pixelRatio: 1, shadows: 'pcf', preserve: true });
			renderer.setSize(w, h, false);
			camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 20000);
			sky = createSky(scene, renderer);
			ready = true;
			draw();
			canvas.style.visibility = 'visible';
			if (poster) poster.style.visibility = 'hidden';
			hero?.dispose();
		} finally {
			for (const e of engines.values()) e.end();
		}
	})();
	made.catch((e) => console.error(id, e));
	(W.__hf ??= {}).buildReady ??= {};
	W.__hf.buildReady[id] = made;
	const at = { set t(v: number) { t = v; draw(); }, get t() { return t; } };
	tl.fromTo(at, { t: 0 }, { t: spec.duration, duration: spec.duration, ease: 'none', immediateRender: false }, spec.at);
}

/** where a guest not shown is put: nowhere */
const AWAY = new THREE.Matrix4().makeScale(0, 0, 0);

W.playLive = { shot, world };
