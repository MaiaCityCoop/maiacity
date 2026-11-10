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
 * again as the eye nears. Left alone: what three does not cull (`frustumCulled` false: the asset renderer's copies, a
 * crowd, the grass, each kept by its own renderer), and what is not shown.
 * @param {THREE.Object3D} root @param {THREE.PerspectiveCamera} camera
 * @returns {boolean} whether any of them changed: the shadows are then to be drawn again
 */
export function castBySize(root, camera) {
	const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / (camera.zoom || 1);
	const eye = camera.getWorldPosition(new THREE.Vector3());
	let changed = false;
	root.traverseVisible((/** @type {any} */ o) => {
		if (!o.isMesh || !o.frustumCulled || o.isSkinnedMesh || !o.geometry?.attributes?.position) return;
		const made = (o.userData.casts ??= o.castShadow);
		if (!made) return;
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
	return changed;
}
