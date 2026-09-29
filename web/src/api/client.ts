import { AnalyticsSummary, Transaction, BankCode, Category, ReconciliationReport } from '../types';

const getApiBase = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  
  // Auto-connect to live Render backend if hosted on Vercel or any remote domain
  if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'https://gastabien.onrender.com/api';
  }
  
  return '/api';
};

const API_BASE = getApiBase();
const USER_ID = 'demo-user-id';
const TOKEN_KEY = 'gastabien_2fa_device_session';
const DEVICE_ID_KEY = 'gastabien_2fa_device_id';

export interface TwoFactorStatusResponse {
  is2FAEnabled: boolean;
  isAuthenticated: boolean;
  requiresSetup: boolean;
  backupCodesRemaining: number;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  secret: string;
  otpAuthUrl: string;
  qrCodeUrl: string;
  backupCodes: string[];
  issuer: string;
  accountName: string;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  token: string;
  message: string;
  backupCodes?: string[];
  error?: string;
}

export class ApiClient {
  public static getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  public static hasSessionToken(): boolean {
    return !!this.getSessionToken();
  }

  public static setSessionToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  public static clearSessionToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  public static getDeviceId(): string {
    if (typeof window === 'undefined') return 'browser-device';
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    const token = this.getSessionToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
      ...(token ? { Authorization: `Bearer ${token}`, 'x-device-token': token } : {}),
      ...((options.headers as any) || {})
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        if (res.status === 401) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === '2FA_REQUIRED') {
            this.clearSessionToken();
            window.dispatchEvent(new CustomEvent('gastabien:2fa_required'));
          }
        }
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(`Error ${res.status}: ${errorText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`API call failed for ${url}:`, err);
      throw err;
    }
  }

  // ==========================================
  // 2FA TWO-FACTOR AUTHENTICATION API METHODS
  // ==========================================

  public static async get2FAStatus(): Promise<TwoFactorStatusResponse> {
    const token = this.getSessionToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return this.request<TwoFactorStatusResponse>(`/auth/2fa/status${query}`);
  }

  public static async setup2FA(): Promise<TwoFactorSetupResponse> {
    return this.request<TwoFactorSetupResponse>('/auth/2fa/setup', {
      method: 'POST'
    });
  }

  public static async verify2FA(code: string, isSetup = false, secret?: string): Promise<TwoFactorVerifyResponse> {
    const deviceId = this.getDeviceId();
    const res = await this.request<TwoFactorVerifyResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({
        code,
        isSetup,
        secret,
        deviceId
      })
    });

    if (res.success && res.token) {
      this.setSessionToken(res.token);
    }
    return res;
  }

  public static async reset2FA(): Promise<{ success: boolean; message: string }> {
    this.clearSessionToken();
    return this.request<{ success: boolean; message: string }>('/auth/2fa/reset', {
      method: 'POST'
    });
  }

  public static async logout2FA(): Promise<{ success: boolean }> {
    try {
      const token = this.getSessionToken();
      await this.request<{ success: boolean }>('/auth/2fa/logout', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
    } finally {
      this.clearSessionToken();
    }
    return { success: true };
  }

  // ==========================================
  // CORE FINANCIAL API METHODS
  // ==========================================

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
    return this.request<{ status: string; emailsProcessed: number; newTransactionsCount: number }>('/sync/gmail/resync', {
      method: 'POST'
    });
  }

  public static async clearAllData(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/transactions/clear-all', {
      method: 'POST'
    });
  }

  public static async clearAllTransactions(): Promise<{ success: boolean; message: string }> {
    return this.clearAllData();
  }

  public static async parseRawEmail(data: { sender?: string; subject?: string; body: string }): Promise<{ success: boolean; transaction: Transaction }> {
    return this.request<{ success: boolean; transaction: Transaction }>('/banks/parse-email', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static async getAuthStatus(): Promise<{
    connected: boolean;
    user: {
      id: string;
      email: string;
      name?: string;
      lastSyncAt?: string;
      hasGmailConnected: boolean;
    } | null;
  }> {
    return this.request<{
      connected: boolean;
      user: {
        id: string;
        email: string;
        name?: string;
        lastSyncAt?: string;
        hasGmailConnected: boolean;
      } | null;
    }>('/auth/status');
  }

  public static async getGoogleAuthUrl(): Promise<{ configured: boolean; url: string | null; message?: string }> {
    return this.request<{ configured: boolean; url: string | null; message?: string }>('/auth/google/url');
  }

  public static async saveGoogleConfig(
    configOrClientId: { clientId: string; clientSecret: string } | string,
    maybeSecret?: string
  ): Promise<{ success: boolean; message: string }> {
    let clientId: string;
    let clientSecret: string;
    if (typeof configOrClientId === 'object') {
      clientId = configOrClientId.clientId;
      clientSecret = configOrClientId.clientSecret;
    } else {
      clientId = configOrClientId;
      clientSecret = maybeSecret || '';
    }
    return this.request<{ success: boolean; message: string }>('/auth/google/config', {
      method: 'POST',
      body: JSON.stringify({ clientId, clientSecret })
    });
  }

  public static async syncStatement(
    dataOrText: { text: string; bank: string; autoImport?: boolean } | string,
    maybeBank?: string
  ): Promise<{ success: boolean; message: string; report?: ReconciliationReport }> {
    let text: string;
    let bank: string;
    let autoImport: boolean = true;
    if (typeof dataOrText === 'object') {
      text = dataOrText.text;
      bank = dataOrText.bank;
      autoImport = dataOrText.autoImport ?? true;
    } else {
      text = dataOrText;
      bank = maybeBank || 'PROMERICA';
    }
    return this.request<{ success: boolean; message: string; report?: ReconciliationReport }>('/statement/sync', {
      method: 'POST',
      body: JSON.stringify({ text, bank, autoImport })
    });
  }
}
