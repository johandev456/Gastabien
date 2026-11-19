import React from 'react';
import { BankCode } from '../types';
import { formatRelative } from '../utils/format';

interface BankFilterBarProps {
  selectedBanks: BankCode[];
  onToggleBank: (bankCode: BankCode) => void;
  onSelectAll: () => void;
  lastSyncAt?: string | null;
  /** Banks that currently have movements (used to show the MANUAL chip only when relevant). */
  availableBanks?: BankCode[];
}

const BANKS: { code: BankCode; label: string; dotBg: string }[] = [
  { code: 'PROMERICA', label: 'Promerica', dotBg: 'bg-banco-promerica' },
  { code: 'POPULAR', label: 'Banco Popular', dotBg: 'bg-primary-container' },
  { code: 'BHD', label: 'BHD', dotBg: 'bg-banco-bhd' },
  { code: 'QIK', label: 'Qik', dotBg: 'bg-tertiary-container' },
  { code: 'MANUAL', label: 'Manual / Efectivo', dotBg: 'bg-outline' }
];

const pillBase = 'px-3.5 sm:px-4 py-2 rounded-full font-label-md text-[12px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0';
const pillOn = 'bg-surface-container-highest/90 text-on-surface font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-outline-variant/30';
const pillOff = 'text-on-surface-variant hover:text-on-surface border border-transparent';

export const BankFilterBar: React.FC<BankFilterBarProps> = ({
  selectedBanks,
  onToggleBank,
  onSelectAll,
  lastSyncAt,
  availableBanks
}) => {
  const isAllSelected = selectedBanks.length === 0;
  const banks = BANKS.filter(b => b.code !== 'MANUAL' || availableBanks?.includes('MANUAL') || selectedBanks.includes('MANUAL'));

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 min-w-0">
      <div
        className="flex max-w-full p-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-outline-variant/20 overflow-x-auto scrollbar-none"
        role="group"
        aria-label="Filtrar por banco"
      >
        <button onClick={onSelectAll} type="button" aria-pressed={isAllSelected} className={`${pillBase} ${isAllSelected ? pillOn : pillOff}`}>
          <span className="material-symbols-outlined text-secondary text-[16px]" aria-hidden="true">
            {isAllSelected ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          <span className="font-semibold">Todos</span>
        </button>

        {banks.map((b) => {
          const isSelected = selectedBanks.includes(b.code);
          return (
            <button
              key={b.code}
              onClick={() => onToggleBank(b.code)}
              type="button"
              aria-pressed={isSelected}
              className={`${pillBase} ${isSelected ? pillOn : pillOff}`}
            >
              <span className={`w-2 h-2 rounded-full ${b.dotBg}`} aria-hidden="true"></span>
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      <div
        className="flex items-center gap-1.5 text-on-surface-variant px-2 self-end sm:self-center shrink-0"
        title={lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-DO') : undefined}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">history</span>
        <span className="font-label-sm text-[10px] uppercase tracking-wider whitespace-nowrap">Última sync: {formatRelative(lastSyncAt)}</span>
      </div>
    </div>
  );
};
