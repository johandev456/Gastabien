import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { MonthlyTrend } from '../types';

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data }) => {
  const formatDOP = (value: number) => {
    if (value >= 1000) {
      return `RD$ ${(value / 1000).toFixed(0)}k`;
    }
    return `RD$ ${value}`;
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Ingresos vs Gastos Mensuales</h3>
          <p className="text-xs text-slate-400">Comparativa de flujo de efectivo en RD$</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              tickFormatter={formatDOP} 
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                      <p className="font-semibold text-slate-300 mb-1">{label}</p>
                      <p className="text-emerald-400 font-bold">
                        Ingresos: RD$ {new Intl.NumberFormat('es-DO').format(payload[0]?.value as number || 0)}
                      </p>
                      <p className="text-rose-400 font-bold">
                        Gastos: RD$ {new Intl.NumberFormat('es-DO').format(payload[1]?.value as number || 0)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', paddingBottom: '12px' }} 
            />
            <Bar dataKey="income" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
