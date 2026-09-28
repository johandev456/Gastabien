import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Lock, CheckCircle, AlertTriangle, Copy, ArrowRight, Smartphone, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ApiClient, TwoFactorSetupResponse } from '../api/client';

interface TwoFactorLockScreenProps {
  onAuthenticated: () => void;
  requiresSetup: boolean;
}

export function TwoFactorLockScreen({ onAuthenticated, requiresSetup: initialRequiresSetup }: TwoFactorLockScreenProps) {
  const [isSetupMode, setIsSetupMode] = useState(initialRequiresSetup);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load setup data if needed
  useEffect(() => {
    if (isSetupMode) {
      setLoading(true);
      setError(null);
      ApiClient.setup2FA()
        .then(data => {
          setSetupData(data);
        })
        .catch(err => {
          console.error(err);
          setError('Error al inicializar configuración de 2FA. Reintenta.');
        })
        .finally(() => setLoading(false));
    }
  }, [isSetupMode]);

  // Focus first input on mount
  useEffect(() => {
    if (!useBackupCode) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [isSetupMode, useBackupCode]);

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    // Handle paste of 6 digits
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = cleaned[i] || '';
        }
        setOtpDigits(newDigits);
        const nextFocus = Math.min(cleaned.length, 5);
        inputRefs.current[nextFocus]?.focus();

        if (cleaned.length === 6) {
          submitOtp(cleaned);
        }
      }
      return;
    }

    const char = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      submitOtp(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitOtp = async (codeToSubmit?: string) => {
    const code = codeToSubmit || (useBackupCode ? backupCode.trim() : otpDigits.join(''));
    if (!code) {
      setError(useBackupCode ? 'Ingresa tu código de recuperación' : 'Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await ApiClient.verify2FA(
        code,
        isSetupMode,
        isSetupMode ? setupData?.secret : undefined
      );

      if (res.success) {
        onAuthenticated();
      } else {
        setError(res.error || 'Código incorrecto');
      }
    } catch (err: any) {
      console.error('2FA Verification error:', err);
      setError(err.message || 'Código 2FA incorrecto o expirado. Revisa tu app de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'backup') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#10131A] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#191C22]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl shadow-black/80">
        {/* Header Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-tight">Gasta<span className="text-emerald-400">Bien</span></span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              RD
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Acceso Privado 2FA</span>
          </div>
        </div>

        {isSetupMode ? (
          /* ==========================================
             SETUP MODE: FIRST TIME 2FA CONFIGURATION
             ========================================== */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Configura tu 2FA</h2>
              <p className="text-xs text-slate-400">
                Vincula tu aplicación de autenticación para que seas el <strong className="text-slate-200">único</strong> que pueda entrar a GastaBien.
              </p>
            </div>

            {setupData && (
              <div className="space-y-5">
                {/* QR Code Container */}
                <div className="bg-[#10131A] p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center space-y-3">
                  <div className="bg-white p-2.5 rounded-xl shadow-md">
                    <img
                      src={setupData.qrCodeUrl}
                      alt="Código QR 2FA"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    Escanea con <strong>Google Authenticator</strong>, <strong>Apple</strong> o <strong>Authy</strong>
                  </p>
                </div>

                {/* Secret Key Box */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>O introduce la clave manualmente:</span>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px]"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showSecret ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#10131A] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all tracking-wider truncate">
                      {showSecret ? setupData.secret : '•••• •••• •••• •••• •••• ••••'}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupData.secret, 'secret')}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                      title="Copiar Clave Secreta"
                    >
                      {copiedSecret ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Backup Codes Accordion */}
                <div className="bg-[#10131A]/60 border border-white/5 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      Códigos de Recuperación
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), 'backup')}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedBackup ? '✓ Copiados' : 'Copiar 8 códigos'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400">
                    {setupData.backupCodes.map((code, idx) => (
                      <div key={idx} className="bg-black/30 px-2 py-1 rounded border border-white/5">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Confirmation input */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="text-xs font-semibold text-slate-200 block text-center">
                    Ingresa el código de 6 dígitos que muestra tu app:
                  </label>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-center gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={e => handleDigitChange(index, e.target.value)}
                        onKeyDown={e => handleKeyDown(index, e)}
                        className="w-11 h-13 text-center text-xl font-bold bg-[#10131A] border border-white/15 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-white rounded-xl transition-all outline-none"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => submitOtp()}
              disabled={loading || otpDigits.includes('')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Activar y Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* ==========================================
             VERIFICATION / LOGIN MODE
             ========================================== */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-xl shadow-black/50">
                <Smartphone className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Acceso Privado de Johan</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Introduce el código de 6 dígitos generado por tu <strong className="text-slate-200">Google Authenticator</strong> o app 2FA para desbloquear.
              </p>
            </div>

            {!useBackupCode ? (
              <div className="space-y-4">
                {/* 6 Digit Input Boxes */}
                <div className="flex justify-center gap-2.5">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={e => handleDigitChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-[#10131A] border border-white/15 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-white rounded-2xl transition-all outline-none shadow-inner"
                    />
                  ))}
                </div>

                {/* Remember this device checkbox */}
                <label className="flex items-center justify-center gap-2 text-xs text-slate-300 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={e => setRememberDevice(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-400 h-4 w-4"
                  />
                  <span>Recordar este dispositivo (Guardar sesión)</span>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-300 block text-center">
                  Código de Recuperación de Emergencia (ej. XXXX-XXXX):
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={e => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="A1B2-C3D4"
                  className="w-full text-center text-lg font-mono font-bold bg-[#10131A] border border-white/15 focus:border-cyan-400 text-white px-4 py-3 rounded-xl outline-none"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => submitOtp()}
                disabled={loading || (!useBackupCode && otpDigits.includes('')) || (useBackupCode && !backupCode.trim())}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Verificar y Desbloquear</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center text-xs text-slate-400 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setError(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  {useBackupCode ? '← Usar app de autenticación (6 dígitos)' : '¿No tienes tu teléfono? Usar código de recuperación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Footer Note */}
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protección Cifrada Local • Sesión Persistente por Dispositivo</span>
        </div>
      </div>
    </div>
  );
}
