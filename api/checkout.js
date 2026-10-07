import { createCheckoutSession } from '../lib/stripe.js';
import { redirect, send, siteOrigin } from '../lib/http.js';

// POST /api/checkout  -> creates a Stripe Checkout session and sends the
// buyer to Stripe's hosted payment page.
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
  }

  const origin = siteOrigin(req);

  try {
    const session = await createCheckoutSession({
      successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/#pricing`,
    });
    return redirect(res, session.url, 303);
  } catch (err) {
    console.error('checkout error:', err.message);
    const notConfigured = /STRIPE_SECRET_KEY/.test(err.message);
    return redirect(res, `${origin}/#pricing?error=${notConfigured ? 'not-configured' : 'checkout'}`, 303);
  }
}
