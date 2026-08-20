import React, { useState } from 'react';
import { Search, Package, ShoppingCart, DollarSign, X, ArrowRight, Car, User } from 'lucide-react';
import { DatabaseSchema, Vente, Article, Reglement } from '../../types';
import { formatMontant, formatDate, normalizeSearch } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseSchema;
  onSelectArticle: (article: Article) => void;
  onSelectVente: (vente: Vente) => void;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  db,
  onSelectArticle,
  onSelectVente,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const normalized = normalizeSearch(query);

  const matchedArticles = query.trim()
    ? db.articles.filter(
        (a) =>
          normalizeSearch(a.reference).includes(normalized) ||
          normalizeSearch(a.designation).includes(normalized) ||
          normalizeSearch(a.affectation).includes(normalized)
      )
    : [];

  const matchedVentes = query.trim()
    ? db.ventes.filter(
        (v) =>
          normalizeSearch(v.numeroFacture).includes(normalized) ||
          (v.clientNom && normalizeSearch(v.clientNom).includes(normalized)) ||
          v.lignes.some(
            (l) =>
              normalizeSearch(l.reference).includes(normalized) ||
              normalizeSearch(l.designation).includes(normalized)
          )
      )
    : [];

  const matchedReglements = query.trim()
    ? db.reglements.filter(
        (r) =>
          normalizeSearch(r.numeroReglement).includes(normalized) ||
          (r.remarque && normalizeSearch(r.remarque).includes(normalized)) ||
          (r.pieceJustificative && normalizeSearch(r.pieceJustificative).includes(normalized))
      )
    : [];

  const hasResults =
    matchedArticles.length > 0 || matchedVentes.length > 0 || matchedReglements.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔍 Recherche Globale" maxWidth="lg">
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par référence, désignation, véhicule, N° facture, règlement..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results display */}
        {!query.trim() ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Tapez un mot-clé pour lancer la recherche en temps réel sur toute l'application.
          </div>
        ) : !hasResults ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Aucun résultat trouvé pour "{query}".
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* 1. ARTICLES MATCHES */}
            {matchedArticles.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Articles ({matchedArticles.length})</span>
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {matchedArticles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => {
                        onSelectArticle(art);
                        onClose();
                      }}
                      className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                            {art.reference}
                          </span>
                          <span className="font-bold text-slate-900">{art.designation}</span>
                        </div>
                        {art.affectation && (
                          <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                            <Car className="w-3 h-3 text-slate-400" />
                            <span>{art.affectation}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-slate-900">
                          {formatMontant(art.prixVente, db.parametres.devise)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Stock: <span className="font-bold">{art.stockActuel}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. VENTES MATCHES */}
            {matchedVentes.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ventes & Factures ({matchedVentes.length})</span>
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {matchedVentes.map((vente) => (
                    <div
                      key={vente.id}
                      onClick={() => {
                        onSelectVente(vente);
                        onClose();
                      }}
                      className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                            {vente.numeroFacture}
                          </span>
                          <span className="text-slate-400">{formatDate(vente.date)}</span>
                          {vente.status === 'ANNULEE' && (
                            <span className="text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded text-[10px]">
                              Annulée
                            </span>
                          )}
                        </div>
                        {vente.clientNom && (
                          <div className="text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{vente.clientNom}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-slate-900">
                          {formatMontant(vente.totalVente, db.parametres.devise)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">
                          Com: {formatMontant(vente.commissionGeneree, db.parametres.devise)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. REGLEMENTS MATCHES */}
            {matchedReglements.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                  <span>Règlements ({matchedReglements.length})</span>
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {matchedReglements.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-3 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {reg.numeroReglement}
                          </span>
                          <span className="text-slate-400">{formatDate(reg.date)}</span>
                          <span className="font-bold text-slate-600">({reg.typePartie})</span>
                        </div>
                        {reg.remarque && <div className="text-slate-500 italic mt-0.5">{reg.remarque}</div>}
                      </div>

                      <div className="font-extrabold text-slate-900">
                        {formatMontant(reg.montant, db.parametres.devise)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
