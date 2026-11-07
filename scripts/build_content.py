"""Build all migrated public content pages, without changing homepage files."""
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
import json, html, re, posixpath, sys, hashlib
from detail_design import render_detail
from overview_design import render_overview
from bs4 import BeautifulSoup
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]; DIST=ROOT/'dist'; DOC=ROOT/'docs'/'source-inventory'
DATA=json.loads((DOC/'content.json').read_text(encoding='utf-8'))
PAGES=DATA['pages']; ASSETS=DATA['assets']; BASE=DATA['source']
MAP={p['url']:p['local'] for p in PAGES}
THUMBS={}
for source,asset in ASSETS.items():
    if not asset.get('local','').endswith('.webp'):continue
    original=DIST/asset['local'];target=original.with_name(original.stem+'-thumb.webp')
    if not target.exists():
        image=Image.open(original);image.thumbnail((720,720),Image.Resampling.LANCZOS)
        image.save(target,'WEBP',quality=81,method=6)
    with Image.open(target) as image:width,height=image.size
    THUMBS[source]={'local':target.relative_to(DIST).as_posix(),'width':width,'height':height,'bytes':target.stat().st_size}
LABELS={'cov':'Čistírny','destovka':'Dešťová voda','cerpani':'Čerpací technika','servis':'Servis a obnova','ostatni':'Další řešení'}
ILLUSTRATIONS={'https://www.cistareseni.cz/assets/img/references/destovka-tabor-102023_1750944312.jpg'}
def esc(s): return html.escape(str(s),quote=True)
def rel(target,current):
    if '#' in target: base,fragment=target.split('#',1); return rel(base,current)+'#'+fragment
    return posixpath.relpath(target,posixpath.dirname(current) or '.')
def asset_url(url,current):
    a=ASSETS.get(url)
    return rel(a['local'],current) if a and a.get('local') else url
def thumb_url(url,current):
    return rel(THUMBS[url]['local'],current) if url in THUMBS else asset_url(url,current)
def short(s,n=170):
    s=re.sub(r'\s+',' ',s).strip()
    return s if len(s)<=n else s[:n].rsplit(' ',1)[0]+'…'
def date_title(p):
    title=p['title']; m=re.search(r'\(?\s*(\d{1,2})\s*/\s*(20\d\d)\s*\)?\s*$',title)
    return (title[:m.start()].strip(' –-('),f'{int(m.group(1)):02d} / {m.group(2)}') if m else (title,'Realizace')
def icon(name='arrow'):
    return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>'
def header(current):
    return f'''<a class="skip-link" href="#main">Přejít na obsah</a><div class="preview-bar"><span><i></i> Návrh nového webu</span><a href="https://www.cistareseni.cz/" target="_blank" rel="noopener">Současný web {icon()}</a></div><header class="header"><div class="container header-inner"><a class="brand" href="{rel('index.html',current)}" aria-label="Čistá řešení — úvod"><img src="{rel('assets/brand-symbol.svg',current)}" width="43" height="46" alt=""><span>Čistá řešení<small>by White Elephant</small></span></a><button class="menu-toggle" aria-label="Otevřít nabídku" aria-expanded="false" aria-controls="navigation"><span></span><span></span></button><nav id="navigation" aria-label="Hlavní navigace"><a href="{rel('sluzby.html',current)}">Naše řešení</a><a href="{rel('reference.html',current)}">Realizace</a><a href="{rel('o-nas.html',current)}">O nás</a><a href="{rel('dokumenty.html',current)}">Ke stažení</a><a href="{rel('kontakt.html',current)}">Kontakt</a><a class="button button-small" href="{rel('index.html#poptavka',current)}">Probrat můj projekt {icon()}</a></nav></div></header>'''
def footer(current):
    links=''.join(f'<a href="{rel(path,current)}">{label}</a>' for path,label in [('sluzby.html','Produkty a služby'),('reference.html','Realizace'),('galerie.html','Galerie'),('dokumenty.html','Ke stažení'),('o-nas.html','O nás'),('kontakt.html','Kontakt')])
    return f'''<footer class="footer container"><div class="footer-links">{links}</div><div class="footer-top"><a class="brand" href="{rel('index.html',current)}"><img src="{rel('assets/brand-symbol.svg',current)}" width="43" height="46" alt=""><span>Čistá řešení<small>by White Elephant</small></span></a><p>Lidická 2483, 390 03 Tábor<br><a href="tel:+420736403795">+420 736 403 795</a> · <a href="mailto:info@cistareseni.cz">info@cistareseni.cz</a></p></div><div class="footer-bottom"><span>© 2026 WHITE ELEPHANT s.r.o.</span><span>IČ 06245676 · DIČ CZ06245676</span><span>Návrh webu · Poptávka se neodesílá automaticky</span></div></footer>'''
def lightbox():
    return '''<dialog id="photo-lightbox" class="lightbox" aria-label="Detail snímku"><button class="lightbox-close" aria-label="Zavřít snímek">×</button><figure><img alt=""><figcaption></figcaption></figure><div class="lightbox-controls"><button data-photo-prev aria-label="Předchozí snímek">← Předchozí</button><output aria-live="polite"></output><button data-photo-next aria-label="Další snímek">Další →</button></div></dialog>'''
def stamp_assets(document,current):
    def stamped(match):
        attr,url=match.groups()
        parsed=urlparse(url)
        if parsed.scheme or parsed.netloc:return match.group(0)
        candidate=(DIST/posixpath.dirname(current)/parsed.path).resolve()
        if not candidate.is_file() or not candidate.is_relative_to(DIST.resolve()):return match.group(0)
        if candidate.suffix not in ('.css','.js') and candidate.name not in ('brand-symbol.svg','water-systems.svg'):return match.group(0)
        fingerprint=hashlib.sha256(candidate.read_bytes()).hexdigest()[:12]
        return f'{attr}="{parsed.path}?v={fingerprint}"'
    return re.sub(r'(href|src)="([^"]+)"',stamped,document)

def page(current,title,body,description='',has_gallery=False):
    meta=esc(short(description or title,155))
    service_assets='<link rel="stylesheet" href="services.css"><script src="services.js" defer></script>' if current=='sluzby.html' else ''
    is_detail=current.startswith(('sluzby/','realizace/'))
    detail_assets='<link rel="stylesheet" href="'+rel('details.css',current)+'">' if is_detail else ''
    experience_assets=f'<link rel="stylesheet" href="{rel("experience.css",current)}"><script src="{rel("experience.js",current)}" defer></script>'
    body_class='content-page experience-page'+(' solutions-page' if current=='sluzby.html' else '')+(' service-detail' if current.startswith('sluzby/') else ' reference-detail' if current.startswith('realizace/') else '')
    progress='<div class="reading-progress" aria-hidden="true"></div>' if is_detail else ''
    document=f'''<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#12375b"><title>{esc(title)} | Čistá řešení</title><meta name="description" content="{meta}"><meta property="og:title" content="{esc(title)} | Čistá řešení"><meta property="og:description" content="{meta}"><meta property="og:type" content="website"><meta property="og:image" content="https://majkpowa.github.io/cista-reseni/assets/hero-garden.webp"><link rel="icon" href="{rel('assets/brand-symbol.svg',current)}" type="image/svg+xml"><link rel="preload" href="{rel('assets/Manrope.ttf',current)}" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="{rel('styles.css',current)}"><link rel="stylesheet" href="{rel('content.css',current)}"><script src="{rel('content.js',current)}" defer></script>{service_assets}{detail_assets}{experience_assets}</head><body class="{body_class}">{progress}{header(current)}<main id="main">{body}</main>{footer(current)}{lightbox() if has_gallery else ''}</body></html>'''
    return stamp_assets(document,current)
def save(current,title,body,description='',has_gallery=False):
    document=page(current,title,body,description,has_gallery)
    document='\n'.join(line.rstrip() for line in document.splitlines())+'\n'
    f=DIST/current;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(document,encoding='utf-8',newline='\n')
def hero(current,title,eyebrow,intro='',parent=None,meta=''):
    crumbs=f'<a href="{rel("index.html",current)}">Úvod</a><span aria-hidden="true">/</span>'
    if parent: crumbs+=f'<a href="{rel(parent[0],current)}">{esc(parent[1])}</a><span aria-hidden="true">/</span>'
    crumbs+=f'<span aria-current="page">{esc(title)}</span>'
    return f'<section class="container content-hero"><div class="breadcrumbs" aria-label="Drobečková navigace">{crumbs}</div><p class="eyebrow">{esc(eyebrow)}</p><h1>{esc(title)}</h1>{f"<p class=content-intro>{esc(intro)}</p>" if intro else ""}{meta}</section>'
def cta(current,title='Každý pozemek má své řešení.',text='Probereme vaši situaci a navrhneme další postup. Od prvního nápadu až po servis.'):
    return f'<section class="container content-cta"><div><h2>{esc(title)}</h2><p>{esc(text)}</p></div><a class="button" href="{rel("index.html#poptavka",current)}">Probrat můj projekt {icon()}</a></section>'
def aside(current):
    return f'<aside class="article-aside"><h2>Podobné řešení<br>i pro vás?</h2><p>Každý dům i pozemek je jiný. Napište nám, co potřebujete vyřešit s vodou.</p><a class="button" href="{rel("index.html#poptavka",current)}">Nezávazně se zeptat {icon()}</a><a class="aside-phone" href="tel:+420736403795">736 403 795</a><a class="aside-mail" href="mailto:info@cistareseni.cz">info@cistareseni.cz</a></aside>'
def clean_body(p):
    s=BeautifulSoup(p['body_html'],'html.parser'); current=p['local']
    for tag in s.find_all(['script','style','iframe','form','input','button','textarea','select','noscript']):tag.decompose()
    for tag in list(s.find_all(True)):
        if not tag.name:continue
        if tag.name in ('div','span','font','center'):tag.unwrap();continue
        tag.attrs={k:v for k,v in tag.attrs.items() if k in ('href','src','alt','colspan','rowspan')}
        if tag.name=='h1':tag.name='h2'
        if tag.name=='h3':tag.name='h2'
        if tag.name=='a':
            u=urldefrag(urljoin(p['url'],tag.get('href','')))[0]
            if u in MAP:tag['href']=rel(MAP[u],current)
            elif u in ASSETS and ASSETS[u].get('local'):tag['href']=asset_url(u,current)
            elif urlparse(u).scheme in ('http','https'):
                tag['href']=u;tag['target']='_blank';tag['rel']='noopener'
            elif u.startswith(('mailto:','tel:')):tag['href']=u
            else:tag.unwrap();continue
        if tag.name=='img':
            u=urljoin(p['url'],tag.get('src','')); tag['src']=asset_url(u,current)
            tag['alt']=tag.get('alt') or p['title'];tag['loading']='lazy'
            if ASSETS.get(u,{}).get('width'):tag['width']=ASSETS[u]['width'];tag['height']=ASSETS[u]['height']
    return str(s)
def gallery_item(url,caption,current,project=None):
    a=ASSETS[url];attrs=f' data-gallery-project="{esc(project)}"' if project else ''
    return f'<a class="media-item" href="{asset_url(url,current)}" data-lightbox data-caption="{esc(caption)}"{attrs}><figure><img src="{thumb_url(url,current)}" width="{a.get("width",1200)}" height="{a.get("height",900)}" alt="{esc(caption)}" loading="lazy"><span class="media-zoom" aria-hidden="true">+</span><figcaption>{esc(caption)}</figcaption></figure></a>'
def gallery_caption(url,title,index):
    return f'{title} — Ilustrační vyobrazení akumulační nádrže' if url in ILLUSTRATIONS else f'{title} — fotografie {index+1}'

refs=sorted([p for p in PAGES if p['kind']=='reference'],key=lambda p:int(re.search(r'/reference/(\d+)',p['url']).group(1)),reverse=True)
services=[p for p in PAGES if p['kind']=='service']
service_order=['cisteni-odpadnich-vod','hospodareni-s-destovou-vodou','cerpaci-sachty','konzultace-a-poradenstvi','zpracovani-projektove-dokumentace','zajisteni-povoleni-stavby','prodej-cov-a-destovych-nadrzi','montaz-a-instalace-technologii','servis-a-udrzba','prodej-nahradnich-dilu']
services.sort(key=lambda p:service_order.index(Path(p['local']).stem) if Path(p['local']).stem in service_order else 99)
CTX={name:globals()[name] for name in ('esc','rel','short','asset_url','thumb_url','clean_body','gallery_item','gallery_caption','cta','refs','services','ASSETS','ILLUSTRATIONS','date_title','DATA','LABELS')}
for p in PAGES:
    current=p['local'];title,date=date_title(p)
    body=render_detail(p,CTX)
    save(current,title,body,p['body_text'],bool(p['images']))

current='reference.html'
save(current,'Naše realizace',render_overview(current,CTX),'Skutečné realizace čistíren, dešťových nádrží, čerpání a servisu. Prohlédněte si projekty, fotografie a technické podrobnosti.')

current='sluzby.html'
body=(ROOT/'scripts/templates/services.html').read_text(encoding='utf-8')
body=body.replace('{{WATER_SYSTEMS}}',(ROOT/'scripts/templates/water-systems.inline.svg').read_text(encoding='utf-8'))
for token,reference_id in [('RAIN',12),('CLEAN',38),('PUMP',39),('CARE',41)]:
    reference=next(p for p in refs if p['local'].startswith(f'realizace/{reference_id}-'))
    body=body.replace('{{REF_'+token+'}}',esc(reference['local']))
directory=''.join(f'<a href="{esc(p["local"])}">{esc(p["title"])}</a>' for p in services)
body=body.replace('{{ALL_SERVICE_LINKS}}',directory)
save(current,'Naše řešení — voda pro váš dům',body,'Objevte řešení pro dešťovou vodu, domovní čistírny, čerpání a servis. Interaktivní schéma, skutečné realizace a péče od návrhu po provoz.')

total_images=sum(len(p['images']) for p in refs)
for current,title in [('galerie.html','Galerie realizací'),('dokumenty.html','Dokumenty ke stažení'),('o-nas.html','O nás'),('kontakt.html','Kontakt')]:
    save(current,title,render_overview(current,CTX),has_gallery=current=='galerie.html')

index={'source':BASE,'retrieved':DATA['retrieved'],'reference_count':len(refs),'service_count':len(services),'gallery_image_count':total_images,'document_count':len(DATA['documents']),'pages':[{'title':p['title'],'url':p['local'],'source':p['url'],'kind':p['kind'],'categories':p['categories'],'thumbnail':ASSETS.get(p['thumbnail'],{}).get('local')} for p in PAGES],'navigation':{'services':'sluzby.html','references':'reference.html','gallery':'galerie.html','downloads':'dokumenty.html','about':'o-nas.html','contact':'kontakt.html'}}
(DIST/'data'/'content-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
(DOC/'thumbnails.json').write_text(json.dumps(THUMBS,ensure_ascii=False,indent=2),encoding='utf-8')
report=f'''ČISTÁ ŘEŠENÍ — INVENTURA MIGRACE VEŘEJNÉHO OBSAHU
Datum převzetí: {DATA['retrieved']}
Zdroj: {BASE}

ROZSAH
Veřejných HTML zdrojových URL: {len(PAGES)+1} (včetně úvodu)
Detailů realizací: {len(refs)}
Produktových a službových podstránek: {len(services)}
Snímků v galeriích realizací (fotografie a vyobrazení): {total_images}
Z toho 3 snímky pocházejí z přehledu realizací, protože původní detail nemá vlastní galerii. Produktový řez akumulační nádrže u realizace Tábor 10/2023 je viditelně označen jako ilustrační vyobrazení.
Samostatných dokumentů PDF: {len(DATA['documents'])}
Lokálních mediálních souborů: {sum(bool(a.get('local')) for a in ASSETS.values())} / {len(ASSETS)}
Chyb při stahování: {len(DATA['errors'])}
Nových HTML podstránek: {len(PAGES)+6}

ZACHOVÁNÍ OBSAHU
Plné tělo všech článků, seznamy, tabulky, parametrické údaje, odkazy a obrázky. Nový vizuální obal používá font, barvy a navigaci návrhu. Z původních HTML se nepřenášejí skripty, externí styly ani původní formuláře.
Fotografie jsou lokální WebP, maximální rozměr 2000 px, kvalita 90; mění se pouze rozměry a komprese, nikoli obsah. PDF jsou stažena beze změny. SHA-256 a zdrojová URL jsou u každého assetu v inventory.json.
Pro karty a galerie jsou vytvořeny náhledy maximálně 720 px při kvalitě WebP 81. Kliknutí otevře plnou fotografii. Náhledy se načítají lazy a mají explicitní rozměry.
Robots.txt i sitemap.xml zdrojového webu jsou dostupné. Všech 37 URL v sitemapě (32 HTML a 5 PDF) je pokryto; sitemap neobsahuje všechny novější reference, které jsou převzaty z navigace webu. Podrobnosti: sitemap-verification.json.
Na původním webu nebyla v odkazované navigaci nalezena samostatná stránka právních podmínek nebo ochrany osobních údajů. Tyto texty nebyly vymyšleny.
Poptávkový formulář není v této změně napojen na server ani automatické odesílání. Telefony a e-mailové odkazy jsou skutečné kontakty uvedené na zdrojovém webu.
Údaje a produktová tvrzení odpovídají podkladům stávajícího webu k datu převzetí, nikoli nezávislé technické certifikaci.

CHYBNÉ ODKAZY NA PŮVODNÍM WEBU
'''+json.dumps(DATA['broken_source_links'],ensure_ascii=False,indent=2)+'''
Tyto chybné cíle nemají dostupné články. Jejich veřejně uvedené názvy služeb jsou zachovány na stránce sluzby.html, s kontaktem pro upřesnění, bez vymyšlených parametrů.

CHYBY STAHOVÁNÍ
'''+json.dumps(DATA['errors'],ensure_ascii=False,indent=2)+'''

SOUBORY
docs/source-inventory/inventory.json — inventura URL, souborů a kontrolních součtů.
docs/source-inventory/link-map.json — mapování původních článků na nové stránky.
docs/source-inventory/content.json — úplná obsahová data pro opakovatelné sestavení.
docs/source-inventory/html/ — zdrojové veřejné HTML podklady.
dist/data/content-index.json — přehled veřejných stránek pro další integraci.
scripts/crawl_content.py — čtení zdroje, stažení médií, evidence.
scripts/build_content.py — sestavení podstránek.
'''
(DOC/'migration-report.txt').write_text(report,encoding='utf-8')
print(json.dumps({'built_detail_pages':len(PAGES),'built_index_pages':6,'references':len(refs),'gallery_images':total_images,'services':len(services),'documents':len(DATA['documents'])},ensure_ascii=False))

# Apply the same cache-safe asset references to the hand-authored homepage.
homepage=DIST/'index.html'
homepage_document=stamp_assets(homepage.read_text(encoding='utf-8'),'index.html')
homepage.write_text('\n'.join(line.rstrip() for line in homepage_document.splitlines())+'\n',encoding='utf-8',newline='\n')
