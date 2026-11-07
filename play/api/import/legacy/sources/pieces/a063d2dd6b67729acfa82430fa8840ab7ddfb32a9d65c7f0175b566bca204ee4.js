	for (const upper of [true, false]) {
		const t = h.parts[upper ? "teeth-upper" : "teeth-lower"];
		t.geo.computeBoundingBox();
		const box = t.geo.boundingBox, front = box.max.z;
		out.push({
			geo: t.geo.clone(),
			color: (p) => teeth(p, upper, upper ? box.min.y : box.max.y, front, ver),
			weights,
			morph: { joy: t.joy },
			mat: 1
		});
	}
	out.push({
		geo: h.parts.tongue.geo.clone().translate(0, -.009, -.008),
		color: "#6c3036",
		weights,
		morph: { joy: h.parts.tongue.joy }
	});
	return out;
}
const ENAMEL = /* @__PURE__ */ (() => new three.Color("#efe9dc"))();
const GAP = /* @__PURE__ */ (() => new three.Color("#7d7268"))();
const GUM = /* @__PURE__ */ (() => new three.Color("#c2706e"))();
const BACK = /* @__PURE__ */ (() => new three.Color("#5a4c48"))();
/** where one tooth meets the next, from the middle out, seen from the front (m): incisors, canines, premolars */
const TEETH = [
	0,
	.0082,
	.0142,
	.0195,
	.0238,
	.0276,
	.0312
];
/** from v10 the two molars behind them too, turning back along the arch (seen from the front they are narrow): the
*  teeth reach 35.8 mm out, and past the premolars' 31.2 mm the table had no tooth, so 350 points of the stand-in's
*  teeth took no colour at all (NaN) */
const TEETH_V10 = /* @__PURE__ */ (() => [
	...TEETH,
	.0338,
	.0362
])();
/** a tooth's colour at p: enamel, a thin dark line between teeth, the gums past each crown, darker further back
*  @param {THREE.Vector3} p @param {boolean} upper @param {number} edge the biting edge's height @param {number} front
*  @param {number} ver the stand-in's version (before v10 the molars are left as they were built: uncoloured) */
function teeth(p, upper, edge, front, ver) {
	const x = Math.abs(p.x), T = ver >= 10 ? TEETH_V10 : TEETH;
	let k = 1;
	while (k < T.length - 1 && x > T[k]) k++;
	const a = T[k - 1], b = T[k], at = (x - a) / (b - a);
	const u = ver >= 10 ? Math.min(1, Math.max(0, at)) : at;
	const crown = (upper ? .0098 : .0105) * (k > 2 ? .92 : 1) - .0012 * (1 - Math.sqrt(Math.sin(Math.PI * u)));
	const up = upper ? p.y - edge : edge - p.y;
	const c = ENAMEL.clone().lerp(GAP, .75 * smooth(.1, 0, Math.min(u, 1 - u)));
	c.lerp(GUM, smooth(crown - 5e-4, crown + 7e-4, up));
	c.lerp(BACK, smooth(.012, .04, front - p.z));
	if (ver < 10 && !(Number.isFinite(c.r) && Number.isFinite(c.g) && Number.isFinite(c.b))) c.setRGB(0, 0, 0);
	return c;
}
/** a little random, the same each time @param {number} seed */
const rng = (seed) => () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
/** the lashes: single hairs along each upper lid's edge — where the lid, seen from the front, stops covering the
*  eye — long in the middle, curling up; they move with the lid in the smile (and from v9, `kind`, in the friendly
*  gaze) @param {ReturnType<typeof build>} h @param {boolean} [kind] @returns {Piece[]} */
function lashes(h, kind = false) {
	const pos = [], idx = [], joy = [], gaze = [];
	const rand = rng(5);
	for (const side of ["l", "r"]) {
		const e = h.eyes[side], R = e.r, [cx, cy, cz] = e.at, sx = Math.sign(cx);
		const ball = (x, y) => {
			const r2 = R * R - (x - cx) ** 2 - (y - cy) ** 2;
			return r2 > 0 ? cz + Math.sqrt(r2) : -Infinity;
		};
		const many = 70;
		for (let s = 0; s < many; s++) {
			const u = (s + rand() * .8) / many;
			const x = cx + sx * R * (-.92 + 1.95 * u);
			let edge = null, seen = false;
			for (let y = cy + R; y > cy - R * .4 && !seen; y -= 1e-4) {
				const at = h.surface(x, y);
				if (at && at.p.z < ball(x, y) - 2e-4) seen = true;
				else edge = at;
			}
			if (!edge || !seen) continue;
			const peak = Math.sin(Math.PI * Math.min(1, u * 1.05));
			const fan = (u - .5) * .9 * sx;
			const dir = new three.Vector3(fan, -.2, 1).normalize();
			const curl = new three.Vector3(fan * .3, 2, -.5);
			const len = .0035 + .0035 * peak + 8e-4 * rand();
			const face = new three.Vector3().crossVectors(dir, new three.Vector3(1, 0, 0)).normalize();
			const count = strand(pos, idx, edge.p.clone().add(new three.Vector3(0, 1e-4, 1e-4)), dir, curl, face, len, 11e-5 + 4e-5 * rand(), 5);
			joy.push(...follow(h.skin.joy, edge.tri, edge.bary, count));
			gaze.push(...follow(h.friendly, edge.tri, edge.bary, count));
		}
	}
//#piece 60a6ac3338545883b3b63e9d4eb68e2d3ea54483ff4871e88c50f5dff406aa13
	g.setIndex(idx);
	g.computeVertexNormals();
	return [{
		geo: g,
		color: "#1d1511",
		bone: "head",
		mat: 2,
		morph: kind ? {
			joy: new Float32Array(joy),
			friendly: new Float32Array(gaze)
		} : { joy: new Float32Array(joy) }
	}];
}
/** the brows: single hairs laid on the skin along each brow's arch, rising at the inner end and combed outwards along
*  it, thinning towards the tail; they move with the smile (and from v9, `kind`, the friendly gaze)
*  @param {ReturnType<typeof build>} h @param {string} colour @param {string} skinTone @param {boolean} [kind]
*  @returns {Piece[]} */
function brows(h, colour, skinTone, kind = false) {
	const { E } = h;
	const out = [];
	for (const sx of [-1, 1]) {
		const rand = rng(sx > 0 ? 7 : 11);
		const pos = [], idx = [], joy = [], gaze = [];
		for (let s = 0; s < 240; s++) {
			const u = Math.pow(rand(), .8);
			const x = sx * (E.x * .4 + E.x * 1.3 * u);
			const arch = E.y + .0215 + .005 * Math.sin(Math.PI * Math.min(1, u * 1.2)) - .0035 * u * u;
			const half = .0044 * (1 - .55 * u);
			const y = arch + (rand() * 2 - 1) * half;
			const at = h.surface(x, y);
			if (!at) continue;
			const turn = smooth(0, .35, u);
			const dir = new three.Vector3(sx * (.25 + .75 * turn), 1 - .8 * turn + (y > arch ? -.18 : .12) * turn, 0).normalize();
			dir.addScaledVector(at.n, -dir.dot(at.n)).normalize();
			const len = .0045 + .003 * rand() * (1 - .4 * u);
			const curl = at.n.clone().multiplyScalar(-.15);
			const count = strand(pos, idx, at.p.clone().addScaledVector(at.n, 25e-5), dir.clone().addScaledVector(at.n, .25).normalize(), curl, at.n, len, 2e-4);
			joy.push(...follow(h.skin.joy, at.tri, at.bary, count));
			gaze.push(...follow(h.friendly, at.tri, at.bary, count));
		}
//#piece be586a4c5f448c8e39493bfa55893651d6f69e3ba71fc8b6dbe6a582ee6e964b
		const c = new three.Color(colour).lerp(new three.Color(skinTone), .06);
		out.push({
			geo: g,
			color: `#${c.getHexString()}`,
			bone: "head",
			mat: 2,
			morph: kind ? {
				joy: new Float32Array(joy),
				friendly: new Float32Array(gaze)
			} : { joy: new Float32Array(joy) }
		});
	}
	return out;
}
/** the hair: a layer grown over the scalp from its line, thin at the line and fuller on top, its colour fading into
*  the skin's at the line; for `long` a fall down the back and sides, for `bun` a knot at the back of the crown
*  @param {ReturnType<typeof build>} h @param {{ hair: string, hairColour: string }} k
*  @returns {Piece[]} */
