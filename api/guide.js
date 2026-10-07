import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyAccessToken, ACCESS_COOKIE } from '../lib/token.js';
import { parseCookies, redirect, send, siteOrigin } from '../lib/http.js';

// GET /guide (rewritten to /api/guide) -> serves the private guide only when
// the request carries a valid, signed access cookie.
const here = path.dirname(fileURLToPath(import.meta.url));
const GUIDE_PATH = path.join(here, '..', 'private', 'guide.html');

let cached = null;

async function loadGuide() {
  if (cached && process.env.NODE_ENV === 'production') return cached;
  cached = await readFile(GUIDE_PATH, 'utf8');
  return cached;
}

export default async function handler(req, res) {
  const origin = siteOrigin(req);
  const cookies = parseCookies(req);
  const access = verifyAccessToken(cookies[ACCESS_COOKIE]);

  if (!access) {
    return redirect(res, `${origin}/#pricing?locked=1`, 303);
  }

  try {
    const html = await loadGuide();
    return send(res, 200, html, {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    });
  } catch (err) {
    console.error('guide error:', err.message);
    return send(res, 500, '<h1>Guide temporarily unavailable</h1>');
  }
}
