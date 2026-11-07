"""A fitted face, baked for the Person head piece (v2: `look.shape`, `look.colours`), CPU only:
    python bake.py <tag> <head-piece.js> [--face man]   ->  look-<tag>.json  {shape, colours} (base64), and a report
shape: the fit's offsets (V-<tag> − V0) carried to the piece's base vertices (the piece's head matched to MakeHuman's by
a similarity and the nearest vertex), Int16 in 1e-5 m; colours: the smoothed skin of the shaped head, each vertex the
texture at the nearest point of the fitted head (sRGB bytes). Private: the look holds a person's face; it goes only into
their private character, never into git."""
import argparse, base64, json, os, re, subprocess, sys, numpy as np
from scipy.spatial import cKDTree
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
a = argparse.ArgumentParser(); a.add_argument("tag"); a.add_argument("piece"); a.add_argument("--face", default="man"); o = a.parse_args()
V0 = np.load("V0.npy"); V = np.load(f"V-{o.tag}.npy"); top = V0[:, 1].max()
# the piece's base head, decoded as the piece decodes it (HEAD_PEOPLE[face].pos: Int16 × HEAD_Q + HEAD_MID)
js = """const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');const m={exports:{}};
new Function('require','module','exports',src+';module.exports.__={HEAD_PEOPLE,HEAD_Q,HEAD_MID,KEY};')(()=>new Proxy({}, {get:()=>class{}}),m,m.exports);
const {HEAD_PEOPLE,HEAD_Q,HEAD_MID,KEY}=m.exports.__;const p=HEAD_PEOPLE[KEY[process.argv[2]]].pos;const b=Buffer.from(Array.isArray(p)?p.join(''):p,'base64');
const a=new Int16Array(b.buffer,b.byteOffset,b.length/2);process.stdout.write(JSON.stringify(Array.from(a,(x,i)=>x*HEAD_Q+HEAD_MID[i%3])));"""
P = np.array(json.loads(subprocess.check_output(["node", "-e", js, o.piece, o.face]))).reshape(-1, 3)
# a similarity from MakeHuman's head (dm) to the piece's (m): ICP on the nearest vertex
idx = np.where(V0[:, 1] > top - 3.2)[0]; Q0 = V0[idx] * 0.1
s, R, t = 1.0, np.eye(3), np.array([0, P[:, 1].max() - Q0[:, 1].max(), P[:, 2].mean() - Q0[:, 2].mean()])
for _ in range(40):
    Q = s * Q0 @ R.T + t; d, j = cKDTree(Q).query(P); A = Q0[j]
    ma, mp = A.mean(0), P.mean(0); U_, S_, Vt = np.linalg.svd((A - ma).T @ (P - mp)); D = np.diag([1, 1, np.sign(np.linalg.det(Vt.T @ U_.T))])
    R = Vt.T @ D @ U_.T; s = (S_ * np.diag(D)).sum() / ((A - ma) ** 2).sum(); t = mp - s * ma @ R.T
Q = s * Q0 @ R.T + t; d, j = cKDTree(Q).query(P)
print(f"the piece's head on MakeHuman's: {d.mean() * 1e3:.2f} mm mean, {np.percentile(d, 95) * 1e3:.2f} mm p95")
off = s * ((V - V0)[idx[j]] * 0.1) @ R.T  # metres, in the piece's frame
shape = np.clip(np.round(off / 1e-5), -32767, 32767).astype("<i2")
look = {"shape": base64.b64encode(shape.tobytes()).decode()}
json.dump(look, open(f"look-{o.tag}.shape.json", "w"))
# the shaped head's smoothed skin, built by the piece itself
subprocess.check_call(["node", os.path.join(HERE, "head-piece.cjs"), o.piece, f"skin-{o.tag}", f"look-{o.tag}.shape.json"], stderr=subprocess.DEVNULL)
S = np.fromfile(f"skin-{o.tag}.pos.f32", np.float32).reshape(-1, 3).astype(float)
# each smoothed vertex: the nearest point of the fitted head (its triangles, the piece's frame), the texture there
uv = np.load("uv.npz"); fv, ft, vt = uv["fv"], uv["ft"], uv["vt"]; tex = np.asarray(Image.open(f"tex-{o.tag}.png").convert("RGB")).astype(float)
W = s * (V * 0.1) @ R.T + t; cen = W[fv].mean(1); _, near = cKDTree(cen).query(S, k=6)
best = np.full(len(S), np.inf); buv = np.zeros((len(S), 2))
for c in range(near.shape[1]):
    tr = fv[near[:, c]]; a_, b_, c_ = W[tr[:, 0]], W[tr[:, 1]], W[tr[:, 2]]
    e0, e1, v2 = b_ - a_, c_ - a_, S - a_
    d00, d01, d11 = (e0 * e0).sum(1), (e0 * e1).sum(1), (e1 * e1).sum(1); d20, d21 = (v2 * e0).sum(1), (v2 * e1).sum(1)
    den = d00 * d11 - d01 * d01 + 1e-18; v_ = np.clip((d11 * d20 - d01 * d21) / den, 0, 1); w_ = np.clip((d00 * d21 - d01 * d20) / den, 0, 1)
    over = v_ + w_ > 1; v_[over], w_[over] = v_[over] / (v_ + w_)[over], w_[over] / (v_ + w_)[over]; u_ = 1 - v_ - w_
    X = a_ * u_[:, None] + b_ * v_[:, None] + c_ * w_[:, None]; dist = np.linalg.norm(X - S, axis=1)
    T_ = vt[ft[near[:, c]]]; UV = T_[:, 0] * u_[:, None] + T_[:, 1] * v_[:, None] + T_[:, 2] * w_[:, None]
    better = dist < best; best[better] = dist[better]; buv[better] = UV[better]
h_, w_ = tex.shape[:2]; col = tex[np.clip(((1 - buv[:, 1]) * h_).astype(int), 0, h_ - 1), np.clip((buv[:, 0] * w_).astype(int), 0, w_ - 1)]
print(f"colours: {len(S)} smoothed vertices, nearest fitted surface {np.median(best) * 1e3:.2f} mm median, {np.percentile(best, 95) * 1e3:.2f} mm p95")
look["colours"] = base64.b64encode(col.clip(0, 255).astype(np.uint8).tobytes()).decode()
json.dump(look, open(f"look-{o.tag}.json", "w")); print(f"look-{o.tag}.json: shape {len(look['shape'])} + colours {len(look['colours'])} base64 chars")
