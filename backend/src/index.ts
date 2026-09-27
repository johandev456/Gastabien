import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { initDatabase } from './database/db';
import authRoutes from './routes/auth.routes';
import syncRoutes from './routes/sync.routes';
import transactionsRoutes from './routes/transactions.routes';
import analyticsRoutes from './routes/analytics.routes';
import banksRoutes from './routes/banks.routes';
import statementRoutes from './routes/statement.routes';
import { syncService } from './services/sync.service';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Bypass-Tunnel-Reminder', 'bypass-tunnel-reminder', '*']
}));
app.options('*', cors());
app.use(express.json());

// Initialize Database
initDatabase();

// Preload demo data if empty so user has immediate rich experience
try {
  const summary = syncService.simulateSync('demo-user-id');
  console.log(`Initialized database with ${summary.newTransactionsCount} initial demo transactions`);
} catch (e) {
  console.warn('Initial data seeding skipped:', e);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/banks', banksRoutes);
app.use('/api/statement', statementRoutes);

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
const webDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

const PORT = CONFIG.PORT;
app.listen(PORT, () => {
  console.log(`🚀 GastaBien Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
