	}
	const s = b.getSize(new three.Vector3());
	return Math.max(s.x, s.y, s.z);
}
/**
* A plant grown from `seed` to its last stage, ripe, once for all the viewer needs of it then: the plant itself, the
* fruit it bears and which of them the seed picks — one of the well-grown ones, not a straggler (`fruit` undefined if
* it bears none).
* @param {(g: number, seed: string) => THREE.Group} grow @param {number} last @param {string} seed
* @returns {{ plant: THREE.Group, fruit: { keys: string[], pick: string } | undefined }}
*/
function ripeOf(grow, last, seed) {
	const { plant, fruits } = pickFruit(() => grow(last, seed));
	return {
		plant,
		fruit: fruits.length ? pick$1(fruits, seed) : void 0
	};
}
/** of a plant's fruit, the well-grown ones, and the one the seed picks @param {Fruit[]} fruits @param {string} seed */
function pick$1(fruits, seed) {
	const sized = fruits.map((f) => ({
		key: f.key,
		size: sizeOf(f)
	}));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * .7);
	const r = chance(seed, "one-fruit");
	return {
		keys: good.map((f) => f.key),
		pick: good[Math.floor(r() * good.length)].key
	};
}
/**
* The fruit named `key` of the plant grown from `seed` at `g`, on its own: hanging from its stalk at the origin, its
* own small differences given it by the seed. Undefined if it has not set yet at g.
* @param {(g: number, seed: string) => THREE.Group} grow @param {number} g @param {string} seed @param {string} key
* @returns {THREE.Group | undefined}
*/
function oneFruit(grow, g, seed, key) {
	const { plant, fruits } = lite({ fruit: key }, () => pickFruit(() => grow(g, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return void 0;
	const hang = new three.Matrix4().makeRotationFromQuaternion(new three.Quaternion().setFromUnitVectors(f.dir, new three.Vector3(0, -1, 0))).multiply(new three.Matrix4().makeTranslation(-f.at.x, -f.at.y, -f.at.z));
	for (const p of f.parts) p.geometry.applyMatrix4(hang);
	vary(f, chance(seed, "one-fruit-shape", key));
	const group = new three.Group();
	/** @type {Record<string, THREE.BufferGeometry[]>} */
	const kinds = {};
	for (const p of f.parts) (kinds[p.kind === "prop" ? "body" : p.kind] ??= []).push(p.geometry);
	for (const [kind, list] of Object.entries(kinds)) {
		const merged = list.length === 1 ? list[0] : (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(list);
		if (list.length > 1) for (const g of list) g.dispose();
		if (!merged) continue;
		const mesh = new three.Mesh(merged, material(kind));
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		group.add(mesh);
	}
	return group;
}
/**
* A fruit's own small differences, worked into its pieces where they hang (stalk at the origin, body down -y).
* @param {Fruit} f @param {() => number} r
*/
