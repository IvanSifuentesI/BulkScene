export interface StylePreset {
  id: string;
  name: string;
  category: string;
  promptModifier: string;
  badgeColor: string;
  description: string;
}

export interface AIModelOption {
  id: string;
  name: string;
  badge: string;
  speed: string;
  description: string;
  endpointModel: string;
  defaultSteps: number;
}

export const AVAILABLE_IMAGE_MODELS: AIModelOption[] = [
  {
    id: 'flux-1-schnell',
    name: 'FLUX.1 Schnell (NVIDIA)',
    badge: 'Recomendado / 4 Pasos',
    speed: '~1.8s - 3s',
    description: '12B parámetros destilado para máxima velocidad y nitidez en resolución nativa.',
    endpointModel: 'black-forest-labs/flux.1-schnell',
    defaultSteps: 4
  },
  {
    id: 'flux-1-dev',
    name: 'FLUX.1 Dev (NVIDIA)',
    badge: 'Cine 8K / Máximo Detalle',
    speed: '~8s - 15s',
    description: 'Fidelidad anatómica suprema, texturas de piel ultra-reales e iluminación volumétrica.',
    endpointModel: 'black-forest-labs/flux.1-dev',
    defaultSteps: 4
  },
  {
    id: 'flux-2-klein',
    name: 'FLUX.2 Klein 4B (NVIDIA)',
    badge: 'Hyper-Turbo 4B',
    speed: '~1.2s - 2s',
    description: 'Arquitectura ligera de 4B diseñada para renderizado continuo y lotes masivos.',
    endpointModel: 'black-forest-labs/flux.2-klein-4b',
    defaultSteps: 4
  },
  {
    id: 'flux-1-kontext-dev',
    name: 'FLUX.1 Kontext Dev (NVIDIA)',
    badge: 'Coherencia Contextual',
    speed: '~10s - 18s',
    description: 'Especializado en mantener contexto narrativo continuo entre planos consecutivos.',
    endpointModel: 'black-forest-labs/flux_1-kontext-dev',
    defaultSteps: 20
  },
  {
    id: 'sd-3-5-large',
    name: 'Stable Diffusion 3.5 Large (NVIDIA)',
    badge: 'Stability AI / 8B',
    speed: '~4s - 8s',
    description: 'Modelo insignia con excelente fidelidad tipográfica y composición compleja.',
    endpointModel: 'stabilityai/stable-diffusion-3_5-large',
    defaultSteps: 28
  },
  {
    id: 'qwen-image',
    name: 'Qwen Image (NVIDIA)',
    badge: 'Fotorrealismo y Rostros',
    speed: '~5s - 9s',
    description: 'Excelente captura de microexpresiones faciales y anatomía consistente.',
    endpointModel: 'qwen/qwen-image',
    defaultSteps: 25
  },
  {
    id: 'qwen-image-edit',
    name: 'Qwen Image Edit (NVIDIA)',
    badge: 'Edición y Retoque',
    speed: '~6s - 10s',
    description: 'Especializado en variaciones de planos, retoque y alteración guiada.',
    endpointModel: 'qwen/qwen-image-edit',
    defaultSteps: 25
  },
  {
    id: 'google-imagen-3',
    name: 'Google Gemini Imagen 3',
    badge: 'Google GenAI Nativo',
    speed: '~3s - 5s',
    description: 'Generador nativo de Google Gemini Imagen 3 (gemini-2.5-flash-image).',
    endpointModel: 'gemini-2.5-flash-image',
    defaultSteps: 1
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. MOTORES PARA ANÁLISIS PROFUNDO (Guion Completo, Personajes, Época, Estilo)
// Prioridad 1: gemini-3.8-flash (5 rpm, 250k tpm, 20 rpd)
// ─────────────────────────────────────────────────────────────────────────────
export const AVAILABLE_ANALYSIS_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Google Gemini 3.8 Flash',
    provider: 'Google Gemini',
    endpointModel: 'gemini-3.8-flash',
    badge: '👑 Prioridad 1 · Máxima Inteligencia & Análisis',
    speed: '~1.0s',
    quota: '5 rpm · 250k tpm · 20 rpd',
    description: 'Motor principal de análisis profundo: lee el guion completo, define personajes, vestimenta invariable, época histórica y atmósfera.'
  },
  {
    id: 'nvidia-llama-70b',
    name: 'NVIDIA Llama 3.3 70B Instruct',
    provider: 'NVIDIA NIM',
    endpointModel: 'meta/llama-3.3-70b-instruct',
    badge: '🟢 Prioridad 2 · Gran Capacidad 70B',
    speed: '~1.5s',
    quota: 'Cuota libre NIM',
    description: 'Alternativa potente para desglose de escenas complejas y coherencia dramática.'
  },
  {
    id: 'nvidia-deepseek-r1',
    name: 'NVIDIA DeepSeek R1',
    provider: 'NVIDIA NIM',
    endpointModel: 'deepseek-ai/deepseek-r1',
    badge: '🧠 Razonamiento Profundo',
    speed: '~2.8s',
    quota: 'Cuota libre NIM',
    description: 'Cadena de pensamiento exhaustiva para guiones con giros dramáticos complejos.'
  },
  {
    id: 'groq-llama-70b',
    name: 'Groq Llama 3.3 70B Versatile',
    provider: 'Groq',
    endpointModel: 'llama-3.3-70b-versatile',
    badge: '⚡ Inferencia LPU Instantánea',
    speed: '~0.5s',
    quota: '30 rpm Groq',
    description: 'Velocidad casi instantánea para análisis cuando se requiere respuesta ultra rápida.'
  },
  {
    id: 'nvidia-qwen-72b',
    name: 'NVIDIA Qwen 2.5 72B Instruct',
    provider: 'NVIDIA NIM',
    endpointModel: 'qwen/qwen2.5-72b-instruct',
    badge: '🌏 Detalle Cultural & Épocas',
    speed: '~1.6s',
    quota: 'Cuota libre NIM',
    description: 'Especialista en épocas históricas, culturas del mundo, mitología y armaduras.'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. MOTORES PARA GENERACIÓN MASIVA DE PROMPTS (Por Escena)
// Prioridad 1: gemini-3.5-flash-lite (15 rpm, 250k tpm, 500 rpd)
// ─────────────────────────────────────────────────────────────────────────────
export const AVAILABLE_PROMPT_MODELS = [
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Google Gemini 3.5 Flash Lite',
    provider: 'Google Gemini',
    endpointModel: 'gemini-3.5-flash-lite',
    badge: '⚡ Prioridad 1 · Ultra Rápido & Alto Volumen',
    speed: '~0.4s',
    quota: '15 rpm · 250k tpm · 500 rpd',
    description: 'Motor principal para generar cientos de prompts por escena a máxima velocidad y bajo consumo de cuota.'
  },
  {
    id: 'groq-llama-70b',
    name: 'Groq Llama 3.3 70B Versatile',
    provider: 'Groq',
    endpointModel: 'llama-3.3-70b-versatile',
    badge: '⚡ Prioridad 2 · LPU ~1000 tok/s',
    speed: '~0.4s',
    quota: '30 rpm Groq',
    description: 'Generación por lotes ultra veloz para videos de decenas de escenas.'
  },
  {
    id: 'nvidia-llama-70b',
    name: 'NVIDIA Llama 3.3 70B Instruct',
    provider: 'NVIDIA NIM',
    endpointModel: 'meta/llama-3.3-70b-instruct',
    badge: '🟢 Prioridad 3 · Fotografía Cinematográfica',
    speed: '~1.5s',
    quota: 'Cuota libre NIM',
    description: 'Prompts descriptivos con gran detalle en lentes, iluminación volumétrica y texturas.'
  },
  {
    id: 'nvidia-mistral-nemo',
    name: 'NVIDIA Mistral NeMo 12B',
    provider: 'NVIDIA NIM',
    endpointModel: 'mistralai/mistral-nemo-12b-instruct',
    badge: '🎯 Rápido y Conciso',
    speed: '~0.8s',
    quota: 'Cuota libre NIM',
    description: 'Prompts limpios sin palabrería, optimizados para FLUX y Midjourney.'
  },
  {
    id: 'groq-mixtral-8x7b',
    name: 'Groq Mixtral 8x7B MoE',
    provider: 'Groq',
    endpointModel: 'mixtral-8x7b-32768',
    badge: '🔀 Mezcla de Expertos',
    speed: '~0.6s',
    quota: '30 rpm Groq',
    description: 'Alta concurrencia para procesamiento por lotes masivo.'
  }
];

// Lista unificada
export const AVAILABLE_SCRIPT_MODELS = [
  // 1. Google Gemini (Prioridad 1)
  {
    id: 'gemini-3.8-flash',
    name: 'Google Gemini 3.8 Flash',
    provider: 'Google Gemini',
    endpointModel: 'gemini-3.8-flash',
    badge: '👑 Análisis Profundo (Guion & Personajes)',
    speed: '~1.0s',
    quota: '5 rpm · 250k tpm · 20 rpd',
    description: 'Análisis minucioso del guion completo, identificación de personajes y estilo visual.'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Google Gemini 3.5 Flash Lite',
    provider: 'Google Gemini',
    endpointModel: 'gemini-3.5-flash-lite',
    badge: '⚡ Generación Masiva (Prompts x Escena)',
    speed: '~0.4s',
    quota: '15 rpm · 250k tpm · 500 rpd',
    description: 'Generación masiva de prompts visuales por cada escena a alta velocidad.'
  },

  // 2. NVIDIA NIM (Prioridad 2)
  {
    id: 'nvidia-llama-70b',
    name: 'NVIDIA Llama 3.3 70B Instruct',
    provider: 'NVIDIA NIM',
    endpointModel: 'meta/llama-3.3-70b-instruct',
    badge: '🟢 Cine 8K / 70B Parámetros',
    speed: '~1.5s',
    quota: 'Cuota libre NIM',
    description: 'Máxima comprensión de cinematografía, encuadres fotográficos y continuidad.'
  },
  {
    id: 'nvidia-deepseek-r1',
    name: 'NVIDIA DeepSeek R1',
    provider: 'NVIDIA NIM',
    endpointModel: 'deepseek-ai/deepseek-r1',
    badge: '🧠 Razonamiento Profundo',
    speed: '~2.8s',
    quota: 'Cuota libre NIM',
    description: 'Cadena de pensamiento exhaustiva para desgloses narrativos complejos.'
  },
  {
    id: 'nvidia-nemotron-70b',
    name: 'NVIDIA Llama 3.1 Nemotron 70B',
    provider: 'NVIDIA NIM',
    endpointModel: 'nvidia/llama-3.1-nemotron-70b-instruct',
    badge: '🔬 Alta Precisión NVIDIA',
    speed: '~2.0s',
    quota: 'Cuota libre NIM',
    description: 'Afinado por NVIDIA para máxima coherencia en instrucciones complejas.'
  },
  {
    id: 'nvidia-qwen-72b',
    name: 'NVIDIA Qwen 2.5 72B Instruct',
    provider: 'NVIDIA NIM',
    endpointModel: 'qwen/qwen2.5-72b-instruct',
    badge: '🌏 Detalle Cultural & Épocas',
    speed: '~1.6s',
    quota: 'Cuota libre NIM',
    description: 'Especialista en referencias históricas, culturales y vestimenta de época.'
  },
  {
    id: 'nvidia-mistral-nemo',
    name: 'NVIDIA Mistral NeMo 12B',
    provider: 'NVIDIA NIM',
    endpointModel: 'mistralai/mistral-nemo-12b-instruct',
    badge: '⚡ Rápido y Conciso',
    speed: '~0.9s',
    quota: 'Cuota libre NIM',
    description: 'Modelo ágil optimizado para generar prompts directos y efectivos.'
  },

  // 3. Groq (Prioridad 3)
  {
    id: 'groq-llama-70b',
    name: 'Groq Llama 3.3 70B Versatile',
    provider: 'Groq',
    endpointModel: 'llama-3.3-70b-versatile',
    badge: '⚡ Inferencia LPU (~1000 tok/s)',
    speed: '~0.5s',
    quota: '30 rpm Groq',
    description: 'Inferencia ultra veloz en silicio LPU para segmentaciones casi instantáneas.'
  },
  {
    id: 'groq-mixtral-8x7b',
    name: 'Groq Mixtral 8x7B 32K',
    provider: 'Groq',
    endpointModel: 'mixtral-8x7b-32768',
    badge: '🔀 Mezcla de Expertos',
    speed: '~0.7s',
    quota: '30 rpm Groq',
    description: 'Arquitectura MoE veloz para descomponer párrafos y generar prompts directos.'
  }
];

export const DEFAULT_STYLES: StylePreset[] = [
  {
    id: 'stickman-doodle',
    name: 'Stickman Doodle Minimalista',
    category: 'Ilustración',
    promptModifier: 'minimalist hand-drawn stickman sketch, thick clean black ink lines, white paper background, high contrast, clean vector style, expressive doodle art',
    badgeColor: '#eab308',
    description: 'Personajes de palitos con personalidad, líneas negras nítidas sobre fondo blanco limpio. Muy viral para historias explicativas.'
  },
  {
    id: 'cinematic-35mm',
    name: 'Cinematográfico 35mm Hiperrealista',
    category: 'Fotografía',
    promptModifier: 'cinematic 35mm film photography, Kodak Portra 400 color science, shallow depth of field, natural atmospheric volumetric lighting, highly detailed textures, 8k, award-winning cinematography',
    badgeColor: '#00e5ff',
    description: 'Aspecto de película de cine de gran presupuesto con iluminación volumétrica y grano cinematográfico natural.'
  },
  {
    id: 'cyberpunk-neon',
    name: 'Dark Cyberpunk Neón',
    category: 'Fantasía / Sci-Fi',
    promptModifier: 'cyberpunk aesthetic, dark rain-slicked city streets, vibrant cyan and magenta neon light reflections, mist, futuristic urban backdrop, atmospheric bokeh, hyper-detailed 8k',
    badgeColor: '#ec4899',
    description: 'Ciudades futuristas con reflejos de lluvia, neones brillantes y alto contraste cromático.'
  },
  {
    id: 'pixar-3d',
    name: 'Animación 3D Estilo Pixar',
    category: '3D Render',
    promptModifier: 'cute 3D animated character, Pixar and Disney concept art style, octane render, soft subsurface scattering, vibrant warm lighting, expressive big eyes, highly detailed 3D modeling',
    badgeColor: '#a855f7',
    description: 'Modelado 3D adorable con iluminación suave, texturas limpias y estética de película animada de estreno.'
  },
  {
    id: 'dark-manga',
    name: 'Manga / Anime Shonen Dark',
    category: 'Anime',
    promptModifier: 'modern anime illustration, Makoto Shinkai and Ufotable style, dramatic cel-shading, dynamic angle, saturated cinematic lighting, fine detailed line art, expressive emotion, 8k wallpaper',
    badgeColor: '#ef4444',
    description: 'Ilustración de anime japonés moderno con sombreado dramático y ángulos cinemáticos dinámicos.'
  },
  {
    id: 'classic-oil',
    name: 'Pintura al Óleo Renacentista',
    category: 'Arte Clásico',
    promptModifier: 'classic renaissance oil painting, dramatic chiaroscuro Rembrandt lighting, rich deep earth tones, visible oil brushstrokes, museum masterpiece, historical fine art texture',
    badgeColor: '#f97316',
    description: 'Cuadro al óleo con iluminación claroscuro tipo Rembrandt, texturas de pincel y atmósfera de museo.'
  },
  {
    id: 'scrapbook-paper',
    name: 'Collage Scrapbook Editorial',
    category: 'Diseño',
    promptModifier: 'creative mixed media paper collage, ripped craft paper edges, textured newspaper cutouts, tactile layered scrapbook aesthetic, retro editorial design, high tactile detail',
    badgeColor: '#10b981',
    description: 'Estilo de revista y recortes de papel rasgado, ideal para canales de YouTube modernos tipo Vox o Johnny Harris.'
  },
  {
    id: 'flat-vector',
    name: 'Vector Moderno Infográfico',
    category: 'Infografía',
    promptModifier: 'flat 2D vector art, clean sharp geometric shapes, modern SaaS illustration style, vibrant harmonious palette, corporate memphis modern aesthetic',
    badgeColor: '#6366f1',
    description: 'Líneas limpias, colores vivos y estética moderna de ilustración tech.'
  }
];

export const DEFAULT_CHARACTERS = [
  {
    id: 'stickman-beard',
    name: 'Stickman con Barba (Doodle)',
    anchorDescription: 'A minimalist stickman figure with simple round head, but uniquely sporting a thick textured red beard and small round black-rimmed glasses, simple stick body',
    clothingAnchor: 'wearing a simple hand-drawn red baseball cap',
    defaultSeed: 404,
    createdAt: '2026-09-28'
  },
  {
    id: 'detective-marcus',
    name: 'Detective Marcus (Noir)',
    anchorDescription: 'A 32-year-old male private detective named Marcus, sharp jawline, short messy dark brown hair, slight stubble, piercing grey eyes',
    clothingAnchor: 'wearing a classic charcoal grey trench coat over a dark shirt with brown leather gloves',
    defaultSeed: 888,
    createdAt: '2026-09-28'
  },
  {
    id: 'hacker-kira',
    name: 'Kira (Cyberpunk)',
    anchorDescription: 'A 26-year-old female cyberpunk hacker named Kira, neon cyan asymmetrical pixie cut hair, small cybernetic temple implant with glowing violet LED',
    clothingAnchor: 'wearing an oversized black tactical techwear hoodie with reflective orange accents',
    defaultSeed: 777,
    createdAt: '2026-09-28'
  },
  {
    id: 'viking-erik',
    name: 'Chieftain Erik (Vikingo)',
    anchorDescription: 'A 35-year-old rugged Viking chieftain named Erik, braided blonde beard, weathered intense blue eyes, battle scar across left cheek',
    clothingAnchor: 'wearing heavy wolf-pelt shoulder cloak and carved leather armor with iron buckles',
    defaultSeed: 555,
    createdAt: '2026-09-28'
  }
];

