import React, { useState } from 'react';
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  CheckCircle2,
  Calendar,
  CreditCard,
  AlertCircle,
  FileText,
  X,
  Filter,
} from 'lucide-react';
import { Reglement, Vente, Parametres, TypePartie, ModePaiement } from '../../types';
import { addReglement } from '../../services/storage';
import { formatMontant, formatDateTime, formatDate, normalizeSearch } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface ReglementsViewProps {
  reglements: Reglement[];
  ventes: Vente[];
  parametres: Parametres;
}

export function ReglementsView({ reglements, ventes, parametres }: ReglementsViewProps) {
  const [activeTab, setActiveTab] = useState<TypePartie | 'TOUS'>('TOUS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [targetType, setTargetType] = useState<TypePartie>('FOURNISSEUR');
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('ESPECES');
  const [selectedVenteId, setSelectedVenteId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [remarque, setRemarque] = useState('');
  const [pieceJustificative, setPieceJustificative] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // FINANCIAL TOTALS CALCULATION
  const validVentes = ventes.filter((v) => v.status === 'VALIDEE');

  // Commissions
  const totalCommissionGeneree = validVentes.reduce((sum, v) => sum + v.commissionGeneree, 0);
  const totalCommissionRecue = reglements
    .filter((r) => r.typePartie === 'COMMISSION')
    .reduce((sum, r) => sum + r.montant, 0);
  const totalCommissionRestante = Math.max(0, totalCommissionGeneree - totalCommissionRecue);

  // Fournisseur
  const totalFournisseurDu = validVentes.reduce((sum, v) => sum + v.partFournisseur, 0);
  const totalFournisseurVerse = reglements
    .filter((r) => r.typePartie === 'FOURNISSEUR')
    .reduce((sum, r) => sum + r.montant, 0);
  const totalFournisseurRestant = Math.max(0, totalFournisseurDu - totalFournisseurVerse);

  // Filtered Reglements
  const filteredReglements = reglements.filter((r) => {
    if (activeTab !== 'TOUS' && r.typePartie !== activeTab) return false;
    if (!searchTerm.trim()) return true;

    const term = normalizeSearch(searchTerm);
    const inNum = normalizeSearch(r.numeroReglement).includes(term);
    const inRemarque = r.remarque && normalizeSearch(r.remarque).includes(term);
    const inPiece = r.pieceJustificative && normalizeSearch(r.pieceJustificative).includes(term);

    return inNum || inRemarque || inPiece;
  });

  const handleOpenAdd = (type: TypePartie = 'FOURNISSEUR') => {
    setTargetType(type);
    setMontant('');
    setModePaiement('ESPECES');
    setSelectedVenteId('');
    setDate(new Date().toISOString().substring(0, 10));
    setRemarque('');
    setPieceJustificative('');
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const amount = parseFloat(montant);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Le montant du versement doit être strictement positif.');
      }

      const created = addReglement({
        typePartie: targetType,
        modePaiement,
        montant: amount,
        venteId: selectedVenteId || undefined,
        remarque: remarque.trim(),
        pieceJustificative: pieceJustificative.trim(),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
      });

      setFormSuccess(`Règlement ${created.numeroReglement} enregistré avec succès !`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess(null);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l’enregistrement du règlement.');
    }
  };

  const getModeLabel = (mode: ModePaiement) => {
    switch (mode) {
      case 'ESPECES':
        return 'Espèces';
      case 'MVOLA':
        return 'MVola';
      case 'ORANGE_MONEY':
        return 'Orange Money';
      case 'AIRTEL_MONEY':
        return 'Airtel Money';
      case 'VIREMENT':
        return 'Virement Bancaire';
      case 'CHEQUE':
        return 'Chèque';
      default:
        return mode;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>💰 Règlements & Trésorerie</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {reglements.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des versements fournisseur et encaissements de notre commission
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAdd('FOURNISSEUR')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>➕ ENREGISTRER UN RÈGLEMENT</span>
        </button>
      </div>

      {/* TWO MAIN SECTIONS: NOTRE COMMISSION VS FOURNISSEUR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* NOTRE PART (COMMISSION) */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">NOTRE COMMISSION (10%)</h2>
                <span className="text-[10px] text-slate-400 font-medium">Bénéfice dépositaire</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAdd('COMMISSION')}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              + Encaisser
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium block">Générée</span>
              <div className="font-extrabold text-slate-900 mt-0.5">
                {formatMontant(totalCommissionGeneree, parametres.devise)}
              </div>
            </div>
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-semibold block">Reçue</span>
              <div className="font-extrabold text-emerald-700 mt-0.5">
                {formatMontant(totalCommissionRecue, parametres.devise)}
              </div>
            </div>
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[10px] text-amber-800 font-semibold block">Restante</span>
              <div className="font-extrabold text-amber-800 mt-0.5">
                {formatMontant(totalCommissionRestante, parametres.devise)}
              </div>
            </div>
          </div>
        </div>

        {/* PART FOURNISSEUR */}
        <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">PART FOURNISSEUR (90%)</h2>
                <span className="text-[10px] text-slate-400 font-medium">Reversé au propriétaire</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAdd('FOURNISSEUR')}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              + Reverser
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium block">Dû</span>
              <div className="font-extrabold text-slate-900 mt-0.5">
                {formatMontant(totalFournisseurDu, parametres.devise)}
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] text-blue-700 font-semibold block">Reversé</span>
              <div className="font-extrabold text-blue-700 mt-0.5">
                {formatMontant(totalFournisseurVerse, parametres.devise)}
              </div>
            </div>
            <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[10px] text-rose-700 font-semibold block">Restant</span>
              <div className="font-extrabold text-rose-700 mt-0.5">
                {formatMontant(totalFournisseurRestant, parametres.devise)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° règlement, note, référence de reçu..."
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

        {/* Filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('TOUS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'TOUS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({reglements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FOURNISSEUR')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'FOURNISSEUR'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Fournisseur ({reglements.filter((r) => r.typePartie === 'FOURNISSEUR').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMMISSION')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'COMMISSION'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Commission ({reglements.filter((r) => r.typePartie === 'COMMISSION').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CLIENT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'CLIENT'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Clients ({reglements.filter((r) => r.typePartie === 'CLIENT').length})
          </button>
        </div>
      </div>

      {/* Reglements List */}
      {filteredReglements.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Aucun règlement enregistré</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Enregistrez les versements partiels ou totaux effectués au fournisseur ou les encaissements de commissions.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredReglements.map((reg) => (
            <div
              key={reg.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                    {reg.numeroReglement}
                  </span>
                  <span className="text-slate-400 font-medium">{formatDate(reg.date)}</span>
                  {reg.typePartie === 'FOURNISSEUR' && <Badge variant="info">Fournisseur</Badge>}
                  {reg.typePartie === 'COMMISSION' && <Badge variant="success">Commission</Badge>}
                  {reg.typePartie === 'CLIENT' && <Badge variant="purple">Client</Badge>}
                </div>

                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <span>Mode : {getModeLabel(reg.modePaiement)}</span>
                  {reg.pieceJustificative && (
                    <span className="text-slate-400">• Réf: {reg.pieceJustificative}</span>
                  )}
                </div>

                {reg.remarque && (
                  <p className="text-slate-500 italic bg-slate-50 p-1.5 rounded-md border border-slate-100">
                    Note : {reg.remarque}
                  </p>
                )}
              </div>

              <div className="text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <div className="text-slate-400 font-medium">Montant réglé</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {formatMontant(reg.montant, parametres.devise)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL ENREGISTRER RÈGLEMENT */}
      {/* ========================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="➕ Enregistrer un règlement"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Type of party */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Partie concernée <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('FOURNISSEUR')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-colors ${
                  targetType === 'FOURNISSEUR'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                🏢 Fournisseur
              </button>
              <button
                type="button"
                onClick={() => setTargetType('COMMISSION')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-colors ${
                  targetType === 'COMMISSION'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                💵 Commission
              </button>
              <button
                type="button"
                onClick={() => setTargetType('CLIENT')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-colors ${
                  targetType === 'CLIENT'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-500/20'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                👤 Client
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Montant ({parametres.devise}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex: 50000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-extrabold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Date du paiement
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Mode de paiement
            </label>
            <select
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ESPECES">Espèces (Cash)</option>
              <option value="MVOLA">MVola</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="AIRTEL_MONEY">Airtel Money</option>
              <option value="VIREMENT">Virement Bancaire</option>
              <option value="CHEQUE">Chèque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Référence du reçu / Transaction (optionnel)
            </label>
            <input
              type="text"
              value={pieceJustificative}
              onChange={(e) => setPieceJustificative(e.target.value)}
              placeholder="Ex: TX-98421, Réf reçu..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Remarque / Note
            </label>
            <input
              type="text"
              value={remarque}
              onChange={(e) => setRemarque(e.target.value)}
              placeholder="Ex: Acompte fournisseur semaine 12..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
            >
              Valider le règlement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
