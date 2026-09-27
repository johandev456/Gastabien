import { 
  Sparkles, 
  RefreshCw, 
  Plus, 
  Building2, 
  Mail, 
  ShieldCheck,
  RotateCcw,
  TrendingUp,
  FileText
} from 'lucide-react';

interface NavbarProps {
  onSync: () => void;
  isSyncing: boolean;
  onOpenAddModal: (initialType?: 'EXPENSE' | 'INCOME') => void;
  onOpenBanksModal: () => void;
  onOpenStatementModal: () => void;
  onReset: () => void;
  lastSync?: string;
  isGmailConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
  isSyncing,
  onOpenAddModal,
  onOpenBanksModal,
  onOpenStatementModal,
  onReset,
  isGmailConnected = false
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Gasta<span className="text-emerald-400">Bien</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  RD
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Promerica • Popular • BHD • Qik
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Banks & Gmail status button */}
            <button
              onClick={onOpenBanksModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-sm"
              title="Ver bancos y estado de Gmail"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Bancos RD</span>
              {isGmailConnected ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                  <ShieldCheck className="w-3 h-3" /> Gmail
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/50">
                  <Mail className="w-3 h-3" /> Sync
                </span>
              )}
            </button>

            {/* Statement Sync Button */}
            <button
              onClick={onOpenStatementModal}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
              title="Conciliar con Estado de Cuenta bancario oficial"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline">Estado de Cuenta</span>
            </button>

            {/* Sync Email Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all ${
                isSyncing
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 hover:shadow-emerald-600/20 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncing ? 'Leyendo...' : 'Sincronizar'}</span>
            </button>

            {/* Add Manual Income / Nómina */}
            <button
              onClick={() => onOpenAddModal('INCOME')}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 shadow-sm active:scale-95 transition-all"
              title="Registrar Nómina o Ingreso"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">+ Ingreso</span>
            </button>

            {/* Add Manual Expense */}
            <button
              onClick={() => onOpenAddModal('EXPENSE')}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/30 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Gasto</span>
            </button>

            {/* Reset data */}
            <button
              onClick={onReset}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
              title="Reiniciar datos"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
