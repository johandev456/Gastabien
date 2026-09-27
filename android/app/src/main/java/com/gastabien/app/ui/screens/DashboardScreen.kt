package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gastabien.app.data.models.AnalyticsSummary
import com.gastabien.app.data.models.CategorySummary
import com.gastabien.app.data.models.Transaction
import com.gastabien.app.ui.UiState
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    summaryState: UiState<AnalyticsSummary>,
    isSyncing: Boolean,
    onSyncClick: () -> Unit,
    onStatementClick: () -> Unit,
    onAddClick: () -> Unit
) {
    val dopFormat = NumberFormat.getCurrencyInstance(Locale("es", "DO"))

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Gasta",
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Bien",
                            fontWeight = FontWeight.Bold,
                            color = Emerald400
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Slate800
                        ) {
                            Text(
                                text = "RD",
                                color = Emerald400,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(
                        onClick = onStatementClick
                    ) {
                        Icon(
                            Icons.Default.Description,
                            contentDescription = "Estado de Cuenta",
                            tint = Emerald400
                        )
                    }

                    IconButton(
                        onClick = onSyncClick,
                        enabled = !isSyncing
                    ) {
                        if (isSyncing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Emerald400,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Sincronizar",
                                tint = Emerald400
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Slate950
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddClick,
                containerColor = Emerald600,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nuevo Gasto")
            }
        },
        containerColor = Slate950
    ) { padding ->
        when (summaryState) {
            is UiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Emerald400)
                }
            }
            is UiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Error al cargar datos",
                            color = Rose500,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = onSyncClick,
                            colors = ButtonDefaults.buttonColors(containerColor = Slate800)
                        ) {
                            Text("Reintentar")
                        }
                    }
                }
            }
            is UiState.Success -> {
                val summary = summaryState.data

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // KPI Balance Card
                    item {
                        BalanceCard(summary, dopFormat)
                    }

                    // Incomes vs Expenses Mini Cards
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            KpiMiniCard(
                                title = "Gastos del Mes",
                                amount = dopFormat.format(summary.totalExpenses),
                                icon = Icons.Default.TrendingDown,
                                iconColor = Rose500,
                                modifier = Modifier.weight(1f)
                            )
                            KpiMiniCard(
                                title = "Ingresos",
                                amount = dopFormat.format(summary.totalIncome),
                                icon = Icons.Default.TrendingUp,
                                iconColor = Emerald400,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Top Categories Header
                    item {
                        Text(
                            text = "Principales Categorías de Gastos",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    // Category items
                    items(summary.categories.take(4)) { cat ->
                        CategoryCardItem(cat, dopFormat)
                    }

                    // Recent Transactions Header
                    item {
                        Text(
                            text = "Últimos Movimientos Bancarios",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    // Transactions items
                    items(summary.recentTransactions.take(5)) { tx ->
                        RecentTransactionItem(tx, dopFormat)
                    }

                    item {
                        Spacer(modifier = Modifier.height(60.dp))
                    }
                }
            }
            else -> {}
        }
    }
}

@Composable
fun BalanceCard(summary: AnalyticsSummary, dopFormat: NumberFormat) {
    val isNetPositive = summary.netBalance >= 0

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "BALANCE NETO",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate400,
                    letterSpacing = 1.sp
                )
                Surface(
                    shape = CircleShape,
                    color = if (isNetPositive) Emerald500.copy(alpha = 0.15f) else Rose500.copy(alpha = 0.15f)
                ) {
                    Icon(
                        if (isNetPositive) Icons.Default.AccountBalanceWallet else Icons.Default.Warning,
                        contentDescription = null,
                        tint = if (isNetPositive) Emerald400 else Rose500,
                        modifier = Modifier
                            .padding(8.dp)
                            .size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = dopFormat.format(summary.netBalance),
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (isNetPositive) Emerald400 else Rose500
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "${summary.transactionsCount} movimientos sincronizados",
                fontSize = 12.sp,
                color = Slate400
            )
        }
    }
}

@Composable
fun KpiMiniCard(
    title: String,
    amount: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = title,
                    fontSize = 11.sp,
                    color = Slate400,
                    fontWeight = FontWeight.Medium
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = amount,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}

@Composable
fun CategoryCardItem(cat: CategorySummary, dopFormat: NumberFormat) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = cat.category,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Text(
                    text = dopFormat.format(cat.total),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { (cat.percentage / 100f).toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(CircleShape),
                color = Emerald400,
                trackColor = Slate800,
            )
        }
    }
}

@Composable
fun RecentTransactionItem(tx: Transaction, dopFormat: NumberFormat) {
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
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (isExpense) Rose500.copy(alpha = 0.15f) else Emerald500.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isExpense) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    tint = if (isExpense) Rose500 else Emerald400,
                    modifier = Modifier.size(18.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tx.merchant,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Text(
                    text = "${tx.bankName} • ${tx.category}",
                    fontSize = 11.sp,
                    color = Slate400
                )
            }

            Text(
                text = "${if (isExpense) "-" else "+"} ${dopFormat.format(tx.amount)}",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (isExpense) Rose500 else Emerald400
            )
        }
    }
}
