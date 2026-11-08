// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A PLANT'S GROUND ON THE STAGE — where a plant is shown standing: its biome's floor laid out to the horizon, whole, as a
 * garden's is, its roots out of sight in the earth; and that earth seen by going down into it: tilt the camera below
 * the ground line and the frame splits there, as a documentary's split-level shot does, the plant and its garden above
 * and below the soil it stands in, its horizons, and its roots in it.
 *
 *   the floor   the biome's surfaces as the worlds paint them ($content/biomes `groundMaterial`, from the vault's card),
 *               out to where it fades into the studio's backdrop (under the sky, $content/sandbox-kit/sky.js, into the horizon behind it); round the stem a ring of mulch, where a seedling
 *               stands in a garden; its cover (grasses, clover, leaves) streamed round the plant, thinning with
 *               distance and growing up or sinking back on the graphics card, never popping (`coverStream`). It faces
 *               up only, so from below the ground it is not drawn and the eye sees on into the garden
 *   the earth   below the ground line: a face of it standing just beyond the farthest root behind the plant, square to
 *               the eye (it turns as the eye goes round, eased), so wide and deep its edges are never seen, the ground
 *               line its top; drawn only while the eye is below the ground (above it, the floor hides it and it costs
 *               nothing); between the eye and the face the earth is left out (we look through it as through glass), the
 *               cover too, so a band of turf stands only just beyond it, on the ground line; the face darkening and running to one
 *               colour the further it lies beyond its nearest point, as if seen through the earth itself
 *   the soil    painted on those faces in the world's own metres (one 3D field): the biome's horizons from ./soils.js at
 *               their real depths, their boundaries waved and run into each other as wide as the profile says, the
 *               crumbs, blocks, plates or grains of each, its stones, roots, worm burrows, rust mottles, lime, charcoal
 *               and fungal threads; what is too small to see at the distance (smaller than two pixels) fades to its
 *               colour and is not worked out at all, so far faces cost little
 *   the roots   the plant's own, as it grows them, crisp in the earth's clear middle
 *
 * `groundOf(stage)` → { group, biome(recipe, id), fit(root), show(on), update(camera, dt), below, rootsView(camera),
 * soil, dispose }.
 */
import * as THREE from 'three';
import { groundMaterial } from '$lib/content/biomes/surfaces.js';
import { coverStream } from '$lib/content/biomes/stream.js';
import { biomeOfCard } from '$lib/content/biomes/card.js';
import { MOST, PED, soilOf } from './soils.js';

/** how green a floor looks: the share of its ground that is living mat or moss, from its surfaces' weights */
const greenness = (recipe) => {
	const w = recipe?.surface ?? {};
	const all = Object.values(w).reduce((a, b) => a + (b ?? 0), 0);
	return all > 0 ? ((w.green ?? 0) + 0.8 * (w.moss ?? 0)) / all : 0;
};

/**
 * The library's biomes a plant can stand on: each one's newest accepted version, read off its card (one whose card is
 * no floor's is left out), the greenest first (Samuel 2026-11-04: every plant is shown on one green floor, the
 * first), then by name. Each is known by `key`, its asset's UUID (its id where the index gives none).
 * @param {{ index: { recipes: Record<string, any> }, cardOf: (hash: string) => any }} source
 * @returns {{ key: string, id: string, label: string, hash: string, recipe: any }[]}
 */
export function groundsIn(source) {
	const newest = new Map();
	for (const [hash, r] of Object.entries(source.index.recipes)) {
		if (r.group !== 'biomes' || r.id === 'cover' || r.proposed || r.variant) continue;
		const key = r.asset ?? r.id, was = newest.get(key);
		if (!was || r.v > was.v) newest.set(key, { ...r, hash, key });
	}
	const out = [];
	for (const r of newest.values()) {
		try {
			out.push({ key: r.key, id: r.id, label: String(r.label ?? r.id).replace(/ floor$/i, ''), hash: r.hash, recipe: biomeOfCard(source.cardOf(r.hash)) });
		} catch {
			/* a card that is no floor's: not offered */
		}
	}
	return out.sort((a, b) => greenness(b.recipe) - greenness(a.recipe) || a.label.localeCompare(b.label));
}

/** the floor when the library offers no biome: a living mat of short green, a little bare soil */
const BARE = { green: 10, soil: 0.3 };

/** a colour as the shader takes it (linear) @param {string} hex */
const lin = (hex) => new THREE.Color(hex);

const NOISE = /* glsl */ `
float gH1(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 gH3(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float gN(vec3 p) {
	vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(gH1(i), gH1(i + vec3(1, 0, 0)), f.x), mix(gH1(i + vec3(0, 1, 0)), gH1(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(gH1(i + vec3(0, 0, 1)), gH1(i + vec3(1, 0, 1)), f.x), mix(gH1(i + vec3(0, 1, 1)), gH1(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float gF(vec3 p) { float a = 0.0, w = 0.5; for (int i = 0; i < 4; i++) { a += w * gN(p); p = p * 2.03 + 17.1; w *= 0.5; } return a / 0.9375; }
// the nearest and second nearest of a field of points (one a cell), the nearest's own number, and the way from it to p
vec3 gV(vec3 p, out vec3 toC) {
	vec3 i = floor(p), f = fract(p);
	float f1 = 8.0, f2 = 8.0, id = 0.0; toC = vec3(0.0);
	for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
		vec3 g = vec3(float(x), float(y), float(z));
		vec3 r = g + gH3(i + g) - f;
		float d = dot(r, r);
		if (d < f1) { f2 = f1; f1 = d; id = gH1(i + g + 7.7); toC = -r; } else if (d < f2) f2 = d;
	}
	return vec3(sqrt(f1), sqrt(f2), id);
}
// how much of a feature size across is seen at px metres a pixel: none under two pixels
float gSeen(float size, float px) { return clamp((size / max(px, 1e-6) - 2.0) / 4.0, 0.0, 1.0); }
`;

/** where the plant stands and the eye is, shared by every material of the ground */
const groundUniforms = () => ({
	uC: { value: new THREE.Vector3() },
	uEye: { value: new THREE.Vector3() },
	uRing: { value: 0.3 },
	/** while the eye is below the ground (1, else 0), the cover between it and the earth's face is left out */
	uHide: { value: 0 },
	/** the way from the plant towards the eye, level, and how far behind the plant the earth's face stands (m) */
	uF: { value: new THREE.Vector3(0, 0, 1) },
	uB: { value: 1 },
	/** how deep a band of turf beyond the face is left standing on the ground line while the eye is below (m) */
	uBand: { value: 1 }
});

const GROUND_HEAD = /* glsl */ `uniform vec3 uC; uniform vec3 uEye; uniform float uRing; uniform float uHide; uniform vec3 uF; uniform float uB; uniform float uBand;`;

/**
 * the soil's material for the earth's faces, seen from inside: a soil's horizons as uniforms, the field worked out per
 * pixel, darkening with its distance from the eye
 * @param {ReturnType<typeof groundUniforms>} g
 */
function soilMaterial(g) {
	const u = {
		sN: { value: 1 },
		sTo: { value: new Array(MOST).fill(9) },
		sCol: { value: Array.from({ length: MOST }, () => new THREE.Color()) },
		sCol2: { value: Array.from({ length: MOST }, () => new THREE.Color()) },
		sPed: { value: Array.from({ length: MOST }, () => new THREE.Vector4()) },
		sBits: { value: Array.from({ length: MOST }, () => new THREE.Vector4()) },
		sMarks: { value: Array.from({ length: MOST }, () => new THREE.Vector4()) },
		sMore: { value: Array.from({ length: MOST }, () => new THREE.Vector4()) },
		sEdge: { value: Array.from({ length: MOST }, () => new THREE.Vector3()) },
		sStone: { value: new THREE.Color('#8a847c') },
		sRoot: { value: lin('#d9c29a') },
		sThread: { value: lin('#efe9dc') },
		sRust: { value: lin('#b0581e') },
		sGrey: { value: lin('#8d918c') },
		sLime: { value: lin('#ece6d8') },
		/** the earth seen far through itself: what it darkens to, over how many metres beyond its nearest point, and how deep the roots go */
		uHazeC: { value: new THREE.Color() },
		uHazeL: { value: 1 },
		uHazeNear: { value: 0 },
		uDeep: { value: 1 }
	};
	const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0 });
	m.userData.soil = u;
	m.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, u, g);
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vSW;')
			.replace('#include <project_vertex>', '#include <project_vertex>\nvSW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
		sh.fragmentShader = sh.fragmentShader
			.replace(
				'#include <common>',
				`#include <common>
varying vec3 vSW;
uniform int sN;
uniform float sTo[${MOST}];
uniform vec3 sCol[${MOST}]; uniform vec3 sCol2[${MOST}];
uniform vec4 sPed[${MOST}]; uniform vec4 sBits[${MOST}]; uniform vec4 sMarks[${MOST}]; uniform vec4 sMore[${MOST}];
uniform vec3 sEdge[${MOST}];
uniform vec3 sStone; uniform vec3 sRoot; uniform vec3 sThread; uniform vec3 sRust; uniform vec3 sGrey; uniform vec3 sLime;
uniform vec3 uHazeC; uniform float uHazeL; uniform float uHazeNear; uniform float uDeep;
${GROUND_HEAD}
${NOISE}
bool kind0(vec4 ped) { return int(ped.y + 0.5) == ${PED.crumb}; }
// a horizon's matrix colour at p: its two colours in blotches
vec3 gMatrix(int h, vec3 p) { return mix(sCol[h], sCol2[h], smoothstep(0.25, 0.75, gF(p * 8.0 + float(h) * 3.1))); }
// where boundary i lies under p.xz: its depth, waved, and its tongues reaching down
float gBound(int i, vec3 p) {
	vec3 e = sEdge[i];
	vec3 q = vec3(p.xz / max(e.x * 7.0, 0.04), float(i) * 3.7);
	float b = sTo[i] + e.x * ((gN(q) * 0.7 + gN(q * 2.7 + 1.3) * 0.3) * 2.0 - 1.0);
	return b + e.z * pow(gN(vec3(p.xz / max(e.z * 0.8, 0.02), float(i) * 5.1 + 2.0)), 4.0) * 2.2;
}
// the earth at p (m, the surface at y 0): its colour, its relief (m, how far the cut face stands out or sinks there: the
// height a bump map reads) and how rough it is
vec3 gSoil(vec3 p, float px, out float hgt, out float rough) {
	hgt = 0.0; rough = 0.95;
	float d = -p.y;
	// which horizon: below each boundary that lies above it, each run into the next over as wide as it says
	int h = 0;
	float blend = 0.0;
	int nb = 0;
	for (int i = 0; i < ${MOST - 1}; i++) {
		if (i >= sN - 1) break;
		vec3 e = sEdge[i];
		float w = max(e.y, 0.002);
		// far above this boundary: above every deeper one too; far below it: past it, no noise needed
		if (d < sTo[i] - e.x - w * 1.2) break;
		if (d > sTo[i] + e.x + e.z * 2.2 + w * 1.2) { h = i + 1; continue; }
		float b = gBound(i, p);
		// a gradual boundary interfingers: lumps of each in the other, as wide as the transition
		float fringe = (gN(p / (w * 1.2) + float(i) * 11.0) * 0.65 + gN(p / (w * 0.45) + float(i) * 5.0) * 0.35 - 0.5) * w * 1.6;
		if (d > b + fringe) h = i + 1;
		float t = 1.0 - abs(d - b) / w;
		if (t > blend) { blend = t; nb = i; }
	}
	vec4 ped = sPed[h], bits = sBits[h], marks = sMarks[h], more = sMore[h];
	vec3 c = gMatrix(h, p);
	// across a boundary the two colours run into each other
	if (blend > 0.0) {
		int other = h == nb ? nb + 1 : nb;
		c = mix(c, gMatrix(other, p), clamp(blend, 0.0, 1.0) * 0.45);
	}
	// darker earth along old root channels and in the humus washed down cracks, lighter where it dried
	c *= 0.86 + 0.28 * gF(p * 26.0 + 4.0);
	float fineSeen = gSeen(0.006, px);
	c *= 1.0 + (gN(p * 160.0) - 0.5) * 0.22 * fineSeen;
	// the cut face's own relief: clods a few centimetres across that the spade broke it into, and their crumbs
	float clod = gN(p / 0.028 + 3.0) * 0.6 + gN(p / 0.011 + 8.0) * 0.4;
	hgt += (clod - 0.5) * (kind0(ped) ? 0.009 : 0.006);
	c *= 0.9 + 0.2 * clod;
	int kind = int(ped.y + 0.5);
	float S = ped.x;
	float seen = gSeen(S, px);
	if (seen > 0.0 && kind <= ${PED.prismatic}) {
		// its peds: crumbs round, blocks angular, plates flat, prisms upright; pores and cracks dark between them
		vec3 q = p / S;
		if (kind == ${PED.platy}) q.y *= 3.0;
		if (kind == ${PED.prismatic}) q.y *= 0.33;
		vec3 toC; vec3 v = gV(q, toC);
		float gap = kind == ${PED.crumb}
			? min(1.0, smoothstep(0.34, 0.52, v.x) * 0.8 + (1.0 - smoothstep(0.0, 0.07, v.y - v.x)) * 0.45)
			: 1.0 - smoothstep(0.0, 0.05, v.y - v.x);
		c *= 1.0 + (v.z - 0.5) * ped.w * seen;
		c *= 1.0 - gap * ped.z * seen;
		hgt += (kind == ${PED.crumb} ? (0.5 - v.x) * 0.5 : 0.0) * S * seen - gap * S * 0.35 * seen;
	} else if (kind == ${PED.grain}) {
		// loose grains of sand, each its own: a few dark, a few glinting
		float gs = gSeen(S, px);
		float g = gH1(floor(p / S));
		c *= 1.0 + (g - 0.5) * 0.4 * gs;
		c = mix(c, c * 0.55, step(0.93, g) * gs);
		c = mix(c, c * 1.3, step(g, 0.05) * gs);
		hgt += (g - 0.5) * S * 0.5 * gs;
		rough = 0.88;
	} else if (kind == ${PED.litter}) {
		// fallen leaves and needles lying flat, layered, each piece its own shade; dark gaps between
		vec3 toC; vec3 v = gV(p * vec3(1.0 / S, 1.0 / (S * 0.12), 1.0 / S), toC);
		float ls = gSeen(S * 0.12, px);
		c = mix(sCol[h], sCol2[h], v.z) * (0.72 + 0.5 * gH1(vec3(v.z * 91.0)));
		float gap = 1.0 - smoothstep(0.0, 0.12, v.y - v.x);
		c *= 1.0 - gap * ped.z * ls;
		hgt += (0.5 - gap) * S * 0.15 * ls;
		rough = 0.85;
	} else if (kind == ${PED.peat}) {
		// matted humus: fine dark fibres, mostly lying
		float fs = gSeen(S, px);
		float f = gN(p * vec3(1.0 / S, 4.0 / S, 1.0 / S));
		c *= 0.8 + 0.4 * f * fs + 0.2 * (1.0 - fs);
		hgt += (f - 0.5) * S * 0.4 * fs;
	}
	// stones: more and bigger towards the rock, rounded-angular, each its own shade, a dark rim where the earth parts from it
	for (int k = 0; k < 2; k++) {
		if (bits.x <= 0.0) break;
		float sz = k == 0 ? bits.y : bits.y * 0.32;
		float share = k == 0 ? bits.x : min(1.0, bits.x * 1.6);
		if (gSeen(sz * 0.4, px) <= 0.0) break;
		vec3 toC; vec3 v = gV(p / sz + 31.0 + float(k) * 7.0, toC);
		float r = 0.3 + 0.22 * fract(v.z * 13.1) + (gN(p / sz * 3.0) - 0.5) * 0.16;
		float isS = step(v.z, share * 1.4);
		float inside = isS * (1.0 - smoothstep(r - 0.03, r, v.x)) * smoothstep(0.015, 0.05, v.y - v.x);
		vec3 sc = sStone * (0.7 + 0.55 * fract(v.z * 71.3)) * (0.8 + 0.3 * gN(p / sz * 12.0)) * (0.9 + 0.2 * gN(p * 900.0) * gSeen(0.002, px));
		float rim = isS * (smoothstep(r - 0.02, r, v.x) - smoothstep(r, r + 0.06, v.x));
		c *= 1.0 - 0.55 * rim;
		c = mix(c, sc, inside);
		hgt += inside * sz * (0.12 + 0.25 * (r - v.x)) - rim * sz * 0.06;
		rough = mix(rough, 0.68, inside);
	}
	// old animal burrows filled with the earth of another horizon (a black earth's krotovinas)
	if (more.x > 0.0) {
		vec3 toC; vec3 v = gV(p * vec3(1.0 / 0.26, 1.0 / 0.4, 1.0 / 0.26) + 5.0, toC);
		float kr = step(v.z, more.x * 0.3) * (1.0 - smoothstep(0.22, 0.27, v.x));
		vec3 fill = h > 0 ? sCol[h - 1] : sCol2[h + 1];
		c = mix(c, fill * (0.9 + 0.2 * gN(p * 40.0)), kr);
	}
	// fine roots: pale threads wandering through it, more in some places than others; seen at least as a hint
	if (bits.z > 0.0) {
		// fine roots, a millimetre or so thick, running mostly downwards: each a short straight piece in the earth, so the
		// face shows them as the spade cut them, a dash where it runs along one, a pale dot where it cut across
		vec3 toC; vec3 v = gV(p / 0.012 + 23.0, toC);
		vec3 rh = gH3(vec3(v.z * 97.0, v.z * 13.0, 5.0));
		vec3 dir = normalize(vec3(rh.x - 0.5, -1.1 - rh.y, rh.z - 0.5));
		float t = clamp(dot(toC, dir), -0.9, 0.9);
		float rd = length(toC - dir * t);
		float rw = 0.045 + 0.04 * rh.z;
		float fat = max(1.0, px / (0.012 * rw * 2.0));
		float root = step(v.z, bits.z * 0.42) * (1.0 - smoothstep(rw * 0.6 * fat, rw * fat, rd)) / fat;
		c = mix(c, sRoot * (0.78 + 0.4 * rh.y), root * 0.9);
		hgt += root * 0.0007;
	}
	// fungal threads: a white web in the humus
	if (marks.w > 0.0) {
		float ts = gSeen(0.0008, px);
		float n = gN(p * 160.0 + 21.0);
		float web = (1.0 - smoothstep(0.0, 0.025, abs(n - 0.5))) * smoothstep(0.55 - marks.w * 0.35, 0.9, gN(p * 14.0 + 3.0));
		c = mix(c, sThread, web * ts * 0.8);
		c = mix(c, sThread * 0.8, smoothstep(0.82 - marks.w * 0.1, 0.95, gF(p * 30.0 + 8.0)) * marks.w * 0.25 * (1.0 - ts));
	}
	// where water stands at times: rust mottles and grey streaks
	if (marks.x > 0.0) {
		float rust = smoothstep(0.6, 0.68, gF(p * 22.0 + 9.0)) * marks.x;
		float grey = smoothstep(0.64, 0.72, gF(p * 16.0 + 3.0)) * marks.x;
		c = mix(c, sRust * (0.85 + 0.3 * gN(p * 90.0)), rust * 0.85);
		c = mix(c, sGrey, grey * 0.7);
	}
	// lime: soft white nodules and threads
	if (marks.y > 0.0) {
		vec3 toC; vec3 v = gV(p / 0.011 + 17.0, toC);
		float nod = step(v.z, marks.y * 0.3) * (1.0 - smoothstep(0.24, 0.32, v.x)) * max(gSeen(0.006, px), 0.4);
		float thread = (1.0 - smoothstep(0.0, 0.02, abs(gN(p * 120.0 + 31.0) - 0.5))) * marks.y * 0.6 * gSeen(0.001, px);
		c = mix(c, sLime, max(nod, thread));
		hgt += nod * 0.002;
	}
	// charcoal: black, glinting flecks
	if (marks.z > 0.0) {
		vec3 toC; vec3 v = gV(p / 0.006 + 41.0, toC);
		float ch = step(v.z, marks.z * 0.22) * (1.0 - smoothstep(0.0, 0.08, v.y - v.x - 0.12)) * step(v.x, 0.42) * max(gSeen(0.004, px), 0.3);
		c = mix(c, vec3(0.012, 0.011, 0.01), ch);
		rough = mix(rough, 0.45, ch);
	}
	// worm burrows: cut across, round dark holes lined with darker earth (the walls they coat with their casts), from the
	// endogeic worms' in the topsoil, 2–5 mm, to the anecic worm's that run upright a metre and more, 6–9 mm; and where
	// a face runs along one, its channel
	float poreShare = (kind == ${PED.crumb} ? 0.3 : kind <= ${PED.prismatic} ? 0.12 : 0.04) * ped.z;
	if (bits.w > 0.0 || poreShare > 0.0) {
		vec3 toC; vec3 v = gV(p / 0.016 + 13.0, toC);
		// pores between the crumbs and the old channels of roots: dark, 1–4 mm
		float pr = 0.06 + 0.1 * fract(v.z * 53.1);
		float pore = step(v.z, poreShare) * (1.0 - smoothstep(pr * 0.7, pr, v.x)) * max(gSeen(0.002, px), 0.35);
		c = mix(c, c * 0.28, pore);
		hgt -= pore * 0.0025;
		float deepOk = step(d, 0.25 + 1.4 * fract(v.z * 7.3));
		float r = (0.16 + 0.17 * fract(v.z * 31.7)) * mix(1.0, 0.6, step(0.35, d));
		float isW = step(1.0 - v.z, bits.w * 0.05) * deepOk * max(gSeen(0.004, px), 0.25);
		float ring = (1.0 - smoothstep(r, r * 1.9, v.x)) * isW;
		float hole = (1.0 - smoothstep(r * 0.8, r, v.x)) * isW;
		c = mix(c, c * 0.5, ring * 0.85);
		c = mix(c, vec3(0.016, 0.012, 0.008), hole);
		hgt -= hole * 0.004;
		vec2 cell = floor(p.xz / 0.09);
		vec3 hh = gH3(vec3(cell, 3.0));
		if (hh.x < bits.w * 0.42) {
			float deep = 0.3 + hh.y * 1.3;
			vec2 axis = (cell + 0.25 + 0.5 * hh.yz) * 0.09 + vec2(sin(p.y * 17.0 + hh.x * 40.0), cos(p.y * 13.0 + hh.y * 30.0)) * 0.011;
			float rr = 0.003 + 0.0015 * hh.z;
			float dist = length(p.xz - axis);
			float on = step(d, deep) * max(gSeen(rr * 2.0, px), 0.3);
			c = mix(c, c * 0.5, (1.0 - smoothstep(rr, rr * 2.0, dist)) * on * 0.85);
			c = mix(c, vec3(0.018, 0.013, 0.009), (1.0 - smoothstep(rr * 0.8, rr, dist)) * on);
			hgt -= (1.0 - smoothstep(rr * 0.8, rr, dist)) * on * 0.004;
		}
	}
	return c;
}
vec3 gPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
	vec3 sx = normalize(dFdx(surf_pos)), sy = normalize(dFdy(surf_pos));
	vec3 r1 = cross(sy, surf_norm), r2 = cross(surf_norm, sx);
	float det = dot(sx, r1) * faceDir;
	vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
	return normalize(abs(det) * surf_norm - grad);
}`
			)
			.replace(
				'#include <map_fragment>',
				`#include <map_fragment>
	float sPx = length(fwidth(vSW));
	float sHgt; float sRough;
	// the underside of the ground, seen from deep below: the topsoil over our heads, dim (no light comes from there)
	bool sCeil = abs(normalize(cross(dFdx(vSW), dFdy(vSW))).y) > 0.7;
	vec3 sP = vSW;
	if (sCeil) sP.y -= uDeep * 0.12;
	diffuseColor.rgb *= gSoil(sP, sPx, sHgt, sRough) * (sCeil ? 0.55 : 1.0);
	// the relief as the light sees it, measured across the pixel (as a bump map is)
	vec2 sDH = vec2(dFdx(sHgt), dFdy(sHgt)) * 1.6;
	// less light the deeper it lies
	diffuseColor.rgb *= 1.0 - 0.22 * clamp(-vSW.y / max(uDeep, 1e-3), 0.0, 1.0);`
			)
			.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = sRough;')
			// the underside of the ground (seen from deep below) lit as the face is, so the corner where they meet does not
			// show as a seam: the same earth, lit the same
			.replace(
				'#include <normal_fragment_maps>',
				'#include <normal_fragment_maps>\n\tnormal = gPerturb(-vViewPosition, normal, sDH, faceDirection);\n\tif (sCeil) normal = normalize((viewMatrix * vec4(uF, 0.0)).xyz);'
			)
			// seen through the earth: the further off, the darker and the more of one colour
			.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\t{ float hz = 1.0 - exp(-max(distance(vSW, uEye) - uHazeNear, 0.0) / uHazeL); gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeC, hz * 0.6) * (1.0 - 0.45 * hz); }');
	};
	m.customProgramCacheKey = () => 'viewer-soil';
	return m;
}

/** a soil's horizons into its material's uniforms @param {THREE.MeshStandardMaterial} m @param {import('./soils.js').Soil} soil */
function setSoil(m, soil) {
	const u = m.userData.soil, hs = soil.horizons.slice(0, MOST);
	u.sN.value = hs.length;
	hs.forEach((h, i) => {
		u.sTo.value[i] = h.to;
		u.sCol.value[i].set(h.col);
		u.sCol2.value[i].set(h.col2);
		u.sPed.value[i].set(h.ped.size, PED[h.ped.kind], h.ped.dark, h.ped.vary);
		u.sBits.value[i].set(h.stones?.share ?? 0, h.stones?.size ?? 0.04, h.roots ?? 0, h.worms ?? 0);
		u.sMarks.value[i].set(h.mottles ?? 0, h.lime ?? 0, h.charcoal ?? 0, h.hyphae ?? 0);
		u.sMore.value[i].set(h.krotovina ?? 0, 0, 0, 0);
		u.sEdge.value[i].set(h.wave ?? 0.02, h.sharp ?? 0.03, h.tongue ?? 0);
	});
	u.sStone.value.set(soil.stone);
	// far off, the earth darkens to its topsoil's colour (the first horizon that is no litter), dimmed as the light is down there
	const top = hs.find((h) => h.ped.kind !== 'litter' && h.ped.kind !== 'peat' && h.to > 0.04) ?? hs[0];
	u.uHazeC.value.set(top.col).multiplyScalar(0.5);
}

/**
 * the floor: a biome's surfaces (the worlds' shader), a ring of mulch round the stem, fading into the backdrop far off;
 * facing up only, so the eye below the ground sees on past it
 * @param {ReturnType<typeof groundUniforms>} g @param {THREE.Color} bg @param {THREE.Vector2} fade
 */
function floorMaterial(g, bg, fade, sky) {
	const m = groundMaterial(BARE);
	const inner = m.onBeforeCompile;
	m.onBeforeCompile = (sh, r) => {
		inner(sh, r);
		Object.assign(sh.uniforms, g, { uBg: { value: bg }, uFade: { value: fade } }, sky?.horizon.uniforms ?? {});
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', `#include <common>\nuniform vec3 uBg; uniform vec2 uFade;\n${GROUND_HEAD}\n${sky?.horizon.glsl ?? ''}`)
			.replace(
				'#include <color_fragment>',
				`#include <color_fragment>
	vec3 gW = vec3(vBiomeXZ.x, 0.0, vBiomeXZ.y);
	// mulch round the stem: leaves and humus, its edge ragged
	vec2 gQ = gW.xz - uC.xz;
	float gR = length(gQ) + (bvn(gQ / max(uRing * 0.4, 0.01)) - 0.5) * uRing * 0.25;
	float gMulch = (1.0 - smoothstep(uRing * 0.55, uRing, gR)) * 0.92;
	vec3 gLit = texture2D(bS0, bw / bTile[0] * 0.45).rgb, gHum = texture2D(bS1, bw / bTile[1] * 0.6).rgb;
	diffuseColor.rgb = mix(diffuseColor.rgb, mix(gHum, gLit, 0.35 + 0.5 * smoothstep(0.3, 0.7, bvn(bw * 6.0))) * 1.05, gMulch);
	// close up, the floor's own grain under its pictures (they hold a few millimetres a pixel), fading out with distance
	{
		float gPx = length(fwidth(bw));
		float gNear = clamp((0.004 / max(gPx, 1e-6) - 1.0) / 3.0, 0.0, 1.0);
		float gMid = clamp((0.015 / max(gPx, 1e-6) - 1.0) / 3.0, 0.0, 1.0);
		diffuseColor.rgb *= 1.0 + (bvn(bw * 260.0) - 0.5) * 0.35 * gNear + (bvn(bw * 70.0 + 3.0) - 0.5) * 0.22 * gMid;
	}`
			)
			.replace(
				'#include <dithering_fragment>',
				// under the sky, the colour of the horizon right behind it as the eye sees it: the ground meets the sky
				`#include <dithering_fragment>\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, ${sky ? 'skyHorizon(normalize(vec3(vBiomeXZ.x - uEye.x, 0.0, vBiomeXZ.y - uEye.z) + vec3(1e-5, 0.0, 0.0)))' : 'uBg'}, smoothstep(uFade.x, uFade.y, length(vBiomeXZ - uC.xz)));`
			);
	};
	m.customProgramCacheKey = () => (sky ? 'viewer-floor-sky' : 'viewer-floor');
	return m;
}

/**
 * A plant's ground on the stage.
 * @param {import('./stage.js').Stage} stage
 * @param {{ cover?: boolean }} [o] `cover`: its biome's cover streamed round the plant (not on a phone's budget)
 */
export function groundOf(stage, { cover = !stage.low } = {}) {
	const g = groundUniforms();
	const fade = new THREE.Vector2(8, 30);
	const group = new THREE.Group();
	group.name = 'ground';
	group.visible = false;
	const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 128).rotateX(-Math.PI / 2), floorMaterial(g, stage.bg, fade, stage.sky));
	floor.receiveShadow = true;
	const soil = soilMaterial(g);
	// the earth behind the roots, seen from below the ground line: one face of it standing just beyond the farthest root,
	// square to the eye, wide and deep enough that its edges are never seen (they are lost in its haze), the ground line
	// its top; lit by the studio's lights but in no shadow (the crown's would fall on it as if no earth lay above)
	// and from deeper down, the underside of the ground from the plant back to the face, so a root near the surface is
	// seen against earth and not the sky (the ground line then runs through the stem's foot, from any depth). Both in
	// the earth's own frame: at the plant, turned to face the eye
	const under = new THREE.Group();
	under.name = 'underground';
	under.visible = false;
	const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), soil);
	const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2).translate(0, 0, -0.5), soil);
	under.add(face, ceiling);
	group.add(floor, under);
	/** @type {null | ReturnType<typeof coverStream>} */
	let stream = null;
	let recipe = null, ringAt = 0, reachAt = 0, tall = false, soilNow = soilOf();
	setSoil(soil, soilNow);
	const at = new THREE.Vector3();
	/** the plant as fitted: how deep and how far out its roots reach, and how big it is */
	const fitted = { deep: 0, spread: 0, reach: 1 };
	/** how far behind the plant the earth's face stands, how big it is, the way it faces (eased), and whether the eye is below */
	let behind = 1, faceW = 40, faceH = 20, az = null, below = false;
	const mark = () =>
		group.traverse((o) => {
			o.userData.studio = true;
			// out of the occlusion pass, which draws both sides of everything and would take the earth's face for a wall
			if (o.parent === under) o.userData.noAO = true;
		});
	mark();
	stage.scene.add(group);

	/** the cover round the plant: everywhere but the mulch ring, and while the eye is below the ground only beyond the earth's face (its turf on the ground line) */
	const coverFor = () => {
		stream?.object.removeFromParent();
		stream?.rebuild({ ...recipe, cover: [] });
		stream = null;
		// the cover is drawn to be seen from standing height: round a seedling, seen from a few centimetres, its clover
		// heads and twigs would stand like trees, so a small plant stands on its floor alone
		if (!cover || !tall || !recipe?.cover?.length) return;
		const ring = ringAt, cx = g.uC.value.x, cz = g.uC.value.z;
		// out to where the floor starts fading into the backdrop, never beyond it (no plants standing in the haze)
		const reach = reachAt;
		stream = coverStream({
			recipe,
			open: (x, z) => Math.hypot(x - cx, z - cz) > ring,
			tile: Math.max(1.5, Math.min(4, reach / 3)),
			reach,
			near: reach * 0.45,
			thin: 0.2,
			perFrame: 4,
			seed: 77,
			away: {
				key: 'viewer-under',
				uniforms: g,
				head: GROUND_HEAD,
				body: `if (uHide > 0.5) { float gAlong = dot(vec2(instanceMatrix[3].x, instanceMatrix[3].z) - uC.xz, uF.xz); if (gAlong > -uB || gAlong < -uB - uBand) transformed *= 0.0; }`
			}
		});
		// out of the occlusion pass too: it draws each blade whole, where the stream's own shader has thinned it out or
		// left it out (over the earth, seen from below), and its ghost would show in the occlusion
		stream.object.traverse((o) => {
			o.userData.studio = true;
			o.userData.noAO = true;
		});
		group.add(stream.object);
	};

	return {
		group,
		get soil() {
			return soilNow;
		},
		/** whether the eye is below the ground line (the earth drawn, the frame split there) */
		get below() {
			return below;
		},
		/** the biome it is the floor of (its recipe, as its card says it) and that biome's id, which names its soil */
		biome(next, id) {
			recipe = next;
			floor.material.userData.weigh(next?.surface ?? BARE);
			soilNow = soilOf(id);
			setSoil(soil, soilNow);
			coverFor();
		},
		/**
		 * sized to a plant: the earth as deep as its deepest root and a little more, wide round its roots; the floor out
		 * to the horizon, its mulch ring as wide as its crown is near the ground. The ground's surface at 0.
		 * @param {THREE.Object3D} root
		 */
		fit(root) {
			root.updateMatrixWorld(true);
			root.getWorldPosition(at);
			const box = new THREE.Box3().setFromObject(root);
			const bs = box.getSize(new THREE.Vector3());
			// how far its roots reach down and out: its vertices under the ground, a sample of them
			let deep = Math.max(0, -box.min.y), spread = 0;
			const p = new THREE.Vector3(), mi = new THREE.Matrix4(), wb = new THREE.Box3();
			root.traverse((m) => {
				if (!m.isMesh || !m.geometry?.attributes?.position || !m.visible) return;
				if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
				wb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
				if (m.isInstancedMesh) wb.makeEmpty().setFromObject(m);
				if (wb.min.y >= 0) return;
				const pos = m.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 4000));
				const n = m.isInstancedMesh ? Math.min(m.count, 64) : 1;
				for (let k = 0; k < n; k++) {
					if (m.isInstancedMesh) m.getMatrixAt(k, mi).premultiply(m.matrixWorld);
					else mi.copy(m.matrixWorld);
					for (let i = 0; i < pos.count; i += step) {
						p.fromBufferAttribute(pos, i).applyMatrix4(mi);
						if (p.y < 0) spread = Math.max(spread, Math.hypot(p.x - at.x, p.z - at.z));
					}
				}
			});
			const reach = Math.max(bs.x, bs.y, bs.z, 0.01);
			Object.assign(fitted, { deep, spread, reach });
			const D = Math.max(deep, reach * 0.03), S = Math.max(spread, D * 0.5);
			// the face just beyond the farthest root behind the plant; as big as never to show its edges
			behind = S * 1.12 + reach * 0.01;
			faceW = Math.max(reach * 60, 30);
			faceH = Math.max(reach * 30, 15);
			face.scale.set(faceW, faceH, 1);
			face.position.set(0, 0, -behind);
			ceiling.scale.set(faceW, 1, behind);
			g.uB.value = behind;
			g.uBand.value = Math.max(S * 1.5, reach * 0.3, 0.6);
			soil.userData.soil.uDeep.value = D * 1.4 + reach * 0.01;
			soil.userData.soil.uHazeL.value = Math.max(D * 2.5, 0.04);
			g.uC.value.set(at.x, 0, at.z);
			floor.scale.setScalar(Math.max(60, reach * 40));
			floor.position.set(at.x, 0, at.z);
			// under the sky the floor runs on far, to a horizon; in the studio it fades into the backdrop near the plant
			if (stage.sky) fade.set(Math.max(reach * 2.5, 5), Math.max(reach * 22, 30));
			else fade.set(Math.max(reach * 2.2, 3), Math.max(reach * 9, 14));
			// a ring of mulch round the stem, as wide as its crown is near the ground, so a seedling is not lost in grass
			const ring = Math.min(1.6, Math.max(0.2, Math.max(bs.x, bs.z) * 0.55));
			g.uRing.value = ring;
			const coverReach = Math.max(4, Math.min(14, fade.x * 1.15));
			const big = Math.max(bs.x, bs.y, bs.z) > 0.35;
			if (Math.abs(ring - ringAt) > ringAt * 0.25 || Math.abs(coverReach - reachAt) > reachAt * 0.25 || big !== tall || (!stream && big)) {
				ringAt = ring;
				reachAt = coverReach;
				tall = big;
				coverFor();
			}
			mark();
			return { deep, spread };
		},
		/** shown, or not (a fruit on its own stands on the studio's floor) @param {boolean} on */
		show(on) {
			group.visible = on;
			if (!on) below = under.visible = false;
		},
		/**
		 * Where the camera stands for the split-level view of the roots: on the ground line (a hair under it), so the line
		 * lies level through the whole frame as a split-level shot's waterline does, tilted down until the line is two
		 * fifths down the frame, the stem's foot on it and all of the roots under it; from the side it looks from now.
		 * @param {THREE.PerspectiveCamera} camera
		 */
		rootsView(camera) {
			const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), aspect = camera.aspect || 1;
			const D = Math.max(fitted.deep, fitted.reach * 0.03), S = Math.max(fitted.spread, D * 0.5);
			// tilted down so the horizon (the ground line) is 0.2 of the half-height over the middle; the deepest root 0.85
			// of it under the middle; the roots' spread in the width
			const tilt = Math.atan(0.2 * h);
			const d = Math.max((1.06 * D) / Math.tan(tilt + Math.atan(0.85 * h)), (1.15 * S) / (h * aspect));
			const y = -fitted.reach * 0.004;
			const e = camera.position, az = Math.atan2(e.x - at.x, e.z - at.z);
			return {
				pos: new THREE.Vector3(at.x + Math.sin(az) * d, y, at.z + Math.cos(az) * d),
				target: new THREE.Vector3(at.x, y - d * Math.tan(tilt), at.z),
				near: Math.min(d / 200, fitted.reach / 300)
			};
		},
		/** each frame: the eye for the cover and the earth's haze; below the ground, the earth drawn round the eye */
		update(camera, dt) {
			if (!group.visible) return;
			camera.getWorldPosition(g.uEye.value);
			const e = g.uEye.value;
			const was = below;
			below = e.y < fitted.reach * 0.002;
			under.visible = below;
			// from below, the floor is not drawn, so it is no surface for the occlusion pass either
			floor.userData.noAO = below;
			g.uHide.value = below ? 1 : 0;
			if (below) {
				// the face turns to stay square to the eye, eased (it settles rather than following every twitch)
				const want = Math.atan2(e.x - at.x, e.z - at.z);
				if (az === null || !was) az = want;
				let dA = want - az;
				dA = Math.atan2(Math.sin(dA), Math.cos(dA));
				az += dA * (1 - Math.exp(-Math.min(dt, 0.1) * 6));
				const fx = Math.sin(az), fz = Math.cos(az);
				under.position.set(at.x, 0, at.z);
				under.rotation.set(0, az, 0);
				g.uF.value.set(fx, 0, fz);
				// the haze counts from the face's nearest point to the eye: right behind the roots it is clear
				soil.userData.soil.uHazeNear.value = Math.max(0, (e.x - at.x) * fx + (e.z - at.z) * fz + behind);
			}
			// on a turntable the plant is the middle of what is seen: the cover stands full round it and thins outwards
			stream?.update(at.x, at.z);
		},
		dispose() {
			group.removeFromParent();
			stream?.rebuild({ ...(recipe ?? {}), cover: [] });
			floor.geometry.dispose();
			floor.material.dispose();
			face.geometry.dispose();
			ceiling.geometry.dispose();
			soil.dispose();
		}
	};
}
