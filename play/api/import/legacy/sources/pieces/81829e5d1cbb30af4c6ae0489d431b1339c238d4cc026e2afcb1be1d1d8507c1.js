//#piece 028d9c8b164630a319390e36ae83ada6c4bbc3b6b56e9d610c597b765b99e4a4
const col$1 = (c, rough = .8) => new three.MeshStandardMaterial({
	color: c,
	roughness: rough
});
const MAT = /* @__PURE__ */ (() => ({
	strut: col$1("#8a6040", .8),
	log: col$1("#b98a5a", .75),
	darkLog: col$1("#7a5434", .85),
//#piece 4830a2a7ce2681eca2736ca42baba26681280c20966748ed8e8c562cf5c17031
	oak: col$1("#a8774c", .8),
	straw: col$1("#d8c38a", 1),
	hay: col$1("#cdb874", 1),
	grass: col$1("#7f9a52", 1),
	sand: col$1("#e3cf9c", 1),
	steel: new three.MeshStandardMaterial({
		color: "#9aa0a2",
		roughness: .35,
		metalness: .7
	}),
	rope: col$1("#d8c8a0", 1),
	slide: new three.MeshStandardMaterial({
		color: "#d9b36a",
		roughness: .4,
		side: three.DoubleSide
	}),
	egg: col$1("#e9dcc6", .55),
	brownEgg: col$1("#c79a6a", .55),
//#piece c5e449c2a1207f8e6a512cb7dfee19ea2b757021a4f6c1876a4e6d838ae81df1
