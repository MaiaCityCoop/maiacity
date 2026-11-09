// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE RENDER KIT'S SHADERS, IN TSL (intent cb16b7a5): what every world and the asset viewer draw with beyond three's own
 * materials, written once as node materials so they carry over to WebGPU (intent 9) unchanged:
 *
 * - FADE: a level of detail coming in (../../assets/render/lod.js `BAND`) drawn through a fine dither that fills in as
 *   it comes (`aFade` per copy: 0 whole, between 0 and 1 that much of it), so nothing pops and nothing is blended.
 * - CUT: what lies on the negative side of both planes `a` and `b` taken away (a plane at 1e5 never cuts).
 * - CAPS: a solid cut open shows its cut face: the back faces seen through the opening drawn flat on the plane, in the
 *   cap's colour with a faint hatch (AirSup's section caps, ../../assets/kit.js).
 * - GLOSS: the lights' own highlights scaled (the asset stage's 0.7).
 * - GROW: a biome's cover (../../biomes/stream.js) grown up out of the ground or sunk back into it by its rank and its
 *   distance from the eye (`aCover`, `aReach` per copy; `coverEye`), so it thins out with distance and has no edge.
 * - the far pictures' card, the x-ray ghost, the contact shadow's blur and the stage floor's fade into the horizon.
 *
 * Drawn on WebGLRenderer through three's WebGLNodesHandler (`install`), with what it lacks in r186 made good here:
 * a node material shared by many instanced meshes takes each one's own matrices (three's node instancing would keep
 * the first mesh's), clipping is ours (the handler draws no clipping planes), a target is drawn into linear and
 * untoned as three's own materials are, and a node material drawing a shadow is drawn from the light.
 */
import * as THREE from 'three';
import { AttributeNode, MeshBasicNodeMaterial, MeshLambertNodeMaterial, MeshPhongNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, NodeMaterial } from 'three/webgpu';
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';
import { SunLight } from 'three/addons/lights/SunLight.js';
import { SunLightNode } from 'three/addons/lights/SunLightNode.js';

// the sky's sun (three's SunLight, its cascaded shadows) lights node materials as it lights three's own
SunLight.registerNode(SunLightNode);
import {
	If, abs, atan, int, uniformArray, cameraPosition, cameraViewMatrix, clamp, diffuseColor, dot, float, floor, fract, frontFacing, instanceColor, length, mat3, materialMetalness, materialNormal,
	materialOpacity, materialRoughness, max, mix, mod, nodeObject, normalLocal, normalView, normalize, output, positionLocal, positionView, positionViewDirection, positionWorld, pow,
	screenCoordinate, select, sin, smoothstep, texture, uniform, uv, varying, vec2, vec3, vec4
} from 'three/tsl';

// ---------------------------------------------------------------- the handler

const handlers = new WeakMap();

/**
 * Lets a renderer draw node materials (three's WebGLNodesHandler, r184+), as we need it: one of the kit's (`isKit`)
 * drawn into a target comes out linear and untoned, as three's own do (the handler would tone-map and encode it for
 * the screen). Every other node material (the sky's, and the environment three bakes from it) as the handler draws it.
 * @param {THREE.WebGLRenderer} r
 */
export function install(r) {
	if (handlers.has(r) || !r.setNodesHandler) return handlers.get(r);
	const h = new WebGLNodesHandler();
	r.setNodesHandler(h);
	const screen = h.getOutputCallback;
	const onScreen = () => r.getRenderTarget() === null;
	// Only the kit's own materials are drawn linear and untoned into a target (and keyed apart as 'target'); every other
	// node material (the sky, its environment bake) keeps the handler's key and output, toned and encoded by the
	// renderer's settings of the moment, as on main: keyed by them, an environment bake (no tone, linear) and the frame
	// that follows are two programs, never one (cb16b7a5: the viewer's sky drawn raw, a haze over everything).
	let keying = null;
	const keyOf = h.customProgramCacheKeyCallback;
	h.customProgramCacheKeyCallback = function () {
		keying = this;
		try {
			return keyOf.call(this);
		} finally {
			keying = null;
		}
	};
	h.getOutputCallback = (node, builder) => (onScreen() || !(builder?.material ?? h.nodeFrame.material)?.isKit ? screen(node, builder) : node);
	if (h.renderer) h.renderer.getCacheKey = () => (onScreen() || !(keying ?? h.nodeFrame.material)?.isKit ? `${r.toneMapping}${r.outputColorSpace}` : 'target');
	handlers.set(r, h);
	return h;
}

/**
 * A mesh whose shadow is drawn by a node material (its `customDepthMaterial`): drawn from the light. The handler keeps
 * the eye's camera through the shadow pass and updates nothing there; this does both, for this mesh.
 * @param {THREE.Mesh} mesh @param {THREE.WebGLRenderer} r
 */
export function castsAsNode(mesh, r) {
	let was = null;
	mesh.onBeforeShadow = (_r, o, _c, light, g, depth) => {
		const h = handlers.get(r);
		// (only a real renderer: the census's counting one keeps no programs)
		if (!h || !depth.isNodeMaterial || typeof r.properties?.has !== 'function') return;
		was = h.nodeFrame.camera;
		h.nodeFrame.camera = light;
		h.setObject(o, depth);
		depth.onBeforeRender(r, null, light, g, o);
	};
	mesh.onAfterShadow = () => {
		const h = handlers.get(r);
		if (h && was) h.nodeFrame.camera = was;
		was = null;
	};
}

// ---------------------------------------------------------------- the pieces

/** an attribute declared whether the geometry has it or not (unbound it reads 0, as three's own `aFade` did) */
class Always extends AttributeNode {
	generate(b) {
		const type = this.getNodeType(b);
		return b.shaderStage === 'vertex' ? b.getAttribute(this.getAttributeName(b), type).name : varying(this).build(b, type);
	}
}
const always = (name, type) => nodeObject(new Always(name, type));

/** a copy's fade (../../assets/render/index.js keeps it per instance) */
export const aFade = always('aFade', 'float');

/** a copy of a biome's cover: its rank + 1 (0 for a copy that is none) and its foot, x, y, z in the world */
export const aCover = always('aCover', 'vec4');
/** its stream's near, reach and thin (../../biomes/stream.js `coverStream`) */
export const aReach = always('aReach', 'vec3');
/** where the eye is that the cover grows round (the renderer sets it every frame: ../../assets/render/index.js) */
export const coverEye = uniform(new THREE.Vector3(1e9, 0, 1e9));
/**
 * Where the cover is left out besides (the asset viewer's earth seen from below, ../../assets/ground.js): while `on`,
 * every copy whose foot lies, along `f` from `c`, outside the band from -b to -b - band.
 */
export const coverAway = { on: uniform(0), c: uniform(new THREE.Vector2()), f: uniform(new THREE.Vector2(0, 1)), b: uniform(0), band: uniform(0) };

/**
 * How far a copy of the cover is grown (0…1) at distance d from the eye, by its rank: all of it stands within `near`,
 * fewer and fewer further off down to `thin` of it at `reach`, each rising out of the ground over 0.08 of rank, and
 * nothing in the last 4 m. The same sum as `grown`'s on the graphics card, for the renderer to leave out on the
 * processor what does not grow and to size the rest by it.
 */
export function coverGrow(d, rank, near, reach, thin) {
	const keep = 1 - (1 - thin) * Math.min(1, Math.max(0, (d - near) / Math.max(1e-3, reach - near)));
	const t = Math.min(1, Math.max(0, (d - reach + 4) / 4));
	return Math.min(1, Math.max(0, (keep - rank) / 0.08)) * (1 - t * t * (3 - 2 * t));
}

/** a point of a copy as the cover grows it (`coverGrow`, here per vertex): scaled to its foot, or left as it is */
function grown(p) {
	const rank = aCover.x.sub(1), foot = aCover.yzw;
	const near = aReach.x, reach = aReach.y, thin = aReach.z;
	const d = length(foot.xz.sub(coverEye.xz));
	const keep = float(1).sub(float(1).sub(thin).mul(clamp(d.sub(near).div(max(reach.sub(near), 1e-3)), 0, 1)));
	const along = dot(foot.xz.sub(coverAway.c), coverAway.f);
	const away = coverAway.on.greaterThan(0.5).and(along.greaterThan(coverAway.b.negate()).or(along.lessThan(coverAway.b.negate().sub(coverAway.band))));
	const grow = select(away, float(0), clamp(keep.sub(rank).div(0.08), 0, 1).mul(float(1).sub(smoothstep(reach.sub(4), reach, d))));
	return select(aCover.x.greaterThan(0), foot.add(p.sub(foot).mul(grow)), p);
}

/**
 * A picture we drew into (a render target: the far pictures' page, the contact shadow's) read where three's own
 * materials read it. On WebGL three's TextureNode turns v over (1 - v) for a render target's texture; this turns it back,
 * so the cell laid at row r is read at row r (else the far trees showed another tree's picture, upside down).
 */
const drawn = (map, at = uv()) => texture(map, vec2(at.x, float(1).sub(at.y)));

/** the dither every drawing of ours fades in by: the same everywhere on the screen, so two levels never fight */
export const dither = fract(sin(dot(floor(screenCoordinate.xy), vec2(12.9898, 78.233))).mul(43758.5453));

/** a fade (0 whole, between 0 and 1 that much of it) cuts away the pixels its dither says are not there yet */
export const faded = (f) => f.greaterThan(0).and(f.lessThan(1)).and(dither.greaterThan(f));

/** a cut: two planes (n, w), what is on the negative side of both taken away; `hatch` the cap's hatch spacing */
export const cutOf = () => ({ a: uniform(new THREE.Vector4(0, 0, -1, 1e5)), b: uniform(new THREE.Vector4(0, 0, -1, 1e5)), hatch: uniform(0.012) });

const side = (P, p) => dot(P.xyz, p).add(P.w);
/** whether the renderer cuts at all (its `localClippingEnabled`, as three's own clipping asks): a picture taken does not */
const clipping = uniform(1).onRenderUpdate(({ renderer }) => (renderer.localClippingEnabled ? 1 : 0));
const cuts = (cut) => clipping.greaterThan(0).and(side(cut.a, positionWorld).lessThan(0)).and(side(cut.b, positionWorld).lessThan(0));

/** a cut's section face for a back face seen through the opening: whether it is one, and its plane's normal and hit */
const faceOf = (cut) => {
	const { a, b } = cut;
	const on = frontFacing.not().and(a.w.lessThan(1e4)).and(clipping.greaterThan(0));
	const ro = cameraPosition, rd = normalize(positionWorld.sub(ro));
	// which plane the eye's ray leaves the kept side by first (AirSup's labClip, its id)
	const dA = dot(a.xyz, rd), dB = dot(b.xyz, rd);
	const tA = side(a, ro).negate().div(dA), tB = side(b, ro).negate().div(dB);
	const shut = abs(dA).lessThan(1e-8).and(side(a, ro).greaterThanEqual(0));
	const t1 = select(dA.greaterThan(1e-8), tA, select(shut, float(0), float(1e9)));
	const idA = dA.greaterThan(1e-8);
	const idB = dB.greaterThan(1e-8).and(tB.lessThan(t1));
	const nearB = abs(side(b, positionWorld)).lessThan(abs(side(a, positionWorld)));
	const n = select(idB, b.xyz, select(idA, a.xyz, select(nearB, b.xyz, a.xyz)));
	const hit = positionWorld.sub(n.mul(dot(n, positionWorld).add(select(idB, b.w, a.w))));
	return { on, n, hit };
};

/** the lighting that scales the lights' own highlights by `gloss` */
const glossy = (Model, gloss) =>
	class extends Model {
		start(builder) {
			super.start(builder);
			builder.context.reflectedLight.directSpecular.mulAssign(gloss);
			this.clearcoatSpecularDirect?.mulAssign(gloss);
			this.sheenSpecularDirect?.mulAssign(gloss);
		}
	};

/** ours on top of a node material: per-mesh instancing, the fade, the cut, the caps and the gloss */
const ours = (Base) =>
	class extends Base {
		isKit = true;
		/** @type {any} */ fade = null;
		/** @type {any} */ cut = null;
		/** @type {any} */ cap = null;
		gloss = 1;
		setup(builder) {
			// a matrix takes four attribute places: the handler's builder counts one
			if (!builder.ours) {
				builder.ours = true;
				const list = builder.getAttributes.bind(builder);
				builder.getAttributes = (stage) => {
					let at = 0;
					return list(stage).replace(/layout\( location = \d+ \) in (\w+)/g, (_, t) => `layout( location = ${(at += t === 'mat4' ? 4 : 1) - (t === 'mat4' ? 4 : 1)} ) in ${t}`);
				};
			}
			return super.setup(builder);
		}
		setupPosition(builder) {
			const o = builder.object;
			if (!o.isInstancedMesh) return super.setupPosition(builder);
			// each mesh's own `instanceMatrix` and `instanceColor`, bound by the renderer as three's own materials take them
			o.isInstancedMesh = false;
			try {
				super.setupPosition(builder);
			} finally {
				o.isInstancedMesh = true;
			}
			const m = always('instanceMatrix', 'mat4');
			const c0 = m.element(0).xyz, c1 = m.element(1).xyz, c2 = m.element(2).xyz;
			positionLocal.assign(grown(m.mul(vec4(positionLocal, 1)).xyz));
			normalLocal.assign(mat3(c0, c1, c2).mul(normalLocal.div(vec3(dot(c0, c0), dot(c1, c1), dot(c2, c2)))));
			if (o.instanceColor) instanceColor.assign(always('instanceColor', 'vec3'));
			return positionLocal;
		}
		setupDiffuseColor(builder) {
			if (this.cut) cuts(this.cut).discard();
			if (this.fade) faded(this.fade).discard();
			super.setupDiffuseColor(builder);
			if (this.cap) {
				const { face, color } = this.cap;
				const hs = dot(face.hit, vec3(0.7071, 0.7071, 0)).div(this.cut.hatch);
				const hl = smoothstep(0, 0.08, abs(fract(hs).sub(0.5)).sub(0.42));
				If(face.on, () => diffuseColor.rgb.assign(color.mul(hl.mul(0.06).add(0.94))));
			}
		}
		setupLightingModel(builder) {
			const model = super.setupLightingModel(builder);
			if (!model || this.gloss === 1) return model;
			const G = glossy(model.constructor, float(this.gloss));
			return Object.assign(new G(), model);
		}
		// a program for each shape, not for each material: three's key hashes only a node material's nodes, so the
		// textures beside them (a picture drawn into a target, the sky's cube map) and our own settings join the key, and
		// two of ours whose shaders differ never share a program (else each uploads its uniforms by name into the other's
		// layout). Keyed by the material's id instead, every copy compiled its own: walking Sandbox 5, Safari linked 88
		// programs in 8 frames, one at a time (bd087014).
		customProgramCacheKey() {
			return `${super.customProgramCacheKey()}#${shapeOf(this)}`;
		}
		copy(source) {
			super.copy(source);
			for (const k of ['fade', 'cut', 'cap', 'gloss']) if (k in source) this[k] = source[k];
			return this;
		}
	};

const I3 = new THREE.Matrix3();
/**
 * What makes two of our materials' shaders differ beside three's node hash: the kit's own settings (fade, cut, cap,
 * gloss) and, for every texture slot, how it is read (drawn into, cube, data, array, compressed, its channel, colour
 * space, flipY and a matrix that is not the identity). The same shape is the same program.
 * @param {any} m
 */
function shapeOf(m) {
	let s = `${m.fade ? 'f' : ''}${m.cut ? 'c' : ''}${m.cap ? 'p' : ''}${m.gloss === 1 ? '' : `g${m.gloss}`}`;
	for (const k of Object.keys(m).sort()) {
		const t = m[k];
		if (!t?.isTexture) continue;
		s += `|${k}:${t.isRenderTargetTexture ? 'rt' : ''}${t.isCubeTexture ? 'cube' : ''}${t.isDataTexture ? 'd' : ''}${t.isDataArrayTexture || t.isArrayTexture ? 'a' : ''}${t.isCompressedTexture ? 'z' : ''}${t.channel}${t.colorSpace}${t.flipY ? 'y' : ''}${t.matrixAutoUpdate && !t.matrix.equals(I3) ? 'm' : ''}`;
	}
	return s;
}

const KINDS = {
	MeshStandardMaterial: ours(MeshStandardNodeMaterial),
	MeshPhysicalMaterial: ours(MeshPhysicalNodeMaterial),
	MeshBasicMaterial: ours(MeshBasicNodeMaterial),
	MeshLambertMaterial: ours(MeshLambertNodeMaterial),
	MeshPhongMaterial: ours(MeshPhongNodeMaterial)
};
/** the settings kept behind accessors, which a material's own keys miss */
const HIDDEN = ['alphaTest', 'clearcoat', 'sheen', 'iridescence', 'transmission', 'anisotropy', 'dispersion'];
const SKIP = new Set(['uuid', 'id', 'type', 'version', 'defines', 'onBeforeCompile', 'customProgramCacheKey', 'onBeforeRender', 'userData']);

/** whether `nodeOf` has a node material for `m` */
export const drawnAsNode = (m) => !!m?.isNodeMaterial || !!KINDS[m?.type];

/**
 * A three.js material as the same node material of ours (its kind, every setting, the same pictures), or itself if it
 * is one already or has none.
 * @param {THREE.Material} m
 */
export function nodeOf(m) {
	if (m.isNodeMaterial) return m;
	const K = KINDS[m.type];
	if (!K) return m;
	const n = new K();
	for (const k of [...Object.keys(m), ...HIDDEN]) {
		if (SKIP.has(k) || k.startsWith('_') || k.startsWith('is') || !(k in n) || !(k in m)) continue;
		const v = m[k];
		if (n[k]?.copy && v?.copy && !v.isTexture) n[k].copy(v);
		else n[k] = v;
	}
	n.userData = { ...m.userData };
	return n;
}

/**
 * Gives a node material of ours a cut (`cutOf`) and, if `look` is given, section caps in its colour, roughness and
 * metalness (uniforms of its own, so every colour shares one program).
 * @param {any} m @param {ReturnType<typeof cutOf>} cut @param {{ color: THREE.ColorRepresentation, rough: number, metal: number }} [look]
 */
export function cutBy(m, cut, look) {
	m.cut = cut;
	if (!look) return m;
	const face = faceOf(cut);
	const color = uniform(new THREE.Color(look.color)), rough = uniform(look.rough), metal = uniform(look.metal);
	m.cap = { face, color, rough, metal };
	m.roughnessNode = select(face.on, rough, materialRoughness);
	m.metalnessNode = select(face.on, metal, materialMetalness);
	const nv = normalize(cameraViewMatrix.mul(vec4(face.n.negate(), 0)).xyz);
	m.normalNode = select(face.on, select(dot(nv, positionView.negate().normalize()).greaterThan(0), nv.negate(), nv), materialNormal);
	m.side = THREE.DoubleSide;
	m.shadowSide = THREE.FrontSide;
	return m;
}

// ---------------------------------------------------------------- the far pictures' card

/**
 * The material of a page of far pictures (../../assets/render/impostors.js): each card stands at its foot (`aAt`),
 * `aSize` metres, turned about its upright axis to the eye (to the light, drawing its shadow), showing the picture of
 * its thing (`aCell`, then one of `frames` sides by the thing's own turn `aTurn`) from the page `map` of `grid` cells,
 * faded by `aFade`; `depth` the one that draws its shadow.
 * @param {THREE.Texture} map @param {THREE.Vector2} grid @param {number} frames @param {ReturnType<typeof cutOf>} cut
 */
export function cardMaterials(map, cells, frames, cut) {
	const grid = uniform(cells);
	const at = always('aAt', 'vec3'), size = always('aSize', 'float');
	const t = cameraPosition.xz.sub(at.xz);
	const te = select(length(t).greaterThan(1e-4), normalize(t), vec2(0, 1));
	const pos = at.add(vec3(te.y, 0, te.x.negate()).mul(positionLocal.x).mul(size)).add(vec3(0, positionLocal.y.mul(size), 0));
	const step = (Math.PI * 2) / frames;
	const face = mod(floor(atan(te.x, te.y).sub(always('aTurn', 'float')).div(step).add(0.5)), frames);
	const cell = always('aCell', 'float').add(face);
	const card = varying(vec2(mod(cell, grid.x), floor(cell.div(grid.x))).add(clamp(uv(), 0.004, 0.996)).div(grid));
	const look = drawn(map, card);
	const make = (K, o) => {
		const m = new (ours(K))({ alphaTest: 0.5, side: THREE.DoubleSide, ...o });
		m.positionNode = pos;
		m.colorNode = look;
		m.fade = aFade;
		m.cut = cut;
		return m;
	};
	const material = make(MeshStandardNodeMaterial, { roughness: 0.85 });
	// lit as a thing facing the eye a little upward
	material.normalNode = normalize(cameraViewMatrix.mul(vec4(normalize(vec3(te.x, 0.55, te.y)), 0)).xyz);
	return { material, depth: make(MeshBasicNodeMaterial, {}) };
}

// ---------------------------------------------------------------- the asset stage

/** the x-ray ghost: a fresnel glass, `a` how much of it, `paper` the light theme (0 or 1) */
export function ghostMaterial() {
	const a = uniform(0), paper = uniform(1);
	const m = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
	const f = pow(float(1).sub(abs(dot(normalView, positionViewDirection))), 2.2);
	m.colorNode = mix(vec3(0.55, 0.75, 1), vec3(0.16, 0.22, 0.3), paper);
	m.opacityNode = f.mul(0.5).add(0.05).mul(a).mul(mix(float(1), float(0.7), paper));
	m.ghost = { a, paper };
	m.isKit = true;
	return m;
}

/**
 * The contact shadow's blur (three's 9-tap Gaussian along `dir`) of `map`; with `gain` above 0 it first turns the
 * depth picture (white near the floor, clear where nothing is) into the shadow's darkness (black, its alpha that white
 * times `gain`).
 * @param {THREE.Texture} map
 */
export function blurMaterial(map) {
	const dir = uniform(new THREE.Vector2()), gain = uniform(0);
	const tap = (o) => {
		const c = drawn(map, uv().add(dir.mul(o)));
		return select(gain.greaterThan(0), vec4(0, 0, 0, c.r.mul(gain).min(1).mul(c.a)), c);
	};
	const W = [0.1633, 0.1531, 0.12245, 0.0918, 0.051];
	let sum = tap(0).mul(W[0]);
	for (let i = 1; i < 5; i++) sum = sum.add(tap(i).add(tap(-i)).mul(W[i]));
	const m = new NodeMaterial();
	m.fragmentNode = sum;
	m.depthTest = false;
	m.blur = { dir, gain };
	m.isKit = true;
	return m;
}

/** the contact shadow's pool on the floor: `color`, its darkness the alpha of `map` */
export function poolMaterial(map, color, opacity) {
	const m = new MeshBasicNodeMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
	m.opacityNode = drawn(map).a.mul(materialOpacity);
	m.isKit = true;
	return m;
}

/** a sky's colour on the horizon behind a way looked: its ring of 16 colours ($content/sandbox-kit/sky.js `horizon`) */
const horizonOf = (dir, ring) => {
	const f = fract(atan(dir.z, dir.x).div(Math.PI * 2).add(1)).mul(16), k = int(f);
	return mix(ring.element(k), ring.element(k.add(1).mod(16)), fract(f));
};

/**
 * The stage's floor: running out into `bg` (or, under a `sky`, the horizon's own colour behind it as the eye sees it)
 * between `fade.x` and `fade.y` metres from the centre.
 * @param {THREE.MeshStandardMaterialParameters} o @param {THREE.Color} bg @param {THREE.Vector2} fade @param {any} [sky] the sky's `horizon`
 */
export function floorMaterial(o, bg, fade, sky) {
	const m = new (ours(MeshStandardNodeMaterial))(o);
	const fr = smoothstep(fade.x, fade.y, length(positionWorld.xz));
	const far = sky ? horizonOf(normalize(vec3(positionWorld.x.sub(cameraPosition.x), 0, positionWorld.z.sub(cameraPosition.z)).add(vec3(1e-5, 0, 0))), uniformArray(sky.uniforms.uSkyRing.value, 'vec3')) : uniform(bg);
	m.outputNode = vec4(mix(output.rgb, far, fr), output.a);
	return m;
}
