'use strict';
(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealTargets = [...document.querySelectorAll('[data-reveal]')];
  let revealObserver;
  if ('IntersectionObserver' in window && !motion.matches) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealTargets.forEach(element => revealObserver.observe(element));
  }
  motion.addEventListener('change', () => {
    if (motion.matches) {
      revealObserver?.disconnect();
      revealTargets.forEach(element => element.classList.remove('is-revealed'));
    }
  });

  // Native disclosures keep the complete original article available without JS.
  document.querySelectorAll('[data-gallery-expand]').forEach(button => {
    const target = document.getElementById(button.getAttribute('aria-controls'));
    if (!target) return;
    target.hidden = button.getAttribute('aria-expanded') !== 'true';
    button.hidden = false;
    const label = button.querySelector('[data-expand-label]') || button;
    const collapsed = button.dataset.collapsedLabel || label.textContent.trim();
    const expanded = button.dataset.expandedLabel || 'Sbalit galerii';
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      target.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      label.textContent = open ? expanded : collapsed;
    });
  });
  document.querySelectorAll('[data-accordion-toggle]').forEach(button => {
    const target = document.getElementById(button.getAttribute('aria-controls'));
    if (!target) return;
    button.addEventListener('click', () => {
      const details = [...target.querySelectorAll('details')];
      const expand = details.some(detail => !detail.open);
      details.forEach(detail => { detail.open = expand; });
      button.textContent = expand ? 'Sbalit všechny části' : 'Rozbalit všechny části';
      button.setAttribute('aria-expanded', String(expand));
    });
  });

  const progress = document.querySelector('.reading-progress');
  const sectionLinks = [...document.querySelectorAll('.detail-nav a[href^="#"]')];
  const sections = sectionLinks.map(link => ({ link, section: document.getElementById(link.hash.slice(1)) })).filter(item => item.section);
  let scrollFrame = 0;
  function updateReading() {
    scrollFrame = 0;
    if (progress) {
      const extent = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const fraction = Math.max(0, Math.min(1, window.scrollY / extent));
      progress.style.scale = `${fraction} 1`;
    }
    let current = sections[0];
    const stickyOffset = (document.querySelector('.header')?.getBoundingClientRect().height || 90) + 100;
    sections.forEach(item => { if (item.section.getBoundingClientRect().top <= stickyOffset) current = item; });
    sections.forEach(item => {
      const active = item === current;
      item.link.classList.toggle('is-active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
  }
  if (progress || sections.length) {
    const queueReading = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateReading); };
    window.addEventListener('scroll', queueReading, { passive: true });
    window.addEventListener('resize', queueReading);
    document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', queueReading));
    document.querySelectorAll('[data-gallery-expand]').forEach(button => button.addEventListener('click', queueReading));
    updateReading();
  }

  const documents = [...document.querySelectorAll('[data-document-card]')];
  if (documents.length) {
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const search = document.getElementById('document-search');
    const filters = [...document.querySelectorAll('[data-document-filter]')];
    let category = 'all';
    const apply = () => {
      const query = normalize(search?.value.trim() || '');
      let count = 0;
      documents.forEach(card => {
        const show = (category === 'all' || card.dataset.category === category) && normalize(card.dataset.search).includes(query);
        card.hidden = !show;
        if (show) count++;
      });
      document.getElementById('document-count').textContent = `Zobrazeno ${count} z ${documents.length} dokumentů`;
      document.getElementById('document-empty').hidden = count > 0;
    };
    search?.addEventListener('input', apply);
    filters.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.documentFilter;
      filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      apply();
    }));
    apply();
  }

  document.querySelectorAll('[data-copy-text]').forEach(button => {
    button.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(button.dataset.copyText);
        if (status) status.textContent = button.dataset.copyLabel || 'Zkopírováno';
      } catch {
        if (status) {
          status.classList.remove('sr-only');
          status.textContent = `Automatické kopírování není dostupné. Text můžete označit a zkopírovat: ${button.dataset.copyText}`;
        }
      }
    });
  });
})();
