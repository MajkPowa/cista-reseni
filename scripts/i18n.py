"""Language versions of the site (English, Hungarian) built from the finished Czech pages.

The Czech site in dist/ stays the single source. This script reads every public page, cuts its text
into translation units (one block of running text = one unit, inline markup kept as numbered
placeholders such as <a1>…</a1> or <br2/>), looks each unit up in i18n/<lang>.json and writes the
translated page to dist/<lang>/<same path>. Styles, images and fonts are shared with the Czech site;
scripts with visible texts get a translated copy. Every page (Czech ones included) gets the language
switcher and hreflang links.

  python scripts/i18n.py extract        # i18n/source.json: every unit the site contains
  python scripts/i18n.py build          # dist/en, dist/hu (fails when a translation is missing)
  python scripts/i18n.py build --draft  # the same, missing units stay Czech and are listed
"""
from __future__ import annotations

import copy
import hashlib
import html
import json
import re
import shutil
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
I18N = ROOT / 'i18n'
# code -> (name shown in the switcher, <html lang>, og:locale)
LANGS = {'en': ('English', 'en', 'en_GB'), 'hu': ('Magyar', 'hu', 'hu_HU')}
SOURCE = ('Čeština', 'cs', 'cs_CZ')
# Internal tools stay Czech; language trees are never read as a source.
EXCLUDED_DIRS = {'admin', 'crm', 'assets', 'data', *LANGS}
# Scripts with visible texts: each language gets its own translated copy next to its pages.
JS_FILES = ('app.js', 'cms-config.js', 'content.js', 'experience.js', 'navigation.js', 'polish.js', 'services.js', 'site-data.js')

INLINE = {'a', 'abbr', 'b', 'br', 'cite', 'code', 'em', 'i', 'img', 'mark', 'q', 's', 'small', 'span', 'strong',
          'sub', 'sup', 'svg', 'time', 'u', 'wbr'}
OPAQUE = {'br', 'img', 'svg', 'wbr'}
SKIP = {'script', 'style', 'svg'}
TEXT_ATTRS = ('alt', 'title', 'aria-label', 'placeholder', 'data-caption', 'data-copy-label')
META_NAMES = {'description', 'twitter:title', 'twitter:description'}
META_PROPS = {'og:title', 'og:description', 'og:site_name', 'og:image:alt'}
URL_ATTRS = ('href', 'src', 'poster', 'data-src-wide', 'data-src-tall', 'data-poster-wide', 'data-poster-tall')

# Repeating texts: the pattern is translated once, its variable parts on their own.
PATTERNS = [
    (re.compile(r'^(.+) — fotografie (\d+)$'), '{0} — fotografie {1}'),
    (re.compile(r'^(.+) — Produktové vyobrazení ze zdrojového webu (\d+)$'), '{0} — Produktové vyobrazení ze zdrojového webu {1}'),
    (re.compile(r'^Fotografie z realizace: (.+)$'), 'Fotografie z realizace: {0}'),
    (re.compile(r'^Galerie \((\d+)\)$'), 'Galerie ({0})'),
    (re.compile(r'^(.+) \| Čistá řešení$'), '{0} | Čistá řešení'),
]

# Script literals without diacritics that are visible text (everything with diacritics is taken automatically).
JS_PLAIN = {'Dotaz', 'Stav instalace', 'Odebrat soubor {0}', 'Obec', 'Telefon', 'Sbalit galerii', 'Zavolat',
            '04 / Servis a obnova', 'Realizace', 'Fotografie z realizace', 'Zavolat {0}', '{0} — fotografie {1}',
            'Fotografie z realizace: {0}', 'snímek|snímky|snímků'}
# Script literals with diacritics that must stay as they are.
JS_KEEP = {'Čistá řešení: data z administrace se nepodařilo načíst.'}

# Texts added by this script.
UI = {
    'cs': {'language': 'Jazyk', 'video_note': ''},
    'en': {'language': 'Language'},
    'hu': {'language': 'Nyelv'},
}
# Shorter wording for the main menu only (the full wording is used everywhere else).
NAV_SHORT = {
    'en': {'WWTP servicing': 'Servicing', 'Commissioning and training': 'Commissioning & training',
           'WWTPs for businesses and municipalities': 'Business & municipal WWTPs'},
    'hu': {'Szennyvíztisztító-szerviz': 'Szerviz', 'Üzembe helyezés és oktatás': 'Beüzemelés és oktatás',
           'Szennyvíztisztító cégeknek és önkormányzatoknak': 'Cégeknek és önkormányzatoknak'},
}
PHONE_LOCAL = re.compile(r'(?<![+\d] )(?<![+\d])736 403 795')

LETTER = re.compile(r'[^\W\d_]')
CZECH = re.compile(r'[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]')
SPACE = re.compile(r'[\s ]+')
TOKEN = re.compile(r'<(/?)([a-z]+\d+)(/?)>')
SLOT = re.compile(r'\{(\d+)\}')


def norm(text: str) -> str:
    return SPACE.sub(' ', text).strip()


def has_letters(text: str) -> bool:
    return bool(LETTER.search(text))


def pages() -> list[Path]:
    return [path for path in sorted(DIST.rglob('*.html')) if path.relative_to(DIST).parts[0] not in EXCLUDED_DIRS]


def site_settings() -> tuple[str, bool]:
    source = (ROOT / 'scripts' / 'build_content.py').read_text(encoding='utf-8')
    url = re.search(r"^SITE_URL='([^']+)'", source, re.M).group(1)
    indexable = re.search(r'^INDEXABLE=(True|False)', source, re.M).group(1) == 'True'
    return url, indexable


# ---------------------------------------------------------------- HTML units
def frozen(tag: Tag) -> bool:
    return tag.name in SKIP or tag.get('translate') == 'no'


def direct_text(tag: Tag) -> bool:
    return any(isinstance(child, NavigableString) and not isinstance(child, Comment) and has_letters(child)
               for child in tag.children)


def inline_only(tag: Tag) -> bool:
    return all(child.name in INLINE and child.get('translate') != 'no' for child in tag.find_all(True))


def serialize(tag: Tag, slots: dict[str, Tag], counter: list[int]) -> str:
    out = []
    for child in tag.children:
        if isinstance(child, Comment):
            continue
        if isinstance(child, NavigableString):
            out.append(html.escape(str(child), quote=False))
            continue
        counter[0] += 1
        name = f'{child.name}{counter[0]}'
        slots[name] = child
        if child.name in OPAQUE or not has_letters(child.get_text()):
            out.append(f'<{name}/>')
        else:
            out.append(f'<{name}>{serialize(child, slots, counter)}</{name}>')
    return ''.join(out)


def deserialize(soup: BeautifulSoup, text: str, slots: dict[str, Tag]) -> list:
    """Turn a translated unit back into nodes; raises ValueError when placeholders do not match."""
    nodes: list = []
    stack: list[tuple[str, Tag]] = []
    used: list[str] = []
    position = 0

    def push(node):
        if stack:
            stack[-1][1].append(node)
        else:
            nodes.append(node)

    for match in TOKEN.finditer(text):
        if match.start() > position:
            push(NavigableString(html.unescape(text[position:match.start()])))
        position = match.end()
        closing, name, selfclosing = match.groups()
        if name not in slots:
            raise ValueError(f'unknown placeholder <{name}>')
        if selfclosing:
            used.append(name)
            push(copy.copy(slots[name]))
        elif closing:
            if not stack or stack[-1][0] != name:
                raise ValueError(f'unbalanced </{name}>')
            stack.pop()
        else:
            used.append(name)
            original = slots[name]
            clone = soup.new_tag(original.name, attrs=dict(original.attrs))
            push(clone)
            stack.append((name, clone))
    if stack:
        raise ValueError(f'unclosed <{stack[-1][0]}>')
    if position < len(text):
        push(NavigableString(html.unescape(text[position:])))
    if sorted(used) != sorted(slots):
        raise ValueError(f'placeholders differ: expected {sorted(slots)}, got {sorted(used)}')
    return nodes


class Unit:
    """One translatable piece of a page with the way to write its translation back."""

    def __init__(self, source: str, kind: str, apply):
        self.source, self.kind, self.apply = source, kind, apply


def edges(raw: str) -> tuple[str, str]:
    return (' ' if raw[:1].isspace() else ''), (' ' if raw[-1:].isspace() else '')


def collect(soup: BeautifulSoup) -> list[Unit]:
    units: list[Unit] = []

    # Attributes first: unit placeholders clone elements together with their (translated) attributes.
    for tag in soup.find_all(True):
        if tag.name in ('script', 'style') or tag.get('translate') == 'no':
            continue
        if tag.find_parent(lambda parent: parent.get('translate') == 'no'):
            continue
        names = [name for name in TEXT_ATTRS if tag.get(name)]
        if tag.name == 'meta' and tag.get('content') and (tag.get('name') in META_NAMES or tag.get('property') in META_PROPS):
            names.append('content')
        for name in names:
            if has_letters(tag[name]):
                units.append(Unit(norm(tag[name]), f'@{name}', lambda text, tag=tag, name=name: tag.__setitem__(name, html.unescape(text))))

    def walk(tag: Tag):
        if frozen(tag):
            return
        if direct_text(tag):
            if inline_only(tag):
                slots: dict[str, Tag] = {}
                raw = serialize(tag, slots, [0])
                lead, trail = edges(raw)

                def apply(text, tag=tag, slots=slots, lead=lead, trail=trail):
                    nodes = deserialize(soup, text, slots)
                    tag.clear()
                    for node in ([NavigableString(lead)] if lead else []) + nodes + ([NavigableString(trail)] if trail else []):
                        tag.append(node)
                units.append(Unit(norm(raw), tag.name, apply))
                return
            for child in list(tag.children):
                if isinstance(child, NavigableString) and not isinstance(child, Comment) and has_letters(child):
                    raw = html.escape(str(child), quote=False)
                    lead, trail = edges(raw)
                    units.append(Unit(norm(raw), '#text', lambda text, child=child, lead=lead, trail=trail:
                                      child.replace_with(NavigableString(lead + html.unescape(text) + trail))))
        for child in list(tag.children):
            if isinstance(child, Tag):
                walk(child)

    for top in (soup.head, soup.body):
        if top is not None:
            walk(top)

    # Accessible names of drawings.
    for tag in soup.select('svg title, svg desc'):
        if tag.string and has_letters(tag.string) and not tag.find_parent(lambda parent: parent.get('translate') == 'no'):
            units.append(Unit(norm(html.escape(str(tag.string), quote=False)), f'svg {tag.name}',
                              lambda text, tag=tag: setattr(tag, 'string', html.unescape(text))))

    # Structured data: only the description is text for people.
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string or '')
        except ValueError:
            continue
        if isinstance(data, dict) and has_letters(str(data.get('description', ''))):
            def apply(text, script=script, data=data):
                data['description'] = html.unescape(text)
                script.string = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
            units.append(Unit(norm(data['description']), 'jsonld', apply))
    return units


# ---------------------------------------------------------------- script literals
def js_literals(src: str) -> list[tuple[str, int, int, str]]:
    """(quote, start, end, raw text) of every string and template literal; comments and regexes are skipped."""
    out, i, n, before = [], 0, len(src), ''
    while i < n:
        c = src[i]
        if c == '/' and src[i + 1:i + 2] == '/':
            i = src.find('\n', i)
            i = n if i < 0 else i
            continue
        if c == '/' and src[i + 1:i + 2] == '*':
            i = src.find('*/', i) + 2
            continue
        if c == '/' and (before == '' or before in '(,=:[!&|?{};'):
            j, in_class = i + 1, False
            while j < n and src[j] != '\n':
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '[':
                    in_class = True
                elif src[j] == ']':
                    in_class = False
                elif src[j] == '/' and not in_class:
                    break
                j += 1
            i, before = j + 1, '/'
            continue
        if c in '\'"':
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            out.append((c, i, j + 1, src[i + 1:j]))
            i, before = j + 1, c
            continue
        if c == '`':
            j, depth = i + 1, 0
            while j < n:
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '$' and src[j + 1:j + 2] == '{':
                    depth += 1
                    j += 2
                    continue
                if depth and src[j] == '{':
                    depth += 1
                elif depth and src[j] == '}':
                    depth -= 1
                elif not depth and src[j] == '`':
                    break
                j += 1
            out.append(('`', i, j + 1, src[i + 1:j]))
            i, before = j + 1, '`'
            continue
        if not c.isspace():
            before = c
        i += 1
    return out


def template_parts(raw: str) -> tuple[str, list[str]]:
    """Template literal -> ('static text with {0} {1}', [expression sources])."""
    static, expressions, i, n = [], [], 0, len(raw)
    while i < n:
        if raw[i] == '\\':
            static.append(raw[i:i + 2])
            i += 2
            continue
        if raw[i] == '$' and raw[i + 1:i + 2] == '{':
            j, depth = i + 2, 1
            while j < n and depth:
                if raw[j] in '\'"`':
                    quote = raw[j]
                    j += 1
                    while j < n and raw[j] != quote:
                        j += 2 if raw[j] == '\\' else 1
                elif raw[j] == '{':
                    depth += 1
                elif raw[j] == '}':
                    depth -= 1
                j += 1
            static.append('{%d}' % len(expressions))
            expressions.append(raw[i + 2:j - 1])
            i = j
            continue
        static.append(raw[i])
        i += 1
    return ''.join(static), expressions


def js_visible(key: str) -> bool:
    return key not in JS_KEEP and (bool(CZECH.search(SLOT.sub('', key))) or key in JS_PLAIN)


def js_transform(src: str, lookup) -> str:
    """Replace visible literals through lookup(key) -> translation (None keeps the original)."""
    out, position = [], 0
    for quote, start, end, raw in js_literals(src):
        replacement = None
        if quote == '`':
            static, expressions = template_parts(raw)
            expressions = [js_transform(expression, lookup) for expression in expressions]
            key = norm(static)
            text = static
            if js_visible(key):
                translated = lookup(key)
                if translated is not None:
                    if sorted(SLOT.findall(translated)) != sorted(SLOT.findall(key)):
                        raise ValueError(f'script placeholders differ in: {key}')
                    lead, trail = edges(static)
                    text = lead + translated.replace('`', '\\`') + trail
            replacement = '`' + SLOT.sub(lambda match: '${' + expressions[int(match.group(1))] + '}', text) + '`'
        else:
            key = norm(raw)
            if js_visible(key):
                translated = lookup(key)
                if translated is not None:
                    lead, trail = edges(raw)
                    escaped = re.sub(r'(?<!\\)' + re.escape(quote), '\\' + quote, translated)
                    replacement = quote + lead + escaped + trail + quote
        if replacement is not None:
            out.append(src[position:start])
            out.append(replacement)
            position = end
    out.append(src[position:])
    return ''.join(out)


def js_units() -> dict[str, str]:
    """key -> script file, for every visible literal."""
    found: dict[str, str] = {}
    for name in JS_FILES:
        def remember(key, name=name):
            found.setdefault(key, name)
            return None
        js_transform((DIST / name).read_text(encoding='utf-8'), remember)
    return found


# ---------------------------------------------------------------- texts kept in the database
def data_units() -> list[str]:
    """Texts of the migrated references, documents and reviews as stored in the database (drawn from there in the browser)."""
    sys.path.insert(0, str(ROOT / 'scripts'))
    from seed_firestore import build_documents
    found = []
    for path, fields in build_documents().items():
        if path.startswith(('documents/', 'reviews/')):
            for name in ('title', 'kind', 'text', 'name'):
                if has_letters(fields.get(name) or ''):
                    found.append(norm(fields[name]))
            continue
        if not path.startswith('references/'):
            continue
        for name in ('title', 'headline', 'summary', 'location', 'coverNote'):
            if has_letters(fields.get(name) or ''):
                found.append(norm(fields[name]))
        for fact in fields.get('facts', []):
            found.extend(norm(value) for value in (fact['label'], fact['value']) if has_letters(value))
    return list(dict.fromkeys(found))


# ---------------------------------------------------------------- catalogue
def register(seen: dict, source: str, kind: str, where: str):
    for pattern, template in PATTERNS if kind != 'pattern' else []:
        match = pattern.match(source)
        if match:
            register(seen, template, 'pattern', where)
            for group in match.groups():
                if has_letters(group):
                    register(seen, group, kind, where)
            return
    entry = seen.setdefault(source, {'kind': kind, 'where': []})
    if where not in entry['where'] and len(entry['where']) < 2:
        entry['where'].append(where)


def extract() -> dict:
    seen: dict[str, dict] = {}
    for path in pages():
        rel = path.relative_to(DIST).as_posix()
        soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
        for unit in collect(soup):
            register(seen, unit.source, unit.kind, rel)
    for key, name in js_units().items():
        register(seen, key, 'script', name)
    for text in data_units():
        register(seen, text, 'data', 'databáze referencí')
    return seen


class Catalogue:
    def __init__(self, lang: str):
        path = I18N / f'{lang}.json'
        self.entries = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
        self.missing: dict[str, None] = {}

    def get(self, source: str) -> str | None:
        # Lists such as "Category A / Category B" are put together from their parts, so the names always match.
        parts = source.split(' / ')
        if len(parts) > 1 and all(part in self.entries for part in parts):
            return ' / '.join(self.entries[part] for part in parts)
        if source in self.entries:
            return self.entries[source]
        for pattern, template in PATTERNS:
            match = pattern.match(source)
            if match:
                parts = [self.get(group) if has_letters(group) else group for group in match.groups()]
                translated = self.entries.get(template)
                if translated is None:
                    self.missing[template] = None
                if translated is None or None in parts:
                    return None
                return SLOT.sub(lambda slot: parts[int(slot.group(1))], translated)
        self.missing[source] = None
        return None


# ---------------------------------------------------------------- language switcher and head links
def page_url(site_url: str, lang: str, rel: str) -> str:
    return site_url + ('' if lang == 'cs' else f'{lang}/') + ('' if rel == 'index.html' else rel)


def switcher(soup: BeautifulSoup, lang: str, rel: str) -> Tag:
    depth = rel.count('/')
    up = '../' * depth
    label = UI[lang]['language']
    box = soup.new_tag('details', attrs={'class': 'lang-switch', 'translate': 'no'})
    summary = soup.new_tag('summary', attrs={'aria-label': f'{label}: {dict(cs=SOURCE, **LANGS)[lang][0]}'})
    globe = BeautifulSoup('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.400 5.600 12 3Z"/></svg>', 'html.parser').svg
    summary.append(globe)
    code = soup.new_tag('span')
    code.string = lang.upper()
    summary.append(code)
    box.append(summary)
    menu = soup.new_tag('div', attrs={'class': 'lang-menu'})
    for code_, (name, html_lang, _locale) in dict(cs=SOURCE, **LANGS).items():
        base = up if lang == 'cs' else up + '../'
        href = (base if code_ == 'cs' else f'{base}{code_}/') + rel
        link = soup.new_tag('a', attrs={'href': href, 'lang': html_lang, 'hreflang': html_lang, 'data-lang-link': code_})
        if code_ == lang:
            link['aria-current'] = 'true'
        short = soup.new_tag('b')
        short.string = code_.upper()
        link.append(short)
        link.append(NavigableString(name))
        menu.append(link)
    box.append(menu)
    return box


def decorate(soup: BeautifulSoup, lang: str, rel: str, site_url: str):
    """Language switcher in the header and alternate-language links in the head (repeatable)."""
    for old in soup.select('.lang-switch, link[rel="alternate"][hreflang], meta[property="og:locale"], meta[property="og:locale:alternate"]'):
        old.decompose()
    header = soup.select_one('header.header .header-inner')
    toggle = header.select_one('.menu-toggle') if header else None
    if toggle is not None:
        toggle.insert_before(switcher(soup, lang, rel))
    if soup.head is None:
        return
    for code_, (_name, html_lang, _locale) in dict(cs=SOURCE, **LANGS).items():
        soup.head.append(soup.new_tag('link', rel='alternate', hreflang=html_lang, href=page_url(site_url, code_, rel)))
    soup.head.append(soup.new_tag('link', rel='alternate', hreflang='x-default', href=page_url(site_url, 'cs', rel)))
    locale = dict(cs=SOURCE, **LANGS)[lang][2]
    soup.head.append(soup.new_tag('meta', attrs={'property': 'og:locale', 'content': locale}))


def write_page(path: Path, soup: BeautifulSoup):
    document = str(soup)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(line.rstrip() for line in document.splitlines()) + '\n', encoding='utf-8', newline='\n')


# ---------------------------------------------------------------- one language
def local_url(value: str) -> bool:
    return bool(value) and not re.match(r'^(?:[a-z][a-z0-9+.-]*:|//|#)', value, re.I)


def rewrite_urls(soup: BeautifulSoup, lang: str, page: Path, versions: dict[str, str]):
    """Pages link inside the language tree, translated scripts load from it, everything else is shared."""
    for tag in soup.find_all(True):
        if tag.get('data-lang-link'):
            continue
        for name in URL_ATTRS:
            value = tag.get(name)
            if not isinstance(value, str) or not local_url(value):
                continue
            match = re.match(r'^([^?#]*)(.*)$', value)
            path, tail = match.group(1), match.group(2)
            if not path:
                continue
            target = (page.parent / path).resolve()
            try:
                rel = target.relative_to(DIST.resolve()).as_posix()
            except ValueError:
                continue
            first = rel.split('/')[0]
            if path.endswith('.html') or path.endswith('/'):
                if first in ('admin', 'crm'):
                    tag[name] = '../' + value
                continue
            if rel in versions:
                tag[name] = path + '?v=' + versions[rel]
                continue
            localized = target.with_name(f'{target.stem}-{lang}{target.suffix}')
            if localized.is_file():
                path = path[:len(path) - len(target.name)] + localized.name
            tag[name] = '../' + path + tail


def build_language(lang: str, draft: bool, site_url: str, indexable: bool) -> dict:
    catalogue = Catalogue(lang)
    errors: list[str] = []
    out = DIST / lang
    if out.exists():
        shutil.rmtree(out)

    def lookup(source: str) -> str | None:
        return catalogue.get(source)

    # scripts
    versions: dict[str, str] = {}
    strings = {text: catalogue.get(text) for text in data_units()}
    for name in JS_FILES:
        source = (DIST / name).read_text(encoding='utf-8')
        try:
            translated = js_transform(source, lookup)
        except ValueError as error:
            errors.append(f'{name}: {error}')
            translated = source
        if name == 'cms-config.js':
            runtime = {'lang': lang, 'strings': {key: value for key, value in strings.items() if value and value != key}}
            translated += '\nObject.assign(window.CR_CMS, ' + json.dumps(runtime, ensure_ascii=False, separators=(',', ':')) + ');\n'
        out.mkdir(parents=True, exist_ok=True)
        (out / name).write_text(translated, encoding='utf-8', newline='\n')
        versions[name] = hashlib.sha256(translated.encode('utf-8')).hexdigest()[:12]

    # pages
    count = 0
    for path in pages():
        rel = path.relative_to(DIST).as_posix()
        soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
        for unit in collect(soup):
            translated = catalogue.get(unit.source)
            if translated is None:
                continue
            try:
                unit.apply(translated)
            except ValueError as error:
                errors.append(f'{rel}: {error} — {unit.source[:80]}')
        if soup.html is not None:
            soup.html['lang'] = LANGS[lang][1]
        for tag in soup.select('header.header .site-nav > a, header.header .nav-group > summary, header.header .nav-dropdown > a'):
            for node in tag.find_all(string=True, recursive=False):
                if norm(str(node)) in NAV_SHORT.get(lang, {}):
                    node.replace_with(NavigableString(NAV_SHORT[lang][norm(str(node))]))
        for tag in soup.select('[data-search]'):
            tag['data-search'] = norm(tag.get_text(' '))
        # Visitors from abroad need the country code.
        for node in soup.find_all(string=PHONE_LOCAL):
            if not isinstance(node, Comment) and node.find_parent(['script', 'style']) is None:
                node.replace_with(NavigableString(PHONE_LOCAL.sub('+420 736 403 795', str(node))))
        rewrite_urls(soup, lang, path, versions)
        decorate(soup, lang, rel, site_url)
        for canonical in soup.select('link[rel="canonical"]'):
            canonical['href'] = page_url(site_url, lang, rel)
        write_page(out / rel, soup)
        count += 1

    missing = list(catalogue.missing)
    if missing:
        (I18N / f'missing-{lang}.json').write_text(json.dumps(missing, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    elif (I18N / f'missing-{lang}.json').exists():
        (I18N / f'missing-{lang}.json').unlink()
    return {'lang': lang, 'pages': count, 'missing': len(missing), 'errors': errors}


def decorate_source(site_url: str):
    for path in pages():
        rel = path.relative_to(DIST).as_posix()
        soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
        decorate(soup, 'cs', rel, site_url)
        write_page(path, soup)


def main(argv: list[str]) -> int:
    command = argv[1] if len(argv) > 1 else ''
    if command == 'extract':
        seen = extract()
        I18N.mkdir(exist_ok=True)
        (I18N / 'source.json').write_text(json.dumps(seen, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
        print(json.dumps({'pages': len(pages()), 'units': len(seen), 'characters': sum(len(text) for text in seen)}))
        return 0
    if command == 'build':
        draft = '--draft' in argv
        site_url, indexable = site_settings()
        decorate_source(site_url)
        reports = [build_language(lang, draft, site_url, indexable) for lang in LANGS]
        print(json.dumps(reports, ensure_ascii=False, indent=1))
        failed = any(report['errors'] or (report['missing'] and not draft) for report in reports)
        return 1 if failed else 0
    if command == 'audit':
        # Texts in the language versions that still look Czech (letters no other language here uses).
        czech_only = re.compile(r'[ěščřžýůďťňĚŠČŘŽÝŮĎŤŇ]')
        for lang in LANGS:
            found: dict[str, str] = {}
            for path in sorted((DIST / lang).rglob('*.html')):
                soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
                for old in soup.select('script, style, [translate="no"]'):
                    old.decompose()
                texts = [str(node) for node in soup.find_all(string=True) if not isinstance(node, Comment)]
                texts += [tag[name] for tag in soup.find_all(True) for name in TEXT_ATTRS + ('content',) if isinstance(tag.get(name), str)]
                for text in texts:
                    if czech_only.search(text):
                        found.setdefault(norm(text), path.relative_to(DIST).as_posix())
            (I18N / f'audit-{lang}.json').write_text(json.dumps(found, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
            print(lang, len(found), 'texts with Czech letters ->', f'i18n/audit-{lang}.json')
        return 0
    print(__doc__)
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
