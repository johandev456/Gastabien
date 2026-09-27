package com.gastabien.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gastabien.app.data.models.CategorySummary
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun InteractiveDonutChart(
    categories: List<CategorySummary>,
    totalExpenses: Double,
    selectedCategory: String?,
    onSelectCategory: (String?) -> Unit,
    dopFormat: NumberFormat,
    modifier: Modifier = Modifier
) {
    val total = if (totalExpenses > 0) totalExpenses else categories.sumOf { it.total }
    val isCategoryActive = !selectedCategory.isNullOrBlank() && selectedCategory != "ALL"
    val activeCatObj = categories.firstOrNull { it.category.equals(selectedCategory, ignoreCase = true) }

    Surface(
        shape = RoundedCornerShape(22.dp),
        color = SurfaceContainerLow.copy(alpha = 0.85f),
        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
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
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Secondary.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.PieChart,
                            contentDescription = null,
                            tint = Secondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Text(
                        text = "Análisis Radial de Gastos",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = OnSurface
                    )
                }

                if (isCategoryActive) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = SurfaceContainerHigh,
                        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { onSelectCategory(null) }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, tint = Primary, modifier = Modifier.size(12.dp))
                            Text("Ver Todo", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Primary)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (categories.isEmpty() || total <= 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Sin gastos en este período bancario",
                        color = OnSurfaceVariant,
                        fontSize = 13.sp
                    )
                }
            } else {
                // Interactive Donut Ring Container
                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // Canvas Donut Chart
                    Canvas(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        val strokeWidth = 24.dp.toPx()
                        val diameter = size.minDimension - strokeWidth
                        val radius = diameter / 2f
                        val center = Offset(size.width / 2f, size.height / 2f)
                        val arcSize = Size(diameter, diameter)
                        val topLeft = Offset(center.x - radius, center.y - radius)

                        // Draw background track
                        drawCircle(
                            color = SurfaceContainerHighest.copy(alpha = 0.4f),
                            radius = radius,
                            center = center,
                            style = Stroke(width = strokeWidth)
                        )

                        var currentStartAngle = -90f
                        val gapAngle = if (categories.size > 1) 3f else 0f
                        val availableDegrees = 360f - (gapAngle * categories.size)

                        categories.forEach { cat ->
                            val sweepAngle = ((cat.total / total) * availableDegrees).toFloat().coerceAtLeast(1f)
                            val isSelected = selectedCategory.equals(cat.category, ignoreCase = true)
                            val theme = getCategoryTheme(cat.category)

                            val effectiveStroke = if (isSelected) strokeWidth + 6.dp.toPx() else strokeWidth
                            val effectiveColor = if (isCategoryActive && !isSelected) theme.color.copy(alpha = 0.28f) else theme.color

                            drawArc(
                                color = effectiveColor,
                                startAngle = currentStartAngle + (gapAngle / 2f),
                                sweepAngle = sweepAngle,
                                useCenter = false,
                                topLeft = Offset(center.x - radius, center.y - radius),
                                size = arcSize,
                                style = Stroke(width = effectiveStroke, cap = StrokeCap.Round)
                            )

                            currentStartAngle += sweepAngle + gapAngle
                        }
                    }

                    // Center Interactive Info Disc
                    Surface(
                        shape = CircleShape,
                        color = SurfaceContainer.copy(alpha = 0.95f),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isCategoryActive) (activeCatObj?.let { getCategoryTheme(it.category).color } ?: Primary)
                            else OutlineVariant.copy(alpha = 0.35f)
                        ),
                        modifier = Modifier
                            .size(138.dp)
                            .clip(CircleShape)
                            .clickable {
                                if (isCategoryActive) onSelectCategory(null)
                            }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            if (isCategoryActive && activeCatObj != null) {
                                val theme = getCategoryTheme(activeCatObj.category)
                                Icon(
                                    theme.icon,
                                    contentDescription = null,
                                    tint = theme.color,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = activeCatObj.category,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSurface,
                                    maxLines = 1
                                )
                                Text(
                                    text = dopFormat.format(activeCatObj.total),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = theme.color
                                )
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = theme.containerColor,
                                    modifier = Modifier.padding(top = 2.dp)
                                ) {
                                    Text(
                                        text = "${activeCatObj.percentage}% del total",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = theme.color,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                    )
                                }
                            } else {
                                Text(
                                    text = "TOTAL GASTOS",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSurfaceVariant,
                                    letterSpacing = 0.8.sp
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = dopFormat.format(total),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = OnSurface
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "${categories.sumOf { it.count }} movs RD",
                                    fontSize = 10.sp,
                                    color = Secondary,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Horizontal Interactive Category Capsules Carousel
                val scrollState = rememberScrollState()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(scrollState),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    categories.forEach { cat ->
                        val isSelected = selectedCategory.equals(cat.category, ignoreCase = true)
                        val theme = getCategoryTheme(cat.category)

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) theme.color.copy(alpha = 0.20f) else SurfaceContainerHigh.copy(alpha = 0.7f),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isSelected) theme.color else OutlineVariant.copy(alpha = 0.3f)
                            ),
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    onSelectCategory(if (isSelected) null else cat.category)
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(theme.color)
                                )
                                Text(
                                    text = cat.category,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) OnSurface else OnSurfaceVariant
                                )
                                Text(
                                    text = "${cat.percentage}%",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = theme.color
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
