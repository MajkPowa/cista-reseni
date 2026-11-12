'use strict';
// Sestavení e-mailů k poptávce. Čisté funkce bez přístupu k síti — dají se testovat samostatně.

const SERVICE_LABELS = {
  cov: 'Domovní čistírna',
  cov_firmy: 'ČOV pro firmy a obce',
  servis: 'Servis nebo oprava ČOV',
  zprovozneni: 'Zprovoznění ČOV',
  skoleni: 'Školení obsluhy ČOV',
  rekonstrukce: 'Rekonstrukce a modernizace ČOV',
  destovka: 'Dešťová voda',
  cerpani: 'Čerpací technika',
  poradit: 'Odborná konzultace',
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));
// Hlavičky e-mailu nesmí obsahovat zalomení řádku (ochrana proti podvržení hlaviček).
const oneLine = (value, limit = 200) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit);

function inquiryRows(inquiry) {
  const service = SERVICE_LABELS[inquiry.service] || oneLine(inquiry.serviceLabel) || 'Poptávka';
  const rows = [['Řešení', service], ['Obec', inquiry.location]];
  if (inquiry.manufacturer) rows.push(['Výrobce', inquiry.manufacturer]);
  if (inquiry.deviceType) rows.push(['Typ zařízení', inquiry.deviceType]);
  rows.push(['Jméno', inquiry.name], ['E-mail', inquiry.email]);
  if (inquiry.phone) rows.push(['Telefon', inquiry.phone]);
  if (inquiry.message) rows.push(['Zpráva', inquiry.message]);
  return { service, rows: rows.map(([label, value]) => [label, String(value ?? '').trim()]) };
}

const textTable = rows => rows.map(([label, value]) => `${label}: ${value}`).join('\n');
const htmlTable = rows => '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px">' +
  rows.map(([label, value]) => `<tr><td style="padding:8px 16px 8px 0;border-bottom:1px solid #d8e3ef;color:#546d88;font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px 0;border-bottom:1px solid #d8e3ef;color:#042752;font-size:14px;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join('') +
  '</table>';

const wrap = (title, inner) => `<!doctype html><html lang="cs"><body style="margin:0;background:#f5f9ff;font-family:Segoe UI,Arial,sans-serif;color:#042752"><div style="max-width:600px;margin:0 auto;padding:28px 20px"><p style="margin:0 0 18px;font-size:12px;letter-spacing:.14em;font-weight:700;color:#237c03">ČISTÁ ŘEŠENÍ</p><div style="background:#ffffff;border:1px solid #d8e3ef;border-radius:10px;padding:26px 24px"><h1 style="margin:0 0 14px;font-size:21px;line-height:1.25;font-weight:600">${escapeHtml(title)}</h1>${inner}</div><p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#546d88">WHITE ELEPHANT s.r.o. · Kpt. Jaroše 24, Klokoty, 390 03 Tábor<br>+420 736 403 795 · info@cistareseni.cz</p></div></body></html>`;

/** E-mail pro firmu: nová poptávka z webu. */
function buildNotification(inquiry, { from, to, adminUrl }) {
  const { service, rows } = inquiryRows(inquiry);
  const name = oneLine(inquiry.name, 100);
  const link = adminUrl ? `\n\nPoptávku najdete v administraci: ${adminUrl}` : '';
  return {
    from,
    to,
    replyTo: { name, address: oneLine(inquiry.email) },
    subject: oneLine(`Nová poptávka: ${service} – ${name}, ${oneLine(inquiry.location, 80)}`, 180),
    text: `Z webu přišla nová poptávka.\n\n${textTable(rows)}${link}\n\nNa tento e-mail můžete rovnou odpovědět – odpověď půjde zákazníkovi.`,
    html: wrap('Nová poptávka z webu', `${htmlTable(rows)}<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#546d88">Na tento e-mail můžete rovnou odpovědět – odpověď půjde zákazníkovi.</p>${adminUrl ? `<p style="margin:16px 0 0"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#3ea215;color:#042752;font-weight:600;text-decoration:none;padding:11px 18px;border-radius:6px;font-size:14px">Otevřít v administraci</a></p>` : ''}`),
  };
}

/** E-mail pro zákazníka: potvrzení, že poptávka dorazila. */
function buildConfirmation(inquiry, { from, replyTo }) {
  const { service, rows } = inquiryRows(inquiry);
  const greeting = 'Dobrý den,';
  const intro = 'děkujeme za Vaši poptávku. Přijali jsme ji a ozveme se Vám co nejdříve, obvykle do dvou pracovních dnů.';
  const outro = 'Pokud je to naléhavé, zavolejte nám na +420 736 403 795.';
  return {
    from,
    to: { name: oneLine(inquiry.name, 100), address: oneLine(inquiry.email) },
    replyTo,
    subject: oneLine(`Potvrzení přijetí poptávky – ${service}`, 180),
    text: `${greeting}\n\n${intro}\n\nShrnutí Vaší poptávky:\n${textTable(rows)}\n\n${outro}\n\nS pozdravem\nČistá řešení\nWHITE ELEPHANT s.r.o.\ninfo@cistareseni.cz`,
    html: wrap('Děkujeme, Vaši poptávku jsme přijali', `<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#546d88">${greeting}<br>${intro}</p><p style="margin:0 0 8px;font-size:12px;letter-spacing:.1em;font-weight:700">SHRNUTÍ POPTÁVKY</p>${htmlTable(rows)}<p style="margin:20px 0 0;font-size:14px;line-height:1.65;color:#546d88">${outro}</p><p style="margin:16px 0 0;font-size:14px;line-height:1.65;color:#042752">S pozdravem<br><strong>Čistá řešení</strong></p>`),
  };
}

module.exports = { SERVICE_LABELS, buildNotification, buildConfirmation, inquiryRows, oneLine, escapeHtml };
