// @ts-nocheck — three's post-processing passes are typed loosely
/*
 * THE POST STACK — the one way a page draws through post-processing: the scene into a half-float, multisampled target,
 * then ambient occlusion (GTAO), bloom, the output pass (tone mapping and colour space) and a page's own passes (a
 * grade, a tilt shift), each only where it is asked for. Before bloom, every pixel that is not a finite number is
 * made black (`FINITE`): a NaN from one bad surface (a normal of no length, a bump picture on a triangle of no area, on
 * Apple's GPUs) would otherwise be blurred by ambient occlusion and bloom over the whole frame, and the frame goes black. The asset stage (../assets/stage.js) draws through it; the
 * Factories' look (../factories/look.js, AirSup's, line for line) lays its own passes on the composer made here
 * (`createComposer`, its `T.EffectComposer`); the film camera's darkroom (../film/pipeline.js) is the film's own.
 *
 * On a WebGPURenderer (the switch, intent c1bee1f8) the same stack is a RenderPipeline of TSL nodes: the scene pass
 * (multisampled, half float) with its view normals and an occlusion mask beside its colour (MRT), GTAO and its denoise,
 * the same NaN guard as a bit test (an exponent of all ones is NaN or ±∞), bloom, the output (tone mapping and colour
 * space) and the page's own passes as TSL functions of the picture. What the WebGL stack keeps out of the occlusion by
 * hiding it from GTAO's own normal pass, it keeps out by the mask: a material marked with `exclude` writes 0 there.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RenderPipeline } from 'three/webgpu';
import { pass, mrt, output, normalView, packNormalToRGB, unpackRGBToNormal, float, uint, uniform, vec4, mix, select, floatBitsToUint, renderOutput, sample, screenUV, velocity, builtinAOContext, convertToTexture } from 'three/tsl';
import { ssao } from 'three/addons/tsl/display/SSAONode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { taau } from 'three/addons/tsl/display/TAAUNode.js';
import { sss } from 'three/addons/tsl/display/SSSNode.js';
import { gradeNode } from './grade.js';
import { ao as gtao } from 'three/addons/tsl/display/GTAONode.js';
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js';
import { bloom as bloomNode } from 'three/addons/tsl/display/BloomNode.js';
import { isWebGPU } from './core.js';

export { ShaderPass };

/** a pixel that is not a finite number (NaN, ±∞) made black, so it stays one pixel and is not blurred over the frame */
const FINITE = {
	uniforms: { tDiffuse: { value: null } },
	vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
	fragmentShader: /* glsl */ `
		uniform sampler2D tDiffuse;
		varying vec2 vUv;
		void main() {
			vec4 c = texture2D(tDiffuse, vUv);
			bool bad = isnan(c.r) || isnan(c.g) || isnan(c.b) || isinf(c.r) || isinf(c.g) || isinf(c.b);
			gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : c;
		}`,
};

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
	if (isWebGPU(renderer)) return createPipelinePost(renderer, scene, camera, o);
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
	if (o.ao || o.bloom) composer.addPass(new ShaderPass(FINITE));
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

/** the bits of a float's exponent: all set, the float is NaN or ±∞ */
const EXPONENT = 0x7f800000;
/**
 * a picture's pixel made black where any channel is not a finite number (FINITE, as a bit test: WGSL has no isnan)
 * @param {any} c a vec4 node
 */
export function finite(c) {
	const bad = (/** @type {any} */ x) => floatBitsToUint(x).bitAnd(uint(EXPONENT)).equal(uint(EXPONENT));
	return select(bad(c.r).or(bad(c.g)).or(bad(c.b)), vec4(0, 0, 0, 1), c);
}

/** the occlusion mask's channel, 1 where a surface takes ambient occlusion */
const MASK = 'solid';
/** the mask's 0, kept on a material `exclude`d */
const OFF = mrt({ [MASK]: float(0) });

/**
 * The post stack on WebGPU: createPost's options and handle, its passes TSL nodes on one RenderPipeline. `o.ao` is handed
 * the occlusion as the WebGL pass is (`blendIntensity`, `updateGtaoMaterial`, `updatePdMaterial`), `o.after` the
 * page's passes as functions of the picture (node in, node out), drawn after the output as on WebGL; a WebGL pass
 * there is left out (a ShaderPass is GLSL), said once.
 * @param {any} renderer @param {THREE.Scene} scene @param {THREE.Camera} camera @param {PostOptions} [o]
 */
function createPipelinePost(renderer, scene, camera, o = {}) {
	const scenePass = pass(scene, camera, { samples: o.samples ?? 4, type: THREE.HalfFloatType });
	let color = scenePass.getTextureNode('output');
	/** @type {any} */
	let ao = null;
	if (o.ao) {
		scenePass.setMRT(mrt({ output, normal: packNormalToRGB(normalView), [MASK]: float(1) }));
		const depth = scenePass.getTextureNode('depth');
		// the normals decoded wherever GTAO and the denoise sample them (three's own way: `sample`)
		const normals = scenePass.getTextureNode('normal');
		const normal = sample((/** @type {any} */ uv) => unpackRGBToNormal(normals.sample(uv)));
		const node = gtao(depth, normal, camera);
		const pd = denoise(node.getTextureNode(), depth, normal, camera);
		const blend = uniform(1);
		// the occlusion where the mask lets it, by the blend's intensity: GTAOPass's mix(1, ao, intensity) over the colour
		const occlusion = mix(float(1), pd.r, blend.mul(scenePass.getTextureNode(MASK).r));
		color = vec4(color.rgb.mul(occlusion), color.a);
		/** @param {any} u @param {Record<string, number>} p @param {string[]} keys */
		const set = (u, p, keys) => keys.forEach((n) => p[n] !== undefined && u[n] && (u[n].value = p[n]));
		ao = {
			node,
			denoise: pd,
			get blendIntensity() {
				return blend.value;
			},
			set blendIntensity(v) {
				blend.value = v;
			},
			/** GTAOPass's call: radius, distanceExponent, thickness, scale, samples */
			updateGtaoMaterial: (/** @type {any} */ p) => set(node, p, ['radius', 'distanceExponent', 'thickness', 'scale', 'samples', 'distanceFallOff']),
			/** GTAOPass's denoise call: lumaPhi, depthPhi, normalPhi, radius (rings and samples are the denoise's own) */
			updatePdMaterial: (/** @type {any} */ p) => set(pd, p, ['lumaPhi', 'depthPhi', 'normalPhi', 'radius']),
			/** a material kept out of the occlusion (an effect, a see-through or cut-out part), as GTAOPass's normal pass hid it */
			exclude(/** @type {THREE.Material} */ m) {
				const n = /** @type {any} */ (m);
				if (n.mrtNode === OFF) return;
				n.mrtNode = OFF;
				n.needsUpdate = true;
			}
		};
		o.ao(ao);
	}
	// what is not a number stops here, before anything blurs it over the frame
	if (o.ao || o.bloom) color = finite(color);
	/** @type {any} */
	let bloom = null;
	if (o.bloom) {
		bloom = bloomNode(color, o.bloom.strength, o.bloom.radius, o.bloom.threshold);
		if (o.bloom.on !== false) color = vec4(color.rgb.add(bloom.rgb), color.a);
	}
	// the output pass: tone mapping and colour space, then the page's own passes
	color = renderOutput(color);
	let warned = false;
	for (const p of o.after ?? []) {
		if (typeof p === 'function') color = p(color);
		else if (!warned) {
			warned = true;
			console.warn('play: a WebGL pass was left out of the WebGPU post stack (a ShaderPass is GLSL)');
		}
	}
	const pipeline = new RenderPipeline(renderer, color);
	pipeline.outputColorTransform = false;
	return {
		webgpu: true,
		composer: null,
		pipeline,
		ao,
		bloom,
		/** the pipeline draws at the renderer's own size: nothing to set */
		setSize() {},
		/** @param {number} [_dt] */
		render: (_dt) => pipeline.render(),
		dispose: () => {
			pipeline.dispose();
			ao?.node.dispose?.();
			ao?.denoise.dispose?.();
			bloom?.dispose?.();
		}
	};
}

/**
 * @typedef {object} FinishHandle
 * @property {import('./finish.js').Plan} plan
 * @property {any} pipeline the RenderPipeline
 * @property {{ scene: any, prepass: any, ao: any, denoise: any, contact: any, aa: any, bloom: any, grade: ReturnType<typeof gradeNode> }} nodes
 * @property {(t?: number) => void} render draw a frame; `t` is the grain's clock (a film's own time, never the wall's)
 * @property {() => void} dispose
 */

/**
 * The world's finishing (intent 1f0c6f79): every world, sandbox and the viewer drawn through one RenderPipeline built
 * from a plan (./finish.js `finishing`). In order: the depth and normals before the scene is lit, and ambient occlusion
 * from them (SSAO at its scale, denoised) laid on the ambient light alone (builtinAOContext; nothing see-through takes
 * it); the scene, its velocity beside its colour where the edges are temporal; the sun's contact shadows (SSS, a
 * desktop's); the NaN guard; TRAA, TAAU (the scene at the plan's scale, brought up to the screen) or the scene pass's
 * own MSAA; bloom above its threshold; the output (the page's tone mapping and colour space); the grade. The haze is
 * the scene's fog node (./atmosphere.js), drawn with the scene. On WebGPURenderer only (either backend).
 * @param {any} renderer a WebGPURenderer
 * @param {THREE.Scene} scene @param {THREE.Camera} camera
 * @param {import('./finish.js').Plan} plan
 * @param {{ sun?: THREE.Light }} [o] the sun, for its contact shadows (none without it): a DirectionalLight, or the sky's
 *   SunLight, followed each frame by a DirectionalLight aimed at the origin as it is
 * @returns {FinishHandle}
 */
export function createFinish(renderer, scene, camera, plan, o = {}) {
	if (!isWebGPU(renderer)) throw new Error('createFinish: a WebGPURenderer only (the switch, intent c1bee1f8)');
	const temporal = plan.aa === 'traa' || plan.aa === 'taau';
	const scenePass = pass(scene, camera, { samples: plan.samples, type: THREE.HalfFloatType });
	if (plan.upscale === 'taau') scenePass.setResolutionScale(plan.scale);
	scenePass.setMRT(mrt(temporal ? { output, velocity } : { output }));
	/** @type {any} */
	let prepass = null, aoNode = null, pd = null, contact = null, aa = null, bloom = null;
	if (plan.ao) {
		// the depth and the normals first, the scene unlit; the occlusion from them, then the scene lit with it on its ambient light
		prepass = pass(scene, camera, { type: THREE.HalfFloatType });
		prepass.setMRT(mrt({ output: packNormalToRGB(normalView) }));
		const depth = prepass.getTextureNode('depth');
		const normals = prepass.getTextureNode('output');
		const normal = sample((/** @type {any} */ uv) => unpackRGBToNormal(normals.sample(uv)));
		aoNode = ssao(depth, normal, camera);
		aoNode.resolutionScale = plan.ao.scale;
		aoNode.radius.value = plan.ao.radius;
		aoNode.intensity.value = plan.ao.intensity;
		pd = denoise(aoNode.getTextureNode(), depth, normal, camera);
		// drawn to its own texture, read by every lit fragment at its pixel
		scenePass.contextNode = builtinAOContext(convertToTexture(pd).sample(screenUV).r);
	}
	let color = scenePass.getTextureNode('output');
	/** @type {THREE.DirectionalLight | null} the sun as a light with a target (three's SunLight has none: it shines to the origin) */
	let key = null;
	if (plan.contact && o.sun) {
		key = /** @type {any} */ (o.sun).target ? /** @type {THREE.DirectionalLight} */ (o.sun) : new THREE.DirectionalLight();
		contact = sss(scenePass.getTextureNode('depth'), camera, key);
		contact.resolutionScale = plan.contact.scale;
		contact.maxDistance.value = plan.contact.maxDistance;
		contact.thickness.value = plan.contact.thickness;
		contact.shadowIntensity.value = plan.contact.intensity;
		color = vec4(color.rgb.mul(contact.getTextureNode().sample(screenUV).r), color.a);
	}
	// what is not a number stops here, before anything blurs it over the frame
	color = finite(color);
	if (plan.aa === 'traa') color = aa = traa(color, scenePass.getTextureNode('depth'), scenePass.getTextureNode('velocity'), camera);
	else if (plan.aa === 'taau') color = aa = taau(color, scenePass.getTextureNode('depth'), scenePass.getTextureNode('velocity'), camera);
	if (plan.bloom) {
		bloom = bloomNode(color, plan.bloom.strength, plan.bloom.radius, plan.bloom.threshold);
		bloom.setResolutionScale?.(plan.bloom.scale);
		color = vec4(color.rgb.add(bloom.rgb), color.a);
	}
	color = renderOutput(color);
	const size = renderer.getDrawingBufferSize(new THREE.Vector2());
	const grade = gradeNode({ ...plan.grade, res: size });
	color = grade.node(color);
	const pipeline = new RenderPipeline(renderer, color);
	pipeline.outputColorTransform = false;
	return {
		plan,
		pipeline,
		nodes: { scene: scenePass, prepass, ao: aoNode, denoise: pd, contact, aa, bloom, grade },
		render(t) {
			if (key && key !== o.sun && o.sun) {
				o.sun.getWorldPosition(key.position);
				key.updateMatrixWorld();
				key.target.updateMatrixWorld();
			}
			renderer.getDrawingBufferSize(size);
			grade.uniforms.uRes.value.copy(size);
			// the grain moves with the clock: a film's own t, else the page's
			grade.uniforms.uTime.value = t ?? performance.now() / 1000;
			pipeline.render();
		},
		dispose() {
			pipeline.dispose();
			for (const n of [aoNode, pd, contact, aa, bloom]) n?.dispose?.();
		}
	};
}

