import { Vente, Parametres } from '../types';
import { formatMontant, formatDateHeureOnly } from './formatters';

export type PrintFormat = 'A6' | 'TICKET_80MM' | 'A4';

export function printDirectInvoice(vente: Vente, parametres: Parametres, format: PrintFormat = 'A6') {
  const { date, heure } = formatDateHeureOnly(vente.date);
  const isAnnulee = vente.status === 'ANNULEE';

  const widthMm = format === 'TICKET_80MM' ? '76mm' : format === 'A6' ? '100mm' : '180mm';
  const fontSize = format === 'TICKET_80MM' ? '11px' : '12px';

  // Create an isolated printable iframe to guarantee perfect margins and zero offset clipping
  let iframe = document.getElementById('kospam-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'kospam-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Facture ${vente.numeroFacture}</title>
  <style>
    @page {
      size: ${format === 'TICKET_80MM' ? '80mm auto' : format === 'A6' ? '105mm 148mm' : 'A4'};
      margin: ${format === 'TICKET_80MM' ? '2mm' : '4mm 4.5mm'};
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      height: 100%;
      background: #fff;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${fontSize};
      color: #0f172a;
      line-height: 1.25;
      padding: ${format === 'TICKET_80MM' ? '4px' : '2px 4px'};
      width: ${widthMm};
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: ${format === 'A6' ? '138mm' : 'auto'};
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    
    .top-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .header {
      text-align: center;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .company-name {
      font-size: ${format === 'TICKET_80MM' ? '15px' : '18px'};
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #020617;
    }
    .company-sub {
      font-size: 10px;
      color: #475569;
      margin-top: 1px;
    }
    .company-sub.italic {
      font-style: italic;
    }
    .header-divider {
      border: 0;
      border-top: 1px solid #1e293b;
      margin-top: 6px;
    }

    .meta-box {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      margin-bottom: 10px;
      border-radius: 6px;
      background: #f8fafc;
      font-size: 11px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .facture-title {
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.3px;
    }
    .facture-num {
      font-weight: 900;
      color: #1e3a8a;
      font-family: monospace, sans-serif;
      font-size: 12px;
    }
    .facture-status-valid {
      color: #047857;
      font-weight: 700;
      font-size: 11px;
    }
    .facture-status-cancel {
      color: #dc2626;
      font-weight: 900;
      font-size: 11px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    th {
      border-bottom: 1.5px solid #0f172a;
      padding: 4px 2px;
      font-size: 10.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
    }
    td {
      padding: 5px 2px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      font-size: 11px;
    }
    .col-des { width: 48%; }
    .col-qty { width: 12%; text-align: center; font-weight: 800; }
    .col-pu { width: 20%; text-align: right; }
    .col-tot { width: 20%; text-align: right; font-weight: 900; color: #020617; }

    .item-name {
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.2;
    }
    .item-ref {
      font-size: 9px;
      color: #64748b;
      font-family: monospace, sans-serif;
      text-transform: uppercase;
      margin-top: 1px;
    }

    /* Bottom Total & Footer placement */
    .bottom-section {
      margin-top: auto;
      padding-top: 8px;
      border-top: 2px solid #0f172a;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
      font-size: 11.5px;
    }
    .grand-total {
      font-size: ${format === 'TICKET_80MM' ? '14px' : '15px'};
      font-weight: 900;
      color: #020617;
      margin-bottom: 5px;
    }
    .grand-total-amount {
      font-size: ${format === 'TICKET_80MM' ? '15px' : '16px'};
      font-weight: 900;
      font-family: monospace, sans-serif;
    }
    .paid-amount {
      color: #047857;
      font-weight: 700;
    }
    .due-amount {
      color: #b91c1c;
      font-weight: 900;
    }
    .settled-status {
      color: #047857;
      font-weight: 700;
    }

    .footer {
      margin-top: 8px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      text-align: center;
      font-size: 9.5px;
      color: #475569;
    }
    .footer-thanks {
      font-weight: 700;
      color: #334155;
      margin-bottom: 1px;
    }
    .footer-conditions {
      font-style: italic;
      font-size: 8.5px;
      color: #64748b;
    }
    .footer-stamp {
      margin-top: 3px;
      font-size: 8px;
      color: #94a3b8;
      font-family: monospace;
    }

    .watermark-cancelled {
      color: #dc2626;
      font-size: 20px;
      font-weight: 900;
      text-align: center;
      border: 3px solid #dc2626;
      padding: 4px;
      margin-bottom: 8px;
      text-transform: uppercase;
      border-radius: 6px;
      background: #fef2f2;
    }
  </style>
</head>
<body>
  <div class="top-container">
    ${isAnnulee ? '<div class="watermark-cancelled">*** FACTURE ANNULÉE ***</div>' : ''}

    <div class="header">
      <div class="company-name uppercase">${parametres.nomEntreprise || 'CLINIC AUTO'}</div>
      ${parametres.slogan ? `<div class="company-sub italic">${parametres.slogan}</div>` : ''}
      <div class="company-sub">
        ${parametres.adresse ? `<div>${parametres.adresse}</div>` : ''}
        ${parametres.telephone ? `<div>Tél : ${parametres.telephone}</div>` : ''}
        ${parametres.email ? `<div>Email : ${parametres.email}</div>` : ''}
      </div>
      <hr class="header-divider" />
    </div>

    <div class="meta-box">
      <div class="meta-row">
        <span class="facture-title">FACTURE N°</span>
        <span class="facture-num">${vente.numeroFacture}</span>
      </div>
      <div class="meta-row">
        <span style="color: #475569;">Date : ${date} à ${heure}</span>
        ${
          isAnnulee
            ? '<span class="facture-status-cancel">ANNULÉE</span>'
            : '<span class="facture-status-valid">VALIDÉE</span>'
        }
      </div>
      ${
        vente.clientNom
          ? `
      <div class="meta-row" style="margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 3px;">
        <span style="color: #64748b;">Client :</span>
        <span style="font-weight: 700; color: #0f172a;">${vente.clientNom} ${vente.clientTelephone ? `(${vente.clientTelephone})` : ''}</span>
      </div>
      `
          : ''
      }
    </div>

    <table>
      <thead>
        <tr>
          <th class="text-left col-des">DÉSIGNATION</th>
          <th class="col-qty">QTÉ</th>
          <th class="col-pu">P.U</th>
          <th class="col-tot">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${vente.lignes
          .map(
            (l) => `
          <tr>
            <td class="col-des">
              <div class="item-name">${l.designation}</div>
              <div class="item-ref">Réf: ${l.reference} ${l.affectation ? `• ${l.affectation}` : ''}</div>
            </td>
            <td class="col-qty">${l.quantite}</td>
            <td class="col-pu">${formatMontant(l.prixUnitaire, '')}</td>
            <td class="col-tot">${formatMontant(l.totalLigne, '')}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="bottom-section">
    <div class="total-row grand-total">
      <span>TOTAL GÉNÉRAL :</span>
      <span class="grand-total-amount">${formatMontant(vente.totalVente, parametres.devise)}</span>
    </div>
    <div class="total-row">
      <span style="color: #475569;">Montant Payé :</span>
      <span class="paid-amount">${formatMontant(vente.montantPayeClient, parametres.devise)}</span>
    </div>
    ${
      vente.resteAPayerClient > 0
        ? `
      <div class="total-row due-amount">
        <span>Reste à Payer :</span>
        <span>${formatMontant(vente.resteAPayerClient, parametres.devise)}</span>
      </div>
    `
        : `
      <div class="total-row settled-status">
        <span>Règlement :</span>
        <span>Soldé / Payé</span>
      </div>
    `
    }

    <div class="footer">
      ${parametres.texteFacture ? `<div class="footer-thanks">${parametres.texteFacture}</div>` : ''}
      ${parametres.conditionsVente ? `<div class="footer-conditions">${parametres.conditionsVente}</div>` : ''}
      <div class="footer-stamp">
        Édité le ${date} ${heure} • ${format === 'TICKET_80MM' ? '80mm' : 'A6'}
      </div>
    </div>
  </div>
</body>
</html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 250);
}
