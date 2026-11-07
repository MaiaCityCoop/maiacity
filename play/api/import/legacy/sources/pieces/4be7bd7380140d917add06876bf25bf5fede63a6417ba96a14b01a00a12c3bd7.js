};
/** its weights on the stand-in's bones by where a point is: the head wholly down to the line under the jaw and the
*  chin (JAW), so the jaw turns with the face; below it the neck takes over within 5 cm; the chest where the neck goes
*  into the shirt. Before v8 the line ran straight from under the chin to the skull's foot, and the jaw's underside
*  hung on the neck, sheared from the face when the head turned. @param {THREE.Vector3} p @param {number} [v]
*  @returns {[string, number][]} */
function headWeights(p, v = 10) {
	const line = v >= 8 ? jawAt(p.z) : 1.606 - .36 * p.z;
	const head = v >= 8 ? smooth(line - .05, line, p.y) : smooth(line - .016, line + .018, p.y), chest = smooth(1.53, 1.49, p.y);
	const neck = Math.max(0, 1 - head - chest);
	return [
		["head", head],
		["neck", neck],
		["chest", chest]
	].filter(([, x]) => x > 0);
}
/** a strand's offsets in the smile: those of the skin it grows from, the same along it @param {Float32Array} joy
*  @param {number[]} tri @param {number[]} bary @param {number} count */
const follow = (joy, tri, bary, count) => {
	const d = [
		0,
		1,
		2
	].map((c) => tri.reduce((sum, i, k) => sum + joy[i * 3 + c] * bary[k], 0));
	return Float32Array.from({ length: count * 3 }, (_, k) => d[k % 3]);
};
/** a hair as a thin ribbon: from `root` along `dir`, curling towards `curl`, `len` long and `wid` wide at its root,
*  narrowing to its tip, its flat towards `face` @param {number[]} pos @param {number[]} idx
*  @param {THREE.Vector3} root @param {THREE.Vector3} dir @param {THREE.Vector3} curl @param {THREE.Vector3} face
*  @param {number} len @param {number} wid @param {number} [segs] */
function strand(pos, idx, root, dir, curl, face, len, wid, segs = 3) {
	const base = pos.length / 3, side = new three.Vector3().crossVectors(face, dir).normalize();
	const p = root.clone(), d = dir.clone();
	for (let k = 0; k <= segs; k++) {
		const ww = wid * (1 - .85 * (k / segs));
		pos.push(p.x + side.x * ww, p.y + side.y * ww, p.z + side.z * ww, p.x - side.x * ww, p.y - side.y * ww, p.z - side.z * ww);
		if (k) idx.push(base + 2 * k - 2, base + 2 * k - 1, base + 2 * k, base + 2 * k - 1, base + 2 * k + 1, base + 2 * k);
		p.addScaledVector(d, len / segs);
		d.addScaledVector(curl, 1 / segs).normalize();
	}
	return segs * 2 + 2;
}
/**
* The head's pieces for a look: the skin (its neck weighted onto the stand-in's neck and chest, its smile as the
* morph `joy` and from v9 its friendly gaze as the morph `friendly`), its eyes, lashes, teeth, tongue, brows and hair.
* Its catchlights from v9 take the material at index 3 (CATCHLIGHT).
* @param {{ skin: string, lips: string, brows: string, iris: string, hair: string, hairColour: string, face?: Face }} k
* @param {number} [ver] the stand-in's version it is built at (its smile, SMILES; its weights, headWeights)
* @returns {Piece[]}
*/
function headPieces(k, ver = 10) {
	const h = headOf(k.face ?? "man", ver);
	const weights = (p) => headWeights(p, ver);
	const kind = ver >= 9;
	const { skin, E } = h;
	const P = skin.geo.attributes.position, m = skin.n;
	const base = new three.Color(k.skin), lips = new three.Color(k.lips), warm = base.clone().multiply(new three.Color(1, .82, .78));
	const brow = new three.Color(k.brows), hairC = new three.Color(k.hairColour), mouth = new three.Color("#6e2a2e"), deep = new three.Color("#1c0a0b");
	const socketC = base.clone().lerp(new three.Color("#c77f7a"), .55);
	const v = new three.Vector3();
	const spot = (p, x, y, z, r) => Math.exp(-((p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2) / (r * r));
	const bald = k.hair === "none";
	const colours = Array.from({ length: m }, (_, i) => {
		v.fromBufferAttribute(P, i);
		const c = base.clone();
		const cheeks = spot(v, E.x * 1.5, E.y - .032, E.z, .024) + spot(v, -E.x * 1.5, E.y - .032, E.z, .024);
		const nose = spot(v, h.tip.x, h.tip.y, h.tip.z, .011) + .6 * (spot(v, .016, h.tip.y + .004, h.tip.z - .016, .008) + spot(v, -.016, h.tip.y + .004, h.tip.z - .016, .008));
		c.lerp(warm, Math.min(.6, .4 * cheeks + .45 * nose + .45 * h.ears[i]));
		const across = Math.abs(v.x) / (h.mouth.w * 1.05);
		if (across < 1 && v.z > h.mouth.z - .015 && h.inside[i] < .5) {
			const up = .0072 * Math.pow(1 - across * across, .55) - .001 * Math.exp(-((v.x / .0035) ** 2)) + 6e-4 * Math.exp(-(((Math.abs(v.x) - .0055) / .003) ** 2));
			const low = .0095 * Math.pow(1 - Math.pow(across, 1.8), .6), d = v.y - h.mouth.y;
			c.lerp(lips, .75 * (d >= 0 ? smooth(up + 6e-4, up - 6e-4, d) : smooth(-low - 8e-4, -low + 8e-4, d)));
		}
		if (h.inside[i] > .01) c.lerp(mouth.clone().lerp(deep, smooth(.003, .018, h.mouth.z - v.z)), Math.min(1, h.inside[i] * 1.2));
		if (h.socket[i] > .01) c.lerp(socketC, Math.min(1, h.socket[i] * 1.3));
		if (!bald) c.lerp(hairC, .45 * smooth(-.005, .002, h.hairF[i]) + .55 * smooth(.002, .004, h.hairF[i]));
		for (const sx of [-1, 1]) c.lerp(brow, .3 * spot(v, sx * E.x * 1.12, E.y + .0235, v.z, .011) * smooth(.007, .002, Math.abs(v.y - E.y - .0235 - .002 * Math.sin(Math.PI * Math.min(1, Math.abs(v.x) / (E.x * 2))))));
		for (const sx of [-1, 1]) c.multiplyScalar(1 - .07 * spot(v, sx * E.x * 1.05, E.y - .016, v.z, .012) - .06 * spot(v, sx * E.x, E.y + .011, v.z, .01));
		c.multiplyScalar(1 - Math.min(.5, Math.max(0, h.hollow[i] * 2.4)));
		return c;
	});
	/** @type {Piece[]} */
	const out = [{
		geo: skin.geo.clone(),
		color: (_p, i = 0) => colours[i],
		weights,
		morph: kind ? {
			joy: skin.joy,
			friendly: h.friendly
		} : { joy: skin.joy }
	}];
	const iris = new three.Color(k.iris), rim = iris.clone().multiplyScalar(.5), inner = iris.clone().lerp(new three.Color("#c9a25a"), .25);
	const white = new three.Color("#f2eee8"), edge = new three.Color("#d9c4bc");
	for (const side of ["l", "r"]) {
		const e = h.eyes[side], R = e.r * .97, c = new three.Vector3(...e.at).add(new three.Vector3(0, 0, -.0012));
		const front = new three.Vector3(0, 0, 1);
		const cap = (r, half, seg = 32) => {
			const g = new three.SphereGeometry(r, seg, Math.max(4, Math.round(seg * half / Math.PI)), 0, Math.PI * 2, 0, half);
			g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), front));
			return g.translate(c.x, c.y, c.z);
		};
		const off = (p) => Math.acos(Math.min(1, Math.max(-1, (p.z - c.z) / Math.max(1e-6, p.distanceTo(c)))));
		out.push({
			geo: cap(R, Math.PI),
			color: (p) => white.clone().lerp(edge, smooth(.6, 1.3, off(p))),
			bone: "head",
			mat: 1
		}, {
			geo: cap(R + 12e-5, .5, 40),
			color: (p) => rim.clone().lerp(iris, smooth(.5, .4, off(p))).lerp(inner, .6 * smooth(.28, .18, off(p))),
			bone: "head",
			mat: 1
		}, {
			geo: cap(R + 2e-4, .175, 24),
			color: "#0b0908",
			bone: "head",
			mat: 1
		});
		if (!kind) {
			const glint = new three.SphereGeometry(1, 8, 6).scale(8e-4, 8e-4, 4e-4).translate(...new three.Vector3(-.3, .35, .88).normalize().multiplyScalar(R + 3e-4).add(c).toArray());
			out.push({
				geo: glint,
				color: "#ffffff",
				bone: "head",
				mat: 1
			});
			continue;
		}
		const at = new three.Vector3(...CATCH.at).normalize(), turn = new three.Quaternion().setFromUnitVectors(front, at);
		const disc = (r, lift) => new three.CircleGeometry(r, 24).applyQuaternion(turn).translate(...at.clone().multiplyScalar(R + lift).add(c).toArray());
		out.push({
			geo: disc(CATCH.soft / 2, 3e-4),
			color: `#${inner.clone().lerp(white, .55).getHexString()}`,
			bone: "head",
			mat: 1
		}, {
			geo: disc(CATCH.core / 2, 4e-4),
			color: "#ffffff",
			bone: "head",
			mat: 3
		});
	}
