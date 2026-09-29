"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseOps = void 0;
exports.getSupabaseClient = getSupabaseClient;
exports.isSupabaseConfigured = isSupabaseConfigured;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
let supabaseClient = null;
function getSupabaseClient() {
    if (supabaseClient)
        return supabaseClient;
    const url = config_1.CONFIG.SUPABASE?.URL || process.env.SUPABASE_URL || '';
    const key = config_1.CONFIG.SUPABASE?.KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    if (url && key && url.startsWith('http')) {
        try {
            supabaseClient = (0, supabase_js_1.createClient)(url, key, {
                auth: { persistSession: false }
            });
            console.log(`[SUPABASE] Cliente inicializado para URL: ${url}`);
        }
        catch (err) {
            console.error('[SUPABASE] Error al inicializar cliente:', err);
        }
    }
    return supabaseClient;
}
function isSupabaseConfigured() {
    return getSupabaseClient() !== null;
}
// Convert DB snake_case row to camelCase Transaction model
function mapRowToTransaction(row) {
    return {
        id: row.id,
        userId: row.user_id,
        externalId: row.external_id || undefined,
        bank: row.bank,
        bankName: row.bank_name,
        type: row.type,
        amount: parseFloat(row.amount),
        currency: row.currency || 'DOP',
        amountInDop: row.amount_in_dop ? parseFloat(row.amount_in_dop) : undefined,
        exchangeRate: row.exchange_rate ? parseFloat(row.exchange_rate) : undefined,
        merchant: row.merchant,
        accountReference: row.account_reference || undefined,
        date: row.date,
        rawSubject: row.raw_subject || undefined,
        rawSender: row.raw_sender || undefined,
        description: row.description || undefined,
        category: row.category,
        confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : 1.0,
        notes: row.notes || undefined,
        isManual: !!row.is_manual,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
// Convert camelCase Transaction model to DB snake_case row
function mapTransactionToRow(tx) {
    return {
        id: tx.id,
        user_id: tx.userId,
        external_id: tx.externalId || null,
        bank: tx.bank,
        bank_name: tx.bankName,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency || 'DOP',
        amount_in_dop: tx.amountInDop || null,
        exchange_rate: tx.exchangeRate || null,
        merchant: tx.merchant,
        account_reference: tx.accountReference || null,
        date: typeof tx.date === 'string' ? tx.date : tx.date.toISOString(),
        raw_subject: tx.rawSubject || null,
        raw_sender: tx.rawSender || null,
        description: tx.description || null,
        category: tx.category,
        confidence_score: tx.confidenceScore || 1.0,
        notes: tx.notes || null,
        is_manual: !!tx.isManual,
        created_at: typeof tx.createdAt === 'string' ? tx.createdAt : (tx.createdAt || new Date()).toISOString(),
        updated_at: typeof tx.updatedAt === 'string' ? tx.updatedAt : (tx.updatedAt || new Date()).toISOString()
    };
}
exports.supabaseOps = {
    async testConnection() {
        const client = getSupabaseClient();
        if (!client) {
            return { connected: false, message: 'SUPABASE_URL y SUPABASE_KEY no configurados.' };
        }
        try {
            const { data, error } = await client.from('transactions').select('id').limit(1);
            if (error) {
                return { connected: false, message: `Error en Supabase: ${error.message}` };
            }
            return { connected: true, message: 'Conectado a Supabase correctamente.' };
        }
        catch (err) {
            return { connected: false, message: err.message };
        }
    },
    async loadAll() {
        const client = getSupabaseClient();
        if (!client)
            return null;
        try {
            console.log('[SUPABASE] Cargando datos completos desde la nube...');
            // Load all tables in parallel
            const [usersRes, txRes, twoFactorRes, sessionsRes, reconciledRes, ignoredRes, syncLogsRes, configRes] = await Promise.all([
                client.from('users').select('*'),
                client.from('transactions').select('*'),
                client.from('two_factor_auth').select('*').limit(1),
                client.from('device_sessions').select('*'),
                client.from('reconciled_periods').select('*'),
                client.from('ignored_external_ids').select('*'),
                client.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(100),
                client.from('app_config').select('*')
            ]);
            const users = {};
            if (usersRes.data) {
                for (const u of usersRes.data) {
                    users[u.id] = {
                        id: u.id,
                        email: u.email,
                        name: u.name,
                        google_refresh_token: u.google_refresh_token,
                        google_access_token: u.google_access_token,
                        token_expiry: u.token_expiry,
                        created_at: u.created_at,
                        last_sync_at: u.last_sync_at
                    };
                }
            }
            const transactions = {};
            if (txRes.data) {
                for (const r of txRes.data) {
                    const tx = mapRowToTransaction(r);
                    transactions[tx.id] = tx;
                }
            }
            let two_factor_auth = undefined;
            if (twoFactorRes.data && twoFactorRes.data.length > 0) {
                const row = twoFactorRes.data[0];
                two_factor_auth = {
                    secret: row.secret,
                    enabled: !!row.enabled,
                    backupCodes: Array.isArray(row.backup_codes) ? row.backup_codes : (typeof row.backup_codes === 'string' ? JSON.parse(row.backup_codes) : []),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
            }
            const device_sessions = {};
            if (sessionsRes.data) {
                for (const s of sessionsRes.data) {
                    device_sessions[s.token] = {
                        token: s.token,
                        deviceId: s.device_id,
                        userAgent: s.user_agent,
                        createdAt: s.created_at,
                        lastUsedAt: s.last_used_at
                    };
                }
            }
            const reconciled_periods = [];
            if (reconciledRes.data) {
                for (const p of reconciledRes.data) {
                    reconciled_periods.push({
                        userId: p.user_id,
                        bank: p.bank,
                        startDate: p.start_date,
                        endDate: p.end_date,
                        reconciledAt: p.reconciled_at
                    });
                }
            }
            const ignored_external_ids = {};
            if (ignoredRes.data) {
                for (const ig of ignoredRes.data) {
                    if (!ignored_external_ids[ig.user_id]) {
                        ignored_external_ids[ig.user_id] = [];
                    }
                    ignored_external_ids[ig.user_id].push(ig.external_id);
                }
            }
            const sync_logs = (syncLogsRes.data || []).map((l) => ({
                id: l.id,
                user_id: l.user_id,
                status: l.status,
                emails_processed: l.emails_processed,
                transactions_found: l.transactions_found,
                error_message: l.error_message,
                created_at: l.created_at
            }));
            let oauth_config = undefined;
            if (configRes.data) {
                const oauthRow = configRes.data.find((c) => c.key === 'oauth_google');
                if (oauthRow) {
                    oauth_config = typeof oauthRow.value === 'string' ? JSON.parse(oauthRow.value) : oauthRow.value;
                }
            }
            console.log(`[SUPABASE] Sincronización exitosa: ${Object.keys(transactions).length} transacciones cargadas de Supabase.`);
            return {
                users,
                transactions,
                sync_logs,
                reconciled_periods,
                ignored_external_ids,
                two_factor_auth,
                device_sessions,
                oauth_config
            };
        }
        catch (err) {
            console.error('[SUPABASE] Error cargando datos de Supabase:', err);
            return null;
        }
    },
    async upsertTransaction(tx) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            const row = mapTransactionToRow(tx);
            const { error } = await client.from('transactions').upsert(row);
            if (error)
                console.error('[SUPABASE] Error al guardar transacción:', error.message);
        }
        catch (err) {
            console.error('[SUPABASE] Error upserting transaction:', err);
        }
    },
    async deleteTransaction(id) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            const { error } = await client.from('transactions').delete().eq('id', id);
            if (error)
                console.error('[SUPABASE] Error al eliminar transacción:', error.message);
        }
        catch (err) {
            console.error('[SUPABASE] Error deleting transaction:', err);
        }
    },
    async clearTransactions(userId) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            await Promise.all([
                client.from('transactions').delete().eq('user_id', userId),
                client.from('reconciled_periods').delete().eq('user_id', userId),
                client.from('ignored_external_ids').delete().eq('user_id', userId),
                client.from('sync_logs').delete().eq('user_id', userId)
            ]);
        }
        catch (err) {
            console.error('[SUPABASE] Error clearing transactions:', err);
        }
    },
    async saveTwoFactor(secret, backupCodes, enabled = true) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            const now = new Date().toISOString();
            const { error } = await client.from('two_factor_auth').upsert({
                id: 'global_2fa',
                secret,
                enabled,
                backup_codes: backupCodes,
                created_at: now,
                updated_at: now
            });
            if (error)
                console.error('[SUPABASE] Error al guardar 2FA:', error.message);
        }
        catch (err) {
            console.error('[SUPABASE] Error saving 2FA:', err);
        }
    },
    async disableTwoFactor() {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            const { error } = await client.from('two_factor_auth').update({
                enabled: false,
                updated_at: new Date().toISOString()
            }).eq('id', 'global_2fa');
            if (error)
                console.error('[SUPABASE] Error disabling 2FA:', error.message);
        }
        catch (err) {
            console.error('[SUPABASE] Error disabling 2FA:', err);
        }
    },
    async resetTwoFactor() {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            await Promise.all([
                client.from('two_factor_auth').delete().eq('id', 'global_2fa'),
                client.from('device_sessions').delete().neq('token', 'EMPTY')
            ]);
        }
        catch (err) {
            console.error('[SUPABASE] Error resetting 2FA in Supabase:', err);
        }
    },
    async saveDeviceSession(token, deviceId, userAgent) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            const now = new Date().toISOString();
            await client.from('device_sessions').upsert({
                token,
                device_id: deviceId,
                user_agent: userAgent || null,
                created_at: now,
                last_used_at: now
            });
        }
        catch (err) {
            console.error('[SUPABASE] Error saving device session:', err);
        }
    },
    async revokeDeviceSession(token) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            await client.from('device_sessions').delete().eq('token', token);
        }
        catch (err) {
            console.error('[SUPABASE] Error revoking device session:', err);
        }
    },
    async saveUser(user) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            await client.from('users').upsert({
                id: user.id,
                email: user.email,
                name: user.name || null,
                google_refresh_token: user.google_refresh_token || null,
                google_access_token: user.google_access_token || null,
                token_expiry: user.token_expiry || null,
                created_at: user.created_at || new Date().toISOString(),
                last_sync_at: user.last_sync_at || null
            });
        }
        catch (err) {
            console.error('[SUPABASE] Error saving user in Supabase:', err);
        }
    },
    async saveSyncLog(log) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            await client.from('sync_logs').insert({
                id: log.id,
                user_id: log.user_id,
                status: log.status,
                emails_processed: log.emails_processed,
                transactions_found: log.transactions_found,
                error_message: log.error_message || null,
                created_at: log.created_at
            });
        }
        catch (err) {
            console.error('[SUPABASE] Error saving sync log in Supabase:', err);
        }
    },
    async saveReconciledPeriod(userId, bank, startDate, endDate, reconciledAt) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            const id = `${userId}_${bank}_${startDate}_${endDate}`;
            await client.from('reconciled_periods').upsert({
                id,
                user_id: userId,
                bank,
                start_date: startDate,
                end_date: endDate,
                reconciled_at: reconciledAt
            });
        }
        catch (err) {
            console.error('[SUPABASE] Error saving reconciled period in Supabase:', err);
        }
    },
    async saveIgnoredExternalId(userId, externalId) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            const id = `${userId}_${externalId}`;
            await client.from('ignored_external_ids').upsert({
                id,
                user_id: userId,
                external_id: externalId
            });
        }
        catch (err) {
            console.error('[SUPABASE] Error saving ignored external ID in Supabase:', err);
        }
    },
    async saveGoogleConfig(clientId, clientSecret, redirectUri) {
        const client = getSupabaseClient();
        if (!client)
            return;
        try {
            await client.from('app_config').upsert({
                key: 'oauth_google',
                value: { clientId, clientSecret, redirectUri },
                updated_at: new Date().toISOString()
            });
        }
        catch (err) {
            console.error('[SUPABASE] Error saving google config in Supabase:', err);
        }
    }
};
