# wrap a source's long string literals (base64 data) into joined lists of short lines
import re, sys
src = open(sys.argv[1]).read().split('\n')
out = []
for line in src:
    if len(line) <= 990:
        out.append(line); continue
    m = re.match(r'^(\s*)(.*?)"([A-Za-z0-9+/=]{500,})"(.*)$', line)
    if not m: raise SystemExit('cannot wrap line: ' + line[:120])
    ind, pre, data, post = m.groups()
    chunks = [data[i:i + 900] for i in range(0, len(data), 900)]
    out.append(f'{ind}{pre}[')
    out += [f'{ind}\t"{c}",' for c in chunks]
    out.append(f'{ind}].join(""){post}')
open(sys.argv[2], 'w').write('\n'.join(out))
