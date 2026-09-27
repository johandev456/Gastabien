import React from 'react';

interface NavbarProps {
  onSync: () => void;
  isSyncing: boolean;
  onOpenAddModal: (initialType?: 'EXPENSE' | 'INCOME') => void;
  onOpenBanksModal: () => void;
  onOpenStatementModal: () => void;
  onReset?: () => void;
  lastSync?: string;
  isGmailConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
  isSyncing,
  onOpenAddModal,
  onOpenBanksModal,
  onOpenStatementModal,
  isGmailConnected = false
}) => {
  return (
    <header className="retro-box p-4 sm:p-5 mb-6" data-purpose="app-branding">
      {/* Top System Line / Arcade Machine Status */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-dashed border-[#444477] pb-2.5 mb-3 font-pixel text-[9px] sm:text-[10px] text-arcade-cyan tracking-wider">
        <div className="flex items-center space-x-3">
          <span className="text-arcade-green flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 bg-arcade-green inline-block animate-retro-blink"></span>
            1P [READY] • ONLINE
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden md:inline">STAGE: DOMINICAN_REP</span>
        </div>
        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          <span className="text-arcade-gold pixel-text-shadow font-bold">INSERT COIN [02]</span>
          <span className="bg-black text-white px-2 py-0.5 border border-white text-[8px] font-pixel">CREDIT 99</span>
        </div>
      </div>

      {/* Main Title & Arcade Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title & 8-Bit Cartridge Logo */}
        <div className="flex items-center space-x-3.5">
          {/* 8-Bit Pixel Diamond / Coin Icon Cartridge */}
          <div className="w-12 h-12 bg-black border-2 border-arcade-gold p-1 shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-arcade-gold" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 2h10v2H7V2zm-3 4h16v2H4V6zm-2 4h20v4H2v-4zm2 6h16v2H4v-2zm3 4h10v2H7v-2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-pixel font-bold text-white pixel-text-shadow tracking-tight">
                GASTA<span className="text-arcade-gold pixel-text-glow-gold">BIEN</span>
              </h1>
              <span className="bg-arcade-pink text-white font-pixel text-[9px] px-2 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">
                RD
              </span>
            </div>
            <p className="text-xs font-vt text-arcade-cyan tracking-widest mt-1 flex items-center gap-1.5">
              <span className="text-arcade-green">▶</span> PROMERICA • POPULAR • BHD • QIK
            </p>
          </div>
        </div>

        {/* Action Buttons (Arcade Control Buttons) */}
        <div className="flex flex-wrap items-center gap-2.5" data-purpose="header-actions">
          {/* Gmail Bank Sync Status Badge */}
          <button
            onClick={onOpenBanksModal}
            className="bg-[#060b18] border-2 border-[#ffcc00] px-3 py-1.5 flex items-center space-x-2 text-[10px] font-pixel text-[#ffcc00] shadow-[3px_3px_0px_#000] hover:bg-[#111132] transition-all cursor-pointer"
            title="Configurar y ver bancos conectados"
          >
            <span className={`w-2 h-2 ${isGmailConnected ? 'bg-[#39ff14] shadow-[0_0_6px_#39ff14]' : 'bg-[#ff3344]'} animate-pulse`} />
            <span className="tracking-wider">BANCOS RD</span>
            <span className="text-[#00ffff] text-[9px]">{isGmailConnected ? '[GMAIL OK]' : '[GMAIL]'}</span>
          </button>

          {/* Estado de Cuenta (Quest Log / Amber Arcade Button) */}
          <button
            onClick={onOpenStatementModal}
            className="pixel-btn text-[#1a0f00] font-bold shadow-[inset_2px_2px_0px_#ffea75,inset_-2px_-2px_0px_#8a6500,3px_3px_0px_#000]"
            style={{ background: 'linear-gradient(180deg, #ffcc00 0%, #e6a100 100%)' }}
            title="Cargar estado de cuenta bancario CSV"
          >
            <span className="mr-1.5 text-black">📜</span> ESTADO CTA
          </button>

          {/* Sincronizar Button (Green Microswitch) */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`pixel-btn pixel-btn-primary ${isSyncing ? 'opacity-70 animate-pulse' : ''}`}
            title="Sincronizar movimientos de Gmail y Bancos"
          >
            <span className="mr-1">⚡</span> {isSyncing ? 'ESCANEANDO...' : 'SINCRONIZAR'}
          </button>

          {/* + Ingreso (Blue Microswitch) */}
          <button
            onClick={() => onOpenAddModal('INCOME')}
            className="pixel-btn pixel-btn-cyan"
            title="Registrar nuevo ingreso o nómina"
          >
            <span className="mr-1 font-bold">+</span> INGRESO
          </button>

          {/* + Nuevo Gasto (Crimson Red Microswitch) */}
          <button
            onClick={() => onOpenAddModal('EXPENSE')}
            className="pixel-btn pixel-btn-coin"
            title="Registrar nuevo gasto manual"
          >
            <span className="mr-1">▼</span> NUEVO GASTO
          </button>
        </div>
      </div>
    </header>
  );
};
