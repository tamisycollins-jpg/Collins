import React from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  Truck,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'accueil'
  | 'ventes'
  | 'stock'
  | 'arrivages'
  | 'articles'
  | 'reglements'
  | 'rapports'
  | 'parametres';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  badges?: {
    stockAlerts?: number;
    salesCount?: number;
  };
}

export function BottomNav({ currentTab, onTabChange, badges }: BottomNavProps) {
  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'ventes', label: 'Ventes', icon: ShoppingCart },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'arrivages', label: 'Arrivages', icon: Truck },
    { id: 'articles', label: 'Articles', icon: ClipboardList },
    { id: 'reglements', label: 'Règlements', icon: DollarSign },
    { id: 'rapports', label: 'Rapports', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg print:hidden">
      <div className="max-w-4xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          const hasBadge =
            tab.id === 'stock' && badges?.stockAlerts ? badges.stockAlerts : 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-[56px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all relative cursor-pointer ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-blue-600 stroke-[2.4]' : 'stroke-[1.7]'
                  }`}
                />
                {hasBadge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {hasBadge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 whitespace-nowrap ${
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="w-4 h-0.5 bg-blue-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
