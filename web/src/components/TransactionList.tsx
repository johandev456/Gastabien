import React, { useState } from 'react';
import { Transaction, BankCode, Category } from '../types';

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
  const [showAllTable, setShowAllTable] = useState(false);
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

  const getBankBadge = (bank: BankCode) => {
    switch (bank) {
      case 'PROMERICA':
        return {
          label: 'Promerica',
          className: 'bg-secondary-container/20 text-secondary'
        };
      case 'POPULAR':
        return {
          label: 'Popular',
          className: 'bg-primary-container/20 text-primary'
        };
      case 'BHD':
        return {
          label: 'BHD',
          className: 'bg-tertiary-container/20 text-tertiary'
        };
      case 'QIK':
        return {
          label: 'Qik Digital',
          className: 'bg-secondary-fixed/20 text-secondary-fixed'
        };
      default:
        return {
          label: bank,
          className: 'bg-surface-container-high text-on-surface-variant'
        };
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

  const previewList = transactions.slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/60 backdrop-blur-2xl p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.5)] border border-outline-variant/20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-container/40 to-transparent"></div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-headline-sm text-lg sm:text-xl text-on-surface font-bold">
            Últimas Transacciones Sincronizadas
          </h2>
          <p className="font-body-sm text-[13px] text-on-surface-variant">
            Lectura automatizada por push notifications & extractos RD
          </p>
        </div>
        <button
          onClick={() => setShowAllTable(!showAllTable)}
          type="button"
          className="inline-flex items-center gap-1.5 text-primary font-body-sm text-[13px] hover:underline font-semibold cursor-pointer"
        >
          <span>{showAllTable ? 'Mostrar Vista Resumida' : `Ver todas las ${transactions.length} transacciones`}</span>
          <span className="material-symbols-outlined text-[16px]">
            {showAllTable ? 'expand_less' : 'arrow_forward'}
          </span>
        </button>
      </div>

      {/* Quick 4-Grid Preview Cards (always shown or when table is not expanded) */}
      {!showAllTable && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {previewList.length === 0 ? (
            <div className="col-span-4 text-center py-8 text-on-surface-variant font-body-md">
              No hay movimientos registrados en este período.
            </div>
          ) : (
            previewList.map((tx) => {
              const badge = getBankBadge(tx.bank);
              const isIncome = tx.type === 'INCOME';
              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-xl bg-surface-container-high/40 hover:bg-surface-container-high/70 transition-all flex flex-col justify-between gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.2)] border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      {formatDate(tx.date)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-body-md text-[14px] text-on-surface font-semibold truncate" title={tx.merchant}>
                      {tx.merchant}
                    </h3>
                    <p className="font-label-sm text-[12px] text-on-surface-variant mt-0.5">
                      {tx.category}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10">
                    <span className="font-label-sm text-[11px] text-secondary font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      {isIncome ? 'Aplicado' : 'Validado'}
                    </span>
                    <span className={`font-mono-metric text-[14px] font-bold ${
                      isIncome ? 'text-secondary' : 'text-error'
                    }`}>
                      {isIncome ? '+' : '-'}{formatDOP(tx.amount, tx.currency)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Full Filterable Table (When expanded) */}
      {showAllTable && (
        <div className="mt-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
            {/* Search */}
            <div className="sm:col-span-6 relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por comercio o concepto..."
                className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl pl-9 pr-3 py-2 text-on-surface placeholder-on-surface-variant/60 font-body-sm text-[13px] outline-none focus:border-primary transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Category Select */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-on-surface font-body-sm text-[13px] outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Todas las Categorías</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Select */}
            <div className="sm:col-span-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-on-surface font-body-sm text-[13px] outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="EXPENSE">Gastos (Débitos)</option>
                <option value="INCOME">Ingresos (Créditos)</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-container-highest/40 text-on-surface-variant text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Banco</th>
                  <th className="py-3 px-4">Comercio / Descripción</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {filtered.map((tx) => {
                  const badge = getBankBadge(tx.bank);
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <tr key={tx.id} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="py-3 px-4 font-mono-metric text-[12px] text-on-surface-variant whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">{tx.merchant}</div>
                        {tx.notes && (
                          <div className="text-[11px] text-on-surface-variant">{tx.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {editingId === tx.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={tempCategory}
                              onChange={(e) => setTempCategory(e.target.value as Category)}
                              className="bg-surface-container-highest text-on-surface text-[12px] rounded-lg px-2 py-1 border border-outline-variant/40 outline-none"
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
                              className="p-1 rounded bg-secondary/20 text-secondary hover:bg-secondary/30"
                              title="Guardar"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                              title="Cancelar"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className="text-on-surface-variant">{tx.category}</span>
                            <button
                              onClick={() => {
                                setEditingId(tx.id);
                                setTempCategory(tx.category);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary-fixed transition-opacity p-0.5"
                              title="Cambiar categoría"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-mono-metric font-bold ${
                          isIncome ? 'text-secondary' : 'text-error'
                        }`}>
                          {isIncome ? '+' : '-'}{formatDOP(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onDelete(tx.id)}
                          className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                          title="Eliminar movimiento"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
