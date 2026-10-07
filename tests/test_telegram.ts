import { TELEGRAM_SUPPORT_CONFIG } from '../config/telegramConfig';

async function testTelegram() {
  const url = `https://api.telegram.org/bot${TELEGRAM_SUPPORT_CONFIG.botToken}/sendMessage`;
  const text = '🤖 <b>¡Conexión Exitosa con BulkScene Studio!</b>\n\n' +
    '✅ Tu bot de Telegram está vinculado correctamente al sistema de soporte.\n' +
    'A partir de ahora recibirás aquí los reportes de error que envíen los alumnos en tiempo real (0 Bytes en Supabase).\n\n' +
    `⏰ <i>Fecha: ${new Date().toLocaleString('es-ES')}</i>`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_SUPPORT_CONFIG.chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    console.log('Telegram response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

testTelegram();
