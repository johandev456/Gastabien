import React from 'react';
import { Building2, Check, Sparkles } from 'lucide-react';
import { BankCode } from '../types';

interface BankFilterBarProps {
  selectedBanks: string[];
  onToggleBank: (bankCode: string) => void;
  onSelectAll: () => void;
}

export const BankFilterBar: React.FC<BankFilterBarProps> = ({
  selectedBanks,
  onToggleBank,
  onSelectAll
}) => {
  const isAllSelected = selectedBanks.length === 0 || selectedBanks.includes('ALL');

  const banks: { code: BankCode; name: string; short: string; color: string; activeBorder: string; activeBg: string }[] = [
    {
      code: 'PROMERICA',
      name: 'Banco Promerica',
      short: 'Promerica',
      color: 'text-teal-400',
      activeBorder: 'border-teal-500 bg-teal-950/70 text-teal-200 shadow-teal-950/50',
      activeBg: 'bg-teal-500'
    },
    {
      code: 'POPULAR',
      name: 'Banco Popular',
      short: 'Popular',
      color: 'text-blue-400',
      activeBorder: 'border-blue-500 bg-blue-950/70 text-blue-200 shadow-blue-950/50',
      activeBg: 'bg-blue-500'
    },
    {
      code: 'BHD',
      name: 'Banco BHD',
      short: 'BHD',
      color: 'text-emerald-400',
      activeBorder: 'border-emerald-500 bg-emerald-950/70 text-emerald-200 shadow-emerald-950/50',
      activeBg: 'bg-emerald-500'
    },
    {
      code: 'QIK',
      name: 'Qik Banco Digital',
      short: 'Qik',
      color: 'text-purple-400',
      activeBorder: 'border-purple-500 bg-purple-950/70 text-purple-200 shadow-purple-950/50',
      activeBg: 'bg-purple-500'
    }
  ];

  return (
    <div className="glass-card rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
      
      {/* Title / Info */}
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <div className="p-1.5 rounded-lg bg-slate-800 text-emerald-400">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-white block">Filtrar Todo por Banco:</span>
          <span className="text-[11px] text-slate-400">
            {isAllSelected
              ? 'Mostrando todos los bancos dominicanos'
              : `Filtrando gráficos y balances por: ${selectedBanks.join(', ')}`}
          </span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        
        {/* All Banks chip */}
        <button
          onClick={onSelectAll}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
            isAllSelected
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950/40'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          {isAllSelected && <Check className="w-3.5 h-3.5" />}
          <span>Todos</span>
        </button>

        {/* Bank Chips */}
        {banks.map((b) => {
          const isSelected = selectedBanks.includes(b.code);
          return (
            <button
              key={b.code}
              onClick={() => onToggleBank(b.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm ${
                isSelected
                  ? `${b.activeBorder} ring-1 ring-white/10`
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSelected ? b.activeBg : 'bg-slate-600'}`} />
              <span>{b.short}</span>
              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}

        {!isAllSelected && (
          <button
            onClick={onSelectAll}
            className="text-[11px] text-slate-400 hover:text-rose-400 underline ml-1 px-1"
          >
            Limpiar filtro
          </button>
        )}
      </div>

    </div>
  );
};
