import React, { useState } from 'react';
import { 
  Clapperboard, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  Layers, 
  RefreshCw,
  ShieldCheck,
  Film
} from 'lucide-react';
import { 
  CharacterPersona, 
  StylePreset, 
  ScriptSceneResult,
} from '../types';
import { 
  analyzeScriptWithLLM, 
  createLocalFallbackScenes,
  DirectorAnalysisResponse 
} from '../services/llmDirectorService';
import { triggerGlobalErrorModal } from '../services/adminReportingService';
import { TranscriptionResult } from '../services/audioTranscriptionService';
import { AVAILABLE_SCRIPT_MODELS } from '../config/stylePresets';
import { requireSubscription } from '../services/subscriptionService';

interface ScenesStageProps {
  scriptText: string;
  audioDuration: number;
  transcriptionResult: TranscriptionResult | null;
  characters: CharacterPersona[];
  styles: StylePreset[];
  activeCharacterId?: string;
  activeStyleId?: string;
  onSelectCharacter: (id?: string) => void;
  onSelectStyle: (id?: string) => void;
  groqKeys: string[];
  nvidiaNimKeys: string[];
  onProceedToImages: (scenes: ScriptSceneResult[]) => void;
}

export const ScenesStage: React.FC<ScenesStageProps> = ({
  scriptText,
  audioDuration,
  transcriptionResult,
  characters,
  styles,
  activeCharacterId,
  activeStyleId,
  onSelectCharacter,
  onSelectStyle,
  groqKeys,
  nvidiaNimKeys,
  onProceedToImages,
}) => {
  const [selectedLlm, setSelectedLlm] = useState<string>('groq-llama-70b');
  const [pacingWords, setPacingWords] = useState<number>(8); // ~2.5s por escena
  const [isDirecting, setIsDirecting] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DirectorAnalysisResponse | null>(null);
  const [scenes, setScenes] = useState<ScriptSceneResult[]>([]);

  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const activeStyle = styles.find((s) => s.id === activeStyleId) || styles[0];

  // Ejecutar el Director de Cine IA
  const handleRunDirector = async () => {
    if (!requireSubscription('Desglose y Dirección de Escenas con IA', '5. Desglose de Escenas')) {
      return;
    }
    if (!scriptText.trim() || isDirecting) return;
    setIsDirecting(true);

    try {
      const characterDirective = activeChar
        ? `${activeChar.name}: ${activeChar.anchorDescription}, ${activeChar.clothingAnchor}`
        : '';

      const directorData = await analyzeScriptWithLLM({
        scriptText,
        model: selectedLlm,
        groqKey: groqKeys[0],
        nvidiaNimKey: nvidiaNimKeys[0],
        targetStyleName: activeStyle?.name || 'Cinematográfico 35mm',
        targetStyleModifier: activeStyle?.promptModifier || '',
        characterAnchor: characterDirective,
        pacingWords,
      });

      setAnalysisResult(directorData);

      // Si tenemos datos de Whisper, alineamos duraciones exactas
      let calculatedScenes = directorData.scenes;
      if (transcriptionResult && transcriptionResult.segments.length > 0) {
        const totalDuration = transcriptionResult.duration || audioDuration || 30;
        const segmentCount = transcriptionResult.segments.length;

        calculatedScenes = calculatedScenes.map((sc, i) => {
          const segIdx = Math.min(i, segmentCount - 1);
          const seg = transcriptionResult.segments[segIdx];
          const nextSeg = transcriptionResult.segments[segIdx + 1];
          const start = seg.start;
          const end = nextSeg ? nextSeg.start : (seg.end || totalDuration);
          const dur = Math.max(1.0, end - start);

          return {
            ...sc,
            durationSeconds: Number(dur.toFixed(1)),
          };
        });
      } else if (audioDuration > 0 && calculatedScenes.length > 0) {
        const avg = Number((audioDuration / calculatedScenes.length).toFixed(1));
        calculatedScenes = calculatedScenes.map((sc) => ({
          ...sc,
          durationSeconds: avg,
        }));
      }

      setScenes(calculatedScenes);
    } catch (err: any) {
      console.error('Error dirigiendo escenas:', err);
      const errMsg = err?.message || String(err) || 'Error desconocido';

      const characterDirective = activeChar
        ? `${activeChar.name}: ${activeChar.anchorDescription}, ${activeChar.clothingAnchor}`
        : '';

      const runEmergencyFallback = () => {
        const fallbackData = createLocalFallbackScenes({
          scriptText,
          targetStyleName: activeStyle?.name || 'Cinematográfico 35mm Hiperrealista',
          targetStyleModifier: activeStyle?.promptModifier || '',
          characterAnchor: characterDirective,
          pacingWords
        });
        if (fallbackData && fallbackData.scenes.length > 0) {
          setScenes(fallbackData.scenes);
        }
      };

      triggerGlobalErrorModal({
        title: 'Error al Segmentar Escenas',
        stage: '5. Desglose de Escenas',
        errorCode: 'SCENES_LLM_FAILURE',
        errorMessage: errMsg,
        technicalDetails: {
          model: selectedLlm,
          audioDuration,
          hasGroqKey: Boolean(groqKeys[0]),
          hasNvidiaKey: Boolean(nvidiaNimKeys[0])
        },
        fallbackActionLabel: '⚡ Aplicar Desglose Inmediato (Motor Local)',
        onFallbackAction: runEmergencyFallback
      });
    } finally {
      setIsDirecting(false);
    }
  };

  const handleUpdatePrompt = (index: number, newPrompt: string) => {
    setScenes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], visualPrompt: newPrompt };
      return copy;
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#0e111a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Paso 3: Dirección de Escenas y Consistencia Narrativa
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-0.5">
                Desglose inteligente de planos con consistencia de personajes, iluminación uniforme y generación de prompts visuales cinematográficos de alta fidelidad.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunDirector}
          disabled={isDirecting || !scriptText.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all disabled:opacity-40 shrink-0"
        >
          {isDirecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>Analizando Continuidad...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black" />
              <span>Generar Desglose de Escenas</span>
            </>
          )}
        </button>
      </div>

      {/* 1. SECCIÓN: PARÁMETROS DEL DIRECTOR */}
      <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Personaje Activo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Personaje Protagonista Fijo:</span>
            </label>
            <select
              value={activeCharacterId || ''}
              onChange={(e) => onSelectCharacter(e.target.value || undefined)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#08090d] text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">(Sin Personaje Fijo / Libre)</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Seed: #{c.defaultSeed})
                </option>
              ))}
            </select>
          </div>

          {/* Estilo Visual */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Estilo Visual Obligatorio:</span>
            </label>
            <select
              value={activeStyleId || styles[0]?.id}
              onChange={(e) => onSelectStyle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#08090d] text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Motor de Dirección LLM */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Film className="w-4 h-4 text-emerald-400" />
              <span>Motor de Dirección:</span>
            </label>
            <select
              value={selectedLlm}
              onChange={(e) => setSelectedLlm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#08090d] text-emerald-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              {AVAILABLE_SCRIPT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN: BIBLIA DE LA HISTORIA Y PERSONAJES DETECTADOS */}
      {analysisResult?.storyBible && (
        <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] animate-in fade-in duration-300">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Biblia de Continuidad & Rastreo de Personajes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#08090d] p-4 rounded-xl space-y-1.5">
              <span className="text-slate-500 font-mono text-[10px] uppercase block">
                Arco Dramático Principal:
              </span>
              <p className="text-slate-300 leading-relaxed">
                {analysisResult.storyBible.summary}
              </p>
            </div>

            <div className="bg-[#08090d] p-4 rounded-xl space-y-1.5">
              <span className="text-slate-500 font-mono text-[10px] uppercase block">
                Tono, Luz y Entorno Consistente:
              </span>
              <p className="text-slate-300 leading-relaxed">
                {analysisResult.storyBible.genreAndTone} — {analysisResult.storyBible.culturalContext}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: ESCENAS GENERADAS CON SUS PROMPTS */}
      {scenes.length > 0 && (
        <div className="bg-[#0e111a] rounded-2xl p-6 space-y-5 shadow-[0_0_30px_rgba(16,185,129,0.08),inset_0_1px_0_0_rgba(255,255,255,0.04)] animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
            <div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider block">
                ✓ {scenes.length} Escenas Desglosadas con Continuidad
              </span>
              <h3 className="text-base font-extrabold text-white">
                Plano por Plano Listo para Renderizado
              </h3>
            </div>

            {/* Botón para Inyectar al Paso 4 */}
            <button
              onClick={() => onProceedToImages(scenes)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all hover:scale-105 shrink-0"
            >
              <span>➡️ Pasar al Paso 4: Generar Imágenes ({scenes.length} Cuadros)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {scenes.map((scene, idx) => (
              <div
                key={scene.sceneNumber || idx}
                className="bg-[#08090d] rounded-xl p-4 space-y-3 hover:ring-1 hover:ring-emerald-500/30 transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-black text-emerald-400">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    {scene.durationSeconds && (
                      <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                        {scene.durationSeconds}s
                      </span>
                    )}
                  </div>

                  {scene.cameraAngle && (
                    <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                      {scene.cameraAngle}
                    </span>
                  )}
                </div>

                {/* Narración / Voz en off */}
                <div className="text-xs text-slate-300 bg-black/40 p-3 rounded-lg italic border-l-2 border-emerald-500/60">
                  "{scene.scriptSegment}"
                </div>

                {/* Prompt visual editable */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1.5 uppercase">
                    Prompt Visual en Inglés (FLUX / SD / Qwen):
                  </label>
                  <textarea
                    rows={2}
                    value={scene.visualPrompt}
                    onChange={(e) => handleUpdatePrompt(idx, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#050608] text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y border-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Botón Inferior para Avanzar */}
          <div className="flex justify-end pt-3 border-t border-white/[0.04]">
            <button
              onClick={() => onProceedToImages(scenes)}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02]"
            >
              <span>➡️ Pasar al Paso 4: Generar Imágenes ({scenes.length} Cuadros)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenesStage;
