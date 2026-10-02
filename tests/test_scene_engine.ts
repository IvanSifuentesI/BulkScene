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

  console.log('\n--- TEST 5: calibrateNarrativeSceneTimestamps proportional timing & non-overlapping ---');
  const { calibrateNarrativeSceneTimestamps, validatePipelineExecution } = await import('../services/llmDirectorService');
  const { parseMasterStudioHtml } = await import('../services/htmlProjectExportService');
  const { isIgnorableBrowserNoise } = await import('../services/errorTelemetryService');

  const testScript = 'En el silencio de la tundra ártica, los pinos crujen bajo la helada. Una cabaña de madera desprende una fina columna de humo grisáceo. En el interior, brasas incandescentes crepitan en la chimenea.';
  const calibrated = calibrateNarrativeSceneTimestamps(
    [
      { sceneNumber: 1, scriptSegment: 'En el silencio de la tundra ártica, los pinos crujen bajo la helada.' },
      { sceneNumber: 2, scriptSegment: 'Una cabaña de madera desprende una fina columna de humo grisáceo.' },
      { sceneNumber: 3, scriptSegment: 'En el interior, brasas incandescentes crepitan en la chimenea.' }
    ],
    testScript,
    18.0 // Audio de 18 segundos
  );

  if (calibrated.length !== 3) {
    throw new Error(`FAILED: Expected 3 calibrated scenes, got ${calibrated.length}`);
  }
  let prevEnd = 0;
  for (const cs of calibrated) {
    if (cs.startTime < prevEnd - 0.05) throw new Error(`FAILED: Scene ${cs.sceneNumber} overlaps previous`);
    if (cs.startTime >= cs.endTime) throw new Error(`FAILED: Scene ${cs.sceneNumber} non-increasing timestamps`);
    if (cs.durationSeconds <= 0) throw new Error(`FAILED: Scene ${cs.sceneNumber} duration <= 0`);
    prevEnd = cs.endTime;
  }
  console.log(`✓ TEST 5 PASSED: ${calibrated.length} scenes calibrated proportionally (0s to ${prevEnd}s)`);

  console.log('\n--- TEST 6: validatePipelineExecution pass & fail cases ---');
  // Pass case
  const validScenes: ScriptSceneResult[] = calibrated.map(c => ({
    sceneNumber: c.sceneNumber,
    scriptSegment: c.scriptSegment,
    visualPrompt: `Authentic atmospheric shot of ${c.scriptSegment}, natural diffused overcast light, rough pine bark texture, slate blue tones.`,
    videoPrompt: 'Slow cinematic push-in. Audio: subtle wind through frosted needles; no spoken dialogue.',
    durationSeconds: c.durationSeconds,
    startTime: c.startTime,
    endTime: c.endTime,
    charactersPresent: []
  }));

  const passValidation = validatePipelineExecution({
    expectedSceneCount: 3,
    narrativeScenes: calibrated,
    generatedScenes: validScenes,
    originalScript: testScript,
    totalAudioDuration: 18.0
  });

  if (!passValidation.isValid) {
    throw new Error(`FAILED: Expected validation to pass but got errors: ${passValidation.errors.join(', ')}`);
  }

  // Fail case 1: Scene count mismatch
  const failValidationCount = validatePipelineExecution({
    expectedSceneCount: 4, // expects 4 but has 3
    narrativeScenes: calibrated,
    generatedScenes: validScenes,
    originalScript: testScript,
    totalAudioDuration: 18.0
  });
  if (failValidationCount.isValid) {
    throw new Error('FAILED: Expected validation to fail when scene count mismatches!');
  }

  // Fail case 2: Timestamp inversion
  const invertedScenes = JSON.parse(JSON.stringify(validScenes));
  invertedScenes[1].startTime = 10;
  invertedScenes[1].endTime = 5; // End before start
  const failValidationTime = validatePipelineExecution({
    expectedSceneCount: 3,
    narrativeScenes: calibrated,
    generatedScenes: invertedScenes,
    originalScript: testScript,
    totalAudioDuration: 18.0
  });
  if (failValidationTime.isValid) {
    throw new Error('FAILED: Expected validation to fail when timestamps are inverted!');
  }
  console.log('✓ TEST 6 PASSED: Pre-success validation strictly enforces exact count and chronological integrity');

  console.log('\n--- TEST 7: parseMasterStudioHtml re-importing prompts ---');
  const parsedHtml = parseMasterStudioHtml(html);
  if (!parsedHtml.scenes || parsedHtml.scenes.length !== cleaned.length) {
    throw new Error(`FAILED: parseMasterStudioHtml returned ${parsedHtml.scenes?.length} scenes, expected ${cleaned.length}`);
  }
  if (!parsedHtml.visualPrompts || parsedHtml.visualPrompts.length !== cleaned.length) {
    throw new Error('FAILED: parseMasterStudioHtml visualPrompts missing or count mismatch');
  }
  if (!parsedHtml.projectName || !parsedHtml.projectName.includes('finlandia')) {
    throw new Error(`FAILED: parseMasterStudioHtml projectName incorrect: ${parsedHtml.projectName}`);
  }
  console.log(`✓ TEST 7 PASSED: ${parsedHtml.scenes.length} scenes and prompts accurately parsed from HTML export`);

  console.log('\n--- TEST 8: isIgnorableBrowserNoise telemetry filter ---');
  const noisyError1 = new Error('Could not establish connection. Receiving end does not exist.');
  const noisyError2 = 'Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received';
  const realError = new Error('Groq API rate limit exceeded 429');

  if (!isIgnorableBrowserNoise(noisyError1)) {
    throw new Error('FAILED: isIgnorableBrowserNoise failed to filter "receiving end does not exist"');
  }
  if (!isIgnorableBrowserNoise(noisyError2)) {
    throw new Error('FAILED: isIgnorableBrowserNoise failed to filter message channel closed');
  }
  if (isIgnorableBrowserNoise(realError)) {
    throw new Error('FAILED: isIgnorableBrowserNoise falsely suppressed a genuine application error');
  }
  console.log('✓ TEST 8 PASSED: Browser extension noise filtered while genuine errors are preserved');

  console.log('\n--- TEST 9: isAdminModeActive admin privacy isolation ---');
  const { isAdminModeActive } = await import('../services/subscriptionService');

  // Case 1: Regular student / user session
  // Mock localStorage in node environment if needed
  const originalLocalStorage = globalThis.localStorage;
  const mockStorage: Record<string, string> = {
    'bulkscene_user_email': 'alumno@gmail.com',
    'bulkscene_subscription_active': 'true'
  };
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => {}
  } as any;

  if (isAdminModeActive()) {
    throw new Error('FAILED: isAdminModeActive returned true for a regular user email!');
  }

  // Case 2: Admin email
  mockStorage['bulkscene_user_email'] = 'admin@bulkscene.ai';
  if (!isAdminModeActive()) {
    throw new Error('FAILED: isAdminModeActive returned false for admin@bulkscene.ai!');
  }

  // Case 3: Admin authenticated via PIN in /admin
  mockStorage['bulkscene_user_email'] = 'editor@gmail.com';
  mockStorage['bulkscene_admin_authenticated'] = 'true';
  if (!isAdminModeActive()) {
    throw new Error('FAILED: isAdminModeActive returned false when bulkscene_admin_authenticated is true!');
  }

  // Restore
  globalThis.localStorage = originalLocalStorage;
  console.log('✓ TEST 9 PASSED: Admin privacy verified — Telemetría & Precios Skool strictly hidden from regular users');

  console.log('\n======================================');
  console.log('🎉 ALL 9 PIPELINE TESTS PASSED 100%!');
  console.log('======================================');
}

runTests().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
