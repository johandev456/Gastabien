import { bankParserFactory } from '../parsers/parser.factory';
import { categorizationService } from '../services/categorization.service';

const testCases = [
  {
    name: 'Promerica Coffee Shop PUCMM',
    email: {
      id: 'test-1',
      from: 'notificaciones@promerica.com.do',
      subject: 'Notificación de Transacción Banco Promerica',
      date: new Date(),
      bodySnippet: '',
      bodyHtml: `
        <table>
          <tr><td>Tarjeta:</td><td>************3821</td></tr>
          <tr><td>Comercio:</td><td>COFFEE SHOP PUCMM SDG SANTO DOMINGO DO</td></tr>
          <tr><td>Fecha y hora:</td><td>25/09/2026 05:23 PM</td></tr>
          <tr><td>Monto:</td><td>RD$ 146.44</td></tr>
          <tr><td>Aprobación:</td><td>11310500315705</td></tr>
        </table>
      `
    },
    expectedMerchant: 'COFFEE SHOP PUCMM SDG',
    expectedAmount: 146.44,
    expectedCategory: 'Restaurantes y Comida'
  },
  {
    name: 'Promerica SM Bravo La Esperilla',
    email: {
      id: 'test-2',
      from: 'notificaciones@promerica.com.do',
      subject: 'Notificación de Transacción Banco Promerica',
      date: new Date(),
      bodySnippet: '',
      bodyHtml: `
        <table>
          <tr><td>Tarjeta:</td><td>************3821</td></tr>
          <tr><td>Comercio:</td><td>SM BRAVO LA ESPERILLA SANTO DOMINGO DO</td></tr>
          <tr><td>Fecha y hora:</td><td>25/09/2026 12:12 PM</td></tr>
          <tr><td>Monto:</td><td>RD$ 35.00</td></tr>
          <tr><td>Aprobación:</td><td>11310500315705</td></tr>
        </table>
      `
    },
    expectedMerchant: 'SM BRAVO LA ESPERILLA',
    expectedAmount: 35.00,
    expectedCategory: 'Supermercados'
  },
  {
    name: 'Promerica SM Nacional 27 de Feb',
    email: {
      id: 'test-3',
      from: 'notificaciones@promerica.com.do',
      subject: 'Notificación de Transacción Banco Promerica',
      date: new Date(),
      bodySnippet: '',
      bodyHtml: `
        <table>
          <tr><td>Tarjeta:</td><td>************3821</td></tr>
          <tr><td>Comercio:</td><td>SM NACIONAL 27 DE FEB SANTO DOMINGO DO</td></tr>
          <tr><td>Fecha y hora:</td><td>23/09/2026 06:21 PM</td></tr>
          <tr><td>Monto:</td><td>RD$ 298.85</td></tr>
        </table>
      `
    },
    expectedMerchant: 'SM NACIONAL 27 DE FEB',
    expectedAmount: 298.85,
    expectedCategory: 'Supermercados'
  },
  {
    name: 'Promerica Notification SMS Fee (2 pesos)',
    email: {
      id: 'test-4',
      from: 'notificaciones@promerica.com.do',
      subject: 'Notificación de Transacción Banco Promerica',
      date: new Date(),
      bodySnippet: '',
      bodyHtml: `
        <p>Se ha realizado un cargo por servicio de notificación SMS de RD$ 2.00 a su tarjeta ************3821.</p>
      `
    },
    expectedMerchant: 'Cargo por Notificación SMS',
    expectedAmount: 2.00,
    expectedCategory: 'Servicios y Facturas'
  },
  {
    name: 'Approval code safety check (Must NOT parse approval as 11 trillion pesos)',
    email: {
      id: 'test-5',
      from: 'notificaciones@promerica.com.do',
      subject: 'Notificación de Transacción Banco Promerica',
      date: new Date(),
      bodySnippet: '',
      bodyHtml: `
        <table>
          <tr><td>Tarjeta:</td><td>************3821</td></tr>
          <tr><td>Comercio:</td><td>ESTACION TOTAL CHURCHILL</td></tr>
          <tr><td>Fecha y hora:</td><td>25/09/2026 08:23 AM</td></tr>
          <tr><td>Monto:</td><td>RD$ 1,500.00</td></tr>
          <tr><td>No. Autorización:</td><td>11310500315705</td></tr>
        </table>
      `
    },
    expectedMerchant: 'ESTACION TOTAL CHURCHILL',
    expectedAmount: 1500.00,
    expectedCategory: 'Combustible'
  }
];

console.log('--- Running Bank Parsing Unit Tests ---');
let allPassed = true;

for (const tc of testCases) {
  const parsed = bankParserFactory.parseEmail(tc.email);
  if (!parsed) {
    console.error(`❌ [FAILED] ${tc.name}: Failed to parse email`);
    allPassed = false;
    continue;
  }

  const category = categorizationService.categorize(parsed.merchant, parsed.description, parsed.type);

  const amountOk = Math.abs(parsed.amount - tc.expectedAmount) < 0.01;
  const merchantOk = parsed.merchant.includes(tc.expectedMerchant) || tc.expectedMerchant.includes(parsed.merchant);
  const categoryOk = category === tc.expectedCategory;

  if (amountOk && merchantOk && categoryOk) {
    console.log(`✅ [PASSED] ${tc.name}`);
    console.log(`   Comercio: "${parsed.merchant}" | Monto: ${parsed.currency} ${parsed.amount} | Categoría: ${category}`);
  } else {
    console.error(`❌ [FAILED] ${tc.name}`);
    console.error(`   Got: Merchant="${parsed.merchant}", Amount=${parsed.amount}, Category="${category}"`);
    console.error(`   Expected: Merchant="${tc.expectedMerchant}", Amount=${tc.expectedAmount}, Category="${tc.expectedCategory}"`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL TESTS PASSED! Parsing and categorization are 100% accurate!');
} else {
  process.exit(1);
}
