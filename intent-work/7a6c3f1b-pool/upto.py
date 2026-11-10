# worker and main CPU up to a second (tasks clipped at it), workers split into those that live long (the page's own) and short (the boxes')
import json, sys, collections
d = json.load(open(sys.argv[1])); END = float(sys.argv[2]); ev = d['traceEvents'] if isinstance(d, dict) else d
names = {}; T = collections.defaultdict(list)
for e in ev:
    if e.get('ph') == 'M' and e.get('name') == 'thread_name': names[(e['pid'], e['tid'])] = e['args']['name']
    if e.get('ph') == 'X' and e.get('name') in ('ThreadControllerImpl::RunTask', 'RunTask', 'ThreadPool_RunTask'): T[(e['pid'], e['tid'])].append((e['ts'], e.get('dur', 0), e.get('tdur', 0)))
t0 = min(t[0][0] for t in T.values()); end = t0 + END * 1e6
def upto(k):
    c = w = 0
    for ts, du, td in T[k]:
        if ts >= end: continue
        f = min(1, (end - ts) / du) if du else 1
        c += td * f; w += du * f
    return c / 1e6, w / 1e6
W = [k for k in T if 'DedicatedWorker' in names.get(k, '')]
life = lambda k: (T[k][-1][0] + T[k][-1][1] - T[k][0][0]) / 1e6
tot = lambda k: sum(t[2] for t in T[k]) / 1e6
long_ = [k for k in W if life(k) > 30 or tot(k) > 15]; short = [k for k in W if k not in long_]
r = lambda ks: [round(sum(upto(k)[i] for k in ks), 1) for i in (0, 1)]
M = [k for k in T if names.get(k) == 'CrRendererMain']
P = [k for k in T if 'ThreadPool' in names.get(k, '')]
print(json.dumps({'upto_s': END, 'workers_started': sum(1 for k in W if T[k][0][0] < end), 'box_workers_cpu_wall': r(short), 'page_workers_cpu_wall': r(long_), 'all_workers_cpu_wall': r(W), 'main_cpu_wall': r(M), 'threadpool_cpu': r(P)[0]}))
