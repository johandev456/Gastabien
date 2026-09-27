package com.gastabien.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Emerald500,
    secondary = Emerald400,
    tertiary = Indigo600,
    background = Slate950,
    surface = Slate900,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Slate200,
    onSurface = Slate200,
    surfaceVariant = Slate800,
    onSurfaceVariant = Slate400
)

@Composable
fun GastaBienTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
