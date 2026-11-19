"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbOps = void 0;
exports.flushDatabase = flushDatabase;
exports.waitForCloudWrites = waitForCloudWrites;
exports.getCloudSyncStatus = getCloudSyncStatus;
exports.initDatabase = initDatabase;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const categorization_service_1 = require("../services/categorization.service");
const date_1 = require("../utils/date");
const supabase_1 = require("./supabase");
const DB_DIR = path_1.default.resolve(__dirname, '../../data');
const DB_FILE = path_1.default.join(DB_DIR, 'gastabien_store.json');
const SEED_FILE = path_1.default.join(__dirname, 'seed.json');
const SEED_SRC_FILE = path_1.default.resolve(__dirname, '../../src/database/seed.json');
let memoryDb = {
    users: {},
    transactions: {},
    sync_logs: [],
    reconciled_periods: [],
    ignored_external_ids: {},
    oauth_config: undefined,
    two_factor_auth: undefined,
    device_sessions: {}
};
function writeDatabaseNow() {
    try {
        if (!fs_1.default.existsSync(DB_DIR)) {
            fs_1.default.mkdirSync(DB_DIR, { recursive: true });
        }
        const tempFile = `${DB_FILE}.tmp`;
        const jsonStr = JSON.stringify(memoryDb, null, 2);
        fs_1.default.writeFileSync(tempFile, jsonStr, 'utf-8');
        fs_1.default.renameSync(tempFile, DB_FILE);
    }
    catch (err) {
        console.error('Error saving database:', err);
    }
}
// Debounced persistence: bursts of writes (a Gmail sync, session validation on every request)
// collapse into a single disk write. Flushed synchronously on shutdown.
const SAVE_DEBOUNCE_MS = 300;
let saveTimer = null;
function saveDatabase() {
    if (saveTimer)
        return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        writeDatabaseNow();
    }, SAVE_DEBOUNCE_MS);
    // Never keep the process alive just for a pending save (exit handler flushes it)
    saveTimer.unref?.();
}
function flushDatabase() {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    writeDatabaseNow();
}
let flushHandlersInstalled = false;
function installFlushHandlers() {
    if (flushHandlersInstalled)
        return;
    flushHandlersInstalled = true;
    process.on('exit', () => { if (saveTimer)
        flushDatabase(); });
    for (const sig of ['SIGTERM', 'SIGINT']) {
        process.once(sig, () => {
            flushDatabase();
            process.exit(0);
        });
    }
}
// ==========================================
// Supabase write queue: serialized (keeps update/delete order) with retry + backoff.
// ==========================================
let cloudChain = Promise.resolve();
let cloudPending = 0;
let cloudFailures = 0;
function cloud(label, op) {
    if (!(0, supabase_1.isSupabaseConfigured)())
        return;
    cloudPending++;
    cloudChain = cloudChain.then(async () => {
        const delays = [0, 1000, 3000, 8000];
        for (let attempt = 0; attempt < delays.length; attempt++) {
            if (delays[attempt])
                await new Promise(r => setTimeout(r, delays[attempt]));
            try {
                await op();
                return;
            }
            catch (err) {
                if (attempt === delays.length - 1) {
                    cloudFailures++;
                    console.error(`[SUPABASE] ❌ ${label} falló tras ${delays.length} intentos:`, err?.message || err);
                }
            }
        }
    }).finally(() => { cloudPending--; });
}
/** Resolves once all queued Supabase writes have finished (or permanently failed). */
function waitForCloudWrites() {
    return cloudChain;
}
function getCloudSyncStatus() {
    return { pending: cloudPending, failures: cloudFailures, configured: (0, supabase_1.isSupabaseConfigured)() };
}
async function initDatabase() {
    installFlushHandlers();
    let loadedData = null;
    let supabaseData = null;
    let supabaseFailed = false;
    // 1. Primary Cloud Store: Load from Supabase if configured
    if ((0, supabase_1.isSupabaseConfigured)()) {
        try {
            console.log('[DATABASE] Verificando conexión y cargando datos desde Supabase Cloud...');
            supabaseData = await supabase_1.supabaseOps.loadAll();
            if (supabaseData && (Object.keys(supabaseData.transactions).length > 0 || supabaseData.two_factor_auth)) {
                loadedData = supabaseData;
                console.log(`[DATABASE] ✅ Cargado exitosamente desde Supabase Cloud: ${Object.keys(supabaseData.transactions).length} transacciones.`);
            }
            else if (supabaseData) {
                console.log('[DATABASE] Supabase conectado (inicialmente vacío).');
            }
        }
        catch (err) {
            supabaseFailed = true;
            console.error('[DATABASE] ⚠️ Error conectando a Supabase Cloud. Se usará el almacenamiento local y NO se re-sembrará la nube:', err);
        }
    }
    // 2. Secondary Local Store: Load from gastabien_store.json / seed.json
    if (!loadedData) {
        try {
            if (!fs_1.default.existsSync(DB_DIR)) {
                fs_1.default.mkdirSync(DB_DIR, { recursive: true });
            }
            if (fs_1.default.existsSync(DB_FILE)) {
                const content = fs_1.default.readFileSync(DB_FILE, 'utf-8');
                loadedData = JSON.parse(content);
                console.log(`[DATABASE] Cargado exitosamente desde archivo local ${DB_FILE}`);
            }
            else if (fs_1.default.existsSync(SEED_FILE)) {
                const content = fs_1.default.readFileSync(SEED_FILE, 'utf-8');
                loadedData = JSON.parse(content);
                console.log(`[DATABASE] Cargado desde seed bundle: ${SEED_FILE}`);
            }
            else if (fs_1.default.existsSync(SEED_SRC_FILE)) {
                const content = fs_1.default.readFileSync(SEED_SRC_FILE, 'utf-8');
                loadedData = JSON.parse(content);
                console.log(`[DATABASE] Cargado desde seed fuente: ${SEED_SRC_FILE}`);
            }
        }
        catch (err) {
            console.warn('[DATABASE] Error leyendo archivos locales, usando memoria base:', err);
        }
    }
    // 3. Fallback to GASTABIEN_STORE_DATA environment variable if available
    if (!loadedData && process.env.GASTABIEN_STORE_DATA) {
        try {
            loadedData = JSON.parse(process.env.GASTABIEN_STORE_DATA);
            console.log('[DATABASE] Cargado desde variable de entorno GASTABIEN_STORE_DATA');
        }
        catch (e) {
            console.warn('Error parsing GASTABIEN_STORE_DATA env var:', e);
        }
    }
    if (loadedData) {
        memoryDb = {
            users: loadedData.users || {},
            transactions: loadedData.transactions || {},
            sync_logs: loadedData.sync_logs || [],
            reconciled_periods: loadedData.reconciled_periods || [],
            ignored_external_ids: loadedData.ignored_external_ids || {},
            oauth_config: loadedData.oauth_config || undefined,
            two_factor_auth: loadedData.two_factor_auth || undefined,
            device_sessions: loadedData.device_sessions || {}
        };
        // Re-categorize transactions with updated business rules (never touch user-edited categories)
        const recategorized = [];
        for (const tx of Object.values(memoryDb.transactions)) {
            if (!tx.isManual && !tx.categoryOverridden) {
                const freshCategory = categorization_service_1.categorizationService.categorize(tx.merchant, tx.description, tx.type);
                if (freshCategory !== tx.category) {
                    tx.category = freshCategory;
                    recategorized.push(tx);
                }
            }
        }
        if (recategorized.length > 0) {
            saveDatabase();
            // Keep the cloud copy consistent with the local one
            if (loadedData === supabaseData) {
                for (const tx of recategorized)
                    cloud('Re-categorizar', () => supabase_1.supabaseOps.upsertTransaction(tx));
            }
        }
        // Seed Supabase ONLY when it answered successfully and is confirmed empty.
        const supabaseConfirmedEmpty = !!supabaseData && !supabaseFailed &&
            Object.keys(supabaseData.transactions).length === 0 && !supabaseData.two_factor_auth;
        if ((0, supabase_1.isSupabaseConfigured)() && supabaseConfirmedEmpty && loadedData !== supabaseData) {
            console.log(`[SUPABASE] Sincronizando ${Object.keys(memoryDb.transactions).length} transacciones iniciales a Supabase Cloud...`);
            for (const tx of Object.values(memoryDb.transactions)) {
                cloud('Sembrar transacción', () => supabase_1.supabaseOps.upsertTransaction(tx));
            }
            for (const u of Object.values(memoryDb.users)) {
                cloud('Sembrar usuario', () => supabase_1.supabaseOps.saveUser(u));
            }
            const tfa = memoryDb.two_factor_auth;
            if (tfa)
                cloud('Sembrar 2FA', () => supabase_1.supabaseOps.saveTwoFactor(tfa.secret, tfa.backupCodes, tfa.enabled, tfa.createdAt));
        }
    }
    // 4. Check for GASTABIEN_2FA_SECRET environment variable override
    if (process.env.GASTABIEN_2FA_SECRET) {
        const secret = process.env.GASTABIEN_2FA_SECRET.trim();
        const backupCodes = process.env.GASTABIEN_2FA_BACKUP_CODES
            ? process.env.GASTABIEN_2FA_BACKUP_CODES.split(',').map(s => s.trim())
            : (memoryDb.two_factor_auth?.backupCodes || generateBackupCodes(8));
        memoryDb.two_factor_auth = {
            secret,
            enabled: true,
            backupCodes,
            createdAt: memoryDb.two_factor_auth?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        console.log('[SECURITY] 2FA cargado y bloqueado desde variable de entorno GASTABIEN_2FA_SECRET');
    }
    // Ensure default demo user exists
    if (!memoryDb.users['demo-user-id']) {
        memoryDb.users['demo-user-id'] = {
            id: 'demo-user-id',
            email: 'usuario.demo@gastabien.com',
            name: 'Usuario Demo RD',
            created_at: new Date().toISOString()
        };
    }
    // Save the database on disk if DB_FILE doesn't exist yet
    if (!fs_1.default.existsSync(DB_FILE)) {
        flushDatabase();
    }
}
function generateBackupCodes(count) {
    return Array.from({ length: count }, () => `${crypto_1.default.randomBytes(2).toString('hex').toUpperCase()}-${crypto_1.default.randomBytes(2).toString('hex').toUpperCase()}`);
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
        let id;
        if (existing) {
            existing.name = user.name || existing.name;
            existing.google_refresh_token = user.refresh_token || existing.google_refresh_token;
            existing.google_access_token = user.access_token || existing.google_access_token;
            existing.token_expiry = user.token_expiry || existing.token_expiry;
            existing.last_sync_at = now;
            existing.needs_reconnect = false;
            id = existing.id;
            saveDatabase();
            cloud('saveUser', () => supabase_1.supabaseOps.saveUser(existing));
            return id;
        }
        else {
            id = user.id || (0, uuid_1.v4)();
            const newUser = {
                id,
                email: user.email,
                name: user.name,
                google_refresh_token: user.refresh_token,
                google_access_token: user.access_token,
                token_expiry: user.token_expiry,
                created_at: now,
                last_sync_at: now
            };
            memoryDb.users[id] = newUser;
            saveDatabase();
            cloud('saveUser', () => supabase_1.supabaseOps.saveUser(newUser));
            return id;
        }
    },
    /** Persists refreshed OAuth tokens emitted by googleapis. */
    updateUserTokens(userId, tokens) {
        const user = memoryDb.users[userId];
        if (!user)
            return;
        if (tokens.access_token)
            user.google_access_token = tokens.access_token;
        if (tokens.refresh_token)
            user.google_refresh_token = tokens.refresh_token;
        if (tokens.expiry_date)
            user.token_expiry = tokens.expiry_date;
        user.needs_reconnect = false;
        saveDatabase();
        cloud('Guardar tokens', () => supabase_1.supabaseOps.saveUser(user));
    },
    setUserNeedsReconnect(userId, value) {
        const user = memoryDb.users[userId];
        if (!user)
            return;
        user.needs_reconnect = value;
        saveDatabase();
    },
    updateUserLastSync(userId) {
        if (memoryDb.users[userId]) {
            memoryDb.users[userId].last_sync_at = new Date().toISOString();
            saveDatabase();
            cloud('saveUser', () => supabase_1.supabaseOps.saveUser(memoryDb.users[userId]));
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
        const now = new Date().toISOString();
        // Periods are kept as separate intervals. Only overlapping/adjacent periods are merged,
        // so importing January and March never silently marks February as reconciled.
        const dayMs = 24 * 3600 * 1000;
        const toTime = (d) => new Date(`${d}T00:00:00.000Z`).getTime();
        let mergedStart = startDate;
        let mergedEnd = endDate;
        const remaining = [];
        for (const p of memoryDb.reconciled_periods) {
            const overlaps = p.userId === userId && p.bank === bank &&
                toTime(p.startDate) <= toTime(mergedEnd) + dayMs && toTime(p.endDate) + dayMs >= toTime(mergedStart);
            if (overlaps) {
                if (p.startDate < mergedStart)
                    mergedStart = p.startDate;
                if (p.endDate > mergedEnd)
                    mergedEnd = p.endDate;
            }
            else {
                remaining.push(p);
            }
        }
        remaining.push({ userId, bank, startDate: mergedStart, endDate: mergedEnd, reconciledAt: now });
        memoryDb.reconciled_periods = remaining;
        cloud('Guardar periodo conciliado', () => supabase_1.supabaseOps.saveReconciledPeriod(userId, bank, mergedStart, mergedEnd, now));
        saveDatabase();
    },
    isDateInReconciledPeriod(userId, bank, date) {
        if (!memoryDb.reconciled_periods || memoryDb.reconciled_periods.length === 0)
            return false;
        // Statement dates are DR calendar days; compare the email's DR calendar day (no padding)
        const day = (0, date_1.drDayKey)(date);
        if (!day || isNaN(new Date(date).getTime()))
            return false;
        return memoryDb.reconciled_periods.some(p => p.userId === userId && p.bank === bank && day >= p.startDate && day <= p.endDate);
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
            cloud('saveIgnoredExternalId', () => supabase_1.supabaseOps.saveIgnoredExternalId(userId, externalId));
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
            // Two different email IDs are two different notifications => two real purchases
            if (parsed.externalId && tx.externalId && parsed.externalId !== tx.externalId)
                continue;
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
                    cloud('Vincular ID externo', () => supabase_1.supabaseOps.upsertTransaction(tx));
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
            categoryOverridden: tx.categoryOverridden || false,
            createdAt: now,
            updatedAt: now
        };
        memoryDb.transactions[id] = newTx;
        saveDatabase();
        cloud('upsertTransaction', () => supabase_1.supabaseOps.upsertTransaction(newTx));
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
        if (filters?.month && filters.month !== 'ALL') {
            list = list.filter(tx => tx.date && (0, date_1.drMonthKey)(tx.date) === filters.month);
        }
        if (filters?.search) {
            const s = filters.search.toLowerCase();
            list = list.filter(tx => tx.merchant.toLowerCase().includes(s) ||
                (tx.description && tx.description.toLowerCase().includes(s)) ||
                (tx.notes && tx.notes.toLowerCase().includes(s)));
        }
        // Sort by date descending
        const ts = (d) => { const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; };
        list.sort((a, b) => ts(b.date) - ts(a.date));
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
        if (updates.category !== undefined && updates.category !== tx.category) {
            tx.category = updates.category;
            tx.categoryOverridden = true;
        }
        if (updates.merchant !== undefined)
            tx.merchant = updates.merchant;
        if (updates.amount !== undefined)
            tx.amount = updates.amount;
        if (updates.currency !== undefined)
            tx.currency = updates.currency;
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
        cloud('upsertTransaction', () => supabase_1.supabaseOps.upsertTransaction(tx));
        return true;
    },
    deleteTransaction(userId, id) {
        const tx = memoryDb.transactions[id];
        if (!tx || tx.userId !== userId)
            return false;
        delete memoryDb.transactions[id];
        saveDatabase();
        cloud('deleteTransaction', () => supabase_1.supabaseOps.deleteTransaction(id));
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
        cloud('saveSyncLog', () => supabase_1.supabaseOps.saveSyncLog(log));
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
        cloud('Limpiar datos', () => supabase_1.supabaseOps.clearTransactions(userId));
    },
    /**
     * Removes only Gmail-sourced transactions (non-manual, with an email externalId).
     * Manual entries, statement imports, reconciled periods and ignored IDs are preserved.
     * Resolves after the cloud delete finished so a re-import cannot race it.
     */
    async clearEmailTransactions(userId) {
        const ids = [];
        for (const [id, tx] of Object.entries(memoryDb.transactions)) {
            if (tx.userId === userId && !tx.isManual && tx.externalId && !this.isExternalIdIgnored(userId, tx.externalId)) {
                ids.push(id);
                delete memoryDb.transactions[id];
            }
        }
        saveDatabase();
        if (ids.length > 0) {
            cloud('Eliminar transacciones de correo', () => supabase_1.supabaseOps.deleteTransactions(ids));
            await waitForCloudWrites();
        }
        return ids.length;
    },
    saveGoogleConfig(clientId, clientSecret, redirectUri) {
        memoryDb.oauth_config = { clientId, clientSecret, redirectUri };
        saveDatabase();
        cloud('saveGoogleConfig', () => supabase_1.supabaseOps.saveGoogleConfig(clientId, clientSecret, redirectUri));
    },
    getGoogleConfig() {
        return memoryDb.oauth_config;
    },
    getTwoFactorAuth() {
        return memoryDb.two_factor_auth || null;
    },
    saveTwoFactorAuth(secret, backupCodes, enabled = true) {
        const config = {
            secret,
            enabled,
            backupCodes,
            createdAt: memoryDb.two_factor_auth?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        memoryDb.two_factor_auth = config;
        saveDatabase();
        cloud('Guardar 2FA', () => supabase_1.supabaseOps.saveTwoFactor(secret, backupCodes, enabled, config.createdAt));
        return config;
    },
    disableTwoFactorAuth() {
        if (memoryDb.two_factor_auth) {
            memoryDb.two_factor_auth.enabled = false;
            memoryDb.two_factor_auth.updatedAt = new Date().toISOString();
            saveDatabase();
            cloud('disableTwoFactor', () => supabase_1.supabaseOps.disableTwoFactor());
        }
    },
    resetTwoFactorAuth() {
        memoryDb.two_factor_auth = undefined;
        memoryDb.device_sessions = {};
        saveDatabase();
        cloud('resetTwoFactor', () => supabase_1.supabaseOps.resetTwoFactor());
    },
    verifyAndConsumeBackupCode(code) {
        if (!memoryDb.two_factor_auth || !memoryDb.two_factor_auth.enabled)
            return false;
        const cleanCode = code.trim().toUpperCase();
        const idx = memoryDb.two_factor_auth.backupCodes.findIndex(c => c.toUpperCase() === cleanCode);
        if (idx !== -1) {
            memoryDb.two_factor_auth.backupCodes.splice(idx, 1);
            memoryDb.two_factor_auth.updatedAt = new Date().toISOString();
            saveDatabase();
            const tfa = { ...memoryDb.two_factor_auth, backupCodes: [...memoryDb.two_factor_auth.backupCodes] };
            cloud('Consumir código de respaldo', () => supabase_1.supabaseOps.saveTwoFactor(tfa.secret, tfa.backupCodes, tfa.enabled, tfa.createdAt));
            return true;
        }
        return false;
    },
    createDeviceSession(token, deviceId, userAgent) {
        if (!memoryDb.device_sessions) {
            memoryDb.device_sessions = {};
        }
        const devId = deviceId || (0, uuid_1.v4)();
        const session = {
            token,
            deviceId: devId,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            userAgent
        };
        memoryDb.device_sessions[token] = session;
        saveDatabase();
        cloud('saveDeviceSession', () => supabase_1.supabaseOps.saveDeviceSession(token, devId, userAgent));
        return session;
    },
    validateDeviceSession(token) {
        if (!token || !memoryDb.device_sessions)
            return false;
        const session = memoryDb.device_sessions[token];
        if (session) {
            // Only persist lastUsedAt at most every 10 minutes (avoids a write on every request)
            const last = new Date(session.lastUsedAt).getTime();
            if (isNaN(last) || Date.now() - last > 10 * 60 * 1000) {
                session.lastUsedAt = new Date().toISOString();
                saveDatabase();
                const s = session;
                cloud('Actualizar sesión', () => supabase_1.supabaseOps.saveDeviceSession(s.token, s.deviceId || '', s.userAgent, s.createdAt, s.lastUsedAt));
            }
            return true;
        }
        return false;
    },
    revokeDeviceSession(token) {
        if (!token || !memoryDb.device_sessions)
            return false;
        if (memoryDb.device_sessions[token]) {
            delete memoryDb.device_sessions[token];
            saveDatabase();
            cloud('revokeDeviceSession', () => supabase_1.supabaseOps.revokeDeviceSession(token));
            return true;
        }
        return false;
    },
    revokeAllDeviceSessions() {
        memoryDb.device_sessions = {};
        saveDatabase();
        cloud('Revocar sesiones', () => supabase_1.supabaseOps.deleteAllDeviceSessions());
    }
};
