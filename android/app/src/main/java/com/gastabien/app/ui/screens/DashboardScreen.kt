package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gastabien.app.data.models.AnalyticsSummary
import com.gastabien.app.data.models.CategorySummary
import com.gastabien.app.data.models.Transaction
import com.gastabien.app.ui.UiState
import com.gastabien.app.ui.components.BankFilterChips
import com.gastabien.app.ui.components.getCategoryTheme
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    summaryState: UiState<AnalyticsSummary>,
    selectedBank: String,
    onSelectBank: (String) -> Unit,
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
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Gasta",
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp,
                                color = OnSurface
                            )
                            Text(
                                text = "Bien",
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp,
                                color = Secondary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = SurfaceContainerHigh,
                                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f))
                            ) {
                                Text(
                                    text = "RD",
                                    color = Secondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }

                        // Live Pulse Dot
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Secondary.copy(alpha = 0.12f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Secondary.copy(alpha = 0.25f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Secondary)
                                )
                                Text(
                                    text = "LIVE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Secondary,
                                    letterSpacing = 0.5.sp
                                )
                            }
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
                            tint = Primary
                        )
                    }

                    IconButton(
                        onClick = onSyncClick,
                        enabled = !isSyncing
                    ) {
                        if (isSyncing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Secondary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Sincronizar",
                                tint = Secondary
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Surface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddClick,
                containerColor = SecondaryContainer,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nuevo Movimiento")
            }
        },
        containerColor = Surface
    ) { padding ->
        when (summaryState) {
            is UiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Secondary)
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
                            text = "Error al sincronizar datos bancarios",
                            color = ErrorColor,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = onSyncClick,
                            colors = ButtonDefaults.buttonColors(containerColor = SurfaceContainerHigh),
                            shape = RoundedCornerShape(12.dp)
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
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Bank Filter Bar
                    item {
                        BankFilterChips(
                            selectedBank = selectedBank,
                            onSelectBank = onSelectBank,
                            modifier = Modifier.padding(top = 4.dp, bottom = 2.dp)
                        )
                    }

                    // Hero Balance Bento Card
                    item {
                        HeroBalanceCard(summary, dopFormat)
                    }

                    // Bento 2x2 KPI Mini Cards Grid
                    item {
                        BentoKpiGrid(summary, dopFormat)
                    }

                    // Categories Header
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Gastos por Categoría",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSurface
                                )
                                Text(
                                    text = "Clasificación automática RD",
                                    fontSize = 12.sp,
                                    color = OnSurfaceVariant
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = SurfaceContainerHigh,
                                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f))
                            ) {
                                Text(
                                    text = "Septiembre",
                                    color = Primary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    if (summary.categories.isEmpty()) {
                        item {
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "Sin categorías registradas en este período. Sube tu estado de cuenta para visualizar el desglose inteligente.",
                                    fontSize = 12.sp,
                                    color = OnSurfaceVariant,
                                    modifier = Modifier.padding(18.dp)
                                )
                            }
                        }
                    } else {
                        items(summary.categories.take(5)) { cat ->
                            CategoryCardItem(cat, dopFormat)
                        }
                    }

                    // Recent Transactions Header
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Últimos Movimientos",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSurface
                                )
                                Text(
                                    text = "Validado contra estados de cuenta",
                                    fontSize = 12.sp,
                                    color = OnSurfaceVariant
                                )
                            }
                        }
                    }

                    if (summary.recentTransactions.isEmpty()) {
                        item {
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        Icons.Default.ReceiptLong,
                                        contentDescription = null,
                                        tint = OnSurfaceVariant,
                                        modifier = Modifier.size(32.dp)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "No hay movimientos registrados",
                                        fontWeight = FontWeight.Bold,
                                        color = OnSurface,
                                        fontSize = 14.sp
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Toca el icono 📑 superior para importar tu extracto bancario (.csv).",
                                        color = OnSurfaceVariant,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    } else {
                        items(summary.recentTransactions.take(6)) { tx ->
                            RecentTransactionItem(tx, dopFormat)
                        }
                    }

                    // Security Footer Callout
                    item {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = SurfaceContainerHigh.copy(alpha = 0.5f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.2f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp, bottom = 80.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.Security,
                                    contentDescription = null,
                                    tint = Secondary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = "Validación bancaria cifrada • Sincronización oficial RD",
                                    fontSize = 11.sp,
                                    color = OnSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
            else -> {}
        }
    }
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = SurfaceContainerLow.copy(alpha = 0.85f),
        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f)),
        modifier = modifier
    ) {
        Box {
            // Specular Top Shine Line
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(Color.Transparent, Primary.copy(alpha = 0.35f), Color.Transparent)
                        )
                    )
            )
            content()
        }
    }
}

@Composable
fun HeroBalanceCard(summary: AnalyticsSummary, dopFormat: NumberFormat) {
    val isNetPositive = summary.netBalance >= 0

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "BALANCE DISPONIBLE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = OnSurfaceVariant,
                        letterSpacing = 1.2.sp
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isNetPositive) Secondary.copy(alpha = 0.15f) else ErrorColor.copy(alpha = 0.15f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isNetPositive) Secondary.copy(alpha = 0.3f) else ErrorColor.copy(alpha = 0.3f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            if (isNetPositive) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                            contentDescription = null,
                            tint = if (isNetPositive) Secondary else ErrorColor,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = if (isNetPositive) "SUPERÁVIT" else "DÉFICIT",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isNetPositive) Secondary else ErrorColor
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = dopFormat.format(summary.netBalance),
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (isNetPositive) Secondary else ErrorColor,
                letterSpacing = (-0.5).sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    Icons.Default.Verified,
                    contentDescription = null,
                    tint = Primary,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    text = "${summary.transactionsCount} movimientos conciliados con bancos RD",
                    fontSize = 12.sp,
                    color = OnSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun BentoKpiGrid(summary: AnalyticsSummary, dopFormat: NumberFormat) {
    val savingsPct = if (summary.totalIncome > 0) {
        val pct = ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100.0
        "%.1f%%".format(maxOf(0.0, pct))
    } else {
        "0.0%"
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            BentoMiniCard(
                title = "Gastos Totales",
                amount = dopFormat.format(summary.totalExpenses),
                icon = Icons.Default.TrendingDown,
                accentColor = ErrorColor,
                modifier = Modifier.weight(1f)
            )
            BentoMiniCard(
                title = "Ingresos del Mes",
                amount = dopFormat.format(summary.totalIncome),
                icon = Icons.Default.TrendingUp,
                accentColor = Secondary,
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            BentoMiniCard(
                title = "Tasa de Ahorro",
                amount = savingsPct,
                icon = Icons.Default.Savings,
                accentColor = Primary,
                subtitle = "Salud financiera",
                modifier = Modifier.weight(1f)
            )
            BentoMiniCard(
                title = "Bancos Vinculados",
                amount = "${summary.byBank.size} Activos",
                icon = Icons.Default.AccountBalance,
                accentColor = Tertiary,
                subtitle = "RD Bancos",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
fun BentoMiniCard(
    title: String,
    amount: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    accentColor: Color,
    subtitle: String? = null,
    modifier: Modifier = Modifier
) {
    GlassCard(modifier = modifier) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = title,
                    fontSize = 11.sp,
                    color = OnSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(accentColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        icon,
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier.size(13.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = amount,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = OnSurface
            )
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    fontSize = 10.sp,
                    color = accentColor,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun CategoryCardItem(cat: CategorySummary, dopFormat: NumberFormat) {
    val theme = getCategoryTheme(cat.category)

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(theme.containerColor),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            theme.icon,
                            contentDescription = null,
                            tint = theme.color,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Column {
                        Text(
                            text = cat.category,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = OnSurface
                        )
                        Text(
                            text = "${cat.count} transacciones",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = dopFormat.format(cat.total),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = OnSurface
                    )
                    Text(
                        text = "${cat.percentage}%",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = theme.color
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Glowing progress bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(CircleShape)
                    .background(SurfaceContainerHighest)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth((cat.percentage / 100f).toFloat().coerceIn(0.05f, 1f))
                        .fillMaxHeight()
                        .clip(CircleShape)
                        .background(
                            Brush.horizontalGradient(
                                listOf(theme.color.copy(alpha = 0.7f), theme.color)
                            )
                        )
                )
            }
        }
    }
}

@Composable
fun RecentTransactionItem(tx: Transaction, dopFormat: NumberFormat) {
    val isExpense = tx.type == "EXPENSE"
    val theme = getCategoryTheme(tx.category)

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isExpense) theme.containerColor else Secondary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isExpense) theme.icon else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    tint = if (isExpense) theme.color else Secondary,
                    modifier = Modifier.size(19.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tx.merchant,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
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
                        fontWeight = FontWeight.Medium,
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
            }

            Text(
                text = "${if (isExpense) "-" else "+"} ${dopFormat.format(tx.amount)}",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (isExpense) ErrorColor else Secondary
            )
        }
    }
}
