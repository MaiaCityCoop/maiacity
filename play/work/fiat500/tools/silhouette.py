# c3: the build's orthographic silhouettes against the sheet's row-1 cells, both in mm, and how far apart their
# outlines are. python3 silhouette.py <triangles.bin> <sheet.jpg> <out dir>
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
tri = np.fromfile(sys.argv[1], dtype=np.float32).reshape(-1, 3, 3)
sheet = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)
out = sys.argv[3]; os.makedirs(out, exist_ok=True)
MM = 2.0  # mm per pixel
G = 881.5
nonbg = sheet.min(axis=2) < 226
# each view: the sheet's cell, how its pixels map to (u, v) metres, and how the model's (x, y, z) map to (u, v)
VIEWS = {
    'side':  dict(cell=(60, 100, 1700, 878), u=lambda X: (X - 878) * 0.001847, v=lambda Y: (G - Y) * 0.0017608, m=lambda p: (p[..., 2], p[..., 1])),
    'front': dict(cell=(1870, 100, 2650, 878), u=lambda X: (X - 2257.5) * 0.001753, v=lambda Y: (G - Y) * 0.0017469, m=lambda p: (p[..., 0], p[..., 1])),
    'rear':  dict(cell=(2860, 100, 3640, 878), u=lambda X: (X - 3245) * 0.001746, v=lambda Y: (G - Y) * 0.00174, m=lambda p: (-p[..., 0], p[..., 1])),
    'top':   dict(cell=(3845, 125, 5425, 840), u=lambda X: -(X - 4636) * 0.0018917, v=lambda Y: (478 - Y) * 0.0019643, m=lambda p: (p[..., 2], -p[..., 0])),
}
U0, U1, V0, V1 = -1.6, 1.6, -0.1, 1.45
def canvas(view):
    if view == 'top': return (-1.6, 1.6, -0.8, 0.8)
    if view in ('front', 'rear'): return (-0.8, 0.8, -0.05, 1.45)
    return (-1.6, 1.6, -0.05, 1.45)
# what the spec leaves off the car (its door mirror): the sheet's outline there is not compared, (u0, u1, v0, v1) m
SKIP = {'front': [(.55, .82, .76, 1.06)], 'rear': [(-.82, -.55, .76, 1.06)], 'top': [(.45, .8, -.85, -.6)], 'side': []}
report = {}
for name, V in VIEWS.items():
    u0, u1, v0, v1 = canvas(name)
    W = int((u1 - u0) * 1000 / MM); H = int((v1 - v0) * 1000 / MM)
    toPx = lambda u, v: ((u - u0) * 1000 / MM, (v1 - v) * 1000 / MM)
    # the sheet's mask resampled into mm pixels
    x0, y0, x1, y1 = V['cell']
    jj, ii = np.meshgrid(np.arange(W), np.arange(H))
    U = u0 + (jj + .5) * MM / 1000; Vv = v1 - (ii + .5) * MM / 1000
    # invert the cell's linear maps
    du = V['u'](1) - V['u'](0); ou = V['u'](0); dv = V['v'](1) - V['v'](0); ov = V['v'](0)
    X = ((U - ou) / du).round().astype(int); Y = ((Vv - ov) / dv).round().astype(int)
    ok = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1)
    S = np.zeros((H, W), bool); S[ok] = nonbg[Y[ok], X[ok]]
    S = ndimage.binary_opening(S, iterations=1)
    lab, n = ndimage.label(S); sizes = ndimage.sum(S, lab, range(1, n + 1)); S = lab == (1 + int(np.argmax(sizes)))
    S = ndimage.binary_fill_holes(S)
    skip = np.zeros_like(S)
    for (a, b, c, e) in SKIP[name]: skip |= (U >= a) & (U <= b) & (Vv >= c) & (Vv <= e)
    # the model's mask: every triangle drawn
    img = Image.new('1', (W, H), 0); d = ImageDraw.Draw(img)
    u, v = V['m'](tri)
    for k in range(len(tri)):
        d.polygon([toPx(u[k, q], v[k, q]) for q in range(3)], fill=1)
    Mk = ndimage.binary_fill_holes(np.asarray(img))
    # outlines and their distances (mm), both ways
    edge = lambda A: A & ~ndimage.binary_erosion(A)
    eS, eM = edge(S) & ~skip, edge(Mk) & ~skip
    dS = ndimage.distance_transform_edt(~edge(S)) * MM; dM = ndimage.distance_transform_edt(~edge(Mk)) * MM
    m2s = dS[eM]; s2m = dM[eS]
    # the body's outline alone: leaving out the tyres (the sheet's are 8 % over the cited 514 mm) and the underside
    # below the sills (exhaust, sump), each zone named here
    if name == 'side': under = (np.hypot(U - .99, Vv - .278) < .3) | (np.hypot(U + .905, Vv - .278) < .3) | (Vv < .2)
    elif name in ('front', 'rear'): under = (Vv < .27)
    else: under = np.zeros_like(Vv, bool)
    bm2s = dS[eM & ~under]; bs2m = dM[eS & ~under]
    body = np.concatenate([bm2s, bs2m])
    badm = eM & ~under & (dS > 20); bads = eS & ~under & (dM > 20)
    lab2, n2 = ndimage.label(ndimage.binary_dilation(badm | bads, iterations=3))
    where = []
    for k in range(1, n2 + 1):
        sel = (lab2 == k) & (badm | bads)
        if sel.sum() < 3: continue
        vals = np.concatenate([dS[sel & badm], dM[sel & bads]])
        where.append(dict(u=round(float(U[sel].mean()), 3), v=round(float(Vv[sel].mean()), 3), n=int(sel.sum()), max=round(float(vals.max()), 1), side='model out' if (sel & badm).sum() >= (sel & bads).sum() else 'sheet out'))
    print(name, sorted(where, key=lambda w: -w['n'])[:12], file=sys.stderr)
    area = float(Mk.sum()) * (MM / 1000) ** 2
    report[name] = dict(area_m2=area, model_to_sheet_max=float(m2s.max()), model_to_sheet_p95=float(np.percentile(m2s, 95)), sheet_to_model_max=float(s2m.max()), sheet_to_model_p95=float(np.percentile(s2m, 95)), mean=float(np.concatenate([m2s, s2m]).mean()), within20=float((np.concatenate([m2s, s2m]) <= 20).mean()), body_max=float(body.max()), body_p99=float(np.percentile(body, 99)), body_mean=float(body.mean()), body_within20=float((body <= 20).mean()))
    # a picture: sheet outline red, model outline blue, where they part by more than 20 mm yellow
    pic = np.full((H, W, 3), 255, np.uint8)
    pic[S] = (235, 225, 225); pic[Mk & ~S] = (210, 220, 245)
    pic[eS] = (220, 30, 30); pic[eM] = (30, 60, 220)
    bad = (eM & (dS > 20)) | (eS & (dM > 20)); pic[ndimage.binary_dilation(bad, iterations=2)] = (240, 200, 0)
    Image.fromarray(pic).save(os.path.join(out, f'c3-{name}.png'))
    np.save(os.path.join(out, f'dev-{name}.npy'), np.stack([eS * dM, eM * dS]))
print(json.dumps(report, indent=1))
json.dump(report, open(os.path.join(out, 'c3.json'), 'w'), indent=1)
