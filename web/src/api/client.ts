import { AnalyticsSummary, Transaction, BankCode, Category, ReconciliationReport, AuthStatus, SyncResult, CreateTransactionInput } from '../types';

const getApiBase = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  
  // Dev server (also when opened from a phone on the LAN) uses the Vite /api proxy
  if (import.meta.env.DEV) return '/api';

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Served by the backend itself or a local preview: same-origin API
    if (['localhost', '127.0.0.1'].includes(host) || host.endsWith('onrender.com')) {
      return '/api';
    }
  }

  // Hosted on Vercel/Netlify: live Render backend
  return 'https://gastabien.onrender.com/api';
};

const API_BASE = getApiBase();
const USER_ID = 'demo-user-id';
const TOKEN_KEY = 'gastabien_2fa_device_session';
const DEVICE_ID_KEY = 'gastabien_2fa_device_id';
const CACHE_KEYS = ['gastabien_cached_summary', 'gastabien_cached_transactions'];
const REQUEST_TIMEOUT_MS = 30_000;

/** Error carrying the HTTP status and the server's readable message. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

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

  /** Removes the token AND cached financial data (logout / revoked session on shared devices). */
  public static clearLocalData(): void {
    this.clearSessionToken();
    if (typeof window !== 'undefined') {
      try {
        CACHE_KEYS.forEach(k => localStorage.removeItem(k));
      } catch {
        // storage unavailable
      }
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

  private static async request<T>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    const token = this.getSessionToken();
    const { timeoutMs = REQUEST_TIMEOUT_MS, signal: externalSignal, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      // Only send a JSON content type when there is a body (avoids needless CORS preflights)
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      'x-user-id': USER_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((fetchOptions.headers as Record<string, string>) || {})
    };

    // Timeout (Render cold starts can hang) + optional caller abort signal
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
    const onExternalAbort = () => controller.abort(externalSignal?.reason);
    externalSignal?.addEventListener('abort', onExternalAbort);

    try {
      const res = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
      const raw = await res.text();
      let body: any = null;
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
      }

      if (!res.ok) {
        const code = body && typeof body === 'object' ? body.error : undefined;
        if (res.status === 401 && code === '2FA_REQUIRED') {
          this.clearLocalData();
          window.dispatchEvent(new CustomEvent('gastabien:2fa_required'));
        }
        const message =
          (body && typeof body === 'object' && (body.message || (body.error !== '2FA_REQUIRED' ? body.error : undefined))) ||
          (typeof body === 'string' && body.length < 200 ? body : '') ||
          `Error ${res.status}${res.statusText ? `: ${res.statusText}` : ''}`;
        throw new ApiError(message, res.status, code);
      }
      return body as T;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
        if (externalSignal?.aborted) throw err;
        throw new ApiError('El servidor tardó demasiado en responder. Puede estar despertando; inténtalo de nuevo en unos segundos.', 0, 'TIMEOUT');
      }
      if (err instanceof TypeError) {
        throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión a internet.', 0, 'NETWORK');
      }
      throw err;
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  // ==========================================
  // 2FA TWO-FACTOR AUTHENTICATION API METHODS
  // ==========================================

  public static async get2FAStatus(): Promise<TwoFactorStatusResponse> {
    return this.request<TwoFactorStatusResponse>('/auth/2fa/status');
  }

  public static async setup2FA(): Promise<TwoFactorSetupResponse> {
    return this.request<TwoFactorSetupResponse>('/auth/2fa/setup', {
      method: 'POST'
    });
  }

  public static async verify2FA(code: string, isSetup = false): Promise<TwoFactorVerifyResponse> {
    const deviceId = this.getDeviceId();
    const res = await this.request<TwoFactorVerifyResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({
        code,
        isSetup,
        deviceId
      })
    });

    if (res.success && res.token) {
      this.setSessionToken(res.token);
    }
    return res;
  }

  /** Requires an authorized session, or a backup code when locked out. */
  public static async reset2FA(backupCode?: string): Promise<{ success: boolean; message: string }> {
    const res = await this.request<{ success: boolean; message: string }>('/auth/2fa/reset', {
      method: 'POST',
      body: JSON.stringify(backupCode ? { backupCode } : {})
    });
    this.clearLocalData();
    return res;
  }

  public static async logout2FA(): Promise<{ success: boolean }> {
    try {
      const token = this.getSessionToken();
      await this.request<{ success: boolean }>('/auth/2fa/logout', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
    } finally {
      this.clearLocalData();
    }
    return { success: true };
  }

  // ==========================================
  // CORE FINANCIAL API METHODS
  // ==========================================

  public static async getSummary(banks?: string[], month?: string, signal?: AbortSignal): Promise<AnalyticsSummary> {
    const params = new URLSearchParams();
    if (banks && banks.length > 0 && !banks.includes('ALL')) {
      params.append('banks', banks.join(','));
    }
    if (month && month !== 'ALL') {
      params.append('month', month);
    }
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request<AnalyticsSummary>(`/analytics/summary${queryStr}`, { signal });
  }

  public static async getTransactions(filters?: {
    bank?: BankCode;
    category?: Category;
    type?: string;
    search?: string;
    month?: string;
  }, signal?: AbortSignal): Promise<{ count: number; transactions: Transaction[] }> {
    const params = new URLSearchParams();
    if (filters?.bank) params.append('bank', filters.bank);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.month && filters.month !== 'ALL') params.append('month', filters.month);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ count: number; transactions: Transaction[] }>(`/transactions${queryStr}`, { signal });
  }


  public static async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
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

  public static async triggerSyncGmail(): Promise<SyncResult> {
    return this.request<SyncResult>('/sync/gmail', {
      method: 'POST',
      timeoutMs: 120_000
    });
  }

  /** Re-imports Gmail-sourced transactions only (manual and statement data are kept). */
  public static async triggerResyncGmail(): Promise<SyncResult> {
    return this.request<SyncResult>('/sync/resync', {
      method: 'POST',
      timeoutMs: 180_000
    });
  }

  public static async clearAllData(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/transactions', {
      method: 'DELETE'
    });
  }

  public static async clearAllTransactions(): Promise<{ success: boolean; message: string }> {
    return this.clearAllData();
  }

  public static async parseRawEmail(data: { sender?: string; subject?: string; body: string }): Promise<{ success: boolean; message?: string; transaction: Transaction }> {
    return this.request<{ success: boolean; message?: string; transaction: Transaction }>('/sync/parse-raw', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static async getAuthStatus(): Promise<AuthStatus> {
    return this.request<AuthStatus>('/auth/status');
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
      timeoutMs: 90_000,
      body: JSON.stringify({ text, bank, autoImport })
    });
  }
}
