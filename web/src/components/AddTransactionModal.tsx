import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="retro-box w-full max-w-md p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#444477]">
          <div>
            <h3 className="font-pixel text-xs sm:text-sm text-[#ffd700] pixel-text-shadow">
              {type === 'INCOME' ? '★ [NUEVO INGRESO / LOOT]' : '▼ [NUEVO GASTO / HIT]'}
            </h3>
            <p className="font-vt text-sm text-[#00ffff] mt-0.5">
              {type === 'INCOME' ? 'Suma directa a tu balance general' : 'Salida de dinero manual'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white border-2 border-transparent hover:border-[#ffd700]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 font-pixel text-[9px]">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-black border-2 border-[#3b3b77]">
            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                if (category === 'Ingresos y Nómina') setCategory('Supermercados');
              }}
              className={`py-2 text-[9px] font-bold transition-all flex items-center justify-center gap-1 border ${
                type === 'EXPENSE'
                  ? 'bg-[#ff3344] text-black border-black shadow-[2px_2px_0px_#000]'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <span>▼ GASTO (-)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('INCOME');
                setCategory('Ingresos y Nómina');
                if (!merchant) setMerchant('Nómina Quincenal');
              }}
              className={`py-2 text-[9px] font-bold transition-all flex items-center justify-center gap-1 border ${
                type === 'INCOME'
                  ? 'bg-[#39ff14] text-black border-black shadow-[2px_2px_0px_#000]'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <span>▲ INGRESO (+)</span>
            </button>
          </div>

          {/* Quick Payday Shortcuts for Income */}
          {type === 'INCOME' && (
            <div className="p-2 bg-black border-2 border-[#ffcc00] space-y-1">
              <span className="text-[8px] text-[#ffcc00]">★ PRESETS DE NÓMINA RD:</span>
              <div className="flex flex-wrap gap-1.5 font-pixel text-[8px]">
                <button
                  type="button"
                  onClick={() => setIncomePreset('Nómina Quincenal (Día 15)')}
                  className="px-2 py-1 bg-[#222255] hover:bg-[#333377] text-[#39ff14] border border-[#39ff14]"
                >
                  DÍA 15
                </button>
                <button
                  type="button"
                  onClick={() => setIncomePreset('Nómina Quincenal (Día 30)')}
                  className="px-2 py-1 bg-[#222255] hover:bg-[#333377] text-[#39ff14] border border-[#39ff14]"
                >
                  DÍA 30
                </button>
                <button
                  type="button"
                  onClick={() => setIncomePreset('Transferencia Recibida')}
                  className="px-2 py-1 bg-[#222255] hover:bg-[#333377] text-[#00ffff] border border-[#00ffff]"
                >
                  TRANSFERENCIA
                </button>
              </div>
            </div>
          )}

          {/* Merchant / Concept */}
          <div>
            <label className="block text-[#00ffff] mb-1">
              {type === 'INCOME' ? 'CONCEPTO / ORIGEN:' : 'COMERCIO / CONCEPTO:'}
            </label>
            <input
              type="text"
              required
              placeholder={type === 'INCOME' ? 'Ej. Nómina Quincenal...' : 'Ej. Supermercado Bravo...'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#ffd700] px-3 py-2 text-white placeholder-slate-600 font-pixel text-[9px] outline-none"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[#00ffff] mb-1">MONTO (RD$):</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#39ff14] px-3 py-2 text-[#39ff14] placeholder-slate-600 font-pixel text-[11px] outline-none"
            />
          </div>

          {/* Bank selector */}
          <div>
            <label className="block text-[#00ffff] mb-1">BANCO / CUENTA:</label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value as BankCode)}
              className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#ffd700] px-3 py-2 text-[#ffcc00] font-pixel text-[9px] outline-none"
            >
              <option value="PROMERICA">BANCO PROMERICA</option>
              <option value="POPULAR">BANCO POPULAR</option>
              <option value="BHD">BANCO BHD</option>
              <option value="QIK">QIK BANCO DIGITAL</option>
              <option value="MANUAL">OTRO / EFECTIVO</option>
            </select>
          </div>

          {/* Category selector (for Expense) */}
          {type === 'EXPENSE' && (
            <div>
              <label className="block text-[#00ffff] mb-1">CATEGORÍA:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#ffd700] px-3 py-2 text-white font-pixel text-[8px] outline-none"
              >
                {CATEGORIES.filter((c) => c !== 'Ingresos y Nómina').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-400 mb-1">NOTAS / REFERENCIA (OPCIONAL):</label>
            <input
              type="text"
              placeholder="Ej. Quincena de septiembre, combustible..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-black border-2 border-[#3b3b77] px-3 py-2 text-slate-300 placeholder-slate-600 font-pixel text-[8px] outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="pixel-btn pixel-btn-dark"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className={type === 'INCOME' ? 'pixel-btn pixel-btn-primary' : 'pixel-btn pixel-btn-coin'}
            >
              {type === 'INCOME' ? '+ GUARDAR INGRESO' : '▼ GUARDAR GASTO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
