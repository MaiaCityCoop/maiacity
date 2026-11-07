# trace the reference sheet's row-1 silhouettes into mm, as JSON
import sys, json
from PIL import Image; import numpy as np
im=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
R,G,B=im[...,0],im[...,1],im[...,2]
nonbg=im.min(axis=2)<226
red=(R-G>45)&(R-B>40)
GROUND=881.5
out={}
# side cell x 60..1700, y 100..881
def side():
    x0,x1=60,1700
    top=[];bot=[];paintlo=[];painthi=[]
    for x in range(x0,x1):
        col=nonbg[100:int(GROUND)-2,x]; ys=np.where(col)[0]
        rc=red[100:int(GROUND)-2,x]; rs=np.where(rc)[0]
        top.append(int(ys[0])+100 if len(ys) else None); bot.append(int(ys[-1])+100 if len(ys) else None)
        paintlo.append(int(rs[-1])+100 if len(rs) else None); painthi.append(int(rs[0])+100 if len(rs) else None)
    xs=[x for x,t in zip(range(x0,x1),top) if t is not None]
    return dict(x0=x0,top=top,bot=bot,paintlo=paintlo,painthi=painthi,xmin=min(xs),xmax=max(xs),roof=min(t for t in top if t))
s=side(); out['side']=s
print('side extent',s['xmin'],s['xmax'],'roof',s['roof'])
def view(xa,xb):
    rows={}
    for y in range(100,int(GROUND)-2):
        rx=np.where(red[y,xa:xb])[0]; nx=np.where(nonbg[y,xa:xb])[0]
        rows[y]=(int(rx[0])+xa,int(rx[-1])+xa) if len(rx) else None, (int(nx[0])+xa,int(nx[-1])+xa) if len(nx) else None
    return rows
for name,(a,b) in dict(front=(1860,2660),rear=(2850,3640)).items():
    rows=view(a,b)
    ys=[y for y,(r,n) in rows.items() if r]
    print(name,'red rows',min(ys),max(ys))
    l=[rows[y][0][0] for y in ys]; r=[rows[y][0][1] for y in ys]
    print(name,'red x',min(l),max(r))
    out[name]={str(y):rows[y] for y in rows}
# top view
cols={}
for x in range(3840,5430):
    ry=np.where(red[120:845,x])[0]; ny=np.where(nonbg[120:845,x])[0]
    cols[x]=((int(ry[0])+120,int(ry[-1])+120) if len(ry) else None,(int(ny[0])+120,int(ny[-1])+120) if len(ny) else None)
xs=[x for x,(r,n) in cols.items() if r]; print('top red x',min(xs),max(xs), 'y', min(cols[x][0][0] for x in xs), max(cols[x][0][1] for x in xs))
xs2=[x for x,(r,n) in cols.items() if n]; print('top any x',min(xs2),max(xs2))
out['top']={str(x):cols[x] for x in cols}
json.dump(out,open(sys.argv[2],'w'))
