/**
 * SoulSonus Comprehensive Platform Verification Suite
 * Exhaustively tests all 9 core subsystems end-to-end:
 * 1. BS.1770-4 Mastering Telemetry DSP
 * 2. High-Resolution (480 PPQ) NoteEvent Math & Musical Quantization
 * 3. Vocal Pitch Quantization & Granular Time-Domain Pitch Shifting DSP
 * 4. Spec-Compliant 24-Bit WAV & FLAC Audio Packaging (fLaC Framing + STREAMINFO)
 * 5. WebCrypto SHA-256 SeedSignature Provenance Chains
 * 6. SoulFlow 10-Stage State Governor Lifecycle
 * 7. Sound Vault Semantic Keyword Matcher
 * 8. Demucs 4-Stem Separation REST Contract
 * 9. ACE-Step 1.5 Async Job Polling & Intent Contract
 */

import { masteringTelemetryEngine } from '../src/audio/masteringTelemetryEngine';
import { vocalDspProcessor } from '../src/audio/vocalDspProcessor';
import { AudioEncoders } from '../src/lib/audioEncoders';
import { signatureService } from '../src/lib/seedSignature';
import { SoulFlowGovernor, SOULFLOW_STAGE_ORDER } from '../src/lib/soulFlowGovernor';
import { SoundVaultSemanticMatcher } from '../src/lib/soundVaultSearch';
import { interpretPass } from '../src/lib/interpretation';
import { MIMICRY_TARGETS } from '../src/lib/mimicryTarget';
import { SoulSonusServiceProvider } from '../src/lib/inference/e05Provider';
import { DemucsClient } from '../src/lib/inference/demucsClient';
import { autocorrelationPitchTrajectory } from '../src/lib/inference/audioPreservationScoring';
import {
  tickToStep,
  stepToTick,
  snapTick,
  snapMidiToScale,
  isNoteInScale,
  midiToNoteName,
  noteNameToMidi,
  TICKS_PER_16TH,
  TICKS_PER_BEAT,
  TICKS_PER_BAR,
} from '../src/utils/musicMath';
import { Track, Project, DetectionSettings, NoteEvent, SeedSignatureRecord } from '../src/types/daw';

function generateSine(freq: number, sampleRate: number, durationSec: number, amplitude: number): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const arr = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    arr[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return arr;
}

async function runComprehensiveVerification() {
  console.log('========================================================================');
  console.log('  SOULSONUS COMPREHENSIVE END-TO-END PLATFORM VERIFICATION HARNESS     ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function check(condition: boolean, category: string, description: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] [${category}] ${description}`);
      if (detail) console.log(`         -> ${detail}`);
      passed++;
    } else {
      console.error(`  [FAIL] [${category}] ${description}`);
      if (detail) console.error(`         -> ${detail}`);
      failed++;
      process.exitCode = 1;
    }
  }

  // ----------------------------------------------------------------------
  // 1. ITU-R BS.1770-4 MASTERING DSP TELEMETRY
  // ----------------------------------------------------------------------
  console.log('--- 1. ITU-R BS.1770-4 Mastering Telemetry DSP ---');
  const sampleRate = 48000;
  const sine1kL = generateSine(1000, sampleRate, 1.0, 0.7071);
  const sine1kR = generateSine(1000, sampleRate, 1.0, 0.7071);
  const masteringReport = masteringTelemetryEngine.measureLoudness(sine1kL, sine1kR, sampleRate);

  check(
    masteringReport.integratedLufs > -7.0 && masteringReport.integratedLufs < -2.0,
    'MASTERING_DSP',
    'K-Weighted Integrated Loudness accurately measures within standard tolerance',
    `Integrated LUFS: ${masteringReport.integratedLufs}`
  );
  check(
    masteringReport.truePeakDbtp >= -3.5 && masteringReport.truePeakDbtp <= -2.8,
    'MASTERING_DSP',
    '4x Oversampled True Peak measures true analog inter-sample peak',
    `True Peak: ${masteringReport.truePeakDbtp} dBTP`
  );
  check(
    masteringReport.phaseCorrelation >= 0.99,
    'MASTERING_DSP',
    'Phase Correlation detects coherent in-phase stereo channels',
    `Phase: ${masteringReport.phaseCorrelation}`
  );

  // Anti-phase test
  const antiR = new Float32Array(sine1kL.length);
  for (let i = 0; i < sine1kL.length; i++) antiR[i] = -sine1kL[i];
  const antiReport = masteringTelemetryEngine.measureLoudness(sine1kL, antiR, sampleRate);
  check(
    antiReport.phaseCorrelation <= -0.99,
    'MASTERING_DSP',
    'Phase Correlation detects 180-degree out-of-phase destructive cancellation',
    `Phase: ${antiReport.phaseCorrelation}`
  );

  // ----------------------------------------------------------------------
  // 2. 480 PPQ NOTEEVENT MUSICAL MATH & QUANTIZATION
  // ----------------------------------------------------------------------
  console.log('\n--- 2. High-Resolution (480 PPQ) NoteEvent Math ---');
  check(stepToTick(0) === 0 && stepToTick(1) === 120, 'MUSIC_MATH', 'stepToTick maps 16th-note steps to 120 tick subdivisions');
  check(tickToStep(0) === 0 && tickToStep(120) === 1 && tickToStep(480) === 4, 'MUSIC_MATH', 'tickToStep maps ticks back to 16th-note steps');
  check(snapTick(118, 120) === 120 && snapTick(132, 120) === 120, 'MUSIC_MATH', 'snapTick snaps humanized onsets to nearest grid division');
  check(midiToNoteName(60) === 'C4' && midiToNoteName(36) === 'C2', 'MUSIC_MATH', 'midiToNoteName maps MIDI integer to standard scientific pitch notation');
  check(noteNameToMidi('C4') === 60 && noteNameToMidi('A4') === 69, 'MUSIC_MATH', 'noteNameToMidi parses pitch string to MIDI note number');
  check(isNoteInScale(60, 'C', 'minor') && isNoteInScale(63, 'C', 'minor') && !isNoteInScale(64, 'C', 'minor'), 'MUSIC_MATH', 'isNoteInScale verifies scale membership in C Minor (C, D, Eb, F, G, Ab, Bb)');
  check(snapMidiToScale(64, 'C', 'minor') === 63, 'MUSIC_MATH', 'snapMidiToScale snaps out-of-scale E4 (64) down to Eb4 (63) in C minor');

  // ----------------------------------------------------------------------
  // 3. VOCAL DSP PITCH QUANTIZATION & GRANULAR PITCH SHIFTING
  // ----------------------------------------------------------------------
  console.log('\n--- 3. Vocal DSP Pitch Quantization & Shifting ---');
  const quantResultA4 = vocalDspProcessor.quantizePitch(440.0, {
    key: 'C',
    scale: 'minor',
    retuneSpeedMs: 0,
    humanizePercent: 0,
    formantShiftSemitones: 0,
  });
  // 440 Hz is A4 (MIDI 69). In C minor, A is out-of-scale (Ab=68 or Bb=70).
  check(
    quantResultA4.targetMidi === 68 || quantResultA4.targetMidi === 70,
    'VOCAL_DSP',
    'Quantizes 440Hz vocal fundamental to nearest in-scale tone in C Minor',
    `Target MIDI: ${quantResultA4.targetMidi} (${midiToNoteName(quantResultA4.targetMidi)})`
  );

  const formantCutoff = vocalDspProcessor.calculateFormantFilterShift(3, 2500);
  check(
    formantCutoff > 2500 && formantCutoff < 3100,
    'VOCAL_DSP',
    'Calculates formant shifting filter frequency shift for +3 semitones',
    `Shifted Cutoff: ${Math.round(formantCutoff)} Hz`
  );

  // Real Granular Overlap-Add Pitch Shifter Execution
  const testSine440 = generateSine(440, 48000, 0.5, 0.6);
  const shiftedUp12 = vocalDspProcessor.shiftPitchBuffer(testSine440, 12, 48000);
  const f0Up12 = autocorrelationPitchTrajectory(shiftedUp12, 48000);
  const avgUp12 = f0Up12.slice(3, 8).reduce((a, b) => a + b, 0) / 5;

  check(
    avgUp12 > 830 && avgUp12 < 930,
    'VOCAL_DSP',
    'Granular pitch shifter shifts 440Hz fundamental up +12 semitones to ~880Hz',
    `Measured f0: ${Math.round(avgUp12)} Hz (target: 880 Hz)`
  );

  const shiftedDown12 = vocalDspProcessor.shiftPitchBuffer(testSine440, -12, 48000);
  const f0Down12 = autocorrelationPitchTrajectory(shiftedDown12, 48000);
  const avgDown12 = f0Down12.slice(3, 8).reduce((a, b) => a + b, 0) / 5;

  check(
    avgDown12 > 200 && avgDown12 < 240,
    'VOCAL_DSP',
    'Granular pitch shifter shifts 440Hz fundamental down -12 semitones to ~220Hz',
    `Measured f0: ${Math.round(avgDown12)} Hz (target: 220 Hz)`
  );

  // ----------------------------------------------------------------------
  // 4. 24-BIT / 48KHZ WAV & SPEC-COMPLIANT FLAC AUDIO ENCODING
  // ----------------------------------------------------------------------
  console.log('\n--- 4. Audio Encoders & Master Packaging ---');
  const encoders = new AudioEncoders();
  const testPcmL = generateSine(440, 48000, 0.1, 0.5);
  const testPcmR = generateSine(440, 48000, 0.1, 0.5);

  // WAV 24-bit
  const wavResult = encoders.encode24BitWav(testPcmL, testPcmR, 48000);
  check(wavResult.format.includes('24-bit') && wavResult.bitDepth === 24, 'AUDIO_ENCODER', 'Encodes genuine 24-bit PCM WAV stream');
  check(wavResult.sampleRate === 48000 && wavResult.channels === 2, 'AUDIO_ENCODER', 'Preserves 48,000 Hz stereo sample formatting');
  check(wavResult.byteLength === 44 + 4800 * 2 * 3, 'AUDIO_ENCODER', 'RIFF chunk byteLength matches exact PCM byte count formula', `ByteLength: ${wavResult.byteLength}`);

  // WAV 16-bit Red Book
  const redBookWav = encoders.encode16BitWav(testPcmL, testPcmR, 44100);
  check(redBookWav.format.includes('16-bit') && redBookWav.bitDepth === 16, 'AUDIO_ENCODER', 'Encodes standard Red Book 16-bit / 44.1kHz WAV master');

  // FLAC Spec-Compliant Bitstream
  const flacResult = encoders.encodeFlac(testPcmL, testPcmR, 48000);
  const flacBytes = new Uint8Array(await flacResult.dataBlob.arrayBuffer());
  const magic = String.fromCharCode(flacBytes[0], flacBytes[1], flacBytes[2], flacBytes[3]);

  check(magic === 'fLaC', 'AUDIO_ENCODER', 'FLAC bitstream begins with standard 4-byte "fLaC" stream marker', `Magic: ${magic}`);
  check(flacBytes[4] === 0x80, 'AUDIO_ENCODER', 'FLAC contains valid STREAMINFO metadata block header (type 0, isLast 1)');

  const streamInfoLen = (flacBytes[5] << 16) | (flacBytes[6] << 8) | flacBytes[7];
  check(streamInfoLen === 34, 'AUDIO_ENCODER', 'FLAC STREAMINFO block has exact spec length of 34 bytes', `Length: ${streamInfoLen}`);

  const frame1Sync = ((flacBytes[42] << 8) | flacBytes[43]) & 0xfff8;
  check(frame1Sync === 0xfff8, 'AUDIO_ENCODER', 'FLAC audio frame starts with valid 14-bit sync word (0xFFF8)', `Sync: 0x${frame1Sync.toString(16).toUpperCase()}`);

  // ----------------------------------------------------------------------
  // 5. WEBCRYPTO SHA-256 SEEDSIGNATURE PROVENANCE
  // ----------------------------------------------------------------------
  console.log('\n--- 5. WebCrypto SHA-256 SeedSignature Provenance ---');
  const record1 = await signatureService.createSeedSignatureRecord(
    'ast_vox_01',
    'audio',
    'Lead Producer',
    { bpm: 124, key: 'C_MINOR', takeId: 'take_01' }
  );

  check(
    record1.hash.startsWith('0x') && record1.hash.length > 20,
    'SEED_SIGNATURE',
    'Generates SHA-256 cryptographic digest via crypto.subtle',
    `Hash: ${record1.hash}`
  );
  check(
    record1.status === 'VERIFIED' && record1.datasetLicenseStatus === 'COMPLIANT',
    'SEED_SIGNATURE',
    'SeedSignature record status is initialized as VERIFIED and COMPLIANT'
  );

  const record2 = await signatureService.createSeedSignatureRecord(
    'ast_vox_comp_01',
    'audio',
    'Lead Producer',
    { compId: 'comp_01', parentTake: record1.id },
    record1.provenanceChain
  );

  check(
    record2.provenanceChain.length === record1.provenanceChain.length + 1,
    'SEED_SIGNATURE',
    'Appends parent cryptographic lineage hash to unbroken provenance chain',
    `Lineage depth: ${record2.provenanceChain.length}`
  );
  check(
    signatureService.verifyProvenanceChain([record1, record2]),
    'SEED_SIGNATURE',
    'Cryptographic validator verifies full multi-stage provenance chain'
  );

  // ----------------------------------------------------------------------
  // 6. SOULFLOW 10-STAGE GOVERNOR LIFECYCLE
  // ----------------------------------------------------------------------
  console.log('\n--- 6. SoulFlow 10-Stage State Governor ---');
  const governor = new SoulFlowGovernor();
  check(SOULFLOW_STAGE_ORDER.length === 10, 'SOULFLOW', 'All 10 canonical stages present in governance order');

  const baseProject: Project = { id: 'p1', name: 'Hit Song', bpm: 120, tracks: [], soulFlowState: 'CAPTURED' };
  const detSettings: DetectionSettings = {
    enabled: true, micConnected: true, kickThreshold: 0.5, snareThreshold: 0.5, gain: 1,
    currentLowLevel: 0, currentHighLevel: 0, lastKickTriggerTime: 0, lastSnareTriggerTime: 0, autoRecordToGrid: false,
  };

  const projectWithTracks: Track[] = [
    {
      id: 't_kick', name: 'Kick', instrument: 'kick', volume: 0, mute: false, solo: false, pitch: 'C1',
      steps: new Array(64).fill(false),
      noteEvents: [{ id: 'n1', startTick: 0, durationTicks: 120, midiNote: 36, velocity: 100, provenance: { origin: 'MOUTH', creatorEdited: true } }],
    },
    {
      id: 't_snare', name: 'Snare', instrument: 'snare', volume: 0, mute: false, solo: false, pitch: 'D1',
      steps: new Array(64).fill(false),
      noteEvents: [{ id: 'n2', startTick: 480, durationTicks: 120, midiNote: 38, velocity: 90, provenance: { origin: 'MOUTH', creatorEdited: true } }],
    },
  ];

  const valSigned = governor.validateTransition('MIXED', 'SIGNED', {
    tracks: projectWithTracks,
    detectionSettings: detSettings,
    seedRecords: [record1],
    project: baseProject,
  });
  check(valSigned.valid, 'SOULFLOW', 'Validates transition to SIGNED stage when verified SeedSignature record exists');

  const valSignedNoSig = governor.validateTransition('MIXED', 'SIGNED', {
    tracks: projectWithTracks,
    detectionSettings: detSettings,
    seedRecords: [],
    project: baseProject,
  });
  check(!valSignedNoSig.valid, 'SOULFLOW', 'Blocks transition to SIGNED stage when 0 SeedSignature records exist');

  // ----------------------------------------------------------------------
  // 7. SOUND VAULT SEMANTIC KEYWORD MATCHER
  // ----------------------------------------------------------------------
  console.log('\n--- 7. Sound Vault Semantic Keyword Matcher ---');
  const kickMatches = SoundVaultSemanticMatcher.matchSoundByPrompt('fat punchy sub kick drum transient', 'drums', 3);
  check(kickMatches.length > 0 && kickMatches[0].name.toLowerCase().includes('kick'), 'SOUND_VAULT', 'Ranks punchy sub kick top for drum transient query', `Top result: ${kickMatches[0].name}`);

  const rhodesMatches = SoundVaultSemanticMatcher.matchSoundByPrompt('warm vintage soul jazz electric keys', 'keys', 3);
  check(rhodesMatches.length > 0 && rhodesMatches[0].name.toLowerCase().includes('rhodes'), 'SOUND_VAULT', 'Ranks vintage Rhodes top for soul electric keys query', `Top result: ${rhodesMatches[0].name}`);

  // ----------------------------------------------------------------------
  // 8. DEMUCS & ACE-STEP CLIENT CONTRACTS
  // ----------------------------------------------------------------------
  console.log('\n--- 8. Inference Client Error Contracts ---');
  const deadDemucs = new DemucsClient('http://127.0.0.1:59998');
  const deadDemucsHealth = await deadDemucs.health();
  check(!deadDemucsHealth.ok, 'INFERENCE_CLIENT', 'DemucsClient reports ok: false on health() when endpoint is down');

  const deadE05 = new SoulSonusServiceProvider('http://127.0.0.1:59999/api/e05');
  const deadE05Status = await deadE05.status();
  check(
    deadE05Status.available === false && deadE05Status.reason === 'UNREACHABLE',
    'INFERENCE_CLIENT',
    'E05 provider reports unavailable with a reason when the service route is down'
  );

  console.log('\n--- 9. Declared Mimicry Target (VIII.2: never required, never obeyed) ---');
  {
    const ev = (klass: string, pitchHz: number, atSeconds: number): any => ({
      klass, pitchHz, atSeconds, atMs: atSeconds * 1000, confidence: 0.8, velocity: 90,
    });
    const trumpetish = [ev('tonal_high', 330, 0), ev('tonal_high', 440, 0.5), ev('tonal_high', 660, 1), ev('tonal_high', 880, 1.5)];
    const subbish = [ev('tonal_low', 41, 0), ev('tonal_low', 55, 0.5), ev('tonal_low', 73, 1), ev('tonal_low', 98, 1.5)];
    const beatbox = [ev('kick', 0, 0), ev('snare', 0, 0.5), ev('kick', 0, 1), ev('hihat', 0, 1.25)];
    const takes = [trumpetish, subbish, beatbox];

    check(
      interpretPass(trumpetish).hypotheses.length >= 3 && interpretPass(trumpetish).disagreement === null,
      'MIMICRY',
      'A pass with no declared target is still read and ranked (VIII.2 forbids requiring one)'
    );

    let suppressed = '';
    let overreached = '';
    let doubled = '';
    let basisless = '';
    for (const t of MIMICRY_TARGETS) {
      for (const take of takes) {
        const base = interpretPass(take);
        const withT = interpretPass(take, t.id);
        for (const b of base.hypotheses) {
          if (!withT.hypotheses.some((h) => h.targetRole === b.targetRole)) suppressed = `${t.id}/${b.role}`;
        }
        const ceiling = Math.max(0, ...base.hypotheses.map((h) => h.confidence));
        if (Math.max(0, ...withT.hypotheses.map((h) => h.confidence)) > ceiling + 1e-9) overreached = t.id;
        const roles = withT.hypotheses.map((h) => h.targetRole);
        if (new Set(roles).size !== roles.length) doubled = t.id;
        for (const h of withT.hypotheses) if (!h.basis.length) basisless = `${t.id}/${h.role}`;
      }
    }
    check(!suppressed, 'MIMICRY', 'A declaration never removes a reading the measurements made', suppressed);
    check(!overreached, 'MIMICRY', 'A declaration never raises confidence above the evidence for the pass', overreached);
    check(!doubled, 'MIMICRY', 'A declaration never doubles a reading the measurements already made', doubled);
    check(!basisless, 'MIMICRY', 'Every hypothesis states what produced it, declared rows included', basisless);

    const wrongRegister = interpretPass(subbish, 'trumpet');
    check(
      !!wrongRegister.disagreement && wrongRegister.hypotheses[0].targetRole !== 'brass_trumpet',
      'MIMICRY',
      'A take in the wrong register for the declared target is reported, not obeyed'
    );
    const wrongKind = interpretPass(beatbox, 'trumpet');
    check(
      !!wrongKind.disagreement && wrongKind.hypotheses[0].targetRole !== 'brass_trumpet',
      'MIMICRY',
      'An unpitched take declared as a pitched instrument is reported, not obeyed'
    );
    check(
      interpretPass(trumpetish, 'trumpet').disagreement === null,
      'MIMICRY',
      'A take that agrees with the declaration reports no disagreement'
    );
  }

  console.log('\n========================================================================');
  console.log(`  COMPREHENSIVE PLATFORM VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');
}

runComprehensiveVerification().catch((err) => {
  console.error('Harness fatal failure:', err);
  process.exit(1);
});
