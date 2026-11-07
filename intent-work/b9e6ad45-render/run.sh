#!/usr/bin/env bash
# c11's look for intent b9e6ad45, on Samuel's Mac (Metal): both people beside the motion capture they were made from.
#   bash intent-work/b9e6ad45-render/run.sh          (from the repository's root, on the branch intent/b9e6ad45-motion)
# Needs bun, Playwright with its Chromium, ffmpeg. No token, no fal, nothing paid: everything it draws is in git.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; J="$REPO/intent-work/b9e6ad45-render"; OUT="$J/out"; W="${WORK:-$HOME/b9e6ad45-work}"
cd "$REPO/play/site" && bun install >/dev/null && cd "$REPO"
rm -rf "$W" && mkdir -p "$W" "$OUT"
bun "$J/render.mjs" "$W" 2>&1 | tee "$OUT/run-log.txt"
# a film of each person (every clip in turn) and a sheet of four moments of each clip, kept small for git
for who in stand-in elder-woman; do
  list="$W/$who.txt"; : > "$list"
  for d in "$W/frames/$who"/*/; do
    clip=$(basename "$d"); n=$(ls "$d" | wc -l)
    ffmpeg -loglevel error -y -framerate 30 -i "$d/%04d.jpg" -vf "scale=1280:-2" -c:v libx264 -crf 28 -pix_fmt yuv420p "$W/$who-$clip.mp4"
    echo "file '$W/$who-$clip.mp4'" >> "$list"
    ffmpeg -loglevel error -y -framerate 30 -i "$d/%04d.jpg" -vf "select='not(mod(n\,$(( (n + 3) / 4 ))))',scale=800:-2,tile=1x4" -frames:v 1 -q:v 4 "$OUT/sheet-$who-$clip.jpg"
  done
  ffmpeg -loglevel error -y -f concat -safe 0 -i "$list" -c copy "$OUT/film-$who.mp4"
done
# the Elder standing beside real people standing and walking: Pyrkon 2026 (Rose Abrams, Wikimedia Commons, CC BY 4.0;
# artifact 535a1d5f): its first 20 s, scaled, without sound, beside her idle's front panel looped
T=$(curl -sS 'https://commons.wikimedia.org/w/api.php?action=query&titles=File:Pyrkon_2026_-_ambient_flow_of_people_1.webm&prop=videoinfo&viprop=derivatives&format=json' \
  | python3 -c "import json,sys;p=next(iter(json.load(sys.stdin)['query']['pages'].values()));print(next(d['src'] for d in p['videoinfo'][0]['derivatives'] if '480p' in d['src']))")
curl -sSf -o "$W/pyrkon.webm" "$T"
ffmpeg -loglevel error -y -stream_loop -1 -i "$W/elder-woman-idle.mp4" -i "$W/pyrkon.webm" -t 20 \
  -filter_complex "[0:v]crop=iw/4:ih:0:0,scale=-2:540[a];[1:v]scale=-2:540[b];[a][b]hstack" -an -c:v libx264 -crf 28 -pix_fmt yuv420p "$OUT/elder-idle-beside-pyrkon.mp4"
du -sh "$OUT"/*
echo "Commit $OUT and push it on this branch: git add intent-work/b9e6ad45-render/out && git commit -m 'b9e6ad45 c11: the Mac render' && git push"
