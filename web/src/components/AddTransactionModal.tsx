import React, { useEffect, useState } from 'react';
import { BankCode, Category, CreateTransactionInput } from '../types';
import { Modal, fieldInput, fieldLabel, segmented, segmentedBtn, primaryBtn, secondaryBtn } from './Modal';
import { ALL_CATEGORIES, DEFAULT_USD_RATE, drDayKey, formatMoney } from '../utils/format';

interface AddTransactionModalProps {
  isOpen: boolean;
  initialType?: 'EXPENSE' | 'INCOME';
  onClose: () => void;
  /** Resolves true when saved (the modal then closes and resets). */
  onSubmit: (data: CreateTransactionInput) => Promise<boolean> | boolean | void;
  usdRate?: number;
}

const BANK_NAMES: Record<BankCode, string> = {
  POPULAR: 'Banco Popular Dominicano',
  BHD: 'Banco BHD',
  PROMERICA: 'Banco Promerica',
  QIK: 'Qik Banco Digital',
  MANUAL: 'Registro Manual / Efectivo'
};

const EXPENSE_CATEGORIES = ALL_CATEGORIES.filter(c => c !== 'Ingresos y Nómina');

function parseAmountInput(value: string): number {
  const v = value.trim().replace(/\s/g, '');
  if (!v) return NaN;
  const lastSep = Math.max(v.lastIndexOf('.'), v.lastIndexOf(','));
  if (lastSep === -1) return parseFloat(v);
  const decimals = v.length - lastSep - 1;
  const normalized = decimals > 0 && decimals <= 2 ? v.slice(0, lastSep).replace(/[.,]/g, '') + '.' + v.slice(lastSep + 1) : v.replace(/[.,]/g, '');
  return parseFloat(normalized);
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  initialType = 'EXPENSE',
  onClose,
  onSubmit,
  usdRate = DEFAULT_USD_RATE
}) => {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'DOP' | 'USD'>('DOP');
  const [category, setCategory] = useState<Category>('Supermercados');
  const [bank, setBank] = useState<BankCode>('MANUAL');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(drDayKey());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType(initialType);
    setAmount('');
    setCurrency('DOP');
    setNotes('');
    setDate(drDayKey());
    setError(null);
    setSaving(false);
    if (initialType === 'INCOME') {
      setCategory('Ingresos y Nómina');
      setMerchant('Nómina Quincenal');
    } else {
      setCategory('Supermercados');
      setMerchant('');
    }
  }, [isOpen, initialType]);

  const switchType = (next: 'EXPENSE' | 'INCOME') => {
    setType(next);
    if (next === 'INCOME') {
      setCategory('Ingresos y Nómina');
      if (!merchant) setMerchant('Nómina Quincenal');
    } else if (category === 'Ingresos y Nómina') {
      setCategory('Supermercados');
    }
  };

  const setIncomePreset = (concept: string) => {
    setType('INCOME');
    setMerchant(concept);
    setCategory('Ingresos y Nómina');
  };

  const numAmount = parseAmountInput(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim()) {
      setError('Escribe el comercio o concepto.');
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Introduce un monto válido mayor a 0 (ej. 1,500.00).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const ok = await onSubmit({
        merchant: merchant.trim(),
        amount: Math.round(numAmount * 100) / 100,
        currency,
        category: type === 'INCOME' ? 'Ingresos y Nómina' : category,
        bank,
        bankName: BANK_NAMES[bank],
        type,
        date,
        notes: notes.trim() || undefined
      });
      if (ok !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  const isIncome = type === 'INCOME';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      locked={saving}
      maxWidth="max-w-md"
      title={isIncome ? 'Registrar ingreso / nómina' : 'Registrar gasto manual'}
      subtitle={isIncome ? 'Suma directa a tu balance neto' : 'Salida de dinero manual'}
      icon={
        <div className={`p-2 rounded-xl ${isIncome ? 'bg-secondary/15 text-secondary' : 'bg-error-container/20 text-error'}`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{isIncome ? 'trending_up' : 'trending_down'}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} className={secondaryBtn} disabled={saving}>Cancelar</button>
          <button type="submit" form="add-tx-form" className={primaryBtn} disabled={saving}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{saving ? 'progress_activity' : 'add_circle'}</span>
            <span>{saving ? 'Guardando…' : isIncome ? 'Registrar ingreso' : 'Registrar gasto'}</span>
          </button>
        </div>
      }
    >
      <form id="add-tx-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className={`${segmented} grid-cols-2`} role="group" aria-label="Tipo de movimiento">
          <button type="button" aria-pressed={!isIncome} onClick={() => switchType('EXPENSE')} className={segmentedBtn(!isIncome, 'bg-error-container text-on-error-container')}>
            Gasto (−)
          </button>
          <button type="button" aria-pressed={isIncome} onClick={() => switchType('INCOME')} className={segmentedBtn(isIncome, 'bg-secondary-container text-on-secondary-container')}>
            Ingreso (+)
          </button>
        </div>

        {isIncome && (
          <div className="p-2.5 rounded-2xl bg-secondary/10 border border-secondary/25 space-y-1.5">
            <span className="text-[11px] font-bold text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">auto_awesome</span> Accesos rápidos de nómina
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['Nómina Quincenal (Día 15)', 'Nómina Quincenal (Día 30)', 'Transferencia Recibida'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setIncomePreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface text-[11px] font-semibold border border-outline-variant/30 transition-all"
                >
                  {p.replace('Nómina Quincenal ', '')}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="add-merchant" className={fieldLabel}>{isIncome ? 'Concepto del ingreso' : 'Comercio / Descripción'}</label>
          <input
            id="add-merchant"
            type="text"
            required
            autoFocus
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder={isIncome ? 'Ej. Nómina, Honorarios, Transferencia...' : 'Ej. Supermercado Bravo, Shell, Colmado...'}
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <span className={fieldLabel} id="add-currency-label">Moneda</span>
            <div className={`${segmented} grid-cols-2`} role="group" aria-labelledby="add-currency-label">
              {(['DOP', 'USD'] as const).map(c => (
                <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={segmentedBtn(currency === c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-8">
            <label htmlFor="add-amount" className={fieldLabel}>Monto ({currency})</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant text-sm" aria-hidden="true">
                {currency === 'USD' ? 'US$' : 'RD$'}
              </span>
              <input
                id="add-amount"
                type="text"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`${fieldInput} pl-12 font-bold tabular-nums`}
              />
            </div>
          </div>
        </div>

        {currency === 'USD' && (
          <div className="px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/25 text-secondary text-xs flex items-center justify-between gap-2">
            <span>Equivalente en DOP (tasa {usdRate.toFixed(2)}):</span>
            <strong className="text-sm tabular-nums">{formatMoney((Number.isFinite(numAmount) ? numAmount : 0) * usdRate)}</strong>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!isIncome && (
            <div>
              <label htmlFor="add-category" className={fieldLabel}>Categoría</label>
              <select id="add-category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className={`${fieldInput} cursor-pointer`}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div className={isIncome ? 'sm:col-span-2' : ''}>
            <label htmlFor="add-bank" className={fieldLabel}>Banco / Origen</label>
            <select id="add-bank" value={bank} onChange={(e) => setBank(e.target.value as BankCode)} className={`${fieldInput} cursor-pointer`}>
              <option value="MANUAL">Efectivo / Manual</option>
              <option value="PROMERICA">Banco Promerica</option>
              <option value="POPULAR">Banco Popular</option>
              <option value="BHD">Banco BHD</option>
              <option value="QIK">Qik Banco Digital</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-date" className={fieldLabel}>Fecha</label>
            <input id="add-date" type="date" value={date} max={drDayKey()} onChange={(e) => setDate(e.target.value)} className={fieldInput} />
          </div>
          <div>
            <label htmlFor="add-notes" className={fieldLabel}>Notas (opcional)</label>
            <input id="add-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ref, factura, detalle..." className={fieldInput} />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-error bg-error-container/20 border border-error/30 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};
