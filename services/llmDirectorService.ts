/**
 * Servicio de Dirección Cinematográfica de Guiones con LLMs avanzados.
 * Soporta Groq (Llama 3.3 70B Versatile) y NVIDIA NIM (DeepSeek R1 Qwen 32B Uncensored, Llama 3.3 70B).
 */

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

export async function analyzeScriptWithLLM(params: {
  scriptText: string;
  model?: 'groq-llama-70b' | 'nvidia-deepseek-r1-32b' | 'nvidia-llama-70b' | string;
  groqKey?: string;
  nvidiaNimKey?: string;
  targetStyleName?: string;
  targetStyleModifier?: string;
  characterAnchor?: string;
  pacingWords?: number;
  hookMinSeconds?: number;
  hookMaxSeconds?: number;
  signal?: AbortSignal;
}): Promise<DirectorAnalysisResponse> {
  const {
    scriptText,
    model = 'groq-llama-70b',
    groqKey = DEFAULT_GROQ_API_KEY,
    nvidiaNimKey = DEFAULT_NVIDIA_NIM_API_KEY,
    targetStyleName = 'Cinematográfico 35mm Hiperrealista',
    targetStyleModifier = 'cinematic 35mm film photography, Kodak Portra 400 color science, natural atmospheric lighting, 8k',
    characterAnchor = '',
    pacingWords = 8,
  } = params;

  const minWords = Math.max(4, pacingWords - 3);
  const maxWords = pacingWords + 5;

  const systemPrompt = `Eres el Director Supremo de Cine y Guiones para producciones de video viral de alta retención (YouTube Shorts, Reels, TikTok).
Tu misión es transformar el guion del usuario en una estructura narrativa cinematográfica precisa y secuencial para generar imágenes escena por escena.

DIRECTRIZ DE ESTILO VISUAL ABSOLUTA:
- Estilo artístico ordenado: "${targetStyleName}".
- Modificador visual clave: "${targetStyleModifier}".
- REGLA DE ORO DE ESTILO: Cada uno de los prompts para cada escena DEBE estar escrito y concebido desde su primera palabra en el estilo visual seleccionado ("${targetStyleName}").
- LONGITUD MÁXIMA POR PROMPT: Cada visualPrompt debe tener MENOS DE 380 CARACTERES en inglés. Directo, impactante y conciso para NVIDIA FLUX.
- ANTI-CENSURA / CONTENIDO SEGURO: Evita terminología explícita de sangre ("blood"), muerte sangrienta ("slaughter/kill"); sustitúyelo por lenguaje dramático visual ("fallen silhouette", "engulfed by storm", "shadowy defeat") para que NVIDIA jamás active filtros de moderación.

PROTOCOLO DE ACCIÓN DINÁMICA (CRÍTICO):
- VISUALIZA EL VERBO: Si el texto dice correr, nadar o gritar, el sujeto debe estar en movimiento activo enérgico, jamás en una pose estática mirando a cámara.
- CADENA DE CONTINUIDAD CAUSA-EFECTO: La escena N+1 debe ser la consecuencia directa de la escena N.
${characterAnchor ? `- PERSONAJE PROTAGÓNICO FIJADO: "${characterAnchor}". Mantén sus rasgos constantes.` : ''}

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
}`;

  let endpoint = '';
  let authHeader = '';
  let payloadModel = '';

  if (model === 'groq-llama-70b') {
    // Probar proxy local Vite primero, o directo
    endpoint = '/api/groq/openai/v1/chat/completions';
    authHeader = `Bearer ${groqKey.trim() || DEFAULT_GROQ_API_KEY}`;
    payloadModel = 'llama-3.3-70b-versatile';
  } else if (model === 'nvidia-deepseek-r1-32b') {
    endpoint = '/api/nvidia-nim/v1/chat/completions';
    authHeader = `Bearer ${nvidiaNimKey.trim() || DEFAULT_NVIDIA_NIM_API_KEY}`;
    payloadModel = 'nicoboss/DeepSeek-R1-Distill-Qwen-32B-Uncensored';
  } else {
    endpoint = '/api/nvidia-nim/v1/chat/completions';
    authHeader = `Bearer ${nvidiaNimKey.trim() || DEFAULT_NVIDIA_NIM_API_KEY}`;
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
            { role: 'user', content: `Analiza y segmenta cinematográficamente este guion:\n\n${scriptText}` }
          ],
          temperature: 0.5,
          max_tokens: 4096,
        }),
        signal: params.signal,
      });

      if (!response.ok) {
        if (response.status === 404 && ep.startsWith('/api')) {
          continue; // Intenta con la URL directa
        }
        const err = await response.text();
        throw new Error(`Error en modelo LLM (${response.status}): ${err.slice(0, 180)}`);
      }

      const json = await response.json();
      const rawContent = json.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error('Respuesta vacía del modelo de dirección LLM.');

      const parsed = extractCleanJson(rawContent);
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error('La respuesta de la IA no incluyó el arreglo de escenas requerido.');
      }

      return parsed as DirectorAnalysisResponse;
    } catch (err: any) {
      lastError = err;
      console.warn(`Fallo al contactar ${ep}:`, err.message);
    }
  }

  throw lastError || new Error('No se pudo comunicar con los servicios de LLM (Groq / NVIDIA).');
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

  for (const ep of [endpoint, directEndpoint]) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey || DEFAULT_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
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
        throw new Error(`Error reformulando prompt (${res.status})`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      return content ? content.replace(/^["']|["']$/g, '') : currentPrompt;
    } catch (e) {
      console.warn(`Fallo al reformular en ${ep}:`, e);
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
  signal?: AbortSignal;
}): Promise<string> {
  const {
    model = 'groq-llama-70b',
    systemPrompt,
    userPrompt,
    groqKey = DEFAULT_GROQ_API_KEY,
    nvidiaNimKey = DEFAULT_NVIDIA_NIM_API_KEY,
    signal,
  } = params;

  let endpoint = '';
  let authHeader = '';
  let payloadModel = '';

  if (model.includes('groq') || model === 'groq-llama-70b') {
    endpoint = '/api/groq/openai/v1/chat/completions';
    authHeader = `Bearer ${(groqKey || DEFAULT_GROQ_API_KEY).trim()}`;
    payloadModel = 'llama-3.3-70b-versatile';
  } else if (model.includes('deepseek')) {
    endpoint = '/api/nvidia-nim/v1/chat/completions';
    authHeader = `Bearer ${(nvidiaNimKey || DEFAULT_NVIDIA_NIM_API_KEY).trim()}`;
    payloadModel = 'nicoboss/DeepSeek-R1-Distill-Qwen-32B-Uncensored';
  } else {
    endpoint = '/api/nvidia-nim/v1/chat/completions';
    authHeader = `Bearer ${(nvidiaNimKey || DEFAULT_NVIDIA_NIM_API_KEY).trim()}`;
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

  throw lastError || new Error('No se pudo comunicar con los servicios de LLM (Groq / NVIDIA).');
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

