/*
 * THE RENDER CORE — the plumbing under every three.js canvas of the app, written once (plan C5, section 4.4 of
 * code-architecture/plan.md). The purpose renderers beside it (./world.js, ./stage.js, ./preview.js, ./film.js) add
 * only what their job needs; a page mounts one of them and never makes a WebGLRenderer itself (a lint test,
 * ./lint.test.js, holds every `new WebGLRenderer`, `new OrbitControls` and `new EffectComposer` to this file and
 * ./post.js, and every tone mapping and exposure to this file).
 *
 *   createRenderer   the one way to make a renderer: its canvas, pixels, colour space, tone mapping, shadows, clipping,
 *                    and three's WebGLNodesHandler, so TSL node materials draw on it (intent b03f9fb4)
 *   setTone, setExposure, withTone   the picture's response changed later (a sky's hour, a stage's shot): only here
 *   lowPower, topPixelRatio, adaptiveResolution, precompile   how much a device draws, and keeping it smooth
 *   fitTo            a canvas kept to its element's size (and the camera's aspect)
 *   disposeObject    the one way to let go of what a model holds on the graphics card
 *   createControls   the one OrbitControls setup (damped)
 *   materialCache    the one page-side material cache (recipe code keeps its own: it is hashed with its recipe)
 *
 * The post stack (render target, ambient occlusion, bloom, output, a page's own passes) is ./post.js.
 *
 * Why the device rules (Samuel, 2026-10-15: "loading takes quite some time and on mobile almost never loads"): each
 * model shown stayed on the graphics card after the next was picked, so a phone ran out of memory after a few and lost
 * its canvas; and a phone drew at twice its pixels with the desktop's shadows, occlusion and multisampling.
 */
import * as THREE from 'three';
import { install } from './nodes/index.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { reopenOnRestore } from './budget.js';
import { useRenderer } from './arrays.js';

/** tone mappings by name. Every page's picture is formed by PICTURE: Khronos PBR Neutral, which keeps a colour's hue
 *  (0b4c007b: AgX, chosen by 2214e661, cast every noon sepia and darkened the viewers' sky; the films keep their own
 *  chain, ../film/) */
export const TONE = /** @type {const} */ ({ none: THREE.NoToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping });
/** the tone mapping every page's picture is formed by */
export const PICTURE = /** @type {const} */ ('neutral');

/* AgX as three draws it (its tonemapping_pars_fragment), in JavaScript: a colour's picture without a GPU */
const mul3 = (/** @type {number[]} */ m, /** @type {number[]} */ v) => [0, 1, 2].map((i) => m[i] * v[0] + m[i + 3] * v[1] + m[i + 6] * v[2]);
// three's matrices, column by column
const TO2020 = [0.6274, 0.0691, 0.0164, 0.3293, 0.9195, 0.088, 0.0433, 0.0113, 0.8956];
const FROM2020 = [1.6605, -0.1246, -0.0182, -0.5876, 1.1329, -0.1006, -0.0728, -0.0083, 1.1187];
const INSET = [0.856627153315983, 0.137318972929847, 0.11189821299995, 0.0951212405381588, 0.761241990602591, 0.0767994186031903, 0.0482516061458583, 0.101439036467562, 0.811302368396859];
const OUTSET = [1.1271005818144368, -0.1413297634984383, -0.14132976349843826, -0.11060664309660323, 1.157823702216272, -0.11060664309660294, -0.016493938717834573, -0.016493938717834257, 1.2519364065950405];

/**
 * A linear colour as AgX shows it (linear, before the screen's encoding), at an exposure.
 * @param {number[]} c @param {number} [exposure]
 */
export function agx(c, exposure = 1) {
	const x = mul3(INSET, mul3(TO2020, c.map((v) => v * exposure))).map((v) => {
		const t = Math.min(1, Math.max(0, (Math.log2(Math.max(v, 1e-10)) + 12.47393) / 16.5));
		const t2 = t * t, t4 = t2 * t2;
		return 15.5 * t4 * t2 - 40.14 * t4 * t + 31.96 * t4 - 6.868 * t2 * t + 0.4298 * t2 + 0.1191 * t - 0.00232;
	});
	return mul3(FROM2020, mul3(OUTSET, x).map((v) => Math.pow(Math.max(0, v), 2.2))).map((v) => Math.min(1, Math.max(0, v)));
}

/**
 * A linear colour as Khronos PBR Neutral shows it (three's NeutralToneMapping, in JavaScript), at an exposure.
 * @param {number[]} c @param {number} [exposure]
 */
export function neutral(c, exposure = 1) {
	const START = 0.8 - 0.04, DESAT = 0.15;
	let v = c.map((x) => x * exposure);
	const lo = Math.min(v[0], v[1], v[2]);
	const offset = lo < 0.08 ? lo - 6.25 * lo * lo : 0.04;
	v = v.map((x) => x - offset);
	const peak = Math.max(v[0], v[1], v[2]);
	if (peak < START) return v.map((x) => Math.min(1, Math.max(0, x)));
	const d = 1 - START, top = 1 - (d * d) / (peak + d - START);
	v = v.map((x) => (x * top) / peak);
	const g = 1 - 1 / (DESAT * (peak - top) + 1);
	return v.map((x) => Math.min(1, Math.max(0, x + (top - x) * g)));
}

/** a linear colour as the page's picture shows it (PICTURE), at an exposure @param {number[]} c @param {number} [exposure] */
export const tonemap = (c, exposure = 1) => (PICTURE === 'neutral' ? neutral(c, exposure) : agx(c, exposure));

/**
 * The linear colour the page's picture (PICTURE) turns into `target` at an exposure (a backdrop that must come out as
 * its CSS colour, a mood's look): found by iterating, as neither curve has a closed inverse.
 * @param {THREE.Color} target @param {number} [exposure]
 */
export function untonemap(target, exposure = 1) {
	const want = target.toArray();
	let x = want.map((v) => v / exposure);
	for (let it = 0; it < 80; it++) {
		const y = tonemap(x, exposure);
		x = x.map((v, i) => Math.max(0, v * Math.pow(Math.max(want[i], 1e-6) / Math.max(y[i], 1e-6), 0.8)));
	}
	return new THREE.Color(x[0], x[1], x[2]);
}
/** shadow map kinds by name (`true` keeps three's default, PCF; three has had no PCF-soft since r186: asked for, it
 *  drew PCF). VSM is not drawn by node materials (WebGLNodesHandler): a page with them keeps to PCF or basic. */
export const SHADOWS = /** @type {const} */ ({ pcf: THREE.PCFShadowMap, basic: THREE.BasicShadowMap, vsm: THREE.VSMShadowMap });

/**
 * @typedef {object} RendererOptions
 * @property {HTMLCanvasElement} [canvas] draw on this canvas (else the renderer makes one)
 * @property {HTMLElement} [container] put the renderer's canvas in this element
 * @property {boolean} [antialias] multisampling (default true)
 * @property {boolean} [alpha] a see-through canvas
 * @property {WebGLPowerPreference} [power] the GPU asked for
 * @property {boolean} [preserve] keep the drawing buffer (to read it back)
 * @property {number} [pixelRatio] pixels per CSS pixel, as given
 * @property {number} [maxPixelRatio] else the device's, at most this (default 2)
 * @property {THREE.ColorSpace} [colorSpace] the output's (three's default: sRGB)
 * @property {keyof typeof TONE} [toneMapping] none (default) or agx
 * @property {number} [exposure] the tone mapping's exposure (default 1)
 * @property {boolean | keyof typeof SHADOWS} [shadows] shadow maps on (true: three's default kind) and of which kind
 * @property {boolean} [clipping] clipping planes per material
 * @property {() => void} [onLost] the graphics card took the canvas back (the default reaction prevented)
 */

/**
 * The one way to make a renderer: every `new THREE.WebGLRenderer` of the app is this one. It draws TSL node materials
 * (three's WebGLNodesHandler, r184+) beside the classic ones, which it draws exactly as before.
 * @param {RendererOptions} [o]
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(o = {}) {
	const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: o.antialias ?? true, alpha: o.alpha, powerPreference: o.power, preserveDrawingBuffer: o.preserve });
	useRenderer(renderer);
	renderer.setPixelRatio(o.pixelRatio ?? Math.min(o.maxPixelRatio ?? 2, window.devicePixelRatio || 1));
	if (o.colorSpace) renderer.outputColorSpace = o.colorSpace;
	setTone(renderer, o.toneMapping, o.exposure);
	if (o.shadows) {
		renderer.shadowMap.enabled = true;
		if (o.shadows !== true) renderer.shadowMap.type = SHADOWS[o.shadows];
	}
	if (o.clipping) renderer.localClippingEnabled = true;
	nodes(renderer);
	// a phone that let go of its shapes' and pictures' copies once they were drawn (./budget.js `release`) opens the page
	// anew when its context comes back, rather than draw without them
	reopenOnRestore(renderer.domElement);
	if (o.onLost) {
		const lost = o.onLost;
		renderer.domElement.addEventListener('webglcontextlost', (e) => {
			e.preventDefault();
			lost();
		});
	}
	o.container?.appendChild(renderer.domElement);
	return renderer;
}

/**
 * three's WebGLNodesHandler installed on a renderer, so a NodeMaterial (TSL) is built into GLSL and drawn by it. With a
 * handler, three's `compile` draws the shadow maps first (node materials read them as they are built); a compile is
 * held from that extra shadow pass. The kit's node materials are compiled with the rest (`precompile`), so their programs
 * link while a level loads, not mid-walk (ed6694c3): each build meets its own program through the handler
 * (./nodes/index.js `install`), whether a frame or a warm-up made it.
 * @param {THREE.WebGLRenderer} renderer
 */
export function nodes(renderer) {
	const r = /** @type {any} */ (renderer);
	if (typeof r.setNodesHandler !== 'function') return;
	install(r); // three's handler, with what it lacks for us (./nodes/index.js: targets drawn linear, shadows from the light)
	const compile = r.compile;
	if (typeof compile !== 'function') return;
	r.compile = function (scene, camera, target = null) {
		const sm = this.shadowMap, auto = sm.autoUpdate, need = sm.needsUpdate;
		sm.autoUpdate = sm.needsUpdate = false;
		try {
			return compile.call(this, scene, camera, target);
		} finally {
			sm.autoUpdate = auto;
			sm.needsUpdate = need;
		}
	};
}

/**
 * The picture's response set: a tone mapping by name (left as it is when not given) and its exposure. The only place
 * outside createRenderer that sets either.
 * @param {THREE.WebGLRenderer} renderer
 * @param {keyof typeof TONE} [toneMapping]
 * @param {number} [exposure]
 */
export function setTone(renderer, toneMapping, exposure) {
	if (toneMapping) renderer.toneMapping = TONE[toneMapping];
	if (exposure !== undefined) setExposure(renderer, exposure);
}

/** the tone mapping's exposure (a sky's hour, a film's lens) @param {THREE.WebGLRenderer} renderer @param {number} exposure */
export function setExposure(renderer, exposure) {
	renderer.toneMappingExposure = exposure;
}

/**
 * The tone mapping changed for a while (a stage drawing its shots Neutral on a page's renderer): returns the way back.
 * @param {THREE.WebGLRenderer} renderer
 * @param {keyof typeof TONE} toneMapping
 * @returns {() => void}
 */
export function withTone(renderer, toneMapping) {
	const was = renderer.toneMapping;
	renderer.toneMapping = TONE[toneMapping];
	return () => {
		renderer.toneMapping = was;
	};
}

/** A phone or a small tablet, or a device with little memory or few cores: draw less. */
export function lowPower() {
	if (typeof window === 'undefined') return false;
	const nav = /** @type {Navigator & { deviceMemory?: number }} */ (navigator);
	const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
	const small = Math.max(window.screen?.width ?? 0, window.screen?.height ?? 0) < 1100;
	return (touch && small) || (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;
}

/** the most pixels per CSS pixel worth drawing on this device */
export const topPixelRatio = (low = lowPower()) => Math.min(low ? 1.5 : 2, window.devicePixelRatio || 1);

/**
 * A resolution that follows the frame rate: call it once a frame. Slow frames lower the pixel ratio a step (never under
 * `floor`), quick ones raise it again (never over the device's top); `onChange` is told, to resize what depends on it.
 * While `hold()` says so (a model being built) frames are not counted: a long build is not a slow device.
 * @param {THREE.WebGLRenderer} renderer
 * @param {{ top?: number, floor?: number, hold?: () => boolean, onChange?: () => void }} [o]
 */
export function adaptiveResolution(renderer, { top = topPixelRatio(), floor = 1, hold, onChange } = {}) {
	let frames = 0, since = performance.now();
	return (now = performance.now()) => {
		if (hold?.()) {
			frames = 0;
			since = now;
			return;
		}
		frames++;
		if (now - since < 1500) return;
		const fps = (frames * 1000) / (now - since);
		const pr = renderer.getPixelRatio();
		let next = pr;
		if (fps < 30 && pr > floor) next = Math.max(floor, pr - 0.25);
		else if (fps > 55 && pr < top) next = Math.min(top, pr + 0.125);
		if (next !== pr) {
			renderer.setPixelRatio(next);
			onChange?.();
		}
		frames = 0;
		since = now;
	};
}

/** how long a warm-up waits at most on the driver's links (ms): what is not linked by then is waited on at its first draw */
const LINKED = 4000;

/**
 * Compile a model's shaders before it is first drawn, linked off the page's thread where the browser can
 * (KHR_parallel_shader_compile), so the page never stalls on the first frame; a browser that cannot simply links them
 * now. Never throws: a model that fails here is still drawn the usual way. The one warm-up of the app: nothing else
 * compiles ahead (./lint.test.js). The kit's node materials too, each paired with its program as it is built (`nodes`):
 * walking Sandbox 5, Safari linked 47 of them mid-walk when they were left to their first frame (660ad67f). Waits as
 * three's `compileAsync` does, on each program's completion, but never past LINKED.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Object3D} object
 * @param {THREE.Camera} camera
 * @param {THREE.Scene} [scene]
 * @returns {Promise<void>}
 */
export function precompile(renderer, object, camera, scene) {
	/** @type {Set<THREE.Material>} */
	let left;
	try {
		left = renderer.compile(object, camera, scene);
	} catch {
		return Promise.resolve(); // drawn as usual
	}
	const end = performance.now() + LINKED;
	return new Promise((done) => {
		const check = () => {
			for (const m of left) {
				const p = /** @type {any} */ (renderer.properties.get(m)).currentProgram;
				if (!p || p.isReady()) left.delete(m);
			}
			if (!left.size || performance.now() > end) return done();
			setTimeout(check, 10);
		};
		check();
	});
}

/**
 * A renderer's canvas kept to an element's size: at once, whenever the element changes size (and the window, for a
 * phone's bars that settle the element only after it), the drawing buffer, the camera's aspect (or `fit`), then
 * `onResize`.
 * @param {THREE.WebGLRenderer} renderer
 * @param {HTMLElement} el
 * @param {{ camera?: THREE.PerspectiveCamera, fit?: (camera: THREE.PerspectiveCamera, w: number, h: number) => void, style?: boolean, window?: boolean, now?: boolean, onResize?: (w: number, h: number) => void }} [o]
 *   style: set the canvas's CSS size too (default true); now: fit at once (default true)
 * @returns {{ fit: () => void, dispose: () => void }}
 */
export function fitTo(renderer, el, { camera, fit, style = true, window: win = false, now = true, onResize } = {}) {
	// the size it was fitted to (as made, when it is not fitted at once): the observer's first call changes nothing
	let size = `${el.clientWidth}x${el.clientHeight}`;
	const resize = () => {
		const w = el.clientWidth, h = el.clientHeight;
		size = `${w}x${h}`;
		renderer.setSize(w, h, style);
		if (camera && fit) fit(camera, w, h);
		else if (camera) {
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
		onResize?.(w, h);
	};
	const watch = new ResizeObserver(() => size !== `${el.clientWidth}x${el.clientHeight}` && resize());
	watch.observe(el);
	if (win) window.addEventListener('resize', resize);
	if (now) resize();
	return {
		fit: resize,
		dispose() {
			watch.disconnect();
			if (win) window.removeEventListener('resize', resize);
		}
	};
}

const MAPS = /** @type {const} */ (['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'displacementMap', 'lightMap', 'clearcoatNormalMap', 'transmissionMap', 'thicknessMap']);

/**
 * Each frame only what is seen is placed: three.js works out every object's place in the world before each render,
 * hidden or not — 17,489 objects in Sandbox 3's cell, 3,001 of them seen. This makes the render work out the places of
 * the visible ones only (and of everything under them); a hidden one is marked to be placed again once it is shown, so
 * none is ever drawn where it was. Called once on a world's scene; every render of it then does this.
 * @param {THREE.Scene} scene
 */
export function placeSeenOnly(scene) {
	scene.matrixWorldAutoUpdate = false;
	const before = scene.onBeforeRender;
	scene.onBeforeRender = function (...a) {
		place(scene, false);
		before.apply(this, a);
	};
}
/** three.js's updateMatrixWorld, going no further into what is hidden @param {THREE.Object3D} o @param {boolean} force */
export function place(o, force) {
	if (o.matrixAutoUpdate) o.updateMatrix();
	if (o.matrixWorldNeedsUpdate || force) {
		if (o.parent === null) o.matrixWorld.copy(o.matrix);
		else o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix);
		o.matrixWorldNeedsUpdate = false;
		force = true;
		// and what three.js's own updateMatrixWorld does past the matrix for these two: a skinned mesh's bind (the
		// village's hens and goats were skinned against where they stood when built, and drawn there, out of sight) and a
		// camera's view
		if (/** @type {any} */ (o).isSkinnedMesh) {
			const m = /** @type {THREE.SkinnedMesh} */ (o);
			m.bindMatrixInverse.copy(m.bindMode === THREE.AttachedBindMode ? m.matrixWorld : m.bindMatrix).invert();
		} else if (/** @type {any} */ (o).isCamera) /** @type {THREE.Camera} */ (o).matrixWorldInverse.copy(o.matrixWorld).invert();
	}
	const kids = o.children;
	for (let i = 0; i < kids.length; i++) {
		const c = kids[i];
		if (c.visible) place(c, force);
		// hidden: placed again once shown, wherever what it hangs on has gone meanwhile
		else if (force) c.matrixWorldNeedsUpdate = true;
	}
}

/**
 * Let go of everything under `root` on the graphics card: its geometries and skeletons, and (unless told not to) its
 * materials and their textures. They can still be drawn again (three uploads them anew), so a material shared with
 * the next model is safe; `keep` names materials not to touch (a viewer's own highlight and ghost). `materials: false`
 * frees the shapes only, for a scene whose materials are shared with what stays; `textures: false` keeps the pictures.
 * @param {THREE.Object3D | null | undefined} root
 * @param {{ materials?: boolean, textures?: boolean, keep?: Set<THREE.Material> }} [o]
 */
export function disposeObject(root, { materials = true, textures = true, keep } = {}) {
	if (!root) return;
	/** @type {Set<THREE.Material>} */
	const mats = new Set();
	root.traverse((o) => {
		const m = /** @type {THREE.Mesh & { skeleton?: THREE.Skeleton }} */ (o);
		m.geometry?.dispose?.();
		m.skeleton?.dispose();
		if (materials) for (const mat of [m.material ?? []].flat()) if (mat && !keep?.has(mat)) mats.add(mat);
	});
	for (const mat of mats) {
		if (textures) {
			const any = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (mat));
			for (const k of MAPS) /** @type {THREE.Texture | undefined} */ (any[k])?.dispose?.();
		}
		mat.dispose();
	}
}

/**
 * The renderer let go of, its context too, and its canvas taken off the page. The context is lost on purpose: a browser
 * keeps a context's memory on the graphics card until the canvas is collected, and a tablet opening one viewer after
 * another (a proposal's world, then the next) ran out of it before that came (iPad Safari: "A problem repeatedly
 * occurred").
 * @param {THREE.WebGLRenderer} renderer
 */
export function disposeRenderer(renderer) {
	renderer.dispose();
	renderer.forceContextLoss();
	renderer.domElement.remove();
}

/**
 * The one OrbitControls setup: damped, then any of its settings (`target` copied).
 * @param {THREE.Camera} camera
 * @param {HTMLElement} dom
 * @param {Partial<Omit<OrbitControls, 'target'>> & { target?: THREE.Vector3 }} [o]
 * @returns {OrbitControls}
 */
export function createControls(camera, dom, { target, ...set } = {}) {
	const controls = new OrbitControls(camera, dom);
	controls.enableDamping = true;
	Object.assign(controls, set);
	if (target) controls.target.copy(target);
	return controls;
}

/**
 * @typedef {(<M extends THREE.Material>(key: string, make: () => M) => M) & { dispose: () => void, readonly size: number }} MaterialCache
 */

/**
 * A material cache: one material per key (a world's colours), made by `make` the first time it is asked for and shared
 * by every mesh that asks again, so the graphics card compiles and holds each once. A module's cache lives as long as
 * the page (its worlds' disposeObject keeps shared materials, `materials: false`); `dispose()` lets one go with what
 * used it.
 * @returns {MaterialCache}
 */
export function materialCache() {
	/** @type {Map<string, THREE.Material>} */
	const kept = new Map();
	const get = /** @type {MaterialCache} */ (
		/** @type {unknown} */ (
			(/** @type {string} */ key, /** @type {() => THREE.Material} */ make) => {
				let m = kept.get(key);
				if (!m) kept.set(key, (m = make()));
				return m;
			}
		)
	);
	Object.defineProperty(get, 'size', { get: () => kept.size });
	get.dispose = () => {
		for (const m of kept.values()) m.dispose();
		kept.clear();
	};
	return get;
}
