/*
 * THREE FOR THE FACTORIES — the app's three.js (^0.186) with the addons AirSup's runtime uses, behind one name `T` as
 * their vendored bundle (r185 on `globalThis.THREE`) gave them, so the ported runtime (des.js, kit.js, world.js, look.js,
 * app.js) reads `T.…` as AirSup wrote it and a newer AirSup version diffs line by line. Its renderer, orbit controls and
 * composer are the render core's ($content/render, plan C5): T's WebGLRenderer (`new` with three's params),
 * `new T.OrbitControls(camera, dom)` and `new T.EffectComposer(renderer, target)` give createRenderer's, createControls'
 * and createComposer's, set as
 * three's constructors leave them (one pixel per CSS pixel, no damping), the runtime setting the rest as it always did.
 */
import * as THREE from 'three';
import { createControls, createRenderer } from '$lib/content/render/core.js';
import { NodePass, createComposer } from '$lib/content/render/post.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/** three.js's WebGLRenderer, as the core makes it @param {THREE.WebGLRendererParameters} [p] */
function Renderer(p = {}) {
	return createRenderer({ canvas: /** @type {HTMLCanvasElement | undefined} */ (p.canvas), antialias: p.antialias ?? false, alpha: p.alpha, power: p.powerPreference, preserve: p.preserveDrawingBuffer, pixelRatio: 1 });
}
/** OrbitControls, as the core makes them @param {THREE.Camera} camera @param {HTMLElement} dom */
function Controls(camera, dom) {
	return createControls(camera, dom, { enableDamping: false });
}
/** EffectComposer, as the core makes it @param {THREE.WebGLRenderer} renderer @param {THREE.WebGLRenderTarget} [target] */
function Composer(renderer, target) {
	return createComposer(renderer, target);
}

/** three.js and the addons the factory runtime uses, under one name */
export const T = /** @type {typeof THREE & { EffectComposer: typeof EffectComposer, RenderPass: typeof RenderPass, NodePass: typeof NodePass, UnrealBloomPass: typeof UnrealBloomPass, GTAOPass: typeof GTAOPass, OutputPass: typeof OutputPass, RoomEnvironment: typeof RoomEnvironment, OrbitControls: typeof OrbitControls, RoundedBoxGeometry: typeof RoundedBoxGeometry, BufferGeometryUtils: typeof BufferGeometryUtils }} */ ({
	...THREE,
	WebGLRenderer: /** @type {typeof THREE.WebGLRenderer} */ (/** @type {unknown} */ (Renderer)),
	EffectComposer: /** @type {typeof EffectComposer} */ (/** @type {unknown} */ (Composer)),
	RenderPass,
	NodePass,
	UnrealBloomPass,
	GTAOPass,
	OutputPass,
	RoomEnvironment,
	OrbitControls: /** @type {typeof OrbitControls} */ (/** @type {unknown} */ (Controls)),
	RoundedBoxGeometry,
	BufferGeometryUtils
});
