'use strict';
(() => {
  // Progressive enhancement: nothing is hidden while a script, image or observer loads.
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Map();
  const seen = new WeakSet();
  const candidates = new Set();
  const collect = selector => document.querySelectorAll(selector).forEach(element => candidates.add(element));
  collect('.header .brand, .header .site-nav > *, .header .menu-toggle');
  collect('.hero-copy > *, .hero-visual, .editorial-heading .breadcrumbs, .editorial-title > *, .detail-breadcrumbs, .detail-hero-copy > *, .detail-main-visual, .ext-breadcrumbs, .ext-hero-copy > *, .ext-hero-figure');
  collect('.solutions-hero > .breadcrumbs, .business-route-strip, .explorer-intro > *, .system-tabs');
  collect('[data-reveal], .section-heading, .section-caption, .home-audience-heading, .home-audience-grid > *, .assurance > *, .solution-grid, .project-grid > *, .process-grid > *, .about-image, .about-copy, .story-copy, .water-illustration, .contact-copy, .form-card');
  collect('.project-card, .media-item, .document-card, .gallery-mosaic > *, .about-story-image, .about-principles, .about-details > *, .partner-deck > *, .contact-channels > *, .address-card, .intent-grid > *, .detail-benefits > *, .detail-related-card, .footer-top, .footer-links');
  // Cover sections without bespoke hooks, including newly generated content pages.
  document.querySelectorAll('main section').forEach(section => {
    if (![...candidates].some(element => section === element || section.contains(element))) candidates.add(section);
  });
  // A child and its container must never move twice. Sticky section navigation stays still.
  const targets = [...candidates].filter(element => !element.matches('.detail-nav, .ext-subnav') &&
    ![...candidates].some(child => child !== element && element.contains(child)));
  const visible = element => !element.closest('[hidden], dialog:not([open]), details:not([open]) .nav-dropdown') && element.getClientRects().length > 0;
  const inViewport = element => {
    const rect = element.getBoundingClientRect();
    return visible(element) && rect.bottom > 0 && rect.top < innerHeight;
  };
  const syncPreference = () => { document.documentElement.dataset.motionPreference = preference.matches ? 'reduced' : 'full'; };
  syncPreference();

  function enter(element, delay = 0) {
    if (seen.has(element) || !visible(element)) return;
    seen.add(element);
    const reduced = preference.matches;
    const duration = reduced ? 140 : 620;
    const wait = reduced ? 0 : Math.min(delay, 280);
    element.style.setProperty('--entrance-delay', `${wait}ms`);
    element.style.setProperty('--entrance-duration', `${duration}ms`);
    if (element.getBoundingClientRect().height > innerHeight * 1.2) element.classList.add('motion-large');
    element.classList.add('motion-enter');
    let timer;
    const finish = () => {
      clearTimeout(timer);
      element.removeEventListener('animationend', onEnd);
      element.classList.remove('motion-enter', 'motion-large');
      element.style.removeProperty('--entrance-delay');
      element.style.removeProperty('--entrance-duration');
      running.delete(element);
    };
    const onEnd = event => { if (event.target === element && event.animationName.startsWith('site-')) finish(); };
    running.set(element, finish);
    element.addEventListener('animationend', onEnd);
    // Cleanup also works with unsupported CSS, interrupted animations and hidden tabs.
    timer = setTimeout(finish, wait + duration + 80);
  }
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting || !visible(entry.target)) return;
        enter(entry.target, order++ * 55);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06 });
  }
  let order = 0, headerOrder = 0;
  targets.forEach(element => {
    if (inViewport(element)) enter(element, (element.closest('.header') ? headerOrder++ : order++) * 55);
    else observer?.observe(element);
  });
  // Focus and clicks always take priority over a decorative entrance.
  const settleInteraction = event => {
    [...running].forEach(([element, finish]) => { if (element.contains(event.target)) finish(); });
  };
  document.addEventListener('focusin', settleInteraction);
  document.addEventListener('pointerdown', settleInteraction, { passive: true });
  preference.addEventListener('change', () => {
    [...running.values()].forEach(finish => finish());
    syncPreference();
  });
  window.addEventListener('pagehide', () => {
    [...running.values()].forEach(finish => finish());
    observer?.disconnect();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) targets.filter(element => !seen.has(element)).forEach(element => observer?.observe(element));
  });
})();
