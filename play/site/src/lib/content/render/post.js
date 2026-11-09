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
import { RenderPipeline } from 'three/webgpu';
import { pass, mrt, output, normalView, packNormalToRGB, unpackRGBToNormal, float, uint, uniform, vec4, mix, select, floatBitsToUint, renderOutput, sample, convertToTexture, screenUV } from 'three/tsl';
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
/** the mask's 0, kept on a material `exclude`d */
const OFF = mrt({ [MASK]: float(0) });

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
		scenePass.setMRT(mrt({ output, normal: packNormalToRGB(normalView), [MASK]: float(1) }));
		const depth = scenePass.getTextureNode('depth');
		// the normals decoded wherever GTAO and the denoise sample them (three's own way: `sample`)
		const normals = scenePass.getTextureNode('normal');
		const normal = sample((/** @type {any} */ uv) => unpackRGBToNormal(normals.sample(uv)));
		const node = gtao(depth, normal, camera);
		const pd = denoise(node.getTextureNode(), depth, normal, camera);
		const blend = uniform(1);
		// the occlusion where the mask lets it, by the blend's intensity: mix(1, ao, intensity) over the colour
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
