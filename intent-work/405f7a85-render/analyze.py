# the load profile of Sandbox 1 (intent 405f7a85): the CPU profile's top functions by self time, the long tasks, and the
# trace's busy time per thread and the GPU process's top events, all in the window 61-205 s (wall, from navigation)
import json, sys, collections, re
P = sys.argv[1]; W0, W1 = 61.0, 205.0; OFF = 0.2   # the profiler and the trace started 0.2 s after navigation
out = {}
# --- CPU profile
prof = json.load(open(f'{P}/cpu.cpuprofile'))
nodes = {n['id']: n for n in prof['nodes']}
t = 0.0; self_us = collections.Counter(); total_win = 0.0
for sid, dt in zip(prof['samples'], prof['timeDeltas']):
    t += dt
    s = t / 1e6 + OFF
    if W0 <= s <= W1:
        cf = nodes[sid]['callFrame']; url = re.sub(r'^.*/', '', cf.get('url') or '')
        key = f"{cf['functionName'] or '(anonymous)'} {url}:{cf.get('lineNumber', -1) + 1}" if url else (cf['functionName'] or '(anonymous)')
        self_us[key] += dt; total_win += dt
top = [{'fn': k, 'self_ms': round(v / 1e3), 'share': round(v / total_win, 3)} for k, v in self_us.most_common(30)]
out['cpu_profile'] = {'window_s': [W0, W1], 'sampled_ms': round(total_win / 1e3), 'top_self': top}
# --- long tasks (page time ~ wall)
meta = json.load(open(f'{P}/profile-meta.json'))
lt = [x for x in meta['long_tasks'] if W0 * 1000 <= x[0] <= W1 * 1000]
out['long_tasks'] = {'count': len(lt), 'sum_ms': sum(x[1] for x in lt), 'max_ms': max([x[1] for x in lt] or [0]), 'over_1s': sorted([x for x in lt if x[1] >= 1000])}
# --- trace, streamed a line at a time
names = {}; busy = collections.Counter(); gpu_ev = collections.Counter(); gpu_n = collections.Counter(); t0 = None
pname = {}
with open(f'{P}/trace.json') as f:
    for line in f:
        line = line.strip().rstrip(',')
        if not line.startswith('{'): continue
        try: e = json.loads(line)
        except Exception: continue
        if e.get('ph') == 'M':
            if e.get('name') == 'thread_name': names[(e['pid'], e['tid'])] = e['args']['name']
            if e.get('name') == 'process_name': pname[e['pid']] = e['args']['name']
            continue
        ts = e.get('ts')
        if ts is None or ts == 0: continue
        if t0 is None or ts < t0: t0 = ts if t0 is None else min(t0, ts)
        if e.get('ph') != 'X': continue
        s = (ts - t0) / 1e6 + OFF
        if not (W0 <= s <= W1): continue
        d = e.get('dur', 0)
        if e.get('name') in ('ThreadControllerImpl::RunTask', 'RunTask') and 'toplevel' in e.get('cat', ''):
            busy[(e['pid'], e['tid'])] += d
        th = names.get((e['pid'], e['tid']), '')
        if th == 'CrGpuMain':
            gpu_ev[e.get('name')] += d; gpu_n[e.get('name')] += 1
win_us = (W1 - W0) * 1e6
out['trace'] = {'threads_busy': sorted([{'thread': names.get(k, str(k)), 'process': pname.get(k[0], str(k[0])), 'busy_s': round(v / 1e6, 1), 'share': round(v / win_us, 2)} for k, v in busy.items() if v > 2e6], key=lambda x: -x['busy_s'])[:12],
                'gpu_main_top': [{'event': k, 'ms': round(v / 1e3), 'n': gpu_n[k]} for k, v in gpu_ev.most_common(15)]}
json.dump(out, open(f'{P}/analysis.json', 'w'), indent=1)
print(json.dumps({'cpu_top10': top[:10], 'long_tasks': {k: out['long_tasks'][k] for k in ('count', 'sum_ms', 'max_ms')}, 'busy': out['trace']['threads_busy'][:6], 'gpu_top': out['trace']['gpu_main_top'][:8]}, indent=1))
