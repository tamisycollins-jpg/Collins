import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DatabaseSchema,
  Inventaire,
  LigneInventaire,
  StatutLigneInventaire,
  Article,
} from '../../types';
import {
  createInventaireDraft,
  saveInventaireDraft,
  validateInventaire,
  deleteInventaireDraft,
  computeInventaireMetrics,
} from '../../services/storage';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { InventaireHistorique } from './InventaireHistorique';
import { InventaireValidationModal } from './InventaireValidationModal';
import { InventaireRapportModal } from './InventaireRapportModal';
import {
  ClipboardCheck,
  Plus,
  Save,
  CheckCircle,
  AlertTriangle,
  Search,
  Printer,
  History,
  Lock,
  ArrowRight,
  Filter,
  Check,
  Barcode,
  RotateCcw,
  Sparkles,
  Trash2,
  HelpCircle,
  Copy,
} from 'lucide-react';

interface InventaireViewProps {
  db: DatabaseSchema;
  onRefresh: () => void;
}

export function InventaireView({ db, onRefresh }: InventaireViewProps) {
  // Tabs: 'ACTIVE' | 'HISTORIQUE'
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORIQUE'>('ACTIVE');

  // Currently loaded inventory (Draft or Consulted)
  const [currentInventaire, setCurrentInventaire] = useState<Inventaire | null>(null);
  const [lignes, setLignes] = useState<LigneInventaire[]>([]);
  const [notes, setNotes] = useState('');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<
    'TOUS' | 'NON_COMPTE' | 'COMPTE' | 'AVEC_ECART' | 'CONFORME' | 'MANQUANT' | 'SURPLUS'
  >('TOUS');
  const [selectedAffectation, setSelectedAffectation] = useState<string>('TOUTES');

  // Barcode quick input
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Modals & loading states
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetInventaire, setReportTargetInventaire] = useState<Inventaire | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const parametres = db.parametres;
  const inventairesList = db.inventaires || [];

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Initialize or load the active draft on mount
  useEffect(() => {
    if (!currentInventaire) {
      // Look for latest EN_COURS draft
      const existingDraft = inventairesList.find((inv) => inv.status === 'EN_COURS');
      if (existingDraft) {
        loadInventaire(existingDraft);
      } else if (inventairesList.length > 0) {
        // Load the latest completed inventory in view mode
        loadInventaire(inventairesList[0]);
      } else {
        // Auto-create initial draft if active articles exist
        handleCreateNewInventaire();
      }
    } else {
      // Keep in sync with db updates
      const updated = inventairesList.find((inv) => inv.id === currentInventaire.id);
      if (updated && updated.status === 'VALIDE' && currentInventaire.status !== 'VALIDE') {
        loadInventaire(updated);
      }
    }
  }, [inventairesList]);

  const loadInventaire = (inv: Inventaire) => {
    setCurrentInventaire(inv);
    setLignes(inv.lignes || []);
    setNotes(inv.notes || '');
  };

  const handleCreateNewInventaire = () => {
    try {
      const newInv = createInventaireDraft({
        notes: '',
      });
      loadInventaire(newInv);
      setActiveTab('ACTIVE');
      onRefresh();
      showToast(`Nouvel inventaire ${newInv.numeroInventaire} initialisé.`);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'initialisation de l'inventaire.");
    }
  };

  // Recalculate summary metrics dynamically
  const liveMetrics = useMemo(() => {
    return computeInventaireMetrics(lignes);
  }, [lignes]);

  // Unique affectations for filtering
  const affectationsList = useMemo(() => {
    const set = new Set<string>();
    lignes.forEach((l) => {
      if (l.affectation && l.affectation.trim()) {
        set.add(l.affectation.trim());
      }
    });
    return Array.from(set).sort();
  }, [lignes]);

  // Handle stock réel change for an article
  const handleRealStockChange = (ligneId: string, rawVal: string) => {
    if (currentInventaire?.status === 'VALIDE') return;

    setLignes((prev) =>
      prev.map((ligne) => {
        if (ligne.id !== ligneId) return ligne;

        if (rawVal === '' || rawVal === null || rawVal === undefined) {
          return {
            ...ligne,
            stockReel: null,
            ecart: null,
            statut: 'NON_COMPTE',
            valeurEcart: 0,
          };
        }

        const parsed = Number(rawVal);
        if (isNaN(parsed)) return ligne;
        const realStock = Math.max(0, Math.floor(parsed)); // Protect against negative numbers
        const ecart = realStock - ligne.stockVirtuel;
        const valEcart = ecart * (ligne.prixVente || 0);

        let statut: StatutLigneInventaire = 'CONFORME';
        if (ecart > 0) statut = 'SURPLUS';
        else if (ecart < 0) statut = 'MANQUANT';

        return {
          ...ligne,
          stockReel: realStock,
          ecart,
          statut,
          valeurEcart: valEcart,
        };
      })
    );
  };

  // Quick helper: Set stock réel equal to stock virtuel
  const handleCopyVirtualStock = (ligneId: string) => {
    if (currentInventaire?.status === 'VALIDE') return;
    setLignes((prev) =>
      prev.map((ligne) => {
        if (ligne.id !== ligneId) return ligne;
        const realStock = ligne.stockVirtuel;
        return {
          ...ligne,
          stockReel: realStock,
          ecart: 0,
          statut: 'CONFORME',
          valeurEcart: 0,
        };
      })
    );
  };

  // Increment / Decrement helper
  const handleStepStock = (ligneId: string, delta: number) => {
    if (currentInventaire?.status === 'VALIDE') return;
    setLignes((prev) =>
      prev.map((ligne) => {
        if (ligne.id !== ligneId) return ligne;
        const current = ligne.stockReel !== null ? ligne.stockReel : ligne.stockVirtuel;
        const next = Math.max(0, current + delta);
        const ecart = next - ligne.stockVirtuel;
        const valEcart = ecart * (ligne.prixVente || 0);

        let statut: StatutLigneInventaire = 'CONFORME';
        if (ecart > 0) statut = 'SURPLUS';
        else if (ecart < 0) statut = 'MANQUANT';

        return {
          ...ligne,
          stockReel: next,
          ecart,
          statut,
          valeurEcart: valEcart,
        };
      })
    );
  };

  // Bulk helper: Copy virtual stock for all uncounted items
  const handleCopyAllUncounted = () => {
    if (currentInventaire?.status === 'VALIDE') return;
    if (!window.confirm('Voulez-vous marquer tous les articles non comptés comme conformes au stock virtuel ?')) {
      return;
    }

    setLignes((prev) =>
      prev.map((l) => {
        if (l.stockReel !== null && l.stockReel !== undefined) return l;
        return {
          ...l,
          stockReel: l.stockVirtuel,
          ecart: 0,
          statut: 'CONFORME',
          valeurEcart: 0,
        };
      })
    );
    showToast('Tous les articles non comptés ont été alignés sur le stock virtuel.');
  };

  // Barcode Scanning / Quick Search Input
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Find article by barcode or exact reference
    const foundIndex = lignes.findIndex(
      (l) =>
        (l.codeBarre && l.codeBarre.toLowerCase() === query.toLowerCase()) ||
        l.reference.toLowerCase() === query.toLowerCase()
    );

    if (foundIndex >= 0) {
      const targetLigne = lignes[foundIndex];
      // Increment stock real count by 1 (or initialize to 1 if null)
      const current = targetLigne.stockReel !== null ? targetLigne.stockReel : 0;
      handleStepStock(targetLigne.id, 1);
      showToast(`+1 compté pour ${targetLigne.reference} (${targetLigne.designation})`);
      setBarcodeInput('');
    } else {
      // If not exact match, set as search filter
      setSearchTerm(query);
      setBarcodeInput('');
    }
  };

  // Auto-Save Draft
  const handleSaveDraft = () => {
    if (!currentInventaire || currentInventaire.status === 'VALIDE') return;
    try {
      setIsSaving(true);
      const updated = saveInventaireDraft(currentInventaire.id, lignes, notes);
      setCurrentInventaire(updated);
      onRefresh();
      showToast(`Brouillon ${updated.numeroInventaire} sauvegardé avec succès.`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la sauvegarde du brouillon.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete current draft
  const handleDeleteDraft = () => {
    if (!currentInventaire || currentInventaire.status === 'VALIDE') return;
    if (!window.confirm(`Confirmez-vous la suppression du brouillon ${currentInventaire.numeroInventaire} ?`)) {
      return;
    }

    try {
      deleteInventaireDraft(currentInventaire.id);
      setCurrentInventaire(null);
      onRefresh();
      showToast('Brouillon supprimé.');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
    }
  };

  // Final Validation
  const handleConfirmValidation = async () => {
    if (!currentInventaire) return;
    try {
      setIsValidating(true);
      const validated = await validateInventaire(currentInventaire.id, {
        notes,
        lignes,
      });
      setCurrentInventaire(validated);
      setShowValidationModal(false);
      onRefresh();
      showToast(`🎉 Inventaire ${validated.numeroInventaire} validé ! Les stocks ont été ajustés.`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation.');
    } finally {
      setIsValidating(false);
    }
  };

  // Filtered rows for display
  const filteredLignes = useMemo(() => {
    return lignes.filter((l) => {
      // Affectation filter
      if (selectedAffectation !== 'TOUTES' && l.affectation !== selectedAffectation) {
        return false;
      }

      // Status filter
      if (filterStatut === 'NON_COMPTE') {
        if (l.stockReel !== null && l.stockReel !== undefined) return false;
      } else if (filterStatut === 'COMPTE') {
        if (l.stockReel === null || l.stockReel === undefined) return false;
      } else if (filterStatut === 'AVEC_ECART') {
        if (l.stockReel === null || l.ecart === 0) return false;
      } else if (filterStatut === 'CONFORME') {
        if (l.stockReel === null || l.ecart !== 0) return false;
      } else if (filterStatut === 'MANQUANT') {
        if (l.stockReel === null || (l.ecart ?? 0) >= 0) return false;
      } else if (filterStatut === 'SURPLUS') {
        if (l.stockReel === null || (l.ecart ?? 0) <= 0) return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase().trim();
        const matchRef = l.reference.toLowerCase().includes(t);
        const matchDesig = l.designation.toLowerCase().includes(t);
        const matchAff = l.affectation.toLowerCase().includes(t);
        const matchBarcode = l.codeBarre ? l.codeBarre.toLowerCase().includes(t) : false;
        return matchRef || matchDesig || matchAff || matchBarcode;
      }

      return true;
    });
  }, [lignes, filterStatut, selectedAffectation, searchTerm]);

  const isReadOnly = currentInventaire?.status === 'VALIDE';

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-top duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Inventaire Physique
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Contrôle et réconciliation des stocks réels vs stocks virtuels
              </p>
            </div>
          </div>
        </div>

        {/* Action navigation tabs & create button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Fiche d'Inventaire
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORIQUE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HISTORIQUE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique ({inventairesList.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCreateNewInventaire}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Inventaire</span>
          </button>
        </div>
      </div>

      {activeTab === 'HISTORIQUE' ? (
        <InventaireHistorique
          inventaires={inventairesList}
          parametres={parametres}
          onSelectInventaire={(inv) => {
            loadInventaire(inv);
            setActiveTab('ACTIVE');
          }}
          onPrintInventaire={(inv) => {
            setReportTargetInventaire(inv);
            setShowReportModal(true);
          }}
        />
      ) : (
        <>
          {currentInventaire ? (
            <div className="space-y-5">
              {/* Active Inventory Status & Control Toolbar */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xl font-black text-slate-900">
                      {currentInventaire.numeroInventaire}
                    </span>
                    {isReadOnly ? (
                      <Badge variant="success" size="md">
                        <Lock className="w-3.5 h-3.5" /> VALIDÉ & VERROUILLÉ
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="md">
                        <AlertTriangle className="w-3.5 h-3.5" /> EN COURS DE COMPTAGE
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">
                      Créé le {formatDate(currentInventaire.date || currentInventaire.createdAt)} par{' '}
                      <strong>{currentInventaire.utilisateur}</strong>
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setReportTargetInventaire({
                          ...currentInventaire,
                          lignes,
                          ...liveMetrics,
                        });
                        setShowReportModal(true);
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Imprimer le rapport d'inventaire"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden md:inline">Rapport / PDF</span>
                    </button>

                    {!isReadOnly && (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={isSaving}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowValidationModal(true)}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Valider l'Inventaire</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteDraft}
                          className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          title="Supprimer ce brouillon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Dashboard Summary KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Articles Total</p>
                    <p className="text-lg font-black text-slate-900">{liveMetrics.nbArticlesTotal}</p>
                  </div>
                  <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">Comptés</p>
                    <p className="text-lg font-black text-blue-800">{liveMetrics.nbArticlesComptes}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Non Comptés</p>
                    <p className="text-lg font-black text-slate-600">{liveMetrics.nbArticlesNonComptes}</p>
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Conformes (0)</p>
                    <p className="text-lg font-black text-emerald-800">{liveMetrics.nbArticlesConformes}</p>
                  </div>
                  <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-700 uppercase">Avec Écart</p>
                    <p className="text-lg font-black text-rose-800">{liveMetrics.nbArticlesAvecEcart}</p>
                  </div>
                  <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-700 uppercase">Manquants (-)</p>
                    <p className="text-sm font-black text-rose-700">
                      {liveMetrics.totalQuantiteManquante} pcs
                    </p>
                    <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                      -{formatCurrency(liveMetrics.valeurManquants, parametres.devise)}
                    </p>
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Surplus (+)</p>
                    <p className="text-sm font-black text-emerald-700">
                      +{liveMetrics.totalQuantiteSurplus} pcs
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      +{formatCurrency(liveMetrics.valeurSurplus, parametres.devise)}
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-2xl text-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Écart Net</p>
                    <p
                      className={`text-sm font-black font-mono ${
                        liveMetrics.valeurEcartNet < 0
                          ? 'text-rose-400'
                          : liveMetrics.valeurEcartNet > 0
                          ? 'text-emerald-400'
                          : 'text-white'
                      }`}
                    >
                      {formatCurrency(liveMetrics.valeurEcartNet, parametres.devise)}
                    </p>
                  </div>
                </div>

                {/* Optional Notes */}
                {!isReadOnly ? (
                  <div>
                    <input
                      type="text"
                      placeholder="Ajouter une observation ou remarque sur cet inventaire (ex: inventaire annuel fin de mois)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                ) : (
                  currentInventaire.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <strong>Observation :</strong> {currentInventaire.notes}
                    </p>
                  )
                )}
              </div>

              {/* Barcode & Search Controls Bar */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Barcode scanner input */}
                {!isReadOnly && (
                  <form
                    onSubmit={handleBarcodeSubmit}
                    className="flex items-center gap-2 w-full md:w-80"
                  >
                    <div className="relative flex-1">
                      <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="Scanner code-barre ou taper réf..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-blue-50/40 border border-blue-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Scanner
                    </button>
                  </form>
                )}

                {/* Search Text */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer par désignation, référence, véhicule..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Affectation dropdown */}
                {affectationsList.length > 0 && (
                  <select
                    value={selectedAffectation}
                    onChange={(e) => setSelectedAffectation(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="TOUTES">Toutes affectations</option>
                    {affectationsList.map((aff) => (
                      <option key={aff} value={aff}>
                        {aff}
                      </option>
                    ))}
                  </select>
                )}

                {/* Quick action: copy virtual to all uncounted */}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleCopyAllUncounted}
                    className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    title="Attribuer automatiquement le stock virtuel aux articles non comptés"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Même stock pour non-comptés</span>
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'TOUS', label: `Tous (${lignes.length})` },
                  { id: 'NON_COMPTE', label: `Non Comptés (${liveMetrics.nbArticlesNonComptes})` },
                  { id: 'COMPTE', label: `Comptés (${liveMetrics.nbArticlesComptes})` },
                  { id: 'AVEC_ECART', label: `Avec Écart (${liveMetrics.nbArticlesAvecEcart})` },
                  { id: 'CONFORME', label: `Conformes (${liveMetrics.nbArticlesConformes})` },
                  { id: 'MANQUANT', label: `Manquants (-)` },
                  { id: 'SURPLUS', label: `Surplus (+)` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterStatut(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      filterStatut === f.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Articles Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Réf / Code-Barre</th>
                        <th className="py-3 px-4">Désignation & Affectation</th>
                        <th className="py-3 px-3 text-right">Stock Virtuel</th>
                        <th className="py-3 px-3 text-center w-56">Stock Réel Compté</th>
                        <th className="py-3 px-3 text-right">Écart</th>
                        <th className="py-3 px-3 text-center">Statut</th>
                        <th className="py-3 px-4 text-right">Impact Financier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLignes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                            Aucun article ne correspond à ces critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredLignes.map((ligne) => {
                          const isCounted =
                            ligne.stockReel !== null && ligne.stockReel !== undefined;
                          const ecart = ligne.ecart ?? 0;

                          return (
                            <tr
                              key={ligne.id}
                              className={`transition-colors ${
                                !isCounted
                                  ? 'hover:bg-slate-50/60'
                                  : ecart < 0
                                  ? 'bg-rose-50/30 hover:bg-rose-50/50'
                                  : ecart > 0
                                  ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                                  : 'hover:bg-slate-50/60'
                              }`}
                            >
                              {/* Reference / Code-barres */}
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-slate-900 block">
                                  {ligne.reference}
                                </span>
                                {ligne.codeBarre && (
                                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                    <Barcode className="w-3 h-3" /> {ligne.codeBarre}
                                  </span>
                                )}
                              </td>

                              {/* Designation & Affectation */}
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{ligne.designation}</div>
                                {ligne.affectation && (
                                  <div className="text-[11px] text-slate-500">
                                    {ligne.affectation}
                                  </div>
                                )}
                              </td>

                              {/* Stock Virtuel */}
                              <td className="py-3 px-3 text-right font-mono font-bold text-sm text-slate-700">
                                {ligne.stockVirtuel}
                              </td>

                              {/* Stock Réel Input & Controls */}
                              <td className="py-2.5 px-3">
                                {isReadOnly ? (
                                  <div className="text-center font-mono font-bold text-sm text-slate-900">
                                    {isCounted ? ligne.stockReel : <span className="text-slate-400">Non compté</span>}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStepStock(ligne.id, -1)}
                                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                                      title="-1 unité"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="—"
                                      value={isCounted ? String(ligne.stockReel) : ''}
                                      onChange={(e) =>
                                        handleRealStockChange(ligne.id, e.target.value)
                                      }
                                      className={`w-20 px-2 py-1.5 text-center font-mono font-bold text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                                        !isCounted
                                          ? 'bg-slate-50 border-slate-200 text-slate-400 placeholder:text-slate-300'
                                          : ecart < 0
                                          ? 'bg-rose-50 border-rose-300 text-rose-800 focus:ring-rose-400/20'
                                          : ecart > 0
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 focus:ring-emerald-400/20'
                                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-400/20'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleStepStock(ligne.id, 1)}
                                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                                      title="+1 unité"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyVirtualStock(ligne.id)}
                                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                      title="Même stock que le virtuel"
                                    >
                                      =
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Écart */}
                              <td className="py-3 px-3 text-right font-mono font-black text-sm">
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
                                  <span className="text-slate-300 font-normal">—</span>
                                )}
                              </td>

                              {/* Statut Badge */}
                              <td className="py-3 px-3 text-center">
                                {!isCounted ? (
                                  <Badge variant="neutral" size="sm">
                                    Non compté
                                  </Badge>
                                ) : ecart > 0 ? (
                                  <Badge variant="info" size="sm">
                                    Surplus (+{ecart})
                                  </Badge>
                                ) : ecart < 0 ? (
                                  <Badge variant="danger" size="sm">
                                    Manquant ({ecart})
                                  </Badge>
                                ) : (
                                  <Badge variant="success" size="sm">
                                    Conforme (0)
                                  </Badge>
                                )}
                              </td>

                              {/* Financial Impact */}
                              <td className="py-3 px-4 text-right font-mono font-bold">
                                {isCounted && ecart !== 0 ? (
                                  <span
                                    className={
                                      ecart < 0 ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'
                                    }
                                  >
                                    {formatCurrency(ligne.valeurEcart, parametres.devise)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">
                                    0 {parametres.devise}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <ClipboardCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Aucun inventaire actif</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Démarrez un nouvel inventaire pour comparer vos stocks réels et virtuels en magasin.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateNewInventaire}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-colors shadow-md cursor-pointer"
              >
                Démarrer un inventaire physique
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation & Validation Modal */}
      {showValidationModal && currentInventaire && (
        <InventaireValidationModal
          inventaire={{
            ...currentInventaire,
            lignes,
            ...liveMetrics,
          }}
          parametres={parametres}
          onConfirm={handleConfirmValidation}
          onCancel={() => setShowValidationModal(false)}
          isLoading={isValidating}
        />
      )}

      {/* Printable Report Modal */}
      {showReportModal && reportTargetInventaire && (
        <InventaireRapportModal
          inventaire={reportTargetInventaire}
          parametres={parametres}
          onClose={() => {
            setShowReportModal(false);
            setReportTargetInventaire(null);
          }}
        />
      )}
    </div>
  );
}
