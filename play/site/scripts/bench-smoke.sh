#!/usr/bin/env bash
# The render bench's --motion, --crowd and --film, smoke-run on its own fixture (scripts/fixtures/walker.js), headless
# on the CPU (SwiftShader), no token: each writes what it should, and the film is joined where ffmpeg is installed.
#   bash play/site/scripts/bench-smoke.sh            (from the repository's root; starts and stops its own dev server)
set -euo pipefail
cd "$(dirname "$0")/.."
O="$(mktemp -d)"; F=scripts/fixtures/walker.js
echo '{"plan":[{"clip":"walk","seconds":2,"speed":1.4},{"clip":"idle","seconds":1}],"fps":10}' > "$O/motion.json"
echo '{"n":20,"clip":"walk","speed":1.4,"seconds":2,"near":10,"max":5}' > "$O/crowd.json"
echo '{"plan":[{"clip":"walk","seconds":0.5,"speed":1.4}],"fps":6}' > "$O/film.json"
for m in motion crowd film; do node scripts/render.mjs --file $F --id walker --v 1 --$m "$O/$m.json" --out "$O/$m" | grep -v '^  piece'; done
node -e '
const fs = require("fs"), o = process.argv[1], ok = (c, m) => { if (!c) { console.error("FAIL: " + m); process.exit(1); } console.log("ok: " + m); };
const mo = JSON.parse(fs.readFileSync(o + "/motion/walker-motion.json", "utf8"));
ok(mo.frames.length === 31 && mo.frames.every((f) => f.bones.leftFoot && f.bones.hips), "--motion: 31 frames, each with its feet and hips");
ok(mo.frames[20].at[1] > 2.5, "--motion: carried on at the walk’s speed (" + mo.frames[20].at[1].toFixed(2) + " m in 2 s)");
const cr = JSON.parse(fs.readFileSync(o + "/crowd/walker-crowd.json", "utf8"));
ok(cr.n === 20 && cr.rigged > 0 && cr.rigged <= 5 && cr.frames > 0, "--crowd: 20 drawn, " + cr.rigged + " rigged near the eye, " + cr.frames + " frames");
const fr = fs.readdirSync(o + "/film/walker-film").filter((f) => f.endsWith(".png"));
ok(fr.length === 4, "--film: 4 frames drawn");
' "$O"
if command -v ffmpeg >/dev/null; then test -s "$O/film/walker-film.mp4" && echo "ok: --film: joined into walker-film.mp4"; fi
rm -rf "$O"
