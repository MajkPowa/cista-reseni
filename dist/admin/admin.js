/*
 * Čistá řešení — administrace webu.
 * Přihlášení (Firebase Auth), reference s fotografiemi (Firestore + Storage),
 * poptávky se stavy, kategorie a správci. Bez sestavovacího kroku: čistý ES modul.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {
  getStorage, connectStorageEmulator, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-storage.js';

const config = window.CR_CMS;
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
auth.languageCode = 'cs';

// Lokální vývoj: na localhostu lze administraci přepnout na Firebase emulátory.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
let emulator = false;
try { emulator = local && localStorage.getItem('crEmulator') === '1'; } catch { /* soukromý režim */ }
if (emulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

// ---------- Drobní pomocníci ----------
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function h(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value == null) continue;
    if (name === 'text') node.textContent = value;
    else if (name === 'class') node.className = value;
    else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value === true ? '' : value);
  }
  for (const child of [].concat(children)) if (child != null && child !== false) node.append(child);
  return node;
}
// replaceChildren by z hodnot null/false udělal text „null“, proto je předem vyřadíme.
const fill = (node, ...children) => node.replaceChildren(...children.flat().filter(child => child != null && child !== false));
const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const siteRoot = new URL('../', location.href).href;
const assetUrl = url => url ? new URL(url, siteRoot).href : '';
const dateLabel = date => /^\d{4}-\d{2}$/.test(date || '') ? `${date.slice(5)} / ${date.slice(0, 4)}` : '';
const toDate = value => value && typeof value.toDate === 'function' ? value.toDate() : null;
const dateTime = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = value => { const date = toDate(value); return date ? dateTime.format(date) : '—'; };

function toast(message, kind = 'ok') {
  const node = h('div', { class: `toast toast-${kind}`, text: message });
  $('#toasts').append(node);
  setTimeout(() => node.remove(), kind === 'error' ? 8000 : 3500);
}
function explain(error) {
  const code = error && error.code || '';
  const messages = {
    'auth/invalid-credential': 'E-mail nebo heslo nesouhlasí.',
    'auth/wrong-password': 'E-mail nebo heslo nesouhlasí.',
    'auth/user-not-found': 'E-mail nebo heslo nesouhlasí.',
    'auth/invalid-email': 'E-mail nemá správný tvar.',
    'auth/email-already-in-use': 'K tomuto e-mailu už heslo existuje. Přihlaste se, nebo použijte „Zapomenuté heslo“.',
    'auth/weak-password': 'Heslo je příliš krátké.',
    'auth/password-does-not-meet-requirements': 'Heslo nesplňuje požadavky na bezpečnost.',
    'auth/too-many-requests': 'Příliš mnoho pokusů. Zkuste to prosím za chvíli.',
    'auth/network-request-failed': 'Nepodařilo se připojit. Zkontrolujte internet.',
    'permission-denied': 'K této akci nemáte oprávnění.',
    'storage/unauthorized': 'Fotografii se nepodařilo nahrát – chybí oprávnění.',
    'unavailable': 'Služba je dočasně nedostupná. Zkuste to znovu.'
  };
  return messages[code] || 'Něco se nepovedlo. Zkuste to prosím znovu.';
}

function confirmDialog(title, text, okLabel = 'Smazat') {
  const dialog = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('[data-confirm="yes"]', dialog).textContent = okLabel;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true }));
}
$$('[data-confirm]').forEach(button => button.addEventListener('click', () => $('#confirm-dialog').close(button.dataset.confirm)));

// ---------- Obrazovky ----------
const screens = ['loading', 'auth', 'verify', 'denied', 'main'];
function show(name) {
  screens.forEach(screen => { $(`#view-${screen}`).hidden = screen !== name; });
}
function authMode(mode) {
  ['login', 'setup', 'reset'].forEach(name => { $(`#form-${name}`).hidden = name !== mode; });
  $$('#view-auth [data-message]').forEach(node => { node.hidden = true; });
  $(`#form-${mode} input`).focus();
}
$$('[data-auth-mode]').forEach(button => button.addEventListener('click', () => authMode(button.dataset.authMode)));
function formMessage(form, message, kind = 'error') {
  const node = $('[data-message]', form);
  node.textContent = message; node.dataset.kind = kind; node.hidden = false;
}
async function busy(button, task) {
  if (button.disabled) return;
  button.disabled = true; button.setAttribute('aria-busy', 'true');
  try { return await task(); } finally { button.disabled = false; button.removeAttribute('aria-busy'); }
}

// ---------- Přihlášení ----------
$('#form-login').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  busy($('button[type="submit"]', form), async () => {
    try { await signInWithEmailAndPassword(auth, $('#login-email').value.trim(), $('#login-password').value); }
    catch (error) { formMessage(form, explain(error)); }
  });
});
$('#form-setup').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if ($('#setup-password').value !== $('#setup-password-repeat').value) return formMessage(form, 'Hesla se neshodují.');
  busy($('button[type="submit"]', form), async () => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, $('#setup-email').value.trim(), $('#setup-password').value);
      await sendEmailVerification(credential.user).catch(() => {});
    } catch (error) { formMessage(form, explain(error)); }
  });
});
$('#form-reset').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  busy($('button[type="submit"]', form), async () => {
    try {
      await sendPasswordResetEmail(auth, $('#reset-email').value.trim());
      formMessage(form, 'Pokud k tomuto e-mailu existuje přístup, právě jsme na něj poslali odkaz pro nastavení hesla.', 'ok');
    } catch (error) { formMessage(form, explain(error)); }
  });
});
$$('[data-sign-out]').forEach(button => button.addEventListener('click', () => signOut(auth)));
$('#verify-resend').addEventListener('click', event => busy(event.currentTarget, async () => {
  const note = $('#verify-message');
  try { await sendEmailVerification(auth.currentUser); note.textContent = 'Zprávu jsme poslali znovu.'; }
  catch (error) { note.textContent = explain(error); }
  note.hidden = false;
}));
$('#verify-done').addEventListener('click', event => busy(event.currentTarget, async () => {
  await auth.currentUser.reload();
  if (!auth.currentUser.emailVerified) {
    const note = $('#verify-message');
    note.textContent = 'E-mail zatím potvrzený není. Klikněte na odkaz ve zprávě a zkuste to znovu.';
    note.hidden = false;
    return;
  }
  await auth.currentUser.getIdToken(true); // nový token už nese potvrzený e-mail
  await enter(auth.currentUser);
}));

let unsubscribers = [];
function stopListening() { unsubscribers.forEach(stop => stop()); unsubscribers = []; }

onAuthStateChanged(auth, async user => {
  stopListening();
  if (!user) { show('auth'); authMode('login'); return; }
  $$('[data-user-email]').forEach(node => { node.textContent = user.email; });
  if (!user.emailVerified) { show('verify'); return; }
  await enter(user);
});

async function enter(user) {
  show('loading');
  try {
    const snapshot = await getDoc(doc(db, 'admins', user.email));
    if (!snapshot.exists()) return show('denied');
  } catch { return show('denied'); }
  show('main');
  startListening();
}

// ---------- Stav aplikace ----------
const state = {
  categories: config.categories.map(item => ({ ...item })),
  categoryDraft: null,
  references: [],
  inquiries: [],
  admins: [],
  inquiryStatus: 'open',
  tab: 'inquiries'
};
const STATUSES = [
  ['new', 'Nová'], ['in_progress', 'Řeší se'], ['quoted', 'Nabídka odeslána'], ['won', 'Zakázka'], ['closed', 'Uzavřeno']
];
const statusLabel = Object.fromEntries(STATUSES);
const categoryLabel = key => (state.categories.find(item => item.key === key) || {}).label || key;

function startListening() {
  stopListening();
  const fail = error => { console.error(error); toast(explain(error), 'error'); };
  unsubscribers.push(onSnapshot(doc(db, 'settings', 'site'), snapshot => {
    const stored = snapshot.exists() ? snapshot.data().categories : null;
    state.categories = (Array.isArray(stored) && stored.length ? stored : config.categories).map(item => ({ key: item.key, label: item.label }));
    if (!state.categoryDraft) renderCategories();
    renderReferenceFilters(); renderReferences();
  }, fail));
  unsubscribers.push(onSnapshot(collection(db, 'references'), snapshot => {
    state.references = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort(compareReferences);
    renderReferences(); renderCategories();
  }, fail));
  unsubscribers.push(onSnapshot(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'), limit(500)), snapshot => {
    state.inquiries = snapshot.docs.map(item => ({ id: item.id, ...item.data({ serverTimestamps: 'estimate' }) }));
    renderInquiries();
  }, fail));
  unsubscribers.push(onSnapshot(collection(db, 'admins'), snapshot => {
    state.admins = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => a.id.localeCompare(b.id));
    renderAdmins();
  }, fail));
}
function compareReferences(a, b) {
  const first = b.sortDate || b.date || '', second = a.sortDate || a.date || '';
  if (first !== second) return first < second ? -1 : 1;
  return (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0);
}

// ---------- Záložky ----------
function openTab(name) {
  state.tab = name;
  $$('[data-tab]').forEach(button => button.toggleAttribute('aria-current', button.dataset.tab === name));
  $$('[data-tab]').forEach(button => { if (button.dataset.tab === name) button.setAttribute('aria-current', 'page'); });
  ['inquiries', 'references', 'categories', 'admins'].forEach(tab => { $(`#tab-${tab}`).hidden = tab !== name; });
  try { sessionStorage.setItem('crAdminTab', name); } catch { /* bez úložiště */ }
}
$$('[data-tab]').forEach(button => button.addEventListener('click', () => openTab(button.dataset.tab)));
try { const saved = sessionStorage.getItem('crAdminTab'); if (saved && $(`#tab-${saved}`)) openTab(saved); } catch { /* bez úložiště */ }

// =====================================================================
// POPTÁVKY
// =====================================================================
const inquiryServiceSelect = $('#inquiry-service');
inquiryServiceSelect.append(h('option', { value: 'all', text: 'Všechny služby' }),
  ...Object.entries(config.services).map(([key, label]) => h('option', { value: key, text: label })));
inquiryServiceSelect.addEventListener('change', renderInquiries);
$('#inquiry-search').addEventListener('input', renderInquiries);
const serviceLabel = inquiry => config.services[inquiry.service] || inquiry.serviceLabel || 'Poptávka';

function renderInquiries() {
  const counts = Object.fromEntries(STATUSES.map(([key]) => [key, 0]));
  state.inquiries.forEach(inquiry => { counts[inquiry.status] = (counts[inquiry.status] || 0) + 1; });
  const open = counts.new + counts.in_progress + counts.quoted;
  const chips = [['open', 'Otevřené', open], ...STATUSES.map(([key, label]) => [key, label, counts[key]]), ['all', 'Vše', state.inquiries.length]];
  $('#inquiry-status-filter').replaceChildren(...chips.map(([key, label, count]) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(state.inquiryStatus === key),
    onclick: () => { state.inquiryStatus = key; renderInquiries(); }
  }, [label, h('span', { text: String(count) })])));
  const badge = $('#badge-new');
  badge.textContent = counts.new; badge.hidden = !counts.new;
  document.title = `${counts.new ? `(${counts.new}) ` : ''}Administrace | Čistá řešení`;

  const needle = normalize($('#inquiry-search').value.trim());
  const service = inquiryServiceSelect.value;
  const rows = state.inquiries.filter(inquiry => {
    if (state.inquiryStatus === 'open' ? !['new', 'in_progress', 'quoted'].includes(inquiry.status) : state.inquiryStatus !== 'all' && inquiry.status !== state.inquiryStatus) return false;
    if (service !== 'all' && inquiry.service !== service) return false;
    return !needle || normalize([inquiry.name, inquiry.email, inquiry.phone, inquiry.location, inquiry.message, inquiry.manufacturer, inquiry.deviceType, inquiry.note].join(' ')).includes(needle);
  });
  const list = $('#inquiry-list');
  if (!rows.length) {
    list.replaceChildren(h('p', { class: 'empty', text: state.inquiries.length ? 'Tomuto výběru neodpovídá žádná poptávka.' : 'Zatím nepřišla žádná poptávka. Jakmile ji někdo na webu odešle, objeví se tady.' }));
    return;
  }
  list.replaceChildren(...rows.map(inquiry => h('button', { type: 'button', class: `row row-inquiry status-${inquiry.status}`, onclick: () => openInquiry(inquiry.id) }, [
    h('span', { class: `status-pill status-${inquiry.status}`, text: statusLabel[inquiry.status] || inquiry.status }),
    h('span', { class: 'row-main' }, [
      h('strong', { text: inquiry.name || 'Bez jména' }),
      h('span', { class: 'row-sub', text: [serviceLabel(inquiry), inquiry.location].filter(Boolean).join(' · ') })
    ]),
    h('span', { class: 'row-text', text: inquiry.message || '' }),
    h('span', { class: 'row-date', text: formatDate(inquiry.createdAt) })
  ])));
}

let activeInquiry = null;
const inquiryDialog = $('#inquiry-dialog');
$('#inquiry-status').append(...STATUSES.map(([key, label]) => h('option', { value: key, text: label })));
function openInquiry(id) {
  const inquiry = state.inquiries.find(item => item.id === id);
  if (!inquiry) return;
  activeInquiry = inquiry;
  $('#inquiry-title').textContent = inquiry.name || 'Poptávka';
  $('#inquiry-date').textContent = `Přijato ${formatDate(inquiry.createdAt)}`;
  const fields = [['Služba', serviceLabel(inquiry)], ['Obec', inquiry.location], ['Výrobce', inquiry.manufacturer], ['Typ zařízení', inquiry.deviceType],
    ['E-mail', inquiry.email], ['Telefon', inquiry.phone], ['Zpráva', inquiry.message]].filter(([, value]) => value);
  $('#inquiry-fields').replaceChildren(...fields.flatMap(([label, value]) => [h('dt', { text: label }), h('dd', { text: value })]));
  const subject = encodeURIComponent(`Re: Poptávka – ${serviceLabel(inquiry)}`);
  fill($('#inquiry-actions'),
    inquiry.email && h('a', { class: 'btn btn-small', href: `mailto:${encodeURIComponent(inquiry.email).replace('%40', '@')}?subject=${subject}`, text: 'Odpovědět e-mailem' }),
    inquiry.phone && h('a', { class: 'btn btn-small', href: `tel:${inquiry.phone.replace(/[^\d+]/g, '')}`, text: 'Zavolat' })
  );
  $('#inquiry-status').value = inquiry.status || 'new';
  $('#inquiry-note').value = inquiry.note || '';
  const mail = inquiry.mail || {};
  const mailText = {
    sent: 'Upozornění i potvrzení zákazníkovi byly odeslány e-mailem.',
    not_configured: 'Automatické e-maily zatím nejsou zapnuté – zákazník potvrzení nedostal.',
    error: 'E-mail se nepodařilo odeslat. Zákazníka raději kontaktujte přímo.',
    rate_limited: 'E-mail nebyl odeslán kvůli ochraně proti hromadnému zneužití formuláře.'
  };
  $('#inquiry-mail').textContent = mail.confirm === 'sent' && mail.notify === 'sent' ? mailText.sent
    : mailText[mail.confirm === 'sent' ? mail.notify : mail.confirm] || '';
  $('#inquiry-saved').textContent = '';
  inquiryDialog.showModal();
}
$('#inquiry-save').addEventListener('click', event => busy(event.currentTarget, async () => {
  try {
    await updateDoc(doc(db, 'inquiries', activeInquiry.id), {
      status: $('#inquiry-status').value, note: $('#inquiry-note').value.trim(),
      updatedAt: serverTimestamp(), updatedBy: auth.currentUser.email
    });
    toast('Poptávka uložena.');
    inquiryDialog.close();
  } catch (error) { toast(explain(error), 'error'); }
}));
$('#inquiry-delete').addEventListener('click', async () => {
  if (!await confirmDialog('Smazat poptávku?', `Poptávka od „${activeInquiry.name}“ se nenávratně odstraní.`)) return;
  try { await deleteDoc(doc(db, 'inquiries', activeInquiry.id)); inquiryDialog.close(); toast('Poptávka smazána.'); }
  catch (error) { toast(explain(error), 'error'); }
});
$('#export-inquiries').addEventListener('click', () => {
  const cell = value => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const header = ['Přijato', 'Stav', 'Služba', 'Jméno', 'E-mail', 'Telefon', 'Obec', 'Výrobce', 'Typ zařízení', 'Zpráva', 'Poznámka'];
  const lines = state.inquiries.map(inquiry => [formatDate(inquiry.createdAt), statusLabel[inquiry.status] || inquiry.status, serviceLabel(inquiry),
    inquiry.name, inquiry.email, inquiry.phone, inquiry.location, inquiry.manufacturer, inquiry.deviceType, inquiry.message, inquiry.note].map(cell).join(';'));
  const blob = new Blob(['﻿' + [header.map(cell).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = h('a', { href: URL.createObjectURL(blob), download: `poptavky-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
});

// =====================================================================
// REFERENCE
// =====================================================================
['#reference-search', '#reference-category', '#reference-state'].forEach(selector => $(selector).addEventListener('input', renderReferences));
function renderReferenceFilters() {
  const select = $('#reference-category');
  const chosen = select.value || 'all';
  select.replaceChildren(h('option', { value: 'all', text: 'Všechny kategorie' }), ...state.categories.map(item => h('option', { value: item.key, text: item.label })));
  select.value = [...select.options].some(option => option.value === chosen) ? chosen : 'all';
}
function renderReferences() {
  const needle = normalize($('#reference-search').value.trim());
  const category = $('#reference-category').value || 'all';
  const visibility = $('#reference-state').value;
  const rows = state.references.filter(ref => {
    if (category !== 'all' && !(ref.categories || []).includes(category)) return false;
    if (visibility === 'published' && !ref.published) return false;
    if (visibility === 'hidden' && ref.published) return false;
    if (visibility === 'featured' && !ref.featured) return false;
    return !needle || normalize([ref.title, ref.location, ref.summary].join(' ')).includes(needle);
  });
  $('#reference-count').textContent = `${rows.length} z ${state.references.length} referencí`;
  const list = $('#reference-list');
  if (!rows.length) {
    list.replaceChildren(h('p', { class: 'empty', text: state.references.length ? 'Tomuto výběru neodpovídá žádná reference.' : 'Zatím tu není žádná reference. Začněte tlačítkem „Přidat referenci“.' }));
    return;
  }
  list.replaceChildren(...rows.map(ref => {
    const cover = ref.cover && (ref.cover.thumb || ref.cover.url);
    return h('div', { class: `row row-reference${ref.published ? '' : ' is-hidden'}` }, [
      h('span', { class: 'row-thumb' }, cover ? h('img', { src: assetUrl(cover), alt: '', loading: 'lazy' }) : null),
      h('span', { class: 'row-main' }, [
        h('strong', { text: ref.title }),
        h('span', { class: 'row-sub', text: [ref.location, dateLabel(ref.date), (ref.categories || []).map(categoryLabel).join(', ')].filter(Boolean).join(' · ') })
      ]),
      h('span', { class: 'row-tags' }, [
        ref.featured && h('span', { class: 'tag tag-featured', text: '★ Na úvodu' }),
        h('span', { class: `tag ${ref.published ? 'tag-live' : 'tag-off'}`, text: ref.published ? 'Zveřejněno' : 'Skryto' })
      ]),
      h('span', { class: 'row-actions' }, [
        h('button', { type: 'button', class: 'btn btn-small', text: 'Upravit', 'aria-label': `Upravit: ${ref.title}`, onclick: () => openReference(ref.id) }),
        h('button', { type: 'button', class: 'btn btn-small btn-danger-ghost', text: 'Smazat', 'aria-label': `Smazat: ${ref.title}`, onclick: () => removeReference(ref) })
      ])
    ]);
  }));
}

// ----- Editor -----
const referenceDialog = $('#reference-dialog');
const editor = { id: null, isNew: true, original: null, photos: [], cover: null, processing: 0 };
const monthSelect = $('#ref-month'), yearSelect = $('#ref-year');
monthSelect.append(h('option', { value: '', text: '—' }), ...['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec']
  .map((name, index) => h('option', { value: String(index + 1).padStart(2, '0'), text: name })));
const thisYear = new Date().getFullYear();
yearSelect.append(h('option', { value: '', text: '—' }), ...Array.from({ length: thisYear - 1999 }, (_, index) => h('option', { value: String(thisYear - index), text: String(thisYear - index) })));

function factRow(fact = { label: '', value: '' }) {
  const row = h('div', { class: 'fact-row' }, [
    h('input', { 'aria-label': 'Název parametru', placeholder: 'Např. Technologie', maxlength: 60, value: fact.label }),
    h('input', { 'aria-label': 'Hodnota parametru', placeholder: 'Např. BC 4 OPTIMA', maxlength: 200, value: fact.value }),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Odebrat parametr', text: '×', onclick: () => row.remove() })
  ]);
  return row;
}
$('#ref-add-fact').addEventListener('click', () => { const row = factRow(); $('#ref-facts').append(row); $('input', row).focus(); });
$('#ref-featured').addEventListener('change', () => { $('#ref-headline-field').hidden = !$('#ref-featured').checked; });

function openReference(id) {
  const ref = id ? state.references.find(item => item.id === id) : null;
  editor.isNew = !ref;
  editor.id = ref ? ref.id : doc(collection(db, 'references')).id;
  editor.original = ref;
  editor.photos = (ref?.photos || []).map(photo => ({ ...photo }));
  editor.cover = ref?.cover ? { ...ref.cover } : null;
  editor.processing = 0;
  $('#reference-dialog-title').textContent = ref ? 'Upravit referenci' : 'Nová reference';
  $('#reference-legacy-note').hidden = !(ref && ref.legacyUrl && !ref.dynamic);
  $('#ref-title').value = ref?.title || '';
  $('#ref-location').value = ref?.location || '';
  monthSelect.value = ref?.date ? ref.date.slice(5) : '';
  yearSelect.value = ref?.date ? ref.date.slice(0, 4) : '';
  if (ref?.date && !yearSelect.value) { yearSelect.append(h('option', { value: ref.date.slice(0, 4), text: ref.date.slice(0, 4) })); yearSelect.value = ref.date.slice(0, 4); }
  const chosen = ref?.categories || [];
  $('#ref-categories').replaceChildren(...state.categories.map(item => h('label', { class: 'check' }, [
    h('input', { type: 'checkbox', value: item.key, checked: chosen.includes(item.key) }), h('span', { text: item.label })
  ])));
  $('#ref-summary').value = ref?.summary || '';
  $('#ref-description').value = ref?.description || '';
  $('#ref-facts').replaceChildren(...(ref?.facts || []).map(factRow));
  $('#ref-published').checked = ref ? !!ref.published : true;
  $('#ref-featured').checked = !!ref?.featured;
  $('#ref-headline').value = ref?.headline || '';
  $('#ref-headline-field').hidden = !ref?.featured;
  $('#reference-delete').hidden = !ref;
  $('#reference-progress').textContent = '';
  $('#ref-photo-status').textContent = '';
  $('#ref-files').value = '';
  renderPhotos();
  referenceDialog.showModal();
  $('#ref-title').focus();
}
$('#add-reference').addEventListener('click', () => openReference(null));

// Dosud nenahraný snímek nemá adresu, proto ho zastupuje adresa jeho náhledu.
const imageKey = image => image ? (image.url || image.preview || '') : '';
const sameImage = (a, b) => !!imageKey(a) && imageKey(a) === imageKey(b);
function renderPhotos() {
  const grid = $('#ref-photos');
  const standaloneCover = editor.cover && !editor.photos.some(photo => sameImage(photo, editor.cover));
  const coverIndex = standaloneCover ? -1 : Math.max(0, editor.photos.findIndex(photo => sameImage(photo, editor.cover)));
  fill(grid,
    standaloneCover ? h('figure', { class: 'photo is-cover is-standalone' }, [
      h('img', { src: assetUrl(editor.cover.thumb || editor.cover.url), alt: 'Původní úvodní fotografie' }),
      h('figcaption', { text: 'Úvodní (původní náhled)' })
    ]) : null,
    ...editor.photos.map((photo, index) => h('figure', { class: `photo${index === coverIndex ? ' is-cover' : ''}` }, [
      h('img', { src: photo.preview || assetUrl(photo.thumb || photo.url), alt: `Fotografie ${index + 1}` }),
      index === coverIndex ? h('figcaption', { text: 'Úvodní fotografie' }) : null,
      h('div', { class: 'photo-actions' }, [
        index !== coverIndex && h('button', { type: 'button', class: 'photo-cover', text: 'Nastavit jako úvodní', onclick: () => { editor.cover = pickImage(photo); renderPhotos(); } }),
        h('button', { type: 'button', 'aria-label': 'Posunout dopředu', title: 'Posunout dopředu', text: '←', disabled: index === 0, onclick: () => movePhoto(index, -1) }),
        h('button', { type: 'button', 'aria-label': 'Posunout dozadu', title: 'Posunout dozadu', text: '→', disabled: index === editor.photos.length - 1, onclick: () => movePhoto(index, 1) }),
        h('button', { type: 'button', class: 'photo-remove', 'aria-label': `Odebrat fotografii ${index + 1}`, title: 'Odebrat', text: '×', onclick: () => removePhoto(index) })
      ])
    ]))
  );
}
const pickImage = photo => ({ url: imageKey(photo), thumb: photo.thumb || '', w: photo.w, h: photo.h });
function movePhoto(index, step) {
  const [photo] = editor.photos.splice(index, 1);
  editor.photos.splice(index + step, 0, photo);
  renderPhotos();
}
function removePhoto(index) {
  const [photo] = editor.photos.splice(index, 1);
  if (photo.preview) URL.revokeObjectURL(photo.preview);
  if (sameImage(pickImage(photo), editor.cover)) editor.cover = null;
  renderPhotos();
}

// ----- Zpracování fotografií v prohlížeči (zmenšení a převod na JPEG) -----
async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* zkusíme <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}
function renderJpeg(source, maxSide, quality) {
  const width = source.width || source.naturalWidth, height = source.height || source.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve({ blob, w: canvas.width, h: canvas.height }) : reject(new Error('Převod selhal')), 'image/jpeg', quality));
}
async function addFiles(files) {
  const status = $('#ref-photo-status');
  const images = [...files].filter(file => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name));
  if (!images.length) return;
  const failed = [];
  editor.processing += images.length;
  for (const [index, file] of images.entries()) {
    status.textContent = `Připravuji fotografie… ${index + 1} / ${images.length}`;
    if (editor.photos.length >= 60) { failed.push(`${file.name} (nejvýše 60 fotografií)`); editor.processing--; continue; }
    try {
      const source = await decodeImage(file);
      const full = await renderJpeg(source, 2000, 0.86);
      const thumb = await renderJpeg(source, 720, 0.8);
      source.close?.();
      editor.photos.push({ file: { full: full.blob, thumb: thumb.blob }, preview: URL.createObjectURL(thumb.blob), w: full.w, h: full.h });
    } catch { failed.push(file.name); }
    editor.processing--;
    renderPhotos();
  }
  status.textContent = failed.length ? `Tyto soubory se nepodařilo načíst: ${failed.join(', ')}. Zkuste je uložit jako JPEG.` : '';
}
$('#ref-files').addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
const dropzone = $('#ref-dropzone');
['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.add('is-over'); }));
['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.remove('is-over'); }));
dropzone.addEventListener('drop', event => addFiles(event.dataTransfer.files));

// ----- Uložení -----
const photoPaths = photos => (photos || []).flatMap(photo => [photo.path, photo.thumbPath]).filter(Boolean);
$('#form-reference').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (editor.processing > 0) return toast('Počkejte prosím, až se připraví fotografie.', 'error');
  busy($('#reference-save'), async () => {
    const progress = $('#reference-progress');
    try {
      // 1) Nahrát nové fotografie.
      const pending = editor.photos.filter(photo => photo.file);
      for (const [index, photo] of pending.entries()) {
        progress.textContent = `Nahrávám fotografie… ${index + 1} / ${pending.length}`;
        const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        const meta = { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' };
        const fullRef = storageRef(storage, `references/${editor.id}/${name}.jpg`);
        const thumbRef = storageRef(storage, `references/${editor.id}/${name}_thumb.jpg`);
        await uploadBytes(fullRef, photo.file.full, meta);
        await uploadBytes(thumbRef, photo.file.thumb, meta);
        const wasCover = sameImage(pickImage(photo), editor.cover);
        photo.url = await getDownloadURL(fullRef);
        photo.thumb = await getDownloadURL(thumbRef);
        photo.path = fullRef.fullPath; photo.thumbPath = thumbRef.fullPath;
        delete photo.file;
        if (wasCover) editor.cover = pickImage(photo);
      }
      progress.textContent = 'Ukládám…';

      // 2) Sestavit záznam.
      const original = editor.original;
      const photos = editor.photos.map(photo => ({
        url: photo.url, thumb: photo.thumb || '', w: photo.w || 0, h: photo.h || 0,
        ...(photo.path ? { path: photo.path, thumbPath: photo.thumbPath || '' } : {}), ...(photo.alt ? { alt: photo.alt } : {})
      }));
      const standaloneCover = editor.cover && !photos.some(photo => sameImage(photo, editor.cover));
      const keepStandalone = standaloneCover && original && sameImage(original.cover, editor.cover);
      const coverPhoto = photos.find(photo => sameImage(photo, editor.cover)) || (keepStandalone ? null : photos[0]);
      const cover = coverPhoto ? { url: coverPhoto.url, thumb: coverPhoto.thumb, w: coverPhoto.w, h: coverPhoto.h } : keepStandalone ? editor.cover : null;
      const date = monthSelect.value && yearSelect.value ? `${yearSelect.value}-${monthSelect.value}` : '';
      const categories = $$('#ref-categories input:checked').map(input => input.value);
      const facts = $$('#ref-facts .fact-row').map(row => { const [label, value] = $$('input', row).map(input => input.value.trim()); return { label, value }; })
        .filter(fact => fact.label && fact.value);
      const description = $('#ref-description').value.replace(/\r\n/g, '\n').trim();
      const summary = $('#ref-summary').value.trim() || description.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').slice(0, 180);
      const data = {
        title: $('#ref-title').value.trim(), location: $('#ref-location').value.trim(), date,
        sortDate: date || original?.sortDate || new Date().toISOString().slice(0, 7),
        categories, summary, description, facts, photos, cover,
        published: $('#ref-published').checked, featured: $('#ref-featured').checked,
        headline: $('#ref-featured').checked ? $('#ref-headline').value.trim() : (original?.headline || ''),
        legacyUrl: original?.legacyUrl || null,
        updatedAt: serverTimestamp(), updatedBy: auth.currentUser.email
      };
      // Původní reference přejde na nový detail, jakmile se změní její obsah.
      const contentOf = item => JSON.stringify([item.title, item.location || '', item.date || '', item.description || '', item.categories || [],
        (item.facts || []).map(fact => [fact.label, fact.value]), (item.photos || []).map(photo => photo.url)]);
      data.dynamic = !original || !original.legacyUrl || !!original.dynamic || contentOf(original) !== contentOf(data);
      // Poznámka k původní úvodní fotografii (např. ilustrační vyobrazení) platí jen pro ni.
      data.coverNote = original?.coverNote && sameImage(original.cover, cover) ? original.coverNote : '';
      if (!original) data.createdAt = serverTimestamp();

      await setDoc(doc(db, 'references', editor.id), data, { merge: true });

      // 3) Odstranit ze storage fotografie, které už reference nepoužívá.
      const kept = new Set(photoPaths(photos));
      await Promise.all(photoPaths(original?.photos).filter(path => !kept.has(path)).map(path => deleteObject(storageRef(storage, path)).catch(() => {})));

      editor.photos.forEach(photo => { if (photo.preview) URL.revokeObjectURL(photo.preview); });
      referenceDialog.close();
      toast(data.published ? 'Reference uložena a je vidět na webu.' : 'Reference uložena (skrytá).');
    } catch (error) {
      console.error(error);
      progress.textContent = '';
      toast(explain(error), 'error');
    }
  });
});

async function removeReference(ref) {
  if (!await confirmDialog('Smazat referenci?', `„${ref.title}“ se odstraní z webu i s fotografiemi. Pokud ji chcete jen dočasně schovat, použijte raději přepínač „Zveřejnit na webu“.`)) return false;
  try {
    await deleteDoc(doc(db, 'references', ref.id));
    await Promise.all(photoPaths(ref.photos).map(path => deleteObject(storageRef(storage, path)).catch(() => {})));
    toast('Reference smazána.');
    return true;
  } catch (error) { toast(explain(error), 'error'); return false; }
}
$('#reference-delete').addEventListener('click', async () => {
  if (editor.original && await removeReference(editor.original)) referenceDialog.close();
});

// =====================================================================
// KATEGORIE
// =====================================================================
function slug(label) {
  return normalize(label).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || `kat-${Date.now().toString(36)}`;
}
function renderCategories() {
  const items = state.categoryDraft || state.categories;
  const usage = key => state.references.filter(ref => (ref.categories || []).includes(key)).length;
  $('#category-list').replaceChildren(...items.map((item, index) => {
    const used = usage(item.key);
    return h('div', { class: 'category-row' }, [
      h('input', { value: item.label, maxlength: 40, 'aria-label': `Název kategorie ${item.label}`, oninput: event => { draftCategories()[index].label = event.target.value; markCategoriesDirty(); } }),
      h('span', { class: 'category-usage', text: used ? `${used} ${used === 1 ? 'reference' : used < 5 ? 'reference' : 'referencí'}` : 'nepoužito' }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Posunout výš', text: '↑', disabled: index === 0, onclick: () => moveCategory(index, -1) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Posunout níž', text: '↓', disabled: index === items.length - 1, onclick: () => moveCategory(index, 1) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Smazat kategorii ${item.label}`, text: '×', disabled: used > 0, title: used ? 'Kategorii používají reference' : 'Smazat', onclick: () => { draftCategories().splice(index, 1); markCategoriesDirty(); renderCategories(); } })
    ]);
  }));
}
function draftCategories() {
  if (!state.categoryDraft) state.categoryDraft = state.categories.map(item => ({ ...item }));
  return state.categoryDraft;
}
function markCategoriesDirty() { $('#save-categories').disabled = false; $('#categories-note').textContent = 'Neuložené změny'; }
function moveCategory(index, step) {
  const items = draftCategories();
  const [item] = items.splice(index, 1); items.splice(index + step, 0, item);
  markCategoriesDirty(); renderCategories();
}
$('#form-category').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#category-new');
  const label = input.value.trim();
  if (!label) return;
  const items = draftCategories();
  let key = slug(label);
  while (items.some(item => item.key === key)) key += '-2';
  items.push({ key, label });
  input.value = '';
  markCategoriesDirty(); renderCategories();
});
$('#save-categories').addEventListener('click', async event => {
  const button = event.currentTarget;
  const saved = await busy(button, async () => {
  const items = draftCategories().map(item => ({ key: item.key, label: item.label.trim() })).filter(item => item.label);
  if (!items.length) return toast('Musí zůstat alespoň jedna kategorie.', 'error');
  try {
    await setDoc(doc(db, 'settings', 'site'), { categories: items, updatedAt: serverTimestamp() }, { merge: true });
    state.categoryDraft = null;
    $('#categories-note').textContent = 'Uloženo';
    toast('Kategorie uloženy.');
    return true;
  } catch (error) { toast(explain(error), 'error'); }
  });
  if (saved) button.disabled = true;
});

// =====================================================================
// SPRÁVCI
// =====================================================================
function renderAdmins() {
  const me = auth.currentUser?.email;
  $('#admin-list').replaceChildren(...state.admins.map(admin => h('div', { class: 'row row-admin' }, [
    h('span', { class: 'row-main' }, [h('strong', { text: admin.id }), admin.id === me ? h('span', { class: 'row-sub', text: 'to jste vy' }) : null]),
    h('span', { class: 'row-actions' }, admin.id === me ? null : h('button', {
      type: 'button', class: 'btn btn-small btn-danger-ghost', text: 'Odebrat přístup', onclick: async () => {
        if (!await confirmDialog('Odebrat přístup?', `${admin.id} se už do administrace nepřihlásí.`, 'Odebrat')) return;
        try { await deleteDoc(doc(db, 'admins', admin.id)); toast('Přístup odebrán.'); } catch (error) { toast(explain(error), 'error'); }
      }
    }))
  ])));
}
$('#form-admin').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const input = $('#admin-new');
  const email = input.value.trim().toLowerCase();
  busy($('button', form), async () => {
    try {
      await setDoc(doc(db, 'admins', email), { email, addedAt: serverTimestamp(), addedBy: auth.currentUser.email });
      input.value = '';
      toast(`Přístup přidán. ${email} si nastaví heslo přes „První přihlášení“.`);
    } catch (error) { toast(explain(error), 'error'); }
  });
});

// ---------- Zavírání dialogů ----------
$$('dialog [data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
