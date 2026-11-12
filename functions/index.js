'use strict';
/**
 * Čistá řešení — Cloud Functions
 *
 * 1) onInquiryCreated   – po uložení poptávky pošle upozornění firmě a potvrzení zákazníkovi.
 * 2) onReferenceDeleted – po smazání reference odstraní její fotografie z úložiště.
 *
 * Odesílání e-mailů se zapíná tajným údajem SMTP_URL (Secret Manager), např.
 *   smtps://info%40cistareseni.cz:HESLO@smtp.example.com:465
 * Dokud má hodnotu "unset", poptávky se jen ukládají a v administraci je u nich
 * uvedeno, že e-mail nebyl odeslán. Postup je v docs/manualy/02-technicka-sprava.md.
 */
const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineSecret, defineString } = require('firebase-functions/params');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const nodemailer = require('nodemailer');
const { buildNotification, buildConfirmation } = require('./mail');

initializeApp();
setGlobalOptions({ region: 'europe-west3', maxInstances: 5 });

const SMTP_URL = defineSecret('SMTP_URL');
const MAIL_FROM = defineString('MAIL_FROM', { default: 'Čistá řešení <info@cistareseni.cz>' });
const NOTIFY_TO = defineString('NOTIFY_TO', { default: 'info@cistareseni.cz' });
const ADMIN_URL = defineString('ADMIN_URL', { default: 'https://majkpowa.github.io/cista-reseni/admin/' });

// Ochrana proti zneužití formuláře k rozesílání pošty: strop na počet e-mailů za hodinu.
const HOURLY_LIMIT = { notify: 60, confirm: 30 };

async function withinQuota(kind) {
  const db = getFirestore();
  const bucket = new Date().toISOString().slice(0, 13); // např. 2026-11-12T09
  const ref = db.doc(`system/mailQuota-${bucket}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const used = (snap.exists && snap.get(kind)) || 0;
    if (used >= HOURLY_LIMIT[kind]) return false;
    tx.set(ref, { [kind]: used + 1, expiresAt: new Date(Date.now() + 48 * 3600 * 1000) }, { merge: true });
    return true;
  });
}

exports.onInquiryCreated = onDocumentCreated(
  { document: 'inquiries/{inquiryId}', secrets: [SMTP_URL], retry: false },
  async event => {
    const snap = event.data;
    if (!snap) return;
    const inquiry = snap.data();
    const result = { notify: 'skipped', confirm: 'skipped', at: FieldValue.serverTimestamp() };
    const smtpUrl = (SMTP_URL.value() || '').trim();

    if (!smtpUrl || smtpUrl === 'unset') {
      result.notify = result.confirm = 'not_configured';
      logger.warn('SMTP_URL není nastaveno – poptávka je uložena, e-maily se neodeslaly.', { id: snap.id });
      await snap.ref.update({ mail: result });
      return;
    }

    const transport = nodemailer.createTransport(smtpUrl);
    const from = MAIL_FROM.value();
    const notifyTo = NOTIFY_TO.value();

    try {
      if (await withinQuota('notify')) {
        await transport.sendMail(buildNotification(inquiry, { from, to: notifyTo, adminUrl: ADMIN_URL.value() }));
        result.notify = 'sent';
      } else {
        result.notify = 'rate_limited';
      }
    } catch (error) {
      result.notify = 'error';
      result.notifyError = String(error && error.message || error).slice(0, 300);
      logger.error('Upozornění na poptávku se nepodařilo odeslat.', { id: snap.id, error: result.notifyError });
    }

    try {
      if (await withinQuota('confirm')) {
        await transport.sendMail(buildConfirmation(inquiry, { from, replyTo: notifyTo }));
        result.confirm = 'sent';
      } else {
        result.confirm = 'rate_limited';
      }
    } catch (error) {
      result.confirm = 'error';
      result.confirmError = String(error && error.message || error).slice(0, 300);
      logger.error('Potvrzení zákazníkovi se nepodařilo odeslat.', { id: snap.id, error: result.confirmError });
    }

    await snap.ref.update({ mail: result });
  },
);

exports.onReferenceDeleted = onDocumentDeleted('references/{referenceId}', async event => {
  const { referenceId } = event.params;
  // Pouze znaky, které generuje administrace; nic mimo složku dané reference.
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(referenceId)) return;
  try {
    await getStorage().bucket().deleteFiles({ prefix: `references/${referenceId}/` });
  } catch (error) {
    logger.error('Fotografie smazané reference se nepodařilo odstranit.', { referenceId, error: String(error) });
  }
});
