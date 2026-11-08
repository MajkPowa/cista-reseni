'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Shared navigation is owned by navigation.js; this file only handles the homepage.
const services = {
  cov: { title: 'Domovní čistírna', description: 'Správné řešení začíná u vašeho domu a pozemku. Probereme způsob využití, prostorové podmínky i možnosti odvádění vyčištěné vody.', items: ['Návrh vhodné čistírny a projektová dokumentace', 'Dodávka, montáž a zprovoznění', 'Zaškolení obsluhy a následný servis'] },
  cov_firmy: { title: 'ČOV pro firmy a obce', description: 'Čistírny pro penziony, hotely, rekreační a výrobní areály i obce. Rozsah řešení vychází z potřeb konkrétního provozu.', items: ['Projektová příprava a technické poradenství', 'Technologické celky, úprava vod a intenzifikace', 'Vlastní kapacity i spolupráce s odbornými partnery'] },
  destovka: { title: 'Dešťová voda', description: 'Zachycenou vodu lze využít pro zahradu i vybrané potřeby domácnosti. Navrhneme nádrž a systém podle vašeho konkrétního záměru.', items: ['Posouzení využití vody a návrh nádrže', 'Dodávka nádrže, čerpání a souvisejících rozvodů', 'Montáž a uvedení systému do provozu'] },
  cerpani: { title: 'Čerpací technika', description: 'Když voda nemůže odtékat samospádem, potřebuje spolehlivé čerpání. Řešení přizpůsobíme terénu a provozu objektu.', items: ['Návrh čerpací šachty a vybavení', 'Dodávka a instalace čerpací technologie', 'Zprovoznění a následná údržba'] },
  servis: { title: 'Servis nebo oprava ČOV', description: 'Pravidelná péče i jednorázové opravy domovních, komerčních a průmyslových čistíren různých výrobců. Servisujeme také zařízení, která jsme sami nedodávali.', items: ['Diagnostika a kontrola biologického procesu', 'Výměny komponentů a optimalizace provozu', 'Servisní programy a dlouhodobé smlouvy'] },
  zprovozneni: { title: 'Zprovoznění ČOV', description: 'Prověříme instalaci a funkčnost, nastavíme technologii a uvedeme čistírnu do provozu. Podle konkrétní technologie také u jiných výrobců.', items: ['Kontrola instalace a technologických komponentů', 'Nastavení řídicí jednotky a biologického procesu', 'Protokol o zprovoznění a předání zařízení'] },
  skoleni: { title: 'Školení obsluhy ČOV', description: 'Praktické zaškolení přímo u zařízení pro soukromé zákazníky, firmy i obce.', items: ['Princip fungování a pravidelné kontroly', 'Údržba a základní diagnostika poruch', 'Doporučení pro hospodárný provoz a technická podpora'] },
  rekonstrukce: { title: 'Rekonstrukce a modernizace ČOV', description: 'Ne každé zařízení potřebuje úplnou výměnu. Posoudíme jeho stav a navrhneme úpravu technologie, doplnění nebo intenzifikaci.', items: ['Technologické posouzení stávající ČOV', 'Návrh modernizace a výměny zařízení', 'Optimalizace a intenzifikace provozu'] },
  poradit: { title: 'Odborná konzultace' }
};
const servicePaths = {
  cov: 'sluzby/cisteni-odpadnich-vod.html',
  cov_firmy: 'sluzby/cov-pro-firmy-a-obce.html',
  destovka: 'sluzby/hospodareni-s-destovou-vodou.html',
  cerpani: 'sluzby/cerpaci-sachty.html',
  servis: 'sluzby/servis-a-udrzba.html',
  zprovozneni: 'sluzby/zprovozneni-cov.html',
  skoleni: 'sluzby/skoleni-obsluhy-cov.html',
  rekonstrukce: 'sluzby/rekonstrukce-a-modernizace-cov.html'
};
const equipmentTopics = new Set(['servis', 'zprovozneni', 'skoleni', 'rekonstrukce']);
const messagePrompts = {
  cov: ['Pár slov k vašemu záměru', 'Co řešíte a v jaké jste fázi?', 'Záměr'],
  cov_firmy: ['O vašem objektu nebo provozu', 'Typ objektu, způsob provozu a co potřebujete vyřešit.', 'Objekt a požadavek'],
  destovka: ['Jak chcete dešťovou vodu využívat?', 'Zahrada, domácnost, nový systém nebo doplnění stávajícího?', 'Záměr'],
  cerpani: ['Co potřebujete čerpat a kam?', 'Popište objekt, stávající stav nebo plánované řešení.', 'Požadavek'],
  servis: ['Stručný popis problému nebo požadavku', 'Co se se zařízením děje? Případně uveďte zájem o pravidelný servis.', 'Popis problému nebo požadavku'],
  zprovozneni: ['V jakém stavu je instalace?', 'Co je již připravené a co potřebujete uvést do provozu?', 'Stav instalace a požadavek'],
  skoleni: ['Co potřebujete při školení probrat?', 'Kdo zařízení obsluhuje a s čím potřebuje pomoci?', 'Požadavek na školení'],
  rekonstrukce: ['Co chcete u stávající ČOV změnit?', 'Popište stav zařízení a důvod plánované modernizace.', 'Záměr rekonstrukce'],
  poradit: ['S čím vám můžeme poradit?', 'Napište stručně svou otázku nebo situaci.', 'Dotaz']
};

const dialog = $('#service-dialog');
let activeService;
$$('[data-service]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.service;
  if (!Object.hasOwn(services, key) || !services[key].items) return;
  activeService = key;
  const service = services[key];
  $('#service-dialog-title').textContent = service.title;
  $('#service-detail').href = servicePaths[key];
  $('#service-dialog-description').textContent = service.description;
  $('#service-dialog-list').replaceChildren(...service.items.map(text => {
    const item = document.createElement('li'); item.textContent = text; return item;
  }));
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}));
function closeDialog() { dialog.close(); }
$('.dialog-close', dialog).addEventListener('click', closeDialog);
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
});
$('#service-inquiry').addEventListener('click', () => {
  closeDialog(); showForm(); setStep(1); chooseInquiryService(activeService);
});

$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  $$('[data-filter]').forEach(item => {
    const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
  });
  let count = 0;
  $$('.project').forEach(item => {
    const show = button.dataset.filter === 'all' || item.dataset.category === button.dataset.filter;
    item.hidden = !show; if (show) count++;
  });
  $('#filter-status').textContent = 'Počet zobrazených realizací: ' + count + '.';
}));

const form = $('#inquiry-form');
const stepOne = $('#form-step-1');
const stepTwo = $('#form-step-2');
const serviceChoices = $$('input[name="service"]');
const equipmentFields = $('#equipment-fields');
function selectedServiceKey() { return serviceChoices.find(input => input.checked)?.value; }
function updateInquiryFields() {
  const key = selectedServiceKey();
  const needsEquipment = equipmentTopics.has(key);
  equipmentFields.hidden = !needsEquipment;
  equipmentFields.disabled = !needsEquipment;
  const [label, placeholder] = messagePrompts[key] || messagePrompts.cov;
  $('#message-label').textContent = label;
  $('#message').placeholder = placeholder;
}
function chooseInquiryService(key) {
  const choice = serviceChoices.find(input => input.value === key);
  if (!choice) return;
  choice.checked = true;
  updateInquiryFields();
}
serviceChoices.forEach(input => {
  input.addEventListener('change', updateInquiryFields);
  input.addEventListener('input', updateInquiryFields);
});
function setStep(step) {
  stepOne.hidden = step !== 1; stepOne.disabled = step !== 1;
  stepTwo.hidden = step !== 2; stepTwo.disabled = step !== 2;
  $('#step-indicator').textContent = '0' + step + ' / 02';
}
function showForm() { form.hidden = false; $('#form-result').hidden = true; }
$('#next-step').addEventListener('click', () => {
  if (!form.reportValidity()) return;
  setStep(2); $('#name').focus({ preventScroll: true });
});
$('#previous-step').addEventListener('click', () => {
  setStep(1); serviceChoices.find(input => input.checked)?.focus({ preventScroll: true });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (stepTwo.disabled) { $('#next-step').click(); return; }
  if (!form.reportValidity()) return;
  const key = selectedServiceKey();
  if (!Object.hasOwn(services, key)) { setStep(1); return; }
  const service = services[key].title;
  const fields = [['Řešení', service], ['Obec', $('#location').value.trim()]];
  // Do not include previously filled device fields when the topic no longer needs them.
  if (equipmentTopics.has(key)) {
    if ($('#manufacturer').value.trim()) fields.push(['Výrobce', $('#manufacturer').value.trim()]);
    if ($('#device-type').value.trim()) fields.push(['Typ zařízení', $('#device-type').value.trim()]);
  }
  fields.push(['Jméno', $('#name').value.trim()], ['E-mail', $('#email').value.trim()]);
  if ($('#phone').value.trim()) fields.push(['Telefon', $('#phone').value.trim()]);
  if ($('#message').value.trim()) fields.push([messagePrompts[key][2], $('#message').value.trim()]);
  $('#inquiry-summary').replaceChildren(...fields.flatMap(([title, text]) => {
    const dt = document.createElement('dt'); dt.textContent = title;
    const dd = document.createElement('dd'); dd.textContent = text;
    return [dt, dd];
  }));
  const body = 'Dobrý den,\n\nmám zájem o následující řešení:\n\n' + fields.map(([title, value]) => title + ': ' + value).join('\n') + '\n\nDěkuji.';
  $('#email-inquiry').href = 'mailto:info@cistareseni.cz?subject=' + encodeURIComponent('Poptávka: ' + service) + '&body=' + encodeURIComponent(body);
  form.hidden = true; $('#form-result').hidden = false; $('#step-indicator').textContent = 'SOUHRN';
  $('#form-result h3').setAttribute('tabindex', '-1');
  $('#form-result h3').focus({ preventScroll: true });
});
$('#edit-inquiry').addEventListener('click', () => {
  showForm(); setStep(2); $('#name').focus({ preventScroll: true });
});
$('#year').textContent = new Date().getFullYear();
const requestedSolution = new URLSearchParams(window.location.search).get('reseni');
if (Object.hasOwn(services, requestedSolution)) chooseInquiryService(requestedSolution);
updateInquiryFields();

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
  if (focus) {
    tab.focus({ preventScroll: true });
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
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
  const key = link.dataset.inquiryService;
  if (!serviceChoices.some(input => input.value === key)) return;
  showForm(); setStep(1); chooseInquiryService(key);
}));
homeReducedMotion.addEventListener('change', event => {
  if (event.matches) $$('.home-solution-panel').forEach(panel => panel.getAnimations().forEach(animation => animation.cancel()));
});
if (requestedSolution) selectHomeSolution(requestedSolution, { animate: false });
