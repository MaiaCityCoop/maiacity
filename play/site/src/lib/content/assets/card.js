/*
 * AN ASSET'S CARD — what a world, viewer or film needs of an asset without building it (ref and values, recipe hash,
 * engine, size, triangles, params, parts, sliders), read off a built object by the box's engine (./box/engine.js) and
 * the tests, and always checked against ./schemas/card.v1.json before use.
 */
import * as THREE from 'three';
import { parseRef, refOf } from './refs.js';

const mm = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
/** the keys of `o` that are set, as a fresh plain object (a card holds no `undefined`) */
const set = (/** @type {Record<string, any>} */ o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** triangles drawn, each instance of an instanced mesh counted @param {THREE.Object3D} obj */
export function trianglesOf(obj) {
	let n = 0;
	obj.traverse((o) => {
		const m = /** @type {THREE.Mesh} */ (o);
		if (!m.isMesh || !m.geometry) return;
		const g = m.geometry;
		const count = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
		n += (count / 3) * (/** @type {THREE.InstancedMesh} */ (m).isInstancedMesh ? /** @type {THREE.InstancedMesh} */ (m).count : 1);
	});
	return Math.round(n);
}

/**
 * @typedef {{
 *   group: string, id: string, version: number, variant?: string, label: string, note?: string,
 *   params?: import('./params.js').Param[]
 * }} Meta what a recipe says of the asset it builds
 */

/**
 * @param {THREE.Object3D} obj what its builder made, its ref on it with the values it was built with (./refs.js `buildWith`)
 * @param {Meta} meta what its recipe says of it
 * @param {{ recipe?: string, engine?: number }} [made] the recipe's hash and the engine's version it was built on
 */
export function cardOf(obj, meta, { recipe, engine } = {}) {
	const { group, id, version, variant } = meta;
	// the values it was built with, as the ref on the object names them
	const built = typeof obj.userData.ref === 'string' && obj.userData.ref.includes('?') ? parseRef(obj.userData.ref).params : undefined;
	const box = new THREE.Box3().setFromObject(obj);
	const size = box.isEmpty() ? [0, 0, 0] : box.getSize(new THREE.Vector3()).toArray().map(mm);
	let skinned = false;
	obj.traverse((o) => (skinned ||= !!(/** @type {THREE.SkinnedMesh} */ (o).isSkinnedMesh)));
	const sealed = obj.userData.asset;
	const catalog = obj.userData.catalog ?? sealed?.catalog;
	const sliders = sealed?.lab?.controls;
	return set({
		format: 'asset-card',
		v: 1,
		ref: refOf(group, id, version, variant, built),
		recipe,
		engine,
		group,
		id,
		version,
		variant,
		label: meta.label,
		note: meta.note,
		size,
		triangles: trianglesOf(obj),
		skinned,
		params: meta.params?.length ? plain(meta.params) : undefined,
		catalog: catalog && plain(catalog),
		controls: sliders && Object.entries(sliders).map(([cid, c]) => set({ id: cid, label: c.label, min: c.min, max: c.max, value: c.value, step: c.step, unit: c.unit, digits: c.digits, ends: c.ends }))
	});
}

/** a catalog as data: its own fields, copied, so nothing of the object it came from rides along */
const plain = (/** @type {any} */ c) => JSON.parse(JSON.stringify(c));
