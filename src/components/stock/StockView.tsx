import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  History,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { Article, MouvementStock, Parametres } from '../../types';
import { formatMontant, formatDateTime, normalizeSearch } from '../../utils/formatters';
import { Badge } from '../common/Badge';

interface StockViewProps {
  articles: Article[];
  mouvements: MouvementStock[];
  parametres: Parametres;
  onOpenNewArrivalForArticle?: (article: Article) => void;
  onOpenNewSaleForArticle?: (article: Article) => void;
}

export function StockView({
  articles,
  mouvements,
  parametres,
  onOpenNewArrivalForArticle,
  onOpenNewSaleForArticle,
}: StockViewProps) {
  const [activeTab, setActiveTab] = useState<'ETAT' | 'MOUVEMENTS'>('ETAT');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'TOUS' | 'RUPTURE' | 'FAIBLE' | 'NORMAL'>('TOUS');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('TOUS');

  // Compute stats
  const totalArticles = articles.filter((a) => a.status === 'ACTIF').length;
  const totalPieces = articles
    .filter((a) => a.status === 'ACTIF')
    .reduce((sum, a) => sum + a.stockActuel, 0);
  const valeurTotale = articles
    .filter((a) => a.status === 'ACTIF')
    .reduce((sum, a) => sum + a.stockActuel * a.prixVente, 0);
  const rupturesCount = articles.filter((a) => a.status === 'ACTIF' && a.stockActuel <= 0).length;
  const stockFaibleCount = articles.filter(
    (a) => a.status === 'ACTIF' && a.stockActuel > 0 && a.stockActuel <= a.seuilMin
  ).length;

  // Filter articles
  const filteredArticles = articles.filter((art) => {
    if (art.status !== 'ACTIF') return false;

    // Stock alert filter
    if (stockFilter === 'RUPTURE' && art.stockActuel > 0) return false;
    if (stockFilter === 'FAIBLE' && (art.stockActuel <= 0 || art.stockActuel > art.seuilMin))
      return false;
    if (stockFilter === 'NORMAL' && art.stockActuel <= art.seuilMin) return false;

    if (!searchTerm.trim()) return true;
    const term = normalizeSearch(searchTerm);
    return (
      normalizeSearch(art.reference).includes(term) ||
      normalizeSearch(art.designation).includes(term) ||
      normalizeSearch(art.affectation).includes(term)
    );
  });

  // Filter movements
  const filteredMouvements = mouvements.filter((m) => {
    if (movementTypeFilter !== 'TOUS' && m.type !== movementTypeFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = normalizeSearch(searchTerm);
    return (
      normalizeSearch(m.articleReference).includes(term) ||
      normalizeSearch(m.articleDesignation).includes(term) ||
      (m.referenceDoc && normalizeSearch(m.referenceDoc).includes(term)) ||
      (m.motif && normalizeSearch(m.motif).includes(term))
    );
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'INITIAL':
        return <Badge variant="neutral">Initial</Badge>;
      case 'ARRIVAGE':
        return <Badge variant="success">+ Arrivage</Badge>;
      case 'VENTE':
        return <Badge variant="danger">- Vente</Badge>;
      case 'ANNULATION_VENTE':
        return <Badge variant="warning">+ Annulation Vente</Badge>;
      case 'AJUSTEMENT':
        return <Badge variant="info">Ajustement</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>📦 Gestion du Stock</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Inventaire en temps réel et journal de traçabilité des mouvements
            </p>
          </div>

          {/* Sub-tabs Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ETAT')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ETAT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>État du Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MOUVEMENTS')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'MOUVEMENTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Mouvements ({mouvements.length})</span>
            </button>
          </div>
        </div>

        {/* Global Stock KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Articles Actifs</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{totalArticles}</div>
            <span className="text-[10px] text-slate-400 font-medium">{totalPieces} unités au total</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Valeur du Stock</span>
            <div className="text-base sm:text-lg font-extrabold text-blue-900 mt-0.5">
              {formatMontant(valeurTotale, parametres.devise)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Prix de vente public</span>
          </div>

          <div
            onClick={() => {
              setActiveTab('ETAT');
              setStockFilter(stockFilter === 'RUPTURE' ? 'TOUS' : 'RUPTURE');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              rupturesCount > 0
                ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/70'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <span className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
              <span>🔴</span> Ruptures (0)
            </span>
            <div className="text-lg font-extrabold text-rose-700 mt-0.5">{rupturesCount}</div>
            <span className="text-[10px] text-rose-500 font-medium">Articles indisponibles</span>
          </div>

          <div
            onClick={() => {
              setActiveTab('ETAT');
              setStockFilter(stockFilter === 'FAIBLE' ? 'TOUS' : 'FAIBLE');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              stockFaibleCount > 0
                ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <span className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
              <span>🟠</span> Stock Faible
            </span>
            <div className="text-lg font-extrabold text-amber-800 mt-0.5">{stockFaibleCount}</div>
            <span className="text-[10px] text-amber-600 font-medium">À réapprovisionner</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'ETAT'
                ? 'Rechercher un article, référence, véhicule...'
                : 'Filtrer les mouvements par référence, motif, N° facture...'
            }
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        {activeTab === 'ETAT' ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
              <Filter className="w-3.5 h-3.5" /> État :
            </span>
            <button
              type="button"
              onClick={() => setStockFilter('TOUS')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                stockFilter === 'TOUS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({totalArticles})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('RUPTURE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                stockFilter === 'RUPTURE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🔴 Rupture ({rupturesCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('FAIBLE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                stockFilter === 'FAIBLE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              🟠 Stock Faible ({stockFaibleCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('NORMAL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                stockFilter === 'NORMAL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🟢 Disponible (
              {totalArticles - rupturesCount - stockFaibleCount})
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
              <Filter className="w-3.5 h-3.5" /> Type :
            </span>
            {['TOUS', 'ARRIVAGE', 'VENTE', 'ANNULATION_VENTE', 'INITIAL'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMovementTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  movementTypeFilter === t
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'TOUS' ? 'Tous' : t === 'ANNULATION_VENTE' ? 'Annulations' : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: ETAT DU STOCK */}
      {activeTab === 'ETAT' && (
        <div className="space-y-3">
          {filteredArticles.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700">Aucun article dans cette sélection</div>
              <p className="text-xs text-slate-500">Modifiez votre recherche ou les filtres d'alerte.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredArticles.map((article) => {
                const isOutOfStock = article.stockActuel <= 0;
                const isLowStock = !isOutOfStock && article.stockActuel <= article.seuilMin;
                const articleValuation = article.stockActuel * article.prixVente;

                return (
                  <div
                    key={article.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-blue-900 px-2 py-0.5 rounded-md border border-slate-200">
                          {article.reference}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                            <span>🔴</span> Rupture
                          </span>
                        ) : isLowStock ? (
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <span>🟠</span> Faible (Seuil: {article.seuilMin})
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span>🟢</span> En stock
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm">{article.designation}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {article.affectation ? `Véhicule: ${article.affectation}` : 'Affectation universelle'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Stock disponible</span>
                        <div className="text-xl font-extrabold text-slate-900 flex items-baseline gap-1">
                          <span>{article.stockActuel}</span>
                          <span className="text-xs font-normal text-slate-500">pièces</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-medium">Valeur en stock</span>
                        <div className="text-sm font-bold text-slate-800">
                          {formatMontant(articleValuation, parametres.devise)}
                        </div>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2">
                      {onOpenNewArrivalForArticle && (
                        <button
                          type="button"
                          onClick={() => onOpenNewArrivalForArticle(article)}
                          className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                        >
                          + Arrivage
                        </button>
                      )}
                      {onOpenNewSaleForArticle && article.stockActuel > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenNewSaleForArticle(article)}
                          className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Vendre
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MOUVEMENTS DE STOCK */}
      {activeTab === 'MOUVEMENTS' && (
        <div className="space-y-2.5">
          {filteredMouvements.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700">Aucun mouvement de stock</div>
              <p className="text-xs text-slate-500">
                Chaque arrivage, vente et annulation sera tracé ici automatiquement.
              </p>
            </div>
          ) : (
            filteredMouvements.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getMovementBadge(m.type)}
                    <span className="font-mono font-bold text-blue-900 bg-slate-100 px-1.5 py-0.5 rounded">
                      {m.articleReference}
                    </span>
                    <span className="text-slate-400 font-medium">{formatDateTime(m.date)}</span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm">{m.articleDesignation}</div>

                  {m.motif && (
                    <div className="text-slate-500 italic bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      {m.motif}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-slate-400 font-medium">Trajectoire</span>
                    <div className="font-mono font-semibold text-slate-700">
                      {m.stockAvant} ➔ <span className="font-bold text-slate-900">{m.stockApres}</span>
                    </div>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <span className="text-slate-400 font-medium">Impact</span>
                    <div
                      className={`text-base font-extrabold flex items-center justify-end gap-0.5 ${
                        m.quantite > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.quantite > 0 ? (
                        <>
                          <ArrowUpRight className="w-4 h-4" />+{m.quantite}
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-4 h-4" />
                          {m.quantite}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
