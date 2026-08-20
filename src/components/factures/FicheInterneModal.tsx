import React, { useRef } from 'react';
import { Printer, FileText, Share2, Mail, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { Vente, Parametres } from '../../types';
import { formatMontant, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface FicheInterneModalProps {
  isOpen: boolean;
  onClose: () => void;
  vente: Vente | null;
  parametres: Parametres;
}

export function FicheInterneModal({
  isOpen,
  onClose,
  vente,
  parametres,
}: FicheInterneModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!vente) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Bordereau Vente Interne ${vente.numeroFacture} - ${parametres.nomEntreprise}`);
    const body = encodeURIComponent(
      `Bordereau Interne ${vente.numeroFacture}\n` +
      `Date: ${formatDateTime(vente.date)}\n` +
      `Total Vente: ${formatMontant(vente.totalVente, parametres.devise)}\n` +
      `Notre Commission (${vente.tauxCommission}%): ${formatMontant(vente.commissionGeneree, parametres.devise)}\n` +
      `Part Fournisseur (${100 - vente.tauxCommission}%): ${formatMontant(vente.partFournisseur, parametres.devise)}\n` +
      `Statut: ${vente.status}\n`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <span>Fiche Interne Dépositaire</span>
          <span className="text-xs bg-indigo-100 text-indigo-800 font-mono font-semibold px-2 py-0.5 rounded-md">
            {vente.numeroFacture}
          </span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer la Fiche</span>
          </button>
          <button
            type="button"
            onClick={handleEmail}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>
        </div>

        {/* Printable Internal Sheet */}
        <div
          ref={printRef}
          id="printable-fiche-interne"
          className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs sm:text-sm"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Document de Gestion Interne
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">{parametres.nomEntreprise}</h2>
              <p className="text-xs text-slate-500">Date de saisie : {formatDateTime(vente.date)}</p>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-base text-slate-900">{vente.numeroFacture}</div>
              <div className="mt-1">
                {vente.status === 'VALIDEE' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Validée
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" /> Annulée le {formatDateTime(vente.annuleeAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Client & Metadata */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Client :</span>{' '}
              <span className="font-semibold text-slate-800">{vente.clientNom || 'Client comptoir'}</span>
              {vente.clientTelephone && <div className="text-slate-600">Tél: {vente.clientTelephone}</div>}
            </div>
            <div>
              <span className="text-slate-500 font-medium">Taux Commission :</span>{' '}
              <span className="font-bold text-indigo-600">{vente.tauxCommission} %</span>
            </div>
          </div>

          {/* Lines Table */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
              Détail des pièces vendues
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Réf</th>
                    <th className="p-2">Désignation</th>
                    <th className="p-2">Véhicule</th>
                    <th className="p-2 text-center">Qté</th>
                    <th className="p-2 text-right">P.U</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vente.lignes.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-medium">{l.reference}</td>
                      <td className="p-2 font-semibold text-slate-900">{l.designation}</td>
                      <td className="p-2 text-slate-600">{l.affectation || '-'}</td>
                      <td className="p-2 text-center font-bold">{l.quantite}</td>
                      <td className="p-2 text-right">{formatMontant(l.prixUnitaire, parametres.devise)}</td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {formatMontant(l.totalLigne, parametres.devise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FINANCIAL REPARTITION (NOTRE COMMISSION VS FOURNISSEUR) */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Répartition Financière & Dépositaire
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-xs font-medium">Total Vente Brut</div>
                <div className="text-base font-extrabold text-white mt-1">
                  {formatMontant(vente.totalVente, parametres.devise)}
                </div>
              </div>

              <div className="p-2.5 bg-emerald-950/70 border border-emerald-700/60 rounded-lg">
                <div className="text-emerald-400 text-xs font-semibold flex items-center justify-between">
                  <span>Notre Commission</span>
                  <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded text-emerald-200">
                    {vente.tauxCommission}%
                  </span>
                </div>
                <div className="text-base font-extrabold text-emerald-300 mt-1">
                  {formatMontant(vente.commissionGeneree, parametres.devise)}
                </div>
              </div>

              <div className="p-2.5 bg-blue-950/70 border border-blue-700/60 rounded-lg">
                <div className="text-blue-400 text-xs font-semibold flex items-center justify-between">
                  <span>Part Fournisseur</span>
                  <span className="text-[10px] bg-blue-800/80 px-1.5 py-0.5 rounded text-blue-200">
                    {100 - vente.tauxCommission}%
                  </span>
                </div>
                <div className="text-base font-extrabold text-blue-300 mt-1">
                  {formatMontant(vente.partFournisseur, parametres.devise)}
                </div>
              </div>
            </div>

            {/* Payment status */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Encaissé Client :</span>{' '}
                <span className="font-bold text-white">
                  {formatMontant(vente.montantPayeClient, parametres.devise)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Reste Client :</span>{' '}
                <span className={`font-bold ${vente.resteAPayerClient > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatMontant(vente.resteAPayerClient, parametres.devise)}
                </span>
              </div>
            </div>
          </div>

          {vente.notes && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">Note interne :</span> {vente.notes}
            </div>
          )}

          {vente.status === 'ANNULEE' && (
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800">
              <div className="font-bold">Motif de l'annulation :</div>
              <div>{vente.annuleeMotif || 'Non spécifié'}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
