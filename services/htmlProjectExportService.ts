/**
 * Servicio de Generación y Exportación del Archivo Maestro HTML del Proyecto
 * 
 * Genera un documento HTML standalone, moderno y autónomo con:
 * - Guion completo de locución
 * - Contexto temporal, cultural y ambiental (CULTURAL_LOCK / CULTURAL_AVOID)
 * - Estilo visual cinematográfico generado (STYLE_LOCK / STYLE_AVOID)
 * - Análisis profundo y lista de elementos que NO deben inventarse
 * - Bóveda de personajes con continuidad biométrica (solo si existen personajes)
 * - Tarjetas de escena duales: Visual Prompt (Midjourney/FLUX) + Video Prompt (Kling/Luma/Gen-3)
 * - Botones maestros superiores: "🖼️ Copiar prompts de imagen" y "🎬 Copiar prompts de video"
 * - Botones individuales de copiado por prompt, tags ortogonales y tiempo fonético
 */

import { ScriptDeepAnalysis } from '../types';
import { getLocalDirHandle } from './localStudioSessionService';

export interface MasterStudioExportScene {
  sceneNumber: number;
  scriptSegment: string;
  visualPrompt: string;
  videoPrompt?: string;
  shotSize?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lighting?: string;
  palette?: string;
  textures?: string[];
  charactersPresent?: string[];
  durationSeconds?: number;
  startTime?: number;
  endTime?: number;
  isTimingEstimated?: boolean;
}

export interface MasterStudioExportData {
  projectName: string;
  generatedAt?: string;
  scriptText: string;
  narrativeMode?: string;
  deepAnalysis?: ScriptDeepAnalysis;
  culturalContext?: {
    epoch?: string;
    culture?: string;
    environment?: string;
    culturalLock?: string;
    culturalAvoid?: string;
    certaintyLevel?: string;
  };
  visualStyle?: {
    name: string;
    modifier: string;
    reason?: string;
    styleLock?: string;
    styleAvoid?: string;
  };
  characters?: Array<{
    name: string;
    role?: string;
    anchorDescription?: string;
    clothingAnchor?: string;
    characterLock?: string;
    defaultSeed?: number;
  }>;
  scenes: MasterStudioExportScene[];
}

function formatSrtTime(seconds: number): string {
  const s = Math.max(0, seconds || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const millis = Math.floor((s % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function generateMasterStudioHtml(data: MasterStudioExportData): string {
  const {
    projectName,
    generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'medium' }),
    scriptText,
    narrativeMode = 'Documental Secuencial',
    deepAnalysis,
    culturalContext = {},
    visualStyle = { name: 'Personalizado', modifier: '' },
    characters = [],
    scenes = []
  } = data;

  const totalDuration = scenes.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalWords = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;

  // Prompts serializados para el copiado masivo
  const imagePromptsArray = scenes.map(s => (s.visualPrompt || '').trim());
  const videoPromptsArray = scenes.map(s => (s.videoPrompt || '').trim());

  const imagePromptsJson = JSON.stringify(imagePromptsArray);
  const videoPromptsJson = JSON.stringify(videoPromptsArray);

  const cleanProjectName = projectName || 'BulkScene_Proyecto_Master';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cleanProjectName)} · Plan de Producción & Prompts Master</title>
  <style>
    :root {
      --bg-dark: #070d18;
      --bg-card: #0f172a;
      --border: rgba(255, 255, 255, 0.08);
      --cyan: #38bdf8;
      --purple: #c084fc;
      --amber: #fbbf24;
      --emerald: #34d399;
      --rose: #f43f5e;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      line-height: 1.6;
      padding: 32px 24px;
    }
    .container {
      max-width: 1300px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      flex-wrap: wrap;
      gap: 20px;
    }
    .header h1 {
      margin: 0;
      color: var(--cyan);
      font-size: 24px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header p {
      margin: 6px 0 0 0;
      color: var(--text-muted);
      font-size: 13px;
    }
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .btn-copy-prompts {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #1e293b;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-copy-prompts:hover {
      transform: translateY(-1px);
    }
    .btn-copy-image {
      border-color: rgba(56, 189, 248, 0.5);
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
    }
    .btn-copy-image:hover {
      background: rgba(56, 189, 248, 0.18);
      box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);
    }
    .btn-copy-video {
      border-color: rgba(192, 132, 252, 0.5);
      color: #c084fc;
      background: rgba(192, 132, 252, 0.08);
    }
    .btn-copy-video:hover {
      background: rgba(192, 132, 252, 0.18);
      box-shadow: 0 4px 12px rgba(192, 132, 252, 0.25);
    }

    .btn-mini {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-mini:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    /* STATS ROW */
    .stats-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .stat-pill {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      padding: 10px 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-pill strong { font-size: 16px; color: #fff; }
    .stat-pill span { font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; }

    /* METADATA CARDS */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 18px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .card-title {
      font-size: 13px;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-cyan { background: rgba(56, 189, 248, 0.15); color: var(--cyan); border: 1px solid rgba(56, 189, 248, 0.3); }
    .badge-purple { background: rgba(192, 132, 252, 0.15); color: var(--purple); border: 1px solid rgba(192, 132, 252, 0.3); }
    .badge-amber { background: rgba(251, 191, 36, 0.15); color: var(--amber); border: 1px solid rgba(251, 191, 36, 0.3); }
    .badge-emerald { background: rgba(52, 211, 153, 0.15); color: var(--emerald); border: 1px solid rgba(52, 211, 153, 0.3); }
    .badge-rose { background: rgba(244, 63, 94, 0.15); color: var(--rose); border: 1px solid rgba(244, 63, 94, 0.3); }

    /* SCENE CARDS GRID */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 20px;
    }
    .scene-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s, border-color 0.2s;
    }
    .scene-card:hover {
      border-color: rgba(56, 189, 248, 0.3);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      align-items: center;
    }
    .card-scene { color: var(--cyan); font-weight: 800; font-family: monospace; font-size: 12px; }
    .narration {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text);
      background: rgba(255, 255, 255, 0.03);
      padding: 10px 12px;
      border-radius: 8px;
      border-left: 3px solid var(--cyan);
      font-style: italic;
    }

    .scene-characters-block {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .scene-chars-heading {
      font-size: 10px;
      font-weight: 700;
      color: var(--cyan);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .scene-char-item {
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.4;
    }

    .prompt-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
    }
    .prompt-label-image {
      font-size: 11px;
      font-weight: 700;
      color: var(--cyan);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .prompt-label-video {
      font-size: 11px;
      font-weight: 700;
      color: var(--purple);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .prompt-box {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px;
      line-height: 1.6;
      color: #bae6fd;
      background: #030712;
      padding: 12px;
      border-radius: 10px;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid rgba(56, 189, 248, 0.15);
    }
    .prompt-box-video {
      border-color: rgba(192, 132, 252, 0.25);
      color: #f3e8ff;
      background: #0c0a1a;
    }

    .meta-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      font-size: 10px;
      margin-top: 4px;
    }
    .tag {
      background: rgba(255, 255, 255, 0.05);
      padding: 3px 8px;
      border-radius: 6px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .tag-cyan { color: var(--cyan); border: 1px solid rgba(56, 189, 248, 0.3); }
    .tag-purple { color: var(--purple); border: 1px solid rgba(192, 132, 252, 0.3); }
    .tag-amber { color: var(--amber); border: 1px solid rgba(251, 191, 36, 0.3); }
    .tag-emerald { color: var(--emerald); border: 1px solid rgba(52, 211, 153, 0.3); }

    /* SCRIPT BOX */
    .script-box {
      background: #05070a;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 14px;
      font-size: 12px;
      line-height: 1.7;
      color: #cbd5e1;
      max-height: 250px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    /* TOAST */
    #copy-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10b981;
      color: #000;
      font-weight: 800;
      font-size: 13px;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.25s ease;
      pointer-events: none;
      z-index: 9999;
    }
    #copy-toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>

  <div id="copy-toast">✅ Copiado al portapapeles</div>

  <div class="container">

    <!-- HEADER PRINCIPAL -->
    <div class="header">
      <div>
        <h1>🎬 ${escapeHtml(cleanProjectName)} · Prompts de Producción</h1>
        <p>
          Total Escenas: <strong>${scenes.length}</strong> · Duración Total: <strong>${formatSrtTime(totalDuration)}</strong> · Modo: <strong>${escapeHtml(narrativeMode)}</strong> · Idioma Prompts: <strong>100% English</strong>
        </p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-copy-prompts btn-copy-image" id="btn-copy-image-prompts" onclick="copyImagePrompts()">
          🖼️ Copiar prompts de imagen
        </button>
        <button type="button" class="btn-copy-prompts btn-copy-video" id="btn-copy-video-prompts" onclick="copyVideoPrompts()">
          🎬 Copiar prompts de video
        </button>
      </div>
    </div>

    <!-- METRICAS DE PRODUCCION -->
    <div class="stats-row">
      <div class="stat-pill">
        <strong>${scenes.length}</strong>
        <span>Escenas / Tomas</span>
      </div>
      <div class="stat-pill">
        <strong>${totalDuration.toFixed(1)}s</strong>
        <span>Duración Estimada</span>
      </div>
      <div class="stat-pill">
        <strong>${totalWords}</strong>
        <span>Palabras Guion</span>
      </div>
      <div class="stat-pill">
        <strong>${escapeHtml(visualStyle.name || 'Personalizado')}</strong>
        <span>Estilo Visual Activo</span>
      </div>
      <div class="stat-pill">
        <strong>${escapeHtml(culturalContext.epoch || 'Contemporáneo')}</strong>
        <span>Contexto Temporal</span>
      </div>
    </div>

    <!-- METADATOS Y BÓVEDA DE DIRECCIÓN -->
    <div class="meta-grid">
      <!-- CONTEXTO TEMPORAL Y CULTURAL -->
      <div class="card">
        <div class="card-title">
          <span>🏛️ Contexto Temporal & Cultural</span>
          <span class="badge badge-cyan">${escapeHtml(culturalContext.certaintyLevel || 'Inferencia')}</span>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div><strong style="color: var(--cyan);">Época:</strong> ${escapeHtml(culturalContext.epoch || 'Contemporánea / Actual')}</div>
          <div><strong style="color: var(--cyan);">Cultura:</strong> ${escapeHtml(culturalContext.culture || 'Universal')}</div>
          <div><strong style="color: var(--cyan);">Entorno:</strong> ${escapeHtml(culturalContext.environment || 'Realista')}</div>
          ${culturalContext.culturalLock ? `
          <div style="margin-top: 4px; padding: 8px; background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--cyan); border-radius: 6px;">
            <strong style="color: var(--cyan); font-size: 10px;">🔒 CULTURAL_LOCK:</strong>
            <p style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">${escapeHtml(culturalContext.culturalLock)}</p>
          </div>` : ''}
          ${culturalContext.culturalAvoid ? `
          <div style="margin-top: 2px; padding: 8px; background: rgba(244, 63, 94, 0.08); border-left: 3px solid var(--rose); border-radius: 6px;">
            <strong style="color: var(--rose); font-size: 10px;">⛔ CULTURAL_AVOID:</strong>
            <p style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">${escapeHtml(culturalContext.culturalAvoid)}</p>
          </div>` : ''}
        </div>
      </div>

      <!-- ESTILO VISUAL CINEMATOGRÁFICO -->
      <div class="card">
        <div class="card-title">
          <span>🎨 Estilo Visual (STYLE_LOCK)</span>
          <span class="badge badge-amber">${escapeHtml(visualStyle.name || 'Personalizado')}</span>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #fde68a; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; line-height: 1.5;">
          ${escapeHtml(visualStyle.modifier || 'Visual style custom tailored to script')}
        </div>
        ${visualStyle.reason ? `<p style="font-size: 11px; color: var(--text-muted); font-style: italic;">${escapeHtml(visualStyle.reason)}</p>` : ''}
        ${visualStyle.styleLock ? `
        <div style="padding: 6px 8px; background: rgba(251, 191, 36, 0.08); border-left: 3px solid var(--amber); border-radius: 6px;">
          <strong style="color: var(--amber); font-size: 10px;">🔒 STYLE_LOCK:</strong>
          <p style="font-size: 11px; color: #cbd5e1;">${escapeHtml(visualStyle.styleLock)}</p>
        </div>` : ''}
      </div>

      <!-- MEMORIA VISUAL & NO INVENTAR -->
      ${deepAnalysis ? `
      <div class="card">
        <div class="card-title">
          <span>🧠 Memoria Visual & Causalidad</span>
          <span class="badge badge-purple">Paso 1/5</span>
        </div>
        <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
          ${deepAnalysis.premise?.theme ? `<div><strong style="color: var(--purple);">Tema Central:</strong> <span style="color: #cbd5e1;">${escapeHtml(deepAnalysis.premise.theme)}</span></div>` : ''}
          ${deepAnalysis.visualSummary ? `<div><strong style="color: var(--cyan);">Resumen Visual:</strong> <span style="color: #cbd5e1;">${escapeHtml(deepAnalysis.visualSummary)}</span></div>` : ''}
          ${deepAnalysis.doNotInventList && deepAnalysis.doNotInventList.length > 0 ? `
          <div style="padding: 6px 8px; background: rgba(244, 63, 94, 0.08); border-left: 3px solid var(--rose); border-radius: 6px;">
            <strong style="color: var(--rose); font-size: 10px;">🚫 NO INVENTAR:</strong>
            <p style="font-size: 10.5px; color: #cbd5e1;">${escapeHtml(deepAnalysis.doNotInventList.slice(0, 4).join('; '))}</p>
          </div>` : ''}
        </div>
      </div>
      ` : ''}
    </div>

    <!-- GUION COMPLETO DE LOCUCIÓN -->
    <div class="card">
      <div class="card-title">
        <span>📜 Guion Completo de Locución</span>
        <button class="btn-mini" onclick="copyTextToClipboard(\`${escapeForTemplateLiteral(scriptText)}\`, 'Guion completo copiado')">
          Copiar Guion
        </button>
      </div>
      <div class="script-box">${escapeHtml(scriptText)}</div>
    </div>

    <!-- BÓVEDA DE PERSONAJES (Solo si existen) -->
    ${characters && characters.length > 0 ? `
    <div class="card">
      <div class="card-title">
        <span>👤 Bóveda de Personajes (${characters.length})</span>
        <span class="badge badge-purple">CHARACTER_LOCK</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
        ${characters.map((c, i) => `
        <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(192, 132, 252, 0.2); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #fff; font-size: 13px;">#${i + 1} ${escapeHtml(c.name)}</strong>
            <span class="badge badge-purple">${escapeHtml(c.role || 'PROTAGONIST')}</span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1;"><strong style="color: var(--purple);">Biometría:</strong> ${escapeHtml(c.anchorDescription || '')}</div>
          <div style="font-size: 11px; color: #cbd5e1;"><strong style="color: var(--purple);">Vestuario:</strong> ${escapeHtml(c.clothingAnchor || '')}</div>
          ${c.defaultSeed ? `<div style="font-size: 10px; color: var(--text-muted); font-family: monospace;">Seed: #${c.defaultSeed}</div>` : ''}
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- DESGLOSE DE ESCENAS & PROMPTS EN GRID -->
    <div class="grid">
      ${scenes.map(s => {
        const numStr = String(s.sceneNumber).padStart(2, '0');
        const startSec = typeof s.startTime === 'number' ? s.startTime : (s.sceneNumber - 1) * 4.5;
        const endSec = typeof s.endTime === 'number' ? s.endTime : startSec + (s.durationSeconds || 4.5);
        const durationSec = typeof s.durationSeconds === 'number' ? s.durationSeconds : (endSec - startSec);
        const timeRangeStr = `${formatSrtTime(startSec)} → ${formatSrtTime(endSec)} (${durationSec.toFixed(3)}s)`;

        const hasCharacters = Array.isArray(s.charactersPresent) && s.charactersPresent.length > 0;

        return `
        <div class="scene-card">
          <div class="card-top">
            <span class="card-scene">Escena #${numStr}</span>
            <span>${timeRangeStr}</span>
          </div>

          <div class="narration">${escapeHtml(s.scriptSegment)}</div>

          ${hasCharacters ? `
          <div class="scene-characters-block">
            <span class="scene-chars-heading">PERSONAJES PRESENTES:</span>
            <span class="scene-char-item">${escapeHtml(s.charactersPresent!.join(', '))}</span>
          </div>
          ` : `
          <div class="scene-characters-block" style="border-color: rgba(255,255,255,0.06); background: rgba(0,0,0,0.2);">
            <span style="color: #64748b; font-size: 11px;">Plano de entorno / Sin personajes físicos presentes</span>
          </div>
          `}

          <!-- PROMPT DE IMAGEN -->
          <div class="prompt-label-row">
            <span class="prompt-label-image">🖼️ Visual Prompt (100% English):</span>
            <button class="btn-mini" onclick="copyTextToClipboard(\`${escapeForTemplateLiteral(s.visualPrompt)}\`, 'Prompt de Imagen #${numStr} copiado')">Copiar</button>
          </div>
          <div class="prompt-box prompt-box-image">${escapeHtml(s.visualPrompt)}</div>

          <!-- PROMPT DE VIDEO -->
          ${s.videoPrompt ? `
          <div class="prompt-label-row">
            <span class="prompt-label-video">🎬 Video Prompt (Dynamic Motion):</span>
            <button class="btn-mini" onclick="copyTextToClipboard(\`${escapeForTemplateLiteral(s.videoPrompt)}\`, 'Prompt de Video #${numStr} copiado')">Copiar</button>
          </div>
          <div class="prompt-box prompt-box-video">${escapeHtml(s.videoPrompt)}</div>
          ` : ''}

          <!-- METADATOS Y TEXTURAS -->
          <div class="meta-row">
            ${s.cameraMovement ? `<span class="tag tag-cyan">🎥 ${escapeHtml(s.cameraMovement)}</span>` : (s.cameraAngle ? `<span class="tag tag-cyan">🎥 ${escapeHtml(s.cameraAngle)}</span>` : '')}
            ${s.shotSize ? `<span class="tag tag-purple">📐 ${escapeHtml(s.shotSize)}</span>` : ''}
            ${s.lighting ? `<span class="tag tag-amber">💡 ${escapeHtml(s.lighting)}</span>` : ''}
            ${s.palette ? `<span class="tag tag-emerald">🎨 ${escapeHtml(s.palette)}</span>` : ''}
            ${s.textures && s.textures.length > 0 ? `<span class="tag">🧵 ${escapeHtml(s.textures.join(', '))}</span>` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>

  </div>

  <script>
    const imagePromptsList = ${imagePromptsJson};
    const videoPromptsList = ${videoPromptsJson};

    function showToast(msg) {
      const toast = document.getElementById('copy-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2500);
    }

    function doClipboardCopy(text, btnElement, successMsg) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          showButtonFeedback(btnElement, successMsg);
          showToast(successMsg);
        }).catch(() => fallbackExecCopy(text, btnElement, successMsg));
      } else {
        fallbackExecCopy(text, btnElement, successMsg);
      }
    }

    function fallbackExecCopy(text, btnElement, successMsg) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const ok = document.execCommand('copy');
        if (ok) {
          showButtonFeedback(btnElement, successMsg);
          showToast(successMsg);
        } else {
          prompt('Copia manualmente con Ctrl+C:', text);
        }
      } catch (err) {
        prompt('Copia manualmente con Ctrl+C:', text);
      }
      document.body.removeChild(textArea);
    }

    function showButtonFeedback(btn, message) {
      if (!btn) return;
      const original = btn.innerHTML;
      btn.innerHTML = message;
      btn.style.background = '#10b981';
      btn.style.borderColor = '#059669';
      btn.style.color = '#ffffff';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2200);
    }

    function copyTextToClipboard(text, successMsg) {
      doClipboardCopy(text, null, successMsg || 'Copiado al portapapeles');
    }

    function copyImagePrompts() {
      if (!imagePromptsList || imagePromptsList.length === 0) {
        showToast('No hay prompts de imagen disponibles');
        return;
      }
      const formatted = imagePromptsList.join('\\n\\n');
      const btn = document.getElementById('btn-copy-image-prompts');
      doClipboardCopy(formatted, btn, '✅ ¡' + imagePromptsList.length + ' Prompts de Imagen Copiados!');
    }

    function copyVideoPrompts() {
      if (!videoPromptsList || videoPromptsList.length === 0) {
        showToast('No hay prompts de video disponibles');
        return;
      }
      const formatted = videoPromptsList.filter(Boolean).join('\\n\\n');
      const btn = document.getElementById('btn-copy-video-prompts');
      doClipboardCopy(formatted, btn, '✅ ¡' + videoPromptsList.length + ' Prompts de Video Copiados!');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeForTemplateLiteral(str: string): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

/**
 * Guarda o descarga automáticamente el archivo HTML en la carpeta del usuario
 */
export async function saveMasterStudioHtmlFile(params: {
  dirHandle?: any;
  projectName: string;
  htmlContent: string;
}): Promise<{ savedToDir: boolean; filename: string }> {
  const cleanName = (params.projectName || 'Proyecto_BulkScene')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${cleanName}_escenas_master.html`;

  let handleToUse = params.dirHandle;
  if (!handleToUse || typeof handleToUse.getFileHandle !== 'function') {
    try {
      const stored = await getLocalDirHandle();
      if (stored && typeof stored.getFileHandle === 'function') {
        handleToUse = stored;
      }
    } catch (err) {
      console.warn('[saveMasterStudioHtmlFile] Aviso al leer IndexedDB handle:', err);
    }
  }

  let savedToDir = false;
  if (handleToUse && typeof handleToUse.getFileHandle === 'function') {
    try {
      if (typeof handleToUse.queryPermission === 'function') {
        let perm = await handleToUse.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted' && typeof handleToUse.requestPermission === 'function') {
          perm = await handleToUse.requestPermission({ mode: 'readwrite' });
        }
      }

      const fileHandle = await handleToUse.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable({ keepExistingData: false });
      await writable.write(params.htmlContent);
      await writable.close();
      savedToDir = true;
      console.log(`[saveMasterStudioHtmlFile] ✅ HTML escrito exitosamente en la carpeta de destino: ${filename}`);
    } catch (e) {
      console.warn('[saveMasterStudioHtmlFile] Falló escritura directa en dirHandle:', e);
    }
  }

  // Descarga automática en navegador ÚNICAMENTE si no se pudo guardar directamente en la carpeta
  if (!savedToDir) {
    try {
      const blob = new Blob([params.htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      console.log(`[saveMasterStudioHtmlFile] 📥 Guardado mediante descarga de navegador de respaldo: ${filename}`);
    } catch (err) {
      console.warn('[saveMasterStudioHtmlFile] Error en descarga de respaldo:', err);
    }
  }

  return { savedToDir, filename };
}

