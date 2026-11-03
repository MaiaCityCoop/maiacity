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
	if (DETAIL$1 < 1) {
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
let DETAIL$1 = 1;
const detail = () => DETAIL$1;
const fine = (n, least) => Math.max(least, Math.round(n * DETAIL$1));
/** Build with coarser shapes — the same actor, a fraction of its vertices, for drawing far off. */
function lowDetail(build, detail = .45) {
	const was = DETAIL$1;
	DETAIL$1 = detail;
	try {
		return build();
	} finally {
		DETAIL$1 = was;
	}
}
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
/** An egg: a sphere `r` across, scaled by `s`, turned by `rot`, at `at`. */
function egg(at, s, rot = [
	0,
	0,
	0
], detail = [20, 14]) {
	const g = new three.SphereGeometry(1, fine(detail[0], 6), fine(detail[1], 4));
	g.applyMatrix4(new three.Matrix4().compose(new three.Vector3(...at), new three.Quaternion().setFromEuler(new three.Euler(...rot)), new three.Vector3(...s)));
	return g;
}
/** A cone (a beak, a horn, a fin): `r` at its base, `h` long, pointing along `dir` from its base at `at`. */
function spike(at, dir, r, h, { flat = 1, seg = 10 } = {}) {
	const g = new three.ConeGeometry(r, h, fine(seg, 4));
	g.applyMatrix4(new three.Matrix4().makeTranslation(0, h / 2, 0));
	g.applyMatrix4(new three.Matrix4().makeScale(flat, 1, 1));
	g.applyMatrix4(new three.Matrix4().compose(new three.Vector3(...at), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), new three.Vector3(...dir).normalize()), new three.Vector3(1, 1, 1)));
	return g;
}

//#endregion
//#region src/lib/actors/noise.ts
/** a number 0…1 for an integer (and a seed) */
function hash(n, seed = 0) {
	let h = (Math.imul(n | 0, 668265261) ^ Math.imul(seed | 0, 374761393)) >>> 0;
	h = Math.imul(h ^ h >>> 15, 2246822507) >>> 0;
	h = Math.imul(h ^ h >>> 13, 3266489909) >>> 0;
	return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
const h3 = (x, y, z, seed) => hash(x * 73856093 ^ y * 19349663 ^ z * 83492791, seed);
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
/** smooth noise in space, -1…1 */
function noise3(x, y, z, seed = 0) {
	const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
	const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
	const l = (a, b, t) => a + (b - a) * t;
	const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz, seed);
	return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
/** noise of a few octaves, each twice as fine and half as strong, -1…1 */
function fbm3(x, y, z, octaves = 3, seed = 0) {
	let sum = 0, amp = 1, norm = 0;
	for (let o = 0; o < octaves; o++) {
		sum += noise3(x, y, z, seed + o * 31) * amp;
		norm += amp;
		x *= 2.03;
		y *= 2.03;
		z *= 2.03;
		amp *= .5;
	}
	return sum / norm;
}
/**
* Something that happens now and then — a blink, an ear's flick, a look round: how far into one it is at time t
* (0…1, or -1 between them). Every `period` seconds on average it may start (with chance `p`), and lasts `length`.
*/
function now(t, period, length, seed, p = .7) {
	const k = Math.floor(t / period);
	for (const i of [k, k - 1]) {
		if (hash(i, seed) > p) continue;
		const u = (t - (i + hash(i, seed + 7) * Math.max(0, 1 - length / period)) * period) / length;
		if (u >= 0 && u < 1) return u;
	}
	return -1;
}
/** a value that holds for a while and then moves on to another, smoothly: -1…1 (a head's look round) */
function wander(t, period, seed) {
	const k = Math.floor(t / period), f = t / period - k;
	const a = hash(k, seed) * 2 - 1, b = hash(k + 1, seed) * 2 - 1;
	const s = Math.min(1, Math.max(0, (f - .75) / .25));
	return a + (b - a) * s * s * (3 - 2 * s);
}

//#endregion
//#region src/lib/actors/sculpt.ts
const smin = (a, b, k) => {
	if (k <= 0) return a < b ? a : b;
	const h = Math.max(k - Math.abs(a - b), 0) / k;
	return (a < b ? a : b) - h * h * k * .25;
};
/** the lumps' noise at the point last asked about (every lumpy shape of a sculpt shares it) */
let nx_ = NaN;
let ny_ = NaN;
let nz_ = NaN;
let nl_ = NaN;
let nv_ = 0;
const lumpsAt = (x, y, z, l) => {
	if (x !== nx_ || y !== ny_ || z !== nz_ || l !== nl_) {
		nx_ = x;
		ny_ = y;
		nz_ = z;
		nl_ = l;
		nv_ = noise3(x / l, y / l, z / l, 5);
	}
	return nv_;
};
function distance(s, x, y, z) {
	let d;
	if (s.kind === 0) {
		const px = x - s.c[0], py = y - s.c[1], pz = z - s.c[2], m = s.inv;
		const qx = (m[0] * px + m[1] * py + m[2] * pz) / s.r[0], qy = (m[3] * px + m[4] * py + m[5] * pz) / s.r[1], qz = (m[6] * px + m[7] * py + m[8] * pz) / s.r[2];
		const k0 = Math.sqrt(qx * qx + qy * qy + qz * qz);
		const k1 = Math.sqrt((qx / s.r[0]) ** 2 + (qy / s.r[1]) ** 2 + (qz / s.r[2]) ** 2);
		d = k1 < 1e-12 ? -Math.min(...s.r) : k0 * (k0 - 1) / k1;
	} else {
		const pax = x - s.a[0], pay = y - s.a[1], paz = z - s.a[2];
		const yy = pax * s.ba[0] + pay * s.ba[1] + paz * s.ba[2];
		const zz = yy - s.l2;
		const xvx = pax * s.l2 - s.ba[0] * yy, xvy = pay * s.l2 - s.ba[1] * yy, xvz = paz * s.l2 - s.ba[2] * yy;
		const x2 = xvx * xvx + xvy * xvy + xvz * xvz, y2 = yy * yy * s.l2, z2 = zz * zz * s.l2;
		const k = Math.sign(s.rr) * s.rr * s.rr * x2;
		if (Math.sign(zz) * s.a2 * z2 > k) d = Math.sqrt(x2 + z2) * s.il2 - s.rb;
		else if (Math.sign(yy) * s.a2 * y2 < k) d = Math.sqrt(x2 + y2) * s.il2 - s.ra;
		else d = (Math.sqrt(x2 * s.a2 * s.il2) + yy * s.rr) * s.il2 - s.ra;
	}
	if (s.bump) d -= .5 * s.bump * lumpsAt(x, y, z, s.lumps);
	return d;
}
/** the field of a set of shapes at a point: < 0 inside */
function field(list, x, y, z) {
	let d = 1e9;
	for (const s of list) {
		const di = distance(s, x, y, z);
		d = s.carve ? -smin(-d, di, s.k) : smin(d, di, s.k);
	}
	return d;
}
const cache = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** the skins meshed here since `fresh()` was last asked (a worker hands them back to the page) */
let made = [];
/** a skin meshed elsewhere (in a worker), kept as if meshed here */
const keep = (key, skin) => cache.set(key, skin);
/**
* A sculpt over a skeleton (its bones, where their joints rest): add its shapes, then `skin()` it.
*/
function sculpt(bones) {
	const shapes = [];
	const joint = Object.fromEntries(bones.map((b) => [b.name, b.at]));
	const base = (o) => ({
		k: o.k ?? 0,
		carve: !!o.carve,
		tag: o.tag ?? "body",
		bone: o.bone,
		chain: o.chain,
		bump: o.bump ?? 0,
		lumps: o.lumps ?? .05
	});
	const none = [
		0,
		0,
		0
	];
	const api = {
		/** an egg at `c`, `r` its radii along x, y and z, turned by `rot` (radians about x, y, z) */
		egg(c, r, o, rot = [
			0,
			0,
			0
		]) {
			const m = new three.Matrix4().makeRotationFromEuler(new three.Euler(...rot)).invert().elements;
			const inv = [
				m[0],
				m[4],
				m[8],
				m[1],
				m[5],
				m[9],
				m[2],
				m[6],
				m[10]
			];
			shapes.push({
				kind: 0,
				c,
				r,
				inv,
				a: none,
				ba: none,
				l2: 1,
				rr: 0,
				a2: 1,
				il2: 1,
				ra: 0,
				rb: 0,
				mid: c,
				reach: Math.max(...r),
				...base(o)
			});
			return api;
		},
		/** a ball */
		ball(c, r, o) {
			return api.egg(c, [
				r,
				r,
				r
			], o);
		},
		/** a round cone from a (`ra` thick) to b (`rb`): a limb, a neck, a tail */
		cone(a, b, ra, rb, o) {
			const ba = [
				b[0] - a[0],
				b[1] - a[1],
				b[2] - a[2]
			];
			const l2 = Math.max(1e-10, ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2), rr = ra - rb;
			const mid = [
				(a[0] + b[0]) / 2,
				(a[1] + b[1]) / 2,
				(a[2] + b[2]) / 2
			];
			shapes.push({
				kind: 1,
				c: none,
				r: [
					1,
					1,
					1
				],
				inv: [],
				a,
				ba,
				l2,
				rr,
				a2: l2 - rr * rr,
				il2: 1 / l2,
				ra,
				rb,
				mid,
				reach: Math.sqrt(l2) / 2 + Math.max(ra, rb),
				...base(o)
			});
			return api;
		},
		/**
		* The skin: meshed in cells `cell` across (coarser for an actor drawn far off), painted by `paint`. Kept by
		* `key`, so the same sculpt is only ever meshed once.
		*/
		skin(cell, paint, key) {
			const h = cell / detail();
			const id = key && `${key}@${h.toFixed(5)}`;
			if (id && cache.has(id)) return cache.get(id);
			const out = mesh(shapes, h, joint, paint);
			if (id) {
				cache.set(id, out);
				made.push(id);
			}
			return out;
		}
	};
	return api;
}
function mesh(shapes, h, joint, paint) {
	const solid = shapes.filter((s) => !s.carve);
	const lo = [
		Infinity,
		Infinity,
		Infinity
	], hi = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (const s of solid) for (let i = 0; i < 3; i++) {
		const r = s.reach + s.bump + s.k;
		lo[i] = Math.min(lo[i], s.mid[i] - r);
		hi[i] = Math.max(hi[i], s.mid[i] + r);
	}
	for (let i = 0; i < 3; i++) {
		lo[i] -= 2 * h;
		hi[i] += 2 * h;
	}
	const nx = Math.ceil((hi[0] - lo[0]) / h), ny = Math.ceil((hi[1] - lo[1]) / h), nz = Math.ceil((hi[2] - lo[2]) / h);
	const px = nx + 1, py = ny + 1, pz = nz + 1;
	const at = (i, j, k) => i + px * (j + py * k);
	const B = 6, bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
	const lists = new Array(bx * by * bz);
	const flat = new Uint8Array(bx * by * bz);
	const value = new Float32Array(px * py * pz).fill(NaN);
	const half = B * h * Math.sqrt(3) / 2;
	for (let kb = 0; kb < bz; kb++) for (let jb = 0; jb < by; jb++) for (let ib = 0; ib < bx; ib++) {
		const cx = lo[0] + (ib + .5) * B * h, cy = lo[1] + (jb + .5) * B * h, cz = lo[2] + (kb + .5) * B * h;
		const reach = half + h * Math.sqrt(3);
		const list = shapes.filter((s) => Math.hypot(cx - s.mid[0], cy - s.mid[1], cz - s.mid[2]) <= s.reach + s.k + s.bump + reach * 1.3);
		lists[ib + bx * (jb + by * kb)] = list;
		const d = list.some((s) => !s.carve) ? field(list, cx, cy, cz) : 1e9;
		const i0 = ib * B, j0 = jb * B, k0 = kb * B;
		const i1 = Math.min(nx, i0 + B), j1 = Math.min(ny, j0 + B), k1 = Math.min(nz, k0 + B);
		const uniform = Math.abs(d) > reach * 1.2;
		flat[ib + bx * (jb + by * kb)] = uniform ? 1 : 0;
		for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
			const n = at(i, j, k);
			if (value[n] === value[n]) continue;
			value[n] = uniform ? Math.sign(d) * reach : field(list, lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
		}
	}
	const listAt = (x, y, z) => {
		const ib = Math.min(bx - 1, Math.max(0, Math.floor((x - lo[0]) / (B * h))));
		const jb = Math.min(by - 1, Math.max(0, Math.floor((y - lo[1]) / (B * h))));
		const kb = Math.min(bz - 1, Math.max(0, Math.floor((z - lo[2]) / (B * h))));
		return lists[ib + bx * (jb + by * kb)];
	};
	const cellAt = (i, j, k) => i + nx * (j + ny * k);
	const vertexOf = new Int32Array(nx * ny * nz).fill(-1);
	const pos = [];
	const corner = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	];
	const EDGES = [
		[0, 1],
		[2, 3],
		[4, 5],
		[6, 7],
		[0, 2],
		[1, 3],
		[4, 6],
		[5, 7],
		[0, 4],
		[1, 5],
		[2, 6],
		[3, 7]
	];
	const cellVertex = (i, j, k) => {
		let inside = 0;
		for (let c = 0; c < 8; c++) {
			corner[c] = value[at(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1))];
			if (corner[c] < 0) inside++;
		}
		if (inside === 0 || inside === 8) return;
		let sx = 0, sy = 0, sz = 0, n = 0;
		for (const [a, b] of EDGES) {
			const va = corner[a], vb = corner[b];
			if (va < 0 === vb < 0) continue;
			const t = va / (va - vb);
			sx += (a & 1) + ((b & 1) - (a & 1)) * t;
			sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t;
			sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t;
			n++;
		}
		vertexOf[cellAt(i, j, k)] = pos.length / 3;
		pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
	};
	for (let kb = 0; kb < bz; kb++) for (let jb = 0; jb < by; jb++) for (let ib = 0; ib < bx; ib++) {
		if (flat[ib + bx * (jb + by * kb)]) continue;
		for (let k = kb * B; k < Math.min(nz, kb * B + B); k++) for (let j = jb * B; j < Math.min(ny, jb * B + B); j++) for (let i = ib * B; i < Math.min(nx, ib * B + B); i++) cellVertex(i, j, k);
	}
	const idx = [];
	const quad = (a, b, c, d) => {
		if (a < 0 || b < 0 || c < 0 || d < 0) return;
		idx.push(a, b, c, a, c, d);
	};
	for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
		const v0 = value[at(i, j, k)] < 0;
		if (i < nx && j > 0 && k > 0 && j < ny && k < nz && v0 !== value[at(i + 1, j, k)] < 0) quad(vertexOf[cellAt(i, j - 1, k - 1)], vertexOf[cellAt(i, j, k - 1)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i, j - 1, k)]);
		if (j < ny && i > 0 && k > 0 && i < nx && k < nz && v0 !== value[at(i, j + 1, k)] < 0) quad(vertexOf[cellAt(i - 1, j, k - 1)], vertexOf[cellAt(i, j, k - 1)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i - 1, j, k)]);
		if (k < nz && i > 0 && j > 0 && i < nx && j < ny && v0 !== value[at(i, j, k + 1)] < 0) quad(vertexOf[cellAt(i - 1, j - 1, k)], vertexOf[cellAt(i, j - 1, k)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i - 1, j, k)]);
	}
	const count = pos.length / 3;
	const nrm = new Float32Array(count * 3);
	const e = h * .2;
	/** the field's gradient by forward differences (times e), `d` the field at the point */
	const grad = (list, x, y, z, d, g) => {
		g[0] = field(list, x + e, y, z) - d;
		g[1] = field(list, x, y + e, z) - d;
		g[2] = field(list, x, y, z + e) - d;
		return g;
	};
	const g = [
		0,
		0,
		0
	];
	for (let v = 0; v < count; v++) {
		let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
		const list = listAt(x, y, z);
		const d = field(list, x, y, z);
		grad(list, x, y, z, d, g);
		const gl = Math.hypot(g[0], g[1], g[2]);
		if (gl > 1e-12) {
			const move = Math.max(-h / 2, Math.min(h / 2, d * e / gl));
			x -= g[0] / gl * move;
			y -= g[1] / gl * move;
			z -= g[2] / gl * move;
		}
		pos[v * 3] = x;
		pos[v * 3 + 1] = y;
		pos[v * 3 + 2] = z;
		grad(list, x, y, z, field(list, x, y, z), g);
		const l = Math.hypot(g[0], g[1], g[2]) || 1;
		nrm[v * 3] = g[0] / l;
		nrm[v * 3 + 1] = g[1] / l;
		nrm[v * 3 + 2] = g[2] / l;
	}
	for (let t = 0; t < idx.length; t += 3) {
		const a = idx[t], b = idx[t + 1], c = idx[t + 2];
		const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
		const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
		const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
		const sx = nrm[a * 3] + nrm[b * 3] + nrm[c * 3], sy = nrm[a * 3 + 1] + nrm[b * 3 + 1] + nrm[c * 3 + 1], sz = nrm[a * 3 + 2] + nrm[b * 3 + 2] + nrm[c * 3 + 2];
		if (fx * sx + fy * sy + fz * sz < 0) {
			idx[t + 1] = c;
			idx[t + 2] = b;
		}
	}
	const names = [];
	const nameIndex = /* @__PURE__ */ new Map();
	const boneId = (n) => {
		if (!nameIndex.has(n)) {
			nameIndex.set(n, names.length);
			names.push(n);
		}
		return nameIndex.get(n);
	};
	const index = new Uint16Array(count * 4), weight = new Float32Array(count * 4), color = new Float32Array(count * 3);
	const byBone = /* @__PURE__ */ new Map(), byTag = /* @__PURE__ */ new Map();
	const p = new three.Vector3(), n = new three.Vector3(), c = new three.Color();
	let total = 0;
	const surface = {
		p,
		n,
		tag: (name) => (byTag.get(name) ?? 0) / total,
		main: ""
	};
	const addBone = (b, w) => {
		const id = boneId(b);
		byBone.set(id, Math.max(byBone.get(id) ?? 0, w));
	};
	for (let v = 0; v < count; v++) {
		const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
		const list = listAt(x, y, z).filter((s) => !s.carve);
		const ds = list.map((s) => distance(s, x, y, z));
		let dmin = Infinity, main = 0;
		ds.forEach((d, i) => d < dmin && (dmin = d, main = i));
		byBone.clear();
		byTag.clear();
		total = 0;
		list.forEach((s, i) => {
			const band = Math.max(s.k, 1.5 * h);
			const u = Math.max(0, 1 - (ds[i] - dmin) / band);
			const w = u * u;
			if (w <= 0) return;
			byTag.set(s.tag, Math.max(byTag.get(s.tag) ?? 0, w));
			if (s.bone) addBone(s.bone, w);
			else if (s.chain) for (const [b, share] of along(s.chain, joint, x, y, z, band)) addBone(b, w * share);
		});
		for (const w of byTag.values()) total += w;
		const top = [...byBone].sort((a, b) => b[1] - a[1]).slice(0, 4);
		const sum = top.reduce((acc, [, w]) => acc + w, 0) || 1;
		top.forEach(([b, w], q) => {
			index[v * 4 + q] = b;
			weight[v * 4 + q] = w / sum;
		});
		p.set(x, y, z);
		n.set(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]);
		surface.main = list[main]?.tag ?? "body";
		c.set(16777215);
		paint(c, surface);
		color[v * 3] = c.r;
		color[v * 3 + 1] = c.g;
		color[v * 3 + 2] = c.b;
	}
	const geo = new three.BufferGeometry();
	geo.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
	geo.setAttribute("normal", new three.BufferAttribute(nrm, 3));
	geo.setAttribute("color", new three.BufferAttribute(color, 3));
	geo.setIndex(idx);
	return {
		geo,
		bones: names,
		index,
		weight
	};
}
/** Along a chain of bones: which of them carry a point, and how much (sharing across a joint over `soft`). */
function along(chain, joint, x, y, z, soft) {
	let best = 0, bestD = Infinity, bestS = 0, bestLen = 1;
	for (let i = 0; i < chain.length; i++) {
		const a = joint[chain[i]];
		const b = i < chain.length - 1 ? joint[chain[i + 1]] : i > 0 ? a.map((v, q) => 2 * v - joint[chain[i - 1]][q]) : [
			a[0],
			a[1] - .1,
			a[2]
		];
		const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
		const len = Math.max(1e-6, Math.hypot(dx, dy, dz));
		const s = Math.max(0, Math.min(len, ((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / len));
		const d = Math.hypot(a[0] + dx * s / len - x, a[1] + dy * s / len - y, a[2] + dz * s / len - z);
		if (d < bestD - 1e-9) [best, bestD, bestS, bestLen] = [
			i,
			d,
			s,
			len
		];
	}
	const k = Math.min(soft, bestLen / 2);
	const back = best > 0 && bestS < k ? .5 - .5 * bestS / k : 0;
	const next = best < chain.length - 1 && bestLen - bestS < k ? .5 - .5 * (bestLen - bestS) / k : 0;
	const out = [[chain[best], 1 - back - next]];
	if (back) out.push([chain[best - 1], back]);
	if (next) out.push([chain[best + 1], next]);
	return out;
}
/** a colour from its hex, linear */
const hex = (s) => new three.Color(s);
/** c moved toward `to` by t */
const mix = (c, to, t) => c.lerp(typeof to === "string" ? hex(to) : to, Math.max(0, Math.min(1, t)));
/** 0 below a, 1 above b, smooth between */
const ramp = (x, a, b) => {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

//#endregion
//#region src/lib/actors/build.ts
const pending = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
const done = /* @__PURE__ */ (() => /* @__PURE__ */ new Set())();
let workers = [];
let turn = 0;
let calls = 0;
const waiting = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
function pool() {
	if (workers.length || typeof Worker === "undefined") return workers;
	const n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
	workers = Array.from({ length: n }, () => {
		const w = new Worker(new URL("./worker.ts", {}.url), { type: "module" });
		w.onmessage = (e) => {
			for (const s of e.data.skins) {
				const geo = new three.BufferGeometry();
				geo.setAttribute("position", new three.BufferAttribute(s.pos, 3));
				geo.setAttribute("normal", new three.BufferAttribute(s.nrm, 3));
				geo.setAttribute("color", new three.BufferAttribute(s.col, 3));
				geo.setIndex(new three.BufferAttribute(s.idx, 1));
				keep(s.key, {
					geo,
					bones: s.bones,
					index: s.index,
					weight: s.weight
				});
			}
			waiting.get(e.data.call)?.();
			waiting.delete(e.data.call);
		};
		return w;
	});
	return workers;
}
/** Mesh an actor's skins (`id` as ./casts.ts names it, at a level of detail) in a worker; resolves when they are kept. */
function prepare(id, detail = 1) {
	const key = `${id}@${detail}`;
	if (pending.has(key)) return pending.get(key);
	const ws = pool();
	const p = !ws.length ? Promise.resolve() : new Promise((resolve) => {
		const call = ++calls;
		waiting.set(call, () => {
			done.add(key);
			resolve();
		});
		ws[turn++ % ws.length].postMessage({
			call,
			id,
			detail
		});
	});
	pending.set(key, p);
	return p;
}

//#endregion
//#region src/lib/actors/features.ts
/** the materials an animal is drawn in: 0 its skin (the colours in its vertices), 1 its eyes, wet and glossy */
const animalMaterials = (roughness = .85, more = {}) => [new three.MeshStandardMaterial({
	vertexColors: true,
	roughness,
	...more
}), new three.MeshPhysicalMaterial({
	vertexColors: true,
	roughness: .18,
	clearcoat: 1,
	clearcoatRoughness: .05
})];
/**
* An eye: a ball `r` across at `at`, looking along `dir`, its iris (`iris`, `irisR` of the ball's radius across) round a
* pupil of its shape. `rim`: the dark skin round the edge of what shows.
*/
function eye(at, r, dir, iris, pupil, bone, { irisR = .62, pupilR = .45, rim = "#1d1713" } = {}) {
	const z = new three.Vector3(...dir).normalize();
	const x = new three.Vector3(0, 1, 0).cross(z).normalize();
	if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
	const y = z.clone().cross(x).normalize();
	const c = new three.Vector3(...at);
	const ir = new three.Color(iris), dark = new three.Color("#0b0907"), edge = new three.Color(rim);
	const v = new three.Vector3();
	return {
		geo: egg(at, [
			r,
			r,
			r
		], [
			0,
			0,
			0
		], [22, 16]),
		color: (p) => {
			v.copy(p).sub(c).divideScalar(r);
			const fx = v.dot(x), fy = v.dot(y);
			if (v.dot(z) < Math.cos(Math.asin(irisR))) return `#${edge.getHexString()}`;
			const u = fx / irisR, w = fy / irisR;
			if (pupil === "round" ? u * u + w * w < pupilR * pupilR : pupil === "bar" ? (u / (pupilR * 1.35)) ** 2 + (w / (pupilR * .42)) ** 2 < 1 : (u / (pupilR * .35)) ** 2 + (w / (pupilR * 1.4)) ** 2 < 1) return `#${dark.getHexString()}`;
			const k = Math.min(1, Math.hypot(u, w));
			return `#${ir.clone().multiplyScalar(1.1 - .45 * k * k).getHexString()}`;
		},
		bone,
		mat: 1
	};
}
/** both eyes, the left at `at` looking along `dir` (the right its mirror) */
function eyes(at, r, dir, iris, pupil, bone = "head", o) {
	return [eye(at, r, dir, iris, pupil, bone, o), eye([
		-at[0],
		at[1],
		at[2]
	], r, [
		-dir[0],
		dir[1],
		dir[2]
	], iris, pupil, bone, o)];
}

//#endregion
//#region src/lib/actors/species/bee.ts
function bee() {
	const bones = [
		{
			name: "thorax",
			at: [
				0,
				.012,
				0
			]
		},
		{
			name: "head",
			parent: "thorax",
			at: [
				0,
				.0125,
				.0032
			]
		},
		{
			name: "abdomen",
			parent: "thorax",
			at: [
				0,
				.0115,
				-.0028
			]
		},
		{
			name: "wingL",
			parent: "thorax",
			at: [
				.0013,
				.0146,
				6e-4
			]
		},
		{
			name: "wingR",
			parent: "thorax",
			at: [
				-.0013,
				.0146,
				6e-4
			]
		}
	];
	const s = sculpt(bones);
	s.egg([
		0,
		.012,
		0
	], [
		.0026,
		.0027,
		.0031
	], {
		bone: "thorax",
		tag: "thorax",
		bump: 15e-5,
		lumps: 4e-4
	});
	s.egg([
		0,
		.0122,
		.0044
	], [
		.0019,
		.0021,
		.0014
	], {
		bone: "head",
		k: 6e-4,
		tag: "head"
	});
	s.ball([
		0,
		.0116,
		-.0028
	], 7e-4, {
		bone: "abdomen",
		k: 4e-4,
		tag: "waist"
	});
	s.egg([
		0,
		.0111,
		-.0062
	], [
		.0027,
		.0025,
		.0044
	], {
		bone: "abdomen",
		k: 6e-4,
		tag: "abdomen"
	}, [
		.18,
		0,
		0
	]);
	const gold = new three.Color("#d9a23a"), black = new three.Color("#231c14"), fuzz = new three.Color("#b58a4a");
	const paint = (c, at) => {
		const { p } = at;
		if (at.main === "abdomen") {
			const band = Math.floor((-p.z - .0034) / .00115);
			c.copy(band % 2 === 0 && band < 5 ? gold : black);
		} else if (at.main === "thorax") c.copy(fuzz).multiplyScalar(.85 + .3 * fbm3(p.x * 4e3, p.y * 4e3, p.z * 4e3, 2, 3));
		else c.copy(black);
		mix(c, black, ramp(at.tag("waist"), .3, .6));
	};
	const parts = [{ skin: s.skin(28e-5, paint, "bee") }];
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		parts.push({
			geo: egg([
				x * .00135,
				.0127,
				.0045
			], [
				7e-4,
				.0012,
				8e-4
			], [
				0,
				x * .3,
				0
			]),
			color: "#14100c",
			bone: "head",
			mat: 1
		});
		const knee = [
			x * 7e-4,
			.0152,
			.0062
		];
		parts.push({
			geo: limb([
				x * 5e-4,
				.0131,
				.0056
			], knee, 13e-5, 12e-5, { seg: 5 }),
			color: "#231c14",
			bone: "head"
		});
		parts.push({
			geo: limb(knee, [
				x * .0011,
				.0149,
				.0083
			], 12e-5, 11e-5, { seg: 5 }),
			color: "#231c14",
			bone: "head"
		});
		parts.push({
			geo: egg([
				x * .0047,
				.0149,
				-.0012
			], [
				.0035,
				25e-5,
				.0013
			], [
				0,
				x * .32,
				0
			]),
			color: "#ffffff",
			bone: `wing${side}`,
			mat: 2
		});
		parts.push({
			geo: egg([
				x * .0035,
				.0146,
				-.0029
			], [
				.0022,
				2e-4,
				9e-4
			], [
				0,
				x * .55,
				0
			]),
			color: "#ffffff",
			bone: `wing${side}`,
			mat: 2
		});
		[
			.0013,
			1e-4,
			-.0012
		].forEach((z, i) => {
			const hip = [
				x * .0012,
				.0101,
				z
			];
			const knee2 = [
				x * (.0032 + i * 5e-4),
				.0092 - i * 3e-4,
				z + 4e-4 - i * 6e-4
			];
			const foot = [
				x * (.0036 + i * 6e-4),
				.0062 - i * 4e-4,
				z - 6e-4 - i * 8e-4
			];
			parts.push({
				geo: limb(hip, knee2, 22e-5, 18e-5, { seg: 5 }),
				color: "#231c14",
				bone: "thorax"
			});
			parts.push({
				geo: limb(knee2, foot, 17e-5, 12e-5, { seg: 5 }),
				color: "#231c14",
				bone: "thorax"
			});
			if (i === 2) parts.push({
				geo: egg([
					knee2[0] * 1.02,
					(knee2[1] + foot[1]) / 2,
					(knee2[2] + foot[2]) / 2
				], [
					5e-4,
					8e-4,
					5e-4
				]),
				color: "#e8b03a",
				bone: "thorax"
			});
		});
	}
	parts.push({
		geo: spike([
			0,
			.0106,
			-.0104
		], [
			0,
			-.2,
			-1
		], 3e-4, .001, { seg: 6 }),
		color: "#231c14",
		bone: "abdomen"
	});
	const glass = new three.MeshPhysicalMaterial({
		color: "#f4f8ff",
		roughness: .12,
		transparent: true,
		opacity: .32,
		side: three.DoubleSide,
		depthWrite: false,
		iridescence: .6
	});
	const r = rig(bones, parts, [...animalMaterials(.75), glass]);
	r.object.name = "bee";
	const beat = (t) => {
		const w = t * 70;
		return {
			stroke: Math.sin(w),
			turn: Math.cos(w)
		};
	};
	const wings = (t) => {
		const { stroke, turn } = beat(t);
		return {
			wingL: [
				.45 * turn,
				.55 * stroke,
				.35 + .25 * stroke
			],
			wingR: [
				.45 * turn,
				-.55 * stroke,
				-.35 - .25 * stroke
			]
		};
	};
	const hover = (t) => ({
		...wings(t),
		root: [
			8e-4 * Math.sin(t * 1.3),
			.0015 * Math.sin(t * 5),
			0
		],
		thorax: [
			.1 + .05 * Math.sin(t * 2),
			.25 * wander(t, 1.2, 5),
			0
		],
		abdomen: [
			.12 * Math.sin(t * 4),
			0,
			0
		],
		head: [
			0,
			.15 * wander(t, .9, 8),
			0
		]
	});
	const fly = (t) => ({
		...hover(t),
		thorax: [
			.45,
			0,
			.15 * Math.sin(t * 1.5)
		],
		abdomen: [
			-.2 + .05 * Math.sin(t * 4),
			0,
			0
		]
	});
	return {
		rig: r,
		clips: {
			hover,
			fly
		},
		first: "hover"
	};
}

//#endregion
//#region src/lib/actors/species/ant.js
/** @typedef {import('../rig').BoneSpec} BoneSpec */
/** @typedef {import('../rig').PartSpec} PartSpec */
/** @typedef {import('../rig').Cast} Cast */
/** @typedef {import('../rig').Clip} Clip */
/** @typedef {import('../rig').Pose} Pose */
/** @typedef {import('../rig').V3} V3 */
const RED = "#8a3a1e";
const DARK = "#1a1210";
const LEG = "#5a2a18";
/**
* One ant's parts, standing at `at`, facing along `face` (+1: +z, −1: −z), its body leaning by `pitch` (radians,
* nose up) — all riding `bone`, or its legs riding their own bones (`legs`).
* @param {V3} at @param {number} face @param {number} pitch @param {string} bone
* @param {{ legs?: (side: number, i: number) => string, s?: number, low?: boolean }} [o]
* @returns {PartSpec[]}
*/
function antParts(at, face, pitch, bone, o = {}) {
	const s = o.s ?? 1, low = o.low ?? false;
	const m = new three.Matrix4().compose(new three.Vector3(...at), new three.Quaternion().setFromEuler(new three.Euler(-pitch * face, face < 0 ? Math.PI : 0, 0)), new three.Vector3(s, s, s));
	/** a point of the ant's own frame (it faces +z there) in the actor's */
	const P = (x, y, z) => new three.Vector3(x, y, z).applyMatrix4(m).toArray();
	const eg = (c, r) => {
		const g = egg([
			0,
			0,
			0
		], r, [
			0,
			0,
			0
		], low ? [7, 5] : [12, 8]);
		g.applyMatrix4(new three.Matrix4().makeTranslation(...c)).applyMatrix4(m);
		return g;
	};
	/** @type {PartSpec[]} */
	const parts = [
		{
			geo: eg([
				0,
				.0026,
				.0028
			], [
				9e-4,
				8e-4,
				.001
			]),
			color: RED,
			bone
		},
		{
			geo: eg([
				0,
				.0028,
				8e-4
			], [
				7e-4,
				7e-4,
				.0014
			]),
			color: RED,
			bone
		},
		{
			geo: eg([
				0,
				.0028,
				-8e-4
			], [
				3e-4,
				5e-4,
				3e-4
			]),
			color: DARK,
			bone
		},
		{
			geo: eg([
				0,
				.0029,
				-.0026
			], [
				.0012,
				.0011,
				.0015
			]),
			color: DARK,
			bone,
			mat: 1
		}
	];
	const r = low ? 12e-5 : 1e-4;
	const seg = low ? 3 : 5;
	for (const x of [-1, 1]) {
		const elbow = P(x * 6e-4, .0042, .0034);
		parts.push({
			geo: limb(P(x * 3e-4, .0031, .0034), elbow, r, r, { seg }),
			color: DARK,
			bone
		});
		parts.push({
			geo: limb(elbow, P(x * .0011, .0036, .0053), r, r * .8, { seg }),
			color: DARK,
			bone
		});
		if (!low) parts.push({
			geo: limb(P(x * 3e-4, .0021, .0036), P(x * 1e-4, .002, .0042), r * 1.4, r * .8, { seg }),
			color: LEG,
			bone
		});
	}
	[
		.0013,
		7e-4,
		1e-4
	].forEach((z, i) => {
		for (const x of [-1, 1]) {
			const hip = P(x * 5e-4, .0024, z);
			const knee = P(x * .0022, .0034, z + (1 - i) * .0012);
			const foot = P(x * .0034, 0, z + (1 - i) * .0026);
			const b = o.legs ? o.legs(x, i) : bone;
			parts.push({
				geo: limb(hip, knee, r * 1.4, r * 1.1, { seg }),
				color: LEG,
				bone: b
			});
			parts.push({
				geo: limb(knee, foot, r * 1.1, r * .8, { seg }),
				color: LEG,
				bone: b
			});
		}
	});
	return parts;
}
/** The ant on its own, its legs rigged: walks in a tripod, stops to wave its antennae. */
/** @returns {Cast} */
function ant() {
	/** @type {BoneSpec[]} */
	const bones = [
		{
			name: "body",
			at: [
				0,
				.0026,
				0
			]
		},
		{
			name: "head",
			parent: "body",
			at: [
				0,
				.0028,
				.002
			]
		},
		{
			name: "gaster",
			parent: "body",
			at: [
				0,
				.0028,
				-8e-4
			]
		}
	];
	const legName = (x, i) => `leg${x < 0 ? "L" : "R"}${i}`;
	[
		.0013,
		7e-4,
		1e-4
	].forEach((z, i) => {
		for (const x of [-1, 1]) bones.push({
			name: legName(x, i),
			parent: "body",
			at: [
				x * 5e-4,
				.0024,
				z
			]
		});
	});
	const parts = antParts([
		0,
		0,
		0
	], 1, 0, "body", { legs: legName });
	parts[0] = {
		...parts[0],
		bone: "head"
	};
	parts[2] = {
		...parts[2],
		bone: "gaster"
	};
	parts[3] = {
		...parts[3],
		bone: "gaster"
	};
	for (let k = 4; k < 8; k++) parts[k] = {
		...parts[k],
		bone: "head"
	};
	const r = rig(bones, parts, animalMaterials(.55, {}));
	r.object.name = "ant";
	/** a tripod gait: front and hind of one side with the middle of the other @type {Clip} */
	const walk = (t, m) => {
		const phase = (m?.dist ?? t * .04) / .006 * Math.PI * 2;
		/** @type {Pose} */
		const p = {
			body: [
				0,
				0,
				.04 * Math.sin(phase * 2)
			],
			head: [
				.05 * Math.sin(phase),
				.08 * Math.sin(phase * .5),
				0
			],
			gaster: [
				.06 * Math.sin(phase * 2),
				0,
				0
			]
		};
		[
			0,
			1,
			2
		].forEach((i) => {
			for (const x of [-1, 1]) {
				const group = (i === 1 ? -x : x) > 0 ? 0 : Math.PI;
				const swing = Math.sin(phase + group);
				p[legName(x, i)] = [
					0,
					.45 * swing * x,
					Math.max(0, Math.cos(phase + group)) * .35 * x
				];
			}
		});
		return p;
	};
	/** standing, the antennae sweeping, the head turning @type {Clip} */
	const idle = (t) => ({
		head: [
			.15 * Math.sin(t * 3),
			.35 * wander(t, 1.4, 3),
			.1 * Math.sin(t * 5)
		],
		gaster: [
			.05 * Math.sin(t * 1.3),
			0,
			0
		]
	});
	return {
		rig: r,
		clips: {
			walk,
			idle
		},
		first: "walk"
	};
}
/** the hill's measure: its radius, its height, how many ants on it and round it */
const R = .6;
const H = .45;
const ON = 64;
/** the mound's height at a distance d from its middle */
const surface = (d) => d >= R ? 0 : H * Math.pow(1 - Math.pow(d / R, 1.8), .75);
/** The ant hill and its colony: a thatched mound of needles and twigs, the ants busy all over it. */
/** @returns {Cast} */
function antHill() {
	/** @type {BoneSpec[]} */
	const bones = [{
		name: "mound",
		at: [
			0,
			0,
			0
		]
	}];
	/** @type {PartSpec[]} */
	const parts = [];
	const prof = [];
	for (let k = 0; k <= 60; k++) {
		const d = R * 1.04 * (1 - k / 60);
		prof.push(new three.Vector2(Math.max(1e-4, d), surface(Math.min(d, R * .999)) + (k === 0 ? -.01 : 0)));
	}
	const mound = new three.LatheGeometry(prof, 160);
	const pos = mound.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
		pos.setY(i, y * (1 - .04 * (.5 + .5 * noise3(x * 14, y * 14, z * 14, 5))));
	}
	mound.computeVertexNormals();
	const needle = (p) => {
		const h = hash(Math.round(p.x * 900) * 73856093 ^ Math.round(p.y * 900) * 19349663 ^ Math.round(p.z * 900) * 83492791, 11);
		return h < .42 ? "#6a4228" : h < .72 ? "#8a5230" : h < .95 ? "#3a2618" : "#a88a5a";
	};
	parts.push({
		geo: mound,
		color: needle,
		bone: "mound"
	});
	for (let k = 0; k < 26; k++) {
		const a = hash(k, 21) * Math.PI * 2, d = Math.sqrt(hash(k, 22)) * R * .9;
		const c = new three.Vector3(Math.cos(a) * d, surface(d) + .004, Math.sin(a) * d);
		const dir = new three.Vector3(Math.cos(a + 1.3 + hash(k, 23)), 0, Math.sin(a + 1.3 + hash(k, 23))).multiplyScalar(.04 + .05 * hash(k, 24));
		const a2 = c.clone().sub(dir).toArray(), b2 = c.clone().add(dir).toArray();
		parts.push({
			geo: limb(a2, b2, .003, .0025, { seg: 4 }),
			color: "#5a4030",
			bone: "mound"
		});
	}
	for (let k = 0; k < 14; k++) {
		const a = hash(k, 31) * Math.PI * 2, d = (.15 + .7 * hash(k, 32)) * R;
		parts.push({
			geo: egg([
				Math.cos(a) * d,
				surface(d) + .001,
				Math.sin(a) * d
			], [
				.012,
				.004,
				.012
			], [
				0,
				0,
				0
			], [8, 5]),
			color: "#120c08",
			bone: "mound"
		});
	}
	/** @type {{ name: string, d: number, way: number, speed: number, phase: number }[]} */
	const ants = [];
	for (let i = 0; i < 84; i++) {
		const d = i >= ON ? R * (1.1 + .5 * hash(i, 41)) : R * (.08 + .85 * Math.sqrt(hash(i, 41)));
		const way = hash(i, 42) < .5 ? 1 : -1;
		const name = `ant${i}`;
		bones.push({
			name,
			parent: "mound",
			at: [
				0,
				0,
				0
			]
		});
		parts.push(...antParts([
			d,
			surface(d) + .001,
			0
		], -way, 0, name, { low: true }));
		ants.push({
			name,
			d,
			way,
			speed: (.03 + .03 * hash(i, 43)) / d,
			phase: hash(i, 44) * 100
		});
	}
	const r = rig(bones, parts, animalMaterials(.8, {}));
	r.object.name = "ant-hill";
	/** how far an ant has gone round by t: on, a stop, on again; now and then the other way */
	const travel = (a, t, busy) => {
		const u = t + a.phase;
		const go = Math.max(0, wander(u, 2.5, a.phase * 7) + busy - .2);
		return a.way * a.speed * (u * .6 * busy + go * 1.8 + .4 * Math.sin(u * .7));
	};
	/** the colony in the sun @type {Clip} */
	const busy = (t) => Object.fromEntries(ants.map((a) => [a.name, [
		0,
		travel(a, t, 1) + a.phase,
		0
	]]));
	/** a cool morning: most still, a few moving @type {Clip} */
	const calm = (t) => Object.fromEntries(ants.map((a) => [a.name, [
		0,
		travel(a, t, .15) + a.phase,
		0
	]]));
	return {
		rig: r,
		clips: {
			busy,
			calm
		},
		first: "busy"
	};
}

//#endregion
//#region src/lib/actors/motion.ts
const TAU = /* @__PURE__ */ (() => Math.PI * 2)();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => {
	const t = clamp(x, 0, 1);
	return t * t * (3 - 2 * t);
};
const frac = (x) => x - Math.floor(x);
/** A skeleton at rest, to pose by reckoning: where each bone's joint goes when the bones above it are turned. */
function skeleton(bones) {
	const by = new Map(bones.map((b) => [b.name, b]));
	const root = bones[0].name;
	const e = new three.Euler(), q = new three.Quaternion(), v = new three.Vector3(), s = new three.Vector3(), own = new three.Matrix4();
	/** the frame of a bone as posed: its joint at the origin, turned as it and every bone above it are (model space) */
	const frame = (pose, name, out = new three.Matrix4()) => {
		const b = by.get(name);
		if (b.parent) frame(pose, b.parent, out);
		const t = pose[name];
		q.setFromEuler(e.set(t?.[0] ?? 0, t?.[1] ?? 0, t?.[2] ?? 0));
		const k = t?.[3] ?? 1;
		s.set(k, k, k);
		if (!b.parent) {
			const r = pose.root ?? [
				0,
				0,
				0
			];
			return out.compose(v.set(b.at[0] + r[0], b.at[1] + r[1], b.at[2] + r[2]), q, s);
		}
		const p = by.get(b.parent);
		return out.multiply(own.compose(v.set(b.at[0] - p.at[0], b.at[1] - p.at[1], b.at[2] - p.at[2]), q, s));
	};
	/** where a bone's joint is, as posed */
	const joint = (pose, name) => new three.Vector3().setFromMatrixPosition(frame(pose, name));
	/** the frame a bone turns in: its parent's, moved to its joint */
	const seat = (pose, name) => {
		const b = by.get(name);
		if (!b.parent) {
			const r = pose.root ?? [
				0,
				0,
				0
			];
			return new three.Matrix4().makeTranslation(b.at[0] + r[0], b.at[1] + r[1], b.at[2] + r[2]);
		}
		const p = by.get(b.parent);
		return frame(pose, b.parent).multiply(new three.Matrix4().makeTranslation(b.at[0] - p.at[0], b.at[1] - p.at[1], b.at[2] - p.at[2]));
	};
	return {
		root,
		at: (name) => by.get(name).at,
		has: (name) => by.has(name),
		frame,
		joint,
		seat
	};
}
const phi = (y, z) => Math.atan2(z, y);
const setTurn = (pose, name, x) => {
	const t = pose[name] ?? [
		0,
		0,
		0
	];
	pose[name] = [
		x,
		t[1],
		t[2],
		...t.length === 4 ? [t[3]] : []
	];
};
/**
* Two bones (a thigh and a shin, a neck's two halves) bent so the far end of the second reaches `target` (model
* space): the pair swung the shortest way to point at it, then the joint between them bent, on the side it bends at
* rest, just enough for the far end to arrive. In three dimensions — a foot under a rolling body, a waddle's — and the
* bones twisted no more than the swing needs. `end`: the joint at the far end (the next bone's, or a point).
*/
function reach(sk, pose, a, b, end, target) {
	const A = sk.at(a), Bj = sk.at(b);
	const knee = new three.Vector3(Bj[0] - A[0], Bj[1] - A[1], Bj[2] - A[2]);
	const tip = new three.Vector3(end[0] - A[0], end[1] - A[1], end[2] - A[2]);
	const shin = tip.clone().sub(knee);
	const la = knee.length(), lb = shin.length();
	const to = target.clone().applyMatrix4(sk.seat(pose, a).invert());
	const d = clamp(to.length(), Math.abs(la - lb) * 1.01 + 1e-6, (la + lb) * .9995);
	const dir = to.normalize();
	const swing = new three.Quaternion().setFromUnitVectors(tip.clone().normalize(), dir);
	const k1 = knee.clone().applyQuaternion(swing).normalize();
	const axis = dir.clone().cross(k1);
	if (axis.lengthSq() < 1e-12) axis.set(1, 0, 0).applyQuaternion(swing);
	axis.normalize();
	const open = Math.acos(clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1));
	const kd = dir.clone().applyAxisAngle(axis, open);
	const qa = new three.Quaternion().setFromUnitVectors(k1, kd).multiply(swing);
	const want = dir.multiplyScalar(d).sub(kd.multiplyScalar(la)).applyQuaternion(qa.clone().invert()).normalize();
	const qb = new three.Quaternion().setFromUnitVectors(shin.normalize(), want);
	setQuat(pose, a, qa);
	setQuat(pose, b, qb);
}
const euler = /* @__PURE__ */ (() => new three.Euler())();
/** a bone's turn as a quaternion (its size kept) */
function setQuat(pose, name, q) {
	euler.setFromQuaternion(q);
	const t = pose[name];
	pose[name] = [
		euler.x,
		euler.y,
		euler.z,
		...t && t.length === 4 ? [t[3]] : []
	];
}
/**
* A bone turned (about x, in its swing plane) so that it points along `dir` (model space), whatever its parents do:
* `tip`, the point it points to at rest.
*/
function aim(sk, pose, bone, tip, dir) {
	const at = sk.at(bone);
	const m = sk.seat(pose, bone);
	const local = dir.clone().transformDirection(m.invert());
	setTurn(pose, bone, phi(local.y, local.z) - phi(tip[1] - at[1], tip[2] - at[2]));
}
/**
* A bone turned (any way) so that it points along `dir` (model space), whatever its parents do: `tip`, the point it
* points to at rest. For limbs that do not swing in one plane (a frog's, folded out to the side).
*/
function point(sk, pose, bone, tip, dir) {
	const at = sk.at(bone);
	const local = dir.clone().transformDirection(sk.seat(pose, bone).invert());
	const rest = new three.Vector3(tip[0] - at[0], tip[1] - at[1], tip[2] - at[2]).normalize();
	setQuat(pose, bone, new three.Quaternion().setFromUnitVectors(rest, local));
}
/** A direction: the rest direction from a to b, turned by `angle` about x (positive: its far end swings back). */
const swung = (a, b, angle) => new three.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize().applyAxisAngle(new three.Vector3(1, 0, 0), angle);
/** A foot in the cycle: on the ground (`stance` true) or carried, how far through that it is (0…1). */
function foot(g, m, leg) {
	const p = frac(m.dist / g.stride + 1 - (g.feet[leg] ?? 0));
	return p < g.duty ? {
		stance: true,
		u: p / g.duty
	} : {
		stance: false,
		u: (p - g.duty) / (1 - g.duty)
	};
}
/**
* Where a foot is, from where it rests: forward (z) and up (y) in the body's frame. On the ground it slides back
* under the body exactly as the body moves on (it stays where it was put down); carried, it swings forward and up.
* `pace`: 0…1, how much of the gait is in it (0 standing: the foot at rest).
*/
function footAt(g, m, leg, pace = 1) {
	const f = foot(g, m, leg);
	const sweep = g.stride * g.duty;
	if (f.stance) return {
		...f,
		z: sweep * (.5 - f.u) * pace,
		y: 0
	};
	const u = smooth(f.u);
	const up = Math.sin(Math.PI * Math.pow(f.u, .75));
	return {
		...f,
		z: sweep * (u - .5) * pace,
		y: g.lift * up * Math.min(1, pace * 2)
	};
}
/** a motion at a pace on the spot: for showing a gait where nothing moves the actor (the Actors gallery) */
const onTheSpot = (t, speed, m) => m ?? {
	dist: t * speed,
	speed
};
/** the body's rise and fall over a stride: twice per cycle (a walk's), or `per` times */
const bobOf = (g, m, at = 0, per = 2) => Math.cos(TAU * per * (m.dist / g.stride - at));
/** a chain's segments swaying as a wave runs down it: `amp` at the root growing by `grow` a segment, `lag` (rad) a segment */
function wave(names, t, freq, amp, axis, lag = .6, grow = 1.25) {
	const out = {};
	names.forEach((n, i) => {
		const r = [
			0,
			0,
			0
		];
		r[axis] = amp * Math.pow(grow, i) * Math.sin(TAU * freq * t - lag * i);
		out[n] = r;
	});
	return out;
}

//#endregion
//#region src/lib/actors/plans/bird.ts
const mirror$1 = (p) => [
	-p[0],
	p[1],
	p[2]
];
const SIDES$1 = ["L", "R"];
function birdSkeleton(j) {
	const neck = j.neck.map((_, i) => `neck${i + 1}`);
	const bones = [
		{
			name: "body",
			at: j.body
		},
		...neck.map((name, i) => ({
			name,
			parent: i ? neck[i - 1] : "body",
			at: j.neck[i]
		})),
		{
			name: "head",
			parent: neck[neck.length - 1],
			at: j.head
		},
		{
			name: "tail",
			parent: "body",
			at: j.tail
		},
		...SIDES$1.flatMap((s) => {
			const m = (p) => s === "L" ? p : mirror$1(p);
			return [
				{
					name: `wing${s}`,
					parent: "body",
					at: m(j.wing)
				},
				{
					name: `thigh${s}`,
					parent: "body",
					at: m(j.leg[0])
				},
				{
					name: `shank${s}`,
					parent: `thigh${s}`,
					at: m(j.leg[1])
				},
				{
					name: `tarsus${s}`,
					parent: `shank${s}`,
					at: m(j.leg[2])
				},
				{
					name: `toes${s}`,
					parent: `tarsus${s}`,
					at: m(j.leg[3])
				}
			];
		})
	];
	return {
		bones,
		j,
		neck,
		sk: skeleton(bones),
		toe: {
			L: j.leg[4],
			R: mirror$1(j.leg[4])
		}
	};
}
/** Both legs to their feet: on the ground where the gait (or `plant`) puts them, the body as `pose` has it. */
function birdLegs(b, pose, g, m, pace, plant = {}) {
	const { sk, toe } = b;
	for (const s of SIDES$1) {
		const ankle = sk.at(`tarsus${s}`), toes = sk.at(`toes${s}`);
		const step = g && m ? footAt(g, m, s, pace) : {
			stance: true,
			u: .5,
			z: 0,
			y: 0
		};
		const extra = plant[s];
		const target = new three.Vector3(toes[0], toes[1] + step.y + (extra?.y ?? 0), toes[2] + step.z + (extra?.z ?? 0));
		let lean = 0, curl = extra?.curl ?? 0;
		if (g) {
			if (step.stance) lean = g.tilt * pace * (step.u - .5);
			else {
				lean = g.tilt * pace * (.5 - step.u) + g.fold * Math.min(1, pace * 1.5) * Math.sin(Math.PI * step.u);
				curl += g.curl * Math.min(1, pace * 1.5) * Math.sin(Math.PI * Math.min(1, step.u * 1.2));
			}
		}
		const tarsus = swung(ankle, toes, lean);
		const len = Math.hypot(toes[0] - ankle[0], toes[1] - ankle[1], toes[2] - ankle[2]);
		reach(sk, pose, `thigh${s}`, `shank${s}`, ankle, target.clone().addScaledVector(tarsus, -len));
		point(sk, pose, `tarsus${s}`, toes, tarsus);
		point(sk, pose, `toes${s}`, toe[s], swung(toes, toe[s], curl));
	}
}
/** The head carried to a point (model space) by the last two neck bones, the beak along `look`. */
function birdHead(b, pose, target, look) {
	const { sk, j, neck } = b;
	const n = neck.length;
	reach(sk, pose, neck[n - 2], neck[n - 1], j.head, target);
	aim(sk, pose, "head", j.beak, look);
}
/**
* A bird's moves: each gait in `life.gaits`, standing (`idle`), and from the ground: `peck` (a hen's quick strikes),
* `scratch` (a hen raking the ground back with one foot, then the other), `graze` (a goose's long-necked cropping),
* `flap` (the wings beaten), `hiss` (a goose's neck low and wings half out).
*/
function birdMoves(b, life) {
	const { j, neck } = b;
	const seed = life.seed ?? 1;
	const beakDir = new three.Vector3(j.beak[0] - j.head[0], j.beak[1] - j.head[1], j.beak[2] - j.head[2]).normalize();
	const headLen = Math.hypot(j.beak[0] - j.head[0], j.beak[1] - j.head[1], j.beak[2] - j.head[2]);
	const rest = (t) => ({
		tail: [
			.04 * Math.sin(t * 1.3 + seed),
			.06 * wander(t, 2.5, seed + 4),
			0
		],
		root: [
			0,
			.002 * Math.sin(t * 2.2),
			0
		],
		...life.carry ? { [neck[0]]: [
			-life.carry,
			0,
			0
		] } : {}
	});
	const moves = {};
	for (const [name, g] of Object.entries(life.gaits)) moves[name] = (t, m) => {
		const mo = onTheSpot(t, g.speed, m);
		const pace = clamp(mo.speed / g.speed, 0, 1.4);
		const ph = mo.dist / g.stride;
		const sway = Math.sin(TAU * ph);
		const turn = clamp(mo.turn ?? 0, -1.5, 1.5);
		const pose = {
			root: [
				-g.roll * .15 * pace * sway,
				-g.bob * pace * (.5 + .5 * Math.cos(TAU * 2 * ph)),
				0
			],
			body: [
				g.pitch * pace * Math.sin(TAU * 2 * ph),
				-turn * .1,
				g.roll * pace * sway
			],
			tail: [
				.05 * pace,
				(life.wag ?? .1) * pace * Math.sin(TAU * ph - 1),
				0
			]
		};
		if (life.carry) pose[neck[0]] = [
			-life.carry,
			0,
			0
		];
		birdLegs(b, pose, g, mo, Math.min(1, pace));
		if (g.hold > 0) {
			const u = frac(2 * ph);
			const span = g.stride / 2 * g.hold * Math.min(1, pace);
			const z = u < g.hold ? span * (.5 - u / g.hold) : span * (-.5 + smooth((u - g.hold) / (1 - g.hold)));
			birdHead(b, pose, new three.Vector3(0, j.head[1], j.head[2] + z + .01), beakDir.clone());
		} else {
			const give = .025 * pace * Math.sin(TAU * 2 * ph);
			pose[neck[neck.length - 1]] = [
				give,
				turn * .2,
				0
			];
			pose.head = [
				-give,
				turn * .15,
				0
			];
		}
		return pose;
	};
	moves.idle = (t) => {
		const pose = rest(t);
		const k = life.steady ?? 1;
		const look = wander(t, 1.6 * k, seed + 1), up = wander(t, 2.3 * k, seed + 3);
		birdLegs(b, pose, null, null, 0);
		birdHead(b, pose, new three.Vector3(.01 * look, j.head[1] + .01 * up, j.head[2] - .01 + .01 * up), beakDir.clone().applyAxisAngle(new three.Vector3(0, 1, 0), .9 / Math.sqrt(k) * look).applyAxisAngle(new three.Vector3(1, 0, 0), -.15 / k * up));
		return pose;
	};
	/** the head down to the ground ahead of the feet, `k` of the way (0: up as it stands) */
	const down = (pose, k, ahead, side = 0) => {
		const look = new three.Vector3(0, -.85, .5).normalize().lerp(beakDir, 1 - k).normalize();
		const low = new three.Vector3(side, .006, b.toe.L[2] + ahead).clone().addScaledVector(look, -headLen);
		birdHead(b, pose, new three.Vector3(...j.head).lerp(low, k), look);
	};
	moves.peck = (t) => {
		const pose = rest(t);
		const burst = frac(t / 2.4) < .6;
		const bend = .55 + .4 * (burst ? Math.pow(Math.max(0, Math.sin(t * 11)), 3) : 0);
		pose.body = [
			.35 * (burst ? 1 : .6),
			0,
			0
		];
		birdLegs(b, pose, null, null, 0);
		down(pose, burst ? bend : .35, .06 + .01 * wander(t, 1, seed), .02 * wander(t, 1.7, seed + 5));
		return pose;
	};
	moves.scratch = (t) => {
		const pose = rest(t);
		const u = frac(t / 2.2);
		const s = u < .5 ? "L" : "R";
		const k = frac(u * 4);
		const rake = u < .92 ? k : 0;
		const z = .05 - .12 * smooth(rake) + .07 * smooth((rake - .75) / .25);
		const y = rake > .75 ? .03 * Math.sin(Math.PI * (rake - .75) / .25) : 0;
		pose.body = [
			.2,
			0,
			(s === "L" ? -1 : 1) * .06
		];
		birdLegs(b, pose, null, null, 0, { [s]: {
			z,
			y,
			curl: rake > .75 ? .6 : -.15
		} });
		down(pose, .35 + .2 * Math.sin(t * 3), .05);
		return pose;
	};
	/** the neck's length, joint to joint, from its base to the head */
	const neckLen = [...j.neck, j.head].reduce((sum, p, i, all) => i ? sum + Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1], p[2] - all[i - 1][2]) : 0, 0);
	moves.graze = (t) => {
		const pose = rest(t);
		const nibble = Math.max(0, Math.sin(t * 7)) ** 2;
		const side = .05 * wander(t, 2.6, seed + 6);
		pose.body = [
			.22,
			0,
			0
		];
		birdLegs(b, pose, null, null, 0);
		const look = new three.Vector3(side * .6, -.8, .6).normalize();
		const base = b.sk.joint(pose, neck[0]);
		const headY = .008 + .012 * nibble - look.y * headLen * .9;
		const drop = base.y - headY;
		const ahead = Math.sqrt(Math.max(.04 ** 2, (.97 * neckLen) ** 2 - drop * drop));
		const target = new three.Vector3(side, headY, base.z + ahead);
		point(b.sk, pose, neck[0], j.neck[1] ?? j.head, target.clone().sub(base));
		birdHead(b, pose, target, look);
		return pose;
	};
	moves.flap = (t) => {
		const pose = rest(t);
		const w = Math.sin(t * 15);
		pose.root = [
			0,
			.012 * Math.max(0, w),
			0
		];
		pose.body = [
			-.35,
			0,
			0
		];
		pose.wingL = [
			.2 * w,
			0,
			.5 + .9 * (.5 + .5 * w)
		];
		pose.wingR = [
			.2 * w,
			0,
			-.5 - .9 * (.5 + .5 * w)
		];
		birdLegs(b, pose, null, null, 0);
		birdHead(b, pose, new three.Vector3(0, j.head[1] + .02, j.head[2] - .02), new three.Vector3(0, .3, 1).normalize());
		return pose;
	};
	moves.hiss = (t) => {
		const pose = rest(t);
		const sway = Math.sin(t * 2.5);
		pose.body = [
			.15,
			0,
			0
		];
		if (life.carry) pose[neck[0]] = [
			.75,
			.1 * sway,
			0
		];
		pose.wingL = [
			0,
			0,
			.55 + .1 * Math.sin(t * 9)
		];
		pose.wingR = [
			0,
			0,
			-.55 - .1 * Math.sin(t * 9)
		];
		birdLegs(b, pose, null, null, 0);
		birdHead(b, pose, new three.Vector3(.03 * sway, j.body[1] + .08, j.head[2] + headLen * 1.2), new three.Vector3(.1 * sway, -.1, 1).normalize());
		return pose;
	};
	return moves;
}

//#endregion
//#region src/lib/actors/species/chicken.ts
const CHICKEN_KINDS = [
	"red",
	"leghorn",
	"australorp",
	"barred",
	"buff",
	"speckled",
	"rooster",
	"chick"
];
const LOOK$4 = {
	red: {
		body: "#9a5a2e",
		neck: "#c98a45",
		wing: "#7e4523",
		tail: "#2c2620",
		legs: "#e3b85a",
		comb: 1,
		lobe: "#c63a2c",
		fluff: 1
	},
	leghorn: {
		body: "#f4f1ea",
		neck: "#f7f4ee",
		wing: "#ebe7de",
		tail: "#f1eee6",
		legs: "#efc34a",
		comb: 1.45,
		lobe: "#f2efe6",
		fluff: .92
	},
	australorp: {
		body: "#1b1d1b",
		neck: "#202421",
		wing: "#1a1c1a",
		tail: "#151816",
		legs: "#4a4a52",
		comb: 1.05,
		lobe: "#c63a2c",
		fluff: 1.06
	},
	barred: {
		body: "#8e9090",
		neck: "#9a9c9b",
		wing: "#888a8a",
		tail: "#7e8080",
		legs: "#e8c050",
		comb: 1,
		lobe: "#c63a2c",
		fluff: 1.05
	},
	buff: {
		body: "#d9a45a",
		neck: "#e3b469",
		wing: "#cf9a50",
		tail: "#c48c44",
		legs: "#e8d2c0",
		comb: .9,
		lobe: "#c63a2c",
		fluff: 1.16
	},
	speckled: {
		body: "#6e3a1e",
		neck: "#7a4422",
		wing: "#673620",
		tail: "#2a221c",
		legs: "#ead6c4",
		comb: .95,
		lobe: "#c63a2c",
		fluff: 1.08
	},
	rooster: {
		body: "#9a3a1a",
		neck: "#e09a3a",
		wing: "#8a3218",
		tail: "#16201c",
		legs: "#e3b85a",
		comb: 1.9,
		lobe: "#c63a2c",
		fluff: 1
	}
};
/** a hen's joints; the rooster stands taller, the chick is a third her size with a big head */
function joints(kind) {
	const j = {
		body: [
			0,
			.245,
			0
		],
		neck: [[
			0,
			.29,
			.1
		], [
			0,
			.35,
			.135
		]],
		head: [
			0,
			.415,
			.155
		],
		beak: [
			0,
			.405,
			.215
		],
		tail: [
			0,
			.3,
			-.12
		],
		wing: [
			.085,
			.29,
			.07
		],
		leg: [
			[
				.045,
				.22,
				.005
			],
			[
				.05,
				.165,
				.055
			],
			[
				.05,
				.105,
				-.01
			],
			[
				.05,
				.012,
				.012
			],
			[
				.05,
				0,
				.075
			]
		]
	};
	if (kind === "rooster") {
		const up = (p, dy, dz = 0) => [
			p[0],
			p[1] + dy,
			p[2] + dz
		];
		return {
			j: {
				body: up(j.body, .04),
				neck: [up(j.neck[0], .06, .01), up(j.neck[1], .09, .01)],
				head: up(j.head, .12, 0),
				beak: up(j.beak, .12, .005),
				tail: up(j.tail, .05),
				wing: up(j.wing, .045),
				leg: [
					up(j.leg[0], .04),
					up(j.leg[1], .035, .005),
					up(j.leg[2], .02),
					j.leg[3],
					j.leg[4]
				]
			},
			k: 1.15
		};
	}
	if (kind === "chick") {
		const s = .36;
		const sc = (p, big = 1) => [
			p[0] * s * big,
			p[1] * s * big,
			p[2] * s * big
		];
		return {
			j: {
				body: sc(j.body),
				neck: [sc(j.neck[0]), sc(j.neck[1])],
				head: [
					0,
					.4 * s * 1.03,
					.15 * s * 1.1
				],
				beak: [
					0,
					.395 * s * 1.03,
					.2 * s * 1.12
				],
				tail: sc(j.tail),
				wing: sc(j.wing),
				leg: j.leg.map((p) => sc(p))
			},
			k: s
		};
	}
	return {
		j,
		k: 1
	};
}
function chicken(kind = "red") {
	const { j, k } = joints(kind);
	const b = birdSkeleton(j);
	const s = sculpt(b.bones);
	const chick = kind === "chick";
	const L = chick ? {
		body: "#f2d36a",
		neck: "#f4da78",
		wing: "#ecc95c",
		tail: "#ecc95c",
		legs: "#f0b860",
		comb: 0,
		lobe: "#f2d36a",
		fluff: 1
	} : LOOK$4[kind];
	const f = L.fluff;
	const at = (p) => [
		p[0] * k,
		p[1] * k,
		p[2] * k
	];
	const feather = {
		tag: "feather",
		bump: chick ? .0015 : .004 * f,
		lumps: chick ? .004 : .011
	};
	if (chick) {
		s.egg([
			0,
			.088,
			0
		], [
			.034,
			.033,
			.042
		], {
			bone: "body",
			...feather
		}, [
			.2,
			0,
			0
		]);
		s.ball(j.head, .022, {
			bone: "head",
			k: .012,
			...feather
		});
		s.cone(j.neck[0], j.head, .02, .018, {
			chain: b.neck,
			k: .01,
			...feather
		});
		for (const x of [-1, 1]) s.egg([
			x * .03,
			.09,
			0
		], [
			.008,
			.02,
			.028
		], {
			bone: `wing${x > 0 ? "L" : "R"}`,
			k: .008,
			...feather,
			tag: "wing"
		});
	} else {
		s.egg(at([
			0,
			.245,
			-.005
		]), [
			.09 * f,
			.1 * f,
			.145 * f
		], {
			bone: "body",
			...feather
		}, [
			.3,
			0,
			0
		]);
		s.egg(at([
			0,
			.222,
			.07
		]), [
			.082 * f,
			.088 * f,
			.08 * f
		], {
			bone: "body",
			k: .04,
			...feather
		});
		s.egg(at([
			0,
			.295,
			-.06
		]), [
			.07 * f,
			.055 * f,
			.1
		], {
			bone: "body",
			k: .04,
			...feather
		}, [
			-.25,
			0,
			0
		]);
		s.egg(at([
			0,
			.2,
			-.095
		]), [
			.075 * f,
			.065 * f,
			.065 * f
		], {
			bone: "body",
			k: .04,
			...feather
		});
		s.cone(j.neck[0], j.head, (kind === "rooster" ? .05 : .045) * f, .026, {
			chain: b.neck,
			k: .035,
			...feather,
			tag: "neck"
		});
		s.ball(j.head, .03 * (kind === "rooster" ? 1.05 : 1), {
			bone: "head",
			k: .015,
			tag: "neck",
			bump: .001,
			lumps: .008
		});
		for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
			x * .083 * f * k,
			.265 * k,
			-.005 * k
		], [
			.028,
			.068 * f,
			.12 * f
		], {
			bone: `wing${side}`,
			k: .02,
			...feather,
			tag: "wing"
		}, [
			.32,
			0,
			0
		]);
		s.cone(at([
			0,
			.3,
			-.1
		]), at([
			0,
			.37,
			-.165
		]), .052 * f, .025, {
			bone: "tail",
			k: .03,
			...feather,
			tag: "tail"
		});
	}
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const knee = j.leg[1], ankle = j.leg[2];
		s.egg([
			x * knee[0],
			(knee[1] + ankle[1]) / 2 + .006 * k,
			(knee[2] + ankle[2]) / 2
		], [
			.032 * k * f,
			.05 * k,
			.04 * k * f
		], {
			bone: `shank${side}`,
			k: .03 * k,
			...feather,
			tag: "thigh"
		}, [
			-.6,
			0,
			0
		]);
	}
	const body = new three.Color(L.body), neck = new three.Color(L.neck), wing = new three.Color(L.wing), tail = new three.Color(L.tail), red = new three.Color("#c8392b");
	const sheen = new three.Color("#1d3a2c"), white = new three.Color("#f3efe6"), t = new three.Color();
	const paint = (c, sf) => {
		const { p, n } = sf;
		const parts = [
			[body, sf.tag("feather") + sf.tag("thigh")],
			[neck, sf.tag("neck")],
			[wing, sf.tag("wing")],
			[tail, sf.tag("tail")]
		];
		c.setRGB(0, 0, 0);
		let sum = 0;
		for (const [col, w] of parts) {
			c.r += col.r * w;
			c.g += col.g * w;
			c.b += col.b * w;
			sum += w;
		}
		c.multiplyScalar(1 / (sum || 1));
		const scale = noise3(p.x * 260, p.y * 260, p.z * 260, 3);
		c.multiplyScalar(.94 + .1 * scale);
		if (kind === "barred") {
			const bar = Math.sin((p.y * .6 - p.z * .8) * 420 + 3 * fbm3(p.x * 40, p.y * 40, p.z * 40, 2, 5));
			t.set("#3a3c3d");
			c.lerp(white, ramp(bar, .1, .4) * .7).lerp(t, ramp(-bar, .2, .5) * .6);
		} else if (kind === "speckled") {
			const dot = noise3(p.x * 180, p.y * 180, p.z * 180, 11);
			c.lerp(white, ramp(dot, .45, .6)).lerp(t.set("#151210"), ramp(dot, .3, .42) * (1 - ramp(dot, .45, .6)) * .7);
		} else if (kind === "australorp" || kind === "rooster") {
			const shine = ramp(n.y, .2, .9) * (kind === "rooster" ? sf.tag("tail") + ramp(.25, .18, p.y) * sf.tag("feather") : 1);
			if (kind === "rooster") c.lerp(t.set("#15211b"), ramp(.3, .22, p.y) * sf.tag("feather") * ramp(p.z, -.02, .06));
			c.lerp(sheen, .35 * shine);
		} else if (kind === "red") {
			mix(c, "#b8743c", .4 * ramp(n.z, .3, .9) * sf.tag("feather"));
			mix(c, "#5a3418", .3 * sf.tag("neck") * ramp(fbm3(p.x * 300, p.y * 80, p.z * 300, 2, 4), .1, .4));
		}
		if (!chick && sf.main === "neck" && Math.hypot(Math.abs(p.x) - .025 * k, p.y - j.head[1] - .005, p.z - j.head[2] - .018) < .016 * k) mix(c, red, .8);
	};
	const parts = [{ skin: s.skin(chick ? .003 : kind === "rooster" ? .0076 : .0068, paint, `chicken-${kind}`) }];
	const beakC = kind === "australorp" ? "#3c3a38" : chick ? "#e8a84a" : "#e0b45a";
	const hb = j.head, by = hb[1], bz = hb[2];
	/** the head's radius: the face is laid out on it */
	const rh = chick ? .022 : kind === "rooster" ? .0315 : .03;
	parts.push({
		geo: spike([
			0,
			by - .07 * rh,
			bz + .78 * rh
		], [
			0,
			-.28,
			1
		], .4 * rh, (chick ? .6 : 1.12) * rh, { flat: .8 }),
		color: beakC,
		bone: "head"
	});
	parts.push(...eyes([
		.73 * rh,
		by + .2 * rh,
		bz + .4 * rh
	], (chick ? .25 : .21) * rh, [
		.9,
		.1,
		.42
	], chick ? "#1a1410" : "#d4762a", "round", "head", {
		irisR: .75,
		pupilR: .42
	}));
	if (!chick) {
		const c = L.comb;
		const flop = kind === "leghorn" ? .5 : 0;
		for (let i = 0; i < 5; i++) {
			const z = bz - .018 + i * .012, h = (.018 + .012 * Math.sin(Math.PI * (i + .5) / 5)) * c;
			parts.push({
				geo: egg([
					flop * h * .4,
					by + .024 + h * .5,
					z
				], [
					.004,
					h * .55,
					.0075
				], [
					0,
					0,
					-flop
				]),
				color: "#c8392b",
				bone: "head"
			});
		}
		parts.push({
			geo: egg([
				0,
				by + .024 + .006 * c,
				bz + .004
			], [
				.004,
				.009 * c,
				.03
			], [
				0,
				0,
				-flop * .6
			]),
			color: "#c8392b",
			bone: "head"
		});
		for (const x of [-1, 1]) {
			parts.push({
				geo: egg([
					x * .007,
					by - .026 * c,
					bz + .018
				], [
					.006,
					.014 * c,
					.01
				]),
				color: "#c8392b",
				bone: "head"
			});
			parts.push({
				geo: egg([
					x * .027 * k,
					by - .006,
					bz - .006
				], [
					.003,
					.007,
					.006
				]),
				color: L.lobe,
				bone: "head"
			});
		}
		const fan = kind === "rooster" ? 7 : 6;
		for (let i = 0; i < fan; i++) {
			const a = (i / (fan - 1) - .5) * .9;
			const len = (kind === "rooster" ? .13 : .09) * (1 - Math.abs(a) * .4);
			const base = at([
				Math.sin(a) * .03,
				.34,
				-.15
			]);
			const dir = new three.Vector3(Math.sin(a) * .35, .75, -.6).normalize();
			const mid = [
				base[0] + dir.x * len * .5,
				base[1] + dir.y * len * .5,
				base[2] + dir.z * len * .5
			];
			parts.push({
				geo: egg(mid, [
					.004,
					len * .5,
					.022
				], [
					Math.atan2(-dir.z, dir.y),
					0,
					-Math.sin(a) * .6
				]),
				color: L.tail,
				bone: "tail"
			});
		}
		if (kind === "rooster") for (const x of [-1, 1]) for (let i = 0; i < 2; i++) {
			const pts = [];
			for (let q = 0; q <= 6; q++) {
				const u = q / 6, a = .2 + u * 2.6;
				pts.push([
					x * (.015 + .012 * i),
					.4 + .12 * Math.sin(a) * (1 - .15 * i),
					-.15 - .13 * (1 - Math.cos(a)) * .6 - .05 * u
				]);
			}
			for (let q = 0; q < 6; q++) parts.push({
				geo: limb(pts[q], pts[q + 1], .009 - q * .0011, .008 - q * .0011, {
					flat: .35,
					seg: 6
				}),
				color: "#121a17",
				bone: "tail"
			});
		}
	}
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const ankle = [
			x * j.leg[2][0],
			j.leg[2][1],
			j.leg[2][2]
		], toes = [
			x * j.leg[3][0],
			j.leg[3][1],
			j.leg[3][2]
		];
		parts.push({
			geo: limb([
				ankle[0],
				ankle[1] + .008 * k,
				ankle[2]
			], toes, .0085 * k, .007 * k, { seg: 7 }),
			color: L.legs,
			bone: `tarsus${side}`
		});
		for (const [dx, dz, len] of [
			[
				0,
				1,
				.062
			],
			[
				.55,
				.85,
				.05
			],
			[
				-.55,
				.85,
				.05
			],
			[
				0,
				-1,
				.026
			]
		]) {
			const tip = [
				toes[0] + x * dx * len * k * .7,
				.003 * k,
				toes[2] + dz * len * k
			];
			parts.push({
				geo: limb(toes, tip, .0045 * k, .0028 * k, { seg: 5 }),
				color: L.legs,
				bone: `toes${side}`
			});
		}
	}
	const r = rig(b.bones, parts, animalMaterials(.88));
	r.object.name = `chicken-${kind}`;
	const stride = .24 * (chick ? .45 : kind === "rooster" ? 1.1 : 1);
	return {
		rig: r,
		clips: birdMoves(b, {
			seed: CHICKEN_KINDS.indexOf(kind) + 41,
			gaits: { walk: {
				speed: chick ? .25 : .45,
				stride,
				duty: .62,
				feet: {
					L: 0,
					R: .5
				},
				lift: .035 * k,
				bob: .006 * k,
				roll: .05,
				pitch: .02,
				tilt: .5,
				fold: 1.2,
				curl: 1.1,
				hold: .68
			} },
			wag: .06
		}),
		first: "walk",
		gears: { walk: chick ? .25 : .45 },
		feet: ["toesL", "toesR"]
	};
}

//#endregion
//#region src/lib/actors/species/fish.ts
const FISH_KINDS = [
	"koi",
	"kohaku",
	"ogon",
	"carp",
	"nile",
	"redtilapia"
];
const SPINE = [
	"head",
	"body1",
	"body2",
	"body3",
	"body4",
	"tail",
	"fin"
];
/** a fish `len` long, its middle at height y */
function fish(kind = "koi", len, y = .15) {
	const tilapia = kind === "nile" || kind === "redtilapia";
	const L = len ?? (tilapia ? .26 : .36);
	const Z = (k) => L * k;
	const at = [
		.3,
		.17,
		.04,
		-.09,
		-.21,
		-.33,
		-.42
	];
	const bones = [
		...SPINE.map((name, i) => ({
			name,
			parent: i ? SPINE[i - 1] : void 0,
			at: [
				0,
				y,
				Z(at[i])
			]
		})),
		{
			name: "pectL",
			parent: "head",
			at: [
				L * .06,
				y - L * .06,
				Z(.22)
			]
		},
		{
			name: "pectR",
			parent: "head",
			at: [
				-L * .06,
				y - L * .06,
				Z(.22)
			]
		}
	];
	const deep = tilapia ? 1.18 : 1;
	const s = sculpt(bones);
	s.egg([
		0,
		y,
		Z(.02)
	], [
		L * .075,
		L * .125 * deep,
		L * .4
	], {
		chain: [
			"head",
			"body1",
			"body2",
			"body3",
			"body4",
			"tail"
		],
		tag: "body"
	});
	s.egg([
		0,
		y - L * .005,
		Z(.27)
	], [
		L * .068,
		L * .1 * deep,
		L * .15
	], {
		bone: "head",
		k: L * .06,
		tag: "head"
	});
	s.egg([
		0,
		y,
		Z(-.34)
	], [
		L * .032,
		L * .055 * deep,
		L * .11
	], {
		chain: ["body4", "tail"],
		k: L * .06,
		tag: "body"
	});
	s.egg([
		0,
		y - L * .02,
		Z(.405)
	], [
		L * .03,
		L * .028,
		L * .03
	], {
		bone: "head",
		k: L * .02,
		tag: "lips"
	});
	const look = {
		koi: {
			base: "#e86a1e",
			belly: "#f6c08a",
			patch: "#e86a1e"
		},
		kohaku: {
			base: "#f3f0ea",
			belly: "#f6f3ee",
			patch: "#d23a1c"
		},
		ogon: {
			base: "#d9a63a",
			belly: "#f0d48a",
			patch: "#d9a63a"
		},
		carp: {
			base: "#6e5a32",
			belly: "#d8b46a",
			patch: "#6e5a32"
		},
		nile: {
			base: "#717a70",
			belly: "#d4d6cc",
			patch: "#3e4640"
		},
		redtilapia: {
			base: "#e48a6a",
			belly: "#f4cdb8",
			patch: "#e48a6a"
		}
	}[kind];
	const base = new three.Color(look.base), belly = new three.Color(look.belly);
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(base);
		mix(c, belly, ramp(-n.y, -.2, .6));
		c.multiplyScalar(1 - .25 * ramp(n.y, .4, .95));
		const sc = L * .045;
		const row = Math.floor(p.y / sc), u = p.z / sc + (row % 2 ? .5 : 0);
		const d = Math.hypot(u - Math.round(u), p.y / sc - row - .5);
		if (!at.tag("head") || at.tag("body") > .5) c.multiplyScalar(1 - .12 * ramp(d, .3, .5));
		if (kind === "kohaku") mix(c, look.patch, ramp(fbm3(p.x * 18 / L, p.y * 12 / L, p.z * 9 / L, 3, 5), .05, .12) * ramp(n.y, -.3, .2));
		if (kind === "nile") mix(c, look.patch, .55 * ramp(Math.sin(p.z / L * 52), .55, .85) * ramp(n.y, -.5, .2) * ramp(p.z, Z(-.36), Z(-.3)) * ramp(Z(.22), Z(.16), p.z));
		if (at.main === "lips") mix(c, belly, .5);
	};
	const skin = s.skin(L * .016, paint, `fish-${kind}-${L.toFixed(2)}-${y.toFixed(2)}`);
	const fin = kind === "kohaku" ? "#f2ece4" : kind === "nile" ? "#6a6a5e" : look.base;
	const parts = [{ skin }];
	for (const up of [1, -1]) parts.push({
		geo: egg([
			0,
			y + up * L * .08,
			Z(-.5)
		], [
			L * .006,
			L * .1,
			L * .055
		], [
			up * -.65,
			0,
			0
		]),
		color: kind === "nile" ? (p) => p.z < Z(-.53) ? "#b8523a" : fin : fin,
		bone: "fin"
	});
	parts.push({
		geo: egg([
			0,
			y + L * .13 * deep,
			Z(tilapia ? -.02 : 0)
		], [
			L * .005,
			L * .055,
			L * (tilapia ? .24 : .2)
		], [
			.15,
			0,
			0
		]),
		color: fin,
		chain: {
			bones: [
				"body1",
				"body2",
				"body3",
				"body4"
			],
			soft: L * .05
		}
	});
	parts.push({
		geo: egg([
			0,
			y - L * .12 * deep,
			Z(-.2)
		], [
			L * .005,
			L * .045,
			L * .07
		], [
			-.4,
			0,
			0
		]),
		color: fin,
		bone: "body4"
	});
	for (const x of [-1, 1]) parts.push({
		geo: egg([
			x * L * .04,
			y - L * .11,
			Z(.03)
		], [
			L * .005,
			L * .035,
			L * .06
		], [
			-.5,
			0,
			x * .5
		]),
		color: fin,
		bone: "body2"
	});
	for (const [side, x] of [["L", 1], ["R", -1]]) parts.push({
		geo: egg([
			x * L * .085,
			y - L * .075,
			Z(.17)
		], [
			L * .004,
			L * .035,
			L * .06
		], [
			-.5,
			x * .6,
			x * .5
		]),
		color: fin,
		bone: `pect${side}`
	});
	parts.push(...eyes([
		L * .06,
		y + L * .025,
		Z(.35)
	], L * .022, [
		1,
		.05,
		.25
	], tilapia ? "#c9b26a" : "#d9b45a", "round", "head", {
		irisR: .8,
		pupilR: .55
	}));
	if (!tilapia) for (const x of [-1, 1]) parts.push({
		geo: limb([
			x * L * .022,
			y - L * .03,
			Z(.42)
		], [
			x * L * .05,
			y - L * .07,
			Z(.44)
		], L * .004, L * .003, { seg: 5 }),
		color: look.belly,
		bone: "head"
	});
	const r = rig(bones, parts, animalMaterials(.35, { metalness: kind === "ogon" ? .45 : .12 }));
	r.object.name = `fish-${kind}`;
	const cruise = .5 * L;
	const wave = (t, m) => {
		const ph = m.dist / (.75 * L) + t * .35;
		const pace = clamp(m.speed / cruise, 0, 2);
		const amp = .06 + .1 * Math.min(1, pace);
		const bend = clamp(m.turn ?? 0, -2, 2) * .12;
		const pose = { root: [
			0,
			.004 * L * Math.sin(t * 1.3),
			0
		] };
		SPINE.forEach((n, i) => {
			const grow = [
				.25,
				.35,
				.5,
				.7,
				.95,
				1.25,
				1.1
			][i];
			pose[n] = [
				0,
				amp * grow * Math.sin(TAU * ph - .9 * i) + (i ? bend : -bend * .5),
				0
			];
		});
		const scull = (1 - Math.min(1, pace)) * .5 + .15;
		pose.pectL = [
			0,
			0,
			.3 + scull * Math.sin(t * 6)
		];
		pose.pectR = [
			0,
			0,
			-.3 - scull * Math.sin(t * 6 + .5)
		];
		return pose;
	};
	const swim = (t, m) => wave(t, onTheSpot(t, cruise, m));
	const turn = (t, m) => wave(t, {
		...onTheSpot(t, cruise, m),
		turn: 1.2 * Math.sin(t * .8)
	});
	const hang = (t) => wave(t, {
		dist: 0,
		speed: 0
	});
	return {
		rig: r,
		clips: {
			swim,
			turn,
			hang
		},
		first: "swim",
		gears: { swim: cruise }
	};
}

//#endregion
//#region src/lib/actors/species/frog.ts
const FROG_KINDS = [
	"bullfrog",
	"green",
	"common"
];
const SIDES = [["L", 1], ["R", -1]];
function frog(kind = "bullfrog") {
	const k = kind === "common" ? .7 : 1;
	const P = (x, y, z) => [
		x * k,
		y * k,
		z * k
	];
	const arm = [
		P(.024, .032, .03),
		P(.034, .016, .042),
		P(.03, .005, .058),
		P(.036, 0, .074)
	];
	const leg = [
		P(.018, .03, -.042),
		P(.052, .022, 0),
		P(.036, .012, -.056),
		P(.05, .005, -.014),
		P(.068, 0, .026)
	];
	const m = (p, x) => [
		p[0] * x,
		p[1],
		p[2]
	];
	const bones = [
		{
			name: "body",
			at: P(0, .035, -.005)
		},
		{
			name: "head",
			parent: "body",
			at: P(0, .042, .035)
		},
		{
			name: "throat",
			parent: "head",
			at: P(0, .022, .05)
		},
		...SIDES.flatMap(([s, x]) => [
			{
				name: `arm${s}`,
				parent: "body",
				at: m(arm[0], x)
			},
			{
				name: `forearm${s}`,
				parent: `arm${s}`,
				at: m(arm[1], x)
			},
			{
				name: `hand${s}`,
				parent: `forearm${s}`,
				at: m(arm[2], x)
			},
			{
				name: `thigh${s}`,
				parent: "body",
				at: m(leg[0], x)
			},
			{
				name: `shin${s}`,
				parent: `thigh${s}`,
				at: m(leg[1], x)
			},
			{
				name: `tarsus${s}`,
				parent: `shin${s}`,
				at: m(leg[2], x)
			},
			{
				name: `foot${s}`,
				parent: `tarsus${s}`,
				at: m(leg[3], x)
			}
		])
	];
	const sk = skeleton(bones);
	const s = sculpt(bones);
	s.egg(P(0, .034, -.012), [
		.034 * k,
		.024 * k,
		.05 * k
	], {
		bone: "body",
		tag: "back"
	}, [
		-.25,
		0,
		0
	]);
	s.egg(P(0, .042, .04), [
		.032 * k,
		.018 * k,
		.034 * k
	], {
		bone: "head",
		k: .018 * k,
		tag: "head"
	}, [
		-.1,
		0,
		0
	]);
	s.egg(P(0, .026, .045), [
		.026 * k,
		.012 * k,
		.026 * k
	], {
		bone: "throat",
		k: .012 * k,
		tag: "belly"
	});
	s.egg(P(0, .024, -.005), [
		.03 * k,
		.014 * k,
		.04 * k
	], {
		bone: "body",
		k: .015 * k,
		tag: "belly"
	});
	for (const [, x] of SIDES) s.ball(P(x * .017, .054, .046), .0105 * k, {
		bone: "head",
		k: .008 * k,
		tag: "head"
	});
	for (const [side, x] of SIDES) {
		const a = arm.map((p) => m(p, x)), l = leg.map((p) => m(p, x));
		s.cone(a[0], a[1], .007 * k, .0055 * k, {
			bone: `arm${side}`,
			k: .006 * k,
			tag: "limb"
		});
		s.cone(a[1], a[2], .0055 * k, .0045 * k, {
			bone: `forearm${side}`,
			k: .004 * k,
			tag: "limb"
		});
		s.cone(l[0], l[1], .013 * k, .009 * k, {
			bone: `thigh${side}`,
			k: .01 * k,
			tag: "limb"
		});
		s.cone(l[1], l[2], .008 * k, .0055 * k, {
			bone: `shin${side}`,
			k: .006 * k,
			tag: "limb"
		});
		s.cone(l[2], l[3], .0048 * k, .004 * k, {
			bone: `tarsus${side}`,
			k: .004 * k,
			tag: "limb"
		});
	}
	const look = {
		bullfrog: {
			back: "#5e6a32",
			head: "#6f8a3a",
			spots: "#3a3a22",
			belly: "#e8e0b8"
		},
		green: {
			back: "#7a9a42",
			head: "#8fb04a",
			spots: "#4a5e2a",
			belly: "#efe8c4"
		},
		common: {
			back: "#8a7048",
			head: "#8a7048",
			spots: "#3a2c1e",
			belly: "#e6d8b8"
		}
	}[kind];
	const back = new three.Color(look.back), head = new three.Color(look.head), belly = new three.Color(look.belly);
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(back).lerp(head, at.tag("head"));
		const blot = fbm3(p.x * 110 / k, p.y * 110 / k, p.z * 110 / k, 3, 17);
		mix(c, look.spots, ramp(blot, .15, .3) * (at.tag("limb") ? 1 : .8));
		mix(c, belly, Math.max(at.tag("belly") * ramp(-n.y, -.2, .3), ramp(-n.y, .4, .8)));
		if (kind === "common" && at.main === "head") mix(c, "#3a2a1c", ramp(n.x * Math.sign(p.x), .5, .8) * ramp(.045 * k, .035 * k, p.y) * ramp(p.z, .02 * k, .03 * k));
		const ear = Math.hypot(Math.abs(p.x) - .026 * k, p.y - .046 * k, p.z - .03 * k);
		if (at.main === "head") mix(c, kind === "bullfrog" ? "#4e5a2c" : "#6a5a3a", ramp(.0075 * k, .006 * k, ear));
		c.multiplyScalar(.95 + .08 * fbm3(p.x * 400, p.y * 400, p.z * 400, 2, 2));
	};
	const parts = [{ skin: s.skin(.0026 * k, paint, `frog-${kind}`) }];
	parts.push(...eyes(P(.019, .058, .049), .0072 * k, [
		.75,
		.55,
		.35
	], "#c9a23a", "bar", "head", {
		irisR: .82,
		pupilR: .42
	}));
	for (const [side, x] of SIDES) {
		const w = m(arm[2], x);
		for (const a of [
			-.6,
			-.2,
			.2,
			.6
		]) parts.push({
			geo: limb(w, [
				w[0] + x * Math.sin(a + .4) * .014 * k,
				0,
				w[2] + Math.cos(a + .4) * .014 * k
			], .0018 * k, .0022 * k, { seg: 5 }),
			color: look.back,
			bone: `hand${side}`
		});
		const f = m(leg[3], x);
		const web = new three.Shape();
		web.moveTo(0, 0);
		for (let i = 0; i <= 4; i++) {
			const a = -.5 + i * .25;
			web.lineTo(Math.sin(a) * .04 * k, Math.cos(a) * .04 * k * (1 - Math.abs(i - 2.5) * .12));
			if (i < 4) web.lineTo(Math.sin(a + .125) * .03 * k, Math.cos(a + .125) * .03 * k);
		}
		web.lineTo(0, 0);
		const g = new three.ExtrudeGeometry(web, {
			depth: .0015 * k,
			bevelEnabled: false,
			curveSegments: 2
		});
		g.rotateX(Math.PI / 2);
		g.rotateY(x * .5);
		g.translate(f[0], .003 * k, f[2]);
		parts.push({
			geo: g,
			color: look.spots,
			bone: `foot${side}`
		});
	}
	const r = rig(bones, parts, animalMaterials(.4, { metalness: .05 }));
	r.object.name = `frog-${kind}`;
	const restDir = (a, b) => new three.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
	const legSeg = (side) => {
		const x = side === "L" ? 1 : -1;
		const l = leg.map((p) => m(p, x));
		return {
			l,
			rest: [
				0,
				1,
				2,
				3
			].map((i) => restDir(l[i], l[i + 1])),
			out: [
				new three.Vector3(x * .25, -.15, -1),
				new three.Vector3(x * .15, -.3, -1),
				new three.Vector3(x * .1, -.35, -1),
				new three.Vector3(x * .05, -.5, -1)
			].map((v) => v.normalize())
		};
	};
	const legs = {
		L: legSeg("L"),
		R: legSeg("R")
	};
	const names = [
		"thigh",
		"shin",
		"tarsus",
		"foot"
	];
	/** the hind legs thrown out by `e` (0: folded, 1: straight out behind) */
	const throwLegs = (pose, e) => {
		for (const [side] of SIDES) {
			const L = legs[side];
			names.forEach((n, i) => point(sk, pose, `${n}${side}`, L.l[i + 1], L.rest[i].clone().lerp(L.out[i], e).normalize()));
		}
	};
	const throat = (big) => [
		0,
		0,
		0,
		1 + big
	];
	const breathe = (t) => .12 * Math.max(0, Math.sin(t * 5.5));
	const idle = (t) => {
		const pose = {
			throat: throat(breathe(t)),
			head: [
				.03 * wander(t, 5, 3),
				.08 * wander(t, 4, 7),
				0
			],
			root: [
				0,
				6e-4 * Math.sin(t * 5.5),
				0
			]
		};
		throwLegs(pose, 0);
		return pose;
	};
	const croak = (t) => {
		const sac = Math.pow(Math.max(0, Math.sin(t * 3.2)), 2);
		const pose = {
			throat: throat(1.1 * sac),
			body: [
				-.08 * sac,
				0,
				0
			],
			head: [
				-.1 * sac,
				0,
				0
			]
		};
		throwLegs(pose, 0);
		return pose;
	};
	const L = .32 * k;
	const hop = (t, mo) => {
		const mm = onTheSpot(t, .4 * k, mo);
		const u = frac(mm.dist / L);
		const air = clamp((u - .12) / .4, 0, 1);
		const launch = smooth((u - .06) / .1) * (1 - smooth((u - .5) / .35));
		const height = Math.sin(Math.PI * air) * .09 * k;
		const z = L * (smooth(air) - u);
		const pose = {
			root: [
				0,
				height - .004 * k * Math.sin(Math.PI * clamp(u / .12, 0, 1)),
				z
			],
			body: [
				air > 0 && air < 1 ? -.45 * Math.sin(Math.PI * air) + .3 * smooth((air - .6) / .4) * (1 - smooth((u - .55) / .2)) : 0,
				0,
				0
			],
			throat: throat(.05)
		};
		throwLegs(pose, launch);
		for (const [side, x] of SIDES) pose[`arm${side}`] = [
			-.6 * Math.sin(Math.PI * air),
			x * .2 * Math.sin(Math.PI * air),
			0
		];
		return pose;
	};
	return {
		rig: r,
		clips: {
			idle,
			croak,
			hop
		},
		first: "idle",
		gears: { hop: .4 * k }
	};
}

//#endregion
//#region src/lib/actors/plans/quadruped.ts
const LEGS = [
	"FL",
	"FR",
	"HL",
	"HR"
];
const mirror = (p) => [
	-p[0],
	p[1],
	p[2]
];
function quadSkeleton(j) {
	const tail = j.tail.slice(0, -1).map((_, i) => `tail${i + 1}`);
	const bones = [
		{
			name: "body",
			at: j.body
		},
		{
			name: "chest",
			parent: "body",
			at: j.chest
		},
		{
			name: "pelvis",
			parent: "body",
			at: j.pelvis
		},
		{
			name: "neck",
			parent: "chest",
			at: j.neck[0]
		},
		{
			name: "neck2",
			parent: "neck",
			at: j.neck[1]
		},
		{
			name: "head",
			parent: "neck2",
			at: j.head
		},
		...j.jaw ? [{
			name: "jaw",
			parent: "head",
			at: j.jaw
		}] : [],
		...j.ear ? [{
			name: "earL",
			parent: "head",
			at: j.ear[0]
		}, {
			name: "earR",
			parent: "head",
			at: mirror(j.ear[0])
		}] : [],
		...tail.map((name, i) => ({
			name,
			parent: i ? tail[i - 1] : "pelvis",
			at: j.tail[i]
		})),
		...LEGS.flatMap((leg) => {
			const pts = (leg[0] === "F" ? j.fore : j.hind).map((p) => leg[1] === "L" ? p : mirror(p));
			return [
				{
					name: `upper${leg}`,
					parent: leg[0] === "F" ? "chest" : "pelvis",
					at: pts[0]
				},
				{
					name: `lower${leg}`,
					parent: `upper${leg}`,
					at: pts[1]
				},
				{
					name: `cannon${leg}`,
					parent: `lower${leg}`,
					at: pts[2]
				},
				{
					name: `foot${leg}`,
					parent: `cannon${leg}`,
					at: pts[3]
				}
			];
		})
	];
	const toe = Object.fromEntries(LEGS.map((leg) => {
		const p = (leg[0] === "F" ? j.fore : j.hind)[4];
		return [leg, leg[1] === "L" ? p : mirror(p)];
	}));
	return {
		bones,
		j,
		tail,
		sk: skeleton(bones),
		toe
	};
}
/** The legs of a quadruped standing or walking: every leg to where its hoof is (the root and body as `pose` has them). */
function legs(q, pose, g, m, pace, plant = {}) {
	const { sk, toe } = q;
	for (const leg of LEGS) {
		const fore = leg[0] === "F";
		const top = sk.at(`cannon${leg}`), fet = sk.at(`foot${leg}`);
		const step = g && m ? footAt(g, m, leg, pace) : {
			stance: true,
			u: .5,
			z: 0,
			y: 0
		};
		const extra = plant[leg];
		const target = new three.Vector3(fet[0], fet[1] + step.y + (extra?.y ?? 0), fet[2] + step.z + (extra?.z ?? 0));
		let lean = 0, flip = 0;
		if (g) {
			const tilt = g.tilt * pace, fold = g.fold[fore ? 0 : 1] * Math.min(1, pace * 1.5);
			const heel = g.flip * .5 * pace;
			if (step.stance) {
				lean = tilt * (step.u - .5);
				flip = heel * smooth((step.u - .65) / .35);
				if (flip > 0) {
					const t3 = toe[leg];
					const tipAt = new three.Vector3(t3[0], t3[1], t3[2] + step.z);
					target.copy(tipAt).add(new three.Vector3(fet[0] - t3[0], fet[1] - t3[1], fet[2] - t3[2]).applyAxisAngle(new three.Vector3(1, 0, 0), flip));
				}
			} else {
				lean = tilt * (.5 - step.u) + fold * Math.sin(Math.PI * step.u);
				flip = heel * (1 - smooth(step.u / .3)) + g.flip * pace * Math.sin(Math.PI * Math.min(1, step.u * 1.3));
			}
		}
		const cannon = swung(top, fet, lean);
		const len = Math.hypot(fet[0] - top[0], fet[1] - top[1], fet[2] - top[2]);
		reach(sk, pose, `upper${leg}`, `lower${leg}`, top, target.clone().addScaledVector(cannon, -len));
		point(sk, pose, `cannon${leg}`, fet, cannon);
		point(sk, pose, `foot${leg}`, toe[leg], swung(fet, toe[leg], flip));
	}
}
/**
* The head carried to a point (model space) by its two neck bones, the muzzle pointing along `look` — the grass in
* front of the forefeet, a hand held out, the horizon.
*/
function headTo(q, pose, target, look) {
	const { sk, j } = q;
	reach(sk, pose, "neck", "neck2", j.head, target);
	aim(sk, pose, "head", j.muzzle, look);
}
/**
* A quadruped's moves: each gait in `life.gaits` (walk, trot …), and standing (`idle`), grazing (`graze`), looking
* up (`alert`).
*/
function quadMoves(q, life) {
	const { j, tail } = q;
	const seed = life.seed ?? 1;
	const tl = life.tail ?? {
		sway: .15,
		carry: 0,
		hz: 1.2
	};
	const earSwing = life.ears ?? .4;
	/** what every pose has: the tail, the ears' flicks, a breath */
	const living = (t, moving) => {
		const p = wave(tail, t, tl.hz * (1 + moving), tl.sway * (.6 + moving), tl.axis ?? 1, .7, 1.2);
		tail.forEach((n, i) => p[n][0] += tl.carry / tail.length * (i ? 1 : .5));
		const flick = now(t, 2.8, .35, seed + 3), turn = wander(t, 3.5, seed + 9);
		const f = flick >= 0 ? Math.sin(Math.PI * flick) : 0;
		p.earL = [
			earSwing * (.25 * turn - .5 * f),
			0,
			earSwing * .3 * f
		];
		p.earR = [
			earSwing * (-.25 * turn),
			0,
			0
		];
		return p;
	};
	const moves = {};
	for (const [name, g] of Object.entries(life.gaits)) moves[name] = (t, m) => {
		const mo = onTheSpot(t, g.speed, m);
		const pace = clamp(mo.speed / g.speed, 0, 1.4);
		const ph = mo.dist / g.stride;
		const per = g.bobs ?? 2;
		const bob = bobOf(g, mo, .1, per);
		const sway = Math.sin(TAU * ph);
		const turn = clamp(mo.turn ?? 0, -1.5, 1.5);
		const pose = {
			...living(t, Math.min(1, pace)),
			root: [
				0,
				-g.bob * pace * (.5 + .5 * bob),
				0
			],
			body: [
				g.pitch * pace * Math.sin(TAU * per * ph),
				-turn * .08,
				g.roll * pace * sway - turn * .04
			],
			chest: [
				g.flex * pace * Math.sin(TAU * ph + .5),
				.04 * pace * sway + turn * .05,
				0
			],
			pelvis: [
				-g.flex * pace * Math.sin(TAU * ph + .5),
				-.04 * pace * sway - turn * .03,
				0
			]
		};
		const nod = g.nod * pace * Math.sin(TAU * 2 * ph - .6);
		pose.neck = [
			.08 * pace + nod,
			turn * .15,
			0
		];
		pose.neck2 = [
			.05 * pace - nod * .4,
			turn * .15,
			0
		];
		pose.head = [
			-.1 * pace - nod * .5,
			turn * .1,
			0
		];
		legs(q, pose, g, mo, Math.min(1, pace));
		return pose;
	};
	const stand = (t) => ({
		...living(t, 0),
		root: [
			.004 * Math.sin(t * .5 + seed),
			.002 * Math.sin(t * 1.6),
			0
		],
		body: [
			0,
			0,
			.01 * Math.sin(t * .5 + seed)
		]
	});
	moves.idle = (t) => {
		const pose = stand(t);
		const look = wander(t, 4.2, seed + 1), up = wander(t, 6.1, seed + 2);
		pose.neck = [
			-.08 + .1 * up,
			.25 * look,
			0
		];
		pose.neck2 = [
			0,
			.25 * look,
			0
		];
		pose.head = [
			.05 - .1 * up,
			.35 * look,
			.08 * look
		];
		if (j.jaw) pose.jaw = [
			.04 * Math.max(0, Math.sin(t * 7)),
			.03 * Math.sin(t * 3.5),
			0
		];
		legs(q, pose, null, null, 0);
		return pose;
	};
	moves.alert = (t) => {
		const pose = stand(t);
		const look = wander(t, 2.2, seed + 4);
		pose.neck = [
			-.25,
			.15 * look,
			0
		];
		pose.neck2 = [
			-.15,
			.15 * look,
			0
		];
		pose.head = [
			.25,
			.3 * look,
			0
		];
		pose.earL = [
			-.3,
			0,
			0
		];
		pose.earR = [
			-.3,
			0,
			0
		];
		legs(q, pose, null, null, 0);
		return pose;
	};
	const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
	const headLen = len(j.head, j.muzzle);
	const neckLen = len(j.neck[0], j.neck[1]) + len(j.neck[1], j.head);
	moves.graze = (t) => {
		const pose = stand(t);
		const shift = wander(t, 5, seed + 5);
		pose.root = [
			pose.root[0],
			pose.root[1] - .008,
			0
		];
		pose.body = [
			.09,
			.04 * shift,
			0
		];
		pose.chest = [
			.06,
			0,
			0
		];
		const bite = Math.max(0, Math.sin(t * 5.5)) ** 2;
		const look = new three.Vector3(.12 * shift, -1, .7).normalize();
		const base = q.sk.joint(pose, "neck");
		const pollY = .014 + .015 * bite - look.y * headLen;
		const drop = base.y - pollY;
		const ahead = Math.sqrt(Math.max(.05 ** 2, (.96 * neckLen) ** 2 - drop * drop));
		headTo(q, pose, new three.Vector3(.04 * shift, pollY, base.z + ahead), look);
		if (j.jaw) pose.jaw = [
			.12 * bite,
			.04 * Math.sin(t * 5.5),
			0
		];
		legs(q, pose, null, null, 0, {
			FL: { z: .05 },
			FR: { z: .01 }
		});
		return pose;
	};
	return moves;
}

//#endregion
//#region src/lib/actors/species/goat.ts
const GOAT_BREEDS = [
	"saanen",
	"alpine",
	"pied",
	"nubian",
	"boer"
];
const LOOK$3 = {
	saanen: {
		coat: "#efe9dc",
		dark: "#d8cfbf",
		nose: "#d9b2a2",
		horns: false,
		ears: "up",
		beard: true,
		heavy: 0
	},
	alpine: {
		coat: "#8a5a33",
		dark: "#1f1a17",
		nose: "#2a2420",
		horns: true,
		ears: "up",
		beard: true,
		heavy: 0
	},
	pied: {
		coat: "#ece5d6",
		dark: "#5a3a24",
		nose: "#3a2c24",
		horns: true,
		ears: "up",
		beard: true,
		heavy: 0
	},
	nubian: {
		coat: "#9a6238",
		dark: "#4a2d1c",
		nose: "#3a2a22",
		horns: false,
		ears: "long",
		beard: false,
		heavy: .3
	},
	boer: {
		coat: "#f0eadf",
		dark: "#8e4a26",
		nose: "#5a3a2c",
		horns: true,
		ears: "long",
		beard: true,
		heavy: 1
	}
};
const J$3 = {
	body: [
		0,
		.66,
		-.02
	],
	chest: [
		0,
		.66,
		.27
	],
	pelvis: [
		0,
		.7,
		-.3
	],
	neck: [[
		0,
		.62,
		.39
	], [
		0,
		.8,
		.49
	]],
	head: [
		0,
		.96,
		.555
	],
	muzzle: [
		0,
		.81,
		.78
	],
	jaw: [
		0,
		.9,
		.59
	],
	ear: [[
		.045,
		.985,
		.55
	], [
		.15,
		.97,
		.52
	]],
	tail: [
		[
			0,
			.73,
			-.44
		],
		[
			0,
			.79,
			-.47
		],
		[
			0,
			.85,
			-.48
		]
	],
	fore: [
		[
			.09,
			.56,
			.31
		],
		[
			.09,
			.4,
			.24
		],
		[
			.085,
			.22,
			.285
		],
		[
			.085,
			.07,
			.295
		],
		[
			.085,
			0,
			.345
		]
	],
	hind: [
		[
			.09,
			.62,
			-.32
		],
		[
			.1,
			.45,
			-.22
		],
		[
			.09,
			.26,
			-.4
		],
		[
			.085,
			.07,
			-.37
		],
		[
			.085,
			0,
			-.32
		]
	]
};
/** `moves`: the body plan's way of moving it (an older version's, for the Actors gallery's history) */
function goat(breed = "saanen", moves = quadMoves) {
	const L = LOOK$3[breed];
	const q = quadSkeleton(J$3);
	const s = sculpt(q.bones);
	const hv = L.heavy;
	const coat = { tag: "coat" };
	s.egg([
		0,
		.635,
		-.02
	], [
		.14 + .02 * hv,
		.16,
		.35
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		...coat
	});
	s.egg([
		0,
		.55,
		-.05
	], [
		.15 + .02 * hv,
		.12,
		.25
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		k: .1,
		...coat
	});
	s.egg([
		0,
		.6,
		.27
	], [
		.11 + .02 * hv,
		.15,
		.12
	], {
		bone: "chest",
		k: .07,
		...coat
	});
	s.egg([
		0,
		.725,
		.22
	], [
		.06,
		.05,
		.13
	], {
		bone: "chest",
		k: .06,
		tag: "back"
	});
	for (const x of [-1, 1]) s.egg([
		x * .085,
		.745,
		-.25
	], [
		.04,
		.035,
		.05
	], {
		bone: "pelvis",
		k: .05,
		tag: "back"
	});
	s.egg([
		0,
		.7,
		-.34
	], [
		.1 + .02 * hv,
		.1,
		.11
	], {
		bone: "pelvis",
		k: .07,
		...coat
	}, [
		-.3,
		0,
		0
	]);
	s.cone([
		0,
		.64,
		.35
	], [
		0,
		.88,
		.52
	], .085 + .015 * hv, .055, {
		chain: ["neck", "neck2"],
		k: .06,
		tag: "neck"
	});
	const face = {
		bone: "head",
		k: .03,
		tag: "face"
	};
	s.egg([
		0,
		.955,
		.585
	], [
		.055,
		.058,
		.07
	], face);
	s.egg([
		0,
		.9,
		.665
	], [
		.046,
		.052,
		.12
	], face, [
		.78 - .08 * (breed === "nubian" ? 1 : 0),
		0,
		0
	]);
	if (breed === "nubian") s.egg([
		0,
		.905,
		.7
	], [
		.03,
		.035,
		.09
	], face, [
		.55,
		0,
		0
	]);
	s.egg([
		0,
		.835,
		.745
	], [
		.035,
		.036,
		.052
	], {
		...face,
		tag: "nose",
		k: .025
	}, [
		.78,
		0,
		0
	]);
	s.egg([
		0,
		.855,
		.67
	], [
		.032,
		.026,
		.075
	], {
		bone: "jaw",
		tag: "face",
		k: .02
	}, [
		.7,
		0,
		0
	]);
	for (const leg of LEGS) {
		const side = leg[1] === "L" ? 1 : -1;
		const p = (leg[0] === "F" ? J$3.fore : J$3.hind).map((v) => [
			v[0] * side,
			v[1],
			v[2]
		]);
		if (leg[0] === "F") s.cone([
			p[0][0] * .9,
			p[0][1] + .05,
			p[0][2] - .01
		], p[1], .065 + .01 * hv, .042, {
			bone: `upper${leg}`,
			k: .06,
			...coat
		});
		else s.egg([
			p[0][0] * 1.05,
			.56,
			-.27
		], [
			.065 + .012 * hv,
			.12,
			.09
		], {
			bone: `upper${leg}`,
			k: .06,
			...coat
		});
		s.cone(p[1], p[2], leg[0] === "F" ? .03 : .038, .021, {
			bone: `lower${leg}`,
			k: .03,
			tag: "leg"
		});
		s.cone(p[2], p[3], .019, .015, {
			bone: `cannon${leg}`,
			k: .018,
			tag: "shin"
		});
		s.cone(p[3], [
			p[4][0],
			.03,
			(p[3][2] + p[4][2]) / 2
		], .016, .017, {
			bone: `foot${leg}`,
			k: .01,
			tag: "shin"
		});
	}
	s.cone(J$3.tail[0], J$3.tail[2], .024, .014, {
		chain: q.tail,
		k: .03,
		tag: "tail"
	});
	const base = new three.Color(L.coat), dark = new three.Color(L.dark), nose = new three.Color(L.nose), light = base.clone().lerp(new three.Color("#ffffff"), .25);
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(base).multiplyScalar(.93 + .1 * fbm3(p.x * 18, p.y * 18, p.z * 18, 3, 2));
		mix(c, light, .35 * ramp(-n.y, .2, .9));
		const below = (y) => ramp(y - p.y, -.03, .03);
		if (breed === "alpine") {
			const stripe = ramp(n.y, .75, .95) * ramp(.05, .02, Math.abs(p.x)) * ramp(p.z, -.45, -.4);
			const stripes = (at.tag("face") + at.tag("nose")) * ramp(.035, .015, Math.abs(Math.abs(p.x) - .03 + .15 * (p.z - .7)));
			mix(c, dark, Math.max(stripe, below(.32), ramp(-n.y, .6, .9) * ramp(.62, .55, p.y), stripes, at.tag("nose")));
		} else if (breed === "pied") {
			const patch = fbm3(p.x * 4.5 + 3, p.y * 4.5, p.z * 4.5, 3, 9);
			mix(c, dark, ramp(patch, .05, .12));
			mix(c, "#1f1a17", ramp(fbm3(p.x * 6, p.y * 6 + 2, p.z * 6, 2, 13), .25, .3) * .9);
		} else if (breed === "boer") {
			const head = Math.max(at.tag("face") + at.tag("nose"), ramp(p.z, .47, .53) * ramp(p.y, .78, .84));
			const blaze = ramp(.022, .01, Math.abs(p.x)) * ramp(n.y + n.z, .3, .8);
			mix(c, dark, head * (1 - blaze));
		} else if (breed === "nubian") mix(c, dark, .6 * ramp(n.y, .6, .95) * ramp(.04, 0, Math.abs(p.x)) + .4 * below(.2));
		if (at.main === "nose") mix(c, nose, .85);
		if (at.main === "shin") c.multiplyScalar(.92);
	};
	const parts = [{ skin: s.skin(.013, paint, `goat-${breed}`) }];
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const base3 = [
			x * .045,
			.985,
			.55
		];
		const long = L.ears === "long";
		const len = long ? .17 : .11;
		const dir = new three.Vector3(x * (long ? .35 : 1), long ? -1 : .05, long ? .15 : -.1).normalize();
		const mid = [
			base3[0] + dir.x * len * .5,
			base3[1] + dir.y * len * .5,
			base3[2] + dir.z * len * .5
		];
		const tilt = long ? [
			0,
			0,
			x * .35
		] : [
			0,
			x * .15,
			x * -.05
		];
		const earGeo = long ? egg(mid, [
			.016,
			len * .5,
			.045
		], tilt) : egg(mid, [
			len * .5,
			.012,
			.033
		], tilt);
		const earC = breed === "boer" ? L.dark : breed === "alpine" ? L.coat : L.coat;
		parts.push({
			geo: earGeo,
			color: earC,
			bone: `ear${side}`
		});
	}
	parts.push(...eyes([
		.047,
		.935,
		.625
	], .0135, [
		.85,
		.15,
		.45
	], "#d9b44a", "bar"));
	if (L.horns) for (const x of [-1, 1]) {
		const pts = [];
		const sweep = breed === "boer" ? 1.35 : 1;
		for (let i = 0; i <= 6; i++) {
			const t = i / 6, a = .25 + t * 1.6 * sweep;
			pts.push([
				x * (.03 + .03 * t),
				1 + .11 * Math.sin(a) * sweep,
				.565 - .1 * (1 - Math.cos(a)) * sweep
			]);
		}
		for (let i = 0; i < 6; i++) parts.push({
			geo: limb(pts[i], pts[i + 1], .017 * (1 - i / 7) + .003, .017 * (1 - (i + 1) / 7) + .003, { seg: 8 }),
			color: i % 2 ? "#7a6a58" : "#6c5c4b",
			bone: "head"
		});
	}
	if (L.beard) parts.push({
		geo: spike([
			0,
			.83,
			.67
		], [
			0,
			-1,
			-.2
		], .022, .09, { flat: .5 }),
		color: breed === "alpine" ? "#2a221d" : breed === "boer" ? L.dark : L.coat,
		bone: "jaw"
	});
	for (const leg of LEGS) {
		const side = leg[1] === "L" ? 1 : -1;
		const toe = (leg[0] === "F" ? J$3.fore : J$3.hind)[4];
		for (const dx of [-.01, .01]) parts.push({
			geo: egg([
				toe[0] * side + dx,
				.016,
				toe[2] - .016
			], [
				.011,
				.017,
				.025
			], [
				-.25,
				0,
				0
			]),
			color: "#2c2723",
			bone: `foot${leg}`
		});
	}
	const r = rig(q.bones, parts, animalMaterials(.85));
	r.object.name = `goat-${breed}`;
	return {
		rig: r,
		clips: moves(q, {
			seed: GOAT_BREEDS.indexOf(breed) + 21,
			gaits: {
				walk: {
					speed: .65,
					stride: .7,
					duty: .66,
					feet: {
						HL: 0,
						FL: .25,
						HR: .5,
						FR: .75
					},
					lift: .08,
					bob: .012,
					roll: .02,
					pitch: .012,
					tilt: .35,
					fold: [1.1, .5],
					flip: .7,
					nod: .06,
					flex: .02
				},
				trot: {
					speed: 1.8,
					stride: 1.2,
					duty: .4,
					feet: {
						HL: 0,
						FR: 0,
						FL: .5,
						HR: .5
					},
					lift: .1,
					bob: .025,
					roll: .02,
					pitch: .015,
					tilt: .5,
					fold: [1.5, .75],
					flip: 1,
					nod: .03,
					flex: .03
				}
			},
			tail: {
				sway: .25,
				carry: -.35,
				hz: 3.2
			},
			ears: L.ears === "long" ? .2 : .5
		}),
		first: "graze",
		gears: {
			walk: .65,
			trot: 1.8
		},
		feet: LEGS.map((l) => `foot${l}`)
	};
}

//#endregion
//#region src/lib/actors/species/goose.ts
const GOOSE_BREEDS = [
	"embden",
	"toulouse",
	"chinese"
];
const J$2 = {
	body: [
		0,
		.36,
		0
	],
	neck: [
		[
			0,
			.42,
			.2
		],
		[
			0,
			.55,
			.25
		],
		[
			0,
			.68,
			.265
		]
	],
	head: [
		0,
		.775,
		.275
	],
	beak: [
		0,
		.755,
		.395
	],
	tail: [
		0,
		.4,
		-.26
	],
	wing: [
		.12,
		.43,
		.12
	],
	leg: [
		[
			.07,
			.31,
			-.01
		],
		[
			.078,
			.25,
			.05
		],
		[
			.078,
			.13,
			-.005
		],
		[
			.078,
			.012,
			.03
		],
		[
			.078,
			0,
			.11
		]
	]
};
/** `moves`: the body plan's way of moving it (an older version's, for the Actors gallery's history) */
function goose(breed = "embden", moves = birdMoves) {
	const b = birdSkeleton(J$2);
	const s = sculpt(b.bones);
	const feather = {
		tag: "feather",
		bump: .004,
		lumps: .02
	};
	s.egg([
		0,
		.36,
		-.02
	], [
		.135,
		.13,
		.27
	], {
		bone: "body",
		...feather
	}, [
		.06,
		0,
		0
	]);
	s.egg([
		0,
		.35,
		.13
	], [
		.12,
		.12,
		.12
	], {
		bone: "body",
		k: .06,
		...feather
	});
	s.egg([
		0,
		.28,
		-.04
	], [
		.11,
		.07 + (breed === "toulouse" ? .02 : 0),
		.2
	], {
		bone: "body",
		k: .06,
		...feather,
		tag: "belly"
	});
	s.egg([
		0,
		.4,
		-.25
	], [
		.08,
		.06,
		.08
	], {
		bone: "tail",
		k: .04,
		...feather,
		tag: "tail"
	}, [
		-.3,
		0,
		0
	]);
	s.cone([
		0,
		.4,
		.17
	], J$2.neck[1], .07, .04, {
		chain: ["neck1", "neck2"],
		k: .05,
		...feather,
		tag: "neck"
	});
	s.cone(J$2.neck[1], J$2.head, .04, .033, {
		chain: ["neck2", "neck3"],
		k: .03,
		...feather,
		tag: "neck"
	});
	s.egg([
		0,
		.778,
		.285
	], [
		.033,
		.037,
		.05
	], {
		bone: "head",
		k: .02,
		tag: "head"
	});
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
		x * .11,
		.41,
		-.06
	], [
		.04,
		.075,
		.24
	], {
		bone: `wing${side}`,
		k: .03,
		...feather,
		tag: "wing"
	}, [
		.12,
		x * -.08,
		0
	]);
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
		x * J$2.leg[1][0],
		.2,
		.025
	], [
		.038,
		.06,
		.05
	], {
		bone: `shank${side}`,
		k: .04,
		...feather,
		tag: "belly"
	}, [
		-.5,
		0,
		0
	]);
	const white = new three.Color("#f5f3ee"), grey = new three.Color("#8a8a86"), brown = new three.Color("#9a7a5a"), dark = new three.Color("#4a3a2c");
	const paint = (c, at) => {
		const { p, n } = at;
		const fine = noise3(p.x * 140, p.y * 140, p.z * 140, 3);
		if (breed === "embden") c.copy(white).multiplyScalar(.95 + .06 * fine);
		else if (breed === "toulouse") {
			c.copy(grey).multiplyScalar(.92 + .1 * fine);
			const bars = Math.sin(p.z * 90 + p.y * 30);
			mix(c, "#c9c7c0", ramp(bars, .5, .9) * (at.tag("wing") + ramp(n.y, .3, .8) * at.tag("feather")) * .6);
			mix(c, white, Math.max(at.tag("belly"), ramp(-n.y, .1, .6)));
		} else {
			c.copy(brown).multiplyScalar(.93 + .1 * fine);
			mix(c, white, Math.max(ramp(-n.y, 0, .5), at.tag("belly") * .8, at.tag("neck") * ramp(n.z, -.2, .4)));
			mix(c, dark, at.tag("neck") * ramp(-n.z, .4, .8));
			if (at.main === "head") mix(c, white, .6);
		}
	};
	const skin = s.skin(.011, paint, `goose-${breed}`);
	const bill = breed === "chinese" ? "#2a2420" : "#e88a2c", feet = breed === "chinese" ? "#e88a2c" : "#ea8e34";
	const parts = [{ skin }];
	parts.push({
		geo: spike([
			0,
			.765,
			.322
		], [
			0,
			-.18,
			1
		], .022, .08, { flat: 1.25 }),
		color: bill,
		bone: "head"
	});
	parts.push({
		geo: egg([
			0,
			.755,
			.35
		], [
			.017,
			.006,
			.035
		], [
			.15,
			0,
			0
		]),
		color: bill,
		bone: "head"
	});
	if (breed === "chinese") parts.push({
		geo: egg([
			0,
			.79,
			.318
		], [
			.014,
			.014,
			.014
		]),
		color: "#2a2420",
		bone: "head"
	});
	parts.push(...eyes([
		.026,
		.79,
		.3
	], .0065, [
		.9,
		.15,
		.35
	], breed === "embden" ? "#4a8acb" : "#3a2a1a", "round", "head", { irisR: .7 }));
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const ankle = [
			x * J$2.leg[2][0],
			J$2.leg[2][1],
			J$2.leg[2][2]
		], toes = [
			x * J$2.leg[3][0],
			J$2.leg[3][1],
			J$2.leg[3][2]
		];
		parts.push({
			geo: limb(ankle, toes, .011, .009, { seg: 7 }),
			color: feet,
			bone: `tarsus${side}`
		});
		const web = new three.Shape();
		web.moveTo(0, 0);
		web.lineTo(-.045, .075);
		web.quadraticCurveTo(0, .09, .045, .075);
		web.lineTo(0, 0);
		const solid = new three.ExtrudeGeometry(web, {
			depth: .004,
			bevelEnabled: false,
			curveSegments: 3
		});
		solid.rotateX(Math.PI / 2);
		solid.translate(toes[0], .006, toes[2]);
		parts.push({
			geo: solid,
			color: feet,
			bone: `toes${side}`
		});
	}
	const r = rig(b.bones, parts, animalMaterials(.8));
	r.object.name = `goose-${breed}`;
	return {
		rig: r,
		clips: moves(b, {
			seed: GOOSE_BREEDS.indexOf(breed) + 51,
			gaits: { walk: {
				speed: .45,
				stride: .3,
				duty: .64,
				feet: {
					L: 0,
					R: .5
				},
				lift: .035,
				bob: .008,
				roll: .13,
				pitch: .015,
				tilt: .4,
				fold: .9,
				curl: .8,
				hold: 0
			} },
			wag: .25,
			carry: .15,
			steady: 2.6
		}),
		first: "walk",
		gears: { walk: .45 },
		feet: ["toesL", "toesR"]
	};
}

//#endregion
//#region src/lib/actors/species/rabbit.ts
const RABBIT_COATS = [
	"wild",
	"dutch",
	"lop",
	"white",
	"black",
	"fawn"
];
const LOOK$2 = {
	wild: {
		coat: "#86705a",
		belly: "#e9e2d6",
		iris: "#3a2416",
		lop: false
	},
	dutch: {
		coat: "#22201f",
		belly: "#f2efe9",
		iris: "#2a1a10",
		lop: false
	},
	lop: {
		coat: "#c99a63",
		belly: "#ecdcc2",
		iris: "#3a2416",
		lop: true
	},
	white: {
		coat: "#f3f0ea",
		belly: "#f6f3ee",
		iris: "#c8505a",
		lop: false
	},
	black: {
		coat: "#1f1c1b",
		belly: "#2c2826",
		iris: "#2a1a10",
		lop: false
	},
	fawn: {
		coat: "#d4ab78",
		belly: "#efe3cf",
		iris: "#4a2a14",
		lop: false
	}
};
const J$1 = {
	body: [
		0,
		.118,
		-.02
	],
	chest: [
		0,
		.11,
		.06
	],
	pelvis: [
		0,
		.12,
		-.085
	],
	neck: [[
		0,
		.115,
		.085
	], [
		0,
		.145,
		.105
	]],
	head: [
		0,
		.172,
		.118
	],
	muzzle: [
		0,
		.148,
		.2
	],
	jaw: [
		0,
		.152,
		.13
	],
	ear: [[
		.018,
		.2,
		.112
	], [
		.03,
		.3,
		.07
	]],
	tail: [
		[
			0,
			.105,
			-.15
		],
		[
			0,
			.115,
			-.175
		],
		[
			0,
			.12,
			-.19
		]
	],
	fore: [
		[
			.032,
			.088,
			.07
		],
		[
			.034,
			.052,
			.05
		],
		[
			.03,
			.02,
			.074
		],
		[
			.03,
			.008,
			.086
		],
		[
			.03,
			0,
			.106
		]
	],
	hind: [
		[
			.038,
			.1,
			-.088
		],
		[
			.05,
			.072,
			-.02
		],
		[
			.045,
			.014,
			-.135
		],
		[
			.045,
			.009,
			-.045
		],
		[
			.045,
			0,
			-.018
		]
	]
};
/** `moves`: the body plan's way of moving it (an older version's, for the Actors gallery's history) */
function rabbit(coat = "wild", moves = quadMoves) {
	const L = LOOK$2[coat];
	const q = quadSkeleton(J$1);
	const s = sculpt(q.bones);
	const fur = { tag: "fur" };
	s.egg([
		0,
		.112,
		-.035
	], [
		.066,
		.072,
		.118
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		...fur
	}, [
		-.12,
		0,
		0
	]);
	s.egg([
		0,
		.095,
		.055
	], [
		.05,
		.058,
		.055
	], {
		bone: "chest",
		k: .03,
		...fur
	});
	for (const x of [-1, 1]) s.egg([
		x * .042,
		.085,
		-.075
	], [
		.04,
		.058,
		.068
	], {
		bone: `upperH${x > 0 ? "L" : "R"}`,
		k: .035,
		...fur
	});
	s.egg([
		0,
		.06,
		-.02
	], [
		.05,
		.035,
		.08
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		k: .04,
		tag: "belly"
	});
	s.cone([
		0,
		.115,
		.075
	], [
		0,
		.155,
		.112
	], .042, .036, {
		chain: ["neck", "neck2"],
		k: .03,
		...fur
	});
	const head = {
		bone: "head",
		k: .018,
		tag: "fur"
	};
	s.egg([
		0,
		.172,
		.132
	], [
		.038,
		.04,
		.052
	], head, [
		.3,
		0,
		0
	]);
	for (const x of [-1, 1]) s.egg([
		x * .024,
		.153,
		.148
	], [
		.024,
		.026,
		.03
	], head);
	s.egg([
		0,
		.152,
		.178
	], [
		.022,
		.022,
		.026
	], {
		...head,
		tag: "muzzle",
		k: .014
	});
	s.egg([
		0,
		.138,
		.162
	], [
		.018,
		.012,
		.025
	], {
		bone: "jaw",
		k: .01,
		tag: "belly"
	});
	for (const leg of LEGS) {
		const side = leg[1] === "L" ? 1 : -1;
		const p = (leg[0] === "F" ? J$1.fore : J$1.hind).map((v) => [
			v[0] * side,
			v[1],
			v[2]
		]);
		if (leg[0] === "F") {
			s.cone([
				p[0][0],
				p[0][1] + .01,
				p[0][2]
			], p[1], .018, .012, {
				bone: `upper${leg}`,
				k: .015,
				...fur
			});
			s.cone(p[1], p[2], .01, .008, {
				bone: `lower${leg}`,
				k: .008,
				tag: "paw"
			});
			s.cone(p[2], p[4], .0085, .009, {
				bone: `foot${leg}`,
				k: .006,
				tag: "paw"
			});
		} else {
			s.cone(p[1], p[2], .018, .011, {
				bone: `lower${leg}`,
				k: .02,
				...fur
			});
			s.cone(p[2], p[3], .012, .011, {
				bone: `cannon${leg}`,
				k: .01,
				tag: "paw"
			});
			s.cone(p[3], p[4], .011, .01, {
				bone: `foot${leg}`,
				k: .008,
				tag: "paw"
			});
		}
	}
	s.ball([
		0,
		.118,
		-.16
	], .022, {
		chain: q.tail.slice(0, 1),
		k: .015,
		tag: "tail"
	});
	const base = new three.Color(L.coat), belly = new three.Color(L.belly), t = new three.Color();
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(base);
		if (coat === "wild") {
			c.multiplyScalar(.85 + .3 * fbm3(p.x * 160, p.y * 160, p.z * 160, 2, 7));
			mix(c, "#5d4a39", .4 * ramp(n.y, .5, .95));
		} else c.multiplyScalar(.94 + .08 * fbm3(p.x * 60, p.y * 60, p.z * 60, 2, 7));
		const under = Math.max(ramp(-n.y, .2, .7) * ramp(.09, .06, p.y), at.tag("belly"), at.tag("tail") * ramp(.2, -.5, n.y));
		t.copy(belly);
		c.lerp(t, under * (coat === "black" ? .25 : .9));
		if (coat === "dutch") {
			const front = ramp(p.z, .04, .07) * (1 - at.tag("fur") * ramp(.02, .035, Math.abs(p.x)) * ramp(p.y, .14, .16) * ramp(.16, .13, p.z));
			const blaze = at.tag("muzzle") + ramp(.012, .004, Math.abs(p.x)) * ramp(p.z, .14, .16);
			mix(c, belly, Math.max(front, blaze, at.tag("paw")));
		}
		if (at.main === "muzzle") mix(c, belly, .4);
	};
	const parts = [{ skin: s.skin(.0056, paint, `rabbit-${coat}`) }];
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const base3 = [
			x * .018,
			.2,
			.112
		];
		const len = L.lop ? .12 : .105;
		const dir = L.lop ? new three.Vector3(x * .55, -1, .1).normalize() : new three.Vector3(x * .18, 1, -.35).normalize();
		const mid = new three.Vector3(...base3).addScaledVector(dir, len * .5);
		const q4 = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), dir);
		const rot = new three.Euler().setFromQuaternion(q4);
		const out = egg([
			mid.x,
			mid.y,
			mid.z
		], [
			.024,
			len * .5,
			.008
		], [
			rot.x,
			rot.y,
			rot.z
		]);
		const inner = egg([
			mid.x + dir.z * 0,
			mid.y,
			mid.z + (L.lop ? 0 : .004)
		], [
			.016,
			len * .43,
			.006
		], [
			rot.x,
			rot.y,
			rot.z
		]);
		const tip = coat === "wild" ? "#4a3a2c" : L.coat;
		parts.push({
			geo: out,
			color: (pp) => pp.distanceTo(new three.Vector3(...base3)) > len * .85 ? tip : L.coat,
			bone: `ear${side}`
		});
		parts.push({
			geo: inner,
			color: coat === "black" || coat === "dutch" ? "#3a2f2c" : "#e2b4a8",
			bone: `ear${side}`
		});
	}
	parts.push(...eyes([
		.034,
		.176,
		.148
	], .0085, [
		.9,
		.18,
		.35
	], L.iris, "round", "head", {
		irisR: .82,
		pupilR: .5
	}));
	parts.push({
		geo: egg([
			0,
			.158,
			.2
		], [
			.006,
			.004,
			.003
		]),
		color: "#c98f86",
		bone: "head"
	});
	const r = rig(q.bones, parts, animalMaterials(.9));
	r.object.name = `rabbit-${coat}`;
	return {
		rig: r,
		clips: moves(q, {
			seed: RABBIT_COATS.indexOf(coat) + 31,
			gaits: { hop: {
				speed: .55,
				stride: .3,
				duty: .32,
				feet: {
					FL: 0,
					FR: .08,
					HL: .42,
					HR: .45
				},
				lift: .035,
				bob: .03,
				roll: 0,
				pitch: .12,
				tilt: .7,
				fold: [.6, .35],
				flip: .6,
				nod: .03,
				flex: .18,
				bobs: 1
			} },
			tail: {
				sway: .05,
				carry: -.2,
				hz: 2
			},
			ears: L.lop ? .15 : .6
		}),
		first: "idle",
		gears: { hop: .55 },
		feet: LEGS.map((l) => `foot${l}`)
	};
}

//#endregion
//#region src/lib/actors/species/sheep.ts
const SHEEP_BREEDS = [
	"whiteface",
	"suffolk",
	"merino",
	"black",
	"shorn"
];
const LOOK$1 = {
	whiteface: {
		wool: "#ece6d6",
		face: "#efe7dc",
		legs: "#e8dfd2",
		nose: "#c9a59a",
		depth: 1,
		lumps: .032,
		ears: "pricked",
		woolFace: .15,
		woolLegs: 0
	},
	suffolk: {
		wool: "#ebe4d2",
		face: "#211c19",
		legs: "#1f1a17",
		nose: "#151210",
		depth: 1,
		lumps: .032,
		ears: "long",
		woolFace: 0,
		woolLegs: 0
	},
	merino: {
		wool: "#e6dcc6",
		face: "#efe6da",
		legs: "#ebe2d6",
		nose: "#d3b3a5",
		depth: 1.25,
		lumps: .028,
		ears: "short",
		woolFace: 1,
		woolLegs: 1
	},
	black: {
		wool: "#2e2925",
		face: "#1d1916",
		legs: "#1d1916",
		nose: "#120f0d",
		depth: 1,
		lumps: .032,
		ears: "pricked",
		woolFace: .15,
		woolLegs: 0
	},
	shorn: {
		wool: "#e9e0cc",
		face: "#ece3d7",
		legs: "#e6dccf",
		nose: "#c8a194",
		depth: .25,
		lumps: .02,
		ears: "pricked",
		woolFace: 0,
		woolLegs: 0
	}
};
const J = {
	body: [
		0,
		.6,
		-.02
	],
	chest: [
		0,
		.6,
		.28
	],
	pelvis: [
		0,
		.62,
		-.3
	],
	neck: [[
		0,
		.58,
		.38
	], [
		0,
		.74,
		.5
	]],
	head: [
		0,
		.88,
		.57
	],
	muzzle: [
		0,
		.74,
		.8
	],
	jaw: [
		0,
		.81,
		.6
	],
	ear: [[
		.05,
		.905,
		.565
	], [
		.15,
		.88,
		.52
	]],
	tail: [
		[
			0,
			.63,
			-.5
		],
		[
			0,
			.55,
			-.56
		],
		[
			0,
			.46,
			-.58
		],
		[
			0,
			.38,
			-.58
		]
	],
	fore: [
		[
			.1,
			.5,
			.32
		],
		[
			.1,
			.35,
			.25
		],
		[
			.09,
			.2,
			.29
		],
		[
			.09,
			.065,
			.3
		],
		[
			.09,
			0,
			.355
		]
	],
	hind: [
		[
			.1,
			.56,
			-.3
		],
		[
			.11,
			.4,
			-.2
		],
		[
			.1,
			.23,
			-.38
		],
		[
			.09,
			.065,
			-.35
		],
		[
			.09,
			0,
			-.3
		]
	]
};
/** `moves`: the body plan's way of moving it (an older version's, for the Actors gallery's history) */
function sheep(breed = "suffolk", moves = quadMoves) {
	const L = LOOK$1[breed];
	const q = quadSkeleton(J);
	const w = L.depth;
	const s = sculpt(q.bones);
	const wool = {
		tag: "wool",
		bump: .008 + .014 * w,
		lumps: L.lumps
	};
	s.egg([
		0,
		.6,
		-.02
	], [
		.15 + .08 * w,
		.17 + .07 * w,
		.38 + .08 * w
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		...wool
	});
	s.egg([
		0,
		.61,
		-.29
	], [
		.15 + .07 * w,
		.16 + .07 * w,
		.16 + .06 * w
	], {
		bone: "pelvis",
		k: .08,
		...wool
	});
	s.egg([
		0,
		.58,
		.27
	], [
		.14 + .07 * w,
		.17 + .06 * w,
		.15 + .06 * w
	], {
		bone: "chest",
		k: .08,
		...wool
	});
	s.egg([
		0,
		.5 - .02 * w,
		-.02
	], [
		.13 + .05 * w,
		.09 + .04 * w,
		.3
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		k: .1,
		...wool
	});
	s.cone([
		0,
		.6,
		.34
	], [
		0,
		.78,
		.52
	], .09 + .06 * w, .05 + .03 * w, {
		chain: ["neck", "neck2"],
		k: .07,
		...wool
	});
	const face = {
		bone: "head",
		tag: "face",
		k: .035
	};
	s.egg([
		0,
		.865,
		.6
	], [
		.062,
		.07,
		.08
	], face);
	s.egg([
		0,
		.812,
		.68
	], [
		.052,
		.062,
		.13
	], face, [
		.62,
		0,
		0
	]);
	s.egg([
		0,
		.757,
		.765
	], [
		.043,
		.045,
		.058
	], {
		...face,
		tag: "nose",
		k: .025
	}, [
		.62,
		0,
		0
	]);
	s.egg([
		0,
		.775,
		.69
	], [
		.04,
		.03,
		.08
	], {
		bone: "jaw",
		tag: "face",
		k: .02
	}, [
		.5,
		0,
		0
	]);
	if (L.woolFace > .5) s.egg([
		0,
		.885,
		.59
	], [
		.078,
		.062,
		.072
	], {
		bone: "head",
		k: .04,
		...wool,
		bump: .012
	});
	for (const leg of LEGS) {
		const side = leg[1] === "L" ? 1 : -1;
		const p = (leg[0] === "F" ? J.fore : J.hind).map((v) => [
			v[0] * side,
			v[1],
			v[2]
		]);
		const fleece = L.woolLegs > .5 ? {
			...wool,
			bump: .012
		} : { tag: "leg" };
		if (leg[0] === "F") s.cone([
			p[0][0] * .9,
			p[0][1] + .04,
			p[0][2]
		], p[1], .07 + .02 * w, .05, {
			bone: `upper${leg}`,
			k: .06,
			...wool
		});
		else s.egg([
			p[0][0] * 1.05,
			.48,
			-.26
		], [
			.085 + .03 * w,
			.13 + .02 * w,
			.11 + .02 * w
		], {
			bone: `upper${leg}`,
			k: .07,
			...wool
		});
		s.cone(p[1], p[2], leg[0] === "F" ? .034 : .04, .024, {
			bone: `lower${leg}`,
			k: .03,
			...leg[0] === "H" ? wool : fleece,
			...leg[0] === "H" ? { bump: .004 + .006 * w } : {}
		});
		s.cone(p[2], p[3], .022, .017, {
			bone: `cannon${leg}`,
			k: .02,
			...fleece
		});
		s.cone(p[3], [
			p[4][0],
			.03,
			(p[3][2] + p[4][2]) / 2
		], .018, .019, {
			bone: `foot${leg}`,
			k: .012,
			tag: "leg"
		});
	}
	s.cone(J.tail[0], J.tail[2], .05 + .02 * w, .035, {
		chain: q.tail.slice(0, 2),
		k: .05,
		...wool
	});
	const woolC = new three.Color(L.wool), faceC = new three.Color(L.face), legC = new three.Color(L.legs), noseC = new three.Color(L.nose);
	const dirt = new three.Color("#b5a387"), t1 = new three.Color(), t2 = new three.Color();
	const paint = (c, at) => {
		const { p, n } = at;
		const crimp = fbm3(p.x * 30, p.y * 30, p.z * 30, 2, 3);
		t1.copy(woolC).multiplyScalar(.92 + .1 * crimp);
		mix(t1, dirt, .35 * ramp(-n.y, -.1, .8) * (L.wool === LOOK$1.black.wool ? .2 : 1) + .25 * ramp(.42 - p.y, 0, .2));
		t2.copy(at.main === "nose" ? noseC : at.main === "leg" ? legC : faceC).multiplyScalar(.95 + .08 * fbm3(p.x * 60, p.y * 60, p.z * 60, 2, 4));
		const wv = ramp(at.tag("wool"), .3, .7);
		c.copy(t2).lerp(t1, wv);
	};
	const parts = [{ skin: s.skin(.015, paint, `sheep-${breed}`) }];
	const earLen = L.ears === "long" ? .12 : L.ears === "pricked" ? .095 : .07;
	/** a dark-faced breed's ears are dark inside too */
	const dark = new three.Color(L.face).getHSL({
		h: 0,
		s: 0,
		l: 0
	}).l < .3;
	const droop = L.ears === "long" ? -.75 : -.15;
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const base = [
			x * .05,
			.9,
			.565
		];
		const tip = new three.Vector3(x, droop, -.25).normalize().multiplyScalar(earLen);
		parts.push({
			geo: egg([
				base[0] + tip.x * .5,
				base[1] + tip.y * .5,
				base[2] + tip.z * .5
			], [
				earLen * .5,
				.012,
				.03
			], [
				0,
				x * -.25,
				Math.atan2(tip.y, Math.abs(tip.x)) * x
			]),
			color: L.face,
			bone: `ear${side}`
		});
		parts.push({
			geo: egg([
				base[0] + tip.x * .52,
				base[1] + tip.y * .52 + .004,
				base[2] + tip.z * .52 + .006
			], [
				earLen * .42,
				.006,
				.022
			], [
				0,
				x * -.25,
				Math.atan2(tip.y, Math.abs(tip.x)) * x
			]),
			color: dark ? "#3a2f2a" : "#d9b3a6",
			bone: `ear${side}`
		});
	}
	parts.push(...eyes([
		.054,
		.855,
		.648
	], .0145, [
		.85,
		.12,
		.45
	], "#b8862e", "bar"));
	for (const leg of LEGS) {
		const side = leg[1] === "L" ? 1 : -1;
		const toe = (leg[0] === "F" ? J.fore : J.hind)[4];
		for (const dx of [-.011, .011]) parts.push({
			geo: egg([
				toe[0] * side + dx,
				.017,
				toe[2] - .017
			], [
				.012,
				.018,
				.026
			], [
				-.25,
				0,
				0
			]),
			color: "#2b2622",
			bone: `foot${leg}`
		});
	}
	parts.push({
		geo: spike([
			0,
			.745,
			.815
		], [
			0,
			-.4,
			1
		], .004, .004),
		color: L.nose,
		bone: "head"
	});
	const r = rig(q.bones, parts, animalMaterials(.95));
	r.object.name = `sheep-${breed}`;
	return {
		rig: r,
		clips: moves(q, {
			seed: SHEEP_BREEDS.indexOf(breed) + 11,
			gaits: {
				walk: {
					speed: .6,
					stride: .62,
					duty: .68,
					feet: {
						HL: 0,
						FL: .25,
						HR: .5,
						FR: .75
					},
					lift: .07,
					bob: .012,
					roll: .025,
					pitch: .012,
					tilt: .35,
					fold: [1, .45],
					flip: .7,
					nod: .05,
					flex: .02
				},
				trot: {
					speed: 1.6,
					stride: 1.1,
					duty: .42,
					feet: {
						HL: 0,
						FR: 0,
						FL: .5,
						HR: .5
					},
					lift: .09,
					bob: .025,
					roll: .02,
					pitch: .015,
					tilt: .5,
					fold: [1.4, .7],
					flip: 1,
					nod: .03,
					flex: .03
				}
			},
			tail: {
				sway: .12,
				carry: .3,
				hz: 1.4
			},
			ears: L.ears === "long" ? .25 : .45
		}),
		first: "graze",
		gears: {
			walk: .6,
			trot: 1.6
		},
		feet: LEGS.map((l) => `foot${l}`)
	};
}

//#endregion
//#region src/lib/actors/species/songbird.js
/** @typedef {import('../rig').V3} V3 */
/** @typedef {import('../rig').Pose} Pose */
/** @typedef {import('../rig').PartSpec} PartSpec */
/** @typedef {import('../rig').Cast} Cast */
/** @typedef {import('../sculpt').Surface} Surface */
/** @typedef {'robin' | 'blackbird' | 'greattit' | 'sparrow' | 'chaffinch'} Songbird */
/** @type {Songbird[]} */
const SONGBIRDS = [
	"robin",
	"blackbird",
	"greattit",
	"sparrow",
	"chaffinch"
];
/**
* Each bird: its size against a robin's, its bill (length, thickness at the root, colour), its legs' colour, its
* eye-ring, and how it is coloured (`paint`).
* @type {Record<Songbird, { k: number, bill: [number, number, string], legs: string, ring?: string, wing: string, bars?: string, tail: string }>}
*/
const LOOK = {
	robin: {
		k: 1,
		bill: [
			.012,
			.0028,
			"#2a2420"
		],
		legs: "#8a7a6a",
		wing: "#6e5c42",
		tail: "#6a5840"
	},
	blackbird: {
		k: 1.55,
		bill: [
			.016,
			.0034,
			"#f2a51c"
		],
		legs: "#2a2624",
		ring: "#f2b23a",
		wing: "#161515",
		tail: "#141313"
	},
	greattit: {
		k: .96,
		bill: [
			.009,
			.0028,
			"#1c1c1e"
		],
		legs: "#5a6a7a",
		wing: "#6d8197",
		bars: "#f2f2ec",
		tail: "#5f6f82"
	},
	sparrow: {
		k: 1.04,
		bill: [
			.0095,
			.0042,
			"#2c2a2a"
		],
		legs: "#a08a72",
		wing: "#7a5434",
		bars: "#f0ece2",
		tail: "#5e4630"
	},
	chaffinch: {
		k: 1.05,
		bill: [
			.0105,
			.004,
			"#7c8a96"
		],
		legs: "#8a7a70",
		wing: "#232222",
		bars: "#f4f2ec",
		tail: "#2c2a2a"
	}
};
/** a robin's joints (m); the others are its measure times their size */
const ROBIN = {
	body: [
		0,
		.052,
		0
	],
	neck: [[
		0,
		.064,
		.016
	], [
		0,
		.071,
		.021
	]],
	head: [
		0,
		.078,
		.024
	],
	beak: [
		0,
		.077,
		.044
	],
	tail: [
		0,
		.052,
		-.026
	],
	wing: [
		.016,
		.064,
		.012
	],
	leg: [
		[
			.008,
			.045,
			.002
		],
		[
			.009,
			.036,
			.011
		],
		[
			.009,
			.0245,
			-.002
		],
		[
			.009,
			.002,
			.003
		],
		[
			.009,
			0,
			.015
		]
	]
};
/** how far the whole bird above its legs sits lower than the robin's joints say (its legs mostly hidden in its feathers) */
const SINK = .011;
/** a robin's point, sunk @param {number[]} p @returns {number[]} */
const sunk = (p) => [
	p[0],
	p[1] - SINK,
	p[2]
];
/** a point scaled by k @param {number[]} p @param {number} k @returns {V3} */
const at = (p, k) => [
	p[0] * k,
	p[1] * k,
	p[2] * k
];
const SPAN_F = /* @__PURE__ */ (() => new three.Vector3(0, -.3, -1).normalize())();
const LEAD_F = /* @__PURE__ */ (() => new three.Vector3(0, 1, -.3).normalize())();
const NORM_F = /* @__PURE__ */ (() => SPAN_F.clone().cross(LEAD_F))();
const FOLDED = /* @__PURE__ */ (() => new three.Matrix4().makeBasis(SPAN_F, LEAD_F, NORM_F))();
const SPREAD = /* @__PURE__ */ (() => new three.Matrix4().makeBasis(new three.Vector3(1, 0, 0), new three.Vector3(0, 0, 1), new three.Vector3(1, 0, 0).cross(new three.Vector3(0, 0, 1))))();
/** folded → spread, as a turn of the wing bone (the left wing) */
const OPEN = /* @__PURE__ */ (() => new three.Quaternion().setFromRotationMatrix(SPREAD.clone().multiply(FOLDED.clone().transpose())))();
const FLAP = /* @__PURE__ */ (() => new three.Quaternion())();
const QW = /* @__PURE__ */ (() => new three.Quaternion())();
const EW = /* @__PURE__ */ (() => new three.Euler())();
/**
* The wing bone's turn: `open` 0 (folded) … 1 (spread), `beat` how far the spread wing is raised (rad; negative: down),
* `sweep` how far it is swept back; the right wing the left's mirror.
* @param {'L' | 'R'} side @param {number} open @param {number} beat @param {number} [sweep]
* @returns {[number, number, number]}
*/
function wingTurn(side, open, beat, sweep = 0) {
	FLAP.setFromEuler(EW.set(0, -sweep, beat, "YZX"));
	FLAP.multiply(OPEN);
	QW.set(0, 0, 0, 1).slerp(FLAP, open);
	if (side === "R") QW.set(QW.x, -QW.y, -QW.z, QW.w);
	EW.setFromQuaternion(QW, "XYZ");
	return [
		EW.x,
		EW.y,
		EW.z
	];
}
/**
* A wing, folded at rest along the flank from `shoulder`: `span` long, `chord` deep at its root, the primaries'
* tips notched along its trailing edge; coloured by `color` (its bars).
* @param {V3} shoulder @param {number} span @param {number} chord @param {number} x which side (1 left, −1 right)
* @param {(u: number, v: number) => string} color by how far along the span (0…1) and back from the leading edge (0…1)
* @param {string} bone
* @returns {PartSpec}
*/
function wing(shoulder, span, chord, x, color, bone) {
	const s = new three.Shape();
	s.moveTo(0, 0);
	s.quadraticCurveTo(span * .55, chord * .12, span * .9, chord * .02);
	s.quadraticCurveTo(span * 1.02, -chord * .1, span, -chord * .32);
	const tips = 6;
	for (let i = 0; i < tips; i++) {
		const u = span * (1 - (i + .5) / tips * .55), v = -chord * (.35 + .5 * (i / tips));
		s.lineTo(u + span * .04, v + chord * .07);
		s.lineTo(u, v);
	}
	s.lineTo(span * .35, -chord * .95);
	s.quadraticCurveTo(span * .12, -chord * 1.02, 0, -chord * .85);
	s.lineTo(0, 0);
	const g = new three.ExtrudeGeometry(s, {
		depth: chord * .05,
		bevelEnabled: false,
		curveSegments: 4
	});
	g.translate(0, 0, -chord * .025);
	const span3 = SPAN_F.clone(), lead3 = LEAD_F.clone(), norm3 = NORM_F.clone().multiplyScalar(x);
	const place = new three.Matrix4().makeBasis(span3, lead3, norm3);
	place.setPosition(shoulder[0] - x * chord * .08, shoulder[1] - chord * .05, shoulder[2]);
	g.applyMatrix4(place);
	const o = new three.Vector3(...shoulder);
	return {
		geo: g,
		color: (p) => {
			const d = p.clone().sub(o);
			return color(Math.max(0, Math.min(1, d.dot(span3) / span)), Math.max(0, Math.min(1, -d.dot(lead3) / chord)));
		},
		bone
	};
}
/**
* A songbird, rigged, with its moves.
* @param {Songbird} [kind]
* @returns {Cast}
*/
function songbird(kind = "robin") {
	const L = LOOK[kind], k = L.k;
	/** @type {import('../plans/bird').BirdJoints} */
	const J = {
		body: at(sunk(ROBIN.body), k),
		neck: ROBIN.neck.map((p) => at(sunk(p), k)),
		head: at(sunk(ROBIN.head), k),
		beak: at(sunk(ROBIN.beak), k),
		tail: at(sunk(ROBIN.tail), k),
		wing: at(sunk(ROBIN.wing), k),
		leg: ROBIN.leg.map((p, i) => at(i < 2 ? sunk(p) : i === 2 ? [
			p[0],
			p[1] - SINK * .6,
			p[2]
		] : p, k))
	};
	const b = birdSkeleton(J);
	const jawAt = [
		0,
		J.head[1] - .003 * k,
		J.head[2] + .009 * k
	];
	const bones = [...b.bones, {
		name: "jaw",
		parent: "head",
		at: jawAt
	}];
	const s = sculpt(bones);
	const feather = {
		bump: 7e-4 * k,
		lumps: .003 * k
	};
	const fat = kind === "robin" || kind === "greattit" ? 1.06 : 1;
	s.egg(at(sunk([
		0,
		.054,
		-.002
	]), k), [
		.0195 * k * fat,
		.02 * k * fat,
		.031 * k
	], {
		bone: "body",
		tag: "back",
		...feather
	}, [
		.5,
		0,
		0
	]);
	s.egg(at(sunk([
		0,
		.057,
		.013
	]), k), [
		.018 * k * fat,
		.019 * k * fat,
		.018 * k
	], {
		bone: "body",
		k: .008 * k,
		tag: "breast",
		...feather
	});
	s.egg(at(sunk([
		0,
		.045,
		-.004
	]), k), [
		.015 * k,
		.011 * k,
		.02 * k
	], {
		bone: "body",
		k: .007 * k,
		tag: "belly",
		...feather
	});
	s.cone(J.neck[0], J.head, .0135 * k, .012 * k, {
		chain: b.neck,
		k: .006 * k,
		tag: "neck",
		...feather
	});
	s.egg(at(sunk([
		0,
		.0785,
		.0255
	]), k), [
		.0135 * k,
		.0135 * k,
		.0155 * k
	], {
		bone: "head",
		k: .005 * k,
		tag: "head",
		bump: 3e-4 * k,
		lumps: .002 * k
	});
	s.egg(at(sunk([
		0,
		.045,
		-.048
	]), k), [
		.0105 * k,
		.0028 * k,
		.027 * k
	], {
		bone: "tail",
		k: .004 * k,
		tag: "tail"
	}, [
		.42,
		0,
		0
	]);
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg(at(sunk([
		x * .0165,
		.06,
		-.006
	]), k), [
		.0055 * k,
		.0135 * k,
		.025 * k
	], {
		bone: "body",
		k: .004 * k,
		tag: "wing",
		...feather
	}, [
		.42,
		x * -.06,
		0
	]);
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
		x * J.leg[1][0],
		J.leg[1][1] + .002 * k,
		J.leg[1][2] - .002 * k
	], [
		.0055 * k,
		.008 * k,
		.007 * k
	], {
		bone: `shank${side}`,
		k: .004 * k,
		tag: "belly",
		...feather
	});
	const c = (h) => new three.Color(h);
	const C = {
		robinBack: c("#7a6a4e"),
		orange: c("#d9622b"),
		border: c("#9aa3a6"),
		white: c("#efeae0"),
		cream: c("#e6dccb"),
		black: c("#181717"),
		sheen: c("#2b2a2c"),
		olive: c("#7c8a3c"),
		yellow: c("#e3c93a"),
		blueGrey: c("#6d8197"),
		grey: c("#8b8b88"),
		chestnut: c("#8a4a22"),
		paleGrey: c("#c9c5bc"),
		brown: c("#8a6038"),
		dark: c("#2b2420"),
		blueCrown: c("#6f8494"),
		pink: c("#c47a62"),
		paleP: c("#d9b2a2"),
		chestBrown: c("#8a5a3a"),
		green: c("#88915a")
	};
	/** @param {THREE.Color} col @param {Surface} sf */
	const paint = (col, sf) => {
		const { p, n } = sf;
		const fine = noise3(p.x * 900 / k, p.y * 900 / k, p.z * 900 / k, 7);
		const head = sf.tag("head") + sf.tag("neck") * .6;
		const front = ramp(n.z, .05, .45);
		const under = Math.max(sf.tag("belly"), ramp(-n.y, .15, .6));
		const y = p.y / k + SINK, z = p.z / k;
		if (kind === "robin") {
			col.copy(C.robinBack);
			const face = front * (y > .046 ? 1 : 0) * (1 - ramp(n.y, .55, .85)) * (z > -.004 ? 1 : 0);
			mix(col, C.border, ramp(face, .05, .35) * .9);
			mix(col, C.orange, ramp(face, .3, .6));
			mix(col, C.white, under * (y < .05 ? 1 : .3));
		} else if (kind === "blackbird") {
			col.copy(C.black);
			mix(col, C.sheen, .4 + .3 * fine);
		} else if (kind === "greattit") {
			col.copy(C.olive);
			mix(col, C.yellow, Math.max(front * sf.tag("breast"), under) * (1 - head));
			mix(col, C.black, (1 - ramp(Math.abs(p.x) / k, .0025, .004)) * Math.max(front, under) * (y < .066 ? 1 : 0));
			mix(col, C.black, head);
			const cheek = head * ramp(Math.abs(n.x), .45, .75) * (y < .08 ? 1 : 0) * (z > .018 ? 1 : 0);
			mix(col, C.white, cheek);
			mix(col, C.blueGrey, sf.tag("wing") + sf.tag("tail"));
		} else if (kind === "sparrow") {
			col.copy(C.brown);
			mix(col, C.dark, ramp(Math.sin(p.x * 1400 / k + fine * 3), .6, .95) * sf.tag("back") * ramp(n.y, .2, .7));
			mix(col, C.paleGrey, under);
			mix(col, C.chestnut, head * (1 - front));
			mix(col, C.grey, head * ramp(n.y, .55, .85));
			mix(col, C.paleGrey, head * front * ramp(Math.abs(n.x), .3, .6));
			const bib = (1 - ramp(Math.abs(p.x) / k, .005, .009)) * front * (y > .055 && y < .074 ? 1 : 0);
			mix(col, C.black, bib);
			mix(col, C.chestBrown, sf.tag("wing"));
		} else {
			col.copy(C.chestBrown);
			mix(col, C.green, ramp(-n.z, .5, .9) * sf.tag("back"));
			mix(col, C.pink, front * (1 - ramp(n.y, .5, .8)));
			mix(col, C.paleP, under);
			mix(col, C.blueCrown, head * Math.max(ramp(n.y, .4, .75), ramp(-n.z, .1, .5)));
			mix(col, C.dark, sf.tag("wing") * .8 + sf.tag("tail"));
		}
		col.multiplyScalar(.94 + .1 * fine);
	};
	/** @type {PartSpec[]} */
	const parts = [{ skin: s.skin(.0022 * k, paint, `bird-${kind}`) }];
	const [bl, bt, bc] = L.bill;
	const root = [
		0,
		jawAt[1] + .0035 * k,
		J.head[2] + .011 * k
	];
	parts.push({
		geo: spike(root, [
			0,
			-.08,
			1
		], bt, bl * .95, { flat: .95 }),
		color: bc,
		bone: "head"
	});
	parts.push({
		geo: spike([
			0,
			root[1] - bt * .7,
			root[2] - .001 * k
		], [
			0,
			-.16,
			1
		], bt * .8, bl * .8, { flat: .9 }),
		color: bc,
		bone: "jaw"
	});
	parts.push(...eyes(at(sunk([
		.0098,
		.0805,
		.0315
	]), k), .0034 * k, [
		.92,
		.1,
		.38
	], "#140d09", "round", "head", {
		irisR: .85,
		rim: L.ring ?? "#1d1713"
	}));
	if (L.ring) for (const x of [1, -1]) parts.push({
		geo: new three.TorusGeometry(.0034 * k, 7e-4 * k, 6, 14).rotateY(x * 1.2).translate(x * .0102 * k, .0695 * k, .0312 * k),
		color: L.ring,
		bone: "head"
	});
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const shoulder = [
			x * J.wing[0],
			J.wing[1],
			J.wing[2]
		];
		parts.push(wing(shoulder, .07 * k, .03 * k, x, (u, v) => {
			if (L.bars && v < .42 && (u > .18 && u < .26 || kind === "chaffinch" && u > .36 && u < .43)) return L.bars;
			if (kind === "chaffinch" && u < .15) return "#c8cacc";
			return v > .7 && u > .5 ? new three.Color(L.wing).multiplyScalar(.75).getStyle() : L.wing;
		}, `wing${side}`));
	}
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const ankle = [
			x * J.leg[2][0],
			J.leg[2][1],
			J.leg[2][2]
		], toes = [
			x * J.leg[3][0],
			J.leg[3][1],
			J.leg[3][2]
		];
		parts.push({
			geo: limb(ankle, toes, .0011 * k, .001 * k, { seg: 6 }),
			color: L.legs,
			bone: `tarsus${side}`
		});
		for (const a of [
			-.45,
			0,
			.45,
			Math.PI
		]) {
			const len = (a === Math.PI ? .008 : a === 0 ? .012 : .009) * k;
			const tip = [
				toes[0] + Math.sin(a) * len,
				8e-4 * k,
				toes[2] + Math.cos(a) * len
			];
			parts.push({
				geo: limb(toes, tip, 8e-4 * k, 5e-4 * k, { seg: 5 }),
				color: L.legs,
				bone: `toes${side}`
			});
		}
	}
	parts.push({
		geo: egg(at(sunk([
			0,
			.039,
			-.072
		]), k), [
			.0125 * k,
			.0012 * k,
			.012 * k
		], [
			.42,
			0,
			0
		]),
		color: L.tail,
		bone: "tail"
	});
	const mats = animalMaterials(.85);
	mats[0].side = three.DoubleSide;
	const r = rig(bones, parts, mats);
	r.object.name = `bird-${kind}`;
	const seed = SONGBIRDS.indexOf(kind) + 61;
	const base = birdMoves(b, {
		seed,
		gaits: { hop: {
			speed: .3 * k,
			stride: .07 * k,
			duty: .45,
			feet: {
				L: 0,
				R: 0
			},
			lift: .012 * k,
			bob: .009 * k,
			roll: 0,
			pitch: .06,
			tilt: .35,
			fold: 1.2,
			curl: .5,
			hold: 0
		} },
		wag: .15
	});
	const beakDir = new three.Vector3(J.beak[0] - J.head[0], J.beak[1] - J.head[1], J.beak[2] - J.head[2]).normalize();
	/** the wings folded, the tail at rest with a flick now and then @param {number} t @returns {Pose} */
	const still = (t) => ({
		wingL: [
			0,
			0,
			0
		],
		wingR: [
			0,
			0,
			0
		],
		tail: [
			-.25 * Math.pow(Math.max(0, Math.sin(t * .9 + seed)), 12),
			.04 * wander(t, 2, seed),
			0
		]
	});
	return {
		rig: r,
		clips: {
			fly: (t) => {
				const u = frac(t / .85 + seed * .13), beating = u < .62;
				const beat = Math.sin(t * Math.PI * 2 * 9);
				const open = beating ? 1 : 1 - smooth((u - .62) / .08) + smooth((u - .94) / .06);
				/** @type {Pose} */
				const pose = {
					root: [
						0,
						beating ? .004 * k * Math.max(0, beat) : -.01 * k * smooth((u - .62) / .38),
						0
					],
					body: [
						.55,
						0,
						0
					],
					tail: [
						-.35,
						0,
						0
					],
					wingL: wingTurn("L", open, beating ? .15 + .85 * beat : .1, beating ? .25 - .2 * beat : .6),
					wingR: wingTurn("R", open, beating ? .15 + .85 * beat : .1, beating ? .25 - .2 * beat : .6)
				};
				birdLegs(b, pose, null, null, 0, {
					L: {
						y: .02 * k,
						z: -.016 * k,
						curl: 1.1
					},
					R: {
						y: .02 * k,
						z: -.016 * k,
						curl: 1.1
					}
				});
				birdHead(b, pose, new three.Vector3(0, J.head[1] - .006 * k, J.head[2] + .01 * k), new three.Vector3(0, -.15, 1).normalize());
				return pose;
			},
			hop: (t, m) => ({
				...base.hop(t, m),
				...still(t),
				tail: [
					.15 * Math.max(0, Math.sin(t * Math.PI * 2 * .3 * k / (.07 * k))),
					0,
					0
				]
			}),
			peck: (t) => ({
				...base.peck(t),
				...still(t)
			}),
			idle: (t) => ({
				...base.idle(t),
				...still(t)
			}),
			sing: (t) => {
				/** @type {Pose} */
				const pose = {
					...still(t),
					body: [
						-.15,
						0,
						0
					],
					root: [
						0,
						-.004 * k,
						0
					]
				};
				const u = frac(t / 4.2 + seed * .1), phrase = u < .55;
				pose.jaw = [
					.12 + .5 * (phrase ? Math.max(0, Math.sin(t * Math.PI * 2 * (kind === "blackbird" ? 4 : 7))) : 0) * smooth(u / .05) * (1 - smooth((u - .5) / .05)),
					0,
					0
				];
				birdLegs(b, pose, null, null, 0, {
					L: { curl: .6 },
					R: { curl: .6 }
				});
				const look = wander(t, 3, seed + 2);
				birdHead(b, pose, new three.Vector3(.002 * k * look, J.head[1] + .006 * k, J.head[2] - .002 * k), beakDir.clone().applyAxisAngle(new three.Vector3(1, 0, 0), phrase ? -.55 : -.2).applyAxisAngle(new three.Vector3(0, 1, 0), .5 * look));
				return pose;
			},
			sit: (t) => {
				/** @type {Pose} */
				const pose = {
					...still(t),
					root: [
						0,
						-.014 * k,
						0
					],
					body: [
						.12,
						0,
						0
					],
					tail: [
						-.1,
						0,
						0
					]
				};
				birdLegs(b, pose, null, null, 0, {
					L: {
						y: .008 * k,
						curl: .7
					},
					R: {
						y: .008 * k,
						curl: .7
					}
				});
				const look = wander(t, 2.2, seed + 5);
				birdHead(b, pose, new three.Vector3(.002 * k * look, J.head[1] - .008 * k, J.head[2] - .006 * k), beakDir.clone().applyAxisAngle(new three.Vector3(0, 1, 0), .9 * look));
				return pose;
			}
		},
		first: "sing",
		gears: { hop: .3 * k },
		feet: ["toesL", "toesR"]
	};
}

//#endregion
//#region src/lib/actors/casts.ts
const each = (kind, ids, make) => Object.fromEntries(ids.map((id) => [`${kind}-${id}`, () => make(id)]));
const CASTS = /* @__PURE__ */ (() => ({
	...each("chicken", CHICKEN_KINDS, chicken),
	...each("goose", GOOSE_BREEDS, goose),
	...each("goat", GOAT_BREEDS, goat),
	...each("sheep", SHEEP_BREEDS, sheep),
	...each("rabbit", RABBIT_COATS, rabbit),
	...each("frog", FROG_KINDS, frog),
	...each("fish", FISH_KINDS, fish),
	...each("bird", SONGBIRDS, songbird),
	bee,
	ant,
	"ant-hill": antHill
}))();

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
//#region src/lib/actors/index.ts
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({}))();
const animal = (id, label, note) => ({
	id,
	label,
	note,
	make: CASTS[id],
	ready: () => prepare(id)
});
const LIST = /* @__PURE__ */ (() => [{
	id: "fish",
	label: "Fish",
	note: "a wave down the body, a beat of the tail for every length swum: swims, turns, hangs sculling",
	from: "Sandbox 3: the ponds and the aquaponics tanks",
	variants: [
		animal("fish-koi", "Koi, orange", "in the ponds"),
		animal("fish-kohaku", "Koi, kohaku", "white with red, in the ponds"),
		animal("fish-ogon", "Koi, ogon", "metallic gold, in the ponds"),
		animal("fish-carp", "Carp", "bronze, barbels at its mouth, in the ponds"),
		animal("fish-nile", "Nile tilapia", "grey-green and barred, its tail edged red, in the tanks"),
		animal("fish-redtilapia", "Red tilapia", "pink-orange, in the tanks")
	]
}])();
/**
* How finely an animal is built (1: as it is; a world draws its far-off flocks at a fifth,
* $lib/assets/render/crowd.js `FAR`): its shapes coarser and its smallest parts left off, its bones and its clips the
* same. Every version of every kind but the stand-in takes it.
*/
const DETAIL = {
	id: "detail",
	label: "Detail",
	type: "number",
	min: .05,
	max: 1,
	step: .01,
	value: 1
};
const detailed = /* @__PURE__ */ (() => /* @__PURE__ */ new WeakMap())();
const withDetail = (list) => {
	if (!detailed.has(list)) detailed.set(list, list.map((a) => ({
		...a,
		make: (detail) => detail === void 0 || !(detail < 1) ? a.make() : lowDetail(() => a.make(), detail)
	})));
	return detailed.get(list);
};
const FAMILIES = /* @__PURE__ */ (() => versioned(LIST, "variants", HISTORY).map((f) => f.id === "stand-in" ? f : {
	...f,
	params: [{ ...DETAIL }],
	variants: withDetail(f.variants),
	versions: f.versions.map((v) => ({
		...v,
		build: withDetail(v.build)
	}))
}))();

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
const recipe = (id, v, variant) => recipeIn("actors", FAMILIES, id, v, variant);
const list = () => recipesIn(FAMILIES);

//#endregion
exports.list = list;
exports.recipe = recipe;