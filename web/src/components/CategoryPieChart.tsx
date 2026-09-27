import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CategorySummary } from '../types';
import { 
  Fuel, 
  ShoppingCart, 
  Utensils, 
  Tv, 
  Zap, 
  Activity, 
  ShoppingBag, 
  Car, 
  ArrowRightLeft, 
  TrendingUp, 
  Banknote,
  Tag 
} from 'lucide-react';

interface CategoryPieChartProps {
  categories: CategorySummary[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ categories }) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'fuel': return <Fuel className="w-4 h-4 text-red-400" />;
      case 'shopping-cart': return <ShoppingCart className="w-4 h-4 text-amber-400" />;
      case 'utensils': return <Utensils className="w-4 h-4 text-orange-400" />;
      case 'tv': return <Tv className="w-4 h-4 text-purple-400" />;
      case 'zap': return <Zap className="w-4 h-4 text-blue-400" />;
      case 'activity': return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'shopping-bag': return <ShoppingBag className="w-4 h-4 text-pink-400" />;
      case 'car': return <Car className="w-4 h-4 text-cyan-400" />;
      case 'arrow-right-left': return <ArrowRightLeft className="w-4 h-4 text-slate-400" />;
      case 'banknote': return <Banknote className="w-4 h-4 text-indigo-400" />;
      case 'trending-up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      default: return <Tag className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatDOP = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center min-h-[350px] text-center">
        <Tag className="w-12 h-12 text-slate-600 mb-3" />
        <h4 className="text-lg font-semibold text-slate-300">Sin datos de categorías</h4>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          Sincroniza tus correos bancarios para ver la distribución de gastos.
        </p>
      </div>
    );
  }

  const pieData = categories.map(c => ({
    name: c.category,
    value: c.total,
    percentage: c.percentage,
    color: c.color
  }));

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Gastos por Categoría</h3>
          <p className="text-xs text-slate-400">Distribución automática por comercios dominicanos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Pie Chart */}
        <div className="md:col-span-5 h-60 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs">
                        <p className="font-semibold text-white">{data.name}</p>
                        <p className="text-emerald-400 font-bold mt-0.5">{formatDOP(data.value)} ({data.percentage}%)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#020617" strokeWidth={2} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Categories Progress Breakdown */}
        <div className="md:col-span-7 space-y-3 max-h-[300px] overflow-y-auto pr-2">
          {categories.map((cat, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 transition-all">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-800">
                    {getCategoryIcon(cat.icon)}
                  </div>
                  <span className="font-semibold text-slate-200">{cat.category}</span>
                  <span className="text-[11px] text-slate-500">({cat.count})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">{formatDOP(cat.total)}</span>
                  <span className="text-slate-400 text-[11px] ml-1.5">({cat.percentage}%)</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color }} 
                />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
