import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList
} from 'recharts';
import { MonthlyTrend, Transaction, CategorySummary, TopMerchant } from '../types';
import { amountInDop, formatDate, formatMoney, formatMonthLabel, formatPercent, formatShort, getCategoryColor } from '../utils/format';

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
  totalIncome?: number;
  totalExpenses?: number;
  netBalance?: number;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  categories?: CategorySummary[];
  transactions?: Transaction[];
  selectedMonth?: string;
  usdRate?: number;
  loading?: boolean;
  topMerchants?: TopMerchant[];
}

const INCOME_COLOR = '#47e266';
const EXPENSE_COLOR = '#ff8a80';
const GRID_COLOR = 'rgba(139,145,160,0.15)';
const AXIS_TICK = { fill: '#c0c6d6', fontSize: 11 };

const tooltipStyle: React.CSSProperties = {
  background: 'rgba(29,32,38,0.96)',
  border: '1px solid rgba(65,71,84,0.6)',
  borderRadius: 12,
  boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
  color: '#e1e2eb',
  fontSize: 12,
  padding: '8px 12px'
};

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  totalIncome = 0,
  totalExpenses = 0,
  netBalance = 0,
  selectedCategory = null,
  onSelectCategory,
  categories = [],
  transactions = [],
  selectedMonth = 'ALL',
  usdRate,
  loading = false,
  topMerchants = []
}) => {
  const isMonthSelected = !!selectedMonth && selectedMonth !== 'ALL';
  const categoryExists = !selectedCategory || categories.some(c => c.category === selectedCategory);
  const activeCategory = categoryExists ? selectedCategory : null;
  const categoryColor = activeCategory ? getCategoryColor(activeCategory, categories) : INCOME_COLOR;

  // --- Category drill-down: every expense of the category in the filtered period ---
  const categoryTransactions = useMemo(() => {
    if (!activeCategory) return [];
    return transactions
      .filter(t => t.category === activeCategory && t.type === 'EXPENSE')
      .sort((a, b) => amountInDop(b, usdRate) - amountInDop(a, usdRate));
  }, [transactions, activeCategory, usdRate]);

  const categoryTotal = categoryTransactions.reduce((acc, t) => acc + amountInDop(t, usdRate), 0);
  const avgAmount = categoryTransactions.length > 0 ? categoryTotal / categoryTransactions.length : 0;
  const topTransactions = categoryTransactions.slice(0, 5).map((tx, idx) => ({
    id: tx.id,
    name: tx.merchant,
    label: `#${idx + 1} ${tx.merchant}`,
    value: Math.round(amountInDop(tx, usdRate) * 100) / 100,
    original: tx.currency === 'USD' ? formatMoney(tx.amount, 'USD') : null,
    date: tx.date,
    bank: tx.bankName
  }));

  // --- Cash flow: monthly series (already filtered by bank on the backend) ---
  const trend = useMemo(
    () =>
      data.map(d => ({
        month: d.month,
        label: formatMonthLabel(d.month, true),
        income: d.income,
        expenses: d.expenses
      })),
    [data]
  );

  // Totals for the callout always come from the filtered summary (same period as the cards)
  const savings = netBalance;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  const periodLabel = isMonthSelected ? formatMonthLabel(selectedMonth) : 'Todo el historial';

  return (
    <section
      className={`relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.6)] border border-outline-variant/20 flex flex-col justify-between h-full transition-opacity ${
        loading ? 'opacity-70' : ''
      }`}
      aria-label={activeCategory ? `Mayores gastos en ${activeCategory}` : 'Flujo de efectivo'}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>
      <div className="min-w-0">
        <div className="flex flex-col gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="font-headline-md text-xl sm:text-2xl text-on-surface font-bold truncate" title={activeCategory ? `Top Gastos: ${activeCategory}` : undefined}>
              {activeCategory ? `Top Gastos: ${activeCategory}` : 'Flujo de Efectivo'}
            </h2>
            <p className="font-body-sm text-[13px] text-on-surface-variant">
              {activeCategory
                ? `Mayores desembolsos • ${periodLabel}`
                : `Ingresos vs gastos por mes${isMonthSelected ? ` • ${periodLabel} resaltado` : ''}`}
            </p>
          </div>

          <div className="relative w-full">
            <label htmlFor="trend-category-select" className="sr-only">Ver categoría</label>
            <select
              id="trend-category-select"
              value={activeCategory || 'ALL'}
              onChange={(e) => onSelectCategory?.(e.target.value === 'ALL' ? null : e.target.value)}
              className="appearance-none w-full truncate bg-surface-container-high/90 hover:bg-surface-bright text-on-surface font-body-sm text-[13px] font-semibold pl-3.5 pr-8 py-2 rounded-xl border border-outline-variant/30 focus:border-primary focus:outline-none cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all"
            >
              <option value="ALL">Flujo general (ingresos vs gastos)</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({formatMoney(c.total)})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">expand_more</span>
            </div>
          </div>
        </div>

        {activeCategory ? (
          <div>
            <div className="flex items-center justify-between gap-3 my-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} aria-hidden="true"></span>
                <span className="font-label-md text-[12px] text-on-surface font-medium truncate">
                  {categoryTransactions.length} {categoryTransactions.length === 1 ? 'movimiento' : 'movimientos'} • {formatMoney(categoryTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectCategory?.(null)}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer whitespace-nowrap"
              >
                Volver al flujo ✕
              </button>
            </div>

            {topTransactions.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] mb-2 text-outline" aria-hidden="true">receipt_long</span>
                <p className="font-body-sm text-sm font-medium text-on-surface">Sin gastos en este período</p>
                <p className="text-[12px]">No se encontraron gastos de {activeCategory}.</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTransactions} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }} barCategoryGap={8}>
                    <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
                    <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => formatShort(v)} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#e1e2eb', fontWeight: 600 }}
                      formatter={(value: number, _n, item: any) => [
                        `${formatMoney(value)}${item?.payload?.original ? ` (${item.payload.original})` : ''}`,
                        `${item?.payload?.bank || ''} • ${formatDate(item?.payload?.date)}`
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={categoryColor} isAnimationActive={false}>
                      <LabelList dataKey="value" position="right" formatter={(v: number) => formatShort(v)} fill="#e1e2eb" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 my-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: INCOME_COLOR }} aria-hidden="true"></span>
                <span className="font-label-md text-[12px] text-on-surface font-medium">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EXPENSE_COLOR }} aria-hidden="true"></span>
                <span className="font-label-md text-[12px] text-on-surface font-medium">Gastos</span>
              </div>
            </div>

            {trend.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] mb-2 text-outline" aria-hidden="true">bar_chart</span>
                <p className="font-body-sm text-sm font-medium text-on-surface">Aún no hay movimientos</p>
                <p className="text-[12px]">Sincroniza Gmail o sube un estado de cuenta.</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={3} barCategoryGap="22%">
                    <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                    <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={AXIS_TICK} tickFormatter={(v) => formatShort(v)} axisLine={false} tickLine={false} width={64} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#e1e2eb', fontWeight: 600 }}
                      labelFormatter={(_l, payload: any) => (payload?.[0]?.payload?.month ? formatMonthLabel(payload[0].payload.month) : '')}
                      formatter={(value: number, name) => [formatMoney(value), name === 'income' ? 'Ingresos' : 'Gastos']}
                    />
                    <Bar dataKey="income" name="income" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {trend.map(d => (
                        <Cell key={`i-${d.month}`} fill={INCOME_COLOR} fillOpacity={!isMonthSelected || d.month === selectedMonth ? 1 : 0.35} />
                      ))}
                    </Bar>
                    <Bar dataKey="expenses" name="expenses" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {trend.map(d => (
                        <Cell key={`e-${d.month}`} fill={EXPENSE_COLOR} fillOpacity={!isMonthSelected || d.month === selectedMonth ? 1 : 0.35} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl bg-surface-container-high/50 border border-outline-variant/15 px-3 py-2 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Ingresos • {periodLabel}</p>
                <p className="font-mono-metric text-[14px] font-bold text-secondary tabular-nums truncate">{formatMoney(totalIncome)}</p>
              </div>
              <div className="rounded-xl bg-surface-container-high/50 border border-outline-variant/15 px-3 py-2 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Gastos • {periodLabel}</p>
                <p className="font-mono-metric text-[14px] font-bold text-error tabular-nums truncate">{formatMoney(totalExpenses)}</p>
              </div>
            </div>

            {topMerchants.length > 0 && (
              <div className="mt-5">
                <h3 className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-2">Comercios con mayor gasto</h3>
                <ol className="flex flex-col gap-1.5">
                  {topMerchants.slice(0, 5).map((m, i) => {
                    const color = getCategoryColor(m.category, categories);
                    return (
                      <li key={m.merchant}>
                        <button
                          type="button"
                          onClick={() => onSelectCategory?.(m.category)}
                          className="w-full text-left flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-high/50 transition-colors cursor-pointer min-w-0"
                          title={`Ver ${m.category}`}
                        >
                          <span className="w-6 text-center text-[12px] font-bold text-on-surface-variant shrink-0">{i + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-on-surface truncate">{m.merchant}</span>
                            <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true"></span>
                              <span className="truncate">{m.category} • {m.count} {m.count === 1 ? 'compra' : 'compras'}</span>
                            </span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="block font-mono-metric text-[13px] font-bold text-on-surface tabular-nums">{formatMoney(m.total)}</span>
                            <span className="block text-[10px] text-on-surface-variant">{formatPercent(m.percentage)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {activeCategory ? (
        <div className="mt-5 p-4 rounded-xl bg-surface-container-high/70 border border-outline-variant/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md shrink-0" style={{ backgroundColor: categoryColor }}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">analytics</span>
            </div>
            <div className="min-w-0">
              <p className="font-body-sm text-[13px] font-semibold text-on-surface">Promedio por gasto</p>
              <p className="font-label-sm text-[11px] text-on-surface-variant truncate">
                {activeCategory} ({categoryTransactions.length} registros)
              </p>
            </div>
          </div>
          <span className="font-mono-metric text-[15px] font-bold text-on-surface tabular-nums whitespace-nowrap">{formatMoney(avgAmount)}</span>
        </div>
      ) : (
        <div className={`mt-5 p-4 rounded-xl border flex items-center justify-between gap-3 ${savings >= 0 ? 'bg-secondary/10 border-secondary/20' : 'bg-error-container/15 border-error/20'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md shrink-0 ${savings >= 0 ? 'bg-secondary text-on-secondary' : 'bg-error text-on-error'}`}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">savings</span>
            </div>
            <div className="min-w-0">
              <p className="font-body-sm text-[13px] font-semibold text-on-surface">Capacidad de ahorro</p>
              <p className="font-label-sm text-[11px] text-on-surface-variant truncate">
                {totalIncome > 0 ? `${formatPercent(savingsRate)} del ingreso retenido` : 'Sin ingresos en el período'} • {periodLabel}
              </p>
            </div>
          </div>
          <span className={`font-mono-metric text-[15px] font-bold tabular-nums whitespace-nowrap ${savings >= 0 ? 'text-secondary' : 'text-error'}`}>
            {savings >= 0 ? `+${formatMoney(savings)}` : formatMoney(savings)}
          </span>
        </div>
      )}
    </section>
  );
};
