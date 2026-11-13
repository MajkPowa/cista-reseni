"""Client-requested service pages, rendered without filesystem side effects.

Integration: render_extension(local_path, CTX) -> HTML body. Load
service-extensions.css after the existing stylesheets. EXTENSION_PAGES contains
the five routes, SEO titles/descriptions and inquiry modes. The old service
article is retained, unabridged, through ctx['clean_body'].

Facts: client attachment of November 2026 and docs/source-inventory/content.json.
Reference photography is always labelled and linked to its actual project.
"""

EXTENSION_PAGES = {
    'sluzby/cov-pro-firmy-a-obce.html': {
        'title': 'Čistírny odpadních vod pro firmy a obce',
        'desc': 'ČOV pro penziony, hotely, obce, komerční a průmyslové provozy. Projektová příprava, technologické celky, úprava vod i modernizace.',
        'mode': 'cov_firmy',
    },
    'sluzby/servis-a-udrzba.html': {
        'title': 'Servis a údržba ČOV',
        'desc': 'Pravidelný i jednorázový servis čistíren různých výrobců, včetně zařízení od jiných dodavatelů. Diagnostika, opravy a péče o provoz.',
        'mode': 'servis',
    },
    'sluzby/zprovozneni-cov.html': {
        'title': 'Zprovoznění čistíren odpadních vod',
        'desc': 'Kontrola instalace a komponentů, nastavení řízení a biologického procesu, uvedení ČOV do provozu a předání protokolu.',
        'mode': 'zprovozneni',
    },
    'sluzby/skoleni-obsluhy-cov.html': {
        'title': 'Školení obsluhy a provozovatelů ČOV',
        'desc': 'Praktické zaškolení na místě instalace pro soukromé majitele, firmy i obce. Provoz, údržba, základní diagnostika a odborné konzultace.',
        'mode': 'skoleni',
    },
    'sluzby/rekonstrukce-a-modernizace-cov.html': {
        'title': 'Rekonstrukce a modernizace ČOV',
        'desc': 'Posouzení stávající čistírny, návrh modernizace, výměny a doplnění technologie i intenzifikace podle možností konkrétního zařízení.',
        'mode': 'rekonstrukce',
    },
}

# The build uses ``description``; ``desc`` remains a concise compatible alias.
for _metadata in EXTENSION_PAGES.values():
    _metadata['description'] = _metadata['desc']

_PROJECTS = {
    31: ('Penzion ve Stráži nad Nežárkou', 'Výměna stávající ČOV za BC 20 COMFORT a úpravy navazujících potrubí.', 'Výměna ČOV · 11 / 2025'),
    39: ('Výrobní areál v Písku', 'Přestavba původní ČOV na čerpací jímku a napojení areálu na veřejnou kanalizaci.', 'Odvádění splaškových vod · 08 / 2026'),
    41: ('Obnova technologie BC 50', 'Zachování původní konstrukce, výměna technologie, zprovoznění a zaškolení obsluhy.', 'Rekonstrukce ČOV · 09 / 2026'),
}

_COPY = {
    'cov_firmy': {
        'eyebrow': 'PRO FIRMY, OBCE A VĚTŠÍ PROVOZY',
        'heading': 'Čistírny odpadních vod pro firmy a obce.',
        'lead': 'Od penzionu po výrobní areál. Navrhujeme a zajišťujeme vodohospodářské technologie podle konkrétního objektu, provozu a místních podmínek.',
        'tags': ['Komerční objekty', 'Obce a menší sídla', 'Průmyslové provozy'],
        'cta': 'Probrat záměr', 'cover': 31,
        'cover_note': 'Výměna ČOV v penzionu · Stráž nad Nežárkou',
        'scope_title': 'Každý provoz má své zadání.',
        'scope_lead': 'Řešení pro nové záměry i stávající zařízení. Rozsah připravujeme vlastními kapacitami nebo ve spolupráci s odbornými partnery.',
        'cards': [
            ('building', 'Penziony, hotely a rekreační areály', 'Čistírny odpadních vod pro ubytovací provozy a jejich konkrétní nároky.'),
            ('village', 'Obce a menší sídla', 'Komunální čistírny s návazností na projektovou přípravu a podmínky místa.'),
            ('factory', 'Průmysl a komerční objekty', 'Průmyslové ČOV i řešení odpadních vod pro výrobní areály a komerční budovy.'),
            ('renew', 'Rekonstrukce a intenzifikace', 'Technologické posouzení, modernizace a úpravy stávajících čistíren.'),
            ('water', 'Úprava vod a technologické celky', 'Dodávky souvisejících zařízení a technologií jako součást konkrétního řešení.'),
            ('plan', 'Projekt a odborné poradenství', 'Technické konzultace, příprava projektu a spolupráce s odbornými partnery.'),
        ],
        'process_title': 'Od prvního zadání k navazující péči.',
        'process_note': 'Jednotlivé části společně vymezíme podle rozsahu zakázky.',
        'steps': [
            ('Záměr a provoz', 'Probereme typ objektu, stávající stav a to, co potřebujete řešit.'),
            ('Technické řešení', 'Připravíme návrh, projektové podklady a zapojení potřebných odborností.'),
            ('Technologie', 'Zajistíme domluvený rozsah dodávky, rekonstrukce nebo úpravy zařízení.'),
            ('Provoz a péče', 'Na realizaci mohou navázat zprovoznění, školení obsluhy a servis.'),
        ],
        'projects': [31, 39, 41],
        'faq': [
            ('Řešíte i větší objekty než rodinné domy?', 'Ano. Zajišťujeme také ČOV pro penziony, hotely, rekreační areály, obce, komerční objekty a průmyslové provozy.'),
            ('Lze řešit pouze část technologie nebo stávající ČOV?', 'Ano. Součástí nabídky jsou technologické celky, související zařízení, úprava vod i rekonstrukce a modernizace stávajících čistíren. Konkrétní rozsah vychází z posouzení zadání.'),
            ('Zajišťujete také projektovou přípravu?', 'Ano. Nabízíme projektovou přípravu a technické poradenství. Podle rozsahu využíváme vlastní kapacity a spolupracující odborné partnery.'),
        ],
        'final_title': 'Jaké řešení potřebuje váš provoz?',
        'final_text': 'Napište typ objektu, lokalitu a stručný popis záměru. Společně probereme vhodný další postup.',
    },
    'servis': {
        'eyebrow': 'PÉČE O DOMOVNÍ I VĚTŠÍ ČISTÍRNY',
        'heading': 'Servis a údržba ČOV.',
        'lead': 'Jednorázový zásah i dlouhodobá péče o provoz. Servisujeme čistírny různých výrobců, včetně zařízení, která jsme sami nedodávali.',
        'tags': ['Různí výrobci', 'I od jiných dodavatelů', 'Domácnosti, firmy a obce'],
        'cta': 'Poptat servis', 'cover': 41,
        'cover_note': 'Skutečná realizace · obnova technologie BC 50',
        'scope_title': 'Technologie i biologický proces.',
        'scope_lead': 'Servis patří k našim hlavním činnostem. Vedle menších zařízení se staráme také o větší komerční a průmyslové ČOV.',
        'cards': [
            ('calendar', 'Pravidelný i jednorázový servis', 'Provozní údržba, jednotlivé servisní zásahy a dlouhodobé servisní smlouvy.'),
            ('search', 'Diagnostika a opravy', 'Zjištění příčin poruch a opravy technologických zařízení podle jejich stavu.'),
            ('water', 'Kontrola biologického čištění', 'Kontrola biologických procesů a optimalizace provozních parametrů.'),
            ('parts', 'Výměny komponentů', 'Dmychadla, čerpadla, aerační elementy a další části technologie.'),
            ('factory', 'Komerční a průmyslové ČOV', 'Servis větších zařízení v ubytovacích, komerčních a výrobních provozech.'),
            ('plan', 'Dlouhodobá spolupráce', 'Pravidelné servisní programy a domluvený rozsah péče o vaše zařízení.'),
        ],
        'process_title': 'Začínáme u vašeho zařízení.',
        'process_note': 'Výrobce, typ a popis problému nám pomohou připravit konkrétní servisní poptávku.',
        'steps': [
            ('Popis situace', 'Pošlete výrobce a typ ČOV, lokalitu a informaci o projevech závady nebo požadované údržbě.'),
            ('Posouzení rozsahu', 'Probereme potřebný servis, diagnostiku a návazné práce.'),
            ('Servisní zásah', 'Podle dohodnutého rozsahu provedeme kontrolu, opravu nebo výměnu komponentů.'),
            ('Další péče', 'Domluvíme doporučení k provozu nebo návaznost pravidelné údržby.'),
        ],
        'projects': [41, 39],
        'faq': [
            ('Servisujete ČOV od jiných dodavatelů?', 'Ano. Servisujeme také čistírny, které jsme sami nedodávali, a technologie různých výrobců. Do poptávky uveďte výrobce, typ zařízení a popis požadované služby.'),
            ('Mohu objednat pravidelnou údržbu?', 'Ano. Vedle jednorázového servisu nabízíme pravidelné servisní programy a dlouhodobé servisní smlouvy. Konkrétní rozsah se domlouvá podle zařízení a provozu.'),
            ('Jak se stanoví cena servisu?', 'Cena konkrétní služby se kalkuluje individuálně podle vzdálenosti a složitosti úkonu. Pro nabídku nám popište zařízení, lokalitu a problém nebo požadavek.'),
        ],
        'final_title': 'Potřebuje vaše ČOV servis?',
        'final_text': 'Uveďte výrobce a typ zařízení, místo instalace a stručný popis problému. Pomůže nám to správně vymezit další postup.',
    },
    'zprovozneni': {
        'eyebrow': 'OD INSTALACE K UVEDENÍ DO PROVOZU',
        'heading': 'Odborné zprovoznění ČOV.',
        'lead': 'Zkontrolujeme instalaci a funkci technologie, nastavíme její provoz a zařízení předáme s protokolem o zprovoznění.',
        'tags': ['Kontrola instalace', 'Nastavení technologie', 'Protokol a předání'],
        'cta': 'Poptat zprovoznění', 'cover': 41,
        'cover_note': 'BC 50 · obnova technologie včetně zprovoznění',
        'scope_title': 'Spuštění navazuje na skutečný stav.',
        'scope_lead': 'Zprovozňujeme zařízení z našich dodávek a podle konkrétní technologie také čistírny jiných výrobců.',
        'cards': [
            ('check', 'Instalace a zapojení', 'Kontrola správnosti instalace, technologického propojení a funkčnosti komponentů.'),
            ('settings', 'Řízení a biologický proces', 'Nastavení řídicí jednotky, provozních parametrů a kontrola procesu čištění.'),
            ('document', 'Spuštění a předání', 'Uvedení zařízení do provozu, protokol o zprovoznění a předání zákazníkovi.'),
        ],
        'process_title': 'Co odborné zprovoznění zahrnuje.',
        'process_note': 'Rozsah kontrol a nastavení odpovídá konkrétní technologii.',
        'steps': [
            ('Kontrola instalace', 'Ověření instalace a technologického zapojení zařízení.'),
            ('Kontrola komponentů', 'Prověření funkčnosti jednotlivých částí technologie.'),
            ('Nastavení řízení', 'Nastavení řídicích jednotek a provozních parametrů.'),
            ('Biologický proces', 'Kontrola a nastavení biologického procesu čištění.'),
            ('Uvedení do provozu', 'Spuštění zařízení v rámci domluveného rozsahu.'),
            ('Protokol a předání', 'Vypracování protokolu o zprovoznění a předání zákazníkovi.'),
        ],
        'projects': [41, 39],
        'faq': [
            ('Zprovozníte čistírnu, kterou jsem koupil jinde?', 'Podle konkrétní technologie ano. Službu poskytujeme i u čistíren jiných výrobců. Pošlete nám typ a výrobce zařízení a informace o současném stavu instalace.'),
            ('Co obdržím při předání?', 'Součástí služby je vypracování protokolu o zprovoznění a předání zařízení zákazníkovi.'),
            ('Lze navázat školením obsluhy?', 'Ano. Nabízíme praktické zaškolení přímo na místě instalace, seznámení s technologií i s pravidelnou kontrolou a údržbou. Požadavek uveďte do poptávky.'),
        ],
        'final_title': 'Je vaše čistírna připravená ke spuštění?',
        'final_text': 'Napište výrobce a typ ČOV, místo instalace a její aktuální stav. Probereme možnosti zprovoznění konkrétní technologie.',
    },
    'skoleni': {
        'eyebrow': 'PRO MAJITELE, OBSLUHU A PROVOZOVATELE',
        'heading': 'Rozumět své čistírně. Umět se o ni starat.',
        'lead': 'Praktické školení obsluhy ČOV přímo na místě instalace. Pro soukromé majitele, firmy i obce, které chtějí lépe rozumět provozu svého zařízení.',
        'tags': ['Přímo u vaší ČOV', 'Praktické zaškolení', 'Odborné konzultace'],
        'cta': 'Domluvit školení', 'cover': 41,
        'cover_note': 'Realizace BC 50 · součástí bylo i zaškolení obsluhy',
        'scope_title': 'Od principu čištění po běžnou kontrolu.',
        'scope_lead': 'Školení spojuje vysvětlení technologie s praktickou orientací ve vašem zařízení a jeho provozu.',
        'cards': [
            ('water', 'Jak technologie funguje', 'Princip čištění a úloha jednotlivých částí konkrétní ČOV.'),
            ('calendar', 'Pravidelná kontrola a údržba', 'Co při provozu sledovat a jak přistupovat k běžné péči o zařízení.'),
            ('search', 'Provozní problémy', 'Základní diagnostika poruch a orientace při řešení provozních potíží.'),
            ('settings', 'Správné a hospodárné provozování', 'Doporučení k používání technologie podle vašeho zařízení a jeho provozu.'),
            ('talk', 'Konzultace a podpora', 'Prostor pro konkrétní dotazy a odbornou technickou podporu provozovatele.'),
            ('check', 'Prakticky na místě', 'Zaškolení přímo u instalované technologie pro lidi, kteří ji obsluhují.'),
        ],
        'process_title': 'Školení vychází z vaší technologie.',
        'process_note': 'Témata a rozsah společně upřesníme podle zařízení a potřeb obsluhy.',
        'steps': [
            ('Vaše zařízení', 'Probereme typ ČOV, lokalitu a to, kdo ji bude obsluhovat.'),
            ('Praktické vysvětlení', 'Přímo na místě projdeme princip fungování a jednotlivé části technologie.'),
            ('Každodenní péče', 'Vysvětlíme pravidelné kontroly, údržbu a orientaci v provozních problémech.'),
            ('Vaše otázky', 'Zodpovíme dotazy k provozu a probereme potřebnou navazující podporu.'),
        ],
        'projects': [41],
        'faq': [
            ('Je školení i pro soukromého majitele domovní ČOV?', 'Ano. Školení nabízíme soukromým majitelům i obsluze čistíren ve firmách a obcích.'),
            ('Probíhá školení přímo u zařízení?', 'Ano. Nabízíme praktické zaškolení přímo na místě instalace, aby bylo možné vše vztáhnout ke konkrétní technologii.'),
            ('Můžeme probrat konkrétní potíže v provozu?', 'Ano. Součástí nabídky je základní diagnostika provozních problémů, odborné konzultace a technická podpora. Při poptávce nám své otázky stručně popište.'),
        ],
        'final_title': 'Projděme společně provoz vaší ČOV.',
        'final_text': 'Napište typ zařízení, místo instalace a témata, která potřebujete s obsluhou probrat.',
    },
    'rekonstrukce': {
        'eyebrow': 'NEJDŘÍVE POZNAT STAV ZAŘÍZENÍ',
        'heading': 'Nové možnosti pro stávající ČOV.',
        'lead': 'Posoudíme technologii a navrhneme smysluplný rozsah obnovy. Řešením může být výměna komponentů, doplnění zařízení, modernizace nebo úprava provozu.',
        'tags': ['Technologické posouzení', 'Modernizace', 'Intenzifikace'],
        'cta': 'Probrat rekonstrukci', 'cover': 41,
        'cover_note': 'BC 50 · obnova technologie při zachování konstrukce',
        'scope_title': 'Vycházíme z toho, co už máte.',
        'scope_lead': 'Ne každý zákazník potřebuje novou čistírnu. Nejprve posoudíme stávající řešení a jeho technické možnosti.',
        'cards': [
            ('search', 'Technologické posouzení', 'Zjištění stavu současné ČOV a částí, které vyžadují pozornost.'),
            ('plan', 'Návrh modernizace', 'Vymezení vhodných úprav a návazností podle konkrétního zařízení.'),
            ('parts', 'Výměny a doplnění', 'Obnova technologického vybavení a souvisejících komponentů.'),
            ('settings', 'Optimalizace a intenzifikace', 'Možnosti změn provozu nebo intenzifikace se posuzují podle konkrétní ČOV.'),
        ],
        'process_title': 'Nejprve posouzení. Potom návrh.',
        'process_note': 'Rozsah rekonstrukce i dosažitelné parametry závisejí na skutečném stavu zařízení a podmínkách provozu.',
        'steps': [
            ('Stávající stav', 'Probereme současnou technologii, její provoz a důvod plánované změny.'),
            ('Možnosti obnovy', 'Posoudíme úpravy, doplnění, výměny zařízení a možnosti modernizace.'),
            ('Konkrétní rozsah', 'Navrhneme technické řešení odpovídající zjištěnému stavu.'),
            ('Realizace a provoz', 'Na dohodnuté práce mohou navázat zprovoznění, školení obsluhy a servis.'),
        ],
        'projects': [41, 31, 39],
        'faq': [
            ('Musí se starší ČOV vždy kompletně vyměnit?', 'Ne vždy. V některých případech lze zachovat část zařízení a obnovit technologii. O vhodném postupu rozhoduje technický stav a potřeby provozu.'),
            ('Co může rekonstrukce zahrnovat?', 'Technologické posouzení, návrh modernizace, výměnu nebo doplnění zařízení, optimalizaci provozu a podle možností i intenzifikaci stávající čistírny.'),
            ('Lze předem určit nové provozní parametry?', 'Konkrétní parametry je potřeba posoudit podle stavu zařízení, navržené technologie a podmínek provozu. Samotná rekonstrukce proto neznamená automaticky navýšení kapacity nebo jiné předem dané parametry.'),
        ],
        'final_title': 'Jakou budoucnost má vaše čistírna?',
        'final_text': 'Popište stávající zařízení, lokalitu a důvod plánované změny. Společně probereme vhodný rozsah posouzení.',
    },
}

_QUOTE = (
    'Vynikající servis – doporučuji na 100 %!',
    'Měli jsme problémy se zápachem z naší septiky, a proto jsme se obrátili na servis. Díky rychlému, profesionálnímu a bezproblémovému přístupu nyní vše opět funguje perfektně.',
    'Náš servisní technik je vždy ochotný, kdykoliv nám poradí a pomůže. Navíc mluví plynně anglicky, což je pro mě velké plus!',
    'Moc děkujeme za skvělou péči. Rozhodně doporučuji!',
)


def _icon(kind='arrow'):
    # Two-tone icons: main shape in the ink colour, one detail in the logo green
    # (classes ico-n / ico-g are styled in dist/polish.css).
    paths = {
        'arrow': ('M4 12h16m-6-6 6 6-6 6', ''),
        'building': ('M5 21V3h14v18M3 21h18M10 21v-6h4v6', 'M9 7h1m4 0h1M9 11h1m4 0h1'),
        'village': ('m2 12 5-5 5 5M4 11v9h6v-9m2-4 5-5 5 5M14 6v14h6V6', 'M7 15v2m10-8v2m0 4v2'),
        'factory': ('M3 21V10l6-4v5l6-5v6h6v9H3M18 12V3h3v9', 'M7 16v1m4-1v1m5-1v1'),
        'renew': ('M20 11a8 8 0 0 0-14.3-4.3L3.5 9m0-5v5h5', 'M4 13a8 8 0 0 0 14.3 4.3l2.2-2.3m0 5v-5h-5'),
        'water': ('M12 3c-3.2 4.2-6 7.2-6 10.8a6 6 0 0 0 12 0C18 10.2 15.2 7.2 12 3Z', 'M9.4 14.3a2.7 2.7 0 0 0 2.5 2.6'),
        'plan': ('M4 3h11l5 5v13H4V3Zm11 0v5h5', 'M8 12h8M8 16h5'),
        'calendar': ('M4 5h16v16H4V5ZM8 3v4m8-4v4M4 10h16', 'M8 14h2m4 0h2m-8 4h2'),
        'search': ('M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6', 'M7 10h6'),
        'parts': ('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9Z', 'm15.5 18.5 1.8 1.8 3.7-3.8'),
        'settings': ('M4 6h16M4 12h16M4 18h16', 'M8 3v6m8 0v6M9 15v6'),
        'document': ('M5 3h10l4 4v14H5V3Zm10 0v5h4', 'M9 14l2 2 4-4'),
        'check': ('M12 3 3 7v6c0 4 5 7 9 9 4-2 9-5 9-9V7l-9-4Z', 'M8 12l3 3 5-6'),
        'talk': ('M3 4h18v13H9l-6 4V4Z', 'M7 9h10M7 13h6'),
    }
    main, accent = paths[kind]
    detail = f'<path class="ico-g" d="{accent}"/>' if accent else ''
    return f'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ico-n" d="{main}"/>{detail}</svg>'


def _find_project(number, ctx):
    return next((p for p in ctx['refs'] if p['local'].startswith(f'realizace/{number}-')), None)


def _photo(number, current, ctx, *, priority=False):
    p = _find_project(number, ctx)
    if not p:
        return ''
    source = p.get('thumbnail')
    if source not in ctx['ASSETS']:
        source = next((u for u in p.get('images', []) if u in ctx['ASSETS']), None)
    if not source:
        return ''
    a = ctx['ASSETS'][source]
    url = ctx['asset_url'](source, current)
    loading = 'fetchpriority="high"' if priority else 'loading="lazy"'
    alt = 'Fotografie skutečné realizace: ' + _PROJECTS[number][0]
    return f'<img src="{ctx["esc"](url)}" width="{a.get("width", 1200)}" height="{a.get("height", 900)}" alt="{ctx["esc"](alt)}" {loading} decoding="async">'


def _section_heading(eyebrow, title, text, esc):
    return f'<div class="ext-section-heading" data-reveal><div><p class="eyebrow">{esc(eyebrow)}</p><h2>{esc(title)}</h2></div><p>{esc(text)}</p></div>'


def _projects(numbers, current, ctx):
    esc, rel = ctx['esc'], ctx['rel']
    cards = ''
    for n in numbers:
        p = _find_project(n, ctx)
        if not p:
            continue
        title, text, label = _PROJECTS[n]
        cards += f'''<article class="ext-project" data-reveal><a class="ext-project-picture" href="{rel(p['local'], current)}">{_photo(n, current, ctx)}<span>{_icon()}</span></a><p class="ext-project-label">{esc(label)}</p><h3><a href="{rel(p['local'], current)}">{esc(title)}</a></h3><p>{esc(text)}</p><a class="ext-text-link" href="{rel(p['local'], current)}">Příběh skutečné realizace {_icon()}</a></article>'''
    return f'''<section class="ext-section ext-projects container" id="ext-realizace">{_section_heading('Z NAŠICH REALIZACÍ', 'Konkrétní zařízení. Skutečná práce.', 'Prohlédněte si související zakázky a rozsah prací u každé z nich.', esc)}<div class="ext-project-grid ext-project-grid--{len(numbers)}">{cards}</div></section>'''


def _service_proof(esc):
    quote = ''.join(f'<p>{esc(p)}</p>' for p in _QUOTE)
    return f'''<section class="ext-section container" id="ext-servis-zkusenosti"><div class="ext-service-proof"><div class="ext-service-jobs" data-reveal><p class="eyebrow">SERVIS V KONKRÉTNÍCH PROVOZECH</p><h2>Od penzionu po výrobní firmu.</h2><div class="ext-job"><div><h3>Penzion Hamr</h3><p>Dívčí Kámen</p></div><div class="ext-job-capacity"><strong>30 <small>EO</small></strong><span>Servis ČOV</span></div></div><div class="ext-job"><div><h3>Pont Aurel Automotive</h3><p>Chotoviny</p></div><div class="ext-job-capacity"><strong>15 <small>EO</small></strong><span>Servis ČOV</span></div></div></div><figure class="ext-testimonial" data-reveal><span class="ext-quote-mark" aria-hidden="true">“</span><p class="eyebrow">ZKUŠENOST ZÁKAZNÍKA</p><blockquote>{quote}</blockquote><figcaption><strong>Max Knauer</strong><span>Servis domovní ČOV ASIO · Písek</span></figcaption></figure></div></section>'''


def _special(mode, current, ctx):
    esc, rel = ctx['esc'], ctx['rel']
    if mode == 'servis':
        return _service_proof(esc)
    if mode == 'skoleni':
        people = [('Soukromí majitelé', 'Orientace v provozu vlastní domovní čistírny.'), ('Firmy a provozovny', 'Praktické zaškolení lidí, kteří se o technologii starají.'), ('Obce', 'Odborné školení obsluhy komunální technologie.')]
        cards = ''.join(f'<article><span>{i:02d}</span><h3>{esc(t)}</h3><p>{esc(p)}</p></article>' for i, (t, p) in enumerate(people, 1))
        return f'<section class="ext-audience container" aria-labelledby="ext-audience-title"><div><p class="eyebrow">KOMU JE ŠKOLENÍ URČENO</p><h2 id="ext-audience-title">Lidem, kteří mají provoz na starosti.</h2></div><div class="ext-audience-grid">{cards}</div></section>'
    if mode == 'rekonstrukce':
        p = _find_project(41, ctx)
        link = f'<a class="ext-text-link" href="{rel(p["local"],current)}">Celý příběh obnovy BC 50 {_icon()}</a>' if p else ''
        return f'''<section class="ext-decision container" data-reveal><div><p class="eyebrow">PŘÍKLAD Z PRAXE</p><h2>BC 50 po přibližně 25 letech provozu.</h2><p>U této realizace se zachovala původní konstrukce a obnovilo technologické vybavení. Stáří zařízení bylo výchozím bodem pro posouzení jeho skutečného stavu.</p>{link}</div><dl><div><dt>Zachovaná část</dt><dd>Původní konstrukce ČOV</dd></div><div><dt>Obnova technologie</dt><dd>Aerace, vzduchové rozvody, řízení a dmychadlo</dd></div><div><dt>Navazující práce</dt><dd>Funkční zkoušky, zprovoznění a zaškolení obsluhy</dd></div></dl></section>'''
    if mode == 'cov_firmy':
        return f'''<section class="ext-partner-note container" data-reveal><span class="ext-note-icon">{_icon('plan')}</span><div><p class="eyebrow">ODBORNOSTI, KTERÉ NA SEBE NAVAZUJÍ</p><h2>Projekt, technologie i související zařízení.</h2><p>Zakázky zajišťujeme vlastními kapacitami nebo společně s odbornými partnery. Rozsah spolupráce připravujeme podle konkrétního vodohospodářského zadání.</p></div><a class="ext-text-link" href="{rel('sluzby/zpracovani-projektove-dokumentace.html', current)}">Projektová příprava {_icon()}</a></section>'''
    return f'''<section class="ext-partner-note container" data-reveal><span class="ext-note-icon">{_icon('document')}</span><div><p class="eyebrow">PŘEDÁNÍ ZAŘÍZENÍ</p><h2>Protokol. A srozumitelná návaznost.</h2><p>Součástí zprovoznění je protokol a předání zákazníkovi. Pokud potřebujete také praktické zaškolení obsluhy, domluvíme jeho rozsah společně.</p></div><a class="ext-text-link" href="{rel('sluzby/skoleni-obsluhy-cov.html', current)}">Školení obsluhy {_icon()}</a></section>'''


def _programs(current, ctx):
    """Regular service programmes from the client brief of 2026-11-13. No prices are published."""
    rel = ctx['rel']
    check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L20 5"/></svg>'
    def card(name, key, visits, items, extra=''):
        href = rel('index.html', current) + f'?reseni=pravidelny_servis&program={key}#poptavka'
        points = ''.join(f'<li>{check}{item}</li>' for item in items)
        return (f'<article class="program-card{extra}"><p class="program-name">{name}</p><p class="program-visits"><strong>{visits}</strong>'
                f'<span>plánované servisní<br>návštěvy ročně</span></p><ul>{points}</ul><a class="button" href="{href}">Nezávazně poptat servis {_icon()}</a></article>')
    return ('<section class="ext-programs" id="ext-programy"><div class="container"><div class="program-intro"><div><p class="eyebrow">PRAVIDELNÝ SERVIS ČOV</p>'
            '<h2>Vaše čistírna.<br>Naše starost.</h2></div><p>Dva servisní programy podle toho, kolik péče vaše čistírna potřebuje. '
            'Servisujeme technologie různých výrobců, nejen zařízení, která jsme sami dodali.</p></div><div class="program-grid">'
            + card('STANDARD', 'standard', '2', ['Pravidelná kontrola technologie', 'Základní údržba a vyhodnocení provozu', 'Doporučení k zajištění správného fungování ČOV'])
            + card('PREMIUM', 'premium', '4', ['Rozšířená pravidelná servisní péče', 'Kontrola technologických komponentů', 'Preventivní údržba a vyhodnocování provozu'], ' program-card--premium')
            + '</div><p class="program-note">Každou nabídku připravíme individuálně podle výrobce, typu a velikosti ČOV, technického stavu zařízení, '
            'lokality a požadovaného rozsahu služeb.</p></div></section>')


def render_extension(current, ctx):
    """Return body HTML for a known extension route; raise KeyError otherwise."""
    if isinstance(current, dict):
        current = current['local']
    meta = EXTENSION_PAGES[current]
    mode = meta['mode']
    copy = _COPY[mode]
    esc, rel = ctx['esc'], ctx['rel']
    inquiry = rel('index.html', current) + '?reseni=' + mode + '#poptavka'
    cover_project = _find_project(copy['cover'], ctx)
    cover_href = rel(cover_project['local'], current) if cover_project else rel('reference.html', current)
    tags = ''.join(f'<span>{esc(tag)}</span>' for tag in copy['tags'])
    body = f'''<div class="ext-page ext-page--{mode}"><section class="ext-hero"><div class="container"><div class="ext-breadcrumbs" aria-label="Drobečková navigace"><a href="{rel('index.html',current)}">Úvod</a><span aria-hidden="true">/</span><a href="{rel('sluzby.html',current)}">Naše řešení</a><span aria-hidden="true">/</span><span aria-current="page">{esc(meta['title'])}</span></div><div class="ext-hero-grid"><div class="ext-hero-copy" data-reveal><p class="eyebrow">{esc(copy['eyebrow'])}</p><h1>{esc(copy['heading'])}</h1><p class="ext-lead">{esc(copy['lead'])}</p><div class="ext-tags">{tags}</div><div class="ext-hero-actions"><a class="button" href="{inquiry}">{esc(copy['cta'])} {_icon()}</a><a class="ext-text-link" href="#ext-rozsah">Co služba zahrnuje <span aria-hidden="true">↓</span></a></div></div><figure class="ext-hero-figure" data-reveal><a href="{cover_href}" aria-label="Prohlédnout skutečnou realizaci: {esc(_PROJECTS[copy['cover']][0])}">{_photo(copy['cover'],current,ctx,priority=True)}<span class="ext-photo-badge">Z naší realizace {_icon()}</span></a><figcaption>{esc(copy['cover_note'])}</figcaption></figure></div></div></section><div class="ext-jumpbar"><div class="container ext-jumplinks" role="navigation" aria-label="Na této stránce"><a href="#ext-rozsah">Rozsah služby</a><a href="#ext-postup">Jak postupujeme</a><a href="#ext-realizace">Související realizace</a><a href="#ext-otazky">Časté otázky</a><a href="{inquiry}">{esc(copy['cta'])} {_icon()}</a></div></div>'''
    cards = ''.join(f'<article class="ext-scope-card" data-reveal><span class="ext-card-icon">{_icon(icon)}</span><h3>{esc(title)}</h3><p>{esc(text)}</p></article>' for icon, title, text in copy['cards'])
    body += f'''<section class="ext-section container" id="ext-rozsah">{_section_heading('CO PRO VÁS ZAJISTÍME', copy['scope_title'], copy['scope_lead'], esc)}<div class="ext-scope-grid ext-scope-grid--{len(copy['cards'])}">{cards}</div></section>'''
    if mode == 'servis':
        body += _programs(current, ctx)
    body += _special(mode, current, ctx)
    steps = ''.join(f'<li data-reveal><span class="ext-step-number">{i:02d}</span><h3>{esc(title)}</h3><p>{esc(text)}</p></li>' for i, (title, text) in enumerate(copy['steps'], 1))
    body += f'''<section class="ext-process" id="ext-postup"><div class="container">{_section_heading('JASNÁ NÁVAZNOST JEDNOTLIVÝCH KROKŮ', copy['process_title'], copy['process_note'], esc)}<ol class="ext-process-grid ext-process-grid--{len(copy['steps'])}">{steps}</ol></div></section>'''
    body += _projects(copy['projects'], current, ctx)
    faqs = ''.join(f'<details class="ext-faq-item"><summary><span>{esc(question)}</span><span class="ext-faq-toggle" aria-hidden="true">+</span></summary><div><p>{esc(answer)}</p></div></details>' for question, answer in copy['faq'])
    body += f'''<section class="ext-faq-section" id="ext-otazky"><div class="container ext-faq-layout"><div data-reveal><p class="eyebrow">PŘED PRVNÍM KONTAKTEM</p><h2>Co vás může zajímat.</h2><p>Máte konkrétní zařízení nebo zadání? Probereme ho společně.</p><a class="ext-text-link" href="tel:+420736403795">736 403 795 {_icon()}</a></div><div class="ext-faq-list">{faqs}</div></div></section>'''
    if mode == 'servis':
        original = next((p for p in ctx['services'] if p['local'] == current), None)
        if original:
            body += f'''<section class="ext-source-section container"><details class="ext-source-details"><summary><span>Další informace o údržbě a servisovatelnosti</span><span class="ext-faq-toggle" aria-hidden="true">+</span></summary><div class="article-copy">{ctx['clean_body'](original)}</div></details></section>'''
    body += f'''<section class="ext-final-cta container" data-reveal><div><p class="eyebrow">POJĎME PROBRAT VAŠE ZADÁNÍ</p><h2>{esc(copy['final_title'])}</h2><p>{esc(copy['final_text'])}</p></div><div class="ext-final-actions"><a class="button" href="{inquiry}">{esc(copy['cta'])} {_icon()}</a><a class="ext-text-link" href="tel:+420736403795">736 403 795</a></div></section><section class="ext-related-services container" aria-labelledby="ext-related-title"><h2 id="ext-related-title">Související služby</h2><div>'''
    related_modes = {
        'cov_firmy': ['servis', 'rekonstrukce', 'zprovozneni'],
        'servis': ['rekonstrukce', 'zprovozneni', 'skoleni'],
        'zprovozneni': ['skoleni', 'servis', 'rekonstrukce'],
        'skoleni': ['zprovozneni', 'servis', 'cov_firmy'],
        'rekonstrukce': ['servis', 'zprovozneni', 'cov_firmy'],
    }
    for path, other in EXTENSION_PAGES.items():
        if other['mode'] in related_modes[mode]:
            body += f'<a href="{rel(path,current)}"><span>{esc(other["title"])}</span>{_icon()}</a>'
    return body + '</div></section></div>'
