import React, { useEffect, useMemo, useState } from 'react';
import { Transaction, BankCode, Category, TransactionType } from '../types';
import { Modal, fieldInput, fieldLabel, segmented, segmentedBtn, primaryBtn, secondaryBtn, dangerBtn } from './Modal';
import {
  ALL_CATEGORIES,
  DEFAULT_USD_RATE,
  amountInDop,
  drDayKey,
  formatDate,
  formatMoney,
  getCategoryColor,
  typeVisual
} from '../utils/format';

interface TransactionListProps {
  transactions: Transaction[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  onUpdateCategory: (id: string, newCategory: Category) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
  loading?: boolean;
  usdRate?: number;
}

const BANK_BADGES: Record<BankCode, { label: string; className: string }> = {
  PROMERICA: { label: 'Promerica', className: 'bg-secondary-container/20 text-secondary' },
  POPULAR: { label: 'Popular', className: 'bg-primary-container/20 text-primary' },
  BHD: { label: 'BHD', className: 'bg-banco-bhd/25 text-secondary-fixed-dim' },
  QIK: { label: 'Qik', className: 'bg-tertiary-container/20 text-tertiary' },
  MANUAL: { label: 'Manual', className: 'bg-surface-container-highest text-on-surface-variant' }
};
const bankBadge = (bank: BankCode) => BANK_BADGES[bank] || { label: bank, className: 'bg-surface-container-high text-on-surface-variant' };

/** Parses "1,500.50", "1500,50" or "1500.5" into a number. */
function parseAmountInput(value: string): number {
  const v = value.trim().replace(/\s/g, '');
  if (!v) return NaN;
  const lastSep = Math.max(v.lastIndexOf('.'), v.lastIndexOf(','));
  if (lastSep === -1) return parseFloat(v);
  const decimals = v.length - lastSep - 1;
  const normalized = decimals > 0 && decimals <= 2 ? v.slice(0, lastSep).replace(/[.,]/g, '') + '.' + v.slice(lastSep + 1) : v.replace(/[.,]/g, '');
  return parseFloat(normalized);
}

const AmountView: React.FC<{ tx: Transaction; usdRate: number; size?: 'sm' | 'md' }> = ({ tx, usdRate, size = 'md' }) => {
  const v = typeVisual(tx.type);
  return (
    <span className="flex flex-col items-end">
      <span className={`font-mono-metric font-bold tabular-nums whitespace-nowrap ${size === 'sm' ? 'text-[14px]' : 'text-[14px]'} ${v.className}`}>
        {v.sign}
        {formatMoney(tx.amount, tx.currency)}
      </span>
      {tx.currency === 'USD' && (
        <span className="text-[10px] text-on-surface-variant/80 font-medium tabular-nums whitespace-nowrap">≈ {formatMoney(amountInDop(tx, usdRate))}</span>
      )}
    </span>
  );
};

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  selectedCategory = null,
  onSelectCategory,
  onUpdateCategory,
  onUpdateTransaction,
  onDelete,
  onClearAll,
  loading = false,
  usdRate = DEFAULT_USD_RATE
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showAllTable, setShowAllTable] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCategory, setTempCategory] = useState<Category>('Otros Gastos');

  // Edit modal state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState<'DOP' | 'USD'>('DOP');
  const [editCategory, setEditCategory] = useState<Category>('Otros Gastos');
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Expand the table automatically when a category filter is applied elsewhere
  useEffect(() => {
    if (selectedCategory) setShowAllTable(true);
  }, [selectedCategory]);

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditMerchant(tx.merchant || '');
    // Plain decimal string (never "1.0E7" or "1500.0")
    setEditAmount(Number.isInteger(tx.amount) ? String(tx.amount) : tx.amount.toFixed(2));
    setEditCurrency(tx.currency || 'DOP');
    setEditCategory(tx.category || 'Otros Gastos');
    setEditType(tx.type || 'EXPENSE');
    setEditNotes(tx.notes || '');
    setEditDate(drDayKey(tx.date));
    setEditError(null);
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingTx) return;
    const num = parseAmountInput(editAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setEditError('Introduce un monto válido mayor a 0.');
      return;
    }
    if (!editMerchant.trim()) {
      setEditError('El comercio o concepto es obligatorio.');
      return;
    }
    if (onUpdateTransaction) {
      const updates: Partial<Transaction> = {
        merchant: editMerchant.trim(),
        amount: Math.round(num * 100) / 100,
        currency: editCurrency,
        category: editCategory,
        type: editType,
        // An empty string clears the notes on the server
        notes: editNotes.trim()
      };
      if (editDate && editDate !== drDayKey(editingTx.date)) {
        updates.date = editDate;
      }
      onUpdateTransaction(editingTx.id, updates);
    } else if (editCategory !== editingTx.category) {
      onUpdateCategory(editingTx.id, editCategory);
    }
    setEditingTx(null);
  };

  const handleDeleteFromModal = () => {
    if (!editingTx) return;
    const txId = editingTx.id;
    setEditingTx(null);
    onDelete(txId);
  };

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesSearch =
        !s ||
        tx.merchant.toLowerCase().includes(s) ||
        (tx.notes || '').toLowerCase().includes(s) ||
        (tx.description || '').toLowerCase().includes(s);
      const matchesCategory = !selectedCategory || tx.category === selectedCategory;
      const matchesType = selectedType === 'ALL' || tx.type === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [transactions, searchTerm, selectedCategory, selectedType]);

  const previewList = filtered.slice(0, 4);

  const actionButtons = (tx: Transaction, alwaysVisible = false) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleOpenEdit(tx)}
        type="button"
        className={`p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-all cursor-pointer ${alwaysVisible ? '' : 'opacity-80 group-hover:opacity-100'}`}
        aria-label={`Modificar ${tx.merchant}`}
        title="Modificar movimiento"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
      </button>
      <button
        onClick={() => onDelete(tx.id)}
        type="button"
        className={`p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all cursor-pointer ${alwaysVisible ? '' : 'opacity-80 group-hover:opacity-100'}`}
        aria-label={`Eliminar ${tx.merchant}`}
        title="Eliminar movimiento"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
      </button>
    </div>
  );

  const editRate = usdRate || DEFAULT_USD_RATE;
  const editNum = parseAmountInput(editAmount);

  return (
    <section
      id="transactions-section"
      className={`relative overflow-hidden rounded-2xl bg-surface-container-low/60 backdrop-blur-2xl p-4 sm:p-6 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.5)] border border-outline-variant/20 transition-opacity ${loading ? 'opacity-70' : ''}`}
      aria-busy={loading}
      aria-label="Transacciones"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-container/40 to-transparent"></div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-headline-sm text-lg sm:text-xl text-on-surface font-bold">Transacciones</h2>
            {selectedCategory && (
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-body-sm text-[12px] font-bold border border-primary/30 flex items-center gap-1.5 animate-fade-in max-w-full">
                <span className="truncate">Filtrando: {selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.(null)}
                  className="hover:text-on-surface cursor-pointer ml-1 text-sm leading-none"
                  aria-label="Quitar filtro de categoría"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <p className="font-body-sm text-[13px] text-on-surface-variant mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'} de avisos bancarios, estados de cuenta y registros manuales
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {transactions.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error-container/20 hover:bg-error-container/40 text-error font-body-sm text-[12px] font-semibold transition-all border border-error/30 cursor-pointer shadow-sm whitespace-nowrap"
              title="Borrar todas las transacciones registradas"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete_sweep</span>
              <span>Borrar Datos</span>
            </button>
          )}
          <button
            onClick={() => setShowAllTable(!showAllTable)}
            type="button"
            aria-expanded={showAllTable}
            className="inline-flex items-center gap-1.5 text-primary font-body-sm text-[13px] hover:underline font-semibold cursor-pointer whitespace-nowrap"
          >
            <span>{showAllTable ? 'Vista resumida' : `Ver todas (${filtered.length})`}</span>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{showAllTable ? 'expand_less' : 'arrow_forward'}</span>
          </button>
        </div>
      </div>

      {!showAllTable && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {previewList.length === 0 ? (
            <div className="col-span-full text-center py-8 text-on-surface-variant font-body-md bg-surface-container-high/20 rounded-xl">
              No hay movimientos registrados {selectedCategory ? `en la categoría "${selectedCategory}"` : 'en este período'}.
            </div>
          ) : (
            previewList.map((tx) => {
              const badge = bankBadge(tx.bank);
              return (
                <article
                  key={tx.id}
                  className="group p-4 rounded-xl bg-surface-container-high/40 hover:bg-surface-container-high/70 transition-all flex flex-col justify-between gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.2)] border border-outline-variant/15 min-w-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                    <time className="font-label-sm text-[11px] text-on-surface-variant whitespace-nowrap" dateTime={tx.date}>
                      {formatDate(tx.date)}
                    </time>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-body-md text-[14px] text-on-surface font-semibold truncate" title={tx.merchant}>
                      {tx.merchant}
                    </h3>
                    <p className="font-label-sm text-[12px] text-on-surface-variant mt-0.5 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(tx.category) }} aria-hidden="true"></span>
                      <span className="truncate">{tx.category}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/10">
                    <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">{typeVisual(tx.type).label}</span>
                    <div className="flex items-center gap-1.5">
                      <AmountView tx={tx} usdRate={usdRate} size="sm" />
                      {actionButtons(tx, true)}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {showAllTable && (
        <div className="mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
            <div className="sm:col-span-6 relative">
              <label htmlFor="tx-search" className="sr-only">Buscar movimientos</label>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" aria-hidden="true">
                search
              </span>
              <input
                id="tx-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por comercio o concepto..."
                className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl pl-9 pr-9 py-2 text-on-surface placeholder-on-surface-variant/60 font-body-sm text-[13px] outline-none focus:border-primary transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  type="button"
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                </button>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="tx-category" className="sr-only">Categoría</label>
              <select
                id="tx-category"
                value={selectedCategory || 'ALL'}
                onChange={(e) => onSelectCategory?.(e.target.value === 'ALL' ? null : e.target.value)}
                className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-on-surface font-body-sm text-[13px] outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Todas las categorías</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="tx-type" className="sr-only">Tipo</label>
              <select
                id="tx-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-on-surface font-body-sm text-[13px] outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="EXPENSE">Gastos (débitos)</option>
                <option value="INCOME">Ingresos (créditos)</option>
                <option value="TRANSFER">Transferencias</option>
              </select>
            </div>
          </div>

          {/* Phones: compact cards */}
          <ul className="md:hidden flex flex-col gap-2">
            {filtered.length === 0 ? (
              <li className="text-center py-10 text-on-surface-variant font-body-md">No se encontraron movimientos con los filtros seleccionados.</li>
            ) : (
              filtered.map((tx) => {
                const badge = bankBadge(tx.bank);
                return (
                  <li key={tx.id} className="p-3 rounded-xl bg-surface-container-high/30 border border-outline-variant/15 flex items-center gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13px] text-on-surface truncate" title={tx.merchant}>{tx.merchant}</p>
                      <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5 min-w-0 mt-0.5">
                        <span className={`px-1.5 rounded font-bold text-[10px] shrink-0 ${badge.className}`}>{badge.label}</span>
                        <span className="truncate">{tx.category}</span>
                        <span className="shrink-0">• {formatDate(tx.date)}</span>
                      </p>
                    </div>
                    <AmountView tx={tx} usdRate={usdRate} size="sm" />
                    {actionButtons(tx, true)}
                  </li>
                );
              })
            )}
          </ul>

          {/* Tablet / desktop: full table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-outline-variant/20 bg-surface-container-high/20">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-container-high/60 text-on-surface-variant font-label-md uppercase tracking-wider text-[11px] border-b border-outline-variant/20">
                <tr>
                  <th scope="col" className="py-3 px-4">Fecha</th>
                  <th scope="col" className="py-3 px-4">Banco</th>
                  <th scope="col" className="py-3 px-4">Comercio / Detalle</th>
                  <th scope="col" className="py-3 px-4">Categoría</th>
                  <th scope="col" className="py-3 px-4 text-right">Monto</th>
                  <th scope="col" className="py-3 px-4 text-center">Acciones</th>
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
                    const badge = bankBadge(tx.bank);
                    const isEditing = editingId === tx.id;
                    return (
                      <tr key={tx.id} className="hover:bg-surface-container-high/40 transition-colors group">
                        <td className="py-3 px-4 text-on-surface font-medium whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td className="py-3 px-4 max-w-[22rem]">
                          <div className="font-semibold text-on-surface truncate" title={tx.merchant}>{tx.merchant}</div>
                          {tx.notes && <div className="text-[11px] text-on-surface-variant truncate" title={tx.notes}>{tx.notes}</div>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <label htmlFor={`cat-${tx.id}`} className="sr-only">Nueva categoría</label>
                              <select
                                id={`cat-${tx.id}`}
                                value={tempCategory}
                                onChange={(e) => setTempCategory(e.target.value as Category)}
                                className="bg-surface-container-highest border border-primary text-on-surface text-[12px] rounded-lg px-2 py-1 outline-none cursor-pointer"
                              >
                                {ALL_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateCategory(tx.id, tempCategory);
                                  setEditingId(null);
                                }}
                                className="p-1 rounded bg-secondary text-on-secondary hover:opacity-90"
                                aria-label="Guardar categoría"
                              >
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded bg-surface-variant text-on-surface hover:opacity-90"
                                aria-label="Cancelar"
                              >
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(tx.id);
                                setTempCategory(tx.category);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface text-[12px] font-medium transition-colors border border-outline-variant/20 cursor-pointer"
                              aria-label={`Cambiar categoría (${tx.category})`}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(tx.category) }} aria-hidden="true"></span>
                              <span>{tx.category}</span>
                              <span className="material-symbols-outlined text-[12px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                                edit
                              </span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <AmountView tx={tx} usdRate={usdRate} />
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex justify-center">{actionButtons(tx)}</div>
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

      <Modal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="Editar movimiento"
        subtitle={editingTx ? `${editingTx.bankName || editingTx.bank} • ${formatDate(editingTx.date)}` : undefined}
        icon={
          <div className={`p-2.5 rounded-2xl border ${editType === 'INCOME' ? 'bg-secondary/15 text-secondary border-secondary/30' : editType === 'TRANSFER' ? 'bg-surface-container-high text-on-surface-variant border-outline-variant/30' : 'bg-error-container/20 text-error border-error/30'}`}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{typeVisual(editType).icon}</span>
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button type="button" onClick={handleDeleteFromModal} className={dangerBtn}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
              <span>Eliminar</span>
            </button>
            <div className="flex items-center gap-2.5 justify-end">
              <button type="button" onClick={() => setEditingTx(null)} className={secondaryBtn}>Cancelar</button>
              <button type="submit" form="edit-tx-form" className={primaryBtn}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check</span>
                <span>Guardar</span>
              </button>
            </div>
          </div>
        }
      >
        <form id="edit-tx-form" onSubmit={handleSaveEdit} className="space-y-4" noValidate>
          <div className={`${segmented} grid-cols-3`} role="group" aria-label="Tipo de movimiento">
            <button type="button" aria-pressed={editType === 'EXPENSE'} onClick={() => setEditType('EXPENSE')} className={segmentedBtn(editType === 'EXPENSE', 'bg-error-container text-on-error-container')}>
              Gasto
            </button>
            <button type="button" aria-pressed={editType === 'INCOME'} onClick={() => setEditType('INCOME')} className={segmentedBtn(editType === 'INCOME', 'bg-secondary-container text-on-secondary-container')}>
              Ingreso
            </button>
            <button type="button" aria-pressed={editType === 'TRANSFER'} onClick={() => setEditType('TRANSFER')} className={segmentedBtn(editType === 'TRANSFER', 'bg-surface-bright text-on-surface')}>
              Transferencia
            </button>
          </div>

          <div>
            <label htmlFor="edit-merchant" className={fieldLabel}>Comercio / Concepto</label>
            <input
              id="edit-merchant"
              type="text"
              required
              value={editMerchant}
              onChange={(e) => setEditMerchant(e.target.value)}
              placeholder="Ej. Supermercados Bravo, Shell, Nómina..."
              className={fieldInput}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <span className={fieldLabel} id="edit-currency-label">Moneda</span>
              <div className={`${segmented} grid-cols-2`} role="group" aria-labelledby="edit-currency-label">
                {(['DOP', 'USD'] as const).map(c => (
                  <button key={c} type="button" aria-pressed={editCurrency === c} onClick={() => setEditCurrency(c)} className={segmentedBtn(editCurrency === c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-8">
              <label htmlFor="edit-amount" className={fieldLabel}>Monto ({editCurrency})</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant text-sm" aria-hidden="true">
                  {editCurrency === 'USD' ? 'US$' : 'RD$'}
                </span>
                <input
                  id="edit-amount"
                  type="text"
                  inputMode="decimal"
                  required
                  autoFocus
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${fieldInput} pl-12 font-bold tabular-nums`}
                />
              </div>
            </div>
          </div>

          {editCurrency === 'USD' && (
            <div className="px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/25 text-secondary text-xs flex items-center justify-between gap-2">
              <span>Equivalente en DOP (tasa {editRate.toFixed(2)}):</span>
              <strong className="text-sm tabular-nums">{formatMoney((Number.isFinite(editNum) ? editNum : 0) * editRate)}</strong>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-category" className={fieldLabel}>Categoría</label>
              <select id="edit-category" value={editCategory} onChange={(e) => setEditCategory(e.target.value as Category)} className={`${fieldInput} cursor-pointer`}>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-date" className={fieldLabel}>Fecha</label>
              <input id="edit-date" type="date" value={editDate} max={drDayKey()} onChange={(e) => setEditDate(e.target.value)} className={fieldInput} />
            </div>
          </div>

          <div>
            <label htmlFor="edit-notes" className={fieldLabel}>Notas / Referencia (opcional)</label>
            <input
              id="edit-notes"
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Ej. Ref 152341, Factura 004..."
              className={fieldInput}
            />
          </div>

          {editError && (
            <p role="alert" className="text-xs font-semibold text-error bg-error-container/20 border border-error/30 rounded-xl px-3 py-2">
              {editError}
            </p>
          )}
        </form>
      </Modal>
    </section>
  );
};
