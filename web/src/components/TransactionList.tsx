import React, { useState } from 'react';
import { Transaction, BankCode, Category } from '../types';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Scroll
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateCategory: (id: string, newCategory: Category) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const CATEGORIES: Category[] = [
  'Combustible',
  'Supermercados',
  'Restaurantes y Comida',
  'Entretenimiento y Suscripciones',
  'Servicios y Facturas',
  'Salud y Farmacias',
  'Compras y Retail',
  'Transporte y Viajes',
  'Transferencias y Pagos',
  'Retiro de Efectivo',
  'Ingresos y Nómina',
  'Otros Gastos'
];

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onUpdateCategory,
  onDelete,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCategory, setTempCategory] = useState<Category>('Otros Gastos');

  const formatDOP = (amount: number, currency: 'DOP' | 'USD' = 'DOP') => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-DO', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const getBankBadgeStyle = (bank: BankCode) => {
    switch (bank) {
      case 'POPULAR':
        return 'bg-[#0d1e4c] text-[#00ffff] border-[#1e3c84] shadow-[1px_1px_0px_#000]';
      case 'BHD':
        return 'bg-[#002a18] text-[#ffcc00] border-[#005530] shadow-[1px_1px_0px_#000]';
      case 'PROMERICA':
        return 'bg-[#00291d] text-[#00e676] border-[#005c41] shadow-[1px_1px_0px_#000]';
      case 'QIK':
        return 'bg-[#2a0845] text-[#d65dff] border-[#55108b] shadow-[1px_1px_0px_#000]';
      default:
        return 'bg-[#111132] text-white border-[#3b3b77]';
    }
  };

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || tx.category === selectedCategory;
    const matchesType = selectedType === 'ALL' || tx.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <section className="retro-box p-4 sm:p-5 mt-6" data-purpose="transactions-quest-log">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-dashed border-[#444477] pb-3 mb-4">
        <div>
          <h3 className="font-pixel text-xs sm:text-sm text-[#ffcc00] pixel-text-shadow tracking-wider flex items-center gap-2">
            <span>📜</span> [QUEST LOG // HISTORIAL DE MOVIMIENTOS]
          </h3>
          <p className="font-vt text-sm text-[#00d8f6] tracking-wider mt-0.5">
            MOVIMIENTOS EXTRAÍDOS DE ESTADOS DE CUENTA & CORREOS
          </p>
        </div>
        <div className="font-pixel text-[9px] bg-black text-[#39ff14] border border-[#39ff14] px-2.5 py-1 self-start sm:self-auto shadow-[2px_2px_0px_#000]">
          REGISTROS: {filtered.length} / {transactions.length}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4 font-pixel text-[9px]">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="BUSCAR COMERCIO O CONCEPTO..."
            className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#00ffff] px-3 py-2 text-white placeholder-slate-500 font-pixel text-[9px] outline-none shadow-[inset_2px_2px_0px_#000]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category select */}
        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#00ffff] px-2.5 py-2 text-[#ffcc00] font-pixel text-[8px] outline-none shadow-[inset_2px_2px_0px_#000]"
          >
            <option value="ALL">★ TODAS CATEGORÍAS</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Type select */}
        <div className="sm:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#00ffff] px-2.5 py-2 text-[#00ffff] font-pixel text-[8px] outline-none shadow-[inset_2px_2px_0px_#000]"
          >
            <option value="ALL">★ TODOS TIPOS</option>
            <option value="EXPENSE">▼ GASTOS (OUT)</option>
            <option value="INCOME">▲ INGRESOS (IN)</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-10 font-pixel text-[10px] text-arcade-cyan animate-pulse">
          CARGANDO MOVIMIENTOS...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 bg-black/60 border-2 border-dashed border-[#3b3b77] p-6">
          <p className="font-pixel text-[10px] text-arcade-gold mb-2">NO HAY MOVIMIENTOS QUE COINCIDAN</p>
          <p className="font-vt text-base text-slate-400">
            Sube tu estado de cuenta con el botón superior o sincroniza con Gmail.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((tx) => {
            const isExpense = tx.type === 'EXPENSE';
            const isEditing = editingId === tx.id;

            return (
              <div
                key={tx.id}
                className="bg-black/90 border-2 border-[#2a2a5a] hover:border-[#ffd700] p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_#000]"
              >
                {/* Left info */}
                <div className="flex items-start sm:items-center space-x-3">
                  {/* Type icon box */}
                  <div
                    className={`w-9 h-9 border-2 flex items-center justify-center shrink-0 font-pixel text-xs font-bold shadow-[1px_1px_0px_#000] ${
                      isExpense
                        ? 'bg-[#2b0b14] border-[#ff3344] text-[#ff3344]'
                        : 'bg-[#092015] border-[#39ff14] text-[#39ff14]'
                    }`}
                  >
                    {isExpense ? '▼' : '▲'}
                  </div>

                  {/* Details */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-pixel text-[9px] sm:text-[10px] text-white font-bold">
                        {tx.merchant}
                      </span>
                      <span className={`font-pixel text-[7px] px-1.5 py-0.5 border ${getBankBadgeStyle(tx.bank)}`}>
                        {tx.bank}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[8px] font-pixel text-slate-400">
                      <span className="text-[#00ffff]">{formatDate(tx.date)}</span>
                      <span>•</span>
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <select
                            value={tempCategory}
                            onChange={(e) => setTempCategory(e.target.value as Category)}
                            className="bg-black border border-[#ffd700] text-[#ffd700] text-[7px] px-1 py-0.5 outline-none"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              onUpdateCategory(tx.id, tempCategory);
                              setEditingId(null);
                            }}
                            className="text-[#39ff14] hover:text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-[#ff3344] hover:text-white">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingId(tx.id);
                            setTempCategory(tx.category);
                          }}
                          className="text-[#ffcc00] hover:underline cursor-pointer flex items-center gap-1"
                          title="Clic para cambiar categoría"
                        >
                          {tx.category} <Edit3 className="w-2.5 h-2.5 opacity-60" />
                        </span>
                      )}
                      {tx.notes && (
                        <>
                          <span>•</span>
                          <span className="font-vt text-xs text-slate-400">{tx.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Amount & Delete Action */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 self-end sm:self-auto w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#222244]">
                  <div
                    className={`font-pixel text-[11px] sm:text-xs font-bold ${
                      isExpense ? 'text-[#ff3344] pixel-text-glow-red' : 'text-[#39ff14] pixel-text-glow-green'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {formatDOP(tx.amount, tx.currency)}
                  </div>

                  <button
                    onClick={() => onDelete(tx.id)}
                    className="text-slate-600 hover:text-[#ff3344] p-1 transition-colors"
                    title="Eliminar movimiento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
