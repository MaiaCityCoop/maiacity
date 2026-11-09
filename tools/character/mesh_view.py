"""A CPU look at a built person's bind pose (build-recipe.mjs's MESH json): front, three-quarter, side, full length."""
import json, sys, math, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import raster
from PIL import Image
m = json.load(open(sys.argv[1])); P = np.array(m["pos"]).reshape(-1, 3); C = np.array(m["col"]).reshape(-1, 3)
C = np.where(C <= 0.0031308, 12.92 * C, 1.055 * np.power(np.clip(C, 0, 1), 1 / 2.4) - 0.055)
T = np.array(m["index"]).reshape(-1, 3); H = P[:, 1].max(); c = np.array([0, H / 2, 0]); tiles = []
for ang in (0, -35, -90):
    a = math.radians(ang); img, *_ = raster.render({"pos": P.ravel().tolist(), "tris": T.ravel().tolist(), "vcol": C.ravel().tolist(), "cam": {"fov": 20, "pos": (c + 5.6 * np.array([math.sin(a), 0, math.cos(a)])).tolist(), "target": c.tolist()}, "size": [500, 1000]})
    tiles.append(img)
Image.fromarray(np.concatenate(tiles, 1)).save(sys.argv[2]); print(sys.argv[2])
