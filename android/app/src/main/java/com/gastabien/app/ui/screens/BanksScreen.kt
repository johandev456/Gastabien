package com.gastabien.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BanksScreen(
    onSyncClick: () -> Unit
) {
    val banks = listOf(
        BankItemData("Banco Popular Dominicano", "notificaciones@bpd.com.do", BankPopularAccent, "Popular", "Cuentas & Tarjetas Visa/MC"),
        BankItemData("Banco BHD", "alertas@bhd.com.do", BankBhdAccent, "BHD", "Alertas Pin Pesos & TC"),
        BankItemData("Banco Promerica", "notificaciones@promerica.com.do", BankPromericaAccent, "Promerica", "Cuentas Ahorro & Nómina"),
        BankItemData("Qik Banco Digital", "notificaciones@qik.com.do", BankQikAccent, "Qik", "Neobanco RD & Tarjetas")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Bancos & Conexiones",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = OnSurface
                        )
                        Text(
                            text = "Entidades financieras dominicanas",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        },
        containerColor = Surface
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Gmail Connection Banner
            item {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = SurfaceContainerLow.copy(alpha = 0.85f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box {
                        // Specular line
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(Color.Transparent, Primary.copy(alpha = 0.4f), Color.Transparent)
                                    )
                                )
                        )

                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(42.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(ErrorColor.copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.Mail, contentDescription = null, tint = ErrorColor)
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = "Google Gmail Conectado",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = OnSurface
                                        )
                                        Text(
                                            text = "Filtro activo para notificaciones bancarias",
                                            fontSize = 12.sp,
                                            color = Secondary
                                        )
                                    }
                                }

                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Secondary.copy(alpha = 0.15f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Secondary.copy(alpha = 0.25f))
                                ) {
                                    Text(
                                        text = "ENCRIPTADO",
                                        color = Secondary,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            Button(
                                onClick = onSyncClick,
                                colors = ButtonDefaults.buttonColors(containerColor = SecondaryContainer),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Sincronizar Correos de Bancos RD", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Banks header
            item {
                Text(
                    text = "Bancos Dominicanos Homologados",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = OnSurface,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // Supported banks list
            items(banks.size) { index ->
                val b = banks[index]
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = SurfaceContainerLow.copy(alpha = 0.85f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, OutlineVariant.copy(alpha = 0.25f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .padding(16.dp)
                            .fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = b.color.copy(alpha = 0.16f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, b.color.copy(alpha = 0.3f)),
                                modifier = Modifier.size(40.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = b.tag.take(2),
                                        fontWeight = FontWeight.Bold,
                                        color = b.color,
                                        fontSize = 14.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Text(
                                    text = b.name,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSurface
                                )
                                Text(
                                    text = b.description,
                                    fontSize = 11.sp,
                                    color = OnSurfaceVariant
                                )
                            }
                        }

                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = "Activo",
                            tint = Secondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(70.dp))
            }
        }
    }
}

data class BankItemData(
    val name: String,
    val email: String,
    val color: Color,
    val tag: String,
    val description: String
)
