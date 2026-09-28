package com.gastabien.app.data.local

import android.content.Context
import android.content.SharedPreferences
import com.gastabien.app.data.models.AnalyticsSummary
import com.gastabien.app.data.models.Transaction
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class LocalCache(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("gastabien_local_cache", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_SUMMARY = "cached_summary_json"
        private const val KEY_TRANSACTIONS = "cached_transactions_json"
    }

    fun saveSummary(summary: AnalyticsSummary) {
        try {
            val json = gson.toJson(summary)
            prefs.edit().putString(KEY_SUMMARY, json).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getSavedSummary(): AnalyticsSummary? {
        val json = prefs.getString(KEY_SUMMARY, null) ?: return null
        return try {
            gson.fromJson(json, AnalyticsSummary::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun saveTransactions(transactions: List<Transaction>) {
        try {
            val json = gson.toJson(transactions)
            prefs.edit().putString(KEY_TRANSACTIONS, json).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getSavedTransactions(): List<Transaction>? {
        val json = prefs.getString(KEY_TRANSACTIONS, null) ?: return null
        return try {
            val type = object : TypeToken<List<Transaction>>() {}.type
            gson.fromJson(json, type)
        } catch (e: Exception) {
            null
        }
    }
}
