import { dbOps } from '../database/db';
import { AnalyticsSummary, CategorySummary, Category, BankCode, Transaction } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, SUPPORTED_BANKS, CONFIG } from '../config';
import { drMonthKey } from '../utils/date';

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
  public getAnalyticsSummary(userId: string, filterBanks?: BankCode[], filterMonth?: string): AnalyticsSummary {
    const allRawTransactions = dbOps.getTransactions(userId).map(enrichTransaction);

    const bankFiltered = filterBanks && filterBanks.length > 0
      ? allRawTransactions.filter(tx => filterBanks.includes(tx.bank))
      : allRawTransactions;

    // Distinct available months (all banks, so the month selector stays stable) and the
    // monthly trend (respecting the bank filter). Months are bucketed in DR local time.
    const availableMonthsSet = new Set<string>();
    for (const tx of allRawTransactions) {
      const key = drMonthKey(tx.date);
      if (key.length === 7) availableMonthsSet.add(key);
    }

    const monthlyMap: Record<string, { expenses: number; income: number }> = {};
    for (const tx of bankFiltered) {
      const monthKey = drMonthKey(tx.date);
      if (monthKey.length === 7) {

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { expenses: 0, income: 0 };
        }
        const dopAmount = tx.amountInDop ?? getAmountInDop(tx.amount, tx.currency);
        if (tx.type === 'EXPENSE') {
          monthlyMap[monthKey].expenses += dopAmount;
        } else if (tx.type === 'INCOME') {
          monthlyMap[monthKey].income += dopAmount;
        }
      }
    }

    const availableMonths = Array.from(availableMonthsSet).sort((a, b) => b.localeCompare(a));

    // Filter transactions by bank, then by selected month if active
    let transactions = bankFiltered;
    if (filterMonth && filterMonth !== 'ALL') {
      transactions = transactions.filter(tx => tx.date && drMonthKey(tx.date) === filterMonth);
    }

    let totalExpenses = 0;
    let totalIncome = 0;

    const categoryTotals: Record<string, { total: number; count: number }> = {};
    const merchantTotals: Record<string, { merchant: string; total: number; count: number; category: Category; lastDate: string }> = {};
    let largestExpense: Transaction | null = null;
    let expenseCount = 0;
    const bankTotals: Record<BankCode, { expenses: number; income: number; count: number }> = {
      POPULAR: { expenses: 0, income: 0, count: 0 },
      BHD: { expenses: 0, income: 0, count: 0 },
      PROMERICA: { expenses: 0, income: 0, count: 0 },
      QIK: { expenses: 0, income: 0, count: 0 },
      MANUAL: { expenses: 0, income: 0, count: 0 }
    };

    for (const tx of transactions) {
      const dopAmount = tx.amountInDop ?? getAmountInDop(tx.amount, tx.currency);

      if (tx.type === 'EXPENSE') {
        totalExpenses += dopAmount;
        expenseCount++;
        if (!largestExpense || dopAmount > (largestExpense.amountInDop ?? 0)) {
          largestExpense = tx;
        }

        const merchantKey = (tx.merchant || 'Sin comercio').trim().toLowerCase();
        if (!merchantTotals[merchantKey]) {
          merchantTotals[merchantKey] = { merchant: tx.merchant || 'Sin comercio', total: 0, count: 0, category: tx.category, lastDate: tx.date };
        }
        merchantTotals[merchantKey].total += dopAmount;
        merchantTotals[merchantKey].count += 1;
        if (tx.date > merchantTotals[merchantKey].lastDate) merchantTotals[merchantKey].lastDate = tx.date;

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

    // Bank summary (supported banks always listed; MANUAL only when it has movements)
    const bankCodes = [...(Object.keys(SUPPORTED_BANKS) as BankCode[]), 'MANUAL' as BankCode];
    const byBank = bankCodes
      .filter(code => code !== 'MANUAL' || bankTotals.MANUAL.count > 0)
      .map(code => {
        const config = SUPPORTED_BANKS[code];
        const stats = bankTotals[code] || { expenses: 0, income: 0, count: 0 };
        return {
          bank: code,
          bankName: config ? config.name : 'Manual / Efectivo',
          totalExpenses: Math.round(stats.expenses * 100) / 100,
          totalIncome: Math.round(stats.income * 100) / 100,
          count: stats.count,
          color: config ? config.color : '#64748B'
        };
      });

    const topMerchants = Object.values(merchantTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(m => ({
        merchant: m.merchant,
        total: Math.round(m.total * 100) / 100,
        count: m.count,
        category: m.category,
        percentage: totalExpenses > 0 ? Math.round((m.total / totalExpenses) * 1000) / 10 : 0,
        lastDate: m.lastDate
      }));

    // Monthly trends (last 6 distinct months)
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
      topMerchants,
      merchantsCount: Object.keys(merchantTotals).length,
      expenseCount,
      averageExpense: expenseCount > 0 ? Math.round((totalExpenses / expenseCount) * 100) / 100 : 0,
      largestExpense,
      monthlyTrend,
      availableMonths,
      selectedMonth: filterMonth || 'ALL'
    };
  }
}

export const transactionService = new TransactionService();
