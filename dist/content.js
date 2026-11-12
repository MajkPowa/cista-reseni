'use strict';
// Výpis realizací, galerie a zvětšování fotografií. Karty mohou po načtení stránky
// přibýt z administrace (site-data.js), proto se prvky hledají až v okamžiku použití.
const normalize = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const search = document.getElementById('reference-search');
const referenceCards = () => [...document.querySelectorAll('[data-reference-card]')];
let chosenCategory = 'all';
let referenceLimit = 12;
const moreReferences = document.querySelector('[data-load-references]');
let matchingReferences = [];
function filterReferences() {
  const cards = referenceCards();
  const query = normalize(search?.value.trim() || '');
  matchingReferences = cards.filter(card => (chosenCategory === 'all' || card.dataset.categories.split(' ').includes(chosenCategory)) && normalize(card.dataset.search).includes(query));
  const shown = moreReferences ? matchingReferences.slice(0, referenceLimit) : matchingReferences;
  const visible = new Set(shown);
  cards.forEach(card => { card.hidden = !visible.has(card); });
  const status = document.getElementById('result-count');
  if(status) status.textContent = `Zobrazeno ${shown.length} z ${matchingReferences.length} odpovídajících realizací`;
  const empty = document.getElementById('empty-state'); if(empty) empty.hidden = matchingReferences.length > 0;
  if(moreReferences) moreReferences.hidden = shown.length >= matchingReferences.length;
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-content-filter]');
  if (!button) return;
  chosenCategory = button.dataset.contentFilter;
  referenceLimit = 12;
  document.querySelectorAll('[data-content-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  filterReferences();
});
search?.addEventListener('input', () => { referenceLimit = 12; filterReferences(); });
moreReferences?.addEventListener('click', () => {
  const firstNew = matchingReferences[referenceLimit];
  referenceLimit += 12;
  filterReferences();
  firstNew?.focus({ preventScroll: true });
});
if(referenceCards().length) filterReferences();
document.addEventListener('cr:references-rendered', () => {
  // Zachovat zvolený filtr, pokud kategorie po načtení dat stále existuje.
  const active = document.querySelector(`[data-content-filter="${CSS.escape(chosenCategory)}"]`);
  if (!active) chosenCategory = 'all';
  document.querySelectorAll('[data-content-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.contentFilter === chosenCategory)));
  filterReferences();
});
const gallerySelect = document.getElementById('gallery-project');
const moreGallery = document.querySelector('[data-load-gallery]');
const galleryCards = () => [...document.querySelectorAll('[data-gallery-project]')];
let galleryLimit = 24, matchingGallery = [];
function filterGallery() {
  if (!gallerySelect) return;
  const cards = galleryCards();
  matchingGallery = cards.filter(item => gallerySelect.value === 'all' || gallerySelect.value === item.dataset.galleryProject);
  const shown = moreGallery ? matchingGallery.slice(0, galleryLimit) : matchingGallery;
  const visible = new Set(shown);
  cards.forEach(item => { item.hidden = !visible.has(item); });
  document.getElementById('gallery-count').textContent = `Zobrazeno ${shown.length} z ${matchingGallery.length} snímků`;
  if (moreGallery) moreGallery.hidden = shown.length >= matchingGallery.length;
}
gallerySelect?.addEventListener('change', () => { galleryLimit = 24; filterGallery(); });
moreGallery?.addEventListener('click', () => {
  const firstNew = matchingGallery[galleryLimit]; galleryLimit += 24; filterGallery(); firstNew?.focus({ preventScroll: true });
});
filterGallery();
document.addEventListener('cr:gallery-updated', filterGallery);
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
document.addEventListener('click', e => {
  const item = e.target.closest('[data-lightbox]');
  if(!item || !lightbox || typeof lightbox.showModal !== 'function' || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault(); galleryTrigger = item;
  const unique = new Map();
  document.querySelectorAll('[data-lightbox]').forEach(a => { if (!a.closest('[hidden]') && !unique.has(a.href)) unique.set(a.href, a); });
  galleryItems = [...unique.values()];
  showPhoto(galleryItems.findIndex(a => a.href === item.href)); lightbox.showModal();
});
lightbox?.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox?.querySelector('[data-photo-prev]').addEventListener('click', () => showPhoto(galleryIndex - 1));
lightbox?.querySelector('[data-photo-next]').addEventListener('click', () => showPhoto(galleryIndex + 1));
lightbox?.addEventListener('keydown', e => {
  if(e.key === 'ArrowRight') { e.preventDefault(); showPhoto(galleryIndex + 1); }
  if(e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(galleryIndex - 1); }
});
lightbox?.addEventListener('click', e => { if(e.target === lightbox) lightbox.close(); });
lightbox?.addEventListener('close', () => { lightbox.querySelector('img').removeAttribute('src'); galleryTrigger?.focus(); });
