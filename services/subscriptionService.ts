import { supabase } from '../config/supabaseClient';

export interface SubscriptionValidationResult {
  isSubscribed: boolean;
  reason: 'active' | 'expired' | 'inactive' | 'not_found' | 'error';
  expirationDate?: string | null;
  email: string;
}

export interface SubscriptionModalTriggerDetail {
  featureName?: string;
  stage?: string;
  customMessage?: string;
}

const STORAGE_AUTH_SESSION_KEY = 'bulkscene_auth_session';
const STORAGE_USER_EMAIL_KEY = 'bulkscene_user_email';
const STORAGE_SUBSCRIPTION_ACTIVE_KEY = 'bulkscene_subscription_active';
const STORAGE_EXPIRATION_DATE_KEY = 'bulkscene_expiration_date';

export const SKOOL_CHECKOUT_URL = 'https://www.skool.com/ia-automatiza-7412';

export interface MarketingLeadRecord {
  email: string;
  tipo_lead: 'nuevo_prospecto' | 'suscripcion_expirada' | 'cuenta_inactiva';
  estado_suscripcion: 'sin_suscripcion' | 'expirado' | 'inactivo';
  fecha_expiracion_anterior?: string | null;
  origen?: string;
  intentos_acceso?: number;
  ultimo_intento?: string;
  creado_en?: string;
}

/**
 * Registra o actualiza un lead en la tabla 'leads_marketing' de Supabase.
 * Guarda a todos los usuarios que no cuentan con suscripción activa (nuevos o expirados)
 * para realizar campañas de email marketing.
 */
export async function registrarLeadMarketing(lead: MarketingLeadRecord): Promise<void> {
  const emailLower = lead.email.toLowerCase().trim();
  if (!emailLower || emailLower === 'admin@bulkscene.ai') return;

  const nowIso = new Date().toISOString();

  // 1. Guardar en respaldo local para el panel admin
  try {
    const raw = localStorage.getItem('bulkscene_local_leads_backup');
    const backupList: MarketingLeadRecord[] = raw ? JSON.parse(raw) : [];
    const existingIdx = backupList.findIndex(b => b.email.toLowerCase() === emailLower);
    
    if (existingIdx >= 0) {
      backupList[existingIdx] = {
        ...backupList[existingIdx],
        tipo_lead: lead.tipo_lead,
        estado_suscripcion: lead.estado_suscripcion,
        fecha_expiracion_anterior: lead.fecha_expiracion_anterior || backupList[existingIdx].fecha_expiracion_anterior,
        intentos_acceso: (backupList[existingIdx].intentos_acceso || 1) + 1,
        ultimo_intento: nowIso,
        origen: lead.origen || backupList[existingIdx].origen || 'bulkscene_login'
      };
    } else {
      backupList.unshift({
        email: emailLower,
        tipo_lead: lead.tipo_lead,
        estado_suscripcion: lead.estado_suscripcion,
        fecha_expiracion_anterior: lead.fecha_expiracion_anterior || null,
        intentos_acceso: 1,
        ultimo_intento: nowIso,
        creado_en: nowIso,
        origen: lead.origen || 'bulkscene_login'
      });
    }
    localStorage.setItem('bulkscene_local_leads_backup', JSON.stringify(backupList.slice(0, 500)));
  } catch (localErr) {
    console.warn('[LEADS BACKUP] Error guardando respaldo local:', localErr);
  }

  // 2. Insertar o actualizar directamente en Supabase (tabla leads_marketing)
  try {
    const { data: existing, error: searchError } = await supabase
      .from('leads_marketing')
      .select('id, intentos_acceso')
      .eq('email', emailLower)
      .maybeSingle();

    if (existing) {
      const nextCount = (existing.intentos_acceso || 1) + 1;
      await supabase
        .from('leads_marketing')
        .update({
          tipo_lead: lead.tipo_lead,
          estado_suscripcion: lead.estado_suscripcion,
          fecha_expiracion_anterior: lead.fecha_expiracion_anterior || null,
          intentos_acceso: nextCount,
          ultimo_intento: nowIso,
          origen: lead.origen || 'bulkscene_login'
        })
        .eq('email', emailLower);
    } else {
      await supabase
        .from('leads_marketing')
        .insert({
          email: emailLower,
          tipo_lead: lead.tipo_lead,
          estado_suscripcion: lead.estado_suscripcion,
          fecha_expiracion_anterior: lead.fecha_expiracion_anterior || null,
          intentos_acceso: 1,
          ultimo_intento: nowIso,
          creado_en: nowIso,
          origen: lead.origen || 'bulkscene_login'
        });
    }
  } catch (err: any) {
    // Si la tabla aún no se ha creado en Supabase con el script SQL, queda en el respaldo local
    console.warn('[LEADS MARKETING] Nota: pendiente ejecutar script SQL en Supabase para tabla leads_marketing:', err?.message || err);
  }
}

/**
 * Consulta la lista de leads de marketing desde Supabase o desde el almacenamiento local
 */
export async function fetchMarketingLeads(): Promise<MarketingLeadRecord[]> {
  try {
    const { data, error } = await supabase
      .from('leads_marketing')
      .select('*')
      .order('ultimo_intento', { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {}

  // Fallback al almacenamiento local
  try {
    const raw = localStorage.getItem('bulkscene_local_leads_backup');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Comprueba de manera síncrona si el usuario actual cuenta con suscripción activa.
 * Devuelve true si el correo es la cuenta administrativa o si la bandera de sesión es 'true'.
 */
export function isSubscriptionActive(): boolean {
  try {
    const email = (localStorage.getItem(STORAGE_USER_EMAIL_KEY) || '').toLowerCase().trim();
    if (email === 'admin@bulkscene.ai') {
      return true;
    }
    return localStorage.getItem(STORAGE_SUBSCRIPTION_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Obtiene los detalles de suscripción guardados en la sesión actual.
 */
export function getSubscriptionDetails() {
  const email = (localStorage.getItem(STORAGE_USER_EMAIL_KEY) || '').toLowerCase().trim();
  const isActive = isSubscriptionActive();
  const expirationDate = localStorage.getItem(STORAGE_EXPIRATION_DATE_KEY) || null;
  return { isActive, email, expirationDate };
}

/**
 * Dispara el evento global para abrir el modal interactivo de suscripción requerida.
 */
export function triggerSubscriptionModal(detail?: SubscriptionModalTriggerDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bulkscene_subscription_modal_trigger', {
        detail: detail || {}
      })
    );
  }
}

/**
 * Verificador para proteger acciones en la interfaz.
 * Si el usuario no tiene suscripción activa, detiene la ejecución y abre el modal informativo.
 * Retorna true si tiene permiso para continuar, o false si fue bloqueado.
 */
export function requireSubscription(featureName?: string, stage?: string): boolean {
  if (!isSubscriptionActive()) {
    triggerSubscriptionModal({ featureName, stage });
    return false;
  }
  return true;
}

/**
 * Valida el estado de un usuario contra la base de datos de Supabase (tabla usuarios_autorizados).
 * Comprueba:
 * 1. Si el correo existe.
 * 2. Si el usuario está activo (activo === true).
 * 3. Si tiene fecha de vencimiento.
 * 4. Si la fecha de vencimiento es posterior a la fecha y hora actual.
 *
 * Si el usuario no existe en Supabase, intenta registrarlo automáticamente como nuevo lead/prospecto.
 */
export async function validateUserSubscription(email: string): Promise<SubscriptionValidationResult> {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) {
    return {
      isSubscribed: false,
      reason: 'not_found',
      email: '',
      expirationDate: null
    };
  }

  // Excepción administrativa
  if (emailLower === 'admin@bulkscene.ai') {
    localStorage.setItem(STORAGE_SUBSCRIPTION_ACTIVE_KEY, 'true');
    return {
      isSubscribed: true,
      reason: 'active',
      email: emailLower,
      expirationDate: null
    };
  }

  try {
    const { data: userData, error: queryError } = await supabase
      .from('usuarios_autorizados')
      .select('fecha_expiracion, activo')
      .eq('email', emailLower)
      .maybeSingle();

    if (queryError) {
      console.warn('[SUBSCRIPTION SERVICE] Aviso de consulta Supabase:', queryError.message);
    }

    // Caso 1: El correo NO existe en Supabase -> Registrar en tabla leads_marketing
    if (!userData) {
      await registrarLeadMarketing({
        email: emailLower,
        tipo_lead: 'nuevo_prospecto',
        estado_suscripcion: 'sin_suscripcion',
        fecha_expiracion_anterior: null,
        origen: 'login_prospecto_nuevo'
      });

      localStorage.setItem(STORAGE_SUBSCRIPTION_ACTIVE_KEY, 'false');
      localStorage.removeItem(STORAGE_EXPIRATION_DATE_KEY);

      return {
        isSubscribed: false,
        reason: 'not_found',
        email: emailLower,
        expirationDate: null
      };
    }

    // Caso 2: El correo existe en Supabase -> verificar activo y vigencia
    const expDateStr = (userData as any).fecha_expiracion || (userData as any).fecha_vencimiento || null;
    const isActivo = Boolean(userData.activo);
    const hasValidDate = expDateStr ? new Date(expDateStr).getTime() > Date.now() : false;

    // Regla principal: Correo existente + usuario activo + fecha vigente = ACCESO COMPLETO
    if (isActivo && hasValidDate) {
      localStorage.setItem(STORAGE_SUBSCRIPTION_ACTIVE_KEY, 'true');
      if (expDateStr) localStorage.setItem(STORAGE_EXPIRATION_DATE_KEY, expDateStr);

      return {
        isSubscribed: true,
        reason: 'active',
        email: emailLower,
        expirationDate: expDateStr
      };
    }

    // Caso 3: Inactivo o expirado -> Registrar en tabla leads_marketing para reactivación
    localStorage.setItem(STORAGE_SUBSCRIPTION_ACTIVE_KEY, 'false');
    if (expDateStr) {
      localStorage.setItem(STORAGE_EXPIRATION_DATE_KEY, expDateStr);
    } else {
      localStorage.removeItem(STORAGE_EXPIRATION_DATE_KEY);
    }

    if (!isActivo) {
      await registrarLeadMarketing({
        email: emailLower,
        tipo_lead: 'cuenta_inactiva',
        estado_suscripcion: 'inactivo',
        fecha_expiracion_anterior: expDateStr,
        origen: 'login_cuenta_inactiva'
      });

      return {
        isSubscribed: false,
        reason: 'inactive',
        email: emailLower,
        expirationDate: expDateStr
      };
    }

    // Expirado (fue alumno anterior pero ya no está al día)
    await registrarLeadMarketing({
      email: emailLower,
      tipo_lead: 'suscripcion_expirada',
      estado_suscripcion: 'expirado',
      fecha_expiracion_anterior: expDateStr,
      origen: 'login_alumno_vencido'
    });

    return {
      isSubscribed: false,
      reason: 'expired',
      email: emailLower,
      expirationDate: expDateStr
    };
  } catch (err: any) {
    console.error('[SUBSCRIPTION SERVICE] Error comprobando membresía:', err);
    // Fallback: preservar estado en caché local para no interrumpir sesiones en caso de micro-caídas
    const cachedActive = localStorage.getItem(STORAGE_SUBSCRIPTION_ACTIVE_KEY) === 'true';
    return {
      isSubscribed: cachedActive,
      reason: 'error',
      email: emailLower,
      expirationDate: localStorage.getItem(STORAGE_EXPIRATION_DATE_KEY)
    };
  }
}

/**
 * Vuelve a validar la suscripción del usuario actualmente autenticado en segundo plano.
 */
export async function refreshCurrentSubscription(): Promise<boolean> {
  const currentEmail = localStorage.getItem(STORAGE_USER_EMAIL_KEY);
  if (!currentEmail) return false;
  const res = await validateUserSubscription(currentEmail);
  return res.isSubscribed;
}
