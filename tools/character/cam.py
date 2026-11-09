import json, numpy as np
def load(prefix):
    c = json.load(open(prefix + ".cam.json"))
    return np.array(c["proj"]).reshape(4, 4).T, np.array(c["view"]).reshape(4, 4).T
def project(P, Vw, X, W, H):
    Xh = np.c_[X, np.ones(len(X))] @ (P @ Vw).T
    n = Xh[:, :3] / Xh[:, 3:4]
    return np.c_[(n[:, 0] + 1) / 2 * W, (1 - n[:, 1]) / 2 * H]
