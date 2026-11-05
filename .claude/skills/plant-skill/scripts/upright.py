"""Crop one specimen off the sheet and turn it upright along its main axis (base down), on white: for compare.py."""
import sys, numpy as np
from PIL import Image
src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
white = float(sys.argv[7]) if len(sys.argv) > 7 else 0.06
im = Image.open(src).convert("RGB").crop((x0, y0, x1, y1))
a = np.asarray(im, dtype=np.float32) / 255
m = (1 - a.min(2)) > white
ys, xs = np.nonzero(m)
c = np.cov(np.stack([xs - xs.mean(), ys - ys.mean()]))
w, v = np.linalg.eigh(c)
ax = v[:, 1]
ang = np.degrees(np.arctan2(ax[0], ax[1]))  # from vertical
if ang > 90: ang -= 180
if ang < -90: ang += 180
pad = Image.new("RGB", (im.width + 200, im.height + 200), (255, 255, 255))
pad.paste(im, (100, 100))
r = pad.rotate(-ang, resample=Image.BICUBIC, fillcolor=(255, 255, 255))
r.save(out)
print(f"turned {-ang:.1f}°")
