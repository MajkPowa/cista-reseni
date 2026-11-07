# Čistá řešení — návrh nového webu

Responzivní český návrh pro firmu Čistá řešení (WHITE ELEPHANT s.r.o.). Publikováno samostatně na GitHub Pages; původní doména není měněna.

## Náhled

https://majkpowa.github.io/cista-reseni/

## Co funguje

- Mobilní navigace, přepínatelné obrazové panely čtyř oblastí služeb a předvyplnění zvoleného řešení.
- Interaktivní přehled „Naše řešení“: vlastní SVG schéma domu, čtyři volby, animovaná cesta vody, skutečné realizace a klikací průběh zakázky. Výběr se předá do poptávky; všechny služby zůstávají i v rozbalovacím adresáři.
- Kompletní lokální archiv 41 realizací s vyhledáváním, filtrováním a postupným zobrazením dalších projektů.
- 51 obrazových detailů realizací a služeb: úvodní fotografie či označené schéma, přehled projektu, navigace mezi sekcemi, původní texty v rozbalovacích kapitolách a související realizace.
- Fotogalerie s 278 snímky a produktovými vyobrazeními, filtrem podle realizace, postupným zobrazením dalších snímků a ovládáním zvětšených fotografií klávesnicí.
- 5 původních PDF dokumentů se skutečnými náhledy první strany, vyhledáváním a filtrem.
- Obrazová stránka o firmě, kontaktní karty s kopírováním údajů a volbou tématu poptávky.
- Rozbalovací odpovědi na otázky.
- Dvoukrokový ukázkový formulář s validací, souhrnem a volitelným otevřením e-mailové aplikace.
- Odkazy pro telefon a e-mail, ovládání klávesnicí, podpora omezeného pohybu.

Formulář neposílá data na server a nic neukládá. Ukázka neobsahuje analytické nebo reklamní trackery, API klíče ani zákaznická data. Před ostrým provozem je nutné připojit skutečný příjem poptávek, evidenci jejich výsledku a dokončit informační obsah pro zpracování údajů. Obsah je lokální kopie veřejných podkladů k 7. 11. 2026, nikoli automatická synchronizace.

## Rozsah převzetí

Web obsahuje 58 HTML stránek. Ze zdroje jsou převzaty celé texty 51 článků, všechny odkazy nalezené v sitemap, 336 médií a dokumenty. Pro rychlejší načítání je připraveno 328 náhledů do 720 px; plné fotografie se načítají až při otevření. PDF zůstávají beze změny. Celková velikost statického webu je přibližně 210 MB.

Přehled URL, kontrolní součty, úplná obsahová data, původní veřejné HTML a zpráva o migraci jsou v `docs/source-inventory/`. Tři vadné odkazy původního webu vracejí úvodní stránku místo článku; dostupné názvy služeb jsou zachovány bez domýšlení chybějících podrobností. Původní web neposkytl samostatné právní texty.

## Vzhled a obsah

Tmavě modrá, jasná vodní modrá a ledově světlé plochy; lokálně hostované písmo Manrope (licence přiložena). Celý web sdílí modrou paletu, fotografické kompozice a krátké konečné animace s podporou omezeného pohybu. Symbol slona pochází z existujícího lokálního návrhu vodní značky White Elephant; sestava s názvem Čistá řešení je návrhová. Náladový hero je AI ilustrační vizualizace, na stránce je označený. Fotografie realizací pocházejí ze současného webu; produktové ilustrace a obecné schéma jsou označené. Zdroje jsou v docs/assets-sources.json; prompt a původ hero jsou v dist/assets/hero-provenance.txt.

## Lokální spuštění

```sh
python -m http.server 4187 --directory dist
```

## Nasazení

GitHub Actions při pushi do main obnoví původní veřejná média z manifestu, ověří jejich kontrolní součty, vytvoří WebP a náhledy a publikuje celý `dist/` na GitHub Pages. Ke konverzi používá Pillow 12.1.0 a requests 2.32.5; média se mezi sestaveními ukládají do cache. Výsledný publikovaný web obsahuje soubory lokálně a při prohlížení fotografií nevyžaduje původní web. Návrh má noindex, nofollow. Současný produkční web zůstává na cistareseni.cz.

Velká média nejsou součástí historie Git. Při čerstvém klonování spusťte před lokálním náhledem `python -m pip install Pillow==12.1.0 requests==2.32.5` a `python scripts/restore_media.py`. Na tomto pracovním počítači je již úplná kopie médií uložená v `dist/assets/source/`.

## Kontrola

```sh
node --check dist/app.js
node --check dist/content.js
node --check dist/services.js
node --check dist/experience.js
python scripts/check_site.py
python scripts/validate_content.py
```

Kontrola ověřuje místní odkazy, soubory, kotvy, nadpisy, duplicitní ID, textové alternativy obrázků a zachování plných textů všech 51 původních článků. Výsledek je v `docs/site-validation.json`. Aktuální modrá úprava prošla statickou a obsahovou kontrolou; automatické interakční kontroly používají JSDOM. Vizuální kontrola aktuální verze v prohlížeči nebyla dostupná kvůli chybě připojení nástroje Computer Use.

Obsahové stránky obnoví `python scripts/build_content.py` (vyžaduje také beautifulsoup4). Jejich kompozice jsou v `scripts/detail_design.py` a `scripts/overview_design.py`. Náhledy PDF jsou součástí repozitáře; při změně dokumentů je lze obnovit skriptem `scripts/render_document_covers.py` s PyMuPDF. CSS, JavaScript a značkové SVG mají v URL otisk obsahu, aby se po nasazení nevracely staré styly z cache.

Vektorové schéma služeb je ilustrační, nikoli projekt konkrétní stavby. Animace má konečný průběh, lze ji přehrát znovu a respektuje omezený pohyb. Rozcestník se opakovaně sestavuje z `scripts/templates/services.html` a `water-systems.inline.svg`; návrhové poznámky jsou v `docs/services-redesign.txt`.
