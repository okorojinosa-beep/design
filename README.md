# ResQ-X post kit

Copy in, finished PNGs out. Layout, type and brand furniture are rendered in code, so
every string on canvas is real text — nothing to proofread, and it works on unattended
runs. Photography drops into slots.

```bash
npm install
node render.mjs specs/post.json out
```

Chromium is expected at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Override with
`RESQX_CHROME=/path/to/chrome`.

---

## Why this repo exists

This kit was rebuilt from scratch **seven times** between 2 and 14 September 2026, roughly
ten minutes a time, and each rebuild independently rediscovered the same bugs. Two separate
runs on 14 September rebuilt it hours apart and both shipped the same orange-on-orange
fault.

`raw.githubusercontent.com` is reachable from the render sandbox. Every image CDN is not.
So this repo is both the kit's durable home **and** the only working way to get photographs
into a scheduled render.

**A fix committed here is permanent. A fix made in a session is lost when the session ends.**

---

## Spec shape

```json
[{
  "slug": "refuel-friday-scramble",
  "size": "feed",
  "frames": [{
    "layout": "feature",
    "ground": "cream",
    "headline": "The Friday Scramble <span class=\"o\">Has A Pattern</span>",
    "sub": "It always starts with a gauge instead of a calendar.",
    "list": ["Tank hits a quarter on Thursday", "Nobody orders until it is urgent"],
    "chips": ["Metered", "Signed for"],
    "kicker": "DM \"DIESEL\" to set a standing order.",
    "photos": ["assets/field-photos/lagos-asaba-01.jpg", null]
  }]
}]
```

`size`: `feed` 1080x1350 · `story` / `reel` 1080x1920 · `square` 1080x1080
`ground`: `cream` (default) · `orange` · `ink` · `night`

### The six layouts — every post is one of them

| layout | use |
|---|---|
| `feature` | headline left, two offset photos right, numbered list under. The workhorse. |
| `statement` | one argument set large. Centred; poster air is correct. |
| `photo` | full bleed, scrim, headline low, white contact pill. For scenes. |
| `method` | numbered steps + one photo + orange kicker box. The save-me format. |
| `route` | Route Report: real driver photo, black caption slab, no other furniture. |
| `cover` | full orange, ghost word behind. **Launches only** — plain month greetings were the two worst posts of 41 measured. |

### Emphasis — exactly one mark per frame, never two

`<span class="o">` colour swap (the default, ~70% of posts) · `hi` block · `ring`
hand-drawn ellipse, best on the verb · `ul` underline swoosh, for the second beat of a
two-part headline. `render.mjs` warns if a frame carries more than one.

---

## Photography

Two sources work, and only two:

1. **A local file** — `assets/field-photos/...`, a chat attachment, a connected folder.
2. **`raw.githubusercontent.com`** — commit the photo to this repo and reference its raw URL
   or its path here.

Everything else is blocked by organisation egress policy with a hard 403 on CONNECT:
unsplash, picsum, wikimedia, Higgsfield's cloudfront, and our own wasabi blog bucket.
`render.mjs` refuses any other host and drops the slot with a warning. **This is settled —
do not re-test it every run.**

Photos are fetched and inlined as data URIs **at build time**. The page context runs with
`offline: true`, so a template that ever tried to fetch at render time fails loudly instead
of shipping a frame with a blank panel.

**Base64-through-context does not work and must not be attempted.** Verified twice under
md5: a 6,836-byte JPEG came back 5,814 bytes. Long random strings cannot be reproduced
verbatim through a model response, and line-wrapping does not fix it.

### A delivered frame is always complete as rendered

With no photo, `feature` and `method` **drop the panel** and reflow the type to full width.
The hatched `PHOTO SLOT` marker is a signal for the agent, never for a delivered asset —
only `route` and `photo` render it, and those two layouts should not be used at all until
real photography exists.

Honest ranking: **real field photography > generated photography > type-led.**

---

## The traps

Every one of these shipped a broken frame at least once. They are commented at the point
of use as well.

### Colour

1. **Any hard-coded brand colour is a bug waiting for an orange frame.** On a `ground:"orange"`
   frame, orange devices vanish. This shipped twice — the wordmark on 6 Sep, and an emphasis
   mark on 14 Sep that deleted a word from a headline. Everything orange goes through
   `accent(ground)`.
2. **`accent()` is not enough for the `o` mark.** `o` is a colour *swap*, not a drawn shape.
   On an orange ground `accent()` returns ink — the same ink as the headline text — so the
   marked word looks identical to every other word. Swaps go through `markSwap(ground)`.
   Shapes (`ring`, `ul`, `hi`) contrast on their own.
3. After any change to `brand.mjs`, render `specs/smoke-orange.json` and **look at it**.

### Fit — five distinct overflow traps

4. **`mid.scrollHeight` never reports below `clientHeight`**, so `fill()` sticks at 1 and the
   grow loop never runs. Measure the span of the children's bounding boxes instead — which
   picks up the row gaps for free.
5. **`getBoundingClientRect()` is the border box.** Subtract padding, or content eats `.mid`'s
   padding and the kicker collides with the contact bar into one merged mass.
6. **Absolutely-positioned decoration inflates `scrollWidth`.** The naive test
   `el.scrollWidth > el.clientWidth` collapses every ringed frame to minimum type. For marks,
   compare `span.getBoundingClientRect().right` against the headline's right edge.
7. **Absolutely-positioned marks are invisible to bounding rects**, so `ring` and `ul` overhang
   cannot be measured at all. Keep ring marks off the first word of a line, or accept about
   .16em of overhang into the margin.
8. **An unbreakable long word cannot wrap** and is clipped clean off the canvas at a grown
   size ("windscreen?"). Test `hl.scrollWidth > hl.clientWidth + 1` on the headline block.

### Type

9. **`FIT_FN` must be a real exported function.** Playwright serialises a function with
   `toString()`; a template-literal **string** is treated as an expression, the argument is
   silently dropped, and every frame renders unfitted with `fill=undefined`.
10. **The widow guard must join with a real U+00A0.** It spent a week joining with a plain
    space, i.e. doing nothing. When it works, any code that then searches the text for a
    phrase must normalise the nbsp back — that silently disabled emphasis marks once.
11. **Grow the gaps last.** Every `.mid` child has margin 0 from the reset; without gap
    growth the frame renders as one jammed block with a dead band at the foot.
12. **A ring is taller than its line box** and cuts through the line above at leading 1.04.
    `h1.has-ring` uses 1.22, applied automatically.
13. **Keep `hi` to one or two words.** It is nowrap, so a three-word `hi` takes a whole line
    and orphans the word above it. `render.mjs` warns.
14. **A trailing full stop after a nowrap mark** gets orphaned onto its own line as a lone
    giant dot. Absorbed into the mark automatically.

### Fill figures to expect

`feature` and `method` .94–.99 · `statement` .50–.75 · `cover` ~.55.
**Statement air is correct by nature** — a headline plus one sub cannot fill 1350px without
absurd type, and `.mid` is centred so the space splits top and bottom. Do not chase it.

### QC

The fit report reports fill, size, lines and clipping. **It cannot see a colour collision or
a missing mark.** Cheapest method that still catches them:

```bash
montage out/*.png -tile 4x3 -geometry 380x475 out/_sheet.png
```

Read the contact sheet for layout, trust the `PROOF AGAINST THIS` block for text (it is real
text, no OCR risk), and reserve full-size reads for frames the sheet flags.

---

## Type and logo

The real face is **General Sans** (Fontshare), which is what resqx.ng serves. Fontshare is
unreachable from the sandbox, so the kit ships **Figtree** from npm — the closest free match
on proportion, the double-storey `a` and the open `S`. Drop
`assets/fonts/general-sans-variable.woff2` into this repo and `brand.mjs` picks it up with
no code change.

### The logo is the real vector, and it goes on everything

`brand.mjs` carries the actual ResQ-X mark as `LOGO_SVG`, and the same bytes sit at
`assets/brand/logo.svg` for humans. It is **inlined in code on purpose** — `hf-render.sh`
curls a fixed list of code files and `assets/` is not among them, so a file read would
quietly fall back to a lookalike on every unattended run. A logo that is only sometimes the
real one is worse than one that never is.

Two path groups, two colours, both swapped by the ground:

| ground | RESQ | X |
|---|---|---|
| cream | orange | ink |
| dark / night / ink | white | orange |
| orange | white | ink |

Set at **1.15em**, which lands it level with the two-line site badge. `.9em` — the naive
cap-height match — reads visibly light; `1.3em` crowds. **The three speed streaks are part
of the X glyph.** Never add streak elements beside it; the old reconstruction did, and the
trails had to descend or they read as an equals sign.

**Every ResQ-X visual carries this mark** — kit frames, Higgsfield output, ad creative,
thumbnails, covers. `stamp.mjs` is the command for anything that is not a frame:

```
node stamp.mjs <image-url-or-path> out.png [--size auto|feed|story|reel|square] [--bar] [--no-badge]
```

`--size auto` (the default) keeps the image's own shape, so a 1:1 generation stays square
and a 9:16 stays 9:16. The mark is always set on the `dark` pair over a scrim, because a
photograph's local brightness is unknowable and white-on-scrim is the one combination that
survives both a bright sky and a night expressway.

**Higgsfield is never asked to draw the logo.** A generative model mangles lettering, which
is why every prompt ends "No text, no lettering, no logos, no watermark". The photograph is
generated; the mark is composited in code. A logo inside a generated image means that image
is wrong — regenerate it, do not retouch it.

`₦` (U+20A6) is in Figtree and renders correctly at weight 800. No fallback needed.

---

## Brand tokens

`#FF8500` orange — THE brand colour, not amber, not gold (50 hits across 147 posts, more
than all other colours combined) · `#FDF8EE` cream · `#1C1814` night · `#0A0A1C` ink ·
`#1B1B1B` headings · `#474747` body · `#777777` muted.

`#FF613E` coral and `#995000` rust exist on the account but are **never** headline colours.
`#262422` Fleet Dark and `#006000` Fleet Green are Fleet OS product surfaces only — never on
a Rescue or Refuel post.

Three fixed pieces of furniture on every frame: wordmark top-left, `www.resqx.ng` badge
top-right, contact bar at the foot. Pill radius 9999px on every button, chip, numeral and
the contact bar is the second most recognisable device after the orange.
