# Čistá řešení — návrh nového webu

Responzivní český návrh pro firmu Čistá řešení (WHITE ELEPHANT s.r.o.). Nabídka pokrývá domácnosti, firmy, obce i průmyslové provozy. Publikováno samostatně na GitHub Pages; původní doména není měněna.

## Náhled

https://majkpowa.github.io/cista-reseni/

## Co funguje

- Sdílená navigace s přímým vstupem do servisu, přehledem technologií a nabídkou zprovoznění i školení.
- Přepínatelné obrazové panely pěti oblastí služeb na úvodu a předvyplnění zvoleného řešení.
- Interaktivní přehled „Naše řešení“: vlastní SVG schéma domu, čtyři volby, animovaná cesta vody, skutečné realizace a klikací průběh zakázky. Výběr se předá do poptávky; všechny služby zůstávají i v rozbalovacím adresáři.
- Kompletní lokální archiv 41 realizací s vyhledáváním, filtrováním a postupným zobrazením dalších projektů.
- 55 detailů realizací a služeb: úvodní fotografie či označené schéma, přehled projektu, navigace mezi sekcemi, původní texty v rozbalovacích kapitolách a související realizace.
- Samostatné stránky pro ČOV pro firmy a obce, servis a údržbu, zprovoznění, školení obsluhy a rekonstrukce. Nové textové servisní příklady a hodnocení pocházejí z klientského zadání.
- Reference podle typu zákazníka a služby. Technologie, skutečně provedené práce a kapacita jsou uvedené jen v doloženém rozsahu; číslo modelu se nepřevádí na EO.
- Fotogalerie s 278 snímky a produktovými vyobrazeními, filtrem podle realizace, postupným zobrazením dalších snímků a ovládáním zvětšených fotografií klávesnicí.
- 5 původních PDF dokumentů se skutečnými náhledy první strany, vyhledáváním a filtrem.
- Obrazová stránka o firmě, kontaktní karty s kopírováním údajů a volbou tématu poptávky.
- Rozbalovací odpovědi na otázky.
- Dvoukrokový poptávkový formulář s devíti tématy, údaji o stávajícím zařízení, validací a uložením poptávky do administrace.
- Odkazy pro telefon a e-mail, ovládání klávesnicí, podpora omezeného pohybu.

## Redakční systém (od 12. 11. 2026)

- **Administrace** na adrese `/admin/`: reference s fotografiemi (přidání, úprava, skrytí, smazání, výběr na úvodní stránku), kategorie, poptávky se stavy a poznámkami, správci. Přihlášení e-mailem a heslem, e-mail musí být ověřený a uvedený na seznamu správců.
- **Reference** se na úvodní stránku, do výpisu realizací, galerie a detailu načítají z databáze (Firestore). Statický výpis zůstává jako záloha pro případ výpadku. Kategorie: Domovní ČOV, Firemní a průmyslové ČOV, Servis, Rekonstrukce, Dešťová voda, Úpravny vody, Čerpací technika, Další řešení.
- **Poptávkový formulář** poptávku ukládá do databáze; správce ji vidí v administraci. Automatické e-maily (upozornění firmě, potvrzení zákazníkovi) jsou připravené ve `functions/` a zapnou se nastavením SMTP přístupu — do té doby web potvrzovací e-mail neslibuje.
- **Partneři:** sekce s logy ASIO, ENVI-PUR, EKOCIS, Vodohospodář a ROTO na úvodu a na stránce O nás (`scripts/partners.py`, loga v `dist/assets/partners/`).
- **Zpracování osobních údajů:** `zpracovani-udaju.html` je pracovní text k revizi klientem.

Backend je Firebase projekt `cista-reseni-20261112` (Firestore, Storage, Authentication, Functions; region europe-west3). Pravidla jsou ve `firestore.rules` a `storage.rules`, lokální kontrola v `scripts/test_rules.sh`. Web neobsahuje analytické ani reklamní trackery. Manuály: `docs/manualy/` a nápověda v administraci.

Obsah převzatý z původního webu je lokální kopie veřejných podkladů k 7. 11. 2026, nikoli automatická synchronizace.

## Čitelnost a ovládání na telefonu (od 12. 11. 2026)

- Nejmenší velikosti písma (8–12 px) jsou zvednuté v celém webu (`scripts/raise_type_scale.py`, jednorázový záznam mapování); na telefonu má běžný text 15,5 px a popisky nejméně 12 px.
- `dist/polish.css` a `dist/polish.js` se načítají jako poslední vrstva: kompaktní hlavička, která se po odrolování zmenší, spodní lišta „Zavolat / Poptat řešení" na telefonu, telefon v mobilní nabídce, posuvné pásy filtrů, dotykové plochy od 48 px, pole formuláře 16 px (iPhone při psaní nepřibližuje), plynulé přechody mezi stránkami a rozbalování odpovědí. Vše respektuje omezený pohyb.
- Písmo Manrope se načítá jako WOFF2 (54 kB místo 165 kB). Šipky „↗" a „⌄", které písmo neobsahuje, generátor nahrazuje vloženými SVG ikonami (`iconize` v `scripts/build_content.py`).

## Rozsah převzetí

Web obsahuje 62 HTML stránek. Ze zdroje jsou převzaty celé texty 51 článků, všechny odkazy nalezené v sitemap, 336 médií a dokumenty. Čtyři další stránky a rozšíření servisu vznikly z klientského zadání z 8. 11. 2026. Pro rychlejší načítání je připraveno 328 náhledů do 720 px; plné fotografie se načítají až při otevření. PDF zůstávají beze změny. Celková velikost statického webu je přibližně 210 MB.

Podklady k rozšíření jsou v `docs/business-expansion.json`; audit referencí v `scripts/reference_enrichment.py`. Dvě nové servisní zakázky nemají dodané fotografie ani datum a nejsou vydávány za obrazové reportáže. Firemní sídlo Kpt. Jaroše 24, Klokoty, 390 03 Tábor bylo ověřeno v ARES a potvrzeno uživatelem 8. 11. 2026. Společné firemní údaje a navigaci spravuje `scripts/site_shell.py`.

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
node --check dist/navigation.js
node --check dist/motion.js
node --check dist/site-data.js
node --check dist/admin/admin.js
python scripts/check_site.py
python scripts/validate_content.py
```

Kontrola ověřuje místní odkazy, soubory, kotvy, nadpisy, duplicitní ID, textové alternativy obrázků a zachování plných textů všech 51 původních článků. Výsledek je v `docs/site-validation.json`. Rozšířená modrá verze prošla 142 automatickými interakčními kontrolami v JSDOM. V prohlížeči byly navíc zkontrolovány úvodní a servisní obrazovky, mobilní navigace a průchod servisní poptávkou včetně nativní validace. Nejde o vizuální kontrolu každé podstránky.

Reference projektového partnera Vodohospodář s.r.o. – Ing. Milan Rada je převzata v plném znění z klientského zadání z 8. 11. 2026. Data jsou v `docs/business-expansion.json`, společný renderer v `scripts/partner_testimonial.py`; generátor ji vkládá na úvod a stránku O nás.

Obsahové stránky obnoví `python scripts/build_content.py` (vyžaduje také beautifulsoup4). Jejich kompozice jsou v `scripts/detail_design.py`, `scripts/overview_design.py` a `scripts/service_extensions.py`. Generátor synchronizuje také hlavičku a patičku úvodu. Náhledy PDF jsou součástí repozitáře; při změně dokumentů je lze obnovit skriptem `scripts/render_document_covers.py` s PyMuPDF. CSS, JavaScript a značkové SVG mají v URL otisk obsahu, aby se po nasazení nevracely staré styly z cache.

Vektorové schéma služeb je ilustrační, nikoli projekt konkrétní stavby. Animace má konečný průběh, lze ji přehrát znovu a respektuje omezený pohyb. Rozcestník se opakovaně sestavuje z `scripts/templates/services.html` a `water-systems.inline.svg`; návrhové poznámky jsou v `docs/services-redesign.txt`.

Navigace od 9. 11. 2026 používá větší písmo a klikací plochy, animované nabídky a klávesové ovládání. Sdílené `motion.js` a `motion.css` přidávají na všech stránkách postupný nástup a jednorázové odhalování sekcí. Obsah je dostupný bez JavaScriptu; omezený pohyb používá krátké prolnutí bez posunu. Animace nezdržují fokus ani kliknutí a nečekají na stažení fotografií.
