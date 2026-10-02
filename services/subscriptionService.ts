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
  id?: string;
  email: string;
  tipo_lead: 'nuevo_prospecto' | 'suscripcion_expirada' | 'cuenta_inactiva';
  estado_suscripcion: 'sin_suscripcion' | 'expirado' | 'inactivo';
  fecha_expiracion_anterior?: string | null;
  origen?: string;
  intentos_acceso?: number;
  primer_intento?: string;
  ultimo_intento?: string;
  created_at?: string;
}

/**
 * Registra o actualiza un lead en la tabla 'leads_marketing' de Supabase.
 * Guarda a todos los usuarios que no cuentan con suscripción activa (nuevos o expirados)
 * para realizar campañas de email marketing.
 */
export async function registrarLeadMarketing(_lead: MarketingLeadRecord): Promise<void> {
  // Función desactivada: la tabla leads_marketing fue eliminada
  return;
}

export async function syncPendingLocalLeadsToSupabase(): Promise<void> {
  // Función desactivada: la tabla leads_marketing fue eliminada
  return;
}

export async function fetchMarketingLeads(): Promise<MarketingLeadRecord[]> {
  // Función desactivada: la tabla leads_marketing fue eliminada
  return [];
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
 * Información detallada para usuarios PRO con contador de días restantes y colores de urgencia.
 */
export interface ProSubscriptionInfo {
  isPro: boolean;
  email: string;
  expirationDate: string | null;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  urgency: 'green' | 'yellow' | 'red' | 'none';
  label: string;
  isExpiringSoon: boolean;
  skoolUrl: string;
}

/**
 * Calcula el estado de membresía PRO, días restantes y color de urgencia:
 * - Verde: muchos días restantes (> 5 días)
 * - Amarillo: ya está próximo (3 a 5 días)
 * - Rojo: hoy o mañana ya vence la suscripción (<= 2 días)
 */
export function getProSubscriptionInfo(): ProSubscriptionInfo {
  const email = (localStorage.getItem(STORAGE_USER_EMAIL_KEY) || '').toLowerCase().trim();
  const isActive = isSubscriptionActive();
  const expDateStr = localStorage.getItem(STORAGE_EXPIRATION_DATE_KEY) || null;

  if (email === 'admin@bulkscene.ai') {
    return {
      isPro: true,
      email,
      expirationDate: null,
      daysRemaining: 999,
      hoursRemaining: 999 * 24,
      urgency: 'green',
      label: 'Acceso Permanente',
      isExpiringSoon: false,
      skoolUrl: SKOOL_CHECKOUT_URL
    };
  }

  if (!isActive) {
    return {
      isPro: false,
      email,
      expirationDate: expDateStr,
      daysRemaining: 0,
      hoursRemaining: 0,
      urgency: 'none',
      label: 'Sin suscripción',
      isExpiringSoon: false,
      skoolUrl: SKOOL_CHECKOUT_URL
    };
  }

  if (!expDateStr) {
    return {
      isPro: true,
      email,
      expirationDate: null,
      daysRemaining: null,
      hoursRemaining: null,
      urgency: 'green',
      label: 'Activo',
      isExpiringSoon: false,
      skoolUrl: SKOOL_CHECKOUT_URL
    };
  }

  const expTime = new Date(expDateStr).getTime();
  const now = Date.now();
  const diffMs = expTime - now;

  if (diffMs <= 0) {
    return {
      isPro: false,
      email,
      expirationDate: expDateStr,
      daysRemaining: 0,
      hoursRemaining: 0,
      urgency: 'none',
      label: 'Vencido',
      isExpiringSoon: true,
      skoolUrl: SKOOL_CHECKOUT_URL
    };
  }

  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Clasificación de color solicitada:
  // - verde: muchos días restantes
  // - amarillo: próximo a vencer
  // - rojo: hoy o mañana ya vence
  if (daysRemaining <= 2) {
    const timeText = daysRemaining <= 1 ? (hoursRemaining <= 24 ? `${hoursRemaining}h restantes` : 'Vence mañana') : '2 días restantes';
    return {
      isPro: true,
      email,
      expirationDate: expDateStr,
      daysRemaining,
      hoursRemaining,
      urgency: 'red',
      label: timeText,
      isExpiringSoon: true,
      skoolUrl: SKOOL_CHECKOUT_URL
    };
  }

  if (daysRemaining <= 5) {
    return {
      isPro: true,
      email,
      expirationDate: expDateStr,
      daysRemaining,
      hoursRemaining,
      urgency: 'yellow',
      label: `${daysRemaining} días restantes`,
      isExpiringSoon: false,
      skoolUrl: SKOOL_CHECKOUT_URL
    };
  }

  return {
    isPro: true,
    email,
    expirationDate: expDateStr,
    daysRemaining,
    hoursRemaining,
    urgency: 'green',
    label: `${daysRemaining} días restantes`,
    isExpiringSoon: false,
    skoolUrl: SKOOL_CHECKOUT_URL
  };
}

/**
 * Inicia la verificación periódica de suscripción cada 1 minuto (60 segundos).
 * Comprueba contra la base de datos de Supabase y recalcula los días restantes.
 * Notifica a la UI mediante 'bulkscene_subscription_updated' para que se actualice de inmediato.
 */
export function startSubscriptionHeartbeat(onTick?: (info: ProSubscriptionInfo) => void): () => void {
  const check = async () => {
    const currentEmail = localStorage.getItem(STORAGE_USER_EMAIL_KEY);
    if (currentEmail && currentEmail !== 'admin@bulkscene.ai') {
      try {
        await validateUserSubscription(currentEmail);
      } catch (e) {
        console.warn('[SUBSCRIPTION HEARTBEAT] Error verificando con Supabase:', e);
      }
    }
    const info = getProSubscriptionInfo();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bulkscene_subscription_updated', { detail: info }));
    }
    if (onTick) onTick(info);
  };

  // Verificación inicial
  check();

  // Verificación constante cada 1 minuto (60,000 ms)
  const timer = setInterval(check, 60000);

  return () => clearInterval(timer);
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

    // Caso 1: El correo NO existe en la base de datos de usuarios autorizados
    if (!userData) {
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

    // Caso 3: Inactivo o expirado
    localStorage.setItem(STORAGE_SUBSCRIPTION_ACTIVE_KEY, 'false');
    if (expDateStr) {
      localStorage.setItem(STORAGE_EXPIRATION_DATE_KEY, expDateStr);
    } else {
      localStorage.removeItem(STORAGE_EXPIRATION_DATE_KEY);
    }

    if (!isActivo) {
      return {
        isSubscribed: false,
        reason: 'inactive',
        email: emailLower,
        expirationDate: expDateStr
      };
    }

    // Expirado (la fecha ya venció)
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
