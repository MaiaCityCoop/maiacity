# c1: the shared regions byte for byte against the travel van's head source, and no name of theirs defined again
import sys, re, hashlib
van = open(sys.argv[1], encoding='utf8').read(); src = open(sys.argv[2], encoding='utf8').read()
def region(s, name):
    a = s.index(f'//#region {name}\n'); b = s.index('//#endregion\n', a) + len('//#endregion\n'); return s[a:b]
ok = True
for r in ['src/lib/assets/kit.js', 'src/lib/assets/parts.js', 'src/lib/machines/vehicle.js', 'src/lib/app/versions.js', 'src/lib/assets/refs.js', 'src/lib/assets/recipe.js']:
    a, b = region(van, r), region(src, r)
    same = a == b; ok &= same
    print(f'{r}: {len(a)} bytes, blake/sha256 {hashlib.sha256(a.encode()).hexdigest()[:16]} — {"identical" if same else "DIFFERENT"}')
print('runtime and requires identical:', van[:van.index('//#region src/lib/assets/kit.js')] == src[:src.index('//#region src/lib/assets/kit.js')])
base = ''.join(region(src, r) for r in ['src/lib/assets/kit.js', 'src/lib/assets/parts.js', 'src/lib/machines/vehicle.js'])
names = set(re.findall(r'^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)', base, re.M))
fiat = region(src, 'src/lib/machines/fiat500.js')
mine = re.findall(r'^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)', fiat, re.M)
clash = [n for n in mine if n in names]
print(f'the base defines {len(names)} names; fiat500.js defines {len(mine)} top-level names: {", ".join(mine)}')
print('redefined:', clash or 'none')
used = sorted(n for n in names if re.search(r'\b' + re.escape(n) + r'\b', fiat))
print(f'base names fiat500.js uses ({len(used)}):', ', '.join(used))
sys.exit(0 if ok and not clash else 1)
