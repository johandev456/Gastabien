import React from 'react';
import { formatRelative } from '../utils/format';

interface NavbarProps {
  onSync: () => void;
  isSyncing: boolean;
  onOpenAddModal: (initialType?: 'EXPENSE' | 'INCOME') => void;
  onOpenBanksModal: () => void;
  onOpenStatementModal: () => void;
  isGmailConnected?: boolean;
  needsReconnect?: boolean;
  lastSyncAt?: string | null;
  onLogout?: () => void;
}

const iconBtn =
  'inline-flex items-center justify-center gap-1.5 h-9 min-w-9 px-2.5 sm:px-3.5 rounded-full bg-surface-container-high/80 hover:bg-surface-bright text-on-surface font-body-sm text-[13px] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer shrink-0 disabled:cursor-not-allowed';

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
  isSyncing,
  onOpenAddModal,
  onOpenBanksModal,
  onOpenStatementModal,
  isGmailConnected,
  needsReconnect,
  lastSyncAt,
  onLogout
}) => {
  const gmailState = needsReconnect
    ? { dot: 'bg-error', text: 'Reconectar Gmail', cls: 'text-error' }
    : isGmailConnected
      ? { dot: 'bg-secondary', text: `Gmail • ${formatRelative(lastSyncAt)}`, cls: 'text-on-surface' }
      : { dot: 'bg-outline', text: 'Gmail sin vincular', cls: 'text-on-surface-variant' };

  return (
    <header className="sticky top-0 h-16 sm:h-20 bg-surface/70 backdrop-blur-2xl z-30 border-b border-outline-variant/20 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
      <div className="h-full w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Brand Logo & Gmail status */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-primary-container via-primary to-secondary flex items-center justify-center shadow-[0_4px_16px_rgba(62,144,255,0.35)] shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-[20px] sm:text-[22px]" aria-hidden="true">account_balance_wallet</span>
            </div>
            <div className="hidden min-[400px]:flex flex-col min-w-0">
              <span className="font-headline-sm text-sm sm:text-base text-on-surface tracking-tight leading-none font-bold whitespace-nowrap">
                GastaBien <span className="text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high ml-0.5">RD</span>
              </span>
              <span className="font-label-sm text-[10px] text-on-surface-variant tracking-wider uppercase mt-1 hidden sm:inline">
                Finanzas Personales
              </span>
            </div>
          </div>

          {/* Real Gmail sync status (replaces the old static "live feed" pill) */}
          <button
            type="button"
            onClick={onOpenBanksModal}
            className="hidden md:inline-flex items-center gap-2 bg-surface-container-lowest/80 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer hover:bg-surface-container-low"
            title={lastSyncAt ? `Última sincronización: ${new Date(lastSyncAt).toLocaleString('es-DO')}` : 'Configurar conexión con Gmail'}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              {isSyncing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-80"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${gmailState.dot}`}></span>
            </span>
            <span className={`font-label-sm text-[11px] font-semibold tracking-wide whitespace-nowrap ${gmailState.cls}`}>
              {isSyncing ? 'Sincronizando…' : gmailState.text}
            </span>
          </button>
        </div>

        {/* Right Side: Action Buttons (icon-only on phones) */}
        <nav className="flex items-center gap-1.5 sm:gap-2.5" aria-label="Acciones principales">
          <button
            onClick={onOpenStatementModal}
            type="button"
            className={`${iconBtn} hidden sm:inline-flex`}
            title="Cargar extracto o estado de cuenta bancario"
            aria-label="Cargar estado de cuenta"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">description</span>
            <span className="hidden lg:inline">Estado de Cuenta</span>
          </button>

          <button
            onClick={onSync}
            disabled={isSyncing}
            type="button"
            className={`${iconBtn} ${isSyncing ? 'opacity-70' : ''}`}
            title="Escanear avisos de bancos en Gmail"
            aria-label={isSyncing ? 'Sincronizando' : 'Sincronizar Gmail'}
          >
            <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true">sync</span>
            <span className="hidden lg:inline">{isSyncing ? 'Escaneando…' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => onOpenAddModal('INCOME')}
            type="button"
            className={`${iconBtn} text-secondary font-semibold`}
            title="Registrar nuevo ingreso o depósito"
            aria-label="Registrar ingreso"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">add_circle</span>
            <span className="hidden md:inline">Ingreso</span>
          </button>

          <button
            onClick={() => onOpenAddModal('EXPENSE')}
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 min-w-9 px-2.5 sm:px-5 rounded-full bg-gradient-to-b from-primary-container to-inverse-primary text-on-primary font-body-sm text-[13px] font-semibold transition-all shadow-[0_8px_24px_-4px_rgba(62,144,255,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(62,144,255,0.65)] cursor-pointer shrink-0"
            title="Registrar nuevo gasto"
            aria-label="Registrar gasto"
          >
            <span className="material-symbols-outlined text-[18px] text-on-primary" aria-hidden="true">add</span>
            <span className="hidden sm:inline">Nuevo Gasto</span>
          </button>

          <div className="h-5 w-px bg-outline-variant/60 hidden sm:block" aria-hidden="true"></div>

          <button
            onClick={onOpenBanksModal}
            type="button"
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            title="Configuración de Bancos"
            aria-label="Configuración de bancos"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]" aria-hidden="true">tune</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              type="button"
              className={`${iconBtn} hover:bg-error-container/20 hover:text-error hover:border-error/40 text-on-surface-variant text-[12px]`}
              title="Cerrar sesión 2FA en este dispositivo"
              aria-label="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary hidden xl:inline" aria-hidden="true">verified_user</span>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">logout</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
