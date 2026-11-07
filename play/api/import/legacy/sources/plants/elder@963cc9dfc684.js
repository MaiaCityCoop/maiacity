//#piece fba99ee668356677203a38cdc2f6a3b1ba0d86b73d4dbe09717537e25f68c545
//#piece 7d83573c34a9eaa206da80d2f5fc8aef7f8e5322632d78fb1edb91e97ad699c3
//#piece a0cc27743d72408fbf8cda0a3e22cdc212d29f3ceb893a013c58bb28572ebe34
//#piece 8582fa4898a2887ea9109e7d53018bdb8f64a64356aa2c1c6e8162b13c8e8d07
//#piece 140a6b02845939e1b8faeb5b72c632b51b1eacea59a04f2d1e96a489d29650d6
//#piece d1c57c99a768857becf4df194055bbfbdb6a06679eb8a45f30d246cef9d29a52
//#piece 15a21fb1d3a5489929c64794872a7ba481b1e4b60406b1d7a401d486dc5816df
const ELDER_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny wrinkled seed from an elderberry, left by a blackbird, barely covered."
	],
	[
		"Germination",
		30,
		"A root goes down; two small seed leaves come up."
	],
	[
		"Seedling",
		50,
		"Its first true leaves in opposite pairs, already feathered into leaflets."
	],
	[
		"Young bush",
		365,
		"Fast: soft green stems a metre and more in a year, their pith white."
	],
	[
		"Bush",
		1100,
		"A big shrub of many stems, corky grey, arching out under feathered leaves, five metres high."
	],
	[
		"Flowering",
		1250,
		"In June, flat cream umbels a hand across at the tips of the new shoots, smelling of muscat: picked for elderflower."
	],
	[
		"Fruit set",
		1265,
		"The tiny petals fall; the umbels fill with green beads and begin to bow."
	],
	[
		"Green berries",
		1300,
		"The umbels heavy with hard green berries, turning over on their stalks."
	],
	[
		"Colouring",
		1330,
		"The stalks redden, the berries go red-purple, then black."
	],
	[
		"Ripe",
		1350,
		"Heavy drooping umbels of glossy black berries on red stalks: cooked, never raw, for juice, syrup and jam."
	]
]))();
const elder = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.003, .0016, .0016),
		coat: "#8a6a40",
		shade: "#5a4020",
		depth: .005
	},
	hypogeal: false,
	cotyledon: {
		length: .008,
		width: .004,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .06,
		trunkFlush: .9,
		scaffolds: [5, 7],
		scaffoldAngle: .38,
		gens: 5,
		whorl: [2, 3],
		spread: .6,
		up: .04,
		droop: .1,
		wander: .12,
		radius: .08,
		taper: .64,
		rest: .15,
		flush: .22,
		shoot: (gen) => [
			0,
			2,
			1.05,
			.7,
			.48,
			.36
		][gen] ?? .36,
		bark: ["#9a9282", "#6a6458"]
	}),
	roots: {
		tap: .7,
		spread: 1.6,
		count: 5,
		radius: .03
	},
	leaf: {
		length: .095,
		width: .038,
		shape: toothed,
		colour: "#3e6a2c",
		dark: "#335c26",
		young: "#86b052",
		opposite: true,
		pinnate: {
			pairs: [2, 3],
			length: .27,
			width: .11
		},
		spacing: .7,
		droop: .25,
		from: 4,
		tuft: 2,
		along: 3,
		across: 1
	},
	bloom: {
		sites: "tips",
		opens: 4.6,
		chance: .45,
		gen: 4
	},
	site: (s) => {
		const fr = chance(s.seed, "umbel", ...s.key);
		const { set, ripe } = fruiting(s.phase, 2.5, 1.3, 1.4);
		const out = s.dir.clone().setY(0);
		if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
		out.normalize();
		const turnOver = span(s.phase, .6, 2.2);
		const axis = UP.clone().multiplyScalar(Math.cos(turnOver * 2.4)).addScaledVector(out, Math.sin(turnOver * 2.4) + .15).normalize();
		const stalkEnd = s.at.clone().addScaledVector(s.dir.clone().lerp(UP, .7).normalize(), .07).addScaledVector(axis, .05);
		const stalk = ripe > .3 ? mix("#6a8a3a", "#9a1e3a", (ripe - .3) / .4) : new three.Color("#6a8a3a");
		const bearing = s.phase >= .55;
		if (bearing) s.bag.fruit(s.key, s.at, stalkEnd.clone().addScaledVector(axis, .025).sub(s.at));
		s.bag.add("body", tube([s.at, stalkEnd], () => .002, () => stalk, 4));
		const Rd = .075 * lerp(.6, 1, clamp((s.phase + .4) / .6)) * (1 + .15 * set) * about(fr, 1, .1);
		const H = .05 * (1 + .3 * set);
		const q = new three.Quaternion().setFromUnitVectors(UP, axis);
		const local = (x, y, z) => v3(x, y, z).applyQuaternion(q).add(stalkEnd);
		const nodes = [];
		for (let k = 0; k < 5; k++) {
			const a = k / 5 * Math.PI * 2 + fr();
			nodes.push({
				a,
				p: local(Math.cos(a) * Rd * .42, H * .45, Math.sin(a) * Rd * .42)
			});
			s.bag.add("body", tube([stalkEnd, nodes[k].p], () => .0011, () => stalk, 3));
		}
		if (s.phase < .55 && s.phase > -.2) {
			const fall = span(s.phase, .35, .55);
			const plate = fan({
				size: Rd,
				from: -Math.PI,
				to: Math.PI,
				edge: () => .92 * (1 - fall * .5),
				lift: (r) => (H * (1 - .35 * r * r) - .003) / Rd,
				paint: () => col(s.phase < 0 ? "#d8dcb0" : "#ece4c0"),
				rings: 2,
				rays: 12
			});
			s.bag.add("body", plate, new three.Matrix4().compose(stalkEnd, q, v3(1, 1, 1)));
		}
		const n = 64;
		for (let k = 0; k < n; k++) {
			const rho = Rd * Math.sqrt((k + .5) / n);
			const a = k * 2.39996;
			const y = H * (1 - .35 * Math.pow(rho / Rd, 2));
			const p = local(Math.cos(a) * rho, y, Math.sin(a) * rho);
			let near = nodes[0];
			for (const nd of nodes) if (Math.abs(Math.atan2(Math.sin(nd.a - a), Math.cos(nd.a - a))) < Math.abs(Math.atan2(Math.sin(near.a - a), Math.cos(near.a - a)))) near = nd;
			if (s.phase < .55 || k % 2 === 0) s.bag.add("body", tube([rho < Rd * .2 ? stalkEnd : near.p, p], () => 5e-4, () => stalk, 3));
			if (s.phase < .55) {
				const open = clamp((s.phase + .2) / .25), fall = span(s.phase, .35, .55);
				if (fall < 1) s.bag.add("body", bead(p.clone().addScaledVector(axis, .001), v3(.0042, .0014, .0042).multiplyScalar(lerp(.55, 1, open) * (1 - fall * .5)), open < .5 ? "#e0e0b8" : "#f6f0d6", 2, q));
				continue;
			}
			if (k % 2 || fr() > .85) continue;
			const t = clamp(ripe * 1.2 - fr() * .2);
			const c = t < .4 ? mix("#7a9a42", "#8a3a4a", t / .4) : mix("#8a3a4a", "#1c1222", (t - .4) / .6);
			const r = (.0012 + .0026 * set) * s.vigour;
			berry(s, p.clone().addScaledVector(axis, r * .9), r, c, axis.clone(), { detail: 2 });
		}
		if (bearing) s.bag.fruitDone();
	}
}))();
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "elder",
	label: "Elder",
	latin: "Sambucus nigra · Holunder",
	note: "A big arching shrub of many stems and feathered leaves: flat cream umbels of elderflower at the shoot tips, turning over into heavy drooping umbels of black berries on red stalks.",
	from: "Shrub · 3 years",
	stages: ELDER_STAGES,
	grow: elder,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef
