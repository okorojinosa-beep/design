// ResQ-X post kit — put the real mark on a bare image.
//
//   node stamp.mjs <image-url-or-path> <out.png> [--size auto|feed|story|reel|square]
//                                                [--bar] [--no-badge] [--position right]
//
// WHY THIS EXISTS
// render.mjs marks the frames it builds. Plenty of ResQ-X visuals are not frames —
// a Higgsfield generation used as a reel cover, an ad creative, a thumbnail. Those
// used to go out bare or, worse, with a mark pasted on by hand somewhere else. The
// standing rule is that EVERY ResQ-X visual carries the real logo, so there has to be
// one command that does it, from the same vector, with the same ground-aware colours.
//
// THE RULE THIS ENFORCES: Higgsfield is never asked to draw the logo. A generative
// model mangles lettering, which is why every prompt says "No text, no lettering, no
// logos, no watermark". The photograph is generated; the mark is composited in code,
// here. If you ever see a logo inside a generated image, that image is wrong.
//
// The mark is always set on the `dark` pair (white RESQ / orange X) over a scrim,
// because a photograph's local brightness is unknowable and white-on-scrim is the one
// combination that survives a bright sky AND a night expressway.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { SIZES, css } from './templates.mjs';
import { resolvePhoto } from './media.mjs';
import { wordmark, siteBadge, contactBar, C } from './brand.mjs';

const CHROME = process.env.RESQX_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function parseArgs(argv) {
  const pos = [];
  const opt = { size: 'auto', bar: false, badge: true, position: 'left' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bar') opt.bar = true;
    else if (a === '--no-badge') opt.badge = false;
    else if (a === '--size') opt.size = argv[++i];
    else if (a === '--position') opt.position = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else pos.push(a);
  }
  return { src: pos[0], out: pos[1] || 'stamped.png', opt };
}

// A stamp is not a poster: when no contact bar is asked for, the foot scrim must be
// light or it reads as a dark band with nothing in it. The top band always stays —
// it is the only thing guaranteeing the mark is legible over an unknown photograph.
function scrim(bar) {
  const foot = bar ? '.82' : '.30';
  return `background:linear-gradient(180deg,rgba(10,10,28,.58) 0%,rgba(10,10,28,.04) 26%,` +
         `rgba(10,10,28,.02) 62%,rgba(10,10,28,${foot}) 100%)`;
}

async function main() {
  const { src, out, opt } = parseArgs(process.argv.slice(2));
  if (!src) {
    console.error('usage: node stamp.mjs <image-url-or-path> <out.png> [--size auto|feed|story|reel|square] [--bar] [--no-badge] [--position right]');
    process.exit(1);
  }

  const uri = await resolvePhoto(src, process.cwd());
  if (!uri) {
    console.error('Could not resolve the image. A CDN host has to be listed in RESQX_ALLOW_HOSTS,');
    console.error('and the Claude sandbox reaches none of them — run this on the Higgsfield side.');
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  const ctx = await browser.newContext({ offline: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // `auto` keeps the image's own shape — a 1:1 generation stays square, a 9:16 stays
  // 9:16. Forcing everything to a feed canvas crops the subject out of half of them.
  let size;
  if (opt.size === 'auto') {
    const nat = await page.evaluate(u => new Promise(res => {
      const im = new Image();
      im.onload = () => res([im.naturalWidth, im.naturalHeight]);
      im.onerror = () => res([1080, 1080]);
      im.src = u;
    }), uri);
    const [nw, nh] = nat;
    const w = 1080;
    const h = Math.round(1080 * (nh / nw));
    size = { w, h, tall: h / w > 1.5 };
    console.log(`  size auto -> ${w}x${h} (source ${nw}x${nh})`);
  } else {
    size = SIZES[opt.size];
    if (!size) throw new Error(`unknown size "${opt.size}" — use auto, feed, story, reel or square`);
    console.log(`  size ${opt.size} -> ${size.w}x${size.h}`);
  }

  const top = opt.position === 'right'
    ? `${opt.badge ? siteBadge('night') : '<span></span>'}${wordmark('dark', 34)}`
    : `${wordmark('dark', 34)}${opt.badge ? siteBadge('night') : ''}`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${css(size, 'night', true)}
.scrim{${scrim(opt.bar)}}
</style></head>
<body><div class="frame">
  <div class="bleed" style="background-image:url('${uri}')"></div><div class="scrim"></div>
  <div class="top">${top}</div>
  ${opt.bar ? contactBar('night', true) : ''}
</div></body></html>`;

  await page.setViewportSize({ width: size.w, height: size.h });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size.w, height: size.h } });
  await browser.close();

  console.log(`\nstamped -> ${path.resolve(out)}  ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
  console.log('The mark is composited from the real vector in brand.mjs. Nothing was generated.');
}

main().catch(e => { console.error(e); process.exit(1); });
