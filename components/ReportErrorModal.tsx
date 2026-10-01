import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  X, 
  Cpu, 
  MessageSquare, 
  ShieldAlert,
  Loader2,
  Sparkles
} from 'lucide-react';
import { submitUserErrorReport } from '../services/adminReportingService';

interface ReportErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage?: string;
  autoErrorCode?: string;
  autoErrorMessage?: string;
  technicalDetails?: {
    model?: string;
    slotNumber?: string;
    promptSnippet?: string;
    stack?: string;
  };
}

export const ReportErrorModal: React.FC<ReportErrorModalProps> = ({
  isOpen,
  onClose,
  currentStage = 'Generador de Imágenes',
  autoErrorCode,
  autoErrorMessage,
  technicalDetails
}) => {
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setComment('');
      try {
        const savedEmail = localStorage.getItem('bulkscene_user_email') || '';
        setEmail(savedEmail);
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && !autoErrorMessage) return;

    setIsSubmitting(true);
    try {
      const report = await submitUserErrorReport({
        userEmail: email.trim() || 'alumno@bulkscene.ai',
        userComment: comment.trim() || (autoErrorMessage ? `Fallo automático reportado: ${autoErrorMessage}` : 'Sin comentario'),
        stage: currentStage,
        errorCode: autoErrorCode || 'USER_REPORTED',
        errorMessage: autoErrorMessage || 'Reportado por el usuario en interfaz',
        technicalDetails: technicalDetails
      });

      setTicketId(report.id);
      setIsSuccess(true);
      setTimeout(() => {
        // Cerrar tras 3 segundos
        onClose();
        setIsSuccess(false);
      }, 2800);
    } catch (err) {
      console.error('Error enviando reporte:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0a0d14] border border-red-500/30 p-6 sm:p-8 shadow-[0_0_80px_rgba(239,68,68,0.15)] overflow-hidden">
        {/* Top glowing bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">¡Reporte Enviado al Administrador!</h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              El equipo de soporte y el administrador han recibido la notificación inmediata con el ticket{' '}
              <strong className="text-emerald-400 font-mono">#{ticketId}</strong> para corregirlo.
            </p>
            <div className="text-xs text-slate-500 font-mono">Cerrando ventana automáticamente...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Reportar un Error o Problema</span>
                  <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                    Soporte Directo
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Módulo: <strong className="text-slate-200">{currentStage}</strong>
                  {technicalDetails?.slotNumber && ` • Escena #${technicalDetails.slotNumber}`}
                </p>
              </div>
            </div>

            {/* Error técnico pre-capturado si existe */}
            {(autoErrorMessage || autoErrorCode) && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-xs text-red-300 space-y-1 font-mono">
                <div className="flex items-center gap-1.5 font-bold text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Error detectado por el sistema:</span>
                </div>
                <div className="truncate text-slate-300">
                  {autoErrorMessage || autoErrorCode}
                </div>
              </div>
            )}

            {/* User comment input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>¿Qué ocurrió o qué estabas intentando hacer?</span>
              </label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ejemplo: Estaba generando las escenas del guión pero al llegar a la escena 4 la generación se detuvo y no descargó la imagen..."
                className="w-full px-4 py-3 rounded-xl bg-[#050609] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 leading-relaxed resize-none"
              />
            </div>

            {/* Email contact */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Tu correo para avisarte de la solución:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="w-full px-4 py-2.5 rounded-xl bg-[#050609] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando al Admin...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Reporte</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportErrorModal;
