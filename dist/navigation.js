'use strict';
(() => {
  const header = document.querySelector('.header');
  const button = header?.querySelector('.menu-toggle');
  const nav = document.getElementById('navigation');
  if (!header || !button || !nav) return;
  const groups = [...nav.querySelectorAll('.nav-group')];
  header.classList.add('navigation-ready');
  function closeMenu(returnFocus = false) {
    const wasOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Otevřít nabídku');
    nav.classList.remove('is-open');
    groups.forEach(group => { group.open = false; });
    if (returnFocus && wasOpen) button.focus();
  }
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-expanded') === 'true') return closeMenu();
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Zavřít nabídku');
    nav.classList.add('is-open');
  });
  groups.forEach(group => group.addEventListener('toggle', () => {
    if (group.open) groups.forEach(other => { if (other !== group) other.open = false; });
  }));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openGroup = groups.find(group => group.open);
    if (openGroup) { openGroup.open = false; openGroup.querySelector('summary').focus(); }
    else closeMenu(true);
  });
  matchMedia('(min-width: 1101px)').addEventListener('change', () => closeMenu());
})();
