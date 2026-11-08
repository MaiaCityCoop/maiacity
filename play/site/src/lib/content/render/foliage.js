// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * LIGHT THROUGH LEAVES (intent 6fd5e63f) — what a material that says it is a leaf, grass, a petal, a stem or bark
 * (its `look`, ../assets/look.js) is drawn with, in TSL, on top of any node material (`foliage(Base)`), so it carries to
 * WebGPU unchanged and sits on the render kit's own (./nodes, intent cb16b7a5) as on three's:
 *
 * - **Wind** (./wind.js): the point as it was before instancing (the plant's own frame, its foot at y 0) is bent by the
 *   world's one wind after instancing, by the look's stiffness and flutter; a stone never moves.
 * - **Crowns bent outward**: a leaf's or petal's normal turned toward the outside of its crown (about 0.6 of its height
 *   up), a blade of grass's toward the sky, before instancing, so a crown is lit as one round mass and not leaf by
 *   leaf (the trick every game's trees use).
 * - **Root to tip**: darker toward the foot (the light a crown or a sward keeps from its own inside).
 * - **Wrap diffuse and a backlight lobe** (Frostbite's translucency, Barré-Brisebois and Bouchard 2011): light wrapped a
 *   little past the terminator, and, with the sun behind it, light through it toward the eye, stronger at the tips,
 *   tinted by its own colour: a leaf glows at golden hour. Thin looks are drawn two-sided (both faces lit, each by its
 *   own normal) and cut out, never blended.
 *
 * `foliageOf(material, look, wind)` makes one from a material the page already has (its colour, maps and settings kept).
 */
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { abs, clamp, diffuseColor, dot, float, max, mix, normalLocal, normalView, normalize, positionLocal, positionViewDirection, pow, uniform, varying, vec3 } from 'three/tsl';
import { THIN, lookOf } from '../assets/look.js';
import { windLook } from './wind.js';

/** where a crown's middle is, as a share of the plant's height */
export const CROWN = 0.62;
/** how far a leaf's normal is turned toward the outside of its crown (0 its own, 1 the crown's) */
export const ROUND = 0.45;
/** how much darker the foot is than the tip (the share of its colour the foot keeps) */
export const FOOT = 0.55;
/** how far past the terminator light wraps (0 Lambert) */
export const WRAP = 0.35;
/** the backlight lobe: how the light's way is bent by the normal, how tight the lobe is, how bright */
export const BACK = Object.freeze({ distortion: 0.3, power: 4, scale: 1.6 });

/** the lighting a look adds: wrap and the backlight lobe, scaled by its translucency and the height on the plant */
const translucent = (Model, translucency, height) =>
	class extends Model {
		direct(input, builder) {
			super.direct(input, builder);
			const { lightDirection, lightColor, reflectedLight } = input;
			const n = normalView;
			const dotNL = dot(n, lightDirection);
			// wrap: the part of the light past the terminator, what Lambert's clamp left out
			const wrapped = clamp(dotNL.add(WRAP).div(1 + WRAP), 0, 1).sub(clamp(dotNL, 0, 1));
			// the backlight: light from behind, through the leaf toward the eye
			const through = pow(clamp(dot(positionViewDirection, lightDirection.add(n.mul(BACK.distortion)).negate()), 0, 1), BACK.power);
			const tip = mix(float(0.35), float(1), height);
			const add = lightColor.mul(diffuseColor.rgb).mul(wrapped.mul(1 / Math.PI).add(through.mul(translucency).mul(tip).mul(BACK.scale / Math.PI)));
			reflectedLight.directDiffuse.addAssign(add);
		}
	};

/**
 * A node material class with a look on top: `look` (checked, ../assets/look.js), `top` (the plant's height in its own
 * frame) and `wind` (./wind.js `windNodes`, the world's) set on it before it is first drawn.
 * @template {new (...a: any[]) => any} B @param {B} Base
 */
export const foliage = (Base) =>
	class extends Base {
		/** @type {ReturnType<typeof lookOf>} */ look = null;
		/** @type {any} */ wind = null;
		top = uniform(1);
		/** the height on the plant, 0 foot … 1 tip, from the vertex to the fragment */
		#height = null;

		setupPosition(builder) {
			const look = this.look;
			if (!look) return super.setupPosition(builder);
			const top = this.top;
			const local = vec3(positionLocal).toVar('foliageLocal');
			const f = clamp(local.y.div(max(top, 1e-4)), 0, 1);
			this.#height = varying(f, 'vFoliageHeight');
			if (look.kind === 'leaf' || look.kind === 'petal') {
				const out = normalize(local.sub(vec3(0, top.mul(CROWN), 0)).add(vec3(0, 1e-4, 0)));
				normalLocal.assign(normalize(mix(normalLocal, out, ROUND)));
			} else if (look.kind === 'grass') {
				normalLocal.assign(normalize(mix(normalLocal, vec3(0, 1, 0), 0.6)));
			}
			const out = super.setupPosition(builder);
			const w = windLook(look);
			if (w && this.wind) positionLocal.assign(this.wind.positionOf({ stiffness: w.stiffness, flutter: w.flutter, local, top }));
			return out;
		}

		setupDiffuseColor(builder) {
			super.setupDiffuseColor(builder);
			if (this.look && this.#height) diffuseColor.rgb.mulAssign(mix(float(FOOT), float(1), this.#height));
		}

		setupLightingModel(builder) {
			const model = super.setupLightingModel(builder);
			if (!model || !this.look || !(this.look.translucency > 0) || !this.#height) return model;
			const T = translucent(model.constructor, float(this.look.translucency), this.#height);
			return Object.assign(new T(), model);
		}

		customProgramCacheKey() {
			const l = this.look;
			return super.customProgramCacheKey() + (l ? `|look:${l.kind}:${l.translucency}:${l.stiffness}:${l.flutter}:${this.wind ? 'w' : ''}` : '');
		}

		copy(source) {
			super.copy(source);
			for (const k of ['look', 'wind']) if (k in source) this[k] = source[k];
			if (source.top?.isNode) this.top.value = source.top.value;
			return this;
		}
	};

/** the foliage material on three's standard node material (the render kit's own once intent cb16b7a5 lands) */
export const FoliageMaterial = foliage(MeshStandardNodeMaterial);

/**
 * A material the page has, drawn with a look: its settings carried over onto a FoliageMaterial; thin looks two-sided
 * and cut out (alphaTest, never blended). `look` checked (an unknown kind throws), `top` the plant's height in its own
 * frame, `wind` the world's (./wind.js `windNodes`), or none for a still one.
 * @param {THREE.MeshStandardMaterial} material @param {unknown} look @param {{ top?: number, wind?: any }} [o]
 */
export function foliageOf(material, look, { top = 1, wind = null } = {}) {
	const l = lookOf(look, material.name || 'material');
	const m = new FoliageMaterial();
	for (const k of ['color', 'emissive']) if (material[k]?.isColor) m[k].copy(material[k]);
	for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'bumpMap', 'emissiveMap', 'aoMap']) if (material[k]) m[k] = material[k];
	for (const k of ['roughness', 'metalness', 'opacity', 'alphaTest', 'vertexColors', 'flatShading', 'envMapIntensity', 'emissiveIntensity', 'bumpScale', 'aoMapIntensity', 'alphaHash', 'depthWrite', 'fog'])
		if (k in material) m[k] = material[k];
	if (material.normalScale?.isVector2) m.normalScale.copy(material.normalScale);
	m.name = material.name;
	m.side = material.side;
	m.transparent = material.transparent;
	m.look = l;
	m.top.value = Math.max(1e-4, top);
	m.wind = wind;
	if (l && THIN.includes(l.kind)) {
		m.side = THREE.DoubleSide;
		// cut, not blended: a see-through leaf is a cut-out
		if (m.transparent) {
			m.transparent = false;
			m.alphaTest = Math.max(m.alphaTest, 0.5);
		}
	}
	return m;
}
