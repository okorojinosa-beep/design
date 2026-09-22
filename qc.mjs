// ResQ-X post kit — programmatic QC.
//
//   node qc.mjs out
//
// The fit report sees fill, size, lines and clipping. It CANNOT see a colour
// collision or a missing mark — and every one of the worst bugs in this kit's
// history was exactly that. On an unattended run nobody looks at the frames, so
// these assertions stand in for the eye. They encode the failures that actually
// shipped:
//
//   6 Sep   wordmark rendered orange-on-orange and vanished
//   14 Sep  emphasis mark rendered orange-on-orange; a word left the headline
//   22 Sep  the full-bleed photo layer collapsed; frames rendered as flat ground
//
// Exit code 1 if anything fails, so a run can refuse to ship.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = process.argv[2] || 'out';

// ImageMagick 7 renamed the binaries; accept either.
const IM = (() => {
  for (const c of ['magick', 'convert']) {
    try { execFileSync(c, ['-version'], { stdio: 'ignore' }); return c; } catch {}
  }
  throw new Error('ImageMagick not found — qc.mjs needs magick or convert');
})();
const im = (args) => execFileSync(IM, IM === 'magick' ? args : args, { encoding: 'utf8' }).trim();

// Statistics for a crop, as percentages (0-100).
function stats(file, crop, gray) {
  const a = [file];
  if (crop) a.push('-crop', crop, '+repage');
  // TRAP: measure LUMINANCE, not channel maxima. Brand orange #FF8500 has a red
  // channel of 255, so a channel-max test calls an invisible orange-on-orange
  // wordmark "bright" and waves the bug straight through. Ask for grey first.
  if (gray) a.push('-colorspace', 'Gray');
  a.push('-format', '%[fx:standard_deviation*100] %[fx:mean*100] %[fx:maxima*100] %[fx:minima*100]', 'info:');
  const [sd, mean, max, min] = im(a).split(/\s+/).map(Number);
  return { sd, mean, max, min };
}

// Fill bands per layout. Statement and cover are centred poster frames and sit low
// BY NATURE — that is correct, documented, and must not be flagged.
const FILL = {
  feature:   [0.80, 1.05],
  method:    [0.80, 1.05],
  statement: [0.40, 1.05],
  cover:     [0.20, 1.05],
  route:     [0.30, 1.05],
  photo:     [0.15, 1.05],
};

const report = JSON.parse(fs.readFileSync(path.join(dir, '_report.json'), 'utf8'));
const fails = [];
const warns = [];
const pass = [];

for (const r of report.report) {
  const file = path.join(dir, r.name + '.png');
  if (!fs.existsSync(file)) { fails.push(r.name + ': PNG missing'); continue; }

  const [w, h] = im([file, '-format', '%w %h', 'info:']).split(/\s+/).map(Number);
  const tag = r.name + ' [' + r.layout + '/' + r.ground + ']';

  // 1. clipping — the fit engine's own verdict
  if (r.clipped) fails.push(tag + ': text CLIPPED off canvas');

  // 2. fill inside the band for its layout
  const band = FILL[r.layout] || [0.2, 1.05];
  if (r.fill < band[0] || r.fill > band[1])
    fails.push(tag + ': fill ' + r.fill + ' outside ' + band[0] + '-' + band[1]);

  // 3. the frame is not blank. A one-colour canvas means the render died silently.
  const whole = stats(file);
  if (whole.sd < 3) fails.push(tag + ': frame is essentially flat (sd ' + whole.sd.toFixed(1) + ') — nothing rendered?');

  // 4. a photo/route frame must actually carry a photograph. The bleed layer
  //    collapsed once and every frame came out as plain ground; photographic
  //    variance is what tells the two apart.
  if (r.layout === 'photo' || r.layout === 'route') {
    const bleed = stats(file, w + 'x' + Math.round(h * 0.4) + '+0+' + Math.round(h * 0.12));
    if (bleed.sd < 6)
      fails.push(tag + ': no photograph in the bleed (sd ' + bleed.sd.toFixed(1) + ') — the image layer did not render');
    else pass.push(tag + ': photo present (sd ' + bleed.sd.toFixed(1) + ')');
  }

  // 5. THE ORANGE TRAP. On an orange ground every orange device disappears. The
  //    wordmark sits top-left and must contain near-white pixels; the frame must
  //    also carry near-ink pixels. Either missing means something vanished.
  if (r.ground === 'orange') {
    const wm = stats(file, '420x90+40+40', true);
    if (wm.max < 88) fails.push(tag + ': no near-white pixels in the wordmark area — wordmark lost on orange');
    const grey = stats(file, null, true);
    if (grey.min > 30) fails.push(tag + ': no dark pixels anywhere — ink devices lost on orange');
    if (wm.max >= 88 && grey.min <= 30) pass.push(tag + ': orange-ground devices legible');
  }

  // 6. the contact bar is the one fixed element on every frame; a strip across the
  //    foot must show structure rather than empty ground.
  // The contact bar sits just above the foot padding — and a story canvas reserves
  // an extra 240px there for the link sticker, so a fixed percentage misses it.
  const padFoot = 62 + (r.tall ? 240 : 0);
  const foot = stats(file, w + 'x110+0+' + (h - padFoot - 110));
  if (foot.sd < 4) warns.push(tag + ': foot strip looks empty (sd ' + foot.sd.toFixed(1) + ') — check the contact bar');
}

console.log('QC — ' + report.report.length + ' frames, ImageMagick via ' + IM + '\n');
for (const p of pass)  console.log('  ok    ' + p);
for (const w of warns) console.log('  warn  ' + w);
for (const f of fails) console.log('  FAIL  ' + f);

console.log('\n' + fails.length + ' failure(s), ' + warns.length + ' warning(s)');
if (fails.length) {
  console.log('These are the failures that cannot be seen in a fit report. Do not ship.');
  process.exit(1);
}
console.log('Frames pass the checks a human eye would make. Fill, clipping, photography and colour collisions all verified.');
