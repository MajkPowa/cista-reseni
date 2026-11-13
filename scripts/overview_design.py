"""Visual overview pages; public source records remain the source of truth."""
from pathlib import Path
from urllib.parse import quote
from partner_testimonial import render_partner_testimonial
from partners import render_partners


def render_overview(current, ctx):
    esc, rel, short = ctx['esc'], ctx['rel'], ctx['short']
    refs, data, assets = ctx['refs'], ctx['DATA'], ctx['ASSETS']
    thumb, asset_url = ctx['thumb_url'], ctx['asset_url']
    date_title, labels = ctx['date_title'], ctx['LABELS']
    business, company = ctx['BUSINESS'], ctx['COMPANY']

    def crumbs(title):
        return f'<div class="breadcrumbs"><a href="index.html">Úvod</a><span aria-hidden="true">/</span><span aria-current="page">{esc(title)}</span></div>'

    def heading(kicker, title, description, meta=''):
        return f'<section class="container editorial-heading">{crumbs(kicker)}<div class="editorial-title"><div><p class="ed-kicker">{esc(kicker)}</p><h1>{title}</h1></div><div class="editorial-intro"><p>{esc(description)}</p>{meta}</div></div></section>'

    def project_card(p):
        title, date = date_title(p)
        image = p.get('thumbnail')
        categories = p.get('display_categories', p['categories'])
        category = labels.get(categories[0], 'Realizace') if categories else 'Realizace'
        illustration = image in ctx['ILLUSTRATIONS']
        picture = ''
        if image:
            a = assets[image]
            picture = f'<img src="{thumb(image,current)}" width="{a.get("width",800)}" height="{a.get("height",600)}" alt="{esc(("Ilustrační vyobrazení — " if illustration else "")+title)}" loading="lazy">'
        note = ' · Ilustrační vyobrazení' if illustration else ''
        facts = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k,v in p.get('project_facts',[]) if k not in ('Rozsah služeb','Rozsah prací'))
        scope = p.get('compact_scope', short(p['body_text'],125))
        return f'<a class="content-card project-card" href="{rel(p["local"],current)}" data-reference-card data-categories="{esc(" ".join(categories))}" data-search="{esc(title+" "+p["body_text"])}"><div class="card-picture">{picture}<span>{esc(category)}</span><b class="card-round-arrow" aria-hidden="true">↗</b></div><div class="card-meta">{esc(date+note)}</div><h2>{esc(title)}</h2><p>{esc(scope)}</p><dl class="project-card-facts">{facts}</dl><span class="text-link">Prohlédnout projekt <span aria-hidden="true">↗</span></span></a>'

    def service_proof():
        cards = ''
        for item in business['service_proof']:
            cards += f'<article><p class="ed-kicker">{esc(item["location"])} / {esc(item["service"])}</p><div class="proof-capacity"><strong>{item["capacity"]["value"]}</strong><span>{esc(item["capacity"]["unit"])}<small>kapacita ČOV</small></span></div><h3>{esc(item["client"])}</h3><a class="text-link" href="sluzby/servis-a-udrzba.html">Prozkoumat servisní služby ↗</a></article>'
        return '<section class="container service-proof-section" data-reveal><div class="section-caption"><div><p class="ed-kicker">Servis také pro komerční provozy</p><h2>Péče o zařízení<br>v každodenním provozu.</h2></div><p>Servisujeme také čistírny,<br>které jsme sami nedodávali.</p></div><div class="service-proof-grid">'+cards+'</div></section>'

    if current == 'reference.html':
        featured = next(p for p in refs if p['local'].startswith('realizace/38-'))
        body = heading('Naše realizace','Každé místo.<br><span>Vlastní řešení.</span>','Od prvního výkopu po hotovou technologii. Prohlédněte si skutečné projekty a vyberte oblast, kterou právě řešíte.',f'<span class="ed-count"><b>{len(refs)}</b> realizací k prozkoumání</span>')
        body += f'<section class="container featured-project" data-reveal><a class="featured-image" href="{featured["local"]}"><img src="assets/ref-prehorov.webp" alt="Realizace domovní čistírny v Přehořově u Soběslavi" width="1200" height="900" fetchpriority="high"><span class="feature-badge">Z našich projektů</span><span class="feature-open" aria-hidden="true">↗</span></a><div class="featured-copy"><p class="ed-kicker">Přehořov u Soběslavi / 07. 2026</p><h2>Čistírna jako<br><span>součást domova.</span></h2><p>Domovní čistírna BC 4 COMFORT DUO s pískovým filtrem. Podívejte se, jak probíhala realizace na konkrétním pozemku.</p><a class="button" href="{featured["local"]}">Prohlédnout realizaci <span aria-hidden="true">↗</span></a></div></section>'
        body += '<section class="container project-library" id="projekty"><div class="section-caption"><div><p class="ed-kicker">Najděte podobný záměr</p><h2>Projekty v detailu</h2></div><a class="text-link" href="galerie.html">Procházet fotografie ↗</a></div><div class="listing-toolbar"><div class="listing-search"><label for="reference-search">Co vás zajímá?</label><input id="reference-search" type="search" placeholder="Místo, technologie nebo typ řešení…" autocomplete="off"></div><p class="result-count" id="result-count" role="status"></p></div><div class="content-filters" role="group" aria-label="Typ realizace"><button data-content-filter="all" aria-pressed="true">Všechny projekty</button>'
        body += ''.join(f'<button data-content-filter="{k}" aria-pressed="false">{v}</button>' for k,v in labels.items())
        body += '</div><div class="content-card-grid project-library-grid" data-cms="reference-grid">'+''.join(project_card(p) for p in refs)+'</div><div id="empty-state" class="empty-state" hidden><h2>Takový projekt jsme nenašli.</h2><p>Zkuste jiné slovo nebo vyberte všechny typy řešení.</p></div><div class="load-more-row"><button class="button button-outline" data-load-references hidden>Zobrazit další projekty <span aria-hidden="true">+</span></button></div></section>'
        return body + service_proof() + ctx['cta'](current,'Co potřebuje váš dům nebo provoz?','Probereme novou technologii, servis i obnovu stávajícího zařízení.')

    if current == 'galerie.html':
        count = sum(len(p['images']) for p in refs)
        body = heading('Galerie','Nahlédněte<br><span>pod povrch.</span>','Fotografie z míst, kde voda dostává nové řešení. Vyberte projekt a otevřete snímky v plné velikosti.',f'<span class="ed-count"><b>{count}</b> fotografií a vyobrazení</span>')
        body += '<div class="container gallery-mosaic" data-reveal><img src="assets/ref-prehorov.webp" alt="Čistírna v Přehořově" width="1200" height="900"><img src="assets/ref-tabor.webp" alt="Instalace nádrže na dešťovku v Mělníku" width="1200" height="900"><div><span>Od detailu<br>k celému řešení.</span><a href="#fotografie">Prozkoumat galerii <span aria-hidden="true">↓</span></a></div></div>'
        body += '<section class="container gallery-library" id="fotografie"><div class="gallery-controls"><div class="gallery-control"><label for="gallery-project">Který projekt chcete prozkoumat?</label><select id="gallery-project"><option value="all">Všechny realizace</option>'
        body += ''.join(f'<option value="{esc(p["local"])}">{esc(p["title"])}</option>' for p in refs)
        body += f'</select></div><p id="gallery-count" role="status">{count} snímků</p></div><div class="media-grid global-gallery" data-cms="gallery-grid">'
        for p in refs:
            title, _ = date_title(p)
            body += ''.join(ctx['gallery_item'](u,ctx['gallery_caption'](u,title,i),current,p['local']) for i,u in enumerate(p['images']))
        body += '</div><div class="load-more-row"><button class="button button-outline" data-load-gallery hidden>Zobrazit další snímky <span aria-hidden="true">+</span></button></div></section>'
        return body + ctx['cta'](current)

    if current == 'dokumenty.html':
        body = heading('Dokumenty','Dobré rozhodnutí<br><span>začíná podklady.</span>','Prohlédněte si návody, technické informace a přehledy technologií. Každý dokument můžete rovnou otevřít nebo stáhnout.', '<span class="ed-count"><b>5</b> původních PDF dokumentů</span>')
        body += '<section class="container document-library"><div class="document-toolbar"><div><label for="document-search">Najít dokument</label><input id="document-search" type="search" placeholder="Například návod, čistírny, nádrže…"></div><div class="content-filters" role="group" aria-label="Oblast dokumentace"><button data-document-filter="all" aria-pressed="true">Všechny</button><button data-document-filter="cov" aria-pressed="false">Čistírny</button><button data-document-filter="destovka" aria-pressed="false">Dešťová voda</button></div></div><p class="library-status" id="document-count" role="status"></p><div class="document-grid">'
        for i,d in enumerate(data['documents']):
            a = d['asset']; category = 'cov' if i<3 else 'destovka'
            size = f'{a["bytes"]/1024/1024:.1f} MB' if a['bytes']>1024*1024 else f'{round(a["bytes"]/1024)} kB'
            pdf = rel(a['local'],current); cover = f'assets/document-covers/{a["sha256"][:12]}.webp'
            kind = 'Návod k obsluze' if i==0 else 'Prohlášení o vlastnostech' if i==1 else 'Přehled technologií'
            body += f'<article class="document-card" data-document-card data-category="{category}" data-search="{esc(d["title"])}"><a class="document-cover" href="{pdf}" target="_blank" rel="noopener" aria-label="{esc(d["title"])} — otevřít PDF"><img src="{cover}" alt="Náhled první strany: {esc(d["title"])}" width="453" height="640" loading="lazy"><span>PDF <b aria-hidden="true">↗</b></span></a><div class="document-copy"><p class="ed-kicker">{kind} / {size}</p><h2>{esc(d["title"])}</h2><div><a class="text-link" href="{pdf}" target="_blank" rel="noopener">Otevřít dokument ↗</a><a class="document-download" href="{pdf}" download>Stáhnout ↓</a></div></div></article>'
        body += '</div><p id="document-empty" class="empty-state" hidden>Takový dokument jsme nenašli. Zkuste jiný název nebo oblast.</p></section>'
        return body + ctx['cta'](current,'Potřebujete se v podkladech zorientovat?','Napište nám, jakou technologii řešíte. Pomůžeme vám vybrat další postup.')

    if current == 'o-nas.html':
        body = heading('O nás','Voda je naše<br><span>společná práce.</span>','Rodinná obchodní, projekční, realizační a servisní firma z Tábora. Řešení pro domácnosti, firmy, obce i průmyslové provozy zajišťujeme vlastními kapacitami nebo s odbornými partnery.', '<a class="text-link" href="kontakt.html">Poznejme váš záměr ↗</a>')
        body += '<section class="container about-story" data-reveal><div class="about-story-image"><img src="assets/team-about.webp" alt="Kapka vody na zeleném listu" width="614" height="456"><span>Čistá řešení<br><small>by White Elephant / Tábor</small></span></div><div class="about-principles"><p class="ed-kicker">Od návrhu po provoz</p><h2>Jedna návaznost.<br><span>Od začátku do konce.</span></h2><div class="about-points"><a href="sluzby/zpracovani-projektove-dokumentace.html"><span>01</span><div><strong>Promyslet</strong><p>Projektanti a návrh vhodného řešení.</p></div><b aria-hidden="true">↗</b></a><a href="sluzby/montaz-a-instalace-technologii.html"><span>02</span><div><strong>Realizovat</strong><p>Montážní technici, instalatéři a elektrikáři.</p></div><b aria-hidden="true">↗</b></a><a href="sluzby/servis-a-udrzba.html"><span>03</span><div><strong>Pečovat</strong><p>Poradenství, údržba a následný servis.</p></div><b aria-hidden="true">↗</b></a></div></div></section>'
        headings = ['Lidé za Čistými řešeními','Smysl naší práce','Pro koho pracujeme','Technologie, kterým se věnujeme']
        body += '<section class="container about-details"><div><p class="ed-kicker">Blíž k nám</p><h2>Co je pro nás<br><span>důležité.</span></h2></div><div class="source-accordions">'
        for i,p in enumerate(x for x in data['about'] if x.strip()):
            body += f'<details {"open" if i==0 else ""}><summary>{esc(headings[i])}<span aria-hidden="true">+</span></summary><div class="about-source"><p>{esc(p)}</p></div></details>'
        body += '</div></section>' + render_partner_testimonial(current, ctx) + render_partners(current, ctx)
        return body + ctx['cta'](current,'Začněme vaším záměrem.','Řekněte nám, co potřebuje váš dům, pozemek nebo provoz.')

    if current == 'kontakt.html':
        body = heading('Kontakt','Každé řešení<br><span>začíná rozhovorem.</span>','Nemusíte mít vybranou technologii. Zavolejte nám, napište nebo začněte tím, co právě potřebujete vyřešit.')
        street, city, address = esc(company['street']), esc(company['city']), esc(company['address'])
        map_query = quote(company['address'])
        body += f'<section class="container contact-hub"><div class="contact-channels"><a href="tel:+420736403795" class="contact-channel"><span>Zavolejte nám</span><strong>736 403 795</strong><b aria-hidden="true">↗</b></a><a href="mailto:info@cistareseni.cz" class="contact-channel"><span>Napište nám</span><strong>info@cistareseni.cz</strong><b aria-hidden="true">↗</b></a><div class="contact-copy-row"><p>Fotografie a dokumentaci můžete připojit k e-mailu.</p><button type="button" data-copy-text="info@cistareseni.cz" data-copy-label="E-mail zkopírován">Kopírovat e-mail</button></div></div><div class="address-card"><p class="ed-kicker">Čistá řešení / WHITE ELEPHANT s.r.o.</p><h2>Tábor</h2><p class="street-address">{street}<br>{city}</p><div class="address-actions"><a href="https://www.google.com/maps/search/?api=1&amp;query={map_query}" target="_blank" rel="noopener">Zobrazit adresu na mapě ↗</a><button type="button" data-copy-text="{address}" data-copy-label="Adresa zkopírována">Kopírovat adresu</button></div><small>IČ 06245676 / DIČ CZ06245676</small></div><p class="sr-only" id="copy-status" role="status"></p></section>'
        regions = ''.join(f'<li>{region}</li>' for region in ['Jihočeský kraj', 'Praha a Středočeský kraj', 'Plzeňský kraj', 'Karlovarský kraj', 'Kraj Vysočina'])
        body += f'<section class="container contact-regions"><div class="section-caption"><div><p class="ed-kicker">Kde působíme</p><h2>Servis a realizace ve vašem regionu</h2></div><p>U větších projektů působíme i mimo tyto regiony.</p></div><ul class="regions-list">{regions}</ul></section>'
        body += '<section class="container contact-intents"><div class="section-caption"><div><p class="ed-kicker">Pojďme rovnou k věci</p><h2>Co vás přivádí?</h2></div><p>Volbou připravíte poptávku<br>pro konkrétní oblast.</p></div><div class="intent-grid">'
        for number,key,title,desc in [('01','cov','Nová domovní ČOV','Řešení pro dům nebo rekreační objekt.'),('02','cov_firmy','ČOV pro firmy a obce','Penzion, obec, komerční nebo průmyslový provoz.'),('03','servis','Servis nebo oprava','Také u zařízení, která jsme nedodávali.'),('04','zprovozneni','Zprovoznění ČOV','Kontrola, nastavení a uvedení do provozu.'),('05','skoleni','Školení obsluhy','Praktické zaškolení a podpora provozovatele.'),('06','rekonstrukce','Rekonstrukce ČOV','Modernizace a intenzifikace stávající technologie.'),('07','destovka','Dešťová voda','Využití zachycené vody.'),('08','cerpani','Čerpání vody','Čerpací šachty a technologie.'),('09','poradit','Odborná konzultace','Pomoc s výběrem dalšího kroku.')]:
            body += f'<a href="index.html?reseni={key}#poptavka"><span>{number}</span><div><h3>{title}</h3><p>{desc}</p></div><b aria-hidden="true">↗</b></a>'
        return body + '</div></section>'
    raise ValueError(f'Unsupported overview: {current}')
