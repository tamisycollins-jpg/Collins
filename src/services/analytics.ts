import { DatabaseSchema, Vente, Arrivage, MouvementStock } from '../types';

export type PeriodFilter = 'AUJOURDHUI' | 'SEMAINE' | 'MOIS' | 'ANNEE' | 'TOUT' | 'PERSONNALISE';

export interface FinancialStats {
  // Sales
  nbVentes: number;
  nbArticlesVendus: number;
  totalVentes: number;
  totalEncaisseClient: number;
  resteAEncaisserClient: number;

  // Commissions (Notre part)
  commissionGeneree: number;
  commissionRecue: number;
  commissionRestante: number;

  // Fournisseur
  fournisseurDu: number;
  fournisseurVerse: number;
  fournisseurRestant: number;

  // Annulations
  nbVentesAnnulees: number;
  montantAnnule: number;
}

export interface StockStats {
  nbArticlesTotal: number;
  nbArticlesActifs: number;
  nbArticlesInactifs: number;
  quantiteTotaleEnStock: number;
  valeurTotaleStock: number;
  articlesEnRupture: number;
  articlesStockFaible: number;
}

export function filterDateInRange(dateStr: string, period: PeriodFilter, customStart?: string, customEnd?: string): boolean {
  if (period === 'TOUT') return true;
  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();

  if (period === 'AUJOURDHUI') {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  if (period === 'SEMAINE') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7; // Monday as 1
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
  }

  if (period === 'MOIS') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }

  if (period === 'ANNEE') {
    return date.getFullYear() === now.getFullYear();
  }

  if (period === 'PERSONNALISE') {
    if (!customStart && !customEnd) return true;
    const start = customStart ? new Date(customStart + 'T00:00:00') : new Date('1970-01-01');
    const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date('2100-01-01');
    return date >= start && date <= end;
  }

  return true;
}

export function computeFinancialStats(
  db: DatabaseSchema,
  period: PeriodFilter = 'AUJOURDHUI',
  customStart?: string,
  customEnd?: string
): FinancialStats {
  // Filter sales
  const filteredSales = db.ventes.filter((v) => filterDateInRange(v.date, period, customStart, customEnd));

  const validatedSales = filteredSales.filter((v) => v.status === 'VALIDEE');
  const cancelledSales = filteredSales.filter((v) => v.status === 'ANNULEE');

  const nbVentes = validatedSales.length;
  const nbArticlesVendus = validatedSales.reduce(
    (sum, v) => sum + v.lignes.reduce((lSum, l) => lSum + l.quantite, 0),
    0
  );
  const totalVentes = validatedSales.reduce((sum, v) => sum + v.totalVente, 0);
  const commissionGeneree = validatedSales.reduce((sum, v) => sum + v.commissionGeneree, 0);
  const fournisseurDu = validatedSales.reduce((sum, v) => sum + v.partFournisseur, 0);

  // Filter payments
  const filteredReglements = db.reglements.filter((r) => filterDateInRange(r.date, period, customStart, customEnd));

  const commissionRecue = filteredReglements
    .filter((r) => r.typePartie === 'COMMISSION')
    .reduce((sum, r) => sum + r.montant, 0);

  const fournisseurVerse = filteredReglements
    .filter((r) => r.typePartie === 'FOURNISSEUR')
    .reduce((sum, r) => sum + r.montant, 0);

  const totalEncaisseClient = validatedSales.reduce((sum, v) => sum + (v.montantPayeClient || 0), 0);
  const resteAEncaisserClient = Math.max(0, totalVentes - totalEncaisseClient);

  const commissionRestante = Math.max(0, commissionGeneree - commissionRecue);
  const fournisseurRestant = Math.max(0, fournisseurDu - fournisseurVerse);

  const nbVentesAnnulees = cancelledSales.length;
  const montantAnnule = cancelledSales.reduce((sum, v) => sum + v.totalVente, 0);

  return {
    nbVentes,
    nbArticlesVendus,
    totalVentes,
    totalEncaisseClient,
    resteAEncaisserClient,
    commissionGeneree,
    commissionRecue,
    commissionRestante,
    fournisseurDu,
    fournisseurVerse,
    fournisseurRestant,
    nbVentesAnnulees,
    montantAnnule,
  };
}

export function computeStockStats(db: DatabaseSchema): StockStats {
  const articles = db.articles;
  const nbArticlesTotal = articles.length;
  const nbArticlesActifs = articles.filter((a) => a.status === 'ACTIF').length;
  const nbArticlesInactifs = articles.filter((a) => a.status === 'INACTIF').length;

  const quantiteTotaleEnStock = articles.reduce((sum, a) => sum + a.stockActuel, 0);
  const valeurTotaleStock = articles.reduce((sum, a) => sum + a.stockActuel * a.prixVente, 0);

  const articlesEnRupture = articles.filter((a) => a.status === 'ACTIF' && a.stockActuel <= 0).length;
  const articlesStockFaible = articles.filter(
    (a) => a.status === 'ACTIF' && a.stockActuel > 0 && a.stockActuel <= a.seuilMin
  ).length;

  return {
    nbArticlesTotal,
    nbArticlesActifs,
    nbArticlesInactifs,
    quantiteTotaleEnStock,
    valeurTotaleStock,
    articlesEnRupture,
    articlesStockFaible,
  };
}
