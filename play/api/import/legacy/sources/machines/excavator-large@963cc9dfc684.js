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
const SIDES = [["L", 1], ["R", -1]];
const PAINT = "#f0a90f";
const DARK = "#2b2c2e";
const STEEL = "#8c9094";
const CHROME = "#d8d8d6";
const SEAT = "#3a3b3d";
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
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at @param {number} [seg] */
function wheel(r, w, at, seg = 18) {
	const g = new three.CylinderGeometry(r, r, w, seg);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}
/** a spoke across a wheel of radius r at x, y, z, turned `a` about x */
/** @param {number} r @param {number} x @param {number} y @param {number} z @param {number} a */
function spoke(r, x, y, z, a) {
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
function bucketParts({ pivot, R, w, teeth, pin, plate = R * .06 }) {
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
		geo: beam(at(from + (to - from) * i / n), at(from + (to - from) * (i + 1) / n), w, plate, plate * .25),
		color: DARK,
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
			color: DARK,
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
			color: STEEL,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam([
			sx * w * .22,
			py + R * .12,
			pz - R * .15
		], [
			sx * w * .22,
			pin[1],
			pin[2]
		], R * .12, R * .5, R * .04),
		color: DARK,
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
			color: PAINT,
			bone: `${name}Barrel`
		}, {
			geo: limb(ram.b, rodEnd, ram.r * .5, ram.r * .5),
			color: CHROME,
			bone: `${name}Rod`
		}];
	});
}
/** @param {number} th @param {number} y @param {number} z @returns {[number, number]} */
const rot = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it @param {number} y @param {number} z */
const ang = (y, z) => Math.atan2(z, y);
/**
* How the rams' barrels and rods must turn to stay on their pins, the boom, arm and bucket turned so.
* @param {Spec} spec @param {number} boom @param {number} arm @param {number} bucket @returns {Pose}
*/
function rams(spec, boom, arm, bucket) {
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
			[y, z] = rot(th, y - j[1], z - j[2]);
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
		const now = ang(b[0] - a[0], b[1] - a[1]) - ang(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
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
function machine(spec, { slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
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
		...rams(spec, boom, arm, bucket)
	};
	if (spec.J.blade) p.blade = [
		blade,
		0,
		0
	];
	for (const [s] of SIDES) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 @param {number} x */
const ease = (x) => x * x * (3 - 2 * x);
/** Between key poses (each at its time in the cycle, 0…1), eased. @param {[number, Joints][]} keys @param {number} u @returns {Joints} */
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
		...SIDES.flatMap(([s, x]) => [{
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
	const m = (j) => machine(spec, j);
	/** @type {Record<string, import('./rig').Clip>} */
	const clips = {
		dig: (t) => m(through([
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
		const dist = 1.2 * (u < .5 ? ease(u * 2) : ease(2 - u * 2));
		const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease((u - .95) * 20);
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
//#region src/lib/actors/crawler-excavator.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./excavator-rig.js').Spec} Spec */
const WEIGHT = "#3a3b3d";
const GLASS = "#a9c3cd";
const LAMP = "#ffe9b0";
const AMBER = "#ffb000";
const X = -.03;
const J = {
	base: [
		0,
		.5,
		0
	],
	house: [
		0,
		.98,
		0
	],
	swing: [
		X,
		1.55,
		1.2
	],
	boom: [
		X,
		1.55,
		1.2
	],
	arm: [
		X,
		3.45,
		4.75
	],
	bucket: [
		X,
		1,
		5.25
	]
};
const KNEE = [
	X,
	3.75,
	2.85
];
/** @type {Record<string, import('./excavator-rig.js').Ram>} */
const RAMS = {
	boomRamL: {
		a: [
			.32999999999999996,
			1.25,
			1.7
		],
		b: [
			.32999999999999996,
			3.08,
			2.88
		],
		on: ["swing", "boom"],
		r: .085
	},
	boomRamR: {
		a: [
			-.39,
			1.25,
			1.7
		],
		b: [
			-.39,
			3.08,
			2.88
		],
		on: ["swing", "boom"],
		r: .085
	},
	armRam: {
		a: [
			X,
			3.11,
			1.87
		],
		b: [
			X,
			4.15,
			4.55
		],
		on: ["boom", "arm"],
		r: .095
	},
	bucketRam: {
		a: [
			X,
			3.23,
			5.15
		],
		b: [
			X,
			1.25,
			5.55
		],
		on: ["arm", "bucket"],
		r: .08
	}
};
/** the tracks: centres, the wheels' axle height and radius, sprocket (back) and idler (front), the shoes' loop */
const T = {
	x: .995,
	w: .5,
	y: .45,
	r: .35,
	back: -1.45,
	front: 1.45,
	loop: .38
};
/** The shoes of one track, round its loop: each a plate and its grouser, laid every 19 cm along the loop. */
/** @param {number} tx @returns {THREE.BufferGeometry[]} */
function shoes(tx) {
	const run = T.front - T.back, arc = Math.PI * T.loop, total = 2 * run + 2 * arc, pitch = .19;
	/** where along the loop (0…total) a shoe is, and which way is out @param {number} s @returns {[number, number, number, number]} */
	const along = (s) => {
		if (s < run) return [
			T.y + T.loop,
			T.back + s,
			1,
			0
		];
		s -= run;
		if (s < arc) {
			const a = s / T.loop;
			return [
				T.y + Math.cos(a) * T.loop,
				T.front + Math.sin(a) * T.loop,
				Math.cos(a),
				Math.sin(a)
			];
		}
		s -= arc;
		if (s < run) return [
			T.y - T.loop,
			T.front - s,
			-1,
			0
		];
		s -= run;
		const a = Math.PI + s / T.loop;
		return [
			T.y + Math.cos(a) * T.loop,
			T.back + Math.sin(a) * T.loop,
			Math.cos(a),
			Math.sin(a)
		];
	};
	/** @type {THREE.BufferGeometry[]} */
	const out = [];
	const n = Math.round(total / pitch);
	for (let i = 0; i < n; i++) {
		const [y, z, ny, nz] = along(i * total / n);
		const basis = new three.Matrix4().makeBasis(new three.Vector3(1, 0, 0), new three.Vector3(0, ny, nz), new three.Vector3(0, -nz, ny));
		basis.setPosition(tx, y, z);
		const plate = new three.BoxGeometry(T.w, .05, pitch * .92);
		plate.applyMatrix4(basis);
		const grouser = new three.BoxGeometry(T.w, .035, .03).translate(0, .042, 0);
		grouser.applyMatrix4(basis);
		out.push(plate, grouser);
	}
	return out;
}
/** Every part, riding its joint. @returns {Piece[]} */
function parts() {
	/** @type {Piece[]} */
	const out = [];
	/** @param {THREE.BufferGeometry} geo @param {string} color @param {string} bone @param {number} [mat] */
	const add = (geo, color, bone, mat = 0) => out.push({
		geo,
		color,
		bone,
		mat
	});
	add(block(.95, .42, 1.7, [
		0,
		.62,
		0
	], .04), DARK, "base");
	add(block(1.7, .3, .9, [
		0,
		.58,
		0
	], .04), DARK, "base");
	add(new three.CylinderGeometry(.78, .78, .12, 36).translate(0, .9, 0), DARK, "base");
	for (const [s, x] of SIDES) {
		const tx = x * T.x;
		add(block(.36, .42, T.front - T.back + .1, [
			tx,
			T.y,
			0
		], .03), DARK, "base");
		for (const g of shoes(tx)) add(g, STEEL, "base");
		for (let i = 0; i < 7; i++) add(wheel(.1, .26, [
			tx,
			.2,
			-1.08 + i * .36
		], 14), STEEL, "base");
		for (const z of [-.5, .5]) add(wheel(.08, .2, [
			tx,
			T.y + T.loop - .105,
			z
		], 14), STEEL, "base");
		for (const [w, z] of [["sprocket", T.back], ["idler", T.front]]) {
			add(wheel(T.r - .02, .32, [
				tx,
				T.y,
				z
			], 24), DARK, `${w}${s}`);
			for (let k = 0; k < 3; k++) add(spoke(T.r - .04, tx + x * .17, T.y, z, k * Math.PI / 3), STEEL, `${w}${s}`);
		}
		add(wheel(.24, .22, [
			tx - x * .26,
			T.y,
			T.back
		], 20), DARK, "base");
	}
	add(block(2.45, .22, 3.75, [
		0,
		1.1,
		-.3
	], .03), DARK, "house");
	const weight = new three.CylinderGeometry(2.25, 2.25, .85, 40, 1, false, Math.PI - .6, 1.2);
	weight.translate(0, 1.64, 0);
	add(weight, WEIGHT, "house");
	add(block(2.25, .85, 1.3, [
		-.05,
		1.64,
		-1.3
	], .06), PAINT, "house");
	for (let i = 0; i < 6; i++) add(block(.9, .012, .05, [
		-.45,
		2.075,
		-1.75 + i * .12
	], .004), DARK, "house");
	add(limb([
		-.62,
		2.05,
		-.95
	], [
		-.62,
		2.62,
		-.95
	], .055, .05), DARK, "house");
	add(block(.95, .95, 1.55, [
		-.73,
		1.68,
		.78
	], .05), PAINT, "house");
	add(block(.9, .02, .5, [
		-.73,
		1.45,
		1.56
	], .005), DARK, "house");
	for (const z of [
		.1,
		.8,
		1.5
	]) add(limb([
		-1.17,
		2.15,
		z
	], [
		-1.17,
		2.62,
		z
	], .022, .022), PAINT, "house");
	add(limb([
		-1.17,
		2.62,
		.1
	], [
		-1.17,
		2.62,
		1.5
	], .022, .022), PAINT, "house");
	add(block(.42, .05, .28, [
		-1,
		1,
		1.72
	], .01), STEEL, "house");
	add(block(.62, .5, .75, [
		X,
		1.45,
		1.2
	], .05), PAINT, "house");
	for (const sx of [-1, 1]) add(block(.12, .3, .42, [
		X + sx * .36,
		1.25,
		1.62
	], .02), DARK, "swing");
	const cx = .7, cz = .1, cw = 1, cd = 1.7;
	add(block(cw, .25, cd, [
		cx,
		1.345,
		cz
	], .03), DARK, "house");
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(block(.07, 1.7, .07, [
		cx + sx * (cw / 2 - .035),
		4.14 / 2,
		cz + sz * (cd / 2 - .035)
	], .01), DARK, "house");
	add(block(1.06, .09, 1.76, [
		cx,
		2.9499999999999997,
		cz
	], .03), PAINT, "house");
	const gy = 4.39 / 2, gh = 1.43;
	add(block(.92, gh, .012, [
		cx,
		gy,
		.95 - .02
	]), GLASS, "house", 1);
	add(block(.92, gh, .012, [
		cx,
		gy,
		-.73
	]), GLASS, "house", 1);
	for (const sx of [-1, 1]) add(block(.012, gh, 1.6199999999999999, [
		cx + sx * (cw / 2 - .02),
		gy,
		cz
	]), GLASS, "house", 1);
	add(block(.05, gh, .04, [
		1.18,
		gy,
		-.04999999999999999
	], .01), DARK, "house");
	add(block(.05, .03, .18, [
		1.22,
		2.05,
		.5
	], .01), DARK, "house");
	add(block(.5, .12, .5, [
		cx,
		1.62,
		-.04999999999999999
	], .04), SEAT, "house");
	add(block(.5, .65, .12, [
		cx,
		1.98,
		-.31999999999999995
	], .05), SEAT, "house");
	for (const sx of [-1, 1]) {
		add(block(.14, .3, .5, [
			cx + sx * .36,
			1.6,
			.05
		], .03), DARK, "house");
		add(limb([
			cx + sx * .36,
			1.76,
			.22
		], [
			cx + sx * .36,
			1.92,
			.25
		], .015, .015), DARK, "house");
	}
	add(limb([
		1.26,
		1.3,
		.85
	], [
		1.26,
		2.6,
		.85
	], .02, .02), DARK, "house");
	add(limb([
		1.2,
		2.55,
		.95
	], [
		1.45,
		2.6,
		1.05
	], .012, .012), DARK, "house");
	add(block(.04, .28, .18, [
		1.47,
		2.52,
		1.05
	], .01), DARK, "house");
	add(new three.SphereGeometry(.07, 12, 8).translate(1, 3.05, -.5), AMBER, "house");
	add(block(.12, .08, .06, [
		.39999999999999997,
		2.98,
		.95
	], .01), LAMP, "house");
	add(beam(J.boom, KNEE, .5, .62, .04), PAINT, "boom");
	add(beam(KNEE, J.arm, .48, .52, .04), PAINT, "boom");
	add(wheel(.13, .66, J.boom), STEEL, "boom");
	add(wheel(.12, .6, J.arm), STEEL, "boom");
	for (const sx of [-1, 1]) add(beam([
		X + sx * .3,
		3.35,
		2.55
	], [
		X + sx * .36,
		RAMS.boomRamL.b[1],
		RAMS.boomRamL.b[2]
	], .08, .3, .02), PAINT, "boom");
	add(beam([
		X,
		2.87,
		2.19
	], RAMS.armRam.a, .3, .2, .02), PAINT, "boom");
	add(block(.14, .1, .08, [
		.27,
		3.65,
		2.95
	], .01), LAMP, "boom");
	add(beam(J.arm, J.bucket, .42, .5, .04), PAINT, "arm");
	add(beam(J.arm, RAMS.armRam.b, .36, .34, .03), PAINT, "arm");
	add(beam([
		X,
		3.16,
		4.81
	], RAMS.bucketRam.a, .26, .2, .02), PAINT, "arm");
	add(wheel(.1, .52, J.bucket), STEEL, "arm");
	out.push(...bucketParts({
		pivot: J.bucket,
		R: .5,
		w: 1,
		teeth: 5,
		pin: RAMS.bucketRam.b,
		plate: .035
	}));
	out.push(...ramParts(RAMS));
	return out;
}
/** @type {Spec} */
const CRAWLER = /* @__PURE__ */ (() => ({
	name: "crawler excavator",
	J,
	rams: RAMS,
	wheels: {
		x: T.x,
		y: T.y,
		sprocket: T.back,
		idler: T.front,
		r: T.r
	},
	parts,
	poses: {
		tucked: {
			boom: -.35,
			arm: -.95,
			bucket: .4
		},
		reach: {
			boom: .38,
			arm: .65,
			bucket: -1.3
		},
		curled: {
			boom: .48,
			arm: -.25,
			bucket: .7
		},
		lifted: {
			boom: -.15,
			arm: -.3,
			bucket: .6
		},
		dump: {
			boom: -.15,
			arm: .25,
			bucket: -1.4
		}
	},
	slew: 1.6,
	period: 12,
	speed: 1,
	materials: [skin(.08, {
		transparent: true,
		opacity: .32,
		depthWrite: false
	})]
}))();
/** Build the crawler excavator and its moves: dig, drive, idle. */
const crawlerExcavator = () => excavatorCast(CRAWLER);

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
const HISTORY = /* @__PURE__ */ (() => ({ "excavator-large": [{
	v: 1,
	date: "2026-10-06",
	note: "A 14-tonne crawler excavator built as one: steel tracks, an enclosed cab, a mono boom on two rams, no blade (the Excavator’s big variant until 18 Oct 2026, now its own asset)"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "excavator-large",
	label: "Large excavator",
	note: "a crawler excavator of 14 t, rigged: the house slews, boom, arm and bucket work on their rams, the wheels turn; it digs, slews and dumps, and drives",
	from: "Sandbox 1: building the settlement",
	variants: [{
		id: "excavator-large",
		label: "Large · 14 t",
		note: "steel tracks, an enclosed cab, a mono boom on two rams, a 1 m bucket, 8.3 m reach",
		make: () => crawlerExcavator()
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