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
    { key: 'cov', label: 'Domovní ČOV' },
    { key: 'commercial', label: 'Firemní a průmyslové ČOV' },
    { key: 'servis', label: 'Servis' },
    { key: 'rekonstrukce', label: 'Rekonstrukce' },
    { key: 'destovka', label: 'Dešťová voda' },
    { key: 'upravny', label: 'Úpravny vody' },
    { key: 'cerpani', label: 'Čerpací technika' },
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
    poradit: 'Odborná konzultace'
  }
};
