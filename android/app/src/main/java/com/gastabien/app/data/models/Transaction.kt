package com.gastabien.app.data.models

import com.google.gson.annotations.SerializedName

data class Transaction(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("externalId") val externalId: String? = null,
    @SerializedName("bank") val bank: String,
    @SerializedName("bankName") val bankName: String,
    @SerializedName("type") val type: String, // EXPENSE, INCOME, TRANSFER
    @SerializedName("amount") val amount: Double,
    @SerializedName("currency") val currency: String = "DOP",
    @SerializedName("amountInDop") val amountInDop: Double? = null,
    @SerializedName("exchangeRate") val exchangeRate: Double? = null,
    @SerializedName("merchant") val merchant: String,
    @SerializedName("accountReference") val accountReference: String? = null,
    @SerializedName("date") val date: String,
    @SerializedName("category") val category: String,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("isManual") val isManual: Boolean = false,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class TransactionResponse(
    @SerializedName("count") val count: Int,
    @SerializedName("transactions") val transactions: List<Transaction>
)

data class CreateTransactionRequest(
    val merchant: String,
    val amount: Double,
    val currency: String = "DOP",
    val category: String? = null,
    val bank: String = "POPULAR",
    val bankName: String = "Banco Popular",
    val type: String = "EXPENSE",
    val notes: String? = null
)

data class UpdateCategoryRequest(
    val category: String
)

data class SyncResponse(
    val status: String,
    val emailsProcessed: Int,
    val newTransactionsCount: Int,
    val transactions: List<Transaction>? = null,
    val error: String? = null
)

data class StatementSyncRequest(
    val text: String,
    val bank: String = "PROMERICA",
    val autoImport: Boolean = true
)

data class StatementEntryItem(
    val date: String,
    val description: String,
    val amount: Double,
    val currency: String = "DOP",
    val type: String
)

data class ReconciliationItem(
    val entry: StatementEntryItem,
    val status: String, // MATCHED, ADDED, UPDATED, REMOVED
    val details: String
)

data class ReconciliationReport(
    val totalStatementEntries: Int,
    val matchedCount: Int,
    val addedCount: Int,
    val updatedCount: Int,
    val removedCount: Int,
    val totalIncomeAmount: Double,
    val totalExpenseAmount: Double,
    val items: List<ReconciliationItem>
)

data class StatementSyncResponse(
    val success: Boolean,
    val message: String,
    val report: ReconciliationReport? = null
)
