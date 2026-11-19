import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { CategoryPieChart } from './components/CategoryPieChart';
import { MonthlyTrendChart } from './components/MonthlyTrendChart';
import { TransactionList } from './components/TransactionList';
import { AddTransactionModal } from './components/AddTransactionModal';
import { BankConnectionModal } from './components/BankConnectionModal';
import { StatementSyncModal } from './components/StatementSyncModal';
import { BankFilterBar } from './components/BankFilterBar';
import { MonthFilterBar } from './components/MonthFilterBar';
import { TwoFactorLockScreen } from './components/TwoFactorLockScreen';
import { ApiClient } from './api/client';
import { AnalyticsSummary, Transaction, Category, BankCode, AuthStatus, CreateTransactionInput, SyncResult } from './types';
import { DEFAULT_USD_RATE } from './utils/format';

const SUMMARY_CACHE_KEY = 'gastabien_cached_summary';
const TX_CACHE_KEY = 'gastabien_cached_transactions';
/** Refresh data when the tab becomes visible again after this long. */
const STALE_AFTER_MS = 60_000;

function readCache<T>(key: string, fallback: T): T {
  try {
    const cached = localStorage.getItem(key);
    return cached ? (JSON.parse(cached) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: caching is best-effort
  }
}

type Toast = { type: 'success' | 'error'; message: string };

export function App() {
  // A stored token is NOT trusted until the server confirms it (avoids flashing protected data)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [requires2FASetup, setRequires2FASetup] = useState(false);

  // Cache holds the UNFILTERED view only (filters reset to "all" on reload)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(() => readCache(SUMMARY_CACHE_KEY, null));
  const [transactions, setTransactions] = useState<Transaction[]>(() => readCache(TX_CACHE_KEY, []));

  const [selectedBanks, setSelectedBanks] = useState<BankCode[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [isBanksModalOpen, setIsBanksModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [notification, setNotification] = useState<Toast | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  const toastTimer = useRef<number | null>(null);
  const requestSeq = useRef(0);
  const lastLoadedAt = useRef(0);
  const filtersRef = useRef({ banks: selectedBanks, month: selectedMonth });
  filtersRef.current = { banks: selectedBanks, month: selectedMonth };

  const isGmailConnected = !!authStatus?.user?.hasGmailConnected;
  const needsReconnect = !!authStatus?.user?.needsReconnect;
  const lastSyncAt = authStatus?.user?.lastSyncAt || null;
  const usdRate = summary?.usdToDopRate || DEFAULT_USD_RATE;

  const showToast = useCallback((type: Toast['type'], message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setNotification({ type, message });
    toastTimer.current = window.setTimeout(() => setNotification(null), type === 'error' ? 6500 : 4500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const lockApp = useCallback(() => {
    ApiClient.clearLocalData();
    setIsAuthenticated(false);
    setSummary(null);
    setTransactions([]);
    setAuthStatus(null);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const status = await ApiClient.get2FAStatus();
      if (!status.is2FAEnabled || status.requiresSetup) {
        ApiClient.clearLocalData();
        setRequires2FASetup(true);
        setIsAuthenticated(false);
      } else if (status.isAuthenticated) {
        setIsAuthenticated(true);
        setRequires2FASetup(false);
      } else {
        // Token missing, expired or revoked: wipe it and the cached financial data
        lockApp();
        setRequires2FASetup(false);
      }
    } catch (err) {
      console.warn('Backend waking up or network unavailable during 2FA check:', err);
      // Offline / cold start: allow a device that already holds a session to see its cached data
      setIsAuthenticated(ApiClient.hasSessionToken());
    } finally {
      setAuthChecking(false);
    }
  }, [lockApp]);

  useEffect(() => {
    checkAuth();
    const handle2FARequired = () => {
      lockApp();
      ApiClient.get2FAStatus()
        .then(s => setRequires2FASetup(!s.is2FAEnabled || s.requiresSetup))
        .catch(() => {});
    };
    window.addEventListener('gastabien:2fa_required', handle2FARequired);
    return () => window.removeEventListener('gastabien:2fa_required', handle2FARequired);
  }, [checkAuth, lockApp]);

  const refreshAuthStatus = useCallback(async () => {
    try {
      setAuthStatus(await ApiClient.getAuthStatus());
    } catch {
      // keep the previous status
    }
  }, []);

  /**
   * Loads summary + transactions for the given filters. Responses from older requests are
   * ignored, so quickly switching filters can never show data for the wrong bank/month.
   */
  const loadData = useCallback(async (banks: BankCode[] = filtersRef.current.banks, month: string = filtersRef.current.month) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    const monthParam = month !== 'ALL' ? month : undefined;
    const bankParam = banks.length === 1 ? banks[0] : undefined;
    const isUnfiltered = banks.length === 0 && month === 'ALL';

    const [sumRes, txRes] = await Promise.allSettled([
      ApiClient.getSummary(banks, monthParam),
      ApiClient.getTransactions({ bank: bankParam, month: monthParam })
    ]);
    if (seq !== requestSeq.current) return; // a newer request superseded this one

    const failures: string[] = [];
    if (sumRes.status === 'fulfilled') {
      setSummary(sumRes.value);
      if (isUnfiltered) writeCache(SUMMARY_CACHE_KEY, sumRes.value);
    } else {
      failures.push(sumRes.reason?.message || 'resumen');
    }
    if (txRes.status === 'fulfilled') {
      let list = txRes.value.transactions;
      if (banks.length > 1) list = list.filter(tx => banks.includes(tx.bank));
      setTransactions(list);
      if (isUnfiltered) writeCache(TX_CACHE_KEY, list);
    } else {
      failures.push(txRes.reason?.message || 'movimientos');
    }

    setLoadError(failures.length > 0 ? failures[0] : null);
    if (failures.length === 0) lastLoadedAt.current = Date.now();
    setLoading(false);
  }, []);

  // Reload whenever filters change (and right after authenticating)
  useEffect(() => {
    if (isAuthenticated) loadData(selectedBanks, selectedMonth);
  }, [isAuthenticated, selectedBanks, selectedMonth, loadData]);

  // Gmail/auth status: once per authentication, not on every filter change
  useEffect(() => {
    if (isAuthenticated) refreshAuthStatus();
  }, [isAuthenticated, refreshAuthStatus]);

  // Refresh when the user comes back to the tab (other devices/syncs may have changed data)
  useEffect(() => {
    if (!isAuthenticated) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoadedAt.current > STALE_AFTER_MS) {
        loadData();
        refreshAuthStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [isAuthenticated, loadData, refreshAuthStatus]);

  // Drop a category filter that no longer exists in the current period
  useEffect(() => {
    if (selectedCategory && summary && !summary.categories.some(c => c.category === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [summary, selectedCategory]);

  const reportSync = useCallback((res: SyncResult, isResync = false) => {
    if (res.status === 'SUCCESS') {
      showToast(
        'success',
        res.newTransactionsCount > 0
          ? `¡Gmail escaneado! Se revisaron ${res.emailsProcessed} correos y se agregaron ${res.newTransactionsCount} movimientos${isResync && res.removedCount ? ` (se reemplazaron ${res.removedCount} anteriores)` : ''}.`
          : `¡Todo al día! Se revisaron ${res.emailsProcessed} correos y no hay movimientos nuevos.`
      );
    } else {
      showToast('error', res.error || 'Error al sincronizar con Gmail');
    }
  }, [showToast]);

  // Gmail OAuth callback (?auth_success / ?auth_error): runs once after authentication
  const oauthHandled = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || oauthHandled.current) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('auth_success') && !urlParams.has('auth_error')) return;
    oauthHandled.current = true;
    window.history.replaceState({}, document.title, window.location.pathname);

    if (urlParams.get('auth_success')) {
      showToast('success', '¡Cuenta de Gmail vinculada! Escaneando todos tus correos bancarios...');
      setIsSyncing(true);
      ApiClient.triggerResyncGmail()
        .then(res => reportSync(res, true))
        .catch(err => showToast('error', err?.message || 'Error al escanear Gmail'))
        .finally(() => {
          setIsSyncing(false);
          loadData();
          refreshAuthStatus();
        });
    } else {
      showToast('error', `Error al vincular Gmail: ${urlParams.get('auth_error')}`);
    }
  }, [isAuthenticated, showToast, reportSync, loadData, refreshAuthStatus]);

  const handleToggleBank = (bankCode: BankCode) => {
    setSelectedBanks(prev => (prev.includes(bankCode) ? prev.filter(b => b !== bankCode) : [bankCode]));
  };

  const handleSelectAllBanks = () => setSelectedBanks([]);

  const handleSync = async () => {
    if (!isGmailConnected) {
      showToast('error', needsReconnect
        ? 'Google revocó el acceso a Gmail. Vuelve a conectarlo en "Configurar Bancos".'
        : 'Gmail no está vinculado aún. Conéctalo en "Configurar Bancos" o sube tu estado de cuenta.');
      setIsBanksModalOpen(true);
      return;
    }
    setIsSyncing(true);
    try {
      reportSync(await ApiClient.triggerSyncGmail());
    } catch (err: any) {
      showToast('error', err?.message || 'Error al sincronizar con el servidor.');
    } finally {
      setIsSyncing(false);
      await Promise.all([loadData(), refreshAuthStatus()]);
    }
  };

  const handleResync = async () => {
    if (!window.confirm('¿Re-escanear todo el buzón? Se volverán a importar los movimientos que vienen de correos. Tus registros manuales y estados de cuenta se conservan.')) return;
    setIsSyncing(true);
    try {
      reportSync(await ApiClient.triggerResyncGmail(), true);
    } catch (err: any) {
      showToast('error', err?.message || 'Error al re-sincronizar con Gmail.');
    } finally {
      setIsSyncing(false);
      await Promise.all([loadData(), refreshAuthStatus()]);
    }
  };

  const handleCreateTransaction = async (data: CreateTransactionInput): Promise<boolean> => {
    try {
      await ApiClient.createTransaction(data);
      showToast('success', 'Movimiento registrado correctamente.');
      await loadData();
      return true;
    } catch (err: any) {
      showToast('error', err?.message || 'Error al crear la transacción');
      return false;
    }
  };

  const handleUpdateCategory = async (id: string, newCategory: Category) => {
    try {
      await ApiClient.updateTransaction(id, { category: newCategory });
      showToast('success', 'Categoría actualizada');
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Error al actualizar categoría');
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await ApiClient.updateTransaction(id, updates);
      showToast('success', 'Movimiento actualizado correctamente.');
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Error al actualizar el movimiento');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este movimiento?')) return;
    try {
      await ApiClient.deleteTransaction(id);
      // Optimistic removal keeps the list stable until the refresh arrives
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('success', 'Movimiento eliminado');
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Error al eliminar movimiento');
    }
  };

  const handleClearAllTransactions = async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de que deseas borrar TODAS las transacciones registradas? Esta acción limpiará todos los gastos, ingresos y datos de conciliación.')) {
      return;
    }
    try {
      await ApiClient.clearAllTransactions();
      showToast('success', 'Todas las transacciones han sido eliminadas correctamente.');
      await loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Error al borrar las transacciones.');
    }
  };

  const handleLogout = async () => {
    try {
      await ApiClient.logout2FA();
    } catch (e) {
      console.error('Logout error:', e);
    }
    lockApp();
  };

  // 1. Splash Screen while checking initial 2FA authentication
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#10131A] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-container/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-container via-primary to-secondary flex items-center justify-center shadow-[0_4px_24px_rgba(62,144,255,0.4)] animate-pulse">
            <span className="material-symbols-outlined text-white text-[28px]">account_balance_wallet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-medium text-slate-300">Verificando sesión segura...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Strict 2FA Authentication Gate Lock Screen
  if (!isAuthenticated) {
    return (
      <TwoFactorLockScreen
        requiresSetup={requires2FASetup}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          setRequires2FASetup(false);
        }}
      />
    );
  }

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      {/* Ambient Background Glow Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[650px] h-[650px] bg-primary-container/15 rounded-full blur-[140px]"></div>
        <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] bg-tertiary-container/10 rounded-full blur-[130px]"></div>
        <div className="absolute -bottom-20 left-1/3 w-[600px] h-[600px] bg-secondary-container/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Toast Notification */}
      <div className="fixed top-4 sm:top-6 left-4 right-4 sm:left-auto sm:right-6 z-[60] sm:max-w-md pointer-events-none" role="status" aria-live="polite">
      {notification && (
        <div className="animate-bounce-in pointer-events-auto">
          <div className={`p-4 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-xl ${
            notification.type === 'success'
              ? 'bg-secondary/15 text-secondary border-secondary/30'
              : 'bg-error-container/40 text-error border-error/30'
          }`}>
            <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">
              {notification.type === 'success' ? 'check_circle' : 'warning'}
            </span>
            <p className="text-[13px] font-medium leading-relaxed grow">{notification.message}</p>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Top Navbar */}
      <Navbar
        onSync={handleSync}
        isSyncing={isSyncing}
        onOpenAddModal={(type = 'EXPENSE') => {
          setAddModalType(type);
          setIsAddModalOpen(true);
        }}
        onOpenBanksModal={() => setIsBanksModalOpen(true)}
        onOpenStatementModal={() => setIsStatementModalOpen(true)}
        isGmailConnected={isGmailConnected}
        needsReconnect={needsReconnect}
        lastSyncAt={lastSyncAt}
        onLogout={handleLogout}
      />

      {/* Main Dashboard Container */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 min-w-0">
        {loadError && (
          <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-error-container/20 border border-error/30 text-error">
            <div className="flex items-start gap-3 min-w-0">
              <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">cloud_off</span>
              <p className="text-[13px] font-medium">
                No se pudieron actualizar los datos: {loadError}. {summary ? 'Se muestran los últimos datos disponibles.' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadData()}
              className="self-start sm:self-auto px-4 py-2 rounded-full bg-error/15 hover:bg-error/25 border border-error/40 text-[13px] font-semibold cursor-pointer whitespace-nowrap"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* BANNER HERO: AUTOMATIZACIÓN BANCARIA RD (Liquid Glass & Specular Gloss) */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/60 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)] border border-outline-variant/20">
          {/* Specular horizon beam */}
          <div className="absolute -top-32 left-1/3 w-96 h-96 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-28 right-12 w-80 h-80 bg-secondary/15 rounded-full blur-[90px] pointer-events-none"></div>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-fixed/40 to-transparent"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 max-w-3xl">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-high/80 backdrop-blur-xl flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.35)] shrink-0 border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-[32px]">hub</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-headline-lg text-xl sm:text-2xl text-on-surface tracking-tight font-bold">
                    Control de Gastos & Notificaciones Bancarias
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-[11px] font-semibold uppercase tracking-wider border border-primary/20">
                    RD Hub v3.5
                  </span>
                </div>
                <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">
                  Lectura automática de avisos bancarios de Promerica, Popular, BHD y Qik con categorización instantánea y conciliación con tu estado de cuenta.
                </p>
              </div>
            </div>

            {/* Pill Interactive Button Group */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
              <button
                onClick={() => setIsStatementModalOpen(true)}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-high/70 hover:bg-surface-bright text-on-surface font-body-sm text-[13px] font-medium transition-all shadow-[0_4px_16px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">receipt</span>
                <span>Estado de Cuenta</span>
              </button>
              <button
                onClick={() => setIsBanksModalOpen(true)}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-high/70 hover:bg-surface-bright text-on-surface font-body-sm text-[13px] font-medium transition-all shadow-[0_4px_16px_rgba(0,0,0,0.3)] border border-outline-variant/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Configurar Bancos</span>
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-secondary-container via-secondary to-primary-container text-on-secondary font-body-sm text-[13px] font-semibold transition-all shadow-[0_10px_24px_-4px_rgba(71,226,102,0.45)] hover:shadow-[0_14px_30px_-4px_rgba(71,226,102,0.65)] cursor-pointer disabled:opacity-70 disabled:cursor-wait"
              >
                <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true">{isSyncing ? 'sync' : 'mark_email_read'}</span>
                <span>{isSyncing ? 'Escaneando…' : 'Escanear Correos'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Filter Controls: Meses & Bancos */}
        <div className="flex flex-col items-stretch gap-3 min-w-0">
          <MonthFilterBar
            availableMonths={summary?.availableMonths}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />
          <BankFilterBar
            selectedBanks={selectedBanks}
            onToggleBank={handleToggleBank}
            onSelectAll={handleSelectAllBanks}
            lastSyncAt={lastSyncAt}
            availableBanks={summary?.byBank?.filter(b => b.count > 0).map(b => b.bank)}
          />
        </div>

        {/* 4 Bento KPI Summary Cards */}
        <SummaryCards summary={summary} loading={loading} />


        {/* 2-Column Analytics Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column (7 cols): Gastos por Categoría */}
          <div className="lg:col-span-7">
            <CategoryPieChart
              categories={summary?.categories || []}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedMonth={selectedMonth}
              totalExpenses={summary?.totalExpenses}
              loading={loading}
            />
          </div>

          {/* Right Column (5 cols): Flujo de Efectivo & Top Transacciones de Categoría */}
          <div className="lg:col-span-5">
            <MonthlyTrendChart
              data={summary?.monthlyTrend || []}
              totalIncome={summary?.totalIncome || 0}
              totalExpenses={summary?.totalExpenses || 0}
              netBalance={summary?.netBalance || 0}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categories={summary?.categories || []}
              transactions={transactions}
              selectedMonth={selectedMonth}
              usdRate={usdRate}
              loading={loading}
              topMerchants={summary?.topMerchants}
            />
          </div>
        </div>

        {/* Transactions Feed & Log */}
        <TransactionList
          transactions={transactions}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onUpdateCategory={handleUpdateCategory}
          onUpdateTransaction={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
          onClearAll={handleClearAllTransactions}
          loading={loading}
          usdRate={usdRate}
        />
      </main>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        initialType={addModalType}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateTransaction}
        usdRate={usdRate}
      />

      <BankConnectionModal
        isOpen={isBanksModalOpen}
        onClose={() => setIsBanksModalOpen(false)}
        isGmailConnected={isGmailConnected}
        needsReconnect={needsReconnect}
        lastSyncAt={lastSyncAt}
        onTransactionAdded={() => loadData()}
        onResync={handleResync}
        isSyncing={isSyncing}
      />

      <StatementSyncModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}

export default App;
