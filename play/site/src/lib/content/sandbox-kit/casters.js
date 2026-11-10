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

const _c = new THREE.Vector3(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();

/** a mesh's ball where it stands: its middle (into `_c`) and its radius; an instanced one's, of all its copies @param {any} o */
function ballOf(o) {
	const b = o.isInstancedMesh ? (o.boundingSphere ?? (o.computeBoundingSphere(), o.boundingSphere)) : (o.geometry.boundingSphere ?? (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere));
	_c.copy(b.center).applyMatrix4(o.matrixWorld);
	return b.radius * o.matrixWorld.getMaxScaleOnAxis();
}

/** how big one copy of an instanced mesh is (its first's, kept on it): what its shadow is seen by @param {any} o */
function copyOf(o) {
	if (o.userData.copyRadius === undefined) {
		if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
		o.getMatrixAt(0, _m);
		o.userData.copyRadius = o.geometry.boundingSphere.radius * _s.setFromMatrixScale(_m).length() * 0.5774 * o.matrixWorld.getMaxScaleOnAxis();
	}
	return o.userData.copyRadius;
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
	const eye = camera.getWorldPosition(_s.set(0, 0, 0)).clone();
	let changed = false;
	root.traverseVisible((/** @type {any} */ o) => {
		if (!o.isMesh || !o.frustumCulled || o.isSkinnedMesh || !o.geometry?.attributes?.position) return;
		const made = (o.userData.casts ??= o.castShadow);
		if (!made) return;
		const all = ballOf(o);
		const far = Math.max(1e-3, _c.distanceTo(eye) - (o.isInstancedMesh ? all : 0));
		const size = (o.isInstancedMesh ? copyOf(o) : all) / (far * tanHalf);
		const casts = size >= SMALL * (o.castShadow ? 1 : HOLD);
		if (casts !== o.castShadow) (o.castShadow = casts), (changed = true);
	});
	return changed;
}
