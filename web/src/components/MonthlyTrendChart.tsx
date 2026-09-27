import React from 'react';
import { MonthlyTrend } from '../types';

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
  totalIncome?: number;
  totalExpenses?: number;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  totalIncome = 0,
  totalExpenses = 0
}) => {
  const formatDOP = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Extract latest month or totals
  const latestData = data.length > 0 ? data[data.length - 1] : { income: totalIncome, expenses: totalExpenses, month: '2026-09' };
  const inc = latestData.income > 0 ? latestData.income : totalIncome;
  const exp = latestData.expenses > 0 ? latestData.expenses : totalExpenses;

  const maxVal = Math.max(15000, inc * 1.15, exp * 1.15);
  const incHeight = Math.min(96, Math.max(10, (inc / maxVal) * 100));
  const expHeight = Math.min(96, Math.max(10, (exp / maxVal) * 100));

  const scale1 = `${Math.round(maxVal / 1000)}k`;
  const scale2 = `${Math.round((maxVal * 0.75) / 1000)}k`;
  const scale3 = `${Math.round((maxVal * 0.5) / 1000)}k`;
  const scale4 = `${Math.round((maxVal * 0.25) / 1000)}k`;

  return (
    <section className="retro-box p-5 flex flex-col justify-between h-full" data-purpose="monthly-comparison">
      <div>
        <div className="flex items-start justify-between border-b-2 border-dashed border-[#3868c0] pb-3">
          <div>
            <h3 className="font-pixel text-xs sm:text-sm text-[#ffcc00] pixel-text-shadow tracking-wider">
              [INGRESOS VS GASTOS]
            </h3>
            <p className="font-vt text-sm text-[#00d8f6] tracking-wider mt-0.5">
              POWER METERS DE FLUJO EN RD$
            </p>
          </div>
          {/* 8-Bit Legend */}
          <div className="flex items-center space-x-3 font-pixel text-[8px]">
            <span className="text-[#39ff14] flex items-center gap-1 font-bold">
              <span className="w-2 h-2 bg-[#39ff14] shadow-[0_0_4px_#39ff14]" /> IN
            </span>
            <span className="text-[#ff3344] flex items-center gap-1 font-bold">
              <span className="w-2 h-2 bg-[#ff3344] shadow-[0_0_4px_#ff3344]" /> OUT
            </span>
          </div>
        </div>

        {/* 8-Bit Stacked Brick Column Chart */}
        <div className="mt-6 flex items-end space-x-3 h-52 pt-3 px-1">
          {/* Scale labels */}
          <div className="flex flex-col justify-between h-full font-pixel text-[7px] text-[#6080b0] pb-5 text-right select-none pr-1">
            <span>{scale1}</span>
            <span>{scale2}</span>
            <span>{scale3}</span>
            <span>{scale4}</span>
            <span>0k</span>
          </div>

          {/* Chart Area with Pixel Grid Background */}
          <div className="relative flex-1 h-full border-b-4 border-l-2 border-[#ffcc00] flex items-end justify-center gap-8 pb-1 bg-black/80 shadow-[inset_2px_2px_0px_#000]">
            {/* Retro Dotted Horizontal Guides */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-dashed border-white w-full" />
              <div className="border-b border-dashed border-white w-full" />
              <div className="border-b border-dashed border-white w-full" />
              <div className="border-b border-dashed border-white w-full" />
              <div />
            </div>

            {/* Bar 1: Ingresos (CPS-2 Super Meter / Bright Green Gradient) */}
            <div className="relative w-16 sm:w-20 flex flex-col items-center justify-end h-full group">
              {/* Value Tooltip */}
              <div className="absolute -top-7 px-1.5 py-0.5 bg-black border border-[#39ff14] font-pixel text-[7px] text-[#39ff14] shadow-[2px_2px_0px_#000] whitespace-nowrap z-10">
                {formatDOP(inc)}
              </div>
              {/* Pixelated Segmented Bar */}
              <div className="w-full border-2 border-black shadow-[2px_2px_0px_#000] transition-all duration-500" style={{ height: `${incHeight}%` }}>
                <div
                  className="w-full h-full bg-[#00a800]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(180deg, #afffaf 0px, #39ff14 4px, #008822 6px, #000000 6px, #000000 8px)'
                  }}
                />
              </div>
              <span className="font-pixel text-[8px] text-[#39ff14] mt-1.5 font-bold tracking-wide">INGRESOS</span>
            </div>

            {/* Bar 2: Gastos (Street Fighter Health / Red-Orange Boss Bar) */}
            <div className="relative w-16 sm:w-20 flex flex-col items-center justify-end h-full group">
              {/* Value Tooltip */}
              <div className="absolute -top-7 px-1.5 py-0.5 bg-black border border-[#ff3344] font-pixel text-[7px] text-[#ff3344] shadow-[2px_2px_0px_#000] whitespace-nowrap z-10">
                {formatDOP(exp)}
              </div>
              {/* Pixelated Segmented Bar */}
              <div className="w-full border-2 border-black shadow-[2px_2px_0px_#000] transition-all duration-500" style={{ height: `${expHeight}%` }}>
                <div
                  className="w-full h-full bg-[#e52521]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(180deg, #ff9900 0px, #ff3344 4px, #800010 6px, #000000 6px, #000000 8px)'
                  }}
                />
              </div>
              <span className="font-pixel text-[8px] text-[#ff3344] mt-1.5 font-bold tracking-wide">GASTOS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage ID / Cycle */}
      <div className="mt-4 text-center">
        <span className="inline-block font-pixel text-[9px] bg-black text-[#ffcc00] border-2 border-[#ffcc00] px-4 py-1.5 shadow-[3px_3px_0px_#000] tracking-wider">
          STAGE: {latestData.month || '2026-09'} [ACT 01]
        </span>
      </div>
    </section>
  );
};
