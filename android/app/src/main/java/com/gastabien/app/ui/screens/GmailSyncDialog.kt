package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.gastabien.app.data.models.AuthStatusResponse
import com.gastabien.app.ui.theme.*

enum class SyncDialogTab(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    GMAIL("Gmail Oficial", Icons.Default.Mail),
    PASTE("Pegar Correo", Icons.Default.ContentPaste),
    SIMULATE("Simular RD", Icons.Default.AutoFixHigh)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GmailSyncDialog(
    authStatus: AuthStatusResponse?,
    isSyncing: Boolean,
    onDismiss: () -> Unit,
    onConnectGoogle: () -> Unit,
    onSyncNow: () -> Unit,
    onResyncAll: () -> Unit,
    onSimulate: () -> Unit,
    onParseRaw: (sender: String, subject: String, body: String) -> Unit
) {
    var selectedTab by remember { mutableStateOf(SyncDialogTab.GMAIL) }
    val isConnected = authStatus?.user?.hasGmailConnected == true
    val userEmail = authStatus?.user?.email ?: "usuario@gmail.com"

    // Paste Tab State
    var rawSender by remember { mutableStateOf("notificaciones@bpd.com.do") }
    var rawSubject by remember { mutableStateOf("Aviso de Débito por Compra") }
    var rawBody by remember { mutableStateOf("") }
    var expandedSender by remember { mutableStateOf(false) }

    val senderOptions = listOf(
        "notificaciones@bpd.com.do" to "Banco Popular",
        "alertas@bhd.com.do" to "Banco BHD",
        "notificaciones@promerica.com.do" to "Banco Promerica",
        "notificaciones@qik.com.do" to "Qik Digital"
    )

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = SurfaceContainerLow,
            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.35f)),
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight()
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
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
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(ErrorColor.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Mail, contentDescription = null, tint = ErrorColor, modifier = Modifier.size(20.dp))
                        }
                        Column {
                            Text(
                                text = "Sincronización Bancaria",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = OnSurface
                            )
                            Text(
                                text = "Lector de notificaciones RD",
                                fontSize = 11.sp,
                                color = OnSurfaceVariant
                            )
                        }
                    }

                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = OnSurfaceVariant, modifier = Modifier.size(18.dp))
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Tabs Selector Bar
                val tabScrollState = rememberScrollState()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(tabScrollState),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    SyncDialogTab.values().forEach { tab ->
                        val isTabSelected = selectedTab == tab
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (isTabSelected) Primary.copy(alpha = 0.18f) else SurfaceContainerHigh,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isTabSelected) Primary else OutlineVariant.copy(alpha = 0.25f)
                            ),
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { selectedTab = tab }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(5.dp)
                            ) {
                                Icon(
                                    tab.icon,
                                    contentDescription = null,
                                    tint = if (isTabSelected) Primary else OnSurfaceVariant,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = tab.title,
                                    fontSize = 11.sp,
                                    fontWeight = if (isTabSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isTabSelected) OnSurface else OnSurfaceVariant
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Tab Contents
                when (selectedTab) {
                    SyncDialogTab.GMAIL -> {
                        // Gmail Connection Status Card
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = SurfaceContainerHigh.copy(alpha = 0.6f),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isConnected) Secondary.copy(alpha = 0.35f) else OutlineVariant.copy(alpha = 0.25f)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(if (isConnected) Secondary else ErrorColor)
                                        )
                                        Text(
                                            text = if (isConnected) "Gmail Vinculado" else "Gmail No Conectado",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isConnected) Secondary else OnSurface
                                        )
                                    }

                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = if (isConnected) Secondary.copy(alpha = 0.15f) else ErrorColor.copy(alpha = 0.15f)
                                    ) {
                                        Text(
                                            text = if (isConnected) "ACTIVO" else "PENDIENTE",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isConnected) Secondary else ErrorColor,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                if (isConnected) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Cuenta: $userEmail",
                                        fontSize = 11.sp,
                                        color = OnSurfaceVariant
                                    )
                                    if (!authStatus?.user?.lastSyncAt.isNullOrBlank()) {
                                        Text(
                                            text = "Última sincronización: ${authStatus?.user?.lastSyncAt}",
                                            fontSize = 10.sp,
                                            color = OnSurfaceVariant
                                        )
                                    }
                                } else {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Conecta tu Gmail para extraer avisos de débito y consumo de Banco Popular, BHD, Promerica y Qik automáticamente.",
                                        fontSize = 11.sp,
                                        color = OnSurfaceVariant,
                                        lineHeight = 15.sp
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        if (!isConnected) {
                            Button(
                                onClick = onConnectGoogle,
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.OpenInBrowser, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Vincular Cuenta de Gmail (OAuth)", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        } else {
                            Button(
                                onClick = onSyncNow,
                                enabled = !isSyncing,
                                colors = ButtonDefaults.buttonColors(containerColor = SecondaryContainer),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                if (isSyncing) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Sincronizando correos...", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                } else {
                                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Sincronizar Correos Nuevos", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            OutlinedButton(
                                onClick = onResyncAll,
                                enabled = !isSyncing,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Re-escanear historial completo", fontSize = 12.sp, color = OnSurfaceVariant)
                            }
                        }
                    }

                    SyncDialogTab.PASTE -> {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Bank Sender Selector
                            ExposedDropdownMenuBox(
                                expanded = expandedSender,
                                onExpandedChange = { expandedSender = !expandedSender }
                            ) {
                                OutlinedTextField(
                                    value = senderOptions.firstOrNull { it.first == rawSender }?.second ?: rawSender,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Banco Emisor", fontSize = 11.sp, color = OnSurfaceVariant) },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedSender) },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Primary,
                                        unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                                        focusedTextColor = OnSurface,
                                        unfocusedTextColor = OnSurface
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .menuAnchor()
                                        .fillMaxWidth()
                                )
                                ExposedDropdownMenu(
                                    expanded = expandedSender,
                                    onDismissRequest = { expandedSender = false },
                                    modifier = Modifier.background(SurfaceContainerHigh)
                                ) {
                                    senderOptions.forEach { (email, name) ->
                                        DropdownMenuItem(
                                            text = {
                                                Column {
                                                    Text(name, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = OnSurface)
                                                    Text(email, fontSize = 10.sp, color = OnSurfaceVariant)
                                                }
                                            },
                                            onClick = {
                                                rawSender = email
                                                expandedSender = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Raw Text Input
                            OutlinedTextField(
                                value = rawBody,
                                onValueChange = { rawBody = it },
                                label = { Text("Pega el texto del correo o SMS bancario", fontSize = 11.sp, color = OnSurfaceVariant) },
                                placeholder = {
                                    Text(
                                        "Ejemplo: Estimado cliente, se realizó un consumo por RD$ 1,850.00 en Supermercados Bravo con su tarjeta terminada en 4829.",
                                        fontSize = 11.sp,
                                        color = OnSurfaceVariant.copy(alpha = 0.5f)
                                    )
                                },
                                minLines = 3,
                                maxLines = 5,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Primary,
                                    unfocusedBorderColor = OutlineVariant.copy(alpha = 0.4f),
                                    focusedTextColor = OnSurface,
                                    unfocusedTextColor = OnSurface
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Button(
                                onClick = {
                                    if (rawBody.isNotBlank()) {
                                        onParseRaw(rawSender, rawSubject, rawBody)
                                        rawBody = ""
                                        onDismiss()
                                    }
                                },
                                enabled = rawBody.isNotBlank() && !isSyncing,
                                colors = ButtonDefaults.buttonColors(containerColor = SecondaryContainer),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Procesar y Clasificar Movimiento", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }

                    SyncDialogTab.SIMULATE -> {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = SurfaceContainerHigh.copy(alpha = 0.6f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(Icons.Default.AutoFixHigh, contentDescription = null, tint = Primary, modifier = Modifier.size(16.dp))
                                        Text(
                                            text = "Simulador de Notificaciones RD",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = OnSurface
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Ingresa compras y movimientos de prueba con formatos reales de Banco Popular, BHD, Promerica y Qik para probar la categorización instantánea.",
                                        fontSize = 11.sp,
                                        color = OnSurfaceVariant,
                                        lineHeight = 15.sp
                                    )
                                }
                            }

                            Button(
                                onClick = {
                                    onSimulate()
                                    onDismiss()
                                },
                                enabled = !isSyncing,
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Cargar Movimientos de Prueba", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cerrar", color = OnSurfaceVariant, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
