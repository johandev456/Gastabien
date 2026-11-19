import { gmailService } from './gmail.service';
import { bankParserFactory } from '../parsers/parser.factory';
import { categorizationService } from './categorization.service';
import { dbOps } from '../database/db';
import { RawEmailData, Transaction } from '../types';

export class SyncService {
  private syncInProgress = new Set<string>();

  /**
   * @param options.full  When true, scans the whole mailbox (used by re-sync);
   *                      otherwise only emails since the last successful sync.
   */
  public isSyncing(userId: string): boolean {
    return this.syncInProgress.has(userId);
  }

  /**
   * @param options.clearEmailTransactions  Re-sync: remove Gmail-sourced transactions first.
   *        Done here, under the per-user lock, so it can never run while another sync is active.
   */
  public async syncUserGmail(userId: string, options: { full?: boolean; clearEmailTransactions?: boolean } = {}): Promise<{
    status: 'SUCCESS' | 'FAILED';
    emailsProcessed: number;
    newTransactionsCount: number;
    transactions: Transaction[];
    error?: string;
    removedCount?: number;
  }> {
    if (this.syncInProgress.has(userId)) {
      return {
        status: 'FAILED',
        emailsProcessed: 0,
        newTransactionsCount: 0,
        transactions: [],
        error: 'Ya hay una sincronización en curso. Espera a que termine.'
      };
    }
    this.syncInProgress.add(userId);

    let emailsProcessed = 0;
    let newCount = 0;
    let removedCount: number | undefined;
    const createdList: Transaction[] = [];
    try {
      if (options.clearEmailTransactions) {
        removedCount = await dbOps.clearEmailTransactions(userId);
      }
      const user = dbOps.getUser(userId);
      const since = !options.full && user?.last_sync_at ? new Date(user.last_sync_at) : undefined;
      const { emails, failedCount } = await gmailService.fetchBankEmails(userId, { since });

      for (const email of emails) {
        emailsProcessed++;
        const parsed = bankParserFactory.parseEmail(email);
        if (!parsed) continue;

        // Multi-tier Deduplication check
        const dupCheck = dbOps.isDuplicateTransaction(userId, {
          bank: parsed.bank,
          type: parsed.type,
          amount: parsed.amount,
          currency: parsed.currency,
          merchant: parsed.merchant,
          description: parsed.description,
          date: parsed.date,
          externalId: parsed.externalId
        });
        if (dupCheck.isDuplicate) continue;

        // Auto Categorization
        const category = categorizationService.categorize(parsed.merchant, parsed.description, parsed.type);

        const newTx = dbOps.createTransaction({
          ...parsed,
          userId,
          category,
          isManual: false
        });

        createdList.push(newTx);
        newCount++;
      }

      // Only advance the incremental cursor when every message was downloaded; otherwise the
      // next sync re-scans the same window and picks up the ones that failed.
      if (failedCount === 0) {
        dbOps.updateUserLastSync(userId);
      }
      dbOps.logSync(
        userId,
        'SUCCESS',
        emailsProcessed,
        newCount,
        failedCount > 0 ? `${failedCount} correos no se pudieron descargar; se reintentarán` : undefined
      );

      return {
        status: 'SUCCESS',
        emailsProcessed,
        newTransactionsCount: newCount,
        removedCount,
        transactions: createdList
      };
    } catch (err: any) {
      console.error(`Sync error for user ${userId}:`, err);
      dbOps.logSync(userId, 'FAILED', emailsProcessed, newCount, err.message || 'Error desconocido');
      return {
        status: 'FAILED',
        emailsProcessed,
        newTransactionsCount: newCount,
        transactions: createdList,
        error: err.message || 'Error al sincronizar con Gmail'
      };
    } finally {
      this.syncInProgress.delete(userId);
    }
  }

  /**
   * Generates realistic Dominican bank emails for instant testing/demoing
   */
  public generateSimulatedBankEmails(): RawEmailData[] {
    const now = new Date();
    const daysAgo = (days: number, hours: number = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      d.setHours(d.getHours() - hours);
      return d;
    };

    return [
      {
        id: 'sim-pop-001',
        from: 'notificaciones@bpd.com.do',
        subject: 'Aviso de Débito por Compra con Tarjeta',
        date: daysAgo(0, 2),
        bodySnippet: 'Estimado cliente, se ha realizado un débito por compra con su Tarjeta terminada en 4829 por un monto de RD$ 2,450.00 en ESTACION TOTAL CHURCHILL el día de hoy.',
        bodyText: 'Estimado cliente, se ha realizado un débito por compra con su Tarjeta terminada en 4829 por un monto de RD$ 2,450.00 en ESTACION TOTAL CHURCHILL.'
      },
      {
        id: 'sim-bhd-002',
        from: 'alertas@bhd.com.do',
        subject: 'Alerta BHD - Consumo con Tarjeta de Crédito',
        date: daysAgo(1, 4),
        bodySnippet: 'Alerta BHD: Consumo aprobado por RD$ 5,890.75 en SUPERMERCADOS NACIONAL con su tarjeta terminada en 9102.',
        bodyText: 'Alerta BHD: Consumo aprobado por RD$ 5,890.75 en SUPERMERCADOS NACIONAL con su tarjeta terminada en 9102.'
      },
      {
        id: 'sim-qik-003',
        from: 'notificaciones@qik.com.do',
        subject: '¡Transacción aprobada en PedidosYa!',
        date: daysAgo(2, 1),
        bodySnippet: 'Has realizado un consumo por RD$ 890.00 en el comercio PedidosYa Santo Domingo con tu tarjeta digital Qik terminada en 1104.',
        bodyText: 'Has realizado un consumo por RD$ 890.00 en el comercio PedidosYa Santo Domingo con tu tarjeta digital Qik terminada en 1104.'
      },
      {
        id: 'sim-prom-004',
        from: 'notificaciones@promerica.com.do',
        subject: 'Notificación de Transacción Banco Promerica',
        date: daysAgo(3, 5),
        bodySnippet: 'Estimado cliente, se ha registrado una transacción por US$ 15.99 en NETFLIX.COM con su tarjeta Club Promerica terminada en 3321.',
        bodyText: 'Estimado cliente, se ha registrado una transacción por US$ 15.99 en NETFLIX.COM con su tarjeta Club Promerica terminada en 3321.'
      },
      {
        id: 'sim-pop-005',
        from: 'notificaciones@bpd.com.do',
        subject: 'Aviso de Depósito por Nómina',
        date: daysAgo(5, 8),
        bodySnippet: 'Banco Popular le informa que ha recibido un crédito por nómina de RD$ 65,000.00 en su cuenta de ahorros No. 7829102.',
        bodyText: 'Banco Popular le informa que ha recibido un crédito por nómina de RD$ 65,000.00 en su cuenta de ahorros No. 7829102.'
      },
      {
        id: 'sim-bhd-006',
        from: 'alertas@bhd.com.do',
        subject: 'Alerta BHD - Débito por Pago de Servicio',
        date: daysAgo(7, 3),
        bodySnippet: 'Alerta BHD: Se ha procesado el pago de facturas por RD$ 3,200.00 a favor de CLARO DOMINICANA con su cuenta No. 5512.',
        bodyText: 'Alerta BHD: Se ha procesado el pago de facturas por RD$ 3,200.00 a favor de CLARO DOMINICANA con su cuenta No. 5512.'
      },
      {
        id: 'sim-qik-007',
        from: 'notificaciones@qik.com.do',
        subject: '¡Transacción aprobada en Farmacia Carol!',
        date: daysAgo(8, 6),
        bodySnippet: 'Consumo por RD$ 1,420.00 en Farmacia Carol 27 de Febrero con tu tarjeta Qik terminada en 1104.',
        bodyText: 'Consumo por RD$ 1,420.00 en Farmacia Carol 27 de Febrero con tu tarjeta Qik terminada en 1104.'
      },
      {
        id: 'sim-pop-008',
        from: 'notificaciones@bpd.com.do',
        subject: 'Aviso de Débito por Compra en Supermercados Bravo',
        date: daysAgo(10, 2),
        bodySnippet: 'Estimado cliente, compra aprobada por RD$ 4,310.50 en SUPERMERCADO BRAVO CHURCHILL con su tarjeta No. 4829.',
        bodyText: 'Estimado cliente, compra aprobada por RD$ 4,310.50 en SUPERMERCADO BRAVO CHURCHILL con su tarjeta No. 4829.'
      },
      {
        id: 'sim-prom-009',
        from: 'notificaciones@promerica.com.do',
        subject: 'Notificación de Transacción Banco Promerica',
        date: daysAgo(12, 1),
        bodySnippet: 'Estimado cliente, consumo por RD$ 750.00 en UBER TRIP SANTO DOMINGO con su tarjeta terminada en 3321.',
        bodyText: 'Estimado cliente, consumo por RD$ 750.00 en UBER TRIP SANTO DOMINGO con su tarjeta terminada en 3321.'
      },
      {
        id: 'sim-qik-010',
        from: 'notificaciones@qik.com.do',
        subject: '¡Has recibido un Cashback en tu cuenta Qik!',
        date: daysAgo(14, 5),
        bodySnippet: '¡Felicidades! Se ha acreditado un cashback de RD$ 850.00 en tu cuenta Qik por tus consumos del mes.',
        bodyText: '¡Felicidades! Se ha acreditado un cashback de RD$ 850.00 en tu cuenta Qik por tus consumos del mes.'
      }
    ];
  }

  public simulateSync(userId: string) {
    const simulatedEmails = this.generateSimulatedBankEmails();
    let count = 0;
    const createdList: Transaction[] = [];

    for (const email of simulatedEmails) {
      const parsed = bankParserFactory.parseEmail(email);
      if (!parsed) continue;

      const dupCheck = dbOps.isDuplicateTransaction(userId, {
        bank: parsed.bank,
        type: parsed.type,
        amount: parsed.amount,
        currency: parsed.currency,
        merchant: parsed.merchant,
        description: parsed.description,
        date: parsed.date,
        externalId: parsed.externalId
      });
      if (dupCheck.isDuplicate) continue;

      const category = categorizationService.categorize(parsed.merchant, parsed.description, parsed.type);

      const newTx = dbOps.createTransaction({
        ...parsed,
        userId,
        category,
        isManual: false
      });

      createdList.push(newTx);
      count++;
    }

    dbOps.updateUserLastSync(userId);
    dbOps.logSync(userId, 'SUCCESS', simulatedEmails.length, count);

    return {
      status: 'SUCCESS',
      emailsProcessed: simulatedEmails.length,
      newTransactionsCount: count,
      transactions: createdList
    };
  }
}

export const syncService = new SyncService();
