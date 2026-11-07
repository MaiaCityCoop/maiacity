	const body = new three.Color(L.body), neck = new three.Color(L.neck), wing = new three.Color(L.wing), tail = new three.Color(L.tail), red = new three.Color("#c8392b");
	const sheen = new three.Color("#1d3a2c"), white = new three.Color("#f3efe6"), t = new three.Color();
	const paint = (c, sf) => {
		const { p, n } = sf;
		const parts = [
			[body, sf.tag("feather") + sf.tag("thigh")],
			[neck, sf.tag("neck")],
			[wing, sf.tag("wing")],
			[tail, sf.tag("tail")]
		];
		c.setRGB(0, 0, 0);
		let sum = 0;
		for (const [col, w] of parts) {
			c.r += col.r * w;
			c.g += col.g * w;
			c.b += col.b * w;
			sum += w;
		}
		c.multiplyScalar(1 / (sum || 1));
		const scale = noise3(p.x * 260, p.y * 260, p.z * 260, 3);
		c.multiplyScalar(.94 + .1 * scale);
		if (kind === "barred") {
			const bar = Math.sin((p.y * .6 - p.z * .8) * 420 + 3 * fbm3(p.x * 40, p.y * 40, p.z * 40, 2, 5));
			t.set("#3a3c3d");
			c.lerp(white, ramp(bar, .1, .4) * .7).lerp(t, ramp(-bar, .2, .5) * .6);
		} else if (kind === "speckled") {
			const dot = noise3(p.x * 180, p.y * 180, p.z * 180, 11);
			c.lerp(white, ramp(dot, .45, .6)).lerp(t.set("#151210"), ramp(dot, .3, .42) * (1 - ramp(dot, .45, .6)) * .7);
		} else if (kind === "australorp" || kind === "rooster") {
			const shine = ramp(n.y, .2, .9) * (kind === "rooster" ? sf.tag("tail") + ramp(.25, .18, p.y) * sf.tag("feather") : 1);
			if (kind === "rooster") c.lerp(t.set("#15211b"), ramp(.3, .22, p.y) * sf.tag("feather") * ramp(p.z, -.02, .06));
			c.lerp(sheen, .35 * shine);
		} else if (kind === "red") {
			mix(c, "#b8743c", .4 * ramp(n.z, .3, .9) * sf.tag("feather"));
			mix(c, "#5a3418", .3 * sf.tag("neck") * ramp(fbm3(p.x * 300, p.y * 80, p.z * 300, 2, 4), .1, .4));
		}
		if (!chick && sf.main === "neck" && Math.hypot(Math.abs(p.x) - .025 * k, p.y - j.head[1] - .005, p.z - j.head[2] - .018) < .016 * k) mix(c, red, .8);
	};
	const parts = [{ skin: s.skin(chick ? .003 : kind === "rooster" ? .0076 : .0068, paint, `chicken-${kind}`) }];
	const beakC = kind === "australorp" ? "#3c3a38" : chick ? "#e8a84a" : "#e0b45a";
	const hb = j.head, by = hb[1], bz = hb[2];
	/** the head's radius: the face is laid out on it */
	const rh = chick ? .022 : kind === "rooster" ? .0315 : .03;
	parts.push({
		geo: spike([
			0,
			by - .07 * rh,
			bz + .78 * rh
		], [
			0,
			-.28,
			1
		], .4 * rh, (chick ? .6 : 1.12) * rh, { flat: .8 }),
		color: beakC,
		bone: "head"
	});
	parts.push(...eyes([
		.73 * rh,
		by + .2 * rh,
		bz + .4 * rh
	], (chick ? .25 : .21) * rh, [
		.9,
		.1,
		.42
	], chick ? "#1a1410" : "#d4762a", "round", "head", {
		irisR: .75,
		pupilR: .42
	}));
	if (!chick) {
		const c = L.comb;
		const flop = kind === "leghorn" ? .5 : 0;
		for (let i = 0; i < 5; i++) {
			const z = bz - .018 + i * .012, h = (.018 + .012 * Math.sin(Math.PI * (i + .5) / 5)) * c;
			parts.push({
				geo: egg([
					flop * h * .4,
					by + .024 + h * .5,
					z
				], [
					.004,
					h * .55,
					.0075
				], [
					0,
					0,
					-flop
				]),
				color: "#c8392b",
				bone: "head"
			});
		}
		parts.push({
			geo: egg([
				0,
				by + .024 + .006 * c,
				bz + .004
			], [
				.004,
				.009 * c,
				.03
			], [
				0,
				0,
				-flop * .6
			]),
			color: "#c8392b",
			bone: "head"
		});
		for (const x of [-1, 1]) {
			parts.push({
				geo: egg([
					x * .007,
					by - .026 * c,
					bz + .018
				], [
					.006,
					.014 * c,
					.01
				]),
				color: "#c8392b",
				bone: "head"
			});
			parts.push({
				geo: egg([
					x * .027 * k,
					by - .006,
					bz - .006
				], [
					.003,
					.007,
					.006
				]),
				color: L.lobe,
				bone: "head"
			});
		}
		const fan = kind === "rooster" ? 7 : 6;
		for (let i = 0; i < fan; i++) {
			const a = (i / (fan - 1) - .5) * .9;
			const len = (kind === "rooster" ? .13 : .09) * (1 - Math.abs(a) * .4);
			const base = at([
				Math.sin(a) * .03,
				.34,
				-.15
			]);
			const dir = new three.Vector3(Math.sin(a) * .35, .75, -.6).normalize();
			const mid = [
				base[0] + dir.x * len * .5,
				base[1] + dir.y * len * .5,
				base[2] + dir.z * len * .5
			];
			parts.push({
				geo: egg(mid, [
					.004,
					len * .5,
					.022
				], [
					Math.atan2(-dir.z, dir.y),
					0,
					-Math.sin(a) * .6
				]),
				color: L.tail,
				bone: "tail"
			});
		}
		if (kind === "rooster") for (const x of [-1, 1]) for (let i = 0; i < 2; i++) {
			const pts = [];
			for (let q = 0; q <= 6; q++) {
				const u = q / 6, a = .2 + u * 2.6;
				pts.push([
					x * (.015 + .012 * i),
					.4 + .12 * Math.sin(a) * (1 - .15 * i),
					-.15 - .13 * (1 - Math.cos(a)) * .6 - .05 * u
				]);
			}
			for (let q = 0; q < 6; q++) parts.push({
				geo: limb(pts[q], pts[q + 1], .009 - q * .0011, .008 - q * .0011, {
					flat: .35,
					seg: 6
				}),
				color: "#121a17",
				bone: "tail"
			});
		}
	}
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const ankle = [
			x * j.leg[2][0],
			j.leg[2][1],
			j.leg[2][2]
		], toes = [
			x * j.leg[3][0],
			j.leg[3][1],
			j.leg[3][2]
		];
		parts.push({
			geo: limb([
				ankle[0],
				ankle[1] + .008 * k,
				ankle[2]
			], toes, .0085 * k, .007 * k, { seg: 7 }),
			color: L.legs,
			bone: `tarsus${side}`
		});
