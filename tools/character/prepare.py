"""The base head, once per work folder: MakeHuman's basis and the man's macro targets, the head's mask and eye centres,
and the bare head's front scene (with triangle ids) for the landmark correspondence.
    python prepare.py [--years 37] [--gender 1] [--muscle 0.75] [--weight 0.5]"""
import argparse, os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhbasis
from macro import macro_offsets
from scene import head_scene
a = argparse.ArgumentParser(); a.add_argument("--years", type=float, default=37); a.add_argument("--gender", type=float, default=1.0)
a.add_argument("--muscle", type=float, default=0.75); a.add_argument("--weight", type=float, default=0.5); o = a.parse_args()
if not os.path.exists("basis.npz"):
    V, F = mhbasis.load_obj(); names, B = mhbasis.basis(len(V))
    np.savez_compressed("basis.npz", V=V, B=B.astype(np.float32), names=np.array(names))
    tris = []
    for f in F: tris += [[f[0], f[1], f[2]]] + ([[f[0], f[2], f[3]]] if len(f) == 4 else [])
    np.save("tris.npy", np.array(tris))
V = np.load("basis.npz")["V"]; T = np.load("tris.npy")
V0 = V + macro_offsets(len(V), o.gender, o.years, o.muscle, o.weight); np.save("V0.npy", V0)
top = V0[:, 1].max(); np.save("headmask.npy", (V0[:, 1] > top - 2.45) & (np.abs(V0[:, 0]) < 1.3))  # the head: its top 24.5 cm
# the eyes' centres: MakeHuman's eye joint helpers
g, idx = None, {}
for line in open(os.path.join(mhbasis.D, "3dobjs", "base.obj")):
    if line.startswith("g "): g = line.split()[1]
    elif line.startswith("f ") and g in ("joint-l-eye", "joint-r-eye"): idx.setdefault(g, set()).update(int(t.split("/")[0]) - 1 for t in line.split()[1:])
E = np.array([V0[list(idx[k])].mean(0) for k in ("joint-l-eye", "joint-r-eye")]); np.save("eyes.npy", E)
head_scene(V0, T, "front", ids=True, out="s-base-front.json", eyes=[[*e, 0.125] for e in E])
print("base head ready: next `python raster.py s-base-front.json man-front`, then lm.py man-front.png and corr.py")
