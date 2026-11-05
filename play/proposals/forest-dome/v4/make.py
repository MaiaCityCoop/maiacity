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
]
for a, b in subs:
	assert s.count(a) == 1, a[:60]
	s = s.replace(a, b)
open(D + 'v4.js', 'w').write(s)
print('v4.js', len(s))
