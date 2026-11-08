"""Shared public navigation and company identity, confirmed on 2026-11-08."""
from html import escape

COMPANY = {
    'name': 'WHITE ELEPHANT s.r.o.',
    'street': 'Kpt. Jaroše 24',
    'city': 'Klokoty, 390 03 Tábor',
    'address': 'Kpt. Jaroše 24, Klokoty, 390 03 Tábor',
    'ico': '06245676', 'dic': 'CZ06245676',
    'registry': 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/06245676',
    'confirmed': '2026-11-08',
}

def render_header(current, rel, icon):
    def link(path, title, extra=''):
        active = ' aria-current="page"' if current == path else ''
        return f'<a href="{escape(rel(path,current))}"{active}{extra}>{title}</a>'

    solutions = [('sluzby/cisteni-odpadnich-vod.html','Domovní ČOV'),
                 ('sluzby/cov-pro-firmy-a-obce.html','ČOV pro firmy a obce'),
                 ('sluzby/hospodareni-s-destovou-vodou.html','Dešťová voda'),
                 ('sluzby/cerpaci-sachty.html','Čerpací technika'),
                 ('sluzby/rekonstrukce-a-modernizace-cov.html','Rekonstrukce a modernizace'),
                 ('sluzby.html','Všechna řešení a služby')]
    operations = [('sluzby/zprovozneni-cov.html','Zprovoznění ČOV'),
                  ('sluzby/skoleni-obsluhy-cov.html','Školení obsluhy ČOV')]
    def group(title, items, ident):
        return f'<details class="nav-group"><summary aria-controls="{ident}">{title}<span aria-hidden="true">⌄</span></summary><div class="nav-dropdown" id="{ident}">'+''.join(link(path,label) for path,label in items)+'</div></details>'
    return f'''<a class="skip-link" href="#main">Přejít na obsah</a><div class="preview-bar"><span><i></i> Návrh nového webu</span><a href="https://www.cistareseni.cz/" target="_blank" rel="noopener">Současný web {icon()}</a></div><header class="header"><div class="container header-inner"><a class="brand" href="{rel('index.html',current)}" aria-label="Čistá řešení — úvod"><img src="{rel('assets/brand-symbol.svg',current)}" width="43" height="46" alt=""><span>Čistá řešení<small>by White Elephant</small></span></a><button class="menu-toggle" aria-label="Otevřít nabídku" aria-expanded="false" aria-controls="navigation"><span></span><span></span></button><nav id="navigation" class="site-nav" aria-label="Hlavní navigace">{group('Řešení',solutions,'nav-solutions')}{link('sluzby/servis-a-udrzba.html','Servis ČOV')}{group('Zprovoznění a školení',operations,'nav-operations')}{link('reference.html','Realizace')}{link('o-nas.html','O nás')}{link('kontakt.html','Kontakt')}{link('index.html#poptavka','Poptat řešení '+icon(),' class="button button-small"')}</nav></div></header>'''

def render_footer(current, rel):
    items = [('sluzby.html','Všechna řešení'),('sluzby/cov-pro-firmy-a-obce.html','Firmy a obce'),
             ('sluzby/servis-a-udrzba.html','Servis ČOV'),('sluzby/zprovozneni-cov.html','Zprovoznění'),
             ('sluzby/skoleni-obsluhy-cov.html','Školení obsluhy'),('reference.html','Realizace'),
             ('galerie.html','Galerie'),('dokumenty.html','Ke stažení'),('o-nas.html','O nás'),('kontakt.html','Kontakt')]
    links = ''.join(f'<a href="{rel(path,current)}">{title}</a>' for path,title in items)
    year = '<span id="year">2026</span>' if current == 'index.html' else '2026'
    return f'''<footer class="footer container"><div class="footer-links">{links}</div><div class="footer-top"><a class="brand" href="{rel('index.html',current)}"><img src="{rel('assets/brand-symbol.svg',current)}" width="43" height="46" alt=""><span>Čistá řešení<small>by White Elephant</small></span></a><p>{COMPANY['street']}, {COMPANY['city']}<br><a href="tel:+420736403795">+420 736 403 795</a> · <a href="mailto:info@cistareseni.cz">info@cistareseni.cz</a></p></div><div class="footer-bottom"><span>© {year} {COMPANY['name']}</span><span>IČ {COMPANY['ico']} · DIČ {COMPANY['dic']}</span><span>Návrh webu · Poptávka se neodesílá automaticky</span></div></footer>'''
