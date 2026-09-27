import React from 'react';
import { MonthlyTrend } from '../types';

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
  totalIncome?: number;
  totalExpenses?: number;
  netBalance?: number;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  totalIncome = 0,
  totalExpenses = 0,
  netBalance = 0
}) => {
  const formatDOP = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatShort = (amount: number) => {
    if (amount >= 1000) {
      return `RD$${(amount / 1000).toFixed(1)}k`;
    }
    return `RD$${amount.toFixed(0)}`;
  };

  const latest = data.length > 0 ? data[data.length - 1] : { income: totalIncome, expenses: totalExpenses, month: '2026-09' };
  const inc = latest.income > 0 ? latest.income : totalIncome;
  const exp = latest.expenses > 0 ? latest.expenses : totalExpenses;
  const savings = netBalance !== 0 ? netBalance : inc - exp;

  const maxScale = Math.max(14000, inc * 1.1, exp * 1.1);
  const incHeightPx = Math.min(225, Math.max(25, (inc / maxScale) * 225));
  const expHeightPx = Math.min(225, Math.max(25, (exp / maxScale) * 225));

  const savingsRate = inc > 0 ? ((savings / inc) * 100).toFixed(1) : '0.0';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.6)] border border-outline-variant/20 flex flex-col justify-between h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline-md text-xl sm:text-2xl text-on-surface font-bold">
              Flujo de Efectivo
            </h2>
            <p className="font-body-sm text-[13px] text-on-surface-variant">
              Comparativa mensual en Pesos Dominicanos
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface border border-outline-variant/20">
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
          </div>
        </div>

        {/* Color Legends */}
        <div className="flex items-center gap-4 my-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(71,226,102,0.6)]"></span>
            <span className="font-label-md text-[12px] text-on-surface font-medium">Ingresos (Nómina/Abonos)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)]"></span>
            <span className="font-label-md text-[12px] text-on-surface font-medium">Gastos Registrados</span>
          </div>
        </div>

        {/* Apple Style Glossy High-Fidelity Bar Chart */}
        <div className="relative mt-5 pt-4 pb-2">
          {/* Y-Axis Grid Guidelines */}
          <div className="flex flex-col justify-between h-60 w-full absolute inset-0 pointer-events-none text-on-surface-variant font-label-sm text-[11px]">
            <div className="flex items-center justify-between">
              <span>RD$14k</span>
              <div className="w-full ml-3 h-px bg-surface-container-highest/50"></div>
            </div>
            <div className="flex items-center justify-between">
              <span>RD$11k</span>
              <div className="w-full ml-3 h-px bg-surface-container-highest/50"></div>
            </div>
            <div className="flex items-center justify-between">
              <span>RD$7k</span>
              <div className="w-full ml-3 h-px bg-surface-container-highest/50"></div>
            </div>
            <div className="flex items-center justify-between">
              <span>RD$4k</span>
              <div className="w-full ml-3 h-px bg-surface-container-highest/50"></div>
            </div>
            <div className="flex items-center justify-between">
              <span>RD$0</span>
              <div className="w-full ml-3 h-px bg-surface-container-highest/50"></div>
            </div>
          </div>

          {/* High-Fidelity Cylindrical Glass Columns */}
          <div className="relative h-60 pl-12 pr-4 flex items-end justify-center gap-8 sm:gap-12">
            {/* Bar 1: Ingresos */}
            <div className="flex flex-col items-center gap-2 group w-20">
              <div className="opacity-80 group-hover:opacity-100 transition-opacity font-mono-metric text-[12px] text-secondary font-bold whitespace-nowrap bg-surface-container-highest px-2 py-0.5 rounded-full shadow-lg border border-outline-variant/20">
                {formatDOP(inc)}
              </div>
              <div
                className="relative w-full rounded-t-2xl overflow-hidden bg-surface-container-highest/30 shadow-[0_8px_24px_rgba(71,226,102,0.25)] flex items-end transition-all duration-700"
                style={{ height: `${incHeightPx}px` }}
              >
                <div className="w-full h-full rounded-t-2xl bg-gradient-to-t from-secondary-container via-secondary to-secondary-fixed flex flex-col justify-between p-2">
                  <div className="w-full h-1 bg-white/40 rounded-full"></div>
                  <span className="font-label-sm text-[11px] font-bold text-on-secondary text-center">
                    {formatShort(inc)}
                  </span>
                </div>
              </div>
              <span className="font-body-sm text-[13px] text-on-surface font-semibold">Ingresos</span>
            </div>

            {/* Bar 2: Gastos */}
            <div className="flex flex-col items-center gap-2 group w-20">
              <div className="opacity-80 group-hover:opacity-100 transition-opacity font-mono-metric text-[12px] text-error font-bold whitespace-nowrap bg-surface-container-highest px-2 py-0.5 rounded-full shadow-lg border border-outline-variant/20">
                {formatDOP(exp)}
              </div>
              <div
                className="relative w-full rounded-t-2xl overflow-hidden bg-surface-container-highest/30 shadow-[0_8px_24px_rgba(255,180,171,0.2)] flex items-end transition-all duration-700"
                style={{ height: `${expHeightPx}px` }}
              >
                <div className="w-full h-full rounded-t-2xl bg-gradient-to-t from-error-container via-error to-error flex flex-col justify-between p-2">
                  <div className="w-full h-1 bg-white/40 rounded-full"></div>
                  <span className="font-label-sm text-[11px] font-bold text-on-error text-center">
                    {formatShort(exp)}
                  </span>
                </div>
              </div>
              <span className="font-body-sm text-[13px] text-on-surface font-semibold">Gastos</span>
            </div>
          </div>
        </div>

        {/* Period Badge */}
        <div className="flex justify-center mt-3">
          <span className="px-4 py-1 rounded-full bg-surface-container-high/80 text-on-surface-variant font-label-md text-[11px] tracking-wider uppercase font-semibold border border-outline-variant/15">
            Período de Facturación: {latest.month || '2026-09'}
          </span>
        </div>
      </div>

      {/* Metric Difference Bottom Callout */}
      <div className="mt-5 p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-md">
            <span className="material-symbols-outlined text-[20px]">savings</span>
          </div>
          <div>
            <p className="font-body-sm text-[13px] font-semibold text-on-surface">Capacidad de Ahorro RD</p>
            <p className="font-label-sm text-[11px] text-on-surface-variant">
              {savingsRate}% del ingreso total retenido
            </p>
          </div>
        </div>
        <span className={`font-mono-metric text-[15px] font-bold ${savings >= 0 ? 'text-secondary' : 'text-error'}`}>
          {savings >= 0 ? `+${formatDOP(savings)}` : formatDOP(savings)}
        </span>
      </div>
    </div>
  );
};
