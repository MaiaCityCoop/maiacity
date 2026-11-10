/*
 * THE SURFACES — what the ground is: a biome's floor is a few of these in patches, each at its own size (`patch`, m), as
 * a real floor is (./index.js): litter, humus, needles, moss, green (clover, grass, small leaves), soil, tilled (rows
 * 0.36 m apart), stubble (drill rows 12.5 cm apart) and dust (a verge's). Rows (`rows`, m) run along the material's
 * direction (`rowsOf`), a field's `tramlines` pressed across them. Each is a scanned real surface (./sets.js: CC0, by
 * hashes); `groundMaterial(weights)` blends them (../render/nodes/ground.js), patches from the shared noise (./noise.js)
 * meeting by height, never repeating.
 */
import * as THREE from 'three';
import { fbm2 } from './noise.js';
import { PER, groundNodes } from '../render/nodes/ground.js';

/** @typedef {'litter' | 'humus' | 'needles' | 'moss' | 'green' | 'soil' | 'tilled' | 'stubble' | 'dust'} Surface */
/** @type {Surface[]} the order is the shader's: a new surface comes last, so the ones before keep their patches */
export const SURFACES = ['litter', 'humus', 'needles', 'moss', 'green', 'soil', 'tilled', 'stubble', 'dust'];
/**
 * @type {Record<Surface, { label: string, patch: number, tile: number, rows?: number, track?: string }>} its name, patch
 * size (m), ground one scan tile covers (m: real size); a row surface's spacing (m, whole rows a tile) and track colour (sRGB)
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

/** A floor's rows' way (radians from +x to +z): `rows:<degrees>` in its mesh's name, else its mesh's +x; 0 without. @param {THREE.Object3D} [mesh] */
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

/** How deeply (0…1) a point `across` m across the rows lies in a tramline's track, as the shader sums it. @param {Tramlines | null | undefined} t @param {number} across */
export function inTrack(t, across) {
	if (!t) return 0;
	const d = Math.abs(across - t.every * Math.round(across / t.every));
	const k = Math.abs(d - t.gauge / 2) / (t.tyre / 2);
	return 1 - Math.min(1, Math.max(0, (k - 0.75) / 0.5));
}

/** @typedef {Partial<Record<Surface, number>>} Weights how much of the floor each surface takes (any scale) */

/**
 * How much of the floor at x, z (world m) each surface is, as the shader sums it (ground laid flat: its other axis −z).
 * @param {Weights} weights @param {number} x @param {number} z @returns {Record<Surface, number>}
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
 * The ground drawn with a biome's surfaces: a node material for a mesh in world metres (../render/nodes/ground.js).
 * `material.userData.weigh(weights)` changes them live; row surfaces run as `rows` says (`rowsOf(mesh)`;
 * `userData.rows(angle)` turns them) with `tramlines` pressed in; `userData.map(texture, [x, z, w, d])` lays a world's
 * ground map (R shade under crowns, G wet) over that rectangle.
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
