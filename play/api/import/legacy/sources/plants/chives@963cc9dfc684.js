//#piece 9cdd83f192deb45a8343feb449b6888a5c058dc15b91b9cfc4ba9940379445c1
//#piece c29515fea7642cf7d919cf41a7e4fec9b7563cce1a65eff8cea8264aa7b64054
//#piece 9b684a38dba83cd57720584fa55cf3f119c07f76afae57fc29e99a550cee28cf
//#piece 8ec48d7cab369362a362ff8aa324fbf32cd477f421cfdf4ccdbc0792bbe4ce91
*/
//#piece ce69aae63e50f87c5f75580b3b8c283f781fb921cbd7cb66939bc38e4b8097b9
	}
//#piece 455f7466a80eb36be57bca7aeb8e877ae284dfb87059cc0b83f7101d1f479fa1
//#piece 2a4e2ec0748ed20ecd1dcd2254c6acb594d75ce2d3d54109d97c5826a1a0f3e9
//#piece 802d96f69ffb4276391e41621fedc8ceabbaf377d9ddf9d9e35ee7627df28fb8
//#piece ceb8a467061af743d7f16d9963fd98e6d73da3108ac558d66c6f72ab580f37dd
const CHIVES_STAGES = /* @__PURE__ */ (() => herbStages("A small black angular seed, a centimetre down.", [
	[
		"Grass",
		25,
		"Thin hollow green leaves like fine grass."
	],
	[
		"Tuft",
		50,
		"A tuft of tubular leaves from little bulbs."
	],
	[
		"Clump",
		90,
		"A dense clump, cut down and growing back again and again."
	],
	[
		"Buds",
		365,
		"Its second spring: buds in papery sheaths on firm stalks."
	],
	[
		"Flowering",
		380,
		"Purple pompoms of little star flowers — edible too."
	],
	[
		"Seeding",
		410,
		"The heads dry and drop black seeds; cut back, it grows fresh leaves."
	]
]))();
/**
* Chives: a clump of little bulbs, hollow tubular leaves, purple pompoms.
* @param {number} g @param {string} seed
*/
function chives(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .1);
	const shoots = Math.round(table(g, [
		[1, 1],
		[2, 2],
		[3, 5],
		[4, 12],
		[5, 26],
		[6, 34],
		[9, 40]
	]));
	for (let i = 0; i < shoots; i++) {
		const sr = chance(seed, "chive", i);
		const d = Math.sqrt(i / 40) * .06, a = i * 2.39996;
		const base = v3(Math.cos(a) * d, -.01, Math.sin(a) * d);
		const H = table(g, [
			[1, .02],
			[2, .06],
			[3, .14],
			[4, .24],
			[9, .3]
		]) * between(sr, .7, 1.1) * vigour;
		bag.add("body", bead(base, v3(.004, .008, .004), "#f0e8d8", 4));
		if (i % 2 === 0) root(bag, {
			seed,
			key: ["r", i],
			from: base.clone(),
			dir: v3(sr() - .5, -1, sr() - .5),
			length: .15,
			grown: span(g, .5, 4),
			radius: 7e-4,
			laterals: 3,
			depth: 1,
			young: "#f6efe0",
			old: "#e0d0b0"
		});
		for (let k = 0; k < 3; k++) {
			const lean = between(sr, .05, .35);
			const b = sr() * Math.PI * 2;
			const pts = [];
			for (let m = 0; m <= 8; m++) {
				const t = m / 8;
				pts.push(base.clone().add(v3(Math.cos(b) * Math.sin(lean) * H * t + Math.cos(b) * lean * .05 * t * t * H * 3, H * t * Math.cos(lean * .5), Math.sin(b) * Math.sin(lean) * H * t)));
			}
			bag.add("body", tube(pts, (u) => .0018 * (1 - .85 * u), (u) => mix("#3f7a2e", "#7ab04a", u * .4), 5));
		}
		if (g < 6.4 || sr() > .45) continue;
		const bloom = span(g, 7.2, 7.9), seeding = span(g, 8.5, 9.2);
		const top = base.clone().add(v3((sr() - .5) * .03, H * 1.1, (sr() - .5) * .03));
		bag.add("body", tube([base, top], () => .0016, () => "#5a8a3a", 4));
		if (bloom <= 0) {
			bag.add("body", bead(top, v3(.004, .009, .004), "#d8d0c0", 4));
			continue;
		}
		for (let m = 0; m < 26; m++) {
			const p = m / 26, phi = Math.acos(1 - 2 * p), th = m * 2.39996;
			bag.add("body", bead(top.clone().add(v3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)).multiplyScalar(.011 * bloom)), v3(.0028, .0028, .0028).multiplyScalar(lerp(.5, 1, bloom)), mix("#b878c8", "#8a7a5a", seeding), 2));
		}
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "chives",
	label: "Chives",
	latin: "Allium schoenoprasum · Schnittlauch",
	note: "A clump of little bulbs and hollow tubular leaves, cut and cut again; purple pompoms in its second spring.",
	from: "Herb · perennial",
	stages: CHIVES_STAGES,
	grow: chives
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
