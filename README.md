# The Amari Fitness Blueprint

Landing page and paywalled guide for Amari's $30 fitness blueprint.
No framework, no npm dependencies. Static front end plus four small
serverless functions that handle Stripe checkout and gate the guide.

## How the paywall works

1. Every "Get the blueprint" button posts to `/api/checkout`, which creates a
   Stripe Checkout session for $30 and sends the buyer to Stripe.
2. Stripe returns them to `/success?session_id=...`, which calls `/api/unlock`.
3. `/api/unlock` asks Stripe whether that session is paid. If it is, it sets a
   signed, HttpOnly cookie (valid for one year) and redirects to `/guide`.
4. `/guide` is rewritten to `/api/guide`, which only serves `private/guide.html`
   when that cookie is valid. The guide never exists as a public file.
5. `/restore` lets a buyer re-open the guide on another device by entering the
   email they used at checkout.

## Project layout

```
api/            serverless functions (checkout, unlock, restore, guide)
lib/            shared helpers (http, signed tokens, Stripe REST client)
private/        guide.html — the paid content, never served statically
public/         the public site (index, success, restore, css, js, assets)
scripts/        local dev server that mimics Vercel routing
vercel.json     rewrites /guide -> /api/guide and bundles private/ with it
```

## Before you deploy

**Add the before photo.** Put it at `public/assets/amaribefore.jpeg`.
The hero shows a labelled placeholder until it's there.

**Create a Stripe account** at stripe.com and copy your secret key
(`sk_test_...` to test, `sk_live_...` to sell for real).

## Deploy to Vercel

1. Push this repo to GitHub and import it at vercel.com/new.
   Framework preset: **Other**. Leave build settings blank.
2. In the project's **Settings → Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | your Stripe secret key |
   | `ACCESS_TOKEN_SECRET` | a long random string (see below) |
   | `GUIDE_PREVIEW_SECRET` | optional: any secret word, lets you open the guide without paying |
   | `STRIPE_PRICE_ID` | optional: a Stripe Price ID if you'd rather manage the product in Stripe |
   | `SITE_URL` | optional: your public URL, e.g. `https://amarifitness.com` |

   Generate the access secret with:

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Deploy. Test a purchase with Stripe's test card `4242 4242 4242 4242`
   while using the `sk_test_` key, then switch to the live key.

To preview the guide yourself without paying, visit
`https://your-site.com/api/unlock?preview=YOUR_GUIDE_PREVIEW_SECRET`.

## Run locally

```
cp .env.example .env     # fill in at least ACCESS_TOKEN_SECRET and GUIDE_PREVIEW_SECRET
npm run dev              # http://localhost:3000
```

Without a Stripe key the checkout buttons show a "not connected yet" notice
instead of crashing. Use the preview link above to read the guide locally.

## The intro

First-time visitors see a five-second intro (Begin button, then four beats with
click sounds, then the page wipes in). It runs once per browser session, is
skipped for people who prefer reduced motion, and has a Skip button. The sound
is synthesized in the browser, so there are no audio files to host. Browsers
only allow audio after a tap, which is why it starts from the Begin button.
Everything lives in `public/js/intro.js` and the intro section of
`public/css/landing.css`.

## Editing content

- Landing page copy: `public/index.html`
- Guide chapters: `private/guide.html` (each chapter is an `<article class="chapter">`)
- Colours, fonts and glass styling: `public/css/site.css`
- Price: `PRICE_CENTS` in `lib/stripe.js` and the `$30` copy in `public/index.html`

## Notes

- The restore-by-email flow trusts that whoever knows a buyer's checkout email
  is the buyer. That's a reasonable trade-off for a $30 guide; swap in emailed
  magic links later if it ever becomes a problem.
- The guide is served with `no-store` and `noindex` headers so it isn't cached
  or indexed, but anyone who has paid can of course save the page. That's true
  of any digital product.
