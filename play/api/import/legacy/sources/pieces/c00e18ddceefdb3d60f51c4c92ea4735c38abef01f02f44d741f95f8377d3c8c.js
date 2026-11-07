//#piece 49108f821b155b24a5b6ec659c4399d6a5b416bad5adc307ec552a423889a5ef
//#region src/lib/actors/dqs.ts
const PARS = `
//#piece 5f00748470c416775b432dd681bb7de7a7abd1cfb6f5c4947ca85d7092b234ce
//#piece 2ae573ab5d298170320b5948329618a0b0520e8cce98a4a719142e7a46594b88
//#piece 5b0ff7ffbd274609e12ab3b733f964c49f4695ea83210148950c0781b0bf78d0
	}
//#piece b9716007bb554edff94c3dba3960f639b0771b51832e74e5ca566dd486d38a1a
//#piece 6be8a84d11c3a2159c730138adaa1389bb9c1610689e94ccb8bed4aaa17307f5
const detail = () => DETAIL$1;
//#piece 95a4f25f00d2a64f5ee768ff12e87ccdf9986cfb3cc198570e687a5adb22cf99
	}
}
/**
//#piece f50fc43cc4753bf64f18b4f64690f1271e74f074b39db30c8697b01086a43bb0
//#piece 65813ed20927d19ad26b09564bc9d00ea4ff7eea5930fb1fd4d540338885ea2e
//#piece 756af81992b2eec8c0c165c6dc1be4de43ced3bb7a7e2722fa65f92fbb94e03c
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
