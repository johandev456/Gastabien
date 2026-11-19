package com.gastabien.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gastabien.app.data.api.ApiService
import com.gastabien.app.data.api.RetrofitClient
import com.gastabien.app.data.api.userMessage
import com.gastabien.app.data.local.LocalCache
import com.gastabien.app.data.models.*
import com.gastabien.app.ui.components.formatMoney
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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

    private val _summaryState = MutableStateFlow<UiState<AnalyticsSummary>>(UiState.Loading)
    val summaryState: StateFlow<UiState<AnalyticsSummary>> = _summaryState.asStateFlow()

    private val _transactionsState = MutableStateFlow<UiState<List<Transaction>>>(UiState.Loading)
    val transactionsState: StateFlow<UiState<List<Transaction>>> = _transactionsState.asStateFlow()

    private val _selectedBank = MutableStateFlow("ALL")
    val selectedBank: StateFlow<String> = _selectedBank.asStateFlow()

    private val _selectedMonth = MutableStateFlow("ALL")
    val selectedMonth: StateFlow<String> = _selectedMonth.asStateFlow()

    private val _selectedCategory = MutableStateFlow<String?>("ALL")
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    /** Search text lives here (not in a composable) so it survives navigation and stays in sync. */
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    /** True while a refresh is running, even if older data is still shown. */
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    /** Last refresh error while (possibly stale) data stays on screen; null when up to date. */
    private val _loadError = MutableStateFlow<String?>(null)
    val loadError: StateFlow<String?> = _loadError.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _syncMessage = MutableStateFlow<String?>(null)
    val syncMessage: StateFlow<String?> = _syncMessage.asStateFlow()

    private val _authStatus = MutableStateFlow<AuthStatusResponse?>(null)
    val authStatus: StateFlow<AuthStatusResponse?> = _authStatus.asStateFlow()

    private var refreshJob: Job? = null

    init {
        // Read the offline cache off the main thread, then load fresh data
        viewModelScope.launch {
            val (cachedSummary, cachedTx) = withContext(Dispatchers.IO) {
                localCache.getSavedSummary() to localCache.getSavedTransactions()
            }
            if (cachedSummary != null && _summaryState.value !is UiState.Success) {
                _summaryState.value = UiState.Success(cachedSummary)
            }
            if (cachedTx != null && _transactionsState.value !is UiState.Success) {
                _transactionsState.value = UiState.Success(cachedTx)
            }
        }
        loadAuthStatus()
        refreshAll()
        observeSearch()
    }

    @OptIn(FlowPreview::class)
    private fun observeSearch() {
        viewModelScope.launch {
            _searchQuery
                .drop(1)
                .debounce(350)
                .distinctUntilChanged()
                .collect { refreshAll() }
        }
    }

    fun clearSyncMessage() {
        _syncMessage.value = null
    }

    fun selectBank(bank: String) {
        if (_selectedBank.value == bank) return
        _selectedBank.value = bank
        refreshAll()
    }

    fun selectMonth(month: String) {
        if (_selectedMonth.value == month) return
        _selectedMonth.value = month
        refreshAll()
    }

    fun selectCategory(category: String?) {
        _selectedCategory.value = category
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    /**
     * Reloads summary + transactions for the CURRENT filters. Any refresh still running is
     * cancelled first, so a slow old response can never overwrite data for a newer filter.
     */
    fun refreshAll() {
        refreshJob?.cancel()
        val bank = _selectedBank.value.takeUnless { it == "ALL" }
        val month = _selectedMonth.value.takeUnless { it == "ALL" }
        val search = _searchQuery.value.trim().takeIf { it.isNotBlank() }
        val unfiltered = bank == null && month == null

        refreshJob = viewModelScope.launch {
            _isRefreshing.value = true
            if (_summaryState.value !is UiState.Success) _summaryState.value = UiState.Loading
            if (_transactionsState.value !is UiState.Success) _transactionsState.value = UiState.Loading

            val summaryCall = async { runCatching { api.getSummary(bank = bank, month = month) } }
            val txCall = async { runCatching { api.getTransactions(bank = bank, month = month, search = search) } }
            val summaryResult = summaryCall.await()
            val txResult = txCall.await()

            var error: String? = null

            summaryResult
                .onSuccess { summary ->
                    _summaryState.value = UiState.Success(summary)
                    if (unfiltered) withContext(Dispatchers.IO) { localCache.saveSummary(summary) }
                    // Drop a category filter that does not exist in the new period/bank
                    val cat = _selectedCategory.value
                    if (cat != null && cat != "ALL" && summary.categories.none { it.category == cat }) {
                        _selectedCategory.value = "ALL"
                    }
                }
                .onFailure { e ->
                    error = e.userMessage("Error al cargar resumen")
                    if (_summaryState.value !is UiState.Success) _summaryState.value = UiState.Error(error!!)
                }

            txResult
                .onSuccess { res ->
                    _transactionsState.value = UiState.Success(res.transactions)
                    if (unfiltered && search == null) withContext(Dispatchers.IO) { localCache.saveTransactions(res.transactions) }
                }
                .onFailure { e ->
                    val msg = e.userMessage("Error al cargar movimientos")
                    if (error == null) error = msg
                    if (_transactionsState.value !is UiState.Success) _transactionsState.value = UiState.Error(msg)
                }

            _loadError.value = error
            _isRefreshing.value = false
        }
    }

    fun loadAuthStatus() {
        viewModelScope.launch {
            try {
                _authStatus.value = api.getAuthStatus()
            } catch (_: Exception) {
                // keep previous status
            }
        }
    }

    fun getGoogleAuthUrl(onResult: (String?) -> Unit) {
        viewModelScope.launch {
            try {
                val res = api.getGoogleAuthUrl()
                if (res.url == null) {
                    _syncMessage.value = res.message ?: "Google OAuth no está configurado en el servidor."
                }
                onResult(res.url)
            } catch (e: Exception) {
                _syncMessage.value = "Error al obtener URL de Google: ${e.userMessage()}"
                onResult(null)
            }
        }
    }

    private fun describeSync(res: SyncResponse, resync: Boolean = false): String =
        if (res.newTransactionsCount > 0) {
            val replaced = if (resync && (res.removedCount ?: 0) > 0) " (reemplazando ${res.removedCount} anteriores)" else ""
            "¡Gmail sincronizado! Se agregaron ${res.newTransactionsCount} movimientos de ${res.emailsProcessed} correos$replaced."
        } else {
            "¡Todo al día! Se revisaron ${res.emailsProcessed} correos y no hay movimientos nuevos."
        }

    fun syncEmails(onRequiresConnection: (() -> Unit)? = null) {
        if (_isSyncing.value) return
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.syncGmail()
                if (res.status == "SUCCESS") {
                    _syncMessage.value = describeSync(res)
                    refreshAll()
                } else {
                    val errorMsg = res.error ?: "Error al sincronizar con Gmail"
                    _syncMessage.value = errorMsg
                    if (errorMsg.contains("no ha conectado", ignoreCase = true) || errorMsg.contains("revocó", ignoreCase = true)) {
                        onRequiresConnection?.invoke()
                    }
                }
            } catch (e: Exception) {
                _syncMessage.value = e.userMessage("Error al conectar con el servidor")
            } finally {
                loadAuthStatus()
                _isSyncing.value = false
            }
        }
    }

    /** Re-imports Gmail-sourced movements only; manual entries and statements are kept by the server. */
    fun resyncAllEmails() {
        if (_isSyncing.value) return
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val res = api.resyncGmail()
                if (res.status == "SUCCESS") {
                    _syncMessage.value = describeSync(res, resync = true)
                    refreshAll()
                } else {
                    _syncMessage.value = res.error ?: "Error al re-escanear Gmail"
                }
            } catch (e: Exception) {
                _syncMessage.value = e.userMessage("Error al conectar")
            } finally {
                loadAuthStatus()
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
                _syncMessage.value = e.userMessage("Error al simular")
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
                    val txDetail = if (tx != null) " (${formatMoney(tx.amount, tx.currencyCode)} en ${tx.merchant})" else ""
                    _syncMessage.value = "¡Movimiento procesado con éxito!$txDetail"
                    refreshAll()
                    onResult?.invoke(true)
                } else {
                    _syncMessage.value = res.message ?: "No se pudo procesar el correo"
                    onResult?.invoke(false)
                }
            } catch (e: Exception) {
                // 422 (unknown format) and 409 (duplicate) carry a readable message
                _syncMessage.value = e.userMessage("Error al procesar texto")
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
        notes: String?,
        date: String? = null
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
                        notes = notes?.takeIf { it.isNotBlank() },
                        date = date
                    )
                )
                _syncMessage.value = "Movimiento agregado: ${formatMoney(amount, currency)} en $merchant"
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = e.userMessage("Error al agregar")
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
                _syncMessage.value = res.message ?: res.error
                refreshAll()
                onResult(res)
            } catch (e: Exception) {
                _syncMessage.value = e.userMessage("Error al procesar estado de cuenta")
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

    fun updateTransaction(
        id: String,
        amount: Double? = null,
        currency: String? = null,
        category: String? = null,
        merchant: String? = null,
        notes: String? = null,
        type: String? = null,
        date: String? = null
    ) {
        viewModelScope.launch {
            try {
                api.updateTransaction(
                    id = id,
                    request = UpdateTransactionRequest(
                        amount = amount,
                        currency = currency,
                        category = category,
                        merchant = merchant,
                        notes = notes,
                        type = type,
                        date = date
                    )
                )
                _syncMessage.value = "Movimiento actualizado con éxito"
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = e.userMessage("Error al actualizar")
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
                _syncMessage.value = e.userMessage("Error al actualizar")
            }
        }
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch {
            try {
                api.deleteTransaction(id)
                // Optimistic removal so the list doesn't show the deleted row until the refresh
                (_transactionsState.value as? UiState.Success)?.let { current ->
                    _transactionsState.value = UiState.Success(current.data.filterNot { it.id == id })
                }
                _syncMessage.value = "Movimiento eliminado"
                refreshAll()
            } catch (e: Exception) {
                _syncMessage.value = e.userMessage("Error al eliminar")
            }
        }
    }
}
