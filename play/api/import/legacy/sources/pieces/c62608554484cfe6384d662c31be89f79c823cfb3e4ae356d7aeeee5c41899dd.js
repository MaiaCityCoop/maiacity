	geo.setAttribute("color", new three.BufferAttribute(col, 3));
	return geo;
}
/** the pieces as one mesh @param {THREE.BufferGeometry[]} geos */
function one(geos) {
	const g = new three.Group();
	const mesh = new three.Mesh((0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos), material());
	mesh.receiveShadow = true;
	g.add(mesh);
	return g;
}
const col = (h) => new three.Color(h);
/**
* A blade (or a stem, a leaf on a stalk): a strip from its foot out along `dir`, bending over by `bend` towards its
* tip, `w` wide at its foot and narrowing to a point; dark at its foot, `tip` at its tip.
* @param {THREE.Vector3} foot @param {THREE.Vector3} dir @param {number} len @param {number} w @param {number} bend
* @param {THREE.Color} base @param {THREE.Color} tip
*/
function blade(foot, dir, len, w, bend, base, tip) {
	const segs = 4, pos = [];
	const up = dir.clone().normalize(), side = new three.Vector3(0, 1, 0).cross(up);
	if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
	side.normalize();
	const out = new three.Vector3(up.x, 0, up.z);
	if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
	out.normalize();
	const pts = [];
	for (let i = 0; i <= segs; i++) {
		const t = i / segs;
		pts.push(foot.clone().addScaledVector(up, len * t).addScaledVector(out, len * bend * t * t).addScaledVector(new three.Vector3(0, 1, 0), -len * bend * .6 * t * t));
	}
	/** @type {number[]} */
	const cols = [];
	for (let i = 0; i < segs; i++) {
		const t0 = i / segs, t1 = (i + 1) / segs;
		const w0 = w * (1 - t0), w1 = w * (1 - t1);
		const a = pts[i], b = pts[i + 1];
		const q = [
			a.clone().addScaledVector(side, -w0 / 2),
			a.clone().addScaledVector(side, w0 / 2),
			b.clone().addScaledVector(side, w1 / 2),
			b.clone().addScaledVector(side, -w1 / 2)
		];
		for (const [p, t] of [
			[q[0], t0],
			[q[1], t0],
			[q[2], t1],
			[q[0], t0],
			[q[2], t1],
			[q[3], t1]
		]) {
			pos.push(p.x, p.y, p.z);
			const c = base.clone().lerp(tip, t);
			cols.push(c.r, c.g, c.b);
		}
	}
//#piece 60a6ac3338545883b3b63e9d4eb68e2d3ea54483ff4871e88c50f5dff406aa13
	g.setAttribute("color", new three.Float32BufferAttribute(cols, 3));
	g.computeVertexNormals();
	return g;
}
/** A clump of grass: 16–24 blades fanning out of one foot, some bent over, a few gone straw at the tip. */
function grassClump(seed, h) {
	const r = rng(seed), geos = [];
	const greens = [
		"#3d6a2a",
		"#4a7a30",
		"#56883a",
		"#2f5a24"
	].map(col);
	const n = 16 + Math.floor(r() * 9);
	for (let i = 0; i < n; i++) {
		const a = r() * Math.PI * 2, lean = .15 + r() * .45;
		const dir = new three.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean);
		const len = h * (.55 + r() * .5);
		const base = greens[Math.floor(r() * greens.length)];
		const tip = r() < .18 ? col("#b8a868") : base.clone().offsetHSL(.01, .02, .12);
		geos.push(blade(new three.Vector3((r() - .5) * .05, 0, (r() - .5) * .05), dir, len, .006 + r() * .004, .15 + r() * .45, base.clone().multiplyScalar(.6), tip));
	}
	for (let i = 0; i < (r() < .5 ? 2 : 0); i++) {
		const a = r() * Math.PI * 2;
		const foot = new three.Vector3(0, 0, 0), dir = new three.Vector3(Math.cos(a) * .12, 1, Math.sin(a) * .12);
		geos.push(blade(foot, dir, h * 1.35, .003, .05, col("#4a6a2c"), col("#8a8a4a")));
		const head = new three.ConeGeometry(.008, .05, 5).translate(Math.cos(a) * .12 * h * 1.3, h * 1.35, Math.sin(a) * .12 * h * 1.3);
		geos.push(paint(head, col("#a39a5a")));
	}
	return one(geos);
}
/** A cushion of moss: a few small lumpy domes run together, low and soft-edged, dark in its hollows and bright where
*  the light catches it, a scatter of its stalks with their capsules. */
function mossCushion(seed) {
	const r = rng(seed), geos = [];
	const n = 3 + Math.floor(r() * 4);
	const tone = r();
	for (let i = 0; i < n; i++) {
		const g = new three.IcosahedronGeometry(1, 2);
		const p = g.attributes.position, v = new three.Vector3();
		const ph = r() * 10;
		for (let k = 0; k < p.count; k++) {
			v.fromBufferAttribute(p, k);
			const bump = 1 + .18 * Math.sin(v.x * 7 + ph) * Math.sin(v.z * 6 + ph * 1.3) + .08 * Math.sin(v.x * 19 + v.z * 17 + ph);
			p.setXYZ(k, v.x * bump, Math.max(-.15, v.y) * bump, v.z * bump);
		}
		const rad = .035 + r() * .07;
		g.scale(rad, rad * (.35 + r() * .2), rad * (.8 + r() * .4));
		g.translate((r() - .5) * .16, 0, (r() - .5) * .16);
		const light = col(tone < .5 ? "#6f9a34" : "#7f9a3e"), dark = col("#2c4416");
		geos.push(paint(g, (q) => dark.clone().lerp(light, Math.min(1, Math.max(0, q.y / (rad * .32))) * (.65 + .35 * Math.sin(q.x * 140 + q.z * 110)))));
	}
	for (let i = 0; i < 8; i++) {
		const x = (r() - .5) * .18, z = (r() - .5) * .18;
		geos.push(blade(new three.Vector3(x, .012, z), new three.Vector3(0, 1, 0), .025, .0015, .2, col("#8a6a2a"), col("#c89a4a")));
	}
	return one(geos);
}
/** @typedef {'daisy' | 'buttercup' | 'clover' | 'forgetmenot' | 'anemone' | 'cranesbill'} Flower */
/** @type {Record<Flower, { petals: number, colour: string, eye: string, r: number, h: [number, number], heads: [number, number], leaf: string, ball?: boolean, cluster?: boolean }>} */
const FLOWERS = {
	daisy: {
		petals: 14,
		colour: "#f6f3ea",
		eye: "#f2c230",
		r: .014,
		h: [.05, .1],
		heads: [3, 6],
		leaf: "#4f7a34"
	},
	buttercup: {
		petals: 5,
		colour: "#f3cf26",
		eye: "#d8a81a",
		r: .013,
		h: [.18, .35],
		heads: [3, 7],
		leaf: "#3f6a2a"
	},
	clover: {
		petals: 0,
		colour: "#c7638a",
		eye: "#a84a72",
		r: .011,
		h: [.06, .12],
		heads: [3, 6],
		leaf: "#4a7a30",
		ball: true
	},
	forgetmenot: {
		petals: 5,
		colour: "#6f9fe0",
		eye: "#f2dc6a",
		r: .0045,
		h: [.12, .22],
		heads: [4, 7],
		leaf: "#4a7432",
		cluster: true
	},
	anemone: {
		petals: 6,
		colour: "#f4f1f4",
		eye: "#e8c84a",
		r: .016,
		h: [.1, .18],
		heads: [2, 5],
		leaf: "#3c6a2c"
	},
	cranesbill: {
		petals: 5,
		colour: "#a06ac2",
		eye: "#e2d6ea",
		r: .014,
		h: [.2, .38],
		heads: [3, 6],
		leaf: "#3f6a2e"
	}
};
/** A flower head facing up at `at`: its petals round its eye (or a ball of florets, a red clover's). */
function head(at, kind, r) {
	const f = FLOWERS[kind], geos = [];
	if (f.ball) {
		geos.push(paint(new three.IcosahedronGeometry(f.r, 0).scale(1, 1.15, 1).translate(at.x, at.y + f.r, at.z), (q) => col(f.colour).lerp(col(f.eye), Math.max(0, (at.y + f.r - q.y) / (f.r * 2)))));
		return geos;
	}
