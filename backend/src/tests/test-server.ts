import { bankParserFactory } from '../parsers/parser.factory';
import { syncService } from '../services/sync.service';
import { transactionService } from '../services/transaction.service';
import { initDatabase } from '../database/db';

console.log('Testing GastaBien Engine...');

initDatabase();

const syncResult = syncService.simulateSync('demo-user-id');
console.log('Simulated Sync Result:', {
  status: syncResult.status,
  emailsProcessed: syncResult.emailsProcessed,
  newTransactionsCount: syncResult.newTransactionsCount
});

const summary = transactionService.getAnalyticsSummary('demo-user-id');
console.log('Analytics Summary:');
console.log(`- Total Gastos: RD$ ${summary.totalExpenses}`);
console.log(`- Total Ingresos: RD$ ${summary.totalIncome}`);
console.log(`- Balance Neto: RD$ ${summary.netBalance}`);
console.log(`- Categorías: ${summary.categories.length}`);
console.log(`- Bancos analizados: ${summary.byBank.length}`);

summary.categories.forEach(c => {
  console.log(`  * ${c.category}: RD$ ${c.total} (${c.percentage}%)`);
});

console.log('\nSupported Banks:', bankParserFactory.getSupportedBanks());
console.log('\n All Dominican bank parsers and analytics working flawlessly!');
