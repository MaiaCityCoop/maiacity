*/
var Blades = class {
	constructor() {
		/** @type {number[]} */
		this.pos = [];
		/** @type {number[]} */
		this.col = [];
		/** @type {number[]} */
		this.idx = [];
		/** how far into the next one kept, when thinned */
		this.acc = 0;
	}
	/** how much bigger a thing this long is grown when kept at this detail; 0 when it is one of those left out */
	keep(size, round = false) {
		if (DETAIL.thin >= 1 && DETAIL.fill === 1) return 1;
		this.acc += DETAIL.thin;
		if (this.acc < 1) return 0;
		this.acc -= 1;
		const most = Math.max(1, .14 / Math.max(1e-4, size / 2));
		return Math.min(2.6, most, round ? 1 / Math.cbrt(DETAIL.thin) : DETAIL.fill / Math.sqrt(DETAIL.thin));
	}
	/** a vertex, its index */
	vert(p, c) {
		const k = tint(c);
		this.pos.push(p.x, p.y, p.z);
		this.col.push(k.r, k.g, k.b);
		return this.pos.length / 3 - 1;
	}
	/**
	* One blade from `at` along `dir`, its face toward `up`: `shape(u)` its half-width (0 … 1 of `width`) from base to
	* tip; `fold` lifts its edges (a V along the midrib), `droop` bends its tip down, `twin` makes it two faces bulging
	* apart along the midrib — a pod, a spikelet (one folded face at the lowest detail).
	* @param {{
	*   at: THREE.Vector3, dir: THREE.Vector3, up?: THREE.Vector3, length: number, width: number, shape: (u: number) => number,
	*   segs: number, paint: THREE.ColorRepresentation | ((u: number, v: number) => THREE.ColorRepresentation),
	*   fold?: number, droop?: number, twin?: number, round?: boolean, keep?: boolean
	* }} o — `round` grows it as a bead is when thinned (less), `keep` never thins it
	*/
	add(o) {
		const s = o.keep ? 1 : this.keep(Math.max(o.length, o.width * 2), o.round);
		if (!s) return;
		const L = o.length * s, W = o.width * s;
		const X = o.dir.clone().normalize();
		let Z = new three.Vector3().crossVectors(X, o.up ?? UP);
		if (Z.lengthSq() < 1e-8) Z = new three.Vector3().crossVectors(X, Math.abs(X.y) < .9 ? UP : v3(1, 0, 0));
		Z.normalize();
		const Y = new three.Vector3().crossVectors(Z, X);
		const n = DETAIL.level >= 1 ? o.segs : Math.max(1, Math.round(o.segs * DETAIL.level));
		const { shape, at } = o;
		const droop = o.droop ?? 0, twin = o.twin ?? 0;
		const faces = twin && n > 1 ? [1, -1] : [1];
		const fold = (o.fold ?? 0) + (twin && n <= 1 ? twin : 0);
		const paint = typeof o.paint === "function" ? o.paint : () => o.paint;
		const place = (u, v, f) => {
			const w = W * shape(u);
			const lift = w * (fold * Math.abs(v) + (faces.length > 1 ? f * twin : 0) * (1 - Math.abs(v)));
			return v3(at.x + X.x * u * L + Z.x * w * v + Y.x * lift, at.y + X.y * u * L + Z.y * w * v + Y.y * lift - droop * L * u * u, at.z + X.z * u * L + Z.z * w * v + Y.z * lift);
		};
		if (n === 1 && shape(0) < 1e-6 && shape(1) < 1e-6) {
			const b = this.vert(place(0, 0, 1), paint(0, 0)), t = this.vert(place(1, 0, 1), paint(1, 0));
			const l = this.vert(place(.45, -1, 1), paint(.45, -1)), r = this.vert(place(.45, 1, 1), paint(.45, 1));
			this.idx.push(b, l, t, b, t, r);
			return;
		}
		for (const f of faces) {
			/** @type {number[][]} each row's left edge, midrib, right edge */
			const rows = [];
			const wide = [];
			for (let i = 0; i <= n; i++) {
				const u = i / n;
				wide.push(shape(u) > 1e-6);
				rows.push([
					-1,
					0,
					1
				].map((v) => this.vert(place(u, v, f), paint(u, v))));
			}
			for (let i = 0; i < n; i++) for (const e of [0, 2]) {
				const a = rows[i][1], b = rows[i][e], c = rows[i + 1][1], d = rows[i + 1][e];
				if (wide[i]) this.idx.push(a, b, d);
				if (wide[i + 1]) this.idx.push(a, d, c);
			}
		}
	}
	/**
	* A flat ribbon along a path, `width` wide, lying across `side` — a fine stalk as a world sees it from metres away.
	* @param {THREE.Vector3[]} pts @param {number} width @param {(u: number) => THREE.ColorRepresentation} paint @param {THREE.Vector3} [side]
	*/
	strip(pts, width, paint, side = v3(1, 0, 0)) {
		if (DETAIL.level < 1) {
			const every = Math.max(1, Math.round(1 / DETAIL.level));
			if (every > 1 && pts.length > 2) pts = pts.filter((_, i) => i % every === 0 || i === pts.length - 1);
		}
		const n = pts.length;
		if (n < 2) return;
		let first = -1;
		for (let i = 0; i < n; i++) {
			const t = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]);
			let across = new three.Vector3().crossVectors(t, side);
			if (across.lengthSq() < 1e-12) across = new three.Vector3().crossVectors(t, v3(0, 0, 1));
			if (across.lengthSq() < 1e-12) across = v3(1, 0, 0);
			across.normalize().multiplyScalar(width / 2 * (1 - .4 * (i / (n - 1))));
			const c = paint(i / (n - 1));
			const a = this.vert(pts[i].clone().add(across), c);
			this.vert(pts[i].clone().sub(across), c);
			if (first < 0) first = a;
			if (i) this.idx.push(a - 2, a - 1, a, a, a - 1, a + 1);
		}
	}
	/** how far it has got: where what is drawn next begins (see `pick`) */
	mark() {
		return {
			v: this.pos.length / 3,
			i: this.idx.length
		};
	}
	/**
	* What was drawn here since `from` (a `mark()`), as a piece of the fruit `bag` is drawing (Bag.fruit): the bag
	* only sees what goes through its own `add`, and blades go into it whole at the end. The piece is made only when
	* asked for (the fruit viewer, `pickFruit`), so it costs next to nothing otherwise.
	* @param {Bag} bag @param {{ v: number, i: number }} from
	*/
	pick(bag, from) {
		const fruit = bag.drawing;
		if (!fruit || this.idx.length === from.i) return;
		const v1 = this.pos.length / 3, i1 = this.idx.length;
		const { pos, col, idx } = this;
		/** @type {THREE.BufferGeometry | null} */
		let made = null;
		fruit.parts.push({
			kind: "sheet",
			get geometry() {
				if (made) return made;
				made = new three.BufferGeometry();
				made.setAttribute("position", new three.Float32BufferAttribute(pos.slice(from.v * 3, v1 * 3), 3));
				made.setAttribute("uv", new three.Float32BufferAttribute(new Float32Array((v1 - from.v) * 2), 2));
				made.setAttribute("color", new three.Float32BufferAttribute(col.slice(from.v * 3, v1 * 3), 3));
				made.setIndex(idx.slice(from.i, i1).map((k) => k - from.v));
				made.computeVertexNormals();
				return made;
			}
		});
	}
	/** into the bag, as one piece of its sheets (past the bag's own thinning: it is thinned here) */
	into(bag) {
		if (!this.idx.length) return;
//#piece cd0c5b3e4e2a2fc878c692a1b3cf33daa4d975d7c6e78b18e646c5a883586663
		geo.setAttribute("uv", new three.Float32BufferAttribute(new Float32Array(n * 2), 2));
		geo.setAttribute("color", new three.Float32BufferAttribute(this.col, 3));
		geo.setIndex(this.idx);
		geo.computeVertexNormals();
		bag.parts.sheet.push(geo);
