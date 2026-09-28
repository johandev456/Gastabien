"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const db_1 = require("./database/db");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
const transactions_routes_1 = __importDefault(require("./routes/transactions.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const banks_routes_1 = __importDefault(require("./routes/banks.routes"));
const statement_routes_1 = __importDefault(require("./routes/statement.routes"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-device-token', 'x-client-platform', 'Bypass-Tunnel-Reminder', 'bypass-tunnel-reminder', '*']
}));
app.options('*', (0, cors_1.default)());
app.use(express_1.default.json());
// Initialize Database
(0, db_1.initDatabase)();
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/sync', auth_middleware_1.require2FA, sync_routes_1.default);
app.use('/api/transactions', auth_middleware_1.require2FA, transactions_routes_1.default);
app.use('/api/analytics', auth_middleware_1.require2FA, analytics_routes_1.default);
app.use('/api/banks', auth_middleware_1.require2FA, banks_routes_1.default);
app.use('/api/statement', auth_middleware_1.require2FA, statement_routes_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        app: 'GastaBien API - Dominican Republic Bank Tracker',
        version: '1.0.0',
        supportedBanks: ['POPULAR', 'BHD', 'PROMERICA', 'QIK'],
        time: new Date().toISOString()
    });
});
// Serve frontend static build if present
const webDistPath = path_1.default.resolve(__dirname, '../../web/dist');
if (fs_1.default.existsSync(webDistPath)) {
    app.use(express_1.default.static(webDistPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path_1.default.join(webDistPath, 'index.html'));
    });
}
const PORT = config_1.CONFIG.PORT;
app.listen(PORT, () => {
    console.log(`🚀 GastaBien Backend Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
