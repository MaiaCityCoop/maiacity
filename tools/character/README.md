# tools/character: a person's face fitted to their photos (intent a4f8dc85)

MakeHuman's CC0 head (the base of 99b612ec's people) fitted to MediaPipe's face landmarks on a person's own photos: the
head and face targets (286, shared by every photo) with each photo's expression units and camera, so the face keeps
MakeHuman's topology, its expression units (joy, blink) and the rig. CPU only: the 3D renders of the character are a
job for Samuel's Mac (Metal), never SwiftShader here (Samuel 2026-11-07).

**Private:** a person's photos, their landmarks and the fit's files stay in a work folder **outside** the repository
and in their personal library on play (fetched by hash with `GET /api/files/<hash>`); nothing of theirs goes into git.

```sh
W=<a work folder outside the repo>; T=$PWD/tools/character
bash $T/setup.sh $W && cd $W                     # venv (mediapipe, numpy, scipy, pillow), the face model, MakeHuman's data
./venv/bin/python $T/prepare.py --years 37       # the base head: man, age, muscle, weight (MakeHuman's macro targets)
./venv/bin/python $T/raster.py s-base-front.json man-front     # the bare head, front (CPU), and its triangle ids
./venv/bin/python $T/lm.py man-front.png photo-front.jpg photo-34.jpg [sheet-front.png]   # MediaPipe's 478 landmarks
./venv/bin/python $T/corr.py                     # landmark -> point on the mesh, once (triangle + barycentric)
./venv/bin/python $T/fit.py photo-front photo-34 [sheet-front]  # the fit; prints the mean error in px and in % of the eye distance
./venv/bin/python $T/apply.py fit                # V-fit.npy, eyes, scenes, and overlays of fitted (green) on found (red) landmarks
```

- **Views:** a photo (`photo-*`) is the truth, weight 1; a sheet's cell (`sheet-*`) is drawn, weight 0.5. The face's outline
  (MediaPipe's oval) counts 0.4, since a beard or hair moves it; the irises are left out.
- **Profiles:** MediaPipe finds no face on an exact profile, so a profile is checked by its silhouette, not its landmarks.
- **The error** is printed per view, before (the base head) and after, and kept in `fit-report.json`.
