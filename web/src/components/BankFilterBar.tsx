import React from 'react';

interface BankFilterBarProps {
  selectedBanks: string[];
  onToggleBank: (bankCode: string) => void;
  onSelectAll: () => void;
  lastSyncText?: string;
}

export const BankFilterBar: React.FC<BankFilterBarProps> = ({
  selectedBanks,
  onToggleBank,
  onSelectAll,
  lastSyncText = 'hace 3 min'
}) => {
  const banks = [
    { code: 'PROMERICA', label: 'Promerica', dotBg: 'bg-secondary' },
    { code: 'POPULAR', label: 'Banco Popular', dotBg: 'bg-primary-container' },
    { code: 'BHD', label: 'BHD León', dotBg: 'bg-tertiary' },
    { code: 'QIK', label: 'Qik Banco Digital', dotBg: 'bg-tertiary-container' },
  ];

  const isAllSelected = selectedBanks.length === 0 || selectedBanks.includes('ALL');

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      {/* Segmented Floating Pill Bar */}
      <div className="inline-flex p-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-outline-variant/20 overflow-x-auto">
        {/* All Banks */}
        <button
          onClick={onSelectAll}
          type="button"
          className={`px-4 py-2 rounded-full font-label-md text-[12px] flex items-center gap-1.5 transition-all cursor-pointer ${
            isAllSelected
              ? 'bg-surface-container-highest/90 text-on-surface font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/30'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-secondary text-[16px]">
            {isAllSelected ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          <span className="font-semibold">Todos los Bancos</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1"></span>
        </button>

        {/* Bank Pills */}
        {banks.map((b) => {
          const isSelected = selectedBanks.includes(b.code);
          return (
            <button
              key={b.code}
              onClick={() => onToggleBank(b.code)}
              type="button"
              className={`px-4 py-2 rounded-full font-label-md text-[12px] flex items-center gap-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-surface-container-highest/90 text-on-surface font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/30'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${b.dotBg}`}></span>
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sync Timestamp */}
      <div className="flex items-center gap-1.5 text-on-surface-variant px-2 self-end sm:self-center">
        <span className="material-symbols-outlined text-[16px]">history</span>
        <span className="font-label-sm text-[10px] uppercase tracking-wider">Última sync: {lastSyncText}</span>
      </div>
    </div>
  );
};
