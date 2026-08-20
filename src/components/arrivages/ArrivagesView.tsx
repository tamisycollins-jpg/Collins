import React, { useState, useEffect } from 'react';
import { Plus, Search, Truck, Calendar, AlertCircle, CheckCircle2, ArrowUpRight, X, Package } from 'lucide-react';
import { Arrivage, Article, Parametres } from '../../types';
import { addArrivage } from '../../services/storage';
import { formatDate, formatDateTime, normalizeSearch } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface ArrivagesViewProps {
  arrivages: Arrivage[];
  articles: Article[];
  parametres: Parametres;
  preselectedArticle?: Article | null;
  onClearPreselected?: () => void;
}

export function ArrivagesView({
  arrivages,
  articles,
  parametres,
  preselectedArticle,
  onClearPreselected,
}: ArrivagesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [articleSearch, setArticleSearch] = useState('');
  const [quantite, setQuantite] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [remarque, setRemarque] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Handle preselected article if passed from another view
  useEffect(() => {
    if (preselectedArticle) {
      setSelectedArticleId(preselectedArticle.id);
      setIsAddModalOpen(true);
    }
  }, [preselectedArticle]);

  const activeArticles = articles.filter((a) => a.status === 'ACTIF');

  const filteredArticleChoices = activeArticles.filter((art) => {
    if (!articleSearch.trim()) return true;
    const term = normalizeSearch(articleSearch);
    return (
      normalizeSearch(art.reference).includes(term) ||
      normalizeSearch(art.designation).includes(term) ||
      normalizeSearch(art.affectation).includes(term)
    );
  });

  const selectedArticle = articles.find((a) => a.id === selectedArticleId);

  const filteredArrivages = arrivages.filter((arr) => {
    if (!searchTerm.trim()) return true;
    const term = normalizeSearch(searchTerm);
    return (
      normalizeSearch(arr.numeroArrivage).includes(term) ||
      normalizeSearch(arr.articleReference).includes(term) ||
      normalizeSearch(arr.articleDesignation).includes(term) ||
      (arr.remarque && normalizeSearch(arr.remarque).includes(term))
    );
  });

  const handleOpenAdd = () => {
    setSelectedArticleId(preselectedArticle ? preselectedArticle.id : '');
    setArticleSearch('');
    setQuantite('');
    setDate(new Date().toISOString().substring(0, 10));
    setRemarque('');
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    if (onClearPreselected) onClearPreselected();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (!selectedArticleId) throw new Error('Veuillez sélectionner un article.');
      const qty = parseInt(quantite, 10);
      if (isNaN(qty) || qty <= 0) throw new Error('La quantité reçue doit être au moins de 1.');

      const result = addArrivage({
        articleId: selectedArticleId,
        quantite: qty,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        remarque: remarque.trim(),
      });

      setFormSuccess(`Arrivage ${result.numeroArrivage} enregistré (+${qty} unités en stock) !`);
      setTimeout(() => {
        handleCloseModal();
        setFormSuccess(null);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de l'enregistrement de l'arrivage.");
    }
  };

  const totalQuantiteRecue = filteredArrivages.reduce((sum, a) => sum + a.quantite, 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>📦 Arrivages</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {arrivages.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Réception des pièces et réapprovisionnement automatique du stock
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          disabled={activeArticles.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>➕ NOUVEL ARRIVAGE</span>
        </button>
      </div>

      {activeArticles.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <span className="font-bold">Catalogue vide :</span> Veuillez d'abord ajouter un article dans l'onglet{' '}
            <span className="font-bold">Articles</span> avant de pouvoir saisir un arrivage.
          </div>
        </div>
      )}

      {/* Search & Summary Stats */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° arrivage, référence, désignation..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
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

        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span>{filteredArrivages.length} arrivage(s) trouvé(s)</span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Total reçu : +{totalQuantiteRecue} pièces
          </span>
        </div>
      </div>

      {/* Arrivages List */}
      {filteredArrivages.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Aucun arrivage enregistré</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Lorsque vous recevez de nouveaux cartons ou pièces du fournisseur, saisissez un arrivage pour mettre à jour
            votre stock automatiquement.
          </p>
          {activeArticles.length > 0 && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Saisir un arrivage</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredArrivages.map((arr) => (
            <div
              key={arr.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {arr.numeroArrivage}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {formatDate(arr.date)}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-bold text-xs text-blue-900 bg-slate-100 px-1.5 py-0.5 rounded">
                    {arr.articleReference}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{arr.articleDesignation}</h3>
                </div>

                {arr.remarque && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-1.5 rounded-md border border-slate-100 mt-1">
                    Note : {arr.remarque}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Quantité reçue</div>
                  <div className="text-base font-extrabold text-emerald-600 flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    +{arr.quantite}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL NOUVEL ARRIVAGE */}
      {/* ========================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title="➕ Enregistrer un nouvel arrivage"
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

          {/* Article selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Article concerné <span className="text-rose-500">*</span>
            </label>

            {/* Quick search input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                placeholder="Filtrer la liste des articles..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <select
              required
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">-- Choisir un article dans la liste --</option>
              {filteredArticleChoices.map((art) => (
                <option key={art.id} value={art.id}>
                  {art.reference} - {art.designation} (Stock actuel: {art.stockActuel})
                </option>
              ))}
            </select>
          </div>

          {/* Live stock calculation preview */}
          {selectedArticle && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Désignation :</span>
                <span className="font-bold text-slate-900">{selectedArticle.designation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Affectation / Véhicule :</span>
                <span className="font-medium text-slate-800">{selectedArticle.affectation || '-'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-700">Stock actuel :</span>
                <span className="text-slate-900">{selectedArticle.stockActuel} pièces</span>
              </div>
              {quantite && parseInt(quantite, 10) > 0 && (
                <div className="flex justify-between font-extrabold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <span>Nouveau stock prévu :</span>
                  <span>{selectedArticle.stockActuel + parseInt(quantite, 10)} pièces</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Quantité reçue <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-extrabold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Date de réception
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Remarque / Bon de livraison (optionnel)
            </label>
            <input
              type="text"
              value={remarque}
              onChange={(e) => setRemarque(e.target.value)}
              placeholder="Ex: Colis n°4, réapprovisionnement mensuel..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
            >
              Valider l'arrivage
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
