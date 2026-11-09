"""A CPU renderer for the fit's own images (no GPU, no SwiftShader: Samuel 2026-11-07, GPU work only on his Mac's Metal):
the bare head shaded (for MediaPipe) and its triangle ids (for the correspondence), from a scene written by scene.py.
    python raster.py <scene.json> <out-prefix>   ->  <out>.png, <out>.ids.npy, <out>.cam.json"""
import json, sys, numpy as np
from PIL import Image
def look_at(eye, target, up):
    f = np.array(target, float) - eye; f /= np.linalg.norm(f); r = np.cross(f, up); r /= np.linalg.norm(r); u = np.cross(r, f)
    M = np.eye(4); M[0, :3], M[1, :3], M[2, :3] = r, u, -f; M[:3, 3] = -M[:3, :3] @ eye; return M
def perspective(fov, aspect, n=0.05, f=200.0):
    t = 1 / np.tan(np.radians(fov) / 2); P = np.zeros((4, 4))
    P[0, 0], P[1, 1], P[2, 2], P[2, 3], P[3, 2] = t / aspect, t, (f + n) / (n - f), 2 * f * n / (n - f), -1; return P
def sphere(c, r, nu=32, nv=24):
    th, ph = np.meshgrid(np.linspace(0, np.pi, nv), np.linspace(0, 2 * np.pi, nu), indexing="ij")
    P = np.c_[(np.sin(th) * np.sin(ph)).ravel(), np.cos(th).ravel(), (np.sin(th) * np.cos(ph)).ravel()] * r + c
    T = [[i * nu + j, (i + 1) * nu + j, (i + 1) * nu + (j + 1) % nu] for i in range(nv - 1) for j in range(nu)] + \
        [[i * nu + j, (i + 1) * nu + (j + 1) % nu, i * nu + (j + 1) % nu] for i in range(nv - 1) for j in range(nu)]
    return P, np.array(T)
def render(s):
    W, H = s["size"]; V = np.array(s["pos"]).reshape(-1, 3); T = np.array(s["tris"]).reshape(-1, 3); nT = len(T)
    col = np.tile([0.85, 0.72, 0.63], (nT, 1))
    tex = np.asarray(Image.open(s["tex"]).convert("RGB")).astype(float) / 255 if s.get("tex") else None
    uvt = np.array(s["uvt"]).reshape(-1, 3, 2) if s.get("uvt") else None  # per triangle corner
    vcol = np.array(s["vcol"]).reshape(-1, 3) if s.get("vcol") else None  # per vertex (0..1), as a piece's skin colours
    for e in s.get("eyes", []):  # an eyeball, its iris facing forward: enough for MediaPipe to place the lids
        P, Te = sphere(np.array(e[:3]), e[3]); off = len(V); V = np.r_[V, P]; T = np.r_[T, Te + off]
        z = (P[Te].mean(1) - e[:3]) / e[3]; c = np.where((z[:, 2] > 0.88)[:, None], [0.42, 0.52, 0.58], [0.95, 0.94, 0.92]); c[z[:, 2] > 0.98] = [0.07, 0.07, 0.07]
        col = np.r_[col, c]
    cam = s["cam"]; Vw = look_at(np.array(cam["pos"], float), cam["target"], cam.get("up", [0, 1, 0])); P = perspective(cam["fov"], W / H)
    Xh = np.c_[V, np.ones(len(V))] @ (P @ Vw).T; ndc = Xh[:, :3] / Xh[:, 3:4]
    sx, sy, sz = (ndc[:, 0] + 1) / 2 * W, (1 - ndc[:, 1]) / 2 * H, ndc[:, 2]
    n = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]]); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    L = np.array([0.35, 0.55, 0.75]); L /= np.linalg.norm(L); shade = 0.35 + 0.65 * np.abs(n @ L)
    vn = np.zeros_like(V); np.add.at(vn, T[:, 0], n); np.add.at(vn, T[:, 1], n); np.add.at(vn, T[:, 2], n)
    vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12; vs = 0.35 + 0.65 * np.clip(vn @ L, 0, 1)  # smooth (Gouraud) shading
    zb = np.full((H, W), np.inf); ids = np.zeros((H, W), np.int64); img = np.full((H, W, 3), 0.95)
    for t in range(len(T)):
        a, b, c = T[t]; xs, ys = np.array([sx[a], sx[b], sx[c]]), np.array([sy[a], sy[b], sy[c]])
        x0, x1 = max(int(xs.min()), 0), min(int(xs.max()) + 1, W - 1); y0, y1 = max(int(ys.min()), 0), min(int(ys.max()) + 1, H - 1)
        if x0 > x1 or y0 > y1: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(d) < 1e-9: continue
        l1 = ((ys[1] - ys[2]) * (X - xs[2]) + (xs[2] - xs[1]) * (Y - ys[2])) / d; l2 = ((ys[2] - ys[0]) * (X - xs[2]) + (xs[0] - xs[2]) * (Y - ys[2])) / d; l3 = 1 - l1 - l2
        m = (l1 >= 0) & (l2 >= 0) & (l3 >= 0)
        if not m.any(): continue
        z = l1 * sz[a] + l2 * sz[b] + l3 * sz[c]; zs = zb[y0:y1 + 1, x0:x1 + 1]; m &= z < zs
        zs[m] = z[m]; ids[y0:y1 + 1, x0:x1 + 1][m] = t + 1 if t < nT else 0; sh = l1 * vs[a] + l2 * vs[b] + l3 * vs[c]
        if vcol is not None and t < nT:
            cc = l1[..., None] * vcol[a] + l2[..., None] * vcol[b] + l3[..., None] * vcol[c]
            img[y0:y1 + 1, x0:x1 + 1][m] = cc[m] * (0.55 + 0.45 * sh[m, None])
        elif tex is not None and t < nT:  # affine in screen space: enough at a head's depth
            u = l1 * uvt[t, 0, 0] + l2 * uvt[t, 1, 0] + l3 * uvt[t, 2, 0]; v = l1 * uvt[t, 0, 1] + l2 * uvt[t, 1, 1] + l3 * uvt[t, 2, 1]
            th, tw_ = tex.shape[:2]; c_ = tex[np.clip(((1 - v) * th).astype(int), 0, th - 1), np.clip((u * tw_).astype(int), 0, tw_ - 1)]
            img[y0:y1 + 1, x0:x1 + 1][m] = c_[m] * (0.55 + 0.45 * sh[m, None])
        else: img[y0:y1 + 1, x0:x1 + 1][m] = col[t] * (sh[m, None] if t < nT else 0.6 + 0.4 * shade[t])
    return (img * 255).clip(0, 255).astype(np.uint8), ids, P, Vw
if __name__ == "__main__":
    s = json.load(open(sys.argv[1])); out = sys.argv[2]
    img, ids, P, Vw = render(s)
    Image.fromarray(img).save(out + ".png"); np.save(out + ".ids.npy", ids)
    json.dump({"proj": P.T.ravel().tolist(), "view": Vw.T.ravel().tolist()}, open(out + ".cam.json", "w"))
