import React from 'react';
import { Search, Smartphone, Plus } from 'lucide-react';
import { Parametres } from '../../types';

interface HeaderProps {
  parametres: Parametres;
  onOpenSearch: () => void;
  onOpenNewSale: () => void;
  onOpenInstallAndroid: () => void;
}

export function Header({
  parametres,
  onOpenSearch,
  onOpenNewSale,
  onOpenInstallAndroid,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shadow-2xs print:hidden">
      {/* Brand logo / Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm shrink-0">
          K
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
              {parametres.nomEntreprise || 'KOSPAM GESTION'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Hors-ligne Actif</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenInstallAndroid}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          title="Installer sur Android / APK"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Installer APK</span>
          <span className="sm:hidden">APK</span>
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Rechercher"
          aria-label="Rechercher"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenNewSale}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nouvelle Vente</span>
          <span className="sm:hidden">Vente</span>
        </button>
      </div>
    </header>
  );
}
