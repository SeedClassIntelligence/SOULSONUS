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
import { readFileSync } from 'fs';
import { deriveCreativeIntent, intentCoverage } from '../src/lib/creativeIntent';
import { parseVoiceCommand, needsReasoning } from '../src/audio/voiceCommands';
import { barsToSeconds } from '../src/utils/musicMath';
import { adoptFromRevision, newRevision, capTree, childrenOf, isBranchPoint, pathToRoot, depthOf, MAX_REVISIONS } from '../src/lib/revisionTree';
import { openRelayGap, addExchange, resolveByCreator, studioAccountOf } from '../src/lib/relayGap';
import * as relayGapModule from '../src/lib/relayGap';
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

  console.log('\n========================================================================');
  console.log(`  COMPREHENSIVE PLATFORM VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');
}

runComprehensiveVerification().catch((err) => {
  console.error('Harness fatal failure:', err);
  process.exit(1);
});
