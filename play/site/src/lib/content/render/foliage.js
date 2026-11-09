// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * LIGHT THROUGH LEAVES (intent 6fd5e63f) — a material whose `look` (../../kernel/look.js) is a leaf, grass, a petal, a
 * stem or bark drawn in TSL on any node material (`foliage(Base)`): bent by the one wind (./wind.js); a crown's normals
 * turned outward (grass's to the sky) so it is lit as one mass, the trick every game's trees use; darker toward the
 * foot; wrap diffuse and a backlight lobe (Frostbite's translucency, Barré-Brisebois and Bouchard 2011), so a leaf glows
 * at golden hour. Thin looks two-sided and cut out, never blended. `foliageOf(material, look, wind)` makes one.
 */
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { abs, clamp, diffuseColor, dot, float, mix, normalLocal, normalView, normalize, positionLocal, positionViewDirection, pow, select, sqrt, varying, vec3 } from 'three/tsl';
import { THIN, lookOf } from '../../kernel/look.js';
import { windLook } from './wind.js';

/** where a crown's middle is, as a share of the plant's height */
const CROWN = 0.62;
/** how far a leaf's normal is turned toward the outside of its crown (0 its own, 1 the crown's) */
export const ROUND = 0.45;
/** how much darker the foot is than the tip (the share of its colour the foot keeps) */
export const FOOT = 0.7;
/** how far past the terminator light wraps (0 Lambert) */
const WRAP = 0.35;
/** the backlight lobe: how the light's way is bent by the normal, how tight the lobe is, how bright */
export const BACK = Object.freeze({ distortion: 0.3, power: 4, scale: 1.6 });
/**
 * How much of the sun comes through a crown's own shadow to a leaf lit from behind (0 none, 1 as if unshadowed): the
 * leaves facing the eye in a backlit crown are in the shade of the leaves behind them, yet glow, because the light
 * passes leaf through leaf. Without it the shadow cancels the glow and a backlit crown goes dark.
 */
export const LEAK = 0.5;
/**
 * What a coarser level of a kind (../assets/render/lod.js: 0 its finest, drawn near) leaves out, what no eye reads that
 * far, so the many copies drawn at mid range cost little more than without a look: from level 1 the tips' flutter
 * (gone beyond 15 m anyway, where level 0 ends), from level 2 the light through it (wrap and the backlight lobe). The
 * bend, the crown's normals and the darker foot stay at every level, so nothing pops as a copy changes level.
 */
export const LEVELS = Object.freeze({ flutter: 1, glow: 2 });
/** the levels drawn alike: 0, 1, and 2 or coarser */
const tier = (level) => Math.min(Math.max(0, level | 0), LEVELS.glow);

/** the lighting a look adds: wrap and the backlight lobe, scaled by its translucency and the height on the plant */
const translucent = (Model, translucency, height) =>
	class extends Model {
		direct(input, builder) {
			super.direct(input, builder);
			const { lightDirection, lightColor, lightNode, reflectedLight } = input;
			const n = normalView;
			const dotNL = dot(n, lightDirection);
			// wrap: the part of the light past the terminator, what Lambert's clamp left out
			const wrapped = clamp(dotNL.add(WRAP).div(1 + WRAP), 0, 1).sub(clamp(dotNL, 0, 1));
			// the backlight: light from behind, through the leaf toward the eye
			const through = pow(clamp(dot(positionViewDirection, lightDirection.add(n.mul(BACK.distortion)).negate()), 0, 1), BACK.power);
			const tip = mix(float(0.35), float(1), height);
			// the light through it: the sun as it is before the shadow (three's baseColorNode), let through the crown's own
			// shade by LEAK; tinted by the leaf's colour lightened (its square root: what a leaf lets through is yellower and
			// brighter than what it reflects)
			const shade = builder?.object?.receiveShadow && lightNode?.light?.castShadow && lightNode?.shadowNode && lightNode?.baseColorNode ? lightNode.baseColorNode.mul(mix(float(LEAK), float(1), lightNode.shadowNode)) : lightColor;
			const glow = shade.mul(sqrt(diffuseColor.rgb)).mul(through.mul(translucency).mul(tip).mul(BACK.scale / Math.PI));
			reflectedLight.directDiffuse.addAssign(lightColor.mul(diffuseColor.rgb).mul(wrapped.mul(1 / Math.PI)).add(glow));
		}
	};

/**
 * A node material class with a look on top: `look` (checked, ../../kernel/look.js) and `wind` (./wind.js `windNodes`, the
 * world's) set on it before it is first drawn; its copies carry `aWind` (their foot and height). Without a wind, or on
 * a mesh whose copies carry none, it is drawn as its base.
 * @template {new (...a: any[]) => any} B @param {B} Base
 */
export const foliage = (Base) =>
	class extends Base {
		/** @type {ReturnType<typeof lookOf>} */ look = null;
		/** @type {any} */ wind = null;
		/** the level of its kind it draws (`LEVELS`), 0 the finest */
		level = 0;
		/** the height on the plant, 0 foot … 1 tip, from the vertex to the fragment */
		#height = null;

		setupPosition(builder) {
			const out = super.setupPosition(builder);
			const look = this.look;
			// a stone is drawn as it is: no wind, no crown, no glow
			if (!look || !this.wind || look.kind === 'stone') return out;
			// after instancing, in the mesh's own frame: the copy's foot and height (./wind.js `copyOf`)
			const { foot, height, f } = this.wind.copyOf();
			this.#height = varying(f, 'vFoliageHeight');
			const lit = height.greaterThan(0);
			if (look.kind === 'leaf' || look.kind === 'petal') {
				const outward = normalize(positionLocal.sub(foot.add(vec3(0, height.mul(CROWN), 0))).add(vec3(0, 1e-4, 0)));
				normalLocal.assign(select(lit, normalize(mix(normalLocal, outward, ROUND)), normalLocal));
			} else if (look.kind === 'grass') {
				normalLocal.assign(select(lit, normalize(mix(normalLocal, vec3(0, 1, 0), 0.6)), normalLocal));
			}
			const w = windLook(look);
			// the whole copy bends alike (stiffness 1: its leaves stay on their branches); the look's own numbers shake its tips
			if (w) positionLocal.assign(this.wind.positionOf({ stiffness: 1, flutter: this.level >= LEVELS.flutter ? 0 : w.flutter }));
			return out;
		}

		setupDiffuseColor(builder) {
			super.setupDiffuseColor(builder);
			if (this.look && this.#height) diffuseColor.rgb.mulAssign(mix(float(FOOT), float(1), this.#height));
		}

		setupLightingModel(builder) {
			const model = super.setupLightingModel(builder);
			if (!model || !this.look || !(this.look.translucency > 0) || !this.#height || this.level >= LEVELS.glow) return model;
			const T = translucent(model.constructor, float(this.look.translucency), this.#height);
			return Object.assign(new T(), model);
		}

		customProgramCacheKey() {
			const l = this.look;
			// (the wind's uniforms are the world's, shared: one program a look)
			return super.customProgramCacheKey() + (l ? `|look:${l.kind}:${l.translucency}:${l.stiffness}:${l.flutter}:${this.wind ? 'w' : ''}:L${tier(this.level)}` : '');
		}

		copy(source) {
			super.copy(source);
			for (const k of ['look', 'wind', 'level']) if (k in source) this[k] = source[k];
			return this;
		}
	};

/** the foliage material on three's standard node material */
const FoliageMaterial = foliage(MeshStandardNodeMaterial);

/** each node material class with a look on top, made once */
const classes = new WeakMap();

/**
 * A node material of the page's (the render kit's, ./nodes `nodeOf`) with a look on top: the same kind and settings,
 * drawn as its look says (`foliage`), thin looks two-sided and cut out; itself where there is no look or no wind.
 * `level`: the level of its kind it draws, which leaves out what is not read that far (`LEVELS`).
 * @param {any} n a node material, before its cut and fade are given @param {unknown} look @param {any} wind @param {number} [level]
 */
export function lookedOf(n, look, wind, level = 0) {
	const l = lookOf(look, n.name || 'material');
	if (!l || !wind || !n?.isNodeMaterial) return n;
	let F = classes.get(n.constructor);
	if (!F) classes.set(n.constructor, (F = foliage(n.constructor)));
	const m = new F();
	m.copy(n);
	m.userData = { ...n.userData };
	m.look = l;
	m.wind = wind;
	m.level = tier(level);
	thin(m, l);
	return m;
}

/** a leaf, a blade or a petal: both sides, cut out, never blended */
function thin(m, l) {
	if (!THIN.includes(l.kind)) return;
	m.side = THREE.DoubleSide;
	if (m.transparent) {
		m.transparent = false;
		m.alphaTest = Math.max(m.alphaTest, 0.5);
	}
}

/**
 * A material the page has, drawn with a look: its settings carried over onto a FoliageMaterial; thin looks two-sided
 * and cut out (alphaTest, never blended). `look` checked (an unknown kind throws), `wind` the world's (./wind.js
 * `windNodes`), or none for a still one.
 * @param {THREE.MeshStandardMaterial} material @param {unknown} look @param {{ wind?: any }} [o]
 */
export function foliageOf(material, look, { wind = null } = {}) {
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
	m.wind = wind;
	if (l) thin(m, l);
	return m;
}
