#!/usr/bin/env python3
"""Numbers from one specimen of the reference sheet: its outline, its width along its length, and its colours.

    python3 -I tools/plant/trace.py <sheet.png> --box x0 y0 x1 y1 --length <metres> \
        [--axis x|y] [--points 48] [--zones 5] [--name leaf] [--out <file.json>]

The box (pixels of the full sheet) holds one specimen on the white ground; --length is its real length along --axis
(from the data sheet, never from the sheet's own scale bars). It prints JSON the recipe can take as it is:

  outline  the silhouette as --points points, in metres, from its base along the axis (a leaf blade's outline for
           `sheet`, a fruit's profile for a lathe)
  width    the full width at --points stations along the axis, in metres (half of it is a lathe's radius)
  girth    the same, measured across the centreline where the organ bends (a finger, a bent stalk)
  bend     the centreline's offset from straight at each station, in metres (how it curves)
  aspect   length over greatest width
  colour   per zone along the axis: the median, 10th and 90th percentile, in linear sRGB 0..1 (three's colours), and
           as hex; the spread is the variation to give each organ by its own chance
Everything white enough (a light box's ground) is outside; a thin grey label or scale bar must be outside the box.
"""
import argparse, json
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("sheet")
ap.add_argument("--box", nargs=4, type=int, required=True)
ap.add_argument("--length", type=float, required=True)
ap.add_argument("--axis", default="y", choices=["x", "y"])
ap.add_argument("--points", type=int, default=48)
ap.add_argument("--zones", type=int, default=5)
ap.add_argument("--name", default="organ")
ap.add_argument("--white", type=float, default=0.10, help="how far from white still counts as ground (0..1)")
ap.add_argument("--out")
a = ap.parse_args()

x0, y0, x1, y1 = a.box
img = np.asarray(Image.open(a.sheet).convert("RGB").crop((x0, y0, x1, y1)), dtype=np.float32) / 255.0
if a.axis == "x":  # always measure along rows: the axis down the image, base at the bottom
    img = np.rot90(img, k=1)
# the specimen: what is not the white ground
mask = (1.0 - img.min(axis=2)) > a.white
rows = np.where(mask.any(axis=1))[0]
if len(rows) == 0:
    raise SystemExit("Nothing but white in that box.")
top, bottom = rows[0], rows[-1]
px = a.length / max(1, bottom - top)  # metres per pixel, from the specimen's real length

def lin(c):  # sRGB to linear, as three keeps colours
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

width, left, right = [], [], []
for k in range(a.points):
    r = int(round(bottom - (bottom - top) * k / (a.points - 1)))
    cols = np.where(mask[r])[0]
    if len(cols) == 0:
        width.append(0.0); left.append(None); right.append(None); continue
    width.append(round(float(cols[-1] - cols[0]) * px, 4))
    left.append(int(cols[0])); right.append(int(cols[-1]))
# the centreline, and the width across it: a curved organ (a finger, a bent stalk) is wider in a row than it is thick
centre = [((l + r) / 2 if l is not None else None) for l, r in zip(left, right)]
girth = []
for k in range(a.points):
    if centre[k] is None:
        girth.append(0.0); continue
    j0, j1 = max(0, k - 2), min(a.points - 1, k + 2)
    while centre[j0] is None: j0 += 1
    while centre[j1] is None: j1 -= 1
    dy = (bottom - top) * (j1 - j0) / (a.points - 1)
    slope = (centre[j1] - centre[j0]) / dy if dy else 0.0
    girth.append(round(width[k] / np.sqrt(1 + slope * slope), 4))
mid = np.median([c for c in centre if c is not None])
outline = []
for k in range(a.points):  # up the right edge, then down the left: a closed outline round the base
    if right[k] is not None:
        outline.append([round(float(right[k] - mid) * px, 4), round(a.length * k / (a.points - 1), 4)])
for k in reversed(range(a.points)):
    if left[k] is not None:
        outline.append([round(float(left[k] - mid) * px, 4), round(a.length * k / (a.points - 1), 4)])

colour = []
for z in range(a.zones):
    lo = int(bottom - (bottom - top) * (z + 1) / a.zones); hi = int(bottom - (bottom - top) * z / a.zones)
    px_ = lin(img[lo:hi + 1][mask[lo:hi + 1]])
    if len(px_) == 0:
        colour.append(None); continue
    med = np.median(px_, axis=0); p10 = np.percentile(px_, 10, axis=0); p90 = np.percentile(px_, 90, axis=0)
    srgb = np.where(med <= 0.0031308, med * 12.92, 1.055 * med ** (1 / 2.4) - 0.055)
    colour.append({"from": round(z / a.zones, 2), "to": round((z + 1) / a.zones, 2),
                   "median": [round(float(v), 4) for v in med], "p10": [round(float(v), 4) for v in p10],
                   "p90": [round(float(v), 4) for v in p90], "hex": "#" + "".join(f"{int(round(v * 255)):02x}" for v in srgb)})

out = {"name": a.name, "box": a.box, "length": a.length, "aspect": round(a.length / max(1e-6, max(width)), 3),
       "width": width, "girth": girth, "bend": [None if c is None else round(float(c - mid) * px, 4) for c in centre],
       "outline": outline, "colour": colour}
text = json.dumps(out, indent=1)
if a.out:
    open(a.out, "w").write(text)
print(text)
