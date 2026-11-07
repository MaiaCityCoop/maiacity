"""The review's scenes: the fitted head, textured, front, three-quarter and profile, neutral and with the person's own
smile (the expression fitted on their smiling front photo). For render-gpu.mjs (the Mac) or raster.py (a CPU check).
    python views.py <tag> [--smile-from photo-front]"""
import argparse, os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from scene import textured_scene
a = argparse.ArgumentParser(); a.add_argument("tag"); a.add_argument("--smile-from", default="joy"); o = a.parse_args()
V = np.load(f"V-{o.tag}.npy"); E = np.load(f"eyes-{o.tag}.npy"); f = np.load("fit.npz"); U = np.load("units.npy")
# the smile: the house joy (the Person head piece's SMILES v7 units), as every person smiles; or the fitted one
JOY = {"mouth-corner-puller": .5, "mouth-retraction": .5, "mouth-compression": .45, "mouth-eversion": .35, "nose-left-elevation": .12,
       "nose-right-elevation": .12, "eye-left-slit": .3, "eye-right-slit": .3, "eye-left-opened-up": -.2, "eye-right-opened-up": -.2}
import glob
names = [os.path.basename(u)[:-7] for u in sorted(glob.glob(os.path.join("mh", "makehuman", "data", "targets", "expression", "units", "caucasian", "*.target")))]
smile = np.array([JOY.get(n, 0.0) for n in names]) if o.smile_from == "joy" else f["e"][list(f["views"]).index(o.smile_from)]
for mood, Vm in [("neutral", V), ("smiling", V + np.tensordot(smile, U, 1))]:
    for view in ["front", "three-quarter-left", "profile-left"]:
        textured_scene(Vm, view, f"tex-{o.tag}.png", f"v-{o.tag}-{mood}-{view}.json", eyes=[[*e, 0.125] for e in E]); print(f"v-{o.tag}-{mood}-{view}.json")
