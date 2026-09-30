
import { Voice } from '../types';

interface TtsTaskPayload {
    text: string;
    voice_id: string;
    model_id: string;
    language: string;
    speed: number;
    pitch: number;
    volume: number;
    is_clone: boolean;
}

const buildCurlCommand = (payload: TtsTaskPayload, apiKey: string): string => {
    return `curl -X POST https://genaipro.vn/api/v1/max/tasks \\
-H "Authorization: Bearer ${apiKey}" \\
-H "Content-Type: application/json" \\
-d '${JSON.stringify(payload, null, 2)}'`;
};

// Helper to remove invisible characters for HTTP headers
const cleanApiKey = (key: string): string => {
    if (!key) return '';
    return key.replace(/[^\x21-\x7E]/g, '').trim();
};

export const startTtsTask = async (apiKey: string, payload: Omit<TtsTaskPayload, 'model_id'>): Promise<{id: string}> => {
    const fullPayload: TtsTaskPayload = {
        ...payload,
        model_id: "speech-2.5-hd-preview",
    };

    const cleanKey = cleanApiKey(apiKey);
    const curl = buildCurlCommand(fullPayload, cleanKey);

    try {
        const response = await fetch('https://genaipro.vn/api/v1/max/tasks', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cleanKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fullPayload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("TTS API Error:", errorBody);
            throw new Error(`Error de API (${response.status}): ${errorBody}\n\nComando cURL para depuración:\n${curl}`);
        }

        const result = await response.json();
        if (!result.id) {
            throw new Error(`La respuesta de la API no contiene un ID de tarea.\n\nComando cURL para depuración:\n${curl}`);
        }
        return result;
    } catch (error) {
        if (error instanceof Error && error.message.includes('cURL')) {
             throw error; // Re-throw already formatted errors
        }
        const originalMessage = error instanceof Error ? error.message : "Error desconocido.";
        throw new Error(`Error de red o de sistema al iniciar la tarea de TTS: ${originalMessage}\n\nComando cURL para depuración:\n${curl}`);
    }
};

export const getTtsTaskStatus = async (apiKey: string, taskId: string): Promise<any> => {
     try {
        const cleanKey = cleanApiKey(apiKey);
        const response = await fetch(`https://genaipro.vn/api/v1/max/tasks/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cleanKey}`,
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
             throw new Error(`Error de API al consultar estado (${response.status}): ${errorBody}`);
        }
        
        const result = await response.json();
        // Normalize status
        if (result.status === 'completed') {
            result.status = 'success';
        }

        return result;

    } catch (error) {
        throw new Error("Error de red al consultar el estado de la tarea de TTS.");
    }
};
