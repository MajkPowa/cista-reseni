"""Verify local routes and assets before publishing the complete static preview."""
from pathlib import Path
from urllib.parse import urlparse, unquote
from html.parser import HTMLParser
from collections import Counter
import json, re

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.links=[]; self.h1=0; self.images=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag=='h1': self.h1+=1
        for key in ('src','href','poster'):
            if key in a: self.links.append((tag,key,a[key]))
        if tag=='img': self.images.append(a)

errors=[]; pages={}
for f in DIST.rglob('*.html'):
    p=Page(); raw=f.read_text(encoding='utf-8'); p.feed(raw); pages[f.resolve()]=p
    if '\ufffd' in raw: errors.append(f'{f.relative_to(DIST)}: Unicode replacement character')
    if p.h1!=1: errors.append(f'{f.relative_to(DIST)}: expected one H1, found {p.h1}')
    for id,count in Counter(p.ids).items():
        if count>1: errors.append(f'{f.relative_to(DIST)}: duplicate ID {id}')
    for im in p.images:
        if 'alt' not in im: errors.append(f'{f.relative_to(DIST)}: image without alt {im.get("src")}')
for f,p in pages.items():
    for tag,key,raw in p.links:
        u=urlparse(raw)
        if u.scheme or u.netloc or not raw: continue
        target=(DIST/unquote(u.path.lstrip('/')) if u.path.startswith('/') else f.parent/unquote(u.path)).resolve() if u.path else f
        if target.is_dir():target=target/'index.html'
        if not target.is_file(): errors.append(f'{f.relative_to(DIST)}: missing {raw}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:
            errors.append(f'{f.relative_to(DIST)}: missing anchor {raw}')
for f in DIST.rglob('*.css'):
    for raw in re.findall(r'url\([\'\"]?([^\)\'\"]+)',f.read_text(encoding='utf-8')):
        if not urlparse(raw).scheme and not (f.parent/raw).is_file():errors.append(f'{f.relative_to(DIST)}: missing CSS asset {raw}')
mapping_file=ROOT/'docs/source-inventory/link-map.json'
mapping=json.loads(mapping_file.read_text(encoding='utf-8')) if mapping_file.exists() else {}
for source,local in mapping.items():
    if not (DIST/local).is_file():errors.append(f'Unmigrated source page: {source} -> {local}')
report={'html_pages':len(pages),'migrated_source_pages':len(mapping),'local_files':sum(1 for p in DIST.rglob('*') if p.is_file()),'errors':errors}
(ROOT/'docs/site-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(1 if errors else 0)
