# what a run of mem.ts says: python3 read.py out/<tag>.json [every]
import json,sys,collections
d=json.load(open(sys.argv[1])); ev=int(sys.argv[2]) if len(sys.argv)>2 else 10
MB=lambda x:round((x or 0)/1e6)
print(d['tag'],d['world'],'world',d['world_s'],'quiet',d['quiet_s'],'end',d['end_s'],'errors',d['errors'][:3],'unpinned',len(d['unpinned']))
print('steps',d['steps'])
print('  t   renderer(anon) largest | page used/buffers | boxes n used/buf | simplify n used/buf | cache | gpu buf/tex | sent/got MB | kept-in-page')
for s in d['samples'][::ev]+[max(d['samples'],key=lambda s:s['procs'].get('renderer',{}).get('anon',0))]:
    t=s['targets']; g=s.get('gpu') or {}
    f=lambda k:(t.get(k,{}).get('n',0),MB(t.get(k,{}).get('used')),MB(t.get(k,{}).get('backing')))
    k=s.get('kept'); 
    print(f"{s['t']:6} {MB(s['procs'].get('renderer',{}).get('anon')):5} {MB(s['procs'].get('renderer',{}).get('max')):5} n{s['procs'].get('renderer',{}).get('n')} | {f('page')[1:]} | {f('worker:blob')} | {f('worker:simplify')} | {f('worker:cache')[1:]} | {MB(g.get('buffers'))}/{MB(g.get('textures'))} | {MB(s.get('sent'))}/{MB(s.get('got'))} | {k and {r:MB(k[r]['bytes']) for r in k}} | {s['step'][:34]}")
print('peak',json.dumps(d['peak'])[:900])
# the dump nearest the peak of the largest renderer
ds=[x for x in d.get('dumps',[]) if x['top']]
bypid=collections.defaultdict(list)
for x in ds: bypid[x['pid']].append(x)
tot=lambda x:sum(v for k,v in x['top'].items() if '/' not in k)
for pid,l in sorted(bypid.items(),key=lambda kv:-max(tot(x) for x in kv[1]))[:2]:
    m=max(l,key=tot); e=l[-1]
    for name,x in (('peak',m),('end',e)):
        print('dump pid',pid,name,'t',x['t'],'sum',MB(tot(x)),{k:MB(v) for k,v in x['top'].items() if v>8e6})
g=d.get('gpu') or {}
print('gpu',{k:(v if isinstance(v,int) and v<1e5 else MB(v)) for k,v in g.items() if k not in('byFormat','big','bySize')}); print('gpu buffers by size',{k:(v[0],MB(v[1])) for k,v in (g.get('bySize') or {}).items()})
print('gpu byFormat',{k:(v[0],MB(v[1])) for k,v in (g.get('byFormat') or {}).items() if v[1]>4e6})
big=collections.Counter(tuple(b[:6]) for b in g.get('big',[])); print('gpu big textures made (w,h,layers,format,samples,mips):count',dict(big.most_common(14)))
k=d.get('kept')
if k:
    for r in k: print('kept',r,'kinds',k[r]['kinds'],'MB',MB(k[r]['bytes']),{a:(b['levels'],MB(b['bytes']),b['tris']) for a,b in k[r]['by'].items()}); print('   top',[(x[0],MB(x[1]),x[2]) for x in k[r]['top'][:6]])
p=d.get('probe') or {}
jobs=[(j,w['url']) for w in p.get('levels',[]) for j in w['jobs']]
low=[j for j,u in jobs if j[2] and 'tris' in j[2]]
print('workers made by the page',collections.Counter(w['url'].split('.')[0][:20] for w in p.get('levels',[])))
print('level jobs',len(low),'sent MB',MB(sum(j[2]['bytes'] for j in low)),'back MB',MB(sum(j[3] for j in low)),'moved',sum(j[2].get('moved',0) for j in low),'largest',sorted([(MB(j[2]['bytes']),j[2]['tris'],j[1]//1000,j[0]//1000) for j in low],reverse=True)[:8])
a=p.get('answers',[]); print('box answers',len(a),'MB',MB(sum(x.get('bytes') or 0 for x in a)),'largest',sorted([(MB(x.get('bytes')),x.get('label'),x.get('tris')) for x in a],key=lambda x:-x[0])[:8])
