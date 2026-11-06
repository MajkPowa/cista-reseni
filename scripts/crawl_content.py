"""Public, read-only content migration. Re-run safely; no form submits or credentials."""
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag, unquote
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib, json, re, sys, time
import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
DOC=ROOT/'docs'/'source-inventory'
DIST=ROOT/'dist'
ASSET=DIST/'assets'/'source'
for p in (DOC/'html',ASSET,DIST/'data'): p.mkdir(parents=True,exist_ok=True)
BASE='https://www.cistareseni.cz/'
HEADERS={'User-Agent':'CistaReseni authorized website content migration / read-only'}
errors=[]
def canon(u,base=BASE):
    u=urldefrag(urljoin(base,u))[0]
    p=urlparse(u)
    if p.netloc in ('cistareseni.cz','www.cistareseni.cz'):
        return 'https://www.cistareseni.cz'+p.path
    return u
def localdomain(u): return urlparse(u).netloc in ('cistareseni.cz','www.cistareseni.cz')
def fetch(u):
    for attempt in range(3):
        try:
            r=requests.get(u,headers=HEADERS,timeout=45)
            r.raise_for_status()
            return r
        except Exception as e:
            if attempt==2: raise
            time.sleep(attempt+1)
def slug(s):
    import unicodedata
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode()
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')[:60]
def readpage(u):
    key=hashlib.sha256(u.encode()).hexdigest()[:16]
    f=DOC/'html'/f'{key}.html'
    if f.exists(): raw=f.read_text(encoding='utf-8')
    else:
        r=fetch(u); raw=r.content.decode('utf-8'); f.write_text(raw,encoding='utf-8')
    soup=BeautifulSoup(raw,'html.parser')
    return soup, str(f.relative_to(ROOT))
home,home_cache=readpage(BASE)
pages={BASE:{'url':BASE,'cache':home_cache,'kind':'home','title':'Čistá řešení — Hospodaříme s vodou','local':'index.html','soup':home}}
seen={BASE}
pending=[]
badlinks=[]
def scanlinks(soup,base):
    out=[]
    for a in soup.select('a[href]'):
        h=a['href'].strip()
        if not h or h.startswith(('#','mailto:','tel:','javascript:')): continue
        u=canon(h,base)
        if not localdomain(u): continue
        p=urlparse(u).path
        if p=='/' or p.endswith('.html'):
            if u not in seen: seen.add(u); out.append(u)
        elif not re.search(r'\.(?:pdf|png|jpe?g|webp|svg|gif|zip|docx?|xlsx?)$',p,re.I):
            badlinks.append({'source':base,'href':h,'label':a.get_text(' ',strip=True)})
    return out
pending=scanlinks(home,BASE)
while pending:
    batch=pending; pending=[]
    with ThreadPoolExecutor(max_workers=5) as pool:
        fs={pool.submit(readpage,u):u for u in batch}
        for f in as_completed(fs):
            u=fs[f]
            try:
                soup,cache=f.result()
                kind='reference' if '/reference/' in u else 'service'
                title=soup.select_one('main .about .section-title h3')
                title=title.get_text(' ',strip=True) if title else (soup.title.get_text(' ',strip=True).split('|')[0] if soup.title else '')
                if not soup.select_one('main .about .col-lg-12'): errors.append({'url':u,'error':'No main article container'}); continue
                num=re.search(r'/reference/(\d+)-',u)
                local=('realizace/'+num.group(1)+'-'+slug(title)+'.html') if num else 'sluzby/'+urlparse(u).path.split('/')[-1]
                pages[u]={'url':u,'cache':cache,'kind':kind,'title':title,'local':local,'soup':soup}
                pending += scanlinks(soup,u)
            except Exception as e: errors.append({'url':u,'error':str(e)})
    print('Content pages:',len(pages),flush=True)

assets={}
def addasset(u,base,role):
    u=canon(u,base)
    if not localdomain(u) or not re.search(r'\.(?:pdf|png|jpe?g|webp|svg|gif|zip|docx?|xlsx?)$',urlparse(u).path,re.I): return
    assets.setdefault(u,{'url':u,'roles':[]})['roles'].append(role)
for u,p in pages.items():
    for img in p['soup'].select('img[src]'): addasset(img['src'],u,'image')
    for a in p['soup'].select('a[href]'): addasset(a['href'],u,'linked media')
    for e in p['soup'].select('[style]'):
        for h in re.findall(r'url\([\'"]?([^\)\'\"]+)',e['style']): addasset(h,u,'background')
def download(item):
    u=item['url']; ext=Path(urlparse(u).path).suffix.lower()
    key=hashlib.sha256(u.encode()).hexdigest()[:12]
    filename=key+'-'+slug(unquote(Path(urlparse(u).path).stem))[:45]
    target=ASSET/(filename+('.webp' if ext in ('.jpg','.jpeg','.png','.webp') else ext))
    if target.exists():
        output=target.read_bytes(); info={'cached':True}
    else:
        r=fetch(u); raw=r.content; info={'source_bytes':len(raw),'source_sha256':hashlib.sha256(raw).hexdigest()}
        if ext in ('.jpg','.jpeg','.png','.webp'):
            im=Image.open(BytesIO(raw)); info['source_dimensions']=list(im.size)
            im.thumbnail((2000,2000),Image.Resampling.LANCZOS)
            if im.mode not in ('RGB','RGBA'): im=im.convert('RGBA' if 'transparency' in im.info else 'RGB')
            im.save(target,'WEBP',quality=90,method=6)
        else: target.write_bytes(raw)
        output=target.read_bytes()
    if target.suffix=='.webp':
        im=Image.open(target); info['width'],info['height']=im.size
    info.update({'local':target.relative_to(DIST).as_posix(),'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest()})
    return info
with ThreadPoolExecutor(max_workers=5) as pool:
    fs={pool.submit(download,a):u for u,a in assets.items()}
    completed=0
    for f in as_completed(fs):
        u=fs[f]
        try: assets[u].update(f.result())
        except Exception as e: assets[u]['error']=str(e); errors.append({'url':u,'error':str(e)})
        completed+=1
        if completed%25==0: print('Assets:',completed,'/',len(assets),flush=True)

refs={}
for item in home.select('.portfolio-item'):
    link=item.select_one('a[href]'); img=item.select_one('img[src]')
    if link:
        url=canon(link['href'])
        refs[url]={'thumbnail':canon(img['src']) if img else None,'source_category':'destovka' if 'filter-destovka' in item.get('class',[]) else ('cov' if 'filter-dcov' in item.get('class',[]) else 'ostatni')}
docs=[]
for a in home.select('a[href]'):
    if '.pdf' in a['href'].lower():
        u=canon(a['href']); docs.append({'title':a.get_text(' ',strip=True),'source':u,'asset':assets.get(u,{})})

content=[]
for u,p in pages.items():
    if p['kind']=='home': continue
    soup=p['soup']; body=soup.select_one('main .about .col-lg-12')
    images=[]
    for im in body.select('img[src]'):
        iu=canon(im['src'],u)
        if iu in assets and 'local' in assets[iu]: images.append(iu)
    for a in soup.select('main .portfolio a[href]'):
        iu=canon(a['href'],u)
        if iu in assets and 'local' in assets[iu]: images.append(iu)
    thumbnail=refs.get(u,{}).get('thumbnail')
    if not thumbnail: thumbnail=next(iter(images),None)
    overview_only=not images and thumbnail in assets and p['kind']=='reference'
    if overview_only:images=[thumbnail]
    title=p['title']; cats=[]
    if p['kind']=='reference':
        basic=refs.get(u,{}).get('source_category','ostatni'); cats=[basic]
        if re.search(r'servis|obnov|rekonstruk|znovuzprovozn|zápach|optimaliz',title,re.I): cats.append('servis')
        if re.search(r'čerp|odvádění|kanaliz|splašk',title,re.I): cats.append('cerpani')
        if re.search(r'dešť|dešt',title,re.I) and 'destovka' not in cats: cats.append('destovka')
    content.append({**{k:v for k,v in p.items() if k!='soup'},'body_html':body.decode_contents(),'body_text':body.get_text(' ',strip=True),'images':list(dict.fromkeys(images)),'thumbnail':thumbnail,'categories':list(dict.fromkeys(cats)),'gallery_uses_overview_image':overview_only})
about=home.select_one('#about') or home.select_one('main .about')
about_text=[p.get_text(' ',strip=True) for p in about.select('p')] if about else []
data={'retrieved':'2026-11-07','source':BASE,'pages':content,'assets':assets,'documents':docs,'about':about_text,'broken_source_links':badlinks,'errors':errors}
(DOC/'content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
inventory={'retrieved':data['retrieved'],'source':BASE,'pages':[{k:v for k,v in p.items() if k not in ('body_html','body_text')} for p in content],'documents':docs,'assets':list(assets.values()),'broken_source_links':badlinks,'errors':errors}
(DOC/'inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
(DOC/'link-map.json').write_text(json.dumps({p['url']:p['local'] for p in content},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages':len(content),'references':sum(p['kind']=='reference' for p in content),'services':sum(p['kind']=='service' for p in content),'assets':len(assets),'documents':len(docs),'errors':errors,'broken_source_links':badlinks},ensure_ascii=False,indent=2))
