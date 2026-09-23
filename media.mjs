// ResQ-X post kit — turning a photo reference into a data URI.
//
// Shared by render.mjs (frames) and stamp.mjs (marking a bare image). It lives in its
// own file so the host allow-list is defined ONCE. Two copies of this list is how a
// run ends up working in one tool and silently dropping every photo in the other.
//
// Photos are resolved to data URIs HERE, at build time, never fetched by the page.
// The render context runs with offline:true so a template that tried to fetch anything
// would fail loudly rather than silently render a blank panel.
//
// Two sources work:
//   • a local file path (chat attachment, connected folder, anything on disk)
//   • an https URL on an allowed host
//
// Every image CDN is blocked by organisation egress policy (hard 403 on CONNECT) from
// the Claude sandbox: unsplash, picsum, wikimedia, cloudfront, our own wasabi bucket.
// Do not re-test this and do not add another host here without checking it first.
// Default: only GitHub raw, which is all the Claude sandbox can reach. The Higgsfield
// sandbox can also reach Higgsfield's own CDN, so a run there widens this via
// RESQX_ALLOW_HOSTS (comma-separated). Widening it in the Claude sandbox does nothing
// except turn a fast, clear failure into a slow one.

import fs from 'node:fs';
import path from 'node:path';

export const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

export const ALLOWED_HOSTS = new Set([
  'raw.githubusercontent.com',
  ...(process.env.RESQX_ALLOW_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean),
]);

export async function resolvePhoto(ref, baseDir) {
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
