package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gastabien.app.data.models.Transaction
import com.gastabien.app.ui.UiState
import com.gastabien.app.ui.components.BankFilterChips
import com.gastabien.app.ui.components.getCategoryTheme
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    transactionsState: UiState<List<Transaction>>,
    selectedBank: String,
    onSelectBank: (String) -> Unit,
    selectedCategory: String? = null,
    onSelectCategory: (String?) -> Unit,
    onDeleteClick: (String) -> Unit,
    onCategoryChange: (String, String) -> Unit,
    onSearchChange: (String) -> Unit,
    onUpdateTransaction: (id: String, amount: Double, currency: String, category: String) -> Unit = { _, _, _, _ -> }
) {
    val dopFormat = NumberFormat.getCurrencyInstance(Locale("es", "DO"))
    var searchText by remember { mutableStateOf("") }
    var itemToDelete by remember { mutableStateOf<String?>(null) }
    var itemToEdit by remember { mutableStateOf<Transaction?>(null) }
    val isCategoryActive = !selectedCategory.isNullOrBlank() && selectedCategory != "ALL"

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Movimientos Bancarios",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = OnSurface
                        )
                        Text(
                            text = "Historial transaccional sincronizado",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        },
        containerColor = Surface
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            // Search field
            OutlinedTextField(
                value = searchText,
                onValueChange = {
                    searchText = it
                    onSearchChange(it)
                },
                placeholder = {
                    Text(
                        "Buscar por comercio, banco o categoría...",
                        color = OnSurfaceVariant,
                        fontSize = 13.sp
                    )
                },
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = null,
                        tint = OnSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                },
                trailingIcon = {
                    if (searchText.isNotEmpty()) {
                        IconButton(onClick = {
                            searchText = ""
                            onSearchChange("")
                        }) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Limpiar",
                                tint = OnSurfaceVariant,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Primary,
                    unfocusedBorderColor = OutlineVariant.copy(alpha = 0.35f),
                    focusedContainerColor = SurfaceContainerLow,
                    unfocusedContainerColor = SurfaceContainerLow,
                    focusedTextColor = OnSurface,
                    unfocusedTextColor = OnSurface
                ),
                singleLine = true
            )

            // Bank Filter Chips Bar
            BankFilterChips(
                selectedBank = selectedBank,
                onSelectBank = onSelectBank,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            // Category active filter indicator
            if (isCategoryActive) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Primary.copy(alpha = 0.16f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Primary.copy(alpha = 0.35f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Filtrando por categoría: $selectedCategory",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                        Text(
                            text = "✕ Quitar",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary,
                            modifier = Modifier.clickable { onSelectCategory(null) }
                        )
                    }
                }
            }

            when (transactionsState) {
                is UiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Secondary)
                    }
                }
                is UiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Error al cargar movimientos", color = ErrorColor)
                    }
                }
                is UiState.Success -> {
                    val list = transactionsState.data.filter {
                        val matchesBank = selectedBank.equals("ALL", ignoreCase = true) || it.bank.equals(selectedBank, ignoreCase = true)
                        val matchesCategory = !isCategoryActive || it.category.equals(selectedCategory, ignoreCase = true)
                        matchesBank && matchesCategory
                    }

                    if (list.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Default.ReceiptLong,
                                    contentDescription = null,
                                    tint = OnSurfaceVariant,
                                    modifier = Modifier.size(40.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Text("No se encontraron movimientos", color = OnSurfaceVariant, fontSize = 14.sp)
                                if (isCategoryActive) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    TextButton(onClick = { onSelectCategory(null) }) {
                                        Text("Ver todas las categorías", color = Primary, fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            item {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 2.dp, vertical = 2.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "${list.size} transacciones registradas",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = OnSurfaceVariant
                                    )
                                }
                            }

                            items(list, key = { it.id }) { tx ->
                                TransactionDetailCard(
                                    tx = tx,
                                    dopFormat = dopFormat,
                                    onEdit = { itemToEdit = tx },
                                    onDelete = { itemToDelete = tx.id }
                                )
                            }
                            item {
                                Spacer(modifier = Modifier.height(70.dp))
                            }
                        }
                    }
                }
                else -> {}
            }
        }

        // Edit Amount & Currency Dialog
        if (itemToEdit != null) {
            EditAmountDialog(
                tx = itemToEdit!!,
                onDismiss = { itemToEdit = null },
                onSave = { newAmount, newCurrency, newCategory ->
                    onUpdateTransaction(itemToEdit!!.id, newAmount, newCurrency, newCategory)
                    itemToEdit = null
                }
            )
        }

        // Delete Confirmation Dialog
        if (itemToDelete != null) {
            AlertDialog(
                onDismissRequest = { itemToDelete = null },
                title = { Text("Eliminar Movimiento", color = OnSurface, fontWeight = FontWeight.Bold) },
                text = { Text("¿Deseas eliminar este registro de tus transacciones?", color = OnSurfaceVariant) },
                confirmButton = {
                    Button(
                        onClick = {
                            itemToDelete?.let { onDeleteClick(it) }
                            itemToDelete = null
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ErrorColor)
                    ) {
                        Text("Eliminar", color = OnError, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { itemToDelete = null }) {
                        Text("Cancelar", color = OnSurfaceVariant)
                    }
                },
                containerColor = SurfaceContainerHigh,
                shape = RoundedCornerShape(18.dp)
            )
        }
    }
}

@Composable
fun TransactionDetailCard(
    tx: Transaction,
    dopFormat: NumberFormat,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val isExpense = tx.type == "EXPENSE"
    val theme = getCategoryTheme(tx.category)

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = SurfaceContainerLow.copy(alpha = 0.85f),
        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isExpense) theme.containerColor else Secondary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isExpense) theme.icon else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    tint = if (isExpense) theme.color else Secondary,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tx.merchant,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = OnSurface,
                    maxLines = 1
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = tx.bankName,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Primary
                    )
                    Text(
                        text = "•",
                        fontSize = 11.sp,
                        color = OnSurfaceVariant
                    )
                    Text(
                        text = tx.category,
                        fontSize = 11.sp,
                        color = OnSurfaceVariant
                    )
                }
                if (!tx.accountReference.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(1.dp))
                    Text(
                        text = tx.accountReference,
                        fontSize = 10.sp,
                        color = Secondary
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                val isUsd = tx.currency.equals("USD", ignoreCase = true)
                val effectiveDop = tx.amountInDop ?: (if (isUsd) tx.amount * (tx.exchangeRate ?: 60.0) else tx.amount)

                if (isUsd) {
                    Text(
                        text = "${if (isExpense) "-" else "+"} $ ${String.format(Locale.US, "%.2f", tx.amount)} USD",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isExpense) ErrorColor else Secondary
                    )
                    Text(
                        text = "≈ ${dopFormat.format(effectiveDop)}",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = OnSurfaceVariant
                    )
                } else {
                    Text(
                        text = "${if (isExpense) "-" else "+"} ${dopFormat.format(tx.amount)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isExpense) ErrorColor else Secondary
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    IconButton(
                        onClick = onEdit,
                        modifier = Modifier.size(26.dp)
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Modificar",
                            tint = Primary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(26.dp)
                    ) {
                        Icon(
                            Icons.Default.DeleteOutline,
                            contentDescription = "Eliminar",
                            tint = OnSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditAmountDialog(
    tx: Transaction,
    onDismiss: () -> Unit,
    onSave: (amount: Double, currency: String, category: String) -> Unit
) {
    var amountText by remember { mutableStateOf(tx.amount.toString()) }
    var selectedCurrency by remember { mutableStateOf(if (tx.currency.equals("USD", ignoreCase = true)) "USD" else "DOP") }
    var selectedCategory by remember { mutableStateOf(tx.category) }
    var expandedCategoryDropdown by remember { mutableStateOf(false) }

    val categories = listOf(
        "Combustible",
        "Supermercados",
        "Restaurantes y Comida",
        "Bares y Vida Nocturna",
        "Entretenimiento y Suscripciones",
        "Servicios y Facturas",
        "Salud y Farmacias",
        "Compras y Retail",
        "Transporte y Viajes",
        "Transferencias y Pagos",
        "Retiro de Efectivo",
        "Ingresos y Nómina",
        "Otros Gastos"
    )

    val parsedAmount = amountText.toDoubleOrNull() ?: 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = null,
                    tint = Primary,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text("Modificar Transacción", color = OnSurface, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(tx.merchant, color = OnSurfaceVariant, fontSize = 12.sp)
                }
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Currency Selector
                Column {
                    Text("Moneda", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = OnSurfaceVariant)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { selectedCurrency = "DOP" },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selectedCurrency == "DOP") Primary else SurfaceContainerHighest,
                                contentColor = if (selectedCurrency == "DOP") OnPrimary else OnSurfaceVariant
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("DOP (RD$)", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                        Button(
                            onClick = { selectedCurrency = "USD" },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selectedCurrency == "USD") Primary else SurfaceContainerHighest,
                                contentColor = if (selectedCurrency == "USD") OnPrimary else OnSurfaceVariant
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("USD ($)", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }

                // Amount Input
                Column {
                    Text("Monto ($selectedCurrency)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = OnSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = amountText,
                        onValueChange = { amountText = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        prefix = {
                            Text(
                                if (selectedCurrency == "USD") "$" else "RD$",
                                fontWeight = FontWeight.Bold,
                                color = Primary
                            )
                        },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                        ),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = OutlineVariant.copy(alpha = 0.35f),
                            focusedContainerColor = SurfaceContainerHighest,
                            unfocusedContainerColor = SurfaceContainerHighest,
                            focusedTextColor = OnSurface,
                            unfocusedTextColor = OnSurface
                        )
                    )
                    if (selectedCurrency == "USD") {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "≈ RD$ ${String.format(Locale.US, "%,.2f", parsedAmount * 60.0)} DOP (Tasa ~60.00)",
                            fontSize = 11.sp,
                            color = Secondary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // Category selector
                Column {
                    Text("Categoría", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = OnSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    ExposedDropdownMenuBox(
                        expanded = expandedCategoryDropdown,
                        onExpandedChange = { expandedCategoryDropdown = !expandedCategoryDropdown }
                    ) {
                        OutlinedTextField(
                            value = selectedCategory,
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCategoryDropdown) },
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Primary,
                                unfocusedBorderColor = OutlineVariant.copy(alpha = 0.35f),
                                focusedContainerColor = SurfaceContainerHighest,
                                unfocusedContainerColor = SurfaceContainerHighest,
                                focusedTextColor = OnSurface,
                                unfocusedTextColor = OnSurface
                            )
                        )
                        ExposedDropdownMenu(
                            expanded = expandedCategoryDropdown,
                            onDismissRequest = { expandedCategoryDropdown = false },
                            modifier = Modifier.background(SurfaceContainerHigh)
                        ) {
                            categories.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat, color = OnSurface, fontSize = 13.sp) },
                                    onClick = {
                                        selectedCategory = cat
                                        expandedCategoryDropdown = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amount = amountText.toDoubleOrNull()
                    if (amount != null && amount > 0) {
                        onSave(amount, selectedCurrency, selectedCategory)
                    }
                },
                enabled = parsedAmount > 0,
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("Guardar", color = OnPrimary, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = OnSurfaceVariant)
            }
        },
        containerColor = SurfaceContainerHigh,
        shape = RoundedCornerShape(20.dp)
    )
}
