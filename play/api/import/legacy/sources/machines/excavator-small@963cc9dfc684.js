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
const fine = (n, least) => Math.max(least, Math.round(n * DETAIL));
/**
* A limb from a to b: rounded at both ends, `r0` thick at a and `r1` at b, in rings enough to bend; `flat` squashes
* it across (a hand: 0.5), `turn` turns that squash about the limb's axis.
*/
function limb(a, b, r0, r1, { flat = 1, turn = 0, seg = 12 } = {}) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const len = A.distanceTo(B);
	const pts = [];
	const cap = fine(5, 2), body = fine(Math.max(4, Math.round(len / .03)), 2);
	for (let i = 0; i <= cap; i++) {
		const t = i / cap * (Math.PI / 2);
		pts.push(new three.Vector2(Math.max(1e-4, Math.sin(t) * r1), -Math.cos(t) * r1));
	}
	for (let i = 1; i < body; i++) {
		const t = i / body;
		pts.push(new three.Vector2(r1 + (r0 - r1) * t, len * t));
	}
	for (let i = 0; i <= cap; i++) {
		const t = i / cap * (Math.PI / 2);
		pts.push(new three.Vector2(Math.max(1e-4, Math.cos(t) * r0), len + Math.sin(t) * r0));
	}
	const g = new three.LatheGeometry(pts, fine(seg, 5));
	g.applyMatrix4(new three.Matrix4().makeRotationY(turn));
	g.applyMatrix4(new three.Matrix4().makeScale(flat, 1, 1));
	g.applyMatrix4(new three.Matrix4().makeRotationY(-turn));
	g.applyMatrix4(new three.Matrix4().compose(B, new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), A.clone().sub(B).normalize()), new three.Vector3(1, 1, 1)));
	return g;
}
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
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./rig').Cast} Cast */
/** @typedef {{ a: V3, b: V3, on: [string, string], r: number }} Ram a cylinder: its barrel's pin on the first part, its rod's on the second */
/** @typedef {{ slew?: number, swing?: number, boom?: number, arm?: number, bucket?: number, blade?: number, wheels?: number, root?: V3 }} Joints */
/**
* @typedef {object} Spec an excavator: its joints, its rams, its parts and how it works
* @property {string} name
* @property {Record<'base' | 'house' | 'swing' | 'boom' | 'arm' | 'bucket', V3> & { blade?: V3 }} J where its joints are at rest
* @property {Record<string, Ram>} rams
* @property {{ x: number, y: number, sprocket: number, idler: number, r: number }} wheels the track centres' x, the wheels' axle height, the sprocket's z (back) and the idler's (front), their radius
* @property {() => Piece[]} parts
* @property {{ tucked: Joints, reach: Joints, curled: Joints, lifted: Joints, dump: Joints }} poses
* @property {number} [slew] how far it slews to dump (rad)
* @property {number} [period] a dig cycle (s)
* @property {number} [speed] its travelling speed (m/s)
* @property {THREE.Material[]} [materials] beyond its skin: 1 its glass
*/
const SIDES$2 = [["L", 1], ["R", -1]];
const PAINT$2 = "#f0a90f";
const DARK$2 = "#2b2c2e";
const STEEL$2 = "#8c9094";
const RUBBER$2 = "#1d1e20";
const CHROME$2 = "#d8d8d6";
const SEAT$2 = "#3a3b3d";
/** a box w × h × len from a to b, turned along the line */
/** @param {V3} a @param {V3} b @param {number} w @param {number} h @param {number} [r] */
function beam$2(a, b, w, h, r = .02) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, A.distanceTo(B), 2, Math.min(r, w / 2, h / 2));
	g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 0, 1), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
	return g;
}
/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block$2(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at @param {number} [seg] */
function wheel$2(r, w, at, seg = 18) {
	const g = new three.CylinderGeometry(r, r, w, seg);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}
/** a spoke across a wheel of radius r at x, y, z, turned `a` about x */
/** @param {number} r @param {number} x @param {number} y @param {number} z @param {number} a */
function spoke$2(r, x, y, z, a) {
	const g = new three.BoxGeometry(r * .12, r * 1.8, r * .2);
	g.rotateX(a);
	g.translate(x, y, z);
	return g;
}
/**
* A backhoe's bucket on its pivot: a curled back plate between two side plates, its back to the outside (+z) and its
* mouth and teeth turned towards the machine, the teeth carrying on round the curl from its lip; the ears to its
* ram's pin.
* @param {{ pivot: V3, R: number, w: number, teeth: number, pin: V3, plate?: number }} o
* @returns {Piece[]}
*/
function bucketParts$2({ pivot, R, w, teeth, pin, plate = R * .06 }) {
	const [, py, pz] = pivot;
	const cy = py - R, cz = pz + R * .17;
	/** @type {Piece[]} */
	const out = [];
	/** a point on the curl, φ from up (0) through out (π/2) to down (π) and on round under it @param {number} phi @returns {V3} */
	const at = (phi) => [
		0,
		cy + Math.cos(phi) * R,
		cz + Math.sin(phi) * R
	];
	const n = 10, from = -.15, to = Math.PI + .55;
	for (let i = 0; i < n; i++) out.push({
		geo: beam$2(at(from + (to - from) * i / n), at(from + (to - from) * (i + 1) / n), w, plate, plate * .25),
		color: DARK$2,
		bone: "bucket"
	});
	for (const sx of [-1, 1]) {
		const shape = new three.Shape();
		shape.moveTo(0, 0);
		for (let i = 0; i <= n; i++) {
			const phi = from + (to - from) * i / n;
			shape.lineTo(Math.sin(phi) * R, Math.cos(phi) * R);
		}
		shape.lineTo(0, 0);
		const g = new three.ExtrudeGeometry(shape, {
			depth: plate * .6,
			bevelEnabled: false
		});
		g.rotateY(-Math.PI / 2);
		g.translate(sx * (w / 2) + (sx > 0 ? plate * .6 : 0), cy, cz);
		out.push({
			geo: g,
			color: DARK$2,
			bone: "bucket"
		});
	}
	const lip = at(to), along = new three.Vector3(0, -Math.sin(to), Math.cos(to));
	const aim = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), along);
	for (let k = 0; k < teeth; k++) {
		const x = -w / 2 + w * (k + .5) / teeth;
		const tooth = new three.ConeGeometry(R * .1, R * .38, 6);
		tooth.translate(0, R * .19, 0);
		tooth.applyQuaternion(aim);
		tooth.translate(x, lip[1], lip[2]);
		out.push({
			geo: tooth,
			color: STEEL$2,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam$2([
			sx * w * .22,
			py + R * .12,
			pz - R * .15
		], [
			sx * w * .22,
			pin[1],
			pin[2]
		], R * .12, R * .5, R * .04),
		color: DARK$2,
		bone: "bucket"
	});
	return out;
}
/** The rams: a barrel on one part, a rod on the other, each reaching most of the way to the other pin. */
/** @param {Record<string, Ram>} rams @returns {Piece[]} */
function ramParts(rams) {
	return Object.entries(rams).flatMap(([name, ram]) => {
		const A = new three.Vector3(...ram.a), B = new three.Vector3(...ram.b);
		const len = A.distanceTo(B), dir = B.clone().sub(A).normalize();
		const barrelEnd = A.clone().addScaledVector(dir, len * .62).toArray();
		const rodEnd = B.clone().addScaledVector(dir, -len * .75).toArray();
		return [{
			geo: limb(ram.a, barrelEnd, ram.r, ram.r),
			color: PAINT$2,
			bone: `${name}Barrel`
		}, {
			geo: limb(ram.b, rodEnd, ram.r * .5, ram.r * .5),
			color: CHROME$2,
			bone: `${name}Rod`
		}];
	});
}
/** @param {number} th @param {number} y @param {number} z @returns {[number, number]} */
const rot$2 = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it @param {number} y @param {number} z */
const ang$2 = (y, z) => Math.atan2(z, y);
/**
* How the rams' barrels and rods must turn to stay on their pins, the boom, arm and bucket turned so.
* @param {Spec} spec @param {number} boom @param {number} arm @param {number} bucket @returns {Pose}
*/
function rams$2(spec, boom, arm, bucket) {
	const steps = [
		["boom", boom],
		["arm", arm],
		["bucket", bucket]
	];
	/** a point riding a part, where it is now @param {string} part @param {V3} p @returns {[number, number]} */
	const place = (part, p) => {
		let y = p[1], z = p[2];
		for (let i = steps.findIndex(([n]) => n === part); i >= 0; i--) {
			const [n, th] = steps[i];
			const j = spec.J[n];
			[y, z] = rot$2(th, y - j[1], z - j[2]);
			y += j[1];
			z += j[2];
		}
		return [y, z];
	};
	/** how far a part is turned in all @param {string} part */
	const turned = (part) => part === "boom" ? boom : part === "arm" ? boom + arm : part === "bucket" ? boom + arm + bucket : 0;
	/** @type {Pose} */
	const out = {};
	for (const [name, ram] of Object.entries(spec.rams)) {
		const [on0, on1] = ram.on;
		const a = place(on0, ram.a), b = place(on1, ram.b);
		const now = ang$2(b[0] - a[0], b[1] - a[1]) - ang$2(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
		out[`${name}Barrel`] = [
			now - turned(on0),
			0,
			0
		];
		out[`${name}Rod`] = [
			now - turned(on1),
			0,
			0
		];
	}
	return out;
}
/**
* The machine at its joints' turns — the house slewed and the boom swung (about y), the boom, arm and bucket (about
* x), the blade, the wheels — and the rams following.
* @param {Spec} spec @param {Joints} j @returns {Pose}
*/
function machine$2(spec, { slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
	/** @type {Pose} */
	const p = {
		house: [
			0,
			slew,
			0
		],
		swing: [
			0,
			swing,
			0
		],
		boom: [
			boom,
			0,
			0
		],
		arm: [
			arm,
			0,
			0
		],
		bucket: [
			bucket,
			0,
			0
		],
		...rams$2(spec, boom, arm, bucket)
	};
	if (spec.J.blade) p.blade = [
		blade,
		0,
		0
	];
	for (const [s] of SIDES$2) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 @param {number} x */
const ease$2 = (x) => x * x * (3 - 2 * x);
/** Between key poses (each at its time in the cycle, 0…1), eased. @param {[number, Joints][]} keys @param {number} u @returns {Joints} */
function through$2(keys, u) {
	let i = 0;
	while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
	const [t0, a] = keys[i], [t1, b] = keys[i + 1];
	const k = ease$2(Math.min(1, Math.max(0, (u - t0) / (t1 - t0))));
	/** @type {Record<string, number>} */
	const mix = {};
	for (const name of [
		"slew",
		"swing",
		"boom",
		"arm",
		"bucket",
		"blade"
	]) mix[name] = (a[name] ?? 0) + ((b[name] ?? 0) - (a[name] ?? 0)) * k;
	return mix;
}
/** Build an excavator from its spec: its skeleton, its skin, its moves. @param {Spec} spec @returns {Cast} */
function excavatorCast(spec) {
	const { J, wheels: w } = spec;
	/** @type {import('./rig').BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: J.base
		},
		...J.blade ? [{
			name: "blade",
			parent: "base",
			at: J.blade
		}] : [],
		...SIDES$2.flatMap(([s, x]) => [{
			name: `sprocket${s}`,
			parent: "base",
			at: [
				x * w.x,
				w.y,
				w.sprocket
			]
		}, {
			name: `idler${s}`,
			parent: "base",
			at: [
				x * w.x,
				w.y,
				w.idler
			]
		}]),
		{
			name: "house",
			parent: "base",
			at: J.house
		},
		{
			name: "swing",
			parent: "house",
			at: J.swing
		},
		{
			name: "boom",
			parent: "swing",
			at: J.boom
		},
		{
			name: "arm",
			parent: "boom",
			at: J.arm
		},
		{
			name: "bucket",
			parent: "arm",
			at: J.bucket
		},
		...Object.entries(spec.rams).flatMap(([name, ram]) => [{
			name: `${name}Barrel`,
			parent: ram.on[0],
			at: ram.a
		}, {
			name: `${name}Rod`,
			parent: ram.on[1],
			at: ram.b
		}])
	];
	const r = rig(bones, spec.parts(), [skin(.5, { side: three.DoubleSide }), ...spec.materials ?? []]);
	r.object.name = spec.name;
	const { tucked, reach, curled, lifted, dump } = spec.poses;
	const slew = spec.slew ?? 1.4, period = spec.period ?? 9, speed = spec.speed ?? .6;
	/** @param {Joints} j */
	const m = (j) => machine$2(spec, j);
	/** @type {Record<string, import('./rig').Clip>} */
	const clips = {
		dig: (t) => m(through$2([
			[0, lifted],
			[.14, reach],
			[.3, curled],
			[.42, lifted],
			[.58, {
				...lifted,
				slew
			}],
			[.7, {
				...dump,
				slew
			}],
			[.82, {
				...lifted,
				slew
			}],
			[1, lifted]
		], loop(t, period))),
		drive: (t) => m({
			...tucked,
			wheels: -t * speed / w.r,
			root: [
				0,
				Math.sin(t * 9) * w.r * .02,
				0
			]
		}),
		idle: (t) => m({
			...lifted,
			root: [
				0,
				Math.sin(t * 40) * .002,
				0
			]
		})
	};
	if (J.blade) clips.doze = (t) => {
		const u = loop(t, 6);
		const dist = 1.2 * (u < .5 ? ease$2(u * 2) : ease$2(2 - u * 2));
		const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease$2((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease$2((u - .95) * 20);
		return m({
			...tucked,
			blade,
			wheels: -dist / w.r,
			root: [
				0,
				0,
				dist
			]
		});
	};
	return {
		rig: r,
		clips,
		poses: {
			tucked: m(tucked),
			reaching: m(reach),
			curled: m(curled),
			rest: m({})
		},
		first: "dig"
	};
}

//#endregion
//#region src/lib/actors/excavator.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./excavator-rig.js').Spec} Spec */
const J$2 = {
	base: [
		0,
		.3,
		0
	],
	blade: [
		0,
		.32,
		.62
	],
	house: [
		0,
		.48,
		0
	],
	swing: [
		0,
		.68,
		.62
	],
	boom: [
		0,
		.78,
		.74
	],
	arm: [
		0,
		2.05,
		1.72
	],
	bucket: [
		0,
		1.02,
		2.18
	]
};
/** the cylinders' pins: barrel end (on the first part) and rod end (on the second) */
/** @type {Record<string, import('./excavator-rig.js').Ram>} */
const RAMS$2 = {
	boomRam: {
		a: [
			0,
			.6,
			.82
		],
		b: [
			0,
			1.45,
			1.12
		],
		on: ["swing", "boom"],
		r: .05
	},
	armRam: {
		a: [
			0,
			1.75,
			1.05
		],
		b: [
			0,
			2.32,
			1.78
		],
		on: ["boom", "arm"],
		r: .045
	},
	bucketRam: {
		a: [
			0,
			2.05,
			1.86
		],
		b: [
			0,
			1.18,
			2.36
		],
		on: ["arm", "bucket"],
		r: .04
	}
};
const TRACK_X$2 = .37;
const TRACK_W$2 = .25;
const TRACK_L$2 = 1.55;
const WHEEL$2 = .17;
/** Every part, riding its joint. */
/** @returns {Piece[]} */
function parts$2() {
	/** @type {Piece[]} */
	const out = [];
	/** @param {THREE.BufferGeometry} geo @param {string} color @param {string} bone */
	const add = (geo, color, bone) => out.push({
		geo,
		color,
		bone
	});
	add(block$2(.5, .2, 1.1, [
		0,
		.3,
		0
	]), DARK$2, "base");
	add(new three.CylinderGeometry(.42, .42, .08, 28).translate(0, .44, 0), DARK$2, "base");
	for (const [s, x] of SIDES$2) {
		const tx = x * TRACK_X$2;
		add(block$2(TRACK_W$2 * .6, .14, 1.15, [
			tx,
			.2,
			0
		]), DARK$2, "base");
		add(block$2(TRACK_W$2, .05, TRACK_L$2 - 2 * WHEEL$2, [
			tx,
			.34500000000000003,
			0
		]), RUBBER$2, "base");
		add(block$2(TRACK_W$2, .05, TRACK_L$2 - 2 * WHEEL$2, [
			tx,
			.025,
			0
		]), RUBBER$2, "base");
		for (const ez of [-1, 1]) {
			const g = new three.CylinderGeometry(.2, .2, TRACK_W$2, 20, 1, true, ez > 0 ? 0 : Math.PI, Math.PI);
			g.rotateZ(Math.PI / 2);
			g.translate(tx, .17500000000000002, ez * (TRACK_L$2 / 2 - WHEEL$2));
			add(g, RUBBER$2, "base");
		}
		for (let i = 0; i < 10; i++) {
			const z = -.575 + i * ((TRACK_L$2 - 2 * WHEEL$2 - .06) / 9);
			add(block$2(TRACK_W$2, .025, .04, [
				tx,
				0,
				z
			], .005), RUBBER$2, "base");
			add(block$2(TRACK_W$2, .025, .04, [
				tx,
				.375,
				z
			], .005), RUBBER$2, "base");
		}
		for (const [w, ez] of [["sprocket", -1], ["idler", 1]]) {
			const z = ez * (TRACK_L$2 / 2 - WHEEL$2);
			add(wheel$2(.16, TRACK_W$2 * .7, [
				tx,
				.17500000000000002,
				z
			]), STEEL$2, `${w}${s}`);
			for (let k = 0; k < 3; k++) {
				const a = k * Math.PI / 3;
				add(spoke$2(.15000000000000002, tx + x * TRACK_W$2 * .36, .17500000000000002, z, a), DARK$2, `${w}${s}`);
			}
		}
		for (const z of [
			-.3,
			0,
			.3
		]) add(wheel$2(.06, TRACK_W$2 * .5, [
			tx,
			.09,
			z
		]), STEEL$2, "base");
	}
	add(block$2(.99, .3, .05, [
		0,
		.2,
		.98
	], .01), PAINT$2, "blade");
	add(block$2(.99, .02, .06, [
		0,
		.05,
		1
	], .005), STEEL$2, "blade");
	for (const sx of [-1, 1]) add(beam$2([
		sx * .2,
		.32,
		.62
	], [
		sx * .25,
		.25,
		.96
	], .07, .1), PAINT$2, "blade");
	add(limb([
		0,
		.38,
		.58
	], [
		0,
		.3,
		.9
	], .035, .03), CHROME$2, "blade");
	add(block$2(1, .1, 1.15, [
		0,
		.55,
		-.05
	]), DARK$2, "house");
	add(block$2(.98, .5, .55, [
		0,
		.85,
		-.33
	], .08), PAINT$2, "house");
	const cw = new three.CylinderGeometry(.62, .62, .42, 32, 1, false, Math.PI * .72, Math.PI * .56);
	cw.translate(0, .81, -.05);
	add(cw, DARK$2, "house");
	add(block$2(.9, .06, .6, [
		0,
		.62,
		.3
	]), DARK$2, "house");
	add(block$2(.48, .1, .45, [
		.05,
		.98,
		.05
	], .04), SEAT$2, "house");
	add(block$2(.48, .5, .1, [
		.05,
		1.25,
		-.16
	], .05), SEAT$2, "house");
	for (const sx of [-1, 1]) {
		add(block$2(.12, .25, .35, [
			.05 + sx * .3,
			.85,
			.18
		], .03), DARK$2, "house");
		add(limb([
			.05 + sx * .3,
			.97,
			.25
		], [
			.05 + sx * .3,
			1.15,
			.28
		], .012, .012), DARK$2, "house");
		add(new three.SphereGeometry(.03, 10, 8).translate(.05 + sx * .3, 1.17, .28), DARK$2, "house");
	}
	for (const [px, pz] of [
		[-.42, -.5],
		[.42, -.5],
		[-.42, .42],
		[.42, .42]
	]) add(limb([
		px,
		.6,
		pz
	], [
		px,
		2.25,
		pz
	], .03, .03), DARK$2, "house");
	add(block$2(.98, .06, 1.05, [
		0,
		2.28,
		-.04
	], .03), DARK$2, "house");
	add(limb([
		.36,
		1.05,
		-.62
	], [
		.36,
		1.35,
		-.62
	], .025, .02), DARK$2, "house");
	add(block$2(.04, .04, .02, [
		-.36,
		2.22,
		.45
	], .01), "#ffd27a", "house");
	add(block$2(.34, .36, .3, [
		0,
		.72,
		.62
	], .03), PAINT$2, "swing");
	add(beam$2([
		0,
		.6,
		.62
	], [
		0,
		.6,
		.85
	], .2, .12), DARK$2, "swing");
	const knee = [
		0,
		1.85,
		1.25
	];
	add(beam$2(J$2.boom, knee, .2, .26), PAINT$2, "boom");
	add(beam$2(knee, J$2.arm, .2, .22), PAINT$2, "boom");
	add(beam$2([
		0,
		1.65,
		1
	], RAMS$2.armRam.a, .12, .12), PAINT$2, "boom");
	add(wheel$2(.07, .26, J$2.arm), STEEL$2, "boom");
	add(beam$2([
		0,
		2.35,
		1.65
	], J$2.bucket, .16, .2), PAINT$2, "arm");
	add(beam$2(J$2.arm, RAMS$2.armRam.b, .16, .12), PAINT$2, "arm");
	add(wheel$2(.06, .24, J$2.bucket), STEEL$2, "arm");
	add(beam$2([
		0,
		2.3,
		1.72
	], RAMS$2.bucketRam.a, .1, .1), PAINT$2, "arm");
	out.push(...bucketParts$2({
		pivot: J$2.bucket,
		R: .24,
		w: .4,
		teeth: 4,
		pin: RAMS$2.bucketRam.b,
		plate: .025
	}));
	out.push(...ramParts(RAMS$2));
	return out;
}
/** @type {Spec} */
const MINI = {
	name: "mini excavator",
	J: J$2,
	rams: RAMS$2,
	wheels: {
		x: TRACK_X$2,
		y: .17500000000000002,
		sprocket: -.605,
		idler: TRACK_L$2 / 2 - WHEEL$2,
		r: WHEEL$2
	},
	parts: parts$2,
	poses: {
		tucked: {
			boom: -.35,
			arm: -.55,
			bucket: -1.2,
			blade: -.25
		},
		reach: {
			boom: .55,
			arm: .6,
			bucket: -1.6,
			blade: .08
		},
		curled: {
			boom: .62,
			arm: -.35,
			bucket: .55,
			blade: .08
		},
		lifted: {
			boom: -.2,
			arm: -.4,
			bucket: .6,
			blade: .08
		},
		dump: {
			boom: -.2,
			arm: .1,
			bucket: -1.4,
			blade: .08
		}
	},
	slew: 1.4,
	period: 9,
	speed: .55
};
/** Build the mini excavator and its moves: dig, drive, doze, idle. */
const miniExcavator = () => excavatorCast(MINI);

//#endregion
//#region src/lib/actors/excavator.v1.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./rig').Cast} Cast */
const PAINT$1 = "#f0a90f";
const DARK$1 = "#2b2c2e";
const STEEL$1 = "#8c9094";
const RUBBER$1 = "#1d1e20";
const CHROME$1 = "#d8d8d6";
const SEAT$1 = "#3a3b3d";
/** @type {Record<string, V3>} */
const J$1 = {
	base: [
		0,
		.3,
		0
	],
	blade: [
		0,
		.32,
		.62
	],
	house: [
		0,
		.48,
		0
	],
	swing: [
		0,
		.68,
		.62
	],
	boom: [
		0,
		.78,
		.74
	],
	arm: [
		0,
		2.05,
		1.72
	],
	bucket: [
		0,
		1.02,
		2.18
	]
};
/** the cylinders' pins: barrel end (on the first part) and rod end (on the second) */
/** @type {Record<string, { a: V3, b: V3, on: [string, string], r: number }>} */
const RAMS$1 = {
	boomRam: {
		a: [
			0,
			.6,
			.82
		],
		b: [
			0,
			1.45,
			1.12
		],
		on: ["swing", "boom"],
		r: .05
	},
	armRam: {
		a: [
			0,
			1.75,
			1.05
		],
		b: [
			0,
			2.32,
			1.78
		],
		on: ["boom", "arm"],
		r: .045
	},
	bucketRam: {
		a: [
			0,
			2.05,
			1.86
		],
		b: [
			0,
			1.18,
			2.36
		],
		on: ["arm", "bucket"],
		r: .04
	}
};
const SIDES$1 = [["L", 1], ["R", -1]];
const TRACK_X$1 = .37;
const TRACK_W$1 = .25;
const TRACK_L$1 = 1.55;
const WHEEL$1 = .17;
/** a box w × h × len from a to b (len its length), its other sides across, turned along the line */
/** @param {V3} a @param {V3} b @param {number} w @param {number} h @param {number} [r] */
function beam$1(a, b, w, h, r = .02) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, A.distanceTo(B), 2, r);
	g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 0, 1), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
	return g;
}
/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block$1(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at */
function wheel$1(r, w, at) {
	const g = new three.CylinderGeometry(r, r, w, 18);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}
/** The bucket: a curled back plate between two side plates, four teeth along its lip, its pins at the top. */
/** @returns {Piece[]} */
function bucketParts$1() {
	const [, py, pz] = J$1.bucket;
	const cy = py - .24, cz = pz + .04, R = .24, w = .4;
	/** @type {Piece[]} */
	const out = [];
	/** a point on the curl, φ from up (0) through back (−π/2) to down (−π) @param {number} phi @param {number} [r] @returns {V3} */
	const at = (phi, r = R) => [
		0,
		cy + Math.cos(phi) * r,
		cz + Math.sin(phi) * r
	];
	const n = 9, from = .15, to = -Math.PI - .55;
	for (let i = 0; i < n; i++) {
		const p0 = at(from + (to - from) * i / n), p1 = at(from + (to - from) * (i + 1) / n);
		out.push({
			geo: beam$1(p0, p1, w, .025, .006),
			color: DARK$1,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) {
		const shape = new three.Shape();
		shape.moveTo(0, 0);
		for (let i = 0; i <= n; i++) {
			const phi = from + (to - from) * i / n;
			shape.lineTo(Math.sin(phi) * R, Math.cos(phi) * R);
		}
		shape.lineTo(0, 0);
		const g = new three.ExtrudeGeometry(shape, {
			depth: .015,
			bevelEnabled: false
		});
		g.rotateY(-Math.PI / 2);
		g.translate(sx * (w / 2) + (sx > 0 ? .015 : 0), cy, cz);
		out.push({
			geo: g,
			color: DARK$1,
			bone: "bucket"
		});
	}
	const lip = at(to);
	for (let k = 0; k < 4; k++) {
		const x = -.15 + k * .1;
		const tooth = new three.ConeGeometry(.025, .09, 6);
		tooth.applyMatrix4(new three.Matrix4().makeRotationX(-Math.PI / 2 - .35));
		tooth.translate(x, lip[1] - .01, lip[2] + .035);
		out.push({
			geo: tooth,
			color: STEEL$1,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam$1([
			sx * .09,
			py + .03,
			pz - .04
		], [
			sx * .09,
			RAMS$1.bucketRam.b[1],
			RAMS$1.bucketRam.b[2]
		], .03, .12, .01),
		color: DARK$1,
		bone: "bucket"
	});
	return out;
}
/** Every part, riding its joint. */
/** @returns {Piece[]} */
function parts$1() {
	/** @type {Piece[]} */
	const out = [];
	/** @param {THREE.BufferGeometry} geo @param {string} color @param {string} bone */
	const add = (geo, color, bone) => out.push({
		geo,
		color,
		bone
	});
	add(block$1(.5, .2, 1.1, [
		0,
		.3,
		0
	]), DARK$1, "base");
	add(new three.CylinderGeometry(.42, .42, .08, 28).translate(0, .44, 0), DARK$1, "base");
	for (const [s, x] of SIDES$1) {
		const tx = x * TRACK_X$1;
		add(block$1(TRACK_W$1 * .6, .14, 1.15, [
			tx,
			.2,
			0
		]), DARK$1, "base");
		add(block$1(TRACK_W$1, .05, TRACK_L$1 - 2 * WHEEL$1, [
			tx,
			.34500000000000003,
			0
		]), RUBBER$1, "base");
		add(block$1(TRACK_W$1, .05, TRACK_L$1 - 2 * WHEEL$1, [
			tx,
			.025,
			0
		]), RUBBER$1, "base");
		for (const ez of [-1, 1]) {
			const g = new three.CylinderGeometry(.2, .2, TRACK_W$1, 20, 1, true, ez > 0 ? 0 : Math.PI, Math.PI);
			g.rotateZ(Math.PI / 2);
			g.translate(tx, .17500000000000002, ez * (TRACK_L$1 / 2 - WHEEL$1));
			add(g, RUBBER$1, "base");
		}
		for (let i = 0; i < 10; i++) {
			const z = -.575 + i * ((TRACK_L$1 - 2 * WHEEL$1 - .06) / 9);
			add(block$1(TRACK_W$1, .025, .04, [
				tx,
				0,
				z
			], .005), RUBBER$1, "base");
			add(block$1(TRACK_W$1, .025, .04, [
				tx,
				.375,
				z
			], .005), RUBBER$1, "base");
		}
		for (const [w, ez] of [["sprocket", -1], ["idler", 1]]) {
			const z = ez * (TRACK_L$1 / 2 - WHEEL$1);
			add(wheel$1(.16, TRACK_W$1 * .7, [
				tx,
				.17500000000000002,
				z
			]), STEEL$1, `${w}${s}`);
			for (let k = 0; k < 3; k++) {
				const a = k * Math.PI / 3;
				add(spoke$1(tx + x * TRACK_W$1 * .36, .17500000000000002, z, a), DARK$1, `${w}${s}`);
			}
		}
		for (const z of [
			-.3,
			0,
			.3
		]) add(wheel$1(.06, TRACK_W$1 * .5, [
			tx,
			.09,
			z
		]), STEEL$1, "base");
	}
	add(block$1(.99, .3, .05, [
		0,
		.2,
		.98
	], .01), PAINT$1, "blade");
	add(block$1(.99, .02, .06, [
		0,
		.05,
		1
	], .005), STEEL$1, "blade");
	for (const sx of [-1, 1]) add(beam$1([
		sx * .2,
		.32,
		.62
	], [
		sx * .25,
		.25,
		.96
	], .07, .1), PAINT$1, "blade");
	add(limb([
		0,
		.38,
		.58
	], [
		0,
		.3,
		.9
	], .035, .03), CHROME$1, "blade");
	add(block$1(1, .1, 1.15, [
		0,
		.55,
		-.05
	]), DARK$1, "house");
	add(block$1(.98, .5, .55, [
		0,
		.85,
		-.33
	], .08), PAINT$1, "house");
	const cw = new three.CylinderGeometry(.62, .62, .42, 32, 1, false, Math.PI * .72, Math.PI * .56);
	cw.translate(0, .81, -.05);
	add(cw, DARK$1, "house");
	add(block$1(.9, .06, .6, [
		0,
		.62,
		.3
	]), DARK$1, "house");
	add(block$1(.48, .1, .45, [
		.05,
		.98,
		.05
	], .04), SEAT$1, "house");
	add(block$1(.48, .5, .1, [
		.05,
		1.25,
		-.16
	], .05), SEAT$1, "house");
	for (const sx of [-1, 1]) {
		add(block$1(.12, .25, .35, [
			.05 + sx * .3,
			.85,
			.18
		], .03), DARK$1, "house");
		add(limb([
			.05 + sx * .3,
			.97,
			.25
		], [
			.05 + sx * .3,
			1.15,
			.28
		], .012, .012), DARK$1, "house");
		add(new three.SphereGeometry(.03, 10, 8).translate(.05 + sx * .3, 1.17, .28), DARK$1, "house");
	}
	for (const [px, pz] of [
		[-.42, -.5],
		[.42, -.5],
		[-.42, .42],
		[.42, .42]
	]) add(limb([
		px,
		.6,
		pz
	], [
		px,
		2.25,
		pz
	], .03, .03), DARK$1, "house");
	add(block$1(.98, .06, 1.05, [
		0,
		2.28,
		-.04
	], .03), DARK$1, "house");
	add(limb([
		.36,
		1.05,
		-.62
	], [
		.36,
		1.35,
		-.62
	], .025, .02), DARK$1, "house");
	add(block$1(.04, .04, .02, [
		-.36,
		2.22,
		.45
	], .01), "#ffd27a", "house");
	add(block$1(.34, .36, .3, [
		0,
		.72,
		.62
	], .03), PAINT$1, "swing");
	add(beam$1([
		0,
		.6,
		.62
	], [
		0,
		.6,
		.85
	], .2, .12), DARK$1, "swing");
	const knee = [
		0,
		1.85,
		1.25
	];
	add(beam$1(J$1.boom, knee, .2, .26), PAINT$1, "boom");
	add(beam$1(knee, J$1.arm, .2, .22), PAINT$1, "boom");
	add(beam$1([
		0,
		1.65,
		1
	], RAMS$1.armRam.a, .12, .12), PAINT$1, "boom");
	add(wheel$1(.07, .26, J$1.arm), STEEL$1, "boom");
	add(beam$1([
		0,
		2.35,
		1.65
	], J$1.bucket, .16, .2), PAINT$1, "arm");
	add(beam$1(J$1.arm, RAMS$1.armRam.b, .16, .12), PAINT$1, "arm");
	add(wheel$1(.06, .24, J$1.bucket), STEEL$1, "arm");
	add(beam$1([
		0,
		2.3,
		1.72
	], RAMS$1.bucketRam.a, .1, .1), PAINT$1, "arm");
	out.push(...bucketParts$1());
	for (const [name, ram] of Object.entries(RAMS$1)) {
		const A = new three.Vector3(...ram.a), B = new three.Vector3(...ram.b);
		const len = A.distanceTo(B);
		const dir = B.clone().sub(A).normalize();
		const barrelEnd = A.clone().addScaledVector(dir, len * .62);
		const rodEnd = B.clone().addScaledVector(dir, -len * .75);
		add(limb(ram.a, barrelEnd.toArray(), ram.r, ram.r), PAINT$1, `${name}Barrel`);
		add(limb(ram.b, rodEnd.toArray(), ram.r * .5, ram.r * .5), CHROME$1, `${name}Rod`);
	}
	return out;
}
/** a spoke across a wheel at x, y, z, turned `a` about x */
/** @param {number} x @param {number} y @param {number} z @param {number} a */
function spoke$1(x, y, z, a) {
	const g = new three.BoxGeometry(.02, .30000000000000004, .035);
	g.rotateX(a);
	g.translate(x, y, z);
	return g;
}
/** @param {number} th @param {number} y @param {number} z @returns {[number, number]} */
const rot$1 = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it */
/** @param {number} y @param {number} z */
const ang$1 = (y, z) => Math.atan2(z, y);
/**
* Where the arm's points are with the boom, arm and bucket turned so (in the swing bracket's frame), and how the
* rams' barrels and rods must turn to stay on their pins.
* @param {number} boom @param {number} arm @param {number} bucket
* @returns {Pose}
*/
function rams$1(boom, arm, bucket) {
	/** a point riding a part, where it is now @param {string} part @param {V3} p @returns {[number, number]} */
	const place = (part, p) => {
		if (part === "swing") return [p[1], p[2]];
		const steps = [
			["boom", boom],
			["arm", arm],
			["bucket", bucket]
		];
		let y = p[1], z = p[2];
		const upTo = steps.findIndex(([n]) => n === part);
		for (let i = upTo; i >= 0; i--) {
			const [n] = steps[i];
			const j = J$1[n];
			const total = steps[i][1];
			[y, z] = rot$1(total, y - j[1], z - j[2]);
			y += j[1];
			z += j[2];
		}
		return [y, z];
	};
	/** how far a part is turned in all (its parents' turns and its own) @param {string} part */
	const turned = (part) => part === "swing" ? 0 : part === "boom" ? boom : part === "arm" ? boom + arm : boom + arm + bucket;
	/** @type {Pose} */
	const out = {};
	for (const [name, ram] of Object.entries(RAMS$1)) {
		const [on0, on1] = ram.on;
		const a = place(on0, ram.a), b = place(on1, ram.b);
		const rest = ang$1(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
		const now = ang$1(b[0] - a[0], b[1] - a[1]);
		out[`${name}Barrel`] = [
			now - rest - turned(on0),
			0,
			0
		];
		out[`${name}Rod`] = [
			now - rest - turned(on1),
			0,
			0
		];
	}
	return out;
}
/**
* The machine at its joints' turns: how far the house is slewed and the boom swung (about y), the boom, arm and
* bucket (about x), the blade, how far the wheels have turned; the rams follow.
* @param {{ slew?: number, swing?: number, boom?: number, arm?: number, bucket?: number, blade?: number, wheels?: number, root?: V3 }} s
* @returns {Pose}
*/
function machine$1({ slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
	/** @type {Pose} */
	const p = {
		house: [
			0,
			slew,
			0
		],
		swing: [
			0,
			swing,
			0
		],
		boom: [
			boom,
			0,
			0
		],
		arm: [
			arm,
			0,
			0
		],
		bucket: [
			bucket,
			0,
			0
		],
		blade: [
			blade,
			0,
			0
		],
		...rams$1(boom, arm, bucket)
	};
	for (const [s] of SIDES$1) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 */
/** @param {number} x */
const ease$1 = (x) => x * x * (3 - 2 * x);
/**
* Between key poses (each at its time in the cycle, 0…1), eased.
* @param {[number, Parameters<typeof machine>[0]][]} keys @param {number} u
*/
function through$1(keys, u) {
	let i = 0;
	while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
	const [t0, a] = keys[i], [t1, b] = keys[i + 1];
	const k = ease$1(Math.min(1, Math.max(0, (u - t0) / (t1 - t0))));
	/** @type {Record<string, number>} */
	const mix = {};
	for (const name of [
		"slew",
		"swing",
		"boom",
		"arm",
		"bucket",
		"blade"
	]) {
		const x = a[name] ?? 0;
		mix[name] = x + ((b[name] ?? 0) - x) * k;
	}
	return mix;
}
const TUCKED$1 = {
	boom: -.35,
	arm: -.55,
	bucket: -1.2,
	blade: -.25
};
const REACH$1 = {
	boom: .55,
	arm: .6,
	bucket: -1.6,
	blade: .08
};
const CURLED$1 = {
	boom: .62,
	arm: -.35,
	bucket: .55,
	blade: .08
};
const LIFTED$1 = {
	boom: -.2,
	arm: -.4,
	bucket: .6,
	blade: .08
};
/** Build the mini excavator and its moves. @returns {Cast} */
function excavator$1() {
	/** @type {import('./rig').BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: J$1.base
		},
		{
			name: "blade",
			parent: "base",
			at: J$1.blade
		},
		...SIDES$1.flatMap(([s, x]) => [{
			name: `sprocket${s}`,
			parent: "base",
			at: [
				x * TRACK_X$1,
				.17500000000000002,
				-.605
			]
		}, {
			name: `idler${s}`,
			parent: "base",
			at: [
				x * TRACK_X$1,
				.17500000000000002,
				TRACK_L$1 / 2 - WHEEL$1
			]
		}]),
		{
			name: "house",
			parent: "base",
			at: J$1.house
		},
		{
			name: "swing",
			parent: "house",
			at: J$1.swing
		},
		{
			name: "boom",
			parent: "swing",
			at: J$1.boom
		},
		{
			name: "arm",
			parent: "boom",
			at: J$1.arm
		},
		{
			name: "bucket",
			parent: "arm",
			at: J$1.bucket
		},
		...Object.entries(RAMS$1).flatMap(([name, ram]) => [{
			name: `${name}Barrel`,
			parent: ram.on[0],
			at: ram.a
		}, {
			name: `${name}Rod`,
			parent: ram.on[1],
			at: ram.b
		}])
	];
	const r = rig(bones, parts$1(), [skin(.5, { side: three.DoubleSide })]);
	r.object.name = "mini excavator";
	return {
		rig: r,
		clips: {
			dig: (t) => {
				const u = loop(t, 9);
				return machine$1(through$1([
					[0, { ...LIFTED$1 }],
					[.14, { ...REACH$1 }],
					[.3, { ...CURLED$1 }],
					[.42, { ...LIFTED$1 }],
					[.58, {
						...LIFTED$1,
						slew: 1.4
					}],
					[.7, {
						...LIFTED$1,
						slew: 1.4,
						bucket: -1.4,
						arm: .1
					}],
					[.82, {
						...LIFTED$1,
						slew: 1.4
					}],
					[1, { ...LIFTED$1 }]
				], u));
			},
			drive: (t) => machine$1({
				...TUCKED$1,
				wheels: -t * 3.2,
				root: [
					0,
					Math.sin(t * 9) * .004,
					0
				]
			}),
			doze: (t) => {
				const u = loop(t, 6);
				const dist = 1.2 * (u < .5 ? ease$1(u * 2) : ease$1(2 - u * 2));
				const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease$1((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease$1((u - .95) * 20);
				return machine$1({
					...TUCKED$1,
					blade,
					wheels: -dist / WHEEL$1,
					root: [
						0,
						0,
						dist
					]
				});
			},
			idle: (t) => machine$1({
				...LIFTED$1,
				root: [
					0,
					Math.sin(t * 40) * .002,
					0
				]
			})
		},
		poses: {
			tucked: machine$1(TUCKED$1),
			reaching: machine$1(REACH$1),
			curled: machine$1(CURLED$1),
			rest: machine$1({})
		},
		first: "dig"
	};
}

//#endregion
//#region src/lib/actors/excavator.v2.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./rig').Cast} Cast */
const PAINT = "#f0a90f";
const DARK = "#2b2c2e";
const STEEL = "#8c9094";
const RUBBER = "#1d1e20";
const CHROME = "#d8d8d6";
const SEAT = "#3a3b3d";
/** @type {Record<string, V3>} */
const J = {
	base: [
		0,
		.3,
		0
	],
	blade: [
		0,
		.32,
		.62
	],
	house: [
		0,
		.48,
		0
	],
	swing: [
		0,
		.68,
		.62
	],
	boom: [
		0,
		.78,
		.74
	],
	arm: [
		0,
		2.05,
		1.72
	],
	bucket: [
		0,
		1.02,
		2.18
	]
};
/** the cylinders' pins: barrel end (on the first part) and rod end (on the second) */
/** @type {Record<string, { a: V3, b: V3, on: [string, string], r: number }>} */
const RAMS = {
	boomRam: {
		a: [
			0,
			.6,
			.82
		],
		b: [
			0,
			1.45,
			1.12
		],
		on: ["swing", "boom"],
		r: .05
	},
	armRam: {
		a: [
			0,
			1.75,
			1.05
		],
		b: [
			0,
			2.32,
			1.78
		],
		on: ["boom", "arm"],
		r: .045
	},
	bucketRam: {
		a: [
			0,
			2.05,
			1.86
		],
		b: [
			0,
			1.18,
			2.36
		],
		on: ["arm", "bucket"],
		r: .04
	}
};
const SIDES = [["L", 1], ["R", -1]];
const TRACK_X = .37;
const TRACK_W = .25;
const TRACK_L = 1.55;
const WHEEL = .17;
/** how much bigger than the mini it is built as: twice, every measure */
const SCALE = 2;
/** a box w × h × len from a to b (len its length), its other sides across, turned along the line */
/** @param {V3} a @param {V3} b @param {number} w @param {number} h @param {number} [r] */
function beam(a, b, w, h, r = .02) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, A.distanceTo(B), 2, r);
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
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at */
function wheel(r, w, at) {
	const g = new three.CylinderGeometry(r, r, w, 18);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}
/** The bucket: a curled back plate between two side plates, four teeth along its lip, its pins at the top. */
/** @returns {Piece[]} */
function bucketParts() {
	const [, py, pz] = J.bucket;
	const cy = py - .24, cz = pz + .04, R = .24, w = .4;
	/** @type {Piece[]} */
	const out = [];
	/** a point on the curl, φ from up (0) through out (π/2, away from the cab) to down (π) and on round under it: a
	*  backhoe's bucket, its back to the outside and its mouth and teeth towards the machine @param {number} phi
	*  @param {number} [r] @returns {V3} */
	const at = (phi, r = R) => [
		0,
		cy + Math.cos(phi) * r,
		cz + Math.sin(phi) * r
	];
	const n = 9, from = -.15, to = Math.PI + .55;
	for (let i = 0; i < n; i++) {
		const p0 = at(from + (to - from) * i / n), p1 = at(from + (to - from) * (i + 1) / n);
		out.push({
			geo: beam(p0, p1, w, .025, .006),
			color: DARK,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) {
		const shape = new three.Shape();
		shape.moveTo(0, 0);
		for (let i = 0; i <= n; i++) {
			const phi = from + (to - from) * i / n;
			shape.lineTo(Math.sin(phi) * R, Math.cos(phi) * R);
		}
		shape.lineTo(0, 0);
		const g = new three.ExtrudeGeometry(shape, {
			depth: .015,
			bevelEnabled: false
		});
		g.rotateY(-Math.PI / 2);
		g.translate(sx * (w / 2) + (sx > 0 ? .015 : 0), cy, cz);
		out.push({
			geo: g,
			color: DARK,
			bone: "bucket"
		});
	}
	const lip = at(to), along = new three.Vector3(0, -Math.sin(to), Math.cos(to));
	const aim = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), along);
	for (let k = 0; k < 4; k++) {
		const x = -.15 + k * .1;
		const tooth = new three.ConeGeometry(.025, .09, 6);
		tooth.translate(0, .045, 0);
		tooth.applyQuaternion(aim);
		tooth.translate(x, lip[1], lip[2]);
		out.push({
			geo: tooth,
			color: STEEL,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam([
			sx * .09,
			py + .03,
			pz - .04
		], [
			sx * .09,
			RAMS.bucketRam.b[1],
			RAMS.bucketRam.b[2]
		], .03, .12, .01),
		color: DARK,
		bone: "bucket"
	});
	return out;
}
/** Every part, riding its joint. */
/** @returns {Piece[]} */
function parts() {
	/** @type {Piece[]} */
	const out = [];
	/** @param {THREE.BufferGeometry} geo @param {string} color @param {string} bone */
	const add = (geo, color, bone) => out.push({
		geo,
		color,
		bone
	});
	add(block(.5, .2, 1.1, [
		0,
		.3,
		0
	]), DARK, "base");
	add(new three.CylinderGeometry(.42, .42, .08, 28).translate(0, .44, 0), DARK, "base");
	for (const [s, x] of SIDES) {
		const tx = x * TRACK_X;
		add(block(TRACK_W * .6, .14, 1.15, [
			tx,
			.2,
			0
		]), DARK, "base");
		add(block(TRACK_W, .05, TRACK_L - 2 * WHEEL, [
			tx,
			.34500000000000003,
			0
		]), RUBBER, "base");
		add(block(TRACK_W, .05, TRACK_L - 2 * WHEEL, [
			tx,
			.025,
			0
		]), RUBBER, "base");
		for (const ez of [-1, 1]) {
			const g = new three.CylinderGeometry(.2, .2, TRACK_W, 20, 1, true, ez > 0 ? 0 : Math.PI, Math.PI);
			g.rotateZ(Math.PI / 2);
			g.translate(tx, .17500000000000002, ez * (TRACK_L / 2 - WHEEL));
			add(g, RUBBER, "base");
		}
		for (let i = 0; i < 10; i++) {
			const z = -.575 + i * ((TRACK_L - 2 * WHEEL - .06) / 9);
			add(block(TRACK_W, .025, .04, [
				tx,
				0,
				z
			], .005), RUBBER, "base");
			add(block(TRACK_W, .025, .04, [
				tx,
				.375,
				z
			], .005), RUBBER, "base");
		}
		for (const [w, ez] of [["sprocket", -1], ["idler", 1]]) {
			const z = ez * (TRACK_L / 2 - WHEEL);
			add(wheel(.16, TRACK_W * .7, [
				tx,
				.17500000000000002,
				z
			]), STEEL, `${w}${s}`);
			for (let k = 0; k < 3; k++) {
				const a = k * Math.PI / 3;
				add(spoke(tx + x * TRACK_W * .36, .17500000000000002, z, a), DARK, `${w}${s}`);
			}
		}
		for (const z of [
			-.3,
			0,
			.3
		]) add(wheel(.06, TRACK_W * .5, [
			tx,
			.09,
			z
		]), STEEL, "base");
	}
	add(block(.99, .3, .05, [
		0,
		.2,
		.98
	], .01), PAINT, "blade");
	add(block(.99, .02, .06, [
		0,
		.05,
		1
	], .005), STEEL, "blade");
	for (const sx of [-1, 1]) add(beam([
		sx * .2,
		.32,
		.62
	], [
		sx * .25,
		.25,
		.96
	], .07, .1), PAINT, "blade");
	add(limb([
		0,
		.38,
		.58
	], [
		0,
		.3,
		.9
	], .035, .03), CHROME, "blade");
	add(block(1, .1, 1.15, [
		0,
		.55,
		-.05
	]), DARK, "house");
	add(block(.98, .5, .55, [
		0,
		.85,
		-.33
	], .08), PAINT, "house");
	const cw = new three.CylinderGeometry(.62, .62, .42, 32, 1, false, Math.PI * .72, Math.PI * .56);
	cw.translate(0, .81, -.05);
	add(cw, DARK, "house");
	add(block(.9, .06, .6, [
		0,
		.62,
		.3
	]), DARK, "house");
	add(block(.48, .1, .45, [
		.05,
		.98,
		.05
	], .04), SEAT, "house");
	add(block(.48, .5, .1, [
		.05,
		1.25,
		-.16
	], .05), SEAT, "house");
	for (const sx of [-1, 1]) {
		add(block(.12, .25, .35, [
			.05 + sx * .3,
			.85,
			.18
		], .03), DARK, "house");
		add(limb([
			.05 + sx * .3,
			.97,
			.25
		], [
			.05 + sx * .3,
			1.15,
			.28
		], .012, .012), DARK, "house");
		add(new three.SphereGeometry(.03, 10, 8).translate(.05 + sx * .3, 1.17, .28), DARK, "house");
	}
	for (const [px, pz] of [
		[-.42, -.5],
		[.42, -.5],
		[-.42, .42],
		[.42, .42]
	]) add(limb([
		px,
		.6,
		pz
	], [
		px,
		2.25,
		pz
	], .03, .03), DARK, "house");
	add(block(.98, .06, 1.05, [
		0,
		2.28,
		-.04
	], .03), DARK, "house");
	add(limb([
		.36,
		1.05,
		-.62
	], [
		.36,
		1.35,
		-.62
	], .025, .02), DARK, "house");
	add(block(.04, .04, .02, [
		-.36,
		2.22,
		.45
	], .01), "#ffd27a", "house");
	add(block(.34, .36, .3, [
		0,
		.72,
		.62
	], .03), PAINT, "swing");
	add(beam([
		0,
		.6,
		.62
	], [
		0,
		.6,
		.85
	], .2, .12), DARK, "swing");
	const knee = [
		0,
		1.85,
		1.25
	];
	add(beam(J.boom, knee, .2, .26), PAINT, "boom");
	add(beam(knee, J.arm, .2, .22), PAINT, "boom");
	add(beam([
		0,
		1.65,
		1
	], RAMS.armRam.a, .12, .12), PAINT, "boom");
	add(wheel(.07, .26, J.arm), STEEL, "boom");
	add(beam([
		0,
		2.35,
		1.65
	], J.bucket, .16, .2), PAINT, "arm");
	add(beam(J.arm, RAMS.armRam.b, .16, .12), PAINT, "arm");
	add(wheel(.06, .24, J.bucket), STEEL, "arm");
	add(beam([
		0,
		2.3,
		1.72
	], RAMS.bucketRam.a, .1, .1), PAINT, "arm");
	out.push(...bucketParts());
	for (const [name, ram] of Object.entries(RAMS)) {
		const A = new three.Vector3(...ram.a), B = new three.Vector3(...ram.b);
		const len = A.distanceTo(B);
		const dir = B.clone().sub(A).normalize();
		const barrelEnd = A.clone().addScaledVector(dir, len * .62);
		const rodEnd = B.clone().addScaledVector(dir, -len * .75);
		add(limb(ram.a, barrelEnd.toArray(), ram.r, ram.r), PAINT, `${name}Barrel`);
		add(limb(ram.b, rodEnd.toArray(), ram.r * .5, ram.r * .5), CHROME, `${name}Rod`);
	}
	return out;
}
/** a spoke across a wheel at x, y, z, turned `a` about x */
/** @param {number} x @param {number} y @param {number} z @param {number} a */
function spoke(x, y, z, a) {
	const g = new three.BoxGeometry(.02, .30000000000000004, .035);
	g.rotateX(a);
	g.translate(x, y, z);
	return g;
}
/** @param {number} th @param {number} y @param {number} z @returns {[number, number]} */
const rot = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it */
/** @param {number} y @param {number} z */
const ang = (y, z) => Math.atan2(z, y);
/**
* Where the arm's points are with the boom, arm and bucket turned so (in the swing bracket's frame), and how the
* rams' barrels and rods must turn to stay on their pins.
* @param {number} boom @param {number} arm @param {number} bucket
* @returns {Pose}
*/
function rams(boom, arm, bucket) {
	/** a point riding a part, where it is now @param {string} part @param {V3} p @returns {[number, number]} */
	const place = (part, p) => {
		if (part === "swing") return [p[1], p[2]];
		const steps = [
			["boom", boom],
			["arm", arm],
			["bucket", bucket]
		];
		let y = p[1], z = p[2];
		const upTo = steps.findIndex(([n]) => n === part);
		for (let i = upTo; i >= 0; i--) {
			const [n] = steps[i];
			const j = J[n];
			const total = steps[i][1];
			[y, z] = rot(total, y - j[1], z - j[2]);
			y += j[1];
			z += j[2];
		}
		return [y, z];
	};
	/** how far a part is turned in all (its parents' turns and its own) @param {string} part */
	const turned = (part) => part === "swing" ? 0 : part === "boom" ? boom : part === "arm" ? boom + arm : boom + arm + bucket;
	/** @type {Pose} */
	const out = {};
	for (const [name, ram] of Object.entries(RAMS)) {
		const [on0, on1] = ram.on;
		const a = place(on0, ram.a), b = place(on1, ram.b);
		const rest = ang(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
		const now = ang(b[0] - a[0], b[1] - a[1]);
		out[`${name}Barrel`] = [
			now - rest - turned(on0),
			0,
			0
		];
		out[`${name}Rod`] = [
			now - rest - turned(on1),
			0,
			0
		];
	}
	return out;
}
/**
* The machine at its joints' turns: how far the house is slewed and the boom swung (about y), the boom, arm and
* bucket (about x), the blade, how far the wheels have turned; the rams follow.
* @param {{ slew?: number, swing?: number, boom?: number, arm?: number, bucket?: number, blade?: number, wheels?: number, root?: V3 }} s
* @returns {Pose}
*/
function machine({ slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
	/** @type {Pose} */
	const p = {
		house: [
			0,
			slew,
			0
		],
		swing: [
			0,
			swing,
			0
		],
		boom: [
			boom,
			0,
			0
		],
		arm: [
			arm,
			0,
			0
		],
		bucket: [
			bucket,
			0,
			0
		],
		blade: [
			blade,
			0,
			0
		],
		...rams(boom, arm, bucket)
	};
	for (const [s] of SIDES) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 */
/** @param {number} x */
const ease = (x) => x * x * (3 - 2 * x);
/**
* Between key poses (each at its time in the cycle, 0…1), eased.
* @param {[number, Parameters<typeof machine>[0]][]} keys @param {number} u
*/
function through(keys, u) {
	let i = 0;
	while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
	const [t0, a] = keys[i], [t1, b] = keys[i + 1];
	const k = ease(Math.min(1, Math.max(0, (u - t0) / (t1 - t0))));
	/** @type {Record<string, number>} */
	const mix = {};
	for (const name of [
		"slew",
		"swing",
		"boom",
		"arm",
		"bucket",
		"blade"
	]) {
		const x = a[name] ?? 0;
		mix[name] = x + ((b[name] ?? 0) - x) * k;
	}
	return mix;
}
const TUCKED = {
	boom: -.35,
	arm: -.55,
	bucket: -1.2,
	blade: -.25
};
const REACH = {
	boom: .55,
	arm: .6,
	bucket: -1.6,
	blade: .08
};
const CURLED = {
	boom: .62,
	arm: -.35,
	bucket: .55,
	blade: .08
};
const LIFTED = {
	boom: -.2,
	arm: -.4,
	bucket: .6,
	blade: .08
};
/** Build the mini excavator and its moves. @returns {Cast} */
function excavator() {
	/** @type {import('./rig').BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: J.base
		},
		{
			name: "blade",
			parent: "base",
			at: J.blade
		},
		...SIDES.flatMap(([s, x]) => [{
			name: `sprocket${s}`,
			parent: "base",
			at: [
				x * TRACK_X,
				.17500000000000002,
				-.605
			]
		}, {
			name: `idler${s}`,
			parent: "base",
			at: [
				x * TRACK_X,
				.17500000000000002,
				TRACK_L / 2 - WHEEL
			]
		}]),
		{
			name: "house",
			parent: "base",
			at: J.house
		},
		{
			name: "swing",
			parent: "house",
			at: J.swing
		},
		{
			name: "boom",
			parent: "swing",
			at: J.boom
		},
		{
			name: "arm",
			parent: "boom",
			at: J.arm
		},
		{
			name: "bucket",
			parent: "arm",
			at: J.bucket
		},
		...Object.entries(RAMS).flatMap(([name, ram]) => [{
			name: `${name}Barrel`,
			parent: ram.on[0],
			at: ram.a
		}, {
			name: `${name}Rod`,
			parent: ram.on[1],
			at: ram.b
		}])
	];
	const r = rig(bones, parts(), [skin(.5, { side: three.DoubleSide })]);
	r.object.name = "excavator";
	r.object.scale.setScalar(2);
	return {
		rig: r,
		clips: {
			dig: (t) => {
				const u = loop(t, 9);
				return machine(through([
					[0, { ...LIFTED }],
					[.14, { ...REACH }],
					[.3, { ...CURLED }],
					[.42, { ...LIFTED }],
					[.58, {
						...LIFTED,
						slew: 1.4
					}],
					[.7, {
						...LIFTED,
						slew: 1.4,
						bucket: -1.4,
						arm: .1
					}],
					[.82, {
						...LIFTED,
						slew: 1.4
					}],
					[1, { ...LIFTED }]
				], u));
			},
			drive: (t) => machine({
				...TUCKED,
				wheels: -t * 3.2,
				root: [
					0,
					Math.sin(t * 9) * .004,
					0
				]
			}),
			doze: (t) => {
				const u = loop(t, 6);
				const dist = 1.2 * (u < .5 ? ease(u * 2) : ease(2 - u * 2));
				const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease((u - .95) * 20);
				return machine({
					...TUCKED,
					blade,
					wheels: -dist / WHEEL,
					root: [
						0,
						0,
						dist
					]
				});
			},
			idle: (t) => machine({
				...LIFTED,
				root: [
					0,
					Math.sin(t * 40) * .002,
					0
				]
			})
		},
		poses: {
			tucked: machine(TUCKED),
			reaching: machine(REACH),
			curled: machine(CURLED),
			rest: machine({})
		},
		first: "dig"
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
const HISTORY = /* @__PURE__ */ (() => ({ "excavator-small": [
	{
		...FIRST,
		build: [{
			id: "excavator-small",
			label: "Mini excavator",
			note: "yellow, an open canopy, a 40 cm bucket",
			make: () => excavator$1()
		}]
	},
	{
		v: 2,
		date: "2026-10-06",
		note: "Twice the size; the bucket turned round, its mouth and teeth towards the machine as a backhoe’s are",
		build: [{
			id: "excavator-small",
			label: "Excavator",
			note: "yellow, an open canopy, an 80 cm backhoe bucket",
			make: () => excavator()
		}]
	},
	{
		v: 3,
		date: "2026-10-06",
		note: "The mini back at its own size, 1.7 t: rubber tracks, an open canopy, a dozer blade, a swinging boom, a 40 cm bucket (beside the large excavator, which was built new then; each its own asset since 18 Oct 2026)"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "excavator-small",
	label: "Small excavator",
	note: "a mini excavator of 1.7 t, rigged: the house slews, boom, arm and bucket work on their rams, the wheels turn; it digs, slews and dumps, drives and dozes with its blade",
	from: "Sandbox 1: building the settlement",
	variants: [{
		id: "excavator-small",
		label: "Small · 1.7 t",
		note: "rubber tracks, an open canopy, a dozer blade, a swinging boom, a 40 cm bucket",
		make: () => miniExcavator()
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