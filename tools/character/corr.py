"""MediaPipe landmarks on the bare render -> (triangle, barycentric) on the mesh: the correspondence, made once."""
import os, sys, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from cam import load, project
V0 = np.load("V0.npy"); T = np.load("tris.npy")
L = np.load("man-front.lm.npz")["L"]
ids = np.load("man-front.ids.npy")  # triangle index + 1 per pixel (raster.py)
P, Vw = load("man-front"); W, H = ids.shape[1], ids.shape[0]
uv = project(P, Vw, V0, W, H)
import json
s = json.load(open("s-base-front.json")); tris = np.array(s["tris"]).reshape(-1, 3)
out = []
for k, (x, y, _) in enumerate(L):
    i, j = int(round(y)), int(round(x))
    t = ids[i, j] - 1
    if t < 0: out.append((-1, 0, 0, 0)); continue
    a, b, d = uv[tris[t]]
    M = np.array([[a[0] - d[0], b[0] - d[0]], [a[1] - d[1], b[1] - d[1]]])
    l1, l2 = np.linalg.solve(M, [x - d[0], y - d[1]]); out.append((t, l1, l2, 1 - l1 - l2))
C = np.array(out); tri_v = np.array([tris[int(t)] if t >= 0 else [0, 0, 0] for t in C[:, 0]])
np.savez("corr.npz", tri=tri_v, w=C[:, 1:], ok=C[:, 0] >= 0)
X = (V0[tri_v] * C[:, 1:, None]).sum(1); err = np.linalg.norm(project(P, Vw, X, W, H) - L[:, :2], axis=1)
print("landmarks on mesh:", (C[:, 0] >= 0).sum(), "/ 478; reprojection check px:", err[C[:, 0] >= 0].max().round(3))
img = Image.open("man-front.png").convert("RGB"); from PIL import ImageDraw; dr = ImageDraw.Draw(img)
for x, y, _ in L: dr.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(220, 0, 0))
img.save("man-front.lm.png")
