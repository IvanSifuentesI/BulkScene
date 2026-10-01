/**
 * Servicio Central de Logs y Telemetría en Tiempo Real para Estudio Master.
 * Captura cada evento, inferencia, modelo LLM, prompt y error para diagnóstico
 * y visualización en la Terminal del usuario.
 */

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'AI' | 'STEP';

export interface StudioLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  stage: string;
  message: string;
  details?: any;
}

type LogListener = (logs: StudioLogEntry[]) => void;

class StudioLoggerService {
  private logs: StudioLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 500;

  constructor() {
    this.addLog('INFO', 'Sistema', 'Terminal de Diagnóstico de Estudio Master inicializada.');
  }

  public addLog(level: LogLevel, stage: string, message: string, details?: any) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    const entry: StudioLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: timeStr,
      level,
      stage,
      message,
      details
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notificar listeners
    this.notify();

    // Echo en consola dev
    const prefix = `[${entry.timestamp}] [${entry.stage}] [${entry.level}]`;
    if (level === 'ERROR') console.error(prefix, message, details || '');
    else if (level === 'WARN') console.warn(prefix, message, details || '');
    else console.log(prefix, message, details || '');
  }

  public getLogs(): StudioLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('INFO', 'Sistema', 'Terminal de logs limpiada por el usuario.');
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = [...this.logs];
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (e) {
        console.error('Error notificando listener de logs:', e);
      }
    });
  }

  public exportLogsAsText(): string {
    const lines = [
      '=================================================================',
      '       BULKSCENE STUDIO MASTER - LOGS DE DIAGNÓSTICO',
      `       Fecha de Exportación: ${new Date().toLocaleString()}`,
      '=================================================================\n'
    ];

    for (const log of this.logs) {
      let line = `[${log.timestamp}] [${log.level.padEnd(7)}] [${log.stage}]: ${log.message}`;
      if (log.details) {
        try {
          line += `\n    DETALLES: ${typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}`;
        } catch {}
      }
      lines.push(line);
    }

    return lines.join('\n');
  }
}

export const studioLogger = new StudioLoggerService();
