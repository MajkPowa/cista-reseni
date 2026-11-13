'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Shared navigation is owned by navigation.js; this file only handles the homepage.

// ---------- Poptávky: tři formuláře v jedné kartě ----------
// Názvy služeb (shodné s dist/cms-config.js a s pravidly databáze).
const serviceTitles = {
  cov: 'Domovní čistírna', cov_firmy: 'ČOV pro firmy a obce', upravna: 'Úpravna vody', destovka: 'Dešťová voda',
  cerpani: 'Čerpací technika', rekonstrukce: 'Rekonstrukce a modernizace ČOV', komplex: 'Komplexní řešení',
  poradit: 'Odborná konzultace', servis: 'Servis nebo oprava ČOV', zprovozneni: 'Zprovoznění ČOV',
  skoleni: 'Školení obsluhy ČOV', pravidelny_servis: 'Pravidelný servis ČOV'
};
const kindOfService = {
  cov: 'realizace', cov_firmy: 'realizace', upravna: 'realizace', destovka: 'realizace', cerpani: 'realizace',
  rekonstrukce: 'realizace', komplex: 'realizace', poradit: 'realizace',
  servis: 'servis', zprovozneni: 'servis', skoleni: 'servis', pravidelny_servis: 'pravidelny'
};
const kinds = {
  realizace: { legend: 'Jaké řešení potřebujete?', attach: ['Projektová dokumentace', 'Přiložit dokumentaci', 'PDF nebo fotografie, nejvýše 5 souborů, každý do 10 MB.'] },
  servis: { legend: 'S čím potřebujete pomoci?', attach: ['Fotografie zařízení', 'Přiložit fotografie', 'Fotografie nebo PDF, nejvýše 5 souborů, každý do 10 MB.'] },
  pravidelny: { legend: 'Který servisní program vás zajímá?', attach: null }
};
const programTitles = { standard: 'STANDARD', premium: 'PREMIUM' };
// [nadpis pole se zprávou, nápověda v poli, popisek v souhrnu]
const messagePrompts = {
  cov: ['Stručný popis záměru', 'Co řešíte a v jaké jste fázi?', 'Záměr'],
  cov_firmy: ['O vašem objektu nebo provozu', 'Typ objektu, způsob provozu a co potřebujete vyřešit.', 'Objekt a požadavek'],
  upravna: ['Jakou vodu potřebujete upravit?', 'Zdroj vody, k čemu ji používáte a co vás na ní trápí.', 'Záměr'],
  destovka: ['Jak chcete dešťovou vodu využívat?', 'Zahrada, domácnost, nový systém nebo doplnění stávajícího?', 'Záměr'],
  cerpani: ['Co potřebujete čerpat a kam?', 'Popište objekt, stávající stav nebo plánované řešení.', 'Požadavek'],
  rekonstrukce: ['Co chcete u stávající ČOV změnit?', 'Popište stav zařízení a důvod plánované modernizace.', 'Záměr rekonstrukce'],
  komplex: ['Stručný popis záměru', 'Co všechno potřebujete vyřešit a v jaké jste fázi?', 'Záměr'],
  poradit: ['S čím vám můžeme poradit?', 'Napište stručně svou otázku nebo situaci.', 'Dotaz'],
  servis: ['Popis problému nebo požadované služby', 'Co se se zařízením děje?', 'Popis problému'],
  zprovozneni: ['V jakém stavu je instalace?', 'Co je již připravené a co potřebujete uvést do provozu?', 'Stav instalace'],
  skoleni: ['Co potřebujete při školení probrat?', 'Kdo zařízení obsluhuje a s čím potřebuje pomoci?', 'Požadavek na školení'],
  pravidelny_servis: ['Poznámka', 'Cokoli, co bychom měli o zařízení vědět.', 'Poznámka']
};
const equipmentServices = new Set(['servis', 'zprovozneni', 'skoleni', 'rekonstrukce', 'pravidelny_servis']);
const MAX_FILES = 5, MAX_BYTES = 10 * 1024 * 1024;

const form = $('#inquiry-form');
const stepOne = $('#form-step-1');
const stepTwo = $('#form-step-2');
const kindTabs = $$('.form-kinds [data-kind]');
const kindPanels = $$('[data-kind-panel]');
const equipmentFields = $('#equipment-fields');
const attachField = $('#attach-field');
const attachInput = $('#attachments');
const attachList = $('#attach-list');
let activeKind = 'realizace';
let files = [];

function selectedService() {
  if (activeKind === 'pravidelny') return 'pravidelny_servis';
  return $(`[data-kind-panel="${activeKind}"] input[name="service"]:checked`)?.value;
}
const selectedProgram = () => $('input[name="program"]:checked')?.value;

function updateInquiryFields() {
  const service = selectedService();
  const needsEquipment = activeKind !== 'realizace' || equipmentServices.has(service);
  equipmentFields.hidden = !needsEquipment;
  equipmentFields.disabled = !needsEquipment;
  $('#equipment-legend').textContent = activeKind === 'pravidelny' ? 'Výrobce a typ technologie' : 'O vašem zařízení';
  const [label, placeholder] = messagePrompts[service] || messagePrompts[activeKind === 'servis' ? 'servis' : 'cov'];
  $('#message-label').textContent = label;
  $('#message').placeholder = placeholder;
}

function setKind(kind, { focus = false } = {}) {
  if (!kinds[kind]) return;
  activeKind = kind;
  kindTabs.forEach(tab => {
    const selected = tab.dataset.kind === kind;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus({ preventScroll: true });
  });
  kindPanels.forEach(panel => {
    const active = panel.dataset.kindPanel === kind;
    panel.hidden = !active;
    // Volby v neaktivních panelech se neodesílají a nebrání validaci.
    $$('input', panel).forEach((input, index) => { input.disabled = !active; input.required = active && index === 0; });
  });
  $('#step-1-legend').textContent = kinds[kind].legend;
  const attach = kinds[kind].attach;
  attachField.hidden = !attach;
  if (attach) {
    $('#attach-label').textContent = attach[0];
    $('#attach-button-text').textContent = attach[1];
    $('#attach-hint').textContent = attach[2];
  } else {
    files = []; renderFiles();
  }
  updateInquiryFields();
}

function chooseInquiryService(service, program) {
  const kind = kindOfService[service];
  if (!kind) return;
  setKind(kind);
  const choice = $(`[data-kind-panel="${kind}"] input[name="service"][value="${service}"]`);
  if (choice) choice.checked = true;
  if (kind === 'pravidelny' && programTitles[program]) $(`input[name="program"][value="${program}"]`).checked = true;
  updateInquiryFields();
}

kindTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => { showForm(); setStep(1); setKind(tab.dataset.kind); });
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % kindTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + kindTabs.length) % kindTabs.length;
    if (next === undefined) return;
    event.preventDefault();
    setStep(1); setKind(kindTabs[next].dataset.kind, { focus: true });
  });
});
form.addEventListener('change', event => { if (event.target.matches('input[type="radio"]')) updateInquiryFields(); });

function setStep(step) {
  stepOne.hidden = step !== 1; stepOne.disabled = step !== 1;
  stepTwo.hidden = step !== 2; stepTwo.disabled = step !== 2;
  $('#step-indicator').textContent = '0' + step + ' / 02';
}
function showForm() { form.hidden = false; $('.form-kinds').hidden = false; $('#form-result').hidden = true; }
$('#next-step').addEventListener('click', () => {
  if (!form.reportValidity()) return;
  setStep(2); $('#name').focus({ preventScroll: true });
});
$('#previous-step').addEventListener('click', () => { setStep(1); $('#location').focus({ preventScroll: true }); });

// ----- Přílohy -----
const sizeLabel = bytes => bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' kB';
function renderFiles(error = '') {
  attachList.replaceChildren(...files.map((file, index) => {
    const item = document.createElement('li');
    const name = document.createElement('span'); name.textContent = file.name;
    const size = document.createElement('small'); size.textContent = sizeLabel(file.size);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Odebrat soubor ' + file.name);
    remove.addEventListener('click', () => { files.splice(index, 1); renderFiles(); });
    item.append(name, size, remove);
    return item;
  }));
  if (error) {
    const note = document.createElement('li'); note.className = 'attach-error'; note.textContent = error;
    attachList.append(note);
  }
}
attachInput.addEventListener('change', () => {
  let error = '';
  for (const file of attachInput.files) {
    const accepted = file.type.startsWith('image/') || file.type === 'application/pdf' || /\.(heic|heif)$/i.test(file.name);
    if (!accepted) { error = 'Přiložit lze jen fotografie a PDF.'; continue; }
    // Fotografie se před odesláním zmenší, limit proto hlídáme jen u PDF.
    if (file.type === 'application/pdf' && file.size > MAX_BYTES) { error = 'Soubor ' + file.name + ' je větší než 10 MB.'; continue; }
    if (files.length >= MAX_FILES) { error = 'Přiložit lze nejvýše 5 souborů.'; break; }
    files.push(file);
  }
  attachInput.value = '';
  renderFiles(error);
});

// ----- Odeslání -----
const submitButton = $('#submit-inquiry');
const formError = $('#form-error');
const formShownAt = Date.now();
let sending = false;
function inquiryFields(service) {
  const fields = [['Typ poptávky', kindTabs.find(tab => tab.dataset.kind === activeKind).textContent.trim()], ['Řešení', serviceTitles[service]]];
  if (activeKind === 'pravidelny') fields.push(['Servisní program', programTitles[selectedProgram()]]);
  fields.push(['Obec', $('#location').value.trim()]);
  // Do not include previously filled device fields when the topic no longer needs them.
  if (!equipmentFields.disabled) {
    if ($('#manufacturer').value.trim()) fields.push(['Výrobce', $('#manufacturer').value.trim()]);
    if ($('#device-type').value.trim()) fields.push(['Typ ČOV', $('#device-type').value.trim()]);
  }
  fields.push(['Jméno', $('#name').value.trim()], ['E-mail', $('#email').value.trim()]);
  if ($('#phone').value.trim()) fields.push(['Telefon', $('#phone').value.trim()]);
  if ($('#message').value.trim()) fields.push([(messagePrompts[service] || messagePrompts.cov)[2], $('#message').value.trim()]);
  if (files.length) fields.push(['Přílohy', files.map(file => file.name).join(', ')]);
  return fields;
}
function mailtoLink(service, fields) {
  const body = 'Dobrý den,\n\nmám zájem o následující řešení:\n\n' + fields.map(([title, value]) => title + ': ' + value).join('\n') + '\n\nDěkuji.';
  return 'mailto:info@cistareseni.cz?subject=' + encodeURIComponent('Poptávka: ' + serviceTitles[service]) + '&body=' + encodeURIComponent(body);
}
function setSending(state, label) {
  sending = state;
  submitButton.disabled = state;
  submitButton.setAttribute('aria-busy', String(state));
  $('span', submitButton).textContent = state ? (label || 'Odesílám…') : 'Odeslat poptávku';
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  if (stepTwo.disabled) { $('#next-step').click(); return; }
  if (!form.reportValidity()) return;
  const service = selectedService();
  if (!serviceTitles[service]) { setStep(1); return; }
  const fields = inquiryFields(service);
  formError.hidden = true;
  setSending(true);
  try {
    // Vyplněné skryté pole nebo odeslání během prvních vteřin prozrazuje robota:
    // poptávku neukládáme, ale navenek se formulář chová stejně.
    const robot = $('#company-website').value.trim() !== '' || Date.now() - formShownAt < 2500;
    if (!robot) {
      const data = window.CRData;
      if (!data) throw new Error('Datové připojení není k dispozici.');
      const id = data.newId();
      const attachments = [];
      for (const [index, file] of files.entries()) {
        setSending(true, 'Nahrávám přílohy ' + (index + 1) + ' / ' + files.length + '…');
        attachments.push(await data.uploadAttachment(id, index, file));
      }
      setSending(true);
      const equipment = !equipmentFields.disabled;
      await data.createInquiry({
        id, kind: activeKind, program: activeKind === 'pravidelny' ? selectedProgram() : '',
        service, serviceLabel: serviceTitles[service], location: $('#location').value,
        manufacturer: equipment ? $('#manufacturer').value : '', deviceType: equipment ? $('#device-type').value : '',
        name: $('#name').value, email: $('#email').value, phone: $('#phone').value, message: $('#message').value,
        page: location.pathname.slice(0, 200), attachments
      });
    }
  } catch (error) {
    console.warn('Poptávku se nepodařilo odeslat.', error);
    setSending(false);
    $('#email-inquiry').href = mailtoLink(service, fields);
    formError.hidden = false;
    formError.focus({ preventScroll: true });
    return;
  }
  setSending(false);
  $('#inquiry-summary').replaceChildren(...fields.flatMap(([title, text]) => {
    const dt = document.createElement('dt'); dt.textContent = title;
    const dd = document.createElement('dd'); dd.textContent = text;
    return [dt, dd];
  }));
  $('#form-result-note').textContent = window.CR_CMS?.confirmationEmail
    ? 'Potvrzení jsme vám poslali na e-mail ' + $('#email').value.trim() + '. Ozveme se co nejdříve.'
    : 'Ozveme se vám co nejdříve na uvedený e-mail nebo telefon.';
  form.hidden = true; $('.form-kinds').hidden = true; $('#form-result').hidden = false; $('#step-indicator').textContent = 'ODESLÁNO';
  $('#form-result h3').setAttribute('tabindex', '-1');
  $('#form-result h3').focus({ preventScroll: true });
});
$('#new-inquiry').addEventListener('click', () => {
  form.reset(); files = []; renderFiles(); showForm(); setStep(1); setKind(activeKind);
  kindTabs.find(tab => tab.dataset.kind === activeKind)?.focus({ preventScroll: true });
});

// Odkazy na stránce předvolí typ poptávky, službu nebo servisní program.
document.addEventListener('click', event => {
  const link = event.target.closest('[data-inquiry-service], [data-inquiry-kind], [data-inquiry-program]');
  if (!link) return;
  showForm(); setStep(1);
  if (link.dataset.inquiryProgram) chooseInquiryService('pravidelny_servis', link.dataset.inquiryProgram);
  else if (link.dataset.inquiryService) chooseInquiryService(link.dataset.inquiryService);
  else setKind(link.dataset.inquiryKind);
});
$('#year').textContent = new Date().getFullYear();
const params = new URLSearchParams(window.location.search);
const requestedSolution = params.get('reseni');
setKind('realizace');
if (kindOfService[requestedSolution]) chooseInquiryService(requestedSolution, params.get('program'));
else if (kinds[params.get('poptavka')]) setKind(params.get('poptavka'));

// ---------- Filtr vybraných realizací ----------
// Karty i tlačítka může doplnit administrace (site-data.js), proto se kliknutí zpracovává delegovaně.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  $$('[data-filter]').forEach(item => {
    const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
  });
  let count = 0;
  $$('.project').forEach(item => {
    const show = button.dataset.filter === 'all' || item.dataset.category === button.dataset.filter;
    item.hidden = !show; if (show) count++;
  });
  $('#filter-status').textContent = 'Počet zobrazených realizací: ' + count + '.';
});

// ---------- Úvodní video: načte se až po kliknutí ----------
const videoDialog = $('#video-dialog');
const video = $('#promo-video');
$$('[data-video-open]').forEach(button => button.addEventListener('click', () => {
  if (typeof videoDialog.showModal !== 'function') return;
  // Na výšku držený telefon dostane svislou verzi.
  const tall = matchMedia('(max-width: 780px) and (orientation: portrait)').matches;
  const source = tall ? video.dataset.srcTall : video.dataset.srcWide;
  if (video.getAttribute('src') !== source) {
    video.poster = tall ? video.dataset.posterTall : video.dataset.posterWide;
    video.src = source;
  }
  videoDialog.classList.toggle('is-tall', tall);
  videoDialog.showModal();
  video.play().catch(() => { /* přehrání spustí návštěvník sám */ });
}));
$('[data-video-close]')?.addEventListener('click', () => videoDialog.close());
videoDialog?.addEventListener('click', event => { if (event.target === videoDialog) videoDialog.close(); });
videoDialog?.addEventListener('close', () => video.pause());

// ---------- Záložky řešení ----------
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
homeReducedMotion.addEventListener('change', event => {
  if (event.matches) $$('.home-solution-panel').forEach(panel => panel.getAnimations().forEach(animation => animation.cancel()));
});
if (requestedSolution) selectHomeSolution(requestedSolution, { animate: false });
