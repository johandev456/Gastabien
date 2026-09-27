import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { CategoryPieChart } from './components/CategoryPieChart';
import { MonthlyTrendChart } from './components/MonthlyTrendChart';
import { TransactionList } from './components/TransactionList';
import { AddTransactionModal } from './components/AddTransactionModal';
import { BankConnectionModal } from './components/BankConnectionModal';
import { StatementSyncModal } from './components/StatementSyncModal';
import { BankFilterBar } from './components/BankFilterBar';
import { ApiClient } from './api/client';
import { AnalyticsSummary, Transaction, Category } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [isBanksModalOpen, setIsBanksModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const loadData = async (banksToFilter = selectedBanks) => {
    try {
      setLoading(true);
      const bankParam = banksToFilter.length === 1 && banksToFilter[0] !== 'ALL' ? (banksToFilter[0] as any) : undefined;

      const [sumRes, txRes, authRes] = await Promise.allSettled([
        ApiClient.getSummary(banksToFilter),
        ApiClient.getTransactions({ bank: bankParam }),
        ApiClient.getAuthStatus()
      ]);

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
      }
      if (txRes.status === 'fulfilled') {
        let list = txRes.value.transactions;
        if (banksToFilter.length > 0 && !banksToFilter.includes('ALL')) {
          list = list.filter(tx => banksToFilter.includes(tx.bank));
        }
        setTransactions(list);
      }
      if (authRes.status === 'fulfilled') {
        setIsGmailConnected(authRes.value.user?.hasGmailConnected || false);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedBanks);

    // Check for auth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_success')) {
      showToast('success', '¡Cuenta de Gmail vinculada exitosamente! Escaneando correos bancarios...');
      setIsGmailConnected(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      ApiClient.triggerResyncGmail()
        .then(res => {
          showToast('success', `¡Escaneo completado! ${res.newTransactionsCount} movimientos registrados.`);
          loadData(selectedBanks);
        })
        .catch(err => {
          console.error(err);
          loadData(selectedBanks);
        });
    } else if (urlParams.get('auth_error')) {
      showToast('error', `Error al vincular Gmail: ${urlParams.get('auth_error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [selectedBanks]);

  const handleToggleBank = (bankCode: string) => {
    let nextBanks: string[];
    if (selectedBanks.includes(bankCode)) {
      nextBanks = selectedBanks.filter(b => b !== bankCode);
    } else {
      nextBanks = [bankCode];
    }
    setSelectedBanks(nextBanks);
  };

  const handleSelectAllBanks = () => {
    setSelectedBanks([]);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (isGmailConnected) {
        const res = await ApiClient.triggerSyncGmail();
        if (res.status === 'SUCCESS') {
          showToast(
            'success',
            res.newTransactionsCount > 0
              ? `¡Gmail escaneado con éxito! Se revisaron ${res.emailsProcessed} correos y se agregaron ${res.newTransactionsCount} movimientos nuevos.`
              : '¡Todo al día! No hay transacciones nuevas (todos los movimientos coinciden con el estado de cuenta).'
          );
        } else {
          showToast('error', (res as any).error || 'Error al sincronizar con Gmail');
        }
      } else {
        showToast('error', 'Gmail no está vinculado aún. Conecta Gmail en "Configurar Bancos" o sube tu Estado de Cuenta.');
      }
      await loadData(selectedBanks);
    } catch {
      showToast('error', 'Error al sincronizar con el servidor.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTransaction = async (data: any) => {
    try {
      await ApiClient.createTransaction(data);
      showToast('success', 'Movimiento registrado correctamente.');
      await loadData(selectedBanks);
    } catch {
      showToast('error', 'Error al crear la transacción');
    }
  };

  const handleUpdateCategory = async (id: string, newCategory: Category) => {
    try {
      await ApiClient.updateTransaction(id, { category: newCategory });
      showToast('success', 'Categoría actualizada');
      await loadData(selectedBanks);
    } catch {
      showToast('error', 'Error al actualizar categoría');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este movimiento?')) return;
    try {
      await ApiClient.deleteTransaction(id);
      showToast('success', 'Movimiento eliminado');
      await loadData(selectedBanks);
    } catch {
      showToast('error', 'Error al eliminar movimiento');
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container flex">
      {/* Ambient Background Glow Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[650px] h-[650px] bg-primary-container/15 rounded-full blur-[140px]"></div>
        <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] bg-tertiary-container/10 rounded-full blur-[130px]"></div>
        <div className="absolute -bottom-20 left-1/3 w-[600px] h-[600px] bg-secondary-container/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-bounce-in max-w-md">
          <div className={`p-4 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-xl ${
            notification.type === 'success'
              ? 'bg-secondary/15 text-secondary border-secondary/30'
              : 'bg-error-container/40 text-error border-error/30'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === 'success' ? 'check_circle' : 'warning'}
            </span>
            <p className="text-[13px] font-medium leading-relaxed">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenBanksModal={() => setIsBanksModalOpen(true)}
        isGmailConnected={isGmailConnected}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
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
        />

        {/* Main Dashboard Container */}
        <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
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
                    <span className="font-headline-lg text-xl sm:text-2xl text-on-surface tracking-tight font-bold">
                      Control de Gastos & Notificaciones Bancarias
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-[11px] font-semibold uppercase tracking-wider border border-primary/20">
                      RD Hub v3.4
                    </span>
                  </div>
                  <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">
                    Procesamiento autónomo y lectura en tiempo real de avisos transaccionales desde Banco Promerica, Popular, BHD y Qik con categorización instantánea.
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-secondary-container via-secondary to-primary-container text-on-secondary font-body-sm text-[13px] font-semibold transition-all shadow-[0_10px_24px_-4px_rgba(71,226,102,0.45)] hover:shadow-[0_14px_30px_-4px_rgba(71,226,102,0.65)] hover:scale-[1.02] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                  <span>{isSyncing ? 'Escaneando...' : 'Escanear Correos'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bank Segmented Filter Bar */}
          <BankFilterBar
            selectedBanks={selectedBanks}
            onToggleBank={handleToggleBank}
            onSelectAll={handleSelectAllBanks}
          />

          {/* 4 Bento KPI Summary Cards */}
          <SummaryCards summary={summary} loading={loading} />

          {/* 2-Column Analytics Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column (7 cols): Gastos por Categoría */}
            <div className="lg:col-span-7">
              <CategoryPieChart categories={summary?.categories || []} />
            </div>

            {/* Right Column (5 cols): Flujo de Efectivo */}
            <div className="lg:col-span-5">
              <MonthlyTrendChart
                data={summary?.monthlyTrend || []}
                totalIncome={summary?.totalIncome || 0}
                totalExpenses={summary?.totalExpenses || 0}
                netBalance={summary?.netBalance || 0}
              />
            </div>
          </div>

          {/* Transactions Feed & Log */}
          <TransactionList
            transactions={transactions}
            onUpdateCategory={handleUpdateCategory}
            onDelete={handleDeleteTransaction}
            loading={loading}
          />
        </main>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        initialType={addModalType}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateTransaction}
      />

      <BankConnectionModal
        isOpen={isBanksModalOpen}
        onClose={() => setIsBanksModalOpen(false)}
        isGmailConnected={isGmailConnected}
        onTransactionAdded={() => loadData(selectedBanks)}
      />

      <StatementSyncModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        onSuccess={() => loadData(selectedBanks)}
      />
    </div>
  );
}

export default App;
