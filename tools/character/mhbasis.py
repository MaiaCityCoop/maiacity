"""MakeHuman base mesh + the face/head targets as a linear basis (CC0 data, sparse clone in ../mh)."""
import glob, os, numpy as np
D = os.path.join(os.getcwd(), "mh", "makehuman", "data")  # run in the work folder: it holds the sparse clone (setup.sh)
GROUPS = ["head", "forehead", "eyebrows", "eyes", "nose", "mouth", "ears", "chin", "cheek", "neck"]

def load_obj():
    V, F = [], []
    body = False
    for line in open(os.path.join(D, "3dobjs", "base.obj")):
        if line.startswith("v "): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("g "): body = line.split()[1] == "body"
        elif line.startswith("f ") and body:
            F.append([int(t.split("/")[0]) - 1 for t in line.split()[1:]])
    return np.array(V), F

def load_target(path, n):
    d = np.zeros((n, 3))
    for line in open(path):
        if line[0] in "#\n": continue
        p = line.split(); d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return d

def basis(n):
    names, B = [], []
    for g in GROUPS:
        for f in sorted(glob.glob(os.path.join(D, "targets", g, "*.target"))):
            names.append(os.path.basename(f)[:-7]); B.append(load_target(f, n))
    return names, np.stack(B)  # (k, n, 3)

if __name__ == "__main__":
    V, F = load_obj(); names, B = basis(len(V))
    np.savez_compressed("basis.npz", V=V, B=B.astype(np.float32), names=np.array(names))
    tris = []
    for f in F: tris += [[f[0], f[1], f[2]]] + ([[f[0], f[2], f[3]]] if len(f) == 4 else [])
    np.save("tris.npy", np.array(tris))
    touched = np.abs(B).sum((0, 2)) > 0
    print(len(V), "verts,", len(F), "body faces,", len(names), "targets,", touched.sum(), "verts moved by them; bbox head y", V[touched][:, 1].min(), V[touched][:, 1].max())
