import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  Layers,
  Terminal,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Modal } from './Modal';

interface InstallAndroidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAndroidModal({ isOpen, onClose }: InstallAndroidModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'DIRECT' | 'APK_BUILD' | 'CAPACITOR'>('DIRECT');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        "Pour installer sur Android :\n1. Ouvrez le menu de Chrome (3 petits points en haut à droite)\n2. Appuyez sur 'Installer l'application' ou 'Ajouter à l'écran d'accueil'."
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📱 Installer sur Téléphone Android (APK / App)"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl border border-blue-900/50 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
            <Sparkles className="w-4 h-4" />
            <span>Application 100% Hors-Ligne & Prête pour Android</span>
          </div>
          <h3 className="text-base font-black text-white">
            KOSPAM GESTION sur votre smartphone
          </h3>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            L'application est spécialement codée avec un <strong>Manifest PWA</strong>, un <strong>Service Worker</strong> et la configuration <strong>Capacitor Android</strong> intégrée.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('DIRECT')}
            className={`flex-1 py-2 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
              activeTab === 'DIRECT'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ Installation Directe (Recommandé)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('APK_BUILD')}
            className={`flex-1 py-2 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
              activeTab === 'APK_BUILD'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📦 Générateur APK (Web2Apk)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CAPACITOR')}
            className={`flex-1 py-2 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
              activeTab === 'CAPACITOR'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🛠️ Android Studio / Capacitor
          </button>
        </div>

        {/* TAB 1: DIRECT 1-CLICK PWA INSTALL */}
        {activeTab === 'DIRECT' && (
          <div className="space-y-3 p-1">
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="font-bold text-blue-950 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Option 1 : Installation instantanée sur votre écran d'accueil</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Transforme immédiatement l'application en une véritable application Android native sans passer par le Play Store : icône sur l'écran d'accueil, plein écran sans barre d'adresse et fonctionnement 100% hors ligne.
              </p>

              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-extrabold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Smartphone className="w-5 h-5" />
                <span>📲 Installer l'application sur mon téléphone</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 block">
                Comment faire manuellement depuis Google Chrome sur Android :
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                <li>Ouvrez le lien de l'application dans <strong>Google Chrome</strong> ou <strong>Brave</strong> sur votre téléphone.</li>
                <li>Appuyez sur le menu des <strong>3 petits points verticaux (⋮)</strong> en haut à droite du navigateur.</li>
                <li>Sélectionnez <strong>"Installer l'application"</strong> (ou <em>"Ajouter à l'écran d'accueil"</em>).</li>
                <li>Confirmez : l'icône <strong>KOSPAM GESTION</strong> apparaîtra avec vos autres applications Android !</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 2: ONLINE APK GENERATOR */}
        {activeTab === 'APK_BUILD' && (
          <div className="space-y-3 p-1">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="font-bold text-emerald-950 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Option 2 : Convertir en fichier APK téléchargeable (.apk)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Comme notre application intègre déjà le fichier <code>manifest.json</code> et le <code>service worker</code>, vous pouvez générer un fichier <strong>.APK installable</strong> en 1 clic grâce à ces outils certifiés :
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="https://www.pwabuilder.com"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2 shadow-xs transition-colors cursor-pointer group"
              >
                <div>
                  <span className="font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-1">
                    PWABuilder (Microsoft) <ExternalLink className="w-3 h-3 text-slate-400" />
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Collez l'URL de votre application pour télécharger directement le package Android APK.
                  </p>
                </div>
              </a>

              <a
                href="https://gonative.io"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2 shadow-xs transition-colors cursor-pointer group"
              >
                <div>
                  <span className="font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-1">
                    Web2Apk / Median <ExternalLink className="w-3 h-3 text-slate-400" />
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Génère instantanément un fichier APK Android prêt à être transféré sur votre téléphone.
                  </p>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* TAB 3: CAPACITOR & ANDROID STUDIO */}
        {activeTab === 'CAPACITOR' && (
          <div className="space-y-3 p-1">
            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Option 3 : Compiler l'APK avec Capacitor & Android Studio</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Le fichier <code>capacitor.config.json</code> avec l'ID <code>mg.kospam.gestion</code> est déjà inclus dans votre projet.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] space-y-2 text-slate-800 overflow-x-auto">
              <p className="text-slate-500 font-sans font-bold text-xs">Commandes pour générer l'APK :</p>
              <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg space-y-1">
                <div># 1. Compiler le code web</div>
                <div className="text-white">npm run build</div>
                <div className="mt-2 text-emerald-400"># 2. Initialiser le projet Android</div>
                <div className="text-white">npx cap add android</div>
                <div className="mt-2 text-emerald-400"># 3. Synchroniser les assets</div>
                <div className="text-white">npx cap sync</div>
                <div className="mt-2 text-emerald-400"># 4. Ouvrir dans Android Studio et générer l'APK</div>
                <div className="text-white">npx cap open android</div>
              </div>
              <p className="text-[10px] text-slate-500 font-sans mt-1">
                Dans Android Studio : Menu <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> pour obtenir le fichier <code>app-debug.apk</code> ou <code>app-release.apk</code>.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}
