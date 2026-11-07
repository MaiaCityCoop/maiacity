import json
E = []
def ed(msg, find, rep): E.append({"message": msg, "find": find, "replace": rep})

# 1. stages after Ripe + the age clock + the palm's curves by age
ed("Stages after Ripe: Bearing palm, Grown palm, Old palm, and the palm's age in days from its stage's day",
'''	{
		name: "Ripe",
		day: 2480,
		note: "Heavy bunches dulling to orange-brown under a crown of thirty fronds; the palm keeps fruiting for decades."
	}
];''',
'''	{
		name: "Ripe",
		day: 2480,
		note: "Heavy bunches dulling to orange-brown under a crown of thirty fronds; the palm keeps fruiting for decades."
	},
	{
		name: "Bearing palm",
		day: 3652,
		note: "Ten years old, in full bearing: a bunch from every leaf axil, a dozen hanging at once, the ringed grey trunk a third of its height."
	},
	{
		name: "Grown palm",
		day: 8036,
		note: "Twenty-two years old: the tall palm people know, a slender ringed grey trunk curving up to a round crown of thirty arching fronds."
	},
	{
		name: "Old palm",
		day: 18262,
		note: "Fifty years old: a tall bare trunk, rings close together near its top, a smaller crown of shorter fronds; it still bears."
	}
];
/** the stage worlds draw when they name none: the grown palm */
const GROWN = 11;
/**
* The palm's age in days at a stage: its stage's `day` (between two stages, on the way). Every size below is a
* function of this age, never of a stage's index, so a stage added or moved changes no other stage's size.
* @param {number} g
*/
function dayAt(g) {
	const i = clamp(Math.floor(g), 0, STAGES.length - 2);
	return lerp(STAGES[i].day, STAGES[i + 1].day, clamp(g - i));
}
/** the day of its first ripe nuts, after which its oldest bunches are cut */
const FIRST_CROP = 2480;
/**
* The king coconut by age (days from sowing), from its data sheet (KING_DATASHEET). Up to day 2480 (Ripe) the young palm as v2
* drew it; after it the measured palm: a trunk that grows about 0.9 m a year young and slows to a few centimetres when
* old, a new frond about every four weeks, a crown of about thirty.
*/
const KING = {
	/** the bare trunk's height (m) to the crown by age */
	trunk: [[988, 0], [1100, .031], [1460, .12], [2000, 1], [2100, 1.3], [2250, 1.6], [2380, 1.9], [2480, 2.2], [3652, 3.4], [5479, 5.6], [8036, 8.6], [10958, 11.4], [14610, 14], [18262, 15.6], [27393, 17.5]],
	/** the trunk's radius over its flare, as a share of a grown trunk's (BOLE) */
	girth: [[216, 0], [240, .007], [540, .198], [1100, .536], [2000, .857], [2100, 1]],
	/** fronds made in all */
	made: [[120, 0], [192, 1], [240, 2], [540, 6], [1100, 13], [2000, 24], [2100, 36], [2250, 48], [2380, 60], [2480, 72]],
	/** after Ripe, fronds a year */
	fronds: 13,
	/** fronds it holds at once */
	holds: [[120, 0], [192, 1], [240, 2], [540, 5], [1100, 10], [2000, 18], [2100, 24], [2250, 28], [2380, 29], [2480, 30], [10958, 30], [18262, 26]],
	/** a frond's full length (m) by the day it was made */
	frond: [[120, .35], [240, .6], [540, 1], [1100, 2.1], [2000, 3.6], [2100, 4.7], [2250, 4.881], [2380, 5.219], [2480, 5.4], [10958, 5.4], [18262, 4.7]],
	/** roots grown from the base by age */
	roots: [[48, 0], [120, 4], [240, 9], [540, 16], [1100, 25], [2000, 34], [2100, 41], [2250, 48], [2380, 52], [2480, 56]],
	/** the base root ring's spread, 0 … 1 */
	spread: [[1100, 0], [2000, .259], [2100, .741], [2250, 1]],
	/** the seed nut rotting away, 0 … 1 */
	rot: [[652, 0], [1100, .741], [1460, 1]],
	/** the first spike's growth, 0 … 1 */
	spike: [[30, 0], [120, .721], [168, 1]]
};
/** a value of one of KING's curves at an age in days */
const byAge = (day, rows) => table(day, rows);''')

# 2. made/holds/bornAt by age
ed("Fronds made and held by the palm's age in days, a new frond about every four weeks after Ripe",
'''/** how many fronds the palm has made by g, all told */
const made = (g) => table(g, [
	[1, 0],
	[1.6, 1],
	[2, 2],
	[3, 6],
	[4, 13],
	[5, 24],
	[6, 36],
	[7, 48],
	[8, 60],
	[9, 72]
]);
/** how many it holds at once */
const holds = (g) => table(g, [
	[1, 0],
	[1.6, 1],
	[2, 2],
	[3, 5],
	[4, 10],
	[5, 18],
	[6, 24],
	[7, 28],
	[9, 30]
]);
/** when frond j was made */
function bornAt(j) {
	let lo = 1, hi = 9;
	for (let i = 0; i < 30; i++) {
		const mid = (lo + hi) / 2;
		if (made(mid) > j) hi = mid;
		else lo = mid;
	}
	return hi;
}''',
'''/** how many fronds the palm has made by its age in days, all told */
const made = (day) => day <= FIRST_CROP ? byAge(day, KING.made) : 72 + (day - FIRST_CROP) / 365.25 * KING.fronds;
/** how many it holds at once */
const holds = (day) => byAge(day, KING.holds);
/** the day frond j was made */
function bornAt(j) {
	let lo = 120, hi = 4e4;
	for (let i = 0; i < 40; i++) {
		const mid = (lo + hi) / 2;
		if (made(mid) > j) hi = mid;
		else lo = mid;
	}
	return hi;
}''')
json.dump(E, open('edits.json','w'), indent=1)
E = json.load(open('edits.json'))
ed("coconut(): grown from its age in days; the seed nut's rot and the roots by age",
'''* The king coconut at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function coconut(g, seed) {
	const bag = new Bag();
	const r = chance(seed, "plant");
	const vigour = about(r, 1, .08);
	const rot = span(g, 3.2, 4.4);''',
'''* The king coconut at a stage (0 … 12, between them on the way) from the seed id: grown to its age in days.
* @param {number} g
* @param {string} seed
*/
function coconut(g, seed) {
	const day = dayAt(g);
	const bag = new Bag();
	const r = chance(seed, "plant");
	const vigour = about(r, 1, .08);
	const rot = byAge(day, KING.rot);''')
ed("Roots by age: how many, when each grows and how far the ring spreads",
'''	const roots = Math.round(table(g, [
		[.4, 0],
		[1, 4],
		[2, 9],
		[3, 16],
		[5, 34],
		[7, 48],
		[9, 56]
	]));
	for (let i = 0; i < roots; i++) {
		const rr = chance(seed, "palm-root", i);
		const born = i < 4 ? .4 + i * .12 : bornRoot(i);
		const bear = i * 2.39996 + rr() * .4;
		const fromNut = i < 4;
		const from = fromNut ? NUT_AT.clone().add(v3(.04 + i * .03, -.06, (rr() - .5) * .05)) : BASE.clone().add(v3(Math.cos(bear) * .06 * lerp(1, 2.5, span(g, 4, 7)), -.03 - rr() * .06, Math.sin(bear) * .06 * lerp(1, 2.5, span(g, 4, 7))));''',
'''	const roots = Math.round(byAge(day, KING.roots));
	const spread = byAge(day, KING.spread);
	for (let i = 0; i < roots; i++) {
		const rr = chance(seed, "palm-root", i);
		const born = i < 4 ? 48 + i * 14.4 : bornRoot(i);
		const bear = i * 2.39996 + rr() * .4;
		const fromNut = i < 4;
		const from = fromNut ? NUT_AT.clone().add(v3(.04 + i * .03, -.06, (rr() - .5) * .05)) : BASE.clone().add(v3(Math.cos(bear) * .06 * lerp(1, 2.5, spread), -.03 - rr() * .06, Math.sin(bear) * .06 * lerp(1, 2.5, spread)));''')
ed("A root's growth and ageing by the days since it was made",
'''			grown: (g - born) / 2.4,''',
'''			grown: (day - born) / rootGrows(born),''')
ed("A root's colour ages by the days since it was made",
'''			age: (g - born - .6) / 2.5,''',
'''			age: (day - born - rootAges(born)[0]) / rootAges(born)[1],''')
ed("The trunk's height by age from the measured curve; its girth by age",
'''	const H = table(g, [
		[3.8, 0],
		[4.4, .12],
		[5, 1],
		[6, 1.3],
		[7, 1.6],
		[8, 1.9],
		[9, 2.2]
	]) * vigour;''',
'''	const H = byAge(day, KING.trunk) * vigour;''')
ed("Girth by age",
'''	const bole = lerp(.03, .17, span(g, 1.8, 6)) * vigour;''',
'''	const bole = lerp(.03, BOLE, byAge(day, KING.girth)) * vigour;''')
ed("Leaf scars up the whole trunk, closer together where the trunk grew slowly (one ring a frond)",
'''	const scars = [.25];
	while (scars[scars.length - 1] < 9) scars.push(scars[scars.length - 1] + between(sr, .07, .13));''',
'''	const scars = [.25];
	while (scars[scars.length - 1] < 2.6) scars.push(scars[scars.length - 1] + between(sr, .07, .13));
	while (scars[scars.length - 1] < H + .5) {
		const h = scars[scars.length - 1];
		scars.push(h + ringAt(h / vigour) * vigour * between(sr, .8, 1.2));
	}''')
ed("A tall trunk: enough rings for its scars, grey to near its top",
'''		const n = Math.max(24, Math.min(700, Math.round(ht / .012)));''',
'''		const n = Math.max(24, Math.min(2400, Math.round(ht / .012)));''')
ed("Only the trunk's top metre or so browner under the crown; the old trunk paler grey",
'''			return mix(mix("#8d8476", "#7a6a52", clamp((u - .7) / .3)), "#6c5f4c",''',
'''			return mix(mix(mix("#8d8476", "#9a958c", clamp((day - 5479) / 9e3)), "#7a6a52", clamp((h - ht + Math.min(.3 * ht, 1.2)) / Math.min(.3 * ht, 1.2))), "#6c5f4c",''')
ed("The crown and the first spike by age",
'''	const crown = H > .02 ? trunkAt(1) : BASE.clone().add(v3(0, g < 1.6 ? 0 : bole * .6, 0));
	const spike = span(g, .25, 1.4);
	const sprouting = NUT_AT.clone().add(v3(.11, .05, 0));
	if (spike > 0 && g < 2.2) {
		const top = (g < 1.6 ? sprouting : crown).clone().add(v3(0, .02 + .2 * spike, 0));
		bag.add("body", tube([g < 1.6 ? sprouting : crown, top]''',
'''	const crown = H > .02 ? trunkAt(1) : BASE.clone().add(v3(0, day < 192 ? 0 : bole * .6, 0));
	const spike = byAge(day, KING.spike);
	const sprouting = NUT_AT.clone().add(v3(.11, .05, 0));
	if (spike > 0 && day < 300) {
		const top = (day < 192 ? sprouting : crown).clone().add(v3(0, .02 + .2 * spike, 0));
		bag.add("body", tube([day < 192 ? sprouting : crown, top]''')
ed("Fronds by age",
'''	const total = made(g);
	const live = holds(g);''',
'''	const total = made(day);
	const live = holds(day);''')
ed("Fronds by age: where the first ones stand",
'''			at: g < 1.6 ? sprouting : crown,
			age,
			opened: clamp((total - j) / 1.2),
			born,
			g,
			vigour''',
'''			at: day < 192 ? sprouting : crown,
			age,
			opened: clamp((total - j) / 1.2),
			born,
			vigour''')
ed("Bunches by age: one from each leaf axil, every 40 days at first and every four weeks once in full bearing; each cut once its nuts are ripe, after the first crop",
'''	for (let b = 0; b < 7; b++) {
		const opens = 4.85 + b * .32;
		const phase = g - opens;
		if (phase < -.3 || H < .3) continue;
		bunch(bag, {
			seed,
			b,
			at: crown,
			phase,
			vigour,
			bear: made(opens) % 5 * 2.513 + b * 2.513,''',
'''	const last = Math.min(BUNCHES, Math.floor(bunchOf(day + .3 * PHASE)));
	for (let b = Math.max(0, Math.floor(bunchOf(day - CUT * PHASE)) - 1); b <= last; b++) {
		const opens = opensAt(b);
		const phase = (day - opens) / PHASE;
		if (phase < -.3 || H < .3) continue;
		if (phase > CUT && day > FIRST_CROP + 30) continue;
		bunch(bag, {
			seed,
			b,
			at: crown,
			phase,
			vigour,
			bear: made(opens) % 5 * 2.513 + b * 2.513,''')
ed("Roots made from the base a few a month, each growing and browning over its own days; bunches by the day they open",
'''/** when a root from the base is made: a few a month */
const bornRoot = (i) => 1.4 + (i - 4) * .13;''',
'''/** the day a root from the base is made: a few a month */
const bornRoot = (i) => table(i, [[4, 168], [10, 294], [20, 809], [30, 1802], [40, 2112], [50, 2299], [56, 2396]]);
/** the days a root made on `born` takes to grow */
const rootGrows = (born) => table(born, [[48, 432], [91, 538], [168, 820], [294, 1328], [809, 1279], [1802, 471], [2112, 316], [2299, 181], [2396, 84]]);
/** when a root made on `born` starts to brown, and over how many days */
const rootAges = (born) => [table(born, [[48, 72], [168, 72], [294, 180], [809, 363], [1802, 236], [2112, 90], [2299, 78], [2396, 60]]), table(born, [[48, 700], [168, 1310], [294, 1554], [809, 1015], [1802, 326], [2112, 278], [2299, 103], [2396, 24]])];
/** a grown trunk's radius over its flare (m) */
const BOLE = .17;
/** the leaf-scar ring's spacing (m) at a height of trunk: the trunk's growth over the days one frond takes */
function ringAt(h) {
	let lo = 2480, hi = 27393;
	for (let i = 0; i < 30; i++) {
		const mid = (lo + hi) / 2;
		if (table(mid, KING.trunk) > h) hi = mid;
		else lo = mid;
	}
	const rate = (table(lo + 60, KING.trunk) - table(lo - 60, KING.trunk)) / 120;
	return clamp(rate * 365.25 / KING.fronds, .025, .13);
}
/** days of a bunch's growth that one unit of its phase stands for: opening to ripe nuts is about 3.4 of them */
const PHASE = 125;
/** the phase a bunch is cut at, its nuts ripe */
const CUT = 3.8;
/** the most bunches a palm ever makes here */
const BUNCHES = 1200;
/** the day bunch b opens: every 40 days at first, every four weeks in full bearing */
const opensAt = (b) => b < 7 ? 1974 + b * 40 : 2214 + (b - 6) * 365.25 / KING.fronds;
/** which bunch opens on a day (fractional) */
const bunchOf = (day) => day < 2214 ? (day - 1974) / 40 : 6 + (day - 2214) / (365.25 / KING.fronds);''')
ed("A frond's length and leaflets by the day it was made",
'''	const full = table(o.born, [
		[1, .35],
		[2, .6],
		[3, 1],
		[4, 2.1],
		[5, 3.6],
		[6, 4.7],
		[9, 5.4]
	]) * o.vigour;''',
'''	const full = byAge(o.born, KING.frond) * o.vigour;''')
ed("Pinnate fronds from the day it was made",
'''	const pinnate = o.born > 3.1;''',
'''	const pinnate = o.born > 596;''')
ed("Leaflet pairs by the day the frond was made",
'''	const pairs = Math.round(lerp(28, 70, clamp((o.born - 3) / 2)));''',
'''	const pairs = Math.round(lerp(28, 70, o.born < 1100 ? clamp((o.born - 540) / 560) * .5 : .5 + clamp((o.born - 1100) / 900) * .5));''')
ed("Its card: a palm of fifty years; the stage worlds draw by default is the grown palm",
'''	from: "Palm · 7 years",''',
'''	from: "Palm · 50 years",
	grownStage: GROWN,''')
ed("The stage parameter defaults to a plant's grown stage where it names one",
'''		value: p.stages.length - 1,
		names: p.stages.map((s) => s.name)''',
'''		value: p.grownStage ?? p.stages.length - 1,
		names: p.stages.map((s) => s.name)''')
json.dump(E, open('edits.json','w'), indent=1)
E = json.load(open('edits.json'))
ed("A frond's doc: made on a day, not at a stage",
'''* @param {{ seed: string, j: number, at: THREE.Vector3, age: number, opened: number, born: number, g: number, vigour: number }} o''',
'''* @param {{ seed: string, j: number, at: THREE.Vector3, age: number, opened: number, born: number, vigour: number }} o — `born` the day it was made''')
ed("The library's history names version 3",
'''{ v: 2, date: "2026-11-05", note: "Sizes to the real king coconut" }] }''',
'''{ v: 2, date: "2026-11-05", note: "Sizes to the real king coconut" }, { v: 3, date: "2026-11-07", note: "Grows on past its first harvest into the tall palm, sized by its age" }] }''')
json.dump(E, open('edits.json','w'), indent=1)
