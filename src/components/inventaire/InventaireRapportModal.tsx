import React, { useRef } from 'react';
import { Inventaire, Parametres } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Printer, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Badge } from '../common/Badge';

interface InventaireRapportModalProps {
  inventaire: Inventaire;
  parametres: Parametres;
  onClose: () => void;
}

export function InventaireRapportModal({
  inventaire,
  parametres,
  onClose,
}: InventaireRapportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'CONFORME':
        return <Badge variant="success">Conforme</Badge>;
      case 'SURPLUS':
        return <Badge variant="info">Surplus (+)</Badge>;
      case 'MANQUANT':
        return <Badge variant="danger">Manquant (-)</Badge>;
      case 'NON_COMPTE':
      default:
        return <Badge variant="neutral">Non Compté</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Action Header (Hidden during print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Rapport d'Inventaire Physique {inventaire.numeroInventaire}
              </h3>
              <p className="text-xs text-slate-500">
                Document officiel de contrôle et réconciliation de stock
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800" ref={printRef}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-4 gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {parametres.nomEntreprise || 'CLINIC AUTO'}
              </h1>
              <p className="text-sm font-medium text-slate-600">
                {parametres.slogan || 'Gestion Dépositaire & Stock'}
              </p>
              {parametres.adresse && (
                <p className="text-xs text-slate-500 mt-1">{parametres.adresse}</p>
              )}
              {parametres.telephone && (
                <p className="text-xs text-slate-500">Tél : {parametres.telephone}</p>
              )}
            </div>
            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto border sm:border-0 border-slate-200">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-md uppercase tracking-wider mb-1">
                RAPPORT D'INVENTAIRE
              </div>
              <div className="text-lg font-mono font-black text-slate-900">
                {inventaire.numeroInventaire}
              </div>
              <div className="text-xs text-slate-600">
                Date : <span className="font-semibold">{formatDate(inventaire.date || inventaire.createdAt)}</span>
              </div>
              <div className="text-xs text-slate-600">
                Opérateur : <span className="font-semibold">{inventaire.utilisateur}</span>
              </div>
              <div className="text-xs mt-1">
                Statut :{' '}
                {inventaire.status === 'VALIDE' ? (
                  <span className="font-bold text-emerald-700">VALIDÉ & APPLIQUÉ</span>
                ) : (
                  <span className="font-bold text-amber-700">EN COURS (BROUILLON)</span>
                )}
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-500 uppercase">Articles Total</p>
              <p className="text-lg font-black text-slate-900">{inventaire.nbArticlesTotal}</p>
              <p className="text-[11px] text-slate-500">
                Comptés: <span className="font-bold text-blue-700">{inventaire.nbArticlesComptes}</span> | Non comptés: {inventaire.nbArticlesNonComptes}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-500 uppercase">Conformité</p>
              <p className="text-lg font-black text-emerald-700">{inventaire.nbArticlesConformes}</p>
              <p className="text-[11px] text-slate-500">
                Avec écart: <span className="font-bold text-rose-600">{inventaire.nbArticlesAvecEcart}</span>
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-500 uppercase">Quantités Écart</p>
              <p className="text-sm font-bold text-slate-900">
                <span className="text-rose-600 font-black">{inventaire.totalQuantiteManquante} manquants</span>
              </p>
              <p className="text-sm font-bold text-emerald-700">
                <span className="font-black">+{inventaire.totalQuantiteSurplus} surplus</span>
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-500 uppercase">Impact Financier Net</p>
              <p
                className={`text-base font-black ${
                  inventaire.valeurEcartNet < 0
                    ? 'text-rose-600'
                    : inventaire.valeurEcartNet > 0
                    ? 'text-emerald-700'
                    : 'text-slate-700'
                }`}
              >
                {formatCurrency(inventaire.valeurEcartNet, parametres.devise)}
              </p>
              <p className="text-[11px] text-slate-500">
                Perte: {formatCurrency(inventaire.valeurManquants, parametres.devise)}
              </p>
            </div>
          </div>

          {/* Notes if any */}
          {inventaire.notes && (
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
              <span className="font-bold">Observations : </span>
              {inventaire.notes}
            </div>
          )}

          {/* Table of Articles */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Réf / Code</th>
                  <th className="py-2.5 px-3">Désignation & Affectation</th>
                  <th className="py-2.5 px-2 text-right">Virtuel</th>
                  <th className="py-2.5 px-2 text-right">Réel</th>
                  <th className="py-2.5 px-2 text-right">Écart</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-right">Valeur Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inventaire.lignes.map((ligne) => {
                  const isCounted = ligne.stockReel !== null && ligne.stockReel !== undefined;
                  const ecart = ligne.ecart ?? 0;

                  return (
                    <tr
                      key={ligne.id}
                      className={
                        !isCounted
                          ? 'bg-slate-50/60 text-slate-400'
                          : ecart < 0
                          ? 'bg-rose-50/40'
                          : ecart > 0
                          ? 'bg-emerald-50/40'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {ligne.reference}
                        {ligne.codeBarre && (
                          <div className="text-[10px] text-slate-500 font-mono font-normal">
                            {ligne.codeBarre}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{ligne.designation}</div>
                        {ligne.affectation && (
                          <div className="text-[10px] text-slate-500">{ligne.affectation}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-slate-700">
                        {ligne.stockVirtuel}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                        {isCounted ? ligne.stockReel : '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold">
                        {isCounted ? (
                          <span
                            className={
                              ecart > 0
                                ? 'text-emerald-700'
                                : ecart < 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }
                          >
                            {ecart > 0 ? `+${ecart}` : ecart}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {getStatusBadge(ligne.statut)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {isCounted && ecart !== 0 ? (
                          <span className={ecart < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                            {formatCurrency(ligne.valeurEcart, parametres.devise)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0 {parametres.devise}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs border-t border-slate-300 print:mt-12">
            <div className="space-y-12">
              <p className="font-bold text-slate-800">Le Responsable d'Inventaire / Magasinier</p>
              <div className="border-b border-slate-300 w-48" />
              <p className="text-[11px] text-slate-500">Nom & Signature : {inventaire.utilisateur}</p>
            </div>
            <div className="space-y-12 text-right flex flex-col items-end">
              <p className="font-bold text-slate-800">La Direction / Gérance</p>
              <div className="border-b border-slate-300 w-48" />
              <p className="text-[11px] text-slate-500">Date et Visa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
