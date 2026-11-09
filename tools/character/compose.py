"""The review image: the person's photos and sheet cells on top, the renders below (neutral, then smiling), each labelled,
and the fit's numbers. python compose.py <tag> <out.jpg> <photo>… --sheet <cell>…"""
import argparse, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
a = argparse.ArgumentParser(); a.add_argument("tag"); a.add_argument("out"); a.add_argument("photos", nargs="+"); a.add_argument("--sheet", nargs="*", default=[]); o = a.parse_args()
C = 420; rows = [[(p, p.rsplit("/", 1)[-1]) for p in o.photos + o.sheet]]
for mood in ["neutral", "smiling"]: rows.append([(f"v-{o.tag}-{mood}-{v}.png", f"render · {mood} · {v.replace('-left', '')}") for v in ["front", "three-quarter-left", "profile-left"]])
W = C * max(len(r) for r in rows); H = (C + 34) * len(rows) + 60
im = Image.new("RGB", (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
try: font = ImageFont.truetype("DejaVuSans.ttf", 18)
except OSError: font = ImageFont.load_default()
for r, row in enumerate(rows):
    for c, (path, label) in enumerate(row):
        t = Image.open(path).convert("RGB"); t.thumbnail((C, C)); x, y = c * C + (C - t.width) // 2, r * (C + 34)
        im.paste(t, (x, y)); d.text((c * C + 8, y + C + 6), label, fill=(60, 60, 60), font=font)
rep = json.load(open("fit-report.json"))
line = "landmarks (mean px, % eye distance): " + "; ".join(f"{k} {v['mean_px']} px ({v['mean_iod_pct']} %)" for k, v in rep["fitted"].items())
line2 = "outline (mean px): " + "; ".join(f"{x['view']} {x['mean_px']} px" for x in rep.get("outline", []))
d.text((8, H - 54), line, fill=(30, 30, 30), font=font); d.text((8, H - 28), line2, fill=(30, 30, 30), font=font); im.save(o.out, quality=90); print(o.out)
