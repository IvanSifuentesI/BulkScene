// config.ts

// IMPORTANTE:
// 1. Ve a la Consola de Google Cloud: https://console.cloud.google.com/
// 2. Crea un nuevo proyecto (o selecciona uno existente).
// 3. Habilita la API de Google Drive para tu proyecto (en "APIs y servicios" -> "Biblioteca").
// 4. Configura la "Pantalla de consentimiento de OAuth".
// 5. Ve a "APIs y servicios" -> "Credenciales".
// 6. Haz clic en "Crear credenciales" -> "ID de cliente de OAuth".
// 7. Selecciona "Aplicación web".
// 8. En "Orígenes de JavaScript autorizados", debes añadir las URLs exactas donde se ejecutará tu aplicación.
//    - Para este entorno de desarrollo online, ejecuta la app y mira la URL de la ventana de vista previa. Cópiala.
//      Debería ser algo como: https://[una-serie-de-caracteres].googleusercontent.com
//      (IMPORTANTE: Google ya no permite comodines (*) en esta sección).
//    - Para desarrollo local, añade: http://localhost:5173 (o el puerto que uses).
// 9. Copia el "ID de cliente" que se genera y pégalo aquí abajo.

export const GOOGLE_CLIENT_ID = '65888073363-5i3s6a95njgbpianr2k1afunde1ljq9f.apps.googleusercontent.com'; // <-- REEMPLAZA ESTO