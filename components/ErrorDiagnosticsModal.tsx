import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  Send, 
  ShieldAlert, 
  HelpCircle,
  Terminal,
  Radio
} from 'lucide-react';
import { TelemetryErrorReport, formatErrorForClipboard } from '../services/errorTelemetryService';

interface ErrorDiagnosticsModalProps {
  report: TelemetryErrorReport | null;
  onClose: () => void;
  onAutoReformulate?: () => void;
}

export const ErrorDiagnosticsModal: React.FC<ErrorDiagnosticsModalProps> = ({
  report,
  onClose,
  onAutoReformulate,
}) => {
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const handleCopy = () => {
    const text = formatErrorForClipboard(report);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isCensorship = report.errorCode.includes('422');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#0b0e17] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
        {/* Accent top line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-400 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded-full">
                  {report.errorCode}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {report.id}
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Diagnóstico de Error en Ejecución
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Details Body */}
        <div className="py-5 space-y-4 text-xs">
          {/* Cause card */}
          <div className="bg-[#121624] border border-white/[0.06] rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>¿Qué ocurrió y por qué falló?</span>
            </div>
            <p className="text-slate-300 leading-relaxed pl-6 font-medium">
              {report.possibleCause}
            </p>
          </div>

          {/* Solution card */}
          <div className="bg-[#0f1915] border border-emerald-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Solución recomendada por el sistema:</span>
            </div>
            <p className="text-emerald-200/90 leading-relaxed pl-6">
              {report.suggestedSolution}
            </p>
          </div>

          {/* Context data (Prompt snippet or slot) */}
          {report.contextData?.promptSnippet && (
            <div className="bg-black/50 border border-white/[0.04] rounded-2xl p-3.5 space-y-1 font-mono text-[11px]">
              <span className="text-slate-500 uppercase text-[10px] font-bold">
                Prompt Involucrado {report.contextData.slotNumber ? `(Escena #${report.contextData.slotNumber})` : ''}:
              </span>
              <p className="text-slate-300 line-clamp-2 leading-relaxed">
                "{report.contextData.promptSnippet}"
              </p>
            </div>
          )}

          {/* Automatic Cloud Telemetry Status Indicator */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>
              Este reporte fue registrado automáticamente en el centro de telemetría de errores.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡DIAGNÓSTICO COPIADO!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPIAR DIAGNÓSTICO COMPLETO</span>
                </>
              )}
            </button>

            {isCensorship && onAutoReformulate && (
              <button
                onClick={() => {
                  onAutoReformulate();
                  onClose();
                }}
                className="px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <span>Reformular Prompt</span>
              </button>
            )}
          </div>

          <a
            href="https://www.skool.com/ia-automatiza-7412/about"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
          >
            <span>Pegar a Soporte en Skool</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ErrorDiagnosticsModal;
