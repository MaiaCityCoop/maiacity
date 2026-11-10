# the main thread's CPU profile up to a second: self time by function, and by the file it is in
import json, sys, collections
p = json.load(open(sys.argv[1])); END = float(sys.argv[2]) * 1e6
nodes = {n['id']: n for n in p['nodes']}
t = p['startTime']; selfc = collections.Counter(); 
parent = {}
for n in p['nodes']:
    for c in n.get('children', []): parent[c] = n['id']
for s, dt in zip(p['samples'], p['timeDeltas']):
    t += dt
    if t - p['startTime'] > END: break
    selfc[s] += dt
name = lambda n: f"{n['callFrame']['functionName'] or '(anon)'} {n['callFrame']['url'].split('/')[-1][:28]}:{n['callFrame']['lineNumber']}:{n['callFrame']['columnNumber']}"
byf = collections.Counter(); byfile = collections.Counter(); total = 0
for i, v in selfc.items():
    n = nodes[i]; byf[name(n)] += v; byfile[n['callFrame']['url'].split('/')[-1][:40] or n['callFrame']['functionName']] += v; total += v
print('total sampled s', round(total / 1e6, 1))
for k, v in byfile.most_common(14): print('  file', round(v / 1e6, 1), k)
for k, v in byf.most_common(28): print('  fn', round(v / 1e6, 2), k)
# inclusive by a few named ancestors
incl = collections.Counter()
for i, v in selfc.items():
    seen = set(); j = i
    while j in nodes:
        fn = nodes[j]['callFrame']['functionName']
        if fn and fn not in seen: incl[fn] += v; seen.add(fn)
        j = parent.get(j)
print('inclusive:', [(k, round(v / 1e6, 1)) for k, v in incl.most_common(45)])
