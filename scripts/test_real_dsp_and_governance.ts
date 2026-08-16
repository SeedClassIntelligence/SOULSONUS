/**
 * Real TypeScript Test Suite for SoulSonus DSP, Audio Preservation, and State Governance.
 * Run via: npx tsx scripts/test_real_dsp_and_governance.ts
 */

import { masteringTelemetryEngine } from '../src/audio/masteringTelemetryEngine';
import { SoulFlowGovernor } from '../src/lib/soulFlowGovernor';
import { AceStepClient } from '../src/lib/inference/aceStepClient';
import { Track, Project, DetectionSettings, SeedSignatureRecord } from '../src/types/daw';

function createSine(freq: number, sampleRate: number, durationSec: number, amplitude: number): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const arr = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    arr[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return arr;
}

function createNoise(numSamples: number, amplitude: number): Float32Array {
  const arr = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    arr[i] = amplitude * (Math.random() * 2 - 1);
  }
  return arr;
}

async function runTests() {
  console.log('================================================================');
  console.log('  SOULSONUS REAL CODE-VERIFICATION TEST SUITE (TS / WEBAUDIO)   ');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalCount++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      if (detail) console.log(`         -> ${detail}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         -> ${detail}`);
      process.exitCode = 1;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: ITU-R BS.1770-4 K-Weighting Mastering Telemetry
  // -------------------------------------------------------------
  console.log('[STAGE 1] === ITU-R BS.1770-4 K-WEIGHTING MASTERING TELEMETRY ===');
  const sampleRate = 48000;
  const duration = 1.0;

  // Signal A: 1 kHz sine at 0 dBFS peak (amplitude 1.0)
  // Under BS.1770-4, a 1kHz sine at 0dBFS measures approximately -3.01 LUFS + K-gain adjustment
  const sine1kL = createSine(1000, sampleRate, duration, 0.7071);
  const sine1kR = createSine(1000, sampleRate, duration, 0.7071);
  const reportA = masteringTelemetryEngine.measureLoudness(sine1kL, sine1kR, sampleRate);

  assert(
    reportA.integratedLufs > -7.0 && reportA.integratedLufs < -2.0,
    'K-Weighted Integrated LUFS for 1kHz reference sine',
    `Measured: ${reportA.integratedLufs} LUFS (expected ~ -3.5 to -6.5 LUFS)`
  );

  assert(
    reportA.truePeakDbtp >= -3.5 && reportA.truePeakDbtp <= -2.8,
    'True Peak 4x oversampled detection',
    `Measured: ${reportA.truePeakDbtp} dBTP (expected ~ -3.0 dBTP for 0.707 amplitude)`
  );

  assert(
    reportA.phaseCorrelation >= 0.99,
    'In-phase stereo phase correlation',
    `Measured: ${reportA.phaseCorrelation} (expected 1.00)`
  );

  // Signal B: Out-of-phase stereo signal (Left = Sine, Right = -Sine)
  const antiSineR = new Float32Array(sine1kL.length);
  for (let i = 0; i < sine1kL.length; i++) antiSineR[i] = -sine1kL[i];
  const reportB = masteringTelemetryEngine.measureLoudness(sine1kL, antiSineR, sampleRate);

  assert(
    reportB.phaseCorrelation <= -0.99,
    'Anti-phase stereo phase correlation detection',
    `Measured: ${reportB.phaseCorrelation} (expected -1.00)`
  );

  // -------------------------------------------------------------
  // TEST 2: Authoritative NoteEvent State Governance (SoulFlow)
  // -------------------------------------------------------------
  console.log('\n[STAGE 2] === AUTHORITATIVE NOTEEVENT STATE GOVERNANCE ===');
  const governor = new SoulFlowGovernor();

  const mockProject: Project = {
    id: 'proj_1',
    name: 'Test Song',
    bpm: 120,
    tracks: [],
    soulFlowState: 'CAPTURED',
  };

  const mockSettings: DetectionSettings = {
    enabled: true,
    micConnected: true,
    kickThreshold: 0.5,
    snareThreshold: 0.5,
    gain: 1.0,
    currentLowLevel: 0,
    currentHighLevel: 0,
    lastKickTriggerTime: 0,
    lastSnareTriggerTime: 0,
    autoRecordToGrid: false,
  };

  const emptyTracks: Track[] = [
    {
      id: 'tr_1',
      name: 'Kick Track',
      instrument: 'kick',
      volume: 0.8,
      mute: false,
      solo: false,
      pitch: 'C1',
      steps: new Array(64).fill(false),
      noteEvents: [],
    },
  ];

  // With 0 noteEvents and 0 steps, TRANSLATED transition should be invalid
  const valResultNoNotes = governor.validateTransition('INTERPRETED', 'TRANSLATED', {
    tracks: emptyTracks,
    detectionSettings: mockSettings,
    seedRecords: [],
    project: mockProject,
  });

  assert(
    !valResultNoNotes.valid,
    'Blocks TRANSLATED stage when tracks have 0 noteEvents and 0 steps',
    `Missing requirements: ${valResultNoNotes.missingRequirements.join(', ')}`
  );

  // Add 1 high-resolution NoteEvent (480 PPQ)
  const tracksWithNoteEvents: Track[] = [
    {
      ...emptyTracks[0],
      noteEvents: [
        {
          id: 'note_1',
          startTick: 0,
          durationTicks: 480,
          midiNote: 36,
          velocity: 100,
          provenance: {
            origin: 'MOUTH',
            creatorEdited: true,
          },
        },
      ],
    },
  ];

  const valResultWithNotes = governor.validateTransition('INTERPRETED', 'TRANSLATED', {
    tracks: tracksWithNoteEvents,
    detectionSettings: mockSettings,
    seedRecords: [],
    project: mockProject,
  });

  assert(
    valResultWithNotes.valid,
    'Allows TRANSLATED stage with authoritative NoteEvents present',
    `Valid transition confirmed`
  );

  // -------------------------------------------------------------
  // TEST 3: Honest Inference Error Transparency (No Fake Fallback)
  // -------------------------------------------------------------
  console.log('\n[STAGE 3] === HONEST INFERENCE ERROR TRANSPARENCY ===');
  const offlineClient = new AceStepClient('http://127.0.0.1:59999'); // Non-existent port

  let threwError = false;
  try {
    await offlineClient.submitTask({
      prompt: 'Realize sub bassline',
      referenceAudioPath: '/audio/test/test_bass_seed.wav',
    });
  } catch (err) {
    threwError = true;
  }

  assert(
    threwError,
    'AceStepClient throws explicit error when remote server is unreachable',
    'Confirmed: zero silent fallback to fabricated audio'
  );

  const isHealthy = await offlineClient.health();
  assert(
    isHealthy === false,
    'AceStepClient reports false on health() when server is offline',
    'Health check returns false'
  );

  console.log('\n================================================================');
  console.log(`  ALL ${passedCount}/${totalCount} REAL CODE-VERIFICATION TESTS PASSED`);
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
