
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getVideoDimensions } from '../services/clientSideAnimationService';
import SparklesIcon from './icons/SparklesIcon';
import UploadIcon from './icons/UploadIcon';
import FilmIcon from './icons/FilmIcon';
import DownloadIcon from './icons/DownloadIcon';
import CheckIcon from './icons/CheckIcon';

type AspectRatio = '16:9' | '9:16' | '1:1';

const OrganicImageAnimator: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [duration, setDuration] = useState<number>(5);
    const [intensity, setIntensity] = useState<number>(1.0);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [progress, setProgress] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [status, setStatus] = useState('Esperando imagen...');
    
    // Mapa de regiones: 0=Main, 1=Sky, 2=Water, 3=Greenery
    const regionMapRef = useRef<Uint8Array | null>(null);
    const originalImageDataRef = useRef<ImageData | null>(null);
    
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [previewUrl, videoUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setVideoUrl(null);
            regionMapRef.current = null;
            
            const img = new Image();
            img.src = url;
            img.onload = () => analyzeImage(img);
        }
    };

    const analyzeImage = (img: HTMLImageElement) => {
        setIsAnalyzing(true);
        setStatus('Analizando regiones...');
        
        const w = img.width;
        const h = img.height;
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, w, h);
        
        const imageData = ctx.getImageData(0, 0, w, h);
        originalImageDataRef.current = imageData;
        
        const data = imageData.data;
        const map = new Uint8Array(w * h);
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const idx = y * w + x;
                
                // Clasificar por color y posición (Lógica del usuario)
                if (b > r && b > g && y < h * 0.4) {
                    map[idx] = 1; // Sky
                } else if (b > r && b > g && y > h * 0.6) {
                    map[idx] = 2; // Water
                } else if (g > r && g > b) {
                    map[idx] = 3; // Greenery
                } else {
                    map[idx] = 0; // Main
                }
            }
        }
        
        regionMapRef.current = map;
        setIsAnalyzing(false);
        setStatus('Análisis completo ✅');
    };

    const renderFrame = (
        ctx: CanvasRenderingContext2D,
        time: number
    ) => {
        if (!regionMapRef.current || !originalImageDataRef.current) return;

        const srcData = originalImageDataRef.current;
        const w = srcData.width;
        const h = srcData.height;
        
        const outputImageData = ctx.createImageData(w, h);
        
        const srcBuffer = new Uint32Array(srcData.data.buffer);
        const dstBuffer = new Uint32Array(outputImageData.data.buffer);
        const map = regionMapRef.current;

        const t = time; 
        const globalIntensity = intensity;

        for (let y = 0; y < h; y++) {
            const yIdx = y * w;
            for (let x = 0; x < w; x++) {
                const idx = yIdx + x;
                const region = map[idx];
                
                let dx = 0;
                let dy = 0;

                switch(region) {
                    case 1: // Sky
                        dx = Math.sin(t * 0.2) * 2;
                        dy = 0;
                        break;
                    case 2: // Water
                        dx = 0;
                        dy = Math.sin(t * 0.5) * 1.5;
                        break;
                    case 3: // Greenery
                        const sway = Math.sin(t * 0.8) * 1;
                        dx = sway * 0.5;
                        dy = sway;
                        break;
                    default: // Main (region 0)
                        const microMove = Math.sin(t * 1.5) * 0.3;
                        dx = microMove;
                        dy = microMove * 0.5;
                        break;
                }

                // Aplicar intensidad global
                dx *= globalIntensity;
                dy *= globalIntensity;

                let srcX = Math.round(x - dx);
                let srcY = Math.round(y - dy);

                if (srcX < 0) srcX = 0;
                if (srcX >= w) srcX = w - 1;
                if (srcY < 0) srcY = 0;
                if (srcY >= h) srcY = h - 1;

                dstBuffer[idx] = srcBuffer[srcY * w + srcX];
            }
        }
        
        ctx.putImageData(outputImageData, 0, 0);
    };

    const handleRender = async () => {
        if (!imageFile || !previewUrl || !originalImageDataRef.current) {
            setStatus('Error: Faltan datos de imagen analizada.');
            return;
        }
        
        setIsRendering(true);
        setProgress(0);
        setVideoUrl(null);
        setStatus('Renderizando video...');
    
        try {
            // Canvas para renderizar la animación (tamaño original)
            const renderCanvas = document.createElement('canvas');
            renderCanvas.width = originalImageDataRef.current.width;
            renderCanvas.height = originalImageDataRef.current.height;
            const renderCtx = renderCanvas.getContext('2d');
            if (!renderCtx) throw new Error("No se pudo obtener contexto 2D de renderizado");
    
            // Canvas final para el video (tamaño de salida)
            const [width, height] = getVideoDimensions(aspectRatio);
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = width;
            outputCanvas.height = height;
            const outputCtx = outputCanvas.getContext('2d');
            if (!outputCtx) throw new Error("No se pudo obtener contexto 2D de salida");
    
            // Configurar MediaRecorder
            const stream = outputCanvas.captureStream(30); // Capturar del canvas de salida
            
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
            
            const recorder = new MediaRecorder(stream, { 
                mimeType,
                videoBitsPerSecond: 5000000 // 5 Mbps
            });
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                setIsRendering(false);
                setStatus('Video generado ✅');
            };
    
            // Iniciar grabación
            recorder.start();
            
            let startTime: number | null = null;
            const totalTimeMs = duration * 1000;
    
            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progressRatio = Math.min(elapsed / totalTimeMs, 1.0);
                
                setProgress(Math.round(progressRatio * 100));
    
                // 1. Dibujar el fotograma animado en el canvas de renderizado
                renderFrame(renderCtx, elapsed / 1000);

                // 2. Dibujar el canvas de renderizado en el canvas de salida (escalando)
                outputCtx.fillStyle = 'black';
                outputCtx.fillRect(0, 0, width, height);
                outputCtx.drawImage(renderCanvas, 0, 0, width, height);
    
                if (elapsed < totalTimeMs) {
                    requestAnimationFrame(animate);
                } else {
                    // Detener inmediatamente al finalizar
                    recorder.stop();
                }
            };
    
            requestAnimationFrame(animate);
    
        } catch (error) {
            console.error(error);
            alert("Error al renderizar el video.");
            setIsRendering(false);
            setStatus('Error al renderizar');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 bg-slate-800/50 rounded-2xl">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">Animador Orgánico</h1>
                <p className="text-slate-400">Da vida a tus imágenes con movimientos sutiles basados en el contenido.</p>
                <div className="mt-2 inline-block px-4 py-1 bg-slate-900/50 rounded-full border border-slate-700">
                    <span className={`text-xs ${status.includes('✅') ? 'text-green-400' : 'text-slate-400'}`}>
                        Estado: {status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6 bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                    <div>
                        <label className="text-sm font-semibold text-slate-200 mb-2 block flex items-center gap-2"><UploadIcon className="w-5 h-5"/> 1. Sube tu Imagen</label>
                        <div className="relative group p-4 border-2 border-dashed border-slate-600 rounded-lg text-center hover:border-sky-500 transition-colors">
                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isRendering || isAnalyzing} />
                             <div className="pointer-events-none">
                                <p className="font-semibold text-sky-400">{imageFile ? imageFile.name : 'Haz clic o arrastra una imagen'}</p>
                                <p className="text-xs text-slate-500">La imagen se analizará automáticamente</p>
                             </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-200 mb-2 block flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> 2. Ajusta la Animación</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Intensidad del Movimiento</label>
                                <input type="range" min="0.1" max="2.5" step="0.1" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full" disabled={isRendering} />
                                <div className="flex justify-between text-xs text-slate-500"><span>Sutil</span><span>{intensity.toFixed(1)}x</span><span>Intenso</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Duración (s)</label>
                                    <input type="number" min="1" max="20" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white" disabled={isRendering} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Formato</label>
                                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white" disabled={isRendering}>
                                        <option value="16:9">16:9</option>
                                        <option value="9:16">9:16</option>
                                        <option value="1:1">1:1</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleRender} disabled={!imageFile || isRendering || isAnalyzing} className="w-full flex items-center justify-center gap-3 py-3 rounded-lg font-bold text-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors">
                        {isRendering ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Renderizando... {progress}%</> : <><FilmIcon className="w-6 h-6"/>Renderizar Video</>}
                    </button>
                </div>
                
                {/* Previews */}
                <div className="space-y-6">
                    <div className="bg-black/30 p-4 rounded-xl border border-slate-700">
                         <h3 className="text-sm font-semibold text-slate-300 mb-2">Previsualización de la Imagen</h3>
                         <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                            {previewUrl ? <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded"/> : <span className="text-slate-500">Sube una imagen</span>}
                         </div>
                    </div>
                     <div className="bg-black/30 p-4 rounded-xl border border-slate-700">
                         <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                             {videoUrl ? <CheckIcon className="w-5 h-5 text-green-400"/> : <FilmIcon className="w-5 h-5"/>}
                             Resultado del Video
                         </h3>
                         <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                            {videoUrl ? <video src={videoUrl} controls autoPlay loop className="max-h-full max-w-full object-contain rounded"/> : <span className="text-slate-500">El video aparecerá aquí</span>}
                         </div>
                         {videoUrl && <a href={videoUrl} download={`organic_animation_${Date.now()}.webm`} className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-semibold transition-colors"><DownloadIcon className="w-5 h-5"/>Descargar Video</a>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganicImageAnimator;