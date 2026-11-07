	s.lineTo(span * .35, -chord * .95);
	s.quadraticCurveTo(span * .12, -chord * 1.02, 0, -chord * .85);
	s.lineTo(0, 0);
	const g = new three.ExtrudeGeometry(s, {
		depth: chord * .05,
		bevelEnabled: false,
		curveSegments: 4
	});
	g.translate(0, 0, -chord * .025);
	const span3 = SPAN_F.clone(), lead3 = LEAD_F.clone(), norm3 = NORM_F.clone().multiplyScalar(x);
	const place = new three.Matrix4().makeBasis(span3, lead3, norm3);
	place.setPosition(shoulder[0] - x * chord * .08, shoulder[1] - chord * .05, shoulder[2]);
	g.applyMatrix4(place);
	const o = new three.Vector3(...shoulder);
	return {
		geo: g,
		color: (p) => {
			const d = p.clone().sub(o);
			return color(Math.max(0, Math.min(1, d.dot(span3) / span)), Math.max(0, Math.min(1, -d.dot(lead3) / chord)));
		},
		bone
	};
}
/**
* A songbird, rigged, with its moves.
* @param {Songbird} [kind]
* @returns {Cast}
*/
function songbird(kind = "robin") {
	const L = LOOK[kind], k = L.k;
	/** @type {import('../plans/bird').BirdJoints} */
	const J = {
		body: at(sunk(ROBIN.body), k),
		neck: ROBIN.neck.map((p) => at(sunk(p), k)),
		head: at(sunk(ROBIN.head), k),
		beak: at(sunk(ROBIN.beak), k),
		tail: at(sunk(ROBIN.tail), k),
		wing: at(sunk(ROBIN.wing), k),
		leg: ROBIN.leg.map((p, i) => at(i < 2 ? sunk(p) : i === 2 ? [
			p[0],
			p[1] - SINK * .6,
			p[2]
		] : p, k))
	};
	const b = birdSkeleton(J);
	const jawAt = [
		0,
		J.head[1] - .003 * k,
		J.head[2] + .009 * k
	];
	const bones = [...b.bones, {
		name: "jaw",
		parent: "head",
		at: jawAt
	}];
	const s = sculpt(bones);
	const feather = {
		bump: 7e-4 * k,
		lumps: .003 * k
	};
	const fat = kind === "robin" || kind === "greattit" ? 1.06 : 1;
	s.egg(at(sunk([
		0,
		.054,
		-.002
	]), k), [
		.0195 * k * fat,
		.02 * k * fat,
		.031 * k
	], {
		bone: "body",
		tag: "back",
		...feather
	}, [
		.5,
		0,
		0
	]);
	s.egg(at(sunk([
		0,
		.057,
		.013
	]), k), [
		.018 * k * fat,
		.019 * k * fat,
		.018 * k
	], {
		bone: "body",
		k: .008 * k,
		tag: "breast",
		...feather
	});
	s.egg(at(sunk([
		0,
		.045,
		-.004
	]), k), [
		.015 * k,
		.011 * k,
		.02 * k
	], {
		bone: "body",
		k: .007 * k,
		tag: "belly",
		...feather
	});
	s.cone(J.neck[0], J.head, .0135 * k, .012 * k, {
		chain: b.neck,
		k: .006 * k,
		tag: "neck",
		...feather
	});
	s.egg(at(sunk([
		0,
		.0785,
		.0255
	]), k), [
		.0135 * k,
		.0135 * k,
		.0155 * k
	], {
		bone: "head",
		k: .005 * k,
		tag: "head",
		bump: 3e-4 * k,
		lumps: .002 * k
	});
	s.egg(at(sunk([
		0,
		.045,
		-.048
	]), k), [
		.0105 * k,
		.0028 * k,
		.027 * k
	], {
		bone: "tail",
		k: .004 * k,
		tag: "tail"
	}, [
		.42,
		0,
		0
	]);
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg(at(sunk([
		x * .0165,
		.06,
		-.006
	]), k), [
		.0055 * k,
		.0135 * k,
		.025 * k
	], {
		bone: "body",
		k: .004 * k,
		tag: "wing",
		...feather
	}, [
		.42,
		x * -.06,
		0
	]);
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
		x * J.leg[1][0],
		J.leg[1][1] + .002 * k,
		J.leg[1][2] - .002 * k
	], [
		.0055 * k,
		.008 * k,
		.007 * k
	], {
		bone: `shank${side}`,
		k: .004 * k,
		tag: "belly",
		...feather
	});
	const c = (h) => new three.Color(h);
	const C = {
		robinBack: c("#7a6a4e"),
		orange: c("#d9622b"),
		border: c("#9aa3a6"),
		white: c("#efeae0"),
		cream: c("#e6dccb"),
		black: c("#181717"),
		sheen: c("#2b2a2c"),
		olive: c("#7c8a3c"),
		yellow: c("#e3c93a"),
		blueGrey: c("#6d8197"),
		grey: c("#8b8b88"),
		chestnut: c("#8a4a22"),
		paleGrey: c("#c9c5bc"),
		brown: c("#8a6038"),
		dark: c("#2b2420"),
		blueCrown: c("#6f8494"),
		pink: c("#c47a62"),
		paleP: c("#d9b2a2"),
		chestBrown: c("#8a5a3a"),
		green: c("#88915a")
	};
	/** @param {THREE.Color} col @param {Surface} sf */
	const paint = (col, sf) => {
		const { p, n } = sf;
		const fine = noise3(p.x * 900 / k, p.y * 900 / k, p.z * 900 / k, 7);
		const head = sf.tag("head") + sf.tag("neck") * .6;
		const front = ramp(n.z, .05, .45);
		const under = Math.max(sf.tag("belly"), ramp(-n.y, .15, .6));
		const y = p.y / k + SINK, z = p.z / k;
		if (kind === "robin") {
			col.copy(C.robinBack);
			const face = front * (y > .046 ? 1 : 0) * (1 - ramp(n.y, .55, .85)) * (z > -.004 ? 1 : 0);
			mix(col, C.border, ramp(face, .05, .35) * .9);
			mix(col, C.orange, ramp(face, .3, .6));
			mix(col, C.white, under * (y < .05 ? 1 : .3));
		} else if (kind === "blackbird") {
			col.copy(C.black);
			mix(col, C.sheen, .4 + .3 * fine);
		} else if (kind === "greattit") {
			col.copy(C.olive);
			mix(col, C.yellow, Math.max(front * sf.tag("breast"), under) * (1 - head));
			mix(col, C.black, (1 - ramp(Math.abs(p.x) / k, .0025, .004)) * Math.max(front, under) * (y < .066 ? 1 : 0));
			mix(col, C.black, head);
			const cheek = head * ramp(Math.abs(n.x), .45, .75) * (y < .08 ? 1 : 0) * (z > .018 ? 1 : 0);
			mix(col, C.white, cheek);
			mix(col, C.blueGrey, sf.tag("wing") + sf.tag("tail"));
		} else if (kind === "sparrow") {
			col.copy(C.brown);
			mix(col, C.dark, ramp(Math.sin(p.x * 1400 / k + fine * 3), .6, .95) * sf.tag("back") * ramp(n.y, .2, .7));
			mix(col, C.paleGrey, under);
			mix(col, C.chestnut, head * (1 - front));
			mix(col, C.grey, head * ramp(n.y, .55, .85));
			mix(col, C.paleGrey, head * front * ramp(Math.abs(n.x), .3, .6));
			const bib = (1 - ramp(Math.abs(p.x) / k, .005, .009)) * front * (y > .055 && y < .074 ? 1 : 0);
			mix(col, C.black, bib);
			mix(col, C.chestBrown, sf.tag("wing"));
		} else {
			col.copy(C.chestBrown);
			mix(col, C.green, ramp(-n.z, .5, .9) * sf.tag("back"));
			mix(col, C.pink, front * (1 - ramp(n.y, .5, .8)));
			mix(col, C.paleP, under);
			mix(col, C.blueCrown, head * Math.max(ramp(n.y, .4, .75), ramp(-n.z, .1, .5)));
			mix(col, C.dark, sf.tag("wing") * .8 + sf.tag("tail"));
		}
		col.multiplyScalar(.94 + .1 * fine);
	};
	/** @type {PartSpec[]} */
	const parts = [{ skin: s.skin(.0022 * k, paint, `bird-${kind}`) }];
	const [bl, bt, bc] = L.bill;
	const root = [
		0,
		jawAt[1] + .0035 * k,
		J.head[2] + .011 * k
	];
	parts.push({
		geo: spike(root, [
			0,
			-.08,
			1
		], bt, bl * .95, { flat: .95 }),
		color: bc,
		bone: "head"
	});
	parts.push({
		geo: spike([
			0,
			root[1] - bt * .7,
			root[2] - .001 * k
		], [
			0,
			-.16,
			1
		], bt * .8, bl * .8, { flat: .9 }),
		color: bc,
		bone: "jaw"
	});
	parts.push(...eyes(at(sunk([
		.0098,
		.0805,
		.0315
	]), k), .0034 * k, [
		.92,
		.1,
		.38
	], "#140d09", "round", "head", {
		irisR: .85,
		rim: L.ring ?? "#1d1713"
	}));
	if (L.ring) for (const x of [1, -1]) parts.push({
		geo: new three.TorusGeometry(.0034 * k, 7e-4 * k, 6, 14).rotateY(x * 1.2).translate(x * .0102 * k, .0695 * k, .0312 * k),
		color: L.ring,
		bone: "head"
	});
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const shoulder = [
			x * J.wing[0],
			J.wing[1],
			J.wing[2]
		];
		parts.push(wing(shoulder, .07 * k, .03 * k, x, (u, v) => {
			if (L.bars && v < .42 && (u > .18 && u < .26 || kind === "chaffinch" && u > .36 && u < .43)) return L.bars;
			if (kind === "chaffinch" && u < .15) return "#c8cacc";
			return v > .7 && u > .5 ? new three.Color(L.wing).multiplyScalar(.75).getStyle() : L.wing;
		}, `wing${side}`));
	}
