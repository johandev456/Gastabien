package com.gastabien.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gastabien.app.ui.theme.*

fun formatMonthDisplay(monthKey: String): String {
    if (monthKey.equals("ALL", ignoreCase = true)) return "Todos los Meses"
    val parts = monthKey.split("-")
    if (parts.size == 2) {
        val year = parts[0]
        val monthName = when (parts[1]) {
            "01" -> "Enero"
            "02" -> "Febrero"
            "03" -> "Marzo"
            "04" -> "Abril"
            "05" -> "Mayo"
            "06" -> "Junio"
            "07" -> "Julio"
            "08" -> "Agosto"
            "09" -> "Septiembre"
            "10" -> "Octubre"
            "11" -> "Noviembre"
            "12" -> "Diciembre"
            else -> parts[1]
        }
        return "$monthName $year"
    }
    return monthKey
}

@Composable
fun MonthFilterChips(
    availableMonths: List<String>?,
    selectedMonth: String,
    onSelectMonth: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val isAllSelected = selectedMonth.equals("ALL", ignoreCase = true) || selectedMonth.isBlank()

    val monthsList = if (!availableMonths.isNullOrEmpty()) {
        availableMonths
    } else {
        emptyList()
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Option: "Todos los Meses"
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = if (isAllSelected) {
                Secondary.copy(alpha = 0.18f)
            } else {
                SurfaceContainerLow.copy(alpha = 0.8f)
            },
            border = BorderStroke(
                width = if (isAllSelected) 1.5.dp else 1.dp,
                color = if (isAllSelected) Secondary else OutlineVariant.copy(alpha = 0.35f)
            ),
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .clickable { onSelectMonth("ALL") }
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = if (isAllSelected) Icons.Default.Check else Icons.Default.CalendarMonth,
                    contentDescription = null,
                    tint = if (isAllSelected) Secondary else OnSurfaceVariant,
                    modifier = Modifier.size(13.dp)
                )

                Text(
                    text = "Todos los Meses",
                    fontSize = 12.sp,
                    fontWeight = if (isAllSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isAllSelected) OnSurface else OnSurfaceVariant
                )
            }
        }

        // Dynamic Months
        monthsList.forEach { monthKey ->
            val isSelected = selectedMonth.equals(monthKey, ignoreCase = true)
            val displayLabel = formatMonthDisplay(monthKey)

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isSelected) {
                    Secondary.copy(alpha = 0.18f)
                } else {
                    SurfaceContainerLow.copy(alpha = 0.8f)
                },
                border = BorderStroke(
                    width = if (isSelected) 1.5.dp else 1.dp,
                    color = if (isSelected) Secondary else OutlineVariant.copy(alpha = 0.35f)
                ),
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onSelectMonth(monthKey) }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = if (isSelected) Icons.Default.Check else Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = if (isSelected) Secondary else OnSurfaceVariant,
                        modifier = Modifier.size(13.dp)
                    )

                    Text(
                        text = displayLabel,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) OnSurface else OnSurfaceVariant
                    )
                }
            }
        }
    }
}
