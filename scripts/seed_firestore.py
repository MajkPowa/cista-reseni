"""Seed the content database with the 41 migrated references, categories and administrators.

Usage (production — requires `gcloud auth login` with access to the Firebase project):
    python scripts/seed_firestore.py --admin info@cistareseni.cz --admin dalsi@example.com
Usage (local emulator started with `firebase emulators:start`):
    python scripts/seed_firestore.py --emulator --admin test@example.com

Existing documents are never overwritten unless --force is given, so changes made
in the administration are safe when the script is run again. Administrator e-mails
are passed on the command line and are not stored in the repository.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse, json, re, subprocess, sys, urllib.request, urllib.error

from bs4 import BeautifulSoup
from reference_enrichment import enrich_references, CATEGORY_LABELS

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
PROJECT = json.loads((ROOT / '.firebaserc').read_text(encoding='utf-8'))['projects']['default']
DOC = ROOT / 'docs' / 'source-inventory'
ILLUSTRATIONS = {'https://www.cistareseni.cz/assets/img/references/destovka-tabor-102023_1750944312.jpg'}

# Homepage selection that existed in the static design (IDs of migrated references).
FEATURED = {
    38: {'headline': 'Čistá voda začíná dobrým návrhem.', 'location': 'Přehořov u Soběslavi'},
    12: {'headline': 'Dešťovka pro zahradu v Mělníku.', 'location': 'Mělník'},
    39: {'headline': 'Nová cesta pro odpadní vodu.', 'location': 'Písek'},
    41: {'headline': 'Druhý život po 25 letech provozu.', 'location': ''},
}
# Sort keys for articles without a date in the title; never displayed.
UNDATED_SORT = {28: '2025-08', 26: '2025-07', 2: '2000-02', 1: '2000-01'}


def encode(value):
    if value is None: return {'nullValue': None}
    if isinstance(value, bool): return {'booleanValue': value}
    if isinstance(value, int): return {'integerValue': str(value)}
    if isinstance(value, float): return {'doubleValue': value}
    if isinstance(value, datetime): return {'timestampValue': value.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')}
    if isinstance(value, str): return {'stringValue': value}
    if isinstance(value, (list, tuple)): return {'arrayValue': {'values': [encode(v) for v in value]}}
    if isinstance(value, dict): return {'mapValue': {'fields': {k: encode(v) for k, v in value.items()}}}
    raise TypeError(type(value))


def date_title(title):
    match = re.search(r'\(?\s*(\d{1,2})\s*/\s*(20\d\d)\s*\)?\s*$', title)
    if not match: return title, ''
    return title[:match.start()].strip(' –-('), f'{match.group(2)}-{int(match.group(1)):02d}'


def plain_text(body_html):
    """Article HTML -> paragraphs separated by blank lines; list items become '- ' lines."""
    soup = BeautifulSoup(body_html, 'html.parser')
    blocks = []
    for node in soup.find_all(['p', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'table']):
        if node.find_parent(['ul', 'ol', 'table', 'p']): continue
        if node.name in ('ul', 'ol'):
            items = [re.sub(r'\s+', ' ', li.get_text(' ', strip=True)) for li in node.find_all('li', recursive=False)]
            text = '\n'.join(f'- {item}' for item in items if item)
        elif node.name == 'table':
            rows = [' – '.join(re.sub(r'\s+', ' ', cell.get_text(' ', strip=True)) for cell in row.find_all(['td', 'th'])) for row in node.find_all('tr')]
            text = '\n'.join(f'- {row}' for row in rows if row.strip(' –'))
        else:
            text = re.sub(r'\s+', ' ', node.get_text(' ', strip=True))
        if text: blocks.append(text)
    return '\n\n'.join(blocks)


def build_documents():
    data = json.loads((DOC / 'content.json').read_text(encoding='utf-8'))
    thumbs = json.loads((DOC / 'thumbnails.json').read_text(encoding='utf-8'))
    assets = data['assets']
    refs = enrich_references([p for p in data['pages'] if p['kind'] == 'reference'])
    now = datetime.now(timezone.utc)

    def image(url):
        asset = assets.get(url) or {}
        if not asset.get('local'): return None
        thumb = thumbs.get(url, {})
        return {'url': asset['local'], 'thumb': thumb.get('local', asset['local']), 'w': asset.get('width', 0), 'h': asset.get('height', 0)}

    documents = {}
    for p in refs:
        number = int(re.match(r'realizace/(\d+)-', p['local']).group(1))
        title, date = date_title(p['title'])
        photos = [item for item in (image(url) for url in p['images']) if item]
        cover = image(p.get('thumbnail')) or (photos[0] if photos else None)
        featured = FEATURED.get(number)
        documents[f'references/legacy-{number}'] = {
            'title': title, 'location': featured['location'] if featured else '', 'date': date,
            'sortDate': date or UNDATED_SORT.get(number, '2000-01'),
            'categories': p['display_categories'],
            'summary': p.get('compact_scope', ''),
            'description': plain_text(p['body_html']) or p['body_text'],
            'facts': [{'label': label, 'value': value} for label, value in p.get('project_facts', []) if label not in ('Rozsah služeb', 'Rozsah prací')],
            'photos': photos, 'cover': cover,
            'coverNote': 'Ilustrační vyobrazení' if p.get('thumbnail') in ILLUSTRATIONS else '',
            'featured': bool(featured), 'headline': featured['headline'] if featured else '',
            'published': True, 'dynamic': False,
            'legacyUrl': p['local'], 'legacyId': number, 'sourceUrl': p['url'],
            'createdAt': now, 'updatedAt': now, 'updatedBy': 'seed',
        }
    documents['settings/site'] = {'categories': [{'key': key, 'label': label} for key, label in CATEGORY_LABELS.items()], 'updatedAt': now}
    return documents


class Firestore:
    def __init__(self, emulator):
        if emulator:
            self.base, self.token = 'http://127.0.0.1:8080/v1', 'owner'
        else:
            self.base = 'https://firestore.googleapis.com/v1'
            self.token = subprocess.run('gcloud auth print-access-token', shell=True, capture_output=True, text=True, check=True).stdout.strip()
        self.database = f'projects/{PROJECT}/databases/(default)'

    def call(self, method, path, body=None):
        request = urllib.request.Request(f'{self.base}/{self.database}/documents{path}', method=method,
                                         data=json.dumps(body).encode() if body is not None else None,
                                         headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT})
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read() or b'{}')

    def exists(self, path):
        try:
            self.call('GET', f'/{urllib.request.quote(path)}?mask.fieldPaths=title')
            return True
        except urllib.error.HTTPError as error:
            if error.code == 404: return False
            raise

    def commit(self, documents):
        writes = [{'update': {'name': f'{self.database}/documents/{path}', 'fields': encode(fields)['mapValue']['fields']}} for path, fields in documents.items()]
        for start in range(0, len(writes), 20):
            self.call('POST', ':commit', {'writes': writes[start:start + 20]})


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--emulator', action='store_true', help='write to the local Firestore emulator')
    parser.add_argument('--admin', action='append', default=[], metavar='EMAIL', help='e-mail allowed into the administration (repeatable)')
    parser.add_argument('--force', action='store_true', help='overwrite documents that already exist')
    parser.add_argument('--dry-run', action='store_true', help='print a summary without writing')
    args = parser.parse_args()

    documents = build_documents()
    now = datetime.now(timezone.utc)
    for email in args.admin:
        email = email.strip().lower()
        documents[f'admins/{email}'] = {'email': email, 'addedAt': now, 'addedBy': 'seed'}
    if args.dry_run:
        sample = documents['references/legacy-38']
        print(json.dumps({k: (v if not isinstance(v, (list, str)) or len(str(v)) < 300 else str(v)[:300] + '…') for k, v in sample.items()}, ensure_ascii=False, indent=2, default=str))
        print(f'{len(documents)} documents prepared for project {PROJECT}')
        return

    store = Firestore(args.emulator)
    pending = documents if args.force else {path: fields for path, fields in documents.items() if not store.exists(path)}
    store.commit(pending)
    print(json.dumps({'project': PROJECT, 'target': 'emulator' if args.emulator else 'production', 'prepared': len(documents), 'written': len(pending), 'kept_existing': len(documents) - len(pending)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
