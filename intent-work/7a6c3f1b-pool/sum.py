import json, sys, collections
r = json.load(open(sys.argv[1])); p = r['probe']; A = [a for a in p['answers'] if a.get('ms')]
print({k: r[k] for k in ('tag','builds','world_s','quiet_s','end_s','cores','backend','workers_seen_by_playwright','errors','unpinned')})
print('steps', r['steps'][:40])
print('frames(boxes)', p['frames'], 'ready msgs', sum(1 for a in p['answers'] if a.get('ready')), 'failed', sum(1 for a in p['answers'] if a.get('ok') is False))
tot = collections.Counter()
for a in A:
    for k, v in a['ms'].items(): tot[k] += v
print('builds answered', len(A), 'engine-side seconds', {k: round(v/1000,1) for k, v in tot.items()}, 'sum', round(sum(tot.values())/1000,1))
rooms = {(a['box'], a['room']) for a in A}; print('distinct (box,room) = workers that built', len(rooms), 'boxes', len({a['box'] for a in A}))
rec = collections.Counter(a['recipe'] for a in A); print('distinct recipes', len(rec), 'built more than once', sum(1 for v in rec.values() if v > 1), 'most', rec.most_common(3))
perbox = collections.Counter(a['box'] for a in A); print('builds per box', dict(perbox))
print('last build answer at s', round(max(a['t'] for a in A)/1000,1) if A else None)
L = p['levels']; jobs = [j for w in L for j in w['jobs']]
print('page workers (levels)', len(L), 'jobs', len(jobs), 'job wall s', round(sum(j[1] for j in jobs)/1000,1), 'last at', max((j[0]+j[1] for j in jobs), default=0)/1000)
s = r.get('stats') or {}
for k in ('out','in','library'):
    if s.get(k): print(k, {x: s[k].get(x) for x in ('kinds','loaded','builds','made','boxed','derived','taken','busy','keptLevels','keptPictures')}, 'failed', len(s[k].get('failed') or []))
