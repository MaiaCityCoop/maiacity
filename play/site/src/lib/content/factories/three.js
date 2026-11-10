/*
 * THREE FOR THE FACTORIES — the app's own three.js (package.json: three ^0.186) with the addons AirSup's factory
 * runtime uses, gathered behind one name `T`, as their vendored bundle (three.js r185 plus the same addons on
 * `globalThis.THREE`) gave them. The ported runtime (des.js, kit.js, world.js, look.js, app.js) reads `T.…` exactly as
 * AirSup wrote it, so a newer AirSup version can be diffed against ours line by line.
 *
 * Its orbit controls are the render core's ($content/render, plan C5): `new T.OrbitControls(camera, dom)` gives back
 * what createControls makes, set the way three.js's own constructor leaves them (no damping), so the runtime sets the
 * rest itself, as it always did. Its renderer and post stack are the core's too (look.js calls createRenderer and
 * createPost; intent c1bee1f8), its two passes `T.NodePass`es.
 */
import * as THREE from 'three';
import { createControls } from '$lib/content/render/core.js';
import { NodePass } from '$lib/content/render/post.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * OrbitControls, as the core makes them
 * @param {THREE.Camera} camera
 * @param {HTMLElement} dom
 */
function Controls(camera, dom) {
	return createControls(camera, dom, { enableDamping: false });
}
/** three.js and the addons the factory runtime uses, under one name */
export const T = /** @type {typeof THREE & { NodePass: typeof NodePass, RoomEnvironment: typeof RoomEnvironment, OrbitControls: typeof OrbitControls, RoundedBoxGeometry: typeof RoundedBoxGeometry, BufferGeometryUtils: typeof BufferGeometryUtils }} */ ({
	...THREE,
	NodePass,
	RoomEnvironment,
	OrbitControls: /** @type {typeof OrbitControls} */ (/** @type {unknown} */ (Controls)),
	RoundedBoxGeometry,
	BufferGeometryUtils
});
