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

function getCleanGroqKey(groqApiKey?: string): string {
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
 * Convierte y optimiza un audio a 16kHz mono (el formato nativo de Whisper).
 * Si el archivo es mayor a 18MB o si dura más de 8 minutos, lo particiona en chunks
 * para evitar al 100% el error 413 (Request Entity Too Large).
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

    const chunks: Array<{ blob: Blob; offsetSec: number }> = [];
    let currentStart = 0;

    while (currentStart < duration) {
      const chunkDuration = Math.min(MAX_CHUNK_SEC, duration - currentStart);
      const offlineCtx = new OfflineAudioContext(1, Math.ceil(chunkDuration * targetRate), targetRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineCtx.destination);
      source.start(0, currentStart, chunkDuration);

      const rendered = await offlineCtx.startRendering();
      const wav = encodeAudioBufferToWav(rendered);
      chunks.push({ blob: wav, offsetSec: currentStart });

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
  signal?: AbortSignal
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', chunkBlob, 'audio_chunk.wav');
  formData.append('model', 'whisper-large-v3-turbo');
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

  // 1. Optimizar y particionar el audio si es necesario para evitar 413
  const chunks = await optimizeAndSliceAudio(file);

  if (chunks.length === 1) {
    return sendSingleWhisperChunk(chunks[0].blob, cleanKey, endpoints, signal);
  }

  // 2. Múltiples chunks (audio largo): transcribir y fusionar con offset temporal
  let mergedWords: WordTimestamp[] = [];
  let mergedSegments: SegmentTimestamp[] = [];
  const textParts: string[] = [];
  let totalDuration = 0;
  let segmentIdCounter = 0;

  for (const chunk of chunks) {
    const chunkResult = await sendSingleWhisperChunk(chunk.blob, cleanKey, endpoints, signal);
    textParts.push(chunkResult.text);

    // Desplazar timestamps por el offset del chunk
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
