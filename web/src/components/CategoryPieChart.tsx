import React from 'react';
import { CategorySummary } from '../types';

interface CategoryPieChartProps {
  categories: CategorySummary[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  selectedCategory = null,
  onSelectCategory
}) => {
  const formatDOP = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getCategoryTheme = (catName: string, index: number) => {
    const lower = catName.toLowerCase();
    if (lower.includes('combus')) {
      return {
        icon: 'local_gas_station',
        iconBg: 'bg-error-container/20',
        textCol: 'text-error',
        colorHex: '#ffb4ab',
        barGrad: 'from-error to-error-container',
        shadow: 'shadow-[0_0_12px_rgba(255,180,171,0.5)]'
      };
    }
    if (lower.includes('super') || lower.includes('alimen')) {
      return {
        icon: 'shopping_cart',
        iconBg: 'bg-secondary/15',
        textCol: 'text-secondary',
        colorHex: '#47e266',
        barGrad: 'from-secondary to-secondary-container',
        shadow: 'shadow-[0_0_12px_rgba(71,226,102,0.4)]'
      };
    }
    if (lower.includes('retiro') || lower.includes('cajer') || lower.includes('efect')) {
      return {
        icon: 'atm',
        iconBg: 'bg-primary-container/20',
        textCol: 'text-primary',
        colorHex: '#3e90ff',
        barGrad: 'from-primary to-primary-container',
        shadow: 'shadow-[0_0_12px_rgba(170,199,255,0.4)]'
      };
    }
    if (lower.includes('bar') || lower.includes('pub') || lower.includes('nocturn') || lower.includes('discotec')) {
      return {
        icon: 'local_bar',
        iconBg: 'bg-tertiary-container/25',
        textCol: 'text-tertiary',
        colorHex: '#d500f9',
        barGrad: 'from-tertiary to-tertiary-container',
        shadow: 'shadow-[0_0_12px_rgba(213,0,249,0.5)]'
      };
    }
    if (lower.includes('restauran') || lower.includes('comida') || lower.includes('cafe')) {
      return {
        icon: 'restaurant',
        iconBg: 'bg-[#ff9800]/20',
        textCol: 'text-[#ffb74d]',
        colorHex: '#ff9800',
        barGrad: 'from-[#ff9800] to-[#f57c00]',
        shadow: 'shadow-[0_0_12px_rgba(255,152,0,0.4)]'
      };
    }
    if (lower.includes('servici') || lower.includes('factur')) {
      return {
        icon: 'receipt',
        iconBg: 'bg-primary/20',
        textCol: 'text-primary-fixed',
        colorHex: '#aac7ff',
        barGrad: 'from-primary-fixed-dim to-primary-container',
        shadow: 'shadow-[0_0_12px_rgba(170,199,255,0.3)]'
      };
    }
    if (lower.includes('entreten') || lower.includes('suscrip')) {
      return {
        icon: 'tv',
        iconBg: 'bg-tertiary/20',
        textCol: 'text-tertiary',
        colorHex: '#e9b3ff',
        barGrad: 'from-tertiary to-tertiary-container',
        shadow: 'shadow-[0_0_12px_rgba(233,179,255,0.3)]'
      };
    }
    if (lower.includes('otro')) {
      return {
        icon: 'tag',
        iconBg: 'bg-surface-container-highest',
        textCol: 'text-on-surface-variant',
        colorHex: '#8b91a0',
        barGrad: 'from-outline to-surface-variant',
        shadow: 'shadow-[0_0_8px_rgba(139,145,160,0.3)]'
      };
    }
    
    const palette = [
      { icon: 'category', iconBg: 'bg-error-container/20', textCol: 'text-error', colorHex: '#ffb4ab', barGrad: 'from-error to-error-container', shadow: 'shadow-[0_0_12px_rgba(255,180,171,0.5)]' },
      { icon: 'shopping_bag', iconBg: 'bg-secondary/15', textCol: 'text-secondary', colorHex: '#47e266', barGrad: 'from-secondary to-secondary-container', shadow: 'shadow-[0_0_12px_rgba(71,226,102,0.4)]' },
      { icon: 'credit_card', iconBg: 'bg-primary-container/20', textCol: 'text-primary', colorHex: '#3e90ff', barGrad: 'from-primary to-primary-container', shadow: 'shadow-[0_0_12px_rgba(170,199,255,0.4)]' },
      { icon: 'payments', iconBg: 'bg-tertiary-container/20', textCol: 'text-tertiary', colorHex: '#c863fb', barGrad: 'from-tertiary to-tertiary-container', shadow: 'shadow-[0_0_12px_rgba(233,179,255,0.4)]' },
    ];
    return palette[index % palette.length];
  };

  const radius = 62;
  const circumference = 2 * Math.PI * radius; // ~389.56
  const totalPercentage = categories.reduce((sum, c) => sum + c.percentage, 0);

  let currentOffset = 0;
  const svgSegments = categories.map((cat, idx) => {
    // Normalize percentage in case sum is not exactly 100
    const pct = totalPercentage > 0 ? (cat.percentage / totalPercentage) * 100 : 0;
    const strokeDash = (pct / 100) * circumference;
    const strokeDasharray = `${strokeDash} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += strokeDash;
    const theme = getCategoryTheme(cat.category, idx);
    const isSelected = selectedCategory === cat.category;

    return {
      category: cat.category,
      percentage: cat.percentage,
      total: cat.total,
      strokeDasharray,
      strokeDashoffset,
      colorHex: theme.colorHex,
      isSelected
    };
  });

  const maxExpense = categories.length > 0 ? categories[0] : null;
  const maxFreq = [...categories].sort((a, b) => b.count - a.count)[0];
  const cashWithdrawal = categories.find(c => c.category.toLowerCase().includes('retiro') || c.category.toLowerCase().includes('efectivo'));
  const activeCategorySummary = categories.find(c => c.category === selectedCategory);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.6)] border border-outline-variant/20 flex flex-col justify-between h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-fixed/30 to-transparent"></div>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-xl sm:text-2xl text-on-surface font-bold">
                Gastos por Categoría
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => onSelectCategory?.(null)}
                  type="button"
                  className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center gap-1 hover:bg-primary/30 transition-all cursor-pointer border border-primary/30"
                >
                  <span>Filtrado: {selectedCategory}</span>
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              )}
            </div>
            <p className="font-body-sm text-[13px] text-on-surface-variant">
              Toca cualquier categoría para filtrar transacciones y comparar en la barra
            </p>
          </div>
          <span className="font-mono-metric text-[13px] px-3.5 py-1.5 rounded-full bg-surface-container-high text-primary font-semibold border border-outline-variant/20 shrink-0">
            Septiembre 2026
          </span>
        </div>

        {/* Donut Graphic & Legend Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center my-4">
          {/* SVG Clean Donut Ring */}
          <div className="sm:col-span-5 flex justify-center items-center relative py-2">
            <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background Base Ring */}
              <circle
                cx="80"
                cy="80"
                fill="transparent"
                r={radius}
                stroke="#1d2026"
                strokeWidth="14"
              />
              
              {/* Segments rendered with butt linecap for seamless contiguous transitions */}
              {svgSegments.length > 0 ? (
                svgSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r={radius}
                    stroke={seg.colorHex}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="butt"
                    strokeWidth={seg.isSelected ? 18 : 14}
                    className={`transition-all duration-300 cursor-pointer ${
                      selectedCategory
                        ? seg.isSelected
                          ? 'opacity-100 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                          : 'opacity-30 hover:opacity-75'
                        : 'hover:opacity-90 hover:stroke-[16px]'
                    }`}
                    onClick={() => onSelectCategory?.(selectedCategory === seg.category ? null : seg.category)}
                  />
                ))
              ) : (
                <circle
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r={radius}
                  stroke="#272a31"
                  strokeWidth="14"
                />
              )}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              {activeCategorySummary ? (
                <>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary font-bold line-clamp-1">
                    {activeCategorySummary.category}
                  </span>
                  <span className="font-headline-sm text-base sm:text-lg text-on-surface font-extrabold">
                    {formatDOP(activeCategorySummary.total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectCategory?.(null)}
                    className="font-label-sm text-[10px] text-primary hover:underline font-semibold mt-0.5 cursor-pointer"
                  >
                    ✕ Ver Todas
                  </button>
                </>
              ) : (
                <>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
                    TOTAL GASTOS
                  </span>
                  <span className="font-headline-sm text-lg text-on-surface font-bold">
                    {categories.length > 0 ? '100%' : '0%'}
                  </span>
                  <span className="font-label-sm text-[10px] text-secondary font-semibold">
                    {categories.length > 0 ? 'INTERACTIVO' : 'SIN DATOS'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Peek Highlights */}
          <div className="sm:col-span-7 flex flex-col gap-2">
            {maxExpense ? (
              <div 
                onClick={() => onSelectCategory?.(selectedCategory === maxExpense.category ? null : maxExpense.category)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedCategory === maxExpense.category
                    ? 'bg-surface-container-high border-error shadow-[0_0_14px_rgba(255,180,171,0.2)]'
                    : 'bg-surface-container-high/40 border-outline-variant/15 hover:bg-surface-container-high/70'
                } flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
                  <div>
                    <span className="font-body-sm text-[13px] text-on-surface font-medium">Mayor desembolso</span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant ml-1.5">({maxExpense.category})</span>
                  </div>
                </div>
                <span className="font-mono-metric text-[14px] text-error font-semibold">
                  {formatDOP(maxExpense.total)}
                </span>
              </div>
            ) : null}
            {maxFreq ? (
              <div 
                onClick={() => onSelectCategory?.(selectedCategory === maxFreq.category ? null : maxFreq.category)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedCategory === maxFreq.category
                    ? 'bg-surface-container-high border-secondary shadow-[0_0_14px_rgba(71,226,102,0.2)]'
                    : 'bg-surface-container-high/40 border-outline-variant/15 hover:bg-surface-container-high/70'
                } flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary-fixed"></div>
                  <div>
                    <span className="font-body-sm text-[13px] text-on-surface font-medium">Frecuencia más alta</span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant ml-1.5">({maxFreq.category})</span>
                  </div>
                </div>
                <span className="font-mono-metric text-[14px] text-on-surface font-semibold">
                  {maxFreq.count} Compras
                </span>
              </div>
            ) : null}
            {cashWithdrawal ? (
              <div 
                onClick={() => onSelectCategory?.(selectedCategory === cashWithdrawal.category ? null : cashWithdrawal.category)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedCategory === cashWithdrawal.category
                    ? 'bg-surface-container-high border-primary-container shadow-[0_0_14px_rgba(62,144,255,0.2)]'
                    : 'bg-surface-container-high/40 border-outline-variant/15 hover:bg-surface-container-high/70'
                } flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-container"></div>
                  <span className="font-body-sm text-[13px] text-on-surface font-medium">Efectivo en Cajeros RD</span>
                </div>
                <span className="font-mono-metric text-[14px] text-on-surface font-semibold">
                  {formatDOP(cashWithdrawal.total)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Detailed Progress Interactive Pills */}
        <div className="flex flex-col gap-2.5 mt-4">
          {categories.length === 0 ? (
            <div className="text-center py-6 text-on-surface-variant font-body-md text-sm">
              No hay gastos registrados en este período.
            </div>
          ) : (
            categories.map((cat, idx) => {
              const theme = getCategoryTheme(cat.category, idx);
              const isSelected = selectedCategory === cat.category;

              return (
                <div
                  key={cat.category}
                  onClick={() => onSelectCategory?.(isSelected ? null : cat.category)}
                  className={`flex flex-col gap-1.5 p-2.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-container-high border border-primary/40 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                      : 'hover:bg-surface-container-high/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full ${theme.iconBg} flex items-center justify-center ${theme.textCol} shadow-sm`}>
                        <span className="material-symbols-outlined text-[16px]">{theme.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-body-sm text-[13px] ${isSelected ? 'text-primary font-bold' : 'text-on-surface font-semibold'}`}>
                            {cat.category}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                              Activo ✓
                            </span>
                          )}
                        </div>
                        <span className="font-label-sm text-[11px] text-on-surface-variant">
                          {cat.count} transacciones
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono-metric text-[14px] text-on-surface font-bold">
                        {formatDOP(cat.total)}
                      </span>
                      <span className={`font-label-sm text-[11px] ${theme.textCol} ml-1.5 font-bold`}>
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-highest/60 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${theme.barGrad} relative ${theme.shadow} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-white/40"></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Security Footer Callout */}
      <div className="mt-6 pt-3 flex items-center justify-between bg-surface-container-highest/30 border border-outline-variant/15 rounded-xl p-3">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-secondary">touch_app</span>
          <span className="font-body-sm text-[12px]">Haz click en cualquier categoría para filtrado multidimensional</span>
        </div>
        {selectedCategory ? (
          <button
            onClick={() => onSelectCategory?.(null)}
            type="button"
            className="font-label-sm text-[11px] font-semibold text-primary uppercase cursor-pointer hover:underline"
          >
            Limpiar Filtro ✕
          </button>
        ) : (
          <span className="font-label-sm text-[11px] font-semibold text-primary uppercase">
            Interactividad Activa
          </span>
        )}
      </div>
    </div>
  );
};
