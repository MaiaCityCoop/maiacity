//#piece 1e2b17470c79ceb1daa9c1c785aa97a42cb96467353a4fc54ef9743f9fc9bc57
//#piece 8d9065a8cc6dec5b55423a03a1b69de1e2dd8d2e270c671fadcca7fc3ff61b42
//#region src/lib/models/tent.js
const m = /* @__PURE__ */ (() => ({
	tube: std("#a9afb3", .4, { metalness: .7 }),
	hub: std("#55595d", .5, { metalness: .6 }),
	zip: std("#26282a", .7),
	cord: std("#2a2a2a", .8),
	bulb: std("#fff1d6", .3, {
		emissive: "#ffcf8a",
		emissiveIntensity: .6
	}),
	bag: std("#6b6a48", .92),
	strap: std("#1e1f1f", .75),
	buckle: std("#111213", .45),
	sack: std("#4b4a33", .95),
	wood: std("#9a7a52", .85)
}))();
