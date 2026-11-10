// @ts-nocheck — three's TSL nodes are typed loosely
/*
 * THE POST STACK — the one way a page draws through post-processing (intent c1bee1f8: a RenderPipeline of TSL nodes on
 * the WebGPURenderer): the scene pass (multisampled, half float) with its view normals and an occlusion mask beside its
 * colour (MRT), then ambient occlusion (GTAO and its denoise), bloom, the output (tone mapping and colour space) and a
 * page's own passes (a grade, a tilt shift), each only where it is asked for. Before bloom, every pixel that is not a
 * finite number is made black (`finite`, a bit test: an exponent of all ones is NaN or ±∞): a NaN from one bad surface
 * (a normal of no length, a bump picture on a triangle of no area, on Apple's GPUs) would otherwise be blurred by ambient
 * occlusion and bloom over the whole frame, and the frame goes black. A material kept out of the occlusion (`exclude`)
 * writes 0 to the mask. The asset stage (../assets/stage.js) and the Factories' look (../factories/look.js, AirSup's,
 * line for line) draw through it; the film has no darkroom of its own (deleted with its GLSL, intent 602a8849).
 */
import * as THREE from 'three';
import { MRTNode, RenderPipeline } from 'three/webgpu';
import { abs, all, texture, uv, vec3, pass, mrt, output, normalView, packNormalToRGB, unpackRGBToNormal, float, uint, uniform, vec4, mix, select, floatBitsToUint, renderOutput, sample, screenUV, velocity, builtinAOContext, convertToTexture, int, context } from 'three/tsl';
import { ssao } from 'three/addons/tsl/display/SSAONode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { taau } from 'three/addons/tsl/display/TAAUNode.js';
import { sss } from 'three/addons/tsl/display/SSSNode.js';
import { boxBlur } from 'three/addons/tsl/display/boxBlur.js';
import { gradeNode } from './grade.js';
import { ao as gtao } from 'three/addons/tsl/display/GTAONode.js';
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js';
import { bloom as bloomNode } from 'three/addons/tsl/display/BloomNode.js';

/**
 * A page's own pass whose picture is a TSL node (a grade, a tilt shift): `make(at, p)` gets `at(q)`, the picture before
 * it read at `q`, and `p`, where this pixel is (screen UV), and gives back its colour; `uniforms` are its own, each with
 * its `value`. Drawn after the output pass: nothing tones or encodes it again.
 */
export class NodePass {
	/** @param {Record<string, { value: unknown }>} uniforms @param {(at: (q: any) => any, p: any) => any} make */
	constructor(uniforms, make) {
		this.uniforms = uniforms;
		this.make = make;
		this.enabled = true;
	}
	dispose() {}
}

/**
 * @typedef {object} PostOptions
 * @property {number} [samples] the scene pass's multisampling (default 4)
 * @property {false | ((ao: any) => void)} [ao] ambient occlusion, set up by the page (`blendIntensity`,
 *   `updateGtaoMaterial`, `updatePdMaterial`, `exclude`)
 * @property {{ strength: number, radius: number, threshold: number, on?: boolean }} [bloom]
 *   bloom (made either way when given; drawn unless `on` is false)
 * @property {Array<NodePass | ((color: any) => any)>} [after] the page's own passes, after the output, in order
 */

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
/**
 * The mask's 0, kept on a material `exclude`d (its `mrtNode`). Merged into the scene pass's MRT it writes 0 there; drawn
 * into a target with no MRT (the sky into its environment's cube) it is that target's colour alone, as the material
 * would draw it without one (an MRT of the mask alone there has no output at all, and WGSL refuses the shader).
 */
class MaskOff extends MRTNode {
	constructor() {
		super({ [MASK]: float(0) });
	}
	/** @param {any} builder */
	setup(builder) {
		const target = builder.renderer.getRenderTarget();
		this.outputNodes = builder.renderer.getMRT() === null && target ? { [target.textures[0].name]: output } : { [MASK]: float(0) };
		return super.setup(builder);
	}
}
const OFF = new MaskOff();

/**
 * The post stack: its passes TSL nodes on one RenderPipeline. `o.ao` is handed the occlusion (`blendIntensity`,
 * `updateGtaoMaterial`, `updatePdMaterial`, `exclude`), `o.after` the page's passes as functions of the picture (node
 * in, node out) or NodePasses, drawn after the output; anything else there is left out, said once.
 * @param {import('./core.js').Renderer} renderer @param {THREE.Scene} scene @param {THREE.Camera} camera @param {PostOptions} [o]
 */
export function createPost(renderer, scene, camera, o = {}) {
	const scenePass = pass(scene, camera, { samples: o.samples ?? 4, type: THREE.HalfFloatType });
	let color = scenePass.getTextureNode('output');
	/** @type {any} */
	let ao = null;
	if (o.ao) {
		// the depth, the normals and the mask first, the scene unlit; the occlusion from them laid on the scene's ambient
		// light alone (three's builtinAOContext), never on the sun's (intent 1f0c6f79: the viewer's GTAO darkened the
		// whole picture, sunlight included); the scene itself then drawn to its colour alone
		const prepass = pass(scene, camera, { type: THREE.HalfFloatType });
		prepass.setMRT(mrt({ output: packNormalToRGB(normalView), [MASK]: float(1) }));
		const depth = prepass.getTextureNode('depth');
		// the normals decoded wherever GTAO and the denoise sample them (three's own way: `sample`)
		const normals = prepass.getTextureNode('output');
		const normal = sample((/** @type {any} */ uv) => unpackRGBToNormal(normals.sample(uv)));
		const node = gtao(depth, normal, camera);
		const pd = denoise(node.getTextureNode(), depth, normal, camera);
		const blend = uniform(1);
		// the occlusion where the mask lets it, by the blend's intensity (GTAOPass's mix(1, ao, intensity)), on the ambient light
		const shade = convertToTexture(mix(float(1), pd.r, blend.mul(prepass.getTextureNode(MASK).r)));
		scenePass.contextNode = builtinAOContext(shade.sample(screenUV).r);
		// the scene pass's outputs its colour alone, so an excluded material's own (`exclude`: the mask's 0) merges into
		// them rather than standing in for its colour (three's NodeMaterial: a material's MRT alone replaces the output)
		scenePass.setMRT(mrt({ output }));
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
			/** the occlusion's settings: radius, distanceExponent, thickness, scale, samples */
			updateGtaoMaterial: (/** @type {any} */ p) => set(node, p, ['radius', 'distanceExponent', 'thickness', 'scale', 'samples', 'distanceFallOff']),
			/** the denoise's settings: lumaPhi, depthPhi, normalPhi, radius (rings and samples are the denoise's own) */
			updatePdMaterial: (/** @type {any} */ p) => set(pd, p, ['lumaPhi', 'depthPhi', 'normalPhi', 'radius']),
			/** a material kept out of the occlusion (an effect, a see-through or cut-out part), written 0 in the mask */
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
		// a NodePass: its function of the picture, sampled
		else if (typeof p?.make === 'function') {
			if (p.enabled === false) continue;
			const picture = convertToTexture(color);
			color = p.make((/** @type {any} */ q) => picture.sample(q), screenUV);
		}
		else if (!warned) {
			warned = true;
			console.warn('play: a pass that is no NodePass was left out of the post stack');
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
	}
	let color = scenePass.getTextureNode('output');
	/** @type {THREE.DirectionalLight | null} the sun as a light with a target (three's SunLight has none: it shines to the origin) */
	let key = null;
	/** @type {any} the contact shadows, blurred, read by the sun's light as the scene is lit */
	let shade = null;
	// from the prepass's depth (the scene before it is lit), so they darken the sun's light alone and nothing
	// see-through: laid over the finished picture they streaked a pond with the bed beneath it (avenBOX's Sandbox 1)
	if (plan.contact && o.sun && prepass) {
		key = /** @type {any} */ (o.sun).target ? /** @type {THREE.DirectionalLight} */ (o.sun) : new THREE.DirectionalLight();
		contact = sss(prepass.getTextureNode('depth'), camera, key);
		contact.resolutionScale = plan.contact.scale;
		contact.maxDistance.value = plan.contact.maxDistance;
		contact.thickness.value = plan.contact.thickness;
		contact.shadowIntensity.value = plan.contact.intensity;
		// blurred before it is laid on (three's advice: unblurred, at half resolution, it speckles foliage and streaks
		// beside thin blades, as avenBOX's screenshots of the old city showed)
		shade = convertToTexture(boxBlur(contact.getTextureNode(), { size: int(2), separation: int(1) }));
	}
	// the lighting's context: the occlusion on the ambient light, the contact shadows on the sun's, each read at its
	// pixel; neither on a see-through material (three's builtinAOContext and builtinShadowContext, merged)
	if (pd || shade) {
		const aoAt = pd ? convertToTexture(pd).sample(screenUV).r : null;
		const shadeAt = shade ? shade.sample(screenUV).r : null;
		/** @type {Record<string, any>} */
		const lit = {};
		if (aoAt) lit.getAO = (/** @type {any} */ input, /** @type {any} */ { material }) => (material.transparent === true ? input : input !== null ? input.mul(aoAt) : aoAt);
		if (shadeAt)
			lit.getShadow = (/** @type {any} */ lightNode, /** @type {any} */ builder) =>
				lightNode.light === o.sun && builder.material?.transparent !== true ? lightNode.shadowColorNode.mul(shadeAt) : lightNode.shadowColorNode;
		scenePass.contextNode = context(lit);
	}
	// what is not a number stops here, before anything blurs it over the frame
	color = finite(color);
	if (plan.aa === 'traa') color = aa = traa(color, scenePass.getTextureNode('depth'), scenePass.getTextureNode('velocity'), camera);
	else if (plan.aa === 'taau') color = aa = taau(color, scenePass.getTextureNode('depth'), scenePass.getTextureNode('velocity'), camera);
	if (plan.bloom) {
		// its threshold in the picture's own units: the scene's light before the lens is many times that (a world's
		// exposure brings it down), so the threshold is divided by the exposure each frame (`render`)
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
			if (bloom && plan.bloom) bloom.threshold.value = plan.bloom.threshold / Math.max(1e-4, renderer.toneMappingExposure ?? 1);
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

