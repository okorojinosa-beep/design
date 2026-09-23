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
// THE REAL LOGO. Not a reconstruction.
//
// Until 23 Sep this was the letters RESQ + X set in Figtree with three hand-drawn
// streaks beside them. It read close, but it was never the mark: the X is custom,
// its speed lines are part of the glyph, and the letter widths do not match a
// typeface. What follows is the actual brand vector (Drive: final-logo.svg).
//
// TRAP: it is INLINED here, not read from assets/. hf-render.sh curls a fixed list of
// code files out of the repo and assets/ is not among them, so a file read would resolve
// to nothing inside the Higgsfield sandbox and this function would quietly fall back
// to a lookalike on every unattended run. A logo that is only sometimes the real one
// is worse than one that never is. assets/brand/logo.svg holds the same bytes and is
// there for humans; this constant is what renders.
//
// TRAP: the streaks are PART OF THE MARK. Never add streak elements beside it.
// TRAP: two path groups, two colours — #FF8500 is RESQ, #0A0A1C is the X. BOTH swap
// per ground. An orange RESQ on an orange ground is an invisible RESQ, which is
// exactly the bug that shipped on 6 Sep.
const LOGO_SVG = String.raw`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1371.14 255.71" role="img" aria-label="ResQ-X">
  <g id="rx-resq" fill="#FF8500">
    <path d="M144.56,213.69L39.69,148.51v65.18H0V34.44H140.35c50.2,0,70.7,10.78,70.7,53.88v12.35c0,41.53-22.34,52.3-71.23,52.3h-31.54l105.13,60.71h-68.86Zm26.55-123.27c0-19.19-7.1-22.34-33.38-22.34H39.69v54.67h98.04c25.76,0,33.38-3.15,33.38-22.6v-9.72Z"/>
    <path d="M302.78,213.69c-52.83,0-68.34-16.3-68.34-61.5v-56.25c0-45.21,15.51-61.5,68.34-61.5h44.16v33.91h-44.16c-23.13,0-28.65,6.83-28.65,27.6v12.09h152.71v31.8h-152.71v12.62c0,21.55,5.26,27.33,28.65,27.33h125.11v33.91h-125.11Z"/>
    <path d="M448.39,213.69v-33.91h136.15c14.19,0,20.24-3.15,20.24-15.24v-9.72c0-11.3-6.05-15.51-19.98-15.51h-85.42c-40.21,0-50.73-14.72-50.73-45.47v-8.94c0-36.8,14.72-50.46,50.73-50.46h55.72v33.91h-52.04c-12.09,0-17.87,3.68-17.87,17.87v5.78c0,11.3,4.73,15.51,17.61,15.51h83.84c39.95,0,54.67,13.14,54.67,45.47v14.19c0,33.38-14.72,46.52-54.67,46.52h-138.25Z"/>
    <path d="M834.23,239.45l-25.76-27.6h-75.17c-53.09,0-68.6-15.24-68.6-60.45v-55.46c0-45.21,15.51-61.5,68.6-61.5h68.07c53.09,0,68.6,16.3,68.6,61.5v55.46c0,26.28-5.26,42.58-20.5,51.52l33.91,36.53h-49.15Zm-4.21-141.67c0-22.34-6.83-28.91-30.23-28.91h-64.66c-25.23,0-30.49,6.57-30.49,28.91v45.73c0,28.39,3.15,35.22,30.49,35.22h64.66c23.39,0,30.23-5.52,30.23-28.91v-52.04Z"/>
  </g>
  <g id="rx-x" fill="#0A0A1C">
    <path d="M1371.14,197.6c0,3.21-1.31,6.11-3.41,8.22-2.1,2.09-5.01,3.4-8.22,3.4h-169.23c-3.21,0-6.11,1.31-8.22,3.4-2.1,2.1-3.4,5.02-3.4,8.23,0,6.42,5.2,11.62,11.62,11.62h95.91c6.42,0,11.62,5.21,11.62,11.63,0,3.21-1.31,6.11-3.4,8.22-2.1,2.1-5.01,3.41-8.22,3.41h-99.02l-105.36-97.86-104.98,97.86h-79.48l146.97-132.36L905.6,0h82.11l97.49,90.73L1187.93,0h142.45c6.43,0,11.63,5.21,11.63,11.63,0,3.21-1.29,6.11-3.4,8.22-2.1,2.1-5.01,3.41-8.23,3.41h-134.68c-3.21,0-6.11,1.29-8.22,3.4-2.1,2.1-3.4,5.01-3.4,8.22,0,6.42,5.2,11.63,11.62,11.63h71.18c6.43,0,11.63,5.2,11.63,11.62,0,3.22-1.31,6.12-3.4,8.23-2.1,2.1-5.02,3.4-8.23,3.4h-112.06c-3.21,0-6.11,1.29-8.22,3.4-2.1,2.1-3.4,5.01-3.4,8.23,0,6.42,5.2,11.62,11.62,11.62h175.56c6.43,0,11.63,5.2,11.63,11.63,0,3.21-1.29,6.11-3.4,8.22-2.1,2.1-5.01,3.4-8.23,3.4h-194.37c-.61,0-1.19-.04-1.78-.14h-.01l-.15,.14h-10.37c-3.21,0-6.11,1.31-8.22,3.41-2.1,2.1-3.41,5.01-3.41,8.22,0,6.42,5.21,11.63,11.63,11.63h148.61c6.42,0,11.62,5.2,11.62,11.62,0,3.21-1.31,6.11-3.4,8.22-2.1,2.1-5.01,3.41-8.22,3.41h-118.94c-3.21,0-6.12,1.31-8.23,3.4-2.09,2.1-3.4,5.01-3.4,8.22,0,6.43,5.2,11.63,11.63,11.63h206.13c6.42,0,11.63,5.2,11.63,11.63Z"/>
    <path d="M1349.61,151.1c0,3.21-1.31,6.11-3.4,8.22-2.1,2.1-5.02,3.41-8.23,3.41h-38.08c-6.42,0-11.62-5.21-11.62-11.63,0-3.21,1.31-6.11,3.4-8.22,2.1-2.1,5.01-3.4,8.22-3.4h38.08c6.43,0,11.63,5.2,11.63,11.62Z"/>
  </g>
</svg>`;

// The artboard is 1371.14 × 255.71, but the RESQ caps only occupy the middle 80% of
// that height — the X deliberately breaks the cap line top and bottom — and the
// letterforms are lighter than the bold Figtree they replaced. Both pull the mark
// optically small. 1.15em is what lands it level with the two-line site badge across
// the frame; .9em (the naive cap-height match) sits visibly light, 1.3em crowds.
const LOGO_W = 1371.14, LOGO_H = 255.71;

export function wordmark(on = "cream", px = 34) {
  const pair = {
    cream:  [C.orange, C.ink],
    dark:   [C.white,  C.orange],
    night:  [C.white,  C.orange],
    ink:    [C.white,  C.orange],
    orange: [C.white,  C.ink],
  }[on] || [C.orange, C.ink];
  const [resq, x] = pair;

  const h = px * 1.15;
  const w = h * (LOGO_W / LOGO_H);

  const svg = LOGO_SVG
    .replace("#FF8500", resq)
    .replace("#0A0A1C", x)
    .replace("<svg ", `<svg width="${w.toFixed(1)}" height="${h.toFixed(1)}" style="display:block" `);

  return `<div class="wm">${svg}</div>`;
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
