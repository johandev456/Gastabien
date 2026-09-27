package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
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
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    transactionsState: UiState<List<Transaction>>,
    onDeleteClick: (String) -> Unit,
    onCategoryChange: (String, String) -> Unit,
    onSearchChange: (String) -> Unit
) {
    val dopFormat = NumberFormat.getCurrencyInstance(Locale("es", "DO"))
    var searchText by remember { mutableStateOf("") }
    var selectedBankFilter by remember { mutableStateOf("ALL") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Movimientos", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate950)
            )
        },
        containerColor = Slate950
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
                placeholder = { Text("Buscar comercio o concepto...", color = Slate400, fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Slate400) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Emerald400,
                    unfocusedBorderColor = Slate800,
                    focusedContainerColor = Slate900,
                    unfocusedContainerColor = Slate900,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                singleLine = true
            )

            when (transactionsState) {
                is UiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Emerald400)
                    }
                }
                is UiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Error al cargar movimientos", color = Rose500)
                    }
                }
                is UiState.Success -> {
                    val list = transactionsState.data.filter {
                        selectedBankFilter == "ALL" || it.bank == selectedBankFilter
                    }

                    if (list.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No se encontraron transacciones", color = Slate400)
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(list, key = { it.id }) { tx ->
                                TransactionDetailCard(
                                    tx = tx,
                                    dopFormat = dopFormat,
                                    onDelete = { onDeleteClick(tx.id) }
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
    }
}

@Composable
fun TransactionDetailCard(
    tx: Transaction,
    dopFormat: NumberFormat,
    onDelete: () -> Unit
) {
    val isExpense = tx.type == "EXPENSE"

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
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
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (isExpense) Rose500.copy(alpha = 0.15f) else Emerald500.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isExpense) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    tint = if (isExpense) Rose500 else Emerald400,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tx.merchant,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "${tx.bankName} • ${tx.category}",
                    fontSize = 12.sp,
                    color = Slate400
                )
                if (!tx.accountReference.isNullOrBlank()) {
                    Text(
                        text = tx.accountReference,
                        fontSize = 11.sp,
                        color = Emerald400
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${if (isExpense) "-" else "+"} ${dopFormat.format(tx.amount)}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isExpense) Rose500 else Emerald400
                )
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Eliminar",
                        tint = Slate400,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
