// @ts-nocheck — TSL's node types are loose
/*
 * THE ATMOSPHERE — the air between the eye and what it sees, on every world (intent 1f0c6f79): the sky's haze as it
 * was (its density, the colour of the horizon the eye looks toward, a world's mood laid over it, ../sandbox-kit/sky.js),
 * made to pool low and thin with the eye's height, warmer toward the sun (Íñigo Quílez's sun-tinted fog), with aerial
 * perspective: what is far loses its colour into the haze before the haze covers it. The far plane follows the haze.
 *
 * The haze keeps the sky's FogExp2 at eye level: a thing d away is hidden as 1 − e^(−(ρd)²), ρ the sky's density this
 * frame (a mood's thinned with the eye's height by the sky itself). Along a ray that climbs or falls Δy the air is
 * thinner or thicker, σ(h) ∝ e^(−b·h): the ray's mean density is ρ · (1 − e^(−b·Δy)) / (b·Δy), held between SLOPE's
 * bounds so a view from high above into the valley thickens and never whites out; and the eye's own height thins it,
 * e^(−b·y₀). So τ = (ρ · e^(−b·y₀) · d · s)², T = e^(−τ). The same sums run on the CPU here (`opticalDepth`,
 * `transmittance`, `hazeColor`, `aerial`, `farFor`) and on the GPU as the scene's fog node (`atmosphereNode`), so the
 * tests check the numbers the picture is drawn by.
 *
 * Its colour is the sky's fog colour (the horizon looked toward, a mood's haze mixed in), which the sky keeps as the
 * picture shows it: turned back to the scene's light through the page's tone mapping at its exposure (./core.js
 * `untonemap`), once a frame on the CPU, then warmed toward the sun per pixel.
 *
 * Only node materials take it (WebGPURenderer, intent c1bee1f8): `scene.fogNode` stands in for the sky's FogExp2, read
 * each frame. The sky itself takes no fog (its material's `fog` is false): it is the haze's source.
 */
import * as THREE from 'three';
import { Fn, cameraPosition, clamp, dot, exp, float, max, mix, output, positionWorld, pow, select, uniform, vec3, vec4 } from 'three/tsl';
import { untonemap } from './core.js';

/** the haze's falloff with height, 1/m: it thins to 1/e every 400 m (a valley's haze, a city's smog) */
export const FALLOFF = 1 / 400;
/** the bounds of a ray's mean density against the eye's: up to half as thin looking up, twice as thick looking down */
export const SLOPE = /** @type {const} */ ({ min: 0.5, max: 2 });
/** how much of the light a far thing keeps when the haze has hidden it, the far plane's cut (1/255: one step of 8 bits) */
export const HIDDEN = 1 / 255;
/** how strongly the haze warms toward the sun (IQ's sun amount, its power and weight) */
export const SUNWARD = { power: 8, weight: 0.6 };
/** how much of a far thing's colour the air takes before the haze covers it: its saturation lost at full haze */
export const AERIAL = 0.5;

/** a ray's mean density against the eye's, climbing (`k` > 0) or falling: (1 − e^(−k)) / k, held to SLOPE @param {number} k */
export const slopeOf = (k) => Math.min(SLOPE.max, Math.max(SLOPE.min, Math.abs(k) < 1e-4 ? 1 - k / 2 : (1 - Math.exp(-k)) / k));

/**
 * τ, the air between the eye (at height `y0` over the ground) and a point `d` away and `dy` above it.
 * @param {number} rho the sky's FogExp2 density @param {number} b the falloff, 1/m @param {number} y0 @param {number} d @param {number} dy
 */
export function opticalDepth(rho, b, y0, d, dy) {
	const x = rho * Math.exp(-b * Math.max(0, y0)) * d * slopeOf(b * dy);
	return x * x;
}

/** T = e^(−τ): how much of a point's light reaches the eye @param {Parameters<typeof opticalDepth>} a */
export const transmittance = (...a) => Math.exp(-opticalDepth(...a));

/** relative luminance (Rec. 709) @param {number[]} c */
export const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * The haze's colour looking along `view` (unit): the sky's haze colour, warmed toward the sun.
 * @param {number[]} base the haze's linear colour @param {number[]} view @param {number[]} sun the sun's direction (unit)
 * @param {number[]} tint the sun's colour
 */
export function hazeColor(base, view, sun, tint) {
	const s = Math.pow(Math.max(0, view[0] * sun[0] + view[1] * sun[1] + view[2] * sun[2]), SUNWARD.power) * SUNWARD.weight;
	const y = luma(tint) || 1;
	return base.map((v, i) => v * (1 + (tint[i] / y - 1) * s));
}

/**
 * A surface's colour seen through the air: first its saturation lost to the haze (aerial perspective), then the haze
 * laid over it. @param {number[]} c @param {number[]} haze @param {number} T
 */
export function aerial(c, haze, T) {
	const fog = 1 - T, y = luma(c);
	return c.map((v, i) => {
		const grey = v + (y - v) * fog * AERIAL;
		return grey + (haze[i] - grey) * fog;
	});
}

/**
 * Where the haze has hidden everything level with the eye, the far plane's cut (at most `cap`): τ = ln(1/HIDDEN).
 * @param {number} rho @param {number} [b] @param {number} [y0] @param {number} [cap]
 */
export function farFor(rho, b = FALLOFF, y0 = 0, cap = 20_000) {
	const at = rho * Math.exp(-b * Math.max(0, y0));
	return at > 0 ? Math.min(cap, Math.sqrt(Math.log(1 / HIDDEN)) / at) : cap;
}

/**
 * @typedef {object} AtmosphereHandle
 * @property {any} node the scene's fog node (`scene.fogNode`)
 * @property {{ a: any, b: any, ground: any, sun: any, tint: any, haze: any }} uniforms `a` the eye-level density
 * @property {(o?: { density?: number, exposure?: number }) => void} update each frame, before the scene is drawn: the
 *   density, the haze's colour and the sun from the sky
 * @property {(camera: THREE.PerspectiveCamera, cap?: number) => number} far the far plane the haze asks for, set
 * @property {() => void} dispose the sky's fog back
 */

/**
 * The atmosphere on a scene lit by the one sky: its fog node, fed each frame from the sky's FogExp2 (its density and
 * colour) and its sun. `ground` is the height the haze pools on (m).
 * @param {THREE.Scene} scene
 * @param {{ sunDir: THREE.Vector3, sun?: { color: THREE.Color } }} sky
 * @param {{ ground?: number, falloff?: number, exposure?: () => number }} [o] `exposure` the page's lens (the renderer's)
 * @returns {AtmosphereHandle}
 */
export function createAtmosphere(scene, sky, o = {}) {
	const U = {
		a: uniform(0),
		b: uniform(o.falloff ?? FALLOFF),
		ground: uniform(o.ground ?? 0),
		sun: uniform(new THREE.Vector3(0, 1, 0)),
		tint: uniform(new THREE.Color(1, 1, 1)),
		haze: uniform(new THREE.Color(0.6, 0.65, 0.7))
	};
	const node = atmosphereNode(U);
	const was = scene.fogNode ?? null;
	scene.fogNode = node;
	const shown = new THREE.Color();
	let last = '';
	return {
		node,
		uniforms: U,
		update({ density, exposure } = {}) {
			const fog = /** @type {any} */ (scene.fog);
			U.a.value = density ?? fog?.density ?? 0;
			U.sun.value.copy(sky.sunDir);
			if (sky.sun?.color) U.tint.value.copy(sky.sun.color);
			if (fog?.color) {
				// the sky keeps its fog colour as the picture shows it (toned, encoded): back to the scene's light
				const lens = exposure ?? o.exposure?.() ?? 1;
				const key = `${fog.color.getHexString()}:${lens.toFixed(4)}`;
				if (key !== last) {
					last = key;
					shown.copy(fog.color).convertSRGBToLinear();
					U.haze.value.copy(untonemap(shown, lens));
				}
			}
		},
		far(camera, cap = 20_000) {
			const f = Math.max(camera.near * 100, farFor(U.a.value, U.b.value, camera.position.y - U.ground.value, cap));
			if (Math.abs(camera.far - f) > 1) {
				camera.far = f;
				camera.updateProjectionMatrix();
			}
			return f;
		},
		dispose() {
			if (scene.fogNode === node) scene.fogNode = was;
		}
	};
}

/**
 * The fog node: the surface's colour (`output`) through the air between it and the eye, as `aerial` above.
 * @param {{ a: any, b: any, ground: any, sun: any, tint: any, haze: any }} U
 */
export function atmosphereNode(U) {
	return Fn(() => {
		const ray = positionWorld.sub(cameraPosition);
		const d = ray.length().max(1e-4);
		const view = ray.div(d);
		const y0 = cameraPosition.y.sub(U.ground).max(0);
		const k = U.b.mul(ray.y);
		// (1 − e^(−k)) / k, its limit 1 − k/2 where k is near 0, held to SLOPE
		const slope = clamp(select(k.abs().lessThan(1e-4), float(1).sub(k.mul(0.5)), float(1).sub(exp(k.negate())).div(k)), SLOPE.min, SLOPE.max);
		const x = U.a.mul(exp(U.b.negate().mul(y0))).mul(d).mul(slope);
		const fog = float(1).sub(exp(x.mul(x).negate()));
		const s = pow(max(dot(view, U.sun), 0), SUNWARD.power).mul(SUNWARD.weight);
		const y = dot(U.tint, vec3(0.2126, 0.7152, 0.0722)).max(1e-4);
		const haze = vec3(U.haze).mul(vec3(1).add(U.tint.div(y).sub(1).mul(s)));
		const surface = output.rgb;
		const grey = mix(surface, vec3(dot(surface, vec3(0.2126, 0.7152, 0.0722))), fog.mul(AERIAL));
		return vec4(mix(grey, haze, fog), output.a);
	})();
}
