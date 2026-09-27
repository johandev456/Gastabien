package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
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
import com.gastabien.app.ui.UiState
import com.gastabien.app.ui.components.*
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

enum class AnalyticsViewMode(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    DONUT("Anillos", Icons.Default.PieChart),
    MERCHANTS("Top Comercios", Icons.Default.EmojiEvents),
    VELOCITY("Ritmo & Salud", Icons.Default.Speed),
    BANKS("Bancos RD", Icons.Default.AccountBalance)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoriesScreen(
    summaryState: UiState<AnalyticsSummary>,
    selectedBank: String,
    onSelectBank: (String) -> Unit,
    selectedCategory: String? = null,
    onSelectCategory: (String?) -> Unit
) {
    val dopFormat = NumberFormat.getCurrencyInstance(Locale("es", "DO"))
    var viewMode by remember { mutableStateOf(AnalyticsViewMode.DONUT) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = "Analítica Visual",
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp,
                                color = OnSurface
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Secondary.copy(alpha = 0.15f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Secondary.copy(alpha = 0.3f))
                            ) {
                                Text(
                                    text = "PRO",
                                    color = Secondary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            text = "Dashboard interactivo para finanzas móviles",
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
        when (summaryState) {
            is UiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Secondary)
                }
            }
            is UiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Text("Error al cargar datos analíticos", color = ErrorColor)
                }
            }
            is UiState.Success -> {
                val summary = summaryState.data
                val categories = summary.categories
                val isCategoryActive = !selectedCategory.isNullOrBlank() && selectedCategory != "ALL"

                val categoryTransactions = if (isCategoryActive) {
                    summary.recentTransactions
                        .filter { it.category.equals(selectedCategory, ignoreCase = true) && it.type == "EXPENSE" }
                        .sortedByDescending { it.amount }
                } else {
                    emptyList()
                }

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                ) {
                    // Fixed Sticky Header: Bank Chips & Segmented Modes
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // Bank Filter Bar
                        BankFilterChips(
                            selectedBank = selectedBank,
                            onSelectBank = onSelectBank,
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Interactive Segmented Tab Bar (Fixed & swipeable)
                        val tabScrollState = rememberScrollState()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(tabScrollState)
                                .padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AnalyticsViewMode.values().forEach { mode ->
                                val isSelected = viewMode == mode

                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isSelected) Secondary.copy(alpha = 0.18f) else SurfaceContainerLow.copy(alpha = 0.85f),
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isSelected) Secondary else OutlineVariant.copy(alpha = 0.3f)
                                    ),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable { viewMode = mode }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(
                                            mode.icon,
                                            contentDescription = null,
                                            tint = if (isSelected) Secondary else OnSurfaceVariant,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text(
                                            text = mode.title,
                                            fontSize = 12.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) OnSurface else OnSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Scrollable Analytics View
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Spacer(modifier = Modifier.height(2.dp))
                        }

                        // Active Category Comparative View if selected
                        if (isCategoryActive) {
                            item {
                                TopCategoryComparisonCard(
                                    categoryName = selectedCategory ?: "",
                                    transactions = categoryTransactions,
                                    dopFormat = dopFormat,
                                    onClearFilter = { onSelectCategory(null) }
                                )
                            }
                        }

                        // Content per Selected Mode
                        when (viewMode) {
                            AnalyticsViewMode.DONUT -> {
                                item {
                                    InteractiveDonutChart(
                                        categories = categories,
                                        totalExpenses = summary.totalExpenses,
                                        selectedCategory = selectedCategory,
                                        onSelectCategory = onSelectCategory,
                                        dopFormat = dopFormat
                                    )
                                }

                                // Category Cards List
                                if (categories.isEmpty()) {
                                    item {
                                        Surface(
                                            shape = RoundedCornerShape(18.dp),
                                            color = SurfaceContainerLow.copy(alpha = 0.85f),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(
                                                text = "No hay gastos clasificados en este filtro bancario.",
                                                fontSize = 12.sp,
                                                color = OnSurfaceVariant,
                                                modifier = Modifier.padding(20.dp)
                                            )
                                        }
                                    }
                                } else {
                                    items(categories) { cat ->
                                        val theme = getCategoryTheme(cat.category)
                                        val isSelected = selectedCategory.equals(cat.category, ignoreCase = true)

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
                                                .clickable {
                                                    onSelectCategory(if (isSelected) null else cat.category)
                                                }
                                        ) {
                                            Column(modifier = Modifier.padding(14.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(
                                                        modifier = Modifier.weight(1f).padding(end = 8.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                                    ) {
                                                        Box(
                                                            modifier = Modifier
                                                                .size(36.dp)
                                                                .clip(RoundedCornerShape(10.dp))
                                                                .background(theme.containerColor),
                                                            contentAlignment = Alignment.Center
                                                        ) {
                                                            Icon(
                                                                theme.icon,
                                                                contentDescription = null,
                                                                tint = theme.color,
                                                                modifier = Modifier.size(20.dp)
                                                            )
                                                        }

                                                        Column(modifier = Modifier.weight(1f)) {
                                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                                Text(
                                                                    text = cat.category,
                                                                    fontSize = 14.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = if (isSelected) theme.color else OnSurface,
                                                                    maxLines = 1,
                                                                    overflow = TextOverflow.Ellipsis
                                                                )
                                                                if (isSelected) {
                                                                    Text(
                                                                        text = "✓",
                                                                        fontSize = 11.sp,
                                                                        fontWeight = FontWeight.Bold,
                                                                        color = theme.color
                                                                    )
                                                                }
                                                            }
                                                            Text(
                                                                text = "${cat.count} movimientos • Toca para desglosar",
                                                                fontSize = 11.sp,
                                                                color = OnSurfaceVariant,
                                                                maxLines = 1,
                                                                overflow = TextOverflow.Ellipsis
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
                                }
                            }

                            AnalyticsViewMode.MERCHANTS -> {
                                item {
                                    MerchantLeaderboardView(
                                        transactions = summary.recentTransactions,
                                        totalExpenses = summary.totalExpenses,
                                        dopFormat = dopFormat,
                                        onSelectCategory = onSelectCategory
                                    )
                                }
                            }

                            AnalyticsViewMode.VELOCITY -> {
                                item {
                                    FinancialVelocityView(
                                        summary = summary,
                                        dopFormat = dopFormat
                                    )
                                }
                            }

                            AnalyticsViewMode.BANKS -> {
                                item {
                                    DominicanBankShareView(
                                        summary = summary,
                                        selectedBank = selectedBank,
                                        onSelectBank = onSelectBank,
                                        dopFormat = dopFormat
                                    )
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(80.dp))
                        }
                    }
                }
            }
            else -> {}
        }
    }
}
