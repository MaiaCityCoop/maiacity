"""Write a render scene for render.mjs: the head region of a mesh, a camera on it."""
import json, sys, numpy as np, math
def head_scene(V, tris, view="front", size=(1024, 1024), fov=12, ids=False, uv=None, tex=None, out=None, eyes=None):
    # the head: y above the chin-ish line; centre of the skull
    hm = np.load("headmask.npy")
    H = V[hm]; lo, hi = H.min(0), H.max(0)
    keep = V[:, 1] > lo[1] - 0.6 * (hi[1] - lo[1])
    t = tris[keep[tris].all(1)]
    c = np.array([0.0, (lo[1] + hi[1]) / 2 - 0.08 * (hi[1] - lo[1]), (lo[2] + hi[2]) / 2]); d = (hi[1] - lo[1]) * 1.25 / (2 * math.tan(math.radians(fov / 2)))
    ang = {"front": 0, "three-quarter": 35, "profile": 90}[view] if isinstance(view, str) else view
    a = math.radians(ang)
    pos = c + d * np.array([math.sin(a), 0.0, math.cos(a)])
    s = {"pos": V.ravel().round(5).tolist(), "tris": t.ravel().tolist(), "cam": {"fov": fov, "pos": pos.tolist(), "target": c.tolist()}, "size": list(size), "ids": ids}
    if eyes is not None: s["eyes"] = [list(map(float, e)) for e in eyes]
    if uv is not None: s["uv"] = uv.ravel().tolist()
    if tex is not None: s["tex"] = tex
    json.dump(s, open(out, "w")); return t
