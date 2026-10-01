
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Scene, AutoPacingConfig } from '../types';
import { isSubscriptionActive, triggerSubscriptionModal } from './subscriptionService';

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}

export class InvalidArgumentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidArgumentError';
    }
}

/**
 * Helper: Sanitizes API keys to prevent HTTP header errors.
 * Removes whitespace, newlines, and non-ASCII characters that cause "non iso-8859-1" errors.
 */
export const cleanApiKey = (key: string): string => {
    if (!key) return '';
    // Keep only printable ASCII characters (remove emojis, hidden controls, accents, etc)
    // Range 0x21-0x7E excludes space (0x20) and delete (0x7F) and all control chars.
    return key.replace(/[^\x21-\x7E]/g, '').trim();
};

/**
 * Helper function to robustly extract and parse JSON from AI responses.
 * It handles markdown code blocks (```json ... ```) and raw text.
 */
const extractAndParseJson = (text: string | undefined): any => {
    if (!text) return [];
    
    // 1. Remove markdown code blocks and whitespace
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
        // 2. Attempt direct parsing
        return JSON.parse(cleanText);
    } catch (error) {
        // 3. Fallback: Try to find the JSON array or object structure via Regex
        // This helps if there is intro/outro text outside the code blocks
        const jsonMatch = cleanText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                // Nested failure, throw original error
            }
        }
        
        console.error("Failed to parse JSON. Raw text:", text);
        throw new Error(`AI response was not valid JSON. Content: ${text.substring(0, 50)}...`);
    }
};

/**
 * Helper function to retry Gemini API requests with exponential backoff and smart 429 handling.
 */
async function retryGeminiRequest<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3, // Reduced to 3 to fail faster on hard network errors but still catch glitches
    initialDelay: number = 2000
): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            
            // Analyze error for retryable conditions
            const errorMessage = error.message ? error.message.toLowerCase() : '';
            const isOverloaded = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable');
            const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('resource_exhausted');
            // Catch "TypeError: Failed to fetch" which is the browser's generic network error
            const isNetworkError = errorMessage.includes('failed to fetch') || errorMessage.includes('network error');
            
            // Also check standard status properties if available
            const status = error.status || error.code;
            const isStatusRetryable = status === 503 || status === 429;

            if (attempt < maxRetries && (isOverloaded || isRateLimit || isStatusRetryable || isNetworkError)) {
                let delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
                
                // SMART RETRY: Extract "retry in X s" from error message if available
                const waitTimeMatch = errorMessage.match(/retry in (\d+(\.\d+)?)s/);
                if (waitTimeMatch && waitTimeMatch[1]) {
                    const serverRequestedWait = parseFloat(waitTimeMatch[1]) * 1000;
                    // Wait the requested time + 1 second buffer
                    delay = Math.max(delay, serverRequestedWait + 1000);
                    console.warn(`Server requested wait. Adjusting delay to ${delay}ms`);
                }

                const reason = isOverloaded ? 'Model Overloaded' : (isNetworkError ? 'Network Error' : 'Rate Limit');
                console.warn(`Gemini API request failed (${reason}). Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            // If not retryable or retries exhausted, throw immediately
            throw error;
        }
    }
    throw lastError;
}

export const detectLanguage = async (apiKey: string, textToDetect: string): Promise<string> => {
    const cleanKey = cleanApiKey(apiKey);
    if (!cleanKey) throw new Error("API Key inválida (vacía después de limpieza).");
    
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Detect the language of the following text. Respond with only the name of the language in English (e.g., 'Spanish', 'French', 'English').\n\nText: "${textToDetect}"`,
        }));
        return response.text ? response.text.trim() : "English";
    } catch (error) {
        console.error("Language detection failed:", error);
        return "English"; // Fallback to English
    }
};

const calculateTargetScenesForParagraph = (
    text: string, 
    currentGlobalWordCount: number, // Changed from index to global word count
    config: AutoPacingConfig
): { targetCount: number, newWordCount: number, estimatedDuration: number } => {
    const words = text.trim().split(/\s+/);
    const wordCount = words.length;
    
    // Velocidad promedio de lectura (palabras por segundo) ~160 wpm
    const READING_SPEED_WPS = 2.66; 
    
    const estimatedAudioDuration = wordCount / READING_SPEED_WPS;
    
    // Determinar si estamos en el Hook según la configuración (50 o 100 palabras)
    const hookThreshold = config.hookThresholdWords || 50;
    
    // REGLA DE ORO: Determinar el rango aplicable
    let minSecondsPerImage: number;
    let maxSecondsPerImage: number;

    // Si el texto empieza antes del umbral, aplicamos reglas de Hook (simplificación aceptable)
    if (currentGlobalWordCount < hookThreshold) {
        // Hook Phase
        minSecondsPerImage = config.hookMinSeconds;
        maxSecondsPerImage = config.hookMaxSeconds;
    } else {
        // Body Phase
        minSecondsPerImage = config.restMinSeconds;
        maxSecondsPerImage = config.restMaxSeconds;
    }

    // Calcular el promedio ideal
    const targetSecondsPerImage = (minSecondsPerImage + maxSecondsPerImage) / 2;
    
    // Cálculo inicial de escenas
    const rawTarget = estimatedAudioDuration / targetSecondsPerImage;
    let targetCount = Math.round(rawTarget);
    
    // VALIDACIÓN ESTRICTA: Ninguna escena debe durar menos del mínimo permitido para esa sección
    // Si duracion_total / cantidad_escenas < min_permitido, reducimos cantidad de escenas.
    if (targetCount > 0) {
        while ((estimatedAudioDuration / targetCount) < minSecondsPerImage && targetCount > 1) {
            targetCount--;
        }
    }
    
    // Asegurar mínimo 1 escena si hay texto
    const safeTarget = Math.max(1, targetCount);

    return { targetCount: safeTarget, newWordCount: currentGlobalWordCount + wordCount, estimatedDuration: estimatedAudioDuration };
};


export const analyzeScriptAndGenerateScenes = async (
    apiKey: string,
    fullScriptText: string,
    styleInstructions: string,
    pacingConfig: AutoPacingConfig,
    masterPrompt?: string,
    referenceImages?: { mimeType: string; data: string }[]
): Promise<{ script_segment: string; visual_prompt: string; paragraph_index: number }[]> => {
    
    // 1. PRE-PROCESAMIENTO: Fusión Inteligente de Párrafos
    // Dividimos por líneas nuevas
    const rawParagraphs = fullScriptText.split(/\n+/).filter(p => p.trim().length > 0);
    
    // Payload final optimizado
    const mergedPayload: { paragraph: string; index: number, sceneCount: number }[] = [];
    
    let globalWordCount = 0;
    let currentBlockText = "";
    const READING_SPEED_WPS = 2.66;

    // Iteramos para construir bloques que cumplan con la duración mínima ESTRICTA
    for (const rawText of rawParagraphs) {
        
        // Añadimos el texto actual al bloque acumulado
        const tentativeBlock = currentBlockText ? currentBlockText + " " + rawText : rawText;
        const tentativeWords = tentativeBlock.trim().split(/\s+/).length;
        const tentativeDuration = tentativeWords / READING_SPEED_WPS;
        
        // Determinar mínimo requerido según fase (Hook vs Body)
        // Usamos globalWordCount (del inicio del bloque) para saber la regla
        const hookThreshold = pacingConfig.hookThresholdWords || 50;
        const minDurationRequired = (globalWordCount < hookThreshold) 
            ? pacingConfig.hookMinSeconds 
            : pacingConfig.restMinSeconds;
            
        // Si el bloque acumulado YA cumple el mínimo absoluto, lo cerramos y procesamos.
        // NOTA: Esto solo asegura que el bloque TOTAL tenga la duración mínima.
        // Luego calculateTargetScenesForParagraph decidirá si dividirlo en más escenas si es muy largo.
        if (tentativeDuration >= minDurationRequired) {
            // Calculamos escenas para este bloque validado
            const { targetCount, newWordCount } = calculateTargetScenesForParagraph(tentativeBlock, globalWordCount, pacingConfig);
            
            mergedPayload.push({
                paragraph: tentativeBlock,
                index: mergedPayload.length, // Nuevo índice secuencial
                sceneCount: targetCount
            });
            
            // Avanzamos contadores
            globalWordCount = newWordCount;
            currentBlockText = ""; // Reset
        } else {
            // No cumple el mínimo, seguimos acumulando para la siguiente iteración
            currentBlockText = tentativeBlock;
            // No actualizamos globalWordCount todavía porque no hemos "emitido" el bloque
        }
    }
    
    // Si quedó algo en el buffer (último párrafo corto), lo añadimos forzosamente
    // AUNQUE NO CUMPLA EL MÍNIMO (no hay con qué más unirlo)
    if (currentBlockText.trim().length > 0) {
        const { targetCount, newWordCount } = calculateTargetScenesForParagraph(currentBlockText, globalWordCount, pacingConfig);
        mergedPayload.push({
            paragraph: currentBlockText,
            index: mergedPayload.length,
            sceneCount: targetCount
        });
        globalWordCount = newWordCount;
    }
    
    // 2. ENVÍO A LA IA
    const { resultsByParagraph } = await generatePromptsForParagraphsBatch(
        apiKey,
        mergedPayload,
        fullScriptText,
        styleInstructions,
        referenceImages
    );

    // 3. APLANAR RESULTADOS
    return mergedPayload.flatMap(p => {
        const index = p.index;
        const segments = resultsByParagraph[index] || []; 
        return segments.map(seg => ({
            ...seg,
            paragraph_index: index // Mantenemos el índice del bloque fusionado
        }));
    });
};

export const generatePromptsForParagraphsBatch = async (
    apiKey: string,
    paragraphsWithDetails: { paragraph: string; index: number, sceneCount: number | 'auto' }[], // Allow 'auto' passed from main
    fullScriptContext: string,
    styleInstructions: string,
    referenceImages?: { mimeType: string; data: string }[]
): Promise<{ resultsByParagraph: { script_segment: string, visual_prompt: string }[][]; originalIndices: number[] }> => {
    // Validación de seguridad de backend/servicio: rechazar llamadas no autorizadas
    if (!isSubscriptionActive()) {
        triggerSubscriptionModal({ featureName: 'Generación con Google Gemini' });
        throw new Error('Suscripción no activa. Necesitas tener una suscripción activa dentro de la Academia de Skool para utilizar esta función.');
    }

    // IMPORTANT: Clean Key here
    const cleanKey = cleanApiKey(apiKey);
    if (!cleanKey) throw new Error("API Key inválida (vacía después de limpieza).");
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    
    // Construct the batch prompt
    const numberedParagraphs = paragraphsWithDetails.map(p => {
        // If sceneCount is 'auto' (shouldn't happen if calculated before, but for safety), treat as 1
        const count = p.sceneCount === 'auto' ? 1 : p.sceneCount;
        return `PARAGRAPH_ID_${p.index} [REQUIRED_SCENES: ${count}]:\n"${p.paragraph}"`;
    }).join('\n\n');

    const hasImages = referenceImages && referenceImages.length > 0;

    let styleSection = "";
    let imageAdherenceInstruction = "";

    if (hasImages) {
        // --- MODE: REFERENCE IMAGES ARE PRESENT (STRICT FORENSIC CLONING) ---
        styleSection = `
        **VISUAL SOURCE: FORENSIC CLONING PROTOCOL (HIGHEST PRIORITY)**
        You have attached Reference Images. Your task is to act as a Forensic Image Analyst and Creative Director.
        
        **1. ANALYZE THE MEDIUM & QUALITY (Technical DNA):**
        Look at the images. What are they *exactly*?
        - **Photography?** (DSLR, Mirrorless, Phone Camera, Vintage Film, Polaroid?)
        - **3D Render?** (Unreal Engine 5, Pixar style, Low poly, Claymation?)
        - **Illustration?** (Oil painting, Sketch, Anime, Digital Art, Watercolor?)
        - **Quality/Texture:** Is it grainy? Blurry? High ISO noise? Compression artifacts? 8K crisp?
        - **Lighting:** Hard flash (paparazzi style)? Soft natural light? Neon studio?
        
        **2. CLONE THE STYLE:**
        If the reference image is a "grainy, blurry photo taken with an old phone", ALL your prompts MUST describe "grainy, blurry photo taken with an old phone". Do NOT improve the quality. 
        If the reference is "High-end 3D animation", ALL prompts must be "High-end 3D animation".
        
        **3. EXTRACT SUBJECT DNA:**
        Identify the main character/subject details (Species, Clothes, Colors, Features) and repeat them in EVERY scene.
        `;

        imageAdherenceInstruction = `
        **MANDATORY PROMPT STRUCTURE:**
        Every 'visual_prompt' MUST start with a "Visual DNA Block" extracted from your analysis.
        
        Structure:
        "[MEDIUM & QUALITY SPECIFICATIONS], [LIGHTING & COLOR PALETTE], [SUBJECT/CHARACTER DETAILS], [SCENE ACTION/CONTEXT]"
        
        *Example (if Reference is a Bad Phone Photo):*
        "Amateur phone photography, low resolution, vertical aspect ratio, heavy film grain, hard flash lighting, candid shot... [Scene Action]"
        
        *Example (if Reference is Cinematic 3D):*
        "Cinematic 3D render, Unreal Engine 5, hyper-detailed textures, volumetric fog, teal and orange color grading... [Scene Action]"
        
        **CRITICAL:** Do NOT make the image look "better" than the reference. Mimic the exact "vibe" and technical limitations of the source.
        `;
    } else {
        // --- MODE: NO IMAGES ---
        if (styleInstructions === 'AUTO_GENERATE_STYLE') {
            styleSection = `**VISUAL STYLE:** Analyze the SCRIPT CONTEXT. Deduce the most appropriate visual style. Apply it consistently.`;
        } else {
            styleSection = `**VISUAL STYLE:** "${styleInstructions}". Use this specific style.`;
        }
        
        imageAdherenceInstruction = `**VISUAL CONSISTENCY:** Ensure all scenes look like they belong to the same project. Start prompts with the style definition.`;
    }

    const prompt = `
    ROLE: Expert Film Director & Forensic Image Analyst.
    
    TASK: Split the provided text paragraphs into detailed visual scene prompts strictly following the requested scene counts.

    FULL SCRIPT CONTEXT (READ FIRST for Species/Character Consistency):
    """
    ${fullScriptContext}
    """
    
    ${styleSection}

    INPUT BATCH (Do NOT Skip Any Text):
    ---
    ${numberedParagraphs}
    ---

    ${imageAdherenceInstruction}

    **DYNAMIC ACTION PROTOCOL (CRITICAL):**
    - **VISUALIZE THE VERB:** The visual prompt MUST represent the exact action described in the text segment.
    - **NO STATIC POSES:** If the text says "swimming", the character must be in the water, swimming actively. If it says "running", they must be in motion. Do not simply show the character standing in the environment.
    - **ACTING:** The characters and environment must "act out" the script. Capture the specific emotion and narrative moment dynamically.

    CRITICAL RULES (THE GOLDEN RULES):
    1. **MATHEMATICAL OBEDIENCE:** You see "[REQUIRED_SCENES: X]". You MUST generate EXACTLY X scenes for that paragraph.
    2. **ZERO DATA LOSS:** The "script_segment" fields MUST combine to equal the EXACT original text of the paragraph. Do not summarize. Do not skip sentences.
    3. **SEQUENTIAL:** The scenes must cover the paragraph from start to finish.
    4. **CINEMATOGRAPHY:** Prioritize "Close-up" or "Extreme Close-up" shots unless the scene demands a wide view.
    5. **ENGLISH OUTPUT:** Visual prompts must be in English.

    OUTPUT SCHEMA (JSON Array):
    Return a list of objects. Each object represents a paragraph and its scenes.
    Structure:
    [
      {
        "paragraph_index": (Integer matching PARAGRAPH_ID_X),
        "scenes": [
           { "script_segment": "...", "visual_prompt": "..." }
        ]
      }
    ]
    `;

    const parts: any[] = [{ text: prompt }];
    
    if (hasImages && referenceImages) {
        referenceImages.forEach(img => {
            parts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.data
                }
            });
        });
    }

    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: parts }],
            config: {
                responseMimeType: "application/json",
                // Strict Schema to prevent "AI response was not valid JSON" errors
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            paragraph_index: { type: Type.INTEGER },
                            scenes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        script_segment: { type: Type.STRING },
                                        visual_prompt: { type: Type.STRING }
                                    },
                                    required: ['script_segment', 'visual_prompt']
                                }
                            }
                        },
                        required: ['paragraph_index', 'scenes']
                    }
                }
            }
        }));

        // Use the robust parsing helper
        const rawResult = extractAndParseJson(response.text);

        // Convert the array output back to the expected Record format for the calling function
        let result: Record<string, { script_segment: string, visual_prompt: string }[]> = {};

        if (Array.isArray(rawResult)) {
            rawResult.forEach((item: any) => {
                if (typeof item.paragraph_index === 'number' && Array.isArray(item.scenes)) {
                    result[String(item.paragraph_index)] = item.scenes;
                }
            });
        }

        const resultsByParagraph: { script_segment: string, visual_prompt: string }[][] = [];
        const originalIndices: number[] = [];

        paragraphsWithDetails.forEach(p => {
            const key = String(p.index);
            let segments = result[key];

            // --- SAFETY FALLBACK (The "Middle Skip" Fix) ---
            // If the AI failed to generate scenes for this paragraph (or generated 0),
            // we MUST preserve the text. We create a single "fallback" scene.
            if (!segments || !Array.isArray(segments) || segments.length === 0) {
                console.warn(`Fallback triggered for paragraph ${p.index}: AI returned no scenes.`);
                segments = [{
                    script_segment: p.paragraph,
                    visual_prompt: `${styleInstructions} - Close-up of: ${p.paragraph.substring(0, 150)}... (Fallback Scene)`
                }];
            } else {
                // Optional: Verify total text length roughly matches to detect massive skips
                const totalSegmentLength = segments.reduce((sum, s) => sum + (s.script_segment?.length || 0), 0);
                const originalLength = p.paragraph.length;
                // If AI dropped > 50% of the text, trigger fallback for the whole paragraph or append missing
                if (totalSegmentLength < originalLength * 0.5) {
                     console.warn(`Partial loss detected in paragraph ${p.index}. Appending remainder.`);
                     segments.push({
                         script_segment: "[TEXTO FALTANTE RECUPERADO]",
                         visual_prompt: "Generic cinematic background"
                     });
                }
            }

            resultsByParagraph.push(segments);
            originalIndices.push(p.index);
        });

        return { resultsByParagraph, originalIndices };

    } catch (error) {
        console.error("Error generating prompts batch:", error);
        throw error;
    }
};

export const regenerateSceneDescription = async (
    apiKey: string,
    { sceneToRegenerate, allScenes }: { sceneToRegenerate: Scene, allScenes: Scene[] }
): Promise<string> => {
    // IMPORTANT: Clean Key here
    const cleanKey = cleanApiKey(apiKey);
    if (!cleanKey) throw new Error("API Key inválida (vacía después de limpieza).");
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    
    const contextScenes = allScenes
        .filter(s => Math.abs(s.paragraphIndex - sceneToRegenerate.paragraphIndex) <= 1)
        .map(s => s.scriptLine)
        .join(' ... ');

    const prompt = `
    TASK: Improve and detail an image generation prompt for a specific scene in a video.
    
    CONTEXT (Surrounding Script): "${contextScenes}"
    TARGET SCRIPT LINE: "${sceneToRegenerate.scriptLine}"
    CURRENT PROMPT: "${sceneToRegenerate.description}"
    
    INSTRUCTIONS:
    1. **PRESERVE THE VISUAL STYLE:** The 'CURRENT PROMPT' likely contains important style keywords at the beginning (e.g., "grainy phone photo", "3D render"). YOU MUST KEEP THESE EXACT KEYWORDS at the start.
    2. **DYNAMIC ACTION (CRITICAL):** The new prompt MUST visually represent the action in the "TARGET SCRIPT LINE". If the text describes an action (e.g., "swimming", "running", "laughing"), the image must show that action dynamically. Do not create static portraits if the text implies movement or specific activity.
    3. Rewrite the rest of the prompt to be more descriptive and high-quality.
    4. Focus on lighting, composition, and texture that MATCHES the style.
    5. **Prioritize Close-Up shots** unless context demands otherwise.
    6. Output ONLY the new prompt text in English.
    `;

    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        return response.text ? response.text.trim() : sceneToRegenerate.description;
    } catch (error) {
        console.error("Error regenerating scene description:", error);
        throw error;
    }
};

export const regenerateSafePrompt = async (
    apiKey: string,
    currentPrompt: string,
    scriptContext: string
): Promise<string> => {
    // IMPORTANT: Clean Key here
    const cleanKey = cleanApiKey(apiKey);
    if (!cleanKey) throw new Error("API Key inválida (vacía después de limpieza).");
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const prompt = `
    The following image generation prompt may have triggered a safety filter or is invalid: "${currentPrompt}"
    
    Context from script: "${scriptContext}"
    
    Task: Rewrite this prompt to describe the same scene in a safe, policy-compliant way (PG-13), while maintaining the visual style and key details. Remove any explicit, violent, or copyrighted terms if present.
    Output ONLY the rewritten prompt.
    `;

    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        return response.text ? response.text.trim() : "A safe version of the scene.";
    } catch (error) {
        console.error("Error regenerating safe prompt:", error);
        throw error;
    }
};

/**
 * Normaliza la relación de aspecto para la API de Google Imagen 3.
 * Opciones soportadas por la API: "1:1", "16:9", "9:16", "4:3", "3:4"
 */
const normalizeAspectRatioForImagen = (aspectRatioStr: string): string => {
    if (!aspectRatioStr) return "16:9";
    const cleaned = aspectRatioStr.trim().toLowerCase();
    if (cleaned === '9:16' || cleaned.includes('portrait')) return "9:16";
    if (cleaned === '1:1' || cleaned.includes('square')) return "1:1";
    if (cleaned === '4:3') return "4:3";
    if (cleaned === '3:4') return "3:4";
    if (cleaned === '16:9' || cleaned.includes('landscape')) return "16:9";
    return "16:9";
};

/**
 * Limpia y prepara un prompt para la API de Imagen 3 de Google.
 */
const cleanPromptForImagen = (prompt: string): string => {
    return prompt
        .replace(/[`]/g, '')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Genera una imagen utilizando los modelos nativos de imagen de Google Gemini (gemini-2.5-flash-image / gemini-3.1-flash-lite-image).
 * Utiliza la API Key de Google Gemini directamente vía REST con la configuración de relación de aspecto.
 * Incluye reintentos automáticos para errores transitorios y manejo de cuotas/filtros.
 */
export const generateImageForScene = async (
    apiKey: string,
    prompt: string,
    aspectRatioStr: string,
    signal?: AbortSignal
): Promise<string> => {
    // Validación de seguridad de backend/servicio: rechazar llamadas no autorizadas
    if (!isSubscriptionActive()) {
        triggerSubscriptionModal({ featureName: 'Generación de Imagen con Google Gemini' });
        throw new Error('Suscripción no activa. Necesitas tener una suscripción activa dentro de la Academia de Skool para utilizar esta función.');
    }

    const cleanKey = cleanApiKey(apiKey);
    if (!cleanKey) throw new Error("API Key de Gemini inválida (vacía después de limpieza).");

    const cleanedPrompt = cleanPromptForImagen(prompt);
    const MAX_PROMPT_LENGTH = 1500;
    const safePrompt = cleanedPrompt.length > MAX_PROMPT_LENGTH 
        ? cleanedPrompt.substring(0, MAX_PROMPT_LENGTH) 
        : cleanedPrompt;

    const aspectRatio = normalizeAspectRatioForImagen(aspectRatioStr);

    // Modelos de imagen de Google Gemini admitidos
    const CANDIDATE_MODELS = [
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-lite-image',
        'gemini-3.1-flash-image'
    ];

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (const model of CANDIDATE_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: safePrompt }
                    ]
                }
            ],
            generationConfig: {
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        };

        let attempt = 0;
        let modelUnavailable = false;

        while (attempt < MAX_RETRIES) {
            try {
                if (signal?.aborted) {
                    const e = new Error("Aborted");
                    e.name = "AbortError";
                    throw e;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: signal
                });

                if (response.status === 429) {
                    throw new QuotaError('QuotaError: Se ha excedido el límite de peticiones o cuota de Gemini.');
                }

                if (response.status === 404) {
                    // El modelo no está disponible en este proyecto o versión de API, probar siguiente modelo
                    modelUnavailable = true;
                    break;
                }

                if (response.status === 400) {
                    const errorBody = await response.json().catch(() => ({}));
                    const errorMessage = errorBody.error?.message || response.statusText;
                    
                    // Si es por filtro de seguridad o prompt bloqueado
                    if (errorMessage.toLowerCase().includes('safety') || errorMessage.toLowerCase().includes('block') || errorMessage.toLowerCase().includes('invalid argument')) {
                        throw new InvalidArgumentError(`SafetyError: El prompt activó los filtros de seguridad de Google (${errorMessage}).`);
                    }
                    
                    throw new Error(`ApiError (400): ${errorMessage}`);
                }

                if (response.status === 401 || response.status === 403) {
                    const errorBody = await response.json().catch(() => ({}));
                    const errorMessage = errorBody.error?.message || "API Key de Gemini no autorizada o sin permisos.";
                    throw new Error(`ApiError (${response.status}): ${errorMessage}`);
                }

                // Errores 5xx del servidor de Google
                if (response.status >= 500 && response.status < 600) {
                    throw new Error(`ApiError (${response.status}): Error temporal del servidor de Google.`);
                }

                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    const errorMessage = errorBody.error?.message || response.statusText;
                    throw new Error(`ApiError (${response.status}): ${errorMessage}`);
                }

                const data = await response.json();

                // Extraer imagen en base64 de los candidatos devueltos
                let base64Image: string | null = null;

                if (data?.candidates && data.candidates.length > 0) {
                    const candidate = data.candidates[0];
                    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKLIST') {
                        throw new InvalidArgumentError(`SafetyError: Bloqueado por políticas de seguridad (${candidate.finishReason}).`);
                    }

                    const parts = candidate.content?.parts || [];
                    for (const p of parts) {
                        if (p.inlineData?.data) {
                            base64Image = p.inlineData.data;
                            break;
                        } else if (p.inline_data?.data) {
                            base64Image = p.inline_data.data;
                            break;
                        }
                    }
                }

                // Compatibilidad con respuestas de estilo Imagen 3
                if (!base64Image && data?.generatedImages?.[0]?.image?.imageBytes) {
                    base64Image = data.generatedImages[0].image.imageBytes;
                }

                if (!base64Image) {
                    if (data?.promptFeedback?.blockReason) {
                        throw new InvalidArgumentError(`SafetyError: Prompt bloqueado por Google (${data.promptFeedback.blockReason})`);
                    }
                    throw new Error("ResponseError: La API de Gemini no devolvió datos de imagen válidos.");
                }

                return base64Image;

            } catch (error: any) {
                if (signal?.aborted || error.name === 'AbortError' || error.message === 'signal is aborted without reason') {
                    const e = new Error("Aborted");
                    e.name = "AbortError";
                    throw e;
                }

                if (error instanceof InvalidArgumentError) {
                    throw error;
                }

                lastError = error;
                const errorMessage = error.message ? error.message.toLowerCase() : '';
                const isRetryable = error instanceof QuotaError || errorMessage.includes('apierror (5') || errorMessage.includes('failed to fetch') || errorMessage.includes('network error');

                if (isRetryable && attempt < MAX_RETRIES - 1) {
                    attempt++;
                    const delay = Math.pow(2, attempt) * 1500 + Math.random() * 1000;
                    console.warn(`Intento ${attempt} fallido para prompt "${safePrompt.substring(0, 50)}...". Reintentando en ${Math.round(delay / 1000)}s...`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    if (isRetryable) {
                        throw error;
                    }
                    break;
                }
            }
        }

        if (modelUnavailable) {
            continue; // Probar el siguiente modelo candidato
        }
    }

    if (lastError) {
        throw lastError;
    }
    throw new Error("generateImageForScene falló después de probar todos los modelos de imagen.");
};
