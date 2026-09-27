import { AnalyticsSummary, Transaction, BankCode, Category, ReconciliationReport } from '../types';

const getApiBase = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) return '/api';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE = getApiBase();
const USER_ID = 'demo-user-id';

export class ApiClient {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
      ...(options.headers || {})
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`API call failed for ${url}, fallback to local simulated mode:`, err);
      throw err;
    }
  }

  public static async getSummary(banks?: string[]): Promise<AnalyticsSummary> {
    const params = new URLSearchParams();
    if (banks && banks.length > 0 && !banks.includes('ALL')) {
      params.append('banks', banks.join(','));
    }
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request<AnalyticsSummary>(`/analytics/summary${queryStr}`);
  }

  public static async getTransactions(filters?: {
    bank?: BankCode;
    category?: Category;
    type?: string;
    search?: string;
  }): Promise<{ count: number; transactions: Transaction[] }> {
    const params = new URLSearchParams();
    if (filters?.bank) params.append('bank', filters.bank);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ count: number; transactions: Transaction[] }>(`/transactions${queryStr}`);
  }

  public static async createTransaction(data: {
    merchant: string;
    amount: number;
    category?: Category;
    bank?: BankCode;
    bankName?: string;
    type?: 'EXPENSE' | 'INCOME';
    date?: string;
    notes?: string;
  }): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  public static async deleteTransaction(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/transactions/${id}`, {
      method: 'DELETE'
    });
  }

  public static async triggerSyncGmail(): Promise<{ status: string; emailsProcessed: number; newTransactionsCount: number }> {
    return this.request<{ status: string; emailsProcessed: number; newTransactionsCount: number }>('/sync/gmail', {
      method: 'POST'
    });
  }

  public static async triggerResyncGmail(): Promise<{ status: string; emailsProcessed: number; newTransactionsCount: number }> {
    return this.request<{ status: string; emailsProcessed: number; newTransactionsCount: number }>('/sync/resync', {
      method: 'POST'
    });
  }

  public static async triggerSimulateSync(): Promise<{ status: string; emailsProcessed: number; newTransactionsCount: number; transactions: Transaction[] }> {
    return this.request<{ status: string; emailsProcessed: number; newTransactionsCount: number; transactions: Transaction[] }>('/sync/simulate', {
      method: 'POST'
    });
  }

  public static async parseRawEmail(data: { sender?: string; subject?: string; body: string }): Promise<{ success: boolean; message: string; transaction: Transaction }> {
    return this.request<{ success: boolean; message: string; transaction: Transaction }>('/sync/parse-raw', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static async syncStatement(data: { text: string; bank?: BankCode; autoImport?: boolean }): Promise<{
    success: boolean;
    message: string;
    report: ReconciliationReport;
  }> {
    return this.request<{ success: boolean; message: string; report: ReconciliationReport }>('/statement/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static async resetData(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/sync/reset', {
      method: 'POST'
    });
  }

  public static async getAuthStatus(): Promise<{ connected: boolean; user: any }> {
    return this.request<{ connected: boolean; user: any }>('/auth/status');
  }

  public static async getGoogleAuthUrl(): Promise<{ configured: boolean; url: string | null }> {
    return this.request<{ configured: boolean; url: string | null }>('/auth/google/url');
  }

  public static async saveGoogleConfig(data: { clientId: string; clientSecret: string }): Promise<{ success: boolean; message: string; configured: boolean }> {
    return this.request<{ success: boolean; message: string; configured: boolean }>('/auth/google/config', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}
