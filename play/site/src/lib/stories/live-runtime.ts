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
import { cameraAt, stepAt, type CameraKey } from './live';

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

/** the frozen engine as a worker of this frame, its builds asked one after another */
function engineOf(spec: Spec) {
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
	return {
		build: async (given: Record<string, string>) => {
			await ready;
			const id = next++;
			const m: any = await new Promise((ok) => (asks.set(id, ok), worker.postMessage({ id, op: 'build', recipe, given, args: [], engine: spec.engine.v })));
			if (!m.ok) throw new Error(`live: the build failed: ${m.error}`);
			return m;
		},
		end: () => worker.terminate()
	};
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
				const m = await engine.build(given);
				const verdict = checkCard(m.card);
				if (!verdict.ok) throw new Error(`refused: its card does not fit: ${verdict.errors.slice(0, 3).join('; ')}`);
				if (m.card.recipe !== spec.recipe) throw new Error('refused: its card names another recipe');
				const got = { obj: rebuild(m.data), card: m.card };
				builds.push({ obj: got.obj, hero: heroOf(got) });
			}
			const renderer = createRenderer({ canvas, pixelRatio: 1, shadows: 'soft', preserve: true });
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

W.playLive = { shot };
