# Čistá řešení — technická správa a provoz

Manuál pro dodavatele webu (vývojáře). Popisuje architekturu, přístupy, nasazení,
zapnutí e-mailů, zálohy a přechod na ostrou doménu. Manuál pro klienta je v administraci
pod odkazem **Nápověda** (`dist/admin/napoveda.html`).

Stav k 12. 11. 2026.

## 1. Architektura

| Část | Kde běží | K čemu |
|---|---|---|
| Veřejný web (statické HTML, CSS, JS) | GitHub Pages, repozitář `MajkPowa/cista-reseni`, složka `dist/` | Vše, co vidí návštěvník |
| Administrace | tentýž web, `dist/admin/` | Správa referencí, poptávek, kategorií a správců |
| Databáze | Firebase Firestore, projekt `cista-reseni-20261112`, region `europe-west3` (Frankfurt) | Reference, poptávky, nastavení, seznam správců |
| Fotografie nových referencí | Firebase Storage, bucket `cista-reseni-20261112.firebasestorage.app` | Snímky nahrané v administraci |
| Přihlášení | Firebase Authentication (e-mail + heslo) | Účty správců |
| E-maily a úklid | Cloud Functions 2. generace, `europe-west3`, Node 22 | Upozornění na poptávku, potvrzení zákazníkovi, mazání fotek smazané reference |

Web je dál statický. Stránky generuje `scripts/build_content.py`; obsah spravovaný
v administraci do nich za běhu doplňuje `dist/site-data.js` přes Firestore REST API
(bez knihoven). Když se data nenačtou, zůstane vidět statický výpis.

### Datový model (Firestore)

- `references/{id}` — `title`, `location`, `date` (`RRRR-MM`), `sortDate`, `categories[]`,
  `summary`, `description`, `facts[{label,value}]`, `photos[{url,thumb,w,h,path?,thumbPath?}]`,
  `cover{url,thumb,w,h}`, `coverNote`, `published`, `featured`, `headline`, `legacyUrl`,
  `dynamic`, `createdAt`, `updatedAt`, `updatedBy`.
  - Původních 41 referencí má ID `legacy-<číslo>` a `legacyUrl` na statickou stránku.
    Dokud je `dynamic: false`, výpis odkazuje na statický detail. Po obsahové úpravě
    v administraci se nastaví `dynamic: true` a statická stránka návštěvníka přesměruje
    na `realizace/detail.html?id=…`. Skrytá nebo smazaná reference přesměruje na výpis.
- `inquiries/{id}` — `service`, `serviceLabel`, `location`, `manufacturer`, `deviceType`,
  `name`, `email`, `phone`, `message`, `page`, `status`, `createdAt`; správce doplňuje
  `status`, `note`, `updatedAt`, `updatedBy`; funkce doplňuje `mail{notify,confirm,at}`.
- `settings/site` — `categories[{key,label}]`.
- `admins/{e-mail malými písmeny}` — kdo smí do administrace.
- `system/*` — počitadla pro omezení e-mailů; klientům uzavřené.

### Oprávnění

`firestore.rules` a `storage.rules`. Veřejnost čte jen zveřejněné reference a nastavení
a smí založit poptávku v přesně daném tvaru (stav `new`, serverový čas, omezené délky).
Správce = přihlášený uživatel s **ověřeným** e-mailem, který má dokument v `admins/`.
Registrovat se může kdokoli, ale bez záznamu v `admins/` nevidí nic.

## 2. Přístupy a vlastnictví

| Co | Kdo má přístup | Poznámka |
|---|---|---|
| GitHub repozitář `MajkPowa/cista-reseni` | účet MajkPowa | Zdrojové kódy a nasazení webu |
| Firebase / Google Cloud projekt `cista-reseni-20261112` | Google účet dodavatele (vlastník) | Billing účet „ZooSedlec“; klienta lze přidat jako dalšího vlastníka v IAM |
| Administrace webu | e-maily v kolekci `admins/` | Spravuje se v administraci, záložka Správci |
| Doména `cistareseni.cz` | klient / jeho registrátor | Návrh ji zatím nepoužívá |

Předání klientovi: v Google Cloud konzoli přidejte jeho Google účet do IAM projektu s rolí
Vlastník a billing přepojte na jeho platební účet; repozitář lze převést přes
*Settings → Transfer ownership*.

## 3. Lokální vývoj

```sh
python -m pip install Pillow==12.1.0 requests==2.32.5 beautifulsoup4
python scripts/restore_media.py            # jen po čerstvém klonu
python scripts/build_content.py            # přegeneruje stránky v dist/
python scripts/check_site.py && python scripts/validate_content.py
python -m http.server 4187 --directory dist
```

Administrace a formulář proti lokálním emulátorům (vyžaduje Javu 21+ a `firebase-tools`):

```sh
firebase emulators:start --only auth,firestore,storage
python scripts/seed_firestore.py --emulator --admin test@example.test
bash scripts/test_rules.sh                 # 15 kontrol veřejné části pravidel
```

V prohlížeči na `http://localhost:4187` spusťte v konzoli
`localStorage.setItem('crEmulator','1')` a stránku obnovte. Web i administrace pak
mluví s emulátory místo produkce (funguje jen na localhostu). Ověřovací e-maily
emulátoru jsou na `http://127.0.0.1:9099/emulator/v1/projects/cista-reseni-20261112/oobCodes`.
Vypnutí: `localStorage.removeItem('crEmulator')`.

## 4. Nasazení

**Web:** push do větve `main` → GitHub Actions (`.github/workflows/pages.yml`) obnoví média,
zkontroluje stránky a publikuje `dist/` na GitHub Pages.

**Backend** (jen při změně pravidel nebo funkcí):

```sh
firebase deploy --only firestore:rules,storage --project cista-reseni-20261112
firebase deploy --only functions --project cista-reseni-20261112
```

**Naplnění databáze** (jednorázově, opakované spuštění nic nepřepíše):

```sh
python scripts/seed_firestore.py --admin info@cistareseni.cz
```

`--force` přepíše i existující dokumenty — tím by se zahodily úpravy z administrace.

## 5. Zapnutí automatických e-mailů

Funkce `onInquiryCreated` po každé nové poptávce pošle upozornění na `NOTIFY_TO`
a potvrzení zákazníkovi. Dokud má tajný údaj `SMTP_URL` hodnotu `unset`, jen k poptávce
zapíše `mail: not_configured` a v administraci je u ní poznámka, že e-mail neodešel.

1. Získejte SMTP přístup ke schránce, ze které se má odesílat (ideálně `info@cistareseni.cz`
   po přechodu na Google Workspace nebo Microsoft 365; u obou je potřeba heslo aplikace
   nebo SMTP relay).
2. Nastavte tajný údaj — hodnotu zadáváte vy, do repozitáře nepatří:
   ```sh
   firebase functions:secrets:set SMTP_URL --project cista-reseni-20261112
   ```
   Tvar: `smtps://UZIVATEL:HESLO@SERVER:465` (znak `@` v uživateli zapište jako `%40`).
   Příklady serverů: `smtp.gmail.com:465`, `smtp.office365.com:587` (pak `smtp://…:587`).
3. Případně upravte odesílatele a příjemce v `functions/.env` (`MAIL_FROM`, `NOTIFY_TO`, `ADMIN_URL`).
4. Nasaďte funkce: `firebase deploy --only functions --project cista-reseni-20261112`.
5. Odešlete zkušební poptávku a ověřte, že dorazily oba e-maily.
6. V `dist/cms-config.js` přepněte `confirmationEmail` na `true`, spusťte
   `python scripts/build_content.py` a pushněte. Teprve pak web zákazníkovi po odeslání
   slíbí potvrzovací e-mail.

Ochrana proti zneužití: nejvýše 60 upozornění a 30 potvrzení za hodinu
(`HOURLY_LIMIT` ve `functions/index.js`), skryté pole a časová past ve formuláři.
Pro ostrý provoz zvažte Firebase App Check (reCAPTCHA Enterprise).

## 6. Zálohy a obnova

- **Kód a statický obsah:** historie Gitu na GitHubu.
- **Původní média:** obnovitelná skriptem `scripts/restore_media.py` z manifestu s kontrolními součty.
- **Databáze:** denní zálohy Firestore s uchováním 7 dní jsou zapnuté od 12. 11. 2026
  (`gcloud firestore backups schedules list --database="(default)" --project=cista-reseni-20261112`).
  Seznam záloh: `gcloud firestore backups list --project=cista-reseni-20261112`.
  Obnova do nové databáze: `gcloud firestore databases restore --source-backup=<záloha> --destination-database=<název>`.
  Ruční export: `gcloud firestore export gs://<bucket>/<složka>`.
- **Fotografie ve Storage:** v bucketu lze zapnout verzování objektů
  (`gcloud storage buckets update gs://cista-reseni-20261112.firebasestorage.app --versioning`).
- **Poptávky:** správce si je může kdykoli stáhnout jako CSV v administraci.

Verzování bucketu s fotografiemi zatím zapnuté není.

## 7. Zabezpečení a aktualizace

- Web je statický: žádný server, redakční systém ani pluginy, které by bylo nutné záplatovat.
- HTTPS zajišťuje GitHub Pages a Google.
- Správci se přihlašují vlastním e-mailem a heslem (min. 10 znaků), e-mail musí být ověřený.
- Klíče v `dist/cms-config.js` jsou veřejné identifikátory projektu, ne tajné údaje;
  data chrání pravidla. Tajný je jen `SMTP_URL` (Secret Manager).
- Aktualizace: jednou za čas `npm update` ve `functions/` a zvýšení verze Firebase SDK
  v `dist/admin/admin.js` (adresy `gstatic.com/firebasejs/<verze>/`), poté test v emulátoru.

## 8. Provozní náklady infrastruktury

| Položka | Orientačně |
|---|---|
| GitHub Pages | 0 Kč |
| Firebase (Firestore, Storage, Auth, Functions) při tomto provozu | v řádu jednotek Kč měsíčně, většinou 0 Kč; platí se podle skutečné spotřeby |
| Doména `cistareseni.cz` | podle registrátora, obvykle nižší stovky Kč ročně |
| Firemní e-mail (Google Workspace / Microsoft 365) | podle aktuálního ceníku poskytovatele, za schránku a měsíc |

Doporučeno nastavit v Google Cloud rozpočtové upozornění na projekt (Billing → Budgets & alerts).
Zatím nastavené není.

## 9. Přechod na ostrou doménu

1. Dokončit obsah a nechat klienta zkontrolovat `zpracovani-udaju.html` (pracovní text).
2. Odstranit `noindex, nofollow` a pruh „Návrh nového webu“ (`scripts/build_content.py`,
   `scripts/site_shell.py`, `dist/index.html`), upravit `og:image` adresy.
3. V repozitáři nastavit vlastní doménu (Settings → Pages) a u registrátora DNS záznamy
   podle dokumentace GitHub Pages.
4. Přidat doménu mezi autorizované domény Firebase Authentication
   (konzole → Authentication → Settings → Authorized domains).
5. Upravit `ADMIN_URL` ve `functions/.env` a nasadit funkce.
6. Zapnout e-maily (kapitola 5).

## 10. Řešení potíží

| Příznak | Kde hledat |
|---|---|
| Web neukazuje nové reference | Konzole prohlížeče (varování „data z administrace se nepodařilo načíst“), stav Firestore, pravidla |
| Správce se nedostane dovnitř | Je jeho e-mail v `admins/` malými písmeny? Má ověřený e-mail? (Authentication → Users) |
| Nejdou nahrát fotografie | `storage.rules`; role `roles/firebaserules.firestoreServiceAgent` pro účet `service-447610071813@gcp-sa-firebasestorage.iam.gserviceaccount.com` |
| E-maily neodcházejí | Pole `mail` u poptávky; logy funkce: `firebase functions:log --only onInquiryCreated --project cista-reseni-20261112` |
| Nasazení webu selhalo | GitHub → Actions → poslední běh „Publish website preview“ |

## 11. Rozšíření z 13. 11. 2026

### Poptávky: tři formuláře a přílohy
- Formulář na úvodní stránce má tři typy (`kind`): `realizace`, `servis`, `pravidelny`; u pravidelného servisu se ukládá `program` (`standard` / `premium`). Seznam služeb je v `dist/cms-config.js` (`services`), ve `firestore.rules` (`validInquiry`) a ve `functions/mail.js` – při přidání služby upravte všechna tři místa.
- Přílohy (fotografie, PDF; nejvýše 5 souborů po 10 MB) se nahrávají do Storage pod `inquiries/<id poptávky>/`. Návštěvník smí soubor jen jednou vytvořit, číst a mazat smí pouze správci (`storage.rules`). Fotografie se v prohlížeči před odesláním zmenší.
- Funkce `onInquiryDeleted` po smazání poptávky odstraní i její přílohy.
- Riziko: nahrávat může kdokoli bez přihlášení (jinak by formulář nefungoval). Omezuje to typ a velikost souboru; pro ostrý provoz zvažte Firebase App Check.

### Návštěvnost
- `dist/site-data.js` (`countVisit`) na každé stránce přičte jedničku do dokumentu `stats/<RRRR-MM-DD>`: `views`, skupina stránky (`home`, `sluzby`, `servis`, `reference`, `realizace`, `kontakt`, `ostatni`) a `visits` při příchodu odjinud. Bez cookies, bez identifikátorů; nepočítá localhost, roboty a prohlížeče s „nesledovat“.
- Pravidla dovolují veřejnosti jen přičtení 1 k povoleným počitadlům; číst smí správci. Čísla lze uměle navýšit, slouží jen jako orientační ukazatel. Zobrazují se v administraci v záložce Statistiky.
- Pro podrobnou analytiku (zdroje, klíčová slova) lze doplnit Google Analytics 4 nebo jiný nástroj – vyžaduje účet klienta a souhlasovou lištu.

### Vyhledávače (SEO)
- Úvodní stránka má titulek a popis s hlavními výrazy a strukturovaná data `LocalBusiness` (JSON-LD).
- Web je stále náhled: `INDEXABLE=False` ve `scripts/build_content.py` drží `noindex`. Po přechodu na ostrou doménu nastavte `SITE_URL` a `INDEXABLE=True` a spusťte build: stránky dostanou `index, follow` a kanonickou adresu a vznikne `sitemap.xml` a `robots.txt` (administrace a CRM jsou v něm zakázané).

### Úvodní video
- Tlačítko „Přehrát video“ v úvodu otevře dialog; soubor se stahuje až po kliknutí (`preload="none"`), takže načtení stránky nezpomaluje. Na telefonu na výšku se použije svislá verze.
- Soubory: `dist/assets/video/cista-reseni-16x9.mp4`, `cista-reseni-9x16.mp4` a dva plakáty. Po novém renderu je vytvořte znovu:
  ```sh
  ffmpeg -y -i final.mp4 -vf "scale=1280:720,fps=30" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k dist/assets/video/cista-reseni-16x9.mp4
  ffmpeg -y -i final_9x16.mp4 -vf "scale=720:1280,fps=30" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k dist/assets/video/cista-reseni-9x16.mp4
  ```

### CRM
- Aplikace je v `dist/crm/` (`index.html`, `crm.css`, `crm.js`, `manifest.webmanifest`), adresa `/crm/`. Stejné přihlášení a stejný seznam uživatelů jako administrace (`admins/`).
- Kolekce: `customers`, `devices`, `jobs`, `tasks`, `activities`; čte také `inquiries` (převod poptávky na zákazníka a zakázku) a `admins`. Pravidla: plný přístup jen pro správce.
- Uživatele přidáte v administraci (Správci) nebo skriptem; e-maily nikdy neukládejte do repozitáře.

### Ukázkový režim CRM
- Záznam `admins/<e-mail>` s `role: "demo"` dává přístup jen do CRM nad kolekcemi `demoCustomers`, `demoDevices`, `demoJobs`, `demoTasks`, `demoActivities` a `demoInquiries`. Pravidla (`isAdmin` vyžaduje jinou roli než `demo`) mu ostrá data, seznam uživatelů, statistiky i Storage uzavírají.
- Ukázkový účet nepotvrzuje e-mail, takže jeho heslo chrání jen smyšlená data. Nikdy tuto roli nedávejte účtu, který má vidět skutečné zákazníky.
- Smyšlená data naplní nebo obnoví `python scripts/seed_demo.py` (smaže stávající ukázková data a zapíše výchozí); `--demo-user <e-mail>` rovnou přidá ukázkového uživatele. Totéž jde v administraci v záložce Správci.
