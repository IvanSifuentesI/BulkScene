import JSZip from 'jszip';
import { SceneSlot } from '../types';

/**
 * Empaqueta y descarga un archivo ZIP ordenado cronológicamente.
 * Nomenclatura estricta zero-padded (ej: 001_escena.png, 002_escena.png)
 * para sincronización automática en CapCut, DaVinci Resolve y Premiere Pro.
 */
export async function exportSlotsToZip(
  slots: SceneSlot[],
  projectName: string = 'Proyecto_Video',
  useUpscaled: boolean = false
): Promise<void> {
  const zip = new JSZip();
  const folderName = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_escenas`;
  const imgFolder = zip.folder(folderName) || zip;

  let manifestText = `==========================================================\n`;
  manifestText += `PROYECTO: ${projectName}\n`;
  manifestText += `FECHA DE GENERACIÓN: ${new Date().toLocaleString()}\n`;
  manifestText += `TOTAL DE ESCENAS: ${slots.length}\n`;
  manifestText += `MODO DE RENDER: ${useUpscaled ? 'Upscale 2K/4K Activado' : 'Resolución Nativa'}\n`;
  manifestText += `ORDEN ESTRICTO DE MONTAJE (A-Z) PARA CAPCUT / PREMIERE\n`;
  manifestText += `==========================================================\n\n`;

  let csvContent = `"Numero","Archivo","Prompt_Original","Prompt_Compilado","Semilla"\n`;

  for (const slot of slots) {
    const rawDataUrl = (useUpscaled && slot.upscaledUrl) ? slot.upscaledUrl : slot.imageUrl;
    
    if (rawDataUrl && slot.status === 'completed') {
      // Extraer datos base64 puros
      const base64Data = rawDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const filename = `${slot.paddedNumber}_escena.png`;

      // Añadir imagen al ZIP con su nombre estrictamente ordenado
      imgFolder.file(filename, base64Data, { base64: true });

      manifestText += `[ESCENA ${slot.paddedNumber}] -> ${filename}\n`;
      manifestText += `Prompt: "${slot.rawPrompt}"\n`;
      manifestText += `Prompt Completo: "${slot.compiledPrompt}"\n`;
      manifestText += `Semilla: ${slot.seed} | Tiempo: ${slot.elapsedSeconds || 2.4}s\n\n`;

      csvContent += `"${slot.paddedNumber}","${filename}","${slot.rawPrompt.replace(/"/g, '""')}","${slot.compiledPrompt.replace(/"/g, '""')}","${slot.seed}"\n`;
    }
  }

  // Añadir archivos de metadatos de sincronización
  imgFolder.file(`000_ORDEN_ESCENAS_GUION.txt`, manifestText);
  imgFolder.file(`000_TIMELINE_CAPCUT.csv`, csvContent);

  // Generar blob del ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Disparar descarga en el navegador
  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
