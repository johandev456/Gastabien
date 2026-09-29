package com.gastabien.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.gastabien.app.data.models.*
import com.gastabien.app.ui.MainViewModel
import com.gastabien.app.ui.screens.*
import com.gastabien.app.ui.theme.*

sealed class BottomNavItem(val route: String, val title: String, val icon: ImageVector) {
    object Dashboard : BottomNavItem("dashboard", "Resumen", Icons.Default.Dashboard)
    object Transactions : BottomNavItem("transactions", "Movimientos", Icons.Default.ReceiptLong)
    object Categories : BottomNavItem("categories", "Categorías", Icons.Default.PieChart)
    object Banks : BottomNavItem("banks", "Bancos", Icons.Default.AccountBalance)
}

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            GastaBienTheme {
                val navController = rememberNavController()
                val summaryState by viewModel.summaryState.collectAsState()
                val transactionsState by viewModel.transactionsState.collectAsState()
                val selectedBank by viewModel.selectedBank.collectAsState()
                val selectedCategory by viewModel.selectedCategory.collectAsState()
                val isSyncing by viewModel.isSyncing.collectAsState()
                val syncMessage by viewModel.syncMessage.collectAsState()
                val authStatus by viewModel.authStatus.collectAsState()

                var showAddDialog by remember { mutableStateOf(false) }
                var showStatementDialog by remember { mutableStateOf(false) }
                var showGmailSyncDialog by remember { mutableStateOf(false) }
                var statementReport by remember { mutableStateOf<StatementSyncResponse?>(null) }

                LaunchedEffect(syncMessage) {
                    syncMessage?.let { msg ->
                        Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
                        viewModel.clearSyncMessage()
                    }
                }

                val navItems = listOf(
                    BottomNavItem.Dashboard,
                    BottomNavItem.Transactions,
                    BottomNavItem.Categories,
                    BottomNavItem.Banks
                )

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = Surface,
                    bottomBar = {
                        NavigationBar(
                            containerColor = SurfaceContainerLow,
                            contentColor = OnSurface
                        ) {
                            val navBackStackEntry by navController.currentBackStackEntryAsState()
                            val currentRoute = navBackStackEntry?.destination?.route

                            navItems.forEach { item ->
                                NavigationBarItem(
                                    icon = { Icon(item.icon, contentDescription = item.title) },
                                    label = { Text(item.title) },
                                    selected = currentRoute == item.route,
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Secondary,
                                        selectedTextColor = Secondary,
                                        indicatorColor = SurfaceContainerHigh,
                                        unselectedIconColor = OnSurfaceVariant,
                                        unselectedTextColor = OnSurfaceVariant
                                    ),
                                    onClick = {
                                        if (currentRoute != item.route) {
                                            navController.navigate(item.route) {
                                                popUpTo(navController.graph.startDestinationId) {
                                                    saveState = true
                                                }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = BottomNavItem.Dashboard.route,
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable(BottomNavItem.Dashboard.route) {
                            DashboardScreen(
                                summaryState = summaryState,
                                selectedBank = selectedBank,
                                onSelectBank = { viewModel.selectBank(it) },
                                selectedCategory = selectedCategory,
                                onSelectCategory = { viewModel.selectCategory(it) },
                                isSyncing = isSyncing,
                                onSyncClick = {
                                    viewModel.syncEmails(onRequiresConnection = {
                                        showGmailSyncDialog = true
                                    })
                                },
                                onStatementClick = { showStatementDialog = true },
                                onAddClick = { showAddDialog = true }
                            )
                        }
                        composable(BottomNavItem.Transactions.route) {
                            TransactionsScreen(
                                transactionsState = transactionsState,
                                selectedBank = selectedBank,
                                onSelectBank = { viewModel.selectBank(it) },
                                selectedCategory = selectedCategory,
                                onSelectCategory = { viewModel.selectCategory(it) },
                                onDeleteClick = { id -> viewModel.deleteTransaction(id) },
                                onCategoryChange = { id, cat -> viewModel.updateCategory(id, cat) },
                                onSearchChange = { query -> viewModel.loadTransactions(search = query) }
                            )
                        }
                        composable(BottomNavItem.Categories.route) {
                            CategoriesScreen(
                                summaryState = summaryState,
                                selectedBank = selectedBank,
                                onSelectBank = { viewModel.selectBank(it) },
                                selectedCategory = selectedCategory,
                                onSelectCategory = { viewModel.selectCategory(it) }
                            )
                        }
                        composable(BottomNavItem.Banks.route) {
                            BanksScreen(
                                authStatus = authStatus,
                                isSyncing = isSyncing,
                                onSyncClick = {
                                    viewModel.syncEmails(onRequiresConnection = {
                                        showGmailSyncDialog = true
                                    })
                                },
                                onOpenSyncDialog = { showGmailSyncDialog = true },
                                onStatementClick = { showStatementDialog = true }
                            )
                        }
                    }

                    if (showAddDialog) {
                        AddExpenseDialog(
                            onDismiss = { showAddDialog = false },
                            onConfirm = { merchant, amount, currency, category, bank, bankName, type, notes ->
                                viewModel.addManualTransaction(
                                    merchant = merchant,
                                    amount = amount,
                                    currency = currency,
                                    category = category,
                                    bank = bank,
                                    bankName = bankName,
                                    type = type,
                                    notes = notes
                                )
                                showAddDialog = false
                            }
                        )
                    }

                    if (showStatementDialog) {
                        SyncStatementDialog(
                            onDismiss = {
                                showStatementDialog = false
                                statementReport = null
                            },
                            onConfirm = { text, bank ->
                                viewModel.syncStatement(text, bank) { rep ->
                                    statementReport = rep
                                }
                            },
                            isProcessing = isSyncing,
                            report = statementReport
                        )
                    }

                    if (showGmailSyncDialog) {
                        GmailSyncDialog(
                            authStatus = authStatus,
                            isSyncing = isSyncing,
                            onDismiss = { showGmailSyncDialog = false },
                            onConnectGoogle = {
                                viewModel.getGoogleAuthUrl { url ->
                                    if (!url.isNullOrBlank()) {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                        startActivity(intent)
                                    }
                                }
                            },
                            onSyncNow = {
                                viewModel.syncEmails()
                            },
                            onResyncAll = {
                                viewModel.resyncAllEmails()
                            },
                            onSimulate = {
                                viewModel.simulateSync()
                            },
                            onParseRaw = { sender, subject, body ->
                                viewModel.parseRawEmail(sender, subject, body)
                            }
                        )
                    }
                }
            }
        }
    }
}
