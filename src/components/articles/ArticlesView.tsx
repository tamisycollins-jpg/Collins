import React, { useState } from 'react';
import {
  Plus,
  Search,
  Tag,
  Car,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Filter,
  Check,
  X,
  Package,
  Layers,
  Trash2,
} from 'lucide-react';
import { Article, Parametres } from '../../types';
import { addArticle, updateArticle, deleteArticle } from '../../services/storage';
import { formatMontant, normalizeSearch } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface ArticlesViewProps {
  articles: Article[];
  parametres: Parametres;
  onOpenNewSaleForArticle?: (article: Article) => void;
  onOpenNewArrivalForArticle?: (article: Article) => void;
}

export function ArticlesView({
  articles,
  parametres,
  onOpenNewSaleForArticle,
  onOpenNewArrivalForArticle,
}: ArticlesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'ACTIF' | 'INACTIF'>('TOUS');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Form states for Add
  const [formRef, setFormRef] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formAffectation, setFormAffectation] = useState('');
  const [formPrix, setFormPrix] = useState('');
  const [formStockInitial, setFormStockInitial] = useState('0');
  const [formSeuilMin, setFormSeuilMin] = useState(String(parametres.seuilStockDefaut || 2));
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form states for Edit
  const [editDesignation, setEditDesignation] = useState('');
  const [editAffectation, setEditAffectation] = useState('');
  const [editPrix, setEditPrix] = useState('');
  const [editSeuilMin, setEditSeuilMin] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIF' | 'INACTIF'>('ACTIF');
  const [editError, setEditError] = useState<string | null>(null);

  // Filter articles
  const filteredArticles = articles.filter((art) => {
    if (statusFilter !== 'TOUS' && art.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;

    const term = normalizeSearch(searchTerm);
    const inRef = normalizeSearch(art.reference).includes(term);
    const inDesig = normalizeSearch(art.designation).includes(term);
    const inVehic = normalizeSearch(art.affectation).includes(term);
    return inRef || inDesig || inVehic;
  });

  const handleOpenAdd = () => {
    setFormRef('');
    setFormDesignation('');
    setFormAffectation('');
    setFormPrix('');
    setFormStockInitial('0');
    setFormSeuilMin(String(parametres.seuilStockDefaut || 2));
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (!formRef.trim()) throw new Error('La référence est requise.');
      if (!formDesignation.trim()) throw new Error('La désignation est requise.');
      const prix = parseFloat(formPrix);
      if (isNaN(prix) || prix < 0) throw new Error('Le prix de vente doit être un nombre positif.');

      const initialStock = parseInt(formStockInitial, 10);
      const seuil = parseInt(formSeuilMin, 10);

      const created = addArticle({
        reference: formRef,
        designation: formDesignation,
        affectation: formAffectation,
        prixVente: prix,
        stockInitial: isNaN(initialStock) ? 0 : initialStock,
        seuilMin: isNaN(seuil) ? parametres.seuilStockDefaut : seuil,
      });

      setFormSuccess(`Article "${created.reference}" ajouté avec succès !`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess(null);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de l'enregistrement.");
    }
  };

  const handleOpenEdit = (article: Article) => {
    setEditingArticle(article);
    setEditDesignation(article.designation);
    setEditAffectation(article.affectation || '');
    setEditPrix(String(article.prixVente));
    setEditSeuilMin(String(article.seuilMin));
    setEditStatus(article.status);
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    setEditError(null);

    try {
      const prix = parseFloat(editPrix);
      if (isNaN(prix) || prix < 0) throw new Error('Prix de vente invalide.');
      const seuil = parseInt(editSeuilMin, 10);

      updateArticle(editingArticle.id, {
        designation: editDesignation,
        affectation: editAffectation,
        prixVente: prix,
        seuilMin: isNaN(seuil) ? 2 : seuil,
        status: editStatus,
      });

      setEditingArticle(null);
    } catch (err: any) {
      setEditError(err.message || 'Erreur de modification.');
    }
  };

  const handleConfirmDelete = () => {
    if (!articleToDelete) return;
    try {
      const res = deleteArticle(articleToDelete.id);
      setDeleteSuccessMsg(`L'article ${res.reference} (${res.designation}) a été supprimé définitivement.`);
      setTimeout(() => setDeleteSuccessMsg(null), 3500);
      setArticleToDelete(null);
      if (editingArticle?.id === articleToDelete.id) {
        setEditingArticle(null);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner with Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>📋 Articles</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                {articles.length}
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion du catalogue des pièces et véhicules associés
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>➕ AJOUTER UN ARTICLE</span>
        </button>
      </div>

      {deleteSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{deleteSuccessMsg}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par référence, désignation, véhicule (ex: Cruze, 13272719)..."
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

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5" /> Filtrer :
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('TOUS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'TOUS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({articles.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIF')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'ACTIF'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Actifs ({articles.filter((a) => a.status === 'ACTIF').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIF')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'INACTIF'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inactifs ({articles.filter((a) => a.status === 'INACTIF').length})
          </button>
        </div>
      </div>

      {/* Articles Cards / List */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">
            {articles.length === 0 ? 'Aucun article dans le catalogue' : 'Aucun article trouvé'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {articles.length === 0
              ? 'Votre base de données est vide. Ajoutez vos articles manuellement un par un avec le bouton ci-dessous.'
              : 'Essayez d’ajuster votre recherche ou filtre.'}
          </p>
          {articles.length === 0 && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer mon premier article</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredArticles.map((article) => {
            const isOutOfStock = article.stockActuel <= 0;
            const isLowStock = !isOutOfStock && article.stockActuel <= article.seuilMin;

            return (
              <div
                key={article.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 ${
                  article.status === 'INACTIF'
                    ? 'opacity-70 bg-slate-50 border-dashed border-slate-300'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top line: Reference + Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-blue-900 px-2 py-0.5 rounded-md border border-slate-200">
                      {article.reference}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {article.status === 'ACTIF' ? (
                        <Badge variant="success" size="sm">
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Inactif
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(article)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Modifier l'article"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setArticleToDelete(article)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer définitivement l'article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Designation */}
                  <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
                    {article.designation}
                  </h3>

                  {/* Affectation / Car */}
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <Car className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">
                      {article.affectation || 'Affectation universelle / Non spécifiée'}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mt-3 text-base font-extrabold text-slate-900 flex items-baseline gap-1">
                    <span>{formatMontant(article.prixVente, parametres.devise)}</span>
                  </div>
                </div>

                {/* Stock Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <AlertTriangle className="w-3 h-3" />
                        Rupture (0)
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Stock faible ({article.stockActuel})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Stock : {article.stockActuel}
                      </span>
                    )}
                  </div>

                  {/* Quick actions if active */}
                  {article.status === 'ACTIF' && (
                    <div className="flex items-center gap-1">
                      {onOpenNewArrivalForArticle && (
                        <button
                          type="button"
                          onClick={() => onOpenNewArrivalForArticle(article)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Nouvel Arrivage pour cet article"
                        >
                          + Arrivage
                        </button>
                      )}
                      {onOpenNewSaleForArticle && article.stockActuel > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenNewSaleForArticle(article)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Vendre cet article"
                        >
                          Vendre
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL AJOUT ARTICLE */}
      {/* ========================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="➕ Ajouter un nouvel article"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Référence <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formRef}
              onChange={(e) => setFormRef(e.target.value.toUpperCase())}
              placeholder="Ex: 13272719, FILT-001..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
            />
            <p className="text-[11px] text-slate-400 mt-1">La référence doit être unique.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Désignation <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formDesignation}
              onChange={(e) => setFormDesignation(e.target.value)}
              placeholder="Ex: FILTRE A AIR, PLAQUETTES DE FREIN..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Affectation / Véhicule
            </label>
            <input
              type="text"
              value={formAffectation}
              onChange={(e) => setFormAffectation(e.target.value)}
              placeholder="Ex: CRUZE, DUSTER, HILUX, TOYOTA..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Prix de vente ({parametres.devise}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formPrix}
                onChange={(e) => setFormPrix(e.target.value)}
                placeholder="Ex: 35000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Stock initial
              </label>
              <input
                type="number"
                min="0"
                value={formStockInitial}
                onChange={(e) => setFormStockInitial(e.target.value)}
                placeholder="Ex: 2"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Seuil d'alerte stock faible
            </label>
            <input
              type="number"
              min="0"
              value={formSeuilMin}
              onChange={(e) => setFormSeuilMin(e.target.value)}
              placeholder="Ex: 2"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Une alerte 🟠 sera affichée quand le stock descend à ce niveau.
            </p>
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
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
            >
              Enregistrer l'article
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================= */}
      {/* MODAL MODIFICATION ARTICLE */}
      {/* ========================================= */}
      <Modal
        isOpen={!!editingArticle}
        onClose={() => setEditingArticle(null)}
        title={`Modifier : ${editingArticle?.reference}`}
        maxWidth="md"
      >
        {editingArticle && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {editError}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Référence (non modifiable) :</span>
              <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                {editingArticle.reference}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Désignation
              </label>
              <input
                type="text"
                required
                value={editDesignation}
                onChange={(e) => setEditDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Affectation / Véhicule
              </label>
              <input
                type="text"
                value={editAffectation}
                onChange={(e) => setEditAffectation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nouveau Prix de vente ({parametres.devise})
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={editPrix}
                  onChange={(e) => setEditPrix(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  La modification du prix ne change pas les anciennes ventes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Seuil stock faible
                </label>
                <input
                  type="number"
                  min="0"
                  value={editSeuilMin}
                  onChange={(e) => setEditSeuilMin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Statut de l'article
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditStatus('ACTIF')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    editStatus === 'ACTIF'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Check className="w-4 h-4" /> Actif
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus('INACTIF')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    editStatus === 'INACTIF'
                      ? 'bg-slate-100 border-slate-500 text-slate-800 ring-2 ring-slate-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" /> Inactif
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Un article inactif reste conservé dans l'historique mais n'apparaît plus dans les nouvelles ventes.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setEditingArticle(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
              >
                Sauvegarder
              </button>
            </div>

            {/* Danger Zone: Permanent Deletion */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Zone de danger</span>
                <span className="text-[10px] text-slate-400">Retirer définitivement cet article du système</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const toDelete = editingArticle;
                  setEditingArticle(null);
                  setArticleToDelete(toDelete);
                }}
                className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIRM PERMANENT DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!articleToDelete}
        onClose={() => setArticleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="🗑️ Supprimer définitivement l'article ?"
        variant="danger"
        confirmLabel="Oui, supprimer définitivement"
        cancelLabel="Annuler"
        message={
          articleToDelete ? (
            <div className="space-y-2 text-left">
              <p className="text-slate-700 font-medium">
                Êtes-vous sûr de vouloir supprimer définitivement l'article suivant ?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1 font-mono">
                <div><strong>Référence :</strong> {articleToDelete.reference}</div>
                <div><strong>Désignation :</strong> {articleToDelete.designation}</div>
                <div><strong>Stock actuel :</strong> {articleToDelete.stockActuel}</div>
              </div>
              <p className="text-xs text-rose-600 font-bold">
                ⚠️ Cette action est irréversible et effacera totalement l'article du catalogue.
              </p>
            </div>
          ) : null
        }
      />
    </div>
  );
}
