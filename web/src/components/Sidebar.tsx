import React from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenBanksModal: () => void;
  isGmailConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenBanksModal,
  isGmailConnected = false
}) => {
  const navItems = [
    { id: 'overview', label: 'Resumen General', icon: 'grid_view' },
    { id: 'transactions', label: 'Transacciones', icon: 'receipt_long' },
    { id: 'budgets', label: 'Presupuestos', icon: 'pie_chart' },
    { id: 'banks', label: 'Bancos & Tarjetas', icon: 'account_balance', action: onOpenBanksModal },
    { id: 'analytics', label: 'Analíticas de Gasto', icon: 'trending_up' },
    { id: 'savings', label: 'Metas de Ahorro', icon: 'savings' },
  ];

  return (
    <aside className="w-64 shrink-0 hidden xl:flex flex-col justify-between h-screen sticky top-0 bg-surface-container-lowest/80 backdrop-blur-2xl border-r border-outline-variant/20 p-5 z-40 select-none">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-container via-primary to-secondary flex items-center justify-center shadow-[0_4px_16px_rgba(62,144,255,0.35)] shrink-0">
            <span className="material-symbols-outlined text-on-primary-container text-[22px]">account_balance_wallet</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none font-bold">
              GastaBien <span className="text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high ml-0.5">RD</span>
            </span>
            <span className="font-label-sm text-[10px] text-on-surface-variant tracking-wider uppercase mt-1">Finanzas Personales</span>
          </div>
        </div>

        {/* Live Bank Status Pill */}
        <button
          onClick={onOpenBanksModal}
          className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-surface-container-low/90 hover:bg-surface-container-high/80 border border-outline-variant/30 transition-all cursor-pointer shadow-sm text-left"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="font-body-sm text-[13px] text-on-surface font-medium">Bancos RD</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
            {isGmailConnected ? 'Conectado' : '4 En Línea'}
          </span>
        </button>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    onTabChange(item.id);
                  }
                }}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-body-md text-[14px] transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold shadow-[0_4px_16px_rgba(62,144,255,0.4)]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 font-normal'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-on-primary font-bold text-sm shadow-md">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
          <div className="flex flex-col">
            <span className="font-body-sm text-[13px] text-on-surface font-semibold leading-tight">Usuario RD</span>
            <span className="font-label-sm text-[11px] text-on-surface-variant">Santo Domingo, DO</span>
          </div>
        </div>
        <button
          onClick={onOpenBanksModal}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          title="Ajustes"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </aside>
  );
};
