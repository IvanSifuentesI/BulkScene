/**
 * Servicio de Dirección Cinematográfica con sistema de motores neuronales escalonados:
 *
 * TIER 1 — ANÁLISIS PROFUNDO (gemini-3.8-flash):
 *   Tareas: analizar guion completo, detectar personajes, extraer contexto temporal/cultural,
 *           determinar estilo visual, detectar cinematografía ideal.
 *   Justificación: alto razonamiento, pocas llamadas (5 rpm, 250K tpm, 20 rpd).
 *
 * TIER 2 — GENERACIÓN MASIVA (gemini-3.5-flash-lite):
 *   Tareas: generar prompt visual de cada escena (puede ser un video de 1 hora → cientos de prompts).
 *   Justificación: velocidad + economía (15 rpm, 250K tpm, 500 rpd).
 *
 * ROTACIÓN DE CLAVES GEMINI:
 *   Cuando una clave Gemini recibe 429 (quota agotada), rota automáticamente
 *   a la siguiente clave del pool. Cuando todo el pool se agota, reintenta
 *   desde la primera (round-robin). Si ninguna funciona → fallback NVIDIA → Groq.
 */
import { StylePreset, CulturalTemporalContext, ScriptDirectorCharacter } from '../types';
export type { ScriptDirectorCharacter };
import { isSubscriptionActive, triggerSubscriptionModal } from './subscriptionService';

export const DEFAULT_GROQ_API_KEY = '';
export const DEFAULT_NVIDIA_NIM_API_KEY = '';

// ─── MODELOS GEMINI ────────────────────────────────────────────────────────────
/** Motor de análisis profundo: guion completo, personajes, época, estilo, cinematografía */
export const GEMINI_ANALYSIS_MODEL = 'gemini-3.8-flash';
/** Motor de generación masiva: un prompt por escena, alta velocidad y volumen */
export const GEMINI_LITE_MODEL = 'gemini-3.5-flash-lite';


// ─── ROTACIÓN DE CLAVES GEMINI ─────────────────────────────────────────────────
/** Índice actual de la clave Gemini activa en el pool (module-level, persiste entre llamadas) */
let _geminiKeyIndex = 0;

/**
 * Obtiene todas las claves Gemini disponibles en localStorage.
 * Combina la clave única (bulk_gemini_api_key) y el array de claves (bulk_gemini_api_keys).
 */
export function getAllGeminiKeys(): string[] {
  const keys: string[] = [];

  // Clave única (legacy)
  const single = (localStorage.getItem('bulk_gemini_api_key') || '').trim();
  if (single) keys.push(single);

  // Array de claves (nueva forma)
  const raw = localStorage.getItem('bulk_gemini_api_keys') || '';
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((k: string) => {
          const trimmed = String(k || '').trim();
          if (trimmed && !keys.includes(trimmed)) keys.push(trimmed);
        });
      } else if (raw.trim()) {
        if (!keys.includes(raw.trim())) keys.push(raw.trim());
      }
    } catch {
      if (raw.trim() && !keys.includes(raw.trim())) keys.push(raw.trim());
    }
  }

  return keys;
}

/**
 * Llama a Gemini con rotación automática de claves.
 * - Intenta cada clave del pool en orden circular.
 * - Si recibe 429 / quota exceeded → rota a la siguiente.
 * - Si ninguna funciona → lanza Error para que el llamador haga fallback a NVIDIA/Groq.
 */
export async function callGeminiWithRotation(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  extraKeys?: string[]; // claves adicionales pasadas por prop
  signal?: AbortSignal;
}): Promise<string> {
  const { model, systemPrompt, userPrompt, extraKeys = [], signal } = params;

  // Pool unificado: propiedades pasadas + localStorage
  const poolFromStorage = getAllGeminiKeys();
  const pool = [...new Set([...extraKeys.filter(k => k?.trim()), ...poolFromStorage])];

  if (pool.length === 0) {
    throw new Error('[Gemini] Sin claves API configuradas. Ve a Configuración → Gemini.');
  }

  const startIndex = _geminiKeyIndex % pool.length;
  let lastError: Error = new Error('No se pudo conectar con Gemini');

  // Intenta cada clave comenzando desde la activa actual
  for (let attempt = 0; attempt < pool.length; attempt++) {
    const keyIndex = (startIndex + attempt) % pool.length;
    const apiKey = pool[keyIndex];

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 8192
          }
        }),
        signal
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          _geminiKeyIndex = keyIndex; // Mantener en la clave que funcionó
          console.log(`[Gemini] ✓ Clave #${keyIndex + 1}/${pool.length} OK con ${model}`);
          return text;
        }
      }

      // 429 = Rate limit / quota agotada → rotar
      if (res.status === 429 || res.status === 503) {
        console.warn(`[Gemini] Clave #${keyIndex + 1} agotada (${res.status}) → rotando...`);
        _geminiKeyIndex = (keyIndex + 1) % pool.length;
        lastError = new Error(`Gemini clave #${keyIndex + 1} quota agotada`);
        continue;
      }

      // Otro error (401, 400, etc.) — no reintenta con otra clave
      const errBody = await res.text().catch(() => '');
      console.warn(`[Gemini] Error ${res.status} con clave #${keyIndex + 1}:`, errBody);
      lastError = new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 120)}`);

      // 401 = clave inválida → intentar con la siguiente
      if (res.status === 401 || res.status === 403) {
        _geminiKeyIndex = (keyIndex + 1) % pool.length;
        continue;
      }

      // Otros errores → lanzar directamente
      throw lastError;

    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      // Si es un error de red (Failed to fetch), rotar al siguiente
      if (lastError.message.includes('fetch') || lastError.message.includes('network')) {
        console.warn(`[Gemini] Error de red con clave #${keyIndex + 1}, rotando...`);
        _geminiKeyIndex = (keyIndex + 1) % pool.length;
        continue;
      }
      // Si ya fue re-lanzado como error HTTP, propagarlo
      if (lastError.message.includes('Gemini HTTP')) throw lastError;
      continue;
    }
  }

  // Todas las claves del pool fallaron
  console.warn('[Gemini] Todo el pool de claves agotado. Activando fallback a NVIDIA/Groq...');
  throw lastError;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

export interface ScriptSceneResult {
  sceneNumber: number;
  scriptSegment: string;
  visualPrompt: string;
  cameraAngle?: string;
  lighting?: string;
  charactersPresent?: string[];
  durationSeconds?: number;
}

export interface DirectorAnalysisResponse {
  storyBible?: {
    summary: string;
    genreAndTone: string;
    culturalContext: string;
  };
  characters?: Array<{
    name: string;
    role: string;
    alive: boolean;
    description: string;
  }>;
  scenes: ScriptSceneResult[];
}

// Limpiador robusto para extraer keys de strings simples, arrays o JSON strings de localStorage
export function extractCleanKey(keyOrArray?: string | string[]): string {
  if (Array.isArray(keyOrArray) && keyOrArray.length > 0) {
    return String(keyOrArray[0] || '').trim();
  }
  if (typeof keyOrArray === 'string') {
    const trimmed = keyOrArray.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return String(parsed[0] || '').trim();
        }
      } catch {}
    }
    return trimmed;
  }
  return '';
}

// Limpiador robusto para DeepSeek R1 y markdown
function extractCleanJson(raw: string): any {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (text.startsWith('```json')) text = text.substring(7);
  else if (text.startsWith('```')) text = text.substring(3);
  if (text.endsWith('```')) text = text.substring(0, text.length - 3);
  text = text.trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

/**
 * Limita el guion según el modelo para no exceder el contexto.
 * Gemini: guion completo. NVIDIA: 40K chars. Groq: 20K chars.
 */
function smartScriptSlice(scriptText: string, model?: string): string {
  const lower = (model || '').toLowerCase();
  if (lower.startsWith('gemini-')) return scriptText;
  if (lower.startsWith('nvidia-') || lower.includes('meta/') || lower.includes('deepseek-') || lower.includes('qwen')) {
    return scriptText.slice(0, 40000);
  }
  return scriptText.slice(0, 20000);
}



export interface AnalyzeScriptParams {
  scriptText: string;
  model?: string;
  groqKey?: string;
  nvidiaNimKey?: string;
  geminiKey?: string;
  targetStyleName?: string;
  targetStyleModifier?: string;
  characterAnchor?: string;
  narrativeMode?: 'documental_secuencial' | 'motivacional_conceptual' | 'storytelling_cinematico' | 'educativo_viral';
  culturalContext?: { epoch?: string; culture?: string; environment?: string };
  characterConsistencyMode?: 'deteccion_rapida' | 'referencia_imagen' | 'nombre_en_prompt' | 'detectar_muertes_salidas';
  pacingWords?: number;
  hookMinSeconds?: number;
  hookMaxSeconds?: number;
  precalculatedScenes?: Array<{ sceneNumber: number; text: string; duration: number }>;
  onProgress?: (progressText: string, currentStep: number, totalSteps: number) => void;
  signal?: AbortSignal;
}

/**
 * Invoca el LLM con cascada automática multi-proveedor:
 * Prioridad: 1) Modelo elegido -> 2) Google Gemini 2.0 -> 3) NVIDIA NIM 70B -> 4) Groq Llama 3.3.
 */
async function callLLMDirectorRaw(params: {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { systemPrompt, userPrompt, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  const allGeminiKeys = getAllGeminiKeys();
  const cleanGeminiKey = extractCleanKey(geminiKey) || (allGeminiKeys[0] || '');
  const cleanNvidiaKey = extractCleanKey(nvidiaNimKey) || extractCleanKey(localStorage.getItem('bulk_nvidia_api_keys') || '') || DEFAULT_NVIDIA_NIM_API_KEY;
  const cleanGroqKey = extractCleanKey(groqKey) || extractCleanKey(localStorage.getItem('bulk_groq_api_keys') || '') || DEFAULT_GROQ_API_KEY;
  const hasGemini = allGeminiKeys.length > 0 || Boolean(cleanGeminiKey);

  // Lista ordenada de intentos
  const attempts: Array<{
    name: string;
    provider: 'gemini' | 'nvidia' | 'groq';
    modelId: string;
    key: string;
  }> = [];

  // Intento 1: El modelo seleccionado explícitamente
  if (model.startsWith('gemini-') && hasGemini) {
    attempts.push({ name: `Gemini (${model})`, provider: 'gemini', modelId: model, key: cleanGeminiKey });
  } else if ((model.startsWith('nvidia-') || model.startsWith('meta/') || model.startsWith('deepseek-')) && cleanNvidiaKey) {
    attempts.push({ name: `NVIDIA (${model})`, provider: 'nvidia', modelId: model, key: cleanNvidiaKey });
  } else if (model.startsWith('groq-') && cleanGroqKey) {
    attempts.push({ name: `Groq (${model})`, provider: 'groq', modelId: model, key: cleanGroqKey });
  }

  // Fallbacks de seguridad con prioridad definida: Gemini (GEMINI_LITE_MODEL) -> NVIDIA 70B -> Groq 70B
  if (hasGemini && !attempts.some(a => a.provider === 'gemini')) {
    attempts.push({ name: `Gemini ${GEMINI_LITE_MODEL} (Fallback)`, provider: 'gemini', modelId: GEMINI_LITE_MODEL, key: cleanGeminiKey });
  }
  if (cleanNvidiaKey && !attempts.some(a => a.provider === 'nvidia')) {
    attempts.push({ name: 'NVIDIA Llama 3.3 70B (Fallback)', provider: 'nvidia', modelId: 'nvidia-llama-70b', key: cleanNvidiaKey });
  }
  if (cleanGroqKey && !attempts.some(a => a.provider === 'groq')) {
    attempts.push({ name: 'Groq Llama 3.3 70B (Fallback)', provider: 'groq', modelId: 'groq-llama-70b', key: cleanGroqKey });
  }

  if (attempts.length === 0) {
    throw new Error('No se detectaron API Keys configuradas para Gemini, NVIDIA NIM ni Groq. Por favor ingresa al menos una API Key en Configuración.');
  }

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      if (attempt.provider === 'gemini') {
        const raw = await callGeminiWithRotation({
          model: attempt.modelId,
          systemPrompt,
          userPrompt,
          extraKeys: geminiKey ? [geminiKey] : [],
          signal
        });
        if (!raw) throw new Error('Gemini devolvió respuesta vacía.');
        return raw;
      }

      if (attempt.provider === 'nvidia') {
        const nvidiaModelMapping: Record<string, string> = {
          'nvidia-llama-70b': 'meta/llama-3.3-70b-instruct',
          'nvidia-deepseek-r1': 'deepseek-ai/deepseek-r1',
          'nvidia-deepseek-r1-32b': 'deepseek-ai/deepseek-r1',
          'nvidia-mistral-nemo': 'mistralai/mistral-nemo-12b-instruct',
          'nvidia-qwen-72b': 'qwen/qwen2.5-72b-instruct',
          'nvidia-nemotron-70b': 'nvidia/llama-3.1-nemotron-70b-instruct'
        };
        const payloadModel = nvidiaModelMapping[attempt.modelId] || 'meta/llama-3.3-70b-instruct';
        const endpoints = [
          '/api/nvidia-nim/v1/chat/completions',
          'https://integrate.api.nvidia.com/v1/chat/completions'
        ];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${attempt.key}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: payloadModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.4,
                max_tokens: 4096
              }),
              signal
            });

            if (!res.ok) {
              if (res.status === 404 && ep.startsWith('/api')) continue;
              const errText = await res.text();
              throw new Error(`NVIDIA HTTP ${res.status}: ${errText.slice(0, 150)}`);
            }

            const data = await res.json();
            const raw = data.choices?.[0]?.message?.content;
            if (!raw) throw new Error('NVIDIA devolvió respuesta vacía.');
            return raw;
          } catch (e: any) {
            if (ep === endpoints[endpoints.length - 1]) throw e;
          }
        }
      }

      if (attempt.provider === 'groq') {
        const preferredModel = attempt.modelId === 'groq-mixtral-8x7b' ? 'mixtral-8x7b-32768' : 'llama-3.3-70b-versatile';
        const candidateModels = Array.from(new Set([
          preferredModel,
          'llama-3.1-8b-instant',
          'llama-3.3-70b-specdec',
          'mixtral-8x7b-32768',
          'gemma2-9b-it',
          'deepseek-r1-distill-llama-70b',
          'llama3-70b-8192',
          'llama3-8b-8192'
        ]));

        const endpoints = [
          '/api/groq/openai/v1/chat/completions',
          'https://api.groq.com/openai/v1/chat/completions'
        ];

        let lastGroqError = '';

        for (const candidateModel of candidateModels) {
          for (const ep of endpoints) {
            try {
              const res = await fetch(ep, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${attempt.key}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: candidateModel,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                  ],
                  temperature: 0.4,
                  max_tokens: 4096
                }),
                signal
              });

              if (!res.ok) {
                if (res.status === 404 && ep.startsWith('/api')) continue;
                const errText = await res.text();
                // Si el modelo específico no existe o no tiene acceso, probar el siguiente modelo candidato
                if (res.status === 404 || errText.includes('model_not_found') || errText.includes('does not exist') || errText.includes('decommissioned')) {
                  console.warn(`[GROQ] Modelo ${candidateModel} no disponible (${res.status}), probando alternativa...`);
                  lastGroqError = `Groq (${candidateModel}): ${errText.slice(0, 100)}`;
                  break; // break de endpoints para saltar al siguiente candidateModel
                }
                throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 150)}`);
              }

              const data = await res.json();
              const raw = data.choices?.[0]?.message?.content;
              if (!raw) throw new Error('Groq devolvió respuesta vacía.');
              return raw;
            } catch (e: any) {
              if (ep === endpoints[endpoints.length - 1]) {
                lastGroqError = e.message;
              }
            }
          }
        }
        if (lastGroqError) throw new Error(lastGroqError);
      }
    } catch (err: any) {
      console.warn(`[LLM DIRECTOR] Falló intento con ${attempt.name}:`, err.message);
      errors.push(`${attempt.name}: ${err.message}`);
    }
  }

  throw new Error(`Todos los motores neuronales fallaron:\n${errors.join('\n')}`);
}

export async function analyzeScriptWithLLM(params: AnalyzeScriptParams): Promise<DirectorAnalysisResponse> {
  const {
    scriptText,
    model = 'gemini-2.0-flash',
    groqKey = DEFAULT_GROQ_API_KEY,
    nvidiaNimKey = DEFAULT_NVIDIA_NIM_API_KEY,
    geminiKey = '',
    targetStyleName = 'Cinematográfico 35mm Hiperrealista',
    targetStyleModifier = 'cinematic 35mm film photography, Kodak Portra 400 color science, natural atmospheric lighting, 8k',
    characterAnchor = '',
    narrativeMode = 'documental_secuencial',
    culturalContext,
    characterConsistencyMode = 'nombre_en_prompt',
    pacingWords = 8,
    precalculatedScenes,
    onProgress,
    signal
  } = params;

  const minWords = Math.max(4, pacingWords - 3);
  const maxWords = pacingWords + 5;

  // Modos de Dirección Narrativa
  const narrativeDirectives: Record<string, string> = {
    documental_secuencial: 'MODO NARRATIVO: Documental Secuencial. Las escenas deben ser estrictamente consecutivas y conectadas por una relación de causa-efecto cronológica clara (la escena 2 nace directamente del final de la escena 1).',
    motivacional_conceptual: 'MODO NARRATIVO: Motivacional / Conceptual. Cada escena debe ser una metáfora visual épica e impactante con gran carga emocional, no necesariamente ligada cronológicamente a la anterior, ideal para discursos de alta energía y ganchos de retención.',
    storytelling_cinematico: 'MODO NARRATIVO: Storytelling Cinemático. Estructura clásica de 3 actos con gancho inicial, tensión creciente y clímax dramático.',
    educativo_viral: 'MODO NARRATIVO: Educativo / Viral Faceless. Cortes muy rápidos, encuadres dinámicos y cambios de ángulo cada 1.8 a 2.5 segundos para retención máxima en Shorts/TikTok.'
  };

  // Directriz de Contexto Cultural y Temporal
  let culturalDirective = '';
  if (culturalContext && (culturalContext.epoch || culturalContext.culture || culturalContext.environment)) {
    culturalDirective = `\nCONTEXTO TEMPORAL Y CULTURAL OBLIGATORIO:
- Época: ${culturalContext.epoch || 'No especificada (interpretar del texto)'}
- Cultura/Ambientación: ${culturalContext.culture || 'Universal'}
- Entorno Visual: ${culturalContext.environment || 'Cinematográfico'}
Todos los elementos de vestuario, arquitectura, utilería y atmósfera deben reflejar estrictamente este marco temporal y cultural en cada prompt visual.`;
  }

  // Directriz de Consistencia de Personajes
  let consistencyDirective = '';
  if (characterConsistencyMode === 'nombre_en_prompt') {
    consistencyDirective = '\nREGLA DE CONSISTENCIA: Si un personaje está presente en una escena, inyecta su nombre y rasgos físicos inmutables al inicio del prompt visual.';
  } else if (characterConsistencyMode === 'detectar_muertes_salidas') {
    consistencyDirective = '\nREGLA DE CONTINUIDAD VITAL: Si un personaje muere o abandona la historia en una escena, NO lo vuelvas a incluir en los prompts visuales de escenas posteriores.';
  }

  const baseSystemPrompt = `Eres el Director Supremo de Cine y Guiones para producciones de video viral de alta retención (YouTube Shorts, Reels, TikTok).
Tu misión es transformar el guion del usuario en una estructura narrativa cinematográfica precisa y secuencial para generar imágenes escena por escena.

${narrativeDirectives[narrativeMode] || narrativeDirectives.documental_secuencial}
${culturalDirective}
${consistencyDirective}

DIRECTRIZ DE ESTILO VISUAL ABSOLUTA:
- Estilo artístico ordenado: "${targetStyleName}".
- Modificador visual clave: "${targetStyleModifier}".
- REGLA DE ORO DE ESTILO: Cada uno de los prompts para cada escena DEBE estar escrito y concebido desde su primera palabra en el estilo visual seleccionado ("${targetStyleName}").
- CERO PLANTILLAS GENÉRICAS: Está estrictamente prohibido usar fórmulas repetidas o clichés ("photorealistic 8k highly detailed"). Cada toma debe describir una pintura cinematográfica viva, específica e impactante.
- REGLAS DE COHERENCIA OBLIGATORIA POR ESCENA:
  1. PERSONAJES: Si la escena involucra personajes, describe su fisonomía exacta y su vestimenta específica definida para el proyecto.
  2. CONTEXTO TEMPORAL/CULTURAL: La arquitectura, utilería, vehículos y entorno deben pertenecer de manera verosímil a la época.
  3. MODO DE DIRECCIÓN Y CONTINUIDAD: Respeta la composición de cámara (establecimiento general, plano medio, primer plano, plano detalle dinámico) y la causa-efecto secuencial (la escena N fluye orgánicamente desde la escena N-1).
  4. ACCIÓN VIVA DEL GUION: Visualiza el verbo y la acción de la frase específica.
- LONGITUD POR PROMPT: Cada visualPrompt debe tener entre 250 y 650 caracteres en inglés. Rico en detalles visuales, lentes, iluminación y acción.
- ANTI-CENSURA / CONTENIDO SEGURO: Evita terminología explícita de sangre ("blood"), muerte sangrienta ("slaughter/kill"); sustitúyelo por lenguaje dramático visual ("fallen silhouette", "engulfed by storm", "shadowy defeat") para que NVIDIA jamás active filtros de moderación.

PROTOCOLO DE ACCIÓN DINÁMICA (CRÍTICO):
- VISUALIZA EL VERBO: Si el texto dice correr, nadar o gritar, el sujeto debe estar en movimiento activo enérgico, jamás en una pose estática mirando a cámara.
${characterAnchor ? `- PERSONAJE PROTAGÓNICO FIJADO: "${characterAnchor}". Mantén sus rasgos constantes.` : ''}`;

  // Determinamos si el guion es extenso (> 18 escenas calculadas o > 200 palabras) para procesarlo por lotes
  const cleanText = scriptText.trim().replace(/\r\n/g, '\n');
  const sentences = cleanText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);

  // Segmentación base en oraciones / frases
  const textSegments: string[] = [];
  if (precalculatedScenes && precalculatedScenes.length > 0) {
    precalculatedScenes.forEach(s => textSegments.push(s.text));
  } else {
    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length <= maxWords) {
        textSegments.push(sentence.trim());
      } else {
        for (let i = 0; i < words.length; i += pacingWords) {
          const chunk = words.slice(i, i + pacingWords).join(' ');
          if (chunk.trim()) textSegments.push(chunk.trim());
        }
      }
    });
  }

  const isLongScript = textSegments.length > 16;

  // CASO 1: Guion corto a moderado (<= 16 escenas) -> Procesamiento en 1 pasada completa
  if (!isLongScript) {
    if (onProgress) onProgress('Generando desglose cinematográfico con IA...', 1, 1);

    const promptUser = `${baseSystemPrompt}

SEGMENTACIÓN Y CERO PÉRDIDA DE DATOS:
- Cada escena debe contener aproximadamente entre ${minWords} y ${maxWords} palabras del guion.
- La unión de todos los campos "scriptSegment" DEBE reconstruir la totalidad del guion original sin omitir palabras.

FORMATO DE RESPUESTA OBLIGATORIO:
Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "storyBible": {
    "summary": "Resumen conciso",
    "genreAndTone": "Tono cinematográfico",
    "culturalContext": "Contexto general"
  },
  "characters": [
    {
      "name": "Nombre",
      "role": "PROTAGONIST",
      "alive": true,
      "description": "Rasgos visuales concisos"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "scriptSegment": "Frase exacta del guion",
      "visualPrompt": "Prompt en inglés <= 350 chars con ${targetStyleName} y acción dinámica",
      "cameraAngle": "Extreme Close-Up | Dutch Angle | Wide Cinematic",
      "lighting": "Volumetric golden hour | Neon contrast",
      "charactersPresent": ["Protagonista"]
    }
  ]
}

Analiza y segmenta cinematográficamente este guion:
${scriptText}`;

    const rawResponse = await callLLMDirectorRaw({
      systemPrompt: 'Eres un director de cine experto en estructuración de guiones audiovisuales virales y prompts para IA.',
      userPrompt: promptUser,
      model,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsed = extractCleanJson(rawResponse);
    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error('La IA respondió pero no incluyó la lista de escenas en el JSON.');
    }

    return parsed as DirectorAnalysisResponse;
  }

  // CASO 2: Guion largo (1h - 2h, 20 a 300+ escenas) -> Procesamiento por lotes secuenciales de 10-12 escenas
  // Esto previene que se corte el JSON por límite de tokens de salida.
  const BATCH_SIZE = 12;
  const totalBatches = Math.ceil(textSegments.length / BATCH_SIZE);
  const allScenes: ScriptSceneResult[] = [];
  let globalStoryBible = {
    summary: scriptText.slice(0, 200) + '...',
    genreAndTone: targetStyleName,
    culturalContext: culturalContext?.epoch || 'Cinematográfica'
  };
  let globalCharacters: any[] = [];

  for (let b = 0; b < totalBatches; b++) {
    const startIdx = b * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, textSegments.length);
    const batchSegments = textSegments.slice(startIdx, endIdx);
    const sceneStartNum = startIdx + 1;
    const sceneEndNum = endIdx;

    if (onProgress) {
      onProgress(
        `Generando lote ${b + 1} de ${totalBatches} (Escenas ${sceneStartNum} a ${sceneEndNum}) con IA...`,
        b + 1,
        totalBatches
      );
    }

    const previousContext = allScenes.length > 0
      ? `CONTINUIDAD: La última escena generada (#${allScenes.length}) fue: "${allScenes[allScenes.length - 1].visualPrompt}". Mantén la coherencia visual con esta escena.`
      : '';

    const batchPrompt = `${baseSystemPrompt}

${previousContext}

INSTRUCCIÓN ESPECÍFICA PARA ESTE LOTE DE ESCENAS:
Debes procesar exactamente las siguientes ${batchSegments.length} frases numeradas del guion (desde la escena #${sceneStartNum} hasta la #${sceneEndNum}):
${batchSegments.map((seg, i) => `[Escena ${sceneStartNum + i}]: "${seg}"`).join('\n')}

FORMATO DE RESPUESTA OBLIGATORIO:
Responde ÚNICAMENTE con un JSON válido con este formato:
{
  "scenes": [
    {
      "sceneNumber": ${sceneStartNum},
      "scriptSegment": "Frase exacta del guion",
      "visualPrompt": "Prompt en inglés <= 350 chars con ${targetStyleName} y acción dinámica",
      "cameraAngle": "Extreme Close-Up | Dutch Angle | Wide Cinematic",
      "lighting": "Volumetric golden hour | Neon contrast",
      "charactersPresent": ["Protagonista"]
    }
  ]
}`;

    const rawBatch = await callLLMDirectorRaw({
      systemPrompt: 'Eres un director de cine experto en estructuración de guiones por lotes y prompts de IA.',
      userPrompt: batchPrompt,
      model,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsedBatch = extractCleanJson(rawBatch);
    const batchScenes = parsedBatch.scenes || [];

    if (Array.isArray(batchScenes) && batchScenes.length > 0) {
      batchScenes.forEach((sc: any, idx: number) => {
        allScenes.push({
          sceneNumber: sceneStartNum + idx,
          scriptSegment: sc.scriptSegment || batchSegments[idx] || '',
          visualPrompt: sc.visualPrompt || `Cinematic ${targetStyleName} capturing ${batchSegments[idx]}`,
          cameraAngle: sc.cameraAngle || 'Medium cinematic shot',
          lighting: sc.lighting || 'Volumetric cinematic lighting',
          charactersPresent: sc.charactersPresent || (characterAnchor ? ['Protagonista'] : [])
        });
      });
    } else {
      // Si un lote específico falló en la estructura del JSON, autocompletar ese lote manteniendo el orden
      batchSegments.forEach((seg, idx) => {
        allScenes.push({
          sceneNumber: sceneStartNum + idx,
          scriptSegment: seg,
          visualPrompt: `Cinematic ${targetStyleName}, ${characterAnchor ? `${characterAnchor}, ` : ''}capturing "${seg.slice(0, 100)}", ${targetStyleModifier}`,
          cameraAngle: 'Dynamic cinematic framing',
          lighting: 'Cinematic lighting',
          charactersPresent: characterAnchor ? ['Protagonista'] : []
        });
      });
    }
  }

  return {
    storyBible: globalStoryBible,
    characters: globalCharacters,
    scenes: allScenes
  };
}

/**
 * Motor de Desglose de Emergencia Local:
 * Si la API de LLM no responde (Failed to fetch, error de cuota o sin conexión),
 * este motor analiza las oraciones del guion de forma algorítmica y genera los prompts
 * cinemáticos en inglés respetando el estilo y personaje sin bloquear al usuario.
 */
export function createLocalFallbackScenes(params: {
  scriptText: string;
  targetStyleName?: string;
  targetStyleModifier?: string;
  characterAnchor?: string;
  pacingWords?: number;
}): DirectorAnalysisResponse {
  const {
    scriptText,
    targetStyleName = 'Cinematográfico 35mm Hiperrealista',
    targetStyleModifier = 'cinematic 35mm film still, photorealistic, 8k',
    characterAnchor = '',
    pacingWords = 8
  } = params;

  const cleanText = scriptText.trim().replace(/\r\n/g, '\n');
  const sentences = cleanText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);

  const rawChunks: string[] = [];

  sentences.forEach((sentence) => {
    const words = sentence.trim().split(/\s+/);
    if (words.length <= pacingWords + 3) {
      rawChunks.push(sentence.trim());
    } else {
      for (let i = 0; i < words.length; i += pacingWords) {
        const chunk = words.slice(i, i + pacingWords).join(' ');
        if (chunk.trim()) rawChunks.push(chunk.trim());
      }
    }
  });

  const angles = [
    'Cinematic wide angle establishing shot',
    'Intense medium close-up, dramatic subject focus',
    'Low angle heroic perspective, majestic depth',
    'Dynamic action tracking shot, cinematic blur on motion',
    'Dutch angle, high psychological tension and mystery',
    'Extreme close-up macro detail, sharp cinematic lighting'
  ];

  const lightings = [
    'volumetric god rays, atmospheric cinematic haze',
    'dramatic high-contrast chiaroscuro shadows',
    'golden hour warm twilight glow',
    'cyberpunk neon rim light and reflection',
    'natural soft diffuse daylight, 8k resolution'
  ];

  const scenes: ScriptSceneResult[] = rawChunks.map((segment, idx) => {
    const angle = angles[idx % angles.length];
    const lighting = lightings[idx % lightings.length];
    const charPart = characterAnchor ? `${characterAnchor}, ` : '';
    
    const visualPrompt = `${angle} capturing "${segment.slice(0, 100)}", ${charPart}${targetStyleModifier}, ${lighting}`.slice(0, 360);

    return {
      sceneNumber: idx + 1,
      scriptSegment: segment,
      visualPrompt,
      cameraAngle: angle,
      lighting,
      charactersPresent: characterAnchor ? ['Protagonista'] : []
    };
  });

  return {
    storyBible: {
      summary: cleanText.slice(0, 180) + '...',
      genreAndTone: targetStyleName,
      culturalContext: 'Producción de video viral automatizado'
    },
    scenes
  };
}

/**
 * Auto-Reformulador de Prompts:
 * Toma un prompt existente y lo enriquece con iluminación cinemática,
 * lentes de cámara y composición visual, manteniéndolo dentro del límite de 600 caracteres para FLUX.
 */
export async function reformulatePrompt(params: {
  currentPrompt: string;
  styleName?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const {
    currentPrompt,
    styleName = 'Cinemático',
    groqKey = DEFAULT_GROQ_API_KEY,
  } = params;

  const endpoint = '/api/groq/openai/v1/chat/completions';
  const directEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

  const system = `You are a World-Class Prompt Engineer for NVIDIA FLUX.1.
Your task: Rewrite and dramatically enhance the user's image prompt.
Rules:
1. Make it visually stunning with atmospheric volumetric lighting, rich textural details, and a clear cinematic camera angle.
2. Must match the style "${styleName}".
3. Keep it strictly under 380 characters.
4. Output ONLY the rewritten prompt in English. No introductory text or quotes.`;

  const candidateModels = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'llama-3.3-70b-specdec',
    'mixtral-8x7b-32768',
    'llama3-70b-8192'
  ];

  for (const m of candidateModels) {
    for (const ep of [endpoint, directEndpoint]) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey || DEFAULT_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: m,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: `Enhance this prompt: "${currentPrompt}"` }
            ],
            temperature: 0.6,
            max_tokens: 300,
          }),
          signal: params.signal,
        });

        if (!res.ok) {
          if (res.status === 404 && ep.startsWith('/api')) continue;
          const errText = await res.text();
          if (res.status === 404 || errText.includes('model_not_found') || errText.includes('does not exist')) {
            break; // probar siguiente modelo
          }
          throw new Error(`Error reformulando prompt (${res.status})`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        return content ? content.replace(/^["']|["']$/g, '') : currentPrompt;
      } catch (e) {
        // continuar con siguiente endpoint o modelo
      }
    }
  }

  return currentPrompt;
}

export async function callLLMWithFallbacks(params: {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  groqKey?: string;
  nvidiaNimKey?: string;
  geminiKey?: string;
  signal?: AbortSignal;
}): Promise<string> {
  // Validación de seguridad de backend/servicio: rechazar llamadas no autorizadas
  if (!isSubscriptionActive()) {
    triggerSubscriptionModal({ featureName: 'Motor de Inteligencia Artificial (LLM)' });
    throw new Error('Suscripción no activa. Necesitas tener una suscripción activa dentro de la Academia de Skool para utilizar esta función.');
  }

  const {
    model,
    systemPrompt,
    userPrompt,
    groqKey = DEFAULT_GROQ_API_KEY,
    nvidiaNimKey = DEFAULT_NVIDIA_NIM_API_KEY,
    geminiKey = '',
    signal,
  } = params;

  const targetPromptModel = model || localStorage.getItem('bulkscene_selected_prompt_model') || GEMINI_LITE_MODEL;

  // ── PRIORIDAD 1: Si el modelo es Gemini (por defecto gemini-3.5-flash-lite) usar rotación ──
  if (targetPromptModel.startsWith('gemini-')) {
    try {
      const text = await callGeminiWithRotation({
        model: targetPromptModel,
        systemPrompt,
        userPrompt,
        extraKeys: geminiKey ? [extractCleanKey(geminiKey)].filter(Boolean) : [],
        signal
      });
      if (text) return text;
    } catch (geminiErr) {
      console.warn(`[callLLMWithFallbacks] Gemini (${targetPromptModel}) falló, activando fallback NVIDIA/Groq:`, geminiErr);
    }
  }

  // 2. NVIDIA NIM & Groq Mapping
  const nvidiaModelMapping: Record<string, string> = {
    'nvidia-llama-70b': 'meta/llama-3.3-70b-instruct',
    'nvidia-deepseek-r1': 'deepseek-ai/deepseek-r1',
    'nvidia-deepseek-r1-32b': 'deepseek-ai/deepseek-r1',
    'nvidia-mistral-nemo': 'mistralai/mistral-nemo-12b-instruct',
    'nvidia-qwen-72b': 'qwen/qwen2.5-72b-instruct',
    'nvidia-nemotron-70b': 'nvidia/llama-3.1-nemotron-70b-instruct'
  };

  const cleanNvidiaKey = extractCleanKey(nvidiaNimKey) || extractCleanKey(localStorage.getItem('bulk_nvidia_api_keys') || '') || DEFAULT_NVIDIA_NIM_API_KEY;
  const cleanGroqKey = extractCleanKey(groqKey) || extractCleanKey(localStorage.getItem('bulk_groq_api_keys') || '') || DEFAULT_GROQ_API_KEY;

  let endpoint = '';
  let authHeader = '';
  let payloadModel = '';

  const isNvidiaModel = model.startsWith('nvidia-') || model.startsWith('meta/') || model.startsWith('deepseek-');

  if (isNvidiaModel) {
    endpoint = '/api/nvidia-nim/v1/chat/completions';
    authHeader = `Bearer ${cleanNvidiaKey}`;
    payloadModel = nvidiaModelMapping[model] || 'meta/llama-3.3-70b-instruct';
  } else if (model.startsWith('groq-')) {
    endpoint = '/api/groq/openai/v1/chat/completions';
    authHeader = `Bearer ${cleanGroqKey}`;
    payloadModel = model === 'groq-mixtral-8x7b' ? 'mixtral-8x7b-32768' : 'llama-3.3-70b-versatile';
  } else {
    endpoint = '/api/nvidia-nim/v1/chat/completions';
    authHeader = `Bearer ${cleanNvidiaKey}`;
    payloadModel = 'meta/llama-3.3-70b-instruct';
  }

  const directEndpoints: Record<string, string> = {
    '/api/groq/openai/v1/chat/completions': 'https://api.groq.com/openai/v1/chat/completions',
    '/api/nvidia-nim/v1/chat/completions': 'https://integrate.api.nvidia.com/v1/chat/completions',
  };

  const candidateEndpoints = [endpoint, directEndpoints[endpoint] || endpoint];
  let lastError: any = null;

  for (const ep of candidateEndpoints) {
    try {
      const response = await fetch(ep, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: payloadModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 4096,
        }),
        signal,
      });

      if (!response.ok) {
        if (response.status === 404 && ep.startsWith('/api')) {
          continue;
        }
        const err = await response.text();
        throw new Error(`Error en modelo LLM (${response.status}): ${err.slice(0, 180)}`);
      }

      const json = await response.json();
      const rawContent = json.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error('Respuesta vacía del modelo LLM.');
      return rawContent;
    } catch (err: any) {
      lastError = err;
      console.warn(`Fallo al contactar ${ep}:`, err.message);
    }
  }

  // 3. Fallback a Google Gemini si el modelo principal falló
  if (cleanGemini && !model.startsWith('gemini-')) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanGemini}`;
      const res = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 4096 }
        }),
        signal
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (gErr) {
      console.warn('[callLLMWithFallbacks] Fallback Gemini falló:', gErr);
    }
  }

  // 4. Fallback a Groq si aún hay error
  if (cleanGroqKey && !model.startsWith('groq-')) {
    const candidateGroqModels = [
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'llama-3.3-70b-specdec',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'llama3-70b-8192'
    ];
    for (const gm of candidateGroqModels) {
      try {
        const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cleanGroqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: gm,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: 0.5,
            max_tokens: 4096
          }),
          signal
        });
        if (gRes.ok) {
          const data = await gRes.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        } else {
          const errText = await gRes.text();
          if (gRes.status === 404 || errText.includes('model_not_found') || errText.includes('does not exist')) {
            continue; // probar siguiente modelo en Groq
          }
        }
      } catch (gqErr) {
        console.warn(`[callLLMWithFallbacks] Fallback Groq con ${gm} falló:`, gqErr);
      }
    }
  }

  throw lastError || new Error('No se pudo comunicar con los servicios de LLM (NVIDIA / Gemini / Groq).');
}

export interface MasterPromptAnalysis {
  productionSummary: string;
  genreAndTone: string;
  visualDirectives: string;
  characterDirectives: string;
  recommendedPacing: string;
}

/**
 * Analiza el Master Prompt ingresado por el usuario y desglosa las directrices del director.
 */
export async function analyzeMasterPrompt(params: {
  masterPrompt: string;
  model?: string;
  groqKey?: string | string[];
  nvidiaNimKey?: string | string[];
  signal?: AbortSignal;
}): Promise<MasterPromptAnalysis> {
  const { masterPrompt, groqKey, nvidiaNimKey } = params;

  const system = `Eres un Director Creativo Ejecutivo y Analista de Guiones Audiovisuales.
Analiza el Master Prompt / Directrices de producción proporcionadas por el usuario.
Debes responder ESTRICTAMENTE en formato JSON con la siguiente estructura:
{
  "productionSummary": "Resumen ejecutivo de 2 o 3 oraciones de cómo será el trabajo, qué historia se contará y cómo se estructurará la producción.",
  "genreAndTone": "Género principal, tono emocional (ej. suspenso épico, humor viral, documental científico, etc.) y ritmo.",
  "visualDirectives": "Estilo visual obligatorio, tipo de iluminación, paleta de colores y lentes.",
  "characterDirectives": "Reglas de consistencia de personajes (ropa, rasgos invariables, arquetipos).",
  "recommendedPacing": "Ritmo de cortes sugerido (ej. plano dinámico cada 2.5s para Shorts o tomas pausadas de 5s)."
}`;

  const prompt = `Analiza este Master Prompt y genera la biblia de producción:\n"""\n${masterPrompt}\n"""`;

  try {
    const rawContent = await callLLMWithFallbacks({
      model: params.model || 'groq-llama-70b',
      systemPrompt: system,
      userPrompt: prompt,
      groqKey: Array.isArray(groqKey) ? groqKey[0] : groqKey,
      nvidiaNimKey: Array.isArray(nvidiaNimKey) ? nvidiaNimKey[0] : nvidiaNimKey,
      signal: params.signal,
    });

    return extractCleanJson(rawContent);
  } catch (err: any) {
    console.error("Error al analizar Master Prompt:", err);
    return {
      productionSummary: `Producción basada en: ${masterPrompt.slice(0, 100)}...`,
      genreAndTone: "Cinemático de alta retención",
      visualDirectives: "Iluminación volumétrica, encuadre 9:16 vertical",
      characterDirectives: "Personaje consistente con ropa fija y rasgos invariables",
      recommendedPacing: "Cortes cada 2.5 - 3.5 segundos"
    };
  }
}

export interface ReformulatedScriptResult {
  title: string;
  scriptText: string;
  wordCount: number;
  estimatedDurationSec: number;
  hookSnippet: string;
}

/**
 * Reformula un nuevo guion viral de alta retención basado en el Master Prompt y una idea o guion base,
 * ajustando la extensión al tiempo objetivo exacto (en minutos o segundos).
 */
export async function reformulateScriptFromIdea(params: {
  masterPrompt: string;
  baseIdeaOrScript: string;
  targetDurationMinutes: number; // Ej: 0.5 (30s), 1 (1m), 2 (2m), 3 (3m)
  model?: string;
  groqKey?: string | string[];
  nvidiaNimKey?: string | string[];
  signal?: AbortSignal;
}): Promise<ReformulatedScriptResult> {
  const { masterPrompt, baseIdeaOrScript, targetDurationMinutes } = params;

  // Tasa estándar de locución en video vertical: ~145 palabras por minuto (~2.4 palabras/segundo)
  const targetWords = Math.round(targetDurationMinutes * 145);
  const minWords = Math.max(30, targetWords - 20);
  const maxWords = targetWords + 25;
  const targetSeconds = Math.round(targetDurationMinutes * 60);

  const system = `Eres un Guionista Cinematográfico de Élite para videos de alto impacto (TikTok, YouTube Shorts, Reels).
Tu objetivo es reformular y redactar un guion narrativo completo, apasionante y de alta retención basado en las directrices del Master Prompt y la Idea Base del usuario.

REGLAS INFALIBLES:
1. EXTENSIÓN ESTRICTA: El guion DEBE tener entre ${minWords} y ${maxWords} palabras para durar exactamente ~${targetSeconds} segundos hablados.
2. EL HOOK (0-3s): La primera frase debe ser un gancho brutal que capture la atención inmediata sin saludos ni preámbulos.
3. RITMO NARRATIVO: Oraciones directas, verbos de acción, ritmo implacable. Cero muletillas.
4. RESPUESTA ESTRICTAMENTE EN FORMATO JSON:
{
  "title": "Título corto y cautivador del video",
  "hookSnippet": "La frase de apertura de los primeros 3 segundos",
  "scriptText": "El guion completo redactado listo para locución por un narrador.",
  "wordCount": ${targetWords},
  "estimatedDurationSec": ${targetSeconds}
}`;

  const userContent = `MASTER PROMPT / DIRECTRICES DEL DIRECTOR:
"""
${masterPrompt || 'Estilo cinematográfico, alta retención, narración inmersiva.'}
"""

IDEA BASE O GUION DE REFERENCIA:
"""
${baseIdeaOrScript}
"""

DURACIÓN OBJETIVO REQUERIDA: ${targetDurationMinutes} minutos (~${targetSeconds} segundos, ~${targetWords} palabras).
Redacta el guion definitivo respetando la extensión.`;

  try {
    const rawContent = await callLLMWithFallbacks({
      model: params.model || 'groq-llama-70b',
      systemPrompt: system,
      userPrompt: userContent,
      groqKey: Array.isArray(params.groqKey) ? params.groqKey[0] : params.groqKey,
      nvidiaNimKey: Array.isArray(params.nvidiaNimKey) ? params.nvidiaNimKey[0] : params.nvidiaNimKey,
      signal: params.signal,
    });

    const parsed = extractCleanJson(rawContent);
    const words = (parsed.scriptText || '').split(/\s+/).filter(Boolean).length;
    return {
      title: parsed.title || 'Guion de Producción',
      scriptText: parsed.scriptText || '',
      wordCount: words,
      estimatedDurationSec: Math.round(words / 2.4),
      hookSnippet: parsed.hookSnippet || (parsed.scriptText || '').slice(0, 80)
    };
  } catch (err: any) {
    console.error("Error al reformular guion:", err);
    const words = baseIdeaOrScript.split(/\s+/).filter(Boolean).length;
    return {
      title: 'Guion Base',
      scriptText: baseIdeaOrScript,
      wordCount: words,
      estimatedDurationSec: Math.round(words / 2.4),
      hookSnippet: baseIdeaOrScript.slice(0, 80)
    };
  }
}

/**
 * Orquestador de análisis de guion con prioridad configurable:
 * 1. Intenta con el modelo de análisis seleccionado (por defecto gemini-3.8-flash)
 * 2. Si es Gemini, rota automáticamente entre todas las claves del pool en caso de cuota agotada (429)
 * 3. Si todo el pool Gemini se agota, activa fallback a NVIDIA Llama 70B -> Groq
 * 4. Si el usuario seleccionó un modelo no-Gemini, lo intenta primero y usa Gemini como respaldo
 */
export async function executeAnalysisWithFallbacks(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { systemPrompt, userPrompt, geminiKey, nvidiaNimKey, groqKey, signal } = params;
  const analysisModel = params.model || localStorage.getItem('bulkscene_selected_analysis_model') || GEMINI_ANALYSIS_MODEL;

  // Si el modelo seleccionado es de la familia Gemini (por defecto gemini-3.8-flash)
  if (analysisModel.startsWith('gemini-')) {
    try {
      return await callGeminiWithRotation({
        model: analysisModel,
        systemPrompt,
        userPrompt,
        extraKeys: geminiKey ? [geminiKey] : [],
        signal
      });
    } catch (geminiErr) {
      console.warn(`[executeAnalysisWithFallbacks] Gemini (${analysisModel}) pool agotado, activando fallback a NVIDIA/Groq:`, geminiErr);
    }

    // Fallback Prioridad 2: NVIDIA NIM
    try {
      return await callLLMWithFallbacks({
        model: 'nvidia-llama-70b',
        systemPrompt,
        userPrompt,
        geminiKey,
        nvidiaNimKey,
        groqKey,
        signal
      });
    } catch (nErr) {
      console.warn('[executeAnalysisWithFallbacks] Fallback NVIDIA falló, intentando Groq:', nErr);
    }

    // Fallback Prioridad 3: Groq
    return await callLLMWithFallbacks({
      model: 'groq-llama-70b',
      systemPrompt,
      userPrompt,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });
  }

  // Si el usuario eligió explícitamente un modelo no-Gemini (NVIDIA o Groq)
  try {
    return await callLLMWithFallbacks({
      model: analysisModel,
      systemPrompt,
      userPrompt,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });
  } catch (err) {
    console.warn(`[executeAnalysisWithFallbacks] Modelo seleccionado (${analysisModel}) falló, recurriendo a Gemini (${GEMINI_ANALYSIS_MODEL}):`, err);
  }

  // Respaldo de seguridad a Gemini con rotación
  return await callGeminiWithRotation({
    model: GEMINI_ANALYSIS_MODEL,
    systemPrompt,
    userPrompt,
    extraKeys: geminiKey ? [geminiKey] : [],
    signal
  });
}

/**
 * Detecta automáticamente el mejor estilo visual a partir del guion analizado con el LLM activo.
 */
export async function detectStyleWithAI(params: {
  scriptText: string;
  culturalContext?: CulturalTemporalContext;
  styles?: StylePreset[];
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<{ recommendedStyleId: string; styleName: string; reason: string; customInstructions: string }> {
  const { scriptText, culturalContext, styles = [], model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) {
    return {
      recommendedStyleId: 'custom',
      styleName: 'Cinematográfico 35mm Hiperrealista',
      reason: 'Estilo predeterminado para el guion.',
      customInstructions: 'cinematic 35mm film photography, 8k, shallow depth of field, natural lighting, highly detailed'
    };
  }

  const contextStr = culturalContext
    ? `\nCONTEXTO HISTÓRICO Y NARRATIVO DETECTADO DEL GUION:
- Época: ${culturalContext.epoch || 'Universal'}
- Cultura/Entorno: ${culturalContext.culture || 'Cinematográfica'} • ${culturalContext.environment || 'Atmosférico'}`
    : '';

  const system = `Eres un Director de Arte y Fotografía Cinematográfica galardonado con el Premio Óscar.
Tu misión es leer el guion COMPLETO y diseñar una fórmula estética visual y cinematográfica ÚNICA, personalizada y específica para esta historia y su época.

REGLAS ABSOLUTAS:
1. NO uses plantillas genéricas ni presets preexistentes.
2. NO digas "con base a...". Diseña una propuesta cinematográfica original e irrepetible que defina:
   - Óptica y lente (ej: anamorphic lenses, 35mm film stock, 70mm IMAX, telephoto lens con bokeh suave, etc.)
   - Iluminación y atmósfera (ej: volumetric light shafts, high-contrast chiaroscuro, natural golden hour, cold neon diffusion, niebla y partículas, etc.)
   - Paleta cromática y etalonaje (color grading) acorde al tono emocional del guion
   - Textura, grano de película o acabado fotográfico ultra nítido

Responde ÚNICAMENTE en formato JSON válido:
{
  "styleName": "Nombre evocador y específico del estilo creado (ej: Claroscuro Noir Cuántico 35mm, Épica Antigua de Alesia 70mm, Hiperrealismo Minimalista Ámbar)",
  "customInstructions": "Fórmula completa de estilo en inglés (45-75 palabras) con la óptica, iluminación, paleta cromática y acabado fotográfico exacto para el generador de imágenes",
  "reason": "Explicación concisa (1-2 oraciones) de por qué esta estética visual fue diseñada para la narrativa de este guion."
}`;

  const user = `GUION COMPLETO A ANALIZAR:${contextStr}
"""
${scriptText}
"""

Diseña el estilo visual cinematográfico único para este guion:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });
    const parsed = extractCleanJson(raw);
    const generatedInstructions = parsed.customInstructions || parsed.promptModifier || 'cinematic 35mm film still, photorealistic, 8k';
    return {
      recommendedStyleId: 'custom',
      styleName: parsed.styleName || 'Estilo Cinemático Personalizado',
      reason: parsed.reason || 'Estilo cinematográfico formulado exclusivamente para la atmósfera de este guion.',
      customInstructions: generatedInstructions
    };
  } catch (err) {
    console.warn('[detectStyleWithAI] Falló el análisis de estilo:', err);
    return {
      recommendedStyleId: 'custom',
      styleName: 'Cinematográfico 35mm Director',
      reason: 'Estilo cinematográfico generado según el guion.',
      customInstructions: 'cinematic 35mm film photography, 8k, shallow depth of field, dramatic atmospheric lighting'
    };
  }
}

/**
 * Extrae automáticamente el contexto temporal, cultural y ambiental del guion con análisis PROFUNDO.
 */
export async function extractCulturalContextWithAI(params: {
  scriptText: string;
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<CulturalTemporalContext> {
  const { scriptText, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) {
    return {
      epoch: 'Contemporánea / Actual',
      culture: 'Universal / Cinematográfica',
      environment: 'Urbano / Realista'
    };
  }

  const system = `Eres un Historiador Cultural y Director de Producción Cinematográfica con décadas de experiencia en producciones de época.

Tu tarea es leer el guion COMPLETO y extraer con máxima precisión:
1. La ÉPOCA histórica o futurista (año exacto si se menciona, década, siglo, o período narrativo)
2. La CULTURA y civilización dominante (sociedad, valores, costumbres, clase social)
3. El ENTORNO físico y atmosférico donde ocurre la historia (locaciones, clima, arquitectura, objetos)

NO uses palabras genéricas. Sé específico y concreto basándote en las pistas que el guion entrega.
Por ejemplo: si el guion habla de "legiones" y "muros de Alesia", deduces "52 a.C., Galia romana".
Si menciona "monitores cuánticos" y "apagón masivo", deduces "futuro cercano 2070-2090, metrópolis tecnológica".

Responde ÚNICAMENTE en formato JSON:
{
  "epoch": "Época histórica precisa (ej: Siglo I d.C. Imperio Romano, Año 2088 Era Post-Colapso, Década de 1920 Jazz Age)",
  "culture": "Cultura y ambientación específica (ej: Aristocracia romana militar, Corporaciones cyberpunk distópicas, Comunidades nativas amazónicas)",
  "environment": "Entorno físico y atmosférico detallado (ej: Coliseo romano al atardecer con multitudes, Megaurbe neon bajo lluvia perpetua, Selva tropical con templos mayas)",
  "autoDetected": true
}`;

  const user = `GUION COMPLETO:
"""
${scriptText}
"""

Analiza el guion COMPLETO y extrae el marco temporal, cultural y ambiental con máxima precisión:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });
    const parsed = extractCleanJson(raw);
    return {
      epoch: parsed.epoch || 'Contemporánea',
      culture: parsed.culture || 'Cinematográfica',
      environment: parsed.environment || 'Urbano Atmosférico',
      autoDetected: true
    };
  } catch (err) {
    console.warn('[extractCulturalContextWithAI] Falló el análisis de contexto:', err);
    return { epoch: 'Época determinada por la narración', culture: 'Cinematográfica universal', environment: 'Entorno narrativo inmersivo', autoDetected: true };
  }
}

/**
 * Detecta personajes, protagonistas y secundarios, ropa invariante y ciclo vital con análisis PROFUNDO.
 */
export async function detectCharactersWithAI(params: {
  scriptText: string;
  culturalContext?: CulturalTemporalContext;
  visualStyle?: { name?: string; modifier?: string };
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<ScriptDirectorCharacter[]> {
  const { scriptText, culturalContext, visualStyle, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) return [];

  const contextStr = [
    culturalContext?.epoch ? `Época: ${culturalContext.epoch}` : '',
    culturalContext?.culture ? `Cultura: ${culturalContext.culture}` : '',
    culturalContext?.environment ? `Entorno: ${culturalContext.environment}` : '',
    visualStyle?.name ? `Estilo Visual: ${visualStyle.name}` : ''
  ].filter(Boolean).join(' | ');

  const system = `Eres el Director de Casting y Continuidad Visual de grandes superproducciones de Hollywood.

Tu misión es leer el guion COMPLETO y:
1. Identificar con precisión TODOS los personajes que tienen presencia en la historia (protagonistas y secundarios relevantes).
2. Para cada personaje, construir una ficha biométrica y de vestuario INVARIABLE e INMUTABLE.
3. REGLA ESTRICTA DE DETALLE (PROHIBIDO LO GENÉRICO):
   - Aspecto Físico (anchorDescription): En inglés. Debes definir edad aproximada exacta, etnia, estructura facial (mandíbula, pómulos), ojos (color y forma), cabello (largo, textura, corte, color), complexión física (altura, contextura atlética/delgada/robusta), y rasgos únicos (cicatrices, barba, miradas).
   - Vestimenta (clothingAnchor): En inglés. Si el guion no detalla la ropa, TÚ DEBES ESTIMARLA Y DEFINIRLA con prendas concretas acordes a la época y cultura (${contextStr || 'la época de la historia'}), indicando colores precisos, telas, capas, calzado y accesorios (capas de lana roja, armadura de placas, gabardina de cuero envejecido con cuello alto, joyas, botas, etc.).
   - PROHIBIDO USAR FRASES GENÉRICAS como "cinematic costume matching the setting" o "subject with facial features". Cada personaje debe sonar como un actor real con vestuario de producción.

Responde ÚNICAMENTE en formato JSON:
{
  "characters": [
    {
      "name": "Nombre del personaje",
      "role": "PROTAGONIST",
      "alive": true,
      "exitScene": null,
      "anchorDescription": "Detailed facial and physical biometrics in English: exact age, eye color, hair style and color, facial structure, skin tone, build, distinctive marks",
      "clothingAnchor": "Detailed wardrobe in English: specific garments, fabrics, colors, period-accurate accessories, footwear",
      "defaultSeed": 482910
    }
  ]
}`;

  const user = `MARCO TEMPORAL Y ESTÉTICO DEL PROYECTO:
${contextStr || 'Interpretar directamente del guion'}

GUION COMPLETO:
"""
${scriptText}
"""

Analiza el guion COMPLETO e identifica todos los personajes con sus rasgos biométricos y vestimenta detallada e invariable:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });
    const parsed = extractCleanJson(raw);
    if (parsed.characters && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
      return parsed.characters.map((c: any) => ({
        name: c.name || 'Protagonista',
        role: c.role === 'SECONDARY' ? 'SECONDARY' : 'PROTAGONIST',
        alive: c.alive !== false,
        exitScene: c.exitScene ?? null,
        anchorDescription: c.anchorDescription || 'Photorealistic 35yo subject with defined sharp facial features, intense gaze, athletic build',
        clothingAnchor: c.clothingAnchor || 'Detailed cinematic tailored costume with realistic textile textures matching the narrative era',
        defaultSeed: typeof c.defaultSeed === 'number' ? c.defaultSeed : (Math.floor(Math.random() * 900000) + 100000)
      }));
    }
  } catch (err) {
    console.warn('[detectCharactersWithAI] Falló detección de personajes:', err);
  }

  const sampleSeed = Math.floor(Math.random() * 900000) + 100000;
  return [{
    name: 'Protagonista',
    role: 'PROTAGONIST',
    alive: true,
    exitScene: null,
    anchorDescription: 'Photorealistic character with sharp facial features, determined cinematic gaze, defined cheekbones and weathered hair',
    clothingAnchor: 'Period-accurate tailored layered garments with weathered leather and textile textures',
    defaultSeed: sampleSeed
  }];
}

/**
 * Detecta automáticamente el encuadre cinematográfico e iluminación ideal para el guion con IA.
 */
export async function detectCinematographyWithAI(params: {
  scriptText: string;
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<{ cameraPreference: string; lightingPreference: string; reason: string }> {
  const { scriptText, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) {
    return { cameraPreference: 'variado_dinamico', lightingPreference: 'volumetrica_cinematica', reason: 'Valores por defecto.' };
  }

  const system = `Eres el Director de Fotografía (DP) más premiado del mundo, con Óscar honorífico en cinematografía.

Lee el guion COMPLETO y determina:
1. El ENCUADRE más efectivo para este contenido específico
2. La ILUMINACIÓN más apropiada para la atmósfera emocional del guion

Opciones disponibles para encuadre (cameraPreference):
- "variado_dinamico": Mezcla de planos generales, medios y primeros planos. Para historias con múltiples locaciones y acción variada.
- "primeros_planos": Enfoque en rostros, emociones y miradas. Para historias íntimas, psicológicas o emocionales.
- "gran_plano_general": Paisajes monumentales y escenarios épicos. Para epopeyas, naturaleza, guerra, fantasía épica.
- "camara_en_mano": Sensación documental cruda y real. Para reportajes, mockumentary, acción urbana, realismo social.

Opciones disponibles para iluminación (lightingPreference):
- "volumetrica_cinematica": Rayos de luz, niebla y volumen. Para drama épico, ciencia ficción, fantasía oscura.
- "hora_dorada": Luz cálida al amanecer o atardecer (Kodachrome). Para romance, nostalgia, drama emocional positivo.
- "claroscuro_dramatico": Alto contraste, sombras tensas (Rembrandt). Para thriller, noir, suspenso, drama psicológico.
- "neon_cyberpunk": Azul y magenta, neón bicolor. Para ciencia ficción urbana, cyberpunk, futuro distópico.

Responde ÚNICAMENTE en formato JSON:
{
  "cameraPreference": "valor-exacto-de-la-lista",
  "lightingPreference": "valor-exacto-de-la-lista",
  "reason": "Explicación de 1-2 oraciones de por qué estas elecciones potencian este guion específico."
}`;

  const user = `GUION COMPLETO:
"""
${scriptText}
"""

Analiza el guion COMPLETO y determina el encuadre e iluminación ideales:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });
    const parsed = extractCleanJson(raw);
    return {
      cameraPreference: parsed.cameraPreference || 'variado_dinamico',
      lightingPreference: parsed.lightingPreference || 'volumetrica_cinematica',
      reason: parsed.reason || 'Cinematografía optimizada para el guion.'
    };
  } catch (err) {
    console.warn('[detectCinematographyWithAI] Falló detección de cinematografía:', err);
    return { cameraPreference: 'variado_dinamico', lightingPreference: 'volumetrica_cinematica', reason: 'Valores por defecto.' };
  }
}
