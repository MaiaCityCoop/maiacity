#!/usr/bin/env python3
"""An organ against its panel: how well the silhouettes overlap, their proportions, and their colours zone by zone.

    python3 -I tools/plant/compare.py <panel.png> <organ.png> [--box x0 y0 x1 y1]
        [--axis y|x] [--zones 5] [--colourful] [--close 0.04] [--out side-by-side.png]

<panel.png> a crop of the sheet (white ground; --box narrows it to one specimen); <organ.png> the organ bench's
picture of the same organ (organ.mjs, transparent ground; with --flat for its colours). Both are cut to their
silhouettes and scaled to the same length along --axis (sizes come from the data sheet, so only the shape is
compared), then laid on one another:

  overlap  intersection over union of the two silhouettes (1 the same shape; aim for 0.9 and over)
  aspect   length over greatest width, of each
  widths   each one's width (edge to edge) at ten stations along the axis, as parts of its length
  colour   each zone's median (linear sRGB) on both and how far apart they are (aim for under 0.03 a channel)
The picture: the panel, the organ, and the two silhouettes laid over one another (panel red, organ blue, both grey).
"""
import argparse, json
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("panel"); ap.add_argument("organ")
ap.add_argument("--box", nargs=4, type=int)
ap.add_argument("--axis", default="y", choices=["x", "y"])
ap.add_argument("--zones", type=int, default=5)
ap.add_argument("--white", type=float, default=0.1)
ap.add_argument("--close", type=float, default=0, help="close both silhouettes with a disc this part of their height first (0.04 for a crown: compares its envelope, not where light gets through)")
ap.add_argument("--colourful", action="store_true", help="keep only coloured pixels of the panel: drops its grey ground line, scale bars and labels")
ap.add_argument("--out")
a = ap.parse_args()

def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

p = Image.open(a.panel).convert("RGB")
if a.box: p = p.crop(tuple(a.box))
P = np.asarray(p, dtype=np.float32) / 255
pm = (1 - P.min(axis=2)) > a.white
if a.colourful:
    pm &= (P.max(axis=2) - P.min(axis=2)) > 0.12
o = Image.open(a.organ).convert("RGBA")
O = np.asarray(o, dtype=np.float32) / 255
om = O[..., 3] > 0.5
O = O[..., :3]
if a.axis == "x":
    P, pm, O, om = np.rot90(P), np.rot90(pm), np.rot90(O), np.rot90(om)

def cut(img, m):
    ys, xs = np.where(m)
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1], m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

P, pm = cut(P, pm); O, om = cut(O, om)
H = 400
def scaled(img, m):
    h, w = m.shape; W = max(1, round(w * H / h))
    im = np.asarray(Image.fromarray((img * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS), dtype=np.float32) / 255
    mm = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)) > 127
    return im, mm
P, pm = scaled(P, pm); O, om = scaled(O, om)
if a.close:  # a crown's envelope: the gaps between its rosettes filled
    from PIL import ImageFilter
    k = max(3, int(H * a.close) | 1)
    closed = lambda m: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))) > 127
    pm, om = closed(pm), closed(om)
W = max(pm.shape[1], om.shape[1])
def pad(img, m):
    l = (W - m.shape[1]) // 2; r = W - m.shape[1] - l
    return np.pad(img, ((0, 0), (l, r), (0, 0)), constant_values=1), np.pad(m, ((0, 0), (l, r)))
P, pm = pad(P, pm); O, om = pad(O, om)
iou = (pm & om).sum() / max(1, (pm | om).sum())
def extent(row):
    xs = np.where(row)[0]
    return 0 if len(xs) == 0 else xs[-1] - xs[0] + 1
def widths(m):  # each row's extent, edge to edge (a tear or a gap inside it does not narrow it)
    return [round(extent(m[int(k * (H - 1) / 9)]) / H, 3) for k in range(10)]
def aspect(m):
    return round(H / max(1, max(extent(r) for r in m)), 3)
colour = []
for z in range(a.zones):
    lo, hi = int(H * z / a.zones), int(H * (z + 1) / a.zones)
    pz = lin(P[lo:hi][pm[lo:hi]]); oz = lin(O[lo:hi][om[lo:hi]])
    if len(pz) and len(oz):
        mp, mo = np.median(pz, axis=0), np.median(oz, axis=0)
        colour.append({"zone": z, "panel": [round(float(x), 3) for x in mp], "organ": [round(float(x), 3) for x in mo], "off": round(float(np.abs(mp - mo).max()), 3)})
print(json.dumps({"overlap": round(float(iou), 3), "aspect": {"panel": aspect(pm), "organ": aspect(om)},
                  "widths": {"panel": widths(pm), "organ": widths(om)}, "colour": colour}, indent=1))
if a.out:
    over = np.ones((H, W, 3), dtype=np.float32)
    over[pm & ~om] = [0.9, 0.3, 0.3]; over[om & ~pm] = [0.3, 0.4, 0.9]; over[pm & om] = [0.6, 0.6, 0.6]
    O2 = O.copy(); O2[~om] = 1
    Image.fromarray((np.concatenate([P, np.ones((H, 10, 3)), O2, np.ones((H, 10, 3)), over], axis=1) * 255).astype(np.uint8)).save(a.out)
