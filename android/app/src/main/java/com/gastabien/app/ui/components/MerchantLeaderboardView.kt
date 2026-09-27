package com.gastabien.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import com.gastabien.app.data.models.Transaction
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat

data class MerchantAggregated(
    val merchant: String,
    val totalAmount: Double,
    val count: Int,
    val category: String,
    val primaryBank: String,
    val percentageOfTotal: Double
)

@Composable
fun MerchantLeaderboardView(
    transactions: List<Transaction>,
    totalExpenses: Double,
    dopFormat: NumberFormat,
    onSelectCategory: (String?) -> Unit,
    modifier: Modifier = Modifier
) {
    val expenseTx = transactions.filter { it.type == "EXPENSE" }
    val total = if (totalExpenses > 0) totalExpenses else expenseTx.sumOf { it.amount }

    // Aggregate by merchant
    val merchantsMap = expenseTx.groupBy { it.merchant }
    val merchantList = merchantsMap.map { (merchant, txs) ->
        val sum = txs.sumOf { it.amount }
        val pct = if (total > 0) (sum / total) * 100.0 else 0.0
        val topCategory = txs.groupBy { it.category }.maxByOrNull { it.value.size }?.key ?: "Otros"
        val topBank = txs.groupBy { it.bankName }.maxByOrNull { it.value.size }?.key ?: "Banco RD"
        MerchantAggregated(
            merchant = merchant,
            totalAmount = sum,
            count = txs.size,
            category = topCategory,
            primaryBank = topBank,
            percentageOfTotal = pct
        )
    }.sortedByDescending { it.totalAmount }

    val maxAmount = merchantList.firstOrNull()?.totalAmount ?: 1.0
    val top3Concentration = merchantList.take(3).sumOf { it.percentageOfTotal }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Summary Header Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = SurfaceContainerLow.copy(alpha = 0.85f),
            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
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
                                .background(Color(0xFFFFD54F).copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.EmojiEvents,
                                contentDescription = null,
                                tint = Color(0xFFFFD54F),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Ranking de Comercios RD",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = OnSurface
                            )
                            Text(
                                text = "${merchantList.size} comercios registrados",
                                fontSize = 11.sp,
                                color = OnSurfaceVariant
                            )
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = SurfaceContainerHigh,
                        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f))
                    ) {
                        Text(
                            text = "Top ${merchantList.size}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                if (merchantList.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = SurfaceContainerHigh.copy(alpha = 0.6f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Insights, contentDescription = null, tint = Secondary, modifier = Modifier.size(14.dp))
                            Text(
                                text = "Tus 3 principales comercios concentran el %.1f%% del gasto".format(top3Concentration),
                                fontSize = 11.sp,
                                color = OnSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // Merchants List
        if (merchantList.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = SurfaceContainerLow.copy(alpha = 0.85f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "No hay comercios registrados en este período.",
                    fontSize = 12.sp,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(20.dp)
                )
            }
        } else {
            merchantList.forEachIndexed { index, item ->
                val theme = getCategoryTheme(item.category)
                val ratio = (item.totalAmount / maxAmount).toFloat().coerceIn(0.08f, 1f)
                val rankColor = when (index) {
                    0 -> Color(0xFFFFD54F) // Gold
                    1 -> Color(0xFFAAC7FF) // Silver / Cyan
                    2 -> Color(0xFFFF9800) // Bronze / Amber
                    else -> OnSurfaceVariant
                }

                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = SurfaceContainerLow.copy(alpha = 0.85f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (index == 0) rankColor.copy(alpha = 0.4f) else OutlineVariant.copy(alpha = 0.25f)
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { onSelectCategory(item.category) }
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
                                // Rank Medal Badge
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = rankColor.copy(alpha = 0.15f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, rankColor.copy(alpha = 0.35f)),
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = "#${index + 1}",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = rankColor
                                        )
                                    }
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.merchant,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = OnSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = item.primaryBank,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = Primary
                                        )
                                        Text(text = "•", fontSize = 10.sp, color = OnSurfaceVariant)
                                        Text(
                                            text = item.category,
                                            fontSize = 10.sp,
                                            color = theme.color,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = dopFormat.format(item.totalAmount),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSurface
                                )
                                Text(
                                    text = "%.1f%% • %d movs".format(item.percentageOfTotal, item.count),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = theme.color
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Glowing horizontal comparative bar
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
    }
}
