import React, { useState, useEffect } from 'react';
import { DatabaseSchema, Vente, Article, Arrivage } from './types';
import { getDatabase, subscribeToDatabase } from './services/storage';
import { Header } from './components/layout/Header';
import { BottomNav, NavTab } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { VentesView } from './components/ventes/VentesView';
import { StockView } from './components/stock/StockView';
import { ArrivagesView } from './components/arrivages/ArrivagesView';
import { ArticlesView } from './components/articles/ArticlesView';
import { ReglementsView } from './components/reglements/ReglementsView';
import { RapportsView } from './components/rapports/RapportsView';
import { ParametresView } from './components/parametres/ParametresView';
import { FactureA6Modal } from './components/factures/FactureA6Modal';
import { FicheInterneModal } from './components/factures/FicheInterneModal';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { InstallAndroidModal } from './components/common/InstallAndroidModal';

export default function App() {
  const [db, setDb] = useState<DatabaseSchema>(getDatabase);
  const [currentTab, setCurrentTab] = useState<NavTab>('accueil');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInstallAndroidOpen, setIsInstallAndroidOpen] = useState(false);
  const [isNewSaleOpenTrigger, setIsNewSaleOpenTrigger] = useState(false);

  // Modals for invoices and sheets
  const [selectedVenteForA6, setSelectedVenteForA6] = useState<Vente | null>(null);
  const [selectedVenteForInterne, setSelectedVenteForInterne] = useState<Vente | null>(null);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((newDb) => {
      setDb(newDb);
    });
    return unsubscribe;
  }, []);

  // Compute badges for bottom navigation
  const stockAlertsCount = db.articles.filter(
    (a) => a.status === 'ACTIF' && a.stockActuel <= a.seuilStock
  ).length;

  const handleOpenNewSale = () => {
    setCurrentTab('ventes');
    setIsNewSaleOpenTrigger(true);
  };

  const handleSelectArticleFromSearch = (article: Article) => {
    setCurrentTab('articles');
  };

  const handleSelectVenteFromSearch = (vente: Vente) => {
    setSelectedVenteForA6(vente);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-safe">
      {/* Top Header */}
      <Header
        parametres={db.parametres}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNewSale={handleOpenNewSale}
        onOpenInstallAndroid={() => setIsInstallAndroidOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 md:p-6">
        {currentTab === 'accueil' && (
          <DashboardView
            db={db}
            parametres={db.parametres}
            onNavigate={(tab) => setCurrentTab(tab as NavTab)}
            onOpenNewSale={handleOpenNewSale}
            onSelectVenteForA6={(v) => setSelectedVenteForA6(v)}
          />
        )}

        {currentTab === 'ventes' && (
          <VentesView
            ventes={db.ventes}
            articles={db.articles}
            parametres={db.parametres}
            onOpenA6Modal={(v) => setSelectedVenteForA6(v)}
            autoOpenNewSale={isNewSaleOpenTrigger}
            onResetAutoOpen={() => setIsNewSaleOpenTrigger(false)}
          />
        )}

        {currentTab === 'stock' && (
          <StockView
            articles={db.articles}
            mouvements={db.mouvements}
            parametres={db.parametres}
          />
        )}

        {currentTab === 'arrivages' && (
          <ArrivagesView
            arrivages={db.arrivages}
            articles={db.articles}
            parametres={db.parametres}
          />
        )}

        {currentTab === 'articles' && (
          <ArticlesView articles={db.articles} parametres={db.parametres} />
        )}

        {currentTab === 'reglements' && (
          <ReglementsView
            reglements={db.reglements}
            ventes={db.ventes}
            parametres={db.parametres}
          />
        )}

        {currentTab === 'rapports' && (
          <RapportsView db={db} parametres={db.parametres} />
        )}

        {currentTab === 'parametres' && (
          <ParametresView
            parametres={db.parametres}
            onOpenInstallAndroid={() => setIsInstallAndroidOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        badges={{
          stockAlerts: stockAlertsCount,
        }}
      />

      {/* FACTURE A6 MODAL (PRINTABLE) */}
      <FactureA6Modal
        isOpen={!!selectedVenteForA6}
        onClose={() => setSelectedVenteForA6(null)}
        vente={selectedVenteForA6}
        parametres={db.parametres}
      />

      {/* FICHE INTERNE DE VENTE MODAL (PRINTABLE) */}
      <FicheInterneModal
        isOpen={!!selectedVenteForInterne}
        onClose={() => setSelectedVenteForInterne(null)}
        vente={selectedVenteForInterne}
        parametres={db.parametres}
      />

      {/* GLOBAL SEARCH MODAL */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        db={db}
        onSelectArticle={handleSelectArticleFromSearch}
        onSelectVente={handleSelectVenteFromSearch}
      />

      {/* ANDROID APK & INSTALL MODAL */}
      <InstallAndroidModal
        isOpen={isInstallAndroidOpen}
        onClose={() => setIsInstallAndroidOpen(false)}
      />
    </div>
  );
}
