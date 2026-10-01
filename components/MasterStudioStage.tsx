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
  CheckCheck,
  Globe,
  Lock
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
  detectCinematographyWithAI,
  getAllGeminiKeys,
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
import { 
  AVAILABLE_SCRIPT_MODELS, 
  AVAILABLE_ANALYSIS_MODELS, 
  AVAILABLE_PROMPT_MODELS 
} from '../config/stylePresets';
import { 
  requireSubscription, 
  isSubscriptionActive, 
  triggerSubscriptionModal 
} from '../services/subscriptionService';
import { 
  saveLocalStudioSession, 
  loadLocalStudioSession, 
  saveLocalAudioBlob, 
  getLocalAudioBlob, 
  clearLocalStudioSession 
} from '../services/localStudioSessionService';
import { RotateCcw } from 'lucide-react';

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
  onAddStyle?: (style: StylePreset) => void;

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
  onAddStyle,
  projectName = 'BulkScene_Proyecto_01',
  setProjectName,
  onProceedToScenes,
  onProceedToAudio,
  onProceedToImages,
  onNavigateToSettings
}) => {

  // ────────────────────────────────────────────────────────────────────────────
  // HELPER CENTRALIZADO: Resuelve claves API con fallback a localStorage
  // Garantiza que siempre se tenga la clave disponible aunque el prop llegue vacío
  // ────────────────────────────────────────────────────────────────────────────
  const resolveGroqKey = (): string => {
    // Prop array → primer elemento limpio → localStorage → vacío
    const fromProp = Array.isArray(groqKeys) && groqKeys.length > 0 ? groqKeys[0] : '';
    if (fromProp && fromProp.trim()) return fromProp.trim();
    const fromStorage = localStorage.getItem('bulk_groq_api_keys') || '';
    if (fromStorage.startsWith('[')) {
      try { const parsed = JSON.parse(fromStorage); return Array.isArray(parsed) ? (parsed[0] || '').trim() : fromStorage.trim(); } catch { return fromStorage.trim(); }
    }
    return fromStorage.trim();
  };

  const resolveNvidiaKey = (): string => {
    const fromProp = Array.isArray(nvidiaNimKeys) && nvidiaNimKeys.length > 0 ? nvidiaNimKeys[0] : '';
    if (fromProp && fromProp.trim()) return fromProp.trim();
    const fromStorage = localStorage.getItem('bulk_nvidia_api_keys') || '';
    if (fromStorage.startsWith('[')) {
      try { const parsed = JSON.parse(fromStorage); return Array.isArray(parsed) ? (parsed[0] || '').trim() : fromStorage.trim(); } catch { return fromStorage.trim(); }
    }
    return fromStorage.trim();
  };

  const resolveGeminiKey = (): string => {
    if (geminiKey && geminiKey.trim()) return geminiKey.trim();
    return (localStorage.getItem('bulk_gemini_api_key') || '').trim();
  };


  // Carga inicial de sesión guardada localmente (Zero Supabase)
  const savedSession = useMemo(() => loadLocalStudioSession(), []);

  // 1. Script State
  const [scriptText, setScriptText] = useState<string>(() => {
    return initialScript || savedSession?.scriptText || '';
  });
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.round((wordCount / 140) * 60);

  // Estado de suscripción PRO (para proteger proveedores de IA a usuarios gratuitos)
  const [isPro, setIsPro] = useState<boolean>(() => isSubscriptionActive());

  useEffect(() => {
    const handleSubChange = () => setIsPro(isSubscriptionActive());
    window.addEventListener('bulkscene_subscription_updated', handleSubChange);
    return () => window.removeEventListener('bulkscene_subscription_updated', handleSubChange);
  }, []);

  // 2. LLM Director Engine Selection (Dual: Análisis Profundo + Prompts Escenas)
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_analysis_model') || 'gemini-3.8-flash';
  });

  const [selectedPromptModel, setSelectedPromptModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_prompt_model') || 'gemini-3.5-flash-lite';
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return savedSession?.selectedModel || localStorage.getItem('bulkscene_selected_director_model') || 'gemini-3.8-flash';
  });

  // Claves Gemini en el pool activo
  const geminiPoolCount = useMemo(() => {
    return getAllGeminiKeys().length;
  }, []);

  // 3. Audio & Whisper State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(initialAudioBlob);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(() => {
    return initialAudioDuration || savedSession?.audioDuration || 0;
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [playingBeatIndex, setPlayingBeatIndex] = useState<number | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(() => {
    return initialTranscription || savedSession?.transcription || null;
  });
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [selectedSTTModel, setSelectedSTTModel] = useState<string>(() => {
    return savedSession?.selectedSTTModel || localStorage.getItem('bulkscene_selected_stt_model') || 'groq-whisper-turbo';
  });
  const [transcriptionProgressText, setTranscriptionProgressText] = useState<string>('');
  const [whisperModel, setWhisperModel] = useState<'whisper-large-v3-turbo' | 'whisper-large-v3'>('whisper-large-v3-turbo');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // 4. Project Folder Destination
  const [folderName, setFolderName] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_folder_name') || 'Descargas / Proyecto ZIP';
  });
  const [currentProjectName, setCurrentProjectName] = useState<string>(() => {
    return savedSession?.projectName || projectName;
  });

  // 5. Pacing & Smart Beats Construction (Multi-Rango Inteligente)
  const [isBeatsInspectorOpen, setIsBeatsInspectorOpen] = useState<boolean>(() => {
    return Boolean(savedSession?.transcription?.words?.length);
  });
  const [hookScenesCount, setHookScenesCount] = useState<number>(() => {
    return savedSession?.hookScenesCount ?? 4;
  });
  const [hookDurationSec, setHookDurationSec] = useState<number>(() => {
    return savedSession?.hookDurationSec ?? 1.8;
  });
  const [restDurationSec, setRestDurationSec] = useState<number>(() => {
    return savedSession?.restDurationSec ?? 3.2;
  });
  const [snapToPunctuation, setSnapToPunctuation] = useState<boolean>(() => {
    return savedSession?.snapToPunctuation ?? true;
  });
  const [snapToSilences, setSnapToSilences] = useState<boolean>(() => {
    return savedSession?.snapToSilences ?? true;
  });
  const [showWordsCloud, setShowWordsCloud] = useState<boolean>(false);
  const [sceneDurationRange, setSceneDurationRange] = useState<number>(() => {
    return savedSession?.sceneDurationRange ?? 2.5;
  });
  const [pacingWords, setPacingWords] = useState<number>(() => {
    return savedSession?.pacingWords ?? 8;
  });

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
  const [narrativeMode, setNarrativeMode] = useState<DirectionNarrativeMode>(() => {
    return savedSession?.narrativeMode ?? 'documental_secuencial';
  });

  // 7. Cultural & Temporal Context
  const [culturalContext, setCulturalContext] = useState<CulturalTemporalContext>(() => {
    return savedSession?.culturalContext ?? {
      epoch: '',
      culture: '',
      environment: ''
    };
  });
  const [culturalContextInput, setCulturalContextInput] = useState<string>(() => {
    return savedSession?.culturalContextInput ?? '';
  });
  const [isExtractingContext, setIsExtractingContext] = useState<boolean>(false);

  // 8. Visual Style & Auto-AI
  // styleMode: 'custom' = el usuario escribe manualmente (textarea vacío al inicio),
  //            'auto' = la IA detecta y rellena automáticamente
  const [styleMode, setStyleMode] = useState<'custom' | 'auto'>(() => {
    return (savedSession?.customStyleInstructions ? 'auto' : 'custom') as 'custom' | 'auto';
  });
  const activeStyle = styles.find((s) => s.id === activeStyleId) || null;
  // En modo custom el textarea empieza vacío; en modo auto carga lo guardado
  const [customStyleInstructions, setCustomStyleInstructions] = useState<string>(() => {
    return savedSession?.customStyleInstructions ?? '';
  });
  const [isDetectingStyle, setIsDetectingStyle] = useState<boolean>(false);
  const [detectedStyleReason, setDetectedStyleReason] = useState<string | null>(() => {
    return savedSession?.detectedStyleReason ?? null;
  });
  const [styleSavedToast, setStyleSavedToast] = useState<boolean>(false);

  // 9. Character Vault & Biometric Consistency — Toggle simple: activo = personaje consistente, inactivo = sin personaje
  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const [characterConsistencyEnabled, setCharacterConsistencyEnabled] = useState<boolean>(() => {
    // Activo por defecto si hay un personaje seleccionado en la sesión guardada
    return savedSession?.consistencyMode !== undefined
      ? savedSession.consistencyMode !== 'desactivado'
      : Boolean(savedSession?.activeCharacterId || activeCharacterId);
  });
  const consistencyMode: CharacterConsistencyMode = characterConsistencyEnabled ? 'nombre_en_prompt' : 'nombre_en_prompt';
  const [detectedCharacters, setDetectedCharacters] = useState<ScriptDirectorCharacter[]>(() => {
    return savedSession?.detectedCharacters ?? [];
  });
  const [isDetectingChars, setIsDetectingChars] = useState<boolean>(false);
  const [charSavedToast, setCharSavedToast] = useState<boolean>(false);

  // 10. Optional Content Direction & Framing
  const [cameraPreference, setCameraPreference] = useState<string>(() => {
    return savedSession?.cameraPreference ?? 'variado_dinamico';
  });
  const [lightingPreference, setLightingPreference] = useState<string>(() => {
    return savedSession?.lightingPreference ?? 'volumetrica_cinematica';
  });
  const [isDetectingCinematography, setIsDetectingCinematography] = useState<boolean>(false);
  const [cinematographyReason, setCinematographyReason] = useState<string | null>(() => {
    return savedSession?.cinematographyReason ?? null;
  });

  // 11. Pipeline Automation & Execution States
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [isProcessingPipeline, setIsProcessingPipeline] = useState<boolean>(false);
  const [pipelineProgressText, setPipelineProgressText] = useState<string>('');


  // Handle Model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('bulkscene_selected_director_model', modelId);
  };

  // Restaurar archivo de audio binario desde IndexedDB si no está en memoria
  useEffect(() => {
    if (!audioBlob) {
      getLocalAudioBlob().then((saved) => {
        if (saved && saved.blob) {
          setAudioBlob(saved.blob);
          if (!audioDuration) {
            const tempAudio = new Audio();
            tempAudio.src = URL.createObjectURL(saved.blob);
            tempAudio.onloadedmetadata = () => {
              setAudioDuration(tempAudio.duration);
            };
          }
        }
      });
    }
  }, []);

  // Auto-guardado local instantáneo (Zero Supabase) cada vez que el usuario modifica su avance
  useEffect(() => {
    saveLocalStudioSession({
      scriptText,
      projectName: currentProjectName,
      transcription,
      audioDuration,
      hookScenesCount,
      hookDurationSec,
      restDurationSec,
      snapToPunctuation,
      snapToSilences,
      sceneDurationRange,
      pacingWords,
      narrativeMode,
      culturalContext,
      culturalContextInput,
      customStyleInstructions,
      detectedStyleReason,
      consistencyMode,
      detectedCharacters,
      cameraPreference,
      lightingPreference,
      selectedModel,
      selectedSTTModel,
      activeCharacterId,
      activeStyleId,
      cinematographyReason: cinematographyReason ?? undefined
    } as any);
  }, [
    scriptText,
    currentProjectName,
    transcription,
    audioDuration,
    hookScenesCount,
    hookDurationSec,
    restDurationSec,
    snapToPunctuation,
    snapToSilences,
    sceneDurationRange,
    pacingWords,
    narrativeMode,
    culturalContext,
    culturalContextInput,
    customStyleInstructions,
    detectedStyleReason,
    consistencyMode,
    detectedCharacters,
    cameraPreference,
    lightingPreference,
    selectedModel,
    selectedSTTModel,
    activeCharacterId,
    activeStyleId,
    cinematographyReason
  ]);

  // Reiniciar avance para comenzar un nuevo proyecto desde cero
  const handleResetProject = async () => {
    if (window.confirm('¿Deseas reiniciar y limpiar todo el avance de Estudio Master para empezar un nuevo proyecto?')) {
      await clearLocalStudioSession();
      setScriptText('');
      setTranscription(null);
      setAudioBlob(null);
      setAudioFile(null);
      setAudioUrl(null);
      setAudioDuration(0);
      setDetectedCharacters([]);
      setCulturalContextInput('');
      setCustomStyleInstructions('');
      setIsBeatsInspectorOpen(false);
    }
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
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setAudioBlob(file);

    // Guardar audio binario en IndexedDB local sin tocar Supabase
    await saveLocalAudioBlob(file, file.name);

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
    if (!requireSubscription('Extracción de Beats Fonéticos (Whisper)', '1. Estudio Master')) {
      return;
    }
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

  // AI Auto-Detect Visual Style (análisis COMPLETO del guion)
  const handleAutoDetectStyle = async () => {
    if (!requireSubscription('Creación de Estilos con IA', '1. Estudio Master')) {
      return;
    }
    if (!scriptText.trim()) {
      alert('Pega o escribe un guion primero para analizar el estilo.');
      return;
    }
    setIsDetectingStyle(true);
    setStyleMode('auto');
    try {
      const result = await detectStyleWithAI({
        scriptText,
        styles,
        model: selectedAnalysisModel,
        geminiKey: resolveGeminiKey(),
        nvidiaNimKey: resolveNvidiaKey(),
        groqKey: resolveGroqKey()
      });
      onSelectStyle(result.recommendedStyleId);
      // Usa las instrucciones técnicas personalizadas generadas por la IA (no solo el promptModifier del preset)
      if (result.customInstructions) {
        setCustomStyleInstructions(result.customInstructions);
      } else {
        const matched = styles.find(s => s.id === result.recommendedStyleId);
        if (matched) setCustomStyleInstructions(matched.promptModifier || matched.description);
      }
      setDetectedStyleReason(result.reason);
    } catch (err) {
      console.warn('Fallo en detección de estilo:', err);
      setStyleMode('custom');
    } finally {
      setIsDetectingStyle(false);
    }
  };

  // AI Auto-Detect Cinematography (encuadre + iluminación ideal según el guion COMPLETO)
  const handleAutoDetectCinematography = async () => {
    if (!requireSubscription('Dirección Cinematográfica con IA', '1. Estudio Master')) return;
    if (!scriptText.trim()) {
      alert('Pega o escribe un guion primero para detectar la cinematografía ideal.');
      return;
    }
    setIsDetectingCinematography(true);
    try {
      const result = await detectCinematographyWithAI({
        scriptText,
        model: selectedAnalysisModel,
        geminiKey: resolveGeminiKey(),
        nvidiaNimKey: resolveNvidiaKey(),
        groqKey: resolveGroqKey()
      });
      setCameraPreference(result.cameraPreference);
      setLightingPreference(result.lightingPreference);
      setCinematographyReason(result.reason);
    } catch (err) {
      console.warn('Fallo en detección cinematográfica:', err);
    } finally {
      setIsDetectingCinematography(false);
    }
  };

  // Guardar Estilo Creado en el Banco de Estilos Permanente
  const handleSaveStyleToVault = () => {
    const styleModifier = customStyleInstructions.trim() || activeStyle?.promptModifier || 'cinematic 35mm film photography, 8k';
    const newStyle: StylePreset = {
      id: `style-custom-${Date.now()}`,
      name: activeStyle?.id && activeStyle.id !== 'custom' ? `${activeStyle.name} (Modificado)` : 'Estilo Personalizado Director',
      category: 'Personalizado',
      promptModifier: styleModifier,
      badgeColor: '#f59e0b',
      description: styleModifier.slice(0, 110) + '...'
    };
    if (onAddStyle) {
      onAddStyle(newStyle);
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem('bulk_styles_matrix') || '[]');
        localStorage.setItem('bulk_styles_matrix', JSON.stringify([newStyle, ...existing]));
      } catch {}
    }
    onSelectStyle(newStyle.id);
    setStyleSavedToast(true);
    setTimeout(() => setStyleSavedToast(false), 3000);
  };

  // AI Auto-Extract Cultural & Temporal Context
  const handleAutoExtractContext = async () => {
    if (!requireSubscription('Análisis de Contexto Cultural con IA', '1. Estudio Master')) {
      return;
    }
    if (!scriptText.trim()) {
      alert('Pega o escribe un guion primero para extraer el contexto.');
      return;
    }
    setIsExtractingContext(true);
    try {
      const extracted = await extractCulturalContextWithAI({
        scriptText,
        model: selectedAnalysisModel,
        geminiKey: resolveGeminiKey(),
        nvidiaNimKey: resolveNvidiaKey(),
        groqKey: resolveGroqKey()
      });
      setCulturalContext(extracted);
      const textSummary = [extracted.epoch, extracted.culture, extracted.environment].filter(Boolean).join(' • ');
      setCulturalContextInput(textSummary || extracted.epoch || '');
    } catch (err) {
      console.warn('Fallo en extracción de contexto:', err);
    } finally {
      setIsExtractingContext(false);
    }
  };

  // AI Auto-Detect Characters
  const handleAutoDetectCharacters = async () => {
    if (!requireSubscription('Detección de Personajes con IA', '1. Estudio Master')) {
      return;
    }
    if (!scriptText.trim()) {
      alert('Pega o escribe un guion primero para detectar personajes.');
      return;
    }
    setIsDetectingChars(true);
    try {
      const detected = await detectCharactersWithAI({
        scriptText,
        model: selectedAnalysisModel,
        geminiKey: resolveGeminiKey(),
        nvidiaNimKey: resolveNvidiaKey(),
        groqKey: resolveGroqKey()
      });
      setDetectedCharacters(detected);

      // Si se detectó un protagonista y onAddCharacter existe, asociarlo
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

  // Guardar Personaje en el Banco Permanente
  const handleSaveCharacterToVault = (charToSave?: CharacterPersona | ScriptDirectorCharacter) => {
    const target = charToSave || activeChar || (detectedCharacters.length > 0 ? detectedCharacters[0] : null);
    if (!target) return;

    const newPersona: CharacterPersona = {
      id: (target as any).id || `char-saved-${Date.now()}`,
      name: target.name || 'Protagonista Guardado',
      anchorDescription: target.anchorDescription || 'Consistent character with distinct facial features',
      clothingAnchor: target.clothingAnchor || 'Distinctive costume matching setting',
      defaultSeed: target.defaultSeed || Math.floor(Math.random() * 900000) + 100000,
      createdAt: new Date().toISOString()
    };

    if (onAddCharacter) {
      onAddCharacter(newPersona);
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem('bulk_characters_vault') || '[]');
        localStorage.setItem('bulk_characters_vault', JSON.stringify([newPersona, ...existing]));
      } catch {}
    }
    onSelectCharacter(newPersona.id);
    setCharSavedToast(true);
    setTimeout(() => setCharSavedToast(false), 3000);
  };

  // Core Pipeline Execution
  const executeGeneration = async (mode: 'full_auto' | 'prompts_only') => {
    if (!requireSubscription(mode === 'full_auto' ? 'MODO AUTOMÁTICO TOTAL' : 'Generación de Prompts con IA', '1. Estudio Master')) {
      return;
    }
    if (!scriptText.trim()) {
      alert('Por favor pega o escribe el guion antes de iniciar la generación.');
      return;
    }

    setIsProcessingPipeline(true);
    setPipelineProgressText(mode === 'full_auto' ? 'Iniciando Pipeline Automático Total...' : 'Generando Prompts de Escenas con IA...');

    try {
      // 1. Si es modo total y hay audio sin transcribir, intentar extraer beats fonéticos con Whisper
      if (mode === 'full_auto' && audioBlob && !transcription) {
        setPipelineProgressText('Extrayendo beats fonéticos palabra por palabra con Whisper...');
        try {
          const activeGroqKey = groqKeys[0] || localStorage.getItem('bulk_groq_api_keys') || '';
          const activeNvidiaKey = nvidiaNimKeys[0] || localStorage.getItem('bulk_nvidia_api_keys') || '';
          const activeAssemblyKey = localStorage.getItem('bulk_assembly_api_key') || '';
          const activeDeepgramKey = localStorage.getItem('bulk_deepgram_api_key') || '';

          const res = await transcribeAudioUniversal({
            file: audioBlob,
            modelId: selectedSTTModel,
            groqKey: activeGroqKey,
            nvidiaKey: activeNvidiaKey,
            assemblyKey: activeAssemblyKey,
            deepgramKey: activeDeepgramKey,
            onProgress: (status) => setPipelineProgressText(status)
          });
          setTranscription(res);
          if (res.duration) setAudioDuration(res.duration);
        } catch (whisperErr) {
          console.warn('Aviso Whisper:', whisperErr);
        }
      }

      // 2. Si no se ha configurado contexto temporal y es modo full_auto, auto-extraer con IA real
      let activeContext = { ...culturalContext };
      if (mode === 'full_auto' && !activeContext.epoch && !culturalContextInput.trim()) {
        setPipelineProgressText('Analizando marco temporal y cultural del guion con IA...');
        try {
          activeContext = await extractCulturalContextWithAI({
            scriptText,
            model: selectedAnalysisModel,
            geminiKey: resolveGeminiKey(),
            nvidiaNimKey: resolveNvidiaKey(),
            groqKey: resolveGroqKey()
          });
          setCulturalContext(activeContext);
          const textSummary = [activeContext.epoch, activeContext.culture, activeContext.environment].filter(Boolean).join(' • ');
          setCulturalContextInput(textSummary || activeContext.epoch || '');
        } catch (cErr) {
          console.warn('Aviso Contexto:', cErr);
        }
      }

      // 3. Si no hay personajes y es modo full_auto, auto-detectar con IA real
      let activeProtagonist = activeChar;
      if (mode === 'full_auto' && !activeProtagonist && detectedCharacters.length === 0) {
        setPipelineProgressText('Detectando personajes e identidades biométricas con IA...');
        try {
          const detected = await detectCharactersWithAI({
            scriptText,
            model: selectedAnalysisModel,
            geminiKey: resolveGeminiKey(),
            nvidiaNimKey: resolveNvidiaKey(),
            groqKey: resolveGroqKey()
          });
          setDetectedCharacters(detected);
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
            activeProtagonist = newPersona;
          }
        } catch (charErr) {
          console.warn('Aviso Personajes:', charErr);
        }
      }

      // 4. Preparar directiva de personaje y encuadre
      const charDirective = activeProtagonist
        ? `${activeProtagonist.name}: ${activeProtagonist.anchorDescription}, ${activeProtagonist.clothingAnchor}`
        : (detectedCharacters.length > 0
          ? `${detectedCharacters[0].name}: ${detectedCharacters[0].anchorDescription}, ${detectedCharacters[0].clothingAnchor}`
          : '');

      const styleModifierToUse = customStyleInstructions.trim() || activeStyle?.promptModifier || '';

      setPipelineProgressText('Segmentando guion y construyendo prompts visuales cinematográficos con IA...');

      // 5. Invocar LLM Director con procesamiento por lotes para guiones extensos
      const analysis = await analyzeScriptWithLLM({
        scriptText,
        model: selectedPromptModel,
        groqKey: resolveGroqKey(),
        nvidiaNimKey: nvidiaNimKeys[0] || '',
        geminiKey: resolveGeminiKey(),
        targetStyleName: activeStyle?.name || 'Cinematográfico 35mm Hiperrealista',
        targetStyleModifier: styleModifierToUse,
        characterAnchor: charDirective,
        narrativeMode,
        culturalContext: activeContext,
        characterConsistencyMode: consistencyMode,
        pacingWords,
        precalculatedScenes: calculatedScenes.map(cs => ({ sceneNumber: cs.sceneNumber, text: cs.text, duration: cs.duration })),
        onProgress: (text) => setPipelineProgressText(text)
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Estudio Master
                </h1>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  v3
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dirección automatizada de guion, ritmo fonético y escenas.
              </p>
            </div>
          </div>

          {/* Quick Actions & Sample Selector */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Indicador de persistencia local (Zero Supabase) */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-400 font-mono"
              title="Tu avance, guion, beats y audio se guardan automáticamente en tu navegador local (sin consumir espacio ni cuotas de Supabase)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Avance Guardado</span>
            </div>

            {/* Botón para reiniciar y comenzar proyecto nuevo */}
            <button
              type="button"
              onClick={handleResetProject}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-red-500/15 hover:border-red-500/30 text-slate-400 hover:text-red-300 border border-white/10 text-xs font-semibold transition-all"
              title="Limpiar avance y comenzar un proyecto nuevo desde cero"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Nuevo</span>
            </button>

            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">Ejemplos:</span>
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

        {/* SUB-BAR: DUAL NEURONAL ENGINES (ANALYSIS + PROMPTS), PROJECT & FOLDER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/[0.04]">
          {/* Box 1: Motor de Análisis de Guion & Personajes */}
          <div className="bg-[#07090e] border border-blue-500/25 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 text-sm font-black">
              🧠
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block truncate">
                  1. Análisis Guion
                </label>
                <span className="text-[9px] font-mono text-blue-300 bg-blue-500/20 px-1.5 rounded">
                  {isPro ? 'Profundo' : 'Modo Auto'}
                </span>
              </div>
              {isPro ? (
                <select
                  value={selectedAnalysisModel}
                  onChange={(e) => {
                    setSelectedAnalysisModel(e.target.value);
                    localStorage.setItem('bulkscene_selected_analysis_model', e.target.value);
                  }}
                  className="w-full bg-[#0d111a] border border-blue-500/30 text-white rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-blue-400 truncate cursor-pointer"
                  title="Modelo asignado para analizar el guion completo, personajes invariables, época y estilo visual."
                >
                  {AVAILABLE_ANALYSIS_MODELS.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      #{idx + 1} {m.name} ({m.provider})
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerSubscriptionModal({ featureName: 'Selección Avanzada de Motores de IA', stage: 'Estudio Master' })}
                  className="w-full bg-[#0d111a] border border-blue-500/20 hover:border-blue-500/50 rounded-lg px-2 py-1 flex items-center justify-between transition-all group text-left cursor-pointer"
                  title="Motor calibrado para máxima calidad narrativa. Desbloquea selección manual con PRO."
                >
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    Motor Neuronal Master · Ultra HD
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    <span>PRO</span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Box 2: Motor de Generación de Prompts de Escenas */}
          <div className="bg-[#07090e] border border-emerald-500/25 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 text-sm font-black">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block truncate">
                  2. Prompts Escenas
                </label>
                <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 rounded">
                  {isPro ? 'Masivo' : 'Modo Auto'}
                </span>
              </div>
              {isPro ? (
                <select
                  value={selectedPromptModel}
                  onChange={(e) => {
                    setSelectedPromptModel(e.target.value);
                    localStorage.setItem('bulkscene_selected_prompt_model', e.target.value);
                    handleModelChange(e.target.value);
                  }}
                  className="w-full bg-[#0d111a] border border-emerald-500/30 text-white rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-emerald-400 truncate cursor-pointer"
                  title="Modelo asignado para redactar el prompt fotográfico individual de cada escena."
                >
                  {AVAILABLE_PROMPT_MODELS.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      #{idx + 1} {m.name} ({m.provider})
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerSubscriptionModal({ featureName: 'Selección Avanzada de Motores de IA', stage: 'Estudio Master' })}
                  className="w-full bg-[#0d111a] border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg px-2 py-1 flex items-center justify-between transition-all group text-left cursor-pointer"
                  title="Motor calibrado para generar prompts fotográficos de alta retención. Desbloquea selección manual con PRO."
                >
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    Generador Cinemático Multi-Escena
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    <span>PRO</span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Box 3: Título de Producción */}
          <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold block mb-1 truncate">
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
                className="w-full bg-[#0d111a] border border-purple-500/30 text-white rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Box 4: Carpeta Destino & Estado de Claves */}
          <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Folder className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block truncate">
                  Carpeta ZIP
                </span>
                <span className="text-[11px] text-slate-300 font-medium truncate block" title={folderName}>
                  {folderName}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePickDirectory}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Cambiar</span>
            </button>
          </div>
        </div>

        {/* POOL ROTATOR STATUS STRIP */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 px-1 text-[11px] font-mono text-slate-400 border-t border-white/[0.03]">
          {isPro ? (
            // Vista PRO: Datos técnicos completos y pool de claves
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>Análisis: <strong>{selectedAnalysisModel}</strong></span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Prompts: <strong>{selectedPromptModel}</strong></span>
                </span>
                {geminiPoolCount > 0 ? (
                  <span className="text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    🔄 Pool Gemini: <strong>{geminiPoolCount} clave(s)</strong> (Rotación 429 activa)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateToSettings}
                    className="text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 underline cursor-pointer"
                  >
                    ⚠️ Sin claves Gemini añadidas → Ir a Configuración
                  </button>
                )}
              </div>

              {onNavigateToSettings && (
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="text-slate-400 hover:text-cyan-300 transition-colors text-[10px] underline shrink-0 cursor-pointer"
                >
                  Cambiar orden y claves en Ajustes ➔
                </button>
              )}
            </>
          ) : (
            // Vista Gratuita: Información propietaria protegida, cero nombres de APIs/proveedores
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Motor Neuronal Cloud · <strong>100% Calibrado en Modo Automático</strong></span>
                </span>
                <span className="text-slate-500 text-[10px]">
                  Generación de Prompts Cinemáticos Ilimitados
                </span>
              </div>

              <button
                type="button"
                onClick={() => triggerSubscriptionModal({ featureName: 'Personalización de Modelos y APIs', stage: 'Estudio Master' })}
                className="text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Desbloquear Ajustes Avanzados de IA con PRO ➔</span>
              </button>
            </>
          )}
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
                {isPro ? 'Groq Turbo' : 'Voz a Texto HD'}
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

                  {/* Selector de Motor STT */}
                  {isPro ? (
                    <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>MOTOR VOZ A TEXTO:</span>
                        <span className="text-cyan-400 font-bold">
                          {AVAILABLE_STT_MODELS.find(m => m.id === selectedSTTModel)?.name || 'Whisper Turbo HD'}
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
                  ) : (
                    <div
                      onClick={() => triggerSubscriptionModal({ featureName: 'Selección de Motores de Voz y STT', stage: 'Estudio Master' })}
                      className="pt-2 border-t border-white/[0.06] cursor-pointer group"
                    >
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d111a] border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <div>
                            <div className="text-[11px] font-bold text-slate-200">Motor Voz a Texto HD</div>
                            <div className="text-[9px] text-slate-400 font-mono">Sincronización Fonética Automática</div>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                          <Lock className="w-2.5 h-2.5" />
                          <span>PRO</span>
                        </span>
                      </div>
                    </div>
                  )}

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

      {/* 2.5 GRAN MOCKUP / INSPECTOR DE BEATS FONÉTICOS Y RANGOS MULTI-RITMO (MODAL EMERGENTE) */}
      {isBeatsInspectorOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-[#0b0e17] border-2 border-cyan-500/50 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-[0_0_70px_rgba(6,182,212,0.25)] overflow-hidden">
            {/* HEADER */}
            <div className="p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-[#07090e]">
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
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar Mockup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-cyan-500/20">
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

              {/* Selector de Motor STT */}
              <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Motor de Voz a Texto:</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    {isPro ? AVAILABLE_STT_MODELS.find(m => m.id === selectedSTTModel)?.badge : 'Whisper AI Ultra'}
                  </span>
                </div>
                {isPro ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerSubscriptionModal({ featureName: 'Configuración Avanzada de Motores de Voz', stage: 'Estudio Master - Beats' })}
                    className="w-full p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/20 hover:border-cyan-500/50 text-left flex items-center justify-between transition-all cursor-pointer group"
                    title="Motor fonético calibrado en modo automático. Desbloquea selección manual con PRO."
                  >
                    <div>
                      <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <span>Transcripción Fonética Automática</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Calibrado en ultra alta velocidad con detección milimétrica</div>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      <span>PRO</span>
                    </span>
                  </button>
                )}
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

            </div>

            {/* FOOTER ACTIONS */}
            <div className="p-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-[#07090e]">
              <div className="text-xs text-slate-400 font-mono">
                ✓ <strong className="text-white">{calculatedScenes.length} escenas listas</strong> • Gancho ({hookScenesCount} esc. @ {hookDurationSec}s) • Resto (@ {restDurationSec}s)
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBeatsInspectorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar Mockup
                </button>

                <button
                  type="button"
                  onClick={() => setIsBeatsInspectorOpen(false)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>✓ Aplicar Rangos y Sincronizar Guion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 3. DIRECTION PARAMETERS: NARRATIVE MODE, STYLE & CONTEXT (MATCHING SCREENSHOT) */}
      <div className="space-y-4">
        {/* TOP ROW: 2 CARDS (MODO DE DIRECCION & ESTILO VISUAL) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CARD 1: MODO DE DIRECCION */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-5 space-y-3 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                MODO DE DIRECCION
              </span>
            </div>

            <div className="relative">
              <select
                value={narrativeMode}
                onChange={(e) => setNarrativeMode(e.target.value as DirectionNarrativeMode)}
                className="w-full bg-[#121418] border-2 border-amber-500/70 text-amber-200 font-bold rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] appearance-none cursor-pointer"
              >
                <option value="documental_secuencial" className="bg-[#121418] text-white">
                  Secuencia Historias
                </option>
                <option value="motivacional_conceptual" className="bg-[#121418] text-white">
                  Motivacional / Conceptual
                </option>
                <option value="storytelling_cinematico" className="bg-[#121418] text-white">
                  Storytelling Cinemático
                </option>
                <option value="educativo_viral" className="bg-[#121418] text-white">
                  Educativo / Viral Faceless
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-amber-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

          </div>

          {/* CARD 2: ESTILO VISUAL */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-5 space-y-3 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  ESTILO VISUAL
                </span>
              </div>
              {styleSavedToast && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse font-bold">
                  ✓ Guardado en Banco
                </span>
              )}
            </div>

            {/* Toggle: Personalizado / Automático */}
            <div className="flex bg-[#07090e] rounded-xl p-1 gap-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setStyleMode('custom');
                  // En modo custom no limpiamos lo escrito; solo cambiamos el modo
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  styleMode === 'custom'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✏️ Personalizado
              </button>
              <button
                type="button"
                onClick={handleAutoDetectStyle}
                disabled={isDetectingStyle || !scriptText.trim()}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                  styleMode === 'auto'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isDetectingStyle ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Analizando...
                  </span>
                ) : (
                  '✨ Automático con IA'
                )}
              </button>
            </div>

            {/* Textarea de instrucciones de estilo */}
            {styleMode === 'custom' ? (
              <div className="space-y-1.5">
                <textarea
                  rows={3}
                  value={customStyleInstructions}
                  onChange={(e) => setCustomStyleInstructions(e.target.value)}
                  placeholder="Describe el estilo visual que quieres (ej: fotografía 35mm, colores cálidos dorados, luz de atardecer, ultra realista...)&#10;&#10;💡 O usa el botón «Automático con IA» para que la IA lo detecte del guion."
                  className="w-full bg-[#07090e] border border-white/[0.08] text-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-amber-400 resize-none font-sans leading-relaxed"
                />
                {/* Selector de preset del banco (opcional) */}
                {styles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const matched = styles.find(s => s.id === e.target.value);
                        if (matched) {
                          setCustomStyleInstructions(matched.promptModifier || matched.description);
                          onSelectStyle(matched.id);
                        }
                      }}
                      className="flex-1 bg-[#0d111a] border border-white/[0.08] text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="">📚 Cargar desde el banco de estilos...</option>
                      {styles.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  rows={3}
                  value={customStyleInstructions}
                  onChange={(e) => setCustomStyleInstructions(e.target.value)}
                  placeholder="La IA completará aquí el estilo detectado del guion..."
                  className="w-full bg-[#07090e] border border-cyan-500/30 text-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-cyan-400 resize-none font-sans leading-relaxed"
                />

                {activeStyle && (
                  <p className="text-[10px] text-amber-400/70 font-mono">
                    Preset base: {activeStyle.name}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveStyleToVault}
              disabled={!customStyleInstructions.trim()}
              className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-sm cursor-pointer"
              title="Guardar este estilo en el Banco de Estilos permanente"
            >
              <span>💾 Guardar Estilo en Banco</span>
            </button>
          </div>
        </div>

        {/* BOTTOM CARD: CONTEXTO TEMPORAL/CULTURAL (FULL-WIDTH) */}
        <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                CONTEXTO TEMPORAL/CULTURAL
              </span>
            </div>
            {culturalContext.autoDetected && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                ✓ Detectado por IA
              </span>
            )}
          </div>

          <div className="flex items-stretch gap-3">
            <textarea
              rows={3}
              value={culturalContextInput}
              onChange={(e) => {
                setCulturalContextInput(e.target.value);
                setCulturalContext({
                  epoch: e.target.value,
                  culture: culturalContext.culture,
                  environment: culturalContext.environment
                });
              }}
              placeholder="Ej: Roma imperial, oficina contemporánea o mundo futurista..."
              className="flex-1 bg-[#07090e] border border-white/[0.08] text-slate-200 rounded-2xl p-3.5 text-xs focus:outline-none focus:border-cyan-400 resize-none font-sans leading-relaxed"
            />

            <button
              type="button"
              onClick={handleAutoExtractContext}
              disabled={isExtractingContext || !scriptText.trim()}
              className="w-24 bg-[#0e1219] hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-500/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-cyan-300 transition-all disabled:opacity-40 p-2 shrink-0 cursor-pointer group shadow-inner"
              title="Analizar guion con IA para extraer automáticamente el marco temporal, cultural y ambiental"
            >
              {isExtractingContext ? (
                <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : (
                <Clock className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              )}
              <span className="text-[10px] font-black uppercase tracking-wider">ANALIZAR</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. PERSONAJES — Toggle simple */}
      <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Personajes</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {characterConsistencyEnabled
                  ? 'Activo — Mantiene identidad visual estable entre escenas'
                  : 'Desactivado — Sin personaje fijo en los prompts'}
              </p>
            </div>
          </div>

          {/* Toggle on/off */}
          <button
            type="button"
            onClick={() => setCharacterConsistencyEnabled(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${
              characterConsistencyEnabled ? 'bg-purple-500' : 'bg-white/10'
            }`}
            title={characterConsistencyEnabled ? 'Desactivar consistencia de personaje' : 'Activar consistencia de personaje'}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${
              characterConsistencyEnabled ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Contenido expandido solo cuando está activo */}
        {characterConsistencyEnabled && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
            {/* Botón de detección con IA */}
            <button
              type="button"
              onClick={handleAutoDetectCharacters}
              disabled={isDetectingChars || !scriptText.trim()}
              className="w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isDetectingChars ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analizando guion completo con IA...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>✨ Detectar Personajes con IA (análisis completo)</span>
                </>
              )}
            </button>

            {/* Selector del banco de personajes */}
            {characters.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Del banco de personajes:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectCharacter(undefined)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      !activeCharacterId
                        ? 'bg-slate-600 border-slate-400 text-white'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    Auto (IA detecta)
                  </button>
                  {characters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCharacter(c.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        activeCharacterId === c.id
                          ? 'bg-purple-500 border-purple-400 text-black shadow-md'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:text-white hover:border-purple-500/50'
                      }`}
                    >
                      👤 {c.name}{activeCharacterId === c.id ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ficha del personaje activo o detectado */}
            {(activeChar || detectedCharacters.length > 0) && (
              <div className="bg-[#07090e] border border-purple-500/30 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    {activeChar?.name || detectedCharacters[0]?.name || 'Protagonista detectado'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                      Seed #{activeChar?.defaultSeed || detectedCharacters[0]?.defaultSeed || '—'}
                    </span>
                    {charSavedToast && (
                      <span className="text-[10px] text-emerald-400 animate-pulse font-bold">✓ Guardado</span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-black/30 p-2.5 rounded-xl space-y-1 border border-white/[0.04]">
                  <div><span className="text-purple-400">Rasgos: </span>{activeChar?.anchorDescription || detectedCharacters[0]?.anchorDescription}</div>
                  <div><span className="text-purple-400">Ropa: </span>{activeChar?.clothingAnchor || detectedCharacters[0]?.clothingAnchor}</div>
                </div>
                {detectedCharacters.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-slate-500 w-full">Secundarios:</span>
                    {detectedCharacters.slice(1).map((dc, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                        {dc.name} ({dc.alive ? '✓' : '✗'})
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveCharacterToVault()}
                  className="text-[10px] text-purple-300 hover:text-purple-200 font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all cursor-pointer"
                >
                  💾 Guardar en banco
                </button>
              </div>
            )}

            {/* Estado vacío */}
            {!activeChar && detectedCharacters.length === 0 && (
              <div className="text-center py-4 text-[11px] text-slate-500">
                Usa el botón de arriba para detectar personajes automáticamente con IA, o selecciona uno del banco.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. DIRECCIÓN CINEMATOGRÁFICA */}
      <div className="bg-[#0b0e17] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Dirección Cinematográfica</h3>
          </div>
          <button
            type="button"
            onClick={handleAutoDetectCinematography}
            disabled={isDetectingCinematography || !scriptText.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            {isDetectingCinematography ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /><span>Analizando...</span></>
            ) : (
              <><Sparkles className="w-3 h-3" /><span>✨ IA</span></>
            )}
          </button>
        </div>

        {cinematographyReason && (
          <p className="text-[10px] text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20 leading-relaxed">
            💡 {cinematographyReason}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
              📷 Encuadre:
            </label>
            <select
              value={cameraPreference}
              onChange={(e) => { setCameraPreference(e.target.value); setCinematographyReason(null); }}
              className="w-full bg-[#07090e] border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-cyan-400"
            >
              <option value="variado_dinamico">🎥 Variado dinámico</option>
              <option value="primeros_planos">👁️ Primeros planos (emocional)</option>
              <option value="gran_plano_general">🌄 Gran plano general (épico)</option>
              <option value="camara_en_mano">🤝 Cámara en mano (documental)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
              💡 Iluminación:
            </label>
            <select
              value={lightingPreference}
              onChange={(e) => { setLightingPreference(e.target.value); setCinematographyReason(null); }}
              className="w-full bg-[#07090e] border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-cyan-400"
            >
              <option value="volumetrica_cinematica">✨ Volumétrica cinemática</option>
              <option value="hora_dorada">🌅 Hora dorada (cálida)</option>
              <option value="claroscuro_dramatico">🎭 Claroscuro dramático (tensión)</option>
              <option value="neon_cyberpunk">🌆 Neón bicolor (cyberpunk)</option>
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

