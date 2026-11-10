// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE RENDERER'S MATERIALS — every material a build of an asset is drawn with, as the renderer keeps it (./index.js):
 * one for all the materials that are the same (two plants' bark of the same colour, one kind's steel at every level
 * of detail), so the graphics card switches between as few as it can, and each given the shader code that only the
 * renderer adds, never an asset (its own never leaves the box, ../box/serialize.js):
 *
 * - FADE: a thing coming in at another level of detail (./lod.js) is drawn through a fine dither that fills in as it
 *   comes (`aFade`, per copy), under the level it takes over from, so nothing pops; no blending, so no sorting.
 * - SECTION CAPS: a solid of the kit's (../kit.js, the materials it gave a cap shader in the box) cut open by the
 *   renderer's plane (`cut`) shows its cut face in the cap's colour, the way AirSup's lab cuts a machine open.
 *   Everything else is only cut away.
 *
 * Both are TSL, the render kit's shared nodes ($content/render/nodes): every material kept is that node material. A
 * skinned or morphed mesh's is three's own (`of(m, true)`), cut by three's clipping: a node material is built for the
 * first mesh it draws, and a skin or a morph is its own mesh's.
 */
import * as THREE from 'three';
import { aFade, cutBy, cutOf, nodeOf } from '../../render/nodes/index.js';
import { lookedOf } from '../../render/foliage.js';
import { lookByName } from '../look.js';

/** what a material says it is: its look (box format 5), else the one its name gives (an older build's, ../look.js) */
export const lookOfMaterial = (m) => m.userData?.look ?? lookByName(m.name);

/** what a material is, for telling two the same: the settings ../box/serialize.js carries over, and its maps' */
const PLAIN = ['side', 'roughness', 'metalness', 'opacity', 'transparent', 'vertexColors', 'flatShading', 'alphaTest', 'depthWrite', 'depthTest', 'transmission', 'ior', 'thickness', 'clearcoat', 'clearcoatRoughness', 'sheen', 'sheenRoughness', 'envMapIntensity', 'emissiveIntensity', 'bumpScale', 'wireframe', 'shininess', 'specularIntensity', 'iridescence', 'anisotropy', 'dispersion', 'aoMapIntensity', 'lightMapIntensity', 'displacementScale', 'displacementBias', 'toneMapped', 'fog'];
const COLORS = ['color', 'emissive', 'sheenColor', 'specularColor', 'attenuationColor', 'specular'];
const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'bumpMap', 'emissiveMap', 'aoMap', 'clearcoatNormalMap', 'displacementMap'];

/** a texture as the same picture shown the same way */
const textureKey = (t) => `${t.source?.uuid ?? t.uuid}:${t.wrapS},${t.wrapT}:${t.repeat.x},${t.repeat.y}:${t.offset.x},${t.offset.y}:${t.rotation}:${t.colorSpace}:${t.flipY}`;

/** @param {THREE.Material} m */
export function keyOf(m) {
	const cap = m.userData.cap;
	const out = [m.type, cap ? `${cap.color}/${cap.rough}/${cap.metal}` : '', m.userData.graph ? JSON.stringify(m.userData.graph) : ''];
	for (const k of PLAIN) if (k in m) out.push(m[k]);
	for (const k of COLORS) if (m[k]?.isColor) out.push(m[k].getHex());
	for (const k of MAPS) out.push(m[k]?.isTexture ? textureKey(m[k]) : '');
	if (m.normalScale?.isVector2) out.push(m.normalScale.x, m.normalScale.y);
	// a leaf is drawn otherwise than a stone of the same settings (intent 6fd5e63f)
	const look = lookOfMaterial(m);
	if (look) out.push(`look:${look.kind}:${look.translucency ?? ''}:${look.stiffness ?? ''}:${look.flutter ?? ''}:L${Math.min(m.userData.lookLevel ?? 0, 2)}`);
	return out.join('|');
}

/** a solid the kit gave section caps in the box: one of its materials (MeshPhysical, both sides drawn, its cut face's look) */
export const capped = (m) => !!m.userData.cap && m.isMeshPhysicalMaterial && m.side === THREE.DoubleSide;

/**
 * The renderer's materials: `of(m)` the one kept for a material (the node material of the first of its kind it was
 * handed, given our nodes; `of(m, true)` three's own), `cut(plane)` opens every one along a plane (null closes them).
 */
/** @param {{ wind?: any }} [o] the world's wind (../../render/wind.js `windNodes`): materials with a look are drawn by it */
export function createPresets({ wind = null } = {}) {
	/** @type {Map<string, THREE.Material>} */
	const kept = new Map();
	/** each kept material's key, and how many times `of` handed it out and it was not given back (`release`) */
	const keys = new Map(), uses = new Map();
	/** @type {WeakSet<THREE.Material>} the materials kept */
	const ours = new WeakSet();
	// the cut, shared by every material: the plane (removed where dot(n, p) + w < 0), and a second one never used yet
	const CUT = cutOf();
	/** @type {THREE.Plane[]} */
	let planes = [];

	/** @param {THREE.Material} m @param {boolean} plain */
	function patch(m, plain) {
		// glass that bends the light behind it (transmission) draws the whole world once more every frame just for
		// itself: ours lets the light through as plain see-through glass
		if (m.transmission > 0) {
			m.opacity = Math.min(m.opacity, 1 - 0.7 * m.transmission);
			m.transparent = true;
			m.depthWrite = false;
			m.transmission = 0;
		}
		// and a see-through part seen from both sides is drawn in one pass, not its back and then its front
		if (m.transparent && m.side === THREE.DoubleSide) m.forceSinglePass = true;
		// what says it is a leaf, grass, bark … is drawn by its look in the world's wind (../../render/foliage.js); a
		// material with a graph of its own (./box/graph.js) is drawn by its graph alone
		const n = plain ? m : cutBy(lookedOf(nodeOf(m, { wind }), m.userData.graph ? null : lookOfMaterial(m), wind, m.userData.lookLevel ?? 0), CUT, capped(m) ? m.userData.cap : undefined);
		if (!plain) n.fade = aFade;
		clip(n);
		return n;
	}

	/** @param {THREE.Material} m */
	function clip(m) {
		m.clippingPlanes = planes.length ? planes : null;
		m.clipIntersection = false;
		m.clipShadows = true;
		m.needsUpdate = true;
	}

	return {
		/** the material kept for `m`: itself, given our shaders, the first time one like it comes; else the one kept */
		of(/** @type {THREE.Material} */ m, plain = false) {
			// one of ours already (a copy of a level, moved by its controls, wears what the level wears)
			if (ours.has(m)) return m;
			// a look of its own (a graph) is a node material even on a skinned or morphed mesh, that material's own
			const own = plain && !!m.userData.graph;
			const key = (own ? `own|${m.uuid}|` : plain ? 'plain|' : '') + keyOf(m);
			let p = kept.get(key);
			if (!p) kept.set(key, (p = patch(m, plain && !own))), keys.set(p, key);
			ours.add(p);
			uses.set(p, (uses.get(p) ?? 0) + 1);
			return p;
		},
		/**
		 * One use of a material handed out by `of` given back (a level let go of): the last one gone, the material and
		 * its pictures go too (but a picture another kept material still shows).
		 * @param {THREE.Material} p
		 */
		release(p) {
			const left = (uses.get(p) ?? 0) - 1;
			if (left > 0) return void uses.set(p, left);
			uses.delete(p);
			const key = keys.get(p);
			if (key === undefined || kept.get(key) !== p) return;
			kept.delete(key);
			keys.delete(p);
			ours.delete(p);
			const shown = new Set();
			for (const q of kept.values()) for (const k of MAPS) if (q[k]?.isTexture) shown.add(q[k]);
			for (const k of MAPS) if (p[k]?.isTexture && !shown.has(p[k])) p[k].dispose();
			p.dispose();
		},
		/** how many there are */
		get size() {
			return kept.size;
		},
		/**
		 * Cuts every material open along `plane` (what lies on its negative side is taken away), or closes them (null).
		 * The renderer must have local clipping on (./index.js sets it).
		 * @param {THREE.Plane | null} plane
		 */
		cut(plane) {
			planes = plane ? [plane] : [];
			if (plane) CUT.a.value.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
			else CUT.a.value.set(0, 0, -1, 1e5);
			for (const m of kept.values()) clip(m);
		},
		/** the plane every material is cut along, if any */
		get plane() {
			return planes[0] ?? null;
		},
		dispose() {
			for (const m of kept.values()) {
				for (const k of MAPS) m[k]?.dispose?.();
				m.dispose();
			}
			kept.clear();
		}
	};
}
