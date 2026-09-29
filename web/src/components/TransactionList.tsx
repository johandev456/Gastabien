import React, { useState, useEffect } from 'react';
import { Transaction, BankCode, Category } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  onUpdateCategory: (id: string, newCategory: Category) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
  loading?: boolean;
}

const CATEGORIES: Category[] = [
  'Combustible',
  'Supermercados',
  'Restaurantes y Comida',
  'Bares y Vida Nocturna',
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
  selectedCategory = null,
  onSelectCategory,
  onUpdateCategory,
  onUpdateTransaction,
  onDelete,
  onClearAll,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalCategory, setInternalCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showAllTable, setShowAllTable] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCategory, setTempCategory] = useState<Category>('Otros Gastos');

  // Edit Amount Modal State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>('');
  const [editCurrencyValue, setEditCurrencyValue] = useState<'DOP' | 'USD'>('DOP');
  const [editCategoryValue, setEditCategoryValue] = useState<Category>('Otros Gastos');

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmountValue(tx.amount.toString());
    setEditCurrencyValue(tx.currency || 'DOP');
    setEditCategoryValue(tx.category || 'Otros Gastos');
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingTx) return;
    const num = parseFloat(editAmountValue);
    if (isNaN(num) || num <= 0) {
      alert('Por favor introduce un monto válido mayor a 0');
      return;
    }
    if (onUpdateTransaction) {
      onUpdateTransaction(editingTx.id, {
        amount: num,
        currency: editCurrencyValue,
        category: editCategoryValue
      });
    } else if (onUpdateCategory && editCategoryValue !== editingTx.category) {
      onUpdateCategory(editingTx.id, editCategoryValue);
    }
    setEditingTx(null);
  };

  // Sync internal category with external prop
  useEffect(() => {
    if (selectedCategory) {
      setInternalCategory(selectedCategory);
      setShowAllTable(true); // Auto expand table when filtered to see all transactions
    } else {
      setInternalCategory('ALL');
    }
  }, [selectedCategory]);

  const handleCategoryChange = (cat: string) => {
    setInternalCategory(cat);
    onSelectCategory?.(cat === 'ALL' ? null : cat);
  };

  const formatAmount = (amount: number, currency: 'DOP' | 'USD' = 'DOP') => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getDopEquivalent = (amount: number, currency: 'DOP' | 'USD' = 'DOP', amountInDop?: number) => {
    if (currency !== 'USD') return null;
    const dopVal = amountInDop ?? (amount * 60.0);
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(dopVal);
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
    const effectiveCategory = selectedCategory || internalCategory;
    const matchesCategory = effectiveCategory === 'ALL' || tx.category === effectiveCategory;
    const matchesType = selectedType === 'ALL' || tx.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const previewList = filtered.slice(0, 4);

  return (
    <div id="transactions-section" className="relative overflow-hidden rounded-2xl bg-surface-container-low/60 backdrop-blur-2xl p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.5)] border border-outline-variant/20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-container/40 to-transparent"></div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-headline-sm text-lg sm:text-xl text-on-surface font-bold">
              Transacciones Sincronizadas
            </h2>
            {selectedCategory && (
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-body-sm text-[12px] font-bold border border-primary/30 flex items-center gap-1.5 animate-fade-in">
                <span>Filtrando: {selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.(null)}
                  className="hover:text-white cursor-pointer ml-1 text-sm leading-none"
                  title="Quitar filtro"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <p className="font-body-sm text-[13px] text-on-surface-variant mt-0.5">
            {filtered.length} movimientos verificados con avisos bancarios y extractos oficiales
          </p>
        </div>
        <div className="flex items-center gap-3">
          {transactions.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error-container/20 hover:bg-error-container/40 text-error font-body-sm text-[12px] font-semibold transition-all border border-error/30 cursor-pointer shadow-sm"
              title="Borrar todas las transacciones registradas"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>Borrar Datos</span>
            </button>
          )}
          <button
            onClick={() => setShowAllTable(!showAllTable)}
            type="button"
            className="inline-flex items-center gap-1.5 text-primary font-body-sm text-[13px] hover:underline font-semibold cursor-pointer"
          >
            <span>{showAllTable ? 'Vista Resumida' : `Ver todas (${filtered.length})`}</span>
            <span className="material-symbols-outlined text-[16px]">
              {showAllTable ? 'expand_less' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </div>

      {/* Quick 4-Grid Preview Cards (when table is not expanded) */}
      {!showAllTable && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {previewList.length === 0 ? (
            <div className="col-span-4 text-center py-8 text-on-surface-variant font-body-md bg-surface-container-high/20 rounded-xl">
              No hay movimientos registrados {selectedCategory ? `en la categoría "${selectedCategory}"` : 'en este período'}.
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
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className={`font-mono-metric text-[14px] font-bold ${
                          isIncome ? 'text-secondary' : 'text-error'
                        }`}>
                          {isIncome ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                        </span>
                        {tx.currency === 'USD' && (
                          <span className="text-[10px] font-mono text-on-surface-variant/80 font-medium">
                            ≈ {getDopEquivalent(tx.amount, tx.currency, tx.amountInDop)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleOpenEdit(tx)}
                        className="p-1 rounded-lg text-on-surface-variant/70 hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                        title="Modificar monto"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Full Filterable Table (When expanded) */}
      {showAllTable && (
        <div className="mt-2">
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
                value={selectedCategory || internalCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
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
          <div className="overflow-x-auto rounded-xl border border-outline-variant/20 bg-surface-container-high/20">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-container-high/60 text-on-surface-variant font-label-md uppercase tracking-wider text-[11px] border-b border-outline-variant/20">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Banco</th>
                  <th className="py-3 px-4">Comercio / Detalle</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-on-surface-variant font-body-md">
                      No se encontraron movimientos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => {
                    const badge = getBankBadge(tx.bank);
                    const isExpense = tx.type === 'EXPENSE';
                    const isEditing = editingId === tx.id;

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-surface-container-high/40 transition-colors group"
                      >
                        {/* Date */}
                        <td className="py-3 px-4 text-on-surface font-medium whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>

                        {/* Bank */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Merchant */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-on-surface">{tx.merchant}</div>
                          {tx.notes && (
                            <div className="text-[11px] text-on-surface-variant font-mono">
                              {tx.notes}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={tempCategory}
                                onChange={(e) => setTempCategory(e.target.value as Category)}
                                className="bg-surface-container-highest border border-primary text-on-surface text-[12px] rounded-lg px-2 py-1 outline-none cursor-pointer"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  onUpdateCategory(tx.id, tempCategory);
                                  setEditingId(null);
                                }}
                                className="p-1 rounded bg-secondary text-on-secondary hover:opacity-90"
                                title="Guardar"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded bg-surface-variant text-on-surface hover:opacity-90"
                                title="Cancelar"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(tx.id);
                                setTempCategory(tx.category);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface text-[12px] font-medium transition-colors border border-outline-variant/20 cursor-pointer"
                            >
                              <span>{tx.category}</span>
                              <span className="material-symbols-outlined text-[12px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                                edit
                              </span>
                            </button>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span
                              className={`font-mono-metric font-bold text-[14px] ${
                                isExpense ? 'text-error' : 'text-secondary'
                              }`}
                            >
                              {isExpense ? '-' : '+'}{formatAmount(tx.amount, tx.currency)}
                            </span>
                            {tx.currency === 'USD' && (
                              <span className="text-[11px] font-mono text-on-surface-variant/80 font-medium">
                                ≈ {getDopEquivalent(tx.amount, tx.currency, tx.amountInDop)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                              title="Modificar monto"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => onDelete(tx.id)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                              title="Eliminar movimiento"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Amount & Currency Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </div>
                <div>
                  <h3 className="font-title-md text-on-surface font-semibold text-[16px]">
                    Modificar Transacción
                  </h3>
                  <p className="font-label-sm text-on-surface-variant text-[12px]">
                    {editingTx.merchant} • {formatDate(editingTx.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              {/* Currency Toggle */}
              <div>
                <label className="block font-label-md text-on-surface-variant text-[12px] font-medium mb-1.5">
                  Moneda
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-highest rounded-xl border border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setEditCurrencyValue('DOP')}
                    className={`py-2 rounded-lg text-[13px] font-semibold transition-all ${
                      editCurrencyValue === 'DOP'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    DOP (RD$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCurrencyValue('USD')}
                    className={`py-2 rounded-lg text-[13px] font-semibold transition-all ${
                      editCurrencyValue === 'USD'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    USD ($)
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block font-label-md text-on-surface-variant text-[12px] font-medium mb-1.5">
                  Monto ({editCurrencyValue})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono-metric font-bold text-on-surface-variant text-[16px]">
                    {editCurrencyValue === 'USD' ? '$' : 'RD$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    value={editAmountValue}
                    onChange={(e) => setEditAmountValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl pl-14 pr-4 py-3 text-on-surface font-mono-metric font-bold text-[18px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                {editCurrencyValue === 'USD' && (
                  <p className="mt-1.5 font-label-sm text-[12px] text-secondary font-medium">
                    ≈ RD$ {new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2 }).format((parseFloat(editAmountValue) || 0) * 60.0)} DOP (Tasa estimada 60.00)
                  </p>
                )}
              </div>

              {/* Category selector */}
              <div>
                <label className="block font-label-md text-on-surface-variant text-[12px] font-medium mb-1.5">
                  Categoría
                </label>
                <select
                  value={editCategoryValue}
                  onChange={(e) => setEditCategoryValue(e.target.value as Category)}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-on-surface font-body-sm text-[13px] outline-none focus:border-primary cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/15 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface font-label-md text-[13px] font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-[13px] font-bold shadow-lg hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
