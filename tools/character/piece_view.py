"""A CPU look at a Person head piece's skin as a look builds it (head-piece.cjs's output): front, three-quarter, profile."""
import json, sys, math, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import raster
from PIL import Image
pre, out = sys.argv[1], sys.argv[2]
P = np.fromfile(pre + ".pos.f32", np.float32).reshape(-1, 3).astype(float); C = np.fromfile(pre + ".col.f32", np.float32).reshape(-1, 3)
C = np.where(C <= 0.0031308, 12.92 * C, 1.055 * np.power(np.clip(C, 0, 1), 1 / 2.4) - 0.055)  # linear → sRGB
T = np.load(pre + ".tris.npy"); c = np.array([0, P[:, 1].max() - 0.12, P[:, 2].mean()]); tiles = []
for ang in (0, -35, -90):
    a = math.radians(ang); pos = c + 1.3 * np.array([math.sin(a), 0, math.cos(a)])
    img, *_ = raster.render({"pos": P.ravel().tolist(), "tris": T.ravel().tolist(), "vcol": C.ravel().tolist(), "cam": {"fov": 14, "pos": pos.tolist(), "target": c.tolist()}, "size": [600, 600]})
    tiles.append(img)
Image.fromarray(np.concatenate(tiles, 1)).save(out); print(out)
