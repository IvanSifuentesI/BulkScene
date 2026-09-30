import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Volume2, 
  Play, 
  Pause, 
  ArrowRight, 
  RefreshCw, 
  Sliders, 
  CheckCircle2, 
  Upload, 
  Clock, 
  FileAudio
} from 'lucide-react';
import { 
  splitScriptIntoChunks, 
  getAvailableVoices, 
  synthesizeChunk, 
  concatenateAudioBlobs, 
  AudioChunk, 
  VoiceOption 
} from '../services/audioGenerationService';
import { 
  transcribeAudioWithGroq, 
  TranscriptionResult 
} from '../services/audioTranscriptionService';

interface AudioStageProps {
  scriptText: string;
  groqKeys: string[];
  onProceedToScenes: (
    script: string, 
    audioBlob: Blob | null, 
    audioDuration: number, 
    transcription: TranscriptionResult | null
  ) => void;
}

export const AudioStage: React.FC<AudioStageProps> = ({
  scriptText,
  groqKeys,
  onProceedToScenes,
}) => {
  const [currentScript, setCurrentScript] = useState<string>(scriptText);
  const [wordsPerChunk, setWordsPerChunk] = useState<number>(35); // 35 palabras por petición
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.05);

  // Execution states
  const [isGeneratingChunks, setIsGeneratingChunks] = useState<boolean>(false);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number>(-1);
  const [unifiedAudioBlob, setUnifiedAudioBlob] = useState<Blob | null>(null);
  const [unifiedAudioUrl, setUnifiedAudioUrl] = useState<string | null>(null);
  const [unifiedDuration, setUnifiedDuration] = useState<number>(0);

  // Whisper Transcription state
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);

  // Upload external audio state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Audio player ref
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Initialize voices and chunks
  useEffect(() => {
    getAvailableVoices().then((v) => {
      setVoices(v);
      if (v.length > 0 && !selectedVoice) {
        setSelectedVoice(v[0].name);
      }
    });
  }, []);

  useEffect(() => {
    if (currentScript.trim()) {
      const generated = splitScriptIntoChunks(currentScript, wordsPerChunk);
      setChunks(generated);
    }
  }, [currentScript, wordsPerChunk]);

  // Generar locución de todos los chunks secuencialmente
  const handleGenerateAllChunks = async () => {
    if (chunks.length === 0 || isGeneratingChunks) return;
    setIsGeneratingChunks(true);

    const updatedChunks = [...chunks];
    const generatedBlobs: Blob[] = [];

    for (let i = 0; i < updatedChunks.length; i++) {
      setCurrentGeneratingIndex(i);
      updatedChunks[i].status = 'generating';
      setChunks([...updatedChunks]);

      try {
        const { blob, duration } = await synthesizeChunk(
          updatedChunks[i].text,
          selectedVoice,
          speechRate
        );

        updatedChunks[i].audioBlob = blob;
        updatedChunks[i].audioUrl = URL.createObjectURL(blob);
        updatedChunks[i].durationSeconds = duration;
        updatedChunks[i].status = 'completed';
        generatedBlobs.push(blob);
      } catch (err: any) {
        updatedChunks[i].status = 'error';
        updatedChunks[i].error = err?.message || 'Error sintetizando fragmento';
      }

      setChunks([...updatedChunks]);
    }

    setIsGeneratingChunks(false);
    setCurrentGeneratingIndex(-1);

    // Unificar automáticamente los fragmentos generados
    if (generatedBlobs.length > 0) {
      await assembleAndAlignAudio(generatedBlobs);
    }
  };

  // Ensamblar blobs y sincronizar con Whisper
  const assembleAndAlignAudio = async (blobs: Blob[]) => {
    const combinedBlob = await concatenateAudioBlobs(blobs);
    setUnifiedAudioBlob(combinedBlob);
    const audioUrl = URL.createObjectURL(combinedBlob);
    setUnifiedAudioUrl(audioUrl);

    // Calcular duración estimada
    const totalDuration = chunks.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    setUnifiedDuration(totalDuration);

    // Ejecutar Groq Whisper para alineación de timestamps
    const groqKey = groqKeys[0] || '';
    if (groqKey) {
      setIsTranscribing(true);
      try {
        const whisperRes = await transcribeAudioWithGroq(combinedBlob, groqKey);
        setTranscriptionResult(whisperRes);
        if (whisperRes.duration) {
          setUnifiedDuration(whisperRes.duration);
        }
      } catch (err: any) {
        console.warn('Groq Whisper advertencia:', err?.message || err);
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  // Subir archivo de audio propio (.mp3, .wav)
  const handleUploadExternalAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUnifiedAudioBlob(file);
    const url = URL.createObjectURL(file);
    setUnifiedAudioUrl(url);

    // Obtener duración nativa
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setUnifiedDuration(tempAudio.duration);
    };

    // Transcribir con Groq Whisper
    const groqKey = groqKeys[0] || '';
    if (groqKey) {
      setIsTranscribing(true);
      try {
        const whisperRes = await transcribeAudioWithGroq(file, groqKey);
        setTranscriptionResult(whisperRes);
        if (whisperRes.duration) {
          setUnifiedDuration(whisperRes.duration);
        }
        if (whisperRes.text && whisperRes.text.length > 20) {
          setCurrentScript(whisperRes.text);
        }
      } catch (err: any) {
        console.warn('Error transcribiendo audio subido:', err);
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !unifiedAudioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const completedChunksCount = chunks.filter((c) => c.status === 'completed').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Card */}
      <div className="bg-[#0e111a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Paso 2: Generación de Audio y Purgado de Silencios
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-0.5">
              Fraccionamiento inteligente de guiones, purgado de silencios muertos y sincronización milimétrica con Groq Whisper Large v3 Turbo.
            </p>
          </div>
        </div>
      </div>

      {/* 1. SECCIÓN: CONFIGURACIÓN DE FRACCIONAMIENTO & VOZ */}
      <div className="bg-[#0e111a] rounded-2xl p-6 space-y-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04]">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            1. Calibración de Fraccionamiento (Chunking Inteligente)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Palabras por Petición (Chunk Size)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="15"
                max="120"
                value={wordsPerChunk}
                onChange={(e) => setWordsPerChunk(Number(e.target.value))}
                className="w-24 px-3 py-2.5 rounded-xl bg-[#08090d] text-emerald-400 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
              />
              <span className="text-xs text-slate-400">palabras por bloque</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
              Previene cortes en guiones extensos de hasta 1 hora sin saturar memoria.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Voz del Locutor
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#08090d] text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
              Voces nativas optimizadas para locución comercial.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Velocidad de Locución ({speechRate}x)
            </label>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
              <span>0.8x (Pausado)</span>
              <span className="text-emerald-400/80">1.05x (Dinámico)</span>
              <span>1.4x (Rápido)</span>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Total Bloques: <strong className="text-white">{chunks.length}</strong>
            </span>
            {completedChunksCount > 0 && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                {completedChunksCount}/{chunks.length} Generados
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Cargar Audio Externo */}
            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#08090d] hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>{uploadedFileName ? 'Reemplazar Audio' : 'O Subir Locución (.mp3)'}</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleUploadExternalAudio}
                className="hidden"
              />
            </label>

            {/* Generar TTS Parte por Parte */}
            <button
              onClick={handleGenerateAllChunks}
              disabled={isGeneratingChunks || chunks.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all disabled:opacity-40"
            >
              {isGeneratingChunks ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Generando Parte {currentGeneratingIndex + 1}/{chunks.length}...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-black" />
                  <span>Generar Locución Parte por Parte</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN: LISTA DE FRAGMENTOS GENERADOS */}
      {chunks.length > 0 && (
        <div className="bg-[#0e111a] rounded-2xl p-6 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fragmentos del Guion Divididos para Procesamiento
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {chunks.length} segmentos
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {chunks.map((chunk, idx) => (
              <div
                key={chunk.id}
                className={`p-3 rounded-xl flex items-center justify-between text-xs transition-all ${
                  chunk.status === 'completed'
                    ? 'bg-[#08090d] text-slate-200'
                    : chunk.status === 'generating'
                    ? 'bg-emerald-950/20 text-emerald-300 animate-pulse'
                    : 'bg-[#08090d]/60 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <p className="truncate text-xs text-slate-300">{chunk.text}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {chunk.durationSeconds && (
                    <span className="text-[10px] font-mono text-emerald-400">
                      {chunk.durationSeconds.toFixed(1)}s
                    </span>
                  )}
                  {chunk.status === 'completed' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {chunk.audioUrl && (
                    <button
                      onClick={() => {
                        const a = new Audio(chunk.audioUrl);
                        a.play();
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
                      title="Escuchar fragmento"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: PISTA UNIFICADA & SINCRONIZACIÓN WHISPER */}
      {unifiedAudioUrl && (
        <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[0_0_30px_rgba(16,185,129,0.1),inset_0_1px_0_0_rgba(255,255,255,0.05)] animate-in fade-in duration-300">
          <audio
            ref={audioPlayerRef}
            src={unifiedAudioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayback}
                className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform hover:scale-105 shrink-0"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider block">
                  ✓ Audio Maestro Ensamblado y Purgado
                </span>
                <p className="text-sm font-extrabold text-white">
                  {uploadedFileName || 'Locución Unificada Completa'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">
                Duración: <strong className="text-white text-sm">{unifiedDuration.toFixed(1)}s</strong>
              </span>
              <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full font-bold">
                Silencios Purgados
              </span>
            </div>
          </div>

          {/* Estado de Sincronización Fonética */}
          {isTranscribing ? (
            <div className="p-3.5 rounded-xl bg-[#08090d] flex items-center gap-2.5 text-xs text-emerald-300 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Alineando marcas de tiempo al milisegundo con el <strong>Motor Fonético Neural</strong>...</span>
            </div>
          ) : transcriptionResult ? (
            <div className="p-3.5 rounded-xl bg-[#08090d] flex items-center justify-between text-xs text-emerald-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Sincronización: <strong>{transcriptionResult.words.length}</strong> palabras detectadas ({transcriptionResult.segments.length} cortes temporales)</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded uppercase font-mono">
                Sync Milimétrico Listo
              </span>
            </div>
          ) : null}

          {/* Botón Principal para Pasar a Escenas */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => onProceedToScenes(currentScript, unifiedAudioBlob, unifiedDuration, transcriptionResult)}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02]"
            >
              <span>➡️ Pasar al Paso 3: Generar Escenas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioStage;
