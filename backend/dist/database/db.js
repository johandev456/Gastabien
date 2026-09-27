"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbOps = void 0;
exports.initDatabase = initDatabase;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const DB_DIR = path_1.default.resolve(__dirname, '../../data');
const DB_FILE = path_1.default.join(DB_DIR, 'gastabien_store.json');
let memoryDb = {
    users: {},
    transactions: {},
    sync_logs: []
};
function saveDatabase() {
    try {
        if (!fs_1.default.existsSync(DB_DIR)) {
            fs_1.default.mkdirSync(DB_DIR, { recursive: true });
        }
        const tempFile = `${DB_FILE}.tmp`;
        fs_1.default.writeFileSync(tempFile, JSON.stringify(memoryDb, null, 2), 'utf-8');
        fs_1.default.renameSync(tempFile, DB_FILE);
    }
    catch (err) {
        console.error('Error saving database:', err);
    }
}
function initDatabase() {
    try {
        if (!fs_1.default.existsSync(DB_DIR)) {
            fs_1.default.mkdirSync(DB_DIR, { recursive: true });
        }
        if (fs_1.default.existsSync(DB_FILE)) {
            const content = fs_1.default.readFileSync(DB_FILE, 'utf-8');
            memoryDb = JSON.parse(content);
        }
    }
    catch (err) {
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
exports.dbOps = {
    getUser(userId) {
        return memoryDb.users[userId];
    },
    getUserByEmail(email) {
        return Object.values(memoryDb.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    },
    upsertUser(user) {
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
        }
        else {
            const id = user.id || (0, uuid_1.v4)();
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
    updateUserLastSync(userId) {
        if (memoryDb.users[userId]) {
            memoryDb.users[userId].last_sync_at = new Date().toISOString();
            saveDatabase();
        }
    },
    transactionExists(userId, externalId) {
        if (!externalId)
            return false;
        return Object.values(memoryDb.transactions).some(tx => tx.userId === userId && tx.externalId === externalId);
    },
    createTransaction(tx) {
        const id = tx.id || (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const newTx = {
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
    getTransactions(userId, filters) {
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
            list = list.filter(tx => tx.merchant.toLowerCase().includes(s) ||
                (tx.description && tx.description.toLowerCase().includes(s)) ||
                (tx.notes && tx.notes.toLowerCase().includes(s)));
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
    getTransactionById(userId, id) {
        const tx = memoryDb.transactions[id];
        if (tx && tx.userId === userId) {
            return tx;
        }
        return null;
    },
    updateTransaction(userId, id, updates) {
        const tx = memoryDb.transactions[id];
        if (!tx || tx.userId !== userId)
            return false;
        if (updates.category !== undefined)
            tx.category = updates.category;
        if (updates.merchant !== undefined)
            tx.merchant = updates.merchant;
        if (updates.amount !== undefined)
            tx.amount = updates.amount;
        if (updates.notes !== undefined)
            tx.notes = updates.notes;
        if (updates.type !== undefined)
            tx.type = updates.type;
        if (updates.date !== undefined)
            tx.date = updates.date;
        tx.updatedAt = new Date().toISOString();
        saveDatabase();
        return true;
    },
    deleteTransaction(userId, id) {
        const tx = memoryDb.transactions[id];
        if (!tx || tx.userId !== userId)
            return false;
        delete memoryDb.transactions[id];
        saveDatabase();
        return true;
    },
    logSync(userId, status, emailsProcessed, transactionsFound, errorMessage) {
        const log = {
            id: (0, uuid_1.v4)(),
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
    clearAllData(userId) {
        for (const [id, tx] of Object.entries(memoryDb.transactions)) {
            if (tx.userId === userId) {
                delete memoryDb.transactions[id];
            }
        }
        memoryDb.sync_logs = memoryDb.sync_logs.filter(l => l.user_id !== userId);
        saveDatabase();
    }
};
