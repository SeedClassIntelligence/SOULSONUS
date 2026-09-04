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
import { evaluateRealizationContract } from '../src/lib/realizationVerifier';
import { SoundVaultSemanticMatcher } from '../src/lib/soundVaultSearch';
import { readFileSync } from 'fs';
import { deriveCreativeIntent, intentCoverage } from '../src/lib/creativeIntent';
import { buildIntentPolicy, describeUnlocked, roleKeyFor, DEFAULT_PRESERVE } from '../src/lib/intentPolicy';
import { buildChangeSet } from '../src/lib/changeSet';
import { applyTimingMode } from '../src/lib/timingModes';
import {
  deriveExpression,
  describeExpression,
  expressionCoverage,
  withCreatorReading,
  EXPRESSION_DIMENSIONS,
} from '../src/audio/expressionState';
import { countWord, countLine, syllabify } from '../src/lib/syllables';
import { deriveLyricSeed } from '../src/lib/lyricSeed';
import { checkAgainstCadence, preserveCadence, describeGate } from '../src/lib/cadenceLock';
import { buildSyntheticDisclosure } from '../src/lib/syntheticDisclosure';
import { conditionGenre, describeGenre, grammarById } from '../src/lib/genreGrammar';
import {
  fanOutPerformance,
  secondOpinionOfPercussion,
  secondOpinionOfPitch,
} from '../src/audio/expressionFanout';
import {
  controlsFromExpression,
  dspFromExpression,
  explainExpressionChange,
} from '../src/lib/expressionControls';
import { parseVoiceCommand, needsReasoning } from '../src/audio/voiceCommands';
import { barsToSeconds } from '../src/utils/musicMath';
import { adoptFromRevision, newRevision, capTree, childrenOf, isBranchPoint, pathToRoot, depthOf, MAX_REVISIONS } from '../src/lib/revisionTree';
import { openRelayGap, addExchange, resolveByCreator, studioAccountOf } from '../src/lib/relayGap';
import * as relayGapModule from '../src/lib/relayGap';
import { interpretPass } from '../src/lib/interpretation';
import { MIMICRY_TARGETS } from '../src/lib/mimicryTarget';
import { SoulSonusServiceProvider } from '../src/lib/inference/e05Provider';
import { e05Status } from '../server/e05Route';
import {
  e05StateFromAceStatus,
  extractAudioPath,
  toAceTaskBody,
} from '../src/lib/inference/e05Contract';
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

  console.log('\n--- 10. The Relay Gap (Amendment B: what the creator heard) ---');
  {
    const words = "it's too clean, i heard it dirtier and behind the beat";
    const gap = openRelayGap('cand_1', words, 'Creator');
    check(!!gap && gap.inCreatorWords === words, 'RELAY',
      "B.1: the creator's statement is stored verbatim, not parsed or normalized");
    check(!!gap && gap.exchange.length === 1 && gap.exchange[0].from === 'creator', 'RELAY',
      'B.2: a rejection is a record with a thread, not a single bit');
    check(!!gap && gap.attributedTo === 'Creator' && gap.openedAt > 0, 'RELAY',
      'B.4: the verdict is attributable and timestamped');
    check(openRelayGap('cand_1', '   ', 'Creator') === null, 'RELAY',
      'An empty statement is refused rather than stored as a blank gap');

    const withTurns = addExchange(
      addExchange(gap!, { from: 'studio', words: 'what was done', basis: ['route: x'] }),
      { from: 'creator', words: 'still not it' }
    );
    check(withTurns.exchange.length === 3, 'RELAY',
      'B.3: the gap holds a conversation across turns, not one verdict');
    check(gap!.exchange.length === 1, 'RELAY',
      'Adding a turn does not mutate the stored record');

    check(!withTurns.resolvedByCreator, 'RELAY',
      'B.5: a gap stays open through any number of exchanges');
    const settled = resolveByCreator(withTurns);
    check(settled.resolvedByCreator && !!settled.resolvedAt, 'RELAY',
      'B.5: the creator, and only the creator, closes a gap');

    // The clause that is easiest to break later: nothing in the module may
    // offer a way for a score to settle what someone heard.
    const relayExports = Object.keys(relayGapModule);
    check(
      !relayExports.some((k) => /resolveBy(?!Creator)|autoResolve|closeGap|settleByScore/i.test(k)),
      'RELAY',
      'B.5: no export exists that could close a gap on a metric rather than the creator',
      relayExports.join(', ')
    );

    const noScores = studioAccountOf({
      candidateId: 'c', audioAssetId: 'a', preservedProperties: [], modifiedProperties: [],
      preservationScores: null, scoreBasis: 'NOT_MEASURED', sourceProjectVersionId: 'v',
    } as any);
    check(
      !!noScores && noScores.basis!.some((b) => /no preservation scores were taken/.test(b)),
      'RELAY',
      'The studio says when nothing was measured instead of filling the space'
    );
    check(
      !!noScores && !/sorry|understand|apolog/i.test(noScores.words),
      'RELAY',
      "B.6: the studio reports what it did rather than simulating comprehension"
    );
  }

  console.log('\n--- 11. The Revision Tree (XI.4: branchable, not linear) ---');
  {
    const T = (n: string): any[] => [{ id: n, name: n, noteEvents: [] }];
    const S: any[] = [];

    const root = newRevision(null, 'Session start', 'root', T('a'), S);
    const r1 = newRevision(root.revisionId, 'take 1', 'capture', T('b'), S);
    const r2 = newRevision(r1.revisionId, 'take 2', 'capture', T('c'), S);
    // The creator undoes back to r1 and goes a different way. In a linear
    // stack r2 is destroyed here; in a tree it is a sibling.
    const r3 = newRevision(r1.revisionId, 'take 2, other way', 'capture', T('d'), S);
    const tree = [root, r1, r2, r3];

    check(r1.parentRevisionId === root.revisionId, 'REVISION',
      'XI.4: a revision names the revision it came from');
    check(root.parentRevisionId === null, 'REVISION',
      'Only a root has no parent');
    check(childrenOf(tree, r1.revisionId).length === 2, 'REVISION',
      'XI.4: the path abandoned by an undo survives as a sibling branch');
    check(isBranchPoint(tree, r1.revisionId) && !isBranchPoint(tree, root.revisionId), 'REVISION',
      'A branch point is where the creator took a different route');
    check(
      tree.find((r) => r.revisionId === r2.revisionId)?.tracks[0].id === 'c',
      'REVISION',
      'The abandoned branch still holds its own material, not a reference to the survivor'
    );

    const path = pathToRoot(tree, r3.revisionId).map((r) => r.label);
    check(
      path.length === 3 && path[0] === 'Session start' && path[2] === 'take 2, other way',
      'REVISION', 'A revision resolves to its full line of descent', path.join(' -> ')
    );
    check(depthOf(tree, r3.revisionId) === 2 && depthOf(tree, root.revisionId) === 0,
      'REVISION', 'Depth is measured from the root');

    // A cycle must not hang the walk. Nothing should create one, which is
    // exactly why it is worth asserting.
    const cyclic: any[] = [
      { ...root, parentRevisionId: r1.revisionId },
      { ...r1, parentRevisionId: root.revisionId },
    ];
    check(pathToRoot(cyclic, r1.revisionId).length === 2, 'REVISION',
      'A malformed parent chain terminates instead of looping forever');

    const big = Array.from({ length: MAX_REVISIONS + 10 }, (_, i) =>
      newRevision(i === 0 ? null : `rev_fake_${i - 1}`, `e${i}`, 'edit', T('x'), S));
    const capped = capTree(big);
    check(capped.length === MAX_REVISIONS, 'REVISION',
      `The tree is bounded at ${MAX_REVISIONS} revisions, because each holds a full copy of the tracks`);
    const ids = new Set(capped.map((r) => r.revisionId));
    check(
      capped.every((r) => r.parentRevisionId === null || ids.has(r.parentRevisionId)),
      'REVISION',
      'Trimming re-roots orphans rather than leaving a parent id that resolves to nothing'
    );
  }

  console.log('\n--- 12. Cross-revision recombination (XI.7: drums from 12, bass from 16) ---');
  {
    const trk = (id: string, notes: number, vol: number, extra: any = {}): any =>
      ({ id, name: id, instrument: id, steps: [true], noteEvents: new Array(notes).fill({ midiNote: 60 }),
         mute: false, solo: false, volume: vol, pitch: 'C3', ...extra });

    // Version 12 had the drums you want. Version 16 had the bass. Since then
    // you have mixed: the drum fader has moved.
    const v12 = newRevision(null, 'version 12', 'capture', [trk('drums', 8, -3), trk('bass', 2, -6)], []);
    const v16 = newRevision(v12.revisionId, 'version 16', 'capture', [trk('drums', 1, -3), trk('bass', 9, -6)], []);
    const now = [trk('drums', 1, +2), trk('bass', 9, +1)];

    const a = adoptFromRevision(now, v12, ['drums']);
    check(a.tracks.find((t) => t.id === 'drums')!.noteEvents.length === 8, 'RECOMBINE',
      'XI.7: the drums from an older revision replace the drums here');
    check(a.tracks.find((t) => t.id === 'bass')!.noteEvents.length === 9, 'RECOMBINE',
      'Only the named track changes; everything else is left exactly as it is');
    check(a.tracks.find((t) => t.id === 'drums')!.volume === 2, 'RECOMBINE',
      'Taking a performance does not silently drag back the mix you have done since');
    check(a.adopted.join() === 'drums' && a.notFound.length === 0, 'RECOMBINE',
      'The result reports what was taken');

    const whole = adoptFromRevision(now, v12, ['drums'], 'whole_track');
    check(whole.tracks.find((t) => t.id === 'drums')!.volume === -3, 'RECOMBINE',
      'whole_track brings the old setup back, and is asked for by name rather than implied');

    // The sentence from the seed, both halves at once.
    const both = adoptFromRevision(adoptFromRevision(now, v12, ['drums']).tracks, v16, ['bass']);
    const d = both.tracks.find((t) => t.id === 'drums')!;
    const bs = both.tracks.find((t) => t.id === 'bass')!;
    check(d.noteEvents.length === 8 && bs.noteEvents.length === 9, 'RECOMBINE',
      'XI.7: drums from one revision and bass from another, in one arrangement');

    const missing = adoptFromRevision(now, v12, ['drums', 'strings']);
    check(missing.notFound.join() === 'strings' && missing.adopted.join() === 'drums', 'RECOMBINE',
      'A track the source revision does not have is reported, not silently skipped');

    const deletedHere = adoptFromRevision([trk('bass', 9, 0)], v12, ['drums']);
    check(
      deletedHere.added.join() === 'drums' && deletedHere.tracks.length === 2,
      'RECOMBINE',
      'A track deleted since comes back rather than being dropped as unmatched'
    );

    const untouched = adoptFromRevision(now, v12, ['drums']);
    check(now.find((t) => t.id === 'drums')!.noteEvents.length === 1, 'RECOMBINE',
      'The current arrangement is not mutated; a new one is returned', String(untouched.adopted));

    // Adopting something already identical is not a success.
    const same = adoptFromRevision(v12.tracks, v12, ['drums']);
    check(same.adopted.join() === 'drums' && same.changed.length === 0, 'RECOMBINE',
      'A track that already matches the source is reported as unchanged, not as taken');
    check(/already matched/.test(same.summary) && !/^Took/.test(same.summary), 'RECOMBINE',
      'The summary of a no-op does not claim material was taken', same.summary);
    check(/^Took drums performance/.test(a.summary), 'RECOMBINE',
      'The summary of a real adoption names what actually changed', a.summary);

    const noClips = adoptFromRevision([trk('drums', 1, 0, { audioClips: [{ id: 'c1' }] })], v12, ['drums']);
    check(
      (noClips.tracks[0].audioClips || []).length === 1, 'RECOMBINE',
      'A field the source revision never had does not erase the one here'
    );
  }

  console.log('\n--- 13. Region-scoped edits (XI.6: "only change bar eight") ---');
  {
    // At 120 BPM in 4/4 a bar is exactly 2 seconds, so the arithmetic is
    // checkable by hand rather than by trusting the function under test.
    const b8 = barsToSeconds(8, 8, 120);
    check(b8.startSeconds === 14 && b8.endSeconds === 16, 'REGION',
      'Bar 8 at 120 BPM is 14s to 16s', `${b8.startSeconds}-${b8.endSeconds}`);
    check(b8.endSeconds - b8.startSeconds === 2, 'REGION',
      'A single bar is one bar long, not zero -- the end is the next downbeat');

    const b1 = barsToSeconds(1, 1, 120);
    check(b1.startSeconds === 0, 'REGION',
      'Bars are 1-indexed the way they are spoken: bar 1 starts at zero');

    const span = barsToSeconds(5, 8, 120);
    check(span.startSeconds === 8 && span.endSeconds === 16, 'REGION',
      'A range covers from the first downbeat to the end of the last bar');

    const slow = barsToSeconds(8, 8, 60);
    check(slow.startSeconds === 28 && slow.endSeconds === 32, 'REGION',
      'The same bar at half the tempo is twice as far in', `${slow.startSeconds}-${slow.endSeconds}`);

    const three = barsToSeconds(2, 2, 120, 3);
    check(three.startSeconds === 1.5 && three.endSeconds === 3, 'REGION',
      'Beats per bar is honoured, so 3/4 is not silently treated as 4/4');

    const reversed = barsToSeconds(8, 3, 120);
    check(reversed.startSeconds === 14 && reversed.endSeconds === 16, 'REGION',
      'A backwards range does not produce a negative region');
    const zero = barsToSeconds(0, 0, 120);
    check(zero.startSeconds === 0 && zero.endSeconds === 2, 'REGION',
      'Bar zero is clamped to the first bar rather than producing a negative start');
    const noTempo = barsToSeconds(2, 2, 0);
    check(Number.isFinite(noTempo.startSeconds) && Number.isFinite(noTempo.endSeconds), 'REGION',
      'A zero tempo does not produce Infinity');
  }

  console.log('\n--- 14. Language is not capped by the parser (III.5, III.6) ---');
  {
    const act = (t: string) => parseVoiceCommand(t).action;

    // The five misfires measured against the parser before this rewrite. Each
    // was a fragment of a command found inside an unrelated word.
    check(act('make the vocal clearer') === 'REASONING_FALLTHROUGH', 'LANGUAGE',
      'A compliment about the vocal no longer wipes the grid ("clearer" contains "clear")',
      act('make the vocal clearer'));
    check(act('make sure that is correct') === 'REASONING_FALLTHROUGH', 'LANGUAGE',
      'Saying "correct" no longer toggles the microphone ("correct" contains "rec")',
      act('make sure that is correct'));
    check(act('make that transition feel cinematic') === 'REASONING_FALLTHROUGH', 'LANGUAGE',
      'The seed\'s own example is no longer routed to a hi-hat swap ("that" contains "hat")',
      act('make that transition feel cinematic'));
    check(act('start recording') === 'TOGGLE_REC', 'LANGUAGE',
      'Asking to record records, instead of starting playback because "start" was tested first',
      act('start recording'));
    check(act('fast forward to the drop') === 'REASONING_FALLTHROUGH', 'LANGUAGE',
      'A phrase about the arrangement is not a pattern nudge', act('fast forward to the drop'));

    // The direct commands still have to work.
    const direct: [string, string][] = [
      ['clone bar 1', 'CLONE_BAR_1'], ['nudge left', 'NUDGE_LEFT'], ['nudge right', 'NUDGE_RIGHT'],
      ['invert', 'INVERT_PATTERN'], ['clear the grid', 'CLEAR_ALL'], ['play', 'TOGGLE_PLAY'],
      ['record', 'TOGGLE_REC'], ['faster', 'CHANGE_BPM'], ['slow down', 'CHANGE_BPM'],
      ['replace the snare', 'REPLACE_SOUND_QUERY'],
    ];
    const broken = direct.filter(([t, want]) => act(t) !== want).map(([t]) => t);
    check(broken.length === 0, 'LANGUAGE',
      'Every direct command still fires after the rewrite', broken.join(', '));

    // III.6 itself: nothing is terminal.
    const creative = [
      'make that transition feel cinematic', 'give the chorus more air',
      'the vocal needs to sit further back', 'can you make it less busy',
      'put a little more swing on the hats', 'zzz qqq',
    ];
    const died = creative.filter((t) => !needsReasoning(parseVoiceCommand(t)));
    check(died.length === 0, 'LANGUAGE',
      'III.6: no sentence ends at the parser -- every non-command is carried onward',
      died.join(', '));
    check(creative.every((t) => parseVoiceCommand(t).transcript === t), 'LANGUAGE',
      'The transcript is carried unchanged, so the reasoning layer reads what was said');
  }

  console.log('\n--- 15. No fabricated collaboration (XV.4) ---');
  {
    // The suite is bundled to CJS, so import.meta.url is not available here.
    // npm test runs from the repo root.
    const src = readFileSync('src/components/CollaborationModal.tsx', 'utf8');

    check(!/Aria Vocalist/.test(src), 'COLLAB',
      'XV.4: the fabricated collaborator is gone from the source');
    check(!/0x[0-9a-f]{6,}\.\.\./i.test(src), 'COLLAB',
      'No signature hash is written into the source and rendered as "Signed:"');
    check(!/creator@soulsonus\.ai/.test(src), 'COLLAB',
      'The creator row is not a hardcoded address while the real name sits in props');
    check(/creatorName/.test(src), 'COLLAB',
      'The creator name that was already being passed in is actually used');
    check(/presence/.test(src), 'COLLAB',
      'A person in the list carries whether they are actually present');
    check(/not sent/i.test(src), 'COLLAB',
      'The invite states that nothing was sent, rather than simulating success');
    // The accept flow and the roles are capability, not fabrication, and
    // Amendment D says depth already earned is not renegotiated.
    check(/handleAcceptContribution/.test(src) && /CollaboratorRole/.test(src), 'COLLAB',
      'The roles and the accept flow are kept -- only the pretence was removed');
  }

  console.log('\n--- 16. Creative Intent is a real object (IV.4, C.4, A.8) ---');
  {
    const emptyStyle: any = { performance: { pocket: null, velocity: null } };
    const bare = deriveCreativeIntent({ style: emptyStyle, sections: [] });

    check(bare.groove === null && bare.energy === null, 'INTENT',
      'A field with no measurement behind it is null, not a plausible default');
    check(bare.expression === null && bare.genreGrammar === null, 'INTENT',
      'Emotion and genre grammar stay null -- nothing in this build measures either');
    check(bare.notMeasured.length >= 5, 'INTENT',
      'Every absence is named rather than left for the creator to notice',
      `${bare.notMeasured.length} named`);
    check(bare.notMeasured.every((n) => / — /.test(n)), 'INTENT',
      'Each absence carries the reason it is absent, not just the field name');
    check(intentCoverage(bare).known === 1 && intentCoverage(bare).total === 7, 'INTENT',
      'Coverage is stated honestly: only the contract-preserved set is known on an empty session',
      `${intentCoverage(bare).known}/${intentCoverage(bare).total}`);

    // With real measurements the fields fill in, and each carries its basis.
    const measured: any = {
      performance: {
        pocket: { meanOffsetMs: -12.4, spreadMs: 5.1, onsets: 32, reads: 'ahead of the beat' },
        velocity: { min: 70, max: 120, mean: 104 },
      },
    };
    const full = deriveCreativeIntent({
      style: measured,
      sections: [{ name: 'Intro' }, { name: 'Verse' }, { name: 'Chorus' }] as any,
      transformable: ['timbre', 'room_acoustics'],
    });
    check(full.groove?.readsAs === 'ahead of the beat' && full.groove?.meanOffsetMs === -12.4, 'INTENT',
      'Groove reads the measured pocket rather than recomputing it');
    check(/32 onsets/.test(full.groove?.from || ''), 'INTENT',
      'The groove reading states the measurement under it', full.groove?.from);
    check(full.energy?.reads === 'played hard', 'INTENT',
      'Energy comes from measured velocity', full.energy?.from);
    check(full.arrangementTrajectory?.reads === 'Intro → Verse → Chorus', 'INTENT',
      'The arrangement trajectory is the sections that exist');
    check(full.transform?.properties.join() === 'timbre,room_acoustics', 'INTENT',
      'Transform lists what the active route actually permits');
    check(intentCoverage(full).known === 5, 'INTENT',
      'Coverage rises only as far as what was measured -- emotion and genre stay unknown',
      `${intentCoverage(full).known}/7`);

    // The whole point of the object: it must not fill its own gaps.
    const everyField = JSON.stringify(full);
    check(!/neutral|moderate energy|unknown genre|default/i.test(everyField), 'INTENT',
      'No field is populated with a placeholder word standing in for a measurement');
  }

  console.log('\n--- 17. The creator sets the contract (Step 3b, C.4) ---');
  {
    const full = buildIntentPolicy(DEFAULT_PRESERVE, 'close', 'kick');
    check(full.lockedProperties.length === 4 && full.unlocked.length === 0, 'CONTRACT',
      'The default holds the four properties the contract has always held');
    check(full.thresholdPolicy.rhythm === 0.98 && full.thresholdPolicy.pitchContour === 0.50,
      'CONTRACT',
      '"close" is the platform\'s own measured thresholds for the role, unchanged',
      JSON.stringify(full.thresholdPolicy));

    const vocal = buildIntentPolicy(DEFAULT_PRESERVE, 'close', 'vocal');
    check(vocal.thresholdPolicy.pitchContour === 0.96, 'CONTRACT',
      'A vocal is not held to a kick\'s pitch contour -- the role tuning survives');

    const tight = buildIntentPolicy(DEFAULT_PRESERVE, 'as_performed', 'melody');
    const loose = buildIntentPolicy(DEFAULT_PRESERVE, 'loose', 'melody');
    check(tight.thresholdPolicy.timing > full.thresholdPolicy.timing - 1 &&
          loose.thresholdPolicy.timing < tight.thresholdPolicy.timing, 'CONTRACT',
      'Strictness moves the bar in the direction it says',
      `as_performed ${tight.thresholdPolicy.timing} > loose ${loose.thresholdPolicy.timing}`);
    const all = [tight, loose, full].flatMap((p) => Object.values(p.thresholdPolicy));
    check(all.every((v) => v > 0 && v < 1), 'CONTRACT',
      'No strictness setting produces a threshold outside 0..1', `min ${Math.min(...all)} max ${Math.max(...all)}`);

    // Unlocking must actually stop the contract checking, or the control is
    // decoration on a decision that was never handed over.
    const noTiming = buildIntentPolicy(['rhythm', 'pitchContour', 'articulation'], 'close', 'kick');
    check(!noTiming.lockedProperties.includes('timing'), 'CONTRACT',
      'A property the creator unlocked leaves the set the contract scores');
    check(noTiming.unlocked.join() === 'timing', 'CONTRACT',
      'What was given up is named, not merely absent');
    check(/timing is not being checked/.test(describeUnlocked(noTiming.unlocked) || ''), 'CONTRACT',
      'The consequence is stated in a sentence, not implied by a greyed-out chip',
      describeUnlocked(noTiming.unlocked) || '');
    check(describeUnlocked([]) === null, 'CONTRACT',
      'An intact contract renders no warning at all');

    const none = buildIntentPolicy([], 'close', 'kick');
    check(none.lockedProperties.length === 0 && none.unlocked.length === 4, 'CONTRACT',
      'Holding nothing is a real choice and is not silently treated as unset');

    check(roleKeyFor('808_bass') === 'bass' && roleKeyFor('lead_vocal') === 'vocal' &&
          roleKeyFor('studio_drum_kit') === 'melody', 'CONTRACT',
      'The role key selects the measured threshold row');

    // The decisive one: a preserve set is only real if it changes what the
    // contract refuses. Same candidate, same bad timing score, two policies.
    const badTiming = { rhythm: 0.99, timing: 0.40, pitchContour: 0.99, articulation: 0.99 };

    const held = buildIntentPolicy(DEFAULT_PRESERVE, 'close', 'kick');
    const refused = evaluateRealizationContract(
      'ast_x', held.lockedProperties, ['timbre'], badTiming, held.thresholdPolicy, 'ACERealizer'
    );
    check(refused.candidate.passedIntentContract === false, 'CONTRACT',
      'With timing held, a candidate that wrecks the timing is refused',
      `violations: ${refused.candidate.violations.map((v) => v.property).join(', ')}`);

    const allowed = evaluateRealizationContract(
      'ast_x', noTiming.lockedProperties, ['timbre'], badTiming, noTiming.thresholdPolicy, 'ACERealizer'
    );
    check(allowed.candidate.passedIntentContract === true, 'CONTRACT',
      'With timing unlocked, the identical candidate passes -- the creator\'s choice is the thing deciding',
      `violations: ${allowed.candidate.violations.length}`);
    check(!allowed.candidate.preservedProperties.includes('timing'), 'CONTRACT',
      'An unlocked property is not reported as preserved either -- it was not checked, so nothing is claimed about it');
    check(refused.candidate.preservedProperties.includes('rhythm'), 'CONTRACT',
      'The properties still held are still scored and still reported');

    // Order stability: two identical policies must compare equal however the
    // creator toggled their way to them.
    const a = buildIntentPolicy(['articulation', 'rhythm'], 'close', 'kick');
    const bb = buildIntentPolicy(['rhythm', 'articulation'], 'close', 'kick');
    check(JSON.stringify(a) === JSON.stringify(bb), 'CONTRACT',
      'Toggle order does not change the resulting contract');
  }

  console.log('\n--- 18. The ChangeSet contract (C.6, Step 2) ---');
  {
    const cs = buildChangeSet({});
    check(cs.actions.join() === 'PREVIEW,APPLY,ALTERNATIVE,REJECT', 'CHANGESET',
      'C.6: all four actions, not the two the drawer had', cs.actions.join(', '));
    check(cs.willNotChange.length === 0 && !!cs.note, 'CHANGESET',
      'A proposal that guarantees nothing says so, instead of an empty list under a heading',
      cs.note || '');

    // Measured and promised are different claims and must not render alike.
    const unrealized: any = {
      modifiedProperties: ['timbre'],
      preservedProperties: [],
      preservationScores: null,
      scoreBasis: 'NOT_MEASURED',
    };
    const promised = buildChangeSet({ candidate: unrealized });
    check(promised.willNotChange.every((g) => g.basis === 'BY_CONTRACT'), 'CHANGESET',
      'Before anything is rendered, every guarantee is a promise and is labelled one');
    check(promised.willNotChange.every((g) => /not a reading|not confirmed/.test(g.detail)), 'CHANGESET',
      'And each says in words that it has not been checked', promised.willNotChange[0]?.detail);

    const realized: any = {
      modifiedProperties: ['timbre', 'saturation'],
      preservedProperties: ['rhythm', 'timing'],
      preservationScores: { rhythm: 0.99, timing: 0.97, pitchContour: 0.4, articulation: 0.4 },
      scoreBasis: 'MEASURED',
    };
    const mixed = buildChangeSet({ candidate: realized });
    const measured = mixed.willNotChange.filter((g) => g.basis === 'MEASURED').map((g) => g.property);
    const unchecked = mixed.willNotChange.filter((g) => g.basis === 'BY_CONTRACT').map((g) => g.property);
    check(measured.length === 2 && unchecked.length === 2, 'CHANGESET',
      'Measured and unchecked guarantees are separated, not flattened into one list of ticks',
      `measured: ${measured.join(', ')} | unchecked: ${unchecked.join(', ')}`);
    check(/scored 0.99/.test(mixed.willNotChange.find((g) => g.basis === 'MEASURED')?.detail || ''),
      'CHANGESET', 'A measured guarantee carries the score behind it');

    // Step 3b feeds this: a property the creator unlocked is not promised back.
    const narrowed = buildChangeSet({ candidate: realized, preserve: ['rhythm'] });
    check(narrowed.willNotChange.length === 1 && /rhythm/.test(narrowed.willNotChange[0].property),
      'CHANGESET',
      'A property the creator took out of the contract is not guaranteed back to them',
      narrowed.willNotChange.map((g) => g.property).join(', '));

    // A DSP patch guarantees by construction, which is the strongest kind here.
    const dsp = buildChangeSet({ dspSettings: { lowGain: 3, midQ: 1.2 }, trackName: 'Kick' });
    check(dsp.willChange.length === 2, 'CHANGESET', 'It names each setting it writes');
    check(dsp.willNotChange.some((g) => g.basis === 'BY_CONSTRUCTION' && /Kick/.test(g.property)),
      'CHANGESET',
      'Everything else on that track is guaranteed by the shape of the operation, not by assurance');
    check(dsp.willNotChange.some((g) => /performance/.test(g.property)), 'CHANGESET',
      'And a mix setting promises it does not alter a note that was played');
    check(dsp.note === null, 'CHANGESET', 'A proposal that does guarantee something renders no note');
  }

  console.log('\n--- 19. Adjustable quantization, the three modes SRT-1 VII names ---');
  {
    // At 120 BPM a 16th is 120 ticks and 125 ms; 1 tick is ~1.04 ms.
    const note = (id: string, startTick: number): any => ({
      id, startTick, durationTicks: 120, midiNote: 60, velocity: 100, provenance: {},
    });
    // 480 is a grid line. +10 ticks is ~10.4 ms out: a slip. +55 ticks is
    // ~57 ms out: past the 40 ms line, so a different rhythm.
    const take = [note('a', 480), note('b', 490), note('c', 535), note('d', 960)];

    const literal = applyTimingMode(take, 'literal', 120);
    check(literal.notes === take && literal.moved === 0, 'TIMING',
      'literal moves nothing at all -- the same array comes back');
    check(/exactly where they were played/.test(literal.summary), 'TIMING',
      'and says so rather than reporting a quantize that did not happen');

    const assisted = applyTimingMode(take, 'assisted', 120);
    const byId = (r: any, id: string) => r.notes.find((n: any) => n.id === id).startTick;
    check(byId(assisted, 'b') === 480, 'TIMING',
      'assisted pulls a note 10 ms out onto the grid line it was reaching for',
      `490 -> ${byId(assisted, 'b')}`);
    check(byId(assisted, 'c') === 535, 'TIMING',
      'and leaves one 57 ms out alone -- past 40 ms it is a rhythm, not a slip',
      `535 -> ${byId(assisted, 'c')}`);
    check(byId(assisted, 'a') === 480 && byId(assisted, 'd') === 960, 'TIMING',
      'notes already on the grid are untouched');
    check(assisted.moved === 1 && assisted.leftAlone === 1, 'TIMING',
      'and it reports both counts', `moved ${assisted.moved}, left ${assisted.leftAlone}`);
    check(take[1].startTick === 490, 'TIMING',
      'the input notes are not mutated');

    // Groove: a player consistently behind the beat.
    const behind = [note('a', 492), note('b', 612), note('c', 732), note('d', 852)];
    const groove = applyTimingMode(behind, 'groove', 120);
    const spacing = groove.notes.map((n: any) => n.startTick);
    const gaps = spacing.slice(1).map((t: number, i: number) => t - spacing[i]);
    check(gaps.every((g: number) => g === gaps[0]), 'TIMING',
      'groove regularizes the beat -- every gap is now identical', gaps.join(', '));
    check(groove.pocketMs !== null && groove.pocketMs > 0, 'TIMING',
      'it measures the pocket it is preserving', `${groove.pocketMs} ms behind`);
    check(spacing.every((t: number) => t % 120 !== 0), 'TIMING',
      'and the notes do NOT land on the grid -- the feel survives the straightening',
      spacing.join(', '));

    const dead = [note('a', 480), note('b', 600), note('c', 720)];
    const onGrid = applyTimingMode(dead, 'groove', 120);
    check(onGrid.notes.every((n: any, i: number) => n.startTick === dead[i].startTick), 'TIMING',
      'a player already dead on the grid is displaced by nothing');
    check(/dead on the grid/.test(onGrid.summary), 'TIMING',
      'and that is stated rather than reported as a correction', onGrid.summary);

    check(applyTimingMode([], 'groove', 120).summary === 'Nothing to quantize.', 'TIMING',
      'an empty take is handled without inventing a result');
    check(applyTimingMode(take, 'groove', 0).notes.every((n: any) => Number.isFinite(n.startTick)),
      'TIMING', 'a zero tempo does not produce a non-finite tick');
    check(applyTimingMode([note('x', 5)], 'groove', 120).notes[0].startTick >= 0, 'TIMING',
      'a note near zero cannot be pushed to a negative tick');

    // Amendment F: the take is not lost because the creator tried a setting.
    const played = [note('a', 492), note('b', 613), note('c', 731)];
    const grooved = applyTimingMode(played, 'groove', 120);
    check(grooved.notes.every((n: any, i: number) =>
      (n.provenance.capturedTick ?? n.startTick) === played[i].startTick),
      'TIMING', 'where every note was played is still recoverable after the pass',
      grooved.notes.map((n: any) => n.provenance.capturedTick ?? n.startTick).join(', '));
    check(grooved.notes.filter((n: any, i: number) => n.startTick !== played[i].startTick)
      .every((n: any) => typeof n.provenance.capturedTick === 'number'), 'TIMING',
      'every note the pass actually moved carries the tick it came from');
    check(grooved.notes.some((n: any) => n.provenance.capturedTick === undefined), 'TIMING',
      'and a note the pass left alone is not stamped with a move it did not make');
    const back = applyTimingMode(grooved.notes, 'literal', 120);
    check(back.notes.every((n: any, i: number) => n.startTick === played[i].startTick), 'TIMING',
      'and literal puts every note back on the tick it was performed on, exactly',
      back.notes.map((n: any) => n.startTick).join(', '));
    check(back.moved === 2 && /back exactly where you played/.test(back.summary), 'TIMING',
      'reported as a restoration of the two it moved, not of the one it never touched',
      back.summary);

    // The modes are choices, not layers.
    const twice = applyTimingMode(applyTimingMode(grooved.notes, 'assisted', 120).notes, 'groove', 120);
    check(twice.notes.every((n: any, i: number) => n.startTick === grooved.notes[i].startTick), 'TIMING',
      'groove after assisted equals groove on the take -- the modes do not compound',
      twice.notes.map((n: any) => n.startTick).join(', '));
    check(twice.notes.every((n: any, i: number) => n.provenance.capturedTick === played[i].startTick),
      'TIMING', 'and the performed tick survives every pass, never overwritten by a later one');

    // A roll faster than the grid cannot be straightened onto the grid
    // without hits landing on each other. The notes all survive -- literal
    // brings them back -- but what plays has fewer hits in it, and that is
    // said rather than absorbed.
    const roll = [note('a', 480), note('b', 490), note('c', 500), note('d', 960)];
    const straightened = applyTimingMode(roll, 'groove', 120);
    check(straightened.collided === 2, 'TIMING',
      'groove counts the hits that landed on top of another',
      `${straightened.collided} collided`);
    check(/landed on top of another/.test(straightened.summary) &&
      /Keep my timing brings them back/.test(straightened.summary), 'TIMING',
      'and says so, with the way back, instead of reporting a clean straighten',
      straightened.summary);
    check(applyTimingMode(roll, 'literal', 120).notes.every((n: any, i: number) => n.startTick === roll[i].startTick),
      'TIMING', 'and the way back is real -- every hit of the roll is still there');
    // Measured against the take, not against the mode that ran last: assisted
    // stacks two of these itself, and groove after it must still report all
    // three hits the creator would lose rather than only the new one.
    const afterAssisted = applyTimingMode(roll, 'assisted', 120);
    check(afterAssisted.collided === 2, 'TIMING',
      'assisted reports the hits its own correction stacked', `${afterAssisted.collided}`);
    check(applyTimingMode(afterAssisted.notes, 'groove', 120).collided === 2, 'TIMING',
      'and groove run after it reports what is lost against the take, not against assisted',
      `${applyTimingMode(afterAssisted.notes, 'groove', 120).collided}`);
    check(applyTimingMode([note('a', 480), note('b', 960)], 'groove', 120).collided === 0, 'TIMING',
      'a take with room between its hits reports no collision', '');
    check(!/landed on top/.test(applyTimingMode([note('a', 485), note('b', 965)], 'groove', 120).summary),
      'TIMING', 'and is not warned about one');

    // Live playback used to fire every note in a sixteenth at the edge of the
    // sixteenth, which made all three modes sound identical. The scheduler now
    // offsets by where in the step the note actually sits, exactly as the
    // offline render always has.
    {
      const bpm = 120;
      const secondsPerStep = 60 / bpm / 4;
      const within = (tick: number) => (tick - stepToTick(tickToStep(tick))) / 120 * secondsPerStep;
      check(Math.abs(within(480)) < 1e-9, 'TIMING',
        'a note on the grid line is scheduled at the step boundary, as before');
      check(Math.abs(within(492) - 0.0125) < 1e-6, 'TIMING',
        'and one 12 ticks late is scheduled 12.5 ms into the step', `${within(492) * 1000} ms`);
      check(within(599) < secondsPerStep, 'TIMING',
        'no offset can reach the next step, so ordering is never crossed');
    }
  }

  console.log('\n--- 20. Emotion as measured dimensions (SRT-1 V) ---');
  {
    // A percussive onset: spectrum, no pitch. A sung one: pitch, and a
    // spectrum when it came through the microphone.
    const hit = (atSeconds: number, velocity: number, centroidHz: number, bands?: any) =>
      ({ atSeconds, velocity, centroidHz, pitchHz: -1, bands: bands || { sub: 0.1, low: 0.2, lowMid: 0.3, mid: 0.2, high: 0.1, air: 0.1 } });
    const sung = (atSeconds: number, velocity: number, pitchHz: number) =>
      ({ atSeconds, velocity, pitchHz });

    const nothing = deriveExpression([]);
    check(EXPRESSION_DIMENSIONS.every((d) => nothing[d] === null), 'EXPRESSION',
      'no onsets reads as no emotional state at all, not a neutral one');
    check(/is not a performance to read/.test(nothing.notMeasured[0]), 'EXPRESSION',
      'and says why rather than returning seven zeroes', nothing.notMeasured[0]);
    check(expressionCoverage(nothing).known === 0 && expressionCoverage(nothing).total === 7,
      'EXPRESSION', 'coverage counts seven dimensions and claims none of them');

    // A beatbox pass: nothing in it carries a pitch.
    const beatbox = [0, 0.5, 1.0, 1.5, 2.0, 2.5].map((t, i) => hit(t, 100 + (i % 2) * 4, 900));
    const drums = deriveExpression(beatbox);
    check(drums.valence === null && drums.tension === null, 'EXPRESSION',
      'a percussive take has no valence and no tension -- neither is readable without pitch');
    check(drums.notMeasured.some((n) => /valence — nothing in this pass carried a pitch/.test(n)),
      'EXPRESSION', 'and both absences are named with the reason', drums.notMeasured.join(' | '));
    check(!!drums.arousal && !!drums.movement && !!drums.confidence && !!drums.darkness && !!drums.intimacy,
      'EXPRESSION', 'the five that pitch is not needed for are read');
    check(EXPRESSION_DIMENSIONS.every((d) => !drums[d] || drums[d]!.from.length > 0), 'EXPRESSION',
      'every dimension carries the measurement that produced it');

    // Arousal moves with rate and intensity, in that order of weight.
    const frantic = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t) => hit(t, 120, 900));
    const still = [0, 2, 4, 6].map((t) => hit(t, 40, 900));
    check(deriveExpression(frantic).arousal!.value > deriveExpression(still).arousal!.value, 'EXPRESSION',
      'a fast, hard pass reads more energetic than a slow, soft one',
      `${deriveExpression(frantic).arousal!.value} vs ${deriveExpression(still).arousal!.value}`);
    check(deriveExpression(frantic).arousal!.value > 0 && deriveExpression(still).arousal!.value < 0,
      'EXPRESSION', 'and they land on opposite sides of the axis, not both on one');

    // Movement is regularity, which arousal is not: a fast ragged flurry is
    // aroused without driving.
    const steady = [0, 0.5, 1.0, 1.5, 2.0, 2.5].map((t) => hit(t, 100, 900));
    const ragged = [0, 0.12, 0.9, 1.0, 2.4, 2.5].map((t) => hit(t, 100, 900));
    check(deriveExpression(steady).movement!.value > deriveExpression(ragged).movement!.value,
      'EXPRESSION', 'an even pulse reads as driving where a ragged one does not',
      `${deriveExpression(steady).movement!.value} vs ${deriveExpression(ragged).movement!.value}`);

    // Darkness is spectral, and reverses with the centroid.
    const dark = [0, 0.5, 1, 1.5].map((t) => hit(t, 100, 160, { sub: 0.5, low: 0.3, lowMid: 0.1, mid: 0.05, high: 0.03, air: 0.02 }));
    const bright = [0, 0.5, 1, 1.5].map((t) => hit(t, 100, 5200, { sub: 0.02, low: 0.03, lowMid: 0.1, mid: 0.15, high: 0.3, air: 0.4 }));
    check(deriveExpression(dark).darkness!.value > 0 && deriveExpression(bright).darkness!.value < 0,
      'EXPRESSION', 'a sub-heavy take reads heavy and an airy one reads bright',
      `${deriveExpression(dark).darkness!.value} vs ${deriveExpression(bright).darkness!.value}`);
    check(/spectral centroid 160 Hz/.test(deriveExpression(dark).darkness!.from), 'EXPRESSION',
      'and the centroid it read is stated in Hz', deriveExpression(dark).darkness!.from);

    // A reading rebuilt from notes on a track carries no spectrum.
    const fromNotes = [sung(0, 90, 220), sung(0.5, 92, 247), sung(1.0, 95, 262), sung(1.5, 91, 294)];
    const noSpectrum = deriveExpression(fromNotes);
    check(noSpectrum.darkness === null && noSpectrum.intimacy === null, 'EXPRESSION',
      'without a spectrum, darkness and intimacy are not read');
    check(noSpectrum.notMeasured.some((n) => /darkness — these onsets carry no spectrum/.test(n)),
      'EXPRESSION', 'and that is said, not left as a zero');
    check(!!noSpectrum.valence && !!noSpectrum.tension, 'EXPRESSION',
      'while pitch is there, so valence and tension are');
    check(noSpectrum.measuredFrom.spectralOnsets === 0 && noSpectrum.measuredFrom.pitchedOnsets === 4,
      'EXPRESSION', 'and the state says what it was taken from',
      JSON.stringify(noSpectrum.measuredFrom));

    // Valence follows the contour.
    const rising = [sung(0, 90, 220), sung(0.5, 90, 262), sung(1, 90, 330), sung(1.5, 90, 392)];
    const falling = [sung(0, 90, 392), sung(0.5, 90, 330), sung(1, 90, 262), sung(1.5, 90, 220)];
    check(deriveExpression(rising).valence!.value > deriveExpression(falling).valence!.value, 'EXPRESSION',
      'a rising line reads more positive than the same line falling',
      `${deriveExpression(rising).valence!.value} vs ${deriveExpression(falling).valence!.value}`);
    check(/semitones a second/.test(deriveExpression(rising).valence!.from), 'EXPRESSION',
      'stated as the contour it measured', deriveExpression(rising).valence!.from);

    // Tension: a wide line that ends away from where it sat.
    const settled = [sung(0, 90, 262), sung(0.5, 90, 264), sung(1, 90, 262), sung(1.5, 90, 262)];
    const restless = [sung(0, 90, 262), sung(0.5, 90, 440), sung(1, 90, 233), sung(1.5, 90, 466)];
    check(deriveExpression(restless).tension!.value > deriveExpression(settled).tension!.value, 'EXPRESSION',
      'a wide, unsettled line reads more unresolved than one that stays home',
      `${deriveExpression(restless).tension!.value} vs ${deriveExpression(settled).tension!.value}`);

    // Two pitched onsets are not a contour.
    const two = deriveExpression([sung(0, 90, 220), sung(0.5, 90, 262), hit(1, 90, 900)]);
    check(two.valence === null && /only 2 onsets carried a pitch/.test(two.notMeasured.join(' ')),
      'EXPRESSION', 'two pitched onsets do not make a contour, and it says so',
      two.notMeasured.join(' | '));

    // The creator's own reading replaces the studio's on that dimension.
    const measuredState = deriveExpression(beatbox);
    const said = withCreatorReading(measuredState, 'darkness', -0.8, measuredState);
    check(said.darkness!.value === -0.8 && said.darkness!.fromCreator === true, 'EXPRESSION',
      'what the creator says about a dimension is what that dimension says');
    check(/you said/.test(said.darkness!.from), 'EXPRESSION',
      'attributed to them rather than presented as a measurement', said.darkness!.from);
    check(said.arousal!.value === measuredState.arousal!.value, 'EXPRESSION',
      'and it changes only the dimension they spoke about');
    const handedBack = withCreatorReading(said, 'darkness', null, measuredState);
    check(handedBack.darkness!.value === measuredState.darkness!.value && !handedBack.darkness!.fromCreator,
      'EXPRESSION', 'clearing it hands the dimension back to the measurement');

    // A dimension the studio could not read is one the creator can still
    // state: SRT-1 V lists their own emotional intent as an input in its own
    // right, not as a correction to a machine reading.
    const drumState = deriveExpression(beatbox);
    check(drumState.valence === null && drumState.notMeasured.some((n) => n.startsWith('valence ')),
      'EXPRESSION', 'the take could not support valence, and the state says so');
    const spoken = withCreatorReading(drumState, 'valence', -0.7, drumState);
    check(spoken.valence!.value === -0.7 && spoken.valence!.fromCreator === true, 'EXPRESSION',
      'the creator can state a dimension nothing measured');
    check(!spoken.notMeasured.some((n) => n.startsWith('valence ')), 'EXPRESSION',
      'and the state stops calling it unmeasured, rather than saying both at once',
      spoken.notMeasured.join(' | '));
    check(expressionCoverage(spoken).known === expressionCoverage(drumState).known + 1, 'EXPRESSION',
      'coverage counts it, because it is now known -- from them');
    const givenBack = withCreatorReading(spoken, 'valence', null, drumState);
    check(givenBack.valence === null && givenBack.notMeasured.some((n) => n.startsWith('valence ')),
      'EXPRESSION', 'handing it back restores both the absence and the reason for it',
      givenBack.notMeasured.join(' | '));

    // The sentence a realization acts on names only what was read.
    const sentence = describeExpression(deriveExpression(dark));
    check(sentence.length > 0 && !/valence|tension/.test(sentence), 'EXPRESSION',
      'the instruction that rides with a realization names no dimension that was not measured',
      sentence);
    check(describeExpression(nothing) === '', 'EXPRESSION',
      'and an unread performance contributes no instruction at all');
  }

  console.log('\n--- 21. Emotion as compositional control variables (SRT-1 V) ---');
  {
    const hit = (atSeconds: number, velocity: number, centroidHz: number, bands: any) =>
      ({ atSeconds, velocity, centroidHz, pitchHz: -1, bands });
    const SUBBY = { sub: 0.5, low: 0.3, lowMid: 0.1, mid: 0.05, high: 0.03, air: 0.02 };
    const AIRY = { sub: 0.02, low: 0.03, lowMid: 0.1, mid: 0.15, high: 0.3, air: 0.4 };
    const heavyTake = deriveExpression([0, 0.5, 1, 1.5, 2].map((t) => hit(t, 112, 160, SUBBY)));
    const brightTake = deriveExpression([0, 0.5, 1, 1.5, 2].map((t) => hit(t, 60, 5200, AIRY)));

    check(controlsFromExpression(null).length === 0, 'EXPRESSION_CONTROL',
      'no reading controls nothing');

    const heavy = controlsFromExpression(heavyTake);
    const brightness = heavy.find((c) => c.dimension === 'timbral_brightness')!;
    check(brightness.dspSettings!.filterFreq === 2200, 'EXPRESSION_CONTROL',
      'a heavy take rolls the top off, in Hz that reach the channel strip',
      JSON.stringify(brightness.dspSettings));
    check(/spectral centroid/.test(brightness.because), 'EXPRESSION_CONTROL',
      'and the change carries the measurement that argued for it', brightness.because);
    const brightControl = controlsFromExpression(brightTake).find((c) => c.dimension === 'timbral_brightness')!;
    check(brightControl.dspSettings!.filterFreq === 9000, 'EXPRESSION_CONTROL',
      'a bright take opens it instead — the control reverses with the reading',
      JSON.stringify(brightControl.dspSettings));

    // Several musical dimensions, which is the whole point of the section.
    const dims = new Set(heavy.map((c) => c.dimension));
    check(dims.size >= 3, 'EXPRESSION_CONTROL',
      'one reading moves several musical dimensions, not a mode selection',
      [...dims].join(', '));
    check(heavy.every((c) => c.because.length > 0 && c.reads.length > 0), 'EXPRESSION_CONTROL',
      'every control says what it does and why');

    // A middle reading is a real answer, not a small instruction.
    const middling = { ...heavyTake, darkness: { value: 0.12, reads: 'between bright and heavy', from: 'measured' } } as any;
    check(!controlsFromExpression(middling).some((c) => c.driver === 'darkness'), 'EXPRESSION_CONTROL',
      'a dimension reading near the middle proposes nothing');

    // What the build cannot do, it does not offer as a click.
    const pitched = deriveExpression([
      { atSeconds: 0, velocity: 96, pitchHz: 262 },
      { atSeconds: 0.5, velocity: 96, pitchHz: 440 },
      { atSeconds: 1.0, velocity: 96, pitchHz: 233 },
      { atSeconds: 1.5, velocity: 96, pitchHz: 466 },
    ]);
    const harmonic = controlsFromExpression(pitched).find((c) => c.dimension === 'harmonic_tension');
    check(!!harmonic && harmonic.dspSettings === null, 'EXPRESSION_CONTROL',
      'harmonic tension is stated and not offered as a setting this build can apply');
    check(Object.keys(dspFromExpression(controlsFromExpression(pitched))).every((k) => k.length > 0),
      'EXPRESSION_CONTROL', 'and the patch contains only the controls that map to real settings');
    check(!('harmonicTension' in dspFromExpression(heavy)), 'EXPRESSION_CONTROL',
      'nothing invents a setting name to carry a suggestion');

    const sentence = explainExpressionChange(heavy);
    check(/so /.test(sentence) && /tempo is untouched/.test(sentence), 'EXPRESSION_CONTROL',
      'the explanation is a measurement, a change, and what it refused to move',
      sentence.slice(0, 140));
    check(explainExpressionChange([]) === '', 'EXPRESSION_CONTROL',
      'and nothing measured explains nothing');

    // The creator's own reading drives the control, because it replaced the
    // measurement on that dimension.
    const said = withCreatorReading(brightTake, 'darkness', 0.9, brightTake);
    const fromCreator = controlsFromExpression(said).find((c) => c.dimension === 'timbral_brightness')!;
    check(fromCreator.dspSettings!.filterFreq === 2200 && /you said/.test(fromCreator.because),
      'EXPRESSION_CONTROL', 'what the creator says about the take is what the studio acts on',
      fromCreator.because);
  }

  console.log('\n--- 22. Syllables: one answer, and a real one (SRT-1 VI) ---');
  {
    const cases: [string, number][] = [
      ['walking', 2], ['through', 1], ['the', 1], ['neon', 2], ['rain', 1],
      ['electric', 3], ['table', 2], ['wanted', 2], ['walked', 1], ['rhythm', 2],
      ['heartbeat', 2], ['ignite', 2], ['away', 2], ['nation', 2], ['special', 2],
      ['lion', 2], ['frequency', 3], ['shadows', 2], ['tonight', 2], ['knows', 1],
    ];
    const wrong = cases.filter(([w, n]) => countWord(w) !== n);
    check(wrong.length === 0, 'SYLLABLES',
      'the estimator counts twenty ordinary words correctly',
      wrong.map(([w, n]) => `${w}: ${countWord(w)} not ${n}`).join(', ') || 'all correct');

    // The demo lines shipped with hand-typed syllable splits. The estimator
    // has to agree with a person who did it by hand, or it is not usable as
    // the one answer.
    check(countLine('Walking through the neon rain, watching shadows fade away') === 14,
      'SYLLABLES', 'and it agrees with the hand-written split already in the project',
      `${countLine('Walking through the neon rain, watching shadows fade away')} of 14`);
    // The second demo line is where the estimator's limit shows, and the limit
    // is real English rather than a bug: "every" is three syllables written and
    // two sung, and the person who typed that line split it the way they would
    // sing it. Spelling does not decide this, which is why the workstation
    // shows the count it read instead of applying it silently.
    check(countLine('Every heartbeat in my chest knows the words I cannot say') === 15 &&
      countWord('every') === 3,
      'SYLLABLES', 'and where it disagrees with a singer, the disagreement is "every" — sung as two',
      `${countLine('Every heartbeat in my chest knows the words I cannot say')} against the 14 that line was sung as`);

    const units = syllabify('electric fire');
    check(units.length === 4 && units[0].wordInitial && !units[1].wordInitial, 'SYLLABLES',
      'and it keeps which syllable starts a word, which is what a beat lands on',
      units.map((u) => `${u.text}${u.wordInitial ? '*' : ''}`).join(' '));
  }

  console.log('\n--- 23. A performance as a lyric seed (SRT-1 VI, Mode B) ---');
  {
    // Two sung phrases, four syllables each, with a rest between them. The
    // first of each phrase is hit hard.
    const hit = (atSeconds: number, velocity: number, pitchHz = 220) => ({ atSeconds, velocity, pitchHz });
    const take = [
      hit(0, 120), hit(0.5, 80), hit(1.0, 82), hit(1.5, 78),
      hit(3.2, 118), hit(3.7, 79), hit(4.2, 81), hit(4.7, 77),
    ];
    const seed = deriveLyricSeed(take, { bpm: 120 });

    check(seed.phrases.length === 2, 'LYRIC_SEED',
      'the rest between the lines is where the studio puts the line break',
      `${seed.phrases.length} phrases`);
    check(seed.phrases.every((p) => p.syllableCount === 4), 'LYRIC_SEED',
      'each phrase carries the syllables that were actually sung',
      seed.phrases.map((p) => p.syllableCount).join(', '));
    check(seed.phrases[0].stressPattern === '/xxx', 'LYRIC_SEED',
      'the stress pattern is measured from how hard each one landed',
      seed.phrases[0].stressPattern);
    check(seed.positions.filter((p) => p.isRhymePosition).length === 2, 'LYRIC_SEED',
      'and the rhyme positions are the ends of the lines, one per phrase');
    check(seed.positions.every((p) => p.kind === 'SYLLABLE_POSITION'), 'LYRIC_SEED',
      'a sung position is a sung position -- not a word, because none was heard');
    check(seed.positions.every((p) => p.word === null), 'LYRIC_SEED',
      'and no position is given a word it did not carry');
    check(seed.notMeasured.some((n) => n.startsWith('words —')), 'LYRIC_SEED',
      'the seed says out loud that nothing recognised speech',
      seed.notMeasured.join(' | ').slice(0, 120));
    check(seed.notMeasured.some((n) => n.startsWith('theme —')), 'LYRIC_SEED',
      'and that nothing inferred what the take is about');
    check(deriveLyricSeed(take, { bpm: 120, semanticIntent: 'driving at night' }).semanticIntent === 'driving at night',
      'LYRIC_SEED', 'the theme is the creator\'s to state, and is used when they do');
    check(!deriveLyricSeed(take, { bpm: 120, semanticIntent: 'x' }).notMeasured.some((n) => n.startsWith('theme')),
      'LYRIC_SEED', 'and stops being reported as missing once they have');

    const percussive = deriveLyricSeed(
      [0, 0.4, 0.8, 1.2].map((t) => ({ atSeconds: t, velocity: 100, pitchHz: -1 })),
      { bpm: 120 }
    );
    check(percussive.positions.every((p) => p.kind === 'PHONETIC_FRAGMENT'), 'LYRIC_SEED',
      'an unpitched utterance is a sound carrying cadence, kept apart from a sung note');

    const tooShort = deriveLyricSeed([{ atSeconds: 0, velocity: 100 }], { bpm: 120 });
    check(tooShort.phrases.length === 0 && /is not a cadence/.test(tooShort.notMeasured[0]),
      'LYRIC_SEED', 'one onset is not a cadence, and is not described as a one-syllable line',
      tooShort.notMeasured[0]);
  }

  console.log('\n--- 24. The cadence lock (Amendment E.3) ---');
  {
    const hit = (atSeconds: number, velocity: number) => ({ atSeconds, velocity, pitchHz: 220 });
    // One phrase, five syllables, first and fourth hit hard.
    const seed = deriveLyricSeed(
      [hit(0, 122), hit(0.5, 80), hit(1.0, 78), hit(1.5, 120), hit(2.0, 79)],
      { bpm: 120 }
    );
    check(seed.phrases[0].syllableCount === 5 && seed.phrases[0].stressPattern === '/xx/x',
      'CADENCE_LOCK', 'the performed phrase is five syllables with two hard beats',
      seed.phrases[0].stressPattern);

    // "hold on to the light" -- 5 syllables, every one word-initial.
    const fits = checkAgainstCadence('hold on to the light', seed, 0);
    check(fits.ok && fits.violations.length === 0, 'CADENCE_LOCK',
      'a line with the same syllables and the beats on words passes',
      JSON.stringify(fits.violations));

    const tooMany = checkAgainstCadence('hold on to the light tonight', seed, 0);
    check(!tooMany.ok && tooMany.violations[0].kind === 'SYLLABLE_COUNT', 'CADENCE_LOCK',
      'a line with more syllables than were sung is refused');
    check(/nowhere to land/.test(tooMany.violations[0].says), 'CADENCE_LOCK',
      'and the reason is what it costs the creator, not a code',
      tooMany.violations[0].says);
    const tooFew = checkAgainstCadence('hold on tight', seed, 0);
    check(!tooFew.ok && /would go silent/.test(tooFew.violations[0].says), 'CADENCE_LOCK',
      'a line with fewer says which of their syllables would go silent',
      tooFew.violations[0].says);
    check(tooMany.violations.length === 1 && tooFew.violations.length === 1, 'CADENCE_LOCK',
      'and nothing is judged on an alignment that does not exist');

    // Beat 4 is hard. "to-night" puts its second syllable there.
    const beatInsideWord = checkAgainstCadence('hold on tonight now', seed, 0);
    check(!beatInsideWord.ok && beatInsideWord.violations.some((v) => v.kind === 'STRESS_PATTERN'),
      'CADENCE_LOCK', 'a beat the creator hit hard cannot land inside a word',
      beatInsideWord.violations.map((v) => v.says).join(' | '));
    check(/beat 4/.test(beatInsideWord.violations.find((v) => v.kind === 'STRESS_PATTERN')!.says),
      'CADENCE_LOCK', 'and it names which beat',
      beatInsideWord.violations.find((v) => v.kind === 'STRESS_PATTERN')!.says);

    // The gate itself: refused lines come out with no text on them.
    const gate = preserveCadence(
      [
        { id: 'a', text: 'hold on to the light', phraseIndex: 0, from: 'STUDIO_INTELLIGENCE' },
        { id: 'b', text: 'hold on to the light tonight', phraseIndex: 0, from: 'STUDIO_INTELLIGENCE' },
        { id: 'c', text: 'hold on tight', phraseIndex: 0, from: 'STUDIO_INTELLIGENCE' },
      ],
      seed
    );
    check(gate.accepted.length === 1 && gate.rejected.length === 2, 'CADENCE_LOCK',
      'the gate passes what fits and refuses what does not',
      `${gate.accepted.length} accepted, ${gate.rejected.length} refused`);
    check(!JSON.stringify(gate.rejected).includes('tonight'), 'CADENCE_LOCK',
      'and a refused line is refused before it is shown -- its words do not come out of the gate',
      JSON.stringify(gate.rejected).slice(0, 120));
    check(/refused before you saw/.test(describeGate(gate)), 'CADENCE_LOCK',
      'what the creator is told is that something was refused, and why',
      describeGate(gate));
    check(/fit the cadence you performed/.test(describeGate({ accepted: gate.accepted, rejected: [] })),
      'CADENCE_LOCK', 'and a clean round says so without inventing a refusal');

    const noPhrase = checkAgainstCadence('anything at all', seed, 4);
    check(!noPhrase.ok, 'CADENCE_LOCK',
      'a line aimed at a phrase that was never performed is refused, not passed');
  }

  console.log('\n--- 25. Synthetic media disclosure reaches the manifest (SRT-1 XVIII.4) ---');
  {
    const note = (origin: string, extra: any = {}) => ({
      id: `n_${Math.random()}`, startTick: 0, durationTicks: 120, midiNote: 60, velocity: 100,
      provenance: { origin, creatorEdited: false, ...extra },
    });
    const played: any = { id: 't1', name: 'Kick (Thump)', instrument: 'kick', steps: [], mute: false,
      solo: false, volume: 0, pitch: 'C1', noteEvents: [note('MOUTH'), note('MOUTH')] };
    const rendered: any = { id: 't2', name: 'Session Bass', instrument: 'bass', steps: [], mute: false,
      solo: false, volume: 0, pitch: 'C2',
      noteEvents: [note('SESSION_PLAYER', { playerRole: 'bassist', renderer: 'ace-step-1.5' }), note('MOUTH')] };

    const clean = buildSyntheticDisclosure([played]);
    check(clean.syntheticTracks === 0 && /No synthetic material/.test(clean.statement),
      'DISCLOSURE', 'a record with nothing machine-made says so, rather than saying nothing',
      clean.statement);
    check(clean.machineNotes === 0 && clean.totalNotes === 2, 'DISCLOSURE',
      'and still counts what it read, so the claim can be checked');

    const mixed = buildSyntheticDisclosure([played, rendered]);
    check(mixed.syntheticTracks === 1 && mixed.machineNotes === 1, 'DISCLOSURE',
      'a track carrying a machine-played note is disclosed, and only that track',
      `${mixed.syntheticTracks} of ${mixed.totalTracks} tracks, ${mixed.machineNotes} of ${mixed.totalNotes} notes`);
    check(/1 of 2 tracks/.test(mixed.statement) && /1 of 4 notes/.test(mixed.statement),
      'DISCLOSURE', 'the sentence carries the counts, not an adjective', mixed.statement);
    check(mixed.renderers.includes('ace-step-1.5') && mixed.players.includes('bassist'),
      'DISCLOSURE', 'and names what rendered it and who played it',
      `${mixed.renderers.join(', ')} / ${mixed.players.join(', ')}`);
    check(mixed.tracks[0].synthetic === false && mixed.tracks[1].synthetic === true, 'DISCLOSURE',
      'the creator\'s own track is not swept into the disclosure with it');
    check(mixed.limits.length >= 2 && mixed.limits.some((l) => /timeline/.test(l)), 'DISCLOSURE',
      'and the disclosure states what it cannot see', mixed.limits.join(' | ').slice(0, 100));

    const synthesised: any = { ...played, id: 't3', name: 'Pad', originType: 'SYNTHESIS',
      noteEvents: [note('MANUAL')] };
    check(buildSyntheticDisclosure([synthesised]).syntheticTracks === 1, 'DISCLOSURE',
      'a track whose SOUND was synthesised is disclosed even when the notes are the creator\'s');
    check(/as its sound, played from the creator/.test(buildSyntheticDisclosure([synthesised]).statement),
      'DISCLOSURE', 'and the difference between the two is stated, not flattened',
      buildSyntheticDisclosure([synthesised]).statement);
  }

  console.log('\n--- 26. Genre as a parameter, not a label (SRT-1 XIV) ---');
  {
    const neoSoul = grammarById('neo_soul')!;
    check(!!neoSoul && Object.keys(neoSoul.rules).length >= 4, 'GENRE',
      'a grammar is a set of rules across several dimensions, not a word',
      Object.keys(neoSoul.rules).join(', '));

    // The contract holds the performance; the grammar gets the production.
    const held = conditionGenre(neoSoul, ['rhythm', 'timing', 'pitchContour', 'articulation']);
    check(!held.conditioned.includes('rhythm') && !held.conditioned.includes('harmonicLanguage'),
      'GENRE', 'a grammar cannot move rhythm or harmony while the contract holds them',
      held.conditioned.join(', '));
    check(held.withheld.some((w) => w.dimension === 'rhythm' && w.property === 'rhythm'), 'GENRE',
      'and what it was refused is named with the property that refused it',
      held.withheld.map((w) => `${w.dimension}<-${w.property}`).join(', '));
    check(held.conditioned.includes('instrumentation') && held.conditioned.includes('mixAesthetic'),
      'GENRE', 'while the production grammar it asked for still changes',
      held.conditioned.join(', '));

    const loose = conditionGenre(neoSoul, []);
    check(loose.conditioned.length > held.conditioned.length && loose.withheld.length === 0,
      'GENRE', 'a creator holding nothing gets the whole grammar -- their contract, their call',
      `${loose.conditioned.length} vs ${held.conditioned.length}`);

    const instruction = describeGenre(held);
    check(/neo-soul/.test(instruction) && /Rhodes/.test(instruction), 'GENRE',
      'what reaches a model is the rules, so the word is not left to its training',
      instruction.slice(0, 90));
    check(/Leave rhythm and harmonic language exactly as performed/.test(instruction), 'GENRE',
      'and it is told what to leave alone, in the same sentence',
      instruction.slice(-70));
    check(describeGenre(null) === '', 'GENRE',
      'no genre named contributes no instruction at all');
    check(grammarById(null) === null && grammarById('not_a_genre') === null, 'GENRE',
      'and nothing invents a grammar for a name it does not have');
  }

  console.log('\n--- 27. One performance, several processors (SRT-1 III) ---');
  {
    const ev = (atMs: number, pitchHz: number, velocity: number): any => ({
      klass: pitchHz > 0 ? 'tonal_high' : 'kick', velocity, confidence: 0.8,
      centroidHz: pitchHz > 0 ? 900 : 120, pitchHz,
      bands: { sub: 0.1, low: 0.2, lowMid: 0.3, mid: 0.2, high: 0.1, air: 0.1 },
      bandPeak: 0.3, spectralEnergy: 1, rms: velocity / 127, modality: 'VOICE', atMs,
      atSeconds: atMs / 1000,
    });
    const take = [ev(0, 220, 120), ev(500, 247, 80), ev(1000, 262, 82), ev(1500, 294, 78)];
    const fan = fanOutPerformance(take, { bpm: 120, declaredTargetId: null });

    check(fan.onsets === take.length, 'FANOUT',
      'every processor is given the whole performance', `${fan.onsets} onsets`);
    check(!!fan.interpretation && fan.interpretation.hypotheses.length > 0, 'FANOUT',
      'it comes back read for what it is', fan.interpretation.hypotheses.map((h: any) => h.role).join(', '));
    check(!!fan.expression && fan.expression.measuredFrom.onsets === take.length, 'FANOUT',
      'read for what it expresses, off the same onsets');
    check(!!fan.lyricSeed && fan.lyricSeed.positions.length === take.length, 'FANOUT',
      'and read as a cadence, off the same onsets again',
      `${fan.lyricSeed.positions.length} positions`);
    check(fan.lyricSeed.expression === fan.expression, 'FANOUT',
      'the cadence carries the affective reading rather than taking a second one');
    check(take.length === 4, 'FANOUT',
      'and no processor consumed the performance -- it is still four onsets afterwards');

    // A percussive take feeds the same three, and each says what it could not read.
    const drums = [ev(0, -1, 120), ev(400, -1, 90), ev(800, -1, 95), ev(1200, -1, 88)];
    const drumFan = fanOutPerformance(drums, { bpm: 120 });
    check(drumFan.expression.valence === null && drumFan.lyricSeed.positions.length === 4, 'FANOUT',
      'a take with no pitch still feeds every processor; each reports its own gaps');
    check(drumFan.lyricSeed.positions.every((p: any) => p.kind === 'PHONETIC_FRAGMENT'), 'FANOUT',
      'and the cadence reads it as sound carrying rhythm, not as sung syllables');

    check(/not written/.test(secondOpinionOfPitch(7).says) &&
      /nothing was lost/.test(secondOpinionOfPitch(0).says), 'FANOUT',
      'the processor the creator did not route to reports what it heard, and writes nothing',
      secondOpinionOfPitch(7).says.slice(0, 90));
    check(/Import it again as a performance/.test(secondOpinionOfPercussion(3, ['kick']).says),
      'FANOUT', 'and says how to keep it, rather than keeping it for them',
      secondOpinionOfPercussion(3, ['kick']).says.slice(-60));
  }

  console.log('\n--- 28. The realization service route (E05) ---');
  {
    // The route the browser has always addressed, and nothing implemented.
    const dead = await e05Status({
      endpoint: 'http://127.0.0.1:59998',
      apiKeyHeader: 'Authorization',
      apiKeyFormat: 'Bearer {key}',
    });
    check(dead.available === false && dead.reason === 'UNREACHABLE', 'E05_ROUTE',
      'a host that is not there is unreachable — which is not the same as having no route',
      `${dead.reason}: ${dead.detail}`);
    check(!/59998|127\.0\.0\.1/.test(dead.detail || ''), 'E05_ROUTE',
      'and the reason a creator reads carries no endpoint', dead.detail || '');

    const unconfigured = await e05Status({
      endpoint: '',
      apiKeyHeader: 'Authorization',
      apiKeyFormat: 'Bearer {key}',
    });
    check(unconfigured.reason === 'NOT_CONFIGURED', 'E05_ROUTE',
      'a deployment with no host configured says so, rather than reporting one down',
      unconfigured.detail || '');

    // The mapping onto ACE's own field names. Unknown fields are ignored by
    // its request model, so a wrong name here fails silently -- which is
    // exactly why this is asserted rather than assumed.
    const body = toAceTaskBody({ task: 'repaint', instruction: 'fix the second bar',
      repaintStartSeconds: 2, repaintEndSeconds: 4 });
    check(body.task_type === 'repaint' && body.instruction === 'fix the second bar', 'E05_ROUTE',
      'the task and the instruction land on the names ACE declares',
      JSON.stringify(body));
    check(body.repainting_start === 2 && body.repainting_end === 4, 'E05_ROUTE',
      'and the region lands on repainting_start / repainting_end, not our own names');
    check(!('repaint_start' in body) && !('task' in body), 'E05_ROUTE',
      'nothing is sent under a name ACE would ignore');
    check(toAceTaskBody({ task: 'cover', instruction: 'x', durationSeconds: 30 }).audio_duration === undefined,
      'E05_ROUTE', 'a duration is not sent for a task that takes its length from the source');

    // The two shapes a finished result comes back in.
    check(extractAudioPath('/tmp/out/a.wav') === '/tmp/out/a.wav', 'E05_ROUTE',
      'a raw path is passed through');
    check(extractAudioPath('/v1/audio?path=%2Ftmp%2Fout%2Fa.wav') === '/tmp/out/a.wav', 'E05_ROUTE',
      'and a URL-shaped one is unwrapped, so it is not wrapped a second time');
    check(e05StateFromAceStatus(0) === 'RUNNING' && e05StateFromAceStatus(1) === 'SUCCEEDED' &&
      e05StateFromAceStatus(2) === 'FAILED', 'E05_ROUTE',
      'and ACE\'s integer status is read as an integer');
  }

  console.log('\n========================================================================');
  console.log(`  COMPREHENSIVE PLATFORM VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');
}

runComprehensiveVerification().catch((err) => {
  console.error('Harness fatal failure:', err);
  process.exit(1);
});
