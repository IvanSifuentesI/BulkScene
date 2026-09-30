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

export async function transcribeAudioWithGroq(
  file: File | Blob,
  groqApiKey: string = DEFAULT_GROQ_API_KEY,
  signal?: AbortSignal
): Promise<TranscriptionResult> {
  const cleanKey = (groqApiKey || DEFAULT_GROQ_API_KEY).trim();
  if (!cleanKey) {
    throw new Error('Groq API Key no configurada para transcripción de audio.');
  }

  const formData = new FormData();
  formData.append('file', file, (file as File).name || 'audio.mp3');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const endpoints = [
    '/api/groq/openai/v1/audio/transcriptions',
    'https://api.groq.com/openai/v1/audio/transcriptions'
  ];

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      if (signal?.aborted) {
        throw new Error('Transcripción cancelada');
      }

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
          continue; // Intenta con el endpoint directo
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
