*/
const coverSeed = (i, kind) => 7100 + i * 13 + kind.length * 31;

//#endregion
//#region src/lib/biomes/card.js
/** the specs' names, as the card shows them to people and a world reads them back */
const WEIGHT = "Weight";
const DENSITY = "Plants a square metre";
const SHARE = "Share";
const COLONY = "Colony across";
const SPREAD = "Ground its colonies take";
const FILL = "How full its colonies are";
const ON = "Grows on";
/** a number as a spec writes it: as it is, so it reads back the same @param {number} n */
const num = (n) => String(Number(n));
/**
* A biome's parts as a card's catalog: its surfaces and its cover, each with its numbers.
* @param {import('./index.js').Recipe} recipe
* @param {{ ref: (kind: string, i: number) => string, label: (kind: string) => string }} kinds the asset each kind of its
*   cover is, and its name
*/
function biomeCatalog(recipe, kinds) {
	const ground = SURFACES.filter((s) => (recipe.surface[s] ?? 0) > 0).map((s) => ({
		id: `ground-${s}`,
		label: SURFACE[s].label,
		assembly: "ground",
		what: "A surface of the ground, painted in patches that run into the others; its weight is how much of the floor it takes against them.",
		specs: [[WEIGHT, num(recipe.surface[s])]]
	}));
	const cover = recipe.cover.map((c, i) => ({
		id: `cover-${c.kind}`,
		label: kinds.label(c.kind),
		assembly: "cover",
		what: "A kind of the cover, standing in colonies of its own on the surface it belongs on.",
		ref: kinds.ref(c.kind, i),
		specs: [
			[SHARE, num(c.share)],
			[COLONY, `${num(c.colony)} m`],
			[SPREAD, num(c.spread)],
			...c.fill === void 0 ? [] : [[FILL, num(c.fill)]],
			...c.on ? [[ON, c.on]] : []
		]
	}));
	return {
		assemblies: [{
			id: "ground",
			label: "The ground",
			note: "The surfaces it is painted with, each in patches of its own size."
		}, {
			id: "cover",
			label: "The cover",
			note: "What grows and lies on it, kind by kind, each in its colonies."
		}],
		parts: [
			...ground,
			{
				id: "density",
				label: "How dense the cover stands",
				assembly: "cover",
				what: "How many plants (or things) of the cover stand on a square metre inside their colonies.",
				specs: [[DENSITY, num(recipe.density)]]
			},
			...cover
		]
	};
}

//#endregion
//#region src/lib/biomes/stream.js
/** @typedef {{ m: Float32Array, rank: Float32Array }[]} TileKinds each kind's plants in a tile, by rank, least first */
/**
* One tile of a biome's cover, worked out from its place alone (the same tile, the same plants, every time): each kind's
* plants in it (by its index in `recipe.cover`), their places and their ranks, least first.
* @param {import('./index.js').Recipe} recipe @param {number} ix @param {number} iz
* @param {{ tile?: number, seed?: number, density?: number, open?: (x: number, z: number) => boolean, origin?: [number, number], hidden?: Set<number> }} [o]
* @returns {TileKinds}
*/
function coverTile(recipe, ix, iz, o = {}) {
	const tile = o.tile ?? 12, seed = o.seed ?? 1, hidden = o.hidden ?? /* @__PURE__ */ new Set();
	const [ox, oz] = o.origin ?? [0, 0];
	const r = rng(ix * 73856093 ^ iz * 19349663 ^ seed * 83492791);
	/** @type {{ rank: number, m: THREE.Matrix4 }[][]} */
	const at = recipe.cover.map(() => []);
	const s = 1 / Math.sqrt(o.density ?? recipe.density), x0 = ix * tile, z0 = iz * tile;
	const q = new three.Quaternion(), up = new three.Vector3(0, 1, 0), p = new three.Vector3(), sc = new three.Vector3();
	for (let x = x0; x < x0 + tile; x += s) for (let z = z0; z < z0 + tile; z += s) {
		const px = x + r() * s, pz = z + r() * s;
		const k = coverAt(recipe, r, px + ox, pz + oz, hidden);
		const turn = r() * Math.PI * 2, size = .75 + r() * .6, rank = r();
		if (k < 0 || o.open && !o.open(px, pz)) continue;
		at[k]?.push({
			rank,
			m: new three.Matrix4().compose(p.set(px, 0, pz), q.setFromAxisAngle(up, turn), sc.setScalar(size))
		});
	}
	return at.map((list) => {
		list.sort((a, b) => a.rank - b.rank);
		const m = new Float32Array(list.length * 16), rank = new Float32Array(list.length);
		list.forEach((e, i) => {
			e.m.toArray(m, i * 16);
			rank[i] = e.rank;
		});
		return {
			m,
			rank
		};
	});
}

//#endregion
//#region src/lib/biomes/patch.js
/** how far the patch reaches from its middle (m) */
const RADIUS = 6;
/** the side of the ground's picture (pixels): about 2.3 cm a pixel */
const PX = 512;
/** the tiles of the cover, as a world lays them (m) */
const TILE = 8;
/** a texture's pixels, to read the way a shader reads it (repeating, its rows upside down as three.js uploads them) */
function pixelsOf(t) {
	const c = t.image;
	const data = c?.getContext?.("2d")?.getImageData?.(0, 0, c.width, c.height)?.data;
	return data instanceof Uint8ClampedArray && data.length === c.width * c.height * 4 ? {
		data,
		w: c.width,
		h: c.height
	} : null;
}
/** sRGB to linear light, and back */
const lin = (v) => (v /= 255) <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const srgb = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055)));
const fract = (x) => x - Math.floor(x);
const smoothstep = (a, b, v) => {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
/**
* The ground of the patch as one picture: the shader's sums (./surfaces.js `groundMaterial`) worked out for each of its
* pixels. Null where nothing can be painted (a stand-in canvas outside a page or the box: the card needs no picture).
* @param {import('./surfaces.js').Weights} weights @param {number} radius
