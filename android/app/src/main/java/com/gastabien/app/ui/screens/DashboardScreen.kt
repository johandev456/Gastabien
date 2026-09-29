package com.gastabien.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gastabien.app.data.models.AnalyticsSummary
import com.gastabien.app.data.models.CategorySummary
import com.gastabien.app.data.models.Transaction
import com.gastabien.app.ui.UiState
import com.gastabien.app.ui.components.BankFilterChips
import com.gastabien.app.ui.components.InteractiveDonutChart
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
    selectedCategory: String? = null,
    onSelectCategory: (String?) -> Unit,
    isSyncing: Boolean,
    onSyncClick: () -> Unit,
    onStatementClick: () -> Unit,
    onAddClick: () -> Unit
) {
    val dopFormat = NumberFormat.getCurrencyInstance(Locale("es", "DO"))
    var dropdownExpanded by remember { mutableStateOf(false) }

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
                val isCategoryActive = !selectedCategory.isNullOrBlank() && selectedCategory != "ALL"

                // Filter transactions by selected category if active
                val filteredTransactions = if (isCategoryActive) {
                    summary.recentTransactions.filter { it.category.equals(selectedCategory, ignoreCase = true) }
                } else {
                    summary.recentTransactions
                }

                // Category largest transactions (ranked by DOP value)
                val categoryTransactions = if (isCategoryActive) {
                    summary.recentTransactions
                        .filter { it.category.equals(selectedCategory, ignoreCase = true) && it.type == "EXPENSE" }
                        .sortedByDescending { it.amountInDop ?: (if (it.currency.equals("USD", ignoreCase = true)) it.amount * (it.exchangeRate ?: 60.0) else it.amount) }
                } else {
                    emptyList()
                }

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

                    // Interactive Donut Chart Visual Analytics
                    item {
                        InteractiveDonutChart(
                            categories = summary.categories,
                            totalExpenses = summary.totalExpenses,
                            selectedCategory = selectedCategory,
                            onSelectCategory = onSelectCategory,
                            dopFormat = dopFormat
                        )
                    }

                    // Category Selector Bar with Dropdown & Pills (Mobile First)
                    item {
                        Column(modifier = Modifier.padding(top = 4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = if (isCategoryActive) "Top Gastos: $selectedCategory" else "Gastos por Categoría",
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = OnSurface
                                    )
                                    Text(
                                        text = if (isCategoryActive) "Comparativa de mayores desembolsos" else "Toca una categoría para ver sus gastos",
                                        fontSize = 11.sp,
                                        color = OnSurfaceVariant
                                    )
                                }

                                // Mobile Dropdown Menu Button
                                Box {
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = SurfaceContainerHigh,
                                        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(12.dp))
                                            .clickable { dropdownExpanded = !dropdownExpanded }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Text(
                                                text = if (isCategoryActive) (selectedCategory ?: "Categoría") else "Elegir",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isCategoryActive) Primary else OnSurface
                                            )
                                            Icon(
                                                Icons.Default.ArrowDropDown,
                                                contentDescription = "Dropdown",
                                                tint = if (isCategoryActive) Primary else OnSurfaceVariant,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }

                                    DropdownMenu(
                                        expanded = dropdownExpanded,
                                        onDismissRequest = { dropdownExpanded = false },
                                        modifier = Modifier.background(SurfaceContainerHigh)
                                    ) {
                                        DropdownMenuItem(
                                            text = {
                                                Text("✨ Todas las Categorías", color = OnSurface, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            },
                                            onClick = {
                                                onSelectCategory(null)
                                                dropdownExpanded = false
                                            }
                                        )
                                        summary.categories.forEach { cat ->
                                            val catTheme = getCategoryTheme(cat.category)
                                            DropdownMenuItem(
                                                leadingIcon = {
                                                    Icon(catTheme.icon, contentDescription = null, tint = catTheme.color, modifier = Modifier.size(16.dp))
                                                },
                                                text = {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text(cat.category, color = OnSurface, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                                        Spacer(modifier = Modifier.width(8.dp))
                                                        Text(dopFormat.format(cat.total), color = catTheme.color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                },
                                                onClick = {
                                                    onSelectCategory(cat.category)
                                                    dropdownExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }

                            // Horizontal Category Quick-Chips (Mobile swipeable pills)
                            val catScrollState = rememberScrollState()
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(catScrollState)
                                    .padding(vertical = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // "Todas" chip
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (!isCategoryActive) Primary.copy(alpha = 0.16f) else SurfaceContainerLow,
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (!isCategoryActive) Primary else OutlineVariant.copy(alpha = 0.3f)
                                    ),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable { onSelectCategory(null) }
                                ) {
                                    Text(
                                        text = "Todas",
                                        fontSize = 11.sp,
                                        fontWeight = if (!isCategoryActive) FontWeight.Bold else FontWeight.Medium,
                                        color = if (!isCategoryActive) Primary else OnSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                    )
                                }

                                summary.categories.forEach { cat ->
                                    val isSelected = selectedCategory.equals(cat.category, ignoreCase = true)
                                    val catTheme = getCategoryTheme(cat.category)

                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = if (isSelected) catTheme.color.copy(alpha = 0.18f) else SurfaceContainerLow,
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isSelected) catTheme.color else OutlineVariant.copy(alpha = 0.3f)
                                        ),
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(10.dp))
                                            .clickable {
                                                onSelectCategory(if (isSelected) null else cat.category)
                                            }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(5.dp)
                                        ) {
                                            Icon(
                                                catTheme.icon,
                                                contentDescription = null,
                                                tint = if (isSelected) catTheme.color else OnSurfaceVariant,
                                                modifier = Modifier.size(12.dp)
                                            )
                                            Text(
                                                text = cat.category,
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) OnSurface else OnSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // When a category is active: show the Top Transactions Comparison Bar Card
                    if (isCategoryActive) {
                        item {
                            TopCategoryComparisonCard(
                                categoryName = selectedCategory ?: "",
                                transactions = categoryTransactions,
                                dopFormat = dopFormat,
                                onClearFilter = { onSelectCategory(null) }
                            )
                        }
                    } else {
                        // Regular Category Breakdown List with tap-to-filter
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
                                CategoryCardItem(
                                    cat = cat,
                                    dopFormat = dopFormat,
                                    isSelected = selectedCategory.equals(cat.category, ignoreCase = true),
                                    onClick = {
                                        onSelectCategory(if (selectedCategory.equals(cat.category, ignoreCase = true)) null else cat.category)
                                    }
                                )
                            }
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
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        text = if (isCategoryActive) "Movimientos en $selectedCategory" else "Últimos Movimientos",
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = OnSurface
                                    )
                                    if (isCategoryActive) {
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Primary.copy(alpha = 0.15f),
                                            modifier = Modifier.clickable { onSelectCategory(null) }
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                                            ) {
                                                Text(
                                                    text = "${filteredTransactions.size} movs ✕",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Primary
                                                )
                                            }
                                        }
                                    }
                                }
                                Text(
                                    text = if (isCategoryActive) "Transacciones filtradas por categoría" else "Validado contra estados de cuenta oficiales",
                                    fontSize = 12.sp,
                                    color = OnSurfaceVariant
                                )
                            }
                        }
                    }

                    if (filteredTransactions.isEmpty()) {
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
                                        text = if (isCategoryActive) "No hay movimientos en $selectedCategory" else "No hay movimientos registrados",
                                        fontWeight = FontWeight.Bold,
                                        color = OnSurface,
                                        fontSize = 14.sp
                                    )
                                    if (isCategoryActive) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        TextButton(onClick = { onSelectCategory(null) }) {
                                            Text("Ver todas las transacciones", color = Primary, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        items(filteredTransactions.take(8)) { tx ->
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
fun TopCategoryComparisonCard(
    categoryName: String,
    transactions: List<Transaction>,
    dopFormat: NumberFormat,
    onClearFilter: () -> Unit
) {
    val theme = getCategoryTheme(categoryName)
    val totalAmount = transactions.sumOf { it.amountInDop ?: (if (it.currency.equals("USD", ignoreCase = true)) it.amount * (it.exchangeRate ?: 60.0) else it.amount) }
    val maxTxAmount = if (transactions.isNotEmpty()) transactions.maxOf { it.amountInDop ?: (if (it.currency.equals("USD", ignoreCase = true)) it.amount * (it.exchangeRate ?: 60.0) else it.amount) } else 1.0
    val avgAmount = if (transactions.isNotEmpty()) totalAmount / transactions.size else 0.0

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(theme.containerColor),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(theme.icon, contentDescription = null, tint = theme.color, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Text(
                            text = categoryName,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = OnSurface
                        )
                        Text(
                            text = "${transactions.size} gastos • Total ${dopFormat.format(totalAmount)}",
                            fontSize = 11.sp,
                            color = theme.color,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = SurfaceContainerHigh,
                    border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
                    modifier = Modifier.clickable { onClearFilter() }
                ) {
                    Text(
                        text = "✕ Cerrar",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = OnSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Comparison Bars List
            if (transactions.isEmpty()) {
                Text(
                    text = "No hay gastos registrados en esta categoría.",
                    fontSize = 12.sp,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    transactions.take(4).forEachIndexed { index, tx ->
                        val isUsd = tx.currency.equals("USD", ignoreCase = true)
                        val txDop = tx.amountInDop ?: (if (isUsd) tx.amount * (tx.exchangeRate ?: 60.0) else tx.amount)
                        val ratio = if (maxTxAmount > 0) (txDop / maxTxAmount).toFloat().coerceIn(0.1f, 1f) else 0.5f

                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f).padding(end = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = theme.containerColor,
                                        modifier = Modifier.size(18.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = "#${index + 1}",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = theme.color
                                            )
                                        }
                                    }
                                    Text(
                                        text = tx.merchant,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = OnSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "• ${tx.bankName}",
                                        fontSize = 10.sp,
                                        color = OnSurfaceVariant,
                                        maxLines = 1
                                    )
                                }

                                if (isUsd) {
                                    Text(
                                        text = "$ ${String.format(Locale.US, "%.2f", tx.amount)} USD",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = theme.color
                                    )
                                } else {
                                    Text(
                                        text = dopFormat.format(tx.amount),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = theme.color
                                    )
                                }
                            }

                            // Glowing Horizontal Bar
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(CircleShape)
                                    .background(SurfaceContainerHighest)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(ratio)
                                        .fillMaxHeight()
                                        .clip(CircleShape)
                                        .background(
                                            Brush.horizontalGradient(
                                                listOf(theme.color.copy(alpha = 0.6f), theme.color)
                                            )
                                        )
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Average Callout
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceContainerHigh.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Promedio por desembolso:",
                    fontSize = 11.sp,
                    color = OnSurfaceVariant
                )
                Text(
                    text = dopFormat.format(avgAmount),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = OnSurface
                )
            }
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
fun CategoryCardItem(
    cat: CategorySummary,
    dopFormat: NumberFormat,
    isSelected: Boolean = false,
    onClick: () -> Unit = {}
) {
    val theme = getCategoryTheme(cat.category)

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = if (isSelected) SurfaceContainerHigh else SurfaceContainerLow.copy(alpha = 0.85f),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) theme.color else OutlineVariant.copy(alpha = 0.25f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .clickable { onClick() }
    ) {
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
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = cat.category,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isSelected) theme.color else OnSurface
                            )
                            if (isSelected) {
                                Text(
                                    text = "✓",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = theme.color
                                )
                            }
                        }
                        Text(
                            text = "${cat.count} transacciones (Toca para filtrar)",
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
            }
        }
    }
}
