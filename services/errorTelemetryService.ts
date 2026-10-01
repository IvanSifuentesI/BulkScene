import { supabase } from '../config/supabaseClient';
import { triggerGlobalErrorModal } from './adminReportingService';

export interface TelemetryErrorReport {
  id: string;
  timestamp: string;
  errorCode: string;
  errorMessage: string;
  possibleCause: string;
  suggestedSolution: string;
  stage: string;
  userEmail?: string;
  userAgent?: string;
  contextData?: {
    model?: string;
    slotId?: string;
    slotNumber?: string;
    promptSnippet?: string;
    seed?: number;
    errorStatus?: number;
    stack?: string;
  };
  reportedToCloud: boolean;
}

export interface ReportErrorOptions {
  error: any;
  stage: 'Director' | 'Generador Masivo' | 'Whisper' | 'Escenas' | 'Personajes' | 'Estilos' | 'Ajustes' | 'Sistema';
  slotNumber?: string;
  promptSnippet?: string;
  model?: string;
  seed?: number;
}

const STORAGE_ERRORS_KEY = 'bulkscene_telemetry_errors_log';
const WEBHOOK_STORAGE_KEY = 'bulkscene_telemetry_webhook_url';

/**
 * Analiza un error y deduce su causa raíz y solución recomendada
 */
function analyzeErrorRootCause(error: any): { code: string; cause: string; solution: string } {
  const message = (error?.message || String(error) || '').toLowerCase();
  const status = error?.status || error?.statusCode || 0;

  if (status === 422 || message.includes('422') || message.includes('unprocessable') || message.includes('moderation') || message.includes('safety')) {
    return {
      code: 'ERR_NVIDIA_422_CENSORSHIP',
      cause: 'Filtro de seguridad o moderación de NVIDIA activado. El prompt contiene descriptores o palabras sensibles no admitidas por el cluster.',
      solution: 'Reformular el prompt sustituyendo términos violentos o sensibles por lenguaje cinematográfico artístico neutral. Se puede activar reintento automático.'
    };
  }

  if (status === 401 || message.includes('401') || message.includes('unauthorized') || message.includes('invalid api key')) {
    return {
      code: 'ERR_API_401_UNAUTHORIZED',
      cause: 'Clave API de NVIDIA o Groq rechazada o expirada.',
      solution: 'Verifica tus claves en la pestaña Ajustes & APIs o genera un nuevo token en build.nvidia.com / console.groq.com.'
    };
  }

  if (status === 429 || message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
    return {
      code: 'ERR_API_429_RATE_LIMIT',
      cause: 'Límite de peticiones concurrentes o cuota excedida temporalmente en el cluster.',
      solution: 'El sistema rota automáticamente entre tus claves cargadas. Si persiste, usa el modo "Seguro (2.0s)" en el Generador Masivo.'
    };
  }

  if (status >= 500 || message.includes('500') || message.includes('502') || message.includes('503') || message.includes('server error')) {
    return {
      code: 'ERR_REMOTE_500_CLUSTER_OUTAGE',
      cause: 'Sobrecarga temporal o indisponibilidad en los servidores de inferencia de NVIDIA o Groq.',
      solution: 'Reintentar la generación en unos instantes o seleccionar otro modelo disponible (ej. FLUX.1 Schnell o Qwen Image).'
    };
  }

  if (message.includes('network') || message.includes('failed to fetch') || message.includes('cors')) {
    return {
      code: 'ERR_NETWORK_DISCONNECTED',
      cause: 'Fallo de conexión a Internet o bloqueo de peticiones externas en el navegador.',
      solution: 'Verifica tu conexión a Internet o desactiva extensiones de bloqueo agresivas en el navegador.'
    };
  }

  return {
    code: 'ERR_GENERIC_EXECUTION',
    cause: error?.message || 'Error imprevisto en la ejecución del pipeline.',
    solution: 'Copia el diagnóstico técnico con el botón inferior y compártelo con el administrador para resolverlo.'
  };
}

/**
 * Reporta un error de forma automática a Supabase, Webhook y caché local
 */
export async function reportTelemetryError(options: ReportErrorOptions): Promise<TelemetryErrorReport> {
  const analysis = analyzeErrorRootCause(options.error);
  const now = new Date();
  const errorId = `ERR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  let userEmail = 'creador@bulkscene.ai';
  try {
    userEmail = localStorage.getItem('bulkscene_user_email') || userEmail;
  } catch {}

  const report: TelemetryErrorReport = {
    id: errorId,
    timestamp: now.toISOString(),
    errorCode: analysis.code,
    errorMessage: options.error?.message || String(options.error),
    possibleCause: analysis.cause,
    suggestedSolution: analysis.solution,
    stage: options.stage,
    userEmail,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown',
    contextData: {
      model: options.model,
      slotNumber: options.slotNumber,
      promptSnippet: options.promptSnippet ? options.promptSnippet.substring(0, 300) : undefined,
      seed: options.seed,
      errorStatus: options.error?.status,
      stack: options.error?.stack ? String(options.error.stack).substring(0, 500) : undefined
    },
    reportedToCloud: false
  };

  // 1. Guardar en memoria local (últimos 50 errores)
  try {
    const existingRaw = localStorage.getItem(STORAGE_ERRORS_KEY);
    const existing: TelemetryErrorReport[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [report, ...existing.slice(0, 49)];
    localStorage.setItem(STORAGE_ERRORS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[TELEMETRY] Error guardando log local:', e);
  }

  // 2. Enviar a Supabase si la tabla existe
  try {
    const { error: dbError } = await supabase
      .from('errores_telemetria')
      .insert({
        report_id: report.id,
        user_email: report.userEmail,
        stage: report.stage,
        error_code: report.errorCode,
        error_message: report.errorMessage,
        possible_cause: report.possibleCause,
        suggested_solution: report.suggestedSolution,
        context_data: report.contextData,
        created_at: report.timestamp
      });

    if (!dbError) {
      report.reportedToCloud = true;
    }
  } catch (err) {
    // Si la tabla aún no fue creada en Supabase, no bloquea al usuario
    console.info('[TELEMETRY NOTICE] Registro local completado (Supabase en espera):', err);
  }

  // 3. Enviar a Webhook opcional (Discord / Telegram / Slack)
  try {
    const webhookUrl = localStorage.getItem(WEBHOOK_STORAGE_KEY) || (import.meta as any).env?.VITE_TELEMETRY_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **[BulkScene Telemetría de Error]**\n- **ID:** \`${report.id}\`\n- **Código:** \`${report.errorCode}\`\n- **Usuario:** ${report.userEmail}\n- **Etapa:** ${report.stage}\n- **Mensaje:** ${report.errorMessage}\n- **Causa:** ${report.possibleCause}\n- **Solución:** ${report.suggestedSolution}`
        })
      }).catch(() => {});
    }
  } catch {}

  // 4. Emitir evento en el navegador para que modales reactivos o notificadores muestren el aviso
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bulkscene_error_telemetry', { detail: report }));
    }
  } catch {}

  return report;
}

/**
 * Obtiene el historial de reportes de error almacenados
 */
export function getStoredErrorReports(): TelemetryErrorReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_ERRORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Limpia el historial de errores local
 */
export function clearStoredErrorReports(): void {
  try {
    localStorage.removeItem(STORAGE_ERRORS_KEY);
  } catch {}
}

/**
 * Formatea un reporte de error en texto legible para copiar con 1 clic al portapapeles
 */
export function formatErrorForClipboard(report: TelemetryErrorReport): string {
  return `=========================================================
🚨 REPORTE DE DIAGNÓSTICO BULKSCENE STUDIO
=========================================================
ID de Error: ${report.id}
Fecha/Hora: ${new Date(report.timestamp).toLocaleString('es-ES')}
Etapa: ${report.stage} ${report.contextData?.slotNumber ? `(Plano #${report.contextData.slotNumber})` : ''}
Modelo: ${report.contextData?.model || 'No especificado'}
Código: ${report.errorCode}
Mensaje Técnico: ${report.errorMessage}

🔍 Causa Probable:
${report.possibleCause}

💡 Solución Recomendada:
${report.suggestedSolution}

${report.contextData?.promptSnippet ? `📝 Prompt que generó el error:\n"${report.contextData.promptSnippet}"\n` : ''}
Usuario: ${report.userEmail || 'Anónimo'}
Navegador/SO: ${report.userAgent || 'Desconocido'}
=========================================================`;
}

/**
 * Inicializa escuchadores globales de excepciones no capturadas
 */
export function initGlobalErrorTelemetry(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    reportTelemetryError({
      error: event.error || event.message,
      stage: 'Sistema'
    });

    const msg = String(event.error?.message || event.message || '');
    if (!msg.includes('ResizeObserver') && !msg.includes('Script error')) {
      triggerGlobalErrorModal({
        title: 'Excepción No Capturada en el Sistema',
        stage: 'Sistema / Scripts',
        errorCode: 'UNHANDLED_ERROR',
        errorMessage: msg,
        technicalDetails: { stack: event.error?.stack }
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportTelemetryError({
      error: event.reason,
      stage: 'Sistema'
    });

    const msg = String(event.reason?.message || event.reason || '');
    if (!msg.includes('ResizeObserver')) {
      triggerGlobalErrorModal({
        title: 'Fallo Asíncrono no Controlado',
        stage: 'Sistema / Conexión',
        errorCode: 'UNHANDLED_REJECTION',
        errorMessage: msg,
        technicalDetails: { reason: String(event.reason) }
      });
    }
  });
}
