import { GOOGLE_CLIENT_ID } from '../config';
import { GoogleDriveFile } from '../types';

// Fix: Add declarations for gapi and google to resolve TypeScript errors.
declare const gapi: any;
declare const google: any;

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_DATA_FILE_NAME = 'guionista_yt_data.json';
const APP_DATA_FOLDER_NAME = 'Guionista AI para YouTube';

let gapiInited = false;
let gisInited = false;
let tokenClient: any | null = null;

export const initGoogleClient = (onInit: () => void) => {
    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = () => gapiLoaded(onInit);
    document.body.appendChild(scriptGapi);

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = () => gisLoaded(onInit);
    document.body.appendChild(scriptGis);
};


const gapiLoaded = (onInit: () => void) => {
    gapi.load('client', () => {
        gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
        }).then(() => {
            gapiInited = true;
            if (gisInited) onInit();
        });
    });
};

const gisLoaded = (onInit: () => void) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // Callback will be handled by the promise
    });
    gisInited = true;
    if (gapiInited) onInit();
};

export const getAccessToken = async (): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject("Google Token Client not initialized.");
        }
        
        tokenClient.callback = (resp: any) => {
            if (resp.error !== undefined) {
                return reject(resp);
            }
            resolve(gapi.client.getToken().access_token);
        };

        // This single call handles both initial and subsequent token requests silently.
        // It will only prompt for consent if the user has never authorized the app.
        // This fixes the infinite login loop.
        tokenClient.requestAccessToken({ prompt: '' });
    });
};


export const getOrCreateAppFolder = async (): Promise<string | null> => {
    await getAccessToken();
    try {
        const response = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${APP_DATA_FOLDER_NAME}' and trashed=false`,
            fields: 'files(id)',
            spaces: 'drive',
        });

        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        } else {
            const fileMetadata = {
                name: APP_DATA_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            };
            const createResponse = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            return createResponse.result.id;
        }
    } catch (err) {
        console.error("Error getting or creating app folder:", err);
        return null;
    }
};

export const searchFile = async (folderId: string): Promise<GoogleDriveFile | null> => {
    await getAccessToken();
    try {
        const response = await gapi.client.drive.files.list({
            q: `name='${APP_DATA_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name, kind, mimeType)'
        });
        const files = response.result.files;
        return (files && files.length > 0) ? files[0] as GoogleDriveFile : null;
    } catch (err) {
        console.error("Error searching for file:", err);
        return null;
    }
};

export const readFile = async (fileId: string): Promise<any | null> => {
    await getAccessToken();
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        return response.result;
    } catch (err) {
        console.error("Error reading file:", err);
        return null;
    }
};

export const saveFile = async (content: any, fileId: string | null = null, folderId: string | null = null): Promise<GoogleDriveFile | null> => {
    await getAccessToken();
    const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
        'name': APP_DATA_FILE_NAME,
        'mimeType': 'application/json',
    };
    
    const media = {
        mimeType: 'application/json',
        body: JSON.stringify(content),
    };

    try {
        let fileToUpdateId = fileId;

        if (!fileToUpdateId) {
            if (!folderId) {
                throw new Error("Folder ID is required to create a new file.");
            }
            fileMetadata.parents = [folderId];
            const createResponse = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            fileToUpdateId = createResponse.result.id;
            if (!fileToUpdateId) {
                throw new Error("Could not create the new file in Google Drive.");
            }
        }

        const updateRequest = gapi.client.request({
            path: `/upload/drive/v3/files/${fileToUpdateId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            body: media.body,
        });

        await updateRequest;
        
        return {
            id: fileToUpdateId,
            name: APP_DATA_FILE_NAME,
            kind: 'drive#file',
            mimeType: 'application/json'
        };

    } catch (err: any) {
        console.error("Error saving file:", err);
        if (err.result && err.result.error) {
            const { code, message } = err.result.error;
            if (code === 400) {
                throw new Error(`Error de Autorización (400): La solicitud fue rechazada por Google. Esto suele ser un problema de configuración.\n\n1. Ve a los Ajustes de la app (icono de engranaje).\n2. Copia la 'URL de Origen'.\n3. Ve a tu proyecto en Google Cloud Console -> APIs y Servicios -> Credenciales.\n4. Edita tu ID de cliente de OAuth.\n5. Pega la URL en la sección 'Orígenes de JavaScript autorizados'.`);
            }
            throw new Error(`Error de Google Drive (${code}): ${message}`);
        }
        throw new Error(err.message || "Error desconocido al guardar el archivo en Google Drive. Revisa la consola para más detalles.");
    }
};