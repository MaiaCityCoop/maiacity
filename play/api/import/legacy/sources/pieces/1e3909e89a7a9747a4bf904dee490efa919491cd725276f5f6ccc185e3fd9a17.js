*/
function groundPicture(weights, radius) {
	const layers = SURFACES.map((s, i) => ({
		s,
		i,
		w: weights[s] ?? 0
	})).filter((l) => l.w > 0);
	const px = layers.map((l) => pixelsOf(TEXTURES[l.s]()));
	if (px.some((p) => !p)) return null;
	const c = document.createElement("canvas");
	c.width = c.height = PX;
	const ctx = c.getContext("2d");
	const img = ctx?.createImageData?.(PX, PX);
	if (!(img?.data instanceof Uint8ClampedArray)) return null;
	const out = [
		0,
		0,
		0
	];
	const read = (p, u, v) => {
		const x = fract(u) * p.w - .5, y = (1 - fract(v)) * p.h - .5;
		const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
		for (let k = 0; k < 3; k++) {
			const at = (xx, yy) => p.data[((yy % p.h + p.h) % p.h * p.w + (xx % p.w + p.w) % p.w) * 4 + k];
			const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
			out[k] = lin(a + (b - a) * fy);
		}
		return out;
	};
	const cos = .8253, sin = .5646;
	for (let j = 0; j < PX; j++) for (let i = 0; i < PX; i++) {
		const bx = radius * ((i + .5) / PX * 2 - 1), by = radius * ((1 - (j + .5) / PX) * 2 - 1);
		const swap = smoothstep(.32, .68, vn(bx * .23 + 5.1, by * .23 + 5.1));
		let r = 0, g = 0, b = 0, sum = 0;
		layers.forEach((l, n) => {
			const P = SURFACE[l.s].patch, T = SURFACE[l.s].tile;
			const f = fbm2(bx / P + l.i * 17.3, by / P + l.i * 17.3), s = l.w * Math.pow(.35 + f, 6);
			const u = bx / T + l.i * .37, v = by / T + l.i * .37;
			const p = px[n];
			const [r1, g1, b1] = read(p, u, v);
			const [r2, g2, b2] = read(p, (cos * u - sin * v) * .83 + .41, (sin * u + cos * v) * .83 + .41);
			r += (r1 + (r2 - r1) * swap) * s;
			g += (g1 + (g2 - g1) * swap) * s;
			b += (b1 + (b2 - b1) * swap) * s;
			sum += s;
		});
		const shade = (.82 + .32 * fbm2(bx * .021 + 11, by * .021 + 11)) / Math.max(sum, 1e-5);
		const o = (j * PX + i) * 4;
		img.data[o] = srgb(r * shade);
		img.data[o + 1] = srgb(g * shade);
		img.data[o + 2] = srgb(b * shade);
		img.data[o + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	const t = new three.CanvasTexture(c);
	t.colorSpace = three.SRGBColorSpace;
	t.anisotropy = 8;
	return t;
}
/**
* A biome's floor as a patch RADIUS metres round: its ground and its cover, its card's catalog its parts and numbers.
* @param {import('./index.js').Recipe} recipe
* @param {{ ref: (kind: string, i: number) => string }} kinds the asset each kind of its cover is
*/
function floorPatch(recipe, kinds) {
	const root = new three.Group();
	root.name = recipe.id;
	const picture = groundPicture(recipe.surface, 6);
	const ground = new three.Mesh(new three.CircleGeometry(6, 96).rotateX(-Math.PI / 2), new three.MeshStandardMaterial({
		color: picture ? "#ffffff" : "#5d6b3a",
		map: picture,
		roughness: 1
	}));
	ground.name = "ground";
	ground.receiveShadow = true;
	root.add(ground);
	const n = Math.ceil(6 / TILE);
	/** @type {number[][]} */
	const laid = recipe.cover.map(() => []);
	for (let ix = -1; ix < n; ix++) for (let iz = -1; iz < n; iz++) coverTile(recipe, ix, iz, { tile: TILE }).forEach(({ m }, k) => {
		for (let i = 0; i < m.length / 16; i++) if (Math.hypot(m[i * 16 + 12], m[i * 16 + 14]) < 5.85) laid[k]?.push(...m.subarray(i * 16, i * 16 + 16));
	});
	const at = new three.Matrix4();
	recipe.cover.forEach((c, k) => {
		const list = laid[k];
		if (!list.length) return;
		const built = COVER[c.kind].build(coverSeed(k, c.kind));
		/** @type {THREE.Mesh[]} */
		const meshes = [];
		built.updateMatrixWorld(true);
		built.traverse((o) => o.isMesh && meshes.push(o));
		const kind = new three.Group();
		kind.name = `cover-${c.kind}`;
		for (const mesh of meshes) {
			const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
			const copies = new three.InstancedMesh(geo, mesh.material, list.length / 16);
			for (let i = 0; i < copies.count; i++) copies.setMatrixAt(i, at.fromArray(list, i * 16));
			copies.castShadow = true;
			copies.receiveShadow = true;
			copies.computeBoundingSphere();
			kind.add(copies);
		}
		root.add(kind);
	});
	root.userData.catalog = biomeCatalog(recipe, {
		ref: kinds.ref,
		label: (kind) => COVER[kind].label
	});
	return root;
}

//#endregion
//#region src/lib/biomes/floors.js
/** the cover's version every biome's kinds are of (as ./built.js's HISTORY has it) */
const COVER_V = 1;
/**
* A biome's patch, its note and where it is met, each kind of its cover the cover's asset at its seed.
* @param {string} id
*/
const floor = (id) => {
	const b = BIOMES.find((x) => x.id === id);
	return {
		note: b.note,
		from: b.from,
		make: () => floorPatch(b, { ref: (kind, i) => `biomes/cover@${COVER_V}:${kind}?seed=${coverSeed(i, kind)}` })
	};
};
const FLOORS = /* @__PURE__ */ (() => [{
