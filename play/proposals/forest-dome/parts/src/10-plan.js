/* ================================================================================================================
 * 2. PLAN — the measures every part shares
 * ================================================================================================================ */

/** the dome: 80 m across, a hemisphere, a class-I icosahedral geodesic of frequency 12 (1,440 triangles, struts of
 *  3.1–4.4 m, 751 hubs), a five-fold hub at its top and its base ring exactly on the ground */
const R = 40;
const FREQ = 12;
/** the radius of the shell at height y */
const shellR = (y) => Math.sqrt(Math.max(0, R * R - y * y));

/**
 * The north quarter: four levels of rooms. Each level's glass façade is a curve concave to the garden (an arc of
 * radius RHO, its middle at `g` north of the dome's middle), stepping back TERRACE metres a level, so each level's floor
 * runs out in front of its façade as its terrace, over the façade of the level below. The ground level's footprint,
 * from its façade to the shell, is a quarter of the dome's floor (1,257 m²).
 */
const RHO = 100;
const TERRACE = 3.5;
/** a slab's depth under its floor; the rooms keep `GAP` inside the shell (its structure and insulation) */
const SLAB = 0.35;
const GAP = 0.9;
const LEVELS = [
	{ y: 0, h: 4.5, g: 18.5, name: 'ground' },
	{ y: 4.5, h: 4, g: 22, name: 'first' },
	{ y: 8.5, h: 4, g: 25.5, name: 'second' },
	{ y: 12.5, h: 4, g: 29, name: 'third' }
];
/** the top of the third level: the sky garden on its roof */
const ROOF = 16.5;
/** the plaza in front of the ground level, paved, the forest beyond it */
const PLAZA = 6;
/** z of level k's façade at x */
const facadeZ = (k, x) => LEVELS[k].g - (x * x) / (2 * RHO);
/** z of the front edge of level k's floor at x: the façade of the level below (the ground's: the plaza's edge) */
const edgeZ = (k, x) => (k === 0 ? facadeZ(0, x) - PLAZA : facadeZ(k - 1, x));
/** x (≥ 0) where a line z(x) meets the circle of radius `r`: found by halving */
function meets(z, r) {
	let lo = 0, hi = r;
	for (let i = 0; i < 50; i++) {
		const m = (lo + hi) / 2;
		if (m * m + z(m) * z(m) < r * r) lo = m;
		else hi = m;
	}
	return lo;
}
/** how far east and west level k's façade runs, at height y (its floor by default), inside the shell by GAP */
const facadeEnd = (k, y = LEVELS[k].y) => meets((x) => facadeZ(k, x), shellR(y) - GAP);
/** whether [x, z] is in the north quarter's footprint (behind the ground level's façade) */
const inBuilding = (x, z) => z >= facadeZ(0, x) && x * x + z * z < R * R;
/** whether [x, z] is in the garden: inside the shell's foot by `margin` and in front of the plaza */
const inGarden = (x, z, margin = 0) => Math.hypot(x, z) < R - 1.4 - margin && z < edgeZ(0, x) - margin;

/**
 * A point on level k's façade at x, as a frame: where it is (on the level's floor), `along` the façade eastward and
 * `out` to the garden (unit [x, z] each), and `ry`, the turn that lays a room's own axes on it (its +x along, its +z
 * out to the garden; so a room's depth into the building is −z).
 */
function facadeFrame(k, x) {
	const z = facadeZ(k, x);
	const tx = 1, tz = -x / RHO;
	const l = Math.hypot(tx, tz);
	const along = [tx / l, tz / l];
	const out = [along[1], -along[0]];
	return { x, y: LEVELS[k].y, z, along, out, ry: Math.atan2(out[0], out[1]) };
}
/** the matrix of a room's own frame (+x along the façade, −z into the building, y up from its floor) at façade x */
const roomMatrix = (k, x) => {
	const f = facadeFrame(k, x);
	return at(f.x, f.y, f.z, f.ry);
};
/** how deep (m, from level k's façade at x, straight in) a room has at least `head` of headroom under the shell */
function deepAt(k, x, head = 2.5) {
	const r = shellR(LEVELS[k].y + head) - GAP;
	const f = facadeFrame(k, x);
	// along −out from the façade until the circle of radius r
	let lo = 0, hi = 60;
	for (let i = 0; i < 40; i++) {
		const m = (lo + hi) / 2;
		const px = f.x - f.out[0] * m, pz = f.z - f.out[1] * m;
		if (px * px + pz * pz < r * r) lo = m;
		else hi = m;
	}
	return lo;
}
/** the spiral stairs: one each side of the middle, from the ground to the sky garden (their middles, radius) */
const STAIRS = [-1, 1].map((s) => ({ x: s * 12, z: 31.3, r: 1.7 }));
/** the front rooms' depth, the bath behind a suite */
const FRONT = 7.2;
const BATH = 3.2;
/**
 * THE ROOMS — every room of the north quarter as a rectangle in its own frame (`roomMatrix(level, x)`): `x` its middle
 * along the façade, `w` its width, `d0` … `d1` its depth from the glass in; `kind` what it is for (hall, library,
 * workshop, suite, bath, studio, lounge, stair, service) and `h` its clear height. Rooms side by side share a wall at
 * their edge; a suite's bath (and its studio, where the level is deep) stands behind it in the same bay.
 */
function planRooms() {
	const rooms = [];
	const add = (k, kind, x0, x1, d0, d1, extra = {}) => {
		const x = (x0 + x1) / 2, w = Math.abs(x1 - x0);
		// as deep as its middle has headroom; its outer corner may be cut by the shell (`outer`: the depth there)
		const end = Math.min(d1, deepAt(k, x));
		const outer = Math.min(d1, deepAt(k, Math.abs(x0) > Math.abs(x1) ? x0 : x1));
		if (w < 2.5 || end - d0 < 3) return;
		rooms.push({ id: `${LEVELS[k].name}-${kind}-${rooms.length}`, level: k, kind, x, w, d0, d1: end, outer, h: LEVELS[k].h - SLAB, ...extra });
	};
	for (let k = 0; k < LEVELS.length; k++) {
		const E = facadeEnd(k) - 0.6;
		for (const s of [-1, 1]) {
			const X = (a, b) => (s < 0 ? [-b, -a] : [a, b]);
			const bays = [];
			if (k === 0) {
				bays.push([9, 9.75, 'service'], [9.75, 14.25, 'stair'], [14.25, 24, s > 0 ? 'library' : 'workshop']);
				for (let a = 24; a + 6 <= E; a += 6.5) bays.push([a, Math.min(a + 6.5, E), 'suite']);
			} else {
				bays.push([4, 9.75, 'suite'], [9.75, 14.25, 'stair']);
				for (let a = 14.25; a + 5 <= E; a += 6.5) bays.push([a, Math.min(a + 6.5, E), 'suite']);
			}
			for (const [a, b, kind] of bays) {
				const [x0, x1] = X(a, b);
				if (kind === 'stair') add(k, 'stair', x0, x1, 0, 40);
				else if (kind === 'suite') {
					add(k, 'suite', x0, x1, 0, FRONT);
					add(k, 'bath', x0, x1, FRONT, FRONT + BATH);
					add(k, 'studio', x0, x1, FRONT + BATH, 40);
				} else if (kind === 'service') add(k, 'service', x0, x1, 0, 40);
				else {
					add(k, kind, x0, x1, 0, 12);
					add(k, 'service', x0, x1, 12, 40);
				}
			}
		}
		// the middle: the dining hall and its kitchen on the ground, a lounge over it on each level above
		if (k === 0) {
			add(0, 'hall', -9, 9, 0, 12);
			add(0, 'service', -9, 9, 12, 40);
		} else add(k, 'lounge', -4, 4, 0, k === 3 ? 40 : 9);
	}
	return rooms;
}
const ROOMS = planRooms();

/** the doors, by bearing (0 north, east π/2): three into the forest, one to the north for the house's own use */
const DOORS = [
	{ id: 'east', a: Math.PI / 2 },
	{ id: 'south', a: Math.PI },
	{ id: 'west', a: -Math.PI / 2 },
	{ id: 'north', a: 0, service: true }
];
/**
 * A door (Samuel 2026-11-05: larger than it was, a gate, a Tor, its arch round, about 4 m high, in mason's stone like
 * the arcade's): a round-arched gateway, straight limestone jambs `w` apart rising to `spring`, then a semicircular arch of
 * voussoirs with a keystone (`ring` deep), its top at `top`; two heavy oak gate leaves (`leaf` wide each, arched heads)
 * standing open, glazed in the arch above them. `hw` its half width, `foot` the threshold's width; the north one,
 * for the house's own use, smaller.
 */
const doorSize = (d) => {
	// about 4 m high (Samuel: "not 8 m … like 3 m or 4 m"): a wide, round, squat Tor, the semicircle on short jambs
	const o = d.service ? { w: 2.6, spring: 1.9, ring: 0.45 } : { w: 4, spring: 2, ring: 0.55 };
	return { ...o, r: o.w / 2, hw: o.w / 2, top: o.spring + o.w / 2, foot: o.w, leaf: o.w / 2 };
};

/**
 * THE PLANTS — play's own plants the forest is grown from, each named by the hash of its recipe file (an accepted
 * version in play's catalog: plants/<id>@<v>), never copied in. The page builds each where the dome marks it
 * (a node named `use:<hash>?seed=…&stage=…`) and draws it with its levels of detail. Stages 0 … 9 for each.
 * `h` its height grown (m, its build at its last stage), `w` its crown's width, the layer it stands in, `stages` its
 * last stage where it is not 9 (a stage asked for 0 … 9 is laid on its own, the last on its last).
 */
const PLANTS = {
	// canopy
	'king-coconut': { v: 1, hash: '36c753b13daf0bcde55996355c7096117cf3a0c862683726e9491db18dd22cee', layer: 'canopy', h: 15.6, w: 9.7 },
	mango: { v: 1, hash: '79608d49e2f966e3c9a0eff532f7fcb24cb785cb25e16afa9f6b89f948ab3c6f', layer: 'canopy', h: 7.5, w: 7.6 },
	jackfruit: { v: 3, hash: '4eaeacc79ff3804890891417ee7ac86ad9398761881c78412ab7ac5c07fadd38', layer: 'canopy', h: 9, w: 8.5 },
	durian: { v: 2, hash: 'a0249eb63e0bf53f96d1591d18bd08c4db33250114020b5e445b3a68a09277fa', layer: 'canopy', h: 10, w: 8 },
	// 'Fuerte', grown from its reference sheet (v3)
	avocado: { v: 3, hash: 'c87a1bee76bae8d4e9675612f712a177e7ace81979524911ae59d43c944bb347', layer: 'canopy', h: 6.4, w: 7.2 },
	sapodilla: { v: 1, hash: 'cb6dd6d2381da7f2bee1120bfa2e2065f5f4d4838df9b0048c4e4f4b0840e8ed', layer: 'canopy', h: 8, w: 6.5 },
	// below the canopy
	// 'Tarocco' (v2, eleven stages: 0 … 10) and 'Femminello Santa Teresa' (v2), grown flush by flush
	orange: { v: 2, hash: '31af60dad4b4f4fdc9b894d597b44d4f165c72c3225872dc71ec4d9b532f3372', layer: 'low', h: 5, w: 3.4, stages: 10 },
	lemon: { v: 2, hash: 'dcf1d1ba12bb3b71e89693dc75a1086bae72010e8fe865dc7dbba5007086b6ee', layer: 'low', h: 4.1, w: 3.7 },
	cacao: { v: 2, hash: '240837e0e234feb1be3418a80921feaa8f7c180e5bca3f0c87db17f03c463d54', layer: 'low', h: 6.4, w: 7.4 },
	soursop: { v: 2, hash: '75b99655073d960adf97a0761a54a2eac5e5e147158c897cce86467bec55edf4', layer: 'low', h: 6, w: 5 },
	// papaya v2 (Maia's, from 26 photographs) and the 'Dwarf Cavendish' banana (v2, from its reference sheet)
	papaya: { v: 2, hash: '6280e6ea87360b193bbe044dce3bdee65b60b67ad98c5c98e4369b28b928211f', layer: 'low', h: 3.2, w: 2.3 },
	banana: { v: 2, hash: 'daf1d37f0a4a3f84783a9ff9b555cf63a59dbcfb74a0301cf6799666ac324f88', layer: 'low', h: 3.4, w: 4 },
	'red-banana': { v: 1, hash: '4413ba1e7eddec87a2bda85335d6b88768c16a697f6fbb007939b3ed3f23fadf', layer: 'low', h: 6, w: 4.7 },
	fig: { v: 1, hash: 'aaffa509dfb980b65889477a4d5247570455f1ab5b06119a831d1edcde6e80fa', layer: 'low', h: 4.5, w: 5 },
	pomegranate: { v: 1, hash: 'e38e4dd6f4b122aae451f484edc9cba599adb67bc381fb51647a637cc0d078f4', layer: 'low', h: 4, w: 3.5 },
	// shrubs
	coffee: { v: 1, hash: '2b33b077ef0c0a63716e5396845d75a701f795dfc520dd9b1d0351e86b9c465b', layer: 'shrub', h: 2.5, w: 2 },
	pepper: { v: 1, hash: '7c48d80dd697801f49011598a7d52ed1694155c5dc036240e5ac57599732318c', layer: 'shrub', h: 1, w: 0.8 },
	// herbs and the ground
	ginger: { v: 1, hash: 'dc8bef9174dce599b1dd04b61e9c69386c4ea668e853fb19fb2eec185f96cde5', layer: 'herb', h: 1.2, w: 0.8 },
	comfrey: { v: 1, hash: 'c3c19e96d453f788d9dbe0304745e018c9cbeb5f22a2af5ede69e740504aac82', layer: 'herb', h: 0.9, w: 0.8 },
	basil: { v: 1, hash: '76947a593571ab762030bf3055654cd1d7390404083e460a65434c4e05d50785', layer: 'herb', h: 0.5, w: 0.4 },
	pineapple: { v: 1, hash: '16eed6a7af3fdb233243d62680cc4761ef5c33f7b4628a0a7f00a02f9bdcac29', layer: 'herb', h: 1, w: 1.2 },
	strawberry: { v: 1, hash: '05794d83dbe6711c0455740bbb7d0a37e273abd865d4b6f6b27ee47c6230a65b', layer: 'ground', h: 0.25, w: 0.4 },
	nasturtium: { v: 1, hash: '9b0a505c9cc5770ce98345159bef475a742d8a6817b05a26dbdd2bfb3c3f9705', layer: 'ground', h: 0.3, w: 0.6 },
	clover: { v: 1, hash: '7784d276d5bce4f40938e19a48fdefd392806c689fe51139d36d9bd36c132cb0', layer: 'ground', h: 0.2, w: 0.4 },
	// climbers and fungi
	'passion-fruit': { v: 1, hash: '32d1e8009d4d0932f810a7c1ba860d4e0f0be10503a8b4f72f8587c6ddda214c', layer: 'climber', h: 3, w: 2 },
	oyster: { v: 1, hash: '233303f8360c6252385499060504f21488fd52ef517f5ed863ff92ae51278645', layer: 'fungi', h: 0.2, w: 0.3 },
	shiitake: { v: 1, hash: '45c277b9024eb73ed26abf5503835c82163461ff4ac770cb9445a4fce335a2a1', layer: 'fungi', h: 0.2, w: 0.3 }
};

/**
 * THE FLOOR — the forest's floor is play's own biome, named by its recipe's hash: 'Food forest under glass'
 * (biomes/warm-food-forest@1, Sandbox 1's floor under its domes: green, litter, humus and moss, and a cover of grass,
 * clover, wild strawberry, wood sorrel, ferns, moss and fallen leaves). The ground part builds the terrain in 'soil'
 * (its look where the page can't lay the biome), cut away under the paths, the plaza and the water; the recipe names
 * those meshes `biome:<hash>`, and the page paints them with the biome's surfaces and streams its cover over them.
 */
const BIOME = { hash: '7be775be02b915dbda75d99cfec0b3edbb79c0a4950c0cd6258fd1406069b35f', label: 'Food forest under glass' };

/**
 * What the parts make the dome into: their bags by name (merged by material at the end), the plants marked, the lamps
 * lit (a point light each, at most LAMPS, and the walker's lamps), the places that must stay clear (`keep`: circles
 * a plant must not stand in), and the floors a walker starts on.
 */
const LAMPS = 12;
function newDome() {
	const dome = {
		root: new THREE.Group(),
		bags: {},
		/** the bag named `name`, made the first time */
		bag(name) {
			return (this.bags[name] ??= new Bag(name));
		},
		plants: [],
		lamps: [],
		walkLamps: [],
		keep: [],
		/**
		 * A plant of the library at [x, y, z]: its kind (a key of PLANTS), its stage (0 … 9), its seed (a sister plant), its
		 * turn round y and its scale. Marked by a node the page finds by its name.
		 */
		plant(kind, x, y, z, o = {}) {
			const p = PLANTS[kind];
			if (!p) throw new Error(`no plant ${kind}`);
			// asked 0 … 9 (9 ripe), laid on the plant's own stages
			const stage = Math.round((clamp(o.stage ?? 9, 0, 9) / 9) * (p.stages ?? 9));
			const seed = String(o.seed ?? 'maia').replace(/[^a-z0-9-]/gi, '').slice(0, 16) || 'maia';
			const node = new THREE.Group();
			node.name = `use:${p.hash}?seed=${seed}&stage=${stage}`;
			node.position.set(x, y, z);
			node.rotation.y = o.turn ?? 0;
			node.scale.setScalar(o.scale ?? 1);
			this.plants.push({ kind, x, y, z, stage, seed, node });
			return node;
		},
		things: [],
		/**
		 * A thing of the library (a key of THINGS: a bed, a lamp, a table) standing where `x` says: at [x, y, z] turned
		 * `turn` round y, or by a whole matrix (a room's frame times the thing's place in it). Marked by a node the page
		 * finds by its name and draws the thing at; the thing itself is play's own asset, never built here.
		 */
		place(thing, x, y, z, o = {}) {
			const t = typeof THINGS === 'undefined' ? undefined : THINGS[thing];
			if (!t) throw new Error(`no thing ${thing}`);
			const node = new THREE.Group();
			node.name = `use:${t.hash}`;
			if (x?.isMatrix4) node.applyMatrix4(x);
			else {
				node.position.set(x, y, z);
				node.rotation.y = o.turn ?? 0;
			}
			this.things.push({ thing, node });
			return node;
		},
		/** a light where a lamp is: a warm point light (while there are lights to give), and the walker's lamp */
		lamp(x, y, z, o = {}) {
			this.walkLamps.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]);
			if (this.lamps.length >= LAMPS) return null;
			const l = new THREE.PointLight(o.color ?? '#ffd9a8', o.intensity ?? 6, o.distance ?? 7, 2);
			l.position.set(x, y, z);
			this.lamps.push(l);
			return l;
		}
	};
	return dome;
}
