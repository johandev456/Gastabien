package com.gastabien.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gastabien.app.data.api.ApiService
import com.gastabien.app.data.api.RetrofitClient
import com.gastabien.app.data.local.LocalCache
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

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val localCache = LocalCache(application.applicationContext)

    private val api: ApiService
        get() = RetrofitClient.apiService

    private val _summaryState = MutableStateFlow<UiState<AnalyticsSummary>>(
        localCache.getSavedSummary()?.let { UiState.Success(it) } ?: UiState.Loading
    )
    val summaryState: StateFlow<UiState<AnalyticsSummary>> = _summaryState.asStateFlow()

    private val _transactionsState = MutableStateFlow<UiState<List<Transaction>>>(
        localCache.getSavedTransactions()?.let { UiState.Success(it) } ?: UiState.Loading
    )
    val transactionsState: StateFlow<UiState<List<Transaction>>> = _transactionsState.asStateFlow()

    private val _selectedBank = MutableStateFlow("ALL")
    val selectedBank: StateFlow<String> = _selectedBank.asStateFlow()

    private val _selectedCategory = MutableStateFlow<String?>("ALL")
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    private var currentSearch: String? = null

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _syncMessage = MutableStateFlow<String?>(null)
    val syncMessage: StateFlow<String?> = _syncMessage.asStateFlow()

    private val _authStatus = MutableStateFlow<AuthStatusResponse?>(null)
    val authStatus: StateFlow<AuthStatusResponse?> = _authStatus.asStateFlow()

    init {
        loadAuthStatus()
        refreshAll()
    }

    fun clearSyncMessage() {
        _syncMessage.value = null
    }

    fun selectBank(bank: String) {
        _selectedBank.value = bank
        refreshAll()
    }

    fun selectCategory(category: String?) {
        _selectedCategory.value = category
    }

    fun refreshAll() {
        val bankParam = if (_selectedBank.value == "ALL") null else _selectedBank.value
        loadSummary(bank = bankParam)
        loadTransactions(bank = bankParam, search = currentSearch)
    }

    fun loadSummary(bank: String? = if (_selectedBank.value == "ALL") null else _selectedBank.value) {
        viewModelScope.launch {
            if (_summaryState.value !is UiState.Success) {
                _summaryState.value = UiState.Loading
            }
            try {
                val summary = api.getSummary(bank = bank)
                _summaryState.value = UiState.Success(summary)
                if (bank == null) {
                    localCache.saveSummary(summary)
                }
            } catch (e: Exception) {
                // If we already have cached data, keep displaying it gracefully
                if (_summaryState.value !is UiState.Success) {
                    val fallback = localCache.getSavedSummary()
                    if (fallback != null) {
                        _summaryState.value = UiState.Success(fallback)
                    } else {
                        _summaryState.value = UiState.Error(e.localizedMessage ?: "Error al cargar resumen")
                    }
                }
            }
        }
    }

    fun loadTransactions(
        bank: String? = if (_selectedBank.value == "ALL") null else _selectedBank.value,
        category: String? = null,
        type: String? = null,
        search: String? = currentSearch
    ) {
        currentSearch = search
        viewModelScope.launch {
            if (_transactionsState.value !is UiState.Success) {
                _transactionsState.value = UiState.Loading
            }
            try {
                val res = api.getTransactions(
                    bank = bank,
                    category = category,
                    type = type,
                    search = search
                )
                _transactionsState.value = UiState.Success(res.transactions)
                if (bank == null && category == null && type == null && search == null) {
                    localCache.saveTransactions(res.transactions)
                }
            } catch (e: Exception) {
                // If we already have cached data, keep displaying it gracefully
                if (_transactionsState.value !is UiState.Success) {
                    val fallback = localCache.getSavedTransactions()
                    if (fallback != null) {
                        _transactionsState.value = UiState.Success(fallback)
                    } else {
                        _transactionsState.value = UiState.Error(e.localizedMessage ?: "Error al cargar movimientos")
                    }
                }
            }
        }
    }

    fun loadAuthStatus() {
        viewModelScope.launch {
            try {
                val status = api.getAuthStatus()
                _authStatus.value = status
            } catch (_: Exception) {}
        }
    }

    fun getGoogleAuthUrl(onResult: (String?) -> Unit) {
        viewModelScope.launch {
            try {
                val res = api.getGoogleAuthUrl()
                onResult(res.url)
            } catch (e: Exception) {
                _syncMessage.value = "Error al obtener URL de Google: ${e.localizedMessage}"
                onResult(null)
            }
        }
    }

    fun syncEmails(onRequiresConnection: (() -> Unit)? = null) {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.syncGmail()
                if (res.status == "SUCCESS") {
                    if (res.newTransactionsCount > 0) {
                        _syncMessage.value = "¡Gmail sincronizado! Se agregaron ${res.newTransactionsCount} movimientos de ${res.emailsProcessed} correos."
                    } else {
                        _syncMessage.value = "¡Todo al día! No hay nuevas transacciones (coinciden con tu estado de cuenta)."
                    }
                    loadAuthStatus()
                    refreshAll()
                } else {
                    val errorMsg = res.error ?: "Error al sincronizar con Gmail"
                    _syncMessage.value = errorMsg
                    if (errorMsg.contains("no ha conectado", ignoreCase = true)) {
                        onRequiresConnection?.invoke()
                    }
                    loadAuthStatus()
                }
            } catch (e: Exception) {
                _syncMessage.value = "Error al conectar con el servidor: ${e.localizedMessage}"
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun resyncAllEmails() {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.resyncGmail()
                if (res.status == "SUCCESS") {
                    _syncMessage.value = "¡Re-escaneo completo! Se procesaron ${res.emailsProcessed} correos (${res.newTransactionsCount} nuevos)."
                    loadAuthStatus()
                    refreshAll()
                } else {
                    _syncMessage.value = res.error ?: "Error al re-escanear Gmail"
                }
            } catch (e: Exception) {
                _syncMessage.value = "Error al conectar: ${e.localizedMessage}"
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun simulateSync() {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.simulateSync()
                if (res.status == "SUCCESS") {
                    _syncMessage.value = "¡Simulación completada! Se agregaron ${res.newTransactionsCount} movimientos bancarios de prueba."
                    refreshAll()
                } else {
                    _syncMessage.value = res.error ?: "Error en la simulación"
                }
            } catch (e: Exception) {
                _syncMessage.value = "Error al simular: ${e.localizedMessage}"
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun parseRawEmail(sender: String, subject: String, body: String, onResult: ((Boolean) -> Unit)? = null) {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.parseRawEmail(ParseRawEmailRequest(sender = sender, subject = subject, body = body))
                if (res.success) {
                    val tx = res.transaction
                    val txDetail = if (tx != null) " (RD$ ${tx.amount} en ${tx.merchant})" else ""
                    _syncMessage.value = "¡Movimiento procesado con éxito!$txDetail"
                    refreshAll()
                    onResult?.invoke(true)
                } else {
                    _syncMessage.value = res.message
                    onResult?.invoke(false)
                }
            } catch (e: Exception) {
                _syncMessage.value = "Error al procesar texto: ${e.localizedMessage}"
                onResult?.invoke(false)
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun addManualTransaction(
        merchant: String,
        amount: Double,
        currency: String = "DOP",
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
                        currency = currency,
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

    fun updateTransaction(id: String, amount: Double? = null, currency: String? = null, category: String? = null) {
        viewModelScope.launch {
            try {
                api.updateTransaction(
                    id = id,
                    request = UpdateTransactionRequest(
                        amount = amount,
                        currency = currency,
                        category = category
                    )
                )
                _syncMessage.value = "Movimiento actualizado con éxito"
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = "Error al actualizar: ${e.localizedMessage}"
            }
        }
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
