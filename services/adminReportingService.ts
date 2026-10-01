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
 * Obtiene la configuración guardada de Telegram / Webhook
 */
export function getTelegramConfig(): AdminTelegramConfig {
  try {
    const raw = localStorage.getItem(STORAGE_TELEGRAM_CONFIG_KEY);
    if (raw) return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_TELEGRAM_CONFIG;
}

/**
 * Guarda la configuración de Telegram / Webhook
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
  const cfg = { ...getTelegramConfig(), ...overrideConfig };
  
  if (!cfg.telegramBotToken || !cfg.telegramChatId) {
    // Si no está configurado Telegram, probar genericWebhookUrl si existe
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
 * Registra un reporte de usuario y lo reenvía a Telegram y a la base de datos
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

  // 1. Guardar en almacenamiento local para el admin
  try {
    const raw = localStorage.getItem(STORAGE_USER_REPORTS_KEY);
    const existing: UserErrorReport[] = raw ? JSON.parse(raw) : [];
    const updated = [report, ...existing.slice(0, 99)];
    localStorage.setItem(STORAGE_USER_REPORTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[ADMIN REPORT] Error guardando en local:', err);
  }

  // 2. Guardar en Supabase si la tabla está disponible
  try {
    await supabase.from('reportes_soporte_admin').insert({
      id: report.id,
      user_email: report.userEmail,
      user_comment: report.userComment,
      stage: report.stage,
      error_code: report.errorCode,
      error_message: report.errorMessage,
      technical_details: report.technicalDetails,
      created_at: report.timestamp,
      status: 'pending'
    });
  } catch (err) {
    // Silencioso si la tabla no existe aún en Supabase
  }

  // 3. Notificar inmediatamente a Telegram
  const cfg = getTelegramConfig();
  if (cfg.notifyOnUserReport) {
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

    const teleRes = await sendTelegramMessage(telegramHtml);
    if (teleRes.success) {
      report.sentToTelegram = true;
    }
  }

  return report;
}

/**
 * Obtiene todos los reportes de usuario guardados
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
 * Marca un reporte como resuelto o pendiente
 */
export function updateUserReportStatus(reportId: string, status: 'pending' | 'resolved'): void {
  try {
    const reports = getUserErrorReports();
    const updated = reports.map(r => r.id === reportId ? { ...r, status } : r);
    localStorage.setItem(STORAGE_USER_REPORTS_KEY, JSON.stringify(updated));

    // Actualizar también en Supabase si es posible
    supabase.from('reportes_soporte_admin').update({ status }).eq('id', reportId).then(() => {});
  } catch (err) {
    console.error('Error actualizando estado del reporte:', err);
  }
}

/**
 * Elimina un reporte
 */
export function deleteUserReport(reportId: string): void {
  try {
    const reports = getUserErrorReports();
    const updated = reports.filter(r => r.id !== reportId);
    localStorage.setItem(STORAGE_USER_REPORTS_KEY, JSON.stringify(updated));

    supabase.from('reportes_soporte_admin').delete().eq('id', reportId).then(() => {});
  } catch (err) {
    console.error('Error eliminando reporte:', err);
  }
}

/**
 * Limpia todos los reportes
 */
export function clearAllUserReports(): void {
  try {
    localStorage.removeItem(STORAGE_USER_REPORTS_KEY);
  } catch {}
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
