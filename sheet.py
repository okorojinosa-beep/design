# ResQ-X post kit — contact sheet.
#
#   python3 sheet.py [dir] [out.jpg]
#
# Built with Pillow, not ImageMagick. `montage` aborts in the Higgsfield sandbox even on
# pre-thumbnailed input — it is not a transient memory blip, it fails every time. Pillow
# loads, thumbnails and releases one frame at a time and stays inside the 256MiB cap.
#
# This sheet is the attended-QC view, for when a human is around to look. qc.mjs is the
# gate that actually blocks a ship.

import glob
import math
import os
import sys

from PIL import Image

d = sys.argv[1] if len(sys.argv) > 1 else '.'
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(d, 'contact-sheet.jpg')

files = sorted(f for f in glob.glob(os.path.join(d, '*.png')))
if not files:
    print('sheet: no frames found in ' + d)
    sys.exit(0)

TW, TH, PAD = 300, 375, 8
cols = min(3, len(files))
rows = math.ceil(len(files) / cols)
sheet = Image.new('RGB', (cols * (TW + PAD) + PAD, rows * (TH + PAD) + PAD), (138, 138, 138))

for i, f in enumerate(files):
    im = Image.open(f)
    im.thumbnail((TW, TH))
    im = im.convert('RGB')
    x = PAD + (i % cols) * (TW + PAD) + (TW - im.width) // 2
    y = PAD + (i // cols) * (TH + PAD) + (TH - im.height) // 2
    sheet.paste(im, (x, y))
    im.close()

sheet.save(out, quality=80)
print('sheet: %d frames -> %s (%dx%d)' % (len(files), out, sheet.size[0], sheet.size[1]))
