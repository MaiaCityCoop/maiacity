// @ts-nocheck — three's post-processing passes are typed loosely
/*
 * THE POST STACK — the one way a page draws through post-processing: the scene into a half-float, multisampled target,
 * then ambient occlusion (GTAO), bloom, the output pass (tone mapping and colour space) and a page's own passes (a
 * grade, a tilt shift), each only where it is asked for. Before bloom, every pixel that is not a finite number is
 * made black (`FINITE`): a NaN from one bad surface (a normal of no length, a bump picture on a triangle of no area, on
 * Apple's GPUs) would otherwise be blurred by ambient occlusion and bloom over the whole frame, and the frame goes black. The asset stage (../assets/stage.js) draws through it; the
 * Factories' look (../factories/look.js, AirSup's, line for line) lays its own passes on the composer made here
 * (`createComposer`, its `T.EffectComposer`); the film has no darkroom of its own (deleted with its GLSL, intent 602a8849).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { OwnNode } from './tsl.js';
import { abs, all, select, texture, uv, vec3, vec4 } from 'three/tsl';
// the asset stage's grade (../assets/stage.js) until it is a NodePass too (intent 602a8849, after cb16b7a5 lands)
export { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * A full-screen pass whose picture is a TSL node (a grade, a tilt shift, `FINITE`): `make(at, p)` gets `at(q)`,
 * the picture before it read at `q`, and `p`, where this pixel is (both in the GL way, (0, 0) bottom left), and gives
 * back its colour; `uniforms` are its own, set as a ShaderPass's were. Its colour is written as it is
 * ($content/render/tsl.js `raw`): after the output pass nothing tones or encodes it again. three's GLSL node builder
 * reads a target flipped (WebGPU's way), so `at` flips `q` for it.
 */
export class NodePass extends Pass {
	/** @param {Record<string, { value: unknown }>} uniforms @param {(at: (q: any) => any, p: any) => any} make */
	constructor(uniforms, make) {
		super();
		this.input = texture(new THREE.Texture());
		this.uniforms = { tDiffuse: this.input, ...uniforms };
		const m = new OwnNode();
		m.userData.raw = true;
		m.depthTest = m.depthWrite = false;
		m.fragmentNode = make((q) => this.input.sample(q.flipY()), uv());
		this.quad = new FullScreenQuad(m);
	}
	/** @param {THREE.WebGLRenderer} renderer @param {THREE.WebGLRenderTarget} writeBuffer @param {THREE.WebGLRenderTarget} readBuffer */
	render(renderer, writeBuffer, readBuffer) {
		this.input.value = readBuffer.texture;
		renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
		if (this.clear) renderer.clear();
		this.quad.render(renderer);
	}
	dispose() {
		this.quad.material.dispose();
		this.quad.dispose();
	}
}

/**
 * a pixel that is not a finite number (NaN, ±∞) made black, so it stays one pixel and is not blurred over the frame: a
 * NaN fails every comparison, an infinity every bound, so a pixel is kept only where |c| ≤ 1e30 holds for each channel
 */
const FINITE = () =>
	new NodePass({}, (at, p) => {
		const c = at(p);
		return select(all(abs(c.rgb).lessThanEqual(vec3(1e30))), c, vec4(0, 0, 0, 1));
	});

/**
 * The one EffectComposer: `renderer` drawing through `target` (the composer's own when not given).
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.WebGLRenderTarget} [target]
 */
export const createComposer = (renderer, target) => new EffectComposer(renderer, target);

/**
 * @typedef {object} PostOptions
 * @property {[number, number]} [target] the render target's size at first, px (default 1 × 1: sized by `setSize`)
 * @property {number} [samples] its multisampling (default 4)
 * @property {{ pixelRatio: number, width: number, height: number }} [size] the composer sized at once, before its passes
 * @property {false | ((ao: GTAOPass) => void)} [ao] ambient occlusion, set up by the page
 * @property {{ size?: [number, number], strength: number, radius: number, threshold: number, on?: boolean }} [bloom]
 *   bloom (made either way when given; drawn unless `on` is false)
 * @property {any[]} [after] the page's own passes, after the output pass, in order
 */

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {PostOptions} [o]
 */
export function createPost(renderer, scene, camera, o = {}) {
	const [w, h] = o.target ?? [1, 1];
	const composer = createComposer(renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: o.samples ?? 4 }));
	if (o.size) {
		// at the canvas's own pixels (a composer given its target counts them 1:1 until told the ratio)
		composer.setPixelRatio(o.size.pixelRatio);
		composer.setSize(o.size.width, o.size.height);
	}
	composer.addPass(new RenderPass(scene, camera));
	let ao = null;
	if (o.ao) {
		ao = new GTAOPass(scene, camera, w, h);
		o.ao(ao);
		composer.addPass(ao);
	}
	// what is not a number stops here, before anything blurs it over the frame
	if (o.ao || o.bloom) composer.addPass(FINITE());
	let bloom = null;
	if (o.bloom) {
		bloom = new UnrealBloomPass(new THREE.Vector2(...(o.bloom.size ?? [w / 2, h / 2])), o.bloom.strength, o.bloom.radius, o.bloom.threshold);
		if (o.bloom.on !== false) composer.addPass(bloom);
	}
	composer.addPass(new OutputPass());
	for (const p of o.after ?? []) composer.addPass(p);
	return {
		composer,
		ao,
		bloom,
		/** the canvas's size changed (CSS px, at the renderer's pixel ratio) @param {number} width @param {number} height @param {number} pixelRatio */
		setSize(width, height, pixelRatio) {
			composer.setPixelRatio(pixelRatio);
			composer.setSize(width, height);
		},
		/** @param {number} [dt] */
		render: (dt) => composer.render(dt),
		dispose: () => composer.dispose()
	};
}
