import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles,
  Building2,
  Info,
  FileText,
  KeyRound,
  Send
} from 'lucide-react';
import { ApiClient } from '../api/client';

interface BankConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGmailConnected?: boolean;
  onSimulateSync: () => void;
  onTransactionAdded?: () => void;
}

export const BankConnectionModal: React.FC<BankConnectionModalProps> = ({
  isOpen,
  onClose,
  isGmailConnected = false,
  onSimulateSync,
  onTransactionAdded
}) => {
  const [activeTab, setActiveTab] = useState<'gmail' | 'paste' | 'banks'>('gmail');
  const [connecting, setConnecting] = useState(false);
  
  // Paste form state
  const [rawText, setRawText] = useState('');
  const [rawSender, setRawSender] = useState('notificaciones@bpd.com.do');
  const [rawSubject, setRawSubject] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleConnectGmail = async () => {
    try {
      setConnecting(true);
      const res = await ApiClient.getGoogleAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      } else {
        alert(
          'Para conectar Gmail en vivo se requieren las credenciales gratuitas de Google Cloud en el archivo backend/.env (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET).\n\nMientras tanto, puedes usar la pestaña "Pegar Correo Bancario" o "Cargar Correos de Prueba".'
        );
      }
    } catch {
      alert('Configura las credenciales de Google OAuth en backend/.env');
    } finally {
      setConnecting(false);
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
        setParseResult({
          success: true,
          message: `¡Movimiento registrado con éxito! Monto: RD$ ${res.transaction.amount} en ${res.transaction.merchant} (${res.transaction.category}).`
        });
        setRawText('');
        setRawSubject('');
        if (onTransactionAdded) onTransactionAdded();
      }
    } catch (err: any) {
      setParseResult({
        success: false,
        message: err.message || 'No se pudo extraer la información del banco. Asegúrate de incluir el monto (ej. RD$ 1,500.00) y el comercio.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const supportedBanks = [
    {
      name: 'Banco Popular Dominicano',
      email: 'notificaciones@bpd.com.do',
      badge: 'Popular',
      color: 'border-blue-700/50 bg-blue-950/40 text-blue-400',
      sample: 'Estimado cliente, se ha realizado un débito por compra con su Tarjeta terminada en 4829 por un monto de RD$ 2,450.00 en ESTACION TOTAL CHURCHILL.'
    },
    {
      name: 'Banco BHD',
      email: 'alertas@bhd.com.do',
      badge: 'BHD',
      color: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-400',
      sample: 'Alerta BHD: Consumo aprobado por RD$ 5,890.75 en SUPERMERCADOS NACIONAL con su tarjeta terminada en 9102.'
    },
    {
      name: 'Banco Promerica',
      email: 'notificaciones@promerica.com.do',
      badge: 'Promerica',
      color: 'border-teal-700/50 bg-teal-950/40 text-teal-400',
      sample: 'Estimado cliente, consumo por RD$ 750.00 en UBER TRIP SANTO DOMINGO con su tarjeta terminada en 3321.'
    },
    {
      name: 'Qik Banco Digital',
      email: 'notificaciones@qik.com.do',
      badge: 'Qik',
      color: 'border-purple-700/50 bg-purple-950/40 text-purple-400',
      sample: 'Consumo por RD$ 1,420.00 en Farmacia Carol 27 de Febrero con tu tarjeta Qik terminada en 1104.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Sincronización Bancaria RD</h3>
              <p className="text-xs text-slate-400">Popular, BHD, Promerica y Qik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('gmail')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'gmail'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail Automático</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'paste'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pegar Correo Real</span>
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'banks'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bancos Compatibles</span>
          </button>
        </div>

        {/* TAB 1: GMAIL OAUTH CONFIGURATION */}
        {activeTab === 'gmail' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Conectar Bandeja de Gmail
                    {isGmailConnected ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                        Conectado
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
                        Pendiente OAuth
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Permiso seguro de solo lectura (`gmail.readonly`) para escanear avisos de bancos.
                  </p>
                </div>
              </div>

              <button
                onClick={handleConnectGmail}
                disabled={connecting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-slate-950 shadow flex items-center justify-center gap-1.5 transition-all flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isGmailConnected ? 'Reconectar Gmail' : 'Autorizar con Google'}</span>
              </button>
            </div>

            {/* Step-by-step Setup Guide */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs text-slate-300">
              <h5 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                ¿Cómo activar la lectura real de tu correo?
              </h5>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed">
                <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Google Cloud Console</a> y crea un proyecto gratuito.</li>
                <li>En <strong>APIs & Services</strong>, habilita la <strong>Gmail API</strong>.</li>
                <li>En <strong>OAuth Consent Screen</strong>, añade tu correo como usuario de prueba.</li>
                <li>En <strong>Credentials</strong>, crea un <em>OAuth Client ID (Web Application)</em> con URI de redirección: <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">http://localhost:4000/api/auth/google/callback</code>.</li>
                <li>Copia tu <code className="text-amber-300">GOOGLE_CLIENT_ID</code> y <code className="text-amber-300">GOOGLE_CLIENT_SECRET</code> en el archivo <code className="text-white">backend/.env</code>.</li>
              </ol>
            </div>

            {/* Instant Demo Simulation */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">¿Quieres probar ahora mismo con correos de prueba?</span>
              <button
                onClick={() => {
                  onSimulateSync();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-800/50 flex items-center gap-1.5 shadow"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Cargar 10 Correos de Ejemplo</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PASTE RAW REAL EMAIL TEXT */}
        {activeTab === 'paste' && (
          <form onSubmit={handleParseRawSubmit} className="mt-5 space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
              💡 <strong>Procesador en Vivo:</strong> Copia el texto o cuerpo de cualquier correo de notificación que hayas recibido de <strong>Popular, BHD, Promerica o Qik</strong> y pégalo abajo para procesarlo al instante.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Banco Remitente
                </label>
                <select
                  value={rawSender}
                  onChange={(e) => setRawSender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="notificaciones@bpd.com.do">Banco Popular (notificaciones@bpd.com.do)</option>
                  <option value="alertas@bhd.com.do">Banco BHD (alertas@bhd.com.do)</option>
                  <option value="notificaciones@promerica.com.do">Promerica (notificaciones@promerica.com.do)</option>
                  <option value="notificaciones@qik.com.do">Qik Banco Digital (notificaciones@qik.com.do)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Asunto del Correo (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Aviso de Débito por Compra"
                  value={rawSubject}
                  onChange={(e) => setRawSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Cuerpo / Texto del Correo Bancario
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRawText('Estimado cliente, se ha realizado un débito por compra con su Tarjeta terminada en 4829 por un monto de RD$ 3,120.00 en ESTACION TOTAL CHURCHILL.');
                  }}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Insertar ejemplo
                </button>
              </div>
              <textarea
                required
                rows={4}
                placeholder="Pega aquí el texto del correo bancario (ej: 'Consumo aprobado por RD$ 1,850.00 en SUPERMERCADO BRAVO...')"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {parseResult && (
              <div className={`p-3 rounded-xl border text-xs ${
                parseResult.success 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' 
                  : 'bg-rose-950/60 text-rose-300 border-rose-800'
              }`}>
                {parseResult.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="submit"
                disabled={isProcessing || !rawText.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Procesando...' : 'Extraer y Registrar'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SUPPORTED BANKS */}
        {activeTab === 'banks' && (
          <div className="mt-5 space-y-3 animate-fade-in">
            {supportedBanks.map((b, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${b.color}`}>
                      {b.badge}
                    </span>
                    <span className="text-xs font-bold text-white">{b.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">{b.email}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500 block mb-0.5">Formato de ejemplo:</span>
                  {b.sample}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
