import React from 'react';
import { Inventaire, Parametres } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { AlertTriangle, CheckCircle, Lock, X } from 'lucide-react';

interface InventaireValidationModalProps {
  inventaire: Inventaire;
  parametres: Parametres;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InventaireValidationModal({
  inventaire,
  parametres,
  onConfirm,
  onCancel,
  isLoading = false,
}: InventaireValidationModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">
                Validation définitive de l'inventaire
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Voulez-vous valider cet inventaire physique ?
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warning Message Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs sm:text-sm text-amber-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              Action irréversible sur les stocks :
            </p>
            <p className="text-xs leading-relaxed text-amber-800">
              Les écarts constatés modifieront <strong>directement et immédiatement</strong> les stocks réels des articles comptés. Des mouvements de régularisation <strong>« AJUSTEMENT INVENTAIRE »</strong> seront automatiquement créés dans le grand livre des stocks.
            </p>
            <p className="text-[11px] text-amber-700 italic">
              * Les articles non comptés (champ vide) ne seront pas modifiés.
            </p>
          </div>

          {/* Summary Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span>Numéro :</span>
              <span className="font-mono font-bold text-slate-900">{inventaire.numeroInventaire}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Articles comptés :</span>
              <span className="font-bold text-blue-700">
                {inventaire.nbArticlesComptes} / {inventaire.nbArticlesTotal}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Articles conformes (sans écart) :</span>
              <span className="font-bold text-emerald-700">{inventaire.nbArticlesConformes}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Articles avec ajustement de stock :</span>
              <span className="font-bold text-rose-600">{inventaire.nbArticlesAvecEcart}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-semibold">
              <span className="text-slate-800">Écart financier net :</span>
              <span
                className={`font-mono text-sm font-bold ${
                  inventaire.valeurEcartNet < 0
                    ? 'text-rose-600'
                    : inventaire.valeurEcartNet > 0
                    ? 'text-emerald-700'
                    : 'text-slate-700'
                }`}
              >
                {formatCurrency(inventaire.valeurEcartNet, parametres.devise)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Validation en cours...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmer & Appliquer les stocks</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
