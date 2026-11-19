-- ==============================================================================
-- GASTABIEN RD - SUPABASE CLOUD DATABASE SCHEMA
-- Copia y pega este script completo en el SQL Editor de tu proyecto en Supabase
-- (Supabase Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. TABLA DE USUARIOS & TOKENS OAUTH
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    google_refresh_token TEXT,
    google_access_token TEXT,
    token_expiry BIGINT,
    created_at TEXT NOT NULL,
    last_sync_at TEXT
);

-- 2. TABLA DE TRANSACCIONES BANCARIAS
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    external_id TEXT,
    bank TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'EXPENSE', 'INCOME', 'TRANSFER'
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'DOP',
    amount_in_dop NUMERIC,
    exchange_rate NUMERIC,
    merchant TEXT NOT NULL,
    account_reference TEXT,
    date TEXT NOT NULL,
    raw_subject TEXT,
    raw_sender TEXT,
    description TEXT,
    category TEXT NOT NULL,
    confidence_score NUMERIC DEFAULT 1.0,
    notes TEXT,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions (bank);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category);

-- 3. TABLA DE AUTENTICACIÓN DE 2 FACTORES (2FA)
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id TEXT PRIMARY KEY DEFAULT 'global_2fa',
    secret TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    backup_codes JSONB DEFAULT '[]'::jsonb,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. TABLA DE SESIONES DE DISPOSITIVOS AUTORIZADOS
CREATE TABLE IF NOT EXISTS device_sessions (
    token TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL
);

-- 5. TABLA DE PERIODOS RECONCILIADOS (ESTADOS DE CUENTA)
CREATE TABLE IF NOT EXISTS reconciled_periods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bank TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reconciled_at TEXT NOT NULL
);

-- 6. TABLA DE IDs EXTERNOS IGNORADOS (DUPLICADOS / FANTASMAS)
CREATE TABLE IF NOT EXISTS ignored_external_ids (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    external_id TEXT NOT NULL
);

-- 7. TABLA DE LOGS DE SINCRONIZACIÓN
CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    emails_processed INTEGER DEFAULT 0,
    transactions_found INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- 8. TABLA DE CONFIGURACIONES GENERALES (OAUTH, ETC)
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TEXT NOT NULL
);

-- Deshabilitar RLS o permitir acceso para Backend con Service Key / Anon Key
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reconciled_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE ignored_external_ids DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- MIGRACIÓN v2 (segura de re-ejecutar)
-- ==============================================================================

-- Marca las categorías editadas manualmente para que no se re-categoricen al reiniciar
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_overridden BOOLEAN DEFAULT FALSE;

-- Índice para búsquedas por ID externo (correo de Gmail)
CREATE INDEX IF NOT EXISTS idx_transactions_user_external ON transactions (user_id, external_id);

-- ==============================================================================
-- SEGURIDAD (RECOMENDADO): Activar Row Level Security
-- ------------------------------------------------------------------------------
-- IMPORTANTE: Ejecuta este bloque SOLO después de configurar en Render la variable
-- SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_KEY) con la clave "service_role" de tu
-- proyecto. La clave "anon" es pública: con RLS desactivado cualquiera que la tenga
-- puede leer tus transacciones, el secreto 2FA y los tokens de sesión.
-- Con RLS activado y sin políticas, solo la clave service_role (backend) tiene acceso.
-- ==============================================================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reconciled_periods ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ignored_external_ids ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
