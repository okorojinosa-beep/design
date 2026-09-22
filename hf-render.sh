#!/usr/bin/env bash
# ResQ-X post kit — render inside the Higgsfield sandbox.
#
#   bash hf-render.sh <spec-url-or-path> [outdir]
#
# WHY THIS EXISTS
# The Claude sandbox can only reach raw.githubusercontent.com. Every image CDN —
# Higgsfield's included — is refused at the gateway, so generated photography can
# never reach the renderer there. The Higgsfield sandbox reaches BOTH the kit repo
# and Higgsfield's own CDN, so the render happens here instead. Nothing crosses a
# blocked boundary because nothing needs to.
#
# Photos in the spec are referenced by their Higgsfield result URL directly.
set -euo pipefail

SPEC="${1:?usage: hf-render.sh <spec-url-or-path> [outdir]}"
OUT="${2:-out}"
REPO="${RESQX_REPO:-https://raw.githubusercontent.com/okorojinosa-beep/design/main}"
WORK="${RESQX_WORK:-$HOME/kit}"

# Resolve a local spec path to absolute BEFORE changing directory — otherwise a relative
# path is resolved against $WORK and a spec written anywhere else is simply not found.
case "$SPEC" in
  http*|/*) ;;
  *) SPEC="$(cd "$(dirname "$SPEC")" && pwd)/$(basename "$SPEC")" ;;
esac

mkdir -p "$WORK/specs"
cd "$WORK"

echo "== kit =="
for f in brand.mjs templates.mjs render.mjs qc.mjs; do
  curl -fsS -o "$f" "$REPO/$f"
  printf '  %-16s %s bytes\n' "$f" "$(stat -c%s "$f")"
done

if [ ! -d node_modules ]; then
  echo "== deps =="
  npm i --silent playwright-core @fontsource-variable/figtree >/dev/null 2>&1
fi

# Playwright ships a pinned Chromium; take whichever build is actually present
# rather than the version playwright-core expects, which drifts.
CH="$(ls -d /ms-playwright/chromium-*/chrome-linux64/chrome 2>/dev/null | head -1)"
[ -n "$CH" ] || CH="$(ls -d /ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)"
[ -n "$CH" ] || { echo "no chromium found under /ms-playwright"; exit 1; }
echo "== chromium: $CH =="

case "$SPEC" in
  http*) curl -fsS -o specs/run.json "$SPEC"; SPECFILE=specs/run.json ;;
  *)     SPECFILE="$SPEC" ;;
esac

echo "== render =="
RESQX_CHROME="$CH" \
RESQX_ALLOW_HOSTS="${RESQX_ALLOW_HOSTS:-d8j0ntlcm91z4.cloudfront.net,d2ol7oe51mr4n9.cloudfront.net}" \
  node render.mjs "$SPECFILE" "$OUT"

echo
echo "== QC =="
# Nobody looks at these frames on an unattended run. qc.mjs is what stands in for
# the eye, and it exits non-zero rather than let a broken pack ship.
node qc.mjs "$OUT"

echo
echo "== files =="
ls -1 "$OUT"/*.png | while read -r f; do printf '  %-46s %s bytes\n' "$(basename "$f")" "$(stat -c%s "$f")"; done

# PACKAGING. Delivery is one presigned upload, not one per frame: a twelve-frame pack
# means twelve ~2.5KB signed URLs have to be carried into this sandbox, which is both
# expensive and easy to get wrong. Zip once, upload once.
# The contact sheet is the cheap visual check when a human IS around to look.
echo
echo "== pack =="
cd "$OUT"
rm -f pack.zip contact-sheet.jpg
zip -qj pack.zip ./*.png _report.json
COUNT=$(ls -1 ./*.png | wc -l)
TILE=$(( (COUNT + 2) / 3 )); [ "$TILE" -lt 1 ] && TILE=1
# Thumbnail FIRST, then montage the thumbnails. ImageMagick here is capped at 256MiB and
# montaging a dozen full 1080x1350 PNGs in one pass aborts when Chromium still holds
# memory from the render. Two cheap passes never do.
rm -rf .thumbs && mkdir -p .thumbs
for p in ./*.png; do convert "$p" -thumbnail 300x375 ".thumbs/$(basename "$p")" 2>/dev/null || true; done
montage .thumbs/*.png -tile "${TILE}x3" -geometry +6+6 -background '#8a8a8a' -quality 78 contact-sheet.jpg 2>/dev/null || true
rm -rf .thumbs
printf '  %-46s %s bytes\n' pack.zip "$(stat -c%s pack.zip)"
[ -f contact-sheet.jpg ] && printf '  %-46s %s bytes\n' contact-sheet.jpg "$(stat -c%s contact-sheet.jpg)"
echo
echo "Upload these two with media_upload, PUT them from this sandbox, then media_confirm."
