export type BankCode = 'POPULAR' | 'BHD' | 'PROMERICA' | 'QIK' | 'MANUAL';

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type Category = 
  | 'Combustible'
  | 'Supermercados'
  | 'Restaurantes y Comida'
  | 'Entretenimiento y Suscripciones'
  | 'Servicios y Facturas'
  | 'Salud y Farmacias'
  | 'Compras y Retail'
  | 'Transporte y Viajes'
  | 'Transferencias y Pagos'
  | 'Retiro de Efectivo'
  | 'Ingresos y Nómina'
  | 'Otros Gastos';

export interface RawEmailData {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  date: Date;
  bodySnippet: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface ParsedTransaction {
  externalId?: string; // e.g. email ID or approval code
  bank: BankCode;
  bankName: string;
  type: TransactionType;
  amount: number;
  currency: 'DOP' | 'USD';
  merchant: string;
  accountReference?: string; // e.g. "Tarjeta ...4829" or "Cta ...1029"
  date: string; // ISO format or YYYY-MM-DD HH:mm:ss
  rawSubject?: string;
  rawSender?: string;
  description?: string;
}

export interface Transaction extends ParsedTransaction {
  id: string;
  userId: string;
  category: Category;
  confidenceScore?: number;
  notes?: string;
  isManual?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankConfig {
  code: BankCode;
  name: string;
  color: string;
  logo: string;
  senders: string[];
  supportedTypes: TransactionType[];
}

export interface CategorySummary {
  category: Category;
  total: number;
  count: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface AnalyticsSummary {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  currency: 'DOP';
  transactionsCount: number;
  categories: CategorySummary[];
  byBank: {
    bank: BankCode;
    bankName: string;
    totalExpenses: number;
    totalIncome: number;
    count: number;
    color: string;
  }[];
  recentTransactions: Transaction[];
  monthlyTrend: {
    month: string;
    expenses: number;
    income: number;
  }[];
}
