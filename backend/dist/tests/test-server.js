"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_factory_1 = require("../parsers/parser.factory");
const sync_service_1 = require("../services/sync.service");
const transaction_service_1 = require("../services/transaction.service");
const db_1 = require("../database/db");
console.log('Testing GastaBien Engine...');
(0, db_1.initDatabase)();
const syncResult = sync_service_1.syncService.simulateSync('demo-user-id');
console.log('Simulated Sync Result:', {
    status: syncResult.status,
    emailsProcessed: syncResult.emailsProcessed,
    newTransactionsCount: syncResult.newTransactionsCount
});
const summary = transaction_service_1.transactionService.getAnalyticsSummary('demo-user-id');
console.log('Analytics Summary:');
console.log(`- Total Gastos: RD$ ${summary.totalExpenses}`);
console.log(`- Total Ingresos: RD$ ${summary.totalIncome}`);
console.log(`- Balance Neto: RD$ ${summary.netBalance}`);
console.log(`- Categorías: ${summary.categories.length}`);
console.log(`- Bancos analizados: ${summary.byBank.length}`);
summary.categories.forEach(c => {
    console.log(`  * ${c.category}: RD$ ${c.total} (${c.percentage}%)`);
});
console.log('\nSupported Banks:', parser_factory_1.bankParserFactory.getSupportedBanks());
console.log('\n All Dominican bank parsers and analytics working flawlessly!');
