"""Project a person's photos (and their sheet's head cells) onto MakeHuman's head texture (CPU).
    python texture.py <tag> [--size 4096]       (after fit.py with SIL and apply.py <tag>)
The face (inside MediaPipe's face oval, from the brows down) comes from the photos, where they see it squarely; the
scalp, ears, back and neck from the sheet's front and profile cells (the profile mirrored for the other side); each
source's colour matched to the sheet front's skin. Writes tex-<tag>.png and uv.npz (per-corner UVs for the head)."""
import argparse, os, sys, json, numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial.transform import Rotation as Rot
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhbasis, sil
ap = argparse.ArgumentParser(); ap.add_argument("tag"); ap.add_argument("--size", type=int, default=4096); o = ap.parse_args(); S = o.size
f = np.load("fit.npz"); views = list(f["views"]); U = np.load("units.npy"); V = np.load(f"V-{o.tag}.npy"); HM = np.load("headmask.npy")
C = np.load("corr.npz"); ctri, cbw = C["tri"], C["w"]
SIL = [x.split(":") for x in os.environ.get("SIL", "").split(",") if x]; scams = np.load("sil-cams.npy") if SIL else []
# faces with their UV corners (MakeHuman's body only), triangulated
vt, FV, FT, g = [], [], [], None
for line in open(os.path.join(mhbasis.D, "3dobjs", "base.obj")):
    if line.startswith("vt "): vt.append([float(x) for x in line.split()[1:3]])
    elif line.startswith("g "): g = line.split()[1]
    elif line.startswith("f ") and g == "body":
        c = [t.split("/") for t in line.split()[1:]]; v = [int(a[0]) - 1 for a in c]; t = [int(a[1]) - 1 for a in c]
        FV += [[v[0], v[1], v[2]]] + ([[v[0], v[2], v[3]]] if len(v) == 4 else []); FT += [[t[0], t[1], t[2]]] + ([[t[0], t[2], t[3]]] if len(t) == 4 else [])
vt, FV, FT = np.array(vt), np.array(FV), np.array(FT)
RM = np.load("rendermask.npy") if os.path.exists("rendermask.npy") else HM  # the head and neck down to the shoulders
head = RM[FV].all(1); FV, FT = FV[head], FT[head]; np.savez("uv.npz", vt=vt, fv=FV, ft=FT)
VN = sil.vertex_normals(V, FV)
def proj(X, c):
    R = Rot.from_rotvec(c[:3]).as_matrix(); Y = X @ R.T; return np.c_[c[3] * Y[:, 0] + c[4], -c[3] * Y[:, 1] + c[5]], Y[:, 2], R
def zbuffer(P2, z, T, W, H):
    zb = np.full((H, W), -np.inf)
    for a, b, c in T:
        xs, ys = P2[[a, b, c], 0], P2[[a, b, c], 1]
        x0, x1, y0, y1 = max(int(xs.min()), 0), min(int(xs.max()) + 1, W - 1), max(int(ys.min()), 0), min(int(ys.max()) + 1, H - 1)
        if x0 > x1 or y0 > y1: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
        d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(d) < 1e-9: continue
        l1 = ((ys[1] - ys[2]) * (X - xs[2]) + (xs[2] - xs[1]) * (Y - ys[2])) / d; l2 = ((ys[2] - ys[0]) * (X - xs[2]) + (xs[0] - xs[2]) * (Y - ys[2])) / d; l3 = 1 - l1 - l2
        m = (l1 >= -1e-3) & (l2 >= -1e-3) & (l3 >= -1e-3); zz = l1 * z[a] + l2 * z[b] + l3 * z[c]; s = zb[y0:y1 + 1, x0:x1 + 1]; m &= zz > s; s[m] = zz[m]
    return zb
# the texels: each head triangle rasterised in UV space -> its 3D point and normal (barycentric)
tex_tri = np.full((S, S), -1); tex_b = np.zeros((S, S, 3))
UV = np.c_[vt[:, 0] * S, (1 - vt[:, 1]) * S]
for k, (a, b, c) in enumerate(FT):
    xs, ys = UV[[a, b, c], 0], UV[[a, b, c], 1]
    x0, x1, y0, y1 = max(int(xs.min()), 0), min(int(xs.max()) + 1, S - 1), max(int(ys.min()), 0), min(int(ys.max()) + 1, S - 1)
    X, Y = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
    d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
    if abs(d) < 1e-12: continue
    l1 = ((ys[1] - ys[2]) * (X - xs[2]) + (xs[2] - xs[1]) * (Y - ys[2])) / d; l2 = ((ys[2] - ys[0]) * (X - xs[2]) + (xs[0] - xs[2]) * (Y - ys[2])) / d; l3 = 1 - l1 - l2
    m = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)  # a little over the edge: no seams of empty texels
    tt = tex_tri[y0:y1 + 1, x0:x1 + 1]; tb = tex_b[y0:y1 + 1, x0:x1 + 1]; tt[m] = k; tb[m] = np.stack([l1, l2, l3], -1)[m]
ty, tx = np.nonzero(tex_tri >= 0); tk = tex_tri[ty, tx]; tw = tex_b[ty, tx]
def at(Vx): return (Vx[FV[tk]] * tw[:, :, None]).sum(1)
NT = at(VN); NT /= np.linalg.norm(NT, axis=1, keepdims=True) + 1e-12
OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
def sample(img, P):
    h, w = img.shape[:2]; x = np.clip(P[:, 0] - .5, 0, w - 1.001); y = np.clip(P[:, 1] - .5, 0, h - 1.001); x0, y0 = x.astype(int), y.astype(int); fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    return img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy
CHEEKS = [50, 280, 205, 425, 101, 330]  # cheek skin, clear of beard and eyes
def skin_mean(img, L): return np.array([img[int(L[k, 1]) - 4:int(L[k, 1]) + 4, int(L[k, 0]) - 4:int(L[k, 0]) + 4].reshape(-1, 3).mean(0) for k in CHEEKS]).mean(0)
sources = []
ref_skin = None
for i, v in enumerate(views):
    lm = np.load(v + ".lm.npz"); img = np.asarray(Image.open(str(lm["image"])).convert("RGB")).astype(float); L = lm["L"]
    Vi = V + np.tensordot(f["e"][i], U, 1); c = f["cams"][i]
    P2, z, R = proj(Vi, c); Pt, zt, _ = proj(at(Vi), c); zb = zbuffer(P2, z, FV, img.shape[1], img.shape[0])
    vis = zt >= sample(zb[..., None], Pt)[:, 0] - 0.02
    from matplotlib.path import Path
    poly = Path(L[OVAL, :2]); inside = poly.contains_points(Pt) & (Pt[:, 1] > L[9, 1] - 0.15 * np.linalg.norm(L[33, :2] - L[263, :2]))
    m = np.zeros(img.shape[:2], bool); yy, xx = np.mgrid[:img.shape[0], :img.shape[1]]
    m = poly.contains_points(np.c_[xx.ravel() + .5, yy.ravel() + .5]).reshape(img.shape[:2]); soft = np.clip(ndimage.distance_transform_edt(m) / 25.0, 0, 1)
    facing = np.clip((NT @ R.T)[:, 2], 0, 1) ** 3
    if v.startswith("sheet"): ref_skin = skin_mean(img, L)
    sources.append(dict(name=v, img=img, P=Pt, w=facing * vis * inside * sample(soft[..., None], Pt)[:, 0] * (1.0 if v.startswith("photo") else 0.25), skin=skin_mean(img, L)))
for k, (path, side) in enumerate(SIL):  # the sheet's outline cells: scalp, ears, back; the profile mirrored for the other side
    img = np.asarray(Image.open(path).convert("RGB")).astype(float); c = scams[k]
    for mirror in ([False, True] if side == "profile" else [False]):
        cc = c.copy(); im = img
        if mirror: cc[:3] = Rot.from_rotvec([0, -np.pi / 2, 0]).as_rotvec(); im = img[:, ::-1]; cc[4] = img.shape[1] - c[4]
        _, pm = sil.outline(path); pm = pm[:, ::-1] if mirror else pm  # the person, not the background
        inner = np.clip(ndimage.distance_transform_edt(pm) / 6.0 - 0.5, 0, 1)  # nothing from the outline's own pixels
        P2, z, R = proj(V, cc); Pt, zt, _ = proj(at(V), cc); zb = zbuffer(P2, z, FV, im.shape[1], im.shape[0])
        vis = zt >= sample(zb[..., None], Pt)[:, 0] - 0.02
        facing = np.clip((NT @ R.T)[:, 2], 0, 1) ** 3
        sources.append(dict(name=f"{path}{' mirrored' if mirror else ''}", img=im, P=Pt, w=facing * vis * 0.6 * sample(inner[..., None], Pt)[:, 0], skin=None))
acc = np.zeros((len(tk), 3)); wsum = np.zeros(len(tk))
for s in sources:
    col = sample(s["img"], s["P"])
    if s["skin"] is not None and ref_skin is not None: col = col * (ref_skin / s["skin"])  # each photo's light matched to the sheet's skin
    acc += col * s["w"][:, None]; wsum += s["w"]; print(f"{s['name']}: {int((s['w'] > 0.05).sum())} texels")
tex = np.zeros((S, S, 3)); have = np.zeros((S, S), bool)
ok = wsum > 1e-3; tex[ty[ok], tx[ok]] = acc[ok] / wsum[ok, None]; have[ty[ok], tx[ok]] = True
# the rest of the head's texels: the nearest painted colour (and a margin round every island against seams)
idx = ndimage.distance_transform_edt(~have, return_distances=False, return_indices=True); tex = tex[idx[0], idx[1]]
Image.fromarray(tex.clip(0, 255).astype(np.uint8)).save(f"tex-{o.tag}.png"); print(f"tex-{o.tag}.png", S, "px;", int(ok.sum()), "of", len(tk), "head texels painted")
