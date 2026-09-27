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

  if (loading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-purpose="kpi-cards">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="retro-box p-4 animate-pulse h-32 flex flex-col justify-between">
            <div className="h-3 bg-[#3b3b77] w-1/2"></div>
            <div className="h-6 bg-[#3b3b77] w-3/4"></div>
            <div className="h-3 bg-[#3b3b77] w-1/3"></div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-purpose="kpi-cards">
      {/* Card 1: Balance Neto (Player 1 HP - Phosphor Green) */}
      <div className="retro-box p-4 border-[#39ff14]/70" style={{ background: 'linear-gradient(180deg, #092015 0%, #030d08 100%)' }}>
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#1e5835] pb-2">
          <span className="font-pixel text-[9px] text-[#39ff14] tracking-wider">1P // BALANCE HP</span>
          <span className="font-pixel text-[8px] bg-black text-[#39ff14] px-1.5 py-0.5 border border-[#39ff14] shadow-[1px_1px_0px_#000]">
            LVL 99
          </span>
        </div>
        <div className="mt-3">
          <div className="font-pixel text-lg sm:text-xl text-[#39ff14] pixel-text-glow-green tracking-tight">
            {formatDOP(balance)}
          </div>
          <div className="mt-2.5 flex items-center space-x-2">
            <span className={`font-pixel text-[8px] px-1.5 py-0.5 border border-black font-bold shadow-[2px_2px_0px_#000] ${
              isPositive ? 'bg-[#39ff14] text-black' : 'bg-[#ff3344] text-white'
            }`}>
              {isPositive ? '▲ LEVEL UP!' : '▼ CRITICAL HP!'}
            </span>
            <span className="font-vt text-sm text-[#7bfdb0] tracking-wide">
              {isPositive ? 'SUPERÁVIT ACTIVO' : 'DÉFICIT ACTIVO'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Total Gastos (Damage Taken - Crimson Arcade Red) */}
      <div className="retro-box p-4 border-[#ff3344]/70" style={{ background: 'linear-gradient(180deg, #2b0b14 0%, #130307 100%)' }}>
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#6c1626] pb-2">
          <span className="font-pixel text-[9px] text-[#ff3344] tracking-wider">DAMAGE // GASTOS</span>
          <span className="font-pixel text-[8px] bg-black text-[#ff3344] px-1.5 py-0.5 border border-[#ff3344] shadow-[1px_1px_0px_#000]">
            -HIT
          </span>
        </div>
        <div className="mt-3">
          <div className="font-pixel text-lg sm:text-xl text-[#ff3344] pixel-text-glow-red tracking-tight">
            {formatDOP(summary?.totalExpenses || 0)}
          </div>
          <div className="mt-2.5 flex items-center space-x-2 font-vt text-base">
            <span className="text-[#ff6b7d] font-bold">{categoriesCount} CATEGORÍAS</span>
            <span className="text-slate-400">EN COMBATE</span>
          </div>
        </div>
      </div>

      {/* Card 3: Total Ingresos (Total Score / Gold - Radiant Arcade Gold) */}
      <div className="retro-box p-4 border-[#ffcc00]/70" style={{ background: 'linear-gradient(180deg, #2a2004 0%, #140e01 100%)' }}>
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#6e5100] pb-2">
          <span className="font-pixel text-[9px] text-[#ffcc00] tracking-wider">HIGH SCORE // GOLD</span>
          <span className="font-pixel text-[8px] bg-black text-[#ffcc00] px-1.5 py-0.5 border border-[#ffcc00] shadow-[1px_1px_0px_#000]">
            GOLD
          </span>
        </div>
        <div className="mt-3">
          <div className="font-pixel text-lg sm:text-xl text-[#ffcc00] pixel-text-glow-gold tracking-tight">
            {formatDOP(summary?.totalIncome || 0)}
          </div>
          <div className="mt-2.5 flex items-center space-x-2 font-vt text-base">
            <span className="text-[#00ffff] font-bold">NÓMINA & ABONOS</span>
            <span className="text-slate-400">COBRADOS</span>
          </div>
        </div>
      </div>

      {/* Card 4: Transacciones (Quests / Combos - Deep Capcom Purple) */}
      <div className="retro-box p-4 border-[#b538f0]/70" style={{ background: 'linear-gradient(180deg, #1f0b35 0%, #0c0416 100%)' }}>
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#551980] pb-2">
          <span className="font-pixel text-[9px] text-[#d65dff] tracking-wider">QUESTS // COMBOS</span>
          <span className="font-pixel text-[8px] bg-black text-[#d65dff] px-1.5 py-0.5 border border-[#d65dff] shadow-[1px_1px_0px_#000]">
            SYNC
          </span>
        </div>
        <div className="mt-3">
          <div className="font-pixel text-xl sm:text-2xl text-white pixel-text-shadow tracking-tight">
            {totalTransactions}
          </div>
          <div className="mt-2.5 flex items-center space-x-2 font-vt text-base">
            <span className="text-[#d65dff] font-bold">4 BANCOS RD</span>
            <span className="text-slate-400">EN LA PARTY</span>
          </div>
        </div>
      </div>
    </section>
  );
};
