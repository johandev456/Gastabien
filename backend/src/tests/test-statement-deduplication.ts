import { initDatabase, dbOps } from '../database/db';
import { statementService } from '../services/statement.service';
import { syncService } from '../services/sync.service';

// 1. Initialize
initDatabase();
const testUserId = 'test-dedup-user';
dbOps.clearAllData(testUserId);

console.log('--- Testing Statement Import & Email Sync Deduplication ---');

// 2. Sample Promerica Statement CSV (Similar to user's real account)
const sampleStatementCsv = `
"Fecha de Posteo","Fecha de Transacción","Canal","Código","No. Referencia","Descripción","Retiros","Depósitos","Balance"
"01/09/2026","01/09/2026","ATM","57-81","1001","RETIRO ATM BELLA VISTA SANTO DOMINGO DO","4,000.00","0.00","45,000.00"
"05/09/2026","05/09/2026","POS","51-01","1002","COMPRA POS SM BRAVO CHURCHILL SANTO DOMINGO","2,450.00","0.00","42,550.00"
"10/09/2026","10/09/2026","POS","51-01","1003","COMPRA POS TOTALENERGIES 27 FEB SANTO DOMINGO","2,000.00","0.00","40,550.00"
"15/09/2026","15/09/2026","ACH","58-27","1004","ABONO DE NOMINA PRIMERA QUINCENA DE SEPTIEMBRE","0.00","48,500.00","89,050.00"
"20/09/2026","20/09/2026","POS","51-01","1005","COMPRA POS NETFLIX.COM US","950.00","0.00","88,100.00"
"25/09/2026","25/09/2026","POS","51-01","1006","COMPRA POS UBER TRIP SANTO DOMINGO","750.00","0.00","87,350.00"
"30/09/2026","30/09/2026","ACH","58-27","1007","ABONO DE NOMINA SEGUNDA QUINCENA DE SEPTIEMBRE","0.00","48,500.00","135,850.00"
`;

// 3. Reconcile Statement
console.log('Step 1: Reconciling Promerica Statement...');
const report = statementService.reconcile(testUserId, sampleStatementCsv, 'PROMERICA', true);
console.log(`Reconciled: ${report.totalStatementEntries} statement entries, Added: ${report.addedCount}, Matched: ${report.matchedCount}`);

const txsAfterStatement = dbOps.getTransactions(testUserId, { bank: 'PROMERICA' });
console.log(`Total transactions in DB after statement: ${txsAfterStatement.length}`);

let totalExpenses = txsAfterStatement.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
let totalIncome = txsAfterStatement.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
let netBalance = totalIncome - totalExpenses;

console.log(`Initial Statement Totals -> Income: RD$ ${totalIncome.toFixed(2)}, Expenses: RD$ ${totalExpenses.toFixed(2)}, Net: RD$ ${netBalance.toFixed(2)}`);

if (txsAfterStatement.length !== 7) {
  console.error(`❌ Expected 7 statement transactions, got ${txsAfterStatement.length}`);
  process.exit(1);
}

// 4. Now simulate incoming bank emails for the same transactions (e.g. Netflix, Total, Uber, Nómina)
console.log('\nStep 2: Simulating incoming email scan for transactions already in statement...');
const incomingEmail1 = {
  bank: 'PROMERICA' as const,
  type: 'EXPENSE' as const,
  amount: 2000.00,
  currency: 'DOP' as const,
  merchant: 'TotalEnergies 27 de Febrero',
  description: 'Aviso de compra con tarjeta TotalEnergies',
  date: new Date('2026-09-10T12:00:00Z'),
  externalId: 'email-prom-total-001'
};

const check1 = dbOps.isDuplicateTransaction(testUserId, incomingEmail1);
console.log(`Email 1 (TotalEnergies RD$2,000.00): isDuplicate=${check1.isDuplicate}, reason=${check1.reason}`);
if (!check1.isDuplicate) {
  console.error('❌ Failed: Email 1 was NOT detected as duplicate!');
  process.exit(1);
}

const incomingEmail2 = {
  bank: 'PROMERICA' as const,
  type: 'EXPENSE' as const,
  amount: 750.00,
  currency: 'DOP' as const,
  merchant: 'UBER TRIP SANTO DOMINGO',
  description: 'Notificación de consumo Uber',
  date: new Date('2026-09-25T18:30:00Z'),
  externalId: 'email-prom-uber-002'
};

const check2 = dbOps.isDuplicateTransaction(testUserId, incomingEmail2);
console.log(`Email 2 (Uber RD$750.00): isDuplicate=${check2.isDuplicate}, reason=${check2.reason}`);
if (!check2.isDuplicate) {
  console.error('❌ Failed: Email 2 was NOT detected as duplicate!');
  process.exit(1);
}

// 5. Test ghost email inside statement period that was never in the statement (e.g. declined auth)
const ghostEmail = {
  bank: 'PROMERICA' as const,
  type: 'EXPENSE' as const,
  amount: 19999.00,
  currency: 'DOP' as const,
  merchant: 'Ghost Declined Store',
  description: 'Declined transaction notification',
  date: new Date('2026-09-12T10:00:00Z'),
  externalId: 'email-ghost-auth'
};

const checkGhost = dbOps.isDuplicateTransaction(testUserId, ghostEmail);
console.log(`Email 3 (Ghost auth inside statement period): isDuplicate=${checkGhost.isDuplicate}, reason=${checkGhost.reason}`);
if (!checkGhost.isDuplicate || checkGhost.reason !== 'WITHIN_RECONCILED_STATEMENT_PERIOD') {
  console.error('❌ Failed: Ghost email inside reconciled statement period was not rejected!');
  process.exit(1);
}

// 6. Test genuine NEW transaction AFTER statement period (e.g. October 2026)
console.log('\nStep 3: Testing genuine NEW transaction AFTER statement cutoff...');
const newRealEmail = {
  bank: 'PROMERICA' as const,
  type: 'EXPENSE' as const,
  amount: 1500.00,
  currency: 'DOP' as const,
  merchant: 'Restaurante El Conuco',
  description: 'Consumo Restaurante El Conuco',
  date: new Date('2026-10-02T19:00:00Z'),
  externalId: 'email-real-october'
};

const checkNew = dbOps.isDuplicateTransaction(testUserId, newRealEmail);
console.log(`Email 4 (New purchase in October): isDuplicate=${checkNew.isDuplicate}`);
if (checkNew.isDuplicate) {
  console.error('❌ Failed: Genuine new transaction was incorrectly flagged as duplicate!');
  process.exit(1);
}

// 7. Verify final DB state
const finalTxs = dbOps.getTransactions(testUserId, { bank: 'PROMERICA' });
let finalExpenses = finalTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
let finalIncome = finalTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
let finalNet = finalIncome - finalExpenses;

console.log(`\nFinal Totals -> Income: RD$ ${finalIncome.toFixed(2)}, Expenses: RD$ ${finalExpenses.toFixed(2)}, Net: RD$ ${finalNet.toFixed(2)}`);
if (finalExpenses !== totalExpenses || finalIncome !== totalIncome || finalNet !== netBalance) {
  console.error('❌ Failed: Totals changed when scanning emails!');
  process.exit(1);
}

console.log('\n🎉 ALL STATEMENT DEDUPLICATION TESTS PASSED PERFECTLY!');
