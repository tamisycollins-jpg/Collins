import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  Calendar,
  Plus,
  ArrowRight,
  Receipt,
  Building2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { DatabaseSchema, Vente, Article, Parametres } from '../../types';
import {
  computeFinancialStats,
  computeStockStats,
  PeriodFilter,
} from '../../services/analytics';
import { formatMontant, formatDateTime, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';

interface DashboardViewProps {
  db: DatabaseSchema;
  parametres: Parametres;
  onNavigate: (tab: string) => void;
  onOpenNewSale: () => void;
  onSelectVenteForA6: (vente: Vente) => void;
}

export function DashboardView({
  db,
  parametres,
  onNavigate,
  onOpenNewSale,
  onSelectVenteForA6,
}: DashboardViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>('AUJOURDHUI');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const stats = computeFinancialStats(db, period, customStart, customEnd);
  const stockStats = computeStockStats(db);

  const recentSales = db.ventes.slice(0, 5);

  const getPeriodLabel = () => {
    switch (period) {
      case 'AUJOURDHUI':
        return "Aujourd'hui";
      case 'SEMAINE':
        return 'Cette semaine';
      case 'MOIS':
        return 'Ce mois';
      case 'ANNEE':
        return 'Cette année';
      case 'PERSONNALISE':
        return 'Période personnalisée';
      default:
        return 'Tout l’historique';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Welcome & Primary Action Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
              Dépositaire Auto
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              {parametres.nomEntreprise}
            </h1>
            <p className="text-xs text-slate-400">
              {parametres.slogan || 'Gestion des stocks, ventes et commissions'}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewSale}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer ring-2 ring-white/10"
          >
            <Plus className="w-5 h-5" />
            <span>➕ NOUVELLE VENTE</span>
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 border-t border-slate-800">
          <span className="text-slate-400 shrink-0 flex items-center gap-1 text-[11px] font-medium mr-1">
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
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom date range selector if active */}
        {period === 'PERSONNALISE' && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Date début :</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Date fin :</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* STOCK ALERTS BANNER IF ANY */}
      {(stockStats.articlesEnRupture > 0 || stockStats.articlesStockFaible > 0) && (
        <div
          onClick={() => onNavigate('stock')}
          className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-xs cursor-pointer hover:bg-amber-100/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-amber-900">
              <span className="font-bold">Alertes Stock :</span>{' '}
              {stockStats.articlesEnRupture > 0 && (
                <span className="font-semibold text-rose-700 mr-2">
                  🔴 {stockStats.articlesEnRupture} rupture(s)
                </span>
              )}
              {stockStats.articlesStockFaible > 0 && (
                <span className="font-semibold text-amber-800">
                  🟠 {stockStats.articlesStockFaible} stock faible
                </span>
              )}
            </div>
          </div>
          <span className="text-amber-800 font-bold flex items-center gap-0.5 shrink-0">
            Voir <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* 4 MAIN KPI CATEGORIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. VENTES DE LA PÉRIODE */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">VENTES ({getPeriodLabel()})</h2>
                <span className="text-[10px] text-slate-400 font-medium">Chiffre d'affaires brut</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ventes')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Historique ➔
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 font-medium block">Nombre</span>
              <div className="font-extrabold text-slate-900 text-base mt-0.5">
                {stats.nbVentes}
              </div>
              <span className="text-[9px] text-slate-400">{stats.nbArticlesVendus} pièces</span>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl col-span-2 text-left px-3">
              <span className="text-[10px] text-blue-700 font-semibold block">Montant Total</span>
              <div className="font-black text-blue-950 text-lg mt-0.5">
                {formatMontant(stats.totalVentes, parametres.devise)}
              </div>
              <span className="text-[9px] text-blue-600">
                Encaissé: {formatMontant(stats.totalEncaisseClient, parametres.devise)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. COMMISSIONS (NOTRE PART) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">NOTRE COMMISSION (10%)</h2>
                <span className="text-[10px] text-slate-400 font-medium">Bénéfice généré sur les ventes</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reglements')}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
            >
              Règlements ➔
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 font-medium block">Générée</span>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                {formatMontant(stats.commissionGeneree, parametres.devise)}
              </div>
            </div>

            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-semibold block">Reçue</span>
              <div className="font-extrabold text-emerald-700 text-sm mt-0.5">
                {formatMontant(stats.commissionRecue, parametres.devise)}
              </div>
            </div>

            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[10px] text-amber-800 font-semibold block">Restante</span>
              <div className="font-extrabold text-amber-800 text-sm mt-0.5">
                {formatMontant(stats.commissionRestante, parametres.devise)}
              </div>
            </div>
          </div>
        </div>

        {/* 3. FOURNISSEUR (PART 90%) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">PART FOURNISSEUR (90%)</h2>
                <span className="text-[10px] text-slate-400 font-medium">Montants à reverser</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reglements')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Détails ➔
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 font-medium block">Montant Dû</span>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                {formatMontant(stats.fournisseurDu, parametres.devise)}
              </div>
            </div>

            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] text-blue-700 font-semibold block">Reversé</span>
              <div className="font-extrabold text-blue-700 text-sm mt-0.5">
                {formatMontant(stats.fournisseurVerse, parametres.devise)}
              </div>
            </div>

            <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[10px] text-rose-700 font-semibold block">Restant</span>
              <div className="font-extrabold text-rose-700 text-sm mt-0.5">
                {formatMontant(stats.fournisseurRestant, parametres.devise)}
              </div>
            </div>
          </div>
        </div>

        {/* 4. ÉTAT DU STOCK */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">STOCK ACTUEL</h2>
                <span className="text-[10px] text-slate-400 font-medium">Inventaire en direct</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('stock')}
              className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
            >
              Inventaire ➔
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 font-medium block">Articles</span>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                {stockStats.nbArticlesActifs}
              </div>
              <span className="text-[9px] text-slate-400">{stockStats.quantiteTotaleEnStock} unités</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 font-medium block">Valeur Stock</span>
              <div className="font-extrabold text-slate-900 text-xs mt-0.5">
                {formatMontant(stockStats.valeurTotaleStock, parametres.devise)}
              </div>
            </div>

            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 font-medium block">Alertes</span>
              <div className="font-bold text-slate-900 text-xs mt-0.5">
                <span className="text-rose-600">🔴 {stockStats.articlesEnRupture}</span> /{' '}
                <span className="text-amber-600">🟠 {stockStats.articlesStockFaible}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT SALES LIST PREVIEW */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Dernières ventes enregistrées</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('ventes')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            Toutes les ventes ➔
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Aucune vente pour le moment. Cliquez sur "+ Nouvelle Vente" pour débuter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentSales.map((vente) => (
              <div
                key={vente.id}
                className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/50 rounded-lg px-1 transition-colors text-xs"
              >
                <div className="truncate flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-900">{vente.numeroFacture}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(vente.date)}</span>
                    {vente.status === 'ANNULEE' && (
                      <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded font-bold">
                        Annulée
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 font-medium truncate mt-0.5">
                    {vente.lignes.map((l) => `${l.quantite}x ${l.designation}`).join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      {formatMontant(vente.totalVente, parametres.devise)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      Com: {formatMontant(vente.commissionGeneree, parametres.devise)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectVenteForA6(vente)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Voir Facture A6"
                  >
                    <Receipt className="w-4 h-4 text-amber-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
