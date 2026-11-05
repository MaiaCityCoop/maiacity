/*
 * THE SURFACES — what the ground itself is, seen from standing height and further: a biome's floor is a few of these
 * run into each other in patches, each at its own size (`patch`, m), as a real floor is (./index.js):
 *
 *   litter   fallen leaves, the L horizon: whole leaves of beech, oak and hazel, curled, in warm browns
 *   humus    the H horizon showing through where the litter is thin: dark, crumbly, near black, a few fragments
 *   needles  a conifer's floor: short needles in rust and grey-brown, the odd twig
 *   moss     a moss carpet: deep and bright greens, close-packed cushions
 *   green    the living mat of the light: clover in threes, grass blades, small round leaves, shade between
 *   soil     bare mineral earth: brown, a little gravel
 *   tilled   farmland ploughed and harrowed: grey-brown furrows in rows 0.36 m apart, clods, dust (the tired land)
 *   stubble  a cereal field after harvest: cut stalks in drill rows 12.5 cm apart, chopped straw over pale soil
 *   dust     a verge's dust and road gravel: pale, grey-brown, stones thrown off the road
 *
 * The first six lie every way. `tilled` and `stubble` lie in rows (`rows`, their spacing in m): their texture's rows
 * run along the direction a material is given (`groundMaterial(weights, { rows })`, from the floor's mesh, `rowsOf`),
 * and a field's tramlines (`tramlines`: a pair of wheel tracks every so many metres) are painted across them, so the
 * rows run straight to the horizon and every 24 m two bare tracks run with them, as a sprayed field's do.
 *
 * `groundMaterial(weights)` paints them blended: each surface's patches drawn from the shared noise (./noise.js), its
 * weight how much of the floor it takes, the patches soft-edged, a broad light-and-shade over it all (the canopy's).
 */
import * as THREE from 'three';
import { GLSL, fbm2, rng } from './noise.js';

/** @typedef {'litter' | 'humus' | 'needles' | 'moss' | 'green' | 'soil' | 'tilled' | 'stubble' | 'dust'} Surface */
/** @type {Surface[]} the order is the shader's: a new surface comes last, so the ones before keep their patches */
export const SURFACES = ['litter', 'humus', 'needles', 'moss', 'green', 'soil', 'tilled', 'stubble', 'dust'];
/**
 * @type {Record<Surface, { label: string, patch: number, tile: number, rows?: number, track?: string }>} its name, how
 * big its patches are (m), how much ground one tile of its texture covers (m); a surface in rows, how far apart they
 * are (m, a whole number of them to a tile) and the colour of a wheel track pressed into it (sRGB)
 */
export const SURFACE = {
	litter: { label: 'Leaf litter', patch: 6, tile: 2.2 },
	humus: { label: 'Humus', patch: 3, tile: 2.4 },
	needles: { label: 'Needles', patch: 7, tile: 1.6 },
	moss: { label: 'Moss carpet', patch: 4, tile: 2 },
	green: { label: 'Living mat', patch: 9, tile: 1.7 },
	soil: { label: 'Bare soil', patch: 5, tile: 2.6 },
	tilled: { label: 'Tilled soil', patch: 9, tile: 2.88, rows: 0.36, track: '#9a8c7a' },
	stubble: { label: 'Stubble', patch: 11, tile: 2.5, rows: 0.125, track: '#a39581' },
	dust: { label: 'Dust and gravel', patch: 5, tile: 2.2 }
};

const textures = new Map();
/** @param {string} key @param {(x: CanvasRenderingContext2D, r: () => number) => void} draw */
function canvasTexture(key, draw) {
	const hit = textures.get(key);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = c.height = 512;
	draw(/** @type {CanvasRenderingContext2D} */ (c.getContext('2d')), rng([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = 8;
	textures.set(key, t);
	return t;
}
/** a mottled base: two colours by a noise @param {CanvasRenderingContext2D} x @param {() => number} r @param {number[]} a @param {number[]} b @param {number} scale */
function base(x, r, a, b, scale) {
	const img = x.createImageData(512, 512);
	for (let i = 0; i < 512 * 512; i++) {
		const g = fbm2((i % 512) / scale, ((i / 512) | 0) / scale) * 0.75 + r() * 0.25;
		for (let k = 0; k < 3; k++) img.data[i * 4 + k] = /** @type {number} */ (a[k]) + (/** @type {number} */ (b[k]) - /** @type {number} */ (a[k])) * g;
		img.data[i * 4 + 3] = 255;
	}
	x.putImageData(img, 0, 0);
}
const pick = (/** @type {string[]} */ list, /** @type {() => number} */ r) => /** @type {string} */ (list[Math.floor(r() * list.length)]);
/** a leaf, its tip to one side, a midrib @param {CanvasRenderingContext2D} x */
function leaf(x, /** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ len, /** @type {number} */ a, /** @type {string} */ fill, /** @type {number} */ wide) {
	x.save();
	x.translate(cx, cy);
	x.rotate(a);
	x.fillStyle = fill;
	x.beginPath();
	x.moveTo(-len, 0);
	x.quadraticCurveTo(-len * 0.2, -len * wide, len, 0);
	x.quadraticCurveTo(-len * 0.2, len * wide, -len, 0);
	x.fill();
	x.globalAlpha *= 0.5;
	x.strokeStyle = '#2a1a0c';
	x.lineWidth = 0.7;
	x.beginPath();
	x.moveTo(-len, 0);
	x.lineTo(len * 0.9, 0);
	x.stroke();
	x.restore();
}

/** @type {Record<Surface, () => THREE.Texture>} */
export const TEXTURES = {
	litter: () =>
		canvasTexture('biome-litter', (x, r) => {
			base(x, r, [44, 30, 18], [70, 48, 28], 20);
			const browns = ['#7a4e2e', '#6b4a32', '#8a6a4a', '#5a3e2a', '#9a7350', '#4e3a2a', '#86603e', '#6e5a44', '#a07a52'];
			// layer on layer, the older under: darker first, then the fresh leaves on top
			for (let pass = 0; pass < 2; pass++)
				for (let i = 0; i < 1700; i++) {
					x.globalAlpha = pass ? 0.92 : 0.6;
					leaf(x, r() * 512, r() * 512, 7 + r() * 11, r() * Math.PI * 2, pick(browns, r), 0.42 + r() * 0.2);
				}
			x.globalAlpha = 1;
			for (let i = 0; i < 40; i++) {
				x.strokeStyle = r() < 0.5 ? '#3a2a1c' : '#5a4430';
				x.lineWidth = 1 + r() * 2;
				const cx = r() * 512, cy = r() * 512, len = 15 + r() * 40, a = r() * Math.PI;
				x.beginPath();
				x.moveTo(cx, cy);
				x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
				x.stroke();
			}
		}),
	humus: () =>
		canvasTexture('biome-humus', (x, r) => {
			base(x, r, [24, 17, 11], [52, 37, 24], 9);
			for (let i = 0; i < 3500; i++) {
				x.fillStyle = r() < 0.5 ? 'rgba(20,14,9,0.6)' : 'rgba(80,58,36,0.5)';
				x.beginPath();
				x.arc(r() * 512, r() * 512, 0.8 + r() * 2.2, 0, Math.PI * 2);
				x.fill();
			}
			for (let i = 0; i < 200; i++) {
				x.globalAlpha = 0.5;
				leaf(x, r() * 512, r() * 512, 3 + r() * 5, r() * 6.28, pick(['#5e3e22', '#4a3220', '#6a4a2a'], r), 0.5);
			}
			x.globalAlpha = 1;
		}),
	needles: () =>
		canvasTexture('biome-needles', (x, r) => {
			base(x, r, [52, 36, 24], [88, 60, 38], 16);
			const tones = ['#8a5a32', '#a06a3a', '#6e5440', '#9a8268', '#5a4030', '#b0784a'];
			for (let i = 0; i < 9000; i++) {
				const cx = r() * 512, cy = r() * 512, len = 4 + r() * 6, a = r() * Math.PI;
				x.strokeStyle = pick(tones, r);
				x.globalAlpha = 0.85;
				x.lineWidth = 0.9;
				x.beginPath();
				x.moveTo(cx, cy);
				x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
				x.stroke();
			}
			x.globalAlpha = 1;
		}),
	moss: () =>
		canvasTexture('biome-moss', (x, r) => {
			base(x, r, [34, 54, 18], [96, 128, 46], 10);
			for (let i = 0; i < 9000; i++) {
				x.fillStyle = pick(['#4a6a22', '#5e8028', '#78963a', '#3a5418', '#88a444'], r);
				x.globalAlpha = 0.7;
				x.beginPath();
				x.arc(r() * 512, r() * 512, 1 + r() * 2.2, 0, Math.PI * 2);
				x.fill();
			}
			x.globalAlpha = 1;
		}),
	green: () =>
		canvasTexture('biome-green', (x, r) => {
			base(x, r, [28, 48, 22], [58, 88, 36], 22);
			const greens = ['#3f6a2c', '#4e7a34', '#5b8a3a', '#6a9842', '#466f30', '#78a44a'];
			for (let i = 0; i < 5200; i++) {
				const cx = r() * 512, cy = r() * 512, k = r();
				x.fillStyle = pick(greens, r);
				if (k < 0.45) {
					const s = 2.2 + r() * 2.4, a = r() * Math.PI * 2;
					for (let j = 0; j < 3; j++) {
						const b = a + (j * Math.PI * 2) / 3;
						x.beginPath();
						x.arc(cx + Math.cos(b) * s, cy + Math.sin(b) * s, s * 0.95, 0, Math.PI * 2);
						x.fill();
					}
				} else if (k < 0.8) {
					const len = 6 + r() * 12, a = r() * Math.PI * 2;
					x.strokeStyle = pick(greens, r);
					x.lineWidth = 1 + r();
					x.beginPath();
					x.moveTo(cx, cy);
					x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
					x.stroke();
				} else {
					x.beginPath();
					x.ellipse(cx, cy, 2 + r() * 3, 1.5 + r() * 2, r() * Math.PI, 0, Math.PI * 2);
					x.fill();
				}
			}
		}),
	soil: () =>
		canvasTexture('biome-soil', (x, r) => {
			base(x, r, [74, 54, 36], [116, 88, 60], 14);
			for (let i = 0; i < 1400; i++) {
				x.fillStyle = pick(['#8a8076', '#6a6058', '#a09486', '#5a4a3a'], r);
				x.beginPath();
				x.ellipse(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 2.4, r() * 3, 0, Math.PI * 2);
				x.fill();
			}
		}),
	// ploughed and harrowed: 8 furrows across the tile (0.36 m), each slice lit on its rising side and shadowed where
	// it falls, broken by the harrow, clods on the ridges, dust over it (Munsell 10YR 5/2–6/3 dry, 4/2 in the furrows)
	tilled: () =>
		canvasTexture('biome-tilled', (x, r) => {
			const img = x.createImageData(512, 512), P = 64;
			for (let i = 0; i < 512 * 512; i++) {
				const px = i % 512, py = (i / 512) | 0;
				const u = (px % P) / P;
				const slice = u < 0.68 ? Math.sin((Math.PI / 2) * (u / 0.68)) : Math.cos((Math.PI / 2) * ((u - 0.68) / 0.32));
				const lit = u < 0.68 ? 1.06 : 0.78;
				const broken = fbm2(px / 40 + 3, py / 90) * 0.5 + 0.75;
				const k = (0.62 + 0.38 * slice * broken) * lit * (0.88 + 0.24 * r());
				const c = [[104, 87, 68], [152, 133, 110]];
				for (let j = 0; j < 3; j++) img.data[i * 4 + j] = /** @type {number} */ (c[0][j]) + (/** @type {number} */ (c[1][j]) - /** @type {number} */ (c[0][j])) * Math.min(1, k * slice + 0.15);
				img.data[i * 4 + 3] = 255;
			}
			x.putImageData(img, 0, 0);
			for (let i = 0; i < 1600; i++) {
				const cx = r() * 512, cy = r() * 512, s = 1.5 + r() * 4;
				x.globalAlpha = 0.55;
				x.fillStyle = pick(['#7c6a54', '#8f7c64', '#6e5e4a', '#a29078'], r);
				x.beginPath();
				x.ellipse(cx, cy, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
				x.fill();
			}
			x.globalAlpha = 0.18;
			x.fillStyle = '#b3a692';
			x.fillRect(0, 0, 512, 512);
			x.globalAlpha = 1;
		}),
	// after the combine: 20 drill rows across the tile (12.5 cm), cut stalks seen from above as pale dots and short
	// strokes along them, chopped straw lying every way between, dry pale soil (10YR 6/3) under it all
	stubble: () =>
		canvasTexture('biome-stubble', (x, r) => {
			base(x, r, [138, 120, 96], [168, 150, 120], 18);
			const P = 512 / 20;
			for (let i = 0; i < 2600; i++) {
				const len = 8 + r() * 22, a = r() * Math.PI;
				x.strokeStyle = pick(['#d6c79e', '#c8b78a', '#b8aa86', '#e0d4b0'], r);
				x.globalAlpha = 0.8;
				x.lineWidth = 1 + r() * 0.8;
				const cx = r() * 512, cy = r() * 512;
				x.beginPath();
				x.moveTo(cx, cy);
				x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
				x.stroke();
			}
			for (let row = 0; row < 20; row++)
				for (let y = 0; y < 512; y += 3 + r() * 4) {
					const cx = row * P + P / 2 + (r() - 0.5) * 3;
					x.globalAlpha = 0.95;
					x.fillStyle = '#5e5240';
					x.fillRect(cx - 2, y + 1, 4.5, 3.5);
					x.fillStyle = pick(['#e2d6b2', '#d4c394', '#c9b98e'], r);
					x.fillRect(cx - 1.5, y, 3, 2.5);
				}
			x.globalAlpha = 1;
		}),
	// a verge's dust over road gravel: pale grey-brown, crushed stone 8–32 mm in greys and buff
	dust: () =>
		canvasTexture('biome-dust', (x, r) => {
			base(x, r, [140, 128, 110], [176, 164, 146], 12);
			for (let i = 0; i < 2600; i++) {
				const s = 1 + Math.pow(r(), 2) * 6;
				x.fillStyle = pick(['#a5a39c', '#8f8d87', '#b3a993', '#76746f', '#c2bcb0'], r);
				x.beginPath();
				x.ellipse(r() * 512, r() * 512, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
				x.fill();
				x.fillStyle = 'rgba(70,60,48,0.35)';
				x.fillRect(r() * 512, r() * 512, 1.5, 1.5);
			}
		})
};

/**
 * The way a floor's rows run (radians from the world's +x towards +z), from its mesh: `rows:<degrees>` in its name
 * (`biome:<hash> rows:30`), else the way the mesh's own +x points in the world. 0 where there is no mesh.
 * @param {THREE.Object3D} [mesh]
 */
export function rowsOf(mesh) {
	const m = /rows:(-?[0-9]+(?:\.[0-9]+)?)/.exec(mesh?.name ?? '');
	if (m) return (Number(m[1]) * Math.PI) / 180;
	if (!mesh) return 0;
	mesh.updateWorldMatrix(true, false);
	const e = mesh.matrixWorld.elements;
	return Math.atan2(/** @type {number} */ (e[2]), /** @type {number} */ (e[0])) || 0;
}

/**
 * @typedef {{ every: number, gauge: number, tyre: number }} Tramlines a field's wheel tracks along its rows: a pair
 *   `gauge` apart (centre to centre, m), each `tyre` wide, one pair every `every` metres across the rows
 */

/**
 * Whether a point `across` metres across the rows (from the rows' origin) lies in a tramline's track: how deeply,
 * 0…1. The same sum as the shader's.
 * @param {Tramlines | null | undefined} t @param {number} across
 */
export function inTrack(t, across) {
	if (!t) return 0;
	const d = Math.abs(across - t.every * Math.round(across / t.every));
	const k = Math.abs(d - t.gauge / 2) / (t.tyre / 2);
	return 1 - Math.min(1, Math.max(0, (k - 0.75) / 0.5));
}

/** @typedef {Partial<Record<Surface, number>>} Weights how much of the floor each surface takes (any scale) */

/**
 * How much of the floor at x, z (world metres) each surface is: the same sums as the shader's. (Ground laid flat:
 * its other axis runs −z.)
 * @param {Weights} weights @param {number} x @param {number} z
 * @returns {Record<Surface, number>}
 */
export function surfacesAt(weights, x, z) {
	const u = x, v = -z;
	/** @type {Record<string, number>} */
	const out = {};
	let sum = 0;
	SURFACES.forEach((s, i) => {
		const w = weights[s] ?? 0;
		if (w <= 0) return (out[s] = 0);
		const p = SURFACE[s].patch, f = fbm2(u / p + i * 17.3, v / p + i * 17.3);
		const v6 = w * Math.pow(0.35 + f, 6);
		out[s] = v6;
		sum += v6;
	});
	for (const s of SURFACES) out[s] = sum > 0 ? out[s] / sum : 0;
	return /** @type {Record<Surface, number>} */ (out);
}

/**
 * The ground painted with a biome's surfaces (`weights`): a MeshStandardMaterial for a flat mesh in world metres. Its
 * weights can be changed live: `material.userData.weigh(weights)`. A surface in rows (tilled, stubble) runs its rows
 * the way `rows` says (radians from +x towards +z; `rowsOf(mesh)`), `material.userData.rows(angle)` to turn them, and a
 * field's `tramlines` are pressed into them. The six surfaces that lie every way are painted as they always were.
 * @param {Weights} weights @param {{ rows?: number, tramlines?: Tramlines | null }} [o]
 */
export function groundMaterial(weights, o = {}) {
	const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
	const N = SURFACES.length;
	const W = { value: SURFACES.map((s) => weights[s] ?? 0) };
	m.userData.weigh = (/** @type {Weights} */ w) => (W.value = SURFACES.map((s) => w[s] ?? 0));
	const dir = { value: new THREE.Vector2(1, 0) };
	m.userData.rows = (/** @type {number} */ a) => dir.value.set(Math.cos(a), Math.sin(a));
	m.userData.rows(o.rows ?? 0);
	const t = o.tramlines;
	const tram = { value: new THREE.Vector4(t?.every ?? 24, t?.gauge ?? 1.8, t?.tyre ?? 0.48, t ? 1 : 0) };
	m.onBeforeCompile = (shader) => {
		SURFACES.forEach((s, i) => (shader.uniforms[`bS${i}`] = { value: TEXTURES[s]() }));
		shader.uniforms.bW = W;
		shader.uniforms.bPatch = { value: SURFACES.map((s) => SURFACE[s].patch) };
		shader.uniforms.bTile = { value: SURFACES.map((s) => SURFACE[s].tile) };
		shader.uniforms.bTrack = { value: SURFACES.map((s) => new THREE.Color(SURFACE[s].track ?? '#808080')) };
		shader.uniforms.bDir = dir;
		shader.uniforms.bTram = tram;
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec2 vBiomeXZ;')
			.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvBiomeXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
		// a surface that lies every way, as it always was; one in rows read along them (no turned second read, which
		// would turn its rows), its tracks pressed in
		const layers = SURFACES.map((s, i) => (SURFACE[s].rows ? `BROWS(${i}, bS${i})` : `BLAYER(${i}, bS${i})`)).join('\n\t');
		shader.fragmentShader = shader.fragmentShader
			.replace(
				'#include <common>',
				`#include <common>
varying vec2 vBiomeXZ;
uniform float bW[${N}];
uniform float bPatch[${N}];
uniform float bTile[${N}];
uniform vec3 bTrack[${N}];
uniform vec2 bDir;
uniform vec4 bTram;
${SURFACES.map((_, i) => `uniform sampler2D bS${i};`).join('\n')}
${GLSL}`
			)
			.replace(
				'#include <map_fragment>',
				`vec2 bw = vec2(vBiomeXZ.x, -vBiomeXZ.y);
	vec3 bAcc = vec3(0.0);
	float bSum = 0.0;
	// no tile seen twice in a row: each texture is read twice, the second turned and shifted, and the two run into
	// each other by a slow noise, so its repeat never lines up into a grid seen from afar
	float bSwap = smoothstep(0.32, 0.68, bvn(bw * 0.23 + 5.1));
	const mat2 bTurn = mat2(0.8253, 0.5646, -0.5646, 0.8253);
	#define BLAYER(i, tex) if (bW[i] > 0.0) { float f = bfbm(bw / bPatch[i] + float(i) * 17.3); float s = bW[i] * pow(0.35 + f, 6.0); vec2 bu = bw / bTile[i] + float(i) * 0.37; bAcc += mix(texture2D(tex, bu).rgb, texture2D(tex, bTurn * bu * 0.83 + 0.41).rgb, bSwap) * s; bSum += s; }
	// rows: along bDir in the world (x, z), so across and along them in metres; the texture's rows run along its v
	float bAlong = dot(vBiomeXZ, bDir), bAcross = dot(vBiomeXZ, vec2(-bDir.y, bDir.x));
	float bTrackK = 0.0;
	if (bTram.w > 0.5) { float d = abs(bAcross - bTram.x * floor(bAcross / bTram.x + 0.5)); float k = abs(d - bTram.y * 0.5) / (bTram.z * 0.5); bTrackK = 1.0 - clamp((k - 0.75) / 0.5, 0.0, 1.0); }
	#define BROWS(i, tex) if (bW[i] > 0.0) { float f = bfbm(bw / bPatch[i] + float(i) * 17.3); float s = bW[i] * pow(0.35 + f, 6.0); vec2 bu = vec2(bAcross, bAlong) / bTile[i]; vec3 c = mix(texture2D(tex, bu).rgb, texture2D(tex, bu + vec2(0.5, 0.41)).rgb, bSwap); c = mix(c, bTrack[i] * (0.92 + 0.16 * bvn(vec2(bAcross * 9.0, bAlong * 4.5))), bTrackK * 0.85); bAcc += c * s; bSum += s; }
	${layers}
	vec3 bCol = bAcc / max(bSum, 1e-5);
	// the canopy's light and shade over it all, broad and slow
	bCol *= 0.82 + 0.32 * bfbm(bw * 0.021 + 11.0);
	diffuseColor.rgb *= bCol;`
			);
	};
	m.customProgramCacheKey = () => 'biome-ground-2';
	return m;
}
