import React from 'react';

interface MonthFilterBarProps {
  availableMonths?: string[];
  selectedMonth: string; // 'ALL' or 'YYYY-MM'
  onSelectMonth: (month: string) => void;
}

const SPANISH_MONTHS: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre'
};

export function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'ALL') return 'Todos los Meses';
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthNum = parts[1];
    const name = SPANISH_MONTHS[monthNum] || monthNum;
    return `${name} ${year}`;
  }
  return monthKey;
}

export const MonthFilterBar: React.FC<MonthFilterBarProps> = ({
  availableMonths = [],
  selectedMonth,
  onSelectMonth
}) => {
  const isAll = !selectedMonth || selectedMonth === 'ALL';

  // If no available months supplied yet, generate fallback for current and last month
  const monthsToDisplay = availableMonths.length > 0 
    ? availableMonths 
    : [
        new Date().toISOString().substring(0, 7)
      ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none">
      <div className="inline-flex p-1 rounded-2xl bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/20 shadow-sm">
        {/* All Months Pill */}
        <button
          onClick={() => onSelectMonth('ALL')}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl font-label-md text-[11px] sm:text-[12px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            isAll
              ? 'bg-secondary text-on-secondary font-bold shadow-[0_2px_8px_rgba(20,229,144,0.3)]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {isAll ? 'calendar_month' : 'calendar_today'}
          </span>
          <span>Todos los Meses</span>
        </button>

        {/* Dynamic Month Pills */}
        {monthsToDisplay.map((m) => {
          const isSelected = selectedMonth === m;
          const label = formatMonthLabel(m);

          return (
            <button
              key={m}
              onClick={() => onSelectMonth(m)}
              type="button"
              className={`px-3.5 py-1.5 rounded-xl font-label-md text-[11px] sm:text-[12px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-secondary text-on-secondary font-bold shadow-[0_2px_8px_rgba(20,229,144,0.3)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                event
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
