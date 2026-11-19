export type BankCode = 'POPULAR' | 'BHD' | 'PROMERICA' | 'QIK' | 'MANUAL';

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type Category = 
  | 'Combustible'
  | 'Supermercados'
  | 'Restaurantes y Comida'
  | 'Bares y Vida Nocturna'
  | 'Entretenimiento y Suscripciones'
  | 'Servicios y Facturas'
  | 'Salud y Farmacias'
  | 'Compras y Retail'
  | 'Transporte y Viajes'
  | 'Transferencias y Pagos'
  | 'Retiro de Efectivo'
  | 'Ingresos y Nómina'
  | 'Otros Gastos';

export interface Transaction {
  id: string;
  userId: string;
  externalId?: string;
  bank: BankCode;
  bankName: string;
  type: TransactionType;
  amount: number;
  currency: 'DOP' | 'USD';
  amountInDop?: number;
  exchangeRate?: number;
  merchant: string;
  accountReference?: string;
  date: string;
  rawSubject?: string;
  rawSender?: string;
  description?: string;
  category: Category;
  confidenceScore?: number;
  notes?: string;
  isManual?: boolean;
  categoryOverridden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  category: Category;
  total: number;
  count: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface BankDistribution {
  bank: BankCode;
  bankName: string;
  totalExpenses: number;
  totalIncome: number;
  count: number;
  color: string;
}

export interface MonthlyTrend {
  month: string;
  expenses: number;
  income: number;
}

export interface TopMerchant {
  merchant: string;
  total: number;
  count: number;
  category: Category;
  percentage: number;
  lastDate: string;
}

export interface AuthStatus {
  connected: boolean;
  hasGoogleAuth?: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    lastSyncAt?: string;
    needsReconnect?: boolean;
    hasGmailConnected: boolean;
  } | null;
}

export interface SyncResult {
  status: 'SUCCESS' | 'FAILED' | string;
  emailsProcessed: number;
  newTransactionsCount: number;
  removedCount?: number;
  error?: string;
}

export interface CreateTransactionInput {
  merchant: string;
  amount: number;
  currency?: 'DOP' | 'USD';
  category?: Category;
  bank?: BankCode;
  bankName?: string;
  type?: TransactionType;
  /** YYYY-MM-DD (DR local day) or full ISO string */
  date?: string;
  notes?: string;
}

export interface AnalyticsSummary {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  currency: 'DOP';
  usdToDopRate?: number;
  transactionsCount: number;
  categories: CategorySummary[];
  byBank: BankDistribution[];
  recentTransactions: Transaction[];
  topMerchants?: TopMerchant[];
  merchantsCount?: number;
  expenseCount?: number;
  averageExpense?: number;
  largestExpense?: Transaction | null;
  monthlyTrend: MonthlyTrend[];
  availableMonths?: string[];
  selectedMonth?: string;
}


export interface StatementEntry {
  date: string;
  rawDate: string;
  description: string;
  amount: number;
  currency: 'DOP' | 'USD';
  type: TransactionType;
  reference?: string;
}

export interface ReconciliationReport {
  totalStatementEntries: number;
  matchedCount: number;
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  totalIncomeAmount: number;
  totalExpenseAmount: number;
  items: {
    entry: StatementEntry;
    status: 'MATCHED' | 'ADDED' | 'UPDATED' | 'REMOVED';
    matchedTransactionId?: string;
    details: string;
  }[];
}

