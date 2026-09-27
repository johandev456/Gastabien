package com.gastabien.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.gastabien.app.data.models.StatementSyncResponse
import com.gastabien.app.ui.theme.*

const val SAMPLE_PROMERICA_CSV = """Fecha de Posteo,Fecha Efectiva,No. Secuencia, Código de Transacción,No. Referencia,Descripción,Retiros,Depósitos,Balance,
"15/09/2026","15/09/2026","1","58-27","15235149","PRIMERA QUINCENA DE SEPTIEMBRE 2026||",0.00,13325.80,13325.80,
"15/09/2026","15/09/2026","2","57-82","321181","COMPRA POS SM BRAVO LA ESPERILLA    SANTO DOMINGODO",222.00,0.00,13103.80,
"15/09/2026","15/09/2026","4","57-82","327391","COMPRA POS TOTALENERGIES 27 DE FEB  SANTO DOMINGODO",2000.00,0.00,11004.80,
"16/09/2026","16/09/2026","6","57-81","341437","RETIRO ATM BANCO RESERVAS R.D 010REPSTDOM     DR DO",2000.00,0.00,8756.80,
"17/09/2026","17/09/2026","9","57-53","15270158","PAGO CODETEL_PREPAGO 8297908159|40230916591|JOHAN ALEXANDER ROSARIO LOPEZ",230.00,0.00,7700.23,
"17/09/2026","17/09/2026","10","79-49","15270158","COBRO IMPUESTO CHEQUES Y TRANSF|40230916591|JOHAN ALEXANDER ROSARIO LOPEZ",0.46,0.00,7699.77,
"20/09/2026","20/09/2026","19","57-81","374497","RETIRO ATM BANCO BHD             SANTO DOMINGO   DO",1000.00,0.00,4289.77,
"25/09/2026","25/09/2026","27","57-82","410223","COMPRA POS COFFEE SHOP PUCMM S DG   SANTO DOMINGODO",146.44,0.00,1237.89,"""

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncStatementDialog(
    onDismiss: () -> Unit,
    onConfirm: (text: String, bank: String) -> Unit,
    isProcessing: Boolean = false,
    report: StatementSyncResponse? = null
) {
    var statementText by remember { mutableStateOf("") }
    var bank by remember { mutableStateOf("PROMERICA") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "📑 Conciliar Estado de Cuenta",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Pega los movimientos oficiales de tu banco para registrar nómina, cajeros y depurar discrepancias.",
                    fontSize = 12.sp,
                    color = Slate400,
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                if (report != null && report.report != null) {
                    val rep = report.report
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Emerald600.copy(alpha = 0.15f)),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "✅ Conciliación Exitosa",
                                fontWeight = FontWeight.Bold,
                                color = Emerald400,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "• Verificados: ${rep.matchedCount}\n• Agregados (Nómina/ATM): ${rep.addedCount}\n• Actualizados: ${rep.updatedCount}\n• Descartados (No en banco): ${rep.removedCount}",
                                color = Color.White,
                                fontSize = 12.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Ingresos: +RD$ ${"%,.2f".format(rep.totalIncomeAmount)} | Gastos: -RD$ ${"%,.2f".format(rep.totalExpenseAmount)}",
                                color = Emerald300,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                // Bank Selection
                Text(
                    text = "Banco:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Slate400
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("PROMERICA", "POPULAR", "BHD", "QIK").forEach { b ->
                        FilterChip(
                            selected = bank == b,
                            onClick = { bank = b },
                            label = { Text(b, fontSize = 11.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Emerald600,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Texto / CSV del Estado:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Slate400
                    )
                    TextButton(
                        onClick = { statementText = SAMPLE_PROMERICA_CSV },
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Text("Cargar Ejemplo", color = Emerald400, fontSize = 11.sp)
                    }
                }

                OutlinedTextField(
                    value = statementText,
                    onValueChange = { statementText = it },
                    placeholder = {
                        Text(
                            "Pega aquí la tabla o CSV copiado de tu banco...",
                            color = Slate500,
                            fontSize = 12.sp
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald600,
                        unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
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
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate400)
                    ) {
                        Text("Cerrar")
                    }

                    Button(
                        onClick = { onConfirm(statementText, bank) },
                        modifier = Modifier.weight(1f),
                        enabled = statementText.isNotBlank() && !isProcessing,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Conciliar", color = Color.White)
                        }
                    }
                }
            }
        }
    }
}
