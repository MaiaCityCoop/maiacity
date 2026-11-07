#!/usr/bin/env python3
"""The king coconut film as story/1: build_story.py <hashes.json> <compositions.json> > body.json"""
import json, sys
H = json.load(open(sys.argv[1])); C = json.load(open(sys.argv[2])); hooks = json.load(open(sys.argv[3]))
SHOTS = [  # name, at, duration, label (stage and camera), transition
 ("01-hook-backlit-crown", 0, 3.5, "King coconut v3 · Grown palm (stage 11) · the crown from below, backlit by the 4 pm sun (az 38°, el −40°, 6 m) · slow push in", "from black 0.4, cut"),
 ("02-devlog-split", 3.5, 3.5, "King coconut v2 · Ripe (stage 9, 6.8 years) | v3 · Grown palm (stage 11, 22 years) · the same wide camera (az 38°, el 3°, 19 m) · split, slow push", "cut"),
 ("03-devlog-timelapse", 7, 5, "King coconut v3 · Seed nut → Grown palm (stages 0 → 11 in quarter steps) · framed to its height, orbiting az 20° → 60° · time-lapse", "cut"),
 ("04-health-nuts-close", 12, 3.5, "King coconut v3 · Grown palm (stage 11) · the nut bunches close, backlit (az 38°, el −10°, 3 m) · push in", "cut"),
 ("05-health-nuts-side", 15.5, 3, "King coconut v3 · Grown palm (stage 11) · the bunches from the side, low (az 75°, el −18°, 3.6 m) · drift across", "cut"),
 ("06-autarky-trunk-tilt", 18.5, 5.5, "King coconut v3 · Grown palm (stage 11) · low angle up the trunk (az 60°, el −30°, 8 m) · tilt up to the crown", "cut"),
 ("07-sovereignty-hero-wide", 24, 3, "King coconut v3 · Grown palm (stage 11) · wide, into the sun (az 38°, el 2°, 17 m) · slow pull back", "dissolve 0.6"),
 ("08-sovereignty-old-palm", 27, 3, "King coconut v3 · Old palm (stage 12, 50 years) · wide, into the sun (az 38°, el 1°, 24 m) · held, slow pull back", "to black 0.8"),
]
shots = []
for i, (n, at, d, label, tr) in enumerate(SHOTS):
    c = {"id": f"s{i+1}", "at": at, "duration": d, "frame": H[n]["frame"], "label": label, "transition": tr}
    if n in C: c["composition"] = C[n]; c["palm_video"] = H[n]["video"]
    else: c["video"] = H[n]["video"]; c["video_in"] = 0
    shots.append(c)
# every claim's source: scratch/2b2d7e1e-coconut-film/captions.md
cues = [
 (0.2, "A can of soda holds up to 40 g of sugar."), (1.9, "Bottled. Shipped. Bought."),
 (3.6, "Our king coconut stopped growing at 7 years."), (5.4, "Now it grows on.", True),
 (7.2, "From one seed nut…"), (9.4, "…to a palm 9.5 m tall at 22 years."),
 (12.1, "Each nut holds about 350 mL of water,"), (13.9, "mostly water, with potassium and natural sugars."),
 (15.6, "In a small study, it rehydrated as well as a sports drink."), (17.2, "So did plain water."),
 (18.6, "One palm gives about 156 nuts a year,"), (21.3, "and bears for up to 40 years:"),
 (22.8, "the top layer of a forest you can eat from."),
 (24.2, "Grown, not shipped."), (26.0, "A drink from your own forest."), (27.6, "Grow it. Own it.", True),
]
cl = [dict(at=round(c[0], 2), text=c[1], **({"em": True} if len(c) > 2 else {})) for c in cues]
voice = {"id": "v1", "at": 0, "duration": 30, "who": "subtitles", "cues": cl, "line": " ".join(c["text"] for c in cl)}
notes = [
 dict(id="n1", at=0, duration=3.5, section="HOOK", emotion="unease", mood="↓", camera="the crown from below, backlit, a slow push", retention="the problem everyone drinks: sugar, bottled, shipped",
      hooks=hooks, hook=1, image_title=hooks[0]["image_title"], intro="Your sweet drink crossed an ocean. This one grows by the door.",
      description="A 30-second dev-log: our king coconut grows from a seed nut to a 50-year palm, and what one palm gives a household in a forest you can eat from. Every number sourced."),
 dict(id="n2", at=3.5, duration=8.5, section="DEV-LOG", emotion="curiosity", mood="↑", camera="v2 | v3 split, then the time-lapse seed nut → grown palm", retention="the rehook: it stopped at 7, now it grows on"),
 dict(id="n3", at=12, duration=6.5, section="HEALTH", emotion="trust", mood="↕", camera="close on the nut bunches, push in, then drift across", retention="what is in the water, said only as far as the sources go"),
 dict(id="n4", at=18.5, duration=5.5, section="AUTARKY", emotion="wonder", mood="↑↑", camera="low angle, tilt up the trunk to the crown", retention="the number: 156 a year, for up to 40 years, the forest's top layer"),
 dict(id="n5", at=24, duration=6, section="SOVEREIGNTY", emotion="resolve", mood="↑↑↑", camera="wide into the sun, pull back; the old palm, held", retention="the answer: grown, not shipped"),
]
body = {"schema": "story/1", "format": "1:1", "fps": 30, "tracks": [
  {"id": "shots", "kind": "shots", "clips": shots},
  {"id": "voice", "kind": "voice", "clips": [voice]},
  {"id": "notes", "kind": "notes", "clips": notes}]}
print(json.dumps(body, ensure_ascii=False, indent=1))
