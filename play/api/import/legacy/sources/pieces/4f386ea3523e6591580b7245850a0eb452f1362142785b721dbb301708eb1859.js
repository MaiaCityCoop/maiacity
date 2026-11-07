const MAT = {
	steel: (o) => mat({
		color: [
			.56,
			.57,
			.58
		],
		metalness: 1,
		roughness: .3,
		finish: "turned",
		...o
	}),
	steelDark: (o) => mat({
		color: [
			.24,
			.245,
			.25
		],
		metalness: 1,
		roughness: .42,
		finish: "cast",
		...o
	}),
	stainless: (o) => mat({
		color: [
			.67,
			.66,
			.64
		],
		metalness: 1,
		roughness: .2,
		finish: "brushed",
		...o
	}),
	chrome: (o) => mat({
		color: [
			.78,
			.79,
			.8
		],
		metalness: 1,
		roughness: .06,
		finish: null,
		...o
	}),
	aluminium: (o) => mat({
		color: [
			.88,
			.89,
			.9
		],
		metalness: 1,
		roughness: .38,
		finish: "cast",
		...o
	}),
	aluminiumMachined: (o) => mat({
		color: [
			.9,
			.9,
			.91
		],
		metalness: 1,
		roughness: .22,
		finish: "turned",
		...o
	}),
	anodised: (o) => mat({
		color: o?.color ?? [
			.08,
			.09,
			.1
		],
		metalness: .85,
		roughness: .34,
		finish: "cast",
		clearcoat: .2,
		...o
	}),
	titanium: (o) => mat({
		color: [
			.54,
			.5,
			.45
		],
		metalness: 1,
		roughness: .32,
		finish: "brushed",
		...o
	}),
	inconel: (o) => mat({
		color: [
			.47,
			.44,
			.41
		],
		metalness: 1,
		roughness: .42,
		finish: "cast",
		...o
	}),
	copper: (o) => mat({
		color: [
			.95,
			.64,
			.54
		],
		metalness: 1,
		roughness: .28,
		finish: "turned",
		...o
	}),
	brass: (o) => mat({
		color: [
			.91,
			.78,
			.42
		],
		metalness: 1,
		roughness: .24,
		finish: "turned",
		...o
	}),
	gold: (o) => mat({
		color: [
			1,
			.77,
			.34
		],
		metalness: 1,
		roughness: .18,
		finish: "brushed",
		...o
	}),
	bluedSteel: (o) => mat({
		color: [
			.08,
			.16,
			.5
		],
		metalness: 1,
		roughness: .16,
		finish: null,
		...o
	}),
	castIron: (o) => mat({
		color: [
			.3,
			.3,
			.3
		],
		metalness: .9,
		roughness: .62,
		finish: "cast",
		...o
	}),
	paint: (o) => mat({
		color: o?.color ?? [
			.8,
			.8,
			.8
		],
		metalness: 0,
		roughness: .32,
		clearcoat: .6,
		clearcoatRoughness: .2,
		finish: "smudge",
		...o
	}),
	satin: (o) => mat({
		color: o?.color ?? [
			.04,
			.04,
			.045
		],
		metalness: 0,
		roughness: .55,
		finish: "cast",
		...o
	}),
	plastic: (o) => mat({
		color: o?.color ?? [
			.05,
			.05,
			.055
		],
		metalness: 0,
		roughness: .42,
		finish: "cast",
		...o
	}),
	rubber: (o) => mat({
		color: [
			.025,
			.025,
			.027
		],
		metalness: 0,
		roughness: .82,
		finish: "cast",
		...o
	}),
	ceramic: (o) => mat({
		color: [
			.82,
			.8,
			.76
		],
		metalness: 0,
		roughness: .5,
		finish: "cast",
		...o
	}),
	carbon: (o) => mat({
		color: [
			1,
			1,
			1
		],
		map: tex("carbon"),
		metalness: .2,
		roughness: .36,
		clearcoat: 1,
		clearcoatRoughness: .05,
		finish: null,
		rep: [6, 6],
		...o
	}),
	glass: (o) => mat({
		color: [
			1,
			1,
			1
		],
		metalness: 0,
		roughness: .03,
		transmission: 1,
		thickness: .004,
		ior: 1.5,
		transparent: true,
		finish: null,
		noCap: true,
		...o
	}),
	sapphire: (o) => mat({
		color: [
			.96,
			.97,
			1
		],
		metalness: 0,
		roughness: 0,
		transmission: 1,
		thickness: .002,
		ior: 1.77,
		transparent: true,
		finish: null,
		noCap: true,
		...o
	}),
	ruby: (o) => mat({
		color: [
			.9,
			.08,
			.15
		],
		metalness: 0,
		roughness: .05,
		transmission: .6,
		thickness: .001,
		ior: 1.77,
		finish: null,
		...o
	}),
	enamel: (o) => mat({
		color: [
			.93,
			.92,
			.88
		],
		metalness: 0,
		roughness: .12,
		clearcoat: 1,
		clearcoatRoughness: .03,
		finish: null,
		...o
	}),
	fluid: (o) => mat({
		color: o?.color ?? [
			.3,
			.12,
			.05
		],
		metalness: 0,
		roughness: .08,
		clearcoat: 1,
		finish: null,
		...o
	}),
	glow: (o) => mat({
		color: [
			0,
			0,
			0
		],
		emissive: o?.emissive ?? [
			1,
			.5,
			.15
		],
		emissiveIntensity: o?.emissiveIntensity ?? 4,
		metalness: 0,
		roughness: 1,
		finish: null,
		...o
	})
};
function col(c) {
	return Array.isArray(c) ? new three.Color(c[0], c[1], c[2]) : new three.Color(c);
}
/** build a material from a preset description (see MAT) */
function mat(o) {
	const { finish, rep, cap, noCap, capRough, color, emissive, ...rest } = o;
	const m = new three.MeshPhysicalMaterial({ ...rest });
	m.color = col(color ?? [
		.8,
		.8,
		.8
	]);
	if (emissive !== void 0) m.emissive = col(emissive);
	if (finish) {
		const t = tex(finish).clone();
		t.needsUpdate = true;
		t.repeat.set(...rep ?? (finish === "turned" ? [1, 24] : finish === "brushed" ? [2, 6] : [3, 3]));
		m.roughnessMap = t;
		if (finish === "knurl") {
			m.bumpMap = t;
			m.bumpScale = .6;
		}
	}
	m.envMapIntensity = rest.envMapIntensity ?? 1;
	if (noCap) {
		m.side = three.FrontSide;
		m.clippingPlanes = LAB_PLANES;
		m.clipIntersection = true;
		m.clipShadows = true;
		ALL_MATS.add(m);
		return m;
	}
