/**
 * Servicio de Persistencia Local de Sesión de Estudio (Zero-Supabase)
 * Guarda todo el avance del usuario (guion, beats fonéticos, rangos, contexto, audio)
 * en el navegador local (localStorage + IndexedDB para audio binario).
 * Evita sobrecargar Supabase y previene pérdida de datos al cambiar de pestaña o refrescar.
 */

import { TranscriptionResult } from './audioTranscriptionService';
import { 
  CulturalTemporalContext, 
  DirectionNarrativeMode, 
  CharacterConsistencyMode, 
  ScriptDirectorCharacter 
} from '../types';

export interface LocalStudioSessionData {
  scriptText: string;
  projectName: string;
  transcription: TranscriptionResult | null;
  audioDuration: number;
  audioFileName: string;
  // Multi-rango de escenas
  hookScenesCount: number;
  hookDurationSec: number;
  restDurationSec: number;
  snapToPunctuation: boolean;
  snapToSilences: boolean;
  sceneDurationRange: number;
  pacingWords: number;
  // Modos de dirección
  narrativeMode: DirectionNarrativeMode;
  culturalContext: CulturalTemporalContext;
  culturalContextInput: string;
  customStyleInstructions: string;
  detectedStyleName?: string;
  detectedStyleReason: string | null;
  consistencyMode: CharacterConsistencyMode;
  detectedCharacters: ScriptDirectorCharacter[];
  cameraPreference: string;
  lightingPreference: string;
  selectedModel: string;
  selectedSTTModel: string;
  activeCharacterId?: string;
  activeStyleId?: string;
  lastUpdated: number;
}

const STORAGE_SESSION_KEY = 'bulkscene_studio_master_session_v1';
const DB_NAME = 'BulkSceneAudioVault';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';

/**
 * Abre la base de datos IndexedDB local para almacenar archivos de audio sin límite de 5MB
 */
function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible en este entorno.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda el archivo de audio maestro en IndexedDB del navegador
 */
export async function saveLocalAudioBlob(blob: Blob, fileName: string): Promise<void> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = { blob, fileName, savedAt: Date.now() };
      const req = store.put(record, 'master_audio');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[LOCAL SESSION] No se pudo guardar audio en IndexedDB:', e);
  }
}

/**
 * Recupera el archivo de audio maestro guardado en IndexedDB
 */
export async function getLocalAudioBlob(): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('master_audio');
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve({ blob: req.result.blob, fileName: req.result.fileName || 'audio_proyecto.mp3' });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('[LOCAL SESSION] Error leyendo audio de IndexedDB:', e);
    return null;
  }
}

/**
 * Elimina el archivo de audio maestro de IndexedDB
 */
export async function clearLocalAudioBlob(): Promise<void> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete('master_audio');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('[LOCAL SESSION] Error eliminando audio de IndexedDB:', e);
  }
}

/**
 * Guarda todo el avance y los beats del Estudio Master en localStorage
 */
export function saveLocalStudioSession(data: Partial<LocalStudioSessionData>): void {
  try {
    const existing = loadLocalStudioSession();
    const merged: LocalStudioSessionData = {
      scriptText: '',
      projectName: 'Proyecto_01',
      transcription: null,
      audioDuration: 0,
      audioFileName: '',
      hookScenesCount: 4,
      hookDurationSec: 1.8,
      restDurationSec: 3.2,
      snapToPunctuation: true,
      snapToSilences: true,
      sceneDurationRange: 2.5,
      pacingWords: 8,
      narrativeMode: 'documental_secuencial',
      culturalContext: { epoch: '', culture: '', environment: '' },
      culturalContextInput: '',
      customStyleInstructions: '',
      detectedStyleReason: null,
      consistencyMode: 'nombre_en_prompt',
      detectedCharacters: [],
      cameraPreference: 'variado_dinamico',
      lightingPreference: 'volumetrica_cinematica',
      selectedModel: 'gemini-2.0-flash',
      selectedSTTModel: 'groq-whisper-turbo',
      ...existing,
      ...data,
      lastUpdated: Date.now()
    };

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('[LOCAL SESSION] Error guardando sesión en localStorage:', e);
  }
}

/**
 * Carga la sesión guardada localmente
 */
export function loadLocalStudioSession(): LocalStudioSessionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Sanitización preventiva contra datos corruptos en el navegador
    if (parsed.detectedCharacters && !Array.isArray(parsed.detectedCharacters)) {
      parsed.detectedCharacters = [];
    }
    if (parsed.hookScenesCount !== undefined) {
      parsed.hookScenesCount = Number(parsed.hookScenesCount) || 4;
    }
    if (parsed.hookDurationSec !== undefined) {
      parsed.hookDurationSec = Number(parsed.hookDurationSec) || 1.8;
    }
    if (parsed.restDurationSec !== undefined) {
      parsed.restDurationSec = Number(parsed.restDurationSec) || 3.2;
    }
    if (parsed.audioDuration !== undefined) {
      parsed.audioDuration = Number(parsed.audioDuration) || 0;
    }

    return parsed;
  } catch (e) {
    console.warn('[LOCAL SESSION] Error leyendo sesión de localStorage:', e);
    return null;
  }
}

/**
 * Limpia por completo la sesión local de Estudio Master (para iniciar un nuevo proyecto)
 */
export async function clearLocalStudioSession(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    await clearLocalAudioBlob();
  } catch (e) {
    console.warn('[LOCAL SESSION] Error reseteando sesión:', e);
  }
}
