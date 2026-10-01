/**
 * Servicio de Transcripción y Alineación Temporal de Audio con Groq Whisper.
 * Utiliza el modelo whisper-large-v3-turbo de alta precisión y velocidad extrema
 * para obtener marcas de tiempo exactas palabra por palabra (timestamps) y por segmento.
 */

import { DEFAULT_GROQ_API_KEY } from './llmDirectorService';

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface SegmentTimestamp {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  words: WordTimestamp[];
  segments: SegmentTimestamp[];
}

export const DEFAULT_ASSEMBLY_API_KEY = '860751f45c4a4bac88bba096aaf2aa0c';
export const DEFAULT_DEEPGRAM_API_KEY = 'f6f070d050b62b90ca1b0c9b386e9fbb17cf0476';

export type STTProvider = 'groq' | 'nvidia' | 'assemblyai' | 'deepgram';

export interface STTModelOption {
  id: string;
  name: string;
  provider: STTProvider;
  modelIdentifier: string;
  description: string;
  badge: string;
  speed: string;
}

export const AVAILABLE_STT_MODELS: STTModelOption[] = [
  {
    id: 'groq-whisper-turbo',
    name: 'Groq Whisper Large V3 Turbo',
    provider: 'groq',
    modelIdentifier: 'whisper-large-v3-turbo',
    description: 'Motor ultrarrápido en LPU de Groq. Timestamps precisos palabra por palabra en ~1.5s.',
    badge: '⚡ Ultra Rápido (216x)',
    speed: '~1.5s'
  },
  {
    id: 'deepgram-nova-3',
    name: 'Deepgram Nova-3',
    provider: 'deepgram',
    modelIdentifier: 'nova-3',
    description: 'La vanguardia de Deepgram: menor tasa de error (WER) en español/inglés y latencia casi nula.',
    badge: '🚀 Nueva Generación',
    speed: '< 2s'
  },
  {
    id: 'assemblyai-universal',
    name: 'AssemblyAI Universal Conformer',
    provider: 'assemblyai',
    modelIdentifier: 'universal',
    description: 'Puntuación gramatical nativa de alta fidelidad con soporte para audios pesados de hasta 5GB.',
    badge: '💎 Alta Puntuación',
    speed: '~8s'
  },
  {
    id: 'groq-whisper-v3',
    name: 'Groq Whisper Large V3',
    provider: 'groq',
    modelIdentifier: 'whisper-large-v3',
    description: 'Modelo OpenAI completo de 1.55B parámetros para máxima resolución acústica en Groq.',
    badge: '🎯 Máxima Precisión',
    speed: '~6s'
  },
  {
    id: 'nvidia-whisper-v3',
    name: 'NVIDIA NIM Whisper Large V3',
    provider: 'nvidia',
    modelIdentifier: 'openai/whisper-large-v3',
    description: 'OpenAI Whisper acelerado en la infraestructura de computación de NVIDIA Cloud.',
    badge: '🟢 NVIDIA Cloud',
    speed: '~5s'
  },
  {
    id: 'nvidia-parakeet-multilingual',
    name: 'NVIDIA Parakeet 1.1B RNNT',
    provider: 'nvidia',
    modelIdentifier: 'nvidia/parakeet-1.1b-rnnt-multilingual-asr',
    description: 'Arquitectura RNNT de NVIDIA optimizada para reconocimiento en 25 idiomas con alta precisión.',
    badge: '🦜 Parakeet Multilingual',
    speed: '~4s'
  }
];

export function getCleanGroqKey(groqApiKey?: string): string {
  let key = (groqApiKey || '').trim();
  if (key.startsWith('[')) {
    try {
      const arr = JSON.parse(key);
      if (Array.isArray(arr) && arr[0]) key = String(arr[0]).trim();
    } catch {}
  }
  if (!key) {
    const stored = localStorage.getItem('bulk_groq_api_keys') || '';
    if (stored.startsWith('[')) {
      try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr[0]) key = String(arr[0]).trim();
      } catch {}
    } else {
      key = stored.trim();
    }
  }
  return key || DEFAULT_GROQ_API_KEY;
}

export function getCleanNvidiaKey(nvidiaApiKey?: string): string {
  let key = (nvidiaApiKey || '').trim();
  if (key.startsWith('[')) {
    try {
      const arr = JSON.parse(key);
      if (Array.isArray(arr) && arr[0]) key = String(arr[0]).trim();
    } catch {}
  }
  if (!key) {
    const stored = localStorage.getItem('bulk_nvidia_api_keys') || '';
    if (stored.startsWith('[')) {
      try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr[0]) key = String(arr[0]).trim();
      } catch {}
    } else {
      key = stored.trim();
    }
  }
  return key;
}

export function getCleanAssemblyKey(apiKey?: string): string {
  const key = (apiKey || '').trim() || (localStorage.getItem('bulk_assembly_api_key') || '').trim();
  return key || DEFAULT_ASSEMBLY_API_KEY;
}

export function getCleanDeepgramKey(apiKey?: string): string {
  const key = (apiKey || '').trim() || (localStorage.getItem('bulk_deepgram_api_key') || '').trim();
  return key || DEFAULT_DEEPGRAM_API_KEY;
}

/**
 * Codifica un AudioBuffer mono a un Blob WAV de 16-bit PCM a 16kHz
 */
function encodeAudioBufferToWav(buffer: AudioBuffer): Blob {
  const sampleRate = buffer.sampleRate;
  const numChannels = 1;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;
  const dataSize = numSamples * 2;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Encuentra el momento de mayor silencio (valle de energía RMS más bajo)
 * dentro de una ventana de búsqueda para que el corte entre chunks NUNCA
 * corte una palabra a la mitad ("ca-sa"), sino que ocurra en una pausa natural.
 */
function findOptimalSilenceCutPoint(
  channelData: Float32Array,
  sampleRate: number,
  targetTimeSec: number,
  windowBeforeSec = 25,
  windowAfterSec = 10
): number {
  const targetSample = Math.floor(targetTimeSec * sampleRate);
  const startSearch = Math.max(0, targetSample - Math.floor(windowBeforeSec * sampleRate));
  const endSearch = Math.min(channelData.length, targetSample + Math.floor(windowAfterSec * sampleRate));

  const frameSize = Math.floor(0.15 * sampleRate); // Ventana de 150ms
  const hopSize = Math.floor(0.05 * sampleRate);   // Salto de 50ms

  let minEnergy = Infinity;
  let bestCutSample = targetSample;

  for (let i = startSearch; i + frameSize < endSearch; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < frameSize; j++) {
      const val = channelData[i + j];
      sum += val * val;
    }
    const rms = Math.sqrt(sum / frameSize);

    // Si encontramos una pausa con silencio profundo (< 0.005 RMS), fijar este corte de inmediato
    if (rms < 0.005) {
      bestCutSample = i + Math.floor(frameSize / 2);
      break;
    }

    if (rms < minEnergy) {
      minEnergy = rms;
      bestCutSample = i + Math.floor(frameSize / 2);
    }
  }

  return Number((bestCutSample / sampleRate).toFixed(3));
}

/**
 * Convierte y optimiza un audio a 16kHz mono (el formato nativo de Whisper).
 * Si el archivo es mayor a 18MB o dura más de 8 minutos (hasta 1 o 2 horas),
 * lo particiona en silencios naturales calculados mediante VAD para evitar cortes de palabras
 * y garantizar timestamps continuos y sin saltos.
 */
export async function optimizeAndSliceAudio(file: File | Blob): Promise<Array<{ blob: Blob; offsetSec: number }>> {
  const isCompressed = file.type.includes('mp3') || file.type.includes('mpeg') || file.type.includes('ogg') || file.type.includes('m4a');
  if (file.size < 18 * 1024 * 1024 && isCompressed) {
    return [{ blob: file, offsetSec: 0 }];
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return [{ blob: file, offsetSec: 0 }];
    }

    const audioCtx = new AudioContextClass();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();

    const targetRate = 16000;
    const duration = decoded.duration;
    const channelData = decoded.getChannelData(0);

    // Chunks de máx 480 segundos (8 minutos = ~15.3 MB en 16kHz mono)
    const MAX_CHUNK_SEC = 480;

    if (duration <= MAX_CHUNK_SEC) {
      const offlineCtx = new OfflineAudioContext(1, Math.ceil(duration * targetRate), targetRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineCtx.destination);
      source.start(0);
      const rendered = await offlineCtx.startRendering();
      const wav = encodeAudioBufferToWav(rendered);
      return [{ blob: wav, offsetSec: 0 }];
    }

    // Dividir en múltiples chunks cortando EXCLUSIVAMENTE en pausas/silencios naturales
    const chunks: Array<{ blob: Blob; offsetSec: number }> = [];
    let currentStart = 0;

    while (currentStart < duration) {
      const remaining = duration - currentStart;
      if (remaining <= MAX_CHUNK_SEC) {
        // Último segmento
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(remaining * targetRate), targetRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = decoded;
        source.connect(offlineCtx.destination);
        source.start(0, currentStart, remaining);

        const rendered = await offlineCtx.startRendering();
        const wav = encodeAudioBufferToWav(rendered);
        chunks.push({ blob: wav, offsetSec: currentStart });
        break;
      }

      // Buscar silencio óptimo alrededor de (currentStart + MAX_CHUNK_SEC)
      const targetCutTime = currentStart + MAX_CHUNK_SEC;
      const actualCutTime = findOptimalSilenceCutPoint(channelData, decoded.sampleRate, targetCutTime, 25, 5);
      const chunkDuration = Math.max(60, actualCutTime - currentStart);

      const offlineCtx = new OfflineAudioContext(1, Math.ceil(chunkDuration * targetRate), targetRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineCtx.destination);
      source.start(0, currentStart, chunkDuration);

      const rendered = await offlineCtx.startRendering();
      const wav = encodeAudioBufferToWav(rendered);
      chunks.push({ blob: wav, offsetSec: currentStart });

      // El siguiente chunk inicia exactamente donde terminó el silencio
      currentStart += chunkDuration;
    }

    return chunks;
  } catch (err) {
    console.warn('[AudioOptimizer] Fallback a envío original:', err);
    return [{ blob: file, offsetSec: 0 }];
  }
}

async function sendSingleWhisperChunk(
  chunkBlob: Blob,
  cleanKey: string,
  endpoints: string[],
  whisperModel: 'whisper-large-v3-turbo' | 'whisper-large-v3' = 'whisper-large-v3-turbo',
  signal?: AbortSignal
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', chunkBlob, 'audio_chunk.wav');
  formData.append('model', whisperModel);
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      if (signal?.aborted) throw new Error('Transcripción cancelada');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
        },
        body: formData,
        signal,
      });

      if (!response.ok) {
        if (response.status === 404 && endpoint.startsWith('/api')) {
          continue;
        }
        const errText = await response.text();
        throw new Error(`Error en Groq Whisper (${response.status}): ${errText.slice(0, 150)}`);
      }

      const data = await response.json();

      return {
        text: data.text || '',
        duration: data.duration || 0,
        words: (data.words || []).map((w: any) => ({
          word: w.word,
          start: Number(w.start),
          end: Number(w.end),
        })),
        segments: (data.segments || []).map((s: any) => ({
          id: s.id,
          start: Number(s.start),
          end: Number(s.end),
          text: s.text.trim(),
        })),
      };
    } catch (err: any) {
      lastError = err;
      if (signal?.aborted) throw err;
      console.warn(`Intento de transcripción en ${endpoint} falló:`, err.message);
    }
  }

  throw lastError || new Error('No se pudo conectar con Groq Whisper.');
}

export async function transcribeAudioWithGroq(
  file: File | Blob,
  groqApiKey: string = DEFAULT_GROQ_API_KEY,
  whisperModel: 'whisper-large-v3-turbo' | 'whisper-large-v3' = 'whisper-large-v3-turbo',
  signal?: AbortSignal
): Promise<TranscriptionResult> {
  const cleanKey = getCleanGroqKey(groqApiKey);
  if (!cleanKey) {
    throw new Error('Groq API Key no configurada para transcripción de audio.');
  }

  const endpoints = [
    '/api/groq/openai/v1/audio/transcriptions',
    'https://api.groq.com/openai/v1/audio/transcriptions'
  ];

  // 1. Optimizar y particionar el audio con detección inteligente de silencios VAD
  const chunks = await optimizeAndSliceAudio(file);

  if (chunks.length === 1) {
    return sendSingleWhisperChunk(chunks[0].blob, cleanKey, endpoints, whisperModel, signal);
  }

  // 2. Múltiples chunks (para audios de hasta 1 o 2 horas): transcribir y fusionar con offset exacto
  let mergedWords: WordTimestamp[] = [];
  let mergedSegments: SegmentTimestamp[] = [];
  const textParts: string[] = [];
  let totalDuration = 0;
  let segmentIdCounter = 0;

  for (const chunk of chunks) {
    const chunkResult = await sendSingleWhisperChunk(chunk.blob, cleanKey, endpoints, whisperModel, signal);
    textParts.push(chunkResult.text);

    // Desplazar timestamps por el offset milimétrico del chunk
    const shiftedWords = chunkResult.words.map(w => ({
      ...w,
      start: Number((w.start + chunk.offsetSec).toFixed(2)),
      end: Number((w.end + chunk.offsetSec).toFixed(2))
    }));
    mergedWords.push(...shiftedWords);

    const shiftedSegments = chunkResult.segments.map(s => ({
      id: segmentIdCounter++,
      start: Number((s.start + chunk.offsetSec).toFixed(2)),
      end: Number((s.end + chunk.offsetSec).toFixed(2)),
      text: s.text
    }));
    mergedSegments.push(...shiftedSegments);

    totalDuration = Math.max(totalDuration, chunk.offsetSec + chunkResult.duration);
  }

  return {
    text: textParts.join(' ').trim(),
    duration: totalDuration,
    words: mergedWords,
    segments: mergedSegments
  };
}

async function sendSingleNvidiaChunk(
  chunkBlob: Blob,
  cleanKey: string,
  model: string = 'openai/whisper-large-v3',
  signal?: AbortSignal
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', chunkBlob, 'audio_chunk.wav');
  formData.append('model', model);
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const endpoints = [
    'https://integrate.api.nvidia.com/v1/audio/transcriptions',
    'https://ai.api.nvidia.com/v1/audio/transcriptions'
  ];

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      if (signal?.aborted) throw new Error('Transcripción cancelada');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
        },
        body: formData,
        signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error en NVIDIA NIM ASR (${response.status}): ${errText.slice(0, 160)}`);
      }

      const data = await response.json();
      return {
        text: data.text || '',
        duration: data.duration || 0,
        words: (data.words || []).map((w: any) => ({
          word: w.word || '',
          start: Number(w.start),
          end: Number(w.end),
        })),
        segments: (data.segments || []).map((s: any) => ({
          id: s.id,
          start: Number(s.start),
          end: Number(s.end),
          text: (s.text || '').trim(),
        })),
      };
    } catch (err: any) {
      lastError = err;
      if (signal?.aborted) throw err;
      console.warn(`Intento en NVIDIA NIM ${endpoint} falló:`, err.message);
    }
  }

  throw lastError || new Error('No se pudo conectar con el endpoint ASR de NVIDIA NIM.');
}

export async function transcribeAudioWithNvidia(
  file: File | Blob,
  apiKey?: string,
  model: string = 'openai/whisper-large-v3',
  signal?: AbortSignal,
  onProgress?: (msg: string) => void
): Promise<TranscriptionResult> {
  const cleanKey = getCleanNvidiaKey(apiKey);
  if (!cleanKey) {
    throw new Error('API Key de NVIDIA NIM no configurada para transcripción de audio.');
  }

  const chunks = await optimizeAndSliceAudio(file);

  if (chunks.length === 1) {
    if (onProgress) onProgress(`Transcribiendo con NVIDIA NIM (${model})...`);
    return sendSingleNvidiaChunk(chunks[0].blob, cleanKey, model, signal);
  }

  let mergedWords: WordTimestamp[] = [];
  let mergedSegments: SegmentTimestamp[] = [];
  const textParts: string[] = [];
  let totalDuration = 0;
  let segmentIdCounter = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (onProgress) onProgress(`Transcribiendo bloque ${i + 1}/${chunks.length} con NVIDIA NIM...`);
    const chunkResult = await sendSingleNvidiaChunk(chunk.blob, cleanKey, model, signal);
    textParts.push(chunkResult.text);

    const shiftedWords = chunkResult.words.map(w => ({
      ...w,
      start: Number((w.start + chunk.offsetSec).toFixed(2)),
      end: Number((w.end + chunk.offsetSec).toFixed(2))
    }));
    mergedWords.push(...shiftedWords);

    const shiftedSegments = chunkResult.segments.map(s => ({
      id: segmentIdCounter++,
      start: Number((s.start + chunk.offsetSec).toFixed(2)),
      end: Number((s.end + chunk.offsetSec).toFixed(2)),
      text: s.text
    }));
    mergedSegments.push(...shiftedSegments);

    totalDuration = Math.max(totalDuration, chunk.offsetSec + chunkResult.duration);
  }

  return {
    text: textParts.join(' ').trim(),
    duration: totalDuration,
    words: mergedWords,
    segments: mergedSegments
  };
}

export async function transcribeAudioWithAssembly(
  file: File | Blob,
  apiKey?: string,
  signal?: AbortSignal,
  onProgress?: (msg: string) => void
): Promise<TranscriptionResult> {
  const cleanKey = getCleanAssemblyKey(apiKey);
  if (!cleanKey) {
    throw new Error('API Key de AssemblyAI no configurada.');
  }

  if (onProgress) onProgress('Subiendo audio a servidores de AssemblyAI...');

  const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': cleanKey,
    },
    body: file,
    signal
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Error al subir audio a AssemblyAI (${uploadRes.status}): ${err.slice(0, 150)}`);
  }

  const { upload_url } = await uploadRes.json();
  if (!upload_url) throw new Error('AssemblyAI no devolvió una URL de subida válida.');

  if (onProgress) onProgress('Procesando transcripción fonética y timestamps con AssemblyAI...');

  const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': cleanKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url,
      language_detection: true,
      punctuate: true,
      format_text: true,
      speech_model: 'best'
    }),
    signal
  });

  if (!transcriptRes.ok) {
    const err = await transcriptRes.text();
    throw new Error(`Error al solicitar transcripción a AssemblyAI (${transcriptRes.status}): ${err.slice(0, 150)}`);
  }

  const { id: transcriptId } = await transcriptRes.json();
  if (!transcriptId) throw new Error('No se recibió ID de transcripción de AssemblyAI.');

  let attempts = 0;
  const maxAttempts = 80;
  while (attempts < maxAttempts) {
    if (signal?.aborted) throw new Error('Transcripción cancelada.');
    await new Promise(r => setTimeout(r, 1500));
    attempts++;

    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'Authorization': cleanKey },
      signal
    });

    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();

    if (pollData.status === 'completed') {
      const words: WordTimestamp[] = (pollData.words || []).map((w: any) => ({
        word: w.text || '',
        start: Number((w.start / 1000).toFixed(2)),
        end: Number((w.end / 1000).toFixed(2))
      }));

      const lastWord = words[words.length - 1];
      const duration = Number(pollData.audio_duration ? pollData.audio_duration : (lastWord ? lastWord.end : 0));

      const segments: SegmentTimestamp[] = [];
      if (words.length > 0) {
        let segWords: WordTimestamp[] = [];
        let segId = 0;
        for (const w of words) {
          segWords.push(w);
          if (/[.,!?;:]$/.test(w.word) || segWords.length >= 10) {
            segments.push({
              id: segId++,
              start: segWords[0].start,
              end: segWords[segWords.length - 1].end,
              text: segWords.map(x => x.word).join(' ')
            });
            segWords = [];
          }
        }
        if (segWords.length > 0) {
          segments.push({
            id: segId++,
            start: segWords[0].start,
            end: segWords[segWords.length - 1].end,
            text: segWords.map(x => x.word).join(' ')
          });
        }
      }

      return {
        text: pollData.text || '',
        duration,
        words,
        segments
      };
    } else if (pollData.status === 'error') {
      throw new Error(`Fallo en AssemblyAI: ${pollData.error || 'Error desconocido'}`);
    }

    if (onProgress) {
      onProgress(`Alineando fonéticamente con AssemblyAI (${pollData.status} - ${(attempts * 1.5).toFixed(0)}s)...`);
    }
  }

  throw new Error('Tiempo de espera agotado al transcribir con AssemblyAI.');
}

export async function transcribeAudioWithDeepgram(
  file: File | Blob,
  apiKey?: string,
  model: string = 'nova-3',
  signal?: AbortSignal,
  onProgress?: (msg: string) => void
): Promise<TranscriptionResult> {
  const cleanKey = getCleanDeepgramKey(apiKey);
  if (!cleanKey) {
    throw new Error('API Key de Deepgram no configurada.');
  }

  if (onProgress) onProgress(`Enviando audio a Deepgram (${model})...`);

  const url = `https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model)}&smart_format=true&punctuate=true&utterances=true&diarize=false`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${cleanKey}`,
      'Content-Type': file.type || 'audio/wav'
    },
    body: file,
    signal
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error en Deepgram Nova (${response.status}): ${err.slice(0, 160)}`);
  }

  const data = await response.json();
  const alt = data.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) {
    throw new Error('Deepgram no devolvió transcripción para este audio.');
  }

  const words: WordTimestamp[] = (alt.words || []).map((w: any) => ({
    word: w.punctuated_word || w.word || '',
    start: Number(w.start.toFixed(2)),
    end: Number(w.end.toFixed(2))
  }));

  const segments: SegmentTimestamp[] = (data.results?.utterances || []).map((u: any, idx: number) => ({
    id: idx,
    start: Number(u.start.toFixed(2)),
    end: Number(u.end.toFixed(2)),
    text: (u.transcript || '').trim()
  }));

  const lastWord = words[words.length - 1];
  const duration = Number(data.metadata?.duration || (lastWord ? lastWord.end : 0));

  return {
    text: alt.transcript || '',
    duration,
    words,
    segments
  };
}

export async function transcribeAudioUniversal({
  file,
  modelId = 'groq-whisper-turbo',
  groqKey,
  nvidiaKey,
  assemblyKey,
  deepgramKey,
  signal,
  onProgress
}: {
  file: File | Blob;
  modelId?: string;
  groqKey?: string;
  nvidiaKey?: string;
  assemblyKey?: string;
  deepgramKey?: string;
  signal?: AbortSignal;
  onProgress?: (status: string) => void;
}): Promise<TranscriptionResult> {
  const modelOption = AVAILABLE_STT_MODELS.find(m => m.id === modelId) || AVAILABLE_STT_MODELS[0];
  const provider = modelOption.provider;

  if (onProgress) onProgress(`Iniciando transcripción con ${modelOption.name}...`);

  try {
    if (provider === 'deepgram') {
      return await transcribeAudioWithDeepgram(file, deepgramKey, modelOption.modelIdentifier, signal, onProgress);
    } else if (provider === 'assemblyai') {
      return await transcribeAudioWithAssembly(file, assemblyKey, signal, onProgress);
    } else if (provider === 'nvidia') {
      return await transcribeAudioWithNvidia(file, nvidiaKey, modelOption.modelIdentifier, signal, onProgress);
    } else {
      const whisperM = (modelOption.modelIdentifier as 'whisper-large-v3-turbo' | 'whisper-large-v3') || 'whisper-large-v3-turbo';
      return await transcribeAudioWithGroq(file, groqKey, whisperM, signal);
    }
  } catch (err: any) {
    console.warn(`[STT Universal] Falló proveedor ${provider} (${modelOption.name}):`, err?.message);
    if (provider !== 'groq' && getCleanGroqKey(groqKey)) {
      if (onProgress) onProgress(`Reintentando con Groq Whisper Turbo como respaldo...`);
      return await transcribeAudioWithGroq(file, groqKey, 'whisper-large-v3-turbo', signal);
    }
    if (provider !== 'deepgram' && getCleanDeepgramKey(deepgramKey)) {
      if (onProgress) onProgress(`Reintentando con Deepgram Nova-3 como respaldo...`);
      return await transcribeAudioWithDeepgram(file, deepgramKey, 'nova-3', signal, onProgress);
    }
    throw err;
  }
}


/**
 * Alinea los segmentos de escenas generados por la IA con los timestamps
 * exactos obtenidos por Whisper para sincronización milimétrica con la voz en off.
 */
export function alignScenesWithWhisper(
  scenes: Array<{ scriptLine: string; [key: string]: any }>,
  transcription: TranscriptionResult
): Array<{ scriptLine: string; startTime: number; endTime: number; duration: number; [key: string]: any }> {
  if (!transcription || !transcription.segments || transcription.segments.length === 0) {
    return scenes.map((s, i) => ({
      ...s,
      startTime: i * 4,
      endTime: (i + 1) * 4,
      duration: 4,
    }));
  }

  const { segments, duration: totalDuration } = transcription;
  const totalScenes = scenes.length;

  // Si la cantidad de escenas coincide aproximadamente con los segmentos de Whisper
  if (Math.abs(segments.length - totalScenes) <= 2 && segments.length > 0) {
    return scenes.map((scene, i) => {
      const segIndex = Math.min(i, segments.length - 1);
      const seg = segments[segIndex];
      const startTime = seg.start;
      const nextSeg = segments[segIndex + 1];
      const endTime = nextSeg ? nextSeg.start : (seg.end || totalDuration);
      const duration = Math.max(0.5, endTime - startTime);

      return {
        ...scene,
        startTime,
        endTime,
        duration: Number(duration.toFixed(2)),
      };
    });
  }

  // Si hay más o menos escenas, calculamos proporción temporal acumulada según las palabras
  const totalWords = transcription.words.length;
  if (totalWords > 0) {
    let currentWordIdx = 0;
    const totalScenesLength = scenes.reduce((acc, s) => acc + (s.scriptLine || '').length, 0);

    let accumulatedTime = 0;

    return scenes.map((scene, i) => {
      const sceneCharCount = (scene.scriptLine || '').length;
      const proportion = totalScenesLength > 0 ? sceneCharCount / totalScenesLength : 1 / totalScenes;
      const targetWordsCount = Math.max(1, Math.round(proportion * totalWords));

      const startTime = accumulatedTime;
      const endWordIdx = Math.min(totalWords - 1, currentWordIdx + targetWordsCount);
      const endTime = i === totalScenes - 1 
        ? totalDuration 
        : (transcription.words[endWordIdx]?.end || (startTime + proportion * totalDuration));

      currentWordIdx = endWordIdx;
      const duration = Math.max(0.5, endTime - startTime);
      accumulatedTime = endTime;

      return {
        ...scene,
        startTime: Number(startTime.toFixed(2)),
        endTime: Number(endTime.toFixed(2)),
        duration: Number(duration.toFixed(2)),
      };
    });
  }

  // Fallback simple por duración total
  const avg = totalDuration / totalScenes;
  return scenes.map((scene, i) => ({
    ...scene,
    startTime: Number((i * avg).toFixed(2)),
    endTime: Number(((i + 1) * avg).toFixed(2)),
    duration: Number(avg.toFixed(2)),
  }));
}

export interface SmartBeatScene {
  sceneNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  text: string;
  wordsCount: number;
  isHook: boolean;
  words: WordTimestamp[];
}

export interface SmartBeatsConfig {
  hookScenesCount: number; // e.g. 4 escenas iniciales
  hookDurationSec: number; // e.g. 1.8s
  restDurationSec: number; // e.g. 3.2s
  snapToPunctuation: boolean; // Cortes semánticos alineados a puntuación (. , ! ?)
  snapToSilences: boolean; // Cortes alineados a silencios acústicos
}

/**
 * Motor de segmentación inteligente multi-rango para retención vertical y narrativa:
 * - Fase 1 (Hook Inicial): Aplica un ritmo acelerado (ej. 1.5s - 2.0s) a las primeras N escenas.
 * - Fase 2 (Cuerpo del Video): Aplica un ritmo narrativo fluido (ej. 2.5s - 4.5s) al resto.
 * - Cortes Semánticos con Sentido: Nunca corta a mitad de frase o de palabra, ajustando
 *   la división a signos de puntuación y valles acústicos de silencio.
 */
export function calculateSmartBeatsSegmentation(
  words: WordTimestamp[],
  totalDuration: number,
  config: SmartBeatsConfig,
  fallbackScriptText?: string
): SmartBeatScene[] {
  const {
    hookScenesCount = 4,
    hookDurationSec = 1.8,
    restDurationSec = 3.2,
    snapToPunctuation = true,
    snapToSilences = true
  } = config;

  let effectiveWords = [...(words || [])];
  let effectiveDuration = totalDuration;

  if (effectiveWords.length === 0 && fallbackScriptText && fallbackScriptText.trim()) {
    const rawWords = fallbackScriptText.trim().split(/\s+/).filter(Boolean);
    const count = rawWords.length;
    if (count > 0) {
      if (effectiveDuration <= 0) {
        effectiveDuration = Math.max(3, (count / 140) * 60);
      }
      const secPerWord = effectiveDuration / count;
      effectiveWords = rawWords.map((w, idx) => ({
        word: w,
        start: Number((idx * secPerWord).toFixed(2)),
        end: Number(((idx + 1) * secPerWord).toFixed(2))
      }));
    }
  }

  if (effectiveWords.length === 0) {
    return [];
  }

  const punctuationRegex = /[.,!?;:…\n\r]+$/;
  const scenes: SmartBeatScene[] = [];
  let currentWordIdx = 0;
  let currentStartTime = effectiveWords[0].start;
  let sceneIndex = 0;

  while (currentWordIdx < effectiveWords.length) {
    const isHook = sceneIndex < hookScenesCount;
    const targetDuration = isHook ? hookDurationSec : restDurationSec;
    const targetEndTime = currentStartTime + targetDuration;

    let bestEndIdx = currentWordIdx;
    let minDistance = Infinity;

    let foundPunctuationIdx: number | null = null;
    let minPunctDistance = Infinity;

    let foundSilenceIdx: number | null = null;
    let minSilenceDistance = Infinity;

    for (let i = currentWordIdx; i < effectiveWords.length; i++) {
      const w = effectiveWords[i];
      const wordEnd = w.end;
      const distance = Math.abs(wordEnd - targetEndTime);

      if (distance < minDistance) {
        minDistance = distance;
        bestEndIdx = i;
      }

      // Puntuación gramatical (para que la escena termine con sentido completo)
      if (snapToPunctuation && punctuationRegex.test(w.word.trim())) {
        const pDistance = Math.abs(wordEnd - targetEndTime);
        if (pDistance <= targetDuration * 0.6 && pDistance < minPunctDistance) {
          minPunctDistance = pDistance;
          foundPunctuationIdx = i;
        }
      }

      // Silencios acústicos entre palabras contiguas
      if (snapToSilences && i < effectiveWords.length - 1) {
        const nextWord = effectiveWords[i + 1];
        const gap = nextWord.start - w.end;
        if (gap >= 0.18) {
          const sDistance = Math.abs(w.end - targetEndTime);
          if (sDistance <= targetDuration * 0.5 && sDistance < minSilenceDistance) {
            minSilenceDistance = sDistance;
            foundSilenceIdx = i;
          }
        }
      }

      if (wordEnd > targetEndTime + targetDuration * 0.75) {
        break;
      }
    }

    let chosenEndIdx = bestEndIdx;
    if (foundPunctuationIdx !== null) {
      chosenEndIdx = foundPunctuationIdx;
    } else if (foundSilenceIdx !== null) {
      chosenEndIdx = foundSilenceIdx;
    }

    chosenEndIdx = Math.max(currentWordIdx, chosenEndIdx);

    // Si quedan muy pocas palabras al final, absorberlas
    if (effectiveWords.length - 1 - chosenEndIdx <= 2) {
      chosenEndIdx = effectiveWords.length - 1;
    }

    const sceneSlice = effectiveWords.slice(currentWordIdx, chosenEndIdx + 1);
    const sceneStart = currentStartTime;
    let sceneEnd = sceneSlice[sceneSlice.length - 1].end;

    if (chosenEndIdx === effectiveWords.length - 1 && effectiveDuration > sceneEnd) {
      sceneEnd = effectiveDuration;
    }

    const duration = Math.max(0.4, Number((sceneEnd - sceneStart).toFixed(2)));
    const text = sceneSlice.map(w => w.word).join(' ').trim();

    scenes.push({
      sceneNumber: sceneIndex + 1,
      startTime: Number(sceneStart.toFixed(2)),
      endTime: Number(sceneEnd.toFixed(2)),
      duration,
      text,
      wordsCount: sceneSlice.length,
      isHook,
      words: sceneSlice
    });

    currentWordIdx = chosenEndIdx + 1;
    currentStartTime = sceneEnd;
    sceneIndex++;
  }

  return scenes;
}

