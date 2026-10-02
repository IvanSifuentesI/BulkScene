import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';
import { reportTelemetryError } from '../services/errorTelemetryService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado en el árbol de componentes:', error, errorInfo);
    this.setState({ errorInfo });
    try {
      reportTelemetryError({
        error: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        },
        stage: 'Sistema'
      });
    } catch (e) {
      // Ignorar si falla el reporte
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('bulkscene_studio_master_session_v1');
      localStorage.removeItem('bulkscene_active_character_id');
      localStorage.removeItem('bulkscene_active_style_id');
    } catch {}
    window.location.href = '/app';
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const rawMsg = this.state.error?.message;
      const errorMessage = typeof rawMsg === 'string'
        ? rawMsg
        : (rawMsg ? JSON.stringify(rawMsg) : 'Error inesperado en la interfaz.');

      return (
        <div className="min-h-screen bg-[#06070a] text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#0b0e17] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">
                Se detectó una interrupción al cargar el Estudio
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                El sistema aisló el error para proteger tus datos de proyecto. Puedes recargar o reparar la sesión local.
              </p>
            </div>

            <div className="bg-[#07090e] border border-white/[0.06] rounded-2xl p-3.5 text-left">
              <span className="text-[10px] font-mono text-red-400 block mb-1 uppercase font-bold">
                Detalle del Error:
              </span>
              <p className="text-xs font-mono text-slate-300 break-words">
                {typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar Página</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#141924] hover:bg-[#1c2333] border border-white/10 hover:border-white/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Restaura la sesión local limpia para resolver bloqueos por datos desactualizados"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Reparar Sesión</span>
              </button>
            </div>

            <div className="pt-2 border-t border-white/[0.04]">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Volver al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
