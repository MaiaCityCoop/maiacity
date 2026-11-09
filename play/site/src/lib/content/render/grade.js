// @ts-nocheck — TSL's node types are loose
/*
 * THE GRADE — the picture's last touch, after the tone mapping the page's picture is formed by (./core.js PICTURE), on
 * every world and the viewer (intent 1f0c6f79): a subtle look through a 3D LUT (a gentle contrast round mid grey,
 * shadows a breath cooler and highlights a breath warmer), saturation, a vignette and light grain. With restraint: the
 * forest demo's vignette and grain are the ceiling (`CEILING`), a world stays well under it (`WORLD`).
 *
 * The look is one function of a display colour (`look`), the same on the CPU (its tests, and the LUT's texels made
 * from it, `lutData`) and in the picture (`lut3D` of that texture). The grain is a hash of the pixel and `uTime`: a
 * film sets uTime from its own clock (never the wall's), so two seeks to one t draw one picture.
 */
import * as THREE from 'three';
import { Fn, dot, float, fract, mix, screenUV, sin, smoothstep, texture3D, uniform, vec2, vec3, vec4 } from 'three/tsl';
import { lut3D } from 'three/addons/tsl/display/Lut3DNode.js';

/** the forest demo's vignette and grain: no page goes past them */
export const CEILING = /** @type {const} */ ({ vig: 0.32, grain: 0.02, sat: 1.1, lut: 1 });
/** a world's grade: well under the ceiling */
export const WORLD = /** @type {const} */ ({ vig: 0.12, grain: 0.012, sat: 1.02, lut: 0.35 });
/** the LUT's side, texels */
export const LUT_SIZE = 16;

const clamp01 = (/** @type {number} */ x) => Math.min(1, Math.max(0, x));
const smooth = (/** @type {number} */ e0, /** @type {number} */ e1, /** @type {number} */ x) => {
	const t = clamp01((x - e0) / (e1 - e0));
	return t * t * (3 - 2 * t);
};

/**
 * The look at full strength, a display colour (0…1, encoded) in and out: a gentle S round mid grey (black and white
 * stay), then a split tone by luminance, cool under mid grey, warm over it.
 * @param {number[]} c
 */
export function look(c) {
	const s = c.map((v) => {
		// a smoothstep S, mixed in a third: its slope at mid grey 1.5 · ⅓ + ⅔ = 1.17
		const x = clamp01(v);
		return x + (x * x * (3 - 2 * x) - x) * (1 / 3);
	});
	const y = 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
	const cool = (1 - smooth(0.0, 0.5, y)) * smooth(0.0, 0.15, y), warm = smooth(0.5, 1.0, y) * (1 - smooth(0.9, 1.0, y));
	const tone = [0.012 * warm - 0.01 * cool, 0.004 * warm - 0.002 * cool, -0.012 * warm + 0.014 * cool];
	return s.map((v, i) => clamp01(v + tone[i]));
}

/**
 * The look as a size³ RGBA LUT (red fastest, then green, then blue), each texel the look of its colour.
 * @param {number} [size]
 */
export function lutData(size = LUT_SIZE) {
	const data = new Uint8Array(size * size * size * 4);
	for (let b = 0; b < size; b++)
		for (let g = 0; g < size; g++)
			for (let r = 0; r < size; r++) {
				const o = look([r / (size - 1), g / (size - 1), b / (size - 1)]);
				const i = (r + g * size + b * size * size) * 4;
				data[i] = Math.round(o[0] * 255);
				data[i + 1] = Math.round(o[1] * 255);
				data[i + 2] = Math.round(o[2] * 255);
				data[i + 3] = 255;
			}
	return data;
}

/** the look's LUT as a texture, made once */
let made = null;
export function lutTexture() {
	if (made) return made;
	const t = new THREE.Data3DTexture(lutData(), LUT_SIZE, LUT_SIZE, LUT_SIZE);
	t.format = THREE.RGBAFormat;
	t.type = THREE.UnsignedByteType;
	t.minFilter = t.magFilter = THREE.LinearFilter;
	t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
	t.generateMipmaps = false;
	t.needsUpdate = true;
	return (made = t);
}

/**
 * The grade in TSL, after the output (tone mapping and colour space): the look through its LUT at `lut`, saturation,
 * vignette and grain; its uniforms under the names the viewer's GLSL pass had (uTime, uVig, uGrain, uSat, uRes), and
 * uLut. Every value held to `CEILING`.
 * @param {{ vig: number, grain: number, sat: number, res: THREE.Vector2, lut?: number }} o
 */
export function gradeNode(o) {
	const held = (/** @type {number} */ v, /** @type {number} */ top) => Math.min(top, Math.max(0, v));
	const uniforms = {
		uTime: uniform(0),
		uVig: uniform(held(o.vig, CEILING.vig)),
		uGrain: uniform(held(o.grain, CEILING.grain)),
		uSat: uniform(held(o.sat, CEILING.sat)),
		uLut: uniform(held(o.lut ?? 0, CEILING.lut)),
		uRes: uniform(new THREE.Vector2(o.res.x, o.res.y))
	};
	const h = Fn(([p]) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453)));
	const withLut = (o.lut ?? 0) > 0;
	/** @param {any} input the picture after the output */
	const node = (input) => {
		const graded = withLut ? lut3D(vec4(input.rgb.clamp(0, 1), 1), texture3D(lutTexture()), LUT_SIZE, uniforms.uLut) : input;
		return Fn(() => {
			const { uTime, uVig, uGrain, uSat, uRes } = uniforms;
			let c = vec3(graded.rgb);
			const l = dot(c, vec3(0.2126, 0.7152, 0.0722));
			c = mix(vec3(l), c, uSat);
			const q = screenUV.sub(0.5).toVar();
			q.x.mulAssign(uRes.x.div(uRes.y));
			c = c.mul(float(1).sub(uVig.mul(smoothstep(0.35, 1.25, q.length()))));
			c = c.add(h(screenUV.mul(uRes).add(fract(uTime).mul(91.7))).sub(0.5).mul(uGrain));
			return vec4(c, 1);
		})();
	};
	return { uniforms, node };
}
