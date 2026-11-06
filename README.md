# Čistá řešení — návrh nového webu

Responzivní český návrh pro firmu Čistá řešení (WHITE ELEPHANT s.r.o.). Publikováno samostatně na GitHub Pages; původní doména není měněna.

## Náhled

https://majkpowa.github.io/cista-reseni/

## Co funguje

- Mobilní navigace, detaily čtyř oblastí služeb v dialogu a předvyplnění zvoleného řešení.
- Filtrování skutečných realizací s odkazy na původní podrobnosti.
- Rozbalovací odpovědi na otázky.
- Dvoukrokový ukázkový formulář s validací, souhrnem a volitelným otevřením e-mailové aplikace.
- Odkazy pro telefon a e-mail, ovládání klávesnicí, podpora omezeného pohybu.

Formulář neposílá data na server a nic neukládá. Ukázka neobsahuje analytické nebo reklamní trackery, API klíče ani zákaznická data. Před ostrým provozem je nutné připojit skutečný příjem poptávek, evidenci jejich výsledku a dokončit informační obsah pro zpracování údajů. Referenční obsah je lokální ověřený výběr, nejde o automatickou synchronizaci.

## Vzhled a obsah

Petrolejová, krémová a světlá zelená; lokálně hostované písmo Manrope (licence přiložena). Symbol slona pochází z existujícího lokálního návrhu vodní značky White Elephant; sestava s názvem Čistá řešení je návrhová. Náladový hero je AI ilustrační vizualizace, na stránce je označený. Reference a fotografie firmy jsou ze současného webu, nikoli generované realizace. Zdroje jsou v docs/assets-sources.json; prompt a původ hero jsou v dist/assets/hero-provenance.txt.

## Lokální spuštění

```sh
python -m http.server 4187 --directory dist
```

## Nasazení

GitHub Actions při pushi do main publikuje pouze dist/ na GitHub Pages. Není třeba sestavování ani instalace závislostí. Návrh má noindex, nofollow. Současný produkční web zůstává na cistareseni.cz.
