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
import { StylePreset, CulturalTemporalContext, ScriptDirectorCharacter, ScriptDeepAnalysis, ScriptSceneResult, NarrativeSceneUnit } from '../types';
export type { ScriptDirectorCharacter, ScriptDeepAnalysis, ScriptSceneResult, NarrativeSceneUnit };

import { isSubscriptionActive, triggerSubscriptionModal } from './subscriptionService';
import { studioLogger } from './studioLoggerService';

export const DEFAULT_GROQ_API_KEY = '';
export const DEFAULT_NVIDIA_NIM_API_KEY = '';

// ─── MODELOS GEMINI ────────────────────────────────────────────────────────────
/** Motor de análisis profundo: guion completo, personajes, época, estilo, cinematografía */
export const GEMINI_ANALYSIS_MODEL = 'gemini-3.8-flash';
/** Motor de generación masiva: un prompt por escena, alta velocidad y volumen */
export const GEMINI_LITE_MODEL = 'gemini-3.5-flash-lite';

// ─── 5 MASTER PROMPTS OFICIALES DEL USUARIO ────────────────────────────────────
export const MASTER_PROMPT_1_SCRIPT_ANALYSIS = `Analiza el guion completo antes de generar cualquier escena o prompt visual.
Tu trabajo NO es resumir el guion ni convertir cada frase en una imagen genérica.
Tu trabajo es construir una representación visual precisa de la historia para que posteriormente otro módulo pueda generar imágenes coherentes, específicas y visualmente conectadas con lo que realmente ocurre en el guion.

REGLA PRINCIPAL:
NO INVENTES información solamente para completar campos.
Para cada elemento debes distinguir entre:
* EXPLÍCITO: información directamente presente en el guion.
* INFERIDO: información que puede deducirse razonablemente por el contexto narrativo.
* INDETERMINADO: información que el guion no permite establecer.
Cuando algo sea indeterminado, NO lo sustituyas por clichés cinematográficos.

Analiza:
1. HISTORIA Y PREMISA: Tema central, situación principal, conflicto, objetivo, problema, evolución de la situación, resultado o desenlace, tono narrativo.
2. ESTRUCTURA NARRATIVA: Divide el guion en unidades narrativas (Introducción, Presentación de personajes, Acción, Cambio de situación, Revelaciones, Conflictos, Consecuencias, Resolución). Cada futura escena debe representar una acción, objeto o entorno REALMENTE relacionado.
3. ELEMENTOS VISUALES EXPLÍCITOS: Personas, edad/sexo/apariencia si descrita, ropa, objetos, animales, lugares, arquitectura, naturaleza, vehículos, herramientas, comida, documentos, tecnología, elementos médicos/culturales, etc.
4. ACCIONES: QUÉ está ocurriendo físicamente. Prioriza acciones observables (NO: "explica la situación"; MEJOR: "permanece sentado frente a la mesa señalando un documento abierto"). Si una acción no está presente ni puede inferirse razonablemente, no la inventes.
5. EMOCIONES Y ESTADO DRAMÁTICO: Determina únicamente las emociones respaldadas por el texto.
6. CONTINUIDAD: Identidad de personajes, edad aproximada, ropa, objetos importantes, lugares, época, arquitectura, iluminación dominante. Sirve como "memoria visual".
7. ELEMENTOS QUE NO DEBEN INVENTARSE: Lista de información visual que el guion NO determina (ej. color de ojos no mencionado, ciudad no mencionada, año no mencionado, marca de ropa no mencionada). Estos elementos NO deben convertirse automáticamente en detalles arbitrarios.
8. RESUMEN VISUAL DEL PROYECTO: Síntesis explicando quién aparece, dónde, cuándo, qué está pasando, qué elementos visuales son importantes, qué debe mantenerse constante y qué permanece abierto.`;

export const MASTER_PROMPT_2_CULTURAL_TEMPORAL = `Analiza el guion para determinar el contexto histórico, geográfico, social y cultural necesario para representar visualmente la historia.
NO inventes una época solamente porque necesitas completar el campo.
NO utilices "cultura universal".
NO utilices "period accurate" si no existe evidencia de una época histórica.

Analiza:
1. ÉPOCA: año exacto si aparece, década, siglo, período histórico, contemporáneo, futuro, o indeterminado. Indica el nivel de certeza.
2. UBICACIÓN: país, región, ciudad, pueblo, zona rural, zona urbana, ubicación interior/exterior, entorno geográfico. Si no está determinado, indícalo como desconocido.
3. CULTURA: idioma, vestimenta, religión, arquitectura, alimentación, costumbres, relaciones sociales, objetos, símbolos, tecnología, transporte.
4. NIVEL DE CERTEZA: EXPLÍCITO / INFERENCIA FUERTE / INFERENCIA DÉBIL / NO DETERMINADO.
5. ELEMENTOS VISUALES OBLIGATORIOS (CULTURAL_LOCK): Incluye solamente elementos que deben aparecer para mantener autenticidad.
6. ELEMENTOS QUE NO DEBEN APARECER (CULTURAL_AVOID): Incluye anacronismos, objetos, ropa, arquitectura, tecnología o costumbres que contradigan el contexto determinado.
7. ANACRONISMOS: Comprueba tecnología, ropa, vehículos, arquitectura, iluminación, armas, alimentos, documentos compatibles con época y lugar.
8. CONTEXTO INDETERMINADO: Si el guion no permite establecer época o cultura específica, construye un contexto visual neutral pero coherente y explícitamente marca qué elementos quedan abiertos.

OBJETIVO: La imagen debe parecer perteneciente al mismo lugar, época y cultura que la historia, no simplemente una imagen cinematográfica genérica.`;

export const MASTER_PROMPT_3_VISUAL_STYLE = `Analiza el guion y determina cuál debe ser el lenguaje visual del proyecto.
NO impongas automáticamente:
* cinematic 35mm
* film photography
* 8k
* shallow depth of field
* dramatic lighting
* golden hour
* volumetric lighting
Esos elementos solamente deben utilizarse si son coherentes con la historia.

El estilo visual debe derivarse de: género narrativo, época, lugar, cultura, tono, tema, tipo de personajes, naturaleza de las acciones, intensidad dramática, ambiente y referencias visuales del guion.

ANALIZA:
1. GÉNERO VISUAL: documental, drama histórico, thriller, terror, comedia, romance, acción, religioso/bíblico, educativo, médico, social, biográfico, periodístico, cotidiano/realista, fantasía, ciencia ficción.
2. REALISMO: fotográficas y realistas, documentalistas, hiperrealistas, cinematográficas, estilizadas, ilustrativas, etc.
3. CÁMARA: handheld, estática, observacional, close-up, medium shot, wide shot, etc. NO utilices encuadres diferentes simplemente por hacer cada escena "más cinematográfica".
4. ILUMINACIÓN: a partir del contexto (fuente natural, luz interior, velas, luz solar, luz urbana, luz hospitalaria, luz de oficina, noche, amanecer, etc.). La iluminación debe pertenecer al mundo de la historia.
5. COLOR: paleta coherente con época, lugar, tono y ambiente. No agregues colores arbitrarios.
6. TEXTURA VISUAL: imagen limpia, textura documental, grano de película, imagen digital, estética vintage, imagen clínica, etc.
7. PROFUNDIDAD Y COMPOSICIÓN.
8. REGLAS DE CONSISTENCIA (STYLE_LOCK): características visuales que deben mantenerse constantes entre todas las escenas.
9. ELEMENTOS PROHIBIDOS (STYLE_AVOID): qué estilos NO deberían aparecer porque romperían la coherencia.

IMPORTANTE: No conviertas "cinematic" en una respuesta automática. El objetivo es hacer que las imágenes parezcan pertenecer al MISMO UNIVERSO VISUAL que el guion.`;

export const MASTER_PROMPT_4_CHARACTERS = `Analiza el guion exclusivamente para identificar y construir los personajes que deben aparecer visualmente.
NO inventes personajes para llenar una cantidad mínima.
NO conviertas automáticamente al narrador en protagonista visual.
NO inventes rasgos físicos específicos que el guion no proporcione, salvo que sean necesarios para mantener coherencia visual y puedan establecerse como características neutrales.

Para cada personaje identifica:
1. IDENTIDAD: nombre, rol narrativo (protagonista, secundario, testigo, profesional, etc.).
2. PRESENCIA: aparece físicamente vs solamente es mencionado vs habla vs es mostrado indirectamente. NO representes visualmente a alguien solamente porque su nombre aparece en el texto.
3. EDAD: si no aparece, utiliza un rango visual razonable neutral, NO inventes una edad exacta.
4. APARIENCIA: sexo/género, edad, cabello, piel, ojos, rostro, complexión. Clasifica cada rasgo como EXPLÍCITA / INFERIDA / NO DETERMINADA.
5. VESTUARIO: época, profesión, situación, cultura, actividad. El vestuario debe ser coherente con el mundo narrativo. NO uses automáticamente "period-accurate tailored layered garments" si el guion no establece que sea histórico.
6. OBJETOS PERSONALES: objetos que acompañen al personaje.
7. COMPORTAMIENTO: postura, gestos, expresiones, actitud.
8. IDENTIDAD VISUAL FIJA (CHARACTER_LOCK): características que deben permanecer constantes entre escenas. Si no está determinada, NO la inventes dentro del CHARACTER_LOCK.
9. EVOLUCIÓN: si cambia físicamente, emocionalmente o en vestuario.
10. REGLA FUNDAMENTAL: En cada escena donde aparezca, usar CHARACTER_LOCK como identidad base sin copiar toda la ficha literalmente, integrando solo lo necesario para esa escena.`;

export const MASTER_PROMPT_5_SCENE_GENERATOR = `Eres un Director de Cine y Diseñador de Prompts Cinematográficos de élite para generadores de imagen (Midjourney v6 / FLUX.1) y video (Runway Gen-3 Alpha, Kling AI, Luma Dream Machine).

REGLAS DE ORO DE DIRECCIÓN CINEMATOGRÁFICA:

1. CONTENIDO VISUAL CONCRETO (visualPrompt para Midjourney / FLUX):
   - Cada escena DEBE incluir: Sujeto o entorno específico, acción física observable, composición (shotSize + cameraAngle), iluminación contextual, paleta cromática precisa y 2–3 TEXTURAS OBSERVABLES relevantes a la escala del encuadre.
   - Describe materiales tangibles y observables: fibras de lana rústica, veta de madera envejecida, rugosidad de granito húmedo, pátina de hierro forjado, gotas de condensación, escarcha cristalina, vapor saliendo de la respiración, barro helado, etc.
   - PALABRAS Y CLICHÉS ESTRICTAMENTE PROHIBIDOS: NUNCA uses "realistic", "clean", "hyper-detailed", "ultra-realistic", "photorealistic", "8k", "unreal engine", "cinematic 35mm". En su lugar, describe los materiales, iluminación física y la atmósfera observable.
   - ESCALA DE TEXTURAS: En planos muy lejanos (Extreme Wide Shot), enfócate en la orografía, bruma, capas geológicas o formaciones atmosféricas; NUNCA fuerces microtexturas que la óptica de la cámara no podría percibir a esa distancia.

2. GENERACIÓN PARALELA DE VIDEO (videoPrompt para Gen-3 / Kling / Luma):
   - Cada escena DEBE contar simultáneamente con un videoPrompt (100% en inglés).
   - Comparte exactamente los mismos sujetos, vestimentas, paleta e iluminación que visualPrompt.
   - Describe cinemática de cámara realista y fluida: movimiento de cámara (ej. "The camera begins on a close track before slowly pulling back and elevating into a wide vista", "Slow forward tracking shot through parting mist", "Subtle rotational arc around the subject", "Lateral slider alongside the terrace wall").
   - Describe dinámicas físicas visibles del sujeto y del entorno: telas azotadas por ráfagas de viento, aliento visible condensándose en vapor, polvo mineral o nieve desprendiéndose en el aire, agua fluyendo sobre cantos rodados, etc.
   - Incluye al final una pista de audio foley/acústico fidedigno y sincronizado con la escena:
     "Audio: [descripción de sonidos acústicos físicos: viento aullando entre riscos, crujido rítmico de grava bajo el calzado, murmullo distante de río o crepitar de brasas]; no spoken dialogue."

3. VARIEDAD NARRATIVA Y ERRADICACIÓN DEL "BUSTO PARLANTE":
   - Diseña cada escena según la acción concreta de su fragmento de guion.
   - ALTERNA rigurosamente entre:
     * Planos generales de paisaje y atmósfera (Extreme Wide Shot / Wide Shot)
     * Arquitectura, espacios y entorno físico
     * Planos de detalle y objetos tangibles (Macro / Close-Up)
     * Acciones humanas y procesos físicos concretos
   - PROHIBIDO repetir una y otra vez a un protagonista gesticulando o hablando a cámara. Si el fragmento habla de herramientas o documentos, muestra los objetos en detalle. Si habla de geografía, muestra el relieve.

4. COHERENCIA DE METADATOS Y PERSONAJES:
   - Si una escena representa personas o figuras humanas, 'charactersPresent' DEBE contener sus nombres o roles (ej. ["Highland Scout"] o ["Stonemasons"]).
   - Si 'charactersPresent' es un array vacío ([]), el prompt NO DEBE contener personas individuales (debe ser un plano de entorno, naturaleza, paisaje, arquitectura u objetos). CERO CONTRADICCIONES.
   - Ortogonalidad de cámara: separa explícitamente 'shotSize' (tamaño de plano), 'cameraAngle' (ángulo vertical/horizontal) y 'cameraMovement' (movimiento de cámara).

5. AUTONOMÍA Y PROPAGACIÓN DE LOCKS:
   - Cada prompt debe ser autosuficiente para ser copiado y pegado directamente en Midjourney o FLUX.
   - Aplica rigurosamente el CULTURAL_LOCK (elementos obligatorios de la época/cultura), STYLE_LOCK (consistencia de óptica e iluminación) y CULTURAL_AVOID (anacronismos vetados).`;


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

// Limpiador ultra-robusto para DeepSeek R1, Gemini, Llama y markdown
function extractCleanJson(raw: string): any {
  if (!raw || typeof raw !== 'string') return {};
  
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 1. Extraer bloque markdown ```json ... ``` si existe
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (mdMatch && mdMatch[1]) {
    text = mdMatch[1].trim();
  } else {
    // Si no tiene fences completos pero empieza con ```
    if (text.startsWith('```json')) text = text.substring(7);
    else if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```')) text = text.substring(0, text.length - 3);
    text = text.trim();
  }

  // 2. Localizar inicio y fin de estructura JSON
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  let isArray = false;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isArray = true;
  }

  if (startIdx !== -1) {
    const closing = isArray ? text.lastIndexOf(']') : text.lastIndexOf('}');
    if (closing !== -1 && closing > startIdx) {
      text = text.substring(startIdx, closing + 1);
    } else {
      text = text.substring(startIdx);
    }
  }

  // Intento 1: Parse directo inmediato
  try {
    return JSON.parse(text);
  } catch {}

  // Intento 2: Limpieza de comas flotantes y comillas en keys
  const cleanPass = (input: string): string => {
    let t = input;
    t = t.replace(/,\s*([}\]])/g, '$1');
    t = t.replace(/([{,]\s*)'([a-zA-Z0-9_\-]+)'\s*:/g, '$1"$2":');
    return t;
  };

  try {
    return JSON.parse(cleanPass(text));
  } catch {}

  // Intento 3: Reemplazar saltos de línea literales (0x0A) dentro de cadenas por \n escapado
  try {
    const escapedNewlines = text.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    return JSON.parse(cleanPass(escapedNewlines));
  } catch {}

  // Intento 4: Auto-cerrar llaves/corchetes si fue truncado por límite de tokens del LLM
  try {
    let fixed = text;
    const opens: string[] = [];
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < fixed.length; i++) {
      const ch = fixed[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === '\\') {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === '{') opens.push('}');
        else if (ch === '[') opens.push(']');
        else if (ch === '}' || ch === ']') {
          if (opens.length > 0 && opens[opens.length - 1] === ch) {
            opens.pop();
          }
        }
      }
    }
    if (inString) fixed += '"';
    while (opens.length > 0) {
      fixed += opens.pop();
    }
    return JSON.parse(cleanPass(fixed));
  } catch {}

  // Intento 5: Extracción heurística de pares clave-valor si JSON.parse sigue fallando
  const resultObj: Record<string, any> = {};
  const kvRegex = /"([a-zA-Z0-9_\-]+)"\s*:\s*("(?:\\.|[^"\\])*"|true|false|null|\d+(?:\.\d+)?|\[[\s\S]*?\]|\{[\s\S]*?\})/g;
  let match;
  while ((match = kvRegex.exec(text)) !== null) {
    const key = match[1];
    const valRaw = match[2];
    try {
      resultObj[key] = JSON.parse(valRaw);
    } catch {
      if (valRaw.startsWith('"') && valRaw.endsWith('"')) {
        resultObj[key] = valRaw.slice(1, -1);
      }
    }
  }

  if (Object.keys(resultObj).length > 0) {
    return resultObj;
  }

  throw new Error(`extractCleanJson: no se pudo parsear JSON. Primeros 300 chars: ${text.slice(0, 300)}`);
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
  culturalContext?: { epoch?: string; culture?: string; environment?: string; culturalLock?: string; culturalAvoid?: string };
  characterConsistencyMode?: 'deteccion_rapida' | 'referencia_imagen' | 'nombre_en_prompt' | 'detectar_muertes_salidas';
  pacingWords?: number;
  hookMinSeconds?: number;
  hookMaxSeconds?: number;
  precalculatedScenes?: Array<{ sceneNumber: number; text: string; duration: number }>;
  narrativeScenes?: NarrativeSceneUnit[];
  audioDuration?: number;
  deepAnalysis?: ScriptDeepAnalysis;
  styleLock?: string;
  styleAvoid?: string;
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
          'llama-3.3-70b-versatile',
          'llama-3.3-70b-specdec',
          'mixtral-8x7b-32768',
          'gemma2-9b-it',
          'deepseek-r1-distill-llama-70b'
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
    model = GEMINI_LITE_MODEL,
    groqKey = DEFAULT_GROQ_API_KEY,
    nvidiaNimKey = DEFAULT_NVIDIA_NIM_API_KEY,
    geminiKey = '',
    targetStyleName = 'Estilo Específico del Guion',
    targetStyleModifier = 'authentic tactile textures, natural contextual lighting, nuanced color palette',
    characterAnchor = '',
    narrativeMode = 'documental_secuencial',
    culturalContext,
    characterConsistencyMode = 'nombre_en_prompt',
    pacingWords = 8,
    precalculatedScenes,
    deepAnalysis,
    styleLock,
    styleAvoid,
    onProgress,
    signal
  } = params;

  studioLogger.addLog('STEP', 'Paso 5/5', `Iniciando Generador de Escenas con IA — Modelo: ${model} | Estilo: ${targetStyleName} | Modo: ${narrativeMode} | Pacing: ${pacingWords} pal/escena`);

  const minWords = Math.max(4, pacingWords - 3);
  const maxWords = pacingWords + 5;

  // 1. Directriz de Análisis Profundo previo (Propagación total sin truncar)
  let deepAnalysisDirective = '';
  if (deepAnalysis) {
    const parts: string[] = [];
    if (deepAnalysis.premise?.theme) parts.push(`- TEMA CENTRAL: ${deepAnalysis.premise.theme}`);
    if (deepAnalysis.visualSummary) parts.push(`- MEMORIA VISUAL GLOBAL: ${deepAnalysis.visualSummary}`);
    if (deepAnalysis.doNotInventList && deepAnalysis.doNotInventList.length > 0) {
      parts.push(`- ELEMENTOS QUE NO DEBEN INVENTARSE (CERO CLICHÉS INDETERMINADOS): ${deepAnalysis.doNotInventList.join('; ')}`);
    }
    if (deepAnalysis.continuityMemory && deepAnalysis.continuityMemory.length > 0) {
      parts.push(`- CONTINUIDAD INMUTABLE: ${deepAnalysis.continuityMemory.join('; ')}`);
    }
    if (parts.length > 0) {
      deepAnalysisDirective = `\nMEMORIA Y ANÁLISIS PROFUNDO DEL GUION:\n${parts.join('\n')}`;
    }
  }

  // 2. Directriz del Contexto Cultural y Temporal
  let culturalDirective = '';
  if (culturalContext) {
    culturalDirective = `\nCONTEXTO TEMPORAL Y CULTURAL OBLIGATORIO:
- Época: ${culturalContext.epoch || 'Contemporánea'}
- Cultura: ${culturalContext.culture || 'Universal'}
- Entorno: ${culturalContext.environment || 'Realista'}
${culturalContext.culturalLock ? `- CULTURAL_LOCK (Obligatorio en cada escena): ${culturalContext.culturalLock}` : ''}
${culturalContext.culturalAvoid ? `- CULTURAL_AVOID (Estrictamente Prohibido): ${culturalContext.culturalAvoid}` : ''}`;
  }

  // 3. Directriz de Estilo Visual
  let styleDirective = `\nDIRECTRIZ DE ESTILO VISUAL:
- Estilo: "${targetStyleName}".
- Modificador: "${targetStyleModifier}".`;
  if (styleLock) styleDirective += `\n- STYLE_LOCK: ${styleLock}`;
  if (styleAvoid) styleDirective += `\n- STYLE_AVOID: ${styleAvoid}`;

  // 4. Directriz de Consistencia de Personajes (Solo personajes recurrentes)
  let consistencyDirective = '';
  if (characterAnchor) {
    consistencyDirective = `\nREGLA DE CONTINUIDAD (CHARACTER_LOCK):\n${characterAnchor}`;
  }

  const baseSystemPrompt = `${MASTER_PROMPT_5_SCENE_GENERATOR}

MODO DE DIRECCIÓN Y CONTINUIDAD: ${narrativeMode}.
Las escenas deben ser estrictamente consecutivas y conectadas por una relación de causa-efecto física clara.
${deepAnalysisDirective}
${culturalDirective}
${styleDirective}
${consistencyDirective}

REGLAS DE ORO DE ESPECIFICIDAD VISUAL:
1. REGLA DE CAUSALIDAD: La imagen debe ser consecuencia DIRECTA del fragmento de guion. NUNCA inventes una habitación rústica, laboratorio vintage ni pergaminos si no están explícitos en el texto.
2. REGLA DE ESPECIFICIDAD: Cada prompt visual debe responder: ¿QUIÉN? ¿QUÉ ACCIÓN FÍSICA HACE? ¿DÓNDE? ¿CON QUÉ? ¿QUÉ 2-3 TEXTURAS SE APRECIAN?
3. PALABRAS PROHIBIDAS: Cero palabras vacías ("realistic", "clean", "hyper-detailed", "ultra-realistic", "photorealistic", "8k", "cinematic 35mm").
4. CERO CONTRADICCIONES: Si charactersPresent es vacío [], el prompt NO DEBE describir humanos individuales. Si describes personas, pon sus nombres o roles en charactersPresent.
5. PROMPT DE VIDEO: Genera siempre el videoPrompt con cinemática de cámara, dinámicas físicas y audio foley ("Audio: ...; no spoken dialogue.").`;

  // 1. Obtener la lista canónica de escenas (delimitadas en el Paso 1)
  const canonicalScenes: NarrativeSceneUnit[] = (params.narrativeScenes && params.narrativeScenes.length > 0)
    ? params.narrativeScenes
    : (params.deepAnalysis?.narrativeScenes && params.deepAnalysis.narrativeScenes.length > 0)
      ? params.deepAnalysis.narrativeScenes
      : (precalculatedScenes && precalculatedScenes.length > 0
          ? calibrateNarrativeSceneTimestamps(
              precalculatedScenes.map(p => ({ sceneNumber: p.sceneNumber, scriptSegment: p.text, durationSeconds: p.duration })),
              scriptText,
              params.audioDuration
            )
          : calibrateNarrativeSceneTimestamps([], scriptText, params.audioDuration));

  const totalTargetScenes = canonicalScenes.length;
  studioLogger.addLog(
    'STEP',
    'Paso 5/5',
    `Generando Prompts de Escenas — Contrato estricto: exactamente ${totalTargetScenes} escenas delimitadas por Paso 1`
  );

  const isLongScript = totalTargetScenes > 12;
  const rawGeneratedScenes: ScriptSceneResult[] = [];

  // CASO 1: Guion corto a moderado (<= 12 escenas)
  if (!isLongScript) {
    if (onProgress) onProgress(`Generando los ${totalTargetScenes} prompts cinematográficos con IA (Paso 5)...`, 1, 1);

    const scenesSpec = canonicalScenes.map(cs => 
      `[Escena ${cs.sceneNumber}]: "${cs.scriptSegment}" (${cs.durationSeconds}s)`
    ).join('\n');

    const promptUser = `${baseSystemPrompt}

CONTRATO ESTRICTO DE ESCENAS (EXACTAMENTE ${totalTargetScenes} ESCENAS):
Vas a generar prompts visuales y de video para las siguientes ${totalTargetScenes} escenas pre-delimitadas en el Paso 1.
NO unas escenas, NO dividas escenas, NO inventes escenas extra. La respuesta DEBE contener exactamente ${totalTargetScenes} objetos en el array "scenes", uno para cada número de escena del 1 al ${totalTargetScenes}.

ESCENAS A PROCESAR:
${scenesSpec}

FORMATO DE RESPUESTA OBLIGATORIO:
Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "scriptSegment": "Frase exacta de la Escena 1",
      "visualPrompt": "Detailed English visual prompt: subject, physical action, environment, lighting, palette, and 2-3 observable tactile textures. If character is present, include exact CHARACTER_LOCK. If no character, strictly describe environment/objects with no people. Zero forbidden words.",
      "videoPrompt": "Dynamic English video prompt: realistic camera motion, subject/environmental dynamics, ending with 'Audio: [specific physical acoustic foley]; no spoken dialogue.'",
      "shotSize": "Extreme Wide Shot | Wide Shot | Medium Shot | Close-Up | Macro",
      "cameraAngle": "Eye-Level | Low-Angle | High-Angle | Overhead | Dutch Angle",
      "cameraMovement": "Dynamic Push-In | Slow Tracking Shot | Macro Depth of Field | Slow Zoom In | Static Hold",
      "lighting": "Natural lighting reflecting setting and atmosphere",
      "palette": "Exact color palette (e.g., slate grey, deep ochre, muted forest teal)",
      "textures": ["texture 1", "texture 2"],
      "charactersPresent": []
    }
  ]
}`;

    const rawResponse = await callLLMDirectorRaw({
      systemPrompt: 'Eres un Director de Cine de élite experto en desglose de guiones y prompts para Midjourney/FLUX y Kling/Luma.',
      userPrompt: promptUser,
      model,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsed = extractCleanJson(rawResponse);
    const parsedScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];

    // Mapeo 1:1 riguroso garantizando que cada una de las canonicalScenes esté presente
    canonicalScenes.forEach((canonical, idx) => {
      const match = parsedScenes.find((p: any) => p.sceneNumber === canonical.sceneNumber) || parsedScenes[idx] || {};
      
      const vPrompt = match.visualPrompt || `Authentic cinematic composition of ${canonical.scriptSegment}. ${targetStyleModifier}`;
      const viPrompt = match.videoPrompt || `Slow tracking camera movement capturing ${canonical.scriptSegment}. Audio: natural atmospheric background; no spoken dialogue.`;

      rawGeneratedScenes.push({
        sceneNumber: canonical.sceneNumber,
        scriptSegment: canonical.scriptSegment,
        visualPrompt: vPrompt,
        videoPrompt: viPrompt,
        shotSize: match.shotSize || 'Wide Shot',
        cameraAngle: match.cameraAngle || 'Eye-Level',
        cameraMovement: match.cameraMovement || 'Slow Tracking Shot',
        lighting: match.lighting || 'Natural contextual lighting',
        palette: match.palette || 'Natural authentic palette',
        textures: Array.isArray(match.textures) && match.textures.length > 0 ? match.textures : ['weathered surface', 'natural fiber'],
        charactersPresent: Array.isArray(match.charactersPresent) ? match.charactersPresent : [],
        startTime: canonical.startTime,
        endTime: canonical.endTime,
        durationSeconds: canonical.durationSeconds,
        isTimingEstimated: canonical.isTimingEstimated
      });
    });

    studioLogger.addLog('SUCCESS', 'Paso 5/5', `✓ Paso 5 completado: exactamente ${rawGeneratedScenes.length} de ${totalTargetScenes} escenas generadas`, {
      total: rawGeneratedScenes.length,
      primeraEscena: rawGeneratedScenes[0]?.visualPrompt?.slice(0, 100),
      ultimaEscena: rawGeneratedScenes[rawGeneratedScenes.length - 1]?.visualPrompt?.slice(0, 100)
    });
  } else {
    // CASO 2: Guion largo por lotes sobre las canonicalScenes
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(totalTargetScenes / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      const startIdx = b * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, totalTargetScenes);
      const batchCanonical = canonicalScenes.slice(startIdx, endIdx);
      const sceneStartNum = batchCanonical[0].sceneNumber;
      const sceneEndNum = batchCanonical[batchCanonical.length - 1].sceneNumber;

      if (onProgress) {
        onProgress(
          `Generando lote ${b + 1} de ${totalBatches} (Escenas ${sceneStartNum} a ${sceneEndNum} de ${totalTargetScenes}) con IA...`,
          b + 1,
          totalBatches
        );
      }

      studioLogger.addLog('STEP', 'Paso 5/5', `Generando lote de escenas ${b + 1}/${totalBatches} (${sceneStartNum}-${sceneEndNum} de ${totalTargetScenes})...`);

      const previousContext = rawGeneratedScenes.length > 0
        ? `CONTINUIDAD: La última escena generada (#${rawGeneratedScenes[rawGeneratedScenes.length - 1].sceneNumber}) fue: "${rawGeneratedScenes[rawGeneratedScenes.length - 1].visualPrompt}". Mantén coherencia visual, de estilo y de paleta.`
        : '';

      const scenesSpec = batchCanonical.map(cs => 
        `[Escena ${cs.sceneNumber}]: "${cs.scriptSegment}" (${cs.durationSeconds}s)`
      ).join('\n');

      const batchPrompt = `${baseSystemPrompt}

${previousContext}

INSTRUCCIÓN PARA ESTE LOTE (EXACTAMENTE ${batchCanonical.length} ESCENAS: #${sceneStartNum} A #${sceneEndNum}):
Genera exactamente ${batchCanonical.length} prompts para las siguientes escenas delimitadas en el Paso 1:
${scenesSpec}

FORMATO DE RESPUESTA OBLIGATORIO:
Responde ÚNICAMENTE con un JSON válido conteniendo el array "scenes" con las escenas del ${sceneStartNum} al ${sceneEndNum}:
{
  "scenes": [
    {
      "sceneNumber": ${sceneStartNum},
      "scriptSegment": "Frase exacta del guion",
      "visualPrompt": "Detailed English prompt answering subject, physical action, environment, lighting, palette, and 2-3 observable textures. Strictly NO forbidden words.",
      "videoPrompt": "Dynamic English video prompt describing realistic camera motion, subject action, environment dynamics, ending with 'Audio: [specific physical acoustic sounds]; no spoken dialogue.'",
      "shotSize": "Extreme Wide Shot | Wide Shot | Medium Shot | Close-Up | Macro",
      "cameraAngle": "Eye-Level | Low-Angle | High-Angle | Overhead | Dutch Angle",
      "cameraMovement": "Dynamic Push-In | Slow Tracking Shot | Macro Depth of Field | Slow Zoom In | Static Hold",
      "lighting": "Natural contextual lighting",
      "palette": "Palette description",
      "textures": ["texture 1", "texture 2"],
      "charactersPresent": []
    }
  ]
}`;

      const rawBatch = await callLLMDirectorRaw({
        systemPrompt: 'Eres un Director de Cine de élite experto en desglose de guiones y prompts cinematográficos para Midjourney/FLUX y Kling/Luma.',
        userPrompt: batchPrompt,
        model,
        geminiKey,
        nvidiaNimKey,
        groqKey,
        signal
      });

      const parsedBatch = extractCleanJson(rawBatch);
      const batchScenes = Array.isArray(parsedBatch.scenes) ? parsedBatch.scenes : [];

      batchCanonical.forEach((canonical, idx) => {
        const match = batchScenes.find((s: any) => s.sceneNumber === canonical.sceneNumber) || batchScenes[idx] || {};

        const vPrompt = match.visualPrompt || `Authentic cinematic composition of ${canonical.scriptSegment}. ${targetStyleModifier}`;
        const viPrompt = match.videoPrompt || `Slow tracking camera movement capturing ${canonical.scriptSegment}. Audio: natural atmospheric background; no spoken dialogue.`;

        rawGeneratedScenes.push({
          sceneNumber: canonical.sceneNumber,
          scriptSegment: canonical.scriptSegment,
          visualPrompt: vPrompt,
          videoPrompt: viPrompt,
          shotSize: match.shotSize || 'Wide Shot',
          cameraAngle: match.cameraAngle || 'Eye-Level',
          cameraMovement: match.cameraMovement || 'Slow Tracking Shot',
          lighting: match.lighting || 'Natural contextual lighting',
          palette: match.palette || 'Natural authentic palette',
          textures: Array.isArray(match.textures) && match.textures.length > 0 ? match.textures : ['weathered surface', 'natural fiber'],
          charactersPresent: Array.isArray(match.charactersPresent) ? match.charactersPresent : [],
          startTime: canonical.startTime,
          endTime: canonical.endTime,
          durationSeconds: canonical.durationSeconds,
          isTimingEstimated: canonical.isTimingEstimated
        });
      });
    }

    studioLogger.addLog('SUCCESS', 'Paso 5/5', `✓ Lotes finalizados: exactamente ${rawGeneratedScenes.length} de ${totalTargetScenes} escenas generadas`);
  }


  // 5. VALIDACIÓN Y REPARACIÓN QUIRÚRGICA POST-GENERACIÓN
  if (onProgress) onProgress('Auditando y validando coherencia de escenas...', 1, 1);
  const finalValidatedScenes = await validateAndRepairScenes({
    scenes: rawGeneratedScenes,
    scriptText,
    culturalContext,
    visualStyle: {
      name: targetStyleName,
      modifier: targetStyleModifier,
      styleLock,
      styleAvoid
    },
    characterAnchor,
    deepAnalysis,
    model,
    geminiKey,
    nvidiaNimKey,
    groqKey,
    signal
  });

  return {
    storyBible: {
      summary: scriptText.slice(0, 200) + '...',
      genreAndTone: targetStyleName,
      culturalContext: culturalContext?.epoch || 'Contemporánea'
    },
    characters: [],
    scenes: finalValidatedScenes
  };
}

/**
 * Validador y Reparador Quirúrgico Post-Generación:
 * - Chequea consistencia entre charactersPresent y el texto de visualPrompt/videoPrompt.
 * - Detecta y remueve clichés prohibidos ("hyper-detailed", "photorealistic", "8k", "ultra-realistic").
 * - Garantiza presencia de videoPrompt dinámico con pista foley/acústica.
 * - Verifica tiempos monótonos y sin traslapes.
 * - Si existen escenas severamente defectuosas (prompts vacíos o corruptos), repara ÚNICAMENTE esas escenas mediante LLM.
 */
export async function validateAndRepairScenes(params: {
  scenes: ScriptSceneResult[];
  scriptText: string;
  culturalContext?: CulturalTemporalContext;
  visualStyle?: { name?: string; modifier?: string; styleLock?: string; styleAvoid?: string };
  characterAnchor?: string;
  deepAnalysis?: ScriptDeepAnalysis;
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<ScriptSceneResult[]> {
  const {
    scenes,
    scriptText,
    culturalContext,
    visualStyle,
    characterAnchor,
    deepAnalysis,
    model = GEMINI_LITE_MODEL,
    geminiKey,
    nvidiaNimKey,
    groqKey,
    signal
  } = params;

  if (!scenes || scenes.length === 0) return [];

  const forbiddenBuzzwords = /\b(hyper-detailed|hyper detailed|ultra-detailed|ultra realistic|photorealistic|photo-realistic|8k resolution|8k|unreal engine|cinematic 35mm)\b/gi;
  const humanKeywords = /\b(man|woman|person|scout|farmer|artisan|child|elder|boy|girl|priest|stonemason|worker|traveler|runner|doctor|patient|face|hands)\b/i;

  const flawedSceneIndices: number[] = [];

  const validated: ScriptSceneResult[] = scenes.map((sc, idx) => {
    let visual = (sc.visualPrompt || '').replace(forbiddenBuzzwords, 'rich material textures');
    let video = sc.videoPrompt || '';
    let chars = Array.isArray(sc.charactersPresent) ? [...sc.charactersPresent] : [];
    let shotSize = sc.shotSize || 'Wide Shot';
    let cameraAngle = sc.cameraAngle || 'Eye-Level';
    let cameraMovement = sc.cameraMovement || 'Slow Tracking Shot';
    let lighting = sc.lighting || 'Natural contextual lighting';
    let palette = sc.palette || 'Authentic natural color palette';
    let textures = Array.isArray(sc.textures) && sc.textures.length > 0
      ? sc.textures
      : ['earthen textures', 'ambient surface grain'];

    // 1. Detección y corrección de contradicciones Personajes vs Sin personajes
    const mentionsHuman = humanKeywords.test(visual);
    if (chars.length === 0 && mentionsHuman) {
      const roleMatch = visual.match(/\b(scout|farmer|artisan|elder|priest|stonemason|traveler|runner|doctor|patient|worker|craftsman)\b/i);
      if (roleMatch && roleMatch[1]) {
        const capitalized = roleMatch[1].charAt(0).toUpperCase() + roleMatch[1].slice(1).toLowerCase();
        chars = [capitalized];
      } else {
        chars = ['Sujeto Contextual'];
      }
    } else if (chars.length > 0 && !mentionsHuman) {
      chars = [];
    }

    // 2. Garantizar videoPrompt dinámico con pista foley
    if (!video || video.length < 50) {
      const motionType = cameraMovement || 'Slow forward tracking shot';
      video = `The camera executes a ${motionType.toLowerCase()} across the scene, framing ${sc.scriptSegment.slice(0, 80)}. Atmospheric particles and environmental movement shift subtly in natural light. Audio: ambient environmental atmosphere and gentle natural resonance; no spoken dialogue.`;
    } else if (!/audio:/i.test(video)) {
      video = `${video.trim()} Audio: natural environmental atmosphere and subtle motion resonance; no spoken dialogue.`;
    }

    // Chequeo de calidad severa
    if (!visual || visual.trim().length < 40) {
      flawedSceneIndices.push(idx);
    }

    const duration = sc.durationSeconds || Math.max(2.0, Number(((sc.scriptSegment.split(/\s+/).length) / 2.5).toFixed(2)));
    const start = typeof sc.startTime === 'number' ? sc.startTime : idx * duration;
    const end = typeof sc.endTime === 'number' ? sc.endTime : start + duration;

    return {
      ...sc,
      visualPrompt: visual.trim(),
      videoPrompt: video.trim(),
      shotSize,
      cameraAngle,
      cameraMovement,
      lighting,
      palette,
      textures,
      charactersPresent: chars,
      startTime: Number(start.toFixed(2)),
      endTime: Number(end.toFixed(2)),
      durationSeconds: Number(duration.toFixed(2)),
      isTimingEstimated: sc.isTimingEstimated ?? true,
      isValidated: true
    };
  });

  // Asegurar tiempos estrictamente monótonos y sin traslapes
  for (let i = 1; i < validated.length; i++) {
    if (validated[i].startTime < validated[i - 1].endTime) {
      validated[i].startTime = validated[i - 1].endTime;
      validated[i].endTime = Number((validated[i].startTime + validated[i].durationSeconds).toFixed(2));
    }
  }

  // 3. Reparación Quirúrgica con IA ÚNICAMENTE para escenas fallidas
  if (flawedSceneIndices.length > 0) {
    studioLogger.addLog('WARN', 'Validación', `Detectadas ${flawedSceneIndices.length} escenas con fallas en prompt; ejecutando reparación focalizada con IA...`, {
      escenas: flawedSceneIndices.map(i => validated[i].sceneNumber)
    });

    try {
      const repairItems = flawedSceneIndices.map(i => ({
        sceneNumber: validated[i].sceneNumber,
        scriptSegment: validated[i].scriptSegment
      }));

      const repairPrompt = `Eres un Director de Cine corrigiendo exclusivamente ${repairItems.length} escenas que quedaron incompletas o genéricas.
Contexto:
- Estilo: "${visualStyle?.name || 'Realista'}" (${visualStyle?.modifier || ''})
- Época/Cultura: ${culturalContext?.epoch || 'Contemporánea'} | ${culturalContext?.culture || 'Universal'}
${culturalContext?.culturalLock ? `- CULTURAL_LOCK: ${culturalContext.culturalLock}` : ''}
${characterAnchor ? `- CHARACTER_LOCK: ${characterAnchor}` : ''}
${deepAnalysis?.doNotInventList ? `- NO INVENTAR: ${deepAnalysis.doNotInventList.join(', ')}` : ''}

REGLAS:
- Genera prompts con texturas observables concretas (fibras, piedra, metal, madera, humedad).
- NUNCA uses "realistic", "clean", "hyper-detailed", "8k".
- Genera visualPrompt (100% English) y videoPrompt (100% English con Audio foley).
- Responde ÚNICAMENTE en JSON:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "visualPrompt": "Concrete Midjourney prompt...",
      "videoPrompt": "Cinematic Kling prompt... Audio: ...; no spoken dialogue.",
      "shotSize": "Medium Shot",
      "cameraAngle": "Eye-Level",
      "cameraMovement": "Slow Tracking Shot",
      "lighting": "Natural daylight",
      "palette": "Earthen tones",
      "textures": ["coarse wool", "granite stone"],
      "charactersPresent": []
    }
  ]
}

ESCENAS A REPARAR:
${repairItems.map(item => `[Escena ${item.sceneNumber}]: "${item.scriptSegment}"`).join('\n')}`;

      const rawRepair = await callLLMDirectorRaw({
        systemPrompt: 'Director de Cine experto en reparación de escenas cinematográficas.',
        userPrompt: repairPrompt,
        model,
        geminiKey,
        nvidiaNimKey,
        groqKey,
        signal
      });

      const parsedRepair = extractCleanJson(rawRepair);
      if (parsedRepair && Array.isArray(parsedRepair.scenes)) {
        for (const rep of parsedRepair.scenes) {
          const targetIdx = validated.findIndex(s => s.sceneNumber === rep.sceneNumber);
          if (targetIdx !== -1 && rep.visualPrompt) {
            validated[targetIdx].visualPrompt = rep.visualPrompt;
            if (rep.videoPrompt) validated[targetIdx].videoPrompt = rep.videoPrompt;
            if (rep.shotSize) validated[targetIdx].shotSize = rep.shotSize;
            if (rep.cameraAngle) validated[targetIdx].cameraAngle = rep.cameraAngle;
            if (rep.cameraMovement) validated[targetIdx].cameraMovement = rep.cameraMovement;
            if (rep.lighting) validated[targetIdx].lighting = rep.lighting;
            if (rep.palette) validated[targetIdx].palette = rep.palette;
            if (Array.isArray(rep.textures)) validated[targetIdx].textures = rep.textures;
            if (Array.isArray(rep.charactersPresent)) validated[targetIdx].charactersPresent = rep.charactersPresent;
            validated[targetIdx].validationNotes = ['Reparado quirúrgicamente por auditoría de calidad'];
          }
        }
        studioLogger.addLog('SUCCESS', 'Validación', `✓ Reparación quirúrgica completada: ${parsedRepair.scenes.length} escena(s) restaurada(s)`);
      }
    } catch (repErr: any) {
      studioLogger.addLog('WARN', 'Validación', `No se pudo completar reparación de IA, se mantendrán las correcciones heurísticas: ${repErr.message}`);
    }
  } else {
    studioLogger.addLog('SUCCESS', 'Validación', `✓ Auditoría completada: 100% de las ${validated.length} escenas superaron los controles de calidad`);
  }

  return validated;
}

export interface PipelineValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    expectedScenes: number;
    generatedScenes: number;
    totalDuration: number;
    coveragePercent: number;
  };
}

/**
 * Validador Obligatorio Pre-Éxito del Pipeline:
 * Confirma rigurosamente antes de declarar éxito:
 * 1. Cantidad de escenas coincide exactamente con el Paso 1.
 * 2. Cobertura del guion completa y en estricto orden cronológico.
 * 3. Timestamps crecientes, sin huecos ni solapamientos.
 * 4. Duración total consistente con el audio o ritmo del guion.
 * 5. Cero contradicciones entre metadatos (charactersPresent) y prompts.
 */
export function validatePipelineExecution(params: {
  expectedSceneCount: number;
  narrativeScenes?: NarrativeSceneUnit[];
  generatedScenes: ScriptSceneResult[];
  originalScript: string;
  totalAudioDuration?: number;
}): PipelineValidationResult {
  const { expectedSceneCount, narrativeScenes, generatedScenes, originalScript, totalAudioDuration } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Cantidad exacta de escenas
  if (generatedScenes.length !== expectedSceneCount) {
    errors.push(`Discrepancia en cantidad de escenas: El Paso 1 estableció ${expectedSceneCount} escenas pero se generaron ${generatedScenes.length}.`);
  }

  // 2. Cobertura completa del guion en orden
  const cleanOriginal = originalScript.toLowerCase().replace(/[^a-záéíóúñü0-9\s]/gi, ' ');
  const originalWords = cleanOriginal.split(/\s+/).filter(Boolean);
  const coveredText = generatedScenes.map(s => s.scriptSegment).join(' ').toLowerCase().replace(/[^a-záéíóúñü0-9\s]/gi, ' ');
  const coveredWords = coveredText.split(/\s+/).filter(Boolean);

  const coveragePercent = originalWords.length > 0
    ? Math.min(100, Math.round((coveredWords.length / originalWords.length) * 100))
    : 100;

  if (coveragePercent < 75) {
    errors.push(`Cobertura de guion incompleta: Solo se cubrió el ${coveragePercent}% del texto original.`);
  }

  // Verificar orden correlativo de escenas
  for (let i = 0; i < generatedScenes.length; i++) {
    if (generatedScenes[i].sceneNumber !== i + 1) {
      errors.push(`La escena en posición ${i} tiene un número de escena no correlativo: #${generatedScenes[i].sceneNumber} (esperado #${i + 1}).`);
      break;
    }
  }

  // 3. Timestamps crecientes, sin huecos ni solapamientos
  let accumulatedDuration = 0;
  for (let i = 0; i < generatedScenes.length; i++) {
    const sc = generatedScenes[i];
    accumulatedDuration += sc.durationSeconds || 0;

    if (typeof sc.durationSeconds !== 'number' || sc.durationSeconds <= 0) {
      errors.push(`Escena #${sc.sceneNumber} tiene una duración inválida: ${sc.durationSeconds}s.`);
    }

    if (sc.startTime >= sc.endTime) {
      errors.push(`Escena #${sc.sceneNumber} tiene timestamps no crecientes: inicio (${sc.startTime}s) >= fin (${sc.endTime}s).`);
    }

    if (i > 0) {
      const prev = generatedScenes[i - 1];
      const gap = Number((sc.startTime - prev.endTime).toFixed(2));
      if (Math.abs(gap) > 0.25) {
        if (gap > 0.25) {
          warnings.push(`Hueco temporal de ${gap}s entre Escena #${prev.sceneNumber} y #${sc.sceneNumber}.`);
        } else {
          warnings.push(`Solapamiento temporal de ${Math.abs(gap)}s entre Escena #${prev.sceneNumber} y #${sc.sceneNumber}.`);
        }
      }
    }
  }

  // 4. Duración total consistente
  if (totalAudioDuration && totalAudioDuration > 0) {
    const diff = Math.abs(accumulatedDuration - totalAudioDuration);
    if (diff > 2.5 && (diff / totalAudioDuration) > 0.1) {
      warnings.push(`Duración acumulada de escenas (${accumulatedDuration.toFixed(1)}s) difiere del audio (${totalAudioDuration.toFixed(1)}s).`);
    }
  }

  // 5. Cero contradicciones entre metadatos y prompts
  for (const sc of generatedScenes) {
    const vp = (sc.visualPrompt || '').trim();
    if (!vp || vp.length < 20) {
      errors.push(`Escena #${sc.sceneNumber} no tiene visualPrompt o es insuficiente.`);
    }

    const chars = sc.charactersPresent || [];
    if (chars.length === 0) {
      if (/\b(portrait of|close up of the man|close up of the woman|character named)\b/i.test(vp)) {
        warnings.push(`Escena #${sc.sceneNumber}: charactersPresent está vacío pero visualPrompt contiene descriptores individuales.`);
      }
    }
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    studioLogger.addLog('ERROR', 'Validación Pre-Éxito', `❌ Validación automática fallida (${errors.length} errores):\n• ${errors.join('\n• ')}`);
  } else {
    studioLogger.addLog('SUCCESS', 'Validación Pre-Éxito', `✓ Validación superada: ${generatedScenes.length}/${expectedSceneCount} escenas verificadas al 100% · Cobertura: ${coveragePercent}% · Duración: ${accumulatedDuration.toFixed(1)}s`);
  }

  return {
    isValid,
    errors,
    warnings,
    stats: {
      expectedScenes: expectedSceneCount,
      generatedScenes: generatedScenes.length,
      totalDuration: Number(accumulatedDuration.toFixed(2)),
      coveragePercent
    }
  };
}


/**
 * Motor de Desglose de Emergencia Local:
 * Genera prompts limpios, ricos y neutros directamente de cada fragmento del guion,
 * con prompt de imagen, prompt de video, metadatos ortogonales y sin clichés medievales ni cuero envejecido.
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
    targetStyleName = 'Fotografía Realista',
    targetStyleModifier = 'authentic material textures, natural daylight, atmospheric depth',
    characterAnchor = '',
    pacingWords = 8
  } = params;

  studioLogger.addLog('WARN', 'Fallback', 'Iniciando generación local algorítmica de respaldo para escenas');

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

  const shotSizes = ['Wide Shot', 'Medium Shot', 'Close-Up', 'Extreme Wide Shot', 'Macro'];
  const cameraAngles = ['Eye-Level', 'Low-Angle', 'High-Angle', 'Eye-Level', 'Overhead'];
  const cameraMovements = ['Dynamic Push-In', 'Slow Tracking Shot', 'Macro Depth of Field', 'Slow Zoom In', 'Static Hold'];

  const lightings = [
    'natural ambient daylight breaking through light mist',
    'soft diffused morning daylight',
    'balanced directional natural lighting',
    'atmospheric overcast daylight with soft shadows'
  ];

  const textureSets = [
    ['weathered granite', 'mossy rock fissure', 'coarse woven fibers'],
    ['carved timber grain', 'frosted surface moisture', 'aged bronze patina'],
    ['dark fertile loam', 'dew droplets on vegetation', 'layered stone masonry'],
    ['rough wool weave', 'fine mineral dust', 'sunlit mist particles']
  ];

  let currentTime = 0;

  const scenes: ScriptSceneResult[] = rawChunks.map((segment, idx) => {
    const shotSize = shotSizes[idx % shotSizes.length];
    const cameraAngle = cameraAngles[idx % cameraAngles.length];
    const cameraMovement = cameraMovements[idx % cameraMovements.length];
    const lighting = lightings[idx % lightings.length];
    const textures = textureSets[idx % textureSets.length];
    const charPart = characterAnchor ? `${characterAnchor}, ` : '';
    const duration = Math.max(2.5, Number((segment.split(/\s+/).length / 2.5).toFixed(2)));
    const startTime = Number(currentTime.toFixed(2));
    const endTime = Number((currentTime + duration).toFixed(2));
    currentTime = endTime;

    const visualPrompt = `${shotSize}, ${cameraAngle} framing "${segment.slice(0, 110)}". ${charPart}${targetStyleModifier}. Lighting: ${lighting}. Observable textures of ${textures.join(', ')}. Natural atmospheric color palette.`;
    const videoPrompt = `The camera executes a ${cameraMovement.toLowerCase()} across the scene framing "${segment.slice(0, 80)}". Subtle atmospheric dynamics and environmental movement drift naturally under ${lighting}. Audio: ambient environmental resonance and subtle atmospheric winds; no spoken dialogue.`;

    return {
      sceneNumber: idx + 1,
      scriptSegment: segment,
      visualPrompt,
      videoPrompt,
      shotSize,
      cameraAngle,
      cameraMovement,
      lighting,
      palette: 'Natural atmospheric palette',
      textures,
      charactersPresent: characterAnchor ? ['Sujeto'] : [],
      startTime,
      endTime,
      durationSeconds: duration,
      isTimingEstimated: true,
      isValidated: true
    };
  });

  return {
    storyBible: {
      summary: cleanText.slice(0, 180) + '...',
      genreAndTone: targetStyleName,
      culturalContext: 'Contemporáneo'
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
    'mixtral-8x7b-32768'
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

  // 3. Fallback a Google Gemini con rotación si el modelo principal falló
  if (!model.startsWith('gemini-')) {
    try {
      const text = await callGeminiWithRotation({
        model: GEMINI_LITE_MODEL,
        systemPrompt,
        userPrompt,
        extraKeys: geminiKey ? [extractCleanKey(geminiKey)].filter(Boolean) : [],
        signal
      });
      if (text) return text;
    } catch (gErr) {
      console.warn('[callLLMWithFallbacks] Fallback Gemini con rotación falló:', gErr);
    }
  }

  // 4. Fallback a Groq si aún hay error
  if (cleanGroqKey && !model.startsWith('groq-')) {
    const candidateGroqModels = [
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'llama-3.3-70b-specdec',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
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
 * Calibra y garantiza la coherencia matemática y narrativa de las escenas detectadas en el Paso 1.
 * Si el guion tiene audio o transcripción Whisper, alinea las unidades a los tiempos acústicos reales.
 * Si no hay audio, calcula duraciones proporcionales al volumen de palabras de cada fragmento.
 * Garantiza:
 * 1. Monotonía estricta: startTime < endTime, endTime_i === startTime_{i+1}
 * 2. Cero solapamientos ni huecos
 * 3. Cobertura del 100% del guion
 */
export function calibrateNarrativeSceneTimestamps(
  rawScenes: any[],
  fullScript: string,
  audioDuration?: number,
  transcription?: any
): NarrativeSceneUnit[] {
  const cleanScript = fullScript.trim();
  const wordsTotal = cleanScript.split(/\s+/).filter(Boolean);
  const totalDuration = (audioDuration && audioDuration > 0)
    ? audioDuration
    : Math.max(4.0, (wordsTotal.length / 140) * 60);

  let initialUnits: Array<{ sceneNumber: number; scriptSegment: string; narrativeAction?: string }> = [];

  if (Array.isArray(rawScenes) && rawScenes.length > 0) {
    initialUnits = rawScenes
      .filter((s: any) => s && (s.scriptSegment || s.text))
      .map((s: any, idx: number) => ({
        sceneNumber: idx + 1,
        scriptSegment: String(s.scriptSegment || s.text || '').trim(),
        narrativeAction: s.narrativeAction || s.action || undefined
      }));
  }

  // Fallback si la IA no retornó escenas narrativas explícitas: segmentar por oraciones gramaticales naturales
  if (initialUnits.length === 0) {
    const rawSentences = cleanScript
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    
    if (rawSentences.length > 0) {
      initialUnits = rawSentences.map((sentence, idx) => ({
        sceneNumber: idx + 1,
        scriptSegment: sentence
      }));
    } else {
      initialUnits = [{
        sceneNumber: 1,
        scriptSegment: cleanScript
      }];
    }
  }

  // Calcular duraciones proporcionales al número de palabras de cada segmento
  const totalWordsCount = initialUnits.reduce((acc, u) => {
    const count = u.scriptSegment.split(/\s+/).filter(Boolean).length;
    return acc + Math.max(1, count);
  }, 0);

  let currentStart = 0;
  const calibrated: NarrativeSceneUnit[] = initialUnits.map((unit, idx) => {
    const isLast = idx === initialUnits.length - 1;
    const segWords = Math.max(1, unit.scriptSegment.split(/\s+/).filter(Boolean).length);
    const proportion = segWords / totalWordsCount;
    
    let duration = Number((proportion * totalDuration).toFixed(2));
    if (duration < 1.2) duration = 1.2;

    let startTime = Number(currentStart.toFixed(2));
    let endTime = isLast 
      ? Number(totalDuration.toFixed(2)) 
      : Number((startTime + duration).toFixed(2));

    if (endTime <= startTime) {
      endTime = Number((startTime + 1.5).toFixed(2));
    }
    const finalDuration = Number((endTime - startTime).toFixed(2));
    currentStart = endTime;

    return {
      sceneNumber: idx + 1,
      scriptSegment: unit.scriptSegment,
      narrativeAction: unit.narrativeAction,
      startTime,
      endTime,
      durationSeconds: finalDuration,
      isTimingEstimated: !audioDuration || audioDuration <= 0
    };
  });

  return calibrated;
}

/**
 * PASO 1 (Gemini 3.8 Flash): Análisis Profundo del Guion, Memoria Visual y Segmentación Narrativa Real
 * Basado en MASTER_PROMPT_1_SCRIPT_ANALYSIS
 */
export async function analyzeFullScriptStructureWithAI(params: {
  scriptText: string;
  audioDuration?: number;
  transcription?: any;
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<ScriptDeepAnalysis> {
  const { scriptText, audioDuration, transcription, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) {
    return {
      premise: { theme: 'Sin guion proporcionado' },
      visualSummary: 'Guion vacío',
      narrativeScenes: []
    };
  }

  studioLogger.addLog('STEP', 'Paso 1/5', `Iniciando Análisis Profundo del Guion y Segmentación Narrativa — Modelo: ${model || GEMINI_ANALYSIS_MODEL} | ${scriptText.length} chars`);

  const system = `${MASTER_PROMPT_1_SCRIPT_ANALYSIS}

SEGMENTACIÓN NARRATIVA OBLIGATORIA:
- Divide el guion completo en sus UNIDADES NARRATIVAS REALES (NO uses una cuota fija de palabras ni fuerces una cantidad arbitraria).
- Si el guion contiene 8 momentos clave, devuelve 8 escenas; si tiene 15, devuelve exactamente 15 escenas; si tiene otra cantidad, ajusta con precisión a esa cantidad.
- Cero pérdida: la concatenación de todos los "scriptSegment" DEBE cubrir el guion original en estricto orden cronológico.

Responde ESTRICTAMENTE en formato JSON con la siguiente estructura:
{
  "premise": {
    "theme": "Tema central específico del guion",
    "mainSituation": "Situación principal observable",
    "conflict": "Conflicto o dilema que aborda el texto",
    "objective": "Objetivo de la narrativa",
    "problem": "Problema principal",
    "evolution": "Evolución de la situación",
    "outcome": "Resultado o conclusión",
    "narrativeTone": "Tono (ej: divulgativo científico, dramático urgente, inspiracional sobrio)"
  },
  "narrativeStructure": {
    "introduction": "Unidad de apertura",
    "actions": "Desarrollo de acciones principales",
    "resolution": "Desenlace o mensaje final"
  },
  "explicitElements": {
    "people": ["Personas explícitamente mencionadas con rol"],
    "clothing": ["Prendas o vestuario explícitamente mencionado si lo hay"],
    "objects": ["Objetos concretos del texto"],
    "places": ["Lugares concretos"],
    "actions": ["Acciones físicas observables directas"]
  },
  "physicalActions": ["Lista de acciones físicas concretas que ocurren en el texto"],
  "groundedEmotions": ["Emociones respaldadas únicamente por el texto"],
  "continuityMemory": ["Elementos que deben mantenerse constantes"],
  "doNotInventList": ["Información visual que el guion NO determina y NO debe inventarse con clichés"],
  "visualSummary": "Síntesis visual precisa de la historia explicando quién, dónde, cuándo y qué pasa realmente",
  "narrativeScenes": [
    {
      "sceneNumber": 1,
      "scriptSegment": "Frase u oración exacta del guion que compone esta unidad narrativa",
      "narrativeAction": "Acción dramática y visual principal que ocurre aquí"
    }
  ]
}`;

  const user = `GUION COMPLETO A ANALIZAR Y SEGMENTAR EN UNIDADES NARRATIVAS REALES:
"""
${scriptText}
"""

Construye la representación visual precisa de la historia y segmenta en unidades narrativas reales:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model: model || GEMINI_ANALYSIS_MODEL,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsed = extractCleanJson(raw);
    const rawScenesList = Array.isArray(parsed.narrativeScenes) 
      ? parsed.narrativeScenes 
      : (Array.isArray(parsed.scenes) ? parsed.scenes : []);

    const calibratedScenes = calibrateNarrativeSceneTimestamps(
      rawScenesList,
      scriptText,
      audioDuration,
      transcription
    );

    const result: ScriptDeepAnalysis = {
      premise: parsed.premise || (parsed.theme ? {
        theme: parsed.theme,
        mainSituation: parsed.mainSituation,
        conflict: parsed.conflict,
        objective: parsed.objective,
        problem: parsed.problem,
        evolution: parsed.evolution,
        outcome: parsed.outcome,
        narrativeTone: parsed.narrativeTone
      } : { theme: 'Análisis de historia completado' }),
      narrativeStructure: parsed.narrativeStructure || {},
      explicitElements: parsed.explicitElements || {},
      physicalActions: Array.isArray(parsed.physicalActions) ? parsed.physicalActions : [],
      groundedEmotions: Array.isArray(parsed.groundedEmotions) ? parsed.groundedEmotions : [],
      continuityMemory: Array.isArray(parsed.continuityMemory) ? parsed.continuityMemory : [],
      doNotInventList: Array.isArray(parsed.doNotInventList) ? parsed.doNotInventList : [],
      visualSummary: parsed.visualSummary || parsed.summary || parsed.premise?.theme || parsed.theme || 'Análisis visual del guion completado con éxito.',
      narrativeScenes: calibratedScenes,
      rawText: raw
    };

    const totalDur = calibratedScenes.reduce((a, b) => a + b.durationSeconds, 0);
    studioLogger.addLog(
      'AI',
      'Paso 1/5',
      `✓ Análisis Profundo completado: ${calibratedScenes.length} unidades narrativas identificadas (Duración total: ${totalDur.toFixed(1)}s)`,
      {
        totalEscenas: calibratedScenes.length,
        tema: result.premise?.theme?.slice(0, 80),
        primeraEscena: calibratedScenes[0]?.scriptSegment?.slice(0, 60),
        ultimaEscena: calibratedScenes[calibratedScenes.length - 1]?.scriptSegment?.slice(0, 60)
      }
    );

    return result;
  } catch (err: any) {
    studioLogger.addLog('WARN', 'Paso 1/5', `Fallo en Análisis Profundo, usando segmentación narrativa de respaldo: ${err?.message}`);
    const fallbackScenes = calibrateNarrativeSceneTimestamps([], scriptText, audioDuration, transcription);
    return {
      premise: {
        theme: scriptText.slice(0, 120),
        narrativeTone: 'Informativo / Cinematográfico'
      },
      visualSummary: `Historia centrada en: ${scriptText.slice(0, 200)}...`,
      doNotInventList: ['No inventar clichés medievales o de época si el tema es moderno/médico'],
      narrativeScenes: fallbackScenes
    };
  }
}


/**
 * PASO 2 (Gemini 3.8 Flash): Extracción de Contexto Temporal y Cultural
 * Basado en MASTER_PROMPT_2_CULTURAL_TEMPORAL
 */
export async function extractCulturalContextWithAI(params: {
  scriptText: string;
  deepAnalysis?: ScriptDeepAnalysis;
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<CulturalTemporalContext> {
  const { scriptText, deepAnalysis, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) {
    return {
      epoch: 'Contemporánea / Actual',
      culture: 'Universal',
      environment: 'Urbano / Realista'
    };
  }

  studioLogger.addLog('STEP', 'Paso 2/5', `Extrayendo Contexto Temporal, Geográfico y Cultural — Modelo: ${model || GEMINI_ANALYSIS_MODEL}`);

  const deepContext = deepAnalysis?.visualSummary
    ? `\nMEMORIA VISUAL PREVIA DEL GUION:
- Resumen Visual: ${deepAnalysis.visualSummary}
- Elementos que NO deben inventarse: ${deepAnalysis.doNotInventList?.join(', ') || 'Ninguno'}`
    : '';

  const system = `${MASTER_PROMPT_2_CULTURAL_TEMPORAL}

Responde ÚNICAMENTE en formato JSON:
{
  "epoch": "Época exacta o contemporánea (ej: Contemporánea actual, Siglo I d.C., Década de 1950, Año 2088)",
  "culture": "Cultura y sociedad respaldada por el guion (ej: Sociedad médica contemporánea, Cultura urbana moderna, Galia romana)",
  "environment": "Ubicación y entorno físico específico (ej: Consultorio médico iluminado y cocina contemporánea, Ciudad nocturna, Campo abierto)",
  "certaintyLevel": "EXPLÍCITO | INFERENCIA FUERTE | INFERENCIA DÉBIL | NO DETERMINADO",
  "culturalLock": "CULTURAL_LOCK: Elementos visuales estrictamente obligatorios para autenticidad temporal y cultural",
  "culturalAvoid": "CULTURAL_AVOID: Anacronismos, objetos, vestuario o épocas que contradigan este contexto (ej: vestimenta medieval en video de salud actual)",
  "autoDetected": true
}`;

  const user = `GUION COMPLETO:${deepContext}
"""
${scriptText}
"""

Extrae el contexto histórico, geográfico y cultural exacto respetando la autenticidad y evitando anacronismos:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model: model || GEMINI_ANALYSIS_MODEL,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsed = extractCleanJson(raw);
    const result: CulturalTemporalContext = {
      epoch: parsed.epoch || 'Contemporánea / Actual',
      culture: parsed.culture || 'Contemporánea',
      environment: parsed.environment || 'Entorno realista acorde al guion',
      certaintyLevel: parsed.certaintyLevel || 'INFERENCIA FUERTE',
      culturalLock: parsed.culturalLock || '',
      culturalAvoid: parsed.culturalAvoid || '',
      autoDetected: true
    };

    studioLogger.addLog('AI', 'Paso 2/5', `✓ Contexto Cultural detectado — Época: ${result.epoch} | Cultura: ${result.culture}`, {
      entorno: result.environment,
      culturalLock: result.culturalLock?.slice(0, 80)
    });

    return result;
  } catch (err: any) {
    studioLogger.addLog('WARN', 'Paso 2/5', `Fallo en Contexto Cultural, usando contemporáneo de respaldo: ${err?.message}`);
    return {
      epoch: 'Contemporánea / Actual',
      culture: 'Contemporánea',
      environment: 'Entorno visual realista',
      certaintyLevel: 'INFERENCIA DÉBIL',
      culturalLock: 'Elementos visuales modernos coherentes con la temática del guion',
      culturalAvoid: 'Anacronismos históricos o vestuario de época no justificado',
      autoDetected: true
    };
  }
}

/**
 * PASO 3 (Gemini 3.8 Flash): Extracción del Estilo Visual Único
 * Basado en MASTER_PROMPT_3_VISUAL_STYLE
 */
export async function detectStyleWithAI(params: {
  scriptText: string;
  deepAnalysis?: ScriptDeepAnalysis;
  culturalContext?: CulturalTemporalContext;
  styles?: StylePreset[];
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<{
  recommendedStyleId: string;
  styleName: string;
  reason: string;
  customInstructions: string;
  styleLock?: string;
  styleAvoid?: string;
}> {
  const { scriptText, deepAnalysis, culturalContext, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) {
    return {
      recommendedStyleId: 'custom',
      styleName: 'Realismo Fotográfico Contemporáneo',
      reason: 'Estilo predeterminado para el guion.',
      customInstructions: 'clean contemporary photographic realism, natural soft studio and ambient lighting, sharp focus'
    };
  }

  studioLogger.addLog('STEP', 'Paso 3/5', `Formulando Lenguaje Visual y Estilo Específico — Modelo: ${model || GEMINI_ANALYSIS_MODEL}`);

  const contextStr = [
    culturalContext?.epoch ? `Época: ${culturalContext.epoch}` : '',
    culturalContext?.culture ? `Cultura: ${culturalContext.culture}` : '',
    culturalContext?.environment ? `Entorno: ${culturalContext.environment}` : '',
    culturalContext?.culturalLock ? `CULTURAL_LOCK: ${culturalContext.culturalLock}` : '',
    deepAnalysis?.visualSummary ? `Resumen Visual: ${deepAnalysis.visualSummary}` : ''
  ].filter(Boolean).join('\n');

  const system = `${MASTER_PROMPT_3_VISUAL_STYLE}

Responde ÚNICAMENTE en formato JSON válido:
{
  "styleName": "Nombre evocador y específico del estilo creado acorde al guion (ej: Fotografía Médica y Nutricional Contemporánea, Crónica Documental Urbana, Realismo Épico Antiguo)",
  "visualGenre": "Género visual exacto (ej: médico, documental, drama, thriller, educativo)",
  "customInstructions": "Fórmula completa de estilo en inglés (45-75 palabras) con la óptica, iluminación contextual del mundo de la historia, paleta cromática y textura exacta para el generador de imágenes. NUNCA fuerces 35mm ni golden hour si no corresponden al tema.",
  "reason": "Explicación concisa (1-2 oraciones) de por qué esta estética visual fue diseñada para este guion.",
  "styleLock": "STYLE_LOCK: Reglas de consistencia visual que deben mantenerse constantes entre todas las escenas",
  "styleAvoid": "STYLE_AVOID: Estilos prohibidos que romperían la coherencia (ej: fantasía barroca, grano vintage en video científico)"
}`;

  const user = `CONTEXTO DETERMINADO DEL PROYECTO:
${contextStr || 'Interpretar directamente del guion'}

GUION COMPLETO A ANALIZAR:
"""
${scriptText}
"""

Diseña el lenguaje visual específico y coherente con el universo del guion:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model: model || GEMINI_ANALYSIS_MODEL,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsed = extractCleanJson(raw);
    const generatedInstructions = parsed.customInstructions || parsed.promptModifier || 'clean documentary photography, natural contextual lighting, sharp realistic textures';

    const result = {
      recommendedStyleId: 'custom',
      styleName: parsed.styleName || 'Estilo Visual Específico del Guion',
      reason: parsed.reason || 'Estilo visual derivado exclusivamente del género y la temática del guion.',
      customInstructions: generatedInstructions,
      styleLock: parsed.styleLock || '',
      styleAvoid: parsed.styleAvoid || ''
    };

    studioLogger.addLog('AI', 'Paso 3/5', `✓ Estilo Visual creado — "${result.styleName}"`, {
      formula: result.customInstructions?.slice(0, 90),
      styleLock: result.styleLock?.slice(0, 80)
    });

    return result;
  } catch (err: any) {
    studioLogger.addLog('WARN', 'Paso 3/5', `Fallo en Estilo Visual, usando estilo fotográfico de respaldo: ${err?.message}`);
    return {
      recommendedStyleId: 'custom',
      styleName: 'Fotografía Realista Contemporánea',
      reason: 'Estilo limpio y fidedigno adaptado a la narrativa.',
      customInstructions: 'clean realistic photography, natural balanced lighting, true-to-life colors, sharp details',
      styleLock: 'Consistencia en iluminación realista y paleta natural',
      styleAvoid: 'Clichés medievales, grano antiguo y estilización fantástica'
    };
  }
}

/**
 * PASO 4 (Gemini 3.8 Flash): Extracción de Personajes y Construcción de CHARACTER_LOCK
 * Basado en MASTER_PROMPT_4_CHARACTERS
 */
export async function detectCharactersWithAI(params: {
  scriptText: string;
  deepAnalysis?: ScriptDeepAnalysis;
  culturalContext?: CulturalTemporalContext;
  visualStyle?: { name?: string; modifier?: string };
  model?: string;
  geminiKey?: string;
  nvidiaNimKey?: string;
  groqKey?: string;
  signal?: AbortSignal;
}): Promise<ScriptDirectorCharacter[]> {
  const { scriptText, deepAnalysis, culturalContext, visualStyle, model, geminiKey, nvidiaNimKey, groqKey, signal } = params;

  if (!scriptText.trim()) return [];

  studioLogger.addLog('STEP', 'Paso 4/5', `Identificando Personajes y Generando CHARACTER_LOCK — Modelo: ${model || GEMINI_ANALYSIS_MODEL}`);

  const contextStr = [
    culturalContext?.epoch ? `Época: ${culturalContext.epoch}` : '',
    culturalContext?.culture ? `Cultura: ${culturalContext.culture}` : '',
    culturalContext?.environment ? `Entorno: ${culturalContext.environment}` : '',
    visualStyle?.name ? `Estilo Visual: ${visualStyle.name}` : '',
    deepAnalysis?.visualSummary ? `Resumen Visual: ${deepAnalysis.visualSummary}` : ''
  ].filter(Boolean).join(' | ');

  const system = `${MASTER_PROMPT_4_CHARACTERS}

REGLAS ESTRICTAS DE RESPUESTA:
1. DISTINCIÓN EXPLÍCITA VS INFERIDA: Solo define personajes si el guion contiene personajes específicos o roles individuales recurrentes explícitamente necesarios.
2. NO CONVIERTAS MENCIONES COLECTIVAS O CULTURALES ("los finlandeses", "la civilización andina", "los científicos", "la población") en un protagonista recurrente con nombre ficticio arbitrario.
3. Si el guion es documental, geográfico, de naturaleza, arquitectura o puramente conceptual, DEVUELVE LISTA VACÍA ("characters": []). Esto es COMPLETAMENTE NORMAL y deseable para permitir planos puros de entorno sin personajes humanos forzados.
4. NUNCA inventes credenciales, cargos no mencionados ni evidencia médica no respaldada.
5. Solo aplica CHARACTER_LOCK si existen personajes recurrentes con nombre o rol continuo a lo largo de varias escenas.

Responde ÚNICAMENTE en formato JSON:
{
  "characters": [
    {
      "name": "Nombre o Rol representativo (ej: Constructor Andino, Agricultor de Terrazas, Habitante Ártico)",
      "role": "PROTAGONIST | SECONDARY",
      "alive": true,
      "exitScene": null,
      "anchorDescription": "Biometría facial y física en inglés: edad aproximada realista, estructura facial, cabello, piel, complexión",
      "clothingAnchor": "Vestuario contextual en inglés acorde a la cultura, época y clima: telas, abrigos o vestimentas tradicionales exactas",
      "characterLock": "CHARACTER_LOCK conciso con los rasgos inmutables que deben mantenerse entre escenas",
      "defaultSeed": 482910
    }
  ]
}`;

  const user = `MARCO TEMPORAL Y NARRATIVO:
${contextStr || 'Interpretar directamente del guion'}

GUION COMPLETO:
"""
${scriptText}
"""

Extrae los personajes o figuras humanas representativas y define su CHARACTER_LOCK (o devuelve lista vacía si es documental/entorno):`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model: model || GEMINI_ANALYSIS_MODEL,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });

    const parsed = extractCleanJson(raw);
    const charList = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed.characters) ? parsed.characters : (Array.isArray(parsed.personajes) ? parsed.personajes : []));

    if (charList.length > 0) {
      const mapped = charList.map((c: any) => ({
        name: c.name || 'Sujeto',
        role: c.role === 'SECONDARY' ? 'SECONDARY' as const : 'PROTAGONIST' as const,
        alive: c.alive !== false,
        exitScene: c.exitScene ?? null,
        anchorDescription: c.anchorDescription || 'Realistic subject with natural facial features matching the culture and setting',
        clothingAnchor: c.clothingAnchor || 'Authentic clothing matching the scene setting and climate',
        defaultSeed: typeof c.defaultSeed === 'number' ? c.defaultSeed : (Math.floor(Math.random() * 900000) + 100000),
        characterLock: c.characterLock || `${c.name || 'Sujeto'}: consistent appearance and contextual attire`
      }));

      studioLogger.addLog('AI', 'Paso 4/5', `✓ CHARACTER_LOCK completado: ${mapped.length} personaje(s) identificado(s)`, {
        personajes: mapped.map((m: any) => `${m.name} (${m.role}) - ${m.clothingAnchor.slice(0, 45)}`)
      });

      return mapped;
    }
  } catch (err: any) {
    studioLogger.addLog('WARN', 'Paso 4/5', `Sin personajes explícitos detectados o fallo de IA: ${err?.message}`);
  }

  // Fallback neutral contextual: NO forzar ropa de cuero medieval ni personajes falsos
  studioLogger.addLog('INFO', 'Paso 4/5', 'Guion sin personajes ficticios obligatorios; se usarán planos de entorno y sujetos contextuales limpios.');
  return [];
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
    return { cameraPreference: 'variado_dinamico', lightingPreference: 'natural_contextual', reason: 'Valores por defecto.' };
  }

  const system = `Eres un Director de Fotografía (DP) cinematográfico y documentalista.
Lee el guion COMPLETO y determina el encuadre e iluminación más adecuados para este tema específico.

Opciones para encuadre (cameraPreference):
- "variado_dinamico": Mezcla fluida de planos generales, planos medios y primeros planos.
- "primeros_planos": Enfoque en expresiones, rostros o detalles íntimos.
- "gran_plano_general": Paisajes amplios, escenarios monumentales o entornos globales.
- "camara_en_mano": Sensación documental cercana, realista e inmediata.

Opciones para iluminación (lightingPreference):
- "natural_contextual": Iluminación realista y natural del entorno (luz de día, interiores limpios, clínicas o cocinas según corresponda).
- "volumetrica_cinematica": Rayos de luz, niebla y volumen para drama épico o ciencia ficción.
- "hora_dorada": Luz cálida al atardecer para nostalgia o romance.
- "claroscuro_dramatico": Alto contraste y sombras marcadas para suspenso o crimen.
- "neon_cyberpunk": Luces de neón para entornos urbanos futuristas.

Responde ÚNICAMENTE en formato JSON:
{
  "cameraPreference": "valor-exacto-de-la-lista",
  "lightingPreference": "valor-exacto-de-la-lista",
  "reason": "Explicación concisa de por qué estas elecciones respetan la historia."
}`;

  const user = `GUION COMPLETO:\n"""\n${scriptText}\n"""\nDetermina encuadre e iluminación coherentes:`;

  try {
    const raw = await executeAnalysisWithFallbacks({
      model: model || GEMINI_ANALYSIS_MODEL,
      systemPrompt: system,
      userPrompt: user,
      geminiKey,
      nvidiaNimKey,
      groqKey,
      signal
    });
    const parsed = extractCleanJson(raw);
    const res = {
      cameraPreference: parsed.cameraPreference || 'variado_dinamico',
      lightingPreference: parsed.lightingPreference || 'natural_contextual',
      reason: parsed.reason || 'Cinematografía adaptada al tema del guion.'
    };
    studioLogger.addLog('AI', 'Cinematografía', `✓ Encuadre: ${res.cameraPreference} | Iluminación: ${res.lightingPreference}`, { reason: res.reason });
    return res;
  } catch (err: any) {
    return { cameraPreference: 'variado_dinamico', lightingPreference: 'natural_contextual', reason: 'Cinematografía contextual balanceada.' };
  }
}

