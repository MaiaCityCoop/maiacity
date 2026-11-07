*/
function wall(g, { rot, half, span, inner, holes, skin, lining }) {
	const w = new three.Group();
	w.rotation.y = rot;
	g.add(w);
	for (const r of cut(-span, span, .16, H - .1, holes)) part(w, r.u1 - r.u0, r.y1 - r.y0, .02, skin, (r.u0 + r.u1) / 2, (r.y0 + r.y1) / 2, half - .045);
	/** @type {THREE.BufferGeometry[]} */
	const geos = [];
	const pitch = .278, n = Math.floor(2 * span / pitch);
	const first = -span + (2 * span - (n - 1) * pitch) / 2;
	for (let i = 0; i < n; i++) {
		const u = first + i * pitch;
		for (const r of cut(u - .065, u + .065, .2, H - .14, holes)) {
			if (r.u1 - r.u0 < .03 || r.y1 - r.y0 < .03) continue;
			const b = new three.BoxGeometry(r.u1 - r.u0, r.y1 - r.y0, .03);
			b.translate((r.u0 + r.u1) / 2, (r.y0 + r.y1) / 2, half - .02);
			geos.push(b);
		}
	}
	if (geos.length) {
		const ribs = new three.Mesh((0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos), skin);
		ribs.castShadow = ribs.receiveShadow = true;
		w.add(ribs);
		for (const b of geos) b.dispose();
	}
	for (const r of cut(-inner, inner, FLOOR, CEIL, holes)) part(w, r.u1 - r.u0, r.y1 - r.y0, .02, lining, (r.u0 + r.u1) / 2, (r.y0 + r.y1) / 2, half - T + .01);
	const rw0 = half - T, rw1 = half - .035, rc = (rw0 + rw1) / 2, rd = rw1 - rw0;
	/** @type {{ u0: number, u1: number, w0: number, w1: number }[]} */
	const leaves = [];
	for (const h of holes) {
		const hu = (h.u0 + h.u1) / 2, hy = (h.y0 + h.y1) / 2;
		part(w, .04, h.y1 - h.y0, rd, m.frame(), h.u0 + .02, hy, rc);
		part(w, .04, h.y1 - h.y0, rd, m.frame(), h.u1 - .02, hy, rc);
		part(w, h.u1 - h.u0, .04, rd, m.frame(), hu, h.y1 - .02, rc);
		if (!h.door) part(w, h.u1 - h.u0 + .06, .04, rd + .05, m.frame(), hu, h.y0 + .02, rc + .025);
		if (h.glass) {
			unlit(part(w, h.u1 - h.u0 - .08, h.y1 - h.y0 - .08, .008, h.glass === "frosted" ? m.frosted() : m.glass(), hu, hy, rc));
			if (h.u1 - h.u0 > 1.2) part(w, .04, h.y1 - h.y0 - .08, .04, m.frame(), hu, hy, rc);
		}
		if (h.door) {
			const leaf = h.u1 - h.u0 - .08, open = 1.75;
			const pivot = new three.Group();
			pivot.position.set(h.u0 + .04, 0, half - .01);
			pivot.rotation.y = -1.75;
			w.add(pivot);
			part(pivot, leaf, h.y1 - h.y0 - .04, .045, skin, leaf / 2, hy, .0225);
			bar(pivot, v3(leaf - .08, 1, .045), v3(leaf - .08, 1, .1), .012, m.chrome());
			bar(pivot, v3(leaf - .08, 1, .1), v3(leaf - .2, 1, .1), .012, m.chrome());
			const ex = h.u0 + .04 + leaf * Math.cos(open), ew = half - .01 + leaf * Math.sin(open);
			leaves.push({
				u0: Math.min(h.u0, ex) - .03,
				u1: Math.max(h.u0 + .06, ex + .03),
				w0: half,
				w1: ew + .05
			});
		}
	}
	const c = Math.cos(rot), s = Math.sin(rot);
	/** @param {number} u0 @param {number} u1 @param {number} w0 @param {number} w1 @returns {Rect} */
	const toFloor = (u0, u1, w0, w1) => {
		const xs = [u0 * c + w0 * s, u1 * c + w1 * s], zs = [-u0 * s + w0 * c, -u1 * s + w1 * c];
		return {
			x0: Math.min(...xs),
			x1: Math.max(...xs),
			z0: Math.min(...zs),
			z1: Math.max(...zs)
		};
	};
	const doors = holes.filter((h) => h.door).map((h) => ({
		...h,
		y0: -1,
		y1: 2
	}));
	return [...cut(-span, span, 0, 1, doors).filter((r) => r.y0 < .5).map((r) => toFloor(r.u0, r.u1, half - T, half)), ...leaves.map((l) => toFloor(l.u0, l.u1, l.w0, l.w1))];
}
/**
* The container itself, before it is fitted out: its walls with their openings (`front` along +z and `back` along −z,
* from −x to +x; `end` across −x, from −z to +z), its frame, floor, roof and ceiling lights, the cargo doors swung
* back and the step at the open end, its name stencilled on both flanks at `labelX`.
* @param {{ name: string, color: string, floor: THREE.Material, lining?: THREE.Material, front?: Hole[], back?: Hole[], end?: Hole[], label: string, labelX: number }} o
*/
function box({ name, color, floor, lining = m.lining(), front = [], back = [], end = [], label, labelX }) {
	const g = new three.Group();
	g.name = name;
	const skin = paint(color);
	/** @type {Rect[]} */
	const solids = [];
	const long = {
		half: W / 2,
		span: L / 2 - .15,
		inner: X1,
		skin,
		lining
	};
	solids.push(...wall(g, {
		...long,
		rot: 0,
		holes: front
	}));
	solids.push(...wall(g, {
		...long,
		rot: Math.PI,
		holes: back.map((h) => ({
			...h,
			u0: -h.u1,
			u1: -h.u0
		}))
	}));
	solids.push(...wall(g, {
		rot: -Math.PI / 2,
		half: L / 2,
		span: W / 2 - .15,
		inner: Z1,
		holes: end,
		skin,
		lining
	}));
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
		part(g, .15, H, .15, skin, sx * (L / 2 - .075), H / 2, sz * (W / 2 - .075));
		for (const y of [.059, H - .059]) part(g, .178, .118, .162, m.casting(), sx * (L / 2 - .089), y, sz * (W / 2 - .081));
		solids.push({
			x0: sx * (L / 2 - .075) - .075,
			x1: sx * (L / 2 - .075) + .075,
			z0: sz * (W / 2 - .075) - .075,
			z1: sz * (W / 2 - .075) + .075
		});
	}
	for (const sz of [-1, 1]) {
		part(g, L - .3, .16, .06, skin, 0, .08, sz * (W / 2 - .03));
		part(g, L - .3, .1, .06, skin, 0, H - .05, sz * (W / 2 - .03));
	}
	part(g, .06, .16, W - .3, skin, -L / 2 + .03, .08, 0);
	part(g, .06, .1, W - .3, skin, -L / 2 + .03, H - .05, 0);
	part(g, .08, FLOOR, W - .3, m.casting(), L / 2 - .04, FLOOR / 2, 0);
	part(g, .1, .2, W - .3, skin, L / 2 - .05, H - .1, 0);
	part(g, X1 - X0 + .02, .03, Z1 - Z0 + .02, floor, 0, .135, 0);
	part(g, L - .12, .12, W - .12, m.frame(), 0, .12 / 2, 0, false);
	const roof = new three.Group();
	roof.name = "roof";
	g.add(roof);
	part(roof, L, .04, W, skin, 0, H - .02, 0);
	part(roof, X1 - X0, .02, Z1 - Z0, lining, 0, 2.71, 0);
	/** @type {[number, number, number][]} */
	const lamps = [];
	for (const x of [
		-4.8,
		-2.4,
		0,
		2.4,
		4.8
	]) {
		unlit(part(roof, 1.2, .025, .07, m.led(), x, 2.6875, 0));
		lamps.push([
			x,
			2.5500000000000003,
			0
		]);
	}
	for (const sz of [-1, 1]) {
		const z = sz * (W / 2 + .04);
		part(g, 1.17, H - .24, .04, skin, L / 2 - .62, (H - .24) / 2 + .12, z);
		for (let i = 0; i < 4; i++) part(g, .12, H - .5, .03, skin, L / 2 - 1.08 + i * .3, H / 2, z + sz * .03);
		for (const x of [L / 2 - .35, L / 2 - .85]) {
			bar(g, v3(x, .14, z + sz * .07), v3(x, H - .14, z + sz * .07), .016, m.galv());
			bar(g, v3(x, 1.2, z + sz * .07), v3(x + .24, 1.2, z + sz * .09), .012, m.galv());
		}
		solids.push({
			x0: L / 2 - 1.22,
			x1: L / 2,
			z0: Math.min(z, z + sz * .1),
			z1: Math.max(z, z + sz * .1)
		});
	}
	part(g, .45, .075, 1.6, m.galv(), L / 2 + .24, .0375, 0);
	const word = new three.MeshStandardMaterial({
		map: stencil(label),
		transparent: true,
		roughness: .6,
		depthWrite: false
	});
	unlit(sheet(g, 2.4, .6, word, labelX, 2.3, W / 2 + .002));
	unlit(sheet(g, 2.4, .6, word, -labelX, 2.3, -W / 2 - .002, Math.PI));
	return {
		g,
		roof,
		solids,
		lamps,
		skin
	};
}
/**
* How to walk a container and the ground round it: a step is refused into anything in the way (padded by a body's
* width), or deeper into what it already stands in; inside the floor is 15 cm up, on the step 7.5 cm.
* @param {Rect[]} solids @param {[number, number, number][]} lamps @returns {Walk}
*/
function walkway(solids, lamps) {
	/** how deep x, z is in r (padded), or ≤ 0 outside it @param {Rect} r @param {number} x @param {number} z */
	const depth = (r, x, z) => Math.min(x - r.x0 + PAD, r.x1 + PAD - x, z - r.z0 + PAD, r.z1 + PAD - z);
	return {
		x: L / 2 + 2.4,
		z: .2,
		yaw: Math.PI / 2,
		canStand(x, z, _here, _ground, from) {
			for (const r of solids) {
				const d = depth(r, x, z);
				if (d <= 0) continue;
				const before = depth(r, from.x, from.z);
				if (before > 0 && d < before) continue;
				return false;
			}
			return true;
		},
		floorAt(x, z) {
			if (Math.abs(x) < L / 2 && Math.abs(z) < W / 2) return FLOOR;
			if (x >= L / 2 && x < L / 2 + .47 && Math.abs(z) < .8) return .075;
			return 0;
		},
		lamps
	};
}
/**
* The fit-out: things put on the floor (or on the ground outside), each turned so, its footprint in the way.
* @param {THREE.Group} g @param {Rect[]} solids
*/
