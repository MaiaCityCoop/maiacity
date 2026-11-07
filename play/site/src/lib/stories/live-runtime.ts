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
import { heroOf } from '../content/assets/hero.js';
import { Stage } from '../content/assets/stage.js';
import { createRenderer } from '../content/render/core.js';
import { createSky } from '../content/worlds/sky.js';
import { cameraAt, stepAt, worldAt, type CameraKey, type World } from './live';
import { buildWorld, built, engineOf, type WorkerLike, type WorldBuildSpec } from './world-build';

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

/** the frozen engine `hash` as a worker of this frame (its policy lets workers come only from blob:) */
const worker = (hash: string) => () => {
	const url = URL.createObjectURL(new Blob([code(hash)], { type: 'text/javascript' }));
	const w = new Worker(url);
	URL.revokeObjectURL(url);
	return w as unknown as WorkerLike;
};

/** a word to the player outside the frame (intent 90de96fb): how far a shot's build is, or why it failed */
const tell = (m: Record<string, unknown>) => {
	if (W.parent && W.parent !== W) W.parent.postMessage({ play: 1, ...m }, '*');
};
/** a shot's build that failed: the player shows why, never waits on "Loading" for ever */
const failed = (id: string, what: string) => (e: any) => (console.error(id, e), tell({ op: 'failed', shot: id, error: `${what} could not be built: ${e?.message ?? e}` }));

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
		const recipe = { hash: spec.recipe, code: withPieces(code(spec.recipe), spec.pieces.map((hash) => ({ hash, code: code(hash) }))) };
		const engine = engineOf(recipe, spec.engine.v, worker(spec.engine.hash));
		try {
			const builds: Shown[] = [];
			for (const given of spec.builds) {
				const got = built(await engine.build(Object.keys(given ?? {}).length ? given : undefined), spec.recipe);
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
	made.catch(failed(id, 'a live shot'));
	(W.__hf ??= {}).buildReady ??= {};
	W.__hf.buildReady[id] = made;
	// t on the story's timeline: a setter a tween drives, so every seek (played, scrubbed or rendered) draws it
	const at = { set t(v: number) { t = v; draw(); }, get t() { return t; } };
	tl.fromTo(at, { t: 0 }, { t: spec.duration, duration: spec.duration, ease: 'none', immediateRender: false }, spec.at);
}

/** what compose.ts hands a world shot: its engine, the world's recipe and pieces, its guests' recipes and pieces by
 *  hash, its camera, hour, exposure and lights (./live.ts World), its frames at the story's fps */
type WorldSpec = Pick<World, 'camera' | 'hour' | 'exposure' | 'lights'> & WorldBuildSpec & { size: [number, number]; at: number; duration: number };

/** one world shot on the story's timeline `tl`: its element `id` (a poster and a canvas in it), built by ./world-build.ts */
function world(tl: any, id: string, spec: WorldSpec) {
	const el = document.getElementById(id)!;
	const canvas = el.querySelector('canvas') as HTMLCanvasElement;
	const poster = el.querySelector('img');
	const [w, h] = spec.size;
	let ready = false, t = 0, drawn = NaN;
	let renderer: any, scene: THREE.Scene, camera: THREE.PerspectiveCamera, sky: ReturnType<typeof createSky>;
	let copies: THREE.Object3D[] = [];
	let places: Float32Array[] = [];
	let mood: any;
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
		const got = await buildWorld(spec, { code, worker: worker(spec.engine.hash), progress: (p) => tell({ op: 'progress', shot: id, ...p }) });
		mood = got.info.mood;
		scene = new THREE.Scene();
		got.obj.traverse((x: any) => {
			if (x.isMesh) x.receiveShadow = x.castShadow = true;
		});
		scene.add(got.obj);
		for (const c of got.copies) scene.add(c);
		copies = got.copies;
		places = got.places;
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
	})();
	made.catch(failed(id, 'a world shot'));
	(W.__hf ??= {}).buildReady ??= {};
	W.__hf.buildReady[id] = made;
	const at = { set t(v: number) { t = v; draw(); }, get t() { return t; } };
	tl.fromTo(at, { t: 0 }, { t: spec.duration, duration: spec.duration, ease: 'none', immediateRender: false }, spec.at);
}


W.playLive = { shot, world };
