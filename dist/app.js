'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const menuButton = $('.menu-toggle');
const navigation = $('#navigation');
function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Otevřít nabídku'); navigation.classList.remove('is-open'); }
menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') !== 'true'; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Zavřít nabídku' : 'Otevřít nabídku'); navigation.classList.toggle('is-open', open); });
$$('a', navigation).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
matchMedia('(min-width:901px)').addEventListener('change', closeMenu);

const services = {
  cov: { title: 'Domovní čistírny', description: 'Správné řešení začíná u vašeho domu a pozemku. Probereme způsob využití, prostorové podmínky i možnosti odvádění vyčištěné vody.', items: ['Návrh vhodné čistírny a projektová dokumentace', 'Dodávka, montáž a zprovoznění', 'Zaškolení obsluhy a následný servis'] },
  destovka: { title: 'Dešťová voda', description: 'Zachycenou vodu lze využít pro zahradu i vybrané potřeby domácnosti. Navrhneme nádrž a systém podle vašeho konkrétního záměru.', items: ['Posouzení využití vody a návrh nádrže', 'Dodávka nádrže, čerpání a souvisejících rozvodů', 'Montáž a uvedení systému do provozu'] },
  cerpani: { title: 'Čerpací technika', description: 'Když voda nemůže odtékat samospádem, potřebuje spolehlivé čerpání. Řešení přizpůsobíme terénu a provozu objektu.', items: ['Návrh čerpací šachty a vybavení', 'Dodávka a instalace čerpací technologie', 'Zprovoznění a následná údržba'] },
  servis: { title: 'Servis a rekonstrukce', description: 'Stávající zařízení nemusí znamenat nové starosti. Prohlédneme jeho stav a navrhneme vhodnou údržbu, opravu nebo obnovu technologie.', items: ['Servis a údržba domovních čistíren', 'Rekonstrukce a opětovné zprovoznění', 'Náhradní díly a kamerové zkoušky kanalizace'] },
  poradit: { title: 'Potřebuji poradit' }
};
const servicePaths = {cov:'sluzby/cisteni-odpadnich-vod.html',destovka:'sluzby/hospodareni-s-destovou-vodou.html',cerpani:'sluzby/cerpaci-sachty.html',servis:'sluzby/servis-a-udrzba.html'};
const dialog = $('#service-dialog');
let activeService;
$$('[data-service]').forEach(button => button.addEventListener('click', () => {
  activeService = button.dataset.service;
  const service = services[activeService];
  $('#service-dialog-title').textContent = service.title;
  $('#service-detail').href = servicePaths[activeService];
  $('#service-dialog-description').textContent = service.description;
  $('#service-dialog-list').replaceChildren(...service.items.map(text => { const item = document.createElement('li'); item.textContent = text; return item; }));
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}));
function closeDialog() { dialog.close(); }
$('.dialog-close', dialog).addEventListener('click', closeDialog);
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });
$('#service-inquiry').addEventListener('click', () => { closeDialog(); showForm(); setStep(1); $(`input[name="service"][value="${activeService}"]`).checked = true; });

$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  $$('[data-filter]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  let count = 0;
  $$('.project').forEach(item => { const show = button.dataset.filter === 'all' || item.dataset.category === button.dataset.filter; item.hidden = !show; if (show) count++; });
  $('#filter-status').textContent = `Počet zobrazených realizací: ${count}.`;
}));

const form = $('#inquiry-form');
const stepOne = $('#form-step-1');
const stepTwo = $('#form-step-2');
function setStep(step) {
  stepOne.hidden = step !== 1; stepOne.disabled = step !== 1;
  stepTwo.hidden = step !== 2; stepTwo.disabled = step !== 2;
  $('#step-indicator').textContent = `0${step} / 02`;
}
function showForm() { form.hidden = false; $('#form-result').hidden = true; }
$('#next-step').addEventListener('click', () => { if (!form.reportValidity()) return; setStep(2); $('#name').focus({ preventScroll: true }); });
$('#previous-step').addEventListener('click', () => { setStep(1); $('input[name="service"]:checked')?.focus({ preventScroll: true }); });
form.addEventListener('submit', event => {
  event.preventDefault();
  if (stepTwo.disabled) { $('#next-step').click(); return; }
  if (!form.reportValidity()) return;
  const service = services[$('input[name="service"]:checked').value].title;
  const fields = [['Řešení', service], ['Obec', $('#location').value.trim()], ['Jméno', $('#name').value.trim()], ['E-mail', $('#email').value.trim()]];
  if ($('#phone').value.trim()) fields.push(['Telefon', $('#phone').value.trim()]);
  if ($('#message').value.trim()) fields.push(['Záměr', $('#message').value.trim()]);
  $('#inquiry-summary').replaceChildren(...fields.flatMap(([title, text]) => { const dt = document.createElement('dt'); dt.textContent = title; const dd = document.createElement('dd'); dd.textContent = text; return [dt, dd]; }));
  const body = 'Dobrý den,\n\nmám zájem o následující řešení:\n\n' + fields.map(([key, value]) => `${key}: ${value}`).join('\n') + '\n\nDěkuji.';
  $('#email-inquiry').href = `mailto:info@cistareseni.cz?subject=${encodeURIComponent('Poptávka: ' + service)}&body=${encodeURIComponent(body)}`;
  form.hidden = true; $('#form-result').hidden = false; $('#step-indicator').textContent = 'SOUHRN';
  $('#form-result h3').setAttribute('tabindex', '-1'); $('#form-result h3').focus({ preventScroll: true });
});
$('#edit-inquiry').addEventListener('click', () => { showForm(); setStep(2); $('#name').focus({ preventScroll: true }); });
$('#year').textContent = new Date().getFullYear();
const requestedSolution = new URLSearchParams(window.location.search).get('reseni');
if (Object.hasOwn(services, requestedSolution)) {
  const requestedChoice = $$('input[name="service"]').find(input => input.value === requestedSolution);
  if (requestedChoice) requestedChoice.checked = true;
}

// Accessible service tabs keep the photograph, explanation and destination together.
const homeSolutionTabs = $$('[data-home-solution]');
const homeReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function selectHomeSolution(key, { focus = false, animate = true } = {}) {
  const tab = homeSolutionTabs.find(item => item.dataset.homeSolution === key);
  const panel = tab && document.getElementById(tab.getAttribute('aria-controls'));
  if (!tab || !panel) return;
  const changed = tab.getAttribute('aria-selected') !== 'true';
  homeSolutionTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus({ preventScroll: true });
  if (changed && animate && !homeReducedMotion.matches && typeof panel.animate === 'function') {
    panel.getAnimations().forEach(animation => animation.cancel());
    panel.animate([{ opacity: .25, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}
homeSolutionTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectHomeSolution(tab.dataset.homeSolution));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % homeSolutionTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + homeSolutionTabs.length) % homeSolutionTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = homeSolutionTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectHomeSolution(homeSolutionTabs[next].dataset.homeSolution, { focus: true });
  });
});
$$('[data-inquiry-service]').forEach(link => link.addEventListener('click', () => {
  const choice = $$('input[name="service"]').find(input => input.value === link.dataset.inquiryService);
  if (!choice) return;
  showForm();
  setStep(1);
  choice.checked = true;
}));
homeReducedMotion.addEventListener('change', event => {
  if (event.matches) $$('.home-solution-panel').forEach(panel => panel.getAnimations().forEach(animation => animation.cancel()));
});
if (requestedSolution) selectHomeSolution(requestedSolution, { animate: false });
