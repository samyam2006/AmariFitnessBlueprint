/* Shared interactions: reveal on scroll, counters, glass spotlight, notices. */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal on scroll
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // Count-up numbers
  const counters = document.querySelectorAll('.count[data-count]');
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    const start = Number(el.textContent) || 0;
    if (reduce) { el.textContent = target; return; }
    const duration = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduce) {
    const io2 = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { runCounter(e.target); io2.unobserve(e.target); }
      }
    }, { threshold: 0.5 });
    counters.forEach((el) => io2.observe(el));
  } else {
    counters.forEach(runCounter);
  }

  // Glass spotlight follows the cursor
  document.querySelectorAll('.glass.spot').forEach((card) => {
    card.addEventListener('pointermove', (ev) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${ev.clientX - r.left}px`);
      card.style.setProperty('--my', `${ev.clientY - r.top}px`);
    });
  });

  // Split finder
  const finder = document.getElementById('finder-result');
  if (finder) {
    const picks = {
      2: ['Full body, 2× a week', 'Every session has a squat, a hinge, a push and a pull. You still hit everything twice.'],
      3: ['Full body, 3× a week', 'The fastest way to get strong on the core lifts when you\'re short on days.'],
      4: ['Upper / Lower repeat', 'Clean two-a-week frequency with lots of recovery, so the big lifts keep climbing.'],
      5: ['PPL × Upper / Lower', 'The one I\'d hand most people. Focused push, pull and leg days, then everything a second time.'],
      6: ['PPL × Arnold', 'Six days, two angles on every muscle. Only if recovery and food are handled.'],
    };
    document.querySelectorAll('.days button').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.days button').forEach((x) => x.classList.toggle('on', x === b));
        const [name, why] = picks[b.dataset.days];
        finder.classList.remove('swap');
        void finder.offsetWidth;
        finder.innerHTML = `<span class="mono">Your split</span><p class="serif">${name}</p><span class="why">${why} The full week layout is in Chapter 01.</span>`;
        finder.classList.add('swap');
      });
    });
  }

  // Sticky buy bar on phones, after the hero scrolls away
  const buybar = document.getElementById('buybar');
  const hero = document.querySelector('.hero');
  const pricing = document.getElementById('pricing');
  if (buybar && hero && 'IntersectionObserver' in window) {
    let heroVisible = true, pricingVisible = false;
    const update = () => {
      const show = !heroVisible && !pricingVisible;
      buybar.classList.toggle('show', show);
      buybar.setAttribute('aria-hidden', String(!show));
    };
    new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(hero);
    if (pricing) new IntersectionObserver((e) => { pricingVisible = e[0].isIntersecting; update(); }, { threshold: 0.2 }).observe(pricing);
  }

  // Year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Checkout notices from redirects (/#pricing?error=... or ?locked=1)
  const notice = document.getElementById('checkout-notice');
  if (notice) {
    const hash = window.location.hash || '';
    const q = hash.includes('?') ? new URLSearchParams(hash.slice(hash.indexOf('?') + 1)) : new URLSearchParams(window.location.search);
    let msg = '';
    if (q.get('locked')) msg = 'The guide is for buyers only. Grab it below and you\'ll be reading in under a minute.';
    else if (q.get('error') === 'not-configured') msg = 'Checkout isn\'t connected yet. Add your Stripe keys to turn it on.';
    else if (q.get('error') === 'pk-key') msg = 'Setup issue: the Stripe key in Vercel is the publishable key (pk_...). It needs the secret key (sk_...).';
    else if (q.get('error') === 'bad-key') msg = 'Setup issue: Stripe rejected the key. Check for a typo or missing characters, then redeploy.';
    else if (q.get('error') === 'not-activated') msg = 'Setup issue: this Stripe account isn\'t activated for live payments yet. Finish activation in the Stripe dashboard.';
    else if (q.get('error') === 'bad-price') msg = 'Setup issue: the STRIPE_PRICE_ID in Vercel doesn\'t exist in this Stripe account.';
    else if (q.get('error')) msg = 'Something went wrong starting checkout. Please try again.';
    if (msg) {
      notice.textContent = msg;
      notice.hidden = false;
      document.getElementById('pricing')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  }
})();
