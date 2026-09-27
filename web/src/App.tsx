import { useState, useEffect } from 'react';
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
        showToast('error', 'Gmail no está vinculado aún. Conecta Gmail en "Bancos RD" o sube tu Estado de Cuenta.');
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
    <div className="relative min-h-screen">
      {/* Retro CRT Overlays */}
      <div className="crt-scanlines"></div>
      <div className="crt-vignette"></div>

      {/* Ambient Retro Glows */}
      <div className="fixed top-0 left-1/4 w-[400px] h-[300px] bg-arcade-purple/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[300px] bg-arcade-blue/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Retro Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-bounce-in max-w-md">
          <div className={`p-4 border-2 shadow-[4px_4px_0px_#000] font-pixel text-[9px] flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-[#092015] text-[#39ff14] border-[#39ff14]'
              : 'bg-[#2b0b14] text-[#ff3344] border-[#ff3344]'
          }`}>
            <span>{notification.type === 'success' ? '★' : '⚠️'}</span>
            <p className="leading-relaxed">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-12">
        {/* Top Arcade Status Banner & Header */}
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

        {/* Quest / Stage Dialogue Banner */}
        <section className="retro-box-gold p-4 sm:p-5 mb-6" data-purpose="hero-banner">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center space-x-2 bg-black border border-arcade-green px-2.5 py-1 mb-2 font-pixel text-[9px] text-arcade-green shadow-[2px_2px_0px_#000]">
                <span className="animate-retro-blink font-bold">★</span>
                <span>STAGE 01: AUTOMATIZACIÓN BANCARIA RD</span>
              </div>
              <h2 className="text-base sm:text-xl font-pixel text-white leading-relaxed pixel-text-shadow">
                CONTROL DE GASTOS & NOTIFICACIONES
              </h2>
              <p className="font-vt text-lg text-amber-200 mt-1 tracking-wider">
                &gt; PROCESAMIENTO AUTOMÁTICO: <span className="text-arcade-cyan font-bold">PROMERICA, POPULAR, BHD Y QIK</span> CON INTELIGENCIA ARTIFICIAL.
              </p>
            </div>

            {/* Stage Options / Quests */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsStatementModalOpen(true)}
                className="pixel-btn pixel-btn-dark"
              >
                <span>📜 ESTADO DE CUENTA</span>
              </button>
              <button
                onClick={() => setIsBanksModalOpen(true)}
                className="pixel-btn pixel-btn-dark"
              >
                <span>⚙ BANCOS RD</span>
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="pixel-btn pixel-btn-primary"
              >
                <span>✉ {isSyncing ? 'ESCANEANDO...' : 'ESCANEAR CORREOS'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Bank Filter Bar */}
        <BankFilterBar
          selectedBanks={selectedBanks}
          onToggleBank={handleToggleBank}
          onSelectAll={handleSelectAllBanks}
        />

        {/* Financial KPI Summary (Arcade Player HUD / Scoreboard) */}
        <SummaryCards summary={summary} loading={loading} />

        {/* Gamified Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Category Inventory & Radar Breakdown */}
          <div className="lg:col-span-7">
            <CategoryPieChart categories={summary?.categories || []} />
          </div>

          {/* Right: Income vs Expenses Power Meters */}
          <div className="lg:col-span-5">
            <MonthlyTrendChart
              data={summary?.monthlyTrend || []}
              totalIncome={summary?.totalIncome || 0}
              totalExpenses={summary?.totalExpenses || 0}
            />
          </div>
        </div>

        {/* Transactions Quest Log */}
        <TransactionList
          transactions={transactions}
          onUpdateCategory={handleUpdateCategory}
          onDelete={handleDeleteTransaction}
          loading={loading}
        />

        {/* Arcade Page Footer */}
        <footer className="mt-8 text-center" data-purpose="page-footer">
          <div className="inline-flex items-center space-x-2.5 bg-[#060b18] border-2 border-[#ffcc00] px-5 py-2.5 font-pixel text-[8px] text-slate-200 shadow-[4px_4px_0px_#000]">
            <span className="text-[#ffcc00]">🕹️</span>
            <span className="tracking-wider">GASTABIEN RD • 16-BIT RETRO GAMING HUD • DOMINICAN REPUBLIC FINANCIAL ENGINE</span>
            <span className="text-[#39ff14] animate-retro-blink">●</span>
          </div>
        </footer>
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
