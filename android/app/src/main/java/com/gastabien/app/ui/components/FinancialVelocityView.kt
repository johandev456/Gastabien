package com.gastabien.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat

@Composable
fun FinancialVelocityView(
    summary: AnalyticsSummary,
    dopFormat: NumberFormat,
    modifier: Modifier = Modifier
) {
    val totalExpenses = summary.totalExpenses
    val totalIncome = summary.totalIncome
    val expenseTxs = summary.recentTransactions.filter { it.type == "EXPENSE" }

    // Metrics computation
    val dailyBurnRate = if (totalExpenses > 0) totalExpenses / 30.0 else 0.0
    val avgTicket = if (expenseTxs.isNotEmpty()) totalExpenses / expenseTxs.size else 0.0
    val maxTx = expenseTxs.maxByOrNull { it.amountInDop ?: (if (it.currency.equals("USD", ignoreCase = true)) it.amount * (it.exchangeRate ?: 60.0) else it.amount) }

    // Grouping by lifestyle categories
    val essentialsCategories = listOf("supermercado", "alimento", "combustible", "gasolina", "salud", "farmacia")
    val lifestyleCategories = listOf("bar", "pub", "vida nocturna", "restaurante", "entretenimiento", "comida")

    val essentialsSum = summary.categories
        .filter { cat -> essentialsCategories.any { cat.category.lowercase().contains(it) } }
        .sumOf { it.total }

    val lifestyleSum = summary.categories
        .filter { cat -> lifestyleCategories.any { cat.category.lowercase().contains(it) } }
        .sumOf { it.total }

    val othersSum = (totalExpenses - essentialsSum - lifestyleSum).coerceAtLeast(0.0)

    val essentialsPct = if (totalExpenses > 0) (essentialsSum / totalExpenses) * 100.0 else 0.0
    val lifestylePct = if (totalExpenses > 0) (lifestyleSum / totalExpenses) * 100.0 else 0.0
    val othersPct = if (totalExpenses > 0) (othersSum / totalExpenses) * 100.0 else 0.0

    val savingsRate = if (totalIncome > 0) {
        val retained = totalIncome - totalExpenses
        (retained / totalIncome) * 100.0
    } else {
        0.0
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Hero Burn Rate Card
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = SurfaceContainerLow.copy(alpha = 0.85f),
            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
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
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(Primary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Speed,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Ritmo de Gasto Diario",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = OnSurface
                            )
                            Text(
                                text = "Velocidad de consumo financiero",
                                fontSize = 11.sp,
                                color = OnSurfaceVariant
                            )
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Secondary.copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Secondary.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = "Ritmo Controlado",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Secondary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column {
                        Text(
                            text = dopFormat.format(dailyBurnRate),
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Primary
                        )
                        Text(
                            text = "Promedio diario estimado",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = dopFormat.format(avgTicket),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = OnSurface
                        )
                        Text(
                            text = "Ticket promedio",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )
                    }
                }
            }
        }

        // Esenciales vs Estilo de Vida (Proportional Multi-Segment Bar)
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = SurfaceContainerLow.copy(alpha = 0.85f),
            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFD500F9).copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Balance,
                            contentDescription = null,
                            tint = Color(0xFFD500F9),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "Estructura de Consumo",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = OnSurface
                        )
                        Text(
                            text = "Necesidades vs Ocio y Vida Nocturna",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Segmented Multi-Color Horizontal Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(14.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(SurfaceContainerHighest)
                ) {
                    if (essentialsPct > 0) {
                        Box(
                            modifier = Modifier
                                .weight(essentialsPct.toFloat().coerceAtLeast(0.01f))
                                .fillMaxHeight()
                                .background(Secondary)
                        )
                    }
                    if (lifestylePct > 0) {
                        Box(
                            modifier = Modifier
                                .weight(lifestylePct.toFloat().coerceAtLeast(0.01f))
                                .fillMaxHeight()
                                .background(Color(0xFFD500F9))
                        )
                    }
                    if (othersPct > 0) {
                        Box(
                            modifier = Modifier
                                .weight(othersPct.toFloat().coerceAtLeast(0.01f))
                                .fillMaxHeight()
                                .background(Primary)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Legend
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Essentials Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(Secondary))
                            Text("Básicos (Super + Gasolina)", fontSize = 12.sp, color = OnSurface)
                        }
                        Text(
                            text = "%.1f%% (%s)".format(essentialsPct, dopFormat.format(essentialsSum)),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Secondary
                        )
                    }

                    // Lifestyle Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(Color(0xFFD500F9)))
                            Text("Ocio & Bares / Salidas", fontSize = 12.sp, color = OnSurface)
                        }
                        Text(
                            text = "%.1f%% (%s)".format(lifestylePct, dopFormat.format(lifestyleSum)),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFD500F9)
                        )
                    }

                    // Others Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(Primary))
                            Text("Servicios & Otros", fontSize = 12.sp, color = OnSurface)
                        }
                        Text(
                            text = "%.1f%% (%s)".format(othersPct, dopFormat.format(othersSum)),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                    }
                }
            }
        }

        // Max Transaction Highlight Card
        if (maxTx != null) {
            val maxCatTheme = getCategoryTheme(maxTx.category)
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = SurfaceContainerLow.copy(alpha = 0.85f),
                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(maxCatTheme.containerColor),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = maxCatTheme.color,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Column {
                            Text(
                                text = "Mayor Desembolso Individual",
                                fontSize = 11.sp,
                                color = OnSurfaceVariant
                            )
                            Text(
                                text = maxTx.merchant,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = OnSurface
                            )
                            Text(
                                text = "${maxTx.bankName} • ${maxTx.category}",
                                fontSize = 10.sp,
                                color = Primary
                            )
                        }
                    }

                    val isUsd = maxTx.currency.equals("USD", ignoreCase = true)
                    val effectiveDop = maxTx.amountInDop ?: (if (isUsd) maxTx.amount * (maxTx.exchangeRate ?: 60.0) else maxTx.amount)

                    Column(horizontalAlignment = Alignment.End) {
                        if (isUsd) {
                            Text(
                                text = "$ ${String.format(java.util.Locale.US, "%.2f", maxTx.amount)} USD",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = maxCatTheme.color
                            )
                            Text(
                                text = "≈ ${dopFormat.format(effectiveDop)}",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = OnSurfaceVariant
                            )
                        } else {
                            Text(
                                text = dopFormat.format(maxTx.amount),
                                fontSize = 15.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = maxCatTheme.color
                            )
                        }
                    }
                }
            }
        }
    }
}
