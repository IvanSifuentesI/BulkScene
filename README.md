# 🎬 BulkScene Studio • AI Video Production Suite

Plataforma SaaS para producción industrial de video vertical (TikTok, Shorts, Reels) con aceleración distribuida en GPUs NVIDIA Tensor Core, Whisper Ultra-LPU, consistencia de personajes, escalado 4K UHD y empaquetado cronológico para CapCut, Premiere y DaVinci Resolve.

---

## ⚡ Características Principales

- **Director de Guion con IA:** Generación y reformulación de guiones a partir de un Master Prompt con duración estimada en minutos.
- **Audio & Whisper Turbo:** Transcripción y corte de silencios impulsado por Groq LPU a 200x velocidad real.
- **Desglose de Escenas:** Segmentación cronológica estricta con consistencia de fisonomía y anclajes biométricos.
- **Generador Masivo (7 Modelos NVIDIA NIM):**
  - FLUX.1 Schnell
  - FLUX.1 Dev
  - FLUX.2 Klein 4B
  - FLUX.1 Kontext Dev
  - Stable Diffusion 3.5 Large
  - Qwen Image
  - Qwen Image Edit
- **Super-Resolución 4K UHD:** Motor de convolución para exportación en alta fidelidad (2160 × 3840 px).
- **Descarga en ZIP Ordenado:** Nomenclatura estricta `#001_escena.png` a `#1000_escena.png` para arrastre directo a línea de tiempo.
- **Sincronización de Precios Skool:** Control dinámico de precios en tiempo real sin redesplegar.
- **Telemetría de Errores Universal:** Diagnóstico automático de censura (422), claves (401), cuotas (429) con alertas por Webhook y botón de 1-clic para soporte.

---

## 🚀 Despliegue en Vercel (1 Clic)

1. Conecta este repositorio en tu panel de [Vercel](https://vercel.com).
2. Configuración predeterminada:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. ¡Listo! El archivo `vercel.json` incluido gestiona automáticamente las rutas SPA y los proxies para evitar bloqueos por CORS.

---

## 💻 Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor local:
   ```bash
   npm run dev
   ```
   O simplemente haz doble clic en `INICIAR_APP.bat`.
3. Abre [http://localhost:5173](http://localhost:5173) en tu navegador.
