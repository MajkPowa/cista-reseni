'use strict';
// Společné nastavení redakčního systému (veřejný web i administrace).
// Hodnoty níže jsou veřejné identifikátory Firebase projektu, ne tajné klíče —
// přístup k datům řídí pravidla ve firestore.rules a storage.rules.
window.CR_CMS = {
  projectId: 'cista-reseni-20261112',
  apiKey: 'AIzaSyB0rKe6KMHOP9AmO3BDfMnQQGpgsWh1nPA',
  authDomain: 'cista-reseni-20261112.firebaseapp.com',
  storageBucket: 'cista-reseni-20261112.firebasestorage.app',
  appId: '1:447610071813:web:7bab307d247e7da7c2a56c',
  messagingSenderId: '447610071813',

  // Přepněte na true až po nastavení SMTP (viz docs/manualy/02-technicka-sprava.md).
  // Web pak zákazníkovi po odeslání poptávky slíbí potvrzovací e-mail.
  confirmationEmail: false,

  // Výchozí kategorie referencí; správce je může v administraci přejmenovat a doplnit.
  categories: [
    { key: 'cov', label: 'Domovní čistírny odpadních vod' },
    { key: 'commercial', label: 'Firemní a průmyslové ČOV' },
    { key: 'rekonstrukce', label: 'Rekonstrukce a intenzifikace ČOV' },
    { key: 'upravny', label: 'Úpravny pitné a technologické vody' },
    { key: 'destovka', label: 'Hospodaření s dešťovou vodou' },
    { key: 'cerpani', label: 'Čerpací stanice a související technologie' },
    { key: 'servis', label: 'Servisní zásahy' },
    { key: 'ostatni', label: 'Další řešení' }
  ],

  // Typy poptávek (shodné s formulářem na úvodní stránce a s pravidly databáze).
  services: {
    cov: 'Domovní čistírna',
    cov_firmy: 'ČOV pro firmy a obce',
    servis: 'Servis nebo oprava ČOV',
    zprovozneni: 'Zprovoznění ČOV',
    skoleni: 'Školení obsluhy ČOV',
    rekonstrukce: 'Rekonstrukce a modernizace ČOV',
    destovka: 'Dešťová voda',
    cerpani: 'Čerpací technika',
    upravna: 'Úpravna vody',
    komplex: 'Komplexní řešení',
    pravidelny_servis: 'Pravidelný servis ČOV',
    poradit: 'Odborná konzultace'
  },

  // Druhy poptávek (tři formuláře na úvodní stránce) a servisní programy.
  inquiryKinds: { realizace: 'Nová realizace', servis: 'Servis a opravy', pravidelny: 'Pravidelný servis' },
  programs: { standard: 'STANDARD', premium: 'PREMIUM' }
};
