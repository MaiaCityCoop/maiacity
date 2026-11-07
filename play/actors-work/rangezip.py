# list or extract members of a remote zip by HTTP range requests: python3 -I rangezip.py <url> [pattern] [outdir]
import sys, io, zipfile, urllib.request, re, os
url = sys.argv[1]
class R(io.RawIOBase):
    def __init__(s):
        req = urllib.request.Request(url, method='HEAD'); s.n = int(urllib.request.urlopen(req).headers['Content-Length']); s.p = 0
    def seekable(s): return True
    def readable(s): return True
    def tell(s): return s.p
    def seek(s, o, w=0):
        s.p = o if w == 0 else s.p + o if w == 1 else s.n + o; return s.p
    def readinto(s, b):
        if s.p >= s.n: return 0
        e = min(s.n, s.p + max(len(b), 1 << 16)) - 1
        d = urllib.request.urlopen(urllib.request.Request(url, headers={'Range': f'bytes={s.p}-{e}'})).read()[:len(b)]
        b[:len(d)] = d; s.p += len(d); return len(d)
z = zipfile.ZipFile(io.BufferedReader(R(), 1 << 20))
pat = re.compile(sys.argv[2]) if len(sys.argv) > 2 else None
for i in z.infolist():
    if pat is None or pat.search(i.filename):
        print(i.filename, i.file_size, i.compress_size)
        if len(sys.argv) > 3 and not i.is_dir(): z.extract(i, sys.argv[3])
