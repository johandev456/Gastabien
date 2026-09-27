package com.gastabien.app.ui.screens

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.gastabien.app.data.models.StatementSyncResponse
import com.gastabien.app.ui.theme.*
import java.io.BufferedReader
import java.io.InputStreamReader

fun getFileNameFromUri(context: Context, uri: Uri): String {
    var name: String? = null
    if (uri.scheme == "content") {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    name = cursor.getString(index)
                }
            }
        }
    }
    if (name == null) {
        name = uri.lastPathSegment ?: "estado_de_cuenta.csv"
    }
    return name ?: "estado_de_cuenta.csv"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncStatementDialog(
    onDismiss: () -> Unit,
    onConfirm: (text: String, bank: String) -> Unit,
    isProcessing: Boolean = false,
    report: StatementSyncResponse? = null
) {
    val context = LocalContext.current
    var statementText by remember { mutableStateOf("") }
    var selectedFileName by remember { mutableStateOf<String?>(null) }
    var bank by remember { mutableStateOf("PROMERICA") }
    var fileReadError by remember { mutableStateOf<String?>(null) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                fileReadError = null
                val fileName = getFileNameFromUri(context, uri)
                selectedFileName = fileName

                context.contentResolver.openInputStream(uri)?.use { inputStream ->
                    val reader = BufferedReader(InputStreamReader(inputStream))
                    val content = reader.readText()
                    statementText = content
                }
            } catch (e: Exception) {
                fileReadError = "Error al leer archivo: ${e.localizedMessage}"
            }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = SurfaceContainerLow,
            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.3f)),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "📑 Estado de Cuenta",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = OnSurface
                        )
                    }
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = OnSurfaceVariant)
                    }
                }

                Text(
                    text = "Conciliación bancaria oficial con extractos .csv",
                    fontSize = 11.sp,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(top = 2.dp, bottom = 14.dp)
                )

                if (report != null && report.report != null) {
                    val rep = report.report
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Secondary.copy(alpha = 0.12f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Secondary.copy(alpha = 0.3f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Secondary, modifier = Modifier.size(16.dp))
                                Text(
                                    text = "Conciliación Exitosa",
                                    fontWeight = FontWeight.Bold,
                                    color = Secondary,
                                    fontSize = 14.sp
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "• Movimientos analizados: ${rep.totalStatementEntries}\n• Verificados: ${rep.matchedCount}\n• Nuevos agregados: ${rep.addedCount}\n• Nombres corregidos: ${rep.updatedCount}\n• Descartados (No en banco): ${rep.removedCount}",
                                color = OnSurface,
                                fontSize = 12.sp,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Ingresos: +RD$ ${"%,.2f".format(rep.totalIncomeAmount)} | Gastos: -RD$ ${"%,.2f".format(rep.totalExpenseAmount)}",
                                color = SecondaryFixed,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                // Bank Selection
                Text(
                    text = "1. Selecciona el Banco:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = OnSurface
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("PROMERICA", "POPULAR", "BHD", "QIK").forEach { b ->
                        val isSelected = bank == b
                        FilterChip(
                            selected = isSelected,
                            onClick = { bank = b },
                            label = { 
                                Text(
                                    text = if (b == "PROMERICA") "Prom." else if (b == "POPULAR") "Pop." else b, 
                                    fontSize = 11.sp, 
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                ) 
                            },
                            modifier = Modifier.weight(1f),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SecondaryContainer,
                                selectedLabelColor = Color.White,
                                containerColor = SurfaceContainerHigh,
                                labelColor = OnSurfaceVariant
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // File Upload Button
                Text(
                    text = "2. Cargar Archivo CSV del Banco:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = OnSurface
                )

                Spacer(modifier = Modifier.height(6.dp))

                Button(
                    onClick = {
                        filePickerLauncher.launch("*/*")
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceContainerHigh)
                ) {
                    Icon(
                        Icons.Default.AttachFile,
                        contentDescription = "Subir Archivo",
                        tint = Primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (selectedFileName != null) "Archivo: $selectedFileName" else "Seleccionar Archivo (.csv / .txt)",
                        color = if (selectedFileName != null) Secondary else OnSurface,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                if (fileReadError != null) {
                    Text(
                        text = fileReadError ?: "",
                        color = ErrorColor,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Raw Text Box
                Text(
                    text = "O pega el texto del estado de cuenta:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = OnSurface
                )

                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = statementText,
                    onValueChange = { statementText = it },
                    placeholder = {
                        Text(
                            "Contenido del extracto bancario...",
                            color = OnSurfaceVariant,
                            fontSize = 12.sp
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(140.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = OutlineVariant.copy(alpha = 0.35f),
                        focusedTextColor = OnSurface,
                        unfocusedTextColor = OnSurface
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = OnSurfaceVariant)
                    ) {
                        Text("Cerrar")
                    }

                    Button(
                        onClick = { onConfirm(statementText, bank) },
                        modifier = Modifier.weight(1f),
                        enabled = statementText.isNotBlank() && !isProcessing,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SecondaryContainer)
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Conciliar", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
