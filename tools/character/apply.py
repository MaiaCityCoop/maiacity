import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from scene import head_scene
from scipy.spatial.transform import Rotation as Rot
V0 = np.load("V0.npy"); B = np.load("basis.npz")["B"]; T = np.load("tris.npy"); f = np.load("fit.npz"); E = np.load("eyes.npy")
tag = sys.argv[1] if len(sys.argv) > 1 else "fit"
V = V0 + np.tensordot(f["w"], B, 1); np.save(f"V-{tag}.npy", V)
# eyes follow the mesh: shift each eye by the mean offset of the vertices round it
d = np.linalg.norm(V0 - E[0], axis=1); near0 = d < 0.35; d1 = np.linalg.norm(V0 - E[1], axis=1); near1 = d1 < 0.35
E2 = np.array([E[0] + (V - V0)[near0].mean(0), E[1] + (V - V0)[near1].mean(0)]); np.save(f"eyes-{tag}.npy", E2)
for v in ["front", "three-quarter", "profile"]: head_scene(V, T, v, out=f"s-{tag}-{v}.json", eyes=[[*e, 0.125] for e in E2])
# overlays: fitted landmarks (green) on MediaPipe's (red) on each photo
from PIL import Image, ImageDraw
C = np.load("corr.npz"); tri, bw, ok = C["tri"], C["w"], C["ok"].copy(); ok[468:] = False
U = np.load("units.npy")
for i, view in enumerate(f["views"]):
    X = ((V + np.tensordot(f["e"][i], U, 1))[tri] * bw[:, :, None]).sum(1); cam = f["cams"][i]
    R = Rot.from_rotvec(cam[:3]).as_matrix(); Y = X @ R.T; P = np.c_[cam[3] * Y[:, 0] + cam[4], -cam[3] * Y[:, 1] + cam[5]]
    L = np.load(view + ".lm.npz")["L"]; im = Image.open(str(np.load(view + ".lm.npz")["image"])).convert("RGB"); dr = ImageDraw.Draw(im)
    for k in np.where(ok)[0]:
        dr.line([tuple(L[k, :2]), tuple(P[k])], fill=(255, 255, 0)); dr.ellipse([L[k, 0] - 1.5, L[k, 1] - 1.5, L[k, 0] + 1.5, L[k, 1] + 1.5], fill=(230, 0, 0)); dr.ellipse([P[k, 0] - 1.5, P[k, 1] - 1.5, P[k, 0] + 1.5, P[k, 1] + 1.5], fill=(0, 200, 0))
    im.save(f"overlay-{tag}-{view}.png")
