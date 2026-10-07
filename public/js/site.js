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
    else if (q.get('error')) msg = 'Something went wrong starting checkout. Please try again.';
    if (msg) {
      notice.textContent = msg;
      notice.hidden = false;
      document.getElementById('pricing')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  }
})();
