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
    const m = err.message || '';
    let code = 'checkout';
    if (/is not set/.test(m)) code = 'not-configured';
    else if (/publishable key/.test(m)) code = 'pk-key';
    else if (/Invalid API Key|No such API key|api_key_expired/i.test(m)) code = 'bad-key';
    else if (/live charges|activate your account|not activated/i.test(m)) code = 'not-activated';
    else if (/No such price/i.test(m)) code = 'bad-price';
    return redirect(res, `${origin}/#pricing?error=${code}`, 303);
  }
}
