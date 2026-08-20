import React, { useState, useEffect } from 'react';
import { Search, Smartphone, Plus, Wifi, RefreshCw, LogOut, UserCheck, ShieldCheck } from 'lucide-react';
import { Parametres, AuthUser, NetworkSyncStatus } from '../../types';
import { getNetworkStatus, subscribeToNetworkStatus, pullDatabaseFromServer } from '../../services/storage';
import { NetworkSyncModal } from '../common/NetworkSyncModal';

interface HeaderProps {
  parametres: Parametres;
  user: AuthUser | null;
  onOpenSearch: () => void;
  onOpenNewSale: () => void;
  onOpenInstallAndroid: () => void;
  onLogout: () => void;
}

export function Header({
  parametres,
  user,
  onOpenSearch,
  onOpenNewSale,
  onOpenInstallAndroid,
  onLogout,
}: HeaderProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkSyncStatus>(getNetworkStatus);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToNetworkStatus((status) => {
      setNetworkStatus(status);
    });
    return unsub;
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManualSyncing(true);
    await pullDatabaseFromServer();
    setTimeout(() => setIsManualSyncing(false), 500);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-2xs print:hidden">
        {/* Brand logo / Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm shrink-0">
            K
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                {parametres.nomEntreprise || 'CLINIC AUTO'}
              </span>
            </div>

            {/* Network and User status badge (click to open sync details) */}
            <div className="flex items-center gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => setIsNetworkModalOpen(true)}
                className="flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Cliquer pour voir les détails de synchronisation multi-appareils & sécurité"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${networkStatus === 'CONNECTE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="truncate">
                  {networkStatus === 'CONNECTE' ? 'En réseau synchronisé' : 'Synchronisation...'}
                </span>
                <span
                  onClick={handleManualSync}
                  className="hover:rotate-180 transition-transform p-0.5"
                  title="Actualiser maintenant"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                </span>
              </button>

              {user && (
                <span className="hidden sm:inline-flex items-center gap-1 text-slate-500 font-medium">
                  • <UserCheck className="w-3 h-3 text-blue-600" />
                  <strong className="text-slate-800">{user.username}</strong>
                </span>
              )}
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

          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title={`Déconnexion (${user?.username || 'Clinic Auto'})`}
            aria-label="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Network & Security Details Modal */}
      <NetworkSyncModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        networkStatus={networkStatus}
        parametres={parametres}
      />
    </>
  );
}

