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
import { makeRenderer } from '../content/render/core.js';
import { createSky } from '../content/sandbox-kit/sky.js';
import { cameraAt, stepAt, worldAt, type CameraKey, type World } from './live';
import { blobWorker, buildWorld, built, engineOf, type WorldBuildSpec } from './world-build';

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
/** the frozen engine `hash` as a worker of this frame (its policy lets workers come only from blob:), its URL kept */
const worker = (hash: string) => blobWorker(hash, () => code(hash));

/** a word to the player outside the frame (intent 90de96fb): how far a shot's build is, or why it failed */
const tell = (m: Record<string, unknown>) => {
	if (W.parent && W.parent !== W) W.parent.postMessage({ play: 1, ...m }, '*');
};
/** a shot's build that failed: the player shows why, never waits on "Loading" for ever */
const failed = (id: string, what: string) => (e: any) => (console.error(id, e), tell({ op: 'failed', shot: id, error: `${what} could not be built: ${e?.message ?? e}` }));

/** a clip `id` drawn on its canvas once `made`: its poster (the shot's still) shown until then, HyperFrames' renderer
 *  and player held for it, and a failure told to the player; t on the story's timeline from `at` for `duration`, a
 *  setter a tween drives, so every seek (played, scrubbed or rendered) draws it */
function clip(tl: any, id: string, at: number, duration: number, made: (canvas: HTMLCanvasElement) => Promise<unknown>, draw: (t: number) => void, what: string) {
	const el = document.getElementById(id)!;
	const canvas = el.querySelector('canvas') as HTMLCanvasElement, poster = el.querySelector('img');
	let t = 0;
	const done = made(canvas).then(() => {
		draw(t);
		canvas.style.visibility = 'visible';
		if (poster) poster.style.visibility = 'hidden';
	});
	done.catch(failed(id, what));
	((W.__hf ??= {}).buildReady ??= {})[id] = done;
	const o = { set t(v: number) { draw((t = v)); }, get t() { return t; } };
	tl.fromTo(o, { t: 0 }, { t: duration, duration, ease: 'none', immediateRender: false }, at);
}

/** one live shot on the story's timeline `tl`: its element `id` (a poster and a canvas in it) */
function shot(tl: any, id: string, spec: Spec) {
	const [w, h] = spec.size;
	let shown: Shown[] | null = null, on = -1, drawn = NaN;
	let stage: Stage, camera: THREE.PerspectiveCamera;

	const draw = (t: number) => {
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
	clip(tl, id, spec.at, spec.duration, async (canvas) => {
		const recipe = { hash: spec.recipe, code: withPieces(code(spec.recipe), spec.pieces.map((hash) => ({ hash, code: code(hash) }))) };
		const engine = engineOf(recipe, spec.engine.v, worker(spec.engine.hash));
		try {
			const builds: Shown[] = [];
			for (const given of spec.builds) {
				const got = built(await engine.build(Object.keys(given ?? {}).length ? given : undefined), spec.recipe);
				builds.push({ obj: got.obj, hero: heroOf(got) });
			}
			const renderer = await makeRenderer({ canvas, pixelRatio: 1, shadows: 'pcf', preserve: true });
			renderer.setSize(w, h, false);
			camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 2000);
			stage = new Stage(renderer, camera, { sky: true });
			stage.resize(w, h);
			shown = builds;
		} finally {
			engine.end();
		}
	}, draw, 'a live shot');
}

/** a world's shot: its element, its moment and length on the story, its camera, hour, exposure and lights */
type WorldShot = Pick<World, 'camera' | 'hour' | 'exposure' | 'lights'> & { id: string; at: number; duration: number };
/** what compose.ts hands a world (intent 4f7a2178): its engine, recipe, pieces and guests by hash, its frames at the
 *  story's fps from `at`, over every one of its shots, and those shots */
type WorldSpec = WorldBuildSpec & { size: [number, number]; at: number; shots: WorldShot[] };

/**
 * A world on the story's timeline `tl`, played in every shot of it: built once (./world-build.ts), its guests placed
 * once, one renderer, and its traffic on one clock, the story's, so its cars move on across every cut. Each shot is its
 * own element (a poster and a canvas): at its own t it draws the world from its camera, at its hour, exposure and
 * lights, and takes the picture onto its canvas, so two shots dissolving show both.
 */
function world(tl: any, spec: WorldSpec) {
	const [w, h] = spec.size;
	let renderer: any, scene: THREE.Scene, camera: THREE.PerspectiveCamera, sky: ReturnType<typeof createSky>, mood: any;
	let copies: THREE.Object3D[] = [], places: Float32Array[] = [];
	const lamps: { light: THREE.Light; k: number }[] = [];
	const made = (async () => {
		const got = await buildWorld(spec, { code, worker: worker(spec.engine.hash), progress: (p) => tell({ op: 'progress', shot: spec.shots[0]?.id, ...p }) });
		mood = got.info.mood;
		scene = new THREE.Scene();
		got.obj.traverse((x: any) => {
			if (x.isMesh) x.receiveShadow = x.castShadow = true;
		});
		scene.add(got.obj, ...got.copies);
		copies = got.copies;
		places = got.places;
		scene.traverse((x: any) => {
			if (x.isLight && !x.isDirectionalLight && !x.isHemisphereLight) lamps.push({ light: x, k: x.intensity });
		});
		const gl = document.createElement('canvas');
		renderer = await makeRenderer({ canvas: gl, pixelRatio: 1, toneMapping: 'agx', shadows: 'pcf', preserve: true });
		renderer.setSize(w, h, false);
		camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 20000);
		sky = createSky(renderer, scene, { shadowReach: 500, fog: { far: 1400 } });
	})();
	for (const s of spec.shots) {
		let pen: CanvasRenderingContext2D | null = null, drawn = NaN;
		const draw = (t: number) => {
			if (!pen || t === drawn) return;
			drawn = t;
			const at = worldAt(s, t, spec.fps, spec.frames, s.at - spec.at);
			const m = places[Math.min(at.frame, places.length - 1)];
			copies.forEach((c, i) => c.matrix.fromArray(m, i * 16));
			// the hour's sun over the world's mood, then each light scaled by the shot and the exposure in stops
			sky.mood(at.sun ? { ...mood, sun: at.sun.sun, az: at.sun.az } : mood);
			sky.sun.intensity *= at.lights.sun;
			scene.environmentIntensity *= at.lights.sky;
			for (const l of lamps) l.light.intensity = l.k * at.lights.lamps;
			renderer.toneMappingExposure *= 2 ** at.exposure;
			camera.position.set(...at.camera.eye);
			camera.fov = at.camera.fov;
			camera.updateProjectionMatrix();
			camera.lookAt(...at.camera.target);
			renderer.render(scene, camera);
			pen.clearRect(0, 0, w, h);
			pen.drawImage(renderer.domElement, 0, 0, w, h);
		};
		clip(tl, s.id, s.at, s.duration, (canvas) => made.then(() => void (pen = canvas.getContext('2d'))), draw, 'a world shot');
	}
}

W.playLive = { shot, world };
