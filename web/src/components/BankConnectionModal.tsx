import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { Modal, fieldInput, fieldLabel, primaryBtn, secondaryBtn } from './Modal';
import { formatMoney, formatRelative } from '../utils/format';

interface BankConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGmailConnected?: boolean;
  needsReconnect?: boolean;
  lastSyncAt?: string | null;
  onTransactionAdded?: () => void;
  /** Re-imports every Gmail-sourced transaction with the current parsers. */
  onResync?: () => Promise<void> | void;
  isSyncing?: boolean;
}

type Tab = 'gmail' | 'paste' | 'banks';

const REDIRECT_URI = 'https://gastabien.onrender.com/api/auth/google/callback';

const SUPPORTED_BANKS = [
  {
    name: 'Banco Popular Dominicano',
    email: 'notificaciones@bpd.com.do',
    badge: 'Popular',
    dot: 'bg-primary-container',
    sample: 'Estimado cliente, se ha realizado un débito por compra con su Tarjeta terminada en 4829 por un monto de RD$ 2,450.00 en ESTACION TOTAL CHURCHILL.'
  },
  {
    name: 'Banco BHD',
    email: 'alertas@bhd.com.do',
    badge: 'BHD',
    dot: 'bg-banco-bhd',
    sample: 'Alerta BHD: Consumo aprobado por RD$ 5,890.75 en SUPERMERCADOS NACIONAL con su tarjeta terminada en 9102.'
  },
  {
    name: 'Banco Promerica',
    email: 'notificaciones@promerica.com.do',
    badge: 'Promerica',
    dot: 'bg-banco-promerica',
    sample: 'Estimado cliente, consumo por RD$ 750.00 en UBER TRIP SANTO DOMINGO con su tarjeta terminada en 3321.'
  },
  {
    name: 'Qik Banco Digital',
    email: 'notificaciones@qik.com.do',
    badge: 'Qik',
    dot: 'bg-tertiary-container',
    sample: 'Consumo por RD$ 1,420.00 en Farmacia Carol 27 de Febrero con tu tarjeta Qik terminada en 1104.'
  }
];

export const BankConnectionModal: React.FC<BankConnectionModalProps> = ({
  isOpen,
  onClose,
  isGmailConnected = false,
  needsReconnect = false,
  lastSyncAt,
  onTransactionAdded,
  onResync,
  isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('gmail');
  const [connecting, setConnecting] = useState(false);
  const [showManualConfig, setShowManualConfig] = useState(false);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [rawText, setRawText] = useState('');
  const [rawSender, setRawSender] = useState('notificaciones@bpd.com.do');
  const [rawSubject, setRawSubject] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    ApiClient.getGoogleAuthUrl()
      .then(res => !cancelled && setShowManualConfig(!res.configured))
      .catch(() => !cancelled && setShowManualConfig(true));
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleConnectGmail = async () => {
    try {
      setConnecting(true);
      const res = await ApiClient.getGoogleAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      } else {
        setShowManualConfig(true);
      }
    } catch {
      setShowManualConfig(true);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) return;
    try {
      setSavingConfig(true);
      setConfigMessage(null);
      const res = await ApiClient.saveGoogleConfig({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
      if (res.success) {
        setConfigMessage({ type: 'success', text: '¡Credenciales guardadas! Redirigiendo a Google…' });
        const authRes = await ApiClient.getGoogleAuthUrl();
        if (authRes.url) {
          setTimeout(() => {
            window.location.href = authRes.url!;
          }, 800);
        }
      }
    } catch (err: any) {
      setConfigMessage({ type: 'error', text: err?.message || 'Error al guardar credenciales en el servidor.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleParseRawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    try {
      setIsProcessing(true);
      setParseResult(null);
      const res = await ApiClient.parseRawEmail({
        sender: rawSender,
        subject: rawSubject || 'Aviso de Transacción',
        body: rawText
      });
      if (res.success) {
        const tx = res.transaction;
        setParseResult({
          success: true,
          message: `¡Movimiento registrado! ${formatMoney(tx.amount, tx.currency)} en ${tx.merchant} (${tx.category}).`
        });
        setRawText('');
        setRawSubject('');
        onTransactionAdded?.();
      } else {
        setParseResult({ success: false, message: res.message || 'No se pudo extraer la transacción.' });
      }
    } catch (err: any) {
      setParseResult({
        success: false,
        message: err?.message || 'No se pudo extraer la información. Incluye el monto (ej. RD$ 1,500.00) y el comercio.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'gmail', label: 'Gmail', icon: 'mail' },
    { id: 'paste', label: 'Pegar correo', icon: 'content_paste' },
    { id: 'banks', label: 'Bancos', icon: 'account_balance' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title="Sincronización bancaria RD"
      subtitle="Popular, BHD, Promerica y Qik"
      icon={
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">account_balance</span>
        </div>
      }
    >
      <div className="flex items-center gap-1 p-1 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs font-semibold" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === t.id ? 'bg-primary-container text-on-primary-container shadow' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'gmail' && (
        <div className="mt-5 space-y-4 animate-fade-in" role="tabpanel">
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-3 rounded-2xl bg-error-container/20 text-error border border-error/20 shrink-0">
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">mail</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-on-surface flex items-center gap-1.5 flex-wrap">
                  Bandeja de Gmail
                  {needsReconnect ? (
                    <span className="text-[10px] text-error bg-error-container/30 px-2 py-0.5 rounded-full border border-error/40">Acceso revocado</span>
                  ) : isGmailConnected ? (
                    <span className="text-[10px] text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/30">Conectado</span>
                  ) : (
                    <span className="text-[10px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/30">Pendiente</span>
                  )}
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Permiso de solo lectura para escanear avisos de bancos.
                  {isGmailConnected && <> Última sincronización: {formatRelative(lastSyncAt)}.</>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConnectGmail}
              disabled={connecting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-on-surface hover:bg-white text-surface shadow flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
              <span>{isGmailConnected || needsReconnect ? 'Reconectar Gmail' : 'Autorizar con Google'}</span>
            </button>
          </div>

          {isGmailConnected && onResync && (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-on-surface-variant">
                <p className="font-semibold text-on-surface text-sm">Re-escanear todo el buzón</p>
                <p>Vuelve a leer todos los avisos con los lectores actualizados. Tus registros manuales y estados de cuenta se conservan.</p>
              </div>
              <button type="button" onClick={() => onResync()} disabled={isSyncing} className={`${secondaryBtn} shrink-0`}>
                <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true">sync</span>
                <span>{isSyncing ? 'Escaneando…' : 'Re-escanear'}</span>
              </button>
            </div>
          )}

          {showManualConfig && (
            <form onSubmit={handleSaveConfig} className="p-4 rounded-2xl bg-surface-container-lowest border border-primary/25 space-y-3 animate-fade-in">
              <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">key</span>
                Credenciales de Google Cloud OAuth
              </h5>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Ingresa las credenciales de tu proyecto de Google Cloud (o configúralas como variables de entorno en Render).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="g-client-id" className={fieldLabel}>Google Client ID</label>
                  <input id="g-client-id" type="text" required placeholder="123456...apps.googleusercontent.com" value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${fieldInput} text-xs font-mono`} />
                </div>
                <div>
                  <label htmlFor="g-client-secret" className={fieldLabel}>Google Client Secret</label>
                  <input id="g-client-secret" type="password" required placeholder="GOCSPX-..." value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className={`${fieldInput} text-xs font-mono`} autoComplete="off" />
                </div>
              </div>

              {configMessage && (
                <div role="status" className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${configMessage.type === 'success' ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-error-container/20 text-error border-error/30'}`}>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{configMessage.type === 'success' ? 'check' : 'error'}</span>
                  <span>{configMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-on-surface-variant min-w-0">
                  URI de redirección: <code className="bg-surface-container-high px-1 py-0.5 rounded text-primary break-all">{REDIRECT_URI}</code>
                </span>
                <button type="submit" disabled={savingConfig || !clientId.trim() || !clientSecret.trim()} className={`${primaryBtn} shrink-0 text-xs`}>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>
                  <span>{savingConfig ? 'Guardando…' : 'Guardar y autorizar'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="p-4 rounded-2xl bg-surface-container-lowest/70 border border-outline-variant/25 space-y-2.5 text-xs text-on-surface-variant">
            <h5 className="font-bold text-on-surface flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">checklist</span>
              Cómo crear tu Client ID gratuito
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
              <li>
                Ve a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-secondary underline font-semibold">Google Cloud Console</a> y crea un proyecto.
              </li>
              <li>En <strong>APIs &amp; Services</strong>, habilita la <strong>Gmail API</strong>.</li>
              <li>En <strong>OAuth Consent Screen</strong>, añade tu correo como usuario de prueba.</li>
              <li>
                En <strong>Credentials</strong>, crea un <em>OAuth Client ID (Web)</em> con URI de redirección:{' '}
                <code className="bg-surface-container-high px-1 py-0.5 rounded text-secondary break-all">{REDIRECT_URI}</code>
              </li>
              <li>Pega el Client ID y el Client Secret en el formulario.</li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === 'paste' && (
        <form onSubmit={handleParseRawSubmit} className="mt-5 space-y-4 animate-fade-in" role="tabpanel">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-on-surface">
            Copia el texto de un aviso de <strong>Popular, BHD, Promerica o Qik</strong> y pégalo abajo para registrarlo al instante. Los duplicados se detectan automáticamente.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="raw-sender" className={fieldLabel}>Banco remitente</label>
              <select id="raw-sender" value={rawSender} onChange={(e) => setRawSender(e.target.value)} className={`${fieldInput} text-xs cursor-pointer`}>
                {SUPPORTED_BANKS.map(b => (
                  <option key={b.email} value={b.email}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="raw-subject" className={fieldLabel}>Asunto (opcional)</label>
              <input id="raw-subject" type="text" placeholder="Ej. Aviso de Débito por Compra" value={rawSubject} onChange={(e) => setRawSubject(e.target.value)} className={`${fieldInput} text-xs`} />
            </div>
          </div>

          <div>
            <label htmlFor="raw-body" className={fieldLabel}>Texto del correo bancario</label>
            <textarea
              id="raw-body"
              required
              rows={5}
              placeholder="Pega aquí el texto del correo recibido de tu banco..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className={`${fieldInput} text-xs font-mono resize-y`}
            />
          </div>

          {parseResult && (
            <div role="status" className={`p-3 rounded-xl border text-xs ${parseResult.success ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-error-container/20 text-error border-error/30'}`}>
              {parseResult.message}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={isProcessing || !rawText.trim()} className={primaryBtn}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>
              <span>{isProcessing ? 'Procesando…' : 'Extraer y registrar'}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'banks' && (
        <ul className="mt-5 space-y-3 animate-fade-in" role="tabpanel">
          {SUPPORTED_BANKS.map((b) => (
            <li key={b.email} className="p-3.5 rounded-2xl bg-surface-container-lowest/70 border border-outline-variant/25 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${b.dot}`} aria-hidden="true"></span>
                  <span className="text-xs font-bold text-on-surface">{b.name}</span>
                </div>
                <span className="text-[11px] font-mono text-secondary break-all">{b.email}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-high/60 border border-outline-variant/20 text-[11px] font-mono text-on-surface-variant">
                <span className="text-on-surface-variant/70 block mb-0.5">Formato compatible:</span>
                {b.sample}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
