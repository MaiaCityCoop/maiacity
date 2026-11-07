"""Fit MakeHuman's face targets (shared) + expression units and a weak-perspective camera (per photo) to MediaPipe landmarks."""
import sys, glob, os, json, numpy as np
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation as Rot
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from mhbasis import D, load_target
V0 = np.load("V0.npy"); z = np.load("basis.npz"); B = z["B"]; names = list(z["names"])
C = np.load("corr.npz"); tri, bw, ok = C["tri"], C["w"], C["ok"].copy()
ok[468:] = False  # irises: the render's eyes are not his
units = sorted(glob.glob(os.path.join(D, "targets", "expression", "units", "caucasian", "*.target")))
if not os.path.exists("units.npy"): np.save("units.npy", np.stack([load_target(u, len(V0)) for u in units]).astype(np.float32))
U = np.load("units.npy"); unames = [os.path.basename(u)[:-7] for u in units]
at = lambda A: (A[:, tri] * bw[None, :, :, None]).sum(2)  # (k, 478, 3)
X0 = (V0[tri] * bw[:, :, None]).sum(1); Bl = at(B); Ul = at(U)
views = sys.argv[1:] or ["photo-front", "photo-34"]
Ls = [np.load(v + ".lm.npz")["L"][:, :2] for v in views]
VW = [0.5 if v.startswith("sheet") else 1.0 for v in views]  # the sheet is drawn, the photos are the truth
# MediaPipe's silhouette ring (jaw/forehead outline) depends on the outline, not a fixed point: weigh it less
OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
wt = np.ones(478); wt[OVAL] = 0.4; wt[~ok] = 0
iod = lambda L: np.linalg.norm(L[33] - L[263])
K, NU, NV = len(B), len(U), len(views)
def unpack(p):
    w = p[:K]; e = p[K:K + NU * NV].reshape(NV, NU); cams = p[K + NU * NV:].reshape(NV, 7); return w, e, cams
def proj(X, cam):
    R = Rot.from_rotvec(cam[:3]).as_matrix(); Y = X @ R.T
    return np.c_[cam[3] * Y[:, 0] + cam[4], -cam[3] * Y[:, 1] + cam[5]]
def shapes(w, e): return [X0 + np.tensordot(w, Bl, 1) + np.tensordot(e[i], Ul, 1) for i in range(NV)]
LAM, LAME = float(os.environ.get("LAM", "0.02")), 0.01
def resid(p):
    w, e, cams = unpack(p); r = []
    for i, X in enumerate(shapes(w, e)):
        r.append(((proj(X, cams[i]) - Ls[i]) / iod(Ls[i]) * wt[:, None]).ravel())
    return np.concatenate(r + [np.sqrt(LAM) * w, np.sqrt(LAME) * e.ravel()])
def init_cam(L):
    # scale and offset from the eye distance and the nose
    s = iod(L) / np.linalg.norm(X0[33] - X0[263]); c = L[1] - s * np.array([X0[1, 0], -X0[1, 1]])
    return np.array([0, 0, 0, s, c[0], c[1], 0])
p0 = np.concatenate([np.zeros(K), np.zeros(NU * NV)] + [init_cam(L) for L in Ls])
lo = np.concatenate([np.zeros(K + NU * NV), np.tile([-3, -3, -3, 0, -1e5, -1e5, -1], NV)])
hi = np.concatenate([np.ones(K + NU * NV), np.tile([3, 3, 3, 1e5, 1e5, 1e5, 1], NV)])
def report(p, tag):
    w, e, cams = unpack(p); out = {}
    for i, X in enumerate(shapes(w, e)):
        d = np.linalg.norm(proj(X, cams[i]) - Ls[i], axis=1)[ok]
        out[views[i]] = dict(mean_px=round(float(d.mean()), 2), max_px=round(float(d.max()), 2), mean_iod_pct=round(float(d.mean() / iod(Ls[i]) * 100), 2))
    print(tag, json.dumps(out)); return out
from scipy.optimize import lsq_linear
def cam_step(p):
    w, e, cams = unpack(p); X = shapes(w, e)
    for i in range(NV):
        f = least_squares(lambda c: ((proj(X[i], c) - Ls[i]) / iod(Ls[i]) * wt[:, None]).ravel(), cams[i], x_scale="jac")
        cams[i] = f.x
    return np.concatenate([w, e.ravel(), cams.ravel()])
def shape_step(p):
    w, e, cams = unpack(p); A, y = [], []
    for i in range(NV):
        R = Rot.from_rotvec(cams[i, :3]).as_matrix(); s_ = cams[i, 3]; sc = VW[i] * wt[:, None] / iod(Ls[i])
        P2 = lambda M: np.stack([s_ * (M @ R.T)[..., 0], -s_ * (M @ R.T)[..., 1]], -1)  # linear part of proj
        r0 = (proj(X0, cams[i]) - Ls[i]) * sc
        Jw = (P2(Bl) * sc[None]).reshape(K, -1).T
        Je = np.zeros((478 * 2, NU * NV)); Je[:, i * NU:(i + 1) * NU] = (P2(Ul) * sc[None]).reshape(NU, -1).T
        A.append(np.c_[Jw, Je]); y.append(-r0.ravel())
    A.append(np.c_[np.sqrt(LAM) * np.eye(K), np.zeros((K, NU * NV))]); y.append(np.zeros(K))
    A.append(np.c_[np.zeros((NU * NV, K)), np.sqrt(LAME) * np.eye(NU * NV)]); y.append(np.zeros(NU * NV))
    sol = lsq_linear(np.vstack(A), np.concatenate(y), bounds=(0, 1), lsmr_tol="auto")
    return np.concatenate([sol.x, cams.ravel()])
p = cam_step(p0.copy()); base = report(p, "base head:")
for it in range(12):
    p = cam_step(shape_step(p))
fit = report(p, "fitted:")
w, e, cams = unpack(p)
np.savez("fit.npz", w=w, e=e, cams=cams, views=np.array(views))
top = np.argsort(-w)[:20]; print("largest face targets:", ", ".join(f"{names[i]} {w[i]:.2f}" for i in top))
for i, v in enumerate(views): print(v, "expression:", ", ".join(f"{unames[j]} {e[i, j]:.2f}" for j in np.argsort(-e[i])[:6]))
json.dump({"base": base, "fitted": fit, "lambda": LAM, "views": views}, open("fit-report.json", "w"), indent=1)
