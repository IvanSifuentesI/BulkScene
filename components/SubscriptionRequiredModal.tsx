import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ExternalLink, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert,
  Zap,
  Film,
  Mic,
  Maximize2
} from 'lucide-react';
import { SKOOL_CHECKOUT_URL, SubscriptionModalTriggerDetail } from '../services/subscriptionService';

export const SubscriptionRequiredModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<SubscriptionModalTriggerDetail | null>(null);

  useEffect(() => {
    const handleTrigger = (e: CustomEvent<SubscriptionModalTriggerDetail>) => {
      setModalData(e.detail || {});
      setIsOpen(true);
    };

    window.addEventListener('bulkscene_subscription_modal_trigger', handleTrigger as EventListener);
    return () => {
      window.removeEventListener('bulkscene_subscription_modal_trigger', handleTrigger as EventListener);
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
    setModalData(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#0a0d14] border border-amber-500/30 p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.2)] overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Top Glow Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-2.5 mb-5 pt-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            Suscripción Requerida
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
            Esta función requiere una membresía activa en la Academia de Skool para su uso sin límites.
          </p>

          {modalData?.featureName && (
            <div className="inline-block mt-1 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-amber-300">
              Herramienta: <span className="font-bold text-white">{modalData.featureName}</span>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid (Clean & Compact) */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-3 rounded-2xl bg-[#0e121d] border border-white/5 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Imágenes Ilimitadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Dirección de escenas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Timestamps Whisper</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Escalado 4K Ultra-HD</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <a
            href={SKOOL_CHECKOUT_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-wider"
          >
            <span>Desbloquear Acceso ($14/mes)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleClose}
            className="w-full py-2 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-semibold transition-colors border border-white/5 text-center"
          >
            Seguir explorando
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequiredModal;
