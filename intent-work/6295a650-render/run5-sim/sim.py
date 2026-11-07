# Run 5's far census (out/run5 on the branch intent-work/6295a650-render), the selector's choice replayed on the CPU:
# each copy's level from its size on screen and its kind's thresholds, as they were (base, head 8e9a45210) and held to
# lod.js DENSITY (heldTo: a level hands over no later than one triangle per 1/DENSITY pixels of its square). A copy past
# its last threshold is its picture (no triangles) when its kind has one, else its coarsest shape. Usage:
#   python3 sim.py <dir with base-census.json and head-census.json> [DENSITY]
import json, math, sys
d, DENSITY = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 0.2

def census(site, density=None):
    c = json.load(open(f'{d}/{site}-census.json')); by = {}; rows = []
    for renderer, kinds in c.items():
        for k in kinds:
            n, t = len(k['levels']), list(k['thresholds'])
            if density:
                for i, tr in enumerate(k['levels']):
                    if tr: t[i] = max(t[i], math.sqrt(tr / density) / 1080)
                for i in range(len(t) - 2, -1, -1): t[i] = max(t[i], t[i + 1])
            cost = shapes = 0
            for cp in k['copies']:
                if cp['level'] == 'unseen': continue
                if density is None: L = n if cp['level'] == 'picture' else cp['level']
                else: L = next((i for i, x in enumerate(t) if cp['size'] >= x), n)
                if L >= n:
                    if k['picture']: continue
                    L = n - 1
                cost += k['levels'][L] or next((x for x in k['levels'][L:] if x), 0); shapes += 1
            by[renderer] = by.get(renderer, 0) + cost
            if cost: rows.append((cost, shapes, renderer, k['label'], k['radius']))
    rows.sort(reverse=True)
    return by, rows

for name, site, dens in [('base 6d0d7ac', 'base', None), ('head 8e9a45210', 'head', None), (f'head held to DENSITY {DENSITY}', 'head', DENSITY)]:
    by, rows = census(site, dens)
    print(f'{name}: {sum(by.values()):,} triangles in shapes ({", ".join(f"{r} {v:,}" for r, v in by.items())})')
    for cost, shapes, r, label, radius in rows[:6]: print(f'    {label} (r {radius} m, {r}): {shapes} shapes, {cost:,}')
