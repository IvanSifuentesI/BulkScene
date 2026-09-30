import React, { useState, useEffect, useCallback } from 'react';
import { Channel, Voice } from '../types';
import PlusIcon from './icons/PlusIcon';
import { detectLanguage } from '../services/geminiService';
import { SUPPORTED_TTS_LANGUAGES } from '../constants';
import NumberInputWithSteppers from './NumberInputWithSteppers';

interface TtsModalProps {
    isOpen: boolean;
    onClose: () => void;
    scriptText: string;
    channel: Channel;
    voices: Voice[];
    apiKey: string | null;
    onGenerate: (config: {
        voice_id: string;
        language: string;
        speed: number;
        pitch: number;
        volume: number;
        is_clone: boolean;
    }) => void;
    onAddVoice: (voice: Omit<Voice, 'id'>) => void;
}

const TtsModal: React.FC<TtsModalProps> = ({ isOpen, onClose, scriptText, channel, voices, apiKey, onGenerate, onAddVoice }) => {
    const [selectedVoiceId, setSelectedVoiceId] = useState('');
    const [speed, setSpeed] = useState(1.0);
    const [pitch, setPitch] = useState(0);
    const [volume, setVolume] = useState(1.0);
    const [language, setLanguage] = useState('English');
    const [isDetecting, setIsDetecting] = useState(false);

    const [isAddingNewVoice, setIsAddingNewVoice] = useState(false);
    const [newVoiceName, setNewVoiceName] = useState('');
    const [newVoiceServiceId, setNewVoiceServiceId] = useState('');

    const detectScriptLanguage = useCallback(async () => {
        if (!apiKey || !scriptText) return;
        setIsDetecting(true);
        try {
            const lang = await detectLanguage(apiKey, scriptText);
            setLanguage(lang);
        } catch (error) {
            console.error("Failed to detect language:", error);
            setLanguage("English"); // Fallback
        } finally {
            setIsDetecting(false);
        }
    }, [apiKey, scriptText]);

    useEffect(() => {
        if (isOpen) {
            const defaultVoice = channel.ttsVoiceId ? voices.find(v => v.id === channel.ttsVoiceId) : null;
            setSelectedVoiceId(defaultVoice ? defaultVoice.voiceId : '');
            setSpeed(channel.ttsSpeed ?? 1.0);
            setPitch(channel.ttsPitch ?? 0);
            setVolume(channel.ttsVolume ?? 1.0);
            setIsAddingNewVoice(false);
            detectScriptLanguage();
        }
    }, [isOpen, channel, voices, detectScriptLanguage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedVoiceObject = voices.find(v => v.voiceId === selectedVoiceId);
        if (!selectedVoiceObject) {
            alert("Por favor, selecciona una voz válida.");
            return;
        }
        onGenerate({
            voice_id: selectedVoiceId,
            language: language,
            speed,
            pitch,
            volume,
            is_clone: selectedVoiceObject.isClone || false
        });
    };

    const handleAddNewVoice = () => {
        if(newVoiceName.trim() && newVoiceServiceId.trim()){
            onAddVoice({ name: newVoiceName, voiceId: newVoiceServiceId });
            setNewVoiceName('');
            setNewVoiceServiceId('');
            setIsAddingNewVoice(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl transform transition-all overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-violet-400 mb-6">Generar Audio (TTS)</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Guion a Convertir</label>
                        <p className="text-sm bg-slate-900/50 p-3 rounded-lg max-h-40 overflow-y-auto text-slate-400 whitespace-pre-wrap">{scriptText}</p>
                    </div>

                    <div className="border-t border-slate-700 pt-6 space-y-4">
                        <div className="flex items-end gap-4">
                             <div className="flex-grow">
                                <label htmlFor="tts-modal-voice" className="block text-sm font-medium text-slate-300 mb-2">Voz</label>
                                <select id="tts-modal-voice" value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" required>
                                    <option value="" disabled>Selecciona una voz...</option>
                                    {voices.map(v => <option key={v.id} value={v.voiceId}>{v.name}</option>)}
                                </select>
                            </div>
                            <button type="button" onClick={() => setIsAddingNewVoice(!isAddingNewVoice)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-600 hover:bg-slate-500">
                                <PlusIcon className="w-4 h-4" /> {isAddingNewVoice ? 'Cancelar' : 'Añadir Voz'}
                            </button>
                        </div>
                        
                        {isAddingNewVoice && (
                            <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                                <h4 className="font-semibold text-slate-300">Añadir Nueva Voz a la Biblioteca</h4>
                                <input type="text" value={newVoiceName} onChange={e => setNewVoiceName(e.target.value)} placeholder="Nombre (Ej: Narrador Principal)" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm" />
                                <input type="text" value={newVoiceServiceId} onChange={e => setNewVoiceServiceId(e.target.value)} placeholder="ID de la Voz (del servicio TTS)" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm" />
                                <button type="button" onClick={handleAddNewVoice} className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-black hover:bg-teal-400">Guardar Voz</button>
                            </div>
                        )}

                        <div>
                            <label htmlFor="tts-language" className="block text-sm font-medium text-slate-300 mb-2">Idioma</label>
                            {isDetecting ? (
                                <div className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-400">
                                    Detectando idioma...
                                </div>
                            ) : (
                                <select id="tts-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                                    {SUPPORTED_TTS_LANGUAGES.map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <NumberInputWithSteppers
                                label="Velocidad"
                                value={speed}
                                onChange={setSpeed}
                                min={0.5} max={2.0} step={0.01} precision={2}
                            />
                            <NumberInputWithSteppers
                                label="Tono"
                                value={pitch}
                                onChange={setPitch}
                                min={-12} max={12} step={1} precision={1}
                            />
                            <NumberInputWithSteppers
                                label="Volumen"
                                value={volume}
                                onChange={setVolume}
                                min={0} max={10} step={0.01} precision={2}
                            />
                        </div>

                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors">Cancelar</button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-semibold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                            disabled={isDetecting || !selectedVoiceId}
                        >
                            {isDetecting ? 'Detectando idioma...' : 'Generar Audio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TtsModal;