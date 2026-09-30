
import React, { useState, useEffect, useCallback, memo } from 'react';
import { STANDARD_MOVEMENTS, CHROMATIC_MOVEMENTS, getVideoDimensions, drawChromaticFrame, drawStandardFrame } from '../services/clientSideAnimationService';
import { CameraMovement } from '../types';
import ZipIcon from './icons/ZipIcon';
import VideoModal from './VideoModal'; // Import the modal
import DownloadIcon from './icons/DownloadIcon';
import ExpandIcon from './icons/ExpandIcon';

// Fix: Declare JSZip as a global variable to prevent 'not defined' errors at runtime,
// assuming it's loaded via a script tag in the main HTML file.
declare global {
    var JSZip: any;
}

type AspectRatio = '16:9' | '9:16' | '1:1';
type Mode = 'single' | 'batch';

interface BatchItem {
    id: string;
    file: File;
    previewUrl: string;
    videoUrl: string | null;
    videoBlob?: Blob;
    status: 'pending' | 'rendering' | 'done' | 'error';
    error?: string;
    // Individual controls
    movement: CameraMovement;
    duration: number;
}

const ClientSideImageAnimator: React.FC = () => {
    // Mode
    const [mode, setMode] = useState<Mode>('single');

    // Single Mode State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    
    // Batch Mode State
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [viewingModalUrl, setViewingModalUrl] = useState<string | null>(null);

    // Shared Config
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [movement, setMovement] = useState<CameraMovement>('zoom_in');
    const [duration, setDuration] = useState<number>(4); // Segundos
    
    // Shared Status
    const [isRendering, setIsRendering] = useState(false);
    const [progress, setProgress] = useState(0);
    const [overallProgress, setOverallProgress] = useState('');

    // Cleanup object URLs
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            batchItems.forEach(item => {
                URL.revokeObjectURL(item.previewUrl);
                if (item.videoUrl) URL.revokeObjectURL(item.videoUrl);
            });
        };
    }, [previewUrl, videoUrl, batchItems]);

    // Handler for global movement change
    const handleGlobalMovementChange = (newMovement: CameraMovement) => {
        setMovement(newMovement);
        setBatchItems(prev => prev.map(item => ({ ...item, movement: newMovement })));
    };

    // Handler for global duration change
    const handleGlobalDurationChange = (newDuration: number) => {
        setDuration(newDuration);
        setBatchItems(prev => prev.map(item => ({ ...item, duration: newDuration })));
    };
    
    const handleUpdateBatchItem = useCallback((id: string, updates: Partial<Pick<BatchItem, 'movement' | 'duration'>>) => {
        setBatchItems(prev =>
            prev.map(item => (item.id === id ? { ...item, ...updates } : item))
        );
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        batchItems.forEach(item => {
            URL.revokeObjectURL(item.previewUrl);
            if (item.videoUrl) URL.revokeObjectURL(item.videoUrl);
        });
        setPreviewUrl(null);
        setVideoUrl(null);
        
        if (mode === 'single') {
            setBatchItems([]);
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                setImageFile(file);
                setPreviewUrl(URL.createObjectURL(file));
            }
        } else {
            setImageFile(null);
            if (e.target.files && e.target.files.length > 0) {
                // Fix: Explicitly type 'file' as File to resolve type inference issues.
                const newItems: BatchItem[] = Array.from(e.target.files).map((file: File) => ({
                    id: crypto.randomUUID(),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    videoUrl: null,
                    status: 'pending',
                    movement: movement, // Initialize with global setting
                    duration: duration, // Initialize with global setting
                }));
                setBatchItems(newItems);
            }
        }
    }, [mode, movement, duration, previewUrl, videoUrl, batchItems]);

    const drawFrameOnCanvas = (
        ctx: CanvasRenderingContext2D, image: HTMLImageElement, progress: number, movement: CameraMovement,
        width: number, height: number, timeElapsed: number, tempCanvas?: HTMLCanvasElement
    ) => {
         if (CHROMATIC_MOVEMENTS.some(m => m.id === movement) && tempCanvas) {
             drawChromaticFrame(ctx, image, progress, movement, width, height, timeElapsed, tempCanvas);
         } else {
             drawStandardFrame(ctx, image, progress, movement, width, height, timeElapsed);
         }
    };

    const renderVideoPromise = useCallback((
        file: File,
        currentMovement: CameraMovement,
        currentDuration: number,
        currentAspectRatio: AspectRatio,
        onProgressUpdate: (p: number) => void
    ): Promise<{ videoUrl: string; videoBlob: Blob }> => {
        return new Promise(async (resolve, reject) => {
            let imageUrl: string | null = null;
            try {
                imageUrl = URL.createObjectURL(file);
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = imageUrl;
                await new Promise<void>((r, e) => { 
                    img.onload = () => r();
                    img.onerror = () => e(new Error('La imagen no se pudo cargar. Puede estar corrupta o en un formato no soportado.'));
                });

                const [width, height] = getVideoDimensions(currentAspectRatio);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("No context"));

                let tempCanvas: HTMLCanvasElement | undefined;
                if (CHROMATIC_MOVEMENTS.some(m => m.id === currentMovement)) {
                    tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                }

                // 30 FPS Optimization for stability
                const stream = canvas.captureStream(30);
                let mimeType = 'video/webm;codecs=vp9';
                if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
                
                // 5Mbps Bitrate Optimization
                const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });

                const chunks: Blob[] = [];
                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    resolve({ videoUrl: url, videoBlob: blob });
                };
                recorder.onerror = (event) => {
                    const mediaError = event as unknown as { error: DOMException; };
                    const errorMessage = mediaError.error ? `${mediaError.error.name}: ${mediaError.error.message}` : 'Error desconocido del grabador';
                    reject(new Error(`Error de MediaRecorder: ${errorMessage}`));
                };
                
                // Draw initial frame
                drawFrameOnCanvas(ctx, img, 0, currentMovement, width, height, 0, tempCanvas);

                recorder.start();
                let startTime: number | null = null;
                const totalTimeMs = currentDuration * 1000;

                const animate = (timestamp: number) => {
                    if (!startTime) startTime = timestamp;
                    const elapsed = timestamp - startTime;
                    
                    if (elapsed > totalTimeMs) {
                        if (recorder.state === "recording") {
                            recorder.stop();
                        }
                        return;
                    }
                    
                    const progress = Math.min(elapsed / totalTimeMs, 1.0);

                    onProgressUpdate(Math.round(progress * 100));
                    drawFrameOnCanvas(ctx, img, progress, currentMovement, width, height, elapsed / 1000, tempCanvas);
                    
                    requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);

            } catch (error) {
                reject(error);
            } finally {
                if (imageUrl) URL.revokeObjectURL(imageUrl);
            }
        });
    }, []);

    const handleRender = useCallback(async () => {
        setIsRendering(true);
        setOverallProgress('');
        
        if (mode === 'single') {
            if (!imageFile) { setIsRendering(false); return; }
            try {
                const { videoUrl: resultUrl } = await renderVideoPromise(imageFile, movement, duration, aspectRatio, setProgress);
                setVideoUrl(resultUrl);
            } catch (error) {
                console.error(error);
                alert("Error al renderizar el video.");
            }
            setIsRendering(false);
        } else {
            // --- BATCH CONCURRENCY LOGIC ---
            const itemsToRender = batchItems.filter(item => item.status === 'pending' || item.status === 'error');
            const TOTAL_ITEMS = itemsToRender.length;
            
            // STRICT 1-AT-A-TIME CONCURRENCY for Smoothness
            const CONCURRENCY_LIMIT = 1; 
            
            let completedCount = 0;
            
            // Queue Management
            let currentIndex = 0;

            const processNextItem = async (): Promise<void> => {
                if (currentIndex >= TOTAL_ITEMS) return;

                const itemIndex = currentIndex;
                const item = itemsToRender[itemIndex];
                currentIndex++;

                // Set status to rendering
                setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'rendering' } : it));
                
                // Update overall progress text
                setOverallProgress(`Procesando... (${completedCount + 1}/${TOTAL_ITEMS})`);

                try {
                    const { videoUrl: newVideoUrl, videoBlob: newVideoBlob } = await renderVideoPromise(
                        item.file,
                        item.movement,
                        item.duration,
                        aspectRatio,
                        (p) => { /* Optional: Update per-item progress if you had a per-item progress bar state */ }
                    );
                    setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'done', videoUrl: newVideoUrl, videoBlob: newVideoBlob } : it));
                } catch (err) {
                    console.error(`Error processing ${item.file.name}:`, err);
                    const errorMessage = err instanceof Error ? err.message : 'Fallo de renderizado';
                    setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: errorMessage } : it));
                } finally {
                    completedCount++;
                    // Recursively pick up the next item
                    await processNextItem();
                }
            };

            // Start initial workers
            const workers = [];
            for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, TOTAL_ITEMS); i++) {
                workers.push(processNextItem());
            }

            await Promise.all(workers);
            
            setOverallProgress('Proceso por lotes completado.');
            setIsRendering(false);
        }
    }, [mode, imageFile, batchItems, movement, duration, aspectRatio, renderVideoPromise]);

    const handleDownloadIndividual = useCallback((url: string, file: File) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${file.name.split('.')[0] || 'animation'}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const handleDownloadAll = useCallback(async () => {
        const zip = new JSZip();
        const folder = zip.folder("animated_images");

        const itemsToZip = batchItems.filter(item => item.status === 'done' && item.videoBlob);
        if (itemsToZip.length === 0) {
            alert("No hay videos completados para descargar.");
            return;
        }

        for (const item of itemsToZip) {
            const filename = item.file.name.substring(0, item.file.name.lastIndexOf('.')) + '.webm';
            folder.file(filename, item.videoBlob!);
        }
        
        zip.generateAsync({ type: "blob" }).then(content => {
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = "animator_batch_export.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }, [batchItems]);

    const allBatchDone = mode === 'batch' && batchItems.length > 0 && batchItems.every(item => item.status === 'done' || item.status === 'error');

    return (
        <div className="max-w-7xl mx-auto p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-2xl font-sans">
            <div className="text-center">
                 <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 bg-clip-text text-transparent">
                    Animador de Imágenes
                </h1>
                <p className="text-slate-400 mb-6">Crea animaciones de cámara y efectos de aberración cromática.</p>
                <div className="inline-flex bg-slate-800/50 p-1 rounded-xl border border-slate-700 mb-8">
                    <button onClick={() => setMode('single')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === 'single' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Imagen Individual</button>
                    <button onClick={() => setMode('batch')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === 'batch' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Producción en Lote</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna Izquierda: Configuración */}
                <div className="space-y-6">
                    <div className="relative p-6 border-2 border-dashed border-slate-600 rounded-xl text-center hover:border-blue-500 transition-all cursor-pointer bg-slate-800/50">
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple={mode === 'batch'}
                            onChange={handleFileChange} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="pointer-events-none">
                             <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p className="text-slate-300 font-medium">
                                {mode === 'single' && (imageFile ? imageFile.name : "Arrastra una imagen o haz clic")}
                                {mode === 'batch' && (batchItems.length > 0 ? `${batchItems.length} imágenes seleccionadas` : "Arrastra imágenes o haz clic")}
                            </p>
                             <p className="text-sm text-slate-500 mt-1">JPG, PNG, WebP</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Movimiento de Cámara (Global)</label>
                        <select value={movement} onChange={(e) => handleGlobalMovementChange(e.target.value as CameraMovement)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                            <optgroup label="Movimientos de Cámara">{STANDARD_MOVEMENTS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>
                            <optgroup label="Efectos Cromáticos">{CHROMATIC_MOVEMENTS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>
                        </select>
                         {mode === 'batch' && <p className="text-xs text-slate-500 mt-1">Aplica a todos por defecto. Se puede cambiar individualmente.</p>}
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duración (s) (Global)</label>
                            <input type="number" min="1" max="20" value={duration} onChange={(e) => handleGlobalDurationChange(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Formato (Global)</label>
                            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="16:9">Landscape (16:9)</option><option value="9:16">Portrait (9:16)</option><option value="1:1">Square (1:1)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleRender}
                        disabled={(mode === 'single' && !imageFile) || (mode === 'batch' && batchItems.length === 0) || isRendering}
                        className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${(!imageFile && batchItems.length === 0) || isRendering ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 hover:from-red-500 hover:via-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/30'}`}>
                         {isRendering ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>{overallProgress || `Renderizando... ${progress}%`}</span>
                            </div>
                        ) : ( `🎬 Renderizar ${mode === 'batch' ? ` Lote (${batchItems.length})` : 'Video'}` )}
                    </button>
                    {mode === 'batch' && allBatchDone && (
                        <button onClick={handleDownloadAll} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-green-600 hover:bg-green-500 text-white transition-colors">
                            <ZipIcon className="w-6 h-6" /> Descargar Todo (.zip)
                        </button>
                    )}
                </div>

                {/* Columna Derecha: Previsualización / Resultado */}
                <div className="bg-black/50 rounded-xl border border-slate-800 p-4">
                    {mode === 'single' ? (
                        <div className="flex flex-col items-center justify-center min-h-[300px] h-full">
                            {videoUrl ? (
                                <div className="w-full space-y-4"><h3 className="text-center font-semibold text-green-400">Video Generado</h3><video src={videoUrl} controls autoPlay loop className="w-full rounded-lg shadow-md max-h-[400px]" /><a href={videoUrl} download={`video_${movement}.webm`} className="block w-full text-center py-2.5 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors">⬇️ Descargar Video</a></div>
                            ) : previewUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center"><img src={previewUrl} alt="Preview" className="max-w-full max-h-[300px] rounded-lg object-contain opacity-80" /><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="bg-black/60 px-3 py-1 rounded text-sm">Vista Previa Estática</p></div></div>
                            ) : ( <p className="text-slate-500">Sube una imagen para ver la vista previa</p> )}
                        </div>
                    ) : (
                        <div className="h-[500px] overflow-y-auto pr-2 space-y-3">
                             {batchItems.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-slate-500">Sube imágenes para el lote</p></div>}
                             {batchItems.map(item => (
                                <div key={item.id} className="bg-slate-800/50 p-3 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="w-24 h-24 flex-shrink-0 bg-black rounded-md flex items-center justify-center relative group">
                                            {item.videoUrl ? (
                                                <>
                                                    <video src={item.videoUrl} autoPlay loop muted className="w-full h-full object-cover rounded-md" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button onClick={() => setViewingModalUrl(item.videoUrl)} className="p-2 bg-slate-800/80 rounded-full text-white hover:bg-blue-500" title="Ver en grande">
                                                            <ExpandIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDownloadIndividual(item.videoUrl!, item.file)} className="p-2 bg-slate-800/80 rounded-full text-white hover:bg-green-500" title="Descargar video">
                                                            <DownloadIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover rounded-md" />
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm text-slate-300 truncate font-medium">{item.file.name}</p>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {item.status === 'pending' && 'Pendiente'}
                                                {item.status === 'rendering' && <div className="w-full bg-slate-700 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: '100%'}}></div><span className="text-[10px] text-blue-300">Renderizando...</span></div>}
                                                {item.status === 'done' && <span className="text-green-400 font-bold">Completado</span>}
                                                {item.status === 'error' && <span className="text-red-400 font-bold">{item.error}</span>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div>
                                                    <label className="text-xs text-slate-400">Movimiento</label>
                                                    <select 
                                                        value={item.movement}
                                                        onChange={(e) => handleUpdateBatchItem(item.id, { movement: e.target.value as CameraMovement })}
                                                        disabled={isRendering}
                                                        className="w-full bg-slate-700 border-slate-600 rounded p-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                    >
                                                        {STANDARD_MOVEMENTS.map(m => <option key={m.id} value={m.id}>{m.label.split('(')[0].trim()}</option>)}
                                                        {CHROMATIC_MOVEMENTS.map(m => <option key={m.id} value={m.id}>{m.label.split('(')[0].trim()}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400">Duración</label>
                                                    <input 
                                                        type="number"
                                                        value={item.duration}
                                                        onChange={(e) => handleUpdateBatchItem(item.id, { duration: Number(e.target.value) })}
                                                        disabled={isRendering}
                                                        className="w-full bg-slate-700 border-slate-600 rounded p-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                        min="1"
                                                        max="20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             ))}
                        </div>
                    )}
                </div>
            </div>

            {viewingModalUrl && (
                <VideoModal videoUrl={viewingModalUrl} onClose={() => setViewingModalUrl(null)} />
            )}
        </div>
    );
};

export default memo(ClientSideImageAnimator);
