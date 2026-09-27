import React from 'react';
import { BankDistribution as BankDistType } from '../types';
import { CreditCard, Check, Filter } from 'lucide-react';

interface BankDistributionProps {
  banks: BankDistType[];
  selectedBanks?: string[];
  onSelectBank?: (bankCode: string) => void;
}

export const BankDistribution: React.FC<BankDistributionProps> = ({
  banks,
  selectedBanks = [],
  onSelectBank
}) => {
  const formatDOP = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getBankBadge = (code: string) => {
    switch (code) {
      case 'POPULAR':
        return {
          name: 'Banco Popular',
          bg: 'from-blue-950/80 to-slate-900',
          border: 'border-blue-700/40 hover:border-blue-500',
          accent: 'text-blue-400',
          pill: 'bg-blue-500/20 text-blue-300'
        };
      case 'BHD':
        return {
          name: 'Banco BHD',
          bg: 'from-emerald-950/80 to-slate-900',
          border: 'border-emerald-700/40 hover:border-emerald-500',
          accent: 'text-emerald-400',
          pill: 'bg-emerald-500/20 text-emerald-300'
        };
      case 'PROMERICA':
        return {
          name: 'Promerica',
          bg: 'from-teal-950/80 to-slate-900',
          border: 'border-teal-700/40 hover:border-teal-500',
          accent: 'text-teal-400',
          pill: 'bg-teal-500/20 text-teal-300'
        };
      case 'QIK':
        return {
          name: 'Qik Banco Digital',
          bg: 'from-purple-950/80 to-slate-900',
          border: 'border-purple-700/40 hover:border-purple-500',
          accent: 'text-purple-400',
          pill: 'bg-purple-500/20 text-purple-300'
        };
      default:
        return {
          name: 'Otros Bancos',
          bg: 'from-slate-900 to-slate-950',
          border: 'border-slate-800 hover:border-slate-700',
          accent: 'text-slate-400',
          pill: 'bg-slate-800 text-slate-300'
        };
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Bancos Conectados
            <span className="text-[11px] font-normal text-slate-400">
              (Haz clic en una tarjeta para filtrar todo)
            </span>
          </h3>
          <p className="text-xs text-slate-400">Lectura automática de estados y avisos por correo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {banks.map((b, idx) => {
          const style = getBankBadge(b.bank);
          const isSelected = selectedBanks.includes(b.bank);

          return (
            <div
              key={idx}
              onClick={() => onSelectBank && onSelectBank(b.bank)}
              className={`p-4 rounded-xl bg-gradient-to-b ${style.bg} border ${style.border} hover:scale-[1.02] cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                isSelected ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-950/50' : 'opacity-90 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.pill}`}>
                    {b.bank}
                  </span>
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded-md border border-emerald-800">
                      <Check className="w-3 h-3" /> Filtrado
                    </span>
                  ) : (
                    <CreditCard className={`w-4 h-4 ${style.accent}`} />
                  )}
                </div>
                <h4 className="text-sm font-semibold text-white truncate">{style.name}</h4>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gastos</span>
                  <span className="font-bold text-slate-200">{formatDOP(b.totalExpenses)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Trans.</span>
                  <span className="font-bold text-white">{b.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
