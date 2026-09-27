import React, { useState } from 'react';
import { BankCode, ReconciliationReport } from '../types';
import { ApiClient } from '../api/client';

interface StatementSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBank?: BankCode;
}

const SAMPLE_PROMERICA_STATEMENT = `Fecha de Posteo,Fecha Efectiva,No. Secuencia, Código de Transacción,No. Referencia,Descripción,Retiros,Depósitos,Balance,
"15/09/2026","15/09/2026","1","58-27","15235149","PRIMERA QUINCENA DE SEPTIEMBRE 2026||",0.00,13325.80,13325.80,
"15/09/2026","15/09/2026","2","57-82","321181","COMPRA POS SM BRAVO LA ESPERILLA    SANTO DOMINGODO",222.00,0.00,13103.80,
"15/09/2026","15/09/2026","4","57-82","327391","COMPRA POS TOTALENERGIES 27 DE FEB  SANTO DOMINGODO",2000.00,0.00,11004.80,
"16/09/2026","16/09/2026","6","57-81","341437","RETIRO ATM BANCO RESERVAS R.D 010REPSTDOM     DR DO",2000.00,0.00,8756.80,
"17/09/2026","17/09/2026","9","57-53","15270158","PAGO CODETEL_PREPAGO 8297908159|40230916591|JOHAN ALEXANDER ROSARIO LOPEZ",230.00,0.00,7700.23,
"17/09/2026","17/09/2026","10","79-49","15270158","COBRO IMPUESTO CHEQUES Y TRANSF|40230916591|JOHAN ALEXANDER ROSARIO LOPEZ",0.46,0.00,7699.77,
"20/09/2026","20/09/2026","19","57-81","374497","RETIRO ATM BANCO BHD             SANTO DOMINGO   DO",1000.00,0.00,4289.77,
"25/09/2026","25/09/2026","27","57-82","410223","COMPRA POS COFFEE SHOP PUCMM S DG   SANTO DOMINGODO",146.44,0.00,1237.89,`;

export const StatementSyncModal: React.FC<StatementSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultBank = 'PROMERICA'
}) => {
  const [bank, setBank] = useState<BankCode>(defaultBank === 'MANUAL' ? 'PROMERICA' : defaultBank);
  const [statementText, setStatementText] = useState('');
  const [autoImport, setAutoImport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReconciliationReport | null>(null);

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementText.trim()) {
      setError('Por favor pega el texto o tabla de tu estado de cuenta.');
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

  const loadSample = () => {
    setStatementText(SAMPLE_PROMERICA_STATEMENT);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
              📑
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sincronizar Estado de Cuenta</h2>
              <p className="text-xs text-slate-400">Concilia y corrige movimientos de tu banco oficial (ATM, Nómina, etc.)</p>
            </div>
          </div>
          <button
            onClick={() => {
              setReport(null);
              setError(null);
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm flex items-center gap-3">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Report View */}
          {report ? (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <h3 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
                  ✅ Conciliación Exitosa
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Se analizaron {report.totalStatementEntries} movimientos del estado de cuenta de {bank}.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 text-center">
                    <p className="text-xs text-slate-400 font-medium">Verificados</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{report.matchedCount}</p>
                    <span className="text-[10px] text-slate-500">Coinciden con correo</span>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 text-center">
                    <p className="text-xs text-slate-400 font-medium">Agregados</p>
                    <p className="text-2xl font-black text-blue-400 mt-1">{report.addedCount}</p>
                    <span className="text-[10px] text-slate-500">No estaban en correo</span>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 text-center">
                    <p className="text-xs text-slate-400 font-medium">Actualizados</p>
                    <p className="text-2xl font-black text-amber-400 mt-1">{report.updatedCount}</p>
                    <span className="text-[10px] text-slate-500">Nombres corregidos</span>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 text-center">
                    <p className="text-xs text-slate-400 font-medium">Descartados</p>
                    <p className="text-2xl font-black text-rose-400 mt-1">{report.removedCount || 0}</p>
                    <span className="text-[10px] text-slate-500">Correos no en banco</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Detalle de Movimientos Procesados</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {report.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 border rounded-xl flex items-center justify-between text-xs transition ${
                        item.status === 'REMOVED'
                          ? 'bg-rose-950/20 border-rose-900/40 opacity-75'
                          : 'bg-slate-800/50 border-slate-700/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {item.status === 'REMOVED' ? '🗑️' : item.entry.type === 'INCOME' ? '💵' : item.entry.description.toLowerCase().includes('atm') || item.entry.description.toLowerCase().includes('cajero') ? '🏧' : '💳'}
                        </span>
                        <div>
                          <p className={`font-semibold ${item.status === 'REMOVED' ? 'text-rose-300 line-through' : 'text-white'}`}>
                            {item.entry.description}
                          </p>
                          <p className="text-slate-400 text-[11px]">{item.entry.date} • {item.details}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold ${
                          item.status === 'REMOVED'
                            ? 'text-rose-400 line-through'
                            : item.entry.type === 'INCOME'
                            ? 'text-emerald-400'
                            : 'text-slate-200'
                        }`}>
                          {item.entry.type === 'INCOME' ? '+' : '-'}RD$ {item.entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold ${
                          item.status === 'REMOVED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : item.status === 'ADDED' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : item.status === 'UPDATED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {item.status === 'REMOVED' ? '✕ DESCARTADO' : item.status === 'ADDED' ? '+ AGREGADO' : item.status === 'UPDATED' ? '🔄 ACTUALIZADO' : '✓ VERIFICADO'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setStatementText('');
                  }}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Sincronizar Otro Estado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setError(null);
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSync} className="space-y-5">
              {/* Bank Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  1. Selecciona tu Banco
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['PROMERICA', 'POPULAR', 'BHD', 'QIK'] as BankCode[]).map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBank(b)}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        bank === b
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/40'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">
                        {b === 'PROMERICA' ? '🟢' : b === 'POPULAR' ? '🔵' : b === 'BHD' ? '🟣' : '🟡'}
                      </span>
                      <span>{b === 'PROMERICA' ? 'Promerica' : b === 'POPULAR' ? 'Popular' : b === 'BHD' ? 'BHD' : 'Qik'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions & File Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    2. Pega los Movimientos o Sube tu Archivo
                  </label>
                  <button
                    type="button"
                    onClick={loadSample}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
                  >
                    Cargar Ejemplo
                  </button>
                </div>

                <textarea
                  rows={7}
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  placeholder={`Copia y pega la tabla de movimientos de tu banca en línea de ${bank} o archivo CSV:\n\nEjemplo:\n25/09/2026  TRANSACCION ATM SUCURSAL  RD$ 2,500.00\n22/09/2026  SUPERMERCADOS BRAVO       RD$ 3,420.50\n15/09/2026  ABONO DE NOMINA           RD$ 42,500.00`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono resize-none"
                />

                <div className="flex items-center justify-between mt-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 cursor-pointer transition">
                    <span>📎 Subir archivo (.csv o .txt)</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoImport}
                      onChange={(e) => setAutoImport(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                    />
                    <span>Importar transacciones faltantes</span>
                  </label>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 ¿Para qué sirve esta función?</p>
                <p>
                  Si recibiste retiros en cajero (ATM), nóminas o consumos que no enviaron notificación por correo, esta herramienta los detecta automáticamente, los concilia con tus balances y actualiza las categorías.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !statementText.trim()}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Analizando...</span>
                    </>
                  ) : (
                    <>
                      <span>📑 Conciliar y Sincronizar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
