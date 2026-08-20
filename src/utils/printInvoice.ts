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
      margin: ${format === 'TICKET_80MM' ? '2mm' : '4mm'};
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${fontSize};
      color: #000;
      background: #fff;
      line-height: 1.25;
      padding: ${format === 'TICKET_80MM' ? '4px' : '10px'};
      width: ${widthMm};
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .company-name {
      font-size: ${format === 'TICKET_80MM' ? '14px' : '16px'};
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .company-sub {
      font-size: 10px;
      color: #333;
      margin-top: 2px;
    }

    .meta-box {
      border: 1px solid #000;
      padding: 6px;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    th {
      border-bottom: 1.5px solid #000;
      padding: 4px 2px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    td {
      padding: 4px 2px;
      border-bottom: 1px dashed #ccc;
      vertical-align: top;
      font-size: 11px;
    }
    .col-des { width: 50%; }
    .col-qty { width: 12%; text-align: center; }
    .col-pu { width: 18%; text-align: right; }
    .col-tot { width: 20%; text-align: right; font-weight: bold; }

    .totals {
      border-top: 2px solid #000;
      padding-top: 6px;
      margin-top: 4px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 12px;
    }
    .grand-total {
      font-size: ${format === 'TICKET_80MM' ? '14px' : '15px'};
      font-weight: 900;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 0;
      margin: 4px 0;
    }

    .footer {
      margin-top: 10px;
      border-top: 1px solid #ddd;
      padding-top: 6px;
      text-align: center;
      font-size: 9px;
      color: #444;
    }
    .watermark-cancelled {
      color: #cc0000;
      font-size: 24px;
      font-weight: 900;
      text-align: center;
      border: 3px solid #cc0000;
      padding: 4px;
      margin-bottom: 6px;
      text-transform: uppercase;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  ${isAnnulee ? '<div class="watermark-cancelled">*** FACTURE ANNULÉE ***</div>' : ''}

  <div class="header">
    <div class="company-name uppercase">${parametres.nomEntreprise || 'CLINIC AUTO'}</div>
    ${parametres.slogan ? `<div class="company-sub">${parametres.slogan}</div>` : ''}
    <div class="company-sub">
      ${parametres.telephone ? `Tél : ${parametres.telephone}` : ''}
      ${parametres.adresse ? ` • ${parametres.adresse}` : ''}
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-row">
      <span class="font-bold">FACTURE N° :</span>
      <span class="font-bold">${vente.numeroFacture}</span>
    </div>
    <div class="meta-row">
      <span>Date : ${date}</span>
      <span>Heure : ${heure}</span>
    </div>
    ${
      vente.clientNom
        ? `
    <div class="meta-row" style="margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 3px;">
      <span class="font-bold">Client :</span>
      <span>${vente.clientNom} ${vente.clientTelephone ? `(${vente.clientTelephone})` : ''}</span>
    </div>
    `
        : ''
    }
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-left col-des">Désignation</th>
        <th class="col-qty">Qté</th>
        <th class="col-pu">P.U</th>
        <th class="col-tot">Total</th>
      </tr>
    </thead>
    <tbody>
      ${vente.lignes
        .map(
          (l) => `
        <tr>
          <td class="col-des">
            <div class="font-bold">${l.designation}</div>
            <div style="font-size: 9px; color: #555;">Réf: ${l.reference} ${l.affectation ? `• ${l.affectation}` : ''}</div>
          </td>
          <td class="col-qty font-bold">${l.quantite}</td>
          <td class="col-pu">${formatMontant(l.prixUnitaire, '')}</td>
          <td class="col-tot">${formatMontant(l.totalLigne, '')}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row grand-total">
      <span>TOTAL GÉNÉRAL :</span>
      <span>${formatMontant(vente.totalVente, parametres.devise)}</span>
    </div>
    <div class="total-row">
      <span>Montant Reçu / Payé :</span>
      <span class="font-bold">${formatMontant(vente.montantPayeClient, parametres.devise)}</span>
    </div>
    ${
      vente.resteAPayerClient > 0
        ? `
      <div class="total-row" style="color: #990000; font-weight: bold;">
        <span>Reste à Payer :</span>
        <span>${formatMontant(vente.resteAPayerClient, parametres.devise)}</span>
      </div>
    `
        : `
      <div class="total-row" style="font-size: 10px; color: #006600;">
        <span>Statut Règlement :</span>
        <span>Soldé / Totalement Payé</span>
      </div>
    `
    }
  </div>

  <div class="footer">
    ${parametres.texteFacture ? `<div>${parametres.texteFacture}</div>` : ''}
    ${parametres.conditionsVente ? `<div style="font-style: italic; margin-top: 2px;">${parametres.conditionsVente}</div>` : ''}
    <div style="margin-top: 4px; font-size: 8px; color: #777;">
      Édité le ${date} à ${heure} • KOSPAM GESTION
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
