#!/bin/bash
# round.sh <name>: bundle the working tree's sky, draw it at five hours, make one sheet
S=/tmp/claude-0/-home-user-maiacity/54a638b3-5331-5de2-8cde-b816fd496904/scratchpad
cd /home/user/maiacity/play/site && bun build .skyview-entry.js --outfile $S/skyview/bundle.js --target browser --format iife 2>&1 | grep -i error
timeout 200 bun ./.skyview-shoot.mjs $S/skyview/bundle.js $S/skyview/$1 ${2:-960} ${3:-600} 2>&1 | grep "ERROR\|error" | head -5
cd $S/skyview/$1 && python3 -c "
from PIL import Image
ims=[Image.open(f'{n}.png') for n in ['dawn','noon','afternoon','dusk','night']]
w,h=ims[0].size; sheet=Image.new('RGB',(w*2,h*3))
for i,im in enumerate(ims): sheet.paste(im,((i%2)*w,(i//2)*h))
sheet=sheet.crop((0,0,w*2,h*3)); sheet.save('../$1-sheet.png')"
