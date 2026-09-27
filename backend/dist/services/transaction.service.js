"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionService = exports.TransactionService = void 0;
const db_1 = require("../database/db");
const config_1 = require("../config");
class TransactionService {
    getAnalyticsSummary(userId, filterBanks) {
        let transactions = db_1.dbOps.getTransactions(userId);
        // Apply bank filter if specified
        if (filterBanks && filterBanks.length > 0) {
            transactions = transactions.filter(tx => filterBanks.includes(tx.bank));
        }
        let totalExpenses = 0;
        let totalIncome = 0;
        const categoryTotals = {};
        const bankTotals = {
            POPULAR: { expenses: 0, income: 0, count: 0 },
            BHD: { expenses: 0, income: 0, count: 0 },
            PROMERICA: { expenses: 0, income: 0, count: 0 },
            QIK: { expenses: 0, income: 0, count: 0 },
            MANUAL: { expenses: 0, income: 0, count: 0 }
        };
        const monthlyMap = {};
        for (const tx of transactions) {
            const monthKey = tx.date.substring(0, 7); // YYYY-MM
            if (!monthlyMap[monthKey]) {
                monthlyMap[monthKey] = { expenses: 0, income: 0 };
            }
            if (tx.type === 'EXPENSE') {
                totalExpenses += tx.amount;
                monthlyMap[monthKey].expenses += tx.amount;
                // Categories
                if (!categoryTotals[tx.category]) {
                    categoryTotals[tx.category] = { total: 0, count: 0 };
                }
                categoryTotals[tx.category].total += tx.amount;
                categoryTotals[tx.category].count += 1;
                // Banks
                if (bankTotals[tx.bank]) {
                    bankTotals[tx.bank].expenses += tx.amount;
                    bankTotals[tx.bank].count += 1;
                }
            }
            else if (tx.type === 'INCOME') {
                totalIncome += tx.amount;
                monthlyMap[monthKey].income += tx.amount;
                if (bankTotals[tx.bank]) {
                    bankTotals[tx.bank].income += tx.amount;
                    bankTotals[tx.bank].count += 1;
                }
            }
        }
        const netBalance = totalIncome - totalExpenses;
        // Convert category totals to structured summary
        const categories = Object.entries(categoryTotals).map(([catName, data]) => {
            const cat = catName;
            const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
            return {
                category: cat,
                total: Math.round(data.total * 100) / 100,
                count: data.count,
                percentage: Math.round(percentage * 10) / 10,
                color: config_1.CATEGORY_COLORS[cat] || '#94A3B8',
                icon: config_1.CATEGORY_ICONS[cat] || 'tag'
            };
        }).sort((a, b) => b.total - a.total);
        // Bank summary
        const byBank = Object.keys(config_1.SUPPORTED_BANKS).map(code => {
            const config = config_1.SUPPORTED_BANKS[code];
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
            transactionsCount: transactions.length,
            categories,
            byBank,
            recentTransactions: transactions.slice(0, 10),
            monthlyTrend
        };
    }
}
exports.TransactionService = TransactionService;
exports.transactionService = new TransactionService();
