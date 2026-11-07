#!/usr/bin/env python3
"""The king coconut film's composition shots (HyperFrames, add_story_composition), written from one template.

Each plays its shot's palm video (a render of King coconut v3 by play's render bench, play's file by hash) under number
callouts drawn in the 7-hexes composition's own HUD style (composition ebe34fd385c6…, the hex-village film): its cream
pill (#fbf5ea, border #dcc8a6, the 3 px under-shadow), its chip + number (.chip/.num), its gold (#d9a548), its pill
drop-in tween (y -100 → 0, power3.out) and its count() counter tween (innerText, snap). Nothing else is new.

usage: compositions.py <videos.json: {shot: hash}> <out dir>
"""
import json, sys, os

STYLE = """
      :root { --ink: #4a433b; --gold: #d9a548; --cream: #fbf5ea; --edge: #dcc8a6; --under: #e6d6bb; --font-ui: sans-serif; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: var(--font-ui); }
      #root video { position: absolute; inset: 0; width: 1080px; height: 1080px; object-fit: cover; }
      /* the 7-hexes HUD pill and chip (ebe34fd3…), as they are there */
      .pill { position: absolute; display: flex; white-space: nowrap; align-items: center; gap: 14px; padding: 10px 22px;
        background: var(--cream); border: 2px solid var(--edge); border-radius: 16px;
        box-shadow: 0 3px 0 var(--under), 0 8px 18px rgb(90 70 40 / 0.12); opacity: 0; }
      .chip { display: flex; align-items: center; gap: 8px; }
      .chip svg { width: 34px; height: 34px; flex: none; }
      .num { font-size: 40px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; }
      .unit { font-size: 26px; font-weight: 700; color: var(--ink); opacity: 0.75; }
      .tag { font-size: 24px; font-weight: 700; color: var(--ink); letter-spacing: 0.02em; }
      .gold { color: var(--gold); }
"""

# icons in the 7-hexes chips' manner: flat fills, a 1.4 ink stroke
DROP = '<svg viewBox="0 0 30 30"><path d="M15 3 C 10 11, 7 15, 7 19 a8 8 0 0 0 16 0 c0-4-3-8-8-16z" fill="#7cc4e6" stroke="#3d3833" stroke-width="1.4"/></svg>'
NUT = '<svg viewBox="0 0 30 30"><ellipse cx="15" cy="16" rx="9" ry="11" fill="#e8962f" stroke="#3d3833" stroke-width="1.4"/><circle cx="15" cy="6.5" r="2" fill="#7a5a2a" stroke="#3d3833" stroke-width="1"/></svg>'
CLOCK = '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" fill="#fbf5ea" stroke="#3d3833" stroke-width="1.4"/><path d="M15 8v7l5 3" stroke="#3d3833" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'
RULER = '<svg viewBox="0 0 30 30"><rect x="11" y="3" width="8" height="24" rx="1.5" fill="#d9a548" stroke="#3d3833" stroke-width="1.4"/><path d="M11 8h4M11 13h3M11 18h4M11 23h3" stroke="#3d3833" stroke-width="1.2"/></svg>'

COUNT = """
      const tl = gsap.timeline({ paused: true });
      const drop = (sel, t) => tl.fromTo(sel, { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, t);
      const away = (sel, t) => tl.fromTo(sel, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t);
      // the 7-hexes counter: a number climbing, snapped
      const count = (id, from, to, t, dur, snap = 1) => tl.fromTo("#" + id, { innerText: from }, { innerText: to, snap: { innerText: snap }, duration: dur, ease: "none", immediateRender: false }, t);
"""

def page(cid, title, dur, video, body, script):
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1080" />
    <title>{title}</title>
    <!-- King coconut film (intent 2b2d7e1e-f04a-419a-989c-d462557b8c29). The picture: King coconut v3
         (e43e66c1-963d-5d63-987d-ceed30f8f2dd) rendered by play's render bench, play's file {video}.
         The callouts: the 7-hexes composition's HUD pill, chip, gold, drop-in and count() (ebe34fd385c6…). -->
    <style>{STYLE}    </style>
  </head>
  <body>
    <div id="root" data-composition-id="{cid}" data-start="0" data-duration="{dur}" data-width="1080" data-height="1080">
      <video id="palm" class="clip" data-start="0" data-duration="{dur}" data-track-index="0" muted playsinline src="/api/files/{video}"></video>
{body}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};{COUNT}{script}
      window.__timelines["{cid}"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""

def split(v):
    body = f"""      <div id="a" class="pill" style="left:40px;top:40px">{CLOCK}<span class="tag">BEFORE · 7 YEARS</span></div>
      <div id="b" class="pill" style="right:40px;top:40px">{CLOCK}<span class="tag gold">NOW · TO 50 YEARS</span></div>
      <div id="ha" class="pill" style="left:40px;top:120px">{RULER}<span class="num">7.5</span><span class="unit">m</span></div>
      <div id="hb" class="pill" style="right:40px;top:120px">{RULER}<span class="num">9.5</span><span class="unit">m at 22 years</span></div>"""
    return page("coconut-split", "Before and now", 3.5, v, body, """
      drop("#a", 0.15); drop("#b", 0.45); drop("#ha", 0.9); drop("#hb", 1.9);""")

# the time-lapse: 12 renders, one per stage, at 2.4 a second (blended between); each stage's age (days) and height (to the frond tips, m)
DAYS = [0, 120, 240, 540, 1100, 2000, 2100, 2250, 2380, 2480, 3652, 8036]
H = [0.05, 0.18, 0.25, 0.73, 1.71, 4.13, 5.87, 6.46, 7.0, 7.53, 7.79, 9.45]
def timelapse(v):
    body = f"""      <div id="age" class="pill" style="left:40px;top:40px">{CLOCK}<span class="num" id="n-age">0.0</span><span class="unit">years</span></div>
      <div id="hgt" class="pill" style="right:40px;top:40px">{RULER}<span class="num" id="n-h">0.0</span><span class="unit">m</span></div>"""
    keys = []
    for i in range(len(DAYS) - 1):
        t0, t1 = i / 2.4, (i + 1) / 2.4
        keys.append(f'count("n-age", {DAYS[i]/365.25:.1f}, {DAYS[i+1]/365.25:.1f}, {t0+0.0:.3f}, {t1-t0:.3f}, 0.1);')
        keys.append(f'count("n-h", {H[i]:.1f}, {H[i+1]:.1f}, {t0:.3f}, {t1-t0:.3f}, 0.1);')
    return page("coconut-timelapse", "Seed nut to grown palm", 5, v, body, '\n      drop("#age", 0); drop("#hgt", 0.1);\n      ' + "\n      ".join(keys))

def water(v):
    body = f"""      <div id="w" class="pill" style="left:40px;top:40px">{DROP}<span class="num" id="n-ml">0</span><span class="unit">mL a nut</span></div>"""
    return page("coconut-water", "Water in a nut", 3.5, v, body, """
      drop("#w", 0.1); count("n-ml", 0, 352, 0.3, 1.4);""")

def harvest(v):
    body = f"""      <div id="nuts" class="pill" style="left:40px;top:40px">{NUT}<span class="num" id="n-nuts">0</span><span class="unit">nuts a year</span></div>
      <div id="yrs" class="pill" style="left:40px;top:122px">{CLOCK}<span class="unit">for up to</span><span class="num" id="n-yrs">0</span><span class="unit">years</span></div>
      <div id="l1" class="pill" style="right:40px;top:40px"><span class="tag gold">TOP · COCONUT</span></div>
      <div id="l2" class="pill" style="right:40px;top:110px"><span class="tag">MIDDLE · BANANA, PAPAYA</span></div>
      <div id="l3" class="pill" style="right:40px;top:180px"><span class="tag">FLOOR · GINGER, CASSAVA, YAM</span></div>"""
    return page("coconut-harvest", "One palm's harvest, the forest's layers", 5.5, v, body, """
      drop("#nuts", 0.05); count("n-nuts", 0, 156, 0.25, 1.5);
      drop("#yrs", 2.7); count("n-yrs", 0, 40, 2.9, 1.0);
      away("#nuts", 4.0); away("#yrs", 4.0);
      drop("#l1", 4.2); drop("#l2", 4.45); drop("#l3", 4.7);""")

if __name__ == "__main__":
    vids = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    for name, fn in [("02-devlog-split", split), ("03-devlog-timelapse", timelapse), ("04-health-nuts-close", water), ("06-autarky-trunk-tilt", harvest)]:
        open(os.path.join(out, name + ".html"), "w").write(fn(vids[name]))
        print(name)
