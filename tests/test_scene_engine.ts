import { validateAndRepairScenes, createLocalFallbackScenes } from '../services/llmDirectorService';
import { generateMasterStudioHtml } from '../services/htmlProjectExportService';
import { studioLogger } from '../services/studioLoggerService';
import { ScriptSceneResult } from '../types';

async function runTests() {
  console.log('--- TEST 1: studioLogger zero undefined ---');
  studioLogger.clearLogs();
  studioLogger.addLog('STEP', 'Generando lote de escenas 1/3 (1-12)...');
  studioLogger.addLog('SUCCESS', 'Generación completada');
  studioLogger.addLog('AI', 'Paso 3/5', 'Estilo creado', { key: 'val' });
  const logsText = studioLogger.exportLogsAsText();
  if (logsText.includes('undefined')) {
    throw new Error('FAILED: studioLogger contains undefined!');
  }
  console.log('✓ TEST 1 PASSED: Zero undefined in logs');

  console.log('\n--- TEST 2: createLocalFallbackScenes completeness & richness ---');
  const fallback = createLocalFallbackScenes({
    scriptText: '¿Cómo se sobrevive en una tierra donde las piedras tocan las nubes y el oxígeno escasea? Ese es el enigma de los Andes peruanos.',
    targetStyleName: 'Andean Epic Naturalism',
    targetStyleModifier: 'deep natural depth of field, authentic textures',
    pacingWords: 8
  });

  if (!fallback.scenes || fallback.scenes.length === 0) {
    throw new Error('FAILED: Fallback scenes empty');
  }

  for (const sc of fallback.scenes) {
    if (!sc.visualPrompt || sc.visualPrompt.length < 30) throw new Error(`FAILED: visualPrompt too short for scene ${sc.sceneNumber}`);
    if (!sc.videoPrompt || !sc.videoPrompt.includes('Audio:')) throw new Error(`FAILED: videoPrompt missing or lacks Audio cue for scene ${sc.sceneNumber}`);
    if (!sc.shotSize) throw new Error(`FAILED: shotSize missing for scene ${sc.sceneNumber}`);
    if (!sc.cameraAngle) throw new Error(`FAILED: cameraAngle missing for scene ${sc.sceneNumber}`);
    if (!sc.cameraMovement) throw new Error(`FAILED: cameraMovement missing for scene ${sc.sceneNumber}`);
    if (!sc.textures || sc.textures.length === 0) throw new Error(`FAILED: textures missing for scene ${sc.sceneNumber}`);
    if (typeof sc.startTime !== 'number' || typeof sc.endTime !== 'number' || sc.startTime >= sc.endTime) {
      throw new Error(`FAILED: invalid time range for scene ${sc.sceneNumber}`);
    }
  }
  console.log(`✓ TEST 2 PASSED: ${fallback.scenes.length} fallback scenes generated with complete visual & video prompts`);

  console.log('\n--- TEST 3: validateAndRepairScenes contradiction resolution & buzzword removal ---');
  const dirtyScenes: ScriptSceneResult[] = [
    {
      sceneNumber: 1,
      scriptSegment: 'Una tierra donde las piedras tocan las nubes.',
      visualPrompt: 'Hyper-detailed and photorealistic extreme wide shot of a lone scout standing on a granite cliff with 8k resolution.',
      videoPrompt: '',
      shotSize: 'Extreme Wide Shot',
      cameraAngle: 'Eye-Level',
      cameraMovement: 'Dynamic Push-In',
      lighting: 'Dawn rim light',
      palette: 'Slate grey and amber',
      textures: ['weathered granite'],
      charactersPresent: [], // Contradiction: prompt has a lone scout but charactersPresent is empty!
      startTime: 0,
      endTime: 4.5,
      durationSeconds: 4.5,
      isTimingEstimated: true
    },
    {
      sceneNumber: 2,
      scriptSegment: 'Las piedras milenarias de la fortaleza.',
      visualPrompt: 'Panoramic view of ancient granite masonry under drifting morning mist, mossy rock fissures and weathered stone blocks.',
      videoPrompt: 'The camera executes a slow dolly push through the mist.', // Lacks Audio cue
      shotSize: 'Wide Shot',
      cameraAngle: 'Eye-Level',
      cameraMovement: 'Slow Tracking Shot',
      lighting: 'Overcast morning',
      palette: 'Slate grey and emerald',
      textures: ['granite masonry', 'mossy rock'],
      charactersPresent: ['Arquitecto Inka'], // Contradiction: prompt is pure landscape/stone without people
      startTime: 3.0, // Contradiction: overlaps with scene 1 (scene 1 ends at 4.5)
      endTime: 7.0,
      durationSeconds: 4.0,
      isTimingEstimated: true
    }
  ];

  const cleaned = await validateAndRepairScenes({
    scenes: dirtyScenes,
    scriptText: 'Prueba de guion para validación'
  });

  // Scene 1 assertions
  const sc1 = cleaned[0];
  if (/hyper-detailed|photorealistic|8k resolution/i.test(sc1.visualPrompt)) {
    throw new Error('FAILED: Buzzwords were not stripped from scene 1');
  }
  if (sc1.charactersPresent.length === 0) {
    throw new Error('FAILED: Contradiction not resolved for scene 1 (human scout was mentioned)');
  }
  if (!sc1.videoPrompt || !sc1.videoPrompt.includes('Audio:')) {
    throw new Error('FAILED: Video prompt or Audio cue missing in scene 1');
  }

  // Scene 2 assertions
  const sc2 = cleaned[1];
  if (sc2.charactersPresent.length > 0) {
    throw new Error('FAILED: Contradiction not resolved for scene 2 (empty stone landscape had character)');
  }
  if (sc2.startTime < sc1.endTime) {
    throw new Error(`FAILED: Timing overlap not corrected: sc2 start ${sc2.startTime} < sc1 end ${sc1.endTime}`);
  }
  if (!sc2.videoPrompt.includes('Audio:')) {
    throw new Error('FAILED: Audio cue was not added to scene 2 videoPrompt');
  }
  console.log('✓ TEST 3 PASSED: Contradictions, timing overlaps, and buzzwords cleanly resolved');

  console.log('\n--- TEST 4: generateMasterStudioHtml dual buttons and structure ---');
  const html = generateMasterStudioHtml({
    projectName: 'finlandia_test',
    scriptText: 'Guion de prueba para el test',
    narrativeMode: 'Documental Secuencial',
    visualStyle: {
      name: 'Andean Epic Naturalism',
      modifier: 'Cinematic wide-angle photography with deep natural depth of field',
      styleLock: 'Consistencia en iluminación fría de alba',
      styleAvoid: 'Colores saturados artificiales'
    },
    culturalContext: {
      epoch: 'Siglo XV',
      culture: 'Incaica',
      environment: 'Alta montaña andina',
      culturalLock: 'Vestimenta de lana de alpaca teñida naturalmente',
      culturalAvoid: 'Herramientas de hierro o ruedas'
    },
    scenes: cleaned
  });

  if (!html.includes('btn-copy-image') || !html.includes('btn-copy-video')) {
    throw new Error('FAILED: HTML missing dual copy buttons');
  }
  if (!html.includes('prompt-box-image') || !html.includes('prompt-box-video')) {
    throw new Error('FAILED: HTML missing dual prompt boxes');
  }
  if (!html.includes('CULTURAL_LOCK') || !html.includes('STYLE_LOCK')) {
    throw new Error('FAILED: HTML missing lock sections');
  }
  if (html.includes('undefined')) {
    throw new Error('FAILED: HTML contains undefined string');
  }
  console.log('✓ TEST 4 PASSED: HTML generated successfully with dual prompt architecture and 0 undefined');

  console.log('\n======================================');
  console.log('🎉 ALL 4 REGRESSION TESTS PASSED 100%!');
  console.log('======================================');
}

runTests().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
