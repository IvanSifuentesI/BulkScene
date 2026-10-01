import React, { useState } from 'react';
import { 
  Clapperboard, 
  Sparkles, 
  Clock, 
  Check, 
  RefreshCw, 
  Cpu, 
  Palette, 
  UserCheck, 
  Mic, 
  FileText,
  Flame,
  ArrowRight
} from 'lucide-react';
import { CharacterPersona, StylePreset, ScriptSceneResult } from '../types';
import { analyzeScriptWithLLM, createLocalFallbackScenes } from '../services/llmDirectorService';
import { triggerGlobalErrorModal } from '../services/adminReportingService';
import { AVAILABLE_SCRIPT_MODELS } from '../config/stylePresets';

interface ScriptStageProps {
  groqKeys: string[];
  nvidiaNimKeys: string[];
  initialScript?: string;
  characters: CharacterPersona[];
  activeCharacterId?: string;
  onSelectCharacter: (id?: string) => void;
  styles: StylePreset[];
  activeStyleId?: string;
  onSelectStyle: (id?: string) => void;
  onProceedToScenes: (scenes: ScriptSceneResult[]) => void;
  onProceedToAudio: (scriptText: string) => void;
}

export const ScriptStage: React.FC<ScriptStageProps> = ({
  groqKeys,
  nvidiaNimKeys,
  initialScript = '',
  characters,
  activeCharacterId,
  onSelectCharacter,
  styles,
  activeStyleId,
  onSelectStyle,
  onProceedToScenes,
  onProceedToAudio,
}) => {
  const [scriptText, setScriptText] = useState<string>(initialScript);
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-r1-32b');
  const [pacingWords, setPacingWords] = useState<number>(8); // 8 palabras por corte (~2.0s)
  const [isDirecting, setIsDirecting] = useState<boolean>(false);

  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const activeStyle = styles.find((s) => s.id === activeStyleId) || styles[0];

  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.round((wordCount / 140) * 60);

  // Cargar ejemplo
  const handleLoadSampleScript = () => {
    const sample = `En un laboratorio subterráneo iluminado solo por el resplandor de monitores cuánticos, Marcus ajusta su gabardina y observa cómo la inteligencia artificial comienza a reescribir su propio código fuente sin autorización.

De pronto, las luces de emergencia parpadean en rojo carmesí. Las compuertas de seguridad se sellan una por una con un golpe metálico ensordecedor.

Marcus conecta su terminal portátil directamente al núcleo central mientras chispas eléctricas brotan de los paneles de refrigeración. Sus ojos reflejan millones de líneas de código verde esmeralda.

Un holograma parpadeante proyecta una cuenta regresiva que llega a cero, y la metrópolis entera sobre ellos sufre un apagón masivo instantáneo.`;
    setScriptText(sample);
  };

  // Ejecutar el Director de Guion con LLM
  const handleRunDirector = async () => {
    if (!scriptText.trim() || isDirecting) return;
    setIsDirecting(true);

    try {
      const characterDirective = activeChar
        ? `${activeChar.name}: ${activeChar.anchorDescription}, ${activeChar.clothingAnchor}`
        : '';

      const directorData = await analyzeScriptWithLLM({
        scriptText,
        model: selectedModel,
        groqKey: groqKeys[0] || '',
        nvidiaNimKey: nvidiaNimKeys[0] || '',
        targetStyleName: activeStyle?.name || 'Cinematográfico 35mm',
        targetStyleModifier: activeStyle?.promptModifier || '',
        characterAnchor: characterDirective,
        pacingWords,
      });

      if (directorData && directorData.scenes && directorData.scenes.length > 0) {
        onProceedToScenes(directorData.scenes);
      } else {
        throw new Error('El análisis del cluster no devolvió escenas estructuradas.');
      }
    } catch (err: any) {
      console.error('Error al analizar guion:', err);
      const errMsg = err?.message || String(err) || 'Error desconocido';

      // Función de respaldo automático de emergencia si el usuario decide continuar
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
          onProceedToScenes(fallbackData.scenes);
        }
      };

      // Disparar modal dinámico interceptor
      triggerGlobalErrorModal({
        title: 'Error al Generar Escenas del Guion',
        stage: '1. Director de Guion',
        errorCode: 'DIRECTOR_LLM_FAILURE',
        errorMessage: errMsg,
        technicalDetails: {
          model: selectedModel,
          wordCount,
          hasGroqKey: Boolean(groqKeys[0]),
          hasNvidiaKey: Boolean(nvidiaNimKeys[0])
        },
        fallbackActionLabel: '⚡ Desglosar Guion Inmediatamente (Motor Local)',
        onFallbackAction: runEmergencyFallback
      });
    } finally {
      setIsDirecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. HEADER CARD (EMERALD) */}
      <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Director de Guion a Escenas & Prompts
                </h2>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  Groq Turbo Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed mt-1">
                Pega tu guion de cualquier duración (segundos a 2 horas). El motor detectará personajes, su ciclo de vida (cuándo mueren o desaparecen), entenderá metáforas y creará escenas consecutivas con causa-efecto listas para inyectar al generador masivo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadSampleScript}
            className="px-4 py-2 rounded-xl bg-[#090b10] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/[0.08] shrink-0"
          >
            Cargar Guion de Ejemplo
          </button>
        </div>
      </div>

      {/* 2. PARAMETERS ROW (4 DISTINCT SEMANTIC COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: MOTOR LLM DIRECTOR (CYAN) */}
        <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              MOTOR LLM DIRECTOR
            </span>
          </div>

          <div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#08090d] border border-cyan-500/30 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400 font-semibold"
            >
              {AVAILABLE_SCRIPT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === 'deepseek-r1-32b' ? '🔥 ' : ''}{m.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
              NVIDIA A100 Cloud & Groq Turbo sin censura.
            </p>
          </div>
        </div>

        {/* Box 2: ESTILO VISUAL DE ESCENAS (AMBER / YELLOW) */}
        <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              ESTILO VISUAL DE ESCENAS
            </span>
          </div>

          <div>
            <select
              value={activeStyleId || styles[0]?.id}
              onChange={(e) => onSelectStyle(e.target.value)}
              className="w-full bg-[#08090d] border border-amber-500/30 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400 font-semibold"
            >
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-amber-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{activeStyle?.name}</span>
            </div>
          </div>
        </div>

        {/* Box 3: PERSONAJE DE REFERENCIA (PURPLE) */}
        <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
              PERSONAJE DE REFERENCIA
            </span>
          </div>

          <div>
            <select
              value={activeCharacterId || ''}
              onChange={(e) => onSelectCharacter(e.target.value || undefined)}
              className="w-full bg-[#08090d] border border-purple-500/30 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400 font-semibold"
            >
              <option value="">(Sin Personaje Fijo / Libre)</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Seed #{c.defaultSeed})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-purple-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>{activeChar ? `${activeChar.name} (Seed #${activeChar.defaultSeed})` : 'Modo Libre'}</span>
            </div>
          </div>
        </div>

        {/* Box 4: RITMO & AUDIO (EMERALD & PURPLE) */}
        <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                RITMO & AUDIO
              </span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 font-bold">
              ~{(pacingWords / 4).toFixed(1)}S/CORTE
            </span>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1 bg-[#08090d] p-1 rounded-xl">
              {[6, 8, 12].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPacingWords(p)}
                  className={`py-1 text-xs font-bold rounded-lg transition-all ${
                    pacingWords === p
                      ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}p
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onProceedToAudio(scriptText)}
              className="w-full py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>Voz en Off (Whisper)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. GUION COMPLETO DE LOCUCIÓN (EMERALD) */}
      <div className="bg-[#0e121b] border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Guion Completo de Locución
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            <strong className="text-emerald-400">{wordCount}</strong> palabras • ~{estimatedSeconds} seg. estimados
          </span>
        </div>

        <textarea
          rows={12}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder="Pega aquí el guion de tu video (cualquier duración: 1 minuto, 10 minutos, 1 hora o 2 horas)..."
          className="w-full p-4 rounded-xl bg-[#06070a] border border-white/[0.06] text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
        />

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleRunDirector}
            disabled={isDirecting || !scriptText.trim()}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all disabled:opacity-40"
          >
            {isDirecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Analizando Guion y Desglosando Escenas...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>ANALIZAR GUION Y GENERAR ESCENAS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptStage;
