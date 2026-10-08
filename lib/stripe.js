// Minimal Stripe REST client using fetch, so the project has zero npm
// dependencies. Only the handful of endpoints we need are wrapped.

const API = 'https://api.stripe.com/v1';

export const PRICE_CENTS = 3000; // $30.00
export const PRODUCT_NAME = 'The Amari Fitness Blueprint';

function key() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error('STRIPE_SECRET_KEY is not set.');
  return k;
}

// Encodes nested objects/arrays as Stripe's bracketed form fields, e.g.
// line_items[0][price_data][currency]=usd
export function encodeForm(obj, prefix = '', params = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object') encodeForm(item, `${name}[${i}]`, params);
        else params.append(`${name}[${i}]`, String(item));
      });
    } else if (typeof v === 'object') {
      encodeForm(v, name, params);
    } else {
      params.append(name, String(v));
    }
  }
  return params;
}

async function request(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body: body ? encodeForm(body).toString() : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function createCheckoutSession({ successUrl, cancelUrl }) {
  const lineItem = process.env.STRIPE_PRICE_ID
    ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_CENTS,
          product_data: {
            name: PRODUCT_NAME,
            description: 'Lifetime access to the full guide: splits, diet structures, mindset, supplements, and what I wish I knew.',
          },
        },
      };

  return request('POST', '/checkout/sessions', {
    mode: 'payment',
    line_items: [lineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: 'true',
    billing_address_collection: 'auto',
  });
}

export function retrieveCheckoutSession(id) {
  return request('GET', `/checkout/sessions/${encodeURIComponent(id)}`);
}

export async function findPaidSessionByEmail(email) {
  const params = encodeForm({ customer_details: { email }, status: 'complete', limit: 20 });
  const data = await request('GET', `/checkout/sessions?${params.toString()}`);
  return (data.data || []).find((s) => s.payment_status === 'paid' || s.payment_status === 'no_payment_required') || null;
}
