# 🚀 GastaBien RD - Control Inteligente de Gastos, Ingresos y Conciliación Bancaria

Sistema integral multiplataforma inspirado en **GastaBien** para el registro automático de gastos, ingresos, retiros ATM y conciliación con estados de cuenta oficiales para los principales bancos de República Dominicana:

* 🏛️ **Banco Promerica** (`notificaciones@promerica.com.do` + Importador oficial CSV/Extractos)
* 🏛️ **Banco Popular Dominicano** (`notificaciones@bpd.com.do`)
* 🏛️ **Banco BHD** (`alertas@bhd.com.do`)
* 💜 **Qik Banco Digital** (`notificaciones@qik.com.do`)

---

## 📂 Estructura del Proyecto

```
gastabien-app/
├── backend/                # API REST en Node.js + TypeScript + Motor de Parsers de Bancos de RD
│   ├── src/
│   │   ├── parsers/        # Parsers especializados (Promerica, Popular, BHD, Qik)
│   │   ├── services/       # Gmail API, Conciliador de Estado de Cuenta, Categorización RD
│   │   ├── routes/         # Endpoints de Autenticación, Movimientos, Conciliación, Analíticas
│   │   └── database/       # Persistencia JSON en disco
│   └── render.yaml         # Configuración para hosting gratis en Render.com
│
├── web/                    # Aplicación Web moderna (React 18 + Vite + Tailwind CSS + Recharts)
│   ├── src/
│   │   ├── components/     # Dashboard, Conciliador Estado de Cuenta, Filtro de Bancos, Gráficos
│   │   └── api/            # Cliente HTTP sincronizado
│   ├── vercel.json         # Configuración para hosting gratis en Vercel
│   └── netlify.toml        # Configuración para hosting gratis en Netlify
│
└── android/                # Proyecto nativo para Android Studio (Kotlin + Jetpack Compose + Material 3)
    ├── app/src/main/java/com/gastabien/app/
    │   ├── ui/screens/     # Dashboard, Conciliar Estado, Movimientos, Categorías, Bancos
    │   ├── data/api/       # Cliente Retrofit para sincronización en tiempo real
    │   └── MainActivity.kt
    └── gradle/libs.versions.toml
```

---

## 🌐 Cómo Publicar en Hosting Gratis (Live en Internet)

### 1. Despliegue del Backend (Render.com - 100% Gratis)
1. Entra a [Render.com](https://render.com) y crea una cuenta gratuita.
2. Haz clic en **New +** -> **Web Service** y conecta tu repositorio (o sube la carpeta `backend`).
3. En la configuración de Render:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Render te dará una URL pública como: `https://gastabien-api.onrender.com`.

### 2. Despliegue de la Web Frontend (Vercel o Netlify - 100% Gratis)

#### Opción Vercel (Recomendado):
1. Entra a [Vercel.com](https://vercel.com).
2. Conecta tu repositorio y selecciona el directorio `web`.
3. En **Environment Variables**, agrega:
   - `VITE_API_URL` = `https://gastabien-api.onrender.com/api` (la URL de tu backend en Render)
4. Presiona **Deploy**. El archivo [vercel.json](file:///C:/Users/Johan/.gemini/antigravity/scratch/gastabien-app/web/vercel.json) ya configurado se encarga del enrutamiento SPA.

#### Opción Netlify:
1. Arrastra la carpeta `web/dist` (generada con `npm run build`) en [Netlify Drop](https://app.netlify.com/drop).
2. ¡Tu app estará viva en internet inmediatamente!

---

## 📱 Cómo Abrir y Ejecutar en Android Studio

1. Abre **Android Studio**.
2. Selecciona **File -> Open...** y navega a la carpeta:
   `C:\Users\Johan\.gemini\antigravity\scratch\gastabien-app\android`
3. Espera que Gradle sincronice las dependencias del [libs.versions.toml](file:///C:/Users/Johan/.gemini/antigravity/scratch/gastabien-app/android/gradle/libs.versions.toml).
4. *(Opcional)* En [RetrofitClient.kt](file:///C:/Users/Johan/.gemini/antigravity/scratch/gastabien-app/android/app/src/main/java/com/gastabien/app/data/api/RetrofitClient.kt), para conectarte a tu backend desplegado en vivo, coloca tu URL de Render:
   ```kotlin
   private var baseUrl: String = "https://gastabien-api.onrender.com/"
   ```
   *(Si pruebas en el emulador local, déjalo en `http://10.0.2.2:4000/`)*.
5. Selecciona tu emulador o conecta tu teléfono Android por USB y pulsa **Run (▶)**.

---

## ⚡ Ejecución Local

### Backend:
```bash
cd backend
npm install
npm run build
npm start
# Servidor escuchando en http://localhost:4000
```

### Web:
```bash
cd web
npm install
npm run dev
# Dashboard disponible en http://localhost:5173
```
