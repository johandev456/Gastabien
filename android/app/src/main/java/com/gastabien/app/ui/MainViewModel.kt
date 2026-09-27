package com.gastabien.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gastabien.app.data.api.RetrofitClient
import com.gastabien.app.data.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class UiState<out T> {
    object Idle : UiState<Nothing>()
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

class MainViewModel : ViewModel() {

    private val api: ApiService
        get() = RetrofitClient.apiService

    private val _summaryState = MutableStateFlow<UiState<AnalyticsSummary>>(UiState.Loading)
    val summaryState: StateFlow<UiState<AnalyticsSummary>> = _summaryState.asStateFlow()

    private val _transactionsState = MutableStateFlow<UiState<List<Transaction>>>(UiState.Loading)
    val transactionsState: StateFlow<UiState<List<Transaction>>> = _transactionsState.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _syncMessage = MutableStateFlow<String?>(null)
    val syncMessage: StateFlow<String?> = _syncMessage.asStateFlow()

    init {
        refreshAll()
    }

    fun clearSyncMessage() {
        _syncMessage.value = null
    }

    fun refreshAll() {
        loadSummary()
        loadTransactions()
    }

    fun loadSummary() {
        viewModelScope.launch {
            _summaryState.value = UiState.Loading
            try {
                val summary = api.getSummary()
                _summaryState.value = UiState.Success(summary)
            } catch (e: Exception) {
                _summaryState.value = UiState.Error(e.localizedMessage ?: "Error al cargar resumen")
            }
        }
    }

    fun loadTransactions(
        bank: String? = null,
        category: String? = null,
        type: String? = null,
        search: String? = null
    ) {
        viewModelScope.launch {
            _transactionsState.value = UiState.Loading
            try {
                val res = api.getTransactions(
                    bank = bank,
                    category = category,
                    type = type,
                    search = search
                )
                _transactionsState.value = UiState.Success(res.transactions)
            } catch (e: Exception) {
                _transactionsState.value = UiState.Error(e.localizedMessage ?: "Error al cargar movimientos")
            }
        }
    }

    fun syncEmails() {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.simulateSync()
                _syncMessage.value = "¡Sincronizado! Se procesaron ${res.emailsProcessed} correos bancarios."
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = "Error al sincronizar: ${e.localizedMessage}"
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun addManualTransaction(
        merchant: String,
        amount: Double,
        category: String,
        bank: String,
        bankName: String,
        type: String,
        notes: String?
    ) {
        viewModelScope.launch {
            try {
                api.createTransaction(
                    CreateTransactionRequest(
                        merchant = merchant,
                        amount = amount,
                        category = category,
                        bank = bank,
                        bankName = bankName,
                        type = type,
                        notes = notes
                    )
                )
                _syncMessage.value = "Movimiento agregado con éxito"
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = "Error al agregar: ${e.localizedMessage}"
            }
        }
    }

    fun syncStatement(text: String, bank: String = "PROMERICA", onResult: (StatementSyncResponse?) -> Unit) {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.syncStatement(
                    StatementSyncRequest(text = text, bank = bank, autoImport = true)
                )
                _syncMessage.value = res.message
                refreshAll()
                onResult(res)
            } catch (e: Exception) {
                _syncMessage.value = "Error al procesar estado de cuenta: ${e.localizedMessage}"
                onResult(null)
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun setServerUrl(url: String) {
        RetrofitClient.setBaseUrl(url)
        refreshAll()
    }

    fun updateCategory(id: String, newCategory: String) {
        viewModelScope.launch {
            try {
                api.updateCategory(id, UpdateCategoryRequest(newCategory))
                _syncMessage.value = "Categoría actualizada"
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = "Error al actualizar: ${e.localizedMessage}"
            }
        }
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch {
            try {
                api.deleteTransaction(id)
                _syncMessage.value = "Movimiento eliminado"
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = "Error al eliminar: ${e.localizedMessage}"
            }
        }
    }
}
