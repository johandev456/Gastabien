import React, { useState } from 'react';
import { BankCode, ReconciliationReport } from '../types';
import { ApiClient } from '../api/client';
import { Modal, fieldInput, fieldLabel, primaryBtn, secondaryBtn } from './Modal';
import { formatDate, formatMoney, typeVisual } from '../utils/format';

interface StatementSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBank?: BankCode;
}

const BANK_OPTIONS: { code: BankCode; label: string; dot: string }[] = [
  { code: 'PROMERICA', label: 'Promerica', dot: 'bg-banco-promerica' },
  { code: 'POPULAR', label: 'Popular', dot: 'bg-primary-container' },
  { code: 'BHD', label: 'BHD', dot: 'bg-banco-bhd' },
  { code: 'QIK', label: 'Qik', dot: 'bg-tertiary-container' }
];

const MAX_FILE_BYTES = 4 * 1024 * 1024;

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
  const [reportWasPreview, setReportWasPreview] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const close = () => {
    if (loading) return;
    setReport(null);
    setError(null);
    onClose();
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementText.trim()) {
      setError('Pega el texto o tabla de tu estado de cuenta, o sube un archivo CSV.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.syncStatement({ text: statementText, bank, autoImport });
      if (res.success && res.report) {
        setReport(res.report);
        setReportWasPreview(!autoImport);
        if (autoImport) onSuccess();
      } else {
        setError(res.message || 'No se pudieron extraer movimientos válidos del texto.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al conciliar el estado de cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('El archivo es muy grande (máx. 4 MB). Exporta solo el período que necesitas.');
      return;
    }
    if (/\.(pdf|xlsx?|docx?)$/i.test(file.name)) {
      setError('Formato no soportado. Exporta el estado de cuenta como CSV o copia la tabla y pégala aquí.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setStatementText(content);
        setFileName(file.name);
        setError(null);
      }
    };
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      locked={loading}
      maxWidth="max-w-2xl"
      title="Sincronizar estado de cuenta"
      subtitle="El estado de cuenta oficial reemplaza los movimientos del banco en ese período"
      icon={
        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary shrink-0">
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">receipt_long</span>
        </div>
      }
      footer={
        report ? (
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setReport(null);
                if (!reportWasPreview) {
                  setStatementText('');
                  setFileName(null);
                }
              }}
              className={`${secondaryBtn} flex-1`}
            >
              {reportWasPreview ? 'Volver a editar' : 'Sincronizar otro estado'}
            </button>
            <button type="button" onClick={close} className={`${primaryBtn} flex-1`}>Listo</button>
          </div>
        ) : (
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" onClick={close} className={`${secondaryBtn} flex-1`} disabled={loading}>Cancelar</button>
            <button type="submit" form="statement-form" disabled={loading || !statementText.trim()} className={`${primaryBtn} flex-1`}>
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  <span>Analizando…</span>
                </>
              ) : (
                <span>{autoImport ? 'Conciliar y sincronizar' : 'Ver vista previa'}</span>
              )}
            </button>
          </div>
        )
      }
    >
      {error && (
        <div role="alert" className="mb-5 p-4 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">warning</span>
          <p>{error}</p>
        </div>
      )}

      {report ? (
        <div className="space-y-6 animate-fade-in">
          <div className="p-5 bg-secondary/10 border border-secondary/25 rounded-2xl">
            <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined" aria-hidden="true">{reportWasPreview ? 'preview' : 'task_alt'}</span>
              {reportWasPreview ? 'Vista previa (nada se guardó)' : 'Conciliación exitosa'}
            </h4>
            <p className="text-xs text-on-surface-variant mt-1">
              {report.totalStatementEntries} movimientos oficiales de {BANK_OPTIONS.find(b => b.code === bank)?.label || bank}.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Importados', value: report.totalStatementEntries, hint: 'Del estado de cuenta', cls: 'text-secondary' },
                { label: 'Reemplazaron', value: report.updatedCount, hint: 'Un registro previo', cls: 'text-primary' },
                { label: 'Nuevos', value: report.addedCount, hint: 'No estaban registrados', cls: 'text-tertiary' },
                { label: 'Sustituidos', value: report.removedCount || 0, hint: 'Registros previos del período', cls: 'text-error' }
              ].map(s => (
                <div key={s.label} className="p-3 bg-surface-container-high/70 rounded-xl border border-outline-variant/25 text-center">
                  <p className="text-xs text-on-surface-variant font-medium">{s.label}</p>
                  <p className={`text-2xl font-black mt-1 tabular-nums ${s.cls}`}>{s.value}</p>
                  <span className="text-[10px] text-on-surface-variant/80">{s.hint}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-container-high/50 border border-outline-variant/20 flex justify-between gap-2">
                <span className="text-on-surface-variant">Ingresos</span>
                <strong className="text-secondary tabular-nums">{formatMoney(report.totalIncomeAmount)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-high/50 border border-outline-variant/20 flex justify-between gap-2">
                <span className="text-on-surface-variant">Gastos</span>
                <strong className="text-error tabular-nums">{formatMoney(report.totalExpenseAmount)}</strong>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-on-surface">Detalle de movimientos</h4>
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {report.items.map((item, idx) => {
                const v = typeVisual(item.entry.type);
                return (
                  <li key={idx} className="p-3 border rounded-xl flex items-center justify-between gap-3 text-xs bg-surface-container-high/40 border-outline-variant/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`material-symbols-outlined text-[20px] shrink-0 ${v.className}`} aria-hidden="true">
                        {item.entry.type === 'INCOME' ? 'payments' : /atm|cajero/i.test(item.entry.description) ? 'atm' : item.entry.type === 'TRANSFER' ? 'swap_horiz' : 'credit_card'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-on-surface truncate" title={item.entry.description}>{item.entry.description}</p>
                        <p className="text-on-surface-variant text-[11px] truncate">
                          {formatDate(`${item.entry.date}T16:00:00Z`)} • {item.details}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold tabular-nums whitespace-nowrap ${v.className}`}>
                        {v.sign}
                        {formatMoney(item.entry.amount, item.entry.currency)}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold border ${
                          item.status === 'UPDATED' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-tertiary/15 text-tertiary border-tertiary/30'
                        }`}
                      >
                        {item.status === 'UPDATED' ? 'REEMPLAZÓ' : 'NUEVO'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <form id="statement-form" onSubmit={handleSync} className="space-y-5">
          <fieldset>
            <legend className={fieldLabel}>1. Selecciona tu banco</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BANK_OPTIONS.map((b) => (
                <button
                  type="button"
                  key={b.code}
                  onClick={() => setBank(b.code)}
                  aria-pressed={bank === b.code}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    bank === b.code
                      ? 'bg-primary/15 border-primary text-primary'
                      : 'bg-surface-container-high/60 border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${b.dot}`} aria-hidden="true"></span>
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="statement-text" className={fieldLabel}>2. Sube tu archivo o pega los movimientos</label>
            <textarea
              id="statement-text"
              rows={7}
              value={statementText}
              onChange={(e) => {
                setStatementText(e.target.value);
                setFileName(null);
              }}
              placeholder={`Copia y pega la tabla de movimientos de tu banca en línea (${BANK_OPTIONS.find(b => b.code === bank)?.label}) o carga tu archivo CSV...`}
              className={`${fieldInput} font-mono text-xs resize-y min-h-[9rem]`}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-outline-variant/30 rounded-lg text-xs text-on-surface cursor-pointer transition self-start">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">attach_file</span>
                <span className="truncate max-w-[14rem]">{fileName || 'Subir archivo (.csv, .txt)'}</span>
                <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={handleFileUpload} className="sr-only" />
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="checkbox"
                  checked={autoImport}
                  onChange={(e) => setAutoImport(e.target.checked)}
                  className="w-4 h-4 rounded-sm accent-[#3e90ff]"
                />
                <span>Guardar cambios (desmarca para solo ver una vista previa)</span>
              </label>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-high/40 border border-outline-variant/25 rounded-xl text-xs text-on-surface-variant space-y-1">
            <p className="font-semibold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">info</span>
              ¿Cómo funciona?
            </p>
            <p>
              El estado de cuenta es la fuente oficial: los movimientos de {BANK_OPTIONS.find(b => b.code === bank)?.label} dentro de su rango de fechas se
              reemplazan por los del estado (incluye retiros ATM y nóminas que no llegaron por correo). Los saldos iniciales no se cuentan como ingreso.
            </p>
          </div>
        </form>
      )}
    </Modal>
  );
};
