// ResQ-X post kit - CONTINUOUS carousel. One long canvas, sliced into 4-6 feed slides.
//
//   node strip.mjs <carousels.json> [outDir]
//
// WHY: separate full-bleed frames read as five posts glued together and give nobody a
// reason to swipe. Here an orange road runs unbroken through every slide, each point is a
// numbered stop on it, and photo panels straddle the joins so the next slide always peeks
// in. Slide 1 is the only full-bleed photograph. Approved by Nosa 14 Oct 2026.
//
// WHEN: use it when the copy is a SEQUENCE - steps, answers, a checklist, a route. A post
// carried by one strong scene or story stays on the per-frame layouts in render.mjs.
//
// Spec (an array; every entry must have "type":"continuous"):
// [{ "type":"continuous", "slug":"rescue-tow-quote",
//    "hook":  { "headline":"A tow quote is only as good as <span class=\"o\">your five answers</span>",
//               "sub":"...", "photo":"<higgsfield url>", "label":"Your car is here" },
//    "stops": [ { "tag":"Answer 3", "pin":"3", "headline":"What is it, <span class=\"o\">exactly?</span>",
//                 "sub":"...", "photo":"<url or null>" } ],          // 2-4 stops -> 4-6 slides
//    "close": { "headline":"Five answers.<br><span class=\"o\">One real quote.</span>", "sub":"...",
//               "list":["..."], "kicker":"Save this. DM \"TOW\" or call 0201 887 0024.", "end":"Quote sent" } }]
//
// Furniture: wordmark + site badge on EVERY slide (a slide shared alone still reads as
// ResQ-X). The contact bar is on the LAST slide only - on every slide it would cut the road.
// Exits 1 on any QC failure: missing photo, text crossing a join, text colliding with a
// photo or the road, a headline running off its slide. Never ship a strip that failed.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { C, fontFace, topo, wordmark, siteBadge, contactBar } from './brand.mjs';
import { resolvePhoto } from './media.mjs';

const W = 1080, H = 1350;
const ROAD_Y = 1226, ROAD_DIP = 1252, PHOTO_TOP = 640, PHOTO_W = 670, PHOTO_H = 480;

// Bind the last two words with a real U+00A0 so the emphasis never ends on a lone word.
// Skips spaces inside tags.
function widow(html) {
  let inTag = false;
  for (let i = html.length - 1; i >= 0; i--) {
    const ch = html[i];
    if (ch === '>') inTag = true;
    else if (ch === '<') inTag = false;
    else if (ch === ' ' && !inTag) return html.slice(0, i) + '\u00A0' + html.slice(i + 1);
  }
  return html;
}

function roadPath(N) {
  const P = [[150, 1240], [620, 1242]];
  for (let s = 1; s < N - 1; s++) {
    P.push([W * s + 160, ROAD_Y]);
    if (s < N - 2) P.push([W * s + 720, ROAD_DIP]);
  }
  const last = W * (N - 1);
  P.push([last - 80, 1246], [last + 220, 1228], [last + 440, 1120]);
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return { d, end: P[P.length - 1] };
}

function buildHTML(post, uris) {
  const stops = post.stops, N = stops.length + 2, TW = W * N;
  const { d, end } = roadPath(N);
  const pin = (x, y, label, cls = '') => `<div class="pin ${cls}" style="left:${x}px;top:${y}px">${label}</div>`;
  let body = '';

  // slide 1 - hook
  body += `<div class="hero"><img src="${uris.hook}"><div class="scrim"></div></div>
  <div class="fur" style="left:0">${wordmark('night')}${siteBadge('night')}</div>
  <div class="herotx" data-check="hook"><h1 class="w">${widow(post.hook.headline)}</h1>${post.hook.sub ? `<p class="w">${post.hook.sub}</p>` : ''}</div>
  ${post.hook.label ? `<div class="lbl" data-check="text" style="left:110px;top:1290px">${post.hook.label}</div>` : ''}`;
  body += pin(150, 1240, '', 'big');

  // stops
  stops.forEach((s, i) => {
    const x = W * (i + 1), isLast = i === stops.length - 1;
    body += `<div class="fur" style="left:${x}px">${wordmark('cream')}${siteBadge('cream')}</div>
    <div class="tx" data-check="stop" style="left:${x + 62}px">${s.tag ? `<span class="tag">${s.tag}</span>` : ''}<h1>${widow(s.headline)}</h1>${s.sub ? `<p>${s.sub}</p>` : ''}</div>`;
    if (uris.stops[i]) {
      const px = isLast ? x + 380 : x + 560;          // last stop stays inside its slide
      const rot = i % 2 ? 2.3 : -2.1;
      body += `<div class="ph" style="left:${px}px;transform:rotate(${rot}deg)"><img src="${uris.stops[i]}"></div>`;
    }
    body += pin(x + 160, ROAD_Y, s.pin ?? String(i + 1));
  });

  // last slide - close
  const xl = W * (N - 1), c = post.close;
  body += `<div class="fur" style="left:${xl}px">${wordmark('cream')}${siteBadge('cream')}</div>
  <div class="tx close" data-check="close" style="left:${xl + 62}px;width:956px"><h1 class="big">${widow(c.headline)}</h1>
  ${c.sub ? `<p>${c.sub}</p>` : ''}
  ${c.list?.length ? `<ol>${c.list.map((t, i) => `<li><i>${i + 1}</i>${t}</li>`).join('')}</ol>` : ''}
  ${c.kicker ? `<div class="kick">${c.kicker}</div>` : ''}</div>
  ${c.end ? `<div class="sent" data-check="text" style="left:${end[0] + 56}px;top:${end[1] - 24}px">${c.end}</div>` : ''}
  <div class="cb" style="left:${xl + 62}px">${contactBar('cream')}</div>`;
  body += pin(end[0], end[1], '&#10003;', 'big');

  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFace()}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${TW}px;height:${H}px;overflow:hidden;font-family:'ResQX',sans-serif;background:${C.cream};background-image:${topo(TW, H, 'cream')};position:relative}
.road{position:absolute;left:0;top:0;z-index:1}
.hero{position:absolute;left:0;top:0;width:${W}px;height:1130px;overflow:hidden;border-bottom-right-radius:140px;z-index:2}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,28,.5) 0%,rgba(10,10,28,0) 26%,rgba(10,10,28,0) 42%,rgba(10,10,28,.86) 100%)}
.fur{position:absolute;top:62px;width:${W}px;padding:0 62px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.badge{display:flex;align-items:center;gap:14px}.bdg-i{width:34px;height:34px;border-radius:50%}
.bdg-t{display:flex;flex-direction:column;line-height:1.18}.bdg-t em{font-style:normal;font-size:20px;font-weight:500}.bdg-t b{font-size:25px;font-weight:700}
h1{font-weight:850;font-size:98px;line-height:1.04;letter-spacing:-.028em;color:${C.heading};overflow-wrap:normal}
h1.big{font-size:108px}h1 .o{color:${C.orange}}h1.w{color:#fff;font-size:100px}
p{font-size:35px;line-height:1.36;color:${C.body};font-weight:500;margin-top:26px;max-width:880px}p.w{color:rgba(255,255,255,.9)}
.herotx{position:absolute;left:62px;width:956px;bottom:290px;z-index:4}
.tx{position:absolute;top:170px;width:900px;z-index:4}
.tag{display:inline-block;background:${C.orange};color:#fff;font-weight:800;font-size:25px;letter-spacing:.08em;text-transform:uppercase;padding:13px 26px;border-radius:9999px;margin-bottom:34px}
.ph{position:absolute;top:${PHOTO_TOP}px;width:${PHOTO_W}px;height:${PHOTO_H}px;border:8px solid #fff;border-radius:30px;overflow:hidden;box-shadow:0 18px 44px rgba(28,24,20,.22);z-index:3}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.pin{position:absolute;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:${C.orange};border:7px solid #fff;color:#fff;font-weight:850;font-size:27px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(28,24,20,.25);z-index:6}
.pin.big{width:84px;height:84px;margin:-42px 0 0 -42px;background:${C.ink};font-size:34px}
.lbl{position:absolute;font-size:27px;font-weight:700;color:${C.heading};z-index:6}
.sent{position:absolute;background:${C.ink};color:#fff;font-weight:800;font-size:25px;padding:12px 24px;border-radius:9999px;z-index:6;white-space:nowrap}
ol{list-style:none;margin-top:40px;display:flex;flex-direction:column;gap:20px}
li{display:flex;align-items:center;gap:22px;font-size:38px;font-weight:600;color:${C.heading}}
li i{font-style:normal;width:50px;height:50px;border-radius:50%;background:${C.orange};color:#fff;font-size:26px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.kick{margin-top:40px;background:${C.orange};color:#fff;font-weight:750;font-size:30px;padding:24px 34px;border-radius:9999px}
.cb{position:absolute;top:1188px;width:956px;z-index:5}
.cbar{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-radius:9999px}
.cgroup,.store{display:flex;flex-direction:column;line-height:1.15}.cgroup em,.store em{font-style:normal;font-size:19px;font-weight:500}.cgroup b{font-size:28px;font-weight:800}.store b{font-size:22px;font-weight:800}
.cdot{width:8px;height:8px;border-radius:50%}.cstores{display:flex;gap:28px}
</style></head><body>
<svg class="road" width="${TW}" height="${H}"><path d="${d}" fill="none" stroke="${C.orange}" stroke-width="44" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="26 22" stroke-linecap="round"/></svg>
${body}</body></html>`;
}

// Runs in the page. Shrinks each headline until its block fits its budget, then reports
// every failure. Budgets: a stop's text must clear the photo top; the hook's text must sit
// below the furniture; the close must clear the road end and contact bar.
export function FIT_AND_CHECK({ W, PHOTO_TOP }) {
  const fails = [];
  const shrink = (blk, limitFn) => {
    const h1 = blk.querySelector('h1');
    let fs = parseFloat(getComputedStyle(h1).fontSize);
    while (fs > 64 && (limitFn(blk.getBoundingClientRect()) || h1.scrollWidth > h1.clientWidth + 1)) {
      fs -= 3; h1.style.fontSize = fs + 'px';
    }
    return fs;
  };
  const sizes = [];
  document.querySelectorAll('[data-check="stop"]').forEach(b => sizes.push(shrink(b, r => r.bottom > PHOTO_TOP - 24)));
  document.querySelectorAll('[data-check="hook"]').forEach(b => sizes.push(shrink(b, r => r.top < 560)));
  document.querySelectorAll('[data-check="close"]').forEach(b => sizes.push(shrink(b, r => r.bottom > 1062)));

  const slideOf = x => Math.floor(x / W);
  document.querySelectorAll('[data-check]').forEach(b => {
    const r = b.getBoundingClientRect();
    if (slideOf(r.left) !== slideOf(r.right - 1)) fails.push(`text crosses a join: "${b.textContent.trim().slice(0, 40)}"`);
    const h1 = b.querySelector('h1');
    if (h1 && h1.scrollWidth > h1.clientWidth + 1) fails.push(`headline overflows: "${h1.textContent.slice(0, 40)}"`);
    const kind = b.dataset.check;
    if (kind === 'stop' && r.bottom > PHOTO_TOP - 24) fails.push(`stop text hits the photo: "${b.textContent.trim().slice(0, 40)}"`);
    if (kind === 'hook' && r.top < 560) fails.push('hook text too tall');
    if (kind === 'close' && r.bottom > 1062) fails.push('close text hits the road end / contact bar');
    if (h1 && h1.querySelectorAll('.o,.hi,.ring,.ul').length > 1) fails.push(`more than one emphasis mark: "${h1.textContent.slice(0, 40)}"`);
  });
  return { fails, sizes };
}

async function main() {
  const [specPath, outArg] = process.argv.slice(2);
  if (!specPath) { console.error('usage: node strip.mjs <carousels.json> [outDir]'); process.exit(1); }
  const outDir = path.resolve(outArg || 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const baseDir = path.dirname(path.resolve(specPath));
  const posts = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  const chrome = process.env.RESQX_CHROME ||
    ['/ms-playwright', '/opt/pw-browsers'].flatMap(root => {
      try { return fs.readdirSync(root).filter(d => d.startsWith('chromium-')).flatMap(d =>
        ['chrome-linux64/chrome', 'chrome-linux/chrome'].map(s => path.join(root, d, s))); } catch { return []; }
    }).find(p => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: chrome });

  let failures = 0;
  const proof = [];
  for (const post of posts) {
    if (post.type !== 'continuous') { console.error(`! ${post.slug}: not a continuous post - use render.mjs`); failures++; continue; }
    const n = post.stops?.length || 0;
    if (n < 2 || n > 4) { console.error(`! ${post.slug}: needs 2-4 stops (4-6 slides), got ${n}`); failures++; continue; }
    console.log(`\n${post.slug}  [continuous, ${n + 2} slides]`);

    const uris = { hook: await resolvePhoto(post.hook?.photo, baseDir), stops: [] };
    for (const s of post.stops) uris.stops.push(await resolvePhoto(s.photo, baseDir));
    if (!uris.hook) { console.error(`  FAIL hook photo missing`); failures++; continue; }
    post.stops.forEach((s, i) => { if (s.photo && !uris.stops[i]) { console.error(`  FAIL stop ${i + 1} photo did not resolve`); failures++; } });

    const N = n + 2;
    const page = await browser.newPage({ viewport: { width: W * N, height: H } });
    await page.setContent(buildHTML(post, uris), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const { fails, sizes } = await page.evaluate(FIT_AND_CHECK, { W, PHOTO_TOP });
    for (const f of fails) { console.error(`  FAIL ${f}`); failures++; }
    console.log(`  headline sizes ${sizes.map(s => Math.round(s) + 'px').join(' ')}`);

    const strip = path.join(outDir, `${post.slug}-strip.png`);
    await page.screenshot({ path: strip });
    await page.close();
    for (let i = 0; i < N; i++) {
      const out = path.join(outDir, `${post.slug}-${String(i + 1).padStart(2, '0')}-feed.png`);
      await sliceSlide(browser, strip, i, out);
      console.log(`  ${path.basename(out)}`);
    }
    fs.unlinkSync(strip);

    const strings = [post.hook.headline, post.hook.sub, post.hook.label,
      ...post.stops.flatMap(s => [s.tag, s.headline, s.sub]),
      post.close.headline, post.close.sub, ...(post.close.list || []).map((t, i) => `${i + 1}. ${t}`),
      post.close.kicker, post.close.end].filter(Boolean)
      .map(t => t.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '));
    proof.push([post.slug, strings]);
  }
  await browser.close();

  console.log('\n' + '='.repeat(72) + '\nPROOF AGAINST THIS - continuous carousels\n' + '='.repeat(72));
  for (const [slug, strings] of proof) { console.log(`\n${slug}`); strings.forEach(s => console.log('   ' + s)); }
  console.log(`\n${failures} failure(s)`);
  process.exit(failures ? 1 : 0);
}

// Crop one 1080px slide out of the strip, using the browser so no extra dependency is needed.
async function sliceSlide(browser, stripPng, i, out) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const b64 = fs.readFileSync(stripPng).toString('base64');
  await page.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${b64}" style="display:block;margin-left:${-i * W}px"></body>`, { waitUntil: 'load' });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
  await page.close();
}

if (import.meta.url === `file://${process.argv[1]}`) main();
