import React, { useState, useEffect } from 'react';
import { X, PlusCircle, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { BankCode, Category } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  initialType?: 'EXPENSE' | 'INCOME';
  onClose: () => void;
  onSubmit: (data: {
    merchant: string;
    amount: number;
    category?: Category;
    bank?: BankCode;
    bankName?: string;
    type?: 'EXPENSE' | 'INCOME';
    notes?: string;
  }) => void;
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

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  initialType = 'EXPENSE',
  onClose,
  onSubmit
}) => {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Supermercados');
  const [bank, setBank] = useState<BankCode>('PROMERICA');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      if (initialType === 'INCOME') {
        setCategory('Ingresos y Nómina');
        setMerchant('Nómina Quincenal');
      } else {
        setCategory('Supermercados');
        setMerchant('');
      }
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !amount) return;

    const bankNames: Record<BankCode, string> = {
      POPULAR: 'Banco Popular',
      BHD: 'Banco BHD',
      PROMERICA: 'Banco Promerica',
      QIK: 'Qik Banco Digital',
      MANUAL: 'Registro Manual / Efectivo'
    };

    onSubmit({
      merchant,
      amount: parseFloat(amount),
      category: type === 'INCOME' ? 'Ingresos y Nómina' : category,
      bank,
      bankName: bankNames[bank],
      type,
      notes
    });

    // Reset and close
    setMerchant('');
    setAmount('');
    setNotes('');
    onClose();
  };

  const setIncomePreset = (concept: string, defaultBank: BankCode = 'PROMERICA') => {
    setType('INCOME');
    setMerchant(concept);
    setCategory('Ingresos y Nómina');
    setBank(defaultBank);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {type === 'INCOME' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {type === 'INCOME' ? 'Registrar Ingreso / Nómina' : 'Registrar Gasto Manual'}
              </h3>
              <p className="text-xs text-slate-400">
                {type === 'INCOME' ? 'Suma directa a tu balance neto' : 'Salida de dinero manual'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                if (category === 'Ingresos y Nómina') setCategory('Supermercados');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Gasto (-)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('INCOME');
                setCategory('Ingresos y Nómina');
                if (!merchant) setMerchant('Nómina Quincenal');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Ingreso (+)</span>
            </button>
          </div>

          {/* Quick Payday Shortcuts for Income */}
          {type === 'INCOME' && (
            <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Accesos rápidos de nómina:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setIncomePreset('Nómina Quincenal (Día 15)')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[11px] font-semibold border border-emerald-700/50 transition-all"
                >
                  Día 15 (Quincena)
                </button>
                <button
                  type="button"
                  onClick={() => setIncomePreset('Nómina Quincenal (Día 30)')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[11px] font-semibold border border-emerald-700/50 transition-all"
                >
                  Día 30 (Fin de Mes)
                </button>
                <button
                  type="button"
                  onClick={() => setIncomePreset('Transferencia Recibida')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-all"
                >
                  Transferencia
                </button>
              </div>
            </div>
          )}

          {/* Merchant / Concept */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {type === 'INCOME' ? 'Concepto del Ingreso' : 'Comercio / Descripción'}
            </label>
            <input
              type="text"
              required
              placeholder={type === 'INCOME' ? 'Ej. Nómina Quincenal Promerica, Sueldo...' : 'Ej. Sirena Churchill, Texaco...'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Monto (RD$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono text-base"
            />
          </div>

          {/* Category & Bank Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <select
                value={category}
                disabled={type === 'INCOME'}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-75"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Banco / Cuenta
              </label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value as BankCode)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="PROMERICA">Banco Promerica</option>
                <option value="POPULAR">Banco Popular</option>
                <option value="BHD">Banco BHD</option>
                <option value="QIK">Qik Banco Digital</option>
                <option value="MANUAL">Efectivo / Manual</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Notas adicionales (opcional)
            </label>
            <input
              type="text"
              placeholder="Nota personal o detalle del depósito"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg active:scale-95 transition-all ${
                type === 'INCOME'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/40'
              }`}
            >
              {type === 'INCOME' ? 'Guardar Ingreso' : 'Guardar Gasto'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
