import React, { useRef } from 'react';
import { Printer, Share2, MessageCircle, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Vente, Parametres } from '../../types';
import { formatMontant, formatDateHeureOnly, generateWhatsAppMessage } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface FactureA6ModalProps {
  isOpen: boolean;
  onClose: () => void;
  vente: Vente | null;
  parametres: Parametres;
}

export function FactureA6Modal({
  isOpen,
  onClose,
  vente,
  parametres,
}: FactureA6ModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!vente) return null;

  const { date, heure } = formatDateHeureOnly(vente.date);
  const isAnnulee = vente.status === 'ANNULEE';

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const text = generateWhatsAppMessage(vente, parametres);
    const phone = vente.clientTelephone ? vente.clientTelephone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Facture ${vente.numeroFacture} - ${parametres.nomEntreprise}`,
          text: `Facture ${vente.numeroFacture} du ${date}. Total: ${formatMontant(vente.totalVente, parametres.devise)}.`,
        });
      } catch (err) {
        console.log('Share dismissed or failed', err);
      }
    } else {
      handleWhatsApp();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span>Facture A6 Client</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
            {vente.numeroFacture}
          </span>
        </span>
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer A6</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors"
            title="Envoyer sur WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            title="Partager"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Partager</span>
          </button>
        </div>

        {/* FACTURE A6 PREVIEW BOX */}
        <div className="flex justify-center bg-slate-200 p-2 sm:p-4 rounded-xl overflow-x-auto">
          {/* Exact A6 proportions (approx 105mm x 148mm) in screen CSS */}
          <div
            ref={printRef}
            id="printable-facture-a6"
            className="w-full max-w-[390px] bg-white text-slate-900 p-4 sm:p-5 shadow-lg rounded-md border border-slate-300 relative flex flex-col justify-between text-xs leading-tight"
            style={{ minHeight: '520px' }}
          >
            {/* Watermark if Cancelled */}
            {isAnnulee && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="transform -rotate-45 border-4 border-rose-600 text-rose-600 font-extrabold text-3xl sm:text-4xl px-6 py-2 rounded-lg tracking-widest uppercase opacity-85">
                  ANNULÉE
                </div>
              </div>
            )}

            <div>
              {/* Header */}
              <div className="text-center pb-3 border-b border-slate-900/80">
                <h1 className="text-base font-extrabold tracking-wide uppercase text-slate-950">
                  {parametres.nomEntreprise}
                </h1>
                {parametres.slogan && (
                  <p className="text-[10px] text-slate-600 font-medium italic mt-0.5">
                    {parametres.slogan}
                  </p>
                )}
                <div className="text-[10px] text-slate-700 mt-1 space-y-0.5">
                  {parametres.adresse && <p>{parametres.adresse}</p>}
                  {parametres.telephone && (
                    <p className="font-semibold">Tél : {parametres.telephone}</p>
                  )}
                  {parametres.email && <p>Email : {parametres.email}</p>}
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="my-2.5 p-2 bg-slate-50 border border-slate-200 rounded text-[11px]">
                <div className="flex justify-between items-center font-bold text-slate-950">
                  <span>FACTURE N°</span>
                  <span className="font-mono text-xs text-blue-900">{vente.numeroFacture}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 mt-1 text-[10px]">
                  <span>Date : {date} à {heure}</span>
                  {vente.status === 'ANNULEE' ? (
                    <span className="text-rose-600 font-bold">ANNULÉE</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">VALIDÉE</span>
                  )}
                </div>
                {vente.clientNom && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex justify-between text-[10px]">
                    <span className="text-slate-600">Client :</span>
                    <span className="font-bold text-slate-900">
                      {vente.clientNom} {vente.clientTelephone ? `(${vente.clientTelephone})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Articles Table */}
              <div className="my-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] uppercase font-bold text-slate-800">
                      <th className="py-1">Désignation</th>
                      <th className="py-1 text-center w-8">Qté</th>
                      <th className="py-1 text-right w-16">P.U</th>
                      <th className="py-1 text-right w-18">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {vente.lignes.map((ligne, idx) => (
                      <tr key={ligne.id || idx}>
                        <td className="py-1.5 pr-1">
                          <div className="font-bold text-slate-900">{ligne.designation}</div>
                          <div className="text-[9px] text-slate-500 font-mono">
                            Réf: {ligne.reference}
                            {ligne.affectation ? ` • ${ligne.affectation}` : ''}
                          </div>
                        </td>
                        <td className="py-1.5 text-center font-semibold text-slate-900">
                          {ligne.quantite}
                        </td>
                        <td className="py-1.5 text-right font-medium text-slate-700">
                          {formatMontant(ligne.prixUnitaire, '')}
                        </td>
                        <td className="py-1.5 text-right font-bold text-slate-950">
                          {formatMontant(ligne.totalLigne, '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Footer */}
            <div className="mt-3 pt-2 border-t-2 border-slate-900">
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between items-center font-extrabold text-sm text-slate-950">
                  <span>TOTAL GÉNÉRAL :</span>
                  <span className="font-mono text-base text-slate-950">
                    {formatMontant(vente.totalVente, parametres.devise)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Montant Payé :</span>
                  <span className="font-semibold text-emerald-700">
                    {formatMontant(vente.montantPayeClient, parametres.devise)}
                  </span>
                </div>
                {vente.resteAPayerClient > 0 ? (
                  <div className="flex justify-between items-center text-rose-600 font-bold">
                    <span>Reste à Payer :</span>
                    <span className="font-mono">
                      {formatMontant(vente.resteAPayerClient, parametres.devise)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-emerald-800 font-medium text-[10px]">
                    <span>Règlement :</span>
                    <span className="font-semibold">Soldé / Payé</span>
                  </div>
                )}
              </div>

              {/* Invoice Note & Footer */}
              <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-0.5">
                {parametres.texteFacture && (
                  <p className="font-medium text-slate-700">{parametres.texteFacture}</p>
                )}
                {parametres.conditionsVente && (
                  <p className="italic text-[8px]">{parametres.conditionsVente}</p>
                )}
                <p className="text-[8px] text-slate-400 font-mono mt-1">
                  Édité le {date} {heure} • Format A6
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Ce document est optimisé pour impression papier A6 (105×148mm) ou partage direct.
        </div>
      </div>
    </Modal>
  );
}
