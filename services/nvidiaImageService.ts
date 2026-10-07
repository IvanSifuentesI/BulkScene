/**
 * Servicio para generación de imágenes de ultra-alta fidelidad utilizando
 * los clusters de aceleración de NVIDIA (FLUX, Stable Diffusion 3.5, Qwen Image).
 * Soporta rotación de múltiples claves API de NVIDIA para evitar límites de cuota (429).
 */

export const AVAILABLE_NVIDIA_IMAGE_MODELS = [
  {
    id: 'flux-1-schnell',
    name: 'FLUX.1 Schnell',
    provider: 'Black Forest Labs / NVIDIA',
    badge: '⚡ Ultra Veloz (4 Pasos)',
    speed: '~1.8s - 3s',
    description: '12B parámetros destilado para máxima velocidad y nitidez en resolución nativa.',
    endpointModel: 'black-forest-labs/flux.1-schnell',
    defaultSteps: 4
  },
  {
    id: 'flux-1-dev',
    name: 'FLUX.1 Dev',
    provider: 'Black Forest Labs / NVIDIA',
    badge: '🎬 Cine 8K / Máximo Detalle',
    speed: '~8s - 15s',
    description: 'Fidelidad anatómica suprema, texturas de piel ultra-reales e iluminación volumétrica.',
    endpointModel: 'black-forest-labs/flux.1-dev',
    defaultSteps: 4
  },
  {
    id: 'flux-2-klein',
    name: 'FLUX.2 Klein 4B',
    provider: 'Black Forest Labs / NVIDIA',
    badge: '🚀 Hyper-Turbo 4B',
    speed: '~1.2s - 2s',
    description: 'Arquitectura ligera de 4B diseñada para renderizado continuo y lotes masivos.',
    endpointModel: 'black-forest-labs/flux.2-klein-4b',
    defaultSteps: 4
  },
  {
    id: 'flux-1-kontext-dev',
    name: 'FLUX.1 Kontext Dev',
    provider: 'Black Forest Labs / NVIDIA',
    badge: '🧠 Coherencia Contextual',
    speed: '~10s - 18s',
    description: 'Especializado en mantener contexto narrativo continuo entre planos consecutivos.',
    endpointModel: 'black-forest-labs/flux_1-kontext-dev',
    defaultSteps: 20
  },
  {
    id: 'sd-3-5-large',
    name: 'Stable Diffusion 3.5 Large',
    provider: 'Stability AI / NVIDIA',
    badge: '🎨 Gran Variedad Artística',
    speed: '~4s - 8s',
    description: 'Modelo de difusión insignia de 8B con excelente renderizado de tipografías y composición compleja.',
    endpointModel: 'stabilityai/stable-diffusion-3_5-large',
    defaultSteps: 28
  },
  {
    id: 'qwen-image',
    name: 'Qwen Image',
    provider: 'Qwen / Alibaba / NVIDIA',
    badge: '✨ Fotorrealismo y Rostros',
    speed: '~5s - 9s',
    description: 'Excelente captura de microexpresiones faciales y anatomía consistente.',
    endpointModel: 'qwen/qwen-image',
    defaultSteps: 25
  },
  {
    id: 'qwen-image-edit',
    name: 'Qwen Image Edit',
    provider: 'Qwen / Alibaba / NVIDIA',
    badge: '✏️ Edición y Variación',
    speed: '~6s - 10s',
    description: 'Especializado en retoque, alteración de fondos y variaciones guiadas.',
    endpointModel: 'qwen/qwen-image-edit',
    defaultSteps: 25
  }
];

const ENDPOINTS: Record<string, string> = {
  'flux-1-schnell': 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell',
  'flux-1-dev': 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev',
  'flux-2-klein': 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b',
  'flux-1-kontext-dev': 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux_1-kontext-dev',
  'sd-3-5-large': 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3_5-large',
  'qwen-image': 'https://ai.api.nvidia.com/v1/genai/qwen/qwen-image',
  'qwen-image-edit': 'https://ai.api.nvidia.com/v1/genai/qwen/qwen-image-edit',
};

const PROXY_ENDPOINTS: Record<string, string> = {
  'flux-1-schnell': '/api/nvidia-genai/v1/genai/black-forest-labs/flux.1-schnell',
  'flux-1-dev': '/api/nvidia-genai/v1/genai/black-forest-labs/flux.1-dev',
  'flux-2-klein': '/api/nvidia-genai/v1/genai/black-forest-labs/flux.2-klein-4b',
  'flux-1-kontext-dev': '/api/nvidia-genai/v1/genai/black-forest-labs/flux_1-kontext-dev',
  'sd-3-5-large': '/api/nvidia-genai/v1/genai/stabilityai/stable-diffusion-3_5-large',
  'qwen-image': '/api/nvidia-genai/v1/genai/qwen/qwen-image',
  'qwen-image-edit': '/api/nvidia-genai/v1/genai/qwen/qwen-image-edit',
};

// Claves configurables desde la interfaz de Ajustes
export const DEFAULT_NVIDIA_API_KEYS: string[] = [];
export const DEFAULT_NVIDIA_API_KEY = '';

export interface NvidiaImageResponse {
  dataUrl: string;
  elapsedSeconds: number;
  seed?: number;
  modelUsed: string;
}

import { isSubscriptionActive, triggerSubscriptionModal } from './subscriptionService';

export async function generateNvidiaImage(
  apiKeys: string | string[],
  prompt: string,
  model: string = 'flux-1-schnell',
  seed?: number,
  signal?: AbortSignal
): Promise<NvidiaImageResponse> {
  // Validación de seguridad de backend/servicio: rechazar llamadas no autorizadas
  if (!isSubscriptionActive()) {
    triggerSubscriptionModal({ featureName: 'Generación de Imágenes con NVIDIA NIM' });
    throw new Error('Suscripción no activa. Necesitas tener una suscripción activa dentro de la Academia de Skool para utilizar esta función.');
  }

  const keysPool = Array.isArray(apiKeys)
    ? apiKeys.map(k => k.trim()).filter(Boolean)
    : [apiKeys.trim()].filter(Boolean);

  if (keysPool.length === 0) {
    keysPool.push(...DEFAULT_NVIDIA_API_KEYS);
  }

  if (keysPool.length === 0) {
    throw new Error('No se ha configurado ninguna Clave API de NVIDIA. Por favor ingresa tu API Key (nvapi-...) para continuar.');
  }

  // Blindaje anti-422: NVIDIA FLUX rechaza prompts de más de 800 caracteres
  let safePrompt = prompt.trim();
  if (safePrompt.length > 700) {
    safePrompt = safePrompt.slice(0, 680).trim();
  }

  const modelMeta = AVAILABLE_NVIDIA_IMAGE_MODELS.find(m => m.id === model);
  const steps = modelMeta?.defaultSteps || (model.includes('schnell') || model.includes('klein') ? 4 : 20);

  const payload: Record<string, any> = {
    prompt: safePrompt,
    steps,
  };
  if (seed && seed > 0) {
    payload.seed = seed;
  }

  // Endpoints: proxy local de Vite y fallback directo
  const targetEndpoints = [
    PROXY_ENDPOINTS[model] || `/api/nvidia-genai/v1/genai/${modelMeta?.endpointModel || model}`,
    ENDPOINTS[model] || `https://ai.api.nvidia.com/v1/genai/${modelMeta?.endpointModel || model}`
  ];

  let lastError: any = null;
  const startTime = Date.now();

  // Rotamos entre las claves API disponibles si alguna devuelve 429
  for (const apiKey of keysPool) {
    // Intento 1: Serverless proxy /api/nvidia (Vercel)
    try {
      if (signal?.aborted) {
        throw new Error('Generación cancelada por el usuario.');
      }

      const proxyRes = await fetch('/api/nvidia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          modelEndpoint: modelMeta?.endpointModel || model,
          apiKey,
          payload,
        }),
        signal,
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        const artifact = data.artifacts?.[0];
        const base64Data = artifact?.base64 || data.image || data.data?.[0]?.b64_json;
        if (base64Data) {
          const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
          return {
            dataUrl: `data:image/png;base64,${base64Data}`,
            elapsedSeconds,
            seed: artifact?.seed || seed,
            modelUsed: modelMeta?.name || model,
          };
        }
      } else if (proxyRes.status === 429) {
        console.warn(`Límite 429 en clave NVIDIA (${apiKey.slice(0, 10)}...), rotando clave...`);
        lastError = new Error('Límite de tasa 429 en cluster NVIDIA.');
        continue;
      } else if (proxyRes.status !== 404) {
        const errJson = await proxyRes.json().catch(() => null);
        console.warn('Respuesta no-ok de proxy /api/nvidia:', errJson);
      }
    } catch (proxyErr: any) {
      if (signal?.aborted) throw proxyErr;
      console.warn('Proxy /api/nvidia no respondió, intentando endpoints estándar:', proxyErr.message);
    }
    for (const endpoint of targetEndpoints) {
      try {
        if (signal?.aborted) {
          throw new Error('Generación cancelada por el usuario.');
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal,
        });

        const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

        if (response.status === 429) {
          console.warn(`Límite 429 en clave NVIDIA (${apiKey.slice(0, 10)}...), rotando clave...`);
          lastError = new Error('Límite de tasa 429 en cluster NVIDIA.');
          break; // Salta a la siguiente clave
        }

        if (response.status === 422) {
          const errText = await response.text();
          throw new Error(`Filtro o longitud en NVIDIA (422): ${errText.slice(0, 150)}`);
        }

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 404 && endpoint.startsWith('/api')) {
            continue; // Prueba con endpoint directo
          }
          throw new Error(`Error en cluster NVIDIA (${response.status}): ${errText.slice(0, 150)}`);
        }

        const data = await response.json();
        const artifact = data.artifacts?.[0];

        if (artifact?.finishReason === 'CONTENT_FILTERED') {
          throw new Error('El prompt activó el filtro de seguridad automático de NVIDIA.');
        }

        const base64Data = artifact?.base64;
        if (!base64Data) {
          // Intentar obtener de image o b64_json si es otro modelo
          const altImage = data.image || data.data?.[0]?.b64_json;
          if (altImage) {
            return {
              dataUrl: `data:image/png;base64,${altImage}`,
              elapsedSeconds,
              seed: seed || Math.floor(Math.random() * 900000),
              modelUsed: modelMeta?.name || model,
            };
          }
          throw new Error(`Respuesta vacía del cluster NVIDIA para el modelo ${model}.`);
        }

        return {
          dataUrl: `data:image/png;base64,${base64Data}`,
          elapsedSeconds,
          seed: artifact?.seed || seed,
          modelUsed: modelMeta?.name || model,
        };
      } catch (err: any) {
        lastError = err;
        if (signal?.aborted) throw err;
        console.warn(`Intento con ${endpoint} falló:`, err.message);
      }
    }
  }

  throw lastError || new Error(`No se pudo conectar con el modelo ${model} en NVIDIA.`);
}
