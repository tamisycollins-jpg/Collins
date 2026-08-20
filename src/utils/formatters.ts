import { Vente, Parametres } from '../types';

export function formatMontant(amount: number | undefined | null, devise: string = 'Ar'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `0 ${devise}`;
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${devise}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatDateHeureOnly(dateString: string | undefined | null): { date: string; heure: string } {
  if (!dateString) return { date: '-', heure: '-' };
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: dateString, heure: '-' };
    const date = d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const heure = d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { date, heure };
  } catch {
    return { date: dateString, heure: '-' };
  }
}

export function normalizeSearch(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function generateWhatsAppMessage(vente: Vente, params: Parametres): string {
  const { date, heure } = formatDateHeureOnly(vente.date);
  let msg = `*${params.nomEntreprise.toUpperCase()} - FACTURE ${vente.numeroFacture}*\n`;
  if (params.telephone) msg += `📞 Tél : ${params.telephone}\n`;
  msg += `📅 Date : ${date} à ${heure}\n`;
  if (vente.clientNom) msg += `👤 Client : ${vente.clientNom}\n`;
  msg += `--------------------------------\n`;
  msg += `*ARTICLES :*\n`;

  vente.lignes.forEach((l, i) => {
    msg += `${i + 1}. *${l.designation}* (Réf: ${l.reference})\n`;
    if (l.affectation) msg += `   Véhicule : ${l.affectation}\n`;
    msg += `   ${l.quantite} x ${formatMontant(l.prixUnitaire, params.devise)} = *${formatMontant(l.totalLigne, params.devise)}*\n`;
  });

  msg += `--------------------------------\n`;
  msg += `💰 *TOTAL : ${formatMontant(vente.totalVente, params.devise)}*\n`;
  msg += `💵 Payé : ${formatMontant(vente.montantPayeClient, params.devise)}\n`;
  if (vente.resteAPayerClient > 0) {
    msg += `⚠️ *Reste à payer : ${formatMontant(vente.resteAPayerClient, params.devise)}*\n`;
  } else {
    msg += `✅ *Statut : PAYÉ EN TOTALITÉ*\n`;
  }
  msg += `--------------------------------\n`;
  if (params.texteFacture) msg += `${params.texteFacture}\n`;
  if (params.conditionsVente) msg += `_${params.conditionsVente}_\n`;

  return encodeURIComponent(msg);
}
