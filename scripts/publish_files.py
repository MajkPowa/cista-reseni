"""Files for the production domain: robots.txt, sitemap.xml and .htaccess (Apache on cistareseni.cz).

Run by build_content.py after the language versions are built; it reads SITE_URL and INDEXABLE from there.
The .htaccess sends http and cistareseni.cz to https://www.cistareseni.cz/, serves 404.html for missing
pages and redirects the addresses of the previous website (/produkty-a-sluzby/…, /reference/N-…) to the new pages.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
import re
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
SKIP_DIRS = {'admin', 'crm', 'assets', 'data'}
SKIP_PAGES = {'404.html', 'realizace/detail.html'}


def page_url(site: str, relative: str) -> str:
    if relative == 'index.html':
        return site
    if relative.endswith('/index.html'):
        return site + relative[:-len('index.html')]
    return site + relative


def indexable_pages() -> list[str]:
    pages = []
    for path in sorted(DIST.rglob('*.html')):
        relative = path.relative_to(DIST).as_posix()
        parts = relative.split('/')
        if parts[0] in SKIP_DIRS or relative in SKIP_PAGES or (len(parts) > 1 and '/'.join(parts[1:]) in SKIP_PAGES):
            continue
        head = path.read_text(encoding='utf-8').split('</head>', 1)[0]
        robots = re.search(r'<meta[^>]*name="robots"[^>]*>', head)
        if robots and 'noindex' in robots.group(0):
            continue
        pages.append(relative)
    return pages


def sitemap(site: str) -> str:
    today = date.today().isoformat()
    rows = ''.join(f'  <url><loc>{page_url(site, page)}</loc><lastmod>{today}</lastmod></url>\n' for page in indexable_pages())
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows + '</urlset>\n')


def robots(site: str, indexable: bool) -> str:
    if not indexable:
        return 'User-agent: *\nDisallow: /\n'
    return f'User-agent: *\nDisallow: /admin/\nDisallow: /crm/\nAllow: /\n\nSitemap: {site}sitemap.xml\n'


def legacy_redirects() -> list[str]:
    rules = []
    # Služby: /produkty-a-sluzby/<slug>.html -> /sluzby/<slug>.html (stejné názvy souborů).
    for path in sorted((DIST / 'sluzby').glob('*.html')):
        rules.append(f'RewriteRule ^produkty-a-sluzby/{re.escape(path.stem)}\\.html$ /sluzby/{path.name} [R=301,L]')
    rules.append('RewriteRule ^produkty-a-sluzby/?$ /sluzby.html [R=301,L]')
    # Reference: /reference/<číslo>-<cokoli>.html -> /realizace/<číslo>-….html
    for path in sorted((DIST / 'realizace').glob('*.html'), key=lambda p: p.name):
        number = re.match(r'(\d+)-', path.name)
        if number:
            rules.append(f'RewriteRule ^reference/{number.group(1)}-[^/]*\\.html$ /realizace/{path.name} [R=301,L]')
    rules.append('RewriteRule ^reference/?$ /reference.html [R=301,L]')
    return rules


def htaccess(site: str) -> str:
    host = urlparse(site).hostname
    bare = host.removeprefix('www.')
    redirects = '\n'.join(legacy_redirects())
    return f'''# Vygenerováno skriptem scripts/publish_files.py, ručně neupravujte.
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddDefaultCharset utf-8
AddType video/mp4 .mp4
AddType image/webp .webp
AddType image/svg+xml .svg
AddType font/woff2 .woff2

# Stavový soubor nahrávání (production.yml) není pro návštěvníky.
<Files ".ftp-deploy-sync-state.json">
<IfModule mod_authz_core.c>
Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
Order allow,deny
Deny from all
</IfModule>
</Files>

<IfModule mod_rewrite.c>
RewriteEngine On
# Jediná adresa webu: https://{host}/
# (cesta z RewriteRule, ne REQUEST_URI: hosting přes http mapuje web do /www/)
RewriteCond %{{HTTP_HOST}} ^{re.escape(bare)}$ [NC]
RewriteRule ^(.*)$ https://{host}/$1 [R=301,L]
RewriteCond %{{HTTPS}} !=on
RewriteCond %{{HTTP:X-Forwarded-Proto}} !https
RewriteRule ^(.*)$ https://{host}/$1 [R=301,L]
# Úvodní stránka bez index.html
RewriteCond %{{THE_REQUEST}} \\s/+(.*/)?index\\.html[\\s?] [NC]
RewriteRule ^(.*/)?index\\.html$ /$1 [R=301,L]
# Adresy původního webu
{redirects}
</IfModule>

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Strict-Transport-Security "max-age=31536000"
<FilesMatch "\\.(html|xml|txt)$">
Header set Cache-Control "no-cache"
</FilesMatch>
<FilesMatch "\\.(css|js|svg|webp|jpg|jpeg|png|woff2|ttf|mp4|pdf)$">
Header set Cache-Control "public, max-age=604800"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript application/json application/xml image/svg+xml
</IfModule>
'''


def write(site: str, indexable: bool) -> None:
    (DIST / 'robots.txt').write_text(robots(site, indexable), encoding='utf-8', newline='\n')
    (DIST / 'sitemap.xml').write_text(sitemap(site), encoding='utf-8', newline='\n')
    (DIST / '.htaccess').write_text(htaccess(site), encoding='utf-8', newline='\n')
