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
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getRetroCategoryColor = (catName: string, index: number) => {
    const lower = catName.toLowerCase();
    if (lower.includes('combus')) return { color: '#ff3344', border: '#55101b', fill: '#e52521', icon: '■' };
    if (lower.includes('super') || lower.includes('alimen')) return { color: '#ffcc00', border: '#554200', fill: '#ffcc00', icon: '★' };
    if (lower.includes('retiro') || lower.includes('cajer') || lower.includes('efect')) return { color: '#00d8f6', border: '#004860', fill: '#00d8f6', icon: '◆' };
    if (lower.includes('restauran') || lower.includes('comida') || lower.includes('cafe')) return { color: '#d65dff', border: '#471561', fill: '#b538f0', icon: '♥' };
    if (lower.includes('servici') || lower.includes('factur')) return { color: '#0088ff', border: '#002f6c', fill: '#0088ff', icon: '▲' };
    if (lower.includes('entreten') || lower.includes('suscrip')) return { color: '#ff2a85', border: '#55002b', fill: '#ff2a85', icon: '✦' };
    
    const palette = [
      { color: '#ff3344', border: '#55101b', fill: '#e52521', icon: '■' },
      { color: '#ffcc00', border: '#554200', fill: '#ffcc00', icon: '★' },
      { color: '#00d8f6', border: '#004860', fill: '#00d8f6', icon: '◆' },
      { color: '#d65dff', border: '#471561', fill: '#b538f0', icon: '♥' },
      { color: '#0088ff', border: '#002f6c', fill: '#0088ff', icon: '▲' },
    ];
    return palette[index % palette.length];
  };

  const circumference = 2 * Math.PI * 38; // ~238.76

  // Calculate SVG stroke dashes
  let currentOffset = 0;
  const svgSegments = categories.map((cat, idx) => {
    const strokeDash = (cat.percentage / 100) * circumference;
    const strokeDasharray = `${strokeDash} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += strokeDash;
    const styling = getRetroCategoryColor(cat.category, idx);
    return {
      category: cat.category,
      percentage: cat.percentage,
      strokeDasharray,
      strokeDashoffset,
      fill: styling.fill
    };
  });

  return (
    <section className="retro-box p-5 h-full" data-purpose="category-breakdown">
      <div className="flex items-center justify-between border-b-2 border-dashed border-[#3868c0] pb-3">
        <div>
          <h3 className="font-pixel text-xs sm:text-sm text-[#ffcc00] pixel-text-shadow tracking-wider">
            [INVENTARIO DE GASTOS]
          </h3>
          <p className="font-vt text-sm text-[#00d8f6] tracking-wider mt-0.5">
            DISTRIBUCIÓN POR COMERCIOS DOMINICANOS
          </p>
        </div>
        <span className="font-pixel text-[8px] bg-black text-[#39ff14] border border-[#39ff14] px-2 py-1 shadow-[2px_2px_0px_#000]">
          AUTO-LOOT ON
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* 8-Bit Pixel Donut / Radar Chart */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Stepped Pixel Ring */}
            <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle cx="50" cy="50" fill="none" r="38" stroke="#000000" strokeWidth="16" />
              
              {/* Segments */}
              {svgSegments.length > 0 ? (
                svgSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    fill="none"
                    r="38"
                    stroke={seg.fill}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="butt"
                    strokeWidth="14"
                  />
                ))
              ) : (
                <circle cx="50" cy="50" fill="none" r="38" stroke="#222244" strokeWidth="14" />
              )}
            </svg>

            {/* Center Arcade Core */}
            <div className="absolute w-20 h-20 bg-[#060b18] border-2 border-[#ffcc00] flex flex-col items-center justify-center text-center shadow-[inset_2px_2px_0px_#000]">
              <span className="font-pixel text-[7px] text-slate-300">TOTAL</span>
              <span className="font-pixel text-[11px] text-[#39ff14] mt-0.5 pixel-text-glow-green font-bold">100%</span>
              <span className="font-pixel text-[6px] text-[#ffcc00] mt-0.5">SYNCED</span>
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="font-pixel text-[8px] bg-black text-[#ffcc00] px-2.5 py-1 border-2 border-[#ffcc00] shadow-[2px_2px_0px_#000]">
              CICLO ACTUAL
            </span>
          </div>
        </div>

        {/* 8-Bit Pixel Block Segment Bars List */}
        <div className="sm:col-span-7 space-y-3 font-pixel">
          {categories.length === 0 ? (
            <div className="text-center py-6 text-slate-500 font-vt text-lg">
              No hay gastos en este periodo
            </div>
          ) : (
            categories.slice(0, 5).map((cat, idx) => {
              const style = getRetroCategoryColor(cat.category, idx);
              return (
                <div
                  key={cat.category}
                  className="bg-black/80 p-2.5 border-2 shadow-[2px_2px_0px_#000]"
                  style={{ borderColor: style.border }}
                >
                  <div className="flex items-center justify-between text-[9px] mb-1.5">
                    <span className="flex items-center gap-1.5 font-bold" style={{ color: style.color }}>
                      <span>{style.icon}</span> {cat.category.toUpperCase()} <span className="text-slate-400 font-vt text-sm font-normal">({cat.count})</span>
                    </span>
                    <span className="text-white">
                      {formatDOP(cat.total)} <span style={{ color: style.color }}>({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="pixel-meter" style={{ color: style.fill }}>
                    <div className="pixel-meter-fill" style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
