//#piece 4a02c396ad62bcc353e0ee1be1e07c27cb15199254e83d201107ad6bae1109c0
//#region src/lib/actors/excavator-rig.js
/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}

//#endregion
//#piece e0556e058d8a742fce13fbfbdf080603a514937f1d08b5f0eb19a44f36b37a76
const PL = 1.2;
const PW = .8;
const PH = .144;
//#piece a18522ab9ae13c4bf24c12034d9fcf70ca210b7dcf0d2bb19d14cd990ffd1721
//#region src/lib/models/pallet.js
/** An empty Euro pallet lying along x, the middle of its underside at the origin: one mesh a piece. */
function pallet() {
	const g = new three.Group();
	g.name = "euro-pallet";
	const woods = /* @__PURE__ */ new Map();
	euroPallet((geo, color, _bone, mat) => {
		if (mat) return;
		if (!woods.has(color)) woods.set(color, new three.MeshStandardMaterial({
			color,
			roughness: .85,
			metalness: .04
		}));
		const m = new three.Mesh(geo, woods.get(color));
		m.castShadow = m.receiveShadow = true;
		g.add(m);
	}, [
		0,
		0,
		0
	], 0, "x", { stack: 0 });
//#piece 6cdc5762c73bb286f714fbc6acd254fa986c6b14ef152c0e519354fa53a2303f
	id: "euro-pallet",
	label: "Euro pallet",
	note: "an empty EPAL, 1200 × 800 mm and 144 mm high: five top boards on three cross boards, nine blocks under them and three bottom boards, in two woods. The machines carry it loaded (the goods pod, the forklift); a factory’s line stacks its raw material and its product on it",
	usedIn: "Factories",
	make: () => pallet()
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
