'use strict';
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.getElementById('navigation');
function closeMenu() { menuButton?.setAttribute('aria-expanded', 'false'); menuButton?.setAttribute('aria-label', 'Otevřít nabídku'); navigation?.classList.remove('is-open'); }
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Zavřít nabídku' : 'Otevřít nabídku'); navigation?.classList.toggle('is-open', open);
});
navigation?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if(e.matches) closeMenu(); });
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const search = document.getElementById('reference-search');
const filterButtons = [...document.querySelectorAll('[data-content-filter]')];
const referenceCards = [...document.querySelectorAll('[data-reference-card]')];
let chosenCategory = 'all';
function filterReferences() {
  const query = normalize(search?.value.trim() || ''); let visible = 0;
  referenceCards.forEach(card => {
    const matched = (chosenCategory === 'all' || card.dataset.categories.split(' ').includes(chosenCategory)) && normalize(card.dataset.search).includes(query);
    card.hidden = !matched; if(matched) visible++;
  });
  const status = document.getElementById('result-count');
  if(status) status.textContent = `Zobrazeno ${visible} z ${referenceCards.length} realizací`;
  const empty = document.getElementById('empty-state'); if(empty) empty.hidden = visible > 0;
}
filterButtons.forEach(button => button.addEventListener('click', () => {
  chosenCategory = button.dataset.contentFilter;
  filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  filterReferences();
}));
search?.addEventListener('input', filterReferences);
if(referenceCards.length) filterReferences();
const gallerySelect = document.getElementById('gallery-project');
gallerySelect?.addEventListener('change', () => {
  let count = 0;
  document.querySelectorAll('[data-gallery-project]').forEach(item => {
    item.hidden = gallerySelect.value !== 'all' && gallerySelect.value !== item.dataset.galleryProject;
    if(!item.hidden) count++;
  });
  document.getElementById('gallery-count').textContent = `Zobrazeno ${count} snímků`;
});
const lightbox = document.getElementById('photo-lightbox');
let galleryItems = [], galleryIndex = 0, galleryTrigger = null;
function showPhoto(index) {
  galleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[galleryIndex];
  const image = lightbox.querySelector('img');
  image.src = item.href; image.alt = item.dataset.caption || item.querySelector('img')?.alt || 'Snímek realizace';
  lightbox.querySelector('figcaption').textContent = image.alt;
  lightbox.querySelector('output').textContent = `${galleryIndex + 1} / ${galleryItems.length}`;
}
document.querySelectorAll('[data-lightbox]').forEach(item => item.addEventListener('click', e => {
  if(!lightbox || typeof lightbox.showModal !== 'function' || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault(); galleryTrigger = item;
  galleryItems = [...document.querySelectorAll('[data-lightbox]')].filter(a => !a.closest('[hidden]'));
  showPhoto(galleryItems.indexOf(item)); lightbox.showModal();
}));
lightbox?.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox?.querySelector('[data-photo-prev]').addEventListener('click', () => showPhoto(galleryIndex - 1));
lightbox?.querySelector('[data-photo-next]').addEventListener('click', () => showPhoto(galleryIndex + 1));
lightbox?.addEventListener('keydown', e => {
  if(e.key === 'ArrowRight') { e.preventDefault(); showPhoto(galleryIndex + 1); }
  if(e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(galleryIndex - 1); }
});
lightbox?.addEventListener('click', e => { if(e.target === lightbox) lightbox.close(); });
lightbox?.addEventListener('close', () => { lightbox.querySelector('img').removeAttribute('src'); galleryTrigger?.focus(); });
