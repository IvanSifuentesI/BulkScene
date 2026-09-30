
import React, { useState, useRef, useEffect } from 'react';
import { Channel, HistoryEntry, Voice } from '../types';
import PlusIcon from './icons/PlusIcon';
import ChannelIcon from './icons/ChannelIcon';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import UploadIcon from './icons/UploadIcon';
import CloudIcon from './icons/CloudIcon';
import EditIcon from './icons/EditIcon';
import SaveToCloudIcon from './icons/SaveToCloudIcon';
import HistoryIcon from './icons/HistoryIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import NumberInputWithSteppers from './NumberInputWithSteppers';

type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';
type ActiveTab = 'channels' | 'history' | 'voices';

interface ChannelManagerProps {
    channels: Channel[];
    selectedChannelId: string | null;
    syncStatus: SyncStatus;
    onAddChannel: (channel: Omit<Channel, 'id'>) => void;
    onSelectChannel: (channelId: string) => void;
    onDeleteChannel: (channelId: string) => void;
    onImportData: (data: any) => void;
    onUpdateChannel: (channel: Channel) => void;
    onManualSync: () => void;
    isUserLoggedIn: boolean;
    onShowNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    history: HistoryEntry[];
    onLoadFromHistory: (entryId: string) => void;
    onDeleteHistory: (entryId: string) => void;
    voices: Voice[];
    onAddVoice: (voice: Omit<Voice, 'id'>) => void;
    onUpdateVoice: (voice: Voice) => void;
    onDeleteVoice: (voiceId: string) => void;
}

const ChannelModal: React.FC<{
    onClose: () => void;
    onSave: (channel: Omit<Channel, 'id'> | Channel) => void;
    channelToEdit?: Channel | null;
    voices: Voice[];
}> = ({ onClose, onSave, channelToEdit, voices }) => {
    const isEditing = !!channelToEdit;
    const [name, setName] = useState(channelToEdit?.name || '');
    const [style, setStyle] = useState(channelToEdit?.style || '');
    const [instructions, setInstructions] = useState(channelToEdit?.instructions || '');
    const [sceneInstructions, setSceneInstructions] = useState(channelToEdit?.sceneInstructions || '');
    // TTS State
    const [ttsVoiceId, setTtsVoiceId] = useState(channelToEdit?.ttsVoiceId || '');
    const [ttsSpeed, setTtsSpeed] = useState(channelToEdit?.ttsSpeed ?? 1.0);
    const [ttsPitch, setTtsPitch] = useState(channelToEdit?.ttsPitch ?? 0);
    const [ttsVolume, setTtsVolume] = useState(channelToEdit?.ttsVolume ?? 1.0);

    useEffect(() => {
        if (channelToEdit) {
            setName(channelToEdit.name);
            setStyle(channelToEdit.style);
            setInstructions(channelToEdit.instructions);
            setSceneInstructions(channelToEdit.sceneInstructions);
            setTtsVoiceId(channelToEdit.ttsVoiceId || '');
            setTtsSpeed(channelToEdit.ttsSpeed ?? 1.0);
            setTtsPitch(channelToEdit.ttsPitch ?? 0);
            setTtsVolume(channelToEdit.ttsVolume ?? 1.0);
        }
    }, [channelToEdit]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && style.trim() && instructions.trim() && sceneInstructions.trim()) {
            const channelData = {
                name, style, instructions, sceneInstructions,
                ttsVoiceId, ttsSpeed, ttsPitch, ttsVolume,
            };
            if (isEditing) {
                onSave({ ...channelToEdit, ...channelData });
            } else {
                onSave(channelData);
            }
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-violet-400 mb-6">{isEditing ? 'Editar Canal' : 'Crear Nuevo Canal'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Guion Fields */}
                    <div>
                        <label htmlFor="channel-name" className="block text-sm font-medium text-slate-300 mb-2">Nombre del Canal</label>
                        <input id="channel-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: 'Tecno Explicado'" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" required />
                    </div>
                    <div>
                        <label htmlFor="channel-style" className="block text-sm font-medium text-slate-300 mb-2">Estilo del Canal (Voz en Off)</label>
                        <textarea id="channel-style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Ej: 'Energético, informativo y un poco humorístico...'" rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" required />
                    </div>
                    <div>
                        <label htmlFor="channel-instructions" className="block text-sm font-medium text-slate-300 mb-2">Instrucciones Específicas (Guion)</label>
                        <textarea id="channel-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ej: 'Siempre empezar con una pregunta...'" rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" required />
                    </div>
                    <div>
                        <label htmlFor="scene-instructions" className="block text-sm font-medium text-slate-300 mb-2">Instrucciones para Escenas (Estilo Visual)</label>
                        <textarea id="scene-instructions" value={sceneInstructions} onChange={(e) => setSceneInstructions(e.target.value)} placeholder="Ej: 'Estilo hiperrealista, 8K, cinematográfico...'" rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" required />
                    </div>

                    {/* TTS Fields */}
                    <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-lg font-semibold text-slate-300 mb-4">Configuración de Voz (TTS)</h3>
                        <div>
                            <label htmlFor="tts-voice" className="block text-sm font-medium text-slate-300 mb-2">Voz del Canal (por defecto)</label>
                            <select id="tts-voice" value={ttsVoiceId} onChange={(e) => setTtsVoiceId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                                <option value="">Ninguna</option>
                                {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <NumberInputWithSteppers
                                label="Velocidad"
                                value={ttsSpeed}
                                onChange={setTtsSpeed}
                                min={0.5} max={2.0} step={0.01} precision={2}
                            />
                            <NumberInputWithSteppers
                                label="Tono"
                                value={ttsPitch}
                                onChange={setTtsPitch}
                                min={-12} max={12} step={1} precision={1}
                            />
                            <NumberInputWithSteppers
                                label="Volumen"
                                value={ttsVolume}
                                onChange={setTtsVolume}
                                min={0} max={10} step={0.01} precision={2}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-semibold transition-colors">{isEditing ? 'Guardar Cambios' : 'Crear Canal'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const VoiceModal: React.FC<{
    onClose: () => void;
    onSave: (voice: Omit<Voice, 'id'> | Voice) => void;
    voiceToEdit?: Voice | null;
}> = ({ onClose, onSave, voiceToEdit }) => {
    const isEditing = !!voiceToEdit;
    const [name, setName] = useState(voiceToEdit?.name || '');
    const [voiceId, setVoiceId] = useState(voiceToEdit?.voiceId || '');
    const [isClone, setIsClone] = useState(voiceToEdit?.isClone || false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && voiceId.trim()) {
            if (isEditing) {
                onSave({ ...voiceToEdit, name, voiceId, isClone });
            } else {
                onSave({ name, voiceId, isClone });
            }
            onClose();
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-violet-400 mb-6">{isEditing ? 'Editar Voz' : 'Añadir Nueva Voz'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="voice-name" className="block text-sm font-medium text-slate-300 mb-2">Nombre (Alias)</label>
                        <input id="voice-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: 'Narrador Principal'" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" required />
                    </div>
                    <div>
                        <label htmlFor="voice-id" className="block text-sm font-medium text-slate-300 mb-2">ID de la Voz (del servicio TTS)</label>
                        <input id="voice-id" type="text" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="Ej: 'voice_id_del_servicio_aqui'" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" required />
                    </div>
                     <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                        <div>
                             <label htmlFor="is-clone" className="font-medium text-slate-300">Voz Clonada</label>
                             <p className="text-xs text-slate-400">Activa esto si la voz es un clon personalizado.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsClone(!isClone)}
                            className={`${isClone ? 'bg-violet-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                            aria-pressed={isClone}
                        >
                            <span className={`${isClone ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                        </button>
                    </div>
                    <div className="flex justify-end space-x-4">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors">Cancelar</button>
                         <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-semibold transition-colors">{isEditing ? 'Guardar Cambios' : 'Añadir Voz'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SyncIndicator: React.FC<{ status: SyncStatus }> = ({ status }) => {
    const getStatusInfo = () => {
        switch (status) {
            case 'synced':
                return { text: 'Sincronizado con Drive', color: 'text-green-400', animation: '' };
            case 'syncing':
                return { text: 'Sincronizando...', color: 'text-amber-400', animation: 'animate-pulse' };
            case 'error':
                return { text: 'Error de Sincronización', color: 'text-red-400', animation: '' };
            case 'local':
            default:
                return { text: 'Guardado localmente', color: 'text-slate-400', animation: '' };
        }
    };

    const { text, color, animation } = getStatusInfo();

    return (
        <div className={`flex items-center gap-1.5 ${animation}`} title={text}>
            <CloudIcon className={`w-4 h-4 ${color}`} />
        </div>
    );
};

const TabButton: React.FC<{label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void;}> = ({label, icon, isActive, onClick}) => (
    <button
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

const ChannelManager: React.FC<ChannelManagerProps> = ({ 
    channels, selectedChannelId, syncStatus, 
    onAddChannel, onUpdateChannel, onSelectChannel, onDeleteChannel, onImportData, onManualSync, 
    isUserLoggedIn, onShowNotification,
    history, onLoadFromHistory, onDeleteHistory,
    voices, onAddVoice, onUpdateVoice, onDeleteVoice
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('channels');

    const handleSaveChannel = (channelData: Omit<Channel, 'id'> | Channel) => {
        if ('id' in channelData) {
            onUpdateChannel(channelData as Channel);
        } else {
            onAddChannel(channelData);
        }
    };
    
    const handleSaveVoice = (voiceData: Omit<Voice, 'id'> | Voice) => {
        if ('id' in voiceData) {
            onUpdateVoice(voiceData as Voice);
        } else {
            onAddVoice(voiceData);
        }
    };

    const handleExport = () => {
        if (channels.length === 0) {
            onShowNotification("No hay canales para exportar.", 'error');
            return;
        }

        const exportedChannels = channels.map(channel => {
            const channelToExport: any = { ...channel };
            if (channel.ttsVoiceId) {
                const voiceDetails = voices.find(v => v.id === channel.ttsVoiceId);
                if (voiceDetails) {
                    channelToExport.ttsVoiceDetails = {
                        id: voiceDetails.id,
                        name: voiceDetails.name,
                        voiceId: voiceDetails.voiceId,
                        isClone: voiceDetails.isClone || false
                    };
                }
            }
            return channelToExport;
        });

        const exportData = { channels: exportedChannels };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `guionista-yt-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onShowNotification("Exportación completada.", 'success');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
    
        reader.onerror = () => {
            onShowNotification('Hubo un error al leer el archivo.', 'error');
        };
    
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("El contenido del archivo no es texto válido.");
                }
                
                const importedData = JSON.parse(text);
                onImportData(importedData);
    
            } catch (error) {
                const message = error instanceof Error ? error.message : "El formato del archivo no es correcto.";
                onShowNotification(`Error de importación: ${message}`, 'error');
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
    
        reader.readAsText(file);
    };

    const getTabTitle = () => {
        switch(activeTab) {
            case 'channels': return 'Tus Canales';
            case 'history': return 'Historial';
            case 'voices': return 'Biblioteca de Voces';
            default: return '';
        }
    }

    return (
        <aside className="w-full md:w-1/4 bg-slate-900/50 p-6 rounded-2xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    {getTabTitle()}
                </h2>
                <SyncIndicator status={syncStatus} />
            </div>

            <div className="flex border-b border-slate-700/50 mb-4">
                <TabButton label="Canales" icon={<ChannelIcon className="w-5 h-5" />} isActive={activeTab === 'channels'} onClick={() => setActiveTab('channels')} />
                <TabButton label="Voces" icon={<MicrophoneIcon className="w-5 h-5" />} isActive={activeTab === 'voices'} onClick={() => setActiveTab('voices')} />
                <TabButton label="Historial" icon={<HistoryIcon className="w-5 h-5" />} isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </div>

            <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                {activeTab === 'channels' && (
                    <>
                        {channels.length === 0 ? (
                            <p className="text-slate-400 text-center py-4">Aún no hay canales. ¡Crea uno para empezar!</p>
                        ) : (
                            channels.map(channel => (
                                <div key={channel.id} className="group relative">
                                    <button
                                        onClick={() => onSelectChannel(channel.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${selectedChannelId === channel.id ? 'bg-violet-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'}`}
                                    >
                                        <p className="font-semibold pr-12">{channel.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{channel.style}</p>
                                    </button>
                                     <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => setEditingChannel(channel)} className="p-1 rounded-full bg-slate-700/50 text-slate-400 hover:bg-blue-500/50 hover:text-white transition-all" aria-label={`Editar canal ${channel.name}`} title="Editar Canal">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                         <button onClick={(e) => { e.stopPropagation(); onDeleteChannel(channel.id); }} className="p-1 rounded-full bg-slate-700/50 text-slate-400 hover:bg-red-500/50 hover:text-white transition-all" aria-label={`Eliminar canal ${channel.name}`} title="Eliminar Canal">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
                {activeTab === 'voices' && (
                     <>
                        {voices.length === 0 ? (
                            <p className="text-slate-400 text-center py-4">Añade voces para usarlas en tus guiones.</p>
                        ) : (
                            voices.map(voice => (
                                <div key={voice.id} className="group relative bg-slate-800 p-3 rounded-lg">
                                    <div className="pr-20">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-200 truncate">{voice.name}</p>
                                            {voice.isClone && <span className="text-xs font-bold text-violet-400 bg-violet-900/50 px-2 py-0.5 rounded-full flex-shrink-0">CLON</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono truncate">ID: {voice.voiceId}</p>
                                    </div>
                                    <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingVoice(voice)} className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-blue-500/50 hover:text-white transition-all" title="Editar Voz">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteVoice(voice.id); }} className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-red-500/50 hover:text-white transition-all" title="Eliminar Voz">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
                {activeTab === 'history' && (
                     <>
                        {history.length === 0 ? (
                            <p className="text-slate-400 text-center py-4">No hay creaciones guardadas. ¡Genera un guion para verlo aquí!</p>
                        ) : (
                            history.map(entry => (
                                <div key={entry.id} className="group relative bg-slate-800 p-3 rounded-lg">
                                    <p className="font-semibold text-slate-200 truncate pr-12" title={entry.topic}>{entry.topic}</p>
                                    <p className="text-xs text-slate-400">
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </p>
                                    <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onLoadFromHistory(entry.id)} className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-green-500/50 hover:text-white transition-all" title="Cargar esta creación">
                                            <UploadIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDeleteHistory(entry.id)} className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-red-500/50 hover:text-white transition-all" title="Eliminar del historial">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
            
            <div className="pt-4 border-t border-slate-700/50">
                {activeTab === 'channels' && (
                    <div className="space-y-2">
                        {isUserLoggedIn && (
                            <button onClick={onManualSync} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold transition-colors" title="Guardar cambios en Google Drive">
                                <SaveToCloudIcon className="w-5 h-5"/>
                                Guardar en Drive
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-sm font-semibold transition-colors" title="Importar Canales desde archivo JSON">
                                <UploadIcon className="w-5 h-5"/>
                                Importar
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                            <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-sm font-semibold transition-colors" title="Exportar Canales y Voces a archivo JSON">
                                <DownloadIcon className="w-5 h-5"/>
                                Exportar
                            </button>
                        </div>
                        <button onClick={() => setIsCreateModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-500 hover:bg-violet-400 text-black font-bold transition-colors">
                            <PlusIcon className="w-5 h-5" />
                            Nuevo Canal
                        </button>
                    </div>
                )}
                 {activeTab === 'voices' && (
                    <button onClick={() => setIsVoiceModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-bold transition-colors">
                        <PlusIcon className="w-5 h-5" />
                        Nueva Voz
                    </button>
                )}
            </div>

            {isCreateModalOpen && <ChannelModal onClose={() => setIsCreateModalOpen(false)} onSave={handleSaveChannel} voices={voices} />}
            {editingChannel && <ChannelModal channelToEdit={editingChannel} onClose={() => setEditingChannel(null)} onSave={handleSaveChannel} voices={voices} />}
            {isVoiceModalOpen && <VoiceModal onClose={() => setIsVoiceModalOpen(false)} onSave={handleSaveVoice} />}
            {editingVoice && <VoiceModal voiceToEdit={editingVoice} onClose={() => setEditingVoice(null)} onSave={handleSaveVoice} />}
        </aside>
    );
};

export default ChannelManager;
