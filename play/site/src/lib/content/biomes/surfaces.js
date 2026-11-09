/*
 * THE SURFACES — what the ground itself is: a biome's floor is a few of these run into each other in patches, each at
 * its own size (`patch`, m), as a real floor is (./index.js): litter (fallen leaves), humus, needles, moss, green (the
 * living mat: clover, grass, small leaves), soil, tilled (ploughed, rows 0.36 m apart), stubble (drill rows 12.5 cm
 * apart) and dust (a verge's dust and gravel). `tilled` and `stubble` lie in rows (`rows`, m) along the direction a
 * material is given (`rowsOf`), a field's tramlines (`tramlines`) pressed across them.
 *
 * Each is a scanned real surface (./sets.js: CC0, its colour and height, normal, AO and roughness, by their hashes).
 * `groundMaterial(weights)` draws them blended (../render/nodes/ground.js): each surface's patches from the shared noise
 * (./noise.js), its weight how much of the floor it takes, the patches meeting by height, never repeating.
 */
import * as THREE from 'three';
import { fbm2 } from './noise.js';
import { PER, groundNodes } from '../render/nodes/ground.js';

/** @typedef {'litter' | 'humus' | 'needles' | 'moss' | 'green' | 'soil' | 'tilled' | 'stubble' | 'dust'} Surface */
/** @type {Surface[]} the order is the shader's: a new surface comes last, so the ones before keep their patches */
export const SURFACES = ['litter', 'humus', 'needles', 'moss', 'green', 'soil', 'tilled', 'stubble', 'dust'];
/**
 * @type {Record<Surface, { label: string, patch: number, tile: number, rows?: number, track?: string }>} its name, how
 * big its patches are (m), how much ground one tile of its scan covers (m: its real size); a surface in rows, how far
 * apart they are (m, a whole number of them to a tile) and the colour of a wheel track pressed into it (sRGB)
 */
export const SURFACE = {
	litter: { label: 'Leaf litter', patch: 6, tile: 3 },
	humus: { label: 'Humus', patch: 3, tile: 1.3 },
	needles: { label: 'Needles', patch: 7, tile: 2 },
	moss: { label: 'Moss carpet', patch: 4, tile: 2 },
	green: { label: 'Living mat', patch: 9, tile: 2 },
	soil: { label: 'Bare soil', patch: 5, tile: 1.3 },
	tilled: { label: 'Tilled soil', patch: 9, tile: 2.88, rows: 0.36, track: '#9a8c7a' },
	stubble: { label: 'Stubble', patch: 11, tile: 2.5, rows: 0.125, track: '#a39581' },
	dust: { label: 'Dust and gravel', patch: 5, tile: 2.48 }
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
 * The ground drawn with a biome's surfaces (`weights`): a node material for a mesh in world metres (../render/nodes/
 * ground.js). Its weights can be changed live: `material.userData.weigh(weights)`. A surface in rows (tilled, stubble)
 * runs its rows the way `rows` says (radians from +x towards +z; `rowsOf(mesh)`), `material.userData.rows(angle)` to
 * turn them, and a field's `tramlines` are pressed into them. `material.userData.map(texture, [x, z, w, d])`: a world's
 * ground map (R shade under its crowns, G wet) over that rectangle of it.
 * @param {Weights} weights @param {{ rows?: number, tramlines?: Tramlines | null }} [o]
 */
export function groundMaterial(weights, o = {}) {
	return groundNodes(weights, { names: SURFACES, ...o });
}
SURFACES.forEach((s, i) => {
	const it = SURFACE[s];
	PER.patch.array[i] = it.patch;
	PER.size.array[i] = it.tile;
	PER.rows.array[i] = it.rows ?? 0;
	PER.track.array[i] = new THREE.Color(it.track ?? '#808080');
});
