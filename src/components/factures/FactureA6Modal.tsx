import React, { useRef, useState } from 'react';
import {
  Printer,
  Share2,
  MessageCircle,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
} from 'lucide-react';
import { Vente, Parametres } from '../../types';
import { formatMontant, formatDateHeureOnly, generateWhatsAppMessage } from '../../utils/formatters';
import { printDirectInvoice, PrintFormat } from '../../utils/printInvoice';
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
  const [printFormat, setPrintFormat] = useState<PrintFormat>('A6');

  if (!vente) return null;

  const { date, heure } = formatDateHeureOnly(vente.date);
  const isAnnulee = vente.status === 'ANNULEE';

  const handlePrint = () => {
    printDirectInvoice(vente, parametres, printFormat);
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
          <span>Facture Client</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
            {vente.numeroFacture}
          </span>
        </span>
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Print Format Selector & Action Toolbar */}
        <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl print:hidden">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-bold text-slate-700">Format d'impression :</span>
            <div className="inline-flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintFormat('A6')}
                className={`py-1 px-2.5 rounded-md transition-all cursor-pointer ${
                  printFormat === 'A6' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A6 (105×148mm)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('TICKET_80MM')}
                className={`py-1 px-2.5 rounded-md transition-all cursor-pointer ${
                  printFormat === 'TICKET_80MM' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ticket Caisse (80mm)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimer Facture ({printFormat === 'A6' ? 'A6' : '80mm'})</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Envoyer sur WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Partager"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
          </div>
        </div>

        {/* FACTURE SCREEN PREVIEW BOX */}
        <div className="flex justify-center bg-slate-200/80 p-3 sm:p-6 rounded-2xl overflow-x-auto">
          <div
            ref={printRef}
            id="printable-facture-a6"
            className={`w-full bg-white text-slate-900 px-5 py-6 shadow-xl rounded-xl border border-slate-200 relative flex flex-col justify-between ${
              printFormat === 'TICKET_80MM' ? 'max-w-[340px] min-h-[480px]' : 'max-w-[420px] min-h-[580px]'
            }`}
          >
            {/* Watermark if Cancelled */}
            {isAnnulee && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="transform -rotate-45 border-4 border-rose-600 text-rose-600 font-black text-3xl sm:text-4xl px-6 py-2 rounded-xl tracking-widest uppercase opacity-85 bg-white/80 shadow-lg">
                  ANNULÉE
                </div>
              </div>
            )}

            {/* Top section: Header, Meta box, Items table */}
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-slate-950">
                  {parametres.nomEntreprise || 'CLINIC AUTO'}
                </h1>
                {parametres.slogan && (
                  <p className="text-xs text-slate-600 font-medium italic">
                    {parametres.slogan}
                  </p>
                )}
                <div className="text-xs text-slate-600 space-y-0.5 pt-0.5">
                  {parametres.adresse && <p>{parametres.adresse}</p>}
                  {parametres.telephone && (
                    <p className="text-slate-800 font-medium">Tél : {parametres.telephone}</p>
                  )}
                  {parametres.email && (
                    <p className="text-slate-800 font-medium">Email : {parametres.email}</p>
                  )}
                </div>
                <div className="pt-2">
                  <div className="w-full border-t border-slate-800" />
                </div>
              </div>

              {/* Invoice Meta Box */}
              <div className="p-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-950 uppercase tracking-wide">FACTURE N°</span>
                  <span className="font-mono font-black text-sm text-blue-900">
                    {vente.numeroFacture}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">
                    Date : {date} à {heure}
                  </span>
                  {vente.status === 'ANNULEE' ? (
                    <span className="text-rose-600 font-black uppercase text-xs">ANNULÉE</span>
                  ) : (
                    <span className="text-emerald-700 font-bold uppercase text-xs">VALIDÉE</span>
                  )}
                </div>
                {vente.clientNom && (
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Client :</span>
                    <span className="font-bold text-slate-900">
                      {vente.clientNom} {vente.clientTelephone ? `(${vente.clientTelephone})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Articles Table */}
              <div className="pt-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-xs uppercase font-extrabold text-slate-900">
                      <th className="py-2 text-left">DÉSIGNATION</th>
                      <th className="py-2 text-center w-12">QTÉ</th>
                      <th className="py-2 text-right w-20">P.U</th>
                      <th className="py-2 text-right w-24">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {vente.lignes.map((ligne, idx) => (
                      <tr key={ligne.id || idx}>
                        <td className="py-2 pr-2 align-top">
                          <div className="font-black text-slate-950 uppercase text-xs leading-snug">
                            {ligne.designation}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
                            Réf: {ligne.reference}
                            {ligne.affectation ? ` • ${ligne.affectation}` : ''}
                          </div>
                        </td>
                        <td className="py-2 text-center font-extrabold text-slate-900 align-top text-xs">
                          {ligne.quantite}
                        </td>
                        <td className="py-2 text-right font-medium text-slate-700 whitespace-nowrap align-top text-xs">
                          {formatMontant(ligne.prixUnitaire, '')}
                        </td>
                        <td className="py-2 text-right font-black text-slate-950 whitespace-nowrap align-top text-xs">
                          {formatMontant(ligne.totalLigne, '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom section: Flexible spacer pushes Totals & Footer to the bottom */}
            <div className="mt-8 pt-3 border-t-2 border-slate-950 space-y-3">
              {/* Totals Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-black text-base uppercase text-slate-950 tracking-tight">
                    TOTAL GÉNÉRAL :
                  </span>
                  <span className="font-black text-lg text-slate-950 font-mono">
                    {formatMontant(vente.totalVente, parametres.devise)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Montant Payé :</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatMontant(vente.montantPayeClient, parametres.devise)}
                  </span>
                </div>

                {vente.resteAPayerClient > 0 ? (
                  <div className="flex justify-between items-center text-rose-700 font-bold">
                    <span>Reste à Payer :</span>
                    <span className="font-black font-mono">
                      {formatMontant(vente.resteAPayerClient, parametres.devise)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-emerald-800 font-bold">
                    <span>Règlement :</span>
                    <span>Soldé / Payé</span>
                  </div>
                )}
              </div>

              {/* Invoice Footer / Legal text */}
              <div className="pt-2 border-t border-slate-200 text-center space-y-0.5">
                {parametres.texteFacture && (
                  <p className="font-bold text-xs text-slate-700">{parametres.texteFacture}</p>
                )}
                {parametres.conditionsVente && (
                  <p className="italic text-[10px] text-slate-500">{parametres.conditionsVente}</p>
                )}
                <p className="text-[9px] text-slate-400 font-mono pt-1">
                  Édité le {date} {heure} • {printFormat}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          Document calibré sans coupure de marge pour imprimantes A6, tickets 80mm et A4.
        </div>
      </div>
    </Modal>
  );
}
