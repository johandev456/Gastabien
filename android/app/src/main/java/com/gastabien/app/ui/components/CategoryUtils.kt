package com.gastabien.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.gastabien.app.ui.theme.*
import java.text.NumberFormat
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale

data class CategoryTheme(
    val icon: ImageVector,
    val color: Color,
    val containerColor: Color,
    val name: String
)

/** Exact theme per backend category name (same colors as the server's CATEGORY_COLORS). */
private val EXACT_THEMES: Map<String, Pair<ImageVector, Color>> = mapOf(
    "Combustible" to (Icons.Default.LocalGasStation to Color(0xFFEF4444)),
    "Supermercados" to (Icons.Default.ShoppingCart to Color(0xFF10B981)),
    "Restaurantes y Comida" to (Icons.Default.Restaurant to Color(0xFFF97316)),
    "Bares y Vida Nocturna" to (Icons.Default.LocalBar to Color(0xFFD500F9)),
    "Entretenimiento y Suscripciones" to (Icons.Default.Tv to Color(0xFF8B5CF6)),
    "Servicios y Facturas" to (Icons.Default.Receipt to Color(0xFF3B82F6)),
    "Salud y Farmacias" to (Icons.Default.LocalHospital to Color(0xFF06B6D4)),
    "Compras y Retail" to (Icons.Default.ShoppingBag to Color(0xFFEC4899)),
    "Transporte y Viajes" to (Icons.Default.DirectionsCar to Color(0xFFF59E0B)),
    "Transferencias y Pagos" to (Icons.Default.SwapHoriz to Color(0xFF64748B)),
    "Retiro de Efectivo" to (Icons.Default.Atm to Color(0xFF6366F1)),
    "Ingresos y Nómina" to (Icons.AutoMirrored.Filled.TrendingUp to Color(0xFF22C55E)),
    "Otros Gastos" to (Icons.Default.Category to Color(0xFF94A3B8))
)

private val themeCache = java.util.concurrent.ConcurrentHashMap<String, CategoryTheme>()

/** Cached: safe to call from draw lambdas without allocating on every frame. */
fun getCategoryTheme(categoryName: String): CategoryTheme =
    themeCache.getOrPut(categoryName) { computeCategoryTheme(categoryName) }

private fun computeCategoryTheme(categoryName: String): CategoryTheme {
    EXACT_THEMES[categoryName]?.let { (icon, color) ->
        return CategoryTheme(icon = icon, color = color, containerColor = color.copy(alpha = 0.18f), name = categoryName)
    }
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
                icon = Icons.AutoMirrored.Filled.TrendingUp,
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

private val DR_ZONE: ZoneId = ZoneId.of("America/Santo_Domingo")
private val SPANISH_MONTHS = listOf("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")

/** Parses an ISO date from the server ("2026-01-31T01:15:00.000Z" or "2026-01-31") into DR local date. */
fun parseToDrDate(rawDate: String?): LocalDate? {
    if (rawDate.isNullOrBlank()) return null
    return try {
        Instant.parse(rawDate).atZone(DR_ZONE).toLocalDate()
    } catch (_: Exception) {
        try {
            LocalDate.parse(rawDate.take(10))
        } catch (_: Exception) {
            null
        }
    }
}

/** "31 Ene 2026" in Dominican time (a 9 PM purchase is not shown as the next day). */
fun formatTransactionDate(rawDate: String?): String {
    val date = parseToDrDate(rawDate) ?: return rawDate?.take(10) ?: ""
    return "${date.dayOfMonth} ${SPANISH_MONTHS[date.monthValue - 1]} ${date.year}"
}

/** Relative time for "última sincronización" (hace 5 min, hace 2 h…). */
fun formatRelativeTime(rawDate: String?): String {
    if (rawDate.isNullOrBlank()) return "nunca"
    return try {
        val minutes = Duration.between(Instant.parse(rawDate), Instant.now()).toMinutes().coerceAtLeast(0)
        when {
            minutes < 1 -> "justo ahora"
            minutes < 60 -> "hace $minutes min"
            minutes < 60 * 24 -> "hace ${minutes / 60} h"
            minutes < 60 * 24 * 30 -> "hace ${minutes / (60 * 24)} días"
            else -> formatTransactionDate(rawDate)
        }
    } catch (_: Exception) {
        formatTransactionDate(rawDate)
    }
}

/** Today in Dominican time as YYYY-MM-DD (for manual entries). */
fun drTodayKey(): String = LocalDate.now(DR_ZONE).toString()

private val NUMBER_FORMAT: ThreadLocal<NumberFormat> = ThreadLocal.withInitial {
    NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }
}

/** RD$1,234.56 / US$15.99 — same style everywhere regardless of the phone's locale. */
fun formatMoney(amount: Double, currency: String? = "DOP"): String {
    val prefix = if (currency.equals("USD", ignoreCase = true)) "US$" else "RD$"
    val sign = if (amount < 0) "-" else ""
    return "$sign$prefix${NUMBER_FORMAT.get()!!.format(kotlin.math.abs(amount))}"
}

/** Locale-independent percentage: "7.5%" (backend values like 7.0 render as "7%"). */
fun formatPercent(value: Double): String {
    val rounded = Math.round(value * 10) / 10.0
    return if (rounded % 1.0 == 0.0) "${rounded.toLong()}%" else "${String.format(Locale.US, "%.1f", rounded)}%"
}

/** Accepts "1500", "1,500.50", "1500,50" or "1.500,50". Returns null when invalid. */
fun parseAmountInput(raw: String): Double? {
    val v = raw.trim().replace(" ", "")
    if (v.isEmpty()) return null
    val lastSep = maxOf(v.lastIndexOf('.'), v.lastIndexOf(','))
    val normalized = if (lastSep == -1) {
        v
    } else {
        val decimals = v.length - lastSep - 1
        if (decimals in 1..2) v.substring(0, lastSep).replace(".", "").replace(",", "") + "." + v.substring(lastSep + 1)
        else v.replace(".", "").replace(",", "")
    }
    return normalized.toDoubleOrNull()?.takeIf { it > 0 && it.isFinite() }
}

/** Plain decimal text for edit fields (never "1.0E7" or "1500.0"). */
fun amountToInput(amount: Double): String =
    java.math.BigDecimal.valueOf(amount).setScale(2, java.math.RoundingMode.HALF_UP).stripTrailingZeros().toPlainString()

/** Sign / color per movement type. Transfers are neutral (neither income nor expense). */
data class TypeVisual(val sign: String, val color: Color, val label: String)

fun typeVisual(type: String): TypeVisual = when (type) {
    "INCOME" -> TypeVisual("+", Secondary, "Ingreso")
    "TRANSFER" -> TypeVisual("", OnSurfaceVariant, "Transferencia")
    else -> TypeVisual("-", ErrorColor, "Gasto")
}
