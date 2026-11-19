package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.gastabien.app.ui.theme.*
import com.gastabien.app.ui.components.drTodayKey
import com.gastabien.app.ui.components.formatMoney
import com.gastabien.app.ui.components.parseAmountInput
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import java.time.LocalDate
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddExpenseDialog(
    onDismiss: () -> Unit,
    onConfirm: (merchant: String, amount: Double, currency: String, category: String, bank: String, bankName: String, type: String, notes: String?, date: String) -> Unit,
    usdRate: Double = 60.0
) {
    var merchant by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("DOP") }
    var category by remember { mutableStateOf("Supermercados") }
    // Manual entries default to cash/manual instead of silently being attributed to a bank
    var bank by remember { mutableStateOf("MANUAL") }
    var dateText by remember { mutableStateOf(drTodayKey()) }
    var errorText by remember { mutableStateOf<String?>(null) }
    var expandedBank by remember { mutableStateOf(false) }
    val banks = listOf(
        "MANUAL" to "Efectivo / Manual",
        "PROMERICA" to "Banco Promerica",
        "POPULAR" to "Banco Popular Dominicano",
        "BHD" to "Banco BHD",
        "QIK" to "Qik Banco Digital"
    )
    var type by remember { mutableStateOf("EXPENSE") }
    var notes by remember { mutableStateOf("") }

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

    var expandedCategory by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = SurfaceContainerLow,
            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            // Scrollable so the Save button stays reachable with the keyboard open on small screens
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                Text(
                    text = "Nuevo Movimiento",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = OnSurface
                )
                Text(
                    text = "Registro manual con categorización inteligente",
                    fontSize = 11.sp,
                    color = OnSurfaceVariant
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Type Selector (Expense vs Income)
                Row(modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = {
                            type = "EXPENSE"
                            if (category == "Ingresos y Nómina") category = "Supermercados"
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (type == "EXPENSE") ErrorColor else SurfaceContainerHigh
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            "Gasto (-)",
                            fontWeight = FontWeight.Bold,
                            color = if (type == "EXPENSE") OnError else OnSurfaceVariant
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            type = "INCOME"
                            category = "Ingresos y Nómina"
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (type == "INCOME") Secondary else SurfaceContainerHigh
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            "Ingreso (+)",
                            fontWeight = FontWeight.Bold,
                            color = if (type == "INCOME") OnSecondary else OnSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Currency Selector (DOP vs USD)
                Row(modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = { currency = "DOP" },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (currency == "DOP") Primary else SurfaceContainerHigh
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            "🇩🇴 DOP (RD$)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (currency == "DOP") OnPrimary else OnSurfaceVariant
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { currency = "USD" },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (currency == "USD") Primary else SurfaceContainerHigh
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            "🇺🇸 USD ($)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (currency == "USD") OnPrimary else OnSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Merchant input
                OutlinedTextField(
                    value = merchant,
                    onValueChange = { merchant = it },
                    label = { Text("Comercio / Lugar / Concepto", color = OnSurfaceVariant) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                        focusedTextColor = OnSurface,
                        unfocusedTextColor = OnSurface
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Amount input
                val parsedAmount = parseAmountInput(amountText) ?: 0.0
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text(if (currency == "USD") "Monto en USD ($)" else "Monto en DOP (RD$)", color = OnSurfaceVariant) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                        focusedTextColor = OnSurface,
                        unfocusedTextColor = OnSurface
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                if (currency == "USD" && parsedAmount > 0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "≈ ${formatMoney(parsedAmount * usdRate)} (tasa ${String.format(Locale.US, "%.2f", usdRate)} DOP/USD)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Secondary,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Category Dropdown
                ExposedDropdownMenuBox(
                    expanded = expandedCategory,
                    onExpandedChange = { expandedCategory = !expandedCategory }
                ) {
                    OutlinedTextField(
                        value = category,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Categoría", color = OnSurfaceVariant) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCategory) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                            focusedTextColor = OnSurface,
                            unfocusedTextColor = OnSurface
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = expandedCategory,
                        onDismissRequest = { expandedCategory = false },
                        modifier = androidx.compose.ui.Modifier.background(SurfaceContainerHigh)
                    ) {
                        categories.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(cat, color = OnSurface, fontSize = 13.sp) },
                                onClick = {
                                    category = cat
                                    expandedCategory = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Bank / origin
                ExposedDropdownMenuBox(
                    expanded = expandedBank,
                    onExpandedChange = { expandedBank = !expandedBank }
                ) {
                    OutlinedTextField(
                        value = banks.firstOrNull { it.first == bank }?.second ?: bank,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Banco / Origen", color = OnSurfaceVariant) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedBank) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                            focusedTextColor = OnSurface,
                            unfocusedTextColor = OnSurface
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = expandedBank,
                        onDismissRequest = { expandedBank = false },
                        modifier = Modifier.background(SurfaceContainerHigh)
                    ) {
                        banks.forEach { (code, label) ->
                            DropdownMenuItem(
                                text = { Text(label, color = OnSurface, fontSize = 13.sp) },
                                onClick = {
                                    bank = code
                                    expandedBank = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Date (YYYY-MM-DD, Dominican time) and notes
                OutlinedTextField(
                    value = dateText,
                    onValueChange = { dateText = it.take(10) },
                    label = { Text("Fecha (AAAA-MM-DD)", color = OnSurfaceVariant) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                        focusedTextColor = OnSurface,
                        unfocusedTextColor = OnSurface
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notas (opcional)", color = OnSurfaceVariant) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                        focusedTextColor = OnSurface,
                        unfocusedTextColor = OnSurface
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                errorText?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = it, color = ErrorColor, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancelar", color = OnSurfaceVariant)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val amount = parseAmountInput(amountText)
                            val validDate = try {
                                LocalDate.parse(dateText.trim()).takeIf { !it.isAfter(LocalDate.parse(drTodayKey())) }
                            } catch (_: Exception) {
                                null
                            }
                            errorText = when {
                                merchant.isBlank() -> "Escribe el comercio o concepto."
                                amount == null -> "Introduce un monto válido mayor que 0 (ej. 1500,50)."
                                validDate == null -> "Fecha inválida. Usa el formato AAAA-MM-DD y no una fecha futura."
                                else -> null
                            }
                            if (errorText == null && amount != null && validDate != null) {
                                val bankName = banks.firstOrNull { it.first == bank }?.second ?: "Manual"
                                onConfirm(
                                    merchant.trim(), Math.round(amount * 100) / 100.0, currency,
                                    if (type == "INCOME") "Ingresos y Nómina" else category,
                                    bank, bankName, type, notes.trim().ifBlank { null }, validDate.toString()
                                )
                                onDismiss()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SecondaryContainer),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Guardar Movimiento", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
