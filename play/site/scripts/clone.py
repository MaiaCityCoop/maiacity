#!/usr/bin/env python3
"""Clone legacy modules into play's site (play/SPEC.md §1: cloned, never imported, so the two drift apart).

  python3 play/site/scripts/clone.py <list of repo paths>

Each file lands under play/site/src/lib/ by its root: maia/content/X -> content/X, aven/kernel/X -> kernel/X,
maia/site/lib/X -> site/X. Aliases are rewritten to play's ($content/ -> $lib/content/, $kernel/ -> $lib/kernel/,
$lib/ -> $lib/site/); a relative import that leaves its root is rewritten to the alias of where it lands. A file that
exists already is left alone (play's own changes win), unless --force.
"""
import os, re, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DST = os.path.join(R, 'play/site/src/lib')
ROOTS = [('maia/content/', 'content/'), ('aven/kernel/', 'kernel/'), ('maia/site/lib/', 'site/')]

def land(p):
    for a, b in ROOTS:
        if p.startswith(a): return b + p[len(a):]
    return None

def rewrite(src, path):
    def alias(spec):
        if spec.startswith('$content/'): return '$lib/content/' + spec[9:]
        if spec.startswith('$kernel/'): return '$lib/kernel/' + spec[8:]
        if spec.startswith('$lib/'): return '$lib/site/' + spec[5:]
        if spec.startswith('.'):
            target = os.path.normpath(os.path.join(os.path.dirname(path), spec))
            here, there = land(path), land(target + ('/' if spec.endswith('/') else ''))
            if there is None: print('OUTSIDE', path, spec, file=sys.stderr); return spec
            if here.split('/')[0] != there.split('/')[0]: return '$lib/' + there
        return spec
    return re.sub(r"""((?:from|import)\s*\(?\s*|new URL\(\s*)(['"])([^'"]+)\2""", lambda m: m.group(1) + m.group(2) + alias(m.group(3)) + m.group(2), src)

force = '--force' in sys.argv
n = 0
for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
    to = land(p)
    if to is None: print('SKIP', p, file=sys.stderr); continue
    out = os.path.join(DST, to)
    if os.path.exists(out) and not force: continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(os.path.join(R, p)) as f: src = f.read()
    with open(out, 'w') as f: f.write(rewrite(src, p))
    n += 1
print(f'cloned {n} files', file=sys.stderr)
