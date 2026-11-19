# Gson models are (de)serialized by reflection: keep their fields when minify is enabled.
-keep class com.gastabien.app.data.models.** { *; }
-keepattributes Signature, *Annotation*
# Retrofit
-keep,allowobfuscation interface com.gastabien.app.data.api.ApiService
-dontwarn okhttp3.**
-dontwarn retrofit2.**
