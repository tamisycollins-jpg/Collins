import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  Receipt,
  FileText,
  Ban,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  User,
  Phone,
  Calendar,
  X,
  CreditCard,
  Percent,
} from 'lucide-react';
import { Vente, Article, Parametres, LigneVenteInput } from '../../types';
import { createVente, annulerVente } from '../../services/storage';
import { formatMontant, formatDateTime, formatDate, normalizeSearch } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FactureA6Modal } from '../factures/FactureA6Modal';
import { FicheInterneModal } from '../factures/FicheInterneModal';

interface VentesViewProps {
  ventes: Vente[];
  articles: Article[];
  parametres: Parametres;
  preselectedArticle?: Article | null;
  onClearPreselected?: () => void;
  onOpenA6Modal?: (vente: Vente) => void;
  autoOpenNewSale?: boolean;
  onResetAutoOpen?: () => void;
}

interface CartItem {
  articleId: string;
  article: Article;
  quantite: number;
  prixUnitaire: number;
}

export function VentesView({
  ventes,
  articles,
  parametres,
  preselectedArticle,
  onClearPreselected,
  onOpenA6Modal,
  autoOpenNewSale,
  onResetAutoOpen,
}: VentesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TOUTES' | 'VALIDEE' | 'ANNULEE'>('TOUTES');

  // Modals
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [selectedVenteForA6, setSelectedVenteForA6] = useState<Vente | null>(null);
  const [selectedVenteForInterne, setSelectedVenteForInterne] = useState<Vente | null>(null);
  const [cancellingVente, setCancellingVente] = useState<Vente | null>(null);
  const [cancelMotif, setCancelMotif] = useState('');

  // Auto open from external trigger (e.g. Header or Dashboard "+ Vente" button)
  useEffect(() => {
    if (autoOpenNewSale) {
      setIsNewSaleModalOpen(true);
      if (onResetAutoOpen) onResetAutoOpen();
    }
  }, [autoOpenNewSale, onResetAutoOpen]);

  // New Sale Form State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clientNom, setClientNom] = useState('');
  const [clientTelephone, setClientTelephone] = useState('');
  const [notes, setNotes] = useState('');
  const [montantPaye, setMontantPaye] = useState('');
  const [tauxCommission, setTauxCommission] = useState<number>(parametres.tauxCommissionDefaut || 10);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Line item picker state inside modal
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [itemQuantite, setItemQuantite] = useState('1');
  const [itemSearch, setItemSearch] = useState('');

  const activeArticles = articles.filter((a) => a.status === 'ACTIF');

  // Preselection handler
  useEffect(() => {
    if (preselectedArticle && preselectedArticle.status === 'ACTIF' && preselectedArticle.stockActuel > 0) {
      setCartItems([
        {
          articleId: preselectedArticle.id,
          article: preselectedArticle,
          quantite: 1,
          prixUnitaire: preselectedArticle.prixVente,
        },
      ]);
      setMontantPaye(String(preselectedArticle.prixVente));
      setIsNewSaleModalOpen(true);
    }
  }, [preselectedArticle]);

  // Available articles for dropdown
  const filteredArticleChoices = activeArticles.filter((art) => {
    if (!itemSearch.trim()) return true;
    const term = normalizeSearch(itemSearch);
    return (
      normalizeSearch(art.reference).includes(term) ||
      normalizeSearch(art.designation).includes(term) ||
      normalizeSearch(art.affectation).includes(term)
    );
  });

  const selectedArticleObj = articles.find((a) => a.id === selectedArticleId);

  // Cart calculations
  const totalVente = cartItems.reduce((sum, item) => sum + item.quantite * item.prixUnitaire, 0);
  const commissionGeneree = Math.round(totalVente * (tauxCommission / 100));
  const partFournisseur = totalVente - commissionGeneree;

  const currentPaye = montantPaye === '' ? totalVente : parseFloat(montantPaye) || 0;
  const resteAPayer = Math.max(0, totalVente - currentPaye);

  const handleOpenNewSale = () => {
    setCartItems([]);
    setClientNom('');
    setClientTelephone('');
    setNotes('');
    setMontantPaye('');
    setTauxCommission(parametres.tauxCommissionDefaut || 10);
    setSelectedArticleId('');
    setItemQuantite('1');
    setItemSearch('');
    setSaleError(null);
    setIsNewSaleModalOpen(true);
  };

  const handleCloseNewSale = () => {
    setIsNewSaleModalOpen(false);
    if (onClearPreselected) onClearPreselected();
  };

  // Add line to cart
  const handleAddToCart = () => {
    setSaleError(null);
    if (!selectedArticleId) {
      setSaleError('Veuillez sélectionner un article.');
      return;
    }

    const article = articles.find((a) => a.id === selectedArticleId);
    if (!article) return;

    const qty = parseInt(itemQuantite, 10);
    if (isNaN(qty) || qty <= 0) {
      setSaleError('Veuillez saisir une quantité supérieure à 0.');
      return;
    }

    // Check existing in cart
    const existingIndex = cartItems.findIndex((c) => c.articleId === article.id);
    const existingQty = existingIndex >= 0 ? cartItems[existingIndex].quantite : 0;
    const totalRequested = existingQty + qty;

    // STRICT STOCK SHORTAGE CHECK
    if (totalRequested > article.stockActuel) {
      setSaleError(`Stock insuffisant. Stock disponible : ${article.stockActuel}.`);
      return;
    }

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantite = totalRequested;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          articleId: article.id,
          article,
          quantite: qty,
          prixUnitaire: article.prixVente,
        },
      ]);
    }

    // Reset picker
    setSelectedArticleId('');
    setItemQuantite('1');
    setItemSearch('');
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleUpdateCartQty = (index: number, newQty: number) => {
    setSaleError(null);
    const item = cartItems[index];
    if (newQty <= 0) {
      handleRemoveFromCart(index);
      return;
    }
    if (newQty > item.article.stockActuel) {
      setSaleError(
        `Stock insuffisant pour ${item.article.designation}. Stock disponible : ${item.article.stockActuel}.`
      );
      return;
    }
    const updated = [...cartItems];
    updated[index].quantite = newQty;
    setCartItems(updated);
  };

  // Submit Sale
  const handleValidateSale = (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError(null);

    if (cartItems.length === 0) {
      setSaleError('Veuillez ajouter au moins un article à la vente.');
      return;
    }

    try {
      const linesInput: LigneVenteInput[] = cartItems.map((item) => ({
        articleId: item.articleId,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire,
      }));

      const created = createVente({
        lignes: linesInput,
        clientNom,
        clientTelephone,
        tauxCommission,
        montantPayeClient: montantPaye === '' ? totalVente : parseFloat(montantPaye) || 0,
        notes,
      });

      // Close create modal and immediately offer A6 Invoice preview!
      handleCloseNewSale();
      setSelectedVenteForA6(created);
    } catch (err: any) {
      setSaleError(err.message || 'Erreur lors de la validation de la vente.');
    }
  };

  // Cancel sale execution
  const handleConfirmCancelSale = () => {
    if (!cancellingVente) return;
    try {
      annulerVente(cancellingVente.id, cancelMotif);
      setCancellingVente(null);
      setCancelMotif('');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’annulation.');
    }
  };

  // Filtered sales
  const filteredVentes = ventes.filter((v) => {
    if (statusFilter !== 'TOUTES' && v.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;

    const term = normalizeSearch(searchTerm);
    const inFacture = normalizeSearch(v.numeroFacture).includes(term);
    const inClient = normalizeSearch(v.clientNom).includes(term) || normalizeSearch(v.clientTelephone).includes(term);
    const inArticles = v.lignes.some(
      (l) =>
        normalizeSearch(l.reference).includes(term) ||
        normalizeSearch(l.designation).includes(term) ||
        normalizeSearch(l.affectation).includes(term)
    );

    return inFacture || inClient || inArticles;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>🛒 Ventes & Facturation</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {ventes.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saisie de vente multi-articles, commissions et génération de factures A6
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNewSale}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ring-2 ring-blue-600/20"
        >
          <Plus className="w-5 h-5" />
          <span>➕ NOUVELLE VENTE</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° facture (ex: FAC-2026-000001), client, référence..."
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

        {/* Status Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('TOUTES')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'TOUTES'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({ventes.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('VALIDEE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'VALIDEE'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Validées ({ventes.filter((v) => v.status === 'VALIDEE').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ANNULEE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'ANNULEE'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Annulées ({ventes.filter((v) => v.status === 'ANNULEE').length})
          </button>
        </div>
      </div>

      {/* Ventes Cards List */}
      {filteredVentes.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Aucune vente enregistrée</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cliquez sur "Nouvelle Vente" pour sélectionner vos pièces, calculer les commissions et générer la facture A6.
          </p>
          <button
            type="button"
            onClick={handleOpenNewSale}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Faire une vente</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVentes.map((vente) => {
            const isAnnulee = vente.status === 'ANNULEE';
            const totalQty = vente.lignes.reduce((sum, l) => sum + l.quantite, 0);

            return (
              <div
                key={vente.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
                  isAnnulee
                    ? 'border-rose-200 bg-rose-50/30 opacity-80'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top line: Invoice number + Status + Date */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {vente.numeroFacture}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {formatDateTime(vente.date)}
                      </span>
                    </div>

                    <div>
                      {isAnnulee ? (
                        <Badge variant="danger" size="sm">
                          ❌ ANNULÉE
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          ✅ Validée
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Client Info */}
                  {vente.clientNom && (
                    <div className="text-xs text-slate-700 font-semibold mb-2 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{vente.clientNom}</span>
                      {vente.clientTelephone && (
                        <span className="text-slate-400 font-normal">({vente.clientTelephone})</span>
                      )}
                    </div>
                  )}

                  {/* Articles Preview */}
                  <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 border border-slate-100 text-xs">
                    {vente.lignes.map((ligne, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-800">
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-900">{ligne.quantite}x</span>{' '}
                          <span className="font-medium">{ligne.designation}</span>{' '}
                          <span className="text-[10px] font-mono text-slate-400">({ligne.reference})</span>
                        </div>
                        <div className="font-semibold shrink-0">
                          {formatMontant(ligne.totalLigne, parametres.devise)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Quick Glance */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-medium">Total Vente</div>
                      <div className="font-extrabold text-slate-900 mt-0.5">
                        {formatMontant(vente.totalVente, parametres.devise)}
                      </div>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-semibold">Notre Com. (10%)</div>
                      <div className="font-extrabold text-emerald-700 mt-0.5">
                        {formatMontant(vente.commissionGeneree, parametres.devise)}
                      </div>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-[10px] text-blue-700 font-semibold">Fournisseur (90%)</div>
                      <div className="font-extrabold text-blue-700 mt-0.5">
                        {formatMontant(vente.partFournisseur, parametres.devise)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* A6 Invoice Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedVenteForA6(vente)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-amber-400" />
                      <span>Facture A6</span>
                    </button>

                    {/* Internal Sheet Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedVenteForInterne(vente)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      title="Fiche interne avec commissions"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fiche Interne</span>
                    </button>
                  </div>

                  {/* Cancel Action if not cancelled yet */}
                  {!isAnnulee && (
                    <button
                      type="button"
                      onClick={() => setCancellingVente(vente)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Annuler la vente</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL NOUVELLE VENTE MULTI-ARTICLES */}
      {/* ========================================= */}
      <Modal
        isOpen={isNewSaleModalOpen}
        onClose={handleCloseNewSale}
        title="🛒 Nouvelle Vente"
        maxWidth="lg"
      >
        <form onSubmit={handleValidateSale} className="space-y-4">
          {saleError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{saleError}</span>
            </div>
          )}

          {/* ADD ITEM SECTION */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              1. Sélectionner un article
            </span>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Rechercher par référence, désignation, véhicule..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Article Select */}
            <select
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choisir un article --</option>
              {filteredArticleChoices.map((art) => (
                <option
                  key={art.id}
                  value={art.id}
                  disabled={art.stockActuel <= 0}
                >
                  {art.reference} - {art.designation} (Stock : {art.stockActuel}) -{' '}
                  {formatMontant(art.prixVente, parametres.devise)}
                </option>
              ))}
            </select>

            {/* If article selected, show details & quantity input */}
            {selectedArticleObj && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Réf :</span>{' '}
                    <span className="font-mono font-bold text-blue-900">{selectedArticleObj.reference}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Véhicule :</span>{' '}
                    <span className="font-semibold text-slate-800">{selectedArticleObj.affectation || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Prix unitaire :</span>{' '}
                    <span className="font-bold text-slate-900">
                      {formatMontant(selectedArticleObj.prixVente, parametres.devise)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Stock dispo :</span>{' '}
                    <span
                      className={`font-extrabold ${
                        selectedArticleObj.stockActuel <= 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {selectedArticleObj.stockActuel} pièces
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <div className="w-28">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Quantité :
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedArticleObj.stockActuel}
                      value={itemQuantite}
                      onChange={(e) => setItemQuantite(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center"
                    />
                  </div>

                  <div className="flex-1 pt-3.5">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={selectedArticleObj.stockActuel <= 0}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter à la vente</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CART ITEMS LIST */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
              2. Lignes de la vente ({cartItems.length})
            </span>

            {cartItems.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Aucun article ajouté au panier pour l'instant.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {cartItems.map((item, idx) => (
                  <div key={item.articleId} className="p-2.5 bg-white flex items-center justify-between text-xs gap-2">
                    <div className="truncate flex-1">
                      <div className="font-bold text-slate-900">{item.article.designation}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Réf: {item.article.reference} • P.U: {formatMontant(item.prixUnitaire, parametres.devise)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(idx, item.quantite - 1)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-extrabold text-slate-900">{item.quantite}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(idx, item.quantite + 1)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="font-bold text-slate-900 min-w-[70px] text-right">
                        {formatMontant(item.quantite * item.prixUnitaire, parametres.devise)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CLIENT & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nom du Client (optionnel)
              </label>
              <input
                type="text"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
                placeholder="Ex: Rakoto, Garage Central..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Téléphone Client
              </label>
              <input
                type="tel"
                value={clientTelephone}
                onChange={(e) => setClientTelephone(e.target.value)}
                placeholder="Ex: 034 00 000 00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* FINANCIAL BREAKDOWN SUMMARY */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-sm font-extrabold">
              <span>TOTAL DE LA VENTE :</span>
              <span className="text-xl font-mono text-amber-400">
                {formatMontant(totalVente, parametres.devise)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-emerald-400 font-semibold block text-[11px]">
                  Notre Commission ({tauxCommission}%)
                </span>
                <span className="text-emerald-300 font-bold">
                  {formatMontant(commissionGeneree, parametres.devise)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-blue-400 font-semibold block text-[11px]">
                  Part Fournisseur ({100 - tauxCommission}%)
                </span>
                <span className="text-blue-300 font-bold">
                  {formatMontant(partFournisseur, parametres.devise)}
                </span>
              </div>
            </div>

            {/* Payment Input */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs">
                <label className="block text-slate-400 font-medium">Montant Encaissé :</label>
                <input
                  type="number"
                  min="0"
                  value={montantPaye}
                  onChange={(e) => setMontantPaye(e.target.value)}
                  placeholder={String(totalVente)}
                  className="mt-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-xs w-32 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div className="text-right text-xs">
                <span className="text-slate-400 font-medium block">Reste à payer :</span>
                <span className={`font-bold text-sm ${resteAPayer > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatMontant(resteAPayer, parametres.devise)}
                </span>
              </div>
            </div>
          </div>

          {/* Validation buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleCloseNewSale}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={cartItems.length === 0}
              className="flex-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>Valider & Générer Facture A6</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================= */}
      {/* MODAL ANNULATION DE VENTE AVEC REMISE EN STOCK */}
      {/* ========================================= */}
      {cancellingVente && (
        <ConfirmDialog
          isOpen={!!cancellingVente}
          onClose={() => setCancellingVente(null)}
          onConfirm={handleConfirmCancelSale}
          title={`Annuler la vente ${cancellingVente.numeroFacture} ?`}
          variant="danger"
          confirmLabel="Confirmer l'annulation"
          cancelLabel="Retour"
          message={
            <div className="space-y-2 text-left text-xs">
              <p className="text-rose-700 font-bold">
                Attention : Cette action va marquer la facture comme ANNULÉE et remettre automatiquement les{' '}
                {cancellingVente.lignes.reduce((sum, l) => sum + l.quantite, 0)} pièces vendues en stock.
              </p>
              <p className="text-slate-600">
                La vente restera archivée dans l'historique et son numéro ({cancellingVente.numeroFacture}) ne sera
                jamais réutilisé.
              </p>
              <div className="mt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Motif de l'annulation (optionnel) :
                </label>
                <input
                  type="text"
                  value={cancelMotif}
                  onChange={(e) => setCancelMotif(e.target.value)}
                  placeholder="Ex: Erreur client, pièce non compatible..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          }
        />
      )}

      {/* ========================================= */}
      {/* FACTURE A6 MODAL */}
      {/* ========================================= */}
      <FactureA6Modal
        isOpen={!!selectedVenteForA6}
        onClose={() => setSelectedVenteForA6(null)}
        vente={selectedVenteForA6}
        parametres={parametres}
      />

      {/* ========================================= */}
      {/* FICHE INTERNE MODAL */}
      {/* ========================================= */}
      <FicheInterneModal
        isOpen={!!selectedVenteForInterne}
        onClose={() => setSelectedVenteForInterne(null)}
        vente={selectedVenteForInterne}
        parametres={parametres}
      />
    </div>
  );
}
