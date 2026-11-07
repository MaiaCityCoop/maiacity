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
