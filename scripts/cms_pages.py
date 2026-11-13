"""Pages that belong to the content management system (added 2026-11-12).

render_dynamic_detail() – shell of realizace/detail.html. dist/site-data.js fills it
    with a reference created or edited in the administration (?id=...).
render_privacy()        – information about personal data processing for the inquiry form.

Pure rendering: no file I/O. The privacy text is a working draft that states only
facts of the technical solution; the client must review it before production.
"""


def _icon(path='M4 12h15m-6-6 6 6-6 6'):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="{path}"/></svg>'


def render_dynamic_detail(current, ctx):
    rel = ctx['rel']
    back = _icon('M20 12H5m6-6-6 6 6 6')
    phone = _icon('m7 3 3 5-3 3a15 15 0 0 0 6 6l3-3 5 3c0 4-3 5-6 4A22 22 0 0 1 3 9C2 6 3 3 7 3Z')
    references = rel('reference.html', current)
    inquiry = rel('index.html', current) + '?reseni=poradit#poptavka'
    return f'''<div class="detail-page detail-page--project cms-detail" data-cms="reference-detail">
<section class="detail-hero"><div class="container"><div class="detail-breadcrumbs" aria-label="Drobečková navigace"><a href="{rel('index.html', current)}">Úvod</a><span>/</span><a href="{references}">Realizace</a><span>/</span><span aria-current="page" data-detail-crumb>Detail realizace</span></div>
<div class="detail-hero-grid"><div class="detail-hero-copy"><a class="detail-back" href="{references}">{back} Realizace</a><p class="eyebrow">ZA KAŽDOU REALIZACÍ JE PŘÍBĚH</p><h1 data-detail-title>Realizace</h1>
<p class="cms-detail-loading" data-detail-loading role="status">Načítáme realizaci…</p>
<div class="cms-detail-missing" data-detail-missing hidden><p class="detail-lead">Tuto realizaci se nepodařilo najít. Možná už není zveřejněná.</p><div class="detail-hero-actions"><a class="button" href="{references}">Všechny realizace {_icon()}</a></div></div>
<div data-detail-content hidden><p class="detail-lead" data-detail-lead></p><div class="detail-tags" data-detail-tags></div><div class="detail-hero-actions"><a class="button" data-detail-inquiry href="{inquiry}">Probrat podobné řešení {_icon()}</a><a class="detail-text-link" data-detail-gallery-link href="#detail-gallery">Fotografie <span>↓</span></a></div></div>
</div><figure class="detail-main-visual" data-detail-visual></figure></div></div></section>
<section class="container detail-overview" id="detail-overview"><div class="detail-overview-heading"><p class="eyebrow">PROJEKT V KOSTCE</p><h2>Konkrétní místo.<br>Konkrétní řešení.</h2></div><dl class="detail-facts" data-detail-facts></dl></section>
<section class="detail-story-section" id="detail-story" data-detail-story-section><div class="container detail-story-grid"><div class="detail-story-intro"><p class="eyebrow">JAK TO PROBÍHALO</p><h2>Od zadání<br>k hotovému řešení.</h2><div class="detail-contact-note">{phone}<div><small>Raději vše proberete osobně?</small><a href="tel:+420736403795">736 403 795</a></div></div></div><article class="article-copy cms-story" data-detail-story></article></div></section>
<section class="container detail-gallery" id="detail-gallery" data-detail-gallery-section><div class="detail-section-heading"><div><p class="eyebrow">ZBLÍZKA</p><h2>Podívejte se na výsledek.</h2></div><p><span data-detail-gallery-count></span><br>Kliknutím otevřete větší detail.</p></div><div class="media-grid detail-gallery-grid" data-detail-gallery></div></section>
<section class="container detail-final-cta"><div><p class="eyebrow">TEĎ JE ŘADA NA VAŠEM PROJEKTU</p><h2>Podobná situace?<br>Najdeme vaši cestu.</h2><p>Řekněte nám něco o místě a vašem záměru. Společně probereme další postup.</p></div><div class="detail-final-actions"><a class="button" data-detail-inquiry href="{inquiry}">Probrat můj projekt {_icon()}</a><a class="detail-text-link" href="tel:+420736403795">{phone} 736 403 795</a></div></section>
</div>'''


def render_privacy(current, ctx):
    esc, rel, company = ctx['esc'], ctx['rel'], ctx['COMPANY']
    crumbs = f'<div class="breadcrumbs"><a href="{rel("index.html", current)}">Úvod</a><span aria-hidden="true">/</span><span aria-current="page">Zpracování osobních údajů</span></div>'
    sections = [
        ('Kdo údaje zpracovává',
         f'<p>Správcem osobních údajů je společnost {esc(company["name"])}, IČ {esc(company["ico"])}, se sídlem {esc(company["address"])} (značka Čistá řešení). '
         'Obrátit se na nás můžete e-mailem na <a href="mailto:info@cistareseni.cz">info@cistareseni.cz</a> nebo telefonicky na <a href="tel:+420736403795">+420 736 403 795</a>.</p>'),
        ('Jaké údaje a proč',
         '<p>Když odešlete poptávkový formulář, uložíme údaje, které do něj sami vyplníte: jméno, e-mail, případně telefon, obec, vybranou službu, údaje o zařízení, text zprávy a soubory, které k poptávce přiložíte (fotografie nebo dokumentace). '
         'Používáme je pouze k vyřízení vaší poptávky a k související komunikaci. Právním základem je jednání o smlouvě na vaši žádost.</p>'
         '<p>Údaje nepoužíváme k zasílání obchodních sdělení a nepředáváme je dalším osobám k jejich vlastním účelům.</p>'),
        ('Kde jsou údaje uloženy',
         '<p>Poptávky se ukládají do zabezpečené databáze služby Google Firebase (Google Cloud) v datovém centru v Evropské unii. '
         'Společnost Google zde vystupuje jako zpracovatel. Přístup k poptávkám mají jen pověřené osoby správce po přihlášení do administrace webu.</p>'),
        ('Jak dlouho údaje uchováváme',
         '<p>Údaje z poptávky uchováváme po dobu jejího vyřizování a následné komunikace. Pokud ze spolupráce vznikne zakázka, řídí se další uchovávání smlouvou a právními předpisy. '
         'O dřívější výmaz můžete kdykoli požádat.</p>'),
        ('Vaše práva',
         '<p>Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku. '
         'Stačí nám napsat na <a href="mailto:info@cistareseni.cz">info@cistareseni.cz</a>. Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů (<a href="https://uoou.gov.cz/" target="_blank" rel="noopener">uoou.gov.cz</a>).</p>'),
        ('Cookies a měření návštěvnosti',
         '<p>Web nepoužívá reklamní ani analytické cookies a nevkládá měřicí kódy třetích stran. Návštěvnost počítáme jen jako anonymní denní součty zobrazení stránek, '
         'bez ukládání čehokoli do vašeho zařízení a bez údajů, podle kterých by vás bylo možné rozpoznat. Prohlížeče s nastavením „nesledovat“ se nepočítají.</p>'),
    ]
    body = (f'<section class="container editorial-heading">{crumbs}<div class="editorial-title"><div><p class="ed-kicker">Ochrana soukromí</p>'
            '<h1>Zpracování<br><span>osobních údajů.</span></h1></div><div class="editorial-intro"><p>Stručně a srozumitelně: jaké údaje od vás získáme poptávkovým formulářem, proč je potřebujeme a jak s nimi zacházíme.</p></div></div></section>')
    body += '<section class="container legal-copy">'
    for title, text in sections:
        body += f'<article><h2>{esc(title)}</h2>{text}</article>'
    body += '</section>'
    return body
