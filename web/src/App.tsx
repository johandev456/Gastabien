import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { CategoryPieChart } from './components/CategoryPieChart';
import { MonthlyTrendChart } from './components/MonthlyTrendChart';
import { BankDistribution } from './components/BankDistribution';
import { TransactionList } from './components/TransactionList';
import { AddTransactionModal } from './components/AddTransactionModal';
import { BankConnectionModal } from './components/BankConnectionModal';
import { StatementSyncModal } from './components/StatementSyncModal';
import { BankFilterBar } from './components/BankFilterBar';
import { ApiClient } from './api/client';
import { AnalyticsSummary, Transaction, Category } from './types';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

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
    }, 4000);
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
      nextBanks = [bankCode]; // Single or switch bank
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
        const res = await ApiClient.triggerSimulateSync();
        showToast(
          'success',
          res.newTransactionsCount > 0
            ? `¡Sincronización completada! Se procesaron ${res.emailsProcessed} correos bancarios y se registraron ${res.newTransactionsCount} movimientos nuevos.`
            : '¡Todo al día! No hay transacciones nuevas (todos los movimientos ya coinciden con tu estado de cuenta).'
        );
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
      showToast('success', 'Movimiento registrado correctamente');
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

  const handleReset = async () => {
    if (!window.confirm('¿Deseas reiniciar y recargar los datos de prueba?')) return;
    try {
      await ApiClient.resetData();
      await ApiClient.triggerSimulateSync();
      showToast('success', 'Datos reiniciados con transacciones de prueba de RD');
      await loadData(selectedBanks);
    } catch {
      showToast('error', 'Error al reiniciar datos');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-emerald-500 selection:text-white pb-16">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-bounce-in max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800' 
              : 'bg-rose-950/90 text-rose-200 border-rose-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <p className="text-xs font-semibold">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        onSync={handleSync}
        isSyncing={isSyncing}
        onOpenAddModal={(type = 'EXPENSE') => {
          setAddModalType(type);
          setIsAddModalOpen(true);
        }}
        onOpenBanksModal={() => setIsBanksModalOpen(true)}
        onOpenStatementModal={() => setIsStatementModalOpen(true)}
        onReset={handleReset}
        isGmailConnected={isGmailConnected}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 flex-1 w-full">
        
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/40 p-6 rounded-3xl border border-emerald-900/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Automatización Bancaria RD
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Control de Gastos & Notificaciones de Bancos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Procesamiento automático de avisos de <strong>Banco Promerica, Popular, BHD y Qik</strong> con categorización inteligente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStatementModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>📑 Estado de Cuenta</span>
            </button>
            <button
              onClick={() => setIsBanksModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
            >
              Configurar Bancos
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-1.5"
            >
              <span>{isSyncing ? 'Sincronizando...' : 'Escanear Correos'}</span>
            </button>
          </div>
        </div>

        {/* Global Bank Filter Bar */}
        <BankFilterBar
          selectedBanks={selectedBanks}
          onToggleBank={handleToggleBank}
          onSelectAll={handleSelectAllBanks}
        />

        {/* KPI Financial Cards (Filtered by Selected Banks) */}
        <SummaryCards summary={summary} loading={loading} />

        {/* Analytics & Charts Grid (Filtered by Selected Banks) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Category Breakdown (7 cols) */}
          <div className="lg:col-span-7">
            <CategoryPieChart categories={summary?.categories || []} />
          </div>

          {/* Monthly Trend (5 cols) */}
          <div className="lg:col-span-5">
            <MonthlyTrendChart data={summary?.monthlyTrend || []} />
          </div>

        </div>

        {/* Bank Institutions (Clickable to Filter) */}
        <BankDistribution
          banks={summary?.byBank || []}
          selectedBanks={selectedBanks}
          onSelectBank={handleToggleBank}
        />

        {/* Transaction History & Live Table (Filtered by Selected Banks) */}
        <TransactionList
          transactions={transactions}
          onUpdateCategory={handleUpdateCategory}
          onDelete={handleDeleteTransaction}
          loading={loading}
        />

      </main>

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
        onSimulateSync={handleSync}
        onTransactionAdded={() => loadData(selectedBanks)}
      />

      <StatementSyncModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        onSuccess={() => {
          showToast('success', '¡Estado de cuenta procesado y balances actualizados!');
          loadData(selectedBanks);
        }}
        defaultBank={(selectedBanks.length === 1 && selectedBanks[0] !== 'ALL') ? (selectedBanks[0] as any) : 'PROMERICA'}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-900 pt-8 text-center text-xs text-slate-500">
        <p>GastaBien RD • Sincronización Automática con Gmail y Bancos Dominicanos</p>
      </footer>

    </div>
  );
}
export default App;
