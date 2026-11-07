/* ================================================================================================================
 * 1. THE CAR KIT — shared by the old city's cars (hatchback, sedan, SUV, taxi, police car, ambulance, van)
 *
 * A road vehicle at its real size, 1 unit = 1 m: its tyres stand on y 0, its front toward +z, its left side toward +x
 * (the driver's left, facing +z), centred on its length and width. Light enough to draw hundreds of in traffic (a car
 * under ~6k triangles):
 *
 *   body      one lofted shell: a cross-section (sill, door, shoulder, glass, roof) swept along the car through its side
 *             profile and its plan, its wheel arches cut out of it; each face painted, glazed or dark underneath by
 *             where it is (a window's glass between its pillars), the paint faded, dusty toward the sills, rusty where
 *             the variant says, one door perhaps a different colour (a panel replaced from a scrapyard)
 *   chassis   the dark floor pan and wheel wells seen through the arches
 *   wheels    four, each a group at its hub (`wheel:fl`, `wheel:fr`, `wheel:rl`, `wheel:rr`) turning about x: a
 *             rubber tyre lathed from its section, a steel rim, a plastic hub cap
 *   trim      bumpers, grille, mirrors, door seams and handles, blank number plates (never any text or badge)
 *   lights    one mesh per kind, named exactly for the world to drive it (`light:head`, `light:tail`, `light:brake`,
 *             `light:indicator-l`, `light:indicator-r`, `light:reverse`, `light:beacon-blue`, `light:beacon-red`,
 *             `light:sign`), its material of the same name; modelled off, a dark lens: the world draws each glow
 * ============================================================================================================== */
const THREE = require('three');
const { mergeGeometries } = require('three/addons/utils/BufferGeometryUtils.js');

/** a seeded chance in [0, 1): the same text always gives the same car */
function chance(text) {
	let h = 1779033703 ^ text.length;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
	let a = h >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};

/** a curve given as [z, value] keys (z rising), read at z between them in straight lines */
function curve(keys) {
	return (z) => {
		if (z <= keys[0][0]) return keys[0][1];
		for (let i = 1; i < keys.length; i++) {
			const [z1, v1] = keys[i];
			if (z <= z1) {
				const [z0, v0] = keys[i - 1];
				return z1 === z0 ? v1 : v0 + ((v1 - v0) * (z - z0)) / (z1 - z0);
			}
		}
		return keys[keys.length - 1][1];
	};
}

/* ---- materials: real surfaces, old and tired ---- */

/**
 * The materials of one car: three, so that a jam of hundreds costs few draw calls (each kind a car is drawn as costs
 * one call a material). Every surface but the glass is coloured by its vertices, its colour from COLOURS below:
 *   paint   the shell and everything painted on it (a livery's band, reflective blocks, a sign's letters)
 *   matt    everything unpainted: bumpers and grilles, tyres, steel rims and hub caps, plates, the underbody
 *   glass   the windows
 * The lamps keep a material each (lampMaterials), named as their light, for the world to drive.
 */
function materials(paint) {
	const m = (name, o) => Object.assign(new THREE.MeshStandardMaterial(o), { name });
	return {
		// single-stage enamel, faded and chalky from years of sun: rough, hardly any clearcoat shine left
		paint: m('paint', { color: 0xffffff, vertexColors: true, roughness: paint.gloss ? 0.5 : 0.74, metalness: paint.metallic ? 0.35 : 0.05 }),
		// laminated and toughened glass, grimy: dark, reflective, nothing of the inside seen
		glass: m('glass', { color: 0x262d31, roughness: 0.12, metalness: 0.75 }),
		// black polypropylene gone grey, rubber, painted steel, dull old bright-work: all matt with age
		matt: m('matt', { color: 0xffffff, vertexColors: true, roughness: 0.82, metalness: 0.12 }),
	};
}

/** the colours of the unpainted parts, as vertex colours on the matt material */
const COLOURS = {
	under: 0x16150f, // the floor pan and wheel wells
	trim: 0x34322e, // black polypropylene bumpers, grilles and mirror shells, gone grey
	tyre: 0x1b1b1a,
	rim: 0x5d5f5e, // steel wheels
	cap: 0x6c6e6b, // plastic hub caps
	plate: 0xcfcbbd, // blank number plates
	chrome: 0x9a9c9a, // the grille's bars
};

/** a geometry coloured all over in one colour (its vertex colours), for a material coloured by its vertices */
function tint(g, hex) {
	const c = new THREE.Color(hex);
	const n = g.attributes.position.count;
	const a = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) (a[i * 3] = c.r), (a[i * 3 + 1] = c.g), (a[i * 3 + 2] = c.b);
	g.setAttribute('color', new THREE.BufferAttribute(a, 3));
	return g;
}

/** the lamps' materials: lens colour as seen off, emissive as lit; `emissiveIntensity` 0 is off */
function lampMaterials() {
	const lamp = (name, color, glow) => Object.assign(new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: 0, roughness: 0.3, metalness: 0.1 }), { name });
	return {
		head: lamp('light:head', 0x8f9496, 0xfff0d2),
		tail: lamp('light:tail', 0x560c0a, 0xff1a0a),
		brake: lamp('light:brake', 0x5e0d0b, 0xff2010),
		'indicator-l': lamp('light:indicator-l', 0x7d4c16, 0xffa020),
		'indicator-r': lamp('light:indicator-r', 0x7d4c16, 0xffa020),
		'beacon-blue': Object.assign(lamp('light:beacon-blue', 0x1a2f8a, 0x2a5cff), { roughness: 0.6 }),
		'beacon-red': Object.assign(lamp('light:beacon-red', 0x8a1a1a, 0xff2a2a), { roughness: 0.6 }),
		reverse: lamp('light:reverse', 0x8f9496, 0xffffff),
		// a cab's roof sign: yellowed opal plastic, matt
		sign: Object.assign(lamp('light:sign', 0xa8923c, 0xffe08a), { roughness: 0.7 }),
	};
}

/* ---- the body: one lofted shell ---- */

/**
 * The car's shell, lofted along z through its profile and plan (spec.body: each a list of [z, value] keys, z from
 * the rear bumper, 0, to the front, L), the arches cut over its wheels. Returns its geometry (groups: paint, glass,
 * underbody) and how to read the shell back (its half width, belt and top at any z) for placing the rest on it.
 */
function shell(spec, look, rand) {
	const { L } = spec;
	const B = spec.body;
	const top = curve(B.top);
	const beltRaw = curve(B.belt);
	const belt = (z) => Math.min(beltRaw(z), top(z));
	const hw = curve(B.hw);
	const roofHw = curve(B.roofHw);
	const bottom0 = curve(B.bottom);
	const R = spec.tyre.d / 2;
	const Ra = R + 0.035; // the arch's radius: the tyre and its clearance to bump into
	const axles = [spec.rearAxle, spec.rearAxle + spec.wheelbase];
	const bottom = (z) => {
		let y = bottom0(z);
		for (const az of axles) {
			const dz = Math.abs(z - az);
			if (dz <= Ra) y = Math.max(y, R + Math.sqrt(Ra * Ra - dz * dz));
		}
		return Math.min(y, belt(z) - 0.12);
	};

	// the stations: every key, the door seams, round the arches finely, else every 14 cm
	const zs = new Set();
	for (const list of Object.values(B)) for (const [z] of list) zs.add(z);
	for (const z of spec.seams ?? []) zs.add(z);
	for (const w of spec.windows.side) zs.add(w[0]), zs.add(w[1]);
	for (const w of [spec.windows.front, spec.windows.rear]) if (w) zs.add(w[0]), zs.add(w[1]);
	for (let z = 0; z <= L; z += 0.12) zs.add(z);
	for (const az of axles) {
		for (let k = 0; k <= 8; k++) zs.add(az - Ra * Math.cos((Math.PI * k) / 8));
		zs.add(az - Ra - 0.01), zs.add(az + Ra + 0.01);
	}
	const stations = [...zs].filter((z) => z >= 0 && z <= L).sort((a, b) => a - b).filter((z, i, a) => i === 0 || z - a[i - 1] > 0.012);
	if (stations[stations.length - 1] < L) stations.push(L);

	// the cross-section, its right half (x ≥ 0) from the bottom's middle up to the roof's
	const half = (z) => {
		const b = bottom(z), s = belt(z), t = top(z), h = hw(z), r = Math.min(roofHw(z), h - 0.04);
		const d = s - b, g = Math.max(0, t - s);
		const pts = [
			[0, b],
			[h - 0.07, b],
			[h - 0.012, b + Math.min(0.07, d * 0.2)],
			[h, b + d * 0.55],
			[h - 0.006, s - Math.min(0.05, d * 0.15)],
			[h - 0.03, s],
			[lerp(h - 0.03, r, 0.55), s + g * 0.55],
			[r, t - Math.min(0.035, g * 0.35)],
			[r * 0.84, t - Math.min(0.016, g * 0.15)],
			[r * 0.45, t - Math.min(0.004, g * 0.05)],
			[0, t],
		];
		return pts;
	};
	// round the ring: the right half, then the left mirrored (its middles shared)
	const ringOf = (z) => {
		const p = half(z);
		const ring = p.map(([x, y], j) => ({ x, y, j }));
		for (let j = p.length - 2; j >= 1; j--) ring.push({ x: -p[j][0], y: p[j][1], j });
		return ring;
	};
	const N = ringOf(0).length;

	const pos = [], col = [];
	const base = new THREE.Color(look.color);
	const dust = new THREE.Color(0x7b7161); // road grime: dried mud, soot and brake dust
	const rust = new THREE.Color(0x4f2c19);
	const primer = new THREE.Color(look.door ?? look.color);
	const sun = new THREE.Color(0x9c9a93); // chalky, sun-killed paint
	// rust patches: round the arches and along the sills, as many as the variant is rusty
	const patches = [];
	for (let k = 0; k < Math.round((look.rust ?? 0) * 7); k++) {
		const az = axles[k % 2] + (rand() - 0.5) * 2 * Ra;
		patches.push({ z: az, y: R + Ra * (0.4 + rand() * 0.7), side: rand() < 0.5 ? 1 : -1, r: 0.07 + rand() * 0.12 });
		if (rand() < 0.5) patches.push({ z: lerp(axles[0], axles[1], rand()), y: bottom0(axles[0]) + 0.06, side: rand() < 0.5 ? 1 : -1, r: 0.06 + rand() * 0.1 });
	}
	const doorZ = look.door && spec.doors ? spec.doors[Math.floor(rand() * spec.doors.length)] : null;
	const doorSide = rand() < 0.5 ? 1 : -1;
	const under = new THREE.Color(COLOURS.under);
	const colourAt = (x, y, z, j) => {
		if (j <= 1) return under.clone(); // the underside, seen through the arches
		const c = base.clone();
		const s = belt(z), b = bottom(z);
		if (doorZ && x * doorSide > 0 && z > doorZ[0] && z < doorZ[1] && j >= 2 && j <= 5) c.copy(primer);
		// the whole car greyed and chalked by years of sun; the roof, bonnet and pillars most
		c.lerp(sun, (look.fade ?? 0.15) * 0.35 + 0.06);
		if (j >= 6) c.lerp(sun, (look.fade ?? 0.15) * 0.5 + 0.08);
		// road grime: thick up the sills and lower doors, a film over everything
		const dirt = look.dust ?? 0.3;
		c.lerp(dust, Math.min(0.92, dirt * (1 - smooth(b, b + 0.55, y)) * 1.15 + dirt * 0.22));
		for (const p of patches) {
			if (x * p.side <= 0) continue;
			const d = Math.hypot(z - p.z, y - p.y);
			if (d < p.r) c.lerp(rust, 0.75 * (1 - d / p.r) ** 0.5);
		}
		return c;
	};

	for (const z of stations) {
		for (const p of ringOf(z)) {
			pos.push(p.x, p.y, z - L / 2);
			const c = colourAt(p.x, p.y, z, p.j);
			col.push(c.r, c.g, c.b);
		}
	}

	// what each face is: the segment of the ring it spans (j0 → j1) and where along the car
	const W = spec.windows;
	const inside = (z, list) => list.some(([a, b]) => z > a && z < b);
	const kindOf = (zm, j0, j1) => {
		const lo = Math.min(j0, j1), hi = Math.max(j0, j1);
		if (lo === 0) return 2; // the underside
		const glassy = top(zm) - belt(zm) > 0.12;
		if (!glassy || lo < 5) return 0;
		if (lo === 5 || lo === 6) return inside(zm, W.side) ? 1 : 0; // side glass, the pillars between
		if (lo === 7) return 0; // the roof's edge and gutter: paint (the pillars along the windscreen and rear window)
		return (W.front && zm > W.front[0] && zm < W.front[1]) || (W.rear && zm > W.rear[0] && zm < W.rear[1]) ? 1 : 0;
	};
	const index = [[], [], []];
	for (let i = 0; i < stations.length - 1; i++) {
		const zm = (stations[i] + stations[i + 1]) / 2;
		const ring = ringOf(zm);
		for (let k = 0; k < N; k++) {
			const k1 = (k + 1) % N;
			const a = i * N + k, b = i * N + k1, c = (i + 1) * N + k1, d = (i + 1) * N + k;
			const kind = kindOf(zm, ring[k].j, ring[k1].j);
			// facing out: the ring runs counter-clockwise seen from the front (+z)
			index[kind].push(a, b, c, a, c, d);
		}
	}
	// the end caps: the front face and the rear face, each closed to its middle
	const capped = [];
	const ends = [
		{ i: 0, flip: true },
		{ i: stations.length - 1, flip: false },
	];
	const capPos = [], capCol = [], capIdx = [];
	for (const { i, flip } of ends) {
		const ring = ringOf(stations[i]);
		const z = stations[i] - L / 2;
		const o = capPos.length / 3;
		let cy = 0;
		for (const p of ring) cy += p.y / N;
		capPos.push(0, cy, z);
		const c0 = colourAt(0, cy, stations[i], 3);
		capCol.push(c0.r, c0.g, c0.b);
		for (const p of ring) {
			capPos.push(p.x, p.y, z);
			const c = colourAt(p.x, p.y, stations[i], Math.max(2, Math.min(p.j, 5))); // the ends painted to their foot
			capCol.push(c.r, c.g, c.b);
		}
		for (let k = 0; k < N; k++) {
			const a = o + 1 + k, b = o + 1 + ((k + 1) % N);
			if (flip) capIdx.push(o, b, a);
			else capIdx.push(o, a, b);
		}
		capped.push(z);
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
	geo.setIndex([...index[0], ...index[1], ...index[2]]);
	geo.addGroup(0, index[0].length, 0);
	geo.addGroup(index[0].length, index[1].length, 1);
	geo.addGroup(index[0].length + index[1].length, index[2].length, 2);
	geo.computeVertexNormals();

	const cap = new THREE.BufferGeometry();
	cap.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3));
	cap.setAttribute('color', new THREE.Float32BufferAttribute(capCol, 3));
	cap.setIndex(capIdx);
	cap.computeVertexNormals();

	return { geo, cap, top, belt, hw, roofHw, bottom, axles, R, Ra, L };
}

/* ---- wheels ---- */

/** one wheel at its hub, turning about x; `side` +1 on the left (+x), -1 on the right */
function wheel(spec, mats, side, name) {
	const { d, w, rim } = spec.tyre;
	const R = d / 2, rr = rim / 2;
	const seg = 16;
	// the tyre's section, from the rim's bead outward over the shoulder and tread and back (x: radius, y: across)
	const section = [
		[rr + 0.01, -w / 2 + 0.012],
		[R - 0.035, -w / 2],
		[R - 0.006, -w / 2 + 0.03],
		[R, -w / 4],
		[R, w / 4],
		[R - 0.006, w / 2 - 0.03],
		[R - 0.035, w / 2],
		[rr + 0.01, w / 2 - 0.012],
	].map(([x, y]) => new THREE.Vector2(x, y));
	const tyre = new THREE.LatheGeometry(section, seg);
	tyre.rotateZ(-Math.PI / 2);
	const steel = new THREE.CylinderGeometry(rr + 0.012, rr + 0.012, w - 0.03, seg, 1, false);
	steel.rotateZ(Math.PI / 2);
	steel.translate(-side * 0.012, 0, 0);
	const cap = new THREE.CylinderGeometry(rr * 0.78, rr * 0.88, 0.025, seg, 1, false);
	cap.rotateZ(Math.PI / 2);
	cap.translate(side * (w / 2 - 0.035), 0, 0);
	// the tyre, its rim and its hub cap one mesh of the matt material, each in its colour
	const parts = [tint(tyre, COLOURS.tyre), tint(steel, COLOURS.rim)];
	if (spec.hubcaps !== false) parts.push(tint(cap, COLOURS.cap));
	else cap.dispose();
	const g = new THREE.Group();
	g.name = name;
	g.add(merged(parts, mats.matt, `${name} tyre and rim`));
	return g;
}

/* ---- small parts ---- */

/** a box of size [x, y, z] centred at [x, y, z], turned by `rx` about x (a sloped lens, a raked plate) */
function box(size, at, rx = 0, ry = 0) {
	const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
	if (rx) g.rotateX(rx);
	if (ry) g.rotateY(ry);
	g.translate(at[0], at[1], at[2]);
	return g;
}

/** a rounded slab, its corners cut round (a lamp lens, a beacon dome): size [x, y, z], few triangles */
function lens(size, at, r = 0.25) {
	const [sx, sy, sz] = size;
	const s = new THREE.Shape();
	const rx = Math.min(sx, sy) * r;
	s.moveTo(-sx / 2 + rx, -sy / 2);
	s.lineTo(sx / 2 - rx, -sy / 2);
	s.quadraticCurveTo(sx / 2, -sy / 2, sx / 2, -sy / 2 + rx);
	s.lineTo(sx / 2, sy / 2 - rx);
	s.quadraticCurveTo(sx / 2, sy / 2, sx / 2 - rx, sy / 2);
	s.lineTo(-sx / 2 + rx, sy / 2);
	s.quadraticCurveTo(-sx / 2, sy / 2, -sx / 2, sy / 2 - rx);
	s.lineTo(-sx / 2, -sy / 2 + rx);
	s.quadraticCurveTo(-sx / 2, -sy / 2, -sx / 2 + rx, -sy / 2);
	const g = new THREE.ExtrudeGeometry(s, { depth: sz, bevelEnabled: false, curveSegments: 2 });
	g.translate(at[0], at[1], at[2] - sz / 2);
	return g;
}

/**
 * A strip laid along the car's side, a few millimetres proud of its paint, following its plan from z0 to z1 between
 * the heights y0 and y1 (a livery's band, a reflective stripe): `side` +1 the left, -1 the right.
 */
function strip(s, Z, z0, z1, y0, y1, side, step = 0.15) {
	const pos = [];
	const n = Math.max(1, Math.ceil((z1 - z0) / step));
	for (let i = 0; i < n; i++) {
		const za = z0 + ((z1 - z0) * i) / n, zb = z0 + ((z1 - z0) * (i + 1)) / n;
		const xa = side * (s.hw(za) + 0.004), xb = side * (s.hw(zb) + 0.004);
		const a = [xa, y0, Z(za)], b = [xb, y0, Z(zb)], c = [xb, y1, Z(zb)], d = [xa, y1, Z(za)];
		if (side > 0) pos.push(...a, ...c, ...b, ...a, ...d, ...c);
		else pos.push(...a, ...b, ...c, ...a, ...c, ...d);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.computeVertexNormals();
	return g;
}

/** a flat square or panel facing ±x (on a side) or ±z (on an end): size [w, h] at [x, y, z] */
function panel(w, h, at, facing) {
	const g = new THREE.PlaneGeometry(w, h);
	if (facing === '+x') g.rotateY(Math.PI / 2);
	else if (facing === '-x') g.rotateY(-Math.PI / 2);
	else if (facing === '-z') g.rotateY(Math.PI);
	g.translate(at[0], at[1], at[2]);
	return g;
}

/** many small geometries as one mesh of one material (fewer draw calls when hundreds of cars are drawn) */
function merged(list, mat, name) {
	const clean = list.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') n.deleteAttribute(k);
		return n;
	});
	const geo = mergeGeometries(clean);
	for (const g of list) g.dispose();
	const mesh = new THREE.Mesh(geo, mat);
	mesh.name = name;
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

/**
 * The whole car from its spec and its look (paint colour, fade, dust, rust, a replaced door), its extras laid on by
 * `dress(ctx)` (a taxi's roof sign, a police car's light bar and livery, an ambulance's beacons and stripes): it adds
 * geometry to ctx.trim, to a fitting of its own colour (ctx.fit(name, colour, geometry): a livery band, a sign),
 * ctx.lamps[kind], or meshes of its own to ctx.group.
 */
function car(spec, look, dress) {
	const rand = chance(`${spec.id}:${look.name}`);
	const mats = materials(look);
	const lampMats = lampMaterials();
	const s = shell(spec, look, rand);
	const { L } = spec;
	const Z = (z) => z - L / 2; // from the rear bumper to the car's middle
	const group = new THREE.Group();
	group.name = spec.id;
	const parts = {};

	const body = new THREE.Mesh(s.geo, [mats.paint, mats.glass, mats.matt]);
	body.name = 'body';
	body.castShadow = body.receiveShadow = true;
	const caps = new THREE.Mesh(s.cap, mats.paint);
	caps.name = 'body ends';
	group.add(body, caps);
	parts.body = body;

	const trim = [], plate = [], chrome = [], extra = [];
	const lamps = {};
	const lamp = (kind, g) => (lamps[kind] ??= []).push(g);

	// the floor pan and wheel wells, dark, behind the arches
	const inner = spec.track / 2 - spec.tyre.w / 2 - 0.03;
	const a0 = s.axles[0], a1 = s.axles[1];
	extra.push(box([inner * 2, s.R + s.Ra - 0.06, a1 - a0 + 2 * s.Ra], [0, 0.13 + (s.R + s.Ra - 0.06) / 2, Z((a0 + a1) / 2)]));

	// the wheels, each at its hub
	for (const [az, end] of [
		[a0, 'r'],
		[a1, 'f'],
	])
		for (const side of [1, -1]) {
			const name = `wheel:${end}${side > 0 ? 'l' : 'r'}`;
			const w = wheel(spec, mats, side, name);
			w.position.set(side * (spec.track / 2), s.R, Z(az));
			group.add(w);
			parts[name] = w;
		}

	// bumpers: black plastic across each end, wrapping a little round the corners
	const fB = spec.bumper ?? { y: 0.42, h: 0.2 };
	for (const [z, dir] of [
		[L, 1],
		[0, -1],
	]) {
		const hwz = s.hw(z - dir * 0.08);
		trim.push(box([hwz * 2 - 0.02, fB.h, 0.1], [0, fB.y, Z(z) - dir * 0.03]));
		for (const side of [1, -1]) trim.push(box([0.05, fB.h * 0.9, 0.28], [side * (hwz - 0.018), fB.y, Z(z) - dir * 0.16]));
		// a blank plate, 520 × 110 mm, on the bumper
		plate.push(box([0.52, 0.11, 0.012], [0, fB.y + (dir > 0 ? 0 : 0.17), Z(z) + dir * 0.025]));
	}

	// the front: headlamps, indicators outboard of them, the grille between
	const F = spec.front;
	for (const side of [1, -1]) {
		lamp('head', lens([F.lampW, F.lampH, 0.05], [side * F.lampX, F.lampY, Z(L) + 0.004 - 0.02]));
		lamp(side > 0 ? 'indicator-l' : 'indicator-r', lens([0.07, F.lampH * 0.7, 0.05], [side * (F.lampX + F.lampW / 2 + 0.045), F.lampY - F.lampH * 0.1, Z(L) - 0.02], 0.3));
		// the side repeater on the front wing
		const zr = a1 + s.Ra + 0.12;
		lamp(side > 0 ? 'indicator-l' : 'indicator-r', box([0.012, 0.025, 0.06], [side * (s.hw(zr) + 0.002), s.belt(zr) - 0.12, Z(zr)]));
	}
	trim.push(box([F.grilleW, F.grilleH, 0.04], [0, F.grilleY, Z(L) - 0.015]));
	for (let k = 0; k < 3; k++) chrome.push(box([F.grilleW - 0.04, 0.008, 0.012], [0, F.grilleY - F.grilleH / 4 + (k * F.grilleH) / 4, Z(L) + 0.008]));

	// the rear: tail lamps (with their brake lamps inboard), indicators under them, the third brake lamp, reversing lamps
	const T = spec.rear;
	for (const side of [1, -1]) {
		lamp('tail', lens([T.lampW, T.lampH, 0.05], [side * T.lampX, T.lampY, Z(0) + 0.02]));
		lamp('brake', lens([T.lampW * 0.42, T.lampH * 0.5, 0.05], [side * (T.lampX - T.lampW * 0.7), T.lampY + T.lampH * 0.22, Z(0) + 0.02]));
		lamp(side > 0 ? 'indicator-l' : 'indicator-r', lens([T.lampW * 0.42, T.lampH * 0.42, 0.05], [side * (T.lampX - T.lampW * 0.7), T.lampY - T.lampH * 0.26, Z(0) + 0.02]));
		lamp('reverse', box([0.06, 0.05, 0.03], [side * 0.3, fB.y + 0.02, Z(0) - 0.035]));
	}
	if (T.third) lamp('brake', box([0.3, 0.035, 0.03], [0, T.third.y, Z(T.third.z)]));

	// mirrors on the doors at the windscreen's foot, door seams and handles
	const zm = spec.windows.front[0] - 0.12;
	for (const side of [1, -1]) {
		const xm = s.hw(zm) + 0.05;
		trim.push(box([0.13, 0.11, 0.07], [side * xm, s.belt(zm) + 0.08, Z(zm)]));
		trim.push(box([0.07, 0.025, 0.03], [side * (xm - 0.07), s.belt(zm) + 0.05, Z(zm)]));
		for (const z of spec.seams ?? []) {
			const y0 = s.bottom(z) + 0.05, y1 = s.belt(z);
			trim.push(box([0.006, y1 - y0, 0.006], [side * (s.hw(z) + 0.001), (y0 + y1) / 2, Z(z)]));
		}
		for (const [z0, z1] of spec.doors ?? []) trim.push(box([0.02, 0.025, 0.12], [side * (s.hw(z1 - 0.15) + 0.006), s.belt(z1) - 0.08, Z(z1 - 0.15)]));
	}

	const ctx = { spec, look, s, Z, L, mats, lampMats, group, parts, trim, plate, chrome, extra, lamp, rand, fittings: {} };
	ctx.fit = (name, color, g, o = {}) => (ctx.fittings[name] ??= { color, list: [], ...o }).list.push(g);
	if (dress) dress(ctx);

	const add = (list, mat, name) => {
		if (!list.length) return null;
		const m = merged(list, mat, name);
		group.add(m);
		parts[name] = m;
		return m;
	};
	// everything unpainted one mesh of the matt material, each part in its colour
	add([...trim.map((g) => tint(g, COLOURS.trim)), ...plate.map((g) => tint(g, COLOURS.plate)), ...chrome.map((g) => tint(g, COLOURS.chrome)), ...extra.map((g) => tint(g, COLOURS.under))], mats.matt, 'trim');
	// fittings in colours of their own (a livery's band, reflective stripes, chevrons): one mesh of the paint
	// material, each in its colour; glass among them (an ambulance's rear door windows) one mesh of the glass
	const painted = [], glazed = [];
	for (const [name, f] of Object.entries(ctx.fittings ?? {})) for (const g of f.list) (/glass/.test(name) ? glazed : painted).push(tint(g, f.color));
	add(painted, mats.paint, 'fittings');
	add(glazed, mats.glass, 'fitted glass');
	for (const [kind, list] of Object.entries(lamps)) {
		// one mesh a kind, named exactly as the world reads it, modelled off (a dark lens: the world draws the glow)
		const mesh = merged(list, lampMats[kind], `light:${kind}`);
		mesh.castShadow = false;
		group.add(mesh);
		parts[`light:${kind}`] = mesh;
	}
	for (const m of ctx.meshes ?? []) group.add(m), (parts[m.name] = m);

	group.userData.parts = parts;
	group.userData.size = { L, W: spec.W, H: spec.H };
	return group;
}

/* ================================================================================================================
 * 2. THE AMBULANCE — a box-bodied emergency ambulance of the old city, on a large van's cab and chassis
 *
 * Its measures are the class's (a European type C box ambulance on a 3.5–5 t van chassis-cab, from the converters'
 * and van makers' published dimensions): 6.20 m long, 2.25 m wide over its box (2.00 m over its cab) without mirrors,
 * 2.62 m to the box's roof, 2.77 m over its roof unit and beacons; a 3.67 m wheelbase, 1.00 m in front of the front axle
 * and 1.54 m behind the rear (the box's rear doors and step); tracks of 1.73 m; 225/75 R16C tyres (0.74 m across, 0.225 m
 * wide, on 16" steel rims); the box's floor 0.72 m off the road. No make, no model, no badge, no service's name.
 * ============================================================================================================== */

const AMBULANCE = {
	id: 'ambulance',
	L: 6.2, W: 2.25, H: 2.77,
	wheelbase: 3.665, rearAxle: 1.535, track: 1.73,
	tyre: { d: 0.744, w: 0.225, rim: 0.406 },
	// the shell, z in metres from the rear doors (0) to the front bumper (6.2): the box, then the cab
	body: {
		// the box's flat roof, the step down to the cab's roof, its steep windscreen, its short sloping bonnet
		top: [[0, 2.62], [4.15, 2.62], [4.18, 2.36], [4.62, 2.33], [4.9, 2.0], [5.28, 1.45], [5.9, 1.2], [6.2, 1.02]],
		// the box has no glass (its belt is its roof); the cab's beltline
		belt: [[0, 2.62], [4.15, 2.62], [4.18, 1.36], [5.3, 1.3], [6.2, 1.1]],
		// half the width: the box's square sides, the narrower cab
		hw: [[0, 1.09], [0.04, 1.125], [4.15, 1.125], [4.18, 1.0], [5.6, 1.0], [6.0, 0.95], [6.2, 0.87]],
		roofHw: [[0, 1.09], [4.15, 1.09], [4.18, 0.92], [4.8, 0.92], [5.3, 0.97], [6.2, 0.84]],
		// the box's floor, and the cab's sills and bumper
		bottom: [[0, 0.72], [4.12, 0.72], [4.2, 0.42], [5.9, 0.38], [6.2, 0.44]],
	},
	windows: {
		front: [4.64, 5.27], // the windscreen
		rear: null,
		side: [[4.3, 5.12]], // the cab doors' glass
	},
	seams: [4.22, 5.26],
	doors: [[4.22, 5.26]],
	bumper: { y: 0.5, h: 0.24 },
	front: { lampW: 0.3, lampH: 0.14, lampX: 0.68, lampY: 0.9, grilleW: 0.86, grilleH: 0.2, grilleY: 0.8 },
	rear: { lampW: 0.14, lampH: 0.36, lampX: 0.98, lampY: 1.05, third: { z: 0.0, y: 2.52 } },
	hubcaps: false,
};

/** the ambulance's fittings: its reflective livery, its rear doors, its beacons, its roof unit */
function emergency(ctx) {
	const { s, Z, L, trim, lamp, fit, look, mats } = ctx;
	const W = 1.125;
	const reflect = { roughness: 0.35, metalness: 0 };
	// along the box's sides: a band of retroreflective blocks, alternating, at the height a driver's lights reach
	const block = 0.6, y0 = 0.98, y1 = 1.3;
	for (const side of [1, -1])
		for (let i = 0, z = 0.08; z + block <= 4.1; i++, z += block)
			fit(i % 2 ? 'reflective (dark)' : 'reflective (light)', i % 2 ? look.dark : look.light, panel(block, y1 - y0, [side * (W + 0.004), (y0 + y1) / 2, Z(z + block / 2)], side > 0 ? '+x' : '-x'), reflect);
	// the band carried on round the cab's doors and wings, and a thin red line under the box's roof
	for (const side of [1, -1]) {
		fit('reflective (light)', look.light, strip(s, Z, 4.2, 6.05, y0, y1, side), reflect);
		fit('red line', 0x8a1c1c, panel(4.0, 0.08, [side * (W + 0.004), 2.32, Z(2.1)], side > 0 ? '+x' : '-x'), reflect);
	}
	// the rear doors: a split down the middle, their windows, and red and yellow chevrons on their lower half
	trim.push(box([0.012, 1.7, 0.006], [0, 1.62, Z(0) - 0.003]));
	for (const side of [1, -1]) fit('rear door glass', 0x262d31, box([0.62, 0.42, 0.01], [side * 0.5, 2.0, Z(0) - 0.004]), { roughness: 0.12, metalness: 0.75 });
	for (let k = 0; k < 7; k++) {
		const x = -0.84 + k * 0.28; // inside the doors' edges, the bars' tilt included
		const g = new THREE.PlaneGeometry(0.11, 0.62);
		g.rotateZ(x < 0 ? -0.7 : 0.7);
		g.rotateY(Math.PI);
		g.translate(x, 1.1, Z(0) - 0.008);
		fit(k % 2 ? 'chevron (red)' : 'chevron (yellow)', k % 2 ? 0x9a1f1a : 0xc4b928, g, reflect);
	}
	// a rear step under the doors
	trim.push(box([1.6, 0.06, 0.32], [0, 0.36, Z(0) + 0.12]));
	// beacons: a light bar on the cab's roof, a dome at each corner of the box's roof, strobes in the grille
	const zb = 4.45, rb = s.top(zb);
	trim.push(box([1.4, 0.05, 0.3], [0, rb + 0.02, Z(zb)]));
	for (const side of [1, -1]) lamp('beacon-blue', lens([0.6, 0.1, 0.27], [side * 0.36, rb + 0.095, Z(zb)], 0.4));
	for (const z of [4.02, 0.12]) for (const side of [1, -1]) lamp('beacon-blue', lens([0.18, 0.12, 0.18], [side * 0.92, 2.62 + 0.06, Z(z)], 0.5));
	for (const side of [1, -1]) lamp('beacon-blue', box([0.1, 0.04, 0.02], [side * 0.22, ctx.spec.front.grilleY, Z(L) + 0.012]));
	// the roof unit (the saloon's air conditioning) and the box's side door, kerb side (right, -x)
	trim.push(box([0.9, 0.14, 0.7], [0, 2.62 + 0.07, Z(2.4)]));
	for (const z of [2.95, 4.0]) trim.push(box([0.006, 1.75, 0.006], [-(W + 0.006), 1.68, Z(z)]));
	trim.push(box([0.02, 0.03, 0.14], [-(W + 0.012), 1.55, Z(3.1)]));
	void mats;
}

/** its paints */
const PAINTS = [
	{ name: 'white', label: 'Yellowed white', color: 0xd2d0c6, fade: 0.1, dust: 0.45, rust: 0.2, light: 0xc9c43a, dark: 0x2d6e3b },
	{ name: 'yellow', label: 'Faded yellow', color: 0xbfb646, fade: 0.2, dust: 0.45, rust: 0.15, light: 0xd2cf6a, dark: 0x2d6e3b },
];

/* ================================================================================================================
 * 3. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'Ambulance',
	note: 'The old city\'s emergency ambulance: a box body on a large van\'s cab and chassis, 6.20 × 2.25 m, 2.77 m over its roof unit; a band of retroreflective blocks along it, chevrons on its rear doors, a blue light bar on its cab and blue domes on the box\'s corners and in its grille (light:beacon-blue), no service\'s name or crest. Its lamps named for the world to drive (light:head, light:tail, light:brake, light:indicator-l, light:indicator-r, light:reverse, light:beacon-blue), its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== AMBULANCE.id || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: AMBULANCE.id, version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car(AMBULANCE, paint, emergency),
	};
};
