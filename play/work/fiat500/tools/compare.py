# renders beside the sheet's cells: python3 compare.py <sheet.jpg> <render dir> <out.png> name:cell:crop ...
# cell = x0,y0,x1,y1 in the sheet; crop = the render's fraction kept, l,t,r,b (0…1)
import sys
from PIL import Image, ImageDraw
sheet = Image.open(sys.argv[1]).convert('RGB'); rd = sys.argv[2]; out = sys.argv[3]
rows = []
H = 360
for spec in sys.argv[4:]:
    name, cell, crop = spec.split(':')
    c = [int(v) for v in cell.split(',')]; f = [float(v) for v in crop.split(',')]
    a = sheet.crop(c); r = Image.open(f'{rd}/fiat500-{name}.png').convert('RGB')
    w, h = r.size; r = r.crop((int(f[0] * w), int(f[1] * h), int(f[2] * w), int(f[3] * h)))
    a = a.resize((int(a.width * H / a.height), H)); r = r.resize((int(r.width * H / r.height), H))
    row = Image.new('RGB', (a.width + r.width + 10, H + 22), 'white'); row.paste(a, (0, 22)); row.paste(r, (a.width + 10, 22))
    ImageDraw.Draw(row).text((4, 4), f'{name}: the sheet | the render', fill=(0, 0, 0)); rows.append(row)
W = max(r.width for r in rows); img = Image.new('RGB', (W, sum(r.height for r in rows)), 'white'); y = 0
for r in rows: img.paste(r, (0, y)); y += r.height
img.save(out); print(img.size)
