/**
 * The sky's clouds (./universe.js draws them over its air): fair-weather cumulus on a plane, made of noise in the
 * sky's own shader, drifting with the hour. No picture is read.
 *
 * The noise only ever reads small numbers (intent c929d52c): a GPU's float holds 24 bits, so a coordinate in the
 * hundred thousands leaves no fraction of a cell and the clouds come out as flat blocks. Each octave's lattice repeats
 * every `period` cells of the first, and the day's drift is a whole number of periods: the hour reaches the shader as
 * a fraction of the day (`windOf`), no coordinate passes a few hundred cells, and midnight joins without a jump.
 */
import { Fn, If, dot, exp, float, floor, fract, max, mix, normalize, pow, smoothstep, sub, vec2, vec3 } from 'three/tsl';

/**
 * plane: how flat the layer lies (d.xz / (plane · d.y)); freq: cells of the first octave per unit of the plane;
 * period: cells after which the first octave repeats; horizon: below this height (d.y) the layer has faded out
 */
export const CLOUDS = Object.freeze({ plane: 0.55, freq: 0.8, period: 16, horizon: 0.06 });
/** Each octave's slide over one day, in whole periods of its own lattice along x and z: the first carry the shapes
 * with the wind, the fine ones cross them, so a cloud changes as it goes. */
export const SLIDES = Object.freeze([[1, 0], [1, 0], [1, 1], [1, 1], [2, 1]]);

/** How far through its day the wind is at an hour, 0…1. @param {number} hour */
export const windOf = (hour) => (((hour % 24) + 24) % 24) / 24;

/** How much of the layer shows at height h (d.y): none at and under the horizon. @param {number} h */
export function fadeOf(h) {
	const t = Math.min(1, Math.max(0, h / CLOUDS.horizon));
	return t * t * (3 - 2 * t);
}

/**
 * The coordinates each octave's noise reads along d at an hour, as a GPU's float works them out (the shader's sums,
 * in the same order): what ./clouds.test.js holds small. @param {number[]} d unit, up +y @param {number} hour
 * @returns {[number, number][]}
 */
export function coordsOf(d, hour) {
	const f = Math.fround, { plane, freq, period } = CLOUDS;
	const wind = f(windOf(hour)), flat = f(f(d[1]) * f(plane));
	const u = [f(f(f(d[0]) / flat) * f(freq)), f(f(f(d[2]) / flat) * f(freq))];
	return SLIDES.map(([sx, sz], k) => [f(f(u[0] * 2 ** k) + f(wind * period * 2 ** k * sx)), f(f(u[1] * 2 ** k) + f(wind * period * 2 ** k * sz))]);
}

// a sinless hash, so every GPU makes the same clouds; fed a lattice point within its period
const grad = Fn(([/** @type {any} */ i]) => {
	const p = fract(i.xyx.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
	p.addAssign(dot(p, p.yzx.add(33.33)));
	return fract(p.xx.add(p.yz).mul(p.zy)).mul(2).sub(1);
});
/** gradient noise that repeats every `per` cells, about −1…1; `seed` tells the octaves apart */
const noise = (/** @type {any} */ p, /** @type {number} */ per, /** @type {number} */ seed) => {
	const i = floor(p), f = fract(p);
	const u = f.mul(f).mul(f).mul(f.mul(f.mul(6).sub(15)).add(10));
	const n = (/** @type {number} */ x, /** @type {number} */ y) => {
		const c = i.add(vec2(x, y));
		return dot(grad(c.sub(floor(c.div(per)).mul(per)).add(seed)), f.sub(vec2(x, y)));
	};
	return mix(mix(n(0, 0), n(1, 0), u.x), mix(n(0, 1), n(1, 1), u.x), u.y).mul(1.6);
};
/** the first `octaves` of the clouds' noise at u (cells of the first octave), each slid by the wind */
const fbm = (/** @type {any} */ u, /** @type {any} */ wind, /** @type {number} */ octaves) => {
	let n = /** @type {any} */ (float(0));
	for (let k = 0; k < octaves; k++) {
		const s = 2 ** k, per = CLOUDS.period * s;
		const o = noise(u.mul(s).add(wind.mul(vec2(per * SLIDES[k][0], per * SLIDES[k][1]))), per, 19 * k);
		// the two coarse octaves are the cloud's body; the fine ones billow (round bulges, sharp creases between them)
		n = n.add((k < 2 ? o : o.abs().mul(1.6).sub(0.4)).mul(0.58 ** k));
	}
	return n;
};

/**
 * The clouds laid over the sky's colour along d: lit by the sun through the air on the side that faces it, shaded on
 * the far side and in their thick middles, bright-rimmed toward the sun, thinning to the horizon.
 * @param {any} sky the sky's colour there, a variable: assigned
 * @param {{ d: any, lin: any, fex: any, sun: any, light: any, cover: any, wind: any }} o d: the eye's direction (unit);
 *   lin, fex: the air's scattered light and its extinction along d; light: the sun's light where the clouds are (through
 *   the air: white from high up, red from the horizon); cover: how much of the sky they cover (0: none);
 *   wind: `windOf` the hour
 */
export function cloudsOver(sky, { d, lin, fex, sun, light, cover, wind }) {
	const h = d.y, { plane, freq, period, horizon } = CLOUDS;
	If(h.greaterThan(0).and(cover.greaterThan(0)), () => {
		const flat = d.xz.div(h.mul(plane)).mul(freq);
		// where they gather: one slow octave, carried with the wind; it also bends the plane a little, so no edge runs straight
		const gather = noise(flat.mul(0.25).add(wind.mul(vec2(period * 0.25, 0))), period * 0.25, 7);
		const u = flat.add(vec2(gather, gather.negate()).mul(0.35)).toVar();
		const open = sub(1, cover.add(gather.mul(0.22)).clamp(0, 1)).toVar();
		const depth = max(0, fbm(u, wind, SLIDES.length).mul(0.7).add(0.5).sub(open)).toVar();
		// the same cloud a little way toward the sun, coarsely: what stands between this spot and its light
		const sunAt = sun.xz.div(max(sun.y, 0.12).mul(plane)).mul(freq);
		const before = max(0, fbm(u.add(normalize(sunAt.sub(u).add(1e-4)).mul(0.22)), wind, 2).mul(0.9).add(0.5).sub(open));
		// seen from below: light comes through the thin edges, the thick middles are the grey bases; a low sun shines
		// under them and lights the bases too
		const thin = exp(depth.mul(-6)), low = sub(1, smoothstep(0.05, 0.4, sun.y));
		const shade = mix(0.26, 1, exp(before.mul(-9))).mul(mix(mix(0.4, 0.85, low), 1, thin));
		// toward the sun they glow (light scattered on through them), away from it they are lit from the front, between the two least
		const toward = dot(d, sun), glow = pow(max(toward, 0), 3).mul(0.5).add(pow(max(toward.negate(), 0), 2).mul(0.15)).add(0.82);
		const rim = pow(max(toward, 0), 24).mul(thin).mul(0.35).add(1);
		const day = smoothstep(-0.08, 0.3, sun.y).max(0.03);
		const cloud = lin.mul(0.036).add(light.mul(0.024).mul(shade).mul(rim).mul(glow)).mul(day);
		sky.assign(mix(sky, mix(sky, cloud, fex), sub(1, exp(depth.mul(-9))).mul(smoothstep(0, horizon, h))));
	});
}
