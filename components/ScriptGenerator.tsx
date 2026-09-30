import React, { useState, useMemo, useEffect, useRef } from 'react';
import MagicIcon from './icons/MagicIcon';
import ListIcon from './icons/ListIcon';
import JsonIcon from './icons/JsonIcon';
import AutoPacingModal from './AutoPacingModal';
import UploadIcon from './icons/UploadIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import ClockIcon from './icons/ClockIcon';
import QuillIcon from './icons/QuillIcon'; 
import ImageIcon from './icons/ImageIcon';
import { AutoPacingConfig } from '../types';
import { DEFAULT_STYLES, AVAILABLE_IMAGE_MODELS, AVAILABLE_SCRIPT_MODELS } from '../config/stylePresets';
import { transcribeAudioWithGroq, TranscriptionResult } from '../services/audioTranscriptionService';

interface ScriptGeneratorProps {
    isLoading: boolean;
    isApiKeySet: boolean;
    onCreateScenes: (prompts: string, aspectRatio: string, extraTimePerScene: number, imageEngine?: string) => void;
    onCreateFromScript: (
        script: string, 
        aspectRatio: string, 
        masterAudioFile: File | null, 
        masterAudioDuration: number | null,
        masterPrompt: string,
        referenceImages: File[],
        imagesPerParagraph: number | 'auto',
        imageEngine?: string,
        scriptEngine?: string,
        characterAnchor?: string,
        targetStyleName?: string,
        targetStyleModifier?: string,
        transcriptionResult?: TranscriptionResult | null
    ) => void;
    generationMode: 'lote' | 'guion';
    autoPacingConfig: AutoPacingConfig;
    setAutoPacingConfig: (config: AutoPacingConfig) => void;
    groqApiKey?: string;
}

const aspectRatios = [
    { label: 'Horizontal (16:9)', value: 'IMAGE_ASPECT_RATIO_LANDSCAPE' },
    { label: 'Vertical (9:16)', value: 'IMAGE_ASPECT_RATIO_PORTRAIT' },
    { label: 'Cuadrado (1:1)', value: 'IMAGE_ASPECT_RATIO_SQUARE' },
];

type InputMode = 'list' | 'json' | 'script';

const TabButton: React.FC<{label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void;}> = ({label, icon, isActive, onClick}) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
            isActive 
            ? 'border-violet-400 text-violet-400' 
            : 'border-transparent text-slate-400 hover:text-white'
        }`}
    >
        {icon}
        {label}
    </button>
);

const PacingOptionButton: React.FC<{ value: number | 'auto', label: string, currentValue: number | 'auto', onClick: (val: number | 'auto') => void }> = ({ value, label, currentValue, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(value)}
        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border ${
            currentValue === value
            ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/50'
            : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
        }`}
    >
        {label}
    </button>
);

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ 
    isLoading, isApiKeySet, onCreateScenes, onCreateFromScript, generationMode,
    autoPacingConfig, setAutoPacingConfig, groqApiKey
}) => {
    const [prompts, setPrompts] = useState('');
    const [aspectRatio, setAspectRatio] = useState(aspectRatios[1].value); // Default to vertical

    // Selected AI engines
    const [imageEngine, setImageEngine] = useState('flux-1-schnell');
    const [scriptEngine, setScriptEngine] = useState('groq-llama-70b');
    const [selectedStyleId, setSelectedStyleId] = useState('cinematic-35mm');
    const [characterAnchor, setCharacterAnchor] = useState('');

    // State for different input modes
    const [inputMode, setInputMode] = useState<InputMode>('script');
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [parsedKeys, setParsedKeys] = useState<string[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    
    const [scriptInput, setScriptInput] = useState('');
    const [masterPrompt, setMasterPrompt] = useState('');
    const [referenceImages, setReferenceImages] = useState<File[]>([]);
    
    const [imagesPerParagraph, setImagesPerParagraph] = useState<number | 'auto'>('auto');
    const [isAutoPacingModalOpen, setIsAutoPacingModalOpen] = useState(false);

    // Master Audio State & Groq Whisper Transcription
    const [masterAudioFile, setMasterAudioFile] = useState<File | null>(null);
    const [masterAudioDuration, setMasterAudioDuration] = useState<number | null>(null);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
    const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (generationMode === 'lote' && inputMode === 'script') {
            setInputMode('list');
        } else if (generationMode === 'guion') {
            setInputMode('script');
        }
    }, [generationMode]);

    const handleModeSwitch = (mode: 'short' | 'long') => {
        if (mode === 'short') {
            setAutoPacingConfig({
                ...autoPacingConfig,
                mode: 'short',
                hookThresholdWords: 50,
                hookMinSeconds: 3.0,
                hookMaxSeconds: 5.0,
                restMinSeconds: 5.0,
                restMaxSeconds: 8.0
            });
        } else {
            setAutoPacingConfig({
                ...autoPacingConfig,
                mode: 'long',
                hookThresholdWords: 100,
                hookMinSeconds: 5.0,
                hookMaxSeconds: 8.0,
                restMinSeconds: 8.0,
                restMaxSeconds: 13.0
            });
        }
    };

    const handleJsonInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setJsonInput(text);
        setParsedKeys([]);
        setSelectedKeys(new Set());

        if (!text.trim()) {
            setJsonError(null);
            return;
        }

        try {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) throw new Error("El JSON debe ser un array de objetos.");
            if (parsed.length === 0) throw new Error("El array JSON no puede estar vacío.");
            if (typeof parsed[0] !== 'object' || parsed[0] === null) {
                throw new Error("Los elementos del array deben ser objetos.");
            }
            const keys = Object.keys(parsed[0]);
            setParsedKeys(keys);
            setJsonError(null);
        } catch (error) {
            setJsonError(error instanceof Error ? error.message : "Formato de JSON inválido.");
        }
    };

    const handleKeySelectionChange = (key: string) => {
        setSelectedKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleTranscribeAudio = async (fileToTranscribe?: File) => {
        const file = fileToTranscribe || masterAudioFile;
        if (!file) return;

        setIsTranscribingAudio(true);
        setTranscriptionError(null);
        try {
            const result = await transcribeAudioWithGroq(file, groqApiKey);
            setTranscriptionResult(result);
            if (result.duration && (!masterAudioDuration || masterAudioDuration === 0)) {
                setMasterAudioDuration(result.duration);
            }
            // Si el campo de guion está vacío, poblar automáticamente con la transcripción
            setScriptInput(prev => prev.trim().length === 0 ? result.text : prev);
        } catch (err: any) {
            console.warn("Groq Whisper aviso:", err?.message || err);
            setTranscriptionError(err?.message || "Error al conectar con Whisper");
        } finally {
            setIsTranscribingAudio(false);
        }
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMasterAudioFile(file);
            setTranscriptionResult(null);
            setTranscriptionError(null);
            const objectUrl = URL.createObjectURL(file);
            if (audioRef.current) {
                audioRef.current.src = objectUrl;
                audioRef.current.onloadedmetadata = () => {
                    setMasterAudioDuration(audioRef.current!.duration);
                };
            }
            // Auto-transcripción en segundo plano para sincronización precisa
            handleTranscribeAudio(file);
        }
    };

    const handleReferenceImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setReferenceImages(prev => [...prev, ...filesArray]);
        }
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    const activeStyle = useMemo(() => {
        return DEFAULT_STYLES.find(s => s.id === selectedStyleId) || DEFAULT_STYLES[1];
    }, [selectedStyleId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || !isApiKeySet) return;
        
        switch (inputMode) {
            case 'list':
                if (!prompts.trim()) return;
                onCreateScenes(prompts, aspectRatio, 0, imageEngine);
                break;
            case 'json':
                if (jsonError || selectedKeys.size === 0) return;
                try {
                    const parsed = JSON.parse(jsonInput);
                    const extractedPrompts = parsed.flatMap((item: Record<string, any>) => 
                        Array.from(selectedKeys).map((key: string) => {
                            const value = item[key];
                            return String(value ?? '').trim();
                        })
                    ).filter((prompt: string) => prompt.length > 0);

                    const finalPrompts = extractedPrompts.join('\n');
                    onCreateScenes(finalPrompts, aspectRatio, 0, imageEngine);
                } catch (error) {
                    setJsonError("Error al procesar el JSON final.");
                }
                break;
            case 'script':
                if (!scriptInput.trim()) return;
                if (masterAudioFile && masterAudioDuration === null) {
                    alert("Por favor, espera a que el audio se procese completamente antes de generar.");
                    return;
                }
                onCreateFromScript(
                    scriptInput, 
                    aspectRatio, 
                    masterAudioFile, 
                    masterAudioDuration, 
                    masterPrompt, 
                    referenceImages,
                    imagesPerParagraph,
                    imageEngine,
                    scriptEngine,
                    characterAnchor,
                    activeStyle.name,
                    activeStyle.promptModifier,
                    transcriptionResult
                );
                break;
        }
    };

    const isSubmitDisabled = useMemo(() => {
        if (isLoading || !isApiKeySet) return true;
        switch (inputMode) {
            case 'list':
                return !prompts.trim();
            case 'json':
                return !!jsonError || selectedKeys.size === 0 || !jsonInput.trim();
            case 'script':
                return !scriptInput.trim();
            default:
                return true;
        }
    }, [isLoading, isApiKeySet, inputMode, prompts, jsonInput, jsonError, selectedKeys, scriptInput]);
    
    const handlePacingClick = (value: number | 'auto') => {
        setImagesPerParagraph(value);
        if (value === 'auto') {
            setIsAutoPacingModalOpen(true);
        }
    };

    return (
        <div className="w-full md:w-1/3 bg-slate-800/50 p-6 rounded-2xl flex flex-col border border-slate-700/60 shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-white">🎬 Director de Producción</h2>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    NVIDIA + Groq
                </span>
            </div>
            <p className="text-slate-400 text-xs mb-5">
                Genera escenas con ritmo quirúrgico (WPS), fotorrealismo en 4 pasos y animación 2.5D directa.
            </p>
            
            {/* Hidden Audio Element for Metadata Extraction */}
            <audio ref={audioRef} className="hidden" />

            {/* SELECCIÓN DE MOTORES DE IA (NVIDIA FLUX & GROQ LLAMA) */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 mb-5 space-y-3">
                <div>
                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                        <span>🎨 Motor de Imagen</span>
                        <span className="text-[10px] text-slate-400 lowercase font-normal">NVIDIA FLUX / Google</span>
                    </label>
                    <select
                        value={imageEngine}
                        onChange={(e) => setImageEngine(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                        {AVAILABLE_IMAGE_MODELS.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name} ({m.badge})
                            </option>
                        ))}
                    </select>
                </div>

                {inputMode === 'script' && (
                    <div>
                        <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                            <span>🧠 Director de Guion</span>
                            <span className="text-[10px] text-slate-400 lowercase font-normal">Groq / NVIDIA NIM</span>
                        </label>
                        <select
                            value={scriptEngine}
                            onChange={(e) => setScriptEngine(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                            {AVAILABLE_SCRIPT_MODELS.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name} - {m.badge}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {generationMode === 'lote' && (
                <div className="flex border-b border-slate-700/50 mb-4">
                    <TabButton label="Lista de Prompts" icon={<ListIcon className="w-5 h-5" />} isActive={inputMode === 'list'} onClick={() => setInputMode('list')} />
                    <TabButton label="Entrada JSON" icon={<JsonIcon className="w-5 h-5" />} isActive={inputMode === 'json'} onClick={() => setInputMode('json')} />
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
                <div className="flex-grow flex flex-col">
                    {inputMode === 'list' && (
                        <>
                            <label htmlFor="prompts-input" className="text-sm font-medium text-slate-300 mb-2">
                                Lista de Prompts (uno por línea)
                            </label>
                            <textarea
                                id="prompts-input"
                                value={prompts}
                                onChange={(e) => setPrompts(e.target.value)}
                                placeholder="Un astronauta montando a caballo en Marte, estilo fotorrealista.&#10;Un bosque mágico de noche con setas brillantes.&#10;Un gato cyberpunk con gafas de neón en una ciudad lluviosa."
                                className="w-full flex-grow bg-slate-900 border border-slate-700 rounded-lg p-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y"
                                rows={10}
                                disabled={isLoading || !isApiKeySet}
                            />
                        </>
                    )}
                    {inputMode === 'script' && (
                        <div className="flex flex-col flex-grow space-y-4">
                            {/* Project Mode Toggle */}
                            <div className="bg-slate-900/50 p-1 rounded-lg border border-slate-700 flex">
                                <button
                                    type="button"
                                    onClick={() => handleModeSwitch('short')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${autoPacingConfig.mode === 'short' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Modo Short (9:16)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleModeSwitch('long')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${autoPacingConfig.mode === 'long' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Modo Largo (16:9)
                                </button>
                            </div>

                            {/* ESTILO VISUAL CINEMATOGRÁFICO */}
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700">
                                <label className="text-xs font-bold text-cyan-300 mb-1.5 block">
                                    🎭 Estilo Visual Predeterminado
                                </label>
                                <select
                                    value={selectedStyleId}
                                    onChange={(e) => setSelectedStyleId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                                >
                                    {DEFAULT_STYLES.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.category})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1 italic">
                                    {activeStyle.description}
                                </p>
                            </div>

                            {/* GUION TEXTO */}
                            <div>
                                <label htmlFor="script-input" className="text-xs font-bold text-slate-300 mb-1.5 block">
                                    1. Guion Completo (Texto a Segmentar)
                                </label>
                                <textarea
                                    id="script-input"
                                    value={scriptInput}
                                    onChange={(e) => setScriptInput(e.target.value)}
                                    placeholder="Pega tu guion aquí. El director de cine segmentará el texto en cortes y prompts cinematográficos para FLUX."
                                    className="w-full h-28 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none resize-y"
                                    disabled={isLoading || !isApiKeySet}
                                />
                            </div>

                            {/* AUDIO MAESTRO */}
                            <div className="bg-violet-900/20 border border-violet-500/30 p-3 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-violet-300 block flex items-center gap-1.5">
                                        <MicrophoneIcon className="w-3.5 h-3.5" />
                                        2. Audio Maestro (Sincronización Exacta Whisper)
                                    </label>
                                    {masterAudioFile && !isTranscribingAudio && (
                                        <button
                                            type="button"
                                            onClick={() => handleTranscribeAudio()}
                                            className="text-[10px] text-violet-400 hover:text-violet-200 underline font-semibold"
                                            title="Re-ejecutar transcripción Whisper para sincronización exacta"
                                        >
                                            {transcriptionResult ? '🔄 Re-Alinear' : '🎙️ Transcribir'}
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudioUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={isLoading || isTranscribingAudio}
                                    />
                                    <div className={`flex items-center justify-center gap-2 p-2.5 border-2 border-dashed rounded-lg transition-all ${masterAudioFile ? 'border-green-500 bg-green-900/20' : 'border-slate-600 bg-slate-800 group-hover:border-violet-500'}`}>
                                        <UploadIcon className={`w-4 h-4 ${masterAudioFile ? 'text-green-400' : 'text-slate-400'}`} />
                                        <div className="text-center">
                                            <p className={`text-xs font-medium ${masterAudioFile ? 'text-green-300' : 'text-slate-300'}`}>
                                                {masterAudioFile ? masterAudioFile.name : 'Sube tu locución (.mp3, .wav)'}
                                            </p>
                                            {masterAudioDuration !== null && (
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    Duración: {masterAudioDuration.toFixed(2)}s
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ESTADO DE TRANSCRIPCIÓN WHISPER */}
                                {isTranscribingAudio && (
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-950/60 border border-violet-500/40 text-[11px] text-violet-300 animate-pulse">
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-violet-400 border-t-transparent" />
                                        <span>Transcribiendo y midiendo pausas con <strong>Groq Whisper v3 Turbo</strong>...</span>
                                    </div>
                                )}

                                {transcriptionResult && !isTranscribingAudio && (
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300">
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Whisper sincronizado: <strong>{transcriptionResult.words.length}</strong> palabras detectadas
                                        </span>
                                        <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded text-emerald-200 font-bold uppercase tracking-wider">
                                            Sync Milimétrico
                                        </span>
                                    </div>
                                )}

                                {transcriptionError && !isTranscribingAudio && (
                                    <p className="text-[10px] text-amber-400 italic">
                                        Nota audio: {transcriptionError} (se usará sincronización por WPS estándar).
                                    </p>
                                )}
                            </div>

                            {/* PROMPT MAESTRO & ANCLAJE DE PERSONAJE */}
                            <div className="bg-slate-900/50 border border-slate-700 p-3.5 rounded-xl space-y-2.5">
                                <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                                    <QuillIcon className="w-3.5 h-3.5" />
                                    3. Anclaje de Personaje & Instrucciones
                                </label>
                                
                                <div>
                                    <input
                                        type="text"
                                        value={characterAnchor}
                                        onChange={(e) => setCharacterAnchor(e.target.value)}
                                        placeholder="Ej: Hombre 30 años, barba corta, chaqueta de cuero negra..."
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Fija el personaje protagonista para que se mantenga idéntico en todas las tomas.</p>
                                </div>

                                <div>
                                    <textarea
                                        id="master-prompt"
                                        value={masterPrompt}
                                        onChange={(e) => setMasterPrompt(e.target.value)}
                                        placeholder="Instrucciones visuales adicionales (iluminación, época, emociones)..."
                                        className="w-full h-14 bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none resize-none placeholder-slate-500"
                                        disabled={isLoading || !isApiKeySet}
                                    />
                                </div>

                                <div>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleReferenceImagesUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            disabled={isLoading}
                                        />
                                        <div className="flex items-center justify-center gap-2 p-1.5 border border-dashed border-slate-600 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                                            <UploadIcon className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[11px] text-slate-400">Subir fotos de referencia (Clonación Forense)</span>
                                        </div>
                                    </div>
                                    
                                    {referenceImages.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {referenceImages.map((file, index) => (
                                                <div key={index} className="relative group w-10 h-10">
                                                    <img 
                                                        src={URL.createObjectURL(file)} 
                                                        alt={`Ref ${index}`} 
                                                        className="w-full h-full object-cover rounded border border-slate-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeReferenceImage(index)}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px]"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* IMÁGENES POR PÁRRAFO / AUTO-PACING */}
                            <div className="bg-slate-900/50 border border-slate-700 p-3 rounded-xl">
                                <label className="text-xs font-bold text-slate-200 mb-2 block flex items-center gap-1.5">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    4. Ritmo de Cortes
                                </label>
                                <div className="flex gap-1.5">
                                    <PacingOptionButton value={1} label="1" currentValue={imagesPerParagraph} onClick={handlePacingClick} />
                                    <PacingOptionButton value={2} label="2" currentValue={imagesPerParagraph} onClick={handlePacingClick} />
                                    <PacingOptionButton value={3} label="3" currentValue={imagesPerParagraph} onClick={handlePacingClick} />
                                    <PacingOptionButton value="auto" label="Auto (IA)" currentValue={imagesPerParagraph} onClick={handlePacingClick} />
                                </div>
                                {imagesPerParagraph === 'auto' && (
                                    <div className="mt-2 p-2 bg-violet-900/20 border border-violet-500/20 rounded text-[11px] text-violet-300">
                                        <p className="font-bold">Regla de Oro: Hook ({autoPacingConfig.hookMinSeconds}-{autoPacingConfig.hookMaxSeconds}s) / Cuerpo ({autoPacingConfig.restMinSeconds}-{autoPacingConfig.restMaxSeconds}s)</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                    {inputMode === 'json' && (
                        <>
                            <label htmlFor="json-input" className="text-sm font-medium text-slate-300 mb-2">
                                Pega tu array JSON aquí
                            </label>
                             <textarea
                                id="json-input"
                                value={jsonInput}
                                onChange={handleJsonInputChange}
                                placeholder='[{"titulo": "un gato astronauta", "descripcion": "flotando en el espacio"}]'
                                className={`w-full flex-grow bg-slate-900 border rounded-lg p-4 focus:ring-2 focus:outline-none resize-y ${jsonError ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-violet-500'}`}
                                rows={8}
                                disabled={isLoading || !isApiKeySet}
                            />
                             {jsonError && <p className="text-xs text-red-400 mt-2">{jsonError}</p>}
                             {parsedKeys.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium text-slate-300 mb-2">Selecciona propiedades</h3>
                                    <div className="space-y-1.5 bg-slate-900/50 p-2.5 rounded-md">
                                        {parsedKeys.map(key => (
                                            <label key={key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedKeys.has(key)}
                                                    onChange={() => handleKeySelectionChange(key)}
                                                    className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-violet-500"
                                                />
                                                {key}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                             )}
                        </>
                    )}

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-300 mb-2 block">
                                Formato de Salida
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {aspectRatios.map(ratio => (
                                    <button
                                        key={ratio.value}
                                        type="button"
                                        onClick={() => setAspectRatio(ratio.value)}
                                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all ${
                                            aspectRatio === ratio.value 
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                        disabled={isLoading || !isApiKeySet}
                                    >
                                        {ratio.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {!isApiKeySet && (
                    <p className="text-xs text-amber-400 mt-3">
                        ⚠️ Configura tus Claves de API en los ajustes (icono de engranaje) para generar.
                    </p>
                )}
                <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-base text-white shadow-xl shadow-emerald-900/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.01]"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generando Escenas...
                        </>
                    ) : (
                        <>
                            <MagicIcon className="w-5 h-5" />
                            Crear Escenas & Prompts
                        </>
                    )}
                </button>
            </form>
            
            <AutoPacingModal 
                isOpen={isAutoPacingModalOpen}
                onClose={() => setIsAutoPacingModalOpen(false)}
                config={autoPacingConfig}
                onSave={setAutoPacingConfig}
            />
        </div>
    );
};

export default ScriptGenerator;
