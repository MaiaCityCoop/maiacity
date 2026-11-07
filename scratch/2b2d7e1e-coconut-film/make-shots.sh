#!/usr/bin/env bash
# The film's moving shots from the bench's renders: slow push/pan/tilt over 1440 px stills (zoompan), the dev-log
# split (v2 | v3, same camera), and the time-lapse (stages 0 → 11 in quarter steps). Out: 1080×1080, 30 fps, H.264.
# usage: make-shots.sh <stills dir> <v2 dir> <timelapse dir> <out dir>
set -euo pipefail
ST=$1; V2=$2; TL=$3; OUT=$4; mkdir -p "$OUT"
enc=(-c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -r 30 -movflags +faststart -an)
# move <still> <seconds> <zoom expr> <x expr> <y expr> <out>
move() { local n; n=$(python3 -c "print(round($2*30))")
  ffmpeg -y -loglevel error -loop 1 -i "$1" -vf "scale=2160:2160:flags=lanczos,zoompan=z='$3':x='$4':y='$5':d=$n:s=1080x1080:fps=30" -frames:v "$n" "${enc[@]}" "$6"; }
C='iw/2-(iw/zoom/2)'; M='ih/2-(ih/zoom/2)'
# hook: a slow push into the backlit crown
[ -f "$OUT/01-hook-backlit-crown.mp4" ] || move "$ST/v3-hook-backlit-crown.png" 3.5 "1.0+0.0010*on" "$C" "$M" "$OUT/01-hook-backlit-crown.mp4"
# health: push into the bunches, then a drift across them from the side
move "$ST/v3-health-nuts-close.png" 3.5 "1.05+0.0014*on" "$C" "$M+on*0.4" "$OUT/04-health-nuts-close.mp4"
move "$ST/v3-health-nuts-side.png" 3 "1.12" "iw*0.05+on*1.6" "$M" "$OUT/05-health-nuts-side.mp4"
# autarky: a tilt up the trunk to the crown (the frame rises over the still)
move "$ST/v3-autarky-lowangle-trunk.png" 5.5 "1.25" "$C" "ih-ih/zoom-on*(ih-ih/zoom)/165" "$OUT/06-autarky-trunk-tilt.mp4"
# sovereignty: the grown palm into the sun, a slow pull back; then the old palm, held
move "$ST/v3-sovereignty-hero-wide.png" 3 "1.18-0.0018*on" "$C" "$M" "$OUT/07-sovereignty-hero-wide.mp4"
move "$ST/v3-sovereignty-old-palm.png" 3 "1.06-0.0006*on" "$C" "$M" "$OUT/08-sovereignty-old-palm.mp4"
# dev-log split: v2's Ripe (6.8 years) | v3's Grown palm (22 years), the same camera and scale, centre halves
ffmpeg -y -loglevel error -loop 1 -i "$V2/v2-split-wide.png" -loop 1 -i "$ST/v3-split-wide.png" -filter_complex \
  "[0]scale=1080:1080,crop=540:1080:270:0[a];[1]scale=1080:1080,crop=540:1080:270:0[b];[a][b]hstack,drawbox=x=538:y=0:w=4:h=1080:color=white@0.9:t=fill,zoompan=z='1.0+0.0006*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=105:s=1080x1080:fps=30" \
  -frames:v 105 "${enc[@]}" "$OUT/02-devlog-split.mp4"
# time-lapse: 12 renders (a stage each) at 2.4 a second, blended to 30 fps
ffmpeg -y -loglevel error -framerate 2.4 -pattern_type glob -i "$TL/v3-tl-*.png" -vf "scale=1080:1080,minterpolate=fps=30:mi_mode=blend" "${enc[@]}" -t 5 "$OUT/03-devlog-timelapse.mp4"
for f in "$OUT"/*.mp4; do printf '%s %ss\n' "$(basename "$f")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"; done
