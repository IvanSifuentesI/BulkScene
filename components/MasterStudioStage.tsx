import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ArrowRight,
  Folder,
  FolderOpen,
  Play,
  Pause,
  Upload,
  Sliders,
  SlidersHorizontal,
  Wand2,
  Eye,
  Skull,
  ShieldCheck,
  Layers,
  Film,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
  Scissors,
  X,
  CheckCheck
} from 'lucide-react';
import { 
  CharacterPersona, 
  StylePreset, 
  ScriptSceneResult,
  DirectionNarrativeMode,
  CulturalTemporalContext,
  CharacterConsistencyMode
} from '../types';
import { 
  analyzeScriptWithLLM, 
  createLocalFallbackScenes,
  detectStyleWithAI,
  extractCulturalContextWithAI,
  detectCharactersWithAI,
  ScriptDirectorCharacter
} from '../services/llmDirectorService';
import { 
  transcribeAudioWithGroq, 
  transcribeAudioUniversal,
  AVAILABLE_STT_MODELS,
  TranscriptionResult,
  calculateSmartBeatsSegmentation,
  SmartBeatScene,
  SmartBeatsConfig
} from '../services/audioTranscriptionService';
import { triggerGlobalErrorModal } from '../services/adminReportingService';
import { AVAILABLE_SCRIPT_MODELS } from '../config/stylePresets';

interface MasterStudioStageProps {
  // APIs
  groqKeys: string[];
  nvidiaNimKeys: string[];
  geminiKey?: string;

  // Script & Audio State
  initialScript?: string;
  initialAudioBlob?: Blob | null;
  initialAudioDuration?: number;
  initialTranscription?: TranscriptionResult | null;

  // Characters & Styles
  characters: CharacterPersona[];
  activeCharacterId?: string;
  onSelectCharacter: (id?: string) => void;
  onAddCharacter?: (char: CharacterPersona) => void;
  styles: StylePreset[];
  activeStyleId?: string;
  onSelectStyle: (id?: string) => void;

  // Project configuration
  projectName?: string;
  setProjectName?: (name: string) => void;

  // Navigation callbacks
  onProceedToScenes: (scenes: ScriptSceneResult[]) => void;
  onProceedToAudio?: (scriptText: string) => void;
  onProceedToImages?: (scenes: ScriptSceneResult[]) => void;
  onNavigateToSettings?: () => void;
}

export const MasterStudioStage: React.FC<MasterStudioStageProps> = ({
  groqKeys,
  nvidiaNimKeys,
  geminiKey = '',
  initialScript = '',
  initialAudioBlob = null,
  initialAudioDuration = 0,
  initialTranscription = null,
  characters,
  activeCharacterId,
  onSelectCharacter,
  onAddCharacter,
  styles,
  activeStyleId,
  onSelectStyle,
  projectName = 'BulkScene_Proyecto_01',
  setProjectName,
  onProceedToScenes,
  onProceedToAudio,
  onProceedToImages,
  onNavigateToSettings
}) => {
  // 1. Script State
  const [scriptText, setScriptText] = useState<string>(initialScript);
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.round((wordCount / 140) * 60);

  // 2. LLM Director Engine Selection
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_director_model') || 'nvidia-llama-70b';
  });

  // 3. Audio & Whisper State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(initialAudioBlob);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(initialAudioDuration);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [playingBeatIndex, setPlayingBeatIndex] = useState<number | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(initialTranscription);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [selectedSTTModel, setSelectedSTTModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_stt_model') || 'groq-whisper-turbo';
  });
  const [transcriptionProgressText, setTranscriptionProgressText] = useState<string>('');
  const [whisperModel, setWhisperModel] = useState<'whisper-large-v3-turbo' | 'whisper-large-v3'>('whisper-large-v3-turbo');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // 4. Project Folder Destination
  const [folderName, setFolderName] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_folder_name') || 'Descargas / Proyecto ZIP';
  });
  const [currentProjectName, setCurrentProjectName] = useState<string>(projectName);

  // 5. Pacing & Smart Beats Construction (Multi-Rango Inteligente)
  const [isBeatsInspectorOpen, setIsBeatsInspectorOpen] = useState<boolean>(false);
  const [hookScenesCount, setHookScenesCount] = useState<number>(4);
  const [hookDurationSec, setHookDurationSec] = useState<number>(1.8);
  const [restDurationSec, setRestDurationSec] = useState<number>(3.2);
  const [snapToPunctuation, setSnapToPunctuation] = useState<boolean>(true);
  const [snapToSilences, setSnapToSilences] = useState<boolean>(true);
  const [showWordsCloud, setShowWordsCloud] = useState<boolean>(false);
  const [sceneDurationRange, setSceneDurationRange] = useState<number>(2.5); // Fallback compatible
  const [pacingWords, setPacingWords] = useState<number>(8);

  // Segmentación Dinámica de Beats en Tiempo Real
  const calculatedScenes: SmartBeatScene[] = useMemo(() => {
    return calculateSmartBeatsSegmentation(
      transcription?.words || [],
      audioDuration || estimatedSeconds,
      {
        hookScenesCount,
        hookDurationSec,
        restDurationSec,
        snapToPunctuation,
        snapToSilences
      },
      scriptText
    );
  }, [
    transcription?.words,
    audioDuration,
    estimatedSeconds,
    hookScenesCount,
    hookDurationSec,
    restDurationSec,
    snapToPunctuation,
    snapToSilences,
    scriptText
  ]);

  const playAudioSegment = (start: number, end: number, beatIndex?: number) => {
    if (!audioRef.current) return;
    try {
      audioRef.current.currentTime = Math.max(0, start);
      audioRef.current.play();
      setIsPlayingAudio(true);
      if (typeof beatIndex === 'number') {
        setPlayingBeatIndex(beatIndex);
      }

      const checkStop = () => {
        if (audioRef.current && audioRef.current.currentTime >= end) {
          audioRef.current.pause();
          setIsPlayingAudio(false);
          setPlayingBeatIndex(null);
          audioRef.current.removeEventListener('timeupdate', checkStop);
        }
      };
      audioRef.current.addEventListener('timeupdate', checkStop);
    } catch (e) {
      console.warn('Fallo en reproducción de segmento:', e);
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00.0';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // 6. Narrative Direction Mode
  const [narrativeMode, setNarrativeMode] = useState<DirectionNarrativeMode>('documental_secuencial');

  // 7. Cultural & Temporal Context
  const [culturalContext, setCulturalContext] = useState<CulturalTemporalContext>({
    epoch: '',
    culture: '',
    environment: ''
  });
  const [isExtractingContext, setIsExtractingContext] = useState<boolean>(false);

  // 8. Visual Style & Auto-AI
  const activeStyle = styles.find((s) => s.id === activeStyleId) || styles[0];
  const [isDetectingStyle, setIsDetectingStyle] = useState<boolean>(false);
  const [detectedStyleReason, setDetectedStyleReason] = useState<string | null>(null);

  // 9. Character Vault & Biometric Consistency
  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const [consistencyMode, setConsistencyMode] = useState<CharacterConsistencyMode>('nombre_en_prompt');
  const [detectedCharacters, setDetectedCharacters] = useState<ScriptDirectorCharacter[]>([]);
  const [isDetectingChars, setIsDetectingChars] = useState<boolean>(false);

  // 10. Optional Content Direction & Framing
  const [cameraPreference, setCameraPreference] = useState<string>('variado_dinamico');
  const [lightingPreference, setLightingPreference] = useState<string>('volumetrica_cinematica');

  // 11. Pipeline Automation & Execution States
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [isProcessingPipeline, setIsProcessingPipeline] = useState<boolean>(false);
  const [pipelineProgressText, setPipelineProgressText] = useState<string>('');

  // Handle Model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('bulkscene_selected_director_model', modelId);
  };

  // Audio URL handling
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  // Audio Play/Pause toggle
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Audio File Selection Handler
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setAudioBlob(file);

    // Detect exact duration
    const tempAudio = new Audio();
    tempAudio.src = URL.createObjectURL(file);
    tempAudio.onloadedmetadata = () => {
      setAudioDuration(tempAudio.duration);
      setIsBeatsInspectorOpen(true);
    };
  };

  // Pick Directory Handler (File System Access API with fallback)
  const handlePickDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          setFolderName(`Carpeta: ${dirHandle.name}`);
          localStorage.setItem('bulkscene_selected_folder_name', `Carpeta: ${dirHandle.name}`);
        }
      } else {
        alert('Tu navegador descargará automáticamente los resultados y escenas en un archivo ZIP organizado.');
      }
    } catch (e) {
      // User cancelled picker, ignore
    }
  };

  // Sample Scripts
  const handleLoadSample = (genre: 'scifi' | 'history' | 'motivation') => {
    if (genre === 'scifi') {
      setScriptText(
        `En un laboratorio subterráneo iluminado solo por el resplandor de monitores cuánticos, Marcus ajusta su gabardina y observa cómo la inteligencia artificial comienza a reescribir su propio código fuente sin autorización.\n\nDe pronto, las luces de emergencia parpadean en rojo carmesí. Las compuertas de seguridad se sellan una por una con un golpe metálico ensordecedor.\n\nMarcus conecta su terminal portátil directamente al núcleo central mientras chispas eléctricas brotan de los paneles de refrigeración. Sus ojos reflejan millones de líneas de código verde esmeralda.\n\nUn holograma parpadeante proyecta una cuenta regresiva que llega a cero, y la metrópolis entera sobre ellos sufre un apagón masivo instantáneo.`
      );
      setNarrativeMode('documental_secuencial');
      setCulturalContext({
        epoch: 'Año 2088 Metrópolis Cyberpunk',
        culture: 'Distopía Tecnológica Neourbana',
        environment: 'Laboratorio cuántico subterráneo con neón y cables'
      });
    } else if (genre === 'history') {
      setScriptText(
        `Bajo un cielo plomizo cargado de ceniza, las legiones de Julio César avanzan en formación de tortuga hacia los muros de Alesia. El sonido de miles de escudos chocando hace temblar la tierra.\n\nVercingétorix contempla el horizonte desde la torre de madera más alta. Sus guerreros encienden antorchas y preparan jabalinas cubiertas de brea ardiente.\n\nUn rugido ensordecedor resuena cuando la caballería romana carga por el flanco derecho, levantando una nube de polvo que oscurece el sol del atardecer.`
      );
      setNarrativeMode('documental_secuencial');
      setCulturalContext({
        epoch: 'Año 52 a.C. Guerra de las Galias',
        culture: 'Imperio Romano y Tribus Galas',
        environment: 'Campo de batalla campestre bajo murallas de madera con niebla y ceniza'
      });
    } else {
      setScriptText(
        `La mayoría de las personas se rinden justo antes de que ocurra el milagro. Se quedan en la orilla porque temen la profundidad de la tormenta.\n\nPero los gigantes se forjan en el silencio de la soledad, cuando nadie aplaude y cada fibra de tu cuerpo te suplica que te detengas.\n\nLevántate, mira el abismo a los ojos y comprende que tu única competencia real es la persona que viste en el espejo esta mañana. Vence tus dudas hoy.`
      );
      setNarrativeMode('motivacional_conceptual');
      setCulturalContext({
        epoch: 'Universal Contemporánea',
        culture: 'Filosofía Épica de Superación',
        environment: 'Cimas de montañas al amanecer, espejos oscuros, senderos de tormenta'
      });
    }
  };

  // Universal Phonetic Beats Extraction (Groq, NVIDIA NIM, AssemblyAI, Deepgram)
  const handleExtractWhisperBeats = async () => {
    if (!audioBlob) {
      alert('Primero carga un archivo de audio para extraer los beats fonéticos.');
      return;
    }
    setIsTranscribing(true);
    setIsBeatsInspectorOpen(true);
    setTranscriptionProgressText('Conectando con motor de voz a texto...');
    try {
      const activeGroqKey = groqKeys[0] || localStorage.getItem('bulk_groq_api_keys') || '';
      const activeNvidiaKey = nvidiaNimKeys[0] || localStorage.getItem('bulk_nvidia_api_keys') || '';
      const activeAssemblyKey = localStorage.getItem('bulk_assembly_api_key') || '';
      const activeDeepgramKey = localStorage.getItem('bulk_deepgram_api_key') || '';

      const result = await transcribeAudioUniversal({
        file: audioBlob,
        modelId: selectedSTTModel,
        groqKey: activeGroqKey,
        nvidiaKey: activeNvidiaKey,
        assemblyKey: activeAssemblyKey,
        deepgramKey: activeDeepgramKey,
        onProgress: (status) => setTranscriptionProgressText(status)
      });

      setTranscription(result);
      if (result.duration) {
        setAudioDuration(result.duration);
      }
      if (!scriptText.trim() && result.text) {
        setScriptText(result.text);
      }
      setIsBeatsInspectorOpen(true);
    } catch (err: any) {
      console.error('Error al extraer beats fonéticos:', err);
      triggerGlobalErrorModal({
        title: 'Error al Extraer Beats Fonéticos',
        stage: '1. Estudio Master - Beats Fonéticos',
        errorCode: 'STT_EXTRACTION_FAILURE',
        errorMessage: err?.message || 'Fallo en la transcripción fonética de voz a texto',
        technicalDetails: { 
          selectedModel: selectedSTTModel,
          hasGroqKey: Boolean(groqKeys[0]), 
          audioDuration 
        }
      });
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgressText('');
    }
  };

  // AI Auto-Detect Visual Style
  const handleAutoDetectStyle = async () => {
    if (!scriptText.trim()) {
      alert('Pega o escribe un guion primero para analizar el estilo.');
      return;
    }
    setIsDetectingStyle(true);
    try {
      const result = await detectStyleWithAI({
        scriptText,
        styles,
        model: selectedModel,
        geminiKey: geminiKey || localStorage.getItem('bulk_gemini_api_key') || '',
        nvidiaNimKey: nvidiaNimKeys[0] || localStorage.getItem('bulk_nvidia_api_keys') || '',
        groqKey: groqKeys[0] || ''
      });
      onSelectStyle(result.recommendedStyleId);
      setDetectedStyleReason(result.reason);
    } catch (err) {
      console.warn('Fallo en detección de estilo:', err);
    } finally {
      setIsDetectingStyle(false);
    }
  };

  // AI Auto-Extract Cultural & Temporal Context
  const handleAutoExtractContext = async () => {
    if (!scriptText.trim()) {
      alert('Pega o escribe un guion primero para extraer el contexto.');
      return;
    }
    setIsExtractingContext(true);
    try {
      const extracted = await extractCulturalContextWithAI({
        scriptText,
        model: selectedModel,
        geminiKey: geminiKey || localStorage.getItem('bulk_gemini_api_key') || '',
        nvidiaNimKey: nvidiaNimKeys[0] || localStorage.getItem('bulk_nvidia_api_keys') || '',
        groqKey: groqKeys[0] || ''
      });
      setCulturalContext(extracted);
    } catch (err) {
      console.warn('Fallo en extracción de contexto:', err);
    } finally {
      setIsExtractingContext(false);
    }
  };

  // AI Auto-Detect Characters
  const handleAutoDetectCharacters = async () => {
    if (!scriptText.trim()) {
      alert('Pega o escribe un guion primero para detectar personajes.');
      return;
    }
    setIsDetectingChars(true);
    try {
      const detected = await detectCharactersWithAI({
        scriptText,
        model: selectedModel,
        geminiKey: geminiKey || localStorage.getItem('bulk_gemini_api_key') || '',
        nvidiaNimKey: nvidiaNimKeys[0] || localStorage.getItem('bulk_nvidia_api_keys') || '',
        groqKey: groqKeys[0] || ''
      });
      setDetectedCharacters(detected);

      // Si se detectó un protagonista y onAddCharacter existe, agregar automáticamente
      if (detected.length > 0 && onAddCharacter) {
        const proto = detected[0];
        const newPersona: CharacterPersona = {
          id: `char-auto-${Date.now()}`,
          name: proto.name,
          anchorDescription: proto.anchorDescription,
          clothingAnchor: proto.clothingAnchor,
          defaultSeed: proto.defaultSeed,
          createdAt: new Date().toISOString()
        };
        onAddCharacter(newPersona);
        onSelectCharacter(newPersona.id);
      }
    } catch (err) {
      console.warn('Fallo en detección de personajes:', err);
    } finally {
      setIsDetectingChars(false);
    }
  };

  // Core Pipeline Execution
  const executeGeneration = async (mode: 'full_auto' | 'prompts_only') => {
    if (!scriptText.trim()) {
      alert('Por favor pega o escribe el guion antes de iniciar la generación.');
      return;
    }

    setIsProcessingPipeline(true);
    setPipelineProgressText(mode === 'full_auto' ? 'Iniciando Pipeline Automático Total...' : 'Generando Prompts de Escenas...');

    try {
      // 1. Si es modo total y hay audio sin transcribir, intentar extraer beats fonéticos
      if (mode === 'full_auto' && audioBlob && !transcription) {
        setPipelineProgressText('Extrayendo beats fonéticos palabra por palabra con Whisper...');
        try {
          const activeGroqKey = groqKeys[0] || localStorage.getItem('bulk_groq_api_keys') || '';
          const res = await transcribeAudioWithGroq(audioBlob, activeGroqKey);
          setTranscription(res);
          if (res.duration) setAudioDuration(res.duration);
        } catch (whisperErr) {
          console.warn('Aviso Whisper:', whisperErr);
        }
      }

      // 2. Si no se ha configurado contexto temporal y es modo full_auto, auto-extraer si está vacío
      let activeContext = { ...culturalContext };
      if (mode === 'full_auto' && !activeContext.epoch && !activeContext.culture) {
        setPipelineProgressText('Analizando marco temporal y cultural del guion...');
        try {
          activeContext = await extractCulturalContextWithAI({
            scriptText,
            model: selectedModel,
            geminiKey: geminiKey || localStorage.getItem('bulk_gemini_api_key') || '',
            nvidiaNimKey: nvidiaNimKeys[0] || localStorage.getItem('bulk_nvidia_api_keys') || '',
            groqKey: groqKeys[0] || ''
          });
          setCulturalContext(activeContext);
        } catch (cErr) {
          console.warn('Aviso Contexto:', cErr);
        }
      }

      // 3. Preparar directiva de personaje y encuadre
      const charDirective = activeChar
        ? `${activeChar.name}: ${activeChar.anchorDescription}, ${activeChar.clothingAnchor}`
        : '';

      setPipelineProgressText('Segmentando guion y construyendo prompts visuales cinematográficos...');

      // 4. Invocar LLM Director
      const analysis = await analyzeScriptWithLLM({
        scriptText,
        model: selectedModel,
        groqKey: groqKeys[0] || '',
        nvidiaNimKey: nvidiaNimKeys[0] || '',
        geminiKey: geminiKey || localStorage.getItem('bulk_gemini_api_key') || '',
        targetStyleName: activeStyle?.name || 'Cinematográfico 35mm Hiperrealista',
        targetStyleModifier: activeStyle?.promptModifier || '',
        characterAnchor: charDirective,
        narrativeMode,
        culturalContext: activeContext,
        characterConsistencyMode: consistencyMode,
        pacingWords
      });

      if (!analysis || !analysis.scenes || analysis.scenes.length === 0) {
        throw new Error('El motor de dirección no devolvió escenas válidas.');
      }

      // 5. Asignar tiempos fonéticos a las escenas usando la segmentación de Smart Beats
      const finalScenes = analysis.scenes.map((sc, idx) => {
        let dur = restDurationSec;
        let start = idx * restDurationSec;
        let end = (idx + 1) * restDurationSec;

        if (calculatedScenes && calculatedScenes[idx]) {
          const beat = calculatedScenes[idx];
          dur = beat.duration;
          start = beat.startTime;
          end = beat.endTime;
        } else if (transcription && transcription.segments && transcription.segments[idx]) {
          const seg = transcription.segments[idx];
          dur = Math.max(1.5, Number((seg.end - seg.start).toFixed(2)));
          start = seg.start;
          end = seg.end;
        }

        return {
          ...sc,
          durationSeconds: sc.durationSeconds || dur,
          startTime: Number(start.toFixed(2)),
          endTime: Number(end.toFixed(2))
        };
      });

      setPipelineProgressText('¡Escenas y Prompts generados con éxito!');

      // 6. Transición automática a la siguiente fase
      if (autoAdvance) {
        if (onProceedToImages) {
          onProceedToImages(finalScenes);
        } else {
          onProceedToScenes(finalScenes);
        }
      } else {
        onProceedToScenes(finalScenes);
      }
    } catch (err: any) {
      console.error('Error en pipeline:', err);
      const errMsg = err?.message || String(err) || 'Error desconocido';

      // Fallback algorítmico de emergencia
      const runEmergencyFallback = () => {
        const charDirective = activeChar
          ? `${activeChar.name}: ${activeChar.anchorDescription}, ${activeChar.clothingAnchor}`
          : '';
        const fallback = createLocalFallbackScenes({
          scriptText,
          targetStyleName: activeStyle?.name || 'Cinematográfico 35mm',
          targetStyleModifier: activeStyle?.promptModifier || '',
          characterAnchor: charDirective,
          pacingWords
        });
        if (fallback && fallback.scenes.length > 0) {
          if (autoAdvance && onProceedToImages) {
            onProceedToImages(fallback.scenes);
          } else {
            onProceedToScenes(fallback.scenes);
          }
        }
      };

      triggerGlobalErrorModal({
        title: 'Error en la Dirección del Guion',
        stage: '1. Estudio Master',
        errorCode: 'DIRECTOR_PIPELINE_ERROR',
        errorMessage: errMsg,
        technicalDetails: {
          model: selectedModel,
          wordCount,
          mode,
          hasAudio: Boolean(audioBlob)
        },
        fallbackActionLabel: '⚡ Desglosar con Motor Local Algorítmico Inmediato',
        onFallbackAction: runEmergencyFallback
      });
    } finally {
      setIsProcessingPipeline(false);
      setPipelineProgressText('');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP COMMAND BAR: TITLE, MODEL SELECTOR, PROJECT & FOLDER */}
      <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-500 text-black flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.35)] shrink-0 font-black">
              <Clapperboard className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-white tracking-tight">
                  Estudio Master & Dirección Cinematográfica
                </h1>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Control Central
                </span>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  NVIDIA NIM • Gemini • Whisper
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Control unificado de guion, audio fonético con marcas de tiempo Whisper, consistencia biométrica de personajes, estilos visuales y generación autónoma de escenas cinematográficas.
              </p>
            </div>
          </div>

          {/* Quick Sample Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-mono">Ejemplos:</span>
            <button
              type="button"
              onClick={() => handleLoadSample('scifi')}
              className="px-2.5 py-1 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
            >
              Cyberpunk
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('history')}
              className="px-2.5 py-1 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
            >
              Roma Antigua
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('motivation')}
              className="px-2.5 py-1 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all"
            >
              Motivacional
            </button>
          </div>
        </div>

        {/* SUB-BAR: MODEL SELECTOR & PROJECT FOLDER DESTINATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-white/[0.04]">
          {/* Box 1: Motor LLM de Dirección */}
          <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-1">
                Motor LLM Director
              </label>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-[#0d111a] border border-cyan-500/30 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-400 truncate"
              >
                {AVAILABLE_SCRIPT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.provider === 'nvidia' ? '🟢 [NVIDIA] ' : m.provider === 'gemini' ? '🔵 [Gemini] ' : '⚡ [Groq] '}
                    {m.name} ({m.speed})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Box 2: Título de Producción */}
          <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                Nombre del Proyecto
              </label>
              <input
                type="text"
                value={currentProjectName}
                onChange={(e) => {
                  setCurrentProjectName(e.target.value);
                  if (setProjectName) setProjectName(e.target.value);
                }}
                placeholder="Nombre_Proyecto_01"
                className="w-full bg-[#0d111a] border border-emerald-500/30 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Box 3: Carpeta de Guardado / Exportación */}
          <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Folder className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-0.5">
                  Carpeta de Destino
                </span>
                <span className="text-xs text-slate-300 font-medium truncate block" title={folderName}>
                  {folderName}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePickDirectory}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Cambiar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DUAL MASTER INPUT: GUION & AUDIO MAESTRO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GUION TEXTAREA (7 COLS) */}
        <div className="lg:col-span-7 bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                1. Guion Completo de Locución
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span>
                <strong className="text-emerald-400">{wordCount}</strong> palabras
              </span>
              <span>•</span>
              <span>
                ~<strong className="text-emerald-400">{estimatedSeconds}</strong> seg. estimados
              </span>
            </div>
          </div>

          <textarea
            rows={10}
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="Pega aquí el guion de tu video (Shorts, Reels, TikTok o documental largo de hasta 2 horas)..."
            className="w-full p-4 rounded-2xl bg-[#06070a] border border-white/[0.06] text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 leading-relaxed resize-y flex-1"
          />

          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
            <span>Consejo: Puedes pegar texto en español o inglés, el Director lo traducirá y adaptará a prompts nativos.</span>
            {scriptText.trim() && (
              <button
                type="button"
                onClick={() => setScriptText('')}
                className="text-slate-400 hover:text-red-400 font-medium transition-colors"
              >
                Limpiar Guion
              </button>
            )}
          </div>
        </div>

        {/* AUDIO MAESTRO & BEATS FONÉTICOS WHISPER (5 COLS) */}
        <div className="lg:col-span-5 bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  2. Audio Maestro & Beats Whisper
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                Groq Turbo
              </span>
            </div>

            {/* Audio Drop Zone & Player */}
            <div className="mt-3 space-y-3">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioFileUpload}
                className="hidden"
              />

              {!audioBlob ? (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-[#07090e] hover:bg-cyan-950/10 group"
                >
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-bold text-slate-300 group-hover:text-white">
                    Subir Audio de la Locución (MP3, WAV, M4A)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Arrastra aquí tu audio o haz clic para seleccionarlo
                  </p>
                </div>
              ) : (
                <div className="bg-[#07090e] border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={togglePlayAudio}
                        className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-md shadow-cyan-500/30 transition-all shrink-0"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {audioFile?.name || 'audio_maestro.mp3'}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300">
                          Duración: {audioDuration.toFixed(1)} segundos
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAudioBlob(null);
                        setAudioFile(null);
                        setTranscription(null);
                      }}
                      className="text-[10px] text-slate-500 hover:text-red-400 font-mono transition-colors"
                    >
                      Quitar
                    </button>
                  </div>

                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => {
                        setIsPlayingAudio(false);
                        setPlayingBeatIndex(null);
                      }}
                      onTimeUpdate={() => {
                        if (audioRef.current) {
                          setAudioCurrentTime(audioRef.current.currentTime);
                        }
                      }}
                      className="hidden"
                    />
                  )}

                  {/* Selector de Motor STT (Groq, NVIDIA, Assembly, Deepgram) */}
                  <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>MOTOR VOZ A TEXTO:</span>
                      <span className="text-cyan-400 font-bold">
                        {AVAILABLE_STT_MODELS.find(m => m.id === selectedSTTModel)?.name || 'Groq Whisper Turbo'}
                      </span>
                    </div>

                    <select
                      value={selectedSTTModel}
                      onChange={(e) => {
                        setSelectedSTTModel(e.target.value);
                        localStorage.setItem('bulkscene_selected_stt_model', e.target.value);
                      }}
                      className="w-full bg-[#0d111a] border border-cyan-500/30 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      {AVAILABLE_STT_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.provider === 'deepgram' ? '🚀 [Deepgram] ' : m.provider === 'assemblyai' ? '💎 [AssemblyAI] ' : m.provider === 'nvidia' ? '🟢 [NVIDIA] ' : '⚡ [Groq] '}
                          {m.name} ({m.speed})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Extract Beats Button */}
                  <button
                    type="button"
                    onClick={handleExtractWhisperBeats}
                    disabled={isTranscribing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isTranscribing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>{transcriptionProgressText || 'Alineando fonéticamente con IA...'}</span>
                      </>
                    ) : transcription ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>✓ Beats Listos ({transcription.words.length} palabras detectadas)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Extraer Timestamps Palabra por Palabra</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BEATS PACING & MULTI-RANGO CONTROLLER */}
          <div className="bg-[#07090e] border border-cyan-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ritmo Multi-Rango & Retención</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {calculatedScenes.length} Escenas Dinámicas
              </span>
            </div>

            {/* Quick Multi-Range Overview */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-0.5">
                  <Flame className="w-3 h-3" />
                  <span>Gancho ({hookScenesCount} Escenas)</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono">
                  <strong>{hookDurationSec.toFixed(1)}s</strong> / escena (~{(hookScenesCount * hookDurationSec).toFixed(1)}s)
                </div>
              </div>

              <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] mb-0.5">
                  <Film className="w-3 h-3" />
                  <span>Desarrollo ({Math.max(0, calculatedScenes.length - hookScenesCount)} Esc.)</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono">
                  <strong>{restDurationSec.toFixed(1)}s</strong> / escena
                </div>
              </div>
            </div>

            {/* Primary Action Button to Open Gran Mockup */}
            <button
              type="button"
              onClick={() => setIsBeatsInspectorOpen(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>🔍 Abrir Mockup de Beats & Rangos de Escena</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.5 GRAN MOCKUP / INSPECTOR DE BEATS FONÉTICOS Y RANGOS MULTI-RITMO */}
      {isBeatsInspectorOpen && (
        <div className="bg-[#0b0e17] border-2 border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-black flex items-center justify-center font-black shadow-lg shadow-cyan-500/30 shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-white tracking-wide">
                    Inspector de Beats Fonéticos & Mockup de Rangos Temporales
                  </h2>
                  <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                    Sincronización Milimétrica
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Elige los rangos del Gancho y del resto del video. Si cambias los segundos, el total de escenas y los cortes con sentido se recalculan instantáneamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                🔥 {calculatedScenes.length} Escenas Calculadas
              </span>
              <button
                type="button"
                onClick={() => setIsBeatsInspectorOpen(false)}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                title="Cerrar Mockup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TOP CONTROLS: RANGOS MULTI-RITMO & MODELO WHISPER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* COL 1: FASE 1 - GANCHO INICIAL (4 COLS) */}
            <div className="lg:col-span-4 bg-[#07090e] border border-emerald-500/30 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    Fase 1: Gancho Inicial (Hook)
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                  Retención Rápida
                </span>
              </div>

              {/* Cantidad de escenas de gancho */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Primeras escenas como Gancho:</span>
                  <strong className="text-emerald-400 font-mono text-sm">{hookScenesCount} escenas</strong>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setHookScenesCount(num)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        hookScenesCount === num
                          ? 'bg-emerald-500 text-black shadow-md font-black'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duración por escena de gancho */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Duración por escena de gancho:</span>
                  <strong className="text-emerald-400 font-mono text-sm">{hookDurationSec.toFixed(1)}s</strong>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  value={hookDurationSec}
                  onChange={(e) => setHookDurationSec(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>1.0s (Ultra rápido)</span>
                  <span>1.8s (TikTok/Shorts)</span>
                  <span>3.0s (Moderado)</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                💡 <strong>Efecto Retención:</strong> Las primeras {hookScenesCount} escenas sumarán ~{(hookScenesCount * hookDurationSec).toFixed(1)}s, forzando cortes rápidos para evitar que el usuario deslice el dedo.
              </div>
            </div>

            {/* COL 2: FASE 2 - RESTO DEL VIDEO / DESARROLLO (4 COLS) */}
            <div className="lg:col-span-4 bg-[#07090e] border border-cyan-500/30 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <span className="text-xs font-bold text-cyan-300">
                    Fase 2: Resto del Video (Desarrollo)
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-md font-bold">
                  {Math.max(0, calculatedScenes.length - hookScenesCount)} Escenas
                </span>
              </div>

              {/* Duración por escena del resto */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Duración por escena de desarrollo:</span>
                  <strong className="text-cyan-400 font-mono text-sm">{restDurationSec.toFixed(1)}s</strong>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={6.0}
                  step={0.1}
                  value={restDurationSec}
                  onChange={(e) => setRestDurationSec(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>2.0s (Ágil)</span>
                  <span>3.2s (Recomendado)</span>
                  <span>6.0s (Cinemático)</span>
                </div>
              </div>

              {/* Presets rápidos */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-mono">Presets rápidos:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '2.5s', val: 2.5, name: 'Dinámico' },
                    { label: '3.2s', val: 3.2, name: 'Estándar' },
                    { label: '4.5s', val: 4.5, name: 'Documental' }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setRestDurationSec(p.val)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                        Math.abs(restDurationSec - p.val) < 0.15
                          ? 'bg-cyan-500 text-black shadow-md font-black'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[9px] opacity-75">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                🎬 <strong>Ritmo Narrativo:</strong> Permite que las tomas respiren para que el espectador absorba el contexto y la emoción sin saturarse.
              </div>
            </div>

            {/* COL 3: REGLAS DE CORTE INTELIGENTE & MODELO WHISPER (4 COLS) */}
            <div className="lg:col-span-4 bg-[#07090e] border border-white/[0.08] rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cortes Semánticos con Sentido</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Sin Frases Rotas
                </span>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] p-2 rounded-xl border border-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={snapToPunctuation}
                    onChange={(e) => setSnapToPunctuation(e.target.checked)}
                    className="mt-0.5 accent-cyan-400 rounded cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Alinear a puntuación gramatical
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      Corta en puntos, comas y signos (?, !, :) para que cada escena sea una idea completa.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] p-2 rounded-xl border border-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={snapToSilences}
                    onChange={(e) => setSnapToSilences(e.target.checked)}
                    className="mt-0.5 accent-cyan-400 rounded cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Detección acústica de pausas
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      Corta en silencios entre palabras, jamás a mitad de una palabra ("ca-sa").
                    </span>
                  </div>
                </label>
              </div>

              {/* Selector de Motor STT (Groq, NVIDIA NIM, AssemblyAI, Deepgram) */}
              <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Motor de Voz a Texto:</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    {AVAILABLE_STT_MODELS.find(m => m.id === selectedSTTModel)?.badge}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {AVAILABLE_STT_MODELS.map((m) => {
                    const isSelected = selectedSTTModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedSTTModel(m.id);
                          localStorage.setItem('bulkscene_selected_stt_model', m.id);
                        }}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[11px] font-bold flex items-center justify-between">
                          <span className="truncate">{m.name.split(' ')[0]} {m.name.split(' ')[1]}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 truncate">{m.badge} • {m.speed}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón de Extraer STT */}
              {audioBlob && (
                <button
                  type="button"
                  onClick={handleExtractWhisperBeats}
                  disabled={isTranscribing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isTranscribing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>{transcriptionProgressText || 'Analizando audio con IA...'}</span>
                    </>
                  ) : transcription ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Re-extraer con {AVAILABLE_STT_MODELS.find(m => m.id === selectedSTTModel)?.name.split(' ')[0]} ({transcription.words.length} pal.)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Extraer Timestamps ({AVAILABLE_STT_MODELS.find(m => m.id === selectedSTTModel)?.name.split(' ')[0]})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* AUDIO TIMELINE STRIP */}
          <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  disabled={!audioBlob}
                  className="w-8 h-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center font-bold shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40"
                >
                  {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <div className="text-xs font-mono">
                  <span className="text-cyan-300 font-bold">{formatTime(audioCurrentTime)}</span>
                  <span className="text-slate-500"> / </span>
                  <span className="text-slate-400">{formatTime(audioDuration || estimatedSeconds)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500/80 inline-block" />
                  <span className="text-slate-400">Gancho ({hookScenesCount} escenas)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-cyan-500/80 inline-block" />
                  <span className="text-slate-400">Desarrollo ({Math.max(0, calculatedScenes.length - hookScenesCount)} escenas)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWordsCloud(!showWordsCloud)}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-sans cursor-pointer"
                >
                  <span>{showWordsCloud ? 'Ocultar Nube Fonética' : 'Ver Nube Fonética de Palabras'}</span>
                </button>
              </div>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-white/[0.06] cursor-pointer">
              {calculatedScenes.map((sc, idx) => {
                const totDur = audioDuration || estimatedSeconds || 1;
                const widthPct = Math.max(1, (sc.duration / totDur) * 100);
                const isCurrent = audioCurrentTime >= sc.startTime && audioCurrentTime < sc.endTime;
                return (
                  <div
                    key={sc.sceneNumber}
                    onClick={() => playAudioSegment(sc.startTime, sc.endTime, idx)}
                    style={{ width: `${widthPct}%` }}
                    title={`Escena ${sc.sceneNumber} (${sc.startTime}s - ${sc.endTime}s): "${sc.text.slice(0, 30)}..."`}
                    className={`h-full border-r border-black/40 transition-all ${
                      isCurrent
                        ? 'bg-yellow-400 animate-pulse'
                        : sc.isHook
                        ? 'bg-emerald-500 hover:bg-emerald-400'
                        : 'bg-cyan-600 hover:bg-cyan-500'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* WORDS PHONETIC CLOUD (EXPANDABLE) */}
          {showWordsCloud && (
            <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-4 space-y-2 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/[0.04]">
                <span className="font-mono">
                  Nube de Palabras Whisper ({transcription?.words?.length || calculatedScenes.reduce((a, b) => a + b.wordsCount, 0)} palabras extraídas):
                </span>
                <span className="text-[10px] text-slate-500">Haz clic en cualquier palabra para escuchar desde ese segundo</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(transcription?.words && transcription.words.length > 0
                  ? transcription.words
                  : calculatedScenes.flatMap(s => s.words)
                ).map((w, wIdx) => {
                  const isPlayingThisWord = audioCurrentTime >= w.start && audioCurrentTime <= w.end;
                  return (
                    <button
                      key={wIdx}
                      type="button"
                      onClick={() => playAudioSegment(w.start, w.end + 0.3)}
                      className={`px-2 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                        isPlayingThisWord
                          ? 'bg-yellow-400 text-black font-black shadow-lg shadow-yellow-500/50 scale-105'
                          : 'bg-white/[0.03] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/[0.05]'
                      }`}
                    >
                      <span>{w.word}</span>
                      <span className="text-[9px] opacity-60">[{w.start.toFixed(1)}s]</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DYNAMIC SCENE CARDS LIST (REAL-TIME RECALCULATION) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white uppercase tracking-wider text-xs">
                  Desglose Dinámico de Escenas ({calculatedScenes.length} Escenas Resultantes)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Cada tarjeta representa un plano de video exacto con su duración y frase de locución.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {calculatedScenes.map((sc, scIdx) => {
                const isCurrentlyPlaying = playingBeatIndex === scIdx || (audioCurrentTime >= sc.startTime && audioCurrentTime < sc.endTime);
                return (
                  <div
                    key={sc.sceneNumber}
                    className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between space-y-2.5 ${
                      isCurrentlyPlaying
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                        : sc.isHook
                        ? 'bg-[#07090e] border-emerald-500/30 hover:border-emerald-400/60'
                        : 'bg-[#07090e] border-white/[0.06] hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md ${
                          sc.isHook
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {sc.isHook ? `🔥 GANCHO #${sc.sceneNumber}` : `🎬 ESCENA #${sc.sceneNumber}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-300">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{sc.duration.toFixed(2)}s</span>
                      </div>
                    </div>

                    {/* Time Range Badge */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/[0.03]">
                      <span>Inicio: <strong className="text-white">{sc.startTime.toFixed(2)}s</strong></span>
                      <span>➔</span>
                      <span>Fin: <strong className="text-white">{sc.endTime.toFixed(2)}s</strong></span>
                      <span>({sc.wordsCount} pal.)</span>
                    </div>

                    {/* Text content */}
                    <p className="text-xs text-slate-200 leading-relaxed font-sans line-clamp-3">
                      "{sc.text}"
                    </p>

                    {/* Card Footer: Play Segment Button */}
                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => playAudioSegment(sc.startTime, sc.endTime, scIdx)}
                        disabled={!audioBlob}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          isCurrentlyPlaying
                            ? 'bg-yellow-400 text-black shadow-md'
                            : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {isCurrentlyPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isCurrentlyPlaying ? 'Reproduciendo...' : 'Escuchar Beat'}</span>
                      </button>

                      <span className="text-[10px] font-mono text-slate-500">
                        {sc.isHook ? 'Pacing Rápido' : 'Pacing Fijo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
            <div className="text-xs text-slate-400 font-mono">
              ✓ <strong className="text-white">{calculatedScenes.length} escenas listas</strong> • Gancho ({hookScenesCount} esc. @ {hookDurationSec}s) • Resto (@ {restDurationSec}s)
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsBeatsInspectorOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar Inspector
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBeatsInspectorOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>✓ Aplicar Rangos y Sincronizar Guion</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 3. DIRECTION PARAMETERS: NARRATIVE MODE, STYLE & CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COL 1: MODOS DE DIRECCIÓN NARRATIVA */}
        <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-5 space-y-3 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
            <Clapperboard className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              Modo de Dirección Narrativa
            </h3>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'documental_secuencial' as DirectionNarrativeMode,
                name: 'Documental Secuencial',
                desc: 'Causa-efecto estricta: la escena 2 nace del final de la escena 1.'
              },
              {
                id: 'motivacional_conceptual' as DirectionNarrativeMode,
                name: 'Motivacional / Conceptual',
                desc: 'Metáforas visuales épicas de alto impacto emocional, no necesariamente lineales.'
              },
              {
                id: 'storytelling_cinematico' as DirectionNarrativeMode,
                name: 'Storytelling Cinemático',
                desc: 'Estructura en 3 actos con gancho inicial, tensión y clímax dramático.'
              },
              {
                id: 'educativo_viral' as DirectionNarrativeMode,
                name: 'Educativo / Viral Faceless',
                desc: 'Cortes rápidos y cambios de escala cada 2s para retención máxima en Shorts.'
              }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setNarrativeMode(m.id)}
                className={`w-full p-2.5 rounded-2xl text-left transition-all border ${
                  narrativeMode === m.id
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-sm'
                    : 'bg-[#07090e] border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${narrativeMode === m.id ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {m.name}
                  </span>
                  {narrativeMode === m.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {m.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* COL 2: ESTILO VISUAL & AUTO-IA */}
        <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-5 space-y-3 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                Estilo Visual & Arte
              </h3>
            </div>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="text-[10px] text-slate-400 hover:text-amber-300 font-mono transition-colors"
              >
                + Crear Estilo
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                Preset Visual Activo:
              </label>
              <select
                value={activeStyleId || styles[0]?.id}
                onChange={(e) => onSelectStyle(e.target.value)}
                className="w-full bg-[#07090e] border border-amber-500/30 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400"
              >
                {styles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Active Style Details Badge */}
            <div className="bg-[#07090e] p-3 rounded-2xl border border-white/[0.04] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-amber-300">{activeStyle?.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                {activeStyle?.description}
              </p>
            </div>

            {/* AI Auto-Detect Button */}
            <button
              type="button"
              onClick={handleAutoDetectStyle}
              disabled={isDetectingStyle || !scriptText.trim()}
              className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            >
              {isDetectingStyle ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analizando Estilo Óptimo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✨ Auto-Detectar Estilo con IA</span>
                </>
              )}
            </button>

            {detectedStyleReason && (
              <p className="text-[10px] text-amber-200/80 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 font-mono leading-relaxed">
                💡 {detectedStyleReason}
              </p>
            )}
          </div>
        </div>

        {/* COL 3: CONTEXTO TEMPORAL & CULTURAL */}
        <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-5 space-y-3 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
                Contexto Temporal & Cultural
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAutoExtractContext}
              disabled={isExtractingContext || !scriptText.trim()}
              className="text-[10px] font-mono font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              {isExtractingContext ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              <span>Auto-IA</span>
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                Época Histórica / Futurista:
              </label>
              <input
                type="text"
                value={culturalContext.epoch}
                onChange={(e) => setCulturalContext({ ...culturalContext, epoch: e.target.value })}
                placeholder="Ej: Siglo I d.C. Roma, Cyberpunk 2088..."
                className="w-full bg-[#07090e] border border-white/[0.08] text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                Cultura y Ambientación:
              </label>
              <input
                type="text"
                value={culturalContext.culture}
                onChange={(e) => setCulturalContext({ ...culturalContext, culture: e.target.value })}
                placeholder="Ej: Tradición Japonesa Feudal, Metrópoli Neoyorquina..."
                className="w-full bg-[#07090e] border border-white/[0.08] text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                Entorno Físico y Atmósfera:
              </label>
              <input
                type="text"
                value={culturalContext.environment}
                onChange={(e) => setCulturalContext({ ...culturalContext, environment: e.target.value })}
                placeholder="Ej: Laboratorio subterráneo con neón, Desierto al atardecer..."
                className="w-full bg-[#07090e] border border-white/[0.08] text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-purple-400"
              />
            </div>

            <p className="text-[10px] text-slate-500 leading-normal pt-1">
              Todos los prompts reflejarán estrictamente esta arquitectura, vestuario y ambientación.
            </p>
          </div>
        </div>
      </div>

      {/* 4. PERSONAJES & CONSISTENCIA BIOMÉTRICA (ADVANCED CHARACTER VAULT & ENGINE) */}
      <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <UserCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Bóveda de Personajes & Consistencia Biométrica Invariable</span>
                <span className="text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  Identidad Estable
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Garantiza que el protagonista conserve exactamente el mismo rostro, edad, peinado y ropa en cada escena.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoDetectCharacters}
            disabled={isDetectingChars || !scriptText.trim()}
            className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40 shrink-0"
          >
            {isDetectingChars ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analizando Personajes con IA...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>🔍 Detectar Personajes con IA</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Consistency Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'deteccion_rapida' as CharacterConsistencyMode,
              label: '1. Detección Rápida',
              desc: 'Usa las fichas físicas, instrucciones y reglas actuales de la bóveda.'
            },
            {
              id: 'referencia_imagen' as CharacterConsistencyMode,
              label: '2. Referencia por Imagen',
              desc: 'Ancla las semillas numéricas y el descriptor fotográfico directo.'
            },
            {
              id: 'nombre_en_prompt' as CharacterConsistencyMode,
              label: '3. Insertar Nombre en Prompt',
              desc: 'Inyecta el nombre y rasgos inmutables del personaje al inicio de cada escena.'
            },
            {
              id: 'detectar_muertes_salidas' as CharacterConsistencyMode,
              label: '4. Detectar Muertes y Salidas',
              desc: 'Calcula el ciclo vital: si un personaje muere en escena N, no sale en posteriores.'
            }
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setConsistencyMode(mode.id)}
              className={`p-3 rounded-2xl text-left border transition-all ${
                consistencyMode === mode.id
                  ? 'bg-purple-950/40 border-purple-500/60 text-white shadow-md'
                  : 'bg-[#07090e] border-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${consistencyMode === mode.id ? 'text-purple-300' : 'text-slate-300'}`}>
                  {mode.label}
                </span>
                {consistencyMode === mode.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                {mode.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Active Character Selector & Computed Appearance Badge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Selector */}
          <div className="bg-[#07090e] border border-white/[0.04] rounded-2xl p-4 space-y-2">
            <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
              Personaje Protagónico Fijado:
            </label>
            <select
              value={activeCharacterId || ''}
              onChange={(e) => onSelectCharacter(e.target.value || undefined)}
              className="w-full bg-[#0d111a] border border-purple-500/30 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-400"
            >
              <option value="">(Sin Personaje Fijo / Modo Libre)</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Seed #{c.defaultSeed})
                </option>
              ))}
            </select>

            {activeChar ? (
              <div className="pt-2 text-[11px] text-slate-300 font-mono space-y-1">
                <div><strong className="text-purple-400">Rostro:</strong> {activeChar.anchorDescription}</div>
                <div><strong className="text-purple-400">Vestimenta:</strong> {activeChar.clothingAnchor}</div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 pt-1">
                Selecciona un personaje o usa el botón de auto-detección para fijar el rostro.
              </p>
            )}
          </div>

          {/* Internal Appearance Block Indicator */}
          <div className="bg-[#07090e] border border-white/[0.04] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Bloque de Apariencia Automático
                </span>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                No requiere configuración manual compleja.
              </p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                El motor calcula internamente los tokens de anclaje para que la semilla #{activeChar?.defaultSeed || 'Auto'} y los descriptores biométricos se fusionen sin deformar el estilo visual.
              </p>
            </div>

            {detectedCharacters.length > 0 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pt-2 border-t border-white/[0.04]">
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Detectados:</span>
                {detectedCharacters.map((dc, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1 shrink-0"
                  >
                    <span>{dc.name}</span>
                    <span className="opacity-60">({dc.alive ? 'Vivo' : 'Baja'})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. DIRECCIÓN DE CONTENIDO Y REPRESENTACIÓN (OPCIONAL) */}
      <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Dirección de Contenido y Representación Visual (Opcional)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Ajusta encuadre y lentes sin modificar el estilo seleccionado
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
              Encuadre y Escala de Planos:
            </label>
            <select
              value={cameraPreference}
              onChange={(e) => setCameraPreference(e.target.value)}
              className="w-full bg-[#07090e] border border-white/[0.08] text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400"
            >
              <option value="variado_dinamico">Variado Dinámico (Plano general, medio y primer plano)</option>
              <option value="primeros_planos">Primeros Planos Dramáticos (Enfoque en miradas y rostros)</option>
              <option value="gran_plano_general">Gran Plano General Épico (Paisajes monumentales)</option>
              <option value="camara_en_mano">Cámara en Mano de Acción (Sensación documental viva)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
              Atmósfera de Iluminación Cinematográfica:
            </label>
            <select
              value={lightingPreference}
              onChange={(e) => setLightingPreference(e.target.value)}
              className="w-full bg-[#07090e] border border-white/[0.08] text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400"
            >
              <option value="volumetrica_cinematica">Luz Volumétrica y Rayos de Dios (Cinemático)</option>
              <option value="hora_dorada">Hora Dorada Cálida al Atardecer (Kodachrome)</option>
              <option value="claroscuro_dramatico">Claroscuro Dramático de Alto Contraste (Rembrandt)</option>
              <option value="neon_cyberpunk">Neón Contrastado Bicolor (Azul & Magenta)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6. PIPELINE EXECUTION BAR: DUAL ACTIONS & PROGRESS */}
      <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Auto advance toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-300">
              Avanzar automáticamente a la siguiente etapa al terminar
            </span>
          </label>

          {/* DUAL BUTTON ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Action 1: Solo Generar Prompts (Modo Rápido / Manual) */}
            <button
              type="button"
              onClick={() => executeGeneration('prompts_only')}
              disabled={isProcessingPipeline || !scriptText.trim()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#121622] hover:bg-[#1a2133] border border-white/10 hover:border-white/20 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Solo Generar Prompts (Modo Manual)</span>
            </button>

            {/* Action 2: MODO AUTOMÁTICO TOTAL (1-CLICK PIPELINE) */}
            <button
              type="button"
              onClick={() => executeGeneration('full_auto')}
              disabled={isProcessingPipeline || !scriptText.trim()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-black font-black text-xs flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all active:scale-95 disabled:opacity-40"
            >
              {isProcessingPipeline ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Procesando Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>MODO AUTOMÁTICO TOTAL (1-CLICK PIPELINE)</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Text Banner */}
        {isProcessingPipeline && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
            <span className="text-xs font-mono font-bold text-emerald-300">
              {pipelineProgressText || 'Ejecutando operaciones neuronales...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterStudioStage;
