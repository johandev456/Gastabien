import React from 'react';
import { AnalyticsSummary } from '../types';

interface SummaryCardsProps {
  summary: AnalyticsSummary | null;
  loading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading = false }) => {
  const formatDOP = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const balance = summary ? summary.netBalance : 0;
  const isPositive = balance >= 0;
  const categoriesCount = summary?.categories ? summary.categories.length : 0;
  const totalTransactions = summary ? summary.transactionsCount : 0;
  const totalExpenses = summary ? summary.totalExpenses : 0;
  const totalIncome = summary ? summary.totalIncome : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 border border-outline-variant/20 animate-pulse h-40 flex flex-col justify-between"
          >
            <div className="h-4 bg-surface-container-high/60 rounded w-1/2"></div>
            <div className="h-8 bg-surface-container-high/60 rounded w-3/4"></div>
            <div className="h-5 bg-surface-container-high/60 rounded-full w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* KPI 1: Balance Neto */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.5)] border border-outline-variant/20 group hover:bg-surface-container-low transition-all">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary-fixed/50 to-transparent"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-wider font-semibold">
            Balance Neto RD$
          </span>
          <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1 mb-3">
          <span className={`font-headline-lg text-2xl sm:text-3xl font-bold tracking-tight truncate ${
            isPositive ? 'text-secondary' : 'text-error'
          }`}>
            {formatDOP(balance)}
          </span>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-[11px] font-semibold ${
          isPositive ? 'bg-secondary/10 text-secondary' : 'bg-error-container/20 text-error'
        }`}>
          <span className="material-symbols-outlined text-[14px]">
            {isPositive ? 'trending_up' : 'trending_down'}
          </span>
          <span>{isPositive ? 'Superávit • Ingresos - Gastos' : 'Déficit • Gastos > Ingresos'}</span>
        </div>
      </div>

      {/* KPI 2: Total Gastos */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.5)] border border-outline-variant/20 group hover:bg-surface-container-low transition-all">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-error/50 to-transparent"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-wider font-semibold">
            Total Gastos RD$
          </span>
          <div className="w-9 h-9 rounded-full bg-error-container/20 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[20px]">south_east</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="font-headline-lg text-2xl sm:text-3xl text-error font-bold tracking-tight truncate">
            {formatDOP(totalExpenses)}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/20 text-error font-label-sm text-[11px] font-semibold">
          <span className="material-symbols-outlined text-[14px]">category</span>
          <span>{categoriesCount} categorías analizadas</span>
        </div>
      </div>

      {/* KPI 3: Total Ingresos */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.5)] border border-outline-variant/20 group hover:bg-surface-container-low transition-all">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-container/60 to-transparent"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-wider font-semibold">
            Total Ingresos RD$
          </span>
          <div className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-fixed">
            <span className="material-symbols-outlined text-[20px]">north_east</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="font-headline-lg text-2xl sm:text-3xl text-primary font-bold tracking-tight truncate">
            {formatDOP(totalIncome)}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/15 text-primary font-label-sm text-[11px] font-semibold">
          <span className="material-symbols-outlined text-[14px]">payments</span>
          <span>Nómina y abonos detectados</span>
        </div>
      </div>

      {/* KPI 4: Operaciones Registradas */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.5)] border border-outline-variant/20 group hover:bg-surface-container-low transition-all">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-tertiary-container/50 to-transparent"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-wider font-semibold">
            Operaciones Registradas
          </span>
          <div className="w-9 h-9 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-bold tracking-tight">
            {totalTransactions}
          </span>
          <span className="font-label-md text-[13px] text-on-surface-variant">movimientos</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-semibold">
          <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
          <span>4 bancos sincronizados</span>
        </div>
      </div>
    </div>
  );
};
