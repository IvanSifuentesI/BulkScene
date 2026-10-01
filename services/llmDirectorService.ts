/**
 * Servicio de Dirección Cinematográfica de Guiones con LLMs avanzados.
 * Soporta Groq (Llama 3.3 70B Versatile), NVIDIA NIM (Llama 3.3 70B, DeepSeek R1, Mistral, Qwen), y Google Gemini.
 */
import { StylePreset, CulturalTemporalContext, ScriptDirectorCharacter } from '../types';
export type { ScriptDirectorCharacter };
import { isSubscriptionActive, triggerSubscriptionModal } from './subscriptionService';

export const DEFAULT_GROQ_API_KEY = '';
export const DEFAULT_NVIDIA_NIM_API_KEY = '';

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
  // Eliminar bloques <think>...</think> de DeepSeek R1
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Eliminar bloques de código markdown
  if (text.startsWith('```json')) {
    text = text.substring(7);
  } else if (text.startsWith('```')) {
    text = text.substring(3);
  }
  if (text.endsWith('```')) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(text);
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

  const cleanGeminiKey = extractCleanKey(geminiKey) || extractCleanKey(localStorage.getItem('bulk_gemini_api_key') || '');
  const cleanNvidiaKey = extractCleanKey(nvidiaNimKey) || extractCleanKey(localStorage.getItem('bulk_nvidia_api_keys') || '') || DEFAULT_NVIDIA_NIM_API_KEY;
  const cleanGroqKey = extractCleanKey(groqKey) || extractCleanKey(localStorage.getItem('bulk_groq_api_keys') || '') || DEFAULT_GROQ_API_KEY;

  // Lista ordenada de intentos
  const attempts: Array<{
    name: string;
    provider: 'gemini' | 'nvidia' | 'groq';
    modelId: string;
    key: string;
  }> = [];

  // Intento 1: El modelo seleccionado explícitamente
  if (model.startsWith('gemini-') && cleanGeminiKey) {
    attempts.push({ name: `Gemini (${model})`, provider: 'gemini', modelId: model, key: cleanGeminiKey });
  } else if ((model.startsWith('nvidia-') || model.startsWith('meta/') || model.startsWith('deepseek-')) && cleanNvidiaKey) {
    attempts.push({ name: `NVIDIA (${model})`, provider: 'nvidia', modelId: model, key: cleanNvidiaKey });
  } else if (model.startsWith('groq-') && cleanGroqKey) {
    attempts.push({ name: `Groq (${model})`, provider: 'groq', modelId: model, key: cleanGroqKey });
  }

  // Fallbacks de seguridad con prioridad definida: Gemini -> NVIDIA -> Groq
  if (cleanGeminiKey && !attempts.some(a => a.provider === 'gemini')) {
    attempts.push({ name: 'Gemini 2.0 Flash (Fallback)', provider: 'gemini', modelId: 'gemini-2.0-flash', key: cleanGeminiKey });
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
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${attempt.modelId}:generateContent?key=${attempt.key}`;
        const res = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json'
            }
          }),
          signal
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
        }

        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
- LONGITUD MÁXIMA POR PROMPT: Cada visualPrompt debe tener MENOS DE 380 CARACTERES en inglés. Directo, impactante y conciso para NVIDIA FLUX.
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
    model = 'nvidia-llama-70b',
    systemPrompt,
    userPrompt,
    groqKey = DEFAULT_GROQ_API_KEY,
    nvidiaNimKey = DEFAULT_NVIDIA_NIM_API_KEY,
    geminiKey = '',
    signal,
  } = params;

  // 1. Google Gemini Support
  const cleanGemini = extractCleanKey(geminiKey) || extractCleanKey(localStorage.getItem('bulk_gemini_api_key') || '');
  if (model.startsWith('gemini-') && cleanGemini) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanGemini}`;
      const res = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4096
          }
        }),
        signal
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (gErr) {
      console.warn('[callLLMWithFallbacks] Gemini error, probando alternativas:', gErr);
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
 * Detecta automáticamente el mejor estilo visual a partir del guion analizado con el LLM activo.
 */
export async function detectStyleWithAI(params: {
  scriptText: string;
  styles: StylePreset[];
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<{ recommendedStyleId: string; styleName: string; reason: string; customInstructions: string }> {
  const { scriptText, styles, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim() || styles.length === 0) {
    return {
      recommendedStyleId: styles[0]?.id || 'cinematic-35mm',
      styleName: styles[0]?.name || 'Cinematográfico 35mm',
      reason: 'Estilo predeterminado por defecto',
      customInstructions: styles[0]?.promptModifier || ''
    };
  }

  const stylesListStr = styles.map((s, idx) =>
    `${idx + 1}. ID: "${s.id}" | Nombre: "${s.name}" | Categoría: "${s.category}" | Detalle: "${s.description}"`
  ).join('\n');

  const system = `Eres el Director de Arte y Fotografía Cinematográfica más reconocido del mundo, con experiencia en Hollywood, Bollywood y cine europeo.

Tu misión es leer el guion COMPLETO, comprender a fondo:
- El género y tono emocional (drama, acción, romance, terror, documental, motivacional, etc.)
- La atmósfera que el creador quiere transmitir al espectador
- Los personajes, sus emociones y el arco narrativo
- La época, el mundo y los escenarios descritos
- El ritmo de la historia (rápido/lento, tenso/relajado)

Con ese análisis PROFUNDO del guion, seleccionar el mejor estilo visual de la lista Y además crear instrucciones técnicas de fotografía cinematográfica personalizadas que complementen y eleven la narrativa.

Responde ÚNICAMENTE en formato JSON válido:
{
  "recommendedStyleId": "id-exacto-del-estilo",
  "styleName": "Nombre del estilo",
  "reason": "Análisis de 2-3 oraciones: por qué este estilo específico potencia la narrativa de ESTE guion.",
  "customInstructions": "Instrucciones técnicas de fotografía en inglés para el generador de imágenes, de 30-60 palabras, muy específicas para este guion: tipo de lente, profundidad de campo, temperatura de color, grano de película, iluminación, composición, etc."
}`;

  const user = `LISTA DE ESTILOS DISPONIBLES:
${stylesListStr}

GUION COMPLETO A ANALIZAR:
"""
${scriptText}
"""

Analiza el guion COMPLETO en profundidad y elige el estilo más adecuado:`;

  try {
    const raw = await callLLMWithFallbacks({
      model,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsed = extractCleanJson(raw);
    const matched = styles.find(s => s.id === parsed.recommendedStyleId) || styles[0];
    return {
      recommendedStyleId: matched.id,
      styleName: matched.name,
      reason: parsed.reason || 'Estilo optimizado para la atmósfera del guion.',
      customInstructions: parsed.customInstructions || matched.promptModifier || ''
    };
  } catch (err) {
    console.warn('[detectStyleWithAI] Fallback local para estilo visual:', err);
    return {
      recommendedStyleId: styles[0].id,
      styleName: styles[0].name,
      reason: 'Selección por defecto (fallo en análisis IA).',
      customInstructions: styles[0].promptModifier || ''
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
    const raw = await callLLMWithFallbacks({
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
    console.warn('[extractCulturalContextWithAI] Fallback local para contexto:', err);
    return {
      epoch: 'Época determinada por la narración',
      culture: 'Cinematográfica universal',
      environment: 'Entorno narrativo inmersivo',
      autoDetected: true
    };
  }
}

/**
 * Detecta personajes, protagonistas y secundarios, ropa invariante y ciclo vital con análisis PROFUNDO.
 */
export async function detectCharactersWithAI(params: {
  scriptText: string;
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<ScriptDirectorCharacter[]> {
  const { scriptText, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) return [];

  const system = `Eres el Director de Casting y Supervisor de Continuidad Visual de las producciones más grandes de Hollywood.

Tu misión es leer el guion COMPLETO y:
1. Identificar TODOS los personajes que tienen presencia significativa en la narrativa
2. Para cada personaje, construir una ficha biométrica INVARIABLE e INMUTABLE para que el generador de imágenes los reproduzca de manera idéntica en cada escena
3. Determinar si el personaje muere, desaparece o sobrevive al final del relato

Reglas importantes:
- El protagonista es el personaje central de la historia
- Si el guion es motivacional o filosófico sin personajes explícitos, crea un "Narrador Anónimo" con rasgos genéricos cinematográficos
- Las descripciones biométricas y de ropa deben estar en INGLÉS y ser muy precisas y detalladas
- Incluye edad aproximada, rasgos físicos dominantes, color de ojos, cabello, complexión
- La ropa debe ser la que predomina en la mayor parte del relato

Responde ÚNICAMENTE en formato JSON:
{
  "characters": [
    {
      "name": "Nombre del personaje",
      "role": "PROTAGONIST",
      "alive": true,
      "exitScene": null,
      "anchorDescription": "Descripción biométrica detallada en inglés (edad, altura, rasgos faciales, cabello, ojos, piel)",
      "clothingAnchor": "Vestimenta predominante en inglés (prendas, colores, materiales, accesorios)",
      "defaultSeed": 482910
    }
  ]
}`;

  const user = `GUION COMPLETO:
"""
${scriptText}
"""

Analiza el guion COMPLETO e identifica todos los personajes con sus rasgos biométricos invariables:`;

  try {
    const raw = await callLLMWithFallbacks({
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
        anchorDescription: c.anchorDescription || 'Photorealistic consistent subject with sharp facial features',
        clothingAnchor: c.clothingAnchor || 'Cinematic costume matching the setting',
        defaultSeed: typeof c.defaultSeed === 'number' ? c.defaultSeed : (Math.floor(Math.random() * 900000) + 100000)
      }));
    }
  } catch (err) {
    console.warn('[detectCharactersWithAI] Fallback local para personajes:', err);
  }

  const sampleSeed = Math.floor(Math.random() * 900000) + 100000;
  return [
    {
      name: 'Protagonista',
      role: 'PROTAGONIST',
      alive: true,
      exitScene: null,
      anchorDescription: 'Photorealistic heroic central character with defined facial structure and cinematic gaze',
      clothingAnchor: 'Distinctive wardrobe styled for the narrative setting',
      defaultSeed: sampleSeed
    }
  ];
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
    const raw = await callLLMWithFallbacks({
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
    console.warn('[detectCinematographyWithAI] Fallback cinematografía:', err);
    return { cameraPreference: 'variado_dinamico', lightingPreference: 'volumetrica_cinematica', reason: 'Valores por defecto.' };
  }
}


