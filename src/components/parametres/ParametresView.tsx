import React, { useState, useRef } from 'react';
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building,
  Percent,
  Coins,
  FileText,
  ShieldAlert,
  Sliders,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Parametres } from '../../types';
import {
  updateParametres,
  exportBackupJSON,
  importBackupJSON,
  resetDatabase,
} from '../../services/storage';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface ParametresViewProps {
  parametres: Parametres;
  onOpenInstallAndroid?: () => void;
}

export function ParametresView({ parametres, onOpenInstallAndroid }: ParametresViewProps) {
  const [formData, setFormData] = useState<Parametres>(parametres);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof Parametres, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      updateParametres({
        nomEntreprise: formData.nomEntreprise.trim() || 'KOSPAM GESTION',
        slogan: formData.slogan.trim(),
        adresse: formData.adresse.trim(),
        telephone: formData.telephone.trim(),
        email: formData.email.trim(),
        devise: formData.devise.trim() || 'Ar',
        tauxCommissionDefaut: Number(formData.tauxCommissionDefaut) || 10,
        seuilStockDefaut: Number(formData.seuilStockDefaut) || 2,
        texteFacture: formData.texteFacture.trim(),
        conditionsVente: formData.conditionsVente.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde.');
    }
  };

  // Export JSON backup file
  const handleExportBackup = () => {
    try {
      const json = exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const now = new Date().toISOString().substring(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kospam_gestion_sauvegarde_${now}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccess('Fichier de sauvegarde téléchargé avec succès.');
      setTimeout(() => setBackupSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg('Erreur lors de l’export de la sauvegarde.');
    }
  };

  // Import JSON backup file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = importBackupJSON(content);
        setBackupSuccess(
          `Restauration terminée avec succès (${result.countArticles} articles restaurés) !`
        );
        setTimeout(() => setBackupSuccess(null), 4000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Fichier de sauvegarde invalide.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmReset = () => {
    resetDatabase();
    setIsResetDialogOpen(false);
    setBackupSuccess('Base de données réinitialisée (vierge).');
    setTimeout(() => setBackupSuccess(null), 4000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <span>⚙️ Paramètres & Sauvegarde</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration de votre entreprise, facturation A6, taux et gestion des données
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Paramètres enregistrés avec succès !</span>
        </div>
      )}

      {backupSuccess && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{backupSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 0. APPLICATION MOBILE ANDROID (APK / PWA) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-4 sm:p-5 rounded-2xl border border-blue-900 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-white text-sm sm:text-base">
                  Application Android (APK & PWA)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Prêt
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Spécialement configuré avec Manifest, Service Worker et Capacitor pour Android.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenInstallAndroid}
            className="w-full sm:w-auto py-2.5 px-4 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>Installer / Télécharger APK</span>
          </button>
        </div>
      </div>

      {/* 1. SAUVEGARDE & RESTAURATION BOX */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">Sauvegarde & Restauration</h2>
            <p className="text-[11px] text-slate-500">
              Exportez ou transférez vos données sur un autre téléphone sans connexion
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                <span>💾 Sauvegarder mes données</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Télécharge un fichier JSON sécurisé contenant tous vos articles, ventes, stock et règlements.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Télécharger la sauvegarde (.JSON)
            </button>
          </div>

          {/* Import / Restore */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>♻️ Restaurer une sauvegarde</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Restaure l'ensemble de votre base de données à partir d'un fichier de sauvegarde précédent.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="restore-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Choisir un fichier de sauvegarde
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONFIGURATION FORM */}
      <form onSubmit={handleSaveSettings} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">Informations de l'Entreprise</h2>
            <p className="text-[11px] text-slate-500">Ces informations figureront sur vos factures A6</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nom de l'entreprise <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nomEntreprise}
              onChange={(e) => handleChange('nomEntreprise', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Slogan / Activité
            </label>
            <input
              type="text"
              value={formData.slogan}
              onChange={(e) => handleChange('slogan', e.target.value)}
              placeholder="Ex: Dépositaire & Vente de Pièces"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Téléphone
            </label>
            <input
              type="text"
              value={formData.telephone}
              onChange={(e) => handleChange('telephone', e.target.value)}
              placeholder="Ex: +261 34 00 000 00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Ex: contact@kospam.mg"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Adresse
          </label>
          <input
            type="text"
            value={formData.adresse}
            onChange={(e) => handleChange('adresse', e.target.value)}
            placeholder="Ex: Antananarivo, Madagascar"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 3. TAUX & DEVISE */}
        <div className="pt-3 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Règles Financières & Stock
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Taux de commission par défaut (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={formData.tauxCommissionDefaut}
                onChange={(e) => handleChange('tauxCommissionDefaut', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Par défaut : 10 %</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Devise d'affichage
              </label>
              <input
                type="text"
                required
                value={formData.devise}
                onChange={(e) => handleChange('devise', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Par défaut : Ar (Ariary)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seuil d'alerte stock faible
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.seuilStockDefaut}
                onChange={(e) => handleChange('seuilStockDefaut', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Par défaut : 2 unités</p>
            </div>
          </div>
        </div>

        {/* 4. TEXTES FACTURE A6 */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Mentions sur les Factures A6
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Message de remerciement
            </label>
            <input
              type="text"
              value={formData.texteFacture}
              onChange={(e) => handleChange('texteFacture', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Conditions de vente / Retour
            </label>
            <input
              type="text"
              value={formData.conditionsVente}
              onChange={(e) => handleChange('conditionsVente', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les modifications</span>
          </button>
        </div>
      </form>

      {/* 5. ZONE DANGER / RESET DB */}
      <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 space-y-2">
        <h3 className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Zone de réinitialisation</span>
        </h3>
        <p className="text-[11px] text-rose-600 leading-relaxed">
          Permet de remettre à zéro toute la base de données (articles, ventes, règlements). Pensez à faire une
          sauvegarde avant si nécessaire.
        </p>
        <button
          type="button"
          onClick={() => setIsResetDialogOpen(true)}
          className="mt-2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          Réinitialiser la base de données
        </button>
      </div>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title="Réinitialiser complètement la base ?"
        variant="danger"
        confirmLabel="Oui, tout effacer"
        cancelLabel="Annuler"
        message={
          <div>
            <p className="font-bold text-rose-700">Cette action est irréversible.</p>
            <p className="text-slate-600 mt-1">
              Tous les articles, arrivages, ventes, règlements et mouvements seront supprimés et la base redeviendra
              totalement vide.
            </p>
          </div>
        }
      />
    </div>
  );
}
