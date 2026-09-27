import React, { useState } from 'react';
import { BankCode, ReconciliationReport } from '../types';
import { ApiClient } from '../api/client';
import { X } from 'lucide-react';

interface StatementSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBank?: BankCode;
}

export const StatementSyncModal: React.FC<StatementSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultBank = 'PROMERICA'
}) => {
  const [bank, setBank] = useState<BankCode>(defaultBank === 'MANUAL' ? 'PROMERICA' : defaultBank);
  const [statementText, setStatementText] = useState('');
  const [autoImport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReconciliationReport | null>(null);

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementText.trim()) {
      setError('Por favor pega el texto o sube el archivo CSV de tu estado de cuenta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await ApiClient.syncStatement({
        text: statementText,
        bank,
        autoImport
      });

      if (res.success && res.report) {
        setReport(res.report);
        onSuccess();
      } else {
        setError(res.message || 'No se pudieron extraer movimientos válidos del texto.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conciliar estado de cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setStatementText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="retro-box w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#444477]">
          <div>
            <h2 className="font-pixel text-xs sm:text-sm text-[#ffd700] pixel-text-shadow">
              📜 [SINCRONIZAR ESTADO DE CUENTA]
            </h2>
            <p className="font-vt text-sm text-[#00ffff] mt-0.5">
              CONCILIACIÓN DE MOVIMIENTOS & NÓMINA (CSV / TEXTO OFICIAL)
            </p>
          </div>
          <button
            onClick={() => {
              setReport(null);
              setError(null);
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white border-2 border-transparent hover:border-[#ffd700]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 font-pixel text-[9px]">
          {error && (
            <div className="p-3 bg-[#2b0b14] border-2 border-[#ff3344] text-[#ff3344]">
              <span>⚠️ ERROR: {error}</span>
            </div>
          )}

          {/* Report View */}
          {report ? (
            <div className="space-y-4">
              <div className="p-4 bg-[#092015] border-2 border-[#39ff14]">
                <h3 className="text-[11px] font-bold text-[#39ff14] pixel-text-glow-green">
                  ✅ CONCILIACIÓN EXITOSA // STAGE CLEARED
                </h3>
                <p className="font-vt text-base text-slate-200 mt-1">
                  Se analizaron {report.totalStatementEntries} movimientos del estado de cuenta de {bank}.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
                  <div className="p-2 bg-black border border-[#39ff14]">
                    <p className="text-[#39ff14] text-[8px]">VERIFICADOS</p>
                    <p className="text-base font-bold text-white mt-0.5">{report.matchedCount}</p>
                  </div>
                  <div className="p-2 bg-black border border-[#00ffff]">
                    <p className="text-[#00ffff] text-[8px]">AGREGADOS</p>
                    <p className="text-base font-bold text-white mt-0.5">{report.addedCount}</p>
                  </div>
                  <div className="p-2 bg-black border border-[#ffd700]">
                    <p className="text-[#ffd700] text-[8px]">ACTUALIZADOS</p>
                    <p className="text-base font-bold text-white mt-0.5">{report.updatedCount}</p>
                  </div>
                  <div className="p-2 bg-black border border-[#ff3344]">
                    <p className="text-[#ff3344] text-[8px]">DESCARTADOS</p>
                    <p className="text-base font-bold text-white mt-0.5">{report.removedCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {report.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-black border-2 border-[#333366] flex items-center justify-between text-[8px]"
                  >
                    <div>
                      <p className="font-bold text-white">{item.entry.description}</p>
                      <p className="text-slate-400 font-vt text-xs mt-0.5">{item.entry.date} • {item.details}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${item.entry.type === 'INCOME' ? 'text-[#39ff14]' : 'text-white'}`}>
                        {item.entry.type === 'INCOME' ? '+' : '-'}RD$ {item.entry.amount.toFixed(2)}
                      </p>
                      <span className={`inline-block px-1.5 py-0.5 mt-0.5 border text-[7px] ${
                        item.status === 'REMOVED'
                          ? 'text-[#ff3344] border-[#ff3344]'
                          : item.status === 'ADDED'
                          ? 'text-[#00ffff] border-[#00ffff]'
                          : item.status === 'UPDATED'
                          ? 'text-[#ffd700] border-[#ffd700]'
                          : 'text-[#39ff14] border-[#39ff14]'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setStatementText('');
                  }}
                  className="pixel-btn pixel-btn-dark flex-1"
                >
                  OTRO ESTADO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setError(null);
                    onClose();
                  }}
                  className="pixel-btn pixel-btn-primary flex-1"
                >
                  CONTINUAR
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSync} className="space-y-4">
              {/* Bank Selector */}
              <div>
                <label className="block text-[#00ffff] mb-1.5">
                  1. SELECCIONA TU BANCO:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['PROMERICA', 'POPULAR', 'BHD', 'QIK'] as BankCode[]).map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBank(b)}
                      className={`p-2.5 border-2 text-[9px] font-bold text-center transition ${
                        bank === b
                          ? 'bg-[#183272] border-[#00ffff] text-[#00ffff] shadow-[2px_2px_0px_#ffd700]'
                          : 'bg-black border-[#3b3b77] text-slate-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload CSV or Paste */}
              <div>
                <label className="block text-[#00ffff] mb-1">
                  2. SUBE ARCHIVO CSV O PEGA EL TEXTO:
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full bg-black border-2 border-[#3b3b77] p-2 text-slate-300 font-pixel text-[8px] file:mr-3 file:py-1 file:px-2 file:border file:border-black file:bg-[#ffd700] file:text-black file:font-pixel file:text-[8px] cursor-pointer mb-2"
                />
                <textarea
                  rows={5}
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  placeholder="Pega aquí el contenido de tu estado de cuenta (ej. CSV con Fecha, Descripción, Débito, Crédito)..."
                  className="w-full bg-black border-2 border-[#3b3b77] focus:border-[#ffd700] p-3 text-slate-200 placeholder-slate-600 font-pixel text-[8px] outline-none shadow-[inset_2px_2px_0px_#000]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="pixel-btn pixel-btn-dark"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={loading || !statementText.trim()}
                  className={`pixel-btn pixel-btn-primary ${loading ? 'opacity-50' : ''}`}
                >
                  {loading ? 'PROCESANDO...' : '⚡ CONCILIAR ESTADO'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
