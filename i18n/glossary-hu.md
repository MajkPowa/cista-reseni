# Translating the Čistá řešení website: Czech → Hungarian

The site belongs to Čistá řešení (WHITE ELEPHANT s.r.o., Tábor, Czech Republic): an independent supplier of
water management technologies — domestic and larger wastewater treatment plants, servicing, rainwater use,
pumping, water treatment. Readers of the Hungarian version: Hungarian-speaking property owners, companies and
partners. Write natural, professional **Hungarian** as a native technical copywriter would — never
word-for-word, with correct Hungarian word order, suffixes and vowel harmony. Use the formal register
(**Ön / Önök**, magázás) consistently; the company speaks as "mi". Use correct Hungarian typography:
„idézőjelek”, nagykötőjel (–) for ranges, space as thousands separator (3 500 liter), decimal comma.

## Where the translations live

`i18n/hu.json` maps every Czech text unit of the site to its Hungarian translation. `python scripts/i18n.py build`
lists units without a translation in `i18n/missing-hu.json`; add them to the catalogue and build again.

## Rules that must hold (the build verifies them)

1. **Placeholders** such as `<a1>…</a1>`, `<strong3>…</strong3>`, `<br2/>`, `<svg1/>`, `<span4/>` stand for
   HTML elements. Keep every one of them exactly once, with the same name and number; wrap the words that
   correspond to the wrapped Czech words. You may move them to suit Hungarian word order. `<brN/>` is a line
   break in a headline — keep it at a sensible place so both lines are balanced.
2. **Slots** `{0}`, `{1}` are filled in by the program (a title, a number). Keep them all. A slot may hold
   any word, so do not attach a suffix that depends on vowel harmony directly to it (write "{0} – {1}. fénykép",
   not "{0}-ról").
3. In `script` units the two characters `\n` (backslash + n) are line breaks — keep the same number of them.
4. The text is HTML-escaped: write `&amp;` for &, `&lt;` and `&gt;` for < and >. Do not add any other markup.
5. Do not add or drop information. No explanations, no notes, no quotation marks around the whole unit.
6. Keep roughly the length of the original for headlines, buttons, labels and menu items (they sit in a
   fixed layout — Hungarian tends to run long, so choose the concise wording); body text may be as long as
   natural Hungarian needs.
7. Capitalisation: Hungarian sentence case for headings and buttons (only the first word and proper nouns
   capitalised). Units written in ALL CAPS in Czech (small labels above headings) stay in ALL CAPS.

## Do not translate

- Company and brand: **Čistá řešení**, WHITE ELEPHANT s.r.o., ASIO, ENVI-PUR, EKOCIS, ROTO, Elkoplast,
  vodohospodar.cz; product names and types (BioCleaner, BC 4 OPTIMA, BC 4 PP COMFORT, AS-MONOcomp 4,
  AS-VARIOcomp 5K, AS-ANASEP, AS-REWA, Roterra, Robox, RoCube, EASY E-DEEP 1200 X-RING, AQUAVISOR…).
- Czech place names stay in their Czech form (Tábor, Písek, Týn nad Vltavou, Stráž nad Nežárkou, Přehořov u
  Soběslavi…; only Praha → Prága), personal names, e-mail addresses, phone numbers, addresses, IČ/DIČ numbers.
- Service programme names **STANDARD** and **PREMIUM**.
- Dates in titles stay as they are ("DČOV Vydří 11/2024" → "Házi szennyvíztisztító – Vydří 11/2024").

## Glossary (use consistently)

| Czech | Hungarian |
|---|---|
| čistírna odpadních vod, ČOV | szennyvíztisztító (berendezés); in titles, labels and menus simply "szennyvíztisztító" |
| domovní čistírna (odpadních vod), domovní ČOV, DČOV | házi szennyvíztisztító; project title "DČOV Vydří" → "Házi szennyvíztisztító – Vydří" |
| ČOV pro firmy a obce | szennyvíztisztító cégeknek és önkormányzatoknak |
| odpadní voda / splaškové vody, splašky | szennyvíz / kommunális szennyvíz |
| dešťová voda, dešťovka | esővíz; project title "Dešťovka Mělník" → "Esővízhasznosítás – Mělník" |
| hospodaření s dešťovou vodou | esővíz-gazdálkodás |
| úpravna vody | vízkezelő berendezés |
| čerpací technika / čerpací šachta / čerpací jímka / čerpací stanice | szivattyútechnika / szivattyúakna / átemelő akna / átemelő állomás |
| jímka / žumpa / septik | akna (tartály) / zárt szennyvíztároló / oldómedence |
| akumulační nádrž / nádrž | tárolótartály / tartály |
| vsak, vsakování, vsakovací objekt | szikkasztás, szikkasztó |
| kanalizace / kanalizační přípojka | csatorna, csatornahálózat / csatornabekötés |
| kal / dmychadlo / řídicí jednotka | iszap / légfúvó / vezérlőegység |
| realizace (projekt) | megvalósított projekt, kivitelezés; menu item "Realizace" → "Referenciák" |
| reference | referenciák |
| poptávka, poptat | ajánlatkérés, ajánlatot kér; button "Poptat řešení" → "Ajánlatot kérek"; "Nezávazně poptat realizaci" → "Kötelezettség nélküli ajánlatkérés"; "Poptat servis" → "Szervizt kérek" |
| servis, servis a údržba | szerviz, szerviz és karbantartás |
| pravidelný servis / servisní program | rendszeres szerviz / szervizprogram |
| zprovoznění | üzembe helyezés |
| školení obsluhy | kezelői oktatás |
| rekonstrukce / modernizace / intenzifikace | felújítás / korszerűsítés / kapacitásbővítés |
| montáž, instalace / dodávka | telepítés / szállítás |
| návrh / projektová dokumentace / povolení stavby | tervezés / tervdokumentáció / építési engedély |
| na klíč | kulcsrakész |
| svépomocí | saját kivitelezésben, házilagosan |
| EO (ekvivalentní obyvatel) | LE (lakosegyenérték) — "4 EO" → "4 LE" |
| domácnosti / firmy / průmysl / obce / rekreační zařízení | háztartások / cégek / ipar / önkormányzatok / üdülőlétesítmények |
| obec (form field: where the property is) | település |
| nezávislý dodavatel vodohospodářských technologií | vízgazdálkodási technológiák független szállítója |
| Voda nemusí jen odtékat. | A víznek nem kell csak úgy elfolynia. |
| Od návrhu až po následný servis. | A tervezéstől az utólagos szervizig. |
| Více než 70 realizací | Több mint 70 megvalósított projekt |
| Návrh · Dodávka · Montáž · Servis | Tervezés · Szállítás · Telepítés · Szerviz |
| Servisujeme i zařízení, která jsme nedodávali. | Olyan berendezéseket is szervizelünk, amelyeket nem mi szállítottunk. |
| Jihočeský kraj / Praha a Středočeský kraj / Plzeňský kraj / Karlovarský kraj / Severní Čechy / Kraj Vysočina | Dél-csehországi kerület / Prága és a Közép-csehországi kerület / Plzeňi kerület / Karlovy Vary-i kerület / Észak-Csehország / Vysočina kerület |
| Zpracování osobních údajů | Személyes adatok kezelése |
| Ke stažení / Galerie / O nás / Kontakt | Letöltések / Galéria / Rólunk / Kapcsolat |
| fotografie (caption "X — fotografie 3") | fénykép — "{0} – {1}. fénykép" |
