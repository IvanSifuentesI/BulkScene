import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Check, Trash2, Download, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { studioLogger, StudioLogEntry } from '../services/studioLoggerService';

interface StudioTerminalProps {
  initialOpen?: boolean;
}

export const StudioTerminal: React.FC<StudioTerminalProps> = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [logs, setLogs] = useState<StudioLogEntry[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = studioLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, autoScroll]);

  const handleCopyLogs = async () => {
    const text = studioLogger.exportLogsAsText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadLogs = () => {
    const text = studioLogger.exportLogsAsText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulkscene_studio_logs_${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'ERROR':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold';
      case 'WARN':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'AI':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 font-bold';
      case 'STEP':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30 font-bold';
      default:
        return 'text-slate-400 bg-white/[0.04] border-white/10';
    }
  };

  return (
    <div className="bg-[#06080e] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* HEADER / TOGGLE BAR */}
      <div className="flex items-center justify-between p-3.5 bg-[#0b0e17] border-b border-white/[0.06] select-none">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white tracking-wide">
                TERMINAL DE DIAGNÓSTICO & LOGS EN VIVO
              </span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {logs.length} eventos
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Monitorea cada paso de la IA, prompt analizado, rotación de claves y causas de error.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Copiar todos los logs al portapapeles para compartir con el asistente"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Logs'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLogs}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Descargar archivo .log completo"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => studioLogger.clearLogs()}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Limpiar terminal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TERMINAL BODY */}
      {isOpen && (
        <div className="relative">
          <div className="h-64 sm:h-80 overflow-y-auto p-4 space-y-1.5 font-mono text-[11px] leading-relaxed bg-[#030408] scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent select-text">
            {logs.length === 0 ? (
              <div className="text-slate-500 py-8 text-center italic">
                Esperando eventos del pipeline neuronal...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 group hover:bg-white/[0.02] p-0.5 rounded">
                  <span className="text-slate-600 select-none shrink-0 font-light">
                    {log.timestamp}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] border uppercase shrink-0 font-bold ${getLevelBadgeClass(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-slate-400 select-none shrink-0 font-semibold">
                    [{log.stage}]
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`break-words ${
                      log.level === 'ERROR' ? 'text-rose-300 font-bold' :
                      log.level === 'SUCCESS' ? 'text-emerald-300 font-semibold' :
                      log.level === 'AI' ? 'text-cyan-300' :
                      log.level === 'STEP' ? 'text-purple-300 font-semibold' :
                      log.level === 'WARN' ? 'text-amber-300' : 'text-slate-200'
                    }`}>
                      {log.message}
                    </span>
                    {log.details && (
                      <pre className="mt-1 p-2 rounded-lg bg-black/60 border border-white/[0.05] text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* TERMINAL FOOTER CONTROLS */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#080b12] border-t border-white/[0.04] text-[10px] text-slate-500 font-mono">
            <span>BulkScene Neural Diagnostic Stream · V2.0</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3 h-3 rounded accent-cyan-500 cursor-pointer"
              />
              <span>Auto-scroll</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioTerminal;
