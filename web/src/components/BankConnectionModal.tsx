import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2, KeyRound, AlertCircle, Check } from 'lucide-react';
import { ApiClient } from '../api/client';

interface BankConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGmailConnected?: boolean;
  onTransactionAdded?: () => void;
}

export const BankConnectionModal: React.FC<BankConnectionModalProps> = ({
  isOpen,
  onClose,
  isGmailConnected = false,
  onTransactionAdded
}) => {
  const [activeTab, setActiveTab] = useState<'gmail' | 'paste' | 'banks'>('gmail');
  const [connecting, setConnecting] = useState(false);
  const [showManualConfig, setShowManualConfig] = useState(false);

  // Custom Google OAuth credentials form
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Paste form state
  const [rawText, setRawText] = useState('');
  const [rawSender, setRawSender] = useState('notificaciones@bpd.com.do');
  const [rawSubject, setRawSubject] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      ApiClient.getGoogleAuthUrl()
        .then((res) => {
          if (!res.configured) {
            setShowManualConfig(true);
          }
        })
        .catch(() => {
          setShowManualConfig(true);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      const res = await ApiClient.saveGoogleConfig({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      });

      if (res.success) {
        setConfigMessage({
          type: 'success',
          text: '¡Credenciales guardadas! Redirigiendo a Google...'
        });
        const authRes = await ApiClient.getGoogleAuthUrl();
        if (authRes.url) {
          setTimeout(() => {
            window.location.href = authRes.url!;
          }, 1000);
        }
      }
    } catch (err: any) {
      setConfigMessage({
        type: 'error',
        text: err.message || 'Error al guardar credenciales en el servidor.'
      });
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
        message:
          err.message ||
          'No se pudo extraer la información del banco. Asegúrate de incluir el monto (ej. RD$ 1,500.00) y el comercio.'
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
      color: '#00d8f6',
      sample: 'Notificación de Débito por Compra en SUPERMERCADOS NACIONAL por RD$ 2,450.00'
    },
    {
      name: 'Banco BHD',
      email: 'alertas@bhd.com.do',
      badge: 'BHD',
      color: '#ffcc00',
      sample: 'Aviso de Transacción: Consumo con Tarjeta en TEXACO CHURCHILL por valor de RD$ 1,800.00'
    },
    {
      name: 'Banco Promerica',
      email: 'notificaciones@promerica.com.do',
      badge: 'Promerica',
      color: '#00e676',
      sample: 'Transacción Aprobada: Consumo de RD$ 750.00 en UBER TRIP con su tarjeta terminada en 1234'
    },
    {
      name: 'Qik Banco Digital',
      email: 'notificaciones@qik.com.do',
      badge: 'Qik',
      color: '#d038f0',
      sample: 'Pago realizado con tu Tarjeta Qik por RD$ 420.00 en SPOTIFY'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="retro-box w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#444477]">
          <div>
            <h3 className="font-pixel text-xs sm:text-sm text-[#ffd700] pixel-text-shadow">
              ⚙ [CONFIGURACIÓN // BANCOS & GMAIL]
            </h3>
            <p className="font-vt text-sm text-[#00ffff] mt-0.5">
              CONEXIÓN DIRECTA CON TUS NOTIFICACIONES BANCARIAS RD
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white border-2 border-transparent hover:border-[#ffd700]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-[#3b3b77] mt-4 mb-4 font-pixel text-[8px]">
          <button
            onClick={() => setActiveTab('gmail')}
            className={`pb-2 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'gmail'
                ? 'border-[#39ff14] text-[#39ff14]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            ✉ CONECTAR GMAIL
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'paste'
                ? 'border-[#00ffff] text-[#00ffff]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            📋 PROBAR CORREO
          </button>
          <button
            onClick={() => setActiveTab('banks')}
            className={`pb-2 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'banks'
                ? 'border-[#ffd700] text-[#ffd700]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🏦 BANCOS RD COMPATIBLES
          </button>
        </div>

        {/* Tab 1: Gmail Connect */}
        {activeTab === 'gmail' && (
          <div className="space-y-4 font-pixel text-[9px]">
            {isGmailConnected ? (
              <div className="p-4 bg-[#092015] border-2 border-[#39ff14] space-y-2">
                <div className="flex items-center gap-2 text-[#39ff14]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">¡CUENTA DE GMAIL CONECTADA!</span>
                </div>
                <p className="font-vt text-base text-slate-300">
                  GastaBien escanea tus correos de Popular, BHD, Promerica y Qik automáticamente.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-black border-2 border-[#ffd700] space-y-3">
                <div className="flex items-center gap-2 text-[#ffd700]">
                  <Mail className="w-4 h-4" />
                  <span className="font-bold">SINCRONIZACIÓN AUTOMÁTICA DE CORREOS</span>
                </div>
                <p className="font-vt text-base text-slate-300 leading-relaxed">
                  Conecta tu Gmail para leer las alertas de compras y transferencias en tiempo real sin ingresar credenciales bancarias.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleConnectGmail}
                    disabled={connecting}
                    className="pixel-btn pixel-btn-primary w-full"
                  >
                    <span>⚡ {connecting ? 'ABRIENDO GOOGLE...' : 'CONECTAR CON GOOGLE'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* In-app Manual Config toggle if needed */}
            {showManualConfig && (
              <form onSubmit={handleSaveConfig} className="p-4 bg-black border-2 border-[#3b3b77] space-y-3">
                <div className="flex items-center gap-2 text-[#00ffff]">
                  <KeyRound className="w-4 h-4" />
                  <span className="font-bold text-[8px]">CONFIGURAR CREDENCIALES DE GOOGLE OAUTH:</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-300 text-[8px] mb-1">GOOGLE CLIENT ID:</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 123456...apps.googleusercontent.com"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full bg-[#111132] border border-slate-700 px-2 py-1.5 text-white font-mono text-[8px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-[8px] mb-1">GOOGLE CLIENT SECRET:</label>
                    <input
                      type="password"
                      required
                      placeholder="GOCSPX-..."
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="w-full bg-[#111132] border border-slate-700 px-2 py-1.5 text-white font-mono text-[8px] outline-none"
                    />
                  </div>
                </div>

                {configMessage && (
                  <div className={`p-2 border text-[8px] ${
                    configMessage.type === 'success' ? 'bg-[#092015] text-[#39ff14] border-[#39ff14]' : 'bg-[#2b0b14] text-[#ff3344] border-[#ff3344]'
                  }`}>
                    {configMessage.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="pixel-btn pixel-btn-cyan"
                  >
                    {savingConfig ? 'GUARDANDO...' : 'GUARDAR Y AUTORIZAR'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Test / Paste Email */}
        {activeTab === 'paste' && (
          <form onSubmit={handleParseRawSubmit} className="space-y-3 font-pixel text-[9px]">
            <div>
              <label className="block text-[#00ffff] mb-1">REMITENTE DEL BANCO:</label>
              <select
                value={rawSender}
                onChange={(e) => setRawSender(e.target.value)}
                className="w-full bg-black border-2 border-[#3b3b77] px-2.5 py-1.5 text-[#ffcc00] font-pixel text-[8px] outline-none"
              >
                <option value="notificaciones@bpd.com.do">Banco Popular (notificaciones@bpd.com.do)</option>
                <option value="alertas@bhd.com.do">Banco BHD (alertas@bhd.com.do)</option>
                <option value="notificaciones@promerica.com.do">Banco Promerica (notificaciones@promerica.com.do)</option>
                <option value="notificaciones@qik.com.do">Qik Banco Digital (notificaciones@qik.com.do)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#00ffff] mb-1">TEXTO / CUERPO DEL CORREO:</label>
              <textarea
                rows={4}
                required
                placeholder="Pega aquí el texto del correo bancario (ej: 'Consumo aprobado por RD$ 1,850.00 en SUPERMERCADO BRAVO...')"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-black border-2 border-[#3b3b77] p-2 text-white font-pixel text-[8px] outline-none"
              />
            </div>

            {parseResult && (
              <div className={`p-2.5 border text-[8px] ${
                parseResult.success ? 'bg-[#092015] text-[#39ff14] border-[#39ff14]' : 'bg-[#2b0b14] text-[#ff3344] border-[#ff3344]'
              }`}>
                {parseResult.message}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="submit"
                disabled={isProcessing || !rawText.trim()}
                className="pixel-btn pixel-btn-primary"
              >
                {isProcessing ? 'PROCESANDO...' : 'PROBAR Y REGISTRAR'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Supported Banks */}
        {activeTab === 'banks' && (
          <div className="space-y-3 font-pixel text-[9px]">
            {supportedBanks.map((b) => (
              <div key={b.name} className="p-3 bg-black border-2 border-[#3b3b77] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white" style={{ color: b.color }}>
                    {b.name}
                  </span>
                  <span className="text-slate-400 font-mono text-[8px]">{b.email}</span>
                </div>
                <div className="p-2 bg-[#111132] border border-slate-700 font-vt text-xs text-slate-300">
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
