package com.gastabien.app.data.api

import com.gastabien.app.BuildConfig
import com.google.gson.JsonParser
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit

object RetrofitClient {
    // Production Live Backend on Render.com
    @Volatile
    private var baseUrl: String = "https://gastabien.onrender.com/"

    @Volatile
    private var cachedService: ApiService? = null

    fun setBaseUrl(url: String) {
        synchronized(this) {
            baseUrl = if (url.endsWith("/")) url else "$url/"
            cachedService = null
        }
    }

    fun getBaseUrl(): String = baseUrl

    private fun buildService(): ApiService {
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("x-client-platform", "gastabien-android")
                    .build()
                chain.proceed(request)
            }
            .apply {
                // Request/response bodies contain financial data: never log them in release builds
                if (BuildConfig.DEBUG) {
                    addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
                }
            }
            // Render free instances can take ~30-50 s to wake up
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(120, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    val apiService: ApiService
        get() = cachedService ?: synchronized(this) {
            cachedService ?: buildService().also { cachedService = it }
        }
}

/**
 * Human readable message for any API failure: reads `message`/`error` from the server's JSON
 * error body (e.g. 422/500 responses) instead of showing "HTTP 422".
 */
fun Throwable.userMessage(fallback: String = "Error de conexión"): String = when (this) {
    is HttpException -> {
        val body = try {
            response()?.errorBody()?.string()
        } catch (_: Exception) {
            null
        }
        val parsed = try {
            body?.let {
                val obj = JsonParser.parseString(it).asJsonObject
                listOf("message", "error")
                    .mapNotNull { key -> obj.get(key)?.takeIf { e -> e.isJsonPrimitive }?.asString }
                    .firstOrNull { msg -> msg.isNotBlank() && msg != "2FA_REQUIRED" }
            }
        } catch (_: Exception) {
            null
        }
        parsed ?: "$fallback (HTTP ${code()})"
    }
    is SocketTimeoutException -> "El servidor tardó demasiado en responder. Puede estar despertando; reintenta en unos segundos."
    is IOException -> "Sin conexión con el servidor. Revisa tu internet."
    else -> localizedMessage ?: fallback
}
