# workers busy during a load, from a toplevel trace: per second, the sum of the dedicated workers' task time (the number
# of workers busy at once, on average over that second), from navigation to the world shown
import json, sys, collections
trace, shown = sys.argv[1], float(sys.argv[2])
names, t0 = {}, None
busy = collections.defaultdict(lambda: collections.Counter())   # second -> (pid, tid) -> us
tot = collections.Counter()
with open(trace) as f:
    for line in f:
        line = line.strip().rstrip(',')
        if not line.startswith('{'): continue
        try: e = json.loads(line)
        except Exception: continue
        if e.get('ph') == 'M':
            if e.get('name') == 'thread_name': names[(e['pid'], e['tid'])] = e['args']['name']
            continue
        ts = e.get('ts')
        if not ts: continue
        t0 = ts if t0 is None else min(t0, ts)
        if e.get('ph') == 'X' and e.get('name') in ('ThreadControllerImpl::RunTask', 'RunTask'):
            k = (e['pid'], e['tid']); s, d = ts, e.get('dur', 0)
            # spread the task over the seconds it spans
            while d > 0:
                sec = int((s - t0) / 1e6); end = t0 + (sec + 1) * 1e6; part = min(d, end - s)
                busy[sec][k] += part; tot[k] += part; s += part; d -= part
W = lambda k: 'DedicatedWorker' in names.get(k, '')
secs = range(0, int(shown) + 1)
conc = [sum(v for k, v in busy[s].items() if W(k)) / 1e6 for s in secs]
over = [s for s in secs if conc[s] >= 0.5]
workers = [k for k in tot if W(k)]
main = [k for k in tot if names.get(k) == 'CrRendererMain']
out = {'shown_s': shown, 'worker_threads_seen': len(workers), 'workers_busy_over_1s': sum(1 for k in workers if tot[k] >= 1e6),
       'worker_seconds_total': round(sum(tot[k] for k in workers) / 1e6, 1), 'mean_workers_busy': round(sum(conc) / max(1, len(conc)), 2),
       'peak_workers_busy_1s': round(max(conc or [0]), 2), 'seconds_with_4plus_busy': sum(1 for c in conc if c >= 4), 'seconds_with_under_1_busy': sum(1 for c in conc if c < 1),
       'main_thread_busy_s': round(sum(tot[k] for k in main) / 1e6, 1), 'per_10s_mean_busy': [round(sum(conc[i:i + 10]) / len(conc[i:i + 10]), 2) for i in range(0, len(conc), 10)]}
print(json.dumps(out))
