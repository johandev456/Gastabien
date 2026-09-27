package com.gastabien.app.data.api

import com.gastabien.app.data.models.*
import retrofit2.http.*

interface ApiService {

    @GET("api/analytics/summary")
    suspend fun getSummary(
        @Header("x-user-id") userId: String = "demo-user-id"
    ): AnalyticsSummary

    @GET("api/transactions")
    suspend fun getTransactions(
        @Header("x-user-id") userId: String = "demo-user-id",
        @Query("bank") bank: String? = null,
        @Query("category") category: String? = null,
        @Query("type") type: String? = null,
        @Query("search") search: String? = null
    ): TransactionResponse

    @POST("api/transactions")
    suspend fun createTransaction(
        @Body request: CreateTransactionRequest,
        @Header("x-user-id") userId: String = "demo-user-id"
    ): Transaction

    @PUT("api/transactions/{id}")
    suspend fun updateCategory(
        @Path("id") id: String,
        @Body request: UpdateCategoryRequest,
        @Header("x-user-id") userId: String = "demo-user-id"
    ): Transaction

    @DELETE("api/transactions/{id}")
    suspend fun deleteTransaction(
        @Path("id") id: String,
        @Header("x-user-id") userId: String = "demo-user-id"
    ): Map<String, Any>

    @POST("api/sync/gmail")
    suspend fun syncGmail(
        @Header("x-user-id") userId: String = "demo-user-id"
    ): SyncResponse

    @POST("api/sync/simulate")
    suspend fun simulateSync(
        @Header("x-user-id") userId: String = "demo-user-id"
    ): SyncResponse

    @POST("api/statement/sync")
    suspend fun syncStatement(
        @Body request: StatementSyncRequest,
        @Header("x-user-id") userId: String = "demo-user-id"
    ): StatementSyncResponse

    @POST("api/sync/reset")
    suspend fun resetData(
        @Header("x-user-id") userId: String = "demo-user-id"
    ): Map<String, Any>
}
