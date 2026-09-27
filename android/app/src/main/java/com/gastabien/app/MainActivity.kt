package com.gastabien.app

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
import com.gastabien.app.ui.theme.Emerald400
import com.gastabien.app.ui.theme.GastaBienTheme
import com.gastabien.app.ui.theme.Slate900
import com.gastabien.app.ui.theme.Slate950

sealed class BottomNavItem(val route: String, val title: String, val icon: ImageVector) {
    object Dashboard : BottomNavItem("dashboard", "Resumen", Icons.Default.Home)
    object Transactions : BottomNavItem("transactions", "Movimientos", Icons.Default.Receipt)
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
                val isSyncing by viewModel.isSyncing.collectAsState()
                val syncMessage by viewModel.syncMessage.collectAsState()

                var showAddDialog by remember { mutableStateOf(false) }
                var showStatementDialog by remember { mutableStateOf(false) }
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
                    containerColor = Slate950,
                    bottomBar = {
                        NavigationBar(
                            containerColor = Slate900,
                            contentColor = Color.White
                        ) {
                            val navBackStackEntry by navController.currentBackStackEntryAsState()
                            val currentRoute = navBackStackEntry?.destination?.route

                            navItems.forEach { item ->
                                NavigationBarItem(
                                    icon = { Icon(item.icon, contentDescription = item.title) },
                                    label = { Text(item.title) },
                                    selected = currentRoute == item.route,
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Emerald400,
                                        selectedTextColor = Emerald400,
                                        indicatorColor = Slate950,
                                        unselectedIconColor = Color.Gray,
                                        unselectedTextColor = Color.Gray
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
                                isSyncing = isSyncing,
                                onSyncClick = { viewModel.syncEmails() },
                                onStatementClick = { showStatementDialog = true },
                                onAddClick = { showAddDialog = true }
                            )
                        }
                        composable(BottomNavItem.Transactions.route) {
                            TransactionsScreen(
                                transactionsState = transactionsState,
                                selectedBank = selectedBank,
                                onSelectBank = { viewModel.selectBank(it) },
                                onDeleteClick = { id -> viewModel.deleteTransaction(id) },
                                onCategoryChange = { id, cat -> viewModel.updateCategory(id, cat) },
                                onSearchChange = { query -> viewModel.loadTransactions(search = query) }
                            )
                        }
                        composable(BottomNavItem.Categories.route) {
                            CategoriesScreen(
                                summaryState = summaryState,
                                selectedBank = selectedBank,
                                onSelectBank = { viewModel.selectBank(it) }
                            )
                        }
                        composable(BottomNavItem.Banks.route) {
                            BanksScreen(
                                onSyncClick = { viewModel.syncEmails() }
                            )
                        }
                    }

                    if (showAddDialog) {
                        AddExpenseDialog(
                            onDismiss = { showAddDialog = false },
                            onConfirm = { merchant, amount, category, bank, bankName, type, notes ->
                                viewModel.addManualTransaction(
                                    merchant = merchant,
                                    amount = amount,
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
                }
            }
        }
    }
}
