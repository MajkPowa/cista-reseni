'use strict';
/*
 * Čistá řešení — ovládání na telefonu a drobná odezva rozhraní.
 * 1) Hlavička se po odrolování zmenší.
 * 2) Na telefonu je dole stálá lišta „Zavolat / Poptat řešení“.
 * 3) Mobilní nabídka má navíc přímé vytočení telefonu.
 * Vše je doplněk: bez tohoto skriptu web funguje stejně jako dřív.
 */
(() => {
  const root = document.documentElement;
  const siteRoot = new URL('.', document.currentScript.src).href;
  const PHONE = '+420736403795';
  const PHONE_LABEL = '736 403 795';
  const phonePath = 'm7 3 3 5-3 3a15 15 0 0 0 6 6l3-3 5 3c0 4-3 5-6 4A22 22 0 0 1 3 9C2 6 3 3 7 3Z';
  const arrowPath = 'M4 12h15m-6-6 6 6-6 6';

  function icon(path) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    shape.setAttribute('d', path); svg.append(shape);
    return svg;
  }

  // ---------- 1) Zmenšení hlavičky ----------
  let scrolled = null, ticking = false;
  function updateScrollState() {
    ticking = false;
    // Dva prahy brání blikání přesně na hranici.
    const next = scrolled ? scrollY > 24 : scrollY > 90;
    if (next !== scrolled) { scrolled = next; root.classList.toggle('is-scrolled', next); }
    updateActions();
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateScrollState); } }, { passive: true });

  // ---------- 3) Telefon v mobilní nabídce ----------
  const nav = document.getElementById('navigation');
  if (nav && !nav.querySelector('.nav-call')) {
    const call = document.createElement('a');
    call.className = 'nav-call'; call.href = `tel:${PHONE}`;
    const label = document.createElement('span');
    const small = document.createElement('small'); small.textContent = 'Zavolejte nám';
    label.append(small, PHONE_LABEL);
    call.append(label, icon(phonePath));
    nav.append(call);
  }

  // ---------- 2) Spodní lišta ----------
  const form = document.getElementById('poptavka');
  const bar = document.createElement('div');
  bar.className = 'mobile-actions';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Rychlý kontakt');
  const call = document.createElement('a');
  call.className = 'mobile-actions-call'; call.href = `tel:${PHONE}`;
  call.setAttribute('aria-label', `Zavolat ${PHONE_LABEL}`);
  const callText = document.createElement('span'); callText.textContent = 'Zavolat';
  call.append(icon(phonePath), callText);
  const inquiry = document.createElement('a');
  inquiry.className = 'mobile-actions-inquiry';
  // Na podstránce služby nebo realizace vede tlačítko na poptávku se stejným tématem jako hlavní výzva stránky.
  const pageInquiry = document.querySelector('main a.button[href*="#poptavka"]');
  inquiry.href = form ? '#poptavka' : (pageInquiry ? pageInquiry.href : `${siteRoot}index.html#poptavka`);
  inquiry.append('Poptat řešení', icon(arrowPath));
  bar.append(call, inquiry);
  document.body.append(bar);
  document.body.classList.add('has-mobile-actions');

  let formVisible = false, typing = false;
  if (form && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => { formVisible = entries[0].isIntersecting; updateActions(); }, { threshold: 0.12 }).observe(form);
  }
  // Při psaní (klávesnice na displeji) lišta nepřekáží.
  document.addEventListener('focusin', event => { typing = !!event.target.closest('input, textarea, select'); updateActions(); });
  document.addEventListener('focusout', () => { typing = false; updateActions(); });
  const menuButton = document.querySelector('.menu-toggle');
  menuButton?.addEventListener('click', () => requestAnimationFrame(updateActions));

  function updateActions() {
    const menuOpen = menuButton?.getAttribute('aria-expanded') === 'true';
    const dialogOpen = !!document.querySelector('dialog[open]');
    const show = scrollY > 260 && !formVisible && !typing && !menuOpen && !dialogOpen;
    bar.classList.toggle('is-visible', show);
    // Skrytá lišta nesmí zachytit fokus z klávesnice.
    bar.inert = !show;
  }
  document.addEventListener('click', () => requestAnimationFrame(updateActions));
  updateScrollState();
})();
