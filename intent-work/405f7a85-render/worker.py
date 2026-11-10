# what the dedicated worker(s) run in the window: devtools.timeline's FunctionCall / EvaluateScript / RunMicrotasks and
# v8.execute's events on worker threads, by name and script; and the main thread's long tasks over 1 s
import json, sys, collections, re
P = sys.argv[1]; W0, W1 = 61.0, 205.0; OFF = 0.2
names = {}; t0 = None
fc = collections.Counter(); fcn = collections.Counter(); ev = collections.Counter(); workers = collections.Counter(); urls = collections.Counter()
with open(f'{P}/trace.json') as f:
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
        th = names.get((e.get('pid'), e.get('tid')), '')
        if 'Worker' not in th or e.get('ph') != 'X': continue
        s = (ts - t0) / 1e6 + OFF
        if not (W0 <= s <= W1): continue
        d = e.get('dur', 0); n = e.get('name')
        ev[n] += d; workers[(e['pid'], e['tid'])] += 0
        data = (e.get('args') or {}).get('data') or {}
        if n in ('FunctionCall', 'EvaluateScript', 'v8.run', 'V8.Execute'):
            u = re.sub(r'^.*/', '', data.get('url') or data.get('scriptName') or '')
            key = f"{n}: {data.get('functionName') or ''} {u}:{data.get('lineNumber', '')}"
            fc[key] += d; fcn[key] += 1
            if u: urls[u] += d
print('worker threads:', [names.get(k) for k in workers])
print('top worker events (s):', [(k, round(v / 1e6, 1)) for k, v in ev.most_common(10)])
print('top worker calls (s):'); [print(f'  {round(v / 1e6, 1)} s, {fcn[k]}x  {k}') for k, v in fc.most_common(12)]
print('worker scripts (s):', [(k, round(v / 1e6, 1)) for k, v in urls.most_common(6)])
