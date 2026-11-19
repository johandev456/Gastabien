import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CategorySummary } from '../types';
import { formatMoney, formatMonthLabel, formatPercent, formatShort, getCategoryColor, getCategoryIcon } from '../utils/format';

interface CategoryPieChartProps {
  categories: CategorySummary[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  selectedMonth?: string;
  totalExpenses?: number;
  loading?: boolean;
}

const tooltipStyle: React.CSSProperties = {
  background: 'rgba(29,32,38,0.96)',
  border: '1px solid rgba(65,71,84,0.6)',
  borderRadius: 12,
  color: '#e1e2eb',
  fontSize: 12,
  padding: '8px 12px'
};

/** Fits money into the donut hole: full format when short, compact (RD$1.2M) otherwise. */
function centerAmount(amount: number): string {
  const full = formatMoney(amount, 'DOP', { decimals: amount < 100_000 });
  return full.length <= 12 ? full : formatShort(amount);
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  selectedCategory = null,
  onSelectCategory,
  selectedMonth = 'ALL',
  totalExpenses,
  loading = false
}) => {
  const total = totalExpenses ?? categories.reduce((s, c) => s + c.total, 0);
  const active = categories.find(c => c.category === selectedCategory) || null;
  const toggle = (category: string) => onSelectCategory?.(selectedCategory === category ? null : category);

  const slices = useMemo(
    () => categories.map(c => ({ ...c, fill: getCategoryColor(c.category, categories) })),
    [categories]
  );

  const maxExpense = categories[0] || null;
  const maxFreq = categories.length > 0 ? [...categories].sort((a, b) => b.count - a.count)[0] : null;
  const cashWithdrawal = categories.find(c => c.category === 'Retiro de Efectivo');
  const periodLabel = formatMonthLabel(selectedMonth);

  const highlight = (key: string, label: string, detail: string, value: string, category: string, color: string) => {
    const isSelected = selectedCategory === category;
    return (
      <button
        key={key}
        type="button"
        onClick={() => toggle(category)}
        aria-pressed={isSelected}
        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          isSelected ? 'bg-surface-container-high border-primary/50' : 'bg-surface-container-high/40 border-outline-variant/15 hover:bg-surface-container-high/70'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true"></span>
          <span className="min-w-0 truncate">
            <span className="font-body-sm text-[13px] text-on-surface font-medium">{label}</span>
            <span className="font-label-sm text-[11px] text-on-surface-variant ml-1.5">({detail})</span>
          </span>
        </span>
        <span className="font-mono-metric text-[14px] text-on-surface font-semibold tabular-nums whitespace-nowrap">{value}</span>
      </button>
    );
  };

  return (
    <section
      className={`relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.6)] border border-outline-variant/20 flex flex-col justify-between h-full transition-opacity ${
        loading ? 'opacity-70' : ''
      }`}
      aria-label="Gastos por categoría"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-fixed/30 to-transparent"></div>
      <div className="min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-md text-xl sm:text-2xl text-on-surface font-bold">Gastos por Categoría</h2>
              {selectedCategory && (
                <button
                  onClick={() => onSelectCategory?.(null)}
                  type="button"
                  className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center gap-1 hover:bg-primary/30 transition-all cursor-pointer border border-primary/30 max-w-full"
                  aria-label={`Quitar filtro ${selectedCategory}`}
                >
                  <span className="truncate">Filtrado: {selectedCategory}</span>
                  <span className="material-symbols-outlined text-[13px]" aria-hidden="true">close</span>
                </button>
              )}
            </div>
            <p className="font-body-sm text-[13px] text-on-surface-variant">Toca una categoría para filtrar los movimientos</p>
          </div>
          <span className="self-start font-mono-metric text-[13px] px-3.5 py-1.5 rounded-full bg-surface-container-high text-primary font-semibold border border-outline-variant/20 shrink-0 whitespace-nowrap">
            {periodLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center my-4">
          <div className="sm:col-span-5 flex justify-center items-center relative py-2">
            <div className="w-52 h-52 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices.length > 0 ? slices : [{ category: 'Sin datos', total: 1, fill: '#272a31' }]}
                    dataKey="total"
                    nameKey="category"
                    innerRadius="70%"
                    outerRadius="92%"
                    paddingAngle={slices.length > 1 ? 1.5 : 0}
                    stroke="none"
                    isAnimationActive={false}
                    onClick={(d: any) => d?.category && slices.length > 0 && toggle(d.category)}
                  >
                    {(slices.length > 0 ? slices : [{ category: 'Sin datos', fill: '#272a31' }]).map((s: any) => (
                      <Cell
                        key={s.category}
                        fill={s.fill}
                        fillOpacity={!selectedCategory || selectedCategory === s.category ? 1 : 0.28}
                        style={{ cursor: slices.length > 0 ? 'pointer' : 'default', outline: 'none' }}
                      />
                    ))}
                  </Pie>
                  {slices.length > 0 && (
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#e1e2eb' }}
                      formatter={(value: number, name: string, item: any) => [
                        `${formatMoney(value)} • ${formatPercent(item?.payload?.percentage ?? 0)}`,
                        name
                      ]}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pointer-events-none">
                {active ? (
                  <>
                    <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary font-bold line-clamp-2 leading-tight">
                      {active.category}
                    </span>
                    <span className="font-headline-sm text-[15px] text-on-surface font-extrabold tabular-nums mt-0.5 whitespace-nowrap">
                      {centerAmount(active.total)}
                    </span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant font-semibold">{formatPercent(active.percentage)} del total</span>
                  </>
                ) : (
                  <>
                    <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Total gastos</span>
                    <span className="font-headline-sm text-[15px] text-on-surface font-bold tabular-nums mt-0.5 whitespace-nowrap">
                      {categories.length > 0 ? centerAmount(total) : 'RD$0'}
                    </span>
                    <span className="font-label-sm text-[10px] text-secondary font-semibold">
                      {categories.length > 0 ? `${categories.length} categorías` : 'Sin datos'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-7 flex flex-col gap-2 min-w-0">
            {maxExpense &&
              highlight('max', 'Mayor desembolso', maxExpense.category, formatMoney(maxExpense.total), maxExpense.category, getCategoryColor(maxExpense.category, categories))}
            {maxFreq &&
              highlight('freq', 'Más frecuente', maxFreq.category, `${maxFreq.count} ${maxFreq.count === 1 ? 'compra' : 'compras'}`, maxFreq.category, getCategoryColor(maxFreq.category, categories))}
            {cashWithdrawal &&
              highlight('cash', 'Efectivo en cajeros', `${cashWithdrawal.count} retiros`, formatMoney(cashWithdrawal.total), cashWithdrawal.category, getCategoryColor(cashWithdrawal.category, categories))}
          </div>
        </div>

        <ul className="flex flex-col gap-1.5 mt-4" aria-label="Detalle por categoría">
          {categories.length === 0 ? (
            <li className="text-center py-6 text-on-surface-variant font-body-md text-sm">No hay gastos registrados en este período.</li>
          ) : (
            categories.map((cat) => {
              const color = getCategoryColor(cat.category, categories);
              const isSelected = selectedCategory === cat.category;
              return (
                <li key={cat.category}>
                  <button
                    type="button"
                    onClick={() => toggle(cat.category)}
                    aria-pressed={isSelected}
                    className={`w-full text-left flex flex-col gap-1.5 p-2.5 rounded-xl transition-all cursor-pointer ${
                      isSelected ? 'bg-surface-container-high border border-primary/40 shadow-[0_4px_16px_rgba(0,0,0,0.4)]' : 'hover:bg-surface-container-high/50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3 w-full">
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${color}26`, color }}
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined text-[16px]">{getCategoryIcon(cat.category)}</span>
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate font-body-sm text-[13px] ${isSelected ? 'text-primary font-bold' : 'text-on-surface font-semibold'}`}>
                            {cat.category}
                          </span>
                          <span className="font-label-sm text-[11px] text-on-surface-variant">
                            {cat.count} {cat.count === 1 ? 'transacción' : 'transacciones'}
                          </span>
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="font-mono-metric text-[14px] text-on-surface font-bold tabular-nums">{formatMoney(cat.total)}</span>
                        <span className="font-label-sm text-[11px] ml-1.5 font-bold" style={{ color }}>
                          {formatPercent(cat.percentage)}
                        </span>
                      </span>
                    </span>
                    <span className="block w-full h-2 rounded-full bg-surface-container-highest/60 overflow-hidden" aria-hidden="true">
                      <span
                        className="block h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%`, minWidth: cat.percentage > 0 ? 4 : 0, backgroundColor: color }}
                      />
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {selectedCategory && (
        <div className="mt-6 flex items-center justify-between gap-3 bg-surface-container-highest/30 border border-outline-variant/15 rounded-xl p-3">
          <span className="flex items-center gap-2 text-on-surface-variant min-w-0">
            <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">filter_alt</span>
            <span className="font-body-sm text-[12px] truncate">Movimientos filtrados por {selectedCategory}</span>
          </span>
          <button
            onClick={() => onSelectCategory?.(null)}
            type="button"
            className="font-label-sm text-[11px] font-semibold text-primary uppercase cursor-pointer hover:underline whitespace-nowrap"
          >
            Limpiar filtro ✕
          </button>
        </div>
      )}
    </section>
  );
};
