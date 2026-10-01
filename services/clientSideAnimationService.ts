
import { CameraMovement } from '../types';

type AspectRatioStr = '16:9' | '9:16' | '1:1';

// --- Constants ---
export const STANDARD_MOVEMENTS: { id: CameraMovement; label: string }[] = [
    { id: 'zoom_in', label: "Zoom (Acercamiento)" },
    { id: 'zoom_out', label: "Zoom Inverso (Alejamiento)" },
    { id: 'pan_right', label: "Paneo Horizontal (Izq → Der)" },
    { id: 'pan_left', label: "Paneo Horizontal (Der → Izq)" },
    { id: 'pan_down', label: "Paneo Vertical (Arr → Abj)" },
    { id: 'pan_up', label: "Paneo Vertical (Abj → Arr)" },
    { id: 'zoom_pan_diagonal', label: "Zoom + Paneo Diagonal" },
    { id: 'rotate_gentle', label: "Rotación Suave" },
    { id: 'shake', label: "Temblor (Cámara en Mano)" },
    { id: 'pulse', label: "Pulso (Latido)" },
    { id: 'float', label: "Flotante" },
    { id: 'breathing', label: "Respiración (Sutil)" },
    { id: 'gentle_drift', label: "Deriva Suave" },
    { id: 'cloud_float', label: "Flotación de Nubes" },
    { id: 'water_subtle', label: "Agua Sutil" },
    { id: 'static_alive', label: "Estático con Micro-Movimiento" },
];

export const CHROMATIC_MOVEMENTS: { id: CameraMovement; label: string }[] = [
    { id: 'chromatic_zoom', label: "Zoom con Aberración Cromática" },
    { id: 'chromatic_pan', label: "Paneo con RGB Split" },
    { id: 'glitch_pulse', label: "Pulso Glitch" },
    { id: 'rgb_split_drift', label: "Deriva RGB Suave" },
    { id: 'aberration_wave', label: "Onda Cromática" },
    { id: 'digital_distortion', label: "Distorsión Digital" },
];


export const CAMERA_MOVEMENTS = [...STANDARD_MOVEMENTS, ...CHROMATIC_MOVEMENTS];

export const CHROMATIC_KEYS = CHROMATIC_MOVEMENTS.map(m => m.id);

// --- Helper Functions ---

export const getVideoDimensions = (aspectRatio: string): [number, number] => {
    // Map API style aspect strings to dimensions or use direct 16:9/etc
    if (aspectRatio === 'IMAGE_ASPECT_RATIO_PORTRAIT' || aspectRatio === '9:16') return [1080, 1920];
    if (aspectRatio === 'IMAGE_ASPECT_RATIO_SQUARE' || aspectRatio === '1:1') return [1080, 1080];
    // Default Landscape
    return [1920, 1080];
};

const easeInOutQuad = (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// --- Chromatic Drawing Logic ---
export const drawChromaticFrame = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    progress: number,
    movement: CameraMovement,
    width: number,
    height: number,
    timeElapsed: number,
    tempCanvas: HTMLCanvasElement
) => {
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;

    const easedProgress = easeInOutCubic(progress);
    const imgAspect = image.width / image.height;
    const canvasAspect = width / height;
    
    let baseScale = 1.0;
    let baseX = 0;
    let baseY = 0;
    
    // Movement Logic
    switch (movement) {
        case 'chromatic_zoom':
            baseScale = 1.0 + easedProgress * 0.3;
            break;
        case 'chromatic_pan':
            baseScale = 1.2;
            baseX = (easedProgress - 0.5) * width * 0.3;
            break;
        case 'glitch_pulse':
            baseScale = 1.1 + 0.05 * Math.sin(timeElapsed * 4);
            break;
        case 'rgb_split_drift':
            baseScale = 1.15;
            baseX = Math.sin(timeElapsed * 0.5) * 30;
            baseY = Math.cos(timeElapsed * 0.3) * 20;
            break;
        case 'aberration_wave':
            baseScale = 1.1;
            break;
        case 'digital_distortion':
            baseScale = 1.0 + easedProgress * 0.25;
            baseX = Math.random() * 2 - 1;
            baseY = Math.random() * 2 - 1;
            break;
    }
    
    // Calculate dimensions (cover fit)
    let finalW, finalH;
    if (imgAspect > canvasAspect) {
        finalH = height * baseScale;
        finalW = finalH * imgAspect;
    } else {
        finalW = width * baseScale;
        finalH = finalW / imgAspect;
    }
    
    const finalX = (width - finalW) / 2 + baseX;
    const finalY = (height - finalH) / 2 + baseY;

    // Draw base image to temp canvas
    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(image, finalX, finalY, finalW, finalH);
    
    const srcData = tempCtx.getImageData(0, 0, width, height);
    const destData = ctx.createImageData(width, height);
    
    const w = width;
    const h = height;
    const data = srcData.data;
    const target = destData.data;

    // RGB Offsets
    let rOffsetX = 0, rOffsetY = 0;
    let gOffsetX = 0, gOffsetY = 0;
    let bOffsetX = 0, bOffsetY = 0;
    
    const intensity = 8; // Base separation pixels
    
    switch (movement) {
        case 'chromatic_zoom':
            const zoomIntensity = intensity * easedProgress;
            rOffsetX = -zoomIntensity; bOffsetX = zoomIntensity;
            rOffsetY = -zoomIntensity * 0.5; bOffsetY = zoomIntensity * 0.5;
            break;
        case 'chromatic_pan':
            const panInt = intensity * Math.sin(easedProgress * Math.PI);
            rOffsetX = -panInt; bOffsetX = panInt;
            break;
        case 'glitch_pulse':
            const pulseIntensity = intensity * Math.abs(Math.sin(timeElapsed * 4));
            rOffsetX = pulseIntensity * (Math.random() * 2 - 1);
            gOffsetY = pulseIntensity * (Math.random() * 2 - 1);
            bOffsetX = -pulseIntensity * (Math.random() * 2 - 1);
            break;
        case 'rgb_split_drift':
            rOffsetX = intensity * Math.sin(timeElapsed * 0.8);
            rOffsetY = intensity * 0.5 * Math.cos(timeElapsed * 1.2);
            bOffsetX = -intensity * Math.sin(timeElapsed * 0.6);
            bOffsetY = -intensity * 0.5 * Math.cos(timeElapsed * 0.9);
            gOffsetX = intensity * 0.5 * Math.sin(timeElapsed * 0.7);
            break;
        case 'aberration_wave':
            const wavePhase = easedProgress * Math.PI * 2;
            rOffsetX = intensity * Math.sin(wavePhase);
            gOffsetX = intensity * Math.sin(wavePhase + Math.PI * 0.66);
            bOffsetX = intensity * Math.sin(wavePhase + Math.PI * 1.33);
            break;
        case 'digital_distortion':
            const distortionIntensity = intensity * 1.5 * easedProgress;
            rOffsetX = -distortionIntensity;
            rOffsetY = Math.sin(timeElapsed * 10) * 2;
            bOffsetX = distortionIntensity;
            bOffsetY = Math.cos(timeElapsed * 8) * 2;
            break;
    }

    // Round offsets for integer indexing
    const rOx = Math.round(rOffsetX);
    const rOy = Math.round(rOffsetY);
    const gOx = Math.round(gOffsetX);
    const gOy = Math.round(gOffsetY);
    const bOx = Math.round(bOffsetX);
    const bOy = Math.round(bOffsetY);

    // Pixel manipulation pass (Optimized)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const destIdx = (y * w + x) * 4;

            // Red Channel Source (x - rOx, y - rOy)
            let rx = x - rOx; let ry = y - rOy;
            if (rx >= 0 && rx < w && ry >= 0 && ry < h) {
                target[destIdx] = data[(ry * w + rx) * 4];
            }

            // Green Channel Source
            let gx = x - gOx; let gy = y - gOy;
            if (gx >= 0 && gx < w && gy >= 0 && gy < h) {
                target[destIdx + 1] = data[(gy * w + gx) * 4 + 1];
            }

            // Blue Channel Source
            let bx = x - bOx; let by = y - bOy;
            if (bx >= 0 && bx < w && by >= 0 && by < h) {
                target[destIdx + 2] = data[(by * w + bx) * 4 + 2];
            }

            // Alpha (Opaque)
            target[destIdx + 3] = 255;
        }
    }
    
    ctx.putImageData(destData, 0, 0);
}

// --- Standard Drawing Logic ---
export const drawStandardFrame = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    progress: number,
    movement: CameraMovement,
    width: number,
    height: number,
    timeElapsed: number
) => {
    // Clamp progress for visual animation so it stops at 100% even if recording continues
    const clampedProgress = Math.min(progress, 1.0);
    const easedProgress = easeInOutQuad(clampedProgress);
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.save();

    const dynamicMovements = ['shake', 'pulse', 'float', 'breathing', 'gentle_drift', 'cloud_float', 'water_subtle', 'static_alive'];
    
    if (dynamicMovements.includes(movement)) {
        let scale = 1.05;
        let xOff = 0;
        let yOff = 0;

        switch(movement) {
            case 'pulse':
                scale = 1.05 + 0.03 * Math.sin(timeElapsed * Math.PI); 
                break;
            case 'shake':
                xOff = 8 * Math.sin(timeElapsed * 15); 
                yOff = 8 * Math.cos(timeElapsed * 20); 
                break;
            case 'float':
                scale = 1.05 + 0.02 * Math.sin(timeElapsed * 0.8);
                xOff = 15 * Math.sin(timeElapsed * 0.5);
                yOff = 10 * Math.cos(timeElapsed * 0.3);
                break;
            case 'breathing':
                scale = 1.08 + 0.025 * Math.sin(timeElapsed * 0.8);
                break;
            case 'gentle_drift':
                scale = 1.1; 
                xOff = 25 * Math.sin(timeElapsed * 0.3);
                yOff = 15 * Math.cos(timeElapsed * 0.4);
                break;
            case 'cloud_float':
                scale = 1.1;
                xOff = timeElapsed * 20;
                yOff = 5 * Math.sin(timeElapsed * 0.5);
                break;
            case 'water_subtle':
                scale = 1.05 + 0.015 * Math.sin(timeElapsed * 0.6);
                yOff = 10 * Math.sin(timeElapsed * 0.8);
                break;
            case 'static_alive':
                scale = 1.05 + (Math.random() - 0.5) * 0.005;
                xOff = (Math.random() - 0.5) * 1.5;
                yOff = (Math.random() - 0.5) * 1.5;
                break;
        }

        const imgAspect = image.width / image.height;
        const canvasAspect = width / height;
        let finalW, finalH;

        if (imgAspect > canvasAspect) {
            finalH = height * scale; 
            finalW = finalH * imgAspect;
        } else {
            finalW = width * scale; 
            finalH = finalW / imgAspect;
        }

        const finalX = (width - finalW) / 2 + xOff;
        const finalY = (height - finalH) / 2 + yOff;

        ctx.drawImage(image, finalX, finalY, finalW, finalH);

    } else {
        const imgAspect = image.width / image.height;
        const canvasAspect = width / height;

        let startScale = 1.0, endScale = 1.0;
        let startXFactor = 0.5, startYFactor = 0.5; 
        let endXFactor = 0.5, endYFactor = 0.5;
        let startRot = 0, endRot = 0;
        const PAN_ZOOM = 1.2; 

        switch (movement) {
            case 'zoom_in': startScale = 1.0; endScale = 1.25; break;
            case 'zoom_out': startScale = 1.25; endScale = 1.0; break;
            case 'pan_right': startScale = PAN_ZOOM; endScale = PAN_ZOOM; startXFactor = 0.0; endXFactor = 1.0; break;
            case 'pan_left': startScale = PAN_ZOOM; endScale = PAN_ZOOM; startXFactor = 1.0; endXFactor = 0.0; break;
            case 'pan_down': startScale = PAN_ZOOM; endScale = PAN_ZOOM; startYFactor = 0.0; endYFactor = 1.0; break;
            case 'pan_up': startScale = PAN_ZOOM; endScale = PAN_ZOOM; startYFactor = 1.0; endYFactor = 0.0; break;
            case 'zoom_pan_diagonal': startScale = 1.1; endScale = 1.3; startXFactor = 0.2; endXFactor = 0.8; startYFactor = 0.2; endYFactor = 0.8; break;
            case 'rotate_gentle': startScale = 1.2; endScale = 1.2; startRot = -3; endRot = 3; break;
            default: startScale = 1.0; endScale = 1.25;
        }

        const getDims = (s: number) => {
            let w, h;
            if (imgAspect > canvasAspect) {
                h = height * s; w = h * imgAspect;
            } else {
                w = width * s; h = w / imgAspect;
            }
            return { w, h };
        };

        const startDims = getDims(startScale);
        const endDims = getDims(endScale);

        const currW = startDims.w + (endDims.w - startDims.w) * easedProgress;
        const currH = startDims.h + (endDims.h - startDims.h) * easedProgress;
        
        const overflowX = currW - width;
        const overflowY = currH - height;

        const currXFactor = startXFactor + (endXFactor - startXFactor) * easedProgress;
        const currYFactor = startYFactor + (endYFactor - startYFactor) * easedProgress;

        const currX = - (overflowX * currXFactor);
        const currY = - (overflowY * currYFactor);
        
        const currRot = startRot + (endRot - startRot) * easedProgress;

        if (currRot !== 0) {
            ctx.translate(width / 2, height / 2);
            ctx.rotate(currRot * Math.PI / 180);
            ctx.translate(-width / 2, -height / 2);
        }

        ctx.drawImage(image, currX, currY, currW, currH);
    }

    ctx.restore();
};

export const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    try {
        const response = await fetch(blobUrl);
        if (!response.ok) throw new Error(`Failed to fetch blob: ${response.statusText}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                 if (typeof reader.result === 'string') {
                     const base64 = reader.result.split(',')[1];
                     resolve(base64);
                 } else {
                     reject(new Error("Failed to convert blob to base64"));
                 }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        throw new Error(`Error converting blob to base64: ${e instanceof Error ? e.message : String(e)}`);
    }
};

import { isSubscriptionActive, triggerSubscriptionModal } from './subscriptionService';

export const generateVideoFromImage = async (
  imageUrl: string, 
  durationSeconds: number, 
  aspectRatioStr: string, 
  movement: CameraMovement,
  onProgress?: (percent: number) => void
): Promise<{ videoUrl: string; duration: number }> => {
  // Validación de seguridad de backend/servicio: rechazar llamadas no autorizadas
  if (!isSubscriptionActive()) {
    triggerSubscriptionModal({ featureName: 'Animación de Video' });
    throw new Error('Suscripción no activa. Necesitas tener una suscripción activa dentro de la Academia de Skool para utilizar esta función.');
  }

  return new Promise(async (resolve, reject) => {
     const img = new Image();
     img.crossOrigin = "anonymous";
     img.src = imageUrl;
     
     try {
        await new Promise<void>((r, e) => { 
            img.onload = () => r(); 
            img.onerror = () => e(new Error('La imagen no se pudo cargar para la animación.'));
        });
     } catch (e) {
        return reject(e);
     }

     const [width, height] = getVideoDimensions(aspectRatioStr);
     const canvas = document.createElement('canvas');
     canvas.width = width;
     canvas.height = height;
     const ctx = canvas.getContext('2d');
     
     if (!ctx) {
         return reject(new Error("Failed to get canvas context"));
     }

     let tempCanvas: HTMLCanvasElement | undefined;
     if (CHROMATIC_KEYS.includes(movement)) {
         tempCanvas = document.createElement('canvas');
         tempCanvas.width = width;
         tempCanvas.height = height;
     }

     // OPTIMIZATION: Use 30FPS. 60FPS often lags browser MediaRecorder, causing freezing.
     const stream = canvas.captureStream(30);
     
     let mimeType = 'video/webm;codecs=vp9';
     if (!MediaRecorder.isTypeSupported(mimeType)) {
         mimeType = 'video/webm';
     }
     
     // OPTIMIZATION: Reduced bitrate to 5Mbps (enough for web) to reduce encoding overhead.
     const recorder = new MediaRecorder(stream, { 
         mimeType,
         videoBitsPerSecond: 5000000 
     });
     const chunks: Blob[] = [];
     
     recorder.ondataavailable = e => { 
         if (e.data.size > 0) chunks.push(e.data); 
     };

     recorder.onerror = (event) => {
        const mediaError = event as unknown as { error: DOMException; };
        const errorMessage = mediaError.error ? `${mediaError.error.name}: ${mediaError.error.message}` : 'Error desconocido del MediaRecorder';
        reject(new Error(errorMessage));
    };
     
     recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const videoEl = document.createElement('video');
        videoEl.preload = 'metadata';
        
        videoEl.onloadedmetadata = () => {
             resolve({ videoUrl: url, duration: videoEl.duration });
             videoEl.remove();
        };

        videoEl.onerror = () => {
            resolve({ videoUrl: url, duration: durationSeconds });
            videoEl.remove();
        };
        
        videoEl.src = url;
     };

     // Draw initial frame to ensure canvas isn't empty when recorder starts
     if (CHROMATIC_KEYS.includes(movement) && tempCanvas) {
        drawChromaticFrame(ctx, img, 0, movement, width, height, 0, tempCanvas);
     } else {
        drawStandardFrame(ctx, img, 0, movement, width, height, 0);
     }

     recorder.start();
     
     const animationTimeMs = durationSeconds * 1000;
     let startTime: number | null = null;

     const animate = (timestamp: number) => {
         if (!startTime) startTime = timestamp;
         const elapsed = timestamp - startTime;
         
         // Strict timing stop
         if (elapsed > animationTimeMs) {
             if (recorder.state === 'recording') {
                 recorder.stop();
             }
             return;
         }
         
         const progress = elapsed / animationTimeMs;
         if (onProgress) {
             onProgress(Math.round(progress * 100));
         }
         
         if (CHROMATIC_KEYS.includes(movement) && tempCanvas) {
             drawChromaticFrame(ctx, img, progress, movement, width, height, elapsed / 1000, tempCanvas);
         } else {
             drawStandardFrame(ctx, img, progress, movement, width, height, elapsed / 1000);
         }
         
         requestAnimationFrame(animate);
     };
     
     requestAnimationFrame(animate);
  });
};
