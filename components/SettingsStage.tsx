import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Users, 
  Palette, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  Zap, 
  Info,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldAlert,
  DollarSign,
  Copy,
  Terminal,
  RefreshCw,
  Activity,
  Globe,
  Mic,
  Volume2,
  Flame,
  Lock
} from 'lucide-react';
import { CharacterPersona, StylePreset } from '../types';
import { CharacterVault } from './CharacterVault';
import { StyleMatrix } from './StyleMatrix';
import { 
  AVAILABLE_SCRIPT_MODELS, 
  AVAILABLE_ANALYSIS_MODELS, 
  AVAILABLE_PROMPT_MODELS 
} from '../config/stylePresets';
import { 
  AVAILABLE_STT_MODELS, 
  DEFAULT_ASSEMBLY_API_KEY, 
  DEFAULT_DEEPGRAM_API_KEY 
} from '../services/audioTranscriptionService';
import { 
  getPricingConfig, 
  updateRemotePrice, 
  PricingConfig, 
  DEFAULT_PRICING_CONFIG 
} from '../services/pricingService';
import { 
  getStoredErrorReports, 
  clearStoredErrorReports, 
  formatErrorForClipboard, 
  TelemetryErrorReport 
} from '../services/errorTelemetryService';
import { copyAllErrorsForAntigravityAndPurge } from '../services/adminReportingService';
import { isSubscriptionActive } from '../services/subscriptionService';

interface SettingsStageProps {
  nvidiaKeys: string[];
  setNvidiaKeys: (keys: string[]) => void;
  groqKeys: string[];
  setGroqKeys: (keys: string[]) => void;
  geminiKeys: string[];
  setGeminiKeys: (keys: string[]) => void;
  falKey: string;
  setFalKey: (key: string) => void;
  characters: CharacterPersona[];
  activeCharacterId?: string;
  onSelectCharacter: (id?: string) => void;
  onAddCharacter: (character: CharacterPersona) => void;
  onDeleteCharacter: (id: string) => void;
  styles: StylePreset[];
  activeStyleId?: string;
  onSelectStyle: (id?: string) => void;
  onAddStyle: (style: StylePreset) => void;
  onDeleteStyle: (id: string) => void;
}

export const SettingsStage: React.FC<SettingsStageProps> = ({
  nvidiaKeys,
  setNvidiaKeys,
  groqKeys,
  setGroqKeys,
  geminiKeys,
  setGeminiKeys,
  falKey,
  setFalKey,
  characters,
  activeCharacterId,
  onSelectCharacter,
  onAddCharacter,
  onDeleteCharacter,
  styles,
  activeStyleId,
  onSelectStyle,
  onAddStyle,
  onDeleteStyle,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'apis' | 'stt' | 'characters' | 'styles' | 'telemetria'>('apis');
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_analysis_model') || 'gemini-3.8-flash';
  });

  const [selectedPromptModel, setSelectedPromptModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_prompt_model') || 'gemini-3.5-flash-lite';
  });

  const [selectedScriptModel, setSelectedScriptModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_director_model') || 'gemini-3.8-flash';
  });

  const [newNvidiaKey, setNewNvidiaKey] = useState('');
  const [newGroqKey, setNewGroqKey] = useState('');
  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // STT / Voz a Texto State
  const [assemblyKeyInput, setAssemblyKeyInput] = useState<string>(() => {
    return localStorage.getItem('bulk_assembly_api_key') || DEFAULT_ASSEMBLY_API_KEY;
  });
  const [deepgramKeyInput, setDeepgramKeyInput] = useState<string>(() => {
    return localStorage.getItem('bulk_deepgram_api_key') || DEFAULT_DEEPGRAM_API_KEY;
  });
  const [selectedSTTModel, setSelectedSTTModel] = useState<string>(() => {
    return localStorage.getItem('bulkscene_selected_stt_model') || 'groq-whisper-turbo';
  });

  const handleSelectAnalysisModel = (modelId: string) => {
    setSelectedAnalysisModel(modelId);
    localStorage.setItem('bulkscene_selected_analysis_model', modelId);
    triggerSaveNotification(`Motor de Análisis establecido en: ${modelId}`);
  };

  const handleSelectPromptModel = (modelId: string) => {
    setSelectedPromptModel(modelId);
    localStorage.setItem('bulkscene_selected_prompt_model', modelId);
    triggerSaveNotification(`Motor de Prompts establecido en: ${modelId}`);
  };

  const handleSelectScriptModel = (modelId: string) => {
    setSelectedScriptModel(modelId);
    localStorage.setItem('bulkscene_selected_director_model', modelId);
    triggerSaveNotification(`Modelo LLM establecido en: ${modelId}`);
  };

  const handleSaveAssemblyKey = (val: string) => {
    setAssemblyKeyInput(val);
    localStorage.setItem('bulk_assembly_api_key', val.trim());
    triggerSaveNotification('Clave de AssemblyAI guardada correctamente.');
  };

  const handleSaveDeepgramKey = (val: string) => {
    setDeepgramKeyInput(val);
    localStorage.setItem('bulk_deepgram_api_key', val.trim());
    triggerSaveNotification('Clave de Deepgram Nova-3 guardada correctamente.');
  };

  const handleSelectSTTModel = (id: string) => {
    setSelectedSTTModel(id);
    localStorage.setItem('bulkscene_selected_stt_model', id);
    triggerSaveNotification(`Motor de Voz a Texto predeterminado: ${id}`);
  };

  // Pricing State
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [priceInput, setPriceInput] = useState<number>(14);
  const [currencyInput, setCurrencyInput] = useState<string>('USD');
  const [periodInput, setPeriodInput] = useState<string>('/mes');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Telemetry State
  const [errorReports, setErrorReports] = useState<TelemetryErrorReport[]>([]);
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>(() => {
    return localStorage.getItem('bulkscene_telemetry_webhook_url') || '';
  });
  const [copiedBatchToast, setCopiedBatchToast] = useState(false);

  useEffect(() => {
    getPricingConfig().then((cfg) => {
      setPricingConfig(cfg);
      setPriceInput(cfg.price);
      setCurrencyInput(cfg.currency);
      setPeriodInput(cfg.period);
    });
    setErrorReports(getStoredErrorReports());
  }, [activeSubTab]);

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const triggerSaveNotification = (msg: string) => {
    setSaveNotification(msg);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // NVIDIA Key handlers
  const handleAddNvidiaKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNvidiaKey.trim();
    if (!trimmed) return;
    if (nvidiaKeys.includes(trimmed)) {
      triggerSaveNotification('Esta clave de NVIDIA ya existe en la lista.');
      return;
    }
    const updated = [...nvidiaKeys, trimmed];
    setNvidiaKeys(updated);
    localStorage.setItem('bulk_nvidia_api_keys', JSON.stringify(updated));
    setNewNvidiaKey('');
    triggerSaveNotification('Clave de NVIDIA agregada al pool de rotación.');
  };

  const handleRemoveNvidiaKey = (indexToRemove: number) => {
    const updated = nvidiaKeys.filter((_, idx) => idx !== indexToRemove);
    setNvidiaKeys(updated);
    localStorage.setItem('bulk_nvidia_api_keys', JSON.stringify(updated));
    triggerSaveNotification('Clave de NVIDIA eliminada.');
  };

  // Groq Key handlers
  const handleAddGroqKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroqKey.trim();
    if (!trimmed) return;
    if (groqKeys.includes(trimmed)) {
      triggerSaveNotification('Esta clave de Groq ya existe en la lista.');
      return;
    }
    const updated = [...groqKeys, trimmed];
    setGroqKeys(updated);
    localStorage.setItem('bulk_groq_api_keys', JSON.stringify(updated));
    setNewGroqKey('');
    triggerSaveNotification('Clave de Groq guardada.');
  };

  const handleRemoveGroqKey = (indexToRemove: number) => {
    const updated = groqKeys.filter((_, idx) => idx !== indexToRemove);
    setGroqKeys(updated);
    localStorage.setItem('bulk_groq_api_keys', JSON.stringify(updated));
    triggerSaveNotification('Clave de Groq eliminada.');
  };

  // Gemini Handlers (pool de claves, igual que NVIDIA y Groq)
  const handleAddGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGeminiKey.trim();
    if (!trimmed) return;
    if (geminiKeys.includes(trimmed)) {
      triggerSaveNotification('Esa clave Gemini ya existe en el pool.');
      return;
    }
    const updated = [...geminiKeys, trimmed];
    setGeminiKeys(updated);
    localStorage.setItem('bulk_gemini_api_keys', JSON.stringify(updated));
    // Backward compat: también guardar la primera clave como clave singular
    localStorage.setItem('bulk_gemini_api_key', updated[0] || '');
    setNewGeminiKey('');
    triggerSaveNotification(`Clave Gemini #${updated.length} agregada al pool.`);
  };

  const handleRemoveGeminiKey = (idx: number) => {
    const updated = geminiKeys.filter((_, i) => i !== idx);
    setGeminiKeys(updated);
    localStorage.setItem('bulk_gemini_api_keys', JSON.stringify(updated));
    localStorage.setItem('bulk_gemini_api_key', updated[0] || '');
    triggerSaveNotification('Clave Gemini eliminada.');
  };



  // Fal.ai Handler
  const handleSaveFalKey = (value: string) => {
    setFalKey(value);
    localStorage.setItem('bulk_fal_api_key', value.trim());
    triggerSaveNotification('Clave de Fal.ai guardada.');
  };

  // Pricing Handlers
  const handleSavePrice = async () => {
    setIsUpdatingPrice(true);
    const result = await updateRemotePrice(Number(priceInput));
    if (result.success) {
      setPricingConfig((prev) => ({
        ...prev,
        price: Number(priceInput),
        currency: currencyInput.trim().toUpperCase(),
        period: periodInput.trim(),
      }));
      triggerSaveNotification(result.message);
    } else {
      triggerSaveNotification(result.message);
    }
    setIsUpdatingPrice(false);
  };

  // Webhook Handler
  const handleSaveWebhook = (url: string) => {
    setWebhookUrlInput(url);
    if (url.trim()) {
      localStorage.setItem('bulkscene_telemetry_webhook_url', url.trim());
      triggerSaveNotification('Webhook de alertas guardado.');
    } else {
      localStorage.removeItem('bulkscene_telemetry_webhook_url');
      triggerSaveNotification('Webhook eliminado.');
    }
  };

  // Telemetry Actions
  const handleCopyAllErrors = () => {
    const res = copyAllErrorsForAntigravityAndPurge();
    if (res.count === 0) {
      triggerSaveNotification('No hay errores registrados.');
      return;
    }
    setErrorReports([]);
    setCopiedBatchToast(true);
    setTimeout(() => setCopiedBatchToast(false), 3000);
    triggerSaveNotification(`¡${res.count} errores copiados para Antigravity y registro purgado!`);
  };

  const handleClearErrors = () => {
    clearStoredErrorReports();
    setErrorReports([]);
    triggerSaveNotification('Historial de errores purgado.');
  };

  const handleCopySingleError = (report: TelemetryErrorReport) => {
    navigator.clipboard.writeText(formatErrorForClipboard(report));
    triggerSaveNotification(`Reporte ${report.id} copiado al portapapeles.`);
  };

  if (!isSubscriptionActive()) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-16 text-center animate-in fade-in duration-300">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0e111a] border border-amber-500/30 space-y-6 shadow-2xl shadow-black/60 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 shadow-lg shadow-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Configuración y Control de IA Bloqueado
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              El panel de configuración avanzada, gestión de claves y calibración de motores neuronales está reservado exclusivamente para creadores con membresía activa en nuestra Academia.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="https://www.skool.com/ia-automatiza-7412"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-xs shadow-xl shadow-amber-500/25 transition-all uppercase tracking-wider cursor-pointer"
            >
              <span>Desbloquear Membresía en Skool</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Sub-tab Navigation (Segmented Capsule) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex bg-[#08090d] p-1 rounded-2xl gap-1 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab('apis')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'apis'
                ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Claves APIs Generales</span>
            {nvidiaKeys.length > 0 && (
              <span className={`w-2 h-2 rounded-full ${activeSubTab === 'apis' ? 'bg-black' : 'bg-emerald-400'}`} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('stt')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'stt'
                ? 'bg-cyan-500 text-black shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>🎙️ Voz a Texto (Groq • NVIDIA • Assembly • Deepgram)</span>
            <span className={`w-2 h-2 rounded-full ${activeSubTab === 'stt' ? 'bg-black' : 'bg-cyan-400'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('characters')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'characters'
                ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Centro de Personajes ({characters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('styles')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'styles'
                ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Centro de Estilos ({styles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('telemetria')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'telemetria'
                ? 'bg-red-500 text-white shadow-md font-extrabold shadow-red-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Telemetría & Precios Skool</span>
            {errorReports.length > 0 && (
              <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-bold">
                {errorReports.length}
              </span>
            )}
          </button>
        </div>

        {saveNotification && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-medium animate-in fade-in shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span>{saveNotification}</span>
          </div>
        )}
      </div>

      {/* Sub-tab 1: Categorized APIs */}
      {activeSubTab === 'apis' && (
        <div className="space-y-6">
          {/* SELECCIÓN DUAL DE MOTORES NEURONALES (ANÁLISIS + PROMPTS) */}
          <div className="space-y-4">
            {/* 1. MOTOR DE ANÁLISIS PROFUNDO (Guion, Personajes, Época, Estilo) */}
            <div className="bg-[#0e111a] rounded-2xl p-5 space-y-3.5 border border-blue-500/25 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 font-bold shrink-0">
                    🧠
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm flex items-center gap-2 flex-wrap">
                      <span>1. Motor de Análisis Profundo del Guion</span>
                      <span className="text-[10px] font-mono text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                        Por defecto: Gemini 3.8 Flash
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Analiza el guion completo, detecta personajes invariables, época histórica, estilo y cinematografía.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    Activo: <strong>{selectedAnalysisModel}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {AVAILABLE_ANALYSIS_MODELS.map((m, idx) => {
                  const isSelected = selectedAnalysisModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectAnalysisModel(m.id)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/70 text-white shadow-md shadow-blue-500/10'
                          : 'bg-[#08090d] border-white/[0.04] text-slate-400 hover:text-white hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-slate-500">#{idx + 1}</span>
                          <span className="text-xs font-bold text-white truncate">{m.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </div>

                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono mt-1">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] ${isSelected ? 'text-blue-300 bg-blue-500/20' : 'text-slate-400 bg-white/5'}`}>
                          {m.provider}
                        </span>
                        <span className="text-slate-500">{m.quota || m.speed}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. MOTOR DE GENERACIÓN MASIVA DE PROMPTS (Por Escena) */}
            <div className="bg-[#0e111a] rounded-2xl p-5 space-y-3.5 border border-emerald-500/25 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm flex items-center gap-2 flex-wrap">
                      <span>2. Motor de Generación de Prompts de Escenas</span>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        Por defecto: Gemini 3.5 Flash Lite
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Genera los prompts visuales de cada escena a alta velocidad y bajo consumo de cuota.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    Activo: <strong>{selectedPromptModel}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {AVAILABLE_PROMPT_MODELS.map((m, idx) => {
                  const isSelected = selectedPromptModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectPromptModel(m.id)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/70 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-[#08090d] border-white/[0.04] text-slate-400 hover:text-white hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-slate-500">#{idx + 1}</span>
                          <span className="text-xs font-bold text-white truncate">{m.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>

                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono mt-1">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] ${isSelected ? 'text-emerald-300 bg-emerald-500/20' : 'text-slate-400 bg-white/5'}`}>
                          {m.provider}
                        </span>
                        <span className="text-slate-500">{m.quota || m.speed}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PASTILLA DE INFORMACIÓN DE ROTACIÓN & FALLBACK */}
            <div className="bg-[#090b12] border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  <strong>Rotación inteligente activa:</strong> Si una clave de Gemini agota su cuota (429), rota de inmediato a la siguiente clave del pool.
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shrink-0">
                Fallback: Gemini → NVIDIA → Groq
              </span>
            </div>
          </div>

          {/* ACCESO DIRECTO DESTACADO A VOZ A TEXTO */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-[#0e111a] to-emerald-950/30 rounded-2xl p-5 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold shadow-md shadow-cyan-500/20 shrink-0">
                <Mic className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-sm flex items-center gap-2 flex-wrap">
                  <span>Centro de Voz a Texto & Transcripción (STT)</span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                    Groq • NVIDIA • AssemblyAI • Deepgram Nova-3
                  </span>
                </h4>
                
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('stt')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs transition-all shadow-md shadow-cyan-500/20 shrink-0 cursor-pointer flex items-center gap-2"
            >
              <span>Abrir Ajustes de Voz a Texto</span>
              <span>➔</span>
            </button>
          </div>

          {/* CATEGORY 1: NVIDIA */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span>Categoría NVIDIA Cloud / NIM</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold">
                      Unificada & Multi-Clave
                    </span>
                  </h3>
                  
                </div>
              </div>

              <a
                href="https://build.nvidia.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
              >
                <span>Obtener API en build.nvidia.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Pool de Claves NVIDIA (Rotación Automática para Concurrencia Ultra-Rápida)
              </label>

              {nvidiaKeys.map((key, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#08090d] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] font-mono text-slate-500 px-2">#{idx + 1}</span>
                  <input
                    type={showKeys[`nvidia-${idx}`] ? 'text' : 'password'}
                    value={key}
                    readOnly
                    className="flex-1 bg-transparent text-xs text-slate-200 font-mono border-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(`nvidia-${idx}`)}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    {showKeys[`nvidia-${idx}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveNvidiaKey(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400"
                    title="Eliminar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddNvidiaKey} className="flex items-center gap-2 pt-2">
                <input
                  type="password"
                  value={newNvidiaKey}
                  onChange={(e) => setNewNvidiaKey(e.target.value)}
                  placeholder="nvapi-..."
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono border-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Clave</span>
                </button>
              </form>
            </div>
          </div>

          {/* CATEGORY 2: GROQ */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span>Categoría Groq Cloud (Ultra-LPU)</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full font-bold">
                      Transcripción & Subtítulos
                    </span>
                  </h3>
                  
                </div>
              </div>

              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20"
              >
                <span>Obtener API en console.groq.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Pool de Claves Groq
              </label>

              {groqKeys.map((key, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#08090d] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] font-mono text-slate-500 px-2">#{idx + 1}</span>
                  <input
                    type={showKeys[`groq-${idx}`] ? 'text' : 'password'}
                    value={key}
                    readOnly
                    className="flex-1 bg-transparent text-xs text-slate-200 font-mono border-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(`groq-${idx}`)}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    {showKeys[`groq-${idx}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroqKey(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400"
                    title="Eliminar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddGroqKey} className="flex items-center gap-2 pt-2">
                <input
                  type="password"
                  value={newGroqKey}
                  onChange={(e) => setNewGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono border-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Clave</span>
                </button>
              </form>
            </div>
          </div>

          {/* CATEGORY 3: GEMINI */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span>Google Gemini</span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full font-bold">
                      Motor Principal · Pool Rotatorio
                    </span>
                  </h3>
                </div>
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20"
              >
                <span>Obtener API en Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Pool de Claves Gemini (Rotación Automática — cuota agotada → siguiente clave)
              </label>

              {geminiKeys.length === 0 && (
                <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  ⚠ Sin claves Gemini configuradas. Agrega al menos una para usar el motor principal de análisis y generación.
                </p>
              )}

              {geminiKeys.map((key, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#08090d] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] font-mono text-blue-400 px-2">#{idx + 1}</span>
                  <input
                    type={showKeys[`gemini-${idx}`] ? 'text' : 'password'}
                    value={key}
                    readOnly
                    className="flex-1 bg-transparent text-xs text-slate-200 font-mono border-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(`gemini-${idx}`)}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    {showKeys[`gemini-${idx}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveGeminiKey(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400"
                    title="Eliminar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddGeminiKey} className="flex items-center gap-2 pt-2">
                <input
                  type="password"
                  value={newGeminiKey}
                  onChange={(e) => setNewGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono border-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </form>
            </div>
          </div>

          {/* CATEGORY 4: FAL.AI */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span>Categoría Fal.ai (Opcional)</span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full font-bold">
                      Modelos Comunitarios
                    </span>
                  </h3>
                </div>
              </div>

              <a
                href="https://fal.ai/dashboard/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20"
              >
                <span>Consola Fal.ai</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Clave API Fal.ai
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showKeys['fal'] ? 'text' : 'password'}
                  value={falKey}
                  onChange={(e) => handleSaveFalKey(e.target.value)}
                  placeholder="falkey_..."
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono border-none"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('fal')}
                  className="px-3.5 py-2.5 rounded-xl bg-[#08090d] hover:bg-slate-800 text-slate-300 text-xs flex items-center justify-center"
                >
                  {showKeys['fal'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab: VOZ A TEXTO (SPEECH-TO-TEXT / TRANSCRIPCIÓN) */}
      {activeSubTab === 'stt' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* HEADER PRINCIPAL */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 border border-cyan-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span>Centro de Voz a Texto & Transcripción Fonética</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full font-bold">
                      Groq • NVIDIA • AssemblyAI • Deepgram
                    </span>
                  </h3>
                </div>
              </div>
            </div>

            {/* SELECTOR DE MOTOR STT PREDETERMINADO */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Selecciona tu Motor de Voz a Texto Predeterminado:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_STT_MODELS.map((m) => {
                  const isSelected = selectedSTTModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectSTTModel(m.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-md'
                          : 'bg-[#08090d] border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{m.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <span className="text-cyan-400 font-semibold">{m.badge}</span>
                        <span>•</span>
                        <span>Velocidad: {m.speed}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 1. GROQ WHISPER API */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 border border-white/[0.04]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">
                  ⚡
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <span>1. Groq Cloud (Whisper Large V3 & Turbo)</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full font-bold">
                      {groqKeys.length} Claves en Pool
                    </span>
                  </h4>
                  
                </div>
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20"
              >
                <span>Obtener API Groq</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3">
              {groqKeys.map((key, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#08090d] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] font-mono text-slate-500 px-2">#{idx + 1}</span>
                  <input
                    type={showKeys[`stt-groq-${idx}`] ? 'text' : 'password'}
                    value={key}
                    readOnly
                    className="flex-1 bg-transparent text-xs text-slate-200 font-mono border-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(`stt-groq-${idx}`)}
                    className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showKeys[`stt-groq-${idx}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroqKey(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400 cursor-pointer"
                    title="Eliminar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddGroqKey} className="flex items-center gap-2 pt-1">
                <input
                  type="password"
                  value={newGroqKey}
                  onChange={(e) => setNewGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono border-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Clave Groq</span>
                </button>
              </form>
            </div>
          </div>

          {/* 2. NVIDIA NIM ASR API */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 border border-white/[0.04]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">
                  🟢
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <span>2. NVIDIA Cloud / NIM (Whisper & Parakeet 1.1B)</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                      {nvidiaKeys.length} Claves en Pool
                    </span>
                  </h4>
                  
                </div>
              </div>
              <a
                href="https://build.nvidia.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
              >
                <span>Obtener API en build.nvidia.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3">
              {nvidiaKeys.map((key, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#08090d] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] font-mono text-slate-500 px-2">#{idx + 1}</span>
                  <input
                    type={showKeys[`stt-nvidia-${idx}`] ? 'text' : 'password'}
                    value={key}
                    readOnly
                    className="flex-1 bg-transparent text-xs text-slate-200 font-mono border-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(`stt-nvidia-${idx}`)}
                    className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showKeys[`stt-nvidia-${idx}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveNvidiaKey(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400 cursor-pointer"
                    title="Eliminar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddNvidiaKey} className="flex items-center gap-2 pt-1">
                <input
                  type="password"
                  value={newNvidiaKey}
                  onChange={(e) => setNewNvidiaKey(e.target.value)}
                  placeholder="nvapi-..."
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono border-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Clave NVIDIA</span>
                </button>
              </form>
            </div>
          </div>

          {/* 3. ASSEMBLYAI API */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 border border-white/[0.04]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold">
                  💎
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <span>3. AssemblyAI (Conformer-2 con Timestamps & 5GB)</span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full font-bold">
                      ✓ Pre-configurada & Lista
                    </span>
                  </h4>
                  
                </div>
              </div>
              <a
                href="https://www.assemblyai.com/app"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20"
              >
                <span>Consola AssemblyAI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Clave API de AssemblyAI
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showKeys['assembly'] ? 'text' : 'password'}
                  value={assemblyKeyInput}
                  onChange={(e) => handleSaveAssemblyKey(e.target.value)}
                  placeholder="860751f45c4a4bac88bba096aaf2aa0c"
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono border-none"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('assembly')}
                  className="px-3.5 py-2.5 rounded-xl bg-[#08090d] hover:bg-slate-800 text-slate-300 text-xs flex items-center justify-center cursor-pointer"
                >
                  {showKeys['assembly'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Tu clave ha sido configurada y está lista para transcribir y alinear fonéticamente tus historias.
              </p>
            </div>
          </div>

          {/* 4. DEEPGRAM NOVA-3 API */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 border border-white/[0.04]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold">
                  🚀
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <span>4. Deepgram Cloud (Nova-3)</span>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                      ✓ Pre-configurada & Lista
                    </span>
                  </h4>
                  
                </div>
              </div>
              <a
                href="https://console.deepgram.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20"
              >
                <span>Consola Deepgram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Clave API de Deepgram (Nova-3)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showKeys['deepgram'] ? 'text' : 'password'}
                  value={deepgramKeyInput}
                  onChange={(e) => handleSaveDeepgramKey(e.target.value)}
                  placeholder="f6f070d050b62b90ca1b0c9b386e9fbb17cf0476"
                  className="flex-1 bg-[#08090d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono border-none"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('deepgram')}
                  className="px-3.5 py-2.5 rounded-xl bg-[#08090d] hover:bg-slate-800 text-slate-300 text-xs flex items-center justify-center cursor-pointer"
                >
                  {showKeys['deepgram'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Tu clave de Deepgram Nova-3 está guardada y lista para procesar audios a velocidad instantánea.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Character Vault */}
      {activeSubTab === 'characters' && (
        <CharacterVault
          characters={characters}
          activeCharacterId={activeCharacterId}
          onSelectCharacter={onSelectCharacter}
          onAddCharacter={onAddCharacter}
          onDeleteCharacter={onDeleteCharacter}
        />
      )}

      {/* Sub-tab 3: Style Matrix */}
      {activeSubTab === 'styles' && (
        <StyleMatrix
          styles={styles}
          activeStyleId={activeStyleId}
          onSelectStyle={onSelectStyle}
          onAddStyle={onAddStyle}
          onDeleteStyle={onDeleteStyle}
        />
      )}

      {/* Sub-tab 4: Telemetría de Errores & Precios Skool */}
      {activeSubTab === 'telemetria' && (
        <div className="space-y-6 animate-fade-in">
          {/* SECCIÓN 1: CONTROL DE PRECIOS SKOOL EN TIEMPO REAL */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-emerald-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span>Sincronización de Precio de Skool</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold">
                      En Vivo sin Redespliegue
                    </span>
                  </h3>
                </div>
              </div>

              <a
                href={pricingConfig.skoolUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
              >
                <span>Ver Comunidad en Skool</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Monto Mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-bold">$</span>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(Number(e.target.value))}
                    min={1}
                    className="w-full bg-[#08090d] rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Moneda
                </label>
                <input
                  type="text"
                  value={currencyInput}
                  onChange={(e) => setCurrencyInput(e.target.value)}
                  placeholder="USD"
                  className="w-full bg-[#08090d] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Frecuencia / Periodo
                </label>
                <input
                  type="text"
                  value={periodInput}
                  onChange={(e) => setPeriodInput(e.target.value)}
                  placeholder="/mes"
                  className="w-full bg-[#08090d] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Precio actual visible: <strong className="text-emerald-400 font-bold">${pricingConfig.price} {pricingConfig.currency}{pricingConfig.period}</strong>
              </span>

              <button
                type="button"
                onClick={handleSavePrice}
                disabled={isUpdatingPrice}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isUpdatingPrice ? 'Actualizando...' : 'Guardar y Sincronizar en la Web'}</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 2: CONSOLA DE TELEMETRÍA DE ERRORES */}
          <div className="bg-[#0e111a] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-red-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span>Consola de Telemetría & Diagnóstico</span>
                    <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full font-bold">
                      {errorReports.length} Eventos Capturados
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAllErrors}
                  disabled={errorReports.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all disabled:opacity-40"
                  title="Copiar todos los errores con diagnóstico completo para pegarlos en el chat de Antigravity"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{copiedBatchToast ? '¡Copiado y purgado!' : 'Copiar Todo para Antigravity y Limpiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearErrors}
                  disabled={errorReports.length === 0}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-colors disabled:opacity-40"
                  title="Limpiar registro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Webhook Alert Integration */}
            <div className="p-4 rounded-xl bg-[#08090d] border border-white/[0.04] space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                <span>Webhook de Notificación Inmediata (Discord / Telegram / Slack)</span>
                <span className="text-emerald-400 font-normal">Opcional</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/... o webhook de Slack"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleSaveWebhook(webhookUrlInput)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10"
                >
                  Guardar
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Cada vez que un usuario sufra un error de censura o límite de API, se enviará una alerta automática a este canal.
              </p>
            </div>

            {/* List of captured errors */}
            {errorReports.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-1">
                <ShieldCheck className="w-8 h-8 text-emerald-400/50 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Sin incidencias registradas</p>
                <p className="text-[11px] text-slate-600">El pipeline y los motores de inferencia están operando con normalidad.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {errorReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-xl bg-[#08090d] border border-white/[0.06] hover:border-red-500/30 transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                          {report.errorCode}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {report.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          • {new Date(report.timestamp).toLocaleTimeString('es-ES')}
                        </span>
                        {report.contextData?.slotNumber && (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            [Plano #{report.contextData.slotNumber}]
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopySingleError(report)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors shrink-0"
                        title="Copiar diagnóstico individual para soporte"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      <p className="text-slate-300 font-medium">
                        <strong className="text-amber-400 font-semibold">Causa: </strong>
                        {report.possibleCause}
                      </p>
                      <p className="text-emerald-300/90 font-medium">
                        <strong className="text-emerald-400 font-semibold">Solución: </strong>
                        {report.suggestedSolution}
                      </p>
                      {report.contextData?.promptSnippet && (
                        <p className="text-[11px] text-slate-500 font-mono italic truncate bg-black/40 p-1.5 rounded-lg border border-white/[0.04]">
                          Prompt: "{report.contextData.promptSnippet}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsStage;
