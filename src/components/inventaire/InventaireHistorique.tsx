import React, { useState, useMemo } from 'react';
import { Inventaire, Parametres } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Search,
  FileText,
  Printer,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Package,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface InventaireHistoriqueProps {
  inventaires: Inventaire[];
  parametres: Parametres;
  onSelectInventaire: (inventaire: Inventaire) => void;
  onPrintInventaire: (inventaire: Inventaire) => void;
}

export function InventaireHistorique({
  inventaires,
  parametres,
  onSelectInventaire,
  onPrintInventaire,
}: InventaireHistoriqueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'VALIDE' | 'EN_COURS'>('TOUS');

  const filteredInventaires = useMemo(() => {
    return inventaires.filter((inv) => {
      const matchStatus = statusFilter === 'TOUS' || inv.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        inv.numeroInventaire.toLowerCase().includes(term) ||
        (inv.utilisateur && inv.utilisateur.toLowerCase().includes(term)) ||
        (inv.notes && inv.notes.toLowerCase().includes(term));
      return matchStatus && matchSearch;
    });
  }, [inventaires, searchTerm, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par numéro, opérateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['TOUS', 'VALIDE', 'EN_COURS'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'TOUS' ? 'Tous les inventaires' : filter === 'VALIDE' ? 'Validés' : 'En cours (Brouillons)'}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List */}
      {filteredInventaires.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun inventaire trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || statusFilter !== 'TOUS'
              ? 'Aucun résultat ne correspond à vos filtres de recherche.'
              : 'Vous n’avez pas encore réalisé d’inventaire physique.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredInventaires.map((inv) => {
            const isValidated = inv.status === 'VALIDE';

            return (
              <div
                key={inv.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Left block: info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-base text-slate-900">
                      {inv.numeroInventaire}
                    </span>
                    {isValidated ? (
                      <Badge variant="success" size="sm">
                        <CheckCircle className="w-3 h-3" /> Validé
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        <Clock className="w-3 h-3" /> En cours
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(inv.date || inv.createdAt)}
                    </span>
                    {inv.utilisateur && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {inv.utilisateur}
                      </span>
                    )}
                  </div>

                  {/* Summary counts */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>
                      Articles : <strong>{inv.nbArticlesComptes}</strong> / {inv.nbArticlesTotal} comptés
                    </span>
                    <span>
                      Conformes : <strong className="text-emerald-700">{inv.nbArticlesConformes}</strong>
                    </span>
                    <span>
                      Avec écart : <strong className="text-rose-600">{inv.nbArticlesAvecEcart}</strong>
                    </span>
                  </div>

                  {inv.notes && (
                    <p className="text-xs text-slate-500 italic line-clamp-1">
                      Note : {inv.notes}
                    </p>
                  )}
                </div>

                {/* Right block: financial impact & buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Écart Net</p>
                    <p
                      className={`text-sm font-black font-mono ${
                        inv.valeurEcartNet < 0
                          ? 'text-rose-600'
                          : inv.valeurEcartNet > 0
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {formatCurrency(inv.valeurEcartNet, parametres.devise)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPrintInventaire(inv)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="Imprimer le rapport"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectInventaire(inv)}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      <span>{isValidated ? 'Consulter' : 'Reprendre'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
