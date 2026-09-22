// ResQ-X post kit — brand tokens and furniture.
// Every colour here is sampled from live resqx.ng CSS. Never invent a palette.
//
// THE RULE THAT KEEPS BITING: any hard-coded brand colour is a bug waiting for an
// orange frame. Anything that renders orange must go through accent(ground).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const C = {
  orange:  '#FF8500',   // THE brand colour. Not amber, not gold. 50 hits across 147 posts.
  cream:   '#FDF8EE',
  night:   '#1C1814',
  ink:     '#0A0A1C',
  heading: '#1B1B1B',
  body:    '#474747',
  muted:   '#777777',
  white:   '#FFFFFF',
  coral:   '#FF613E',   // exists on the account, NEVER a headline colour
  rust:    '#995000',   // same
  fleetDark:  '#262422', // Fleet OS product surfaces ONLY — never a Rescue/Refuel post
  fleetGreen: '#006000',
};

export const CONTACT = {
  hotline:  '0201 887 0024',
  whatsapp: '0811 117 3779',
  site:     'www.resqx.ng',
};

// ── Ground-aware accent ──────────────────────────────────────────────────────
// On an orange ground, orange devices vanish. This has shipped as a live bug twice
// (wordmark 6 Sep, emphasis mark 14 Sep — a headline word disappeared entirely).
// Everything orange routes through here.
export const accent = (ground) => (ground === 'orange' ? C.ink : C.orange);

// The `o` mark is a COLOUR SWAP, not a shape. accent() is ink on an orange ground —
// which is the same ink as the headline text, so the marked word looks identical to
// every other word and the mark does nothing. Shapes (ring, ul, hi) contrast fine
// because they are drawn; a swap has to differ from the TEXT colour.
export const markSwap = (ground) => (ground === 'orange' ? C.white : C.orange);

export const groundFill = (ground) => ({
  cream:  C.cream,
  orange: C.orange,
  ink:    C.ink,
  night:  C.night,
  dark:   C.night,
}[ground] || C.cream);

export const textOn = (ground) =>
  (ground === 'cream' ? C.heading : ground === 'orange' ? C.ink : C.white);

export const subOn = (ground) =>
  (ground === 'cream' ? C.body : ground === 'orange' ? 'rgba(10,10,28,.78)' : 'rgba(255,255,255,.80)');

// ── Font ─────────────────────────────────────────────────────────────────────
// The real face is General Sans (Fontshare) — what resqx.ng serves. Fontshare and
// every font CDN return 403 from the sandbox, so the kit ships Figtree from npm:
// closest free match on proportion, the double-storey a and the open S.
// Drop General Sans woff2 into assets/fonts/ and this picks it up automatically.
export function fontFace() {
  const custom = path.join(HERE, 'assets', 'fonts', 'general-sans-variable.woff2');
  if (fs.existsSync(custom)) {
    const b64 = fs.readFileSync(custom).toString('base64');
    return `@font-face{font-family:'ResQX';font-weight:100 900;font-display:block;
      src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  }
  const fig = path.join(
    HERE, 'node_modules', '@fontsource-variable', 'figtree', 'files',
    'figtree-latin-wght-normal.woff2'
  );
  const b64 = fs.readFileSync(fig).toString('base64');
  return `@font-face{font-family:'ResQX';font-weight:300 900;font-display:block;
    src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

// ── Topographic ground ───────────────────────────────────────────────────────
// Generated procedurally — seeded sine contours as inline SVG. No asset file to
// lose, nothing to fetch at render time.
export function topo(w, h, ground) {
  const stroke = ground === 'cream' ? 'rgba(28,24,20,.055)'
               : ground === 'orange' ? 'rgba(10,10,28,.085)'
               : 'rgba(255,255,255,.055)';
  let seed = 20260921;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const lines = [];
  for (let i = 0; i < 26; i++) {
    const baseY = -h * 0.18 + (i * h * 1.36) / 26;
    const amp = 26 + rnd() * 64;
    const freq = 0.9 + rnd() * 1.5;
    const phase = rnd() * Math.PI * 2;
    let d = '';
    for (let x = -40; x <= w + 40; x += 16) {
      const y = baseY + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp
                      + Math.sin((x / w) * Math.PI * 6 * freq + phase * 1.7) * amp * 0.22;
      d += (x === -40 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    }
    lines.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.2"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${lines.join('')}</svg>`;
  return `url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}")`;
}

// ── Wordmark ─────────────────────────────────────────────────────────────────
// "RESQ" + "X" with three trailing motion streaks.
// TRAP: the streaks must DESCEND — top .66em, middle .44em, bottom .24em. Near-equal
// trails with the longest in the middle read as an equals sign. Fixed twice; root
// cause was never the markup.
// TRAP: RESQ and X must sit in ONE span. Two flex children with a gap reads "RESQ X".
export function wordmark(on = 'cream', px = 34) {
  const pair = {
    cream:  [C.orange, C.ink],
    dark:   [C.white,  C.orange],
    night:  [C.white,  C.orange],
    ink:    [C.white,  C.orange],
    orange: [C.white,  C.ink],
  }[on] || [C.orange, C.ink];
  const [resq, x] = pair;
  const streak = (w, o) =>
    `<i style="display:block;width:${w}em;height:.055em;border-radius:9999px;background:${x};opacity:${o};margin-left:auto"></i>`;
  return `<div class="wm" style="font-size:${px}px">
    <span class="wm-w" style="font-weight:800;letter-spacing:-.03em;line-height:1;white-space:nowrap">
      <span style="color:${resq}">RESQ</span><span style="color:${x}">X</span>
    </span>
    <span class="wm-s" style="display:flex;flex-direction:column;gap:.085em;justify-content:center;margin-left:.16em">
      ${streak(0.78, 1)}${streak(0.46, 0.60)}${streak(0.20, 0.30)}
    </span>
  </div>`;
}

// ── Site badge, top-right ────────────────────────────────────────────────────
export function siteBadge(ground) {
  const a = accent(ground);
  const tx = textOn(ground);
  const dim = ground === 'cream' ? C.muted : ground === 'orange' ? 'rgba(10,10,28,.62)' : 'rgba(255,255,255,.62)';
  return `<div class="badge">
    <span class="bdg-i" style="background:${a}"></span>
    <span class="bdg-t">
      <em style="color:${dim}">to get started visit</em>
      <b style="color:${tx}">${CONTACT.site}</b>
    </span>
  </div>`;
}

// ── Contact bar ──────────────────────────────────────────────────────────────
// Orange pill on cream. White pill with shadow on photography AND on an orange
// ground (an orange bar on an orange field is invisible — shipped once).
export function contactBar(ground, onPhoto = false) {
  const white = onPhoto || ground === 'orange';
  const bg = white ? C.white : accent(ground);
  const fg = white ? C.ink : (ground === 'orange' ? C.ink : C.white);
  const dim = white ? 'rgba(10,10,28,.58)' : 'rgba(255,255,255,.72)';
  const sh = white ? 'box-shadow:0 10px 34px rgba(0,0,0,.20);' : '';
  const store = (top, bot) =>
    `<span class="store"><em style="color:${dim}">${top}</em><b style="color:${fg}">${bot}</b></span>`;
  return `<div class="cbar" style="background:${bg};${sh}">
    <span class="cgroup"><em style="color:${dim}">Reach our hotline</em><b style="color:${fg}">${CONTACT.hotline}</b></span>
    <span class="cdot" style="background:${fg};opacity:.28"></span>
    <span class="cgroup"><em style="color:${dim}">Send us a message</em><b style="color:${fg}">${CONTACT.whatsapp}</b></span>
    <span class="cstores">${store('App Store', 'iOS')}${store('Google Play', 'Android')}</span>
  </div>`;
}

// ── Numbered list ────────────────────────────────────────────────────────────
export function numberedList(items, ground) {
  const a = accent(ground);
  const numFg = ground === 'orange' ? C.cream : C.white;
  const tx = textOn(ground);
  return `<ol class="nlist">${items.map((t, i) => `
    <li class="nl">
      <span class="nl-n" style="background:${a};color:${numFg}">${i + 1}</span>
      <span class="nl-tx" style="color:${tx}">${t}</span>
    </li>`).join('')}</ol>`;
}

export function chips(items, ground) {
  const a = accent(ground);
  const onCream = ground === 'cream';
  const style = onCream
    ? `background:rgba(255,133,0,.12);color:${a};border:2px solid rgba(255,133,0,.28)`
    : ground === 'orange'
      ? `background:rgba(10,10,28,.10);color:${C.ink};border:2px solid rgba(10,10,28,.32)`
      : `background:rgba(255,255,255,.14);color:${textOn(ground)};border:2px solid rgba(255,255,255,.26)`;
  return `<div class="chips">${items.map(t =>
    `<span class="chip" style="${style}">${t}</span>`).join('')}</div>`;
}

export function kickerBox(text, ground) {
  const a = accent(ground);
  const fg = ground === 'orange' ? C.cream : C.white;
  return `<div class="kicker" style="background:${a};color:${fg}">${text}</div>`;
}

// ── Photo panel ──────────────────────────────────────────────────────────────
// 30px corners, 8px white frame, -2deg / +2.5deg, soft shadow, two panels
// overlapping by about a third.
export function photoPanel(dataUri, idx = 0) {
  const rot = idx === 0 ? -2 : 2.5;
  const cls = idx === 0 ? 'pp pp-a' : 'pp pp-b';
  return `<div class="${cls}" style="transform:rotate(${rot}deg)">
    <div class="pp-in" style="background-image:url('${dataUri}')"></div>
  </div>`;
}

// The PHOTO SLOT marker. A signal FOR THE AGENT that an image is missing — it must
// never reach a delivered asset. feature/method drop the panel and reflow to full
// width instead; only route/photo render this, and those layouts should not be used
// at all until real photography exists.
export function photoSlot(label = 'PHOTO SLOT') {
  return `<div class="pp pp-empty"><span>${label}</span></div>`;
}
