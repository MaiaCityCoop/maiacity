"""MediaPipe Face Landmarker on images: 478 landmarks (pixels) + head pose, to <img>.lm.npz"""
import sys, numpy as np, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
opt = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path="face_landmarker.task"), output_facial_transformation_matrixes=True, output_face_blendshapes=True, num_faces=1)
det = vision.FaceLandmarker.create_from_options(opt)
for p in sys.argv[1:]:
    img = mp.Image.create_from_file(p); r = det.detect(img)
    if not r.face_landmarks: print(p, "NO FACE"); continue
    L = np.array([[l.x * img.width, l.y * img.height, l.z * img.width] for l in r.face_landmarks[0]])
    M = np.array(r.facial_transformation_matrixes[0]); bs = {b.category_name: b.score for b in r.face_blendshapes[0]}
    np.savez(p.rsplit(".", 1)[0] + ".lm.npz", L=L, M=M, size=[img.width, img.height], image=p)
    print(f"{p}: {len(L)} pts, smile {bs.get('mouthSmileLeft',0):.2f}/{bs.get('mouthSmileRight',0):.2f}")
