import React, { useState } from 'react';
import {
  Printer,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Building2,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  FileBarChart,
  DollarSign,
} from 'lucide-react';
import { DatabaseSchema, Parametres } from '../../types';
import {
  computeFinancialStats,
  computeStockStats,
  PeriodFilter,
  filterDateInRange,
} from '../../services/analytics';
import { formatMontant, formatDate, formatDateTime } from '../../utils/formatters';

interface RapportsViewProps {
  db: DatabaseSchema;
  parametres: Parametres;
}

export function RapportsView({ db, parametres }: RapportsViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>('MOIS');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const stats = computeFinancialStats(db, period, customStart, customEnd);
  const stockStats = computeStockStats(db);

  // Top selling articles in period
  const filteredSales = db.ventes.filter(
    (v) => v.status === 'VALIDEE' && filterDateInRange(v.date, period, customStart, customEnd)
  );

  const articleSalesMap: Record<
    string,
    { reference: string; designation: string; qty: number; total: number }
  > = {};

  filteredSales.forEach((v) => {
    v.lignes.forEach((l) => {
      if (!articleSalesMap[l.articleId]) {
        articleSalesMap[l.articleId] = {
          reference: l.reference,
          designation: l.designation,
          qty: 0,
          total: 0,
        };
      }
      articleSalesMap[l.articleId].qty += l.quantite;
      articleSalesMap[l.articleId].total += l.totalLigne;
    });
  });

  const topArticles = Object.values(articleSalesMap).sort((a, b) => b.total - a.total);

  // Stock movements in period
  const filteredMovements = db.mouvements.filter((m) =>
    filterDateInRange(m.date, period, customStart, customEnd)
  );

  const entreesQty = filteredMovements
    .filter((m) => m.type === 'ARRIVAGE' || m.type === 'INITIAL' || m.type === 'ANNULATION_VENTE')
    .reduce((sum, m) => sum + Math.max(0, m.quantite), 0);

  const sortiesQty = filteredMovements
    .filter((m) => m.type === 'VENTE')
    .reduce((sum, m) => sum + Math.abs(m.quantite), 0);

  const handlePrintReport = () => {
    window.print();
  };

  const getPeriodTitle = () => {
    switch (period) {
      case 'AUJOURDHUI':
        return "Rapport d'activité du jour";
      case 'SEMAINE':
        return "Rapport d'activité de la semaine";
      case 'MOIS':
        return "Rapport d'activité du mois";
      case 'ANNEE':
        return "Rapport d'activité de l'année";
      case 'PERSONNALISE':
        return `Rapport d'activité (${formatDate(customStart)} au ${formatDate(customEnd)})`;
      default:
        return "Rapport d'activité Global";
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>📊 Rapports & Synthèse</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bilan d'activité dépositaire, flux de stock et ventilation financière
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintReport}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer le Rapport</span>
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 shrink-0 font-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Période :
          </span>
          {[
            { id: 'AUJOURDHUI', label: "Aujourd'hui" },
            { id: 'SEMAINE', label: 'Cette semaine' },
            { id: 'MOIS', label: 'Ce mois' },
            { id: 'ANNEE', label: 'Cette année' },
            { id: 'TOUT', label: 'Tout' },
            { id: 'PERSONNALISE', label: 'Personnalisé' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id as PeriodFilter)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                period === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {period === 'PERSONNALISE' && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Date début :</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Date fin :</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* PRINTABLE REPORT CONTAINER */}
      <div id="printable-rapport" className="space-y-4">
        {/* REPORT HEADER SUMMARY */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                {parametres.nomEntreprise}
              </span>
              <h2 className="text-lg font-black text-slate-950 mt-0.5">{getPeriodTitle()}</h2>
              <p className="text-xs text-slate-500">
                Généré le {formatDateTime(new Date().toISOString())}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Chiffre d'Affaires Brut</div>
              <div className="text-xl font-black text-slate-900">
                {formatMontant(stats.totalVentes, parametres.devise)}
              </div>
            </div>
          </div>

          {/* 3 Main Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>Commissions (10%)</span>
              </div>
              <div className="text-base font-extrabold text-emerald-950 mt-1">
                {formatMontant(stats.commissionGeneree, parametres.devise)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5 flex justify-between">
                <span>Reçue: {formatMontant(stats.commissionRecue, parametres.devise)}</span>
                <span>Reste: {formatMontant(stats.commissionRestante, parametres.devise)}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold">
                <Building2 className="w-4 h-4" />
                <span>Fournisseur (90%)</span>
              </div>
              <div className="text-base font-extrabold text-blue-950 mt-1">
                {formatMontant(stats.fournisseurDu, parametres.devise)}
              </div>
              <div className="text-[11px] text-blue-700 mt-0.5 flex justify-between">
                <span>Reversé: {formatMontant(stats.fournisseurVerse, parametres.devise)}</span>
                <span>Reste: {formatMontant(stats.fournisseurRestant, parametres.devise)}</span>
              </div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-purple-800 text-xs font-bold">
                <Package className="w-4 h-4" />
                <span>Flux de Stock</span>
              </div>
              <div className="text-base font-extrabold text-purple-950 mt-1">
                {stockStats.quantiteTotaleEnStock} pièces
              </div>
              <div className="text-[11px] text-purple-700 mt-0.5 flex justify-between">
                <span>Entrées: +{entreesQty}</span>
                <span>Sorties: -{sortiesQty}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TOP SELLING ARTICLES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
            <span>Palmarès des ventes de la période</span>
            <span className="text-xs font-normal text-slate-500">{topArticles.length} article(s) vendu(s)</span>
          </h3>

          {topArticles.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Aucune vente enregistrée sur cette période.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2 px-1">Réf</th>
                    <th className="py-2 px-1">Désignation</th>
                    <th className="py-2 px-1 text-center">Qté Vendue</th>
                    <th className="py-2 px-1 text-right">C.A Généré</th>
                    <th className="py-2 px-1 text-right">Commission (10%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topArticles.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-1 font-mono font-bold text-blue-900">{item.reference}</td>
                      <td className="py-2 px-1 font-semibold text-slate-900">{item.designation}</td>
                      <td className="py-2 px-1 text-center font-bold text-slate-800">{item.qty}</td>
                      <td className="py-2 px-1 text-right font-bold text-slate-900">
                        {formatMontant(item.total, parametres.devise)}
                      </td>
                      <td className="py-2 px-1 text-right font-bold text-emerald-700">
                        {formatMontant(Math.round(item.total * 0.1), parametres.devise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* STOCK INVENTORY HEALTH SUMMARY */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Synthèse Santé du Stock</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Articles au catalogue</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{stockStats.nbArticlesActifs}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Valeur totale stock</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {formatMontant(stockStats.valeurTotaleStock, parametres.devise)}
              </div>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-rose-700 font-medium">Articles en rupture</span>
              <div className="text-lg font-extrabold text-rose-700 mt-0.5">
                {stockStats.articlesEnRupture}
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-amber-800 font-medium">Stock faible</span>
              <div className="text-lg font-extrabold text-amber-800 mt-0.5">
                {stockStats.articlesStockFaible}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
