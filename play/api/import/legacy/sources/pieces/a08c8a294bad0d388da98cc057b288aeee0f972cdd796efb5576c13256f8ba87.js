	/** @param {THREE.BufferGeometry} tpl @param {THREE.Matrix4} m @param {THREE.Color} colour */
	stamp(tpl, m, colour) {
		if (DETAIL.thin < 1) {
			this.kept += DETAIL.thin;
			if (this.kept < 1) return;
			this.kept -= 1;
			const grow = Math.min(1.8, 1 / Math.sqrt(DETAIL.thin));
			m = m.clone().multiply(new three.Matrix4().makeScale(grow, grow, grow));
		}
		const e = m.elements;
		const P = tpl.attributes.position.array, N = tpl.attributes.normal.array;
		const C = tpl.attributes.color.array, U = tpl.attributes.uv.array;
		const I = tpl.index.array;
		const nv = P.length / 3;
		this.room(nv, I.length);
		const base = this.verts;
		const pos = this.pos, nor = this.nor, col = this.col;
		for (let i = 0, o = base * 3; i < P.length; i += 3, o += 3) {
			const x = P[i], y = P[i + 1], z = P[i + 2];
			pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
			pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
			pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
			const a = N[i], b = N[i + 1], c = N[i + 2];
			const nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
			const l = Math.hypot(nx, ny, nz) || 1;
			nor[o] = nx / l;
			nor[o + 1] = ny / l;
			nor[o + 2] = nz / l;
			col[o] = C[i] * colour.r;
			col[o + 1] = C[i + 1] * colour.g;
			col[o + 2] = C[i + 2] * colour.b;
		}
		this.uv.set(U, base * 2);
		for (let i = 0; i < I.length; i++) this.idx[this.tris + i] = I[i] + base;
		this.verts += nv;
		this.tris += I.length;
	}
	/** the leaves into the bag, among its sheets (as they are: already thinned) @param {Bag} bag */
	into(bag) {
		if (!this.tris) return;
		const g = new three.BufferGeometry();
		g.setAttribute("position", new three.BufferAttribute(this.pos.slice(0, this.verts * 3), 3));
		g.setAttribute("normal", new three.BufferAttribute(this.nor.slice(0, this.verts * 3), 3));
		g.setAttribute("uv", new three.BufferAttribute(this.uv.slice(0, this.verts * 2), 2));
		g.setAttribute("color", new three.BufferAttribute(this.col.slice(0, this.verts * 3), 3));
		g.setIndex(new three.BufferAttribute(this.idx.slice(0, this.tris), 1));
		bag.parts.sheet.push(g);
	}
};
/** a shade: the leaf's colour lighter or darker, or warmer (the stalk, the midrib) */
const shade = (r, g = r, b = r) => new three.Color(r, g, b);
/**
* A simple leaf: its stalk, then its blade, bowed down at the tip — a few rows only, for a crown of thousands (cupped,
* and its midrib paler, with `across` 2). The blade
* can be set back over the stalk's end (`back`, parts of its length), so a heart-shaped base wraps round it.
* @param {{ stalk: number, length: number, width: number, shape: (u: number) => number, back?: number, cup?: number, bow?: number, along: number, across?: number, cross?: boolean }} o
*/
function simpleLeaf(o) {
	const parts = [];
	if (o.stalk > 0) parts.push(sheet({
		length: o.stalk,
		width: .0012,
		shape: () => 1,
		paint: () => shade(1.05, 1.05, .7),
		along: 1,
		across: 1
	}));
	const blade = sheet({
		length: o.length,
		width: o.width,
		shape: o.shape,
		lift: (u, v) => (o.cup ?? .05) * v * v - (o.bow ?? .08) * u * u,
		paint: (u, v) => Math.abs(v) < .2 ? shade(1.18, 1.2, 1) : shade(lerp(1.06, .92, u)),
		along: o.along,
		across: o.across ?? 1
	});
	blade.translate(o.stalk - (o.back ?? 0) * o.length, 0, 0);
	parts.push(blade);
	if (o.cross) parts.push(blade.clone().rotateX(Math.PI / 2));
	return template(parts);
}
/**
* The walnut's leaf: a long arching rachis, its leaflets in pairs growing larger toward the tip, and one at the end
* (`wide`, how broad a leaflet is for its length: the walnut's long, the pecan's longer still).
* @param {number} length the rachis @param {number} pairs @param {number} [wide]
*/
function pinnateLeaf(length, pairs, wide = .24) {
	const parts = [];
	const bow = (u) => -.16 * u * u * length;
	parts.push(sheet({
		length,
		width: .0028,
		shape: (u) => 1 - .5 * u,
		lift: (u) => -.16 * u * u,
		paint: () => shade(1.1, 1.08, .75),
		along: 2,
		across: 1
	}));
	const leaflet = (u, len, side) => {
		const x = u * length, slope = -.32 * u;
		const turn = side === 0 ? 0 : side * .95;
		const d = v3(Math.cos(turn), slope + (side ? -.05 : 0), Math.sin(turn)).normalize();
		const blade = sheet({
			length: len,
			width: len * wide,
			shape: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, .85)), .6) * (t < .05 ? t / .05 : 1),
			lift: (t) => -.06 * t * t,
			paint: () => shade(side > 0 ? 1.04 : side < 0 ? .96 : 1.08),
			along: 3,
			across: 1
		});
		blade.applyMatrix4(aim(v3(x, bow(u), 0), d, side * .25));
		parts.push(blade);
	};
	for (let k = 0; k < pairs; k++) {
		const u = .38 + .5 * k / Math.max(1, pairs - 1);
		const len = length * (.27 + .1 * (k / Math.max(1, pairs - 1)));
		leaflet(u, len, 1);
		leaflet(u + .03, len, -1);
	}
	leaflet(1, length * .4, 0);
	return template(parts);
}
/**
* Where the nuts and flowers already hang, for the leaves to keep out of: balls in a coarse grid, quick to ask.
*/
var Clear = class {
	constructor() {
		/** @type {Map<number, { c: THREE.Vector3, r: number }[]>} */
		this.cells = /* @__PURE__ */ new Map();
		this.size = .3;
	}
	/** @param {number} x @param {number} y @param {number} z */
	key(x, y, z) {
		return ((Math.floor(x / this.size) + 512) * 1024 + Math.floor(y / this.size) + 512) * 1024 + Math.floor(z / this.size) + 512;
	}
