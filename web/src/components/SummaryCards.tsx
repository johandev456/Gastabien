import React from 'react';
import { AnalyticsSummary } from '../types';
import { formatMoney, formatMonthLabel } from '../utils/format';

interface SummaryCardsProps {
  summary: AnalyticsSummary | null;
  loading?: boolean;
}

interface KpiCardProps {
  label: string;
  icon: string;
  iconClass: string;
  accent: string;
  value: React.ReactNode;
  valueClass: string;
  badge: React.ReactNode;
  badgeClass: string;
  badgeIcon: string;
  dimmed?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, icon, iconClass, accent, value, valueClass, badge, badgeClass, badgeIcon, dimmed }) => (
  <div
    className={`relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-5 xl:p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.5)] border border-outline-variant/20 hover:bg-surface-container-low transition-all min-w-0 ${
      dimmed ? 'opacity-70' : ''
    }`}
  >
    <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${accent} to-transparent`} />
    <div className="flex items-center justify-between gap-2 mb-4">
      <span className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-wider font-semibold truncate">{label}</span>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
      </div>
    </div>
    <div className="mb-3 min-w-0">
      <span
        className={`block font-headline-lg text-2xl lg:text-[1.35rem] xl:text-[1.7rem] 2xl:text-3xl font-bold tracking-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis ${valueClass}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
    </div>
    <div className={`inline-flex max-w-full items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-[11px] font-semibold ${badgeClass}`}>
      <span className="material-symbols-outlined text-[14px] shrink-0" aria-hidden="true">{badgeIcon}</span>
      <span className="truncate">{badge}</span>
    </div>
  </div>
);

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading = false }) => {
  // Skeleton only for the very first load; refreshes keep the current numbers on screen.
  if (!summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-busy={loading}>
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

  const balance = summary.netBalance;
  const isPositive = balance >= 0;
  const categoriesCount = summary.categories?.length || 0;
  const activeBanks = (summary.byBank || []).filter(b => b.count > 0).length;
  const periodLabel = summary.selectedMonth && summary.selectedMonth !== 'ALL' ? formatMonthLabel(summary.selectedMonth) : 'todo el historial';
  const incomeCount = summary.transactionsCount - (summary.expenseCount ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-busy={loading}>
      <KpiCard
        label="Balance Neto"
        icon="account_balance_wallet"
        iconClass="bg-secondary/10 text-secondary"
        accent="via-secondary-fixed/50"
        value={formatMoney(balance)}
        valueClass={isPositive ? 'text-secondary' : 'text-error'}
        badge={isPositive ? 'Superávit • Ingresos - Gastos' : 'Déficit • Gastos > Ingresos'}
        badgeIcon={isPositive ? 'trending_up' : 'trending_down'}
        badgeClass={isPositive ? 'bg-secondary/10 text-secondary' : 'bg-error-container/20 text-error'}
        dimmed={loading}
      />
      <KpiCard
        label="Total Gastos"
        icon="south_east"
        iconClass="bg-error-container/20 text-error"
        accent="via-error/50"
        value={formatMoney(summary.totalExpenses)}
        valueClass="text-error"
        badge={`${categoriesCount} ${categoriesCount === 1 ? 'categoría' : 'categorías'} analizadas`}
        badgeIcon="category"
        badgeClass="bg-error-container/20 text-error"
        dimmed={loading}
      />
      <KpiCard
        label="Total Ingresos"
        icon="north_east"
        iconClass="bg-secondary/10 text-secondary"
        accent="via-secondary/50"
        value={formatMoney(summary.totalIncome)}
        valueClass="text-secondary"
        badge={summary.expenseCount !== undefined ? `${Math.max(0, incomeCount)} movimientos de entrada` : 'Nómina y abonos detectados'}
        badgeIcon="payments"
        badgeClass="bg-secondary/10 text-secondary"
        dimmed={loading}
      />
      <KpiCard
        label="Operaciones"
        icon="receipt_long"
        iconClass="bg-tertiary-container/20 text-tertiary"
        accent="via-tertiary-container/50"
        value={
          <>
            {summary.transactionsCount.toLocaleString('es-DO')}
            <span className="font-label-md text-[13px] text-on-surface-variant font-normal ml-2">movimientos</span>
          </>
        }
        valueClass="text-on-surface"
        badge={`${activeBanks} ${activeBanks === 1 ? 'banco' : 'bancos'} con actividad • ${periodLabel}`}
        badgeIcon="verified"
        badgeClass="bg-surface-container-high text-on-surface-variant"
        dimmed={loading}
      />
    </div>
  );
};
