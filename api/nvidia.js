export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // CORS universal para permitir llamadas seguras desde cualquier cliente
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
    const { modelEndpoint, apiKey, payload } = req.body || {};

    if (!apiKey) {
      return res.status(401).json({ error: 'Falta la clave API de NVIDIA.' });
    }

    if (!modelEndpoint) {
      return res.status(400).json({ error: 'Falta el identificador del modelo.' });
    }

    const targetUrl = `https://ai.api.nvidia.com/v1/genai/${modelEndpoint}`;

    const nvidiaResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });

    const status = nvidiaResponse.status;
    const text = await nvidiaResponse.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!nvidiaResponse.ok) {
      return res.status(status).json({
        error: data?.message || data?.detail || text || `Error ${status} en NVIDIA NIM`,
        status,
      });
    }

    if (data) {
      return res.status(200).json(data);
    } else {
      return res.status(200).send(text);
    }
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Error de conexión con el cluster de NVIDIA NIM',
    });
  }
}
