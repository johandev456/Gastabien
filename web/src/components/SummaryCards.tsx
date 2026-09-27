import React from 'react';
import { Wallet, TrendingDown, TrendingUp, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnalyticsSummary } from '../types';

interface SummaryCardsProps {
  summary: AnalyticsSummary | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading }) => {
  const formatDOP = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800/60" />
        ))}
      </div>
    );
  }

  const isNetPositive = summary.netBalance >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Balance Neto */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Balance Neto
          </span>
          <div className={`p-2.5 rounded-xl ${isNetPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatDOP(summary.netBalance)}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
            {isNetPositive ? (
              <span className="flex items-center text-emerald-400 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" /> Superávit
              </span>
            ) : (
              <span className="flex items-center text-rose-400 font-medium">
                <ArrowDownRight className="w-3.5 h-3.5" /> Déficit
              </span>
            )}
            <span>• Ingresos - Gastos</span>
          </div>
        </div>
      </div>

      {/* Total Gastos */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-rose-500/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Gastos
          </span>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {formatDOP(summary.totalExpenses)}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
            <span className="text-rose-400 font-medium">{summary.categories.length} categorías</span>
            <span>analizadas</span>
          </div>
        </div>
      </div>

      {/* Total Ingresos */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Ingresos
          </span>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {formatDOP(summary.totalIncome)}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
            <span className="text-emerald-400 font-medium">Nómina y abonos</span>
            <span>detectados</span>
          </div>
        </div>
      </div>

      {/* Transacciones */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Transacciones
          </span>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {summary.transactionsCount}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
            <span className="text-indigo-400 font-medium">4 bancos</span>
            <span>sincronizados</span>
          </div>
        </div>
      </div>

    </div>
  );
};
