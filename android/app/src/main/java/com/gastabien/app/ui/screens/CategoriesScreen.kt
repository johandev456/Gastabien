package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.gastabien.app.ui.UiState
import com.gastabien.app.ui.components.BankFilterChips
import com.gastabien.app.ui.components.getCategoryTheme
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoriesScreen(
    summaryState: UiState<AnalyticsSummary>,
    selectedBank: String,
    onSelectBank: (String) -> Unit
) {
    val dopFormat = NumberFormat.getCurrencyInstance(Locale("es", "DO"))

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Categorías",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = OnSurface
                        )
                        Text(
                            text = "Desglose automático por comercios RD",
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
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Secondary)
                }
            }
            is UiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error al cargar categorías", color = ErrorColor)
                }
            }
            is UiState.Success -> {
                val categories = summaryState.data.categories

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        BankFilterChips(
                            selectedBank = selectedBank,
                            onSelectBank = onSelectBank,
                            modifier = Modifier.padding(top = 4.dp, bottom = 4.dp)
                        )
                    }

                    if (categories.isEmpty()) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(18.dp),
                                color = SurfaceContainerLow.copy(alpha = 0.85f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "No hay gastos clasificados en este filtro bancario.",
                                    fontSize = 13.sp,
                                    color = OnSurfaceVariant,
                                    modifier = Modifier.padding(20.dp)
                                )
                            }
                        }
                    } else {
                        items(categories) { cat ->
                            val theme = getCategoryTheme(cat.category)

                            Surface(
                                shape = RoundedCornerShape(18.dp),
                                color = SurfaceContainerLow.copy(alpha = 0.85f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Box {
                                    // Specular line
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(1.dp)
                                            .background(
                                                Brush.horizontalGradient(
                                                    listOf(Color.Transparent, theme.color.copy(alpha = 0.35f), Color.Transparent)
                                                )
                                            )
                                    )

                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
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

                                                Text(
                                                    text = cat.category,
                                                    fontSize = 15.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = OnSurface
                                                )
                                            }

                                            Text(
                                                text = dopFormat.format(cat.total),
                                                fontSize = 15.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = OnSurface
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(10.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "${cat.count} movimientos bancarios",
                                                fontSize = 12.sp,
                                                color = OnSurfaceVariant
                                            )
                                            Text(
                                                text = "${cat.percentage}%",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = theme.color
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(8.dp))

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

                    item {
                        Spacer(modifier = Modifier.height(70.dp))
                    }
                }
            }
            else -> {}
        }
    }
}
