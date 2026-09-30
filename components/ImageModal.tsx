import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Info
} from 'lucide-react';
import { SceneSlot, AspectRatioType } from '../types';
import { upscaleImage } from '../utils/upscaler';

interface ImageModalProps {
  slot: SceneSlot | null;
  aspectRatio?: AspectRatioType;
  onClose: () => void;
  onRegenerateSlot?: (slotId: string) => Promise<void>;
  onReformulateSlot?: (slotId: string) => Promise<void>;
  onUpdateSlotUpscale?: (slotId: string, upscaledUrl: string, factor?: 2 | 4, resolution?: string) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  slot,
  aspectRatio = '9:16',
  onClose,
  onRegenerateSlot,
  onUpdateSlotUpscale,
}) => {
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleTarget, setUpscaleTarget] = useState<2 | 4>(2);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!slot) return null;

  const currentDisplayUrl = slot.upscaledUrl || slot.imageUrl;
  const currentResolution = slot.resolution || (slot.upscaleFactor === 4 ? '4096 × 4096 px' : slot.upscaleFactor === 2 ? '2048 × 2048 px' : '1024 × 1024 px');
  const is4K = slot.upscaleFactor === 4;
  const is2K = slot.upscaleFactor === 2;

  const handleDownload = () => {
    if (!currentDisplayUrl) return;
    const a = document.createElement('a');
    a.href = currentDisplayUrl;
    a.download = `${slot.paddedNumber}_escena_${is4K ? '4K' : is2K ? '2K' : '1024'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRunUpscale = async (factor: 2 | 4) => {
    if (!slot.imageUrl || isUpscaling || !onUpdateSlotUpscale) return;
    try {
      setIsUpscaling(true);
      setUpscaleTarget(factor);
      const enhanced = await upscaleImage(slot.imageUrl, factor, aspectRatio);
      onUpdateSlotUpscale(slot.id, enhanced.dataUrl, enhanced.factor, enhanced.resolution);
    } catch (err) {
      console.error('Error aplicando super-resolución:', err);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleRegenerate = async () => {
    if (isRegenerating || !onRegenerateSlot) return;
    try {
      setIsRegenerating(true);
      await onRegenerateSlot(slot.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(slot.compiledPrompt || slot.rawPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-[#0c0e15] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-slate-300 hover:text-white flex items-center justify-center transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Image Preview Frame */}
        <div className="flex-1 bg-black/60 flex items-center justify-center p-6 relative overflow-hidden min-h-[300px] md:min-h-[500px]">
          {currentDisplayUrl ? (
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                src={currentDisplayUrl}
                alt={`Escena #${slot.paddedNumber}`}
                className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl"
              />
              
              {/* Floating Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl">
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  #{slot.paddedNumber}
                </span>
                <span className="text-slate-500 text-[10px]">|</span>
                <span className="text-slate-200 text-[10px] font-mono">
                  {currentResolution}
                </span>
              </div>

              {is4K && (
                <div className="absolute top-3 right-3 bg-amber-400 text-black text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3 fill-black" />
                  <span>4K ULTRA HD</span>
                </div>
              )}
              {is2K && (
                <div className="absolute top-3 right-3 bg-emerald-400 text-black text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3 fill-black" />
                  <span>2K HD</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
              <Info className="w-8 h-8 text-slate-600" />
              <span>Sin imagen generada aún</span>
            </div>
          )}
        </div>

        {/* Right Side: Metadata and Actions */}
        <div className="w-full md:w-96 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.04] bg-[#08090d]">
          <div className="space-y-4 overflow-y-auto pr-1 max-h-[60vh]">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400">
                  Escena #{slot.paddedNumber}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Seed: {slot.seed}
                </span>
              </div>
              <h3 className="text-white font-bold text-base">Detalle de Producción</h3>
            </div>

            {/* Prompt Original */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Prompt Base
              </label>
              <div className="p-3 rounded-xl bg-black/40 text-xs text-slate-300 font-mono leading-relaxed max-h-28 overflow-y-auto">
                {slot.rawPrompt}
              </div>
            </div>

            {/* Prompt Compilado */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Prompt Compilado con Estilo
                </label>
                <button
                  onClick={handleCopyPrompt}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                >
                  {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPrompt ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-black/60 text-xs text-slate-200 font-mono leading-relaxed max-h-36 overflow-y-auto select-all">
                {slot.compiledPrompt || slot.rawPrompt}
              </div>
            </div>

            {/* Technical Parameters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/40 rounded-xl p-2.5">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Relación</span>
                <span className="text-white font-mono font-bold">{aspectRatio}</span>
              </div>
              <div className="bg-black/40 rounded-xl p-2.5">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Tiempo Render</span>
                <span className="text-white font-mono font-bold">{slot.elapsedSeconds || 2.1}s</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/[0.04] space-y-2.5 mt-4">
            {/* Upscale Controls */}
            {onUpdateSlotUpscale && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRunUpscale(2)}
                  disabled={isUpscaling || !slot.imageUrl}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    is2K 
                      ? 'bg-emerald-500/20 text-emerald-300 font-extrabold' 
                      : 'bg-white/[0.03] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isUpscaling && upscaleTarget === 2 ? 'Escalando...' : 'Escalar a 2K'}</span>
                </button>

                <button
                  onClick={() => handleRunUpscale(4)}
                  disabled={isUpscaling || !slot.imageUrl}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    is4K 
                      ? 'bg-amber-500/20 text-amber-300 font-extrabold' 
                      : 'bg-white/[0.03] text-slate-300 hover:bg-amber-500/10 hover:text-amber-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isUpscaling && upscaleTarget === 4 ? 'Escalando...' : 'Escalar a 4K UHD'}</span>
                </button>
              </div>
            )}

            {/* Regenerate Button */}
            {onRegenerateSlot && (
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isRegenerating ? 'Regenerando con IA...' : 'Re-renderizar esta Escena'}</span>
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!currentDisplayUrl}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
            >
              <Download className="w-4 h-4" />
              <span>DESCARGAR #{slot.paddedNumber} ({is4K ? '4K UHD' : is2K ? '2K' : 'Nativa'})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
