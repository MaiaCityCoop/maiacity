/*
 * A PERSON'S BODY — a person rigged head to toe on the VRM 1.0 humanoid skeleton (the piece "Person skeleton": 52
 * bones, spine in four, clavicles, fingers and toes) under one skin, skinned by dual quaternions: the torso lofted in
 * rings (trousers, belt, T-shirt), arms, a palm and fifteen finger bones a hand, legs, trainers that bend at the ball
 * of the foot; MakeHuman's CC0 head (the piece "Person head") with its expressions (`joy`, `friendly`) on top; its
 * held poses (sit, kneel, lie, look up, think, point, arms crossed …) and nothing that moves on its own: its motion
 * is the piece "Person motion"'s. Every measure is for a person of 1.80 m to the crown, scaled to the height asked
 * for. The rig (`rig`, `poser`, `blend`, `limb`, `loft`, `lowDetail` and the skinning) is the actors' own
 * ($lib/actors/rig.ts, dqs.ts), word for word.
 *
 * `person(look, height, { v })`: { rig, poses, measure } — `look` the colours and words of LOOK, `height` metres to
 * the crown, `v` the version of its head (10: every tooth coloured).
 */
const three = require('three');
const three_addons_utils_BufferGeometryUtils_js = require('three/addons/utils/BufferGeometryUtils.js');
const three_addons_geometries_RoundedBoxGeometry_js = require('three/addons/geometries/RoundedBoxGeometry.js');
const SK = require('c6bd60a52004748e86bd99d3a922057c155a76b2ef4ffdb3a41903dd7b60f129');
const HEAD = require('7f6d41491559a018391791976005e6b4285fb51b28c89da3dc0c327ee79aff83');
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

function dualQuaternionSkinning() {
	if (installed) return;
	installed = true;
	const chunks = three.ShaderChunk;
	chunks.skinning_pars_vertex = chunks.skinning_pars_vertex + PARS;
	chunks.skinbase_vertex = BASE;
	chunks.skinnormal_vertex = NORMAL;
	chunks.skinning_vertex = VERTEX;
}

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

let DETAIL$1 = 1;

const fine = (n, least) => Math.max(least, Math.round(n * DETAIL$1));

function lowDetail(build, detail = .45) {
	const was = DETAIL$1;
	DETAIL$1 = detail;
	try {
		return build();
	} finally {
		DETAIL$1 = was;
	}
}

const qa = /* @__PURE__ */ (() => new three.Quaternion())();

const qb = /* @__PURE__ */ (() => new three.Quaternion())();

const eb = /* @__PURE__ */ (() => new three.Euler())();

function blend(a, b, t) {
	const out = {};
	for (const name of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
		const x = a[name] ?? [
			0,
			0,
			0,
			1
		], y = b[name] ?? [
			0,
			0,
			0,
			1
		];
		if (name === "root") {
			out[name] = [
				0,
				1,
				2
			].map((k) => (x[k] ?? 0) + ((y[k] ?? 0) - (x[k] ?? 0)) * t);
			continue;
		}
		qa.setFromEuler(eb.set(x[0] ?? 0, x[1] ?? 0, x[2] ?? 0));
		qb.setFromEuler(eb.set(y[0] ?? 0, y[1] ?? 0, y[2] ?? 0));
		eb.setFromQuaternion(qa.slerp(qb, t));
		const size = (x[3] ?? 1) + ((y[3] ?? 1) - (x[3] ?? 1)) * t;
		const off = [
			4,
			5,
			6
		].map((k) => (x[k] ?? 0) + ((y[k] ?? 0) - (x[k] ?? 0)) * t);
		out[name] = off.some((o) => o !== 0) ? [
			eb.x,
			eb.y,
			eb.z,
			size,
			...off
		] : [
			eb.x,
			eb.y,
			eb.z,
			size
		];
	}
	return out;
}

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

function egg(at, s, rot = [
	0,
	0,
	0
], detail = [20, 14]) {
	const g = new three.SphereGeometry(1, fine(detail[0], 6), fine(detail[1], 4));
	g.applyMatrix4(new three.Matrix4().compose(new three.Vector3(...at), new three.Quaternion().setFromEuler(new three.Euler(...rot)), new three.Vector3(...s)));
	return g;
}

function loft(rings, seg = 28) {
	seg = fine(seg, 8);
	const pos = [];
	const ring = (r) => Array.from({ length: seg }, (_, j) => {
		const a = j / seg * Math.PI * 2;
		return [
			Math.cos(a) * r.w / 2,
			r.y,
			(r.z ?? 0) + Math.sin(a) * r.d / 2
		];
	});
	const all = rings.map(ring);
	const idx = [];
	all.forEach((r) => r.forEach((p) => pos.push(...p)));
	for (let i = 0; i < all.length - 1; i++) for (let j = 0; j < seg; j++) {
		const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + (j + 1) % seg, dd = (i + 1) * seg + j;
		idx.push(a, c, b, a, dd, c);
	}
	const bottom = pos.length / 3, top = bottom + 1;
	const f = rings[0], l = rings[rings.length - 1];
	pos.push(0, f.y, f.z ?? 0, 0, l.y, l.z ?? 0);
	for (let j = 0; j < seg; j++) {
		idx.push(bottom, j, (j + 1) % seg);
		const last = (all.length - 1) * seg;
		idx.push(top, last + (j + 1) % seg, last + j);
	}
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const step = (a, b, x) => {
	const t = clamp01((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

/** how a person looks unless told: the stand-in's clothes and face */
const LOOK = {
	skin: '#d6b094',
	brows: '#3a2a1f',
	shirt: '#3c4452',
	trousers: '#47566c',
	belt: '#2d251f',
	shoes: '#2a2a2d',
	soles: '#e9e6df',
	hair: 'short',
	hairColour: '#3a2a1f',
	iris: '#5a4030',
	lips: '#a8665a',
	face: 'man'
};
/** the edge it sits on (a bed's, a chair's), m */
const SEAT = 0.5;
const BONES = SK.bones();
const AT = Object.fromEntries(BONES.map((b) => [b.name, b.at]));
const TIPS = SK.tips();

/**
 * The torso's weights: along the spine from the hips to the neck, each joint blended over a few centimetres either
 * side, and the top of each side, where the arm meets the chest, carried by its shoulder (clavicle).
 */
const SPINE = ['hips', 'spine', 'chest', 'upperChest', 'neck'];
function torsoWeights(p) {
	const ys = SPINE.map((n) => AT[n][1]);
	const out = new Map();
	const soft = 0.05;
	let k = 0;
	while (k < ys.length - 1 && p.y >= ys[k + 1]) k++;
	const own = SPINE[k];
	let wOwn = 1;
	if (k > 0 && p.y - ys[k] < soft) {
		const w = 0.5 - (0.5 * (p.y - ys[k])) / soft;
		out.set(SPINE[k - 1], w);
		wOwn -= w;
	}
	if (k < ys.length - 1 && ys[k + 1] - p.y < soft) {
		const w = 0.5 - (0.5 * (ys[k + 1] - p.y)) / soft;
		out.set(SPINE[k + 1], w);
		wOwn -= w;
	}
	out.set(own, (out.get(own) ?? 0) + wOwn);
	// the shoulder's share: up at the side, where the arm goes in
	const sh = step(0.1, 0.17, Math.abs(p.x)) * step(1.36, 1.43, p.y);
	if (sh > 0) {
		const side = p.x > 0 ? 'leftShoulder' : 'rightShoulder';
		for (const [n, w] of out) out.set(n, w * (1 - 0.85 * sh));
		out.set(side, 0.85 * sh);
	}
	return [...out].filter(([, w]) => w > 1e-4);
}

/** the parts of a person of 1.80 m: geometry, colour and the bones that carry it */
function parts(k, v) {
	const box = (w, h, d, r, at) => {
		const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 3, r);
		g.translate(...at);
		return g;
	};
	// the head's own weights name `chest` for where the neck meets the body: here, the upper chest
	const head = HEAD.headPieces(k, v).map((p) => (p.weights ? { ...p, weights: (q) => p.weights(q).map(([n, w]) => [n === 'chest' ? 'upperChest' : n, w]) } : p.bone === 'chest' ? { ...p, bone: 'upperChest' } : p));
	const out = [
		{
			geo: loft([
				{ y: .83, w: .02, d: .02 },
				{ y: .845, w: .2, d: .14 },
				{ y: .875, w: .31, d: .2 },
				{ y: .94, w: .355, d: .23, z: -.005 },
				{ y: 1, w: .33, d: .21 },
				{ y: 1.07, w: .305, d: .2, z: .005 },
				{ y: 1.17, w: .32, d: .215, z: .01 },
				{ y: 1.28, w: .36, d: .235, z: .015 },
				{ y: 1.37, w: .39, d: .225, z: .005 },
				{ y: 1.43, w: .42, d: .2, z: -.008 },
				{ y: 1.465, w: .375, d: .175, z: -.012 },
				{ y: 1.495, w: .3, d: .15, z: -.015 },
				{ y: 1.53, w: .165, d: .13, z: -.016 },
				{ y: 1.545, w: .02, d: .02, z: -.015 }
			], 44),
			color: (p) => (p.y < .985 ? k.trousers : p.y < 1.012 ? k.belt : k.shirt),
			weights: torsoWeights
		},
		...head
	];
	for (const [s, x] of SK.SIDES) {
		const b = (n) => `${s}${n}`;
		out.push(
			// the upper arm, the sleeve over its top
			{ geo: limb([x * .185, 1.43, -.01], [x * .2, 1.17, -.02], .047, .04), color: (p) => (p.y > 1.32 ? k.shirt : k.skin), chain: { bones: [b('UpperArm'), b('LowerArm')], soft: .06 } },
			{ geo: limb([x * .2, 1.17, -.02], [x * .205, .915, 0], .041, .031), color: k.skin, chain: { bones: [b('LowerArm'), b('Hand')], soft: .05 } },
			// the palm, thin across, from the wrist to the knuckles
			{ geo: limb([x * .205, .915, 0], [x * .207, .826, .002], .033, .03, { flat: .5 }), color: k.skin, chain: { bones: [b('Hand')], soft: .02, tip: [x * .207, .82, .002] } }
		);
		for (const [f, d] of Object.entries(SK.FINGERS)) {
			const names = d.bones.map((n) => b(SK.cap(f) + n));
			const pts = [...names.map((n) => AT[n]), TIPS[names[2]]];
			for (let j = 0; j < 3; j++) {
				const r0 = d.r * (1 - .12 * j), r1 = d.r * (1 - .12 * (j + 1));
				out.push({ geo: limb(pts[j], pts[j + 1], r0, r1, { seg: 8 }), color: k.skin, chain: { bones: [names[j]], soft: .006, tip: pts[j + 1] } });
			}
		}
		out.push(
			{ geo: limb([x * .095, .96, 0], [x * .1, .5, .01], .088, .058), color: k.trousers, chain: { bones: [b('UpperLeg'), b('LowerLeg')], soft: .08 } },
			{ geo: limb([x * .1, .5, .01], [x * .1, .09, -.005], .056, .045), color: k.trousers, chain: { bones: [b('LowerLeg'), b('Foot')], soft: .06 } },
			// the trainer and its sole, bending at the ball of the foot
			{ geo: box(.1, .085, .27, .035, [x * .1, .05, .065]), color: k.shoes, chain: { bones: [b('Foot'), b('Toes')], soft: .03, tip: [x * .1, .03, .2] } },
			{ geo: box(.104, .018, .274, .008, [x * .1, .009, .065]), color: k.soles, chain: { bones: [b('Foot'), b('Toes')], soft: .03, tip: [x * .1, .009, .2] } }
		);
	}
	return out;
}

/** the bones and the parts, measured for 1.80 m, scaled by s */
function scaled(s, k, v) {
	const m = (p) => [p[0] * s, p[1] * s, p[2] * s];
	return {
		bones: BONES.map((b) => ({ ...b, at: m(b.at) })),
		parts: parts(k, v).map((p) => ({
			...p,
			geo: p.geo.scale(s, s, s),
			color: typeof p.color === 'string' ? p.color : ((f) => (q, i) => f(q.clone().divideScalar(s), i))(p.color),
			...(p.weights ? { weights: ((f) => (q) => f(q.clone().divideScalar(s)))(p.weights) } : {}),
			...(p.morph ? { morph: Object.fromEntries(Object.entries(p.morph).map(([name, d]) => [name, d.map((x) => x * s)])) } : {}),
			...(p.chain ? { chain: { ...p.chain, soft: (p.chain.soft ?? .05) * s, ...(p.chain.tip ? { tip: m(p.chain.tip) } : {}) } } : {})
		}))
	};
}

/** the arms hanging easy at the sides */
const relaxed = {
	leftUpperArm: [.02, 0, .07],
	rightUpperArm: [.02, 0, -.07],
	leftLowerArm: [-.1, 0, 0],
	rightLowerArm: [-.1, 0, 0]
};
/** the bones of the stand-in's older rig by their names in the standard */
const RENAME = { upperArmL: 'leftUpperArm', upperArmR: 'rightUpperArm', forearmL: 'leftLowerArm', forearmR: 'rightLowerArm', handL: 'leftHand', handR: 'rightHand', thighL: 'leftUpperLeg', thighR: 'rightUpperLeg', shinL: 'leftLowerLeg', shinR: 'rightLowerLeg', footL: 'leftFoot', footR: 'rightFoot' };
const renamed = (pose) => Object.fromEntries(Object.entries(pose).map(([n, t]) => [RENAME[n] ?? n, t]));

/** Its held poses at a height `s` of 1.80 m, as v11 held them (those that sit or lie worked out from its measure, so
 *  it sits on a 0.5 m edge with its feet on the floor at any height), on the standard's bones. */
function posesFor(s) {
	const thigh = .43 * s, knee = .5 * s;
	const slope = (hip) => Math.asin(three.MathUtils.clamp((hip - knee) / thigh, -.9, .9));
	const sitHip = SEAT + .07 * s, a = slope(sitHip);
	const seated = {
		root: [0, sitHip - .98 * s, .2 * s],
		thighL: [-Math.PI / 2 - a, 0, .04],
		thighR: [-Math.PI / 2 - a, 0, -.04],
		shinL: [Math.PI / 2 - a, 0, 0],
		shinR: [Math.PI / 2 - a, 0, 0]
	};
	const fallHips = SEAT + .08 * s, b = slope(fallHips), back = -1.52;
	const old = {
		stand: {},
		sit: { ...seated, spine: [.05, 0, 0], chest: [.03, 0, 0], head: [.08, 0, 0], upperArmL: [-.45, 0, -.05], upperArmR: [-.45, 0, .05], forearmL: [-.25, -1.2, 0], forearmR: [-.25, 1.2, 0], handL: [-.6, 0, 0], handR: [-.6, 0, 0] },
		'sit, elbows on knees': { ...seated, spine: [.45, 0, 0], chest: [.4, 0, 0], neck: [.1, 0, 0], head: [.2, 0, 0], upperArmL: [-.85, 0, -.03], upperArmR: [-.85, 0, .03], forearmL: [-1.3, 0, -.45], forearmR: [-1.3, 0, .45], handL: [-.3, 0, 0], handR: [-.3, 0, 0] },
		fallen: { root: [0, fallHips - .98 * s, 0], hips: [back, 0, 0], thighL: [b - Math.PI / 2 - back, 0, .05], thighR: [b - Math.PI / 2 - back, 0, -.05], shinL: [Math.PI / 2 - b, 0, 0], shinR: [Math.PI / 2 - b, 0, 0], chest: [.03, 0, 0], head: [-.12, .18, 0], upperArmL: [0, 0, 1.25], upperArmR: [0, 0, -1.25], forearmL: [0, 0, .35], forearmR: [0, 0, -.35] },
		lie: { root: [0, -.86 * s, 0], hips: [-Math.PI / 2, 0, 0], upperArmL: [0, 0, .18], upperArmR: [0, 0, -.18], footL: [-.1, 0, 0], footR: [-.1, 0, 0] },
		kneel: { root: [0, (.535 - .98) * s, 0], shinL: [Math.PI / 2, 0, 0], shinR: [Math.PI / 2, 0, 0], footL: [1.4, 0, 0], footR: [1.4, 0, 0], upperArmL: [-.2, 0, .08], upperArmR: [-.2, 0, -.08], forearmL: [-.4, 0, 0], forearmR: [-.4, 0, 0] },
		'look up': { neck: [-.22, 0, 0], head: [-.5, 0, 0] },
		think: { upperArmR: [-.6, .9, .3], forearmR: [-2.44, 0, 0], handR: [.15, 0, 0], upperArmL: [-.45, 0, 0], forearmL: [0, 0, -1.55], head: [.15, .1, 0] },
		'arms crossed': { upperArmL: [-.65, 0, .05], forearmL: [0, 0, -1.65], upperArmR: [-.4, 0, -.05], forearmR: [0, 0, 1.55] },
		point: { upperArmR: [-1.45, .15, 0], forearmR: [-.05, 0, 0], head: [0, -.12, 0] }
	};
	const standing = new Set(['stand', 'look up', 'think', 'arms crossed', 'point']);
	return Object.fromEntries(Object.entries(old).map(([n, p]) => [n, renamed(standing.has(n) ? { ...relaxedOld, ...p } : p)]));
}
const relaxedOld = { upperArmL: [.02, 0, .07], upperArmR: [.02, 0, -.07], forearmL: [-.1, 0, 0], forearmR: [-.1, 0, 0] };

/** A person, rigged: its skin on the standard's bones, its held poses, and what it measures (`s`: its height over
 *  the 1.80 m its measures are for). */
function person(look = {}, height = 1.7, { v = 10 } = {}) {
	const k = { ...LOOK, ...look };
	const s = height / HEAD.crownOf(k.face);
	const { bones, parts: body } = scaled(s, k, v);
	const r = rig(bones, body, [HEAD.skin(.74), HEAD.skin(.12), HEAD.skin(.85, { side: three.DoubleSide }), HEAD.CATCHLIGHT()]);
	r.object.name = 'person';
	r.pose(relaxed);
	return { rig: r, poses: posesFor(s), measure: { s, height, bones: BONES.map((b) => ({ ...b, at: b.at.map((x) => x * s) })), tips: Object.fromEntries(Object.entries(TIPS).map(([n, p]) => [n, p.map((x) => x * s)])) } };
}

module.exports = { person, LOOK, SEAT, BONES, TIPS, relaxed, posesFor, rig, poser, blend, limb, loft, egg, lowDetail };
