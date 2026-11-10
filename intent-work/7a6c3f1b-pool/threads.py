import json, sys, collections
END = float(sys.argv[2]) if len(sys.argv) > 2 else 1e9
d = json.load(open(sys.argv[1])); ev = d['traceEvents'] if isinstance(d, dict) else d
names = {}; cpu = collections.Counter(); wall = collections.Counter(); first = {}; last = {}; tasks = collections.defaultdict(list)
for e in ev:
    if e.get('ph') == 'M' and e.get('name') == 'thread_name': names[(e['pid'], e['tid'])] = e['args']['name']
    if e.get('ph') == 'X' and e.get('name') in ('ThreadControllerImpl::RunTask', 'RunTask'):
        k = (e['pid'], e['tid']); cpu[k] += e.get('tdur', 0); wall[k] += e.get('dur', 0); first.setdefault(k, e['ts']); last[k] = e['ts'] + e.get('dur', 0)
        tasks[k].append((e['ts'], e.get('dur', 0), e.get('tdur', 0)))
t0 = min(first.values())
W = [k for k in cpu if 'DedicatedWorker' in names.get(k, '')]
# long-lived (over 30 s of life) against short-lived
long_ = [k for k in W if (last[k] - first[k]) > 30e6]; short = [k for k in W if k not in long_]
f = lambda ks: (len(ks), round(sum(cpu[k] for k in ks) / 1e6, 1), round(sum(wall[k] for k in ks) / 1e6, 1))
print('long-lived workers (n, cpu s, wall s)', f(long_)); print('short-lived', f(short))
for k in sorted(long_, key=lambda k: -cpu[k])[:16]: print('  long', round((first[k]-t0)/1e6,1), 'to', round((last[k]-t0)/1e6,1), 'cpu', round(cpu[k]/1e6,1), 'tasks', len(tasks[k]))
# a short-lived worker's first task (the engine read and run) and the rest
firsts = sorted(tasks[k][0][2] / 1e3 for k in short if tasks[k])
big1 = [max(t[2] for t in tasks[k][:3]) / 1e3 for k in short]
print('short-lived: first task cpu ms median', firsts[len(firsts)//2], 'p90', firsts[int(len(firsts)*.9)], 'sum s', round(sum(firsts)/1e3,1))
# workers that did nothing but start (cpu under 0.5 s): the spares and tiny builds
idle = [k for k in short if len(tasks[k]) <= 3]; print('short-lived with at most 3 tasks', f(idle))
# tasks per short worker distribution
c = collections.Counter(min(len(tasks[k]), 8) for k in short); print('tasks per short worker', sorted(c.items()))
# sample: five short workers' tasks
for k in short[40:46]: print('  ', [(round((t[0]-t0)/1e6,2), round(t[2]/1e3)) for t in tasks[k][:8]])
# concurrency: per-10s cpu of workers
per = collections.Counter()
for k in W:
    for ts, du, td in tasks[k]: per[int((ts - t0) / 10e6)] += td
print('worker cpu per 10 s', [round(per[i] / 1e6, 1) for i in range(max(per) + 1)])
perm = collections.Counter()
for k in cpu:
    if names.get(k) == 'CrRendererMain':
        for ts, du, td in tasks[k]: perm[int((ts - t0) / 10e6)] += td
print('main cpu per 10 s', [round(perm[i] / 1e6, 1) for i in range(max(perm) + 1)])
