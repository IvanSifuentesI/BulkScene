import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Mic, 
  Film, 
  Palette, 
  Settings, 
  Sparkles, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  Smartphone, 
  Monitor, 
  Square,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Rocket,
  FolderOpen,
  Users,
  Zap,
  Lock
} from 'lucide-react';
import { 
  SceneSlot, 
  AspectRatioType, 
  CharacterPersona, 
  StylePreset, 
  ScriptSceneResult 
} from '../types';
import { DEFAULT_STYLES, DEFAULT_CHARACTERS } from '../config/stylePresets';
import { TranscriptionResult } from '../services/audioTranscriptionService';
import Sidebar, { AppStage } from './Sidebar';
import MasterStudioStage from './MasterStudioStage';
import ScriptStage from './ScriptStage';
import AudioStage from './AudioStage';
import ScenesStage from './ScenesStage';
import BulkSceneGenerator from './BulkSceneGenerator';
import CharacterVault from './CharacterVault';
import StyleMatrix from './StyleMatrix';
import SettingsStage from './SettingsStage';
import ReportErrorModal from './ReportErrorModal';
import { 
  isSubscriptionActive, 
  triggerSubscriptionModal, 
  refreshCurrentSubscription,
  getProSubscriptionInfo,
  startSubscriptionHeartbeat,
  ProSubscriptionInfo,
  SKOOL_CHECKOUT_URL
} from '../services/subscriptionService';

// Initial API Keys (loaded dynamically from localStorage / user settings)
const INITIAL_NVIDIA_KEYS: string[] = [];
const INITIAL_GROQ_KEYS: string[] = [];

export const MainApplication: React.FC = () => {
  // Navigation & Layout State
  const [currentStage, setCurrentStage] = useState<AppStage>('guion');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('creador@bulkscene.ai');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTechnicalContext, setReportTechnicalContext] = useState<any>(null);
  const [proInfo, setProInfo] = useState<ProSubscriptionInfo>(() => getProSubscriptionInfo());
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => isSubscriptionActive());

  useEffect(() => {
    const savedEmail = localStorage.getItem('bulkscene_user_email');
    if (savedEmail) {
      setUserEmail(savedEmail);
    }

    // Monitoreo en tiempo real cada 1 minuto
    const unsubscribe = startSubscriptionHeartbeat((info) => {
      setProInfo(info);
      setIsSubscribed(info.isPro);
    });

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ProSubscriptionInfo>;
      const info = custom.detail || getProSubscriptionInfo();
      setProInfo(info);
      setIsSubscribed(info.isPro);
    };

    window.addEventListener('bulkscene_subscription_updated', handleUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('bulkscene_subscription_updated', handleUpdate);
    };
  }, []);

  // API Keys by Category (Persistent in localStorage)
  const [nvidiaKeys, setNvidiaKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bulk_nvidia_api_keys');
      return saved ? JSON.parse(saved) : INITIAL_NVIDIA_KEYS;
    } catch {
      return INITIAL_NVIDIA_KEYS;
    }
  });

  const [groqKeys, setGroqKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bulk_groq_api_keys');
      return saved ? JSON.parse(saved) : INITIAL_GROQ_KEYS;
    } catch {
      return INITIAL_GROQ_KEYS;
    }
  });

  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return localStorage.getItem('bulk_gemini_api_key') || '';
  });

  const [falKey, setFalKey] = useState<string>(() => {
    return localStorage.getItem('bulk_fal_api_key') || '';
  });

  // Project Settings & Aspect Ratio
  const [projectName, setProjectName] = useState<string>('Proyecto_Video_Viral');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [selectedImageModel, setSelectedImageModel] = useState<string>('flux-1-schnell');

  // Pipeline Data Flow
  const [scriptText, setScriptText] = useState<string>('');
  const [masterAudioBlob, setMasterAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [scenes, setScenes] = useState<ScriptSceneResult[]>([]);
  const [slots, setSlots] = useState<SceneSlot[]>([]);

  // Character Bank
  const [characters, setCharacters] = useState<CharacterPersona[]>(() => {
    try {
      const saved = localStorage.getItem('bulk_characters_vault');
      return saved ? JSON.parse(saved) : DEFAULT_CHARACTERS;
    } catch {
      return DEFAULT_CHARACTERS;
    }
  });
  const [activeCharacterId, setActiveCharacterId] = useState<string | undefined>('stickman-beard');

  // Style Matrix
  const [styles, setStyles] = useState<StylePreset[]>(() => {
    try {
      const saved = localStorage.getItem('bulk_styles_matrix');
      return saved ? JSON.parse(saved) : DEFAULT_STYLES;
    } catch {
      return DEFAULT_STYLES;
    }
  });
  const [activeStyleId, setActiveStyleId] = useState<string | undefined>('stickman-doodle');

  // Active object references
  const activeCharacter = characters.find((c) => c.id === activeCharacterId);
  const activeStyle = styles.find((s) => s.id === activeStyleId);

  // Proteger la pestaña de Configuración & APIs si el usuario no cuenta con suscripción
  useEffect(() => {
    if (currentStage === 'ajustes' && !isSubscribed) {
      setCurrentStage('guion');
      triggerSubscriptionModal({ featureName: 'Configuración & APIs', stage: 'Configuración' });
    }
  }, [currentStage, isSubscribed]);

  // Sync Character list to localStorage
  const handleAddCharacter = (newChar: CharacterPersona) => {
    const updated = [newChar, ...characters];
    setCharacters(updated);
    localStorage.setItem('bulk_characters_vault', JSON.stringify(updated));
    setActiveCharacterId(newChar.id);
  };

  const handleDeleteCharacter = (id: string) => {
    const updated = characters.filter((c) => c.id !== id);
    setCharacters(updated);
    localStorage.setItem('bulk_characters_vault', JSON.stringify(updated));
    if (activeCharacterId === id) {
      setActiveCharacterId(undefined);
    }
  };

  // Sync Style list to localStorage
  const handleAddStyle = (newStyle: StylePreset) => {
    const updated = [newStyle, ...styles];
    setStyles(updated);
    localStorage.setItem('bulk_styles_matrix', JSON.stringify(updated));
    setActiveStyleId(newStyle.id);
  };

  const handleDeleteStyle = (id: string) => {
    const updated = styles.filter((s) => s.id !== id);
    setStyles(updated);
    localStorage.setItem('bulk_styles_matrix', JSON.stringify(updated));
    if (activeStyleId === id) {
      setActiveStyleId(undefined);
    }
  };

  // Transition Step 1 -> Step 2 (Audio)
  const handleProceedFromScript = (newScript: string, scriptTitle?: string) => {
    setScriptText(newScript);
    if (scriptTitle) {
      setProjectName(scriptTitle.replace(/[^a-zA-Z0-9_-]/g, '_'));
    }
    setCurrentStage('audio');
  };

  // Transition Step 2 -> Step 3 (Scenes)
  const handleProceedFromAudio = (
    processedScript: string,
    blob: Blob | null,
    duration: number,
    transcription: TranscriptionResult | null
  ) => {
    setScriptText(processedScript);
    setMasterAudioBlob(blob);
    setAudioDuration(duration);
    setTranscriptionResult(transcription);
    setCurrentStage('escenas');
  };

  // Transition Step 3 -> Step 4 (Images)
  const handleProceedFromScenes = (directorScenes: ScriptSceneResult[]) => {
    setScenes(directorScenes);

    // Compile into SceneSlot cards
    const newSlots: SceneSlot[] = directorScenes.map((sc, idx) => {
      const seq = idx + 1;
      const padded = seq.toString().padStart(3, '0');
      
      const basePrompt = sc.visualPromptEn || sc.visualPrompt || sc.promptEn || sc.scriptText || sc.scriptSegment || '';
      let compiled = basePrompt;
      if (activeCharacter?.anchorDescription) {
        compiled = `${activeCharacter.anchorDescription}. ${activeCharacter.clothingAnchor || ''}. ${compiled}`;
      }
      if (activeStyle?.promptModifier) {
        compiled = `${compiled}, ${activeStyle.promptModifier}`;
      }

      return {
        id: `slot-${padded}`,
        sequenceNumber: seq,
        paddedNumber: padded,
        rawPrompt: basePrompt,
        compiledPrompt: compiled.trim(),
        status: 'idle',
        seed: activeCharacter?.defaultSeed || (Math.floor(Math.random() * 900000) + 100000),
      };
    });

    setSlots(newSlots);
    setCurrentStage('imagenes');
  };

  const totalSlotsCount = slots.length;
  const completedSlotsCount = slots.filter((s) => s.status === 'completed').length;

  return (
    <div className="flex h-screen bg-[#050609] text-gray-100 font-sans overflow-hidden">
      {/* 5-Step Pipeline Sidebar */}
      <Sidebar
        currentStage={currentStage}
        setCurrentStage={setCurrentStage}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        totalScenesCount={totalSlotsCount}
        completedScenesCount={completedSlotsCount}
        nvidiaKeysCount={nvidiaKeys.length}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-mesh-dark relative">
        {/* Top Header Bar - Clean Command Bar */}
        <header className="h-16 border-b border-white/[0.04] bg-[#090b10] px-6 flex items-center justify-between shrink-0 z-20">
          {/* Breadcrumb Steps - Segmented Capsule (Orden Consecuente 1 a 6) */}
          <div className="bg-[#111420] p-1 rounded-2xl flex items-center gap-1 shadow-inner overflow-x-auto max-w-full">
            <button
              onClick={() => setCurrentStage('guion')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentStage === 'guion'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Estudio Master</span>
            </button>

            <button
              onClick={() => setCurrentStage('personajes')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentStage === 'personajes'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'text-gray-400 hover:text-purple-300 hover:bg-purple-950/20'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>2. Personajes</span>
            </button>

            <button
              onClick={() => setCurrentStage('estilos')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentStage === 'estilos'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                  : 'text-gray-400 hover:text-amber-300 hover:bg-amber-950/20'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Estilos</span>
            </button>

            <button
              onClick={() => setCurrentStage('audio')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentStage === 'audio'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-950/20'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>4. Audio & Voz</span>
            </button>

            <button
              onClick={() => setCurrentStage('escenas')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentStage === 'escenas'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-indigo-300 hover:bg-indigo-950/20'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>5. Escenas</span>
              {scenes.length > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${currentStage === 'escenas' ? 'bg-black/30 text-white' : 'bg-white/10 text-indigo-300'}`}>
                  {scenes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentStage('imagenes')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentStage === 'imagenes'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>6. Generador</span>
              {totalSlotsCount > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${currentStage === 'imagenes' ? 'bg-black/30 text-black' : 'bg-white/10 text-emerald-400'}`}>
                  {completedSlotsCount}/{totalSlotsCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Header Status Bar */}
          <div className="flex items-center gap-2.5">
            {/* Subscription Status Badge PRO / Urgency Indicator */}
            {proInfo.isPro ? (
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono shadow-inner transition-all ${
                    proInfo.urgency === 'red'
                      ? 'bg-rose-500/15 border-rose-500/35 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                      : proInfo.urgency === 'yellow'
                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  }`}
                  title={`Membresía PRO Activa • ${proInfo.label}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      proInfo.urgency === 'red'
                        ? 'bg-rose-400 animate-pulse'
                        : proInfo.urgency === 'yellow'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-black px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white font-sans tracking-wider">
                    PRO
                  </span>
                  <span className="font-bold text-[11px] hidden sm:inline">{proInfo.label}</span>
                </div>

                {/* Reminder button to renew if expiring soon (yellow/red) */}
                {proInfo.isExpiringSoon && (
                  <a
                    href={SKOOL_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                      proInfo.urgency === 'red'
                        ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    }`}
                    title="Renovar suscripción en Skool para mantener acceso ilimitado"
                  >
                    <span>Renovar</span>
                  </a>
                )}
              </div>
            ) : (
              <button
                onClick={() => triggerSubscriptionModal({ featureName: 'Desbloqueo de Suite Completa', stage: 'Cabecera' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs text-amber-300 font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 animate-pulse"
                title="Suscripción no activa: Desbloquear acceso en Skool"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Activar ($14)</span>
              </button>
            )}

            {/* PC Optimized Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-400 font-mono shadow-inner">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span>Modo PC</span>
            </div>

            {/* Botón Reportar Problema */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all active:scale-95"
              title="¿Ocurrió un error o problema técnico? Notifica al soporte técnico"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Reportar Error</span>
            </button>

            {/* Settings Stage Trigger */}
            <button
              onClick={() => {
                if (!isSubscribed) {
                  triggerSubscriptionModal({ featureName: 'Configuración & APIs', stage: 'Cabecera' });
                  return;
                }
                setCurrentStage('ajustes');
              }}
              className={`p-2.5 rounded-xl transition-all relative ${
                currentStage === 'ajustes'
                  ? 'bg-slate-700 text-white shadow-lg shadow-slate-500/25 border border-slate-500/50'
                  : 'bg-[#111420] text-gray-400 hover:text-white hover:bg-[#161a28] border border-white/5'
              }`}
              title={isSubscribed ? "Configuración & APIs" : "Configuración protegida (Requiere suscripción)"}
            >
              <Settings className="w-4 h-4" />
              {!isSubscribed && (
                <span className="absolute -top-1 -right-1 p-0.5 bg-amber-500 text-black rounded-full shadow-xs">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Stage Content View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="max-w-[1850px] 2xl:max-w-full mx-auto w-full pb-16 px-1 sm:px-2">
            {currentStage === 'guion' && (
              <MasterStudioStage
                groqKeys={groqKeys}
                nvidiaNimKeys={nvidiaKeys}
                geminiKey={geminiKey}
                initialScript={scriptText}
                initialAudioBlob={masterAudioBlob}
                initialAudioDuration={audioDuration}
                initialTranscription={transcriptionResult}
                characters={characters}
                activeCharacterId={activeCharacterId}
                onSelectCharacter={setActiveCharacterId}
                onAddCharacter={handleAddCharacter}
                styles={styles}
                activeStyleId={activeStyleId}
                onSelectStyle={setActiveStyleId}
                onAddStyle={handleAddStyle}
                projectName={projectName}
                setProjectName={setProjectName}
                onProceedToScenes={handleProceedFromScenes}
                onProceedToAudio={handleProceedFromScript}
                onProceedToImages={handleProceedFromScenes}
                onNavigateToSettings={() => setCurrentStage('ajustes')}
              />
            )}

            {currentStage === 'imagenes' && (
              <BulkSceneGenerator
                slots={slots}
                setSlots={setSlots}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                selectedModel={selectedImageModel}
                setSelectedModel={setSelectedImageModel}
                activeCharacter={activeCharacter}
                activeStyle={activeStyle}
                characters={characters}
                activeCharacterId={activeCharacterId}
                onSelectCharacter={setActiveCharacterId}
                styles={styles}
                activeStyleId={activeStyleId}
                onSelectStyle={setActiveStyleId}
                nvidiaKeys={nvidiaKeys}
                geminiKey={geminiKey}
                projectName={projectName}
                setProjectName={setProjectName}
                onNavigateToSettings={() => setCurrentStage('ajustes')}
              />
            )}

            {currentStage === 'personajes' && (
              <CharacterVault
                characters={characters}
                activeCharacterId={activeCharacterId}
                onSelectCharacter={setActiveCharacterId}
                onAddCharacter={handleAddCharacter}
                onDeleteCharacter={handleDeleteCharacter}
              />
            )}

            {currentStage === 'estilos' && (
              <StyleMatrix
                styles={styles}
                activeStyleId={activeStyleId}
                onSelectStyle={setActiveStyleId}
                onAddStyle={handleAddStyle}
                onDeleteStyle={handleDeleteStyle}
              />
            )}

            {currentStage === 'audio' && (
              <AudioStage
                scriptText={scriptText}
                groqKeys={groqKeys}
                onProceedToScenes={handleProceedFromAudio}
              />
            )}

            {currentStage === 'escenas' && (
              <ScenesStage
                scriptText={scriptText}
                audioDuration={audioDuration}
                transcriptionResult={transcriptionResult}
                characters={characters}
                styles={styles}
                activeCharacterId={activeCharacterId}
                activeStyleId={activeStyleId}
                onSelectCharacter={setActiveCharacterId}
                onSelectStyle={setActiveStyleId}
                groqKeys={groqKeys}
                nvidiaNimKeys={nvidiaKeys}
                onProceedToImages={handleProceedFromScenes}
              />
            )}

            {currentStage === 'ajustes' && (
              <SettingsStage
                nvidiaKeys={nvidiaKeys}
                setNvidiaKeys={setNvidiaKeys}
                groqKeys={groqKeys}
                setGroqKeys={setGroqKeys}
                geminiKey={geminiKey}
                setGeminiKey={setGeminiKey}
                falKey={falKey}
                setFalKey={setFalKey}
                characters={characters}
                activeCharacterId={activeCharacterId}
                onSelectCharacter={setActiveCharacterId}
                onAddCharacter={handleAddCharacter}
                onDeleteCharacter={handleDeleteCharacter}
                styles={styles}
                activeStyleId={activeStyleId}
                onSelectStyle={setActiveStyleId}
                onAddStyle={handleAddStyle}
                onDeleteStyle={handleDeleteStyle}
              />
            )}
          </div>
        </div>

        {/* Floating Quick Report Button */}
        <div className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#0e111a]/95 hover:bg-[#161a27] border border-amber-500/40 text-amber-300 shadow-[0_4px_25px_rgba(0,0,0,0.85)] text-xs font-bold transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
            title="¿Algo falló en la generación o en un script? Reporta el problema directamente al soporte"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>¿Problemas? Reportar</span>
          </button>
        </div>

        {/* Modal de Reporte de Errores para el Administrador & Telegram */}
        <ReportErrorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          currentStage={currentStage.toUpperCase()}
          technicalDetails={reportTechnicalContext}
        />
      </main>
    </div>
  );
};

export default MainApplication;
