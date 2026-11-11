/*
 * WHO CASTS A SHADOW — a shadow pass draws every caster again, once a cascade, whatever its size: in Sandbox 1 a third
 * of a frame's draws were shadows of things under a metre across (a lamp's shade, a shelf, a pot), most of them far
 * across a dome where none of it shows (intent 405f7a85). A thing casts only while it reads as one: while it looks at
 * least SMALL of the view's height (the three-performance skill's "anything under 20 px on screen").
 */
import * as THREE from 'three';

/** the size on screen (a thing's ball as a share of the view's height, as assets/render/lod.js `sizeOn`) below which it casts no shadow: 20 px of a 1080 px screen */
export const SMALL = 20 / 1080;
/** it casts again only once it looks this much bigger than SMALL, so one on the line does not flicker */
const HOLD = 1.1;

const _c = new THREE.Vector3(), _m = new THREE.Matrix4();

/** a mesh's ball where it stands: its middle (into `_c`) and its radius @param {any} o */
function ballOf(o) {
	const b = o.geometry.boundingSphere ?? (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere);
	_c.copy(b.center).applyMatrix4(o.matrixWorld);
	return b.radius * o.matrixWorld.getMaxScaleOnAxis();
}

/**
 * An instanced mesh's copies as its shadow is seen by: where each stands in the world and how big the biggest is, kept
 * on it until its copies are set anew (`instanceMatrix.version`). @param {any} o @returns {{ at: Float32Array, radius: number }}
 */
function copiesOf(o) {
	const kept = o.userData.copies;
	if (kept?.version === o.instanceMatrix.version && kept.n === o.count) return kept;
	const r = o.geometry.boundingSphere ?? (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere);
	const at = new Float32Array(o.count * 3);
	let radius = 0;
	for (let i = 0; i < o.count; i++) {
		o.getMatrixAt(i, _m);
		_m.premultiply(o.matrixWorld);
		_c.copy(r.center).applyMatrix4(_m).toArray(at, i * 3);
		radius = Math.max(radius, r.radius * _m.getMaxScaleOnAxis());
	}
	return (o.userData.copies = { version: o.instanceMatrix.version, n: o.count, at, radius });
}

/**
 * Every mesh under `root` that was made to cast a shadow casts one only while it looks at least SMALL from `camera`
 * (an instanced one: while its nearest copy may). What it was made to do is kept on it (`userData.casts`), so it casts
 * again as the eye nears. Each is cast by its stand-ins from the first time it is met (`castByTwins`), the size rule
 * then deciding for each stand-in. Left alone: what draws its shadow itself (the asset renderer's copies: their own
 * `onBeforeShadow`), what three does not cull (a crowd, the grass) by size, and what is not shown.
 * @param {THREE.Object3D} root @param {THREE.PerspectiveCamera} camera
 * @returns {boolean} whether any of them changed: the shadows are then to be drawn again
 */
export function castBySize(root, camera) {
	const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / (camera.zoom || 1);
	const eye = camera.getWorldPosition(new THREE.Vector3());
	let changed = false;
	/** casters met for the first time, each to be cast by its stand-ins from now on */
	const fresh = [];
	root.traverseVisible((/** @type {any} */ o) => {
		if (!o.isMesh || o.isSkinnedMesh || o.morphTargetInfluences?.length || !o.geometry?.attributes?.position) return;
		const made = (o.userData.casts ??= o.castShadow);
		if (!made) return;
		// a caster met for the first time is cast by its stand-ins, unless its renderer draws its shadow itself
		if (!o.userData.standIn && o.onBeforeShadow === OWN_SHADOW) return void fresh.push(o);
		if (!o.frustumCulled) return;
		let radius = 0, far = Infinity;
		if (o.isInstancedMesh) {
			const copies = copiesOf(o);
			radius = copies.radius;
			for (let i = 0; i < copies.at.length; i += 3) far = Math.min(far, (copies.at[i] - eye.x) ** 2 + (copies.at[i + 1] - eye.y) ** 2 + (copies.at[i + 2] - eye.z) ** 2);
			far = Math.sqrt(far);
		} else {
			radius = ballOf(o);
			far = _c.distanceTo(eye);
		}
		const size = radius / (Math.max(far, 1e-3) * tanHalf);
		const casts = size >= SMALL * (o.castShadow ? 1 : HOLD);
		if (casts !== o.castShadow) (o.castShadow = casts), (changed = true);
	});
	for (const o of fresh) castByTwins(o);
	return changed || fresh.length > 0;
}

/**
 * A caster cast from now on by its twins (STAND-INS, below): one a cascade it is wide enough to show in, each its
 * shape simplified for that cascade, hung under it so it goes, turns and hides with it, an instanced one's copies its
 * own (the same buffer, the same count). The caster itself casts no more.
 * @param {any} o
 */
function castByTwins(o) {
	o.updateWorldMatrix(true, false);
	const mat = sideOf(Array.isArray(o.material) ? o.material[0] : o.material);
	for (const c of CASCADES) {
		if (widthOf(o) < c.least) continue;
		const g = lowerOf(o.geometry, c.error / o.matrixWorld.getMaxScaleOnAxis());
		/** @type {any} */
		let twin;
		if (o.isInstancedMesh) {
			twin = new THREE.InstancedMesh(g, mat, 0);
			twin.instanceMatrix = o.instanceMatrix;
			Object.defineProperty(twin, 'count', { get: () => o.count, set() {} });
		} else twin = new THREE.Mesh(g, mat);
		twin.name = `stand-in ${c.layer}`;
		twin.frustumCulled = o.frustumCulled;
		twin.layers.set(c.layer);
		twin.castShadow = true;
		twin.userData.standIn = true;
		o.add(twin);
	}
	o.castShadow = o.userData.casts = false;
}

/*
 * STAND-INS — what a shadow pass draws in place of a thing's picture (intent 7313fb26). A shadow is the thing's outline
 * seen from the sun, a texel of the cascade it falls in at a time: the near cascade's texel is some 7 cm (its 2048
 * texels over the first 80 m or so of the view), the far one's some 20 cm. So each cascade draws a stand-in of its own:
 * every piece simplified until it would move its outline by at most ERROR (a third of a texel), what is smaller than
 * LEAST left out (its shadow no bigger than a texel or two, which contact shadows and the AO already draw), all of one
 * side in one draw (a shadow pass draws depth alone: every material is the same to it). Each stand-in hangs on its
 * cascade's layer (CASCADES), which only that cascade's camera sees: the picture never draws it, and the picture's own
 * meshes cast nothing.
 */
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** the simplifier loaded: a world that makes stand-ins (`standIns`) waits for it once, before it builds */
export const ready = MeshoptSimplifier.ready;

/** each of the sun's cascades, near first: the layer its camera alone sees, and its stand-ins' ERROR and LEAST (m) */
export const CASCADES = [
	{ layer: 28, error: 0.02, least: 0.04 },
	{ layer: 29, error: 0.07, least: 0.15 }
];

/** the sun's cascades each made to see its stand-ins' layer (and every caster on layer 0, as before) @param {any} shadow a SunLight's */
export function seeStandIns(shadow) {
	CASCADES.forEach((c, i) => shadow.getCamera?.(i)?.layers.enable(c.layer));
}

/** triangles at or under which a piece is its own stand-in: simplifying it saves nothing worth the work */
const TINY = 24;

/** what a geometry was simplified to, by the error asked (in its own units, rounded): its triangles' corners, unindexed */
const lowered = new WeakMap();

/** @param {THREE.BufferGeometry} g @param {number} error in g's own units @returns {THREE.BufferGeometry} position only, unindexed, shared by every stand-in of g at that error */
function lowerOf(g, error) {
	const byError = lowered.get(g) ?? new Map();
	lowered.set(g, byError);
	const key = Number(error.toPrecision(2));
	const kept = byError.get(key);
	if (kept) return kept;
	const only = new THREE.BufferGeometry().setAttribute('position', g.attributes.position);
	if (g.index) only.setIndex(g.index);
	const welded = mergeVertices(only);
	const P = /** @type {Float32Array} */ (welded.attributes.position.array);
	const I = new Uint32Array(welded.index.array);
	const [index] = I.length / 3 <= TINY ? [I] : MeshoptSimplifier.simplify(I, P instanceof Float32Array ? P : Float32Array.from(P), 3, 0, key, ['ErrorAbsolute']);
	const corners = new Float32Array(index.length * 3);
	for (let i = 0; i < index.length; i++) corners.set(P.subarray(index[i] * 3, index[i] * 3 + 3), i * 3);
	const out = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(corners, 3));
	byError.set(key, out);
	return out;
}

const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _box = new THREE.Box3();
/**
 * How wide a mesh's shadow can be at its narrowest: the middle of its box's three sides, where it stands (a stick's
 * shadow is as wide as the stick, a sheet's as the sheet). An instanced mesh's: its biggest copy's.
 * @param {any} o
 */
function widthOf(o) {
	const b = o.geometry.boundingBox ?? (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
	_box.copy(b).getSize(_s);
	const [, middle] = [_s.x, _s.y, _s.z].sort((a, b) => a - b);
	const scale = o.isInstancedMesh ? copiesOf(o).radius / Math.max(ballOf({ geometry: o.geometry, matrixWorld: IDENTITY }), 1e-6) : o.matrixWorld.getMaxScaleOnAxis();
	return middle * scale;
}
const IDENTITY = new THREE.Matrix4();
/** three's own shadow hook, which does nothing: a mesh with another (the asset renderer's) draws its shadow itself */
const OWN_SHADOW = THREE.Object3D.prototype.onBeforeShadow;
/** one stand-in material a shadow side, shared: a shadow pass takes only its sides from it */
const sides = new Map();
const sideOf = (/** @type {any} */ m) => {
	const key = `${m.side}:${m.shadowSide ?? ''}`;
	if (!sides.has(key)) sides.set(key, new THREE.MeshBasicMaterial({ side: m.side, shadowSide: m.shadowSide ?? null, colorWrite: false }));
	return sides.get(key);
};

/**
 * The stand-ins of `meshes` (each where it stands now, its matrixWorld): one mesh a cascade and shadow side, each on
 * its cascade's layer, casting. Waits for `ready` first.
 * @param {THREE.Mesh[]} meshes @returns {THREE.Mesh[]}
 */
export function standIns(meshes) {
	const out = [];
	CASCADES.forEach((c) => {
		/** @type {Map<THREE.Material, { meshes: THREE.Mesh[], n: number }>} */
		const bySide = new Map();
		for (const o of meshes) {
			if (!o.geometry?.attributes.position || widthOf(o) < c.least) continue;
			const corners = /** @type {Float32Array} */ (lowerOf(o.geometry, c.error / o.matrixWorld.getMaxScaleOnAxis()).attributes.position.array);
			const mat = sideOf(Array.isArray(o.material) ? o.material[0] : o.material);
			const e = bySide.get(mat) ?? { meshes: [], n: 0, corners: [] };
			e.corners.push([corners, o.matrixWorld]);
			e.n += corners.length;
			bySide.set(mat, e);
		}
		for (const [mat, e] of bySide) {
			if (!e.n) continue;
			const P = new Float32Array(e.n);
			let at = 0;
			for (const [corners, m] of e.corners)
				for (let i = 0; i < corners.length; i += 3, at += 3) _p.fromArray(corners, i).applyMatrix4(m).toArray(P, at);
			const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(P, 3));
			g.computeBoundingSphere();
			g.computeBoundingBox();
			const s = new THREE.Mesh(g, mat);
			s.name = `stand-in ${c.layer}`;
			s.userData.standIn = true;
			s.layers.set(c.layer);
			s.castShadow = true;
			s.receiveShadow = false;
			out.push(s);
		}
	});
	return out;
}
