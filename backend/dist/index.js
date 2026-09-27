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
const sync_service_1 = require("./services/sync.service");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express_1.default.json());
// Initialize Database
(0, db_1.initDatabase)();
// Preload demo data if empty so user has immediate rich experience
try {
    const summary = sync_service_1.syncService.simulateSync('demo-user-id');
    console.log(`Initialized database with ${summary.newTransactionsCount} initial demo transactions`);
}
catch (e) {
    console.warn('Initial data seeding skipped:', e);
}
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/sync', sync_routes_1.default);
app.use('/api/transactions', transactions_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/banks', banks_routes_1.default);
app.use('/api/statement', statement_routes_1.default);
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
