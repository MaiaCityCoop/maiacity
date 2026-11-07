//#piece 392f5ec0836e3c8a133e13154fd33007e5edd77689dc7bb6cd9978231578ab7a
/** the tent's measures: the dome's radius and the deck's, how high the deck's top is, the tubes, the door; and the
*  parts of its pitching (setPitch: from, to) */
const DOME_TENT = {
	r: 2,
	deck: 2.8,
	deckTop: .15,
	tube: .01,
	door: {
		w: .9,
		h: 1.55,
		round: .28
	},
	floor: [0, .2],
	frame: [.2, .75],
	cover: [.75, .94],
	doorIn: [.94, 1]
};
/** the storage tent's measures: the dome tent's, twice the size (the deck as high), pitched in the same steps */
const STORAGE_TENT = /* @__PURE__ */ (() => ({
	...DOME_TENT,
	r: 4,
	deck: 5.6,
	tube: .02,
	door: {
		w: 1.8,
		h: 3.1,
		round: .56
	}
}))();
//#piece bb105e2a9696a7151c97a449ba10936eaff3baaaa4e4b41dd84dc190b9f6cbca
//#piece 70c6f38144430cec692b3bf08c84a296665e8c8ba3623b173ff573dd862fb25a
/** the deck's boards from above (the cylinder's cap: u, v across it): 14 cm larch boards, their joints staggered */
const deckTex = () => canvasTexture("dome-tent-deck", 512, 512, (x, r) => {
	const n = 40;
	const w = 512 / n;
	for (let i = 0; i < n; i++) {
		x.fillStyle = `hsl(31, 34%, ${52 + r() * 12}%)`;
		x.fillRect(i * w, 0, w, 512);
		x.fillStyle = "rgba(60,40,20,0.12)";
		for (let k = 0; k < 6; k++) x.fillRect(i * w + r() * w, 0, 1, 512);
		x.fillStyle = "rgba(40,26,12,0.55)";
		x.fillRect(i * w, 0, 1.4, 512);
		const j = r() * 512;
		x.fillRect(i * w, j, w, 1.4);
	}
});
/** the door's outline in the front view (x across, y up), counter-clockwise: from under the floor up its sides and
*  round its top corners */
function doorOutline({ w, h, round }) {
	const a = w / 2;
	const pts = [[-a, -.2], [a, -.2]];
	for (let i = 0; i <= 6; i++) {
		const t = i / 6 * (Math.PI / 2);
		pts.push([a - round + round * Math.cos(t), h - round + round * Math.sin(t)]);
	}
	for (let i = 0; i <= 6; i++) {
		const t = Math.PI / 2 + i / 6 * (Math.PI / 2);
		pts.push([-a + round + round * Math.cos(t), h - round + round * Math.sin(t)]);
	}
	return pts;
}
/** each tent's door outline, made once */
const outlines = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
const outlineOf = (T) => outlines.get(T) ?? (outlines.set(T, doorOutline(T.door)), outlines.get(T));
/** whether a point is in the doorway of a tent whose door's outline is O: in front, and inside it seen from the front */
function inDoor(p, O) {
	if (p.z <= 0) return false;
	for (let i = 0; i < O.length; i++) {
		const [ax, ay] = O[i];
		const [bx, by] = O[(i + 1) % O.length];
		if ((bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax) < 0) return false;
	}
	return true;
}
/** a point of the door's outline on the dome (x, y as seen from the front), pushed out to radius rr */
const onDome = (x, y, rr) => new three.Vector3(x, Math.max(0, y), Math.sqrt(Math.max(0, rr * rr - x * x - Math.max(0, y) ** 2)));
/** the hemisphere of a 4-frequency icosahedron of radius r, a hub at its top: its hubs, its tubes (each a pair of hub
*  indices), its faces (three hub indices), and the ring of each hub counted from the floor (0) up */
function net(r) {
	const ico = new three.IcosahedronGeometry(r, 3);
	const t = (1 + Math.sqrt(5)) / 2;
	ico.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(1, t, 0).normalize(), new three.Vector3(0, 1, 0)));
	const p = ico.attributes.position;
	let best = null;
	for (let i = 0; i < p.count; i++) {
		const y = p.getY(i) / r;
		if (Math.abs(y - .968) < .01) {
			const az = Math.atan2(p.getX(i), p.getZ(i));
			if (!best || Math.abs(az) < Math.abs(best)) best = az;
		}
	}
	ico.rotateY(-best);
	const hubs = [];
	const index = /* @__PURE__ */ new Map();
	const at = (i) => {
		const v = new three.Vector3(p.getX(i), p.getY(i), p.getZ(i));
		if (Math.abs(v.y) < 1e-4) v.y = 0;
		const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
		if (!index.has(key)) index.set(key, hubs.length), hubs.push(v);
		return index.get(key);
	};
	const faces = [];
	const tubes = /* @__PURE__ */ new Map();
	for (let i = 0; i < p.count; i += 3) {
		if (Math.min(p.getY(i), p.getY(i + 1), p.getY(i + 2)) < -1e-4 * r) continue;
		const f = [
			at(i),
			at(i + 1),
			at(i + 2)
		];
		faces.push(f);
		for (let k = 0; k < 3; k++) {
			const a = f[k], b = f[(k + 1) % 3];
			tubes.set(a < b ? `${a}:${b}` : `${b}:${a}`, a < b ? [a, b] : [b, a]);
		}
	}
	ico.dispose();
	const ring = hubs.map((v) => v.y === 0 ? 0 : -1);
	const next = hubs.map(() => []);
	for (const [a, b] of tubes.values()) next[a].push(b), next[b].push(a);
	for (let n = 0, grew = true; grew; n++) {
		grew = false;
		hubs.forEach((_, i) => {
			if (ring[i] !== n) return;
			for (const j of next[i]) if (ring[j] < 0) ring[j] = n + 1, grew = true;
		});
	}
	return {
		hubs,
		tubes: [...tubes.values()],
		faces,
		ring
	};
}
/** the parts of a tube a→b outside the doorway, each [from, to] along it (0 … 1) */
function outsideDoor(a, b, O) {
	const N = 40;
	const out = [];
	let from = null;
	for (let i = 0; i <= N; i++) {
		const t = i / N;
		const o = !inDoor(a.clone().lerp(b, t), O);
		if (o && from === null) from = t;
		if ((!o || i === N) && from !== null) {
			const to = o ? t : (i - .5) / N;
			if (to - from > .04) out.push([from, to]);
			from = null;
		}
	}
	return out;
}
/** a tube along a path, shown up to how far along it (count of its segments): for the door's frame and its zip */
function pathTube(pts, radius, mat) {
	const curve = new three.CatmullRomCurve3(pts, false, "centripetal");
	const segs = pts.length * 3;
	const geo = new three.TubeGeometry(curve, segs, radius, 6, false);
	const mesh = new three.Mesh(geo, mat);
	mesh.castShadow = true;
	const ys = Array.from({ length: segs + 1 }, (_, i) => curve.getPointAt(i / segs).y);
	/** shown up to the point where it first reaches past height y (rising), or a part of it (0 … 1) */
	mesh.userData.show = (k) => {
		const n = Math.round(clamp(k) * segs);
		geo.setDrawRange(0, n * 6 * 6);
		mesh.visible = n > 0;
	};
	mesh.userData.upTo = (y) => {
		let n = 0;
		while (n < segs && ys[n + 1] <= y + 1e-6) n++;
		mesh.userData.show(n / segs);
	};
	return mesh;
}
/** a convex polygon (front view) cut by one side of a line: keep where the side test is >= 0 (inside) or <= 0 */
function clipBy(poly, a, b, keepInside) {
	const s = (p) => ((b[0] - a[0]) * (p.y - a[1]) - (b[1] - a[1]) * (p.x - a[0])) * (keepInside ? 1 : -1);
	const out = [];
	for (let i = 0; i < poly.length; i++) {
		const p = poly[i], q = poly[(i + 1) % poly.length];
		const sp = s(p), sq = s(q);
		if (sp >= 0) out.push(p);
		if (sp >= 0 !== sq >= 0) out.push(p.clone().lerp(q, sp / (sp - sq)));
	}
	return out;
}
/** a small triangle split at the door's outline (front view): its parts outside the door, and its part in it */
function splitAtDoor(tri, T) {
	const O = outlineOf(T);
	if (tri.every((p) => p.z <= 0) || tri.every((p) => !inDoor(p, O) && Math.abs(p.x) > T.door.w)) return {
		out: [tri],
		in: []
	};
	const outside = [];
	let rest = tri;
	for (let i = 0; i < O.length && rest.length >= 3; i++) {
		const a = O[i], b = O[(i + 1) % O.length];
		const piece = clipBy(rest, a, b, false);
		if (piece.length >= 3) outside.push(piece);
		rest = clipBy(rest, a, b, true);
	}
	return {
		out: outside,
		in: rest.length >= 3 ? [rest] : []
	};
}
/** triangles (fans of polygons) into one geometry: a facet's own normal blended with the dome's, so its panels show
*  but it reads round; its order kept */
function panelGeometry(polys, rr, r) {
	const pos = [], nor = [];
	const n = new three.Vector3();
	for (const poly of polys) {
		n.copy(poly[1]).sub(poly[0]).cross(poly[2].clone().sub(poly[0])).normalize();
		for (let i = 1; i + 1 < poly.length; i++) for (const p of [
			poly[0],
			poly[i],
			poly[i + 1]
		]) {
			const q = p.clone().multiplyScalar(rr / r);
			pos.push(q.x, q.y, q.z);
			const b = n.clone().multiplyScalar(.6).addScaledVector(q.clone().normalize(), .4).normalize();
			nor.push(b.x, b.y, b.z);
		}
	}
	const geo = new three.BufferGeometry();
	geo.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
	geo.setAttribute("normal", new three.Float32BufferAttribute(nor, 3));
	return geo;
}
/**
* The Tribe COOP's dome tent, pitched as far as k (0 nothing, 1 pitched): setPitch(k) moves it on. userData: shell
* (the cover, its material warm when lit from within: emissiveIntensity), door (the door panel, of the same canvas),
* lamp (the light in it, off), deck, floor, frame ({ tubes, hubs, arch }), pitch (how far), setPitch, and work(k):
* where the work is at k, in the tent's frame (the groundsheet's roll, the tube going in, the cover's edge, the door).
*/
function domeTent({ pitch = 1, deck = true } = {}) {
	return pitched(DOME_TENT, {
		pitch,
		deck
	});
}
/** The storage tent (the dome tent twice the size), pitched as far as `pitch`: userData as domeTent's. */
function storageTent({ pitch = 1, deck = true } = {}) {
	return pitched(STORAGE_TENT, {
		pitch,
		deck
	});
}
/**
* A dome tent of the measures T (DOME_TENT, STORAGE_TENT), pitched as far as `pitch`: the frame, the cover, the door,
* the groundsheet and the lantern all at T's size (S: how many times the dome tent's), the deck as high as T says.
*/
function pitched(T, { pitch = 1, deck = true } = {}) {
	const { r, tube } = T;
	const S = r / DOME_TENT.r;
	const O = outlineOf(T);
	const g = new three.Group();
	const base = deck ? T.deckTop : 0;
	let deckMesh = null;
	if (deck) {
		const top = new three.MeshStandardMaterial({
			map: deckTex(),
			roughness: .85
		});
		deckMesh = new three.Mesh(new three.CylinderGeometry(T.deck, T.deck, .2, 48), [
			m.wood(),
			top,
			m.wood()
		]);
		deckMesh.position.y = base - .1;
		deckMesh.receiveShadow = deckMesh.castShadow = true;
		g.add(deckMesh);
	}
	const dome = new three.Group();
	dome.position.y = base + .004 + tube;
	g.add(dome);
	const { hubs, tubes, faces, ring } = net(r);
	const rings = Math.max(...ring) + 1;
	const ringY = Array.from({ length: rings }, (_, n) => Math.max(...hubs.filter((_, i) => ring[i] === n).map((v) => v.y)));
	const az = (v) => (Math.atan2(v.x, v.z) + Math.PI * 2) % (Math.PI * 2);
	const pieces = [];
	for (const [a, b] of tubes) {
		const [lo, hi] = hubs[a].y <= hubs[b].y ? [a, b] : [b, a];
		const along = ring[lo] === ring[hi];
		for (const [t0, t1] of outsideDoor(hubs[lo], hubs[hi], O)) {
			const p0 = hubs[lo].clone().lerp(hubs[hi], t0), p1 = hubs[lo].clone().lerp(hubs[hi], t1);
			pieces.push({
				p0,
				p1,
				ring: ring[hi],
				along,
				az: az(p0.clone().add(p1))
			});
		}
	}
	const kept = hubs.map((v, i) => ({
		v,
		i,
		ring: ring[i],
		az: az(v)
	})).filter((h) => !inDoor(h.v, O));
	const slot = 1 / rings;
	for (let n = 0; n < rings; n++) {
		const up = pieces.filter((s) => s.ring === n && !s.along).sort((a, b) => a.az - b.az);
		const al = pieces.filter((s) => s.ring === n && s.along).sort((a, b) => a.az - b.az);
		const hs = kept.filter((h) => h.ring === n).sort((a, b) => a.az - b.az);
		const t0 = n * slot;
		up.forEach((s, i) => (s.at = t0 + slot * .45 * (i / Math.max(1, up.length)), s.dur = slot * .2));
		hs.forEach((h, i) => (h.at = t0 + slot * (n === 0 ? 0 : .2) + slot * .45 * (i / Math.max(1, hs.length)), h.dur = slot * .08));
		al.forEach((s, i) => (s.at = t0 + slot * .5 + slot * .35 * (i / Math.max(1, al.length)), s.dur = slot * .15));
	}
	const tubeGeo = new three.CylinderGeometry(tube, tube, 1, 8, 1, true).translate(0, .5, 0);
	const tubeMesh = new three.InstancedMesh(tubeGeo, m.tube(), pieces.length);
	const hubGeo = new three.CylinderGeometry(.036 * S, .036 * S, .024 * S, 12);
	const hubMesh = new three.InstancedMesh(hubGeo, m.hub(), kept.length);
	tubeMesh.castShadow = hubMesh.castShadow = true;
	tubeMesh.frustumCulled = hubMesh.frustumCulled = false;
	dome.add(tubeMesh, hubMesh);
	const UP = new three.Vector3(0, 1, 0), mx = new three.Matrix4();
	new three.Quaternion();
	const s3 = new three.Vector3();
	for (const s of pieces) s.len = s.p0.distanceTo(s.p1), s.q = new three.Quaternion().setFromUnitVectors(UP, s.p1.clone().sub(s.p0).normalize());
	for (const h of kept) h.q = new three.Quaternion().setFromUnitVectors(UP, h.v.clone().normalize());
	const half = (sx, rr) => {
		const { w, h, round } = T.door;
		const a = w / 2;
		const pts = [];
		for (let i = 0; i <= 6; i++) pts.push([a, (h - round) * i / 6]);
		for (let i = 1; i <= 6; i++) pts.push([a - round + round * Math.cos(i / 6 * (Math.PI / 2)), h - round + round * Math.sin(i / 6 * (Math.PI / 2))]);
		pts.push([(a - round) / 2, h], [0, h]);
		return pts.map(([x, y]) => onDome(sx * x, y, rr));
	};
	const arch = new three.Group();
	for (const sx of [-1, 1]) arch.add(pathTube(half(sx, r), .016 * S, m.tube()));
	dome.add(arch);
	const shellMat = new three.MeshStandardMaterial({
		color: 15853780,
		roughness: .9,
		side: three.DoubleSide,
		emissive: 16757086,
		emissiveIntensity: 0
	});
	const outside = [], inside = [];
	const N = 4;
	for (const [a, b, c] of faces) {
		const A = hubs[a], B = hubs[b], C = hubs[c];
		const P = (i, j) => A.clone().addScaledVector(B.clone().sub(A), i / N).addScaledVector(C.clone().sub(A), j / N);
		for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
			const tris = [[
				P(i, j),
				P(i + 1, j),
				P(i, j + 1)
			]];
			if (i + j < 3) tris.push([
				P(i + 1, j),
				P(i + 1, j + 1),
				P(i, j + 1)
			]);
			for (const tri of tris) {
				const cut = splitAtDoor(tri, T);
				outside.push(...cut.out);
				inside.push(...cut.in);
			}
		}
	}
	const over = (p) => Math.atan2(p.y, -p.z);
	const mid = (poly) => poly.reduce((s, p) => s.add(p), new three.Vector3()).divideScalar(poly.length);
	outside.sort((a, b) => over(mid(a)) - over(mid(b)));
	inside.sort((a, b) => mid(b).y - mid(a).y);
	const COVER_R = r + .03 * S;
	const shellGeo = panelGeometry(outside, COVER_R, r);
	const shell = new three.Mesh(shellGeo, shellMat);
	shell.castShadow = true;
	const doorPanel = new three.Mesh(panelGeometry(inside, COVER_R + .004 * S, r), shellMat);
	doorPanel.castShadow = true;
	dome.add(shell, doorPanel);
	const tris = (geo) => geo.attributes.position.count / 3;
	const coverAt = Array.from({ length: tris(shellGeo) }, (_, i) => {
		const pa = shellGeo.attributes.position;
		return over(new three.Vector3(pa.getX(i * 3) + pa.getX(i * 3 + 1) + pa.getX(i * 3 + 2), pa.getY(i * 3) + pa.getY(i * 3 + 1) + pa.getY(i * 3 + 2), pa.getZ(i * 3) + pa.getZ(i * 3 + 1) + pa.getZ(i * 3 + 2)));
	});
	const rest = shellGeo.attributes.position.array.slice();
	const restAt = Array.from({ length: shellGeo.attributes.position.count }, (_, i) => over(new three.Vector3(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2])));
	const zip = new three.Group();
	for (const sx of [-1, 1]) zip.add(pathTube(half(sx, COVER_R + .006 * S).reverse(), .007 * S, m.zip()));
	dome.add(zip);
	const lantern = new three.Group();
	const cord = new three.Mesh(new three.CylinderGeometry(.003, .003, .42 * S, 4), m.cord());
	cord.position.y = r - .21 * S;
	const bulb = new three.Mesh(new three.SphereGeometry(.05 * S, 14, 10), m.bulb());
	bulb.position.y = r - .47 * S;
	const cap = new three.Mesh(new three.CylinderGeometry(.018 * S, .03 * S, .04 * S, 10), m.hub());
	cap.position.y = r - .43 * S;
	lantern.add(cord, bulb, cap);
	dome.add(lantern);
	const lamp = new three.PointLight(16757610, 0, 14 * S, 1.6);
	lamp.position.set(0, r - .47 * S, 0);
	dome.add(lamp);
	const FR = r + .02 * S;
	const COLS = 30, ROWS = 120;
	const fgeo = new three.PlaneGeometry(1, 1, COLS, ROWS);
	const flat = [];
	for (let j = 0; j <= ROWS; j++) {
		const s = j / ROWS * 2 * FR;
		const w = Math.sqrt(Math.max(0, FR * FR - (FR - s) ** 2));
		for (let i = 0; i <= COLS; i++) flat.push([Math.min(w, Math.max(-w, FR - 2 * FR * i / COLS)), s]);
	}
	const fuv = fgeo.attributes.uv;
	flat.forEach(([x, s], i) => fuv.setXY(i, x / (2 * FR) + .5, 1 - s / (2 * FR)));
	const floorMat = new three.MeshStandardMaterial({
		map: floorTex(),
		roughness: .75,
		side: three.DoubleSide
	});
	const floor = new three.Mesh(fgeo, floorMat);
	floor.receiveShadow = true;
	floor.castShadow = true;
	floor.frustumCulled = false;
	floor.position.y = base;
	g.add(floor);
	const FOLD = FR / 3, SHEET = .004, CORE = .025, THICK = .012;
	/** the groundsheet as far as k of its part: unrolled (0 … 0.65), its folded sides opened out (… 1) */
	function layFloor(k) {
		const u = 2 * FR * ease(clamp(k / .65));
		const open = ease(clamp((k - .65) / .35));
		const ang = Math.PI * (1 - open);
		const L = 2 * FR - u;
		const R = Math.sqrt(CORE * CORE + THICK * L / Math.PI);
		const z0 = FR - u;
		const pa = fgeo.attributes.position;
		flat.forEach(([x, s], i) => {
			let fx = x, fy = 0;
			const d = Math.abs(x) - FOLD;
			if (d > 0) {
				const sx = Math.sign(x);
				fx = sx * (FOLD + d * Math.cos(ang));
				fy = d * Math.sin(ang) + (1 - open) * SHEET * (sx < 0 ? 2 : 1);
			}
			if (s <= u) return pa.setXYZ(i, fx, fy + .002, FR - s);
			const dd = s - u;
			const rho = Math.sqrt(Math.max(CORE * CORE, R * R - THICK * dd / Math.PI));
			const th = 2 * Math.PI / THICK * (R - rho);
			const rr = rho - fy;
			pa.setXYZ(i, fx, R - rr * Math.cos(th) + .002, z0 - rr * Math.sin(th));
		});
		pa.needsUpdate = true;
		fgeo.computeVertexNormals();
		fgeo.boundingBox = fgeo.boundingSphere = null;
		return {
			roll: new three.Vector3(0, base + R, z0),
			R
		};
	}
	let at = -1;
	let lifted = false;
	/** how far the tent is pitched: 0 nothing, 1 standing, its door in */
	function setPitch(k) {
		k = clamp(k);
		if (k === at) return;
		at = k;
		g.userData.pitch = k;
		const fk = span(k, T.floor);
		floor.visible = k > 0;
		if (floor.visible) g.userData.roll = layFloor(fk);
		const f = span(k, T.frame);
		pieces.forEach((s, i) => {
			const grow = f >= 1 ? 1 : ease(clamp((f - s.at) / s.dur));
			if (grow <= 0) mx.makeScale(0, 0, 0);
			else mx.compose(s.p0, s.q, s3.set(1, s.len * grow, 1));
			tubeMesh.setMatrixAt(i, mx);
		});
		kept.forEach((h, i) => {
			const pop = f >= 1 ? 1 : ease(clamp((f - h.at) / h.dur));
			if (pop <= 0) mx.makeScale(0, 0, 0);
			else mx.compose(h.v, h.q, s3.setScalar(pop));
			hubMesh.setMatrixAt(i, mx);
		});
		tubeMesh.instanceMatrix.needsUpdate = hubMesh.instanceMatrix.needsUpdate = true;
		tubeMesh.boundingBox = tubeMesh.boundingSphere = hubMesh.boundingBox = hubMesh.boundingSphere = null;
		tubeMesh.visible = hubMesh.visible = f > 0;
		const n = Math.min(rings - 1, Math.floor(f * rings));
		const top = f >= 1 ? r : three.MathUtils.lerp(n > 0 ? ringY[n - 1] : 0, ringY[n], clamp((f * rings - n) / .45));
		for (const a of arch.children) a.userData.upTo(f > 0 ? top : -1);
		lantern.visible = f >= 1;
		const c = span(k, T.cover);
		const edge = -.05 + (Math.PI + .4) * ease(c);
		let on = 0;
		while (on < coverAt.length && coverAt[on] <= edge) on++;
		shellGeo.setDrawRange(0, on * 3);
		shell.visible = on > 0;
		const settle = c > 0 && c < 1;
		if (settle || lifted) {
			const pa = shellGeo.attributes.position;
			for (let i = 0; i < pa.count; i++) {
				const l = 1 + (settle ? .09 * S * (1 - clamp((edge - restAt[i]) / .35)) : 0) / COVER_R;
				pa.setXYZ(i, rest[i * 3] * l, rest[i * 3 + 1] * l, rest[i * 3 + 2] * l);
			}
			pa.needsUpdate = true;
			lifted = settle;
		}
		const d = span(k, T.doorIn);
		const dn = Math.round(ease(d) * tris(doorPanel.geometry));
		doorPanel.geometry.setDrawRange(0, dn * 3);
		doorPanel.visible = dn > 0;
		for (const z of zip.children) z.userData.show(ease(d));
	}
	/** where the work is at k, in the tent's frame: the groundsheet's roll, the tube going in, the cover's edge at the
	*  top of its sweep, the door */
	function work(k) {
		k = clamp(k);
		if (k <= T.floor[1]) {
			const R = g.userData.roll?.R ?? .1;
			const u = 2 * FR * ease(clamp(span(k, T.floor) / .65));
			return new three.Vector3(0, base + R, FR - u);
		}
		const off = dome.position;
		if (k <= T.frame[1]) {
			const f = span(k, T.frame);
			return (pieces.filter((p) => p.at <= f).sort((a, b) => b.at - a.at)[0] ?? pieces[0]).p1.clone().add(off);
		}
		if (k <= T.cover[1]) {
			const e = Math.min(Math.PI, -.05 + (Math.PI + .4) * ease(span(k, T.cover)));
			return new three.Vector3(0, Math.sin(e) * COVER_R, -Math.cos(e) * COVER_R).add(off);
		}
		return onDome(0, T.door.h, COVER_R).add(off);
	}
	g.userData = {
		shell,
		door: doorPanel,
		lamp,
		deck: deckMesh,
		floor,
		frame: {
			tubes: tubeMesh,
			hubs: hubMesh,
			arch
		},
		pitch,
		setPitch,
		work
	};
	setPitch(pitch);
//#piece c729b38b253f1abf985872fc0f824e9e23f518a8cc3f50841183a2676ff24549
const HISTORY = /* @__PURE__ */ (() => ({ "dome-tent": [{
	...FIRST,
	date: "2026-10-14",
	note: "The dome tent: 4 m across and 2 m high, its door 0.9 × 1.55 m, on a deck 5.6 m across",
	build: () => domeTent()
}, {
	v: 2,
	date: "2026-10-14",
	note: "The storage tent: the same dome twice the size to keep things in, 8 m across and 4 m high, 40 mm tubes, a door 1.8 m wide and 3.1 m high to carry things in, on a deck 11.2 m across"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "dome-tent",
	label: "Storage tent",
	note: "the dome tent twice the size, to keep things in (and later taken to the tribe camp): a geodesic dome 8 m across and 4 m high, its frame of 40 mm steel tubes on hub plates (4-frequency, the tubes 1.02 – 1.3 m long, each in two halves), a canvas cover over it and a door panel 1.8 m wide and 3.1 m high zipped in, a round groundsheet under it, a lamp hung from its top; on a timber deck 11.2 m across. It is pitched step by step: the groundsheet unrolled and its sides laid out, the frame raised ring by ring from the floor, the cover drawn up from the back over the top, the door let down",
	usedIn: "MaiaCity V1",
	make: () => storageTent(),
	variants: [
		{
			id: "dome-tent-pitched",
			label: "Pitched",
			note: "standing, its door in",
			make: () => storageTent()
		},
		{
			id: "dome-tent-floor",
			label: "Groundsheet down",
			note: "the groundsheet unrolled and its folded sides laid out flat",
			make: () => storageTent({ pitch: .2 })
		},
		{
			id: "dome-tent-rings",
			label: "Frame going up",
			note: "the frame raised ring by ring: the lower rings in, the next one going up",
			make: () => storageTent({ pitch: .5 })
		},
		{
			id: "dome-tent-frame",
			label: "Frame up",
			note: "the whole frame standing, the door’s bent tube in, the lamp hung",
			make: () => storageTent({ pitch: .75 })
		},
		{
			id: "dome-tent-cover",
			label: "Cover going on",
			note: "the cover drawn up from the back over the top",
			make: () => storageTent({ pitch: .86 })
		}
	]
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
