#!/usr/bin/env python3
"""The overlap of an organ's body with its panel, its thin parts (rootlets, hairs, bristles) left out.

    python3 -I tools/plant/body.py <panel.png> <organ.png> [white 0.25] [open-panel 4] [open-organ 3]

Both silhouettes are opened (eroded then dilated by that many pixels, so what is thinner than twice it goes), cut to
their bounds, scaled to one height and centred; it prints their overlap and both aspects (height over width). The
panel's ground is what is within `white` of white; the organ's is its alpha (organ.mjs draws on a clear ground).
Yam v1's tubers: 0.88 with their rootlets (compare.py), 0.925 bodies alone.
"""
import sys, numpy as np
from PIL import Image

def mask(path, white):
    a = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255
    return a[..., 3] > 0.5 if a[..., 3].min() < 0.5 else (1 - a[..., :3].min(2)) > white

def shift(m, k, op):
    o = m.copy()
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            o = op(o, np.roll(np.roll(m, dy, 0), dx, 1))
    return o

def body(m, k):
    return shift(shift(m, k, np.logical_and), k, np.logical_or) if k > 0 else m

def norm(m, H=400, W=600):
    ys, xs = np.where(m)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    a = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((max(1, round(w * H / h)), H))) > 127
    out = np.zeros((H, max(W, a.shape[1])), bool)
    x0 = (out.shape[1] - a.shape[1]) // 2
    out[:, x0:x0 + a.shape[1]] = a
    return out

white = float(sys.argv[3]) if len(sys.argv) > 3 else 0.25
kp = int(sys.argv[4]) if len(sys.argv) > 4 else 4
ko = int(sys.argv[5]) if len(sys.argv) > 5 else 3
p = norm(body(mask(sys.argv[1], white), kp))
o = norm(body(mask(sys.argv[2], 0.1), ko), W=p.shape[1])
p = norm(body(mask(sys.argv[1], white), kp), W=o.shape[1])
print(f"body overlap {(p & o).sum() / (p | o).sum():.3f}  aspect panel {p.shape[0] / p.any(0).sum():.3f}  organ {o.shape[0] / o.any(0).sum():.3f}")
