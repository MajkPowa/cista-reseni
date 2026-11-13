/*
 * Čistá řešení — CRM.
 * Zákazníci, zařízení, zakázky, úkoly, servisní programy a poptávky z webu.
 * Přihlášení i seznam uživatelů jsou společné se Správou webu (Firebase Auth + admins/{e-mail}).
 * Bez sestavovacího kroku: čistý ES modul. Data se načtou jednou přes onSnapshot
 * a filtrují se v paměti; díky místní mezipaměti Firestore jsou změny vidět okamžitě.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {
  getStorage, connectStorageEmulator, ref as storageRef, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-storage.js';

const config = window.CR_CMS;
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
auth.languageCode = 'cs';

// Lokální vývoj: na localhostu lze CRM přepnout na Firebase emulátory.
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
  node.append(...present([children]));
  return node;
}
// Děti smějí být i vnořená pole a podmíněné hodnoty; null/false/'' se vyřadí
// (replaceChildren by z nich jinak udělal text „null“).
const present = children => children.flat(Infinity).filter(child => child != null && child !== false && child !== '');
const fill = (node, ...children) => node.replaceChildren(...present(children));
const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clean = value => String(value ?? '').trim();
const toDate = value => value && typeof value.toDate === 'function' ? value.toDate() : null;
const millis = value => toDate(value)?.getTime() || 0;
const collator = new Intl.Collator('cs', { sensitivity: 'base', numeric: true });
const byName = (a, b) => collator.compare(a.name || '', b.name || '');
const plural = (count, one, few, many) => count === 1 ? one : count >= 2 && count <= 4 ? few : many;
const shortUser = email => String(email || '').split('@')[0];

// ----- Ikony (mřížka 24, tah 1,7, zaoblené konce) -----
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  plus: ['M12 5v14', 'M5 12h14'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  chevron: ['m9 6 6 6-6 6'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4z', 'm13.5 6.5 4 4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v5', 'M14 11v5'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'],
  mail: ['M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z', 'm3.5 7.5 8.5 6 8.5-6'],
  pin: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  calendar: ['M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  inbox: ['M3 13h5l1.5 3h5L16 13h5', 'M5.5 5h13L21 13v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5l2.5-8z'],
  tasks: ['M4 6.5 5.5 8 8 5', 'M4 12.5 5.5 14 8 11', 'M4 18.5 5.5 20 8 17', 'M11 7h9', 'M11 13h9', 'M11 19h9'],
  jobs: ['M9 4h6v3H9z', 'M15 5.5h3a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1h3', 'M9 12h6', 'M9 16h4'],
  wrench: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
  drop: ['M12 3.5s6 6 6 10.5a6 6 0 0 1-12 0c0-4.5 6-10.5 6-10.5z'],
  note: ['M5 4h14a1 1 0 0 1 1 1v10l-5 5H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M15 20v-4a1 1 0 0 1 1-1h4', 'M8 9h8', 'M8 13h4'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'],
  help: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9.5 9.3a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.2 1-1.2 1.8', 'M12 17h.01'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 20.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5'],
  download: ['M12 4v11', 'm7 11 5 5 5-5', 'M5 20h14'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  logout: ['M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4', 'm15 8 4 4-4 4', 'M19 12H9'],
  clip: ['M20 11.5 12.5 19a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3']
};
function icon(name, className = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const shape of ICONS[name] || []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', shape);
    svg.append(path);
  }
  return svg;
}
const smallIcon = name => icon(name, 'icon icon-small');

// ----- Data, měna a čísla -----
const pad = number => String(number).padStart(2, '0');
const isDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const isoDay = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDay = iso => { const [year, month, day] = iso.split('-').map(Number); return new Date(year, month - 1, day); };
const today = () => isoDay(new Date());
const dueKey = value => isDay(value) ? value : '9999-12-31'; // bez termínu až na konec
const dayFormat = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
const longDayFormat = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
const dateTimeFormat = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' });
const formatDay = iso => isDay(iso) ? dayFormat.format(parseDay(iso)) : '';
const formatDateTime = value => { const date = toDate(value); return date ? dateTimeFormat.format(date) : '—'; };
const formatMonth = value => /^\d{4}-\d{2}$/.test(value || '') ? `${Number(value.slice(5))}/${value.slice(0, 4)}` : '';
const dayDiff = iso => Math.round((parseDay(iso) - parseDay(today())) / 86400000);
function dueLabel(iso) {
  if (!isDay(iso)) return '';
  const diff = dayDiff(iso);
  return diff === 0 ? 'Dnes' : diff === 1 ? 'Zítra' : diff === -1 ? 'Včera' : formatDay(iso);
}
function addDays(iso, days) { const date = parseDay(iso); date.setDate(date.getDate() + days); return isoDay(date); }
// Přičte měsíce a den zarovná na konec kratšího měsíce (31. 8. + 6 měsíců = 28. 2.).
function addMonths(iso, months) {
  const date = parseDay(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return isoDay(date);
}
const moneyFormat = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
const money = value => `${moneyFormat.format(Number(value) || 0)} Kč`;
function fileSize(bytes) {
  const size = Number(bytes) || 0;
  if (!size) return '';
  return size >= 1048576 ? `${(size / 1048576).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(size / 1024))} kB`;
}

// ----- Oznámení, chyby a potvrzení (žádné nativní alert/confirm/prompt) -----
function toast(message, kind = 'ok') {
  const node = h('div', { class: `toast toast-${kind}`, text: message });
  $('#toasts').append(node);
  setTimeout(() => node.remove(), kind === 'ok' ? 3500 : 8000);
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
    'permission-denied': 'K této akci nemáte oprávnění. Změna se neuložila.',
    'not-found': 'Záznam už neexistuje – nejspíš ho mezitím někdo smazal.',
    'unavailable': 'Služba je dočasně nedostupná. Zkuste to znovu.',
    'deadline-exceeded': 'Spojení je příliš pomalé. Zkuste to znovu.',
    'resource-exhausted': 'Služba je přetížená. Zkuste to za chvíli.',
    'storage/unauthorized': 'K příloze nemáte oprávnění.',
    'storage/object-not-found': 'Příloha už není uložená.'
  };
  return messages[code] || 'Něco se nepovedlo. Zkuste to prosím znovu.';
}
function confirmDialog(title, text, okLabel = 'Smazat', { danger = true, cancel = true } = {}) {
  const dialog = $('#confirm-dialog');
  const yes = $('[data-confirm="yes"]', dialog);
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  yes.textContent = okLabel;
  yes.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  $('[data-confirm="no"]', dialog).hidden = !cancel;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true }));
}
$$('[data-confirm]').forEach(button => button.addEventListener('click', () => $('#confirm-dialog').close(button.dataset.confirm)));
const infoDialog = (title, text) => confirmDialog(title, text, 'Rozumím', { danger: false, cancel: false });

async function busy(button, task) {
  if (button.disabled) return;
  button.disabled = true; button.setAttribute('aria-busy', 'true');
  try { return await task(); } finally { button.disabled = false; button.removeAttribute('aria-busy'); }
}

// ---------- Přihlašovací obrazovky ----------
const views = ['loading', 'auth', 'verify', 'denied', 'main'];
function show(name) {
  views.forEach(view => { $(`#view-${view}`).hidden = view !== name; });
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
document.addEventListener('click', event => { if (event.target.closest('[data-sign-out]')) signOut(auth); });
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
  resetData();
  if (!user) { show('auth'); authMode('login'); return; }
  $$('[data-user-email]').forEach(node => { node.textContent = user.email; });
  if (!user.emailVerified) { show('verify'); return; }
  await enter(user);
});

// Přístup má ten, kdo má ověřený e-mail a záznam v admins/{e-mail}.
async function enter(user) {
  show('loading');
  try {
    const snapshot = await getDoc(doc(db, 'admins', user.email));
    if (!snapshot.exists()) return show('denied');
  } catch { return show('denied'); }
  show('main');
  startListening();
  route();
}

// =====================================================================
// STAV APLIKACE A ČÍSELNÍKY
// =====================================================================
const state = { customers: [], devices: [], jobs: [], tasks: [], activities: [], inquiries: [], admins: [] };
const loaded = new Set();
const ready = () => loaded.size === Object.keys(state).length;
// Filtry a hledání přežijí přechod mezi obrazovkami.
const ui = { jobStage: 'open', jobSearch: '', customerSearch: '', customerType: 'all', program: 'all', taskFilter: 'open', inquiryFilter: 'open' };

const STAGES = [['lead', 'Poptávka'], ['quote', 'Nabídka'], ['scheduled', 'Naplánováno'], ['done', 'Hotovo'], ['invoiced', 'Fakturováno'], ['lost', 'Nerealizováno']];
const STAGE_LABEL = Object.fromEntries(STAGES);
const NEXT_STAGE = { lead: 'quote', quote: 'scheduled', scheduled: 'done', done: 'invoiced' };
const CLOSED_STAGES = ['done', 'invoiced', 'lost'];
const CUSTOMER_TYPES = [['household', 'Domácnost'], ['company', 'Firma'], ['municipality', 'Obec'], ['other', 'Jiné']];
const CUSTOMER_TYPE_LABEL = Object.fromEntries(CUSTOMER_TYPES);
const PROGRAMS = [['none', 'Bez programu'], ['standard', 'STANDARD'], ['premium', 'PREMIUM']];
const PROGRAM_LABEL = Object.fromEntries(PROGRAMS);
const PROGRAM_MONTHS = { standard: 6, premium: 3 }; // 2, resp. 4 návštěvy ročně
const ACTIVITY_KINDS = [['note', 'Poznámka'], ['call', 'Telefonát'], ['visit', 'Návštěva']];
const ACTIVITY_LABEL = { ...Object.fromEntries(ACTIVITY_KINDS), system: 'Systém' };
const ACTIVITY_ICON = { note: 'note', call: 'phone', visit: 'pin', system: 'info' };
const TASK_KINDS = [['task', 'Úkol'], ['service_visit', 'Servisní návštěva']];
const INQUIRY_STATUSES = [['new', 'Nová'], ['in_progress', 'Řeší se'], ['quoted', 'Nabídka odeslána'], ['won', 'Zakázka'], ['closed', 'Uzavřeno']];
const INQUIRY_STATUS_LABEL = Object.fromEntries(INQUIRY_STATUSES);
const INQUIRY_KIND_LABEL = { realizace: 'Realizace', servis: 'Servis', pravidelny: 'Pravidelný servis' };
const SERVICES = Object.entries(config.services);
const serviceName = key => config.services[key] || '';
const inquiryService = inquiry => config.services[inquiry.service] || inquiry.serviceLabel || 'Poptávka';

const me = () => auth.currentUser?.email || '';
const find = (name, id) => id ? state[name].find(item => item.id === id) || null : null;
const isOpenJob = job => !CLOSED_STAGES.includes(job.stage);
const deviceLabel = device => [device.manufacturer, device.model].filter(Boolean).join(' ') || 'Zařízení';
const hasService = device => (device.program && device.program !== 'none') || isDay(device.nextServiceAt);
const openVisit = device => state.tasks.find(task => task.kind === 'service_visit' && !task.done && task.deviceId === device.id) || null;
const jobOfInquiry = inquiry => state.jobs.find(job => job.inquiryId === inquiry.id) || null;
function serviceDevices() {
  return state.devices.filter(hasService).sort((a, b) => dueKey(a.nextServiceAt).localeCompare(dueKey(b.nextServiceAt)) || collator.compare(a.customerName || '', b.customerName || ''));
}
const compareTasks = (a, b) => dueKey(a.dueDate).localeCompare(dueKey(b.dueDate)) || millis(a.createdAt) - millis(b.createdAt);
const compareJobs = (a, b) => dueKey(a.dueDate).localeCompare(dueKey(b.dueDate)) || millis(b.updatedAt) - millis(a.updatedAt);

function resetData() {
  for (const name of Object.keys(state)) state[name] = [];
  loaded.clear();
  current = null;
  fill($('#screen')); // po odhlášení nesmí v paměti stránky zůstat cizí data
}

function startListening() {
  stopListening();
  loaded.clear();
  let warned = false;
  const sources = {
    customers: collection(db, 'customers'),
    devices: collection(db, 'devices'),
    jobs: collection(db, 'jobs'),
    tasks: collection(db, 'tasks'),
    activities: collection(db, 'activities'),
    inquiries: query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'), limit(500)),
    admins: collection(db, 'admins')
  };
  for (const [name, source] of Object.entries(sources)) {
    unsubscribers.push(onSnapshot(source, snapshot => {
      state[name] = snapshot.docs.map(item => ({ id: item.id, ...item.data({ serverTimestamps: 'estimate' }) }));
      arrived(name);
    }, error => {
      console.error(name, error);
      // Jedna hláška stačí; aplikace se i tak otevře s tím, co se načíst podařilo.
      if (!warned) { warned = true; toast(error.code === 'permission-denied' ? 'Část dat se nepodařilo načíst – chybí oprávnění.' : explain(error), 'error'); }
      arrived(name);
    }));
  }
}
let refreshQueued = false;
function arrived(name) {
  const wasReady = ready();
  loaded.add(name);
  if (!ready()) return;
  if (!wasReady) return route();
  // Jedna dávka zápisů mění více kolekcí najednou; překreslíme až jednou.
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => { refreshQueued = false; refresh(); });
}
function refresh() {
  if ($('#view-main').hidden) return;
  current?.update();
  updateBadges();
}

window.addEventListener('offline', () => toast('Jste bez připojení. Změny se odešlou, jakmile budete zase online.', 'warn'));
window.addEventListener('online', () => toast('Připojení je zpět.'));

// =====================================================================
// ZÁPISY DO DATABÁZE
// =====================================================================
const refOf = (name, id) => doc(db, name, id);
const newId = name => doc(collection(db, name)).id;
const stamp = () => ({ updatedAt: serverTimestamp(), updatedBy: me() });
const created = () => ({ createdAt: serverTimestamp(), ...stamp() });
const activityData = (customerId, kind, text, jobId = '') => ({ customerId, jobId, kind, text, at: serverTimestamp(), by: me() });
const addActivity = (customerId, kind, text, jobId = '') => batch => batch.set(refOf('activities', newId('activities')), activityData(customerId, kind, text, jobId));

// Více zápisů najednou: buď projdou všechny, nebo žádný (dávka po nejvýše 400 operacích).
async function writeAll(operations) {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = writeBatch(db);
    operations.slice(index, index + 400).forEach(apply => apply(batch));
    await batch.commit();
  }
}
// Zápis neblokuje obsluhu: změna je díky místní mezipaměti vidět hned a na server se doručí na pozadí.
// Když ji server odmítne, obrazovka se sama vrátí a uživatel dostane hlášku.
function commit(work, okMessage = '') {
  if (navigator.onLine === false) toast('Jste bez připojení. Změna se odešle, jakmile budete online.', 'warn');
  else if (okMessage) toast(okMessage);
  Promise.resolve(work).catch(error => { console.error(error); toast(explain(error), 'error'); });
}

// =====================================================================
// FORMULÁŘOVÝ LIST (spodní list na telefonu, boční panel na počítači)
// =====================================================================
const sheet = $('#sheet');
let sheetHandlers = {};
// Otevřený list má vlastní krok v historii, aby ho tlačítko Zpět na telefonu zavřelo.
let sheetInHistory = false;
let pendingBack = null;

function openSheet({ title, body, submitLabel = 'Uložit', onSubmit, onDelete = null, deleteLabel = 'Smazat', focus = null }) {
  sheetHandlers = { onSubmit, onDelete };
  $('#sheet-title').textContent = title;
  fill($('#sheet-body'), body);
  $('#sheet-submit').textContent = submitLabel;
  const remove = $('#sheet-delete');
  remove.hidden = !onDelete;
  remove.textContent = deleteLabel;
  if (!sheet.open) {
    sheet.showModal();
    const push = () => {
      if (!sheet.open || sheetInHistory) return;
      try { history.pushState({ sheet: true }, ''); sheetInHistory = true; } catch { /* bez historie */ }
    };
    if (pendingBack) pendingBack.then(push); else push();
  }
  $('#sheet-body').scrollTop = 0;
  if (focus) focus.focus();
}
function releaseSheetHistory() {
  if (!sheetInHistory) return;
  sheetInHistory = false;
  pendingBack = new Promise(resolve => {
    let timer = 0;
    const done = () => { window.removeEventListener('popstate', done); clearTimeout(timer); pendingBack = null; resolve(); };
    timer = setTimeout(done, 400); // pojistka, kdyby prohlížeč událost neposlal
    window.addEventListener('popstate', done);
    history.back();
  });
}
function closeSheet() {
  if (sheet.open) sheet.close();
  sheetHandlers = {};
  fill($('#sheet-body'));
  releaseSheetHistory();
}
// Zavření klávesou Esc: úklid proběhne až tady.
sheet.addEventListener('close', () => { if (!sheet.open) closeSheet(); });
window.addEventListener('popstate', () => {
  if (!sheetInHistory) return;
  sheetInHistory = false; // krok historie už je pryč, list jen zavřeme
  closeSheet();
});
$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet-cancel').addEventListener('click', closeSheet);
// onSubmit vrací false (formulář zůstane otevřený), adresu (po zavření se na ni přejde) nebo nic.
$('#sheet-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const result = sheetHandlers.onSubmit?.();
  if (result === false) return;
  closeSheet();
  if (typeof result === 'string') go(result);
});
$('#sheet-delete').addEventListener('click', async () => {
  const result = await sheetHandlers.onDelete?.();
  if (!result) return;
  closeSheet();
  if (typeof result === 'string') go(result);
});

// ----- Stavebnice formulářů -----
let controlCount = 0;
function control(label, element, hint = '') {
  if (!element.id) element.id = `field-${++controlCount}`;
  return h('div', { class: 'field' }, [h('label', { for: element.id, text: label }), element, hint && h('p', { class: 'hint', text: hint })]);
}
const textInput = (value = '', attributes = {}) => h('input', { type: 'text', autocomplete: 'off', maxlength: 200, value: value || '', ...attributes });
const dateInput = (value = '') => h('input', { type: 'date', value: isDay(value) ? value : '' });
function textarea(value = '', attributes = {}) {
  const node = h('textarea', { rows: 3, maxlength: 4000, ...attributes });
  node.value = value || '';
  return node;
}
function selectOf(options, value = '', attributes = {}) {
  const node = h('select', attributes, options.map(([key, label]) => h('option', { value: key, text: label })));
  // Neznámou uloženou hodnotu nezahodíme, jen ji ukážeme tak, jak je.
  if (value && !options.some(([key]) => key === value)) node.append(h('option', { value, text: value }));
  node.value = value;
  return node;
}
function assigneeSelect(value = '') {
  return selectOf([['', 'Nepřiřazeno'], ...state.admins.map(admin => [admin.id, admin.id])], value || '');
}
const row = (...fields) => h('div', { class: 'field-row' }, fields);

// Filtrovací štítky; po překreslení vrátí fokus na vybraný štítek.
function chipRow(node, items, active, onPick) {
  const hadFocus = node.contains(document.activeElement);
  fill(node, items.map(([key, label, count]) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(active === key), onclick: () => onPick(key)
  }, [label, count != null && h('span', { text: String(count) })])));
  if (hadFocus) $('[aria-pressed="true"]', node)?.focus();
}

// Výběr zákazníka s hledáním; umí i založit nového přímo ve formuláři.
const customerHaystack = customer => normalize([customer.name, customer.contactPerson, customer.city, customer.address, customer.phone, customer.email].join(' ')) + ' ' + String(customer.phone || '').replace(/\s/g, '');
function customerPicker({ id = '', allowNew = false, required = false, onChange = () => {} } = {}) {
  let chosen = find('customers', id);
  let draft = false;
  const box = h('div', { class: 'picker' });
  const search = h('input', { type: 'search', autocomplete: 'off', placeholder: 'Hledat jméno, obec, telefon…', 'aria-label': 'Hledat zákazníka' });
  const results = h('div', { class: 'picker-results' });
  const message = h('p', { class: 'form-message', role: 'alert', hidden: true });
  const fields = {
    name: textInput('', { required: true, maxlength: 160 }),
    phone: h('input', { type: 'tel', autocomplete: 'off', maxlength: 40 }),
    email: h('input', { type: 'email', autocomplete: 'off', maxlength: 200 }),
    city: textInput('', { maxlength: 120 })
  };
  const matches = () => {
    const needle = normalize(search.value.trim());
    return state.customers.filter(customer => !needle || customerHaystack(customer).includes(needle)).sort(byName).slice(0, 6);
  };
  const pick = customer => { chosen = customer; render(); onChange(); };
  function renderResults() {
    const typed = search.value.trim();
    const found = matches();
    fill(results,
      found.map(customer => h('button', { type: 'button', class: 'picker-option', onclick: () => pick(customer) }, [
        h('strong', { text: customer.name }),
        h('span', { class: 'row-sub', text: [customer.city, customer.phone].filter(Boolean).join(' · ') })
      ])),
      !found.length && h('p', { class: 'hint', text: typed ? 'Tomuto hledání neodpovídá žádný zákazník.' : 'Zatím nemáte žádného zákazníka.' }),
      allowNew && h('button', { type: 'button', class: 'picker-option picker-new', onclick: () => { draft = true; fields.name.value = typed; render(); fields.name.focus(); } }, [
        smallIcon('plus'), h('span', { text: typed ? `Nový zákazník „${typed}“` : 'Nový zákazník' })
      ])
    );
  }
  function render() {
    message.hidden = true;
    if (chosen) {
      fill(box, h('div', { class: 'picker-chosen' }, [
        h('span', { class: 'row-main' }, [h('strong', { text: chosen.name }), h('span', { class: 'row-sub', text: [chosen.city, chosen.phone].filter(Boolean).join(' · ') })]),
        h('button', { type: 'button', class: 'btn btn-small', text: 'Změnit', onclick: () => { chosen = null; render(); search.focus(); onChange(); } })
      ]), message);
    } else if (draft) {
      fill(box, h('div', { class: 'picker-draft' }, [
        h('p', { class: 'picker-draft-title', text: 'Nový zákazník' }),
        control('Jméno nebo název', fields.name),
        row(control('Telefon', fields.phone), control('E-mail', fields.email)),
        control('Obec', fields.city),
        h('button', { type: 'button', class: 'link', text: 'Vybrat existujícího zákazníka', onclick: () => { draft = false; render(); search.focus(); } })
      ]), message);
    } else {
      fill(box, search, results, message);
      renderResults();
    }
  }
  search.addEventListener('input', renderResults);
  // Enter v hledání nesmí odeslat celý formulář; vybere první nalezený záznam.
  search.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const [first] = matches();
    if (first && search.value.trim()) pick(first);
  });
  render();
  return {
    node: h('fieldset', { class: 'field' }, [h('legend', { text: required ? 'Zákazník' : 'Zákazník (nepovinné)' }), box]),
    value: () => ({
      id: chosen?.id || '', name: chosen?.name || '',
      draft: !chosen && draft ? { name: clean(fields.name.value), phone: clean(fields.phone.value), email: clean(fields.email.value), city: clean(fields.city.value) } : null
    }),
    validate() {
      if (!required || chosen || draft) return true;
      message.textContent = allowNew ? 'Vyberte zákazníka, nebo založte nového.' : 'Vyberte zákazníka.';
      message.hidden = false;
      search.focus();
      return false;
    }
  };
}
const blankCustomer = () => ({ name: '', type: 'household', contactPerson: '', phone: '', email: '', address: '', city: '', note: '' });

// =====================================================================
// SPOLEČNÉ STAVEBNÍ PRVKY OBRAZOVEK
// =====================================================================
function section(title, body, action = null) {
  return h('section', { class: 'section' }, [h('div', { class: 'section-head' }, [h('h2', { text: title }), action]), body]);
}
const moreLink = (label, href) => h('a', { class: 'section-link', href }, [label, smallIcon('chevron')]);
const addButton = (label, onclick) => h('button', { type: 'button', class: 'btn btn-small', onclick }, [smallIcon('plus'), label]);
function emptyState(message, actionLabel = '', onclick = null) {
  return h('div', { class: 'empty' }, [h('p', { text: message }), actionLabel && h('button', { type: 'button', class: 'btn btn-primary', text: actionLabel, onclick })]);
}
const stagePill = stage => h('span', { class: `pill stage-${stage || 'lead'}`, text: STAGE_LABEL[stage] || stage || '—' });
const programBadge = program => h('span', { class: `pill program-${program || 'none'}`, text: PROGRAM_LABEL[program] || PROGRAM_LABEL.none });
const statusPill = status => h('span', { class: `pill status-${status || 'new'}`, text: INQUIRY_STATUS_LABEL[status] || status || '—' });
// Definiční seznam jen z vyplněných hodnot; hodnota může být text nebo hotový prvek.
function detailList(node, rows) {
  const filled = rows.filter(([, value]) => value);
  fill(node, filled.flatMap(([label, value]) => [h('dt', { text: label }), h('dd', {}, value)]));
  node.hidden = !filled.length;
}
const telHref = phone => `tel:${String(phone).replace(/[^\d+]/g, '')}`;
const mailHref = email => `mailto:${encodeURIComponent(String(email).trim()).replace('%40', '@')}`;
const mapHref = place => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
// Velké tlačítko rychlé akce; bez údaje zůstane vidět, ale neaktivní.
function bigAction(label, iconName, href, external = false) {
  const content = [icon(iconName), h('span', { text: label })];
  return href
    ? h('a', { class: 'big-action', href, target: external && '_blank', rel: external && 'noopener' }, content)
    : h('span', { class: 'big-action is-disabled', 'aria-disabled': 'true' }, content);
}

function jobCard(job, { showCustomer = true } = {}) {
  const overdue = isOpenJob(job) && isDay(job.dueDate) && job.dueDate < today();
  return h('a', { class: 'row job-card', href: `#/zakazky/${job.id}` }, [
    h('span', { class: 'job-top' }, [h('strong', { text: job.title || 'Zakázka' }), stagePill(job.stage)]),
    h('span', { class: 'row-sub', text: [showCustomer && job.customerName, serviceName(job.type)].filter(Boolean).join(' · ') }),
    h('span', { class: 'job-bottom' }, [
      h('span', { class: `job-due${overdue ? ' is-overdue' : ''}` }, job.dueDate ? [smallIcon('calendar'), dueLabel(job.dueDate)] : []),
      h('span', { class: 'job-value', text: money(job.value) })
    ])
  ]);
}
function taskRow(task, { showCustomer = true } = {}) {
  const overdue = !task.done && isDay(task.dueDate) && task.dueDate < today();
  const sub = [task.kind === 'service_visit' && 'Servisní návštěva', showCustomer && task.customerName, task.assignee && task.assignee !== me() && shortUser(task.assignee)].filter(Boolean).join(' · ');
  return h('div', { class: `task${task.done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}` }, [
    h('button', {
      type: 'button', class: 'task-check', role: 'checkbox', 'aria-checked': String(!!task.done),
      'aria-label': `${task.done ? 'Vrátit mezi otevřené' : 'Označit jako hotové'}: ${task.title}`, onclick: () => toggleTask(task)
    }, smallIcon('check')),
    h('button', { type: 'button', class: 'task-main', 'aria-label': `Upravit úkol: ${task.title}`, onclick: () => openTaskForm(task) }, [
      h('strong', { text: task.title || 'Úkol' }), sub && h('span', { class: 'row-sub', text: sub })
    ]),
    task.dueDate && h('span', { class: 'task-due', text: dueLabel(task.dueDate) })
  ]);
}
function inquiryRow(inquiry) {
  return h('a', { class: `row inquiry-row${inquiry.status === 'new' ? ' is-new' : ''}`, href: `#/poptavky/${inquiry.id}` }, [
    h('span', { class: 'job-top' }, [h('strong', { text: inquiry.name || 'Bez jména' }), statusPill(inquiry.status)]),
    h('span', { class: 'row-sub', text: [inquiryService(inquiry), inquiry.location].filter(Boolean).join(' · ') }),
    inquiry.message && h('span', { class: 'row-text', text: inquiry.message }),
    h('span', { class: 'row-date', text: formatDateTime(inquiry.createdAt) })
  ]);
}
// Text k termínu servisu včetně toho, o kolik dní je po termínu nebo kolik zbývá.
function serviceDateText(device) {
  if (!isDay(device.nextServiceAt)) return 'Termín dalšího servisu není stanoven';
  const diff = dayDiff(device.nextServiceAt);
  const base = `Další servis ${formatDay(device.nextServiceAt)}`;
  if (diff < 0) return `${base} · ${-diff} ${plural(-diff, 'den', 'dny', 'dní')} po termínu`;
  if (diff === 0) return `${base} · dnes`;
  return diff <= 30 ? `${base} · za ${diff} ${plural(diff, 'den', 'dny', 'dní')}` : base;
}

// Jednořádkové přidání záznamu do historie (poznámka / telefonát / návštěva).
function noteComposer(getContext) {
  let kind = 'note';
  const kinds = h('div', { class: 'chips chips-inline', role: 'group', 'aria-label': 'Druh záznamu' });
  const renderKinds = () => chipRow(kinds, ACTIVITY_KINDS, kind, key => { kind = key; renderKinds(); });
  const input = h('input', { type: 'text', maxlength: 2000, autocomplete: 'off', enterkeyhint: 'send', placeholder: 'Přidat poznámku…', 'aria-label': 'Text záznamu do historie' });
  renderKinds();
  return h('form', {
    class: 'composer', onsubmit: event => {
      event.preventDefault();
      const text = input.value.trim();
      const context = getContext();
      if (!text) return input.focus();
      if (!context.customerId) return toast('Záznam potřebuje zákazníka. Nejdřív ho k zakázce přiřaďte.', 'error');
      commit(setDoc(refOf('activities', newId('activities')), activityData(context.customerId, kind, text, context.jobId || '')), 'Zapsáno do historie.');
      input.value = '';
    }
  }, [kinds, h('div', { class: 'composer-row' }, [input, h('button', { type: 'submit', class: 'btn btn-primary', text: 'Přidat' })])]);
}
function renderTimeline(node, items, { showJob = false } = {}) {
  if (!items.length) return fill(node, h('li', { class: 'timeline-empty', text: 'Zatím tu není žádný záznam. První poznámku přidáte o řádek výš.' }));
  fill(node, items.map(item => {
    const job = showJob ? find('jobs', item.jobId) : null;
    return h('li', { class: `timeline-item kind-${item.kind}` }, [
      h('span', { class: 'timeline-icon' }, smallIcon(ACTIVITY_ICON[item.kind] || 'note')),
      h('div', { class: 'timeline-body' }, [
        h('p', { class: 'timeline-text', text: item.text }),
        h('p', { class: 'timeline-meta' }, [
          [ACTIVITY_LABEL[item.kind] || 'Záznam', formatDateTime(item.at), shortUser(item.by)].filter(Boolean).join(' · '),
          job && ' · ', job && h('a', { href: `#/zakazky/${job.id}`, text: job.title })
        ])
      ]),
      item.kind !== 'system' && h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Smazat záznam', onclick: () => removeActivity(item) }, smallIcon('trash'))
    ]);
  }));
}
const newestFirst = (a, b) => millis(b.at) - millis(a.at);
async function removeActivity(item) {
  if (!await confirmDialog('Smazat záznam?', `„${item.text.slice(0, 120)}“ zmizí z historie.`)) return;
  commit(deleteDoc(refOf('activities', item.id)), 'Záznam smazán.');
}

// =====================================================================
// AKCE NAD DATY
// =====================================================================
function toggleTask(task) {
  const done = !task.done;
  commit(updateDoc(refOf('tasks', task.id), { done, doneAt: done ? serverTimestamp() : null, ...stamp() }), done ? 'Úkol je hotový.' : 'Úkol je zpět mezi otevřenými.');
}

function setJobStage(job, stage) {
  if (!STAGE_LABEL[stage] || job.stage === stage) return;
  const operations = [batch => batch.update(refOf('jobs', job.id), { stage, ...stamp() })];
  if (job.customerId) operations.push(addActivity(job.customerId, 'system', `Zakázka „${job.title}“: ${STAGE_LABEL[job.stage] || 'bez fáze'} → ${STAGE_LABEL[stage]}`, job.id));
  commit(writeAll(operations), `Zakázka je ve fázi ${STAGE_LABEL[stage]}.`);
}

async function removeJob(job) {
  const tasks = state.tasks.filter(task => task.jobId === job.id);
  const extra = tasks.length ? ` Smaže se i ${tasks.length} ${plural(tasks.length, 'navázaný úkol', 'navázané úkoly', 'navázaných úkolů')}.` : '';
  if (!await confirmDialog('Smazat zakázku?', `„${job.title}“ se nenávratně odstraní.${extra} Záznamy v historii zákazníka zůstanou.`)) return false;
  commit(writeAll([batch => batch.delete(refOf('jobs', job.id)), ...tasks.map(task => batch => batch.delete(refOf('tasks', task.id)))]), 'Zakázka smazána.');
  return '#/zakazky';
}

// Zákazníka lze smazat, jen když nemá zařízení ani zakázky.
async function removeCustomer(customer) {
  const devices = state.devices.filter(item => item.customerId === customer.id).length;
  const jobs = state.jobs.filter(item => item.customerId === customer.id).length;
  if (devices || jobs) {
    const parts = [devices && `${devices} ${plural(devices, 'zařízení', 'zařízení', 'zařízení')}`, jobs && `${jobs} ${plural(jobs, 'zakázku', 'zakázky', 'zakázek')}`].filter(Boolean).join(' a ');
    await infoDialog('Zákazníka teď smazat nejde', `„${customer.name}“ má ${parts}. Aby se neztratila návaznost, nejdřív je smažte – potom půjde odstranit i zákazník.`);
    return false;
  }
  const tasks = state.tasks.filter(item => item.customerId === customer.id);
  const activities = state.activities.filter(item => item.customerId === customer.id);
  if (!await confirmDialog('Smazat zákazníka?', `„${customer.name}“ se nenávratně odstraní včetně historie a úkolů.`)) return false;
  commit(writeAll([
    batch => batch.delete(refOf('customers', customer.id)),
    ...tasks.map(item => batch => batch.delete(refOf('tasks', item.id))),
    ...activities.map(item => batch => batch.delete(refOf('activities', item.id)))
  ]), 'Zákazník smazán.');
  return '#/zakaznici';
}

async function removeDevice(device) {
  if (!await confirmDialog('Smazat zařízení?', `${deviceLabel(device)} se odstraní i s naplánovanými servisními návštěvami.`)) return false;
  const visits = state.tasks.filter(task => task.deviceId === device.id && !task.done);
  commit(writeAll([batch => batch.delete(refOf('devices', device.id)), ...visits.map(task => batch => batch.delete(refOf('tasks', task.id)))]), 'Zařízení smazáno.');
  return true;
}

// „Servis proveden“: dnešní datum, další termín podle programu, záznam v historii a uzavření naplánované návštěvy.
async function serviceDone(device) {
  const day = today();
  const months = PROGRAM_MONTHS[device.program];
  const next = months ? addMonths(day, months) : '';
  const label = deviceLabel(device);
  const text = `${label}${device.customerName ? ` – ${device.customerName}` : ''}. Jako datum servisu se zapíše dnešek${next ? ` a další termín se nastaví na ${formatDay(next)}` : '; další termín zůstane prázdný, zařízení nemá servisní program'}.`;
  if (!await confirmDialog('Zapsat provedený servis?', text, 'Zapsat servis', { danger: false })) return;
  const visits = state.tasks.filter(task => task.kind === 'service_visit' && !task.done && task.deviceId === device.id);
  const operations = [
    batch => batch.update(refOf('devices', device.id), { lastServiceAt: day, nextServiceAt: next, ...stamp() }),
    ...visits.map(task => batch => batch.update(refOf('tasks', task.id), { done: true, doneAt: serverTimestamp(), ...stamp() }))
  ];
  if (device.customerId) operations.push(addActivity(device.customerId, 'visit', `Proveden servis: ${label}`));
  commit(writeAll(operations), next ? `Servis zapsán. Další termín ${formatDay(next)}.` : 'Servis zapsán.');
}
// „Naplánovat“: úkol typu servisní návštěva s termínem dalšího servisu.
function scheduleService(device) {
  if (openVisit(device)) return toast('Servisní návštěva už je naplánovaná.', 'warn');
  const dueDate = isDay(device.nextServiceAt) ? device.nextServiceAt : '';
  commit(setDoc(refOf('tasks', newId('tasks')), {
    title: `Servis: ${deviceLabel(device)}${device.customerName ? ` – ${device.customerName}` : ''}`,
    dueDate, done: false, doneAt: null, kind: 'service_visit',
    customerId: device.customerId || '', customerName: device.customerName || '', jobId: '', deviceId: device.id, assignee: '',
    ...created()
  }), dueDate ? `Servisní návštěva naplánována na ${formatDay(dueDate)}.` : 'Servisní návštěva přidána mezi úkoly (bez termínu).');
}

// Převod poptávky z webu na zákazníka a zakázku.
const emailKey = value => String(value || '').trim().toLowerCase();
const phoneKey = value => String(value || '').replace(/[^\d+]/g, '').replace(/^(\+|00)420/, '');
function matchCustomer(inquiry) {
  const email = emailKey(inquiry.email);
  const phone = phoneKey(inquiry.phone);
  return state.customers.find(customer => (email && emailKey(customer.email) === email) || (phone.length >= 6 && phoneKey(customer.phone) === phone)) || null;
}
const converting = new Set(); // ochrana před dvojím klepnutím
function convertInquiry(inquiry) {
  const existingJob = jobOfInquiry(inquiry);
  if (existingJob) return go(`#/zakazky/${existingJob.id}`);
  if (converting.has(inquiry.id)) return;
  converting.add(inquiry.id);
  const label = inquiryService(inquiry);
  const name = clean(inquiry.name) || 'Bez jména';
  const operations = [];
  let customer = matchCustomer(inquiry);
  if (!customer) {
    customer = { id: newId('customers'), name };
    operations.push(batch => batch.set(refOf('customers', customer.id), {
      ...blankCustomer(), name, type: inquiry.service === 'cov_firmy' ? 'company' : 'household',
      email: clean(inquiry.email), phone: clean(inquiry.phone), city: clean(inquiry.location), ...created()
    }));
  }
  const note = [
    clean(inquiry.message),
    inquiry.manufacturer && `Výrobce: ${clean(inquiry.manufacturer)}`,
    inquiry.deviceType && `Typ zařízení: ${clean(inquiry.deviceType)}`,
    INQUIRY_KIND_LABEL[inquiry.kind] && `Druh poptávky: ${INQUIRY_KIND_LABEL[inquiry.kind]}`,
    PROGRAM_LABEL[inquiry.program] && inquiry.program !== 'none' && `Zájem o servisní program: ${PROGRAM_LABEL[inquiry.program]}`
  ].filter(Boolean).join('\n');
  const jobId = newId('jobs');
  operations.push(
    batch => batch.set(refOf('jobs', jobId), {
      title: `${label} – ${name}`, customerId: customer.id, customerName: customer.name, deviceId: '',
      type: config.services[inquiry.service] ? inquiry.service : 'poradit', stage: 'lead', value: 0, dueDate: '', assignee: '',
      note, inquiryId: inquiry.id, ...created()
    }),
    addActivity(customer.id, 'system', `Převedeno z poptávky z webu: ${label}`, jobId),
    batch => batch.update(refOf('inquiries', inquiry.id), { status: 'in_progress', ...stamp() })
  );
  commit(writeAll(operations).finally(() => converting.delete(inquiry.id)), 'Poptávka převedena na zakázku.');
  go(`#/zakazky/${jobId}`);
}

// Adresy příloh se zjišťují jednou a pamatují se.
const attachmentUrls = new Map();
function attachmentLink(file) {
  const link = h('a', { class: 'attachment', target: '_blank', rel: 'noopener' }, [
    smallIcon('clip'), h('span', { text: file.name || 'Příloha' }), h('small', { text: fileSize(file.size) })
  ]);
  if (typeof file.path !== 'string' || !file.path) return link;
  if (!attachmentUrls.has(file.path)) attachmentUrls.set(file.path, getDownloadURL(storageRef(storage, file.path)));
  attachmentUrls.get(file.path).then(url => { link.href = url; }).catch(error => {
    attachmentUrls.delete(file.path);
    link.classList.add('is-missing');
    link.title = explain(error);
  });
  return link;
}

function exportCustomers() {
  if (!state.customers.length) return toast('Zatím není co exportovat.', 'warn');
  // Buňky začínající znakem vzorce dostanou apostrof, aby je tabulkový program nespustil.
  const cell = value => {
    let text = String(value ?? '').replace(/\r?\n/g, ' ');
    if (/^[=@\t]/.test(text) || (/^[+-]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text))) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const count = (name, id) => state[name].filter(item => item.customerId === id).length;
  const header = ['Název', 'Typ', 'Kontaktní osoba', 'Telefon', 'E-mail', 'Adresa', 'Obec', 'Poznámka', 'Počet zařízení', 'Počet zakázek'];
  const lines = [...state.customers].sort(byName).map(customer => [
    customer.name, CUSTOMER_TYPE_LABEL[customer.type] || customer.type, customer.contactPerson, customer.phone, customer.email,
    customer.address, customer.city, customer.note, count('devices', customer.id), count('jobs', customer.id)
  ].map(cell).join(';'));
  const blob = new Blob(['﻿' + [header.map(cell).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = h('a', { href: URL.createObjectURL(blob), download: `zakaznici-${today()}.csv` });
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  toast('Tabulka zákazníků se stahuje.');
}

// =====================================================================
// FORMULÁŘE
// =====================================================================
function openCustomerForm(customer = null) {
  const name = textInput(customer?.name, { required: true, maxlength: 160, placeholder: 'Např. Jan Novák nebo Obec Lhota' });
  const type = selectOf(CUSTOMER_TYPES, customer?.type || 'household');
  const contactPerson = textInput(customer?.contactPerson, { maxlength: 120 });
  const phone = h('input', { type: 'tel', autocomplete: 'off', maxlength: 40, value: customer?.phone || '' });
  const email = h('input', { type: 'email', autocomplete: 'off', maxlength: 200, value: customer?.email || '' });
  const address = textInput(customer?.address, { placeholder: 'Ulice a číslo popisné' });
  const city = textInput(customer?.city, { maxlength: 120 });
  const note = textarea(customer?.note);
  openSheet({
    title: customer ? 'Upravit zákazníka' : 'Nový zákazník',
    body: [
      control('Jméno nebo název', name), control('Typ zákazníka', type), control('Kontaktní osoba', contactPerson),
      row(control('Telefon', phone), control('E-mail', email)),
      row(control('Adresa', address), control('Obec', city)),
      control('Poznámka', note)
    ],
    focus: customer ? null : name,
    deleteLabel: 'Smazat zákazníka',
    onDelete: customer ? () => removeCustomer(customer) : null,
    onSubmit: () => {
      const data = {
        name: clean(name.value), type: type.value, contactPerson: clean(contactPerson.value), phone: clean(phone.value),
        email: clean(email.value), address: clean(address.value), city: clean(city.value), note: clean(note.value)
      };
      if (!data.name) { name.focus(); return false; }
      if (!customer) {
        const id = newId('customers');
        commit(setDoc(refOf('customers', id), { ...data, ...created() }), 'Zákazník založen.');
        return `#/zakaznici/${id}`;
      }
      const operations = [batch => batch.update(refOf('customers', customer.id), { ...data, ...stamp() })];
      // Jméno je kvůli rychlým výpisům uložené i u zařízení, zakázek a úkolů.
      if (customer.name !== data.name) {
        for (const collectionName of ['devices', 'jobs', 'tasks']) {
          state[collectionName].filter(item => item.customerId === customer.id)
            .forEach(item => operations.push(batch => batch.update(refOf(collectionName, item.id), { customerName: data.name, ...stamp() })));
        }
      }
      commit(writeAll(operations), 'Zákazník uložen.');
    }
  });
}

function openDeviceForm(customer, device = null) {
  const manufacturer = textInput(device?.manufacturer, { maxlength: 120, placeholder: 'Např. ASIO, ENVI-PUR' });
  const model = textInput(device?.model, { maxlength: 160, placeholder: 'Např. AS-VARIOcomp 5K' });
  const capacity = textInput(device?.capacity, { maxlength: 60, placeholder: 'Např. 5 EO' });
  const place = textInput(device?.location, { maxlength: 160, placeholder: 'Kde zařízení stojí' });
  const [savedYear, savedMonth] = /^\d{4}-\d{2}$/.test(device?.installedAt || '') ? device.installedAt.split('-') : ['', ''];
  const thisYear = new Date().getFullYear();
  const month = selectOf([['', '—'], ...['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'].map((label, index) => [pad(index + 1), label])], savedMonth);
  const year = selectOf([['', '—'], ...Array.from({ length: thisYear - 1989 }, (_, index) => [String(thisYear - index), String(thisYear - index)])], savedYear);
  const program = selectOf(PROGRAMS.map(([key, label]) => [key, PROGRAM_MONTHS[key] ? `${label} (${12 / PROGRAM_MONTHS[key]} návštěvy ročně)` : label]), device?.program || 'none');
  const last = dateInput(device?.lastServiceAt);
  const next = dateInput(device?.nextServiceAt);
  const note = textarea(device?.note);
  // Další termín se dopočítá z programu; ručně ho lze kdykoli přepsat.
  const suggest = () => { const months = PROGRAM_MONTHS[program.value]; if (months) next.value = addMonths(last.value || today(), months); };
  program.addEventListener('change', suggest);
  last.addEventListener('change', suggest);
  openSheet({
    title: device ? 'Upravit zařízení' : 'Nové zařízení',
    body: [
      h('p', { class: 'sheet-context', text: `Zákazník: ${customer.name}` }),
      row(control('Výrobce', manufacturer), control('Model', model)),
      row(control('Kapacita', capacity), control('Umístění', place)),
      row(control('Instalace – měsíc', month), control('Instalace – rok', year)),
      control('Servisní program', program),
      row(control('Poslední servis', last), control('Další servis', next, 'Dopočítá se podle programu, lze upravit.')),
      control('Poznámka', note)
    ],
    focus: device ? null : manufacturer,
    deleteLabel: 'Smazat zařízení',
    onDelete: device ? () => removeDevice(device) : null,
    onSubmit: () => {
      const data = {
        customerId: customer.id, customerName: customer.name,
        manufacturer: clean(manufacturer.value), model: clean(model.value), capacity: clean(capacity.value), location: clean(place.value),
        installedAt: month.value && year.value ? `${year.value}-${month.value}` : '',
        program: program.value, lastServiceAt: last.value, nextServiceAt: next.value, note: clean(note.value)
      };
      if (!data.manufacturer && !data.model) { toast('Vyplňte výrobce nebo model zařízení.', 'error'); manufacturer.focus(); return false; }
      if (device) commit(updateDoc(refOf('devices', device.id), { ...data, ...stamp() }), 'Zařízení uloženo.');
      else commit(setDoc(refOf('devices', newId('devices')), { ...data, ...created() }), 'Zařízení přidáno.');
    }
  });
}

function openJobForm(job = null, preset = {}) {
  const title = textInput(job?.title, { required: true, maxlength: 160, placeholder: 'Např. Dodávka a montáž domovní ČOV' });
  const device = h('select');
  let deviceId = job?.deviceId || '';
  const picker = customerPicker({ id: job ? job.customerId : preset.customerId, allowNew: true, required: true, onChange: () => fillDevices() });
  function fillDevices() {
    const customerId = picker.value().id;
    const options = state.devices.filter(item => customerId && item.customerId === customerId);
    fill(device, h('option', { value: '', text: options.length ? 'Bez vazby na zařízení' : 'Zákazník zatím nemá žádné zařízení' }),
      options.map(item => h('option', { value: item.id, text: [deviceLabel(item), item.location].filter(Boolean).join(' · ') })));
    device.value = options.some(item => item.id === deviceId) ? deviceId : '';
    device.disabled = !options.length;
  }
  device.addEventListener('change', () => { deviceId = device.value; });
  fillDevices();
  const type = selectOf(SERVICES, job?.type || SERVICES[0][0]);
  const stage = selectOf(STAGES, job?.stage || 'lead');
  const value = h('input', { type: 'number', inputmode: 'numeric', min: 0, step: 1, placeholder: '0', value: job && job.value ? String(job.value) : '' });
  const dueDate = dateInput(job?.dueDate);
  const assignee = assigneeSelect(job?.assignee);
  const note = textarea(job?.note, { rows: 4 });
  openSheet({
    title: job ? 'Upravit zakázku' : 'Nová zakázka',
    body: [
      control('Název zakázky', title), picker.node, control('Zařízení', device),
      row(control('Typ služby', type), control('Fáze', stage)),
      row(control('Hodnota (Kč)', value), control('Termín', dueDate)),
      control('Řešitel', assignee), control('Poznámka', note)
    ],
    focus: job ? null : title,
    deleteLabel: 'Smazat zakázku',
    onDelete: job ? () => removeJob(job) : null,
    onSubmit: () => {
      if (!clean(title.value)) { title.focus(); return false; }
      if (!picker.validate()) return false;
      const chosen = picker.value();
      const operations = [];
      let customerId = chosen.id, customerName = chosen.name;
      if (chosen.draft) {
        customerId = newId('customers'); customerName = chosen.draft.name;
        operations.push(batch => batch.set(refOf('customers', customerId), { ...blankCustomer(), ...chosen.draft, ...created() }));
      }
      const data = {
        title: clean(title.value), customerId, customerName, deviceId: chosen.draft ? '' : device.value, type: type.value, stage: stage.value,
        value: Math.max(0, Math.round(Number(value.value) || 0)), dueDate: dueDate.value, assignee: assignee.value, note: clean(note.value)
      };
      if (job) {
        operations.push(batch => batch.update(refOf('jobs', job.id), { ...data, ...stamp() }));
        if (job.stage !== data.stage) operations.push(addActivity(customerId, 'system', `Zakázka „${data.title}“: ${STAGE_LABEL[job.stage] || 'bez fáze'} → ${STAGE_LABEL[data.stage]}`, job.id));
        commit(writeAll(operations), 'Zakázka uložena.');
        return;
      }
      const id = newId('jobs');
      operations.push(batch => batch.set(refOf('jobs', id), { ...data, inquiryId: '', ...created() }), addActivity(customerId, 'system', `Založena zakázka: ${data.title}`, id));
      commit(writeAll(operations), 'Zakázka založena.');
      return `#/zakazky/${id}`;
    }
  });
}

function openTaskForm(task = null, preset = {}) {
  const title = textInput(task?.title, { required: true, maxlength: 200, placeholder: 'Co je potřeba udělat' });
  const dueDate = dateInput(task ? task.dueDate : today());
  const kind = selectOf(TASK_KINDS, task?.kind || preset.kind || 'task');
  const assignee = assigneeSelect(task ? task.assignee : me());
  const picker = customerPicker({ id: task ? task.customerId : preset.customerId });
  const job = find('jobs', task ? task.jobId : preset.jobId);
  openSheet({
    title: task ? 'Upravit úkol' : 'Nový úkol',
    body: [
      job && h('p', { class: 'sheet-context', text: `Zakázka: ${job.title}` }),
      control('Úkol', title),
      row(control('Termín', dueDate), control('Druh', kind)),
      picker.node, control('Přiřazeno', assignee)
    ],
    focus: task ? null : title,
    deleteLabel: 'Smazat úkol',
    onDelete: task ? async () => {
      if (!await confirmDialog('Smazat úkol?', `„${task.title}“ se nenávratně odstraní.`)) return false;
      commit(deleteDoc(refOf('tasks', task.id)), 'Úkol smazán.');
      return true;
    } : null,
    onSubmit: () => {
      if (!clean(title.value)) { title.focus(); return false; }
      const chosen = picker.value();
      const data = { title: clean(title.value), dueDate: dueDate.value, kind: kind.value, customerId: chosen.id, customerName: chosen.name, assignee: assignee.value };
      if (task) commit(updateDoc(refOf('tasks', task.id), { ...data, ...stamp() }), 'Úkol uložen.');
      else commit(setDoc(refOf('tasks', newId('tasks')), { ...data, done: false, doneAt: null, jobId: preset.jobId || '', deviceId: preset.deviceId || '', ...created() }), 'Úkol přidán.');
    }
  });
}

// =====================================================================
// OBRAZOVKY
// Každá vrací { title, tab, back, action, node, update }. Kostra (hledání, filtry, pole
// pro psaní) se staví jednou; update() při změně dat přepíše jen výpisy, takže psaní
// nepřeruší žádná příchozí změna.
// =====================================================================
const desktop = window.matchMedia('(min-width: 900px)');
desktop.addEventListener('change', () => current?.update());

// ----- Přehled -----
function screenDashboard() {
  const hour = new Date().getHours();
  const stats = h('div', { class: 'stats' });
  const tasks = h('div', { class: 'list' });
  const inquiries = h('div', { class: 'list' });
  const services = h('div', { class: 'list' });
  const node = h('div', { class: 'stack' }, [
    h('div', { class: 'greeting' }, [
      h('h2', { text: hour < 10 ? 'Dobré ráno' : hour < 18 ? 'Dobrý den' : 'Dobrý večer' }),
      h('p', { text: `${longDayFormat.format(new Date())} · ${shortUser(me())}` })
    ]),
    stats,
    section('Dnes a po termínu', tasks, moreLink('Všechny úkoly', '#/ukoly')),
    section('Nové poptávky z webu', inquiries, moreLink('Všechny poptávky', '#/poptavky')),
    section('Nejbližší servisy', services, moreLink('Servis', '#/servis'))
  ]);
  const stat = (href, iconName, number, label, sub, alert = false) => h('a', { class: `stat${alert ? ' is-alert' : ''}`, href }, [
    icon(iconName), h('strong', { class: 'stat-number', text: String(number) }), h('span', { class: 'stat-label', text: label }), h('span', { class: 'stat-sub', text: sub })
  ]);
  function update() {
    const day = today();
    const horizon = addDays(day, 30);
    const due = state.tasks.filter(task => !task.done && isDay(task.dueDate) && task.dueDate <= day).sort(compareTasks);
    const overdueTasks = due.filter(task => task.dueDate < day).length;
    const fresh = state.inquiries.filter(inquiry => inquiry.status === 'new');
    const serviced = serviceDevices().filter(device => isDay(device.nextServiceAt));
    const overdueService = serviced.filter(device => device.nextServiceAt < day).length;
    const soonService = serviced.filter(device => device.nextServiceAt >= day && device.nextServiceAt <= horizon).length;
    const openJobs = state.jobs.filter(isOpenJob);
    fill(stats,
      stat('#/poptavky', 'inbox', fresh.length, 'Nové poptávky z webu', fresh.length ? 'čekají na vyřízení' : 'vše vyřízeno', fresh.length > 0),
      stat('#/ukoly', 'tasks', due.length, 'Úkoly na dnešek', overdueTasks ? `z toho ${overdueTasks} po termínu` : 'nic po termínu', overdueTasks > 0),
      stat('#/servis', 'wrench', soonService + overdueService, 'Servisy do 30 dnů', overdueService ? `z toho ${overdueService} po termínu` : 'nic po termínu', overdueService > 0),
      stat('#/zakazky', 'jobs', openJobs.length, 'Otevřené zakázky', money(openJobs.reduce((sum, job) => sum + (Number(job.value) || 0), 0)))
    );
    fill(tasks, due.length ? due.map(task => taskRow(task)) : emptyState('Na dnešek nemáte žádný úkol a nic není po termínu.', 'Přidat úkol', () => openTaskForm()));
    fill(inquiries, fresh.length ? fresh.slice(0, 5).map(inquiryRow) : h('p', { class: 'empty', text: 'Žádná nová poptávka. Jakmile ji někdo na webu odešle, objeví se tady.' }));
    fill(services, serviced.length
      ? serviced.slice(0, 5).map(device => h('a', { class: `row service-row${device.nextServiceAt < day ? ' is-overdue' : ''}`, href: '#/servis' }, [
        h('span', { class: 'job-top' }, [h('strong', { text: device.customerName || 'Zákazník' }), programBadge(device.program)]),
        h('span', { class: 'row-sub', text: [deviceLabel(device), device.location].filter(Boolean).join(' · ') }),
        h('span', { class: 'service-date' }, [smallIcon('calendar'), serviceDateText(device)])
      ]))
      : emptyState('Zatím není naplánovaný žádný servis. Termíny se objeví, jakmile zařízení zákazníka dostane servisní program.', 'Přejít na zákazníky', () => go('#/zakaznici')));
  }
  return { title: 'Přehled', tab: 'prehled', action: { label: 'Zakázka', onclick: () => openJobForm() }, node, update };
}

// ----- Zakázky -----
function screenJobs() {
  const chips = h('div', { class: 'chips chips-scroll jobs-chips', role: 'group', 'aria-label': 'Fáze zakázky' });
  const search = h('input', { type: 'search', id: 'job-search', placeholder: 'Název, zákazník, poznámka…', value: ui.jobSearch });
  const content = h('div', { class: 'jobs-content' });
  const node = h('div', { class: 'stack' }, [
    h('div', { class: 'field search-field' }, [h('label', { for: 'job-search', class: 'visually-hidden', text: 'Hledat zakázku' }), search]),
    chips, content
  ]);
  search.addEventListener('input', () => { ui.jobSearch = search.value; update(); });
  const boardCard = job => {
    const select = selectOf(STAGES, job.stage, { class: 'board-select', 'aria-label': `Fáze zakázky ${job.title}` });
    select.addEventListener('change', () => setJobStage(job, select.value));
    const overdue = isOpenJob(job) && isDay(job.dueDate) && job.dueDate < today();
    return h('article', { class: 'board-card' }, [
      h('a', { class: 'board-link', href: `#/zakazky/${job.id}` }, [
        h('strong', { text: job.title || 'Zakázka' }),
        h('span', { class: 'row-sub', text: [job.customerName, serviceName(job.type)].filter(Boolean).join(' · ') }),
        h('span', { class: 'job-bottom' }, [
          h('span', { class: `job-due${overdue ? ' is-overdue' : ''}` }, job.dueDate ? [smallIcon('calendar'), dueLabel(job.dueDate)] : []),
          h('span', { class: 'job-value', text: money(job.value) })
        ])
      ]),
      select
    ]);
  };
  function update() {
    const needle = normalize(ui.jobSearch.trim());
    const found = state.jobs.filter(job => !needle || normalize([job.title, job.customerName, serviceName(job.type), job.note].join(' ')).includes(needle)).sort(compareJobs);
    const inStage = key => found.filter(job => key === 'all' || (key === 'open' ? isOpenJob(job) : job.stage === key));
    chipRow(chips, [['open', 'Otevřené', inStage('open').length], ...STAGES.map(([key, label]) => [key, label, inStage(key).length]), ['all', 'Vše', found.length]],
      ui.jobStage, key => { ui.jobStage = key; update(); });
    node.classList.toggle('is-board', desktop.matches);
    if (!state.jobs.length) return fill(content, emptyState('Zatím tu není žádná zakázka. Založte první, nebo převeďte poptávku z webu.', 'Nová zakázka', () => openJobForm()));
    if (desktop.matches) {
      // Počítač: nástěnka se sloupcem pro každou fázi; fáze se mění výběrem přímo na kartě.
      return fill(content, h('div', { class: 'board' }, STAGES.map(([key, label]) => {
        const jobs = inStage(key);
        return h('section', { class: `board-column stage-column-${key}`, 'aria-label': label }, [
          h('div', { class: 'board-head' }, [h('h2', { text: label }), h('span', { class: 'board-count', text: String(jobs.length) }), h('span', { class: 'board-sum', text: money(jobs.reduce((sum, job) => sum + (Number(job.value) || 0), 0)) })]),
          jobs.length ? jobs.map(boardCard) : h('p', { class: 'board-empty', text: 'Nic tu není' })
        ]);
      })));
    }
    const rows = inStage(ui.jobStage);
    fill(content, rows.length ? h('div', { class: 'list' }, rows.map(job => jobCard(job))) : h('p', { class: 'empty', text: 'Tomuto výběru neodpovídá žádná zakázka.' }));
  }
  return { title: 'Zakázky', tab: 'zakazky', wide: true, action: { label: 'Zakázka', onclick: () => openJobForm() }, node, update };
}

function screenJob(id) {
  const head = h('div', { class: 'detail-head' });
  const stage = selectOf(STAGES, 'lead', { id: 'job-stage' });
  const next = h('button', { type: 'button', class: 'btn btn-primary' });
  const meta = h('dl', { class: 'detail-list' });
  const tasks = h('div', { class: 'list' });
  const notes = h('ol', { class: 'timeline' });
  const composer = noteComposer(() => ({ customerId: find('jobs', id)?.customerId || '', jobId: id }));
  const noCustomer = h('p', { class: 'notice', text: 'Zakázka nemá přiřazeného zákazníka. Přiřaďte ho přes „Upravit“, potom půjdou zapisovat poznámky.' });
  const body = h('div', { class: 'stack' }, [
    head,
    h('div', { class: 'card stage-card' }, [
      h('div', { class: 'field' }, [h('label', { for: 'job-stage', text: 'Fáze zakázky' }), stage]),
      next
    ]),
    h('div', { class: 'card' }, meta),
    section('Úkoly', tasks, addButton('Přidat úkol', () => { const job = find('jobs', id); if (job) openTaskForm(null, { jobId: id, customerId: job.customerId }); })),
    section('Poznámky k zakázce', h('div', { class: 'card' }, [noCustomer, composer, notes])),
    h('div', { class: 'danger-zone' }, h('button', {
      type: 'button', class: 'btn btn-danger-ghost', onclick: async () => { const job = find('jobs', id); const target = job && await removeJob(job); if (target) go(target); }
    }, [smallIcon('trash'), 'Smazat zakázku']))
  ]);
  const node = h('div');
  stage.addEventListener('change', () => { const job = find('jobs', id); if (job) setJobStage(job, stage.value); });
  next.addEventListener('click', () => { const job = find('jobs', id); if (job && NEXT_STAGE[job.stage]) setJobStage(job, NEXT_STAGE[job.stage]); });
  function update() {
    const job = find('jobs', id);
    if (!job) return fill(node, emptyState('Tato zakázka už neexistuje.', 'Zpět na zakázky', () => go('#/zakazky')));
    if (body.parentNode !== node) fill(node, body);
    const customer = find('customers', job.customerId);
    const device = find('devices', job.deviceId);
    const inquiry = find('inquiries', job.inquiryId);
    fill(head, h('h2', { text: job.title || 'Zakázka' }), h('p', { class: 'detail-sub' }, [stagePill(job.stage), h('span', { text: money(job.value) })]));
    if (document.activeElement !== stage) stage.value = STAGE_LABEL[job.stage] ? job.stage : 'lead';
    const following = NEXT_STAGE[job.stage];
    next.hidden = !following;
    if (following) fill(next, `Další fáze: ${STAGE_LABEL[following]}`, smallIcon('chevron'));
    detailList(meta, [
      ['Zákazník', customer ? h('a', { href: `#/zakaznici/${customer.id}`, text: customer.name }) : job.customerName],
      ['Typ služby', serviceName(job.type)],
      ['Hodnota', money(job.value)],
      ['Termín', job.dueDate && `${formatDay(job.dueDate)}${isOpenJob(job) && job.dueDate < today() ? ' · po termínu' : ''}`],
      ['Řešitel', job.assignee],
      ['Zařízení', device && [deviceLabel(device), device.location].filter(Boolean).join(' · ')],
      ['Poznámka', job.note],
      ['Poptávka z webu', inquiry && h('a', { href: `#/poptavky/${inquiry.id}`, text: `${inquiry.name || 'Poptávka'} · ${formatDateTime(inquiry.createdAt)}` })]
    ]);
    const related = state.tasks.filter(task => task.jobId === id).sort((a, b) => Number(!!a.done) - Number(!!b.done) || compareTasks(a, b));
    fill(tasks, related.length ? related.map(task => taskRow(task, { showCustomer: false })) : h('p', { class: 'empty', text: 'K zakázce zatím není žádný úkol.' }));
    noCustomer.hidden = !!job.customerId;
    composer.hidden = !job.customerId;
    renderTimeline(notes, state.activities.filter(item => item.jobId === id).sort(newestFirst));
  }
  return { title: 'Zakázka', tab: 'zakazky', back: '#/zakazky', action: { label: 'Upravit', icon: 'edit', onclick: () => { const job = find('jobs', id); if (job) openJobForm(job); } }, node, update };
}

// ----- Zákazníci -----
function screenCustomers() {
  const search = h('input', { type: 'search', id: 'customer-search', placeholder: 'Jméno, obec, telefon, e-mail…', value: ui.customerSearch });
  const type = selectOf([['all', 'Všechny typy'], ...CUSTOMER_TYPES], ui.customerType, { id: 'customer-type' });
  const count = h('p', { class: 'list-count' });
  const list = h('div', { class: 'list' });
  const node = h('div', { class: 'stack' }, [
    h('div', { class: 'toolbar' }, [
      h('div', { class: 'field' }, [h('label', { for: 'customer-search', class: 'visually-hidden', text: 'Hledat zákazníka' }), search]),
      h('div', { class: 'field' }, [h('label', { for: 'customer-type', class: 'visually-hidden', text: 'Typ zákazníka' }), type])
    ]),
    count, list
  ]);
  search.addEventListener('input', () => { ui.customerSearch = search.value; update(); });
  type.addEventListener('change', () => { ui.customerType = type.value; update(); });
  function update() {
    const needle = normalize(ui.customerSearch.trim());
    const digits = ui.customerSearch.replace(/\s/g, '');
    const rows = state.customers.filter(customer => {
      if (ui.customerType !== 'all' && customer.type !== ui.customerType) return false;
      return !needle || customerHaystack(customer).includes(needle) || (digits.length > 2 && customerHaystack(customer).includes(digits));
    }).sort(byName);
    count.textContent = state.customers.length ? `${rows.length} z ${state.customers.length} ${plural(state.customers.length, 'zákazníka', 'zákazníků', 'zákazníků')}` : '';
    if (!state.customers.length) return fill(list, emptyState('Zatím tu není žádný zákazník. Přidejte prvního, nebo převeďte poptávku z webu.', 'Nový zákazník', () => openCustomerForm()));
    if (!rows.length) return fill(list, h('p', { class: 'empty', text: 'Tomuto hledání neodpovídá žádný zákazník.' }));
    fill(list, rows.map(customer => {
      const devices = state.devices.filter(device => device.customerId === customer.id).length;
      return h('a', { class: 'row customer-row', href: `#/zakaznici/${customer.id}` }, [
        h('span', { class: 'avatar', 'aria-hidden': 'true', text: (customer.name || '?').trim().charAt(0).toUpperCase() }),
        h('span', { class: 'row-main' }, [
          h('strong', { text: customer.name || 'Bez názvu' }),
          h('span', { class: 'row-sub', text: [CUSTOMER_TYPE_LABEL[customer.type], customer.city, customer.phone, devices && `${devices} ${plural(devices, 'zařízení', 'zařízení', 'zařízení')}`].filter(Boolean).join(' · ') })
        ]),
        smallIcon('chevron')
      ]);
    }));
  }
  return { title: 'Zákazníci', tab: 'zakaznici', action: { label: 'Zákazník', onclick: () => openCustomerForm() }, node, update };
}

function screenCustomer(id) {
  const head = h('div', { class: 'detail-head' });
  const actions = h('div', { class: 'big-actions' });
  const info = h('dl', { class: 'detail-list' });
  const infoEmpty = h('p', { class: 'hint', text: 'Kontaktní údaje zatím chybí. Doplníte je přes „Upravit“.' });
  const devices = h('div', { class: 'list' });
  const jobs = h('div', { class: 'list' });
  const tasks = h('div', { class: 'list' });
  const timeline = h('ol', { class: 'timeline' });
  const withCustomer = action => () => { const customer = find('customers', id); if (customer) action(customer); };
  const body = h('div', { class: 'stack' }, [
    head, actions,
    h('div', { class: 'card' }, [info, infoEmpty, h('button', { type: 'button', class: 'btn btn-small card-edit', onclick: withCustomer(openCustomerForm) }, [smallIcon('edit'), 'Upravit údaje'])]),
    section('Zařízení', devices, addButton('Přidat zařízení', withCustomer(customer => openDeviceForm(customer)))),
    section('Zakázky', jobs, addButton('Přidat zakázku', () => openJobForm(null, { customerId: id }))),
    section('Úkoly', tasks, addButton('Přidat úkol', () => openTaskForm(null, { customerId: id }))),
    section('Historie', h('div', { class: 'card' }, [noteComposer(() => ({ customerId: id, jobId: '' })), timeline]))
  ]);
  const node = h('div');
  function update() {
    const customer = find('customers', id);
    if (!customer) return fill(node, emptyState('Tento zákazník už neexistuje.', 'Zpět na zákazníky', () => go('#/zakaznici')));
    if (body.parentNode !== node) fill(node, body);
    fill(head, h('h2', { text: customer.name || 'Bez názvu' }), h('p', { class: 'detail-sub' }, [
      h('span', { class: 'pill type-pill', text: CUSTOMER_TYPE_LABEL[customer.type] || 'Jiné' }), customer.contactPerson && h('span', { text: customer.contactPerson })
    ]));
    const place = [customer.address, customer.city].filter(Boolean).join(' ');
    fill(actions,
      bigAction('Zavolat', 'phone', customer.phone && telHref(customer.phone)),
      bigAction('E-mail', 'mail', customer.email && mailHref(customer.email)),
      bigAction('Navigovat', 'pin', place && mapHref(place), true));
    detailList(info, [
      ['Kontaktní osoba', customer.contactPerson], ['Telefon', customer.phone], ['E-mail', customer.email],
      ['Adresa', customer.address], ['Obec', customer.city], ['Poznámka', customer.note]
    ]);
    infoEmpty.hidden = !info.hidden;

    const ownDevices = state.devices.filter(device => device.customerId === id).sort((a, b) => collator.compare(deviceLabel(a), deviceLabel(b)));
    fill(devices, ownDevices.length ? ownDevices.map(device => h('button', {
      type: 'button', class: `row device-row${isDay(device.nextServiceAt) && device.nextServiceAt < today() ? ' is-overdue' : ''}`, onclick: () => openDeviceForm(customer, device)
    }, [
      h('span', { class: 'job-top' }, [h('strong', { text: deviceLabel(device) }), programBadge(device.program)]),
      h('span', { class: 'row-sub', text: [device.location, device.capacity, formatMonth(device.installedAt) && `instalace ${formatMonth(device.installedAt)}`].filter(Boolean).join(' · ') }),
      hasService(device) && h('span', { class: 'service-date' }, [smallIcon('calendar'), serviceDateText(device)])
    ])) : emptyState('Zákazník zatím nemá žádné zařízení. Přidejte čistírnu nebo jinou technologii – pohlídáme její servis.', 'Přidat zařízení', () => openDeviceForm(customer)));

    const ownJobs = state.jobs.filter(job => job.customerId === id).sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
    fill(jobs, ownJobs.length ? ownJobs.map(job => jobCard(job, { showCustomer: false })) : h('p', { class: 'empty', text: 'Žádná zakázka. Novou založíte tlačítkem „Přidat zakázku“.' }));

    const ownTasks = state.tasks.filter(task => task.customerId === id);
    const openTasks = ownTasks.filter(task => !task.done).sort(compareTasks);
    const doneTasks = ownTasks.filter(task => task.done).sort((a, b) => millis(b.doneAt) - millis(a.doneAt)).slice(0, 5);
    fill(tasks, ownTasks.length ? [...openTasks, ...doneTasks].map(task => taskRow(task, { showCustomer: false })) : h('p', { class: 'empty', text: 'Žádný úkol. Připomínku si přidáte tlačítkem „Přidat úkol“.' }));

    renderTimeline(timeline, state.activities.filter(item => item.customerId === id).sort(newestFirst), { showJob: true });
  }
  return { title: 'Zákazník', tab: 'zakaznici', back: '#/zakaznici', action: { label: 'Upravit', icon: 'edit', onclick: withCustomer(openCustomerForm) }, node, update };
}

// ----- Servis -----
function screenService() {
  const chips = h('div', { class: 'chips chips-scroll', role: 'group', 'aria-label': 'Servisní program' });
  const list = h('div', { class: 'list' });
  const node = h('div', { class: 'stack' }, [chips, list]);
  const card = device => {
    const overdue = isDay(device.nextServiceAt) && device.nextServiceAt < today();
    const visit = openVisit(device);
    return h('article', { class: `card service-card${overdue ? ' is-overdue' : ''}` }, [
      h('div', { class: 'job-top' }, [
        device.customerId ? h('a', { class: 'service-customer', href: `#/zakaznici/${device.customerId}`, text: device.customerName || 'Zákazník' }) : h('strong', { text: device.customerName || 'Bez zákazníka' }),
        programBadge(device.program)
      ]),
      h('p', { class: 'row-sub', text: [deviceLabel(device), device.location].filter(Boolean).join(' · ') }),
      h('p', { class: 'service-date' }, [smallIcon('calendar'), serviceDateText(device)]),
      device.lastServiceAt && h('p', { class: 'row-sub', text: `Poslední servis ${formatDay(device.lastServiceAt)}` }),
      h('div', { class: 'service-actions' }, [
        h('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: () => serviceDone(device) }, [smallIcon('check'), 'Servis proveden']),
        visit
          ? h('span', { class: 'service-planned' }, [smallIcon('calendar'), `Naplánováno${visit.dueDate ? ` na ${formatDay(visit.dueDate)}` : ''}`])
          : h('button', { type: 'button', class: 'btn btn-small', onclick: () => scheduleService(device) }, [smallIcon('calendar'), 'Naplánovat'])
      ])
    ]);
  };
  function update() {
    const all = serviceDevices();
    const inProgram = key => all.filter(device => key === 'all' || (device.program || 'none') === key);
    chipRow(chips, [['all', 'Vše', all.length], ['standard', 'STANDARD', inProgram('standard').length], ['premium', 'PREMIUM', inProgram('premium').length], ['none', 'Bez programu', inProgram('none').length]],
      ui.program, key => { ui.program = key; update(); });
    if (!all.length) return fill(list, emptyState('Zatím žádné zařízení nemá servisní program ani termín servisu. Zařízení přidáte v detailu zákazníka.', 'Přejít na zákazníky', () => go('#/zakaznici')));
    const rows = inProgram(ui.program);
    fill(list, rows.length ? rows.map(card) : h('p', { class: 'empty', text: 'V tomto programu není žádné zařízení.' }));
  }
  return { title: 'Servis', tab: 'servis', node, update };
}

// ----- Úkoly -----
function screenTasks() {
  const chips = h('div', { class: 'chips chips-scroll', role: 'group', 'aria-label': 'Výběr úkolů' });
  const list = h('div', { class: 'list' });
  const node = h('div', { class: 'stack' }, [chips, list]);
  function update() {
    const open = state.tasks.filter(task => !task.done).sort(compareTasks);
    const mine = open.filter(task => task.assignee === me());
    const done = state.tasks.filter(task => task.done).sort((a, b) => millis(b.doneAt) - millis(a.doneAt));
    chipRow(chips, [['open', 'Otevřené', open.length], ['mine', 'Moje', mine.length], ['done', 'Hotové', done.length]], ui.taskFilter, key => { ui.taskFilter = key; update(); });
    if (!state.tasks.length) return fill(list, emptyState('Zatím tu není žádný úkol. Úkoly vám připomenou, co je potřeba udělat a do kdy.', 'Nový úkol', () => openTaskForm()));
    const rows = ui.taskFilter === 'done' ? done.slice(0, 100) : ui.taskFilter === 'mine' ? mine : open;
    fill(list, rows.length ? rows.map(task => taskRow(task)) : h('p', { class: 'empty', text: ui.taskFilter === 'done' ? 'Zatím není hotový žádný úkol.' : 'Všechno je hotové. Žádný otevřený úkol.' }));
  }
  return { title: 'Úkoly', tab: 'prehled', back: '#/prehled', action: { label: 'Úkol', onclick: () => openTaskForm() }, node, update };
}

// ----- Poptávky z webu -----
function screenInquiries() {
  const chips = h('div', { class: 'chips chips-scroll', role: 'group', 'aria-label': 'Stav poptávky' });
  const list = h('div', { class: 'list' });
  const node = h('div', { class: 'stack' }, [chips, list]);
  function update() {
    const isOpen = inquiry => ['new', 'in_progress', 'quoted'].includes(inquiry.status);
    const pick = key => state.inquiries.filter(inquiry => key === 'all' || (key === 'open' ? isOpen(inquiry) : inquiry.status === key));
    chipRow(chips, [['open', 'Otevřené', pick('open').length], ['new', 'Nové', pick('new').length], ['all', 'Vše', state.inquiries.length]], ui.inquiryFilter, key => { ui.inquiryFilter = key; update(); });
    if (!state.inquiries.length) return fill(list, h('p', { class: 'empty', text: 'Zatím nepřišla žádná poptávka. Jakmile ji někdo na webu odešle, objeví se tady.' }));
    // Nové nahoře, ostatní od nejnovější.
    const rows = pick(ui.inquiryFilter).sort((a, b) => Number(b.status === 'new') - Number(a.status === 'new') || millis(b.createdAt) - millis(a.createdAt));
    fill(list, rows.length ? rows.map(inquiryRow) : h('p', { class: 'empty', text: 'Tomuto výběru neodpovídá žádná poptávka.' }));
  }
  return { title: 'Poptávky z webu', tab: 'prehled', back: '#/prehled', node, update };
}

function screenInquiry(id) {
  const head = h('div', { class: 'detail-head' });
  const actions = h('div', { class: 'big-actions' });
  const convert = h('div', { class: 'card convert-card' });
  const fields = h('dl', { class: 'detail-list' });
  const files = h('div', { class: 'attachments' });
  const status = selectOf(INQUIRY_STATUSES, 'new', { id: 'inquiry-status' });
  const note = textarea('', { id: 'inquiry-note', rows: 3 });
  let noteLoaded = false;
  let filesKey = null;
  const save = h('button', { type: 'button', class: 'btn btn-small', text: 'Uložit poznámku' });
  const body = h('div', { class: 'stack' }, [
    head, actions, convert,
    h('div', { class: 'card' }, [fields, files]),
    h('div', { class: 'card' }, [
      h('div', { class: 'field' }, [h('label', { for: 'inquiry-status', text: 'Stav poptávky' }), status]),
      h('div', { class: 'field' }, [h('label', { for: 'inquiry-note', text: 'Interní poznámka (zákazník ji nevidí)' }), note]),
      save
    ])
  ]);
  const node = h('div');
  // U poptávky smí CRM měnit jen stav a interní poznámku.
  status.addEventListener('change', () => commit(updateDoc(refOf('inquiries', id), { status: status.value, ...stamp() }), `Stav poptávky: ${INQUIRY_STATUS_LABEL[status.value]}.`));
  save.addEventListener('click', () => commit(updateDoc(refOf('inquiries', id), { note: clean(note.value), ...stamp() }), 'Poznámka uložena.'));
  function update() {
    const inquiry = find('inquiries', id);
    if (!inquiry) return fill(node, emptyState('Tato poptávka už neexistuje.', 'Zpět na poptávky', () => go('#/poptavky')));
    if (body.parentNode !== node) fill(node, body);
    fill(head, h('h2', { text: inquiry.name || 'Bez jména' }), h('p', { class: 'detail-sub' }, [statusPill(inquiry.status), h('span', { text: `Přijato ${formatDateTime(inquiry.createdAt)}` })]));
    fill(actions,
      bigAction('Zavolat', 'phone', inquiry.phone && telHref(inquiry.phone)),
      bigAction('E-mail', 'mail', inquiry.email && `${mailHref(inquiry.email)}?subject=${encodeURIComponent(`Re: Poptávka – ${inquiryService(inquiry)}`)}`),
      bigAction('Navigovat', 'pin', inquiry.location && mapHref(inquiry.location), true));

    const job = jobOfInquiry(inquiry);
    const match = !job && matchCustomer(inquiry);
    fill(convert, job ? [
      h('p', { class: 'convert-text', text: 'Poptávka už je převedená na zakázku.' }),
      h('a', { class: 'btn btn-primary', href: `#/zakazky/${job.id}` }, [`Otevřít zakázku: ${job.title}`, smallIcon('chevron')])
    ] : [
      h('p', { class: 'convert-text', text: match ? `Zakázka se přiřadí ke stávajícímu zákazníkovi „${match.name}“ (shodný e-mail nebo telefon).` : `Založí se nový zákazník „${inquiry.name || 'Bez jména'}“ a k němu zakázka ve fázi Poptávka.` }),
      h('button', { type: 'button', class: 'btn btn-primary', text: 'Převést na zákazníka a zakázku', onclick: () => { const fresh = find('inquiries', id); if (fresh) convertInquiry(fresh); } })
    ]);

    detailList(fields, [
      ['Služba', inquiryService(inquiry)], ['Druh poptávky', INQUIRY_KIND_LABEL[inquiry.kind]], ['Servisní program', inquiry.program && (PROGRAM_LABEL[inquiry.program] || inquiry.program)],
      ['Obec', inquiry.location], ['Výrobce', inquiry.manufacturer], ['Typ zařízení', inquiry.deviceType],
      ['Jméno', inquiry.name], ['E-mail', inquiry.email], ['Telefon', inquiry.phone], ['Zpráva', inquiry.message]
    ]);
    const attachments = Array.isArray(inquiry.attachments) ? inquiry.attachments.filter(file => file && typeof file === 'object') : [];
    const key = attachments.map(file => file.path).join('|');
    if (key !== filesKey) { // přílohy se nemění, zbytečně je nepřekreslujeme
      filesKey = key;
      fill(files, attachments.length ? [h('p', { class: 'attachments-title', text: 'Přílohy' }), ...attachments.map(attachmentLink)] : []);
      files.hidden = !attachments.length;
    }
    if (document.activeElement !== status) status.value = INQUIRY_STATUS_LABEL[inquiry.status] ? inquiry.status : 'new';
    if (!noteLoaded) { note.value = inquiry.note || ''; noteLoaded = true; }
  }
  return { title: 'Poptávka', tab: 'prehled', back: '#/poptavky', node, update };
}

// ----- Více -----
function screenMore() {
  const users = h('div', { class: 'list' });
  const menuLink = (label, iconName, href, external = false) => h('a', { class: 'row menu-item', href, target: external && '_blank', rel: external && 'noopener' }, [icon(iconName), h('span', { class: 'row-main', text: label }), smallIcon(external ? 'external' : 'chevron')]);
  const node = h('div', { class: 'stack' }, [
    section('Přihlášený uživatel', h('div', { class: 'card user-card' }, [
      icon('user'), h('span', { class: 'row-main' }, [h('strong', { text: me() }), h('span', { class: 'row-sub', text: 'Stejné přihlášení jako do Správy webu' })])
    ])),
    section('Uživatelé', [users, h('p', { class: 'hint', text: 'Přístup do CRM má každý, kdo je na seznamu správců webu. Přidat nebo odebrat uživatele lze ve Správě webu na kartě „Správci“.' })],
      h('a', { class: 'section-link', href: '../admin/index.html' }, ['Spravovat', smallIcon('chevron')])),
    section('Data', h('div', { class: 'list' }, [
      h('button', { type: 'button', class: 'row menu-item', onclick: exportCustomers }, [icon('download'), h('span', { class: 'row-main' }, [h('strong', { text: 'Export zákazníků (CSV)' }), h('span', { class: 'row-sub', text: 'Tabulka pro Excel – středník, kódování UTF-8' })]), smallIcon('chevron')])
    ])),
    section('Další', h('div', { class: 'list' }, [
      menuLink('Poptávky z webu', 'inbox', '#/poptavky'),
      menuLink('Úkoly', 'tasks', '#/ukoly'),
      menuLink('Správa webu', 'external', '../admin/index.html'),
      menuLink('Nápověda', 'help', '../admin/napoveda.html#crm', true)
    ])),
    h('button', { type: 'button', class: 'btn btn-signout', 'data-sign-out': true }, [smallIcon('logout'), 'Odhlásit se']),
    h('p', { class: 'app-note', text: 'Čistá řešení · WHITE ELEPHANT s.r.o.' })
  ]);
  function update() {
    const list = [...state.admins].sort((a, b) => a.id.localeCompare(b.id));
    fill(users, list.length ? list.map(admin => h('div', { class: 'row user-row' }, [
      h('span', { class: 'avatar', 'aria-hidden': 'true', text: admin.id.charAt(0).toUpperCase() }),
      h('span', { class: 'row-main' }, [h('strong', { text: admin.id }), admin.id === me() && h('span', { class: 'row-sub', text: 'to jste vy' })])
    ])) : h('p', { class: 'empty', text: 'Seznam uživatelů se nepodařilo načíst.' }));
  }
  return { title: 'Více', tab: 'vice', node, update };
}

// =====================================================================
// SMĚROVÁNÍ (adresa za křížkem, aby fungovalo tlačítko Zpět na telefonu)
// =====================================================================
const SCREENS = {
  prehled: () => screenDashboard(),
  zakazky: id => id ? screenJob(id) : screenJobs(),
  zakaznici: id => id ? screenCustomer(id) : screenCustomers(),
  servis: () => screenService(),
  poptavky: id => id ? screenInquiry(id) : screenInquiries(),
  ukoly: () => screenTasks(),
  vice: () => screenMore()
};
const TITLES = { prehled: 'Přehled', zakazky: 'Zakázky', zakaznici: 'Zákazníci', servis: 'Servis', poptavky: 'Poptávky z webu', ukoly: 'Úkoly', vice: 'Více' };
const TABS = ['prehled', 'zakazky', 'zakaznici', 'servis', 'vice'];
let current = null;
let currentKey = '';
let screenTitle = 'Přehled';
const scrollMemory = new Map();
const trail = []; // navštívené adresy; díky nim šipka Zpět ví, zda se dá vrátit v historii

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(part => { try { return decodeURIComponent(part); } catch { return part; } });
  return { name: parts[0] || 'prehled', id: parts[1] || '' };
}
function route() {
  if ($('#view-main').hidden) return;
  const { name, id } = parseHash();
  const build = SCREENS[name];
  if (!build) { location.replace('#/prehled'); return; }
  const key = `${name}/${id}`;
  if (current && currentKey !== key) scrollMemory.set(currentKey, window.scrollY);
  current = ready() ? build(id) : null;
  currentKey = key;
  const tab = current?.tab || (TABS.includes(name) ? name : 'prehled');
  $$('[data-nav]').forEach(link => {
    if (link.dataset.nav === tab) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  setAppbar(current || { title: TITLES[name] });
  const screen = $('#screen');
  screen.classList.toggle('is-wide', !!current?.wide);
  fill(screen, current ? current.node : h('div', { class: 'screen-loading' }, h('div', { class: 'spinner', role: 'status', 'aria-label': 'Načítám' })));
  current?.update();
  updateBadges();
  // Výpisy si pamatují, kam uživatel doroloval; detail začíná vždy nahoře.
  window.scrollTo(0, (!id && scrollMemory.get(key)) || 0);
}
function setAppbar({ title, back = '', action = null }) {
  screenTitle = title;
  $('#screen-title').textContent = title;
  const link = $('#appbar-back');
  link.hidden = !back;
  if (back) link.setAttribute('href', back); else link.removeAttribute('href');
  fill($('#appbar-action'), action && h('button', { type: 'button', class: 'btn btn-primary btn-action', onclick: action.onclick }, [smallIcon(action.icon || 'plus'), h('span', { text: action.label })]));
}
function updateBadges() {
  const fresh = state.inquiries.filter(inquiry => inquiry.status === 'new').length;
  const badge = $('#nav-badge');
  badge.textContent = String(fresh);
  badge.hidden = !fresh;
  badge.setAttribute('aria-label', `${fresh} ${plural(fresh, 'nová poptávka', 'nové poptávky', 'nových poptávek')}`);
  document.title = `${fresh ? `(${fresh}) ` : ''}${screenTitle} | CRM Čistá řešení`;
}
// Přechod na jinou obrazovku; počká, až se z historie odebere krok zavřeného formuláře.
function go(hash) {
  const move = () => { if (location.hash === hash) route(); else location.hash = hash; };
  if (pendingBack) pendingBack.then(move); else move();
}

try { history.scrollRestoration = 'manual'; } catch { /* starší prohlížeč */ }
$$('[data-nav]').forEach(link => link.setAttribute('href', `#/${link.dataset.nav}`));
window.addEventListener('hashchange', () => {
  // Krok zpět poznáme podle toho, že se vracíme na předposlední navštívenou adresu.
  if (trail.length > 1 && trail[trail.length - 2] === location.hash) trail.pop(); else trail.push(location.hash);
  route();
  $('#screen').focus({ preventScroll: true });
});
trail.push(location.hash);
// Šipka Zpět se chová jako tlačítko Zpět; jen po přímém otevření detailu vede na nadřazený výpis.
$('#appbar-back').addEventListener('click', event => {
  if (trail.length < 2) return;
  event.preventDefault();
  history.back();
});
