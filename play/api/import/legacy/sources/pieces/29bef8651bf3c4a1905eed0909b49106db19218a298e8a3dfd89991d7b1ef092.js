function cubeCast({ name, assemblies, steps, stepOf, sources = POWERCUBE_SOURCES, hums = true, ...o }) {
	const kit = machineKit(assemblies);
	const at = [
		0,
		0,
		0
	];
	powerCubeParts(kit, {
		at,
		base: "base",
		joints: {
			flywheel: "flywheel",
			coupling: "coupling",
			fan: "fan"
		},
		assembly: (g) => g,
		step: (g) => stepOf[g] ?? 1,
		prefix: "",
		...o
	});
	const built = kit.build();
	const j = powerCubeJoints(at);
	/** @type {BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: [
				0,
				0,
				0
			]
		},
		{
			name: "flywheel",
			parent: "base",
			at: j.flywheel
		},
		{
			name: "coupling",
			parent: "base",
			at: j.coupling
		},
		{
			name: "fan",
			parent: "base",
			at: j.fan
		},
		...built.bones
	];
	const r = rig(bones, built.pieces, [skin(.55, { side: three.DoubleSide })]);
	r.object.name = name;
	/** @param {number} t @param {boolean} run @returns {Pose} */
	const pose = (t, run) => {
		const { engine, fan } = powerCubeTurns(run && hums ? t : 0);
		return {
			flywheel: [
				0,
				0,
				engine
			],
			coupling: [
				0,
				0,
				engine
			],
			fan: [
				fan,
				0,
				0
			],
			root: [
				0,
				run && hums ? Math.sin(t * 50) * 8e-4 : 0,
				0
			]
		};
	};
	return {
		rig: r,
		clips: {
			run: (t) => pose(t, true),
			off: () => pose(0, false),
