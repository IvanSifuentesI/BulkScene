
import React, { useState, useMemo, useRef, memo } from 'react';
import { ScriptOption, Scene, CameraMovement } from '../types';
import MagicIcon from './icons/MagicIcon';
import ImageIcon from './icons/ImageIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import DownloadIcon from './icons/DownloadIcon';
import ExpandIcon from './icons/ExpandIcon';
import InfoIcon from './icons/InfoIcon'; 
import FilmIcon from './icons/FilmIcon';
import ClockIcon from './icons/ClockIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import RefreshIcon from './icons/RefreshIcon';
import HeadphonesIcon from './icons/HeadphonesIcon';
import CheckIcon from './icons/CheckIcon'; // Ensure imported
import GridIcon from './icons/GridIcon';
import ListIcon from './icons/ListIcon';
import { CAMERA_MOVEMENTS } from '../services/clientSideAnimationService';

// Helper to format seconds into MM:SS
const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const sInt = Math.floor(s);
    return `${m.toString().padStart(2, '0')}:${sInt.toString().padStart(2, '0')}`;
};

interface ScriptDisplayProps {
    scriptOptions: ScriptOption[];
    isLoading: boolean;
    error: string;
    apiKey: string | null;
    selectedSceneIds: Set<string>;
    generationProgress: { current: number; total: number } | null;
    // Updated Queue Types
    activeQueues: { 
        images: number; 
        videos: number;
        totalImages: number;
        totalVideos: number;
        activeImageWorkers: number;
        activeVideoWorkers: number;
    };
    hasInterruptedTasks?: boolean;
    onResumeTasks?: () => void;
    isAutoLoopActive?: boolean; // NEW PROP: Indica si estamos en modo Auto-Perfección
    
    onUpdateSceneDescription: (scriptIndex: number, sceneId: string, newDescription: string) => void;
    onRegenerateScene: (scriptIndex: number, sceneId: string) => void;
    onRegenerateSafePrompt: (scriptIndex: number, sceneId: string) => void;
    onGenerateImage: (scriptIndex: number, sceneId: string, aspectRatio: string) => void;
    onAddScene: (scriptIndex: number) => void;
    onDeleteScene: (scriptIndex: number, sceneId: string) => void;
    onDownloadImage: (imageUrl: string, sceneId: string) => void;
    onGenerateAllImages: (scriptIndex: number) => void;
    onViewImage: (imageUrl: string) => void;
    onAnimateScene: (scriptIndex: number, sceneId: string) => void;
    onDownloadVideo: (scriptIndex: number, sceneId: string, sceneIndex: number) => void;
    onDownloadZip: (scriptIndex: number, options: { images: boolean; videos: boolean }) => void;
    onViewVideo: (videoUrl: string) => void;
    onDownloadScriptTxt: (scriptText: string) => void;
    onToggleSceneSelection: (sceneId: string) => void;
    onGenerateSelectedVideos: (scriptIndex: number) => void;
    onGenerateSelectedVideosAuto?: (scriptIndex: number) => void; // New Prop for Auto Loop
    onRetryFailedImages: (scriptIndex: number) => void;
    onRetryFailedPrompts: (scriptIndex: number) => void;
    onRetryInvalidPrompts: (scriptIndex: number) => void;
    onCancel: () => void;
    onClearAll: () => void;
    onCompileVideo: (scriptIndex: number) => void;
    onUpdateCameraMovement: (scriptIndex: number, sceneId: string, movement: CameraMovement) => void;
    onUpdateAllCameraMovements?: (scriptIndex: number, movement: CameraMovement) => void;
    onApplyCameraLoop: (scriptIndex: number, pattern: CameraMovement[]) => void; // Updated Prop
    onUpdateSceneDuration: (scriptIndex: number, sceneId: string, duration: number) => void;
    onUploadSceneAudio: (scriptIndex: number, sceneId: string, file: File) => void;
    onRetryDurationMismatchVideos?: (scriptIndex: number) => void;
    onVerifyVideoDurations?: (scriptIndex: number) => void; // NEW PROP
    onUpscaleScene: (scriptIndex: number, sceneId: string) => void; // NEW 4K UPSCALE
    onUpscaleAllScenes: (scriptIndex: number) => void; // NEW 4K BATCH UPSCALE
    onReformulatePrompt: (scriptIndex: number, sceneId: string) => void; // NEW PROMPT REFORMULATE
}

const ImageGenerationOverlay = memo<{ 
    scene: Scene; 
    scriptIndex: number;
    aspectRatio: string;
    onGenerateImage: (scriptIndex: number, sceneId: string, aspectRatio: string) => void;
}>(({ scene, scriptIndex, aspectRatio, onGenerateImage }) => {
    switch (scene.generationStatus) {
        case 'queued':
            return (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-2">
                    <ClockIcon className="w-6 h-6 text-sky-300 mb-1" />
                    <p className="text-xs font-semibold text-sky-300">En cola</p>
                </div>
            );
        case 'generating':
             return (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
                </div>
            );
        case 'error':
             return (
                <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-center p-2">
                    <InfoIcon className="w-5 h-5 text-red-300 mx-auto mb-1" />
                    <p className="text-xs text-red-300 font-semibold">{scene.generationError}</p>
                    <button
                        onClick={() => onGenerateImage(scriptIndex, scene.id, aspectRatio)}
                        className="mt-1 px-2 py-0.5 text-xs bg-red-500 hover:bg-red-400 rounded"
                    >
                        Reintentar
                    </button>
                </div>
            );
        default:
            return null;
    }
});

ImageGenerationOverlay.displayName = 'ImageGenerationOverlay';

const VideoGenerationOverlay = memo<{ 
    scene: Scene;
    scriptIndex: number;
    onAnimateScene: (scriptIndex: number, sceneId: string) => void;
}>(({ scene, scriptIndex, onAnimateScene }) => {
    switch (scene.videoGenerationStatus) {
        case 'queued':
            return (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-2">
                    <ClockIcon className="w-6 h-6 text-sky-300 mb-1" />
                    <p className="text-xs font-semibold text-sky-300">Video en cola</p>
                </div>
            );
        case 'generating':
             return (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400 mb-2"></div>
                     <p className="text-xs text-white font-semibold">Creando video...</p>
                </div>
            );
        case 'error':
             const isDurationError = scene.generationErrorType === 'duration_mismatch';
             return (
                <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-center p-2 z-20">
                    <InfoIcon className="w-5 h-5 text-white mx-auto mb-1" />
                    <p className="text-xs text-white font-bold uppercase">{isDurationError ? 'Error de Duración' : 'Error'}</p>
                    {isDurationError && (
                        <p className="text-[10px] text-white font-mono mt-1 bg-black/50 px-2 py-1 rounded leading-tight">
                            {scene.videoError?.replace('Duración errónea: ', '')}
                        </p>
                    )}
                     {!isDurationError && <p className="text-[10px] text-red-200">{scene.videoError}</p>}
                    <button 
                        onClick={() => onAnimateScene(scriptIndex, scene.id)}
                        className="mt-2 px-2 py-1 text-xs bg-white text-red-900 font-bold hover:bg-gray-200 rounded shadow-md"
                    >
                        {isDurationError ? 'Reparar' : 'Reintentar'}
                    </button>
                </div>
            );
        default:
            return null;
    }
});

VideoGenerationOverlay.displayName = 'VideoGenerationOverlay';

// --- NEW FANCY MOVEMENT PANEL ---
const GlobalMovementControl = memo<{
    scriptIndex: number;
    onApplyLoop: (idx: number, pattern: CameraMovement[]) => void;
    onApplyFixed: (idx: number, movement: CameraMovement) => void;
    onGenerateVideos: (idx: number) => void;
    onGenerateVideosAuto?: (idx: number) => void;
    isGenerating: boolean;
}>(({ scriptIndex, onApplyLoop, onApplyFixed, onGenerateVideos, onGenerateVideosAuto, isGenerating }) => {
    const [mode, setMode] = useState<'loop' | 'fixed'>('loop');
    const [fixedMovement, setFixedMovement] = useState<CameraMovement>('zoom_in');
    
    // Default Pattern: Zoom In -> Zoom Out -> Pan Right -> Pan Left
    const [loopSlots, setLoopSlots] = useState<CameraMovement[]>(['zoom_in', 'zoom_out', 'pan_right', 'pan_left']);

    const updateLoopSlot = (index: number, value: CameraMovement) => {
        setLoopSlots(prev => {
            const newSlots = [...prev];
            newSlots[index] = value;
            return newSlots;
        });
    };

    return (
        <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/30 rounded-xl border border-violet-500/30 p-4 mb-4 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-600/20 rounded-lg">
                        <FilmIcon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-200">Director de Cámara Global</h4>
                        <p className="text-[10px] text-slate-400">Automatiza los movimientos de todas tus escenas</p>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setMode('loop')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'loop' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Secuenciador (Loop)
                    </button>
                    <button
                        onClick={() => setMode('fixed')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'fixed' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Estilo Fijo
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                {mode === 'loop' ? (
                    <div className="flex-grow flex items-center gap-2 bg-black/20 p-3 rounded-lg border border-slate-700/50 w-full md:w-auto overflow-x-auto">
                        
                        {loopSlots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-cyan-400 font-mono mb-1 font-bold">PASO {index + 1}</span>
                                    <select
                                        value={slot}
                                        onChange={(e) => updateLoopSlot(index, e.target.value as CameraMovement)}
                                        className="w-28 bg-slate-800 border border-slate-600 text-[10px] text-white rounded p-1.5 focus:ring-1 focus:ring-cyan-500 outline-none cursor-pointer hover:bg-slate-700"
                                    >
                                        <optgroup label="Básicos">
                                            {CAMERA_MOVEMENTS.slice(0, 10).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                        </optgroup>
                                        <optgroup label="Avanzados">
                                            {CAMERA_MOVEMENTS.slice(10).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                {index < 3 && <span className="text-slate-600 text-lg">→</span>}
                            </div>
                        ))}
                        
                        <div className="border-l border-slate-700 pl-4 ml-auto">
                            <button
                                onClick={() => onApplyLoop(scriptIndex, loopSlots)}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-violet-900/30 transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <SparklesIcon className="w-4 h-4" /> Aplicar Bucle
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center gap-4 bg-black/20 p-3 rounded-lg border border-slate-700/50 w-full md:w-auto">
                        <select 
                            className="bg-slate-800 text-sm text-white border border-slate-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none flex-grow"
                            value={fixedMovement}
                            onChange={(e) => setFixedMovement(e.target.value as CameraMovement)}
                        >
                            {CAMERA_MOVEMENTS.map(m => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => onApplyFixed(scriptIndex, fixedMovement)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <FilmIcon className="w-4 h-4" /> Aplicar a Todos
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {onGenerateVideosAuto && (
                        <button 
                            onClick={() => onGenerateVideosAuto(scriptIndex)}
                            disabled={isGenerating}
                            className="flex-shrink-0 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold rounded-xl shadow-lg shadow-violet-900/30 transition-all flex items-center justify-center gap-2 w-full md:w-auto min-w-[140px]"
                            title="Genera videos y automáticamente verifica y repara errores hasta que quede perfecto"
                        >
                            <SparklesIcon className="w-4 h-4 animate-pulse"/> Auto-Perfeccionar
                        </button>
                    )}
                    <button 
                        onClick={() => onGenerateVideos(scriptIndex)} 
                        disabled={isGenerating}
                        className="flex-shrink-0 px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-300 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 w-full md:w-auto min-w-[140px] text-xs"
                    >
                        Solo Generar
                    </button>
                </div>
            </div>
        </div>
    );
});

GlobalMovementControl.displayName = 'GlobalMovementControl';

const SceneEditor = memo<{ 
    scriptOption: ScriptOption; 
    scriptIndex: number; 
    apiKey: string | null; 
    selectedSceneIds: Set<string>; 
    viewMode?: 'grid' | 'list';
    onUpdateSceneDescription: any; 
    onRegenerateScene: any; 
    onRegenerateSafePrompt: any; 
    onGenerateImage: (scriptIndex: number, sceneId: string, aspectRatio: string) => void;
    onAddScene: any; 
    onDeleteScene: any; 
    onDownloadImage: any; 
    onViewImage: any; 
    onAnimateScene: (scriptIndex: number, sceneId: string) => void;
    onDownloadVideo: (scriptIndex: number, sceneId: string, sceneIndex: number) => void; 
    onViewVideo: (videoUrl: string) => void; 
    onToggleSceneSelection: (sceneId: string) => void; 
    onUpdateCameraMovement: (scriptIndex: number, sceneId: string, movement: CameraMovement) => void;
    onUpdateSceneDuration: (scriptIndex: number, sceneId: string, duration: number) => void;
    onPlayAudioSegment: (startTime: number, duration: number) => void;
    onUpscaleScene?: (scriptIndex: number, sceneId: string) => void;
    onReformulatePrompt?: (scriptIndex: number, sceneId: string) => void;
}>(({ scriptOption, scriptIndex, apiKey, selectedSceneIds, viewMode = 'grid', onUpdateSceneDescription, onRegenerateScene, onRegenerateSafePrompt, onGenerateImage, onAddScene, onDeleteScene, onDownloadImage, onViewImage, onAnimateScene, onDownloadVideo, onViewVideo, onToggleSceneSelection, onUpdateCameraMovement, onUpdateSceneDuration, onPlayAudioSegment, onUpscaleScene, onReformulatePrompt }) => {
    
    // Determine dynamic classes based on aspect ratio for list view
    const mediaContainerClass = useMemo(() => {
        switch (scriptOption.aspectRatio) {
            case 'IMAGE_ASPECT_RATIO_PORTRAIT':
                return 'aspect-[9/16] w-36';
            case 'IMAGE_ASPECT_RATIO_SQUARE':
                return 'aspect-square w-44';
            default: // LANDSCAPE
                return 'aspect-[16/9] w-48';
        }
    }, [scriptOption.aspectRatio]);

    // Dynamic aspect ratio class for grid view
    const gridAspectRatioClass = useMemo(() => {
        switch (scriptOption.aspectRatio) {
            case 'IMAGE_ASPECT_RATIO_PORTRAIT':
                return 'aspect-[9/16]';
            case 'IMAGE_ASPECT_RATIO_SQUARE':
                return 'aspect-square';
            default:
                return 'aspect-[16/9]';
        }
    }, [scriptOption.aspectRatio]);

    // --- VISTA CUADRO POR CUADRO (STORYBOARD GRID) ---
    if (viewMode === 'grid') {
        return (
            <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {scriptOption.scenes.map((scene, sceneIndex) => {
                        const isRendering = scene.generationStatus === 'generating' || scene.videoGenerationStatus === 'generating';
                        const isSelected = selectedSceneIds.has(scene.id);

                        return (
                            <div
                                key={scene.id}
                                className={`relative flex flex-col justify-between rounded-xl border overflow-hidden transition-all duration-200 group bg-slate-900/90 shadow-lg ${
                                    isSelected 
                                        ? 'border-violet-500 ring-2 ring-violet-500/50 shadow-violet-950/40' 
                                        : isRendering
                                        ? 'border-violet-400 ring-1 ring-violet-400/40'
                                        : scene.generationStatus === 'error' || scene.videoGenerationStatus === 'error'
                                        ? 'border-red-500/60 bg-red-950/20'
                                        : 'border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                {/* Card Header */}
                                <div className="p-2 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {scene.imageUrl && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleSceneSelection(scene.id)}
                                                className="h-3.5 w-3.5 rounded bg-slate-800 border-slate-600 text-violet-600 focus:ring-violet-500 cursor-pointer flex-shrink-0"
                                                title="Seleccionar cuadro"
                                            />
                                        )}
                                        <span className="font-mono font-black text-violet-400 text-xs">
                                            #{String(sceneIndex + 1).padStart(2, '0')}
                                        </span>
                                        {scene.endTime != null && (
                                            <span className="text-[10px] text-slate-400 font-mono truncate">
                                                {formatTime(scene.startTime || 0)}-{formatTime(scene.endTime || 0)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {scene.upscaled4kUrl && (
                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-600 text-white shadow" title="Escalado 4K UHD">
                                                4K
                                            </span>
                                        )}
                                        {scene.imageModelUsed && (
                                            <span className="px-1 py-0.5 rounded text-[8px] font-mono bg-black/60 text-slate-300 border border-slate-800">
                                                {scene.imageModelUsed.includes('flux') ? 'FLUX' : 'IMG3'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Center Media Container */}
                                <div className={`relative w-full ${gridAspectRatioClass} bg-slate-950 flex items-center justify-center overflow-hidden`}>
                                    {scene.imageUrl ? (
                                        <>
                                            <img
                                                src={scene.upscaled4kUrl || scene.imageUrl}
                                                alt={scene.description}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            {/* Hover Overlay with View / Download / Play */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
                                                <button
                                                    onClick={() => onViewImage((scene.upscaled4kUrl || scene.imageUrl) as string)}
                                                    className="p-1.5 bg-slate-800/90 rounded-full text-white hover:bg-violet-600 shadow"
                                                    title="Ver imagen completa"
                                                >
                                                    <ExpandIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => onDownloadImage((scene.upscaled4kUrl || scene.imageUrl) as string, scene.id)}
                                                    className="p-1.5 bg-slate-800/90 rounded-full text-white hover:bg-emerald-600 shadow"
                                                    title="Descargar imagen"
                                                >
                                                    <DownloadIcon className="w-3.5 h-3.5" />
                                                </button>
                                                {scene.videoUrl && (
                                                    <button
                                                        onClick={() => onViewVideo(scene.videoUrl as string)}
                                                        className="p-1.5 bg-slate-800/90 rounded-full text-white hover:bg-blue-600 shadow"
                                                        title="Reproducir video"
                                                    >
                                                        <FilmIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Video indicator badge */}
                                            {scene.videoUrl && (
                                                <button
                                                    onClick={() => onViewVideo(scene.videoUrl as string)}
                                                    className="absolute top-1.5 right-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow cursor-pointer z-10 transition-colors"
                                                    title="Video animado disponible. Clic para ver."
                                                >
                                                    <FilmIcon className="w-3 h-3" />
                                                    <span>{scene.duration || 4}s</span>
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        !['queued', 'generating', 'error'].includes(scene.generationStatus || 'idle') && (
                                            <div className="flex flex-col items-center justify-center p-3 text-center text-slate-600">
                                                <ImageIcon className="w-7 h-7 mb-1 opacity-40" />
                                                <span className="text-[10px] font-mono">Sin renderizar</span>
                                            </div>
                                        )
                                    )}

                                    <ImageGenerationOverlay scene={scene} scriptIndex={scriptIndex} aspectRatio={scriptOption.aspectRatio || 'IMAGE_ASPECT_RATIO_PORTRAIT'} onGenerateImage={onGenerateImage} />
                                    <VideoGenerationOverlay scene={scene} scriptIndex={scriptIndex} onAnimateScene={onAnimateScene} />
                                </div>

                                {/* Director Controls (Camera Movement & Duration) */}
                                <div className="p-2 bg-slate-950/80 border-t border-slate-800/80 flex flex-col gap-1.5">
                                    <select
                                        value={scene.cameraMovement || 'zoom_in'}
                                        onChange={(e) => onUpdateCameraMovement(scriptIndex, scene.id, e.target.value as CameraMovement)}
                                        className="w-full bg-slate-800 border border-slate-700 text-[10px] text-slate-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-violet-500 outline-none"
                                        title="Movimiento de cámara 2.5D"
                                        disabled={scene.videoGenerationStatus === 'generating'}
                                    >
                                        {CAMERA_MOVEMENTS.map(m => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>

                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3 text-slate-400" />
                                            <input
                                                type="number"
                                                min="1"
                                                max="30"
                                                value={(scene.duration || 0).toFixed(0)}
                                                onChange={(e) => onUpdateSceneDuration(scriptIndex, scene.id, parseFloat(e.target.value))}
                                                className="w-9 bg-slate-800 border border-slate-700 rounded text-center text-[10px] py-0.5 text-white font-mono"
                                                title="Duración (segundos)"
                                            />
                                            <span className="text-[9px] text-emerald-400 font-mono">+0.7s</span>
                                        </div>

                                        {scriptOption.masterAudioUrl && scene.startTime != null && scene.duration != null && (
                                            <button
                                                type="button"
                                                onClick={() => onPlayAudioSegment(scene.startTime as number, scene.duration as number)}
                                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                title="Escuchar audio de este corte"
                                            >
                                                <HeadphonesIcon className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Script line & Prompt */}
                                <div className="p-2 bg-slate-900/60 border-t border-slate-800/80 flex flex-col gap-1.5 flex-grow">
                                    <p className="text-[11px] text-violet-300 italic font-medium line-clamp-2 leading-snug" title={scene.scriptLine}>
                                        "{scene.scriptLine}"
                                    </p>
                                    <textarea
                                        value={scene.description}
                                        onChange={(e) => onUpdateSceneDescription(scriptIndex, scene.id, e.target.value)}
                                        placeholder="Prompt visual..."
                                        rows={2}
                                        className={`w-full bg-slate-950/70 border border-slate-800 rounded p-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-violet-500 resize-none ${scene.isRegeneratingDescription || scene.isReformulating ? 'animate-pulse' : ''}`}
                                        readOnly={scene.isRegeneratingDescription || scene.isReformulating}
                                    />
                                </div>

                                {/* Card Actions Footer */}
                                <div className="p-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-1 text-slate-300">
                                    {onReformulatePrompt && (
                                        <button
                                            onClick={() => onReformulatePrompt(scriptIndex, scene.id)}
                                            title="✨ Auto-Reformular Prompt con IA (Groq / NVIDIA)"
                                            disabled={scene.isReformulating || scene.isRegeneratingDescription}
                                            className="p-1.5 rounded bg-slate-800 hover:bg-amber-600 hover:text-white text-amber-300 transition-colors disabled:opacity-40"
                                        >
                                            {scene.isReformulating ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <MagicIcon className="w-3.5 h-3.5" />}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => onRegenerateScene(scriptIndex, scene.id)}
                                        title="Regenerar prompt con IA"
                                        disabled={scene.isRegeneratingDescription}
                                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40"
                                    >
                                        {scene.isRegeneratingDescription ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <SparklesIcon className="w-3.5 h-3.5" />}
                                    </button>

                                    <button
                                        onClick={() => onGenerateImage(scriptIndex, scene.id, scriptOption.aspectRatio || 'IMAGE_ASPECT_RATIO_PORTRAIT')}
                                        title="Generar imagen"
                                        disabled={['queued', 'generating'].includes(scene.generationStatus || '')}
                                        className="p-1.5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-300 transition-colors disabled:opacity-40"
                                    >
                                        <ImageIcon className="w-3.5 h-3.5" />
                                    </button>

                                    {onUpscaleScene && (
                                        <button
                                            onClick={() => onUpscaleScene(scriptIndex, scene.id)}
                                            title={scene.upscaled4kUrl ? "Volver a escalar a 4K UHD" : "💎 Escalar a 4K UHD Ultra-Nítido"}
                                            disabled={!scene.imageUrl || scene.isUpscaling}
                                            className={`px-1.5 py-1 rounded text-[10px] font-black transition-all disabled:opacity-40 ${
                                                scene.upscaled4kUrl 
                                                    ? 'bg-emerald-600 text-white shadow' 
                                                    : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300'
                                            }`}
                                        >
                                            {scene.isUpscaling ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : "4K"}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => onAnimateScene(scriptIndex, scene.id)}
                                        title="Animar Video (2.5D)"
                                        disabled={!scene.imageUrl || scene.videoGenerationStatus === 'generating' || scene.videoGenerationStatus === 'queued'}
                                        className="p-1.5 rounded bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-300 transition-colors disabled:opacity-40"
                                    >
                                        <FilmIcon className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        onClick={() => onDeleteScene(scriptIndex, scene.id)}
                                        title="Eliminar escena"
                                        className="p-1.5 rounded bg-slate-800 hover:bg-red-600 hover:text-white text-red-400 transition-colors"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Scene Card in Grid Mode */}
                    <button
                        onClick={() => onAddScene(scriptIndex)}
                        className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500 bg-slate-900/30 hover:bg-violet-950/20 text-slate-400 hover:text-violet-300 transition-all ${gridAspectRatioClass} group min-h-[220px]`}
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-violet-600 flex items-center justify-center mb-2 transition-colors">
                            <PlusIcon className="w-5 h-5 text-slate-300 group-hover:text-white" />
                        </div>
                        <span className="text-xs font-bold">+ Añadir Cuadro</span>
                    </button>
                </div>
            </div>
        );
    }

    // --- VISTA LISTA DETALLADA (LINEAL CLÁSICA) ---
    return (
        <div className="space-y-4 mt-4">
            {scriptOption.scenes.map((scene) => {
                const showVideoPanel = scene.videoGenerationStatus === 'queued' || scene.videoGenerationStatus === 'generating' || scene.videoGenerationStatus === 'error' || scene.videoUrl;
                
                return (
                    <div key={scene.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            
                            {/* Left Column: Visual Media */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                <div className={`relative ${mediaContainerClass} bg-slate-700 rounded flex items-center justify-center group`}>
                                    {scene.imageUrl && (
                                        <input
                                            type="checkbox"
                                            checked={selectedSceneIds.has(scene.id)}
                                            onChange={() => onToggleSceneSelection(scene.id)}
                                            className="absolute top-2 left-2 z-10 h-5 w-5 rounded bg-slate-900/50 border-slate-400 text-violet-500 focus:ring-violet-500 cursor-pointer"
                                            title="Seleccionar"
                                        />
                                    )}
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.upscaled4kUrl || scene.imageUrl} alt={scene.description} className="w-full h-full object-cover rounded" />
                                            {scene.upscaled4kUrl && (
                                                <div className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded font-black z-10 bg-emerald-600/90 text-white shadow" title="Escalado a 4K UHD nativo">
                                                    ✨ 4K
                                                </div>
                                            )}
                                            {scene.imageModelUsed && (
                                                <div className="absolute bottom-1 left-1 text-[8px] px-1 py-0.5 rounded font-mono z-10 bg-black/75 text-emerald-300 border border-emerald-900/60" title={`Generado con ${scene.imageModelUsed}`}>
                                                    {scene.imageModelUsed.includes('flux') ? 'FLUX' : 'IMAGEN 3'}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                <button onClick={() => onViewImage((scene.upscaled4kUrl || scene.imageUrl) as string)} className="p-2 bg-slate-800/80 rounded-full text-white hover:bg-blue-500" title="Ver en grande">
                                                    <ExpandIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => onDownloadImage((scene.upscaled4kUrl || scene.imageUrl) as string, scene.id)} className="p-2 bg-slate-800/80 rounded-full text-white hover:bg-green-500" title="Descargar imagen">
                                                    <DownloadIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                            {scene.endTime && (
                                                <div className={`absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono z-10 bg-slate-900/80 text-slate-300 border border-slate-600`} title={`Línea de tiempo: ${formatTime(scene.startTime || 0)} - ${formatTime(scene.endTime || 0)}`}>
                                                    <span>{formatTime(scene.startTime || 0)}</span>
                                                    <span>-</span>
                                                    <span>{formatTime(scene.endTime || 0)}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        !['queued', 'generating', 'error'].includes(scene.generationStatus || 'idle') && <ImageIcon className="w-8 h-8 text-slate-500"/>
                                    )}
                                    <ImageGenerationOverlay scene={scene} scriptIndex={scriptIndex} aspectRatio={scriptOption.aspectRatio || 'IMAGE_ASPECT_RATIO_PORTRAIT'} onGenerateImage={onGenerateImage} />
                                </div>
                                
                                {/* Movement Selector & Duration Controls */}
                                <div className={`space-y-2 ${scriptOption.aspectRatio === 'IMAGE_ASPECT_RATIO_PORTRAIT' ? 'w-36' : (scriptOption.aspectRatio === 'IMAGE_ASPECT_RATIO_SQUARE' ? 'w-44' : 'w-48')}`}>
                                    {scene.imageUrl && (
                                        <select
                                            value={scene.cameraMovement || 'zoom_in'}
                                            onChange={(e) => onUpdateCameraMovement(scriptIndex, scene.id, e.target.value as CameraMovement)}
                                            className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-violet-500 outline-none"
                                            title="Seleccionar movimiento de cámara"
                                            disabled={scene.videoGenerationStatus === 'generating'}
                                        >
                                            {CAMERA_MOVEMENTS.map(m => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                    )}
                                    
                                    {/* Manual Duration Adjustment */}
                                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700 flex items-center justify-between">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3"/>
                                            Duración
                                        </label>
                                        <div className="flex items-center gap-1 relative">
                                            <input 
                                                type="number"
                                                step="1" // Force integer steps
                                                min="1"
                                                value={(scene.duration || 0).toFixed(0)}
                                                onChange={(e) => onUpdateSceneDuration(scriptIndex, scene.id, parseFloat(e.target.value))}
                                                className="w-12 bg-slate-900 border border-slate-600 rounded text-xs text-center py-1 text-white focus:ring-1 focus:ring-violet-500 outline-none font-mono"
                                                title="Ajuste manual (segundos enteros)"
                                            />
                                            <span className="text-[9px] font-bold text-emerald-400 px-1 border border-emerald-500/30 bg-emerald-900/20 rounded ml-0.5" title="Generación: +0.7s extra de seguridad">+0.7s</span>
                                            {scriptOption.masterAudioUrl && scene.startTime != null && scene.duration != null && (
                                                <button
                                                    onClick={() => onPlayAudioSegment(scene.startTime as number, scene.duration as number)}
                                                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 ml-1"
                                                    title="Escuchar este segmento de audio"
                                                >
                                                    <HeadphonesIcon className="w-3 h-3"/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {showVideoPanel && (
                                    <div className={`relative ${mediaContainerClass} bg-slate-700 rounded flex items-center justify-center group`} onClick={() => scene.videoUrl && onViewVideo(scene.videoUrl)} style={{ cursor: scene.videoUrl ? 'pointer' : 'default' }}>
                                        {scene.videoUrl && (
                                            <>
                                                <video
                                                    src={scene.videoUrl}
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                    className="w-full h-full object-cover rounded"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDownloadVideo(scriptIndex, scene.id, scene.paragraphIndex); }}
                                                        className="p-2 bg-slate-800/80 rounded-full text-white hover:bg-green-500"
                                                        title="Descargar video"
                                                    >
                                                        <DownloadIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                         {/* Always show overlay if error or queued, even if videoUrl exists (but flawed) */}
                                        <VideoGenerationOverlay scene={scene} scriptIndex={scriptIndex} onAnimateScene={onAnimateScene} />
                                    </div>
                                )}
                            </div>

                            {/* Middle Column: Text Content (Script Line + Prompt) */}
                            <div className="flex-grow w-full min-w-0">
                                {/* Script Line Display */}
                                <div className="mb-2">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">Parte del Guion (Narración)</p>
                                    <div className="p-3 bg-violet-900/20 border border-violet-500/30 rounded-md">
                                        <p className="text-slate-200 text-sm leading-relaxed font-medium">"{scene.scriptLine}"</p>
                                    </div>
                                </div>

                                {/* Prompt Editor */}
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">Prompt Visual (AI)</p>
                                    <textarea
                                        value={scene.description}
                                        onChange={(e) => onUpdateSceneDescription(scriptIndex, scene.id, e.target.value)}
                                        placeholder="Descripción manual de la escena"
                                        className={`w-full bg-slate-800 border border-slate-700 rounded-md p-3 text-sm focus:ring-1 focus:ring-violet-500 focus:outline-none resize-y ${scene.isRegeneratingDescription ? 'animate-pulse' : ''}`}
                                        rows={3}
                                        readOnly={scene.isRegeneratingDescription}
                                    />
                                </div>
                            </div>

                            {/* Right Column: Actions */}
                            <div className="flex flex-row md:flex-col gap-2 self-start">
                                {/* Auto-Reformular Prompt con IA */}
                                {onReformulatePrompt && (
                                    <button 
                                        onClick={() => onReformulatePrompt(scriptIndex, scene.id)} 
                                        title="✨ Auto-Reformular Prompt con IA (Groq/NVIDIA)" 
                                        className="p-2 rounded-md bg-slate-700 hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center text-amber-300 hover:text-white" 
                                        disabled={scene.isReformulating || scene.isRegeneratingDescription}
                                    >
                                        {scene.isReformulating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <MagicIcon className="w-4 h-4"/>}
                                    </button>
                                )}
                                <button onClick={() => onRegenerateScene(scriptIndex, scene.id)} title="Regenerar prompt con IA" className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center" disabled={scene.isRegeneratingDescription || scene.videoGenerationStatus === 'generating' || scene.videoGenerationStatus === 'queued'}>
                                    {scene.isRegeneratingDescription ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <SparklesIcon className="w-4 h-4"/>}
                                </button>
                                <button onClick={() => onGenerateImage(scriptIndex, scene.id, scriptOption.aspectRatio || 'IMAGE_ASPECT_RATIO_PORTRAIT')} title="Generar imagen" className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50" disabled={['queued', 'generating'].includes(scene.generationStatus || '') || scene.videoGenerationStatus === 'generating' || scene.videoGenerationStatus === 'queued'}>
                                    <ImageIcon className="w-4 h-4"/>
                                </button>
                                {/* Botón Escalar a 4K UHD */}
                                {onUpscaleScene && (
                                    <button 
                                        onClick={() => onUpscaleScene(scriptIndex, scene.id)} 
                                        title={scene.upscaled4kUrl ? "Volver a escalar a 4K UHD" : "💎 Escalar a 4K UHD Ultra-Nítido"} 
                                        className={`p-2 rounded-md transition-all disabled:opacity-50 flex items-center justify-center ${scene.upscaled4kUrl ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30' : 'bg-slate-700 hover:bg-emerald-600 text-slate-300'}`} 
                                        disabled={!scene.imageUrl || scene.isUpscaling}
                                    >
                                        {scene.isUpscaling ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <span className="text-[10px] font-black">4K</span>}
                                    </button>
                                )}
                                {/* Individual Animate Button */}
                                <button 
                                    onClick={() => onAnimateScene(scriptIndex, scene.id)} 
                                    title="Animar Imagen (Video)" 
                                    className="p-2 rounded-md bg-slate-700 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                    disabled={!scene.imageUrl || scene.videoGenerationStatus === 'generating' || scene.videoGenerationStatus === 'queued'}
                                >
                                    <FilmIcon className="w-4 h-4"/>
                                </button>
                                <button onClick={() => onDeleteScene(scriptIndex, scene.id)} title="Eliminar escena" className="p-2 rounded-md bg-slate-700 hover:bg-red-500/50 transition-colors disabled:opacity-50" disabled={scene.isRegeneratingDescription || scene.videoGenerationStatus === 'generating' || scene.videoGenerationStatus === 'queued'}>
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
            
             <button onClick={() => onAddScene(scriptIndex)} className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors border border-slate-600 border-dashed">
                <PlusIcon className="w-4 h-4"/> Añadir Prompt Manual
            </button>
        </div>
    );
});

SceneEditor.displayName = 'SceneEditor';

const ScriptCard = memo<{
    option: ScriptOption;
    index: number;
    apiKey: string | null;
    selectedSceneIds: Set<string>;
    onUpdateSceneDescription: (scriptIndex: number, sceneId: string, newDescription: string) => void;
    onRegenerateScene: (scriptIndex: number, sceneId: string) => void;
    onRegenerateSafePrompt: (scriptIndex: number, sceneId: string) => void;
    onGenerateImage: (scriptIndex: number, sceneId: string, aspectRatio: string) => void;
    onAddScene: (scriptIndex: number) => void;
    onDeleteScene: (scriptIndex: number, sceneId: string) => void;
    onDownloadImage: (imageUrl: string, sceneId: string) => void;
    onGenerateAllImages: (scriptIndex: number) => void;
    onViewImage: (imageUrl: string) => void;
    onAnimateScene: (scriptIndex: number, sceneId: string) => void;
    onDownloadVideo: (scriptIndex: number, sceneId: string, sceneIndex: number) => void;
    onDownloadZip: (scriptIndex: number, options: { images: boolean; videos: boolean }) => void;
    onViewVideo: (videoUrl: string) => void;
    onDownloadScriptTxt: (scriptText: string) => void;
    onToggleSceneSelection: (sceneId: string) => void;
    onGenerateSelectedVideos: (scriptIndex: number) => void;
    onGenerateSelectedVideosAuto?: (scriptIndex: number) => void;
    onRetryFailedImages: (scriptIndex: number) => void;
    onRetryFailedPrompts: (scriptIndex: number) => void;
    onRetryInvalidPrompts: (scriptIndex: number) => void;
    onCompileVideo: (scriptIndex: number) => void;
    onUpdateCameraMovement: (scriptIndex: number, sceneId: string, movement: CameraMovement) => void;
    onUpdateAllCameraMovements?: (scriptIndex: number, movement: CameraMovement) => void;
    onApplyCameraLoop: (scriptIndex: number, pattern: CameraMovement[]) => void; // Updated Prop
    onUpdateSceneDuration: (scriptIndex: number, sceneId: string, duration: number) => void;
    onUploadSceneAudio: (scriptIndex: number, sceneId: string, file: File) => void;
    onRetryDurationMismatchVideos?: (scriptIndex: number) => void;
    onVerifyVideoDurations?: (scriptIndex: number) => void;
    onUpscaleScene?: (scriptIndex: number, sceneId: string) => void;
    onUpscaleAllScenes?: (scriptIndex: number) => void;
    onReformulatePrompt?: (scriptIndex: number, sceneId: string) => void;
}>(({ option, index, apiKey, selectedSceneIds, onGenerateAllImages, onDownloadZip, onDownloadScriptTxt, onGenerateSelectedVideos, onGenerateSelectedVideosAuto, onRetryFailedImages, onRetryFailedPrompts, onRetryInvalidPrompts, onRetryDurationMismatchVideos, onVerifyVideoDurations, onCompileVideo, onUpdateAllCameraMovements, onApplyCameraLoop, onUpdateCameraMovement, onUpscaleScene, onUpscaleAllScenes, onReformulatePrompt, ...sceneHandlers }) => {
    
    const [downloadImages, setDownloadImages] = useState(true);
    const [downloadVideos, setDownloadVideos] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const hasImagesToGenerate = option.scenes?.some(s => s.generationStatus === 'idle' || s.generationStatus === 'error');
    const hasGeneratedImages = option.scenes?.some(s => s.imageUrl);
    const hasGeneratedVideos = option.scenes?.some(s => s.videoUrl && s.videoRawBytes);
    const hasFailedImages = option.scenes?.some(s => s.generationStatus === 'error' && s.generationErrorType !== 'invalid_argument');
    const hasInvalidPrompts = option.scenes?.some(s => s.generationErrorType === 'invalid_argument');
    const hasFailedPrompts = option.scenes?.some(s => s.description === '[Error generating prompt for this paragraph]');
    const hasDurationMismatchVideos = option.scenes?.some(s => s.videoGenerationStatus === 'error' && s.generationErrorType === 'duration_mismatch');
    
    // Check if there are images that can be animated (have image, no active generation)
    const canGenerateVideos = option.scenes?.some(s => s.imageUrl && s.videoGenerationStatus !== 'generating' && s.videoGenerationStatus !== 'queued');

    const isDownloadDisabled = (!downloadImages && !downloadVideos) || (!hasGeneratedImages && !hasGeneratedVideos);
    const isGeneratingAnyImage = option.scenes?.some(s => s.generationStatus === 'generating' || s.generationStatus === 'queued');
    const isGeneratingAnyVideo = option.scenes?.some(s => s.videoGenerationStatus === 'generating' || s.videoGenerationStatus === 'queued');
    
    // Check for missing videos when "Videos" checkbox is active
    const imageCount = option.scenes.filter(s => s.imageUrl).length;
    const videoCount = option.scenes.filter(s => s.videoUrl).length;
    const missingVideos = imageCount - videoCount;
    // Show "Generate Missing" if videos are requested but counts don't match
    const showGenerateMissingButton = downloadVideos && missingVideos > 0;

    const originalPromptsText = useMemo(() => {
        const uniqueLines = new Set(option.scenes.map(s => s.scriptLine));
        return Array.from(uniqueLines).join('\n');
    }, [option.scenes]);

    // --- Audio Segment Playback ---
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioStopTimer = useRef<number | null>(null);

    const handlePlayAudioSegment = (startTime: number, duration: number) => {
        if (!audioRef.current) return;

        if (audioStopTimer.current) {
            clearTimeout(audioStopTimer.current);
            audioStopTimer.current = null;
        }

        audioRef.current.pause();
        audioRef.current.currentTime = startTime;
        audioRef.current.play().then(() => {
            audioStopTimer.current = window.setTimeout(() => {
                audioRef.current?.pause();
            }, duration * 1000);
        }).catch(e => console.error("Audio playback error:", e));
    };

    // Sync Calculation
    const totalScenesDuration = option.scenes.reduce((acc, s) => acc + (s.duration || 0), 0);
    const masterDuration = option.masterAudioDuration || 0;
    const isSynced = masterDuration > 0 && Math.abs(totalScenesDuration - masterDuration) < 0.01;

    // --- SCRIPT INTEGRITY CHECK ---
    const integrityStatus = useMemo(() => {
        if (!option.originalScriptText) return { status: 'unknown', missingPercent: 0 };
        
        const originalClean = option.originalScriptText.replace(/\s+/g, '').toLowerCase();
        const generatedClean = option.scenes.map(s => s.scriptLine).join('').replace(/\s+/g, '').toLowerCase();
        
        const diff = Math.abs(originalClean.length - generatedClean.length);
        const percentMissing = (diff / originalClean.length) * 100;
        
        if (percentMissing < 5) return { status: 'perfect', missingPercent: percentMissing };
        if (percentMissing < 15) return { status: 'warning', missingPercent: percentMissing };
        return { status: 'error', missingPercent: percentMissing };
    }, [option.originalScriptText, option.scenes]);

    return (
        <div className="bg-slate-800 rounded-xl p-5 flex flex-col gap-4">
            {option.masterAudioUrl && <audio ref={audioRef} src={option.masterAudioUrl} className="hidden" preload="auto" />}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-violet-400 flex items-center gap-2">
                            {option.title}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* TOGGLE VISTA CUADRO POR CUADRO / LISTA DETALLADA */}
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Vista Cuadro por Cuadro (Storyboard Visual)"
                            >
                                <GridIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Cuadro por Cuadro</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    viewMode === 'list'
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Vista Lista Detallada (Editor Clásico)"
                            >
                                <ListIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Lista Detallada</span>
                            </button>
                        </div>

                         <button onClick={() => onDownloadScriptTxt(originalPromptsText)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" title="Descargar guion original como .txt">
                            <DocumentTextIcon className="w-5 h-5 text-slate-300" />
                        </button>
                    </div>
                </div>

                {/* Integrity Check Banner */}
                {integrityStatus.status !== 'unknown' && (
                    <div className={`text-xs px-3 py-2 rounded-lg border flex items-center justify-between ${
                        integrityStatus.status === 'perfect' ? 'bg-green-900/20 border-green-500/30 text-green-300' :
                        integrityStatus.status === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' :
                        'bg-red-900/20 border-red-500/30 text-red-300'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span className="font-bold uppercase tracking-wider">Integridad del Guion:</span>
                            {integrityStatus.status === 'perfect' && <span>✅ Completo (100%)</span>}
                            {integrityStatus.status === 'warning' && <span>⚠️ Posible pérdida leve ({integrityStatus.missingPercent.toFixed(1)}% dif)</span>}
                            {integrityStatus.status === 'error' && <span>🚫 Faltan partes ({integrityStatus.missingPercent.toFixed(1)}% perdido)</span>}
                        </div>
                        {integrityStatus.status === 'error' && (
                            <span className="font-bold underline cursor-help" title="La IA saltó partes del texto. Revisa las escenas o añade las faltantes manualmente.">¿Qué hago?</span>
                        )}
                    </div>
                )}

                {/* Audio Player & Sync Status */}
                {option.masterAudioUrl && (
                    <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-4 mb-2">
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Audio Maestro</span>
                             <audio src={option.masterAudioUrl} controls className="h-8 flex-grow rounded-lg" />
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
                            {/* Use formatTime here */}
                            <span className="text-slate-400">Total Audio: <span className="text-white font-bold">{formatTime(masterDuration)}</span></span>
                            <span className={`flex items-center gap-2 ${isSynced ? 'text-green-400' : 'text-amber-400'}`}>
                                Total Video: <strong>{formatTime(totalScenesDuration)}</strong>
                                {isSynced ? (
                                    <span className="px-2 py-0.5 bg-green-900/50 border border-green-500 rounded text-[10px] uppercase font-bold">Sincronizado</span>
                                ) : (
                                     <span className="px-2 py-0.5 bg-amber-900/50 border border-amber-500 rounded text-[10px] uppercase font-bold">Desfase: {formatTime(Math.abs(totalScenesDuration - masterDuration))}</span>
                                )}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            
            {(option.scenes && option.scenes.length > 0) && (
                <>
                    <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-900/50 p-3 rounded-lg mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {hasImagesToGenerate && (
                                <button onClick={() => onGenerateAllImages(index)} disabled={isGeneratingAnyImage} className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors disabled:bg-slate-600">
                                    {isGeneratingAnyImage ? ( <> <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Procesando... </> ) : ( "🚀 Generar Imágenes" )}
                                </button>
                            )}

                            {/* BOTÓN ESCALAR TODO A 4K */}
                            {hasGeneratedImages && onUpscaleAllScenes && (
                                <button 
                                    onClick={() => onUpscaleAllScenes(index)} 
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-md shadow-emerald-900/30"
                                    title="Escalar todas las imágenes generadas a 4K UHD nativo"
                                >
                                    💎 Escalar Todo a 4K
                                </button>
                            )}
                            
                            {/* BOTÓN VERIFICAR DURACIÓN */}
                            {hasGeneratedVideos && onVerifyVideoDurations && !isGeneratingAnyVideo && (
                                <button onClick={() => onVerifyVideoDurations(index)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-lg shadow-blue-900/30">
                                    <CheckIcon className="w-5 h-5"/> 🛡️ Verificar Duración
                                </button>
                            )}

                            {/* BOTÓN REPARAR VIDEOS */}
                            {hasDurationMismatchVideos && onRetryDurationMismatchVideos && (
                                <button onClick={() => onRetryDurationMismatchVideos(index)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors animate-pulse shadow-lg shadow-red-900/50 ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900">
                                    <ClockIcon className="w-5 h-5"/> 🔧 Reparar Videos Cortos
                                </button>
                            )}

                            {hasFailedImages && (
                                 <button onClick={() => onRetryFailedImages(index)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors">
                                    <RefreshIcon className="w-5 h-5"/> Reintentar Errores
                                </button>
                            )}
                             {hasInvalidPrompts && (
                                <button onClick={() => onRetryInvalidPrompts(index)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-semibold transition-colors">
                                    <SparklesIcon className="w-5 h-5"/> Regenerar Prompts Inválidos
                                </button>
                            )}
                             {hasFailedPrompts && (
                                <button onClick={() => onRetryFailedPrompts(index)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors">
                                    <RefreshIcon className="w-5 h-5"/> Reintentar Prompts Fallidos
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {(hasGeneratedImages || hasGeneratedVideos) && (
                                <div className="flex items-center gap-3 border-l border-slate-700 pl-3">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id={`cb-images-${index}`} checked={downloadImages} onChange={() => setDownloadImages(!downloadImages)} disabled={!hasGeneratedImages} className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500 disabled:opacity-50" />
                                        <label htmlFor={`cb-images-${index}`} className="text-sm text-slate-300">Imágenes</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id={`cb-videos-${index}`} checked={downloadVideos} onChange={() => setDownloadVideos(!downloadVideos)} disabled={!hasGeneratedVideos} className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500 disabled:opacity-50" />
                                        <label htmlFor={`cb-videos-${index}`} className="text-sm text-slate-300">Videos</label>
                                    </div>
                                    
                                    {showGenerateMissingButton ? (
                                        <button 
                                            onClick={() => onGenerateSelectedVideos(index)} 
                                            disabled={isGeneratingAnyVideo}
                                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors shadow-lg shadow-amber-900/20 animate-pulse"
                                        >
                                            <FilmIcon className="w-5 h-5"/> Generar {missingVideos} Videos Faltantes
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => onDownloadZip(index, { images: downloadImages, videos: downloadVideos })} 
                                            disabled={isDownloadDisabled} 
                                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                                        >
                                            <DownloadIcon className="w-5 h-5"/> Descargar ZIP
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NEW GLOBAL MOVEMENT CONTROL (Replaces the old select box) */}
                    {canGenerateVideos && (
                        <GlobalMovementControl 
                            scriptIndex={index}
                            onApplyLoop={onApplyCameraLoop}
                            onApplyFixed={(idx, movement) => onUpdateAllCameraMovements && onUpdateAllCameraMovements(idx, movement)}
                            onGenerateVideos={onGenerateSelectedVideos}
                            onGenerateVideosAuto={onGenerateSelectedVideosAuto} // Pass new handler
                            isGenerating={isGeneratingAnyVideo || false}
                        />
                    )}

                    <SceneEditor 
                        scriptOption={option} 
                        scriptIndex={index} 
                        apiKey={apiKey} 
                        selectedSceneIds={selectedSceneIds} 
                        onPlayAudioSegment={handlePlayAudioSegment} 
                        onUpdateCameraMovement={onUpdateCameraMovement} 
                        onUpscaleScene={onUpscaleScene} 
                        onReformulatePrompt={onReformulatePrompt} 
                        viewMode={viewMode}
                        {...sceneHandlers} 
                    />
                </>
            )}
        </div>
    );
});

ScriptCard.displayName = 'ScriptCard';

const ScriptDisplay: React.FC<ScriptDisplayProps> = ({ 
    scriptOptions, isLoading, error, apiKey, generationProgress, activeQueues, hasInterruptedTasks, onResumeTasks, onCancel, onClearAll, isAutoLoopActive, ...handlers 
}) => {
    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancelClick = () => {
        setIsCancelling(true);
        onCancel();
        setTimeout(() => setIsCancelling(false), 2000);
    };

    const renderContent = () => {
        // Handle states where there are no projects displayed.
        if (isLoading && scriptOptions.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <MagicIcon className="w-12 h-12 text-violet-400 animate-pulse mb-4" />
                    <p className="text-slate-300 font-semibold">Creando tu proyecto...</p>
                    <p className="text-slate-400">Esto tomará solo un momento.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4 bg-red-900/20 rounded-lg">
                    <p className="font-bold">Ha ocurrido un error</p>
                    <p className="text-sm max-w-md">{error}</p>
                </div>
            );
        }
        
        if (scriptOptions.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <MagicIcon className="w-12 h-12 text-slate-500 mb-4" />
                    <p className="text-slate-300 font-semibold">Tus proyectos aparecerán aquí</p>
                    <p className="text-slate-400">Usa la lista de prompts o la entrada JSON para empezar.</p>
                </div>
            );
        }

        const isProcessRunning = generationProgress || activeQueues.images > 0 || activeQueues.videos > 0;
        
        // Progress Calculation
        const processedImages = activeQueues.totalImages > 0 ? (activeQueues.totalImages - activeQueues.images) : 0;
        const processedVideos = activeQueues.totalVideos > 0 ? (activeQueues.totalVideos - activeQueues.videos) : 0;
        
        // Custom text logic for Auto-Repair mode
        const isRepairMode = isAutoLoopActive && activeQueues.totalVideos > 0;

        return (
            <div className="space-y-6">
                {/* Resume Banner */}
                {hasInterruptedTasks && !isProcessRunning && (
                    <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-xl flex items-center justify-between animate-fade-in shadow-lg mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-full">
                                <RefreshIcon className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="font-bold text-blue-200">Proceso Detenido o con Errores</p>
                                <p className="text-sm text-blue-400/80">Hay tareas pendientes o que fallaron. Pulsa para reintentar automáticamente.</p>
                            </div>
                        </div>
                        <button 
                            onClick={onResumeTasks}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/50 transition-colors flex items-center gap-2"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            Continuar / Reintentar
                        </button>
                    </div>
                )}

                <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                    <h2 className="text-xl font-bold text-slate-200">Espacio de Trabajo</h2>
                    <button 
                        onClick={onClearAll}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-300 bg-slate-700 hover:bg-red-600/50 hover:text-red-300 rounded-lg transition-colors"
                    >
                        <TrashIcon className="w-5 h-5" />
                        Limpiar Todo
                    </button>
                </div>
                
                {isProcessRunning && (
                    <div className="bg-slate-800 rounded-xl p-5 shadow-xl border border-slate-700/50">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-violet-400 flex items-center gap-2">
                                {isRepairMode ? <SparklesIcon className="w-6 h-6 animate-pulse text-violet-400"/> : (generationProgress ? <MagicIcon className="w-6 h-6 animate-pulse"/> : <RefreshIcon className="w-6 h-6 animate-spin"/>)}
                                {generationProgress 
                                    ? "Generando Prompts" 
                                    : (isRepairMode ? "Reparando Videos..." : "Procesando Tareas")}
                            </h3>
                            <button 
                                onClick={handleCancelClick}
                                disabled={isCancelling}
                                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:bg-slate-500 disabled:cursor-wait"
                            >
                                {isCancelling ? 'Cancelando...' : 'Cancelar Proceso'}
                            </button>
                        </div>

                        {generationProgress ? (
                            <>
                                <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
                                    <div
                                        className="bg-violet-500 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-slate-400 mt-2 text-center font-mono">
                                    Creando prompts visuales... ({generationProgress.current}/{generationProgress.total})
                                </p>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Image Progress */}
                                {activeQueues.totalImages > 0 && (
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1 uppercase">
                                            <span>Imágenes</span>
                                            <span>{processedImages} / {activeQueues.totalImages}</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${(processedImages / activeQueues.totalImages) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>En cola: {activeQueues.images}</span>
                                            <span className="text-blue-400">Activos: {activeQueues.activeImageWorkers}</span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Video Progress - Customized for Repair */}
                                {activeQueues.totalVideos > 0 && (
                                    <div className={`bg-slate-900/50 p-3 rounded-lg border ${isRepairMode ? 'border-violet-500/50 shadow-inner shadow-violet-900/20' : 'border-slate-700'}`}>
                                        <div className={`flex justify-between text-xs font-bold mb-1 uppercase ${isRepairMode ? 'text-violet-300' : 'text-slate-400'}`}>
                                            <span>{isRepairMode ? 'REPARANDO' : 'VIDEOS'}</span>
                                            <span>{processedVideos} {isRepairMode ? 'de' : '/'} {activeQueues.totalVideos}</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
                                            <div 
                                                className={`${isRepairMode ? 'bg-violet-500' : 'bg-green-500'} h-2 rounded-full transition-all duration-500 ease-out`}
                                                style={{ width: `${(processedVideos / activeQueues.totalVideos) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>En cola: {activeQueues.videos}</span>
                                            <span className={`${isRepairMode ? 'text-violet-400' : 'text-green-400'}`}>Activos: {activeQueues.activeVideoWorkers}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {scriptOptions.map((option, index) => (
                    <ScriptCard key={index} option={option} index={index} apiKey={apiKey} {...handlers} />
                ))}
            </div>
        )
    }

    return (
        <div className="h-full">
            {renderContent()}
        </div>
    );
};

export default ScriptDisplay;
