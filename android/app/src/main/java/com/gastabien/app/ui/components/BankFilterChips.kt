package com.gastabien.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Layers
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
    BankFilterOption("ALL", "Todos los Bancos", "Todos", Emerald400),
    BankFilterOption("POPULAR", "Banco Popular", "Popular", BankPopular),
    BankFilterOption("BHD", "Banco BHD", "BHD", BankBhd),
    BankFilterOption("PROMERICA", "Banco Promerica", "Promerica", BankPromerica),
    BankFilterOption("QIK", "Qik Banco Digital", "Qik", BankQik)
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
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) {
                    bank.color.copy(alpha = 0.2f)
                } else {
                    Slate900
                },
                border = BorderStroke(
                    width = if (isSelected) 1.5.dp else 1.dp,
                    color = if (isSelected) bank.color else Slate800
                ),
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .clickable { onSelectBank(bank.code) }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Small Bank Dot or Icon
                    if (bank.code == "ALL") {
                        Icon(
                            imageVector = if (isSelected) Icons.Default.Check else Icons.Default.Layers,
                            contentDescription = null,
                            tint = if (isSelected) Emerald400 else Slate400,
                            modifier = Modifier.size(14.dp)
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
                        color = if (isSelected) Color.White else Slate400
                    )
                }
            }
        }
    }
}
