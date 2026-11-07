"""The review's scenes: the fitted head, textured, front, three-quarter and profile, neutral and with the person's own
smile (the expression fitted on their smiling front photo). For render-gpu.mjs (the Mac) or raster.py (a CPU check).
    python views.py <tag> [--smile-from photo-front]"""
import argparse, os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from scene import textured_scene
a = argparse.ArgumentParser(); a.add_argument("tag"); a.add_argument("--smile-from", default="photo-front"); o = a.parse_args()
V = np.load(f"V-{o.tag}.npy"); E = np.load(f"eyes-{o.tag}.npy"); f = np.load("fit.npz"); U = np.load("units.npy")
smile = f["e"][list(f["views"]).index(o.smile_from)]
for mood, Vm in [("neutral", V), ("smiling", V + np.tensordot(smile, U, 1))]:
    for view in ["front", "three-quarter-left", "profile-left"]:
        textured_scene(Vm, view, f"tex-{o.tag}.png", f"v-{o.tag}-{mood}-{view}.json", eyes=[[*e, 0.125] for e in E]); print(f"v-{o.tag}-{mood}-{view}.json")
