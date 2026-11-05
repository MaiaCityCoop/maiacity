# assemble v4: v3's source with its outside part (lines 2485–3409) replaced by 30-outside.js, its words brought up to date
D = '/tmp/claude-0/-home-user-maiacity/7a26b88b-5367-5a8b-aaef-f4f607b1129d/scratchpad/v4/'
v3 = open(D + 'v3-source.js').read().split('\n')
new = open(D + '30-outside.js').read().rstrip('\n').split('\n')
s = '\n'.join(v3[:2484] + new + [''] + v3[3410:])
subs = [
	(" *   4. OUTSIDE    a one-storey limestone arcade round the dome's foot (no terraces on it), its walk, the paths out",
	 " *   4. OUTSIDE    a one-storey limestone arcade round the dome's foot and on it a terrace all round (its balustrade,\n *                 four stairs up, pergolas over the gates, furnished), its walk, the paths out"),
	("the plants of the library in seven layers; outside, a one-storey limestone arcade round the glass. Walk in by the south door.",
	 "the plants of the library in seven layers; outside, a one-storey limestone arcade round the glass carrying a terrace all the way round, a balustrade on it and four stairs up from the cloister walk, furnished as a place to meet: pergolas with passion fruit over the gates, tables, daybeds, armchairs, benches, lemons and oranges in pots. Walk in by the south door."),
("			const stage = Math.round(((clamp(o.stage ?? 9, 0, 9) >= 7 ? 9 : 6) / 9) * (p.stages ?? 9));",
	 "			// (a tree in a pot on the terrace asks for its own young stage exactly, `o.exact`: one whose roots stay in the pot)\n			const stage = o.exact ?? Math.round(((clamp(o.stage ?? 9, 0, 9) >= 7 ? 9 : 6) / 9) * (p.stages ?? 9));"),
	("	basil: { v: 1, hash: '76947a593571ab762030bf3055654cd1d7390404083e460a65434c4e05d50785', layer: 'herb', h: 0.5, w: 0.4 },",
	 "	basil: { v: 1, hash: '76947a593571ab762030bf3055654cd1d7390404083e460a65434c4e05d50785', layer: 'herb', h: 0.5, w: 0.4 },\n	// the terrace's troughs: Mediterranean herbs, their roots shallow enough for a trough\n	lavender: { v: 1, hash: 'c5e7c0171f81d5d1b3c68d44814fe51bb3714f68a4ef2185cf91f230461c832a', layer: 'herb', h: 0.6, w: 0.6 },\n	rosemary: { v: 1, hash: '69b5c11335d922f06e9f7a89b963edf666f406a9189d70a93d933d1a6116748a', layer: 'herb', h: 0.9, w: 0.7 },"),
	("""	const potted = (rm, x, z, kind, stage, seed) => {
		put(rm, 'pot-terracotta', x, z, 0);
		if (has('pot-terracotta')) plantIn(rm, kind, x, FU_POT_SOIL, z, { stage, seed, turn: x * 3 + z });
	};""",
	 """	/**
	 * A pot with a plant in it. A plant's roots are part of its build, so only one whose roots stay in the pot: a pepper
	 * as it is; for the tropical bushes asked for (a young banana's cord roots run 2.3 m out over the floor, a coffee's
	 * 1 m) a lemon in its first year after planting (its stage 2: 1.3 m, roots 0.52 m deep and 0.23 m out) in a pot 1.6
	 * times the library's (0.8 m across, its soil 0.64 m up).
	 */
	const potted = (rm, x, z, kind, stage, seed) => {
		if (!has('pot-terracotta')) return void fu_missing.add('pot-terracotta');
		const tree = kind === 'banana' || kind === 'coffee', k = tree ? 1.6 : 1;
		dome.place('pot-terracotta', roomMatrix(rm.level, rm.x).multiply(at(x, fu_floorAt(rm.level), z, 0, k)));
		plantIn(rm, tree ? 'lemon' : kind, x, FU_POT_SOIL * k, z, tree ? { exact: 2, turn: x * 3 + z } : { stage, seed, turn: x * 3 + z });
	};"""),
	("if (r() < 0.7) potted(rm, -W + 0.45, -5.0,", "if (r() < 0.7) potted(rm, -W + 0.5, -5.0,"),
	("tables, daybeds, armchairs, benches, lemons and oranges in pots. Walk in by the south door.", "tables, daybeds, armchairs, benches, young lemons in pots, troughs of herbs. Walk in by the south door."),
]
for a, b in subs:
	assert s.count(a) == 1, a[:60]
	s = s.replace(a, b)
open(D + 'v4.js', 'w').write(s)
print('v4.js', len(s))
