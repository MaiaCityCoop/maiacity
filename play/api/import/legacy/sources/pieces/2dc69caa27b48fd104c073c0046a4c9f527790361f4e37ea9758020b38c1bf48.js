const M = /* @__PURE__ */ (() => ({
	wood: shared(() => new three.MeshStandardMaterial({
		color: "#b98a5a",
		roughness: .7
	})),
	darkWood: shared(() => new three.MeshStandardMaterial({
		color: "#8a6040",
		roughness: .7
	})),
	wool: shared(() => new three.MeshStandardMaterial({
		color: "#efe8da",
		roughness: 1
	})),
	felt: [
		"#b8674a",
		"#7d8f5c",
		"#c9a15a",
		"#6f7fa0"
	].map((c) => shared(() => new three.MeshStandardMaterial({
		color: c,
		roughness: 1
	}))),
	stone: shared(() => new three.MeshStandardMaterial({
		color: "#a39d92",
		roughness: .85
	})),
	pebble: shared(() => new three.MeshStandardMaterial({
		color: "#8d877c",
		roughness: .9
	})),
	basket: shared(() => new three.MeshStandardMaterial({
		color: "#c9a978",
		roughness: 1,
		side: three.DoubleSide
	})),
	water: shared(() => new three.MeshStandardMaterial({
		color: "#7fc9cf",
		roughness: .08,
		metalness: .1,
		transparent: true,
		opacity: .8
	})),
	brass: shared(() => new three.MeshStandardMaterial({
		color: "#b08d57",
		roughness: .35,
		metalness: .8
	})),
	book: [
		"#8a4b3a",
		"#4f6b5a",
		"#c9a15a",
		"#5b6a8a",
		"#a8683a"
	].map((c) => shared(() => new three.MeshStandardMaterial({
		color: c,
		roughness: .8
	})))
}))();
/** A rounded box, made once for each size and shared: every room asks for the same few. */
const rounded = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
const round = (w, h, d, r = .08) => {
	const key = `${w} ${h} ${d} ${r}`;
	let geo = rounded.get(key);
	if (!geo) rounded.set(key, geo = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)));
	return geo;
