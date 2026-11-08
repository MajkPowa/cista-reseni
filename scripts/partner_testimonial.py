"""Pure renderer for the partner reference supplied on 2026-11-08.

Load partner-testimonial.css after the shared stylesheets. Integrate one
render_partner_testimonial(current, ctx) call per page. Quote content and
attribution come exclusively from BUSINESS['partner_testimonial'].
"""


def render_partner_testimonial(current, ctx):
    """Return a complete, accessible testimonial section without file I/O."""
    testimonial = ctx.get('BUSINESS', {}).get('partner_testimonial')
    if not testimonial:
        return ''
    if isinstance(current, dict):
        current = current['local']
    esc = ctx['esc']
    source = testimonial['logo_source']
    asset = ctx['ASSETS'].get(source, {})
    logo_url = ctx['asset_url'](source, current)
    url = esc(testimonial['url'])
    author = esc(testimonial['author'])
    quote = esc(testimonial['text'])
    logo = f'<img src="{esc(logo_url)}" width="{asset.get("width", 859)}" height="{asset.get("height", 400)}" alt="Vodohospodář" loading="lazy" decoding="async">'
    arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>'
    return f'''<section class="partner-testimonial container" id="partner-testimonial" aria-labelledby="partner-testimonial-title" data-reveal>
<div class="partner-testimonial-intro"><p class="eyebrow">ZKUŠENOST PROJEKTOVÉHO PARTNERA</p><h2 id="partner-testimonial-title">Spolupráce, která pokračuje i po předání.</h2><span class="partner-testimonial-mark" aria-hidden="true">“</span></div>
<figure class="partner-testimonial-figure"><blockquote><p>{quote}</p></blockquote><figcaption><a class="partner-testimonial-logo" href="{url}" target="_blank" rel="noopener" aria-label="Web společnosti Vodohospodář (otevře se v novém okně)">{logo}</a><div class="partner-testimonial-credit"><cite>{author}</cite><a class="partner-testimonial-web" href="{url}" target="_blank" rel="noopener">vodohospodar.cz {arrow}<span class="sr-only"> (otevře se v novém okně)</span></a></div></figcaption></figure>
</section>'''
