Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let three = require("three");
three = __toESM(three, 1);
let three_addons_utils_BufferGeometryUtils_js = require("three/addons/utils/BufferGeometryUtils.js");
three_addons_utils_BufferGeometryUtils_js = __toESM(three_addons_utils_BufferGeometryUtils_js, 1);
let three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");

//#region src/lib/actors/dqs.ts
const PARS = `
#ifdef USE_SKINNING
	vec4 dqQuat( mat3 m ) {
		float tr = m[0][0] + m[1][1] + m[2][2];
		if ( tr > 0.0 ) {
			float s = sqrt( tr + 1.0 ) * 2.0;
			return vec4( ( m[1][2] - m[2][1] ) / s, ( m[2][0] - m[0][2] ) / s, ( m[0][1] - m[1][0] ) / s, 0.25 * s );
		} else if ( m[0][0] > m[1][1] && m[0][0] > m[2][2] ) {
			float s = sqrt( 1.0 + m[0][0] - m[1][1] - m[2][2] ) * 2.0;
			return vec4( 0.25 * s, ( m[1][0] + m[0][1] ) / s, ( m[2][0] + m[0][2] ) / s, ( m[1][2] - m[2][1] ) / s );
		} else if ( m[1][1] > m[2][2] ) {
			float s = sqrt( 1.0 + m[1][1] - m[0][0] - m[2][2] ) * 2.0;
			return vec4( ( m[1][0] + m[0][1] ) / s, 0.25 * s, ( m[2][1] + m[1][2] ) / s, ( m[2][0] - m[0][2] ) / s );
		}
		float s = sqrt( 1.0 + m[2][2] - m[0][0] - m[1][1] ) * 2.0;
		return vec4( ( m[2][0] + m[0][2] ) / s, ( m[2][1] + m[1][2] ) / s, 0.25 * s, ( m[0][1] - m[1][0] ) / s );
	}
	// a bone's matrix into the blend: its rotation (real part), its translation (dual part), its size
	void dqAdd( mat4 b, float w, vec4 first, inout vec4 real, inout vec4 dual, inout float size ) {
		if ( w <= 0.0 ) return;
		float s = length( b[0].xyz );
		vec4 q = dqQuat( mat3( b[0].xyz / s, b[1].xyz / s, b[2].xyz / s ) );
		vec3 t = b[3].xyz;
		vec4 d = 0.5 * vec4( t * q.w + cross( t, q.xyz ), - dot( t, q.xyz ) );
		float k = dot( q, first ) < 0.0 ? - w : w;
		real += k * q;
		dual += k * d;
		size += w * s;
	}
	vec3 dqTurn( vec4 q, vec3 v ) { return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }
#endif
`;
const BASE = `
#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
	vec4 dqReal = vec4( 0.0 ), dqDual = vec4( 0.0 );
	float dqSize = 0.0;
	{
		mat4 bx = boneMatX;
		float s0 = length( bx[0].xyz );
		vec4 first = dqQuat( mat3( bx[0].xyz / s0, bx[1].xyz / s0, bx[2].xyz / s0 ) );
		dqAdd( boneMatX, skinWeight.x, first, dqReal, dqDual, dqSize );
		dqAdd( boneMatY, skinWeight.y, first, dqReal, dqDual, dqSize );
		dqAdd( boneMatZ, skinWeight.z, first, dqReal, dqDual, dqSize );
		dqAdd( boneMatW, skinWeight.w, first, dqReal, dqDual, dqSize );
		float total = max( skinWeight.x + skinWeight.y + skinWeight.z + skinWeight.w, 1e-5 );
		dqSize /= total;
		float len = max( length( dqReal ), 1e-6 );
		dqReal /= len;
		dqDual /= len;
	}
	vec3 dqMove = 2.0 * ( dqReal.w * dqDual.xyz - dqDual.w * dqReal.xyz + cross( dqReal.xyz, dqDual.xyz ) );
#endif
`;
const NORMAL = `
#ifdef USE_SKINNING
	objectNormal = ( bindMatrixInverse * vec4( dqTurn( dqReal, ( bindMatrix * vec4( objectNormal, 0.0 ) ).xyz ), 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = ( bindMatrixInverse * vec4( dqTurn( dqReal, ( bindMatrix * vec4( objectTangent, 0.0 ) ).xyz ), 0.0 ) ).xyz;
	#endif
#endif
`;
const VERTEX = `
#ifdef USE_SKINNING
	vec3 skinVertex = ( bindMatrix * vec4( transformed, 1.0 ) ).xyz;
	transformed = ( bindMatrixInverse * vec4( dqTurn( dqReal, skinVertex * dqSize ) + dqMove, 1.0 ) ).xyz;
#endif
`;
let installed = false;
/** Every skinned mesh from here on skins by dual quaternions. */
function dualQuaternionSkinning() {
	if (installed) return;
	installed = true;
	const chunks = three.ShaderChunk;
	chunks.skinning_pars_vertex = chunks.skinning_pars_vertex + PARS;
	chunks.skinbase_vertex = BASE;
	chunks.skinnormal_vertex = NORMAL;
	chunks.skinning_vertex = VERTEX;
}

//#endregion
//#region src/lib/actors/rig.ts
function rig(bones, parts, materials) {
	dualQuaternionSkinning();
	const byName = {};
	const at = {};
	const parent = {};
	const list = [];
	for (const b of bones) {
		const bone = new three.Bone();
		bone.name = b.name;
		at[b.name] = new three.Vector3(...b.at);
		parent[b.name] = b.parent;
		if (b.parent) {
			bone.position.copy(at[b.name]).sub(at[b.parent]);
			byName[b.parent].add(bone);
		} else bone.position.copy(at[b.name]);
		byName[b.name] = bone;
		list.push(bone);
	}
	const index = new Map(list.map((b, i) => [b.name, i]));
	const v = new three.Vector3(), d = new three.Vector3(), q = new three.Vector3();
	const weigh = (p, out) => {
		out.clear();
		if (p.weights) {
			for (const [name, x] of p.weights(v)) out.set(name, (out.get(name) ?? 0) + x);
			return;
		}
		if (!p.chain) return void out.set(p.bone, 1);
		const { bones: names, soft = .05, tip } = p.chain;
		const ends = names.map((n, i) => {
			if (i < names.length - 1) return at[names[i + 1]];
			if (tip) return new three.Vector3(...tip);
			const prev = i > 0 ? at[names[i - 1]] : at[parent[n]] ?? at[n].clone().add(new three.Vector3(0, -.1, 0));
			return at[n].clone().multiplyScalar(2).sub(prev);
		});
		let best = 0, bestD = Infinity, bestS = 0, bestLen = 1;
		names.forEach((n, i) => {
			const a = at[n], b = ends[i];
			d.subVectors(b, a);
			const len = Math.max(1e-6, d.length());
			const s = three.MathUtils.clamp(q.subVectors(v, a).dot(d) / len, 0, len);
			const dist = q.copy(a).addScaledVector(d, s / len).distanceTo(v);
			if (dist < bestD - 1e-9) [best, bestD, bestS, bestLen] = [
				i,
				dist,
				s,
				len
			];
		});
		const own = names[best];
		const k = Math.min(soft, bestLen / 2);
		const back = best > 0 ? names[best - 1] : parent[own];
		const next = names[best + 1];
		const wBack = back && bestS < k ? .5 - .5 * bestS / k : 0;
		const wNext = next && bestLen - bestS < k ? .5 - .5 * (bestLen - bestS) / k : 0;
		out.set(own, 1 - wBack - wNext);
		if (wBack) out.set(back, (out.get(back) ?? 0) + wBack);
		if (wNext) out.set(next, (out.get(next) ?? 0) + wNext);
	};
	const w = /* @__PURE__ */ new Map(), c = new three.Color();
	const geoOf = (p) => "skin" in p ? p.skin.geo : p.geo;
	if (DETAIL < 1) {
		const size = (p) => {
			const g = geoOf(p);
			return (g.boundingSphere ?? (g.computeBoundingSphere(), g.boundingSphere)).radius;
		};
		const largest = Math.max(...parts.map(size));
		parts = parts.filter((p) => size(p) >= largest * .12);
	}
	const geos = parts.map((p) => {
		if ("skin" in p) {
			const g = p.skin.geo.clone(), n = g.attributes.position.count;
			const si = new Uint16Array(n * 4);
			const ids = p.skin.bones.map((name) => {
				if (!index.has(name)) throw new Error(`skin: no bone ${name}`);
				return index.get(name);
			});
			for (let i = 0; i < n * 4; i++) si[i] = ids[p.skin.index[i]] ?? 0;
			g.setAttribute("skinIndex", new three.Uint16BufferAttribute(si, 4));
			g.setAttribute("skinWeight", new three.Float32BufferAttribute(p.skin.weight.slice(), 4));
			return g;
		}
		const g = p.geo.clone();
		if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
		for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
		if (!g.attributes.normal) g.computeVertexNormals();
		const pos = g.attributes.position, n = pos.count;
		const color = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			v.fromBufferAttribute(pos, i);
			c.set(typeof p.color === "string" ? p.color : p.color(v, i));
			color[i * 3] = c.r;
			color[i * 3 + 1] = c.g;
			color[i * 3 + 2] = c.b;
			weigh(p, w);
			const top = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4);
			const sum = top.reduce((s, [, x]) => s + x, 0) || 1;
			top.forEach(([name, x], k) => {
				si[i * 4 + k] = index.get(name) ?? 0;
				sw[i * 4 + k] = x / sum;
			});
		}
		g.setAttribute("color", new three.BufferAttribute(color, 3));
		g.setAttribute("skinIndex", new three.Uint16BufferAttribute(si, 4));
		g.setAttribute("skinWeight", new three.Float32BufferAttribute(sw, 4));
		return g;
	});
	const morphs = [...new Set(parts.flatMap((p) => "morph" in p && p.morph ? Object.keys(p.morph) : []))];
	if (morphs.length) geos.forEach((g, i) => {
		const p = parts[i], n = g.attributes.position.count;
		g.morphAttributes.position = morphs.map((name) => {
			const d = "morph" in p ? p.morph?.[name] : void 0;
			const a = new three.Float32BufferAttribute(d && d.length === n * 3 ? d : new Float32Array(n * 3), 3);
			a.name = name;
			return a;
		});
		g.morphTargetsRelative = true;
	});
	const geometry = (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos, true);
	geometry.groups.forEach((grp, i) => grp.materialIndex = parts[i].mat ?? 0);
	if (morphs.length) {
		geometry.morphTargetsRelative = true;
		geometry.morphAttributes.position.forEach((a, i) => a.name = morphs[i]);
	}
	const mesh = new three.SkinnedMesh(geometry, materials);
	mesh.add(list[0]);
	mesh.updateMatrixWorld(true);
	mesh.bind(new three.Skeleton(list));
	mesh.castShadow = mesh.receiveShadow = true;
	mesh.frustumCulled = false;
	return {
		object: mesh,
		bones: byName,
		names: list.map((b) => b.name),
		pose: poser(list),
		parts: parts.map((p) => "skin" in p ? void 0 : p.part)
	};
}
/** How to pose these bones (a rig's, or a clone's): from where they rest now, each turned as a pose says. */
function poser(list) {
	const byName = Object.fromEntries(list.map((b) => [b.name, b]));
	const rest = list.map((b) => b.position.clone());
	const move = new three.Vector3();
	return (p) => {
		list.forEach((b, i) => {
			b.position.copy(rest[i]);
			b.rotation.set(0, 0, 0);
			b.scale.setScalar(1);
		});
		for (const name in p) {
			const t = p[name];
			if (!t) continue;
			if (name === "root") list[0].position.add(move.set(t[0], t[1], t[2]));
			else {
				const b = byName[name];
				if (!b) continue;
				b.rotation.set(t[0], t[1], t[2]);
				if (t.length >= 4) b.scale.setScalar(t[3]);
				if (t.length === 7) b.position.add(move.set(t[4], t[5], t[6]));
			}
		}
	};
}
/** How finely shapes are made: 1 as built; lower for actors seen from afar (`lowDetail`). */
let DETAIL = 1;
/** A material for an actor: its colours in its vertices. */
const skin = (roughness = .8, more = {}) => new three.MeshStandardMaterial({
	vertexColors: true,
	roughness,
	...more
});
/** A loop over `period` seconds: 0…1. */
const loop = (t, period) => (t / period % 1 + 1) % 1;

//#endregion
//#region src/lib/actors/excavator-rig.js
/** a box w × h × len from a to b, turned along the line */
/** @param {V3} a @param {V3} b @param {number} w @param {number} h @param {number} [r] */
function beam(a, b, w, h, r = .02) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, A.distanceTo(B), 2, Math.min(r, w / 2, h / 2));
	g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 0, 1), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
	return g;
}
/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}
/** smoothly from 0 to 1 @param {number} x */
const ease$1 = (x) => x * x * (3 - 2 * x);

//#endregion
//#region src/lib/actors/parts.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./rig').BoneSpec} BoneSpec */
/**
* @typedef {object} Assembly a group of parts that is built and works together (the frame, a wheel module, the power cube)
* @property {string} id
* @property {string} label
* @property {string} note what it is and does, in a sentence or two
* @property {V3} out which way it is drawn out of the machine in the exploded view (m)
*/
/**
* @typedef {object} PartInfo one part's card
* @property {string} id
* @property {string} label
* @property {string} assembly its assembly's id
* @property {string} what what it is and what it is for
* @property {string} [moves] how it moves (a part that does not move has none)
* @property {string} [drive] what moves it, or what it drives
* @property {[string, string][]} [specs] its numbers, as label and value
* @property {number} [count] how many of it the machine has, where one card stands for several alike
* @property {number} step the build step it goes on at (1 first)
* @property {string} [source] where its numbers come from (a source's label in the catalog)
* @property {string} [unit] a unit it comes in with, already built (the Power Cube in the LifeTrac): in the build,
*   all of a unit's parts arrive together, as one
* @property {string} [ref] the asset it came with, at its version, when it was carried in from another
*   (`machines/powercube@3`, $lib/assets)
*/
/**
* @typedef {object} Catalog a machine's parts: its assemblies, its parts' cards, its build steps and its sources
* @property {Assembly[]} assemblies
* @property {PartInfo[]} parts
* @property {string[]} steps the build steps, in order: what each does
* @property {{ label: string, url: string }[]} sources
*/
/**
* A kit to build a machine of parts.
* @param {Assembly[]} assemblies
*/
function machineKit(assemblies) {
	/** @type {PartInfo[]} */
	const infos = [];
	/** @type {Map<string, { info: PartInfo, joint: string, pieces: { geo: THREE.BufferGeometry, color: string, mat?: number }[] }>} */
	const byId = /* @__PURE__ */ new Map();
	const out = Object.fromEntries(assemblies.map((a) => [a.id, a.out]));
	return {
		/**
		* A part: its card, the joint it moves with, and its pieces (made by `make`, through `put`).
		* @param {Omit<PartInfo, 'step'> & { step: number }} info
		* @param {string} joint
		* @param {(put: (geo: THREE.BufferGeometry, color: string, mat?: number) => void) => void} make
		*/
		part(info, joint, make) {
			if (byId.has(info.id)) throw new Error(`part ${info.id} twice`);
			if (!(info.assembly in out)) throw new Error(`part ${info.id}: no assembly ${info.assembly}`);
			/** @type {{ geo: THREE.BufferGeometry, color: string, mat?: number }[]} */
			const pieces = [];
			make((geo, color, mat) => void pieces.push({
				geo,
				color,
				...mat ? { mat } : {}
			}));
			byId.set(info.id, {
				info,
				joint,
				pieces
			});
			infos.push(info);
		},
		/**
		* The parts' bones (to go after the joints they hang from) and pieces, and how to pose them.
		* @returns {{ bones: BoneSpec[], pieces: Piece[], catalogParts: PartInfo[], centre: Record<string, V3> }}
		*/
		build() {
			/** @type {BoneSpec[]} */
			const bones = [];
			/** @type {Piece[]} */
			const pieces = [];
			/** @type {Record<string, V3>} */
			const centre = {};
			const box = new three.Box3(), b = new three.Box3(), c = new three.Vector3();
			for (const [id, { joint, pieces: ps }] of byId) {
				box.makeEmpty();
				for (const p of ps) {
					p.geo.computeBoundingBox();
					box.union(b.copy(p.geo.boundingBox));
				}
				const at = box.getCenter(c).toArray();
				centre[id] = at;
				const bone = `p.${id}`;
				bones.push({
					name: bone,
					parent: joint,
					at
				});
				for (const p of ps) pieces.push({
					geo: p.geo,
					color: p.color,
					bone,
					part: id,
					...p.mat ? { mat: p.mat } : {}
				});
			}
			return {
				bones,
				pieces,
				catalogParts: infos,
				centre
			};
		},
		/**
		* Every part drawn out of the machine by `k` (0: in place, 1: the exploded view): its assembly's way out, and
		* apart from the assembly's middle a little, so the parts of one assembly stand clear of each other too.
		* @param {Record<string, V3>} centre @param {number} k @param {Pose} [into]
		*/
		explode(centre, k, into = {}) {
			/** @type {Record<string, THREE.Vector3>} */
			const mid = {};
			/** @type {Record<string, number>} */
			const n = {};
			for (const { info } of byId.values()) {
				const a = info.assembly;
				(mid[a] ??= new three.Vector3()).add(pc.set(...centre[info.id]));
				n[a] = (n[a] ?? 0) + 1;
			}
			for (const a in mid) mid[a].divideScalar(n[a]);
			for (const { info } of byId.values()) {
				const o = out[info.assembly], m = mid[info.assembly];
				const [x, y, z] = centre[info.id];
				into[`p.${info.id}`] = [
					0,
					0,
					0,
					1,
					k * (o[0] + (x - m.x) * .45),
					k * (o[1] + (y - m.y) * .45),
					k * (o[2] + (z - m.z) * .45)
				];
			}
			return into;
		},
		/**
		* The machine being built, `u` of the way (0…1) through its steps: the parts of each step fly in from above
		* their place, one after another, and the parts of the steps to come are not there yet.
		* @param {Record<string, V3>} centre @param {number} u @param {number} steps @param {Pose} [into]
		*/
		assemble(centre, u, steps, into = {}) {
			const key = (info) => info.unit ?? info.id;
			/** @type {Record<number, string[]>} */
			const per = {};
			for (const info of infos) {
				const list = per[info.step] ??= [];
				if (!list.includes(key(info))) list.push(key(info));
			}
			for (const info of infos) {
				const list = per[info.step], i = list.indexOf(key(info));
				const s0 = (info.step - 1) / steps, s1 = info.step / steps;
				const t0 = s0 + (s1 - s0) * .66 * i / Math.max(1, list.length);
				const t1 = t0 + (info.unit ? (s1 - s0) * .5 : Math.min(.03, (s1 - s0) * .5));
				const k = Math.min(1, Math.max(0, (u - t0) / (t1 - t0)));
				const e = k * k * (3 - 2 * k);
				const o = out[info.assembly];
				const far = 1 - e;
				into[`p.${info.id}`] = u < t0 ? [
					0,
					0,
					0,
					0
				] : [
					0,
					0,
					0,
					1,
					far * o[0] * .6,
					far * (1.6 + Math.abs(o[1])),
					far * o[2] * .6
				];
			}
			return into;
		}
	};
}
const pc = /* @__PURE__ */ (() => new three.Vector3())();

//#endregion
//#region src/lib/actors/powercube.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Cast} Cast */
/** @typedef {import('./rig').BoneSpec} BoneSpec */
/** @typedef {[number, number, number]} MM a point of the cube: x across, y forward, z up (mm) */
/** @typedef {string} Group an assembly of a cube: frame, engine, hydraulics, controls, or a cube's own */
const S = .001;
/** the cube's size: 27" each way (W across, L along, H high), the 4×4 base's height */
const CUBE$1 = {
	W: 686,
	L: 660,
	H: 686,
	base: 101.6
};
/** the crank's height and the shaft's line (x 0), the flywheel's y, the coupling's, the cooler fan's place */
const CRANK$1 = 235;
const FLY = 262;
const CPL = -168;
const FAN = [
	360,
	-40,
	230
];
const RED = "#c8372d";
const FRAME = "#c8372d";
const STEEL = "#8d9396";
const DARK = "#2b2d2f";
const ENGINE$1 = "#2f3133";
const BLACK = "#161718";
const ALU = "#b9bdbf";
const HOSE = "#202224";
const BRASS = "#c9a03a";
const YELLOW = "#f0c419";
const GREEN = "#2c7a4a";
const POWERCUBE_SOURCES = [
	{
		label: "Power Cube VII (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube_VII"
	},
	{
		label: "Power Cube 7s (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube_7s"
	},
	{
		label: "Power Cube v15.6 (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube_v15.6"
	},
	{
		label: "Power Cube Genealogy (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube_Genealogy"
	},
	{
		label: "Power Cube (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube"
	},
	{
		label: "Power Cube (OSE portfolio)",
		url: "https://www.opensourceecology.org/portfolio/power-cube/"
	},
	{
		label: "Power Cube fabrication manual (v4)",
		url: "https://commons.wikimedia.org/wiki/File:Open_Source_Ecology_-_Powercube_-_Fabricaion_Manual.pdf"
	}
];
const SRC$1 = {
	vii: "Power Cube VII (OSE wiki)",
	s7: "Power Cube 7s (OSE wiki)",
	v156: "Power Cube v15.6 (OSE wiki)",
	port: "Power Cube (OSE portfolio)",
	man: "Power Cube fabrication manual (v4)"
};
/** the cube on its own: its assemblies and its build steps */
const OWN = [
	{
		id: "frame",
		label: "Frame",
		note: "A 27\" cube: two 4×4 tube skids carry everything and take the lifting pins; 2×2 angle posts and top rails close it, and its quick-attach plate couples it to a machine.",
		out: [
			0,
			-.04,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "A 28 hp Briggs & Stratton air-cooled V-twin with electric start, on its mount plate: the prime mover of every machine the cube is coupled to.",
		out: [
			0,
			.45,
			.12
		]
	},
	{
		id: "hydraulics",
		label: "Hydraulics",
		note: "The gear pump on the engine’s shaft, the 7-gallon reservoir, the relief valve and gauge, the six-tube cooler, the return filter and the two quick couplers out.",
		out: [
			0,
			.22,
			-.5
		]
	},
	{
		id: "controls",
		label: "Fuel and controls",
		note: "The removable 7-gallon fuel tank, the 12 V battery and the panel with the key, the choke and the throttle.",
		out: [
			-.5,
			.35,
			.2
		]
	}
];
const OWN_STEPS = [
	"Cut, drill and bolt the frame: skids, posts, top rails, quick-attach plate",
	"Bolt in the engine on its mount plate",
	"Mount the pump and coupling; fit the reservoir, filter, relief, gauge, cooler, couplers and hoses",
	"Fit the fuel tank, the battery and the control panel"
];
const STEP_OF = {
	frame: 1,
	engine: 2,
	hydraulics: 3,
	controls: 4
};
/**
* Add a Power Cube's parts to a machine's kit, its foot's middle at `at` (actor metres), its front towards +z.
* Its moving parts ride the joints named in `joints` (flywheel, coupling, fan: bones the caller makes at the points
* `powerCubeJoints` gives); every other part rides `base`. With `unit`, the cube goes into the machine's build already
* built, all its parts at once.
* @param {ReturnType<typeof machineKit>} kit
* Another cube on the same frame gives its own `insides` in place of the hydraulics, its own length (`len`, mm), and
* leaves out the engine or the fuel and controls it has none of.
* @param {{ at: V3, base: string, joints: { flywheel: string, coupling: string, fan: string }, assembly: (g: Group) => string, step: (g: Group) => number, prefix?: string, unit?: string, len?: number, engine?: boolean, controls?: boolean, insides?: Insides }} o
*/
function powerCubeParts(kit, { at, base, joints, assembly, step, prefix = "pc-", unit, len = CUBE$1.L, engine = true, controls = true, insides }) {
	const m = new three.Matrix4().makeTranslation(...at);
	/** a point of the cube (mm) in the actor @param {number} x @param {number} y @param {number} z @returns {V3} */
	const L = (x, y, z) => [
		x * S,
		z * S,
		y * S
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 2) => T(block(w * S, h * S, l * S, L(x, y, z), r * S));
	const bar = (a, b, w, h, r = 2) => T(beam(L(...a), L(...b), w * S, h * S, r * S));
	/** @param {MM} a @param {MM} b @param {number} r @param {number} [seg] @param {number} [r1] */
	const cyl = (a, b, r, seg = 18, r1 = r) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
		const g = new three.CylinderGeometry(r1 * S, r * S, A.distanceTo(B), seg);
		g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
		return T(g);
	};
	const hose = (pts, r = 9.5) => T(new three.TubeGeometry(new three.CatmullRomCurve3(pts.map((p) => new three.Vector3(...L(...p)))), 24, r * S, 8, false));
	/** an angle (L) along a line, its legs `leg` mm, turned so its outside corner is at `corner` (±x, ±y) */
	const angle = (a, b, sx, sy, leg = 50.8, t = 6.35) => {
		const out = [];
		if (a[0] === b[0] && a[1] === b[1]) {
			out.push(bar([
				a[0] - sx * (leg / 2 - leg / 2),
				a[1] - sy * (leg / 2),
				a[2]
			], [
				b[0],
				b[1] - sy * (leg / 2),
				b[2]
			], t, leg).translate(sx * (-t / 2) * S, 0, 0));
			out.push(box(a[0] - sx * (leg / 2), a[1] - sy * (t / 2), (a[2] + b[2]) / 2, leg, t, b[2] - a[2], 1));
		} else out.push(bar(a, b, t, leg, 1), bar([
			a[0],
			a[1],
			a[2] - leg / 2 + t / 2
		], [
			b[0],
			b[1],
			b[2] - leg / 2 + t / 2
		], leg, t, 1));
		return out;
	};
	const LEN = len;
	const W = CUBE$1.W / 2, Lh = LEN / 2, H = CUBE$1.H, B = CUBE$1.base;
	const id = (s) => `${prefix}${s}`;
	/** @param {Group} g @param {Omit<import('./parts.js').PartInfo, 'assembly' | 'step'>} info @param {string} joint @param {(put: (geo: THREE.BufferGeometry, color: string, mat?: number) => void) => void} make */
	const part = (g, info, joint, make) => kit.part({
		...info,
		id: id(info.id),
		assembly: assembly(g),
		step: step(g),
		...unit ? { unit } : {}
	}, joint, make);
	part("frame", {
		id: "skids",
		label: "Power Cube base skids (4×4 tube)",
		count: 2,
		source: SRC$1.s7,
		what: "Two 4×4 steel tubes front to back under the cube: the “strong structural frame” of 7s that the engine, pump and tanks bolt to, and that takes the forks, the lifting pins or another cube stacked on it.",
		specs: [
			["Stock", "4\" × 4\" square tube (101.6 mm)"],
			["Length", "660 mm [inferred: the 27\" cube]"],
			["Version", "7s / v15.6 (VII: 2×2 angle)"]
		]
	}, base, (put) => {
		for (const sx of [-1, 1]) put(box(sx * (W - 50.8), 0, B / 2, 101.6, LEN, 101.6, 6), FRAME);
		for (const y of [-Lh + 40, Lh - 40]) put(box(0, y, B / 2, CUBE$1.W - 203, 50.8, 50.8, 3), FRAME);
	});
	part("frame", {
		id: "cage",
		label: "Power Cube posts and top rails (2×2 angle)",
		count: 8,
		source: SRC$1.vii,
		what: "Four corner posts and four top rails of 1/4\" × 2\" × 2\" angle make the cube’s cage: they guard the engine, carry the fuel tank and give hand-holds to lift it by. OSE’s frame page cuts its members 29\", 27\" and 24\" long.",
		specs: [
			["Stock", "1/4\" × 2\" × 2\" angle (6.35 × 50.8 × 50.8 mm)"],
			["Members", "29\", 27\" and 24\" pieces"],
			["Envelope", "27\" (686 mm) cube"]
		]
	}, base, (put) => {
		for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const g of angle([
			sx * (W - 3),
			sy * (Lh - 3),
			B
		], [
			sx * (W - 3),
			sy * (Lh - 3),
			H
		], sx, sy)) put(g, FRAME);
		for (const sx of [-1, 1]) for (const g of angle([
			sx * (W - 3),
			-Lh,
			H - 3
		], [
			sx * (W - 3),
			Lh,
			H - 3
		], sx, 0)) put(g, FRAME);
		for (const sy of [-1, 1]) for (const g of angle([
			-W,
			sy * (Lh - 3),
			H - 3
		], [
			W,
			sy * (Lh - 3),
			H - 3
		], 0, sy)) put(g, FRAME);
	});
	part("frame", {
		id: "quick-attach",
		label: "Power Cube quick-attach plate",
		source: SRC$1.man,
		what: "How the cube is coupled to a machine: plates across its back with a 4×8 receiver tube between them, so it slides onto the machine’s mount and is pinned, and comes off again in minutes for the next machine. Several cubes can be strung together for more power.",
		specs: [
			["Plates", "2 × 3/8\" × 4\" × 27\"; 2 × 1/4\" × 4\" × 8\""],
			["Receiver tube", "4\" × 8\" × 14½\""],
			["Strap", "1/4\" × 2\" × 24\""],
			["Source", "v4 fabrication manual"]
		]
	}, base, (put) => {
		for (const z of [B + 60, B + 220]) put(box(0, -Lh - 5, z, CUBE$1.W - 40, 9.5, 101.6, 2), STEEL);
		put(box(0, -Lh - 40, B + 140, 203, 70, 101.6, 6), STEEL);
		for (const sx of [-1, 1]) put(cyl([
			sx * 120,
			-Lh - 30,
			B + 270
		], [
			sx * 120,
			-Lh - 30,
			B + 330
		], 12, 10), STEEL);
	});
	part("frame", {
		id: "lift-eyes",
		label: "Power Cube lifting eyes",
		count: 2,
		source: SRC$1.vii,
		what: "Two eyes on the top rails: at about 181 kg the cube is lifted on and off a machine by the loader, a hoist or two people with a bar.",
		specs: [["Cube mass", "~400 lb (181 kg)"]]
	}, base, (put) => {
		for (const sx of [-1, 1]) {
			const g = new three.TorusGeometry(26 * S, 7 * S, 8, 16);
			put(T(g.translate(...L(sx * 180, 0, H + 26))), STEEL);
		}
	});
	if (engine) {
		part("engine", {
			id: "engine-plate",
			label: "Engine mount plate",
			source: SRC$1.vii,
			what: "The plate the engine’s base bolts to, itself bolted across the skids: it holds the engine’s shaft exactly in line with the pump’s.",
			specs: [["VII engine module plate", "8\" × 15½\" (203 × 394 mm)"], ["Generic mounts", "1/4\" × 8\" × 9\" and × 12\", welded at 90°"]]
		}, base, (put) => put(box(0, 40, B + 6, CUBE$1.W - 140, 394, 12, 2), STEEL));
		part("engine", {
			id: "crankcase",
			label: "Engine crankcase",
			source: SRC$1.vii,
			what: "The 28 hp Briggs & Stratton V-twin’s crankcase: crankshaft, camshaft, the oil sump and the governor that holds it at its speed. The crankshaft runs fore and aft: the flywheel at the front, the pump at the back.",
			moves: "The crankshaft inside turns at engine speed.",
			drive: "Petrol and air; electric start",
			specs: [
				["Engine", "Briggs & Stratton 28 hp (20.9 kW) V-twin, air-cooled"],
				["Displacement", "~810 cc [inferred: B&S 28 hp class]"],
				["Speed", "3,600 rpm governed"],
				["Start", "Electric"],
				["Older cubes", "27 hp (v12.11), 18 hp (Prototypes I–II)"]
			]
		}, base, (put) => {
			put(box(0, 30, 225, 250, 300, 240, 26), ENGINE$1);
			put(box(0, 30, B + 22, 300, 290, 20, 6), DARK);
			for (const sx of [-1, 1]) for (const y of [-90, 150]) put(cyl([
				sx * 170,
				y,
				B + 12
			], [
				sx * 170,
				y,
				B + 24
			], 11, 6), STEEL);
		});
		for (const [sx, side] of [[1, "left"], [-1, "right"]]) part("engine", {
			id: `cyl-${side}`,
			label: `Engine cylinder and head, ${side}`,
			source: SRC$1.vii,
			what: "One bank of the 90° V-twin: a finned air-cooled cylinder and its overhead-valve head. The flywheel’s fan pushes air through the shroud and over these fins.",
			moves: "Its piston runs up and down inside, twice per two turns of the crank.",
			drive: "Burning petrol and air",
			specs: [["Layout", "90° V-twin, OHV"], ["Cooling", "Air, by the flywheel fan"]]
		}, base, (put) => {
			const d = [sx * Math.SQRT1_2, Math.SQRT1_2];
			const at = (k) => [
				d[0] * k,
				30,
				235 + d[1] * k
			];
			put(cyl(at(100), at(250), 50, 18), DARK);
			for (let k = 112; k < 250; k += 13) put(cyl(at(k), at(k + 4), 70, 18), ENGINE$1);
			put(cyl(at(250), at(305), 68, 16), ENGINE$1);
			const g = block(.12, .04, .15, [
				0,
				0,
				0
			], .012);
			g.rotateZ(-sx * Math.PI / 4);
			g.translate(...L(...at(320)));
			put(T(g), BLACK);
		});
		part("engine", {
			id: "blower",
			label: "Blower housing",
			source: SRC$1.vii,
			what: "The shroud over the flywheel, ducting its fan’s air back over both cylinders.",
			specs: [["Material", "Pressed steel"]]
		}, base, (put) => put(box(0, 230, 265, 420, 60, 330, 28), "#3a3d40"));
		part("engine", {
			id: "flywheel",
			label: "Flywheel and fan screen",
			source: SRC$1.vii,
			what: "The flywheel at the crank’s front: its weight smooths the twin’s firing, its magnets fire the plugs and charge the battery, its vanes are the cooling fan.",
			moves: "Turns with the crankshaft (shown slowed: really 60 turns a second).",
			drive: "The crankshaft",
			specs: [["Speed", "3,600 rpm"], ["Charging", "Flywheel alternator"]]
		}, joints.flywheel, (put) => {
			put(cyl([
				0,
				258,
				235
			], [
				0,
				272,
				235
			], 115, 32), DARK);
			for (let k = 0; k < 6; k++) {
				const g = block(.22, .012, .006, [
					0,
					0,
					0
				], .002);
				g.rotateZ(k / 6 * Math.PI);
				g.translate(...L(0, 275, 235));
				put(T(g), STEEL);
			}
			put(cyl([
				0,
				272,
				235
			], [
				0,
				280,
				235
			], 28, 16), STEEL);
		});
		part("engine", {
			id: "air-cleaner",
			label: "Air cleaner",
			source: SRC$1.vii,
			what: "The paper element in the V between the cylinders: every litre of air the engine breathes is cleaned here first.",
			specs: [["Element", "Paper, foam pre-cleaner"]]
		}, base, (put) => {
			put(box(0, 50, 520, 210, 190, 56, 14), BLACK);
			put(cyl([
				0,
				50,
				548
			], [
				0,
				50,
				572
			], 76, 24), "#3a3d40");
		});
		part("engine", {
			id: "muffler",
			label: "Muffler",
			source: SRC$1.vii,
			what: "The Briggs & Stratton muffler behind the cylinders, collecting both exhausts into one can and blowing out to the side.",
			specs: [["Type", "B&S twin-inlet muffler"]]
		}, base, (put) => {
			put(cyl([
				-150,
				-110,
				470
			], [
				150,
				-110,
				470
			], 45, 18), "#505457");
			for (const sx of [-1, 1]) put(cyl([
				sx * 190,
				30,
				430
			], [
				sx * 110,
				-110,
				470
			], 9, 8), DARK);
		});
		part("engine", {
			id: "starter",
			label: "Electric starter",
			source: SRC$1.vii,
			what: "The 12 V starter whose pinion meshes with the flywheel’s ring gear while the key is held to START.",
			moves: "Spins only while starting.",
			drive: "The battery, through its solenoid",
			specs: [["Voltage", "12 V"]]
		}, base, (put) => {
			put(cyl([
				-150,
				120,
				150
			], [
				-150,
				230,
				150
			], 36, 16), DARK);
			put(cyl([
				-150,
				230,
				150
			], [
				-150,
				248,
				150
			], 20, 12), STEEL);
		});
	}
	if (insides) insides(part, {
		box,
		bar,
		cyl,
		hose,
		T,
		L,
		P: (x, y, z) => L(x, y, z).map((v, i) => v + at[i]),
		kit,
		W,
		Lh,
		H,
		B,
		joints,
		base
	});
	else hydraulics();
	function hydraulics() {
		part("hydraulics", {
			id: "coupling",
			label: "Shaft coupling",
			source: SRC$1.port,
			what: "Not a bought jaw coupling: OSE cut two coupling halves and welded them into one sleeve, keyed and set-screwed to the engine’s shaft, splined onto the pump’s 3/4\" shaft.",
			moves: "Turns with the engine (shown slowed).",
			drive: "The crankshaft; it drives the pump",
			specs: [
				["Engine side", "Keyed, set screws"],
				["Pump side", "3/4\" spline (11-tooth typical)"],
				["Made", "Two halves cut and welded"]
			]
		}, joints.coupling, (put) => {
			put(cyl([
				0,
				-208,
				235
			], [
				0,
				-128,
				235
			], 34, 18), STEEL);
			put(cyl([
				0,
				-171,
				235
			], [
				0,
				-165,
				235
			], 38, 18), "#c9b37a");
			for (const yy of [-190, -146]) put(cyl([
				0,
				yy,
				267
			], [
				0,
				yy,
				277
			], 6, 6), DARK);
		});
		part("hydraulics", {
			id: "pump-mount",
			label: "Pump mount",
			source: SRC$1.vii,
			what: "A plate on the engine plate holding the pump’s SAE-A flange square to the engine, its two bolts on 4.19\" centres, so the shafts stay in line.",
			specs: [["Flange", "SAE A: Ø3.25\" pilot, 2 × 3/8-16 on 4.19\""]]
		}, base, (put) => {
			put(box(0, -215, 185, 200, 12.7, 230, 4), STEEL);
			put(box(0, -170, B + 30, 200, 100, 12, 2), STEEL);
		});
		part("hydraulics", {
			id: "pump",
			label: "Hydraulic gear pump",
			source: SRC$1.port,
			what: "A fixed-displacement gear pump: two gears mesh and carry oil from the suction port round to the pressure port — about a cubic inch every turn, 15 gallons a minute at engine speed. This flow is everything the machine it is coupled to can do.",
			moves: "Its gears turn with the engine.",
			drive: "The engine, through the coupling",
			specs: [
				["Displacement", "~1 in³/rev (v4: 0.976 in³, 16.0 cm³)"],
				["Flow", "15.2 gpm (57.5 L/min) at 3,600 rpm"],
				["Pressure", "3,000 psi (207 bar) max"],
				["Shaft", "3/4\" spline"],
				["Earlier", "Hydreco pump (VI)"]
			]
		}, base, (put) => {
			put(box(0, -275, 235, 105, 100, 120, 10), "#3b4a5a");
			put(cyl([
				-52,
				-275,
				235
			], [
				-80,
				-275,
				235
			], 20, 12), STEEL);
			put(cyl([
				52,
				-275,
				235
			], [
				75,
				-275,
				235
			], 14, 12), STEEL);
		});
		part("hydraulics", {
			id: "reservoir",
			label: "Hydraulic reservoir (7 gal)",
			source: SRC$1.vii,
			what: "The oil tank across the back of the cube, removable for cleaning. The pump draws through a strainer at its bottom; returns come back in at its top, where the oil settles and lets go of its air. Earlier cubes used their tanks as members of the frame.",
			specs: [
				["Volume", "7 gal (26.5 L)"],
				["Oil", "Hydraulic AW oil"],
				["Removable", "Yes"]
			]
		}, base, (put) => {
			put(box(0, -Lh + 120, 450, CUBE$1.W - 40, 180, 200, 10), "#3d4447");
			put(box(-200, -Lh + 29, 440, 26, 4, 140, 3), "#9fd7ff");
		});
		part("hydraulics", {
			id: "strainer",
			label: "Suction strainer and line",
			source: SRC$1.vii,
			what: "A mesh strainer inside the reservoir’s outlet and the wide soft line down to the pump’s inlet: wide so the pump never starves and cavitates.",
			specs: [["Hose", "1\" suction"], ["Sight gauge", "Above the strainer"]]
		}, base, (put) => put(hose([
			[
				-150,
				-Lh + 170,
				360
			],
			[
				-140,
				-260,
				300
			],
			[
				-82,
				-275,
				235
			]
		], 15), HOSE));
		part("hydraulics", {
			id: "relief",
			label: "Relief valve",
			source: SRC$1.v156,
			what: "Added to the cube in October 2014: a spring-loaded valve that dumps the pump’s flow back to the tank when the pressure reaches its setting, so nothing bursts when a cylinder bottoms out or a wheel stalls.",
			moves: "Its poppet lifts only at its setting.",
			specs: [["Setting", "≤3,000 psi"], ["Added", "October 2014 (v15.6)"]]
		}, base, (put) => {
			put(box(110, -300, 325, 60, 50, 60, 4), ALU);
			put(cyl([
				110,
				-300,
				355
			], [
				110,
				-300,
				405
			], 13, 12), STEEL);
			put(hose([[
				75,
				-275,
				235
			], [
				110,
				-300,
				295
			]], 8), HOSE);
		});
		part("hydraulics", {
			id: "gauge",
			label: "Pressure gauge",
			source: SRC$1.v156,
			what: "A liquid-filled gauge on the pressure line, added in April 2015: the operator sees at a glance how hard the cube is working.",
			specs: [["Range", "0–5,000 psi"], ["Added", "April 2015 (v15.6)"]]
		}, base, (put) => {
			put(cyl([
				170,
				-Lh + 4,
				495
			], [
				170,
				-Lh - 22,
				495
			], 32, 24), STEEL);
			put(cyl([
				170,
				-Lh - 22,
				495
			], [
				170,
				-Lh - 25,
				495
			], 28, 24), "#f4f4ee");
		});
		part("hydraulics", {
			id: "cooler",
			label: "Oil cooler (six tubes)",
			source: SRC$1.v156,
			what: "v15.6’s cooler on the cube’s side: the returning oil runs through six finned tubes before the filter, giving the heat of every relief and orifice to the air.",
			specs: [["Type", "6-tube, fan-cooled"], ["Added", "v15.6"]]
		}, base, (put) => {
			for (let k = 0; k < 6; k++) put(cyl([
				W - 30,
				-200,
				140 + k * 36
			], [
				W - 30,
				120,
				140 + k * 36
			], 9, 10), ALU);
			for (let y = -190; y <= 110; y += 14) put(box(W - 30, y, 230, 26, 2, 200, .5), "#8e9496");
			put(box(W - 10, -40, 230, 8, 330, 230, 4), DARK);
		});
		part("hydraulics", {
			id: "cooler-fan",
			label: "Cooler fan",
			source: SRC$1.v156,
			what: "The 12 V fan pulling air through the cooler’s tubes.",
			moves: "Turns while the engine runs (shown slowed).",
			drive: "12 V from the battery",
			specs: [["Voltage", "12 V"]]
		}, joints.fan, (put) => {
			for (let k = 0; k < 5; k++) {
				const g = block(.006, .03, .09, [
					0,
					0,
					.05
				], .004);
				g.rotateX(k / 5 * Math.PI * 2);
				g.translate(...L(...FAN));
				put(T(g), BLACK);
			}
			put(cyl([
				FAN[0] - 10,
				FAN[1],
				FAN[2]
			], [
				FAN[0] + 14,
				FAN[1],
				FAN[2]
			], 24, 14), DARK);
		});
		part("hydraulics", {
			id: "filter",
			label: "Return filter",
			source: SRC$1.man,
			what: "A spin-on filter on the return line where it enters the reservoir: everything that comes back from the machine passes through it.",
			specs: [["Flow", "20 gpm (v4 BOM)"]]
		}, base, (put) => {
			put(cyl([
				150,
				-Lh + 120,
				550
			], [
				150,
				-Lh + 120,
				570
			], 44, 18), STEEL);
			put(cyl([
				150,
				-Lh + 120,
				570
			], [
				150,
				-Lh + 120,
				680
			], 46, 20), "#c33b2e");
		});
		part("hydraulics", {
			id: "breather",
			label: "Filler and breather cap",
			source: SRC$1.vii,
			what: "Where the reservoir is filled, and how it breathes as the machine’s cylinders draw oil out and give it back.",
			specs: [["Filter", "Air breather"]]
		}, base, (put) => {
			put(cyl([
				-60,
				-Lh + 120,
				550
			], [
				-60,
				-Lh + 120,
				575
			], 20, 14), STEEL);
			put(cyl([
				-60,
				-Lh + 120,
				575
			], [
				-60,
				-Lh + 120,
				605
			], 36, 18), BLACK);
		});
		part("hydraulics", {
			id: "couplers",
			label: "Quick couplers (pressure and return)",
			count: 2,
			source: SRC$1.man,
			what: "The cube’s whole connection to a machine: a pressure coupler and a return coupler on its back. Push the machine’s hoses on and the cube drives it; pull them off and it is free for the next one.",
			specs: [
				["Size", "3/4\" (v4 BOM)"],
				["Type", "Standard quick connect (ISO-A class) [inferred]"],
				["Hoses inside", "1/2\", 3/4\" and 1\" (VI)"]
			]
		}, base, (put) => {
			for (const [x, c] of [[230, RED], [290, "#2f6fb5"]]) {
				put(cyl([
					x,
					-Lh + 30,
					B + 150
				], [
					x,
					-Lh - 40,
					B + 150
				], 17, 14), BRASS);
				put(cyl([
					x,
					-Lh - 30,
					B + 150
				], [
					x,
					-Lh - 36,
					B + 150
				], 20, 14), c);
			}
			put(hose([
				[
					110,
					-300,
					375
				],
				[
					200,
					-Lh + 50,
					B + 200
				],
				[
					230,
					-Lh + 30,
					B + 150
				]
			], 9), HOSE);
			put(hose([
				[
					290,
					-Lh + 30,
					B + 150
				],
				[
					W - 30,
					-240,
					160
				],
				[
					W - 30,
					-200,
					140
				]
			], 9), HOSE);
			put(hose([
				[
					W - 30,
					120,
					320
				],
				[
					300,
					60,
					600
				],
				[
					150,
					-Lh + 120,
					690
				]
			], 9), HOSE);
		});
	}
	if (controls) {
		part("controls", {
			id: "fuel-tank",
			label: "Fuel tank (7 gal)",
			source: SRC$1.vii,
			what: "The removable petrol tank on top of the cube, over the engine: lift it off to fill it away from the machine.",
			specs: [
				["Volume", "7 gal (26.5 L)"],
				["Fuel", "Petrol (gasoline)"],
				["Removable", "Yes"]
			]
		}, base, (put) => {
			put(box(0, 90, 630, CUBE$1.W - 70, 400, 95, 14), RED);
			put(cyl([
				200,
				200,
				677
			], [
				200,
				200,
				700
			], 22, 14), BLACK);
			put(hose([
				[
					-200,
					260,
					590
				],
				[
					-220,
					250,
					400
				],
				[
					-130,
					150,
					330
				]
			], 4), BLACK);
		});
		part("controls", {
			id: "battery",
			label: "12 V battery",
			source: SRC$1.vii,
			what: "The cube’s own 12 V battery beside the engine: it cranks the starter, runs the cooler fan and the machine’s valves; the flywheel alternator charges it.",
			specs: [["Voltage", "12 V"], ["Charged by", "Flywheel alternator"]]
		}, base, (put) => {
			put(box(-260, 70, 205, 125, 240, 190, 6), BLACK);
			for (const [y, c] of [[-10, RED], [150, BLACK]]) put(cyl([
				-260,
				y,
				300
			], [
				-260,
				y,
				316
			], 9, 10), c);
		});
		part("controls", {
			id: "panel",
			label: "Control panel",
			source: SRC$1.vii,
			what: "On the front corner post: the key switch (off, run, start), the choke and the throttle. The cube is started here and left running; the machine’s valves do the rest.",
			moves: "Key, choke and throttle are worked by hand.",
			specs: [
				["Key", "Off / run / start"],
				["Choke", "Pull knob"],
				["Throttle", "Lever"]
			]
		}, base, (put) => {
			put(box(W - 60, Lh - 3, 470, 110, 6, 170, 4), DARK);
			put(cyl([
				W - 85,
				Lh,
				520
			], [
				W - 85,
				Lh + 18,
				520
			], 16, 14), STEEL);
			put(cyl([
				W - 40,
				Lh,
				520
			], [
				W - 40,
				Lh + 24,
				520
			], 9, 10), YELLOW);
			put(box(W - 60, Lh + 12, 420, 60, 20, 14, 3), GREEN);
		});
	}
}
/** @typedef {(geo: THREE.BufferGeometry, color: string, mat?: number) => void} Put */
/** @typedef {{ box: (x: number, y: number, z: number, w: number, l: number, h: number, r?: number) => THREE.BufferGeometry, bar: (a: MM, b: MM, w: number, h: number, r?: number) => THREE.BufferGeometry, cyl: (a: MM, b: MM, r: number, seg?: number, r1?: number) => THREE.BufferGeometry, hose: (pts: MM[], r?: number) => THREE.BufferGeometry, T: (g: THREE.BufferGeometry) => THREE.BufferGeometry, L: (x: number, y: number, z: number) => V3, P: (x: number, y: number, z: number) => V3, kit: ReturnType<typeof machineKit>, W: number, Lh: number, H: number, B: number, joints: { flywheel: string, coupling: string, fan: string }, base: string }} Tools what a cube's insides are drawn with: mm in the cube's frame */
/** @typedef {(part: (g: Group, info: any, joint: string, make: (put: Put) => void) => void, tools: Tools) => void} Insides */
/** where a Power Cube's moving joints are, its foot's middle at `at` @param {V3} at @returns {{ flywheel: V3, coupling: V3, fan: V3 }} */
function powerCubeJoints(at) {
	const L = (x, y, z) => [
		at[0] + x * S,
		at[1] + z * S,
		at[2] + y * S
	];
	return {
		flywheel: L(0, 262, 235),
		coupling: L(0, CPL, 235),
		fan: L(...FAN)
	};
}
/** the turns of a running cube's joints at time t (s): the engine (slowed to be seen) and the cooler's fan @param {number} t */
const powerCubeTurns = (t) => ({
	engine: t * 2 * Math.PI * 2.2,
	fan: t * 2 * Math.PI * 1.6
});
/**
* A cube on its own, every part its own: runs (an engine and fan turning, if it has them), off, is drawn apart, is
* built. `assemblies` and `steps` are its own; the rest is `powerCubeParts`' options.
* @param {{ name: string, assemblies: import('./parts.js').Assembly[], steps: string[], stepOf: Record<string, number>, sources?: { label: string, url: string }[], hums?: boolean, len?: number, engine?: boolean, controls?: boolean, insides?: Insides }} o
* @returns {Cast}
*/
function cubeCast({ name, assemblies, steps, stepOf, sources = POWERCUBE_SOURCES, hums = true, ...o }) {
	const kit = machineKit(assemblies);
	const at = [
		0,
		0,
		0
	];
	powerCubeParts(kit, {
		at,
		base: "base",
		joints: {
			flywheel: "flywheel",
			coupling: "coupling",
			fan: "fan"
		},
		assembly: (g) => g,
		step: (g) => stepOf[g] ?? 1,
		prefix: "",
		...o
	});
	const built = kit.build();
	const j = powerCubeJoints(at);
	/** @type {BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: [
				0,
				0,
				0
			]
		},
		{
			name: "flywheel",
			parent: "base",
			at: j.flywheel
		},
		{
			name: "coupling",
			parent: "base",
			at: j.coupling
		},
		{
			name: "fan",
			parent: "base",
			at: j.fan
		},
		...built.bones
	];
	const r = rig(bones, built.pieces, [skin(.55, { side: three.DoubleSide })]);
	r.object.name = name;
	/** @param {number} t @param {boolean} run @returns {Pose} */
	const pose = (t, run) => {
		const { engine, fan } = powerCubeTurns(run && hums ? t : 0);
		return {
			flywheel: [
				0,
				0,
				engine
			],
			coupling: [
				0,
				0,
				engine
			],
			fan: [
				fan,
				0,
				0
			],
			root: [
				0,
				run && hums ? Math.sin(t * 50) * 8e-4 : 0,
				0
			]
		};
	};
	return {
		rig: r,
		clips: {
			run: (t) => pose(t, true),
			off: () => pose(0, false),
			explode: (t) => {
				const u = loop(t, 8);
				const k = ease$1(Math.min(1, Math.max(0, (u - .05) / .3))) - ease$1(Math.min(1, Math.max(0, (u - .65) / .3)));
				return kit.explode(built.centre, k, pose(t, true));
			},
			assemble: (t) => {
				const n = steps.length, period = n * 2.6 + 3;
				const u = Math.min(1, loop(t, period) * (period / (n * 2.6)));
				return kit.assemble(built.centre, u, n, pose(t, u >= 1));
			}
		},
		poses: {
			off: pose(0, false),
			exploded: kit.explode(built.centre, 1, pose(0, false))
		},
		first: "run",
		catalog: {
			assemblies,
			parts: built.catalogParts,
			steps,
			sources
		}
	};
}
/** The Power Cube on its own (OSE's VII / 7s), every part its own. @returns {Cast} */
const powerCube$1 = () => cubeCast({
	name: "Power Cube",
	assemblies: OWN,
	steps: OWN_STEPS,
	stepOf: STEP_OF
});

//#endregion
//#region src/lib/assets/kit.js
require("f17f8358fd4bca21830facf59f17092bc9250f126123f848212da085a3789833");
//#endregion
//#region src/lib/assets/parts.js
const { castOf } = require("ccd99107fc32069ed80f956c2274b339fdb3758a8a535ea32f6cce97eac9a569");
//#endregion
//#region src/lib/machines/powercube.js
const { powerCube } = require("10d2e20903bec7fecdbdceb03c8f34115adfa8cbe5322779a4e123e0d2532dd4");
//#endregion
//#region src/lib/actors/electrocube.js
/** the ElectroCube's length (mm): at v1 900, the classic alternator needing more room than the pump and its tank;
*  from v2 the Power Cube's own, as every cube is */
const electroCubeL = (v = 2) => v >= 2 ? CUBE$1.L : 900;
/** @deprecated v1's length; `electroCubeL(v)` */
const ELECTROCUBE_L = 900;
/** its assemblies and steps: the Power Cube's, the hydraulics' place taken by the alternator and its sockets */
const ASSEMBLIES = /* @__PURE__ */ (() => OWN.map((a) => a.id === "hydraulics" ? {
	id: "electrics",
	label: "Electrics",
	note: "A brushless alternator flanged to the engine and turned by its shaft, its voltage regulator and breakers in a box on the back, and the sockets a home, a workshop or the village grid plugs into.",
	out: [
		0,
		.22,
		-.55
	]
} : a))();
const STEPS = /* @__PURE__ */ (() => OWN_STEPS.map((x, i) => i === 2 ? "Flange the alternator to the engine on its coupling; fit its feet, the control box, the sockets and the cable" : x))();
const ASSEMBLIES_2 = /* @__PURE__ */ (() => OWN.map((a) => a.id === "hydraulics" ? {
	id: "electrics",
	label: "Electrics",
	note: "A flat axial-flux generator on the engine’s shaft, where the pump was; the power converter on the back that turns its raw output into clean 400 V and 230 V; the breakers and the sockets a home, a workshop or the village grid plugs into.",
	out: [
		0,
		.22,
		-.45
	]
} : a))();
const STEPS_2 = /* @__PURE__ */ (() => OWN_STEPS.map((x, i) => i === 2 ? "Bolt the axial-flux generator to the engine on its adapter and coupling; fit its foot, the power converter, the sockets and the cables" : x))();
/** the ElectroCube's parts from v2: a flat axial-flux generator where the pump was, and a power converter on the
*  back, so it fits the 27" frame; all figures inferred (no OSE design exists) */
/** @type {import('./powercube.js').Insides} */
function electricsFlat(part, { box, cyl, hose, T, Lh, B, joints, base }) {
	const G0 = CPL - 50, G1 = G0 - 95;
	const SRC_E = "ElectroCube (our design)";
	part("electrics", {
		id: "coupling",
		label: "Flexible coupling",
		source: SRC_E,
		what: "A rubber-element coupling between the engine’s shaft and the generator’s rotor: it takes up the twin’s firing pulses so the rotor turns smoothly.",
		moves: "Turns with the engine (shown slowed).",
		drive: "The crankshaft; it drives the rotor",
		specs: [["Type", "Jaw coupling, rubber spider [inferred]"]]
	}, joints.coupling, (put) => {
		put(cyl([
			0,
			CPL - 40,
			235
		], [
			0,
			CPL + 40,
			235
		], 34, 18), STEEL);
		put(cyl([
			0,
			CPL - 6,
			235
		], [
			0,
			CPL + 6,
			235
		], 40, 18), BLACK);
		for (let k = 0; k < 8; k++) {
			const g = block(.006, .09, .02, [
				0,
				0,
				0
			], .003);
			g.rotateZ(k / 8 * Math.PI * 2);
			g.translate(0, 235 * S, (G1 - 14) * S);
			put(T(g), DARK);
		}
	});
	part("electrics", {
		id: "adapter",
		label: "Generator adapter",
		source: SRC_E,
		what: "A short cast ring bolted to the engine’s face and the generator’s front plate: it holds the two shafts in line, as the pump mount did.",
		specs: [["Length", "~50 mm"]]
	}, base, (put) => {
		put(cyl([
			0,
			CPL - 30,
			235
		], [
			0,
			G0,
			235
		], 105, 24, 112), "#5b6266");
	});
	part("electrics", {
		id: "alternator",
		label: "Axial-flux generator",
		source: SRC_E,
		what: "A flat “pancake” generator, the kind light electric aircraft and range extenders use: two rotor discs of permanent magnets turn either side of a stator of flat copper coils. Under 10 cm long, it fits where the pump was, so the ElectroCube keeps the 27\" frame. Its voltage rises and falls with the engine’s speed; the power converter makes it steady.",
		moves: "Its rotor turns with the engine.",
		drive: "The engine, through the coupling",
		specs: [
			["Power", "~15 kW continuous at 3,000–3,600 rpm [inferred: 20.9 kW engine]"],
			["Size", "⌀ 230 × 95 mm, ~12 kg [inferred]"],
			["Type", "Axial-flux, permanent magnet, air-cooled"],
			["Efficiency", "~95 % [inferred]"]
		]
	}, base, (put) => {
		put(cyl([
			0,
			G0,
			235
		], [
			0,
			G1,
			235
		], 115, 32), "#2f4d6e");
		for (const y of [G0 - 8, G1 + 8]) put(cyl([
			0,
			y,
			235
		], [
			0,
			y - 5,
			235
		], 118, 32), "#3c5f86");
		for (let k = 0; k < 12; k++) {
			const a = k / 12 * Math.PI * 2;
			put(cyl([
				Math.cos(a) * 108,
				G0 + 2,
				235 + Math.sin(a) * 108
			], [
				Math.cos(a) * 108,
				G1 - 2,
				235 + Math.sin(a) * 108
			], 4, 6), STEEL);
		}
		put(cyl([
			0,
			G1,
			235
		], [
			0,
			G1 - 6,
			235
		], 60, 24), "#5b6266");
		put(box(0, (G0 + G1) / 2, 235 + 128, 110, 60, 30, 5), "#2f4d6e");
	});
	part("electrics", {
		id: "feet",
		label: "Generator foot",
		source: SRC_E,
		what: "A steel foot under the generator, bolted to the skids’ cross member on rubber mounts; its front hangs on the engine.",
		specs: [["Mounts", "Rubber, anti-vibration"]]
	}, base, (put) => {
		put(box(0, (G0 + G1) / 2, (B + 235 - 115) / 2 + 20, 160, 60, 235 - 115 - B + 10, 3), STEEL);
		for (const sx of [-1, 1]) put(cyl([
			sx * 60,
			(G0 + G1) / 2,
			B + 6
		], [
			sx * 60,
			(G0 + G1) / 2,
			B + 14
		], 16, 10), BLACK);
	});
	part("electrics", {
		id: "control-box",
		label: "Power converter (rectifier and inverter)",
		source: SRC_E,
		what: "The box on the cube’s back: it rectifies the generator’s raw output and makes clean 400 V three-phase and 230 V at a steady 50 Hz from it, whatever the engine’s speed, so the engine can idle at light loads. With the main breaker, an earth-leakage breaker, an hour meter and a voltmeter.",
		specs: [
			["Power", "15 kVA [inferred]"],
			["Out", "400 V 3~ and 230 V, 50 Hz, pure sine"],
			["Protection", "Main breaker + 30 mA RCD"],
			["Meters", "Volts, hours"]
		]
	}, base, (put) => {
		put(box(-120, -Lh + 30, 470, 300, 60, 220, 8), DARK);
		for (let k = 0; k < 6; k++) put(box(-240 + k * 48, -Lh + 30, 590, 8, 50, 20, 1), STEEL);
		put(cyl([
			-200,
			-Lh,
			520
		], [
			-200,
			-Lh - 6,
			520
		], 30, 20), "#f4f4ee");
		put(box(-60, -Lh - 2, 520, 90, 6, 40, 3), BLACK);
	});
	part("electrics", {
		id: "sockets",
		label: "Sockets",
		count: 3,
		source: SRC_E,
		what: "What the cube gives out: a red three-phase socket for the village grid or a workshop, and two blue 230 V sockets for a home or tools, each under its spring lid.",
		specs: [["Three-phase", "400 V, 16 A (CEE red)"], ["Single phase", "2 × 230 V, 16 A (CEE blue)"]]
	}, base, (put) => {
		for (const [x, c] of [
			[150, RED],
			[215, "#2f6fb5"],
			[280, "#2f6fb5"]
		]) {
			put(box(x, -Lh + 4, 300, 56, 8, 56, 6), c);
			put(cyl([
				x,
				-Lh + 2,
				300
			], [
				x,
				-Lh - 30,
				300
			], 21, 14), c);
		}
	});
	part("electrics", {
		id: "cable",
		label: "Generator cable",
		source: SRC_E,
		what: "The armoured cable from the generator’s terminal box to the power converter, and on to the sockets.",
		specs: [["Cable", "5 × 4 mm², H07RN-F"]]
	}, base, (put) => {
		put(hose([
			[
				0,
				(G0 + G1) / 2,
				235 + 145
			],
			[
				-80,
				-Lh + 120,
				430
			],
			[
				-120,
				-Lh + 62,
				400
			]
		], 10), HOSE);
		put(hose([
			[
				-40,
				-Lh + 62,
				380
			],
			[
				120,
				-Lh + 40,
				330
			],
			[
				150,
				-Lh + 10,
				300
			]
		], 9), HOSE);
	});
}
/** the ElectroCube's own parts, where the Power Cube's hydraulics are: all figures inferred (no OSE design exists) */
/** @type {import('./powercube.js').Insides} */
function electrics(part, { box, cyl, hose, T, Lh, B, joints, base }) {
	const AX0 = CPL - 50, AX1 = -Lh + 40;
	const SRC_E = "ElectroCube (our design)";
	part("electrics", {
		id: "coupling",
		label: "Flexible coupling",
		source: SRC_E,
		what: "A rubber-element coupling between the engine’s shaft and the alternator’s rotor: it takes up the twin’s firing pulses so the rotor turns smoothly.",
		moves: "Turns with the engine (shown slowed).",
		drive: "The crankshaft; it drives the rotor",
		specs: [["Type", "Jaw coupling, rubber spider [inferred]"]]
	}, joints.coupling, (put) => {
		put(cyl([
			0,
			CPL - 40,
			235
		], [
			0,
			CPL + 40,
			235
		], 34, 18), STEEL);
		put(cyl([
			0,
			CPL - 6,
			235
		], [
			0,
			CPL + 6,
			235
		], 40, 18), BLACK);
		for (let k = 0; k < 8; k++) {
			const g = block(.006, .11, .03, [
				0,
				0,
				0
			], .003);
			g.rotateZ(k / 8 * Math.PI * 2);
			g.translate(0, 235 * S, (AX1 + 20) * S);
			put(T(g), DARK);
		}
	});
	part("electrics", {
		id: "adapter",
		label: "Alternator adapter (bell housing)",
		source: SRC_E,
		what: "An SAE bell housing bolted to the engine’s face and the alternator’s flange: it holds the two shafts in line, as the pump mount did.",
		specs: [["Flange", "SAE 5 / 6.5\" [inferred]"]]
	}, base, (put) => {
		put(cyl([
			0,
			CPL - 30,
			235
		], [
			0,
			AX0,
			235
		], 120, 24, 100), "#5b6266");
		put(box(0, -170, B + 30, 200, 100, 12, 2), STEEL);
	});
	part("electrics", {
		id: "alternator",
		label: "Brushless alternator",
		source: SRC_E,
		what: "A single-bearing, brushless synchronous alternator: its rotor turns inside the stator’s copper windings and gives alternating current at the engine’s governed speed. The 28 hp twin carries about 15 kVA of it.",
		moves: "Its rotor turns with the engine.",
		drive: "The engine, through the coupling",
		specs: [
			["Power", "~15 kVA (12 kW) continuous [inferred: 20.9 kW engine]"],
			["Output", "400 V three-phase and 230 V, 50 Hz at 3,000 rpm (60 Hz at 3,600)"],
			["Type", "Brushless, self-excited, single bearing"],
			["Cooling", "Its own fan, on the rotor"]
		]
	}, base, (put) => {
		put(cyl([
			0,
			AX0,
			235
		], [
			0,
			AX1,
			235
		], 128, 28), "#2f4d6e");
		for (let y = AX0 - 25; y > AX1 + 20; y -= 22) put(cyl([
			0,
			y,
			235
		], [
			0,
			y - 4,
			235
		], 131, 28), "#3c5f86");
		put(cyl([
			0,
			AX1,
			235
		], [
			0,
			AX1 - 18,
			235
		], 120, 28), "#5b6266");
		put(box(0, (AX0 + AX1) / 2, 235 + 150, 170, 160, 50, 6), "#2f4d6e");
	});
	part("electrics", {
		id: "feet",
		label: "Alternator foot",
		source: SRC_E,
		what: "A steel foot under the alternator’s end bell, bolted to the frame’s back cross member on rubber mounts; its flange end hangs on the engine.",
		specs: [["Mounts", "Rubber, anti-vibration"]]
	}, base, (put) => {
		put(box(0, AX1 + 15, 92, 220, 40, 32, 3), STEEL);
		for (const sx of [-1, 1]) put(cyl([
			sx * 80,
			AX1 + 15,
			76
		], [
			sx * 80,
			AX1 + 15,
			84
		], 18, 10), BLACK);
	});
	part("electrics", {
		id: "control-box",
		label: "Control box (regulator and breakers)",
		source: SRC_E,
		what: "The box on the cube’s back: the automatic voltage regulator that holds the voltage steady as loads come and go, the main breaker, an earth-leakage breaker, an hour meter and a voltmeter.",
		specs: [
			["Regulator", "AVR, ±1 %"],
			["Protection", "Main breaker + 30 mA RCD"],
			["Meters", "Volts, hours"]
		]
	}, base, (put) => {
		put(box(-120, -Lh + 30, 470, 300, 60, 220, 8), DARK);
		put(cyl([
			-200,
			-Lh,
			520
		], [
			-200,
			-Lh - 6,
			520
		], 30, 20), "#f4f4ee");
		put(box(-60, -Lh - 2, 520, 90, 6, 40, 3), BLACK);
	});
	part("electrics", {
		id: "sockets",
		label: "Sockets",
		count: 3,
		source: SRC_E,
		what: "What the cube gives out: a red three-phase socket for the village grid or a workshop, and two blue 230 V sockets for a home or tools, each under its spring lid.",
		specs: [["Three-phase", "400 V, 16 A (CEE red)"], ["Single phase", "2 × 230 V, 16 A (CEE blue)"]]
	}, base, (put) => {
		for (const [x, c] of [
			[60, RED],
			[140, "#2f6fb5"],
			[210, "#2f6fb5"]
		]) {
			put(box(x, -Lh + 4, 300, 64, 8, 64, 6), c);
			put(cyl([
				x,
				-Lh + 2,
				300
			], [
				x,
				-Lh - 30,
				300
			], 24, 14), c);
		}
	});
	part("electrics", {
		id: "cable",
		label: "Alternator cable",
		source: SRC_E,
		what: "The armoured cable from the alternator’s terminal box to the control box and sockets.",
		specs: [["Cable", "5 × 4 mm², H07RN-F"]]
	}, base, (put) => {
		put(hose([
			[
				0,
				(AX0 + AX1) / 2,
				235 + 175
			],
			[
				-80,
				-Lh + 120,
				520
			],
			[
				-120,
				-Lh + 60,
				470
			]
		], 10), HOSE);
		put(hose([
			[
				-120,
				-Lh + 60,
				400
			],
			[
				100,
				-Lh + 40,
				320
			],
			[
				140,
				-Lh + 10,
				300
			]
		], 9), HOSE);
	});
}
/** The ElectroCube on its own (version `v`: 1 the classic alternator, 900 mm long; 2 the axial-flux generator in the
* 27" cube), every part its own: it runs, stops, is drawn apart and built. @returns {import('./rig').Cast} */
const electroCube = (v = 2) => v >= 2 ? cubeCast({
	name: "ElectroCube",
	assemblies: ASSEMBLIES_2,
	steps: STEPS_2,
	stepOf: {
		frame: 1,
		engine: 2,
		electrics: 3,
		controls: 4
	},
	len: electroCubeL(v),
	insides: electricsFlat
}) : cubeCast({
	name: "ElectroCube",
	assemblies: ASSEMBLIES,
	steps: STEPS,
	stepOf: {
		frame: 1,
		engine: 2,
		electrics: 3,
		controls: 4
	},
	len: 900,
	insides: electrics
});

//#endregion
//#region src/lib/app/versions.js
/** @typedef {{ v: number, date: string, note: string }} Change one version: its number, when, what changed */
/**
* @template B
* @typedef {Change & { build: B, kept: boolean }} Version a version and what builds it; `kept`: its own builder (the
*   latest's, or a frozen one), not the latest's standing in for one that was not kept
*/
/** The first version of everything: what every asset was when versions began. */
const FIRST = {
	v: 1,
	date: "2026-10-05",
	note: "First version"
};
/**
* An asset's versions, oldest first: its history, the latest built by `current`. A history lists every version; the
* ones before the latest bring their own (frozen) builders. With no history the asset is at v1.
* @template B
* @param {B} current the asset's builder today
* @param {(Change & { build?: B })[]} [history]
* @returns {Version<B>[]}
*/
function versionsOf(current, history = [FIRST]) {
	const sorted = [...history].sort((a, b) => a.v - b.v);
	return sorted.map((c, i) => {
		const latest = i === sorted.length - 1;
		return {
			v: c.v,
			date: c.date,
			note: c.note,
			build: latest ? current : c.build ?? current,
			kept: latest || c.build !== void 0
		};
	});
}
/** The latest version number. @param {{ v: number }[]} versions */
const latestOf = (versions) => versions[versions.length - 1]?.v ?? 1;
/**
* Every item of a list with its versions: `versions` from its `HISTORY` entry (by id) and its builder (`key`), and
* `version` its latest number.
* @template {{ id: string }} T
* @param {T[]} items @param {keyof T} key @param {Record<string, (Change & { build?: any })[]>} [history]
* @returns {(T & { versions: Version<any>[], version: number })[]}
*/
function versioned(items, key, history = {}) {
	return items.map((it) => {
		const versions = versionsOf(it[key], history[it.id]);
		return {
			...it,
			versions,
			version: latestOf(versions)
		};
	});
}

//#endregion
//#region src/lib/machines/index.js
/** @typedef {import('$lib/actors').Actor} Actor */
/** @typedef {import('$lib/actors').Family} Family */
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1)
* @type {Record<string, (import('$lib/app/versions.js').Change & { build?: Actor[] })[]>} */
const HISTORY = /* @__PURE__ */ (() => ({ powercube: [
	{
		...FIRST,
		date: "2026-10-13",
		build: [{
			id: "powercube-7s",
			label: "VII / 7s",
			note: "as at v1: one rigged mesh in flat colours",
			make: () => powerCube$1()
		}, {
			id: "powercube-electric",
			label: "Electric",
			note: "as at v1: a generator in place of the pump, since its own machine, the ElectroCube (its v1 here)",
			make: () => electroCube(1)
		}]
	},
	{
		v: 2,
		date: "2026-10-13",
		note: "The Electric variant is its own actor now: the ElectroCube",
		build: [{
			id: "powercube-7s",
			label: "VII / 7s",
			note: "as at v2: one rigged mesh in flat colours, its parts named",
			make: () => powerCube$1()
		}]
	},
	{
		v: 3,
		date: "2026-10-14",
		note: "Built at AirSup’s realism: every part real solids in measured materials (cast aluminium fins on cast-iron liners, a forged crank and rods, zinc-plated steel, braided hoses, a copper and aluminium cooler, the oil and the petrol inside), the V-twin’s pistons on their rods turned by the crank, the gear pump’s two gears meshing in their housing; a solver runs it on real equations (the pump’s flow, slip and torque, the engine’s torque curve and governor, the relief valve, the oil’s heat) on two sliders, its hydraulic power read out; explode, cut away, x-ray, labels with live readings, slow, and its break: dead-headed with the relief stuck, the engine stalls"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "powercube",
	label: "Power Cube",
	note: "Open Source Ecology’s hydraulic power unit, the heart of every machine of their set: an engine on a pump in a steel cube with its own tanks, cooler and couplers, lifted from one machine to the next — every part its own, as in the LifeTrac that carries one",
	from: "Open Source Ecology: the Global Village Construction Set",
	variants: [{
		id: "powercube-7s",
		label: "VII / 7s",
		note: "Power Cube VII / 7s (v15.6, 2014–15): an 810 cc 28 hp air-cooled V-twin on a 16 cm³ gear pump, 15.2 gpm up to 3,000 psi, a 27\" cube, ~181 kg; running on its sliders",
		make: () => castOf(powerCube())
	}]
}];
/** @type {Family[]} */
const MACHINES = /* @__PURE__ */ (() => versioned(LIST, "variants", HISTORY))();

//#endregion
//#region src/lib/assets/refs.js
/**
* The asset `id` at version `v` (its latest when not given), and a kind's variant (the one asked for, or its first), in a
* group's list: its item, its version and its builder. Undefined if there is no such asset, version or variant.
* @param {Item[]} list @param {string} id @param {number} [v] @param {string} [variant]
* @returns {{ item: Item, version: AnyVersion, build: any, kept: boolean } | undefined}
*/
function pick(list, id, v, variant) {
	const item = list.find((x) => x.id === id);
	const version = item && (v === void 0 ? item.versions[item.versions.length - 1] : item.versions.find((x) => x.v === v));
	if (!item || !version) return void 0;
	let build = version.build;
	if (Array.isArray(build) && build.every((x) => typeof x?.make === "function")) {
		build = (variant ? build.find((x) => x.id === variant) : build[0])?.make;
		if (!build) return void 0;
	} else if (variant) return void 0;
	return {
		item,
		version,
		build,
		kept: version.kept
	};
}

//#endregion
//#region src/lib/assets/recipe.js
/** @typedef {import('./groups.js').Item} Item @typedef {import('./groups.js').AnyVersion} AnyVersion */
/** @typedef {import('./card.js').Meta} Meta */
/** the keys of `o` that are set, as a fresh plain object */
const set = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
/**
* What a recipe says of the asset it builds: a kind's variant named (the one asked for, or its first), its label
* with the variant's, its note the variant's or the version's.
* @param {string} group @param {Item} item @param {AnyVersion} version @param {string} [variant]
* @returns {Meta}
*/
function metaOf(group, item, version, variant) {
	const v = Array.isArray(version.build) ? version.build.find((x) => x.id === (variant ?? version.build[0]?.id)) : null;
	return set({
		group,
		id: item.id,
		version: version.v,
		variant: variant ?? v?.id,
		label: v?.label ? `${item.label}: ${v.label}` : item.label,
		note: v?.note ?? version.note,
		params: item.params?.length ? JSON.parse(JSON.stringify(item.params)) : void 0
	});
}
/**
* The recipe of one asset in a group's list: what its file gives the engine. Throws when it has no builder of its own.
* @param {string} group @param {Item[]} list @param {string} id @param {number} v @param {string | null} [variant]
* @returns {{ meta: Meta, build: (...args: any[]) => any }}
*/
function recipeIn(group, list, id, v, variant) {
	const got = pick(list, id, v, variant ?? void 0);
	if (!got) throw new Error(`no asset ${group}/${id}@${v}${variant ? `:${variant}` : ""}`);
	if (!got.kept || typeof got.build !== "function") throw new Error(`${group}/${id}@${v}: no builder of its own`);
	return {
		meta: metaOf(group, got.item, got.version, variant ?? void 0),
		build: got.build
	};
}
/**
* Every recipe a group's list holds: each version that kept its builder, each variant of it.
* @param {Item[]} list @returns {{ id: string, v: number, variant: string | null }[]}
*/
function recipesIn(list) {
	/** @type {{ id: string, v: number, variant: string | null }[]} */
	const out = [];
	for (const item of list) for (const version of item.versions.filter((x) => x.kept)) if (Array.isArray(version.build)) for (const b of version.build) out.push({
		id: item.id,
		v: version.v,
		variant: b.id
	});
	else out.push({
		id: item.id,
		v: version.v,
		variant: null
	});
	return out;
}

//#endregion
//#region \0entry
const recipe = (id, v, variant) => recipeIn("machines", MACHINES, id, v, variant);
const list = () => recipesIn(MACHINES);

//#endregion
exports.list = list;
exports.recipe = recipe;