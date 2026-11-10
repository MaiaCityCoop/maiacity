#!/bin/bash
# the box's counts on origin/main eadbf2f7, play read live (tonight's pins)
cd /home/user/maiacity
O=/tmp/claude-0/-home-user-maiacity/6525f59c-6667-5392-8509-10946a69838f/scratchpad/box
for w in sandbox-3 sandbox-5 sandbox-1; do
  ( time bun play/site/scripts/census.ts --world $w --live --copies --json $O/census-$w.json ) > $O/census-$w.txt 2>&1
  echo "census $w: $?" >> $O/done.txt
done
for w in sandbox-3 sandbox-5 sandbox-1; do
  ( time bun play/site/scripts/census.ts --world $w --live --frame --json $O/frame-$w.json ) > $O/frame-$w.txt 2>&1
  echo "frame $w: $?" >> $O/done.txt
done
