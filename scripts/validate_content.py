"""Validate migrated content coverage, full text, resources and navigation."""
from pathlib import Path
from urllib.parse import urlparse,unquote
from collections import Counter
import json,re,sys,unicodedata
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
data=json.loads((ROOT/'docs/source-inventory/content.json').read_text(encoding='utf-8'))
errors=[];pages=list(DIST.rglob('*.html'));soups={};links=0
for path in pages:
    text=path.read_text(encoding='utf-8');s=BeautifulSoup(text,'html.parser');soups[path.resolve()]=s
    if '\ufffd' in text:errors.append({'file':str(path.relative_to(DIST)),'error':'Unicode replacement character'})
    if len(s.select('h1'))!=1:errors.append({'file':str(path.relative_to(DIST)),'error':'Expected one h1'})
    duplicate=[k for k,v in Counter(t['id'] for t in s.select('[id]')).items() if v>1]
    if duplicate:errors.append({'file':str(path.relative_to(DIST)),'error':'Duplicate ids','ids':duplicate})
for path in pages:
    s=soups[path.resolve()]
    for e in s.select('[href],[src]'):
        for attr in ('href','src'):
            if attr not in e.attrs:continue
            value=e[attr];u=urlparse(value)
            if u.scheme or u.netloc or not value:continue
            target=(path.parent/unquote(u.path)).resolve() if u.path else path.resolve()
            if target.is_dir():target=target/'index.html'
            links+=1
            if not target.exists():errors.append({'file':str(path.relative_to(DIST)),'error':'Missing resource','target':value});continue
            if not target.is_relative_to(DIST.resolve()):errors.append({'file':str(path.relative_to(DIST)),'error':'Outside public directory','target':value})
            if u.fragment and target.suffix=='.html':
                dest=soups.get(target)
                if dest and not dest.find(id=unquote(u.fragment)):errors.append({'file':str(path.relative_to(DIST)),'error':'Missing fragment','target':value})
def normalized(s):return re.sub(r'\s+','',unicodedata.normalize('NFC',s))
preserved=0
for p in data['pages']:
    path=(DIST/p['local']).resolve();s=soups.get(path)
    if not s:errors.append({'file':p['local'],'error':'Missing migrated page'});continue
    article=s.select_one('.article-copy')
    if not article or normalized(article.get_text(' ',strip=True))!=normalized(p['body_text']):errors.append({'file':p['local'],'error':'Full source text differs'})
    else:preserved+=1
for u,a in data['assets'].items():
    p=DIST/a.get('local','__missing__')
    if not p.exists():errors.append({'url':u,'error':'Missing migrated asset'})
    if p.suffix=='.pdf' and p.exists() and p.read_bytes()[:4]!=b'%PDF':errors.append({'url':u,'error':'Not a PDF'})
references=soups.get((DIST/'reference.html').resolve())
gallery=soups.get((DIST/'galerie.html').resolve())
cards=references.select('[data-reference-card]') if references else []
gallery_images=gallery.select('[data-lightbox]') if gallery else []
if len(cards)!=41:errors.append({'error':'Expected 41 reference cards','count':len(cards)})
if len(gallery_images)!=278:errors.append({'error':'Expected 278 gallery photos','count':len(gallery_images)})
for e in (references.select('.card-picture img') if references else [])+(gallery.select('.media-item img') if gallery else []):
    if '-thumb.webp' not in e.get('src',''):errors.append({'error':'Listing loads full photograph','src':e.get('src')})
    if e.get('loading')!='lazy' or not e.get('width') or not e.get('height'):errors.append({'error':'Missing image sizing or lazy loading','src':e.get('src')})
result={'checked_html_pages':len(pages),'checked_local_links_and_assets':links,'full_article_texts_preserved':preserved,'expected_article_texts':len(data['pages']),'reference_cards':len(cards),'gallery_images':len(gallery_images),'migrated_source_assets':len(data['assets']),'errors':errors,'browser_validation':'Not run: CUA/browser tooling unavailable in this session.'}
(ROOT/'qa').mkdir(exist_ok=True)
(ROOT/'qa/content-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2));sys.exit(bool(errors))
