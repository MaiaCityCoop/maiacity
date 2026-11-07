// The piece "Asset kit (kit.js)", version 2: below its requires, the text of the copy in Pickup v1 and Power Cube v3 (src/lib/assets/kit.js): v1 and the lines it adds (LAYER_FX, smoothstep, Flow), as it was.
const three = require("three");
const { clamp, rng } = require("2e17ebde03995c8624aa6d4e45aabf54df6b23089c309586330793b8c4a15e70");
const LAYER_FX = 1;
const smoothstep = (a, b, x) => {
	const t = clamp((x - a) / (b - a));
	return t * t * (3 - 2 * t);
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
module.exports = { ...require("2e17ebde03995c8624aa6d4e45aabf54df6b23089c309586330793b8c4a15e70"), LAYER_FX, smoothstep, Flow };
