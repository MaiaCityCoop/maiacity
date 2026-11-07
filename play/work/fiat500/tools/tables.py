import json,sys
import numpy as np
T=json.load(open(sys.argv[1]))
GROUND=881.5
s=T['side']; x0=s['x0']
L,W,H=2.970,1.320,1.325
sx=L/(s['xmax']-s['xmin']+1); sy=H/(GROUND-s['roof'])
zmid=(s['xmin']+s['xmax']+1)/2
def Z(x): return (x-zmid)*sx
def Y(y): return (GROUND-y)*sy
side=[]
for i,(t,b,pl,ph) in enumerate(zip(s['top'],s['bot'],s['paintlo'],s['painthi'])):
    x=x0+i
    if t is None: continue
    side.append([round(Z(x+0.5),4),round(Y(t),4),round(Y(b+1),4),round(Y(pl+1),4) if pl else None,round(Y(ph),4) if ph else None])
out={'side':side,'scale':{'side':[sx,sy]}}
for name in ['front','rear']:
    rows=T[name]; ys=[int(y) for y,(r,n) in rows.items() if r]
    l=min(rows[str(y)][0][0] for y in ys); r=max(rows[str(y)][0][1] for y in ys)
    top=min(int(y) for y,(rr,n) in rows.items() if n and n[1]-n[0]>40)
    cx=(l+r+1)/2; kx=W/(r-l+1); ky=H/(GROUND-top)
    prof=[]
    for y in sorted(ys):
        a,b=rows[str(y)][0]; n=rows[str(y)][1]
        prof.append([round((GROUND-y)*ky,4),round((cx-a)*kx,4),round((b+1-cx)*kx,4),round((cx-n[0])*kx,4),round((n[1]+1-cx)*kx,4)])
    out[name]=prof; out['scale'][name]=[kx,ky,top,cx]
tp=T['top']; xs=[int(x) for x,(r,n) in tp.items() if n]
xa,xb=min(xs),max(xs)
ys_=[tp[str(x)][0] for x in xs if tp[str(x)][0]]
ya=min(v[0] for v in ys_); yb=max(v[1] for v in ys_)
cy=(ya+yb+1)/2; kz=L/(xb-xa+1); kw=W/(yb-ya+1)
cxz=(xa+xb+1)/2
plan=[]
for x in xs:
    r,n=tp[str(x)]
    plan.append([round(-(x+0.5-cxz)*kz,4), round((cy-r[0])*kw,4) if r else None, round((r[1]+1-cy)*kw,4) if r else None, round((cy-n[0])*kw,4), round((n[1]+1-cy)*kw,4)])
out['plan']=plan; out['scale']['plan']=[kz,kw,cy,cxz]
json.dump(out,open(sys.argv[2],'w'))
print(json.dumps(out['scale']))
