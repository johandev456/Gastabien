package com.gastabien.app.data.models

import com.google.gson.annotations.SerializedName

data class CategorySummary(
    @SerializedName("category") val category: String,
    @SerializedName("total") val total: Double,
    @SerializedName("count") val count: Int,
    @SerializedName("percentage") val percentage: Double,
    @SerializedName("color") val color: String,
    @SerializedName("icon") val icon: String
)

data class BankDistribution(
    @SerializedName("bank") val bank: String,
    @SerializedName("bankName") val bankName: String,
    @SerializedName("totalExpenses") val totalExpenses: Double,
    @SerializedName("totalIncome") val totalIncome: Double,
    @SerializedName("count") val count: Int,
    @SerializedName("color") val color: String
)

data class MonthlyTrend(
    @SerializedName("month") val month: String,
    @SerializedName("expenses") val expenses: Double,
    @SerializedName("income") val income: Double
)

data class AnalyticsSummary(
    @SerializedName("totalExpenses") val totalExpenses: Double,
    @SerializedName("totalIncome") val totalIncome: Double,
    @SerializedName("netBalance") val netBalance: Double,
    @SerializedName("currency") val currency: String = "DOP",
    @SerializedName("transactionsCount") val transactionsCount: Int,
    @SerializedName("categories") val categories: List<CategorySummary>,
    @SerializedName("byBank") val byBank: List<BankDistribution>,
    @SerializedName("recentTransactions") val recentTransactions: List<Transaction>,
    @SerializedName("monthlyTrend") val monthlyTrend: List<MonthlyTrend>
)
