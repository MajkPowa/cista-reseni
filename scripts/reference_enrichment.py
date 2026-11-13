"""Audited presentation metadata for the 41 migrated reference articles.

Pure API: enrich_references(refs) returns deep copies in input order. It never
reads/writes the filesystem and never changes frozen source text, categories,
images, dates or URLs. Call it before rendering cards and detail pages.

project_facts is a list of (label, value) tuples. Missing capacity is omitted,
never derived from a model number. Only IDs 4, 11 and 31 state population/EO
capacity. Their original units are retained. Volumes describe storage tanks,
not the capacity of a wastewater treatment plant.

Audit source: docs/source-inventory/content.json, reviewed 2026-11-08.
Technology may be explicit in the article title (IDs 28 and 30); no model is
inferred from filenames. Planned work is excluded from completed scope.
"""
from copy import deepcopy
import re


DISPLAY_CATEGORY_LABELS = {
    'cov': 'Domovní čistírny odpadních vod',
    'commercial': 'Firemní a průmyslové ČOV',
    'servis': 'Servisní zásahy',
    'rekonstrukce': 'Rekonstrukce a modernizace',
    'destovka': 'Hospodaření s dešťovou vodou',
    'upravny': 'Úpravny vody',
    'cerpani': 'Čerpací technika',
    'ostatni': 'Další vodohospodářská řešení',
}

# Short labels for filters, cards and the administration (client brief 2026-11-12).
# Keep in sync with the default list in dist/cms-config.js.
CATEGORY_LABELS = {
    'cov': 'Domovní čistírny odpadních vod',
    'commercial': 'Firemní a průmyslové ČOV',
    'rekonstrukce': 'Rekonstrukce a intenzifikace ČOV',
    'upravny': 'Úpravny pitné a technologické vody',
    'destovka': 'Hospodaření s dešťovou vodou',
    'cerpani': 'Čerpací stanice a související technologie',
    'servis': 'Servisní zásahy',
    'ostatni': 'Další řešení',
}

# ID: (display categories, explicitly named technology, verified completed scope)
_AUDIT = {
    1: (('servis',), 'Čistírny ASIO včetně starších typů',
        'Servisní prohlídky, opravy, výměny komponentů, nastavení provozu a zaškolení obsluhy.'),
    2: (('rekonstrukce', 'cov'), 'BC 4 PP',
        'Rekonstrukce vnitřní technologie při zachování nádrže, výměna řízení a opětovné zprovoznění.'),
    3: (('cov',), 'BC 6 EXCLUSIVE UV',
        'Dodávka a odborné zprovoznění domovní čistírny s terciárním filtrem a UV lampou.'),
    4: (('cov',), 'biocleaner BC 4',
        'Instalace na klíč včetně zemních prací, potrubí a kanalizační přípojky.'),
    5: (('servis', 'cov'), 'BC 4 BASIC',
        'Oprava deformované nádrže po chybné instalaci a zpětná montáž vnitřní technologie.'),
    6: (('cov', 'cerpani'), 'BC 6 COMFORT a domovní čerpací jímka',
        'Dodávka a zprovoznění ČOV doplněné čerpáním do veřejné kanalizace.'),
    7: (('cov',), 'BC 4 OPTIMA a akumulační nádrž na vyčištěnou vodu',
        'Instalace ČOV s akumulací vyčištěné vody pro další využití na pozemku.'),
    8: (('cov',), 'BC 4 OPTIMA',
        'Konzultace výběru technologie, instalace a zprovoznění domovní ČOV.'),
    9: (('cov',), 'BC 4 BASIC a akumulační nádrž',
        'Projektová dokumentace a zprovoznění systému; výkopové práce provedl investor.'),
    10: (('cov',), 'BC 4 OPTIMA',
         'Instalace a zprovoznění domovní ČOV v prostoru původní jímky.'),
    11: (('cov',), 'biocleaner BC 4 BASIC',
         'Dodávka ČOV a akumulační nádrže na vyčištěnou vodu s návazným vsakováním.'),
    12: (('destovka',), 'Roterra 3500 L a EASY E-DEEP 900 X-RING',
         'Návrh nádrže, čerpání s plovoucím sáním a příprava využití dešťové vody pro zahradu.'),
    13: (('cerpani', 'rekonstrukce'), 'AmaPorter S 545 ND',
         'Přestavba nádrže původní ČOV na čerpací jímku, montáž čerpadla a elektrického rozvaděče.'),
    14: (('destovka',), 'Elkoplast FLAT 3000 L',
         'Výběr nádrže, ruční výkopy, usazení a připojení bezpečnostního přelivu.'),
    15: (('cov', 'cerpani'), 'BC 4 BASIC a čerpací šachta',
         'Dodávka a instalace ČOV do komory stávajícího septiku v omezeném prostoru.'),
    16: (('cov',), 'BC 4 PP COMFORT a akumulační nádrž Roterra',
         'Realizace čištění odpadních vod s akumulací vyčištěné vody a bezpečnostním přelivem do vsaku.'),
    17: (('cov',), 'BC 4 OPTIMA a filtrační šachta',
         'Instalace a zprovoznění ČOV s filtrační šachtou před vsakovacím objektem.'),
    18: (('cov',), 'BC 4 PP OPTIMA',
         'Náhrada původní žumpy domovní ČOV a osazení technologie do stávajícího prostoru.'),
    19: (('destovka',), 'Roterra 10 000 litrů',
         'Dodávka nádrže a příslušenství a vyřízení dotace; realizaci provedl objednatel.'),
    20: (('destovka',), 'Robox 5000 L, EASY E-DEEP 1200 X-RING a AP Triplex',
         'Realizace využití dešťové vody pro zahradu, splachování a praní včetně čerpání a filtrace.'),
    21: (('cov',), 'BC 4 OPTIMA',
         'Realizace domovní ČOV v omezeném prostoru s odtokem do obecní kanalizace.'),
    22: (('rekonstrukce', 'ostatni'), 'Rotomouldingová nádrž ROTO',
         'Vyčištění původní jímky, oprava nátoku a osazení nové nádrže na splaškové vody.'),
    23: (('cov',), 'BioCleaner BC 6 OPTIMA',
         'Zemní práce, usazení technologie, potrubní napojení a zprovoznění ČOV.'),
    24: (('cov',), 'BioCleaner BC 4 OPTIMA',
         'Dodávka na klíč včetně výkopů, osazení ČOV, potrubí a zprovoznění.'),
    25: (('cov',), 'BioCleaner BC 4 OPTIMA',
         'Dodávka na klíč, zemní práce, usazení čistírny, kanalizační napojení a zprovoznění.'),
    26: (('servis', 'cov'), 'ASIO AS-MONOcomp 4',
         'Kontrola a oprava chybného zapojení, doplnění koše na kal a opětovné zprovoznění.'),
    27: (('servis', 'cov'), 'BC 12',
         'Vyčištění, kontrola, oprava a znovuzprovoznění ČOV po poškození záplavami.'),
    28: (('servis', 'cov'), 'ASIO AS-VARIOcomp 5k',
         'Kompletní vyčištění včetně primární části, sedimentační zkoušky, technická kontrola a zaškolení.'),
    29: (('cov',), 'ASIO AS-MONOcomp 4',
         'Montáž, napojení na kanalizaci, uvedení do provozu a zaškolení obsluhy.'),
    30: (('cov',), 'BC 4 OPTIMA s akumulační nádrží',
         'Dodávka ČOV, šéfmontáž, zprovoznění, dokumentace a zaškolení; stavební část zajistil investor.'),
    31: (('commercial', 'rekonstrukce'), 'BC 20 COMFORT',
         'Výměna ČOV penzionu po 28 letech, úpravy nátoku a odtoku a doplnění potrubních rozvodů.'),
    32: (('cov', 'cerpani'), 'BC 6 OPTIMA, ASIO REVO a ASIO KRECHT',
         'Společná kanalizace pro dva rodinné domy, čerpání, čištění a zabezpečené vsakování.'),
    33: (('cov', 'destovka', 'cerpani'), 'ASIO MONOCOMP 4 PB, ASIO REVO a ASIO KRECHT',
         'Provázané řešení ČOV, dešťové vody, akumulace a aktivního odčerpávání při vysoké spodní vodě.'),
    34: (('cov', 'destovka', 'ostatni'), 'AS-ANASEP, AS-ZEON a AS-REWA COMBI',
         'Čištění odpadních vod při nepravidelném provozu a využití dešťové vody pro toalety a zahradu.'),
    35: (('commercial',), 'BC 10 SBR a AQUAVISOR',
         'Zprovoznění ČOV mateřské školky se vzdálenou správou a monitoringem.'),
    36: (('upravny',), 'Mechanická filtrace a potrubní UV lampa',
         'Návrh úpravy podzemní vody pro snížení železa a odstranění mikrobiologického znečištění.'),
    37: (('cov',), 'BC 4 SBR II. generace',
         'Dodávka, montáž, obetonování nádrží, zprovoznění a zaškolení včetně využití vyčištěné vody.'),
    38: (('cov',), 'BC 4 COMFORT DUO s pískovým filtrem',
         'Dodávka a instalace domovní ČOV s primární usazovací nádrží, revizní šachtou a dočištěním.'),
    39: (('commercial', 'cerpani', 'rekonstrukce'), 'Čerpací jímka splaškových vod a uklidňovací šachta',
         'Kamerové zkoušky, zemní práce a přestavba původní ČOV výrobního areálu na čerpání do kanalizace.'),
    40: (('servis', 'cov'), 'ASIO VARIOcomp 5K',
         'Diagnostika, oprava technologického zapojení, stabilizace biologie a sedimentační zkoušky.'),
    41: (('rekonstrukce',), 'BC 50, řídicí jednotka COMFORT a dmychadlo FPZ 20',
         'Obnova technologického a elektrického vybavení, funkční zkoušky, zprovoznění a zaškolení obsluhy.'),
}

_CAPACITIES = {
    4: ('4 EO', 'Pro rodinný dům s kapacitou 4 EO'),
    11: ('1–4 obyvatelé', 'vhodná pro 1-4 obyvatele v domácnosti'),
    31: ('Až 20 osob', 'navržená pro až 20 osob'),
}
_EXTRA_FACTS = {
    7: (('Akumulace vyčištěné vody', '2,0 m³'),),
    9: (('Akumulace vyčištěné vody', '2,0 m³'),),
    11: (('Akumulace vyčištěné vody', '2,0 m³'),),
    12: (('Objem dešťové nádrže', '3,5 m³'),),
    16: (('Akumulace vyčištěné vody', '2 200 litrů'),),
    19: (('Objem dešťové nádrže', '10 000 litrů'),),
    22: (('Objem splaškové jímky', '3,5 m³'),),
    31: (('Typ objektu', 'Penzion'),),
    35: (('Typ objektu', 'Mateřská školka'),),
    37: (('Akumulace vyčištěné vody', '5 m³'),),
    39: (('Typ objektu', 'Výrobní areál – kovoobrábění'),),
}


def enrich_references(refs):
    """Return copied reference records with audited display metadata.

    Unrecognised records retain their original categories and receive no
    invented project facts. Callers can render compact_scope only when nonempty.
    A known capacity is emitted only while its evidence remains in body_text.
    """
    enriched = []
    for original in refs:
        item = deepcopy(original)
        match = re.search(r'(?:^|/)realizace/(\d+)-', item.get('local', ''))
        reference_id = int(match.group(1)) if match else None
        audit = _AUDIT.get(reference_id)
        if audit:
            categories, technology, scope = audit
            facts = [('Technologie', technology)]
            capacity = _CAPACITIES.get(reference_id)
            if capacity and capacity[1] in re.sub(r'\s+', ' ', item.get('body_text', '')):
                facts.append(('Kapacita', capacity[0]))
            facts.extend(_EXTRA_FACTS.get(reference_id, ()))
            facts.append(('Rozsah prací', scope))
            item.update(display_categories=list(categories), project_facts=facts, compact_scope=scope)
        else:
            item.update(display_categories=list(item.get('categories', [])), project_facts=[], compact_scope='')
        enriched.append(item)
    return enriched
