# per thread: the top-level tasks' wall time (dur) and CPU time (tdur), from a toplevel trace; workers, main, the rest
import json, sys, collections
trace = sys.argv[1]; end = float(sys.argv[2]) if len(sys.argv) > 2 else 1e9
d = json.load(open(trace))
ev = d['traceEvents'] if isinstance(d, dict) else d
names, pnames = {}, {}
wall, cpu, first, last, ntask = collections.Counter(), collections.Counter(), {}, {}, collections.Counter()
t0 = min(e['ts'] for e in ev if e.get('ph') == 'X' and e.get('ts'))
for e in ev:
    if e.get('ph') == 'M':
        if e.get('name') == 'thread_name': names[(e['pid'], e['tid'])] = e['args']['name']
        if e.get('name') == 'process_name': pnames[e['pid']] = e['args']['name']
        continue
    if e.get('ph') == 'X' and e.get('name') in ('ThreadControllerImpl::RunTask', 'RunTask', 'ThreadPool_RunTask'):
        if (e['ts'] - t0) / 1e6 > end: continue
        k = (e['pid'], e['tid'])
        wall[k] += e.get('dur', 0); cpu[k] += e.get('tdur', 0); ntask[k] += 1
        first.setdefault(k, e['ts']); last[k] = e['ts'] + e.get('dur', 0)
W = [k for k in wall if 'DedicatedWorker' in names.get(k, '')]
M = [k for k in wall if names.get(k) == 'CrRendererMain']
s = lambda ks, c: round(sum(c[k] for k in ks) / 1e6, 1)
out = {'worker_threads': len(W), 'workers_over_1s': sum(1 for k in W if wall[k] >= 1e6), 'workers_over_100ms': sum(1 for k in W if wall[k] >= 1e5),
       'worker_wall_s': s(W, wall), 'worker_cpu_s': s(W, cpu),
       'main_threads': [{'pid': k[0], 'proc': pnames.get(k[0]), 'wall_s': round(wall[k] / 1e6, 1), 'cpu_s': round(cpu[k] / 1e6, 1)} for k in sorted(M, key=lambda k: -wall[k])],
       'life_s_median': sorted((last[k] - first[k]) / 1e6 for k in W)[len(W) // 2] if W else None}
other = collections.Counter()
for k in wall:
    if k in W or k in M: continue
    other[(pnames.get(k[0], '?'), names.get(k, '?'))] += cpu[k]
out['other_cpu_s_top'] = [(a, b, round(v / 1e6, 1)) for (a, b), v in other.most_common(8)]
# short-lived workers: cpu of workers by bucket of their cpu
b = collections.Counter()
for k in W:
    c = cpu[k] / 1e6
    b['<0.1' if c < .1 else '<0.5' if c < .5 else '<2' if c < 2 else '<10' if c < 10 else '>=10'] += 1
out['workers_by_cpu_s'] = dict(b)
print(json.dumps(out, indent=1))
