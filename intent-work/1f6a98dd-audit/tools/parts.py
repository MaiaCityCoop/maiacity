import re,sys,glob,json,os
S=os.path.dirname(os.path.abspath(__file__))+'/../out/box/'
def cat(k):
    if k.startswith('Scene / assets / asset pictures'): return 'far pictures (cards)'
    if k.startswith('Scene / assets / Biome cover'): return 'ground cover (library)'
    if k.startswith('Scene / assets /'): return 'plants and things (asset renderers)'
    if k.startswith('Scene / grass'): return 'grass blades'
    if k.startswith('Scene / Scene'): return 'dome inside (hand-built)'
    if k.startswith('Scene / forest-dome'): return 'forest dome (one build)'
    if re.match(r'Scene / Group / (fish|sheep|goat|bird|hen|ant|bee)',k): return 'animals'
    if k.startswith('Scene / Group / player') or 'asset:' in k: return 'placed builds (no levels)'
    if k.startswith('Scene / Group'): return 'village shells, paths, water, props (hand-built)'
    if k.startswith('Scene / Mesh'): return 'ground and scatter'
    if 'stars' in k or 'sky' in k or 'Render Pipeline' in k: return 'sky, stars, output'
    return 'other'
out={}
for f in sorted(glob.glob(S+'parts-*.txt')):
    name=os.path.basename(f)[6:-4]; t=open(f).read()
    m=re.search(r'triangles a frame \(([\d,]+) main, ([\d,]+) shadow\), (\d+) draws',t)
    main,shadow,draws=[int(x.replace(',','')) for x in m.groups()]
    sec={'MAIN':{}, 'SHADOW':{}}; cur=None
    for line in t.split('\n'):
        if '-- MAIN by part' in line: cur='MAIN'; continue
        if '-- SHADOW by part' in line: cur='SHADOW'; continue
        mm=re.match(r'\s+([\d,]+)\s+(\d+) draws  (.*)',line)
        if cur and mm:
            n=int(mm.group(1).replace(',','')); c=int(mm.group(2)); k=cat(mm.group(3))
            e=sec[cur].setdefault(k,[0,0]); e[0]+=n; e[1]+=c
    row={}
    for s,tot in (('MAIN',main),('SHADOW',shadow)):
        sm=sum(v[0] for v in sec[s].values()) or 1; sc=sum(v[1] for v in sec[s].values()) or 1
        for k,v in sec[s].items():
            row.setdefault(k,{})[s]={'tris':round(v[0]/sm*tot),'share':round(v[0]/sm*100,1),'draw_share':round(v[1]/sc*100,1), 'draws': v[1] if s=='MAIN' else None}
    out[name]={'main':main,'shadow':shadow,'draws':draws,'parts':row}
    print(f'\n{name}: main {main:,}  shadow {shadow:,}  draws {draws}')
    for k,v in sorted(row.items(), key=lambda kv:-(kv[1].get('MAIN',{}).get('tris',0)+kv[1].get('SHADOW',{}).get('tris',0))):
        a=v.get('MAIN',{}); b=v.get('SHADOW',{})
        print(f"  {k:50s} main {a.get('tris',0):>10,} {a.get('share',0):5.1f}% {str(a.get('draws','')):>5} draws | shadow {b.get('tris',0):>10,} {b.get('share',0):5.1f}%")
json.dump(out,open(S+'parts.json','w'),indent=1)
