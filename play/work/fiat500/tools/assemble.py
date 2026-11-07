# the whole readable source: the van's runtime, kit.js, parts.js and vehicle.js regions byte for byte, then the
# Fiat's own region, then versions.js, the machines index (the Fiat's), refs.js, recipe.js and the entry
import json,sys,re
van=open(sys.argv[1],encoding='utf8').read()
region=open(sys.argv[2],encoding='utf8').read()
index=open(sys.argv[3],encoding='utf8').read()
data=json.load(open(sys.argv[4]))
out=sys.argv[5]
def cut(s,a,b):
    i=s.index(a); j=s.index(b,i); return s[i:j]
head=van[:van.index('//#region src/lib/machines/van.js')]
tail_versions=cut(van,'//#region src/lib/app/versions.js','//#region src/lib/machines/index.js')
tail_rest=van[van.index('//#region src/lib/assets/refs.js'):]
def arr(v): return '[' + ', '.join('null' if x is None else (f'{x:.4f}'.rstrip('0').rstrip('.') if x!=0 else '0') for x in v) + ']'
for k in ['top','bot','W','front','rear']:
    region=region.replace(f'/*@{k}@*/[]',arr(data[k]))
for k in ['z0','dz','y0','dy']:
    region=region.replace(f'/*@{k}@*/0',str(data[k]))
assert '/*@' not in region, 'a table left out'
src=head+region+('' if region.endswith('\n') else '\n')+tail_versions+index+('' if index.endswith('\n') else '\n')+tail_rest
open(out,'w',encoding='utf8').write(src)
print(len(src),'bytes')
