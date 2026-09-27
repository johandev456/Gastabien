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
import androidx.compose.runtime.Composable
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
import com.gastabien.app.data.models.BankDistribution
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat

@Composable
fun DominicanBankShareView(
    summary: AnalyticsSummary,
    selectedBank: String,
    onSelectBank: (String) -> Unit,
    dopFormat: NumberFormat,
    modifier: Modifier = Modifier
) {
    val totalExpenses = summary.totalExpenses
    val bankDistributions = summary.byBank

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Overview Card
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
                                .background(Primary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.AccountBalance,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Distribución por Entidad RD",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = OnSurface
                            )
                            Text(
                                text = "Cuota de gasto en tus tarjetas bancarias",
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
                            text = "${bankDistributions.size} Bancos",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Secondary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        // Bank Cards List
        if (bankDistributions.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = SurfaceContainerLow.copy(alpha = 0.85f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "No hay registros bancarios asociados.",
                    fontSize = 12.sp,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(20.dp)
                )
            }
        } else {
            bankDistributions.forEach { bank ->
                val bankColor = when (bank.bank.uppercase()) {
                    "PROMERICA" -> BankPromericaAccent
                    "POPULAR" -> BankPopularAccent
                    "BHD" -> BankBhdAccent
                    "QIK" -> BankQikAccent
                    else -> Primary
                }

                val pct = if (totalExpenses > 0) (bank.totalExpenses / totalExpenses) * 100.0 else 0.0
                val isSelected = selectedBank.equals(bank.bank, ignoreCase = true)

                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = if (isSelected) SurfaceContainerHigh else SurfaceContainerLow.copy(alpha = 0.85f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isSelected) bankColor else OutlineVariant.copy(alpha = 0.25f)
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .clickable { onSelectBank(if (isSelected) "ALL" else bank.bank) }
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
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
                                        .background(bankColor.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.CreditCard,
                                        contentDescription = null,
                                        tint = bankColor,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(
                                            text = bank.bankName,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = OnSurface,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        if (isSelected) {
                                            Text(
                                                text = "Filtrando",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = bankColor
                                            )
                                        }
                                    }
                                    Text(
                                        text = "${bank.count} movimientos • ${"%.1f%%".format(pct)} del total",
                                        fontSize = 11.sp,
                                        color = OnSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            Text(
                                text = dopFormat.format(bank.totalExpenses),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = bankColor
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Glowing horizontal bar
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(CircleShape)
                                .background(SurfaceContainerHighest)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth((pct / 100.0).toFloat().coerceIn(0.05f, 1f))
                                    .fillMaxHeight()
                                    .clip(CircleShape)
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(bankColor.copy(alpha = 0.7f), bankColor)
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
