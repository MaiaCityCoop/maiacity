#!/usr/bin/env python3
"""Make a Mac job's measuring script deterministic (see determinism.mjs): every `building` probe of the common
pattern also waits for pictures to be kept and taken, and every page gets the seeded Math.random before its first
goto. Run on a job's own copy only (never the repository's): python3 patch.py <script.mjs> …"""
import re, sys
SEED = open(__file__.replace('patch.py', 'determinism.mjs')).read().split('SEEDED_RANDOM = `', 1)[1].split('`;', 1)[0]
QUIET = open(__file__.replace('patch.py', 'determinism.mjs')).read().split('QUIET = `', 1)[1].split('`;', 1)[0]
OLD = "page.evaluate(() => { const s = window.__assets?.stats?.(); return s ? ['out', 'in', 'library'].reduce((a, k) => a + (s[k]?.building ?? 0), 0) : null; })"
for f in sys.argv[1:]:
    s = open(f).read()
    n = s.count(OLD)
    s = s.replace(OLD, "page.evaluate(" + repr(QUIET.strip()) + ")")
    m = 0
    def add(mt):
        global m
        m += 1
        return mt.group(0) + f"\n\tawait page.addInitScript({{ content: {SEED!r} }});"
    s = re.sub(r"const page = await ctx\.newPage\(\);", add, s)
    open(f, 'w').write(s)
    print(f, 'building probes', n, 'seeded pages', m)
