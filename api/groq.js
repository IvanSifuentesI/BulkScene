export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utiliza POST.' });
  }

  try {
    const { apiKey, payload } = req.body || {};

    if (!apiKey) {
      return res.status(401).json({ error: 'Falta la clave API de Groq.' });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });

    const status = groqResponse.status;
    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return res.status(status).json({
        error: data?.error?.message || `Error ${status} en Groq API`,
        status,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Error de conexión con Groq API',
    });
  }
}
