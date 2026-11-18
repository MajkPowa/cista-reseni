# Translating the Čistá řešení website: Czech → English

The site belongs to Čistá řešení (WHITE ELEPHANT s.r.o., Tábor, Czech Republic): an independent supplier of
water management technologies — domestic and larger wastewater treatment plants, servicing, rainwater use,
pumping, water treatment. Readers of the English version: foreign owners of houses and holiday homes in
Czechia, international companies with Czech sites, partners. Write natural, professional **British English**
(litres, modernisation, enquiry), as a native copywriter would — never word-for-word.

## Where the translations live

`i18n/en.json` maps every Czech text unit of the site to its English translation. `python scripts/i18n.py build`
lists units without a translation in `i18n/missing-en.json`; add them to the catalogue and build again.

## Rules that must hold (the build verifies them)

1. **Placeholders** such as `<a1>…</a1>`, `<strong3>…</strong3>`, `<br2/>`, `<svg1/>`, `<span4/>` stand for
   HTML elements. Keep every one of them exactly once, with the same name and number; wrap the words that
   correspond to the wrapped Czech words. You may move them to suit English word order. `<brN/>` is a line
   break in a headline — keep it at a sensible place so both lines are balanced.
2. **Slots** `{0}`, `{1}` are filled in by the program (a title, a number). Keep them all.
3. In `script` units the two characters `\n` (backslash + n) are line breaks — keep the same number of them.
4. The text is HTML-escaped: write `&amp;` for &, `&lt;` and `&gt;` for < and >. Do not add any other markup.
5. Do not add or drop information. No explanations, no notes, no quotation marks around the whole unit.
6. Keep roughly the length of the original for headlines, buttons, labels and menu items (they sit in a
   fixed layout); body text may be as long as natural English needs.
7. Capitalisation: sentence case for headings and buttons ("Request a quote", not "Request A Quote").
   Units written in ALL CAPS in Czech (small labels above headings) stay in ALL CAPS.

## Do not translate

- Company and brand: **Čistá řešení**, WHITE ELEPHANT s.r.o., ASIO, ENVI-PUR, EKOCIS, ROTO, Elkoplast,
  vodohospodar.cz; product names and types (BioCleaner, BC 4 OPTIMA, BC 4 PP COMFORT, AS-MONOcomp 4,
  AS-VARIOcomp 5K, AS-ANASEP, AS-REWA, Roterra, Robox, RoCube, EASY E-DEEP 1200 X-RING, AQUAVISOR…).
- Place names (Tábor, Písek, Týn nad Vltavou, Stráž nad Nežárkou, Přehořov u Soběslavi…), personal names,
  e-mail addresses, phone numbers, addresses, IČ/DIČ numbers (write "Company ID (IČ)" / "VAT ID (DIČ)" only
  where the Czech has the words spelled out).
- Service programme names **STANDARD** and **PREMIUM**.
- Dates in titles stay as they are ("DČOV Vydří 11/2024" → "Domestic WWTP Vydří 11/2024").

## Glossary (use consistently)

| Czech | English |
|---|---|
| čistírna odpadních vod, ČOV | wastewater treatment plant, WWTP (spell out on first use in a body text, WWTP in titles, labels and menus) |
| domovní čistírna (odpadních vod), domovní ČOV, DČOV | domestic wastewater treatment plant, domestic WWTP |
| ČOV pro firmy a obce | WWTPs for businesses and municipalities |
| odpadní voda / splaškové vody, splašky | wastewater / sewage |
| dešťová voda, dešťovka | rainwater; as a project title "Dešťovka Mělník" → "Rainwater system Mělník" |
| hospodaření s dešťovou vodou | rainwater management |
| úpravna vody | water treatment system |
| čerpací technika / čerpací šachta / čerpací jímka / čerpací stanice | pumping technology / pump shaft / pumping sump / pumping station |
| jímka / žumpa / septik | tank (sump) / cesspit / septic tank |
| akumulační nádrž / nádrž | storage tank / tank |
| vsak, vsakování, vsakovací objekt | infiltration, soakaway |
| kanalizace / kanalizační přípojka | sewer, sewerage / sewer connection |
| kal / dmychadlo / řídicí jednotka | sludge / blower / control unit |
| realizace (projekt) | project, completed project; menu item "Realizace" → "Projects" |
| reference | references / projects |
| poptávka, poptat | enquiry, to enquire; button "Poptat řešení" → "Request a quote"; "Nezávazně poptat realizaci" → "Request a no-obligation quote"; "Poptat servis" → "Request service" |
| servis, servis a údržba | service, servicing and maintenance |
| pravidelný servis / servisní program | regular servicing / service programme |
| zprovoznění | commissioning |
| školení obsluhy | operator training |
| rekonstrukce / modernizace / intenzifikace | refurbishment / modernisation / capacity upgrade |
| montáž, instalace / dodávka | installation / supply |
| návrh / projektová dokumentace / povolení stavby | design / design documentation / building permit |
| na klíč | turnkey |
| svépomocí | DIY, self-installed |
| EO (ekvivalentní obyvatel) | PE (population equivalent) — "4 EO" → "4 PE" |
| domácnosti / firmy / průmysl / obce / rekreační zařízení | households / businesses / industry / municipalities / leisure facilities |
| obec (form field: where the property is) | town or village |
| nezávislý dodavatel vodohospodářských technologií | an independent supplier of water management technologies |
| Voda nemusí jen odtékat. | Water doesn't have to just drain away. |
| Od návrhu až po následný servis. | From design to after-sales service. |
| Více než 70 realizací | More than 70 completed projects |
| Návrh · Dodávka · Montáž · Servis | Design · Supply · Installation · Service |
| Servisujeme i zařízení, která jsme nedodávali. | We also service equipment we did not supply. |
| Jihočeský kraj / Praha a Středočeský kraj / Plzeňský kraj / Karlovarský kraj / Severní Čechy / Kraj Vysočina | South Bohemia / Prague and Central Bohemia / Plzeň Region / Karlovy Vary Region / North Bohemia / Vysočina Region |
| Zpracování osobních údajů | Personal data processing |
| Ke stažení / Galerie / O nás / Kontakt | Downloads / Gallery / About us / Contact |
| fotografie (caption "X — fotografie 3") | photo |

Address the reader as "you"; the company speaks as "we".
