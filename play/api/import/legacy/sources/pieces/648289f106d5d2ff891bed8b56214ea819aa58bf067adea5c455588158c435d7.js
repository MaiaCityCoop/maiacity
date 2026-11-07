const mats = () => {
	return {
		stone: (rx, ry = rx) => surface(`stone ${k2(rx)} ${k2(ry)}`, () => new three.MeshStandardMaterial({
			map: tiled(flagstone().map, k2(rx), k2(ry)),
			bumpMap: tiled(flagstone().bump, k2(rx), k2(ry)),
			bumpScale: 2,
			roughness: .85
		})),
		lime: (rx, ry = rx) => surface(`lime ${k2(rx)} ${k2(ry)}`, () => new three.MeshStandardMaterial({
			map: tiled(limestone(), k2(rx), k2(ry)),
			roughness: .9
		})),
		oak: (rx, ry = rx) => surface(`oak ${k2(rx)} ${k2(ry)}`, () => new three.MeshStandardMaterial({
			map: tiled(oak(), k2(rx), k2(ry)),
			roughness: .82,
			envMapIntensity: .4
		})),
		soil: (rep) => surface(`soil ${k2(rep)}`, () => new three.MeshStandardMaterial({
			map: tiled(soil(), k2(rep)),
			roughness: 1
		})),
		water: (rep) => surface(`water ${k2(rep)}`, () => new three.MeshPhysicalMaterial({
			map: tiled(water(), k2(rep)),
			roughness: .08,
			metalness: 0,
			transparent: true,
			opacity: .88,
			envMapIntensity: 1.4
		})),
		steel: new three.MeshStandardMaterial({
			color: "#2e3236",
			roughness: .4,
			metalness: .7
		}),
		timberFrame: new three.MeshStandardMaterial({
			color: "#9c6b3f",
			roughness: .6
		}),
		get solar() {
			return solarGlass();
		},
		glass: withSheen(new three.MeshPhysicalMaterial({
			color: "#eef6f4",
			roughness: .04,
			metalness: 0,
			transparent: true,
			opacity: .1,
			envMapIntensity: 1.5,
			side: three.DoubleSide,
			depthWrite: false
		})),
		canvas: new three.MeshStandardMaterial({
			color: "#efe8da",
			roughness: .95,
			side: three.DoubleSide
		}),
		linen: new three.MeshStandardMaterial({
			color: "#f1ece2",
			roughness: .95
		}),
		cushion: new three.MeshStandardMaterial({
			color: "#c47a4a",
			roughness: .9
		}),
		sofa: new three.MeshStandardMaterial({
			color: "#c9b596",
			roughness: .95
		}),
		counter: new three.MeshStandardMaterial({
			color: "#f3f1ec",
			roughness: .3
		}),
		dark: new three.MeshStandardMaterial({
			color: "#23262a",
			roughness: .5,
			metalness: .4
		}),
		paper: new three.MeshStandardMaterial({
			color: "#fff4e2",
			emissive: "#ffd9a0",
			emissiveIntensity: .6,
			roughness: .9
		}),
		rug: new three.MeshStandardMaterial({
			color: "#b9a589",
			roughness: 1
		}),
		pebble: new three.MeshStandardMaterial({
			color: "#8d8a83",
			roughness: .9
		}),
		tank: new three.MeshStandardMaterial({
			color: "#56666b",
			roughness: .5,
			metalness: .3
		}),
		get grass() {
			return meadow();
		}
