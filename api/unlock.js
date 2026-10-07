import { retrieveCheckoutSession } from '../lib/stripe.js';
import { createAccessToken, ACCESS_COOKIE, ACCESS_TTL_SECONDS } from '../lib/token.js';
import { getQuery, redirect, cookieHeader, isSecure, siteOrigin } from '../lib/http.js';

// GET /api/unlock?session_id=cs_...   -> verifies the Stripe session was paid
// GET /api/unlock?preview=<secret>    -> owner preview without paying
// On success it sets a signed, HttpOnly access cookie and redirects to /guide.
export default async function handler(req, res) {
  const origin = siteOrigin(req);
  const { session_id: sessionId, preview } = getQuery(req);

  let ref = null;

  if (preview) {
    const expected = process.env.GUIDE_PREVIEW_SECRET;
    if (!expected || preview !== expected) {
      return redirect(res, `${origin}/success?state=invalid`, 303);
    }
    ref = 'preview';
  } else if (sessionId) {
    try {
      const session = await retrieveCheckoutSession(sessionId);
      if (session.payment_status !== 'paid') {
        return redirect(res, `${origin}/success?state=unpaid`, 303);
      }
      ref = session.id;
    } catch (err) {
      console.error('unlock error:', err.message);
      return redirect(res, `${origin}/success?state=invalid`, 303);
    }
  } else {
    return redirect(res, `${origin}/success?state=missing`, 303);
  }

  let token;
  try {
    token = createAccessToken({ ref });
  } catch (err) {
    console.error('unlock error:', err.message);
    return redirect(res, `${origin}/success?state=server`, 303);
  }

  return redirect(res, `${origin}/guide`, 303, {
    'Set-Cookie': cookieHeader(ACCESS_COOKIE, token, { maxAge: ACCESS_TTL_SECONDS, secure: isSecure(req) }),
  });
}
