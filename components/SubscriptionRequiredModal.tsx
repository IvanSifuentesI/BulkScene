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
        <div className="text-center space-y-3 mb-6 pt-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold tracking-wider uppercase mb-2">
              <ShieldAlert className="w-3 h-3" />
              <span>Acceso Exclusivo Comunidad Skool</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              🔒 Suscripción no activa
            </h2>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            Necesitas tener una suscripción activa dentro de la Academia de Skool para utilizar esta función.
          </p>

          {modalData?.featureName && (
            <div className="inline-block mt-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-amber-300">
              Función solicitada: <span className="font-bold text-white">{modalData.featureName}</span>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="space-y-2 mb-6 bg-[#0e121d] rounded-2xl p-4 border border-white/5 text-xs text-slate-300">
          <p className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-2">
            Beneficios activos incluidos con tu membresía:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Generación de hasta 1,000 imágenes</span>
            </div>
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Dirección de escenas con IA</span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Timestamps exactos con Whisper</span>
            </div>
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Escalado 4K Ultra-HD nativo</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <a
            href={SKOOL_CHECKOUT_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-wider"
          >
            <span>Desbloquear Acceso en Skool por $14 USD/mes</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-semibold transition-colors border border-white/5 text-center"
          >
            Entendido, seguir explorando la interfaz
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-4 border-t border-white/5 text-center text-[11px] text-slate-500">
          Puedes seguir navegando y explorando todas las herramientas y paneles en modo vista.
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequiredModal;
