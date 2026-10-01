import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Archive, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Maximize2, 
  Download, 
  Trash2, 
  Smartphone, 
  Monitor, 
  Square as SquareRatio,
  Zap,
  Info,
  ChevronDown,
  HelpCircle,
  Copy
} from 'lucide-react';
import { 
  SceneSlot, 
  AspectRatioType, 
  CharacterPersona 
} from '../types';
import { AVAILABLE_IMAGE_MODELS, StylePreset } from '../config/stylePresets';
import { generateNvidiaImage } from '../services/nvidiaImageService';
import { generateImageForScene } from '../services/geminiService';
import { upscaleImage } from '../utils/upscaler';
import { exportSlotsToZip } from '../utils/zipExporter';
import ImageModal from './ImageModal';
import { ErrorDiagnosticsModal } from './ErrorDiagnosticsModal';
import { 
  reportTelemetryError, 
  TelemetryErrorReport, 
  formatErrorForClipboard 
} from '../services/errorTelemetryService';
import { requireSubscription } from '../services/subscriptionService';

interface BulkSceneGeneratorProps {
  slots: SceneSlot[];
  setSlots: React.Dispatch<React.SetStateAction<SceneSlot[]>>;
  aspectRatio: AspectRatioType;
  setAspectRatio: (ratio: AspectRatioType) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  activeCharacter?: CharacterPersona;
  activeStyle?: StylePreset;
  characters?: CharacterPersona[];
  activeCharacterId?: string;
  onSelectCharacter?: (id?: string) => void;
  styles?: StylePreset[];
  activeStyleId?: string;
  onSelectStyle?: (id?: string) => void;
  nvidiaKeys: string[];
  geminiKey: string;
  projectName: string;
  setProjectName: (name: string) => void;
  onNavigateToSettings?: () => void;
}

export const BulkSceneGenerator: React.FC<BulkSceneGeneratorProps> = ({
  slots,
  setSlots,
  aspectRatio,
  setAspectRatio,
  selectedModel,
  setSelectedModel,
  activeCharacter,
  activeStyle,
  characters,
  activeCharacterId,
  onSelectCharacter,
  styles,
  activeStyleId,
  onSelectStyle,
  nvidiaKeys,
  geminiKey,
  projectName,
  setProjectName,
  onNavigateToSettings
}) => {
  const [concurrency, setConcurrency] = useState<number>(2);
  const [delayMs, setDelayMs] = useState<number>(0);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isBulkUpscaling, setIsBulkUpscaling] = useState<boolean>(false);
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<SceneSlot | null>(null);
  const [selectedTelemetryError, setSelectedTelemetryError] = useState<TelemetryErrorReport | null>(null);
  const [copiedErrorToast, setCopiedErrorToast] = useState<boolean>(false);

  // Raw prompts textarea state
  const [rawPromptsInput, setRawPromptsInput] = useState<string>(() => {
    return slots.map((s) => s.rawPrompt).join('\n');
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const isBatchRunningRef = useRef<boolean>(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isBatchRunningRef.current = isBatchRunning;
  }, [isBatchRunning]);

  // Synchronize textarea when slots change externally (e.g. from Director)
  useEffect(() => {
    if (slots.length > 0 && !rawPromptsInput) {
      setRawPromptsInput(slots.map((s) => s.rawPrompt).join('\n'));
    }
  }, [slots]);

  // Helper to compile prompts with character and style
  const compilePromptString = (raw: string, char?: CharacterPersona, sty?: StylePreset): string => {
    let compiled = raw;
    if (char?.anchorDescription) {
      compiled = `${char.anchorDescription}. ${char.clothingAnchor || ''}. ${compiled}`;
    }
    if (sty?.promptModifier) {
      compiled = `${compiled}, ${sty.promptModifier}`;
    }
    return compiled.trim();
  };

  // Parse lines to slots
  const parseLinesToSlots = (text: string, char?: CharacterPersona, sty?: StylePreset): SceneSlot[] => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line, idx) => {
      const seq = idx + 1;
      const padded = String(seq).padStart(3, '0');
      return {
        id: `slot-${padded}-${Date.now() + idx}`,
        sequenceNumber: seq,
        paddedNumber: padded,
        rawPrompt: line,
        compiledPrompt: compilePromptString(line, char || activeCharacter, sty || activeStyle),
        status: 'idle',
        seed: char?.defaultSeed || activeCharacter?.defaultSeed || (100000 + Math.floor(Math.random() * 899999)),
      };
    });
  };

  const handlePromptsChange = (newText: string) => {
    setRawPromptsInput(newText);
    const parsed = parseLinesToSlots(newText);
    setSlots(parsed);
  };

  const handleLoadSamplePrompts = () => {
    const samplePrompts = [
      '01. Primer plano dramático de un rostro con iluminación lateral cinematográfica 35mm',
      '02. Toma cenital de un escritorio antiguo con mapas estelares y un compás de latón brillante',
      '03. Plano medio de un samurái cibernético bajo una lluvia de neón en Neo-Tokio',
      '04. Ángulo contrapicado de un cohete espacial despegando entre columnas de fuego y humo',
      '05. Macro detalle de un ojo humano reflejando una galaxia espiral en tonos violeta y cian',
      '06. Silueta solitaria de un viajero caminando en un desierto dorado al atardecer',
      '07. Vista panorámica hiperrealista de una metrópolis futurista con vehículos voladores',
      '08. Retrato expresivo con iluminación de claroscuro renacentista y sombras suaves',
      '09. Plano detalle de manos creando un holograma tridimensional brillante en un laboratorio oscuro',
      '10. Composición cinematográfica de un bosque místico envuelto en niebla con rayos de luz crepuscular',
    ].join('\n');
    handlePromptsChange(samplePrompts);
  };

  const handleCleanPrefixes = () => {
    if (!rawPromptsInput.trim()) return;
    const cleaned = rawPromptsInput
      .split('\n')
      .map((line) => {
        return line.replace(/^(\d+[\.\-\)]\s*|(escena|scene|plano|prompt)\s*\d+[\:\-\.]?\s*|[\-\*\•]\s*)/i, '').trim();
      })
      .join('\n');
    handlePromptsChange(cleaned);
  };

  const handleClearPrompts = () => {
    if (isBatchRunning) return;
    setRawPromptsInput('');
    setSlots([]);
  };

  const handleCharacterChange = (newCharId?: string) => {
    if (onSelectCharacter) onSelectCharacter(newCharId);
    const targetChar = characters?.find((c) => c.id === newCharId);
    setSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        compiledPrompt: compilePromptString(slot.rawPrompt, targetChar, activeStyle),
        seed: targetChar?.defaultSeed || slot.seed,
      }))
    );
  };

  const handleStyleChange = (newStyleId?: string) => {
    if (onSelectStyle) onSelectStyle(newStyleId);
    const targetStyle = styles?.find((s) => s.id === newStyleId);
    setSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        compiledPrompt: compilePromptString(slot.rawPrompt, activeCharacter, targetStyle),
      }))
    );
  };

  // Metric stats
  const totalSlots = slots.length;
  const completedSlots = slots.filter((s) => s.status === 'completed').length;
  const failedSlots = slots.filter((s) => s.status === 'failed').length;
  const renderingSlots = slots.filter((s) => s.status === 'rendering');
  const progressPercent = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  const currentModelMeta = AVAILABLE_IMAGE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_IMAGE_MODELS[0];

  // Single Slot Generation Worker
  const renderSingleSlot = async (slotId: string, signal?: AbortSignal): Promise<void> => {
    if (!requireSubscription('Generación de Escena Individual', '6. Generador Masivo')) {
      return;
    }
    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot) return;

    // Mark rendering
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, status: 'rendering', errorDetail: undefined } : s))
    );

    const startTime = Date.now();
    try {
      let finalImageUrl = '';

      if (selectedModel === 'google-imagen-3') {
        if (!geminiKey) {
          throw new Error('Clave API de Gemini no configurada.');
        }
        finalImageUrl = await generateImageForScene(
          geminiKey,
          targetSlot.compiledPrompt || targetSlot.rawPrompt,
          aspectRatio,
          signal
        );
      } else {
        // NVIDIA Models (FLUX 1, FLUX 2, Qwen Image, Stable Diffusion 3.5)
        const res = await generateNvidiaImage(
          nvidiaKeys,
          targetSlot.compiledPrompt || targetSlot.rawPrompt,
          selectedModel,
          targetSlot.seed,
          signal
        );
        finalImageUrl = (res as any).imageUrl || res.dataUrl;
      }

      const elapsed = Math.round((Date.now() - startTime) / 100) / 10;

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'completed',
                imageUrl: finalImageUrl,
                elapsedSeconds: elapsed,
                errorDetail: undefined,
              }
            : s
        )
      );
    } catch (err: any) {
      if (signal?.aborted) {
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, status: 'idle' } : s))
        );
        return;
      }

      console.error(`Error renderizando escena ${targetSlot.paddedNumber}:`, err);
      
      // Enviar reporte automático a telemetría
      reportTelemetryError({
        error: err,
        stage: 'Generador Masivo',
        slotNumber: targetSlot.paddedNumber,
        promptSnippet: targetSlot.compiledPrompt || targetSlot.rawPrompt,
        model: selectedModel,
        seed: targetSlot.seed,
      }).catch((e) => console.warn('[TELEMETRY DISPATCH ERROR]:', e));

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'failed',
                errorDetail: err?.message || 'Error en el renderizado con IA',
              }
            : s
        )
      );
    }
  };

  // Abrir modal de diagnóstico para una escena fallida
  const handleOpenDiagnostics = async (slot: SceneSlot) => {
    try {
      const report = await reportTelemetryError({
        error: new Error(slot.errorDetail || 'Error de renderizado'),
        stage: 'Generador Masivo',
        slotNumber: slot.paddedNumber,
        promptSnippet: slot.compiledPrompt || slot.rawPrompt,
        model: selectedModel,
        seed: slot.seed,
      });
      setSelectedTelemetryError(report);
    } catch {
      // Fallback local report
      setSelectedTelemetryError({
        id: `ERR-${slot.paddedNumber}`,
        timestamp: new Date().toISOString(),
        errorCode: 'ERR_NVIDIA_RENDER',
        errorMessage: slot.errorDetail || 'Error desconocido de renderizado',
        possibleCause: 'Fallo de inferencia o límite en la API de NVIDIA.',
        suggestedSolution: 'Verifica tu clave API en Ajustes o prueba un modelo alternativo.',
        stage: 'Generador Masivo',
        contextData: {
          slotNumber: slot.paddedNumber,
          promptSnippet: slot.compiledPrompt || slot.rawPrompt,
          model: selectedModel,
        },
        reportedToCloud: false,
      });
    }
  };

  // Copiar diagnóstico al portapapeles para soporte o chat
  const handleCopyErrorForSupport = async (slot?: SceneSlot) => {
    const target = slot || slots.find((s) => s.status === 'failed');
    if (!target) return;
    try {
      const report = await reportTelemetryError({
        error: new Error(target.errorDetail || 'Error de renderizado'),
        stage: 'Generador Masivo',
        slotNumber: target.paddedNumber,
        promptSnippet: target.compiledPrompt || target.rawPrompt,
        model: selectedModel,
        seed: target.seed,
      });
      const text = formatErrorForClipboard(report);
      navigator.clipboard.writeText(text);
      setCopiedErrorToast(true);
      setTimeout(() => setCopiedErrorToast(false), 3000);
    } catch {
      navigator.clipboard.writeText(`Error en Escena #${target.paddedNumber}: ${target.errorDetail || 'Error'}`);
      setCopiedErrorToast(true);
      setTimeout(() => setCopiedErrorToast(false), 3000);
    }
  };

  // Batch Generation Orchestrator with Concurrency
  const handleStartBatch = async () => {
    if (!requireSubscription('Generación Masiva de Imágenes', '6. Generador Masivo')) {
      return;
    }
    if (isBatchRunning) return;
    setIsBatchRunning(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();

    const pendingSlots = slots.filter((s) => s.status !== 'completed');
    if (pendingSlots.length === 0) {
      setIsBatchRunning(false);
      return;
    }

    // Set queue status
    setSlots((prev) =>
      prev.map((s) => (s.status !== 'completed' ? { ...s, status: 'queued' } : s))
    );

    let activeWorkerCount = 0;
    let slotQueue = [...pendingSlots];

    const runNext = async (): Promise<void> => {
      if (!isBatchRunningRef.current || abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Check pause
      while (isPausedRef.current) {
        if (!isBatchRunningRef.current || abortControllerRef.current?.signal.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (slotQueue.length === 0) return;

      const nextSlot = slotQueue.shift();
      if (!nextSlot) return;

      activeWorkerCount++;
      try {
        await renderSingleSlot(nextSlot.id, abortControllerRef.current?.signal);
      } finally {
        activeWorkerCount--;
      }

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (slotQueue.length > 0 && isBatchRunningRef.current) {
        await runNext();
      }
    };

    const initialWorkers: Promise<void>[] = [];
    const countToSpawn = Math.min(concurrency, slotQueue.length);

    for (let i = 0; i < countToSpawn; i++) {
      initialWorkers.push(runNext());
    }

    try {
      await Promise.all(initialWorkers);
    } finally {
      setIsBatchRunning(false);
      setIsPaused(false);
    }
  };

  const handlePauseBatch = () => {
    setIsPaused(true);
  };

  const handleResumeBatch = () => {
    setIsPaused(false);
  };

  const handleStopBatch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsBatchRunning(false);
    setIsPaused(false);
    setSlots((prev) =>
      prev.map((s) => (s.status === 'queued' || s.status === 'rendering' ? { ...s, status: 'idle' } : s))
    );
  };

  const handleRegenerateFailed = async () => {
    if (!requireSubscription('Regeneración de Escenas Fallidas', '6. Generador Masivo')) {
      return;
    }
    const failedOnes = slots.filter((s) => s.status === 'failed');
    if (failedOnes.length === 0 || isBatchRunning) return;

    setSlots((prev) =>
      prev.map((s) => (s.status === 'failed' ? { ...s, status: 'queued' } : s))
    );

    setIsBatchRunning(true);
    abortControllerRef.current = new AbortController();

    try {
      for (const slot of failedOnes) {
        if (abortControllerRef.current?.signal.aborted) break;
        await renderSingleSlot(slot.id, abortControllerRef.current?.signal);
      }
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Update Upscale callback
  const handleUpdateSlotUpscale = (
    slotId: string,
    upscaledUrl: string,
    factor?: 2 | 4,
    resolution?: string
  ) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              upscaledUrl,
              upscaleFactor: factor || 2,
              resolution: resolution || (factor === 4 ? '2160 × 3840 px' : '1080 × 1920 px'),
            }
          : s
      )
    );

    if (selectedSlotForModal && selectedSlotForModal.id === slotId) {
      setSelectedSlotForModal((curr) =>
        curr
          ? {
              ...curr,
              upscaledUrl,
              upscaleFactor: factor || 2,
              resolution: resolution || (factor === 4 ? '2160 × 3840 px' : '1080 × 1920 px'),
            }
          : null
      );
    }
  };

  // Batch Upscale 2K / 4K
  const handleBatchUpscale = async (factor: 2 | 4) => {
    if (!requireSubscription('Escalado Masivo 4K Ultra-HD', '6. Generador Masivo')) {
      return;
    }
    if (isBulkUpscaling || completedSlots === 0) return;
    try {
      setIsBulkUpscaling(true);
      for (const slot of slots) {
        if (slot.status === 'completed' && slot.imageUrl) {
          try {
            const upscaled = await upscaleImage(slot.imageUrl, factor, aspectRatio);
            handleUpdateSlotUpscale(slot.id, upscaled.dataUrl, upscaled.factor, upscaled.resolution);
          } catch (e) {
            console.error(`Error escalando escena #${slot.paddedNumber}:`, e);
          }
        }
      }
    } finally {
      setIsBulkUpscaling(false);
    }
  };

  // ZIP Exporter
  const handleDownloadZip = async () => {
    if (completedSlots === 0 || isExportingZip) return;
    try {
      setIsExportingZip(true);
      const hasUpscaled = slots.some((s) => Boolean(s.upscaledUrl));
      await exportSlotsToZip(slots, projectName || 'Proyecto_Video', hasUpscaled);
    } catch (err) {
      console.error('Error generando archivo ZIP:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#0e121b] border border-emerald-500/20 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              Paso 4 • Pipeline de Inferencia Masiva
            </span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>GENERADOR MASIVO DE ESCENAS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Convierte guiones y prompts en lotes de imágenes cinematográficas con consistencia total.
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeCharacter && (
            <span className="bg-[#1a0e2a] border border-purple-500/40 text-purple-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Personaje: {activeCharacter.name} (Seed #{activeCharacter.defaultSeed})
            </span>
          )}
          {activeStyle && (
            <span className="bg-[#221808] border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Estilo: {activeStyle.name}
            </span>
          )}
        </div>
      </div>

      {/* 2. Entrada Masiva de Escenas (Textarea Card) */}
      <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Entrada Masiva de Escenas (Hasta 1,000 Prompts)</span>
            </h3>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {totalSlots} Prompts cargados
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleLoadSamplePrompts}
              disabled={isBatchRunning}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cargar Ejemplo (10 Escenas)</span>
            </button>

            <button
              type="button"
              onClick={handleCleanPrefixes}
              disabled={isBatchRunning || !rawPromptsInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 transition-all"
              title="Elimina números, 'Escena 1:', viñetas al inicio de cada línea"
            >
              <span>Limpiar Prefijos</span>
            </button>

            <button
              type="button"
              onClick={handleClearPrompts}
              disabled={isBatchRunning || (!rawPromptsInput.trim() && totalSlots === 0)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-colors"
              title="Borrar todos los prompts"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <textarea
          value={rawPromptsInput}
          onChange={(e) => handlePromptsChange(e.target.value)}
          disabled={isBatchRunning}
          rows={5}
          placeholder={"Pega aquí tus prompts, uno por línea. Ejemplo:\n01. Primer plano de un astronauta caminando en Marte bajo una tormenta de arena roja...\n02. Toma cenital de una metrópolis cyberpunk iluminada por neones violetas bajo la lluvia..."}
          className="w-full bg-[#07090f] border border-white/[0.08] rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono leading-relaxed resize-y scrollbar-thin scrollbar-thumb-white/10"
        />
      </div>

      {/* 3. Parameter Panels (2 Columns: Cyan & Emerald) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PANEL 1 (CYAN): MODELO DE INFERENCIA IA */}
        <div className="bg-[#091118] border border-cyan-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs uppercase font-extrabold text-cyan-300 tracking-wider">
                MODELO DE INFERENCIA IA
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              NVIDIA NIM / FLUX / GEMINI
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isBatchRunning}
              className="w-full bg-[#05090e] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-cyan-100 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none pr-8 cursor-pointer"
            >
              {AVAILABLE_IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0a121c] text-white">
                  {m.name} — {m.badge} ({m.speed})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-cyan-500/10 font-mono">
            <span>Velocidad: ~{currentModelMeta.speed}</span>
            <span className="text-cyan-400/90 truncate max-w-[240px]">{currentModelMeta.badge}</span>
          </div>
        </div>

        {/* PANEL 2 (EMERALD): MODO DE VELOCIDAD & PARALELISMO */}
        <div className="bg-[#091612] border border-emerald-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase font-extrabold text-emerald-300 tracking-wider">
                MODO DE VELOCIDAD & PARALELISMO
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              CONCURRENCIA & DELAY
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-[#050c0a] p-1 rounded-xl border border-emerald-500/20">
            <button
              type="button"
              onClick={() => { setConcurrency(3); setDelayMs(0); }}
              disabled={isBatchRunning}
              className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all ${
                concurrency === 3 && delayMs === 0
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Turbo 3X
            </button>
            <button
              type="button"
              onClick={() => { setConcurrency(2); setDelayMs(0); }}
              disabled={isBatchRunning}
              className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all ${
                concurrency === 2 && delayMs === 0
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Turbo 2X
            </button>
            <button
              type="button"
              onClick={() => { setConcurrency(1); setDelayMs(0); }}
              disabled={isBatchRunning}
              className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all ${
                concurrency === 1 && delayMs === 0
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Directo 0ms
            </button>
            <button
              type="button"
              onClick={() => { setConcurrency(1); setDelayMs(2000); }}
              disabled={isBatchRunning}
              className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all ${
                concurrency === 1 && delayMs === 2000
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Seguro 2.0s
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-emerald-500/10 font-mono">
            <span className="text-emerald-400">⚡ {nvidiaKeys.length} {nvidiaKeys.length === 1 ? 'Clave NVIDIA Activa' : 'Claves en Rotación'}</span>
            <span className="text-slate-500">Round-Robin API Cluster</span>
          </div>
        </div>
      </div>

      {/* 4. Sub-Row: Project + Ratio + Character + Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: Folder / ZIP Name */}
        <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block">
            NOMBRE DE CARPETA / ZIP
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Proyecto_Video"
            disabled={isBatchRunning}
            className="w-full bg-[#07090f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
          <p className="text-[10px] text-slate-500 truncate">Archivos: 001_escena.png...</p>
        </div>

        {/* Column 2: Aspect Ratio */}
        <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block">
            FORMATO DE ENCUADRE
          </label>
          <div className="flex bg-[#07090f] p-1 rounded-xl gap-1 border border-white/10">
            <button
              type="button"
              onClick={() => setAspectRatio('9:16')}
              disabled={isBatchRunning}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                aspectRatio === '9:16'
                  ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('16:9')}
              disabled={isBatchRunning}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                aspectRatio === '16:9'
                  ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>16:9</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('1:1')}
              disabled={isBatchRunning}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                aspectRatio === '1:1'
                  ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SquareRatio className="w-3.5 h-3.5" />
              <span>1:1</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            {aspectRatio === '9:16' ? 'TikTok / Shorts / Reels' : aspectRatio === '16:9' ? 'YouTube Horizontal' : 'Cuadrado 1:1'}
          </p>
        </div>

        {/* Column 3: PERSONAJE INVARIABLE (PURPLE) */}
        <div className="bg-[#120a1c] border border-purple-500/30 rounded-2xl p-4 space-y-1.5">
          <label className="text-[10px] uppercase font-extrabold text-purple-400 tracking-wider flex items-center justify-between">
            <span>PERSONAJE INVARIABLE</span>
            <span className="w-2 h-2 rounded-full bg-purple-400" />
          </label>
          <div className="relative">
            <select
              value={activeCharacter?.id || ''}
              onChange={(e) => handleCharacterChange(e.target.value || undefined)}
              disabled={isBatchRunning}
              className="w-full bg-[#0a0610] border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-200 font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none pr-7 cursor-pointer"
            >
              <option value="" className="bg-[#100b1a] text-slate-300">🟣 Ninguno (Modo Libre)</option>
              {characters?.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#100b1a] text-purple-200">
                  🟣 {c.name} (Seed #{c.defaultSeed})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-purple-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <p className="text-[10px] text-purple-300/70 truncate">Ancla rostro y ropa en cada plano</p>
        </div>

        {/* Column 4: ESTILO VISUAL ACTIVO (AMBER) */}
        <div className="bg-[#181208] border border-amber-500/30 rounded-2xl p-4 space-y-1.5">
          <label className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider flex items-center justify-between">
            <span>ESTILO VISUAL ACTIVO</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </label>
          <div className="relative">
            <select
              value={activeStyle?.id || ''}
              onChange={(e) => handleStyleChange(e.target.value || undefined)}
              disabled={isBatchRunning}
              className="w-full bg-[#0d0a04] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-200 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none pr-7 cursor-pointer"
            >
              {styles?.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#161106] text-amber-200">
                  🟡 {s.name} ({s.category})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-amber-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <p className="text-[10px] text-amber-300/70 truncate">Modificador cromático unificado</p>
        </div>
      </div>

      {/* 5. Main Action Buttons */}
      <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Generation Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!isBatchRunning ? (
            <button
              onClick={handleStartBatch}
              disabled={totalSlots === 0}
              className="flex-1 sm:flex-none px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>▶ INICIAR RENDER TURBO ({totalSlots} ESCENAS)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isPaused ? (
                <button
                  onClick={handlePauseBatch}
                  className="px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pausar</span>
                </button>
              ) : (
                <button
                  onClick={handleResumeBatch}
                  className="px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Play className="w-4 h-4 fill-emerald-300" />
                  <span>Reanudar</span>
                </button>
              )}

              <button
                onClick={handleStopBatch}
                className="px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-xs flex items-center gap-2 transition-all"
              >
                <Square className="w-4 h-4 fill-red-300" />
                <span>Detener</span>
              </button>
            </div>
          )}

          {failedSlots > 0 && !isBatchRunning && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleRegenerateFailed}
                className="px-3.5 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-red-400" />
                <span>Reintentar Fallidas ({failedSlots})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstFailed = slots.find((s) => s.status === 'failed');
                  if (firstFailed) handleOpenDiagnostics(firstFailed);
                }}
                className="px-3.5 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                title="Ver por qué falló la generación y cómo solucionarlo"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Diagnóstico</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyErrorForSupport()}
                className="px-3.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all hover:text-emerald-300"
                title="Copiar diagnóstico para pegar en el chat o soporte"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>{copiedErrorToast ? '¡Diagnóstico Copiado!' : 'Copiar para Soporte'}</span>
              </button>
            </div>
          )}

          {/* Upscale Buttons */}
          {completedSlots > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleBatchUpscale(2)}
                disabled={isBulkUpscaling || isBatchRunning}
                className="px-3.5 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Super-resolución a 1080x1920 / 2048x2048 px"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isBulkUpscaling ? 'Escalando...' : 'Lote a 2K'}</span>
              </button>
              <button
                onClick={() => handleBatchUpscale(4)}
                disabled={isBulkUpscaling || isBatchRunning}
                className="px-3.5 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Super-resolución a 2160x3840 UHD (4K Ultra HD)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isBulkUpscaling ? 'Escalando...' : 'Lote a 4K UHD'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: ZIP Download Button (Amber) */}
        <div className="w-full md:w-auto">
          <button
            onClick={handleDownloadZip}
            disabled={completedSlots === 0 || isExportingZip}
            className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            <Archive className="w-4 h-4" />
            <span>
              {isExportingZip ? 'EMPAQUETANDO ZIP...' : `DESCARGAR ZIP ORDENADO (${completedSlots}/${totalSlots})`}
            </span>
          </button>
        </div>
      </div>

      {/* Progress & Live Metrics Bar */}
      {totalSlots > 0 && (
        <div className="bg-[#0e111a] rounded-2xl p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Progreso: <strong className="font-mono text-white">{completedSlots}/{totalSlots}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Listas: <strong className="font-mono">{completedSlots}</strong>
              </span>
              {failedSlots > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center gap-1.5 text-red-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Fallidas: <strong className="font-mono">{failedSlots}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="text-slate-400 font-mono text-[11px] flex items-center gap-2">
              {renderingSlots.length > 0 ? (
                <span className="text-emerald-400 animate-pulse font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Renderizando {renderingSlots.length} en paralelo: #{renderingSlots.map((s) => s.paddedNumber).join(', #')}
                </span>
              ) : (
                <span>{progressPercent}% Completado</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 shadow-sm shadow-emerald-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* DENSE GRID OF SCENE SLOTS (Multiple Rows & Columns) */}
      {slots.length === 0 ? (
        <div className="bg-[#0e111a] rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <Layers className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-black text-base text-white mb-1">Aún no hay escenas preparadas en la matriz</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Puedes redactar tu guion en el <strong>Paso 1</strong>, transcribirlo en el <strong>Paso 2</strong>, dirigirlo en el <strong>Paso 3</strong>, o cargar 5 escenas de demostración ahora mismo para probar los motores NVIDIA.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const sampleLines = [
                'Plano medio de un programador exhausto frente a monitores en habitación oscura con iluminación verde neón volumétrica.',
                'Primer plano extremo de sus ojos reflejando cascadas de código hexadecimal auto-generado.',
                'Toma aérea de la metrópolis perdiendo las luces cuadra por cuadra en un apagón masivo.',
                'Plano holandés del supercomputador emitiendo pulsos electromagnéticos de color cian brillante.',
                'Silueta del protagonista caminando por el pasillo de servidores con humo frío y chispas eléctricas.'
              ];
              const demoSlots: SceneSlot[] = sampleLines.map((line, idx) => {
                const seq = idx + 1;
                const padded = String(seq).padStart(3, '0');
                let compiled = line;
                if (activeCharacter?.anchorDescription) {
                  compiled = `${activeCharacter.anchorDescription}. ${compiled}`;
                }
                if (activeStyle?.promptModifier) {
                  compiled = `${compiled}, ${activeStyle.promptModifier}`;
                }
                return {
                  id: `slot-${padded}`,
                  sequenceNumber: seq,
                  paddedNumber: padded,
                  rawPrompt: line,
                  compiledPrompt: compiled.trim(),
                  status: 'idle',
                  seed: activeCharacter?.defaultSeed || (100000 + idx * 777)
                };
              });
              setSlots(demoSlots);
            }}
            className="px-6 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Cargar 5 Escenas Demo para Pruebas Inmediatas</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {slots.map((slot) => {
            const isRendering = slot.status === 'rendering';
            const isCompleted = slot.status === 'completed';
            const isFailed = slot.status === 'failed';
            const isQueued = slot.status === 'queued';

            return (
              <div
                key={slot.id}
                className={`relative rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 group ${
                  isRendering
                    ? 'bg-[#0e1814] ring-2 ring-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                    : isCompleted
                    ? 'bg-[#08090d] hover:ring-1 hover:ring-emerald-500/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.15)]'
                    : isFailed
                    ? 'bg-[#180a0a] ring-1 ring-red-500/50 shadow-lg'
                    : 'bg-[#08090d]/60 text-slate-500 hover:ring-1 hover:ring-white/10'
                }`}
              >
                {/* Slot Sequence Header */}
                <div className="p-2.5 flex items-center justify-between text-[11px] bg-[#0b0d14]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-emerald-400 text-xs">
                      #{slot.paddedNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {slot.paddedNumber}_escena.png
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {isRendering && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>{slot.elapsedSeconds ? `${slot.elapsedSeconds}s` : 'Render'}</span>
                    </span>
                  )}
                  {isCompleted && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <span>{slot.elapsedSeconds || 2.1}s</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  )}
                  {isFailed && (
                    <span title={slot.errorDetail || 'Error'}>
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    </span>
                  )}
                  {isQueued && (
                    <span className="text-[10px] text-slate-500">En cola</span>
                  )}
                </div>

                {/* Aspect Ratio Box / Image Container */}
                <div 
                  onClick={() => isCompleted && setSelectedSlotForModal(slot)}
                  className={`w-full relative flex items-center justify-center bg-black/40 overflow-hidden cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'aspect-[9/16]'
                      : aspectRatio === '16:9'
                      ? 'aspect-[16/9]'
                      : 'aspect-square'
                  }`}
                >
                  {isCompleted && (slot.upscaledUrl || slot.imageUrl) ? (
                    <>
                      <img
                        src={slot.upscaledUrl || slot.imageUrl}
                        alt={`Escena ${slot.paddedNumber}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {slot.upscaledUrl && (
                        <div 
                          className={`absolute top-1.5 left-1.5 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow ${
                            slot.upscaleFactor === 4 ? 'bg-amber-400 font-extrabold' : 'bg-emerald-400'
                          }`}
                          title={slot.resolution || (slot.upscaleFactor === 4 ? '2160 × 3840 px' : '1080 × 1920 px')}
                        >
                          {slot.upscaleFactor === 4 ? '💎 4K UHD' : '⚡ 2K'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="p-1.5 rounded-lg bg-black/70 text-white hover:text-emerald-400">
                          <Maximize2 className="w-4 h-4" />
                        </span>
                      </div>
                    </>
                  ) : isRendering ? (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        Renderizando...
                      </span>
                    </div>
                  ) : isFailed ? (
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleOpenDiagnostics(slot); }}
                      className="flex flex-col items-center justify-center p-3 text-center text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                      title="Haz clic para ver diagnóstico de error y solución"
                    >
                      <AlertCircle className="w-6 h-6 mb-1 text-red-400" />
                      <span className="text-[10px] font-mono leading-tight font-bold">Error de render</span>
                      <span className="text-[9px] text-amber-300 underline mt-1">Ver diagnóstico</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center text-slate-600">
                      <Layers className="w-6 h-6 mb-1 text-slate-700" />
                      <span className="text-[10px] font-mono">Pendiente</span>
                    </div>
                  )}
                </div>

                {/* Prompt Excerpt & Card Footer */}
                <div className="p-2.5 bg-[#0b0d14] space-y-1.5">
                  <p 
                    className="text-[10px] text-slate-300 line-clamp-2 leading-tight font-mono hover:text-white transition-colors cursor-pointer"
                    title={slot.compiledPrompt || slot.rawPrompt}
                  >
                    {slot.rawPrompt}
                  </p>

                  {/* Card Action Mini-Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <span className="text-[9px] font-mono text-slate-500">
                      Seed: {slot.seed}
                    </span>
                    <div className="flex items-center gap-1">
                      {isCompleted && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateSlotUpscale(slot.id, slot.imageUrl!, 4, '2160 × 3840 px');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
                            title="Escalar a 4K UHD"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                          <a
                            href={slot.upscaledUrl || slot.imageUrl}
                            download={`${slot.paddedNumber}_escena.png`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                            title="Descargar imagen"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        </>
                      )}
                      {isFailed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDiagnostics(slot);
                          }}
                          className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                          title="Ver Diagnóstico Técnico y Solución"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          renderSingleSlot(slot.id);
                        }}
                        disabled={isRendering || isBatchRunning}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                        title="Re-renderizar escena individual"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRendering ? 'animate-spin text-emerald-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* High-Resolution Modal */}
      {selectedSlotForModal && (
        <ImageModal
          slot={selectedSlotForModal}
          aspectRatio={aspectRatio}
          onClose={() => setSelectedSlotForModal(null)}
          onRegenerateSlot={async (slotId) => {
            await renderSingleSlot(slotId);
            const updated = slots.find((s) => s.id === slotId);
            if (updated) setSelectedSlotForModal(updated);
          }}
          onUpdateSlotUpscale={handleUpdateSlotUpscale}
        />
      )}

      {/* Error Diagnostics Modal */}
      {selectedTelemetryError && (
        <ErrorDiagnosticsModal
          report={selectedTelemetryError}
          onClose={() => setSelectedTelemetryError(null)}
        />
      )}
    </div>
  );
};

export default BulkSceneGenerator;
