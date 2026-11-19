import { bankParserFactory } from '../parsers/parser.factory';
import { BaseBankParser } from '../parsers/base.parser';
import { drMonthKey } from '../utils/date';
import { RawEmailData } from '../types';
import { statementService } from '../services/statement.service';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✅ [PASSED]' : '❌ [FAILED]'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
}

const email = (over: Partial<RawEmailData>): RawEmailData => ({
  id: 'reg-' + Math.random().toString(36).slice(2),
  from: 'notificaciones@bpd.com.do',
  subject: 'Aviso de Débito por Compra con Tarjeta',
  date: new Date('2026-03-10T15:00:00Z'),
  bodySnippet: '',
  ...over
});

// --- Number normalization ---
const norm: [string, string][] = [
  ['12,500', '12500'], ['1,234,567', '1234567'], ['1.500,00', '1500.00'],
  ['1,234.56', '1234.56'], ['146,44', '146.44'], ['35', '35'], ['2.00', '2.00']
];
for (const [input, expected] of norm) {
  check(`normalizeNumber(${input})`, BaseBankParser.normalizeNumber(input) === expected, String(BaseBankParser.normalizeNumber(input)));
}

// --- Amounts without cents ---
let p = bankParserFactory.parseEmail(email({ bodyText: 'Compra aprobada por RD$ 12,500 en SUPERMERCADO BRAVO con su tarjeta 4829.' }));
check('RD$ 12,500 sin centavos', p?.amount === 12500, String(p?.amount));

p = bankParserFactory.parseEmail(email({ bodyText: 'Monto: RD$ 1.500,00\nComercio: FARMACIA CAROL' }));
check('Formato europeo 1.500,00', p?.amount === 1500, String(p?.amount));

// --- Credit card purchase must be an EXPENSE ---
p = bankParserFactory.parseEmail(email({
  from: 'alertas@bhd.com.do',
  subject: 'Alerta BHD - Consumo con Tarjeta de Crédito',
  bodyText: 'Alerta BHD: Consumo aprobado por RD$ 5,890.75 en SUPERMERCADOS NACIONAL con su tarjeta terminada en 9102.'
}));
check('BHD consumo tarjeta de crédito = EXPENSE', p?.type === 'EXPENSE' && p?.bank === 'BHD', `${p?.bank} ${p?.type} ${p?.merchant}`);

p = bankParserFactory.parseEmail(email({
  from: 'notificaciones@promerica.com.do',
  subject: 'Consumo Tarjeta de Crédito Promerica',
  bodyText: 'Consumo por RD$ 980.00 en PEDIDOSYA con su Tarjeta de Crédito terminada en 3321. Depósitos y pagos se reflejan en 24h.'
}));
check('Promerica consumo tarjeta de crédito = EXPENSE', p?.type === 'EXPENSE', `${p?.type} ${p?.merchant}`);

// --- Generic "Aviso de débito" from BHD must be parsed as BHD ---
p = bankParserFactory.parseEmail(email({
  from: 'alertas@bhd.com.do',
  subject: 'Aviso de Débito',
  bodyText: 'Monto: RD$ 3,200.00\nComercio: CLARO DOMINICANA'
}));
check('BHD "Aviso de débito" detectado como BHD', p?.bank === 'BHD', String(p?.bank));

// --- DR timezone: 9 PM Jan 31 DR must stay in January ---
p = bankParserFactory.parseEmail(email({
  bodyText: 'Compra aprobada por RD$ 500.00 en COLMADO LA ESQUINA el 31/01/2026 09:15 PM con su tarjeta 4829.'
}));
check('31/01 9:15 PM DR queda en enero', !!p && drMonthKey(p.date) === '2026-01', `${p?.date} -> ${p && drMonthKey(p.date)}`);
check('Hora DR convertida a UTC', p?.date === '2026-02-01T01:15:00.000Z', String(p?.date));

// --- Invalid dates fall back to email date ---
p = bankParserFactory.parseEmail(email({ bodyText: 'Compra aprobada por RD$ 500.00 en COLMADO el 31/02/2026.' }));
check('Fecha inválida 31/02 usa fecha del correo', p?.date === '2026-03-10T15:00:00.000Z', String(p?.date));

// --- Statements ---
const semicolonCsv = `Fecha;Descripción;Débito;Crédito;Balance
05/09/2026;COMPRA POS SM BRAVO, CHURCHILL;1.234,56;;10.000,00
06/09/2026;SALDO ANTERIOR;;;8.765,44
15/09/2026;ABONO DE NOMINA;;48.500,00;57.265,44`;
const st = statementService.parseStatementText(semicolonCsv, 'PROMERICA');
check('Estado ; con 1.234,56', st.length === 2 && st[0].amount === 1234.56 && st[0].type === 'EXPENSE', JSON.stringify(st.map(e => [e.amount, e.type])));
check('Fila de solo balance no es ingreso', !st.some(e => /saldo/i.test(e.rawDescription || '')));
check('Nómina 48.500,00', st[1]?.amount === 48500 && st[1]?.type === 'INCOME', String(st[1]?.amount));

const loose = statementService.parseStatementText('Comision cargo servicio 12.50\n03/10/2026 COMPRA COLMADO 350.00', 'POPULAR');
check('"12.50" no se interpreta como fecha', loose.length === 1 && loose[0].date === '2026-10-03', JSON.stringify(loose.map(e => e.date)));
check('Fecha inválida rechazada', statementService.parseAnyDate('31/02/2026') === '');

if (failed > 0) {
  console.error(`\n${failed} prueba(s) fallaron`);
  process.exit(1);
}
console.log('\n🎉 TODAS LAS PRUEBAS DE REGRESIÓN DE PARSERS PASARON');
