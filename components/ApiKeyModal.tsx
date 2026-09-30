import React, { useState, useCallback, memo } from 'react';
import InfoIcon from './icons/InfoIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import { DEFAULT_NVIDIA_API_KEY } from '../services/nvidiaImageService';
import { DEFAULT_GROQ_API_KEY, DEFAULT_NVIDIA_NIM_API_KEY } from '../services/llmDirectorService';

export interface ApiSettings {
    geminiApiKeys: string[];
    whiskApiKeys?: string[];
    nvidiaApiKey?: string;
    groqApiKey?: string;
    nvidiaNimApiKey?: string;
}

interface ApiKeyModalProps {
    currentGeminiApiKeys: string[];
    currentWhiskApiKeys?: string[];
    currentNvidiaApiKey?: string;
    currentGroqApiKey?: string;
    currentNvidiaNimApiKey?: string;
    onClose: () => void;
    onSave: (settings: ApiSettings) => void;
}

const cleanKey = (key: string): string => {
    if (!key) return '';
    return key.replace(/[^\x21-\x7E]/g, '').trim();
};

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
    currentGeminiApiKeys, 
    currentNvidiaApiKey = DEFAULT_NVIDIA_API_KEY,
    currentGroqApiKey = DEFAULT_GROQ_API_KEY,
    currentNvidiaNimApiKey = DEFAULT_NVIDIA_NIM_API_KEY,
    onClose, 
    onSave 
}) => {
    // Gemini State
    const [geminiApiKeys, setGeminiApiKeys] = useState<string[]>(() => currentGeminiApiKeys || []);
    const [newGeminiKey, setNewGeminiKey] = useState('');
    const [geminiError, setGeminiError] = useState('');

    // NVIDIA FLUX Key
    const [nvidiaKey, setNvidiaKey] = useState(currentNvidiaApiKey || DEFAULT_NVIDIA_API_KEY);
    // Groq Key
    const [groqKey, setGroqKey] = useState(currentGroqApiKey || DEFAULT_GROQ_API_KEY);
    // NVIDIA NIM Key (DeepSeek R1 / Llama)
    const [nvidiaNimKey, setNvidiaNimKey] = useState(currentNvidiaNimApiKey || DEFAULT_NVIDIA_NIM_API_KEY);

    const [activeTab, setActiveTab] = useState<'nvidia' | 'groq' | 'gemini'>('nvidia');

    const handleAddGeminiKey = useCallback(() => {
        setGeminiError('');
        const rawInput = newGeminiKey;
        const cleanedKeys = rawInput.split(/[\n,]+/)
            .map(k => cleanKey(k))
            .filter(k => k.length > 0);

        if (cleanedKeys.length === 0) {
            setGeminiError('La clave no es válida (vacía o caracteres ilegales).');
            return;
        }
        
        const uniqueNewKeys = cleanedKeys.filter(k => !geminiApiKeys.includes(k));
        if (uniqueNewKeys.length === 0) {
             setGeminiError('La clave ya existe en la lista.');
             return;
        }

        setGeminiApiKeys(prev => [...prev, ...uniqueNewKeys]);
        setNewGeminiKey('');
    }, [newGeminiKey, geminiApiKeys]);

    const handleRemoveGeminiKey = useCallback((indexToRemove: number) => {
        setGeminiApiKeys(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            geminiApiKeys: geminiApiKeys,
            whiskApiKeys: [],
            nvidiaApiKey: cleanKey(nvidiaKey),
            groqApiKey: cleanKey(groqKey),
            nvidiaNimApiKey: cleanKey(nvidiaNimKey),
        });
    }, [onSave, geminiApiKeys, nvidiaKey, groqKey, nvidiaNimKey]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-xl transform transition-all overflow-y-auto max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <span>🔑 Claves API & Motores de IA</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Configura tus accesos para NVIDIA FLUX, Groq Llama 3.3, DeepSeek R1 y Gemini.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold p-1">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('nvidia')}
                        className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 ${
                            activeTab === 'nvidia'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        🟢 NVIDIA (FLUX & NIM)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('groq')}
                        className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 ${
                            activeTab === 'groq'
                                ? 'border-amber-500 text-amber-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        ⚡ Groq (Llama 70B)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('gemini')}
                        className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 ${
                            activeTab === 'gemini'
                                ? 'border-violet-500 text-violet-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        ✨ Google Gemini
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} id="settings-form" className="space-y-6">
                    {/* TAB NVIDIA */}
                    {activeTab === 'nvidia' && (
                        <div className="space-y-5">
                            {/* NVIDIA FLUX IMAGE KEY */}
                            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80">
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                        🎨 NVIDIA FLUX Render Engine Key
                                    </h4>
                                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                                        FLUX.1 Schnell / Dev
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mb-3">
                                    Utilizado para generar imágenes fotorrealistas de ultra-alta fidelidad en 4 pasos.
                                </p>
                                <input
                                    type="password"
                                    value={nvidiaKey}
                                    onChange={(e) => setNvidiaKey(e.target.value)}
                                    placeholder="nvapi-..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* NVIDIA NIM DEEPSEEK KEY */}
                            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80">
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5">
                                        🧠 NVIDIA NIM (DeepSeek R1 / Llama)
                                    </h4>
                                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                                        Sin Censura 32B
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mb-3">
                                    Para razonamiento profundo, historias de acción y dirección cinematográfica sin censura.
                                </p>
                                <input
                                    type="password"
                                    value={nvidiaNimKey}
                                    onChange={(e) => setNvidiaNimKey(e.target.value)}
                                    placeholder="nvapi-..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB GROQ */}
                    {activeTab === 'groq' && (
                        <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                    ⚡ Groq Cloud API Key
                                </h4>
                                <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
                                    ~1000 tok/s
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Segmentación y dirección de guiones instantánea con Llama 3.3 70B y auto-reformulación de prompts en milisegundos.
                            </p>
                            <input
                                type="password"
                                value={groqKey}
                                onChange={(e) => setGroqKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                    )}

                    {/* TAB GEMINI */}
                    {activeTab === 'gemini' && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-violet-300">
                                    Pool de Claves Google Gemini
                                </h3>
                                <span className="text-[10px] bg-violet-950 text-violet-300 border border-violet-800 px-2 py-0.5 rounded">
                                    Imagen 3 / Multimodal
                                </span>
                            </div>
                            
                            <div className="space-y-2 max-h-36 overflow-y-auto bg-slate-950 p-2.5 rounded-lg border border-slate-800 mb-3">
                                {geminiApiKeys.map((key, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-md">
                                        <div className="flex-grow flex items-center gap-2 overflow-hidden">
                                            <span className="text-[10px] bg-violet-900 text-violet-200 px-1 rounded font-mono">#{index + 1}</span>
                                            <span className="font-mono text-xs text-slate-300 truncate">
                                                ••••••••••••••••••••••••{key.slice(-4)}
                                            </span>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveGeminiKey(index)} className="p-1 text-slate-500 hover:text-red-400">
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {geminiApiKeys.length === 0 && (
                                    <div className="py-4 text-center text-slate-500 text-xs">
                                        No hay claves de Gemini registradas (opcional si usas NVIDIA FLUX + Groq).
                                    </div>
                                )}
                            </div>

                            <div className="flex items-stretch gap-2">
                                <input
                                    type="password"
                                    value={newGeminiKey}
                                    onChange={(e) => setNewGeminiKey(e.target.value)}
                                    placeholder="Añadir clave de Gemini (AIza...)"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono focus:border-violet-500 focus:outline-none"
                                />
                                <button type="button" onClick={handleAddGeminiKey} className="px-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                                    <PlusIcon className="w-3.5 h-3.5" /> Añadir
                                </button>
                            </div>
                            {geminiError && <p className="text-xs text-red-400 mt-1">{geminiError}</p>}
                        </div>
                    )}
                </form>
                
                <div className="flex justify-end space-x-3 pt-5 border-t border-slate-800 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" form="settings-form" className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg shadow-emerald-900/30 transition-all">
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(ApiKeyModal);
