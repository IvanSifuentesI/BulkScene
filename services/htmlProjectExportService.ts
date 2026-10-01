/**
 * Servicio de Generación y Exportación del Archivo Maestro HTML del Proyecto
 * 
 * Genera un documento HTML standalone, moderno y autónomo con:
 * - Guion completo de locución
 * - Contexto temporal, cultural y ambiental
 * - Estilo visual cinematográfico generado
 * - Fichas biométricas y de vestuario de personajes
 * - Tabla y tarjetas de escenas con timestamps, encuadres y prompts completos
 * - Botón interactivo "Copiar todos los prompts de imágenes (1 por línea)"
 * - Botones individuales de copiado por escena y personaje
 */

import { ScriptDeepAnalysis } from '../types';

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
  scenes: Array<{
    sceneNumber: number;
    scriptSegment: string;
    visualPrompt: string;
    cameraAngle?: string;
    lighting?: string;
    charactersPresent?: string[];
    durationSeconds?: number;
    startTime?: number;
    endTime?: number;
  }>;
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

  // Prompts crudos serializados en JSON para el script del botón de copiar
  const promptsArray = scenes.map(s => s.visualPrompt.trim());
  const promptsJson = JSON.stringify(promptsArray);

  const cleanProjectName = projectName || 'BulkScene_Proyecto_Master';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cleanProjectName)} · Plan de Rodaje & Prompts Master</title>
  <style>
    :root {
      --bg: #07090e;
      --card-bg: #0d111a;
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #10b981;
      --cyan: #06b6d4;
      --purple: #a855f7;
      --amber: #f59e0b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      padding: 24px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    header {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08));
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 24px 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .header-title h1 {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-title p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
    .badge-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

    .header-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .stat-box {
      background: rgba(0, 0, 0, 0.3);
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      text-align: center;
    }
    .stat-val { font-size: 18px; font-weight: 800; color: #fff; }
    .stat-lbl { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }

    /* ACTION BAR CON BOTON PRINCIPAL */
    .action-bar {
      background: var(--card-bg);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 16px;
      padding: 16px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
    }
    .action-text {
      display: flex;
      flex-direction: column;
    }
    .action-text strong { font-size: 14px; color: #fff; }
    .action-text span { font-size: 12px; color: var(--text-muted); }
    
    .btn-main {
      background: linear-gradient(135deg, #10b981, #06b6d4);
      color: #000;
      font-weight: 800;
      font-size: 13px;
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
    }
    .btn-main:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-weight: 600;
      font-size: 11px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* CARDS */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 10px;
    }

    /* GRID COLUMNS FOR METADATA */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    /* GUION DISPLAY */
    .script-box {
      background: #05070a;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      font-size: 12px;
      line-height: 1.7;
      color: #cbd5e1;
      max-height: 280px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    /* PERSONAJES */
    .chars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .char-card {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(168, 85, 247, 0.25);
      border-radius: 14px;
      padding: 16px;
    }
    .char-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .char-name { font-size: 14px; font-weight: 800; color: #fff; }
    .char-detail { font-size: 11px; color: #cbd5e1; margin-bottom: 8px; }
    .char-detail strong { color: #c084fc; }

    /* ESCENAS TABLE & CARDS */
    .scenes-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .scene-row {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      border-left: 4px solid var(--cyan);
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.2s;
    }
    .scene-row:hover {
      border-color: rgba(6, 182, 212, 0.4);
      background: rgba(6, 182, 212, 0.02);
    }
    .scene-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .scene-num {
      font-size: 13px;
      font-weight: 800;
      color: var(--cyan);
      font-family: monospace;
    }
    .scene-timing {
      font-size: 11px;
      color: var(--text-muted);
      font-family: monospace;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 6px;
    }
    .scene-segment {
      font-size: 12px;
      color: #e2e8f0;
      font-style: italic;
      border-left: 2px solid rgba(255, 255, 255, 0.1);
      padding-left: 10px;
    }
    .scene-prompt {
      background: #05070a;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 12px;
      font-size: 11px;
      color: #67e8f9;
      font-family: "SF Mono", Consolas, Monaco, monospace;
      line-height: 1.5;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .scene-prompt span { flex: 1; word-break: break-word; }

    /* TOAST ALERT */
    #copy-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10b981;
      color: #000;
      font-weight: 800;
      font-size: 13px;
      padding: 14px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      pointer-events: none;
      z-index: 1000;
    }
    #copy-toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>

  <div id="copy-toast">✅ ¡Prompts copiados al portapapeles!</div>

  <div class="container">

    <!-- HEADER DEL PROYECTO -->
    <header>
      <div class="header-title">
        <h1>
          <span>🎬 ${escapeHtml(cleanProjectName)}</span>
          <span class="badge badge-emerald">Master Studio</span>
        </h1>
        <p>Generado el ${escapeHtml(generatedAt)} · Modo de Dirección: <strong>${escapeHtml(narrativeMode)}</strong></p>
      </div>

      <div class="header-stats">
        <div class="stat-box">
          <div class="stat-val">${scenes.length}</div>
          <div class="stat-lbl">Escenas</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${totalDuration.toFixed(1)}s</div>
          <div class="stat-lbl">Duración Est.</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${totalWords}</div>
          <div class="stat-lbl">Palabras</div>
        </div>
      </div>
    </header>

    <!-- BARRA PRINCIPAL DE ACCIÓN: COPIAR TODOS LOS PROMPTS -->
    <div class="action-bar">
      <div class="action-text">
        <strong>📋 Exportación Masiva de Prompts para Generación de Imágenes</strong>
        <span>Copia todos los prompts ordenados consecutivamente (uno por línea: 1. Prompt...) listos para Midjourney, FLUX o generación masiva.</span>
      </div>
      <button class="btn-main" onclick="copyAllPromptsNumbered()">
        <span>📋 COPIAR TODOS LOS PROMPTS DE IMÁGENES</span>
      </button>
    </div>

    <!-- SECCIÓN METADATOS: CONTEXTO TEMPORAL & ESTILO VISUAL -->
    <div class="meta-grid">
      <!-- CONTEXTO TEMPORAL Y CULTURAL -->
      <div class="card">
        <div class="card-title">
          <span>🏛️ Contexto Temporal y Cultural</span>
          <span class="badge badge-cyan">${escapeHtml(culturalContext.certaintyLevel || 'Inferencia IA')}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          <div><strong style="color: var(--cyan);">Época:</strong> ${escapeHtml(culturalContext.epoch || 'Contemporánea / Actual')}</div>
          <div><strong style="color: var(--cyan);">Cultura:</strong> ${escapeHtml(culturalContext.culture || 'Universal')}</div>
          <div><strong style="color: var(--cyan);">Entorno:</strong> ${escapeHtml(culturalContext.environment || 'Atmosférico')}</div>
          ${culturalContext.culturalLock ? `
          <div style="margin-top: 6px; padding: 8px; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 6px;">
            <strong style="color: #34d399; font-size: 11px;">🔒 CULTURAL_LOCK:</strong>
            <p style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">${escapeHtml(culturalContext.culturalLock)}</p>
          </div>` : ''}
          ${culturalContext.culturalAvoid ? `
          <div style="margin-top: 4px; padding: 8px; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 6px;">
            <strong style="color: #f87171; font-size: 11px;">⛔ CULTURAL_AVOID:</strong>
            <p style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">${escapeHtml(culturalContext.culturalAvoid)}</p>
          </div>` : ''}
        </div>
      </div>

      <!-- ESTILO VISUAL CINEMATOGRÁFICO -->
      <div class="card">
        <div class="card-title">
          <span>🎨 Estilo Visual Personalizado</span>
          <span class="badge badge-amber">${escapeHtml(visualStyle.name || 'Personalizado')}</span>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #fde68a; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; line-height: 1.5;">
          ${escapeHtml(visualStyle.modifier || 'Visual style custom tailored to script')}
        </div>
        ${visualStyle.reason ? `<p style="font-size: 11px; color: var(--text-muted); margin-top: 8px; font-style: italic;">${escapeHtml(visualStyle.reason)}</p>` : ''}
        ${visualStyle.styleLock ? `
        <div style="margin-top: 8px; padding: 8px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; border-radius: 6px;">
          <strong style="color: #fbbf24; font-size: 11px;">🔒 STYLE_LOCK:</strong>
          <p style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">${escapeHtml(visualStyle.styleLock)}</p>
        </div>` : ''}
        ${visualStyle.styleAvoid ? `
        <div style="margin-top: 4px; padding: 8px; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 6px;">
          <strong style="color: #f87171; font-size: 11px;">⛔ STYLE_AVOID:</strong>
          <p style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">${escapeHtml(visualStyle.styleAvoid)}</p>
        </div>` : ''}
      </div>
    </div>

    <!-- ANÁLISIS PROFUNDO DEL GUION (PASO 1) -->
    ${deepAnalysis ? `
    <div class="card">
      <div class="card-title">
        <span>🧠 Análisis Profundo del Guion (Paso 1 · Memoria Visual)</span>
        <span class="badge badge-purple">Especificidad Garantizada</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; font-size: 12px;">
        ${deepAnalysis.premise ? `
        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
          <strong style="color: #c084fc;">📖 Premisa & Tema Central:</strong>
          <p style="margin-top: 4px; color: #e2e8f0;">${escapeHtml(deepAnalysis.premise.theme || deepAnalysis.premise.mainSituation || '')}</p>
          ${deepAnalysis.premise.narrativeTone ? `<p style="margin-top: 4px; color: var(--text-muted);"><strong>Tono:</strong> ${escapeHtml(deepAnalysis.premise.narrativeTone)}</p>` : ''}
        </div>` : ''}
        ${deepAnalysis.visualSummary ? `
        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
          <strong style="color: #38bdf8;">🎬 Resumen Visual:</strong>
          <p style="margin-top: 4px; color: #e2e8f0;">${escapeHtml(deepAnalysis.visualSummary)}</p>
        </div>` : ''}
        ${deepAnalysis.doNotInventList && deepAnalysis.doNotInventList.length > 0 ? `
        <div style="background: rgba(239,68,68,0.05); padding: 12px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.2);">
          <strong style="color: #f87171;">🚫 NO Inventar (Indeterminado en Guion):</strong>
          <ul style="margin-top: 4px; padding-left: 18px; color: #cbd5e1; font-size: 11px;">
            ${deepAnalysis.doNotInventList.slice(0, 5).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    </div>
    ` : ''}

    <!-- GUION COMPLETO DE LOCUCIÓN -->
    <div class="card">
      <div class="card-title">
        <span>📜 Guion Completo de Locución</span>
        <button class="btn-secondary" onclick="copyTextToClipboard(\`${escapeForTemplateLiteral(scriptText)}\`, 'Guion completo copiado')">
          <span>Copiar Guion</span>
        </button>
      </div>
      <div class="script-box">${escapeHtml(scriptText)}</div>
    </div>

    <!-- BÓVEDA DE PERSONAJES -->
    ${characters.length > 0 ? `
    <div class="card">
      <div class="card-title">
        <span>👤 Bóveda de Personajes & Continuidad Biométrica (${characters.length})</span>
        <span class="badge badge-purple">Invarianza Facial</span>
      </div>
      <div class="chars-grid">
        ${characters.map((c, i) => `
        <div class="char-card">
          <div class="char-header">
            <span class="char-name">#${i + 1} ${escapeHtml(c.name)}</span>
            <span class="badge badge-purple">${escapeHtml(c.role || 'PROTAGONIST')}</span>
          </div>
          <div class="char-detail"><strong>Aspecto Físico:</strong> ${escapeHtml(c.anchorDescription || 'Photorealistic consistent subject')}</div>
          <div class="char-detail"><strong>Vestimenta:</strong> ${escapeHtml(c.clothingAnchor || 'Contextual wardrobe')}</div>
          ${c.characterLock ? `<div class="char-detail" style="color: #c084fc;"><strong>CHARACTER_LOCK:</strong> ${escapeHtml(c.characterLock)}</div>` : ''}
          ${c.defaultSeed ? `<div class="char-detail"><strong>Seed:</strong> #${c.defaultSeed}</div>` : ''}
          <div style="margin-top: 10px;">
            <button class="btn-secondary" onclick="copyTextToClipboard(\`${escapeForTemplateLiteral(`${c.name}: ${c.anchorDescription}, ${c.clothingAnchor}`)}\`, 'Biometría de ${escapeJs(c.name)} copiada')">
              <span>Copiar Ficha</span>
            </button>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- DESGLOSE DE ESCENAS & PROMPTS -->
    <div class="card">
      <div class="card-title">
        <span>🎬 Desglose Escena por Escena (${scenes.length} Tomas)</span>
        <button class="btn-main" onclick="copyAllPromptsNumbered()">
          <span>📋 Copiar Todos los Prompts</span>
        </button>
      </div>

      <div class="scenes-container">
        ${scenes.map(s => {
          const numStr = String(s.sceneNumber).padStart(3, '0');
          const timeStr = typeof s.startTime === 'number' && typeof s.endTime === 'number'
            ? `${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s (${(s.durationSeconds || (s.endTime - s.startTime)).toFixed(1)}s)`
            : `${(s.durationSeconds || 2.5).toFixed(1)}s`;

          return `
          <div class="scene-row">
            <div class="scene-header">
              <span class="scene-num">TOMA #${numStr}</span>
              <span class="scene-timing">⏱️ ${timeStr}</span>
              ${s.cameraAngle ? `<span class="badge badge-cyan">🎥 ${escapeHtml(s.cameraAngle)}</span>` : ''}
              ${s.lighting ? `<span class="badge badge-amber">💡 ${escapeHtml(s.lighting)}</span>` : ''}
              ${s.charactersPresent && s.charactersPresent.length > 0 ? `<span class="badge badge-purple">👤 ${escapeHtml(s.charactersPresent.join(', '))}</span>` : ''}
            </div>

            <div class="scene-segment">
              "${escapeHtml(s.scriptSegment)}"
            </div>

            <div class="scene-prompt">
              <span>${escapeHtml(s.visualPrompt)}</span>
              <button class="btn-secondary" style="flex-shrink: 0;" onclick="copyTextToClipboard(\`${escapeForTemplateLiteral(s.visualPrompt)}\`, 'Prompt #${numStr} copiado')">
                <span>Copiar</span>
              </button>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </div>

  </div>

  <script>
    const promptsList = ${promptsJson};

    function showToast(msg) {
      const toast = document.getElementById('copy-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2500);
    }

    function copyTextToClipboard(text, successMsg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(successMsg || 'Copiado al portapapeles');
        }).catch(() => {
          fallbackCopy(text, successMsg);
        });
      } else {
        fallbackCopy(text, successMsg);
      }
    }

    function fallbackCopy(text, successMsg) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast(successMsg || 'Copiado al portapapeles');
      } catch (e) {
        alert('No se pudo copiar automáticamente. Por favor selecciónalo manualmente.');
      }
      document.body.removeChild(ta);
    }

    function copyAllPromptsNumbered() {
      if (!promptsList || promptsList.length === 0) {
        alert('No hay prompts para copiar.');
        return;
      }
      const formatted = promptsList.map((p, idx) => (idx + 1) + '. ' + p).join('\\n\\n');
      copyTextToClipboard(formatted, '✅ ¡Copiados ' + promptsList.length + ' prompts (1 por línea) con éxito!');
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

function escapeJs(str: string): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
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

  let savedToDir = false;
  if (params.dirHandle && typeof params.dirHandle.getFileHandle === 'function') {
    try {
      const fileHandle = await params.dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(params.htmlContent);
      await writable.close();
      savedToDir = true;
    } catch (e) {
      console.warn('[saveMasterStudioHtmlFile] No se pudo escribir directo en dirHandle, usando descarga:', e);
    }
  }

  // Descarga automática en navegador para asegurar que el archivo esté disponible en disco
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
  } catch (err) {
    console.warn('[saveMasterStudioHtmlFile] Error en descarga automática:', err);
  }

  return { savedToDir, filename };
}
