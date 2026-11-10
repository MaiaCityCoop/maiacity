/**
 * The sky's clouds (./universe.js draws them over its air): fair-weather streaks on a plane, made of noise in the
 * sky's own shader, drifting with the hour. No picture is read.
 */
import { Fn, If, Loop, clamp, dot, exp, float, floor, fract, max, mix, smoothstep, sub, vec2, vec3 } from 'three/tsl';

/** How far the clouds have drifted at an hour of the sky. @param {number} hour */
export const driftOf = (hour) => hour * 60;

// value noise: a sinless hash, so every GPU makes the same clouds
const grad = Fn(([/** @type {any} */ i]) => {
	const p = fract(i.xyx.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
	p.addAssign(dot(p, p.yzx.add(33.33)));
	return fract(p.xx.add(p.yz).mul(p.zy)).mul(2).sub(1);
});
const noise = Fn(([/** @type {any} */ p]) => {
	const i = floor(p), f = fract(p);
	const u = f.mul(f).mul(f).mul(f.mul(f.mul(6).sub(15)).add(10));
	const n = (/** @type {number} */ x, /** @type {number} */ y) => dot(grad(i.add(vec2(x, y))), f.sub(vec2(x, y)));
	return mix(mix(n(0, 0), n(1, 0), u.x), mix(n(0, 1), n(1, 1), u.x), u.y).mul(1.6);
});

/**
 * The clouds laid over the sky's colour along d, lit by the sun through the air, thinning to the horizon.
 * @param {any} sky the sky's colour there, a variable: assigned
 * @param {{ d: any, lin: any, fex: any, sun: any, sunE: any, cover: any, drift: any }} o d: the eye's direction (unit);
 *   lin, fex: the air's scattered light and its extinction along d; cover: how much of the sky they cover (0: none);
 *   drift: `driftOf` the hour
 */
export function cloudsOver(sky, { d, lin, fex, sun, sunE, cover, drift }) {
	const h = d.y;
	If(h.greaterThan(0).and(cover.greaterThan(0)), () => {
		const q = d.xz.div(h.mul(0.55)).mul(0.0002).add(drift).mul(1000).toVar();
		const n = float(0).toVar(), amp = float(1).toVar();
		Loop(4, () => {
			n.addAssign(amp.mul(noise(q)));
			amp.mulAssign(0.5);
			q.mulAssign(2).addAssign(drift.mul(300));
		});
		const dens = n.mul(0.7).add(0.5).clamp(0, 1);
		const cov = clamp(cover.add(noise(d.xz.div(h.mul(0.55)).mul(0.06)).mul(0.22)), 0, 1);
		const depth = max(0, dens.sub(sub(1, cov)));
		const fade = smoothstep(0, 0.06, h);
		const beer = exp(depth.mul(-4));
		const lit = fex.mul(sunE).mul(0.0088).mul(mix(0.45, 1, beer.mul(sub(1, beer.mul(beer))).mul(2.6).clamp(0, 1)));
		const cloud = lin.mul(0.04).add(lit).mul(smoothstep(-0.08, 0.3, sun.y).max(0.03));
		sky.assign(mix(sky, mix(sky, cloud, fex), sub(1, exp(depth.mul(-4.8))).mul(fade)));
	});
}
