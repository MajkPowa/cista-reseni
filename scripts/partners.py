"""Technology and business partners requested by the client on 2026-11-12.

Pure renderer shared by the homepage and the About page. Logos live in
dist/assets/partners/ (committed; not part of the restored source media).
Only names and links are shown: no claims about the partners are invented.
"""

PARTNERS = [
    {'name': 'ASIO', 'url': 'https://www.asio.cz/', 'domain': 'asio.cz', 'logo': 'assets/partners/asio.svg', 'width': 102, 'height': 40},
    {'name': 'ENVI-PUR', 'url': 'https://www.envi-pur.cz/', 'domain': 'envi-pur.cz', 'logo': 'assets/partners/envi-pur.svg', 'width': 155, 'height': 32},
    {'name': 'EKOCIS', 'url': 'https://ekocis.cz/', 'domain': 'ekocis.cz', 'logo': 'assets/partners/ekocis.png', 'width': 179, 'height': 88},
    {'name': 'Vodohospodář', 'url': 'https://vodohospodar.cz/', 'domain': 'vodohospodar.cz', 'logo': 'assets/partners/vodohospodar.webp', 'width': 859, 'height': 400},
    {'name': 'ROTO', 'url': 'https://roto-group.eu/', 'domain': 'roto-group.eu', 'logo': 'assets/partners/roto.webp', 'width': 1024, 'height': 461},
]


def render_partners(current, ctx, variant='content'):
    """Return the partners section. variant='home' uses the homepage heading classes."""
    esc, rel = ctx['esc'], ctx['rel']
    kicker = 'eyebrow' if variant == 'home' else 'ed-kicker'
    heading = 'section-heading' if variant == 'home' else 'section-caption'
    label = 'TECHNOLOGIČTÍ A OBCHODNÍ PARTNEŘI' if variant == 'home' else 'Technologičtí a obchodní partneři'
    items = ''
    for partner in PARTNERS:
        items += (
            f'<li><a href="{esc(partner["url"])}" target="_blank" rel="noopener" '
            f'aria-label="{esc(partner["name"])} — web partnera (otevře se v novém okně)">'
            f'<span class="partner-logo"><img src="{esc(rel(partner["logo"], current))}" width="{partner["width"]}" '
            f'height="{partner["height"]}" alt="{esc(partner["name"])}" loading="lazy" decoding="async"></span>'
            f'<span class="partner-meta"><strong>{esc(partner["name"])}</strong>'
            f'<span>{esc(partner["domain"])} <b aria-hidden="true">↗</b></span></span></a></li>'
        )
    return (
        f'<section class="container partners-section partners-section--{variant}" id="partneri" aria-labelledby="partners-title" data-reveal>'
        f'<div class="{heading}"><div><p class="{kicker}">{label}</p><h2 id="partners-title">S kým<br>spolupracujeme.</h2></div>'
        f'<p>Jsme nezávislý dodavatel: technologii vybíráme podle vašich potřeb, ne podle jednoho výrobce.</p></div>'
        f'<ul class="partners-grid">{items}</ul></section>'
    )
