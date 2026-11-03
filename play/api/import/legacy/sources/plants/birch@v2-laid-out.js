// This version's own source was never kept: legacy wrote it into avenDB from code that was not committed (it is on no
// branch of the repository and not in the vault). Here is its recipe file's library as it is, the code the box runs,
// only laid out to be read (prettier); its names are the minifier's. play/api/import/legacy/sources/README.md
Object.defineProperty(exports, Symbol.toStringTag, { value: `Module` });
var e = Object.create,
	t = Object.defineProperty,
	n = Object.getOwnPropertyDescriptor,
	r = Object.getOwnPropertyNames,
	i = Object.getPrototypeOf,
	a = Object.prototype.hasOwnProperty,
	o = (e, i, o, s) => {
		if ((i && typeof i == `object`) || typeof i == `function`)
			for (var c = r(i), l = 0, u = c.length, d; l < u; l++)
				(d = c[l]),
					!a.call(e, d) &&
						d !== o &&
						t(e, d, { get: ((e) => i[e]).bind(null, d), enumerable: !(s = n(i, d)) || s.enumerable });
		return e;
	},
	s = (n, r, s) => (
		(s = n == null ? {} : e(i(n))),
		o(r || !n || !n.__esModule || !a.call(n, `default`) ? t(s, `default`, { value: n, enumerable: !0 }) : s, n)
	);
let c = require('three');
c = s(c, 1);
let l = require('three/addons/utils/BufferGeometryUtils.js');
const u = { level: 1, roots: !0, thin: 1, fill: 1, finest: 0, fruit: !1 };
function d(e, t) {
	let n = { ...u };
	Object.assign(u, e);
	try {
		return t();
	} finally {
		Object.assign(u, n);
	}
}
function f(e) {
	let t = [
			[0.1, 0.12, 1.6, 0.006],
			[0.25, 0.45, 1.3, 0.0016],
			[0.5, 0.6, 1.2, 8e-4],
			[1, 1, 1, 0],
		],
		n = Math.min(1, Math.max(0.05, e)),
		r = Math.max(
			1,
			t.findIndex((e) => e[0] >= n),
		),
		[i, a, o, s] = t[r - 1],
		[c, l, u, d] = t[r],
		f = Math.min(1, Math.max(0, (n - i) / (c - i)));
	return { level: n, roots: n >= 1, thin: a + (l - a) * f, fill: o + (u - o) * f, finest: s + (d - s) * f };
}
const p = (e, t = 1) => (u.level >= 1 ? e : Math.max(t, Math.round(e * u.level)));
function m(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t = Math.imul(t ^ e.charCodeAt(n), 16777619);
	return t >>> 0;
}
function h(e, ...t) {
	let n = m(`${e}|${t.join(`|`)}`);
	return () => {
		n = (n + 1831565813) | 0;
		let e = Math.imul(n ^ (n >>> 15), 1 | n);
		return (e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e), ((e ^ (e >>> 14)) >>> 0) / 4294967296;
	};
}
const g = (e, t, n) => t + (n - t) * e(),
	_ = (e, t, n) => t + (e() * 2 - 1) * n,
	v = (e, t = 0, n = 1) => Math.min(n, Math.max(t, e)),
	y = (e, t, n) => e + (t - e) * n,
	b = (e) => {
		let t = v(e);
		return t * t * (3 - 2 * t);
	},
	x = (e, t, n) => b((e - t) / (n - t));
function S(e, t) {
	if (e <= t[0][0]) return t[0][1];
	for (let n = 1; n < t.length; n++) {
		let [r, i] = t[n];
		if (e <= r) {
			let [a, o] = t[n - 1];
			return y(o, i, b((e - a) / (r - a)));
		}
	}
	return t[t.length - 1][1];
}
const C = (e, t, n) => new c.Vector3(e, t, n),
	w = C(0, 1, 0);
function T(e, t, n = 0) {
	let r = t.clone().normalize(),
		i = new c.Vector3().crossVectors(r, w);
	i.lengthSq() < 1e-8 && (i = C(0, 0, 1)), i.normalize();
	let a = new c.Vector3().crossVectors(i, r).normalize(),
		o = new c.Matrix4().makeBasis(r, a, i);
	return n && o.multiply(new c.Matrix4().makeRotationX(n)), o.setPosition(e);
}
const E = new c.Color(),
	D = (e) => (e instanceof c.Color ? e : E.set(e)),
	O = (e, t, n) => new c.Color(e).lerp(new c.Color(t), v(n));
function k(e, t, n, r = 6) {
	if (u.finest > 0 && Math.max(t(0, 0), t(0.5, 0)) < u.finest) return N([], [], [], [], [], !1);
	if (u.level < 1) {
		r = p(r, 3);
		let t = Math.max(1, Math.round(1 / u.level));
		t > 1 && e.length > 3 && (e = e.filter((n, r) => r % t === 0 || r === e.length - 1));
	}
	let i = e.length,
		a = [],
		o = [],
		s = [],
		l = [],
		d = [],
		f = [0];
	for (let t = 1; t < i; t++) f.push(f[t - 1] + e[t].distanceTo(e[t - 1]));
	let m = f[i - 1] || 1,
		h = null,
		g = null;
	for (let u = 0; u < i; u++) {
		let d = e[Math.min(i - 1, u + 1)].clone().sub(e[Math.max(0, u - 1)]);
		d.lengthSq() < 1e-14 && d.copy(g ?? w),
			d.normalize(),
			h
				? g && h.applyQuaternion(new c.Quaternion().setFromUnitVectors(g, d)).normalize()
				: (h =
						Math.abs(d.y) < 0.9
							? new c.Vector3().crossVectors(d, w).normalize()
							: new c.Vector3().crossVectors(d, C(1, 0, 0)).normalize()),
			(g = d);
		let p = new c.Vector3().crossVectors(d, h).normalize(),
			_ = f[u] / m;
		for (let i = 0; i <= r; i++) {
			let c = (i / r) * Math.PI * 2,
				d = h.clone().multiplyScalar(Math.cos(c)).addScaledVector(p, Math.sin(c)),
				f = e[u].clone().addScaledVector(d, Math.max(0, t(_, i / r)));
			a.push(f.x, f.y, f.z), o.push(d.x, d.y, d.z), s.push(_, i / r);
			let m = D(n(_, i / r));
			l.push(m.r, m.g, m.b);
		}
	}
	for (let e = 0; e < i - 1; e++)
		for (let t = 0; t < r; t++) {
			let n = e * (r + 1) + t,
				i = n + r + 1;
			d.push(n, n + 1, i, i, n + 1, i + 1);
		}
	return N(a, o, s, l, d, !1);
}
function A({ length: e, width: t, shape: n, lift: r = () => 0, paint: i, along: a = 16, across: o = 6 }) {
	(a = p(a, 2)), (o = p(o, 1));
	let s = [],
		c = [],
		l = [],
		u = [],
		d = [];
	for (let d = 0; d <= a; d++) {
		let f = d / a,
			p = n(f) * t;
		for (let t = 0; t <= o; t++) {
			let n = (t / o) * 2 - 1;
			s.push(f * e, r(f, n) * e, n * p), c.push(0, 1, 0), l.push(f, (n + 1) / 2);
			let a = D(i(f, n));
			u.push(a.r, a.g, a.b);
		}
	}
	for (let e = 0; e < a; e++)
		for (let t = 0; t < o; t++) {
			let n = e * (o + 1) + t,
				r = n + o + 1;
			d.push(n, n + 1, r, r, n + 1, r + 1);
		}
	return N(s, c, l, u, d, !0);
}
function j(e, t, n, r = 6, i = new c.Quaternion()) {
	r = p(r, 2);
	let a = new c.SphereGeometry(1, r + 2, r);
	a.applyMatrix4(new c.Matrix4().compose(e, i, t));
	let o = new c.Color(n),
		s = a.attributes.position.count,
		l = new Float32Array(s * 3);
	for (let e = 0; e < s; e++) l.set([o.r, o.g, o.b], e * 3);
	return a.setAttribute(`color`, new c.BufferAttribute(l, 3)), a;
}
function M(e) {
	e.computeVertexNormals();
	let t = e.attributes.position,
		n = e.attributes.normal,
		r = new Map();
	for (let e = 0; e < t.count; e++) {
		let n = `${Math.round(t.getX(e) * 1e5)},${Math.round(t.getY(e) * 1e5)},${Math.round(t.getZ(e) * 1e5)}`,
			i = r.get(n);
		i ? i.push(e) : r.set(n, [e]);
	}
	let i = new c.Vector3();
	for (let e of r.values())
		if (!(e.length < 2)) {
			i.set(0, 0, 0);
			for (let t of e) (i.x += n.getX(t)), (i.y += n.getY(t)), (i.z += n.getZ(t));
			i.normalize();
			for (let t of e) n.setXYZ(t, i.x, i.y, i.z);
		}
	return (n.needsUpdate = !0), e;
}
function N(e, t, n, r, i, a) {
	let o = new c.BufferGeometry();
	return (
		o.setAttribute(`position`, new c.Float32BufferAttribute(e, 3)),
		o.setAttribute(`normal`, new c.Float32BufferAttribute(t, 3)),
		o.setAttribute(`uv`, new c.Float32BufferAttribute(n, 2)),
		o.setAttribute(`color`, new c.Float32BufferAttribute(r, 3)),
		o.setIndex(i),
		a && o.computeVertexNormals(),
		o
	);
}
const P = {};
function F(e) {
	return (P[e] ??=
		e === `sheet`
			? new c.MeshStandardMaterial({ vertexColors: !0, roughness: 0.62, side: c.DoubleSide })
			: e === `gloss`
				? new c.MeshPhysicalMaterial({ vertexColors: !0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.35 })
				: new c.MeshStandardMaterial({ vertexColors: !0, roughness: 0.75 }));
}
const I = { bags: null, fruits: [] };
function L(e) {
	(I.bags = []), (I.fruits = []);
	try {
		return { plant: e(), fruits: I.fruits.filter((e) => e.parts.length) };
	} finally {
		(I.bags = null), (I.fruits = []);
	}
}
var R = class {
	constructor() {
		(this.parts = { body: [], sheet: [], gloss: [], prop: [] }),
			(this.space = new ee()),
			(this.sheets = 0),
			(this.drawing = null),
			I.bags && I.bags.push(this);
	}
	fruit(e, t, n) {
		return (
			(this.drawing = { key: e.join(`|`), at: t.clone(), dir: n.clone().normalize(), parts: [] }),
			I.bags && I.fruits.push(this.drawing),
			this
		);
	}
	fruitDone() {
		return (this.drawing = null), this;
	}
	add(e, t, n) {
		if (!t.attributes.position.count) return this;
		n && t.applyMatrix4(n), this.drawing && I.bags && this.drawing.parts.push({ kind: e, geometry: t.clone() });
		let r = t.type === `SphereGeometry`;
		if ((e === `sheet` || r) && (u.thin < 1 || u.fill !== 1)) {
			if (((this.sheets = (this.sheets ?? 0) + u.thin), this.sheets < 1)) return this;
			--this.sheets, t.computeBoundingSphere();
			let e = t.boundingSphere,
				n = r ? e.center.clone() : new c.Vector3().fromBufferAttribute(t.attributes.position, 0),
				i = Math.max(1, 0.14 / Math.max(1e-4, e.radius)),
				a = Math.min(2.6, i, (r ? 1 / Math.cbrt(u.thin) : 1 / Math.sqrt(u.thin)) * (r ? 1 : u.fill));
			t.applyMatrix4(new c.Matrix4().makeTranslation(-n.x, -n.y, -n.z))
				.applyMatrix4(new c.Matrix4().makeScale(a, a, a))
				.applyMatrix4(new c.Matrix4().makeTranslation(n.x, n.y, n.z));
		}
		return this.parts[e].push(t), this;
	}
	build() {
		let e = new c.Group();
		for (let t of [`body`, `sheet`, `gloss`, `prop`]) {
			let n = this.parts[t];
			if (!n.length) continue;
			let r = (0, l.mergeGeometries)(n);
			for (let e of n) e.dispose();
			if (!r) continue;
			let i = new c.Mesh(r, F(t === `prop` ? `body` : t));
			(i.userData.prop = t === `prop`), (i.castShadow = !0), (i.receiveShadow = !0), e.add(i);
		}
		return e;
	}
};
function z(e, t) {
	if (!u.roots) return;
	let { seed: n, key: r, from: i, length: a, radius: o, young: s, old: l } = t,
		d = v(t.grown);
	if (d <= 0.002 || a * d < 1e-4) return;
	let f = h(n, `root`, ...r),
		p = t.down ?? 0.15,
		m = t.wander ?? 0.35,
		_ = t.order ?? 0,
		y = t.depth ?? 2,
		b = Math.max(4, Math.min(24, Math.round(10 + a * 40))),
		x = a / b,
		S = [i.clone()],
		C = t.dir.clone().normalize();
	for (let e = 0; e < b; e++) {
		(C.y -= p),
			(C.x += (f() * 2 - 1) * m),
			(C.y += (f() * 2 - 1) * m * 0.5),
			(C.z += (f() * 2 - 1) * m),
			C.y > -0.05 && S[e].y > -0.004 && (C.y = -0.25),
			C.normalize();
		let n = S[e].clone().addScaledVector(C, x);
		t.floor !== void 0 && n.y < t.floor && (n.y = t.floor + (n.y - t.floor) * 0.1), S.push(n);
	}
	let w = d * b,
		T = Math.floor(w),
		E = S.slice(0, T + 1);
	if ((T < b && E.push(S[T].clone().lerp(S[T + 1], w - T)), E.length < 2)) return;
	let D = v(t.age ?? 0),
		A = o * (0.35 + 0.65 * d);
	if (
		(e.add(
			`body`,
			k(
				E,
				(e) => A * (1 - 0.7 * e),
				(e) => O(l, s, e * 1.5 + 0.5 - D),
				_ ? 4 : 5,
			),
		),
		_ >= y)
	)
		return;
	let j = Math.round(t.laterals ?? 6);
	for (let n = 0; n < j; n++) {
		let i = g(f, 0.12, 0.85),
			s = f() * Math.PI * 2,
			l = g(f, 0.5, 1),
			u = i * b;
		if (u > w - 0.6) {
			f();
			continue;
		}
		let d = Math.floor(u),
			m = S[d].clone().lerp(S[d + 1], u - d),
			h = S[d + 1].clone().sub(S[d]).normalize(),
			v = new c.Vector3(Math.cos(s), 0, Math.sin(s)).addScaledVector(h, 0.35).normalize();
		z(e, {
			...t,
			key: [...r, n],
			from: m,
			dir: v,
			length: a * (t.lateral ?? 0.35) * l,
			grown: (w - u) / (b * 0.55),
			radius: o * 0.45,
			down: p * 0.6,
			laterals: Math.round(j * 0.6),
			order: _ + 1,
			age: D * 0.6,
			floor: t.floor,
		}),
			f();
	}
}
var ee = class {
	constructor() {
		(this.balls = []), (this.rods = []);
	}
	ball(e, t) {
		this.balls.push({ c: e.clone(), r: t });
	}
	rod(e, t) {
		let n = Math.max(1, Math.floor(e.length / 12));
		for (let r = 0; r + n < e.length; r += n)
			this.rods.push({ a: e[r].clone(), b: e[Math.min(e.length - 1, r + n)].clone(), r: t });
	}
	depth(e, t) {
		let n = 0;
		for (let r of this.balls) n = Math.max(n, t + r.r - e.distanceTo(r.c));
		let r = new c.Vector3(),
			i = new c.Vector3(),
			a = new c.Vector3();
		for (let o of this.rods) {
			r.subVectors(o.b, o.a), i.subVectors(e, o.a);
			let s = v(i.dot(r) / Math.max(1e-12, r.lengthSq()));
			a.copy(o.a).addScaledVector(r, s), (n = Math.max(n, t + o.r - e.distanceTo(a)));
		}
		return Math.max(0, n);
	}
	overlap(e) {
		let t = 0;
		for (let n of e) t += this.depth(n.c, n.r);
		return t;
	}
	settle(e, t, n, r) {
		let i = t.clone().normalize(),
			a = { at: e.clone(), dir: i, cost: 1 / 0 },
			o = new c.Vector3();
		for (let t of [0, 0.5, 1]) {
			for (let s of [0, 0.45, 0.9, 1.4, 2]) {
				for (let c = 0; c < (s ? 8 : 1); c++) {
					let l = (c / 8) * Math.PI * 2;
					o.set(Math.cos(l), 0, Math.sin(l));
					let u = i.clone().addScaledVector(o, s).normalize();
					if (u.y > 0.35) continue;
					let d = e.clone().addScaledVector(u, t * r),
						f = n(d, u),
						p = this.overlap(f) * 10 + s * 0.004 + t * 0.003;
					for (let e of f) p += Math.max(0, e.r - e.c.y) * 10;
					p < a.cost && (a = { at: d, dir: u, cost: p });
				}
				if (a.cost < 0.004 * (s + 0.5)) break;
			}
			if (a.cost < 0.01) break;
		}
		for (let e of n(a.at, a.dir)) this.ball(e.c, e.r);
		return a;
	}
	best(e) {
		let t = e[0],
			n = 1 / 0;
		for (let r of e) {
			let e = this.overlap(r.balls) * 10 + r.cost;
			for (let t of r.balls) e += Math.max(0, t.r - t.c.y) * 10;
			if ((e < n && ((n = e), (t = r)), e <= r.cost + 1e-9)) break;
		}
		for (let e of t.balls) this.ball(e.c, e.r);
		return t.data;
	}
	steer(e, t, n, r, i) {
		let a = { out: t.clone(), cost: 1 / 0 };
		for (let o of [0, 0.3, -0.3, 0.6, -0.6, 0.95, -0.95, 1.35, -1.35, 1.8, -1.8, 2.4, -2.4]) {
			let s = t
					.clone()
					.applyAxisAngle(new c.Vector3(0, 1, 0), o)
					.setY(0)
					.normalize(),
				l = s
					.clone()
					.multiplyScalar(Math.cos(n))
					.add(new c.Vector3(0, Math.sin(n), 0)),
				u = new c.Vector3(-s.z, 0, s.x),
				d = Math.abs(o) * 0.002;
			for (let t of [0.3, 0.55, 0.8, 1]) {
				let n = e
					.clone()
					.addScaledVector(l, r * t)
					.add(new c.Vector3(0, -r * 0.12 * t * t, 0));
				d += this.depth(n, i);
				for (let e of [-1, 1]) d += this.depth(n.clone().addScaledVector(u, e * r * 0.22), i * 0.8);
			}
			if ((d < a.cost && (a = { out: s, cost: d }), d < 5e-4)) break;
		}
		return a.out;
	}
};
function te(e, t) {
	let n = h(t.seed, `sprout`),
		r = Math.atan2(-0.9, 1.25) + (n() * 2 - 1) * 0.4,
		i = C(Math.cos(r), 0, Math.sin(r)),
		a = new c.Vector3().crossVectors(i, C(0, 1, 0)).normalize(),
		o = (n() * 2 - 1) * 0.12,
		s = [t.at.clone()],
		l = C(0, 1, 0).addScaledVector(i, o).normalize(),
		u = Math.max(1e-6, t.stem / 14);
	for (let e = 0; e < 14; e++) {
		let n = (e + 0.5) / 14 > 0.62 ? (t.hook * Math.PI * 0.95) / 5.32 : 0;
		(l = l.clone().applyAxisAngle(a, -n).normalize()), s.push(s[e].clone().addScaledVector(l, u));
	}
	let d = s[14],
		f = s[14].clone().sub(s[13]).normalize();
	t.stem > t.radius * 0.5 &&
		e.add(
			`body`,
			k(
				s,
				(e) => t.radius * (1 - 0.25 * e),
				(e) => O(`#e9e3c8`, t.stemColor, 0.35 + e * 0.65),
				6,
			),
		);
	let p = t.keepCoat ? t.at : d;
	if (t.shed < 1) {
		let n = t.size.clone().multiplyScalar(1 - 0.25 * t.shed),
			r = new c.Quaternion().setFromUnitVectors(C(1, 0, 0), t.keepCoat || t.stem < t.radius ? i : f),
			a = t.keepCoat ? C(0, 0, 0) : f.clone().multiplyScalar(t.size.x * 0.6);
		e.add(`body`, j(p.clone().add(a), n, O(t.coat, t.coatShade, t.shed), 7, r));
	}
	if (t.wither < 1 && t.stem > t.radius) {
		let r = 1 - 0.45 * t.wither,
			a = y(0.35, 1, v(t.open * 1.3));
		for (let o of [-1, 1]) {
			let s = y(0.08, 1.35 + (n() - 0.5) * 0.2, t.open) + t.wither * 0.35,
				c = f
					.clone()
					.multiplyScalar(Math.cos(s))
					.addScaledVector(i, o * Math.sin(s))
					.normalize(),
				l = A({
					length: t.leaf.length * a * r,
					width: t.leaf.width * a * r,
					shape: t.leaf.shape,
					lift: (e, n) => 0.06 * n * n - 0.05 * e * e * (1 + t.wither * 4),
					paint: (e, n) =>
						O(
							O(t.leaf.color, t.leaf.vein, Math.abs(n) < 0.12 ? 0.6 : 0),
							`#d9c45a`,
							t.wither * 1.2 - 0.1 + e * t.wither * 0.4,
						),
					along: 10,
					across: 6,
				});
			e.add(`sheet`, l, T(d, c, o * (1 - t.open) * 1.4));
		}
	}
	return { top: d, dir: f };
}
function ne(e, t) {
	let { seed: n, g: r, spec: i } = t,
		a = [],
		o = (t, s, l, u, d) => {
			if (r <= d) return;
			let f = h(n, `shoot`, ...t),
				p = (u === 0 ? i.trunk : i.shoot(u)) * _(f, 1, 0.18),
				m = u === 0 ? i.trunkFlush : i.flush,
				g = v((r - d) / m),
				y = u === 0 ? 10 : 5,
				b = [s.clone()],
				x = l.clone().normalize();
			for (let e = 0; e < y; e++)
				(x.y += i.up - i.droop * u * (e / y)),
					(x.x += (f() * 2 - 1) * i.wander),
					(x.z += (f() * 2 - 1) * i.wander),
					x.normalize(),
					b.push(b[e].clone().addScaledVector(x, p / y));
			let S = g * y,
				w = Math.floor(S),
				T = b.slice(0, w + 1);
			if ((w < y && T.push(b[w].clone().lerp(b[w + 1], S - w)), T.length < 2)) return;
			let E = r - d,
				D = i.radius * i.taper ** +u * (0.12 + 0.88 * v(E / i.thicken));
			e.add(
				`body`,
				k(
					T,
					(e) => D * (1 - 0.35 * e),
					(e) => O(i.bark[1], i.bark[0], v((e - 0.4) * 1.5 + (1 - v(E / 2)) * 0.8)),
					u < 2 ? 9 : 5,
				),
			);
			let A = T[T.length - 1],
				j = T[T.length - 1]
					.clone()
					.sub(T[T.length - 2])
					.normalize(),
				M = !0;
			if (g >= 1 && u < i.gens && !i.stop?.(t, u, d)) {
				let [e, n] = u === 0 ? i.scaffolds : i.whorl,
					a = e + Math.floor(f() * (n - e + 1)),
					s = f() * Math.PI * 2;
				for (let e = 0; e < a; e++) {
					let n = s + (e / a) * Math.PI * 2 + _(f, 0, 0.35),
						l = (u === 0 ? i.scaffoldAngle : i.spread) * _(f, 1, 0.2),
						p = new c.Vector3().crossVectors(j, C(0, 1, 0));
					p.lengthSq() < 1e-6 && p.set(1, 0, 0), p.normalize().applyAxisAngle(j, n);
					let h = j.clone().applyAxisAngle(p, l),
						g = d + m + i.rest * _(f, 1, 0.25);
					r > g && (M = !1), o([...t, e], A, h, u + 1, g);
				}
			}
			a.push({ pts: T, tip: A.clone(), dir: j, gen: u, key: t, grown: g, end: M, radius: D, born: d, length: p * g });
		};
	return o([`trunk`], t.from, C(0, 1, 0), 0, i.trunkBorn), a;
}
function B(e, t) {
	let { seed: n, g: r, spec: i } = t,
		a = [],
		o = h(n, `leader`),
		s = re(r, i.height);
	if (s < 0.005) return a;
	let l = C(o() - 0.5, 0, o() - 0.5).multiplyScalar(0.06),
		u = (e) => t.from.clone().add(C(l.x * e * e, e, l.z * e * e)),
		d = Math.max(2, Math.ceil(s / 0.1)),
		f = [];
	for (let e = 0; e <= d; e++) f.push(u((e / d) * s));
	let p = i.radius * v(s / 8) + 0.004;
	e.add(
		`body`,
		k(
			f,
			(e) => p * (1 - 0.7 * e) * (1 + 0.35 * (1 - Math.min(1, (e * s) / 0.6)) ** 3),
			(e) => O(i.bark[1], i.bark[0], v((e - 0.75) * 4)),
			12,
		),
	),
		a.push({
			pts: f,
			tip: f[d].clone(),
			dir: C(0, 1, 0),
			gen: 0,
			key: [`trunk`],
			grown: 1,
			end: !0,
			radius: p,
			born: 0,
			length: s,
		});
	for (let t = 0; t < i.tiers; t++) {
		let o = h(n, `limb`, t),
			l = i.clear * 0.3 + t * i.spacing * _(o, 1, 0.15),
			d = t * 2.39996 + _(o, 0, 0.3),
			f = s - l;
		if (f <= 0.05) break;
		if (l < s - i.crown || l < i.clear * v(s / 4)) {
			o();
			continue;
		}
		let m = i.limb(l / Math.max(1, s)) * _(o, 1, 0.15),
			y = Math.min(m, (f / i.rate) * m * 0.5 + 0.05),
			b = C(Math.cos(d), 0, Math.sin(d)),
			x = i.angle * _(o, 1, 0.08),
			S = b
				.clone()
				.multiplyScalar(Math.sin(x))
				.add(C(0, Math.cos(x), 0))
				.normalize(),
			w = [u(l)];
		for (let e = 0; e < 8; e++)
			(S = S.clone()
				.add(C(0, -i.droop * (e / 8), 0))
				.normalize()),
				w.push(w[e].clone().addScaledVector(S, y / 8));
		let T = p * 0.45 * v(y / 2 + 0.2);
		e.add(
			`body`,
			k(
				w,
				(e) => T * (1 - 0.75 * e),
				() => i.bark[1],
				7,
			),
		),
			a.push({
				pts: w,
				tip: w[8].clone(),
				dir: S.clone(),
				gen: 1,
				key: [`limb`, t],
				grown: 1,
				end: !0,
				radius: T,
				born: r - 2,
				length: y,
			});
		let E = Math.floor(y / i.side);
		for (let n = 0; n < E; n++) {
			let s = (n + 0.7) / (E + 0.7),
				l = s * 8,
				u = Math.min(7, Math.floor(l)),
				d = w[u].clone().lerp(w[u + 1], l - u),
				f = w[u + 1].clone().sub(w[u]).normalize(),
				p = new c.Vector3()
					.crossVectors(f, C(0, 1, 0))
					.normalize()
					.multiplyScalar(n % 2 ? 1 : -1)
					.multiplyScalar(0.8)
					.addScaledVector(f, 0.6)
					.add(C(0, g(o, -0.35, 0.55), 0))
					.normalize(),
				h = i.sides * (1 - 0.6 * s) * g(o, 0.7, 1.1) * v(y / 1.5 + 0.2),
				_ = [
					d,
					d.clone().addScaledVector(p, h * 0.5),
					d
						.clone()
						.addScaledVector(p, h)
						.add(C(0, -h * 0.12, 0)),
				];
			e.add(
				`body`,
				k(
					_,
					(e) => T * 0.3 * (1 - 0.6 * e) + 0.002,
					() => i.bark[0],
					4,
				),
			),
				a.push({
					pts: _,
					tip: _[2].clone(),
					dir: p,
					gen: 2,
					key: [`side`, t, n],
					grown: 1,
					end: !0,
					radius: T * 0.3,
					born: r - 2 + v(1 - y / m) * 1.5,
					length: h,
				});
		}
	}
	return a;
}
function re(e, t) {
	if (e <= t[0][0]) return t[0][1];
	for (let n = 1; n < t.length; n++)
		if (e <= t[n][0]) return t[n - 1][1] + (t[n][1] - t[n - 1][1]) * ((e - t[n - 1][0]) / (t[n][0] - t[n - 1][0]));
	return t[t.length - 1][1];
}
function V(e) {
	let t = (0, l.mergeGeometries)(e);
	for (let t of e) t.dispose();
	return t;
}
var ie = class {
	constructor() {
		(this.verts = 0),
			(this.tris = 0),
			(this.pos = new Float32Array(12288)),
			(this.nor = new Float32Array(12288)),
			(this.uv = new Float32Array(8192)),
			(this.col = new Float32Array(12288)),
			(this.idx = new Uint32Array(12288)),
			(this.kept = 0);
	}
	room(e, t) {
		let n = (e, t) => {
				if (t <= e.length) return e;
				let n = new e.constructor(Math.max(t, e.length * 2));
				return n.set(e), n;
			},
			r = this.verts + e;
		(this.pos = n(this.pos, r * 3)),
			(this.nor = n(this.nor, r * 3)),
			(this.col = n(this.col, r * 3)),
			(this.uv = n(this.uv, r * 2)),
			(this.idx = n(this.idx, this.tris + t));
	}
	stamp(e, t, n) {
		if (u.thin < 1) {
			if (((this.kept += u.thin), this.kept < 1)) return;
			--this.kept;
			let e = Math.min(1.8, 1 / Math.sqrt(u.thin));
			t = t.clone().multiply(new c.Matrix4().makeScale(e, e, e));
		}
		let r = t.elements,
			i = e.attributes.position.array,
			a = e.attributes.normal.array,
			o = e.attributes.color.array,
			s = e.attributes.uv.array,
			l = e.index.array,
			d = i.length / 3;
		this.room(d, l.length);
		let f = this.verts,
			p = this.pos,
			m = this.nor,
			h = this.col;
		for (let e = 0, t = f * 3; e < i.length; e += 3, t += 3) {
			let s = i[e],
				c = i[e + 1],
				l = i[e + 2];
			(p[t] = r[0] * s + r[4] * c + r[8] * l + r[12]),
				(p[t + 1] = r[1] * s + r[5] * c + r[9] * l + r[13]),
				(p[t + 2] = r[2] * s + r[6] * c + r[10] * l + r[14]);
			let u = a[e],
				d = a[e + 1],
				f = a[e + 2],
				g = r[0] * u + r[4] * d + r[8] * f,
				_ = r[1] * u + r[5] * d + r[9] * f,
				v = r[2] * u + r[6] * d + r[10] * f,
				y = Math.hypot(g, _, v) || 1;
			(m[t] = g / y),
				(m[t + 1] = _ / y),
				(m[t + 2] = v / y),
				(h[t] = o[e] * n.r),
				(h[t + 1] = o[e + 1] * n.g),
				(h[t + 2] = o[e + 2] * n.b);
		}
		this.uv.set(s, f * 2);
		for (let e = 0; e < l.length; e++) this.idx[this.tris + e] = l[e] + f;
		(this.verts += d), (this.tris += l.length);
	}
	into(e) {
		if (!this.tris) return;
		let t = new c.BufferGeometry();
		t.setAttribute(`position`, new c.BufferAttribute(this.pos.slice(0, this.verts * 3), 3)),
			t.setAttribute(`normal`, new c.BufferAttribute(this.nor.slice(0, this.verts * 3), 3)),
			t.setAttribute(`uv`, new c.BufferAttribute(this.uv.slice(0, this.verts * 2), 2)),
			t.setAttribute(`color`, new c.BufferAttribute(this.col.slice(0, this.verts * 3), 3)),
			t.setIndex(new c.BufferAttribute(this.idx.slice(0, this.tris), 1)),
			e.parts.sheet.push(t);
	}
};
const H = (e, t = e, n = e) => new c.Color(e, t, n);
function ae(e) {
	let t = [];
	e.stalk > 0 &&
		t.push(A({ length: e.stalk, width: 0.0012, shape: () => 1, paint: () => H(1.05, 1.05, 0.7), along: 1, across: 1 }));
	let n = A({
		length: e.length,
		width: e.width,
		shape: e.shape,
		lift: (t, n) => (e.cup ?? 0.05) * n * n - (e.bow ?? 0.08) * t * t,
		paint: (e, t) => (Math.abs(t) < 0.2 ? H(1.18, 1.2, 1) : H(y(1.06, 0.92, e))),
		along: e.along,
		across: e.across ?? 1,
	});
	return (
		n.translate(e.stalk - (e.back ?? 0) * e.length, 0, 0),
		t.push(n),
		e.cross && t.push(n.clone().rotateX(Math.PI / 2)),
		V(t)
	);
}
function oe(e, t, n = 0.24) {
	let r = [],
		i = (t) => -0.16 * t * t * e;
	r.push(
		A({
			length: e,
			width: 0.0028,
			shape: (e) => 1 - 0.5 * e,
			lift: (e) => -0.16 * e * e,
			paint: () => H(1.1, 1.08, 0.75),
			along: 2,
			across: 1,
		}),
	);
	let a = (t, a, o) => {
		let s = t * e,
			c = -0.32 * t,
			l = o === 0 ? 0 : o * 0.95,
			u = C(Math.cos(l), c + (o ? -0.05 : 0), Math.sin(l)).normalize(),
			d = A({
				length: a,
				width: a * n,
				shape: (e) => Math.sin(Math.PI * e ** 0.85) ** 0.6 * (e < 0.05 ? e / 0.05 : 1),
				lift: (e) => -0.06 * e * e,
				paint: () => H(o > 0 ? 1.04 : o < 0 ? 0.96 : 1.08),
				along: 3,
				across: 1,
			});
		d.applyMatrix4(T(C(s, i(t), 0), u, o * 0.25)), r.push(d);
	};
	for (let n = 0; n < t; n++) {
		let r = 0.38 + (0.5 * n) / Math.max(1, t - 1),
			i = e * (0.27 + 0.1 * (n / Math.max(1, t - 1)));
		a(r, i, 1), a(r + 0.03, i, -1);
	}
	return a(1, e * 0.4, 0), V(r);
}
var se = class {
	constructor() {
		(this.cells = new Map()), (this.size = 0.3);
	}
	key(e, t, n) {
		return (
			((Math.floor(e / this.size) + 512) * 1024 + Math.floor(t / this.size) + 512) * 1024 +
			Math.floor(n / this.size) +
			512
		);
	}
	add(e, t) {
		let n = this.key(e.x, e.y, e.z),
			r = this.cells.get(n);
		r ? r.push({ c: e.clone(), r: t }) : this.cells.set(n, [{ c: e.clone(), r: t }]);
	}
	depth(e, t) {
		let n = 0,
			r = this.size;
		for (let i = -1; i <= 1; i++)
			for (let a = -1; a <= 1; a++)
				for (let o = -1; o <= 1; o++) {
					let s = this.cells.get(this.key(e.x + i * r, e.y + a * r, e.z + o * r));
					if (s) for (let r of s) n = Math.max(n, r.r + t - r.c.distanceTo(e));
				}
		return n;
	}
	hit(e, t) {
		if (!this.cells.size) return !1;
		let n = this.size;
		for (let r = -1; r <= 1; r++)
			for (let i = -1; i <= 1; i++)
				for (let a = -1; a <= 1; a++) {
					let o = this.cells.get(this.key(e.x + r * n, e.y + i * n, e.z + a * n));
					if (o) {
						for (let n of o) if (n.c.distanceTo(e) < n.r + t) return !0;
					}
				}
		return !1;
	}
};
function U(e) {
	return (t, n) => {
		let r = new R(),
			i = _(h(n, `plant`), 1, 0.08),
			a = C(0, -e.seed.depth, 0),
			o = te(r, {
				seed: n,
				at: a,
				size: e.seed.size,
				coat: e.seed.coat,
				coatShade: e.seed.shade,
				stem: S(t, [
					[0, 0],
					[0.3, e.seed.depth * 0.1 + 0.001],
					[1, e.seed.depth + 0.03],
					[2, e.seed.depth + 0.07],
					[9, e.seed.depth + 0.07],
				]),
				hook: S(t, [
					[0, 1],
					[1, 1],
					[1.6, 0],
				]),
				radius: 0.0018 + 0.004 * x(t, 1, 3),
				stemColor: `#7a6a42`,
				leaf: e.cotyledon
					? {
							length: e.cotyledon.length,
							width: e.cotyledon.width,
							shape: (e) => Math.sin(Math.PI * e ** 0.8) ** 0.7,
							color: e.cotyledon.colour,
							vein: `#a6c47e`,
						}
					: { length: 0.001, width: 5e-4, shape: () => 1, color: `#7a8a4a`, vein: `#7a8a4a` },
				open: e.hypogeal ? 0 : x(t, 1.1, 2),
				shed: e.hypogeal ? x(t, 3.5, 4.5) : x(t, 1, 1.6),
				wither: e.hypogeal ? 1 : x(t, 3, 3.8),
				keepCoat: e.hypogeal,
			});
		z(r, {
			seed: n,
			key: [`tap`],
			from: a.clone(),
			dir: C(0.02, -1, 0.01),
			length: e.roots.tap,
			grown: S(t, [
				[0, 0],
				[0.3, 0.004],
				[1, 0.03],
				[2, 0.07],
				[3, 0.2],
				[4, 0.45],
				[5, 0.75],
				[6, 0.9],
				[8, 1],
			]),
			radius: 0.002 + e.roots.radius * x(t, 2, 8),
			down: 0.03,
			wander: 0.1,
			laterals: 10,
			lateral: 0.3,
			depth: 2,
			age: x(t, 1.5, 6),
			young: `#f3e6cc`,
			old: `#5e4632`,
		});
		for (let o = 0; o < e.roots.count; o++) {
			let s = h(n, `feeder`, o),
				c = 2.6 + o * (4 / e.roots.count),
				l = o * 2.39996 + s() * 0.4;
			z(r, {
				seed: n,
				key: [`feeder`, o],
				from: a.clone().add(C(0, -0.04 - s() * 0.12, 0)),
				dir: C(Math.cos(l), -0.15, Math.sin(l)),
				length: g(s, 0.6, 1) * e.roots.spread * i,
				grown: (t - c) / 2.8,
				radius: 0.003 + e.roots.radius * 0.4 * x(t, 3, 8),
				down: 0.01,
				wander: 0.14,
				laterals: 4,
				lateral: 0.25,
				depth: 2,
				age: (t - c - 0.6) / 2.5,
				young: `#efdcb8`,
				old: `#5e4632`,
			});
		}
		e.nodules && le(r, n, t, a);
		let s = [],
			c = S(t, [
				[2, 0.12],
				[3, 0.25],
				[4, 0.55],
				[5, 0.8],
				[6, 0.92],
				[9, 1],
			]);
		e.flush
			? (s = ne(r, { seed: n, g: t, from: o.top.clone(), spec: { ...e.flush, radius: e.flush.radius * c } }))
			: e.leader
				? (s = B(r, { seed: n, g: t, from: o.top.clone(), spec: e.leader }))
				: e.coppice && (s = G(r, n, t, o.top.clone(), e.coppice));
		for (let t of s) t.gen <= (e.flush ? 2 : 1) && t.radius > 0.01 && r.space.rod(t.pts, t.radius + 0.01);
		let l = new se();
		e.bear({ bag: r, g: t, seed: n, shoots: s, vigour: i, clear: l, gens: e.flush?.gens ?? 2 });
		let u = e.leaf,
			d = h(n, `leaf-make`),
			f = u.blade,
			p = () =>
				f.pinnate ? oe(f.length * _(d, 1, 0.06), f.pinnate, f.wide) : ae({ ...f, length: f.length * _(d, 1, 0.06) }),
			m = [p(), p(), p()],
			y = u.bare
				? S(t, [
						[4.3, 1],
						[4.5, 0],
						[5.25, 0],
						[5.8, 1],
					])
				: 1,
			b = u.bare ? v((t - 5.25) / 0.9) : 1,
			w = x(t, 8.2, 9.2),
			T = new ie();
		if (y > 0.03) for (let i of s) ce(r, T, e, n, t, i, m, l, y, t > 5.25 && t < 6.2 ? b : 1, w);
		T.into(r);
		for (let e of m) e.dispose();
		return r.build();
	};
}
function ce(e, t, n, r, i, a, o, s, l, u, d) {
	let f = n.leaf,
		p = h(r, `leaves`, ...a.key),
		m = !n.flush,
		b = (n.flush?.gens ?? 0) - 1,
		x = m ? !0 : a.end || (a.gen === 0 && i < 3.4) || a.gen >= Math.min(f.from ?? 99, b),
		w = !x && a.gen >= 1 && f.inner ? f.inner : 0;
	if (!x && !w) return;
	let E = Math.min(v((i - a.born) / 0.6), u),
		D = f.blade.pinnate ? f.blade.length * 1.1 : f.blade.length + f.blade.stalk,
		O = new c.Color(f.young),
		A = new c.Color(f.colour),
		j = new c.Color(f.autumn),
		M = f.spring
			? 0.75 *
				S(i, [
					[4.4, 0],
					[4.75, 1],
					[5.3, 1],
					[5.9, 0],
				])
			: 0,
		N = (e, n) => {
			let r = g(p, 0.8, 1.1) * y(0.45, 1, E) * y(0.55, 1, v(i - 2)) * l,
				a = y(-0.7, -f.droop, E) + _(p, 0, 0.3),
				u = o[Math.floor(p() * o.length)],
				m = (p() - 0.5) * 0.6,
				h = p(),
				b = d * v((p() - 0.6) * 1.6);
			if (r < 0.02) return;
			let x = null,
				S = n.clone().setY(0);
			S.lengthSq() < 1e-6 && S.set(1, 0, 0), S.normalize();
			for (let t of [0, 0.7, -0.7, 1.5, -1.5, 2.4, -2.4]) {
				let n = S.clone()
						.applyAxisAngle(C(0, 1, 0), t)
						.multiplyScalar(Math.cos(a))
						.add(C(0, Math.sin(a), 0))
						.normalize(),
					i = !1;
				for (let t of [0.35, 0.7, 1]) s.hit(e.clone().addScaledVector(n, D * r * t), D * r * 0.16) && (i = !0);
				if (!i) {
					x = n;
					break;
				}
			}
			if (!x) return;
			let w = O.clone()
				.lerp(A, E * (1 - M))
				.multiplyScalar(0.92 + 0.16 * h)
				.lerp(j, b * 0.75);
			t.stamp(u, T(e, x, m).multiply(new c.Matrix4().makeScale(r, r, r)), w);
		},
		P = (e, t, n, r) => {
			let i = new c.Vector3().crossVectors(t, C(0, 1, 0));
			i.lengthSq() < 1e-6 && (i = C(1, 0, 0)), i.normalize().applyAxisAngle(t, n);
			let a = C(e.x, 0, e.z);
			return a.lengthSq() > 1e-6 && i.addScaledVector(a.normalize(), 0.45), i.addScaledVector(t, r);
		};
	if (m && a.gen === 0) {
		let e = Math.min(f.top ?? 2.4, a.length * 0.6),
			t = Math.max(2, Math.min(40, Math.round(e / f.gap)));
		for (let n = 0; n < t; n++) {
			let { at: r, dir: i } = W(a.pts, 1 - (e / a.length) * (n / t)),
				o = 0.06 + (n / t) * 0.3 * v(a.length / 4);
			for (let e = 0; e < 4; e++) {
				let t = (n * 4 + e) * 2.39996,
					a = C(Math.cos(t), 0, Math.sin(t));
				N(r.clone().addScaledVector(a, o), a.addScaledVector(i, 0.5));
			}
		}
		return;
	}
	let F = m && a.gen === 1 ? (f.limb ?? 0.5) : w ? 0.3 : 0.12,
		I = a.gen === 0 && !m ? Math.min(f.gap, 0.09) : f.gap * (w || 1),
		L = Math.min(40, Math.max(1, Math.round((a.length * (1 - F)) / I))),
		R = new c.Color(n.flush?.bark[0] ?? n.leader?.bark[0] ?? n.coppice?.leader.bark[0] ?? `#6a5a4a`);
	for (let t = 0; t < L; t++) {
		let n = F + ((t + 0.5) / L) * (1 - F),
			{ at: r, dir: i } = W(a.pts, n),
			o = P(r, i, t * 2.39996 + p() * 0.5, 0.45);
		if (f.per <= 1) {
			N(r, o);
			continue;
		}
		let s = o
				.clone()
				.normalize()
				.add(C(0, 0.25, 0))
				.normalize(),
			c = f.twig * g(p, 0.7, 1.15) * y(0.4, 1, E) * l + 0.01,
			u = r.clone().addScaledVector(s, c);
		e.add(
			`body`,
			k(
				[r, u],
				(e) => 0.003 * (1 - 0.5 * e),
				() => R,
				3,
			),
		);
		for (let e = 0; e < f.per; e++) {
			let t = r.clone().lerp(u, (e + 1) / f.per);
			N(t, P(t, s, (e % 2 ? 1 : -1) * 1.3 + p() * 0.4, e === f.per - 1 ? 1.2 : 0.4));
		}
	}
	if ((a.end || m) && !w)
		for (let e = 0; e < f.tuft; e++) {
			let { at: t, dir: n } = W(a.pts, 1 - (e % 3) * 0.05);
			N(t, P(t, n, e * 2.39996 + 1, 1.1));
		}
}
function W(e, t) {
	let n = v(t) * (e.length - 1),
		r = Math.min(e.length - 2, Math.floor(n));
	return { at: e[r].clone().lerp(e[r + 1], n - r), dir: e[r + 1].clone().sub(e[r]).normalize() };
}
function G(e, t, n, r, i) {
	let a = [],
		o = h(t, `stool`),
		s = i.stems[0] + Math.floor(o() * (i.stems[1] - i.stems[0] + 1));
	for (let o = 0; o < s; o++) {
		let s = h(t, `stem`, o),
			l = i.from + o * i.every * _(s, 1, 0.25),
			u = o * 2.39996 + _(s, 0, 0.3),
			d = o === 0 ? 0 : i.stool * g(s, 0.4, 1),
			f = o === 0 ? _(s, 0.05, 0.03) : i.lean * g(s, 0.55, 1.2),
			p = n - l + 2;
		if (p <= 2) continue;
		let m = r.clone().add(C(Math.cos(u) * d, -0.02, Math.sin(u) * d)),
			v = new c.Matrix4()
				.makeTranslation(m.x, m.y, m.z)
				.multiply(new c.Matrix4().makeRotationAxis(C(-Math.sin(u), 0, Math.cos(u)), -f)),
			y = {
				add(t, n, r) {
					return r && n.applyMatrix4(r), n.applyMatrix4(v), e.add(t, n), y;
				},
				space: e.space,
			},
			b = _(s, 1, 0.12) * (1 - 0.06 * o),
			x = { ...i.leader, height: i.leader.height.map(([e, t]) => [e, t * b]) },
			S = B(y, { seed: `${t}·${o}`, g: p, from: C(0, 0, 0), spec: x }),
			w = new c.Matrix3().setFromMatrix4(v);
		for (let e of S)
			(e.pts = e.pts.map((e) => e.clone().applyMatrix4(v))),
				(e.tip = e.tip.clone().applyMatrix4(v)),
				(e.dir = e.dir.clone().applyMatrix3(w).normalize()),
				(e.key = [`stem`, o, ...e.key]),
				a.push(e);
	}
	return a;
}
function le(e, t, n, r) {
	let i = x(n, 2.4, 6);
	if (i <= 0.01) return;
	let a = h(t, `nodules`);
	for (let n = 0; n < 9; n++) {
		let o = n * 2.39996 + a() * 0.8,
			s = g(a, 0.12, 0.7) * y(0.3, 1, i),
			c = g(a, 0.06, 0.25),
			l = C(Math.cos(o), 0, Math.sin(o)),
			u = r
				.clone()
				.addScaledVector(l, s)
				.add(C(0, -c, 0));
		z(e, {
			seed: t,
			key: [`nodule-root`, n],
			from: r.clone().add(C(0, -0.03, 0)),
			dir: l.clone().add(C(0, -c / Math.max(0.1, s), 0)),
			length: u.distanceTo(r) * 1.1,
			grown: i * 1.2,
			radius: 0.004 + 0.008 * i,
			down: 0,
			wander: 0.04,
			laterals: 0,
			depth: 0,
			age: i,
			young: `#e8d4b0`,
			old: `#6a4e36`,
		});
		let d = (0.008 + 0.022 * a()) * i,
			f = 5 + Math.floor(a() * 5);
		for (let t = 0; t < f; t++) {
			let t = C(a() - 0.5, a() - 0.5, a() - 0.5).normalize();
			e.add(
				`body`,
				j(
					u.clone().addScaledVector(t, d * 0.6),
					C(1, 0.8, 1).multiplyScalar(d * g(a, 0.35, 0.6)),
					O(`#d0884a`, `#8a5a34`, a()),
					3,
				),
			);
		}
	}
}
const ue = [
		[`Winged nutlet`, 0, `A small nutlet with two broad membranous wings.`],
		[`Germination`, 14, `The radicle emerges first; seed leaves rise above the soil.`],
		[`Seedling`, 35, `Two rounded seed leaves precede alternating toothed true leaves.`],
		[`Sapling`, 365, `Young bark is brown, not white; fine shoots carry alternating pointed buds.`],
		[`Young birch`, 1095, `Pale bark develops with horizontal lenticels; slender outer twigs hang.`],
		[`Spring catkins`, 1825, `Long pendent male catkins release pollen; smaller female catkins stand upright.`],
		[`Fruit set`, 1840, `Male catkins fade; fertilised female catkins thicken and turn down.`],
		[`Green fruit catkins`, 1880, `Three-lobed bracts cover the developing winged nutlets.`],
		[`Ripening`, 1920, `Fruit catkins brown while leaves turn yellow.`],
		[`Winged nutlets`, 1950, `Ripe catkins break apart, releasing nutlets and their three-lobed bracts.`],
	].map(([e, t, n]) => ({ name: e, day: t, note: n })),
	K = Math.PI * 2,
	de = (e) =>
		Math.max(
			0,
			(e < 0.25 ? e / 0.25 : ((1 - e) / 0.75) ** 1.25) * (1 - 0.09 * ((e * 12) % 1) - 0.045 * ((e * 36) % 1)),
		),
	q = (e, t) => {
		let n = Math.min(0.999999, Math.max(0, t)) * (e.length - 1),
			r = Math.floor(n);
		return { at: e[r].clone().lerp(e[r + 1], n - r), dir: e[r + 1].clone().sub(e[r]).normalize() };
	};
function J(e, t, n = C(1, 0, 0), r = 1) {
	let i = T(t, n),
		a = 0.002 * r;
	e.add(`body`, j(C(a * 0.5, 0, 0), C(a * 0.5, a * 0.14, a * 0.2), `#805b32`, 5), i);
	for (let t of [-1, 1])
		e.add(
			`sheet`,
			A({
				length: a * 1.3,
				width: a * 0.65,
				shape: (e) => Math.sin(Math.PI * e),
				lift: (e, t) => 0.06 * t * t,
				paint: (e, t) => O(`#d6b975`, `#efe0af`, Math.abs(t)),
				along: 10,
				across: 2,
			}).translate(-a * 0.15, 0, t * a * 0.7),
			i,
		);
}
function fe(e, t, n) {
	let r = T(t, n),
		i = 0.006;
	if (
		(e.add(
			`body`,
			k(
				[C(0, 0, 0), C(i * 0.35, 0, 0), C(i * 0.75, 0, 0), C(i, 0, 0)],
				(e) => 0.0016 * Math.sin(Math.PI * e) * (0.9 - 0.3 * e),
				(e) => O(`#55301d`, `#9c6335`, e),
				6,
			),
			r,
		),
		u.level > 0.5)
	)
		for (let t = 0; t < 6; t++) {
			let n = t * 2.39996,
				i = 4e-4 + t * 55e-5;
			e.add(
				`body`,
				k(
					[
						C(i, Math.cos(n) * 0.001, Math.sin(n) * 0.001),
						C(i + 0.002, Math.cos(n) * 0.0012, Math.sin(n) * 0.0012),
						C(i + 0.003, 0, 0),
					],
					() => 12e-5,
					() => `#c58b56`,
					3,
				),
				r,
			);
		}
}
function pe(e, t, n, r) {
	if (t.radius < 0.012 || n < 3.3) return;
	let i = h(r, `bark`, ...t.key),
		a = x(n, 3.3, 4.7),
		o = Math.ceil(t.length * 13 * u.level);
	for (let n = 0; n < o; n++) {
		let n = 0.02 + i() * 0.94,
			{ at: r, dir: o } = q(t.pts, n),
			s = i() * K,
			c = C(0, 1, 0).cross(o);
		c.lengthSq() < 0.001 && c.set(1, 0, 0), c.normalize();
		let l = o.clone().cross(c).normalize(),
			u = t.radius * (1 - 0.35 * n),
			d = 0.12 + i() * 0.6,
			f = Array.from({ length: 5 }, (e, t) => {
				let n = s + (t / 4 - 0.5) * d;
				return r
					.clone()
					.addScaledVector(c, Math.cos(n) * (u + 35e-5))
					.addScaledVector(l, Math.sin(n) * (u + 35e-5));
			});
		e.add(
			`body`,
			k(
				f,
				() => 5e-4 + Math.min(0.002, t.radius * 0.015),
				() => O(`#74533a`, `#393a32`, a),
				3,
			),
		);
	}
	if (t.gen === 0 && n > 4)
		for (let r = 0; r < 9; r++) {
			let a = (r * K) / 9 + i() * 0.2,
				o = (0.12 + i() * 0.18) * x(n, 4, 8),
				s = [];
			for (let e = 0; e < 10; e++) {
				let n = 0.01 + (o * e) / 9,
					{ at: i, dir: c } = q(t.pts, n),
					l = C(1, 0, 0).addScaledVector(c, -c.x).normalize(),
					u = c.clone().cross(l),
					d = a + 0.04 * Math.sin(e * 2 + r);
				s.push(
					i
						.addScaledVector(l, Math.cos(d) * (t.radius * (1 - 0.35 * n) + 5e-4))
						.addScaledVector(u, Math.sin(d) * (t.radius * (1 - 0.35 * n) + 5e-4)),
				);
			}
			e.add(
				`body`,
				k(
					s,
					(e) => 0.002 + Math.sin(Math.PI * e) * 0.005,
					() => `#35372f`,
					3,
				),
			);
		}
}
function Y(e, t, n, r, i, a, o, s) {
	s && e.fruit(o, t, n);
	let c = T(t, n);
	e.add(
		`body`,
		k(
			[C(0, 0, 0), C(r * 0.12, 0, 0), C(r, 0, 0)],
			(e) => i * Math.sin(Math.PI * Math.min(1, e / 0.12)) * 0.12 + i * 0.22,
			() => `#80713e`,
			5,
		),
		c,
	);
	let l = u.fruit ? 22 : Math.max(5, Math.round(12 * u.level));
	for (let t = 0; t < l; t++)
		for (let o = 0; o < 4; o++) {
			let d = 0.12 + (0.85 * t) / l,
				f = (o * K) / 4 + t * 2.39996,
				p = C(r * d, Math.cos(f) * i, Math.sin(f) * i),
				m = s ? O(`#84a348`, `#99703d`, a) : O(`#bd984d`, `#dfc266`, t % 2);
			e.add(
				`sheet`,
				A({
					length: s ? 0.0045 : 0.0025,
					width: s ? 0.002 : 0.0013,
					shape: (e) => Math.sin(Math.PI * e) * (0.7 + 0.3 * Math.cos(e * 6 * Math.PI)),
					paint: () => m,
					along: 6,
					across: 2,
				}),
				c.clone().multiply(T(p, C(0.65, Math.cos(f), Math.sin(f)))),
			),
				s && a > 0.7 && u.fruit && J(e, p.clone().applyMatrix4(c), n, 0.85);
		}
	s && e.fruitDone();
}
const me = U({
		seed: { size: C(0.001, 3e-4, 4e-4), coat: `#a67c46`, shade: `#684a28`, depth: 5e-4 },
		hypogeal: !1,
		cotyledon: { length: 0.004, width: 0.002, colour: `#8eae5d` },
		roots: { tap: 1.2, spread: 3.5, count: 8, radius: 0.04 },
		flush: {
			trunk: 2.5,
			trunkBorn: 1.6,
			trunkFlush: 1.2,
			scaffolds: [4, 6],
			scaffoldAngle: 0.3,
			gens: 6,
			flush: 0.16,
			rest: 0.08,
			shoot: (e) => [0, 2.7, 1.8, 1.2, 0.85, 0.65, 0.45][e] ?? 0.3,
			whorl: [2, 3],
			spread: 0.55,
			up: 0.15,
			droop: 0.26,
			wander: 0.1,
			radius: 0.12,
			taper: 0.55,
			thicken: 3,
			bark: [`#8c6650`, `#e6e3d6`],
		},
		leaf: {
			blade: { stalk: 0.018, length: 0.055, width: 0.021, shape: de, along: 36, across: 2, bow: 0.035, cup: 0.025 },
			colour: `#4d7a32`,
			young: `#98b957`,
			autumn: `#dbb846`,
			droop: 0.2,
			gap: 0.1,
			per: 1,
			twig: 0.07,
			tuft: 2,
			from: 3,
			inner: 2,
		},
		bear({ bag: e, g: t, seed: n, shoots: r }) {
			t < 1 && J(e, C(0, 3e-4, 0));
			for (let i of r) {
				if ((pe(e, i, t, n), i.gen < 3)) continue;
				let r = h(n, `organs`, ...i.key);
				for (let t = 0; t < 3; t++) {
					let n = 0.35 + t * 0.24,
						{ at: a, dir: o } = q(i.pts, n),
						s = t * Math.PI + r() * 0.25;
					fe(e, a, C(Math.cos(s), 0.2, Math.sin(s)).addScaledVector(o, 0.5).normalize());
				}
				if (t < 4.7 || r() > 0.16) continue;
				let a = i.tip.clone();
				if (t < 6)
					for (let t = 0; t < 2; t++)
						Y(e, a, C((t - 0.5) * 0.3, -1, 0.1).normalize(), 0.045 + 0.012 * r(), 0.0025, 0, [], !1);
				let o = x(t, 5, 7),
					s = C(0.15, 1 - 2 * o, 0.12).normalize(),
					c = a.clone().addScaledVector(s, 0.012);
				e.add(
					`body`,
					k(
						[a, c],
						() => 65e-5,
						() => `#6b7943`,
						4,
					),
				),
					Y(e, c, s, 0.015 + 0.015 * o, 0.002 + 0.0025 * o, x(t, 7.3, 9), [`catkin`, ...i.key], !0);
			}
		},
	}),
	he = U({
		seed: { size: C(0.0012, 4e-4, 0.001), coat: `#ab8b50`, shade: `#715a33`, depth: 0.001 },
		hypogeal: !1,
		cotyledon: { length: 0.004, width: 0.0025, colour: `#86ab52` },
		roots: { tap: 1.2, spread: 3, count: 8, radius: 0.045 },
		flush: {
			trunk: 1.8,
			trunkBorn: 1.6,
			trunkFlush: 1.2,
			scaffolds: [3, 5],
			scaffoldAngle: 0.32,
			gens: 6,
			flush: 0.16,
			rest: 0.08,
			shoot: (e) => [0, 2.3, 1.5, 1, 0.75, 0.55, 0.4][e] ?? 0.3,
			whorl: [2, 3],
			spread: 0.5,
			up: 0.12,
			droop: 0.2,
			wander: 0.09,
			radius: 0.09,
			taper: 0.62,
			thicken: 3,
			bark: [`#eee9df`, `#d6d3ca`],
		},
		leaf: {
			blade: {
				stalk: 0.018,
				length: 0.055,
				width: 0.034,
				shape: (e) => Math.sin(Math.PI * e) ** 0.7 * (1 - 0.5 * e) * (1 + 0.05 * Math.sin(e * 70)),
				along: 4,
				bow: 0.04,
			},
			colour: `#659345`,
			young: `#a0be5e`,
			autumn: `#d8b946`,
			droop: 0.2,
			gap: 0.14,
			per: 2,
			twig: 0.1,
			tuft: 2,
			from: 3,
			inner: 2,
		},
		bear({ bag: e, g: t, seed: n, shoots: r }) {
			for (let i of r.filter((e) => e.gen >= 4)) {
				if (h(n, `catkin`, ...i.key)() > 0.12) continue;
				let r = x(t, 4.8, 6);
				if (r <= 0) continue;
				let a = i.tip.clone(),
					o = a.clone().add(C(0.012, -0.06 * r, 0.008));
				e.add(
					`body`,
					k(
						[a, o],
						() => 0.004 * r,
						() => `#a18b46`,
						5,
					),
				);
			}
		},
	}),
	X = { v: 1, date: `2026-10-05`, note: `First version` };
function ge(e, t = [X]) {
	let n = [...t].sort((e, t) => e.v - t.v);
	return n.map((t, r) => {
		let i = r === n.length - 1;
		return { v: t.v, date: t.date, note: t.note, build: i ? e : (t.build ?? e), kept: i || t.build !== void 0 };
	});
}
const _e = (e) => e[e.length - 1]?.v ?? 1;
function ve(e, t, n = {}) {
	return e.map((e) => {
		let r = ge(e[t], n[e.id]);
		return { ...e, versions: r, version: _e(r) };
	});
}
function ye(e) {
	let t = new c.Box3();
	for (let n of e.parts) n.geometry.computeBoundingBox(), t.union(n.geometry.boundingBox);
	let n = t.getSize(new c.Vector3());
	return Math.max(n.x, n.y, n.z);
}
function be(e, t, n) {
	let { plant: r, fruits: i } = L(() => e(t, n));
	return { plant: r, fruit: i.length ? xe(i, n) : void 0 };
}
function xe(e, t) {
	let n = e.map((e) => ({ key: e.key, size: ye(e) }));
	for (let t of e) for (let e of t.parts) e.geometry.dispose();
	let r = Math.max(...n.map((e) => e.size)),
		i = n.filter((e) => e.size >= r * 0.7),
		a = h(t, `one-fruit`);
	return { keys: i.map((e) => e.key), pick: i[Math.floor(a() * i.length)].key };
}
function Se(e, t, n, r) {
	let { plant: i, fruits: a } = d({ fruit: r }, () => L(() => e(t, n)));
	we(i);
	let o = a.find((e) => e.key === r);
	for (let e of a) if (e !== o) for (let t of e.parts) t.geometry.dispose();
	if (!o) return;
	let s = new c.Matrix4()
		.makeRotationFromQuaternion(new c.Quaternion().setFromUnitVectors(o.dir, new c.Vector3(0, -1, 0)))
		.multiply(new c.Matrix4().makeTranslation(-o.at.x, -o.at.y, -o.at.z));
	for (let e of o.parts) e.geometry.applyMatrix4(s);
	Ce(o, h(n, `one-fruit-shape`, r));
	let u = new c.Group(),
		f = {};
	for (let e of o.parts) (f[e.kind === `prop` ? `body` : e.kind] ??= []).push(e.geometry);
	for (let [e, t] of Object.entries(f)) {
		let n = t.length === 1 ? t[0] : (0, l.mergeGeometries)(t);
		if (t.length > 1) for (let e of t) e.dispose();
		if (!n) continue;
		let r = new c.Mesh(n, F(e));
		(r.castShadow = !0), (r.receiveShadow = !0), u.add(r);
	}
	return u;
}
function Ce(e, t) {
	let n = new c.Box3();
	for (let t of e.parts) n.union(new c.Box3().setFromBufferAttribute(t.geometry.attributes.position));
	let r = Math.max(1e-4, -n.min.y),
		i = n.getCenter(new c.Vector3()),
		a = _(t, 1, 0.1),
		o = _(t, 1, 0.08),
		s = _(t, 0, 0.06),
		l = g(t, 0, 0.07),
		u = t() * Math.PI * 2,
		d = _(t, 0, 0.05),
		f = t() * Math.PI * 2,
		p = _(t, 0, 0.05),
		m = t() * Math.PI * 2,
		h = g(t, 0.3, 0.8),
		y = _(t, 0, 0.012),
		b = _(t, 0, 0.07),
		x = _(t, 0, 0.045),
		S = t() * Math.PI * 2,
		C = g(t, 0.02, 0.07),
		w = new c.Vector3(),
		T = new c.Color(),
		E = { h: 0, s: 0, l: 0 };
	for (let t of e.parts) {
		let e = t.geometry.attributes.position,
			n = t.geometry.attributes.color;
		for (let t = 0; t < e.count; t++) {
			w.fromBufferAttribute(e, t);
			let c = v(-w.y / r),
				g = v((c - 0.04) / 0.25),
				_ = w.x - i.x,
				D = w.z - i.z,
				O = Math.atan2(D, _),
				k = Math.sin(Math.PI * c),
				A = 1 + g * (l * Math.cos(O - u) * k + p * Math.exp(-(((c - h) / 0.18) ** 2)) * Math.max(0, Math.cos(O - m))),
				j = (1 + g * s) / Math.sqrt(Z(o, g)),
				M = (1 - g * s) / Math.sqrt(Z(o, g)),
				N = i.x + _ * A * j + g * d * r * k * Math.cos(f),
				P = i.z + D * A * M + g * d * r * k * Math.sin(f),
				F = w.y * Z(o, g);
			if ((e.setXYZ(t, N * a, F * a, P * a), n && g > 0)) {
				T.fromBufferAttribute(n, t), T.getHSL(E);
				let e = C * Math.max(0, Math.cos(O - S)) * k;
				T.setHSL((E.h + y * g + 1) % 1, v(E.s * (1 + b * g)), v(E.l * (1 + x * g) + e * g)), n.setXYZ(t, T.r, T.g, T.b);
			}
		}
		(e.needsUpdate = !0),
			n && (n.needsUpdate = !0),
			t.kind === `sheet` ? t.geometry.computeVertexNormals() : M(t.geometry);
	}
}
const Z = (e, t) => 1 + (e - 1) * t,
	we = (e) => e.traverse((e) => e.geometry?.dispose()),
	Te = [
		{
			id: `birch`,
			label: `Silver birch · Birke`,
			latin: `Betula pendula`,
			note: `White bark, fine hanging twigs, pointed leaves and wind-borne seeds.`,
			from: `Europe and temperate Asia`,
			layer: `canopy`,
			stages: ue,
			grow: me,
		},
	],
	Ee = [
		{ id: `canopy`, label: `1 · Canopy`, note: `the tall trees over everything` },
		{
			id: `sub-canopy`,
			label: `2 · Low trees`,
			note: `the smaller trees under the canopy: fruit and nut trees, the big herbs that stand like them`,
		},
		{ id: `shrub`, label: `3 · Shrubs`, note: `the bushes: berries, woody herbs` },
		{
			id: `herbaceous`,
			label: `4 · Herbaceous`,
			note: `soft plants that die back or are grown each year: vegetables and herbs`,
		},
		{ id: `ground`, label: `5 · Ground cover`, note: `low and spreading over the soil, keeping it covered` },
		{ id: `root`, label: `6 · Roots`, note: `grown for what they swell below the soil: roots, tubers, bulbs` },
		{ id: `climber`, label: `7 · Climbers`, note: `vines that climb the trees, the stakes and the wires` },
		{ id: `fungi`, label: `8 · Fungi`, note: `the mycelium in the soil and the wood, and the mushrooms it fruits` },
	],
	De = {
		'king-coconut': `canopy`,
		mango: `canopy`,
		durian: `canopy`,
		jackfruit: `canopy`,
		avocado: `canopy`,
		safou: `canopy`,
		sapodilla: `canopy`,
		persimmon: `sub-canopy`,
		mulberry: `sub-canopy`,
		fig: `sub-canopy`,
		pomegranate: `sub-canopy`,
		olive: `sub-canopy`,
		cacao: `sub-canopy`,
		coffee: `shrub`,
		lavender: `shrub`,
		comfrey: `herbaceous`,
		chard: `herbaceous`,
		kale: `herbaceous`,
		clover: `ground`,
		ginger: `root`,
		beans: `climber`,
		apple: `sub-canopy`,
		pear: `sub-canopy`,
		cherry: `sub-canopy`,
		peach: `sub-canopy`,
		apricot: `sub-canopy`,
		plum: `sub-canopy`,
		orange: `sub-canopy`,
		lemon: `sub-canopy`,
		soursop: `sub-canopy`,
		papaya: `sub-canopy`,
		banana: `sub-canopy`,
		'red-banana': `sub-canopy`,
		raspberry: `shrub`,
		blueberry: `shrub`,
		rosemary: `shrub`,
		sage: `shrub`,
		tomato: `herbaceous`,
		oxheart: `herbaceous`,
		eggplant: `herbaceous`,
		pepper: `herbaceous`,
		lettuce: `herbaceous`,
		pineapple: `herbaceous`,
		basil: `herbaceous`,
		parsley: `herbaceous`,
		chives: `herbaceous`,
		mint: `herbaceous`,
		'lemon-balm': `herbaceous`,
		dill: `herbaceous`,
		coriander: `herbaceous`,
		strawberry: `ground`,
		thyme: `ground`,
		oregano: `ground`,
		pumpkin: `ground`,
		moss: `ground`,
		'wild-garlic': `ground`,
		carrot: `root`,
		radish: `root`,
		garlic: `root`,
		cucumber: `climber`,
		grape: `climber`,
		'passion-fruit': `climber`,
		'wine-cap': `fungi`,
		shiitake: `fungi`,
		oyster: `fungi`,
	},
	Oe = {
		birch: [
			{ ...X, date: `2026-10-23`, build: he },
			{
				v: 2,
				date: `2026-10-23`,
				note: `Silver birch anatomy: horizontal lenticels, basal fissures, scaled buds, double-toothed leaves, separate catkins and winged nutlets`,
			},
		],
	},
	Q = [`maia`, `isar`, `samuel`, `backyard`, `seed-0042`, `sun`, `rain`, `domes`],
	ke = (e) => [
		{
			id: `stage`,
			label: `Stage`,
			type: `number`,
			min: 0,
			max: e.stages.length - 1,
			value: e.stages.length - 1,
			names: e.stages.map((e) => e.name),
		},
		{ id: `seed`, label: `Seed`, type: `string`, value: Q[0], maxLength: 40 },
		{ id: `detail`, label: `Detail`, type: `number`, min: 0.05, max: 1, step: 0.05, value: 1 },
		{ id: `fruit`, label: `View`, type: `integer`, min: 0, max: 1, value: 0, names: [`Plant`, `Fruit`] },
	],
	Ae = (e, t) => (n, r, i, a) => {
		let o = a ? () => je(e, t, n, r) : () => e(n, r);
		return i === void 0 || i >= 1 ? o() : d(f(i), o);
	};
function je(e, t, n, r) {
	let { plant: i, fruit: a } = be(e, t, r);
	i.traverse((e) => e.geometry?.dispose());
	let o = a && Se(e, n, r, a.pick);
	if (o) return o;
	let s = new c.Group();
	return (s.userData.note = a ? `This fruit has not set yet.` : `This plant bears no fruit.`), s;
}
const $ = ve(
	Ee.flatMap((e) =>
		[...Te]
			.filter((t) => (t.layer ?? De[t.id] ?? `herbaceous`) === e.id)
			.map((t) => ({ ...t, layer: e.id, params: ke(t) })),
	),
	`grow`,
	Oe,
).map((e) => ({
	...e,
	versions: e.versions.map((t) =>
		typeof t.build == `function` ? { ...t, build: Ae(t.build, e.stages.length - 1) } : t,
	),
}));
function Me(e, t, n, r) {
	let i = e.find((e) => e.id === t),
		a = i && (n === void 0 ? i.versions[i.versions.length - 1] : i.versions.find((e) => e.v === n));
	if (!i || !a) return;
	let o = a.build;
	if (Array.isArray(o) && o.every((e) => typeof e?.make == `function`)) {
		if (((o = (r ? o.find((e) => e.id === r) : o[0])?.make), !o)) return;
	} else if (r) return;
	return { item: i, version: a, build: o, kept: a.kept };
}
const Ne = (e) => Object.fromEntries(Object.entries(e).filter(([, e]) => e !== void 0));
function Pe(e, t, n, r) {
	let i = Array.isArray(n.build) ? n.build.find((e) => e.id === (r ?? n.build[0]?.id)) : null;
	return Ne({
		group: e,
		id: t.id,
		version: n.v,
		variant: r ?? i?.id,
		label: i?.label ? `${t.label}: ${i.label}` : t.label,
		note: i?.note ?? n.note,
		params: t.params?.length ? JSON.parse(JSON.stringify(t.params)) : void 0,
	});
}
function Fe(e, t, n, r, i) {
	let a = Me(t, n, r, i ?? void 0);
	if (!a) throw Error(`no asset ${e}/${n}@${r}${i ? `:${i}` : ``}`);
	if (!a.kept || typeof a.build != `function`) throw Error(`${e}/${n}@${r}: no builder of its own`);
	return { meta: Pe(e, a.item, a.version, i ?? void 0), build: a.build };
}
function Ie(e) {
	let t = [];
	for (let n of e)
		for (let e of n.versions.filter((e) => e.kept))
			if (Array.isArray(e.build)) for (let r of e.build) t.push({ id: n.id, v: e.v, variant: r.id });
			else t.push({ id: n.id, v: e.v, variant: null });
	return t;
}
const Le = (e, t, n) => Fe(`plants`, $, e, t, n),
	Re = () => Ie($);
(exports.list = Re), (exports.recipe = Le);
