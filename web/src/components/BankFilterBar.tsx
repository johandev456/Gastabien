import React from 'react';
import { BankCode } from '../types';

interface BankFilterBarProps {
  selectedBanks: string[];
  onToggleBank: (bankCode: string) => void;
  onSelectAll: () => void;
}

export const BankFilterBar: React.FC<BankFilterBarProps> = ({
  selectedBanks,
  onToggleBank,
  onSelectAll
}) => {
  const isAllSelected = selectedBanks.length === 0 || selectedBanks.includes('ALL');

  const banks: { code: BankCode; label: string; dotColor: string; glowColor: string }[] = [
    {
      code: 'PROMERICA',
      label: 'PROMERICA',
      dotColor: 'bg-[#00e676]',
      glowColor: 'shadow-[0_0_5px_#00e676]'
    },
    {
      code: 'POPULAR',
      label: 'POPULAR',
      dotColor: 'bg-[#00d8f6]',
      glowColor: 'shadow-[0_0_5px_#00d8f6]'
    },
    {
      code: 'BHD',
      label: 'BHD',
      dotColor: 'bg-[#ffcc00]',
      glowColor: 'shadow-[0_0_5px_#ffcc00]'
    },
    {
      code: 'QIK',
      label: 'QIK',
      dotColor: 'bg-[#d038f0]',
      glowColor: 'shadow-[0_0_5px_#d038f0]'
    }
  ];

  return (
    <section className="retro-box p-3.5 mb-6" data-purpose="bank-filter-bar">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 font-pixel text-[10px] text-arcade-gold">
          <span className="text-arcade-green animate-retro-blink">▶</span>
          <span>SELECT BANK / FILTRAR BANCO:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-pixel text-[9px]">
          {/* All Active Pill */}
          <button
            onClick={onSelectAll}
            className={`px-3.5 py-1.5 border-2 border-black font-bold tracking-wide transition-all cursor-pointer ${
              isAllSelected
                ? 'bg-[#39ff14] text-black shadow-[2px_2px_0px_#ffcc00]'
                : 'bg-[#0d1e4c] text-white hover:text-[#39ff14] border-[#1e3c84] shadow-[2px_2px_0px_#000]'
            }`}
          >
            [★ TODOS]
          </button>

          {/* Individual Bank Pills */}
          {banks.map((b) => {
            const isSelected = selectedBanks.includes(b.code);
            return (
              <button
                key={b.code}
                onClick={() => onToggleBank(b.code)}
                className={`px-3 py-1.5 border-2 shadow-[2px_2px_0px_#000] flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#183272] text-[#00ffff] border-[#00ffff] font-bold shadow-[2px_2px_0px_#ffd700]'
                    : 'bg-[#0d1e4c] text-white hover:text-[#00ffff] border-[#1e3c84] hover:border-[#00ffff]'
                }`}
              >
                <span className={`w-2 h-2 ${b.dotColor} ${b.glowColor}`}></span>
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
