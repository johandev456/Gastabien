import { bankParserFactory } from '../parsers/parser.factory';
import { categorizationService } from '../services/categorization.service';

const testCases = [
  {
    name: 'Promerica Payday Income (Day 15)',
    email: {
      id: 'payday-15',
      from: 'notificaciones@promerica.com.do',
      subject: 'Aviso de Depósito / Nómina Banco Promerica',
      date: new Date('2026-09-15T10:00:00Z'),
      bodySnippet: '',
      bodyHtml: `
        <p>Estimado cliente, se ha acreditado un depósito por concepto de nómina de RD$ 48,500.00 en su cuenta terminada en 3821 el 15/09/2026.</p>
      `
    },
    expectedType: 'INCOME',
    expectedAmount: 48500.00,
    expectedCategory: 'Ingresos y Nómina'
  },
  {
    name: 'Promerica Payday Income (Day 30)',
    email: {
      id: 'payday-30',
      from: 'notificaciones@promerica.com.do',
      subject: 'Notificación de Transacción Banco Promerica',
      date: new Date('2026-09-30T16:30:00Z'),
      bodySnippet: '',
      bodyHtml: `
        <table>
          <tr><td>Monto:</td><td>RD$ 48,500.00</td></tr>
          <tr><td>Concepto:</td><td>Abono de Nómina Quincenal</td></tr>
          <tr><td>Fecha y hora:</td><td>30/09/2026 04:30 PM</td></tr>
        </table>
      `
    },
    expectedType: 'INCOME',
    expectedAmount: 48500.00,
    expectedCategory: 'Ingresos y Nómina'
  },
  {
    name: 'Promerica ATM Cash Withdrawal',
    email: {
      id: 'atm-promerica',
      from: 'notificaciones@promerica.com.do',
      subject: 'Notificación de Transacción Banco Promerica',
      date: new Date('2026-09-20T14:15:00Z'),
      bodySnippet: '',
      bodyHtml: `
        <table>
          <tr><td>Tarjeta:</td><td>************3821</td></tr>
          <tr><td>Transacción:</td><td>Retiro en Cajero Automático</td></tr>
          <tr><td>Ubicación:</td><td>ATM PROMERICA BELLA VISTA</td></tr>
          <tr><td>Monto:</td><td>RD$ 4,000.00</td></tr>
          <tr><td>Fecha y hora:</td><td>20/09/2026 02:15 PM</td></tr>
        </table>
      `
    },
    expectedType: 'EXPENSE',
    expectedAmount: 4000.00,
    expectedCategory: 'Retiro de Efectivo'
  },
  {
    name: 'Popular ATM Cash Withdrawal',
    email: {
      id: 'atm-popular',
      from: 'notificaciones@bpd.com.do',
      subject: 'Aviso de Débito por Retiro en Cajero Automático',
      date: new Date('2026-09-18T11:00:00Z'),
      bodySnippet: '',
      bodyHtml: `
        <p>Estimado cliente, se ha procesado un retiro de efectivo por un monto de RD$ 2,500.00 en Cajero Popular Lincoln con su tarjeta No. 4829.</p>
      `
    },
    expectedType: 'EXPENSE',
    expectedAmount: 2500.00,
    expectedCategory: 'Retiro de Efectivo'
  }
];

console.log('--- Running Payday and ATM Unit Tests ---');
let allPassed = true;

for (const tc of testCases) {
  const parsed = bankParserFactory.parseEmail(tc.email);
  if (!parsed) {
    console.error(`❌ [FAILED] ${tc.name}: Email parser returned null`);
    allPassed = false;
    continue;
  }

  const category = categorizationService.categorize(parsed.merchant, parsed.description, parsed.type);

  const typeOk = parsed.type === tc.expectedType;
  const amountOk = Math.abs(parsed.amount - tc.expectedAmount) < 0.01;
  const categoryOk = category === tc.expectedCategory;

  if (typeOk && amountOk && categoryOk) {
    console.log(`✅ [PASSED] ${tc.name}`);
    console.log(`   Comercio/Concepto: "${parsed.merchant}" | Tipo: ${parsed.type} | Monto: RD$ ${parsed.amount} | Categoría: ${category}`);
  } else {
    console.error(`❌ [FAILED] ${tc.name}`);
    console.error(`   Got: Type=${parsed.type}, Merchant="${parsed.merchant}", Amount=${parsed.amount}, Category="${category}"`);
    console.error(`   Expected: Type=${tc.expectedType}, Amount=${tc.expectedAmount}, Category="${tc.expectedCategory}"`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL PAYDAY & ATM TESTS PASSED!');
} else {
  process.exit(1);
}
