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
const LAYER_FX = 1;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
	const t = clamp((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};
const ease = {
	lin: (t) => t,
	io: (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
	in: (t) => t * t * t,
	out: (t) => 1 - Math.pow(1 - t, 3),
	expo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
	back: (t) => {
		return 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
	}
};
/** first order lag toward target with time constant tau (s): spool-up, thermal mass, filters */
const approach = (v, target, tau, dt) => target + (v - target) * Math.exp(-dt / Math.max(1e-6, tau));
/** piecewise linear table lookup: xs ascending */
function table(xs, ys, x) {
	if (x <= xs[0]) return ys[0];
	for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1]));
	return ys[ys.length - 1];
}
/** number formatting with thin grouping: fmt(144712) = "144,712", fmt(3.14159, 2) = "3.14" */
function fmt(v, digits = 0) {
	if (!isFinite(v)) return "--";
	return v.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
/** seeded random, so films are deterministic */
function rng(seed = 1) {
	let s = seed >>> 0 || 1;
	return () => {
		s = s * 1664525 + 1013904223 >>> 0;
		return s / 4294967296;
	};
}
function canvasTex(size, draw, { repeat = [1, 1], color = false } = {}) {
	if (typeof document === "undefined") return new three.Texture();
	const c = document.createElement("canvas");
	c.width = c.height = size;
	draw(c.getContext("2d"), size);
	const t = new three.CanvasTexture(c);
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.repeat.set(repeat[0], repeat[1]);
	t.anisotropy = 8;
	t.colorSpace = color ? three.SRGBColorSpace : three.NoColorSpace;
	return t;
}
const TEX = {};
function tex(kind) {
	if (TEX[kind]) return TEX[kind];
	const R = rng(kind.length * 977);
	const S = 512;
	const make = {
		turned: (g) => {
			g.fillStyle = "#808080";
			g.fillRect(0, 0, S, S);
			for (let y = 0; y < S; y++) {
				const v = 112 + R() * 40 + Math.sin(y * .9) * 10;
				g.fillStyle = `rgb(${v},${v},${v})`;
				g.fillRect(0, y, S, 1);
			}
		},
		brushed: (g) => {
			g.fillStyle = "#7a7a7a";
			g.fillRect(0, 0, S, S);
			for (let i = 0; i < 2600; i++) {
				const v = 90 + R() * 80;
				g.fillStyle = `rgba(${v},${v},${v},0.35)`;
				g.fillRect(R() * S, R() * S, 30 + R() * 220, 1);
			}
		},
		cast: (g) => {
			g.fillStyle = "#808080";
			g.fillRect(0, 0, S, S);
			for (let i = 0; i < 380; i++) {
				const v = 100 + R() * 60, r = 6 + R() * 40;
				const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
				gr.addColorStop(0, `rgba(${v},${v},${v},0.25)`);
				gr.addColorStop(1, "rgba(128,128,128,0)");
				g.save();
				g.translate(R() * S, R() * S);
				g.fillStyle = gr;
				g.fillRect(-r, -r, 2 * r, 2 * r);
				g.restore();
			}
			const d = g.getImageData(0, 0, S, S);
			for (let i = 0; i < d.data.length; i += 4) {
				const n = (R() - .5) * 26;
				d.data[i] += n;
				d.data[i + 1] += n;
				d.data[i + 2] += n;
			}
			g.putImageData(d, 0, 0);
		},
		carbon: (g) => {
			const n = 16, w = S / n;
			for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
				const on = (i + j >> 1) % 2 === 0;
				const gr = on ? g.createLinearGradient(i * w, 0, i * w + w, 0) : g.createLinearGradient(0, j * w, 0, j * w + w);
				gr.addColorStop(0, "#0d0e10");
				gr.addColorStop(.5, on ? "#3a3d42" : "#2a2c30");
				gr.addColorStop(1, "#0d0e10");
				g.fillStyle = gr;
				g.fillRect(i * w, j * w, w, w);
			}
		},
		knurl: (g) => {
			g.fillStyle = "#000";
			g.fillRect(0, 0, S, S);
			g.strokeStyle = "#fff";
			g.lineWidth = 6;
			for (let i = -512; i < 2 * S; i += 24) {
				g.beginPath();
				g.moveTo(i, 0);
				g.lineTo(i + S, S);
				g.stroke();
				g.beginPath();
				g.moveTo(i, S);
				g.lineTo(i + S, 0);
				g.stroke();
			}
		},
		smudge: (g) => {
			g.fillStyle = "#4a4a4a";
			g.fillRect(0, 0, S, S);
			for (let i = 0; i < 90; i++) {
				const r = 10 + R() * 60, v = 70 + R() * 50;
				const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
				gr.addColorStop(0, `rgba(${v},${v},${v},0.3)`);
				gr.addColorStop(1, "rgba(74,74,74,0)");
				g.save();
				g.translate(R() * S, R() * S);
				g.scale(1, .4 + R());
				g.fillStyle = gr;
				g.fillRect(-r, -r, 2 * r, 2 * r);
				g.restore();
			}
		}
	}[kind];
	TEX[kind] = canvasTex(S, make, { color: kind === "carbon" });
	return TEX[kind];
}
const CUT = /* @__PURE__ */ (() => ({
	a: { value: new three.Vector4(0, 0, -1, 1e5) },
	b: { value: new three.Vector4(0, 0, -1, 1e5) },
	proj: { value: new three.Matrix4() },
	hatch: { value: .012 }
}))();
const ALL_MATS = /* @__PURE__ */ (() => /* @__PURE__ */ new Set())();
/** section face style: 'red' (museum cutaway paint, the default) or 'metal' (the freshly machined material). Set before creating materials: setCaps('metal') */
const CAPS = /* @__PURE__ */ (() => ({
	style: "red",
	red: new three.Color(.56, .085, .045)
}))();
/**
* Patch a standard or physical material so that, while a section cut is open, the back faces
* seen through the opening are drawn as a flat machined cap on the cut plane: plane normal,
* plane depth, the cap colour and a faint hatch. Every solid stays closed, no cap geometry.
*/
function capPatch(m, capColor, capRough = .38, capMetal = null) {
	m.userData.capColor = new three.Color(capColor);
	const uCap = { value: m.userData.capColor };
	const uCapR = { value: capRough };
	const uCapM = { value: capMetal ?? m.metalness };
	m.onBeforeCompile = (sh) => {
		sh.uniforms.uCutA = CUT.a;
		sh.uniforms.uCutB = CUT.b;
		sh.uniforms.uCutProj = CUT.proj;
		sh.uniforms.uHatch = CUT.hatch;
		sh.uniforms.uCapColor = uCap;
		sh.uniforms.uCapRough = uCapR;
		sh.uniforms.uCapMetal = uCapM;
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLabW;").replace("#include <project_vertex>", `#include <project_vertex>
      { vec4 lw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        lw = instanceMatrix * lw;
        #endif
        vLabW = (modelMatrix * lw).xyz; }`);
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vLabW;
      uniform vec4 uCutA; uniform vec4 uCutB; uniform mat4 uCutProj; uniform float uHatch;
      uniform vec3 uCapColor; uniform float uCapRough; uniform float uCapMetal;
      void labClip(vec4 P, vec3 ro, vec3 rd, inout float t0, inout float t1, inout int id, int k) {
        float dn = dot(P.xyz, rd), d0 = dot(P.xyz, ro) + P.w;
        if (abs(dn) < 1e-8) { if (d0 >= 0.0) { t0 = 1.0; t1 = 0.0; } return; }
        float th = -d0 / dn;
        if (dn > 0.0) { if (th < t1) { t1 = th; id = k; } } else t0 = max(t0, th);
      }`).replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      // a back face of a closed solid is only ever seen through the opening the cut made: shade it as the
      // section face (plane normal, cap colour) at its own depth, so ordinary depth testing keeps it honest
      bool labCap = false; vec3 labHit = vLabW; vec3 labN = uCutA.xyz;
      if (!gl_FrontFacing && uCutA.w < 1e4) {
        labCap = true;
        vec3 ro = cameraPosition, toF = vLabW - ro; float tf = length(toF); vec3 rd = toF / max(tf, 1e-6);
        float t0 = 0.0, t1 = 1e9; int id = -1;
        labClip(uCutA, ro, rd, t0, t1, id, 0); labClip(uCutB, ro, rd, t0, t1, id, 1);
        if (id == 1) labN = uCutB.xyz;
        else if (id < 0) labN = abs(dot(uCutA.xyz, vLabW) + uCutA.w) < abs(dot(uCutB.xyz, vLabW) + uCutB.w) ? uCutA.xyz : uCutB.xyz;
        labHit = vLabW - labN * (dot(labN, vLabW) + (id == 1 ? uCutB.w : uCutA.w));
      }`).replace("#include <color_fragment>", `#include <color_fragment>
      if (labCap) {
        float hs = dot(labHit, vec3(0.7071, 0.7071, 0.0)) / uHatch;
        float hl = smoothstep(0.0, 0.08, abs(fract(hs) - 0.5) - 0.42);
        diffuseColor.rgb = uCapColor * (0.94 + 0.06 * hl);
      }`).replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nif (labCap) roughnessFactor = uCapRough;").replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nif (labCap) metalnessFactor = uCapMetal;").replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      if (labCap) { vec3 nw = normalize(-labN); normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz); if (dot(normal, normalize(vViewPosition)) > 0.0) normal = -normal; }`);
		if (m.userData.extraShader) m.userData.extraShader(sh);
	};
	m.customProgramCacheKey = () => "labcap" + (m.userData.extraKey || "");
	m.side = three.DoubleSide;
	m.shadowSide = three.FrontSide;
	m.clippingPlanes = LAB_PLANES;
	m.clipIntersection = true;
	m.clipShadows = true;
	ALL_MATS.add(m);
	return m;
}
const LAB_PLANES = /* @__PURE__ */ (() => [new three.Plane(new three.Vector3(0, 0, -1), 1e5), new three.Plane(new three.Vector3(0, 0, -1), 1e5)])();
/**
* Material library. Base colours are measured linear reflectances for metals (F0) and
* albedos for dielectrics, so steel looks like steel next to titanium next to copper.
* Every preset takes overrides: any MeshPhysicalMaterial field plus
*   finish: 'turned' | 'brushed' | 'cast' | 'smudge' | 'knurl' | null   (micro roughness texture)
*   rep: [u, v] texture repeat     cap: cap colour     noCap: true for open shells and glass
*/
const MAT = {
	steel: (o) => mat({
		color: [
			.56,
			.57,
			.58
		],
		metalness: 1,
		roughness: .3,
		finish: "turned",
		...o
	}),
	steelDark: (o) => mat({
		color: [
			.24,
			.245,
			.25
		],
		metalness: 1,
		roughness: .42,
		finish: "cast",
		...o
	}),
	stainless: (o) => mat({
		color: [
			.67,
			.66,
			.64
		],
		metalness: 1,
		roughness: .2,
		finish: "brushed",
		...o
	}),
	chrome: (o) => mat({
		color: [
			.78,
			.79,
			.8
		],
		metalness: 1,
		roughness: .06,
		finish: null,
		...o
	}),
	aluminium: (o) => mat({
		color: [
			.88,
			.89,
			.9
		],
		metalness: 1,
		roughness: .38,
		finish: "cast",
		...o
	}),
	aluminiumMachined: (o) => mat({
		color: [
			.9,
			.9,
			.91
		],
		metalness: 1,
		roughness: .22,
		finish: "turned",
		...o
	}),
	anodised: (o) => mat({
		color: o?.color ?? [
			.08,
			.09,
			.1
		],
		metalness: .85,
		roughness: .34,
		finish: "cast",
		clearcoat: .2,
		...o
	}),
	titanium: (o) => mat({
		color: [
			.54,
			.5,
			.45
		],
		metalness: 1,
		roughness: .32,
		finish: "brushed",
		...o
	}),
	inconel: (o) => mat({
		color: [
			.47,
			.44,
			.41
		],
		metalness: 1,
		roughness: .42,
		finish: "cast",
		...o
	}),
	copper: (o) => mat({
		color: [
			.95,
			.64,
			.54
		],
		metalness: 1,
		roughness: .28,
		finish: "turned",
		...o
	}),
	brass: (o) => mat({
		color: [
			.91,
			.78,
			.42
		],
		metalness: 1,
		roughness: .24,
		finish: "turned",
		...o
	}),
	gold: (o) => mat({
		color: [
			1,
			.77,
			.34
		],
		metalness: 1,
		roughness: .18,
		finish: "brushed",
		...o
	}),
	bluedSteel: (o) => mat({
		color: [
			.08,
			.16,
			.5
		],
		metalness: 1,
		roughness: .16,
		finish: null,
		...o
	}),
	castIron: (o) => mat({
		color: [
			.3,
			.3,
			.3
		],
		metalness: .9,
		roughness: .62,
		finish: "cast",
		...o
	}),
	paint: (o) => mat({
		color: o?.color ?? [
			.8,
			.8,
			.8
		],
		metalness: 0,
		roughness: .32,
		clearcoat: .6,
		clearcoatRoughness: .2,
		finish: "smudge",
		...o
	}),
	satin: (o) => mat({
		color: o?.color ?? [
			.04,
			.04,
			.045
		],
		metalness: 0,
		roughness: .55,
		finish: "cast",
		...o
	}),
	plastic: (o) => mat({
		color: o?.color ?? [
			.05,
			.05,
			.055
		],
		metalness: 0,
		roughness: .42,
		finish: "cast",
		...o
	}),
	rubber: (o) => mat({
		color: [
			.025,
			.025,
			.027
		],
		metalness: 0,
		roughness: .82,
		finish: "cast",
		...o
	}),
	ceramic: (o) => mat({
		color: [
			.82,
			.8,
			.76
		],
		metalness: 0,
		roughness: .5,
		finish: "cast",
		...o
	}),
	carbon: (o) => mat({
		color: [
			1,
			1,
			1
		],
		map: tex("carbon"),
		metalness: .2,
		roughness: .36,
		clearcoat: 1,
		clearcoatRoughness: .05,
		finish: null,
		rep: [6, 6],
		...o
	}),
	glass: (o) => mat({
		color: [
			1,
			1,
			1
		],
		metalness: 0,
		roughness: .03,
		transmission: 1,
		thickness: .004,
		ior: 1.5,
		transparent: true,
		finish: null,
		noCap: true,
		...o
	}),
	sapphire: (o) => mat({
		color: [
			.96,
			.97,
			1
		],
		metalness: 0,
		roughness: 0,
		transmission: 1,
		thickness: .002,
		ior: 1.77,
		transparent: true,
		finish: null,
		noCap: true,
		...o
	}),
	ruby: (o) => mat({
		color: [
			.9,
			.08,
			.15
		],
		metalness: 0,
		roughness: .05,
		transmission: .6,
		thickness: .001,
		ior: 1.77,
		finish: null,
		...o
	}),
	enamel: (o) => mat({
		color: [
			.93,
			.92,
			.88
		],
		metalness: 0,
		roughness: .12,
		clearcoat: 1,
		clearcoatRoughness: .03,
		finish: null,
		...o
	}),
	fluid: (o) => mat({
		color: o?.color ?? [
			.3,
			.12,
			.05
		],
		metalness: 0,
		roughness: .08,
		clearcoat: 1,
		finish: null,
		...o
	}),
	glow: (o) => mat({
		color: [
			0,
			0,
			0
		],
		emissive: o?.emissive ?? [
			1,
			.5,
			.15
		],
		emissiveIntensity: o?.emissiveIntensity ?? 4,
		metalness: 0,
		roughness: 1,
		finish: null,
		...o
	})
};
function col(c) {
	return Array.isArray(c) ? new three.Color(c[0], c[1], c[2]) : new three.Color(c);
}
/** build a material from a preset description (see MAT) */
function mat(o) {
	const { finish, rep, cap, noCap, capRough, color, emissive, ...rest } = o;
	const m = new three.MeshPhysicalMaterial({ ...rest });
	m.color = col(color ?? [
		.8,
		.8,
		.8
	]);
	if (emissive !== void 0) m.emissive = col(emissive);
	if (finish) {
		const t = tex(finish).clone();
		t.needsUpdate = true;
		t.repeat.set(...rep ?? (finish === "turned" ? [1, 24] : finish === "brushed" ? [2, 6] : [3, 3]));
		m.roughnessMap = t;
		if (finish === "knurl") {
			m.bumpMap = t;
			m.bumpScale = .6;
		}
	}
	m.envMapIntensity = rest.envMapIntensity ?? 1;
	if (noCap) {
		m.side = three.FrontSide;
		m.clippingPlanes = LAB_PLANES;
		m.clipIntersection = true;
		m.clipShadows = true;
		ALL_MATS.add(m);
		return m;
	}
	const metalCap = m.metalness > .5 ? m.color.clone().lerp(new three.Color(.8, .8, .8), .35) : m.color.clone().multiplyScalar(.9);
	return capPatch(m, cap !== void 0 ? col(cap) : CAPS.style === "metal" ? metalCap : CAPS.red.clone(), capRough ?? (CAPS.style === "metal" ? .36 : .55), CAPS.style === "metal" && m.metalness > .5 ? 1 : 0);
}
const GEO = {
	/**
	* closed solid of revolution around +Y from [r, y] points (a closed profile; the last point joins the first).
	* Any winding works (it is made counter clockwise so faces point out), and corners sharper than
	* `crease` degrees stay crisp while gentle curves shade smooth.
	*/
	lathe(pts, seg = 96, { crease = 32, phi0 = 0, phiLen = Math.PI * 2 } = {}) {
		let p = pts.map(([r, y]) => new three.Vector2(Math.max(0, r), y));
		if (p[0].distanceTo(p[p.length - 1]) < 1e-9) p.pop();
		let area = 0;
		for (let i = 0; i < p.length; i++) {
			const a = p[i], b = p[(i + 1) % p.length];
			area += a.x * b.y - b.x * a.y;
		}
		if (area < 0) p.reverse();
		const cosT = Math.cos(three.MathUtils.degToRad(crease)), n0 = p.length;
		const isCrease = (i) => {
			const a = p[(i - 1 + n0) % n0], b = p[i], c = p[(i + 1) % n0];
			return b.clone().sub(a).normalize().dot(c.clone().sub(b).normalize()) < cosT;
		};
		let s0 = 0;
		for (let i = 0; i < n0; i++) if (isCrease(i)) {
			s0 = i;
			break;
		}
		p = [...p.slice(s0), ...p.slice(0, s0)];
		const out = [p[0].clone()];
		for (let i = 1; i < n0; i++) {
			out.push(p[i].clone());
			if (isCrease(i)) out.push(p[i].clone());
		}
		out.push(p[0].clone());
		const g = new three.LatheGeometry(out, seg, phi0, phiLen);
		g.computeVertexNormals();
		if (phiLen >= Math.PI * 2 - 1e-6) {
			const n = g.attributes.normal, P = out.length;
			for (let j = 0; j < P; j++) {
				const a = j, b = seg * P + j;
				const v = new three.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
				n.setXYZ(a, v.x, v.y, v.z);
				n.setXYZ(b, v.x, v.y, v.z);
			}
		}
		return g;
	},
	/**
	* a wall of thickness t following an open profile [[r, y], ...] (a nozzle, a casing, a cowl):
	* the outer line, then the same line offset inward, closed at both ends. Real solids cut cleanly.
	*/
	shell(pts, t, seg = 96, inward = true) {
		const out = pts.map((p) => new three.Vector2(p[0], p[1]));
		const inn = out.map((p, i) => {
			const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
			const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
			const nx = ty / l, ny = -tx / l;
			const s = inward ? -1 : 1;
			return new three.Vector2(Math.max(0, p.x + s * nx * t), p.y + s * ny * t);
		});
		return GEO.lathe([...out.map((v) => [v.x, v.y]), ...inn.reverse().map((v) => [v.x, v.y])], seg);
	},
	/** hollow cylinder along +Y */
	tube(rOut, rIn, h, seg = 96, y0 = -h / 2) {
		return GEO.lathe([
			[rIn, y0],
			[rOut, y0],
			[rOut, y0 + h],
			[rIn, y0 + h]
		], seg);
	},
	/** cylinder with chamfered edges along +Y */
	disc(r, h, ch = Math.min(r, h) * .08, seg = 96, rIn = 0) {
		return GEO.lathe([
			[rIn, -h / 2],
			[r - ch, -h / 2],
			[r, -h / 2 + ch],
			[r, h / 2 - ch],
			[r - ch, h / 2],
			[rIn, h / 2]
		], seg);
	},
	rbox(w, h, d, r = Math.min(w, h, d) * .08, s = 4) {
		return new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, s, r);
	},
	/** spur or helical gear around +Z, with an involute-like tooth (enough for a convincing mesh), centred on z */
	gear({ teeth = 24, module = .002, width = .008, bore = 0, helix = 0, rim = 0, spokes = 0 } = {}) {
		const rp = teeth * module / 2, ra = rp + module, rf = rp - 1.25 * module;
		const da = Math.PI * 2 / teeth, steps = 6;
		const hw = (r) => da * lerp(.31, .13, Math.pow(clamp((r - rf) / (ra - rf)), .85));
		const pts = [];
		for (let i = 0; i < teeth; i++) {
			const c = (i + .5) * da;
			pts.push([rf, i * da]);
			for (let k = 0; k <= steps; k++) {
				const r = lerp(rf, ra, k / steps);
				pts.push([r, c - hw(r)]);
			}
			for (let k = 1; k < 3; k++) pts.push([ra, c - hw(ra) + 2 * hw(ra) * k / 3]);
			for (let k = steps; k >= 0; k--) {
				const r = lerp(rf, ra, k / steps);
				pts.push([r, c + hw(r)]);
			}
		}
		const sh = new three.Shape();
		pts.forEach(([r, a], k) => {
			const x = r * Math.cos(a), y = r * Math.sin(a);
			k ? sh.lineTo(x, y) : sh.moveTo(x, y);
		});
		sh.closePath();
		if (bore > 0) {
			const h = new three.Path();
			h.absarc(0, 0, bore, 0, Math.PI * 2, true);
			sh.holes.push(h);
		}
		if (spokes > 0 && rim > 0) {
			const ri = rf - rim, rh = Math.max(bore * 1.9, rp * .28);
			for (let s = 0; s < spokes; s++) {
				const w = .22 * (rp / Math.max(ri, 1e-6));
				const a0 = s / spokes * Math.PI * 2 + w, a1 = (s + 1) / spokes * Math.PI * 2 - w;
				const h = new three.Path();
				h.absarc(0, 0, ri, a0, a1, false);
				h.absarc(0, 0, rh, a1 - w * .4, a0 + w * .4, true);
				h.closePath();
				sh.holes.push(h);
			}
		}
		const g = new three.ExtrudeGeometry(sh, {
			depth: width,
			bevelEnabled: true,
			bevelThickness: module * .15,
			bevelSize: module * .12,
			bevelSegments: 2,
			curveSegments: 24,
			steps: helix ? 6 : 1
		});
		g.translate(0, 0, -width / 2);
		if (helix) {
			const p = g.attributes.position;
			for (let i = 0; i < p.count; i++) {
				const a = p.getZ(i) / width * helix, x = p.getX(i), y = p.getY(i);
				p.setXY(i, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
			}
			g.computeVertexNormals();
		}
		g.userData.pitchRadius = rp;
		return g;
	},
	/**
	* one blade as a closed cambered, twisted airfoil solid, spanning radius r0..r1 along +Y,
	* chord along the axis (Z) by default. twist in rad root to tip, chord can be [root, tip].
	*/
	blade({ r0 = .1, r1 = .5, chord = .08, thick = .08, camber = .06, twist = .6, pitch = .4, sweep = 0, nS = 14, nC = 16, lean = 0 } = {}) {
		const c0 = Array.isArray(chord) ? chord[0] : chord, c1 = Array.isArray(chord) ? chord[1] : chord;
		const pos = [], idx = [];
		const ring = nC * 2;
		for (let s = 0; s <= nS; s++) {
			const u = s / nS, r = lerp(r0, r1, u), c = lerp(c0, c1, u), ang = pitch + twist * (u - .5) * -1;
			const tk = Array.isArray(thick) ? lerp(thick[0], thick[1], u) : thick, cb = Array.isArray(camber) ? lerp(camber[0], camber[1], u) : camber;
			for (let k = 0; k < ring; k++) {
				const top = k < nC, x = (top ? k : ring - 1 - k) / (nC - 1);
				const th = 5 * tk * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1036 * x ** 4);
				const yy = (4 * cb * x * (1 - x) + (top ? th : -th)) * c, xx = (x - .35) * c;
				const z = xx * Math.cos(ang) - yy * Math.sin(ang) + sweep * u * u;
				const tx = xx * Math.sin(ang) + yy * Math.cos(ang) + lean * u * u;
				pos.push(tx, r, z);
			}
		}
		for (let s = 0; s < nS; s++) for (let k = 0; k < ring; k++) {
			const a = s * ring + k, b = s * ring + (k + 1) % ring, c = a + ring, d = b + ring;
			idx.push(a, c, b, b, c, d);
		}
		const cap = (s, flip) => {
			const base = s * ring, cIdx = pos.length / 3;
			let cx = 0, cy = 0, cz = 0;
			for (let k = 0; k < ring; k++) {
				cx += pos[(base + k) * 3];
				cy += pos[(base + k) * 3 + 1];
				cz += pos[(base + k) * 3 + 2];
			}
			pos.push(cx / ring, cy / ring, cz / ring);
			for (let k = 0; k < ring; k++) {
				const a = base + k, b = base + (k + 1) % ring;
				flip ? idx.push(cIdx, b, a) : idx.push(cIdx, a, b);
			}
		};
		cap(0, false);
		cap(nS, true);
		const g = new three.BufferGeometry();
		g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		const uv = [];
		for (let i = 0; i < pos.length / 3; i++) uv.push(i % ring / ring, Math.floor(i / ring) / nS);
		g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
		return g;
	},
	/**
	* a bladed row: n blades around an axis. axis 'z' = blades radial in XY, chord along Z.
	* axis 'y' = blades radial in XZ, chord along Y (an engine built along Y). Same options as blade().
	*/
	rotor({ count = 24, axis = "y", phase = 0, ...b } = {}) {
		const one = GEO.blade(b);
		if (axis === "y") one.applyMatrix4(new three.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
		if (axis === "x") one.applyMatrix4(new three.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
		return count === 1 ? one : GEO.ring(one, count, axis, phase);
	},
	/** volume (m3) and centroid of a closed mesh: for real masses (m = rho V) and inertias */
	volume(geo) {
		const p = geo.attributes.position, idx = geo.index ? geo.index.array : null, n = idx ? idx.length : p.count;
		let V = 0;
		const c = new three.Vector3(), a = new three.Vector3(), b = new three.Vector3(), d = new three.Vector3();
		for (let i = 0; i < n; i += 3) {
			const i0 = idx ? idx[i] : i, i1 = idx ? idx[i + 1] : i + 1, i2 = idx ? idx[i + 2] : i + 2;
			a.fromBufferAttribute(p, i0);
			b.fromBufferAttribute(p, i1);
			d.fromBufferAttribute(p, i2);
			const v = a.dot(b.clone().cross(d)) / 6;
			V += v;
			c.addScaledVector(a.clone().add(b).add(d), v / 4);
		}
		return {
			V: Math.abs(V),
			centroid: c.divideScalar(V || 1)
		};
	},
	/** n copies of a geometry rotated around an axis ('y' or 'z'), merged */
	ring(geo, n, axis = "z", phase = 0) {
		const out = [];
		for (let i = 0; i < n; i++) {
			const g = geo.clone();
			const m = new three.Matrix4();
			const a = phase + i / n * Math.PI * 2;
			axis === "y" ? m.makeRotationY(a) : axis === "x" ? m.makeRotationX(a) : m.makeRotationZ(a);
			g.applyMatrix4(m);
			out.push(g);
		}
		return three_addons_utils_BufferGeometryUtils_js.mergeGeometries(out);
	},
	merge(list) {
		return three_addons_utils_BufferGeometryUtils_js.mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g));
	},
	/** a pipe through points (closed solid wall, ends capped) */
	pipe(points, r, { seg = 64, radial = 16, tension = .5 } = {}) {
		const curve = new three.CatmullRomCurve3(points.map((p) => new three.Vector3(...p)), false, "catmullrom", tension);
		const g = new three.TubeGeometry(curve, seg, r, radial, false);
		const caps = [];
		for (const [t, s] of [[0, -1], [1, 1]]) {
			const c = new three.CircleGeometry(r, radial);
			const tan = curve.getTangentAt(t).multiplyScalar(s);
			c.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 0, 1), tan));
			c.translate(...curve.getPointAt(t).toArray());
			caps.push(c);
		}
		const m = GEO.merge([g, ...caps]);
		m.userData.curve = curve;
		return m;
	},
	/** hex bolt heads (or socket caps) on a circle around +Y at height y, merged */
	bolts(n, R, size, h, { y = 0, socket = false, phase = 0 } = {}) {
		const one = socket ? GEO.lathe([
			[0, 0],
			[size, 0],
			[size, h * .9],
			[size * .92, h],
			[size * .45, h],
			[size * .45, h * .55],
			[0, h * .55]
		], 24) : new three.CylinderGeometry(size, size, h, 6).translate(0, h / 2, 0);
		const out = [];
		for (let i = 0; i < n; i++) {
			const a = phase + i / n * Math.PI * 2;
			out.push(one.clone().translate(R * Math.cos(a), y, R * Math.sin(a)));
		}
		return GEO.merge(out);
	},
	/** coil spring along +Y */
	spring(R, wire, turns, len, seg = 400) {
		const pts = [];
		for (let i = 0; i <= seg; i++) {
			const t = i / seg, a = t * turns * Math.PI * 2;
			pts.push(new three.Vector3(R * Math.cos(a), t * len, R * Math.sin(a)));
		}
		return new three.TubeGeometry(new three.CatmullRomCurve3(pts), seg, wire, 10, false);
	},
	/** extruded 2D outline (THREE.Shape) along +Z, with a small bevel */
	extrude(shape, depth, bevel = depth * .06) {
		const g = new three.ExtrudeGeometry(shape, {
			depth,
			bevelEnabled: bevel > 0,
			bevelThickness: bevel,
			bevelSize: bevel,
			bevelSegments: 2,
			curveSegments: 32
		});
		g.translate(0, 0, -depth / 2);
		g.computeVertexNormals();
		return g;
	}
};
/** ours: `lab` is any { theme }; `o.parent` is required, and its owner calls `update(dt)` every frame */
var Flow = class {
	/**
	* Streamlines that move: each particle is a short streak drawn along its path, bright at the head,
	* fading at the tail (reads like smoke in a wind tunnel, not dust).
	* lab.flow({ paths: [[[x,y,z],...], ...] (machine metres), count: 500, length: 0.06 (fraction of a path),
	*            color: (pathIndex, u) => [r,g,b], speed: 0.3 (path lengths per second), parent })
	*   f.speed and f.opacity are set each frame from the solver; f.colorFn can change live
	*/
	constructor(lab, o) {
		this.lab = lab;
		this.o = o;
		this.curves = o.paths.map((p) => p.isCurve ? p : new three.CatmullRomCurve3(p.map((q) => new three.Vector3(...q))));
		const S = 256;
		this.lut = this.curves.map((c) => {
			const a = /* @__PURE__ */ new Float32Array(771);
			const v = new three.Vector3();
			for (let i = 0; i <= S; i++) {
				c.getPointAt(i / S, v);
				a[i * 3] = v.x;
				a[i * 3 + 1] = v.y;
				a[i * 3 + 2] = v.z;
			}
			return a;
		});
		this.S = S;
		const lens = this.curves.map((c) => c.getLength());
		const n = o.count ?? 500;
		this.n = n;
		this.seg = o.segments ?? 8;
		this.len = o.length ?? .07;
		const R = rng(o.seed ?? 3);
		this.pi = new Uint16Array(n);
		this.u = new Float32Array(n);
		this.sp = new Float32Array(n);
		const tot = lens.reduce((x, y) => x + y, 0);
		for (let i = 0; i < n; i++) {
			let r = R() * tot, k = 0;
			while (r > lens[k] && k < lens.length - 1) {
				r -= lens[k];
				k++;
			}
			this.pi[i] = k;
			this.u[i] = R();
			this.sp[i] = .85 + R() * .3;
		}
		this.speed = o.speed ?? .3;
		this.colorFn = o.color ?? (() => [
			.3,
			.55,
			1
		]);
		const V = n * this.seg * 2;
		const g = new three.BufferGeometry();
		g.setAttribute("position", new three.BufferAttribute(new Float32Array(V * 3), 3));
		g.setAttribute("color", new three.BufferAttribute(new Float32Array(V * 4), 4));
		const paper = lab.theme === "paper";
		const m = new three.LineBasicMaterial({
			vertexColors: true,
			transparent: true,
			depthWrite: false,
			blending: paper ? three.NormalBlending : three.AdditiveBlending,
			toneMapped: false
		});
		this.lines = new three.LineSegments(g, m);
		this.lines.frustumCulled = false;
		this.lines.layers.set(1);
		this.lines.renderOrder = 3;
		o.parent.add(this.lines);
		this.opacity = 1;
	}
	_at(k, u, out, o) {
		const L = this.lut[k], f = clamp(u) * this.S, i = Math.min(this.S - 1, Math.floor(f)), t = f - i;
		for (let a = 0; a < 3; a++) out[o + a] = L[i * 3 + a] + (L[i * 3 + 3 + a] - L[i * 3 + a]) * t;
	}
	update(dt) {
		const g = this.lines.geometry, P = g.attributes.position.array, C = g.attributes.color.array;
		const seg = this.seg, op = this.opacity;
		this.lines.visible = op > .003;
		if (!this.lines.visible) return;
		let v = 0;
		for (let i = 0; i < this.n; i++) {
			const k = this.pi[i];
			this.u[i] = (this.u[i] + dt * this.speed * this.sp[i] * (this.o.perPath ? this.o.perPath[k] ?? 1 : 1)) % 1;
			const head = this.u[i];
			const c = this.colorFn(k, head);
			const life = smoothstep(0, .08, head) * smoothstep(1, .9, head);
			for (let j = 0; j < seg; j++) {
				const u0 = head - this.len * j / seg, u1 = head - this.len * (j + 1) / seg;
				this._at(k, u0, P, v * 3);
				this._at(k, u1, P, v * 3 + 3);
				const a0 = (1 - j / seg) * life * op, a1 = (1 - (j + 1) / seg) * life * op;
				C.set([
					c[0],
					c[1],
					c[2],
					u0 < 0 ? 0 : a0,
					c[0],
					c[1],
					c[2],
					u1 < 0 ? 0 : a1
				], v * 4);
				v += 2;
			}
		}
		g.attributes.position.needsUpdate = true;
		g.attributes.color.needsUpdate = true;
	}
};

//#endregion
//#region src/lib/assets/parts.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {import('$lib/actors/parts.js').Assembly} Assembly */
/** @typedef {import('$lib/actors/parts.js').PartInfo} PartInfo */
/**
* @typedef {object} How how a part is shown (AirSup's `lab.add` options)
* @property {V3} [explode] which way and how far it moves out in the exploded view (m, in its parent's frame); without
*   it, its assembly's `out` and its distance from the assembly's middle
* @property {number} [delay] 0…1: how late it starts out of the machine (a stagger; without it, spread by its order)
* @property {'shell'} [xray] a shell the x-ray looks through (a casing, a tank wall, a cover)
* @property {{ text?: string, at?: V3, value?: () => string, side?: 'left' | 'right' }} [tag] a label pinned on it: its
*   leader line ends at `at` (in the part's frame), `value` is a live reading under it
*/
/**
* @typedef {object} Part a part as its asset keeps it
* @property {THREE.Object3D} obj
* @property {PartInfo} info
* @property {THREE.Vector3} base where it rests (in its parent's frame)
* @property {THREE.Vector3 | null} off its way out in the exploded view
* @property {number} delay
* @property {number} order
* @property {boolean} [unit] a whole carried asset moving as one (not in the catalog)
*/
/**
* @typedef {object} Label
* @property {THREE.Object3D} obj
* @property {THREE.Vector3} at
* @property {string} text
* @property {(() => string) | undefined} value
* @property {'left' | 'right' | undefined} side
*/
/**
* @typedef {object} Control a slider a viewer shows for a machine's solver (AirSup's `lab.slider`)
* @property {string} label
* @property {number} min
* @property {number} max
* @property {number} value what it is set to now (the solver reads it every tick)
* @property {number} [step]
* @property {string} [unit]
* @property {number} [digits]
* @property {[string, string]} [ends] what its two ends mean
*/
/**
* @typedef {object} Move one of a machine's own moves (what a hand does with it, or what it does): a loop over its
*   controls, played while chosen, by the clock on the wall (Slow slows it, Pause holds it). The viewer's other moves are
*   the stage's own: Run (its solver at the sliders) and Assemble (its parts in by their build steps).
* @property {string} label
* @property {number} seconds one loop
* @property {(u: number) => Record<string, number>} at the controls it sets, `u` 0…1 through the loop
* @property {string} [note] what it shows, in a few words
*/
/**
* @typedef {object} Lab what a machine with a solver shows besides its parts (AirSup's hero, sliders, how and break)
* @property {{ label: string, unit: string, max: number, digits?: number }} hero the one number a viewer cares about
* @property {{ value: number, state: string, sub: string, bad: boolean }} read the hero as the solver last set it
* @property {Record<string, Control>} controls
* @property {Record<string, Move>} [moves] its own moves, by id (a slider a move sets follows it)
* @property {{ text: string, eqs: string[] }} [how] how it is computed: plain words and the equations
* @property {{ label: string, run: (env: Env) => void, reset: (env: Env) => void }} [breakIt] what breaks, decided by the solver
* @property {{ a: V3, b?: V3, center?: V3, reach?: number, offset?: number }} [cut] the section planes (normals pointing
*   at what is cut away, in the asset's frame) and where they sweep from
*/
/** @typedef {{ broken: boolean, time: number, slow: number, cut: number, xray: number }} Env how the asset is being shown, for its solver */
/**
* The kit an asset is built with.
* @param {THREE.Object3D} root
* @param {{ assemblies?: Assembly[], steps?: string[], sources?: { label: string, url: string }[] }} [o]
*/
function assetKit(root, { assemblies = [], steps = [], sources = [] } = {}) {
	/** @type {Part[]} */
	const parts = [];
	/** @type {Label[]} */
	const labels = [];
	/** @type {THREE.Mesh[]} */
	const shells = [];
	/** @type {((dt: number, env: Env) => void)[]} */
	const tickers = [];
	/** @type {Assembly[]} */
	const asms = [...assemblies];
	const ids = /* @__PURE__ */ new Set();
	/** @param {THREE.Object3D} obj @param {PartInfo} info @param {How} o @param {boolean} [unit] */
	const keep = (obj, info, o, unit = false) => {
		/** @type {Part} */
		const p = {
			obj,
			info,
			base: obj.position.clone(),
			off: o.explode ? new three.Vector3(...o.explode) : null,
			delay: o.delay ?? parts.length * .618 % 1 * .3,
			order: parts.length,
			...unit ? { unit } : {}
		};
		parts.push(p);
		if (unit) return p;
		obj.userData.part = info.id;
		if (o.xray === "shell") obj.traverse((m) => m.isMesh && shells.push(m));
		if (o.tag) labels.push({
			obj,
			at: new three.Vector3(...o.tag.at ?? [
				0,
				0,
				0
			]),
			text: o.tag.text ?? info.label,
			value: o.tag.value,
			side: o.tag.side
		});
		return p;
	};
	return {
		root,
		/**
		* A part: `obj` holding its meshes, placed where it sits, added to `parent` (the root, or a part it moves with),
		* its card and how it is shown.
		* @param {THREE.Object3D} obj
		* @param {Omit<PartInfo, 'step'> & { step?: number }} info
		* @param {How} [o]
		* @param {THREE.Object3D} [parent]
		*/
		part(obj, info, o = {}, parent = root) {
			if (ids.has(info.id)) throw new Error(`part ${info.id} twice`);
			if (!asms.some((a) => a.id === info.assembly)) throw new Error(`part ${info.id}: no assembly ${info.assembly}`);
			ids.add(info.id);
			if (obj.parent !== parent) parent.add(obj);
			obj.name ||= info.id;
			obj.traverse((m) => {
				if (m.isMesh) m.castShadow = m.receiveShadow = true;
			});
			keep(obj, {
				...info,
				step: info.step ?? asms.findIndex((a) => a.id === info.assembly) + 1
			}, o);
			return obj;
		},
		/**
		* A mesh for a part to hold, placed in the part's frame.
		* @param {THREE.BufferGeometry} geo @param {THREE.Material} material
		* @param {{ pos?: V3, rot?: V3, to?: THREE.Object3D }} [o]
		*/
		mesh(geo, material, { pos, rot, to } = {}) {
			const m = new three.Mesh(geo, material);
			if (pos) m.position.set(...pos);
			if (rot) m.rotation.set(...rot);
			m.castShadow = m.receiveShadow = true;
			to?.add(m);
			return m;
		},
		/** a label pinned on any object of the asset (not only a part) @param {THREE.Object3D} obj @param {string} text @param {{ at?: V3, value?: () => string, side?: 'left' | 'right' }} [o] */
		label(obj, text, o = {}) {
			labels.push({
				obj,
				at: new three.Vector3(...o.at ?? [
					0,
					0,
					0
				]),
				text,
				value: o.value,
				side: o.side
			});
		},
		/** run every frame the asset is shown or played: its solver and its moving parts @param {(dt: number, env: Env) => void} f */
		onTick(f) {
			tickers.push(f);
		},
		/** move a part's resting place (a part a solver slides), so the exploded view still starts from it @param {THREE.Object3D} obj @param {V3} at */
		place(obj, at) {
			const p = parts.find((q) => q.obj === obj);
			if (p) p.base.set(...at);
			else obj.position.set(...at);
		},
		/**
		* Carry another asset: it hangs from `parent` at `at`, turned by `rot`. A guest sealed by its own kit brings
		* its parts, labels, shells and solver, which become this asset's: its parts keep their cards under `prefix`;
		* they go into the host's assembly `assembly` (made from `asm` if the host has none of that id), else keep the
		* guest's own assemblies (prefixed). In the exploded view the whole guest first moves out by `explode`, then its
		* parts apart. Any other object (a thing, a rigged kind, a plant) is carried whole, as one part with its own
		* `card`. `ref` names the asset at its version (`machines/powercube@3`; an object made by `objectAt` knows its
		* own): every part that came with it says so on its card.
		* @param {THREE.Object3D} guest
		* @param {{ at?: V3, rot?: V3, parent?: THREE.Object3D, prefix?: string, assembly?: string, asm?: Assembly, step?: number, explode?: V3, unit?: string, ref?: string, card?: Partial<PartInfo> }} [o]
		*/
		carry(guest, { at = [
			0,
			0,
			0
		], rot, parent = root, prefix = `${guest.name || "guest"}-`, assembly, asm, step, explode, unit, ref = guest.userData.ref, card = {} } = {}) {
			const g = guest.userData.asset;
			guest.position.set(...at);
			if (rot) guest.rotation.set(...rot);
			parent.add(guest);
			const from = ref ? { ref } : {};
			if (!g) {
				const id = card.id ?? prefix.replace(/-$/, "");
				if (ids.has(id)) throw new Error(`part ${id} twice`);
				const a = assembly ?? id;
				if (!asms.some((x) => x.id === a)) asms.push({
					label: guest.name || id,
					note: "",
					out: explode ?? [
						0,
						.4,
						0
					],
					...asm,
					id: a
				});
				ids.add(id);
				guest.traverse((m) => {
					if (m.isMesh) m.castShadow = m.receiveShadow = true;
				});
				keep(guest, {
					label: guest.name || id,
					what: "",
					...card,
					...from,
					id,
					assembly: a,
					step: step ?? card.step ?? asms.findIndex((x) => x.id === a) + 1
				}, {
					explode,
					delay: 0
				});
				return guest;
			}
			if (assembly && asm && !asms.some((a) => a.id === assembly)) asms.push({
				...asm,
				id: assembly
			});
			if (!assembly) for (const a of g.catalog.assemblies) asms.push({
				...a,
				id: prefix + a.id,
				label: `${guest.name}: ${a.label}`
			});
			if (explode) keep(guest, {
				id: `${prefix}unit`,
				label: guest.name,
				assembly: assembly ?? "",
				what: "",
				step: step ?? 1,
				...from
			}, {
				explode,
				delay: 0
			}, true);
			for (const p of g.parts) {
				if (p.unit) continue;
				const id = prefix + p.info.id;
				ids.add(id);
				p.obj.userData.part = id;
				parts.push({
					...p,
					info: {
						...from,
						...p.info,
						id,
						assembly: assembly ?? prefix + p.info.assembly,
						step: step ?? p.info.step,
						...unit ? { unit } : {}
					},
					order: parts.length
				});
			}
			labels.push(...g.labels);
			shells.push(...g.shells);
			tickers.push((dt, env) => g.tick(dt, env));
			return guest;
		},
		/**
		* Finish the asset: its parts' ways out, its catalog, and the handles every viewer uses, written on the root.
		* @param {{ lab?: Lab, cut?: Lab['cut'], play?: string, seconds?: number }} [o]
		* @returns {SealedAsset}
		*/
		seal({ lab, cut, play = "Build it", seconds = 12 } = {}) {
			root.updateMatrixWorld(true);
			const sz = new three.Box3().setFromObject(root).getSize(new three.Vector3());
			const size = Math.max(sz.x, sz.y, sz.z);
			const toRoot = new three.Matrix4().copy(root.matrixWorld).invert();
			const centre = new Map(parts.map((p) => [p, new three.Box3().setFromObject(p.obj).getCenter(new three.Vector3()).applyMatrix4(toRoot)]));
			/** @type {Map<string, THREE.Vector3>} */
			const mid = /* @__PURE__ */ new Map();
			for (const a of asms) {
				const list = parts.filter((p) => !p.unit && p.info.assembly === a.id);
				if (list.length) mid.set(a.id, list.reduce((s, p) => s.add(centre.get(p)), new three.Vector3()).divideScalar(list.length));
			}
			const q = new three.Quaternion(), qr = new three.Quaternion();
			for (const p of parts) {
				if (p.off) continue;
				const a = asms.find((x) => x.id === p.info.assembly);
				const out = new three.Vector3(...a?.out ?? [
					0,
					0,
					0
				]);
				const m = mid.get(p.info.assembly);
				if (m) out.addScaledVector(
					/** @type {THREE.Vector3} */
					centre.get(p).clone().sub(m),
					.45
				);
				p.obj.parent?.getWorldQuaternion(q);
				root.getWorldQuaternion(qr);
				p.off = out.applyQuaternion(qr).applyQuaternion(q.invert());
			}
			const listed = parts.filter((p) => !p.unit);
			const catalog = {
				assemblies: asms.filter((a) => listed.some((p) => p.info.assembly === a.id)),
				parts: listed.map((p) => p.info),
				steps,
				sources,
				ranges: steps.map((_, i) => [i / Math.max(1, steps.length), (i + 1) / Math.max(1, steps.length)]),
				play,
				seconds
			};
			const n = Math.max(1, parts.length);
			const far = new three.Vector3(), up = new three.Vector3(0, size * .9, 0);
			/** where every part is: drawn out by `e` (0…1, staggered), and flown in from far by `u` of the build (1: all in) */
			const pose = (e, u = 1) => {
				for (const p of parts) {
					const ee = ease.io(clamp(e * 1.35 - p.delay * .35));
					const s = p.info.step ?? 1, of = Math.max(1, catalog.steps.length);
					const ai = u >= 1 ? 1 : ease.out(clamp(u * 1.6 - (s - 1) / of * .5 - p.order / n * .1));
					far.copy(p.off).normalize().multiplyScalar(size * 1.6).add(up);
					p.obj.position.copy(p.base).addScaledVector(p.off, ee).addScaledVector(far, 1 - ai);
					p.obj.visible = ai > .001;
				}
			};
			/** @type {SealedAsset} */
			const asset = {
				parts,
				labels,
				shells,
				catalog,
				size,
				lab,
				cut: cut ?? lab?.cut,
				pose,
				explode: (k) => pose(k, 1),
				build: (u) => pose(0, u),
				tick: (dt, env) => tickers.forEach((f) => f(dt, env)),
				partOf: (obj) => {
					for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData.part;
					return null;
				},
				objOf: (id) => parts.find((p) => p.info.id === id)?.obj ?? null
			};
			root.userData.asset = asset;
			root.userData.parts = Object.fromEntries(listed.map((p) => [p.info.id, p.obj]));
			root.userData.catalog = catalog;
			root.userData.explode = asset.explode;
			root.userData.setBuild = asset.build;
			return asset;
		}
	};
}
/**
* @typedef {object} SealedAsset what `seal` writes on an asset's root (`root.userData.asset`)
* @property {Part[]} parts
* @property {Label[]} labels
* @property {THREE.Mesh[]} shells
* @property {{ assemblies: Assembly[], parts: PartInfo[], steps: string[], sources: { label: string, url: string }[], ranges: [number, number][], play: string, seconds: number }} catalog
* @property {number} size its largest outer measure (m)
* @property {Lab | undefined} lab
* @property {Lab['cut']} cut
* @property {(explode: number, build?: number) => void} pose
* @property {(k: number) => void} explode
* @property {(u: number) => void} build
* @property {(dt: number, env: Env) => void} tick
* @property {(obj: THREE.Object3D) => string | null} partOf the part an object belongs to
* @property {(id: string) => THREE.Object3D | null} objOf
*/
/**
* An asset as the machines list it ($lib/machines): a cast with no bones, its moves
* played by its own solver.
* @param {THREE.Object3D} root a sealed asset
* @returns {import('$lib/actors/rig').Cast}
*/
const castOf = (root) => ({
	rig: {
		object: root,
		bones: {},
		names: [],
		pose: () => {}
	},
	clips: {},
	first: "",
	catalog: root.userData.asset.catalog,
	asset: root.userData.asset
});

//#endregion
//#region src/lib/machines/powercube.js
/** @typedef {[number, number, number]} V3 */
/** the cube: 27" each way, its 4×4 skids' height */
const CUBE = {
	W: .686,
	L: .66,
	H: .686,
	B: .1016
};
/** the crank's line (x 0, y, along z) and the plane the two cylinders stand in */
const CRANK = {
	y: .235,
	z: .03
};
/** the engine: bore, stroke, rod (m), displacement (m³), its cylinders' angle from upright (rad) */
const ENGINE = /* @__PURE__ */ (() => ({
	bore: .0838,
	stroke: .0734,
	rod: .116,
	Vd: 81e-5,
	bank: Math.PI / 4,
	deck: .186
}))();
/** the pump: displacement (m³ a turn), its gears (teeth, module, width), the idler above the drive */
const PUMP = {
	D: 16e-6,
	teeth: 12,
	module: .0025,
	width: .034,
	z0: -.232
};
const SOURCES = [
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
		label: "Power Cube (OSE portfolio)",
		url: "https://www.opensourceecology.org/portfolio/power-cube/"
	},
	{
		label: "Power Cube fabrication manual (v4)",
		url: "https://commons.wikimedia.org/wiki/File:Open_Source_Ecology_-_Powercube_-_Fabricaion_Manual.pdf"
	},
	{
		label: "Machine skill kit (AirSup, MIT)",
		url: "https://github.com/AirsupHQ/machine-skill"
	}
];
/** the engine's own numbers (bore, stroke, compression) are from its maker's data sheet, which we do not name */
const SRC = /* @__PURE__ */ (() => ({
	vii: SOURCES[0].label,
	s7: SOURCES[1].label,
	v156: SOURCES[2].label,
	port: SOURCES[3].label,
	man: SOURCES[4].label,
	eng: SOURCES[0].label
}))();
const ASSEMBLIES$1 = [
	{
		id: "frame",
		label: "Frame",
		note: "A 27\" cube: two 4×4 tube skids carry everything and take the forks; 2×2 angle posts and rails close it; the quick-attach plates on its back couple it to a machine.",
		out: [
			0,
			-.12,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "An 810 cc air-cooled 90° V-twin, 28 hp at 3,600 rpm, electric start: its crank turns the pump through the coupling behind it.",
		out: [
			0,
			.32,
			.3
		]
	},
	{
		id: "hydraulics",
		label: "Hydraulics",
		note: "The gear pump on the engine’s shaft, the 7-gallon reservoir over it, the relief valve and gauge, the six-tube cooler, the return filter and the two quick couplers on the back.",
		out: [
			0,
			.18,
			-.42
		]
	},
	{
		id: "controls",
		label: "Fuel and controls",
		note: "The 7-gallon fuel tank on top, the 12 V battery, and the panel on the front corner with the key, choke and throttle.",
		out: [
			.36,
			.3,
			.2
		]
	}
];
const STEPS$1 = [
	"Cut, drill and bolt the frame: skids, posts, rails, the engine plate and the quick-attach plates",
	"Bolt in the engine and fit its flywheel, shroud, air cleaner and muffler",
	"Mount the coupling and the pump; fit the reservoir, hoses, relief, gauge, cooler, filter and couplers",
	"Fit the fuel tank, the battery and the control panel"
];
/** a rounded rectangle, centred @param {number} w @param {number} h @param {number} r */
function rrect(w, h, r) {
	const s = new three.Shape(), x = w / 2, y = h / 2;
	s.moveTo(-x + r, -y);
	s.lineTo(x - r, -y);
	s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
	s.lineTo(x, y - r);
	s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
	s.lineTo(-x + r, y);
	s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
	s.lineTo(-x, -y + r);
	s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
	return s;
}
/** a hole in a shape: a circle @param {number} x @param {number} y @param {number} r */
const ring = (x, y, r) => {
	const p = new three.Path();
	p.absarc(x, y, r, 0, Math.PI * 2, true);
	return p;
};
/** a solid extruded along z by `d`, centred, with a small bevel @param {THREE.Shape} s @param {number} d @param {number} [b] */
const ext = (s, d, b = 8e-4) => GEO.extrude(s, d, b);
/** a thin plate from a shape along z, centred, sharp-edged and light (fins, screens, tube walls) @param {THREE.Shape} s @param {number} d @param {number} [seg] */
const plate = (s, d, seg = 8) => new three.ExtrudeGeometry(s, {
	depth: d,
	bevelEnabled: false,
	curveSegments: seg
}).translate(0, 0, -d / 2);
/** a plain box, centred (for sheets too thin to show a rounded edge) @param {number} w @param {number} h @param {number} d */
const slab = (w, h, d) => new three.BoxGeometry(w, h, d);
/** a ring gear's teeth round a rim @param {number} n @param {number} mod @param {number} w */
function ringGear(n, mod, w) {
	const s = new three.Shape(), ra = n * mod / 2 + mod, rf = n * mod / 2 - 1.25 * mod, da = Math.PI * 2 / n;
	const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
	s.moveTo(...pt(rf, 0));
	for (let k = 0; k < n; k++) {
		const a = k * da;
		s.lineTo(...pt(ra, a + .27 * da));
		s.lineTo(...pt(ra, a + .48 * da));
		s.lineTo(...pt(rf, a + .75 * da));
		s.lineTo(...pt(rf, a + da));
	}
	s.holes.push(ring(0, 0, rf - .006));
	return plate(s, w, 4);
}
/** a rounded box, centred @param {number} w @param {number} h @param {number} d @param {number} [r] */
const box = (w, h, d, r = Math.min(w, h, d) * .12) => GEO.rbox(w, h, d, r, 3);
/** a solid of revolution about z from [r, z] points @param {[number, number][]} pts @param {number} [seg] */
const latheZ = (pts, seg = 48) => GEO.lathe(pts, seg).rotateX(Math.PI / 2);
/** about x @param {[number, number][]} pts @param {number} [seg] */
const latheX = (pts, seg = 48) => GEO.lathe(pts, seg).rotateZ(-Math.PI / 2);
/** a round bar (closed) along z, from z0 to z1 @param {number} r @param {number} z0 @param {number} z1 @param {number} [seg] */
const rodZ = (r, z0, z1, seg = 32) => latheZ([
	[0, z0],
	[r, z0],
	[r, z1],
	[0, z1]
], seg);
/** a closed cylinder from a to b @param {V3} a @param {V3} b @param {number} r @param {number} [seg] */
function cyl(a, b, r, seg = 32) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b), len = A.distanceTo(B);
	const g = GEO.disc(r, len, Math.min(r, len) * .06, seg);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
	return g.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
}
/** a hose or pipe through points @param {V3[]} pts @param {number} r */
const hose = (pts, r) => GEO.pipe(pts, r, {
	seg: Math.max(24, pts.length * 14),
	radial: 14,
	tension: .5
});
/** one hex head at a point, its axis along `dir` @param {V3} at @param {V3} dir @param {number} s @param {number} h */
function hex(at, dir, s, h) {
	const g = new three.CylinderGeometry(s, s, h, 6).translate(0, h / 2, 0);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), new three.Vector3(...dir).normalize()));
	return g.translate(...at);
}
/** move a geometry @param {THREE.BufferGeometry} g @param {number} x @param {number} y @param {number} z */
const at = (g, x, y, z) => g.translate(x, y, z);
function materials() {
	return {
		red: MAT.paint({
			color: [
				.5,
				.055,
				.035
			],
			roughness: .4,
			clearcoat: .35
		}),
		zinc: MAT.steel({
			color: [
				.52,
				.53,
				.54
			],
			roughness: .34,
			finish: "cast"
		}),
		steel: MAT.steel({ roughness: .22 }),
		shaft: MAT.steel({
			roughness: .14,
			color: [
				.63,
				.63,
				.63
			],
			cap: [
				.8,
				.79,
				.76
			],
			capRough: .3
		}),
		black: MAT.paint({
			color: [
				.028,
				.028,
				.03
			],
			roughness: .46,
			clearcoat: .25
		}),
		satin: MAT.satin({ color: [
			.035,
			.035,
			.038
		] }),
		castAl: MAT.aluminium({ roughness: .42 }),
		machinedAl: MAT.aluminiumMachined(),
		castIron: MAT.castIron(),
		piston: MAT.aluminiumMachined({
			roughness: .3,
			color: [
				.78,
				.78,
				.77
			]
		}),
		forged: MAT.steelDark({ roughness: .36 }),
		pumpAl: MAT.aluminium({
			color: [
				.86,
				.87,
				.88
			],
			roughness: .32
		}),
		gear: MAT.steel({
			roughness: .18,
			finish: "turned",
			cap: [
				.82,
				.81,
				.78
			],
			capRough: .28
		}),
		tank: MAT.paint({
			color: [
				.075,
				.08,
				.085
			],
			roughness: .44,
			clearcoat: .3
		}),
		oil: MAT.fluid({
			color: [
				.55,
				.32,
				.06
			],
			roughness: .06
		}),
		fuel: MAT.glass({
			color: [
				.98,
				.9,
				.55
			],
			transmission: .85,
			thickness: .05,
			roughness: .05
		}),
		hose: MAT.rubber(),
		brass: MAT.brass({ roughness: .28 }),
		capRed: MAT.plastic({
			color: [
				.55,
				.05,
				.03
			],
			roughness: .38
		}),
		capBlue: MAT.plastic({
			color: [
				.03,
				.12,
				.45
			],
			roughness: .38
		}),
		plastic: MAT.plastic(),
		paper: MAT.ceramic({
			color: [
				.82,
				.74,
				.55
			],
			roughness: .8
		}),
		ceramic: MAT.ceramic({
			color: [
				.9,
				.89,
				.86
			],
			roughness: .25
		}),
		copper: MAT.copper(),
		muffler: MAT.steelDark({
			color: [
				.2,
				.19,
				.18
			],
			roughness: .55
		}),
		glass: MAT.glass(),
		dial: MAT.enamel(),
		needle: MAT.paint({
			color: [
				.7,
				.05,
				.03
			],
			roughness: .3
		}),
		yellow: MAT.plastic({
			color: [
				.85,
				.6,
				.02
			],
			roughness: .35
		}),
		green: MAT.plastic({
			color: [
				.04,
				.3,
				.12
			],
			roughness: .35
		}),
		battery: MAT.plastic({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .5
		}),
		lead: MAT.steel({
			color: [
				.42,
				.42,
				.44
			],
			roughness: .5,
			finish: "cast"
		}),
		finAl: MAT.aluminium({
			color: [
				.8,
				.81,
				.82
			],
			roughness: .35
		}),
		vane: MAT.aluminium({
			color: [
				.52,
				.53,
				.54
			],
			roughness: .62
		}),
		hdpe: MAT.plastic({
			color: [
				.86,
				.83,
				.74
			],
			roughness: .55,
			transmission: .45,
			thickness: .02,
			ior: 1.54
		})
	};
}
/** the engine's full-throttle torque (N·m, gross) by speed (rpm) [inferred: peak 63 N·m at 2,600 from a 9.8 bar BMEP, 55.4 at 3,600 from the rated 20.9 kW] */
const TORQUE = {
	rpm: [
		0,
		600,
		1200,
		1800,
		2200,
		2600,
		3e3,
		3600,
		4e3
	],
	nm: [
		0,
		22,
		44,
		56,
		60.5,
		63,
		61.5,
		55.4,
		49
	]
};
/** gross to installed (air cleaner, muffler, the shroud's fan) [inferred: 93 %] */
const INSTALLED = .93;
const PSI = 6894.76;
/** ISO VG 46 oil's kinematic viscosity (cSt) at a temperature (°C) [from its 46 cSt at 40 °C, 6.8 at 100 °C] */
const viscosity = (T) => 46 * Math.exp(-.0335 * (T - 40));
/** the most torque the engine gives at any speed its governor lets it run at (N·m, installed) @param {number} set */
const best = (set) => {
	let t = 0;
	for (let n = 600; n <= set * 1.03; n += 25) t = Math.max(t, table(TORQUE.rpm, TORQUE.nm, n) * INSTALLED);
	return t;
};
/**
* The cube's physics, stepped in time. Everything the page shows comes from here.
* @param {{ speed: { value: number }, load: { value: number } }} ctl
*/
function solver(ctl) {
	const J = .075;
	const etaHM = .92;
	const kLeak0 = .06 * PUMP.D * 60 / (3e3 * PSI);
	const crack = 3e3 * PSI, override = 160 * PSI;
	const kLine = 60 * PSI / Math.pow(57.5 / 6e4, 2);
	const C = 57516;
	const UAcool = 150, UAtank = 12, Tair = 20;
	const HEAT = 20;
	const s = {
		w: 120 * Math.PI,
		theta: .4,
		set: ctl.speed.value,
		valves: 1,
		p: 0,
		q: 0,
		qLoad: 0,
		qRelief: 0,
		T: 45,
		Te: 0,
		Tp: 0,
		hyd: 0,
		shaft: 0,
		fuel: 0,
		stalled: false,
		dead: false,
		stuck: false,
		start: 0,
		ang: 0,
		at: {
			speed: ctl.speed.value,
			load: ctl.load.value
		}
	};
	const rpm = () => s.w * 60 / (2 * Math.PI);
	/** the engine's torque at a speed and throttle (N·m): its installed curve, less friction closed */
	const engine = (n, th) => {
		const f = 2.5 + .0012 * n;
		return th * (table(TORQUE.rpm, TORQUE.nm, n) * INSTALLED + f) - f;
	};
	/** @param {number} dt @param {{ broken: boolean }} env */
	function step(dt, env) {
		s.dead = s.stuck = env.broken;
		if (s.stalled) {
			if ((Math.abs(ctl.speed.value - s.at.speed) > 1 || Math.abs(ctl.load.value - s.at.load) > 1) && !env.broken) restart();
		}
		const sub = 8, h = dt / sub;
		for (let i = 0; i < sub && !s.stalled; i++) {
			const nNow = rpm();
			s.set += clamp(ctl.speed.value - s.set, -1500 * h, 1500 * h);
			const set = s.set;
			const want = clamp((set * 1.03 - nNow) / (set * .08));
			s.theta = approach(s.theta, want, .08, h);
			if (nNow > set * .85) s.valves = Math.min(1, s.valves + h / 1.5);
			const kLeak = kLeak0 * (viscosity(50) / viscosity(s.T));
			const qGeo = PUMP.D * (nNow / 60);
			const pLoad = ctl.load.value * PSI * s.valves;
			if (s.dead) {
				s.qLoad = 0;
				const qOut = Math.max(0, qGeo - kLeak * s.p);
				const relief = s.stuck ? 0 : Math.max(0, (s.p - crack) / override) * (57.5 / 6e4);
				s.p = Math.max(0, s.p + 35e10 * (qOut - relief) * h);
				s.qRelief = relief;
				s.q = qOut;
			} else {
				let p = pLoad + kLine * qGeo * qGeo;
				let qLoad = Math.max(0, qGeo - kLeak * p), qRelief = 0;
				if (p > crack) for (let k = 0; k < 12; k++) {
					const qOut = Math.max(0, qGeo - kLeak * p);
					qLoad = p > pLoad ? Math.min(qOut, Math.sqrt((p - pLoad) / kLine)) : 0;
					qRelief = Math.max(0, qOut - qLoad);
					p = lerp(p, crack + override * (qRelief / (57.5 / 6e4)), .5);
				}
				s.p = approach(s.p, p, .02, h);
				s.q = Math.max(0, qGeo - kLeak * s.p);
				s.qLoad = qLoad;
				s.qRelief = qRelief;
			}
			s.Tp = qGeo > 0 ? PUMP.D * s.p / (2 * Math.PI * etaHM) + .4 : 0;
			s.Te = engine(nNow, s.theta) + (s.start > 0 ? 12 : 0);
			s.start = Math.max(0, s.start - h);
			s.w = Math.max(0, s.w + (s.Te - s.Tp) / J * h);
			if (rpm() < 500 && s.start <= 0) {
				s.stalled = true;
				s.w = 0;
				s.p = 0;
				s.q = s.qLoad = s.qRelief = 0;
				s.at = {
					speed: ctl.speed.value,
					load: ctl.load.value
				};
			}
		}
		const nNow = rpm();
		s.hyd = s.p * s.qLoad;
		s.shaft = s.Tp * s.w;
		const losses = s.shaft - s.p * s.q + s.p * s.qRelief + kLine * s.qLoad ** 3 + .25 * s.hyd;
		const out = (UAcool * (s.stalled ? .15 : 1) + UAtank) * (s.T - Tair);
		s.T += (losses - out) / C * dt * HEAT;
		const P = Math.max(0, s.Te * s.w) / 1e3, frac = P / 19.4;
		s.fuel = s.stalled ? 0 : P * .37 * (1 + .6 * (1 - frac) ** 2) / .745 + .5;
		s.ang += s.w / 40 * dt;
		return { rpm: nNow };
	}
	/** the key turned: it cranks, with the valves in neutral */
	function restart() {
		s.stalled = false;
		s.start = .8;
		s.p = 0;
		s.valves = 0;
	}
	return {
		s,
		step,
		rpm,
		restart
	};
}
/**
* The Power Cube v3: a root at its real size, every part its own, its solver running it.
* @param {{ speed?: number, load?: number }} [o] the engine's set speed (rpm) and the pressure the work needs (psi)
* @returns {THREE.Group}
*/
function powerCube({ speed = 3600, load = 1500 } = {}) {
	const root = new three.Group();
	root.name = "Power Cube";
	const M = materials();
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES$1,
		steps: STEPS$1,
		sources: SOURCES
	});
	const { W, L, H, B } = CUBE;
	const X = W / 2, Z = L / 2;
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** a part: its meshes, its card and how it is shown */
	const part = (info, objs, how = {}, parent = root) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	{
		const sq = rrect(.1016, .1016, .006);
		sq.holes.push(rrect(.092, .092, .003));
		const skid = plate(sq, L, 4);
		part({
			id: "skids",
			label: "Base skids (4×4 tube)",
			assembly: "frame",
			count: 2,
			source: SRC.s7,
			what: "Two 4×4 steel tubes front to back under the cube: the strong frame of 7s that the engine, pump and tanks bolt to, and that takes a forklift’s forks, the lifting pins or another cube stacked on it.",
			specs: [["Stock", "4\" × 4\" × 3/16\" tube (101.6 × 4.8 mm)"], ["Length", "660 mm [inferred: the 27\" cube]"]]
		}, [-1, 1].map((sx) => m(at(skid.clone(), sx * (X - .0508), .0508, 0), M.red)), { explode: [
			0,
			-.1,
			0
		] });
		const sq2 = rrect(.0508, .0508, .004);
		sq2.holes.push(rrect(.0508 - .0064, .0508 - .0064, .002));
		const cross = plate(sq2, (X - .1016) * 2, 4).rotateY(Math.PI / 2);
		part({
			id: "cross-tubes",
			label: "Cross tubes (2×2)",
			assembly: "frame",
			count: 2,
			source: SRC.s7,
			what: "Two 2×2 tubes welded between the skids at front and back, squaring the base.",
			specs: [["Stock", "2\" × 2\" × 1/8\" tube"]]
		}, [-1, 1].map((sz) => m(at(cross.clone(), 0, .0762, sz * (Z - .04)), M.red)), { explode: [
			0,
			-.1,
			0
		] });
		const leg = .0508, t = .00635;
		/** an upright angle at a corner, its outside corner outwards */
		const post = (sx, sz) => {
			const h = H - B, cx = sx * (X - t / 2), cz = sz * (Z - t / 2);
			return GEO.merge([at(box(t, h, leg, .0012), cx, B + h / 2, cz - sz * .044449999999999996 / 2), at(box(leg, h, t, .0012), cx - sx * .044449999999999996 / 2, B + h / 2, cz)]);
		};
		part({
			id: "posts",
			label: "Corner posts (2×2 angle)",
			assembly: "frame",
			count: 4,
			source: SRC.vii,
			what: "Four corner posts of 1/4\" × 2\" × 2\" angle make the cage: they guard the engine, carry the rails and give hand-holds to lift it by.",
			specs: [["Stock", "1/4\" × 2\" × 2\" angle (6.35 × 50.8 × 50.8 mm)"], ["Envelope", "27\" (686 mm) cube"]]
		}, [m(GEO.merge([
			post(-1, -1),
			post(-1, 1),
			post(1, -1),
			post(1, 1)
		]), M.red)], { explode: [
			0,
			0,
			0
		] });
		/** a top rail along x or z, its outside corner up and out */
		const rail = (ax, s) => {
			const y = H - t / 2;
			if (ax === "x") return GEO.merge([at(box(W - .002, t, leg, .0012), 0, y, s * (Z - leg / 2)), at(box(W - .002, leg, t, .0012), 0, H - leg / 2, s * (Z - t / 2))]);
			return GEO.merge([at(box(leg, t, L - .002, .0012), s * (X - leg / 2), y, 0), at(box(t, leg, L - .002, .0012), s * (X - t / 2), H - leg / 2, 0)]);
		};
		part({
			id: "top-rails",
			label: "Top rails (2×2 angle)",
			assembly: "frame",
			count: 4,
			source: SRC.vii,
			what: "Four rails round the top of the cage: OSE’s frame cuts its members 29\", 27\" and 24\" long. The lifting eyes and the fuel tank’s rails hang on them.",
			specs: [["Stock", "1/4\" × 2\" × 2\" angle"]]
		}, [m(GEO.merge([
			rail("x", -1),
			rail("x", 1),
			rail("z", -1),
			rail("z", 1)
		]), M.red)], { explode: [
			0,
			.16,
			0
		] });
		part({
			id: "tank-rails",
			label: "Fuel tank rails",
			assembly: "frame",
			count: 2,
			source: SRC.vii,
			what: "Two angles across the cage under the top, the fuel tank resting on them, clear of the engine’s air cleaner.",
			specs: [["Stock", "1/8\" × 1-1/2\" angle"], ["Height", "565 mm [inferred]"]]
		}, [-.115, .27].map((z) => m(GEO.merge([at(box(W - .1, .0032, .038, .001), 0, .5634, z), at(box(W - .1, .038, .0032, .001), 0, .5444, z + .0174)]), M.red)), { explode: [
			0,
			.1,
			0
		] });
		part({
			id: "engine-plate",
			label: "Engine mount plate",
			assembly: "frame",
			source: SRC.vii,
			what: "A 1/2\" plate across the skids: the engine’s base bolts to it, and the pump’s bracket behind, so their shafts stay on one line.",
			specs: [["VII engine module plate", "8\" × 15½\" (203 × 394 mm), here one piece with the pump’s [inferred]"], ["Thickness", "1/2\" (12.7 mm)"]]
		}, [m(at(box(W - .06, .0127, .49, .002), 0, B + .00635, -.015), M.zinc), m(GEO.merge([-.31, .31].flatMap((x) => [-.23, .2].map((z) => hex([
			x,
			B + .0127,
			z
		], [
			0,
			1,
			0
		], .011, .009)))), M.zinc)], { explode: [
			0,
			-.06,
			0
		] });
		const qa = [];
		for (const y of [.162, .322]) qa.push(m(at(box(W - .04, .1016, .0095, .002), 0, y, -Z - .0048), M.red));
		const recv = rrect(.2032, .1016, .006);
		recv.holes.push(rrect(.1905, .1016 - .0127, .003));
		qa.push(m(at(plate(recv, .07, 4), 0, .2416, -Z - .044), M.red));
		for (const sx of [-1, 1]) qa.push(m(cyl([
			sx * .12,
			.372,
			-Z - .03
		], [
			sx * .12,
			.43,
			-Z - .03
		], .012, 20), M.zinc));
		part({
			id: "quick-attach",
			label: "Quick-attach plates and receiver",
			assembly: "frame",
			source: SRC.man,
			what: "How the cube is coupled to a machine: plates across its back with a 4×8 receiver tube between them, so it slides onto the machine’s mount and is pinned, and comes off again in minutes for the next machine.",
			specs: [
				["Plates", "2 × 3/8\" × 4\" × 27\""],
				["Receiver tube", "4\" × 8\" × 1/4\""],
				["Pins", "2 × 1\" [inferred]"]
			]
		}, qa, { explode: [
			0,
			0,
			-.16
		] });
		const eye = new three.TorusGeometry(.026, .0075, 12, 28);
		part({
			id: "lift-eyes",
			label: "Lifting eyes",
			assembly: "frame",
			count: 2,
			source: SRC.vii,
			what: "Two eyes welded on the top rails: at about 181 kg the cube is lifted on and off a machine by the loader, a hoist or two people with a bar.",
			specs: [["Cube mass", "~400 lb (181 kg)"]]
		}, [-1, 1].map((sx) => m(at(eye.clone(), sx * (X - .028), H + .02, 0), M.zinc)), { explode: [
			0,
			.2,
			0
		] });
	}
	const C = new three.Vector3(0, CRANK.y, CRANK.z);
	const r = ENGINE.stroke / 2;
	/** a bank's axis: its angle from upright, towards +x for the right bank */
	const banks = [["left", -1], ["right", 1]];
	/** the banks sit a rod's width apart along the crank, their two rods side by side on one pin */
	const off = (sx) => sx * .0125;
	const axis = (sx) => new three.Vector3(sx * Math.sin(ENGINE.bank), Math.cos(ENGINE.bank), 0);
	/** a geometry made upright on its own +y, turned onto a bank's axis and set on the crank */
	const onBank = (geo, sx) => geo.rotateZ(-sx * ENGINE.bank).translate(C.x, C.y, C.z + off(sx));
	/** @type {Record<string, THREE.Group>} */
	const moving = {};
	{
		const cc = [m(at(box(.25, .2, .29, .035), 0, .226, .03), M.black), m(at(box(.3, .018, .3, .004), 0, B + .0127 + .009, .03), M.black)];
		for (const [, sx] of banks) cc.push(m(onBank(latheZ([
			[0, 0],
			[.068, 0],
			[.068, .012],
			[0, .012]
		], 40).rotateX(-Math.PI / 2).translate(0, .088, 0), sx), M.black));
		cc.push(m(GEO.merge([-.135, .135].flatMap((x) => [-.08, .14].map((z) => hex([
			x,
			B + .0217,
			z
		], [
			0,
			1,
			0
		], .008, .008)))), M.zinc));
		cc.push(m(at(latheZ([
			[0, -.115],
			[.06, -.115],
			[.06, -.125],
			[0, -.125]
		], 40), 0, CRANK.y, 0), M.black));
		part({
			id: "crankcase",
			label: "Crankcase",
			assembly: "engine",
			source: SRC.eng,
			what: "The engine’s cast block: it carries the crankshaft in its two main bearings, the camshaft and the governor, holds the oil in its sump, and bolts to the plate by its flange.",
			specs: [
				["Engine", "810 cc 90° V-twin, OHV, air-cooled"],
				["Rated", "28 hp (20.9 kW) gross at 3,600 rpm"],
				["Oil", "~1.9 L SAE 30 [inferred]"],
				["Dry mass", "~42 kg (92 lb)"]
			]
		}, cc, {
			explode: [
				0,
				.02,
				.02
			],
			xray: "shell",
			tag: {
				at: [
					-.12,
					.25,
					.1
				],
				value: () => `${fmt(sim.rpm())} rpm · ${fmt(Math.max(0, sim.s.Te) * sim.s.w / 1e3, 1)} kW`,
				text: "Engine",
				side: "left"
			}
		});
		const crank = new three.Group();
		crank.position.copy(C);
		const web = new three.Shape();
		web.moveTo(-.022, r);
		web.absarc(0, r, .022, Math.PI, 0, true);
		web.lineTo(.034, 0);
		web.absarc(0, 0, .062, 0, -Math.PI, true);
		web.lineTo(-.034, 0);
		web.lineTo(-.022, r);
		crank.add(m(rodZ(.0175, -.165, -.052), M.shaft), m(rodZ(.0175, .052, .205), M.shaft), m(at(ext(web, .016, .001), 0, 0, -.044), M.forged), m(at(ext(web, .016, .001), 0, 0, .044), M.forged), m(at(rodZ(.019, -.036, .036), 0, r, 0), M.shaft));
		part({
			id: "crankshaft",
			label: "Crankshaft",
			assembly: "engine",
			source: SRC.eng,
			what: "One forged crank for both cylinders: their two rods share one pin, the counterweights balance them, its front end carries the flywheel and its back end drives the pump.",
			moves: "Turns at engine speed (shown slowed 40 times).",
			drive: "The pistons, through the rods; it drives the pump",
			specs: [
				["Throw", `${fmt(r * 1e3, 1)} mm (stroke 73.4 mm)`],
				["Main journals", "Ø 35 mm [inferred]"],
				["Speed", "3,600 rpm governed"]
			]
		}, [crank], { explode: [
			0,
			-.02,
			0
		] });
		moving.crank = crank;
		for (const [side, sx] of banks) {
			const d = axis(sx);
			const fin = rrect(.128, .128, .012);
			fin.holes.push(ring(0, 0, ENGINE.bore / 2 + .006));
			const fins = [];
			for (let k = 0; k < 12; k++) fins.push(at(plate(fin, .0026, 6), 0, 0, .1 + k * .0072).rotateX(-Math.PI / 2));
			const finGeo = GEO.merge(fins);
			const liner = GEO.lathe([
				[ENGINE.bore / 2, .095],
				[ENGINE.bore / 2 + .0065, .095],
				[ENGINE.bore / 2 + .0065, ENGINE.deck],
				[ENGINE.bore / 2, ENGINE.deck]
			], 48);
			const barrel = new three.Group();
			barrel.add(m(onBank(finGeo, sx), M.castAl), m(onBank(liner, sx), M.castIron));
			part({
				id: `cylinder-${side}`,
				label: `Cylinder, ${side}`,
				assembly: "engine",
				source: SRC.eng,
				what: "One bank of the 90° V: a cast-iron liner the piston runs in, cast into square aluminium fins that the flywheel’s fan blows air over.",
				specs: [
					["Bore", "83.8 mm (3.30\")"],
					["Swept", "405 cm³"],
					["Cooling", "Air, by the flywheel fan"]
				]
			}, [barrel], {
				explode: d.clone().multiplyScalar(.1).toArray(),
				xray: "shell"
			});
			const head = new three.Group();
			const hb = at(box(.13, .05, .13, .01), 0, ENGINE.deck + .025, 0);
			const hfins = [];
			for (let k = 0; k < 4; k++) hfins.push(at(slab(.146, .0028, .146), 0, ENGINE.deck + .008 + k * .011, 0));
			head.add(m(onBank(GEO.merge([hb, ...hfins]), sx), M.castAl));
			head.add(m(onBank(at(box(.11, .032, .1, .012), 0, ENGINE.deck + .066, 0), sx), M.black));
			head.add(m(onBank(GEO.merge([-1, 1].flatMap((a) => [-1, 1].map((b) => at(new three.CylinderGeometry(.0055, .0055, .006, 6), a * .042, ENGINE.deck + .084, b * .036)))), sx), M.zinc));
			const plugAt = C.clone().addScaledVector(d, ENGINE.deck + .03).add(new three.Vector3(0, 0, .065 + off(sx)));
			const plug = [
				m(cyl(plugAt.toArray(), plugAt.clone().add(new three.Vector3(0, 0, .012)).toArray(), .0095, 6), M.zinc),
				m(cyl(plugAt.clone().add(new three.Vector3(0, 0, .012)).toArray(), plugAt.clone().add(new three.Vector3(0, 0, .036)).toArray(), .0055, 20), M.ceramic),
				m(cyl(plugAt.clone().add(new three.Vector3(0, 0, .03)).toArray(), plugAt.clone().add(new three.Vector3(sx * .01, 0, .065)).toArray(), .009, 20), M.satin)
			];
			plug.push(m(hose([
				plugAt.clone().add(new three.Vector3(sx * .01, 0, .065)).toArray(),
				[
					sx * .15,
					.36,
					.2
				],
				[
					sx * .13,
					.33,
					.215
				]
			], .0035), M.satin));
			part({
				id: `head-${side}`,
				label: `Cylinder head, ${side}`,
				assembly: "engine",
				source: SRC.eng,
				what: "The overhead-valve head: its inlet and exhaust valves under the rocker cover, the combustion chamber over the piston, and the spark plug in its front.",
				specs: [["Valves", "OHV, 2 per cylinder"], ["Compression", "8.4 : 1"]]
			}, [head], { explode: d.clone().multiplyScalar(.2).toArray() });
			part({
				id: `plug-${side}`,
				label: `Spark plug and lead, ${side}`,
				assembly: "engine",
				source: SRC.eng,
				what: "The plug in the head, its boot and the lead to its ignition coil at the flywheel: a spark each turn, fired by the flywheel’s magnet.",
				specs: [["Gap", "0.76 mm [inferred]"]]
			}, plug, { explode: [
				sx * .08,
				.1,
				.14
			] });
			const piston = new three.Group();
			const pr = ENGINE.bore / 2 - 2e-4;
			piston.add(m(GEO.lathe([
				[0, .03],
				[pr - .002, .03],
				[pr, .028],
				[pr, .022],
				[pr - .0015, .022],
				[pr - .0015, .0195],
				[pr, .0195],
				[pr, .016],
				[pr - .0015, .016],
				[pr - .0015, .0135],
				[pr, .0135],
				[pr, -.026],
				[pr - .004, -.026],
				[pr - .004, .022],
				[0, .022]
			], 48), M.piston), m(cyl([
				-.026,
				0,
				0
			], [
				.026,
				0,
				0
			], .0095, 20).rotateY(Math.PI / 2), M.shaft));
			const rod = new three.Group();
			const beam = new three.Shape();
			beam.moveTo(-.011, .02);
			beam.lineTo(-.007, ENGINE.rod - .012);
			beam.lineTo(.007, ENGINE.rod - .012);
			beam.lineTo(.011, .02);
			beam.lineTo(-.011, .02);
			const big = rrect(.05, .05, .024);
			big.holes.push(ring(0, 0, .0195));
			const small = rrect(.026, .026, .0125);
			small.holes.push(ring(0, 0, .0096));
			rod.add(m(GEO.merge([
				ext(beam, .011, 6e-4),
				ext(big, .014, 8e-4),
				at(ext(small, .012, 6e-4), 0, ENGINE.rod, 0)
			]), M.forged));
			const pz = new three.Group(), rz = new three.Group();
			pz.position.z = rz.position.z = CRANK.z + off(sx);
			part({
				id: `piston-${side}`,
				label: `Piston, ${side}`,
				assembly: "engine",
				source: SRC.eng,
				what: "An aluminium piston with two compression rings and an oil ring, on a hardened pin: the burning charge pushes it down 405 cm³ a stroke.",
				moves: "Up and down its cylinder, twice a turn of the crank for its four strokes.",
				drive: "The burning charge; it turns the crank through its rod",
				specs: [["Diameter", "83.8 mm"], ["Stroke", "73.4 mm"]]
			}, [piston], { explode: d.clone().multiplyScalar(.3).toArray() }, pz);
			part({
				id: `rod-${side}`,
				label: `Connecting rod, ${side}`,
				assembly: "engine",
				source: SRC.eng,
				what: "The forged rod from the piston’s pin to the crank’s pin, beside its twin on the same pin.",
				moves: "Swings and slides with the crank.",
				drive: "The piston",
				specs: [["Centres", "116 mm [inferred]"]]
			}, [rod], { explode: d.clone().multiplyScalar(.18).toArray() }, rz);
			root.add(pz, rz);
			moving[`piston-${side}`] = piston;
			moving[`rod-${side}`] = rod;
		}
		const fly = new three.Group();
		fly.position.copy(C);
		fly.add(m(latheZ([
			[.015, .185],
			[.1, .185],
			[.11, .19],
			[.11, .215],
			[.06, .218],
			[.03, .225],
			[.015, .225]
		], 72), M.castIron));
		const vane = slab(.07, .003, .03);
		const vanes = [];
		for (let k = 0; k < 18; k++) vanes.push(at(vane.clone(), .07, 0, 0).rotateZ(k / 18 * Math.PI * 2 + .3).translate(0, 0, .232));
		fly.add(m(GEO.merge(vanes), M.vane));
		fly.add(m(at(ringGear(112, .002, .011), 0, 0, .192), M.steel));
		fly.add(m(at(rodZ(.024, .205, .245), 0, 0, 0), M.zinc));
		const screen = new three.Shape();
		screen.absarc(0, 0, .1, 0, Math.PI * 2, false);
		for (let k = 0; k < 24; k++) {
			const a = k / 24 * Math.PI * 2;
			screen.holes.push(ring(.065 * Math.cos(a), .065 * Math.sin(a), .012));
			if (k % 2 === 0) screen.holes.push(ring(.035 * Math.cos(a + .13), .035 * Math.sin(a + .13), .009));
		}
		const scr = m(at(plate(screen, .0025, 10), 0, 0, .25), M.satin);
		part({
			id: "flywheel",
			label: "Flywheel, fan and ring gear",
			assembly: "engine",
			source: SRC.eng,
			what: "Cast iron at the crank’s front: its weight smooths the twin’s firing, its magnets fire the plugs and charge the battery, its vanes are the cooling fan, and its ring gear takes the starter.",
			moves: "Turns with the crankshaft (shown slowed 40 times).",
			drive: "The crankshaft",
			specs: [
				["Diameter", "230 mm"],
				["Ring gear", "112 teeth [inferred]"],
				["Inertia", "~0.05 kg·m² [inferred]"]
			]
		}, [fly], { explode: [
			0,
			0,
			.24
		] });
		part({
			id: "screen",
			label: "Rotating screen",
			assembly: "engine",
			source: SRC.eng,
			what: "The perforated disc on the flywheel’s face: it turns with it and flings off grass and chaff before the fan draws its air in.",
			moves: "Turns with the flywheel.",
			drive: "The crankshaft"
		}, [scr], { explode: [
			0,
			0,
			.36
		] }, fly);
		moving.fly = fly;
		const face = rrect(.47, .4, .07);
		face.holes.push(ring(0, -.06, .112));
		const shroud = [m(at(ext(face, .003, .001), 0, CRANK.y + .06, .262), M.black)];
		shroud.push(m(at(new three.TorusGeometry(.115, .005, 10, 72), 0, CRANK.y, .264), M.black));
		for (const y of [.17, .2]) shroud.push(m(cyl([
			-.17,
			CRANK.y + y,
			.2635
		], [
			.17,
			CRANK.y + y,
			.2635
		], .004, 12), M.black));
		shroud.push(m(GEO.merge([-1, 1].flatMap((sx) => [-.11, .21].map((y) => hex([
			sx * .2,
			CRANK.y + y,
			.2635
		], [
			0,
			0,
			1
		], .005, .004)))), M.zinc));
		shroud.push(m(at(box(.47, .003, .11, .001), 0, CRANK.y + .26, .205), M.black));
		for (const sx of [-1, 1]) shroud.push(m(at(box(.003, .36, .11, .001), sx * .235, CRANK.y + .08, .205), M.black));
		for (const sx of [-1, 1]) shroud.push(m(at(box(.16, .003, .15, .001), sx * .15, CRANK.y + .22, .09), M.black));
		part({
			id: "blower",
			label: "Blower housing",
			assembly: "engine",
			source: SRC.eng,
			what: "The pressed-steel shroud over the flywheel, ducting its fan’s air back over both cylinders’ fins.",
			specs: [["Material", "Pressed steel, painted"]]
		}, shroud, {
			explode: [
				0,
				.05,
				.34
			],
			xray: "shell"
		});
		const carb = [m(at(box(.055, .05, .06, .008), 0, .42, CRANK.z), M.castAl), m(cyl([
			0,
			.445,
			CRANK.z
		], [
			0,
			.47,
			CRANK.z
		], .022, 28), M.castAl)];
		for (const sx of [-1, 1]) {
			const port = C.clone().addScaledVector(axis(sx), ENGINE.deck + .02).add(new three.Vector3(-sx * .05, 0, -.03));
			carb.push(m(hose([
				[
					sx * .02,
					.42,
					CRANK.z - .015
				],
				[
					sx * .05,
					.42,
					CRANK.z - .03
				],
				port.toArray()
			], .012), M.castAl));
		}
		const lever = m(at(box(.004, .035, .012, .001), 0, .0175, 0), M.zinc);
		const throttle = new three.Group();
		throttle.position.set(.032, .42, CRANK.z + .02);
		throttle.add(lever);
		carb.push(throttle);
		part({
			id: "carburettor",
			label: "Carburettor and intake",
			assembly: "engine",
			source: SRC.eng,
			what: "In the V: the carburettor mixes petrol into the air the cleaner gives it, its throttle opened by the governor, and the manifold carries the charge to both heads.",
			moves: "Its throttle plate opens and closes with the governor.",
			drive: "The governor",
			specs: [["Throttle", "Butterfly, governed"], ["Choke", "Cable, from the panel"]]
		}, carb, { explode: [
			0,
			.16,
			.1
		] });
		moving.throttle = throttle;
		const element = GEO.lathe([
			[.05, .482],
			[.08, .482],
			[.08, .525],
			[.05, .525]
		], 72);
		const pos = element.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x);
			if (Math.hypot(x, z) > .075) {
				const k = 1 + .06 * Math.cos(a * 36);
				pos.setX(i, x * k);
				pos.setZ(i, z * k);
			}
		}
		element.computeVertexNormals();
		const cleaner = [
			m(at(box(.22, .012, .17, .004), 0, .476, CRANK.z), M.black),
			m(at(element, 0, 0, CRANK.z), M.paper),
			m(at(box(.23, .03, .18, .012), 0, .538, CRANK.z), M.plastic),
			m(cyl([
				0,
				.553,
				CRANK.z
			], [
				0,
				.562,
				CRANK.z
			], .015, 6), M.yellow)
		];
		part({
			id: "air-cleaner",
			label: "Air cleaner",
			assembly: "engine",
			source: SRC.eng,
			what: "Over the V: a pleated paper element in a plastic cover. Every litre of air the engine breathes, about 45 litres a second at full speed, is cleaned here first.",
			specs: [["Element", "Pleated paper, foam pre-cleaner"], ["Air", `~${fmt(ENGINE.Vd * 3600 / 120 * 1e3 * .85)} L/s at 3,600 rpm [computed: 85 % filling]`]]
		}, cleaner, {
			explode: [
				0,
				.28,
				0
			],
			xray: "shell"
		});
		const muff = [m(cyl([
			-.255,
			.3,
			-.095
		], [
			-.255,
			.3,
			.085
		], .05, 40), M.muffler)];
		for (const z of [-.095, .085]) muff.push(m(cyl([
			-.255,
			.3,
			z
		], [
			-.255,
			.3,
			z + (z < 0 ? -.004 : .004)
		], .052, 40), M.muffler));
		muff.push(m(cyl([
			-.255,
			.3,
			.089
		], [
			-.255,
			.3,
			.12
		], .012, 20), M.muffler));
		const exL = C.clone().addScaledVector(axis(-1), ENGINE.deck + .02).add(new three.Vector3(-.02, 0, -.06));
		const exR = C.clone().addScaledVector(axis(1), ENGINE.deck + .02).add(new three.Vector3(.02, 0, -.06));
		muff.push(m(hose([
			exL.toArray(),
			[
				-.23,
				.36,
				-.05
			],
			[
				-.255,
				.33,
				-.06
			]
		], .0115), M.muffler));
		muff.push(m(hose([
			exR.toArray(),
			[
				.1,
				.4,
				-.075
			],
			[
				-.1,
				.4,
				-.085
			],
			[
				-.22,
				.34,
				-.08
			],
			[
				-.255,
				.32,
				-.07
			]
		], .0115), M.muffler));
		part({
			id: "muffler",
			label: "Muffler and exhaust",
			assembly: "engine",
			source: SRC.vii,
			what: "Both exhausts into one can on the cube’s left side, the right one crossing behind the cylinders; it blows out forward, away from the couplers.",
			specs: [["Pipes", "Ø 23 mm [inferred]"], ["Can", "Ø 100 × 180 mm [inferred]"]]
		}, muff, {
			explode: [
				-.18,
				.04,
				0
			],
			xray: "shell"
		});
		part({
			id: "starter",
			label: "Electric starter",
			assembly: "engine",
			source: SRC.vii,
			what: "The 12 V starter whose pinion meshes with the flywheel’s ring gear while the key is held to START.",
			moves: "Spins only while starting.",
			drive: "The battery, through its solenoid",
			specs: [["Voltage", "12 V"], ["Power", "~0.9 kW [inferred]"]]
		}, [
			m(cyl([
				-.155,
				.17,
				.06
			], [
				-.155,
				.17,
				.17
			], .036, 32), M.black),
			m(cyl([
				-.155,
				.17,
				.17
			], [
				-.155,
				.17,
				.19
			], .024, 28), M.castAl),
			m(cyl([
				-.108,
				.186,
				.2
			], [
				-.108,
				.186,
				.226
			], .013, 10), M.steel),
			m(cyl([
				-.155,
				.218,
				.08
			], [
				-.155,
				.218,
				.15
			], .018, 24), M.zinc)
		], { explode: [
			-.16,
			0,
			.06
		] });
		part({
			id: "oil-filter",
			label: "Oil filter and dipstick",
			assembly: "engine",
			source: SRC.eng,
			what: "The engine’s full-pressure lubrication: a spin-on filter low on its right side, and the dipstick tube to fill and check the oil.",
			specs: [["Filter", "Spin-on, Ø 76 mm [inferred]"]]
		}, [
			m(cyl([
				.125,
				.165,
				-.05
			], [
				.205,
				.165,
				-.05
			], .038, 32), M.capBlue),
			m(hose([
				[
					.1,
					.25,
					.12
				],
				[
					.13,
					.33,
					.13
				],
				[
					.13,
					.4,
					.13
				]
			], .007), M.black),
			m(cyl([
				.13,
				.4,
				.13
			], [
				.13,
				.425,
				.13
			], .012, 16), M.yellow)
		], { explode: [
			.16,
			0,
			0
		] });
		const ign = [];
		for (const sx of [-1, 1]) ign.push(m(at(box(.04, .05, .03, .005), sx * .13, CRANK.y + .12, .2), M.satin));
		part({
			id: "ignition",
			label: "Ignition coils",
			assembly: "engine",
			count: 2,
			source: SRC.eng,
			what: "One coil beside the flywheel’s rim for each plug: its magnet sweeping past them makes the spark, no battery needed.",
			specs: [["Type", "Magneto armature"]]
		}, ign, { explode: [
			0,
			.12,
			.12
		] });
		const gov = [m(cyl([
			.03,
			.36,
			-.02
		], [
			.03,
			.42,
			.04
		], .0025, 8), M.zinc), m(at(box(.012, .05, .006, .001), .03, .34, -.03), M.zinc)];
		part({
			id: "governor",
			label: "Governor and linkage",
			assembly: "engine",
			source: SRC.eng,
			what: "Flyweights inside the crankcase push a lever out as the speed rises; its rod closes the throttle, so the engine holds its set speed whatever the pump asks, drooping a little under load.",
			moves: "Opens and closes the throttle.",
			drive: "Flyweights on the camshaft gear",
			specs: [["Droop", "~5 % [inferred]"], ["Set speed", "From the panel’s throttle"]]
		}, gov, { explode: [
			.06,
			.14,
			0
		] });
	}
	{
		const cpl = new three.Group();
		cpl.position.copy(C);
		cpl.add(m(latheZ([
			[0, -.245],
			[.034, -.245],
			[.034, -.206],
			[.036, -.204],
			[.036, -.2],
			[.034, -.198],
			[.034, -.158],
			[0, -.158]
		], 48), M.steel));
		cpl.add(m(GEO.merge([-.228, -.175].map((z) => at(cyl([
			0,
			.032,
			0
		], [
			0,
			.04,
			0
		], .005, 6), 0, 0, z))), M.satin));
		part({
			id: "coupling",
			label: "Shaft coupling",
			assembly: "hydraulics",
			source: SRC.port,
			what: "Not a bought jaw coupling: OSE cut two coupling halves and welded them into one sleeve, keyed and set-screwed onto the engine’s shaft, splined onto the pump’s.",
			moves: "Turns with the engine (shown slowed).",
			drive: "The crankshaft; it drives the pump",
			specs: [
				["Engine side", "1\" keyed, set screws"],
				["Pump side", "3/4\" spline, 11 teeth [inferred]"],
				["Made", "Two halves cut and welded"]
			]
		}, [cpl], { explode: [
			0,
			0,
			-.1
		] });
		moving.cpl = cpl;
		const brk = rrect(.2, .2, .01);
		brk.holes.push(ring(0, 0, .042));
		part({
			id: "pump-bracket",
			label: "Pump bracket",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "An upright plate on the engine plate holding the pump’s SAE-A flange square to the engine, so the two shafts stay on one line.",
			specs: [["Plate", "1/2\" (12.7 mm)"], ["Flange", "SAE A: Ø 82.55 mm pilot, 2 bolts on 106.4 mm"]]
		}, [
			m(at(ext(brk, .0127, .001), 0, CRANK.y, -.2235), M.zinc),
			m(at(box(.2, .0127, .06, .002), 0, B + .0127 + .0064, -.2), M.zinc),
			m(GEO.merge([-1, 1].map((sx) => at(box(.0095, .09, .05, .001), sx * .08, B + .0127 + .045, -.2))), M.zinc)
		], { explode: [
			0,
			0,
			-.18
		] });
		const pump = new three.Group();
		pump.position.set(0, CRANK.y, 0);
		const flange = new three.Shape();
		flange.moveTo(-.0532, .012);
		flange.absarc(-.0532, 0, .012, Math.PI / 2, Math.PI * 1.5, false);
		flange.lineTo(-.02, -.04);
		flange.lineTo(.02, -.04);
		flange.lineTo(.0532, -.012);
		flange.absarc(.0532, 0, .012, -Math.PI / 2, Math.PI / 2, false);
		flange.lineTo(.02, .07);
		flange.lineTo(-.02, .07);
		flange.lineTo(-.0532, .012);
		flange.holes.push(ring(-.0532, 0, .0055), ring(.0532, 0, .0055), ring(0, 0, .012));
		const z0 = PUMP.z0, bw = PUMP.width;
		const tip = PUMP.teeth * PUMP.module / 2 + PUMP.module + 2e-4, cd = PUMP.teeth * PUMP.module;
		const eight = new three.Path();
		const yi = cd / 2, xi = Math.sqrt(tip * tip - yi * yi);
		eight.moveTo(xi, yi);
		eight.absarc(0, cd, tip, Math.atan2(yi - cd, xi), Math.atan2(yi - cd, -xi) + Math.PI * 2, false);
		eight.absarc(0, 0, tip, Math.atan2(yi, -xi), Math.atan2(yi, xi) + Math.PI * 2, false);
		const bodyShift = new three.Shape(rrect(.09, .115, .012).getPoints(8).map((p) => new three.Vector2(p.x, p.y + cd / 2)));
		bodyShift.holes.push(eight);
		pump.add(m(at(ext(flange, .01, 8e-4), 0, 0, z0 - .003), M.pumpAl));
		const bodyM = m(at(ext(bodyShift, bw, 6e-4), 0, 0, z0 - .01 - bw / 2), M.pumpAl);
		const cover = m(at(ext(new three.Shape(rrect(.09, .115, .012).getPoints(8).map((p) => new three.Vector2(p.x, p.y + cd / 2))), .016, .0015), 0, 0, z0 - .01 - bw - .008), M.pumpAl);
		const tb = GEO.merge([-1, 1].flatMap((sx) => [-1, 1].map((sy) => hex([
			sx * .034,
			cd / 2 + sy * .045,
			z0 - .01 - bw - .016
		], [
			0,
			0,
			-1
		], .0065, .008))));
		const ports = [m(cyl([
			-.045,
			cd / 2,
			z0 - .01 - bw / 2
		], [
			-.066,
			cd / 2,
			z0 - .01 - bw / 2
		], .019, 6), M.zinc), m(cyl([
			.045,
			cd / 2,
			z0 - .01 - bw / 2
		], [
			.06,
			cd / 2,
			z0 - .01 - bw / 2
		], .0135, 6), M.zinc)];
		pump.add(bodyM, cover, m(tb, M.zinc), ...ports);
		part({
			id: "pump",
			label: "Hydraulic gear pump",
			assembly: "hydraulics",
			source: SRC.port,
			what: "A fixed-displacement external gear pump: two gears mesh and carry oil round the outside of their teeth from the suction port to the pressure port, about a cubic inch every turn. This flow is everything the machine it is coupled to can do.",
			moves: "Its gears turn with the engine.",
			drive: "The engine, through the coupling",
			specs: [
				["Displacement", "0.976 in³ (16.0 cm³) a turn"],
				["Flow", "15.2 gpm (57.5 L/min) at 3,600 rpm, less its slip"],
				["Pressure", "3,000 psi (207 bar) max"],
				["Gears", "12 teeth, module 2.5, 34 mm wide [inferred]"]
			]
		}, [pump], {
			explode: [
				0,
				0,
				-.28
			],
			xray: "shell",
			tag: {
				text: "Gear pump",
				at: [
					.05,
					CRANK.y + .04,
					z0 - .03
				],
				value: () => `${fmt(sim.s.q * 6e4, 1)} L/min · ${fmt(sim.s.p / PSI)} psi`,
				side: "right"
			}
		});
		const gears = new three.Group();
		gears.position.set(0, CRANK.y, 0);
		const gearGeo = GEO.gear({
			teeth: PUMP.teeth,
			module: PUMP.module,
			width: bw - 4e-4,
			bore: .009
		});
		const drive = m(at(gearGeo.clone(), 0, 0, 0), M.gear);
		const idler = m(at(gearGeo.clone(), 0, 0, 0), M.gear);
		const driveG = new three.Group(), idlerG = new three.Group();
		driveG.position.set(0, 0, z0 - .01 - bw / 2);
		idlerG.position.set(0, cd, z0 - .01 - bw / 2);
		driveG.add(drive, m(rodZ(.0095, -.04, .05), M.shaft));
		idlerG.add(idler, m(rodZ(.0095, -.022, .022), M.shaft));
		gears.add(driveG, idlerG);
		part({
			id: "pump-gears",
			label: "Pump gears",
			assembly: "hydraulics",
			source: SRC.port,
			what: "The drive gear on the pump’s shaft and the idler it turns: oil trapped between their teeth and the housing is carried round the outside from suction to pressure, and the meshing teeth push it out.",
			moves: "Turn against each other at engine speed.",
			drive: "The pump’s shaft",
			specs: [["Teeth", "12 each [inferred]"], ["Displacement", "2π m² z b ≈ 16 cm³ a turn"]]
		}, [gears], { explode: [
			0,
			.03,
			-.42
		] });
		moving.drive = driveG;
		moving.idler = idlerG;
		const rv = {
			x0: -.297,
			x1: .297,
			y0: .335,
			y1: .555,
			z0: -.32,
			z1: -.115,
			t: .003
		};
		const rw = rv.x1 - rv.x0, rh = rv.y1 - rv.y0, rd = rv.z1 - rv.z0, rc = [
			(rv.x0 + rv.x1) / 2,
			(rv.y0 + rv.y1) / 2,
			(rv.z0 + rv.z1) / 2
		];
		const walls = [
			at(box(rw, rv.t, rd, .001), rc[0], rv.y0 + rv.t / 2, rc[2]),
			at(box(rw, rv.t, rd, .001), rc[0], rv.y1 - rv.t / 2, rc[2]),
			at(box(rv.t, rh - 2 * rv.t, rd, .001), rv.x0 + rv.t / 2, rc[1], rc[2]),
			at(box(rv.t, rh - 2 * rv.t, rd, .001), rv.x1 - rv.t / 2, rc[1], rc[2]),
			at(box(rw - 2 * rv.t, rh - 2 * rv.t, rv.t, .001), rc[0], rc[1], rv.z0 + rv.t / 2),
			at(box(rw - 2 * rv.t, rh - 2 * rv.t, rv.t, .001), rc[0], rc[1], rv.z1 - rv.t / 2)
		];
		const inner = {
			w: rw - 2 * rv.t,
			h: rh - 2 * rv.t,
			d: rd - 2 * rv.t
		};
		const litres = inner.w * inner.h * inner.d * 1e3;
		part({
			id: "reservoir",
			label: "Hydraulic reservoir",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "The oil tank over the pump, removable for cleaning: the pump draws through a strainer at its bottom, the returns come in at its top through the filter, and a baffle between them makes the oil settle and let go of its air before it is drawn again.",
			specs: [
				["Volume", `${fmt(litres, 1)} L inside (7 gal nominal)`],
				["Walls", "3 mm steel"],
				["Oil", "ISO VG 46 anti-wear"]
			]
		}, [m(GEO.merge(walls), M.tank)], {
			explode: [
				0,
				.2,
				-.22
			],
			xray: "shell",
			tag: {
				text: "Reservoir",
				at: [
					rv.x0 + .04,
					rv.y1,
					rc[2]
				],
				value: () => `oil ${fmt(sim.s.T)} °C`,
				side: "left"
			}
		});
		const level = .82;
		const oil = m(at(box(inner.w - .001, inner.h * level, inner.d - .001, .002), rc[0], rv.y0 + rv.t + inner.h * level / 2, rc[2]), M.oil);
		const baffle = m(at(box(.003, inner.h * .7, inner.d - .002, 8e-4), .02, rv.y0 + rv.t + inner.h * .35, rc[2]), M.tank);
		const strainer = [m(cyl([
			-.2,
			rv.y0 + .004,
			-.25
		], [
			-.2,
			rv.y0 + .05,
			-.25
		], .026, 32), M.brass), m(cyl([
			-.2,
			rv.y0 + .05,
			-.25
		], [
			-.2,
			rv.y0 + .056,
			-.25
		], .028, 32), M.zinc)];
		part({
			id: "oil",
			label: "Hydraulic oil",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "About 21 L of ISO VG 46 anti-wear oil at its working level: it carries the power out to the machine and back, lubricates the pump and takes away the heat of every loss.",
			specs: [
				["Grade", "ISO VG 46: 46 cSt at 40 °C"],
				["Level", "82 % of the tank"],
				["Limit", "82 °C (180 °F) [inferred]"]
			]
		}, [oil], { explode: [
			0,
			.32,
			-.22
		] });
		part({
			id: "baffle",
			label: "Baffle and suction strainer",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "A plate across the tank between the return and the suction, and a brass mesh strainer on the suction outlet at its bottom: the pump never draws air or grit.",
			specs: [["Strainer", "100 mesh (149 µm) [inferred]"]]
		}, [baffle, ...strainer], { explode: [
			0,
			.25,
			-.12
		] });
		const suctionPts = [
			[
				-.2,
				rv.y0 - .002,
				-.25
			],
			[
				-.2,
				.3,
				-.25
			],
			[
				-.15,
				.27,
				-.255
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.258
			],
			[
				-.066,
				CRANK.y + cd / 2,
				z0 - .01 - bw / 2
			]
		];
		part({
			id: "suction-hose",
			label: "Suction hose",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "The wide soft line from the tank’s strainer down to the pump’s inlet: wide, so the pump never starves and cavitates.",
			specs: [["Hose", "1\" suction (SAE 100R4)"], ["Speed", "< 1.2 m/s in it [computed]"]]
		}, [m(hose(suctionPts, .0175), M.hose)], { explode: [
			-.12,
			.05,
			-.2
		] });
		const relief = new three.Group();
		relief.add(m(at(box(.05, .05, .05, .004), .13, .3, -.255), M.machinedAl), m(cyl([
			.155,
			.3,
			-.255
		], [
			.2,
			.3,
			-.255
		], .012, 24), M.steel), m(cyl([
			.2,
			.3,
			-.255
		], [
			.215,
			.3,
			-.255
		], .009, 6), M.brass), m(cyl([
			.18,
			.3,
			-.255
		], [
			.188,
			.3,
			-.255
		], .016, 6), M.zinc));
		relief.add(m(hose([[
			.13,
			.325,
			-.255
		], [
			.13,
			rv.y0 - .002,
			-.255
		]], .008), M.hose));
		part({
			id: "relief",
			label: "Relief valve",
			assembly: "hydraulics",
			source: SRC.v156,
			what: "Added in October 2014: a spring-loaded poppet that opens back to the tank when the pressure reaches its setting, so nothing bursts when a cylinder bottoms out or a wheel stalls. All the power it dumps becomes heat in the oil.",
			moves: "Its poppet lifts only at its setting.",
			specs: [
				["Setting", "3,000 psi (207 bar)"],
				["Override", "+160 psi at full flow [inferred]"],
				["Added", "October 2014 (v15.6)"]
			]
		}, [relief], {
			explode: [
				.16,
				-.02,
				-.12
			],
			tag: {
				text: "Relief valve",
				at: [
					.2,
					.3,
					-.255
				],
				value: () => sim.s.qRelief > 1e-6 ? `dumping ${fmt(sim.s.qRelief * 6e4, 1)} L/min` : sim.s.stuck ? "stuck shut" : "closed",
				side: "right"
			}
		});
		const pressPts = [
			[
				.06,
				CRANK.y + cd / 2,
				z0 - .01 - bw / 2
			],
			[
				.1,
				.27,
				-.255
			],
			[
				.105,
				.3,
				-.255
			]
		];
		part({
			id: "pressure-hose",
			label: "Pressure hoses",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "Two-wire braided hoses from the pump to the relief valve and on to the pressure coupler, every power stroke of the machine’s cylinders coming through them.",
			specs: [
				["Hose", "1/2\" SAE 100R2"],
				["Working pressure", "4,000 psi"],
				["Burst", "16,000 psi"]
			]
		}, [m(hose(pressPts, .0125), M.hose), m(hose([
			[
				.155,
				.28,
				-.255
			],
			[
				.2,
				.25,
				-.29
			],
			[
				.23,
				.2516,
				-.322
			]
		], .0125), M.hose)], { explode: [
			.14,
			-.04,
			-.2
		] });
		const gauge = new three.Group();
		const ga = [
			.17,
			.48,
			-.336
		];
		gauge.position.set(...ga);
		gauge.rotation.y = Math.PI;
		gauge.add(m(latheZ([
			[0, 0],
			[.05, 0],
			[.05, .028],
			[.046, .032],
			[0, .032]
		], 48), M.steel), m(latheZ([
			[0, .0275],
			[.045, .0275],
			[.045, .029],
			[0, .029]
		], 48), M.dial), m(latheZ([
			[0, .031],
			[.046, .031],
			[.046, .033],
			[0, .033]
		], 48), M.glass));
		const ticks = [];
		for (let k = 0; k <= 10; k++) {
			const a = three.MathUtils.degToRad(225 - k * 27);
			ticks.push(at(box(.0012, k % 5 === 0 ? .009 : .005, 4e-4, 2e-4), 0, .037, 0).rotateZ(a - Math.PI / 2).translate(0, 0, .0296));
		}
		gauge.add(m(GEO.merge(ticks), M.satin));
		const needle = new three.Group();
		needle.position.z = .0302;
		needle.add(m(at(box(.002, .036, 8e-4, 3e-4), 0, .014, 0), M.needle), m(rodZ(.003, -6e-4, 6e-4), M.satin));
		gauge.add(needle);
		gauge.add(m(hose([
			[
				0,
				0,
				-.002
			],
			[
				0,
				-.06,
				-.06
			],
			[
				.02,
				-.16,
				-.08
			],
			[
				.045,
				-.19,
				-.08
			]
		], .004), M.hose));
		part({
			id: "gauge",
			label: "Pressure gauge",
			assembly: "hydraulics",
			source: SRC.v156,
			what: "A liquid-filled gauge on the pressure line, added in April 2015: the operator sees at a glance how hard the cube is working.",
			moves: "Its needle swings with the pressure.",
			specs: [["Range", "0–5,000 psi"], ["Added", "April 2015 (v15.6)"]]
		}, [gauge], {
			explode: [
				0,
				.06,
				-.14
			],
			tag: {
				text: "Pressure gauge",
				at: [
					ga[0],
					ga[1] + .05,
					ga[2] - .03
				],
				value: () => `${fmt(sim.s.p / PSI)} psi · ${fmt(sim.s.p / 1e5)} bar`,
				side: "left"
			}
		});
		moving.needle = needle;
		const cp = [];
		for (const [x, capM] of [[.23, M.capRed], [.29, M.capBlue]]) {
			cp.push(m(latheZ([
				[0, -.3],
				[.014, -.3],
				[.014, -.322],
				[.018, -.326],
				[.018, -.36],
				[.016, -.364],
				[0, -.364]
			], 40).translate(x, .2516, 0), M.brass));
			cp.push(m(cyl([
				x,
				.2516,
				-.364
			], [
				x,
				.2516,
				-.384
			], .019, 32), capM));
		}
		cp.push(m(at(box(.15, .045, .006, .002), .26, .2516, -.326), M.zinc));
		part({
			id: "couplers",
			label: "Quick couplers",
			assembly: "hydraulics",
			count: 2,
			source: SRC.man,
			what: "The cube’s whole connection to a machine: the pressure coupler (red cap) and the return coupler (blue) on its back. Push the machine’s hoses on and the cube drives it; pull them off and it is free for the next one.",
			specs: [["Size", "1/2\" ISO 7241-A [inferred]"], ["Rated", "3,000 psi"]]
		}, cp, {
			explode: [
				.06,
				0,
				-.22
			],
			tag: {
				text: "Couplers P · T",
				at: [
					.26,
					.2516,
					-.38
				],
				value: () => `${fmt(sim.s.qLoad * 6e4, 1)} L/min to the work`,
				side: "right"
			}
		});
		part({
			id: "return-hose",
			label: "Return hoses",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "From the return coupler through the cooler and the filter back into the tank: everything the machine sends back.",
			specs: [["Hose", "3/4\" SAE 100R1 [inferred]"]]
		}, [m(hose([
			[
				.29,
				.2516,
				-.3
			],
			[
				.3,
				.2,
				-.28
			],
			[
				.318,
				.152,
				-.272
			]
		], .013), M.hose), m(hose([
			[
				.318,
				.312,
				.032
			],
			[
				.318,
				.42,
				0
			],
			[
				.318,
				.53,
				-.08
			],
			[
				.31,
				.585,
				-.16
			],
			[
				.22,
				.585,
				-.21
			],
			[
				.185,
				.572,
				-.22
			]
		], .013), M.hose)], { explode: [
			.16,
			.06,
			-.06
		] });
		const co = [];
		const tubes = [];
		for (let k = 0; k < 6; k++) tubes.push(cyl([
			.318,
			.152 + k * .032,
			-.272
		], [
			.318,
			.152 + k * .032,
			.032
		], .0065, 16));
		co.push(m(GEO.merge(tubes), M.copper));
		const fins = [];
		for (let z = -.262; z < .026; z += .006) fins.push(at(slab(.026, .188, 5e-4), .318, .232, z));
		co.push(m(GEO.merge(fins), M.finAl));
		for (const z of [-.272, .032]) co.push(m(cyl([
			.318,
			.14,
			z
		], [
			.318,
			.324,
			z
		], .013, 24), M.machinedAl));
		const guard = rrect(.31, .2, .012);
		guard.holes.push(rrect(.29, .18, .006));
		const bars = [plate(guard, .004, 4)];
		for (let k = 1; k < 6; k++) bars.push(at(slab(.004, .18, .004), -.145 + k * .0483, 0, 0));
		co.push(m(GEO.merge(bars).rotateY(Math.PI / 2).translate(.334, .232, -.12), M.satin));
		part({
			id: "cooler",
			label: "Oil cooler (six tubes)",
			assembly: "hydraulics",
			source: SRC.v156,
			what: "The 7s cooler on the cube’s right side: the returning oil runs through six finned tubes before the filter, giving the heat of every loss to the air its fan pulls through.",
			specs: [
				["Type", "6-tube, finned, fan-cooled"],
				["Rejects", "~150 W per °C over the air [inferred]"],
				["Added", "7s"]
			]
		}, co, {
			explode: [
				.2,
				0,
				0
			],
			tag: {
				text: "Oil cooler",
				at: [
					.33,
					.33,
					-.12
				],
				value: () => `${fmt(150 * (sim.s.T - 20) / 1e3, 1)} kW to the air`,
				side: "right"
			}
		});
		const fan = new three.Group();
		fan.position.set(.29, .232, -.12);
		const blade = new three.Group();
		blade.add(m(GEO.rotor({
			count: 5,
			axis: "x",
			r0: .018,
			r1: .075,
			chord: [.04, .05],
			thick: .06,
			camber: .05,
			twist: .4,
			pitch: .5,
			nS: 6,
			nC: 8
		}), M.satin), m(latheX([
			[0, 0],
			[.02, 0],
			[.02, .018],
			[0, .022]
		], 24), M.satin));
		fan.add(blade);
		fan.add(m(cyl([
			-.035,
			0,
			0
		], [
			-.005,
			0,
			0
		], .025, 28), M.black));
		const shroudRing = new three.Shape();
		shroudRing.absarc(0, 0, .088, 0, Math.PI * 2, false);
		shroudRing.holes.push(ring(0, 0, .081));
		fan.add(m(ext(shroudRing, .03, 8e-4).rotateY(Math.PI / 2).translate(.012, 0, 0), M.satin));
		part({
			id: "cooler-fan",
			label: "Cooler fan",
			assembly: "hydraulics",
			source: SRC.v156,
			what: "The 12 V fan pulling air through the cooler’s fins into the cube.",
			moves: "Turns while the engine runs.",
			drive: "12 V from the battery",
			specs: [["Voltage", "12 V"], ["Diameter", "160 mm [inferred]"]]
		}, [fan], { explode: [
			.06,
			0,
			.04
		] });
		moving.fan = blade;
		part({
			id: "filter",
			label: "Return filter",
			assembly: "hydraulics",
			source: SRC.man,
			what: "A spin-on filter on the tank’s top where the return enters it: everything that comes back from the machine passes through it.",
			specs: [["Flow", "20 gpm (v4 BOM)"], ["Element", "10 µm [inferred]"]]
		}, [
			m(at(box(.07, .022, .07, .006), .15, rv.y1 + .011, -.22), M.machinedAl),
			m(cyl([
				.15,
				rv.y1 + .022,
				-.22
			], [
				.15,
				rv.y1 + .094,
				-.22
			], .046, 40), M.capRed),
			m(cyl([
				.15,
				rv.y1 + .094,
				-.22
			], [
				.15,
				rv.y1 + .098,
				-.22
			], .042, 40), M.capRed)
		], { explode: [
			0,
			.22,
			-.1
		] });
		part({
			id: "breather",
			label: "Filler and breather cap",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "Where the tank is filled, and how it breathes as the machine’s cylinders draw oil out and give it back.",
			specs: [["Filter", "10 µm air breather [inferred]"]]
		}, [m(cyl([
			-.06,
			rv.y1,
			-.22
		], [
			-.06,
			rv.y1 + .02,
			-.22
		], .02, 24), M.zinc), m(cyl([
			-.06,
			rv.y1 + .02,
			-.22
		], [
			-.06,
			rv.y1 + .05,
			-.22
		], .035, 36), M.plastic)], { explode: [
			0,
			.2,
			-.06
		] });
		part({
			id: "sight-gauge",
			label: "Sight gauge",
			assembly: "hydraulics",
			source: SRC.vii,
			what: "A window on the tank’s back above the strainer: the oil’s level and colour at a glance.",
			specs: [["Length", "127 mm [inferred]"]]
		}, [
			m(at(box(.026, .13, .008, .003), -.2, .445, rv.z0 - .004), M.zinc),
			m(at(box(.012, .11, .006, .002), -.2, .445, rv.z0 - .008), M.glass),
			m(at(box(.01, .11 * level, .004, .001), -.2, .4351, rv.z0 - .008), M.oil)
		], { explode: [
			0,
			.04,
			-.16
		] });
	}
	{
		const ft = {
			w: .56,
			h: .1,
			d: .44,
			y: .567,
			z: .08
		};
		const shell = box(ft.w, ft.h, ft.d, .02);
		const fuel = m(at(box(ft.w - .01, ft.h * .7, ft.d - .01, .012), 0, ft.y + .005 + ft.h * .35, ft.z), M.fuel);
		part({
			id: "fuel-tank",
			label: "Fuel tank",
			assembly: "controls",
			source: SRC.vii,
			what: "The removable petrol tank on top of the cube, over the engine: lift it off to fill it away from the machine. Moulded of natural polyethylene, so the petrol’s level shows through its wall.",
			specs: [
				["Material", "HDPE, natural [inferred]"],
				["Volume", `${fmt(ft.w * ft.h * ft.d * 1e3 * .95, 1)} L (7 gal nominal)`],
				["Fuel", "Petrol (gasoline)"],
				["Removable", "Yes"]
			]
		}, [
			m(at(shell, 0, ft.y + ft.h / 2, ft.z), M.hdpe),
			m(GEO.merge([
				-.12,
				0,
				.12
			].map((x) => at(box(.012, .006, ft.d - .06, .003), x, ft.y + ft.h + .002, ft.z))), M.hdpe),
			m(cyl([
				.18,
				ft.y + ft.h,
				.24
			], [
				.18,
				ft.y + ft.h + .016,
				.24
			], .024, 28), M.capRed)
		], {
			explode: [
				0,
				.3,
				0
			],
			xray: "shell",
			tag: {
				text: "Fuel tank",
				at: [
					-.2,
					ft.y + ft.h,
					.2
				],
				value: () => sim.s.fuel > 0 ? `${fmt(sim.s.fuel, 1)} L/h · ${fmt(ft.w * ft.h * ft.d * 1e3 * .7 / sim.s.fuel, 1)} h left` : "stopped",
				side: "left"
			}
		});
		part({
			id: "fuel",
			label: "Petrol",
			assembly: "controls",
			source: SRC.vii,
			what: "The fuel at 70 % of the tank: what the engine burns, about 0.37 kg for every kWh it makes at full load.",
			specs: [["Burns", "0.37 kg/kWh at full load [inferred]"]]
		}, [fuel], { explode: [
			0,
			.4,
			0
		] });
		part({
			id: "fuel-line",
			label: "Fuel line and shut-off",
			assembly: "controls",
			source: SRC.vii,
			what: "From the tank’s outlet down the front through a shut-off valve and an inline filter to the carburettor.",
			specs: [["Line", "1/4\" fuel hose"]]
		}, [
			m(hose([
				[
					-.22,
					ft.y,
					.27
				],
				[
					-.22,
					.5,
					.27
				],
				[
					-.17,
					.45,
					.2
				],
				[
					-.06,
					.43,
					.08
				],
				[
					-.028,
					.42,
					CRANK.z + .02
				]
			], .004), M.black),
			m(at(box(.016, .02, .02, .003), -.22, .54, .27), M.brass),
			m(cyl([
				-.19,
				.468,
				.235
			], [
				-.17,
				.452,
				.21
			], .009, 16), M.glass)
		], { explode: [
			-.1,
			.12,
			.12
		] });
		const bt = {
			x: .231,
			y: B + .0127,
			z: .19,
			w: .132,
			h: .186,
			d: .197
		};
		part({
			id: "battery",
			label: "12 V battery",
			assembly: "controls",
			source: SRC.vii,
			what: "The cube’s own 12 V battery in the front corner: it cranks the starter, runs the cooler fan and the machine’s valves; the flywheel alternator charges it.",
			specs: [["Size", "Group U1, 197 × 132 × 186 mm"], ["Capacity", "~32 Ah, 300 CCA [inferred]"]]
		}, [
			m(at(box(bt.w, bt.h, bt.d, .006), bt.x, bt.y + bt.h / 2, bt.z), M.battery),
			m(cyl([
				bt.x - .035,
				bt.y + bt.h,
				bt.z + .07
			], [
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z + .07
			], .008, 16), M.lead),
			m(cyl([
				bt.x - .035,
				bt.y + bt.h,
				bt.z - .07
			], [
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z - .07
			], .008, 16), M.lead),
			m(at(box(.15, .004, .025, .001), bt.x, bt.y + bt.h + .002, bt.z), M.zinc)
		], { explode: [
			.2,
			0,
			.16
		] });
		part({
			id: "cables",
			label: "Battery cables",
			assembly: "controls",
			source: SRC.vii,
			what: "The red cable from the battery across the front to the starter’s solenoid, the black to the frame.",
			specs: [["Gauge", "6 AWG [inferred]"]]
		}, [m(hose([
			[
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z + .07
			],
			[
				.15,
				.33,
				.3
			],
			[
				-.05,
				.13,
				.3
			],
			[
				-.105,
				.2,
				.15
			]
		], .0055), M.capRed), m(hose([
			[
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z - .07
			],
			[
				.29,
				.33,
				.1
			],
			[
				.3,
				B + .02,
				.1
			]
		], .0055), M.satin)], { explode: [
			.14,
			.06,
			.18
		] });
		const panel = new three.Group();
		panel.add(m(at(box(.11, .17, .004, .003), .275, .5, Z + .003), M.satin));
		panel.add(m(cyl([
			.25,
			.54,
			Z + .005
		], [
			.25,
			.54,
			Z + .02
		], .014, 24), M.steel), m(at(box(.004, .022, .004, .001), .25, .54, Z + .024), M.brass));
		panel.add(m(cyl([
			.3,
			.54,
			Z + .005
		], [
			.3,
			.54,
			Z + .03
		], .0035, 12), M.zinc), m(cyl([
			.3,
			.54,
			Z + .03
		], [
			.3,
			.54,
			Z + .04
		], .009, 20), M.yellow));
		panel.add(m(at(box(.05, .02, .01, .002), .275, .46, Z + .008), M.satin), m(at(box(.035, .012, .002, .001), .275, .46, Z + .0135), M.glass));
		const tl = new three.Group();
		tl.position.set(.275, .43, Z + .006);
		tl.add(m(at(box(.006, .04, .006, .001), 0, .02, .004), M.green), m(at(box(.016, .01, .012, .002), 0, .04, .006), M.green));
		panel.add(tl);
		part({
			id: "panel",
			label: "Control panel",
			assembly: "controls",
			source: SRC.vii,
			what: "On the front corner post: the key switch (off, run, start), the choke knob, the throttle lever that sets the governor’s speed, and an hour meter. The cube is started here and left running; the machine’s valves do the rest.",
			moves: "Key, choke and throttle are worked by hand.",
			specs: [
				["Key", "Off / run / start"],
				["Choke", "Pull knob"],
				["Throttle", "Lever: 1,750 to 3,600 rpm"]
			]
		}, [panel], { explode: [
			.14,
			.06,
			.14
		] });
		moving.lever = tl;
	}
	const ctl = {
		speed: {
			label: "Engine speed (governor)",
			min: 1800,
			max: 3600,
			value: speed,
			step: 50,
			unit: "rpm",
			ends: ["Low", "Rated 3,600"]
		},
		load: {
			label: "Load pressure (the work)",
			min: 0,
			max: 2900,
			value: load,
			step: 10,
			unit: "psi",
			ends: ["Free flow", "Near relief"]
		}
	};
	const sim = solver(ctl);
	const cd = PUMP.teeth * PUMP.module, pz = PUMP.z0 - .01 - PUMP.width / 2;
	const flowPaths = [
		[
			[
				-.2,
				.36,
				-.25
			],
			[
				-.2,
				.3,
				-.25
			],
			[
				-.15,
				.27,
				-.255
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.258
			],
			[
				-.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				-.02,
				CRANK.y + cd + .012,
				pz
			],
			[
				.02,
				CRANK.y + cd + .012,
				pz
			],
			[
				.05,
				CRANK.y + cd / 2,
				pz
			]
		],
		[
			[
				-.2,
				.36,
				-.248
			],
			[
				-.2,
				.3,
				-.248
			],
			[
				-.15,
				.27,
				-.252
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.256
			],
			[
				-.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				-.02,
				CRANK.y - .012,
				pz
			],
			[
				.02,
				CRANK.y - .012,
				pz
			],
			[
				.05,
				CRANK.y + cd / 2,
				pz
			]
		],
		[
			[
				.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				.1,
				.27,
				-.255
			],
			[
				.13,
				.3,
				-.255
			],
			[
				.155,
				.28,
				-.255
			],
			[
				.2,
				.25,
				-.29
			],
			[
				.23,
				.2516,
				-.36
			]
		],
		[
			[
				.29,
				.2516,
				-.36
			],
			[
				.3,
				.2,
				-.28
			],
			[
				.318,
				.152,
				-.272
			],
			[
				.318,
				.152,
				.03
			],
			[
				.318,
				.216,
				.03
			],
			[
				.318,
				.216,
				-.27
			],
			[
				.318,
				.28,
				-.27
			],
			[
				.318,
				.28,
				.03
			],
			[
				.318,
				.42,
				0
			],
			[
				.318,
				.53,
				-.08
			],
			[
				.31,
				.585,
				-.16
			],
			[
				.22,
				.585,
				-.21
			],
			[
				.15,
				.57,
				-.22
			],
			[
				.15,
				.5,
				-.22
			],
			[
				.12,
				.42,
				-.2
			]
		],
		[
			[
				.13,
				.3,
				-.255
			],
			[
				.13,
				.33,
				-.255
			],
			[
				.13,
				.36,
				-.255
			],
			[
				.1,
				.42,
				-.24
			]
		]
	];
	const flow = new Flow({ theme: "paper" }, {
		parent: root,
		paths: flowPaths,
		count: 420,
		length: .05,
		seed: 7,
		perPath: [
			1,
			1,
			1,
			1,
			0
		],
		color: () => tCol(sim.s.T)
	});
	/** the oil's colour by its temperature: cool blue to hot amber @param {number} T */
	const tCol = (T) => {
		const k = clamp((T - 30) / 60);
		return [
			lerp(.2, 1, k),
			lerp(.45, .5, k),
			lerp(.95, .1, k)
		];
	};
	const turnPin = new three.Vector3();
	kit.onTick((dt, env) => {
		sim.step(dt, env);
		const s = sim.s, a = s.ang;
		moving.crank.rotation.z = moving.fly.rotation.z = moving.cpl.rotation.z = -a;
		moving.drive.rotation.z = -a;
		moving.idler.rotation.z = a + Math.PI / PUMP.teeth;
		turnPin.set(r * Math.sin(a), r * Math.cos(a), 0);
		for (const [side, sx] of banks) {
			const d = axis(sx), phi = sx * ENGINE.bank;
			const along = r * Math.cos(a - phi), across = r * Math.sin(a - phi);
			const sPin = along + Math.sqrt(ENGINE.rod ** 2 - across ** 2);
			const pin = d.clone().multiplyScalar(sPin);
			const pis = moving[`piston-${side}`], rod = moving[`rod-${side}`];
			pis.position.set(C.x + pin.x, C.y + pin.y, 0);
			pis.rotation.z = -phi;
			rod.position.set(C.x + turnPin.x, C.y + turnPin.y, 0);
			rod.rotation.z = -Math.atan2(pin.x - turnPin.x, pin.y - turnPin.y);
		}
		moving.fan.rotation.x += (s.stalled ? 0 : 2800 / 60 / 12) * 2 * Math.PI * dt;
		moving.needle.rotation.z = three.MathUtils.degToRad(135 - clamp(s.p / PSI / 5e3) * 270);
		moving.throttle.rotation.z = -s.theta * 1.2;
		moving.lever.rotation.z = -.5 + (ctl.speed.value - 1800) / 1800 * 1;
		flow.speed = .5 * s.q / (57.5 / 6e4);
		flow.o.perPath[2] = s.q > 0 ? clamp((s.qLoad + s.qRelief) / s.q) : 0;
		flow.o.perPath[3] = s.q > 0 ? clamp(s.qLoad / s.q) : 0;
		flow.o.perPath[4] = s.q > 0 ? clamp(s.qRelief / s.q) * 2 : 0;
		flow.opacity = s.stalled ? 0 : clamp(.3 + s.q / (57.5 / 6e4)) * Math.max(env.cut, env.xray);
		flow.update(dt);
		const hero = lab.read;
		hero.value = s.hyd / 1e3;
		hero.bad = s.stalled || s.T > 82 || s.p > 3100 * PSI;
		hero.state = s.stalled ? env.broken ? "stalled: dead-headed, relief stuck" : "stalled: more torque than the engine has" : env.broken ? "dead-headed, relief stuck: the pressure climbing" : s.valves < 1 ? "starting, valves in neutral" : s.qRelief > 1e-6 ? "over relief" : s.T > 82 ? "oil too hot" : s.theta > .98 && sim.rpm() < s.set * .96 ? "lugging down: full throttle, the speed sagging" : "running";
		hero.sub = s.stalled ? `the pump needed ${fmt(lastTp)} N·m at ${fmt(lastP / PSI)} psi, the engine gives at most ${fmt(best(ctl.speed.value))} at this setting · ${env.broken ? "take the break back" : "move a slider"} to restart` : `${fmt(s.q * 6e4, 1)} L/min (${fmt(s.q * 15850.3, 1)} gpm) · ${fmt(s.p / PSI)} psi · ${fmt(sim.rpm())} rpm · oil ${fmt(s.T)} °C · ${fmt(s.fuel, 1)} L/h`;
		if (!s.stalled) {
			lastP = s.p;
			lastTp = s.Tp;
		}
	});
	let lastP = 0, lastTp = 0;
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Hydraulic power",
			unit: "kW",
			max: 20,
			digits: 1
		},
		read: {
			value: 0,
			state: "",
			sub: "",
			bad: false
		},
		controls: ctl,
		how: {
			text: "The engine turns the gear pump on one shaft. Each turn the pump carries 16 cm³ of oil round its gears, less what slips back through its clearances (more as the pressure rises and the oil warms). The pressure is what the work needs plus the hoses’ loss, capped by the relief valve, which dumps the rest to the tank as heat. The pump’s torque grows with the pressure; the engine’s governor opens the throttle to hold its speed, and past what the engine can give the speed sags (lugging) or the engine stalls. The oil heats with every loss and the cooler gives the heat to the air (heat shown 20 times faster). Engine shown slowed 40 times.",
			eqs: [
				"Q = D n − k p (ν50/ν)      D = 16.0 cm³, slip 6 % at 3,000 psi",
				"Tp = D p / (2π ηhm)       ηhm = 0.92",
				"J dω/dt = θ Te(n) − Tp       J = 0.075 kg·m²",
				"θ = clamp((1.03 n_set − n) / (0.08 n_set))",
				"P = p Q_load",
				"C dT/dt = losses − UA (T − T_air)      UA = 162 W/K"
			]
		},
		breakIt: {
			label: "Dead-head it",
			run: () => {},
			reset: () => sim.restart()
		},
		cut: {
			a: [
				0,
				0,
				1
			],
			b: [
				0,
				1,
				0
			],
			center: [
				0,
				CRANK.y,
				CRANK.z
			],
			reach: .9
		}
	};
	kit.seal({ lab }).tick(0, {
		broken: false,
		time: 0,
		slow: 0,
		cut: 0,
		xray: 0
	});
	return root;
}

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