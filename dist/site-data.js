'use strict';
/*
 * Čistá řešení — napojení veřejného webu na redakční systém.
 *
 * Reference spravované v administraci se načítají z databáze (Firestore REST API,
 * bez dalších knihoven). Statický obsah stránky zůstává jako záloha: když se data
 * nepodaří načíst, návštěvník uvidí původní výpis.
 *
 * Veřejné API: window.CRData { listReferences, getReference, getSettings, createInquiry }
 */
(() => {
  const config = window.CR_CMS;
  if (!config) return;
  const script = document.currentScript;
  const siteRoot = new URL('.', script.src).href;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  let emulator = false;
  try { emulator = local && localStorage.getItem('crEmulator') === '1'; } catch { /* soukromý režim */ }
  const host = emulator ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
  const database = `projects/${config.projectId}/databases/(default)`;
  const documents = `${host}/v1/${database}/documents`;
  const keyParam = emulator ? '' : `?key=${encodeURIComponent(config.apiKey)}`;

  // ---------- Převod hodnot Firestore REST <-> JavaScript ----------
  function decode(value) {
    if (!value) return null;
    if ('stringValue' in value) return value.stringValue;
    if ('booleanValue' in value) return value.booleanValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return value.doubleValue;
    if ('timestampValue' in value) return value.timestampValue;
    if ('nullValue' in value) return null;
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
    if ('mapValue' in value) return decodeFields(value.mapValue.fields);
    return null;
  }
  function decodeFields(fields = {}) {
    return Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, decode(value)]));
  }
  function decodeDocument(doc) {
    return { id: doc.name.split('/').pop(), ...decodeFields(doc.fields) };
  }
  const text = value => ({ stringValue: String(value) });

  async function request(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = new Error(`Firestore ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  // ---------- Čtení ----------
  const LIST_FIELDS = ['title', 'location', 'date', 'sortDate', 'categories', 'summary', 'headline', 'cover',
    'coverNote', 'featured', 'published', 'legacyUrl', 'dynamic', 'facts', 'createdAt'];

  async function listReferences({ withDescription = false, withPhotos = false } = {}) {
    const fields = [...LIST_FIELDS, ...(withDescription ? ['description'] : []), ...(withPhotos ? ['photos'] : [])];
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'references' }],
        where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } },
        select: { fields: fields.map(fieldPath => ({ fieldPath })) }
      }
    };
    const rows = await request(`${documents}:runQuery${keyParam}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return rows.filter(row => row.document).map(row => decodeDocument(row.document)).sort(compareReferences);
  }

  async function getReference(id) {
    return decodeDocument(await request(`${documents}/references/${encodeURIComponent(id)}${keyParam}`));
  }

  async function getSettings() {
    try {
      const settings = decodeDocument(await request(`${documents}/settings/site${keyParam}`));
      if (Array.isArray(settings.categories) && settings.categories.length) return settings;
    } catch { /* nastavení zatím neexistuje – použijí se výchozí kategorie */ }
    return { categories: config.categories };
  }

  // ---------- Poptávka ----------
  async function createInquiry(data) {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(15)), byte => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[byte % 62]).join('');
    const fields = { status: text('new') };
    for (const name of ['service', 'serviceLabel', 'location', 'manufacturer', 'deviceType', 'name', 'email', 'phone', 'message', 'page']) {
      const value = (data[name] || '').toString().trim();
      if (value) fields[name] = text(value);
    }
    await request(`${documents}:commit${keyParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [{
          update: { name: `${database}/documents/inquiries/${id}`, fields },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false }
        }]
      })
    });
    return id;
  }

  // ---------- Pomocné funkce pro vykreslení ----------
  function compareReferences(a, b) {
    const first = b.sortDate || b.date || '', second = a.sortDate || a.date || '';
    if (first !== second) return first < second ? -1 : 1;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  }
  const dateLabel = date => /^\d{4}-\d{2}$/.test(date || '') ? `${date.slice(5)} / ${date.slice(0, 4)}` : '';
  const assetUrl = url => url ? new URL(url, siteRoot).href : '';
  const detailUrl = ref => (ref.legacyUrl && !ref.dynamic)
    ? new URL(ref.legacyUrl, siteRoot).href
    : `${siteRoot}realizace/detail.html?id=${encodeURIComponent(ref.id)}`;
  const labelsOf = settings => Object.fromEntries(settings.categories.map(item => [item.key, item.label]));
  const metaLine = ref => [ref.location, dateLabel(ref.date), ref.coverNote].filter(Boolean).join(' · ');

  function element(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === false || value == null) continue;
      if (name === 'text') node.textContent = value;
      else if (name === 'class') node.className = value;
      else node.setAttribute(name, value === true ? '' : value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }
  function picture(image, alt, fallbackSize = [800, 600]) {
    if (!image || !(image.thumb || image.url)) return null;
    return element('img', {
      src: assetUrl(image.thumb || image.url), alt, loading: 'lazy', decoding: 'async',
      width: image.w || fallbackSize[0], height: image.h || fallbackSize[1]
    });
  }
  const spriteIcon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${name}`); svg.append(use); svg.setAttribute('aria-hidden', 'true');
    return svg;
  };
  // Šipka jako SVG: znak ↗ v písmu Manrope není a každý telefon by ho kreslil jinak.
  const arrowIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.setAttribute('class', 'ico'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    path.setAttribute('d', 'M7 17 17 7M8 7h9v9'); svg.append(path);
    return svg;
  };
  const announce = name => document.dispatchEvent(new CustomEvent(name));

  // ---------- Úvodní stránka: vybrané reference ----------
  async function renderHomeProjects(grid) {
    const [references, settings] = await Promise.all([listReferences(), getSettings()]);
    const featured = references.filter(ref => ref.featured).slice(0, 8);
    if (!featured.length) return;
    const labels = labelsOf(settings);
    grid.replaceChildren(...featured.map(ref => {
      const category = (ref.categories || [])[0] || 'ostatni';
      const title = ref.headline || ref.title;
      return element('a', { class: 'project', href: detailUrl(ref), 'data-category': category }, [
        element('div', { class: 'project-image' }, [
          picture(ref.cover, ref.title),
          element('span', { class: 'image-tag', text: (labels[category] || 'Realizace').toUpperCase() }),
          element('span', { class: 'project-arrow' }, spriteIcon('up-right'))
        ]),
        element('div', { class: 'project-meta' }, [
          element('span', { text: ref.location || labels[category] || 'Realizace' }),
          element('span', { text: dateLabel(ref.date) })
        ]),
        element('h3', { text: title }),
        element('p', { text: ref.summary || '' })
      ]);
    }));
    // Filtr nabízí jen kategorie, které mezi vybranými referencemi opravdu jsou.
    const filters = document.querySelector('#realizace .filters');
    if (filters) {
      const used = settings.categories.filter(item => featured.some(ref => ((ref.categories || [])[0] || 'ostatni') === item.key));
      filters.replaceChildren(
        element('button', { class: 'active', 'data-filter': 'all', 'aria-pressed': 'true', type: 'button', text: 'Všechny realizace' }),
        ...(used.length > 1 ? used.map(item => element('button', { 'data-filter': item.key, 'aria-pressed': 'false', type: 'button', text: item.label })) : [])
      );
    }
    announce('cr:home-projects-rendered');
  }

  // ---------- Stránka Realizace: celý výpis ----------
  function referenceCard(ref, labels) {
    const categories = (ref.categories || []).length ? ref.categories : ['ostatni'];
    const facts = (ref.facts || []).filter(fact => fact && fact.label && fact.value).slice(0, 3);
    return element('a', {
      class: 'content-card project-card', href: detailUrl(ref), 'data-reference-card': true,
      'data-categories': categories.join(' '),
      'data-search': [ref.title, ref.location, ref.summary, ref.description, facts.map(fact => fact.value).join(' ')].filter(Boolean).join(' ')
    }, [
      element('div', { class: 'card-picture' }, [
        picture(ref.cover, ref.title),
        element('span', { text: labels[categories[0]] || 'Realizace' }),
        element('b', { class: 'card-round-arrow', 'aria-hidden': 'true' }, arrowIcon())
      ]),
      element('div', { class: 'card-meta', text: metaLine(ref) || 'Realizace' }),
      element('h2', { text: ref.title }),
      element('p', { text: ref.summary || '' }),
      element('dl', { class: 'project-card-facts' }, facts.map(fact => element('div', {}, [
        element('dt', { text: fact.label }), element('dd', { text: fact.value })
      ]))),
      element('span', { class: 'text-link' }, ['Prohlédnout projekt ', arrowIcon()])
    ]);
  }

  async function renderReferenceLibrary(grid) {
    const [references, settings] = await Promise.all([listReferences({ withDescription: true }), getSettings()]);
    if (!references.length) return;
    const labels = labelsOf(settings);
    grid.replaceChildren(...references.map(ref => referenceCard(ref, labels)));
    const filters = document.querySelector('.project-library .content-filters');
    if (filters) {
      const used = settings.categories.filter(item => references.some(ref => (ref.categories || []).includes(item.key)));
      filters.replaceChildren(
        element('button', { 'data-content-filter': 'all', 'aria-pressed': 'true', type: 'button', text: 'Všechny projekty' }),
        ...used.map(item => element('button', { 'data-content-filter': item.key, 'aria-pressed': 'false', type: 'button', text: item.label }))
      );
    }
    const count = document.querySelector('.ed-count b');
    if (count) count.textContent = references.length;
    renderFeaturedProject(references.find(ref => ref.featured) || references[0]);
    announce('cr:references-rendered');
  }

  function renderFeaturedProject(ref) {
    const block = document.querySelector('.featured-project');
    if (!block || !ref || !ref.cover) return;
    const href = detailUrl(ref);
    block.querySelectorAll('a').forEach(link => { link.href = href; });
    const image = block.querySelector('.featured-image img');
    image.src = assetUrl(ref.cover.url || ref.cover.thumb); image.alt = ref.title;
    block.querySelector('.ed-kicker').textContent = metaLine(ref) || 'Z našich projektů';
    block.querySelector('h2').textContent = ref.headline || ref.title;
    block.querySelector('.featured-copy > p:not(.ed-kicker)').textContent = ref.summary || '';
  }

  // ---------- Galerie: skrytí smazaných a doplnění nových fotografií ----------
  async function syncGallery(grid) {
    const references = await listReferences({ withPhotos: true });
    const published = new Set(references.filter(ref => ref.legacyUrl).map(ref => ref.legacyUrl));
    const select = document.getElementById('gallery-project');
    // U původních referencí upravených v administraci platí seznam fotografií z databáze.
    const edited = new Map(references.filter(ref => ref.legacyUrl && ref.dynamic)
      .map(ref => [ref.legacyUrl, new Set((ref.photos || []).map(photo => assetUrl(photo && photo.url)))]));
    grid.querySelectorAll('[data-gallery-project]').forEach(item => {
      const project = item.dataset.galleryProject;
      if (!published.has(project) || (edited.has(project) && !edited.get(project).has(item.href))) item.remove();
    });
    select?.querySelectorAll('option').forEach(option => {
      if (option.value !== 'all' && !published.has(option.value)) option.remove();
    });
    // Fotografie přidané v administraci (nové reference i doplněné snímky původních).
    const existing = new Set([...grid.querySelectorAll('[data-lightbox]')].map(item => item.href));
    const additions = [];
    for (const ref of references) {
      const key = ref.legacyUrl || `cms:${ref.id}`;
      const photos = (ref.photos || []).filter(photo => photo && photo.url && !existing.has(assetUrl(photo.url)));
      if (!photos.length) continue;
      photos.forEach((photo, index) => {
        const caption = `${ref.title} — fotografie ${index + 1}`;
        additions.push(element('a', { class: 'media-item', href: assetUrl(photo.url), 'data-lightbox': true, 'data-caption': caption, 'data-gallery-project': key }, [
          element('figure', {}, [
            picture(photo, caption, [1200, 900]),
            element('span', { class: 'media-zoom', 'aria-hidden': 'true', text: '+' }),
            element('figcaption', { text: caption })
          ])
        ]));
      });
      if (select && ![...select.options].some(option => option.value === key)) {
        select.insertBefore(element('option', { value: key, text: ref.title }), select.options[1] || null);
      }
    }
    grid.prepend(...additions);
    const total = document.querySelector('.ed-count b');
    if (total) total.textContent = grid.querySelectorAll('[data-lightbox]').length;
    announce('cr:gallery-updated');
  }

  // ---------- Detail reference vytvořené nebo upravené v administraci ----------
  async function renderReferenceDetail(rootNode) {
    const id = new URLSearchParams(location.search).get('id');
    const fail = () => {
      rootNode.querySelector('[data-detail-loading]')?.setAttribute('hidden', '');
      rootNode.querySelector('[data-detail-missing]')?.removeAttribute('hidden');
    };
    if (!id || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) return fail();
    let ref, settings;
    try { [ref, settings] = await Promise.all([getReference(id), getSettings()]); } catch { return fail(); }
    if (!ref.published) return fail();
    const labels = labelsOf(settings);
    const categories = (ref.categories || []).map(key => labels[key]).filter(Boolean);
    const photos = (ref.photos || []).filter(photo => photo && photo.url);
    const cover = ref.cover && (ref.cover.url || ref.cover.thumb) ? ref.cover : photos[0];
    const paragraphs = String(ref.description || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
    const lead = ref.summary || (paragraphs[0] || '').slice(0, 220);
    const set = (selector, value) => { const node = rootNode.querySelector(selector); if (node) node.textContent = value; return node; };

    document.title = `${ref.title} | Čistá řešení`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', lead);
    set('[data-detail-title]', ref.title);
    set('[data-detail-crumb]', ref.title);
    set('[data-detail-lead]', lead);
    rootNode.querySelector('[data-detail-tags]').replaceChildren(
      ...[...categories, dateLabel(ref.date), ref.location].filter(Boolean).map(value => element('span', { text: value }))
    );

    const visual = rootNode.querySelector('[data-detail-visual]');
    if (cover) {
      visual.replaceChildren(
        element('img', { src: assetUrl(cover.url || cover.thumb), alt: `Fotografie z realizace: ${ref.title}`, width: cover.w || 1200, height: cover.h || 900, fetchpriority: 'high', decoding: 'async' }),
        element('figcaption', { text: 'Fotografie z realizace' })
      );
    } else {
      visual.hidden = true;
    }

    const facts = [];
    if (categories.length) facts.push(['Oblast řešení', categories.join(' / ')]);
    if (ref.location) facts.push(['Místo', ref.location]);
    if (dateLabel(ref.date)) facts.push(['Období realizace', dateLabel(ref.date)]);
    (ref.facts || []).forEach(fact => { if (fact && fact.label && fact.value) facts.push([fact.label, fact.value]); });
    rootNode.querySelector('[data-detail-facts]').replaceChildren(...facts.map(([label, value]) => element('div', {}, [
      element('dt', { text: label }), element('dd', { text: value })
    ])));

    // Popis: odstavce oddělené prázdným řádkem; řádky začínající pomlčkou tvoří odrážky.
    const story = rootNode.querySelector('[data-detail-story]');
    story.replaceChildren(...paragraphs.map(part => {
      const lines = part.split('\n').map(line => line.trim()).filter(Boolean);
      if (lines.length > 1 && lines.every(line => /^[-•–]\s+/.test(line))) {
        return element('ul', {}, lines.map(line => element('li', { text: line.replace(/^[-•–]\s+/, '') })));
      }
      return element('p', { text: lines.join(' ') });
    }));
    rootNode.querySelector('[data-detail-story-section]').hidden = !paragraphs.length;

    const gallery = rootNode.querySelector('[data-detail-gallery]');
    const gallerySection = rootNode.querySelector('[data-detail-gallery-section]');
    gallerySection.hidden = !photos.length;
    if (photos.length) {
      set('[data-detail-gallery-count]', `${photos.length} ${photos.length === 1 ? 'snímek' : photos.length < 5 ? 'snímky' : 'snímků'}`);
      gallery.replaceChildren(...photos.map((photo, index) => {
        const caption = photo.alt || `${ref.title} — fotografie ${index + 1}`;
        return element('a', { class: 'media-item', href: assetUrl(photo.url), 'data-lightbox': true, 'data-caption': caption }, [
          element('figure', {}, [
            picture(photo, caption, [1200, 900]),
            element('span', { class: 'media-zoom', 'aria-hidden': 'true', text: '+' }),
            element('figcaption', { text: caption })
          ])
        ]);
      }));
    }
    rootNode.querySelectorAll('[data-detail-gallery-link]').forEach(link => { link.hidden = !photos.length; });

    const service = ['servis', 'rekonstrukce', 'destovka', 'cerpani', 'cov'].find(key => (ref.categories || []).includes(key));
    const inquiry = `${siteRoot}index.html?reseni=${(ref.categories || []).includes('commercial') && !service ? 'cov_firmy' : service || 'poradit'}#poptavka`;
    rootNode.querySelectorAll('[data-detail-inquiry]').forEach(link => { link.href = inquiry; });

    rootNode.querySelector('[data-detail-loading]')?.setAttribute('hidden', '');
    rootNode.querySelector('[data-detail-content]').hidden = false;
  }

  // ---------- Původní (statické) detaily: respektovat změny z administrace ----------
  async function guardLegacyDetail(id) {
    try {
      const ref = await getReference(id);
      if (ref.published && ref.dynamic) location.replace(`${siteRoot}realizace/detail.html?id=${encodeURIComponent(id)}`);
    } catch (error) {
      // 403/404 = reference byla skryta nebo smazána. Než návštěvníka přesměrujeme, ověříme,
      // že databáze jinak odpovídá — výpadek ani chyba konfigurace nesmí stránku schovat.
      if (error.status !== 403 && error.status !== 404) return;
      try {
        const published = await listReferences();
        if (published.length && !published.some(ref => ref.id === id)) location.replace(`${siteRoot}reference.html`);
      } catch { /* ponecháme statickou stránku */ }
    }
  }

  window.CRData = { listReferences, getReference, getSettings, createInquiry, dateLabel, detailUrl, siteRoot, emulator };

  const run = (selector, task) => {
    const node = document.querySelector(selector);
    if (node) task(node).catch(error => console.warn('Čistá řešení: data z administrace se nepodařilo načíst.', error));
  };
  run('[data-cms="home-projects"]', renderHomeProjects);
  run('[data-cms="reference-grid"]', renderReferenceLibrary);
  run('[data-cms="gallery-grid"]', syncGallery);
  run('[data-cms="reference-detail"]', renderReferenceDetail);
  const legacyId = document.body.dataset.referenceId;
  if (legacyId) guardLegacyDetail(legacyId);
})();
