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
/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at @param {number} [seg] */
function wheel(r, w, at, seg = 18) {
	const g = new three.CylinderGeometry(r, r, w, seg);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}
/** smoothly from 0 to 1 @param {number} x */
const ease = (x) => x * x * (3 - 2 * x);

//#endregion
//#region src/lib/actors/pallet.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {(geo: THREE.BufferGeometry, color: string, bone: string, mat?: number) => void} Add */
/** a Euro pallet's length, width and height; the forks' openings: their middles across it (x), bottom and top */
const PL = 1.2;
const PW = .8;
const PH = .144;
const FORK_X = .264;
const WOOD = "#c9a878";
const WOOD2 = "#b8955f";
const CRATE = "#b98d55";
const CRATE2 = "#a87f4c";
const WRAP = "#dfe3e2";
/**
* A Euro pallet standing at `at` (the middle of its underside), turned `yaw` about y from lying along x, on `bone`;
* loaded with cartons to `stack` (m from the floor; 0: empty). The wrap is the actor's material 1 (its glass).
* @param {Add} add @param {V3} at @param {number} yaw @param {string} bone @param {{ stack?: number }} [o]
*/
function euroPallet(add, at, yaw, bone, { stack = 1.6 } = {}) {
	const place = new three.Matrix4().makeTranslation(...at).multiply(new three.Matrix4().makeRotationY(yaw));
	/** @type {Add} */
	const put = (geo, color, b, mat) => add(geo.applyMatrix4(place), color, b, mat);
	for (const [bz, w] of [
		[-.3275, .145],
		[-.16, .1],
		[0, .145],
		[.16, .1],
		[.3275, .145]
	]) put(block(PL, .022, w, [
		0,
		.13299999999999998,
		bz
	], .004), WOOD, bone);
	for (const bx of [
		-.5275,
		0,
		.5275
	]) {
		put(block(.145, .022, PW, [
			bx,
			.111,
			0
		], .004), WOOD2, bone);
		for (const bz of [
			-.3275,
			0,
			.3275
		]) put(block(.145, .078, .145, [
			bx,
			.061,
			bz
		], .006), WOOD2, bone);
	}
	for (const bz of [
		-.3275,
		0,
		.3275
	]) put(block(PL, .022, .1, [
		0,
		.011,
		bz
	], .004), WOOD, bone);
	if (stack <= .144) return;
	const top = stack - PH;
	for (let k = 0; k < 3; k++) put(block(1.18, top / 3 - .01, .78, [
		0,
		PH + (k + .5) * (top / 3),
		0
	], .02), k % 2 ? CRATE : CRATE2, bone);
	put(block(1.204, top * .7, .804, [
		0,
		PH + top * .5,
		0
	], .02), WRAP, bone, 1);
}

//#endregion
//#region src/lib/actors/forklift.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Cast} Cast */
/** @typedef {import('./rig').BoneSpec} BoneSpec */
/** @typedef {(geo: THREE.BufferGeometry, color: string, bone: string, mat?: number) => void} Add */
const BODY = "#f1f0eb";
const BAND = "#2f6f68";
const DARK = "#2a2c2e";
const STEEL = "#8f9498";
const TYRE = "#1d1e20";
const GREEN = "#4fd18b";
const RED = "#e0302a";
/** how far below and behind it its far bones pivot (m) */
const FAR = 2e3;
/** the drive wheels: radius, their x and z; the forks' length and how high they ride above the ground at rest */
const WR = .1;
const WX = .4;
const WZ = -.22;
const FORK = .8;
const TINE_Y = .03;
/** how high the forks lift at most (m) */
const LIFT_MAX = .75;
/** where a point of the forklift built at the origin facing +z lands at `heel`, turned `yaw` @param {V3} heel @param {number} yaw */
const placer = (heel, yaw) => new three.Matrix4().makeTranslation(...heel).multiply(new three.Matrix4().makeRotationY(yaw));
/**
* Add a forklift to a rig: its bones (to `bones`, under `parent`) and its pieces (through `add`), its heel at `heel`,
* turned `yaw` about y (0 faces +z, π/2 faces +x). Its bones are named after it: `name` (it drives on it, pivoted far
* below), `nameBody`, `nameWheels`, `nameLift` (pivoted far behind) and `nameForks` (the forks and their carriage, so a
* size of 0 there and on the body and the wheels hides the forklift).
* @param {Add} add @param {BoneSpec[]} bones
* @param {{ name: string, parent?: string, heel: V3, yaw?: number }} o
*/
function forkliftParts(add, bones, { name, parent, heel, yaw = 0 }) {
	const m = placer(heel, yaw);
	/** @param {V3} p @returns {V3} */
	const to = (p) => new three.Vector3(...p).applyMatrix4(m).toArray();
	bones.push({
		name,
		...parent ? { parent } : {},
		at: to([
			0,
			-2e3,
			0
		])
	}, {
		name: `${name}Body`,
		parent: name,
		at: to([
			0,
			.3,
			-.5
		])
	}, {
		name: `${name}Wheels`,
		parent: name,
		at: to([
			0,
			WR,
			WZ
		])
	}, {
		name: `${name}Lift`,
		parent: name,
		at: to([
			0,
			TINE_Y,
			-2e3
		])
	}, {
		name: `${name}Forks`,
		parent: `${name}Lift`,
		at: to([
			0,
			TINE_Y,
			0
		])
	});
	/** @type {Add} */
	const put = (geo, color, bone, mat) => add(geo.applyMatrix4(m), color, bone, mat);
	const body = `${name}Body`, forks = `${name}Forks`;
	put(block(.76, .36, .86, [
		0,
		.29,
		-.52
	], .08), BODY, body);
	put(block(.764, .05, .864, [
		0,
		.37,
		-.52
	], .01), BAND, body);
	put(block(.7, .08, .05, [
		0,
		.15,
		-.96
	], .03), DARK, body);
	put(block(.56, .012, .14, [
		0,
		.47,
		-.82
	], .005), DARK, body);
	put(block(.6, .06, .012, [
		0,
		.22,
		-.084
	], .005), DARK, body);
	put(block(.08, .02, .08, [
		.26,
		.475,
		-.3
	], .008), GREEN, body);
	for (const sx of [-1, 1]) put(block(.14, .05, .012, [
		sx * .26,
		.37,
		-.953
	], .006), RED, body);
	for (const sx of [-1, 1]) {
		put(wheel(.055, .05, [
			sx * .26,
			.055,
			-.84
		], 14), TYRE, body);
		put(block(.06, .06, .06, [
			sx * .26,
			.11,
			-.84
		], .01), STEEL, body);
	}
	for (const sx of [-1, 1]) {
		put(wheel(WR, .07, [
			sx * WX,
			WR,
			WZ
		], 22), TYRE, `${name}Wheels`);
		put(wheel(WR * .55, .074, [
			sx * WX,
			WR,
			WZ
		], 5), STEEL, `${name}Wheels`);
	}
	for (const sx of [-1, 1]) put(block(.06, 1.12, .07, [
		sx * .3,
		.67,
		-.07
	], .012), STEEL, body);
	put(block(.66, .06, .07, [
		0,
		1.2,
		-.07
	], .012), STEEL, body);
	put(block(.56, .36, .03, [
		0,
		.23,
		-.015
	], .01), DARK, forks);
	for (const sx of [-1, 1]) {
		put(block(.12, .4, .035, [
			sx * FORK_X,
			.23,
			-.018
		], .008), STEEL, forks);
		put(block(.12, .035, FORK, [
			sx * FORK_X,
			.0475,
			FORK / 2
		], .008), STEEL, forks);
	}
}
const Y = /* @__PURE__ */ (() => new three.Vector3(0, 1, 0))();
const axis = /* @__PURE__ */ (() => new three.Vector3())();
const q = /* @__PURE__ */ (() => new three.Quaternion())();
const e = /* @__PURE__ */ (() => new three.Euler())();
/** the turn (x, y, z) of `angle` about `dir` @param {THREE.Vector3} dir @param {number} angle @returns {V3} */
const turn = (dir, angle) => {
	e.setFromQuaternion(q.setFromAxisAngle(dir, angle), "XYZ");
	return [
		e.x,
		e.y,
		e.z
	];
};
/**
* Pose a forklift added by `forkliftParts` (turned `yaw`) into `p`: driven `move` metres forward (back if negative)
* from where it was built, its forks lifted `lift` metres, shown or hidden.
* @param {Pose} p @param {string} name @param {number} yaw
* @param {{ move?: number, lift?: number, show?: boolean }} s
*/
function forkliftPose(p, name, yaw, { move = 0, lift = 0, show = true }) {
	const f = new three.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
	p[name] = turn(axis.crossVectors(Y, f).normalize(), Math.asin(move / FAR));
	p[`${name}Lift`] = turn(axis.crossVectors(f, Y).normalize(), Math.asin(lift / FAR));
	p[`${name}Wheels`] = [...turn(axis.crossVectors(Y, f).normalize(), move / WR), show ? 1 : 0];
	const size = show ? 1 : 0;
	p[`${name}Body`] = [
		0,
		0,
		0,
		size
	];
	p[`${name}Forks`] = [
		0,
		0,
		0,
		size
	];
}
/** from 0 to 1 over [a, b] of the cycle, eased @param {number} u @param {number} a @param {number} b */
const ramp = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
/**
* The forklift on its own, empty or with a loaded Euro pallet on its forks.
* @param {{ pallet?: boolean }} [o] @returns {Cast}
*/
function forklift({ pallet = false } = {}) {
	/** @type {BoneSpec[]} */
	const bones = [{
		name: "base",
		at: [
			0,
			0,
			0
		]
	}];
	/** @type {import('./rig').Piece[]} */
	const parts = [];
	/** @type {Add} */
	const add = (geo, color, bone, mat) => void parts.push({
		geo,
		color,
		bone,
		...mat ? { mat } : {}
	});
	forkliftParts(add, bones, {
		name: "forklift",
		parent: "base",
		heel: [
			0,
			0,
			0
		]
	});
	if (pallet) euroPallet(add, [
		0,
		-.035,
		.42
	], 0, "forkliftForks", { stack: 1.2 });
	const r = rig(bones, parts, [skin(.45, { side: three.DoubleSide }), skin(.06, {
		transparent: true,
		opacity: .3,
		depthWrite: false
	})]);
	r.object.name = pallet ? "forklift (with a pallet)" : "forklift";
	const rest = pallet ? .035 : 0;
	/** @param {{ move?: number, lift?: number }} s */
	const m = ({ move = 0, lift = 0 }) => {
		/** @type {Pose} */
		const p = {};
		forkliftPose(p, "forklift", 0, {
			move,
			lift: Math.max(lift, rest)
		});
		return p;
	};
	return {
		rig: r,
		clips: {
			lift: (t) => {
				const u = loop(t, 6);
				return m({ lift: LIFT_MAX * (ramp(u, .1, .4) - ramp(u, .6, .9)) });
			},
			drive: (t) => {
				const u = loop(t, 8);
				return m({ move: 2 * (ramp(u, .05, .45) - ramp(u, .55, .95)) });
			},
			carry: (t) => {
				const u = loop(t, 10);
				return m({
					move: -2 * (ramp(u, .2, .5) - ramp(u, .65, .95)),
					lift: .12 * (ramp(u, .05, .15) - ramp(u, .55, .63))
				});
			},
			idle: () => m({})
		},
		poses: {
			down: m({}),
			raised: m({ lift: .3 }),
			top: m({ lift: LIFT_MAX })
		},
		first: "lift"
	};
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
const HISTORY = /* @__PURE__ */ (() => ({ forklift: [{
	...FIRST,
	date: "2026-10-07"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "forklift",
	label: "Forklift",
	note: "the pallet mover: autonomous, on a battery, as small as a machine lifting a loaded Euro pallet can be; no cab, a low body, two uprights, forks for a Euro pallet’s openings; it lifts, drives and carries, and it is built into the goods pod’s rig to load and unload it",
	from: "Sandbox 5: loading the pods at the hubs",
	variants: [{
		id: "forklift",
		label: "Forklift",
		note: "1.8 m long with its forks, 0.84 m wide, 1.23 m high; forks 0.8 m long, lifting 75 cm",
		make: () => forklift()
	}, {
		id: "forklift-pallet",
		label: "With a pallet",
		note: "a loaded Euro pallet (1200 × 800 mm, cartons to 1.2 m) on its forks",
		make: () => forklift({ pallet: true })
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