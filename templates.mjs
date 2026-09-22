// ResQ-X post kit — the six layouts, the CSS, and the fit engine.
//
// FIVE OVERFLOW TRAPS live in here. Each one shipped a broken frame once. Read the
// comments before changing anything in fit():
//   1. mid.scrollHeight never reports below clientHeight  -> fill() sticks at 1
//   2. getBoundingClientRect is the BORDER box             -> content eats .mid padding
//   3. abs-positioned decoration inflates scrollWidth      -> collapses ringed frames
//   4. abs-positioned marks are invisible to bounding rects-> overhang unseen
//   5. an unbreakable long word cannot wrap                -> clipped clean off canvas

import {
  C, accent, markSwap, groundFill, textOn, subOn, fontFace, topo,
  wordmark, siteBadge, contactBar, numberedList, chips, kickerBox,
  photoPanel, photoSlot,
} from './brand.mjs';

export const SIZES = {
  feed:   { w: 1080, h: 1350, tall: false },
  square: { w: 1080, h: 1080, tall: false },
  story:  { w: 1080, h: 1920, tall: true  },
  reel:   { w: 1080, h: 1920, tall: true  },
};

// Per-layout headline caps, in px. These were too tight for a long time and were the
// cause of the dead band above the contact bar: the grow loop hit the cap, not the
// fill target. Do not lower them without re-rendering every layout.
export const CAPS = {
  feature:   112,
  method:    130,   // runs full width when the photo panel is dropped
  statement: 134,
  route:     124,
  cover:     210,   // one enormous word — a launch poster, not a body frame
  photo:     110,
};

const NBSP = ' ';

// ── Headline assembly ────────────────────────────────────────────────────────
// The spec authors emphasis inline: `The Friday Scramble <span class="o">Has A Pattern</span>`.
// Exactly ONE mark per frame. This function tokenises so the widow guard and the
// trailing-punctuation fix can operate across span boundaries without mangling markup.
function tokenise(html) {
  const out = [];
  const re = /<span class="(o|hi|ring|ul)">([\s\S]*?)<\/span>/g;
  let last = 0, m;
  while ((m = re.exec(html))) {
    if (m.index > last) out.push({ cls: null, text: html.slice(last, m.index) });
    out.push({ cls: m[1], text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < html.length) out.push({ cls: null, text: html.slice(last) });
  return out;
}

export function buildHeadline(html) {
  const toks = tokenise(html);
  const warn = [];

  // TRAP: a three-word `hi` block forces a widow — `hi` is nowrap so it takes a whole
  // line and orphans the word above it. Keep hi to one or two words.
  for (const t of toks) {
    if (t.cls === 'hi' && t.text.trim().split(/\s+/).length > 2) {
      warn.push(`hi mark is ${t.text.trim().split(/\s+/).length} words ("${t.text.trim()}") — keep hi to one or two`);
    }
  }

  // TRAP: a trailing full stop after a nowrap mark span gets orphaned onto its own
  // line as a lone giant dot. Absorb it into the mark.
  for (let i = 0; i < toks.length - 1; i++) {
    if (toks[i].cls && /^[.,!?:;]/.test(toks[i + 1].text)) {
      toks[i].text += toks[i + 1].text[0];
      toks[i + 1].text = toks[i + 1].text.slice(1);
    }
  }

  // Widow guard: bind the last two words with U+00A0 so a grown headline never drops
  // one short word onto its own line.
  // TRAP: this must join with a REAL nbsp. It spent a week joining with a plain space,
  // i.e. doing nothing at all.
  const flat = toks.map(t => t.text).join('');
  const words = flat.trim().split(/\s+/);
  if (words.length >= 3) {
    // Walk backwards through tokens and replace the LAST space with nbsp.
    for (let i = toks.length - 1; i >= 0; i--) {
      const t = toks[i];
      const idx = t.text.replace(/\s+$/, '').lastIndexOf(' ');
      if (idx > -1) {
        const keep = t.text.replace(/\s+$/, '');
        t.text = keep.slice(0, idx) + NBSP + keep.slice(idx + 1) + t.text.slice(keep.length);
        break;
      }
    }
  }

  const hasRing = toks.some(t => t.cls === 'ring');
  const marks = toks.filter(t => t.cls).length;
  if (marks > 1) warn.push(`${marks} emphasis marks on one frame — the rule is exactly one`);

  const inner = toks.map(t => t.cls ? `<span class="${t.cls}">${t.text}</span>` : t.text).join('');
  return { html: inner, hasRing, warn };
}

// ── CSS ──────────────────────────────────────────────────────────────────────
function css(size, ground, onPhoto) {
  const { w, h, tall } = size;
  const M = 62;
  const padTop  = M + (tall ? 120 : 0);
  const padFoot = M + (tall ? 240 : 0);
  const a = accent(ground);
  const mk = markSwap(ground);
  const tx = textOn(ground);
  const sub = subOn(ground);
  const gapBase = tall ? 38 : 30;

  return `
${fontFace()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px}
body{font-family:'ResQX',system-ui,sans-serif;background:${groundFill(ground)};
  ${(ground === 'cream' || ground === 'orange') && !onPhoto ? `background-image:${topo(w, h, ground)};background-size:cover;` : ''}
  -webkit-font-smoothing:antialiased}
.frame{position:relative;width:${w}px;height:${h}px;overflow:hidden;
  display:flex;flex-direction:column;padding:${padTop}px ${M}px ${padFoot}px}

/* ── furniture ── */
.top{display:flex;align-items:flex-start;justify-content:space-between;flex:0 0 auto}
.wm{display:flex;align-items:center}
.badge{display:flex;align-items:center;gap:12px}
.bdg-i{width:26px;height:26px;border-radius:9999px;flex:0 0 auto}
.bdg-t{display:flex;flex-direction:column;line-height:1.16}
.bdg-t em{font-style:normal;font-size:17px;font-weight:500}
.bdg-t b{font-size:21px;font-weight:700;letter-spacing:-.01em}

.cbar{flex:0 0 auto;display:flex;align-items:center;gap:22px;
  border-radius:9999px;padding:20px 34px;margin-top:auto}
.cgroup{display:flex;flex-direction:column;line-height:1.14}
.cgroup em{font-style:normal;font-size:15px;font-weight:500}
.cgroup b{font-size:22px;font-weight:800;letter-spacing:-.012em;white-space:nowrap}
.cdot{width:7px;height:7px;border-radius:9999px;flex:0 0 auto}
.cstores{display:flex;gap:18px;margin-left:auto}
.store{display:flex;flex-direction:column;line-height:1.14;text-align:right}
.store em{font-style:normal;font-size:13px;font-weight:500}
.store b{font-size:17px;font-weight:700}

/* ── content column ── */
.mid{flex:1 1 auto;display:flex;flex-direction:column;justify-content:flex-start;
  row-gap:${gapBase}px;padding:${tall ? 54 : 44}px 0 ${tall ? 66 : 56}px;min-height:0}
.mid.center{justify-content:center}
.mid.tall{justify-content:center}
.mid.split{flex-direction:row;column-gap:46px;align-items:flex-start}
.col{display:flex;flex-direction:column;row-gap:${gapBase}px;min-width:0;flex:1 1 auto}

h1{font-weight:900;letter-spacing:-.028em;line-height:1.04;color:${tx}}
h1.has-ring{line-height:1.22}   /* a ring ellipse is taller than the line box */
.sub{font-weight:500;font-size:${tall ? 35 : 31}px;line-height:1.34;color:${sub};max-width:22em}

/* ── emphasis marks — exactly one per frame ── */
.o{color:${mk}}
.hi{background:${ground === 'orange' ? C.white : a};
    color:${ground === 'orange' ? a : (ground === 'cream' ? C.white : C.ink)};
    padding:.02em .14em;border-radius:.09em;white-space:nowrap}
.ring{position:relative;white-space:nowrap;display:inline-block;padding:0 .10em}
.ring::after{content:'';position:absolute;inset:-.16em -.10em;border:7px solid ${a};
  border-radius:50%;transform:rotate(-2.2deg);pointer-events:none}
.ul{position:relative;white-space:nowrap;display:inline-block}
.ul::after{content:'';position:absolute;left:0;right:0;bottom:-.035em;height:12px;
  background:${a};border-radius:9999px;transform:rotate(-.6deg)}

/* ── list ── */
.nlist{list-style:none;display:flex;flex-direction:column;row-gap:18px}
.nl{display:flex;align-items:flex-start;gap:20px}
.nl-n{flex:0 0 auto;width:44px;height:44px;border-radius:9999px;display:flex;
  align-items:center;justify-content:center;font-weight:800;font-size:23px}
.nl-tx{font-weight:600;font-size:${tall ? 31 : 30}px;line-height:1.30;padding-top:5px}

.chips{display:flex;flex-wrap:wrap;gap:14px}
.chip{border-radius:9999px;padding:12px 24px;font-weight:700;font-size:23px}
.kicker{border-radius:34px;padding:26px 32px;font-weight:700;font-size:27px;line-height:1.32}

/* ── photo panels ── */
.photos{position:relative;flex:0 0 auto;width:${tall ? 470 : 430}px;height:${tall ? 560 : 500}px}
.pp{position:absolute;border-radius:30px;background:${C.white};padding:8px;
  box-shadow:0 26px 60px rgba(0,0,0,.20)}
.pp-a{width:78%;height:66%;top:0;left:0;z-index:2}
.pp-b{width:74%;height:62%;bottom:0;right:0;z-index:1}
.pp-in{width:100%;height:100%;border-radius:23px;background-size:cover;background-position:center}
.pp-empty{width:78%;height:66%;top:0;left:0;display:flex;align-items:center;justify-content:center;
  background:repeating-linear-gradient(45deg,#e9e4da,#e9e4da 14px,#dfd9cd 14px,#dfd9cd 28px);
  color:${C.muted};font-weight:800;font-size:22px;letter-spacing:.06em}

/* ── full-bleed photo layout ── */
.bleed{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}
.scrim{position:absolute;inset:0;z-index:1;
  background:linear-gradient(180deg,rgba(10,10,28,.30) 0%,rgba(10,10,28,.02) 34%,rgba(10,10,28,.80) 100%)}
.frame>.top,.frame>.mid,.frame>.cbar{position:relative;z-index:2}

/* ── route report ── */
.slab{background:${C.ink};color:${C.white};border-radius:30px;padding:38px 42px;
  display:flex;flex-direction:column;row-gap:16px}
.slab .rr-route{font-weight:800;font-size:29px;color:${C.orange};letter-spacing:.02em}

/* ── cover ── */
.ghost{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  z-index:1;pointer-events:none;overflow:hidden}
.ghost span{font-weight:900;font-size:340px;color:rgba(255,255,255,.16);letter-spacing:-.05em;
  white-space:nowrap;transform-origin:center;line-height:1}
`;
}

// ── Layout bodies ────────────────────────────────────────────────────────────
function midFor(f, size, ground, photoUris) {
  const { html: hl, hasRing, warn } = buildHeadline(f.headline || '');
  const H = `<h1 class="${hasRing ? 'has-ring' : ''}">${hl}</h1>`;
  const S = f.sub ? `<p class="sub">${f.sub}</p>` : '';
  const L = f.list?.length ? numberedList(f.list, ground) : '';
  const K = f.kicker ? kickerBox(f.kicker, ground) : '';
  const P = f.chips?.length ? chips(f.chips, ground) : '';
  const have = (photoUris || []).filter(Boolean);
  const tall = size.tall;

  switch (f.layout) {
    case 'feature': {
      // RULE (6 Sep): a delivered frame is always complete as rendered. With no photo
      // the panel is DROPPED and the type reflows full width — never a slot marker.
      if (!have.length) return { cls: `mid${tall ? ' tall' : ''}`, body: H + S + L + P + K, warn };
      return {
        cls: 'mid split', warn,
        body: `<div class="col">${H}${S}${L}${P}${K}</div>
               <div class="photos">${have.slice(0, 2).map((u, i) => photoPanel(u, i)).join('')}</div>`,
      };
    }
    case 'method': {
      if (!have.length) return { cls: `mid${tall ? ' tall' : ''}`, body: H + S + L + K, warn };
      return {
        cls: 'mid split', warn,
        body: `<div class="col">${H}${S}${L}${K}</div>
               <div class="photos">${photoPanel(have[0], 0)}</div>`,
      };
    }
    case 'statement':
      // Centred at EVERY size. It used to centre only on story canvases and dumped
      // ~400px of dead air under the sub at 1080x1350.
      return { cls: 'mid center', body: H + S + P + K, warn };
    case 'cover':
      return { cls: 'mid center', body: H + S, warn };
    case 'route':
      return {
        cls: `mid${tall ? ' tall' : ''}`, warn,
        body: `<div class="slab">
                 ${f.route ? `<span class="rr-route">${f.route}</span>` : ''}
                 ${H}${S}</div>`,
      };
    case 'photo':
      return { cls: 'mid', body: `<div style="margin-top:auto">${H}${S}</div>`, warn };
    default:
      throw new Error(`unknown layout "${f.layout}" — it must be one of ${Object.keys(CAPS).join(', ')}`);
  }
}

export function buildHTML(frame, sizeName, photoUris) {
  const size = SIZES[sizeName];
  if (!size) throw new Error(`unknown size "${sizeName}"`);
  const ground = frame.ground
    || (frame.layout === 'cover' ? 'orange'
    : (frame.layout === 'photo' || frame.layout === 'route') ? 'night'
    : 'cream');
  const bleed = (frame.layout === 'photo' || frame.layout === 'route') && photoUris?.[0];
  const onPhoto = frame.layout === 'photo';

  const { cls, body, warn } = midFor(frame, size, ground, photoUris);
  const wmOn = onPhoto ? 'dark' : ground;

  const bleedHtml = frame.layout === 'photo'
    ? (bleed
        ? `<div class="bleed" style="background-image:url('${photoUris[0]}')"></div><div class="scrim"></div>`
        : `<div class="bleed" style="background:${C.night}"></div><div class="scrim"></div>`)
    : '';

  const ghost = frame.layout === 'cover' && frame.ghost
    ? `<div class="ghost"><span>${frame.ghost}</span></div>` : '';

  return {
    warn,
    ground,   // the RESOLVED ground — QC's orange-collision checks depend on this
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${css(size, ground, onPhoto)}</style></head>
<body><div class="frame">
  ${bleedHtml}${ghost}
  <div class="top">${wordmark(wmOn, 34)}${siteBadge(onPhoto ? 'night' : ground)}</div>
  <div class="${cls}">${body}</div>
  ${contactBar(ground, onPhoto)}
</div></body></html>`,
  };
}

// ── The fit engine ───────────────────────────────────────────────────────────
// TRAP: this MUST be exported as a real function. Playwright serialises a function
// with toString(); a template-literal STRING is treated as an expression, the argument
// is silently dropped, and every frame renders at its start size with fill=undefined.
export function FIT_FN(opts) {
  const { cap, listCap, gapCap, listGapCap, target, maxLines } = opts;
  const mid = document.querySelector('.mid');
  const hl = mid.querySelector('h1');
  if (!hl) return { fill: 1, size: 0, lines: 0, clipped: false, note: 'no headline' };

  const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0;

  // TRAP 2: getBoundingClientRect returns the BORDER box. Subtract padding or the
  // content will happily eat .mid's padding and collide with the contact bar.
  function avail() {
    return mid.getBoundingClientRect().height - px(mid, 'paddingTop') - px(mid, 'paddingBottom');
  }

  // TRAP 1: mid.scrollHeight never reports below clientHeight, so fill() sticks at 1
  // and the grow loop never runs. Measure the span of the children's bounding boxes,
  // which also picks up the row gaps for free.
  function contentH() {
    const scope = mid.classList.contains('split') ? mid.querySelector('.col') : mid;
    const kids = [...scope.children];
    if (!kids.length) return 0;
    let top = Infinity, bot = -Infinity;
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      if (r.height === 0) continue;
      top = Math.min(top, r.top); bot = Math.max(bot, r.bottom);
    }
    return bot === -Infinity ? 0 : bot - top;
  }

  function lines() {
    const lh = px(hl, 'lineHeight') || px(hl, 'fontSize') * 1.04;
    return Math.max(1, Math.round(hl.getBoundingClientRect().height / lh));
  }

  // TRAPS 3, 4 and 5 all live here.
  function wide() {
    // 5: an unbreakable long word cannot wrap and is clipped off the canvas.
    if (hl.scrollWidth > hl.clientWidth + 1) return true;
    const hr = hl.getBoundingClientRect();
    // 3/4: ring and ul decoration is ::after and absolutely positioned, so it inflates
    // scrollWidth (collapsing every ringed frame to minimum type) while contributing
    // nothing to a bounding rect. Compare the SPAN's rect against the headline's.
    for (const s of hl.querySelectorAll('.o,.hi,.ring,.ul')) {
      if (s.getBoundingClientRect().right > hr.right + 0.5) return true;
    }
    // Blocks wrap normally, so scrollWidth is the right test for them.
    for (const b of mid.querySelectorAll('.nl-tx,.sub,.chip,.kicker')) {
      if (b.scrollWidth > b.clientWidth + 1) return true;
    }
    return false;
  }

  const bad = () => contentH() > avail() || wide() || lines() > maxLines;

  // 1. shrink until it fits
  let size = parseFloat(getComputedStyle(hl).fontSize);
  let guard = 0;
  while (bad() && size > 34 && guard++ < 200) {
    size -= 2; hl.style.fontSize = size + 'px';
  }

  // 2. grow the headline toward the fill target, capped per layout and hard-stopped
  //    at maxLines rendered lines
  guard = 0;
  while (size + 2 <= cap && contentH() / avail() < target && guard++ < 200) {
    size += 2; hl.style.fontSize = size + 'px';
    if (bad()) { size -= 2; hl.style.fontSize = size + 'px'; break; }
  }

  // 3. grow the list items
  const items = [...mid.querySelectorAll('.nl-tx')];
  if (items.length) {
    let ls = parseFloat(getComputedStyle(items[0]).fontSize);
    guard = 0;
    while (ls + 1 <= listCap && contentH() / avail() < target && guard++ < 100) {
      ls += 1; items.forEach(i => i.style.fontSize = ls + 'px');
      if (bad()) { ls -= 1; items.forEach(i => i.style.fontSize = ls + 'px'); break; }
    }
  }

  // 4. grow the gaps LAST to absorb leftover slack. Without this every .mid child has
  //    margin 0 from the reset and the frame renders as one jammed block with a dead
  //    band at the foot. contentH() already includes gaps, so the loop converges.
  const scope = mid.classList.contains('split') ? mid.querySelector('.col') : mid;
  let gap = px(scope, 'rowGap');
  guard = 0;
  while (gap + 2 <= gapCap && contentH() / avail() < target && guard++ < 100) {
    gap += 2; scope.style.rowGap = gap + 'px';
    if (bad()) { gap -= 2; scope.style.rowGap = gap + 'px'; break; }
  }
  const nl = mid.querySelector('.nlist');
  if (nl) {
    let lg = px(nl, 'rowGap'); guard = 0;
    while (lg + 2 <= listGapCap && contentH() / avail() < target && guard++ < 100) {
      lg += 2; nl.style.rowGap = lg + 'px';
      if (bad()) { lg -= 2; nl.style.rowGap = lg + 'px'; break; }
    }
  }

  return {
    fill: +(contentH() / avail()).toFixed(3),
    size, lines: lines(), clipped: wide(),
  };
}
