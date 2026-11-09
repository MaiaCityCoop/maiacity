// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * ONE WIND FOR EVERYTHING THAT GROWS (intent 6fd5e63f) — a world's wind as one field every plant, every blade of grass
 * and every leaf reads (Ghost of Tsushima's one wind model; Crysis's and GPU Gems 3 ch. 16's bending), drawn in TSL so
 * it carries to WebGPU unchanged, with its maths mirrored here on the CPU line for line so it can be tested without a
 * graphics card (./wind.test.js).
 *
 * - **The field**: a prevailing direction and strength per world (`windOf`), and a gust field of two octaves whose
 *   fronts travel along the wind at `speed` (`gustAt`: a function of the distance along the wind less speed × t, so a
 *   front at x at t is at x + speed × dt at t + dt). The strength at a place is the prevailing one raised and lowered
 *   by the gust there (`strengthAt`).
 * - **Each plant its own phase** (`phaseOf`): a hash of where it stands, so neighbours sway apart and the same plant
 *   always sways alike. The gust is read at the plant's foot, so a whole plant leans together as a front passes.
 * - **The main bend** (`bendAt`): grows as the square of the height on the plant, the whole copy alike (its leaves never
 *   leave their branches; a stiffer kind may lean less, `stiffness` 1 for every plant drawn today), divided by its stiffness
 *   (trunks hardly move, crowns and grass do), and keeps the length from the foot: what leans over comes down
 *   (`keepLength`).
 * - **Tip flutter** (`flutterAt`): smoothed triangle waves at four frequencies (GPU Gems 3 ch. 16), scaled by the
 *   material's flutter and the height on the plant, gone beyond FLUTTER_FAR (about 15 m) where no eye can read it.
 * - **One clock**: everything is a function of the world's time (`worldTime`, the film's when it sets one), so the
 *   same t draws the same frame, as a film needs.
 *
 * A plant's copies carry, per copy, where their foot stands and their height (`aWind`, written by the renderer with
 * `windOfCopy`); a material's numbers are its look's (../assets/look.js). The TSL (`windNodes`) adds the bend and
 * flutter to a node material's position after instancing, in the mesh's own frame.
 */
import { KINDS } from '../assets/look.js';

const TAU = Math.PI * 2;

/** the wind a world has when it says nothing: a breeze from the west-south-west, gusting */
export const CALM = Object.freeze({ direction: 0.35, strength: 0.45, gust: 0.55, scale: 34, speed: 7 });

/** the ranges a world's wind is held to */
const LIMITS = { strength: [0, 1.5], gust: [0, 1], scale: [4, 400], speed: [0, 40] };

/**
 * A world's wind, its numbers held to their ranges: `direction` the way it blows to, in radians from +x toward +z;
 * `strength` 0 still … 1 a strong breeze; `gust` how much the gusts raise and lower it (0…1); `scale` how far apart
 * gust fronts are, in metres; `speed` how fast they travel, in metres a second.
 * @param {{ direction?: number, strength?: number, gust?: number, scale?: number, speed?: number } | null | undefined} [o]
 */
export function windOf(o) {
	const w = { ...CALM };
	if (o && typeof o === 'object') {
		if (Number.isFinite(o.direction)) w.direction = ((o.direction % TAU) + TAU) % TAU;
		for (const [k, [lo, hi]] of Object.entries(LIMITS)) if (Number.isFinite(o[k])) w[k] = Math.min(hi, Math.max(lo, o[k]));
	}
	return Object.freeze(w);
}

/** the unit vector the wind blows along, on the ground (x, z) @param {{ direction: number }} w */
export const along = (w) => [Math.cos(w.direction), Math.sin(w.direction)];

const fract = (x) => x - Math.floor(x);
const smooth = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * The gust at (x, z) at time t, 0 a lull … 1 a gust's front: two octaves of waves along the wind, their crests bent a
 * little across it so fronts are not straight lines, travelling at the wind's speed.
 * @param {ReturnType<typeof windOf>} w @param {number} x @param {number} z @param {number} t seconds
 */
export function gustAt(w, x, z, t) {
	const [dx, dz] = along(w);
	const u = x * dx + z * dz - w.speed * t;
	const v = -x * dz + z * dx;
	const k = TAU / w.scale;
	const g1 = Math.sin(u * k + 0.8 * Math.sin(v * k * 0.31 + 1.7));
	const g2 = Math.sin(u * k * 2.17 + 2.3 + 0.6 * Math.sin(v * k * 0.73));
	return smooth(clamp01(0.5 + 0.5 * (0.68 * g1 + 0.32 * g2)));
}

/** the wind's strength at (x, z) at t: the prevailing one raised in a gust, lowered in a lull, never below 0 */
export const strengthAt = (w, x, z, t) => Math.max(0, w.strength * (1 + w.gust * (2 * gustAt(w, x, z, t) - 1)));

/** a plant's own phase, 0 … 2π, from where it stands: a hash, the same for the same place */
export const phaseOf = (x, z) => TAU * fract(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);

/** how fast a plant sways back and forth about its lean, radians a second */
export const SWAY = 1.4;

/**
 * How far a plant of height `height` (m) leans at its top, in metres, at t: the strength at its foot over its
 * stiffness, swaying ±25 % on its own phase. At most 15 % of its height at strength 1 and stiffness 1.
 * @param {ReturnType<typeof windOf>} w @param {{ x: number, z: number, phase: number, height: number }} copy
 * @param {number} stiffness @param {number} t
 */
export function leanAt(w, copy, stiffness, t) {
	const s = strengthAt(w, copy.x, copy.z, t);
	return (0.15 * copy.height * s * (0.75 + 0.25 * Math.sin(t * SWAY + copy.phase))) / Math.max(0.1, stiffness);
}

/**
 * A point `h` metres up a plant leaned over by `d` metres along the ground, its distance from the foot kept: how far
 * it comes down. At most 90 % of h leans.
 * @param {number} h @param {number} d
 */
export function keepLength(h, d) {
	const dd = Math.min(Math.abs(d), 0.9 * Math.max(0, h));
	return Math.max(0, h) - Math.sqrt(Math.max(0, h * h - dd * dd));
}

/**
 * The main bend of a point `h` metres up a plant: [dx, dy, dz] in metres, along the wind, growing as (h / height)²,
 * its length from the foot kept.
 * @param {ReturnType<typeof windOf>} w @param {{ x: number, z: number, phase: number, height: number }} copy
 * @param {number} h @param {number} stiffness @param {number} t
 */
export function bendAt(w, copy, h, stiffness, t) {
	if (!(copy.height > 0)) return [0, 0, 0];
	const f = clamp01(h / copy.height);
	const d = leanAt(w, copy, stiffness, t) * f * f;
	const [ax, az] = along(w);
	const dd = Math.min(Math.abs(d), 0.9 * Math.max(0, h)) * Math.sign(d);
	return [ax * dd, -keepLength(h, dd), az * dd];
}

/** where flutter is gone: it fades from FLUTTER_NEAR to FLUTTER_FAR metres from the eye */
export const FLUTTER_NEAR = 12;
export const FLUTTER_FAR = 15;

/** GPU Gems 3 ch. 16's four flutter frequencies */
const FREQ = [1.975, 0.793, 0.375, 0.193];
const tri = (x) => Math.abs(fract(x + 0.5) * 2 - 1);
const smoothTri = (x) => smooth(tri(x)) * 2 - 1;

/**
 * A tip's flutter at t, up and down, in metres: the strength at the plant's foot times the material's flutter and the
 * point's height on the plant (`f`, 0 foot … 1 top), smoothed triangle waves on the point's own phase, faded out by
 * the distance from the eye.
 * @param {ReturnType<typeof windOf>} w @param {{ x: number, z: number, phase: number }} copy
 * @param {number} f 0…1 @param {number} flutter 0…1 @param {number} vphase the point's own phase @param {number} t
 * @param {number} distance metres from the eye
 */
export function flutterAt(w, copy, f, flutter, vphase, t, distance) {
	const near = 1 - smooth(clamp01((distance - FLUTTER_NEAR) / (FLUTTER_FAR - FLUTTER_NEAR)));
	if (near <= 0 || flutter <= 0) return 0;
	const p = t * 2.2 + copy.phase + vphase;
	const wave = 0.4 * smoothTri(p * FREQ[0]) + 0.3 * smoothTri(p * FREQ[1]) + 0.2 * smoothTri(p * FREQ[2]) + 0.1 * smoothTri(p * FREQ[3]);
	return 0.03 * strengthAt(w, copy.x, copy.z, t) * flutter * clamp01(f) * wave * near;
}

/**
 * What a copy carries for the wind (`aWind`, per instance): where its foot stands and its height in metres; its phase
 * is `phaseOf` its foot, worked out where it is drawn.
 * @param {number} x @param {number} y @param {number} z @param {number} height
 * @returns {[number, number, number, number]}
 */
export const windOfCopy = (x, y, z, height) => [x, y, z, Math.max(0, height)];

/** a look's numbers for the wind, or none for a look that does not move (stone) */
export function windLook(look) {
	if (!look || look.kind === 'stone') return null;
	const k = KINDS[look.kind] ?? KINDS.leaf;
	// a material's stiffness damps its own flutter: the main bend is the copy's, the same for all its materials
	return { stiffness: look.stiffness ?? k.stiffness, flutter: (look.flutter ?? k.flutter) / Math.max(1, look.stiffness ?? k.stiffness) };
}

// ---------------------------------------------------------------- the clock

/**
 * The world's clock for the wind: the film's time when it sets one (`window.__worldTime`, so a shot draws the same frame
 * every time), else seconds since the page began. @param {number} [now] performance.now()
 */
export function worldSeconds(now = typeof performance !== 'undefined' ? performance.now() : 0) {
	const film = typeof window !== 'undefined' ? window.__worldTime : undefined;
	return Number.isFinite(film) ? film : now / 1000;
}

// ---------------------------------------------------------------- the same, in TSL

/**
 * The wind's uniforms and its position nodes, for node materials (three/tsl). One per world: `set(w)` changes its
 * field, `tick(t)` its clock (the world's render loop calls it with `worldSeconds()` once a frame).
 * @param {typeof import('three/tsl')} tsl three/tsl, passed in so the page alone loads it
 * @param {Parameters<typeof windOf>[0]} [o]
 */
export function windNodes(tsl, o) {
	const { Fn, If, abs, attribute, cameraPosition, clamp, cos, float, fract: frac, max, min, mix, modelWorldMatrix, modelWorldMatrixInverse, positionLocal, positionWorld, sin, smoothstep, sqrt, uniform, vec3, vec4 } = tsl;
	const w = windOf(o);
	const u = {
		direction: uniform(w.direction),
		strength: uniform(w.strength),
		gust: uniform(w.gust),
		scale: uniform(w.scale),
		speed: uniform(w.speed),
		time: uniform(0)
	};
	const sm = (x) => x.mul(x).mul(float(3).sub(x.mul(2)));
	const gust = Fn(([x, z]) => {
		const dx = cos(u.direction), dz = sin(u.direction);
		const uu = x.mul(dx).add(z.mul(dz)).sub(u.speed.mul(u.time));
		const vv = x.negate().mul(dz).add(z.mul(dx));
		const k = float(TAU).div(u.scale);
		const g1 = sin(uu.mul(k).add(sin(vv.mul(k).mul(0.31).add(1.7)).mul(0.8)));
		const g2 = sin(uu.mul(k).mul(2.17).add(2.3).add(sin(vv.mul(k).mul(0.73)).mul(0.6)));
		return sm(clamp(g1.mul(0.68).add(g2.mul(0.32)).mul(0.5).add(0.5), 0, 1));
	});
	const strength = (x, z) => max(0, u.strength.mul(gust(x, z).mul(2).sub(1).mul(u.gust).add(1)));
	const tri = (x) => abs(frac(x.add(0.5)).mul(2).sub(1));
	const smoothTri = (x) => sm(tri(x)).mul(2).sub(1);

	/**
	 * A copy's wind as nodes, after instancing, in the mesh's own frame: its foot and height (`aWind`: x, y, z, height in
	 * metres, per instance; unbound it reads 0: no height, no wind), its phase (the same hash as `phaseOf`), and how far
	 * up it the point is (`f`, 0 foot … 1 top).
	 */
	const copyOf = () => {
		const a = attribute('aWind', 'vec4');
		const foot = vec3(a.x, a.y, a.z), height = a.w;
		const phase = frac(sin(a.x.mul(12.9898).add(a.z.mul(78.233))).mul(43758.5453)).mul(TAU);
		const f = clamp(positionLocal.y.sub(a.y).div(max(height, 1e-4)), 0, 1);
		return { foot, height, phase, f };
	};

	/**
	 * A node material's position bent by the wind, after instancing (assigned to `positionLocal`): the main bend by the
	 * material's stiffness, its length from the foot kept, and the tips' flutter by its flutter, faded beyond 15 m.
	 */
	const positionOf = ({ stiffness = 1, flutter = 0 }) =>
		Fn(() => {
			const { foot, height, phase, f } = copyOf();
			const s = strength(foot.x, foot.z);
			const h = f.mul(height);
			const lean = height.mul(0.15).mul(s).mul(sin(u.time.mul(SWAY).add(phase)).mul(0.25).add(0.75)).div(max(float(stiffness), 0.1));
			const d = min(lean.mul(f).mul(f), h.mul(0.9));
			const down = h.sub(sqrt(max(h.mul(h).sub(d.mul(d)), 0)));
			// flutter, faded by the distance from the eye: none compiled where the look has none (x × 0 is not folded
			// away under IEEE, so a stem's or bark's every vertex would still pay for it), and skipped per copy beyond
			// FLUTTER_FAR (the branch is the same for every vertex of a copy, so it costs nothing to take)
			const up = float(0).toVar();
			if (flutter > 0) {
				const eye = modelWorldMatrix.mul(vec4(foot, 1)).xyz.sub(cameraPosition).length();
				If(eye.lessThan(height.mul(0.5).add(FLUTTER_FAR)), () => {
					const near = float(1).sub(smoothstep(FLUTTER_NEAR, FLUTTER_FAR, positionWorld.sub(cameraPosition).length()));
					const p = u.time.mul(2.2).add(phase).add(positionLocal.x.add(positionLocal.z).mul(3.1));
					const wave = smoothTri(p.mul(FREQ[0])).mul(0.4).add(smoothTri(p.mul(FREQ[1])).mul(0.3)).add(smoothTri(p.mul(FREQ[2])).mul(0.2)).add(smoothTri(p.mul(FREQ[3])).mul(0.1));
					up.assign(s.mul(0.03).mul(float(flutter)).mul(f).mul(wave).mul(near));
				});
			}
			// the bend in world metres along the wind, turned into the mesh's own frame
			const world = vec3(cos(u.direction).mul(d), down.negate().add(up), sin(u.direction).mul(d));
			const into = modelWorldMatrixInverse.mul(vec4(world, 0)).xyz;
			return positionLocal.add(mix(vec3(0), into, height.greaterThan(0)));
		})();

	return {
		uniforms: u,
		gust,
		strength,
		positionOf,
		copyOf,
		/** the field changed (a world's own wind) */
		set(next) {
			const n = windOf(next);
			for (const k of Object.keys(LIMITS)) u[k].value = n[k];
			u.direction.value = n.direction;
		},
		/** the clock moved: the world's seconds */
		tick(t = worldSeconds()) {
			u.time.value = t;
		}
	};
}
