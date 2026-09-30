
// types.ts

export type CameraMovement =
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_right'
  | 'pan_left'
  | 'pan_down'
  | 'pan_up'
  | 'zoom_pan_diagonal'
  | 'rotate_gentle'
  | 'shake'
  | 'pulse'
  | 'float'
  // Chromatic Movements
  | 'chromatic_zoom'
  | 'chromatic_pan'
  | 'glitch_pulse'
  | 'rgb_split_drift'
  | 'aberration_wave'
  | 'digital_distortion'
  // Subtle "Living Photo" Movements
  | 'breathing'
  | 'gentle_drift'
  | 'cloud_float'
  | 'water_subtle'
  | 'static_alive';

export interface Scene {
  id: string;
  scriptLine: string; // Now holds the original prompt line
  description: string; // The editable prompt for image/video generation
  paragraphIndex: number; // To group scenes from the same paragraph
  duration?: number; // Calculated duration in seconds
  startTime?: number; // Start time in seconds within the project
  endTime?: number;   // End time in seconds within the project
  imageUrl?: string;
  upscaled4kUrl?: string; // NEW: 4K Super-Resolution image URL
  isUpscaling?: boolean;  // NEW: State while 4K upscaling is running
  upscaleFactor?: 2 | 4;  // NEW: Upscale factor (2X or 4X)
  imageModelUsed?: string; // NEW: Model used (e.g. flux-1-schnell, google-imagen-3)
  seed?: number;          // NEW: Generation seed
  isReformulating?: boolean; // NEW: State while prompt enhancer is running
  isRegeneratingDescription?: boolean;
  videoUrl?: string;
  videoRawBytes?: string; // Kept for legacy compatibility or base64 storage
  videoGenerationStatus?: 'idle' | 'queued' | 'generating' | 'error' | 'success';
  videoError?: string;
  actualVideoDuration?: number; // The actual duration of the generated video file
  generationStatus?: 'idle' | 'queued' | 'generating' | 'success' | 'error';
  generationError?: string;
  generationErrorType?: 'invalid_argument' | 'generic' | 'duration_mismatch';
  cameraMovement?: CameraMovement; // New field for animation preference
}

// NUEVA CONFIGURACIÓN ESTRICTA DE RITMO (RANGOS)
export interface AutoPacingConfig {
  mode: 'short' | 'long';
  hookThresholdWords: number; // 50 para short, 100 para long
  
  // Rangos de tiempo (Regla de Oro)
  hookMinSeconds: number;
  hookMaxSeconds: number;
  
  restMinSeconds: number;
  restMaxSeconds: number;
}

export interface ScriptOption {
  // This now represents a "project" or a batch of scenes
  title: string;
  originalScriptText?: string; // NEW: Store original text for integrity check
  scenes: Scene[];
  isGeneratingAllImages?: boolean; // Keep
  aspectRatio?: string;
  styleInstructions?: string;
  numberOfImages?: number | 'auto';
  masterAudioUrl?: string; // URL local del audio maestro
  masterAudioDuration?: number; // Duración total exacta del audio
  extraTimePerScene?: number; // Buffer de tiempo extra solo para la generación del video final
  projectMode?: 'short' | 'long'; // Para referencia futura
  imageEngine?: string; // NEW: 'flux-1-schnell' | 'flux-1-dev' | 'flux-2-klein' | 'google-imagen-3'
  scriptEngine?: string; // NEW: 'groq-llama-70b' | 'nvidia-deepseek-r1-32b' | 'nvidia-llama-70b' | 'gemini-2.5-flash'
  characterAnchor?: string; // NEW: Protagonist continuity description
  targetStyleName?: string; // NEW: Selected visual style preset name
}

export interface HistoryEntry {
  id: string;
  topic: string; // The project title
  scriptOptions: ScriptOption[];
  createdAt: string;
}

// Fix: Add missing type definitions.
export interface Channel {
  id: string;
  name: string;
  style: string;
  instructions: string;
  sceneInstructions: string;
  ttsVoiceId?: string;
  ttsSpeed?: number;
  ttsPitch?: number;
  ttsVolume?: number;
}

export interface Voice {
  id: string;
  name: string;
  voiceId: string;
  isClone?: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  kind: string;
  mimeType: string;
}

export interface TimestampedWord {
  word: string;
  start: number;
  end: number;
}

export type AspectRatioType = '9:16' | '16:9' | '1:1';
export type SlotStatus = 'idle' | 'queued' | 'rendering' | 'completed' | 'failed';

export interface SceneSlot {
  id: string;               // Ej: "slot-001"
  sequenceNumber: number;   // 1, 2, 3...
  paddedNumber: string;     // "001", "002"...
  rawPrompt: string;        // Texto original de la escena
  compiledPrompt: string;   // Personaje + Escena + Estilo + Encuadre
  status: SlotStatus;
  imageUrl?: string;        // Data URL base64 de la imagen generada (1024px nativa)
  upscaledUrl?: string;     // Data URL de la imagen escalada (2K o 4K)
  upscaleFactor?: 2 | 4;    // 2 (2K) o 4 (4K)
  resolution?: string;      // Ej: "2160 × 3840 px"
  errorDetail?: string;
  isContentFiltered?: boolean;
  isRateLimited?: boolean;
  retryCount?: number;      // Número de reintentos con IA (hasta 3)
  isReformulated?: boolean; // Si fue corregido con IA
  reformulatedPrompt?: string; // Prompt alternativo generado por IA
  elapsedSeconds?: number;
  seed: number;
}

export interface CharacterPersona {
  id: string;
  name: string;
  anchorDescription: string;
  clothingAnchor: string;
  defaultSeed: number;
  previewUrl?: string;
  createdAt: string;
}

export interface ScriptSceneResult {
  sceneNumber: number;
  scriptText: string;
  estimatedDurationSec: number;
  charactersPresent: string[];
  promptEn: string;
  continuityNote?: string;
}

export interface ScriptDirectorCharacter {
  name: string;
  role: 'PROTAGONIST' | 'SECONDARY';
  alive: boolean;
  exitScene?: number | null;
  anchorDescription: string;
  clothingAnchor: string;
  defaultSeed: number;
}

export interface ScriptDirectorAnalysis {
  storyBible: {
    summary: string;
    genreAndTone: string;
    culturalContext: string;
  };
  characters: ScriptDirectorCharacter[];
  scenes: ScriptSceneResult[];
}