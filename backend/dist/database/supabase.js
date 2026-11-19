"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseOps = void 0;
exports.getSupabaseClient = getSupabaseClient;
exports.isSupabaseConfigured = isSupabaseConfigured;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
let supabaseClient = null;
let clientKeyFingerprint = '';
// Whether the transactions table has the optional `category_overridden` column (migration v2).
let supportsOverrideColumn = false;
const PAGE_SIZE = 1000;
function resolveCredentials() {
    const url = config_1.CONFIG.SUPABASE?.URL || process.env.SUPABASE_URL || '';
    const key = config_1.CONFIG.SUPABASE?.KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    return { url, key };
}
function getSupabaseClient() {
    const { url, key } = resolveCredentials();
    const fingerprint = `${url}|${key}`;
    // Re-create the client when credentials change at runtime (e.g. /auth/supabase/config)
    if (supabaseClient && fingerprint === clientKeyFingerprint)
        return supabaseClient;
    supabaseClient = null;
    clientKeyFingerprint = fingerprint;
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
/** Throws if a Supabase response carries an error, so callers/queues can retry. */
function check(res, context) {
    if (res.error) {
        throw new Error(`[SUPABASE] ${context}: ${res.error.message || res.error}`);
    }
    return res;
}
/** Loads every row of a table using range pagination (PostgREST caps responses at 1000 rows). */
async function selectAll(client, table, orderBy) {
    const rows = [];
    for (let from = 0;; from += PAGE_SIZE) {
        let query = client.from(table).select('*');
        if (orderBy)
            query = query.order(orderBy, { ascending: true });
        const res = check(await query.range(from, from + PAGE_SIZE - 1), `Error leyendo ${table}`);
        const data = res.data || [];
        rows.push(...data);
        if (data.length < PAGE_SIZE)
            break;
    }
    return rows;
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
        categoryOverridden: !!row.category_overridden,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
// Convert camelCase Transaction model to DB snake_case row
function mapTransactionToRow(tx) {
    const row = {
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
    if (supportsOverrideColumn) {
        row.category_overridden = !!tx.categoryOverridden;
    }
    return row;
}
exports.supabaseOps = {
    async testConnection() {
        const client = getSupabaseClient();
        if (!client) {
            return { connected: false, message: 'SUPABASE_URL y SUPABASE_KEY no configurados.' };
        }
        try {
            const { error } = await client.from('transactions').select('id').limit(1);
            if (error) {
                return { connected: false, message: `Error en Supabase: ${error.message}` };
            }
            return { connected: true, message: 'Conectado a Supabase correctamente.' };
        }
        catch (err) {
            return { connected: false, message: err.message };
        }
    },
    /**
     * Loads the full cloud snapshot. THROWS on any table error so callers never confuse
     * "Supabase failed" with "Supabase is empty" (which would trigger a destructive re-seed).
     */
    async loadAll() {
        const client = getSupabaseClient();
        if (!client)
            return null;
        console.log('[SUPABASE] Cargando datos completos desde la nube...');
        const [usersRows, txRows, twoFactorRes, sessionRows, reconciledRows, ignoredRows, syncLogsRes, configRows, overrideProbe] = await Promise.all([
            selectAll(client, 'users'),
            selectAll(client, 'transactions', 'id'),
            client.from('two_factor_auth').select('*').limit(1),
            selectAll(client, 'device_sessions'),
            selectAll(client, 'reconciled_periods'),
            selectAll(client, 'ignored_external_ids'),
            client.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(100),
            selectAll(client, 'app_config'),
            client.from('transactions').select('category_overridden').limit(1)
        ]);
        check(twoFactorRes, 'Error leyendo two_factor_auth');
        check(syncLogsRes, 'Error leyendo sync_logs');
        supportsOverrideColumn = !overrideProbe.error;
        if (!supportsOverrideColumn) {
            console.warn('[SUPABASE] Columna category_overridden no existe. Ejecuta la migración v2 de supabase_schema.sql para conservar categorías editadas.');
        }
        const users = {};
        for (const u of usersRows) {
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
        const transactions = {};
        for (const r of txRows) {
            const tx = mapRowToTransaction(r);
            transactions[tx.id] = tx;
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
        for (const s of sessionRows) {
            device_sessions[s.token] = {
                token: s.token,
                deviceId: s.device_id,
                userAgent: s.user_agent,
                createdAt: s.created_at,
                lastUsedAt: s.last_used_at
            };
        }
        const reconciled_periods = reconciledRows.map((p) => ({
            userId: p.user_id,
            bank: p.bank,
            startDate: p.start_date,
            endDate: p.end_date,
            reconciledAt: p.reconciled_at
        }));
        const ignored_external_ids = {};
        for (const ig of ignoredRows) {
            if (!ignored_external_ids[ig.user_id]) {
                ignored_external_ids[ig.user_id] = [];
            }
            ignored_external_ids[ig.user_id].push(ig.external_id);
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
        const oauthRow = configRows.find((c) => c.key === 'oauth_google');
        if (oauthRow) {
            oauth_config = typeof oauthRow.value === 'string' ? JSON.parse(oauthRow.value) : oauthRow.value;
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
    },
    async upsertTransaction(tx) {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('transactions').upsert(mapTransactionToRow(tx)), 'Error al guardar transacción');
    },
    async deleteTransaction(id) {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('transactions').delete().eq('id', id), 'Error al eliminar transacción');
    },
    async deleteTransactions(ids) {
        const client = getSupabaseClient();
        if (!client || ids.length === 0)
            return;
        for (let i = 0; i < ids.length; i += 200) {
            const chunk = ids.slice(i, i + 200);
            check(await client.from('transactions').delete().in('id', chunk), 'Error al eliminar transacciones');
        }
    },
    async clearTransactions(userId) {
        const client = getSupabaseClient();
        if (!client)
            return;
        const results = await Promise.all([
            client.from('transactions').delete().eq('user_id', userId),
            client.from('reconciled_periods').delete().eq('user_id', userId),
            client.from('ignored_external_ids').delete().eq('user_id', userId),
            client.from('sync_logs').delete().eq('user_id', userId)
        ]);
        results.forEach(r => check(r, 'Error limpiando datos'));
    },
    async saveTwoFactor(secret, backupCodes, enabled = true, createdAt) {
        const client = getSupabaseClient();
        if (!client)
            return;
        const now = new Date().toISOString();
        check(await client.from('two_factor_auth').upsert({
            id: 'global_2fa',
            secret,
            enabled,
            backup_codes: backupCodes,
            created_at: createdAt || now,
            updated_at: now
        }), 'Error al guardar 2FA');
    },
    async disableTwoFactor() {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('two_factor_auth').update({
            enabled: false,
            updated_at: new Date().toISOString()
        }).eq('id', 'global_2fa'), 'Error deshabilitando 2FA');
    },
    async resetTwoFactor() {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('two_factor_auth').delete().eq('id', 'global_2fa'), 'Error reiniciando 2FA');
        await this.deleteAllDeviceSessions();
    },
    async deleteAllDeviceSessions() {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('device_sessions').delete().neq('token', 'EMPTY'), 'Error eliminando sesiones');
    },
    async saveDeviceSession(token, deviceId, userAgent, createdAt, lastUsedAt) {
        const client = getSupabaseClient();
        if (!client)
            return;
        const now = new Date().toISOString();
        check(await client.from('device_sessions').upsert({
            token,
            device_id: deviceId,
            user_agent: userAgent || null,
            created_at: createdAt || now,
            last_used_at: lastUsedAt || now
        }), 'Error guardando sesión de dispositivo');
    },
    async revokeDeviceSession(token) {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('device_sessions').delete().eq('token', token), 'Error revocando sesión');
    },
    async saveUser(user) {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('users').upsert({
            id: user.id,
            email: user.email,
            name: user.name || null,
            google_refresh_token: user.google_refresh_token || null,
            google_access_token: user.google_access_token || null,
            token_expiry: user.token_expiry || null,
            created_at: user.created_at || new Date().toISOString(),
            last_sync_at: user.last_sync_at || null
        }), 'Error guardando usuario');
    },
    async saveSyncLog(log) {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('sync_logs').upsert({
            id: log.id,
            user_id: log.user_id,
            status: log.status,
            emails_processed: log.emails_processed,
            transactions_found: log.transactions_found,
            error_message: log.error_message || null,
            created_at: log.created_at
        }), 'Error guardando log de sincronización');
    },
    async saveReconciledPeriod(userId, bank, startDate, endDate, reconciledAt) {
        const client = getSupabaseClient();
        if (!client)
            return;
        const id = `${userId}_${bank}_${startDate}_${endDate}`;
        check(await client.from('reconciled_periods').upsert({
            id,
            user_id: userId,
            bank,
            start_date: startDate,
            end_date: endDate,
            reconciled_at: reconciledAt
        }), 'Error guardando periodo conciliado');
    },
    async saveIgnoredExternalId(userId, externalId) {
        const client = getSupabaseClient();
        if (!client)
            return;
        const id = `${userId}_${externalId}`;
        check(await client.from('ignored_external_ids').upsert({
            id,
            user_id: userId,
            external_id: externalId
        }), 'Error guardando ID ignorado');
    },
    async saveGoogleConfig(clientId, clientSecret, redirectUri) {
        const client = getSupabaseClient();
        if (!client)
            return;
        check(await client.from('app_config').upsert({
            key: 'oauth_google',
            value: { clientId, clientSecret, redirectUri },
            updated_at: new Date().toISOString()
        }), 'Error guardando configuración de Google');
    }
};
