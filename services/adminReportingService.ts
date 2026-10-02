import { supabase } from '../config/supabaseClient';

export interface UserErrorReport {
  id: string;
  timestamp: string;
  userEmail: string;
  userComment: string;
  stage: string;
  errorCode?: string;
  errorMessage?: string;
  technicalDetails?: {
    model?: string;
    slotNumber?: string;
    promptSnippet?: string;
    stack?: string;
    browser?: string;
    url?: string;
  };
  status: 'pending' | 'resolved';
  sentToTelegram: boolean;
}

export interface AdminTelegramConfig {
  telegramBotToken: string;
  telegramChatId: string;
  genericWebhookUrl: string;
  notifyOnUserReport: boolean;
  notifyOnCriticalAutoError: boolean;
}

const STORAGE_USER_REPORTS_KEY = 'bulkscene_admin_user_reports';
const STORAGE_TELEGRAM_CONFIG_KEY = 'bulkscene_admin_telegram_config';

export const DEFAULT_TELEGRAM_CONFIG: AdminTelegramConfig = {
  telegramBotToken: '',
  telegramChatId: '',
  genericWebhookUrl: '',
  notifyOnUserReport: true,
  notifyOnCriticalAutoError: true
};

/**
 * Obtiene la configuración guardada de Telegram / Webhook (síncrona de caché local)
 */
export function getTelegramConfig(): AdminTelegramConfig {
  try {
    const raw = localStorage.getItem(STORAGE_TELEGRAM_CONFIG_KEY);
    if (raw) return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_TELEGRAM_CONFIG;
}

/**
 * Obtiene la configuración de Telegram desde Supabase (para que los alumnos usen las credenciales del admin)
 */
export async function fetchTelegramConfigFromCloud(): Promise<AdminTelegramConfig> {
  try {
    const { data, error } = await supabase
      .from('configuracion_soporte')
      .select('*')
      .eq('id', 'global_config')
      .maybeSingle();

    if (!error && data) {
      const cloudCfg: AdminTelegramConfig = {
        telegramBotToken: data.telegram_bot_token || '',
        telegramChatId: data.telegram_chat_id || '',
        genericWebhookUrl: data.generic_webhook_url || '',
        notifyOnUserReport: data.notify_on_user_report !== false,
        notifyOnCriticalAutoError: data.notify_on_critical_auto_error !== false
      };
      saveTelegramConfig(cloudCfg);
      return cloudCfg;
    }
  } catch (err) {
    // Si la tabla no está creada aún, usa la local
  }
  return getTelegramConfig();
}

/**
 * Guarda la configuración de Telegram / Webhook tanto localmente como en Supabase
 */
export async function saveTelegramConfigToCloud(config: AdminTelegramConfig): Promise<{ success: boolean; error?: string }> {
  saveTelegramConfig(config);
  try {
    const { error } = await supabase
      .from('configuracion_soporte')
      .upsert({
        id: 'global_config',
        telegram_bot_token: config.telegramBotToken.trim(),
        telegram_chat_id: config.telegramChatId.trim(),
        generic_webhook_url: config.genericWebhookUrl.trim(),
        notify_on_user_report: config.notifyOnUserReport,
        notify_on_critical_auto_error: config.notifyOnCriticalAutoError,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[ADMIN REPORT] Advertencia al sincronizar config con Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error guardando en Supabase' };
  }
}

/**
 * Guarda la configuración de Telegram / Webhook en memoria local
 */
export function saveTelegramConfig(config: AdminTelegramConfig): void {
  try {
    localStorage.setItem(STORAGE_TELEGRAM_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error guardando config de telegram:', e);
  }
}

/**
 * Envía un mensaje directo a Telegram a través de la API oficial de bots
 */
export async function sendTelegramMessage(textHtml: string, overrideConfig?: Partial<AdminTelegramConfig>): Promise<{ success: boolean; error?: string }> {
  let cfg = { ...getTelegramConfig(), ...overrideConfig };
  
  // Si no hay token en caché local, intentar obtenerlo de la nube de Supabase
  if (!cfg.telegramBotToken || !cfg.telegramChatId) {
    try {
      const cloudCfg = await fetchTelegramConfigFromCloud();
      cfg = { ...cloudCfg, ...overrideConfig };
    } catch {}
  }
  
  if (!cfg.telegramBotToken || !cfg.telegramChatId) {
    if (cfg.genericWebhookUrl) {
      try {
        await fetch(cfg.genericWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textHtml.replace(/<[^>]*>/g, '') })
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: 'Fallo al enviar a Webhook genérico: ' + err.message };
      }
    }
    return { success: false, error: 'Telegram Bot Token o Chat ID no configurados' };
  }

  const endpoint = `https://api.telegram.org/bot${cfg.telegramBotToken.trim()}/sendMessage`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cfg.telegramChatId.trim(),
        text: textHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de red al conectar con Telegram' };
  }
}

/**
 * Envía un mensaje de prueba a Telegram para comprobar conectividad
 */
export async function testTelegramConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
  const testMessage = `🤖 <b>¡Conexión Exitosa con BulkScene Studio!</b>\n\n` +
    `✅ Tu bot de Telegram está vinculado correctamente al panel de administración.\n` +
    `A partir de ahora recibirás aquí los reportes de error que envíen los alumnos en tiempo real.\n\n` +
    `⏰ <i>Fecha: ${new Date().toLocaleString('es-ES')}</i>`;

  const res = await sendTelegramMessage(testMessage, { telegramBotToken: botToken, telegramChatId: chatId });
  if (res.success) {
    return { success: true, message: '¡Mensaje de prueba recibido en Telegram con éxito!' };
  } else {
    return { success: false, message: res.error || 'No se pudo enviar el mensaje a Telegram.' };
  }
}

/**
 * Registra un reporte de usuario y lo reenvía a Supabase y a Telegram
 */
export async function submitUserErrorReport(params: {
  userEmail: string;
  userComment: string;
  stage: string;
  errorCode?: string;
  errorMessage?: string;
  technicalDetails?: UserErrorReport['technicalDetails'];
}): Promise<UserErrorReport> {
  const now = new Date();
  const reportId = `TICKET-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const report: UserErrorReport = {
    id: reportId,
    timestamp: now.toISOString(),
    userEmail: params.userEmail || 'alumno@bulkscene.ai',
    userComment: params.userComment,
    stage: params.stage,
    errorCode: params.errorCode || 'USER_REPORTED_ISSUE',
    errorMessage: params.errorMessage || 'Reporte manual enviado por el usuario',
    technicalDetails: {
      ...params.technicalDetails,
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconocido',
      url: typeof window !== 'undefined' ? window.location.href : ''
    },
    status: 'pending',
    sentToTelegram: false
  };

  // 1. Guardar en Supabase para que llegue directamente al administrador
  try {
    const { error: insertError } = await supabase.from('reportes_soporte_admin').insert({
      id: report.id,
      user_email: report.userEmail,
      user_comment: report.userComment,
      stage: report.stage,
      error_code: report.errorCode,
      error_message: report.errorMessage,
      technical_details: report.technicalDetails,
      created_at: report.timestamp,
      status: 'pending',
      sent_to_telegram: false
    });

    if (insertError) {
      console.warn('[ADMIN REPORT] Advertencia al insertar en Supabase:', insertError.message);
    }
  } catch (err) {
    console.warn('[ADMIN REPORT] Excepción guardando en Supabase:', err);
  }

  // 2. Guardar en almacenamiento local
  try {
    const raw = localStorage.getItem(STORAGE_USER_REPORTS_KEY);
    const existing: UserErrorReport[] = raw ? JSON.parse(raw) : [];
    const updated = [report, ...existing.slice(0, 99)];
    localStorage.setItem(STORAGE_USER_REPORTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[ADMIN REPORT] Error guardando en local:', err);
  }

  // 3. Notificar inmediatamente a Telegram
  let cfg = getTelegramConfig();
  if (!cfg.telegramBotToken) {
    cfg = await fetchTelegramConfigFromCloud();
  }

  if (cfg.notifyOnUserReport && cfg.telegramBotToken) {
    const telegramHtml = `🚨 <b>NUEVO REPORTE DE ERROR - BULKSCENE STUDIO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Ticket:</b> <code>${report.id}</code>\n` +
      `👤 <b>Usuario:</b> <code>${report.userEmail}</code>\n` +
      `📍 <b>Módulo:</b> <b>${report.stage}</b>\n` +
      `💬 <b>Lo que reportó el usuario:</b>\n` +
      `<i>"${report.userComment}"</i>\n\n` +
      (report.technicalDetails?.slotNumber ? `🎬 <b>Escena:</b> #${report.technicalDetails.slotNumber}\n` : '') +
      (report.technicalDetails?.model ? `🧠 <b>Modelo:</b> ${report.technicalDetails.model}\n` : '') +
      (report.errorMessage && report.errorMessage !== 'Reporte manual enviado por el usuario' 
        ? `⚠️ <b>Detalle Técnico:</b> <code>${report.errorMessage.substring(0, 200)}</code>\n` 
        : '') +
      `⏰ <b>Fecha:</b> ${new Date(report.timestamp).toLocaleString('es-ES')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <i>Revisa el panel en /admin para marcar como resuelto.</i>`;

    const teleRes = await sendTelegramMessage(telegramHtml, cfg);
    if (teleRes.success) {
      report.sentToTelegram = true;
      // Actualizar estado en Supabase
      supabase.from('reportes_soporte_admin').update({ sent_to_telegram: true }).eq('id', report.id).then(() => {});
    }
  }

  return report;
}

/**
 * Obtiene todos los reportes de usuario guardados en caché local
 */
export function getUserErrorReports(): UserErrorReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_USER_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Obtiene los reportes de usuario consultando directamente Supabase (Nube)
 * y actualizando la caché local para soporte offline.
 */
export async function fetchUserErrorReportsFromCloud(): Promise<{ reports: UserErrorReport[]; fromCloud: boolean }> {
  try {
    const { data, error } = await supabase
      .from('reportes_soporte_admin')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      const cloudReports: UserErrorReport[] = data.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at || new Date().toISOString(),
        userEmail: row.user_email || 'alumno@bulkscene.ai',
        userComment: row.user_comment || '',
        stage: row.stage || 'Sistema',
        errorCode: row.error_code || 'USER_REPORTED_ISSUE',
        errorMessage: row.error_message || '',
        technicalDetails: row.technical_details || {},
        status: (row.status === 'resolved' ? 'resolved' : 'pending'),
        sentToTelegram: Boolean(row.sent_to_telegram)
      }));

      // Guardar en caché local
      localStorage.setItem(STORAGE_USER_REPORTS_KEY, JSON.stringify(cloudReports));
      return { reports: cloudReports, fromCloud: true };
    }
  } catch (err) {
    console.warn('[ADMIN REPORT] No se pudo conectar con Supabase, usando caché local:', err);
  }

  // Fallback a almacenamiento local si Supabase falla o la tabla no está creada
  return { reports: getUserErrorReports(), fromCloud: false };
}

/**
 * Marca un reporte como resuelto o pendiente (en Supabase y localmente)
 */
export async function updateUserReportStatus(reportId: string, status: 'pending' | 'resolved'): Promise<void> {
  try {
    const reports = getUserErrorReports();
    const updated = reports.map(r => r.id === reportId ? { ...r, status } : r);
    localStorage.setItem(STORAGE_USER_REPORTS_KEY, JSON.stringify(updated));

    // Actualizar también en Supabase
    await supabase.from('reportes_soporte_admin').update({ status }).eq('id', reportId);
  } catch (err) {
    console.error('Error actualizando estado del reporte:', err);
  }
}

/**
 * Elimina un reporte (en Supabase y localmente)
 */
export async function deleteUserReport(reportId: string): Promise<void> {
  try {
    const reports = getUserErrorReports();
    const updated = reports.filter(r => r.id !== reportId);
    localStorage.setItem(STORAGE_USER_REPORTS_KEY, JSON.stringify(updated));

    await supabase.from('reportes_soporte_admin').delete().eq('id', reportId);
  } catch (err) {
    console.error('Error eliminando reporte:', err);
  }
}

/**
 * Limpia todos los reportes (en Supabase y localmente)
 */
export async function clearAllUserReports(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_USER_REPORTS_KEY);
    await supabase.from('reportes_soporte_admin').delete().neq('id', 'dummy_never_match');
  } catch {}
}

/**
 * Copia TODOS los reportes (de usuarios y de telemetría automática) en el formato
 * exacto listo para pegar en Antigravity y PURGA/BORRA todos los errores almacenados.
 */
export function copyAllErrorsForAntigravityAndPurge(): { count: number; text: string } {
  const userReports = getUserErrorReports();
  
  let telemetryReports: any[] = [];
  try {
    const raw = localStorage.getItem('bulkscene_telemetry_errors_log');
    if (raw) telemetryReports = JSON.parse(raw);
  } catch {}

  const totalReports = userReports.length + telemetryReports.length;
  if (totalReports === 0) {
    return { count: 0, text: '' };
  }

  const chunks: string[] = [];

  // 1. Reportes de usuario
  userReports.forEach((r) => {
    chunks.push(
      `TICKET: ${r.id}\nUsuario: ${r.userEmail}\nEtapa: ${r.stage}\nMensaje: ${r.userComment}\nError: ${r.errorMessage || 'N/A'}\nFecha: ${r.timestamp}`
    );
  });

  // 2. Errores de telemetría
  telemetryReports.forEach((t) => {
    chunks.push(
      `TICKET: ${t.id}\nUsuario: ${t.userEmail || 'N/A'}\nEtapa: ${t.stage}\nError: ${t.errorCode || ''}: ${t.errorMessage || ''}\nCausa: ${t.possibleCause || 'N/A'}\nFecha: ${t.timestamp}`
    );
  });

  const fullText = chunks.join('\n\n');

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(fullText);
  }

  // Purga obligatoria de todos los errores tras copiar para Antigravity
  clearAllUserReports();
  try {
    localStorage.removeItem('bulkscene_telemetry_errors_log');
  } catch {}

  return { count: totalReports, text: fullText };
}

export interface GlobalErrorModalEventDetail {
  title?: string;
  stage: string;
  errorCode?: string;
  errorMessage: string;
  possibleCause?: string;
  suggestedSolution?: string;
  technicalDetails?: any;
  onRetry?: () => void;
  onFallbackAction?: () => void;
  fallbackActionLabel?: string;
}

/**
 * Dispara el modal dinámico e interactivo de captura de error en cualquier parte de la app
 */
export function triggerGlobalErrorModal(detail: GlobalErrorModalEventDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bulkscene_dynamic_error_trigger', { detail }));
  }
}
