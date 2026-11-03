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
const ease = (x) => x * x * (3 - 2 * x);

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
const S$1 = .001;
/** the cube's size: 27" each way (W across, L along, H high), the 4×4 base's height */
const CUBE = {
	W: 686,
	L: 660,
	H: 686,
	base: 101.6
};
/** the crank's height and the shaft's line (x 0), the flywheel's y, the coupling's, the cooler fan's place */
const CRANK = 235;
const FLY = 262;
const CPL = -168;
const FAN = [
	360,
	-40,
	230
];
const RED$1 = "#c8372d";
const FRAME = "#c8372d";
const STEEL$1 = "#8d9396";
const DARK$1 = "#2b2d2f";
const ENGINE = "#2f3133";
const BLACK$1 = "#161718";
const ALU$1 = "#b9bdbf";
const HOSE$1 = "#202224";
const BRASS = "#c9a03a";
const YELLOW$1 = "#f0c419";
const GREEN$1 = "#2c7a4a";
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
function powerCubeParts(kit, { at, base, joints, assembly, step, prefix = "pc-", unit, len = CUBE.L, engine = true, controls = true, insides }) {
	const m = new three.Matrix4().makeTranslation(...at);
	/** a point of the cube (mm) in the actor @param {number} x @param {number} y @param {number} z @returns {V3} */
	const L = (x, y, z) => [
		x * S$1,
		z * S$1,
		y * S$1
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 2) => T(block(w * S$1, h * S$1, l * S$1, L(x, y, z), r * S$1));
	const bar = (a, b, w, h, r = 2) => T(beam(L(...a), L(...b), w * S$1, h * S$1, r * S$1));
	/** @param {MM} a @param {MM} b @param {number} r @param {number} [seg] @param {number} [r1] */
	const cyl = (a, b, r, seg = 18, r1 = r) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
		const g = new three.CylinderGeometry(r1 * S$1, r * S$1, A.distanceTo(B), seg);
		g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
		return T(g);
	};
	const hose = (pts, r = 9.5) => T(new three.TubeGeometry(new three.CatmullRomCurve3(pts.map((p) => new three.Vector3(...L(...p)))), 24, r * S$1, 8, false));
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
			], t, leg).translate(sx * (-t / 2) * S$1, 0, 0));
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
	const W = CUBE.W / 2, Lh = LEN / 2, H = CUBE.H, B = CUBE.base;
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
		for (const y of [-Lh + 40, Lh - 40]) put(box(0, y, B / 2, CUBE.W - 203, 50.8, 50.8, 3), FRAME);
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
		for (const z of [B + 60, B + 220]) put(box(0, -Lh - 5, z, CUBE.W - 40, 9.5, 101.6, 2), STEEL$1);
		put(box(0, -Lh - 40, B + 140, 203, 70, 101.6, 6), STEEL$1);
		for (const sx of [-1, 1]) put(cyl([
			sx * 120,
			-Lh - 30,
			B + 270
		], [
			sx * 120,
			-Lh - 30,
			B + 330
		], 12, 10), STEEL$1);
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
			const g = new three.TorusGeometry(26 * S$1, 7 * S$1, 8, 16);
			put(T(g.translate(...L(sx * 180, 0, H + 26))), STEEL$1);
		}
	});
	if (engine) {
		part("engine", {
			id: "engine-plate",
			label: "Engine mount plate",
			source: SRC$1.vii,
			what: "The plate the engine’s base bolts to, itself bolted across the skids: it holds the engine’s shaft exactly in line with the pump’s.",
			specs: [["VII engine module plate", "8\" × 15½\" (203 × 394 mm)"], ["Generic mounts", "1/4\" × 8\" × 9\" and × 12\", welded at 90°"]]
		}, base, (put) => put(box(0, 40, B + 6, CUBE.W - 140, 394, 12, 2), STEEL$1));
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
			put(box(0, 30, 225, 250, 300, 240, 26), ENGINE);
			put(box(0, 30, B + 22, 300, 290, 20, 6), DARK$1);
			for (const sx of [-1, 1]) for (const y of [-90, 150]) put(cyl([
				sx * 170,
				y,
				B + 12
			], [
				sx * 170,
				y,
				B + 24
			], 11, 6), STEEL$1);
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
			put(cyl(at(100), at(250), 50, 18), DARK$1);
			for (let k = 112; k < 250; k += 13) put(cyl(at(k), at(k + 4), 70, 18), ENGINE);
			put(cyl(at(250), at(305), 68, 16), ENGINE);
			const g = block(.12, .04, .15, [
				0,
				0,
				0
			], .012);
			g.rotateZ(-sx * Math.PI / 4);
			g.translate(...L(...at(320)));
			put(T(g), BLACK$1);
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
			], 115, 32), DARK$1);
			for (let k = 0; k < 6; k++) {
				const g = block(.22, .012, .006, [
					0,
					0,
					0
				], .002);
				g.rotateZ(k / 6 * Math.PI);
				g.translate(...L(0, 275, 235));
				put(T(g), STEEL$1);
			}
			put(cyl([
				0,
				272,
				235
			], [
				0,
				280,
				235
			], 28, 16), STEEL$1);
		});
		part("engine", {
			id: "air-cleaner",
			label: "Air cleaner",
			source: SRC$1.vii,
			what: "The paper element in the V between the cylinders: every litre of air the engine breathes is cleaned here first.",
			specs: [["Element", "Paper, foam pre-cleaner"]]
		}, base, (put) => {
			put(box(0, 50, 520, 210, 190, 56, 14), BLACK$1);
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
			], 9, 8), DARK$1);
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
			], 36, 16), DARK$1);
			put(cyl([
				-150,
				230,
				150
			], [
				-150,
				248,
				150
			], 20, 12), STEEL$1);
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
			], 34, 18), STEEL$1);
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
			], 6, 6), DARK$1);
		});
		part("hydraulics", {
			id: "pump-mount",
			label: "Pump mount",
			source: SRC$1.vii,
			what: "A plate on the engine plate holding the pump’s SAE-A flange square to the engine, its two bolts on 4.19\" centres, so the shafts stay in line.",
			specs: [["Flange", "SAE A: Ø3.25\" pilot, 2 × 3/8-16 on 4.19\""]]
		}, base, (put) => {
			put(box(0, -215, 185, 200, 12.7, 230, 4), STEEL$1);
			put(box(0, -170, B + 30, 200, 100, 12, 2), STEEL$1);
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
			], 20, 12), STEEL$1);
			put(cyl([
				52,
				-275,
				235
			], [
				75,
				-275,
				235
			], 14, 12), STEEL$1);
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
			put(box(0, -Lh + 120, 450, CUBE.W - 40, 180, 200, 10), "#3d4447");
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
		], 15), HOSE$1));
		part("hydraulics", {
			id: "relief",
			label: "Relief valve",
			source: SRC$1.v156,
			what: "Added to the cube in October 2014: a spring-loaded valve that dumps the pump’s flow back to the tank when the pressure reaches its setting, so nothing bursts when a cylinder bottoms out or a wheel stalls.",
			moves: "Its poppet lifts only at its setting.",
			specs: [["Setting", "≤3,000 psi"], ["Added", "October 2014 (v15.6)"]]
		}, base, (put) => {
			put(box(110, -300, 325, 60, 50, 60, 4), ALU$1);
			put(cyl([
				110,
				-300,
				355
			], [
				110,
				-300,
				405
			], 13, 12), STEEL$1);
			put(hose([[
				75,
				-275,
				235
			], [
				110,
				-300,
				295
			]], 8), HOSE$1);
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
			], 32, 24), STEEL$1);
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
			], 9, 10), ALU$1);
			for (let y = -190; y <= 110; y += 14) put(box(W - 30, y, 230, 26, 2, 200, .5), "#8e9496");
			put(box(W - 10, -40, 230, 8, 330, 230, 4), DARK$1);
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
				put(T(g), BLACK$1);
			}
			put(cyl([
				FAN[0] - 10,
				FAN[1],
				FAN[2]
			], [
				FAN[0] + 14,
				FAN[1],
				FAN[2]
			], 24, 14), DARK$1);
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
			], 44, 18), STEEL$1);
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
			], 20, 14), STEEL$1);
			put(cyl([
				-60,
				-Lh + 120,
				575
			], [
				-60,
				-Lh + 120,
				605
			], 36, 18), BLACK$1);
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
			for (const [x, c] of [[230, RED$1], [290, "#2f6fb5"]]) {
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
			], 9), HOSE$1);
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
			], 9), HOSE$1);
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
			], 9), HOSE$1);
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
			put(box(0, 90, 630, CUBE.W - 70, 400, 95, 14), RED$1);
			put(cyl([
				200,
				200,
				677
			], [
				200,
				200,
				700
			], 22, 14), BLACK$1);
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
			], 4), BLACK$1);
		});
		part("controls", {
			id: "battery",
			label: "12 V battery",
			source: SRC$1.vii,
			what: "The cube’s own 12 V battery beside the engine: it cranks the starter, runs the cooler fan and the machine’s valves; the flywheel alternator charges it.",
			specs: [["Voltage", "12 V"], ["Charged by", "Flywheel alternator"]]
		}, base, (put) => {
			put(box(-260, 70, 205, 125, 240, 190, 6), BLACK$1);
			for (const [y, c] of [[-10, RED$1], [150, BLACK$1]]) put(cyl([
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
			put(box(W - 60, Lh - 3, 470, 110, 6, 170, 4), DARK$1);
			put(cyl([
				W - 85,
				Lh,
				520
			], [
				W - 85,
				Lh + 18,
				520
			], 16, 14), STEEL$1);
			put(cyl([
				W - 40,
				Lh,
				520
			], [
				W - 40,
				Lh + 24,
				520
			], 9, 10), YELLOW$1);
			put(box(W - 60, Lh + 12, 420, 60, 20, 14, 3), GREEN$1);
		});
	}
}
/** @typedef {(geo: THREE.BufferGeometry, color: string, mat?: number) => void} Put */
/** @typedef {{ box: (x: number, y: number, z: number, w: number, l: number, h: number, r?: number) => THREE.BufferGeometry, bar: (a: MM, b: MM, w: number, h: number, r?: number) => THREE.BufferGeometry, cyl: (a: MM, b: MM, r: number, seg?: number, r1?: number) => THREE.BufferGeometry, hose: (pts: MM[], r?: number) => THREE.BufferGeometry, T: (g: THREE.BufferGeometry) => THREE.BufferGeometry, L: (x: number, y: number, z: number) => V3, P: (x: number, y: number, z: number) => V3, kit: ReturnType<typeof machineKit>, W: number, Lh: number, H: number, B: number, joints: { flywheel: string, coupling: string, fan: string }, base: string }} Tools what a cube's insides are drawn with: mm in the cube's frame */
/** @typedef {(part: (g: Group, info: any, joint: string, make: (put: Put) => void) => void, tools: Tools) => void} Insides */
/** where a Power Cube's moving joints are, its foot's middle at `at` @param {V3} at @returns {{ flywheel: V3, coupling: V3, fan: V3 }} */
function powerCubeJoints(at) {
	const L = (x, y, z) => [
		at[0] + x * S$1,
		at[1] + z * S$1,
		at[2] + y * S$1
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

//#endregion
//#region src/lib/actors/lifetrac.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Cast} Cast */
/** @typedef {import('./rig').BoneSpec} BoneSpec */
/** @typedef {[number, number, number]} MM a point in OSE's coordinates, mm */
const GREEN = "#1f5e50";
const ARM = "#45b58f";
const STEEL = "#8d9396";
const DARK = "#2b2d2f";
const ORANGE = "#ef9a1c";
const CHROME = "#dcdcd8";
const YELLOW = "#e9c21b";
const TYRE = "#1b1c1e";
const RIM = "#c9cbc6";
const BLACK = "#161718";
const RED = "#d8302a";
const AMBER = "#ffb21a";
const PCB = "#1f6b3a";
const HOSE = "#202224";
const ALU = "#b9bdbf";
const LED = "#43f08a";
const S = .001;
/** the actor's middle: this far forward of the frame's back (mm) */
const BACK = 760;
/** a point of OSE's CAD in the actor @param {number} X @param {number} Y @param {number} Z @returns {V3} */
const P = (X, Y, Z) => [
	X * S,
	Z * S,
	(Y - BACK) * S
];
const V = (a) => new three.Vector3(...P(...a));
/** a box: its middle, w across (X), l along (Y), h high (Z) @param {number} X @param {number} Y @param {number} Z @param {number} w @param {number} l @param {number} h @param {number} [r] */
const box = (X, Y, Z, w, l, h, r = 2) => block(w * S, h * S, l * S, P(X, Y, Z), r * S);
/** a bar from a to b, w across and h deep @param {MM} a @param {MM} b @param {number} w @param {number} h @param {number} [r] */
const bar = (a, b, w, h, r = 2) => beam(P(...a), P(...b), w * S, h * S, r * S);
/** a round bar from a to b @param {MM} a @param {MM} b @param {number} r @param {number} [seg] @param {number} [r1] */
function cyl(a, b, r, seg = 18, r1 = r) {
	const A = V(a), B = V(b);
	const g = new three.CylinderGeometry(r1 * S, r * S, A.distanceTo(B), seg);
	g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
	return g;
}
/** a disc or round bar across, from X0 to X1 @param {number} X0 @param {number} X1 @param {number} Y @param {number} Z @param {number} r @param {number} [seg] */
const xcyl = (X0, X1, Y, Z, r, seg = 24) => cyl([
	X0,
	Y,
	Z
], [
	X1,
	Y,
	Z
], r, seg);
/** a hex head (a bolt's or a nut's) at a point, along an axis @param {MM} at @param {'x' | 'y' | 'z'} axis @param {number} [af] @param {number} [h] */
function hex(at, axis, af = 19, h = 8) {
	const g = new three.CylinderGeometry(af / Math.sqrt(3) * S, af / Math.sqrt(3) * S, h * S, 6);
	if (axis === "x") g.rotateZ(Math.PI / 2);
	if (axis === "y") g.rotateX(Math.PI / 2);
	g.translate(...P(...at));
	return g;
}
/** a plate standing on its edge in the side plane, its outline in (Y, Z), from X0 to X0 + t @param {[number, number][]} pts @param {number} X0 @param {number} t */
function side(pts, X0, t) {
	const sh = new three.Shape(pts.map(([y, z]) => new three.Vector2((y - BACK) * S, z * S)));
	const g = new three.ExtrudeGeometry(sh, {
		depth: t * S,
		bevelEnabled: false,
		curveSegments: 16
	});
	g.rotateY(-Math.PI / 2);
	g.translate((X0 + t) * S, 0, 0);
	return g;
}
/** a box w (X) × h × l tilted `a` (rad, up from forward, in the side plane), its middle at a point @param {number} w @param {number} h @param {number} l @param {number} a @param {MM} at */
function tilted(w, h, l, a, at) {
	const g = block(w * S, h * S, l * S, [
		0,
		0,
		0
	], 2 * S);
	g.rotateX(-a);
	g.translate(...P(...at));
	return g;
}
/** a hose along points @param {MM[]} pts @param {number} [r] */
const hose = (pts, r = 9.5) => new three.TubeGeometry(new three.CatmullRomCurve3(pts.map(V)), Math.max(12, pts.length * 10), r * S, 8, false);
/** a ring round x (a tyre's section turned on a lathe) @param {[number, number][]} prof (radius, x) @param {number} X @param {number} Y @param {number} Z @param {number} [seg] */
function lathe(prof, X, Y, Z, seg = 40) {
	const g = new three.LatheGeometry(prof.map(([r, x]) => new three.Vector2(r * S, x * S)), seg);
	g.rotateZ(-Math.PI / 2);
	g.translate(...P(X, Y, Z));
	return g;
}
const D = /* @__PURE__ */ (() => Math.PI / 180)();
/** the arms' pivot (Y, Z), their angle at rest, and the arm's elbow and tip in the arm's own frame (u along, v up) */
const PIV = [200, 1100];
const TH0 = -27.71 * D;
const ELB = [1417.7, 117.8];
const TIP = [1762, -249.3];
/** a point of the arm (u, v) where it is at rest (Y, Z) @param {number} u @param {number} v @returns {[number, number]} */
const armAt = (u, v) => [PIV[0] + u * Math.cos(TH0) - v * Math.sin(TH0), PIV[1] + u * Math.sin(TH0) + v * Math.cos(TH0)];
const MAIN = /* @__PURE__ */ (() => Math.atan2(ELB[1], ELB[0]) + TH0)();
const [TY, TZ] = armAt(...TIP);
const ARM_X = 450;
const BCYL_X = 315.4;
/** the cylinders' pins at rest (Y, Z): the lift cylinders' base on the frame, rod end on the arm; the bucket cylinders'
*  base under the cross beam, rod end on the bucket */
const LIFT_A = [50, 600];
const LIFT_B = /* @__PURE__ */ (() => armAt(828.5, -114.3))();
const T3_U = 736.5;
const T3_V = /* @__PURE__ */ (() => ELB[1] * (T3_U / ELB[0]) - 76.2 - 25.4)();
const BCYL_A = /* @__PURE__ */ (() => armAt(T3_U, T3_V - 25.4 - 50))();
const BCYL_B = [TY, TZ + 300];
/** the axles: Y of the rear and the front, their height, the wheels' X */
const AX = {
	rear: 400,
	front: 1150,
	z: 308.75,
	x: 707,
	r: 308.75
};
/** the Power Cube's foot (the middle under it): on its cradle, high enough that its quick-attach clears the platform
*  folded up behind it, and short of the arms' cross beam in front; its top */
const CUBE_AT = [
	0,
	425,
	550
];
const CUBE_TOP = /* @__PURE__ */ (() => CUBE_AT[2] + CUBE.H)();
/** the deck's pivot (Y, Z) */
const DECK = [75.4, 330];
/** where the handheld sits (a holster on the back plate), tilted to the one standing behind */
const HAND = [
	0,
	-40,
	1010
];
const HAND_TILT = -.9;
/** the wheels, by corner */
const CORNERS = /* @__PURE__ */ (() => [
	{
		id: "fl",
		label: "front left",
		sx: 1,
		y: AX.front
	},
	{
		id: "fr",
		label: "front right",
		sx: -1,
		y: AX.front
	},
	{
		id: "rl",
		label: "rear left",
		sx: 1,
		y: AX.rear
	},
	{
		id: "rr",
		label: "rear right",
		sx: -1,
		y: AX.rear
	}
])();
/** the valves' stations on the manifold (across), the coils they carry and what each does */
const STATIONS = [
	{
		id: "left",
		x: 165,
		a: "D1",
		b: "D2",
		what: "the left wheels",
		ya: "forward",
		yb: "back"
	},
	{
		id: "arms",
		x: 55,
		a: "D5",
		b: "D6",
		what: "the loader arms",
		ya: "up",
		yb: "down"
	},
	{
		id: "bucket",
		x: -55,
		a: "D7",
		b: "D8",
		what: "the bucket",
		ya: "curl",
		yb: "dump"
	},
	{
		id: "right",
		x: -165,
		a: "D3",
		b: "D4",
		what: "the right wheels",
		ya: "forward",
		yb: "back"
	}
];
/** the valve manifold, on top of the cube */
const MAN_Y = 330;
const MAN_Z = CUBE_TOP + 74;
const SRC = {
	repo: "OSE LifeTrac v25 (GitHub)",
	bom: "v25 bill of materials",
	params: "v25 CAD parameters",
	hyd: "v25 hydraulic BOM",
	ctl: "v25 controller BOM",
	sa: "v25 structural analysis",
	uwu: "Universal Wheel Unit",
	lt6: "LifeTrac Genealogy (OSE wiki)"
};
/** @type {import('./parts.js').Assembly[]} */
const ASSEMBLIES = /* @__PURE__ */ (() => [
	{
		id: "frame",
		label: "Frame",
		note: "Two sandwiches of 1/2\" plate, one each side, 120 mm apart for the arms and lift cylinders to work in, bolted to a floor plate, two 6×2 cross tubes and stiffeners with grade-8 bolts. Welding only at the arm pivots and the wheel hubs.",
		out: [
			0,
			-.25,
			0
		]
	},
	...CORNERS.map((c) => ({
		id: `uwu-${c.id}`,
		label: `Wheel unit, ${c.label}`,
		note: `A Universal Wheel Unit: a 100 cc/rev hydraulic motor bolted to the motor plate, coupled straight to a 1¼" shaft in two flange bearings, a welded hub and a Bobcat wheel. No chain, no gearbox.`,
		out: [
			c.sx * .95,
			-.1,
			c.y === AX.front ? .45 : -.45
		]
	})),
	{
		id: "powercube",
		label: "Power Cube",
		note: "OSE’s Power Cube VII/7s, the same cube that drives the CEB press and the other machines of the Global Village Construction Set: a 28 hp V-twin on a gear pump with its own tanks, relief, cooler, filter and battery, set whole on the LifeTrac’s cradle and coupled by two hoses. (v25’s own bills build an 18 hp Vanguard unit into the frame instead.) It is its own asset and actor too: every part is the same there.",
		out: [
			0,
			.45,
			-.95
		]
	},
	{
		id: "hydraulics",
		label: "Hydraulic circuit",
		note: "From the cube’s pressure coupler: the proportional flow valve that sets every speed, a four-station manifold of 12 V directional valves (left wheels, right wheels, arms, bucket) on top of the cube, the hoses out to every motor and cylinder, and the return line back to the cube’s cooler and filter.",
		out: [
			0,
			1,
			.25
		]
	},
	{
		id: "arms",
		label: "Loader arms",
		note: "Two L-shaped arms, each a 6×2 tube between two 1/4\" side plates, pivoting on 1½\" pins in the frame’s sandwiches and tied together by the cross beam that carries the bucket cylinders.",
		out: [
			0,
			.75,
			.25
		]
	},
	{
		id: "cylinders",
		label: "Cylinders",
		note: "Four double-acting hydraulic cylinders: two 2.5\" lift cylinders raise the arms, two 3\" bucket cylinders curl and dump the bucket. Each is a barrel on one pin and a rod on the other.",
		out: [
			0,
			.35,
			.55
		]
	},
	{
		id: "bucket",
		label: "Bucket",
		note: "A 1,100 mm bucket of 1/4\" plate with a 3/4\" cutting edge, pinned at the arms’ tips and tipped by the bucket cylinders.",
		out: [
			0,
			.15,
			.95
		]
	},
	{
		id: "platform",
		label: "Standing platform",
		note: "A folding deck at the back for an operator to ride on; folded up when the machine is driven by radio, as it is meant to be.",
		out: [
			0,
			-.1,
			-.9
		]
	},
	{
		id: "electronics",
		label: "Controller and radio",
		note: "The tractor node: a Portenta X8 on its Max Carrier (Linux, the LoRa radio, the arbiter) driving an Arduino Opta over Modbus, whose solid-state outputs switch the eight valve coils; a safety relay and the master switch on the Power Cube’s battery, the mast with its antennas, cameras and beacon, and the handheld it obeys.",
		out: [
			0,
			1.6,
			-.3
		]
	}
])();
const STEPS = [
	"Bolt the frame: floor plate and its angle runs, back and front walls, motor plates, inner and outer side panels, cross tubes",
	"Mount the four wheel units: motors on the motor plates, shafts through the bearings, hubs, wheels",
	"Lift in the Power Cube, already built on its own, and pin it to its cradle: engine, pump, tanks, cooler and battery come in one piece",
	"Plumb the hydraulics: the flow valve and the valve manifold on the cube, the pressure and return lines to its couplers, hoses out to the motors",
	"Hang the loader arms on their pivot pins and bolt in the cross beam",
	"Pin in the lift and bucket cylinders",
	"Pin on the bucket",
	"Bolt on the folding platform",
	"Wire the controller: node box, boards, safety relay, master switch, mast, antennas, cameras, beacon, E-stop; pair the handheld"
];
/**
* LifeTrac v25, every part its own.
* @returns {Cast}
*/
function lifetrac() {
	const kit = machineKit(ASSEMBLIES);
	const part = kit.part;
	/** a side panel's outline (Y, Z): the arms' slope along its top, the pivot's boss at its back @param {number} len @param {number} drop */
	const panel = (len, drop) => [
		[0, 150],
		[len, 150],
		[len, 480 - drop],
		[1300 * (len / 1392.6), 525 - drop],
		[330, 925 - drop],
		[292, 1040 - drop],
		[268, 1128 - drop * .4],
		[232, 1166 - drop * .4],
		[200, 1176 - drop * .4],
		[168, 1168 - drop * .4],
		[128, 1150 - drop],
		[0, 1150 - drop]
	];
	for (const [sx, id, P_] of [[
		1,
		"P1",
		"left"
	], [
		-1,
		"P2",
		"right"
	]]) part({
		id: `outer-${P_}`,
		label: `Outer side panel, ${P_} (${id})`,
		assembly: "frame",
		step: 1,
		source: SRC.bom,
		what: `The outside wall of the ${P_} sandwich, the machine’s biggest part: cut from 1/2" A36 plate, it carries the arm’s pivot pin and the lift cylinder’s base pin on one side of the 120 mm gap, and the wheel bearings’ outer flanges.`,
		specs: [
			["BOM", id],
			["Stock", "PL 1/2\" (12.7 mm) A36"],
			["Size", "1,392.6 × 1,000 mm"],
			["Mass", "82.8 kg"],
			["Holes", "24"]
		]
	}, "base", (put) => put(side(panel(1392.6, 0), sx > 0 ? 510 : -522.7, 12.7), GREEN));
	for (const [sx, P_] of [[1, "left"], [-1, "right"]]) part({
		id: `inner-${P_}`,
		label: `Inner side panel, ${P_} (P3)`,
		assembly: "frame",
		step: 1,
		source: SRC.bom,
		what: "The inside wall of a sandwich: with the outer panel 120 mm away it makes the slot the loader arm and its lift cylinder swing in, so the pins are held at both ends (double shear) instead of hanging off one plate.",
		specs: [
			["BOM", "P3 (2 per machine)"],
			["Stock", "PL 1/2\" A36"],
			["Size", "1,349.2 × 968.2 mm"],
			["Mass", "75.7 kg"],
			["Gap to outer panel", "120 mm"]
		]
	}, "base", (put) => put(side(panel(1349.2, 32), sx > 0 ? 377.3 : -390, 12.7), GREEN));
	part({
		id: "floor",
		label: "Bottom stiffener plate (P7)",
		assembly: "frame",
		step: 1,
		source: SRC.bom,
		what: "The floor of the frame and its first part: the angle runs are bolted to it, then everything stands on them. It ties the bottoms of the four side panels and the motor plates together.",
		specs: [
			["BOM", "P7"],
			["Stock", "PL 1/4\" (6.35 mm) A36"],
			["Size", "1,196.8 × 1,020 mm"],
			["Mass", "60.6 kg"],
			["Holes", "80"],
			["Ground clearance", "150 mm"]
		]
	}, "base", (put) => put(box(0, 698, 153.2, 1020, 1196.8, 6.35, 1), GREEN));
	part({
		id: "floor-angles",
		label: "Bottom angle runs (A6)",
		assembly: "frame",
		step: 1,
		count: 30,
		source: SRC.bom,
		what: "Six runs of 2×2×1/4 angle, three segments each, bolted along the floor plate under every panel line: the panels and motor plates stand on their vertical legs and are bolted through them.",
		specs: [
			["BOM", "A6-1, A6-2, A6-3 (10 each)"],
			["Stock", "L2×2×1/4 A36"],
			["Segments", "200, 300 and 250 mm"]
		]
	}, "base", (put) => {
		for (const x of [
			365,
			262,
			213,
			-213,
			-262,
			-365
		]) {
			put(box(x, 698, 159.5, 50.8, 1150, 6.35, 1), STEEL);
			put(box(x + (x > 0 ? -22 : 22), 698, 182, 6.35, 1150, 50.8, 1), STEEL);
		}
	});
	part({
		id: "back-wall",
		label: "Back stiffener plate (P4)",
		assembly: "frame",
		step: 1,
		source: SRC.bom,
		what: "The back wall, closing the frame between the sandwiches high up behind the arm pivots: it squares the frame and carries the mast, the E-stop and the handheld’s holster. Below it the frame is open for the folding platform.",
		specs: [
			["BOM", "P4"],
			["Stock", "PL 1/4\" A36"],
			["Size", "1,020 × 650 mm"],
			["Mass", "33.0 kg"]
		]
	}, "base", (put) => put(box(0, 3.2, 825, 1020, 6.35, 650, 1), GREEN));
	part({
		id: "back-angles",
		label: "Back wall angles (A1, A2)",
		assembly: "frame",
		step: 1,
		count: 6,
		source: SRC.bom,
		what: "Six vertical 2×2 angles bolted to the back plate, two at its outer edges and four inside, joining it to the side panels and stiffening it.",
		specs: [
			["BOM", "A1 ×2, A2 ×4"],
			["Stock", "L2×2×1/4"],
			["Length", "650 mm"]
		]
	}, "base", (put) => {
		for (const x of [
			495,
			403,
			364,
			-364,
			-403,
			-495
		]) {
			put(box(x, 32, 825, 6.35, 50.8, 650, 1), STEEL);
			put(box(x, 9.5, 825, 50.8, 6.35, 650, 1), STEEL);
		}
	});
	part({
		id: "front-wall",
		label: "Front stiffener plates (P5, P6)",
		assembly: "frame",
		step: 1,
		count: 3,
		source: SRC.bom,
		what: "Three small plates closing the front: the centre plate low between the inner panels, and an outer plate across the front of each sandwich’s gap, all bolted through eight short angles (A10).",
		specs: [
			["BOM", "P5 ×1, P6 ×2, A10 ×8"],
			["P5", "481.6 × 260.4 mm, 6.2 kg"],
			["P6", "269.2 × 127 mm, 1.7 kg"]
		]
	}, "base", (put) => {
		put(box(0, 1389.4, 280, 481.6, 6.35, 260.4, 1), GREEN);
		for (const sx of [-1, 1]) put(box(sx * 450, 1389.4, 285, 127, 6.35, 269.2, 1), GREEN);
	});
	for (const [sx, P_] of [[1, "left"], [-1, "right"]]) part({
		id: `motor-plate-${P_}`,
		label: `Motor mounting plate, ${P_} (P8)`,
		assembly: "frame",
		step: 1,
		source: SRC.bom,
		what: "A 10\" high plate standing 6\" inboard of the inner panel the whole length of the frame: both wheel motors of its side bolt to it, their shafts passing out through the panels to the wheels.",
		specs: [
			["BOM", "P8 (2 per machine)"],
			["Stock", "PL 1/4\" A36"],
			["Size", "1,196.8 × 254 mm"],
			["Mass", "14.1 kg"],
			["Inboard of inner panel", "152.4 mm"]
		]
	}, "base", (put) => put(box(sx * 237.6, 698, 279, 6.35, 1196.8, 254, 1), GREEN));
	part({
		id: "cross-tubes",
		label: "Front and rear cross tubes (T1, T2)",
		assembly: "frame",
		step: 1,
		count: 2,
		source: SRC.bom,
		what: "Two 6×2 rectangular tubes running right across the frame through all six plates, bolted to each by angle clips: they hold the two sandwiches at their distance and keep the frame from racking.",
		specs: [
			["BOM", "T1, T2"],
			["Stock", "HSS 6×2×1/4 A500"],
			["Length", "1,070.8 mm"],
			["Mass", "20.2 kg each"],
			["Clips", "26 tube mount angles (A4)"]
		]
	}, "base", (put) => {
		for (const y of [130, 1290]) {
			put(box(0, y, 309, 1070.8, 50.8, 152.4, 3), STEEL);
			for (const x of [
				383,
				516,
				237,
				-237,
				-383,
				-516
			]) put(box(x + (x > 0 ? -10 : 10), y + 40, 309, 6.35, 50.8, 146, 1), STEEL);
		}
	});
	part({
		id: "cube-cradle",
		label: "Power Cube cradle",
		assembly: "frame",
		step: 1,
		count: 2,
		what: "Two 4×4 tubes across between the inner panels, bolted to them through angle clips: the Power Cube’s skids stand on them and are pinned down, so the cube comes off again with four pins and two hoses. Not in OSE’s v25 CAD, which builds its engine into the frame instead; sized here to carry the cube clear of the wheel motors and the shafts.",
		specs: [
			["Stock", "4\" × 4\" × 1/4\" square tube"],
			["Length", "754 mm (between the inner panels)"],
			["Top", `${CUBE_AT[2]} mm above the ground`],
			["Pins", "4 × Ø5/8\" through skid and tube"]
		]
	}, "base", (put) => {
		for (const y of [CUBE_AT[1] - 275, CUBE_AT[1] + 275]) {
			put(box(0, y, CUBE_AT[2] - 50.8, 754, 101.6, 101.6, 4), STEEL);
			for (const sx of [-1, 1]) {
				put(box(sx * 372, y, CUBE_AT[2] - 50.8, 6.35, 101.6, 101.6, 1), STEEL);
				put(cyl([
					sx * 292.2,
					y,
					CUBE_AT[2] - 110
				], [
					sx * 292.2,
					y,
					CUBE_AT[2] + 115
				], 8, 10), CHROME);
			}
		}
	});
	part({
		id: "bolts",
		label: "Grade-8 bolts, nuts and washers (F3–F8)",
		assembly: "frame",
		step: 1,
		count: 324,
		source: SRC.bom,
		what: "The frame is bolted, not welded, so it can be built with a drill and taken apart for repair: 154 half-inch and 170 three-eighths grade-8 bolts, each with its nut and two hardened washers.",
		specs: [
			["1/2-13 Gr 8", "154 bolts, 154 nuts, 308 washers"],
			["3/8-16 Gr 8", "170 bolts, 170 nuts, 340 washers"],
			["Whole machine", "1,521 pieces, 60 kinds"]
		]
	}, "base", (put) => {
		for (const sx of [-1, 1]) {
			const x = sx * 526;
			for (let y = 120; y < 1380; y += 160) put(hex([
				x,
				y,
				182
			], "x", 19, 8), DARK);
			for (const y of [130, 1290]) for (const z of [260, 360]) put(hex([
				x,
				y + 40,
				z
			], "x", 19, 8), DARK);
			for (const z of [
				560,
				720,
				880,
				1040
			]) put(hex([
				x,
				30,
				z
			], "x", 19, 8), DARK);
		}
		for (const x of [
			495,
			403,
			364,
			-364,
			-403,
			-495
		]) for (const z of [
			560,
			720,
			880,
			1040
		]) put(hex([
			x,
			-4,
			z
		], "y", 19, 8), DARK);
	});
	for (const c of CORNERS) {
		const sx = c.sx, y = c.y, z = AX.z, a = `uwu-${c.id}`, j = `wheel_${c.id}`;
		const X = (x) => sx * x;
		const front = y === AX.front;
		part({
			id: `${a}-motor`,
			label: `Wheel motor, ${c.label}`,
			assembly: a,
			step: 2,
			source: SRC.uwu,
			what: `A low-speed, high-torque hydraulic motor (orbital, gerotor class) driving the ${c.label} wheel directly. Oil from its side’s valve turns it; swapping the oil’s way through it (the valve’s other coil) turns it back.`,
			moves: "Its output shaft turns with the wheel; the body stays bolted to the motor plate.",
			drive: `The ${sx > 0 ? "left" : "right"} drive valve (${sx > 0 ? "D1 forward / D2 back" : "D3 forward / D4 back"}), its pair in parallel`,
			specs: [
				["Displacement", "100 cc/rev"],
				["Ports", "1/2\" NPT"],
				["Shaft", "Ø1\" × 1.5\""],
				["Mount", "7.5\" square flange, 4 × 1/2\" bolts on 8.25\" BCD"],
				["Body", "Ø6\" × 5\""],
				["Class", "White RS, Char-Lynn H or Parker TG (to bench-test)"]
			]
		}, "base", (put) => {
			put(xcyl(X(98), X(221), y, z, 76.2, 28), ORANGE);
			put(box(X(227.5), y, z, 12.7, 190.5, 190.5, 6), ORANGE);
			for (const [dy, dz] of [
				[1, 1],
				[1, -1],
				[-1, 1],
				[-1, -1]
			]) put(hex([
				X(214),
				y + dy * 74,
				z + dz * 74
			], "x", 19, 10), DARK);
			for (const dy of [-30, 30]) put(xcyl(X(140), X(170), y + dy, z + 82, 11, 10), STEEL);
		});
		part({
			id: `${a}-shaft`,
			label: `Wheel shaft, ${c.label} (R6)`,
			assembly: a,
			step: 2,
			source: SRC.bom,
			what: "A 1¼\" round shaft from the motor’s coupling out through both bearings to the hub: it carries the wheel’s weight on the bearings and the motor’s torque to the hub.",
			moves: "Turns with the wheel.",
			drive: "The wheel motor, through the coupling",
			specs: [
				["BOM", "R6 (4 per machine)"],
				["Stock", "Ø1-1/4\" (31.75 mm) shafting"],
				["Length", "474 mm"],
				["Mass", "2.93 kg"]
			]
		}, j, (put) => {
			put(xcyl(X(268), X(742), y, z, 15.9, 16), CHROME);
			put(box(X(560), y, z + 14, 60, 8, 4, 1), DARK);
		});
		part({
			id: `${a}-coupling`,
			label: `Shaft coupling, ${c.label}`,
			assembly: a,
			step: 2,
			source: SRC.params,
			what: "A 2\" sleeve joining the motor’s 1\" shaft to the 1¼\" wheel shaft, so the motor never carries the wheel’s load: the bearings do.",
			moves: "Turns with the shaft.",
			drive: "The motor",
			specs: [["Size", "Ø2\" × 2\""], ["Joins", "Ø1\" motor shaft to Ø1¼\" wheel shaft"]]
		}, j, (put) => {
			put(xcyl(X(240), X(291), y, z, 25.4, 18), STEEL);
			for (const xx of [252, 279]) put(hex([
				X(xx),
				y,
				z + 26
			], "z", 10, 6), DARK);
		});
		part({
			id: `${a}-bearings`,
			label: `Flange bearings, ${c.label}`,
			assembly: a,
			step: 2,
			count: 2,
			source: SRC.uwu,
			what: "Two 4-bolt flange bearings, one on the inner panel and one on the outer, holding the shaft at both ends of the sandwich so the wheel’s load is carried across the 120 mm gap.",
			moves: "Their inner races turn with the shaft; the housings are bolted still.",
			specs: [
				["Bore", "1-1/4\""],
				["Housing", "Ø2.5\""],
				["Bolts", "4 × 1/2\" on 6.19\" BCD"],
				["Pattern", "Bolted at 45°"]
			]
		}, "base", (put) => {
			for (const [x0, x1] of [[346, 377], [523, 554]]) {
				put(box(X((x0 + x1) / 2), y, z, x1 - x0, 145, 145, 14), DARK);
				put(xcyl(X(x0 - 6), X(x1 + 6), y, z, 31.75, 20), STEEL);
				for (const [dy, dz] of [
					[1, 1],
					[1, -1],
					[-1, 1],
					[-1, -1]
				]) put(hex([
					X(sx > 0 ? x1 + 2 : x0 - 2),
					y + dy * 55.6,
					z + dz * 55.6
				], "x", 19, 6), STEEL);
			}
		});
		part({
			id: `${a}-hub`,
			label: `Wheel hub, ${c.label} (P17, T7, P18)`,
			assembly: a,
			step: 2,
			source: SRC.bom,
			what: "A DIY hub: a 2\" DOM tube bored to slip on the shaft and locked to it with a 1/2\" cross-bolt, welded to a 9\" lug plate of 1/2\" steel braced by four gussets. The Bobcat wheel bolts to the plate’s eight studs.",
			moves: "Turns with the shaft.",
			drive: "The shaft, through its cross-bolt",
			specs: [
				["Hub plate P17", "Ø228.6 × 12.7 mm, 8 × 5/8\" holes on 8\" BCD"],
				["DOM tube T7", "50.8 OD × 6.35 wall × 139.7 mm"],
				["Gussets P18", "4 × 86.4 × 83.9 mm, 1/4\" plate"],
				["Option", "QD (SK-class) taper bushing"]
			]
		}, j, (put) => {
			put(xcyl(X(580), X(667), y, z, 25.4, 20), STEEL);
			put(xcyl(X(667), X(679.7), y, z, 114.3, 32), STEEL);
			for (let k = 0; k < 4; k++) {
				const t = k * Math.PI / 2 + Math.PI / 8;
				put(tilted(6.35, 70, 70, 0, [
					X(630),
					y + Math.cos(t) * 55,
					z + Math.sin(t) * 55
				]).rotateY(0), STEEL);
			}
			put(xcyl(X(600), X(612), y, z + 26, 7, 8).rotateX(0), DARK);
		});
		part({
			id: `${a}-wheel`,
			label: `Wheel and tyre, ${c.label}`,
			assembly: a,
			step: 2,
			source: SRC.params,
			what: "A Bobcat skid-steer wheel (P/N 7232567): a 12-16.5 tyre on a 16.5 × 10 rim with eight lug nuts. The CAD draws it 617.5 mm across so it stands on the ground; the real tyre is 851 mm, which would lift the frame by about 116 mm.",
			moves: "Rolls. With no steering, the machine turns by skidding: the left and right pairs driven at different speeds or opposite ways.",
			drive: "Its wheel motor, through shaft and hub",
			specs: [
				["Tyre", "12-16.5 (OD 851 mm, 254 mm wide)"],
				["As drawn", "OD 617.5 mm"],
				["Rim", "16.5 × 10, offset 94 mm"],
				["Lugs", "8 on 8\" (203.2 mm) BCD"],
				["Centre bore", "3\""]
			]
		}, j, (put) => {
			const x0 = 580, x1 = 834, rr = 209.5, R = AX.r;
			const pr = [
				[rr, X(586)],
				[249.5, X(x0)],
				[R - 22, X(582)],
				[R - 4, X(598)],
				[R - 4, X(816)],
				[R - 22, X(832)],
				[249.5, X(x1)],
				[rr, X(828)]
			];
			if (sx < 0) pr.reverse();
			put(lathe(pr, 0, y, z, 44), TYRE);
			const n = 22;
			for (let k = 0; k < n; k++) {
				const t = k / n * Math.PI * 2;
				for (const half of [0, 1]) {
					const tt = t + (half ? Math.PI / n : 0);
					const g = block(.105, .018, .05, [
						0,
						0,
						0
					], .006);
					g.rotateY(half ? .35 : -.35);
					g.translate(X(half ? 770 : 645) * S, (R + 2) * S, 0);
					g.rotateX(-tt);
					g.translate(0, z * S, (y - BACK) * S);
					put(g, TYRE);
				}
			}
			put(lathe(sx > 0 ? [
				[rr, 584],
				[201.5, 594],
				[201.5, 820],
				[rr, 830]
			].map(([r, x]) => [r, X(x)]) : [
				[rr, 830],
				[201.5, 820],
				[201.5, 594],
				[rr, 584]
			].map(([r, x]) => [r, X(x)]), 0, y, z, 40), RIM);
			put(xcyl(X(680), X(688), y, z, 199.5, 40), RIM);
			put(xcyl(X(686), X(692), y, z, 38.1, 18), DARK);
			for (let k = 0; k < 8; k++) {
				const t = k / 8 * Math.PI * 2;
				put(hex([
					X(694),
					y + Math.cos(t) * 101.6,
					z + Math.sin(t) * 101.6
				], "x", 19, 12), STEEL);
			}
		});
		part({
			id: `${a}-hoses`,
			label: `Motor hoses, ${c.label}`,
			assembly: a,
			step: 4,
			count: 2,
			source: SRC.hyd,
			what: `The two work lines of the ${c.label} motor: one feeds it, the other takes the oil back; which is which depends on the way it is driven. Its partner on the same side is fed in parallel, so both wheels of a side always turn together.`,
			specs: [
				["Hose", "SAE 100R2, -8 (1/2\")"],
				["Fittings", "JIC 37°"],
				["Pair", front ? "teed to the rear motor’s lines" : "from the drive valve"]
			]
		}, "base", (put) => {
			const vx = STATIONS.find((s) => s.id === (sx > 0 ? "left" : "right"))?.x;
			for (const [k, dy] of [[0, -28], [1, 28]]) {
				const end = [
					X(155),
					y + dy,
					z + 92
				];
				put(hose(front ? [
					end,
					[
						X(175),
						y + dy - 60,
						402
					],
					[
						X(185 + k * 22),
						760,
						398
					],
					[
						X(185 + k * 22),
						520,
						398
					],
					[
						X(165),
						AX.rear + dy + 60,
						404
					]
				] : [
					end,
					[
						X(210),
						y + dy,
						425
					],
					[
						X(360),
						240 + dy * .5,
						425
					],
					[
						X(360),
						240 + dy * .5,
						CUBE_TOP - 80
					],
					[
						X(320),
						250 + dy,
						CUBE_TOP + 25
					],
					[
						vx + (k ? 10 : -10),
						270,
						MAN_Z - 60
					]
				]), HOSE);
			}
		});
	}
	powerCubeParts(kit, {
		at: P(...CUBE_AT),
		base: "base",
		joints: {
			flywheel: "flywheel",
			coupling: "coupling",
			fan: "coolerFan"
		},
		assembly: () => "powercube",
		step: () => 3,
		unit: "powercube"
	});
	const COUPLER = ((x) => [
		x,
		CUBE_AT[1] - CUBE.L / 2 - 46,
		CUBE_AT[2] + CUBE.base + 150
	]);
	part({
		id: "pressure-line",
		label: "Pressure line",
		assembly: "hydraulics",
		step: 4,
		what: "The hose that brings the machine its power: from the Power Cube’s pressure coupler up behind the cube to the flow valve on its top. Pulled off, with the return line, the cube is free to go to another machine.",
		specs: [
			["Hose", "SAE 100R2, 3/4\""],
			["From", "The cube’s pressure coupler"],
			["To", "The flow valve’s inlet"]
		]
	}, "base", (put) => put(hose([
		COUPLER(230),
		[
			240,
			34,
			1e3
		],
		[
			250,
			60,
			CUBE_TOP + 40
		],
		[
			250,
			160,
			CUBE_TOP + 10
		]
	], 11), HOSE));
	part({
		id: "efc",
		label: "Electronic flow control valve (EFC)",
		assembly: "hydraulics",
		step: 4,
		source: SRC.hyd,
		what: "The machine’s throttle, on the Power Cube’s top behind the valves: a proportional valve that sends only the flow the joystick asks for on to the manifold and bypasses the rest back to the cube. Before any spool centres, the firmware ramps it down, so every stop is soft.",
		moves: "Its orifice opens in proportion to the signal.",
		drive: "The Burkert driver in the node box, 0–10 V from the Opta’s A0602",
		specs: [
			["Valve", "Brand EFC, 10 gpm (README: PEFC12-20, 0–20 gpm)"],
			["Modes", "One valve, or two at 6 gpm each (one per side)"],
			["Soft stop", "250–2,000 ms ramp"]
		]
	}, "base", (put) => {
		put(box(250, 160, CUBE_TOP + 54, 70, 50, 90, 5), "#c4c8ca");
		put(cyl([
			250,
			160,
			CUBE_TOP + 99
		], [
			250,
			160,
			CUBE_TOP + 154
		], 22, 16), BLACK);
		put(box(250, 160, CUBE_TOP + 164, 40, 30, 20, 3), "#3a3a3a");
		put(hose([
			[
				250,
				186,
				CUBE_TOP + 60
			],
			[
				200,
				230,
				MAN_Z - 40
			],
			[
				80,
				300,
				MAN_Z - 30
			]
		], 8), HOSE);
	});
	part({
		id: "manifold",
		label: "D03 valve manifold",
		assembly: "hydraulics",
		step: 4,
		source: SRC.hyd,
		what: "A block with four D03 valve stations side by side, fed in parallel: the pressure gallery (P) and the tank gallery (T) run through it, and every valve takes its oil from the one and gives it back to the other.",
		specs: [
			["Stations", "4, parallel"],
			["Pattern", "NFPA D03 / CETOP 3"],
			["Order (left to right)", "left wheels, arms, bucket, right wheels"]
		]
	}, "base", (put) => {
		put(box(0, MAN_Y, MAN_Z - 25, 440, 90, 50, 4), ALU);
		for (const st of STATIONS) for (const dy of [-30, 30]) put(cyl([
			st.x,
			MAN_Y + dy,
			MAN_Z - 50
		], [
			st.x,
			MAN_Y + dy,
			MAN_Z - 64
		], 8, 8), STEEL);
	});
	for (const st of STATIONS) {
		part({
			id: `valve-${st.id}`,
			label: `Directional valve, ${st.what} (${st.a}/${st.b})`,
			assembly: "hydraulics",
			step: 4,
			source: SRC.hyd,
			what: `A Parker D1VW 4-way, 3-position solenoid valve for ${st.what}. Coil ${st.a} pushes its spool one way (${st.ya}), coil ${st.b} the other (${st.yb}); with neither, springs centre it and the tandem centre locks the work ports, so a raised load stays up.`,
			moves: `Its spool slides a few millimetres either way when a coil is switched; the coil’s lamp lights while it is (watch them in the moves).`,
			drive: `Two 12 V coils switched by the Opta D1608S’s solid-state outputs`,
			specs: [
				["Valve", "Parker D1VW008CNKW (tandem centre)"],
				["Interim", "D1VW004CNKW (float) + pilot-operated checks"],
				["Flow", "18.5–21.1 gpm"],
				["Coils", "12 V DC, DIN 43650-A plugs"],
				["Mass", "~11 kg (25 lb)"]
			]
		}, "base", (put) => {
			put(box(st.x, MAN_Y, MAN_Z + 25, 46, 110, 50, 4), "#7c8287");
			for (const sy of [-1, 1]) {
				put(box(st.x, MAN_Y + sy * 85, MAN_Z + 25, 52, 60, 52, 6), BLACK);
				put(box(st.x, MAN_Y + sy * 85, MAN_Z + 64, 34, 40, 26, 4), "#3f3f3f");
				put(cyl([
					st.x,
					MAN_Y + sy * 122,
					MAN_Z + 25
				], [
					st.x,
					MAN_Y + sy * 132,
					MAN_Z + 25
				], 10, 10), STEEL);
			}
		});
		for (const [coil, sy, way] of [[
			st.a,
			-1,
			st.ya
		], [
			st.b,
			1,
			st.yb
		]]) part({
			id: `coil-${coil}`,
			label: `Coil ${coil}: ${st.what}, ${way}`,
			assembly: "hydraulics",
			step: 4,
			source: SRC.ctl,
			what: `The solenoid coil that shifts the ${st.id} valve’s spool to send ${st.what} ${way}. Its lamp here lights while the controller holds it on.`,
			moves: "Its plunger pulls the spool over while it is energised.",
			drive: `One solid-state output of the D1608S, 12 V, fused 5 A, with a flyback diode`,
			specs: [
				["Coil", coil],
				["Voltage", "12 V DC"],
				["Load", "~15–30 W"],
				["Watchdog", "All coils drop if the controller misses a 10 Hz tick"]
			]
		}, `coil${coil}`, (put) => put(box(st.x, MAN_Y + sy * 85, MAN_Z + 80, 18, 18, 8, 3), LED));
	}
	part({
		id: "transducers",
		label: "Pressure transducers",
		assembly: "hydraulics",
		step: 4,
		count: 2,
		source: SRC.ctl,
		what: "Two 0–250 bar sensors on the pressure and work galleries, read by the Opta’s analogue inputs: the controller sees how hard the machine is working and when it is stalled against relief.",
		specs: [["Range", "0–250 bar"], ["Read by", "A0602 inputs AI2, AI3"]]
	}, "base", (put) => {
		for (const x of [-230, 230]) {
			put(cyl([
				x,
				MAN_Y,
				MAN_Z - 25
			], [
				x,
				MAN_Y,
				MAN_Z + 40
			], 12, 12), STEEL);
			put(cyl([
				x,
				MAN_Y,
				MAN_Z + 40
			], [
				x,
				MAN_Y,
				MAN_Z + 60
			], 9, 10), BLACK);
		}
	});
	part({
		id: "return-line",
		label: "Return line",
		assembly: "hydraulics",
		step: 4,
		source: SRC.hyd,
		what: "From the manifold’s tank gallery back over the cube to its return coupler: inside the cube the oil runs through its six-tube cooler and its return filter into its reservoir, the oil’s way home after doing its work.",
		specs: [["Hose", "-10 (5/8\")"], ["Path", "Manifold T → the cube’s return coupler → cooler → filter → reservoir"]]
	}, "base", (put) => put(hose([
		[
			-220,
			350,
			MAN_Z - 30
		],
		[
			-280,
			200,
			CUBE_TOP + 30
		],
		[
			-150,
			45,
			CUBE_TOP - 150
		],
		[
			200,
			38,
			900
		],
		COUPLER(290)
	], 11), HOSE));
	for (const [sx, P_] of [[1, "left"], [-1, "right"]]) part({
		id: `lift-hoses-${P_}`,
		label: `Lift cylinder hoses, ${P_}`,
		assembly: "hydraulics",
		step: 4,
		count: 2,
		source: SRC.hyd,
		what: "The two lines from the arms’ valve to the lift cylinder: oil into the cap end raises the arm, into the rod end lowers it. Both lift cylinders are fed in parallel.",
		specs: [["Hose", "SAE 100R2 -8"], ["Valve", "D5 up / D6 down"]]
	}, "base", (put) => {
		for (const dz of [-14, 14]) put(hose([
			[
				55 + dz,
				290,
				MAN_Z - 60
			],
			[
				sx * 300,
				200,
				MAN_Z - 40 + dz
			],
			[
				sx * 400,
				150,
				1160 + dz
			],
			[
				sx * 440,
				110,
				720 + dz
			],
			[
				sx * 450,
				LIFT_A[0] + 55,
				LIFT_A[1] + 30 + dz
			]
		], 8), HOSE);
	});
	part({
		id: "bucket-hoses",
		label: "Bucket cylinder hoses",
		assembly: "hydraulics",
		step: 4,
		count: 4,
		source: SRC.hyd,
		what: "From the bucket valve over to the arm pivots and along the arms to the bucket cylinders on the cross beam. Where they cross the pivot they hang in loose loops, so the arms can rise without stretching them.",
		specs: [["Hose", "SAE 100R2 -8"], ["Valve", "D7 curl / D8 dump"]]
	}, "base", (put) => {
		for (const sx of [-1, 1]) for (const dz of [-12, 12]) put(hose([
			[
				-55 + dz,
				290,
				MAN_Z - 60
			],
			[
				sx * 200,
				300,
				MAN_Z - 20
			],
			[
				sx * 360,
				PIV[0] + 40,
				PIV[1] - 20 + dz
			]
		], 8), HOSE);
	});
	const outline = (() => {
		const h = 82, A = new three.Vector2(0, 0), E = new three.Vector2(...ELB), T = new three.Vector2(...TIP);
		const d1 = E.clone().sub(A).normalize(), d2 = T.clone().sub(E).normalize();
		const n1 = new three.Vector2(-d1.y, d1.x), n2 = new three.Vector2(-d2.y, d2.x);
		const miter = n1.clone().add(n2).multiplyScalar(h / (1 + n1.dot(n2)));
		/** @type {THREE.Vector2[]} */
		const pts = [];
		const arc = (c, from, sweep) => {
			const a0 = Math.atan2(from.y, from.x);
			for (let i = 0; i <= 8; i++) pts.push(new three.Vector2(c.x + Math.cos(a0 + sweep * i / 8) * h, c.y + Math.sin(a0 + sweep * i / 8) * h));
		};
		arc(A, n1.clone().negate(), -Math.PI);
		pts.push(E.clone().add(miter));
		arc(T, n2, -Math.PI);
		pts.push(E.clone().sub(miter));
		return pts.map((p) => armAt(p.x, p.y));
	})();
	for (const [sx, P_] of [[1, "left"], [-1, "right"]]) {
		const x = sx * ARM_X;
		part({
			id: `arm-plates-${P_}`,
			label: `Arm side plates, ${P_} (P9, P10)`,
			assembly: "arms",
			step: 5,
			count: 2,
			source: SRC.bom,
			what: "Two L-shaped 1/4\" plates either side of the arm’s tube, cut on the CNC plasma table: they make the arm’s bend, carry the pivot plates at its back, the lift bracket under it and the bucket’s pin at its tip.",
			moves: "Swing up and down with the arm about the pivot pin.",
			drive: "The lift cylinder",
			specs: [
				["BOM", "P9 inner, P10 outer"],
				["Stock", "PL 1/4\" A36"],
				["Size", "1,792 × 350.1 mm"],
				["Mass", "13.2 / 13.6 kg"],
				["Arm shape", "L1 1,422.6 mm, L2 503.1 mm, 130° bend"]
			]
		}, "arms", (put) => {
			for (const off of [-31.75, 25.4]) put(side(outline, x + off * 1, 6.35), ARM);
		});
		const [ey, ez] = armAt(...ELB), d2 = new three.Vector2(TIP[0] - ELB[0], TIP[1] - ELB[1]).normalize();
		part({
			id: `arm-tube-${P_}`,
			label: `Arm main tube, ${P_} (T4)`,
			assembly: "arms",
			step: 5,
			source: SRC.bom,
			what: "The arm’s backbone: a 6×2 rectangular tube from the pivot to the bend, and on down the drop leg towards the bucket, sandwiched between the side plates and bolted through them.",
			moves: "Swings with the arm.",
			drive: "The lift cylinder",
			specs: [
				["BOM", "T4 (2 per machine)"],
				["Stock", "HSS 6×2×1/4 A500"],
				["Length", "1,356.5 mm (+ 348 mm drop leg)"],
				["Mass", "24.5 kg"]
			]
		}, "arms", (put) => {
			put(bar([x, ...armAt(101.6 * Math.cos(MAIN - TH0), 101.6 * Math.sin(MAIN - TH0))], [
				x,
				ey,
				ez
			], 50.8, 152.4, 3), ARM);
			const [dy, dz] = armAt(ELB[0] + d2.x * 348, ELB[1] + d2.y * 348);
			put(bar([
				x,
				ey,
				ez
			], [
				x,
				dy,
				dz
			], 50.8, 152.4, 3), ARM);
		});
		part({
			id: `arm-pivot-${P_}`,
			label: `Arm pivot, ${P_} (R2, T6, P11, F1)`,
			assembly: "arms",
			step: 5,
			source: SRC.bom,
			what: "The joint the whole loader turns on: a 1½\" 4140 pin through both plates of the sandwich and a DOM tube in the arm, the tube welded into two round 6\" plates that bolt to the arm with five 1/2\" bolts, a big 1½-6 nut on each end of the pin.",
			moves: "The DOM tube turns on the pin as the arm swings; the pin stays.",
			specs: [
				["Pin R2", "Ø38.1 × 226.4 mm, 4140"],
				["DOM T6", "50.8 OD × 6.35 wall × 120 mm"],
				["Plates P11", "2 × Ø152.4 × 1/4\""],
				["Nuts F1", "2 × 1-1/2-6 grade 8"],
				["Pin load at relief", "~69 kN, 30 MPa shear"]
			]
		}, "arms", (put) => {
			put(xcyl(x - 113.2, x + 113.2, PIV[0], PIV[1], 19.05, 18), CHROME);
			put(xcyl(x - 60, x + 60, PIV[0], PIV[1], 25.4, 20), STEEL);
			for (const off of [-38.1, 38.1]) put(xcyl(x + off - 3.2, x + off + 3.2, PIV[0], PIV[1], 76.2, 28), ARM);
			for (const off of [-38.1, 38.1]) for (let k = 0; k < 5; k++) {
				const t = k / 5 * Math.PI * 2 + .6;
				put(hex([
					x + off + Math.sign(off) * 6,
					PIV[0] + Math.cos(t) * 57,
					PIV[1] + Math.sin(t) * 57
				], "x", 19, 6), DARK);
			}
			for (const ex of [x - 128, x + 128]) put(hex([
				ex,
				PIV[0],
				PIV[1]
			], "x", 57, 30), DARK);
		});
		part({
			id: `lift-bracket-${P_}`,
			label: `Lift cylinder bracket, ${P_}`,
			assembly: "arms",
			step: 5,
			source: SRC.params,
			what: "Two gusset plates under the arm, 828 mm out from the pivot, with a 1\" bolt for the lift cylinder’s rod eye: where the cylinder pushes the arm up.",
			moves: "Swings with the arm.",
			drive: "Pushed by the lift cylinder",
			specs: [["Pin", "1\" bolt"], ["Place", "828.5 mm along the arm, 114.3 mm under it"]]
		}, "arms", (put) => {
			for (const off of [-28.6, 28.6]) put(bar([x + off, ...armAt(828.5, 10)], [x + off, ...LIFT_B], 6.35, 100, 2), ARM);
			put(xcyl(x - 40, x + 40, LIFT_B[0], LIFT_B[1], 12.7, 12), CHROME);
		});
	}
	const [t3y, t3z] = armAt(T3_U, T3_V);
	part({
		id: "cross-beam",
		label: "Arm cross beam (T3, A5)",
		assembly: "arms",
		step: 5,
		source: SRC.bom,
		what: "The 6×2 tube tying the two arms together a little forward of the pivot, so they rise as one, bolted to each arm through two angles. The bucket cylinders hang from its underside.",
		moves: "Swings with the arms.",
		drive: "The lift cylinders, through the arms",
		specs: [
			["BOM", "T3, A5 ×4"],
			["Stock", "HSS 6×2×1/4 A500"],
			["Length", "849.2 mm"],
			["Mass", "16.6 kg"],
			["Place", "736.5 mm along the arms"],
			["Stress at full dump", "~238 MPa (A36 yields at 250)"]
		]
	}, "arms", (put) => {
		put(tilted(849.2, 50.8, 152.4, MAIN, [
			0,
			t3y,
			t3z
		]), ARM);
		for (const sx of [-1, 1]) put(tilted(6.35, 50.8, 146, MAIN, [
			sx * 420,
			t3y,
			t3z + 40
		]), STEEL);
	});
	part({
		id: "cylinder-lugs",
		label: "Bucket cylinder lugs (U1, R3)",
		assembly: "arms",
		step: 5,
		count: 2,
		source: SRC.bom,
		what: "Two short pieces of 3×3 tube welded under the cross beam, each with a 3/4\" clevis pin for a bucket cylinder’s base eye.",
		moves: "Swing with the arms.",
		specs: [
			["BOM", "U1 ×2, R3 ×2"],
			["Stock", "HSS 3×3×1/4"],
			["Size", "76.2 × 76.2 × 66.7 mm"],
			["Pin R3", "Ø19.05 × 106.2 mm, 4140"]
		]
	}, "arms", (put) => {
		const [ly, lz] = armAt(T3_U, T3_V - 25.4 - 38.1);
		for (const sx of [-1, 1]) {
			for (const off of [-36, 36]) put(tilted(6.35, 90, 76.2, MAIN, [
				sx * BCYL_X + off,
				ly,
				lz
			]), STEEL);
			put(xcyl(sx * BCYL_X - 53, sx * BCYL_X + 53, BCYL_A[0], BCYL_A[1], 9.5, 12), CHROME);
		}
	});
	/** a cylinder: its barrel (from its base pin `a`) and rod (from its rod pin `b`), each reaching part way @param {string} id @param {[number, number]} a @param {[number, number]} b @param {number} x @param {number} R @param {number} r */
	const cylinder = (id, a, b, x, R, r, barrelPart = {}, rodPart = {}, barrelJoint = "", rodJoint = "", kb = .78, kr = .92) => {
		const A = new three.Vector2(...a), B = new three.Vector2(...b), len = A.distanceTo(B), d = B.clone().sub(A).normalize();
		const at = (p, k) => [
			x,
			p.x + d.x * k,
			p.y + d.y * k
		];
		part(barrelPart, barrelJoint, (put) => {
			put(cyl(at(A, 0), at(A, len * kb), R, 22), ORANGE);
			put(cyl(at(A, len * kb - 6), at(A, len * kb + 4), R + 5, 22), ORANGE);
			put(xcyl(x - 26, x + 26, a[0], a[1], R * .85, 18), ORANGE);
			for (const k of [40, len * kb - .6 * R]) {
				const [, py, pz] = at(A, k);
				put(cyl([
					x + Math.sign(x) * R * .8,
					py,
					pz
				], [
					x + Math.sign(x) * R * 1.15,
					py,
					pz
				], 9, 10), STEEL);
			}
		});
		part(rodPart, rodJoint, (put) => {
			put(cyl(at(B, 0), at(B, -len * kr), r, 16), CHROME);
			put(xcyl(x - 22, x + 22, b[0], b[1], r * 1.5, 16), ORANGE);
		});
	};
	for (const [sx, P_] of [[1, "left"], [-1, "right"]]) {
		cylinder(`lift-${P_}`, LIFT_A, LIFT_B, sx * ARM_X, 38.1, 19.05, {
			id: `lift-barrel-${P_}`,
			label: `Lift cylinder barrel, ${P_}`,
			assembly: "cylinders",
			step: 6,
			source: SRC.params,
			what: "The lift cylinder’s barrel, pinned to the frame low behind the arm pivot inside the sandwich’s gap. Oil pumped into its cap end pushes the piston and rod out, raising the arm; into the rod end, it pulls them back.",
			moves: "Tilts about its base pin as the arm rises, so it always points at the bracket.",
			drive: "Oil from the arms’ valve (D5 up, D6 down)",
			specs: [
				["Bore", "63.5 mm (2.5\")"],
				["Stroke", "650 mm (solver; not a catalogue size)"],
				["Pin to pin", "830 → 1,311 mm working"],
				["Push at 3,000 psi", "65.5 kN"],
				["Base pin R1", "Ø25.4 × 160 mm at Y 50, Z 600"],
				["Lift, both, at relief", "3,674 kg arms down, 1,258 kg at full height"]
			]
		}, {
			id: `lift-rod-${P_}`,
			label: `Lift cylinder rod, ${P_}`,
			assembly: "cylinders",
			step: 6,
			source: SRC.params,
			what: "The chromed 1½\" rod and the piston on its inner end: it slides out of the barrel under pressure, its eye pinned to the arm’s bracket.",
			moves: "Slides out of and back into the barrel, turning with the arm about the bracket bolt.",
			drive: "The oil pressure on its piston",
			specs: [["Rod", "Ø38.1 mm (1.5\"), hard chrome"], ["Travel", "~480 mm used of 650"]]
		}, `liftBarrel${sx > 0 ? "L" : "R"}`, `liftRod${sx > 0 ? "L" : "R"}`, .8, .95);
		cylinder(`bucket-${P_}`, BCYL_A, BCYL_B, sx * BCYL_X, 44.5, 19.05, {
			id: `bucket-barrel-${P_}`,
			label: `Bucket cylinder barrel, ${P_}`,
			assembly: "cylinders",
			step: 6,
			source: SRC.params,
			what: "The bucket cylinder’s barrel, hung by its base eye from a lug under the cross beam: it rides with the arms and pushes on the bucket’s top.",
			moves: "Rises with the arms and tilts about its lug pin as the bucket turns.",
			drive: "Oil from the bucket valve (D7 curl, D8 dump)",
			specs: [
				["Bore", "76.2 mm (3\")"],
				["Stroke", "508 mm (20\")"],
				["Pin to pin", "712 closed, 1,220 extended"],
				["Push / pull at 3,000 psi", "94.3 / 70.7 kN"],
				["Breakout per cylinder", "up to 35.2 kN dump, 26.4 kN curl"]
			]
		}, {
			id: `bucket-rod-${P_}`,
			label: `Bucket cylinder rod, ${P_}`,
			assembly: "cylinders",
			step: 6,
			source: SRC.params,
			what: "Its chromed rod, pinned to the lug on the bucket’s back: pushed out it tips the bucket forward to dump, drawn in it curls the bucket back to hold its load.",
			moves: "Slides out and in, turning with the bucket.",
			drive: "The oil pressure on its piston",
			specs: [["Rod", "Ø38.1 mm (1.5\")"], ["Bucket range", "−94° to +50° to the arm"]]
		}, `bucketBarrel${sx > 0 ? "L" : "R"}`, `bucketRod${sx > 0 ? "L" : "R"}`, .74, .82);
	}
	const BK = TY + 38.1;
	part({
		id: "bucket-shell",
		label: "Bucket shell (P12, P13, P14)",
		assembly: "bucket",
		step: 7,
		source: SRC.bom,
		what: "The bucket: a back plate, a bottom and two sides of 1/4\" plate welded into an open box 1,100 mm wide, 600 deep and 450 high, about a third of a cubic metre heaped.",
		moves: "Turns about the pins at the arms’ tips: curled back to carry, tipped forward to dump; and rises with the arms.",
		drive: "The two bucket cylinders",
		specs: [
			["Back P12", "1,112.7 × 450 mm, 24.7 kg"],
			["Bottom P13", "1,112.7 × 600 mm, 32.8 kg"],
			["Sides P14", "2 × 600 × 450 mm, 8.8 kg each"],
			["Size", "1,100 W × 600 D × 450 H mm"],
			["Volume", "~0.3 m³ struck"]
		]
	}, "bucket", (put) => {
		put(box(0, BK + 3.2, 225, 1112.7, 6.35, 450, 1), YELLOW);
		put(box(0, BK + 300, 3.2, 1112.7, 600, 6.35, 1), YELLOW);
		for (const sx of [-1, 1]) put(side([
			[BK, 0],
			[BK + 600, 0],
			[BK + 600, 60],
			[BK + 120, 450],
			[BK, 450]
		], sx > 0 ? 550 : -556.35, 6.35), YELLOW);
		put(box(0, BK + 3.2, 452, 1112.7, 20, 8, 2), YELLOW);
	});
	part({
		id: "cutting-edge",
		label: "Cutting edge (P19)",
		assembly: "bucket",
		step: 7,
		source: SRC.bom,
		what: "A 3/4\" bar along the bucket’s front lip, the part that bites into the ground and wears: bolted or welded on so it can be replaced.",
		moves: "With the bucket.",
		specs: [
			["BOM", "P19"],
			["Stock", "PL 3/4\" (19.05 mm) A36"],
			["Size", "1,100 × 80 mm"],
			["Mass", "13.2 kg"]
		]
	}, "bucket", (put) => put(box(0, BK + 600, 9.5, 1100, 80, 19.05, 2), STEEL));
	part({
		id: "bucket-pivots",
		label: "Bucket pivot lugs and pins (U2, R4)",
		assembly: "bucket",
		step: 7,
		count: 2,
		source: SRC.bom,
		what: "Two 3×3 tube lugs on the bucket’s back, pinned through the arms’ tips with 1\" pins: the hinge the bucket turns on. OSE’s own analysis flags this joint as overloaded at relief; a quick-attach plate (46 × 18\") is planned here instead.",
		moves: "The lugs turn on the pins with the bucket.",
		specs: [
			["Lugs U2", "76.2 × 76.2 × 66.7 mm"],
			["Pins R4", "Ø25.4 × 106.2 mm, 4140"],
			["Planned", "Skid-steer quick attach, 1,168 × 457 mm, 1\" lock pins"]
		]
	}, "bucket", (put) => {
		for (const sx of [-1, 1]) {
			put(box(sx * ARM_X, TY, TZ, 66.7, 76.2, 76.2, 6), YELLOW);
			put(xcyl(sx * ARM_X - 53, sx * ARM_X + 53, TY, TZ, 12.7, 14), CHROME);
		}
	});
	part({
		id: "bucket-cyl-lugs",
		label: "Bucket cylinder lugs (U3)",
		assembly: "bucket",
		step: 7,
		count: 2,
		source: SRC.bom,
		what: "Two lugs high on the bucket’s back for the bucket cylinders’ rod eyes: the higher above the pivot, the more leverage the cylinders have to break the bucket out of the ground.",
		moves: "With the bucket.",
		specs: [
			["BOM", "U3 ×2"],
			["Stock", "HSS 3×3×1/4"],
			["Above the pivot", "~300 mm"]
		]
	}, "bucket", (put) => {
		for (const sx of [-1, 1]) {
			for (const off of [-30, 30]) put(box(sx * BCYL_X + off, TY + 10, BCYL_B[1] - 20, 6.35, 60, 110, 3), YELLOW);
			put(xcyl(sx * BCYL_X - 45, sx * BCYL_X + 45, BCYL_B[0], BCYL_B[1], 9.5, 12), CHROME);
		}
	});
	part({
		id: "deck",
		label: "Platform deck (P15)",
		assembly: "platform",
		step: 8,
		source: SRC.bom,
		what: "A 1/4\" plate to stand on behind the machine, punched with a grid of anti-slip holes. The machine has no seat and no cab: it is meant to be driven by radio, the deck is for riding when that is easier.",
		moves: "Folds up about its pivot pins to stow, down to stand on.",
		drive: "By hand; locked by two 5/8\" pins",
		specs: [
			["BOM", "P15"],
			["Size", "735.5 × 400 mm"],
			["Mass", "14.3 kg"],
			["Height", "330 mm above the ground"],
			["Anti-slip holes", "Ø15 mm at 80 mm pitch"],
			["Tipping load with a rider", "294 kg (184 kg without)"]
		]
	}, "platform", (put) => {
		put(box(0, DECK[0] - 200, DECK[1] - 3.2, 735.5, 400, 6.35, 2), STEEL);
		for (let x = -300; x <= 300; x += 80) for (let y = DECK[0] - 340; y <= DECK[0] - 60; y += 80) put(cyl([
			x,
			y,
			DECK[1] - 2
		], [
			x,
			y,
			DECK[1] + .6
		], 7.5, 8), DARK);
	});
	part({
		id: "deck-frame",
		label: "Platform angles (A7, A8)",
		assembly: "platform",
		step: 8,
		count: 4,
		source: SRC.bom,
		what: "The 2×2 angles under the deck: two short side arms that reach forward to its pivot pins, two long transverse angles across its front and back edges.",
		moves: "Fold with the deck.",
		specs: [
			["A7", "2 × 247.6 mm"],
			["A8", "2 × 729.2 mm"],
			["Stock", "L2×2×1/4"]
		]
	}, "platform", (put) => {
		for (const sx of [-1, 1]) put(box(sx * 340, DECK[0] - 120, DECK[1] - 32, 6.35, 247.6, 50.8, 1), STEEL);
		for (const y of [DECK[0] - 25, DECK[0] - 380]) put(box(0, y, DECK[1] - 32, 729.2, 6.35, 50.8, 1), STEEL);
	});
	part({
		id: "deck-brackets",
		label: "Platform pivot brackets, pins and lock pins (P16, R5, F2)",
		assembly: "platform",
		step: 8,
		source: SRC.bom,
		what: "Two brackets bolted inside the inner panels carry the deck’s 1\" pivot pins; a 5/8\" hitch pin through each bracket, 60 mm from the pivot, locks the deck down or up.",
		moves: "The brackets stay; the deck turns on their pins.",
		specs: [
			["Brackets P16", "2 × 400 × 230 mm, 1/4\""],
			["Pins R5", "2 × Ø25.4 × 55.4 mm"],
			["Lock pins F2", "2 × Ø5/8\" hitch pins"]
		]
	}, "base", (put) => {
		for (const sx of [-1, 1]) {
			put(side([
				[10, 230],
				[180, 230],
				[180, 420],
				[60, 460],
				[10, 420]
			], sx > 0 ? 367 : -373.35, 6.35), GREEN);
			put(xcyl(sx * 340, sx * 395, DECK[0], DECK[1], 12.7, 12), CHROME);
			put(xcyl(sx * 345, sx * 395, DECK[0] + 60, DECK[1] + 20, 8, 10), RED);
		}
	});
	const NB = [
		0,
		600,
		CUBE_TOP + 64
	];
	part({
		id: "node-box",
		label: "Tractor node enclosure",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "An IP65 box with a clear lid holding the machine’s brain, mounted on the Power Cube’s top in front of the valves. Its harness leaves through Deutsch DT connectors.",
		specs: [
			["Rating", "IP65"],
			["Size", "~250 × 200 × 100 mm"],
			["Connectors", "Deutsch DT"],
			["Electronics draw", "~3.4 W (valves 60–240 W)"]
		]
	}, "base", (put) => {
		put(box(NB[0], NB[1], NB[2] - 40, 200, 250, 20, 6), "#dcdcd6");
		for (const sx of [-1, 1]) put(box(sx * 98, NB[1], NB[2], 4, 250, 100, 2), "#dcdcd6", 1);
		for (const sy of [-1, 1]) put(box(0, NB[1] + sy * 123, NB[2], 200, 4, 100, 2), "#dcdcd6", 1);
		put(box(0, NB[1], NB[2] + 52, 204, 254, 4, 6), "#e8f4ff", 1);
		for (const x of [
			-60,
			0,
			60
		]) put(cyl([
			x,
			NB[1] - 127,
			NB[2] - 20
		], [
			x,
			NB[1] - 150,
			NB[2] - 20
		], 9, 10), "#2b2b2b");
		put(box(0, NB[1] - 30, NB[2] - 59, 230, 100, 6, 1), STEEL);
	});
	part({
		id: "portenta-x8",
		label: "Portenta X8 on its Max Carrier",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "The tractor’s main computer: an Arduino Portenta X8 (a Linux i.MX8M Mini with an STM32H747 beside it) plugged into a Portenta Max Carrier with its LoRa radio. It receives the handheld’s commands at 20 Hz, decides which source wins (handheld, base station, autonomy), and drives the Opta over Modbus.",
		moves: "Nothing moves; it ticks a 10 Hz watchdog, or every coil drops.",
		specs: [
			["Boards", "Portenta X8 (ABX00049) + Max Carrier (ABX00043)"],
			["Radio", "LoRa 915 / 868 MHz, SF7 BW250, AES-128-GCM"],
			["Link", "20 Hz control, ≤150 ms round trip"],
			["To the Opta", "Modbus RTU over RS-485, 115,200 baud"],
			["Note", "An H7-only option is proposed (export rules on the X8)"]
		]
	}, "base", (put) => {
		put(box(-35, NB[1] - 20, NB[2] - 26, 110, 170, 3, 1), PCB);
		put(box(-35, NB[1] - 30, NB[2] - 21, 30, 66, 6, 1), "#1d2a3a");
		put(box(-60, NB[1] + 40, NB[2] - 21, 26, 24, 10, 1), ALU);
		put(box(-10, NB[1] + 40, NB[2] - 21, 20, 16, 8, 1), "#f2f2f2");
	});
	part({
		id: "opta",
		label: "Opta WiFi with D1608S and A0602",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "The machine’s hands: an Arduino Opta PLC on a DIN rail with two expansions. The D1608S’s eight solid-state outputs switch the eight valve coils; the A0602 puts out 0–10 V to the flow valve’s driver and reads the battery, both pressures and the oil temperature. The Opta’s own relays kill the engine, sound the horn and beacon, release the park brake.",
		specs: [
			["Opta", "Modbus slave; relays R1 kill, R2 beacon/horn, R3 brake, R4 spare"],
			["D1608S", "8 × SSR to the coils, flyback diodes; inputs ignition, E-stop, mode"],
			["A0602", "AO1/AO2 0–10 V to the EFC; AI battery, 2 pressures, coolant, oil temp"]
		]
	}, "base", (put) => {
		put(box(50, NB[1], NB[2] - 26, 35, 220, 8, 1), STEEL);
		for (const [y, w] of [
			[NB[1] - 70, 70],
			[NB[1] + 5, 70],
			[NB[1] + 72, 46]
		]) {
			put(box(50, y, NB[2] - 2, 60, w - 4, 40, 3), "#f4f4f0");
			put(box(50, y, NB[2] + 18, 40, w - 12, 4, 1), "#2a6fb0");
		}
	});
	part({
		id: "efc-driver",
		label: "EFC driver (Burkert 8605)",
		assembly: "electronics",
		step: 9,
		source: SRC.hyd,
		what: "A small DIN-rail amplifier turning the Opta’s 0–10 V into the coil current the proportional flow valve needs.",
		specs: [
			["Driver", "Burkert 8605 Type 316532"],
			["Input", "0–10 V"],
			["Output", "PWM coil current"]
		]
	}, "base", (put) => put(box(-80, NB[1] + 85, NB[2] - 6, 30, 40, 36, 3), "#e4e4de"));
	part({
		id: "safety-relay",
		label: "Safety relay and E-stop loop",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "A Phoenix PSR dual-channel safety relay: while the E-stop loop is closed it holds the 12 V valve rail and the engine’s run circuit on. Press any E-stop (on the machine or the handheld) and it drops both, whatever the computers think.",
		specs: [
			["Relay", "Phoenix Contact PSR, dual channel"],
			["Cuts", "12 V valve rail and engine kill (30 A relay)"],
			["E-stops", "Latching mushrooms on tractor and handheld"]
		]
	}, "base", (put) => put(box(-80, NB[1] + 40, NB[2] - 6, 24, 40, 36, 3), "#f2d13a"));
	part({
		id: "fuses",
		label: "Fuses and power path",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "From the battery: a 175 A master cut-off, an EMI filter, a 20 A main fuse, then eight 5 A fuses, one per valve coil; a small 18650 cell keeps the computer alive through cranking.",
		specs: [
			["Master", "175 A cut-off"],
			["Main fuse", "20 A"],
			["Branches", "8 × 5 A"],
			["Backup", "18650 cell + TP4056 charger"]
		]
	}, "base", (put) => {
		put(box(-35, NB[1] + 90, NB[2] - 18, 90, 40, 12, 2), "#2a2a2a");
		for (let k = 0; k < 8; k++) put(box(-75 + k * 11.5, NB[1] + 90, NB[2] - 8, 7, 18, 8, 1), ["#ffcc33", "#e05a2a"][k % 2]);
	});
	part({
		id: "status-leds",
		label: "Status lamps and buzzer",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "Three lamps on the lid — POWER, LINK, FAULT — and a buzzer: at a glance, is it powered, is it hearing the handheld, has it stopped itself.",
		specs: [["Lamps", "POWER, LINK, FAULT"], ["Buzzer", "Fault and link-loss alarm"]]
	}, "base", (put) => {
		for (const [k, c] of [
			[0, "#3cff7a"],
			[1, "#3ab0ff"],
			[2, "#ff4a3a"]
		]) put(cyl([
			-60 + k * 30,
			NB[1] - 100,
			NB[2] + 54
		], [
			-60 + k * 30,
			NB[1] - 100,
			NB[2] + 60
		], 6, 10), c);
		put(cyl([
			60,
			NB[1] - 100,
			NB[2] + 54
		], [
			60,
			NB[1] - 100,
			NB[2] + 58
		], 12, 14), BLACK);
	});
	part({
		id: "imu-gps",
		label: "GPS and IMU boards",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "A u-blox NEO-M9N GPS (an RTK ZED-F9P later, for centimetres) and a BNO086 motion sensor: where the machine is, which way it faces, how it tilts — for the base station’s map, and for warning before it tips.",
		specs: [["GPS", "u-blox NEO-M9N (upgrade ZED-F9P RTK)"], ["IMU", "BNO086 via MCP2221A USB bridge"]]
	}, "base", (put) => {
		put(box(-60, NB[1] - 80, NB[2] - 20, 40, 30, 4, 1), "#c0392b");
		put(box(-15, NB[1] - 80, NB[2] - 20, 30, 30, 4, 1), "#6b3fa0");
	});
	part({
		id: "harness",
		label: "Valve and sensor harness",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "The wiring from the node box to the eight valve coils (DIN plugs), the flow valve, the pressure sensors, the engine’s kill and ignition sense, and up the mast.",
		specs: [["Connectors", "Deutsch DT at the box, DIN 43650-A at the coils"], ["Coil feed", "12 V, fused 5 A each"]]
	}, "base", (put) => {
		for (const st of STATIONS) for (const sy of [-1, 1]) put(hose([
			[
				st.x * .3,
				NB[1] - 140,
				NB[2] - 20
			],
			[
				st.x,
				MAN_Y + sy * 60,
				MAN_Z + 110
			],
			[
				st.x,
				MAN_Y + sy * 85,
				MAN_Z + 78
			]
		], 3), sy < 0 ? "#2f2f2f" : "#3a3a3a");
		put(hose([
			[
				-60,
				NB[1] - 140,
				NB[2] - 20
			],
			[
				-290,
				300,
				CUBE_TOP + 40
			],
			[
				-330,
				20,
				1150
			]
		], 5), "#2f2f2f");
	});
	part({
		id: "master-switch",
		label: "Master cut-off switch",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "A red key on the Power Cube battery’s positive lead, its key through the back wall: turned off, nothing on the machine is live — for servicing and for leaving it.",
		moves: "Turned by hand.",
		specs: [["Rating", "175 A"], ["Battery", "The Power Cube’s 12 V battery"]]
	}, "base", (put) => {
		put(cyl([
			-200,
			7,
			1060
		], [
			-200,
			40,
			1060
		], 30, 18), BLACK);
		put(cyl([
			-200,
			7,
			1060
		], [
			-200,
			-25,
			1060
		], 16, 16), RED);
		put(hose([
			[
				-260,
				CUBE_AT[1] - 10,
				CUBE_AT[2] + 316
			],
			[
				-360,
				330,
				CUBE_AT[2] + 330
			],
			[
				-360,
				70,
				1e3
			],
			[
				-200,
				40,
				1060
			]
		], 6), RED);
	});
	part({
		id: "mast",
		label: "Antenna mast",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "A steel pole on the back wall lifting the radio, GPS and cameras clear of the steel around them.",
		specs: [["Height", "top ~1.75 m above the ground"]]
	}, "base", (put) => {
		put(cyl([
			-330,
			-24,
			880
		], [
			-330,
			-24,
			1750
		], 19, 14), STEEL);
		for (const z of [930, 1110]) put(box(-330, -10, z, 60, 30, 20, 2), STEEL);
		put(box(-330, -24, 1752, 110, 70, 6, 2), STEEL);
	});
	part({
		id: "lora-antenna",
		label: "LoRa antenna",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "The whip for the control radio: raw LoRa with OSE’s own frame format, every command 16 bytes, encrypted, twenty times a second. Lose it for a second and the machine stops itself.",
		specs: [
			["Band", "915 MHz (US) / 868 MHz (EU)"],
			["Modulation", "LoRa SF7, BW 250 kHz, CR 4/5"],
			["Frame", "16 B → ~44 B with AES-128-GCM"],
			["Timeout", "1 s → all motion stops"]
		]
	}, "base", (put) => {
		put(cyl([
			-300,
			-24,
			1755
		], [
			-300,
			-24,
			2150
		], 4, 8, 2), BLACK);
		put(cyl([
			-300,
			-24,
			1755
		], [
			-300,
			-24,
			1790
		], 9, 10), DARK);
	});
	part({
		id: "gps-antenna",
		label: "GPS antenna",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "A patch antenna on the mast’s top plate, seeing the sky for the GPS receiver.",
		specs: [["Type", "Active GNSS patch"]]
	}, "base", (put) => put(box(-365, -24, 1768, 50, 50, 20, 8), "#f0f0ea"));
	part({
		id: "cameras",
		label: "Cameras",
		assembly: "electronics",
		step: 9,
		count: 2,
		source: SRC.ctl,
		what: "USB cameras looking forward over the bucket and back over the deck, streamed to the base station so the machine can be driven out of sight. Up to four can be fitted.",
		specs: [["Cameras", "Kurokesu C1 PRO / C2-290C (UVC), 1–4"], ["Research build", "Arducam IMX335 on a Raspberry Pi 4"]]
	}, "base", (put) => {
		for (const sy of [-1, 1]) {
			put(box(-330, -24 + sy * 50, 1700, 50, 50, 46, 6), BLACK);
			put(cyl([
				-330,
				-24 + sy * 75,
				1700
			], [
				-330,
				-24 + sy * 82,
				1700
			], 15, 14), "#3a6fa8");
		}
	});
	part({
		id: "beacon",
		label: "Warning beacon and horn",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "An amber beacon on the back wall that flashes whenever the machine moves, and a horn beside it, both on the Opta’s relay R2: a machine with nobody on it has to say it is coming.",
		moves: "Flashes while the machine moves.",
		drive: "Opta relay R2",
		specs: [["Relay", "R2"], ["Light", "Amber LED beacon"]]
	}, "base", (put) => {
		put(cyl([
			330,
			0,
			1150
		], [
			330,
			0,
			1175
		], 45, 18), BLACK);
		put(cyl([
			330,
			0,
			1175
		], [
			330,
			0,
			1255
		], 38, 18, 30), "#c8801a", 1);
		put(cyl([
			420,
			-18,
			1060
		], [
			420,
			-50,
			1060
		], 28, 16, 10), DARK);
	});
	part({
		id: "beacon-light",
		label: "Beacon lamp",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "The beacon’s lamp: lit, it is flashing.",
		moves: "Flashes while the machine moves.",
		drive: "Opta relay R2",
		specs: [["Colour", "Amber"]]
	}, "beacon", (put) => put(cyl([
		330,
		0,
		1185
	], [
		330,
		0,
		1240
	], 26, 14, 20), AMBER));
	part({
		id: "estop",
		label: "E-stop on the machine",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "A latching red mushroom on the back wall: pushed, it opens the safety relay’s loop, dropping the valves (everything holds where it is) and killing the engine. Twisted out, the machine can be started again.",
		moves: "Pushed in to stop; twisted to release.",
		specs: [["Type", "Latching mushroom"], ["Acts on", "Safety relay, hard-wired"]]
	}, "base", (put) => {
		put(box(250, -30, 1060, 80, 50, 80, 6), YELLOW);
		put(cyl([
			250,
			-55,
			1060
		], [
			250,
			-75,
			1060
		], 34, 20), RED);
	});
	part({
		id: "handheld",
		label: "Handheld remote",
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: "How the LifeTrac is driven: a small IP54 box on an Arduino MKR WAN 1310 with two joysticks, an E-stop, four buttons and a screen, its own LoRa radio. Here it sits in its holster on the back wall.",
		specs: [
			["Board", "MKR WAN 1310 (LoRa)"],
			["Box", "120 × 80 × 40 mm, IP54"],
			["Battery", "2,000 mAh LiPo, ~8 h"],
			["Also", "22 mm E-stop, 4 buttons, OLED"],
			["Other ways", "Base station web UI; research build: BLE (DroidPad), Wi-Fi/MQTT, ROS2"]
		]
	}, "base", (put) => {
		const m = handMatrix();
		const add = (g, c, mat = 0) => put(g.applyMatrix4(m), c, mat);
		add(block(.12, .04, .08, [
			0,
			-.02,
			0
		], .008), "#ffcf2e");
		add(block(.05, .004, .025, [
			0,
			.001,
			.022
		], .002), "#0a1a2a");
		add(new three.CylinderGeometry(.011, .011, .012, 16).translate(0, .006, -.026), RED);
		for (let k = 0; k < 4; k++) add(new three.CylinderGeometry(.004, .004, .005, 10).translate(-.018 + k * .012, .002, -.006), "#3a3a3a");
		for (const sx of [-1, 1]) add(new three.CylinderGeometry(.014, .016, .006, 16).translate(sx * .038, .003, 0), DARK);
		add(new three.CylinderGeometry(.003, .003, .07, 8).translate(.05, .03, -.035), BLACK);
		put(box(0, -14, 980, 140, 22, 70, 3), STEEL);
	});
	for (const [sx, P_, does] of [[
		1,
		"left",
		"drive: forward and back on Y, steer on X (tank steering)"
	], [
		-1,
		"right",
		"loader: arms up and down on Y, bucket curl and dump on X"
	]]) part({
		id: `stick-${P_}`,
		label: `Handheld joystick, ${P_}`,
		assembly: "electronics",
		step: 9,
		source: SRC.ctl,
		what: `The ${P_} stick: ${does}. A 10 % dead zone in the middle; the stick’s deflection sets the flow valve’s opening, so a little deflection is a slow, fine movement.`,
		moves: "Tilts as the machine is driven (watch it in the moves).",
		specs: [
			["Mapping", does],
			["Dead zone", "10 %"],
			["Research build", "SparkFun Qwiic joysticks on an ESP32"]
		]
	}, `stick${sx > 0 ? "L" : "R"}`, (put) => {
		const m = handMatrix();
		put(new three.CylinderGeometry(.003, .004, .03, 10).translate(sx * .038, .018, 0).applyMatrix4(m), DARK);
		put(new three.SphereGeometry(.009, 12, 8).translate(sx * .038, .034, 0).applyMatrix4(m), BLACK);
	});
	const built = kit.build();
	const hm = handMatrix();
	const cube = powerCubeJoints(P(...CUBE_AT));
	const stickAt = (sx) => new three.Vector3(sx * .038, 0, 0).applyMatrix4(hm).toArray();
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
		...CORNERS.map((c) => ({
			name: `wheel_${c.id}`,
			parent: "base",
			at: P(c.sx * AX.x, c.y, AX.z)
		})),
		{
			name: "flywheel",
			parent: "base",
			at: cube.flywheel
		},
		{
			name: "coupling",
			parent: "base",
			at: cube.coupling
		},
		{
			name: "coolerFan",
			parent: "base",
			at: cube.fan
		},
		{
			name: "arms",
			parent: "base",
			at: P(0, ...PIV)
		},
		{
			name: "bucket",
			parent: "arms",
			at: P(0, TY, TZ)
		},
		{
			name: "platform",
			parent: "base",
			at: P(0, ...DECK)
		},
		{
			name: "beacon",
			parent: "base",
			at: P(330, 0, 1210)
		},
		{
			name: "stickL",
			parent: "base",
			at: stickAt(1)
		},
		{
			name: "stickR",
			parent: "base",
			at: stickAt(-1)
		},
		...STATIONS.flatMap((st) => [st.a, st.b].map((c, i) => ({
			name: `coil${c}`,
			parent: "base",
			at: P(st.x, MAN_Y + (i ? 85 : -85), MAN_Z + 80)
		}))),
		...["L", "R"].flatMap((s) => {
			const x = s === "L" ? 1 : -1;
			return [
				{
					name: `liftBarrel${s}`,
					parent: "base",
					at: P(x * ARM_X, ...LIFT_A)
				},
				{
					name: `liftRod${s}`,
					parent: "arms",
					at: P(x * ARM_X, ...LIFT_B)
				},
				{
					name: `bucketBarrel${s}`,
					parent: "arms",
					at: P(x * BCYL_X, ...BCYL_A)
				},
				{
					name: `bucketRod${s}`,
					parent: "bucket",
					at: P(x * BCYL_X, ...BCYL_B)
				}
			];
		}),
		...built.bones
	];
	const r = rig(bones, built.pieces, [skin(.55, { side: three.DoubleSide }), skin(.15, {
		side: three.DoubleSide,
		transparent: true,
		opacity: .35,
		depthWrite: false
	})]);
	r.object.name = "LifeTrac v25";
	const rest0 = {
		lift: ang(LIFT_A, LIFT_B),
		bucket: ang(BCYL_A, BCYL_B)
	};
	/**
	* @typedef {{ dist?: number, yaw?: number, arm?: number, bucket?: number, deck?: number, t?: number, moving?: boolean,
	*   coils?: Record<string, boolean>, sticks?: [number, number, number, number] }} State
	* dist: driven forward (m); yaw: turned (rad, left positive); arm: raised from rest (rad); bucket: the bucket's turn
	* to the arm (rad, curl positive); deck: the platform folded up (0 down … 1 up)
	*/
	/** @param {State} s @returns {Pose} */
	const pose = ({ dist = 0, yaw = 0, arm = 0, bucket = 0, deck = 0, t = 0, moving = false, coils = {}, sticks = [
		0,
		0,
		0,
		0
	] }) => {
		/** @type {Pose} */
		const p = {
			base: [
				0,
				yaw,
				0
			],
			root: [
				Math.sin(yaw) * 0,
				0,
				dist
			]
		};
		const roll = dist * 1e3 / AX.r, spin = yaw * AX.x / AX.r;
		for (const c of CORNERS) p[`wheel_${c.id}`] = [
			roll - c.sx * spin,
			0,
			0
		];
		const { engine, fan } = powerCubeTurns(t);
		p.flywheel = [
			0,
			0,
			engine
		];
		p.coupling = [
			0,
			0,
			engine
		];
		p.coolerFan = [
			fan,
			0,
			0
		];
		p.arms = [
			-arm,
			0,
			0
		];
		p.bucket = [
			-bucket,
			0,
			0
		];
		p.platform = [
			deck * (Math.PI / 2),
			0,
			0
		];
		const lb = turnAbout(PIV, LIFT_B, arm);
		const la = ang(LIFT_A, lb) - rest0.lift;
		turnAbout(PIV, [TY, TZ], arm);
		const bang = ang(turnAbout(PIV, BCYL_A, arm), turnAbout(PIV, turnAbout([TY, TZ], BCYL_B, bucket), arm)) - rest0.bucket;
		for (const s of ["L", "R"]) {
			p[`liftBarrel${s}`] = [
				-la,
				0,
				0
			];
			p[`liftRod${s}`] = [
				-(la - arm),
				0,
				0
			];
			p[`bucketBarrel${s}`] = [
				-(bang - arm),
				0,
				0
			];
			p[`bucketRod${s}`] = [
				-(bang - arm - bucket),
				0,
				0
			];
		}
		p.beacon = [
			0,
			0,
			0,
			moving && Math.sin(t * 2 * Math.PI * 1.5) > 0 ? 1 : 0
		];
		for (const st of STATIONS) for (const c of [st.a, st.b]) p[`coil${c}`] = [
			0,
			0,
			0,
			coils[c] ? 1 : 0
		];
		const [lx, ly, rx, ry] = sticks;
		p.stickL = [
			-ly * .4,
			0,
			-lx * .4
		];
		p.stickR = [
			-ry * .4,
			0,
			-rx * .4
		];
		return p;
	};
	/**
	* A move from how the machine stands over time: what the valves and sticks do is read off how it is changing.
	* @param {(t: number) => State} at @param {boolean} [engine] @returns {import('./rig').Clip}
	*/
	const move = (at, engine = true) => (t) => {
		const s = at(t), a = at(t - .06), b = at(t + .06);
		const v = (k) => ((b[k] ?? 0) - (a[k] ?? 0)) / .12;
		const fwd = v("dist"), turn = v("yaw"), up = v("arm"), curl = v("bucket");
		const left = fwd - turn * .7, right = fwd + turn * .7, e = .02;
		const coils = {
			D1: left > e,
			D2: left < -.02,
			D3: right > e,
			D4: right < -.02,
			D5: up > e,
			D6: up < -.02,
			D7: curl > e,
			D8: curl < -.02
		};
		const k = (x, m) => Math.max(-1, Math.min(1, x / m));
		/** @type {[number, number, number, number]} */
		const sticks = [
			k(-turn, .6),
			k(fwd, .6),
			k(curl, .5),
			k(up, .4)
		];
		const moving = Object.values(coils).some(Boolean);
		return pose({
			...s,
			t: engine ? t : 0,
			coils,
			sticks,
			moving
		});
	};
	const ARM_MAX = 77 * D, CURL = .55, DUMP = -1.15;
	/** between key states (each at its time in the cycle, 0…1), eased @param {[number, State][]} keys @param {number} u @returns {State} */
	const through = (keys, u) => {
		let i = 0;
		while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
		const [t0, a] = keys[i], [t1, b] = keys[i + 1];
		const k = ease(Math.min(1, Math.max(0, (u - t0) / (t1 - t0))));
		/** @type {Record<string, number>} */
		const mix = {};
		for (const n of [
			"dist",
			"yaw",
			"arm",
			"bucket",
			"deck"
		]) mix[n] = (a[n] ?? 0) + ((b[n] ?? 0) - (a[n] ?? 0)) * k;
		return mix;
	};
	const STEPS_N = STEPS.length;
	return {
		rig: r,
		clips: {
			work: move((t) => through([
				[0, {
					deck: 1,
					arm: .06,
					bucket: 0
				}],
				[.16, {
					deck: 1,
					dist: 1.4,
					arm: 0,
					bucket: -.05
				}],
				[.26, {
					deck: 1,
					dist: 1.6,
					arm: .04,
					bucket: CURL
				}],
				[.42, {
					deck: 1,
					dist: .3,
					arm: .5,
					bucket: .15000000000000002
				}],
				[.56, {
					deck: 1,
					dist: .6,
					arm: ARM_MAX,
					bucket: CURL - ARM_MAX
				}],
				[.68, {
					deck: 1,
					dist: .6,
					arm: ARM_MAX,
					bucket: DUMP
				}],
				[.76, {
					deck: 1,
					dist: .6,
					arm: ARM_MAX,
					bucket: DUMP
				}],
				[.9, {
					deck: 1,
					dist: .1,
					arm: .2,
					bucket: -.15
				}],
				[1, {
					deck: 1,
					arm: .06,
					bucket: 0
				}]
			], loop(t, 16))),
			drive: move((t) => {
				const u = loop(t, 8);
				return {
					deck: 1,
					arm: .12,
					dist: 1.6 * (ease(Math.min(1, Math.max(0, (u - .05) / .4))) - ease(Math.min(1, Math.max(0, (u - .55) / .4))))
				};
			}),
			turn: move((t) => {
				const u = loop(t, 9);
				return {
					deck: 1,
					arm: .12,
					yaw: Math.PI * (ease(Math.min(1, Math.max(0, (u - .05) / .4))) - ease(Math.min(1, Math.max(0, (u - .55) / .4))))
				};
			}),
			lift: move((t) => {
				const u = loop(t, 8);
				const a = ARM_MAX * (ease(Math.min(1, Math.max(0, (u - .05) / .4))) - ease(Math.min(1, Math.max(0, (u - .55) / .4))));
				return {
					deck: 1,
					arm: a,
					bucket: -a * .85
				};
			}),
			curl: move((t) => through([
				[0, {
					deck: 1,
					arm: .35
				}],
				[.25, {
					deck: 1,
					arm: .35,
					bucket: CURL
				}],
				[.45, {
					deck: 1,
					arm: .35,
					bucket: CURL
				}],
				[.75, {
					deck: 1,
					arm: .35,
					bucket: -.9
				}],
				[.9, {
					deck: 1,
					arm: .35,
					bucket: -.9
				}],
				[1, {
					deck: 1,
					arm: .35
				}]
			], loop(t, 8))),
			platform: move((t) => through([
				[0, { deck: 1 }],
				[.15, { deck: 1 }],
				[.4, { deck: 0 }],
				[.65, { deck: 0 }],
				[.9, { deck: 1 }],
				[1, { deck: 1 }]
			], loop(t, 6))),
			assemble: (t) => {
				const u = Math.min(1, loop(t, STEPS_N * 2.6 + 3) * ((STEPS_N * 2.6 + 3) / (STEPS_N * 2.6)));
				return kit.assemble(built.centre, u, STEPS_N, pose({
					deck: 1,
					t: u >= 1 ? t : 0
				}));
			},
			explode: (t) => {
				const u = loop(t, 9);
				const k = ease(Math.min(1, Math.max(0, (u - .05) / .3))) - ease(Math.min(1, Math.max(0, (u - .65) / .3)));
				return kit.explode(built.centre, k, pose({
					deck: 0,
					t
				}));
			},
			idle: move(() => ({
				deck: 1,
				arm: .06
			}))
		},
		poses: {
			rest: pose({ deck: 0 }),
			raised: pose({
				deck: 1,
				arm: ARM_MAX,
				bucket: CURL - ARM_MAX
			}),
			dumping: pose({
				deck: 1,
				arm: ARM_MAX,
				bucket: DUMP
			}),
			exploded: kit.explode(built.centre, 1, pose({ deck: 0 }))
		},
		first: "work",
		catalog: {
			assemblies: ASSEMBLIES,
			parts: built.catalogParts,
			steps: STEPS,
			sources: [
				{
					label: SRC.repo,
					url: "https://github.com/OpenSourceEcology/LifeTrac/tree/main/LifeTrac-v25"
				},
				{
					label: SRC.bom,
					url: "https://github.com/OpenSourceEcology/LifeTrac/blob/main/LifeTrac-v25/DESIGN-STRUCTURAL/drawings/generated/bom.csv"
				},
				{
					label: SRC.params,
					url: "https://github.com/OpenSourceEcology/LifeTrac/blob/main/LifeTrac-v25/DESIGN-STRUCTURAL/openscad/lifetrac_v25_params.scad"
				},
				{
					label: SRC.hyd,
					url: "https://github.com/OpenSourceEcology/LifeTrac/blob/main/LifeTrac-v25/DESIGN-HYDRAULIC/HYDRAULIC_BOM.md"
				},
				{
					label: SRC.ctl,
					url: "https://github.com/OpenSourceEcology/LifeTrac/blob/main/LifeTrac-v25/DESIGN-CONTROLLER/HARDWARE_BOM.md"
				},
				{
					label: SRC.sa,
					url: "https://github.com/OpenSourceEcology/LifeTrac/blob/main/LifeTrac-v25/DESIGN-STRUCTURAL/STRUCTURAL_ANALYSIS_LOG.md"
				},
				{
					label: SRC.uwu,
					url: "https://github.com/OpenSourceEcology/LifeTrac/tree/main/UWU"
				},
				{
					label: SRC.lt6,
					url: "https://wiki.opensourceecology.org/wiki/LifeTrac_Genealogy"
				},
				...POWERCUBE_SOURCES
			]
		}
	};
}
/** where the handheld's own frame (its face up, y) lands on the machine */
function handMatrix() {
	return new three.Matrix4().makeTranslation(...P(...HAND)).multiply(new three.Matrix4().makeRotationX(HAND_TILT));
}
/** a pin's point (Y, Z) turned `a` (rad, up positive) about a centre @param {[number, number]} c @param {[number, number]} p @param {number} a @returns {[number, number]} */
function turnAbout(c, p, a) {
	const y = p[0] - c[0], z = p[1] - c[1];
	return [c[0] + y * Math.cos(a) - z * Math.sin(a), c[1] + y * Math.sin(a) + z * Math.cos(a)];
}
/** the slope of the line from a to b (rad, up positive) @param {[number, number]} a @param {[number, number]} b */
function ang(a, b) {
	return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

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
const HISTORY = /* @__PURE__ */ (() => ({ lifetrac: [{
	...FIRST,
	date: "2026-10-13"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "lifetrac",
	label: "LifeTrac",
	note: "Open Source Ecology’s open-source tractor, its newest design (v25): a compact loader driven by radio, every part of it its own — tap one for its card, show it alone, watch it go on step by step or the whole machine drawn apart",
	from: "Open Source Ecology: the Global Village Construction Set",
	variants: [{
		id: "lifetrac-v25",
		label: "v25",
		note: "LifeTrac v25 (2025–26): bolted plate frame, four direct-drive hydraulic wheels, loader arms, LoRa remote control, a Power Cube for its heart",
		make: () => lifetrac()
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