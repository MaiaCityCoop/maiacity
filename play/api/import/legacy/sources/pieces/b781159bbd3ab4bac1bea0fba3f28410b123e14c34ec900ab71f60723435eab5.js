	frame: std("#3d3f41", .6, { metalness: .4 }),
	casting: std("#2f3032", .7, { metalness: .5 }),
	steel: std("#c9cdd0", .32, { metalness: .45 }),
	steelDark: std("#8e9396", .35, { metalness: .45 }),
	galv: std("#aeb3b5", .45, { metalness: .4 }),
	chrome: std("#e2e2e2", .18, { metalness: .55 }),
	black: std("#1b1c1e", .55),
	graphite: std("#34373a", .5, { metalness: .3 }),
	white: std("#f1f0ec", .45),
	cream: std("#e9e4d8", .6),
	lining: std("#ecebe6", .85),
	grey: std("#d6d6d1", .6),
	rubber: std("#262729", .9),
	cardboard: std("#b48d5c", .9),
	sack: std("#d8c8a2", .95),
	pine: std("#d9b47e", .7),
	pineDark: std("#b98d55", .7),
	osb: std("#c9a46a", .85),
	beech: std("#d8b27f", .5),
	red: std("#b8262b", .4, { metalness: .2 }),
	tool: std("#e8a317", .45),
	teal: std("#16838c", .45),
	blue: std("#2a5fa4", .45, { metalness: .2 }),
	green: std("#2f8a4a", .5),
	orange: std("#e0661f", .5),
	yellow: std("#f2c230", .5),
	glass: shared(() => new three.MeshPhysicalMaterial({
		color: "#dcebef",
		roughness: .05,
		transmission: .9,
		transparent: true,
		opacity: .28,
		depthWrite: false
	})),
	frosted: shared(() => new three.MeshPhysicalMaterial({
		color: "#eef3f4",
		roughness: .55,
		transmission: .6,
		transparent: true,
		opacity: .8
	})),
	mirror: std("#c8d3d8", .06, { metalness: .35 }),
	led: shared(() => new three.MeshStandardMaterial({
		color: "#ffffff",
		emissive: "#fff4e2",
		emissiveIntensity: 2
	})),
	ledGreen: shared(() => new three.MeshStandardMaterial({
		color: "#2bd46a",
		emissive: "#2bd46a",
		emissiveIntensity: 2.5
	})),
	ledBlue: shared(() => new three.MeshStandardMaterial({
		color: "#3fa4ff",
		emissive: "#3fa4ff",
		emissiveIntensity: 2.5
	})),
	ledRed: shared(() => new three.MeshStandardMaterial({
		color: "#ff3b30",
		emissive: "#ff3b30",
		emissiveIntensity: 2.5
	})),
	heat: shared(() => new three.MeshStandardMaterial({
		color: "#ff8a3c",
		emissive: "#ff5a1c",
		emissiveIntensity: 1.6
	}))
}))();
