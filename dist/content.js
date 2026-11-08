'use strict';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const search = document.getElementById('reference-search');
const filterButtons = [...document.querySelectorAll('[data-content-filter]')];
const referenceCards = [...document.querySelectorAll('[data-reference-card]')];
let chosenCategory = 'all';
let referenceLimit = 12;
const moreReferences = document.querySelector('[data-load-references]');
let matchingReferences = referenceCards;
function filterReferences() {
  const query = normalize(search?.value.trim() || '');
  matchingReferences = referenceCards.filter(card => (chosenCategory === 'all' || card.dataset.categories.split(' ').includes(chosenCategory)) && normalize(card.dataset.search).includes(query));
  const shown = moreReferences ? matchingReferences.slice(0, referenceLimit) : matchingReferences;
  const visible = new Set(shown);
  referenceCards.forEach(card => { card.hidden = !visible.has(card); });
  const status = document.getElementById('result-count');
  if(status) status.textContent = `Zobrazeno ${shown.length} z ${matchingReferences.length} odpovídajících realizací`;
  const empty = document.getElementById('empty-state'); if(empty) empty.hidden = matchingReferences.length > 0;
  if(moreReferences) moreReferences.hidden = shown.length >= matchingReferences.length;
}
filterButtons.forEach(button => button.addEventListener('click', () => {
  chosenCategory = button.dataset.contentFilter;
  referenceLimit = 12;
  filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  filterReferences();
}));
search?.addEventListener('input', () => { referenceLimit = 12; filterReferences(); });
moreReferences?.addEventListener('click', () => {
  const firstNew = matchingReferences[referenceLimit];
  referenceLimit += 12;
  filterReferences();
  firstNew?.focus({ preventScroll: true });
});
if(referenceCards.length) filterReferences();
const gallerySelect = document.getElementById('gallery-project');
const moreGallery = document.querySelector('[data-load-gallery]');
const galleryCards = [...document.querySelectorAll('[data-gallery-project]')];
let galleryLimit = 24, matchingGallery = galleryCards;
function filterGallery() {
  if (!gallerySelect) return;
  matchingGallery = galleryCards.filter(item => gallerySelect.value === 'all' || gallerySelect.value === item.dataset.galleryProject);
  const shown = moreGallery ? matchingGallery.slice(0, galleryLimit) : matchingGallery;
  const visible = new Set(shown);
  galleryCards.forEach(item => { item.hidden = !visible.has(item); });
  document.getElementById('gallery-count').textContent = `Zobrazeno ${shown.length} z ${matchingGallery.length} snímků`;
  if (moreGallery) moreGallery.hidden = shown.length >= matchingGallery.length;
}
gallerySelect?.addEventListener('change', () => { galleryLimit = 24; filterGallery(); });
moreGallery?.addEventListener('click', () => {
  const firstNew = matchingGallery[galleryLimit]; galleryLimit += 24; filterGallery(); firstNew?.focus({ preventScroll: true });
});
filterGallery();
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
  const unique = new Map();
  document.querySelectorAll('[data-lightbox]').forEach(a => { if (!a.closest('[hidden]') && !unique.has(a.href)) unique.set(a.href, a); });
  galleryItems = [...unique.values()];
  showPhoto(galleryItems.findIndex(a => a.href === item.href)); lightbox.showModal();
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
