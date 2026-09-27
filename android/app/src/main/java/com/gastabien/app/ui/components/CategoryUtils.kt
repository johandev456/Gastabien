package com.gastabien.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.gastabien.app.ui.theme.*

data class CategoryTheme(
    val icon: ImageVector,
    val color: Color,
    val containerColor: Color,
    val name: String
)

fun getCategoryTheme(categoryName: String): CategoryTheme {
    val lower = categoryName.lowercase()
    return when {
        lower.contains("bar") || lower.contains("pub") || lower.contains("nocturn") || lower.contains("discotec") -> {
            CategoryTheme(
                icon = Icons.Default.LocalBar,
                color = Color(0xFFD500F9),
                containerColor = Color(0xFFD500F9).copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("combus") || lower.contains("gasolin") || lower.contains("total") || lower.contains("shell") -> {
            CategoryTheme(
                icon = Icons.Default.LocalGasStation,
                color = ErrorColor,
                containerColor = ErrorColor.copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("super") || lower.contains("alimen") || lower.contains("bravo") || lower.contains("sirena") || lower.contains("nacional") -> {
            CategoryTheme(
                icon = Icons.Default.ShoppingCart,
                color = Secondary,
                containerColor = Secondary.copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("retiro") || lower.contains("cajer") || lower.contains("efect") || lower.contains("atm") -> {
            CategoryTheme(
                icon = Icons.Default.Atm,
                color = PrimaryContainer,
                containerColor = PrimaryContainer.copy(alpha = 0.20f),
                name = categoryName
            )
        }
        lower.contains("restauran") || lower.contains("comida") || lower.contains("cafe") || lower.contains("baker") -> {
            CategoryTheme(
                icon = Icons.Default.Restaurant,
                color = Color(0xFFFF9800),
                containerColor = Color(0xFFFF9800).copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("servici") || lower.contains("factur") || lower.contains("sms") || lower.contains("alerta") || lower.contains("claro") || lower.contains("altice") -> {
            CategoryTheme(
                icon = Icons.Default.Receipt,
                color = Primary,
                containerColor = Primary.copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("entreten") || lower.contains("suscrip") || lower.contains("netflix") || lower.contains("spotify") || lower.contains("cine") -> {
            CategoryTheme(
                icon = Icons.Default.Tv,
                color = Tertiary,
                containerColor = Tertiary.copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("salud") || lower.contains("farmac") || lower.contains("medic") || lower.contains("carol") -> {
            CategoryTheme(
                icon = Icons.Default.LocalHospital,
                color = Color(0xFF00E5FF),
                containerColor = Color(0xFF00E5FF).copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("transporte") || lower.contains("viaje") || lower.contains("uber") || lower.contains("vuelo") -> {
            CategoryTheme(
                icon = Icons.Default.DirectionsCar,
                color = Color(0xFFFF4081),
                containerColor = Color(0xFFFF4081).copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("compra") || lower.contains("retail") || lower.contains("amazon") || lower.contains("zara") -> {
            CategoryTheme(
                icon = Icons.Default.ShoppingBag,
                color = Color(0xFFFFD54F),
                containerColor = Color(0xFFFFD54F).copy(alpha = 0.18f),
                name = categoryName
            )
        }
        lower.contains("ingreso") || lower.contains("nomina") || lower.contains("sueldo") -> {
            CategoryTheme(
                icon = Icons.Default.TrendingUp,
                color = SecondaryFixed,
                containerColor = SecondaryFixed.copy(alpha = 0.18f),
                name = categoryName
            )
        }
        else -> {
            CategoryTheme(
                icon = Icons.Default.Category,
                color = Outline,
                containerColor = Outline.copy(alpha = 0.18f),
                name = categoryName
            )
        }
    }
}
