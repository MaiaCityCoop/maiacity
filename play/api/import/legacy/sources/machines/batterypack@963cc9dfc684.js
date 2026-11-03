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
const S$2 = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK$2 = {
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
const CELLS$2 = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 16,
	y: -55
};
const SRC$2 = "BatteryPack (our design)";
const CASE$1 = "#1f2225";
const LID$1 = "#232629";
const SEAM = "#d9dcde";
const FACE = "#2b2f33";
const HOLDER$1 = "#1b1d1f";
const WRAP$1 = "#2f6fb5";
const CAP$1 = "#c9ccce";
const COPPER$1 = "#c27a43";
const PCB$1 = "#2c7a4a";
const DARK$1 = "#202326";
const RED$1 = "#c8372d";
const BLACK$1 = "#161718";
const LED$1 = "#59f0a0";
const LED_OFF = "#2c3a33";
const STEEL$1 = "#8d9396";
/** its assemblies, as the pack on its own shows them drawn apart */
const ASSEMBLIES$2 = [
	{
		id: "case",
		label: "Case",
		note: "An aluminium tray with its front panel and handles: the pack slides into a rack or a BatteryCube by them.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "cells",
		label: "Cells",
		note: "280 cylindrical 21700 cells standing in two holder plates, 14 rows in series of 20 side by side.",
		out: [
			0,
			.12,
			0
		]
	},
	{
		id: "contacts",
		label: "Contact plates",
		note: "Copper plates top and bottom that join each row to the next: pressed on, not welded, so every cell comes out again.",
		out: [
			0,
			.3,
			0
		]
	},
	{
		id: "electronics",
		label: "BMS and plug",
		note: "The battery management system that watches every row, the plug in its back and the charge strip.",
		out: [
			0,
			.15,
			.3
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch in all its pieces: two spring pawls whose teeth click into the rails’ keepers, their pivots, and the cables that let the grip’s trigger pull both back at once.",
		out: [
			0,
			.04,
			.32
		]
	},
	{
		id: "lid",
		label: "Lid",
		note: "The lid with its spring pad that presses the contacts home, held by four latches: open them and the pack is open.",
		out: [
			0,
			.5,
			0
		]
	}
];
const HOLE = "#050607";
/** from v6: a closed shell, and one L-shaped drawer (front plate + base plate) that carries every inner part */
const ASSEMBLIES_6 = [
	{
		id: "shell",
		label: "Shell",
		note: "The closed outer shell: floor, walls, top and back in one, open only at the front. The back socket sits in it, and the two release buttons in its sides.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "drawer",
		label: "Service drawer",
		note: "One L of aluminium: the front plate with the grip and the charge strip, and the base plate under it. Every inner part is mounted on it, so pressing the two side buttons and pulling the grip brings the whole inside out.",
		out: [
			0,
			0,
			.6
		]
	},
	{
		id: "cells",
		label: "Cells",
		note: "280 cylindrical 21700 cells standing in two holder plates on the drawer, 14 rows in series of 20 side by side.",
		out: [
			0,
			.14,
			.6
		]
	},
	{
		id: "contacts",
		label: "Contact plates",
		note: "Copper plates top and bottom that join each row to the next, pressed on by the drawer’s clamp, not welded.",
		out: [
			0,
			.32,
			.6
		]
	},
	{
		id: "electronics",
		label: "BMS and plug",
		note: "The battery management system on the drawer, and its inner plug that meets the shell’s back socket when the drawer is in.",
		out: [
			0,
			.18,
			.85
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch that holds the pack in its cube, on the drawer’s front plate: two spring pawls, their pivots and the cables to the grip’s trigger.",
		out: [
			0,
			.04,
			.85
		]
	}
];
/** from v8 the shell carries everything you hold and press: its foot's sill across the face with the grip, the ClickLock
*  and the two release buttons at its outer ends; the drawer only the insides */
const ASSEMBLIES_8 = [
	{
		id: "shell",
		label: "Shell",
		note: "The closed outer shell on its foot: floor tub, walls, top and back in one, open at the front above the foot’s sill. The sill carries the grip and, at its two outer ends, the release buttons; the back socket sits in the back.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "drawer",
		label: "Service drawer",
		note: "One L of aluminium riding on the shell’s foot: the front plate (the face above the sill, with its finger pull and the charge strip) and the base plate behind it. It carries every inner part and nothing you hold: press the two buttons, pull it by its finger pull, and the whole inside comes out.",
		out: [
			0,
			.03,
			.6
		]
	},
	{
		id: "cells",
		label: "Cells",
		note: "280 cylindrical 21700 cells standing in two holder plates on the drawer, 14 rows in series of 20 side by side.",
		out: [
			0,
			.17,
			.6
		]
	},
	{
		id: "contacts",
		label: "Contact plates",
		note: "Copper plates top and bottom that join each row to the next, pressed on by the drawer’s clamp, not welded.",
		out: [
			0,
			.35,
			.6
		]
	},
	{
		id: "electronics",
		label: "BMS and plug",
		note: "The battery management system on the drawer, and its inner plug that meets the shell’s back socket when the drawer is in.",
		out: [
			0,
			.21,
			.85
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch that holds the pack in its cube, in the shell’s foot: two spring pawls, their pivots and the cables to the grip’s trigger.",
		out: [
			0,
			-.02,
			.3
		]
	}
];
/** from v9 the release buttons and their catches sit in the shell's two front corner columns, at the base plate's level */
const ASSEMBLIES_9 = /* @__PURE__ */ (() => [
	{
		id: "shell",
		label: "Shell",
		note: "The closed outer shell on its foot: floor tub, walls, top and back in one, open at the front above the foot’s sill. Its two front corners stand up as columns to the base plate’s top, each with a release button in its face and the drawer’s catch inside; the sill between them carries the grip, and the back socket sits in the back.",
		out: [
			0,
			0,
			0
		]
	},
	{
		...ASSEMBLIES_8[1],
		note: "One L of aluminium riding on the shell’s foot: the front plate (the face above the sill and the two columns, with its finger pull and the charge strip) and the base plate behind it, running between the columns. It carries every inner part and nothing you hold: press the two buttons, pull it by its finger pull, and the whole inside comes out."
	},
	...ASSEMBLIES_8.slice(2)
])();
const STEPS_9 = [
	"Lay out the shell on its foot: floor tub, walls, top and back, its two corner columns with their release buttons and catches, the back socket, the grip and the ClickLock",
	"Build the drawer: base plate and front plate with its finger pull and charge strip",
	"Set the bottom contact plates and holder on the base plate, and stand the 280 cells in it",
	"Press on the top holder, the top plates and the clamp",
	"Fit the BMS, its leads and the inner plug; slide the drawer in between the columns until both catches click into the base plate"
];
const STEPS_8 = [
	"Lay out the shell on its foot: floor tub, walls, top and back, the back socket, the grip, the ClickLock, the release buttons and their catches",
	"Build the drawer: base plate and front plate with its finger pull and charge strip",
	"Set the bottom contact plates and holder on the base plate, and stand the 280 cells in it",
	"Press on the top holder, the top plates and the clamp",
	"Fit the BMS, its leads and the inner plug; slide the drawer in over the sill until both catches click"
];
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
const STEPS_6 = [
	"Lay out the shell: floor, walls, top and back, the back socket and the two release buttons",
	"Build the drawer: base plate and front plate, the grip, charge strip and ClickLock",
	"Set the bottom contact plates and holder on the base plate, and stand the 280 cells in it",
	"Press on the top holder, the top plates and the clamp",
	"Fit the BMS, its leads and the inner plug; slide the drawer in until both side catches click"
];
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
/** the shell's own parts (all the rest slide out with the drawer; from v7 the release buttons too, on its front),
*  and how far the drawer comes out (m) */
const onShell = (v) => v >= 8 ? Object.keys(GROUP_8).filter((p) => GROUP_8[p] === "shell" || GROUP_8[p] === "lock") : v >= 7 ? ["tray", "terminals"] : [
	"tray",
	"terminals",
	"release-left",
	"release-right"
];
const DRAWER_OUT$1 = .45;
const STEPS$2 = [
	"Lay out the tray, its front panel, handles and ClickLock",
	"Set the bottom contact plates and holder, and stand the 280 cells in it",
	"Press on the top holder and the top contact plates",
	"Fit the BMS, its sense leads and the back plug",
	"Close the lid on its spring pad and snap the four latches"
];
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
		x * S$2,
		z * S$2,
		y * S$2
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 1.5) => T(r > 2 ? block(w * S$2, h * S$2, l * S$2, L(x, y, z), r * S$2) : new three.BoxGeometry(w * S$2, h * S$2, l * S$2).translate(...L(x, y, z)));
	/** @param {MM} a @param {MM} b @param {number} r @param {number} [n] */
	const cyl = (a, b, r, n = 12) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
		const g = new three.CylinderGeometry(r * S$2, r * S$2, A.distanceTo(B), n);
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
		const shape = outline(w * S$2, l * S$2, r * S$2);
		if (wall) shape.holes.push(outline((w - 2 * wall) * S$2, (l - 2 * wall) * S$2, Math.max(1, r - wall) * S$2, true));
		const g = new three.ExtrudeGeometry(shape, {
			depth: (h - bevel) * S$2,
			curveSegments: 8,
			bevelEnabled: bevel > 0,
			bevelThickness: bevel * S$2,
			bevelSize: bevel * S$2 * .8,
			bevelOffset: -bevel * S$2 * .8,
			bevelSegments: 3
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$2, 0);
		g.clearGroups();
		return T(g);
	};
	const RC = 30;
	const CHARGE = 7;
	const { W, L: LEN, H } = PACK$2;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS$2.y + (i - (CELLS$2.s - 1) / 2) * CELLS$2.pitch;
	const colX = (j) => (j - (CELLS$2.p - 1) / 2) * CELLS$2.pitch;
	const zone = {
		w: CELLS$2.p * CELLS$2.pitch + 6,
		l: CELLS$2.s * CELLS$2.pitch + 6
	};
	const z0 = CELLS$2.z0 + DZ, top = z0 + CELLS$2.h;
	/** @param {string} p @param {Omit<import('./parts.js').PartInfo, 'assembly' | 'step' | 'id'>} info @param {(put: (geo: THREE.BufferGeometry, color: string) => void) => void} make */
	const part = (p, info, make) => kit.part({
		...info,
		id: `${prefix}${p}`,
		assembly: assembly(G[p]),
		step: stepOf(p),
		source: SRC$2,
		...unit ? { unit } : {}
	}, base, make);
	/** an outline (mm, the pack's x and y) drawn up from z0, h high, as one prism */
	const prism = (draw, z0, h) => {
		const shape = new three.Shape();
		draw(shape);
		const g = new three.ExtrudeGeometry(shape, {
			depth: h * S$2,
			curveSegments: 8,
			bevelEnabled: false
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$2, 0);
		g.clearGroups();
		return T(g);
	};
	const at2 = (x, y) => [x * S$2, -y * S$2];
	const Y0 = PACK$2.L / 2 - 30;
	/** the shell's U (open at the front), its walls `w` thick; `w` 0: the same outline closed, a plate */
	const shellU = (w) => (p) => {
		const x = PACK$2.W / 2, yb = -PACK$2.L / 2, r = 30;
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
		const x = PACK$2.W / 2, yf = PACK$2.L / 2, r = 30;
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
			CASE$1
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
					CASE$1
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
			put(prism(shellU(0), 0, 18), CASE$1);
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
					CASE$1
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
			if (v >= 9) put(box(0, (Y0 + Lh) / 2, (F + Z) / 2, 2 * PX - 1, Lh - Y0, Z - F), CASE$1);
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
			put(prism(shellU(0), 0, 3), CASE$1);
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
		put(slab(W, LEN, RC, 0, 5), CASE$1);
		put(slab(W, LEN, RC, 0, 16, 4), FACE);
		put(slab(W, LEN, RC, 16, 94, 4), CASE$1);
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
		for (let k = 0; k < 10; k++) put(box(-171 + k * 38, Lh + 1.5, 104, 34, 1.5, 4), k < CHARGE ? LED$1 : LED_OFF);
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
		put(box(0, rowY(0), 9 + DZ, zone.w - 6, CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
		for (let i = 1; i < CELLS$2.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9 + DZ, zone.w - 6, 2 * CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
		put(box(0, rowY(CELLS$2.s - 1), 9 + DZ, zone.w - 6, CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
	});
	part("holder-bottom", {
		label: "Bottom cell holder",
		what: "A plate of flame-retardant plastic with a socket for every cell’s foot: it keeps them 22 mm apart, air between them.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"], ["Pitch", "22 mm"]]
	}, (put) => put(box(0, CELLS$2.y, 13 + DZ, zone.w, zone.l, 6, 1), HOLDER$1));
	part("cells", {
		label: "21700 cells",
		count: CELLS$2.s * CELLS$2.p,
		what: "Cylindrical lithium-ion cells, 21 mm across and 70 mm high, 14 rows in series of 20 side by side. Each is held, not welded: a worn cell is pulled and a new one pushed in.",
		specs: [
			["Cell", "21700, 5 Ah, 3.7 V (NMC) [inferred]"],
			["Pack", "14S20P: 51.8 V, 100 Ah, ~5.2 kWh"],
			["Cells", "280"]
		]
	}, (put) => {
		for (let i = 0; i < CELLS$2.s; i++) for (let j = 0; j < CELLS$2.p; j++) {
			put(cyl([
				colX(j),
				rowY(i),
				z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS$2.r, seg), WRAP$1);
			if (seg > 6) put(cyl([
				colX(j),
				rowY(i),
				top - 2
			], [
				colX(j),
				rowY(i),
				top
			], CELLS$2.r - 2, seg), CAP$1);
		}
	});
	part("holder-top", {
		label: "Top cell holder",
		what: "The same plate over the cells’ heads, its openings leaving each pole bare for the contact plates.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"]]
	}, (put) => put(box(0, CELLS$2.y, top - 6, zone.w, zone.l, 6, 1), HOLDER$1));
	part("plates-top", {
		label: "Top contact plates",
		count: 7,
		what: "Copper plates over the cells, each joining a row’s plus poles to the next row’s minus: with the bottom plates they put the 14 rows in series.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Pressed by", "The lid’s spring pad"]]
	}, (put) => {
		for (let i = 0; i < CELLS$2.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
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
		const y = rowY(CELLS$2.s - 1) + 60;
		put(box(0, y, 50 + DZ, 400, 80, 3, .5), PCB$1);
		for (const x of [
			-140,
			-60,
			30,
			110
		]) put(box(x, y, 54 + DZ, 34, 26, 5, .5), BLACK$1);
		put(box(170, y, 62 + DZ, 50, 40, 22, 2), DARK$1);
		for (let i = 0; i < CELLS$2.s; i += 3) put(cyl([
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
			], 4.5, 12), x < 0 ? RED$1 : COPPER$1);
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
		for (const x of [-45, 45]) hole(x, 58, 6, x < 0 ? RED$1 : COPPER$1);
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
		for (const x of [-45, 45]) put(box(x, -Lh - 7, 58, 34, 3, 12), x < 0 ? RED$1 : COPPER$1);
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
			put(box(0, CELLS$2.y, top + 8, zone.w - 10, zone.l - 10, 4, 2), STEEL$1);
			put(box(0, CELLS$2.y, top + 4, zone.w - 14, zone.l - 14, 4, 1), "#d8d1bf");
			for (const sx of [-1, 1]) for (const sy of [-1, 1]) put(cyl([
				sx * (zone.w / 2 - 4),
				CELLS$2.y + sy * (zone.l / 2 - 4),
				8 + DZ
			], [
				sx * (zone.w / 2 - 4),
				CELLS$2.y + sy * (zone.l / 2 - 4),
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
			put(box(0, CELLS$2.y, H - 19, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
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
/** The BatteryPack on its own (version `v`), every part its own: drawn apart, built step by step. @returns {Cast} */
function batteryPack$2(v = 9) {
	const assemblies = v >= 9 ? ASSEMBLIES_9 : v >= 8 ? ASSEMBLIES_8 : v >= 6 ? ASSEMBLIES_6 : ASSEMBLIES$2;
	const kit = machineKit(assemblies);
	const steps = v >= 9 ? STEPS_9 : v >= 8 ? STEPS_8 : v >= 6 ? STEPS_6 : STEPS$2;
	batteryPackParts$1(kit, {
		at: [
			0,
			0,
			0
		],
		base: "base",
		v
	});
	const built = kit.build();
	const r = rig([{
		name: "base",
		at: [
			0,
			0,
			0
		]
	}, ...built.bones], built.pieces, [skin(.55, { side: three.DoubleSide })]);
	r.object.name = "BatteryPack";
	/** @type {Cast} */
	const cast = {
		rig: r,
		clips: {
			off: () => ({}),
			explode: (t) => {
				const u = loop(t, 8);
				const k = ease$1(Math.min(1, Math.max(0, (u - .05) / .3))) - ease$1(Math.min(1, Math.max(0, (u - .65) / .3)));
				return kit.explode(built.centre, k, {});
			},
			assemble: (t) => {
				const n = steps.length, period = n * 2.6 + 3;
				const u = Math.min(1, loop(t, period) * (period / (n * 2.6)));
				return kit.assemble(built.centre, u, n, {});
			}
		},
		poses: {
			off: {},
			exploded: kit.explode(built.centre, 1, {}),
			...v >= 6 ? { "drawer out": service(built.catalogParts, DRAWER_OUT$1, 0, 1, v) } : {}
		},
		first: v >= 6 ? "service" : "explode",
		catalog: {
			assemblies,
			parts: built.catalogParts,
			steps,
			sources: []
		}
	};
	if (v >= 6) {
		const parts = built.catalogParts;
		const s = (u, a, b) => ease$1(Math.min(1, Math.max(0, (u - a) / (b - a))));
		cast.clips.service = (t) => {
			const u = loop(t, 10) * 10;
			const press = s(u, .4, .8) - s(u, 1.6, 1.9);
			const out = DRAWER_OUT$1 * (s(u, 1, 3.6) - s(u, 6.2, 8.8));
			return service(parts, out, press, out < .02 ? press : 1, v);
		};
	}
	return cast;
}
/**
* A pose of the pack from v6: the drawer `out` metres out, the release buttons pressed in by `press` (0…1), and the
* drawer's catches in by `catches` (held in by the shell's walls while the drawer is out).
* @param {import('./parts.js').PartInfo[]} parts @param {number} out @param {number} press @param {number} [catches] @param {number} [v]
* @returns {import('./rig').Pose}
*/
function service(parts, out, press, catches = press, v = 9) {
	/** @type {import('./rig').Pose} */
	const p = {};
	const shell = onShell(v);
	for (const { id } of parts) {
		const inward = id.endsWith("left") ? 1 : -1;
		if (v >= 8 && id.startsWith("release-")) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			0,
			0,
			-press * .004
		];
		else if (v >= 9 && id.startsWith("catch-")) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			-inward * catches * .005,
			0,
			0
		];
		else if (v >= 8 && id.startsWith("catch-")) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			0,
			-catches * .005,
			0
		];
		else if (id.startsWith("release-")) p[`p.${id}`] = v >= 7 ? [
			0,
			0,
			0,
			1,
			0,
			0,
			out - press * .004
		] : [
			0,
			0,
			0,
			1,
			inward * press * .004,
			0,
			0
		];
		else if (!shell.includes(id)) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			id.startsWith("catch-") ? inward * catches * .004 : 0,
			0,
			out
		];
	}
	return p;
}

//#endregion
//#region src/lib/actors/batterypack.v1.js
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
const CASE = "#3a4046";
const LID = "#c5cacc";
const HOLDER = "#1b1d1f";
const WRAP = "#2f6fb5";
const CAP = "#c9ccce";
const COPPER = "#c27a43";
const PCB = "#2c7a4a";
const DARK = "#202326";
const RED = "#c8372d";
const BLACK = "#161718";
const LED = "#3ddc84";
const STEEL = "#8d9396";
/** its assemblies, as the pack on its own shows them drawn apart */
const ASSEMBLIES$1 = [
	{
		id: "case",
		label: "Case",
		note: "An aluminium tray with its front panel and handles: the pack slides into a rack or a BatteryCube by them.",
		out: [
			0,
			-.12,
			0
		]
	},
	{
		id: "cells",
		label: "Cells",
		note: "280 cylindrical 21700 cells standing in two holder plates, 14 rows in series of 20 side by side.",
		out: [
			0,
			.12,
			0
		]
	},
	{
		id: "contacts",
		label: "Contact plates",
		note: "Copper plates top and bottom that join each row to the next: pressed on, not welded, so every cell comes out again.",
		out: [
			0,
			.3,
			0
		]
	},
	{
		id: "electronics",
		label: "BMS and terminals",
		note: "The battery management system that watches every row, the main terminals and the state-of-charge lights.",
		out: [
			0,
			.15,
			.3
		]
	},
	{
		id: "lid",
		label: "Lid",
		note: "The lid with its spring pad that presses the contacts home, held by four latches: open them and the pack is open.",
		out: [
			0,
			.5,
			0
		]
	}
];
const STEPS$1 = [
	"Lay out the tray, its front panel and handles",
	"Set the bottom contact plates and holder, and stand the 280 cells in it",
	"Press on the top holder and the top contact plates",
	"Fit the BMS, its sense leads and the terminals",
	"Close the lid on its spring pad and snap the four latches"
];
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
	const { W, L: LEN, H } = PACK$1;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS$1.y + (i - (CELLS$1.s - 1) / 2) * CELLS$1.pitch;
	const colX = (j) => (j - (CELLS$1.p - 1) / 2) * CELLS$1.pitch;
	const zone = {
		w: CELLS$1.p * CELLS$1.pitch + 6,
		l: CELLS$1.s * CELLS$1.pitch + 6
	};
	const top = CELLS$1.z0 + CELLS$1.h;
	/** @param {string} p @param {Omit<import('./parts.js').PartInfo, 'assembly' | 'step' | 'id'>} info @param {(put: (geo: THREE.BufferGeometry, color: string) => void) => void} make */
	const part = (p, info, make) => kit.part({
		...info,
		id: `${prefix}${p}`,
		assembly: assembly(GROUP[p]),
		step: step(p),
		source: SRC$1,
		...unit ? { unit } : {}
	}, base, make);
	part("tray", {
		label: "Tray",
		what: "The pack’s aluminium tray: a floor and four walls the holders sit in, with ribs under it to slide on rails.",
		specs: [["Outside", "460 × 480 × 112 mm"], ["Material", "Aluminium, 2 mm, anodised"]]
	}, (put) => {
		put(box(0, 0, 2.5, W, LEN, 5), CASE);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 2), 0, 58, 4, LEN, 106), CASE);
		put(box(0, -Lh + 2, 58, W, 4, 106), CASE);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 30), 0, -1, 20, LEN - 20, 3), DARK);
	});
	part("front", {
		label: "Front panel",
		what: "The pack’s face: it closes the tray’s front and carries the handles, the terminals and the state-of-charge lights.",
		specs: [["Size", "460 × 125 mm"]]
	}, (put) => {
		put(box(0, Lh - 3, H / 2, W, 6, H, 2), DARK);
		for (let k = 0; k < 5; k++) put(box(-60 + k * 16, Lh + 1, 96, 10, 3, 6, 1), LED);
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
		put(box(0, rowY(0), 9, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER);
		for (let i = 1; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER);
		put(box(0, rowY(CELLS$1.s - 1), 9, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER);
	});
	part("holder-bottom", {
		label: "Bottom cell holder",
		what: "A plate of flame-retardant plastic with a socket for every cell’s foot: it keeps them 22 mm apart, air between them.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"], ["Pitch", "22 mm"]]
	}, (put) => put(box(0, CELLS$1.y, 13, zone.w, zone.l, 6, 1), HOLDER));
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
				CELLS$1.z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS$1.r, seg), WRAP);
			if (seg > 6) put(cyl([
				colX(j),
				rowY(i),
				top - 2
			], [
				colX(j),
				rowY(i),
				top
			], CELLS$1.r - 2, seg), CAP);
		}
	});
	part("holder-top", {
		label: "Top cell holder",
		what: "The same plate over the cells’ heads, its openings leaving each pole bare for the contact plates.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"]]
	}, (put) => put(box(0, CELLS$1.y, top - 6, zone.w, zone.l, 6, 1), HOLDER));
	part("plates-top", {
		label: "Top contact plates",
		count: 7,
		what: "Copper plates over the cells, each joining a row’s plus poles to the next row’s minus: with the bottom plates they put the 14 rows in series.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Pressed by", "The lid’s spring pad"]]
	}, (put) => {
		for (let i = 0; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER);
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
		put(box(0, y, 50, 400, 80, 3, .5), PCB);
		for (const x of [
			-140,
			-60,
			30,
			110
		]) put(box(x, y, 54, 34, 26, 5, .5), BLACK);
		put(box(170, y, 62, 50, 40, 22, 2), DARK);
		for (let i = 0; i < CELLS$1.s; i += 3) put(cyl([
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
		put(box(0, CELLS$1.y, H - 9, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
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
/** The BatteryPack on its own, every part its own: drawn apart, built step by step. @returns {Cast} */
function batteryPack$1() {
	const kit = machineKit(ASSEMBLIES$1);
	batteryPackParts(kit, {
		at: [
			0,
			0,
			0
		],
		base: "base"
	});
	const built = kit.build();
	const r = rig([{
		name: "base",
		at: [
			0,
			0,
			0
		]
	}, ...built.bones], built.pieces, [skin(.55, { side: three.DoubleSide })]);
	r.object.name = "BatteryPack";
	return {
		rig: r,
		clips: {
			off: () => ({}),
			explode: (t) => {
				const u = loop(t, 8);
				const k = ease$1(Math.min(1, Math.max(0, (u - .05) / .3))) - ease$1(Math.min(1, Math.max(0, (u - .65) / .3)));
				return kit.explode(built.centre, k, {});
			},
			assemble: (t) => {
				const n = STEPS$1.length, period = n * 2.6 + 3;
				const u = Math.min(1, loop(t, period) * (period / (n * 2.6)));
				return kit.assemble(built.centre, u, n, {});
			}
		},
		poses: {
			off: {},
			exploded: kit.explode(built.centre, 1, {})
		},
		first: "explode",
		catalog: {
			assemblies: ASSEMBLIES$1,
			parts: built.catalogParts,
			steps: STEPS$1,
			sources: []
		}
	};
}

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
//#region src/lib/machines/batterypack.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
const S = .001;
/** the pack's size (mm): W across, L front to back, H high; its skids under the floor lift it by `LIFT` */
const PACK = {
	W: 460,
	L: 480,
	H: 125
};
const LIFT = 2.5;
/** the foot: its floor tub and the sill across the face; the two front corner columns (mm) */
const FOOT = 20;
const POST = {
	w: 46,
	top: 25
};
/** its cells: 14 rows in series (along y) of 20 in parallel (along x), 22 mm apart, standing; their zone's middle */
const CELLS = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 33,
	y: -55
};
/** where the drawer's front plate begins (y), the lock's pawls and the grip's bar (z), the pawls' teeth behind the face */
const Y0 = /* @__PURE__ */ (() => PACK.L / 2 - 30)();
const LOCK_Z = 10;
const GRIP_Z = 10;
const LOCK_BACK = 22;
const Wh = /* @__PURE__ */ (() => PACK.W / 2)();
const Lh = /* @__PURE__ */ (() => PACK.L / 2)();
const PX = /* @__PURE__ */ (() => Wh - POST.w)();
const CATCH_Y = Y0 - 14;
/** how far the drawer comes out (mm) */
const DRAWER_OUT = 450;
/** a step from 0 to 1 between two moments of a loop, eased @param {number} t @param {number} a @param {number} b */
const phase = (t, a, b) => ease.io(clamp((t - a) / (b - a)));
/**
* Its own moves (v11), loops over its controls: Service presses the two buttons (the drawer's first 4 mm), pulls the
* whole inside out between the columns and slides it home again till the catches click; Grip closes a hand round
* the grip, the trigger pulls both pawls in, and lets go, so they click out again.
* @type {Record<string, import('$lib/assets/parts.js').Move>}
*/
const MOVES = {
	service: {
		label: "Service",
		seconds: 9,
		note: "Press both buttons, pull the drawer out, slide it home",
		at: (u) => {
			const t = u * 9;
			return { drawer: DRAWER_OUT * (phase(t, .6, 3.2) - phase(t, 5, 7.6)) };
		}
	},
	grip: {
		label: "Grip",
		seconds: 3,
		note: "Squeeze the trigger: the pawls swing in; let go: they click out",
		at: (u) => {
			const t = u * 3;
			return { trigger: 4 * (phase(t, .3, .6) - phase(t, 1.6, 1.9)) };
		}
	}
};
const SOURCES = [
	{
		label: "BatteryPack v9 (our design, $lib/actors/batterypack.js)",
		url: "https://github.com/maiacity"
	},
	{
		label: "21700 energy cells: their datasheets (no maker named)",
		url: "https://lygte-info.dk/info/BatteryChargePercent%20UK.html"
	},
	{
		label: "Cylindrical cells’ heat capacity and conductivity (Steinhardt et al. 2021, J. Energy Storage)",
		url: "https://portal.fis.tum.de/en/publications/low-effort-determination-of-heat-capacity-and-thermal-conductivit/"
	},
	{
		label: "Pulse resistance against temperature (Batteries 8(7) 60, 2022)",
		url: "https://www.mdpi.com/2313-0105/8/7/60"
	},
	{
		label: "OCV against SoC of NMC cells (Chin. J. Mech. Eng. 31, 2018)",
		url: "https://cjme.springeropen.com/articles/10.1186/s10033-018-0268-8"
	},
	{
		label: "Resistivity and its temperature coefficients (HyperPhysics)",
		url: "https://hyperphysics.gsu.edu/hbase/Tables/rstiv.html"
	},
	{
		label: "Contact resistance of pressed copper busbars (J. Mech. Electr. Veh. 2019)",
		url: "https://mev.brin.go.id/mev/article/view/97"
	},
	{
		label: "Press contacts for battery cells (Fraunhofer)",
		url: "https://publica.fraunhofer.de/handle/publica/245414"
	},
	{
		label: "A 14S board’s protection figures (a listing)",
		url: "https://sigmanortec.ro/en/bms-li-ion-module-14s-45a-with-balance-52v"
	},
	{
		label: "Machine skill kit (AirSup, MIT)",
		url: "https://github.com/AirsupHQ/machine-skill"
	}
];
const SRC = /* @__PURE__ */ (() => ({
	ours: SOURCES[0].label,
	cell: SOURCES[1].label,
	heat: SOURCES[2].label,
	rt: SOURCES[3].label,
	ocv: SOURCES[4].label,
	cu: SOURCES[5].label,
	press: SOURCES[6].label,
	bms: SOURCES[8].label
}))();
const ASSEMBLIES = [
	{
		id: "shell",
		label: "Shell",
		note: "The closed outer shell on its foot: floor tub, walls, top and back in one, open at the front above the foot’s sill. Its two front corners stand up as columns to the base plate’s top, each with a release button in its face and the drawer’s catch inside; the sill between them carries the grip, and the back socket sits in the back.",
		out: [
			0,
			0,
			-.6
		]
	},
	{
		id: "drawer",
		label: "Service drawer",
		note: "One L of aluminium riding on the shell’s foot: the front plate (the face above the sill and the two columns, with its finger pull and the charge strip) and the base plate behind it, running between the columns. It carries every inner part and nothing you hold: press the two buttons, pull it by its finger pull, and the whole inside comes out.",
		out: [
			0,
			0,
			.4
		]
	},
	{
		id: "cells",
		label: "Cells",
		note: "280 cylindrical 21700 cells standing in two holder plates on the drawer, 14 rows in series of 20 side by side, every other row upside down so the plates alone join them.",
		out: [
			0,
			.2,
			0
		]
	},
	{
		id: "contacts",
		label: "Contact plates",
		note: "Copper plates top and bottom that join each row to the next, pressed on by the drawer’s clamp, not welded: the bottom plates’ spring fingers reach the poles through the holder’s holes.",
		out: [
			0,
			.3,
			0
		]
	},
	{
		id: "electronics",
		label: "BMS and plug",
		note: "The battery management system on the drawer (its MOSFETs, shunt, fuse and a balance lead to every row), the straps that carry the current, and its inner plug that meets the shell’s back socket when the drawer is in.",
		out: [
			0,
			.2,
			.25
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch that holds the pack in its cube, in the shell’s hollow foot: two spring pawls, their pivots and the cables to the grip’s trigger.",
		out: [
			0,
			-.15,
			.05
		]
	}
];
const STEPS = [
	"Lay out the shell on its foot: floor tub, walls, top and back, its two corner columns with their release buttons and catches, the back socket, the grip and the ClickLock",
	"Build the drawer: base plate and front plate with its finger pull and charge strip",
	"Set the film, the bottom contact plates and the bottom holder on the base plate, and stand the 280 cells in it",
	"Press on the top holder, the top plates and the clamp",
	"Fit the BMS, its leads, the straps and the inner plug; slide the drawer in between the columns until both catches click into the base plate"
];
/** a point of the pack (mm: x across, y to the front, z up) in the asset's frame (m) @param {number} x @param {number} y @param {number} z @returns {V3} */
const L = (x, y, z) => [
	x * S,
	(z + LIFT) * S,
	y * S
];
/** a box centred at (x, y, z) mm, w across, l deep, h high; rounded by r mm (0: a plain box, light) */
const box = (x, y, z, w, l, h, r = 0) => (r > 0 ? GEO.rbox(w * S, h * S, l * S, Math.min(r, w / 2, h / 2, l / 2) * .999 * S, 2) : new three.BoxGeometry(w * S, h * S, l * S)).translate(...L(x, y, z));
/** a closed cylinder from a to b (mm), radius r mm @param {V3} a @param {V3} b @param {number} r @param {number} [n] */
function cyl(a, b, r, n = 16) {
	const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
	const g = new three.CylinderGeometry(r * S, r * S, A.distanceTo(B), n);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
	return g.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
}
/** a hose, a cable or a strap through points (mm) @param {V3[]} pts @param {number} r @param {number} [radial] */
const hose = (pts, r, radial = 8) => GEO.pipe(pts.map((p) => L(...p)), r * S, {
	seg: Math.max(12, pts.length * 8),
	radial,
	tension: .5
});
/** a coil spring along x from x0 to x1 (mm) at (y, z): R its radius, wire its wire, n turns */
function coilX(x0, x1, y, z, R, wire, n) {
	const pts = [], seg = n * 12, len = (x1 - x0) * S;
	for (let i = 0; i <= seg; i++) {
		const t = i / seg, a = t * n * Math.PI * 2;
		pts.push(new three.Vector3(t * len, R * S * Math.cos(a), R * S * Math.sin(a)));
	}
	return new three.TubeGeometry(new three.CatmullRomCurve3(pts), seg, wire * S, 6, false).translate(...L(x0, y, z));
}
/** one hex nut at a point (mm), its axis up @param {number} x @param {number} y @param {number} z @param {number} s @param {number} h */
const nut = (x, y, z, s, h) => new three.CylinderGeometry(s * S, s * S, h * S, 6).translate(...L(x, y, z + h / 2));
const at2 = (x, y) => [x * S, -y * S];
/** an outline (mm, the pack's x and y) drawn up from z0, h high, as one prism @param {(p: THREE.Shape) => void} draw @param {number} z0 @param {number} h @param {number} [seg] */
function prism(draw, z0, h, seg = 8) {
	const shape = new three.Shape();
	draw(shape);
	if (three.ShapeUtils.isClockWise(shape.getPoints(seg))) shape.holes = shape.holes.map((hl) => three.ShapeUtils.isClockWise(hl.getPoints(seg)) ? new three.Path(hl.getPoints(seg).reverse()) : hl);
	const g = new three.ExtrudeGeometry(shape, {
		depth: h * S,
		curveSegments: seg,
		bevelEnabled: false
	});
	g.rotateX(-Math.PI / 2).translate(0, (z0 + LIFT) * S, 0);
	g.clearGroups();
	return g;
}
/** a rounded rectangle in plan, centred (x, y), w × l, corners r, as a shape or a hole */
function rrect(x, y, w, l, r, hole = false) {
	const p = hole ? new three.Path() : new three.Shape();
	const X = w / 2, Y = l / 2;
	p.moveTo(...at2(x - X + r, y - Y));
	p.lineTo(...at2(x + X - r, y - Y));
	p.quadraticCurveTo(...at2(x + X, y - Y), ...at2(x + X, y - Y + r));
	p.lineTo(...at2(x + X, y + Y - r));
	p.quadraticCurveTo(...at2(x + X, y + Y), ...at2(x + X - r, y + Y));
	p.lineTo(...at2(x - X + r, y + Y));
	p.quadraticCurveTo(...at2(x - X, y + Y), ...at2(x - X, y + Y - r));
	p.lineTo(...at2(x - X, y - Y + r));
	p.quadraticCurveTo(...at2(x - X, y - Y), ...at2(x - X + r, y - Y));
	p.closePath();
	return p;
}
/** a round hole in plan @param {number} x @param {number} y @param {number} r */
const hole = (x, y, r) => {
	const p = new three.Path();
	p.absarc(x * S, -y * S, r * S, 0, Math.PI * 2, false);
	return p;
};
/** the shell's U (open at the front), its walls `w` thick; `w` 0: the same outline closed, a plate */
const shellU = (w) => (p) => {
	const x = Wh, yb = -Lh, r = 30;
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
/** the drawer's front plate (and the sill under it) in plan: from Y0 to the face, its two front corners round */
const capD = (p) => {
	const x = Wh, yf = Lh, r = 30;
	p.moveTo(...at2(-x, Y0));
	p.lineTo(...at2(x, Y0));
	p.quadraticCurveTo(...at2(x, yf), ...at2(x - r, yf));
	p.lineTo(...at2(-x + r, yf));
	p.quadraticCurveTo(...at2(-x, yf), ...at2(-x, Y0));
	p.closePath();
};
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
const rowY = (i) => CELLS.y + (i - (CELLS.s - 1) / 2) * CELLS.pitch;
const colX = (j) => (j - (CELLS.p - 1) / 2) * CELLS.pitch;
const zone = /* @__PURE__ */ (() => ({
	w: CELLS.p * CELLS.pitch + 6,
	l: CELLS.s * CELLS.pitch + 6
}))();
const TOP = /* @__PURE__ */ (() => CELLS.z0 + CELLS.h)();
/** the clamp's four posts, at the holders' corners, clear of the corner cells and the plates */
const POSTS = /* @__PURE__ */ (() => [-1, 1].flatMap((sx) => [-1, 1].map((sy) => [sx * 219.5, CELLS.y + sy * 153.5])))();
/** the plates' width: over every cap, clear of the posts (v9 drew them 440 wide, through the posts) */
const PLATE_W = 432;
/** the series nodes: node 0 the pack's −, node 14 its +; a node's plate (which rows it joins), where it is (y, z) and its side */
const NODES = /* @__PURE__ */ (() => Array.from({ length: CELLS.s + 1 }, (_, k) => {
	if (k === 0) return {
		k,
		rows: [0],
		y: rowY(0),
		z: 26.25,
		top: false,
		len: CELLS.pitch - 3
	};
	if (k === CELLS.s) return {
		k,
		rows: [CELLS.s - 1],
		y: rowY(CELLS.s - 1),
		z: 26.25,
		top: false,
		len: CELLS.pitch - 3
	};
	const top = k % 2 === 1;
	return {
		k,
		rows: [k - 1, k],
		y: (rowY(k - 1) + rowY(k)) / 2,
		z: top ? 103.75 : 26.25,
		top,
		len: 2 * CELLS.pitch - 3
	};
}))();
function materials() {
	return {
		shell: MAT.anodised({
			color: [
				.075,
				.08,
				.088
			],
			roughness: .36,
			cap: [
				.72,
				.73,
				.75
			],
			capRough: .3
		}),
		face: MAT.anodised({
			color: [
				.11,
				.12,
				.13
			],
			roughness: .4,
			cap: [
				.72,
				.73,
				.75
			],
			capRough: .3
		}),
		lid: MAT.anodised({
			color: [
				.085,
				.09,
				.1
			],
			roughness: .34,
			cap: [
				.72,
				.73,
				.75
			],
			capRough: .3
		}),
		seam: MAT.aluminiumMachined({
			color: [
				.8,
				.81,
				.82
			],
			roughness: .3,
			finish: "brushed",
			cap: [
				.86,
				.87,
				.88
			],
			capRough: .3
		}),
		alu: MAT.aluminium({
			color: [
				.72,
				.73,
				.74
			],
			roughness: .55,
			cap: [
				.86,
				.87,
				.88
			],
			capRough: .3
		}),
		plate: MAT.aluminiumMachined({
			roughness: .3,
			finish: "brushed",
			cap: [
				.86,
				.87,
				.88
			],
			capRough: .3
		}),
		steel: MAT.stainless({
			roughness: .26,
			cap: [
				.8,
				.8,
				.78
			],
			capRough: .3
		}),
		spring: MAT.stainless({
			color: [
				.6,
				.6,
				.6
			],
			roughness: .3,
			finish: null,
			cap: [
				.78,
				.78,
				.76
			],
			capRough: .3
		}),
		dark: MAT.plastic({
			color: [
				.035,
				.038,
				.042
			],
			roughness: .62,
			cap: [
				.1,
				.1,
				.11
			]
		}),
		grip: MAT.rubber({
			color: [
				.03,
				.032,
				.035
			],
			roughness: .75,
			cap: [
				.09,
				.09,
				.095
			]
		}),
		black: MAT.plastic({
			color: [
				.012,
				.012,
				.014
			],
			roughness: .5,
			cap: [
				.06,
				.06,
				.065
			]
		}),
		line: MAT.aluminium({
			color: [
				.85,
				.86,
				.87
			],
			roughness: .3,
			cap: [
				.88,
				.89,
				.9
			],
			capRough: .3
		}),
		hole: MAT.plastic({
			color: [
				.004,
				.004,
				.005
			],
			roughness: .9,
			cap: [
				.03,
				.03,
				.032
			]
		}),
		holder: MAT.plastic({
			color: [
				.045,
				.05,
				.055
			],
			roughness: .58,
			cap: [
				.12,
				.13,
				.14
			]
		}),
		sleeve: MAT.plastic({
			color: [
				.03,
				.12,
				.42
			],
			roughness: .3,
			clearcoat: .6,
			clearcoatRoughness: .15,
			cap: [
				.08,
				.22,
				.6
			]
		}),
		can: MAT.steel({
			color: [
				.62,
				.63,
				.63
			],
			roughness: .25,
			finish: null,
			cap: [
				.7,
				.7,
				.68
			],
			capRough: .3
		}),
		roll: MAT.satin({
			color: [
				.05,
				.05,
				.052
			],
			roughness: .7,
			cap: [
				.14,
				.13,
				.12
			],
			capRough: .7
		}),
		cap: MAT.steel({
			color: [
				.7,
				.71,
				.7
			],
			roughness: .24,
			finish: null,
			cap: [
				.75,
				.75,
				.73
			]
		}),
		ring: MAT.plastic({
			color: [
				.85,
				.84,
				.78
			],
			roughness: .5,
			cap: [
				.9,
				.88,
				.8
			]
		}),
		copper: MAT.copper({
			color: [
				.88,
				.62,
				.48
			],
			roughness: .3,
			cap: [
				.95,
				.7,
				.55
			],
			capRough: .3
		}),
		film: MAT.plastic({
			color: [
				.6,
				.3,
				.06
			],
			roughness: .2,
			clearcoat: .5,
			cap: [
				.6,
				.3,
				.06
			]
		}),
		ptfe: MAT.plastic({
			color: [
				.86,
				.86,
				.84
			],
			roughness: .3,
			cap: [
				.92,
				.92,
				.9
			]
		}),
		foam: MAT.satin({
			color: [
				.6,
				.55,
				.45
			],
			roughness: .95,
			cap: [
				.65,
				.6,
				.5
			]
		}),
		pcb: MAT.paint({
			color: [
				.02,
				.15,
				.07
			],
			roughness: .4,
			clearcoat: .4,
			cap: [
				.6,
				.55,
				.3
			]
		}),
		pad: MAT.copper({
			roughness: .3,
			finish: null,
			cap: [
				.95,
				.7,
				.55
			],
			capRough: .3
		}),
		chip: MAT.plastic({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .45,
			cap: [
				.08,
				.08,
				.085
			]
		}),
		ceramic: MAT.ceramic({
			color: [
				.88,
				.87,
				.82
			],
			roughness: .4,
			cap: [
				.92,
				.91,
				.87
			]
		}),
		brass: MAT.brass({
			roughness: .3,
			cap: [
				.9,
				.75,
				.4
			],
			capRough: .3
		}),
		manganin: MAT.copper({
			color: [
				.72,
				.6,
				.5
			],
			roughness: .45,
			finish: "brushed",
			cap: [
				.8,
				.68,
				.56
			],
			capRough: .35
		}),
		gold: MAT.gold({
			roughness: .2,
			cap: [
				.95,
				.8,
				.45
			],
			capRough: .3
		}),
		red: MAT.plastic({
			color: [
				.5,
				.03,
				.02
			],
			roughness: .4,
			cap: [
				.6,
				.08,
				.05
			]
		}),
		wire: MAT.plastic({
			color: [
				.8,
				.8,
				.78
			],
			roughness: .5,
			cap: [
				.86,
				.86,
				.84
			]
		}),
		wireRed: MAT.plastic({
			color: [
				.55,
				.04,
				.02
			],
			roughness: .5,
			cap: [
				.62,
				.08,
				.05
			]
		}),
		wireBlack: MAT.plastic({
			color: [
				.015,
				.015,
				.017
			],
			roughness: .5,
			cap: [
				.07,
				.07,
				.075
			]
		}),
		strap: MAT.plastic({
			color: [
				.03,
				.03,
				.035
			],
			roughness: .55,
			cap: [
				.95,
				.7,
				.55
			]
		}),
		ledOff: MAT.plastic({
			color: [
				.06,
				.09,
				.075
			],
			roughness: .3,
			cap: [
				.12,
				.16,
				.14
			]
		})
	};
}
/** the cell: capacity (Ah), its voltages, its DC resistance at 25 °C and 50 % (Ω) [inferred], mass (kg), heat capacity (J/kg·K), the most it may give (A), its Arrhenius energy (J/mol) [inferred] */
const CELL = {
	Q: 5,
	Vmax: 4.2,
	Vmin: 2.5,
	R25: .025,
	m: .069,
	cp: 1008,
	Imax: 10,
	Ea: 21e3
};
/** the open-circuit voltage of an NMC cell by its state of charge, rested [inferred from published curves] */
const OCV = {
	soc: [
		0,
		.02,
		.05,
		.1,
		.2,
		.3,
		.4,
		.5,
		.6,
		.7,
		.8,
		.9,
		.95,
		1
	],
	v: [
		3,
		3.25,
		3.4,
		3.49,
		3.57,
		3.62,
		3.66,
		3.7,
		3.77,
		3.86,
		3.95,
		4.05,
		4.11,
		4.18
	]
};
const ocv = (soc) => table(OCV.soc, OCV.v, clamp(soc));
/** a cell's DC resistance (Ω) at a temperature (°C) and a state of charge: Arrhenius in the cold, up under 15 % */
const rCell = (T, soc) => CELL.R25 * Math.exp(CELL.Ea / 8.314 * (1 / (T + 273.15) - 1 / 298.15)) * (1 + 1.5 * clamp((.15 - soc) / .15));
/** the BMS: its cut-offs (V, °C, A), its balancing (A, above V), its own resistances (Ω) */
const BMS = {
	ov: 4.25,
	uv: 2.8,
	ot: 60,
	otChg: 45,
	oc: 100,
	ocPeak: 250,
	peakS: 10,
	chg: 50,
	bal: .1,
	balAt: 4.1,
	R: 9e-4
};
/** a pressed contact (Ω, one cell, one end) [inferred]; the straps and the plug (Ω) [computed: 2 × 0.35 m of 40 mm² copper, two 0.1 mΩ contacts] */
const LINK = {
	contact: 5e-4,
	series: .0005009999999999999
};
/** the heat: a row's capacity (J/K), row to row, row to drawer, drawer to shell, shell to air (W/K), the drawer's and the shell's capacities (J/K) [computed from the geometry] */
const HEAT = /* @__PURE__ */ (() => ({
	Crow: CELLS.p * CELL.m * CELL.cp + 90,
	Grr: 6.5,
	Grd: 3,
	Gds: 5,
	Gsa: 6.3,
	Cd: 6e3,
	Cs: 5e3
}))();
/** state of charge and heat shown this much faster than real */
const TIME = 60;
const NOMINAL = 51.8;
/**
* The pack's physics, stepped in time: 14 rows, each 20 cells in parallel, their electrics, their heat and the BMS over
* them. Everything the page shows comes from here.
* @param {{ load: { value: number }, ambient: { value: number }, soc: { value: number }, aged: { value: number }, drawer: { value: number }, trigger: { value: number } }} ctl
*/
function solver(ctl) {
	const n = CELLS.s;
	const s = {
		used: 0,
		bal: new Float64Array(n),
		soc: new Float64Array(n).fill(.7),
		T: new Float64Array(n).fill(20),
		Vr: new Float64Array(n).fill(3.86),
		R: new Float64Array(n),
		Td: 20,
		Ts: 20,
		Voc: 0,
		V: 0,
		I: 0,
		P: 0,
		q: 0,
		closed: true,
		fault: "",
		latched: false,
		ocTimer: 0,
		balancing: 0,
		plugged: true,
		blink: 0,
		at: {
			load: ctl.load.value,
			soc: ctl.soc.value
		}
	};
	/** a row's capacity (Ah): 20 cells, the aged row's less */
	const Qrow = (i) => CELLS.p * CELL.Q * (i === 6 ? 1 - .4 * (ctl.aged.value / 100) : 1);
	const rFactor = (i) => i === 6 ? 1 + 2 * (ctl.aged.value / 100) : 1;
	const setSoc = (soc) => {
		s.used = (1 - soc) * CELLS.p * CELL.Q;
		s.bal.fill(0);
	};
	setSoc(ctl.soc.value / 100);
	/** @param {number} dt @param {{ broken: boolean }} env */
	function step(dt, env) {
		const Ta = ctl.ambient.value;
		if (Math.abs(ctl.soc.value - s.at.soc) > .01) {
			setSoc(ctl.soc.value / 100);
			s.at.soc = ctl.soc.value;
		}
		if (Math.abs(ctl.load.value - s.at.load) > 1e-6) {
			s.at.load = ctl.load.value;
			if (s.latched && !env.broken) s.latched = false;
		}
		s.plugged = ctl.drawer.value < 10;
		for (let i = 0; i < n; i++) s.soc[i] = clamp(1 - (s.used + s.bal[i]) / Qrow(i));
		let Voc = 0, Rsum = BMS.R + LINK.series;
		for (let i = 0; i < n; i++) {
			s.R[i] = (rCell(s.T[i], s.soc[i]) * rFactor(i) + 2 * LINK.contact) / CELLS.p;
			Voc += ocv(s.soc[i]);
			Rsum += s.R[i];
		}
		s.Voc = Voc;
		let P = env.broken ? BMS.ocPeak * (Voc - BMS.ocPeak * Rsum) : ctl.load.value * 1e3;
		let I = 0;
		if (s.closed && s.plugged) {
			if (P >= 0) {
				const disc = Voc * Voc - 4 * P * Rsum;
				I = disc > 0 ? (Voc - Math.sqrt(disc)) / (2 * Rsum) : Voc / (2 * Rsum);
			} else {
				const Vc = (Voc + Math.sqrt(Voc * Voc - 4 * P * Rsum)) / 2;
				I = Math.max(P / Vc, -BMS.chg);
				let cv = Infinity;
				for (let i = 0; i < n; i++) cv = Math.min(cv, Math.max(0, CELL.Vmax - ocv(s.soc[i])) / s.R[i]);
				I = Math.max(I, -cv);
				if (s.soc.every((x) => x >= .999)) I = 0;
			}
		}
		s.I = I;
		let Vmin = 9, Vmax = 0, Tmax = -99, V = 0;
		for (let i = 0; i < n; i++) {
			s.Vr[i] = ocv(s.soc[i]) - I * s.R[i];
			V += s.Vr[i];
			Vmin = Math.min(Vmin, s.Vr[i]);
			Vmax = Math.max(Vmax, s.Vr[i]);
			Tmax = Math.max(Tmax, s.T[i]);
		}
		s.V = V - I * (BMS.R + LINK.series);
		s.P = s.V * I;
		if (Math.abs(I) > BMS.oc) s.ocTimer += dt;
		else s.ocTimer = Math.max(0, s.ocTimer - dt);
		let fault = "";
		if (Math.abs(I) > BMS.ocPeak * .999 || s.ocTimer > BMS.peakS) fault = "over-current";
		else if (Vmin < BMS.uv && I > 0) fault = "under-voltage";
		else if (Vmax > BMS.ov && I < 0) fault = "over-voltage";
		else if (Tmax > BMS.ot || I < 0 && Tmax > BMS.otChg) fault = "over-temperature";
		if (fault && s.closed) {
			s.closed = false;
			s.fault = fault;
			s.latched = fault === "under-voltage" || fault === "over-current";
			s.ocTimer = 0;
		} else if (!s.closed) {
			const cool = Tmax < BMS.ot - 10, ok = Vmin > BMS.uv + .2 && Vmax < BMS.ov - .1;
			if (cool && ok && !s.latched && !env.broken) {
				s.closed = true;
				s.fault = "";
			}
		}
		const h = dt * TIME / 3600;
		s.used += I * h;
		s.balancing = 0;
		if (I <= 0) {
			for (let i = 0; i < n; i++) if (s.Vr[i] > BMS.balAt && s.Vr[i] - Vmin > .01) {
				s.bal[i] += BMS.bal * h;
				s.balancing++;
			}
		}
		const dts = dt * TIME;
		let q = I * I * (BMS.R + LINK.series), qd = q;
		const T = s.T, dT = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			const qi = I * I * s.R[i];
			q += qi;
			let flow = qi - HEAT.Grd * (T[i] - s.Td);
			if (i > 0) flow -= HEAT.Grr * (T[i] - T[i - 1]);
			if (i < n - 1) flow -= HEAT.Grr * (T[i] - T[i + 1]);
			dT[i] = flow / HEAT.Crow;
			qd += HEAT.Grd * (T[i] - s.Td);
		}
		for (let i = 0; i < n; i++) T[i] += dT[i] * dts;
		s.q = q;
		s.Td += (qd - HEAT.Gds * (s.Td - s.Ts) - .5 * (s.Td - Ta)) / HEAT.Cd * dts;
		s.Ts += (HEAT.Gds * (s.Td - s.Ts) - HEAT.Gsa * (s.Ts - Ta)) / HEAT.Cs * dts;
		s.blink = (s.blink + dt) % 1;
		return {
			Vmin,
			Vmax,
			Tmax
		};
	}
	/** the break taken back: the fault cleared, the pack closed again on the load it had */
	function reset() {
		s.latched = false;
		s.ocTimer = 0;
	}
	/** the pack's charge left (Ah): what its weakest row still holds, and the energy (Wh) */
	const left = () => {
		let ah = Infinity;
		for (let i = 0; i < n; i++) ah = Math.min(ah, s.soc[i] * Qrow(i));
		return {
			ah,
			wh: ah * NOMINAL
		};
	};
	const socPack = () => s.soc.reduce((a, b) => a + b, 0) / n;
	const hottest = () => {
		let k = 0;
		for (let i = 1; i < n; i++) if (s.T[i] > s.T[k]) k = i;
		return k;
	};
	return {
		s,
		step,
		reset,
		left,
		socPack,
		hottest,
		Qrow
	};
}
/**
* The BatteryPack: a root at its real size, every part its own, its solver running it per row. v11 (the default) adds
* its own moves, Service and Grip; v10 is the same pack without them.
* @param {{ load?: number, ambient?: number, soc?: number, v?: 10 | 11 }} [o] the load (kW, negative charging), the room (°C), the state of charge (%), the version
* @returns {THREE.Group}
*/
function batteryPack({ load = 2, ambient = 20, soc = 70, v = 11 } = {}) {
	const root = new three.Group();
	root.name = "BatteryPack";
	const M = materials();
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES,
		steps: STEPS,
		sources: SOURCES
	});
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** a part: its meshes, its card and how it is shown */
	const part = (info, objs, how = {}, parent = root) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	/** a group of meshes turning or sliding about a point (mm): its origin there, the meshes drawn where they are */
	const pivot = (p, objs) => {
		const g = new three.Group();
		g.position.set(...L(...p));
		for (const o of objs) {
			o.position.copy(g.position).negate();
			g.add(o);
		}
		return g;
	};
	/** the mass of some solids (kg) at a density (kg/m³) @param {THREE.BufferGeometry[]} geos @param {number} rho */
	const kg = (geos, rho) => geos.reduce((a, g) => a + GEO.volume(g).V * rho, 0);
	let mass = CELLS.s * CELLS.p * CELL.m + .35;
	/** the service drawer: everything on it slides out as one */
	const drawer = new three.Group();
	drawer.name = "drawer";
	root.add(drawer);
	/** @type {Record<string, THREE.Object3D>} */
	const moving = {};
	{
		const sillWall = (p) => {
			capD(p);
			p.holes.push(rrect(0, (Y0 + Lh) / 2, PACK.W - 8, Lh - Y0 - 6, 20, true));
		};
		const faceG = GEO.merge([
			prism(shellU(4), 0, FOOT),
			prism(capD, 0, 3),
			prism(capD, 17, 3),
			prism(sillWall, 3, 14),
			prism(postP(-1), 19, POST.top - FOOT + 1),
			prism(postP(1), 19, POST.top - FOOT + 1)
		]);
		const caseG = GEO.merge([
			prism(shellU(4), FOOT, 90),
			prism(shellU(0), 0, 3),
			prism(shellU(0), 15, 3)
		]);
		const seamG = prism(shellU(4), 110, 2);
		const lidG = GEO.merge([prism(shellU(4), 112, 13), prism(shellU(0), PACK.H - 4, 4)]);
		const skids = GEO.merge([-1, 1].map((sx) => box(sx * 170, -15, -1, 20, 370, 3, 1)));
		mass += kg([
			faceG,
			caseG,
			seamG,
			lidG
		], 2700);
		part({
			id: "shell",
			label: "Shell",
			assembly: "shell",
			source: SRC.ours,
			what: "The pack’s outer shell: a foot (its floor tub and, across the face, a sill, both hollow boxes 20 mm high), walls, top and back in one smooth aluminium piece, open at the front above the sill where the service drawer slides in. Its two front corners stand up as columns to the base plate’s top, each with a release button in its face and the drawer’s catch inside. It is what you carry and what the cube holds: the grip, the ClickLock and the two release buttons are all on it.",
			specs: [
				["Outside", "460 × 480 × 125 mm"],
				["Foot and sill", `${FOOT} mm high, hollow`],
				["Columns", `${POST.w} mm wide, to ${POST.top} mm`],
				["Material", "Aluminium, 3 mm, black anodised"],
				["Corners", "R 30 mm"],
				["Skids", "2 strips under the floor, 3 mm"]
			]
		}, [
			m(faceG, M.face),
			m(caseG, M.shell),
			m(seamG, M.seam),
			m(lidG, M.lid),
			m(skids, M.grip)
		], {
			explode: [
				0,
				0,
				-.42
			],
			xray: "shell",
			tag: {
				text: "Shell",
				at: L(-200, -120, PACK.H),
				value: () => `${fmt(sim.s.Ts)} °C`,
				side: "left"
			}
		});
		const yb = -Lh - 2;
		const sock = [m(box(0, -Lh - 1, 58, 170, 2, 46, 1), M.black), m(box(0, -Lh + 2.5, 58, 170, 5, 46, 1), M.black)];
		/** a hole: its lining ring a little wider, its dark inside over it @param {number} x @param {number} z @param {number} r @param {THREE.Material} ring */
		const holeAt = (x, z, r, ring) => sock.push(m(cyl([
			x,
			yb,
			z
		], [
			x,
			yb - .4,
			z
		], r + 2, 16), ring), m(cyl([
			x,
			yb - .4,
			z
		], [
			x,
			yb - .6,
			z
		], r, 16), M.hole));
		for (const x of [-45, 45]) {
			holeAt(x, 58, 9.5, M.face);
			sock.push(m(cyl([
				x,
				yb - .6,
				58
			], [
				x,
				-Lh + 7,
				58
			], 4.5, 16), M.brass));
		}
		sock.push(m(box(0, yb - .2, 58, 50, .4, 16, 2), M.face), m(box(0, yb - .5, 58, 45, .4, 13, 2), M.hole));
		for (let k = 0; k < 4; k++) sock.push(m(cyl([
			-12 + k * 8,
			yb - .7,
			58
		], [
			-12 + k * 8,
			-Lh + 7,
			58
		], 1.6, 8), M.gold));
		for (const sx of [-1, 1]) {
			sock.push(m(cyl([
				sx * 150,
				-Lh,
				58
			], [
				sx * 150,
				-Lh - 1.5,
				58
			], 11, 16), M.black));
			holeAt(sx * 150, 58, 5.5, M.steel);
		}
		part({
			id: "socket",
			label: "Back socket",
			assembly: "shell",
			source: SRC.ours,
			what: "The pack’s plus, minus and data in one socket flush in its back, nothing sticking out, its holes in one line: guide, power, data, power, guide. The power contacts sit at the bottom of pockets that take the cube’s insulating collars, so no metal is ever open to a finger; the two lined guide holes take the cube’s guide pins first. Inside the wall the same contact tubes take the drawer’s inner plug: slide the pack in and it plugs itself into the backplane; pull the drawer and it lets go.",
			specs: [
				["Power", "2 pockets ⌀ 19 mm, tubes for ⌀ 8 mm pins, 120 A [inferred]"],
				["Data", "CAN, 4 sockets in one pocket"],
				["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"],
				["Contact", "~0.1 mΩ each [inferred]"],
				["Touch", "Finger-safe, IP2X"]
			]
		}, sock, {
			explode: [
				0,
				0,
				-.595
			],
			tag: {
				text: "Back socket",
				at: L(0, -Lh - 2, 58),
				value: () => sim.s.plugged ? `${fmt(sim.s.V, 1)} V · ${fmt(sim.s.I)} A` : "unplugged",
				side: "right"
			}
		});
		part({
			id: "grip",
			label: "Grip",
			assembly: "shell",
			source: SRC.ours,
			what: "One grip for one hand on the shell itself, in the middle of the sill across its foot: carry the pack by it and the shell takes the weight, never the drawer. Its trigger sits at the very height of the ClickLock’s pawls in the foot, so the two release cables run straight to them: close your fingers round it and the pawls pull back, so the pack slides out in the same move; let go and it clicks home again.",
			specs: [
				["Width", "150 mm, for a gloved hand"],
				["Height", `Bar ${GRIP_Z} mm over the foot, trigger at ${LOCK_Z} mm: the lock’s height`],
				["On", "The shell’s sill"],
				["Release", "Trigger in the grip, ~20 N"],
				["Carries", "~26 kg [inferred, as v9 said; see the card of the shell for the weight of the geometry]"]
			]
		}, [m(GEO.merge([
			box(-82, Lh + 14, GRIP_Z, 16, 28, 15, 5),
			box(82, Lh + 14, GRIP_Z, 16, 28, 15, 5),
			box(0, Lh + 30, GRIP_Z, 180, 16, 15, 6)
		]), M.grip), m(box(0, Lh + 38.5, 13, 120, 1, 2, .4), M.line)], { explode: [
			0,
			-.035,
			.21
		] });
		for (const [sx, side] of [[-1, "left"], [1, "right"]]) {
			const bx = sx * (PX + 8), bz = 18, cz = 22.5;
			const btn = pivot([
				bx,
				Lh,
				bz
			], [
				m(cyl([
					bx,
					Lh + .2,
					bz
				], [
					bx,
					Lh + 1,
					bz
				], 7, 18), M.steel),
				m(cyl([
					bx,
					Lh - 4,
					bz
				], [
					bx,
					Lh + 2.4,
					bz
				], 5, 18), M.dark),
				m(cyl([
					bx,
					Lh - 6,
					bz
				], [
					bx,
					CATCH_Y + 6,
					bz
				], 1.8, 8), M.steel),
				m(box(bx, CATCH_Y + 4, 40.5 / 2, 6, 6, 10.5, .5), M.steel)
			]);
			part({
				id: `release-${side}`,
				label: `Release button, ${side}`,
				assembly: "shell",
				source: SRC.ours,
				what: "A round push button in the face of the shell’s corner column on its side, at the base plate’s level: part of the shell, so it stays put while the drawer comes out. Behind it a short plunger with a wedge runs back inside the column and pushes the catch’s bolt out of its notch in the base plate. Press both, pull the drawer by its finger pull, and the whole inside slides out between the columns.",
				moves: "In by 4 mm when pressed.",
				drive: "A thumb",
				specs: [
					["Button", "⌀ 14 mm, 4 mm travel"],
					["On", "The shell’s corner column"],
					["Force", "~10 N each [inferred]"]
				]
			}, [btn], { explode: [
				0,
				0,
				.14
			] });
			moving[`release-${side}`] = btn;
			const bolt = pivot([
				sx * PX,
				CATCH_Y,
				cz
			], [
				m(cyl([
					sx * (PX - 4.5),
					CATCH_Y,
					cz
				], [
					sx * (Wh - 8),
					CATCH_Y,
					cz
				], 2.5, 12), M.steel),
				m(cyl([
					sx * (PX + 9),
					CATCH_Y,
					cz
				], [
					sx * (PX + 11),
					CATCH_Y,
					cz
				], 3.5, 12), M.steel),
				m(coilX(sx < 0 ? -(PX + 29) : PX + 12, sx < 0 ? -(PX + 12) : PX + 29, CATCH_Y, cz, 3.2, .5, 6), M.spring)
			]);
			part({
				id: `catch-${side}`,
				label: `Drawer catch, ${side}`,
				assembly: "shell",
				source: SRC.ours,
				what: "A spring bolt lying across inside the shell’s corner column, at the base plate’s height: its spring pushes its tip into a notch in the base plate’s edge and holds the drawer in. The button’s wedge pushes it back out; slide the drawer home and the bolt clicks in again on its own.",
				moves: "Sideways, 5 mm, out of its notch.",
				drive: "Its spring; the button’s wedge against it",
				specs: [
					["Bolt", "Stainless, ⌀ 5 mm, 5 mm travel"],
					["Spring", "Compression, ~12 N [inferred]"],
					["In", "The shell’s corner column"]
				]
			}, [bolt], { explode: [
				sx * .105,
				.042,
				0
			] });
			moving[`catch-${side}`] = bolt;
		}
	}
	{
		const y = Lh - LOCK_BACK, z = LOCK_Z;
		const pawls = [-1, 1].map((sx) => pivot([
			sx * 223,
			y - 38,
			z
		], [m(GEO.merge([box(sx * 223, y - 18, z, 5, 44, 8, 1), box(sx * 232, y, z, 8, 10, 8, 1)]), M.steel)]));
		part({
			id: "lock-pawls",
			label: "Pawls",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "Two steel levers, one inside each side of the hollow foot. Each pivots at its back end; its tooth at the front pokes out through a slot in the wall. Sliding in, the tooth rides up the rail’s ramp, is pushed in, and snaps out again behind the keeper: that is the click.",
			moves: "Swing in 4 mm at the tooth when the trigger is pulled.",
			drive: "The release cables; the springs push them out again",
			specs: [
				["Material", "Stainless steel, 5 mm, hardened tooth"],
				["Travel", "4 mm"],
				["Hold", "~300 N each [inferred]"]
			]
		}, pawls, { explode: [
			0,
			-.084,
			0
		] });
		moving["pawl-left"] = pawls[0];
		moving["pawl-right"] = pawls[1];
		const springs = [];
		for (const sx of [-1, 1]) springs.push(m(coilX(sx < 0 ? -220.5 : 206, sx < 0 ? -206 : 220.5, y - 4, z, 3, .5, 6), M.spring), m(box(sx * 204, y - 4, z, 4, 10, 10, .5), M.steel));
		part({
			id: "lock-springs",
			label: "Pawl springs",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "A small coil spring behind each pawl, against a boss on the floor, presses its tooth outward, so it always drops into the keeper on its own: you never have to lock it, only to unlock it.",
			specs: [["Type", "Compression, stainless, ⌀ 6 mm"], ["Force", "~15 N each [inferred]"]]
		}, springs, { explode: [
			0,
			-.112,
			0
		] });
		part({
			id: "lock-pivots",
			label: "Pivot pins",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "A pin through each pawl’s back end, standing between the foot’s two sheets: the pawl swings round it, in and out.",
			specs: [["Pin", "⌀ 5 mm, stainless"]]
		}, [-1, 1].map((sx) => m(cyl([
			sx * 223,
			y - 38,
			1
		], [
			sx * 223,
			y - 38,
			19
		], 2.5, 10), M.steel)), { explode: [
			0,
			-.14,
			0
		] });
		const cables = [];
		for (const sx of [-1, 1]) cables.push(m(hose([
			[
				sx * 60,
				Lh + 22,
				z
			],
			[
				sx * 60,
				Lh - 10,
				z
			],
			[
				sx * 206,
				Lh - 10,
				z
			],
			[
				sx * 222,
				y - 6,
				z
			]
		], 1.6), M.dark));
		part({
			id: "lock-cables",
			label: "Release cables",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "Two short steel cables in sleeves, both at the pawls’ own height: from the trigger in through the face, along the inside of the hollow sill to the corner and straight back along the side of the foot to the pawl, no bend up or down. Pulling the trigger pulls both cables, and both pawls swing in together, out of their keepers.",
			specs: [["Cable", "⌀ 1.5 mm steel in a PTFE sleeve"], ["Pull", "4 mm"]]
		}, cables, { explode: [
			0,
			-.07,
			.07
		] });
		const trig = pivot([
			0,
			Lh + 22,
			z
		], [m(box(0, Lh + 22, z, 130, 8, 8, 3), M.dark), m(box(0, Lh + 26.5, z, 90, .6, 2, .3), M.line)]);
		part({
			id: "lock-trigger",
			label: "Trigger",
			assembly: "lock",
			source: SRC.ours,
			what: "The bar under the grip: your fingers close round the grip and press it up, it pulls both cables, and the pawls let go. Let go and the springs push it back.",
			moves: "Up 4 mm when squeezed.",
			drive: "Your fingers",
			specs: [["Force", "~20 N"], ["Travel", "4 mm"]]
		}, [trig], { explode: [
			0,
			-.042,
			.14
		] });
		moving.trigger = trig;
	}
	{
		const Z = POST.top;
		const frontWall = (p) => {
			capD(p);
			p.holes.push(rrect(0, (Y0 + Lh) / 2, PACK.W - 6, Lh - Y0 - 6, 10, true));
		};
		const frontSkin = GEO.merge([
			prism(capD, Z, 3),
			prism(frontWall, Z + 3, 110 - Z - 6),
			prism(capD, 107, 3)
		]), frontMid = box(0, (Y0 + Lh) / 2, (FOOT + Z) / 2, 2 * PX - 1, Lh - Y0, Z - FOOT);
		const frontG = GEO.merge([frontSkin, frontMid]);
		const faceG = box(0, Lh + 1, 66, 380, 3, 68, 1);
		mass += kg([
			frontSkin,
			frontMid,
			faceG
		], 2700);
		part({
			id: "front",
			label: "Front plate",
			assembly: "drawer",
			source: SRC.ours,
			what: "The upright of the service drawer’s L: the pack’s face above the sill and the two columns, its round front corners and bands flush with the shell. A long finger pull along its foot and the charge strip along its top; nothing you carry by. The base plate is fixed to its foot.",
			specs: [
				["Size", `460 × 30 × ${PACK.H - FOOT} mm`],
				["Pull", "Finger slot, 240 mm"],
				["Walls", "3 mm, a hollow moulding [inferred]"],
				["Material", "Aluminium, black anodised"]
			]
		}, [
			m(frontG, M.shell),
			m(prism(capD, 110, 2), M.seam),
			m(prism(capD, 112, 13), M.lid),
			m(faceG, M.face),
			m(box(0, Lh + 1.2, 27, 240, 3, 8, 3), M.black),
			m(box(0, Lh + 1.6, 25.5, 228, 2.4, 4), M.hole)
		], {
			explode: [
				0,
				0,
				.28
			],
			xray: "shell"
		}, drawer);
		const bw = 2 * (PX - 2);
		const baseG = box(0, (Y0 - Lh + 4) / 2, 22.5, bw, Y0 + Lh - 4, 5, 1);
		mass += kg([baseG], 2700);
		part({
			id: "base",
			label: "Base plate",
			assembly: "drawer",
			source: SRC.ours,
			what: "The floor of the service drawer’s L, riding on the shell’s foot between its two columns: every inner part is mounted on it, the film and the bottom plates, the cells’ holders, the clamp and the BMS. It runs on two low-friction strips on the foot’s top skin and slides out over the sill; the catches’ bolts click into the two notches in its edges.",
			specs: [
				["Size", `${bw} × ${Y0 + Lh - 4} × 5 mm, between the columns`],
				["Material", "Aluminium, 5 mm"],
				["Runs on", "2 PTFE strips, 2 mm"],
				["Notches", "2, for the catches’ bolts"]
			]
		}, [
			m(baseG, M.plate),
			m(GEO.merge([-1, 1].map((sx) => box(sx * (bw / 2 - 40), (Y0 - Lh + 4) / 2, 19, 14, Y0 + Lh - 10, 2, .3))), M.ptfe),
			m(GEO.merge([-1, 1].map((sx) => box(sx * (bw / 2 - 2.5), CATCH_Y, 22.5, 5.4, 9, 5.2))), M.hole)
		], { explode: [
			0,
			0,
			0
		] }, drawer);
		/** @type {THREE.MeshPhysicalMaterial[]} */
		const leds = [];
		const segs = [];
		for (let k = 0; k < 10; k++) {
			const mat = MAT.plastic({
				color: [
					.06,
					.09,
					.075
				],
				emissive: [
					.12,
					.95,
					.4
				],
				emissiveIntensity: 0,
				roughness: .3,
				finish: null
			});
			leds.push(mat);
			segs.push(m(box(-171 + k * 38, Lh + 1.5, 104, 34, 1.5, 4), mat));
		}
		part({
			id: "charge",
			label: "Charge strip",
			assembly: "drawer",
			source: SRC.ours,
			what: "A slim LED strip along the top of the face, under the lid’s seam: ten segments light up with the pack’s state of charge, one a tenth; the next one breathes while it charges, and when the BMS has opened the pack the lit ones blink red.",
			specs: [
				["Length", "380 mm, 10 segments"],
				["Shows", "State of charge, 10 % a segment; a fault in red"],
				["Fed by", "The BMS, by a ribbon up the face"]
			]
		}, [m(box(0, Lh + .5, 104, 386, 2, 7, 1), M.black), ...segs], {
			explode: [
				0,
				.035,
				.35
			],
			tag: {
				text: "Charge strip",
				at: L(0, Lh + 2, 104),
				value: () => `${fmt(sim.socPack() * 100)} %${sim.s.fault ? " · " + sim.s.fault : ""}`,
				side: "right"
			}
		}, drawer);
		moving.leds = leds;
		const clampG = box(0, CELLS.y, 111, 446, 314, 4, 2);
		const posts = GEO.merge(POSTS.flatMap(([x, y]) => [cyl([
			x,
			y,
			POST.top
		], [
			x,
			y,
			113
		], 3, 12), nut(x, y, 113, 5, 4)]));
		mass += kg([clampG], 2700) + kg([posts], 7900);
		part({
			id: "clamp",
			label: "Clamp",
			assembly: "drawer",
			source: SRC.ours,
			what: "A stiff plate on four posts over the cells, its foam pad pressing every top contact plate onto its poles with about 90 N a cell: the only joining force in the pack, so every cell comes out again. On the drawer, so the cells stay pressed when it comes out.",
			specs: [
				["Plate", "Aluminium, 4 mm"],
				["Pad", "Silicone foam, 4.5 mm, ~0.2 MPa [inferred]"],
				["Force", `${fmt(25920 / 1e3)} kN over 280 cells: ~${fmt(25920 / 280)} N each [computed]`],
				["Posts", "4 × M6, from the base plate"]
			]
		}, [
			m(clampG, M.plate),
			m(box(0, CELLS.y, 106.75, 432, 300, 4.5, 1), M.foam),
			m(posts, M.steel)
		], {
			explode: [
				0,
				.294,
				0
			],
			xray: "shell"
		}, drawer);
	}
	{
		const holder = (z0, h, r) => {
			const shape = new three.Shape();
			const X = zone.w / 2, Y0h = CELLS.y - zone.l / 2, Y1h = CELLS.y + zone.l / 2;
			shape.moveTo(...at2(-X, Y0h));
			shape.lineTo(...at2(X, Y0h));
			shape.lineTo(...at2(X, Y1h));
			shape.lineTo(...at2(-X, Y1h));
			shape.closePath();
			for (let i = 0; i < CELLS.s; i++) for (let j = 0; j < CELLS.p; j++) shape.holes.push(hole(colX(j), rowY(i), r));
			for (const [x, y] of POSTS) shape.holes.push(hole(x, y, 3.3));
			const g = new three.ExtrudeGeometry(shape, {
				depth: h * S,
				curveSegments: 3,
				bevelEnabled: false
			});
			g.rotateX(-Math.PI / 2).translate(0, (z0 + LIFT) * S, 0);
			g.clearGroups();
			return g;
		};
		const hb = GEO.merge([holder(27, 6, 5), holder(33, 6, 10.7)]);
		const ht = holder(TOP - 9, 6, 10.7);
		mass += kg([hb, ht], 1200);
		part({
			id: "holder-bottom",
			label: "Bottom cell holder",
			assembly: "cells",
			source: SRC.ours,
			what: "A plate of flame-retardant plastic on the bottom contact plates with a socket for every cell’s foot: a floor with a hole under each cell for the plate’s spring finger, and a honeycomb of collars 6 mm high that keeps the cells 22 mm apart, air between them.",
			specs: [
				["Material", "PC/ABS, UL94 V-0 [inferred]"],
				["Pitch", "22 mm"],
				["Floor and collars", "6 + 6 mm"],
				["Holes", `${CELLS.s * CELLS.p} + 4`]
			]
		}, [m(hb, M.holder)], { explode: [
			0,
			.098,
			0
		] }, drawer);
		part({
			id: "holder-top",
			label: "Top cell holder",
			assembly: "cells",
			source: SRC.ours,
			what: "The same plate round the cells’ heads, its holes leaving each pole bare for the top contact plates.",
			specs: [
				["Material", "PC/ABS, UL94 V-0 [inferred]"],
				["Thickness", "6 mm"],
				["Holes", `${CELLS.s * CELLS.p} + 4`]
			]
		}, [m(ht, M.holder)], { explode: [
			0,
			.21,
			0
		] }, drawer);
		const cz = (x, y, z0, z1, r, n) => cyl([
			x,
			y,
			z0
		], [
			x,
			y,
			z1
		], r, n);
		for (let i = 0; i < CELLS.s; i++) {
			const y = rowY(i), flip = i % 2 === 1;
			const zz = (z) => flip ? CELLS.z0 + TOP - z : z;
			const sleeve = [], can = [], roll = [], cap = [], ring = [], vent = [];
			for (let j = 0; j < CELLS.p; j++) {
				const x = colX(j);
				sleeve.push(cz(x, y, zz(CELLS.z0 + .2), zz(TOP - 1.5), CELLS.r, 14));
				can.push(cz(x, y, zz(CELLS.z0), zz(TOP - 1.7), CELLS.r - .2, 12));
				roll.push(cz(x, y, zz(CELLS.z0 + .6), zz(TOP - 2.4), CELLS.r - .6, 12));
				ring.push(cz(x, y, zz(TOP - 1.7), zz(TOP - 1.2), CELLS.r - .2, 12));
				cap.push(cz(x, y, zz(TOP - 1.5), zz(TOP), 6.5, 12));
				for (let k = 0; k < 3; k++) {
					const a = k / 3 * Math.PI * 2;
					vent.push(new three.BoxGeometry(2.6 * S, .3 * S, .9 * S).rotateY(a).translate(...L(x + 4 * Math.cos(a), y + 4 * Math.sin(a), zz(TOP) + (flip ? -.1 : .1))));
				}
			}
			const k = i + 1;
			part({
				id: `row-${k}`,
				label: `Row ${k}`,
				assembly: "cells",
				count: CELLS.p,
				source: SRC.cell,
				what: `Twenty 21700 cells side by side in parallel, ${flip ? "standing on their heads: their caps on the bottom plate, their cans’ bottoms up under the top plate" : "standing caps up: their cans’ bottoms on the bottom plate, their caps under the top plate"}. Each is a nickel-plated steel can with the wound electrodes (the jelly roll) inside, a crimped positive cap with its vent over a gasket and an insulator ring, in a blue PVC sleeve; held, not welded: a worn cell is pulled and a new one pushed in.`,
				specs: [
					["Cell", "21700 NMC: 5,000 mAh, 3.6 V nominal, 4.20–2.5 V, 10 A max, 69 g"],
					["Resistance", "25 mΩ DC at 25 °C and 50 % [inferred: about twice the 1 kHz figure]"],
					["Row", `20 in parallel: ${fmt(CELLS.p * CELL.Q)} Ah, 1.25 mΩ + 0.05 mΩ of contacts at 25 °C`],
					["Heat capacity", `${fmt(HEAT.Crow)} J/K (1,008 J/kg·K a cell)`],
					["Limits", `${BMS.uv} V under, ${BMS.ov} V over, ${BMS.ot} °C`]
				]
			}, [
				m(GEO.merge(sleeve), M.sleeve),
				m(GEO.merge(can), M.can),
				m(GEO.merge(roll), M.roll),
				m(GEO.merge(ring), M.ring),
				m(GEO.merge(cap), M.cap),
				m(GEO.merge(vent), M.hole)
			], {
				explode: [
					0,
					.14,
					0
				],
				delay: .1 + i / CELLS.s * .15,
				...i % 2 === 0 ? { tag: {
					text: `Rows ${k}–${k + 1}`,
					at: L((i < 7 ? -1 : 1) * (colX(CELLS.p - 1) + CELLS.r), (y + rowY(i + 1)) / 2, (CELLS.z0 + TOP) / 2),
					value: () => `${fmt(sim.s.Vr[i], 2)} · ${fmt(sim.s.Vr[i + 1], 2)} V · ${fmt(sim.s.T[i])} · ${fmt(sim.s.T[i + 1])} °C`,
					side: i < 7 ? "left" : "right"
				} } : {}
			}, drawer);
		}
	}
	{
		part({
			id: "insulation",
			label: "Insulation film",
			assembly: "contacts",
			source: SRC.ours,
			what: "A polyimide film between the bottom contact plates and the aluminium base plate: the plates are live, the drawer is not. Thin, so the cells’ heat still goes down through it into the drawer.",
			specs: [["Material", "Polyimide, 0.5 mm"], ["Heat", "~8 W/K a row through it [computed]"]]
		}, [m(box(0, CELLS.y, 25.25, PLATE_W, 320, .5), M.film)], { explode: [
			0,
			.035,
			0
		] }, drawer);
		const bottom = NODES.filter((n) => !n.top).map((n) => box(0, n.y, n.z, PLATE_W, n.len, 1.5));
		const fingers = [];
		for (let i = 0; i < CELLS.s; i++) for (let j = 0; j < CELLS.p; j++) fingers.push(box(colX(j), rowY(i), 30, 6, 1.6, 6));
		const pb = GEO.merge([...bottom, ...fingers]);
		const pt = GEO.merge(NODES.filter((n) => n.top).map((n) => box(0, n.y, n.z, PLATE_W, n.len, 1.5)));
		mass += kg([pb, pt], 8900);
		part({
			id: "plates-bottom",
			label: "Bottom contact plates",
			assembly: "contacts",
			count: 8,
			source: SRC.press,
			what: "Copper plates under the cells on the film: six that each join a row’s poles to the next row’s, and the two end plates, the pack’s minus (row 1) and plus (row 14). Each has a spring finger per cell, pressed up through the holder’s hole onto the pole by the clamp’s force: a pressed contact, no weld, so every cell comes out again.",
			specs: [
				["Material", "Copper, nickel-plated, 1.5 mm"],
				["Resistivity", "1.72e-8 Ω·m, +0.39 %/K"],
				["Current density", "0.15 A/mm² across a plate, 0.5 A/mm² in a finger at 100 A [computed]"],
				["Contact", "0.5 mΩ a cell at ~90 N [inferred]"],
				["Fingers", `${CELLS.s * CELLS.p}, 6 mm high`]
			]
		}, [m(pb, M.copper)], { explode: [
			0,
			.063,
			0
		] }, drawer);
		part({
			id: "plates-top",
			label: "Top contact plates",
			assembly: "contacts",
			count: 7,
			source: SRC.press,
			what: "Copper plates over the cells, each joining a row’s poles to the next row’s: with the bottom plates they put the 14 rows in series, the current snaking up one row and down the next. Pressed flat onto the poles by the clamp’s pad.",
			specs: [
				["Material", "Copper, nickel-plated, 1.5 mm"],
				["Pressed by", "The clamp’s pad, ~90 N a cell"],
				["Each", `${PLATE_W} × ${2 * CELLS.pitch - 3} mm, two rows`]
			]
		}, [m(pt, M.copper)], { explode: [
			0,
			.252,
			0
		] }, drawer);
	}
	{
		const by = rowY(CELLS.s - 1) + 60;
		const board = [m(box(0, by, 67, 400, 80, 2, .5), M.pcb)];
		board.push(m(GEO.merge([-1, 1].flatMap((sx) => [by - 36, by + 36].map((y) => cyl([
			sx * 195,
			y,
			POST.top
		], [
			sx * 195,
			y,
			66
		], 2.5, 8)))), M.brass));
		board.push(m(GEO.merge([
			box(-185, by, 69, 20, 16, 2),
			box(185, by - 30, 69, 20, 16, 2),
			box(185, by + 30, 69, 20, 16, 2),
			box(165, by, 69, 16, 16, 2)
		]), M.pad));
		board.push(m(GEO.merge([
			box(-160, by - 20, 68.5, 7, 7, 1),
			box(-160, by, 68.5, 7, 7, 1),
			box(-160, by + 20, 68.6, 10, 10, 1.2),
			...[
				-100,
				-88,
				-76,
				44,
				56,
				68
			].map((x) => cyl([
				x,
				by - 32,
				68
			], [
				x,
				by - 32,
				73
			], 2.5, 10)),
			box(-60, by + 32, 71, 50, 5, 6)
		]), M.chip));
		part({
			id: "bms",
			label: "Battery management system",
			assembly: "electronics",
			source: SRC.bms,
			what: "The board in front of the cells on the drawer: two front-end chips read every row’s voltage and the thermistors on the plates, a microcontroller runs the protection and talks CAN to the inverter through the plug. It opens the MOSFETs on any row under 2.80 V or over 4.25 V, any row over 60 °C, or over-current (past 100 A for 10 s, or 250 A at once), and bleeds the high rows at 100 mA above 4.10 V while charging so they stay together.",
			moves: "Opens and closes the pack.",
			specs: [
				["Rows", "14S, every one measured, balanced"],
				["Cut-offs", `${BMS.uv} V · ${BMS.ov} V · ${BMS.ot} °C · ${BMS.oc} A, ${BMS.ocPeak} A for ${BMS.peakS} s [inferred]`],
				["Balancing", `${BMS.bal * 1e3} mA above ${BMS.balAt} V [inferred]`],
				["Charging", `≤ ${BMS.chg} A (0.5 C), ≤ ${BMS.otChg} °C`],
				["Talks", "CAN to the inverter"]
			]
		}, board, {
			explode: [
				0,
				.14,
				.14
			],
			tag: {
				text: "BMS",
				at: L(-150, by, 69),
				value: () => sim.s.closed ? sim.s.balancing ? `closed · balancing ${sim.s.balancing} rows` : "closed" : `open: ${sim.s.fault}`,
				side: "left"
			}
		}, drawer);
		const fets = [], pours = [];
		for (const [k, y] of [[0, by - 20], [1, by + 20]]) {
			pours.push(box(-60, y, 68.5, 180, 16, 1));
			for (let j = 0; j < 8; j++) fets.push(box(-130 + j * 20, y, 71.25, 10, 15, 4.5, .5));
		}
		part({
			id: "mosfets",
			label: "MOSFET switches",
			assembly: "electronics",
			count: 16,
			source: SRC.bms,
			what: "Sixteen power MOSFETs in two banks of eight on the board’s copper: one bank blocks discharge, the other charge, back to back in the pack’s minus line. They are the pack’s only switch: closed they drop a few millivolts, open the pack is dead at the plug.",
			moves: "Switch in microseconds.",
			drive: "The BMS",
			specs: [
				["Device", "100 V, ~2 mΩ each [inferred]"],
				["Together", `${BMS.R * 1e3 - .4} mΩ for both banks [inferred]`],
				["Heat", "I²R: 5 W at 100 A, into the board’s copper"]
			]
		}, [m(GEO.merge(fets), M.chip), m(GEO.merge(pours), M.pad)], { explode: [
			0,
			.182,
			.14
		] }, drawer);
		part({
			id: "shunt",
			label: "Current shunt",
			assembly: "electronics",
			source: SRC.cu,
			what: "A manganin bar between two copper pads in the minus line: the BMS reads the pack’s current from the millivolts across it, for its counting of the charge and its over-current trip.",
			specs: [["Resistance", "0.1 mΩ: 10 mV at 100 A"], ["Material", "Manganin, 48e-8 Ω·m, flat with temperature"]]
		}, [m(box(60, by, 69.25, 40, 10, 2.5), M.manganin), m(GEO.merge([box(35, by, 68.5, 12, 14, 1), box(85, by, 68.5, 12, 14, 1)]), M.pad)], { explode: [
			0,
			.168,
			.14
		] }, drawer);
		part({
			id: "fuse",
			label: "Fuse",
			assembly: "electronics",
			source: SRC.bms,
			what: "A bolt-down fuse in the plus line, the last guard behind the MOSFETs: a dead short at the plug blows it before any strap or plate can heat.",
			specs: [["Rating", "125 A, 80 V DC [inferred]"], ["Resistance", "0.3 mΩ [inferred]"]]
		}, [m(box(120, by, 75, 44, 20, 14, 2), M.ceramic), m(GEO.merge([box(98, by, 74, 8, 22, 12, 1), box(142, by, 74, 8, 22, 12, 1)]), M.brass)], { explode: [
			0,
			.196,
			.14
		] }, drawer);
		const leads = [];
		for (const n of NODES) {
			const mat = n.k === 0 ? M.wireBlack : n.k === CELLS.s ? M.wireRed : M.wire;
			leads.push(m(hose([
				[
					-216,
					n.y,
					n.z
				],
				[
					-224.5,
					n.y,
					n.z
				],
				[
					-224.5,
					104,
					n.z
				],
				[
					-210,
					106,
					n.z
				],
				[
					-210,
					106,
					74
				],
				[
					-82 + (n.k - 7) * 3,
					by + 30,
					74
				]
			], .7, 6), mat));
		}
		part({
			id: "balance-leads",
			label: "Balance leads",
			assembly: "electronics",
			count: NODES.length,
			source: SRC.bms,
			what: "Fifteen thin leads, one from every contact plate, so the BMS sees every row’s voltage and can bleed any row that runs ahead: from each plate’s end along the gap beside the holders, in front of the cells and up to the header on the board.",
			specs: [["Leads", "15 × 0.5 mm², fused at the plate"], ["Thermistors", "On 4 of the plates [inferred]"]]
		}, leads, { explode: [
			-.07,
			.21,
			.07
		] }, drawer);
		const y0 = rowY(0), y13 = rowY(CELLS.s - 1);
		const bare = [
			box(220.5, y0, 26.25, 9, 19, 1.5),
			box(205, by + 30, 70.75, 39, 20, 1.5),
			box(220.5, y13, 26.25, 9, 19, 1.5),
			box(205, by - 30, 70.75, 39, 20, 1.5),
			box(195, by, 70.75, 59, 20, 1.5),
			box(-205, by, 70.75, 39, 20, 1.5)
		];
		const sleeved = [
			box(224.5, y0, 66, 1.5, 19, 80),
			box(224.5, (y0 - 9.5 + by + 40) / 2, 105, 1.5, by + 40 - y0 + 9.5, 20),
			box(224.5, by + 30, 88, 1.5, 20, 36),
			box(224.5, y13, 48, 1.5, 19, 44),
			box(224.5, (y13 - 9.5 + by - 20) / 2, 70, 1.5, by - 20 - y13 + 9.5, 20),
			box(224.5, by, 58, 1.5, 20, 24),
			box(224.5, (by - 216) / 2, 46, 1.5, by + 216, 20),
			box(269.5 / 2, -216, 46, 179.5, 1.5, 20),
			box(-224.5, by, 58, 1.5, 20, 24),
			box(-224.5, (by - 216) / 2, 46, 1.5, by + 216, 20),
			box(-269.5 / 2, -216, 46, 179.5, 1.5, 20)
		];
		mass += kg([...bare, ...sleeved], 8900);
		part({
			id: "busbars",
			label: "Current straps",
			assembly: "electronics",
			count: 4,
			source: SRC.cu,
			what: "Four flat copper straps in heat-shrink carry the pack’s current, each in the 3 mm gap between the holders and the shell’s wall: from row 14’s plate (the plus) up to the fuse, from the fuse down the right side and across the back to the plug’s plus; from the plug’s minus up the left side to the MOSFETs, and from the shunt along the right side, high, back to row 1’s plate (the minus). Bolted to the pads, no weld.",
			specs: [
				["Strap", "20 × 2 mm copper, 40 mm²: 2.5 A/mm² at 100 A [computed]"],
				["Resistance", `${fmt(LINK.series * 1e3 - .2, 2)} mΩ for the two long runs [computed]`],
				["Insulation", "Heat-shrink, 0.5 mm"]
			]
		}, [m(GEO.merge(bare), M.copper), m(GEO.merge(sleeved), M.strap)], { explode: [
			0,
			.238,
			0
		] }, drawer);
		const plug = [m(box(0, -Lh + 14, 57, 150, 12, 30, 1), M.black)];
		for (const x of [-45, 45]) plug.push(m(cyl([
			x,
			-Lh + 8,
			58
		], [
			x,
			-Lh + 4.5,
			58
		], 3.5, 12), M.brass));
		for (let k = 0; k < 4; k++) plug.push(m(cyl([
			-12 + k * 8,
			-Lh + 8,
			58
		], [
			-12 + k * 8,
			-Lh + 5,
			58
		], 1.2, 8), M.gold));
		part({
			id: "inner-plug",
			label: "Inner plug",
			assembly: "electronics",
			source: SRC.ours,
			what: "At the back of the drawer: the BMS’s plus, minus and data in one plug whose two round pins and four data pins slide into the inside of the shell’s back socket as the drawer goes home, into the same contact tubes the cube’s pins enter from the other side. Pull the drawer 10 mm and the pack is dead at its socket.",
			moves: "Leaves the socket with the drawer.",
			specs: [
				["Power", "2 pins ⌀ 7 mm, 120 A [inferred]"],
				["Data", "CAN, 4 pins"],
				["Engages", "The last 3.5 mm of the drawer’s travel"]
			]
		}, plug, { explode: [
			0,
			.07,
			-.14
		] }, drawer);
	}
	const ctl = {
		load: {
			label: "Load (below 0: charging)",
			min: -2.5,
			max: 5,
			value: load,
			step: .1,
			unit: "kW",
			digits: 1,
			ends: ["Charging at 2.5 kW", "Full load, 100 A"]
		},
		ambient: {
			label: "Room temperature",
			min: -10,
			max: 45,
			value: ambient,
			step: 1,
			unit: "°C",
			ends: ["Cold", "Hot"]
		},
		soc: {
			label: "State of charge (set)",
			min: 0,
			max: 100,
			value: soc,
			step: 1,
			unit: "%",
			ends: ["Empty", "Full"]
		},
		aged: {
			label: "Row 7 aged",
			min: 0,
			max: 100,
			value: 0,
			step: 5,
			unit: "%",
			ends: ["New", "60 % left, 3× resistance"]
		},
		drawer: {
			label: "Drawer out",
			min: 0,
			max: DRAWER_OUT,
			value: 0,
			step: 5,
			unit: "mm",
			ends: ["Home, buttons pressed to start", "Out for service"]
		},
		trigger: {
			label: "Grip trigger",
			min: 0,
			max: 4,
			value: 0,
			step: .5,
			unit: "mm",
			ends: ["Released", "Squeezed: pawls in"]
		}
	};
	const sim = solver(ctl);
	const lanes = [
		-187,
		-99,
		-11,
		77,
		165
	];
	const snake = (x) => {
		const pts = [];
		for (let i = 0; i < CELLS.s; i++) {
			const y = rowY(i), up = i % 2 === 0;
			pts.push([
				x,
				y,
				up ? 27 : 103
			], [
				x,
				y,
				up ? 103 : 27
			]);
		}
		return pts;
	};
	const by = rowY(CELLS.s - 1) + 60;
	const leadIn = [
		[
			216,
			rowY(CELLS.s - 1),
			27
		],
		[
			224.5,
			rowY(CELLS.s - 1),
			50
		],
		[
			224.5,
			by - 20,
			70
		],
		[
			185,
			by - 30,
			72
		],
		[
			120,
			by,
			78
		],
		[
			185,
			by,
			72
		],
		[
			224.5,
			by,
			60
		],
		[
			224.5,
			-216,
			46
		],
		[
			45,
			-216,
			46
		],
		[
			45,
			-224,
			58
		],
		[
			45,
			-236,
			58
		]
	];
	const leadOut = [
		[
			-45,
			-236,
			58
		],
		[
			-45,
			-224,
			58
		],
		[
			-45,
			-216,
			46
		],
		[
			-224.5,
			-216,
			46
		],
		[
			-224.5,
			by,
			60
		],
		[
			-185,
			by,
			72
		],
		[
			-60,
			by,
			73
		],
		[
			60,
			by,
			72
		],
		[
			185,
			by + 30,
			72
		],
		[
			224.5,
			by + 30,
			88
		],
		[
			224.5,
			by + 20,
			105
		],
		[
			224.5,
			rowY(0),
			105
		],
		[
			224.5,
			rowY(0),
			40
		],
		[
			216,
			rowY(0),
			27
		]
	];
	const pathsD = [
		...lanes.map(snake),
		leadIn,
		leadOut
	];
	const pathsC = pathsD.map((p) => [...p].reverse());
	/** the streaks' colour: the rows' by their heat (cool blue to hot red), the straps' by the current */
	const tCol = (T) => {
		const k = clamp((T - 20) / 45);
		return [
			lerp(.25, 1, k),
			lerp(.55, .35, k),
			lerp(1, .1, k)
		];
	};
	const colour = (k, u) => k < lanes.length ? tCol(sim.s.T[clamp(Math.floor(u * CELLS.s), 0, CELLS.s - 1)]) : tCol(20 + 45 * clamp(Math.abs(sim.s.I) / 150));
	const toM = (ps) => ps.map((p) => p.map((q) => L(...q)));
	const flowD = new Flow({ theme: "paper" }, {
		parent: drawer,
		paths: toM(pathsD),
		count: 520,
		length: .025,
		seed: 5,
		color: colour
	});
	const flowC = new Flow({ theme: "paper" }, {
		parent: drawer,
		paths: toM(pathsC),
		count: 520,
		length: .025,
		seed: 9,
		color: (k, u) => colour(k, 1 - u)
	});
	kit.onTick((dt, env) => {
		sim.step(dt, env);
		const s = sim.s;
		const out = ctl.drawer.value, press = clamp(out / 4) * (1 - clamp((out - 16) / 8));
		const catches = out > .5 ? 1 : press;
		drawer.position.z = out * S;
		for (const [sx, side] of [[-1, "left"], [1, "right"]]) {
			moving[`release-${side}`].position.z = L(0, Lh, 0)[2] - press * 4 * S;
			moving[`catch-${side}`].position.x = sx * PX * S + sx * catches * 5 * S;
			moving[`pawl-${side}`].rotation.y = -sx * (ctl.trigger.value / 38);
		}
		moving.trigger.position.y = 12.5 * S + ctl.trigger.value * S;
		const soc = sim.socPack(), lit = Math.round(soc * 10);
		const leds = moving.leds;
		for (let k = 0; k < 10; k++) {
			const on = k < lit, next = k === lit && s.I < -.5 && s.closed;
			const fault = !s.closed && (on || lit === 0);
			leds[k].emissive.setRGB(fault ? 1 : .12, fault ? .08 : .95, fault ? .05 : .4);
			leds[k].emissiveIntensity = fault ? s.blink < .5 ? 2.5 : .2 : on ? 2.2 : next ? 1.2 + 1 * Math.sin(s.blink * Math.PI * 2) : 0;
		}
		const show = Math.max(env.cut, env.xray) * (s.plugged ? 1 : .4);
		flowD.speed = .12 * Math.max(0, s.I) / 100;
		flowC.speed = .12 * Math.max(0, -s.I) / 100;
		flowD.opacity = s.I > .5 ? clamp(.3 + s.I / 100) * show : 0;
		flowC.opacity = s.I < -.5 ? clamp(.3 - s.I / 100) * show : 0;
		flowD.update(dt);
		flowC.update(dt);
		const hero = lab.read;
		const left = sim.left(), hot = sim.hottest();
		hero.value = s.P / 1e3;
		hero.bad = !s.closed || s.T[hot] > BMS.ot - 5 || Math.abs(s.I) > BMS.oc;
		hero.state = !s.plugged ? "unplugged: the drawer is out" : !s.closed ? `open: ${s.fault}${s.latched ? ", take the load off" : ""}` : env.broken ? `overloaded: ${fmt(s.I)} A, ${BMS.ocPeak} A for ${BMS.peakS} s at most` : s.I < -.5 ? s.balancing ? `charging, balancing ${s.balancing} rows` : soc > .999 ? "full" : "charging" : s.I > BMS.oc ? "over its continuous rating" : s.T[hot] > BMS.ot - 5 ? `row ${hot + 1} near its limit` : Math.abs(s.I) < .5 ? ctl.load.value < 0 && soc >= .995 ? "full, the charger off" : "resting" : "delivering";
		hero.sub = `${fmt(s.V, 1)} V · ${fmt(Math.abs(s.I))} A ${s.I < -.5 ? "in" : "out"} · ${fmt(soc * 100)} % · ${fmt(left.wh / 1e3, 2)} kWh left${s.P > 50 ? ` · ${runTime(left.wh / s.P)} at this load` : ""} · row ${hot + 1} ${fmt(s.T[hot])} °C · ${fmt(s.q)} W of heat`;
	});
	/** hours as "2 h 14 min" @param {number} h */
	const runTime = (h) => h >= 1 ? `${Math.floor(h)} h ${fmt(h % 1 * 60)} min` : `${fmt(h * 60)} min`;
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Power delivered",
			unit: "kW",
			max: 5,
			digits: 2
		},
		read: {
			value: 0,
			state: "",
			sub: "",
			bad: false
		},
		controls: ctl,
		how: {
			text: "Fourteen rows of twenty cells in series. Each row’s voltage is its cells’ open-circuit voltage at their state of charge less the current’s drop over their resistance, which rises in the cold (Arrhenius) and near empty; the pack’s is their sum less the BMS’s, the straps’ and the plug’s. The load asks for a power, and the current follows from the sagged voltage; charging is a 50 A charger tapered so no row passes 4.20 V, the balancer bleeding the high rows. Every current’s I²R heats its row; the rows share heat through the plates, give it down into the drawer and out through the shell to the room. The BMS opens the pack on any row under 2.80 V or over 4.25 V, over 60 °C, or over-current. State of charge and heat run 60 times faster than real (an hour a minute); the electrics, the BMS’s trips and the strip at real time.",
			eqs: [
				"V_row = OCV(SoC) − I · R_cell(T, SoC) / 20 − I · 2 R_c / 20      R_cell = 25 mΩ · e^(Ea/R (1/T − 1/298)) · (1 + 1.5 · (0.15 − SoC)⁺/0.15), Ea = 21 kJ/mol, R_c = 0.5 mΩ",
				"V = Σ V_row − I · (R_fet + R_shunt + R_fuse + R_straps + R_plug) = Σ V_row − I · 1.4 mΩ",
				"I = (V_oc − √(V_oc² − 4 P R)) / (2 R)      P the load; charging I ≥ −50 A and I ≥ −(4.20 − OCV) / R_row",
				"dSoC_row/dt = −I / (3,600 · Q_row)      Q_row = 100 Ah (row 7: × (1 − 0.4 aged)); balancing −0.1 A on a row over 4.10 V",
				"C_row dT/dt = I² R_row − G_rr (T − T_±1) − G_rd (T − T_drawer)      C_row = 1,480 J/K, G_rr = 6.5, G_rd = 3 W/K",
				"C_d dT_d/dt = Σ G_rd (T − T_d) + I² R_bms − G_ds (T_d − T_s);  C_s dT_s/dt = G_ds (T_d − T_s) − G_sa (T_s − T_room)      G_ds = 5, G_sa = 6.3 W/K",
				"BMS opens: V_row < 2.80 V · V_row > 4.25 V · T_row > 60 °C · |I| > 250 A, or > 100 A for 10 s"
			]
		},
		breakIt: {
			label: "Overload it",
			run: () => {},
			reset: () => sim.reset()
		},
		cut: {
			a: [
				1,
				0,
				0
			],
			b: [
				0,
				1,
				0
			],
			center: [
				.011,
				(CELLS.z0 + TOP) / 2 * S + LIFT * S,
				-.05
			],
			reach: .9
		}
	};
	if (v >= 11) lab.moves = MOVES;
	const asset = kit.seal({ lab });
	root.userData.mass = mass;
	asset.tick(0, {
		broken: false,
		time: 0,
		slow: 0,
		cut: 0,
		xray: 0
	});
	return root;
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
const HISTORY = /* @__PURE__ */ (() => ({ batterypack: [
	{
		...FIRST,
		date: "2026-10-13",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v1: a square case, five charge lights",
			make: () => batteryPack$1()
		}]
	},
	{
		v: 2,
		date: "2026-10-13",
		note: "Smooth and modern: one matte black case with round corners (R 30 mm), a soft-edged lid, a light seam under it, a darker foot band, flush latches, and a slim LED strip along the top of its face that shows the state of charge in ten segments. Same 460 × 480 × 125 mm",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v2: its terminals still on its face",
			make: () => batteryPack$2(2)
		}]
	},
	{
		v: 3,
		date: "2026-10-13",
		note: "Plug in, pull out: power and data leave by one blind-mate plug in its back, between two guide pins (no terminals on its face), and a ClickLock clicks it into its rails; press the tab on its face and it slides out",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v3: two handles and a release tab",
			make: () => batteryPack$2(3)
		}]
	},
	{
		v: 4,
		date: "2026-10-13",
		note: "One grip for one hand, in the middle of its face, in place of the two handles: its trigger releases the ClickLock, so one squeeze and one pull take the pack out, and pushing it in clicks it home",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v4: the grip in the middle, pins on its back",
			make: () => batteryPack$2(4)
		}]
	},
	{
		v: 5,
		date: "2026-10-13",
		note: "The grip low on its face, near the case’s foot, its trigger at the very height of the ClickLock’s pawls, so the two release cables run straight to them; and its back plug as a flush socket of proper holes (two lined guide holes, two power and four data sockets) for the cube’s pins: nothing sticks out of its back",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v5: a lid on four latches",
			make: () => batteryPack$2(5)
		}]
	},
	{
		v: 6,
		date: "2026-10-13",
		note: "Serviceable from the front: a closed shell (no lid, no latches) and one L-shaped service drawer, its front plate the pack’s face and its base plate carrying every inner part (holders, cells, contact plates, a clamp in place of the lid’s pad, the BMS and an inner plug). Press the two push buttons in the shell’s sides, pull the grip, and the whole inside slides out; a “service” move plays it, and a “drawer out” pose holds it",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v6: release buttons in the shell’s sides",
			make: () => batteryPack$2(6)
		}]
	},
	{
		v: 7,
		date: "2026-10-13",
		note: "Everything from the front and low: the grip and the ClickLock down at the base plate’s level (bar 28 mm, lock 20 mm over the foot), and the drawer’s two release buttons on the face’s left and right ends at the same level, each pulling its spring catch in by a short rod; its back socket’s contacts sit in pockets that take the cube’s pin collars",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v7: grip and buttons on the drawer’s front plate",
			make: () => batteryPack$2(7)
		}]
	},
	{
		v: 8,
		date: "2026-10-13",
		note: "What you hold and press is the shell’s: a foot (floor tub and a 20 mm sill across the face) carries the grip, the ClickLock and the two release buttons at its outer ends, and the drawer’s catches; the drawer rides on the foot and carries only the insides, pulled by a finger slot under its face; the back socket’s holes in one line",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v8: release buttons in the sill’s outer ends",
			make: () => batteryPack$2(8)
		}]
	},
	{
		v: 9,
		date: "2026-10-13",
		note: "The release mechanism in the shell’s two front corner columns: each column stands up to the base plate’s top, a release button in its face at the base plate’s level and the drawer’s catch inside it, a spring bolt that shoots sideways into a notch in the base plate’s edge. The base plate runs between the columns and the cells’ holders pass over them (a taller column would stop the drawer coming out)",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v9: one rigged mesh in flat colours, its release buttons in the shell’s front corner columns",
			make: () => batteryPack$2(9)
		}]
	},
	{
		v: 10,
		date: "2026-10-15",
		note: "Built at AirSup’s realism, the v9 design and every measure kept: every part real solids in measured materials (the 280 cells each a steel can, a crimped positive cap with its vent, an insulator ring and a blue sleeve, merged by series row so each row reads its own voltage and heat; polyamide holders with their holes; nickel-plated copper contact plates and the clamp that presses them, no welds; the BMS board with its MOSFETs, shunt, fuse, balance leads to every row and inner plug; the anodised shell with its hollow foot and sill, the L-shaped service drawer, the grip, trigger, pawls, cables, springs, release buttons and spring-bolt catches; the back socket with its guide holes; a ten-segment charge strip); a solver runs it on real equations (open-circuit voltage against state of charge, resistance rising in the cold and near empty, the current’s I²R heat in cells, plates and pressed contacts, a lumped heat path out through the drawer and shell, the BMS’s cutoffs and balancing) on sliders for load, ambient, state of charge, an aged row, the drawer and the trigger, the power delivered read out; explode, cut away, x-ray with the current streaking along the plates, labels with live readings, slow, and its break: overloaded until the BMS opens",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v10: its solver and views, no moves of its own",
			make: () => castOf(batteryPack({ v: 10 }))
		}]
	},
	{
		v: 11,
		date: "2026-10-15",
		note: "Its moves back, apart from its views: Service (both buttons pressed, the whole inside pulled out between the columns and slid home till the catches click) and Grip (the trigger squeezed, both pawls swing in and click out again), beside the stage’s Run and Assemble; the sliders they set follow them"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "batterypack",
	label: "BatteryPack",
	note: "Our modular, repairable battery: 280 cylindrical 21700 cells (14S20P, 51.8 V, ~5.2 kWh) in two holder plates, copper contact plates pressed on by its lid, no welds and no glue, so every cell, plate and the BMS comes out again. Four fill a BatteryCube",
	from: "Our design",
	variants: [{
		id: "batterypack",
		label: "BatteryPack",
		note: "460 × 480 × 125 mm, 280 cells (14S20P, 51.8 V, 100 Ah, ~5.2 kWh), a charge strip on its face; its solver on the load, the ambient and its charge, every row read; its moves Service and Grip",
		make: () => castOf(batteryPack())
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