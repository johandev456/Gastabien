import React from 'react';
import { CategorySummary } from '../types';

interface CategoryPieChartProps {
  categories: CategorySummary[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ categories }) => {
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
        ringClass: 'text-error',
        barGrad: 'from-error to-error-container',
        shadow: 'shadow-[0_0_12px_rgba(255,180,171,0.5)]',
        colorHex: '#ffb4ab'
      };
    }
    if (lower.includes('super') || lower.includes('alimen')) {
      return {
        icon: 'shopping_cart',
        iconBg: 'bg-secondary/15',
        textCol: 'text-secondary',
        ringClass: 'text-secondary-fixed',
        barGrad: 'from-secondary to-secondary-container',
        shadow: 'shadow-[0_0_12px_rgba(71,226,102,0.4)]',
        colorHex: '#47e266'
      };
    }
    if (lower.includes('retiro') || lower.includes('cajer') || lower.includes('efect')) {
      return {
        icon: 'atm',
        iconBg: 'bg-primary-container/20',
        textCol: 'text-primary',
        ringClass: 'text-primary-container',
        barGrad: 'from-primary to-primary-container',
        shadow: 'shadow-[0_0_12px_rgba(170,199,255,0.4)]',
        colorHex: '#3e90ff'
      };
    }
    if (lower.includes('restauran') || lower.includes('comida') || lower.includes('cafe')) {
      return {
        icon: 'restaurant',
        iconBg: 'bg-tertiary-container/20',
        textCol: 'text-tertiary',
        ringClass: 'text-tertiary-container',
        barGrad: 'from-tertiary to-tertiary-container',
        shadow: 'shadow-[0_0_12px_rgba(233,179,255,0.4)]',
        colorHex: '#c863fb'
      };
    }
    if (lower.includes('servici') || lower.includes('factur')) {
      return {
        icon: 'receipt',
        iconBg: 'bg-primary/20',
        textCol: 'text-primary-fixed',
        ringClass: 'text-primary-fixed',
        barGrad: 'from-primary-fixed-dim to-primary-container',
        shadow: 'shadow-[0_0_12px_rgba(170,199,255,0.3)]',
        colorHex: '#aac7ff'
      };
    }
    
    const fallbacks = [
      {
        icon: 'category',
        iconBg: 'bg-error-container/20',
        textCol: 'text-error',
        ringClass: 'text-error',
        barGrad: 'from-error to-error-container',
        shadow: 'shadow-[0_0_12px_rgba(255,180,171,0.5)]',
        colorHex: '#ffb4ab'
      },
      {
        icon: 'shopping_bag',
        iconBg: 'bg-secondary/15',
        textCol: 'text-secondary',
        ringClass: 'text-secondary-fixed',
        barGrad: 'from-secondary to-secondary-container',
        shadow: 'shadow-[0_0_12px_rgba(71,226,102,0.4)]',
        colorHex: '#47e266'
      },
      {
        icon: 'credit_card',
        iconBg: 'bg-tertiary-container/20',
        textCol: 'text-tertiary',
        ringClass: 'text-tertiary-container',
        barGrad: 'from-tertiary to-tertiary-container',
        shadow: 'shadow-[0_0_12px_rgba(233,179,255,0.4)]',
        colorHex: '#c863fb'
      }
    ];
    return fallbacks[index % fallbacks.length];
  };

  const circumference = 2 * Math.PI * 66; // ~414.69

  let currentOffset = 0;
  const svgRings = categories.map((cat, idx) => {
    const strokeDash = (cat.percentage / 100) * circumference;
    const strokeDasharray = `${strokeDash} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += strokeDash;
    const theme = getCategoryTheme(cat.category, idx);
    return {
      category: cat.category,
      percentage: cat.percentage,
      strokeDasharray,
      strokeDashoffset,
      ringClass: theme.ringClass,
      colorHex: theme.colorHex
    };
  });

  const maxExpense = categories.length > 0 ? categories[0] : null;
  const maxFreq = [...categories].sort((a, b) => b.count - a.count)[0];
  const cashWithdrawal = categories.find(c => c.category.toLowerCase().includes('retiro') || c.category.toLowerCase().includes('efectivo'));

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.6)] border border-outline-variant/20 flex flex-col justify-between h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-fixed/30 to-transparent"></div>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-headline-md text-xl sm:text-2xl text-on-surface font-bold">
              Gastos por Categoría
            </h2>
            <p className="font-body-sm text-[13px] text-on-surface-variant">
              Distribución automática por comercios dominicanos
            </p>
          </div>
          <span className="font-mono-metric text-[13px] px-3.5 py-1.5 rounded-full bg-surface-container-high text-primary font-semibold border border-outline-variant/20">
            Septiembre 2026
          </span>
        </div>

        {/* Donut Graphic & Legend Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center my-4">
          {/* SVG Apple Rings Donut */}
          <div className="sm:col-span-5 flex justify-center items-center relative py-2">
            <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
              <circle
                className="text-surface-container-highest/40"
                cx="80"
                cy="80"
                fill="transparent"
                r="66"
                stroke="currentColor"
                strokeWidth="12"
              />
              {svgRings.map((seg, idx) => (
                <circle
                  key={idx}
                  className={seg.ringClass}
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="66"
                  stroke="currentColor"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="12"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
                TOTAL GASTOS
              </span>
              <span className="font-headline-sm text-lg text-on-surface font-bold">100%</span>
              <span className="font-label-sm text-[10px] text-secondary font-semibold">SYNCED</span>
            </div>
          </div>

          {/* Quick Peek Highlights */}
          <div className="sm:col-span-7 flex flex-col gap-2">
            {maxExpense && (
              <div className="p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
                  <span className="font-body-sm text-[13px] text-on-surface font-medium">Mayor desembolso</span>
                </div>
                <span className="font-mono-metric text-[14px] text-error font-semibold">
                  {formatDOP(maxExpense.total)}
                </span>
              </div>
            )}
            {maxFreq && (
              <div className="p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary-fixed"></div>
                  <span className="font-body-sm text-[13px] text-on-surface font-medium">Frecuencia más alta</span>
                </div>
                <span className="font-mono-metric text-[14px] text-on-surface font-semibold">
                  {maxFreq.count} Compras
                </span>
              </div>
            )}
            {cashWithdrawal ? (
              <div className="p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/15 flex items-center justify-between">
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

        {/* Detailed Progress Pills */}
        <div className="flex flex-col gap-3.5 mt-4">
          {categories.slice(0, 5).map((cat, idx) => {
            const theme = getCategoryTheme(cat.category, idx);
            return (
              <div key={cat.category} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full ${theme.iconBg} flex items-center justify-center ${theme.textCol}`}>
                      <span className="material-symbols-outlined text-[16px]">{theme.icon}</span>
                    </div>
                    <div>
                      <span className="font-body-sm text-[13px] text-on-surface font-semibold">
                        {cat.category}
                      </span>
                      <span className="font-label-sm text-[11px] text-on-surface-variant ml-1.5">
                        ({cat.count} transacciones)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-metric text-[14px] text-on-surface font-bold">
                      {formatDOP(cat.total)}
                    </span>
                    <span className={`font-label-sm text-[11px] ${theme.textCol} ml-1.5 font-semibold`}>
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-surface-container-highest/60 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${theme.barGrad} relative ${theme.shadow} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-white/40"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Footer Callout */}
      <div className="mt-6 pt-3 flex items-center justify-between bg-surface-container-highest/30 border border-outline-variant/15 rounded-xl p-3">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-secondary">shield_with_heart</span>
          <span className="font-body-sm text-[12px]">Validación bancaria cifrada con token TLS</span>
        </div>
        <span className="font-label-sm text-[11px] font-semibold text-primary uppercase cursor-pointer hover:underline">
          Detalles Completos →
        </span>
      </div>
    </div>
  );
};
