"""Editorial blue detail pages. Pure rendering: does not write files.

Integration: render_detail(p, ctx), then save with has_gallery=bool(p['images']).
Load details.css after content.css on sluzby/* and realizace/* HTML pages.
Original article text is preserved across .article-copy elements, in DOM order.
"""
from pathlib import PurePosixPath
import re
from bs4 import BeautifulSoup, Tag

CATEGORIES = {'cov': 'Domovní čistírny odpadních vod', 'commercial': 'Firemní a průmyslové ČOV', 'rekonstrukce': 'Rekonstrukce a intenzifikace ČOV', 'upravny': 'Úpravny pitné a technologické vody', 'destovka': 'Hospodaření s dešťovou vodou', 'cerpani': 'Čerpací stanice a související technologie', 'servis': 'Servisní zásahy', 'ostatni': 'Další řešení'}
SERVICE_FACTS = {
    'konzultace-a-poradenstvi': [('Podle vašeho místa', 'Doporučení vychází z místních podmínek a plánovaného záměru.'), ('S ohledem na rozpočet', 'Při výběru řešení bereme v úvahu také finanční možnosti.'), ('První společný krok', 'Úvodní konzultaci běžně poskytujeme zdarma.')],
    'cisteni-odpadnich-vod': [('ENVI-PUR a ASIO', 'Domovní technologie pro rodinné i rekreační domy.'), ('Celá cesta k řešení', 'Od konzultace a dokumentace po montáž a servis.'), ('Podle konkrétního zadání', 'Výběr čistírny i způsob odtoku se řeší při přípravě projektu.')],
    'hospodareni-s-destovou-vodou': [('ROTO Group a ASIO', 'Nádrže a technologie pro využití i vsakování dešťové vody.'), ('Zahrada i domácnost', 'Využití vody pro zálivku, splachování nebo praní.'), ('Nádrž i příslušenství', 'Podzemní a nadzemní nádrže s navazujícím vybavením.')],
    'cerpaci-sachty': [('Když samospád nestačí', 'Řešení pro odpadní, dešťovou nebo podzemní vodu.'), ('Technologie ASIO', 'Čerpací šachty a stanice z nabídky výrobce.'), ('Přehled o provozu', 'Součástí instalace je signalizace případných provozních problémů.')],
    'zpracovani-projektove-dokumentace': [('Vodohospodářské projekty', 'Dokumentace pro čištění vody, přípojky, vodovody a další stavby.'), ('Jednání s úřady', 'Možnost zastoupení na základě plné moci.'), ('Studie proveditelnosti', 'Podklady pro rozhodnutí o připravovaném záměru.')],
    'zajisteni-povoleni-stavby': [('Projednání záměru', 'Komunikace s příslušnými dotčenými orgány.'), ('Návaznost na projekt', 'Službu lze spojit se zpracováním projektové dokumentace.'), ('Odborná pomoc', 'Podpora při přípravě a vedení povolovacího procesu.')],
    'prodej-cov-a-destovych-nadrzi': [('Dodání technologie', 'Domovní čistírny a nádrže na dešťovou vodu.'), ('Odborné zprovoznění', 'U čistírny včetně zaškolení obsluhy a předání dokumentace.'), ('Nabídka podle zadání', 'Cena vychází z potřeb a podkladů konkrétní stavby.')],
    'montaz-a-instalace-technologii': [('Montáž a spuštění', 'Odborná instalace a zprovoznění vodohospodářských technologií.'), ('Zaškolení obsluhy', 'Seznámení s provozem a ovládáním zařízení.'), ('Navazující práce', 'Na přání i zemní práce, potrubí a příprava elektroinstalace.')],
    'servis-a-udrzba': [('Péče o zařízení', 'Údržba a servis čistíren i systémů dešťové vody.'), ('Vybavení a díly', 'Zázemí pro servis nabízených technologií.'), ('Individuální kalkulace', 'Cena se odvíjí od vzdálenosti a složitosti konkrétního úkonu.')],
    'prodej-nahradnich-dilu': [('Originální díly', 'Náhradní komponenty pro nabízené technologie.'), ('Dlouhodobá údržba', 'Nabídka zařízení, o která se lze starat i po delším čase.'), ('Včasná výměna', 'Konzultace při opotřebení nebo konci životnosti komponenty.')],
}


def _icon(kind='arrow'):
    paths = {'arrow': 'M4 12h15m-6-6 6 6-6 6', 'plus': 'M12 5v14M5 12h14', 'picture': 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 8h.01', 'check': 'm5 12 4 4L19 6', 'back': 'M20 12H5m6-6-6 6 6 6', 'phone': 'm7 3 3 5-3 3a15 15 0 0 0 6 6l3-3 5 3c0 4-3 5-6 4A22 22 0 0 1 3 9C2 6 3 3 7 3Z'}
    return f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="{paths[kind]}"/></svg>'


def _excerpt(text, limit=195):
    value = re.sub(r'\s+', ' ', text).strip()
    return value if len(value) <= limit else value[:limit].rsplit(' ', 1)[0].rstrip(' ,;:') + '…'


def _heading(node):
    if not isinstance(node, Tag):
        return False
    if node.name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
        return True
    if node.name == 'p':
        text = node.get_text(' ', strip=True)
        emphasized = ' '.join(t.get_text(' ', strip=True) for t in node.find_all(['strong', 'b'], recursive=False))
        return bool(text) and len(text) < 190 and re.sub(r'\s+', '', text) == re.sub(r'\s+', '', emphasized)
    return False


def _chunks(original_html):
    """Keep source order, nested lists, pseudo-headings and list introductions."""
    soup = BeautifulSoup(original_html, 'html.parser')
    nodes = [n for n in soup.contents if isinstance(n, Tag) or str(n).strip()]
    chunks, current, label = [], [], None
    paragraph_count = 0

    def text_of(items):
        return ' '.join(n.get_text(' ', strip=True) if isinstance(n, Tag) else str(n) for n in items)

    def flush():
        nonlocal current, label, paragraph_count
        if current:
            text = text_of(current)
            if text.strip() or any(isinstance(n, Tag) and n.find('img') for n in current):
                chunks.append({'html': ''.join(str(n) for n in current), 'label': label, 'text': text})
        current, label, paragraph_count = [], None, 0

    for node in nodes:
        if _heading(node):
            flush()
            label = node.get_text(' ', strip=True).rstrip(':')
        elif isinstance(node, Tag) and node.name == 'p' and node.get_text(' ', strip=True) and current:
            prev = current[-1]
            prev_text = prev.get_text(' ', strip=True) if isinstance(prev, Tag) else str(prev)
            protected = _heading(prev) or prev_text.rstrip().endswith(':')
            if paragraph_count >= 2 and len(text_of(current)) > 480 and not protected:
                flush()
        current.append(node)
        if isinstance(node, Tag) and node.name == 'p' and node.get_text(' ', strip=True) and not _heading(node):
            paragraph_count += 1
    flush()
    for i, chunk in enumerate(chunks):
        if not chunk['label']:
            sentence = re.split(r'(?<=[.!?])\s+', chunk['text'], maxsplit=1)[0]
            chunk['label'] = _excerpt(sentence, 104) or f'Obrazové podklady {i + 1}'
    return chunks


def _categories(p):
    if p['kind'] == 'reference':
        return p.get('display_categories', p.get('categories', []))
    slug = PurePosixPath(p['local']).stem
    if slug == 'hospodareni-s-destovou-vodou': return ['destovka']
    if slug == 'cisteni-odpadnich-vod': return ['cov']
    if slug == 'cerpaci-sachty': return ['cerpani']
    if slug in ('servis-a-udrzba', 'prodej-nahradnich-dilu'): return ['servis']
    if slug == 'prodej-cov-a-destovych-nadrzi': return ['cov', 'destovka']
    return []


def _image_label(url, p, ctx):
    if url in ctx['ILLUSTRATIONS']:
        return 'Ilustrační vyobrazení akumulační nádrže'
    if re.search(r'/cov-img[1235]\.', url or ''):
        return 'Produktové vyobrazení ze zdrojového webu'
    if re.search(r'/cov-img4\.', url or ''):
        return 'Fotografie vegetační dlažby'
    return 'Fotografie z realizace' if p['kind'] == 'reference' else 'Snímek technologie ze zdrojového webu'


def render_detail(p, ctx):
    esc, rel = ctx['esc'], ctx['rel']
    current = p['local']
    is_ref = p['kind'] == 'reference'
    title, date = ctx['date_title'](p)
    source_html = ctx['clean_body'](p)
    soup = BeautifulSoup(source_html, 'html.parser')
    first_p = next((a.get_text(' ', strip=True) for a in soup.find_all('p', recursive=False) if a.get_text(' ', strip=True) and not _heading(a)), p['body_text'])
    lead = _excerpt(first_p)
    cats = _categories(p)
    mode = next((v for v in ('servis','rekonstrukce','destovka','cerpani','cov') if v in cats), 'poradit')
    if 'commercial' in cats and mode not in ('servis', 'rekonstrukce'):
        mode = 'cov_firmy'
    if PurePosixPath(current).stem == 'prodej-cov-a-destovych-nadrzi':
        mode = 'poradit'
    inquiry = rel('index.html', current) + '?reseni=' + mode + '#poptavka'
    images = [u for u in p.get('images', []) if ctx['ASSETS'].get(u, {}).get('local')]
    cover = images[0] if images else p.get('thumbnail')
    cover = cover if ctx['ASSETS'].get(cover, {}).get('local') else None
    parent, parent_title = ('reference.html', 'Realizace') if is_ref else ('sluzby.html', 'Naše řešení')
    crumbs = f'<a href="{rel("index.html", current)}">Úvod</a><span>/</span><a href="{rel(parent, current)}">{parent_title}</a><span>/</span><span aria-current="page">{esc(title)}</span>'
    tag_values = [CATEGORIES[c] for c in cats if c in CATEGORIES]
    if is_ref and date != 'Realizace': tag_values.append(date)
    if not tag_values: tag_values = ['Vodohospodářské služby', 'Čistá řešení']
    tags = ''.join(f'<span>{esc(t)}</span>' for t in tag_values)
    figure_class = 'detail-main-visual'
    if cover:
        a = ctx['ASSETS'][cover]
        image = f'<img src="{ctx["asset_url"](cover, current)}" width="{a.get("width", 1200)}" height="{a.get("height", 900)}" alt="{esc(_image_label(cover,p,ctx)+": "+title)}" fetchpriority="high" decoding="async">'
        label = _image_label(cover, p, ctx)
        if not is_ref: figure_class += ' detail-main-visual--product'
        visual_link = f'<a class="detail-image-link" href="#detail-gallery" aria-label="Přejít do galerie">{image}<span class="detail-image-action">{_icon("picture")} Prohlédnout snímky</span></a>' if images else image
    else:
        figure_class += ' detail-main-visual--diagram'
        visual_link = f'<img src="{rel("assets/water-systems.svg",current)}" width="900" height="650" alt="Ilustrační izometrické schéma domu a systémů hospodaření s vodou" fetchpriority="high">'
        label = 'Ilustrační schéma hospodaření s vodou'
    body = f'''<div class="detail-page detail-page--{'project' if is_ref else 'service'}"><section class="detail-hero"><div class="container"><div class="detail-breadcrumbs" aria-label="Drobečková navigace">{crumbs}</div><div class="detail-hero-grid"><div class="detail-hero-copy" data-reveal><a class="detail-back" href="{rel(parent,current)}">{_icon('back')} {parent_title}</a><p class="eyebrow">{'ZA KAŽDOU REALIZACÍ JE PŘÍBĚH' if is_ref else 'VODA PODLE VAŠICH POTŘEB'}</p><h1>{esc(title)}</h1><p class="detail-lead">{esc(lead)}</p><div class="detail-tags">{tags}</div><div class="detail-hero-actions"><a class="button" href="{inquiry}">{'Probrat podobné řešení' if is_ref else 'Probrat můj projekt'} {_icon()}</a><a class="detail-text-link" href="#detail-story">{'Příběh projektu' if is_ref else 'Co služba zahrnuje'} <span>↓</span></a></div></div><figure class="{figure_class}" data-reveal>{visual_link}<figcaption>{esc(label)}</figcaption></figure></div></div></section>'''
    related = [r for r in ctx['refs'] if r['local'] != current and (not cats or set(cats) & set(r.get('display_categories', r.get('categories', []))))][:3]
    nav = [('detail-overview','V přehledu'),('detail-story','Příběh projektu' if is_ref else 'Podrobnosti služby')]
    if images: nav.append(('detail-gallery',f'Galerie ({len(images)})'))
    if related: nav.append(('detail-related','Další realizace'))
    body += '<nav class="detail-nav" aria-label="Na této stránce"><div class="container detail-nav-inner">' + ''.join(f'<a href="#{i}">{esc(t)}</a>' for i,t in nav) + f'<a class="detail-nav-cta" href="{inquiry}">Poptat řešení {_icon()}</a></div><span class="detail-read-progress" data-scroll-progress aria-hidden="true"></span></nav>'
    body += '<section class="container detail-overview" id="detail-overview" data-reveal>'
    if is_ref:
        body += '<div class="detail-overview-heading"><p class="eyebrow">PROJEKT V KOSTCE</p><h2>Konkrétní místo.<br>Konkrétní řešení.</h2></div><dl class="detail-facts">'
        facts = [('Oblast řešení', ' / '.join(CATEGORIES.get(c,c) for c in cats)), ('Období realizace', date)] if date != 'Realizace' else [('Oblast řešení', ' / '.join(CATEGORIES.get(c,c) for c in cats))]
        facts += p.get('project_facts', [])
        for label,value in facts: body += f'<div><dt>{esc(label)}</dt><dd>{esc(value)}</dd></div>'
        body += '</dl>'
    else:
        body += '<div class="detail-overview-heading"><p class="eyebrow">TO PODSTATNÉ</p><h2>Jasný rozsah.<br>Srozumitelný postup.</h2></div><div class="detail-benefits">'
        facts = SERVICE_FACTS.get(PurePosixPath(current).stem, [])
        for i,(heading,text) in enumerate(facts): body += f'<article><span class="detail-benefit-number">0{i+1}</span><h3>{esc(heading)}</h3><p>{esc(text)}</p></article>'
        body += '</div>'
    body += '</section>'
    if not is_ref and PurePosixPath(current).stem == 'cisteni-odpadnich-vod':
        body += f'<section class="container service-bridge" data-reveal><div><p class="eyebrow">VĚTŠÍ OBJEKT, JINÉ POŽADAVKY</p><h2>Čistírna pro firmu nebo obec?</h2><p>Řešíme také penziony, hotely, komunální a průmyslové provozy. Vlastními kapacitami nebo s odbornými partnery.</p></div><a class="button" href="{rel("sluzby/cov-pro-firmy-a-obce.html",current)}">ČOV pro firmy a obce {_icon()}</a></section>'
    chunks = _chunks(source_html)
    body += f'''<section class="detail-story-section" id="detail-story"><div class="container detail-story-grid"><div class="detail-story-intro" data-reveal><p class="eyebrow">{'JAK TO PROBÍHALO' if is_ref else 'VŠE DŮLEŽITÉ NA JEDNOM MÍSTĚ'}</p><h2>{'Od zadání<br>k hotovému řešení.' if is_ref else 'Pojďme<br>do detailu.'}</h2><p>{'Projděte si celý příběh realizace, použitou technologii a jednotlivé kroky.' if is_ref else 'Rozsah služby a technické souvislosti jsou rozdělené do přehledných částí.'}</p><a class="detail-source-link" href="{esc(p['url'])}" target="_blank" rel="noopener">Původní {'reference' if is_ref else 'podklady'} ↗</a><div class="detail-contact-note">{_icon('phone')}<div><small>Raději vše proberete osobně?</small><a href="tel:+420736403795">736 403 795</a></div></div></div><div class="detail-accordion">'''
    for i,chunk in enumerate(chunks):
        body += f'<details class="detail-chapter" id="detail-chapter-{i+1}"{" open" if i==0 else ""} data-reveal><summary><span class="detail-chapter-number">{i+1:02d}</span><span class="detail-chapter-title">{esc(chunk["label"])}</span><span class="detail-chapter-toggle">{_icon("plus")}</span></summary><article class="article-copy source-fragment">{chunk["html"]}</article></details>'
    body += '</div></div></section>'
    if images:
        body += f'<section class="container detail-gallery" id="detail-gallery"><div class="detail-section-heading" data-reveal><div><p class="eyebrow">ZBLÍZKA</p><h2>{"Podívejte se na výsledek." if is_ref else "Technologie v obrazech."}</h2></div><p>{len(images)} snímků · fotografie a vyobrazení<br>Kliknutím otevřete větší detail.</p></div><div class="media-grid detail-gallery-grid">'
        for i,u in enumerate(images[:6]):
            caption = ctx['gallery_caption'](u,title,i) if is_ref else f'{title} — {_image_label(u,p,ctx)} {i+1}'
            body += ctx['gallery_item'](u,caption,current)
        body += '</div>'
        if len(images)>6:
            body += '<div class="media-grid detail-gallery-grid detail-gallery-more" id="detail-gallery-more">'
            for i,u in enumerate(images[6:],6):
                caption = ctx['gallery_caption'](u,title,i) if is_ref else f'{title} — {_image_label(u,p,ctx)} {i+1}'
                body += ctx['gallery_item'](u,caption,current)
            body += f'</div><button class="detail-gallery-expand" type="button" data-gallery-expand aria-expanded="false" aria-controls="detail-gallery-more" data-collapsed-label="Zobrazit všech {len(images)} snímků" data-expanded-label="Zobrazit méně snímků" hidden><span class="expand-label" data-expand-label>Zobrazit všech {len(images)} snímků</span> {_icon("plus")}</button>'
        body += '</section>'
    if related:
        body += f'<section class="detail-related" id="detail-related"><div class="container"><div class="detail-section-heading" data-reveal><div><p class="eyebrow">DALŠÍ Z NAŠÍ PRÁCE</p><h2>Každý projekt má svůj příběh.</h2></div><a class="detail-text-link" href="{rel("reference.html",current)}">Všechny realizace {_icon()}</a></div><div class="detail-related-grid">'
        for r in related:
            rtitle,rdate = ctx['date_title'](r);image=r.get('thumbnail') or next(iter(r.get('images',[])),None)
            asset=ctx['ASSETS'].get(image,{})
            if not asset.get('local'): continue
            kind = _image_label(image,r,ctx)
            note = ' · Ilustrační vyobrazení' if image in ctx['ILLUSTRATIONS'] else ''
            body += f'<a class="detail-related-card" href="{rel(r["local"],current)}" data-reveal><div class="detail-related-picture"><img src="{ctx["thumb_url"](image,current)}" width="{asset.get("width",800)}" height="{asset.get("height",600)}" alt="{esc(kind+": "+rtitle)}" loading="lazy"><span>{_icon()}</span></div><p class="detail-related-meta">{esc(rdate+note)}</p><h3>{esc(rtitle)}</h3></a>'
        body += '</div></div></section>'
    body += f'''<section class="container detail-final-cta" data-reveal><div><p class="eyebrow">TEĎ JE ŘADA NA VAŠEM PROJEKTU</p><h2>{'Podobná situace?<br>Najdeme vaši cestu.' if is_ref else 'Začněme tím,<br>co potřebujete vyřešit.'}</h2><p>Řekněte nám něco o místě a vašem záměru. Společně probereme další postup.</p></div><div class="detail-final-actions"><a class="button" href="{inquiry}">Probrat můj projekt {_icon()}</a><a class="detail-text-link" href="tel:+420736403795">{_icon('phone')} 736 403 795</a></div></section></div>'''
    return body
