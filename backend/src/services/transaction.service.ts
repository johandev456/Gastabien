import { dbOps } from '../database/db';
import { AnalyticsSummary, CategorySummary, Category, BankCode, Transaction } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, SUPPORTED_BANKS, CONFIG } from '../config';

export function getAmountInDop(amount: number, currency: 'DOP' | 'USD' = 'DOP'): number {
  if (currency === 'USD') {
    return Math.round(amount * CONFIG.USD_TO_DOP_RATE * 100) / 100;
  }
  return Math.round(amount * 100) / 100;
}

export function enrichTransaction(tx: Transaction): Transaction {
  const amountInDop = getAmountInDop(tx.amount, tx.currency);
  return {
    ...tx,
    amountInDop,
    exchangeRate: tx.currency === 'USD' ? CONFIG.USD_TO_DOP_RATE : 1.0
  };
}

export class TransactionService {
  public getAnalyticsSummary(userId: string, filterBanks?: BankCode[]): AnalyticsSummary {
    let rawTransactions = dbOps.getTransactions(userId);

    // Apply bank filter if specified
    if (filterBanks && filterBanks.length > 0) {
      rawTransactions = rawTransactions.filter(tx => filterBanks.includes(tx.bank));
    }

    const transactions = rawTransactions.map(enrichTransaction);

    let totalExpenses = 0;
    let totalIncome = 0;

    const categoryTotals: Record<string, { total: number; count: number }> = {};
    const bankTotals: Record<BankCode, { expenses: number; income: number; count: number }> = {
      POPULAR: { expenses: 0, income: 0, count: 0 },
      BHD: { expenses: 0, income: 0, count: 0 },
      PROMERICA: { expenses: 0, income: 0, count: 0 },
      QIK: { expenses: 0, income: 0, count: 0 },
      MANUAL: { expenses: 0, income: 0, count: 0 }
    };

    const monthlyMap: Record<string, { expenses: number; income: number }> = {};

    for (const tx of transactions) {
      const dopAmount = tx.amountInDop ?? getAmountInDop(tx.amount, tx.currency);
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { expenses: 0, income: 0 };
      }

      if (tx.type === 'EXPENSE') {
        totalExpenses += dopAmount;
        monthlyMap[monthKey].expenses += dopAmount;

        // Categories
        if (!categoryTotals[tx.category]) {
          categoryTotals[tx.category] = { total: 0, count: 0 };
        }
        categoryTotals[tx.category].total += dopAmount;
        categoryTotals[tx.category].count += 1;

        // Banks
        if (bankTotals[tx.bank]) {
          bankTotals[tx.bank].expenses += dopAmount;
          bankTotals[tx.bank].count += 1;
        }
      } else if (tx.type === 'INCOME') {
        totalIncome += dopAmount;
        monthlyMap[monthKey].income += dopAmount;

        if (bankTotals[tx.bank]) {
          bankTotals[tx.bank].income += dopAmount;
          bankTotals[tx.bank].count += 1;
        }
      }
    }

    const netBalance = totalIncome - totalExpenses;

    // Convert category totals to structured summary
    const categories: CategorySummary[] = Object.entries(categoryTotals).map(([catName, data]) => {
      const cat = catName as Category;
      const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
      return {
        category: cat,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        percentage: Math.round(percentage * 10) / 10,
        color: CATEGORY_COLORS[cat] || '#94A3B8',
        icon: CATEGORY_ICONS[cat] || 'tag'
      };
    }).sort((a, b) => b.total - a.total);

    // Bank summary
    const byBank = (Object.keys(SUPPORTED_BANKS) as BankCode[]).map(code => {
      const config = SUPPORTED_BANKS[code];
      const stats = bankTotals[code] || { expenses: 0, income: 0, count: 0 };
      return {
        bank: code,
        bankName: config.name,
        totalExpenses: Math.round(stats.expenses * 100) / 100,
        totalIncome: Math.round(stats.income * 100) / 100,
        count: stats.count,
        color: config.color
      };
    });

    // Monthly trends
    const monthlyTrend = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => ({
        month,
        expenses: Math.round(data.expenses * 100) / 100,
        income: Math.round(data.income * 100) / 100
      }));

    return {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      currency: 'DOP',
      usdToDopRate: CONFIG.USD_TO_DOP_RATE,
      transactionsCount: transactions.length,
      categories,
      byBank,
      recentTransactions: transactions.slice(0, 10),
      monthlyTrend
    };
  }
}

export const transactionService = new TransactionService();
