"""Silhouettes: a bald head's outline on a plain background (a sheet's head cell), and the mesh's rim seen from a camera,
paired point to point so the outline can join the landmarks in fit.py's linear solve (an ICP step)."""
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
def outline(path, thresh=28):
    """The outline pixels (x, y) of the person on a plain background, the background read from the cell's top corners."""
    a = np.asarray(Image.open(path).convert("RGB")).astype(float)
    bg = np.median(np.r_[a[:12, :12].reshape(-1, 3), a[:12, -12:].reshape(-1, 3)], 0)
    m = np.linalg.norm(a - bg, axis=2) > thresh
    m = ndimage.binary_opening(m, iterations=2); lab, n = ndimage.label(m)
    if n: m = lab == (np.argmax(ndimage.sum(m, lab, range(1, n + 1))) + 1)
    m = ndimage.binary_fill_holes(m); edge = m & ~ndimage.binary_erosion(m)
    y, x = np.nonzero(edge); return np.c_[x, y].astype(float), m
def vertex_normals(V, T):
    n = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]]); vn = np.zeros_like(V)
    for k in range(3): np.add.at(vn, T[:, k], n)
    return vn / (np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12)
def rim(V, T, R, mask_v, cos=0.22):
    """Vertices of the head (mask_v) whose normal is nearly across the view: the silhouette's candidates."""
    n = vertex_normals(V, T) @ R.T
    return np.where(mask_v & (np.abs(n[:, 2]) < cos))[0], n[:, :2]
def pairs(P2, N2, target, keep, maxd=30.0):
    """Each rim point to the nearest outline pixel, kept if near and on the rim's outward side; keep(x, y) picks the region."""
    tree = cKDTree(target); d, j = tree.query(P2); Q = target[j]
    out = ((Q - P2) * N2 * [1, -1]).sum(1)  # image y is down
    ok = (d < maxd) & keep(P2[:, 0], P2[:, 1]) & (np.abs(out) >= -1)
    return ok, Q
