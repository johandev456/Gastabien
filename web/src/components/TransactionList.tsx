import React, { useState } from 'react';
import { Transaction, BankCode, Category } from '../types';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  ArrowDownLeft, 
  ArrowUpRight,
  CreditCard,
  Tag,
  Check,
  X
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
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getBankBadgeStyle = (bank: BankCode) => {
    switch (bank) {
      case 'POPULAR':
        return 'bg-blue-950 text-blue-300 border-blue-800/60';
      case 'BHD':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800/60';
      case 'PROMERICA':
        return 'bg-teal-950 text-teal-300 border-teal-800/60';
      case 'QIK':
        return 'bg-purple-950 text-purple-300 border-purple-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Filter transactions
  const filtered = transactions.filter(tx => {
    const matchesSearch = 
      tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.accountReference && tx.accountReference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBank = selectedBank === 'ALL' || tx.bank === selectedBank;
    const matchesCategory = selectedCategory === 'ALL' || tx.category === selectedCategory;
    const matchesType = selectedType === 'ALL' || tx.type === selectedType;

    return matchesSearch && matchesBank && matchesCategory && matchesType;
  });

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setTempCategory(tx.category);
  };

  const saveEdit = (id: string) => {
    onUpdateCategory(id, tempCategory);
    setEditingId(null);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Registro de Movimientos
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              {filtered.length} transacciones
            </span>
          </h3>
          <p className="text-xs text-slate-400">Extracción de correos y registros manuales</p>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por comercio (Total, Sirena, Netflix...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-800/80 text-xs">
        <span className="text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filtros:
        </span>

        {/* Bank Filter */}
        <select
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">Todos los Bancos</option>
          <option value="POPULAR">Banco Popular</option>
          <option value="BHD">Banco BHD</option>
          <option value="PROMERICA">Promerica</option>
          <option value="QIK">Qik Banco Digital</option>
          <option value="MANUAL">Manual</option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">Todas las Categorías</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">Todos los Tipos</option>
          <option value="EXPENSE">Gastos (-)</option>
          <option value="INCOME">Ingresos (+)</option>
        </select>

        {(selectedBank !== 'ALL' || selectedCategory !== 'ALL' || selectedType !== 'ALL' || searchTerm) && (
          <button
            onClick={() => {
              setSelectedBank('ALL');
              setSelectedCategory('ALL');
              setSelectedType('ALL');
              setSearchTerm('');
            }}
            className="text-slate-400 hover:text-rose-400 text-xs underline ml-auto"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Transactions Table / List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-slate-400 font-medium">No se encontraron transacciones con los filtros seleccionados.</p>
          <p className="text-xs text-slate-500 mt-1">Prueba sincronizar con Gmail o pulsar "Sincronizar" en la barra superior.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                <th className="pb-3 pl-2">Comercio & Detalle</th>
                <th className="pb-3">Banco / Cuenta</th>
                <th className="pb-3">Categoría</th>
                <th className="pb-3">Fecha</th>
                <th className="pb-3 text-right">Monto</th>
                <th className="pb-3 pr-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((tx) => {
                const isExpense = tx.type === 'EXPENSE';
                const isEditing = editingId === tx.id;

                return (
                  <tr key={tx.id} className="hover:bg-slate-900/60 transition-colors group">
                    
                    {/* Merchant & Type Icon */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${
                          isExpense ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {isExpense ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white tracking-tight">{tx.merchant}</p>
                          {tx.notes && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{tx.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Bank & Card info */}
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border w-fit ${getBankBadgeStyle(tx.bank)}`}>
                          {tx.bankName}
                        </span>
                        {tx.accountReference && (
                          <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> {tx.accountReference}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={tempCategory}
                            onChange={(e) => setTempCategory(e.target.value as Category)}
                            className="bg-slate-800 border border-emerald-500 text-white rounded px-2 py-1 text-xs focus:outline-none"
                          >
                            {CATEGORIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => saveEdit(tx.id)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-200 border border-slate-700">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {tx.category}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 text-xs text-slate-400">
                      {formatDate(tx.date)}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 text-right font-bold">
                      <span className={isExpense ? 'text-rose-400' : 'text-emerald-400'}>
                        {isExpense ? '-' : '+'} {formatDOP(tx.amount, tx.currency)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-all"
                            title="Cambiar categoría"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                          title="Eliminar transacción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
