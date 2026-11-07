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
const S$2 = .001;
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
const RED$2 = "#c8372d";
const FRAME = "#c8372d";
const STEEL$2 = "#8d9396";
const DARK$2 = "#2b2d2f";
const ENGINE = "#2f3133";
const BLACK$2 = "#161718";
const ALU = "#b9bdbf";
const HOSE = "#202224";
const BRASS = "#c9a03a";
const YELLOW$2 = "#f0c419";
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
const SRC$2 = {
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
		x * S$2,
		z * S$2,
		y * S$2
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 2) => T(block(w * S$2, h * S$2, l * S$2, L(x, y, z), r * S$2));
	const bar = (a, b, w, h, r = 2) => T(beam(L(...a), L(...b), w * S$2, h * S$2, r * S$2));
	/** @param {MM} a @param {MM} b @param {number} r @param {number} [seg] @param {number} [r1] */
	const cyl = (a, b, r, seg = 18, r1 = r) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
		const g = new three.CylinderGeometry(r1 * S$2, r * S$2, A.distanceTo(B), seg);
		g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
		return T(g);
	};
	const hose = (pts, r = 9.5) => T(new three.TubeGeometry(new three.CatmullRomCurve3(pts.map((p) => new three.Vector3(...L(...p)))), 24, r * S$2, 8, false));
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
			], t, leg).translate(sx * (-t / 2) * S$2, 0, 0));
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
		source: SRC$2.s7,
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
		source: SRC$2.vii,
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
		source: SRC$2.man,
		what: "How the cube is coupled to a machine: plates across its back with a 4×8 receiver tube between them, so it slides onto the machine’s mount and is pinned, and comes off again in minutes for the next machine. Several cubes can be strung together for more power.",
		specs: [
			["Plates", "2 × 3/8\" × 4\" × 27\"; 2 × 1/4\" × 4\" × 8\""],
			["Receiver tube", "4\" × 8\" × 14½\""],
			["Strap", "1/4\" × 2\" × 24\""],
			["Source", "v4 fabrication manual"]
		]
	}, base, (put) => {
		for (const z of [B + 60, B + 220]) put(box(0, -Lh - 5, z, CUBE.W - 40, 9.5, 101.6, 2), STEEL$2);
		put(box(0, -Lh - 40, B + 140, 203, 70, 101.6, 6), STEEL$2);
		for (const sx of [-1, 1]) put(cyl([
			sx * 120,
			-Lh - 30,
			B + 270
		], [
			sx * 120,
			-Lh - 30,
			B + 330
		], 12, 10), STEEL$2);
	});
	part("frame", {
		id: "lift-eyes",
		label: "Power Cube lifting eyes",
		count: 2,
		source: SRC$2.vii,
		what: "Two eyes on the top rails: at about 181 kg the cube is lifted on and off a machine by the loader, a hoist or two people with a bar.",
		specs: [["Cube mass", "~400 lb (181 kg)"]]
	}, base, (put) => {
		for (const sx of [-1, 1]) {
			const g = new three.TorusGeometry(26 * S$2, 7 * S$2, 8, 16);
			put(T(g.translate(...L(sx * 180, 0, H + 26))), STEEL$2);
		}
	});
	if (engine) {
		part("engine", {
			id: "engine-plate",
			label: "Engine mount plate",
			source: SRC$2.vii,
			what: "The plate the engine’s base bolts to, itself bolted across the skids: it holds the engine’s shaft exactly in line with the pump’s.",
			specs: [["VII engine module plate", "8\" × 15½\" (203 × 394 mm)"], ["Generic mounts", "1/4\" × 8\" × 9\" and × 12\", welded at 90°"]]
		}, base, (put) => put(box(0, 40, B + 6, CUBE.W - 140, 394, 12, 2), STEEL$2));
		part("engine", {
			id: "crankcase",
			label: "Engine crankcase",
			source: SRC$2.vii,
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
			put(box(0, 30, B + 22, 300, 290, 20, 6), DARK$2);
			for (const sx of [-1, 1]) for (const y of [-90, 150]) put(cyl([
				sx * 170,
				y,
				B + 12
			], [
				sx * 170,
				y,
				B + 24
			], 11, 6), STEEL$2);
		});
		for (const [sx, side] of [[1, "left"], [-1, "right"]]) part("engine", {
			id: `cyl-${side}`,
			label: `Engine cylinder and head, ${side}`,
			source: SRC$2.vii,
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
			put(cyl(at(100), at(250), 50, 18), DARK$2);
			for (let k = 112; k < 250; k += 13) put(cyl(at(k), at(k + 4), 70, 18), ENGINE);
			put(cyl(at(250), at(305), 68, 16), ENGINE);
			const g = block(.12, .04, .15, [
				0,
				0,
				0
			], .012);
			g.rotateZ(-sx * Math.PI / 4);
			g.translate(...L(...at(320)));
			put(T(g), BLACK$2);
		});
		part("engine", {
			id: "blower",
			label: "Blower housing",
			source: SRC$2.vii,
			what: "The shroud over the flywheel, ducting its fan’s air back over both cylinders.",
			specs: [["Material", "Pressed steel"]]
		}, base, (put) => put(box(0, 230, 265, 420, 60, 330, 28), "#3a3d40"));
		part("engine", {
			id: "flywheel",
			label: "Flywheel and fan screen",
			source: SRC$2.vii,
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
			], 115, 32), DARK$2);
			for (let k = 0; k < 6; k++) {
				const g = block(.22, .012, .006, [
					0,
					0,
					0
				], .002);
				g.rotateZ(k / 6 * Math.PI);
				g.translate(...L(0, 275, 235));
				put(T(g), STEEL$2);
			}
			put(cyl([
				0,
				272,
				235
			], [
				0,
				280,
				235
			], 28, 16), STEEL$2);
		});
		part("engine", {
			id: "air-cleaner",
			label: "Air cleaner",
			source: SRC$2.vii,
			what: "The paper element in the V between the cylinders: every litre of air the engine breathes is cleaned here first.",
			specs: [["Element", "Paper, foam pre-cleaner"]]
		}, base, (put) => {
			put(box(0, 50, 520, 210, 190, 56, 14), BLACK$2);
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
			source: SRC$2.vii,
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
			], 9, 8), DARK$2);
		});
		part("engine", {
			id: "starter",
			label: "Electric starter",
			source: SRC$2.vii,
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
			], 36, 16), DARK$2);
			put(cyl([
				-150,
				230,
				150
			], [
				-150,
				248,
				150
			], 20, 12), STEEL$2);
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
			source: SRC$2.port,
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
			], 34, 18), STEEL$2);
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
			], 6, 6), DARK$2);
		});
		part("hydraulics", {
			id: "pump-mount",
			label: "Pump mount",
			source: SRC$2.vii,
			what: "A plate on the engine plate holding the pump’s SAE-A flange square to the engine, its two bolts on 4.19\" centres, so the shafts stay in line.",
			specs: [["Flange", "SAE A: Ø3.25\" pilot, 2 × 3/8-16 on 4.19\""]]
		}, base, (put) => {
			put(box(0, -215, 185, 200, 12.7, 230, 4), STEEL$2);
			put(box(0, -170, B + 30, 200, 100, 12, 2), STEEL$2);
		});
		part("hydraulics", {
			id: "pump",
			label: "Hydraulic gear pump",
			source: SRC$2.port,
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
			], 20, 12), STEEL$2);
			put(cyl([
				52,
				-275,
				235
			], [
				75,
				-275,
				235
			], 14, 12), STEEL$2);
		});
		part("hydraulics", {
			id: "reservoir",
			label: "Hydraulic reservoir (7 gal)",
			source: SRC$2.vii,
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
			source: SRC$2.vii,
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
			source: SRC$2.v156,
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
			], 13, 12), STEEL$2);
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
			source: SRC$2.v156,
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
			], 32, 24), STEEL$2);
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
			source: SRC$2.v156,
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
			put(box(W - 10, -40, 230, 8, 330, 230, 4), DARK$2);
		});
		part("hydraulics", {
			id: "cooler-fan",
			label: "Cooler fan",
			source: SRC$2.v156,
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
				put(T(g), BLACK$2);
			}
			put(cyl([
				FAN[0] - 10,
				FAN[1],
				FAN[2]
			], [
				FAN[0] + 14,
				FAN[1],
				FAN[2]
			], 24, 14), DARK$2);
		});
		part("hydraulics", {
			id: "filter",
			label: "Return filter",
			source: SRC$2.man,
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
			], 44, 18), STEEL$2);
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
			source: SRC$2.vii,
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
			], 20, 14), STEEL$2);
			put(cyl([
				-60,
				-Lh + 120,
				575
			], [
				-60,
				-Lh + 120,
				605
			], 36, 18), BLACK$2);
		});
		part("hydraulics", {
			id: "couplers",
			label: "Quick couplers (pressure and return)",
			count: 2,
			source: SRC$2.man,
			what: "The cube’s whole connection to a machine: a pressure coupler and a return coupler on its back. Push the machine’s hoses on and the cube drives it; pull them off and it is free for the next one.",
			specs: [
				["Size", "3/4\" (v4 BOM)"],
				["Type", "Standard quick connect (ISO-A class) [inferred]"],
				["Hoses inside", "1/2\", 3/4\" and 1\" (VI)"]
			]
		}, base, (put) => {
			for (const [x, c] of [[230, RED$2], [290, "#2f6fb5"]]) {
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
			source: SRC$2.vii,
			what: "The removable petrol tank on top of the cube, over the engine: lift it off to fill it away from the machine.",
			specs: [
				["Volume", "7 gal (26.5 L)"],
				["Fuel", "Petrol (gasoline)"],
				["Removable", "Yes"]
			]
		}, base, (put) => {
			put(box(0, 90, 630, CUBE.W - 70, 400, 95, 14), RED$2);
			put(cyl([
				200,
				200,
				677
			], [
				200,
				200,
				700
			], 22, 14), BLACK$2);
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
			], 4), BLACK$2);
		});
		part("controls", {
			id: "battery",
			label: "12 V battery",
			source: SRC$2.vii,
			what: "The cube’s own 12 V battery beside the engine: it cranks the starter, runs the cooler fan and the machine’s valves; the flywheel alternator charges it.",
			specs: [["Voltage", "12 V"], ["Charged by", "Flywheel alternator"]]
		}, base, (put) => {
			put(box(-260, 70, 205, 125, 240, 190, 6), BLACK$2);
			for (const [y, c] of [[-10, RED$2], [150, BLACK$2]]) put(cyl([
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
			source: SRC$2.vii,
			what: "On the front corner post: the key switch (off, run, start), the choke and the throttle. The cube is started here and left running; the machine’s valves do the rest.",
			moves: "Key, choke and throttle are worked by hand.",
			specs: [
				["Key", "Off / run / start"],
				["Choke", "Pull knob"],
				["Throttle", "Lever"]
			]
		}, base, (put) => {
			put(box(W - 60, Lh - 3, 470, 110, 6, 170, 4), DARK$2);
			put(cyl([
				W - 85,
				Lh,
				520
			], [
				W - 85,
				Lh + 18,
				520
			], 16, 14), STEEL$2);
			put(cyl([
				W - 40,
				Lh,
				520
			], [
				W - 40,
				Lh + 24,
				520
			], 9, 10), YELLOW$2);
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
		at[0] + x * S$2,
		at[1] + z * S$2,
		at[2] + y * S$2
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
				const k = ease(Math.min(1, Math.max(0, (u - .05) / .3))) - ease(Math.min(1, Math.max(0, (u - .65) / .3)));
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

//#endregion
//#region src/lib/actors/clicklock.js
/** the ClickLock's card, shared by every machine that uses one */
const CLICKLOCK = {
	label: "ClickLock",
	what: "Our one snap-in latch: slide it in and two spring pawls click into the keepers on the rails; press the flush tab on its face and both let go, and it slides out. No tool, no screw.",
	specs: [
		["Hold", "2 spring pawls, ~300 N each [inferred]"],
		["Release", "One flush tab, ~20 N"],
		["Used by", "BatteryPack, BatteryCube"]
	]
};
/**
* The sliding half: a pawl on each side `half` from the middle, `back` behind the face, at height z; the release tab
* on the face (y = face) at height `tabZ`; with `withTab` false a grip's trigger releases it instead.
* @param {(x: number, y: number, z: number, w: number, l: number, h: number, r?: number) => any} box
* @param {(geo: any, color: string) => void} put
* @param {{ half: number, face: number, z: number, tabZ: number, back?: number, steel?: string, tab?: string, withTab?: boolean }} o
*/
function clickLatch(box, put, { half, face, z, tabZ, back = 40, steel = "#8d9396", tab = "#3a3f44", withTab = true }) {
	for (const sx of [-1, 1]) put(box(sx * (half + 3), face - back, z, 6, 12, 8, 1), steel);
	if (!withTab) return;
	put(box(0, face + 1.5, tabZ, 64, 3, 12, 1.5), tab);
	put(box(0, face + 3.2, tabZ, 40, .6, 2, .3), "#d9dcde");
}
/**
* The fixed half: a rail on each side `half` from the middle, `len` long ending at `face`, at height z, with its ramp
* and keeper notch `back` behind the face.
* @param {(x: number, y: number, z: number, w: number, l: number, h: number, r?: number) => any} box
* @param {(geo: any, color: string) => void} put
* @param {{ half: number, face: number, z: number, len: number, back?: number, steel?: string }} o
*/
function clickKeeper(box, put, { half, face, z, len, back = 40, steel = "#8d9396" }) {
	for (const sx of [-1, 1]) {
		put(box(sx * (half + 9), face - len / 2, z, 10, len, 4, 1), steel);
		put(box(sx * (half + 9), face - back - 12, z + 6, 10, 10, 8, 1), steel);
	}
}
/**
* The sliding half in all its pieces, each its own part for a machine's exploded view: the two pawls, their springs
* and pivot pins, the two release cables and the trigger (in a grip at `grip`, or the face's tab). With `straight`
* (the grip's trigger at the pawls' own height), each cable runs flat at that one height: in through the face, along
* its inside to the corner and straight back along the side wall to its pawl. Returns [id, card, draw] for the
* machine to add with its own part().
* @param {(x: number, y: number, z: number, w: number, l: number, h: number, r?: number) => any} box
* @param {(a: [number, number, number], b: [number, number, number], r: number, n?: number) => any} cyl
* @param {{ half: number, face: number, z: number, grip?: [number, number, number], straight?: boolean, back?: number, steel?: string, dark?: string }} o
* @returns {[string, { label: string, count?: number, what: string, specs: [string, string][] }, (put: (geo: any, color: string) => void) => void][]}
*/
function clickLockPieces(box, cyl, { half, face, z, grip, straight = false, back = 40, steel = "#8d9396", dark = "#3a3f44" }) {
	const y = face - back;
	/** @type {[number, number, number]} */
	const t = grip ?? [
		0,
		face + 2,
		24
	];
	return [
		[
			"lock-pawls",
			{
				label: "Pawls",
				count: 2,
				what: "Two steel levers, one inside each side wall. Each pivots at its back end; its tooth at the front pokes out through a slot in the wall. Sliding in, the tooth rides up the rail’s ramp, is pushed in, and snaps out again behind the keeper: that is the click.",
				specs: [["Material", "Stainless steel, 3 mm, hardened tooth"], ["Travel", "4 mm"]]
			},
			(put) => {
				for (const sx of [-1, 1]) {
					put(box(sx * (half - 4), y - 18, z, 6, 44, 8, 1), steel);
					put(box(sx * (half + 2), y, z, 8, 10, 8, 1), steel);
				}
			}
		],
		[
			"lock-springs",
			{
				label: "Pawl springs",
				count: 2,
				what: "A small coil spring behind each pawl presses its tooth outward, so it always drops into the keeper on its own: you never have to lock it, only to unlock it.",
				specs: [["Type", "Compression, stainless"], ["Force", "~15 N each [inferred]"]]
			},
			(put) => {
				for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) put(cyl([
					sx * (half - 22 + k * 3),
					y - 4,
					z
				], [
					sx * (half - 21 + k * 3),
					y - 4,
					z
				], 3, 8), steel);
			}
		],
		[
			"lock-pivots",
			{
				label: "Pivot pins",
				count: 2,
				what: "A pin through each pawl’s back end, standing in the case floor: the pawl swings round it, in and out.",
				specs: [["Pin", "⌀ 4 mm, stainless"]]
			},
			(put) => {
				for (const sx of [-1, 1]) put(cyl([
					sx * (half - 4),
					y - 38,
					z - 8
				], [
					sx * (half - 4),
					y - 38,
					z + 8
				], 2.5, 8), steel);
			}
		],
		[
			"lock-cables",
			{
				label: "Release cables",
				count: 2,
				what: straight ? "Two short steel cables in sleeves, both at the pawls’ own height: from the trigger in through the face, along its inside to the corner and straight back along the side wall to the pawl, no bend up or down. Pulling the trigger pulls both cables, and both pawls swing in together, out of their keepers." : "Two short steel cables in sleeves run from the trigger along the inside of the face to the two pawls. Pulling the trigger pulls both cables, and both pawls swing in together, out of their keepers.",
				specs: [["Cable", "⌀ 1.5 mm steel in a PTFE sleeve"], ["Pull", "4 mm"]]
			},
			(put) => {
				for (const sx of [-1, 1]) {
					/** @type {[number, number, number][]} */
					const path = straight ? [
						[
							sx * 60,
							t[1],
							z
						],
						[
							sx * 60,
							face - 10,
							z
						],
						[
							sx * (half - 24),
							face - 10,
							z
						],
						[
							sx * (half - 8),
							y - 6,
							z
						]
					] : [
						[
							sx * 30,
							t[1] - 4,
							t[2]
						],
						[
							sx * 50,
							face - 8,
							t[2]
						],
						[
							sx * (half - 40),
							face - 10,
							z + 2
						],
						[
							sx * (half - 8),
							y - 6,
							z
						]
					];
					for (let i = 1; i < path.length; i++) put(cyl(path[i - 1], path[i], 1.6, 6), dark);
				}
			}
		],
		[
			"lock-trigger",
			{
				label: "Trigger",
				what: grip ? "The bar under the grip: your fingers close round the grip and press it up, it pulls both cables, and the pawls let go. Let go and the springs push it back." : "The flush tab on the face: press it and it pulls both cables, and the pawls let go.",
				specs: [["Force", "~20 N"], ["Travel", "4 mm"]]
			},
			(put) => {
				put(box(t[0], t[1], t[2], grip ? 130 : 64, grip ? 8 : 3, grip ? 8 : 12, grip ? 3 : 1.5), dark);
				put(box(t[0], t[1] + (grip ? 4.5 : 1.8), t[2], grip ? 90 : 40, .6, 2, .3), "#d9dcde");
			}
		]
	];
}

//#endregion
//#region src/lib/actors/batterypack.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Cast} Cast */
/** @typedef {[number, number, number]} MM a point of the pack: x across, y forward, z up (mm) */
const S$1 = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK$1 = {
	W: 460,
	L: 480,
	H: 125
};
/** the height (mm) its ClickLock's pawls sit at: low in the foot band until v4; from v5 at the grip's own height, so
*  the release cables run straight and the cube's rails follow them; from v8 in the shell's foot, with the grip */
const lockZ = (v = 8) => v >= 8 ? 10 : v >= 7 ? 20 : v >= 5 ? 30 : 10;
/** how far behind its face (mm) the ClickLock's pawl teeth sit: 40 until v5; from v6 22, so they come out through the
*  drawer's front plate and leave with it */
const lockBack = (v = 8) => v >= 6 ? 22 : 40;
/** the grip's bar height (mm) from v5: low on the face, its trigger at the lock's height */
const gripZ = (v) => v >= 8 ? 10 : v >= 7 ? 28 : 40;
/** how high (mm) the shell's foot (its floor tub and the sill across its face) stands from v8: the drawer rides on it */
const FOOT_8 = 20;
/** from v9 the shell's two front corner columns (mm): `w` across from its side, up to the base plate's top. The cells'
*  block fills 446 of the shell's 452 mm inside, so a column any taller would stop the drawer coming out: the base
*  plate runs between the two, and the cells' holders pass over them */
const POST_9 = {
	w: 46,
	top: 25
};
/** its cells: 14 rows in series (along y) of 20 in parallel (along x), 22 mm apart, standing; their zone's middle */
const CELLS$1 = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 16,
	y: -55
};
const SRC$1 = "BatteryPack (our design)";
const CASE$3 = "#1f2225";
const LID$1 = "#232629";
const SEAM = "#d9dcde";
const FACE = "#2b2f33";
const HOLDER$1 = "#1b1d1f";
const WRAP$1 = "#2f6fb5";
const CAP$1 = "#c9ccce";
const COPPER$3 = "#c27a43";
const PCB$1 = "#2c7a4a";
const DARK$1 = "#202326";
const RED$1 = "#c8372d";
const BLACK$1 = "#161718";
const LED$3 = "#59f0a0";
const LED_OFF = "#2c3a33";
const STEEL$1 = "#8d9396";
const HOLE = "#050607";
const STEP_8 = {
	tray: 1,
	terminals: 1,
	handles: 1,
	"release-left": 1,
	"release-right": 1,
	"catch-left": 1,
	"catch-right": 1,
	"lock-pawls": 1,
	"lock-springs": 1,
	"lock-pivots": 1,
	"lock-cables": 1,
	"lock-trigger": 1,
	front: 2,
	base: 2,
	charge: 2,
	"plates-bottom": 3,
	"holder-bottom": 3,
	cells: 3,
	"holder-top": 4,
	"plates-top": 4,
	clamp: 4,
	bms: 5,
	"inner-plug": 5
};
const GROUP_8 = {
	tray: "shell",
	terminals: "shell",
	handles: "shell",
	"release-left": "shell",
	"release-right": "shell",
	"catch-left": "shell",
	"catch-right": "shell",
	front: "drawer",
	base: "drawer",
	charge: "drawer",
	clamp: "drawer",
	"lock-pawls": "lock",
	"lock-springs": "lock",
	"lock-pivots": "lock",
	"lock-cables": "lock",
	"lock-trigger": "lock",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
	"inner-plug": "electronics"
};
const STEP_6 = {
	tray: 1,
	terminals: 1,
	"release-left": 1,
	"release-right": 1,
	front: 2,
	base: 2,
	charge: 2,
	handles: 2,
	"catch-left": 2,
	"catch-right": 2,
	"lock-pawls": 2,
	"lock-springs": 2,
	"lock-pivots": 2,
	"lock-cables": 2,
	"lock-trigger": 2,
	"plates-bottom": 3,
	"holder-bottom": 3,
	cells: 3,
	"holder-top": 4,
	"plates-top": 4,
	clamp: 4,
	bms: 5,
	"inner-plug": 5
};
const GROUP_6 = {
	tray: "shell",
	terminals: "shell",
	"release-left": "shell",
	"release-right": "shell",
	front: "drawer",
	base: "drawer",
	charge: "drawer",
	handles: "drawer",
	clamp: "drawer",
	"catch-left": "drawer",
	"catch-right": "drawer",
	"lock-pawls": "lock",
	"lock-springs": "lock",
	"lock-pivots": "lock",
	"lock-cables": "lock",
	"lock-trigger": "lock",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
	"inner-plug": "electronics"
};
const STEP$1 = {
	tray: 1,
	front: 1,
	charge: 1,
	handles: 1,
	clicklock: 1,
	"lock-pawls": 1,
	"lock-springs": 1,
	"lock-pivots": 1,
	"lock-cables": 1,
	"lock-trigger": 1,
	"plates-bottom": 2,
	"holder-bottom": 2,
	cells: 2,
	"holder-top": 3,
	"plates-top": 3,
	bms: 4,
	terminals: 4,
	lid: 5,
	latches: 5
};
const GROUP$1 = {
	tray: "case",
	front: "case",
	charge: "case",
	handles: "case",
	clicklock: "case",
	"lock-pawls": "lock",
	"lock-springs": "lock",
	"lock-pivots": "lock",
	"lock-cables": "lock",
	"lock-trigger": "lock",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
	terminals: "electronics",
	lid: "lid",
	latches: "lid"
};
/**
* Add a BatteryPack's parts to a machine's kit, its foot's middle at `at` (actor metres), its front towards +z.
* `assembly` and `step` say where each part goes in the machine's catalog; with `unit`, the pack arrives whole.
* `seg`: the sides of a cell (fewer where many packs stand closed). `v`: the version to build (2: its plug still on the
* face, no ClickLock; 3: the back plug and the ClickLock; 4: one centre grip whose
* trigger releases the ClickLock; 5: that grip low on its face, the lock at its height so the cables run straight,
* and its back plug as holes for the cube's pins; 6: a closed shell and one L-shaped service drawer carrying every
* inner part, released by two push buttons in the shell's sides; 7: the grip, the lock and two release buttons on the
* face's left and right ends, all down at the base plate's level; 8: the grip, the lock and the release buttons all on
* the shell, in its foot's sill across the face, the drawer riding on the foot; the back socket's holes in one line;
* 9: the release buttons and catches in the shell's two front corner columns, at the base plate's level, the catches
* shooting sideways into the base plate's edges).
* @param {ReturnType<typeof machineKit>} kit
* @param {{ at: V3, base: string, assembly?: (g: string) => string, step?: (p: string) => number, prefix?: string, unit?: string, seg?: number, v?: number }} o
*/
function batteryPackParts$1(kit, { at, base, assembly = (g) => g, step, prefix = "", unit, seg = 10, v = 9 }) {
	const G = v >= 8 ? GROUP_8 : v >= 7 ? {
		...GROUP_6,
		"release-left": "drawer",
		"release-right": "drawer"
	} : v >= 6 ? GROUP_6 : GROUP$1;
	const GRIP_Z = gripZ(v);
	const stepOf = step ?? ((p) => (v >= 8 ? STEP_8 : v >= 6 ? STEP_6 : STEP$1)[p]);
	const DZ = v >= 8 ? 17 : 0;
	const m = new three.Matrix4().makeTranslation(...at);
	/** @param {number} x @param {number} y @param {number} z @returns {V3} */
	const L = (x, y, z) => [
		x * S$1,
		z * S$1,
		y * S$1
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 1.5) => T(r > 2 ? block(w * S$1, h * S$1, l * S$1, L(x, y, z), r * S$1) : new three.BoxGeometry(w * S$1, h * S$1, l * S$1).translate(...L(x, y, z)));
	/** @param {MM} a @param {MM} b @param {number} r @param {number} [n] */
	const cyl = (a, b, r, n = 12) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
		const g = new three.CylinderGeometry(r * S$1, r * S$1, A.distanceTo(B), n);
		g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
		return T(g);
	};
	/** a rounded slab (mm): a w × l outline with corners of radius r, from z0 up h high, hollow to `wall` if given,
	*  its top edge eased by `bevel`; the case's smooth shell, lid and bands */
	const slab = (w, l, r, z0, h, wall = 0, bevel = 0) => {
		const outline = (a, b, c, hole = false) => {
			const p = hole ? new three.Path() : new three.Shape();
			const x = a / 2, y = b / 2;
			p.moveTo(-x + c, -y);
			p.lineTo(x - c, -y);
			p.quadraticCurveTo(x, -y, x, -y + c);
			p.lineTo(x, y - c);
			p.quadraticCurveTo(x, y, x - c, y);
			p.lineTo(-x + c, y);
			p.quadraticCurveTo(-x, y, -x, y - c);
			p.lineTo(-x, -y + c);
			p.quadraticCurveTo(-x, -y, -x + c, -y);
			return p;
		};
		const shape = outline(w * S$1, l * S$1, r * S$1);
		if (wall) shape.holes.push(outline((w - 2 * wall) * S$1, (l - 2 * wall) * S$1, Math.max(1, r - wall) * S$1, true));
		const g = new three.ExtrudeGeometry(shape, {
			depth: (h - bevel) * S$1,
			curveSegments: 8,
			bevelEnabled: bevel > 0,
			bevelThickness: bevel * S$1,
			bevelSize: bevel * S$1 * .8,
			bevelOffset: -bevel * S$1 * .8,
			bevelSegments: 3
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$1, 0);
		g.clearGroups();
		return T(g);
	};
	const RC = 30;
	const CHARGE = 7;
	const { W, L: LEN, H } = PACK$1;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS$1.y + (i - (CELLS$1.s - 1) / 2) * CELLS$1.pitch;
	const colX = (j) => (j - (CELLS$1.p - 1) / 2) * CELLS$1.pitch;
	const zone = {
		w: CELLS$1.p * CELLS$1.pitch + 6,
		l: CELLS$1.s * CELLS$1.pitch + 6
	};
	const z0 = CELLS$1.z0 + DZ, top = z0 + CELLS$1.h;
	/** @param {string} p @param {Omit<import('./parts.js').PartInfo, 'assembly' | 'step' | 'id'>} info @param {(put: (geo: THREE.BufferGeometry, color: string) => void) => void} make */
	const part = (p, info, make) => kit.part({
		...info,
		id: `${prefix}${p}`,
		assembly: assembly(G[p]),
		step: stepOf(p),
		source: SRC$1,
		...unit ? { unit } : {}
	}, base, make);
	/** an outline (mm, the pack's x and y) drawn up from z0, h high, as one prism */
	const prism = (draw, z0, h) => {
		const shape = new three.Shape();
		draw(shape);
		const g = new three.ExtrudeGeometry(shape, {
			depth: h * S$1,
			curveSegments: 8,
			bevelEnabled: false
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$1, 0);
		g.clearGroups();
		return T(g);
	};
	const at2 = (x, y) => [x * S$1, -y * S$1];
	const Y0 = PACK$1.L / 2 - 30;
	/** the shell's U (open at the front), its walls `w` thick; `w` 0: the same outline closed, a plate */
	const shellU = (w) => (p) => {
		const x = PACK$1.W / 2, yb = -PACK$1.L / 2, r = 30;
		p.moveTo(...at2(-x, Y0));
		p.lineTo(...at2(-x, yb + r));
		p.quadraticCurveTo(...at2(-x, yb), ...at2(-x + r, yb));
		p.lineTo(...at2(x - r, yb));
		p.quadraticCurveTo(...at2(x, yb), ...at2(x, yb + r));
		p.lineTo(...at2(x, Y0));
		if (w) {
			p.lineTo(...at2(x - w, Y0));
			p.lineTo(...at2(x - w, yb + r));
			p.quadraticCurveTo(...at2(x - w, yb + w), ...at2(x - r, yb + w));
			p.lineTo(...at2(-x + r, yb + w));
			p.quadraticCurveTo(...at2(-x + w, yb + w), ...at2(-x + w, yb + r));
			p.lineTo(...at2(-x + w, Y0));
		}
		p.closePath();
	};
	/** the drawer's front plate in plan: from Y0 to the face, its two front corners round */
	const capD = (p) => {
		const x = PACK$1.W / 2, yf = PACK$1.L / 2, r = 30;
		p.moveTo(...at2(-x, Y0));
		p.lineTo(...at2(x, Y0));
		p.quadraticCurveTo(...at2(x, yf), ...at2(x - r, yf));
		p.lineTo(...at2(-x + r, yf));
		p.quadraticCurveTo(...at2(-x, yf), ...at2(-x, Y0));
		p.closePath();
	};
	/** the case's bands, foot to top, as v2 drew them */
	const BANDS = [
		[
			0,
			16,
			FACE
		],
		[
			16,
			94,
			CASE$3
		],
		[
			110,
			2,
			SEAM
		],
		[
			112,
			13,
			LID$1
		]
	];
	const REL = v >= 7 ? {
		y: Y0 - 18,
		z: 22,
		x: 182
	} : {
		y: 150,
		z: 64,
		x: 0
	};
	const PX = Wh - POST_9.w, CATCH_Y = Y0 - 14;
	/** a front corner column in plan: inside the wall behind the face, round at the corner in front of it */
	const postP = (sx) => (p) => {
		const pt = (x, y) => at2(sx * x, y);
		p.moveTo(...pt(PX, Y0 - 30));
		p.lineTo(...pt(Wh - 4, Y0 - 30));
		p.lineTo(...pt(Wh - 4, Y0));
		p.lineTo(...pt(Wh, Y0));
		p.quadraticCurveTo(...pt(Wh, Lh), ...pt(Wh - 30, Lh));
		p.lineTo(...pt(PX, Lh));
		p.closePath();
	};
	if (v >= 8) {
		const F = FOOT_8;
		part("tray", {
			label: "Shell",
			what: "The pack’s outer shell: a foot (its floor tub and, across the face, a sill), walls, top and back in one smooth aluminium piece, open at the front above the sill where the service drawer slides in. It is what you carry and what the cube holds: the grip, the ClickLock and the two release buttons are all on it, in the sill.",
			specs: [
				["Outside", "460 × 480 × 125 mm"],
				["Foot and sill", `${F} mm high`],
				["Material", "Aluminium, 3 mm, black anodised"],
				["Corners", "R 30 mm"]
			]
		}, (put) => {
			for (const [z0, h, c] of [
				[
					0,
					F,
					FACE
				],
				[
					F,
					90,
					CASE$3
				],
				[
					110,
					2,
					SEAM
				],
				[
					112,
					13,
					LID$1
				]
			]) put(prism(shellU(4), z0, h), c);
			put(prism(shellU(0), 0, 18), CASE$3);
			put(prism(shellU(0), H - 4, 4), LID$1);
			put(prism(capD, 0, F), FACE);
			if (v >= 9) {
				for (const sx of [-1, 1]) put(prism(postP(sx), 19, POST_9.top - F + 1), FACE);
				put(box(0, Lh + .6, F, 2 * PX - 2, 1.4, 1.2), HOLE);
				for (const sx of [-1, 1]) {
					put(box(sx * PX, Lh + .6, (F + POST_9.top) / 2, 1.4, 1.4, POST_9.top - F), HOLE);
					put(box(sx * (PX + 8), Lh + .6, POST_9.top, 16, 1.4, 1.2), HOLE);
				}
			} else put(box(0, Lh + .6, F, W - 8, 1.4, 1.2), HOLE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 60), -15, -1, 20, LEN - 110, 3), DARK$1);
		});
		part("front", {
			label: "Front plate",
			what: "The upright of the service drawer’s L: the pack’s face above the sill, its round front corners and bands flush with the shell. A long finger pull along its foot and the charge strip along its top; nothing you carry by. The base plate is fixed to its foot.",
			specs: [
				["Size", `460 × 30 × ${H - F} mm`],
				["Pull", "Finger slot, 240 mm"],
				["Material", "Aluminium, black anodised"]
			]
		}, (put) => {
			const Z = v >= 9 ? POST_9.top : F;
			for (const [z0, h, c] of [
				[
					Z,
					110 - Z,
					CASE$3
				],
				[
					110,
					2,
					SEAM
				],
				[
					112,
					13,
					LID$1
				]
			]) put(prism(capD, z0, h), c);
			if (v >= 9) put(box(0, (Y0 + Lh) / 2, (F + Z) / 2, 2 * PX - 1, Lh - Y0, Z - F), CASE$3);
			put(box(0, Lh + 1, 66, 380, 3, 68, 1), FACE);
			put(box(0, Lh + 1.2, 27, 240, 3, 8, 3), BLACK$1);
			put(box(0, Lh + 1.6, 25.5, 228, 2.4, 4, 1), HOLE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 1.2), Y0 + .8, (Z + H) / 2, 3, 1.6, H - Z - 1), HOLE);
			put(box(0, Y0 + .8, H - 1, W - 4, 1.6, 3), HOLE);
		});
		part("base", {
			label: "Base plate",
			what: "The floor of the service drawer’s L, riding on the shell’s foot: every inner part is mounted on it, the cells’ holders, the contact plates, the clamp and the BMS. It runs on two low-friction strips and slides out over the sill.",
			specs: [
				["Size", "444 × 446 × 5 mm"],
				["Material", "Aluminium, 5 mm"],
				["Runs on", "2 PTFE strips"]
			]
		}, (put) => {
			const bw = v >= 9 ? 2 * (PX - 2) : W - 16;
			put(box(0, (Y0 - Lh + 4) / 2, 5.5 + DZ, bw, Y0 + Lh - 4, 5, 1), STEEL$1);
			for (const sx of [-1, 1]) put(box(sx * (v >= 9 ? bw / 2 - 40 : Wh - 40), (Y0 - Lh + 4) / 2, 3.5 + DZ, 14, Y0 + Lh - 10, 1, .3), "#e8e8e4");
			if (v >= 9) for (const sx of [-1, 1]) put(box(sx * (bw / 2 - 2.5), CATCH_Y, 5.5 + DZ, 5.4, 9, 5.2), HOLE);
		});
	} else if (v >= 6) {
		part("tray", {
			label: "Shell",
			what: "The pack’s outer shell: floor, walls, top and back in one smooth aluminium piece with round corners, open only at the front where the service drawer slides in. No lid and no latches any more: nothing opens but the drawer.",
			specs: [
				["Outside", "460 × 450 × 125 mm, the front plate makes 480"],
				["Material", "Aluminium, 3 mm, black anodised"],
				["Corners", "R 30 mm"]
			]
		}, (put) => {
			for (const [z0, h, c] of BANDS) put(prism(shellU(4), z0, h), c);
			put(prism(shellU(0), 0, 3), CASE$3);
			put(prism(shellU(0), H - 4, 4), LID$1);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 60), -15, -1, 20, LEN - 110, 3), DARK$1);
		});
		part("front", {
			label: "Front plate",
			what: "The upright of the service drawer’s L: the pack’s whole face, its round front corners and bands flush with the shell. It carries the grip, the charge strip and the ClickLock; the base plate is fixed to its foot.",
			specs: [["Size", "460 × 30 × 125 mm"], ["Material", "Aluminium, black anodised"]]
		}, (put) => {
			for (const [z0, h, c] of BANDS) put(prism(capD, z0, h), c);
			put(box(0, Lh + 1, 62, 380, 3, 80, 1), FACE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 1.2), Y0 + .8, H / 2, 3, 1.6, H - 1), HOLE);
			put(box(0, Y0 + .8, H - 1, W - 4, 1.6, 3), HOLE);
		});
		part("base", {
			label: "Base plate",
			what: "The floor of the service drawer’s L: every inner part is mounted on it, the cells’ holders, the contact plates, the clamp and the BMS. It runs on the shell’s floor on two low-friction strips.",
			specs: [
				["Size", "444 × 446 × 5 mm"],
				["Material", "Aluminium, 5 mm"],
				["Runs on", "2 PTFE strips"]
			]
		}, (put) => {
			put(box(0, (Y0 - Lh + 4) / 2, 5.5, W - 16, Y0 + Lh - 4, 5, 1), STEEL$1);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 40), (Y0 - Lh + 4) / 2, 3.5, 14, Y0 + Lh - 10, 1, .3), "#e8e8e4");
		});
	} else part("tray", {
		label: "Case",
		what: "The pack’s case: one smooth aluminium shell with round corners, its floor and four walls, a darker foot band, and rails under it to slide on.",
		specs: [
			["Outside", "460 × 480 × 112 mm"],
			["Material", "Aluminium, 3 mm, black anodised"],
			["Corners", "R 30 mm"]
		]
	}, (put) => {
		put(slab(W, LEN, RC, 0, 5), CASE$3);
		put(slab(W, LEN, RC, 0, 16, 4), FACE);
		put(slab(W, LEN, RC, 16, 94, 4), CASE$3);
		put(slab(W, LEN, RC, 110, 2, 3), SEAM);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 60), 0, -1, 20, LEN - 80, 3), DARK$1);
	});
	if (v < 6) part("front", {
		label: "Front panel",
		what: "The pack’s face, set into the case’s front: it carries the handles, the charge strip along its top" + (v < 3 ? " and the terminals." : "; its power and data leave by the plug in its back."),
		specs: [["Size", "380 × 80 mm"]]
	}, (put) => {
		put(box(0, Lh + 1, 62, 380, 3, 80, 1), FACE);
	});
	part("charge", {
		label: "Charge strip",
		what: "A slim LED strip along the top of its face, under the lid’s seam: ten segments light up with the pack’s state of charge.",
		specs: [
			["Length", "380 mm, 10 segments"],
			["Shows", "State of charge, 10 % a segment"],
			["Fed by", "The BMS"]
		]
	}, (put) => {
		put(box(0, Lh + .5, 104, 386, 2, 7, 1), BLACK$1);
		for (let k = 0; k < 10; k++) put(box(-171 + k * 38, Lh + 1.5, 104, 34, 1.5, 4), k < CHARGE ? LED$3 : LED_OFF);
	});
	if (v >= 8) part("handles", {
		label: "Grip",
		what: "One grip for one hand on the shell itself, in the middle of the sill across its foot: carry the pack by it and the shell takes the weight, never the drawer. Its trigger sits at the very height of the ClickLock’s pawls in the foot, so the two release cables run straight to them: close your fingers round it and the pawls pull back, so the pack slides out in the same move; let go and it clicks home again.",
		specs: [
			["Width", "150 mm, for a gloved hand"],
			["Height", `Bar ${GRIP_Z} mm over the foot, trigger at ${lockZ(v)} mm: the lock’s height`],
			["On", "The shell’s sill"],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, GRIP_Z, 16, 28, 15, 5), DARK$1);
		put(box(0, Lh + 30, GRIP_Z, 180, 16, 15, 6), DARK$1);
		put(box(0, Lh + 38.5, GRIP_Z + 3, 120, 1, 2, .4), "#d9dcde");
	});
	else if (v >= 5) part("handles", {
		label: "Grip",
		what: (v >= 7 ? "One grip for one hand, down at the base plate’s level in the middle of its face, between the two release buttons:" : "One grip for one hand, low on its face near the case’s foot:") + " its trigger sits at the very height of the ClickLock’s pawls, so the two release cables run straight to them. Close your fingers round it and the trigger pulls both pawls back, so the pack slides out in the same move; let go and it clicks home again.",
		specs: [
			["Width", "150 mm, for a gloved hand"],
			["Height", `Bar ${GRIP_Z} mm over the foot, trigger at ${lockZ(v)} mm: the lock’s height`],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, GRIP_Z, 16, 28, 34, 6), DARK$1);
		put(box(0, Lh + 30, GRIP_Z, 180, 16, 30, 8), DARK$1);
		put(box(0, Lh + 38.5, GRIP_Z + 4, 120, 1, 2, .4), "#d9dcde");
	});
	else if (v >= 4) part("handles", {
		label: "Grip",
		what: "One grip in the middle of its face, for one hand: close your fingers round it and its trigger pulls the ClickLock’s pawls back, so the pack slides out in the same move; let go and it clicks home again. The pack hangs balanced under it.",
		specs: [
			["Width", "150 mm, for a gloved hand"],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, 62, 16, 28, 34, 6), DARK$1);
		put(box(0, Lh + 30, 62, 180, 16, 30, 8), DARK$1);
		put(box(0, Lh + 38.5, 66, 120, 1, 2, .4), "#d9dcde");
	});
	else part("handles", {
		label: "Handles",
		count: 2,
		what: "Two handles on its face to slide it in and out: at ~26 kg one person lifts it.",
		specs: [["Mass", "~26 kg [inferred]"]]
	}, (put) => {
		for (const sx of [-1, 1]) {
			for (const z of [38, 90]) put(cyl([
				sx * 175,
				Lh,
				z
			], [
				sx * 175,
				Lh + 28,
				z
			], 6, 10), DARK$1);
			put(cyl([
				sx * 175,
				Lh + 28,
				35
			], [
				sx * 175,
				Lh + 28,
				93
			], 7, 10), DARK$1);
		}
	});
	part("plates-bottom", {
		label: "Bottom contact plates",
		count: 8,
		what: "Copper plates under the cells, each joining a row’s minus poles to the next row’s, and the two end plates that go to the terminals.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Joined by", "Pressure, no welds"]]
	}, (put) => {
		put(box(0, rowY(0), 9 + DZ, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
		for (let i = 1; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9 + DZ, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
		put(box(0, rowY(CELLS$1.s - 1), 9 + DZ, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
	});
	part("holder-bottom", {
		label: "Bottom cell holder",
		what: "A plate of flame-retardant plastic with a socket for every cell’s foot: it keeps them 22 mm apart, air between them.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"], ["Pitch", "22 mm"]]
	}, (put) => put(box(0, CELLS$1.y, 13 + DZ, zone.w, zone.l, 6, 1), HOLDER$1));
	part("cells", {
		label: "21700 cells",
		count: CELLS$1.s * CELLS$1.p,
		what: "Cylindrical lithium-ion cells, 21 mm across and 70 mm high, 14 rows in series of 20 side by side. Each is held, not welded: a worn cell is pulled and a new one pushed in.",
		specs: [
			["Cell", "21700, 5 Ah, 3.7 V (NMC) [inferred]"],
			["Pack", "14S20P: 51.8 V, 100 Ah, ~5.2 kWh"],
			["Cells", "280"]
		]
	}, (put) => {
		for (let i = 0; i < CELLS$1.s; i++) for (let j = 0; j < CELLS$1.p; j++) {
			put(cyl([
				colX(j),
				rowY(i),
				z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS$1.r, seg), WRAP$1);
			if (seg > 6) put(cyl([
				colX(j),
				rowY(i),
				top - 2
			], [
				colX(j),
				rowY(i),
				top
			], CELLS$1.r - 2, seg), CAP$1);
		}
	});
	part("holder-top", {
		label: "Top cell holder",
		what: "The same plate over the cells’ heads, its openings leaving each pole bare for the contact plates.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"]]
	}, (put) => put(box(0, CELLS$1.y, top - 6, zone.w, zone.l, 6, 1), HOLDER$1));
	part("plates-top", {
		label: "Top contact plates",
		count: 7,
		what: "Copper plates over the cells, each joining a row’s plus poles to the next row’s minus: with the bottom plates they put the 14 rows in series.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Pressed by", "The lid’s spring pad"]]
	}, (put) => {
		for (let i = 0; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
	});
	part("bms", {
		label: "Battery management system",
		what: "The board behind the cells: a lead to each of the 14 rows, it balances them, keeps them within their voltage and temperature, and opens the pack if anything goes wrong.",
		specs: [
			["Rows", "14S, balanced"],
			["Current", "100 A continuous [inferred]"],
			["Talks", "CAN to the inverter"]
		]
	}, (put) => {
		const y = rowY(CELLS$1.s - 1) + 60;
		put(box(0, y, 50 + DZ, 400, 80, 3, .5), PCB$1);
		for (const x of [
			-140,
			-60,
			30,
			110
		]) put(box(x, y, 54 + DZ, 34, 26, 5, .5), BLACK$1);
		put(box(170, y, 62 + DZ, 50, 40, 22, 2), DARK$1);
		for (let i = 0; i < CELLS$1.s; i += 3) put(cyl([
			-180 + i * 6,
			y - 40,
			52 + DZ
		], [
			-180 + i * 6,
			rowY(i),
			top + 3
		], 1.2, 4), RED$1);
	});
	if (v < 3) part("terminals", {
		label: "Terminals",
		count: 2,
		what: "The pack’s plus and minus on its face, under their covers, and the data plug for the BMS beside them.",
		specs: [["Connectors", "Anderson-type, 120 A [inferred]"], ["Data", "CAN, RJ45"]]
	}, (put) => {
		put(cyl([
			90,
			Lh,
			55
		], [
			90,
			Lh + 16,
			55
		], 13, 16), RED$1);
		put(cyl([
			140,
			Lh,
			55
		], [
			140,
			Lh + 16,
			55
		], 13, 16), BLACK$1);
		put(box(-110, Lh + 3, 55, 26, 4, 20, 2), "#d9d9d9");
	});
	else if (v >= 7) part("terminals", {
		label: "Back socket",
		what: "The pack’s plus, minus and data in one socket flush in its back, nothing sticking out. Its contacts sit at the bottom of pockets that take the cube’s insulating collars: the collars slide in first, then the pins meet their contacts, so no metal is ever open to a finger on either side. Two lined guide holes take the cube’s guide pins first: slide the pack in and it plugs itself into the backplane; pull it out and it lets go.",
		specs: [
			["Power", "2 pockets ⌀ 19 mm, sockets for ⌀ 8 mm pins, 120 A [inferred]"],
			["Data", "CAN, 4 sockets in one pocket"],
			["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"],
			["Touch", "Finger-safe, IP2X"]
		]
	}, (put) => {
		const yb = -Lh - 2;
		put(box(0, -Lh - 1, 58, 170, 2, 46, 1), BLACK$1);
		/** a hole: its lining ring a little wider, its dark inside over it @param {number} x @param {number} z @param {number} r @param {string} ring */
		const hole = (x, z, r, ring) => {
			put(cyl([
				x,
				yb,
				z
			], [
				x,
				yb - .4,
				z
			], r + 2, 16), ring);
			put(cyl([
				x,
				yb - .4,
				z
			], [
				x,
				yb - .6,
				z
			], r, 16), HOLE);
		};
		for (const x of [-45, 45]) {
			hole(x, 58, 9.5, FACE);
			put(cyl([
				x,
				yb - .6,
				58
			], [
				x,
				yb - .8,
				58
			], 4.5, 12), x < 0 ? RED$1 : COPPER$3);
		}
		const dz = v >= 8 ? 58 : 72;
		put(box(0, yb - .2, dz, 50, .4, 16, 2), FACE);
		put(box(0, yb - .5, dz, 45, .4, 13, 2), HOLE);
		for (let k = 0; k < 4; k++) put(cyl([
			-12 + k * 8,
			yb - .7,
			dz
		], [
			-12 + k * 8,
			yb - .9,
			dz
		], 1.6, 8), CAP$1);
		for (const sx of [-1, 1]) {
			put(cyl([
				sx * 150,
				-Lh,
				58
			], [
				sx * 150,
				-Lh - 1.5,
				58
			], 11, 16), BLACK$1);
			hole(sx * 150, 58, 5.5, STEEL$1);
		}
	});
	else if (v >= 5) part("terminals", {
		label: "Back socket",
		what: "The pack’s plus, minus and data in one socket flush in its back: proper holes, nothing sticking out. Two lined guide holes take the cube’s guide pins first, then its two power pins and four data pins slide into their sockets: slide the pack in and it plugs itself into the backplane; pull it out and it lets go. With nothing proud on its back, it stands on any shelf and no contact gets bent.",
		specs: [
			["Power", "2 sockets for ⌀ 8 mm pins, 120 A [inferred]"],
			["Data", "CAN, 4 sockets"],
			["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"]
		]
	}, (put) => {
		const yb = -Lh - 2;
		put(box(0, -Lh - 1, 58, 170, 2, 46, 1), BLACK$1);
		/** a hole: its lining ring a little wider, its dark inside over it @param {number} x @param {number} z @param {number} r @param {string} ring */
		const hole = (x, z, r, ring) => {
			put(cyl([
				x,
				yb,
				z
			], [
				x,
				yb - .4,
				z
			], r + 2, 16), ring);
			put(cyl([
				x,
				yb - .4,
				z
			], [
				x,
				yb - .6,
				z
			], r, 16), HOLE);
		};
		for (const x of [-45, 45]) hole(x, 58, 6, x < 0 ? RED$1 : COPPER$3);
		for (let k = 0; k < 4; k++) hole(-12 + k * 8, 72, 1.6, CAP$1);
		for (const sx of [-1, 1]) {
			put(cyl([
				sx * 150,
				-Lh,
				58
			], [
				sx * 150,
				-Lh - 1.5,
				58
			], 11, 16), BLACK$1);
			hole(sx * 150, 58, 5.5, STEEL$1);
		}
	});
	else part("terminals", {
		label: "Back plug",
		what: "The pack’s plus, minus and data in one blind-mate plug in its back, between two guide pins: slide the pack in and it plugs itself into the cube’s backplane; pull it out by its handles and it lets go. No cables, no bolts.",
		specs: [
			["Power", "2 × 120 A blade contacts [inferred]"],
			["Data", "CAN, 4 pins"],
			["Guides", "2 pins, ⌀ 10 mm"]
		]
	}, (put) => {
		put(box(0, -Lh - 3, 58, 170, 6, 46, 1), BLACK$1);
		for (const x of [-45, 45]) put(box(x, -Lh - 7, 58, 34, 3, 12), x < 0 ? RED$1 : COPPER$3);
		put(box(0, -Lh - 7, 58, 22, 3, 10), CAP$1);
		for (const sx of [-1, 1]) put(cyl([
			sx * 150,
			-Lh,
			58
		], [
			sx * 150,
			-Lh - 12,
			58
		], 5, 10), STEEL$1);
	});
	if (v === 3) part("clicklock", {
		...CLICKLOCK,
		what: `${CLICKLOCK.what} In a BatteryCube the pawls click in just as its back plug meets the backplane.`
	}, (put) => clickLatch(box, put, {
		half: Wh,
		face: Lh,
		z: 10,
		tabZ: 24
	}));
	if (v >= 5) for (const [id, info, draw] of clickLockPieces(box, cyl, {
		half: Wh,
		face: Lh,
		z: lockZ(v),
		back: lockBack(v),
		grip: [
			0,
			Lh + 22,
			lockZ(v)
		],
		straight: true
	})) part(id, info, draw);
	else if (v >= 4) for (const [id, info, draw] of clickLockPieces(box, cyl, {
		half: Wh,
		face: Lh,
		z: 10,
		grip: [
			0,
			Lh + 22,
			52
		]
	})) part(id, info, draw);
	if (v >= 6) {
		part("clamp", {
			label: "Clamp",
			what: "A stiff plate on four posts over the cells, its spring pad pressing every top contact plate onto its poles: the job the lid did, now on the drawer, so the cells stay pressed when it comes out.",
			specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"], ["Posts", "4, from the base plate"]]
		}, (put) => {
			put(box(0, CELLS$1.y, top + 8, zone.w - 10, zone.l - 10, 4, 2), STEEL$1);
			put(box(0, CELLS$1.y, top + 4, zone.w - 14, zone.l - 14, 4, 1), "#d8d1bf");
			for (const sx of [-1, 1]) for (const sy of [-1, 1]) put(cyl([
				sx * (zone.w / 2 - 4),
				CELLS$1.y + sy * (zone.l / 2 - 4),
				8 + DZ
			], [
				sx * (zone.w / 2 - 4),
				CELLS$1.y + sy * (zone.l / 2 - 4),
				top + 10
			], 3, 8), STEEL$1);
		});
		part("inner-plug", {
			label: "Inner plug",
			what: "At the back of the drawer: the BMS’s plus, minus and data in one plug that slides onto the inside of the shell’s back socket as the drawer goes home.",
			specs: [["Power", "2 × 120 A [inferred]"], ["Data", "CAN"]]
		}, (put) => {
			put(box(0, -Lh + 14, 40 + DZ, 150, 12, 30, 1), BLACK$1);
		});
		for (const [sx, side] of [[-1, "left"], [1, "right"]]) {
			if (v >= 9) {
				const bx = sx * (PX + 8), bz = 18, cz = 5.5 + DZ;
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button in the face of the shell’s corner column on its side, at the base plate’s level: part of the shell, so it stays put while the drawer comes out. Behind it a short plunger with a wedge runs back inside the column and pushes the catch’s bolt out of its notch in the base plate. Press both, pull the drawer by its finger pull, and the whole inside slides out between the columns.",
					specs: [
						["Button", "⌀ 10 mm, 4 mm travel"],
						["On", "The shell’s corner column"],
						["Force", "~10 N each [inferred]"]
					]
				}, (put) => {
					put(cyl([
						bx,
						Lh + .2,
						bz
					], [
						bx,
						Lh + 1,
						bz
					], 7, 18), STEEL$1);
					put(cyl([
						bx,
						Lh - 4,
						bz
					], [
						bx,
						Lh + 2.4,
						bz
					], 5, 18), "#3a3f44");
					put(cyl([
						bx,
						Lh - 6,
						bz
					], [
						bx,
						CATCH_Y + 6,
						bz
					], 1.8, 6), STEEL$1);
					put(box(bx, CATCH_Y + 4, (bz + cz) / 2, 6, 6, cz - bz + 6, .5), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring bolt lying across inside the shell’s corner column, at the base plate’s height: its spring pushes its tip into a notch in the base plate’s edge and holds the drawer in. The button’s wedge pushes it back out; slide the drawer home and the bolt clicks in again on its own.",
					specs: [
						["Bolt", "Stainless, ⌀ 6 mm, 5 mm travel"],
						["Spring", "Compression, ~12 N [inferred]"],
						["In", "The shell’s corner column"]
					]
				}, (put) => {
					put(cyl([
						sx * (PX - 4.5),
						CATCH_Y,
						cz
					], [
						sx * (Wh - 8),
						CATCH_Y,
						cz
					], 2.5, 12), STEEL$1);
					put(cyl([
						sx * (PX + 9),
						CATCH_Y,
						cz
					], [
						sx * (PX + 11),
						CATCH_Y,
						cz
					], 3.5, 12), STEEL$1);
					for (let k = 0; k < 5; k++) put(cyl([
						sx * (PX + 13 + k * 4),
						CATCH_Y,
						cz
					], [
						sx * (PX + 14 + k * 4),
						CATCH_Y,
						cz
					], 3.4, 10), "#b8bdc0");
				});
				continue;
			}
			if (v >= 8) {
				const bx = sx * (Wh - 26), bz = FOOT_8 / 2;
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button in the shell’s sill, at its outer end on the face: part of the shell, so it stays put while the drawer comes out. A short rod behind it pulls the drawer’s catch on that side down. Press both, pull the drawer by its finger pull, and the whole inside slides out over the sill.",
					specs: [
						["Button", "⌀ 13 mm, 4 mm travel"],
						["On", "The shell’s sill"],
						["Force", "~10 N each [inferred]"]
					]
				}, (put) => {
					put(cyl([
						bx,
						Lh + .2,
						bz
					], [
						bx,
						Lh + 1,
						bz
					], 8.5, 18), STEEL$1);
					put(cyl([
						bx,
						Lh - 4,
						bz
					], [
						bx,
						Lh + 2.6,
						bz
					], 6.2, 18), "#3a3f44");
					put(cyl([
						bx,
						Lh - 6,
						bz
					], [
						sx * (Wh - 30),
						Y0 - 16,
						16
					], 1.6, 6), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring-steel tongue in the shell’s foot, just behind the sill: its hook springs up into a notch under the drawer’s base plate and holds the drawer in. The button on its side pulls it down.",
					specs: [
						["Tongue", "Spring steel, 1 mm"],
						["Hook", "8 × 6 mm"],
						["On", "The shell’s foot"]
					]
				}, (put) => {
					put(box(sx * (Wh - 30), Y0 - 26, 17, 10, 24, 2, .4), STEEL$1);
					put(box(sx * (Wh - 30), Y0 - 16, 21.5, 8, 6, 7, .8), STEEL$1);
				});
				continue;
			}
			if (v >= 7) {
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button low on the face, at its left or right end, level with the base plate. A short rod behind it pulls the drawer’s spring catch on that side in, out of its hole in the shell. Press both, pull the grip, and the drawer slides out: everything from the front.",
					specs: [["Button", "⌀ 16 mm, 4 mm travel"], ["Force", "~10 N each [inferred]"]]
				}, (put) => {
					put(cyl([
						sx * REL.x,
						Lh + .2,
						REL.z
					], [
						sx * REL.x,
						Lh + 1,
						REL.z
					], 11, 18), STEEL$1);
					put(cyl([
						sx * REL.x,
						Lh - 4,
						REL.z
					], [
						sx * REL.x,
						Lh + 3,
						REL.z
					], 8, 18), "#3a3f44");
					put(cyl([
						sx * REL.x,
						Lh - 6,
						REL.z
					], [
						sx * (Wh - 10),
						REL.y + 4,
						REL.z
					], 1.8, 6), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring-steel tongue on the base plate, just inside the shell’s front: its knob springs out into a hole in the shell’s side and holds the drawer in. The front button on its side pulls it back.",
					specs: [["Tongue", "Spring steel, 1 mm"], ["Knob", "⌀ 8 mm"]]
				}, (put) => {
					put(box(sx * (Wh - 9), REL.y, (8 + REL.z) / 2 + 1, 2, 14, REL.z - 6, .5), STEEL$1);
					put(cyl([
						sx * (Wh - 10),
						REL.y,
						REL.z
					], [
						sx * (Wh + .6),
						REL.y,
						REL.z
					], 4, 12), STEEL$1);
				});
				continue;
			}
			part(`release-${side}`, {
				label: `Release button, ${side}`,
				what: "A round push button flush in the shell’s side. Press both at once and they push the drawer’s two spring catches back inside, out of their holes; pull the grip and the drawer slides out. In a cube the buttons face the rails, so the drawer can only come out of a pack that is out.",
				specs: [["Button", "⌀ 16 mm, 4 mm travel"], ["Force", "~10 N each [inferred]"]]
			}, (put) => {
				put(cyl([
					sx * (Wh + .2),
					REL.y,
					REL.z
				], [
					sx * (Wh + 1),
					REL.y,
					REL.z
				], 11, 18), STEEL$1);
				put(cyl([
					sx * (Wh - 4),
					REL.y,
					REL.z
				], [
					sx * (Wh + 2.5),
					REL.y,
					REL.z
				], 8, 18), "#3a3f44");
			});
			part(`catch-${side}`, {
				label: `Drawer catch, ${side}`,
				what: "A spring-steel tongue standing up from the base plate: its knob springs out into a hole in the shell’s side and holds the drawer in. Its release button pushes it back.",
				specs: [["Tongue", "Spring steel, 1 mm"], ["Knob", "⌀ 10 mm"]]
			}, (put) => {
				put(box(sx * (Wh - 7), REL.y, (8 + REL.z) / 2 + 2, 2, 14, REL.z - 4, .5), STEEL$1);
				put(cyl([
					sx * (Wh - 8),
					REL.y,
					REL.z
				], [
					sx * (Wh - 4),
					REL.y,
					REL.z
				], 5, 12), STEEL$1);
			});
		}
	} else {
		part("lid", {
			label: "Lid",
			what: "The lid, its round corners and soft edge flush with the case, and the spring pad under it: closing it presses every contact plate onto its poles, the whole pack’s only joining force.",
			specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"], ["Corners", "R 30 mm"]]
		}, (put) => {
			put(slab(W, LEN, RC, H - 13, 13, 0, 5), LID$1);
			put(box(0, CELLS$1.y, H - 19, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
		});
		part("latches", {
			label: "Latches",
			count: 4,
			what: "Four flush over-centre latches, two a side: flip them and the lid lifts. No tool opens the pack.",
			specs: [["Type", "Over-centre, flush"]]
		}, (put) => {
			for (const sx of [-1, 1]) for (const y of [-120, 120]) put(box(sx * (Wh + 1.5), y, H - 16, 4, 36, 22, 1.5), FACE);
		});
	}
}

//#endregion
//#region src/lib/actors/batterycube.js
const SRC_B$1 = "BatteryCube (our design)";
const CASE$2 = "#e4e6e3";
const COPPER$2 = "#b87333";
const BLUE$1 = "#2f6fb5";
const SCREEN$1 = "#1d3b4a";
const LED$2 = "#3ddc84";
const YELLOW$1 = "#f0c419";
/** the packs: four BatteryPacks, 460 × 480 × 125 mm, stacked 130 apart over the skids, a little ahead of the middle */
const MOD$1 = /* @__PURE__ */ (() => ({
	l: PACK$1.L,
	gap: 130,
	y: 75
}))();
const ASSEMBLIES$1 = [
	{
		id: "frame",
		label: "Frame",
		note: "The Power Cube’s own 27\" frame: two 4×4 tube skids, 2×2 angle posts and top rails, the quick-attach plate and two lifting eyes, so the BatteryCube is lifted, stacked and coupled like any cube.",
		out: [
			0,
			-.04,
			0
		]
	},
	{
		id: "battery",
		label: "Battery",
		note: "Four BatteryPacks of 280 cells each (51.8 V, ~5.2 kWh), ~20.7 kWh in all, each plugged by its back into the backplane that joins them side by side.",
		out: [
			0,
			.45,
			.12
		]
	},
	{
		id: "power",
		label: "Inverter and sockets",
		note: "The 6 kW bidirectional inverter on the back: it charges the packs from the sun through its MPPT input or from outside power at its AC inlet (the grid, an ElectroCube, a generator), and gives 230 V to the sockets.",
		out: [
			0,
			-.5,
			.05
		]
	}
];
const STEPS$1 = [
	"Cut, drill and bolt the frame: skids, posts, top rails, quick-attach plate",
	"Fit the backplane; slide in the four BatteryPacks, each plugs itself in",
	"Mount the inverter on the back; wire the solar input, the AC inlet, the breakers and the sockets"
];
/** a BatteryCube's insides at version `v` (2: one-way inverter, no AC inlet; 3: bidirectional, its AC inlet;
* 4: its packs at v4, a centre grip each; 6: its packs at v5, the grip low and the lock at its height, and pins on the
* backplane for the packs' holes; 7: its packs at v6, a service drawer in each; 8: its packs at v7, grip and lock at
* the base plate's level, its rails lowered to meet them, and every live pin sunk in an insulating collar; 9: its packs
* at v8, grip and lock in the shell's foot, the rails lower still, and every pin of a header in one line; 10: its
* packs at v9, their release buttons in the shells' corner columns)
* @param {Parameters<import('./powercube.js').Insides>[0]} part @param {Parameters<import('./powercube.js').Insides>[1]} tools */
function cells$1(part, { box, cyl, P, kit, Lh, B, base }, v = 10) {
	const pv = v >= 10 ? 9 : v >= 9 ? 8 : v >= 8 ? 7 : v >= 7 ? 6 : v >= 6 ? 5 : v >= 4 ? 4 : 3;
	for (let k = 0; k < 4; k++) batteryPackParts$1(kit, {
		at: P(0, MOD$1.y, B + 10 + k * MOD$1.gap),
		base,
		assembly: () => "battery",
		step: () => 2,
		prefix: `pack-${k + 1}-`,
		unit: `pack-${k + 1}`,
		seg: 6,
		v: pv
	});
	const back = MOD$1.y - MOD$1.l / 2, top = B + 10 + 4 * MOD$1.gap;
	if (v >= 8) part("battery", {
		id: "backplane",
		label: "Backplane",
		source: SRC_B$1,
		what: "A board behind the stack with a pin header for each BatteryPack. Every live pin stands sunk in its own insulating collar: the two copper power pins each in a round shroud, the four data pins together in one between them, their tips 5 mm below the rims, so a finger (or a dropped tool) meets plastic, never metal (finger-safe, IP2X). Slide a pack in and the collars go into matching pockets in its back socket before any pin touches its contact. Two long steel guide pins with pointed tips find the pack’s guide holes first; they carry no current, so they stay bare. Copper bars inside the board join the four side by side and carry their 52 V to the inverter.",
		specs: [
			["Headers", "4, blind-mate, finger-safe (IP2X)"],
			["Power pins", "2 per pack, ⌀ 8 mm, 120 A [inferred], each in a ⌀ 18 mm collar, 5 mm sunk"],
			["Data pins", "4 per pack, CAN, in one shroud, 5 mm sunk"],
			["Guide pins", "2 per pack, ⌀ 10 × 24 mm, pointed, no current"],
			["Bus", "Tinned copper, 30 × 5 mm, 125 A"]
		]
	}, base, (put) => {
		put(box(0, back - 15, (B + top) / 2, 420, 10, top - B, 2), DARK$2);
		for (let k = 0; k < 4; k++) {
			const z = B + 10 + k * MOD$1.gap + 58;
			const f = back - 9, lip = back + 15;
			put(box(0, back - 12, z, 180, 6, 54, 1), BLACK$2);
			for (const x of [-45, 45]) {
				put(cyl([
					x,
					f,
					z
				], [
					x,
					lip,
					z
				], 9, 18), BLACK$2);
				put(cyl([
					x,
					lip,
					z
				], [
					x,
					lip + .3,
					z
				], 6, 18), "#050607");
				put(cyl([
					x,
					lip + .3,
					z
				], [
					x,
					lip + .5,
					z
				], 3.2, 12), x < 0 ? RED$2 : COPPER$2);
			}
			const dz = v >= 9 ? z : z + 14;
			put(box(0, (f + lip) / 2, dz, 44, lip - f, 12, 2), BLACK$2);
			put(box(0, lip + .15, dz, 38, .3, 7, 1), "#050607");
			for (let j = 0; j < 4; j++) put(cyl([
				-12 + j * 8,
				lip + .3,
				dz
			], [
				-12 + j * 8,
				lip + .5,
				dz
			], 1.2, 6), CASE$2);
			for (const sx of [-1, 1]) {
				put(cyl([
					sx * 150,
					back - 14,
					z
				], [
					sx * 150,
					f,
					z
				], 10, 14), BLACK$2);
				put(cyl([
					sx * 150,
					f,
					z
				], [
					sx * 150,
					back + 10,
					z
				], 5, 14), STEEL$2);
				put(cyl([
					sx * 150,
					back + 10,
					z
				], [
					sx * 150,
					back + 15,
					z
				], 5, 14, 1.5), STEEL$2);
			}
		}
		for (const x of [-60, 60]) put(box(x, back - 25, B + 300, 30, 10, 60, 1), COPPER$2);
	});
	else if (v >= 6) part("battery", {
		id: "backplane",
		label: "Backplane",
		source: SRC_B$1,
		what: "A board behind the stack with a pin header for each BatteryPack: two long steel guide pins with pointed tips find the pack’s guide holes first, then two copper power pins and four data pins slide into its sockets. The pins are on the cube, the holes in the pack: a pack on its own has nothing sticking out. Copper bars inside the board join the four side by side and carry their 52 V to the inverter.",
		specs: [
			["Headers", "4, blind-mate"],
			["Guide pins", "2 per pack, ⌀ 10 × 24 mm, pointed"],
			["Power pins", "2 per pack, ⌀ 8 mm, 120 A [inferred]"],
			["Data pins", "4 per pack, CAN"],
			["Bus", "Tinned copper, 30 × 5 mm, 125 A"]
		]
	}, base, (put) => {
		put(box(0, back - 15, (B + top) / 2, 420, 10, top - B, 2), DARK$2);
		for (let k = 0; k < 4; k++) {
			const z = B + 10 + k * MOD$1.gap + 58;
			const f = back - 9;
			put(box(0, back - 12, z, 180, 6, 54, 1), BLACK$2);
			for (const x of [-45, 45]) {
				put(cyl([
					x,
					f,
					z
				], [
					x,
					back + 10,
					z
				], 4, 12), x < 0 ? RED$2 : COPPER$2);
				put(cyl([
					x,
					back + 10,
					z
				], [
					x,
					back + 12,
					z
				], 4, 12, 3), x < 0 ? RED$2 : COPPER$2);
			}
			for (let j = 0; j < 4; j++) put(cyl([
				-12 + j * 8,
				f,
				z + 14
			], [
				-12 + j * 8,
				back + 8,
				z + 14
			], 1.2, 6), CASE$2);
			for (const sx of [-1, 1]) {
				put(cyl([
					sx * 150,
					back - 14,
					z
				], [
					sx * 150,
					f,
					z
				], 10, 14), BLACK$2);
				put(cyl([
					sx * 150,
					f,
					z
				], [
					sx * 150,
					back + 10,
					z
				], 5, 14), STEEL$2);
				put(cyl([
					sx * 150,
					back + 10,
					z
				], [
					sx * 150,
					back + 15,
					z
				], 5, 14, 1.5), STEEL$2);
			}
		}
		for (const x of [-60, 60]) put(box(x, back - 25, B + 300, 30, 10, 60, 1), COPPER$2);
	});
	else part("battery", {
		id: "backplane",
		label: "Backplane",
		source: SRC_B$1,
		what: "A board behind the stack with a socket for each BatteryPack: slide a pack in and its back plug finds its socket on the guide pins; pull it out and it lets go. Copper bars inside it join the four side by side and carry their 52 V to the inverter.",
		specs: [
			["Sockets", "4, blind-mate"],
			["Bus", "Tinned copper, 30 × 5 mm, 125 A"],
			["Data", "CAN from every pack to the inverter"]
		]
	}, base, (put) => {
		put(box(0, back - 15, (B + top) / 2, 420, 10, top - B, 2), DARK$2);
		for (let k = 0; k < 4; k++) {
			const z = B + 10 + k * MOD$1.gap + 58;
			put(box(0, back - 13, z, 180, 8, 54, 1), BLACK$2);
			for (const x of [-45, 45]) put(box(x, back - 9, z, 38, 1, 16), x < 0 ? RED$2 : COPPER$2);
		}
		for (const x of [-60, 60]) put(box(x, back - 25, B + 300, 30, 10, 60, 1), COPPER$2);
	});
	part("battery", {
		...CLICKLOCK,
		id: "pack-rails",
		label: "Pack rails",
		count: 4,
		source: SRC_B$1,
		what: `${CLICKLOCK.what} Here: a pair of rails for each BatteryPack, their keepers where the pack’s back plug meets the backplane.`
	}, base, (put) => {
		for (let k = 0; k < 4; k++) clickKeeper(box, put, {
			half: PACK$1.W / 2,
			face: MOD$1.y + MOD$1.l / 2,
			z: B + 10 + k * MOD$1.gap + lockZ(pv) - 6,
			len: MOD$1.l,
			back: lockBack(pv)
		});
	});
	part("power", {
		id: "inverter",
		label: "Hybrid inverter",
		source: SRC_B$1,
		what: v < 3 ? "One box does it all: an MPPT solar charger, a battery charger and a pure-sine inverter. It fills the packs from the panels by day and turns their 52 V into 230 V for the home by night." : "One bidirectional box does it all: an MPPT solar charger, a charger from outside power and a pure-sine inverter. It fills the packs from the panels by day, or from the grid, an ElectroCube or a generator at its AC inlet, and turns their 52 V into 230 V for the home.",
		specs: [
			["Power", "6 kW continuous, 12 kW peak [inferred]"],
			["Solar in", "500 V, 2 × MPPT, up to 8 kWp"],
			["AC in (charging)", "230 V, up to 5 kW [inferred]"],
			["Out", "230 V, 50 Hz"],
			["Battery", "52 V, CAN to every pack"]
		]
	}, base, (put) => {
		put(box(0, -Lh + 80, B + 290, 520, 100, 520, 10), CASE$2);
		put(box(-80, -Lh + 28, B + 400, 180, 4, 110, 4), SCREEN$1);
		for (const [x, c] of [
			[60, LED$2],
			[90, YELLOW$1],
			[120, RED$2]
		]) put(box(x, -Lh + 28, B + 430, 14, 4, 14, 2), c);
		for (let k = 0; k < 7; k++) put(box(-230 + k * 76, -Lh + 80, B + 560, 8, 90, 20, 1), STEEL$2);
	});
	part("power", {
		id: "solar-in",
		label: "Solar input",
		count: 2,
		source: SRC_B$1,
		what: "Where the panels plug in: a pair of MC4 connectors, plus and minus, and the DC isolator that cuts them off.",
		specs: [["Connectors", "MC4"], ["Isolator", "1,000 V DC"]]
	}, base, (put) => {
		put(cyl([
			200,
			-Lh + 30,
			B + 80
		], [
			200,
			-Lh - 10,
			B + 80
		], 12, 10), RED$2);
		put(cyl([
			240,
			-Lh + 30,
			B + 80
		], [
			240,
			-Lh - 10,
			B + 80
		], 12, 10), BLACK$2);
		put(box(200, -Lh + 26, B + 170, 80, 10, 90, 4), YELLOW$1);
		put(box(200, -Lh + 18, B + 170, 26, 8, 50, 3), RED$2);
	});
	if (v >= 3) part("power", {
		id: "ac-in",
		label: "AC inlet",
		source: SRC_B$1,
		what: "Where outside power comes in to charge it: a red-ringed 230 V inlet under a spring lid. Plug in the grid, an ElectroCube or a generator and the inverter runs backwards, filling the packs.",
		specs: [["Inlet", "230 V, 16 A (CEE)"], ["Charges at", "up to 5 kW [inferred]"]]
	}, base, (put) => {
		put(box(-220, -Lh + 26, B + 200, 64, 8, 64, 6), BLUE$1);
		put(cyl([
			-220,
			-Lh + 24,
			B + 200
		], [
			-220,
			-Lh - 10,
			B + 200
		], 24, 14), BLUE$1);
		put(cyl([
			-220,
			-Lh - 10,
			B + 200
		], [
			-220,
			-Lh - 12,
			B + 200
		], 26, 14), RED$2);
	});
	part("power", {
		id: "sockets",
		label: "Sockets and breakers",
		count: 2,
		source: SRC_B$1,
		what: "What it gives out: two blue 230 V sockets under spring lids for a home or tools, behind a main breaker and a 30 mA earth-leakage breaker.",
		specs: [["Sockets", "2 × 230 V, 16 A (CEE blue)"], ["Protection", "Main breaker + 30 mA RCD"]]
	}, base, (put) => {
		for (const x of [-220, -150]) put(box(x, -Lh + 26, B + 120, 64, 8, 64, 6), BLUE$1), put(cyl([
			x,
			-Lh + 24,
			B + 120
		], [
			x,
			-Lh - 10,
			B + 120
		], 24, 14), BLUE$1);
		put(box(-60, -Lh + 26, B + 120, 70, 8, 60, 3), DARK$2);
	});
}
/** The BatteryCube on its own (version `v`; from v5 it pulls a pack out and pushes it back as a move), every part its own: drawn apart, built. Its size is the Power Cube's. @returns {import('./rig').Cast} */
const batteryCube$1 = (v = 10) => {
	const cast = cubeCast({
		name: "BatteryCube",
		assemblies: ASSEMBLIES$1,
		steps: STEPS$1,
		stepOf: {
			frame: 1,
			battery: 2,
			power: 3
		},
		sources: POWERCUBE_SOURCES,
		hums: false,
		len: CUBE.L,
		engine: false,
		controls: false,
		insides: (part, tools) => cells$1(part, tools, v)
	});
	if (v < 5) return cast;
	const ids = (cast.catalog?.parts ?? []).map((p) => p.id).filter((id) => id.startsWith(PULLED));
	/** @param {number} out how far it is out (m) @param {number} squeeze the trigger, 0…1 @returns {import('./rig').Pose} */
	const pulled = (out, squeeze) => {
		/** @type {import('./rig').Pose} */
		const p = {};
		for (const id of ids) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			0,
			0,
			out
		];
		p[`p.${PULLED}lock-trigger`] = [
			0,
			0,
			0,
			1,
			0,
			squeeze * .004,
			out
		];
		return p;
	};
	const s = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
	cast.clips["pull out"] = (t) => {
		const u = loop(t, 8) * 8;
		const squeeze = s(u, .3, .7) - s(u, 3.2, 3.4);
		const out = PULL * (s(u, .8, 3) - s(u, 4.6, 6.8));
		return pulled(out, squeeze);
	};
	cast.poses = {
		...cast.poses,
		"pulled out": pulled(PULL, 0)
	};
	return cast;
};
/** the pack that comes out, and how far (m): most of its length, its back plug well clear of the backplane */
const PULLED = "pack-3-";
const PULL = .36;

//#endregion
//#region src/lib/actors/batterypack.v1.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Cast} Cast */
/** @typedef {[number, number, number]} MM a point of the pack: x across, y forward, z up (mm) */
const S = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK = {
	W: 460,
	L: 480,
	H: 125
};
/** its cells: 14 rows in series (along y) of 20 in parallel (along x), 22 mm apart, standing; their zone's middle */
const CELLS = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 16,
	y: -55
};
const SRC = "BatteryPack (our design)";
const CASE$1 = "#3a4046";
const LID = "#c5cacc";
const HOLDER = "#1b1d1f";
const WRAP = "#2f6fb5";
const CAP = "#c9ccce";
const COPPER$1 = "#c27a43";
const PCB = "#2c7a4a";
const DARK = "#202326";
const RED = "#c8372d";
const BLACK = "#161718";
const LED$1 = "#3ddc84";
const STEEL = "#8d9396";
const STEP = {
	tray: 1,
	front: 1,
	handles: 1,
	"plates-bottom": 2,
	"holder-bottom": 2,
	cells: 2,
	"holder-top": 3,
	"plates-top": 3,
	bms: 4,
	terminals: 4,
	lid: 5,
	latches: 5
};
const GROUP = {
	tray: "case",
	front: "case",
	handles: "case",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
	terminals: "electronics",
	lid: "lid",
	latches: "lid"
};
/**
* Add a BatteryPack's parts to a machine's kit, its foot's middle at `at` (actor metres), its front towards +z.
* `assembly` and `step` say where each part goes in the machine's catalog; with `unit`, the pack arrives whole.
* `seg`: the sides of a cell (fewer where many packs stand closed).
* @param {ReturnType<typeof machineKit>} kit
* @param {{ at: V3, base: string, assembly?: (g: string) => string, step?: (p: string) => number, prefix?: string, unit?: string, seg?: number }} o
*/
function batteryPackParts(kit, { at, base, assembly = (g) => g, step = (p) => STEP[p], prefix = "", unit, seg = 10 }) {
	const m = new three.Matrix4().makeTranslation(...at);
	/** @param {number} x @param {number} y @param {number} z @returns {V3} */
	const L = (x, y, z) => [
		x * S,
		z * S,
		y * S
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 1.5) => T(r > 2 ? block(w * S, h * S, l * S, L(x, y, z), r * S) : new three.BoxGeometry(w * S, h * S, l * S).translate(...L(x, y, z)));
	/** @param {MM} a @param {MM} b @param {number} r @param {number} [n] */
	const cyl = (a, b, r, n = 12) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
		const g = new three.CylinderGeometry(r * S, r * S, A.distanceTo(B), n);
		g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
		return T(g);
	};
	const { W, L: LEN, H } = PACK;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS.y + (i - (CELLS.s - 1) / 2) * CELLS.pitch;
	const colX = (j) => (j - (CELLS.p - 1) / 2) * CELLS.pitch;
	const zone = {
		w: CELLS.p * CELLS.pitch + 6,
		l: CELLS.s * CELLS.pitch + 6
	};
	const top = CELLS.z0 + CELLS.h;
	/** @param {string} p @param {Omit<import('./parts.js').PartInfo, 'assembly' | 'step' | 'id'>} info @param {(put: (geo: THREE.BufferGeometry, color: string) => void) => void} make */
	const part = (p, info, make) => kit.part({
		...info,
		id: `${prefix}${p}`,
		assembly: assembly(GROUP[p]),
		step: step(p),
		source: SRC,
		...unit ? { unit } : {}
	}, base, make);
	part("tray", {
		label: "Tray",
		what: "The pack’s aluminium tray: a floor and four walls the holders sit in, with ribs under it to slide on rails.",
		specs: [["Outside", "460 × 480 × 112 mm"], ["Material", "Aluminium, 2 mm, anodised"]]
	}, (put) => {
		put(box(0, 0, 2.5, W, LEN, 5), CASE$1);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 2), 0, 58, 4, LEN, 106), CASE$1);
		put(box(0, -Lh + 2, 58, W, 4, 106), CASE$1);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 30), 0, -1, 20, LEN - 20, 3), DARK);
	});
	part("front", {
		label: "Front panel",
		what: "The pack’s face: it closes the tray’s front and carries the handles, the terminals and the state-of-charge lights.",
		specs: [["Size", "460 × 125 mm"]]
	}, (put) => {
		put(box(0, Lh - 3, H / 2, W, 6, H, 2), DARK);
		for (let k = 0; k < 5; k++) put(box(-60 + k * 16, Lh + 1, 96, 10, 3, 6, 1), LED$1);
	});
	part("handles", {
		label: "Handles",
		count: 2,
		what: "Two handles on its face to slide it in and out: at ~26 kg one person lifts it.",
		specs: [["Mass", "~26 kg [inferred]"]]
	}, (put) => {
		for (const sx of [-1, 1]) {
			for (const z of [35, 95]) put(cyl([
				sx * 205,
				Lh,
				z
			], [
				sx * 205,
				Lh + 32,
				z
			], 6, 8), STEEL);
			put(cyl([
				sx * 205,
				Lh + 32,
				32
			], [
				sx * 205,
				Lh + 32,
				98
			], 7, 8), STEEL);
		}
	});
	part("plates-bottom", {
		label: "Bottom contact plates",
		count: 8,
		what: "Copper plates under the cells, each joining a row’s minus poles to the next row’s, and the two end plates that go to the terminals.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Joined by", "Pressure, no welds"]]
	}, (put) => {
		put(box(0, rowY(0), 9, zone.w - 6, CELLS.pitch - 3, 1.5, .3), COPPER$1);
		for (let i = 1; i < CELLS.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9, zone.w - 6, 2 * CELLS.pitch - 3, 1.5, .3), COPPER$1);
		put(box(0, rowY(CELLS.s - 1), 9, zone.w - 6, CELLS.pitch - 3, 1.5, .3), COPPER$1);
	});
	part("holder-bottom", {
		label: "Bottom cell holder",
		what: "A plate of flame-retardant plastic with a socket for every cell’s foot: it keeps them 22 mm apart, air between them.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"], ["Pitch", "22 mm"]]
	}, (put) => put(box(0, CELLS.y, 13, zone.w, zone.l, 6, 1), HOLDER));
	part("cells", {
		label: "21700 cells",
		count: CELLS.s * CELLS.p,
		what: "Cylindrical lithium-ion cells, 21 mm across and 70 mm high, 14 rows in series of 20 side by side. Each is held, not welded: a worn cell is pulled and a new one pushed in.",
		specs: [
			["Cell", "21700, 5 Ah, 3.7 V (NMC) [inferred]"],
			["Pack", "14S20P: 51.8 V, 100 Ah, ~5.2 kWh"],
			["Cells", "280"]
		]
	}, (put) => {
		for (let i = 0; i < CELLS.s; i++) for (let j = 0; j < CELLS.p; j++) {
			put(cyl([
				colX(j),
				rowY(i),
				CELLS.z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS.r, seg), WRAP);
			if (seg > 6) put(cyl([
				colX(j),
				rowY(i),
				top - 2
			], [
				colX(j),
				rowY(i),
				top
			], CELLS.r - 2, seg), CAP);
		}
	});
	part("holder-top", {
		label: "Top cell holder",
		what: "The same plate over the cells’ heads, its openings leaving each pole bare for the contact plates.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"]]
	}, (put) => put(box(0, CELLS.y, top - 6, zone.w, zone.l, 6, 1), HOLDER));
	part("plates-top", {
		label: "Top contact plates",
		count: 7,
		what: "Copper plates over the cells, each joining a row’s plus poles to the next row’s minus: with the bottom plates they put the 14 rows in series.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Pressed by", "The lid’s spring pad"]]
	}, (put) => {
		for (let i = 0; i < CELLS.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS.pitch - 3, 1.5, .3), COPPER$1);
	});
	part("bms", {
		label: "Battery management system",
		what: "The board behind the cells: a lead to each of the 14 rows, it balances them, keeps them within their voltage and temperature, and opens the pack if anything goes wrong.",
		specs: [
			["Rows", "14S, balanced"],
			["Current", "100 A continuous [inferred]"],
			["Talks", "CAN to the inverter"]
		]
	}, (put) => {
		const y = rowY(CELLS.s - 1) + 60;
		put(box(0, y, 50, 400, 80, 3, .5), PCB);
		for (const x of [
			-140,
			-60,
			30,
			110
		]) put(box(x, y, 54, 34, 26, 5, .5), BLACK);
		put(box(170, y, 62, 50, 40, 22, 2), DARK);
		for (let i = 0; i < CELLS.s; i += 3) put(cyl([
			-180 + i * 6,
			y - 40,
			52
		], [
			-180 + i * 6,
			rowY(i),
			top + 3
		], 1.2, 4), RED);
	});
	part("terminals", {
		label: "Terminals",
		count: 2,
		what: "The pack’s plus and minus on its face, under their covers, and the data plug for the BMS beside them.",
		specs: [["Connectors", "Anderson-type, 120 A [inferred]"], ["Data", "CAN, RJ45"]]
	}, (put) => {
		put(cyl([
			90,
			Lh,
			55
		], [
			90,
			Lh + 22,
			55
		], 13, 12), RED);
		put(cyl([
			140,
			Lh,
			55
		], [
			140,
			Lh + 22,
			55
		], 13, 12), BLACK);
		put(box(-110, Lh + 2, 55, 26, 6, 20, 2), "#d9d9d9");
	});
	part("lid", {
		label: "Lid",
		what: "The aluminium lid and the spring pad under it: closing it presses every contact plate onto its poles, the whole pack’s only joining force.",
		specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"]]
	}, (put) => {
		put(box(0, 0, H - 2, W, LEN, 4), LID);
		put(box(0, CELLS.y, H - 9, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
	});
	part("latches", {
		label: "Latches",
		count: 4,
		what: "Four over-centre latches, two a side: flip them and the lid lifts. No tool opens the pack.",
		specs: [["Type", "Over-centre, stainless"]]
	}, (put) => {
		for (const sx of [-1, 1]) for (const y of [-120, 120]) put(box(sx * (Wh + 3), y, H - 18, 6, 40, 30, 2), STEEL);
	});
}

//#endregion
//#region src/lib/actors/batterycube.v1.js
const SRC_B = "BatteryCube (our design)";
const CASE = "#e4e6e3";
const COPPER = "#b87333";
const BLUE = "#2f6fb5";
const SCREEN = "#1d3b4a";
const LED = "#3ddc84";
const YELLOW = "#f0c419";
/** the packs: four BatteryPacks, 460 × 480 × 125 mm, stacked 130 apart over the skids, a little ahead of the middle */
const MOD = /* @__PURE__ */ (() => ({
	l: PACK.L,
	gap: 130,
	y: 75
}))();
const ASSEMBLIES = [
	{
		id: "frame",
		label: "Frame",
		note: "The Power Cube’s own 27\" frame: two 4×4 tube skids, 2×2 angle posts and top rails, the quick-attach plate and two lifting eyes, so the BatteryCube is lifted, stacked and coupled like any cube.",
		out: [
			0,
			-.04,
			0
		]
	},
	{
		id: "battery",
		label: "Battery",
		note: "Four BatteryPacks of 280 cells each (51.8 V, ~5.2 kWh), ~20.7 kWh in all, and the copper busbars that join them side by side.",
		out: [
			0,
			.45,
			.12
		]
	},
	{
		id: "power",
		label: "Inverter and sockets",
		note: "The 6 kW hybrid inverter on the back: it charges the packs from the sun through its MPPT input, gives 230 V to the sockets, and takes a charge from an ElectroCube or the grid when the sun is short.",
		out: [
			0,
			-.5,
			.05
		]
	}
];
const STEPS = [
	"Cut, drill and bolt the frame: skids, posts, top rails, quick-attach plate",
	"Slide in the four BatteryPacks; fit the busbars",
	"Mount the inverter on the back; wire the solar input, the breakers and the sockets"
];
/** @type {import('./powercube.js').Insides} */
function cells(part, { box, cyl, hose, P, kit, Lh, B, base }) {
	const front = MOD.y + MOD.l / 2;
	for (let k = 0; k < 4; k++) batteryPackParts(kit, {
		at: P(0, MOD.y, B + 10 + k * MOD.gap),
		base,
		assembly: () => "battery",
		step: () => 2,
		prefix: `pack-${k + 1}-`,
		unit: `pack-${k + 1}`,
		seg: 6
	});
	part("battery", {
		id: "busbars",
		label: "Busbars",
		count: 2,
		source: SRC_B,
		what: "Two copper bars down the front of the stack, plus and minus, joining the four BatteryPacks side by side so they share the load, and carrying it back to the inverter.",
		specs: [["Material", "Tinned copper, 30 × 5 mm"], ["Current", "125 A continuous"]]
	}, base, (put) => {
		for (const x of [90, 140]) put(box(x, front + 18, B + 10 + 2 * MOD.gap - 10, 30, 5, 3 * MOD.gap + 40, 1), COPPER);
		put(hose([
			[
				115,
				front + 20,
				B + 40
			],
			[
				200,
				front - 40,
				B + 30
			],
			[
				200,
				-Lh + 120,
				B + 60
			],
			[
				100,
				-Lh + 160,
				B + 140
			]
		], 12), HOSE);
	});
	part("power", {
		id: "inverter",
		label: "Hybrid inverter",
		source: SRC_B,
		what: "One box does it all: an MPPT solar charger, a battery charger and a pure-sine inverter. It fills the modules from the panels by day and turns their 48 V into 230 V for the home by night.",
		specs: [
			["Power", "6 kW continuous, 12 kW peak [inferred]"],
			["Solar in", "500 V, 2 × MPPT, up to 8 kWp"],
			["Out", "230 V, 50 Hz"],
			["Battery", "48 V LiFePO4, CAN"]
		]
	}, base, (put) => {
		put(box(0, -Lh + 95, B + 290, 520, 130, 520, 10), CASE);
		put(box(-80, -Lh + 28, B + 400, 180, 4, 110, 4), SCREEN);
		for (const [x, c] of [
			[60, LED],
			[90, YELLOW],
			[120, RED$2]
		]) put(box(x, -Lh + 28, B + 430, 14, 4, 14, 2), c);
		for (let k = 0; k < 7; k++) put(box(-230 + k * 76, -Lh + 95, B + 560, 8, 110, 20, 1), STEEL$2);
	});
	part("power", {
		id: "solar-in",
		label: "Solar input",
		count: 2,
		source: SRC_B,
		what: "Where the panels plug in: a pair of MC4 connectors, plus and minus, and the DC isolator that cuts them off.",
		specs: [["Connectors", "MC4"], ["Isolator", "1,000 V DC"]]
	}, base, (put) => {
		put(cyl([
			200,
			-Lh + 30,
			B + 80
		], [
			200,
			-Lh - 10,
			B + 80
		], 12, 10), RED$2);
		put(cyl([
			240,
			-Lh + 30,
			B + 80
		], [
			240,
			-Lh - 10,
			B + 80
		], 12, 10), BLACK$2);
		put(box(200, -Lh + 26, B + 170, 80, 10, 90, 4), YELLOW);
		put(box(200, -Lh + 18, B + 170, 26, 8, 50, 3), RED$2);
	});
	part("power", {
		id: "sockets",
		label: "Sockets and breakers",
		count: 2,
		source: SRC_B,
		what: "What it gives out: two blue 230 V sockets under spring lids for a home or tools, behind a main breaker and a 30 mA earth-leakage breaker.",
		specs: [["Sockets", "2 × 230 V, 16 A (CEE blue)"], ["Protection", "Main breaker + 30 mA RCD"]]
	}, base, (put) => {
		for (const x of [-220, -150]) put(box(x, -Lh + 26, B + 120, 64, 8, 64, 6), BLUE), put(cyl([
			x,
			-Lh + 24,
			B + 120
		], [
			x,
			-Lh - 10,
			B + 120
		], 24, 14), BLUE);
		put(box(-60, -Lh + 26, B + 120, 70, 8, 60, 3), DARK$2);
	});
}
/** The BatteryCube on its own, every part its own: drawn apart, built. Its size is the Power Cube's. @returns {import('./rig').Cast} */
const batteryCube = () => cubeCast({
	name: "BatteryCube",
	assemblies: ASSEMBLIES,
	steps: STEPS,
	stepOf: {
		frame: 1,
		battery: 2,
		power: 3
	},
	sources: POWERCUBE_SOURCES,
	hums: false,
	len: CUBE.L,
	engine: false,
	controls: false,
	insides: cells
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
const HISTORY = /* @__PURE__ */ (() => ({ batterycube: [
	{
		...FIRST,
		date: "2026-10-13",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v1: busbars down the front, a one-way inverter",
			make: () => batteryCube()
		}]
	},
	{
		v: 2,
		date: "2026-10-13",
		note: "Plug in and pull out: a backplane behind the stack takes each BatteryPack’s (v3) back plug, and a ClickLock rail pair holds each pack; no busbars on the front",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v2: a one-way inverter",
			make: () => batteryCube$1(2)
		}]
	},
	{
		v: 3,
		date: "2026-10-13",
		note: "A charger too: the inverter is bidirectional, and an AC inlet on its back charges the packs from the grid, an ElectroCube or a generator",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v3: its packs with two handles each",
			make: () => batteryCube$1(3)
		}]
	},
	{
		v: 4,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v4: one centre grip each, its trigger releasing the pack",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v4: no pull-out move",
			make: () => batteryCube$1(4)
		}]
	},
	{
		v: 5,
		date: "2026-10-13",
		note: "Pull out as a move: a hand squeezes the third pack’s grip, it slides 36 cm out on its rails, waits, slides back and clicks home; and a “pulled out” pose",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v5: its packs at v4, their plugs’ pins on the pack",
			make: () => batteryCube$1(5)
		}]
	},
	{
		v: 6,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v5 (the grip low, the lock at its height), its rails raised to meet their pawls, and pins on the backplane: two pointed guide pins, two power pins and four data pins per pack, going into the pack’s holes",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v6: its packs at v5, a lid each",
			make: () => batteryCube$1(6)
		}]
	},
	{
		v: 7,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v6: each a closed shell with a service drawer inside; their lock’s keepers moved to meet the pawls on the drawers’ front plates",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v7: its packs at v6",
			make: () => batteryCube$1(7)
		}]
	},
	{
		v: 8,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v7 (grip, lock and release buttons at the base plate’s level), its rails lowered to meet their pawls; every live backplane pin sunk 5 mm in an insulating collar, finger-safe",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v8: its packs at v7, the data pins over the power pins",
			make: () => batteryCube$1(8)
		}]
	},
	{
		v: 9,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v8 (grip, lock and release buttons on the shell’s foot), its rails lower to meet their pawls; every pin of a header in one straight line: guide, power, data, power, guide",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v9: its packs’ release buttons in the sill",
			make: () => batteryCube$1(9)
		}]
	},
	{
		v: 10,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v9: each one’s release buttons in its shell’s two front corner columns, at the base plate’s level"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "batterycube",
	label: "BatteryCube",
	note: "Our own cube on the Power Cube’s 27\" frame, no engine: four BatteryPacks stacked to its top (~20.7 kWh) and each plugged into a backplane and held by a ClickLock, and a 6 kW bidirectional inverter on its back that turns their 52 V into 230 V, takes a solar panel straight in and charges them from outside power at its AC inlet. Every part its own",
	from: "Our design, on the Power Cube of Open Source Ecology",
	variants: [{
		id: "batterycube",
		label: "BatteryCube",
		note: "~20.7 kWh, 6 kW at 230 V both ways, an MPPT solar input, an AC inlet, 686 × 660 × 686 mm, ~140 kg",
		make: () => batteryCube$1()
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