import path from 'path';
import fs from 'fs';
import { Transaction, Category, BankCode } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  google_refresh_token?: string;
  google_access_token?: string;
  token_expiry?: number;
  created_at: string;
  last_sync_at?: string;
}

interface SyncLogRecord {
  id: string;
  user_id: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  emails_processed: number;
  transactions_found: number;
  error_message?: string;
  created_at: string;
}

interface DatabaseSchema {
  users: Record<string, UserRecord>;
  transactions: Record<string, Transaction>;
  sync_logs: SyncLogRecord[];
}

const DB_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'gastabien_store.json');

let memoryDb: DatabaseSchema = {
  users: {},
  transactions: {},
  sync_logs: []
};

function saveDatabase() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(memoryDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

export function initDatabase() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(content);
    }
  } catch (err) {
    console.warn('Could not read existing database, initializing new memory database:', err);
    memoryDb = { users: {}, transactions: {}, sync_logs: [] };
  }

  // Ensure default demo user exists
  if (!memoryDb.users['demo-user-id']) {
    memoryDb.users['demo-user-id'] = {
      id: 'demo-user-id',
      email: 'usuario.demo@gastabien.com',
      name: 'Usuario Demo RD',
      created_at: new Date().toISOString()
    };
    saveDatabase();
  }
}

// Database helper operations
export const dbOps = {
  getUser(userId: string): UserRecord | undefined {
    return memoryDb.users[userId];
  },

  getUserByEmail(email: string): UserRecord | undefined {
    return Object.values(memoryDb.users).find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  upsertUser(user: { id?: string; email: string; name?: string; refresh_token?: string; access_token?: string; token_expiry?: number }): string {
    const existing = this.getUserByEmail(user.email);
    const now = new Date().toISOString();
    if (existing) {
      existing.name = user.name || existing.name;
      existing.google_refresh_token = user.refresh_token || existing.google_refresh_token;
      existing.google_access_token = user.access_token || existing.google_access_token;
      existing.token_expiry = user.token_expiry || existing.token_expiry;
      existing.last_sync_at = now;
      saveDatabase();
      return existing.id;
    } else {
      const id = user.id || uuidv4();
      memoryDb.users[id] = {
        id,
        email: user.email,
        name: user.name,
        google_refresh_token: user.refresh_token,
        google_access_token: user.access_token,
        token_expiry: user.token_expiry,
        created_at: now,
        last_sync_at: now
      };
      saveDatabase();
      return id;
    }
  },

  updateUserLastSync(userId: string) {
    if (memoryDb.users[userId]) {
      memoryDb.users[userId].last_sync_at = new Date().toISOString();
      saveDatabase();
    }
  },

  transactionExists(userId: string, externalId: string): boolean {
    if (!externalId) return false;
    return Object.values(memoryDb.transactions).some(tx => tx.userId === userId && tx.externalId === externalId);
  },

  createTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Transaction {
    const id = tx.id || uuidv4();
    const now = new Date().toISOString();

    const newTx: Transaction = {
      id,
      userId: tx.userId,
      externalId: tx.externalId,
      bank: tx.bank,
      bankName: tx.bankName,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency || 'DOP',
      merchant: tx.merchant,
      accountReference: tx.accountReference,
      date: tx.date,
      rawSubject: tx.rawSubject,
      rawSender: tx.rawSender,
      description: tx.description,
      category: tx.category,
      confidenceScore: tx.confidenceScore || 1.0,
      notes: tx.notes,
      isManual: tx.isManual || false,
      createdAt: now,
      updatedAt: now
    };

    memoryDb.transactions[id] = newTx;
    saveDatabase();
    return newTx;
  },

  getTransactions(userId: string, filters?: { bank?: BankCode; category?: Category; type?: string; search?: string; limit?: number; offset?: number }): Transaction[] {
    let list = Object.values(memoryDb.transactions).filter(tx => tx.userId === userId);

    if (filters?.bank) {
      list = list.filter(tx => tx.bank === filters.bank);
    }
    if (filters?.category) {
      list = list.filter(tx => tx.category === filters.category);
    }
    if (filters?.type) {
      list = list.filter(tx => tx.type === filters.type);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(tx => 
        tx.merchant.toLowerCase().includes(s) || 
        (tx.description && tx.description.toLowerCase().includes(s)) ||
        (tx.notes && tx.notes.toLowerCase().includes(s))
      );
    }

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (filters?.offset) {
      list = list.slice(filters.offset);
    }
    if (filters?.limit) {
      list = list.slice(0, filters.limit);
    }

    return list;
  },

  getTransactionById(userId: string, id: string): Transaction | null {
    const tx = memoryDb.transactions[id];
    if (tx && tx.userId === userId) {
      return tx;
    }
    return null;
  },

  updateTransaction(userId: string, id: string, updates: Partial<Transaction>): boolean {
    const tx = memoryDb.transactions[id];
    if (!tx || tx.userId !== userId) return false;

    if (updates.category !== undefined) tx.category = updates.category;
    if (updates.merchant !== undefined) tx.merchant = updates.merchant;
    if (updates.amount !== undefined) tx.amount = updates.amount;
    if (updates.notes !== undefined) tx.notes = updates.notes;
    if (updates.type !== undefined) tx.type = updates.type;
    if (updates.date !== undefined) tx.date = updates.date;

    tx.updatedAt = new Date().toISOString();
    saveDatabase();
    return true;
  },

  deleteTransaction(userId: string, id: string): boolean {
    const tx = memoryDb.transactions[id];
    if (!tx || tx.userId !== userId) return false;

    delete memoryDb.transactions[id];
    saveDatabase();
    return true;
  },

  logSync(userId: string, status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS', emailsProcessed: number, transactionsFound: number, errorMessage?: string) {
    const log: SyncLogRecord = {
      id: uuidv4(),
      user_id: userId,
      status,
      emails_processed: emailsProcessed,
      transactions_found: transactionsFound,
      error_message: errorMessage,
      created_at: new Date().toISOString()
    };
    memoryDb.sync_logs.unshift(log);
    if (memoryDb.sync_logs.length > 100) {
      memoryDb.sync_logs = memoryDb.sync_logs.slice(0, 100);
    }
    saveDatabase();
  },

  clearAllData(userId: string) {
    for (const [id, tx] of Object.entries(memoryDb.transactions)) {
      if (tx.userId === userId) {
        delete memoryDb.transactions[id];
      }
    }
    memoryDb.sync_logs = memoryDb.sync_logs.filter(l => l.user_id !== userId);
    saveDatabase();
  }
};
