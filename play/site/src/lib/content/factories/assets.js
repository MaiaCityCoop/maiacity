/*
 * Our assets on the line: a factory's product stage drawn as one of our own assets, by its slot of the Factories' pins
 * (read from play's database once before anything is built; 2026-11-03), and the Euro pallets its raw material is
 * stacked on (./pallet.js), each built as anyone's asset is ($lib/content/assets/load.js): a stage's asset as one
 * geometry and one material, so every finished machine on the line is one instance of it. What could not be built is
 * said in `missing`, and the stage's own `fallback` shape is drawn instead.
 */
import { SANDBOX } from '$lib/kernel/sandboxes.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadAsset } from '$lib/content/assets/load.js';
import { buildAt, catalogReady } from '$lib/content/assets/catalog.js';
import { PALLET } from './pallet.js';

/** @typedef {{ ref: string, geometry: THREE.BufferGeometry, material: THREE.Material, object: THREE.Object3D }} Token */
/** @typedef {{ geometry: THREE.BufferGeometry, color: string }} Piece one piece of an asset, for the kit to paint */

const KEEP = new Set(['position', 'normal', 'color', 'uv']);

/**
 * An asset built by its ref, its recipe play's catalog's ($lib/content/assets/catalog.js), in the box or from the cache;
 * throws when the vault holds no such asset (NotInVault, naming it) or its build was refused. @param {string} ref
 */
async function built(ref) {
	await catalogReady(SANDBOX.factories);
	const { obj } = await loadAsset(buildAt(ref));
	obj.updateMatrixWorld(true);
	return obj;
}

/**
 * An asset as a token: built by its ref, every visible mesh of it in its rest pose merged into one geometry with vertex
 * colours (a rigged machine is one skinned mesh already; its skin weights are dropped, the token never moves a part),
 * and its first material. Throws when there is no such asset or its build was refused.
 * @param {string} ref
 * @returns {Promise<Token>}
 */
async function tokenOf(ref, { face } = {}) {
	const object = await built(ref);
	/** @type {THREE.BufferGeometry[]} */
	const geos = [];
	/** @type {THREE.Material | undefined} */
	let material;
	const c = new THREE.Color();
	object.traverse((o) => {
		const m = /** @type {THREE.Mesh} */ (o);
		if (!m.isMesh || !m.visible) return;
		const g = m.geometry.clone();
		for (const k of Object.keys(g.attributes)) if (!KEEP.has(k)) g.deleteAttribute(k);
		g.morphAttributes = {};
		const mat = /** @type {THREE.Material} */ (Array.isArray(m.material) ? m.material[0] : m.material);
		// a mesh coloured by its material alone: that colour on every vertex, so one material draws them all
		if (!g.attributes.color) {
			c.set(/** @type {THREE.MeshStandardMaterial} */ (mat).color ?? '#ffffff');
			const n = g.attributes.position.count, a = new Float32Array(n * 3);
			for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
			g.setAttribute('color', new THREE.BufferAttribute(a, 3));
		}
		g.applyMatrix4(m.matrixWorld);
		geos.push(g);
		material ??= mat;
	});
	if (!geos.length || !material) throw new Error(`${ref}: no mesh to draw it by`);
	const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)), false);
	if (!geometry) throw new Error(`${ref}: its meshes could not be merged into one`);
	// an asset built facing +z (as our machines are) turned to face +x, the way a token travels along its route
	if (face === 'z') geometry.rotateY(Math.PI / 2);
	geometry.computeBoundingSphere();
	const token = /** @type {THREE.Material} */ (material.clone());
	/** @type {any} */ (token).vertexColors = true;
	return { ref, geometry, material: token, object };
}

/**
 * An asset as pieces for the kit to paint: each visible mesh's geometry in its place and its material's colour (the
 * Euro pallet: its boards and blocks, `K.europallet`).
 * @param {string} ref
 * @returns {Promise<Piece[]>}
 */
export async function piecesOf(ref) {
	const object = await built(ref);
	/** @type {Piece[]} */
	const pieces = [];
	object.traverse((o) => {
		const m = /** @type {THREE.Mesh} */ (o);
		if (!m.isMesh || !m.visible) return;
		const mat = /** @type {THREE.MeshStandardMaterial} */ (Array.isArray(m.material) ? m.material[0] : m.material);
		pieces.push({ geometry: m.geometry.clone().applyMatrix4(m.matrixWorld), color: `#${mat.color.getHexString()}` });
	});
	if (!pieces.length) throw new Error(`${ref}: no mesh to draw it by`);
	return pieces;
}

/**
 * Everything a factory's world draws of ours, by its ref, as the world takes it (`boot(spec, host, { assets })`): every
 * stage drawn as an asset, as its token; the Euro pallet, as its pieces. Each built once.
 * @param {{ stages?: Record<string, unknown> }} spec
 * @returns {Promise<{ assets: Record<string, Token | Piece[]>, missing: { ref: string, why: string }[] }>} what was built, and what could not be and why
 */
export async function assetsOf(spec) {
	/** @type {Record<string, Token | Piece[]>} */
	const assets = {};
	/** @type {{ ref: string, why: string }[]} */
	const missing = [];
	const why = (/** @type {unknown} */ e) => (e instanceof Error ? e.message : String(e));
	try {
		assets[PALLET] = await piecesOf(PALLET);
	} catch (e) {
		missing.push({ ref: PALLET, why: why(e) });
	}
	for (const def of Object.values(spec.stages ?? {})) {
		const d = /** @type {{ shape: string, ref?: string, face?: string }} */ (def);
		if (d.shape !== 'asset' || !d.ref || assets[d.ref]) continue;
		try {
			assets[d.ref] = await tokenOf(d.ref, { face: d.face });
		} catch (e) {
			missing.push({ ref: d.ref, why: why(e) });
		}
	}
	return { assets, missing };
}
