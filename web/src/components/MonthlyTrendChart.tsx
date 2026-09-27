import React from 'react';
import { MonthlyTrend, Transaction, CategorySummary } from '../types';

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
  totalIncome?: number;
  totalExpenses?: number;
  netBalance?: number;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  categories?: CategorySummary[];
  transactions?: Transaction[];
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  totalIncome = 0,
  totalExpenses = 0,
  netBalance = 0,
  selectedCategory = null,
  onSelectCategory,
  categories = [],
  transactions = []
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

  const getCategoryColor = (catName?: string) => {
    if (!catName) return { colorHex: '#47e266', barGrad: 'from-secondary to-secondary-container', shadow: 'rgba(71,226,102,0.3)' };
    const lower = catName.toLowerCase();
    if (lower.includes('combus')) return { colorHex: '#ffb4ab', barGrad: 'from-error to-error-container', shadow: 'rgba(255,180,171,0.4)' };
    if (lower.includes('super')) return { colorHex: '#47e266', barGrad: 'from-secondary to-secondary-container', shadow: 'rgba(71,226,102,0.4)' };
    if (lower.includes('retiro') || lower.includes('cajer')) return { colorHex: '#3e90ff', barGrad: 'from-primary to-primary-container', shadow: 'rgba(62,144,255,0.4)' };
    if (lower.includes('bar') || lower.includes('pub') || lower.includes('nocturn')) return { colorHex: '#d500f9', barGrad: 'from-tertiary to-tertiary-container', shadow: 'rgba(213,0,249,0.4)' };
    if (lower.includes('restauran') || lower.includes('comida') || lower.includes('cafe')) return { colorHex: '#ff9800', barGrad: 'from-[#ff9800] to-[#f57c00]', shadow: 'rgba(255,152,0,0.4)' };
    if (lower.includes('servici')) return { colorHex: '#aac7ff', barGrad: 'from-primary-fixed to-primary-container', shadow: 'rgba(170,199,255,0.4)' };
    if (lower.includes('entreten')) return { colorHex: '#e9b3ff', barGrad: 'from-tertiary to-tertiary-container', shadow: 'rgba(233,179,255,0.4)' };
    return { colorHex: '#3e90ff', barGrad: 'from-primary to-primary-container', shadow: 'rgba(62,144,255,0.4)' };
  };

  // When a category is selected, extract and sort its largest transactions
  const categoryTransactions = selectedCategory
    ? transactions
        .filter(t => t.category === selectedCategory && t.type === 'EXPENSE')
        .sort((a, b) => b.amount - a.amount)
    : [];

  const topTransactions = categoryTransactions.slice(0, 4);
  const maxTxAmount = topTransactions.length > 0 ? topTransactions[0].amount : 1;
  const categoryTotal = categoryTransactions.reduce((acc, t) => acc + t.amount, 0);
  const avgAmount = categoryTransactions.length > 0 ? categoryTotal / categoryTransactions.length : 0;
  const activeCategoryTheme = getCategoryColor(selectedCategory || undefined);

  // General monthly calculation
  const latest = data.length > 0 ? data[data.length - 1] : { income: totalIncome, expenses: totalExpenses, month: '2026-09' };
  const inc = latest.income > 0 ? latest.income : totalIncome;
  const exp = latest.expenses > 0 ? latest.expenses : totalExpenses;
  const savings = netBalance !== 0 ? netBalance : inc - exp;

  const maxScale = Math.max(14000, inc * 1.1, exp * 1.1);
  const incHeightPx = Math.min(210, Math.max(25, (inc / maxScale) * 210));
  const expHeightPx = Math.min(210, Math.max(25, (exp / maxScale) * 210));
  const savingsRate = inc > 0 ? ((savings / inc) * 100).toFixed(1) : '0.0';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.6)] border border-outline-variant/20 flex flex-col justify-between h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>
      <div>
        {/* Header & Dropdown Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-headline-md text-xl sm:text-2xl text-on-surface font-bold">
              {selectedCategory ? `Top Gastos: ${selectedCategory}` : 'Flujo de Efectivo'}
            </h2>
            <p className="font-body-sm text-[13px] text-on-surface-variant">
              {selectedCategory
                ? 'Comparación de los mayores desembolsos en esta categoría'
                : 'Comparativa mensual en Pesos Dominicanos'}
            </p>
          </div>

          {/* Direct Category Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedCategory || 'ALL'}
              onChange={(e) => onSelectCategory?.(e.target.value === 'ALL' ? null : e.target.value)}
              className="appearance-none bg-surface-container-high/90 hover:bg-surface-bright text-on-surface font-body-sm text-[13px] font-semibold pl-3.5 pr-8 py-2 rounded-xl border border-outline-variant/30 focus:border-primary focus:outline-none cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all"
            >
              <option value="ALL" className="bg-surface-container-high text-on-surface">
                ✨ Flujo General (Ingresos vs Gastos)
              </option>
              {categories.map((c) => (
                <option key={c.category} value={c.category} className="bg-surface-container-high text-on-surface">
                  {c.category} ({formatDOP(c.total)})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </div>
          </div>
        </div>

        {/* Dynamic View: Top Category Transactions vs General Cashflow */}
        {selectedCategory ? (
          <div>
            {/* Legend & Stats Tag */}
            <div className="flex items-center justify-between gap-3 my-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: activeCategoryTheme.colorHex }}
                ></span>
                <span className="font-label-md text-[12px] text-on-surface font-medium">
                  {categoryTransactions.length} movimientos encontrados
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectCategory?.(null)}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Volver a Flujo General ✕
              </button>
            </div>

            {/* Cylindrical Glass Bars for Top Transactions */}
            <div className="relative mt-4 pt-2 pb-2">
              {topTransactions.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] mb-2 text-outline">receipt_long</span>
                  <p className="font-body-sm text-sm font-medium text-on-surface">Sin transacciones registradas</p>
                  <p className="text-[12px]">No se encontraron gastos en {selectedCategory}.</p>
                </div>
              ) : (
                <div className="relative h-60 pl-2 pr-2 flex items-end justify-around gap-2 sm:gap-4">
                  {topTransactions.map((tx, idx) => {
                    const barHeightPx = Math.min(210, Math.max(35, (tx.amount / maxTxAmount) * 200));
                    return (
                      <div key={tx.id || idx} className="flex flex-col items-center gap-2 group flex-1 max-w-[120px]">
                        {/* Top Amount Badge */}
                        <div className="opacity-90 group-hover:opacity-100 transition-opacity font-mono-metric text-[11px] sm:text-[12px] text-on-surface font-bold whitespace-nowrap bg-surface-container-highest px-2 py-0.5 rounded-full shadow-md border border-outline-variant/20">
                          {formatDOP(tx.amount)}
                        </div>

                        {/* 3D Glass Bar */}
                        <div
                          className="relative w-full rounded-t-2xl overflow-hidden bg-surface-container-highest/30 shadow-[0_8px_24px_rgba(0,0,0,0.3)] flex items-end transition-all duration-700 hover:scale-[1.03]"
                          style={{ height: `${barHeightPx}px` }}
                        >
                          <div
                            className={`w-full h-full rounded-t-2xl bg-gradient-to-t ${activeCategoryTheme.barGrad} flex flex-col justify-between p-2 shadow-inner`}
                          >
                            <div className="w-full h-1 bg-white/40 rounded-full"></div>
                            <span className="font-label-sm text-[10px] font-bold text-white text-center drop-shadow">
                              #{idx + 1}
                            </span>
                          </div>
                        </div>

                        {/* Merchant Label */}
                        <div className="text-center w-full">
                          <p className="font-body-sm text-[12px] text-on-surface font-semibold truncate" title={tx.merchant}>
                            {tx.merchant}
                          </p>
                          <p className="font-label-sm text-[10px] text-on-surface-variant truncate">
                            {tx.bankName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Period Summary */}
            <div className="flex justify-center mt-3">
              <span className="px-4 py-1 rounded-full bg-surface-container-high/80 text-on-surface-variant font-label-md text-[11px] tracking-wider uppercase font-semibold border border-outline-variant/15">
                Total Acumulado: {formatDOP(categoryTotal)}
              </span>
            </div>
          </div>
        ) : (
          <div>
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
            <div className="relative mt-4 pt-2 pb-2">
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
        )}
      </div>

      {/* Metric Bottom Callout */}
      {selectedCategory ? (
        <div className="mt-5 p-4 rounded-xl bg-surface-container-high/70 border border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: activeCategoryTheme.colorHex }}
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
            </div>
            <div>
              <p className="font-body-sm text-[13px] font-semibold text-on-surface">Promedio por Gasto</p>
              <p className="font-label-sm text-[11px] text-on-surface-variant">
                En {selectedCategory} ({categoryTransactions.length} registros)
              </p>
            </div>
          </div>
          <span className="font-mono-metric text-[15px] font-bold text-on-surface">
            {formatDOP(avgAmount)}
          </span>
        </div>
      ) : (
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
      )}
    </div>
  );
};
