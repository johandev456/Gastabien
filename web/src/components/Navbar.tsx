import React from 'react';

interface NavbarProps {
  onSync: () => void;
  isSyncing: boolean;
  onOpenAddModal: (initialType?: 'EXPENSE' | 'INCOME') => void;
  onOpenBanksModal: () => void;
  onOpenStatementModal: () => void;
  isGmailConnected?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
  isSyncing,
  onOpenAddModal,
  onOpenBanksModal,
  onOpenStatementModal,
  onLogout
}) => {
  return (
    <header className="sticky top-0 right-0 h-20 bg-surface/70 backdrop-blur-2xl z-30 border-b border-outline-variant/20 shadow-[0_1px_8px_rgba(0,0,0,0.06)] left-0">
      <div className="h-20 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo & Live Feed */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 mr-1 sm:mr-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-container via-primary to-secondary flex items-center justify-center shadow-[0_4px_16px_rgba(62,144,255,0.35)] shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-[22px]">account_balance_wallet</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-sm sm:text-base text-on-surface tracking-tight leading-none font-bold">
                GastaBien <span className="text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high ml-0.5">RD</span>
              </span>
              <span className="font-label-sm text-[10px] text-on-surface-variant tracking-wider uppercase mt-1 hidden sm:inline">
                Finanzas Personales
              </span>
            </div>
          </div>

          {/* Live Feed Pill */}
          <div className="inline-flex items-center gap-2 bg-surface-container-lowest/80 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="font-label-sm text-[11px] text-on-surface font-semibold tracking-wider">FEED EN VIVO</span>
            <div className="h-3 w-px bg-outline-variant/60 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-on-surface-variant font-medium">
              <span>Promerica</span>
              <span>•</span>
              <span>Popular</span>
              <span>•</span>
              <span>BHD</span>
              <span>•</span>
              <span className="text-secondary font-semibold">Qik</span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Estado de Cuenta */}
          <button
            onClick={onOpenStatementModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-surface-container-high/80 hover:bg-surface-bright text-on-surface font-body-sm text-[13px] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer"
            title="Cargar extracto o estado de cuenta bancario"
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            <span className="hidden lg:inline">Estado de Cuenta</span>
          </button>

          {/* Sincronizar */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            type="button"
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-surface-container-high/80 hover:bg-surface-bright text-on-surface font-body-sm text-[13px] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer ${
              isSyncing ? 'opacity-70 animate-pulse' : ''
            }`}
            title="Escanear avisos de bancos en Gmail"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
            </span>
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span className="hidden lg:inline">{isSyncing ? 'Escaneando...' : 'Sincronizar'}</span>
          </button>

          {/* + Ingreso */}
          <button
            onClick={() => onOpenAddModal('INCOME')}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-surface-container-high/80 hover:bg-surface-bright text-secondary font-body-sm text-[13px] font-semibold transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer"
            title="Registrar nuevo ingreso o depósito"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">add_circle</span>
            <span>+ Ingreso</span>
          </button>

          {/* + Nuevo Gasto */}
          <button
            onClick={() => onOpenAddModal('EXPENSE')}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-b from-primary-container to-inverse-primary text-on-primary font-body-sm text-[13px] font-semibold transition-all shadow-[0_8px_24px_-4px_rgba(62,144,255,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(62,144,255,0.65)] hover:scale-[1.02] cursor-pointer"
            title="Registrar nuevo gasto"
          >
            <span className="material-symbols-outlined text-[18px] text-on-primary">add</span>
            <span>+ Nuevo Gasto</span>
          </button>

          <div className="h-5 w-px bg-outline-variant/60 hidden sm:block"></div>

          {/* User Profile Button */}
          <button
            onClick={onOpenBanksModal}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            title="Configuración de Bancos"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">tune</span>
          </button>

          {/* 2FA Shield & Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-high/80 hover:bg-error-container/20 hover:text-error hover:border-error/40 text-on-surface-variant font-body-sm text-[12px] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer"
              title="Cerrar sesión 2FA en este dispositivo"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
              <span className="hidden xl:inline">2FA</span>
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
