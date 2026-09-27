package com.gastabien.app.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    // Production Live Backend on Render.com
    private var baseUrl: String = "https://gastabien.onrender.com/"

    fun setBaseUrl(url: String) {
        baseUrl = if (url.endsWith("/")) url else "$url/"
        retrofitInstance = null
    }

    fun getBaseUrl(): String = baseUrl

    private var retrofitInstance: Retrofit? = null

    private fun getRetrofit(): Retrofit {
        if (retrofitInstance == null) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val okHttpClient = OkHttpClient.Builder()
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .addHeader("Bypass-Tunnel-Reminder", "true")
                        .build()
                    chain.proceed(request)
                }
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            retrofitInstance = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofitInstance!!
    }

    val apiService: ApiService
        get() = getRetrofit().create(ApiService::class.java)
}
