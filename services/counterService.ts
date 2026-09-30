
// --- INSTRUCCIONES ---
// 1. Elige un 'namespace' (nombre único para tu app) y una 'key' (nombre para el contador).
//    Ejemplo: namespace='mi-app-visual', key='visitas'
// 2. Reemplaza los valores de abajo con los que elegiste.
// 3. Para ver el contador, visita: https://api.countapi.xyz/get/TUNAMESPACE/TUKEY

const COUNTER_NAMESPACE: string = 'generador-visual-ai-global'; // <-- REEMPLAZA ESTO
const COUNTER_KEY: string = 'contador-de-uso'; // <-- REEMPLAZA ESTO

/**
 * Incrementa el contador de visitas global para la aplicación usando CountAPI.
 * Esta función se llama una vez cuando la aplicación se carga.
 * No bloquea la renderización y los fallos se manejan silenciosamente en la consola.
 */
export const incrementVisitCount = async (): Promise<void> => {
  // No hacer nada si las claves no se han configurado para evitar contadores de prueba.
  if (COUNTER_NAMESPACE === 'TUNAMESPACE' || COUNTER_KEY === 'TUKEY') {
    // Silenced warning to avoid cluttering the console if not configured
    return;
  }

  // Pre-check for offline status to avoid unnecessary errors
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
  }

  try {
    const url = `https://api.countapi.xyz/hit/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;
    // Usamos 'no-cors' porque solo necesitamos "golpear" el endpoint.
    // Wrap in a try-catch specifically for the network call
    await fetch(url, { mode: 'no-cors' }).catch(() => {}); 
  } catch (error) {
    // Si la API falla, lo ignoramos silenciosamente para no alarmar al usuario con errores rojos en consola.
  }
};
