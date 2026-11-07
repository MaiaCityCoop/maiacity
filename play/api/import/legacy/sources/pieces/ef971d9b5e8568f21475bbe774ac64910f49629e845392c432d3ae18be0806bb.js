	paint: shared(() => new three.MeshStandardMaterial({
		color: "#3d6a8f",
		roughness: .35,
		metalness: .35
	})),
	glass: shared(() => new three.MeshStandardMaterial({
		color: "#1c2630",
		roughness: .08,
		metalness: .5
	})),
	tyre: std("#1f1f1f", .9),
	rim: std("#9a9ea2", .35, { metalness: .8 }),
	trim: std("#2a2c2e", .6),
	light: shared(() => new three.MeshStandardMaterial({
		color: "#f4f1e2",
		emissive: "#f4ecc8",
		emissiveIntensity: .5
	})),
	tail: shared(() => new three.MeshStandardMaterial({
		color: "#b3261e",
		emissive: "#7a140f",
		emissiveIntensity: .4
	})),
	bedliner: std("#2b2b2b", .95),
	jerry: std("#3f5a2a", .6),
	box: std("#b6b8b8", .35, { metalness: .75 }),
	genset: std("#d9a332", .5, { metalness: .2 }),
	skid: std("#3a3c3e", .55, { metalness: .4 }),
	louvre: std("#2d2f31", .7),
	steel: std("#8b8f92", .4, { metalness: .7 }),
	screen: shared(() => new three.MeshStandardMaterial({
		color: "#16303a",
		emissive: "#2c7f8f",
		emissiveIntensity: .6
	})),
	galv: std("#aeb3b5", .45, { metalness: .4 }),
	concrete: std("#b9b5ab", .95),
	cabinet: std("#ecebe6", .45, { metalness: .1 }),
	ok: shared(() => new three.MeshStandardMaterial({
		color: "#3fbf6a",
		emissive: "#3fbf6a",
		emissiveIntensity: .9
	})),
	warn: std("#f2c230", .5),
	cable: std("#161616", .7)
}))();
