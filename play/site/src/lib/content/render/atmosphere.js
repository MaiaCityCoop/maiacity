// @ts-nocheck — TSL's node types are loose
/*
 * THE ATMOSPHERE — the air between the eye and what it sees, on every world (intent 1f0c6f79): a haze that pools low
 * (exponential height fog, thick in the valleys, thin from a few hundred metres up), in the colour of the horizon the
 * eye looks toward (the one sky's ring, ../sandbox-kit/sky.js), warmer toward the sun (Íñigo Quílez's sun-tinted fog),
 * and aerial perspective: what is far loses its colour into the haze before the haze covers it. The far plane follows
 * the haze: past where it has hidden everything there is nothing to draw.
 *
 * The air is one density σ(h) = a · e^(−b·h) (a at the ground, b the falloff with height); a ray from the eye at height
 * y₀ to a point d away and Δy above it passes through τ = a · e^(−b·y₀) · d · (1 − e^(−b·Δy)) / (b·Δy) of it (Δy → 0:
 * a · e^(−b·y₀) · d), and lets T = e^(−τ) of the point's light through. The same sums run on the CPU here (`opticalDepth`,
 * `transmittance`, `hazeColor`, `aerial`, `farFor`) and on the GPU as the scene's fog node (`atmosphereNode`), so the
 * tests check the numbers the picture is drawn by.
 *
 * Only node materials take it (WebGPURenderer, intent c1bee1f8): `scene.fogNode` stands in for the sky's FogExp2, whose
 * density it reads each frame (a mood's haze, the world's fog option), so a world that sets no atmosphere keeps the
 * sky's fog as it is. The sky itself takes no fog (its material's `fog` is false): it is the haze's source.
 */
import * as THREE from 'three';
import { Fn, cameraPosition, dot, exp, float, max, mix, output, positionWorld, pow, select, uniform, uniformArray, vec3, vec4 } from 'three/tsl';

/** the haze's falloff with height, 1/m: it thins to 1/e every 150 m above the ground (a valley's morning haze) */
export const FALLOFF = 1 / 150;
/** how much of the light a far thing keeps when the haze has hidden it, the far plane's cut (1/255: one step of 8 bits) */
export const HIDDEN = 1 / 255;
/** how strongly the haze warms toward the sun (IQ's sun amount, its power and weight) */
export const SUNWARD = { power: 8, weight: 0.6 };
/** how much of a far thing's colour the air takes before the haze covers it: its saturation lost at full haze */
export const AERIAL = 0.5;
/** the haze's ring: the horizon's colour in 16 bearings, as ../sandbox-kit/universe.js horizonRing gives it */
export const RING = 16;

/**
 * The ground density a world's fog option asks for: the sky's FogExp2 (density ρ = 1.6/far) hides a thing at `far` to
 * e^(−2.56); the height haze at the ground hides it as much there (a = 2.56/far).
 * @param {number} expDensity FogExp2's density
 */
export const groundDensity = (expDensity) => (expDensity / 1.6) * 2.56;

/**
 * τ, the air between the eye (at height `y0`) and a point `d` away and `dy` above it.
 * @param {number} a the ground density, 1/m @param {number} b the falloff, 1/m @param {number} y0 @param {number} d @param {number} dy
 */
export function opticalDepth(a, b, y0, d, dy) {
	const at = a * Math.exp(-b * y0);
	const k = b * dy;
	return at * d * (Math.abs(k) < 1e-4 ? 1 - k / 2 : (1 - Math.exp(-k)) / k);
}

/** T = e^(−τ): how much of a point's light reaches the eye @param {Parameters<typeof opticalDepth>} a */
export const transmittance = (...a) => Math.exp(-opticalDepth(...a));

/**
 * The haze's colour looking along `view` (unit): the ring's colour at that bearing, warmed toward the sun.
 * @param {number[][]} ring 16 linear colours, bearing k at angle k/16 · 2π from +x toward +z
 * @param {number[]} view @param {number[]} sun the sun's direction (unit) @param {number[]} tint the sun's colour
 */
export function hazeColor(ring, view, sun, tint) {
	const f = ((Math.atan2(view[2], view[0]) / (Math.PI * 2) + 1) % 1) * RING, k = Math.floor(f) % RING, t = f - Math.floor(f);
	const c = ring[k].map((v, i) => v + (ring[(k + 1) % RING][i] - v) * t);
	const s = Math.pow(Math.max(0, view[0] * sun[0] + view[1] * sun[1] + view[2] * sun[2]), SUNWARD.power) * SUNWARD.weight;
	const y = luma(tint) || 1;
	return c.map((v, i) => v * (1 + (tint[i] / y - 1) * s));
}

/** relative luminance (Rec. 709) @param {number[]} c */
export const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

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
 * @param {number} a @param {number} [b] @param {number} [y0] @param {number} [cap]
 */
export function farFor(a, b = FALLOFF, y0 = 0, cap = 20_000) {
	const at = a * Math.exp(-b * Math.max(0, y0));
	return at > 0 ? Math.min(cap, Math.log(1 / HIDDEN) / at) : cap;
}

/**
 * @typedef {object} AtmosphereHandle
 * @property {any} node the scene's fog node (`scene.fogNode`)
 * @property {{ a: any, b: any, ground: any, sun: any, tint: any, ring: any }} uniforms
 * @property {(o?: { density?: number }) => void} update each frame, before the scene is drawn: the ring, the sun and
 *   the density from the sky
 * @property {(camera: THREE.PerspectiveCamera, cap?: number) => number} far the far plane the haze asks for, set
 * @property {() => void} dispose the sky's fog back
 */

/**
 * The atmosphere on a scene lit by the one sky: its fog node, fed each frame from the sky's ring and sun and its
 * FogExp2's density. `ground` is the height the haze pools on (m).
 * @param {THREE.Scene} scene
 * @param {{ horizon: { uniforms: { uSkyRing: { value: THREE.Vector3[] } } }, sunDir: THREE.Vector3, sun?: { color: THREE.Color } }} sky
 * @param {{ ground?: number, falloff?: number }} [o]
 * @returns {AtmosphereHandle}
 */
export function createAtmosphere(scene, sky, o = {}) {
	const ringOf = () => sky.horizon.uniforms.uSkyRing.value;
	const U = {
		a: uniform(0),
		b: uniform(o.falloff ?? FALLOFF),
		ground: uniform(o.ground ?? 0),
		sun: uniform(new THREE.Vector3(0, 1, 0)),
		tint: uniform(new THREE.Color(1, 1, 1)),
		ring: uniformArray(ringOf().map((v) => v.clone()), 'vec3')
	};
	const node = atmosphereNode(U);
	const was = scene.fogNode ?? null;
	scene.fogNode = node;
	return {
		node,
		uniforms: U,
		update({ density } = {}) {
			const ring = ringOf();
			for (let i = 0; i < RING; i++) U.ring.array[i].copy(ring[i]);
			U.sun.value.copy(sky.sunDir);
			if (sky.sun?.color) U.tint.value.copy(sky.sun.color);
			const exp2 = density ?? /** @type {any} */ (scene.fog)?.density ?? 0;
			U.a.value = groundDensity(exp2);
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
 * @param {{ a: any, b: any, ground: any, sun: any, tint: any, ring: any }} U
 */
export function atmosphereNode(U) {
	return Fn(() => {
		const ray = positionWorld.sub(cameraPosition);
		const d = ray.length().max(1e-4);
		const view = ray.div(d);
		const y0 = cameraPosition.y.sub(U.ground).max(0);
		const k = U.b.mul(ray.y);
		// (1 − e^(−k)) / k, its limit 1 − k/2 where k is near 0
		const slope = select(k.abs().lessThan(1e-4), float(1).sub(k.mul(0.5)), float(1).sub(exp(k.negate())).div(k));
		const tau = U.a.mul(exp(U.b.negate().mul(y0))).mul(d).mul(slope);
		const fog = float(1).sub(exp(tau.negate()));
		// the ring at the bearing looked along, between its two nearest colours
		const f = view.z.atan(view.x).div(Math.PI * 2).add(1).fract().mul(RING);
		const i = f.floor().toInt();
		const t = f.fract();
		const c = mix(U.ring.element(i.mod(RING)), U.ring.element(i.add(1).mod(RING)), t);
		const s = pow(max(dot(view, U.sun), 0), SUNWARD.power).mul(SUNWARD.weight);
		const y = dot(U.tint, vec3(0.2126, 0.7152, 0.0722)).max(1e-4);
		const haze = c.mul(vec3(1).add(U.tint.div(y).sub(1).mul(s)));
		const surface = output.rgb;
		const grey = mix(surface, vec3(dot(surface, vec3(0.2126, 0.7152, 0.0722))), fog.mul(AERIAL));
		return vec4(mix(grey, haze, fog), output.a);
	})();
}
