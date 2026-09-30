
import { supabase } from '../config/supabaseClient';

/**
 * Obtiene o genera un identificador único para el dispositivo actual.
 * Este ID se almacena en localStorage para persistencia entre recargas.
 */
export const getDeviceId = (): string => {
  const STORAGE_KEY = 'secure_device_uuid';
  
  // Intentar obtener del storage
  let uuid = localStorage.getItem(STORAGE_KEY);
  
  // Si no existe, crear uno nuevo
  if (!uuid) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      uuid = crypto.randomUUID();
    } else {
      // Fallback para navegadores antiguos
      uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem(STORAGE_KEY, uuid);
  }
  
  return uuid;
};

/**
 * Registra el dispositivo actual en la base de datos para el usuario dado.
 * Implementa rotación FIFO: Si hay 2 dispositivos, elimina el más antiguo antes de agregar el nuevo.
 */
export const registrarDispositivoEnBD = async (email: string) => {
  const deviceId = getDeviceId();
  
  // 1. Obtener la lista actual de dispositivos
  const { data, error: queryError } = await supabase
    .from('usuarios_autorizados')
    .select('device_ids')
    .eq('email', email)
    .single();

  if (queryError || !data) {
    console.error("Error consultando dispositivos:", queryError);
    throw new Error("Error al validar autorización del dispositivo.");
  }

  // Asegurarse de que sea un array, manejando nulos explícitamente
  const currentDevices: string[] = data.device_ids ?? [];

  // 2. Verificar si el dispositivo YA está registrado
  if (currentDevices.includes(deviceId)) {
    // Ya está autorizado, solo actualizamos el último acceso para auditoría
    const { error: updateError } = await supabase
      .from('usuarios_autorizados')
      .update({ 
        ultimo_acceso: new Date().toISOString()
      })
      .eq('email', email);
      
    if (updateError) throw new Error("Error actualizando sesión.");
    return;
  }

  // 3. Lógica de Único Dispositivo
  // En lugar de rotar o acumular, REEMPLAZAMOS cualquier dispositivo existente con el actual.
  // Esto garantiza que solo haya 1 dispositivo autorizado a la vez.
  const newDevices = [deviceId];

  const { error: insertError } = await supabase
    .from('usuarios_autorizados')
    .update({ 
      device_ids: newDevices,
      ultimo_acceso: new Date().toISOString()
    })
    .eq('email', email);

  if (insertError) {
    console.error("Error registrando nuevo dispositivo:", insertError);
    throw new Error("No se pudo registrar el dispositivo en la base de datos.");
  }
};

/**
 * Función auxiliar para limpiar el ID si fuera necesario (ej. logout completo)
 */
export const clearDeviceId = () => {
  localStorage.removeItem('secure_device_uuid');
};
