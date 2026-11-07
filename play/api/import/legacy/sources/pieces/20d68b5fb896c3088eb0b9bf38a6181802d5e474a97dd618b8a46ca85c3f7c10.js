//#piece cb1b96d7244aca5c0e7dbdbd4f0c988449ffa768fc8729cca42aa49ef29569e8
//#piece bf1a0388898c2de0cce9eb17a4e6442735ae59e39988d6eb80696d2af7109ed1
//#piece 3cbf07d6f099859e96544cad797958935056c4176cebc3d7a29e131b879b14f4
*/
//#piece 447161526f542e099d94aa4faffd780fce0122208100ab732e6996005ed892f0
}
/** when a flowering site opens, sets and ripens, drawn from its chance @typedef {{ opens: number, ripeFrom: number, ripeFor: number, setFor: number }} Season */
/**
* @typedef {{
*   count: [number, number], r: number, drop: number, stalk: string, bud: string, flower: string, heart: string,
*   bloom: number, colour: (ripe: number) => THREE.Color, season: Season, step: number, calyx: string
* }} Strig — a currant's hanging raceme: how many flowers, the berry's radius, how many at its tip never set
*   (`drop`), its colours, and `step` how much later each berry down it ripens than the one above
*/
/**
* A strig: a thin stalk hanging from a spur, the flowers along it on short stalks, each a berry later — the top ones
* first to colour. It hangs where it touches nothing (`Space.settle`).
* @param {Ctx} ctx @param {{ at: THREE.Vector3, dir: THREE.Vector3, key: (string | number)[] }} site @param {Strig} S
*/
function strig(ctx, site, S) {
	const { bag, seed, g, vigour } = ctx;
	const fr = chance(seed, "strig", ...site.key);
	const opens = S.season.opens + fr() * .3;
	const n = S.count[0] + Math.floor(fr() * (S.count[1] - S.count[0] + 1));
	const keep = n - Math.floor(fr() * (S.drop + 1));
	const twist = fr() * 6;
	const R = S.r * vigour * about(fr, 1, .08);
	if (g < opens - .7) return;
	const emerge = span(g, opens - .7, opens);
	const len = n * R * 1.1 + .012;
	const out = level(site.dir);
	const from = site.at.clone().addScaledVector(out, .008);
	const place = bag.space.settle(from, v3(0, -1, 0).addScaledVector(out, .4), (a, d) => [
		.25,
		.55,
		.85
	].map((t) => ({
		c: a.clone().addScaledVector(d, len * t),
		r: R * 2
	})), .02);
	const d = place.dir;
	const L = len * lerp(.3, 1, emerge);
	const top = place.at;
	const set = span(g, opens + .4, opens + .4 + S.season.setFor);
	const bearing = set >= .02 && keep > 0;
	if (bearing) bag.fruit(site.key, site.at, d);
	bag.add("body", tube([
		site.at,
		top,
		top.clone().addScaledVector(d, L)
	], (u) => .001 * (1 - .5 * u), () => S.stalk, 3));
	for (let k = 0; k < n; k++) {
		const kr = chance(seed, "strig-berry", ...site.key, k);
		const r1 = kr(), r2 = kr();
		const axis = top.clone().addScaledVector(d, L * clamp((.012 + (k + .5) * R * 1.1) / len));
		const side = round(d, k * 2.39996 + twist);
		if (g < opens) {
			bag.add("body", bead(axis.addScaledVector(side, R * .5), v3(1, 1, 1).multiplyScalar(R * .35 * lerp(.4, 1, emerge)), S.bud, 2));
			continue;
		}
		if (set < .02) {
			const open = clamp((g - opens) / .2) * (1 - span(g, opens + .3, opens + .42) * .5);
			const at = axis.clone().addScaledVector(side, R * .8);
			bag.add("body", tube([axis, at], () => 4e-4, () => S.stalk, 3));
			floret(bag, at, side.clone().add(v3(0, -.6, 0)).normalize(), S.bloom, S.flower, S.heart, open, 5, .6);
			continue;
		}
		if (k >= keep) continue;
		const r = R * lerp(.22, 1, set) * (.92 + r1 * .16);
		const c = axis.clone().addScaledVector(side, R * 1.05).addScaledVector(d, r * .3);
		const ripe = span(g, S.season.ripeFrom + k * S.step + r2 * .15, S.season.ripeFrom + S.season.ripeFor + k * S.step + r2 * .15);
		bag.add("body", tube([axis, c], () => 5e-4, () => S.stalk, 3));
		bag.add("gloss", bead(c, v3(r, r * 1.04, r), S.colour(ripe), 3));
		bag.add("body", bead(c.clone().addScaledVector(side, r * .95), v3(1, 1, 1).multiplyScalar(r * .18), S.calyx, 2));
	}
	if (bearing) bag.fruitDone();
//#piece eb797d051b2bdd8a3ca4ba71567e59054599041b8bd172b895c178eff47b67bf
*/
//#piece 70800341da83776310eb4b033ea7bb914fb1e6a98e315d805ea2ed751cb1a204
