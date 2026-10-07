import { findPaidSessionByEmail } from '../lib/stripe.js';
import { createAccessToken, ACCESS_COOKIE, ACCESS_TTL_SECONDS } from '../lib/token.js';
import { readBody, redirect, send, cookieHeader, isSecure, siteOrigin } from '../lib/http.js';

// POST /api/restore  (email=...) -> looks up a paid checkout for that email,
// re-issues the access cookie, and sends the reader back into the guide.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const origin = siteOrigin(req);
  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return redirect(res, `${origin}/restore?state=invalid`, 303);
  }

  try {
    const session = await findPaidSessionByEmail(email);
    if (!session) {
      return redirect(res, `${origin}/restore?state=notfound`, 303);
    }
    const token = createAccessToken({ ref: session.id });
    return redirect(res, `${origin}/guide`, 303, {
      'Set-Cookie': cookieHeader(ACCESS_COOKIE, token, { maxAge: ACCESS_TTL_SECONDS, secure: isSecure(req) }),
    });
  } catch (err) {
    console.error('restore error:', err.message);
    return redirect(res, `${origin}/restore?state=error`, 303);
  }
}
