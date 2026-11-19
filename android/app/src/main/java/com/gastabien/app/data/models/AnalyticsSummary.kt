package com.gastabien.app.data.models

import com.google.gson.annotations.SerializedName

data class CategorySummary(
    @SerializedName("category") val category: String,
    @SerializedName("total") val total: Double,
    @SerializedName("count") val count: Int,
    @SerializedName("percentage") val percentage: Double,
    @SerializedName("color") val color: String? = null,
    @SerializedName("icon") val icon: String? = null
)

data class BankDistribution(
    @SerializedName("bank") val bank: String,
    @SerializedName("bankName") val bankName: String? = null,
    @SerializedName("totalExpenses") val totalExpenses: Double,
    @SerializedName("totalIncome") val totalIncome: Double,
    @SerializedName("count") val count: Int,
    @SerializedName("color") val color: String? = null
)

data class MonthlyTrend(
    @SerializedName("month") val month: String,
    @SerializedName("expenses") val expenses: Double,
    @SerializedName("income") val income: Double
)

data class TopMerchant(
    @SerializedName("merchant") val merchant: String,
    @SerializedName("total") val total: Double,
    @SerializedName("count") val count: Int,
    @SerializedName("category") val category: String,
    @SerializedName("percentage") val percentage: Double,
    @SerializedName("lastDate") val lastDate: String? = null
)

/*
 * Gson does not run Kotlin constructors, so default values are NOT applied for missing JSON
 * fields and non-null types can still end up null. Optional fields are therefore nullable and
 * read through the safe accessors below.
 */
data class AnalyticsSummary(
    @SerializedName("totalExpenses") val totalExpenses: Double,
    @SerializedName("totalIncome") val totalIncome: Double,
    @SerializedName("netBalance") val netBalance: Double,
    @SerializedName("currency") val currency: String? = "DOP",
    @SerializedName("usdToDopRate") val usdToDopRate: Double? = 60.0,
    @SerializedName("transactionsCount") val transactionsCount: Int,
    @SerializedName("categories") val categories: List<CategorySummary>,
    @SerializedName("byBank") val byBank: List<BankDistribution>,
    @SerializedName("recentTransactions") val recentTransactions: List<Transaction>,
    @SerializedName("monthlyTrend") val monthlyTrend: List<MonthlyTrend>,
    @SerializedName("availableMonths") val availableMonths: List<String>? = null,
    @SerializedName("selectedMonth") val selectedMonth: String? = null,
    @SerializedName("topMerchants") val topMerchants: List<TopMerchant>? = null,
    @SerializedName("merchantsCount") val merchantsCount: Int? = null,
    @SerializedName("expenseCount") val expenseCount: Int? = null,
    @SerializedName("averageExpense") val averageExpense: Double? = null,
    @SerializedName("largestExpense") val largestExpense: Transaction? = null
) {
    /** Exchange rate from the server (configurable there), never a hard-coded 60. */
    val rate: Double get() = usdToDopRate?.takeIf { it > 0 } ?: 60.0
}

