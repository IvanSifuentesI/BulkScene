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

