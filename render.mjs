// ResQ-X post kit — spec JSON in, finished PNGs out.
//
//   node render.mjs specs/post.json out
//
// Prints a PROOF AGAINST THIS block listing every on-canvas string, plus a fit
// report. The fit report CANNOT see a colour collision or a missing emphasis mark —
// it reports fill, size, lines and clipping only. Always look at the frames.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { buildHTML, SIZES, CAPS, FIT_FN } from './templates.mjs';

const CHROME = process.env.RESQX_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// ── Photo resolution ─────────────────────────────────────────────────────────
// Photos are resolved to data URIs HERE, at build time, never fetched by the page.
// The render context runs with offline:true so a template that tried to fetch
// anything would fail loudly rather than silently render a blank panel.
//
// Two sources work:
//   • a local file path (chat attachment, connected folder, anything on disk)
//   • an https URL on raw.githubusercontent.com
//
// Every image CDN is blocked by organisation egress policy (hard 403 on CONNECT):
// unsplash, picsum, wikimedia, cloudfront, our own wasabi bucket. Do not re-test
// this and do not add another host here without checking it first.
const ALLOWED_HOSTS = new Set(['raw.githubusercontent.com']);

async function resolvePhoto(ref, baseDir) {
  if (!ref) return null;

  if (/^https?:\/\//i.test(ref)) {
    const host = new URL(ref).hostname;
    if (!ALLOWED_HOSTS.has(host)) {
      console.warn(`  ! ${host} is not a reachable host from this sandbox — slot dropped`);
      return null;
    }
    try {
      const res = await fetch(ref);
      if (!res.ok) { console.warn(`  ! ${res.status} fetching ${ref} — slot dropped`); return null; }
      const buf = Buffer.from(await res.arrayBuffer());
      const type = res.headers.get('content-type') || MIME[path.extname(ref).toLowerCase()] || 'image/jpeg';
      if (!type.startsWith('image/')) { console.warn(`  ! ${ref} is ${type}, not an image — slot dropped`); return null; }
      console.log(`  photo ${path.basename(ref)} ${(buf.length / 1024).toFixed(0)}KB from ${host}`);
      return `data:${type};base64,${buf.toString('base64')}`;
    } catch (e) {
      console.warn(`  ! could not fetch ${ref}: ${e.message} — slot dropped`);
      return null;
    }
  }

  const p = path.isAbsolute(ref) ? ref : path.join(baseDir, ref);
  if (!fs.existsSync(p)) { console.warn(`  ! missing photo ${ref} — slot dropped`); return null; }
  const buf = fs.readFileSync(p);
  const type = MIME[path.extname(p).toLowerCase()] || 'image/jpeg';
  console.log(`  photo ${path.basename(p)} ${(buf.length / 1024).toFixed(0)}KB local`);
  return `data:${type};base64,${buf.toString('base64')}`;
}

// ── Strip HTML for the proof listing ─────────────────────────────────────────
const plain = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/ /g, ' ').trim();

async function main() {
  const specPath = process.argv[2];
  const outDir   = process.argv[3] || 'out';
  if (!specPath) { console.error('usage: node render.mjs <spec.json> [outDir]'); process.exit(1); }

  const baseDir = path.dirname(path.resolve(specPath));
  const posts = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  // offline:true — if a template ever tries to fetch, it fails here instead of
  // shipping a frame with a missing image.
  const ctx = await browser.newContext({ offline: true, deviceScaleFactor: 1 });

  const proof = [];
  const report = [];
  let warnings = 0;

  for (const post of posts) {
    const sizeName = post.size || 'feed';
    const size = SIZES[sizeName];
    if (!size) throw new Error(`unknown size "${sizeName}" in post "${post.slug}"`);

    for (let i = 0; i < post.frames.length; i++) {
      const f = post.frames[i];
      const name = `${post.slug}-${String(i + 1).padStart(2, '0')}-${sizeName}`;
      console.log(`\n${name}  [${f.layout}${f.ground ? ' / ' + f.ground : ''}]`);

      const uris = [];
      for (const ref of (f.photos || [])) uris.push(await resolvePhoto(ref, baseDir));

      const { html, warn } = buildHTML(f, sizeName, uris);
      for (const wmsg of warn) { console.warn(`  ! ${wmsg}`); warnings++; }

      const page = await ctx.newPage();
      await page.setViewportSize({ w: size.w, h: size.h, width: size.w, height: size.h });
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);

      // The cover ghost is set at a fixed 340px and runs off a 1080 canvas on any
      // word longer than about five letters. Scale it to sit inside the margins.
      await page.evaluate(() => {
        const g = document.querySelector('.ghost span');
        if (!g) return;
        const max = document.querySelector('.frame').clientWidth - 40;
        const w = g.getBoundingClientRect().width;
        if (w > max) g.style.fontSize = (parseFloat(getComputedStyle(g).fontSize) * (max / w)) + 'px';
      });

      // FIT_FN is passed as a REAL FUNCTION. Playwright serialises it with toString().
      // Passing a template-literal string here silently drops the argument and every
      // frame renders unfitted with fill=undefined.
      const fit = await page.evaluate(FIT_FN, {
        cap:        CAPS[f.layout] ?? 110,
        listCap:    size.tall ? 42 : 39,
        gapCap:     size.tall ? 92 : 76,
        listGapCap: 34,
        target:     0.94,
        maxLines:   4,
      });

      const file = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: file, type: 'png' });
      await page.close();

      const flag = fit.clipped ? '  *** CLIPPED ***' : '';
      if (fit.clipped) warnings++;
      console.log(`  fill=${fit.fill} size=${fit.size}px lines=${fit.lines}${flag}`);
      report.push({ name, layout: f.layout, ground: f.ground || 'cream', ...fit });

      const strings = [plain(f.headline)];
      if (f.sub)    strings.push(plain(f.sub));
      if (f.route)  strings.push(plain(f.route));
      (f.list  || []).forEach((t, n) => strings.push(`${n + 1}. ${plain(t)}`));
      (f.chips || []).forEach(t => strings.push(`[${plain(t)}]`));
      if (f.kicker) strings.push(plain(f.kicker));
      proof.push({ name, strings });
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(72));
  console.log('PROOF AGAINST THIS — every string that appears on canvas');
  console.log('='.repeat(72));
  for (const p of proof) {
    console.log(`\n${p.name}`);
    p.strings.forEach(s => console.log(`   ${s}`));
  }

  console.log('\n' + '='.repeat(72));
  console.log('FIT REPORT  (fill target .94 — statement frames sit .50-.75 by nature,');
  console.log('that is centred poster air and is correct. Do not chase it.)');
  console.log('='.repeat(72));
  for (const r of report) {
    console.log(`  ${r.name.padEnd(42)} ${String(r.layout).padEnd(10)} fill=${r.fill} ${r.size}px ${r.lines}L${r.clipped ? '  CLIPPED' : ''}`);
  }

  fs.writeFileSync(path.join(outDir, '_report.json'), JSON.stringify({ report, proof }, null, 2));
  console.log(`\n${report.length} frames -> ${outDir}/   ${warnings ? warnings + ' WARNING(S) — look at them' : 'no warnings'}`);
  console.log('The fit report cannot see a colour collision or a missing mark. Look at the frames.');
}

main().catch(e => { console.error(e); process.exit(1); });
