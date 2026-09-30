import { supabase } from '../config/supabaseClient';

export interface PricingConfig {
  price: number;
  currency: string;
  period: string;
  skoolUrl: string;
  skoolName: string;
  badge: string;
  offerHeadline: string;
  features: string[];
  lastUpdated?: string;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  price: 14,
  currency: 'USD',
  period: '/mes',
  skoolUrl: 'https://www.skool.com/ia-automatiza-7412',
  skoolName: 'Academia & Comunidad IA Automatiza',
  badge: '🔥 Acceso Total Todo Incluido',
  offerHeadline: 'BulkScene Studio + Comunidad Skool + Academia + Mentoría + Herramientas VIP',
  features: [
    'Herramienta BulkScene Studio (Generación Ilimitada de Imágenes, Sin APIs, Sin Pagos de Tokens y Escalado 4K Ultra-HD)',
    'Acceso directo a la Comunidad Privada en Skool (Networking de Creadores y Casos de Éxito)',
    'Academia y Formación Completa paso a paso en Automatización de Videos Virales',
    'Mentoría y Soporte Continuo con Iván Sifuentes',
    'Bóveda Secreta de Herramientas, Workflows de Automatización y Plantillas de Edición'
  ]
};

const STORAGE_KEY = 'bulkscene_pricing_config_cache';

/**
 * Obtiene la configuración de precios en tiempo real.
 * 1. Intenta consultar Supabase (para reflejar cambios de precio en vivo sin re-desplegar).
 * 2. Si falla o no está configurado, usa el caché local o el valor por defecto de 14 USD.
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  // 1. Verificar override local si existe
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed.price === 'number') {
        // Retornamos preliminarmente el cache mientras consultamos Supabase en segundo plano
      }
    }
  } catch (e) {
    console.warn('[PRICING] Error leyendo caché local:', e);
  }

  // 2. Consultar Supabase
  try {
    const { data, error } = await supabase
      .from('configuracion_app')
      .select('skool_price, skool_url, skool_name, offer_headline')
      .eq('clave', 'skool_membership')
      .maybeSingle();

    if (!error && data) {
      const remoteConfig: PricingConfig = {
        ...DEFAULT_PRICING_CONFIG,
        price: data.skool_price ?? DEFAULT_PRICING_CONFIG.price,
        skoolUrl: data.skool_url || DEFAULT_PRICING_CONFIG.skoolUrl,
        skoolName: data.skool_name || DEFAULT_PRICING_CONFIG.skoolName,
        offerHeadline: data.offer_headline || DEFAULT_PRICING_CONFIG.offerHeadline,
        lastUpdated: new Date().toISOString()
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteConfig));
      } catch {}
      return remoteConfig;
    }
  } catch (err) {
    console.info('[PRICING NOTICE] Usando configuración de precio base (14 USD):', err);
  }

  // Fallback seguro a 14 USD
  return DEFAULT_PRICING_CONFIG;
}

/**
 * Permite al administrador actualizar el precio y la URL de Skool
 * tanto en la base de datos de Supabase como localmente.
 */
export async function updateRemotePrice(newPrice: number, skoolUrl?: string): Promise<{ success: boolean; message: string }> {
  try {
    const updatedData = {
      clave: 'skool_membership',
      skool_price: newPrice,
      skool_url: skoolUrl || DEFAULT_PRICING_CONFIG.skoolUrl,
      actualizado_en: new Date().toISOString()
    };

    // Actualizar en Supabase
    const { error } = await supabase
      .from('configuracion_app')
      .upsert(updatedData, { onConflict: 'clave' });

    // Guardar en cache local
    const current = await getPricingConfig();
    current.price = newPrice;
    if (skoolUrl) current.skoolUrl = skoolUrl;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    if (error) {
      console.warn('[PRICING] No se pudo escribir en Supabase, guardado en cache local:', error);
      return { success: true, message: `Precio actualizado localmente a $${newPrice} USD.` };
    }

    return { success: true, message: `¡Precio sincronizado en vivo a $${newPrice} USD con Skool!` };
  } catch (err: any) {
    console.error('[PRICING] Error actualizando precio:', err);
    return { success: false, message: err?.message || 'Error al actualizar precio.' };
  }
}
