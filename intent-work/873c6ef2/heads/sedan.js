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
 * 2. THE SEDAN — a four-door family saloon of the old city, its taxis and its police cars made from it
 *
 * Its measures are the class's (a mid-size family saloon of the 2000s–2010s, from the makers' published dimensions
 * of the class): 4.75 m long, 1.83 m wide without its mirrors, 1.45 m tall; a 2.78 m wheelbase, 0.95 m in front of the
 * front axle and 1.02 m behind the rear (its boot); tracks of 1.57 m; 205/60 R16 tyres (0.65 m across, 0.205 m wide,
 * on 16" steel rims); 0.14 m off the ground. No make, no model, no badge.
 * ============================================================================================================== */

const SEDAN = {
	id: 'sedan',
	L: 4.75, W: 1.83, H: 1.45,
	wheelbase: 2.78, rearAxle: 1.02, track: 1.57,
	tyre: { d: 0.652, w: 0.205, rim: 0.406 },
	// the shell, z in metres from the rear bumper (0) to the front (4.75)
	body: {
		// the centreline's upper edge: the boot's rear face and lid, the rear window, the roof, the windscreen, the bonnet
		top: [[0, 0.93], [0.1, 0.99], [0.45, 1.02], [0.62, 1.04], [1.0, 1.28], [1.3, 1.41], [1.55, 1.445], [2.4, 1.45], [2.68, 1.42], [3.0, 1.2], [3.27, 0.98], [3.8, 0.91], [4.45, 0.84], [4.75, 0.73]],
		// the beltline: where the side glass starts (the boot's and the bonnet's edges behind and ahead of it)
		belt: [[0, 0.95], [0.7, 1.0], [3.3, 0.94], [4.75, 0.85]],
		// half the width at the shoulder, in plan: the corners rounded at each end
		hw: [[0, 0.83], [0.1, 0.89], [0.4, 0.915], [4.2, 0.915], [4.6, 0.87], [4.75, 0.79]],
		// half the roof's width (the glass leans in above the belt), of the boot lid and of the bonnet
		roofHw: [[0, 0.79], [0.62, 0.8], [0.95, 0.72], [1.35, 0.69], [2.6, 0.7], [2.95, 0.76], [3.27, 0.85], [4.75, 0.75]],
		// the underside: the bumpers' lower edges, the sills between the arches
		bottom: [[0, 0.34], [0.4, 0.25], [1.0, 0.18], [3.75, 0.18], [4.3, 0.25], [4.75, 0.32]],
	},
	windows: {
		front: [2.66, 3.26], // the windscreen
		rear: [0.64, 1.3], // the rear window over the boot
		side: [[1.44, 2.3], [2.42, 3.22]], // the rear and front doors' glass, the B-pillar between
	},
	seams: [1.4, 2.36, 3.4],
	doors: [[1.4, 2.36], [2.36, 3.4]],
	bumper: { y: 0.43, h: 0.2 },
	front: { lampW: 0.32, lampH: 0.1, lampX: 0.6, lampY: 0.655, grilleW: 0.6, grilleH: 0.1, grilleY: 0.585 },
	rear: { lampW: 0.3, lampH: 0.12, lampX: 0.63, lampY: 0.83, third: { z: 0.66, y: 1.05 } },
};

/** its paints, as they are after fifteen years in the old city's sun and grime */
const PAINTS = [
	{ name: 'silver', label: 'Faded silver', color: 0x8c8f8f, metallic: true, fade: 0.25, dust: 0.35, rust: 0 },
	{ name: 'graphite', label: 'Dusty graphite', color: 0x45484a, metallic: true, fade: 0.25, dust: 0.5, rust: 0.15 },
	{ name: 'black', label: 'Chalky black', color: 0x232425, fade: 0.35, dust: 0.45, rust: 0.1 },
	{ name: 'white', label: 'Yellowed white', color: 0xc2bfb4, fade: 0.1, dust: 0.45, rust: 0.35 },
	{ name: 'maroon', label: 'Dull maroon, rusting', color: 0x5a2224, fade: 0.35, dust: 0.4, rust: 0.8 },
	{ name: 'blue', label: 'Dull blue, a silver door', color: 0x2f3d4c, fade: 0.3, dust: 0.4, rust: 0.3, door: 0x8c8f8f },
];

/* ================================================================================================================
 * 3. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'Sedan',
	note: 'A four-door family saloon of the old city: 4.75 × 1.83 m, 1.45 m tall, a 2.78 m wheelbase on 205/60 R16 tyres; a lofted shell with its glass between the pillars, its boot and arches, steel wheels with hub caps, black bumpers and blank plates, faded paint, dust up its sills and rust where the paint says. Its lamps named for the world to drive (light:head, light:tail, light:brake, light:indicator-l, light:indicator-r, light:reverse), its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles, to be drawn by the hundred.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== SEDAN.id || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: SEDAN.id, version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car(SEDAN, paint),
	};
};
