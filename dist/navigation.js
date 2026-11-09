'use strict';
(() => {
  const header = document.querySelector('.header');
  const button = header?.querySelector('.menu-toggle');
  const nav = document.getElementById('navigation');
  if (!header || !button || !nav) return;
  const groups = [...nav.querySelectorAll('.nav-group')];
  const desktop = matchMedia('(min-width: 1241px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  header.classList.add('navigation-ready');

  function closeMenu(returnFocus = false) {
    const wasOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Otevřít nabídku');
    nav.classList.remove('is-open');
    groups.forEach(group => { group.open = false; });
    if (returnFocus && wasOpen) button.focus({ preventScroll: true });
  }

  function openGroup(group) {
    groups.forEach(other => { if (other !== group) other.open = false; });
    group.open = true;
  }

  button.addEventListener('click', () => {
    if (button.getAttribute('aria-expanded') === 'true') return closeMenu();
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Zavřít nabídku');
    nav.classList.add('is-open');
  });

  groups.forEach(group => {
    const summary = group.querySelector('summary');
    const links = [...group.querySelectorAll('.nav-dropdown a')];
    // Enter/Space and ordinary Tab retain the native <details> behaviour.
    group.addEventListener('toggle', () => {
      if (group.open) groups.forEach(other => { if (other !== group) other.open = false; });
    });
    summary.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (!links.length) return;
      event.preventDefault();
      openGroup(group);
      links[event.key === 'ArrowDown' ? 0 : links.length - 1].focus({ preventScroll: true });
    });
    group.addEventListener('keydown', event => {
      const index = links.indexOf(event.target);
      if (index < 0) return;
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % links.length;
      if (event.key === 'ArrowUp') next = (index - 1 + links.length) % links.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = links.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      links[next].focus({ preventScroll: true });
    });
    group.addEventListener('focusout', event => {
      if (event.relatedTarget && !group.contains(event.relatedTarget)) group.open = false;
    });
  });

  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openGroup = groups.find(group => group.open);
    if (openGroup) {
      event.preventDefault();
      openGroup.open = false;
      openGroup.querySelector('summary').focus({ preventScroll: true });
    } else if (button.getAttribute('aria-expanded') === 'true') {
      event.preventDefault();
      closeMenu(true);
    }
  });

  desktop.addEventListener('change', event => {
    const navHadFocus = nav.contains(document.activeElement);
    const toggleHadFocus = document.activeElement === button;
    closeMenu();
    // A resize must not leave keyboard focus inside a now-hidden control.
    if (!event.matches && navHadFocus) button.focus({ preventScroll: true });
    else if (event.matches && toggleHadFocus) nav.querySelector('summary, a')?.focus({ preventScroll: true });
  });
  reducedMotion.addEventListener('change', event => {
    if (!event.matches || typeof nav.getAnimations !== 'function') return;
    // CSS switches to a short fade live; remove any in-flight displacement/stagger.
    nav.getAnimations({ subtree: true }).forEach(animation => {
      if (animation.animationName !== 'nav-fade-in') animation.cancel();
    });
  });
})();
