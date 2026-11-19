import React from 'react';
import { drMonthKey, formatMonthLabel } from '../utils/format';

export { formatMonthLabel };

interface MonthFilterBarProps {
  availableMonths?: string[];
  selectedMonth: string; // 'ALL' or 'YYYY-MM'
  onSelectMonth: (month: string) => void;
}

const pill = 'px-3.5 py-1.5 rounded-xl font-label-md text-[11px] sm:text-[12px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0';
const pillOn = 'bg-secondary text-on-secondary font-bold shadow-[0_2px_8px_rgba(20,229,144,0.3)]';
const pillOff = 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40';

export const MonthFilterBar: React.FC<MonthFilterBarProps> = ({
  availableMonths = [],
  selectedMonth,
  onSelectMonth
}) => {
  const isAll = !selectedMonth || selectedMonth === 'ALL';

  // Fallback: the current month in Dominican time (not UTC, which flips early on the last evening)
  const months = availableMonths.length > 0 ? [...availableMonths] : [drMonthKey()];
  // Keep the active filter visible even if it is no longer in the list
  if (!isAll && !months.includes(selectedMonth)) {
    months.unshift(selectedMonth);
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none min-w-0 max-w-full">
      <div className="flex p-1 rounded-2xl bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/20 shadow-sm" role="group" aria-label="Filtrar por mes">
        <button onClick={() => onSelectMonth('ALL')} type="button" aria-pressed={isAll} className={`${pill} ${isAll ? pillOn : pillOff}`}>
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            {isAll ? 'calendar_month' : 'calendar_today'}
          </span>
          <span>Todos los Meses</span>
        </button>

        {months.map((m) => {
          const isSelected = selectedMonth === m;
          return (
            <button key={m} onClick={() => onSelectMonth(m)} type="button" aria-pressed={isSelected} className={`${pill} ${isSelected ? pillOn : pillOff}`}>
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">event</span>
              <span>{formatMonthLabel(m)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
