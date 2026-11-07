//#piece 693245eec24e4da3790df47da8269873aa7f5742253bfa856c596ae3a92c8344
//#region src/lib/plants/herbs.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
/**
* @typedef {{
*   seed: { size: number, colour: string }, height: [number, number][], internode: number, branching: number, depth: number,
*   spread: number, stem: string, woody?: string, leaf: { length: number, width: number, shape: (u: number) => number, colour: string, young: string, droop: number, wrinkle?: number, grey?: number },
*   flower: { colour: string, at: number, kind: 'spike' | 'axils' | 'cluster', size: number, seed?: string, stalk?: number, length?: number, whorls?: number }, runners?: number, stems?: number
* }} Bush — a mint-family herb: its seed, its height through the stages, the spacing of its leaf pairs, how readily it
*   branches and how deep, its leaves (and how grey or wrinkled), its flowers (in spikes at the tips, in the leaf
*   axils, or in clusters; a spike `length` long in so many `whorls`, raised on a bare `stalk` above the leaves for
*   lavender), and whether it runs (mint)
*/
/**
* @param {Bush} spec
* @returns {(g: number, seed: string) => THREE.Group}
*/
function bush(spec) {
	return (g, seed) => {
		const bag = new Bag();
		const vigour = about(chance(seed, "plant"), 1, .1);
		const at = v3(0, -.004, 0);
		const s = sprout(bag, {
			seed,
			at,
			size: v3(spec.seed.size, spec.seed.size * .6, spec.seed.size * .7),
			coat: spec.seed.colour,
			coatShade: "#3a2a20",
			stem: table(g, [
				[0, 0],
				[.3, 5e-4],
				[1, .006],
				[2, .014],
				[9, .016]
			]),
			hook: table(g, [
				[0, 1],
				[1, 1],
				[1.5, 0]
			]),
			radius: 5e-4 + .0012 * span(g, 1, 4),
			stemColor: spec.stem,
			leaf: {
				length: .006,
				width: .0028,
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6),
				color: "#6aa046",
				vein: "#a6c47e"
			},
			open: span(g, 1.1, 2),
			shed: span(g, 1, 1.5),
			wither: span(g, 3, 3.8)
		});
		root(bag, {
			seed,
			key: ["tap"],
			from: at.clone(),
			dir: v3(0, -1, 0),
			length: .25,
			grown: table(g, [
				[0, 0],
				[.3, .02],
				[1, .08],
				[3, .4],
				[5, .85],
				[7, 1]
			]),
			radius: .0012 + .0025 * span(g, 3, 8),
			down: .04,
			wander: .2,
			laterals: 10,
			lateral: .4,
			depth: 2,
			age: span(g, 3, 8),
			young: "#f4ead6",
			old: "#a8865a"
		});
		const H = table(g, spec.height) * vigour;
		const stems = spec.stems ?? 1;
		for (let k = 0; k < stems; k++) {
			const sr = chance(seed, "stem", k);
			const a = k * 2.39996 + sr() * .5;
			const lean = k === 0 ? .05 : between(sr, .25, .6);
			const born = 2 + k * .35;
			if (g <= born) break;
			shoot(bag, spec, seed, ["s", k], s.top.clone(), v3(Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean)), H * (k === 0 ? 1 : between(sr, .65, .9)), clamp((g - born) / 2.5) * (H > 0 ? 1 : 0), 0, g, vigour);
		}
		for (let k = 0; k < (spec.runners ?? 0); k++) {
			const rr = chance(seed, "runner", k);
			const born = 3.4 + k * .35;
			if (g <= born) break;
			const a = k * 2.39996 + rr() * .6;
			const len = Math.min(.35, (g - born) * .12) * vigour;
			const pts = [];
			for (let m = 0; m <= 8; m++) pts.push(v3(Math.cos(a + Math.sin(m) * .2) * len * (m / 8), -.008 + .006 * Math.sin(m * 1.3), Math.sin(a + Math.sin(m) * .2) * len * (m / 8)));
			bag.add("body", tube(pts, () => .0018, () => "#c8b8a0", 4));
			const end = pts[8];
			root(bag, {
				seed,
				key: ["run-root", k],
				from: end.clone(),
				dir: v3(0, -1, 0),
				length: .08,
				grown: clamp((g - born) / 1.5),
				radius: 8e-4,
				laterals: 4,
				depth: 1,
				young: "#f4ead6",
				old: "#c8a878"
			});
			shoot(bag, spec, seed, ["r", k], end.clone().setY(0), v3(rr() * .2, 1, rr() * .2), H * .7, clamp((g - born - .3) / 1.8), 1, g, vigour);
		}
		return bag.build();
	};
}
/**
* A square stem, its leaves in opposite pairs, its side shoots from the axils, its flowers at the tip or along it.
* @param {Bag} bag @param {Bush} spec @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} from
* @param {THREE.Vector3} dir @param {number} length @param {number} grown @param {number} order @param {number} g @param {number} vigour
*/
function shoot(bag, spec, seed, key, from, dir, length, grown, order, g, vigour) {
	if (grown <= .01 || length < .005) return;
	const r = chance(seed, "shoot", ...key);
	const reach = length * clamp(grown);
	const nodes = Math.max(1, Math.floor(reach / spec.internode));
	const d = dir.clone().normalize();
	const pts = [from.clone()];
	for (let k = 0; k < 10; k++) {
		d.lerp(v3(0, 1, 0), .08).add(v3((r() - .5) * .06, 0, (r() - .5) * .06)).normalize();
		pts.push(pts[k].clone().addScaledVector(d, reach / 10));
	}
