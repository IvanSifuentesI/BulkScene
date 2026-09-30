import React, { useState, useEffect } from 'react';
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
  Rocket,
  FolderOpen,
  Users,
  Zap
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
import ScriptStage from './ScriptStage';
import AudioStage from './AudioStage';
import ScenesStage from './ScenesStage';
import BulkSceneGenerator from './BulkSceneGenerator';
import CharacterVault from './CharacterVault';
import StyleMatrix from './StyleMatrix';
import SettingsStage from './SettingsStage';
import LandingPage from './LandingPage';

// Initial API Keys (loaded dynamically from localStorage / user settings)
const INITIAL_NVIDIA_KEYS: string[] = [];
const INITIAL_GROQ_KEYS: string[] = [];

export const MainApplication: React.FC = () => {
  // Navigation & Layout State
  const [currentStage, setCurrentStage] = useState<AppStage>('guion');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('creador@bulkscene.ai');

  useEffect(() => {
    const savedEmail = localStorage.getItem('bulkscene_user_email');
    if (savedEmail) setUserEmail(savedEmail);
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
          {/* Breadcrumb Steps - Segmented Capsule */}
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
              <span>1. Director</span>
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
              <span>2. Generador</span>
              {totalSlotsCount > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${currentStage === 'imagenes' ? 'bg-black/30 text-black' : 'bg-white/10 text-emerald-400'}`}>
                  {completedSlotsCount}/{totalSlotsCount}
                </span>
              )}
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
              <span>Personajes</span>
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
              <span>Estilos</span>
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
              <span>Whisper</span>
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
              <span>Escenas</span>
              {scenes.length > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${currentStage === 'escenas' ? 'bg-black/30 text-white' : 'bg-white/10 text-indigo-300'}`}>
                  {scenes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentStage('showcase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentStage === 'showcase'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-400 hover:text-blue-300 hover:bg-blue-950/20'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 text-blue-400" />
              <span>Landing</span>
            </button>
          </div>

          {/* Right Header Status Bar */}
          <div className="flex items-center gap-3">
            {/* Project Folder Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111420] text-xs text-gray-300 font-mono shadow-inner border border-white/5">
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[150px]">{projectName}</span>
            </div>

            {/* Cluster Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111420] text-xs font-mono text-gray-300 shadow-inner border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-400">NVIDIA Cluster:</span>
              <span className="text-emerald-400 font-bold">{nvidiaKeys.length} Keys</span>
            </div>

            {/* Settings Stage Trigger */}
            <button
              onClick={() => setCurrentStage('ajustes')}
              className={`p-2.5 rounded-xl transition-all ${
                currentStage === 'ajustes'
                  ? 'bg-slate-700 text-white shadow-lg shadow-slate-500/25 border border-slate-500/50'
                  : 'bg-[#111420] text-gray-400 hover:text-white hover:bg-[#161a28] border border-white/5'
              }`}
              title="Ajustes & APIs Categorizadas"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Stage Content View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="max-w-[1600px] mx-auto w-full pb-16">
            {currentStage === 'showcase' && (
              <LandingPage onOpenStudio={() => setCurrentStage('guion')} />
            )}

            {currentStage === 'guion' && (
              <ScriptStage
                groqKeys={groqKeys}
                nvidiaNimKeys={nvidiaKeys}
                initialScript={scriptText}
                characters={characters}
                activeCharacterId={activeCharacterId}
                onSelectCharacter={setActiveCharacterId}
                styles={styles}
                activeStyleId={activeStyleId}
                onSelectStyle={setActiveStyleId}
                onProceedToScenes={handleProceedFromScenes}
                onProceedToAudio={handleProceedFromScript}
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
      </main>
    </div>
  );
};

export default MainApplication;
