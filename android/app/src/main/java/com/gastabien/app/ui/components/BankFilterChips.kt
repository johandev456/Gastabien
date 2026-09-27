package com.gastabien.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FilterAlt
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
import com.gastabien.app.ui.theme.*

data class BankFilterOption(
    val code: String,
    val name: String,
    val shortName: String,
    val color: Color
)

val DOMINICAN_BANKS = listOf(
    BankFilterOption("ALL", "Todos los Bancos", "Todos", Primary),
    BankFilterOption("POPULAR", "Banco Popular", "Popular", BankPopularAccent),
    BankFilterOption("BHD", "Banco BHD", "BHD", BankBhdAccent),
    BankFilterOption("PROMERICA", "Banco Promerica", "Promerica", BankPromericaAccent),
    BankFilterOption("QIK", "Qik Banco Digital", "Qik", BankQikAccent)
)

@Composable
fun BankFilterChips(
    selectedBank: String,
    onSelectBank: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        DOMINICAN_BANKS.forEach { bank ->
            val isSelected = selectedBank.equals(bank.code, ignoreCase = true)

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isSelected) {
                    bank.color.copy(alpha = 0.16f)
                } else {
                    SurfaceContainerLow.copy(alpha = 0.8f)
                },
                border = BorderStroke(
                    width = if (isSelected) 1.5.dp else 1.dp,
                    color = if (isSelected) bank.color else OutlineVariant.copy(alpha = 0.35f)
                ),
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onSelectBank(bank.code) }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (bank.code == "ALL") {
                        Icon(
                            imageVector = if (isSelected) Icons.Default.Check else Icons.Default.FilterAlt,
                            contentDescription = null,
                            tint = if (isSelected) Primary else OnSurfaceVariant,
                            modifier = Modifier.size(13.dp)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(bank.color)
                        )
                    }

                    Text(
                        text = bank.shortName,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) OnSurface else OnSurfaceVariant
                    )
                }
            }
        }
    }
}

