# a PNG on stdin: its mean colour and the share of pixels that are the page's own dark green (#1f2a23 ±12): "r g b bg"
import sys, io
from PIL import Image, ImageStat
im = Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB').resize((96, 60))
m = ImageStat.Stat(im).mean
px = list(im.getdata())
bg = sum(1 for (r, g, b) in px if abs(r - 31) < 13 and abs(g - 42) < 13 and abs(b - 35) < 13) / len(px)
print(round(m[0]), round(m[1]), round(m[2]), round(bg, 2))
