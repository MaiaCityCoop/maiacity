/**
 * THE UNIVERSE — the one sky primitive every world, sandbox and the asset viewer is under (./sky.js puts it up).
 *
 * The air by day is the Preetham scattering model (Rayleigh and Mie, turbidity, the sun's disc), our own TSL fork of
 * three's SkyMesh; at dusk the blue hour and the glow where the sun went down; at night the dark blue air, the full
 * moon and the stars, which come out only once the sun is far enough below the horizon. A world's mood (a smog, an
 * overcast) is laid over it as a look.
 *
 *   createUniverse()   the dome and the stars (instanced sprites: WebGPU draws points a pixel wide), drawn at the far
 *                      plane round the camera; `set` them for an hour
 *   horizonRing(sun)   the colour of the air at the horizon all round, for the haze: what is far melts into the sky
 *   celestial(hour)    how far the stars have turned; groundStars(hour) their sphere over the ground
 *
 * Everything is set from the hour and the camera alone (a fixed star catalogue from a fixed seed, clouds that drift
 * with the hour), so a film renders the same pixels every time.
 */
import * as THREE from 'three';
import { NodeMaterial } from 'three/webgpu';
import { Fn, If, Loop, acos, atan, attribute, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, clamp, cos, dot, exp, float, floor, fract, length, log2, max, min, mix, modelViewProjection, modelWorldMatrix, normalize, positionGeometry, positionWorld, pow, sin, smoothstep, sub, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl';
import { seededMinStd } from './random.js';
import { withTone } from '../render/core.js';

/** Where the worlds stand on their planet: the celestial pole stands this high in the north (+z on the ground). */
export const LATITUDE = 45;
/** The air: clear, a little haze. */
export const AIR = { turbidity: 3, rayleigh: 1.2, mie: 0.004, g: 0.8 };

const SPACE = new THREE.Color('#070e25'), NIGHT_ZENITH = new THREE.Color('#070f27'), NIGHT_HORIZON = new THREE.Color('#111d3d');
const DUSK_GLOW = new THREE.Color('#d9773f'), BLUE_HOUR = new THREE.Color('#36508c');
const smooth = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
/** how strongly the twilight glows, down to the end of astronomical twilight (−18°) */
const twilightOf = (/** @type {number} */ alt) => smooth(-0.32, -0.03, alt) * (1 - smooth(-0.02, 0.1, alt));
/** how much of the stars shows through the air: none by day, coming out from nautical twilight */
const starsOf = (/** @type {number} */ alt) => smooth(-0.07, -0.27, alt);
/** how dark the night air is, 0 by day */
const nightOf = (/** @type {number} */ alt) => smooth(0.02, -0.2, alt);

const RAYLEIGH = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MIE = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];
/**
 * What the air does with the sun at a height (sun.y): its strength and the scattering of each primary — the half of
 * Preetham's model that depends on the sun alone, worked out here once per move rather than per pixel.
 * @param {number} sunY @param {typeof AIR} [a]
 */
export function airOf(sunY, a = AIR) {
	const sunE = 1000 * Math.max(0, 1 - Math.exp(-((1.6110731556870734 - Math.acos(Math.max(-1, Math.min(1, sunY)))) / 1.5)));
	const fade = Math.min(1, Math.exp(sunY / 450000));
	return { sunE, betaR: RAYLEIGH.map((v) => v * (a.rayleigh - (1 - fade))), betaM: MIE.map((v) => 0.434 * 0.2 * a.turbidity * 10e-18 * v * a.mie) };
}

/**
 * The sky's colour one way (unit d, the sun unit s, up +y), as the dome draws it without clouds, moon or stars:
 * linear, before the lens.
 * @param {number[]} d @param {number[]} s @param {ReturnType<typeof airOf>} air
 */
export function skyAt(d, s, air) {
	const { sunE, betaR, betaM } = air;
	const zen = Math.acos(Math.max(0, d[1]));
	const inv = 1 / (Math.cos(zen) + 0.15 * Math.pow(93.885 - (zen * 180) / Math.PI, -1.253));
	const cosT = d[0] * s[0] + d[1] * s[1] + d[2] * s[2];
	const g = AIR.g, g2 = g * g;
	const rPhase = (3 / (16 * Math.PI)) * (1 + Math.pow(cosT * 0.5 + 0.5, 2));
	const mPhase = (1 / (4 * Math.PI)) * ((1 - g2) / Math.pow(1 - 2 * g * cosT + g2, 1.5));
	const alt = Math.asin(Math.max(-1, Math.min(1, s[1])));
	const tw = twilightOf(alt), night = nightOf(alt);
	const toward = Math.pow(Math.max(0, (d[0] * s[0] + d[2] * s[2]) / (Math.hypot(d[0], d[2]) * Math.hypot(s[0], s[2]) + 1e-5)), 3);
	const h = Math.max(d[1], 0), low = Math.exp(-h * 5);
	return [0, 1, 2].map((i) => {
		const c = /** @type {'r'|'g'|'b'} */ ('rgb'[i]);
		const fex = Math.exp(-(betaR[i] * 8.4e3 * inv + betaM[i] * 1.25e3 * inv));
		const ratio = (betaR[i] * rPhase + betaM[i] * mPhase) / (betaR[i] + betaM[i]);
		let lin = Math.pow(sunE * ratio * (1 - fex), 1.5);
		lin *= 1 + (Math.pow(sunE * ratio * fex, 0.5) - 1) * Math.min(1, Math.max(0, Math.pow(1 - s[1], 5)));
		const air = (NIGHT_HORIZON[c] + (NIGHT_ZENITH[c] - NIGHT_HORIZON[c]) * Math.pow(h, 0.45)) * night;
		const dusk = (BLUE_HOUR[c] * (1 - toward) * (0.55 + 0.45 * low) + DUSK_GLOW[c] * toward * 1.6 * low) * tw * 0.9;
		return (lin + 0.1 * fex) * 0.04 + [0, 0.0003, 0.00075][i] + air + dusk;
	});
}

/**
 * The air at the horizon all round (a little above it, where the haze meets the sky), 16 bearings from +x toward
 * +z: what the haze becomes, warm toward a low sun, pale by day, blue in the blue hour. Linear, before the lens.
 * @param {THREE.Vector3} sun
 * @returns {THREE.Color[]}
 */
export function horizonRing(sun) {
	const air = airOf(sun.y), s = sun.toArray(), el = 0.05;
	return Array.from({ length: 16 }, (_, k) => {
		const a = (k / 16) * Math.PI * 2;
		return new THREE.Color().fromArray(skyAt([Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a)], s, air));
	});
}

/** how far the stars have turned at an hour (noon at half past twelve) @param {number} hour */
export function celestial(hour) {
	return { turn: ((hour - 12.5) / 24) * Math.PI * 2 };
}

/** The galactic plane's pole in the stars' own frame (the celestial pole is +y): the Milky Way crosses at 63°. */
const GALACTIC_POLE = new THREE.Vector3(Math.sin(1.1) * Math.cos(2.1), Math.cos(1.1), Math.sin(1.1) * Math.sin(2.1)).normalize();

/** A star catalogue: the faint stars the eye sees on a dark night, a few bright ones, and the Milky Way's band. */
function catalogue() {
	const r = seededMinStd(19700101); // the same stars in every world, every frame, every film
	/** @type {number[]} */ const pos = [], col = [], bright = [];
	const tints = [
		[0.7, 0.8, 1.0, 0.12], // blue-white (B, A)
		[0.95, 0.97, 1.0, 0.33], // white
		[1.0, 0.96, 0.86, 0.3], // yellow-white (F, G)
		[1.0, 0.85, 0.66, 0.17], // orange (K)
		[1.0, 0.72, 0.52, 0.08] // red-orange (M)
	];
	const add = (/** @type {THREE.Vector3} */ d, /** @type {number} */ m) => {
		pos.push(d.x, d.y, d.z);
		let u = r(), t = tints[1];
		for (const x of tints) if ((u -= x[3]) <= 0) (t = x), (u = 9);
		col.push(t[0], t[1], t[2]);
		// a magnitude's light: each step of 1 is 2.5 times fainter; the 6th the faintest seen
		bright.push(Math.pow(10, -0.4 * (m - 6)));
	};
	// ten times as many each 2.5 magnitudes fainter
	for (let i = 0; i < 2600; i++) {
		const y = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - y * y);
		add(new THREE.Vector3(Math.cos(a) * s, y, Math.sin(a) * s), Math.max(-1.2, 6.4 + 2.5 * Math.log10(Math.max(1e-4, r()))));
	}
	const e1 = new THREE.Vector3(1, 0, 0).cross(GALACTIC_POLE).normalize(), e2 = GALACTIC_POLE.clone().cross(e1);
	for (let i = 0; i < 3400; i++) {
		const a = r() * Math.PI * 2, spread = (r() + r() + r() - 1.5) * 0.16;
		add(e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(GALACTIC_POLE, spread).normalize(), 5.6 + r() * 1.4);
	}
	return { pos: new Float32Array(pos), col: new Float32Array(col), bright: new Float32Array(bright) };
}

/**
 * Drawn into a render target (the environment's cube, a post stack's buffer) a node material would still be tone mapped
 * and encoded for the screen (three's WebGLNodesHandler takes the renderer's settings as they are): as three does for
 * its own materials, not there.
 * @param {THREE.Object3D} o @param {(r: THREE.WebGLRenderer, cam: THREE.Camera) => void} place
 */
function atFarPlane(o, place) {
	/** @type {[() => void, string] | null} */
	let was = null;
	o.onBeforeRender = (r, _s, cam) => {
		place(r, cam);
		if (r.getRenderTarget()) (was = [withTone(r, 'none'), r.outputColorSpace]), (r.outputColorSpace = THREE.LinearSRGBColorSpace);
	};
	o.onAfterRender = (r) => {
		if (was) was[0](), (r.outputColorSpace = was[1]);
		was = null;
	};
	// it stands round the camera wherever it goes: never culled
	o.frustumCulled = false;
}

/** the sky's material: Preetham's air, clouds, the night, the moon and the Milky Way, a mood's look over it */
function skyMaterial() {
	const U = {
		sun: uniform(new THREE.Vector3(0, 1, 0)),
		sunE: uniform(0),
		betaR: uniform(new THREE.Vector3()),
		betaM: uniform(new THREE.Vector3()),
		disc: uniform(1),
		clouds: uniform(0),
		drift: uniform(0),
		moon: uniform(new THREE.Vector3(0, 1, 0)),
		moonLight: uniform(0),
		stars: uniform(0),
		twilight: uniform(0),
		night: uniform(0),
		pole: uniform(GALACTIC_POLE.clone()),
		zenith: uniform(new THREE.Color()),
		haze: uniform(new THREE.Color()),
		look: uniform(0),
		gain: uniform(new THREE.Vector3(1, 1, 1))
	};
	const m = new NodeMaterial();
	m.name = 'Sky';
	m.side = THREE.BackSide;
	m.depthWrite = false;
	m.fog = false;
	m.vertexNode = Fn(() => {
		const p = modelViewProjection;
		p.z.assign(p.w);
		return p;
	})();
	// value noise for the clouds: a sinless hash, so every GPU makes the same clouds
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
	m.colorNode = Fn(() => {
		const d = normalize(positionWorld.sub(cameraPosition)), h = d.y;
		// Preetham: the optical length through the air, its extinction, and the light scattered toward the eye
		const zen = acos(max(0, h));
		const inv = float(1).div(cos(zen).add(pow(float(93.885).sub(zen.mul(57.2957795)), -1.253).mul(0.15)));
		const fex = exp(U.betaR.mul(inv.mul(8.4e3)).add(U.betaM.mul(inv.mul(1.25e3))).negate());
		const cosT = dot(d, U.sun), g = float(AIR.g), g2 = g.mul(g);
		const rPhase = float(0.0596831).mul(pow(cosT.mul(0.5).add(0.5), 2).add(1));
		const mPhase = float(0.0795775).mul(sub(1, g2)).div(pow(sub(1, g.mul(2).mul(cosT)).add(g2), 1.5));
		const ratio = U.betaR.mul(rPhase).add(U.betaM.mul(mPhase)).div(U.betaR.add(U.betaM));
		const lin = pow(ratio.mul(U.sunE).mul(sub(1, fex)), vec3(1.5)).mul(mix(vec3(1), pow(ratio.mul(U.sunE).mul(fex), vec3(0.5)), clamp(pow(sub(1, U.sun.y), 5), 0, 1)));
		const disc = clamp(cosT.sub(0.9999566769).mul(50000), 0, 1).mul(U.disc);
		const sky = lin.add(fex.mul(0.1)).mul(0.04).add(min(fex.mul(U.sunE), 80).mul(760 * 0.04).mul(disc)).add(vec3(0, 0.0003, 0.00075)).toVar();
		// clouds: fair-weather streaks on a plane, lit by the sun through the air, thinning to the horizon
		If(h.greaterThan(0).and(U.clouds.greaterThan(0)), () => {
			const q = d.xz.div(h.mul(0.55)).mul(0.0002).add(U.drift).mul(1000).toVar();
			const n = float(0).toVar(), amp = float(1).toVar();
			Loop(4, () => {
				n.addAssign(amp.mul(noise(q)));
				amp.mulAssign(0.5);
				q.mulAssign(2).addAssign(U.drift.mul(300));
			});
			const dens = n.mul(0.7).add(0.5).clamp(0, 1);
			const cov = clamp(U.clouds.add(noise(d.xz.div(h.mul(0.55)).mul(0.06)).mul(0.22)), 0, 1);
			const depth = max(0, dens.sub(sub(1, cov)));
			const fade = smoothstep(0, 0.06, h);
			const beer = exp(depth.mul(-4));
			const lit = fex.mul(U.sunE).mul(0.0088).mul(mix(0.45, 1, beer.mul(sub(1, beer.mul(beer))).mul(2.6).clamp(0, 1)));
			const cloud = lin.mul(0.04).add(lit).mul(smoothstep(-0.08, 0.3, U.sun.y).max(0.03));
			sky.assign(mix(sky, mix(sky, cloud, fex), sub(1, exp(depth.mul(-4.8))).mul(fade)));
		});
		// the universe behind the air: space, the Milky Way's uneven glow along the galactic plane, the full moon
		const gb = dot(d, U.pole);
		const band = exp(gb.mul(gb).mul(-55)).mul(sin(atan(d.z, d.x).mul(3).add(gb.mul(9))).mul(0.35).add(0.65));
		const toMoon = sub(1, dot(d, U.moon));
		const disk = sub(1, smoothstep(0.000035, 0.000045, toMoon));
		const moon = vec3(0.95, 0.94, 0.9).mul(disk.mul(sub(1, smoothstep(0, 0.000045, toMoon)).mul(0.25).add(0.75)).mul(2.2)).add(vec3(0.55, 0.62, 0.8).mul(exp(toMoon.mul(-600)).mul(0.035))).mul(U.moonLight);
		const space = vec3(SPACE.r, SPACE.g, SPACE.b).add(vec3(0.0066, 0.0072, 0.0096).mul(band));
		// the night air and the twilight: a warm band where the sun went down, the blue hour everywhere else
		const hp = max(h, 0), low = exp(hp.mul(-5));
		const toward = pow(max(dot(normalize(d.xz.add(1e-5)), normalize(U.sun.xz.add(1e-5))), 0), 3);
		const air = mix(vec3(NIGHT_HORIZON.r, NIGHT_HORIZON.g, NIGHT_HORIZON.b), vec3(NIGHT_ZENITH.r, NIGHT_ZENITH.g, NIGHT_ZENITH.b), pow(hp, 0.45)).mul(U.night);
		const dusk = vec3(BLUE_HOUR.r, BLUE_HOUR.g, BLUE_HOUR.b).mul(sub(1, toward)).mul(mix(0.55, 1, low)).add(vec3(DUSK_GLOW.r, DUSK_GLOW.g, DUSK_GLOW.b).mul(toward.mul(1.6).mul(low)));
		const c = sky.add(air).add(dusk.mul(U.twilight.mul(0.9))).add(space.add(moon).mul(U.stars)).toVar();
		// under the horizon the land, dark (the world draws itself over it)
		c.mulAssign(sub(1, smoothstep(0, 0.08, h.negate()).mul(0.65)));
		// a world's mood as a look: its lid from the haze low down to its zenith
		const look = mix(U.haze, U.zenith, pow(clamp(h, 0, 1), 0.5));
		return vec4(mix(c, look, U.look).mul(U.gain), 1);
	})();
	return { material: m, U };
}

/**
 * @typedef {object} UniverseView
 * @property {THREE.Vector3} sun where the sun is (unit, world)
 * @property {THREE.Vector3} moon where the moon is (unit, world)
 * @property {THREE.Quaternion} stars how the star sphere is turned (its own frame: the celestial pole is +y)
 * @property {number} [drift] how far the clouds have drifted (the hour's)
 */

/**
 * The dome and the stars: one universe.
 * @param {{ clouds?: number, mirror?: boolean, disc?: boolean }} [o] clouds: how much of the sky they cover; mirror:
 *   the stars drawn mirrored north for south, for a real place's sky (./sky.js `map`); disc: the sun's disc (none in
 *   the sky's light, whose reflection would sparkle on every leaf)
 */
export function createUniverse(o = {}) {
	const { material, U } = skyMaterial();
	U.clouds.value = o.clouds ?? 0.4;
	U.disc.value = o.disc === false ? 0 : 1;
	const dome = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
	dome.name = 'sky';
	dome.renderOrder = -2;
	atFarPlane(dome, (_r, cam) => {
		dome.position.copy(cam.position);
		dome.scale.setScalar(/** @type {THREE.PerspectiveCamera} */ (cam).far * 0.5);
		dome.updateMatrixWorld();
	});

	// the stars: a quad each, its size by its brightness, at the far plane
	const cat = catalogue(), quad = new THREE.PlaneGeometry(1, 1);
	const geo = new THREE.InstancedBufferGeometry();
	geo.index = quad.index;
	geo.setAttribute('position', quad.attributes.position);
	geo.setAttribute('uv', quad.attributes.uv);
	geo.setAttribute('star', new THREE.InstancedBufferAttribute(cat.pos, 3));
	geo.setAttribute('tint', new THREE.InstancedBufferAttribute(cat.col, 3));
	geo.setAttribute('bright', new THREE.InstancedBufferAttribute(cat.bright, 1));
	geo.instanceCount = cat.bright.length;
	const through = uniform(0), px = uniform(new THREE.Vector2(1e-3, 1e-3)), ratio = uniform(1);
	const bright = attribute('bright', 'float');
	const dir = normalize(modelWorldMatrix.mul(vec4(attribute('star', 'vec3'), 0)).xyz);
	const starMat = new NodeMaterial();
	starMat.name = 'Stars';
	starMat.transparent = true;
	starMat.depthWrite = false;
	starMat.blending = THREE.AdditiveBlending;
	starMat.fog = false;
	starMat.vertexNode = Fn(() => {
		const c = cameraProjectionMatrix.mul(vec4(cameraViewMatrix.mul(vec4(dir, 0)).xyz, 1)).toVar();
		const size = clamp(log2(bright.add(1)).mul(0.55).add(1), 1, 3.6).mul(ratio);
		return vec4(c.xy.add(positionGeometry.xy.mul(size).mul(px).mul(c.w)), c.w.mul(0.99999), c.w);
	})();
	// through more air near the horizon a star dims and is gone; by day none shows
	const tint = varying(attribute('tint', 'vec3').mul(min(bright.mul(through).mul(smoothstep(-0.02, 0.35, dir.y)), 1.6)).mul(0.9));
	starMat.colorNode = vec4(tint.mul(sub(1, smoothstep(0, 0.5, length(uv().sub(0.5))))), 1);
	const stars = new THREE.Mesh(geo, starMat);
	stars.name = 'stars';
	if (o.mirror) stars.scale.z = -1;
	stars.renderOrder = -1;
	const turn = new THREE.Quaternion(), size = new THREE.Vector2();
	atFarPlane(stars, (r, cam) => {
		stars.position.copy(cam.position);
		stars.quaternion.copy(turn);
		stars.updateMatrixWorld();
		r.getDrawingBufferSize(size);
		px.value.set(2 / size.x, 2 / size.y);
		ratio.value = r.getPixelRatio();
	});

	return {
		dome,
		stars,
		material,
		U,
		/** @param {UniverseView} v */
		set(v) {
			const air = airOf(v.sun.y);
			U.sun.value.copy(v.sun);
			U.sunE.value = air.sunE;
			U.betaR.value.fromArray(air.betaR);
			U.betaM.value.fromArray(air.betaM);
			U.drift.value = v.drift ?? 0;
			U.moon.value.copy(v.moon);
			turn.copy(v.stars);
			// the Milky Way's glow lies along the stars as they are drawn, mirrored with them for a real place
			U.pole.value.copy(GALACTIC_POLE);
			if (o.mirror) U.pole.value.z = -U.pole.value.z;
			U.pole.value.applyQuaternion(turn);
			const alt = Math.asin(Math.max(-1, Math.min(1, v.sun.y)));
			U.twilight.value = twilightOf(alt);
			U.night.value = U.moonLight.value = nightOf(alt);
			U.stars.value = through.value = starsOf(alt);
		},
		dispose() {
			dome.geometry.dispose();
			material.dispose();
			quad.dispose();
			geo.dispose();
			starMat.dispose();
		}
	};
}

/**
 * The turn of the stars over a world on the ground at an hour: the celestial pole stands LATITUDE° up in the north
 * (+z), and the sky turns round it with the sun, a full turn a day.
 * @param {number} hour
 */
export function groundStars(hour) {
	const lat = THREE.MathUtils.degToRad(LATITUDE);
	const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, Math.sin(lat), Math.cos(lat)));
	return tilt.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -celestial(hour).turn));
}
