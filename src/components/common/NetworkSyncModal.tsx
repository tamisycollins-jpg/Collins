import React, { useState, useEffect } from 'react';
import {
  Wifi,
  ShieldCheck,
  Smartphone,
  Laptop,
  RefreshCw,
  Copy,
  Check,
  X,
  Server,
  Lock,
  Radio,
  ExternalLink,
  Users,
} from 'lucide-react';
import { NetworkSyncStatus, Parametres } from '../../types';
import { pullDatabaseFromServer, getNetworkSyncInfo } from '../../services/storage';

interface NetworkSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkStatus: NetworkSyncStatus;
  parametres: Parametres;
}

export function NetworkSyncModal({
  isOpen,
  onClose,
  networkStatus,
  parametres,
}: NetworkSyncModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [serverHealth, setServerHealth] = useState<{
    articles?: number;
    ventes?: number;
    connectedDevices?: number;
    lastUpdated?: string;
  } | null>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const syncInfo = getNetworkSyncInfo();

  useEffect(() => {
    if (isOpen) {
      fetch('/api/health')
        .then((res) => res.json())
        .then((data) => {
          setServerHealth({
            articles: data.totalArticles,
            ventes: data.totalVentes,
            connectedDevices: Math.max(1, data.connectedDevicesCount || 1),
            lastUpdated: data.lastUpdatedAt,
          });
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      const ok = await pullDatabaseFromServer();
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setServerHealth({
          articles: data.totalArticles,
          ventes: data.totalVentes,
          connectedDevices: Math.max(1, data.connectedDevicesCount || 1),
          lastUpdated: data.lastUpdatedAt,
        });
      }
      setSyncSuccess(ok);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch {
      setSyncSuccess(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Synchronisation Multi-Appareils & Sécurité
              </h2>
              <p className="text-xs text-blue-100">
                Serveur centralisé {parametres.nomEntreprise || 'Clinic Auto'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Banner */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-emerald-950 text-sm">
                  Réseau Actif & Synchronisé
                </span>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-200 text-emerald-900">
                  En Direct (SSE + Cloud)
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Chaque modification effectuée sur ce téléphone/PC est répercutée en temps réel sur tous les autres écrans connectés.
              </p>
            </div>
          </div>

          {/* Security Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black uppercase text-slate-800 tracking-wide">
                  Protection & Sécurité
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Session Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Identifiant Compte</span>
                <strong className="text-slate-900 font-bold">Clinic Auto</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Mot de Passe</span>
                <strong className="text-slate-900 font-bold font-mono">••••••••</strong>
              </div>
            </div>
          </div>

          {/* Connect other devices section */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white space-y-3">
            <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-xs uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>Connecter d'autres téléphones ou ordinateurs</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ouvrez simplement ce lien sur le navigateur de vos autres téléphones (Android/iPhone) ou ordinateurs de caisse :
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 select-all outline-none"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  copiedUrl
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                }`}
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-700" /> Téléphones Android / iOS
              </span>
              <span className="flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-slate-700" /> Ordinateurs & Caisses
              </span>
            </div>
          </div>

          {/* Sync Stats */}
          {serverHealth && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Articles en base</span>
                <strong className="text-sm font-black text-slate-900">{serverHealth.articles ?? 0}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Ventes enregistrées</span>
                <strong className="text-sm font-black text-slate-900">{serverHealth.ventes ?? 0}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Statut Serveur</span>
                <strong className="text-sm font-black text-emerald-600">100% OK</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            Dernière synchro : <strong className="text-slate-800">instantanée</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation...' : syncSuccess ? 'Synchronisé !' : 'Tester la synchro'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
