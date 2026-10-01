import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  X, 
  ShieldAlert, 
  Loader2, 
  RefreshCw, 
  Zap, 
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';
import { 
  submitUserErrorReport, 
  GlobalErrorModalEventDetail 
} from '../services/adminReportingService';

export const GlobalDynamicErrorModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorData, setErrorData] = useState<GlobalErrorModalEventDetail | null>(null);
  const [userNote, setUserNote] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleTrigger = (e: CustomEvent<GlobalErrorModalEventDetail>) => {
      const data = e.detail;
      setErrorData(data);
      setSubmittedTicket(null);

      // Pre-llenar nota inteligente según el error
      const stageName = data.stage || 'Proceso General';
      const errMsg = data.errorMessage || 'Error desconocido';
      let defaultNote = `Ocurrió un error en [${stageName}]: "${errMsg}". Estaba intentando procesar mi contenido.`;
      if (errMsg.toLowerCase().includes('failed to fetch')) {
        defaultNote = `Fallo de conexión o timeout en [${stageName}]: Failed to fetch al comunicar con el motor neuronal.`;
      }
      setUserNote(defaultNote);

      try {
        const savedEmail = localStorage.getItem('bulkscene_user_email') || '';
        setUserEmail(savedEmail);
      } catch {}

      setIsOpen(true);
    };

    window.addEventListener('bulkscene_dynamic_error_trigger', handleTrigger as EventListener);
    return () => {
      window.removeEventListener('bulkscene_dynamic_error_trigger', handleTrigger as EventListener);
    };
  }, []);

  if (!isOpen || !errorData) return null;

  const handleClose = () => {
    setIsOpen(false);
    setErrorData(null);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const report = await submitUserErrorReport({
        userEmail: userEmail || 'alumno@bulkscene.ai',
        userComment: userNote.trim() || `Error capturado automáticamente: ${errorData.errorMessage}`,
        stage: errorData.stage,
        errorCode: errorData.errorCode || 'RUNTIME_INTERCEPTION',
        errorMessage: errorData.errorMessage,
        technicalDetails: errorData.technicalDetails
      });

      setSubmittedTicket(report.id);
    } catch (err) {
      console.error('Error enviando reporte automático:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTechDetails = () => {
    const text = `TICKET ERROR BULKSCENE:\nEtapa: ${errorData.stage}\nError: ${errorData.errorMessage}\nNota: ${userNote}\nDetalles: ${JSON.stringify(errorData.technicalDetails || {})}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Análisis amigable de la causa
  const getFriendlyDiagnosis = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('failed to fetch')) {
      return {
        title: 'Fallo de Conexión o Timeout Neuronal',
        desc: 'El navegador no pudo conectar con el endpoint de IA. Esto ocurre cuando no hay claves API cargadas en Ajustes, si la conexión parpadea o si la API de Groq/NVIDIA no responde.',
        tip: 'Puedes enviar el reporte al administrador abajo y utilizar el motor local de emergencia para no detenerte.'
      };
    }
    if (m.includes('401') || m.includes('unauthorized')) {
      return {
        title: 'Credencial No Autorizada (401)',
        desc: 'La clave API del cluster fue rechazada o ha expirado.',
        tip: 'Puedes renovarla en la pestaña Ajustes & APIs.'
      };
    }
    if (m.includes('429') || m.includes('quota') || m.includes('rate limit')) {
      return {
        title: 'Límite de Consultas Excedido (429)',
        desc: 'El servidor ha recibido demasiadas peticiones en pocos segundos.',
        tip: 'El sistema puede reintentar con el modo Seguro.'
      };
    }
    return {
      title: 'Interrupción en la Ejecución',
      desc: msg,
      tip: 'Envía este reporte para que el equipo corrija el script de inmediato.'
    };
  };

  const diagnosis = getFriendlyDiagnosis(errorData.errorMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0a0d14] border border-red-500/40 p-6 sm:p-8 shadow-[0_0_90px_rgba(239,68,68,0.2)] overflow-hidden">
        {/* Top glowing bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse" />

        {/* Close Button ("Eximir Error") */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Eximir / Descartar este aviso"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedTicket ? (
          <div className="py-8 text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">¡Reporte Enviado al Administrador!</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              El reporte se registró con el ticket <strong className="text-emerald-400 font-mono">#{submittedTicket}</strong> y ha sido despachado a <strong>Telegram</strong> para revisión inmediata.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              {errorData.onFallbackAction && (
                <button
                  onClick={() => {
                    handleClose();
                    errorData.onFallbackAction!();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>{errorData.fallbackActionLabel || 'Continuar con Motor de Emergencia'}</span>
                </button>
              )}

              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendReport} className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 shrink-0 animate-bounce-slow">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Interrupción en la Generación
                  </h3>
                  <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30 uppercase font-bold">
                    {errorData.stage}
                  </span>
                </div>
                <p className="text-xs text-red-300/90 font-semibold mt-0.5">
                  {diagnosis.title}
                </p>
              </div>
            </div>

            {/* Diagnóstico amigable */}
            <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-mono text-red-400 font-bold">Detalle Técnico:</span>
                <button
                  type="button"
                  onClick={handleCopyTechDetails}
                  className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copiado' : 'Copiar log'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-red-300 bg-black/50 p-2 rounded-lg border border-red-500/10 truncate">
                {errorData.errorMessage}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {diagnosis.desc}
              </p>
            </div>

            {/* Apartado de Notas para el Administrador */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nota para el Administrador (Requerido para soporte):</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Editable</span>
              </label>
              <textarea
                required
                rows={3}
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Describe brevemente qué estabas haciendo para que el administrador lo solucione..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050609] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 leading-relaxed resize-none"
              />
            </div>

            {/* Correo del usuario */}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-400">
                Correo para notificarte cuando quede resuelto:
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="tu-correo@skool.com"
                className="w-full px-3 py-2 rounded-xl bg-[#050609] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Acciones del Modal */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors order-2 sm:order-1"
              >
                Eximir / Omitir Error
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 justify-end">
                {/* Si hay acción de emergencia o fallback (ej: desglose local) */}
                {errorData.onFallbackAction && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      errorData.onFallbackAction!();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    title="Desglosa el guion de inmediato con el motor algorítmico local sin esperar a la API"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Desglose de Emergencia</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !userNote.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Despachando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar al Admin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GlobalDynamicErrorModal;
