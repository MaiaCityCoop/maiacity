# the traced outlines (tables.json) binned and smoothed into the tables fiat500.js lofts its shell from
import json,sys
import numpy as np
T=json.load(open(sys.argv[1]))
def binned(rows, key_i, val_i, lo, hi, step, agg=np.median):
    xs=np.arange(lo,hi+1e-9,step); out=[]
    arr=[(r[key_i],r[val_i]) for r in rows if r[val_i] is not None]
    k=np.array([a for a,b in arr]); v=np.array([b for a,b in arr])
    for x in xs:
        m=np.abs(k-x)<=step*0.75
        out.append(float(agg(v[m])) if m.any() else None)
    return xs,out
def smooth(v,n=1):
    v=np.array([np.nan if a is None else a for a in v],float)
    for _ in range(n):
        w=v.copy()
        for i in range(1,len(v)-1):
            if not np.isnan(v[i-1:i+2]).any(): w[i]=(v[i-1]+2*v[i]+v[i+1])/4
        v=w
    return [None if np.isnan(a) else round(float(a),4) for a in v]
Z0,Z1,DZ=-1.42,1.42,0.02
side=T['side']
_,top=binned(side,0,1,Z0,Z1,DZ)
_,plo=binned(side,0,3,Z0,Z1,DZ)
plan=[[r[0],(r[1]+r[2])/2 if r[1] is not None else None] for r in T['plan']]
_,W=binned(plan,0,1,Z0,Z1,DZ)
def prof(name):
    rows=[[r[0],(r[1]+r[2])/2] for r in T[name]]
    ys,v=binned(rows,0,1,0.20,1.30,0.02)
    return smooth(v,1)
out=dict(z0=Z0,dz=DZ,top=smooth(top,1),bot=smooth(plo,1),W=smooth(W,1),y0=0.20,dy=0.02,front=prof('front'),rear=prof('rear'))
json.dump(out,open(sys.argv[2],'w'))
for k in ['top','bot','W']: print(k,len(out[k]),out[k][:4],out[k][-4:])
print('front',out['front']); print('rear',out['rear'])
