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
const categorization_service_1 = require("../services/categorization.service");
const DB_DIR = path_1.default.resolve(__dirname, '../../data');
const DB_FILE = path_1.default.join(DB_DIR, 'gastabien_store.json');
let memoryDb = {
    users: {},
    transactions: {},
    sync_logs: [],
    reconciled_periods: [],
    ignored_external_ids: {},
    oauth_config: undefined
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
            const loaded = JSON.parse(content);
            memoryDb = {
                users: loaded.users || {},
                transactions: loaded.transactions || {},
                sync_logs: loaded.sync_logs || [],
                reconciled_periods: loaded.reconciled_periods || [],
                ignored_external_ids: loaded.ignored_external_ids || {},
                oauth_config: loaded.oauth_config || undefined
            };
            // Re-categorize transactions with updated business rules
            let changed = false;
            for (const tx of Object.values(memoryDb.transactions)) {
                if (!tx.isManual) {
                    const freshCategory = categorization_service_1.categorizationService.categorize(tx.merchant, tx.description, tx.type);
                    if (freshCategory !== tx.category) {
                        tx.category = freshCategory;
                        changed = true;
                    }
                }
            }
            if (changed) {
                saveDatabase();
            }
        }
    }
    catch (err) {
        console.warn('Could not read existing database, initializing new memory database:', err);
        memoryDb = { users: {}, transactions: {}, sync_logs: [], reconciled_periods: [], ignored_external_ids: {} };
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
function extractTokens(str) {
    if (!str)
        return [];
    const stopWords = new Set(['por', 'con', 'del', 'los', 'las', 'una', 'uno', 'para', 'banco', 'aviso', 'debito', 'compra', 'tarjeta', 'pago', 'consumo']);
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
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
        if (this.isExternalIdIgnored(userId, externalId))
            return true;
        return Object.values(memoryDb.transactions).some(tx => tx.userId === userId && tx.externalId === externalId);
    },
    saveReconciledPeriod(userId, bank, startDate, endDate) {
        if (!memoryDb.reconciled_periods) {
            memoryDb.reconciled_periods = [];
        }
        const existingIdx = memoryDb.reconciled_periods.findIndex(p => p.userId === userId && p.bank === bank);
        const newPeriod = {
            userId,
            bank,
            startDate,
            endDate,
            reconciledAt: new Date().toISOString()
        };
        if (existingIdx >= 0) {
            const old = memoryDb.reconciled_periods[existingIdx];
            // Expand dates if needed
            const minStart = old.startDate < startDate ? old.startDate : startDate;
            const maxEnd = old.endDate > endDate ? old.endDate : endDate;
            memoryDb.reconciled_periods[existingIdx] = {
                userId,
                bank,
                startDate: minStart,
                endDate: maxEnd,
                reconciledAt: new Date().toISOString()
            };
        }
        else {
            memoryDb.reconciled_periods.push(newPeriod);
        }
        saveDatabase();
    },
    isDateInReconciledPeriod(userId, bank, date) {
        if (!memoryDb.reconciled_periods || memoryDb.reconciled_periods.length === 0)
            return false;
        const targetTime = new Date(date).getTime();
        if (isNaN(targetTime))
            return false;
        return memoryDb.reconciled_periods.some(p => {
            if (p.userId !== userId || p.bank !== bank)
                return false;
            // Provide +/- 24 hour padding to account for statement cutoffs / posting timezones
            const startTime = new Date(`${p.startDate}T00:00:00.000Z`).getTime() - (24 * 3600 * 1000);
            const endTime = new Date(`${p.endDate}T23:59:59.999Z`).getTime() + (24 * 3600 * 1000);
            return targetTime >= startTime && targetTime <= endTime;
        });
    },
    ignoreExternalId(userId, externalId) {
        if (!externalId)
            return;
        if (!memoryDb.ignored_external_ids) {
            memoryDb.ignored_external_ids = {};
        }
        if (!memoryDb.ignored_external_ids[userId]) {
            memoryDb.ignored_external_ids[userId] = [];
        }
        if (!memoryDb.ignored_external_ids[userId].includes(externalId)) {
            memoryDb.ignored_external_ids[userId].push(externalId);
            saveDatabase();
        }
    },
    isExternalIdIgnored(userId, externalId) {
        if (!externalId || !memoryDb.ignored_external_ids)
            return false;
        return (memoryDb.ignored_external_ids[userId] || []).includes(externalId);
    },
    /**
     * Multi-layer deduplication engine:
     * 1. Exact externalId match
     * 2. Semantic matching against database records (amount, currency, type, bank, date within 72h, merchant)
     * 3. Statement window check (if bank statement is reconciled for this period, statement is absolute truth)
     */
    isDuplicateTransaction(userId, parsed) {
        // 1. External ID check
        if (parsed.externalId) {
            if (this.isExternalIdIgnored(userId, parsed.externalId)) {
                return { isDuplicate: true, reason: 'IGNORED_EXTERNAL_ID' };
            }
            const existingById = Object.values(memoryDb.transactions).find(tx => tx.userId === userId && tx.externalId === parsed.externalId);
            if (existingById) {
                return { isDuplicate: true, matchedTransactionId: existingById.id, reason: 'EXACT_EXTERNAL_ID' };
            }
        }
        const parsedDate = new Date(parsed.date);
        const parsedDateTime = parsedDate.getTime();
        const parsedTokens = extractTokens(parsed.merchant || parsed.description || '');
        // 2. Semantic match against all existing user transactions
        const userTxs = Object.values(memoryDb.transactions).filter(tx => tx.userId === userId);
        for (const tx of userTxs) {
            // Type match (INCOME vs EXPENSE)
            if (tx.type !== parsed.type)
                continue;
            // Currency match
            const txCurr = tx.currency || 'DOP';
            const parsedCurr = parsed.currency || 'DOP';
            if (txCurr !== parsedCurr)
                continue;
            // Amount match (within 5 cents)
            const amountDiff = Math.abs(tx.amount - parsed.amount);
            if (amountDiff > 0.05)
                continue;
            // Date proximity check (within +/- 3 days / 72 hours)
            const txDateTime = new Date(tx.date).getTime();
            const diffHours = Math.abs(txDateTime - parsedDateTime) / (1000 * 3600);
            if (diffHours > 72)
                continue;
            // Bank match check
            const sameBank = !parsed.bank || !tx.bank || parsed.bank === 'MANUAL' || tx.bank === 'MANUAL' || parsed.bank === tx.bank;
            if (!sameBank)
                continue;
            // Merchant tokens overlap or close proximity
            const txTokens = extractTokens(tx.merchant || tx.description || '');
            const hasTokenOverlap = parsedTokens.some(t => txTokens.includes(t));
            // If bank is exact, amount is exact, and date is within 48h, OR if tokens overlap within 72h:
            if (hasTokenOverlap || (parsed.bank === tx.bank && diffHours <= 48)) {
                // Link external ID to existing record if not already linked
                if (parsed.externalId && !tx.externalId) {
                    tx.externalId = parsed.externalId;
                    tx.updatedAt = new Date().toISOString();
                    saveDatabase();
                }
                return { isDuplicate: true, matchedTransactionId: tx.id, reason: 'SEMANTIC_MATCH' };
            }
        }
        // 3. Statement Period Reconciliation Check
        // If a bank statement was officially imported for this period, statement is the master truth.
        // An email inside this period that did NOT match any statement record is a ghost/declined authorization.
        if (parsed.bank && this.isDateInReconciledPeriod(userId, parsed.bank, parsed.date)) {
            if (parsed.externalId) {
                this.ignoreExternalId(userId, parsed.externalId);
            }
            return { isDuplicate: true, reason: 'WITHIN_RECONCILED_STATEMENT_PERIOD' };
        }
        return { isDuplicate: false };
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
            date: typeof tx.date === 'string' ? tx.date : tx.date.toISOString(),
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
        if (updates.externalId !== undefined)
            tx.externalId = updates.externalId;
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
        if (memoryDb.reconciled_periods) {
            memoryDb.reconciled_periods = memoryDb.reconciled_periods.filter(p => p.userId !== userId);
        }
        if (memoryDb.ignored_external_ids) {
            delete memoryDb.ignored_external_ids[userId];
        }
        saveDatabase();
    },
    saveGoogleConfig(clientId, clientSecret, redirectUri) {
        memoryDb.oauth_config = { clientId, clientSecret, redirectUri };
        saveDatabase();
    },
    getGoogleConfig() {
        return memoryDb.oauth_config;
    }
};
