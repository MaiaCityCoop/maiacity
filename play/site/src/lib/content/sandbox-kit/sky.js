/**
 * THE SKY — one physical sky for every world, every sandbox and the asset viewer, and the single source of truth for
 * their light and their time (intent 2214e661).
 *
 *   · `sunAt(hour)`, `sunLight(elevation)`, `lightAt(hour)` — where the sun stands, and its light: warm and weak low
 *     down, white and strong high up, its strength by T = √sin(elevation), about five times the sky's own light at
 *     noon (Frostbite's balance); the cold moon at night; the lens (`exposure`) following the light, day and night;
 *   · `createSkyClock()` — which hour it is: the in-game clock or the hour set by hand (./skyTime.svelte.js, the time
 *     control ./SkyControl.svelte), or the hour a film pins (`window.__interiorHour`);
 *   · `createSky(renderer, scene, options)` — the sky over a world: the universe's dome and stars (./universe.js), the
 *     sun (three's SunLight: two cascades of shadows, crisp near the eye and still there far off), the sky's light on
 *     everything (its own environment, the only ambient light: no hemisphere, the sky counts once) and the haze, an
 *     exponential fog in the colour of the horizon the eye looks at, warmer toward the sun. `sun` pins the sun (the
 *     asset viewer's afternoon), `mood(m)` lays a world's mood over it (../worlds/contract.js `moodOf`).
 *
 * A world chooses only its size (how far the shadows and the haze reach) and its lens (`exposure`, a multiplier);
 * never how the sky behaves. Its renderer tone maps with AgX ($content/render/core.js); call `tick()` every frame.
 * What else changes with the hour in a world (lamps that glow at night) goes in `onHour`.
 *
 * The film camera (./film.js) pins the hour with `window.__interiorHour`, opens the lens with `window.__exposure`, and
 * sets `window.__worldTime` while it holds the clock: then every frame is drawn afresh (its shadows and its light), so
 * no frame depends on the one before it.
 */
import * as THREE from 'three';
import { SunLight } from 'three/addons/lights/SunLight.js';
import { airOf, createUniverse, groundStars, horizonRing, skyAt } from './universe.js';
import { skyHour, skyTime } from './skyTime.svelte.js';
import { budget } from '../render/budget.js';
import { agx, setExposure, untonemap } from '../render/core.js';

/**
 * @typedef {{ hour: number, e: number, day: number, low: number, night: number }} SkyLight
 *   the hour, the sun's height (-1…1, below the horizon under 0), how much day there is (0…1), how low and warm the
 *   sun is (0…1) and how dark the night is (0…1: lamps glow by it)
 */
/**
 * @typedef {SkyLight & {
 *   dir: THREE.Vector3, moon: THREE.Vector3, from: THREE.Vector3,
 *   sun: { color: THREE.Color, intensity: number }, sky: THREE.Color, gain: number[], exposure: number
 * }} Light
 *   dir: where the sun stands; moon: where the moon stands; from: where the key light comes from (the sun, or the moon
 *   at night); sun: the key light; sky: the sky's light on a surface facing up (its irradiance, as the environment
 *   gives it); gain: the environment's white balance; exposure: the lens for this light
 */
/**
 * @typedef {object} SkyHandle
 * @property {() => number} hour the hour the sky shows now
 * @property {(hour?: number) => void} set the sky at an hour now (its clock's by default)
 * @property {(now?: number) => void} tick every frame: the time control at once, the clock once a second
 * @property {(m: any) => void} mood a world's mood laid over the sky (../worlds/contract.js `moodOf`)
 * @property {() => SkyLight} light the light the sky was last set to
 * @property {() => number} exposure the lens it last set
 * @property {SunLight} sun the sun by day and the moon by night
 * @property {THREE.Mesh} dome the sky itself
 * @property {THREE.Mesh} stars
 * @property {THREE.Vector3} sunDir where the sun stands (unit)
 * @property {{ uniforms: Record<string, THREE.IUniform>, glsl: string }} horizon `skyHorizon(dir)` in GLSL, the colour of
 *   the horizon behind a way looked (before the lens): a floor that fades into the sky
 * @property {() => void} dispose
 */
/**
 * @typedef {{
 *   clock?: () => number,
 *   sun?: { elevation: number, azimuth: number },
 *   light?: boolean,
 *   shadowReach?: number,
 *   shadowMap?: number,
 *   shadowBias?: { bias: number, normal: number },
 *   shadowStep?: number,
 *   fog?: { far: number } | null,
 *   exposure?: number,
 *   clouds?: number,
 *   north?: number,
 *   map?: boolean,
 *   day?: [number, number],
 *   onHour?: (light: SkyLight, parts: { sun: SunLight, renderer: THREE.WebGLRenderer, scene: THREE.Scene }) => void
 * }} SkyOptions
 *   clock: the hour, 0…24 (the time control's); sun: the sun pinned (degrees: its height, its bearing from +z toward
 *   +x), whatever the hour; light: false for no sun light (a stage with its own key); shadowReach: how far from the eye
 *   the sun's shadows reach; shadowMap: each cascade's size; shadowBias: the shadow's bias and normal bias; shadowStep:
 *   how far the eye moves (m) before the shadows are drawn again; fog: how far the haze closes (null: none); exposure:
 *   the world's lens, a multiplier; clouds: how much of the sky they cover; north: where north lies, a turn of the sky
 *   about up in radians, north at (sin north, 0, cos north); map: a real place laid out as a map (x east, z south) under
 *   its sky as it truly turns, `north` then turning true north from −z toward +x; day: the hours this world's sun rises
 *   and sets, laid on the sky's own day (five to eight); onHour: what else changes with the hour (called once as the
 *   sky is made)
 */

/** The sky's own day: the sun rises at five and sets at eight. */
const SUNRISE = 5, SUNSET = 20;

/**
 * An hour of a world whose day runs from `rise` to `set`, as the hour of the sky's own day.
 * @param {number} hour @param {[number, number]} day
 */
export function onSkyDay(hour, [rise, set]) {
	const h = (((hour - rise) % 24) + 24) % 24, light = set - rise;
	const into = h <= light ? (h / light) * (SUNSET - SUNRISE) : SUNSET - SUNRISE + ((h - light) / (24 - light)) * (24 - (SUNSET - SUNRISE));
	return (SUNRISE + into) % 24;
}

/**
 * The hour's sun: a unit vector, and its height -1…1. It rises in the east (+x) at five, is highest (68°) in the south
 * (−z) at half past twelve, and sets in the west at eight.
 * @param {number} hour
 */
export function sunAt(hour) {
	const e = Math.sin(((hour - 5) / 15) * Math.PI);
	const alt = e * THREE.MathUtils.degToRad(68);
	const az = THREE.MathUtils.degToRad(90 + ((hour - 5) / 15) * 180);
	return { dir: new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - alt, az), e };
}

/** a direction from a height and a bearing in degrees (from +z toward +x) */
export const sunFrom = (/** @type {number} */ elevation, /** @type {number} */ azimuth) => {
	const a = THREE.MathUtils.degToRad(azimuth), e = THREE.MathUtils.degToRad(elevation);
	return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
};

const HORIZON = new THREE.Color(0xff7a2f), OVERHEAD = new THREE.Color(0xfff2e0), MOON = new THREE.Color('#8ea6dc');
const lum = (/** @type {number[]} */ c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * The sky's light on a surface facing up (its irradiance: the dome without its disc, summed over the sky, cosine
 * weighted), white-balanced as a camera would: Preetham's sky is bluer than the eye sees it, and a third of its blue is
 * kept, so the shadows stay cool and not cyan. `gain` is that balance, laid on the environment.
 * @param {THREE.Vector3} sun
 */
export function skyIrradiance(sun) {
	const air = airOf(sun.y), s = sun.toArray(), e = [0, 0, 0], n = 8, m = 32;
	for (let i = 0; i < n; i++) {
		const th = ((i + 0.5) / n) * (Math.PI / 2), w = Math.cos(th) * Math.sin(th) * (Math.PI / 2 / n) * ((2 * Math.PI) / m);
		for (let j = 0; j < m; j++) {
			const ph = ((j + 0.5) / m) * Math.PI * 2;
			const c = skyAt([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], s, air);
			for (let k = 0; k < 3; k++) e[k] += c[k] * w;
		}
	}
	const y = lum(e), gain = e.map((v) => Math.pow(y / Math.max(v, 1e-9), 0.65));
	return { e: e.map((v, k) => v * gain[k]), gain };
}

/** the sun's height at noon, and its strength: five times the sky's light there (sun : sky ≈ 5 : 1) */
const NOON_EL = THREE.MathUtils.degToRad(68);
const T = (/** @type {number} */ el) => Math.sqrt(Math.max(0, Math.sin(el)));
const NOON_SKY = lum(skyIrradiance(sunFrom(68, 0)).e);
export const SUN = (5 * NOON_SKY) / T(NOON_EL);
/** the light at noon on a surface facing up, sun and sky: what the lens is set for */
const NOON_LIGHT = SUN * T(NOON_EL) * Math.sin(NOON_EL) + NOON_SKY;

/** how far the sun's colour has come from the horizon's orange to overhead's white: the air it shines through thins
 *  fast as it climbs, so it is near white by 25° (about (255, 228, 206) at 30°, a real noon sun's; the Mac's look of
 *  T = √sin(elevation) for colour, still orange at 30°, cast every noon peach) */
const WHITENS = THREE.MathUtils.degToRad(17);
const whiteness = (/** @type {number} */ el) => (1 - Math.exp(-Math.max(0, el) / WHITENS)) / (1 - Math.exp(-Math.PI / 2 / WHITENS));

/**
 * The sun's light at a height (radians): its colour from a deep orange at the horizon to a warm white overhead, near
 * white by 25°; its strength SUN · T, T = √sin(elevation). Below the horizon none.
 * @param {number} elevation
 */
export function sunLight(elevation) {
	const t = T(elevation);
	return { color: HORIZON.clone().lerp(OVERHEAD, whiteness(elevation)), intensity: SUN * t, T: t };
}

/**
 * The lens for a light (lux on a surface facing up, sun and sky): a grey card comes out grey at noon, and the eye
 * adapts only part of the way to less, so dusk is darker and the night dark, yet walkable.
 * @param {number} light
 */
export const exposureFor = (light) => ((1.2 * Math.PI) / NOON_LIGHT) * Math.pow(NOON_LIGHT / Math.max(light, 1e-4), 0.75);

/**
 * The light of a sun standing at `dir` (unit) — pure: the same sun, the same light.
 * @param {THREE.Vector3} dir @param {number} [hour]
 * @returns {Light}
 */
export function lightOf(dir, hour = 12) {
	const e = dir.y, el = Math.asin(Math.max(-1, Math.min(1, e)));
	const day = THREE.MathUtils.smoothstep(e, -0.05, 0.35);
	const low = 1 - THREE.MathUtils.smoothstep(e, 0, 0.6);
	const night = 1 - THREE.MathUtils.smoothstep(e, -0.02, 0.18);
	// the moon stands opposite the sun, high on the far side of the sky (it is full)
	const moon = dir.clone().negate().setY(Math.abs(dir.y) + 0.4).normalize();
	const up = e > 0;
	const sun = up ? sunLight(el) : { color: MOON.clone(), intensity: SUN * 0.02 * night };
	const from = up ? dir.clone() : moon.clone();
	const sky = skyIrradiance(dir);
	const exposure = exposureFor(sun.intensity * lum(sun.color.toArray()) * Math.max(0, from.y) + lum(sky.e) + 0.02);
	return { hour, e, day, low, night, dir: dir.clone(), moon, from, sun: { color: sun.color, intensity: sun.intensity }, sky: new THREE.Color().fromArray(sky.e), gain: sky.gain, exposure };
}

/** the light of an hour @param {number} hour */
export const lightAt = (hour) => lightOf(sunAt(hour).dir, hour);

/**
 * Whether the sky's light must be drawn again: the sun moved half a degree or more since (on film: at any move).
 * @param {THREE.Vector3 | null} was @param {THREE.Vector3} now @param {boolean} [film]
 */
export const rebake = (was, now, film = false) => !was || (film ? !was.equals(now) : was.angleTo(now) >= THREE.MathUtils.degToRad(0.5));

/**
 * Which hour the sky shows: the film's (`window.__interiorHour`), else the time control's.
 * @param {{ clock?: () => number }} [o]
 */
export function createSkyClock({ clock = skyHour } = {}) {
	const dev = /** @type {{ __interiorHour?: number }} */ (/** @type {unknown} */ (window));
	return { hour: () => dev.__interiorHour ?? clock() };
}

/**
 * Put the sky over a world.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {SkyOptions} [options]
 * @returns {SkyHandle}
 */
export function createSky(renderer, scene, options = {}) {
	const { shadowReach = 300, shadowMap = 2048, shadowBias = { bias: -0.0004, normal: 0.04 }, shadowStep = 2, fog = { far: 1400 }, exposure: lens = 1, clouds = 0.4, north = 0, map = false, day: worldDay = null, light: keyed = true, onHour } = options;
	const turn = north ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), map ? -north : north) : null;
	const dev = /** @type {{ __exposure?: number, __worldTime?: number, __interiorHour?: number }} */ (/** @type {unknown} */ (window));
	const clock = createSkyClock(options);
	const film = () => dev.__worldTime !== undefined;

	const universe = createUniverse({ clouds, mirror: map });
	scene.add(universe.dome, universe.stars);
	// the sky's light on everything: the same sky without its disc, drawn into a cube and filtered (PMREM), each time
	// into the same targets, so every material keeps the one environment it was compiled with
	const envSky = createUniverse({ clouds: 0, mirror: map, disc: false });
	const envScene = new THREE.Scene().add(envSky.dome);
	const cube = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
	const cubeCamera = new THREE.CubeCamera(0.1, 100, cube);
	const pmrem = new THREE.PMREMGenerator(renderer);
	/** @type {THREE.WebGLRenderTarget | null} */
	let envTarget = null;

	const sun = new SunLight(0xffffff, 1);
	sun.castShadow = keyed;
	sun.visible = keyed;
	// each of its two cascades no bigger than the device's budget lets the pair be (../render/budget.js)
	const side = Math.min(shadowMap, budget().shadowMap / 2);
	sun.shadow.mapSize.set(side, side);
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = shadowReach;
	sun.shadow.bias = shadowBias.bias;
	sun.shadow.normalBias = shadowBias.normal;
	scene.add(sun);
	const haze = fog ? new THREE.FogExp2(0xffffff, 1.6 / fog.far) : null;
	scene.fog = haze;

	/* the shadows are drawn again only when the eye has moved or turned enough, or the sun has moved (on film: every
	   frame); the haze takes the colour of the horizon the eye looks at */
	if (keyed) renderer.shadowMap.autoUpdate = false;
	const eye = new THREE.Vector3(Infinity, 0, 0), look = new THREE.Vector3(), ahead = new THREE.Vector3(), at = new THREE.Vector3();
	/** @type {number[][]} the horizon all round as the lens shows it, encoded as three lays fog on (after the lens) */
	let ring = [];
	/** the mood's haze over it: its colour, how much, and its density thinning with height */
	let moodHaze = { color: [0, 0, 0], k: 0, density: 0 };
	const before = scene.onBeforeRender;
	scene.onBeforeRender = function (r, s, cam, target) {
		before.call(this, r, s, cam, target);
		if (target || !cam) return;
		cam.getWorldPosition(at);
		cam.getWorldDirection(ahead);
		if (keyed && (film() || at.distanceTo(eye) > shadowStep || ahead.angleTo(look) > 0.035)) {
			r.shadowMap.needsUpdate = true;
			eye.copy(at);
			look.copy(ahead);
		}
		if (!haze || !ring.length) return;
		const f = ((Math.atan2(ahead.z, ahead.x) / (Math.PI * 2) + 1) % 1) * 16, k = Math.floor(f) % 16, t = f - Math.floor(f);
		const c = ring[k].map((v, i) => v + (ring[(k + 1) % 16][i] - v) * t);
		haze.color.setRGB(...c.map((v, i) => v + (moodHaze.color[i] - v) * moodHaze.k));
		// a mood's haze lies low: thick in the streets, a third of it from 300 m up
		if (moodHaze.density) haze.density = moodHaze.density * (1 - 0.65 * THREE.MathUtils.smoothstep(at.y, 15, 300));
	};

	// the horizon for a floor that fades into it (the asset viewer's), before the lens
	const horizonColours = Array.from({ length: 16 }, () => new THREE.Vector3());
	const horizon = {
		uniforms: { uSkyRing: { value: horizonColours } },
		glsl: /* glsl */ `uniform vec3 uSkyRing[16];
vec3 skyHorizon(vec3 dir) {
	float f = fract(atan(dir.z, dir.x) / 6.2831853 + 1.0) * 16.0; int k = int(f);
	vec3 a = uSkyRing[0], b = uSkyRing[1];
	for (int i = 0; i < 16; i++) if (i == k) { a = uSkyRing[i]; b = uSkyRing[(i + 1) - 16 * ((i + 1) / 16)]; }
	return mix(a, b, fract(f));
}`
	};

	/** @type {THREE.Vector3 | null} */
	let envAt = null;
	/** @type {any} the world's mood, and how much its lid covers the sky (0…1) */
	let mood = null, lid = 0, baked = null;
	let shown = 1;
	/** @type {SkyLight} */
	let light = { hour: 0, e: 0, day: 0, low: 0, night: 0 };
	const sunDir = new THREE.Vector3(0, 1, 0);

	const bake = (/** @type {number[]} */ gain) => {
		envSky.U.gain.value.fromArray(gain);
		cubeCamera.update(renderer, envScene);
		envTarget = pmrem.fromCubemap(cube.texture, envTarget);
		scene.environment = envTarget.texture;
	};

	const set = (hour = clock.hour()) => {
		const sky = worldDay ? onSkyDay(hour, worldDay) : hour;
		const pinned = mood && !mood.indoor ? sunFrom(Math.max(mood.sun, -18), mood.az) : options.sun ? sunFrom(options.sun.elevation, options.sun.azimuth) : null;
		const l = pinned ? lightOf(pinned, hour) : lightAt(sky);
		// a real place's sky: the sky's own, mirrored north for south; then turned to where this world's north is
		if (!pinned) {
			if (map) for (const v of [l.dir, l.moon, l.from]) v.z = -v.z;
			if (turn) for (const v of [l.dir, l.moon, l.from]) v.applyQuaternion(turn);
		}
		const stars = groundStars(sky);
		if (map) stars.set(-stars.x, -stars.y, stars.z, stars.w);
		if (turn) stars.premultiply(turn);
		const view = { sun: l.dir, moon: l.moon, stars, drift: sky * 60 };
		universe.set(view);
		envSky.set(view);
		sunDir.copy(l.dir);
		sun.position.copy(l.from);
		sun.color.copy(l.sun.color);
		// under a mood's lid (an overcast, a smog) the sun is a smear: most of the light comes from the sky
		sun.intensity = l.sun.intensity * (1 - 0.8 * lid) * (mood?.indoor ? 0 : 1);
		// the lens: the light's own, the world's, and the film's (a multiplier, 1 in the game)
		shown = l.exposure * lens * (mood ? 0.8 + 0.2 * mood.light : 1) * (dev.__exposure ?? 1);
		setExposure(renderer, shown);
		scene.environmentIntensity = 1;
		// a mood's lid as it should look, whatever the lens: its colours found back through AgX
		if (mood) {
			for (const [k, u] of /** @type {const} */ ([['zenith', universe.U.zenith], ['haze', universe.U.haze]])) {
				const c = untonemap(new THREE.Color(`#${mood[k]}`), shown);
				u.value.copy(c);
				(k === 'zenith' ? envSky.U.zenith : envSky.U.haze).value.copy(c);
			}
			universe.U.look.value = envSky.U.look.value = lid;
		}
		// the haze: the horizon all round, through the lens, encoded (three lays fog on after it)
		const r = horizonRing(l.dir);
		r.forEach((c, i) => horizonColours[i].set(c.r, c.g, c.b));
		ring = r.map((c) => new THREE.Color().fromArray(agx(c.toArray(), shown)).convertLinearToSRGB().toArray());
		light = { hour, e: l.e, day: l.day, low: l.low, night: l.night };
		if (rebake(envAt, l.dir, film()) || baked !== mood) {
			envAt = l.dir.clone();
			baked = mood;
			bake(l.gain);
			if (keyed) renderer.shadowMap.needsUpdate = true;
		}
		onHour?.(light, { sun, renderer, scene });
	};
	set();

	let checked = 0;
	/** the time control as the sky last followed it: a change shows at once */
	let control = '';
	return {
		hour: clock.hour,
		set,
		tick: (now = performance.now()) => {
			const c = dev.__interiorHour !== undefined ? `film ${dev.__interiorHour}` : skyTime.auto ? 'auto' : `hand ${skyTime.hour}`;
			if (c === control && now - checked < 1000) return;
			control = c;
			checked = now;
			set();
		},
		mood(m) {
			mood = m;
			lid = m.preset === 'smog-dusk' || m.preset === 'overcast' ? 0.85 : m.indoor ? 1 : 0.2;
			universe.dome.visible = universe.stars.visible = !m.indoor;
			sun.castShadow = keyed && m.shadows && !m.indoor;
			scene.background = m.indoor ? new THREE.Color(`#${m.haze}`) : null;
			moodHaze = { color: new THREE.Color(`#${m.haze}`).convertLinearToSRGB().toArray(), k: lid, density: m.indoor ? 0 : m.fog };
			if (haze) haze.density = moodHaze.density;
			set();
		},
		light: () => light,
		exposure: () => shown,
		sun,
		dome: universe.dome,
		stars: universe.stars,
		sunDir,
		horizon,
		dispose() {
			scene.remove(universe.dome, universe.stars, sun);
			scene.onBeforeRender = before;
			if (scene.fog === haze) scene.fog = null;
			universe.dispose();
			envSky.dispose();
			sun.dispose();
			cube.dispose();
			if (scene.environment === envTarget?.texture) scene.environment = null;
			envTarget?.dispose();
			pmrem.dispose();
		}
	};
}
