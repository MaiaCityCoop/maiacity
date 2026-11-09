/*
 * THE FINISHING PLAN — which passes finish a world's picture on which device, and what they cost (intent 1f0c6f79).
 * A plan is plain data, decided here once for every world, sandbox and the viewer; ./post.js `createFinish` builds the
 * one RenderPipeline from it, ./atmosphere.js lays the haze it asks for.
 *
 * - **desktop:** ambient occlusion (SSAO, half resolution, denoised) on the ambient light only (three's
 *   builtinAOContext: the sun's light is never darkened by it, nor anything see-through); temporal anti-aliasing
 *   (TRAA, the scene's velocity beside its colour); bloom above an HDR threshold at half resolution, low; the grade
 *   (./grade.js WORLD); the sun's contact shadows in screen space (SSS); the haze to its full reach.
 * - **small** (a phone, a small tablet, a GPU with little memory): none of AO, bloom or contact shadows; the scene at
 *   0.7 of the screen's pixels, brought up to it by TAAU (its anti-aliasing and upscaling in one); the haze closer.
 * - **film** (either device, for a frame-exact film): no temporal jitter (MSAA instead of TRAA or TAAU) and the scene
 *   at the screen's full pixels, so a frame is the same picture however it is reached.
 * - **ghosts** (a world whose motion TRAA smears, as without velocity of its own): MSAA instead of TRAA.
 *
 * The budget is in milliseconds at 1440 × 900 on the Mac's GPU (intent 9's head plus at most 2.0 ms at each view): each
 * pass's cost at that size, scaled by the pixels it covers. The passes are screen-space: their cost is the screen's
 * and the same at the near, mid and far views (the scene's own draws, the census's, are counted apart).
 */
import { WORLD } from './grade.js';

/** @typedef {'desktop' | 'small'} Device */

/**
 * @typedef {object} Plan
 * @property {Device} device
 * @property {boolean} film
 * @property {null | { kind: 'ssao', scale: number, radius: number, intensity: number }} ao on the ambient light only
 * @property {'traa' | 'taau' | 'msaa'} aa
 * @property {number} samples the scene pass's multisampling (MSAA's 4, else 0: TRAA and TAAU resolve their own edges)
 * @property {boolean} jitter whether the camera is jittered frame to frame (TRAA, TAAU)
 * @property {null | { threshold: number, strength: number, radius: number, scale: number }} bloom
 * @property {{ vig: number, grain: number, sat: number, lut: number }} grade
 * @property {null | { maxDistance: number, thickness: number, intensity: number, scale: number }} contact the sun's screen-space contact shadows
 * @property {{ reach: number }} fog how far the haze reaches, of the world's own (closer on a small device)
 * @property {number} scale the scene's pixels, of the screen's
 * @property {null | 'taau'} upscale how the scene is brought up to the screen
 */

/** the bounds a plan is held to */
export const LIMITS = /** @type {const} */ ({ ms: 2.0, smallScale: [0.6, 0.75], at: [1440, 900] });

/**
 * Each pass's cost, ms, at 1440 × 900 on the Mac's GPU (Apple M-series, Metal through WebGPU), at the resolution the
 * plan draws it (AO, bloom and the contact shadows at half): three's examples measured there, rounded up. `prepass` is
 * the depth and normals AO reads before the scene is lit (only the ambient light takes AO): geometry-bound, an estimate
 * at Sandbox 1's near view, its fragments as cheap as can be. The Mac job (c5) measures them all.
 */
export const COST = /** @type {const} */ ({ prepass: 0.35, ssao: 0.5, denoise: 0.15, traa: 0.3, taau: 0.4, msaa: 0.25, bloom: 0.3, grade: 0.08, contact: 0.2, finite: 0.02, output: 0.05 });

/**
 * The device a page is drawn on: small where the screen is a phone's or a small tablet's and touched, or the device has
 * little memory.
 * @param {{ width: number, height: number, coarse?: boolean, memory?: number }} d CSS pixels; a coarse pointer; GB
 * @returns {Device}
 */
export function deviceOf(d) {
	if (d.memory !== undefined && d.memory <= 4) return 'small';
	return d.coarse && Math.min(d.width, d.height) < 820 ? 'small' : 'desktop';
}

/** the device this browser is (deviceOf of its window), desktop where there is none */
export function thisDevice() {
	if (typeof window === 'undefined') return 'desktop';
	const nav = /** @type {any} */ (globalThis.navigator ?? {});
	const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
	return deviceOf({ width: window.innerWidth, height: window.innerHeight, coarse, memory: nav.deviceMemory });
}

/**
 * The plan for a device.
 * @param {{ device?: Device, film?: boolean, ghosts?: boolean }} [o]
 * @returns {Plan}
 */
export function finishing(o = {}) {
	const device = o.device ?? 'desktop', film = !!o.film, small = device === 'small';
	/** @type {Plan['aa']} */
	const aa = film || o.ghosts ? 'msaa' : small ? 'taau' : 'traa';
	return {
		device,
		film,
		ao: small ? null : { kind: 'ssao', scale: 0.5, radius: 0.6, intensity: 1 },
		aa,
		samples: aa === 'msaa' ? 4 : 0,
		jitter: aa !== 'msaa',
		bloom: small ? null : { threshold: 1.0, strength: 0.15, radius: 0.4, scale: 0.5 },
		grade: { ...WORLD },
		contact: small ? null : { maxDistance: 0.5, thickness: 0.05, intensity: 0.8, scale: 0.5 },
		fog: { reach: small ? 0.7 : 1 },
		// a film is drawn at the screen's full pixels: no upscaler without jitter
		scale: small && !film ? 0.7 : 1,
		upscale: small && !film ? 'taau' : null
	};
}

/**
 * What a plan costs, ms, on a screen of `at` pixels (1440 × 900 by default), pass by pass and in all.
 * @param {Plan} p @param {[number, number]} [at]
 */
export function costOf(p, at = /** @type {[number, number]} */ ([...LIMITS.at])) {
	const k = (at[0] * at[1]) / (LIMITS.at[0] * LIMITS.at[1]), s = k * p.scale * p.scale;
	/** @type {Record<string, number>} */
	const passes = { output: COST.output * k, finite: COST.finite * s };
	if (p.ao) (passes.prepass = COST.prepass * s), (passes.ssao = COST.ssao * s), (passes.denoise = COST.denoise * s);
	if (p.contact) passes.contact = COST.contact * s;
	passes[p.aa] = COST[p.aa] * (p.aa === 'taau' ? k : s);
	if (p.bloom) passes.bloom = COST.bloom * k;
	passes.grade = COST.grade * k;
	const ms = Object.values(passes).reduce((a, b) => a + b, 0);
	return { passes, ms };
}

/** the passes `?finish=` may leave out, to see what each does: `?finish=off` draws the scene unfinished, `?finish=-bloom,-ao` drops those */
export const DROPS = /** @type {const} */ (['ao', 'bloom', 'contact', 'grade', 'fog', 'aa']);

/**
 * A plan with the passes `spec` names left out (`off`, or `-ao,-bloom,…`), as the address's `?finish=` asks; null for
 * `off`. Unknown words are ignored.
 * @param {Plan} p @param {string | null | undefined} spec
 * @returns {Plan | null}
 */
export function withDrops(p, spec) {
	if (!spec) return p;
	const words = spec.split(',').map((w) => w.trim().replace(/^-/, ''));
	if (words.includes('off')) return null;
	const q = { ...p };
	if (words.includes('ao')) q.ao = null;
	if (words.includes('bloom')) q.bloom = null;
	if (words.includes('contact')) q.contact = null;
	if (words.includes('grade')) q.grade = { vig: 0, grain: 0, sat: 1, lut: 0 };
	if (words.includes('fog')) q.fog = { reach: 0 };
	if (words.includes('aa')) (q.aa = 'msaa'), (q.samples = 0), (q.jitter = false), (q.scale = 1), (q.upscale = null);
	return q;
}

