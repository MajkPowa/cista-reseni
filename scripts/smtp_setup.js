#!/usr/bin/env node
'use strict';
/**
 * Zapne automatické e-maily k poptávkám přes schránku na hostingu (nd-webs.cz).
 *
 *   node scripts/smtp_setup.js [schranka]        (výchozí: web@cistareseni.cz)
 *
 * 1. Zeptá se na heslo ke schránce (při psaní se nezobrazuje).
 * 2. Ověří přihlášení k SMTP serveru a pošle zkušební e-mail do té samé schránky.
 * 3. Teprve když obojí projde, uloží přístup do Firebase jako tajný údaj SMTP_URL.
 * Heslo nikam jinam nejde: nezapisuje se do souboru ani do repozitáře.
 * Potom je potřeba nasadit funkce: firebase deploy --only functions
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const nodemailer = require(path.join(__dirname, '..', 'functions', 'node_modules', 'nodemailer'));

const PROJECT = 'cista-reseni-20261112';
const SMTP_HOST = 'mail.nd-webs.cz'; // jméno z certifikátu poštovního serveru cistareseni.cz
const SMTP_PORT = 465;
const mailbox = (process.argv[2] || 'web@cistareseni.cz').trim();

function askHidden(question) {
  return new Promise(resolve => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    const onData = chunk => {
      chunk = chunk.replace(/\x1b\[20[01]~/g, ''); // značky vložení ze schránky
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') { value = value.slice(0, -1); continue; }
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

(async () => {
  if (!process.stdin.isTTY) {
    console.error('Spusťte v terminálu, heslo se zadává ručně.');
    process.exit(1);
  }
  console.log(`Schránka: ${mailbox}  (server ${SMTP_HOST}:${SMTP_PORT})`);
  const password = await askHidden('Heslo ke schránce (nezobrazuje se), pak Enter: ');
  if (!password) { console.error('Heslo je prázdné, nic se nezměnilo.'); process.exit(1); }

  const url = `smtps://${encodeURIComponent(mailbox)}:${encodeURIComponent(password)}@${SMTP_HOST}:${SMTP_PORT}`;
  const transport = nodemailer.createTransport(url);
  try {
    await transport.verify();
    console.log('✓ Přihlášení k poštovnímu serveru funguje.');
    await transport.sendMail({
      from: `Čistá řešení <${mailbox}>`,
      to: mailbox,
      subject: 'Zkouška odesílání z webu cistareseni.cz',
      text: 'Tento e-mail poslal skript scripts/smtp_setup.js při zapínání automatických e-mailů k poptávkám. Můžete ho smazat.',
    });
    console.log(`✓ Zkušební e-mail odeslán do ${mailbox}.`);
  } catch (error) {
    console.error(`✗ Nepodařilo se: ${error && error.message || error}`);
    console.error('Zkontrolujte, že schránka existuje a heslo je správné. Ve Firebase se nic nezměnilo.');
    process.exit(1);
  }

  const result = spawnSync('firebase', ['functions:secrets:set', 'SMTP_URL', '--data-file', '-', '--project', PROJECT],
    { input: url, stdio: ['pipe', 'inherit', 'inherit'], shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error('✗ Uložení do Firebase selhalo (přihlášení do Firebase CLI: firebase login).');
    process.exit(1);
  }
  console.log('✓ Přístup je uložen ve Firebase (tajný údaj SMTP_URL). Zbývá nasadit funkce.');
})();
